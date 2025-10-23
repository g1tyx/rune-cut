// /systems/production_core.js
// Centralized production skill engine (crafting, smithing, alchemy, …)
// Now uses atomic inventory helpers to prevent "didn't consume items" bugs.

import { hasItems, spendItems, grantItems } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { clampMs } from './utils.js';

const XP_TABLE = buildXpTable();

/**
 * Create a standardized production skill module (e.g., crafting, smithing, alchemy).
 *
 * Recipe shape (normalized view):
 * {
 *   id, name, time, level,
 *   reqSkill,        // gate skill (default: 'craft')
 *   speedSkill,      // speed scaling skill (default: 'craft')
 *   inputs:  [{id, qty}],
 *   outputs: [{id, qty}],
 *   xp:      [{skill, amount}]
 * }
 */
export function createProductionSkill({
  actionType = 'craft',
  data = {},
  labelVerb = 'Craft',
  levelScale = 0.03,   // +3%/level on speedSkill
  minActionMs = 300
} = {}) {

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
      case 'destruction': return 'destructionXp';
      default:        return `${skill}Xp`; // fallback for new skills
    }
  };

  const get = (id)=> {
    const r = data?.[id];
    if (!r) return null;
    // normalize a view without mutating source
    return {
      id,
      name: r.name || id,
      time: Number(r.time || 1000),
      level: Number(r.level || r.lvl || 1),
      reqSkill: r.reqSkill || actionType,
      speedSkill: r.speedSkill || actionType,

      inputs:  Array.isArray(r.inputs)  ? r.inputs.map(i => ({ id:i.id, qty:Number(i.qty||0) })) : [],
      outputs: Array.isArray(r.outputs) ? r.outputs.map(o => ({ id:o.id, qty:Number(o.qty||0) })) : [],

      xp: Array.isArray(r.xp)
        ? r.xp.map(g => ({ skill:g.skill, amount:Number(g.amount||0) }))
        : (r.xp && r.xp.skill ? [{ skill:r.xp.skill, amount:Number(r.xp.amount||0) }] : []),

      _raw: r
    };
  };

  const meetsLevel = (state, r)=>{
    const key = xpKeyOf(r.reqSkill);
    const lvl = levelFromXp(state[key] || 0, XP_TABLE);
    return lvl >= (r.level || 1);
  };

  const speedMult = (state, r)=>{
    const key = xpKeyOf(r.speedSkill);
    const lvl = levelFromXp(state[key] || 0, XP_TABLE);
    return Math.max(1, 1 + levelScale * Math.max(0, lvl - 1));
  };

  const haveInputs = (state, recipe, times = 1)=>{
    const n = Math.max(1, times|0);
    const reqs = recipe.inputs.map(inp => ({ id: inp.id, qty: (inp.qty|0) * n }));
    return hasItems(state, reqs);
  };

  const maxCraftable = (state, id)=>{
    const r = get(id); if (!r || !r.inputs.length) return 0;
    if (!meetsLevel(state, r)) return 0;
    let m = Infinity;
    for (const inp of r.inputs){
      const have = Number(state.inventory?.[inp.id] || 0);
      const need = Math.max(1, inp.qty|0);
      m = Math.min(m, Math.floor(have / need));
    }
    return Number.isFinite(m) ? Math.max(0, m) : 0;
  };

  const canMake = (state, id, times = 1)=>{
    const r = get(id); if (!r) return false;
    if (!meetsLevel(state, r)) return false;
    return haveInputs(state, r, times);
  };

  const start = (state, id, onDone)=>{
    const r = get(id); if (!r) return false;
    if (!canMake(state, id, 1)) return false;

    // Consume inputs IMMEDIATELY on start (so stop() returns them atomically)
    const reqs = r.inputs.map(i => ({ id:i.id, qty:i.qty|0 })).filter(x=>x.qty>0);
    if (reqs.length && !spendItems(state, reqs)) return false;

    const dur = clampMs(r.time / speedMult(state, r), minActionMs);
    const now = performance.now();

    state.action = {
      type: actionType,
      label: `${labelVerb} ${r.name}`,
      startedAt: now,
      endsAt: now + dur,
      duration: dur,
      key: id
    };

    setTimeout(()=>{
      if (state.action?.type === actionType && state.action?.key === id){
        onDone?.();
      }
    }, dur);

    return true;
  };

  // Apply outputs + XP (inputs already spent in start())
  const _applyIOAndXp = (state, r)=>{
    // outputs
    const outs = r.outputs.map(o => ({ id:o.id, qty:o.qty|0 })).filter(x=>x.qty>0);
    if (outs.length) grantItems(state, outs);

    // xp
    for (const g of r.xp){
      if (!g?.skill || !(g.amount > 0)) continue;
      const key = xpKeyOf(g.skill);
      state[key] = (state[key] || 0) + g.amount;
    }
    try { window.dispatchEvent(new Event('xp:gain')); } catch {}
    return true;
  };

  const finish = (state, id)=>{
    const key = id || state.action?.key;
    const r = get(key); if (!r){ state.action = null; return null; }

    _applyIOAndXp(state, r);
    state.action = null;
    return {
      id: r.id,
      name: r.name,
      xpGains: r.xp.slice()
    };
  };

  const finishOne = (state)=>{
    const key = state.action?.key; if (!key) return null;
    const r = get(key); if (!r) return null;

    _applyIOAndXp(state, r);
    return {
      id: r.id,
      name: r.name,
      xpGains: r.xp.slice()
    };
  };

  // Stop action and return input items to inventory
  const stop = (state)=>{
    const key = state.action?.key;
    const r = get(key);
    if (r && r.inputs && r.inputs.length){
      // Return all input items
      const itemsToReturn = r.inputs.map(i => ({ id:i.id, qty:i.qty|0 })).filter(x=>x.qty>0);
      if (itemsToReturn.length) grantItems(state, itemsToReturn);
    }
    state.action = null;
    return true;
  };

  return {
    get, canMake, maxCraftable, start, finish, finishOne, stop
  };
}
