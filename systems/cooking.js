// /systems/cooking.js
import { addItem, removeItem } from './inventory.js';
import { COOK_RECIPES } from '../data/cooking.js';
import { buildXpTable, levelFromXp } from './xp.js';

export const COOK_TIME_MS = 1600; // baseline; UI scales duration

const XP_TABLE = buildXpTable();

function displayName(id=''){
  return String(id)
    .replace(/^raw_/, '')
    .replace(/_/g,' ')
    .replace(/\b\w/g, m=>m.toUpperCase());
}

function reqLevel(rawId){
  const rec = COOK_RECIPES[rawId] || {};
  return rec.level ?? rec.lvl ?? 1;
}

/** Cook N items instantly (used when outcome is "perfect") */
export function cookItems(state, rawId, qty){
  const rec = COOK_RECIPES[rawId];
  if(!rec) return 0;
  const have = state.inventory[rawId] || 0;
  const n = Math.min(have, qty|0);
  if(n<=0) return 0;

  removeItem(state, rawId, n);
  addItem(state, rec.cooked, n);
  state.cookXp = (state.cookXp || 0) + rec.xp * n;
  return n;
}

// ---------- helpers ----------
function resolveRawId(recipeOrId){
  if (!recipeOrId) return null;
  if (typeof recipeOrId === 'string') return recipeOrId;
  if (recipeOrId.id) return recipeOrId.id;
  if (recipeOrId.raw) return recipeOrId.raw;
  return null;
}

/**
 * Can cook if: recipe exists, not busy, and you have at least 1 raw.
 * NOTE: No level gate. Being under level is allowed; difficulty is handled in the UI.
 */
export function canCook(state, recipeOrId){
  const rawId = resolveRawId(recipeOrId);
  if (!rawId || !COOK_RECIPES[rawId]) return false;
  //if (state.action) return false; // busy with another action
  return (state.inventory[rawId] || 0) > 0;
}

/** Messaging for true blockers only (no level gating here). */
export function cookGateReason(state, rawId){
  if (!COOK_RECIPES[rawId]) return 'Unknown recipe';
  if ((state.inventory[rawId]||0) <= 0) return 'No raw items';
  // Under suggested level is allowed; UI makes it harder (slower bar, same/bigger zone rules).
  return null;
}

/** Arm a cook action (progress starts when the player holds on the fire) */
export function startCook(state, recipeOrId){
  if (!canCook(state, recipeOrId)) return false;
  const rawId = resolveRawId(recipeOrId);
  const now = performance.now();
  state.action = {
    type: 'cook',
    label: `Cook ${displayName(rawId)}`,
    startedAt: now,
    endsAt: now + COOK_TIME_MS,  // UI will overwrite with scaled duration
    duration: COOK_TIME_MS,
    payload: { rawId }
  };
  return true;
}

/**
 * Judge the result when the player releases: 'early' | 'perfect' | 'burnt'
 * Multi-cook: +1 per 10 levels over the requirement (on PERFECT).
 */
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
  } // 'early' -> do nothing

  state.action = null;
  return {
    ok:true,
    outcome,
    cooked,
    xp,
    rawId,
    cookedId: COOK_RECIPES[rawId]?.cooked,
    need: reqLevel(rawId)
  };
}
