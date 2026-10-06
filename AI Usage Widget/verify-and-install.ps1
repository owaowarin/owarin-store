$ErrorActionPreference = 'Stop'
$release = Join-Path $PSScriptRoot 'release'
$exe = Join-Path $release 'AIUsageWidget.exe'
$report = Join-Path $release 'codex-live-check.json'
$check = Start-Process -FilePath $exe -ArgumentList ('--probe-codex "' + $report + '"') -WindowStyle Hidden -PassThru -Wait
if ($check.ExitCode -ne 0) {
    if (Test-Path -LiteralPath ($report + '.error')) { Get-Content -LiteralPath ($report + '.error') }
    throw 'Actual Codex quota read failed; installation not attempted.'
}
$usage = Get-Content -Raw -LiteralPath $report | ConvertFrom-Json
if ($usage.provider -ne 'codex' -or $usage.version -ne 2) { throw 'Unexpected quota response.' }
$usage.rows | Select-Object label,@{Name='RemainingPercent';Expression={100-$_.usedPercent}},resetsAt
$installed = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs\AIUsageWidget\2.0.0'
$targets = @((Join-Path $PSScriptRoot 'AIUsageWidget.exe'),(Join-Path $installed 'AIUsageWidget.exe'))
foreach ($widgetProcess in @(Get-Process -Name AIUsageWidget -ErrorAction SilentlyContinue)) {
    if ($widgetProcess.Path -and $targets -contains $widgetProcess.Path) {
        $widgetProcess.Kill()
        $widgetProcess.WaitForExit(5000) | Out-Null
    }
}
$setup = Start-Process -FilePath (Join-Path $release 'AIUsageWidget-Setup.exe') -ArgumentList '--install-quiet' -WindowStyle Hidden -PassThru -Wait
if ($setup.ExitCode -ne 0) { throw 'Installer failed; see %TEMP%\ai-usage-setup-error.txt.' }
$expected = (Get-FileHash -LiteralPath $exe).Hash
if ((Get-FileHash -LiteralPath (Join-Path $installed 'AIUsageWidget.exe')).Hash -ne $expected) { throw 'Installed binary verification failed.' }
$hostManifest = Get-Content -Raw -LiteralPath (Join-Path $installed 'native-host.json') | ConvertFrom-Json
if ($hostManifest.allowed_origins[0] -ne 'chrome-extension://nbfbbnnagaajnbhbdljbpncfdgnhfabe/') { throw 'Incorrect native host registration.' }
Copy-Item -LiteralPath $exe -Destination (Join-Path $PSScriptRoot 'AIUsageWidget.exe') -Force
Copy-Item -LiteralPath (Join-Path $release 'AIUsageWidget-Portable.zip') -Destination (Join-Path $PSScriptRoot 'AIUsageWidget-Portable.zip') -Force
Write-Output ('Installed and verified: ' + $installed)
Write-Output 'Native connector registered only for the expected extension. Desktop shortcut updated.'
