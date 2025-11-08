# League of Legends — Ability Filter (Frontend, Data Dragon)

This project is a static HTML+CSS+JS page that loads champion data from Riot Data Dragon and provides convenient filters by abilities and parameters.

## 🚀 Quick Start (all resources locally)

https://mburtsev.github.io/League_of_Legends_Filter/

## 🌍 Localization

The application supports full localization:
- 🇷🇺 Russian language 
- EN English language

Language switcher is located on the right in the search bar.

## Data Sources

- Main source — Data Dragon (official static data from Riot):
  - Base domain: `https://ddragon.leagueoflegends.com`
  - List of available versions:  
    `https://ddragon.leagueoflegends.com/api/versions.json`
  - List of available locales:  
    `https://ddragon.leagueoflegends.com/cdn/languages.json`
  - Champion index (by version and locale):  
    `https://ddragon.leagueoflegends.com/cdn/{version}/data/{locale}/champion.json`  
    Example: `.../cdn/15.21.1/data/en_US/champion.json`
  - Single champion details:  
    `https://ddragon.leagueoflegends.com/cdn/{version}/data/{locale}/champion/{ChampionId}.json`  
    Example: `.../cdn/15.21.1/data/ru_RU/champion/Brand.json`
  - Media (by version):
    - Champion icon: `.../cdn/{version}/img/champion/{image.full}` (e.g., `Aatrox.png`)
    - Ability icon: `.../cdn/{version}/img/spell/{image.full}` (e.g., `AatroxQ.png`)
    - Passive icon: `.../cdn/{version}/img/passive/{image.full}`
  - Media (version-independent, "art"):
    - Splash: `.../cdn/img/champion/splash/{ChampionId}_{skinNumber}.jpg`
    - Preview: `.../cdn/img/champion/tiles/{ChampionId}_{skinNumber}.jpg`

- Additional source (if parameter clarification is needed) — Community Dragon (unofficial, community-driven):
  - Base domain: `https://raw.communitydragon.org`
  - Aggregated champions:  
    `.../latest/plugins/rcp-be-lol-game-data/global/{locale}/v1/champions/{numericId}.json`  
    Example (Brand, id=63):  
    `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/en_us/v1/champions/63.json`
  - Individual ability files (low-level, with `mDataValues`):  
    `.../latest/game/data/characters/{lowercaseName}/spells/{lowercaseName}{q|w|e|r}.spell.bin.json`  
    Example:  
    `https://raw.communitydragon.org/latest/game/data/characters/brand/spells/brandw.spell.bin.json`

The project actually uses only Data Dragon (required): versions, lists and detailed champion cards, as well as images. Community Dragon is mentioned as an alternative source for specific parameters (for example, if DDragon is missing `datavalues.shredduration` or its equivalent).

Locales used by the project:

## Project Files

- `index.html` — markup and connections.
- `styles.css` — styles.
- `script.js` — loading and caching, ability parsing, filters, rendering, modal window.

## Data Structure (overview)

### Champion Index: `champion.json`

```json
{
  "type": "champion",
  "format": "standAloneComplex",
  "version": "15.21.1",
  "data": {
    "Aatrox": {
      "version": "15.21.1",
      "id": "Aatrox",
      "key": "266",
      "name": "Aatrox",
      "title": "the Darkin Blade",
      "image": { "full": "Aatrox.png", "...": "..." },
      "tags": ["Fighter", "Tank"],
      "stats": { "attackrange": 175, "...": "..." }
    },
    "...": {}
  }
}
```

Important fields used by the project:
- `data[champ].image.full` — champion icon.
- `data[champ].tags` — champion roles (Fighter, Tank, Mage, Marksman, Assassin, Support).
- `data[champ].stats.attackrange` — auto-attack range (for "min. attack range" slider).  

### Champion Details: `{ChampionId}.json`

```json
{
  "data": {
    "Aatrox": {
      "id": "Aatrox",
      "name": "Aatrox",
      "title": "the Darkin Blade",
      "spells": [
        {
          "id": "AatroxQ",
          "name": "The Darkin Blade",
          "tooltip": "Deals {{ totaldamage }} physical damage ...",
          "description": "Full description ...",
          "cooldownBurn": "14/12/10/8/6",
          "costBurn": "0",
          "range": [650, 650, 650, 650, 650],            // sometimes number | array | string
          "rangeBurn": "650",
          "effect": [null, [10, 20, 30, 40, 50], ...],   // e1, e2, ... (numbers by level)
          "effectBurn": [null, "10/20/30/40/50", ...],   // e1, e2, ... (strings)
          "datavalues": { "shredduration": 1.75, "...": 0 },
          "vars": [
            { "key": "totaldamage", "coeff": [30, 60, 90, 120, 150], "link": "attackdamage" },
            { "key": "slowamount", "coeff": 0.45, "link": "unknown" }
          ],
          "image": { "full": "AatroxQ.png" }
        },
        "..."
      ],
      "passive": {
        "name": "Deathbringer Stance",
        "description": "Aatrox's next basic attack deals ...",
        "image": { "full": "Aatrox_Passive.png" }
      }
    }
  }
}
```

> **⚠️ IMPORTANT: Data Hidden by Riot Games**  
> Starting from ~2020, Riot Games **removed** numerical values from the public DDragon API:
> - **`vars`** — always an empty array `[]`
> - **`datavalues`** — always an empty object `{}`
> - **`effect`** — array of zeros `[null, [0,0,0...], [0,0,0...], ...]`
> 
> **Result:** Placeholders like `{{ totaldamage }}`, `{{ slowamount }}` remain **unfilled** in ability descriptions.  
> Exact numerical values are available **only in the game client** (in encrypted .bin files).
> 
> The JSON structure shown above represents the **theoretical format**, but in reality these fields are empty.


- **Community Dragon Integration (optional):**
  Add loading data from CDragon API in parallel with Data Dragon and use `mDataValues` to fill in the gaps. This will require:
  1) Request to `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/en_us/v1/champions/{numericId}.json`
  2) Parsing `mDataValues` fields (e.g., `ShredDuration`, `TotalDamage`)
  3) Adding them to the `dict` dictionary inside `fillPlaceholdersInText()` with key normalization to lowercase.

## Licenses and Rights

Unofficial tool. All rights to materials belong to Riot Games. Data is taken from Riot's public sources (Data Dragon). Champion/ability names and images belong to their respective owners.

