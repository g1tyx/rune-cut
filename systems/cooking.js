import { addItem, removeItem } from './inventory.js';
import { COOK_RECIPES } from '../data/cooking.js';
import { buildXpTable, levelFromXp } from './xp.js';

export const COOK_TIME_MS = 1600;
const XP_TABLE = buildXpTable();

/* ---------- helpers ---------- */
export function baseId(id=''){ return String(id).split('@')[0]; }
function displayNameLocal(id=''){ return baseId(id).replace(/^raw_/,'').replace(/_/g,' ').replace(/\b\w/g, m=>m.toUpperCase()); }

function rawKeyOf(rec){
  if (!rec) return null;
  for (const k in COOK_RECIPES){ if (COOK_RECIPES[k] === rec) return k; }
  return null;
}
function cookedIdOf(rawKey){ return COOK_RECIPES[rawKey]?.output?.id || null; }
function cookedQtyPerRaw(rawKey){ return COOK_RECIPES[rawKey]?.output?.qty || 1; }

export function recipeOf(rawOrRecipe){
  if (!rawOrRecipe) return null;
  if (typeof rawOrRecipe === 'string') return COOK_RECIPES[baseId(rawOrRecipe)] || null;
  if (rawOrRecipe.raw) return COOK_RECIPES[baseId(rawOrRecipe.raw)] || null;
  if (rawOrRecipe.id)  return COOK_RECIPES[baseId(rawOrRecipe.id)]  || null;
  return null;
}
export function recipeLevel(rawOrId){ const r = recipeOf(rawOrId) || {}; return r.level ?? r.lvl ?? 1; }
export function recipeTimeMs(rawOrId){ const r = recipeOf(rawOrId) || {}; const t = Number(r.time || 0); return Number.isFinite(t)&&t>0?t:COOK_TIME_MS; }
export function canCookId(id){ return !!COOK_RECIPES[baseId(id)]; }

function playerLvl(state){ try{ return levelFromXp(state.cookXp||0, XP_TABLE); }catch{ return 1; } }

/* ---------- public API ---------- */
export function canCook(state, recipeOrId){
  const r = recipeOf(recipeOrId); if (!r) return false;
  const rawKey = rawKeyOf(r); if (!rawKey) return false;
  return (state.inventory?.[rawKey] || 0) > 0;
}
export function cookGateReason(state, recipeOrId){
  const r = recipeOf(recipeOrId); if (!r) return 'Unknown recipe';
  const rawKey = rawKeyOf(r); if (!rawKey) return 'Unknown recipe';
  if ((state.inventory?.[rawKey] || 0) <= 0) return 'No raw items';
  return null;
}

/** Cook N *raw* items instantly; returns number of COOKED items produced (not raws consumed). */
export function cookItems(state, recipeOrId, qty){
  const r = recipeOf(recipeOrId); if (!r) return 0;
  const rawKey = rawKeyOf(r); if (!rawKey) return 0;

  const haveRaw = state.inventory?.[rawKey] || 0;
  const rawsToUse = Math.min(haveRaw, qty|0);
  if (rawsToUse <= 0) return 0;

  const outId = cookedIdOf(rawKey); if (!outId) return 0;
  const perRaw = cookedQtyPerRaw(rawKey);
  const cookedOut = perRaw * rawsToUse;

  removeItem(state, rawKey, rawsToUse);
  addItem(state, outId, cookedOut);
  state.cookXp = (state.cookXp||0) + (r.xp||0) * rawsToUse;

  try{
    window.dispatchEvent(new CustomEvent('cook:tick',{detail:{rawId:rawKey,cookedId:outId,n:cookedOut}}));
    window.dispatchEvent(new Event('inventory:change'));
    window.dispatchEvent(new Event('skills:change'));
  }catch{}

  return cookedOut; // cooked items produced
}

export function startCook(state, recipeOrId){
  const r = recipeOf(recipeOrId); if (!r) return false;
  const rawKey = rawKeyOf(r); if (!rawKey) return false;
  if (!canCook(state, rawKey)) return false;

  const now = performance.now();
  const baseMs = recipeTimeMs(rawKey);
  state.action = {
    type:'cook',
    label:`Cook ${displayNameLocal(rawKey)}`,
    startedAt: now,
    endsAt: now + baseMs,
    duration: baseMs,
    payload:{ rawId: rawKey }
  };
  return true;
}

/**
 * Resolve a timed cook with outcome: 'early' | 'perfect' | 'burnt'
 * Returns cooked = number of COOKED items produced (accounting for output.qty).
 */
export function resolveCook(state, outcome){
  const rawId = state.action?.payload?.rawId;
  state.action = null;
  if (!rawId) return { ok:false, outcome:'none', cooked:0, xp:0 };

  const r = COOK_RECIPES[rawId]; if (!r) return { ok:false, outcome:'none', cooked:0, xp:0 };
  const outId = cookedIdOf(rawId); const perRaw = cookedQtyPerRaw(rawId);

  let cooked=0, xp=0;

  if (outcome==='perfect'){
    const lvl = playerLvl(state);
    const req = recipeLevel(rawId);
    const bonus = Math.max(0, Math.floor((lvl - req)/10));
    const raws = 1 + bonus;
    cooked = cookItems(state, rawId, raws);                 // cooked items
    xp = (r.xp||0) * raws;                                  // xp per raw
  } else if (outcome==='burnt'){
    if ((state.inventory?.[rawId]||0) > 0) removeItem(state, rawId, 1);
  }

  try{
    window.dispatchEvent(new CustomEvent('cook:result',{detail:{outcome,rawId,cooked,xp}}));
    window.dispatchEvent(new Event('skills:change'));
  }catch{}

  return { ok:true, outcome, cooked, xp, rawId, cookedId: outId, need: recipeLevel(rawId) };
}
