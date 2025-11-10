<#
.SYNOPSIS
  Recalculates the filters panel version based on commit count and updates index.html.

.DESCRIPTION
  Version format: v1.00 + 0.01 per commit in the current branch.
  Example: 28 commits -> v1.28.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ProjectRoot {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  return Resolve-Path (Join-Path $scriptDir '..')
}

function Get-CommitCount {
  $output = git rev-list --count HEAD
  if (-not $LASTEXITCODE -eq 0) {
    throw "git rev-list failed with code $LASTEXITCODE"
  }
  return [int]($output.Trim())
}

function Format-Version([int]$commitCount) {
  $base = 1.0
  $increment = 0.01
  $value = $base + ($commitCount * $increment)
  return "v{0}" -f $value.ToString("0.00", [System.Globalization.CultureInfo]::InvariantCulture)
}

function Update-IndexFile([string]$indexPath, [string]$versionText) {
  if (-not (Test-Path $indexPath)) {
    throw "index.html not found at '$indexPath'"
  }

  $content = Get-Content $indexPath -Raw
  $pattern = '(?<=id="filters-version">)v\d+\.\d{2}(?=</span>)'

  if ($content -notmatch $pattern) {
    throw "Unable to locate filters version placeholder in index.html"
  }

  $updated = [System.Text.RegularExpressions.Regex]::Replace(
    $content,
    $pattern,
    $versionText
  )

  Set-Content -Path $indexPath -Value $updated -Encoding UTF8
}

try {
  $projectRoot = Get-ProjectRoot
  $indexPath = Join-Path $projectRoot 'index.html'

  $commitCount = Get-CommitCount
  $version = Format-Version -commitCount $commitCount

  Update-IndexFile -indexPath $indexPath -versionText $version

  Write-Host "Filters version updated to $version (commits: $commitCount)"
}
catch {
  Write-Error $_
  exit 1
}

