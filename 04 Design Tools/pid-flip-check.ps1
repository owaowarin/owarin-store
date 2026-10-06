[CmdletBinding()]
param(
    [string]$SheetId = "16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0",
    [string]$GgbGid = "286842017",
    [string]$OutDir
)

# Read-only. Replicates _getPubCode / _getCondCode / _composeSKU from Code_v20.gs (lines ~1798-1887)
# to find every GAME GUIDE BOOKS row whose stored Product ID no longer matches what the current
# code would compute for it (a "PID time bomb" - flips silently the next time something touches it).

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutDir) { $OutDir = Join-Path $PSScriptRoot 'logs' }
if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

function Contains($haystack, $needle) { return $haystack.Contains($needle) }

function Get-PubCode($pubTextRaw) {
    $p = $pubTextRaw.ToString().ToUpper().Trim()
    if (Contains $p 'HERO ANIMATION') { return 'HA' }
    if ((Contains $p 'ANIMATE') -or $p -eq 'AM') { return 'AM' }
    if ((Contains $p 'VIBULKIJ') -or $p -eq 'VK') { return 'VK' }
    if ((Contains $p 'YK GROUP-2') -or $p -eq 'YK2') { return 'YK2' }
    if ((Contains $p 'YK GROUP') -or $p -eq 'YK') { return 'YK' }
    if (Contains $p 'VIDEO GAMES MAGAZINE') { return 'VGM' }
    if ((Contains $p 'VIDEO GAMES') -or $p -eq 'VG') { return 'VG' }
    if (Contains $p 'GAMGEMAG TOP SECRET') { return 'GTS' }
    if (Contains $p 'GAMGEMAG') { return 'GTS' }
    if (Contains $p 'GAMEMAG SPECIAL') { return 'GMS' }
    if ((Contains $p 'GAMEMAG') -or $p -eq 'GM') { return 'GM' }
    if ((Contains $p 'MAGIC GUIDE') -or $p -eq 'MG') { return 'MG' }
    if ((Contains $p 'CYBERTEAM') -or $p -eq 'CT') { return 'CT' }
    if ((Contains $p 'TONBO') -or $p -eq 'TB') { return 'TB' }
    if ((Contains $p 'UKI') -or $p -eq 'UK') { return 'UK' }
    if (Contains $p 'INSIDE') { return 'IN' }
    if (Contains $p 'BRIGHT') { return 'BR' }
    if (Contains $p 'FORWARD') { return 'FW' }
    if (Contains $p 'ZINE') { return 'ZN' }
    if (Contains $p 'CLEAR GAME') { return 'CG' }
    if (Contains $p 'FUN INFINITE') { return 'FI' }
    if ($p -eq 'SB' -or (Contains $p 'SB')) { return 'SB' }
    if (Contains $p 'GAMEBOY PROJECT') { return 'GBP' }
    if (Contains $p 'JOKER GAMES') { return 'JG' }
    if (Contains $p 'GAMEBEST') { return 'GB' }
    if (Contains $p 'FUTURE GAMER') { return 'FG' }
    if (Contains $p 'A GAME') { return 'AG' }
    if (Contains $p 'ALPHA') { return 'AL' }
    if (Contains $p 'BOMB') { return 'BM' }
    if (Contains $p 'DS PLAYER') { return 'DSP' }
    if (Contains $p 'DUMBO') { return 'DB' }
    if (Contains $p 'EXPERT GAMER') { return 'EG' }
    if (Contains $p 'FAMILY COMPUTER') { return 'FC' }
    if (Contains $p 'FG TEAM') { return 'FGT' }
    if (Contains $p 'GAME PLAYER') { return 'GP' }
    if (Contains $p 'GAME STAR') { return 'GS' }
    if (Contains $p 'GAMEGUIDE') { return 'GG' }
    if (Contains $p 'IX NEXT') { return 'IXN' }
    if (Contains $p 'JZ COMPANY') { return 'JZ' }
    if (Contains $p 'MEGA SPECIAL') { return 'MS' }
    if (Contains $p 'MILLENNIUM') { return 'ML' }
    if (Contains $p 'NU TRON') { return 'NT' }
    if (Contains $p 'PA.GROUP') { return 'PAG' }
    if (Contains $p 'PC-CD ROM') { return 'PCR' }
    if (Contains $p 'PLAY LITE') { return 'PL' }
    if (Contains $p 'PLAYSTATION') { return 'PS' }
    if (Contains $p 'PS PASS') { return 'PSP' }
    if (Contains $p 'PERFECT GUIDE') { return 'PGK' }
    if (Contains $p 'SPEED') { return 'SP' }
    if (Contains $p 'TAGTEAM') { return 'TGT' }
    if (Contains $p 'V.T.GROUP') { return 'VTG' }
    if (Contains $p 'VALENTINE') { return 'VLT' }
    if (Contains $p 'YEN PRINT') { return 'YP' }
    if (Contains $p 'DEX EXPRESS') { return 'DEX' }
    if (Contains $p 'GAME EXPRESS') { return 'GEX' }
    if (Contains $p 'TANABAN') { return 'TBP' }
    if (Contains $p 'LUCKPIM') { return 'LP' }
    if (Contains $p 'KADOKAWA') { return 'KDK' }
    if (Contains $p 'GOLDEN GROUP') { return 'GLD' }
    if (Contains $p 'EASY GAMER') { return 'EAG' }
    if (Contains $p 'ENIX') { return 'EN' }
    if (Contains $p 'ELISE') { return 'ELS' }
    if (Contains $p 'YOEI') { return 'YE' }
    if (Contains $p 'KOE') { return 'KOE' }
    if ($p -eq 'APT' -or (Contains $p 'APT')) { return 'APT' }
    return ''
}

