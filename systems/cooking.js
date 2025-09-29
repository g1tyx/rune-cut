// /systems/cooking.js — atomic IO + unified events (aligned with COOK_RECIPES)

import { hasItems, spendItems, grantItems } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { clampMs } from './utils.js';
import { COOK_RECIPES } from '../data/cooking.js';

const XP_TABLE = buildXpTable();
// ⬇⬇⬇ was 300; raise so the progress bar isn’t too fast
export const MIN_COOK_TIME_MS = 1000;

function normQty(n){ const v = Number(n); return Number.isFinite(v) ? (v|0) : 0; }
function cookLevel(s){ return levelFromXp(Number(s.cookXp || 0), XP_TABLE); }
function meetsLevel(s, r){ return cookLevel(s) >= (r.level || 1); }
/** Speed = 1 + 3% per level over 1 (no tool speed for cooking). */
function speedMult(s){ const lvl = cookLevel(s); return Math.max(1, 1 + 0.03 * Math.max(0, lvl - 1)); }

/** Accepts both single-output and outputs[] schemas. Defaults inputs to 1× raw id. */
function getRecipe(id){
  const src = COOK_RECIPES?.[id];
  if (!src) return null;

  const inputs = Array.isArray(src.inputs) && src.inputs.length
    ? src.inputs.map(i => ({ id: i.id, qty: Math.max(1, normQty(i.qty)) }))
    : [{ id, qty: 1 }];

  let outputs = [];
  if (Array.isArray(src.outputs) && src.outputs.length){
    outputs = src.outputs.map(o => ({ id:o.id, qty: Math.max(1, normQty(o.qty)) }));
  } else if (src.output?.id){
    outputs = [{ id: src.output.id, qty: Math.max(1, normQty(src.output.qty || 1)) }];
  }

  return {
    id,
    name: src.name || id,
    level: Math.max(1, Number(src.level || 1)),
    time: Math.max(100, Number(src.time || 1000)),
    xp: Math.max(0, Number(src.xp || 5)),
    inputs, outputs
  };
}

export function cookDurationMs(s, id){
  const r = getRecipe(id);
  if (!r) return 0;
  return clampMs(r.time / speedMult(s), MIN_COOK_TIME_MS);
}

export function maxCookable(s, id){
  const r = getRecipe(id); if (!r) return 0;
  if (!meetsLevel(s, r)) return 0;
  let m = Infinity;
  for (const inp of r.inputs){
    const have = Number(s.inventory?.[inp.id] || 0);
    const need = Math.max(1, inp.qty);
    m = Math.min(m, Math.floor(have / need));
  }
  return Number.isFinite(m) ? Math.max(0, m) : 0;
}

export function canCook(s, id, times = 1){
  const r = getRecipe(id); if (!r) return false;
  if (!meetsLevel(s, r)) return false;
  const n = Math.max(1, times|0);
  const reqs = r.inputs.map(i => ({ id:i.id, qty:i.qty * n }));
  return hasItems(s, reqs);
}

export function startCook(s, id){
  const r = getRecipe(id); if (!r) return false;
  if (!canCook(s, id, 1)) return false;

  const dur = clampMs(r.time / speedMult(s), MIN_COOK_TIME_MS);
  const now = performance.now();
  s.action = { type:'cook', key:id, label:`Cook ${r.name}`, startedAt:now, endsAt:now + dur, duration:dur };

  try { setTimeout(()=> window.dispatchEvent(new CustomEvent('cook:tick', { detail:{ id } })), 0); } catch {}
  return true;
}

function applyCookIOAndXp(s, r){
  const reqs = r.inputs.map(i => ({ id:i.id, qty:i.qty }));
  if (reqs.length && !spendItems(s, reqs)) return false;

  const outs = r.outputs.map(o => ({ id:o.id, qty:o.qty })).filter(x=>x.qty>0);
  if (outs.length) grantItems(s, outs);

  if (r.xp > 0){
    s.cookXp = (s.cookXp || 0) + r.xp;
    try { window.dispatchEvent(new Event('skills:change')); } catch {}
  }
  try { window.dispatchEvent(new Event('inventory:changed')); } catch {}

  return true;
}

export function finishCook(s, id){
  const key = id || s.action?.key;
  const r = key && getRecipe(key);
  if (!r) return null;
  if (!canCook(s, key, 1)) return null;

  // Grant IO & XP
  if (!applyCookIOAndXp(s, r)) return null;

  try { window.dispatchEvent(new CustomEvent('cook:result', { detail:{ id:r.id, name:r.name, xp:r.xp } })); } catch {}
  return { id: r.id, name: r.name, xp: r.xp };
}

/** Cook immediately once (no timer); returns same shape as finishCook. */
export function cookOnce(s, id){
  const r = getRecipe(id); if (!r) return null;
  if (!canCook(s, id, 1)) return null;
  if (!applyCookIOAndXp(s, r)) return null;

  try { window.dispatchEvent(new CustomEvent('cook:result', { detail:{ id:r.id, name:r.name, xp:r.xp } })); } catch {}
  return { id: r.id, name: r.name, xp: r.xp };
}

/** Null if OK; 'level' or 'materials' otherwise. */
export function cookGateReason(s, id, times = 1){
  const r = getRecipe(id);
  if (!r) return 'unknown';
  if (!meetsLevel(s, r)) return 'level';
  const n = Math.max(1, times|0);
  const reqs = r.inputs.map(i => ({ id:i.id, qty:(i.qty|0) * n }));
  return hasItems(s, reqs) ? null : 'materials';
}
