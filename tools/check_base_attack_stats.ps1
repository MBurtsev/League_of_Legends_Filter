<#
.SYNOPSIS
  Validates that all champions in cdragon cache contain base attack damage and speed stats.

.DESCRIPTION
  Scans data/cdragon_cache/*.bin.json, ensuring each champion has:
    - stats.attackdamage
    - stats.attackdamageperlevel
    - stats.attackspeed
    - stats.attackspeedperlevel
  Reports missing fields per champion.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..')
$championDir = Join-Path $projectRoot 'data/champion'

if (-not (Test-Path $championDir)) {
  throw "Champion data directory not found: $championDir"
}

$files = Get-ChildItem -Path $championDir -Filter '*_en.json'
if (-not $files) {
  throw "No champion JSON files found in $championDir"
}

$missing = @()

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
  $championProperty = $content.data.PSObject.Properties | Select-Object -First 1
  if (-not $championProperty) {
    $missing += [pscustomobject]@{
      Champion = $file.BaseName
      File = $file.Name
      Missing = 'data object'
    }
    continue
  }
  $championData = $championProperty.Value
  $championName = $championData.name
  $stats = $championData.stats

  if (-not $stats) {
    $missing += [pscustomobject]@{
      Champion = $championName
      File = $file.Name
      Missing = 'stats object'
    }
    continue
  }

  $fields = @(
    'attackdamage',
    'attackdamageperlevel',
    'attackspeed',
    'attackspeedperlevel'
  )

  foreach ($field in $fields) {
    if (-not ($stats.PSObject.Properties.Name -contains $field) -or $null -eq $stats.$field) {
      $missing += [pscustomobject]@{
        Champion = $championName
        File = $file.Name
        Missing = $field
      }
    }
  }
}

if ($missing.Count -eq 0) {
  Write-Host "All champions have base attack damage and speed stats." -ForegroundColor Green
  exit 0
}

Write-Host "Missing stats detected:" -ForegroundColor Yellow
$missing | Sort-Object Champion, Missing | Format-Table -AutoSize
exit 1