function Get-CondCode($c) {
    $cc = $c.ToString().ToUpper().Trim()
    if ($cc -in @('S','A','B','C','D')) { return $cc }
    return ''
}

# ---- fetch live sheet ----
$url = "https://docs.google.com/spreadsheets/d/$SheetId/gviz/tq?tqx=out:csv&gid=$GgbGid"
Write-Host "Fetching live sheet: $url"
$resp = Invoke-WebRequest -Uri $url -UseBasicParsing
$tmpCsv = Join-Path $env:TEMP 'owarin_pidflip_ggb.csv'
[System.IO.File]::WriteAllText($tmpCsv, $resp.Content, [System.Text.Encoding]::UTF8)
$rows = Import-Csv -LiteralPath $tmpCsv
Write-Host ("Rows read: {0}" -f $rows.Count)

$pidRegex = [regex]'^OWA-GGB([A-Za-z0-9])(\d{3})(.*)$'
$mismatches = New-Object System.Collections.Generic.List[object]
$checked = 0
foreach ($r in $rows) {
    $productId = $r.'Product ID'
    if ([string]::IsNullOrWhiteSpace($productId)) { continue }
    $m = $pidRegex.Match($productId)
    if (-not $m.Success) { continue }
    $checked++
    $catLetter = $m.Groups[1].Value
    $gameNum   = $m.Groups[2].Value
    $actualSuffix = $m.Groups[3].Value

    $pubCode  = Get-PubCode $r.Publisher
    $condCode = Get-CondCode $r.Condition
    $stockCode = 'N00'
    $title = $r.'Item name'
    $rm = [regex]::Match($title, 'RESTOCK-(\d+)', 'IgnoreCase')
    if ($rm.Success) {
        $rn = $rm.Groups[1].Value
        $stockCode = 'R' + $(if ($rn.Length -eq 1) { '0' + $rn } else { $rn })
    }
    $specCode = if ($title.Contains('สีทั้งเล่ม')) { 'FC' } else { '' }
    $expectedSuffix = $pubCode + $condCode + $stockCode + $specCode

    if ($expectedSuffix -ne $actualSuffix) {
        $mismatches.Add([pscustomobject]@{
            ProductID = $productId
            ItemName  = $title
            Publisher = $r.Publisher
            Condition = $r.Condition
            Status    = $r.Status
            ActualSuffix   = $actualSuffix
            ExpectedSuffix = $expectedSuffix
            ComputedPID    = ("OWA-GGB" + $catLetter + $gameNum + $expectedSuffix)
        })
    }
}

Write-Host ("Checked: {0}" -f $checked)
Write-Host ("Mismatches (PID time bombs): {0}" -f $mismatches.Count)

$outPath = Join-Path $OutDir 'pid-flip-mismatches_raw.csv'
$mismatches | Export-Csv -LiteralPath $outPath -NoTypeInformation -Encoding UTF8
Write-Host "Raw mismatch list written: $outPath"
