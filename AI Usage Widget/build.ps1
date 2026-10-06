$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw '.NET Framework C# compiler not found.' }
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Path '.\release' -Force | Out-Null
    $sources = @('Widget.cs','Data.cs','CodexSource.cs','NativeHost.cs','Tests.cs')
    $common = @('/nologo','/platform:anycpu','/optimize+','/codepage:65001','/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:System.Web.Extensions.dll')
    & $compiler @common /target:winexe /win32manifest:app.manifest /out:release\AIUsageWidget.exe @sources
    if ($LASTEXITCODE -ne 0) { throw 'Widget build failed.' }
    & $compiler @common /target:exe /out:release\AIUsageBridge.exe @sources
    if ($LASTEXITCODE -ne 0) { throw 'Native host build failed.' }
    Copy-Item -LiteralPath 'README.md' -Destination 'release\README.md' -Force
    Copy-Item -LiteralPath 'Chrome Connector' -Destination 'release' -Recurse -Force
    Compress-Archive -LiteralPath 'release\AIUsageWidget.exe','release\AIUsageBridge.exe','release\README.md','release\Chrome Connector' -DestinationPath 'release\AIUsageWidget-Portable.zip' -Force
    & $compiler @common /target:winexe /out:release\AIUsageWidget-Setup.exe /reference:System.IO.Compression.dll /reference:Microsoft.CSharp.dll /resource:release\AIUsageWidget-Portable.zip,app.zip Setup.cs
    if ($LASTEXITCODE -ne 0) { throw 'Installer build failed.' }
    Write-Host 'Built release\AIUsageWidget.exe, AIUsageWidget-Setup.exe, and Portable.zip'
} finally { Pop-Location }
