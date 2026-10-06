[CmdletBinding()]
param(
    [string]$SheetId = "16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0",
    [string]$GgbGid = "286842017",
    [string]$LogDir,
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$CachePath
)

# Phase A only: build ItemName -> Product ID -> R2 key mapping from the live sheet + All - GGB on disk.
# Does NOT touch any image file. Read-only against All Products\All - GGB and R2 (rclone lsf).

. (Join-Path $PSScriptRoot 'image-library.ps1')
if (-not $LogDir) { $LogDir = Join-Path $PSScriptRoot 'logs' }
if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$TypeToFolder = @{
    'GAME GUIDE BOOKS'      = 'GGB - GAME GUIDE BOOKS'
    'GAMEMAG TOP SECRET'    = 'GGB - GAMEMAG TOP SECRET'
    'GAMEMAG SPECIAL'       = 'GGB - GAMEMAG SPECIAL'
    'GAMEMAG CHEATS & CODE' = 'GGB - CHEAT & CODE'
    'SPECIAL TECHNIC'       = $script:ImageTypeRoutes["GAME GUIDE BOOKS`0SPECIAL TECHNIC"]
    'TONBO MAGAZINE CHEAT & CODE' = $script:ImageTypeRoutes["GAME GUIDE BOOKS`0TONBO MAGAZINE CHEAT & CODE"]
}

# ---- 1. fetch live sheet (GAME GUIDE BOOKS tab only - this pass covers All - GGB source) ----
$sheetUrl = "https://docs.google.com/spreadsheets/d/$SheetId/gviz/tq?tqx=out:csv&gid=$GgbGid"
Write-Host "Fetching live sheet: $sheetUrl"
try {
    $resp = Invoke-WebRequest -Uri $sheetUrl -UseBasicParsing
} catch {
    Write-Error "Failed to fetch sheet: $_"
    exit 1
}
$tmpCsv = Join-Path $env:TEMP 'owarin_ggb_live_for_r2map.csv'
[System.IO.File]::WriteAllText($tmpCsv, $resp.Content, [System.Text.Encoding]::UTF8)
$rows = Import-Csv -LiteralPath $tmpCsv

Write-Host ""
Write-Host "=== Sheet row check (verify no stuck filter before trusting this run) ==="
Write-Host ("Total rows read: {0}" -f $rows.Count)
$rows | Group-Object Type | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("  {0,-24} {1,5}" -f $_.Name, $_.Count)
}
Write-Host "=========================================================================="

# ---- 3. get existing R2 PIDs (for the sanity-check gate) ----
Write-Host ""
Write-Host "Listing existing R2 library/ PIDs (rclone lsf)..."
$r2Pids = (rclone lsf r2:owarin-images/library --dirs-only) | ForEach-Object { $_.TrimEnd('/') } | Where-Object { $_ }
if ($LASTEXITCODE -ne 0) { throw "rclone listing failed with exit code $LASTEXITCODE" }
$r2PidSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($p in $r2Pids) { [void]$r2PidSet.Add($p) }
Write-Host ("R2 existing PID folders: {0}" -f $r2PidSet.Count)

# ---- 4. scan once, then match all rows in memory ----
$plan = New-Object System.Collections.Generic.List[object]
$mappingRows = New-Object System.Collections.Generic.List[object]
foreach ($r in $rows) {
    $itemName = ([string]$r.'Item name').Trim()
    $pid_ = ([string]$r.'Product ID').Trim()
    $type = ([string]$r.Type).Trim()
    if ([string]::IsNullOrWhiteSpace($itemName)) { continue }
    if ([string]::IsNullOrWhiteSpace($pid_)) { continue }
    if (-not $TypeToFolder.ContainsKey($type)) { continue }   # out of scope for this All - GGB pass (e.g. POCKET BOOK, blank)
    $mappingRows.Add([pscustomobject]@{
        SourceTab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; ProductID = $pid_; ItemName = $itemName
        Type = $type; SourceSubtree = $TypeToFolder[$type]
    })
}
$inventory = Get-ImageInventory -ProjectRoot $ProjectRoot -CachePath $CachePath
$resolved = Resolve-ImageProducts -Rows ([object[]]$mappingRows) -Inventory $inventory
foreach ($match in $resolved.Rows) {
    if ($match.Status -ne 'MAPPED') {
        $plan.Add([pscustomobject]@{
            SourceFile = ''; ItemName = $match.ItemName; Type = $match.Type; ProductID = $match.ProductID
            DestKey = ''; Status = $match.Status; Note = $match.Note
        })
        continue
    }
    $plan.Add([pscustomobject]@{
        SourceFile = Join-Path 'All Products\All - GGB' $match.Relative
        ItemName = $match.ItemName; Type = $match.Type; ProductID = $match.ProductID
        DestKey = "library/$($match.ProductID)/$($match.Page)$($match.Extension)"; Status = 'MAPPED'; Note = $match.Note
    })
}
foreach ($issue in (Test-ImageManifest -Rows ([object[]]$resolved.Rows) -Mode R2)) {
    $plan.Add([pscustomobject]@{
        SourceFile = ''; ItemName = ''; Type = ''; ProductID = $issue.ProductID
        DestKey = ''; Status = $issue.Status; Note = $issue.Note
    })
}

# ---- 5. report ----
Write-Host ""
Write-Host "=== Status summary ==="
$plan | Group-Object Status | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("  {0,-16} {1,5}" -f $_.Name, $_.Count)
}
Write-Host "======================"

$mappedPids = $plan | Where-Object { $_.Status -eq 'MAPPED' } | ForEach-Object { $_.ProductID } | Select-Object -Unique
$overlap = $mappedPids | Where-Object { $r2PidSet.Contains($_) }
$overlapPct = if ($mappedPids.Count -gt 0) { [math]::Round(($overlap.Count / $mappedPids.Count) * 100, 1) } else { 0 }
$coveragePct = if ($r2PidSet.Count -gt 0) { [math]::Round(($overlap.Count / $r2PidSet.Count) * 100, 1) } else { 0 }

Write-Host ""
Write-Host "=== Mapping sanity gate ==="
Write-Host ("Distinct PIDs mapped from All - GGB this pass: {0}" -f $mappedPids.Count)
Write-Host ("  of which already exist on R2               : {0} ({1}%)" -f $overlap.Count, $overlapPct)
Write-Host ("R2 existing PID folders (all sources)        : {0}" -f $r2PidSet.Count)
Write-Host ("  covered by this All - GGB mapping           : {0}%  (below 100% is expected - MAGAZINE-tab items are a separate source, out of scope here)" -f $coveragePct)
if ($overlapPct -lt 95) {
    Write-Warning "Overlap with existing R2 PIDs is below 95% - mapping logic likely wrong. STOP, do not proceed to Phase B."
} else {
    Write-Host "Overlap >= 95% - mapping looks consistent with what's already on R2."
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $LogDir "r2_map_${timestamp}.csv"
$plan | Select-Object @{n='Timestamp';e={Get-Date -Format 'yyyy-MM-dd HH:mm:ss'}}, SourceFile, ItemName, Type, ProductID, DestKey, Status, Note |
    Export-Csv -LiteralPath $logPath -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "Log written: $logPath"
