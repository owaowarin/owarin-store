<#
  Read-only helper for fbcat-image-check.py (S1).
  Runs image-library.ps1's strict matcher (Get-ImageInventory / Resolve-ImageProducts)
  against the live Instock rows and writes one CSV row per (ProductID, Page).
  No AllowFolderFallback / AllowUniqueNormalized -- exact-name match only, per
  IMAGE-LIBRARY-RULES.md #3 ("filename must match Item name letter for letter").
#>
param(
    [Parameter(Mandatory)] [string]$InstockRowsCsv,
    [Parameter(Mandatory)] [string]$OutCsv,
    [string]$CachePath
)
$ErrorActionPreference = 'Stop'

# Dot-source via an explicitly-UTF8-decoded scriptblock, not the raw file: image-library.ps1
# has no BOM, so Windows PowerShell 5.1's file-encoding auto-detect mis-reads its Thai
# literals (mojibake) when dot-sourced directly -- see IMAGE-LIBRARY-RULES.md #6.
$libPath = Join-Path $PSScriptRoot 'image-library.ps1'
$libSource = [System.IO.File]::ReadAllText($libPath, [System.Text.Encoding]::UTF8)
. ([scriptblock]::Create($libSource))

$root = Split-Path -Parent $PSScriptRoot
$bindingsPath = Join-Path $PSScriptRoot 'image-bindings.csv'
$inventory = Get-ImageInventory -ProjectRoot $root -CachePath $CachePath
$rows = Import-Csv -LiteralPath $InstockRowsCsv
$resolved = Resolve-ImageProducts -Rows $rows -Inventory $inventory -BindingsPath $bindingsPath

$resolved.Rows |
    Select-Object SourceTab, ProductID, ItemName, Type, Status, Note, Relative, FullPath, Page, Extension, Bytes |
    Export-Csv -LiteralPath $OutCsv -NoTypeInformation -Encoding UTF8
