# Script to check and analyze ability ranges for all champions
# This will extract Q, W, E, R ranges from all champion JSON files

$dataPath = ".\data\champion\"
$outputFile = "ability_ranges_report.txt"

# Get all English champion files
$championFiles = Get-ChildItem -Path $dataPath -Filter "*_en.json"

$results = @()

foreach ($file in $championFiles) {
    $championName = $file.BaseName -replace "_en", ""
    
    try {
        $jsonContent = Get-Content $file.FullName -Raw | ConvertFrom-Json
        $championData = $jsonContent.data.PSObject.Properties.Value
        
        if ($championData.spells) {
            $spellNames = @('Q', 'W', 'E', 'R')
            
            $rangeData = [PSCustomObject]@{
                Champion = $championName
                Name = $championData.name
                Q_Name = ""
                Q_Range = ""
                W_Name = ""
                W_Range = ""
                E_Name = ""
                E_Range = ""
                R_Name = ""
                R_Range = ""
            }
            
            for ($i = 0; $i -lt $championData.spells.Count; $i++) {
                $spell = $championData.spells[$i]
                $spellKey = $spellNames[$i]
                
                if ($spell.range) {
                    # Get the first range value (they're usually the same for all levels)
                    $range = $spell.range[0]
                    $rangeData."$($spellKey)_Name" = $spell.name
                    $rangeData."$($spellKey)_Range" = $range
                }
            }
            
            $results += $rangeData
        }
    }
    catch {
        Write-Host "Error processing $championName : $_" -ForegroundColor Red
    }
}

# Sort by champion name
$results = $results | Sort-Object Champion

# Output to console
Write-Host "`nAbility Ranges for All Champions" -ForegroundColor Cyan
Write-Host "=" * 100 -ForegroundColor Cyan

foreach ($champion in $results) {
    Write-Host "`n$($champion.Name) ($($champion.Champion))" -ForegroundColor Yellow
    Write-Host "  Q: $($champion.Q_Name) - Range: $($champion.Q_Range)" -ForegroundColor Green
    Write-Host "  W: $($champion.W_Name) - Range: $($champion.W_Range)" -ForegroundColor Green
    Write-Host "  E: $($champion.E_Name) - Range: $($champion.E_Range)" -ForegroundColor Green
    Write-Host "  R: $($champion.R_Name) - Range: $($champion.R_Range)" -ForegroundColor Green
}

# Save to file
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

# Find unusual ranges (potential issues)
Write-Host "`n`nPotential Issues (Unusual Ranges):" -ForegroundColor Red
Write-Host "=" * 100 -ForegroundColor Red

foreach ($champion in $results) {
    $issues = @()
    
    # Check for extremely high ranges (> 5000, likely map-wide)
    if ([int]$champion.Q_Range -gt 5000) { $issues += "Q: $($champion.Q_Range) (map-wide?)" }
    if ([int]$champion.W_Range -gt 5000) { $issues += "W: $($champion.W_Range) (map-wide?)" }
    if ([int]$champion.E_Range -gt 5000) { $issues += "E: $($champion.E_Range) (map-wide?)" }
    if ([int]$champion.R_Range -gt 5000) { $issues += "R: $($champion.R_Range) (map-wide?)" }
    
    # Check for zero ranges (might be self-cast or melee range)
    if ([int]$champion.Q_Range -eq 0) { $issues += "Q: 0 (self-cast/melee?)" }
    if ([int]$champion.W_Range -eq 0) { $issues += "W: 0 (self-cast/melee?)" }
    if ([int]$champion.E_Range -eq 0) { $issues += "E: 0 (self-cast/melee?)" }
    if ([int]$champion.R_Range -eq 0) { $issues += "R: 0 (self-cast/melee?)" }
    
    if ($issues.Count -gt 0) {
        Write-Host "`n$($champion.Name):" -ForegroundColor Yellow
        foreach ($issue in $issues) {
            Write-Host "  - $issue" -ForegroundColor White
        }
    }
}

# Statistics
Write-Host "`n`nStatistics:" -ForegroundColor Cyan
Write-Host "=" * 100 -ForegroundColor Cyan
Write-Host "Total champions analyzed: $($results.Count)" -ForegroundColor Green

$avgQRange = ($results | Where-Object { [int]$_.Q_Range -gt 0 -and [int]$_.Q_Range -lt 5000 } | ForEach-Object { [int]$_.Q_Range } | Measure-Object -Average).Average
$avgWRange = ($results | Where-Object { [int]$_.W_Range -gt 0 -and [int]$_.W_Range -lt 5000 } | ForEach-Object { [int]$_.W_Range } | Measure-Object -Average).Average
$avgERange = ($results | Where-Object { [int]$_.E_Range -gt 0 -and [int]$_.E_Range -lt 5000 } | ForEach-Object { [int]$_.E_Range } | Measure-Object -Average).Average
$avgRRange = ($results | Where-Object { [int]$_.R_Range -gt 0 -and [int]$_.R_Range -lt 5000 } | ForEach-Object { [int]$_.R_Range } | Measure-Object -Average).Average

Write-Host "Average Q Range (excluding 0 and map-wide): $([math]::Round($avgQRange, 0))" -ForegroundColor White
Write-Host "Average W Range (excluding 0 and map-wide): $([math]::Round($avgWRange, 0))" -ForegroundColor White
Write-Host "Average E Range (excluding 0 and map-wide): $([math]::Round($avgERange, 0))" -ForegroundColor White
Write-Host "Average R Range (excluding 0 and map-wide): $([math]::Round($avgRRange, 0))" -ForegroundColor White

