// /systems/hp.js
import { hpMaxFor } from './combat.js';

const _hpSubs = new Set();
let _pending = false;

function notify(state){
  if (_pending) return;
  _pending = true;
  requestAnimationFrame(()=>{
    _pending = false;
    for (const cb of _hpSubs) { try { cb(state); } catch {} }
    try { window.dispatchEvent(new Event('hp:change')); } catch {}
  });
}

export function onHpChange(cb){
  if (typeof cb === 'function') _hpSubs.add(cb);
  return () => _hpSubs.delete(cb);
}

export function ensureHp(state){
  const max = hpMaxFor(state);
  if (state.hpCurrent == null) state.hpCurrent = max; // spawn full
  const clamped = Math.max(0, Math.min(max, state.hpCurrent|0));
  if (clamped !== state.hpCurrent){
    state.hpCurrent = clamped;
    notify(state);
  }
  return state.hpCurrent;
}

export function addHp(state, n=0){
  ensureHp(state);
  const max = hpMaxFor(state);
  const before = state.hpCurrent|0;
  const after = Math.min(max, before + Math.max(0, n|0));
  if (after !== before){
    state.hpCurrent = after;
    notify(state);
  }
  return after - before;
}

// ---- Passive regen (out of combat) ----
let _hpTimer = null;
let _tickCb = null;

/** Heal 1 HP every 5s when not in an active fight */
export function startHpRegen(state, onTick){
  if (onTick) _tickCb = onTick;         // keep latest cb
  if (_hpTimer) return _hpTimer;

  let secs = 0;
  _hpTimer = setInterval(()=>{
    secs += 1;
    if (secs >= 5){
      secs = 0;
      // Skip regen during combat
      const inCombat = !!(state.combat && state.combat.active) || state.action?.type === 'combat';
      if (!inCombat){
        const gained = addHp(state, 1);
        if (gained > 0 && _tickCb){
          try { _tickCb(state); } catch {}
        }
      }
    }
  }, 1000);

  return _hpTimer;
}

export function stopHpRegen(){
  if (_hpTimer){
    clearInterval(_hpTimer);
    _hpTimer = null;
  }
  _tickCb = null;
}
