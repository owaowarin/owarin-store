[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$GgbCsv,
    [Parameter(Mandatory)] [string]$MagazineCsv,
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$LogDir = (Join-Path $PSScriptRoot 'logs'),
    [string]$CachePath,
    [switch]$RefreshHashes,
    [switch]$ForceRehash,
    [string]$EvidencePath,
    [string]$ArchiveJournal
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'image-library.ps1')
if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$configs = @(
    [pscustomobject]@{ Tab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; Csv = $GgbCsv },
    [pscustomobject]@{ Tab = 'MAGAZINE'; RootName = 'All - MAGAZINE'; Csv = $MagazineCsv }
)
$targets = New-Object System.Collections.Generic.List[object]
$report = New-Object System.Collections.Generic.List[object]
foreach ($config in $configs) {
    $rows = @(Import-Csv -LiteralPath $config.Csv)
    if (-not $rows.Count) { throw "CSV has no data rows: $($config.Csv)" }
    foreach ($required in @('Item name', 'Product ID', 'Status', 'Type')) {
        if ($rows[0].PSObject.Properties.Name -notcontains $required) { throw "Missing '$required' column in $($config.Csv)" }
    }
    foreach ($row in $rows) {
        $itemName = ([string]$row.'Item name').Trim()
        $productId = ([string]$row.'Product ID').Trim()
        if (-not $itemName -or -not $productId) {
            if ($itemName -or $productId) {
                $report.Add([pscustomobject]@{ Status = 'INVALID-SHEET-ROW'; SourceTab = $config.Tab; ProductID = $productId; ItemName = $itemName; Type = ([string]$row.Type).Trim(); Before = ''; Page = ''; Note = 'Item name and Product ID are both required' })
            }
            continue
        }
        $targets.Add([pscustomobject]@{
            SourceTab = $config.Tab; RootName = $config.RootName; ProductID = $productId
            ItemName = $itemName; Type = ([string]$row.Type).Trim(); Status = ([string]$row.Status).Trim()
            NormalizedName = Get-ImageNormalizedName $itemName
        })
    }
}

$duplicatePids = @($targets | Group-Object ProductID | Where-Object { $_.Name -and $_.Count -gt 1 })
$duplicatePidSet = @{}
foreach ($group in $duplicatePids) { $duplicatePidSet[$group.Name] = $true }
$eligible = @($targets | Where-Object { -not $duplicatePidSet.ContainsKey($_.ProductID) })
foreach ($group in $duplicatePids) {
    foreach ($row in $group.Group) {
        $report.Add([pscustomobject]@{ Status = 'DUPLICATE-PRODUCT-ID'; SourceTab = $row.SourceTab; ProductID = $row.ProductID; ItemName = $row.ItemName; Type = $row.Type; Before = ''; Page = ''; Note = 'Product ID must be unique across both tabs' })
    }
}

$inventory = Get-ImageInventory -ProjectRoot $ProjectRoot -CachePath $CachePath -RefreshHashes:$RefreshHashes -ForceRehash:$ForceRehash
$resolved = Resolve-ImageProducts -Rows $eligible -Inventory $inventory
foreach ($row in $resolved.Rows) {
    $before = if ($row.Status -eq 'MAPPED') { Join-Path (Join-Path 'All Products' $row.RootName) $row.Relative } else { '' }
    $report.Add([pscustomobject]@{
        Status = $row.Status; SourceTab = $row.SourceTab; ProductID = $row.ProductID; ItemName = $row.ItemName
        Type = $row.Type; Before = $before; Page = $row.Page; Note = $row.Note
    })
}
foreach ($issue in (Test-ImageManifest -Rows ([object[]]$resolved.Rows) -Mode R2)) {
    $report.Add([pscustomobject]@{ Status = $issue.Status; SourceTab = ''; ProductID = $issue.ProductID; ItemName = ''; Type = ''; Before = ''; Page = $issue.Page; Note = $issue.Note })
}

