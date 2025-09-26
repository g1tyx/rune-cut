// /systems/production_core.js
import { addItem, removeItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { clampMs } from './utils.js';

const XP_TABLE = buildXpTable();

/**
 * Create a standardized production skill module (e.g., crafting, smithing, alchemy).
 *
 * Data schema (per recipe):
 * {
 *   id: 'planks_from_oak',
 *   name: 'Oak Planks',
 *   time: 2000,                // base ms
 *   level: 3,                  // gate level (default 1)
 *   reqSkill: 'craft',         // which skill gates level (default 'craft')
 *   speedSkill: 'craft',       // which skill speeds process (default 'craft')
 *   inputs:  [{ id, qty }, ...],
 *   outputs: [{ id, qty }, ...],
 *   xp: [{ skill:'craft', amount: 8 }, ...] // one or many skills can gain xp
 * }
 */
export function createProductionSkill(cfg){
  const {
    actionType,           // 'craft' | 'smelt' | 'brew' | ...
    data,                 // object map: { id -> recipe }
    labelVerb,            // 'Craft' | 'Smelt' | 'Brew' ...
    levelScale = 0.03,    // +3% per level on speedSkill
    minActionMs = 300,    // clamp floor
    // map a skill id (e.g. 'craft') to the state xp property (e.g. 'craftXp')
    xpKeyOf = (skill)=> ({ craft:'craftXp', wc:'wcXp', fish:'fishXp', min:'minXp', smith:'smithXp', construction:'constructionXp' }[skill] || (skill + 'Xp')),
  } = cfg;

  const get = (id)=> {
    const r = data?.[id];
    if (!r) return null;
    // normalize a view without mutating source
    return {
      id, name: r.name || id,
      time: Number(r.time || 1000),
      level: Number(r.level || r.lvl || 1),
      reqSkill: r.reqSkill || 'craft',
      speedSkill: r.speedSkill || 'craft',
      inputs: Array.isArray(r.inputs) ? r.inputs.map(i=>({ id:i.id, qty:Number(i.qty||0) })) : [],
      outputs: Array.isArray(r.outputs)? r.outputs.map(o=>({ id:o.id, qty:Number(o.qty||0) })) : [],
      xp: Array.isArray(r.xp) ? r.xp.map(g=>({ skill:g.skill, amount:Number(g.amount||0) })) : [],
      _raw: r
    };
  };

  const levelOf = (state, skill)=>{
    const key = xpKeyOf(skill);
    return levelFromXp(state[key] || 0, XP_TABLE);
  };

  const speedMult = (state, recipe)=>{
    const skill = recipe?.speedSkill || 'craft';
    const lvl   = levelOf(state, skill);
    return 1 + levelScale * (lvl - 1);
  };

  const meetsLevel = (state, recipe)=>{
    const need = Number(recipe.level || 1);
    const have = levelOf(state, recipe.reqSkill || 'craft');
    return have >= need;
  };

  const haveInputs = (state, recipe, times = 1)=>{
    const n = Math.max(1, times|0);
    for (const inp of recipe.inputs){
      const have = state.inventory?.[inp.id] || 0;
      if (have < inp.qty * n) return false;
    }
    return true;
  };

  const maxCraftable = (state, id)=>{
    const r = get(id); if (!r || !r.inputs.length) return 0;
    if (!meetsLevel(state, r)) return 0;
    let m = Infinity;
    for (const inp of r.inputs){
      const have = state.inventory?.[inp.id] || 0;
      m = Math.min(m, Math.floor(have / Math.max(1, inp.qty)));
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

  const _applyIOAndXp = (state, r)=>{
    // inputs
    for (const inp of r.inputs) removeItem(state, inp.id, inp.qty);
    // outputs
    for (const out of r.outputs) addItem(state, out.id, out.qty);
    // xp
    for (const g of r.xp){
      if (!g?.skill || !(g.amount > 0)) continue;
      const key = xpKeyOf(g.skill);
      state[key] = (state[key] || 0) + g.amount;
    }
    try { window.dispatchEvent(new Event('xp:gain')); } catch {}
  };

  const finish = (state, id)=>{
    const key = id || state.action?.key;
    const r = get(key); if (!r){ state.action = null; return null; }
    if (!canMake(state, key, 1)){ state.action = null; return null; }

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
    if (!canMake(state, key, 1)) return null;

    _applyIOAndXp(state, r);
    return {
      id: r.id,
      name: r.name,
      xpGains: r.xp.slice()
    };
  };

  return {
    get, canMake, maxCraftable, start, finish, finishOne
  };
}
