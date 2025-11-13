(() => {
  const translations = {
    ru: {},
    en: {}
  };
  
  const uiTranslationsState = {
    ru: { loaded: false, loading: null },
    en: { loaded: false, loading: null }
  };
  
  async function loadUITranslations(lang) {
    const varName = `UI_TRANSLATIONS_${lang.toUpperCase()}`;
    
    if (window[varName]) {
      translations[lang] = window[varName];
      uiTranslationsState[lang].loaded = true;
      return;
    }
    
    if (uiTranslationsState[lang].loading) {
      return uiTranslationsState[lang].loading;
    }
    
    uiTranslationsState[lang].loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `translations/ui_translations_${lang}.js`;
      script.onload = () => {
        if (window[varName]) {
          translations[lang] = window[varName];
        }
        uiTranslationsState[lang].loaded = true;
        uiTranslationsState[lang].loading = null;
        resolve();
      };
      script.onerror = () => {
        uiTranslationsState[lang].loading = null;
        reject(new Error(`Failed to load ${varName}`));
      };
      document.head.appendChild(script);
    });
    
    return uiTranslationsState[lang].loading;
  }
  
  const PLACEHOLDER_RANGE_THRESHOLD = 20000;
  
  const state = {
    version: null,
    championsIndex: null,
    champions: [],
    language: 'en',
    searchQuery: '',
    currentModalChampion: null,
    rangeBounds: null,
    dpsBounds: null,
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
      minRange: 0,
      minRangeQ: 0,
      minRangeW: 0,
      minRangeE: 0,
      minRangeR: 0,
      minDps0: 0,
      minDps18: 0
    }
  };

  const ABILITY_KEYS = ["Q", "W", "E", "R"];
  
  function t(key) {
    const lang = state.language || 'en';
    const langTranslations = window[`UI_TRANSLATIONS_${lang.toUpperCase()}`] || translations[lang];
    const translation = langTranslations && langTranslations[key];
    return translation || key;
  }

  const els = {
    status: null,
    grid: null,
    minDps0: null,
    minDps0Value: null,
    minDps18: null,
    minDps18Value: null,
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

  const LOCAL_BASE = ".";
  const LOCALE = "en_US";
  const RU_LOCALE = "ru_RU";
  const FALLBACK_VERSION = "15.21.1";
  const CONCURRENCY = 10;
  const CACHE_KEY = "lol_champ_cache_v19";

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

  const languageState = {
    ru: { loaded: false, loading: null },
    en: { loaded: false, loading: null }
  };

  async function loadLanguageFile(locale) {
    const lang = locale === RU_LOCALE ? 'ru' : 'en';
    const varName = `LOL_CHAMPIONS_TEXT_${lang.toUpperCase()}`;
    
    if (window[varName]) {
      languageState[lang].loaded = true;
      return;
    }
    
    if (languageState[lang].loading) {
      return languageState[lang].loading;
    }
    
    languageState[lang].loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `translations/champion_text_${lang}.js`;
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
      ensureChampionDerivedStats(state.champions);
      normalizeSpellRangePlaceholders(state.champions);
      updateRangeSlidersFromChampions();
      updateDpsSlidersFromChampions();
      setStatus(`${t('cacheLoaded')} (${state.version}). ${t('found')}: ${state.champions.length}`);
      renderGrid(state.champions);
      return true;
    } catch {
      return false;
    }
  }

  async function loadChampionsIndex() {
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
    
    const fallbackDescriptionsRu = {
      "spellmodifierdescriptionappend": ""
    };
    
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
        
        const link = String(v?.link || "").toLowerCase();
        if (link && link !== "unknown") {
          dict[`bonus${link}`] = valStr;
          dict[`total${link}`] = valStr;
        }
      }
    };
    
    addDict(spellEn?.datavalues);
    addDict(spellRu?.datavalues);
    addVars(spellEn?.vars);
    addVars(spellRu?.vars);

    const effectBurn = spellEn?.effectBurn || spellRu?.effectBurn;
    if (Array.isArray(effectBurn)) {
      effectBurn.forEach((v, i) => {
        if (i === 0 || v == null) return;
        dict[`e${i}`] = v;
      });
    }
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
    
    const keysSnapshot = Object.keys(dict);
    for (const k of keysSnapshot) {
      if (!k.startsWith("total") && !k.startsWith("bonus") && !k.startsWith("base")) {
        if (!dict[`total${k}`]) dict[`total${k}`] = dict[k];
        if (!dict[`bonus${k}`]) dict[`bonus${k}`] = dict[k];
      }
    }

    result = result.replace(/\{\{\s*([a-z0-9_*+\-./]+)\s*\}\}/gi, (fullMatch, key) => {
      const keyLower = String(key).toLowerCase();
      
      let val = dict[keyLower];
      
      if (val == null) {
        let cleanKey = keyLower;
        if (cleanKey.includes('*')) {
          cleanKey = cleanKey.split('*')[0];
        }
        val = dict[cleanKey];
      }
      
      if (val != null) {
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
      
      if (isRussian) {
        const cleanKeyForFallback = keyLower.replace(/[*+\-./0-9\s]/g, '');
        const fallback = fallbackDescriptionsRu[keyLower] || fallbackDescriptionsRu[cleanKeyForFallback];
        
        if (fallback !== undefined) {
          if (fallback === "") {
            return "";
          } else {
            return fallback;
          }
        }
      }
      
      return fullMatch;
    });
    
    result = result.replace(/\s{2,}/g, ' ').trim();
    
    return result;
  }

  function parseRangeValue(rangeField, rangeBurnField) {
    let nums = [];
    const toStringLower = (v) => (typeof v === "string" ? v.toLowerCase() : "");

    const rf = toStringLower(rangeField);
    const rb = toStringLower(rangeBurnField);
    const isGlobal = rf.includes("global") || rf.includes("infinite") || rb.includes("global") || rb.includes("infinite");
    if (isGlobal) return 50000;

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

  function normalizeSpellRangePlaceholders(champions) {
    if (!Array.isArray(champions) || !champions.length) return;
    const fallbackPerAbility = {};
    for (const key of ABILITY_KEYS) {
      fallbackPerAbility[key] = 0;
    }

    for (const champ of champions) {
      for (const key of ABILITY_KEYS) {
        const value = Number(champ?.spellRanges?.[key]);
        if (Number.isFinite(value) && value > 0 && value < PLACEHOLDER_RANGE_THRESHOLD) {
          fallbackPerAbility[key] = Math.max(fallbackPerAbility[key], value);
        }
      }
    }

    for (const champ of champions) {
      for (const key of ABILITY_KEYS) {
        if (!champ.spellRanges) continue;
        const value = Number(champ.spellRanges[key]);
        if (!Number.isFinite(value)) continue;
        if (value >= PLACEHOLDER_RANGE_THRESHOLD) {
          const fallback = fallbackPerAbility[key];
          if (fallback > 0) {
            champ.spellRanges[key] = fallback;
          }
        }
      }
    }
  }

  function computeRangeBounds(champions) {
    const bounds = {
      attackRange: { min: null, max: null },
      spells: {}
    };
    for (const key of ABILITY_KEYS) {
      bounds.spells[key] = { min: null, max: null };
    }
    if (!Array.isArray(champions)) {
      return bounds;
    }
    for (const champ of champions) {
      const attackRange = Number(champ?.attackRange);
      if (Number.isFinite(attackRange)) {
        bounds.attackRange.min = bounds.attackRange.min === null ? attackRange : Math.min(bounds.attackRange.min, attackRange);
        bounds.attackRange.max = bounds.attackRange.max === null ? attackRange : Math.max(bounds.attackRange.max, attackRange);
      }
      for (const key of ABILITY_KEYS) {
        const value = Number(champ?.spellRanges?.[key]);
        if (Number.isFinite(value)) {
          const entry = bounds.spells[key];
          entry.min = entry.min === null ? value : Math.min(entry.min, value);
          entry.max = entry.max === null ? value : Math.max(entry.max, value);
        }
      }
    }
    if (bounds.attackRange.min === null || bounds.attackRange.max === null) {
      bounds.attackRange.min = 0;
      bounds.attackRange.max = 0;
    }
    for (const key of ABILITY_KEYS) {
      const entry = bounds.spells[key];
      if (entry.min === null || entry.max === null) {
        entry.min = 0;
        entry.max = 0;
      }
    }
    return bounds;
  }

  function clampToBounds(value, min, max) {
    if (!Number.isFinite(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function setSliderBounds(slider, valueEl, bound) {
    if (!slider || !bound) return;
    const min = Number(bound.min);
    const max = Number(bound.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    slider.min = String(min);
    slider.max = String(max);
    const clamped = clampToBounds(Number(slider.value), min, max);
    slider.value = String(clamped);
    if (valueEl) {
      valueEl.textContent = String(clamped);
    }
    return clamped;
  }

  function applyRangeBounds(bounds) {
    state.rangeBounds = bounds;
    if (!bounds) return;
    setSliderBounds(els.minRange, els.minRangeValue, bounds.attackRange);
    setSliderBounds(els.minRangeQ, els.minRangeQValue, bounds.spells.Q);
    setSliderBounds(els.minRangeW, els.minRangeWValue, bounds.spells.W);
    setSliderBounds(els.minRangeE, els.minRangeEValue, bounds.spells.E);
    setSliderBounds(els.minRangeR, els.minRangeRValue, bounds.spells.R);
  }

  function updateRangeSlidersFromChampions() {
    if (!Array.isArray(state.champions) || !state.champions.length) {
      state.rangeBounds = null;
      return;
    }
    const bounds = computeRangeBounds(state.champions);
    applyRangeBounds(bounds);
  }

  function computeChampionDpsValues(champion) {
    const baseAD = Number(champion?.attackDamage) || 0;
    const adPerLevel = Number(champion?.attackDamagePerLevel) || 0;
    const baseAS = Number(champion?.attackSpeed) || 0;
    const asPerLevel = Number(champion?.attackSpeedPerLevel) || 0;
    const dps0Raw = baseAD * baseAS;
    const attackDamageLevel18 = baseAD + adPerLevel * 17;
    const attackSpeedLevel18 = baseAS * (1 + (asPerLevel / 100) * 17);
    const dps18Raw = attackDamageLevel18 * attackSpeedLevel18;
    return {
      dps0: Number.isFinite(dps0Raw) ? Number(dps0Raw.toFixed(1)) : 0,
      dps18: Number.isFinite(dps18Raw) ? Number(dps18Raw.toFixed(1)) : 0
    };
  }

  function ensureChampionDerivedStats(champions) {
    if (!Array.isArray(champions)) return;
    for (const champ of champions) {
      if (!champ) continue;
      const { dps0, dps18 } = computeChampionDpsValues(champ);
      champ.dps0 = dps0;
      champ.dps18 = dps18;
      champ.dps = champ.dps0;
    }
  }

  function computeDpsBounds(champions) {
    const bounds = {
      dps0: { min: null, max: null },
      dps18: { min: null, max: null }
    };
    if (!Array.isArray(champions) || !champions.length) {
      bounds.dps0.min = bounds.dps0.max = 0;
      bounds.dps18.min = bounds.dps18.max = 0;
      return bounds;
    }
    for (const champ of champions) {
      const value0 = Number.isFinite(champ?.dps0) ? Number(champ.dps0) : null;
      const value18 = Number.isFinite(champ?.dps18) ? Number(champ.dps18) : null;
      if (value0 !== null) {
        bounds.dps0.min = bounds.dps0.min === null ? value0 : Math.min(bounds.dps0.min, value0);
        bounds.dps0.max = bounds.dps0.max === null ? value0 : Math.max(bounds.dps0.max, value0);
      }
      if (value18 !== null) {
        bounds.dps18.min = bounds.dps18.min === null ? value18 : Math.min(bounds.dps18.min, value18);
        bounds.dps18.max = bounds.dps18.max === null ? value18 : Math.max(bounds.dps18.max, value18);
      }
    }
    bounds.dps0.min = Number.isFinite(bounds.dps0.min) ? Math.floor(bounds.dps0.min) : 0;
    bounds.dps0.max = Number.isFinite(bounds.dps0.max) ? Math.ceil(bounds.dps0.max) : 0;
    bounds.dps18.min = Number.isFinite(bounds.dps18.min) ? Math.floor(bounds.dps18.min) : 0;
    bounds.dps18.max = Number.isFinite(bounds.dps18.max) ? Math.ceil(bounds.dps18.max) : 0;
    return bounds;
  }

  function applyDpsBounds(bounds) {
    state.dpsBounds = bounds;
    if (!bounds) return;
    const currentDps0 = setSliderBounds(els.minDps0, els.minDps0Value, bounds.dps0);
    const currentDps18 = setSliderBounds(els.minDps18, els.minDps18Value, bounds.dps18);
    const minDps0 = Number(bounds.dps0?.min ?? 0);
    const minDps18 = Number(bounds.dps18?.min ?? 0);
    state.filters.minDps0 = Number.isFinite(currentDps0) && currentDps0 <= minDps0 ? 0 : Number(currentDps0 || 0);
    state.filters.minDps18 = Number.isFinite(currentDps18) && currentDps18 <= minDps18 ? 0 : Number(currentDps18 || 0);
  }

  function updateDpsSlidersFromChampions() {
    if (!Array.isArray(state.champions) || !state.champions.length) {
      state.dpsBounds = null;
      return;
    }
    const bounds = computeDpsBounds(state.champions);
    applyDpsBounds(bounds);
  }

  function formatDpsValue(value) {
    return Number.isFinite(value) ? Number(value).toFixed(1) : "—";
  }

  function parseAbilityTagsFromText(text) {
    if (!text) return new Set();
    const t = text.toLowerCase();
    const tags = new Set();

    if (/\b(dash|dashes|blink|blinks|leap|leaps|jump|jumps|teleport|teleports|reposition|untargetable)\b/.test(t)) {
      tags.add("mobility");
    }
    if (/\b(stun|stunned)\b/.test(t)) tags.add("stun");
    if (/\b(root|rooted|immobilize|immobilized|snare|snared)\b/.test(t)) tags.add("root");
    if (/\b(knock\s?up|airborne|launched)\b/.test(t)) tags.add("knockup");
    if (/\b(knock\s?back|pushed back|displace|displaced)\b/.test(t)) tags.add("knockup");
    if (/\b(silence|silenced)\b/.test(t)) tags.add("silence");
    if (/\b(slow|slowed)\b/.test(t)) tags.add("slow");
    if (/\b(pull|pulls|pulled|drag|drags|dragged|grab|grabs|grabbed)\b/.test(t)) tags.add("pull");
    if (/\b(stealth|invisible|camouflage|camouflaged)\b/.test(t)) tags.add("stealth");
    if (/\b(attack speed|bonus attack speed|increases attack speed)\b/.test(t)) tags.add("attackspeed");
    if (/\b(movement speed|move speed|bonus movement speed|increases movement speed|gain movement speed)\b/.test(t)) tags.add("movespeed");
    if (/\b(shield|shielded)\b/.test(t)) tags.add("shield");
    if (/\b(heal|heals|healed|restore health|restores health)\b/.test(t)) tags.add("heal");
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
    
    if (window.LOL_CHAMPIONS_META) {
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
    
    if (window.LOL_CHAMPIONS_DATA) {
      const suffix = locale === RU_LOCALE ? 'ru' : 'en';
      const key = `${champKey}_${suffix}`;
      const data = window.LOL_CHAMPIONS_DATA[key];
      if (data) {
        return data.data?.[champKey];
      }
    }
    
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
    
    const links = new Set();
    const collect = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const v of arr) {
        if (v && typeof v.link === "string") links.add(v.link.toLowerCase());
      }
    };
    
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
    
    if (detailEn?.passive && checkText(detailEn.passive.description)) {
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
    return tags.map(t => String(t).toLowerCase());
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
          let spellRanges = { Q: 0, W: 0, E: 0, R: 0 };
          if (Array.isArray(detailEn?.spells)) {
            const labels = ["Q", "W", "E", "R"];
            for (let si = 0; si < detailEn.spells.length && si < 4; si++) {
              const s = detailEn.spells[si];
              const val = parseRangeValue(s.range, s.rangeBurn);
              spellRanges[labels[si]] = Number.isFinite(val) ? val : 0;
            }
          }
          const baseHp = Number(item.stats?.hp ?? 0);
          const hpPerLevel = Number(item.stats?.hpperlevel ?? 0);
          const baseMp = Number(item.stats?.mp ?? 0);
          const mpPerLevel = Number(item.stats?.mpperlevel ?? 0);
          const baseArmor = Number(item.stats?.armor ?? 0);
          const armorPerLevel = Number(item.stats?.armorperlevel ?? 0);
          const baseSpellBlock = Number(item.stats?.spellblock ?? 0);
          const spellBlockPerLevel = Number(item.stats?.spellblockperlevel ?? 0);
          const baseAttackDamage = Number(item.stats?.attackdamage ?? 0);
          const attackDamagePerLevel = Number(item.stats?.attackdamageperlevel ?? 0);
          const baseAttackSpeed = Number(item.stats?.attackspeed ?? 0);
          const attackSpeedPerLevel = Number(item.stats?.attackspeedperlevel ?? 0);
          const dps0 = Number.isFinite(baseAttackDamage * baseAttackSpeed)
            ? Number((baseAttackDamage * baseAttackSpeed).toFixed(1))
            : 0;
          const attackDamageLevel18 = baseAttackDamage + attackDamagePerLevel * 17;
          const attackSpeedLevel18 = baseAttackSpeed * (1 + (attackSpeedPerLevel / 100) * 17);
          const dps18 = Number.isFinite(attackDamageLevel18 * attackSpeedLevel18)
            ? Number((attackDamageLevel18 * attackSpeedLevel18).toFixed(1))
            : 0;
          const champ = {
            id: item.id,
            name: nameEn,
            nameRu,
            title: titleEn,
            titleRu,
            image: getChampionIcon(state.version, item.image.full),
            attackRange: item.stats?.attackrange ?? 125,
            hp: baseHp,
            hpPerLevel,
            mp: baseMp,
            mpPerLevel,
            armor: baseArmor,
            armorPerLevel,
            spellBlock: baseSpellBlock,
            spellBlockPerLevel,
            attackDamage: baseAttackDamage,
            attackDamagePerLevel,
            attackSpeed: baseAttackSpeed,
            attackSpeedPerLevel,
            dps0,
            dps18,
            dps: dps0,
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
          setStatus(`${t('found')}: ${results.length} ${t('of')} ${entries.length}`);
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
    
    state.filters.roleTank = els.checkboxes.roleTank.checked || els.checkboxes.roleTankAnd?.checked || false;
    state.filters.roleTankAnd = els.checkboxes.roleTankAnd?.checked || false;
    state.filters.roleFighter = els.checkboxes.roleFighter.checked || els.checkboxes.roleFighterAnd?.checked || false;
    state.filters.roleFighterAnd = els.checkboxes.roleFighterAnd?.checked || false;
    state.filters.roleMage = els.checkboxes.roleMage.checked || els.checkboxes.roleMageAnd?.checked || false;
    state.filters.roleMageAnd = els.checkboxes.roleMageAnd?.checked || false;
    state.filters.roleMarksman = els.checkboxes.roleMarksman.checked || els.checkboxes.roleMarksmanAnd?.checked || false;
    state.filters.roleMarksmanAnd = els.checkboxes.roleMarksmanAnd?.checked || false;
    state.filters.roleAssassin = els.checkboxes.roleAssassin.checked || els.checkboxes.roleAssassinAnd?.checked || false;
    state.filters.roleAssassinAnd = els.checkboxes.roleAssassinAnd?.checked || false;
    state.filters.roleSupport = els.checkboxes.roleSupport.checked || els.checkboxes.roleSupportAnd?.checked || false;
    state.filters.roleSupportAnd = els.checkboxes.roleSupportAnd?.checked || false;
    
    const dps0ValueRaw = els.minDps0 ? Number(els.minDps0.value) : NaN;
    const dps18ValueRaw = els.minDps18 ? Number(els.minDps18.value) : NaN;
    const dps0Min = els.minDps0 ? Number(els.minDps0.min) : NaN;
    const dps18Min = els.minDps18 ? Number(els.minDps18.min) : NaN;
    const dps0Value = Number.isFinite(dps0ValueRaw) ? dps0ValueRaw : 0;
    const dps18Value = Number.isFinite(dps18ValueRaw) ? dps18ValueRaw : 0;
    if (els.minDps0Value) {
      els.minDps0Value.textContent = String(dps0Value);
    }
    if (els.minDps18Value) {
      els.minDps18Value.textContent = String(dps18Value);
    }
    state.filters.minDps0 = Number.isFinite(dps0Value) && Number.isFinite(dps0Min) && dps0Value <= dps0Min ? 0 : dps0Value;
    state.filters.minDps18 = Number.isFinite(dps18Value) && Number.isFinite(dps18Min) && dps18Value <= dps18Min ? 0 : dps18Value;
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
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      const nameEn = (champion.name || '').toLowerCase();
      const nameRu = (champion.nameRu || '').toLowerCase();
      if (!nameEn.includes(query) && !nameRu.includes(query)) {
        return false;
      }
    }
    
    if (state.filters.minDps0 > 0 && (champion.dps0 ?? 0) < state.filters.minDps0) return false;
    if (state.filters.minDps18 > 0 && (champion.dps18 ?? 0) < state.filters.minDps18) return false;
    if (state.filters.minRange > 0 && (champion.attackRange ?? 0) < state.filters.minRange) {
      return false;
    }
    if (state.filters.minRangeQ > 0 && (champion.spellRanges?.Q ?? 0) < state.filters.minRangeQ) return false;
    if (state.filters.minRangeW > 0 && (champion.spellRanges?.W ?? 0) < state.filters.minRangeW) return false;
    if (state.filters.minRangeE > 0 && (champion.spellRanges?.E ?? 0) < state.filters.minRangeE) return false;
    if (state.filters.minRangeR > 0 && (champion.spellRanges?.R ?? 0) < state.filters.minRangeR) return false;
    
      const abilityTags = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
    for (const tag of abilityTags) {
      const anySelected = state.filters[tag];
      if (!anySelected) continue;
      
      const qRequired = state.filters[`${tag}Q`];
      const wRequired = state.filters[`${tag}W`];
      const eRequired = state.filters[`${tag}E`];
      const rRequired = state.filters[`${tag}R`];
      
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
    
    const rolesOR = [];
    const rolesAND = [];
    
    if (state.filters.roleTank) {
      if (state.filters.roleTankAnd) {
        rolesAND.push("tank");
      } else {
        rolesOR.push("tank");
      }
    }
    if (state.filters.roleFighter) {
      if (state.filters.roleFighterAnd) {
        rolesAND.push("fighter");
      } else {
        rolesOR.push("fighter");
      }
    }
    if (state.filters.roleMage) {
      if (state.filters.roleMageAnd) {
        rolesAND.push("mage");
      } else {
        rolesOR.push("mage");
      }
    }
    if (state.filters.roleMarksman) {
      if (state.filters.roleMarksmanAnd) {
        rolesAND.push("marksman");
      } else {
        rolesOR.push("marksman");
      }
    }
    if (state.filters.roleAssassin) {
      if (state.filters.roleAssassinAnd) {
        rolesAND.push("assassin");
      } else {
        rolesOR.push("assassin");
      }
    }
    if (state.filters.roleSupport) {
      if (state.filters.roleSupportAnd) {
        rolesAND.push("support");
      } else {
        rolesOR.push("support");
      }
    }
    
    if (rolesAND.length > 0) {
      const hasAllRolesAND = rolesAND.every(r => champion.classTags?.includes(r));
      if (!hasAllRolesAND) return false;
    }
    
    if (rolesOR.length > 0) {
      const hasAnyRoleOR = rolesOR.some(r => champion.classTags?.includes(r));
      if (!hasAnyRoleOR) return false;
    }
    
    return true;
  }

  function renderGrid(champions) {
    els.grid.innerHTML = "";
    if (!champions.length) {
      els.grid.innerHTML = `<div class="status">${t('noResults')}</div>`;
      return;
    }
    const roleLabels = {
      tank: t('roleTank'),
      fighter: t('roleFighter'),
      mage: t('roleMage'),
      marksman: t('roleMarksman'),
      assassin: t('roleAssassin'),
      support: t('roleSupport')
    };
    const frag = document.createDocumentFragment();
    for (const c of champions) {
      const card = document.createElement("article");
      card.className = "card";
      const splash = document.createElement("div");
      splash.className = "splash";
      splash.style.backgroundImage = `url('${c.image}')`;
      splash.style.cursor = "pointer";
      splash.title = t('openFullInfo');
      splash.addEventListener("click", () => openModalForChampion(c));

      const body = document.createElement("div");
      body.className = "card-body";
      const title = document.createElement("div");
      title.className = "title";
      const name = document.createElement("h3");
      name.className = "name";
      name.textContent = state.language === 'ru' ? c.nameRu : c.name;
      title.appendChild(name);
      const badgeWrap = document.createElement("div");
      badgeWrap.className = "tags badge-group";
      const rangeBadge = document.createElement("span");
      rangeBadge.className = "badge";
      rangeBadge.textContent = `${c.attackRange}`;
      rangeBadge.title = t('attackRange');
      const dpsBadge = document.createElement("span");
      dpsBadge.className = "badge badge-dps";
      const dps0Display = formatDpsValue(c.dps0);
      const dps18Display = formatDpsValue(c.dps18);
      dpsBadge.textContent = `${dps0Display} / ${dps18Display}`;
      dpsBadge.title = t('dpsTooltip');
      badgeWrap.appendChild(rangeBadge);
      badgeWrap.appendChild(dpsBadge);
      const roles = Array.isArray(c.classTags)
        ? c.classTags.map(r => String(r).toLowerCase()).filter(Boolean)
        : [];
      body.appendChild(title);
      body.appendChild(badgeWrap);
      if (roles.length) {
        const roleTagsWrap = document.createElement("div");
        roleTagsWrap.className = "role-tags";
        for (const role of roles) {
          const roleTag = document.createElement("span");
          roleTag.className = `role-tag role-${role}`;
          roleTag.textContent = roleLabels[role] || role;
          roleTagsWrap.appendChild(roleTag);
        }
        body.appendChild(roleTagsWrap);
      }

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
    const roleChips = Array.isArray(c.classTags) ? c.classTags.map(r => {
      const key = String(r).toLowerCase();
      const label = roleMap[key] || roleMap[r] || r;
      return `<span class="chip role-chip role-${key}">${label}</span>`;
    }).join("") : "";
    const dmg = (c.damageTypes || []).map(d => d === "physical" ? t('dmgPhysical') : d === "magic" ? t('dmgMagic') : d).join("</span><span class=\"chip\">");

    const formatRangeNote = (val) => {
      if (!Number.isFinite(val) || val <= 0) return "";
      if (val >= 40000) return `${t('range')}: ${state.language === 'ru' ? 'глобальная' : 'global'}`;
      return `${t('range')}: ${val}`;
    };

    const champName = state.language === 'ru' ? c.nameRu : c.name;
    const champTitle = state.language === 'ru' ? c.titleRu : c.title;

    const header = ``;

    const abilityData = state.language === 'ru' ? c.ru : c.en;
    const dpsChipHtml = `<span class="chip">${formatDpsValue(c.dps0)} / ${formatDpsValue(c.dps18)}</span>`;
    
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
      <div class="modal-header">
        <img class="avatar" src="${c.image}" alt="">
        <div>
          <div class="modal-title-row">
            <h2 id="modal-title" class="modal-title">${champName}</h2>
            <button type="button" class="modal-dps-toggle" data-toggle-dps="true">DPS</button>
          </div>
          <div class="modal-subtitle-row">
            <div class="modal-subtitle">${champTitle}</div>
            <div class="chips">
              ${roleChips}
              ${dmg ? `<span class="chip">${dmg}</span>` : ""}
              ${dpsChipHtml}
              <span class="chip">${t('attackRange')}: ${c.attackRange}</span>
              ${c.scalesWithOwnHealth ? `<span class="chip">${t('scalesHealth')}</span>` : ""}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-block modal-stats-block hidden" data-dps-block="true">
          <h4>${t('combatStats')}</h4>
          <div class="modal-dps-table" data-dps-table="true"></div>
        </div>
        <div class="modal-block">
          <h4>${t('abilitiesTitle')}</h4>
          ${abilities.join("")}
        </div>
      </div>
    `;
  }

  function buildDpsTableHtml(champion) {
    const levels = Array.from({ length: 18 }, (_, i) => i + 1);
    const baseAD = Number(champion.attackDamage) || 0;
    const adPerLevel = Number(champion.attackDamagePerLevel) || 0;
    const baseAS = Number(champion.attackSpeed) || 0;
    const asPerLevel = Number(champion.attackSpeedPerLevel) || 0;
    const baseHp = Number(champion.hp) || 0;
    const hpPerLevel = Number(champion.hpPerLevel) || 0;
    const baseMp = Number(champion.mp) || 0;
    const mpPerLevel = Number(champion.mpPerLevel) || 0;
    const baseArmor = Number(champion.armor) || 0;
    const armorPerLevel = Number(champion.armorPerLevel) || 0;
    const baseMr = Number(champion.spellBlock) || 0;
    const mrPerLevel = Number(champion.spellBlockPerLevel) || 0;
    const rows = levels.map(level => {
      const attackDamage = baseAD + adPerLevel * (level - 1);
      const attackSpeed = baseAS * (1 + (asPerLevel / 100) * (level - 1));
      const dps = attackDamage * attackSpeed;
      const hp = baseHp + hpPerLevel * (level - 1);
      const mp = baseMp + mpPerLevel * (level - 1);
      const armor = baseArmor + armorPerLevel * (level - 1);
      const mr = baseMr + mrPerLevel * (level - 1);
      return `
        <tr>
          <td>${level}</td>
          <td>${attackDamage.toFixed(1)}</td>
          <td>${attackSpeed.toFixed(3)}</td>
          <td>${dps.toFixed(1)}</td>
          <td>${hp.toFixed(0)}</td>
          <td>${mp.toFixed(0)}</td>
          <td>${armor.toFixed(1)}</td>
          <td>${mr.toFixed(1)}</td>
        </tr>
      `;
    }).join("");
    return `
      <table>
        <thead>
          <tr>
            <th>${t('levelColumn')}</th>
            <th>${t('attackDamageColumn')}</th>
            <th>${t('attackSpeedColumn')}</th>
            <th>${t('dpsColumn')}</th>
            <th>${t('hpColumn')}</th>
            <th>${t('mpColumn')}</th>
            <th>${t('armorColumn')}</th>
            <th>${t('mrColumn')}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  function initModalDpsTable(champion) {
    if (!els.modalContent) return;
    const toggleBtn = els.modalContent.querySelector('[data-toggle-dps="true"]');
    const tableContainer = els.modalContent.querySelector('[data-dps-table="true"]');
    const block = els.modalContent.querySelector('[data-dps-block="true"]');
    if (!toggleBtn || !tableContainer || !block) return;
    let expanded = false;
    toggleBtn.addEventListener("click", () => {
      expanded = !expanded;
      if (expanded) {
        tableContainer.innerHTML = buildDpsTableHtml(champion);
        tableContainer.classList.add("visible");
        block.classList.remove("hidden");
      } else {
        tableContainer.classList.remove("visible");
        tableContainer.innerHTML = "";
        block.classList.add("hidden");
      }
      requestAnimationFrame(() => {
        fitModalScale();
        setTimeout(fitModalScale, 60);
      });
    });
  }

  function fitModalScale() {
    if (!els.modal || !els.modalScale) return;
    els.modalScale.style.transform = "none";
    const desiredW = Math.min(1000, Math.floor(window.innerWidth * 0.96));
    els.modal.style.width = `${desiredW}px`;
    const margin = 24;
    const maxModalHeight = Math.floor(window.innerHeight * 0.9);
    const contentHeight = els.modalScale.scrollHeight + margin;
    const finalH = Math.min(maxModalHeight, contentHeight);
    els.modal.style.height = `${finalH}px`;
  }

  function openModalForChampion(c) {
    state.currentModalChampion = c;
    els.modalContent.innerHTML = buildModalHtml(c);
    initModalDpsTable(c);
    els.modalRoot.classList.add("open");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => {
      fitModalScale();
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
    const currentFilters = { ...state.filters };
    
    const abilityFilters = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
    const dmgFilters = [
      { key: 'dmgPhysical', type: 'physical' },
      { key: 'dmgMagic', type: 'magic' }
    ];
    const scalesFilter = { key: 'scalesHealth', type: 'health' };
    const roleFilters = ['roleTank', 'roleFighter', 'roleMage', 'roleMarksman', 'roleAssassin', 'roleSupport'];
    
    for (const filter of abilityFilters) {
      const testFilters = { ...currentFilters, [filter]: true };
      
      let count = 0;
      for (const champ of state.champions) {
        if (championMatchesFiltersWithOverride(champ, testFilters)) {
          count++;
        }
      }
      
      const checkbox = qs(`#filter-${filter}`);
      if (checkbox) checkbox.setAttribute('data-count', count);
      
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
          checkbox.setAttribute('data-count', countAbility);
          checkbox.disabled = countAbility === 0;
          disabledStates.push(countAbility === 0);
        }
      }
      
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
    
    for (const dmgFilter of dmgFilters) {
      const testFilters = { ...currentFilters, [dmgFilter.key]: true };
      
      let count = 0;
      for (const champ of state.champions) {
        if (championMatchesFiltersWithOverride(champ, testFilters)) {
          count++;
        }
      }
      
      const abilities = ['q', 'w', 'e', 'r'];
      const id = dmgFilter.key === 'dmgPhysical' ? 'dmg-physical' : 'dmg-magic';
      
      const checkbox = qs(`#${id}`);
      if (checkbox) checkbox.setAttribute('data-count', count);
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
          checkbox.setAttribute('data-count', countAbility);
          checkbox.disabled = countAbility === 0;
          disabledStates.push(countAbility === 0);
        }
      }
      
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
    
    const testFilters = { ...currentFilters, [scalesFilter.key]: true };
    let count = 0;
    for (const champ of state.champions) {
      if (championMatchesFiltersWithOverride(champ, testFilters)) {
        count++;
      }
    }
    
    const checkbox = qs('#scales-health');
    if (checkbox) checkbox.setAttribute('data-count', count);
    
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
        checkbox.setAttribute('data-count', countAbility);
        checkbox.disabled = countAbility === 0;
        disabledStatesHealth.push(countAbility === 0);
      }
    }
    
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
    
    for (const roleFilter of roleFilters) {
      let checkboxId = '';
      if (roleFilter === 'roleTank') checkboxId = 'role-tank';
      else if (roleFilter === 'roleFighter') checkboxId = 'role-fighter';
      else if (roleFilter === 'roleMage') checkboxId = 'role-mage';
      else if (roleFilter === 'roleMarksman') checkboxId = 'role-marksman';
      else if (roleFilter === 'roleAssassin') checkboxId = 'role-assassin';
      else if (roleFilter === 'roleSupport') checkboxId = 'role-support';
      
      const roleCheckbox = qs(`#${checkboxId}`);
      const roleCheckboxAnd = roleCheckbox?.nextElementSibling;
      
      const isAlreadySelected = currentFilters[roleFilter];
      const isAlreadyAndMode = currentFilters[`${roleFilter}And`];
      
      const baseFilters = { ...currentFilters };
      delete baseFilters[roleFilter];
      delete baseFilters[`${roleFilter}And`];
      
      const testFiltersOR = { ...baseFilters };
      testFiltersOR[roleFilter] = true;
      testFiltersOR[`${roleFilter}And`] = false;
      
      let countOR = 0;
      for (const champ of state.champions) {
        if (championMatchesFiltersWithOverride(champ, testFiltersOR)) {
          countOR++;
        }
      }
      
      const testFiltersAND = { ...baseFilters };
      testFiltersAND[roleFilter] = true;
      testFiltersAND[`${roleFilter}And`] = true;
      
      let countAND = 0;
      for (const champ of state.champions) {
        if (championMatchesFiltersWithOverride(champ, testFiltersAND)) {
          countAND++;
        }
      }
      
      if (roleCheckbox) {
        roleCheckbox.setAttribute('data-count', countOR);
        roleCheckbox.disabled = countOR === 0;
        if (countOR === 0) roleCheckbox.checked = false;
      }
      
      if (roleCheckboxAnd) {
        roleCheckboxAnd.setAttribute('data-count', countAND);
        roleCheckboxAnd.disabled = countAND === 0;
        if (countAND === 0) roleCheckboxAnd.checked = false;
      }
      
      const roleLabel = roleCheckbox ? roleCheckbox.nextElementSibling : null;
      if (roleLabel) {
        const maxCount = Math.max(countOR, countAND);
        roleLabel.style.opacity = maxCount === 0 ? '0.4' : '1';
        roleLabel.style.cursor = maxCount === 0 ? 'not-allowed' : 'pointer';
      }
    }
  }
  
  function championMatchesFiltersWithOverride(champion, filters) {
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      const nameEn = (champion.name || '').toLowerCase();
      const nameRu = (champion.nameRu || '').toLowerCase();
      if (!nameEn.includes(query) && !nameRu.includes(query)) {
        return false;
      }
    }
    
    if ((filters.minDps0 ?? 0) > 0 && (champion.dps0 ?? 0) < filters.minDps0) return false;
    if ((filters.minDps18 ?? 0) > 0 && (champion.dps18 ?? 0) < filters.minDps18) return false;
    if (filters.minRange > 0 && (champion.attackRange ?? 0) < filters.minRange) {
      return false;
    }
    if (filters.minRangeQ > 0 && (champion.spellRanges?.Q ?? 0) < filters.minRangeQ) return false;
    if (filters.minRangeW > 0 && (champion.spellRanges?.W ?? 0) < filters.minRangeW) return false;
    if (filters.minRangeE > 0 && (champion.spellRanges?.E ?? 0) < filters.minRangeE) return false;
    if (filters.minRangeR > 0 && (champion.spellRanges?.R ?? 0) < filters.minRangeR) return false;
    
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
    
    const rolesOR = [];
    const rolesAND = [];
    
    if (filters.roleTank) {
      if (filters.roleTankAnd) {
        rolesAND.push("tank");
      } else {
        rolesOR.push("tank");
      }
    }
    if (filters.roleFighter) {
      if (filters.roleFighterAnd) {
        rolesAND.push("fighter");
      } else {
        rolesOR.push("fighter");
      }
    }
    if (filters.roleMage) {
      if (filters.roleMageAnd) {
        rolesAND.push("mage");
      } else {
        rolesOR.push("mage");
      }
    }
    if (filters.roleMarksman) {
      if (filters.roleMarksmanAnd) {
        rolesAND.push("marksman");
      } else {
        rolesOR.push("marksman");
      }
    }
    if (filters.roleAssassin) {
      if (filters.roleAssassinAnd) {
        rolesAND.push("assassin");
      } else {
        rolesOR.push("assassin");
      }
    }
    if (filters.roleSupport) {
      if (filters.roleSupportAnd) {
        rolesAND.push("support");
      } else {
        rolesOR.push("support");
      }
    }
    
    if (rolesAND.length > 0) {
      const hasAllRolesAND = rolesAND.every(r => champion.classTags?.includes(r));
      if (!hasAllRolesAND) return false;
    }
    
    if (rolesOR.length > 0) {
      const hasAnyRoleOR = rolesOR.some(r => champion.classTags?.includes(r));
      if (!hasAnyRoleOR) return false;
    }
    
    return true;
  }
  
  function updateUILanguage() {
    document.documentElement.lang = state.language;
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    
    const searchInput = qs("#search-input");
    if (searchInput) {
      searchInput.placeholder = t('searchPlaceholder');
    }
    
    const roleTooltips = document.querySelectorAll('[data-role-tooltip]');
    roleTooltips.forEach(el => {
      const tooltipKey = el.getAttribute('data-role-tooltip');
      el.setAttribute('title', t(tooltipKey));
    });
    
    const abilityTooltips = document.querySelectorAll('[data-ability-tooltip]');
    abilityTooltips.forEach(el => {
      const tooltipKey = el.getAttribute('data-ability-tooltip');
      el.setAttribute('title', t(tooltipKey));
    });
    
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
    
    const minDps0Label = qs('label[for="min-dps0"]');
    if (minDps0Label) {
      const valueSpan = minDps0Label.querySelector('#min-dps0-value');
      const value = valueSpan ? valueSpan.textContent : String(state.filters.minDps0 ?? 0);
      minDps0Label.innerHTML = `${t('minDps0')}: <span id="min-dps0-value">${value}</span>`;
    }

    const minDps18Label = qs('label[for="min-dps18"]');
    if (minDps18Label) {
      const valueSpan = minDps18Label.querySelector('#min-dps18-value');
      const value = valueSpan ? valueSpan.textContent : String(state.filters.minDps18 ?? 0);
      minDps18Label.innerHTML = `${t('minDps18')}: <span id="min-dps18-value">${value}</span>`;
    }
 
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
    
    els.minDps0Value = qs("#min-dps0-value");
    els.minDps18Value = qs("#min-dps18-value");
    els.minRangeValue = qs("#min-range-value");
    els.minRangeQValue = qs("#min-range-q-value");
    els.minRangeWValue = qs("#min-range-w-value");
    els.minRangeEValue = qs("#min-range-e-value");
    els.minRangeRValue = qs("#min-range-r-value");
    if (state.dpsBounds) {
      applyDpsBounds(state.dpsBounds);
    }
    if (state.rangeBounds) {
      applyRangeBounds(state.rangeBounds);
    }
    
    if (state.currentModalChampion) {
      els.modalContent.innerHTML = buildModalHtml(state.currentModalChampion);
      initModalDpsTable(state.currentModalChampion);
      requestAnimationFrame(() => {
        fitModalScale();
        setTimeout(fitModalScale, 60);
      });
    }
  }
  
  function setupCheckboxTooltips() {
    let tooltipEl = document.getElementById('custom-checkbox-tooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'custom-checkbox-tooltip';
      tooltipEl.className = 'custom-checkbox-tooltip';
      document.body.appendChild(tooltipEl);
    }
    
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-role-tooltip], input[type="checkbox"][data-ability-tooltip]');
    
    if (checkboxes.length > 0 && !checkboxes[0].hasAttribute('data-tooltip-setup')) {
      checkboxes.forEach(checkbox => {
        let tooltipKey = '';
        if (checkbox.hasAttribute('data-role-tooltip')) {
          tooltipKey = checkbox.getAttribute('data-role-tooltip');
        } else if (checkbox.hasAttribute('data-ability-tooltip')) {
          tooltipKey = checkbox.getAttribute('data-ability-tooltip');
        }
        
        if (tooltipKey) {
          const tooltipText = t(tooltipKey);
          checkbox.setAttribute('data-tooltip-text', tooltipText);
          checkbox.removeAttribute('title');
          checkbox.setAttribute('data-tooltip-setup', 'true');
        }
        
        checkbox.addEventListener('mouseenter', function(e) {
          const text = this.getAttribute('data-tooltip-text');
          if (text) {
            const rect = this.getBoundingClientRect();
            tooltipEl.textContent = text;
            tooltipEl.style.display = 'block';
            tooltipEl.style.left = (rect.left + rect.width / 2) + 'px';
            tooltipEl.style.top = (rect.top - 4) + 'px';
            tooltipEl.style.transform = 'translate(-50%, -100%)';
          }
        });
        
        checkbox.addEventListener('mouseleave', function() {
          tooltipEl.style.display = 'none';
        });
        
        checkbox.addEventListener('mousemove', function(e) {
          if (tooltipEl.style.display === 'block') {
            const rect = this.getBoundingClientRect();
            tooltipEl.style.left = (rect.left + rect.width / 2) + 'px';
            tooltipEl.style.top = (rect.top - 4) + 'px';
          }
        });
      });
    } else {
      checkboxes.forEach(checkbox => {
        let tooltipKey = '';
        if (checkbox.hasAttribute('data-role-tooltip')) {
          tooltipKey = checkbox.getAttribute('data-role-tooltip');
        } else if (checkbox.hasAttribute('data-ability-tooltip')) {
          tooltipKey = checkbox.getAttribute('data-ability-tooltip');
        }
        
        if (tooltipKey) {
          checkbox.setAttribute('data-tooltip-text', t(tooltipKey));
        }
      });
    }
  }
  
  function updateCheckboxTooltips() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-role-tooltip], input[type="checkbox"][data-ability-tooltip]');
    
    checkboxes.forEach(checkbox => {
      let tooltipKey = '';
      if (checkbox.hasAttribute('data-role-tooltip')) {
        tooltipKey = checkbox.getAttribute('data-role-tooltip');
      } else if (checkbox.hasAttribute('data-ability-tooltip')) {
        tooltipKey = checkbox.getAttribute('data-ability-tooltip');
      }
      
      if (tooltipKey) {
        const tooltipText = t(tooltipKey);
        checkbox.setAttribute('data-tooltip-text', tooltipText);
      }
    });
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
    els.checkboxes.roleTank = qs("#role-tank");
    els.checkboxes.roleTankAnd = qs("#role-tank-and");
    els.checkboxes.roleFighter = qs("#role-fighter");
    els.checkboxes.roleFighterAnd = qs("#role-fighter-and");
    els.checkboxes.roleMage = qs("#role-mage");
    els.checkboxes.roleMageAnd = qs("#role-mage-and");
    els.checkboxes.roleMarksman = qs("#role-marksman");
    els.checkboxes.roleMarksmanAnd = qs("#role-marksman-and");
    els.checkboxes.roleAssassin = qs("#role-assassin");
    els.checkboxes.roleAssassinAnd = qs("#role-assassin-and");
    els.checkboxes.roleSupport = qs("#role-support");
    els.checkboxes.roleSupportAnd = qs("#role-support-and");
    els.checkboxes.dmgPhysical = qs("#dmg-physical");
    els.checkboxes.dmgMagic = qs("#dmg-magic");
    els.checkboxes.scalesHealth = qs("#scales-health");
    els.minDps0 = qs("#min-dps0");
    els.minDps0Value = qs("#min-dps0-value");
    els.minDps18 = qs("#min-dps18");
    els.minDps18Value = qs("#min-dps18-value");
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
    els.modalRoot = qs("#modal-root");
    els.modal = qs("#modal-root .modal");
    els.modalViewport = qs("#modal-root .modal-viewport");
    els.modalScale = qs("#modal-root .modal-scale");
    els.modalContent = qs("#modal-content");
    els.modalClose = qs("#modal-root .modal-close");
    bindModalEvents();

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

    const abilityFilters = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
    for (const filter of abilityFilters) {
      const mainCheckbox = qs(`#filter-${filter}`);
      const abilities = ['q', 'w', 'e', 'r'];
      
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
      
      for (const ability of abilities) {
        const checkbox = qs(`#filter-${filter}-${ability}`);
        if (checkbox) {
          checkbox.addEventListener("change", (e) => {
            if (e.target.checked && mainCheckbox) {
              mainCheckbox.checked = false;
            }
            applyFiltersAndRender();
          });
        }
      }
    }
    
    const rolePairs = [
      { role: els.checkboxes.roleTank, and: els.checkboxes.roleTankAnd },
      { role: els.checkboxes.roleFighter, and: els.checkboxes.roleFighterAnd },
      { role: els.checkboxes.roleMage, and: els.checkboxes.roleMageAnd },
      { role: els.checkboxes.roleMarksman, and: els.checkboxes.roleMarksmanAnd },
      { role: els.checkboxes.roleAssassin, and: els.checkboxes.roleAssassinAnd },
      { role: els.checkboxes.roleSupport, and: els.checkboxes.roleSupportAnd }
    ];
    
    for (const pair of rolePairs) {
      if (pair.role && pair.and) {
        pair.role.addEventListener("change", (e) => {
          if (e.target.checked && pair.and) {
            pair.and.checked = false;
          }
          applyFiltersAndRender();
        });
        pair.and.addEventListener("change", (e) => {
          if (e.target.checked && pair.role) {
            pair.role.checked = false;
          }
          applyFiltersAndRender();
        });
      }
    }
    
    const dmgFilterIds = ['dmg-physical', 'dmg-magic', 'scales-health'];
    for (const el of Object.values(els.checkboxes)) {
      const id = el?.id;
      if (id && (abilityFilters.some(f => id === `filter-${f}`) || dmgFilterIds.includes(id) || id.endsWith('-and'))) {
        continue;
      }
      if (el) {
        el.addEventListener("change", applyFiltersAndRender);
      }
    }
    
    const dmgFilters = [
      { id: 'dmg-physical', main: 'dmg-physical' },
      { id: 'dmg-magic', main: 'dmg-magic' },
      { id: 'scales-health', main: 'scales-health' }
    ];
    for (const filter of dmgFilters) {
      const abilities = ['q', 'w', 'e', 'r'];
      const mainCheckbox = qs(`#${filter.main}`);
      
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
      
      for (const ability of abilities) {
        const checkbox = qs(`#${filter.id}-${ability}`);
        if (checkbox) {
          checkbox.addEventListener("change", (e) => {
            if (e.target.checked && mainCheckbox) {
              mainCheckbox.checked = false;
            }
            applyFiltersAndRender();
          });
        }
      }
    }
    
    const searchInput = qs("#search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value.trim();
        applyFiltersAndRender();
      });
    }
    
    const langToggle = qs("#lang-toggle");
    if (langToggle) {
      langToggle.addEventListener("change", (e) => {
        state.language = e.target.checked ? 'ru' : 'en';
        updateUILanguage();
        updateCheckboxTooltips();
        applyFiltersAndRender();
      });
    }
    
    if (els.minDps0) els.minDps0.addEventListener("input", applyFiltersAndRender);
    if (els.minDps18) els.minDps18.addEventListener("input", applyFiltersAndRender);
    els.minRange.addEventListener("input", applyFiltersAndRender);
    els.minRangeQ.addEventListener("input", applyFiltersAndRender);
    els.minRangeW.addEventListener("input", applyFiltersAndRender);
    els.minRangeE.addEventListener("input", applyFiltersAndRender);
    els.minRangeR.addEventListener("input", applyFiltersAndRender);
    els.resetBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = '';
        state.searchQuery = '';
      }
      
      for (const el of Object.values(els.checkboxes)) el.checked = false;
      
      const abilityFilters = ['mobility', 'stun', 'slow', 'root', 'knockup', 'silence', 'stealth', 'attackspeed', 'movespeed', 'shield', 'heal', 'pull', 'lifesteal'];
      for (const filter of abilityFilters) {
        const abilities = ['q', 'w', 'e', 'r'];
        for (const ability of abilities) {
          const checkbox = qs(`#filter-${filter}-${ability}`);
          if (checkbox) checkbox.checked = false;
        }
      }
      
      const dmgFilters = ['dmg-physical', 'dmg-magic', 'scales-health'];
      for (const filter of dmgFilters) {
        const abilities = ['q', 'w', 'e', 'r'];
        for (const ability of abilities) {
          const checkbox = qs(`#${filter}-${ability}`);
          if (checkbox) checkbox.checked = false;
        }
      }
      
      if (state.dpsBounds) {
        applyDpsBounds(state.dpsBounds);
        const minDps0 = Number(state.dpsBounds.dps0?.min ?? 0);
        const minDps18 = Number(state.dpsBounds.dps18?.min ?? 0);
        if (els.minDps0) els.minDps0.value = String(minDps0);
        if (els.minDps0Value) els.minDps0Value.textContent = String(minDps0);
        if (els.minDps18) els.minDps18.value = String(minDps18);
        if (els.minDps18Value) els.minDps18Value.textContent = String(minDps18);
        state.filters.minDps0 = 0;
        state.filters.minDps18 = 0;
      } else {
        if (els.minDps0) els.minDps0.value = "0";
        if (els.minDps0Value) els.minDps0Value.textContent = "0";
        if (els.minDps18) els.minDps18.value = "0";
        if (els.minDps18Value) els.minDps18Value.textContent = "0";
        state.filters.minDps0 = 0;
        state.filters.minDps18 = 0;
      }
      if (state.rangeBounds) {
        applyRangeBounds(state.rangeBounds);
        const attackMin = Number(state.rangeBounds.attackRange?.min ?? 0);
        if (els.minRange) {
          els.minRange.value = String(attackMin);
        }
        if (els.minRangeValue) {
          els.minRangeValue.textContent = String(attackMin);
        }
        for (const key of ABILITY_KEYS) {
          const entry = state.rangeBounds.spells?.[key];
          const minValue = Number(entry?.min ?? 0);
          const slider = els[`minRange${key}`];
          const valueEl = els[`minRange${key}Value`];
          if (slider) slider.value = String(minValue);
          if (valueEl) valueEl.textContent = String(minValue);
        }
      } else {
        if (els.minRange) {
          els.minRange.value = "0";
        }
        if (els.minRangeValue) {
          els.minRangeValue.textContent = "0";
        }
        for (const key of ABILITY_KEYS) {
          const slider = els[`minRange${key}`];
          const valueEl = els[`minRange${key}Value`];
          if (slider) slider.value = "0";
          if (valueEl) valueEl.textContent = "0";
        }
      }
      applyFiltersAndRender();
    });
  }

  async function init() {
    els.status = qs("#status");
    els.grid = qs("#grid");
    
    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage];
    const hasRussian = browserLanguages.some(lang => lang.toLowerCase().startsWith('ru'));
    
    if (hasRussian) {
      state.language = 'ru';
      const langToggle = qs("#lang-toggle");
      if (langToggle) {
        langToggle.checked = true;
      }
    }
    
    try {
      await Promise.all([
        loadUITranslations('ru'),
        loadUITranslations('en')
      ]);
    } catch (e) {
      console.warn("Failed to load UI translations:", e);
    }
    
    const initialLocale = hasRussian ? RU_LOCALE : LOCALE;
    try {
      await loadLanguageFile(initialLocale);
    } catch (e) {
      console.warn("Failed to pre-load language file:", e);
    }
    
    bindUI();
    updateUILanguage();
    setupCheckboxTooltips();
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
      setStatus(t('loadChampionsError'));
      throw e;
    }
    setStatus(t('loadingAbilities'));
    state.champions = await loadAllChampionDetails(state.championsIndex);
    ensureChampionDerivedStats(state.champions);
    normalizeSpellRangePlaceholders(state.champions);
    updateRangeSlidersFromChampions();
    updateDpsSlidersFromChampions();
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


