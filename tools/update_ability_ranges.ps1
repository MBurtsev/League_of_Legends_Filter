# Script to update ability ranges from Riot's Data Dragon API
# This will download the latest champion data and update range values

param(
    [string]$Version = "15.22.1",
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=== Champion Ability Range Updater ===" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Cyan
Write-Host "Dry Run: $DryRun" -ForegroundColor Cyan
Write-Host ""

# Create temp directory
$tempDir = ".\temp_update"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# Download champion list
Write-Host "Downloading champion list..." -ForegroundColor Yellow
$champListUrl = "https://ddragon.leagueoflegends.com/cdn/$Version/data/en_US/champion.json"
try {
    $champListResponse = Invoke-RestMethod -Uri $champListUrl -TimeoutSec 30
    Write-Host "[OK] Champion list downloaded" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to download champion list: $_" -ForegroundColor Red
    exit 1
}

$champions = $champListResponse.data.PSObject.Properties.Name
Write-Host "Found $($champions.Count) champions" -ForegroundColor Cyan
Write-Host ""

$updatedCount = 0
$errorCount = 0
$unchangedCount = 0

foreach ($championId in $champions) {
    Write-Host "Processing $championId..." -ForegroundColor White
    
    # Download champion data from Data Dragon
    $champDataUrl = "https://ddragon.leagueoflegends.com/cdn/$Version/data/en_US/champion/$championId.json"
    
    try {
        $officialData = Invoke-RestMethod -Uri $champDataUrl -TimeoutSec 30
        $officialChamp = $officialData.data.$championId
        
        # Update both English and Russian files
        $localFilesEn = Get-ChildItem -Path ".\data\champion\" -Filter "$($championId)_en.json"
        $localFilesRu = Get-ChildItem -Path ".\data\champion\" -Filter "$($championId)_ru.json"
        
        foreach ($localFile in @($localFilesEn, $localFilesRu)) {
            if (-not $localFile) { continue }
            
            $localData = Get-Content $localFile.FullName -Raw | ConvertFrom-Json
            $localChamp = $localData.data.$championId
            
            if (-not $localChamp) {
                Write-Host "  ⚠ Champion data not found in local file" -ForegroundColor Yellow
                continue
            }
            
            $changed = $false
            
            # Update each spell's range
            for ($i = 0; $i -lt $officialChamp.spells.Count; $i++) {
                if ($i -ge $localChamp.spells.Count) { break }
                
                $officialSpell = $officialChamp.spells[$i]
                $localSpell = $localChamp.spells[$i]
                
                # Compare and update range
                $officialRange = $officialSpell.range
                $localRange = $localSpell.range
                
                if ($officialRange -and $localRange) {
                    # Convert to arrays if needed
                    $officialRangeStr = ($officialRange | ConvertTo-Json -Compress)
                    $localRangeStr = ($localRange | ConvertTo-Json -Compress)
                    
                    if ($officialRangeStr -ne $localRangeStr) {
                        $spellKey = @("Q", "W", "E", "R")[$i]
                        Write-Host "    ${spellKey}: $localRangeStr -> $officialRangeStr" -ForegroundColor Cyan
                        
                        if (-not $DryRun) {
                            $localSpell.range = $officialRange
                            $changed = $true
                        }
                    }
                }
            }
            
            # Save updated file
            if ($changed -and -not $DryRun) {
                $localData | ConvertTo-Json -Depth 100 -Compress | Set-Content $localFile.FullName -Encoding UTF8
                $updatedCount++
                Write-Host "  [OK] Updated $($localFile.Name)" -ForegroundColor Green
            } elseif ($changed) {
                Write-Host "  [INFO] Would update $($localFile.Name) (dry run)" -ForegroundColor Yellow
            } else {
                $unchangedCount++
            }
        }
        
    } catch {
        Write-Host "  [ERROR] Error processing ${championId}: $_" -ForegroundColor Red
        $errorCount++
    }
    
    # Small delay to avoid rate limiting
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Updated: $updatedCount" -ForegroundColor Green
Write-Host "Unchanged: $unchangedCount" -ForegroundColor Gray
Write-Host "Errors: $errorCount" -ForegroundColor Red

if ($DryRun) {
    Write-Host ""
    Write-Host "This was a dry run. No files were modified." -ForegroundColor Yellow
    Write-Host "Run without -DryRun to apply changes." -ForegroundColor Yellow
}

if (-not $DryRun -and $updatedCount -gt 0) {
    Write-Host ""
    Write-Host "[WARN] Remember to regenerate champion_data.js!" -ForegroundColor Yellow
    Write-Host "Run: .\tools\convert_json_to_js.ps1" -ForegroundColor Cyan
}

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

