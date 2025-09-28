// /systems/inventory.js
// Pure state mutation helpers for inventory & gold.
// Emits DOM events for the UI layer to react to (Option B decoupling).

// Optional: enable to validate item ids (helps catch typos during dev)
// import { ITEMS } from '../data/items.js';

function normQty(q) {
  const n = Number(q);
  if (!Number.isFinite(n)) return 0;
  return (n | 0); // integer
}

function announceInventory(){
  try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
}
function announceGold(){
  try { window.dispatchEvent(new Event('gold:change')); } catch {}
}

export function getQty(state, id){
  return Math.max(0, Number(state?.inventory?.[id] || 0) | 0);
}

export function addItem(state, id, qty) {
  const c = normQty(qty);
  if (!id || c === 0) return;

  // Optional strictness:
  // if (!ITEMS[id]) { console.warn('[inventory] unknown item id:', id); return; }

  const cur = getQty(state, id);
  state.inventory[id] = cur + Math.max(0, c);
  announceInventory();
}

export function removeItem(state, id, qty) {
  const c = normQty(qty);
  if (!id || c === 0) return;

  const cur = getQty(state, id);
  const next = Math.max(0, cur - Math.max(0, c));
  if (next === 0) delete state.inventory[id];
  else state.inventory[id] = next;
  announceInventory();
}

export function addGold(state, n) {
  const v = normQty(n);
  if (v === 0) return;
  state.gold = Math.max(0, (Number(state.gold) | 0) + v);
  announceGold();
  // Many flows that grant/spend gold also change inventory; pulse both.
  announceInventory();
}

/* ------------ Batch helpers (recommended for recipes) ------------- */

export function hasItems(state, list=[]) {
  // list: [{ id, qty }, ...]
  if (!Array.isArray(list) || list.length === 0) return true;
  for (const it of list) {
    const need = Math.max(0, normQty(it?.qty));
    const have = getQty(state, it?.id);
    if (have < need) return false;
  }
  return true;
}

export function spendItems(state, list=[]) {
  // Atomic: only spends if ALL requirements are met.
  if (!hasItems(state, list)) return false;
  for (const it of list) {
    removeItem(state, it.id, it.qty);
  }
  return true;
}

export function grantItems(state, list=[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  for (const it of list) {
    const q = normQty(it?.qty);
    if (q > 0 && it?.id) addItem(state, it.id, q);
  }
}
