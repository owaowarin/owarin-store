[CmdletBinding()]
param(
    [switch]$Commit,
    [string]$SheetId = '16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0',
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$LogDir = (Join-Path $PSScriptRoot 'logs'),
    [string]$Remote = 'r2:owarin-images/library',
    [string]$MetaRemote = 'r2:owarin-images/meta/images.csv'
)

# Uploads photos for Instock products that have NO folder on R2 yet (library/<Product ID>/<n>.<ext>).
# Reads the LIVE sheet (never a local export) and lists R2 directly, so renumbered PIDs cannot be mis-keyed.
# Mapping PID -> local files reuses image-library.ps1 (same resolver the Instock snapshot used).
# Safety: default is DRY-RUN (writes a plan CSV only, touches nothing).
#         -Commit stages hardlinks under _r2_upload\_v6_<ts>\library and runs
#         `rclone copy --ignore-existing` (never sync, never overwrites an existing R2 object).
# v2 (2026-09-25, PLAN-META-PIPELINE-HARDENING):
#   * PID CHANGES ledger (sheet tab written by Code v27): an Instock PID with no R2 folder whose OLD PID
#     has one gets a server-side `rclone copy <old> <new> --ignore-existing` (works even when the local
#     folder name no longer matches the edited Item name).
#   * -Commit also rebuilds the index, backs up and publishes meta/images.csv, and verifies it by
#     downloading it back - the whole R2 side in one command. Nothing is ever deleted on R2.

$ErrorActionPreference = 'Stop'
# image-library.ps1 is UTF-8 without BOM: Windows PowerShell 5.1 would read its Thai folder names
# ('GGB - TONBO MAGAZINE รวมบทสรุป') as ANSI and break type routes, so load it explicitly as UTF-8.
. ([scriptblock]::Create([System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'image-library.ps1'), [System.Text.Encoding]::UTF8)))
$bindingsPath = Join-Path $PSScriptRoot 'image-bindings.csv'
if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

# Rebuild the pid,n,ext index from R2, back up the published one, publish, read back and compare.
function Publish-Index {
    $indexPath = Join-Path $ProjectRoot '_r2_upload\images.csv'
    & (Join-Path $PSScriptRoot 'build-r2-images-index.ps1') -Commit
    if ($LASTEXITCODE -ne 0) { throw "build-r2-images-index.ps1 failed (exit $LASTEXITCODE) - index NOT published." }
    $backup = Join-Path $ProjectRoot "_r2_upload\_r2_backup\$timestamp\images.csv"
    rclone copyto $MetaRemote $backup
    if ($LASTEXITCODE -ne 0) { throw "Backup of $MetaRemote failed - index NOT published." }
    $pubLog = Join-Path $LogDir "meta_images_publish_$timestamp.log"
    rclone copyto $indexPath $MetaRemote --log-file $pubLog --log-level INFO
    if ($LASTEXITCODE -ne 0) { throw "Publish failed (exit $LASTEXITCODE) - backup kept at $backup" }
    $check = Join-Path $env:TEMP "owarin_meta_images_readback_$timestamp.csv"
    rclone copyto $MetaRemote $check
    $same = ((Get-FileHash -LiteralPath $indexPath).Hash -eq (Get-FileHash -LiteralPath $check).Hash)
    $pids = @(Get-Content -LiteralPath $indexPath).Count - 1
    Write-Host ("Index published: {0} PIDs | read-back identical: {1} | backup: {2}" -f $pids, $same, $backup)
    if (-not $same) { throw "Published meta/images.csv differs from the local index - check $pubLog" }
}

