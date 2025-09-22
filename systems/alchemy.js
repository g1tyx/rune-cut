// /systems/alchemy.js

import { ITEMS } from '../data/items.js';
import { ALCHEMY_RECIPES } from '../data/alchemy.js';
import { addItem, removeItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';

const XP_TABLE = buildXpTable();

function getRecipe(id){ return ALCHEMY_RECIPES[id] || null; }
function baseId(id){ return String(id||'').split('@')[0]; }

/* ---------- inventory helpers (baseId-aware) ---------- */
function countByBaseId(state, base){
  const inv = state.inventory || {};
  let total = 0;
  for (const [id, qty] of Object.entries(inv)){
    if (baseId(id) === base) total += (qty || 0);
  }
  return total;
}

// consume worst quality first, like Royal Service
function removeByBaseId(state, base, qty){
  const inv = state.inventory || {};
  let remaining = qty;

  const entries = Object.entries(inv)
    .filter(([id]) => baseId(id) === base)
    .map(([id, q]) => {
      const qStr = String(id).split('@')[1];
      const qual = qStr ? parseInt(qStr, 10) : 100;
      return { id, qty: q || 0, qual };
    })
    .sort((a,b)=> (a.qual - b.qual)); // consume worse first

  for (const e of entries){
    if (remaining <= 0) break;
    if (e.qty <= 0) continue;
    const take = Math.min(e.qty, remaining);
    removeItem(state, e.id, take);
    remaining -= take;
  }
  return remaining <= 0;
}

/* ---------- listing & gating ---------- */
export function listAlchemyRecipes(_state){
  return Object.values(ALCHEMY_RECIPES)
    .slice()
    .sort((a,b)=> (a.level||1)-(b.level||1) || String(a.name).localeCompare(String(b.name)));
}

export function playerAlchLevel(state){
  const xp = Number(state.alchXp) || 0;
  try { return levelFromXp(xp, XP_TABLE); } catch { return 1; }
}

export function isRecipeUnlocked(state, recipeOrId){
  const r = typeof recipeOrId === 'string' ? getRecipe(recipeOrId) : recipeOrId;
  if (!r) return false;
  return playerAlchLevel(state) >= (r.level || 1);
}

/* ---------- can/start/finish ---------- */
export function canBrew(state, recipeId, qty=1){
  const r = getRecipe(recipeId);
  if (!r) return { ok:false, reason:'missing-recipe' };
  if (!isRecipeUnlocked(state, r)) return { ok:false, reason:'level' };
  const n = Math.max(1, qty|0);
  for (const need of (r.inputs||[])){
    const have = countByBaseId(state, baseId(need.id));
    const want = (need.qty||1) * n;
    if (have < want){
      return { ok:false, reason:`need:${baseId(need.id)}` };
    }
  }
  return { ok:true, qty:n };
}

export function startBrew(state, recipeId, qty=1, onDone){
  const r = getRecipe(recipeId);
  const check = canBrew(state, recipeId, qty);
  if (!r || !check.ok) return false;

  // Consume upfront (baseId-aware)
  for (const need of (r.inputs||[])){
    const ok = removeByBaseId(state, baseId(need.id), (need.qty||1) * check.qty);
    if (!ok) return false; // safety: shouldn't happen after canBrew
  }

  const lvl = playerAlchLevel(state);
  const speedBonus = 1 + 0.03 * (lvl-1); // +2% per Alchemy level
  const perUnit = Math.max(150, Math.floor((r.time || 3000) / speedBonus));
  const total = perUnit * check.qty;
  const now = performance.now();

  state.action = {
    type: 'alch',
    label: `Brew ${r.name}`,
    startedAt: now,
    endsAt: now + total,
    duration: total,
    recipeId,
    qty: check.qty
  };

  setTimeout(()=> {
    if (state.action?.type === 'alch' && state.action?.recipeId === recipeId){
      onDone?.();
    }
  }, total);

  return true;
}

export function finishBrew(state){
  const act = state.action;
  if (!act || act.type !== 'alch') return 0;

  const r = getRecipe(act.recipeId);
  if (!r){ state.action = null; return 0; }

  const outId = baseId(r.output?.id || r.id);
  const outQty = (r.output?.qty || 1) * (act.qty || 1);
  if (outId && outQty > 0) addItem(state, outId, outQty);

  const gain = Math.max(1, (r.xp || 0) * (act.qty || 1));
  state.alchXp = (state.alchXp || 0) + gain;

  state.action = null;
  return { qty: outQty, xp: gain, id: outId };
}
