$script:ImageLibraryExtensions = @('.jpg', '.jpeg', '.png', '.webp')
$script:ImageLibraryPageSuffix = [regex]'^(?<item>.+) \((?<n>\d+)\)$'
$script:ImageLibraryStripPattern = (@('：', '/', '／', '｜', '×', '⨯', '・', ',', '.', "'", '-', '–', '—', '_', '&', '+', '(', ')') |
    ForEach-Object { [regex]::Escape($_) }) -join '|'
$script:ImageTypeRoutes = @{
    "GAME GUIDE BOOKS`0SPECIAL TECHNIC" = 'GGB - SPECIAL TECHNIC'
    "GAME GUIDE BOOKS`0TONBO MAGAZINE CHEAT & CODE" = 'GGB - TONBO MAGAZINE รวมบทสรุป'
}

function Get-ImageNormalizedName {
    param([Parameter(Mandatory)] [string]$Name)
    [regex]::Replace(($Name.ToLowerInvariant() -replace '\s', ''), $script:ImageLibraryStripPattern, '')
}

function Get-ImageTextSha256 {
    param([Parameter(Mandatory)] [string[]]$Lines)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes(($Lines -join "`n"))
        ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '')
    } finally {
        $sha.Dispose()
    }
}

function Get-ImageInventory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$ProjectRoot,
        [string]$CachePath,
        [switch]$RefreshHashes,
        [switch]$ForceRehash
    )

    $allProducts = Join-Path $ProjectRoot 'All Products'
    $roots = @('All - GGB', 'All - MAGAZINE')
    $rootSignature = Get-ImageTextSha256 @((Resolve-Path -LiteralPath $allProducts -ErrorAction Stop).Path, 'image-library-v2')
    $cacheEntries = @{}
    if ($CachePath -and (Test-Path -LiteralPath $CachePath -PathType Leaf)) {
        try {
            $cache = Get-Content -LiteralPath $CachePath -Raw | ConvertFrom-Json
            if ($cache.Schema -eq 2 -and $cache.RootSignature -ceq $rootSignature -and $cache.Entries) {
                foreach ($property in $cache.Entries.PSObject.Properties) { $cacheEntries[$property.Name] = $property.Value }
            }
        } catch {
            Write-Warning "Ignoring unreadable image cache: $CachePath"
        }
    }

    $files = New-Object System.Collections.Generic.List[object]
    $reused = 0
    $hashed = 0
    foreach ($rootName in $roots) {
        $root = Join-Path $allProducts $rootName
        if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw "Master root not found: $root" }
        $resolvedRoot = (Resolve-Path -LiteralPath $root).Path.TrimEnd('\')
        foreach ($file in Get-ChildItem -LiteralPath $resolvedRoot -File -Recurse -Force -ErrorAction Stop) {
            $extension = $file.Extension.ToLowerInvariant()
            if ($script:ImageLibraryExtensions -notcontains $extension) { continue }
            if (($file.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw "Reparse-point image is not allowed: $($file.FullName)"
            }
            if (-not $file.FullName.StartsWith($resolvedRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Image escaped the configured root: $($file.FullName)"
            }
            $relative = $file.FullName.Substring($resolvedRoot.Length + 1)
            $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
            $match = $script:ImageLibraryPageSuffix.Match($baseName)
            $sourceStem = if ($match.Success) { $match.Groups['item'].Value } else { $baseName }
            $position = if ($match.Success) { [int]$match.Groups['n'].Value } else { 1 }
            $key = "$rootName|$relative"
            $sha256 = ''
            $cached = $cacheEntries[$key]
            $unchanged = $cached -and [long]$cached.Bytes -eq $file.Length -and [long]$cached.ModifiedUtcTicks -eq $file.LastWriteTimeUtc.Ticks
            if ($unchanged -and -not $ForceRehash) {
                $sha256 = [string]$cached.SHA256
                $reused++
            }
            if ($ForceRehash -or ($RefreshHashes -and -not $sha256)) {
                $beforeLength = $file.Length
                $beforeTicks = $file.LastWriteTimeUtc.Ticks
                $sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
                $after = Get-Item -LiteralPath $file.FullName
                if ($after.Length -ne $beforeLength -or $after.LastWriteTimeUtc.Ticks -ne $beforeTicks) {
                    throw "Image changed while hashing: $($file.FullName)"
                }
                $hashed++
            }
            $files.Add([pscustomobject]@{
                RootName = $rootName; FullPath = $file.FullName; Relative = $relative; FileName = $file.Name
                SourceStem = $sourceStem; NormalizedStem = (Get-ImageNormalizedName $sourceStem)
                Position = $position; Extension = $extension; ParentName = $file.Directory.Name
                ParentRelative = $file.Directory.FullName.Substring($resolvedRoot.Length).TrimStart('\')
                Bytes = $file.Length; ModifiedUtcTicks = $file.LastWriteTimeUtc.Ticks; SHA256 = $sha256
            })
        }
    }

    if ($CachePath) {
        $entries = [ordered]@{}
        foreach ($file in $files) {
            $entries["$($file.RootName)|$($file.Relative)"] = [ordered]@{
                Bytes = $file.Bytes; ModifiedUtcTicks = [string]$file.ModifiedUtcTicks; SHA256 = $file.SHA256
            }
        }
        $cacheDir = Split-Path -Parent $CachePath
        if ($cacheDir -and -not (Test-Path -LiteralPath $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir | Out-Null }
        $temporary = "$CachePath.tmp"
        [System.IO.File]::WriteAllText($temporary, ([ordered]@{ Schema = 2; RootSignature = $rootSignature; WrittenUtc = [DateTime]::UtcNow.ToString('o'); Entries = $entries } | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temporary -Destination $CachePath -Force
    }

    [pscustomobject]@{ Files = [object[]]$files; FileCount = $files.Count; CacheReused = $reused; Hashed = $hashed }
}

function Resolve-ImageProducts {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object[]]$Rows,
        [Parameter(Mandatory)] [object]$Inventory,
        [switch]$AllowFolderFallback,
        [switch]$AllowUniqueNormalized,
        [string]$BindingsPath = (Join-Path $PSScriptRoot 'image-bindings.csv')
    )

    $output = New-Object System.Collections.Generic.List[object]
    $byName = @{}
    $byFolder = @{}
    $byNormalized = @{}
    $filesByPath = @{}
    foreach ($file in $Inventory.Files) { $filesByPath["$($file.RootName)`0$($file.Relative)"] = $file }
    $bindings = @{}
    $reservedPaths = @{}
    if (-not (Test-Path -LiteralPath $BindingsPath -PathType Leaf) -and -not $PSBoundParameters.ContainsKey('BindingsPath')) {
        throw "Image bindings file is missing: $BindingsPath"
    }
    if (Test-Path -LiteralPath $BindingsPath -PathType Leaf) {
        $bindingRows = @(Import-Csv -LiteralPath $BindingsPath)
        foreach ($field in @('SourceTab', 'ProductID', 'ItemName', 'Type', 'RootName', 'Relative', 'SHA256')) {
            if ($bindingRows.Count -and $bindingRows[0].PSObject.Properties.Name -notcontains $field) { throw "Image binding is missing $field" }
        }
        foreach ($binding in $bindingRows) {
            $id = "$($binding.SourceTab)`0$($binding.ProductID)"
            $path = "$($binding.RootName)`0$($binding.Relative)"
            if (-not $binding.ProductID -or -not $binding.Relative -or $binding.SHA256 -notmatch '^[A-Fa-f0-9]{64}$' -or
                $binding.RootName -notin @('All - GGB', 'All - MAGAZINE') -or
                ($binding.SourceTab -eq 'GAME GUIDE BOOKS' -and $binding.RootName -ne 'All - GGB') -or
                ($binding.SourceTab -eq 'MAGAZINE' -and $binding.RootName -ne 'All - MAGAZINE') -or
                $binding.SourceTab -notin @('GAME GUIDE BOOKS', 'MAGAZINE')) { throw "Invalid image binding: $id" }
            if ($reservedPaths.ContainsKey($path)) { throw "Image binding path has multiple owners: $path" }
            $reservedPaths[$path] = $id
            if (-not $bindings.ContainsKey($id)) { $bindings[$id] = New-Object System.Collections.Generic.List[object] }
            $bindings[$id].Add($binding)
        }
    }
    foreach ($file in $Inventory.Files) {
        $nameKey = "$($file.RootName)`0$($file.SourceStem)"
        $folderKey = "$($file.RootName)`0$($file.ParentName)"
        $normalizedKey = "$($file.RootName)`0$($file.NormalizedStem)"
        if ($reservedPaths.ContainsKey("$($file.RootName)`0$($file.Relative)")) { continue }
        foreach ($pair in @(@($byName, $nameKey), @($byFolder, $folderKey), @($byNormalized, $normalizedKey))) {
            if (-not $pair[0].ContainsKey($pair[1])) { $pair[0][$pair[1]] = New-Object System.Collections.Generic.List[object] }
            $pair[0][$pair[1]].Add($file)
        }
    }
    $duplicates = @{}
    foreach ($group in ($Rows | Group-Object SourceTab, ItemName)) {
        if (@($group.Group.ProductID | Select-Object -Unique).Count -gt 1) { $duplicates[$group.Name] = $true }
    }
    foreach ($row in $Rows) {
        $base = [ordered]@{ SourceTab = $row.SourceTab; RootName = $row.RootName; ProductID = $row.ProductID; ItemName = $row.ItemName; Type = $row.Type }
        $id = "$($row.SourceTab)`0$($row.ProductID)"
        $typeRouteKey = "$($row.SourceTab)`0$($row.Type)"
        $typeRoute = $script:ImageTypeRoutes[$typeRouteKey]
        if ($bindings.ContainsKey($id)) {
            $bound = $bindings[$id].ToArray()
            if (@($bound | Where-Object { $_.ItemName -cne $row.ItemName -or $_.Type -cne $row.Type -or $_.RootName -cne $row.RootName }).Count) {
                $output.Add([pscustomobject]($base + @{ Status = 'STALE-BINDING'; Note = 'Sheet identity changed; review binding'; Relative = ''; FullPath = ''; Page = '' }))
                continue
            }
            foreach ($binding in $bound) {
                if ($typeRoute -and -not $binding.Relative.StartsWith($typeRoute + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
                    throw "Image binding is outside its type route: $($binding.ProductID)"
                }
                $path = "$($binding.RootName)`0$($binding.Relative)"
                $file = $filesByPath[$path]
                if (-not $file -or (Get-FileHash -LiteralPath $file.FullPath -Algorithm SHA256).Hash -cne $binding.SHA256) {
                    throw "Image binding missing or changed: $($binding.ProductID) / $($binding.Relative)"
                }
                $output.Add([pscustomobject]($base + @{
                    Status = 'MAPPED'; Note = 'Product ID binding'; Relative = $file.Relative; FullPath = $file.FullPath
                    Page = $file.Position; Extension = $file.Extension; Bytes = $file.Bytes; SHA256 = $binding.SHA256
                }))
            }
            continue
        }
        if ($duplicates.ContainsKey("$($row.SourceTab), $($row.ItemName)")) {
            $output.Add([pscustomobject]($base + @{ Status = 'AMBIGUOUS-SHEET-NAME'; Note = 'Same Item name has multiple Product IDs in this tab'; Relative = ''; FullPath = ''; Page = '' }))
            continue
        }
        $nameKey = "$($row.RootName)`0$($row.ItemName)"
        $matches = if ($byName.ContainsKey($nameKey)) { [object[]]$byName[$nameKey] } else { @() }
        $subtree = if ($row.PSObject.Properties.Name -contains 'SourceSubtree' -and $row.SourceSubtree) { ([string]$row.SourceSubtree).Trim('\') } else { $typeRoute }
        if ($subtree) { $matches = @($matches | Where-Object { $_.Relative.StartsWith($subtree + '\', [System.StringComparison]::OrdinalIgnoreCase) }) }
        $note = ''
        if ($matches.Count -eq 0 -and $AllowFolderFallback) {
            $folderKey = "$($row.RootName)`0$($row.ItemName)"
            $matches = if ($byFolder.ContainsKey($folderKey)) { [object[]]$byFolder[$folderKey] } else { @() }
            if ($subtree) { $matches = @($matches | Where-Object { $_.Relative.StartsWith($subtree + '\', [System.StringComparison]::OrdinalIgnoreCase) }) }
            if ($matches.Count) { $note = 'exact product-folder fallback' }
        }
        if ($matches.Count -eq 0) {
            $normalized = Get-ImageNormalizedName $row.ItemName
            $normalizedKey = "$($row.RootName)`0$normalized"
            $normalizedMatches = if ($byNormalized.ContainsKey($normalizedKey)) { [object[]]$byNormalized[$normalizedKey] } else { @() }
            if ($subtree) { $normalizedMatches = @($normalizedMatches | Where-Object { $_.Relative.StartsWith($subtree + '\', [System.StringComparison]::OrdinalIgnoreCase) }) }
            $sourceNames = @($normalizedMatches.SourceStem | Select-Object -Unique)
            if ($normalizedMatches.Count -and $sourceNames.Count -eq 1 -and $AllowUniqueNormalized) {
                $matches = $normalizedMatches
                $note = 'unique normalized filename fallback'
            } elseif ($normalizedMatches.Count) {
                $status = if ($sourceNames.Count -eq 1) { 'SUGGESTED-MATCH' } else { 'AMBIGUOUS-NORMALIZED' }
                $output.Add([pscustomobject]($base + @{ Status = $status; Note = "Normalized candidates: $($sourceNames -join ' | ')"; Relative = ''; FullPath = ''; Page = '' }))
                continue
            }
        }
        if ($matches.Count -eq 0) {
            $output.Add([pscustomobject]($base + @{ Status = 'NO-FILES'; Note = "No exact filename match under $($row.RootName)"; Relative = ''; FullPath = ''; Page = '' }))
            continue
        }
        $parents = @($matches.ParentRelative | Select-Object -Unique)
        if ($parents.Count -gt 1) {
            $output.Add([pscustomobject]($base + @{ Status = 'AMBIGUOUS-SOURCE'; Note = "Matching files exist in multiple folders: $($parents -join ' | ')"; Relative = ''; FullPath = ''; Page = '' }))
            continue
        }
        foreach ($match in ($matches | Sort-Object Position, FileName)) {
            $output.Add([pscustomobject]($base + @{
                Status = 'MAPPED'; Note = $note; Relative = $match.Relative; FullPath = $match.FullPath
                Page = $match.Position; Extension = $match.Extension; Bytes = $match.Bytes; SHA256 = $match.SHA256
            }))
        }
    }
    [pscustomobject]@{ Rows = [object[]]$output }
}

function Test-ImageManifest {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [object[]]$Rows, [ValidateSet('Instock', 'R2')] [string]$Mode = 'Instock')
    $issues = New-Object System.Collections.Generic.List[object]
    foreach ($group in ($Rows | Where-Object Status -eq 'MAPPED' | Group-Object ProductID)) {
        foreach ($duplicate in ($group.Group | Group-Object Page | Where-Object Count -gt 1)) {
            $issues.Add([pscustomobject]@{ Status = 'DUPLICATE-POSITION'; ProductID = $group.Name; Page = $duplicate.Name; Note = 'More than one image uses this position' })
        }
        if ($Mode -eq 'R2') {
            $positions = @($group.Group.Page | Sort-Object -Unique)
            if ($positions.Count -and (($positions[0] -ne 1) -or $positions[-1] -ne $positions.Count)) {
                $issues.Add([pscustomobject]@{ Status = 'POSITION-GAP'; ProductID = $group.Name; Page = ''; Note = "Positions are not contiguous: $($positions -join ', ')" })
            }
        }
    }
    foreach ($group in ($Rows | Where-Object Status -eq 'MAPPED' | Group-Object RootName, Relative | Where-Object { @($_.Group.ProductID | Select-Object -Unique).Count -gt 1 })) {
        $issues.Add([pscustomobject]@{ Status = 'DUPLICATE-SOURCE-OWNER'; ProductID = ($group.Group.ProductID -join ' | '); Page = ''; Note = $group.Name })
    }
    [object[]]$issues
}