# PID CHANGES ledger from the live sheet (old -> latest new, chains followed). Missing tab = empty map.
function Get-PidChangeMap {
    $step = @{}
    try {
        $url = "https://docs.google.com/spreadsheets/d/$SheetId/gviz/tq?tqx=out:csv&sheet=$([uri]::EscapeDataString('PID CHANGES'))"
        $tmp = Join-Path $env:TEMP 'owarin_live_PID_CHANGES.csv'
        [System.IO.File]::WriteAllText($tmp, (Invoke-WebRequest -Uri $url -UseBasicParsing).Content, [System.Text.Encoding]::UTF8)
        $rows = @(Import-Csv -LiteralPath $tmp)
        if ($rows.Count -and @($rows[0].PSObject.Properties.Name) -contains 'Old Product ID' -and @($rows[0].PSObject.Properties.Name) -contains 'New Product ID') {
            foreach ($r in $rows) {
                $o = ([string]$r.'Old Product ID').Trim(); $n = ([string]$r.'New Product ID').Trim()
                if ($o -and $n -and $o -ne $n) { $step[$o] = $n }
            }
        }
    } catch { Write-Warning "PID CHANGES not readable ($($_.Exception.Message)) - continuing without it." }
    $map = @{}
    foreach ($o in @($step.Keys)) {
        $cur = $step[$o]; $seen = @{ $o = $true }
        while ($step.ContainsKey($cur) -and -not $seen.ContainsKey($cur)) { $seen[$cur] = $true; $cur = $step[$cur] }
        $map[$o] = $cur
    }
    return $map
}

# ---- 1. live sheet, Instock rows only ----
$selected = New-Object System.Collections.Generic.List[object]
foreach ($src in @(@{ Tab = 'GAME GUIDE BOOKS'; Root = 'All - GGB' }, @{ Tab = 'MAGAZINE'; Root = 'All - MAGAZINE' })) {
    $url = "https://docs.google.com/spreadsheets/d/$SheetId/gviz/tq?tqx=out:csv&sheet=$([uri]::EscapeDataString($src.Tab))"
    $tmp = Join-Path $env:TEMP "owarin_live_$($src.Tab -replace ' ', '_').csv"
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing
    [System.IO.File]::WriteAllText($tmp, $resp.Content, [System.Text.Encoding]::UTF8)
    $rows = @(Import-Csv -LiteralPath $tmp)
    if ($rows.Count -eq 0) { throw "Live sheet returned no rows: $($src.Tab)" }
    foreach ($required in @('Item name', 'Product ID', 'Status', 'Type')) {
        if (@($rows[0].PSObject.Properties.Name) -notcontains $required) { throw "Missing '$required' column in live $($src.Tab)" }
    }
    $n = 0
    foreach ($r in $rows) {
        if (([string]$r.Status).Trim() -cne 'Instock') { continue }
        $pid_ = ([string]$r.'Product ID').Trim(); $name = ([string]$r.'Item name').Trim()
        if (-not $pid_ -or -not $name) { continue }
        $selected.Add([pscustomobject]@{ SourceTab = $src.Tab; RootName = $src.Root; ProductID = $pid_; ItemName = $name; Type = ([string]$r.Type).Trim() })
        $n++
    }
    Write-Host ("Live {0}: {1} rows, {2} Instock" -f $src.Tab, $rows.Count, $n)
}

# ---- 2. what is already on R2 (read-only) ----
$r2 = @(rclone lsf $Remote --dirs-only)
if ($LASTEXITCODE -ne 0 -or $r2.Count -eq 0) { throw "rclone lsf failed or returned nothing (exit $LASTEXITCODE) - aborting, nothing touched." }
$onR2 = New-Object System.Collections.Generic.HashSet[string]
foreach ($d in $r2) { [void]$onR2.Add($d.TrimEnd('/')) }
$missing = @($selected | Where-Object { -not $onR2.Contains($_.ProductID) })
Write-Host ("R2 PID folders: {0} | Instock without R2 folder: {1}" -f $onR2.Count, $missing.Count)

# ---- 2b. PID CHANGES: copy the old PID's R2 folder to the new PID (server-side, add-only) ----
$pidMap = Get-PidChangeMap
$r2Copies = New-Object System.Collections.Generic.List[object]
if ($pidMap.Count -and $missing.Count) {
    $missingSet = @{}; foreach ($m in $missing) { $missingSet[$m.ProductID] = $m }
    foreach ($old in @($pidMap.Keys)) {
        $new = $pidMap[$old]
        if ($missingSet.ContainsKey($new) -and $onR2.Contains($old) -and -not ($r2Copies | Where-Object ProductID -eq $new)) {
            $r2Copies.Add([pscustomobject]@{ Action = 'R2COPY'; Status = 'PID_CHANGED'; SourceTab = $missingSet[$new].SourceTab; ProductID = $new
                ItemName = $missingSet[$new].ItemName; Page = ''; Source = "library/$old/"; DestKey = "library/$new/"; Bytes = ''; SHA256 = ''; Note = "PID CHANGES: $old -> $new" })
        }
    }
    if ($r2Copies.Count) {
        $copied = @{}; foreach ($c in $r2Copies) { $copied[$c.ProductID] = $true }
        $missing = @($missing | Where-Object { -not $copied.ContainsKey($_.ProductID) })
        Write-Host ("PID CHANGES: {0} product(s) will get their photos copied on R2 from the old Product ID" -f $r2Copies.Count)
    }
}
if ($missing.Count -eq 0 -and $r2Copies.Count -eq 0) {
    Write-Host 'Nothing to upload.'
    if ($Commit) { Publish-Index }
    exit 0
}

