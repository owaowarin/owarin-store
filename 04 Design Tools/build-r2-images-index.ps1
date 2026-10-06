[CmdletBinding()]
param(
    [switch]$Commit,
    [string]$LogDir,
    [string]$IndexPath
)

# Rebuilds the pid,n,ext image index (_r2_upload/images.csv / meta/images.csv on R2) by
# listing the real library/ prefix on R2 directly, instead of trusting the static file.
# n = number of distinct image positions (1.*, 2.*, ...), NOT raw file count - this matters
# because a few PIDs have the SAME position saved under two extensions (see ext resolution
# below), which would otherwise double-count them. ext = the file extension per position:
# one value ("jpg") when every position resolves to the same extension, or pipe-joined in
# position order ("png|jpg") when positions genuinely differ. When a single position has
# BOTH extensions present (a real duplicate on R2), jpg wins - confirmed 2026-09-13 against
# the two known cases (OWA-GGBD045BRBN00, OWA-GGBD049FWAN00) by comparing file size/date to
# the current source photo in All Products/All - GGB: the .jpg matches byte-for-byte and is
# the newer upload (2026-09-03), the .png is a stale leftover from 2026-08-29. Every such
# tie-break is listed in the dry-run report so a future case can be checked, not assumed.
# READ-ONLY against R2: the only rclone call in this script is `rclone lsf`. No sync/delete/
# purge/copy/copyto anywhere here. Default is dry-run: writes the rebuilt index to a temp
# file and a comparison report to logs/, and does NOT touch _r2_upload/images.csv.
# Pass -Commit to overwrite the real local index file (still no rclone write call - this
# only edits a local CSV; uploading it to R2's meta/ prefix is a separate, later step).

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $LogDir)    { $LogDir    = Join-Path $PSScriptRoot 'logs' }
if (-not $IndexPath) { $IndexPath = Join-Path $ProjectRoot '_r2_upload\images.csv' }
if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

Write-Host "Listing r2:owarin-images/library (rclone lsf, read-only)..."
$files = rclone lsf "r2:owarin-images/library" -R --files-only
if (-not $files) { Write-Error "rclone lsf returned nothing - aborting, not touching any file."; exit 1 }

# each line looks like: OWA-GGBA001YKAR01/1.jpg  ->  positions[pid][1] += 'jpg'
$positions = @{}   # pid -> @{ [int]n -> [System.Collections.Generic.List[string]] extensions seen }
$totalObjects = 0
$fileRegex = [regex]'^([^/]+)/(\d+)\.([A-Za-z0-9]+)$'
foreach ($line in $files) {
    $line = $line.Trim()
    if (-not $line) { continue }
    $m = $fileRegex.Match($line)
    if (-not $m.Success) { continue }
    $thisPid = $m.Groups[1].Value
    $n       = [int]$m.Groups[2].Value
    $ext     = $m.Groups[3].Value.ToLowerInvariant()
    if (-not $positions.ContainsKey($thisPid)) { $positions[$thisPid] = @{} }
    if (-not $positions[$thisPid].ContainsKey($n)) { $positions[$thisPid][$n] = New-Object System.Collections.Generic.List[string] }
    $positions[$thisPid][$n].Add($ext)
    $totalObjects++
}

# resolve each PID to n (distinct positions) + ext (one value, or pipe-joined per position)
$counts = @{}      # pid -> n
$exts   = @{}      # pid -> ext string as it will be written
$tieBreaks = New-Object System.Collections.Generic.List[object]
foreach ($p in $positions.Keys) {
    $posNums = $positions[$p].Keys | Sort-Object
    $resolvedExts = New-Object System.Collections.Generic.List[string]
    foreach ($pos in $posNums) {
        # @(...) forces an array even when Select-Object -Unique collapses to one item -
        # without it, PowerShell hands back a bare string and "[0]" indexes its first
        # CHARACTER instead of the first array element (silently truncates "jpg" to "j").
        $seen = @($positions[$p][$pos] | Select-Object -Unique)
        if ($seen.Count -gt 1) {
            $chosen = if ($seen -contains 'jpg') { 'jpg' } else { $seen[0] }
            $tieBreaks.Add([pscustomobject]@{ pid = $p; position = $pos; extensions_found = ($seen -join '+'); chosen = $chosen })
            $resolvedExts.Add($chosen)
        } else {
            $resolvedExts.Add($seen[0])
        }
    }
    $counts[$p] = $posNums.Count
    $distinctResolved = @($resolvedExts | Select-Object -Unique)
    $exts[$p] = if ($distinctResolved.Count -eq 1) { $distinctResolved[0] } else { $resolvedExts -join '|' }
}

$distinctPids = $counts.Keys.Count
Write-Host ("R2 library/ objects (files) : {0}" -f $totalObjects)
Write-Host ("R2 library/ distinct PIDs   : {0}" -f $distinctPids)
Write-Host ("Same-position ext tie-breaks: {0}" -f $tieBreaks.Count)

