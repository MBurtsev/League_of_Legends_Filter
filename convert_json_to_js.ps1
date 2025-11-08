# Convert all JSON data to a single JavaScript file for static HTML usage
Write-Host "Creating unified JavaScript data file..." -ForegroundColor Green

# Start building the JS content
$jsContent = @"
// League of Legends - All Champion Data
// Auto-generated from Data Dragon JSON files

"@

# Add version
$version = (Get-Content "data/version.txt" -Raw).Trim()
$jsContent += "`nwindow.LOL_DATA_VERSION = '$version';`n"

# Add champion list EN
Write-Host "Adding champion list (EN)..." -ForegroundColor Cyan
$champListEn = Get-Content "data/champion_list_en.json" -Raw
$jsContent += "`nwindow.LOL_CHAMPION_LIST_EN = $champListEn;`n"

# Add champion list RU
Write-Host "Adding champion list (RU)..." -ForegroundColor Cyan
$champListRu = Get-Content "data/champion_list_ru.json" -Raw
$jsContent += "`nwindow.LOL_CHAMPION_LIST_RU = $champListRu;`n"

# Add all champion details in one object
$jsContent += "`nwindow.LOL_CHAMPIONS_DATA = {`n"

$championFiles = Get-ChildItem "data/champion/*.json" | Sort-Object Name
$total = $championFiles.Count
$current = 0

foreach ($file in $championFiles) {
    $current++
    Write-Host "`r[$current/$total] Processing: $($file.Name)" -NoNewline -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw
    $fileName = $file.BaseName
    
    # Add to the big object
    $jsContent += "  '$fileName': $content"
    
    # Add comma if not last item
    if ($current -lt $total) {
        $jsContent += ","
    }
    
    $jsContent += "`n"
}

$jsContent += "};`n"

# Save to single file
$jsContent | Out-File "champion_data.js" -Encoding UTF8

Write-Host "`n`nConversion completed!" -ForegroundColor Green
Write-Host "Created file: champion_data.js" -ForegroundColor Cyan
$fileSize = [math]::Round((Get-Item "champion_data.js").Length / 1MB, 2)
Write-Host "File size: $fileSize MB" -ForegroundColor Green
Write-Host "`nNow add this to your HTML:" -ForegroundColor Yellow
Write-Host '  <script src="champion_data.js"></script>' -ForegroundColor White