# ---- 3. map to local files ----
$resolved = [pscustomobject]@{ Rows = @() }
if ($missing.Count) {
$inventory = Get-ImageInventory -ProjectRoot $ProjectRoot -CachePath (Join-Path $LogDir 'image-inventory-cache.json')
# The resolver throws on a bad Product ID binding; drop that one PID (logged as SKIP) instead of aborting all.
$badPids = New-Object System.Collections.Generic.HashSet[string]
$thrown = New-Object System.Collections.Generic.List[object]
while ($true) {
    $rowsNow = @($missing | Where-Object { -not $badPids.Contains($_.ProductID) })
    try { $resolved = Resolve-ImageProducts -Rows ([object[]]$rowsNow) -Inventory $inventory -BindingsPath $bindingsPath; break }
    catch {
        $m = [regex]::Match($_.Exception.Message, '(OWA-[A-Za-z0-9_-]+)')
        if (-not $m.Success -or $badPids.Contains($m.Value)) { throw }
        [void]$badPids.Add($m.Value)
        $thrown.Add([pscustomobject]@{ ProductID = $m.Value; Note = $_.Exception.Message })
        Write-Warning "Skipping $($m.Value): $($_.Exception.Message)"
    }
}
}
$issues = @(if (@($resolved.Rows).Count) { Test-ImageManifest -Rows @($resolved.Rows) -Mode R2 })
foreach ($i in $issues) { foreach ($p in ([string]$i.ProductID -split ' \| ')) { [void]$badPids.Add($p) } }
foreach ($r in $resolved.Rows) { if ($r.Status -ne 'MAPPED') { [void]$badPids.Add($r.ProductID) } }

$plan = New-Object System.Collections.Generic.List[object]
foreach ($r in $resolved.Rows) {
    $ok = $r.Status -eq 'MAPPED' -and -not $badPids.Contains($r.ProductID)
    $plan.Add([pscustomobject]@{
        Action = $(if ($ok) { 'UPLOAD' } else { 'SKIP' }); Status = $r.Status; SourceTab = $r.SourceTab
        ProductID = $r.ProductID; ItemName = $r.ItemName; Page = $r.Page
        Source = $(if ($r.Relative) { Join-Path (Join-Path 'All Products' $r.RootName) $r.Relative } else { '' })
        DestKey = $(if ($ok) { "library/$($r.ProductID)/$($r.Page)$($r.Extension)" } else { '' })
        Bytes = $r.Bytes; SHA256 = $r.SHA256; Note = $r.Note
    })
}
foreach ($t in $thrown) {
    $plan.Add([pscustomobject]@{ Action = 'SKIP'; Status = 'BINDING-ERROR'; SourceTab = ''; ProductID = $t.ProductID; ItemName = ''; Page = ''; Source = ''; DestKey = ''; Bytes = ''; SHA256 = ''; Note = $t.Note })
}
foreach ($i in $issues) {
    $plan.Add([pscustomobject]@{ Action = 'SKIP'; Status = $i.Status; SourceTab = ''; ProductID = $i.ProductID; ItemName = ''; Page = $i.Page; Source = ''; DestKey = ''; Bytes = ''; SHA256 = ''; Note = $i.Note })
}
foreach ($c in $r2Copies) { $plan.Add($c) }
$planPath = Join-Path $LogDir "r2_missing_upload_plan_$timestamp.csv"
$plan | Sort-Object Action, SourceTab, ItemName, Page | Export-Csv -LiteralPath $planPath -NoTypeInformation -Encoding UTF8

