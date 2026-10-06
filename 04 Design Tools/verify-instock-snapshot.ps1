[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$SnapshotRoot,
    [Parameter(Mandatory)] [string]$Manifest,
    [string]$LogDir = (Join-Path $PSScriptRoot 'logs')
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $SnapshotRoot).Path.TrimEnd('\')
$rows = @(Import-Csv -LiteralPath (Resolve-Path -LiteralPath $Manifest).Path)
$expected = @{}
$issues = New-Object System.Collections.Generic.List[object]

foreach ($row in $rows) {
    $relative = $row.After -replace '^All Products\\Instock\\', ''
    $path = Join-Path $root $relative
    $expected[$path.ToLowerInvariant()] = [pscustomobject]@{
        Path = $path
        Bytes = [int64]$row.Bytes
        Hash = $row.SHA256.ToUpperInvariant()
        Source = Join-Path (Split-Path -Parent $root) ($row.Before -replace '^All Products\\', '')
    }
}

$actual = @(Get-ChildItem -File -Recurse -LiteralPath $root)
foreach ($file in $actual) {
    if (-not $expected.ContainsKey($file.FullName.ToLowerInvariant())) {
        $issues.Add([pscustomobject]@{ Kind = 'EXTRA'; Path = $file.FullName; Detail = 'Not in commit manifest' })
    }
}
foreach ($item in $expected.Values) {
    if (-not (Test-Path -LiteralPath $item.Path -PathType Leaf)) {
        $issues.Add([pscustomobject]@{ Kind = 'MISSING'; Path = $item.Path; Detail = 'Manifest file missing' }); continue
    }
    $info = Get-Item -LiteralPath $item.Path
    if ([int64]$info.Length -ne $item.Bytes) {
        $issues.Add([pscustomobject]@{ Kind = 'BYTE_MISMATCH'; Path = $item.Path; Detail = "$($info.Length) vs $($item.Bytes)" }); continue
    }
    $hash = (Get-FileHash -LiteralPath $item.Path -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($hash -ne $item.Hash) {
        $issues.Add([pscustomobject]@{ Kind = 'HASH_MISMATCH'; Path = $item.Path; Detail = "$hash vs $($item.Hash)" })
    }
    if (-not (Test-Path -LiteralPath $item.Source -PathType Leaf)) {
        $issues.Add([pscustomobject]@{ Kind = 'SOURCE_MISSING'; Path = $item.Source; Detail = 'Original source missing' }); continue
    }
    $sourceHash = (Get-FileHash -LiteralPath $item.Source -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($sourceHash -ne $item.Hash) {
        $issues.Add([pscustomobject]@{ Kind = 'SOURCE_CHANGED'; Path = $item.Source; Detail = "$sourceHash vs $($item.Hash)" })
    }
}

$roots = @(Get-ChildItem -Directory -LiteralPath $root | Select-Object -ExpandProperty Name)
foreach ($name in $roots) {
    if ($name -notin @('All - GGB', 'All - MAGAZINE')) {
        $issues.Add([pscustomobject]@{ Kind = 'UNEXPECTED_ROOT'; Path = Join-Path $root $name; Detail = 'Unexpected top-level directory' })
    }
}
foreach ($name in @('All - GGB', 'All - MAGAZINE')) {
    if ($name -notin $roots) {
        $issues.Add([pscustomobject]@{ Kind = 'MISSING_ROOT'; Path = Join-Path $root $name; Detail = 'Expected top-level directory missing' })
    }
}

$manifestBytes = ($rows | Measure-Object -Property Bytes -Sum).Sum
$actualBytes = ($actual | Measure-Object -Property Length -Sum).Sum
$status = if ($issues.Count -eq 0 -and $actual.Count -eq $rows.Count -and $actualBytes -eq $manifestBytes) { 'PASS' } else { 'FAIL' }
$log = Join-Path $LogDir ('instock_snapshot_verify_' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.csv')
$summary = [pscustomobject]@{ Kind = 'SUMMARY'; Path = $root; Detail = "Status=$status; ManifestFiles=$($rows.Count); ActualFiles=$($actual.Count); ManifestBytes=$manifestBytes; ActualBytes=$actualBytes; PlanHash=$($rows[0].PlanHash); Issues=$($issues.Count)" }
$summary | Export-Csv -LiteralPath $log -NoTypeInformation -Encoding UTF8
if ($issues.Count -gt 0) { $issues | Export-Csv -LiteralPath $log -NoTypeInformation -Encoding UTF8 -Append }

Write-Output "STATUS=$status"
Write-Output "MANIFEST_FILES=$($rows.Count) ACTUAL_FILES=$($actual.Count)"
Write-Output "MANIFEST_BYTES=$manifestBytes ACTUAL_BYTES=$actualBytes"
Write-Output "ISSUES=$($issues.Count)"
Write-Output "LOG=$((Resolve-Path $log).Path)"
if ($status -ne 'PASS') { exit 1 }
