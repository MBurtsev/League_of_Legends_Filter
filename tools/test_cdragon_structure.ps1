# Тестовый скрипт для изучения структуры Community Dragon API
# Использование: .\tools\test_cdragon_structure.ps1

Write-Host "=== Testing Community Dragon API Structure ===" -ForegroundColor Green

# Получаем путь к корневой папке проекта
$projectRoot = Split-Path $PSScriptRoot -Parent

# Получаем список чемпионов из нашего локального файла
$champListPath = Join-Path $projectRoot "data/champion_list_en.json"
$champListJson = Get-Content $champListPath -Raw -Encoding UTF8 | ConvertFrom-Json
$testChamps = @("Aatrox", "Ahri", "Blitzcrank") # Тестовые чемпионы

foreach ($champName in $testChamps) {
    Write-Host "`n=== Testing: $champName ===" -ForegroundColor Cyan
    
    # Получаем ID чемпиона
    $champData = $champListJson.data.$champName
    if (-not $champData) {
        Write-Host "Champion not found in local data" -ForegroundColor Red
        continue
    }
    
    $champKey = $champData.key # Числовой ID
    $champId = $champData.id   # Строковый ID
    
    Write-Host "Champion Key: $champKey, ID: $champId" -ForegroundColor Yellow
    
    # Пробуем несколько URL форматов Community Dragon
    $urls = @(
        "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/$champKey.json",
        "https://raw.communitydragon.org/latest/game/data/characters/$($champId.ToLower())/spells/$($champId.ToLower())q.spell.bin.json",
        "https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/v1/champions/$champKey.json"
    )
    
    foreach ($url in $urls) {
        Write-Host "`nTrying: $url" -ForegroundColor Gray
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            Write-Host "SUCCESS! Status: $($response.StatusCode)" -ForegroundColor Green
            
            # Сохраняем первый успешный ответ для анализа
            $outputFile = Join-Path $projectRoot "tools/test_cdragon_${champId}.json"
            $response.Content | Out-File $outputFile -Encoding UTF8
            Write-Host "Saved to: tools/test_cdragon_${champId}.json" -ForegroundColor Green
            
            # Показываем краткую структуру
            $json = $response.Content | ConvertFrom-Json
            Write-Host "Keys in response:" -ForegroundColor Yellow
            $json.PSObject.Properties.Name | ForEach-Object { Write-Host "  - $_" }
            
            break
        }
        catch {
            Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green

