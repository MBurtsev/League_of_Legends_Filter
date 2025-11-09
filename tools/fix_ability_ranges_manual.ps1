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
    "Kha'Zix" = @(325, 1000, 700, 0)  # R is self-cast stealth
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

$updatedCount = 0
$errorCount = 0

foreach ($championId in $rangeCorrections.Keys) {
    Write-Host "Fixing $championId..." -ForegroundColor White
    
    $newRanges = $rangeCorrections[$championId]
    
    try {
        # Update both English and Russian files
        $localFilesEn = Get-ChildItem -Path ".\data\champion\" -Filter "$($championId)_en.json"
        $localFilesRu = Get-ChildItem -Path ".\data\champion\" -Filter "$($championId)_ru.json"
        
        foreach ($localFile in @($localFilesEn, $localFilesRu)) {
            if (-not $localFile) { continue }
            
            $localData = Get-Content $localFile.FullName -Raw | ConvertFrom-Json
            $localChamp = $localData.data.$championId
            
            if (-not $localChamp) {
                Write-Host "  [WARN] Champion data not found in local file" -ForegroundColor Yellow
                continue
            }
            
            $changed = $false
            
            # Update each spell's range
            for ($i = 0; $i -lt 4; $i++) {
                if ($i -ge $localChamp.spells.Count) { break }
                
                $localSpell = $localChamp.spells[$i]
                $newRange = $newRanges[$i]
                
                # Skip if keeping 25000 (global abilities)
                if ($newRange -eq "25000") { continue }
                
                # Get current range
                $currentRange = $localSpell.range[0]
                
                if ($currentRange -ne $newRange) {
                    $spellKey = @("Q", "W", "E", "R")[$i]
                    Write-Host "  ${spellKey}: $currentRange -> $newRange" -ForegroundColor Cyan
                    
                    # Set all levels to same range
                    $newRangeArray = @($newRange, $newRange, $newRange, $newRange, $newRange)
                    if ($i -eq 3) {  # R has only 3 levels
                        $newRangeArray = @($newRange, $newRange, $newRange)
                    }
                    
                    $localSpell.range = $newRangeArray
                    $localSpell.rangeBurn = "$newRange"
                    $changed = $true
                }
            }
            
            # Save updated file
            if ($changed) {
                $localData | ConvertTo-Json -Depth 100 -Compress | Set-Content $localFile.FullName -Encoding UTF8
                Write-Host "  [OK] Updated $($localFile.Name)" -ForegroundColor Green
                $updatedCount++
            }
        }
        
    } catch {
        Write-Host "  [ERROR] Error processing ${championId}: $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Updated files: $updatedCount" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor Red

if ($updatedCount -gt 0) {
    Write-Host ""
    Write-Host "[WARN] Remember to regenerate champion_data.js!" -ForegroundColor Yellow
    Write-Host "Run: .\tools\convert_json_to_js.ps1" -ForegroundColor Cyan
}

