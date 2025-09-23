// /systems/equipment.js
import { ITEMS } from '../data/items.js';
import { levelFromXp } from './xp.js';
import { startTomeRun, isTomeActive, stopTomeRun } from './tomes.js';

function baseId(id){
  return String(id || '').split('@')[0];
}

export function equipReqLabel(id) {
  const it = ITEMS[baseId(id)];
  if (!it) return '';
  if (it.reqAtk) return `Requires Attack ${it.reqAtk}`;
  if (it.reqDef) return `Requires Defence ${it.reqDef}`;
  return '';
}

export function canEquip(state, id) {
  const it = ITEMS[baseId(id)];
  if (!it) return { ok: false, message: 'Unknown item.' };

  if (!it.reqAtk && !it.reqDef) return { ok: true };

  if (it.slot === 'weapon' || it.reqAtk) {
    const have = levelFromXp(state.atkXp || 0);
    const need = it.reqAtk || 1;
    if (have < need) {
      return { ok: false, message: `You need Attack ${need} to equip ${it.name} (you are ${have}).` };
    }
  } else {
    const have = levelFromXp(state.defXp || 0);
    const need = it.reqDef || 1;
    if (have < need) {
      return { ok: false, message: `You need Defence ${need} to equip ${it.name} (you are ${have}).` };
    }
  }
  return { ok: true };
}

/** Equip an item by id; returns boolean or {ok:false,message} */
export function equipItem(state, id){
  const def = ITEMS[baseId(id)];
  if (!def) return false;
  const slot = def.slot;
  if (!slot) return false;

  const gate = canEquip(state, id);
  if (!gate.ok) return gate;

  // Tome slot: stack identical tomes instead of replacing
  if (slot === 'tome'){
    const invHave = (state.inventory[id] || 0);
    if (invHave <= 0) return false;

    const cur  = state.equipment.tome || null;
    const curBase = cur ? baseId(cur) : null;
    const newBase = baseId(id);

    // Only identical tomes can stack
    if (cur && curBase !== newBase){
      return false;
    }

    // If nothing equipped yet, set the tome id and init qty
    if (!cur){
      state.equipment.tome = id;
      state.equipment.tomeQty = 0;

      // Start the run immediately if not active
      if (!isTomeActive(state)) {
        startTomeRun(state, id);
      }
    }

    // Consume one from inventory and increment equipped stack
    state.inventory[id] = invHave - 1;
    if (state.inventory[id] <= 0) delete state.inventory[id];
    state.equipment.tomeQty = Math.max(0, (state.equipment.tomeQty|0)) + 1;

    try { window.dispatchEvent(new Event('tome:stack')); } catch {}
    return true;
  }

  // Default behavior for non-tome slots (replace and return previous to inventory)
  if (state.equipment[slot]){
    const prev = state.equipment[slot];
    state.inventory[prev] = (state.inventory[prev] || 0) + 1;
  }
  state.equipment[slot] = id;
  state.inventory[id] = (state.inventory[id] || 0) - 1;
  if (state.inventory[id] <= 0) delete state.inventory[id];
  return { ok: true };
}

/** Unequip:
 * - If slot === 'tome' and a run is ACTIVE: destroy exactly 1 tome (the running one),
 *   stop the action, return only the remaining stack to inventory, and clear the slot.
 * - If slot === 'tome' and NOT active: return the whole stack.
 */
export function unequipItem(state, slot){
  if (slot !== 'tome'){
    const id = state.equipment[slot];
    if (!id) return false;
    state.inventory[id] = (state.inventory[id] || 0) + 1;
    state.equipment[slot] = null;
    return true;
  }

  // Tome slot:
  const id = state.equipment.tome;
  if (!id) return false;

  // how many tomes are equipped right now
  const equippedQty = Math.max(0, state.equipment.tomeQty | 0);

  // if the tome is running (or was just stopped this click), we consume exactly one
  const shouldConsumeOne = isTomeActive(state) || !!state._tomeConsumeOnUnequip;

  // stop the run if still active and set the “don’t auto-restart” guard
  if (isTomeActive(state)) {
    stopTomeRun(state);
  }

  const remainder = Math.max(0, equippedQty - (shouldConsumeOne ? 1 : 0));

  // return only the remainder to inventory; the “running” tome is destroyed
  if (remainder > 0) {
    state.inventory[id] = (state.inventory[id] || 0) + remainder;
  }

  // clear equip slot + counters
  state.equipment.tome = null;
  delete state.equipment.tomeQty;

  // clear the consume flag once we've honored it
  delete state._tomeConsumeOnUnequip;

  try { window.dispatchEvent(new Event('tome:stack')); } catch {}
  return true;
}

