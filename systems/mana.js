// /systems/mana.js
import { XP_TABLE, levelFromXp } from './xp.js';
import { ITEMS } from '../data/items.js';
import { removeItem } from './inventory.js';
import { applyEffect } from './effects.js';

export const MANA_BASE_MAX = 10;

const _manaSubs = new Set();
function _notifyMana(state){
  for (const cb of _manaSubs) { try { cb(state); } catch {} }
  try { window.dispatchEvent(new CustomEvent('mana:change')); } catch {}
}
export function onManaChange(cb){
  if (typeof cb === 'function') _manaSubs.add(cb);
  return () => _manaSubs.delete(cb);
}

export function recalcMana(state){
  ensureMana(state);
  _notifyMana(state);
}

let _manaTimer = null;

export function manaMaxFor(state){
  const bonus = state.manaBonus || 0;
  const enchLvl = levelFromXp(state.enchantXp || 0, XP_TABLE);
  return MANA_BASE_MAX + Math.max(0, bonus) + enchLvl;
}

export function ensureMana(state){
  const max = manaMaxFor(state);
  if (state.manaCurrent == null) state.manaCurrent = max;
  state.manaCurrent = Math.max(0, Math.min(max, state.manaCurrent));
  return state.manaCurrent;
}

export function addMana(state, n=0){
  ensureMana(state);
  const max = manaMaxFor(state);
  const before = state.manaCurrent;
  state.manaCurrent = Math.min(max, before + Math.max(0, n|0));
  if (state.manaCurrent !== before) _notifyMana(state);
  return state.manaCurrent - before;
}

export function spendMana(state, n=0){
  ensureMana(state);
  const need = Math.max(0, n|0);
  if ((state.manaCurrent||0) < need) return false;
  state.manaCurrent -= need;
  _notifyMana(state);
  return true;
}

export function startManaRegen(state, onTick){
  if (onTick) _manaSubs.add(onTick);
  if (_manaTimer) return _manaTimer;
  let secs = 0;
  _manaTimer = setInterval(()=>{
    secs += 1;
    if (secs >= 5){
      secs = 0;
      const gained = addMana(state, 1);
      if (gained > 0) { try { onTick?.(state); } catch {} }
    }
  }, 1000);
  return _manaTimer;
}

function baseId(id){ return String(id||'').split('@')[0]; }
function firstStackIdForBase(inv={}, base){
  for (const [id, qty] of Object.entries(inv)){
    if (qty > 0 && baseId(id) === base) return id;
  }
  return null;
}

export function drinkPotion(state, preferId = null, opts = {}){
  const inv = state.inventory || {};
  const preferBase = preferId ? baseId(preferId) : null;

  let useBase = null;
  let stackId = null;

  if (preferBase){
    stackId = opts.sourceId || firstStackIdForBase(inv, preferBase);
    if (stackId) useBase = preferBase;
  }

  if (!useBase){
    for (const [id, qty] of Object.entries(inv)){
      if (qty <= 0) continue;
      const b = baseId(id);
      const it = ITEMS[b];
      if (!it) continue;
      if (Number(it.mana)>0 || Number(it.accBonus)>0 || Number(it.dmgReduce)>0){
        useBase = b;
        stackId = id;
        break;
      }
    }
  }

  if (!useBase || !stackId) return { ok:false, reason:'no-potion' };
  const it = ITEMS[useBase] || {};

  if (Number(it.mana) > 0){
    const max = manaMaxFor(state);
    const cur = Math.max(0, Math.min(max, state.manaCurrent|0));
    if (cur >= max) return { ok:false, reason:'mana-full' };
    const restore = Math.max(1, Number(it.mana)||0);
    const gained  = Math.min(restore, max - cur);
    removeItem(state, stackId, 1);
    state.manaCurrent = cur + gained;
    try { window.dispatchEvent(new Event('mana:change')); } catch {}
    return { ok:true, id: useBase, name: it.name || useBase, type:'mana', gained };
  }

  if (Number(it.accBonus) > 0){
    const durMs = Math.max(1000, (it.durationSec|0)*1000 || 300000);
    const now   = Date.now();
    const cur   = Number(state.accPotionUntilMs) || 0;
    const base  = Math.max(now, cur);
    state.accPotionUntilMs = base + durMs;

    applyEffect(state, {
      id: 'acc',
      name: 'Accuracy',
      durationMs: durMs,
      data: { type:'acc', hitBonus: Number(it.accBonus)||0 }
    });

    removeItem(state, stackId, 1);
    return { ok:true, id: useBase, name: it.name || useBase, type:'acc' };
  }

  if (Number(it.dmgReduce) > 0){
    const val   = Number(it.dmgReduce)|0;
    const durMs = Math.max(1000, (it.durationSec|0)*1000 || 300000);

    applyEffect(state, {
      id: 'defense',
      name: 'Defense',
      durationMs: durMs,
      data: { type:'dmgReduce', value: val }
    });

    removeItem(state, stackId, 1);
    return { ok:true, id: useBase, name: it.name || useBase, type:'defense', value: val };
  }

  return { ok:false, reason:'not-supported' };
}
