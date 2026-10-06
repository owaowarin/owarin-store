param([switch]$Check)
$ErrorActionPreference = 'Stop'
$exe = Join-Path $PSScriptRoot 'AIUsageWidget.exe'
if (-not (Test-Path -LiteralPath $exe)) { throw 'AIUsageWidget.exe not found. Run build.ps1 first.' }
if ($Check) {
    $report = Join-Path $PSScriptRoot 'self-test.txt'
    $process = Start-Process -FilePath $exe -ArgumentList ('--self-test "' + $report + '"') -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw 'Self-test failed.' }
    Get-Content -LiteralPath $report
} else {
    Start-Process -FilePath $exe
}
