# Script to check and analyze ability ranges using champion_meta.js
# This will extract Q, W, E, R ranges for all champions from the optimized metadata file

$projectRoot = Split-Path $PSScriptRoot -Parent
$metaPath = Join-Path $projectRoot "champion_meta.js"
$textEnPath = Join-Path $projectRoot "champion_text_en.js"
$outputFile = "ability_ranges_report.txt"

if (-not (Test-Path $metaPath)) {
    Write-Host "[ERROR] champion_meta.js not found at $metaPath" -ForegroundColor Red
    exit 1
}

$convertFromJsonParams = @{}
if ((Get-Command ConvertFrom-Json).Parameters.ContainsKey('Depth')) {
    $convertFromJsonParams['Depth'] = 100
}

Write-Host "Reading champion_meta.js..." -ForegroundColor Cyan
$metaRaw = Get-Content $metaPath -Raw -Encoding UTF8
$pattern = 'window\.LOL_CHAMPIONS_META\s*=\s*(\{.*\});'
$match = [System.Text.RegularExpressions.Regex]::Match($metaRaw, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
if (-not $match.Success) {
    Write-Host "[ERROR] Failed to locate window.LOL_CHAMPIONS_META block" -ForegroundColor Red
    exit 1
}

$metaJson = $match.Groups[1].Value
$metaData = $metaJson | ConvertFrom-Json @convertFromJsonParams

$championTexts = @{}
if (Test-Path $textEnPath) {
    Write-Host "Reading champion_text_en.js..." -ForegroundColor Cyan
    $textRaw = Get-Content $textEnPath -Raw -Encoding UTF8
    $textPattern = 'window\.LOL_CHAMPIONS_TEXT_EN\s*=\s*(\{.*\});'
    $textMatch = [System.Text.RegularExpressions.Regex]::Match($textRaw, $textPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($textMatch.Success) {
        $textJson = $textMatch.Groups[1].Value
        $championTexts = $textJson | ConvertFrom-Json @convertFromJsonParams
    } else {
        Write-Host "[WARN] English text payload was not found. Ability names will use IDs." -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] champion_text_en.js not found. Ability names will use IDs." -ForegroundColor Yellow
}

function Get-ChampionName {
    param($championId, $meta, $texts)
    if ($texts -and $texts.PSObject.Properties.Name -contains $championId) {
        return $texts.$championId.name
    }
    return $meta.id
}

function Get-SpellName {
    param($championId, $index, $meta, $texts)
    if ($texts -and $texts.PSObject.Properties.Name -contains $championId) {
        $spellTexts = $texts.$championId.spells
        if ($spellTexts -and $index -lt $spellTexts.Count) {
            return $spellTexts[$index].name
        }
    }
    $spellMeta = $meta.spells[$index]
    return $spellMeta.id
}

function Get-FirstRangeValue {
    param($spell)
    if (-not $spell -or -not $spell.range -or $spell.range.Count -eq 0) {
        return $null
    }
    return $spell.range[0]
}

function Normalize-RangeValue {
    param($value)
    if ($null -eq $value) { return 0 }
    if ($value -is [string] -and [string]::IsNullOrWhiteSpace($value)) { return 0 }
    try {
        return [int]([double]$value)
    } catch {
        return 0
    }
}

$results = @()
$championIds = $metaData.PSObject.Properties.Name | Sort-Object
$spellKeys = @('Q', 'W', 'E', 'R')

foreach ($championId in $championIds) {
    $champMeta = $metaData.$championId
    if (-not $champMeta -or -not $champMeta.spells) { continue }

    $record = [PSCustomObject]@{
        Champion = $championId
        Name = Get-ChampionName -championId $championId -meta $champMeta -texts $championTexts
        Q_Name = ""
        Q_Range = 0
        W_Name = ""
        W_Range = 0
        E_Name = ""
        E_Range = 0
        R_Name = ""
        R_Range = 0
    }

    for ($i = 0; $i -lt [Math]::Min(4, $champMeta.spells.Count); $i++) {
        $spell = $champMeta.spells[$i]
        $rangeValue = Get-FirstRangeValue $spell
        $spellName = Get-SpellName -championId $championId -index $i -meta $champMeta -texts $championTexts
        $propertyName = "{0}_Name" -f $spellKeys[$i]
        $propertyRange = "{0}_Range" -f $spellKeys[$i]
        $record.$propertyName = $spellName
        $record.$propertyRange = $rangeValue
    }

    $results += $record
}

$results = $results | Sort-Object Champion

Write-Host "`nAbility Ranges for All Champions" -ForegroundColor Cyan
Write-Host "=" * 100 -ForegroundColor Cyan

foreach ($champion in $results) {
    Write-Host "`n$($champion.Name) ($($champion.Champion))" -ForegroundColor Yellow
    Write-Host "  Q: $($champion.Q_Name) - Range: $($champion.Q_Range)" -ForegroundColor Green
    Write-Host "  W: $($champion.W_Name) - Range: $($champion.W_Range)" -ForegroundColor Green
    Write-Host "  E: $($champion.E_Name) - Range: $($champion.E_Range)" -ForegroundColor Green
    Write-Host "  R: $($champion.R_Name) - Range: $($champion.R_Range)" -ForegroundColor Green
}

$output = @()
$output += "Ability Ranges Report - Generated $(Get-Date)"
$output += "=" * 100
$output += ""

foreach ($champion in $results) {
    $output += "$($champion.Name) ($($champion.Champion))"
    $output += "  Q: $($champion.Q_Name) - Range: $($champion.Q_Range)"
    $output += "  W: $($champion.W_Name) - Range: $($champion.W_Range)"
    $output += "  E: $($champion.E_Name) - Range: $($champion.E_Range)"
    $output += "  R: $($champion.R_Name) - Range: $($champion.R_Range)"
    $output += ""
}

$output | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`n`nReport saved to: $outputFile" -ForegroundColor Cyan

Write-Host "`n`nPotential Issues (Unusual Ranges):" -ForegroundColor Red
Write-Host "=" * 100 -ForegroundColor Red

foreach ($champion in $results) {
    $issues = @()
    $qRange = Normalize-RangeValue $champion.Q_Range
    $wRange = Normalize-RangeValue $champion.W_Range
    $eRange = Normalize-RangeValue $champion.E_Range
    $rRange = Normalize-RangeValue $champion.R_Range

    if ($qRange -gt 5000) { $issues += "Q: $($champion.Q_Range) (map-wide?)" }
    if ($wRange -gt 5000) { $issues += "W: $($champion.W_Range) (map-wide?)" }
    if ($eRange -gt 5000) { $issues += "E: $($champion.E_Range) (map-wide?)" }
    if ($rRange -gt 5000) { $issues += "R: $($champion.R_Range) (map-wide?)" }

    if ($qRange -eq 0) { $issues += "Q: 0 (self-cast/melee?)" }
    if ($wRange -eq 0) { $issues += "W: 0 (self-cast/melee?)" }
    if ($eRange -eq 0) { $issues += "E: 0 (self-cast/melee?)" }
    if ($rRange -eq 0) { $issues += "R: 0 (self-cast/melee?)" }

    if ($issues.Count -gt 0) {
        Write-Host "`n$($champion.Name):" -ForegroundColor Yellow
        foreach ($issue in $issues) {
            Write-Host "  - $issue" -ForegroundColor White
        }
    }
}

Write-Host "`n`nStatistics:" -ForegroundColor Cyan
Write-Host "=" * 100 -ForegroundColor Cyan
Write-Host "Total champions analyzed: $($results.Count)" -ForegroundColor Green

function Get-AverageRange {
    param($items)
    $filtered = $items | Where-Object { $_ -gt 0 -and $_ -lt 5000 }
    if ($filtered.Count -eq 0) { return 0 }
    return ($filtered | Measure-Object -Average).Average
}

$avgQRange = Get-AverageRange ($results | ForEach-Object { Normalize-RangeValue $_.Q_Range })
$avgWRange = Get-AverageRange ($results | ForEach-Object { Normalize-RangeValue $_.W_Range })
$avgERange = Get-AverageRange ($results | ForEach-Object { Normalize-RangeValue $_.E_Range })
$avgRRange = Get-AverageRange ($results | ForEach-Object { Normalize-RangeValue $_.R_Range })

Write-Host "Average Q Range (excluding 0 and map-wide): $([math]::Round($avgQRange, 0))" -ForegroundColor White
Write-Host "Average W Range (excluding 0 and map-wide): $([math]::Round($avgWRange, 0))" -ForegroundColor White
Write-Host "Average E Range (excluding 0 and map-wide): $([math]::Round($avgERange, 0))" -ForegroundColor White
Write-Host "Average R Range (excluding 0 and map-wide): $([math]::Round($avgRRange, 0))" -ForegroundColor White

