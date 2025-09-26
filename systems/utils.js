// /systems/utils.js
import { ITEMS } from '../data/items.js';

/* ---------- Numbers & time ---------- */
export const clampMs = (ms, floor = 100) => Math.max(floor, ms);
export const roundMs = (ms) => Math.max(0, Math.round(ms));

/* ---------- Levels & gates ---------- */
export const requiredLevel = (o) => Number(o?.level || 1);

/* ---------- RNG helpers ---------- */
export const chance = (p) => (Number(p) > 0) && (Math.random() < Number(p));
export function rollQty(qty) {
  // qty can be number or [min,max]
  if (Array.isArray(qty)) {
    const [min, max] = qty;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return Math.max(1, Number(qty || 1));
}

/* ---------- Resolve helpers ---------- */
export function resolveTarget(list, selectedId, candidate) {
  if (!candidate) {
    return list.find(t => t.id === selectedId) || list[0] || null;
  }
  if (typeof candidate === 'string') {
    return list.find(t => t.id === candidate) || null;
  }
  if (candidate && candidate.id) {
    return list.find(t => t.id === candidate.id) || candidate;
  }
  return null;
}

/* ---------- Equipment modifiers (speed) ---------- */
export function speedModFrom(state, slot) {
  const m = state?.equipmentMods?.[slot] || {};
  if (typeof m.swift === 'object') return Number(m.swift.addSpeed || 0);
  return Number(m.speedBonus || 0);                                      
}

/* ---------- Items ---------- */
export const itemName = (id) => ITEMS?.[id]?.name || id;

/* ---------- Drops ---------- */
// dropDefs: [{ id, chance, qty }]
export function applyDrops(state, dropDefs, addItemFn) {
  const results = [];
  for (const d of (dropDefs || [])) {
    if (chance(d?.chance ?? 0)) {
      const qty = rollQty(d?.qty ?? 1);
      addItemFn(state, d.id, qty);
      results.push({ id: d.id, qty });
    }
  }
  return results;
}
