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
      // Safely add via addMana so clamping + notifications are consistent
      const gained = addMana(state, 1);
      if (gained > 0) { try { onTick?.(state); } catch {} }
    }
  }, 1000);

  return _manaTimer;
}

function baseId(id){ return String(id||'').split('@')[0]; }
function firstStackIdForBase(inv={}, base){
  // Find any inventory key whose baseId matches (handles @quality stacks)
  for (const [id, qty] of Object.entries(inv)){
    if (qty > 0 && baseId(id) === base) return id;
  }
  return null;
}

/**
 * Unified potion consumption:
 *   drinkPotion(state, idOrBase, { sourceId })
 * - If the item restores mana (ITEMS[base].mana), restore & consume.
 * - If the item provides a timed effect (e.g., accBonus/durationSec), apply/extend & consume.
 * - Non-stacking: same effect id extends duration.
 * Returns { ok, kind: 'mana'|'effect', consumedId?, gained?, effectId? }
 */
export function drinkPotion(state, idOrBase='small_mana_potion', opts={}){
  const inv = state.inventory || {};
  const passedBase = baseId(idOrBase);

  const def = ITEMS[passedBase];
  if (!def) return { ok:false, reason:'unknown' };

  // Choose which stack to consume:
  //  - prefer exact stack if opts.sourceId points to one you have
  //  - else prefer a stack that matches the passed base
  //  - else (for a generic call) scan for *any* mana/effect potion you have
  let consumeId = null;

  if (opts.sourceId && (inv[opts.sourceId]|0) > 0){
    consumeId = opts.sourceId; // exact stack (e.g., with @quality)
  } else if ((inv[passedBase]|0) > 0){
    consumeId = passedBase;     // exact base key present in inventory
  } else {
    // Fallback: find *any* stack for this base
    consumeId = firstStackIdForBase(inv, passedBase);

    // If still nothing and caller passed a generic id, scan for any potion you own
    if (!consumeId){
      for (const [id, qty] of Object.entries(inv)){
        if (qty > 0){
          const it = ITEMS[baseId(id)];
          if (it?.mana > 0 || it?.accBonus > 0){
            consumeId = id; break;
          }
        }
      }
    }
  }
  if (!consumeId) return { ok:false, reason:'no-potion' };

  // 1) Mana restoration
  if (Number(def.mana) > 0){
    const max = manaMaxFor(state);
    const cur = Math.max(0, Math.min(max, state.manaCurrent|0));
    if (cur >= max) return { ok:false, reason:'mana-full' };

    const restore = Math.max(1, Number(def.mana)||0);
    const gained = Math.min(restore, max - cur);

    removeItem(state, consumeId, 1);
    addMana(state, gained); // handles clamping + notifications
    try { window.dispatchEvent(new Event('inventory:change')); } catch {}

    return { ok:true, kind:'mana', consumedId: consumeId, gained };
  }

  // 2) Timed effects (ex: Accuracy)
  if (Number(def.accBonus) > 0){
    const durMs = Math.max(1000, (def.durationSec|0) * 1000 || 300000); // default 5m
    // Non-stacking, extend time for same effect id
    applyEffect(state, {
      id: 'acc',
      name: def.name || 'Accuracy',
      durationMs: durMs,
      data: { type:'accuracy', bonus: Number(def.accBonus) || 0 }
    });

    // (Optional legacy) maintain accPotionUntilMs if other code still reads it
    const now = Date.now();
    const cur = Number(state.accPotionUntilMs) || 0;
    state.accPotionUntilMs = Math.max(now, cur) + durMs;

    removeItem(state, consumeId, 1);
    try { window.dispatchEvent(new Event('inventory:change')); } catch {}

    return { ok:true, kind:'effect', consumedId: consumeId, effectId: 'acc' };
  }

  // Future: add more potion types here, turning data fields on ITEMS[...] into effects.
  return { ok:false, reason:'not-a-potion' };
}
