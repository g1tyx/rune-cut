// /systems/mechanics.js — uses production_core over all mechanics data

import { hasItems } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { clampMs } from './utils.js';
import { createProductionSkill } from './production_core.js';

// IMPORTANT: pull *all* exported maps from /data/mechanics.js, then merge.
import * as MECH_DATA from '../data/mechanics.js';

const XP_TABLE = buildXpTable();
export const MIN_MECH_TIME_MS = 300;

// Merge any number of named maps exported from data/mechanics.js
// e.g., { small_gear: {...} }, { bearings: {...} }, etc.
function mergeAllMaps(mod) {
  const out = {};
  for (const v of Object.values(mod)) {
    if (v && typeof v === 'object') Object.assign(out, v);
  }
  return out;
}
export const MECHANICS_RECIPES = mergeAllMaps(MECH_DATA);

// XP key resolver (kept identical to Crafting so it plays nice with core)
const xpKeyOf = (skill)=>{
  switch (skill) {
    case 'woodcut': return 'wcXp';
    case 'fish':    return 'fishXp';
    case 'min':     return 'minXp';
    case 'atk':     return 'atkXp';
    case 'str':     return 'strXp';
    case 'def':     return 'defXp';
    case 'smith':   return 'smithXp';
    case 'craft':   return 'craftXp';
    case 'cook':    return 'cookXp';
    case 'enchant': return 'enchantXp';
    case 'alch':    return 'alchXp';
    case 'royal':   return 'royalXp';
    // mechanics falls through to default below
    default:        return `${skill}Xp`;
  }
};

const mod = createProductionSkill({
  actionType: 'mechanics',
  data: MECHANICS_RECIPES,
  labelVerb: 'Assemble',
  levelScale: 0.03,          // same speed scaling as Crafting
  minActionMs: MIN_MECH_TIME_MS
});

// Public API expected by the generic recipe UI
export const maxMakeMech  = mod.maxCraftable ?? mod.maxMake ?? mod.max; // defensive aliasing
export const canAssemble  = mod.canMake;
export const startMech    = mod.start;
export const finishMech   = mod.finish;
export const assembleOnce = mod.finishOne;
export const stopMech     = mod.stop;

// Level-aware duration
export function mechanicsDurationMs(state, id){
  const r = mod.get(id);
  if (!r) return 0;
  const key = xpKeyOf(r.speedSkill || 'mechanics');
  const lvl = levelFromXp(state[key] || 0, XP_TABLE);
  const mult = Math.max(1, 1 + 0.03 * Math.max(0, lvl - 1));
  return clampMs(r.time / mult, MIN_MECH_TIME_MS);
}

// Gate reason helper for hints
export function mechanicsGateReason(state, id, times = 1){
  const r = mod.get(id);
  if (!r) return 'unknown';
  const reqKey = xpKeyOf(r.reqSkill || 'mechanics');
  const lvl = levelFromXp(state[reqKey] || 0, XP_TABLE);
  if (lvl < (r.level || 1)) return 'level';
  const n = Math.max(1, times|0);
  const reqs = r.inputs.map(i => ({ id:i.id, qty:(i.qty|0) * n }));
  return hasItems(state, reqs) ? null : 'materials';
}
