# Convert champion data to optimized structure
# Separates metadata from translatable text
# Usage: .\tools\convert_to_optimized.ps1

Write-Host "=== Converting to Optimized Structure ===" -ForegroundColor Green

$projectRoot = Split-Path $PSScriptRoot -Parent

# Read version
$version = (Get-Content "$projectRoot\data\version.txt" -Raw -Encoding UTF8).Trim()
Write-Host "Data version: $version" -ForegroundColor Cyan

# Read champion lists
$champListEn = (Get-Content "$projectRoot\data\champion_list_en.json" -Raw -Encoding UTF8) | ConvertFrom-Json
$champListRu = (Get-Content "$projectRoot\data\champion_list_ru.json" -Raw -Encoding UTF8) | ConvertFrom-Json

# Initialize data structures
$championIndex = @{}
$metadata = @{}
$textsRu = @{}
$textsEn = @{}

# Get all champion files
$championFiles = Get-ChildItem "$projectRoot\data\champion\*_en.json" | Sort-Object Name
$total = $championFiles.Count
$current = 0

Write-Host "`nProcessing champions..." -ForegroundColor Yellow

foreach ($fileEn in $championFiles) {
    $current++
    $champKey = $fileEn.BaseName -replace '_en$', ''
    $pathRu = Join-Path $fileEn.DirectoryName "$champKey`_ru.json"
    
    Write-Host "`r[$current/$total] $champKey" -NoNewline -ForegroundColor Cyan
    
    # Read both language files
    $dataEn = Get-Content $fileEn.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $dataRu = Get-Content $pathRu -Raw -Encoding UTF8 | ConvertFrom-Json
    
    $champEn = $dataEn.data.PSObject.Properties.Value
    $champRu = $dataRu.data.PSObject.Properties.Value
    $listEn = $champListEn.data.$champKey
    $listRu = $champListRu.data.$champKey
    
    # Build champion index (non-translatable fields only)
    $championIndex[$champKey] = [ordered]@{
        id = $listEn.id
        key = $listEn.key
        tags = $listEn.tags
        info = $listEn.info
        image = $listEn.image
        stats = $listEn.stats
    }
    
    # Extract metadata (language-independent)
    $metaSkins = @()
    foreach ($skin in $champEn.skins) {
        $skinMeta = [ordered]@{}
        foreach ($prop in $skin.PSObject.Properties) {
            if ($prop.Name -eq 'name') { continue }
            $skinMeta[$prop.Name] = $prop.Value
        }
        $metaSkins += [PSCustomObject]$skinMeta
    }
    
    $meta = [ordered]@{
        id = $champEn.id
        key = $champEn.key
        tags = $champEn.tags
        info = $champEn.info
        stats = $champEn.stats
        image = $champEn.image
        skins = $metaSkins
        spells = @()
        passive = @{
            image = $champEn.passive.image
        }
    }
    
    # Extract spell metadata (non-translatable fields only)
    foreach ($spell in $champEn.spells) {
        $spellMeta = [ordered]@{
            id = $spell.id
            maxrank = $spell.maxrank
            cooldown = $spell.cooldown
            cooldownBurn = $spell.cooldownBurn
            cost = $spell.cost
            costBurn = $spell.costBurn
            range = $spell.range
            rangeBurn = $spell.rangeBurn
            maxammo = $spell.maxammo
            effect = $spell.effect
            effectBurn = $spell.effectBurn
            vars = $spell.vars
            datavalues = $spell.datavalues
            image = $spell.image
        }
        $meta.spells += [PSCustomObject]$spellMeta
    }
    
    $metadata[$champKey] = $meta
    
    # Extract English texts
    $skinTextsEn = @()
    foreach ($skin in $champEn.skins) {
        $skinTextsEn += [ordered]@{
            id = $skin.id
            num = $skin.num
            name = $skin.name
        }
    }
    
    $textEn = [ordered]@{
        name = $champEn.name
        title = $champEn.title
        lore = $champEn.lore
        blurb = $champEn.blurb
        partype = $champEn.partype
        allytips = $champEn.allytips
        enemytips = $champEn.enemytips
        skins = $skinTextsEn
        spells = @()
        passive = [ordered]@{
            name = $champEn.passive.name
            description = $champEn.passive.description
        }
    }
    
    foreach ($spell in $champEn.spells) {
        $spellText = [ordered]@{
            name = $spell.name
            description = $spell.description
            tooltip = $spell.tooltip
            leveltip = $spell.leveltip
            costType = $spell.costType
            resource = $spell.resource
        }
        $textEn.spells += [PSCustomObject]$spellText
    }
    
    $textsEn[$champKey] = $textEn
    
    # Extract Russian texts
    $skinTextsRu = @()
    foreach ($skin in $champRu.skins) {
        $skinTextsRu += [ordered]@{
            id = $skin.id
            num = $skin.num
            name = $skin.name
        }
    }
    
    $textRu = [ordered]@{
        name = $champRu.name
        title = $champRu.title
        lore = $champRu.lore
        blurb = $champRu.blurb
        partype = $champRu.partype
        allytips = $champRu.allytips
        enemytips = $champRu.enemytips
        skins = $skinTextsRu
        spells = @()
        passive = [ordered]@{
            name = $champRu.passive.name
            description = $champRu.passive.description
        }
    }
    
    foreach ($spell in $champRu.spells) {
        $spellText = [ordered]@{
            name = $spell.name
            description = $spell.description
            tooltip = $spell.tooltip
            leveltip = $spell.leveltip
            costType = $spell.costType
            resource = $spell.resource
        }
        $textRu.spells += [PSCustomObject]$spellText
    }
    
    $textsRu[$champKey] = $textRu
}

