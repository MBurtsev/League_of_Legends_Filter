# Скрипт для проверки плейсхолдеров в описаниях умений
# Использование: .\tools\check_placeholders.ps1

$champions = @("Aatrox", "Ahri", "Akali", "Yasuo", "Yone", "Zed", "Brand", "Annie", "Lux", "Jinx", "Aphelios", "Samira", "Sett", "Gwen", "Viego", "Belveth", "Evelynn", "KhaZix", "Rengar", "Sylas", "Thresh", "Pyke", "Ezreal", "Kayn", "Jhin")
$version = "15.21.1"
$placeholders = @{}

foreach ($champ in $champions) {
    try {
        $url = "https://ddragon.leagueoflegends.com/cdn/$version/data/ru_RU/champion/$champ.json"
        $data = Invoke-RestMethod -Uri $url -UseBasicParsing
        $champData = $data.data.$champ
        
        foreach ($spell in $champData.spells) {
            $text = $spell.tooltip + " " + $spell.description
            $matches = [regex]::Matches($text, '\{\{\s*([a-z0-9_*+\-./]+)\s*\}\}')
            foreach ($match in $matches) {
                $key = $match.Groups[1].Value.ToLower()
                if (-not $placeholders.ContainsKey($key)) {
                    $placeholders[$key] = @()
                }
                $placeholders[$key] += "$champ : $($spell.name)"
            }
        }
        
        if ($champData.passive) {
            $text = $champData.passive.description
            $matches = [regex]::Matches($text, '\{\{\s*([a-z0-9_*+\-./]+)\s*\}\}')
            foreach ($match in $matches) {
                $key = $match.Groups[1].Value.ToLower()
                if (-not $placeholders.ContainsKey($key)) {
                    $placeholders[$key] = @()
                }
                $placeholders[$key] += "$champ : Passive"
            }
        }
        
        Write-Host "OK $champ" -ForegroundColor Green
    }
    catch {
        Write-Host "FAIL $champ : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Найденные плейсхолдеры ==="
$placeholders.Keys | Sort-Object | ForEach-Object {
    Write-Host "$_ : $($placeholders[$_].Count) использований"
}

Write-Host "`n=== Всего уникальных плейсхолдеров: $($placeholders.Count) ==="