$owned = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
foreach ($row in ($resolved.Rows | Where-Object Status -eq 'MAPPED')) { [void]$owned.Add("$($row.RootName)|$($row.Relative)") }
foreach ($file in $inventory.Files) {
    if (-not $owned.Contains("$($file.RootName)|$($file.Relative)")) {
        $report.Add([pscustomobject]@{
            Status = 'UNASSIGNED-FILE'; SourceTab = ''; ProductID = ''; ItemName = $file.SourceStem; Type = ''
            Before = Join-Path (Join-Path 'All Products' $file.RootName) $file.Relative; Page = $file.Position; Note = 'Retain for review; not a deletion instruction'
        })
    }
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $LogDir "image_library_check_${timestamp}.csv"
if ($EvidencePath) {
    if (Test-Path -LiteralPath $EvidencePath) { throw "Evidence already exists: $EvidencePath" }
    $archiveFiles = @()
    if ($ArchiveJournal) {
        $archiveRoot = [IO.Path]::GetFullPath((Join-Path $ProjectRoot 'All Products\Archived')).TrimEnd('\')
        $archiveFiles = @(foreach ($entry in (Import-Csv -LiteralPath $ArchiveJournal)) {
            $target = [IO.Path]::GetFullPath((Join-Path $ProjectRoot $entry.Target))
            if (-not $target.StartsWith($archiveRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive journal path escaped Archived.' }
            $stem = [IO.Path]::GetFileNameWithoutExtension($target)
            $suffix = $script:ImageLibraryPageSuffix.Match($stem)
            $stem = if ($suffix.Success) { $suffix.Groups['item'].Value } else { $stem }
            $currentHash = ''; $bytes = 0; $state = 'MISSING'
            if (Test-Path -LiteralPath $target -PathType Leaf) {
                $before = Get-Item -LiteralPath $target
                $bytes = $before.Length; $ticks = $before.LastWriteTimeUtc.Ticks
                $currentHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
                $after = Get-Item -LiteralPath $target
                if ($after.Length -ne $bytes -or $after.LastWriteTimeUtc.Ticks -ne $ticks) { throw "Archive changed during read: $target" }
                $state = if ($currentHash -ceq $entry.AfterSHA256 -and $entry.BeforeSHA256 -ceq $entry.AfterSHA256 -and $bytes -eq [long]$entry.Bytes) { 'HASH-VERIFIED' } else { 'HASH-MISMATCH' }
            }
            [pscustomobject]@{ Source = $entry.Source; Target = $entry.Target; FullPath = $target; SourceStem = $stem; NormalizedStem = Get-ImageNormalizedName $stem; Bytes = $bytes; SHA256 = $currentHash; State = $state; JournalState = $entry.Status }
        })
    }
    $evidence = [ordered]@{ WrittenUtc = [DateTime]::UtcNow.ToString('o'); ForceRehash = [bool]$ForceRehash; Inventory = $inventory; Targets = [object[]]$targets; Matches = $resolved.Rows; Report = [object[]]$report; ArchiveFiles = $archiveFiles }
    [IO.File]::WriteAllText($EvidencePath, ($evidence | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
}
$report | Sort-Object Status, SourceTab, ProductID, Before | Export-Csv -LiteralPath $logPath -NoTypeInformation -Encoding UTF8
Write-Host '=== Image library check (offline) ==='
Write-Host ("Sheet products : {0}" -f $targets.Count)
Write-Host ("Library files  : {0} (cache reused {1}, hashed {2})" -f $inventory.FileCount, $inventory.CacheReused, $inventory.Hashed)
$report | Group-Object Status | Sort-Object Name | ForEach-Object { Write-Host ("{0,-24}: {1}" -f $_.Name, $_.Count) }
Write-Host "Log: $logPath"
Write-Host 'CHECK ONLY - no image, Sheet or R2 data was changed.'
