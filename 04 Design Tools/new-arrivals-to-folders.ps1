[CmdletBinding()]
param(
    [switch]$Commit,
    [string]$SourceDir = "$env:USERPROFILE\Downloads",
    [string]$DestRoot,
    [string]$SheetId = "16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0",
    [string]$Gid = "286842017",
    [string]$LogDir
)

# ---- paths ----
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $DestRoot) { $DestRoot = Join-Path $ProjectRoot 'All Products\All - GGB' }
if (-not $LogDir)   { $LogDir  = Join-Path $PSScriptRoot 'logs' }
if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$TypeToFolder = @{
    'GAME GUIDE BOOKS'      = 'GGB - GAME GUIDE BOOKS'
    'GAMEMAG TOP SECRET'    = 'GGB - GAMEMAG TOP SECRET'
    'GAMEMAG SPECIAL'       = 'GGB - GAMEMAG SPECIAL'
    'GAMEMAG CHEATS & CODE' = 'GGB - CHEAT & CODE'
}
$FolderPerBookTypes = @('GAME GUIDE BOOKS')
$ImageExtensions = @('.jpg', '.jpeg', '.png', '.webp')

# ---- normalize for near-duplicate matching ----
$script:StripCharList = @('：', '／', '｜', '×', '⨯', '・', ',', '.', "'", '-', '–', '—', '_', '&', '+', '(', ')')
$script:StripPattern = ($script:StripCharList | ForEach-Object { [regex]::Escape($_) }) -join '|'

function Get-NormalizedName {
    param([string]$Name)
    $n = $Name.ToLowerInvariant()
    $n = $n -replace '\s', ''
    $n = [regex]::Replace($n, $script:StripPattern, '')
    $n = $n -replace 'restock0+(\d)', 'restock$1'
    return $n
}

# ---- 1. fetch live sheet ----
$sheetUrl = "https://docs.google.com/spreadsheets/d/$SheetId/gviz/tq?tqx=out:csv&gid=$Gid"
Write-Host "Fetching live sheet: $sheetUrl"
try {
    $resp = Invoke-WebRequest -Uri $sheetUrl -UseBasicParsing
} catch {
    Write-Error "Failed to fetch sheet: $_"
    exit 1
}
$tmpCsv = Join-Path $env:TEMP 'owarin_ggb_live.csv'
[System.IO.File]::WriteAllText($tmpCsv, $resp.Content, [System.Text.Encoding]::UTF8)
$rows = Import-Csv -LiteralPath $tmpCsv

Write-Host ""
Write-Host "=== Sheet row check (verify no stuck filter before trusting this run) ==="
Write-Host ("Total rows read: {0}" -f $rows.Count)
$rows | Group-Object Type | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("  {0,-24} {1,5}" -f $_.Name, $_.Count)
}
Write-Host "=========================================================================="
Write-Host ""

# ---- 2. build sheet lookup (Item name -> Type) ----
$sheetByName = @{}
$sheetNamesForDupCheck = New-Object System.Collections.Generic.List[string]
foreach ($r in $rows) {
    $itemName = $r.'Item name'
    if ([string]::IsNullOrWhiteSpace($itemName)) { continue }
    if ($sheetByName.ContainsKey($itemName) -and $sheetByName[$itemName] -ne $r.Type) {
        Write-Warning "Sheet has conflicting Type for '$itemName': '$($sheetByName[$itemName])' vs '$($r.Type)'"
    }
    $sheetByName[$itemName] = $r.Type
    $sheetNamesForDupCheck.Add($itemName)
}

# ---- 3. build near-duplicate index from existing All - GGB contents (all 4 categories) ----
$existingIndex = New-Object System.Collections.Generic.List[object]
foreach ($type in $TypeToFolder.Keys) {
    $folder = $TypeToFolder[$type]
    $catPath = Join-Path $DestRoot $folder
    if (-not (Test-Path -LiteralPath $catPath)) { continue }
    if ($FolderPerBookTypes -contains $type) {
        Get-ChildItem -LiteralPath $catPath -Directory | ForEach-Object {
            $existingIndex.Add([pscustomobject]@{ Category = $folder; Name = $_.Name; Norm = Get-NormalizedName $_.Name })
        }
    } else {
        Get-ChildItem -LiteralPath $catPath -File | ForEach-Object {
            $base = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
            $base = $base -replace ' \(\d+\)$', ''
            $existingIndex.Add([pscustomobject]@{ Category = $folder; Name = $base; Norm = Get-NormalizedName $base })
        }
    }
}

# ---- 4. walk Downloads and classify each file ----
$plan = New-Object System.Collections.Generic.List[object]
$srcFiles = Get-ChildItem -LiteralPath $SourceDir -File

