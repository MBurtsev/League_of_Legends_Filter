# Конвертация JSON данных в единый JavaScript файл для статического HTML
# Использование: .\tools\convert_json_to_js.ps1

Write-Host "Creating unified JavaScript data file..." -ForegroundColor Green

# Start building the JS content
$jsContent = @"
// League of Legends - All Champion Data
// Auto-generated from Data Dragon JSON files

"@

# Add version
$version = (Get-Content ".\data\version.txt" -Raw -Encoding UTF8).Trim()
$jsContent += "`nwindow.LOL_DATA_VERSION = '$version';`n"

# Add champion list EN
Write-Host "Adding champion list (EN)..." -ForegroundColor Cyan
$champListEn = Get-Content ".\data\champion_list_en.json" -Raw -Encoding UTF8
$jsContent += "`nwindow.LOL_CHAMPION_LIST_EN = $champListEn;`n"

# Add champion list RU
Write-Host "Adding champion list (RU)..." -ForegroundColor Cyan
$champListRu = Get-Content ".\data\champion_list_ru.json" -Raw -Encoding UTF8
$jsContent += "`nwindow.LOL_CHAMPION_LIST_RU = $champListRu;`n"

# Add all champion details in one object
$jsContent += "`nwindow.LOL_CHAMPIONS_DATA = {`n"

$championFiles = Get-ChildItem ".\data\champion\*.json" | Sort-Object Name
$total = $championFiles.Count
$current = 0

foreach ($file in $championFiles) {
    $current++
    Write-Host "`r[$current/$total] Processing: $($file.Name)" -NoNewline -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
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

# Save to single file with UTF8 (no BOM)
$outputPath = Join-Path (Split-Path $PSScriptRoot -Parent) "champion_data.js"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($outputPath, $jsContent, $utf8NoBom)

Write-Host "`n`nConversion completed!" -ForegroundColor Green
Write-Host "Created file: champion_data.js" -ForegroundColor Cyan
$fileSize = [math]::Round((Get-Item $outputPath).Length / 1MB, 2)
Write-Host "File size: $fileSize MB" -ForegroundColor Green
Write-Host "`nNow add this to your HTML:" -ForegroundColor Yellow
Write-Host '  <script src="champion_data.js"></script>' -ForegroundColor White

