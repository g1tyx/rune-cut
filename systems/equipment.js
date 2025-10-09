// /systems/equipment.js
import { ITEMS } from '../data/items.js';
import { levelFromXp, buildXpTable } from './xp.js';
import { startTomeRun, isTomeActive, stopTomeRun } from './tomes.js';

const baseIdStrict = (s) => String(s || '').split('@')[0].split('#')[0];
const XP_TABLE = buildXpTable();

/* ----------------------- Requirement labels ----------------------- */
export function equipReqLabel(id) {
  const it = ITEMS[baseIdStrict(id)];
  if (!it) return '';
  const reqs = [];
  if (Number.isFinite(it.reqAtk)) reqs.push(`Attack ${it.reqAtk}`);
  if (Number.isFinite(it.reqDef)) reqs.push(`Defence ${it.reqDef}`);
  if (Number.isFinite(it.reqStr)) reqs.push(`Strength ${it.reqStr}`);
  if (!reqs.length) return '';
  return reqs.length === 1 ? `Requires ${reqs[0]}` : `Requires: ${reqs.join(' · ')}`;
}

/* --------------------------- Gate checks -------------------------- */
export function canEquip(state, id) {
  const it = ITEMS[baseIdStrict(id)];
  if (!it) return { ok: false, message: 'Unknown item.' };

  // no gates -> ok
  if (!Number.isFinite(it.reqAtk) && !Number.isFinite(it.reqDef) && !Number.isFinite(it.reqStr)) {
    return { ok: true };
  }

  const atkLvl = levelFromXp(Number(state.atkXp) || 0, XP_TABLE);
  const defLvl = levelFromXp(Number(state.defXp) || 0, XP_TABLE);
  const strLvl = levelFromXp(Number(state.strXp) || 0, XP_TABLE);

  if (Number.isFinite(it.reqAtk) && atkLvl < it.reqAtk) {
    return { ok: false, message: `You need Attack ${it.reqAtk} to equip ${it.name} (you are ${atkLvl}).` };
  }
  if (Number.isFinite(it.reqDef) && defLvl < it.reqDef) {
    return { ok: false, message: `You need Defence ${it.reqDef} to equip ${it.name} (you are ${defLvl}).` };
  }
  if (Number.isFinite(it.reqStr) && strLvl < it.reqStr) {
    return { ok: false, message: `You need Strength ${it.reqStr} to equip ${it.name} (you are ${strLvl}).` };
  }
  return { ok: true };
}