foreach ($f in $srcFiles) {
    $name = $f.Name
    $ext = $f.Extension.ToLowerInvariant()
    $base = [System.IO.Path]::GetFileNameWithoutExtension($name)

    $status = $null
    $itemName = $null
    $type = $null
    $destFolder = $null
    $destPath = $null
    $note = ''

    if ($name -eq 'desktop.ini') {
        $status = 'SKIP'; $note = 'desktop.ini'
    } elseif ($name -match '^\.~lock\..*#$') {
        $status = 'SKIP'; $note = 'lock file'
    } elseif ($ext -eq '.zip') {
        $status = 'SKIP'; $note = 'zip archive'
    } elseif ($ImageExtensions -notcontains $ext) {
        $status = 'SKIP'; $note = 'non-image extension'
    } elseif ($base -notmatch '^(?<item>.+) \((?<n>\d+)\)$') {
        $status = 'SKIP'; $note = 'no (1)/(2) page suffix'
    } else {
        $itemName = $Matches['item']

        if (-not $sheetByName.ContainsKey($itemName)) {
            $status = 'NOT-IN-SHEET'
            $normCandidate = Get-NormalizedName $itemName
            $near = $sheetNamesForDupCheck | Where-Object { $_ -ne $itemName -and (Get-NormalizedName $_) -eq $normCandidate }
            if ($near) { $note = "possible sheet match: $($near -join ' | ')" }
        } else {
            $type = $sheetByName[$itemName]
            if (-not $TypeToFolder.ContainsKey($type)) {
                $status = 'UNMAPPED-TYPE'
                $note = "Type '$type' has no destination folder mapping — ask before creating one"
            } else {
                $destFolder = $TypeToFolder[$type]
                if ($FolderPerBookTypes -contains $type) {
                    $bookFolder = Join-Path (Join-Path $DestRoot $destFolder) $itemName
                    $destPath = Join-Path $bookFolder $name
                    if (Test-Path -LiteralPath $destPath) {
                        $status = 'CONFLICT'; $note = 'destination file already exists'
                    } elseif (Test-Path -LiteralPath $bookFolder) {
                        $status = 'MERGE'
                    } else {
                        $normCandidate = Get-NormalizedName $itemName
                        $near = $existingIndex | Where-Object { $_.Norm -eq $normCandidate -and $_.Name -ne $itemName }
                        if ($near) {
                            $status = 'DUP?'
                            $note = "similar existing: " + (($near | ForEach-Object { "$($_.Category)\$($_.Name)" }) -join ' | ')
                        } else {
                            $status = 'NEW'
                        }
                    }
                } else {
                    $destPath = Join-Path (Join-Path $DestRoot $destFolder) $name
                    if (Test-Path -LiteralPath $destPath) {
                        $status = 'CONFLICT'; $note = 'destination file already exists'
                    } else {
                        $normCandidate = Get-NormalizedName $itemName
                        $near = $existingIndex | Where-Object { $_.Norm -eq $normCandidate -and $_.Name -ne $itemName }
                        if ($near) {
                            $status = 'DUP?'
                            $note = "similar existing: " + (($near | ForEach-Object { "$($_.Category)\$($_.Name)" }) -join ' | ')
                        } else {
                            $status = 'NEW'
                        }
                    }
                }
            }
        }
    }

    $plan.Add([pscustomobject]@{
        SourceFile = $name
        ItemName   = $itemName
        Type       = $type
        Status     = $status
        DestPath   = $destPath
        Note       = $note
    })
}

# ---- 5. report ----
$plan | Sort-Object Status, SourceFile | Format-Table SourceFile, ItemName, Type, Status, Note -AutoSize -Wrap | Out-Host

Write-Host ""
Write-Host "=== Status summary ==="
$plan | Group-Object Status | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("  {0,-14} {1,5}" -f $_.Name, $_.Count)
}
Write-Host "======================"

$mode = 'dryrun'
if ($Commit) { $mode = 'commit' }
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $LogDir "new-arrivals_${mode}_${timestamp}.csv"
$plan | Select-Object @{n='Timestamp';e={Get-Date -Format 'yyyy-MM-dd HH:mm:ss'}}, SourceFile, ItemName, Type, Status, DestPath, Note |
    Export-Csv -LiteralPath $logPath -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "Log written: $logPath"

# ---- 6. commit (only NEW / MERGE ever move; nothing else, ever) ----
if (-not $Commit) {
    Write-Host ""
    Write-Host "DRY RUN — no files moved. Re-run with -Commit after reviewing the table above."
    exit 0
}

Write-Host ""
Write-Host "COMMIT — moving NEW / MERGE rows only..."
$moved = 0
foreach ($row in $plan) {
    if ($row.Status -ne 'NEW' -and $row.Status -ne 'MERGE') { continue }
    $destDir = Split-Path -Parent $row.DestPath
    if (-not (Test-Path -LiteralPath $destDir)) {
        New-Item -ItemType Directory -Path $destDir | Out-Null
    }
    $srcPath = Join-Path $SourceDir $row.SourceFile
    Move-Item -LiteralPath $srcPath -Destination $row.DestPath
    $moved++
}
Write-Host "Moved $moved file(s)."
