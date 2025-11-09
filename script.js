(() => {
  const translations = {
    ru: {
      filters: 'Фильтры',
      abilities: 'Умения',
      abilitiesTitle: 'Способности',
      buffs: 'Бафы',
      debuffs: 'Дебафы',
      mobility: 'Прыжок / рывок',
      stun: 'Оглушение',
      slow: 'Замедление',
      root: 'Удержание',
      knockup: 'Подброс / отброс',
      silence: 'Молчание',
      stealth: 'Невидимость',
      attackspeed: 'Ускорение автоатаки',
      movespeed: 'Ускорение бега',
      shield: 'Щит',
      heal: 'Лечение',
      pull: 'Притяжение',
      lifesteal: 'Вампиризм',
      dmgPhysical: 'Физический урон',
      dmgMagic: 'Магический урон',
      scalesHealth: 'Урон от здоровья',
      roles: 'Роли чемпиона',
      roleTank: 'Танк',
      roleFighter: 'Воин',
      roleMage: 'Маг',
      roleMarksman: 'Стрелок',
      roleAssassin: 'Убийца',
      roleSupport: 'Поддержка',
      attackRange: 'Дальность автоатаки',
      spellRange: 'Дальность умений',
      minAttackRange: 'Мин. дальность автоатаки',
      minRangeQ: 'Мин. дальность Q',
      minRangeW: 'Мин. дальность W',
      minRangeE: 'Мин. дальность E',
      minRangeR: 'Мин. дальность R',
      reset: 'Сбросить',
      searchPlaceholder: 'Поиск по имени чемпиона...',
      found: 'Найдено чемпионов',
      of: 'из',
      loading: 'Загрузка данных чемпионов…',
      detectingVersion: 'Определение версии данных…',
      versionDetected: 'Версия данных',
      checkingCache: 'Проверка кэша…',
      cacheNotFound: 'Кэш не найден. Загрузка списка чемпионов…',
      loadingAbilities: 'Загрузка подробных данных способностей…',
      ready: 'Готово. Чемпионов загружено',
      applyingFilters: 'Применяю фильтры…',
      passive: 'Пассивное умение',
      cooldown: 'Перезарядка',
      cost: 'Стоимость',
      range: 'Дальность',
      footer: 'Неофициальный инструмент. Все права на материалы принадлежат Riot Games.'
    },
    en: {
      filters: 'Filters',
      abilities: 'Abilities',
      abilitiesTitle: 'Abilities',
      buffs: 'Buffs',
      debuffs: 'Debuffs',
      mobility: 'Dash / Blink',
      stun: 'Stun',
      slow: 'Slow',
      root: 'Root',
      knockup: 'Knock Up / Back',
      silence: 'Silence',
      stealth: 'Stealth',
      attackspeed: 'Attack Speed Buff',
      movespeed: 'Movement Speed Buff',
      shield: 'Shield',
      heal: 'Heal',
      pull: 'Pull / Grab',
      lifesteal: 'Lifesteal / Omnivamp',
      dmgPhysical: 'Physical Damage',
      dmgMagic: 'Magic Damage',
      scalesHealth: 'Health Scaling',
      roles: 'Champion Roles',
      roleTank: 'Tank',
      roleFighter: 'Fighter',
      roleMage: 'Mage',
      roleMarksman: 'Marksman',
      roleAssassin: 'Assassin',
      roleSupport: 'Support',
      attackRange: 'Attack Range',
      spellRange: 'Spell Range',
      minAttackRange: 'Min. Attack Range',
      minRangeQ: 'Min. Q Range',
      minRangeW: 'Min. W Range',
      minRangeE: 'Min. E Range',
      minRangeR: 'Min. R Range',
      reset: 'Reset',
      searchPlaceholder: 'Search champion name...',
      found: 'Found champions',
      of: 'of',
      loading: 'Loading champion data…',
      detectingVersion: 'Detecting data version…',
      versionDetected: 'Data version',
      checkingCache: 'Checking cache…',
      cacheNotFound: 'Cache not found. Loading champion list…',
      loadingAbilities: 'Loading detailed ability data…',
      ready: 'Ready. Champions loaded',
      applyingFilters: 'Applying filters…',
      passive: 'Passive',
      cooldown: 'Cooldown',
      cost: 'Cost',
      range: 'Range',
      footer: 'Unofficial tool. All rights to materials belong to Riot Games.'
    }
  };

  const state = {
    version: null,
    championsIndex: null,
    champions: [],
    language: 'en', // 'ru' or 'en' - default English
    searchQuery: '',
    currentModalChampion: null,
    filters: {
      mobility: false,
      stun: false,
      slow: false,
      root: false,
      knockup: false,
      silence: false,
      stealth: false,
      shield: false,
      heal: false,
      minRange: 0
    }
  };
  
  function t(key) {
    return translations[state.language][key] || key;
  }

  const els = {
    status: null,
    grid: null,
    minRange: null,
    minRangeValue: null,
    minRangeQ: null,
    minRangeQValue: null,
    minRangeW: null,
    minRangeWValue: null,
    minRangeE: null,
    minRangeEValue: null,
    minRangeR: null,
    minRangeRValue: null,
    resetBtn: null,
    checkboxes: {},
    modalRoot: null,
    modal: null,
    modalViewport: null,
    modalScale: null,
    modalContent: null,
    modalClose: null
  };

  const LOCAL_BASE = "."; // Базовая папка для локальных файлов
  const LOCALE = "en_US"; // используем en_US для надежного поиска по ключевым словам
  const RU_LOCALE = "ru_RU"; // ru для отображения описаний
  const FALLBACK_VERSION = "15.21.1";
  const CONCURRENCY = 10;
  const CACHE_KEY = "lol_champ_cache_v18"; // v18: поддержка статических файлов через window объект

  function qs(selector) {
    return document.querySelector(selector);
  }

  function setStatus(text) {
    if (els.status) {
      els.status.textContent = text;
    }
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  async function getLatestVersion() {
    // Check if data is embedded in window (for static file:// support)
    if (window.LOL_DATA_VERSION) {
      return window.LOL_DATA_VERSION;
    }
    
    try {
      const resp = await fetch(`${LOCAL_BASE}/data/version.txt`);
      if (resp.ok) {
        const version = (await resp.text()).trim();
        return version || FALLBACK_VERSION;
      }
    } catch (e) {
      console.warn("Не удалось загрузить локальную версию:", e);
    }
    return FALLBACK_VERSION;
  }

  // Dynamic language file loading
  const languageState = {
    ru: { loaded: false, loading: null },
    en: { loaded: false, loading: null }
  };

  async function loadLanguageFile(locale) {
    const lang = locale === RU_LOCALE ? 'ru' : 'en';
    const varName = `LOL_CHAMPIONS_TEXT_${lang.toUpperCase()}`;
    
    // Already loaded
    if (window[varName]) {
      languageState[lang].loaded = true;
      return;
    }
    
    // Already loading
    if (languageState[lang].loading) {
      return languageState[lang].loading;
    }
    
    // Start loading
    languageState[lang].loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `champion_text_${lang}.js`;
      script.onload = () => {
        languageState[lang].loaded = true;
        languageState[lang].loading = null;
        resolve();
      };
      script.onerror = () => {
        languageState[lang].loading = null;
        reject(new Error(`Failed to load ${varName}`));
      };
      document.head.appendChild(script);
    });
    
    return languageState[lang].loading;
  }

  function tryLoadFromCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const payload = JSON.parse(raw);
      if (payload.version !== state.version) return false;
      if (!Array.isArray(payload.champions) || !payload.champions.length) return false;
      state.champions = payload.champions;
      setStatus(`Данные загружены из кэша (${state.version}). Чемпионов: ${state.champions.length}`);
      renderGrid(state.champions);
      return true;
    } catch {
      return false;
    }
  }

  async function loadChampionsIndex() {
    // Prefer embedded optimized data
    if (window.LOL_CHAMPION_INDEX) {
      return window.LOL_CHAMPION_INDEX;
    }
    if (window.LOL_CHAMPIONS_META) {
      const index = {};
      for (const [key, meta] of Object.entries(window.LOL_CHAMPIONS_META)) {
        index[key] = {
          id: meta.id,
          key: meta.key,
          tags: meta.tags,
          info: meta.info,
          image: meta.image,
          stats: meta.stats
        };
      }
      return index;
    }
    
    // Fallback to legacy champion list
    const url = `${LOCAL_BASE}/data/champion_list_en.json`;
    const json = await fetchJson(url);
    return json.data;
  }

  function getChampionIcon(version, imageFull) {
    return `${LOCAL_BASE}/images/champion/${imageFull}`;
  }
  
  function getSpellIcon(version, imageFull) {
    return `${LOCAL_BASE}/images/spell/${imageFull}`;
  }
  
  function getPassiveIcon(version, imageFull) {
    return `${LOCAL_BASE}/images/passive/${imageFull}`;
  }

  function fillPlaceholdersInText(text, spellEn, spellRu, isRussian = true) {
    let result = String(text || "");
    const dict = {};
    const missingKeys = new Set();
    
    // Fallback замены отключены - плейсхолдеры остаются в оригинальном виде
    const fallbackDescriptionsRu = {
      // Словарь убран - оставляем плейсхолдеры как есть
      "spellmodifierdescriptionappend": ""  // Только этот удаляем, он всегда пустой
    };
    /*
    // ОТКЛЮЧЕНО: Старый словарь замен (оставлен для справки)
    const fallbackDescriptionsRu_DISABLED = {
      // Урон
      "basedamage": "базовый урон",
      "totaldamage": "урон",
      "bonusdamage": "бонусный урон",
      "damage": "урон",
      "qdamage": "урон",
      "wdamage": "урон",
      "edamage": "урон",
      "rdamage": "урон",
      "qedgedamage": "урон по краю",
      "initialdamage": "начальный урон",
      "initialburstdamage": "начальный урон",
      "auradamage": "периодический урон",
      "tibbersauradamage": "периодический урон",
      "damagereturn": "отраженный урон",
      "damagecalc": "урон",
      "rampdamagecalc": "усиленный урон",
      
      // Замедление
      "slowamount": "сила замедления",
      "slowamount*100": "сила замедления%",
      "slowpercent": "сила замедления",
      "slowpercent*100": "сила замедления%",
      "slowpercentage*100": "сила замедления%",
      "slowamountcalc": "сила замедления",
      "initialslow*-100": "начальное замедление%",
      "movespeedmod": "модификатор скорости",
      "movespeedmod*-100": "модификатор скорости%",
      "movespeedmodbonus*-100": "бонусный модификатор скорости%",
      "trapslowamount*100": "замедление ловушки%",
      "selfslowpercent*100": "самозамедление%",
      "slowduration": "длительность замедления",
      "wslowpercentage": "сила замедления",
      "wslowduration": "длительность замедления",
      "wslowpercentage*-100": "сила замедления%",
      
      // Оглушение
      "stunduration": "длительность оглушения",
      "wallstunduration": "длительность оглушения от стены",
      
      // Здоровье
      "missinghealthpercent": "% от недостающего здоровья",
      "missinghealthdamage*100": "% от недостающего здоровья",
      "maxhealthpercent": "% от макс. здоровья",
      "maxhealthdamage*100": "% от макс. здоровья",
      "maxhealthdamage*50": "% от макс. здоровья (половина)",
      "bonushealth": "бонусное здоровье",
      "maxhealth": "макс. здоровье",
      "maxhealthdamage": "% от макс. здоровья",
      "maxhealthdamagecalc": "урон от макс. здоровья",
      "maxhealthtadratiotooltip": "коэфф. урона от макс. здоровья",
      "maxhealthondevour": "макс. здоровье при поглощении",
      "percentdamage": "процентный урон",
      "totalpercenthealth": "общий % здоровья",
      "totalpercenthealthonhit": "общий % здоровья при попадании",
      
      // Щит
      "shieldamount": "сила щита",
      "shieldconversion": "% конверсии в щит",
      "shieldconversion*100": "% конверсии в щит",
      "shieldduration": "длительность щита",
      "shield_duration": "длительность щита",
      "shieldmaxduration": "длительность щита",
      "shieldblocktotal": "сила щита",
      "wshield": "сила щита W",
      "totalshield": "общий щит",
      "totalshieldtt": "общий щит",
      "totalshieldstrength": "сила щита",
      "calc_shield": "сила щита",
      
      // Лечение
      "heal": "лечение",
      "healamount": "сила лечения",
      "totalevamp": "вампиризм",
      
      // Скорость передвижения
      "msamount": "% скорости передвижения",
      "msamount*100": "% скорости передвижения",
      "msduration": "длительность ускорения",
      "movespeedcalc": "скорость передвижения",
      "movementspeed": "скорость передвижения",
      "movementspeed*100": "% скорости передвижения",
      "movespeed": "скорость передвижения",
      "totalmovespeed": "общая скорость передвижения",
      "movementspeedduration": "длительность ускорения",
      "rmovementspeedbonus": "% бонуса к скорости",
      "rmovementspeedbonus*100": "% бонуса к скорости",
      "tibbersbonusms": "бонусная скорость Тибберса",
      "startingms*100": "начальная скорость%",
      "stealthms": "скорость в невидимости",
      "oocms": "скорость вне боя",
      "berserkms*100": "% скорости передвижения берсерка",
      "extramovespeedpercent*100": "% дополнительной скорости передвижения",
      
      // Скорость атаки
      "attackspeed": "скорость атаки",
      "attackspeed*100": "скорость атаки%",
      "attackspeedmod*100": "% модификатора скорости атаки",
      "bonusattackspeed": "бонусная скорость атаки",
      "bonusattackspeed*100": "бонусная скорость атаки%",
      "berserkas*100": "% скорости атаки берсерка",
      "totalasmod*100": "общий модификатор скорости атаки%",
      "minigunattackspeedmax": "макс. скорость атаки миниган",
      "minigunattackspeedstacks": "стаки скорости атаки миниган",
      "rocketaspdpenalty*100": "штраф скорости атаки ракет%",
      "empoweredqas": "усиленная скорость атаки Q",
      
      // Сила атаки
      "attackdamage": "сила атаки",
      "totalad": "сила атаки",
      "bonusad": "бонусная сила атаки",
      "rtotaladamp": "% усиления силы атаки",
      "rtotaladamp*100": "% усиления силы атаки",
      "qtotaladratio": "коэфф. силы атаки",
      
      // Сила умений
      "abilitypower": "сила умений",
      "totalap": "сила умений",
      "bonusap": "бонусная сила умений",
      
      // Прочее (снижение урона, усиление, казнь)
      "damagestored": "% накопления урона",
      "damagestored*100": "% накопления урона",
      "maxgrit": "макс. накопление",
      "damageconversion": "конверсия урона",
      "truedamageconversion*100": "% конверсии в чистый урон",
      "adrenalinestoragewindow": "время накопления",
      "duration": "длительность",
      "totalduration": "длительность",
      "rminionfearduration": "длительность страха",
      "rduration": "длительность",
      "rextension": "продление эффекта",
      "rhealingamp": "% усиления лечения",
      "rhealingamp*100": "% усиления лечения",
      "tibberslifetime": "время жизни Тибберса",
      "tibbersattackdamage": "урон Тибберса",
      "rpercentpenbuff": "% пробития магической защиты",
      "rpercentpenbuff*100": "% пробития магической защиты",
      "rpercentarmorpen": "% пробития брони",
      "damagereflection": "отражение урона",
      "drpercent": "снижение получаемого урона",
      "drpercent*100": "% снижения получаемого урона",
      "damagereduction": "снижение урона",
      "damagereductionpercent": "% снижения урона",
      "rdamageamp*100": "% усиления урона",
      "reduceddamage*100": "% сниженного урона",
      "reduceddamagefinal": "финальный сниженный урон",
      "aoedamagemult*100": "множитель AoE урона%",
      "damagereductionwaveclear.0*100": "снижение урона против миньонов%",
      "executebonus": "бонус казни",
      "executethreshold*100": "порог казни%",
      "maxexecutethreshold*100": "макс. порог казни%",
      "monsterexecutemax": "макс. казнь монстров",
      "deathmarkpercent*100": "% метки смерти",
      "fourthshotmultiplier*100": "множитель четвертого выстрела%",
      "percentamponkill*100": "% усиления при убийстве",
      "maxincreasecalc": "макс. увеличение",
      "totalresists": "общее сопротивление",
      "minionmod*100": "модификатор против миньонов%",
      "pattackdamagemax": "макс. урон пассивной атаки",
      "pattackdamagemin": "мин. урон пассивной атаки",
      "passivestacksondevour": "стаки пассивки при поглощении",
      "ammorechargeratetooltip": "скорость восстановления боеприпасов",
      "tooltipmaxtargetshit": "макс. количество пораженных целей",
      "rmaxcasts": "макс. количество применений R",
      "rmaxtargetspercast": "макс. целей за применение R",
      "e0": "эффект 0",
      "e1": "эффект 1",
      "e2": "эффект 2",
      "e3": "эффект 3",
      "e4": "эффект 4",
      "e5": "эффект 5",
      
      // Специфичные плейсхолдеры для разных способностей
      "spellmodifierdescriptionappend": "", // обычно пустой, просто удаляем
      "f1": "макс. урон",
      "f2": "макс. эффект",
      "f3": "доп. эффект",
      "f1.0": "макс. урон",
      "f2.0": "макс. эффект",
      "f3.0": "доп. эффект",
      
      // Урон от разных способностей
      "qultdamagebeam": "урон луча",
      "wulttotaldamage": "общий урон",
      "eulttotaldamage": "общий урон",
      "rultdamage": "урон ультимейта",
      "qbasedamage": "базовый урон Q",
      "wbasedamage": "базовый урон W",
      "ebasedamage": "базовый урон E",
      "rbasedamage": "базовый урон R",
      "basedamagetooltip": "базовый урон",
      "qbasedamagetooltip": "базовый урон Q",
      "wbasedamagetooltip": "базовый урон W",
      "ebasedamagetooltip": "базовый урон E",
      "rbasedamagetooltip": "базовый урон R",
      "missiledamage": "урон снаряда",
      "projectiledamage": "урон снаряда",
      "totalbonusdamage": "общий бонусный урон",
      "bonustotaldamage": "общий бонусный урон",
      "totalattackbonusdamage": "общий бонусный урон атаки",
      "totalattackpercentmissinghealth": "% урона от недостающего здоровья",
      "totalaoeоedamage": "общий урон по области",
      
      // Дополнительный урон
      "bonusdamagetooltip": "бонусный урон",
      "bonusdamage": "бонусный урон",
      "extradamage": "дополнительный урон",
      "empowereddamage": "усиленный урон",
      "totalempowereddamage": "общий усиленный урон",
      "totaldamageempowered": "усиленный урон",
      "chargedamage": "урон от заряда",
      "maximumchargedamage": "макс. урон от заряда",
      "minchargedamage": "мин. урон от заряда",
      "maxchargedamage": "макс. урон от заряда",
      "damageperstrike": "урон за удар",
      "maxdamageperstrike": "макс. урон за удар",
      "maxdamageperstriketooltip": "макс. урон за удар",
      "mindamageperstrike": "мин. урон за удар",
      "damageperattack": "урон за атаку",
      "damagepershot": "урон за выстрел",
      "damageperhit": "урон за попадание",
      "onhitdamage": "урон при попадании",
      "finalonhitdamage": "финальный урон при попадании",
      "dashdamage": "урон при рывке",
      "explosiondamage": "урон от взрыва",
      "totalexplosiondamage": "общий урон от взрыва",
      "wallhitdamage": "урон при ударе о стену",
      "cast1damage": "урон первого применения",
      "cast2damagemax": "макс. урон второго применения",
      "cast2damagemin": "мин. урон второго применения",
      "e1damage": "урон E1",
      "e2damagecalc": "урон E2",
      "edamagecalc": "урон E",
      "finalswipedamage": "урон финального удара",
      "miniswipedamage": "урон малого удара",
      "secondattackdamage": "урон второй атаки",
      "rocketdamage": "урон ракеты",
      "multifiredamage": "урон залпа",
      "singlefiredamage": "урон одиночного выстрела",
      "passthroughdamage": "урон при прохождении",
      "tooltipdamage": "урон",
      "slayerdamage": "урон убийцы",
      "mindamage": "мин. урон",
      "maxdamage": "макс. урон",
      "damagemax": "макс. урон",
      "damagefloor": "мин. урон",
      "bonusdamageperstack": "бонусный урон за сток",
      "totaldamage3": "общий урон (3 уровень)",
      "totaldamage5": "общий урон (5 уровень)",
      "totaldamagett": "общий урон",
      "totaldamagetooltip": "общий урон",
      "zonedamagetooltip": "урон зоны",
      "rcalculateddamage": "расчётный урон R",
      "darkinflatdamage": "фиксированный урон Темного",
      "darkinpercentdamage": "процентный урон Темного",
      "basedamage*0.5": "базовый урон × 0.5",
      
      // Вампиризм и лечение
      "lifesteal": "вампиризм",
      "totallifesteal": "вампиризм",
      "lifestealmod*100": "модификатор вампиризма%",
      "lifestealpercent*100": "% вампиризма",
      "spellvamp": "заклинательный вампиризм",
      "omnivamp": "все-вампиризм",
      "physicalvamp": "физический вампиризм",
      "healingcalc": "лечение",
      "healthrestore": "восстановление здоровья",
      "healvalue": "значение лечения",
      "totalhealing": "общее лечение",
      "maxhealing": "макс. лечение",
      "minhealing": "мин. лечение",
      "healmodvschamps*100": "модификатор лечения против чемпионов%",
      "damagepercentagehealed": "% вылеченного урона",
      "slayerhealpercent*100": "% лечения Убийцы",
      "attackmaxhpheal": "лечение от макс. здоровья при атаке",
      "attackhealpercent*100": "% лечения при атаке",
      "percentmaxhpheal": "% лечения от макс. здоровья",
      
      // Перезарядка
      "recastcooldown": "перезарядка повторного применения",
      "chargecooldown": "перезарядка заряда",
      "rechargetime": "время восстановления",
      "cooldownreduction": "снижение перезарядки",
      "cooldownbetweencasts": "перезарядка между применениями",
      "hitbonuscooldown": "бонус к перезарядке при попадании",
      "pertargetcooldown": "перезарядка на цель",
      "minimumenemycooldown": "мин. перезарядка для врагов",
      "assassincdreduction": "снижение перезарядки убийцы",
      "shadowhitcdr": "снижение перезарядки тени",
      "cdrefund": "возврат перезарядки",
      "cdrefund*100": "возврат перезарядки%",
      "fadetime": "время затухания",
      "detonationtimeout": "время до детонации",
      "returntimer": "время возврата",
      "lockouttime": "время блокировки",
      "trapdetonationtime": "время детонации ловушки",
      
      // Энергия и ресурсы
      "energycost": "затраты энергии",
      "energyrestore": "восстановление энергии",
      "manacost": "затраты маны",
      "manarefund*100": "возврат маны%",
      "manareturn": "возврат маны",
      "healthcost": "затраты здоровья",
      "nocost": "без затрат",
      
      // Дальность и радиус
      "castrange": "дальность применения",
      "effectradius": "радиус действия",
      "explosionradius": "радиус взрыва",
      "aoeradius": "радиус области",
      "bonusaarange": "бонусная дальность автоатак",
      "bonusattackrange": "бонусная дальность атак",
      "rocketbonusrange": "бонусная дальность ракет",
      
      // Длительность эффектов
      "ccaduration": "длительность контроля",
      "knockupduration": "длительность подброса",
      "knockupdurationtooltiponly": "длительность подброса",
      "q3knockupduration": "длительность подброса",
      "rknockupduration": "длительность подброса",
      "minknockup": "мин. длительность подброса",
      "maxknockup": "макс. длительность подброса",
      "fearduartion": "длительность страха",
      "fearduration": "длительность страха",
      "charmduartion": "длительность очарования",
      "charmduration": "длительность очарования",
      "suppressduration": "длительность подавления",
      "blindduration": "длительность ослепления",
      "silenceduration": "длительность молчания",
      "rootduration": "длительность удержания",
      "snareduration": "длительность обездвиживания",
      "tauntduration": "длительность провокации",
      "tauntlength": "длительность провокации",
      "monstercharm": "длительность очарования монстров",
      "monsterstun": "длительность оглушения монстров",
      "baseduration": "базовая длительность",
      "buffduration": "длительность усиления",
      "debuffduration": "длительность ослабления",
      "rbuffduration": "длительность усиления",
      "berserkduration": "длительность берсерка",
      "stealthduration": "длительность невидимости",
      "steroidduration": "длительность усиления",
      "attackspeedduration": "длительность ускорения атаки",
      "minigunattackspeedduration": "длительность ускорения атаки",
      "gatheringstormduration": "длительность сбора бури",
      "grenadeduration": "длительность гранаты",
      "infestduration": "длительность заражения",
      "slashduration": "длительность удара",
      "zoneduration": "длительность зоны",
      "slowzoneduration": "длительность зоны замедления",
      "mistduration": "длительность тумана",
      "voidduration": "длительность Бездны",
      "trapduration": "длительность ловушки",
      "stackduration": "длительность стаков",
      "spottingduration": "длительность обнаружения",
      "slowlingerduration": "длительность остаточного замедления",
      "pdurationextension": "продление длительности",
      "rshadowdurationdisplayed": "длительность тени",
      "rrecastwindow": "окно перезахода",
      "rrecastduration": "длительность перезахода",
      "rdeathmarkduration": "длительность метки смерти",
      "maxstuntt": "макс. длительность оглушения",
      
      // Дополнительные эффекты
      "missingmana": "недостающая мана",
      "missingmanapercent": "% недостающей маны",
      "currenthealth": "текущее здоровье",
      "currenthealthpercent": "% текущего здоровья",
      "targetmaxhealth": "макс. здоровье цели",
      "targetmaxhealthpercent": "% макс. здоровья цели",
      "targetcurrenthealth": "текущее здоровье цели",
      "targetcurrenthealthpercent": "% текущего здоровья цели",
      "targetmissinghealth": "недостающее здоровье цели",
      "targetmissinghealthpercent": "% недостающего здоровья цели",
      "targetbonushealth": "бонусное здоровье цели",
      "targetbonushealthpercent": "% бонусного здоровья цели",
      
      // Броня и магическая защита
      "armor": "броня",
      "bonusarmor": "бонусная броня",
      "totalarmor": "общая броня",
      "armorpenetration": "пробитие брони",
      "armorshred": "снижение брони",
      "armorshredamount": "величина снижения брони",
      "armorshredduration": "длительность снижения брони",
      "shredpercent*100": "% снижения защиты",
      "grantedallyarmor": "броня союзнику",
      "grantedbraumarmor": "броня",
      "magicresist": "магическая защита",
      "bonusmagicresist": "бонусная магическая защита",
      "totalmagicresist": "общая магическая защита",
      "magicpenetration": "пробитие магической защиты",
      "magicshred": "снижение магической защиты",
      "mrshred": "снижение магической защиты",
      "mrshred*100": "% снижения магической защиты",
      "grantedallymr": "магическая защита союзнику",
      "grantedbraummr": "магическая защита",
      "shredduration": "длительность снижения",
      "shredamount": "величина снижения",
      
      // Скейлы
      "adscaling": "скейл от силы атаки",
      "apscaling": "скейл от силы умений",
      "healthscaling": "скейл от здоровья",
      "armorscaling": "скейл от брони",
      "mrscaling": "скейл от магической защиты",
      "critscaling": "скейл от критического удара",
      
      // Прочее
      "chargecount": "количество зарядов",
      "maxcharges": "макс. количество зарядов",
      "qstackcount": "количество зарядов Q",
      "wstackcount": "количество зарядов W",
      "estackcount": "количество зарядов E",
      "rstackcount": "количество зарядов R",
      "stackcount": "количество стаков",
      "maxstacks": "макс. количество стаков",
      "stackcap": "макс. количество стаков",
      "goldcost": "стоимость в золоте",
      "percenthealth": "% здоровья",
      "percentmana": "% маны",
      "percentmaxhealth": "% от макс. здоровья",
      "percentmaxmana": "% от макс. маны",
      "percenthealthbasetooltip": "% от макс. здоровья",
      "percenthealthempoweredtooltip": "% от макс. здоровья (усиленный)",
      "percenthealthtooltip": "% от макс. здоровья",
      "speedamount": "скорость передвижения",
      "speedamount*100": "% скорости передвижения",
      "speedduration": "длительность ускорения",
      "critdamage": "критический урон",
      "criticalstrikechance": "шанс критического удара",
      "criticaldamage": "критический урон",
      "monsterdamagetotaltooltip": "урон по монстрам",
      "monsterdamage": "урон по монстрам",
      "monsterdamagebase": "базовый урон по монстрам",
      "monsterdamagebonus": "бонусный урон по монстрам"
    };
    */
    
    const addDict = (obj) => {
      if (!obj) return;
      for (const [k, v] of Object.entries(obj)) {
        dict[String(k).toLowerCase()] = v;
      }
    };
    const addVars = (varsArr) => {
      if (!Array.isArray(varsArr)) return;
      for (const v of varsArr) {
        const key = String(v?.key || "").toLowerCase();
        if (!key) continue;
        const coeff = v?.coeff;
        let valStr = "";
        if (Array.isArray(coeff)) {
          valStr = coeff.join("/");
        } else if (coeff != null) {
          valStr = String(coeff);
        }
        if (valStr) dict[key] = valStr;
        
        // Добавляем также варианты с префиксами
        const link = String(v?.link || "").toLowerCase();
        if (link && link !== "unknown") {
          // Создаём дополнительные ключи для скейлинга
          dict[`bonus${link}`] = valStr;
          dict[`total${link}`] = valStr;
        }
      }
    };
    
    // datavalues сначала из en, затем ru как fallback
    addDict(spellEn?.datavalues);
    addDict(spellRu?.datavalues);
    // vars из обоих источников
    addVars(spellEn?.vars);
    addVars(spellRu?.vars);

    // effectBurn -> e1/e2/...
    const effectBurn = spellEn?.effectBurn || spellRu?.effectBurn;
    if (Array.isArray(effectBurn)) {
      effectBurn.forEach((v, i) => {
        if (i === 0 || v == null) return;
        dict[`e${i}`] = v;
      });
    }
    // распространённые ключи
    if (spellEn?.cooldownBurn || spellRu?.cooldownBurn) {
      dict["cooldown"] = spellEn?.cooldownBurn || spellRu?.cooldownBurn;
      dict["cooldownburn"] = dict["cooldown"];
    }
    if (spellEn?.costBurn || spellRu?.costBurn) {
      dict["cost"] = spellEn?.costBurn || spellRu?.costBurn;
      dict["costburn"] = dict["cost"];
    }
    if (spellEn?.rangeBurn || spellRu?.rangeBurn) {
      dict["range"] = spellEn?.rangeBurn || spellRu?.rangeBurn;
      dict["rangeburn"] = dict["range"];
    }
    
    // Дополнительная эвристика: ищем связанные ключи
    // Например, если есть "damage", то добавляем "totaldamage", "bonusdamage"
    const keysSnapshot = Object.keys(dict);
    for (const k of keysSnapshot) {
      if (!k.startsWith("total") && !k.startsWith("bonus") && !k.startsWith("base")) {
        if (!dict[`total${k}`]) dict[`total${k}`] = dict[k];
        if (!dict[`bonus${k}`]) dict[`bonus${k}`] = dict[k];
      }
    }

    result = result.replace(/\{\{\s*([a-z0-9_*+\-./]+)\s*\}\}/gi, (fullMatch, key) => {
      const keyLower = String(key).toLowerCase();
      
      // Сначала пытаемся найти по полному ключу (например, "f2.0")
      let val = dict[keyLower];
      
      // Если не нашли, убираем только математические операции вроде *100, но сохраняем точки в середине (f2.0)
      if (val == null) {
        // Убираем только умножение/деление в конце
        let cleanKey = keyLower;
        // Если есть *100 или *-100, удаляем это
        if (cleanKey.includes('*')) {
          cleanKey = cleanKey.split('*')[0];
        }
        val = dict[cleanKey];
      }
      
      if (val != null) {
        // Если в ключе была математическая операция (например, *100), применяем её
        if (key.includes('*100')) {
          const numVal = parseFloat(val);
          if (!isNaN(numVal)) {
            return String(numVal * 100);
          }
        }
        if (key.includes('*-100')) {
          const numVal = parseFloat(val);
          if (!isNaN(numVal)) {
            return String(numVal * -100);
          }
        }
        return String(val);
      }
      
      // ОТКЛЮЧЕНО: Fallback замена плейсхолдеров на текст (оставляем плейсхолдеры как есть)
      /*
      if (isRussian) {
        const cleanKeyForFallback = keyLower.replace(/[*+\-./0-9\s]/g, '');
        const fallback = fallbackDescriptionsRu[keyLower] || fallbackDescriptionsRu[cleanKeyForFallback];
        
        if (fallback !== undefined) {
          if (fallback === "") {
            return "";
          } else {
            missingKeys.add(key);
            return fallback;
          }
        }
      }
      */
      
      // Оставляем плейсхолдеры в оригинальном виде
      missingKeys.add(key);
      return fullMatch;
    });
    
    // Очистка лишних пробелов после удаления плейсхолдеров
    result = result.replace(/\s{2,}/g, ' ').trim();
    
    // Логируем недостающие ключи для дебага (только в консоль)
    if (missingKeys.size > 0 && (spellEn?.id || spellRu?.id)) {
      console.log(`[${spellEn?.id || spellRu?.id}] Replaced placeholders:`, Array.from(missingKeys));
    }
    
    return result;
  }

  function parseRangeValue(rangeField, rangeBurnField) {
    // priority: numeric array -> max; then rangeBurn string -> max numeric
    let nums = [];
    const toStringLower = (v) => (typeof v === "string" ? v.toLowerCase() : "");

    // handle special textual values
    const rf = toStringLower(rangeField);
    const rb = toStringLower(rangeBurnField);
    const isGlobal = rf.includes("global") || rf.includes("infinite") || rb.includes("global") || rb.includes("infinite");
    if (isGlobal) return 50000; // условная "очень большая" дальность

    if (Array.isArray(rangeField)) {
      nums = rangeField
        .map(v => (typeof v === "number" ? v : parseInt(v, 10)))
        .filter(n => Number.isFinite(n));
    }
    if ((!nums.length) && typeof rangeBurnField === "string") {
      const parts = rangeBurnField.split("/").map(s => {
        const low = s.toLowerCase().trim();
        if (low === "global" || low === "infinite") return 50000;
        return parseInt(s.replace(/[^\d]/g, ""), 10);
      });
      nums = parts.filter(n => Number.isFinite(n));
    }
    if (!nums.length && typeof rangeField === "number" && Number.isFinite(rangeField)) {
      nums = [rangeField];
    }
    if (!nums.length && typeof rangeField === "string") {
      const low = rangeField.toLowerCase().trim();
      if (low === "global" || low === "infinite") return 50000;
      if (low === "self") return 0;
      const n = parseInt(rangeField.replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n)) nums = [n];
    }
    if (!nums.length) return 0;
    return Math.max(...nums);
  }

  function parseAbilityTagsFromText(text) {
    if (!text) return new Set();
    const t = text.toLowerCase();
    const tags = new Set();

    // mobility
    if (/\b(dash|dashes|blink|blinks|leap|leaps|jump|jumps|teleport|teleports|reposition|untargetable)\b/.test(t)) {
      tags.add("mobility");
    }
    // hard CC
    if (/\b(stun|stunned)\b/.test(t)) tags.add("stun");
    if (/\b(root|rooted|immobilize|immobilized|snare|snared)\b/.test(t)) tags.add("root");
    if (/\b(knock\s?up|airborne|launched)\b/.test(t)) tags.add("knockup");
    if (/\b(knock\s?back|pushed back|displace|displaced)\b/.test(t)) tags.add("knockup");
    if (/\b(silence|silenced)\b/.test(t)) tags.add("silence");
    // soft CC, utility
    if (/\b(slow|slowed)\b/.test(t)) tags.add("slow");
    if (/\b(pull|pulls|pulled|drag|drags|dragged|grab|grabs|grabbed)\b/.test(t)) tags.add("pull");
    if (/\b(stealth|invisible|camouflage|camouflaged)\b/.test(t)) tags.add("stealth");
    if (/\b(attack speed|bonus attack speed|increases attack speed)\b/.test(t)) tags.add("attackspeed");
    if (/\b(movement speed|move speed|bonus movement speed|increases movement speed|gain movement speed)\b/.test(t)) tags.add("movespeed");
    if (/\b(shield|shielded)\b/.test(t)) tags.add("shield");
    if (/\b(heal|heals|healed|restore health|restores health)\b/.test(t)) tags.add("heal");
    // Lifesteal/vamp - patterns that indicate healing proportional to damage dealt
    // Also includes placeholders like {{ vamppercentage }}, {{ lifesteal }}, etc.
    if (/\b(lifesteal|life steal|omnivamp|spell vamp|vamp)\b/i.test(t) ||
        /\{\{\s*(vamp|lifesteal|omnivamp)/i.test(t) ||
        /(heal|healing|heals).{0,15}(for|from).{0,15}(damage dealt|damage)/i.test(t) ||
        /(heal|healing|heals).{0,15}(% of|percent of).{0,15}damage/i.test(t) ||
        /(damage dealt|damage).{0,15}(as health|as healing)/i.test(t) ||
        /восстанавливает.{0,20}(от|процент).{0,15}(нанесенного урона|урона)/i.test(t)) tags.add("lifesteal");

    return tags;
  }

  function accumulateChampionTags(champDetail) {
    const tags = new Set();
    const tagsByAbility = { Q: new Set(), W: new Set(), E: new Set(), R: new Set() };
    
    const collect = (str) => {
      return parseAbilityTagsFromText(str);
    };
    
    if (champDetail && champDetail.spells) {
      const abilityKeys = ['Q', 'W', 'E', 'R'];
      for (let i = 0; i < champDetail.spells.length && i < 4; i++) {
        const s = champDetail.spells[i];
        const abilityTags = new Set();
        
        collect(s.name).forEach(t => abilityTags.add(t));
        collect(s.description).forEach(t => abilityTags.add(t));
        collect(s.tooltip).forEach(t => abilityTags.add(t));
        if (s.leveltip && s.leveltip.label) {
          collect(s.leveltip.label.join(" ")).forEach(t => abilityTags.add(t));
        }
        
        // Добавляем теги к общему списку и к конкретной способности
        abilityTags.forEach(t => {
          tags.add(t);
          tagsByAbility[abilityKeys[i]].add(t);
        });
      }
    }
    
    if (champDetail && champDetail.passive) {
      collect(champDetail.passive.name).forEach(t => tags.add(t));
      collect(champDetail.passive.description).forEach(t => tags.add(t));
    }
    
    return { 
      tags: Array.from(tags),
      tagsByAbility: {
        Q: Array.from(tagsByAbility.Q),
        W: Array.from(tagsByAbility.W),
        E: Array.from(tagsByAbility.E),
        R: Array.from(tagsByAbility.R)
      }
    };
  }

  async function loadChampionDetailByLocale(champKey, locale) {
    const lang = locale === RU_LOCALE ? 'ru' : 'en';
    
    // NEW: Check if optimized data structure is available
    if (window.LOL_CHAMPIONS_META) {
      // Load language file if not loaded yet
      await loadLanguageFile(locale);
      
      const meta = window.LOL_CHAMPIONS_META[champKey];
      const textVar = `LOL_CHAMPIONS_TEXT_${lang.toUpperCase()}`;
      const texts = window[textVar]?.[champKey];
      
      if (meta && texts) {
        const textSpells = Array.isArray(texts.spells) ? texts.spells : [];
        const metaSpells = Array.isArray(meta.spells) ? meta.spells : [];
        const mergedSpells = metaSpells.map((spellMeta, i) => {
          const spellText = textSpells[i] || {};
          return {
            ...spellMeta,
            ...spellText
          };
        });
        const mergedPassive = {
          ...meta.passive,
          ...texts.passive
        };
        const metaSkins = Array.isArray(meta.skins) ? meta.skins : [];
        const textSkins = Array.isArray(texts.skins) ? texts.skins : [];
        const mergedSkins = metaSkins.map(skinMeta => {
          const skinText = textSkins.find(s => (s.id && skinMeta.id && String(s.id) === String(skinMeta.id)) || (s.num !== undefined && skinMeta.num !== undefined && Number(s.num) === Number(skinMeta.num))) || null;
          return {
            ...skinMeta,
            name: skinText?.name || ""
          };
        });
        return {
          id: meta.id,
          key: meta.key,
          name: texts.name,
          title: texts.title,
          image: meta.image,
          skins: mergedSkins,
          lore: texts.lore,
          blurb: texts.blurb,
          allytips: texts.allytips,
          enemytips: texts.enemytips,
          tags: meta.tags,
          partype: texts.partype,
          info: meta.info,
          stats: meta.stats,
          spells: mergedSpells,
          passive: mergedPassive
        };
      }
    }
    
    // OLD: Fallback to legacy format
    if (window.LOL_CHAMPIONS_DATA) {
      const suffix = locale === RU_LOCALE ? 'ru' : 'en';
      const key = `${champKey}_${suffix}`;
      const data = window.LOL_CHAMPIONS_DATA[key];
      if (data) {
        return data.data?.[champKey];
      }
    }
    
    // Load from file
    const suffix = locale === RU_LOCALE ? 'ru' : 'en';
    const url = `${LOCAL_BASE}/data/champion/${champKey}_${suffix}.json`;
    const json = await fetchJson(url);
    const entry = json.data?.[champKey];
    return entry;
  }

  function extractDamageTypesFromDetailEN(detailEn) {
    const types = new Set();
    const typesByAbility = { Q: new Set(), W: new Set(), E: new Set(), R: new Set() };
    
    const check = (s) => {
      const t = (s || "").toLowerCase();
      const found = [];
      if (t.includes("magic damage")) found.push("magic");
      if (t.includes("physical damage")) found.push("physical");
      return found;
    };
    
    if (detailEn?.spells) {
      const abilityKeys = ['Q', 'W', 'E', 'R'];
      for (let i = 0; i < detailEn.spells.length && i < 4; i++) {
        const s = detailEn.spells[i];
        check(s.tooltip).forEach(t => {
          types.add(t);
          typesByAbility[abilityKeys[i]].add(t);
        });
        check(s.description).forEach(t => {
          types.add(t);
          typesByAbility[abilityKeys[i]].add(t);
        });
      }
    }
    
    if (detailEn?.passive) {
      check(detailEn.passive.description).forEach(t => types.add(t));
    }
    
    return {
      types: Array.from(types),
      typesByAbility: {
        Q: Array.from(typesByAbility.Q),
        W: Array.from(typesByAbility.W),
        E: Array.from(typesByAbility.E),
        R: Array.from(typesByAbility.R)
      }
    };
  }

  function hasOwnHealthScaling(detailEn) {
    const hasScaling = false;
    const scalingByAbility = { Q: false, W: false, E: false, R: false };
    
    // ищем скейлы от собственного здоровья по vars.link
    const links = new Set();
    const collect = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const v of arr) {
        if (v && typeof v.link === "string") links.add(v.link.toLowerCase());
      }
    };
    
    // В современных версиях Data Dragon vars[] пустые, поэтому также ищем плейсхолдеры в тексте
    const healthPlaceholders = [
      'maxhealth', 'bonushealth', 'missinghealthpercent', 'missinghealthdamage',
      'percenthealth', 'percentmaxhealth', 'maxhealthpercent', 'maxhealthdamage',
      'percenthealthbase', 'percenthealthempowered', 'totalpercenthealth'
    ];
    
    const checkText = (text) => {
      if (!text) return false;
      const lower = text.toLowerCase();
      return healthPlaceholders.some(ph => lower.includes(`{{ ${ph}`));
    };
    
    // Проверяем все способности
    if (detailEn?.spells) {
      const abilityKeys = ['Q', 'W', 'E', 'R'];
      for (let i = 0; i < detailEn.spells.length && i < 4; i++) {
        const s = detailEn.spells[i];
        collect(s.vars);
        
        const hasVarsLink = ["health", "maxhealth", "bonushealth"].some(l => links.has(l));
        const hasTextPlaceholder = checkText(s.tooltip) || checkText(s.description);
        
        if (hasVarsLink || hasTextPlaceholder) {
          scalingByAbility[abilityKeys[i]] = true;
        }
      }
    }
    
    // Проверяем пассивку (считаем что это общий скейл)
    if (detailEn?.passive && checkText(detailEn.passive.description)) {
      // Если пассивка имеет скейл, считаем что чемпион в целом имеет его
      Object.keys(scalingByAbility).forEach(k => scalingByAbility[k] = true);
    }
    
    const hasAnyScaling = Object.values(scalingByAbility).some(v => v);
    
    return {
      hasScaling: hasAnyScaling,
      scalingByAbility
    };
  }

  function mapRoleTagsLowercase(tags) {
    if (!Array.isArray(tags)) return [];
    return tags.map(t => String(t).toLowerCase()); // e.g., ["tank","fighter"]
  }

  function buildAbilities(detail, detailEn, isRussian = true) {
    if (!detail) return { passive: null, spells: [] };
    const spells = [];
    if (Array.isArray(detail.spells)) {
      const labels = ["Q", "W", "E", "R"];
      for (let i = 0; i < detail.spells.length; i++) {
        const s = detail.spells[i];
        const sEn = Array.isArray(detailEn?.spells) ? detailEn.spells[i] : null;
        spells.push({
          key: labels[i] || "",
          name: s?.name || "",
          descHtml: fillPlaceholdersInText(s?.tooltip || s?.description || "", sEn, s, isRussian),
          icon: s?.image?.full ? getSpellIcon(state.version, s.image.full) : null
        });
      }
    }
    const passive = detail.passive ? {
      name: detail.passive.name || "",
      descHtml: fillPlaceholdersInText(detail.passive.description || "", detailEn?.passive, detail.passive, isRussian),
      icon: detail.passive.image?.full ? getPassiveIcon(state.version, detail.passive.image.full) : null
    } : null;
    return { passive, spells };
  }

  async function loadAllChampionDetails(indexData) {
    const entries = Object.values(indexData);
    const results = [];

    // простая ограниченная параллельность
    let i = 0;
    async function worker() {
      while (i < entries.length) {
        const item = entries[i++];
        try {
          const [detailEn, detailRu] = await Promise.all([
            loadChampionDetailByLocale(item.id, LOCALE),
            loadChampionDetailByLocale(item.id, RU_LOCALE)
          ]);
          const tagsData = accumulateChampionTags(detailEn);
          const classTags = mapRoleTagsLowercase(item.tags);
          const damageTypesData = extractDamageTypesFromDetailEN(detailEn);
          const scalesData = hasOwnHealthScaling(detailEn);
          const ruAbilities = buildAbilities(detailRu, detailEn, true);
          const enAbilities = buildAbilities(detailEn, detailEn, false);
          const nameEn = detailEn?.name || item.id;
          const titleEn = detailEn?.title || "";
          const nameRu = detailRu?.name || nameEn;
          const titleRu = detailRu?.title || titleEn;
          // spell ranges
          let spellRanges = { Q: 0, W: 0, E: 0, R: 0 };
          if (Array.isArray(detailEn?.spells)) {
            const labels = ["Q", "W", "E", "R"];
            for (let si = 0; si < detailEn.spells.length && si < 4; si++) {
              const s = detailEn.spells[si];
              const val = parseRangeValue(s.range, s.rangeBurn);
              spellRanges[labels[si]] = Number.isFinite(val) ? val : 0;
            }
          }
          const champ = {
            id: item.id,
            name: nameEn,
            nameRu,
            title: titleEn,
            titleRu,
            image: getChampionIcon(state.version, item.image.full),
            attackRange: item.stats?.attackrange ?? 125,
            tags: tagsData.tags,
            tagsByAbility: tagsData.tagsByAbility,
            classTags,
            damageTypes: damageTypesData.types,
            damageTypesByAbility: damageTypesData.typesByAbility,
            scalesWithOwnHealth: scalesData.hasScaling,
            healthScalingByAbility: scalesData.scalingByAbility,
            ru: ruAbilities,
            en: enAbilities,
            spellRanges
          };
          results.push(champ);
          setStatus(`Загружено чемпионов: ${results.length}/${entries.length}`);
        } catch (e) {
          console.warn("Failed to load detail for", item.id, e);
        }
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  function readFiltersFromUI() {
    // Ability filters with Q/W/E/R specificity
    const abilityFilters = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
    for (const filter of abilityFilters) {
      const mainChecked = els.checkboxes[filter].checked;
      const qChecked = qs(`#filter-${filter}-q`)?.checked || false;
      const wChecked = qs(`#filter-${filter}-w`)?.checked || false;
      const eChecked = qs(`#filter-${filter}-e`)?.checked || false;
      const rChecked = qs(`#filter-${filter}-r`)?.checked || false;
      
      state.filters[filter] = mainChecked || qChecked || wChecked || eChecked || rChecked;
      state.filters[`${filter}Q`] = qChecked;
      state.filters[`${filter}W`] = wChecked;
      state.filters[`${filter}E`] = eChecked;
      state.filters[`${filter}R`] = rChecked;
    }
    
    // Damage type filters with Q/W/E/R specificity
    const dmgTypes = ['dmgPhysical', 'dmgMagic', 'scalesHealth'];
    for (const filter of dmgTypes) {
      const id = filter === 'dmgPhysical' ? 'dmg-physical' : 
                 filter === 'dmgMagic' ? 'dmg-magic' : 'scales-health';
      const mainChecked = els.checkboxes[filter].checked;
      const qChecked = qs(`#${id}-q`)?.checked || false;
      const wChecked = qs(`#${id}-w`)?.checked || false;
      const eChecked = qs(`#${id}-e`)?.checked || false;
      const rChecked = qs(`#${id}-r`)?.checked || false;
      
      state.filters[filter] = mainChecked || qChecked || wChecked || eChecked || rChecked;
      state.filters[`${filter}Q`] = qChecked;
      state.filters[`${filter}W`] = wChecked;
      state.filters[`${filter}E`] = eChecked;
      state.filters[`${filter}R`] = rChecked;
    }
    
    // roles
    state.filters.roleTank = els.checkboxes.roleTank.checked;
    state.filters.roleFighter = els.checkboxes.roleFighter.checked;
    state.filters.roleMage = els.checkboxes.roleMage.checked;
    state.filters.roleMarksman = els.checkboxes.roleMarksman.checked;
    state.filters.roleAssassin = els.checkboxes.roleAssassin.checked;
    state.filters.roleSupport = els.checkboxes.roleSupport.checked;
    
    // range sliders
    state.filters.minRange = Number(els.minRange.value) || 0;
    state.filters.minRangeQ = Number(els.minRangeQ.value) || 0;
    state.filters.minRangeW = Number(els.minRangeW.value) || 0;
    state.filters.minRangeE = Number(els.minRangeE.value) || 0;
    state.filters.minRangeR = Number(els.minRangeR.value) || 0;
    els.minRangeValue.textContent = String(state.filters.minRange);
    els.minRangeQValue.textContent = String(state.filters.minRangeQ);
    els.minRangeWValue.textContent = String(state.filters.minRangeW);
    els.minRangeEValue.textContent = String(state.filters.minRangeE);
    els.minRangeRValue.textContent = String(state.filters.minRangeR);
  }

  function championMatchesFilters(champion) {
    // Search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      const nameEn = (champion.name || '').toLowerCase();
      const nameRu = (champion.nameRu || '').toLowerCase();
      if (!nameEn.includes(query) && !nameRu.includes(query)) {
        return false;
      }
    }
    
    // Range filters
    if (state.filters.minRange > 0 && (champion.attackRange ?? 0) < state.filters.minRange) {
      return false;
    }
    if (state.filters.minRangeQ > 0 && (champion.spellRanges?.Q ?? 0) < state.filters.minRangeQ) return false;
    if (state.filters.minRangeW > 0 && (champion.spellRanges?.W ?? 0) < state.filters.minRangeW) return false;
    if (state.filters.minRangeE > 0 && (champion.spellRanges?.E ?? 0) < state.filters.minRangeE) return false;
    if (state.filters.minRangeR > 0 && (champion.spellRanges?.R ?? 0) < state.filters.minRangeR) return false;
    
    // Ability tag filters with Q/W/E/R specificity
    const abilityTags = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
    for (const tag of abilityTags) {
      const anySelected = state.filters[tag];
      if (!anySelected) continue;
      
      // Check if specific abilities are required
      const qRequired = state.filters[`${tag}Q`];
      const wRequired = state.filters[`${tag}W`];
      const eRequired = state.filters[`${tag}E`];
      const rRequired = state.filters[`${tag}R`];
      
      const hasSpecificRequirements = qRequired || wRequired || eRequired || rRequired;
      
      if (hasSpecificRequirements) {
        // If specific abilities are required, check each one
        if (qRequired && !champion.tagsByAbility?.Q?.includes(tag)) return false;
        if (wRequired && !champion.tagsByAbility?.W?.includes(tag)) return false;
        if (eRequired && !champion.tagsByAbility?.E?.includes(tag)) return false;
        if (rRequired && !champion.tagsByAbility?.R?.includes(tag)) return false;
      } else {
        // If only general checkbox is selected, check if champion has it at all
        if (!champion.tags.includes(tag)) return false;
      }
    }
    
    // Damage type filters with Q/W/E/R specificity
    const checkDamageType = (filterName, typeName) => {
      const anySelected = state.filters[filterName];
      if (!anySelected) return true;
      
      const qRequired = state.filters[`${filterName}Q`];
      const wRequired = state.filters[`${filterName}W`];
      const eRequired = state.filters[`${filterName}E`];
      const rRequired = state.filters[`${filterName}R`];
      
      const hasSpecificRequirements = qRequired || wRequired || eRequired || rRequired;
      
      if (hasSpecificRequirements) {
        if (qRequired && !champion.damageTypesByAbility?.Q?.includes(typeName)) return false;
        if (wRequired && !champion.damageTypesByAbility?.W?.includes(typeName)) return false;
        if (eRequired && !champion.damageTypesByAbility?.E?.includes(typeName)) return false;
        if (rRequired && !champion.damageTypesByAbility?.R?.includes(typeName)) return false;
      } else {
        if (!champion.damageTypes?.includes(typeName)) return false;
      }
      return true;
    };
    
    if (!checkDamageType('dmgPhysical', 'physical')) return false;
    if (!checkDamageType('dmgMagic', 'magic')) return false;
    
    // Health scaling filter with Q/W/E/R specificity
    if (state.filters.scalesHealth) {
      const qRequired = state.filters.scalesHealthQ;
      const wRequired = state.filters.scalesHealthW;
      const eRequired = state.filters.scalesHealthE;
      const rRequired = state.filters.scalesHealthR;
      
      const hasSpecificRequirements = qRequired || wRequired || eRequired || rRequired;
      
      if (hasSpecificRequirements) {
        if (qRequired && !champion.healthScalingByAbility?.Q) return false;
        if (wRequired && !champion.healthScalingByAbility?.W) return false;
        if (eRequired && !champion.healthScalingByAbility?.E) return false;
        if (rRequired && !champion.healthScalingByAbility?.R) return false;
      } else {
        if (!champion.scalesWithOwnHealth) return false;
      }
    }
    
    // Role filters
    const selectedRoles = [];
    if (state.filters.roleTank) selectedRoles.push("tank");
    if (state.filters.roleFighter) selectedRoles.push("fighter");
    if (state.filters.roleMage) selectedRoles.push("mage");
    if (state.filters.roleMarksman) selectedRoles.push("marksman");
    if (state.filters.roleAssassin) selectedRoles.push("assassin");
    if (state.filters.roleSupport) selectedRoles.push("support");
    if (selectedRoles.length > 0) {
      const hasAnyRole = selectedRoles.some(r => champion.classTags?.includes(r));
      if (!hasAnyRole) return false;
    }
    
    return true;
  }

  function renderGrid(champions) {
    els.grid.innerHTML = "";
    if (!champions.length) {
      els.grid.innerHTML = `<div class="status">Ничего не найдено. Попробуйте ослабить фильтры.</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    for (const c of champions) {
      const card = document.createElement("article");
      card.className = "card";
      const splash = document.createElement("div");
      splash.className = "splash";
      splash.style.backgroundImage = `url('${c.image}')`;
      splash.style.cursor = "pointer";
      splash.title = "Открыть полную информацию";
      splash.addEventListener("click", () => openModalForChampion(c));

      const body = document.createElement("div");
      body.className = "card-body";
      const title = document.createElement("div");
      title.className = "title";
      const name = document.createElement("h3");
      name.className = "name";
      name.textContent = state.language === 'ru' ? c.nameRu : c.name;
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = `${c.attackRange}`;

      title.appendChild(name);
      title.appendChild(badge);
      const tagsWrap = document.createElement("div");
      tagsWrap.className = "tags";
      for (const t of c.tags) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = t;
        tagsWrap.appendChild(tag);
      }
      body.appendChild(title);
      body.appendChild(tagsWrap);

      card.appendChild(splash);
      card.appendChild(body);
      frag.appendChild(card);
    }
    els.grid.appendChild(frag);
  }

  function buildModalHtml(c) {
    const roleMap = {
      tank: t('roleTank'),
      fighter: t('roleFighter'),
      mage: t('roleMage'),
      marksman: t('roleMarksman'),
      assassin: t('roleAssassin'),
      support: t('roleSupport')
    };
    const roles = (c.classTags || []).map(r => roleMap[r] || r).join("</span><span class=\"chip\">");
    const dmg = (c.damageTypes || []).map(d => d === "physical" ? t('dmgPhysical') : d === "magic" ? t('dmgMagic') : d).join("</span><span class=\"chip\">");

    const formatRangeNote = (val) => {
      if (!Number.isFinite(val) || val <= 0) return "";
      if (val >= 40000) return `${t('range')}: ${state.language === 'ru' ? 'глобальная' : 'global'}`;
      return `${t('range')}: ${val}`;
    };

    const champName = state.language === 'ru' ? c.nameRu : c.name;
    const champTitle = state.language === 'ru' ? c.titleRu : c.title;

    const header = `
      <div class="modal-header">
        <img class="avatar" src="${c.image}" alt="">
        <div>
          <h2 id="modal-title" class="modal-title">${champName}</h2>
          <div class="modal-subtitle">${champTitle}</div>
          <div class="chips">
            ${roles ? `<span class="chip">${roles}</span>` : ""}
            ${dmg ? `<span class="chip">${dmg}</span>` : ""}
            <span class="chip">${t('attackRange')}: ${c.attackRange}</span>
            ${c.scalesWithOwnHealth ? `<span class="chip">${t('scalesHealth')}</span>` : ""}
          </div>
        </div>
      </div>
    `;

    const abilityData = state.language === 'ru' ? c.ru : c.en;
    
    const abilities = [];
    if (abilityData?.passive) {
      abilities.push(`
        <div class="ability">
          <div class="row">
            ${abilityData.passive.icon ? `<img src="${abilityData.passive.icon}" alt="">` : ""}
            <span class="label">${t('passive').toUpperCase()}:</span>
            <span class="aname">${abilityData.passive.name}</span>
          </div>
          <div class="desc">${abilityData.passive.descHtml}</div>
        </div>
      `);
    }
    if (Array.isArray(abilityData?.spells)) {
      for (const s of abilityData.spells) {
        const rng = c.spellRanges?.[s.key] ?? 0;
        const rangeNote = formatRangeNote(rng);
        abilities.push(`
          <div class="ability">
            <div class="row">
              ${s.icon ? `<img src="${s.icon}" alt="">` : ""}
              <span class="label">${s.key}:</span>
              <span class="aname">${s.name}</span>
              ${rangeNote ? `<span class="range-note">${rangeNote}</span>` : ""}
            </div>
            <div class="desc">${s.descHtml}</div>
          </div>
        `);
      }
    }

    return `
      ${header}
      <div class="modal-section">
        <div class="modal-block">
          <h4>${t('abilitiesTitle')}</h4>
          ${abilities.join("")}
        </div>
      </div>
    `;
  }

  function fitModalScale() {
    if (!els.modal || !els.modalScale) return;
    // сброс масштаба
    els.modalScale.style.transform = "scale(1)";
    // желаемая ширина модалки — 1000px, но не больше 96vw
    const desiredW = Math.min(1000, Math.floor(window.innerWidth * 0.96));
    els.modal.style.width = `${desiredW}px`;
    // высоту будем ставить вручную по рассчитанному контенту

    const margin = 24; // inset 12px * 2
    const cw = els.modalScale.scrollWidth;
    const ch = els.modalScale.scrollHeight;
    const vw = desiredW - margin; // доступная ширина для контента
    const maxH = Math.floor(window.innerHeight * 0.96) - margin;
    const sW = vw / cw;
    const sH = maxH / ch;
    const s = Math.min(1, sW, sH);
    els.modalScale.style.transform = `scale(${s})`;
    // выставляем итоговую высоту модального окна
    const finalH = Math.ceil(ch * s + margin);
    els.modal.style.height = `${finalH}px`;
  }

  function openModalForChampion(c) {
    state.currentModalChampion = c;
    els.modalContent.innerHTML = buildModalHtml(c);
    els.modalRoot.classList.add("open");
    document.body.classList.add("modal-open");
    // подождать рендер и вписать
    requestAnimationFrame(() => {
      fitModalScale();
      // повторные пересчёты после загрузки иконок
      setTimeout(fitModalScale, 60);
      setTimeout(fitModalScale, 200);
    });
  }

  function closeModal() {
    els.modalRoot.classList.remove("open");
    document.body.classList.remove("modal-open");
    els.modalContent.innerHTML = "";
    state.currentModalChampion = null;
  }

  function bindModalEvents() {
    els.modalRoot.addEventListener("click", (e) => {
      const target = e.target;
      if (target instanceof HTMLElement && (target.dataset.close === "true" || target.classList.contains("modal-close"))) {
        closeModal();
      }
    });
    els.modalClose.addEventListener("click", closeModal);
    window.addEventListener("resize", fitModalScale);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modalRoot.classList.contains("open")) closeModal();
    });
  }

  function updateFilterBadgesAndDisable() {
    // Получаем текущие выбранные фильтры
    const currentFilters = { ...state.filters };
    
    const abilityFilters = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
    const dmgFilters = [
      { key: 'dmgPhysical', type: 'physical' },
      { key: 'dmgMagic', type: 'magic' }
    ];
    const scalesFilter = { key: 'scalesHealth', type: 'health' };
    const roleFilters = ['roleTank', 'roleFighter', 'roleMage', 'roleMarksman', 'roleAssassin', 'roleSupport'];
    
    // Для каждого фильтра способностей
    for (const filter of abilityFilters) {
      // Создаем временные фильтры с добавлением текущего фильтра
      const testFilters = { ...currentFilters, [filter]: true };
      
      // Считаем сколько чемпионов пройдет фильтр
      let count = 0;
      for (const champ of state.champions) {
        if (championMatchesFiltersWithOverride(champ, testFilters)) {
          count++;
        }
      }
      
      // Обновляем бейдж
      const badge = document.querySelector(`.filter-badge[data-filter="${filter}"]`);
      if (badge) badge.textContent = count;
      
      // Проверяем Q/W/E/R чекбоксы
      const abilities = ['q', 'w', 'e', 'r'];
      const disabledStates = [];
      for (const ability of abilities) {
        const abilityKey = `${filter}${ability.toUpperCase()}`;
        const testFiltersAbility = { 
          ...currentFilters, 
          [filter]: true,
          [abilityKey]: true 
        };
        
        let countAbility = 0;
        for (const champ of state.champions) {
          if (championMatchesFiltersWithOverride(champ, testFiltersAbility)) {
            countAbility++;
          }
        }
        
        const checkbox = qs(`#filter-${filter}-${ability}`);
        if (checkbox) {
          checkbox.disabled = countAbility === 0;
          disabledStates.push(countAbility === 0);
        }
      }
      
      // Если все Q/W/E/R disabled, делаем disabled всю строку
      const allDisabled = disabledStates.length === 4 && disabledStates.every(d => d === true);
      const mainCheckbox = qs(`#filter-${filter}`);
      const mainLabel = mainCheckbox ? mainCheckbox.nextElementSibling : null;
      if (mainCheckbox) {
        mainCheckbox.disabled = allDisabled;
        if (allDisabled) mainCheckbox.checked = false;
      }
      if (mainLabel) {
        mainLabel.style.opacity = allDisabled ? '0.4' : '1';
        mainLabel.style.cursor = allDisabled ? 'not-allowed' : 'pointer';
      }
    }
    
    // Для фильтров урона
    for (const dmgFilter of dmgFilters) {
      const testFilters = { ...currentFilters, [dmgFilter.key]: true };
      
      let count = 0;
      for (const champ of state.champions) {
        if (championMatchesFiltersWithOverride(champ, testFilters)) {
          count++;
        }
      }
      
      const badge = document.querySelector(`.filter-badge[data-filter="${dmgFilter.key}"]`);
      if (badge) badge.textContent = count;
      
      // Проверяем Q/W/E/R чекбоксы
      const abilities = ['q', 'w', 'e', 'r'];
      const id = dmgFilter.key === 'dmgPhysical' ? 'dmg-physical' : 'dmg-magic';
      const disabledStates = [];
      for (const ability of abilities) {
        const abilityKey = `${dmgFilter.key}${ability.toUpperCase()}`;
        const testFiltersAbility = { 
          ...currentFilters, 
          [dmgFilter.key]: true,
          [abilityKey]: true 
        };
        
        let countAbility = 0;
        for (const champ of state.champions) {
          if (championMatchesFiltersWithOverride(champ, testFiltersAbility)) {
            countAbility++;
          }
        }
        
        const checkbox = qs(`#${id}-${ability}`);
        if (checkbox) {
          checkbox.disabled = countAbility === 0;
          disabledStates.push(countAbility === 0);
        }
      }
      
      // Если все Q/W/E/R disabled, делаем disabled всю строку
      const allDisabled = disabledStates.length === 4 && disabledStates.every(d => d === true);
      const mainCheckbox = qs(`#${id}`);
      const mainLabel = mainCheckbox ? mainCheckbox.nextElementSibling : null;
      if (mainCheckbox) {
        mainCheckbox.disabled = allDisabled;
        if (allDisabled) mainCheckbox.checked = false;
      }
      if (mainLabel) {
        mainLabel.style.opacity = allDisabled ? '0.4' : '1';
        mainLabel.style.cursor = allDisabled ? 'not-allowed' : 'pointer';
      }
    }
    
    // Для фильтра здоровья
    const testFilters = { ...currentFilters, [scalesFilter.key]: true };
    let count = 0;
    for (const champ of state.champions) {
      if (championMatchesFiltersWithOverride(champ, testFilters)) {
        count++;
      }
    }
    
    const badge = document.querySelector(`.filter-badge[data-filter="${scalesFilter.key}"]`);
    if (badge) badge.textContent = count;
    
    // Проверяем Q/W/E/R чекбоксы для здоровья
    const abilities = ['q', 'w', 'e', 'r'];
    const disabledStatesHealth = [];
    for (const ability of abilities) {
      const abilityKey = `${scalesFilter.key}${ability.toUpperCase()}`;
      const testFiltersAbility = { 
        ...currentFilters, 
        [scalesFilter.key]: true,
        [abilityKey]: true 
      };
      
      let countAbility = 0;
      for (const champ of state.champions) {
        if (championMatchesFiltersWithOverride(champ, testFiltersAbility)) {
          countAbility++;
        }
      }
      
      const checkbox = qs(`#scales-health-${ability}`);
      if (checkbox) {
        checkbox.disabled = countAbility === 0;
        disabledStatesHealth.push(countAbility === 0);
      }
    }
    
    // Если все Q/W/E/R disabled, делаем disabled всю строку
    const allDisabledHealth = disabledStatesHealth.length === 4 && disabledStatesHealth.every(d => d === true);
    const mainCheckboxHealth = qs(`#scales-health`);
    const mainLabelHealth = mainCheckboxHealth ? mainCheckboxHealth.nextElementSibling : null;
    if (mainCheckboxHealth) {
      mainCheckboxHealth.disabled = allDisabledHealth;
      if (allDisabledHealth) mainCheckboxHealth.checked = false;
    }
    if (mainLabelHealth) {
      mainLabelHealth.style.opacity = allDisabledHealth ? '0.4' : '1';
      mainLabelHealth.style.cursor = allDisabledHealth ? 'not-allowed' : 'pointer';
    }
    
    // Для фильтров ролей
    for (const roleFilter of roleFilters) {
      // Создаем копию фильтров БЕЗ других ролей, только с текущей проверяемой ролью
      const testFilters = { ...currentFilters };
      // Убираем все роли
      for (const rf of roleFilters) {
        delete testFilters[rf];
      }
      // Добавляем только проверяемую роль
      testFilters[roleFilter] = true;
      
      let count = 0;
      for (const champ of state.champions) {
        if (championMatchesFiltersWithOverride(champ, testFilters)) {
          count++;
        }
      }
      
      const badge = document.querySelector(`.filter-badge[data-filter="${roleFilter}"]`);
      if (badge) badge.textContent = count;
      
      // Делаем disabled роль, если по ней нет чемпионов
      const roleId = roleFilter.replace('role', 'role-').toLowerCase().replace('role-', 'role-');
      let checkboxId = '';
      if (roleFilter === 'roleTank') checkboxId = 'role-tank';
      else if (roleFilter === 'roleFighter') checkboxId = 'role-fighter';
      else if (roleFilter === 'roleMage') checkboxId = 'role-mage';
      else if (roleFilter === 'roleMarksman') checkboxId = 'role-marksman';
      else if (roleFilter === 'roleAssassin') checkboxId = 'role-assassin';
      else if (roleFilter === 'roleSupport') checkboxId = 'role-support';
      
      const roleCheckbox = qs(`#${checkboxId}`);
      const roleLabel = roleCheckbox ? roleCheckbox.nextElementSibling : null;
      if (roleCheckbox) {
        roleCheckbox.disabled = count === 0;
        if (count === 0) roleCheckbox.checked = false;
      }
      if (roleLabel) {
        roleLabel.style.opacity = count === 0 ? '0.4' : '1';
        roleLabel.style.cursor = count === 0 ? 'not-allowed' : 'pointer';
      }
    }
  }
  
  function championMatchesFiltersWithOverride(champion, filters) {
    // Копия championMatchesFilters но с переданными фильтрами
    // Search filter (всегда учитывается из state)
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      const nameEn = (champion.name || '').toLowerCase();
      const nameRu = (champion.nameRu || '').toLowerCase();
      if (!nameEn.includes(query) && !nameRu.includes(query)) {
        return false;
      }
    }
    
    // Range filters
    if (filters.minRange > 0 && (champion.attackRange ?? 0) < filters.minRange) {
      return false;
    }
    if (filters.minRangeQ > 0 && (champion.spellRanges?.Q ?? 0) < filters.minRangeQ) return false;
    if (filters.minRangeW > 0 && (champion.spellRanges?.W ?? 0) < filters.minRangeW) return false;
    if (filters.minRangeE > 0 && (champion.spellRanges?.E ?? 0) < filters.minRangeE) return false;
    if (filters.minRangeR > 0 && (champion.spellRanges?.R ?? 0) < filters.minRangeR) return false;
    
    // Ability tag filters with Q/W/E/R specificity
    const abilityTags = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
    for (const tag of abilityTags) {
      const anySelected = filters[tag];
      if (!anySelected) continue;
      
      const qRequired = filters[`${tag}Q`];
      const wRequired = filters[`${tag}W`];
      const eRequired = filters[`${tag}E`];
      const rRequired = filters[`${tag}R`];
      
      const hasSpecificRequirements = qRequired || wRequired || eRequired || rRequired;
      
      if (hasSpecificRequirements) {
        if (qRequired && !champion.tagsByAbility?.Q?.includes(tag)) return false;
        if (wRequired && !champion.tagsByAbility?.W?.includes(tag)) return false;
        if (eRequired && !champion.tagsByAbility?.E?.includes(tag)) return false;
        if (rRequired && !champion.tagsByAbility?.R?.includes(tag)) return false;
      } else {
        if (!champion.tags.includes(tag)) return false;
      }
    }
    
    // Damage type filters with Q/W/E/R specificity
    const checkDamageType = (filterName, typeName) => {
      const anySelected = filters[filterName];
      if (!anySelected) return true;
      
      const qRequired = filters[`${filterName}Q`];
      const wRequired = filters[`${filterName}W`];
      const eRequired = filters[`${filterName}E`];
      const rRequired = filters[`${filterName}R`];
      
      const hasSpecificRequirements = qRequired || wRequired || eRequired || rRequired;
      
      if (hasSpecificRequirements) {
        if (qRequired && !champion.damageTypesByAbility?.Q?.includes(typeName)) return false;
        if (wRequired && !champion.damageTypesByAbility?.W?.includes(typeName)) return false;
        if (eRequired && !champion.damageTypesByAbility?.E?.includes(typeName)) return false;
        if (rRequired && !champion.damageTypesByAbility?.R?.includes(typeName)) return false;
      } else {
        if (!champion.damageTypes?.includes(typeName)) return false;
      }
      return true;
    };
    
    if (!checkDamageType('dmgPhysical', 'physical')) return false;
    if (!checkDamageType('dmgMagic', 'magic')) return false;
    
    // Health scaling filter with Q/W/E/R specificity
    if (filters.scalesHealth) {
      const qRequired = filters.scalesHealthQ;
      const wRequired = filters.scalesHealthW;
      const eRequired = filters.scalesHealthE;
      const rRequired = filters.scalesHealthR;
      
      const hasSpecificRequirements = qRequired || wRequired || eRequired || rRequired;
      
      if (hasSpecificRequirements) {
        if (qRequired && !champion.healthScalingByAbility?.Q) return false;
        if (wRequired && !champion.healthScalingByAbility?.W) return false;
        if (eRequired && !champion.healthScalingByAbility?.E) return false;
        if (rRequired && !champion.healthScalingByAbility?.R) return false;
      } else {
        if (!champion.scalesWithOwnHealth) return false;
      }
    }
    
    // Role filters
    const selectedRoles = [];
    if (filters.roleTank) selectedRoles.push("tank");
    if (filters.roleFighter) selectedRoles.push("fighter");
    if (filters.roleMage) selectedRoles.push("mage");
    if (filters.roleMarksman) selectedRoles.push("marksman");
    if (filters.roleAssassin) selectedRoles.push("assassin");
    if (filters.roleSupport) selectedRoles.push("support");
    if (selectedRoles.length > 0) {
      const hasAnyRole = selectedRoles.some(r => champion.classTags?.includes(r));
      if (!hasAnyRole) return false;
    }
    
    return true;
  }
  
  function updateUILanguage() {
    // Update all elements with data-i18n attribute
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    
    // Update search placeholder
    const searchInput = qs("#search-input");
    if (searchInput) {
      searchInput.placeholder = t('searchPlaceholder');
    }
    
    // Update filter labels
    const filterLabels = {
      'filter-mobility': 'mobility',
      'filter-stun': 'stun',
      'filter-slow': 'slow',
      'filter-root': 'root',
      'filter-knockup': 'knockup',
      'filter-silence': 'silence',
      'filter-stealth': 'stealth',
      'filter-attackspeed': 'attackspeed',
      'filter-movespeed': 'movespeed',
      'filter-shield': 'shield',
      'filter-heal': 'heal',
      'filter-pull': 'pull',
      'filter-lifesteal': 'lifesteal',
      'dmg-physical': 'dmgPhysical',
      'dmg-magic': 'dmgMagic',
      'scales-health': 'scalesHealth',
      'role-tank': 'roleTank',
      'role-fighter': 'roleFighter',
      'role-mage': 'roleMage',
      'role-marksman': 'roleMarksman',
      'role-assassin': 'roleAssassin',
      'role-support': 'roleSupport'
    };
    
    for (const [id, key] of Object.entries(filterLabels)) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) label.textContent = t(key);
    }
    
    // Update range labels with values
    const minRangeLabel = qs('label[for="min-range"]');
    if (minRangeLabel) {
      const valueSpan = minRangeLabel.querySelector('#min-range-value');
      const value = valueSpan ? valueSpan.textContent : '0';
      minRangeLabel.innerHTML = `${t('minAttackRange')}: <span id="min-range-value">${value}</span>`;
    }
    
    const minRangeQLabel = qs('label[for="min-range-q"]');
    if (minRangeQLabel) {
      const valueSpan = minRangeQLabel.querySelector('#min-range-q-value');
      const value = valueSpan ? valueSpan.textContent : '0';
      minRangeQLabel.innerHTML = `${t('minRangeQ')}: <span id="min-range-q-value">${value}</span>`;
    }
    
    const minRangeWLabel = qs('label[for="min-range-w"]');
    if (minRangeWLabel) {
      const valueSpan = minRangeWLabel.querySelector('#min-range-w-value');
      const value = valueSpan ? valueSpan.textContent : '0';
      minRangeWLabel.innerHTML = `${t('minRangeW')}: <span id="min-range-w-value">${value}</span>`;
    }
    
    const minRangeELabel = qs('label[for="min-range-e"]');
    if (minRangeELabel) {
      const valueSpan = minRangeELabel.querySelector('#min-range-e-value');
      const value = valueSpan ? valueSpan.textContent : '0';
      minRangeELabel.innerHTML = `${t('minRangeE')}: <span id="min-range-e-value">${value}</span>`;
    }
    
    const minRangeRLabel = qs('label[for="min-range-r"]');
    if (minRangeRLabel) {
      const valueSpan = minRangeRLabel.querySelector('#min-range-r-value');
      const value = valueSpan ? valueSpan.textContent : '0';
      minRangeRLabel.innerHTML = `${t('minRangeR')}: <span id="min-range-r-value">${value}</span>`;
    }
    
    // Обновляем ссылки на элементы после изменения innerHTML
    els.minRangeValue = qs("#min-range-value");
    els.minRangeQValue = qs("#min-range-q-value");
    els.minRangeWValue = qs("#min-range-w-value");
    els.minRangeEValue = qs("#min-range-e-value");
    els.minRangeRValue = qs("#min-range-r-value");
    
    // Update modal if it's open
    if (state.currentModalChampion) {
      els.modalContent.innerHTML = buildModalHtml(state.currentModalChampion);
      requestAnimationFrame(() => {
        fitModalScale();
        setTimeout(fitModalScale, 60);
      });
    }
  }
  
  function applyFiltersAndRender() {
    readFiltersFromUI();
    const filtered = state.champions.filter(championMatchesFilters);
    setStatus(`${t('found')}: ${filtered.length} ${t('of')} ${state.champions.length}`);
    renderGrid(filtered);
    updateFilterBadgesAndDisable();
  }

  function bindUI() {
    els.checkboxes.mobility = qs("#filter-mobility");
    els.checkboxes.stun = qs("#filter-stun");
    els.checkboxes.slow = qs("#filter-slow");
    els.checkboxes.root = qs("#filter-root");
    els.checkboxes.knockup = qs("#filter-knockup");
    els.checkboxes.silence = qs("#filter-silence");
    els.checkboxes.stealth = qs("#filter-stealth");
    els.checkboxes.attackspeed = qs("#filter-attackspeed");
    els.checkboxes.movespeed = qs("#filter-movespeed");
    els.checkboxes.shield = qs("#filter-shield");
    els.checkboxes.heal = qs("#filter-heal");
    els.checkboxes.pull = qs("#filter-pull");
    els.checkboxes.lifesteal = qs("#filter-lifesteal");
    // roles
    els.checkboxes.roleTank = qs("#role-tank");
    els.checkboxes.roleFighter = qs("#role-fighter");
    els.checkboxes.roleMage = qs("#role-mage");
    els.checkboxes.roleMarksman = qs("#role-marksman");
    els.checkboxes.roleAssassin = qs("#role-assassin");
    els.checkboxes.roleSupport = qs("#role-support");
    // damage types
    els.checkboxes.dmgPhysical = qs("#dmg-physical");
    els.checkboxes.dmgMagic = qs("#dmg-magic");
    // scaling
    els.checkboxes.scalesHealth = qs("#scales-health");
    els.minRange = qs("#min-range");
    els.minRangeValue = qs("#min-range-value");
    els.minRangeQ = qs("#min-range-q");
    els.minRangeQValue = qs("#min-range-q-value");
    els.minRangeW = qs("#min-range-w");
    els.minRangeWValue = qs("#min-range-w-value");
    els.minRangeE = qs("#min-range-e");
    els.minRangeEValue = qs("#min-range-e-value");
    els.minRangeR = qs("#min-range-r");
    els.minRangeRValue = qs("#min-range-r-value");
    els.resetBtn = qs("#reset-filters");
    // modal
    els.modalRoot = qs("#modal-root");
    els.modal = qs("#modal-root .modal");
    els.modalViewport = qs("#modal-root .modal-viewport");
    els.modalScale = qs("#modal-root .modal-scale");
    els.modalContent = qs("#modal-content");
    els.modalClose = qs("#modal-root .modal-close");
    bindModalEvents();

    // Mobile filters menu
    const filtersToggle = qs("#filters-toggle");
    const filtersPanel = qs("#filters-panel");
    const filtersClose = qs("#filters-close");
    const filtersBackdrop = qs("#filters-backdrop");

    function openFilters() {
      if (filtersPanel) filtersPanel.classList.add("open");
      if (filtersBackdrop) filtersBackdrop.classList.add("active");
      document.body.style.overflow = "hidden";
    }

    function closeFilters() {
      if (filtersPanel) filtersPanel.classList.remove("open");
      if (filtersBackdrop) filtersBackdrop.classList.remove("active");
      document.body.style.overflow = "";
    }

    if (filtersToggle) {
      filtersToggle.addEventListener("click", openFilters);
    }

    if (filtersClose) {
      filtersClose.addEventListener("click", closeFilters);
    }

    if (filtersBackdrop) {
      filtersBackdrop.addEventListener("click", closeFilters);
    }

    // Add event listeners for main checkboxes
    const abilityFilters = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
    for (const filter of abilityFilters) {
      const mainCheckbox = qs(`#filter-${filter}`);
      const abilities = ['q', 'w', 'e', 'r'];
      
      // Основной чекбокс сбрасывает все Q/W/E/R
      if (mainCheckbox) {
        mainCheckbox.addEventListener("change", (e) => {
          if (e.target.checked) {
            for (const ability of abilities) {
              const abilityCheckbox = qs(`#filter-${filter}-${ability}`);
              if (abilityCheckbox) abilityCheckbox.checked = false;
            }
          }
          applyFiltersAndRender();
        });
      }
      
      // Q/W/E/R чекбоксы сбрасывают основной
      for (const ability of abilities) {
        const checkbox = qs(`#filter-${filter}-${ability}`);
        if (checkbox) {
          checkbox.addEventListener("change", (e) => {
            // Если выбран Q/W/E/R чекбокс, снять основной чекбокс
            if (e.target.checked && mainCheckbox) {
              mainCheckbox.checked = false;
            }
            applyFiltersAndRender();
          });
        }
      }
    }
    
    // Обработчики для остальных чекбоксов (роли и т.д.)
    const dmgFilterIds = ['dmg-physical', 'dmg-magic', 'scales-health'];
    for (const el of Object.values(els.checkboxes)) {
      // Пропускаем ability фильтры и dmg фильтры, для них уже добавлены обработчики выше
      const id = el.id;
      if (id && (abilityFilters.some(f => id === `filter-${f}`) || dmgFilterIds.includes(id))) {
        continue;
      }
      el.addEventListener("change", applyFiltersAndRender);
    }
    
    // Add event listeners for damage type and health scaling Q/W/E/R checkboxes
    const dmgFilters = [
      { id: 'dmg-physical', main: 'dmg-physical' },
      { id: 'dmg-magic', main: 'dmg-magic' },
      { id: 'scales-health', main: 'scales-health' }
    ];
    for (const filter of dmgFilters) {
      const abilities = ['q', 'w', 'e', 'r'];
      const mainCheckbox = qs(`#${filter.main}`);
      
      // Основной чекбокс сбрасывает все Q/W/E/R
      if (mainCheckbox) {
        mainCheckbox.addEventListener("change", (e) => {
          if (e.target.checked) {
            for (const ability of abilities) {
              const abilityCheckbox = qs(`#${filter.id}-${ability}`);
              if (abilityCheckbox) abilityCheckbox.checked = false;
            }
          }
          applyFiltersAndRender();
        });
      }
      
      // Q/W/E/R чекбоксы сбрасывают основной
      for (const ability of abilities) {
        const checkbox = qs(`#${filter.id}-${ability}`);
        if (checkbox) {
          checkbox.addEventListener("change", (e) => {
            // Если выбран Q/W/E/R чекбокс, снять основной чекбокс
            if (e.target.checked && mainCheckbox) {
              mainCheckbox.checked = false;
            }
            applyFiltersAndRender();
          });
        }
      }
    }
    
    // Search input
    const searchInput = qs("#search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value.trim();
        applyFiltersAndRender();
      });
    }
    
    // Language toggle
    const langToggle = qs("#lang-toggle");
    if (langToggle) {
      langToggle.addEventListener("change", (e) => {
        state.language = e.target.checked ? 'ru' : 'en';
        updateUILanguage();
        applyFiltersAndRender();
      });
    }
    
    els.minRange.addEventListener("input", applyFiltersAndRender);
    els.minRangeQ.addEventListener("input", applyFiltersAndRender);
    els.minRangeW.addEventListener("input", applyFiltersAndRender);
    els.minRangeE.addEventListener("input", applyFiltersAndRender);
    els.minRangeR.addEventListener("input", applyFiltersAndRender);
    els.resetBtn.addEventListener("click", () => {
      // Reset search
      if (searchInput) {
        searchInput.value = '';
        state.searchQuery = '';
      }
      
      for (const el of Object.values(els.checkboxes)) el.checked = false;
      
      // Reset all Q/W/E/R ability checkboxes
      const abilityFilters = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
      for (const filter of abilityFilters) {
        const abilities = ['q', 'w', 'e', 'r'];
        for (const ability of abilities) {
          const checkbox = qs(`#filter-${filter}-${ability}`);
          if (checkbox) checkbox.checked = false;
        }
      }
      
      // Reset damage type and health scaling Q/W/E/R checkboxes
      const dmgFilters = ['dmg-physical', 'dmg-magic', 'scales-health'];
      for (const filter of dmgFilters) {
        const abilities = ['q', 'w', 'e', 'r'];
        for (const ability of abilities) {
          const checkbox = qs(`#${filter}-${ability}`);
          if (checkbox) checkbox.checked = false;
        }
      }
      
      els.minRange.value = "0";
      els.minRangeQ.value = "0";
      els.minRangeW.value = "0";
      els.minRangeE.value = "0";
      els.minRangeR.value = "0";
      applyFiltersAndRender();
    });
  }

  async function init() {
    els.status = qs("#status");
    els.grid = qs("#grid");
    
    // Проверка языка браузера при старте
    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage];
    const hasRussian = browserLanguages.some(lang => lang.toLowerCase().startsWith('ru'));
    
    if (hasRussian) {
      state.language = 'ru';
      // Обновляем переключатель языка (checked=true для ru, false для en)
      const langToggle = qs("#lang-toggle");
      if (langToggle) {
        langToggle.checked = true;
      }
    }
    
    // Pre-load language file based on browser language
    const initialLocale = hasRussian ? RU_LOCALE : LOCALE;
    try {
      await loadLanguageFile(initialLocale);
    } catch (e) {
      console.warn("Failed to pre-load language file:", e);
    }
    
    bindUI();
    updateUILanguage(); // Применяем текущий язык к интерфейсу
    setStatus(t('detectingVersion'));
    state.version = await getLatestVersion();
    setStatus(`${t('versionDetected')}: ${state.version}. ${t('checkingCache')}`);
    if (tryLoadFromCache()) {
      applyFiltersAndRender();
      return;
    }
    setStatus(t('cacheNotFound'));
    try {
      state.championsIndex = await loadChampionsIndex();
    } catch (e) {
      setStatus("Failed to load champion list from Data Dragon.");
      throw e;
    }
    setStatus(t('loadingAbilities'));
    state.champions = await loadAllChampionDetails(state.championsIndex);
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        version: state.version,
        champions: state.champions
      }));
    } catch {}
    setStatus(`${t('ready')}: ${state.champions.length}. ${t('applyingFilters')}`);
    applyFiltersAndRender();
  }

  window.addEventListener("DOMContentLoaded", init);
})();


