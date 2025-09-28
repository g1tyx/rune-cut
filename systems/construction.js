// Instant build/upgrade/place + effect aggregation (unique-per-kind & palette logic)

import { BUILDINGS, CONSTRUCT_XP } from '../data/construction.js';
import { removeItem } from './inventory.js';
import { saveNow } from './state.js';

/* ---------- state helpers ---------- */
function ensureCamp(state){
  if (!state.camp) state.camp = { gridW: 36, gridH: 12, placed: [] };
  if (!Array.isArray(state.camp.placed)) state.camp.placed = [];
  return state.camp;
}

/* ---------- inference helpers (no hardcoding) ---------- */
function baseIdOf(id){ return String(id).replace(/_t\d+$/,''); }
function tierOf(id){ const m = String(id).match(/_t(\d+)$/); return m ? parseInt(m[1],10) : null; }
function inferKind(id, def){
  if (def?.kind) return def.kind;
  const s = String(id).toLowerCase();
  if (s.includes('bonfire') || s.includes('campfire')) return 'campfire';
  if (s.includes('hut')) return 'hut';
  if (s.includes('crafting_table')) return 'table';
  return 'other';
}
function guessSpritePath(id, def){
  if (def?.sprite) return def.sprite;
  return `assets/camp/${baseIdOf(id)}.png`;
}
function inferSize(def){
  if (def?.size && (def.size.w || def.size.h)) return { w:def.size.w|0, h:def.size.h|0, scale:null };
  if (typeof def?.scale === 'number')          return { w:null, h:null, scale:def.scale };
  return { w:null, h:null, scale:null };
}

/* ---------- inventory helpers ---------- */
function haveMats(state, recipe = []){
  return recipe.every(r => (state.inventory?.[r.id] || 0) >= (r.qty || 0));
}
function spendMats(state, recipe = []){
  for (const r of (recipe || [])){
    if ((state.inventory?.[r.id] || 0) > 0){
      removeItem(state, r.id, r.qty || 0);
    }
  }
}

/* ---------- API ---------- */
export function buildingDef(id){ return BUILDINGS[id] || null; }

function hasPlacedKind(state, wantKind){
  const placed = state.camp?.placed || [];
  for (const p of placed){
    const d = BUILDINGS[p.id];
    if (inferKind(p.id, d) === wantKind) return true;
  }
  return false;
}

const ALLOWED_KINDS = new Set(['hut','campfire', 'table']); // extend later if needed

export function canBuild(state, id){
  const d = BUILDINGS[id];
  if (!d) return { ok:false, reason:'unknown' };

  const kind = inferKind(id, d);
  if (!ALLOWED_KINDS.has(kind)) return { ok:false, reason:'locked-kind' };

  // ❗ Unique-per-kind rule: max 1 hut and 1 fire/bonfire total.
  if (hasPlacedKind(state, kind)) return { ok:false, reason:`already-have-${kind}` };

  if (!haveMats(state, d.recipe)) return { ok:false, reason:'mats', need: d.recipe };
  return { ok:true };
}

function stopAfkButKeepTomes(state){
  const a = state.action;
  if (!a) return;
  if (a.type === 'tome') return;
  state.action = null;
  try { window.dispatchEvent(new Event('action:stop')); } catch {}
}

/* ---------- INSTANT build/upgrade ---------- */
export function buildNow(state, id, pos = { x:0, y:0 }){
  const def = BUILDINGS[id];
  if (!def) return { ok:false, reason:'unknown' };
  const gate = canBuild(state, id);
  if (!gate.ok) return { ok:false, reason:gate.reason, need:gate.need };

  ensureCamp(state);
  stopAfkButKeepTomes(state);
  spendMats(state, def.recipe);

  state.constructionXp = (state.constructionXp|0) + Math.max(1, CONSTRUCT_XP(id));

  const entry = {
    id, x: pos.x|0, y: pos.y|0, rot: 0, status: 'active',
    sprite: guessSpritePath(id, def),
    kind: inferKind(id, def),
    tier: tierOf(id),
    base: baseIdOf(id),
    size: inferSize(def),
  };
  ensureCamp(state).placed.push(entry);

  saveNow();
  try { window.dispatchEvent(new CustomEvent('camp:built', { detail:{ id, pos } })); } catch {}
  return { ok:true, id };
}

