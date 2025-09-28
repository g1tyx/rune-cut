// /systems/crafting.js — uses production_core over CRAFT_RECIPES

import { hasItems } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { clampMs } from './utils.js';
import { createProductionSkill } from './production_core.js';
import { CRAFT_RECIPES } from '../data/crafting.js';

const XP_TABLE = buildXpTable();
export const MIN_CRAFT_TIME_MS = 300;

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
    default:        return `${skill}Xp`;
  }
};

const mod = createProductionSkill({
  actionType: 'craft',
  data: CRAFT_RECIPES,
  labelVerb: 'Craft',
  levelScale: 0.03,
  minActionMs: MIN_CRAFT_TIME_MS
});

// Public API expected by the UI
export const maxCraftable = mod.maxCraftable;
export const canCraft     = mod.canMake;
export const startCraft   = mod.start;
export const finishCraft  = mod.finish;
export const craftOnce    = mod.finishOne;

// For progress bars / timers (level-aware)
export function craftDurationMs(state, id){
  const r = mod.get(id);
  if (!r) return 0;
  const key = xpKeyOf(r.speedSkill || 'craft');
  const lvl = levelFromXp(state[key] || 0, XP_TABLE);
  const mult = Math.max(1, 1 + 0.03 * Math.max(0, lvl - 1));
  return clampMs(r.time / mult, MIN_CRAFT_TIME_MS);
}

// Gate reason helper for hints
export function craftGateReason(state, id, times = 1){
  const r = mod.get(id);
  if (!r) return 'unknown';
  const reqKey = xpKeyOf(r.reqSkill || 'craft');
  const lvl = levelFromXp(state[reqKey] || 0, XP_TABLE);
  if (lvl < (r.level || 1)) return 'level';
  const n = Math.max(1, times|0);
  const reqs = r.inputs.map(i => ({ id:i.id, qty:(i.qty|0) * n }));
  return hasItems(state, reqs) ? null : 'materials';
}