Write-Host "\n\nGenerating JavaScript files..." -ForegroundColor Yellow

# Generate champion_meta.js
Write-Host "Creating champion_meta.js..." -ForegroundColor Cyan
$metaJs = @"
// League of Legends - Champion Metadata
// Auto-generated from Data Dragon JSON files
// Version: $version

window.LOL_DATA_VERSION = '$version';

"@
$metaJs += "window.LOL_CHAMPION_INDEX = `n"
$metaJs += ($championIndex | ConvertTo-Json -Depth 10 -Compress)
$metaJs += ";`n`n"

$metaJs += "window.LOL_CHAMPIONS_META = `n"

$metaJs += ($metadata | ConvertTo-Json -Depth 10 -Compress)
$metaJs += ";"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$projectRoot\champion_meta.js", $metaJs, $utf8NoBom)

$metaSize = [math]::Round((Get-Item "$projectRoot\champion_meta.js").Length / 1MB, 2)
Write-Host "  Size: $metaSize MB" -ForegroundColor Green

# Generate champion_text_en.js
Write-Host "Creating champion_text_en.js..." -ForegroundColor Cyan
$textEnJs = @"
// League of Legends - Champion Texts (English)
// Auto-generated from Data Dragon JSON files

window.LOL_CHAMPIONS_TEXT_EN = 
"@

$textEnJs += ($textsEn | ConvertTo-Json -Depth 10 -Compress)
$textEnJs += ";"

[System.IO.File]::WriteAllText("$projectRoot\champion_text_en.js", $textEnJs, $utf8NoBom)

$textEnSize = [math]::Round((Get-Item "$projectRoot\champion_text_en.js").Length / 1MB, 2)
Write-Host "  Size: $textEnSize MB" -ForegroundColor Green

# Generate champion_text_ru.js
Write-Host "Creating champion_text_ru.js..." -ForegroundColor Cyan
$textRuJs = @"
// League of Legends - Champion Texts (Russian)
// Auto-generated from Data Dragon JSON files

window.LOL_CHAMPIONS_TEXT_RU = 
"@

$textRuJs += ($textsRu | ConvertTo-Json -Depth 10 -Compress)
$textRuJs += ";"

[System.IO.File]::WriteAllText("$projectRoot\champion_text_ru.js", $textRuJs, $utf8NoBom)

$textRuSize = [math]::Round((Get-Item "$projectRoot\champion_text_ru.js").Length / 1MB, 2)
Write-Host "  Size: $textRuSize MB" -ForegroundColor Green

# Summary
Write-Host "`n=== Conversion Complete ===" -ForegroundColor Green
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "  champion_meta.js    : $metaSize MB" -ForegroundColor White
Write-Host "  champion_text_en.js : $textEnSize MB" -ForegroundColor White
Write-Host "  champion_text_ru.js : $textRuSize MB" -ForegroundColor White
Write-Host "`nTotal champions: $total" -ForegroundColor Cyan

$oldSize = 0
if (Test-Path "$projectRoot\champion_data.js") {
    $oldSize = [math]::Round((Get-Item "$projectRoot\champion_data.js").Length / 1MB, 2)
    Write-Host "`nOld champion_data.js: $oldSize MB" -ForegroundColor Yellow
    $savings = [math]::Round((1 - ($metaSize + $textRuSize) / $oldSize) * 100, 1)
    Write-Host "Space saved (meta + one language): $savings%" -ForegroundColor Green
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Update script.js to use new data structure" -ForegroundColor White
Write-Host "2. Update index.html to load champion_meta.js" -ForegroundColor White
Write-Host "3. Test language loading functionality" -ForegroundColor White

