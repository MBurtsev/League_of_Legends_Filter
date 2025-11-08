# PowerShell script to download all League of Legends resources locally
# Usage: .\download_assets.ps1

Write-Host "=== Downloading League of Legends Resources ===" -ForegroundColor Green

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
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
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
$version | Out-File "data/version.txt" -Encoding UTF8

# Download champion list (EN)
Write-Host "`nDownloading champion list (EN)..." -ForegroundColor Yellow
$champListUrl = "https://ddragon.leagueoflegends.com/cdn/$version/data/en_US/champion.json"
$champListJson = Invoke-RestMethod -Uri $champListUrl
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$PWD/data/champion_list_en.json", ($champListJson | ConvertTo-Json -Depth 100), $utf8NoBom)

# Download champion list (RU)
Write-Host "Downloading champion list (RU)..." -ForegroundColor Yellow
$champListUrlRu = "https://ddragon.leagueoflegends.com/cdn/$version/data/ru_RU/champion.json"
$champListJsonRu = Invoke-RestMethod -Uri $champListUrlRu
[System.IO.File]::WriteAllText("$PWD/data/champion_list_ru.json", ($champListJsonRu | ConvertTo-Json -Depth 100), $utf8NoBom)

# Get champion list from already loaded data
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
        $champDetailPath = "data/champion/${champId}_en.json"
        $champDetailJson = Invoke-RestMethod -Uri $champDetailUrl -ErrorAction Stop
        [System.IO.File]::WriteAllText("$PWD/$champDetailPath", ($champDetailJson | ConvertTo-Json -Depth 100), $utf8NoBom)
        
        # Download champion JSON (RU)
        $champDetailUrlRu = "https://ddragon.leagueoflegends.com/cdn/$version/data/ru_RU/champion/$champId.json"
        $champDetailPathRu = "data/champion/${champId}_ru.json"
        $champDetailJsonRu = Invoke-RestMethod -Uri $champDetailUrlRu -ErrorAction Stop
        [System.IO.File]::WriteAllText("$PWD/$champDetailPathRu", ($champDetailJsonRu | ConvertTo-Json -Depth 100), $utf8NoBom)
        
        # Use already loaded champion data
        $champInfo = $champDetailJson.data.$champId
        
        # Download champion main image
        $champImageName = $champInfo.image.full
        $champImageUrl = "https://ddragon.leagueoflegends.com/cdn/$version/img/champion/$champImageName"
        $champImagePath = "images/champion/$champImageName"
        if (-not (Test-Path $champImagePath)) {
            Invoke-WebRequest -Uri $champImageUrl -OutFile $champImagePath -ErrorAction SilentlyContinue
        }
        
        # Download loading image (splash)
        $loadingImageUrl = "https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champId}_0.jpg"
        $loadingImagePath = "images/champion/loading/${champId}_0.jpg"
        if (-not (Test-Path $loadingImagePath)) {
            Invoke-WebRequest -Uri $loadingImageUrl -OutFile $loadingImagePath -ErrorAction SilentlyContinue
        }
        
        # Download passive icon
        if ($champInfo.passive -and $champInfo.passive.image) {
            $passiveImage = $champInfo.passive.image.full
            $passiveUrl = "https://ddragon.leagueoflegends.com/cdn/$version/img/passive/$passiveImage"
            $passivePath = "images/passive/$passiveImage"
            if (-not (Test-Path $passivePath)) {
                Invoke-WebRequest -Uri $passiveUrl -OutFile $passivePath -ErrorAction SilentlyContinue
            }
        }
        
        # Download spell icons
        if ($champInfo.spells) {
            foreach ($spell in $champInfo.spells) {
                if ($spell.image) {
                    $spellImage = $spell.image.full
                    $spellUrl = "https://ddragon.leagueoflegends.com/cdn/$version/img/spell/$spellImage"
                    $spellPath = "images/spell/$spellImage"
                    if (-not (Test-Path $spellPath)) {
                        Invoke-WebRequest -Uri $spellUrl -OutFile $spellPath -ErrorAction SilentlyContinue
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
