import { addItem, removeItem } from './inventory.js';
import { COOK_RECIPES } from '../data/cooking.js';
import { buildXpTable, levelFromXp } from './xp.js';

export const COOK_TIME_MS = 1600;
const XP_TABLE = buildXpTable();

function displayName(id=''){
  return String(id).replace(/^raw_/,'').replace(/_/g,' ').replace(/\b\w/g, m=>m.toUpperCase());
}
function reqLevel(rawId){
  const rec = COOK_RECIPES[rawId] || {};
  return rec.level ?? rec.lvl ?? 1;
}

/** Cook N items instantly (used by auto-cook and perfect outcome). */
export function cookItems(state, rawId, qty){
  const rec = COOK_RECIPES[rawId];
  if(!rec) return 0;
  const have = state.inventory[rawId] || 0;
  const n = Math.min(have, qty|0);
  if(n<=0) return 0;

  removeItem(state, rawId, n);
  addItem(state, rec.cooked, n);
  state.cookXp = (state.cookXp || 0) + (rec.xp||0) * n;

  try {
    window.dispatchEvent(new CustomEvent('cook:tick', {
      detail: { rawId, cookedId: rec.cooked, n }
    }));
    window.dispatchEvent(new Event('inventory:change'));
  } catch {}

  return n;
}

// --- rest unchanged (canCook, cookGateReason, startCook, resolveCook) ---
export function canCook(state, recipeOrId){
  const rawId = (typeof recipeOrId==='string') ? recipeOrId
              : recipeOrId?.id || recipeOrId?.raw || null;
  if (!rawId || !COOK_RECIPES[rawId]) return false;
  return (state.inventory[rawId] || 0) > 0;
}
export function cookGateReason(state, rawId){
  if (!COOK_RECIPES[rawId]) return 'Unknown recipe';
  if ((state.inventory[rawId]||0) <= 0) return 'No raw items';
  return null;
}
export function startCook(state, recipeOrId){
  if (!canCook(state, recipeOrId)) return false;
  const rawId = (typeof recipeOrId==='string') ? recipeOrId
              : recipeOrId?.id || recipeOrId?.raw;
  const now = performance.now();
  state.action = {
    type: 'cook',
    label: `Cook ${displayName(rawId)}`,
    startedAt: now,
    endsAt: now + COOK_TIME_MS,
    duration: COOK_TIME_MS,
    payload: { rawId }
  };
  return true;
}
export function resolveCook(state, outcome){
  const rawId = state.action?.payload?.rawId;
  if (!rawId){ state.action = null; return { ok:false, outcome:'none', cooked:0, xp:0 }; }
  let cooked = 0, xp = 0;
  if (outcome === 'perfect'){
    const lvl = levelFromXp(state.cookXp || 0, XP_TABLE);
    const over = Math.max(0, lvl - reqLevel(rawId));
    const bonusSteps = Math.floor(over / 10);
    const qty = 1 + bonusSteps;
    cooked = cookItems(state, rawId, qty);
    const per = COOK_RECIPES[rawId]?.xp || 0;
    xp = per * cooked;
  } else if (outcome === 'burnt'){
    if ((state.inventory[rawId]||0) > 0) removeItem(state, rawId, 1);
  }
  state.action = null;
  try {
    window.dispatchEvent(new CustomEvent('cook:result', {
      detail: { outcome, rawId, cooked, xp }
    }));
  } catch {}
  return { ok:true, outcome, cooked, xp, rawId, cookedId: COOK_RECIPES[rawId]?.cooked, need: reqLevel(rawId) };
}