/* ---------------------------- Equip flow -------------------------- */
export function equipItem(state, id) {
  const base = baseIdStrict(id);
  const def  = ITEMS[base];
  if (!def) return false;

  const slot = def.slot;
  if (!slot) return false;

  state.equipment = state.equipment || {};
  state.inventory = state.inventory || {};

  const gate = canEquip(state, id);
  if (!gate.ok) return gate;

  // ===== Tome: stack identical tomes and run =====
  if (slot === 'tome') {
    const invHave = state.inventory[id] || state.inventory[base] || 0;
    if (invHave <= 0) return false;

    const cur  = state.equipment.tome || null;
    const curBase = cur ? baseIdStrict(cur) : null;

    // Only identical tomes can stack
    if (cur && curBase !== base) return false;

    // If nothing equipped yet, set and bootstrap the run
    if (!cur) {
      state.equipment.tome = id;
      state.equipment.tomeQty = 0;
      if (!isTomeActive(state)) startTomeRun(state, id);
    }

    // Move 1 from inventory into the equipped stack
    if (state.inventory[id]) state.inventory[id] -= 1;
    else state.inventory[base] = Math.max(0, invHave - 1);
    if (state.inventory[id] <= 0) delete state.inventory[id];
    if (state.inventory[base] <= 0) delete state.inventory[base];

    state.equipment.tomeQty = Math.max(0, (state.equipment.tomeQty | 0)) + 1;

    try { window.dispatchEvent(new Event('tome:stack')); } catch {}
    try { window.dispatchEvent(new Event('equipment:change')); } catch {}
    return true;
  }

  // ===== Food: move whole stack into equipment.foodQty =====
  if (slot === 'food') {
    const curFood = state.equipment.food || '';
    const curQty  = Math.max(0, state.equipment.foodQty | 0);

    // Return previous stack (if any) to inventory
    if (curFood && curQty > 0) {
      state.inventory[curFood] = (state.inventory[curFood] || 0) + curQty;
    }

    // Pull ALL copies of this food from inventory
    const invQty = (state.inventory[id] ?? state.inventory[base] ?? 0) | 0;
    if (invQty <= 0) return false;

    // Set new food & qty
    state.equipment.food = base;
    state.equipment.foodQty = invQty;

    // Remove from inventory
    if (state.inventory[id] != null) delete state.inventory[id];
    if (state.inventory[base] != null) delete state.inventory[base];

    try { window.dispatchEvent(new Event('food:change')); } catch {}
    try { window.dispatchEvent(new Event('equipment:change')); } catch {}
    return true;
  }

  // ===== Normal gear: swap previous item back to inventory, equip new =====
  const prev = state.equipment[slot] || null;
  if (prev) {
    state.inventory[prev] = (state.inventory[prev] || 0) + 1;
  }

  // Consume 1 from inventory for this item
  const invKey = state.inventory[id] != null ? id : base; // allow exact or base-keyed storage
  if (!state.inventory[invKey] || state.inventory[invKey] <= 0) return false;
  state.inventory[invKey] -= 1;
  if (state.inventory[invKey] <= 0) delete state.inventory[invKey];

  state.equipment[slot] = id;

  try { window.dispatchEvent(new Event('equipment:change')); } catch {}
  return true;
}

/* --------------------------- Unequip flow ------------------------- */
/** Unequip:
 * - Tome:
 *   - If a run is ACTIVE: destroy exactly 1 tome (the running one),
 *     return only the remainder to inventory, stop the run, clear the slot.
 *   - If NOT active: return the whole stack.
 * - Food: return the whole equipped stack.
 * - Normal gear: return the item.
 */
export function unequipItem(state, slot) {
  state.equipment = state.equipment || {};
  state.inventory = state.inventory || {};

  if (slot === 'tome') {
    const id = state.equipment.tome;
    if (!id) return false;
    const equippedQty = Math.max(0, state.equipment.tomeQty | 0);

    const shouldConsumeOne = isTomeActive(state) || !!state._tomeConsumeOnUnequip;

    if (isTomeActive(state)) stopTomeRun(state);

    const remainder = Math.max(0, equippedQty - (shouldConsumeOne ? 1 : 0));
    if (remainder > 0) {
      state.inventory[id] = (state.inventory[id] || 0) + remainder;
    }

    state.equipment.tome = null;
    delete state.equipment.tomeQty;
    delete state._tomeConsumeOnUnequip;

    try { window.dispatchEvent(new Event('tome:stack')); } catch {}
    try { window.dispatchEvent(new Event('equipment:change')); } catch {}
    return true;
  }

  if (slot === 'food') {
    const food = state.equipment.food || '';
    const qty  = Math.max(0, state.equipment.foodQty | 0);
    if (!food || qty <= 0) return false;

    state.inventory[food] = (state.inventory[food] || 0) + qty;
    state.equipment.food = '';
    state.equipment.foodQty = 0;

    try { window.dispatchEvent(new Event('food:change')); } catch {}
    try { window.dispatchEvent(new Event('equipment:change')); } catch {}
    return true;
  }

  // Normal gear
  const id = state.equipment[slot];
  if (!id) return false;
  state.inventory[id] = (state.inventory[id] || 0) + 1;
  state.equipment[slot] = null;

  try { window.dispatchEvent(new Event('equipment:change')); } catch {}
  return true;
}
