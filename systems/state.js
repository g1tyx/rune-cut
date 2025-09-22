// /systems/state.js

const SAVE_KEY = 'runecut-save';
const SAVE_VERSION = 2;

/* ---------------- Fresh state factory ---------------- */
export function defaultState(){
  return {
    version: SAVE_VERSION,

    gold: 0,

    // Skill XP
    wcXp: 0, fishXp: 0, minXp: 0,
    atkXp: 0, strXp: 0, defXp: 0,
    smithXp: 0, craftXp: 0, cookXp: 0,
    enchantXp: 0, alchXp: 0,
    constructionXp: 0, royalXp: 0,

    // Core data
    inventory: {},
    equipment: {
      axe:null, pick:null, weapon:null, shield:null,
      head:null, body:null, legs:null, gloves:null, boots:null,
      amulet:null, ring:null, cape:null,
      food:null, foodQty:0,
    },
    equipmentMods: {},

    // Royal
    royalFavor: 0,
    royalContract: null,
    royalHistory: [],

    unlocks: {
      autobattle: false,     // unlocked at 25 Favor
    },
    autobattleByMonster: {}, // { [monsterId]: true|false }

    // Discoveries / progression
    monsterKills: {},
    discoveredDrops: {},

    // UI/logging
    logs: [],
    logFilter: 'all',
    ui: {},

    // --- Camp / Construction (PERSISTED) ---
    camp: { gridW: 36, gridH: 12, placed: [] },

    // Selections
    selectedTreeId: 'oak',
    selectedSpotId: 'pond_shallows',
    selectedRockId: 'copper_rock',
    trainingStyle: 'shared',

    // Runtime
    action: null,
    combat: null,
    hpCurrent: null,
    manaCurrent: 0,

    // Internal utility
    _jobSeq: 0,
    lastDamageMs: 0,
  };
}

/* ---------------- Live singleton ---------------- */
export const state = defaultState();

/* ---------------- Helpers ---------------- */
function sanitizeCamp(c){
  const base = { gridW:36, gridH:12, placed:[] };
  if (!c || typeof c !== 'object') return base;

  const gridW = Number.isFinite(c.gridW) ? c.gridW : 36;
  const gridH = Number.isFinite(c.gridH) ? c.gridH : 12;

  const placed = Array.isArray(c.placed) ? c.placed.map(p => ({
    id: String(p?.id || ''),
    x: Math.max(0, (p?.x|0)),
    y: Math.max(0, (p?.y|0)),
    rot: (p?.rot|0) || 0,
    status: 'active',
  })) : [];

  return { gridW, gridH, placed };
}

/* ---------------- Persistence ---------------- */
function safeToSave(s){
  return {
    version: SAVE_VERSION,

    gold: s.gold || 0,

    wcXp: s.wcXp||0, fishXp: s.fishXp||0, minXp: s.minXp||0,
    atkXp: s.atkXp||0, strXp: s.strXp||0, defXp: s.defXp||0,
    smithXp: s.smithXp||0, craftXp: s.craftXp||0, cookXp: s.cookXp||0,
    enchantXp: s.enchantXp||0, alchXp: s.alchXp||0,
    constructionXp: s.constructionXp||0,

    inventory: s.inventory || {},
    equipment: s.equipment || {},
    equipmentMods: s.equipmentMods || {},

    royalXp: s.royalXp||0,
    royalContract: s.royalContract ?? null,
    royalFavor: s.royalFavor||0,
    royalHistory: Array.isArray(s.royalHistory) ? s.royalHistory : [],
    unlocks: s.unlocks || { autobattle:false },
    autobattleByMonster: s.autobattleByMonster || {},

    monsterKills: s.monsterKills || {},
    discoveredDrops: s.discoveredDrops || {},

    logs: Array.isArray(s.logs) ? s.logs : [],
    logFilter: s.logFilter || 'all',
    ui: s.ui || {},

    camp: sanitizeCamp(s.camp),

    selectedTreeId: s.selectedTreeId || 'oak',
    selectedSpotId: s.selectedSpotId || 'pond_shallows',
    selectedRockId: s.selectedRockId || 'copper_rock',
    trainingStyle: s.trainingStyle || 'shared',

    action: s.action || null,
    combat: s.combat || null,
    hpCurrent: s.hpCurrent == null ? null : s.hpCurrent,
    manaCurrent: s.manaCurrent == null ? 0 : s.manaCurrent,

    _jobSeq: s._jobSeq || 0,
  };
}

export function saveState(s = state){
  try {
    const safe = safeToSave(s);
    localStorage.setItem(SAVE_KEY, JSON.stringify(safe));
  } catch {}
}

export function loadState(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}

/* ---------------- Migrator ---------------- */
function migrateLoaded(loaded){
  if (!loaded || typeof loaded !== 'object') return null;

  if (!loaded.version) loaded.version = 1;

  loaded.inventory       = loaded.inventory       || {};
  loaded.equipment       = loaded.equipment       || {};
  loaded.equipmentMods   = loaded.equipmentMods   || {};
  loaded.monsterKills    = loaded.monsterKills    || {};
  loaded.discoveredDrops = loaded.discoveredDrops || {};
  loaded.logs            = Array.isArray(loaded.logs) ? loaded.logs : [];
  loaded.royalHistory    = Array.isArray(loaded.royalHistory) ? loaded.royalHistory : [];
  loaded.ui              = loaded.ui || {};
  delete loaded.lastDamageMs;

  // Normalize equipment slots
  const eqBase = defaultState().equipment;
  loaded.equipment = { ...eqBase, ...loaded.equipment };

  if (!loaded.unlocks || typeof loaded.unlocks !== 'object') loaded.unlocks = { autobattle:false };
  if (!loaded.autobattleByMonster || typeof loaded.autobattleByMonster !== 'object') loaded.autobattleByMonster = {};

  // Ensure constructionXp exists
  if (typeof loaded.constructionXp !== 'number') loaded.constructionXp = 0;

  if (typeof loaded.royalFavor !== 'number') loaded.royalFavor = 0;

  // Ensure camp exists & normalized
  loaded.camp = sanitizeCamp(loaded.camp);

  loaded.version = SAVE_VERSION;
  return loaded;
}

/* ---------------- Hydration ---------------- */
export function hydrateState(){
  const loadedRaw = loadState();
  const loaded = migrateLoaded(loadedRaw);
  const base = defaultState();

  if (!loaded){
    Object.assign(state, base);
    return state;
  }

  const merged = {
    ...base,
    ...loaded,
    inventory:       { ...base.inventory,       ...loaded.inventory },
    equipment:       { ...base.equipment,       ...loaded.equipment },
    equipmentMods:   { ...base.equipmentMods,   ...loaded.equipmentMods },
    monsterKills:    { ...base.monsterKills,    ...loaded.monsterKills },
    discoveredDrops: { ...base.discoveredDrops, ...loaded.discoveredDrops },
    ui:              { ...base.ui,              ...loaded.ui },
    camp:            sanitizeCamp(loaded.camp),
    unlocks:         { ...base.unlocks,         ...loaded.unlocks },
    autobattleByMonster: { ...base.autobattleByMonster, ...loaded.autobattleByMonster },
  };

  merged.lastDamageMs = 0;
  merged.logs = loaded.logs;
  merged.royalHistory = loaded.royalHistory;

  merged.action = null;
  merged.combat = null;

  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, merged);

  return state;
}
