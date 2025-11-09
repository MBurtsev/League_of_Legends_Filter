# Manual fix for ability ranges based on League of Legends Wiki and gameplay data
# This addresses the 25000 placeholder issue in Riot's Data Dragon API

$ErrorActionPreference = "Stop"

Write-Host "=== Manual Ability Range Fixer ===" -ForegroundColor Cyan
Write-Host ""

# Define corrections: ChampionID -> Q, W, E, R ranges
# Based on https://leagueoflegends.fandom.com/wiki/
$rangeCorrections = @{
    "Aatrox" = @(650, 825, 350, 0)  # Q is area with ~650 range, E is dash ~350, R is self-cast
    "Ashe" = @(1200, 1200, "25000", "25000")  # E and R are global, keep 25000
    "Bard" = @(950, 800, 900, 3400)  # Q cast range ~950
    "Braum" = @(1000, 650, 0, 1250)  # E is self-cast
    "Briar" = @(475, 350, 400, 6000)  # R long range charge
    "Draven" = @(1100, 1000, 1050, "25000")  # R is global
    "Evelynn" = @(800, 1200, 210, 650)  # R dash with ~650 range
    "Ezreal" = @(1150, 1150, 475, "25000")  # R is global
    "Gangplank" = @(625, 400, 1000, "25000")  # R is global
    "Garen" = @(300, 0, 325, 400)  # W is self-cast
    "Gnar" = @(1100, 0, 475, 590)  # W is passive/self
    "Gwen" = @(450, 0, 400, 1200)  # W is self-cast area
    "Hecarim" = @(350, 525, 300, 1000)  # R charge range ~1000
    "Hwei" = @(1400, 850, 800, 1300)  # Hwei abilities have defined ranges
    "Janna" = @(1075, 800, 800, 725)  # W fixed from 4294967295!
    "Jhin" = @(550, 3000, 750, 3500)  # R sniper range ~3500
    "Jinx" = @(600, 1450, 925, "25000")  # R is global
    "Katarina" = @(625, 400, 725, 550)  # W AoE ~400
    "Khazix" = @(325, 1000, 700, 0)  # R is self-cast stealth
    "Kled" = @(800, 0, 550, 3500)  # W is passive
    "LeBlanc" = @(700, 600, 925, 0)  # R mimics other spells, 0 for base
    "Mel" = @(950, 250, 1050, "25000")  # New champion, R appears global
    "MissFortune" = @(650, 1000, 1000, 1400)  # R cone area
    "Mordekaiser" = @(675, 325, 700, 650)  # W AoE around self
    "Nunu" = @(125, 5500, 625, 650)  # W charge distance
    "Ornn" = @(800, 550, 450, 2500)  # W breath ~550
    "Pantheon" = @(575, 600, 400, 5500)  # R is semi-global
    "Rammus" = @(300, 300, 325, 600)  # R AoE
    "Senna" = @(600, 1250, 400, "25000")  # R is global
    "Seraphine" = @(900, 800, 1300, 1200)  # R extending skillshot
    "Sett" = @(0, 790, 490, 400)  # Q is self-buff, W cone
    "Shen" = @(400, 400, 600, "25000")  # R is global teleport
    "Sion" = @(725, 500, 800, 6000)  # Q charge area, R charge distance
    "Soraka" = @(810, 550, 925, "25000")  # R is global
    "Swain" = @(750, 5500, 850, 650)  # W is long range vision
    "TahmKench" = @(900, 1000, 2400, 350)  # R devour ally/enemy
    "TwistedFate" = @(1450, 200, 0, 5500)  # Q cards, E is passive, R semi-global
    "Warwick" = @(365, 4000, 375, 3000)  # R long dash
    "Yone" = @(450, 700, 0, 1000)  # E is spirit form (self-cast mechanic)
    "Yorick" = @(0, 600, 700, 600)  # Q is auto-attack reset
    "Yuumi" = @(1150, 700, 750, 1100)  # Fixed from 25000
    "Zeri" = @(700, 1150, 300, 800)  # E dash ~300
}

