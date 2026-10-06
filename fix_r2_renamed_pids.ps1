# ============================================================================
#  OWARIN STORE - fix images for Product IDs that were renumbered in the sheet
#  Run in PowerShell on this PC.  Read the WARNING before running step 4.
#  Created 2026-08-31.
# ============================================================================
#
#  What it does
#    1. checks rclone and the r2 remote
#    2. checks that every OLD folder exists and every NEW folder is still empty
#    3. server-side copies library/<OLD>/  ->  library/<NEW>/   (nothing is deleted)
#    4. rebuilds meta/images.csv from the real bucket contents and uploads it
#       WARNING: step 4 REPLACES meta/images.csv on R2. A dated backup is taken
#       first, but do not run step 4 if a copy in step 3 failed.
#
#  After this script: bump ?v=3 to ?v=4 in R2 IMAGES!E2, then run
#  "FB Album Auto-Post > Retry ERROR rows only" and rebuild the Shopee file.
# ============================================================================

$ErrorActionPreference = 'Stop'
$Bucket = 'owarin-images'
$Store  = 'C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE'

$Pairs = @(
  @{ old = 'OWA-GGBG045GMSAN00'; new = 'OWA-GGBG045GMSCN00'; name = 'GAMEMAG SPECIAL vol 41' },
  @{ old = 'OWA-GGBG064GMAN00';  new = 'OWA-GGBG138GTSAN00'; name = 'GTS - Bust A Move 2' },
  @{ old = 'OWA-GGBG065GMAN00';  new = 'OWA-GGBG139GTSAN00'; name = 'GTS - Castlevania Curse of Darkness' },
  @{ old = 'OWA-GGBG085GMCN00';  new = 'OWA-GGBG137GTSCN00'; name = 'GTS - Winning Eleven 4' }
)

# --- 1) rclone + remote -----------------------------------------------------
Write-Host "`n[1/5] checking rclone ..." -ForegroundColor Cyan
if (-not (Get-Command rclone -ErrorAction SilentlyContinue)) {
  Write-Host "rclone is not installed. Run:  winget install Rclone.Rclone" -ForegroundColor Red
  exit 1
}
rclone version | Select-Object -First 1
if ((rclone listremotes) -notcontains 'r2:') {
  Write-Host "remote 'r2' is not configured. Double-click r2-setup.bat once (it configures the remote), then run this again." -ForegroundColor Red
  exit 1
}
rclone lsf "r2:$Bucket" --max-depth 1 | Out-Null
Write-Host "      rclone ok, bucket $Bucket reachable" -ForegroundColor Green

# --- 2) pre-flight ----------------------------------------------------------
Write-Host "`n[2/5] checking the 4 folders ..." -ForegroundColor Cyan
$stop = $false
foreach ($p in $Pairs) {
  $oldFiles = @(rclone lsf "r2:$Bucket/library/$($p.old)" 2>$null)
  $newFiles = @(rclone lsf "r2:$Bucket/library/$($p.new)" 2>$null)
  Write-Host ("      {0} -> {1}   old={2} file(s)  new={3} file(s)   {4}" -f $p.old, $p.new, $oldFiles.Count, $newFiles.Count, $p.name)
  if ($oldFiles.Count -eq 0) { Write-Host "        [ERROR] source folder is empty" -ForegroundColor Red; $stop = $true }
  if ($newFiles.Count -gt 0) { Write-Host "        [SKIP]  target already has files - will not overwrite" -ForegroundColor Yellow }
}
if ($stop) { Write-Host "`nstopped - fix the errors above first" -ForegroundColor Red; exit 1 }

# --- 3) copy ----------------------------------------------------------------
Write-Host "`n[3/5] copying (server-side, nothing is deleted) ..." -ForegroundColor Cyan
foreach ($p in $Pairs) {
  if (@(rclone lsf "r2:$Bucket/library/$($p.new)" 2>$null).Count -gt 0) { continue }
  Write-Host "      $($p.old) -> $($p.new)"
  rclone copy "r2:$Bucket/library/$($p.old)" "r2:$Bucket/library/$($p.new)"
  if ($LASTEXITCODE -ne 0) { Write-Host "        [ERROR] copy failed" -ForegroundColor Red; exit 1 }
}

# --- 4) verify --------------------------------------------------------------
Write-Host "`n[4/5] verifying ..." -ForegroundColor Cyan
$bad = 0
foreach ($p in $Pairs) {
  $n = @(rclone lsf "r2:$Bucket/library/$($p.new)").Count
  Write-Host ("      {0}  {1} file(s)" -f $p.new, $n)
  if ($n -eq 0) { $bad++ }
}
if ($bad -gt 0) { Write-Host "`n$bad folder(s) still empty - stopping before touching images.csv" -ForegroundColor Red; exit 1 }

# --- 5) rebuild + upload meta/images.csv ------------------------------------
Write-Host "`n[5/5] rebuilding meta/images.csv from the bucket ..." -ForegroundColor Cyan
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
rclone copyto "r2:$Bucket/meta/images.csv" "r2:$Bucket/meta/images-backup-$stamp.csv"
Write-Host "      backup: meta/images-backup-$stamp.csv" -ForegroundColor Green

$files  = rclone lsf "r2:$Bucket/library" -R --files-only
$counts = $files | ForEach-Object { ($_ -split '/')[0] } | Where-Object { $_ -like 'OWA-*' } | Group-Object -NoElement
$rows   = @('pid,n') + ($counts | ForEach-Object { "$($_.Name),$($_.Count)" })

$csv = Join-Path $Store '_r2_upload\images.csv'
[System.IO.File]::WriteAllLines($csv, $rows)
Write-Host "      wrote $csv  ($($rows.Count - 1) products)" -ForegroundColor Green

if ($rows.Count -lt 1700) {
  Write-Host "      [ERROR] only $($rows.Count - 1) products - that looks wrong, NOT uploading" -ForegroundColor Red
  exit 1
}
rclone copyto "$csv" "r2:$Bucket/meta/images.csv"
Write-Host "      uploaded to r2:$Bucket/meta/images.csv" -ForegroundColor Green

Write-Host "`nDONE." -ForegroundColor Green
Write-Host "Next, in the Google Sheet:"
Write-Host "  1. tab R2 IMAGES, cell E2 - change ?v=3 to ?v=4 and press Enter"
Write-Host "  2. Inventory Tools > FB Album Auto-Post > Retry ERROR rows only"
Write-Host "  3. re-export R2 IMAGES.csv and rebuild the Shopee file"
