// /systems/mana.js
import { XP_TABLE, levelFromXp } from './xp.js';

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
    ensureMana(state);   // clamps current to the (potentially new) max
    _notifyMana(state);  // tell subscribers (character panel, etc.)
  }

let _manaTimer = null; // ensure no multiple timers

export function manaMaxFor(state){
    const bonus = state.manaBonus || 0;
    const enchLvl = levelFromXp(state.enchantXp || 0, XP_TABLE);  // +1 max per Enchanting level
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

/**
 * Starts passive mana regen: +1 every 5 seconds, up to max.
 * onTick is optional; if provided, it’s called whenever mana increases.
 */
export function startManaRegen(state, onTick){
    if (onTick) _manaSubs.add(onTick);  
  if (_manaTimer) return _manaTimer; // already running

  let secs = 0;
  _manaTimer = setInterval(()=>{
    secs += 1;
    if (secs >= 5){
      secs = 0;
      const max = manaMaxFor(state);
      ensureMana(state);
      if (state.manaCurrent < max){
        state.manaCurrent += 1;
        _notifyMana(state); 
        onTick?.(state);
      }
    }
  }, 1000);

  return _manaTimer;
}
