import { ITEMS } from '../data/items.js';
import { baseId } from './itemutil.js';
import { startTomeRun, isTomeActive } from './tomes.js';
import { levelFromXp } from './xp.js';

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

  // No requirement? Auto-pass.
  if (!it.reqAtk && !it.reqDef) return { ok: true };

  // Weapons use Attack; armor/shields use Defence
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

export function equipItem(state, id){
  const def = ITEMS[baseId(id)];
  if (!def) return false;
  const slot = def.slot;
  if (!slot) return false;

  const gate = canEquip(state, id);
  if (!gate.ok) {
    // If your tooltip helper is globally exposed, tell the user immediately.
    if (typeof window !== 'undefined' && window.showTip) {
      window.showTip(gate.message);
    }
    // Block equip. Returning an object lets UI show the message too.
    return { ok: false, message: gate.message };
  }

  // Tome slot: stack identical tomes instead of replacing
  if (slot === 'tome'){
    const invHave = (state.inventory[id] || 0);
    if (invHave <= 0) return false; // nothing to equip

    const base = String(id).split('@')[0];
    const cur  = state.equipment.tome;        // may be undefined/null or an id
    const curBase = cur ? String(cur).split('@')[0] : null;

    // Only identical tomes can stack
    if (cur && curBase !== base){
      // Different tome already equipped → do nothing (explicitly disallow mixing)
      return false;
    }

    // If nothing equipped yet, set the tome id and create qty counter
    if (!cur){
      state.equipment.tome = id;
      state.equipment.tomeQty = 0;
      // If nothing is currently running, start the run for this tome
      if (!isTomeActive(state)) {
        startTomeRun(state, id);
      }
    }

    // Consume one from inventory and increment equipped stack
    state.inventory[id] = invHave - 1;
    if (state.inventory[id] <= 0) delete state.inventory[id];
    state.equipment.tomeQty = Math.max(0, (state.equipment.tomeQty|0)) + 1;

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

export function unequipItem(state, slot){
  // Tome special-casing: cannot unequip while a run is active
  if (slot === 'tome' && isTomeActive(state)) {
    return false; // ignore request; timer can’t be paused
  }

  const id = state.equipment[slot];
  if (!id) return false;

  if (slot === 'tome'){
    // When not active, return the whole stack to inventory and clear the slot
    const qty = Math.max(1, state.equipment.tomeQty|0);
    state.inventory[id] = (state.inventory[id] || 0) + qty;
    state.equipment.tome = null;
    delete state.equipment.tomeQty;
    return true;
  }

  // Normal equipment: return a single item
  state.inventory[id] = (state.inventory[id] || 0) + 1;
  state.equipment[slot] = null;
  return true;
}
