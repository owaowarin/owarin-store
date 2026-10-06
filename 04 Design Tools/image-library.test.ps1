$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'image-library.ps1')

$fixture = Join-Path ([System.IO.Path]::GetTempPath()) ("owarin-image-library-" + [guid]::NewGuid().ToString('N'))
try {
    $ggb = Join-Path $fixture 'All Products\All - GGB\Guide'
    $mag = Join-Path $fixture 'All Products\All - MAGAZINE\Hobby'
    $folderBook = Join-Path $ggb 'Folder Book'
    New-Item -ItemType Directory -Path $ggb, $mag, $folderBook -Force | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $ggb 'Book A (1).jpg'), 'a1')
    [System.IO.File]::WriteAllText((Join-Path $ggb 'Book A (2).jpg'), 'a2')
    [System.IO.File]::WriteAllText((Join-Path $ggb 'Book-B.jpg'), 'b1')
    [System.IO.File]::WriteAllText((Join-Path $folderBook 'cover.jpg'), 'f1')
    [System.IO.File]::WriteAllText((Join-Path $mag 'Magazine A.jpg'), 'm1')

    $cache = Join-Path $fixture 'cache.json'
    $first = Get-ImageInventory -ProjectRoot $fixture -CachePath $cache -RefreshHashes
    if ($first.FileCount -ne 5 -or $first.Hashed -ne 5) { throw 'Initial inventory/hash count failed.' }
    $second = Get-ImageInventory -ProjectRoot $fixture -CachePath $cache -RefreshHashes
    if ($second.CacheReused -ne 5 -or $second.Hashed -ne 0) { throw 'Cache reuse failed.' }
    $changedPath = Join-Path $ggb 'Book A (1).jpg'
    $oldTime = (Get-Item -LiteralPath $changedPath).LastWriteTimeUtc
    $oldHash = ($second.Files | Where-Object FileName -eq 'Book A (1).jpg').SHA256
    [IO.File]::WriteAllText($changedPath, 'b1')
    (Get-Item -LiteralPath $changedPath).LastWriteTimeUtc = $oldTime
    $strict = Get-ImageInventory -ProjectRoot $fixture -CachePath $cache -ForceRehash
    if ($strict.Hashed -ne 5 -or ($strict.Files | Where-Object FileName -eq 'Book A (1).jpg').SHA256 -eq $oldHash) { throw 'ForceRehash trusted same-size/same-time cached bytes.' }

    $exact = Resolve-ImageProducts -Rows @([pscustomobject]@{
        SourceTab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; ProductID = 'P1'; ItemName = 'Book A'; Type = 'Guide'
    }) -Inventory $second
    if (@($exact.Rows | Where-Object Status -eq 'MAPPED').Count -ne 2) { throw 'Exact multi-page match failed.' }

    $suggestion = Resolve-ImageProducts -Rows @([pscustomobject]@{
        SourceTab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; ProductID = 'P2'; ItemName = 'Book B'; Type = 'Guide'
    }) -Inventory $second
    if ($suggestion.Rows[0].Status -ne 'SUGGESTED-MATCH') { throw 'Normalized name was incorrectly authorized.' }

    $bindingsPath = Join-Path $fixture 'bindings.csv'
    @([pscustomobject]@{
        SourceTab = 'GAME GUIDE BOOKS'; ProductID = 'P2'; ItemName = 'Book B'; Type = 'Guide'
        RootName = 'All - GGB'; Relative = 'Guide\Book-B.jpg'; SHA256 = (Get-FileHash -LiteralPath (Join-Path $ggb 'Book-B.jpg') -Algorithm SHA256).Hash
    }) | Export-Csv -LiteralPath $bindingsPath -NoTypeInformation -Encoding UTF8
    $bound = Resolve-ImageProducts -Rows @(
        [pscustomobject]@{ SourceTab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; ProductID = 'P2'; ItemName = 'Book B'; Type = 'Guide' },
        [pscustomobject]@{ SourceTab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; ProductID = 'P4'; ItemName = 'Book-B'; Type = 'Guide' }
    ) -Inventory $second -BindingsPath $bindingsPath
    if ($bound.Rows[0].Status -ne 'MAPPED' -or $bound.Rows[1].Status -ne 'NO-FILES') { throw 'Bound image was borrowed by another Product ID.' }
    $stale = Resolve-ImageProducts -Rows @([pscustomobject]@{
        SourceTab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; ProductID = 'P2'; ItemName = 'Changed title'; Type = 'Guide'
    }) -Inventory $second -BindingsPath $bindingsPath
    if ($stale.Rows[0].Status -ne 'STALE-BINDING') { throw 'Changed Sheet identity did not invalidate binding.' }
    $routed = Resolve-ImageProducts -Rows @([pscustomobject]@{
        SourceTab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; ProductID = 'P5'; ItemName = 'Book A'; Type = 'SPECIAL TECHNIC'
    }) -Inventory $second
    if ($routed.Rows[0].Status -ne 'NO-FILES') { throw 'Type route accepted an image outside its folder.' }
    [IO.File]::WriteAllText((Join-Path $ggb 'Book-B.jpg'), 'changed')
    try {
        Resolve-ImageProducts -Rows @([pscustomobject]@{
            SourceTab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; ProductID = 'P2'; ItemName = 'Book B'; Type = 'Guide'
        }) -Inventory $second -BindingsPath $bindingsPath | Out-Null
        throw 'Changed bound image was accepted.'
    } catch {
        if ($_.Exception.Message -eq 'Changed bound image was accepted.') { throw }
    }

    $folder = Resolve-ImageProducts -Rows @([pscustomobject]@{
        SourceTab = 'GAME GUIDE BOOKS'; RootName = 'All - GGB'; ProductID = 'P3'; ItemName = 'Folder Book'; Type = 'Guide'
    }) -Inventory $second -AllowFolderFallback
    if ($folder.Rows[0].Status -ne 'MAPPED' -or $folder.Rows[0].Note -ne 'exact product-folder fallback') { throw 'Folder fallback failed.' }

    $ggbCsv = Join-Path $fixture 'ggb.csv'
    $magCsv = Join-Path $fixture 'mag.csv'
    @([pscustomobject]@{ 'Item name' = 'Book A'; 'Product ID' = 'P1'; Status = 'Instock'; Type = 'Guide' }) |
        Export-Csv -LiteralPath $ggbCsv -NoTypeInformation -Encoding UTF8
    @([pscustomobject]@{ 'Item name' = 'Magazine A'; 'Product ID' = 'M1'; Status = 'Sold'; Type = 'Hobby' }) |
        Export-Csv -LiteralPath $magCsv -NoTypeInformation -Encoding UTF8
    $logDir = Join-Path $fixture 'logs'
    New-Item -ItemType Directory -Path $logDir | Out-Null
    $exporter = Join-Path $PSScriptRoot 'export-instock-snapshot.ps1'
    $shell = (Get-Process -Id $PID).Path
    $baseArgs = @('-NoProfile', '-File', $exporter, '-GgbCsv', $ggbCsv, '-MagazineCsv', $magCsv,
        '-ProjectRoot', $fixture, '-LogDir', $logDir, '-CachePath', $cache)

    $badGgbCsv = Join-Path $fixture 'bad-ggb.csv'
    @([pscustomobject]@{ 'Item name' = 'Missing Book'; 'Product ID' = 'P0'; Status = 'Instock'; Type = 'Guide' }) |
        Export-Csv -LiteralPath $badGgbCsv -NoTypeInformation -Encoding UTF8
    $badArgs = @('-NoProfile', '-File', $exporter, '-GgbCsv', $badGgbCsv, '-MagazineCsv', $magCsv,
        '-ProjectRoot', $fixture, '-LogDir', $logDir, '-CachePath', $cache)
    $badPreview = (& $shell @badArgs 2>&1 | Out-String)
    if ($LASTEXITCODE -eq 0) { throw "Preview with unresolved rows returned success: $badPreview" }

    $commitOutput = (& $shell @baseArgs -Commit 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0 -or $commitOutput -notmatch '(?m)^Manifest:\s*(.+)$') { throw "Exporter commit failed: $commitOutput" }
    $manifest = $Matches[1].Trim()
    $finalOutput = (& $shell @baseArgs -Finalize -Manifest $manifest 2>&1 | Out-String)
    $finalPathMatch = [regex]::Match($finalOutput, '(?m)^FINALIZED:\s*(.+)$')
    $finalLogMatches = [regex]::Matches($finalOutput, '(?m)^Log:\s*(.+)$')
    if ($LASTEXITCODE -ne 0 -or -not $finalPathMatch.Success -or $finalLogMatches.Count -eq 0) { throw "Exporter finalize failed: $finalOutput" }
    $finalPath = $finalPathMatch.Groups[1].Value.Trim()
    $finalLog = $finalLogMatches[$finalLogMatches.Count - 1].Groups[1].Value.Trim()
    $planned = Import-Csv -LiteralPath $finalLog | Select-Object -First 1
    $planned.Status = 'PLANNED'
    $planned | Export-Csv -LiteralPath $finalLog -NoTypeInformation -Encoding UTF8
    $retryOutput = (& $shell @baseArgs -Finalize -Manifest $manifest 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0 -or $retryOutput -notmatch [regex]::Escape("FINALIZED: $finalPath")) { throw "Finalize recovery failed: $retryOutput" }
    if ((Import-Csv -LiteralPath $finalLog | Select-Object -First 1).Status -ne 'COMPLETED-RECOVERED') { throw 'Finalize recovery did not repair the journal state.' }
    Write-Host 'image-library test passed'
} finally {
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
    $resolvedFixture = [IO.Path]::GetFullPath($fixture)
    if (-not $resolvedFixture.StartsWith($tempRoot + '\owarin-image-library-', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected fixture cleanup path.' }
    if (Test-Path -LiteralPath $resolvedFixture) { Remove-Item -LiteralPath $resolvedFixture -Recurse -Force }
}
