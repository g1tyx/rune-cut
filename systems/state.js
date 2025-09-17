// systems/state.js

const SAVE_KEY = 'runecut-save';
const SAVE_VERSION = 2;

// ---- Factory for a fresh state ----
export function defaultState(){
  return {
    version: SAVE_VERSION,

    gold: 0,

    // Skill XP
    wcXp: 0, fishXp: 0, minXp: 0,
    atkXp: 0, strXp: 0, defXp: 0,
    smithXp: 0, craftXp: 0, cookXp: 0,
    enchantXp: 0,

    // Core data
    inventory: {},
    equipment: {
      axe:null, pick:null, weapon:null, shield:null,
      head:null, body:null, legs:null, gloves:null, boots:null,
      amulet:null, ring:null, cape:null,
      // Optional food slots (kept if you use them elsewhere)
      food:null, foodQty:0,
    },
    equipmentMods: {},

    // Royal
    royalXp: 0,
    royalContract: null,
    royalHistory: [],

    // Discoveries / progression
    monsterKills: {},
    discoveredDrops: {},

    // UI/logging
    logs: [],
    logFilter: 'all',
    ui: {},

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

// ---- Live singleton (import { state } from './state.js') ----
export const state = defaultState();

/* ---------------- Persistence helpers ---------------- */

function safeToSave(s){
  // Whitelist explicit shape so we never drop critical maps
  return {
    version: SAVE_VERSION,

    gold: s.gold || 0,

    wcXp: s.wcXp||0, fishXp: s.fishXp||0, minXp: s.minXp||0,
    atkXp: s.atkXp||0, strXp: s.strXp||0, defXp: s.defXp||0,
    smithXp: s.smithXp||0, craftXp: s.craftXp||0, cookXp: s.cookXp||0,
    enchantXp: s.enchantXp||0,

    inventory: s.inventory || {},
    equipment: s.equipment || {},
    equipmentMods: s.equipmentMods || {},

    royalXp: s.royalXp||0,
    royalContract: s.royalContract ?? null,
    royalHistory: Array.isArray(s.royalHistory) ? s.royalHistory : [],

    monsterKills: s.monsterKills || {},
    discoveredDrops: s.discoveredDrops || {},

    logs: Array.isArray(s.logs) ? s.logs : [],
    logFilter: s.logFilter || 'all',
    ui: s.ui || {},

    selectedTreeId: s.selectedTreeId || 'oak',
    selectedSpotId: s.selectedSpotId || 'pond_shallows',
    selectedRockId: s.selectedRockId || 'copper_rock',
    trainingStyle: s.trainingStyle || 'shared',

    // Runtime (persist current HP/mana; timers will be nulled on hydrate)
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

// Basic migrator so older saves gain new keys safely
function migrateLoaded(loaded){
  if (!loaded || typeof loaded !== 'object') return null;

  // v1 → v2: ensure critical maps/arrays exist
  if (!loaded.version) loaded.version = 1;

  loaded.inventory      = loaded.inventory      || {};
  loaded.equipment      = loaded.equipment      || {};
  loaded.equipmentMods  = loaded.equipmentMods  || {};
  loaded.monsterKills   = loaded.monsterKills   || {};
  loaded.discoveredDrops= loaded.discoveredDrops|| {};
  loaded.logs           = Array.isArray(loaded.logs) ? loaded.logs : [];
  loaded.royalHistory   = Array.isArray(loaded.royalHistory) ? loaded.royalHistory : [];
  loaded.ui             = loaded.ui || {};
  delete loaded.lastDamageMs;

  // Normalize equipment slots that might be missing in old saves
  const eqBase = defaultState().equipment;
  loaded.equipment = { ...eqBase, ...loaded.equipment };

  // Bump to current version (no destructive transforms needed right now)
  loaded.version = SAVE_VERSION;
  return loaded;
}

// Merge saved data into the live singleton without changing its identity.
// Call this once at boot (e.g., in ui/app.js) before first render.
export function hydrateState(){
  const loadedRaw = loadState();
  const loaded = migrateLoaded(loadedRaw);
  const base = defaultState();

  if (!loaded){
    // fresh boot — ensure baseline shape
    Object.assign(state, base);
    return state;
  }

  // Start from defaults, overlay loaded, and deep-merge important maps
  const merged = {
    ...base,
    ...loaded,
    inventory:       { ...base.inventory,       ...loaded.inventory },
    equipment:       { ...base.equipment,       ...loaded.equipment },
    equipmentMods:   { ...base.equipmentMods,   ...loaded.equipmentMods },
    monsterKills:    { ...base.monsterKills,    ...loaded.monsterKills },
    discoveredDrops: { ...base.discoveredDrops, ...loaded.discoveredDrops },
    ui:              { ...base.ui,              ...loaded.ui },
  };

  // Arrays already sanitized by migrateLoaded
  merged.lastDamageMs = 0;
  merged.logs = loaded.logs;
  merged.royalHistory = loaded.royalHistory;

  // Never resume half-finished timers after reload
  merged.action = null;
  merged.combat = null;

  // Replace contents of the live singleton (preserve reference)
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, merged);

  return state;
}

