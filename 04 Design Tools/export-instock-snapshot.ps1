[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$GgbCsv,
    [Parameter(Mandatory)] [string]$MagazineCsv,
    [switch]$Commit,
    [switch]$Finalize,
    [string]$Manifest,
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$LogDir = (Join-Path $PSScriptRoot 'logs'),
    [string]$CachePath,
    [switch]$RefreshHashes
)

$ErrorActionPreference = 'Stop'
if ($Commit -and $Finalize) { throw 'Choose either -Commit or -Finalize, not both.' }
. (Join-Path $PSScriptRoot 'image-library.ps1')
$sourceConfigs = @(
    [pscustomobject]@{ Tab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; Csv = $GgbCsv },
    [pscustomobject]@{ Tab = 'MAGAZINE'; RootName = 'All - MAGAZINE'; Csv = $MagazineCsv }
)

function Assert-SnapshotMatchesManifest {
    param([string]$SnapshotRoot, [object[]]$ManifestRows, [string]$ProjectRoot)
    $actualFiles = @(Get-ChildItem -LiteralPath $SnapshotRoot -File -Recurse)
    if ($actualFiles.Count -ne $ManifestRows.Count) {
        throw "Final snapshot file count mismatch: expected $($ManifestRows.Count), found $($actualFiles.Count)"
    }
    $manifestByAfter = @{}
    foreach ($row in $ManifestRows) { $manifestByAfter[$row.After] = $row }
    $i = 0
    foreach ($file in $actualFiles) {
        $i++
        $inside = $file.FullName.Substring($SnapshotRoot.TrimEnd('\').Length + 1)
        $manifestKey = Join-Path 'All Products\Instock' $inside
        if (-not $manifestByAfter.ContainsKey($manifestKey)) { throw "Unexpected final snapshot file: $inside" }
        $manifestRow = $manifestByAfter[$manifestKey]
        if ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne $manifestRow.SHA256) {
            throw "Final target hash mismatch: $inside"
        }
        $sourcePath = Join-Path $ProjectRoot $manifestRow.Before
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw "Final source disappeared: $($manifestRow.Before)" }
        if ((Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash -ne $manifestRow.SHA256) {
            throw "Final source changed: $($manifestRow.Before)"
        }
        if ($i % 100 -eq 0 -or $i -eq $actualFiles.Count) { Write-Host ("Final hash check {0}/{1}" -f $i, $actualFiles.Count) }
    }
}

if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$plan = New-Object System.Collections.Generic.List[object]
$selected = New-Object System.Collections.Generic.List[object]

foreach ($config in $sourceConfigs) {
    if (-not (Test-Path -LiteralPath $config.Csv -PathType Leaf)) {
        throw "CSV not found for $($config.Tab): $($config.Csv)"
    }

    $rows = @(Import-Csv -LiteralPath $config.Csv)
    if ($rows.Count -eq 0) { throw "CSV has no data rows for $($config.Tab): $($config.Csv)" }
    $headers = @($rows[0].PSObject.Properties.Name)
    foreach ($required in @('Item name', 'Product ID', 'Status', 'Type')) {
        if ($headers -notcontains $required) { throw "Missing '$required' column in $($config.Csv)" }
    }

    foreach ($row in $rows) {
        if ([string]$row.Status -cne 'Instock') { continue }
        $itemName = ([string]$row.'Item name').Trim()
        $productId = ([string]$row.'Product ID').Trim()
        if (-not $itemName -or -not $productId) {
            $plan.Add([pscustomobject]@{
                Action = ''; Status = 'INVALID-SHEET-ROW'; SourceTab = $config.Tab
                ProductID = $productId; ItemName = $itemName; Type = ([string]$row.Type).Trim()
                Before = ''; After = ''; Page = ''; Note = 'Instock row requires Item name and Product ID'
            })
            continue
        }
        $selected.Add([pscustomobject]@{
            SourceTab = $config.Tab; RootName = $config.RootName; ProductID = $productId
            ItemName = $itemName; Type = ([string]$row.Type).Trim()
        })
    }

}

$inventory = Get-ImageInventory -ProjectRoot $ProjectRoot -CachePath $CachePath -RefreshHashes:$RefreshHashes
$resolved = Resolve-ImageProducts -Rows ([object[]]$selected) -Inventory $inventory
foreach ($row in $resolved.Rows) {
    if ($row.Status -eq 'MAPPED') {
        $sourceRelative = Join-Path $row.RootName $row.Relative
        $workingRelative = Join-Path 'Instock' $sourceRelative
        $plan.Add([pscustomobject]@{
            Action = 'WOULD_COPY'; Status = 'MAPPED'; SourceTab = $row.SourceTab
            ProductID = $row.ProductID; ItemName = $row.ItemName; Type = $row.Type
            Before = Join-Path 'All Products' $sourceRelative
            After = Join-Path 'All Products' $workingRelative
            Page = $row.Page; Note = $row.Note
        })
    } else {
        $plan.Add([pscustomobject]@{
            Action = ''; Status = $row.Status; SourceTab = $row.SourceTab
            ProductID = $row.ProductID; ItemName = $row.ItemName; Type = $row.Type
            Before = ''; After = ''; Page = ''; Note = $row.Note
        })
    }
}

foreach ($issue in (Test-ImageManifest -Rows @($resolved.Rows) -Mode Instock)) {
    $plan.Add([pscustomobject]@{
        Action = ''; Status = $issue.Status; SourceTab = ''; ProductID = $issue.ProductID
        ItemName = ''; Type = ''; Before = ''; After = ''; Page = $issue.Page; Note = $issue.Note
    })
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $LogDir "instock_snapshot_dryrun_${timestamp}.csv"
$plan | Sort-Object SourceTab, ItemName, Page | Export-Csv -LiteralPath $logPath -NoTypeInformation -Encoding UTF8
$mapped = @($plan | Where-Object Status -eq 'MAPPED')
$issues = @($plan | Where-Object Status -ne 'MAPPED')
$planHash = Get-ImageTextSha256 ($mapped | Sort-Object After | ForEach-Object {
    "$($_.ProductID)`t$($_.Before)`t$($_.After)"
})

Write-Host '=== Instock snapshot dry run ==='
Write-Host ("Sheet rows selected : {0}" -f $selected.Count)
Write-Host ("Files mapped        : {0}" -f $mapped.Count)
Write-Host ("Library files       : {0} (cache reused {1}, hashed {2})" -f $inventory.FileCount, $inventory.CacheReused, $inventory.Hashed)
$issues | Group-Object Status | Sort-Object Name | ForEach-Object {
    Write-Host ("{0,-20}: {1}" -f $_.Name, $_.Count)
}
Write-Host "Log: $logPath"

if ($issues.Count -gt 0) { throw "Refusing data operation: dry run has $($issues.Count) issue(s)." }
if (-not $Commit -and -not $Finalize) {
    Write-Host 'DRY RUN ONLY - no image files were copied, moved, renamed, deleted, or uploaded.'
    exit 0
}

$duplicateTargets = @($mapped | Group-Object After | Where-Object Count -gt 1)
if ($duplicateTargets.Count -gt 0) {
    throw "Refusing data operation: $($duplicateTargets.Count) target path(s) are duplicated."
}

$allProductsRoot = Join-Path $ProjectRoot 'All Products'
$workingRoot = Join-Path $allProductsRoot 'Instock'
$lockPath = Join-Path $LogDir 'instock_snapshot.lock'
$lockStream = $null
try {
    $lockStream = [System.IO.File]::Open($lockPath, 'OpenOrCreate', 'ReadWrite', 'None')

    if ($Commit) {
        if (-not (Test-Path -LiteralPath $workingRoot)) {
            New-Item -ItemType Directory -Path $workingRoot | Out-Null
        }
        $unexpectedRoots = @(Get-ChildItem -LiteralPath $workingRoot -Force | Where-Object {
            -not $_.PSIsContainer -or $_.Name -notin @('All - GGB', 'All - MAGAZINE')
        })
        if ($unexpectedRoots.Count -gt 0) {
            throw "Working root has unexpected top-level content: $($unexpectedRoots.Name -join ' | ')"
        }

        $expected = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
        foreach ($row in $mapped) { [void]$expected.Add($row.After) }
        $existing = @(Get-ChildItem -LiteralPath $workingRoot -File -Recurse)
        foreach ($file in $existing) {
            $relative = $file.FullName.Substring($ProjectRoot.Length + 1)
            if (-not $expected.Contains($relative)) { throw "Unexpected file in working root: $relative" }
        }

        $sourceRows = foreach ($row in $mapped) {
            $sourcePath = Join-Path $ProjectRoot $row.Before
            if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw "Source disappeared: $($row.Before)" }
            $sourceFile = Get-Item -LiteralPath $sourcePath
            if ($sourceFile.Length -le 0) { throw "Zero-byte source: $($row.Before)" }
            [pscustomobject]@{ Plan = $row; SourcePath = $sourcePath; Bytes = $sourceFile.Length; ModifiedUtc = $sourceFile.LastWriteTimeUtc }
        }
        $bytesNeeded = ($sourceRows | Measure-Object Bytes -Sum).Sum
        $driveName = [System.IO.Path]::GetPathRoot($ProjectRoot).Substring(0, 1)
        $drive = Get-PSDrive -Name $driveName
        if ($null -ne $drive.Free -and $drive.Free -lt [long]($bytesNeeded * 1.05)) {
            throw "Insufficient free disk space. Need at least $([long]($bytesNeeded * 1.05)) bytes."
        }

        $commitRows = New-Object System.Collections.Generic.List[object]
        $i = 0
        foreach ($source in $sourceRows) {
            $i++
            $row = $source.Plan
            $targetPath = Join-Path $ProjectRoot $row.After
            $targetDir = Split-Path -Parent $targetPath
            if (-not (Test-Path -LiteralPath $targetDir)) { New-Item -ItemType Directory -Path $targetDir | Out-Null }
            $sourceHash = (Get-FileHash -LiteralPath $source.SourcePath -Algorithm SHA256).Hash
            $action = 'COPIED'
            if (Test-Path -LiteralPath $targetPath) {
                $targetHash = (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash
                if ($targetHash -ne $sourceHash) { throw "Existing target hash mismatch: $($row.After)" }
                $action = 'RESUMED_VERIFIED'
            } else {
                Copy-Item -LiteralPath $source.SourcePath -Destination $targetPath
                (Get-Item -LiteralPath $targetPath).LastWriteTimeUtc = $source.ModifiedUtc
                $targetHash = (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash
                if ($targetHash -ne $sourceHash) { throw "Copied target hash mismatch: $($row.After)" }
            }
            $commitRows.Add([pscustomobject]@{
                RunID = $timestamp; SnapshotDate = (Get-Date -Format 'dd-MM-yyyy'); PlanHash = $planHash
                Action = $action; Status = 'VERIFIED'; ProductID = $row.ProductID; ItemName = $row.ItemName
                Before = $row.Before; After = $row.After; Bytes = $source.Bytes; SHA256 = $sourceHash; Note = $row.Note
            })
            if ($i % 100 -eq 0 -or $i -eq $sourceRows.Count) { Write-Host ("Verified {0}/{1} files" -f $i, $sourceRows.Count) }
        }

        $actual = @(Get-ChildItem -LiteralPath $workingRoot -File -Recurse)
        if ($actual.Count -ne $expected.Count) { throw "Working file count mismatch: expected $($expected.Count), found $($actual.Count)" }
        foreach ($file in $actual) {
            $relative = $file.FullName.Substring($ProjectRoot.Length + 1)
            if (-not $expected.Contains($relative)) { throw "Unexpected copied file: $relative" }
        }
        $manifestPath = Join-Path $LogDir "instock_snapshot_commit_${timestamp}.csv"
        $commitRows | Export-Csv -LiteralPath $manifestPath -NoTypeInformation -Encoding UTF8
        Write-Host "READY_TO_FINALIZE"
        Write-Host "Manifest: $manifestPath"
        exit 0
    }

    if (-not $Manifest) { throw '-Finalize requires -Manifest.' }
    $resolvedLogDir = (Resolve-Path -LiteralPath $LogDir).Path.TrimEnd('\')
    $resolvedManifest = (Resolve-Path -LiteralPath $Manifest).Path
    if (-not $resolvedManifest.StartsWith($resolvedLogDir + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Manifest must be inside the configured log directory.'
    }
    $manifestRows = @(Import-Csv -LiteralPath $resolvedManifest)
    if ($manifestRows.Count -eq 0) { throw 'Manifest is empty.' }
    $manifestPlanHashes = @($manifestRows.PlanHash | Select-Object -Unique)
    if ($manifestPlanHashes.Count -ne 1 -or $manifestPlanHashes[0] -ne $planHash) {
        throw 'Fresh Sheet/source plan does not match the copied manifest.'
    }
    if (@($manifestRows | Where-Object Status -ne 'VERIFIED').Count -gt 0) { throw 'Manifest contains unverified rows.' }

    if (-not (Test-Path -LiteralPath $workingRoot -PathType Container)) {
        $completed = $null
        foreach ($log in (Get-ChildItem -LiteralPath $LogDir -Filter 'instock_snapshot_finalize_*.csv' -File | Sort-Object LastWriteTimeUtc -Descending)) {
            $record = @(Import-Csv -LiteralPath $log.FullName | Select-Object -First 1)
            if ($record.Count -and $record[0].Status -in @('PLANNED', 'COMPLETED', 'COMPLETED-RECOVERED') -and
                $record[0].Manifest -eq $resolvedManifest -and (Test-Path -LiteralPath $record[0].After -PathType Container)) {
                $completed = [pscustomobject]@{ Path = $record[0].After; Log = $log.FullName; Record = $record[0] }
                break
            }
        }
        if (-not $completed) { throw 'Working Instock folder not found and no completed finalize record matches this manifest.' }
        Assert-SnapshotMatchesManifest -SnapshotRoot $completed.Path -ManifestRows $manifestRows -ProjectRoot $ProjectRoot
        if ($completed.Record.Status -eq 'PLANNED') {
            $completed.Record.Status = 'COMPLETED-RECOVERED'
            $completed.Record.Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
            $completed.Record | Export-Csv -LiteralPath $completed.Log -NoTypeInformation -Encoding UTF8
        }
        Write-Host "FINALIZED: $($completed.Path)"
        Write-Host "Log: $($completed.Log)"
        exit 0
    }
    Assert-SnapshotMatchesManifest -SnapshotRoot $workingRoot -ManifestRows $manifestRows -ProjectRoot $ProjectRoot

    $snapshotDate = @($manifestRows.SnapshotDate | Select-Object -Unique)
    if ($snapshotDate.Count -ne 1 -or $snapshotDate[0] -notmatch '^\d{2}-\d{2}-\d{4}$') { throw 'Manifest SnapshotDate is invalid.' }
    $baseName = "Instock - $($snapshotDate[0])"
    $finalName = $baseName
    $suffix = 2
    while (Test-Path -LiteralPath (Join-Path $allProductsRoot $finalName)) {
        $finalName = '{0} ({1:D2})' -f $baseName, $suffix
        $suffix++
    }
    $finalPath = Join-Path $allProductsRoot $finalName
    $finalLog = Join-Path $LogDir "instock_snapshot_finalize_${timestamp}.csv"
    $finalRecord = [pscustomobject]@{
        Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'; Action = 'RENAME_DIRECTORY'; Status = 'PLANNED'
        Before = $workingRoot; After = $finalPath; FileCount = $manifestRows.Count
        Bytes = ($manifestRows | Measure-Object Bytes -Sum).Sum; PlanHash = $planHash; Manifest = $resolvedManifest
    }
    $finalRecord | Export-Csv -LiteralPath $finalLog -NoTypeInformation -Encoding UTF8
    Move-Item -LiteralPath $workingRoot -Destination $finalPath
    $finalRecord.Status = 'COMPLETED'
    $finalRecord.Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $finalRecord | Export-Csv -LiteralPath $finalLog -NoTypeInformation -Encoding UTF8
    Write-Host "FINALIZED: $finalPath"
    Write-Host "Log: $finalLog"
} finally {
    if ($null -ne $lockStream) { $lockStream.Dispose() }
}
