# Скрипт для скачивания всех ресурсов League of Legends локально
# Использование: .\tools\download_assets.ps1

Write-Host "=== Downloading League of Legends Resources ===" -ForegroundColor Green

# Получаем путь к корневой папке проекта
$projectRoot = Split-Path $PSScriptRoot -Parent

# Create folder structure
$folders = @(
    "data",
    "data/champion",
    "images",
    "images/champion",
    "images/champion/loading",
    "images/spell",
    "images/passive"
)

foreach ($folder in $folders) {
    $folderPath = Join-Path $projectRoot $folder
    if (-not (Test-Path $folderPath)) {
        New-Item -ItemType Directory -Path $folderPath -Force | Out-Null
        Write-Host "Created folder: $folder" -ForegroundColor Cyan
    }
}

# Get latest Data Dragon version
Write-Host "`nFetching Data Dragon version..." -ForegroundColor Yellow
$versionsUrl = "https://ddragon.leagueoflegends.com/api/versions.json"
$versions = Invoke-RestMethod -Uri $versionsUrl
$version = $versions[0]
Write-Host "Latest version: $version" -ForegroundColor Green

# Save version
$versionPath = Join-Path $projectRoot "data/version.txt"
$version | Out-File $versionPath -Encoding UTF8

# Download champion list (EN)
Write-Host "`nDownloading champion list (EN)..." -ForegroundColor Yellow
$champListUrl = "https://ddragon.leagueoflegends.com/cdn/$version/data/en_US/champion.json"
$champListEnPath = Join-Path $projectRoot "data/champion_list_en.json"
& curl.exe -s -o $champListEnPath $champListUrl

# Download champion list (RU)
Write-Host "Downloading champion list (RU)..." -ForegroundColor Yellow
$champListUrlRu = "https://ddragon.leagueoflegends.com/cdn/$version/data/ru_RU/champion.json"
$champListRuPath = Join-Path $projectRoot "data/champion_list_ru.json"
& curl.exe -s -o $champListRuPath $champListUrlRu

# Read champion list
$champListJson = Get-Content $champListEnPath -Raw -Encoding UTF8 | ConvertFrom-Json
$champions = $champListJson.data.PSObject.Properties.Name

Write-Host "`nFound champions: $($champions.Count)" -ForegroundColor Green

# Counters
$current = 0
$total = $champions.Count

# Download detailed data for each champion
foreach ($champId in $champions) {
    $current++
    $percent = [math]::Round(($current / $total) * 100)
    Write-Host "`r[$current/$total] ($percent%) Processing: $champId" -NoNewline -ForegroundColor Cyan
    
    try {
        # Download champion JSON (EN)
        $champDetailUrl = "https://ddragon.leagueoflegends.com/cdn/$version/data/en_US/champion/$champId.json"
        $champDetailPath = Join-Path $projectRoot "data/champion/${champId}_en.json"
        & curl.exe -s -o $champDetailPath $champDetailUrl
        
        # Download champion JSON (RU)
        $champDetailUrlRu = "https://ddragon.leagueoflegends.com/cdn/$version/data/ru_RU/champion/$champId.json"
        $champDetailPathRu = Join-Path $projectRoot "data/champion/${champId}_ru.json"
        & curl.exe -s -o $champDetailPathRu $champDetailUrlRu
        
        # Read champion data
        $champDetailJson = Get-Content $champDetailPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $champInfo = $champDetailJson.data.$champId
        
        # Download champion main image
        $champImageName = $champInfo.image.full
        $champImageUrl = "https://ddragon.leagueoflegends.com/cdn/$version/img/champion/$champImageName"
        $champImagePath = Join-Path $projectRoot "images/champion/$champImageName"
        if (-not (Test-Path $champImagePath)) {
            & curl.exe -s -o $champImagePath $champImageUrl
        }
        
        # Download loading image (splash)
        $loadingImageUrl = "https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champId}_0.jpg"
        $loadingImagePath = Join-Path $projectRoot "images/champion/loading/${champId}_0.jpg"
        if (-not (Test-Path $loadingImagePath)) {
            & curl.exe -s -o $loadingImagePath $loadingImageUrl
        }
        
        # Download passive icon
        if ($champInfo.passive -and $champInfo.passive.image) {
            $passiveImage = $champInfo.passive.image.full
            $passiveUrl = "https://ddragon.leagueoflegends.com/cdn/$version/img/passive/$passiveImage"
            $passivePath = Join-Path $projectRoot "images/passive/$passiveImage"
            if (-not (Test-Path $passivePath)) {
                & curl.exe -s -o $passivePath $passiveUrl
            }
        }
        
        # Download spell icons
        if ($champInfo.spells) {
            foreach ($spell in $champInfo.spells) {
                if ($spell.image) {
                    $spellImage = $spell.image.full
                    $spellUrl = "https://ddragon.leagueoflegends.com/cdn/$version/img/spell/$spellImage"
                    $spellPath = Join-Path $projectRoot "images/spell/$spellImage"
                    if (-not (Test-Path $spellPath)) {
                        & curl.exe -s -o $spellPath $spellUrl
                    }
                }
            }
        }
        
        # Small delay to avoid overloading the server
        Start-Sleep -Milliseconds 10
        
    } catch {
        Write-Host "`nError processing $champId : $_" -ForegroundColor Red
    }
}

Write-Host "`n`n=== Download completed! ===" -ForegroundColor Green
Write-Host "`nFolder structure:" -ForegroundColor Yellow
Write-Host "  data/ - Champion JSON files" -ForegroundColor White
Write-Host "  images/champion/ - Champion images" -ForegroundColor White
Write-Host "  images/spell/ - Spell icons" -ForegroundColor White
Write-Host "  images/passive/ - Passive ability icons" -ForegroundColor White
Write-Host "`nTotal champions downloaded: $total" -ForegroundColor Green
Write-Host "Data Dragon version: $version" -ForegroundColor Green

