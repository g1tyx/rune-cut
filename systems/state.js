// /systems/state.js
import { addPet } from './pet.js';

const SAVE_KEY = 'runecut-save';
const SAVE_VERSION = 4;

export function defaultState(){
  const base = {
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
      tome:null, tomeQty:0
    },
    equipmentMods: {},

    // Royal
    royalFavor: 0,
    royalContract: null,
    royalHistory: [],

    unlocks: { autobattle: false },
    autobattleByMonster: {},

    // Discoveries / progression
    monsterKills: {},
    discoveredDrops: {},

    // Pets (full stat objects live here)
    pets: {},

    // UI/logging
    logs: [],
    logFilter: 'all',
    ui: { activePet: null },

    // Camp / Construction
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

    _jobSeq: 0,
    lastDamageMs: 0,
  };

  // Starter pet if nothing else sets it later
  addPet(base, 'cheeken');

  return base;
}

export const state = defaultState();

function safeToSave(s){
  return {
    version: SAVE_VERSION,

    gold: s.gold || 0,

    wcXp: s.wcXp||0, fishXp: s.fishXp||0, minXp: s.minXp||0,
    atkXp: s.atkXp||0, strXp: s.strXp||0, defXp: s.defXp||0,
    smithXp: s.smithXp||0, craftXp: s.craftXp||0, cookXp: s.cookXp||0,
    enchantXp: s.enchantXp||0, alchXp: s.alchXp||0,
    constructionXp: s.constructionXp||0, royalXp: s.royalXp||0,

    inventory: s.inventory || {},
    equipment: s.equipment || {},
    equipmentMods: s.equipmentMods || {},

    royalContract: s.royalContract ?? null,
    royalFavor: s.royalFavor||0,
    royalHistory: Array.isArray(s.royalHistory) ? s.royalHistory : [],
    unlocks: s.unlocks || { autobattle:false },
    autobattleByMonster: s.autobattleByMonster || {},

    monsterKills: s.monsterKills || {},
    discoveredDrops: s.discoveredDrops || {},

    // Pets are stored exactly as maintained at runtime (no normalization)
    pets: s.pets || {},

    logs: Array.isArray(s.logs) ? s.logs : [],
    logFilter: s.logFilter || 'all',
    ui: s.ui || { activePet: null },

    camp: s.camp,

    selectedTreeId: s.selectedTreeId || 'oak',
    selectedSpotId: s.selectedSpotId || 'pond_shallows',
    selectedRockId: s.selectedRockId || 'copper_rock',
    trainingStyle: s.trainingStyle || 'shared',

    action: s.action || null,
    combat: s.combat || null,
    hpCurrent: s.hpCurrent == null ? null : s.hpCurrent,
    manaCurrent: s.manaCurrent == null ? 0 : s.manaCurrent,

    _jobSeq: s._jobSeq || 0,
    lastDamageMs: s.lastDamageMs || 0,
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

export function hydrateState(){
  const loaded = loadState();

  if (!loaded){
    // brand new: keep defaults (which include cheeken via addPet)
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, defaultState());
    return state;
  }

  // Replace live state with loaded data
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, { ...defaultState(), ...loaded, version: SAVE_VERSION });

  // If there are no pets at all in the save, add starter and do NOT modify existing otherwise
  if (!state.pets || Object.keys(state.pets).length === 0){
    state.pets = {};
    addPet(state, 'cheeken');
  }

  // If there's no activePet but pets exist, pick the first key (explicit, minimal)
  if (!state.ui) state.ui = {};
  if (!state.ui.activePet && state.pets && Object.keys(state.pets).length){
    state.ui.activePet = Object.keys(state.pets)[0];
  }

  return state;
}