$projectRoot = Split-Path $PSScriptRoot -Parent
$metaPath = Join-Path $projectRoot "champion_meta.js"

if (-not (Test-Path $metaPath)) {
    Write-Host "[ERROR] champion_meta.js not found at $metaPath" -ForegroundColor Red
    exit 1
}

Write-Host "Loading champion_meta.js..." -ForegroundColor Yellow
$metaRaw = Get-Content $metaPath -Raw -Encoding UTF8
$pattern = 'window\.LOL_CHAMPIONS_META\s*=\s*(\{.*\});'
$match = [System.Text.RegularExpressions.Regex]::Match($metaRaw, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

if (-not $match.Success) {
    Write-Host "[ERROR] Failed to locate window.LOL_CHAMPIONS_META block" -ForegroundColor Red
    exit 1
}

$convertFromJsonParams = @{}
if ((Get-Command ConvertFrom-Json).Parameters.ContainsKey('Depth')) {
    $convertFromJsonParams['Depth'] = 100
}

$metaJson = $match.Groups[1].Value
$metaData = $metaJson | ConvertFrom-Json @convertFromJsonParams

$spellKeys = @('Q', 'W', 'E', 'R')
$updatedChampions = @()

foreach ($championId in $rangeCorrections.Keys) {
    Write-Host "Fixing $championId..." -ForegroundColor White
    $corrections = $rangeCorrections[$championId]

    $championProperty = $metaData.PSObject.Properties | Where-Object { $_.Name -eq $championId }
    if (-not $championProperty) {
        Write-Host "  [WARN] Champion not found in metadata" -ForegroundColor Yellow
        continue
    }

    $championMeta = $championProperty.Value
    if (-not $championMeta -or -not $championMeta.spells) {
        Write-Host "  [WARN] Champion metadata missing spells" -ForegroundColor Yellow
        continue
    }

    $changed = $false

    for ($i = 0; $i -lt $championMeta.spells.Count -and $i -lt $corrections.Count; $i++) {
        $targetRange = $corrections[$i]
        if ($null -eq $targetRange -or $targetRange -eq "25000") {
            continue
        }

        $spell = $championMeta.spells[$i]
        if (-not $spell.range) {
            continue
        }

        $currentRange = $spell.range[0]
        if ($currentRange -eq $targetRange) {
            continue
        }

        $levels = $spell.range.Count
        if ($levels -le 0) {
            $levels = 5
        }

        $newRangeArray = @()
        for ($lvl = 0; $lvl -lt $levels; $lvl++) {
            $newRangeArray += $targetRange
        }

        $spell.range = $newRangeArray
        $spell.rangeBurn = [string]$targetRange
        $changed = $true

        $spellKey = $spellKeys[$i]
        Write-Host "  ${spellKey}: $currentRange -> $targetRange" -ForegroundColor Cyan
    }

    if ($changed) {
        $updatedChampions += $championId
    }
}

if ($updatedChampions.Count -eq 0) {
    Write-Host "\nNo updates were necessary." -ForegroundColor Yellow
    exit 0
}

Write-Host "\nWriting champion_meta.js..." -ForegroundColor Yellow
$updatedJson = $metaData | ConvertTo-Json -Depth 100 -Compress
$newBlock = "window.LOL_CHAMPIONS_META = `n$updatedJson;"

$before = $metaRaw.Substring(0, $match.Index)
$after = $metaRaw.Substring($match.Index + $match.Length)
$updatedContent = $before + $newBlock + $after

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($metaPath, $updatedContent, $utf8NoBom)

Write-Host "\n=== Summary ===" -ForegroundColor Cyan
Write-Host "Champions updated: $($updatedChampions.Count)" -ForegroundColor Green
Write-Host "List: $([string]::Join(', ', $updatedChampions))" -ForegroundColor White
Write-Host "\nDone. champion_meta.js now contains corrected ranges." -ForegroundColor Green