export function startBuild(state, id, pos = { x:0, y:0 }, onDone){
  const res = buildNow(state, id, pos);
  if (res.ok && typeof onDone === 'function') setTimeout(()=>onDone({ id }), 0);
  return res.ok;
}
export function finishBuild(){ return null; }

export function improveBuilding(state, placedIdx){
  const camp = ensureCamp(state);
  const p = camp.placed[placedIdx];
  if (!p) return { ok:false, reason:'missing' };

  const cur = BUILDINGS[p.id];
  if (!cur) return { ok:false, reason:'bad-id' };

  const nextId = cur.improvesTo || cur.upgradesTo;
  if (!nextId) return { ok:false, reason:'no-upgrade' };

  // For upgrades within the same kind (hut→hut or fire→fire), the unique-per-kind
  // rule is already satisfied since we replace in place.
  const next = BUILDINGS[nextId];

  if (!haveMats(state, next.recipe)) return { ok:false, reason:'mats', need: next.recipe };

  spendMats(state, next.recipe);
  state.constructionXp = (state.constructionXp|0) + Math.max(1, CONSTRUCT_XP(nextId));

  camp.placed[placedIdx] = {
    id: nextId, x: p.x, y: p.y, rot: p.rot||0, status:'active',
    sprite: guessSpritePath(nextId, next),
    kind: inferKind(nextId, next),
    tier: tierOf(nextId),
    base: baseIdOf(nextId),
    size: inferSize(next),
  };

  saveNow();
  try { window.dispatchEvent(new CustomEvent('camp:upgraded', { detail:{ to:nextId, idx:placedIdx } })); } catch {}
  return { ok:true, id: nextId, replaced: placedIdx };
}

/* ---------- Effects aggregation ---------- */
// Huts stack (sum). Fires/bonfires do NOT stack; take the single best.
export function constructionBonuses(state){
  const placed = ensureCamp(state).placed || [];
  let afk_extend_seconds = 0;
  let auto_cook_best = 0;

  for (const p of placed){
    const d = BUILDINGS[p.id]; if (!d || !Array.isArray(d.effects)) continue;
    for (const eff of d.effects){
      if (eff.type === 'afk_extend') afk_extend_seconds += (eff.seconds || 0);
      if (eff.type === 'auto_cook')  auto_cook_best = Math.max(auto_cook_best, (eff.seconds || 0));
    }
  }
  return { afk_extend_seconds, auto_cook_seconds: auto_cook_best };
}

/* ---------- Palette (first tier per family, hide if already built) ---------- */
export function buildBuildings(state){
  // 1) Only allowed kinds (hut, campfire)
  const allowed = Object.entries(BUILDINGS)
    .map(([id, d]) => ({ id, ...d }))
    .filter(d => ALLOWED_KINDS.has(inferKind(d.id, d)));

  // 2) Group by family base id and pick the LOWEST tier (usually *_t1)
  const byBase = new Map();
  for (const d of allowed){
    const base = baseIdOf(d.id);
    const t = tierOf(d.id) ?? 9999;
    const cur = byBase.get(base);
    if (!cur || (tierOf(cur.id) ?? 9999) > t) byBase.set(base, d);
  }
  let firstTiers = Array.from(byBase.values());

  // 3) Respect data flag "showInPalette" when provided (lets Pine hide naturally)
  firstTiers = firstTiers.filter(d => (d.showInPalette ?? true));

  // 4) UNIQUE-PER-KIND: if a hut or a campfire is already placed, hide that family entirely
  firstTiers = firstTiers.filter(d => !hasPlacedKind(state, inferKind(d.id, d)));

  return firstTiers;
}