# ---- load existing static index for comparison ----
$existing = @{}
if (Test-Path -LiteralPath $IndexPath) {
    Import-Csv -LiteralPath $IndexPath | ForEach-Object { $existing[$_.pid] = [int]$_.n }
} else {
    Write-Warning "Existing index not found at $IndexPath - comparison will show everything as NEW."
}

$r2PidSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($k in $counts.Keys) { [void]$r2PidSet.Add($k) }
$existingPidSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($k in $existing.Keys) { [void]$existingPidSet.Add($k) }

$onR2NotInIndex = $counts.Keys   | Where-Object { -not $existingPidSet.Contains($_) } | Sort-Object
$inIndexNotOnR2 = $existing.Keys | Where-Object { -not $r2PidSet.Contains($_) }       | Sort-Object
$nMismatch      = $existing.Keys | Where-Object { $r2PidSet.Contains($_) -and $existing[$_] -ne $counts[$_] } | Sort-Object

Write-Host ""
Write-Host "=== Comparison vs existing index ($IndexPath) ==="
Write-Host ("Existing index PIDs           : {0}" -f $existing.Keys.Count)
Write-Host ("On R2 but missing from index  : {0}" -f $onR2NotInIndex.Count)
Write-Host ("In index but gone from R2     : {0}" -f $inIndexNotOnR2.Count)
Write-Host ("Same PID, different n         : {0}" -f $nMismatch.Count)

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

# ---- write rebuilt index: plain "pid,n,ext" CSV, no quoting, CRLF - same convention as the
#      existing file (Export-Csv would quote every field, which the original file does not) ----
$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("pid,n,ext`r`n")
foreach ($p in ($counts.Keys | Sort-Object)) { [void]$sb.Append("$p,$($counts[$p]),$($exts[$p])`r`n") }

if ($Commit) {
    [System.IO.File]::WriteAllText($IndexPath, $sb.ToString(), [System.Text.Encoding]::ASCII)
    Write-Host ""
    Write-Host "COMMIT: wrote rebuilt index to $IndexPath"
} else {
    $tempPath = Join-Path $env:TEMP "r2_images_index_rebuilt_$timestamp.csv"
    [System.IO.File]::WriteAllText($tempPath, $sb.ToString(), [System.Text.Encoding]::ASCII)
    Write-Host ""
    Write-Host "DRY-RUN: rebuilt index written to $tempPath (NOT touching $IndexPath)"
}

# ---- diagnostic report log (always written, quoted CSV is fine here) ----
$mixedPids = $exts.Keys | Where-Object { $exts[$_] -like '*|*' } | Sort-Object

$reportPath = Join-Path $LogDir "r2_index_ext_dryrun_$timestamp.csv"
$reportRows = New-Object System.Collections.Generic.List[object]
$reportRows.Add([pscustomobject]@{ check='total_objects';       pid=''; value=$totalObjects;          note='files under library/ via rclone lsf -R --files-only' })
$reportRows.Add([pscustomobject]@{ check='distinct_pids';       pid=''; value=$distinctPids;           note='rows the rebuilt pid,n,ext index will have' })
$reportRows.Add([pscustomobject]@{ check='mixed_ext_pids';      pid=''; value=$mixedPids.Count;        note='PIDs whose ext field contains | (differs by position)' })
$reportRows.Add([pscustomobject]@{ check='existing_index_pids'; pid=''; value=$existing.Keys.Count;    note=$IndexPath })
foreach ($p in $onR2NotInIndex) { $reportRows.Add([pscustomobject]@{ check='on_r2_not_in_index'; pid=$p; value=$counts[$p];   note='' }) }
foreach ($p in $inIndexNotOnR2) { $reportRows.Add([pscustomobject]@{ check='in_index_not_on_r2'; pid=$p; value=$existing[$p]; note='' }) }
foreach ($p in $nMismatch)      { $reportRows.Add([pscustomobject]@{ check='n_mismatch';         pid=$p; value="index=$($existing[$p]) r2=$($counts[$p])"; note='old index had no ext column, n mismatch here can be the position-vs-file-count fix' }) }
foreach ($p in $mixedPids)      { $reportRows.Add([pscustomobject]@{ check='mixed_ext_detail';   pid=$p; value="n=$($counts[$p]) ext=$($exts[$p])"; note='' }) }
foreach ($t in $tieBreaks)      { $reportRows.Add([pscustomobject]@{ check='same_position_tiebreak'; pid=$t.pid; value="position $($t.position): found [$($t.extensions_found)] -> chose $($t.chosen)"; note='both extensions physically exist at this position on R2 - not touched, index only' }) }
$reportRows | Export-Csv -LiteralPath $reportPath -NoTypeInformation -Encoding UTF8
Write-Host "Report written: $reportPath"