$upload = @($plan | Where-Object Action -eq 'UPLOAD')
Write-Host ("R2 copies from old Product IDs: {0}" -f $r2Copies.Count)
Write-Host ''
Write-Host '=== Plan ==='
$plan | Group-Object Action, Status | Sort-Object Count -Descending | ForEach-Object { Write-Host ("  {0,-28} {1,5}" -f $_.Name, $_.Count) }
Write-Host ("Products to upload: {0} | files: {1} | MB: {2:N1}" -f @($upload.ProductID | Select-Object -Unique).Count, $upload.Count, (($upload | Measure-Object Bytes -Sum).Sum / 1MB))
Write-Host "Plan: $planPath"

if (-not $Commit) { Write-Host 'DRY-RUN: nothing staged, nothing uploaded. Re-run with -Commit to upload.'; exit 0 }
if ($upload.Count -eq 0 -and $r2Copies.Count -eq 0) { Write-Host 'Nothing uploadable.'; Publish-Index; exit 0 }

# ---- 3b. server-side copies for changed Product IDs (add-only) ----
$copyFail = 0
foreach ($c in $r2Copies) {
    $old = $c.Source.Substring('library/'.Length).TrimEnd('/'); $new = $c.ProductID
    rclone copy "$Remote/$old" "$Remote/$new" --ignore-existing --log-file (Join-Path $LogDir "r2_pidchange_copy_$timestamp.log") --log-level INFO
    if ($LASTEXITCODE -ne 0) { $copyFail++ ; Write-Warning "R2 copy $old -> $new failed (exit $LASTEXITCODE)" }
}

# ---- 4. stage (hardlinks, fall back to copy) and upload ----
$code = 0
if ($upload.Count) {
$stage = Join-Path $ProjectRoot "_r2_upload\_v6_$timestamp\library"
foreach ($u in $upload) {
    $dest = Join-Path $stage ($u.DestKey.Substring('library/'.Length) -replace '/', '\')
    New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
    $src = Join-Path $ProjectRoot $u.Source
    try { New-Item -ItemType HardLink -Path $dest -Target $src | Out-Null } catch { Copy-Item -LiteralPath $src -Destination $dest }
}
$rcloneLog = Join-Path $LogDir "r2_missing_upload_commit_$timestamp.log"
rclone copy $stage $Remote --ignore-existing --checksum --transfers 8 --log-file $rcloneLog --log-level INFO
$code = $LASTEXITCODE
}

# ---- 5. verify every planned key now exists on R2 ----
$after = New-Object System.Collections.Generic.HashSet[string]
$afterDirs = New-Object System.Collections.Generic.HashSet[string]
$checkPids = @(@($upload.ProductID) + @($r2Copies.ProductID) | Where-Object { $_ } | Select-Object -Unique)
foreach ($f in @(rclone lsf $Remote -R --files-only --include ("{" + (($checkPids | ForEach-Object { "$_/**" }) -join ',') + "}"))) { [void]$after.Add("library/$f"); [void]$afterDirs.Add("library/" + $f.Split('/')[0] + "/") }
$result = @($upload | ForEach-Object { $_ | Select-Object *, @{ n = 'Result'; e = { if ($after.Contains($_.DestKey)) { 'ON_R2' } else { 'MISSING' } } } }) +
          @($r2Copies | ForEach-Object { $_ | Select-Object *, @{ n = 'Result'; e = { if ($afterDirs.Contains($_.DestKey)) { 'ON_R2' } else { 'MISSING' } } } })
$resultPath = Join-Path $LogDir "r2_missing_upload_result_$timestamp.csv"
$result | Export-Csv -LiteralPath $resultPath -NoTypeInformation -Encoding UTF8
$bad = @($result | Where-Object Result -ne 'ON_R2').Count
Write-Host ("rclone exit {0} | verified on R2: {1}/{2} | log: {3}" -f $code, ($result.Count - $bad), $result.Count, $resultPath)
if ($code -ne 0 -or $bad -or $copyFail) { Write-Warning 'Upload incomplete - index NOT published. Fix and re-run.'; exit 1 }
Publish-Index
Write-Host 'Done. Next (Google Sheet): Inventory Tools -> Refresh Meta feed.'
