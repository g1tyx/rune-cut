// /systems/royal_service.js
import { state, saveState } from './state.js';
import { ITEMS as _ITEMS } from '../data/items.js';
import { MONSTERS as _MONSTERS } from '../data/monsters.js';
import { XP_TABLE, levelFromXp } from './xp.js';
import { removeItem } from './inventory.js';

// Level-bearing data sources
import { COOK_RECIPES as _COOK_RECIPES } from '../data/cooking.js';
import { CRAFT_RECIPES as _CRAFT_RECIPES } from '../data/crafting.js';
import { FISHING_SPOTS as _FISHING_SPOTS } from '../data/fishing.js';
import { ROCKS as _ROCKS } from '../data/mining.js';
import { SMELT_RECIPES as _SMELT_RECIPES, FORGE_RECIPES as _FORGE_RECIPES } from '../data/smithing.js';
import { TREES as _TREES } from '../data/woodcutting.js';

/* ---------- Safe imports ---------- */
const ITEMS          = _ITEMS || {};
const MONSTERS       = Array.isArray(_MONSTERS) ? _MONSTERS : [];
const COOK_RECIPES   = _COOK_RECIPES  || {};
const CRAFT_RECIPES  = _CRAFT_RECIPES || {};
const FISHING_SPOTS  = Array.isArray(_FISHING_SPOTS) ? _FISHING_SPOTS : [];
const ROCKS          = Array.isArray(_ROCKS) ? _ROCKS : [];
const SMELT_RECIPES  = Array.isArray(_SMELT_RECIPES) ? _SMELT_RECIPES : [];
const FORGE_RECIPES  = Array.isArray(_FORGE_RECIPES) ? _FORGE_RECIPES : [];
const TREES          = Array.isArray(_TREES) ? _TREES : [];

const PATRONS = ['Armorer','Steward','Craftsman','Warden','Quartermaster'];

/* ---------- Small utils ---------- */
function baseId(id){ return String(id || '').split('@')[0]; }
function humanizeId(id=''){ return id.replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function uniqById(arr){ const s=new Set(); return arr.filter(x=>!s.has(x.id) && s.add(x.id)); }

function pushRoyalLog(msg){
  try{
    state.logs = Array.isArray(state.logs) ? state.logs : [];
    state.logs.push(`[Royal] ${msg}`);
    saveState();
  }catch{}
}

function safeLevelFromXpFallback(xp){
  const T = XP_TABLE;
  if (Array.isArray(T) && T.length){
    let lv = 1;
    for (; lv < T.length && (xp || 0) >= T[lv]; lv++);
    return Math.max(1, lv);
  }
  return Math.max(1, Math.floor(Math.sqrt((xp || 0)/100)) + 1);
}
function safeLevelFromXp(xp){
  try {
    const v = levelFromXp(xp || 0, XP_TABLE);
    if (Number.isFinite(v) && v >= 1) return v;
  } catch {}
  return safeLevelFromXpFallback(xp);
}
const royalLevel = ()=> safeLevelFromXp(state.royalXp || 0);

function bandForRoyal(lv){
  const start = Math.floor((Math.max(1, lv) - 1) / 5) * 5 + 1; // 1,6,11,16,..
  return { min: start, max: start + 4 };
}
function inBand(level, band){ return level >= band.min && level <= band.max; }

/* ---------- Extractors: recipe/node → (id, level) ---------- */
function outIdFromRecipe(r){
  if (!r) return null;
  if (typeof r.output === 'string') return r.output;
  if (r.output && typeof r.output.id === 'string') return r.output.id;
  if (typeof r.result === 'string') return r.result;
  if (typeof r.product === 'string') return r.product;
  if (typeof r.id === 'string') return r.id;
  return null;
}
function levelFromRecipe(r){
  return r?.level ?? r?.lvl ?? r?.levelReq ?? r?.req ?? r?.requirements?.level ?? 1;
}
function levelFromNode(n){
  return n?.level ?? n?.lvl ?? n?.levelReq ?? n?.req ?? n?.requirements?.level ?? 1;
}
function labelFor(id){ return ITEMS?.[id]?.name || humanizeId(id); }

function pickExistingItemId(...candidates){
  for (const c of candidates){
    const bid = baseId(c);
    if (bid && ITEMS[bid]) return bid;
  }
  return null;
}

/* ---------- LEVEL INDEX (from data only; no guesses) ---------- */
const LEVEL_INDEX = Object.create(null);

function indexLevel(id, level){
  const bid = baseId(id);
  const n = Number(level);
  if (!bid || !Number.isFinite(n) || n <= 0) return;
  // Keep the minimum seen level for an item id
  if (!LEVEL_INDEX[bid] || n < LEVEL_INDEX[bid]) LEVEL_INDEX[bid] = n;
}

(function buildLevelIndex(){
  try{
    // Trees → likely log ids
    for (const tr of TREES){
      const lvl = levelFromNode(tr);
      const ids = [tr?.logId, tr?.dropId, tr?.yieldId, tr?.itemId, tr?.id].filter(Boolean);
      for (const id of ids) indexLevel(id, lvl);
    }
    // Rocks → ore ids
    for (const rk of ROCKS){
      const lvl = levelFromNode(rk);
      const ids = [rk?.oreId, rk?.dropId, rk?.yieldId, rk?.itemId, rk?.id].filter(Boolean);
      for (const id of ids) indexLevel(id, lvl);
    }
    // Fishing → raw fish ids
    for (const sp of FISHING_SPOTS){
      const lvl = levelFromNode(sp);
      const ids = [sp?.rawId, sp?.raw, sp?.dropId, sp?.yieldId, sp?.itemId, sp?.id].filter(Boolean);
      for (const id of ids) indexLevel(id, lvl);
    }
    // Craft/Cook/Smelt/Forge → output ids
    for (const r of Object.values(CRAFT_RECIPES)) {
      const rawId = r.outputs?.[0]?.id ?? r.output?.id ?? r.output ?? r.result ?? r.product ?? r.id;
      if (rawId) indexLevel(rawId, levelFromRecipe(r));
    }
    for (const r of Object.values(COOK_RECIPES)) {
      const rawId = r.outputs?.[0]?.id ?? r.output?.id ?? r.output ?? r.result ?? r.product ?? r.id;
      if (rawId) indexLevel(rawId, levelFromRecipe(r));
    }
    for (const r of SMELT_RECIPES){ const id = pickExistingItemId(outIdFromRecipe(r)); if (id) indexLevel(id, levelFromRecipe(r)); }
    for (const r of FORGE_RECIPES){ const id = pickExistingItemId(outIdFromRecipe(r)); if (id) indexLevel(id, levelFromRecipe(r)); }
  }catch(e){
    console.warn('[Royal] Error building LEVEL_INDEX', e);
  }
})();

function levelForItemId(id){
  const v = LEVEL_INDEX[baseId(id)];
  return Number.isFinite(v) ? v : Infinity; // unknown items are treated as too hard
}

/* ---------- Source pools (levels come from data) ---------- */
function poolFromCook(){
  return Object.values(COOK_RECIPES).map(r => {
    const rawId =
      r.outputs?.[0]?.id ??
      r.output?.id ??
      r.output ??
      r.result ??
      r.product ??
      r.id;
    if (!rawId) return null;
    const id = baseId(rawId);
    return { id, level: levelFromRecipe(r), label: labelFor(id) };
  }).filter(Boolean);
}

function poolFromCraft(){
  return Object.values(CRAFT_RECIPES).map(r => {
    const rawId =
      r.outputs?.[0]?.id ??
      r.output?.id ??
      r.output ??
      r.result ??
      r.product ??
      r.id;
    if (!rawId) return null;
    const id = baseId(rawId);
    return { id, level: levelFromRecipe(r), label: labelFor(id) };
  }).filter(Boolean);
}
function poolFromArmorer(){
  const forge = FORGE_RECIPES.map(r=>{
    const id = pickExistingItemId(outIdFromRecipe(r));
    if (!id) return null;
    return { id, level: levelFromRecipe(r), label: labelFor(id) };
  }).filter(Boolean);
  if (forge.length) return forge;

  // If no forge recipes exist at all, just return empty; no fallbacks.
  return [];
}
function poolFromQuartermaster(){
  const logs = TREES.map(tr=>{
    const id = pickExistingItemId(tr?.drop); // e.g., 'log_oak'
    if (!id) return null;
    return { id, level: levelFromNode(tr), label: labelFor(id) };
  }).filter(Boolean);  

  const ores = ROCKS.map(rk=>{
    const id = pickExistingItemId(rk?.oreId, rk?.dropId, rk?.yieldId, rk?.itemId, rk?.id);
    if (!id) return null;
    return { id, level: levelFromNode(rk), label: labelFor(id) };
  }).filter(Boolean);

  const fish = FISHING_SPOTS.map(sp=>{
    const id = pickExistingItemId(sp?.rawId, sp?.raw, sp?.dropId, sp?.yieldId, sp?.itemId, sp?.id);
    if (!id) return null;
    return { id, level: levelFromNode(sp), label: labelFor(id) };
  }).filter(Boolean);

  return uniqById([...logs, ...ores, ...fish]);
}
function poolFromWarden(){
  return (MONSTERS || []).map(m=>({
    monsterId: m.id, name: m.name, level: m.level || 1
  }));
}

/* ---------- Absolute cap helper (strict with LEVEL_INDEX) ---------- */
function filterCapLevel(pool, bandMax){
  return (pool || [])
    .map(x => {
      const lvl = Number.isFinite(x.level) ? x.level : levelForItemId(x.id);
      return { ...x, level: lvl };
    })
    .filter(x => Number.isFinite(x.level) && x.level <= bandMax);
}

/* ---------- Static POOLS (built once from data) ---------- */
const RAW_POOLS = {
  Armorer:       poolFromArmorer(),
  Steward:       poolFromCook(),
  Craftsman:     poolFromCraft(),
  Quartermaster: poolFromQuartermaster(),
  Warden:        poolFromWarden()
};

/* ---------- Band-aware pickers (NO FALLBACKS) ---------- */
function pickDeliverables(patron, band, n){
  let cand = filterCapLevel(RAW_POOLS[patron], band.max);
  cand = uniqById(cand);

  if (!cand.length){
    const msg = `No eligible deliverables for ${patron} in band ${band.min}-${band.max}.`;
    console.warn('[Royal]', msg, { band, patron });
    pushRoyalLog(`${msg} Check data levels.`);
    return [];
  }

  const out = [];
  const bag = cand.slice();
  while (out.length < n && bag.length){
    const idx = Math.floor(Math.random()*bag.length);
    out.push(bag.splice(idx,1)[0]);
  }
  if (!out.length){
    const msg = `Picker produced 0 deliverables for ${patron} (band ${band.min}-${band.max}).`;
    console.warn('[Royal]', msg);
    pushRoyalLog(`${msg}`);
  }
  return out;
}

function pickMonsters(band, n){
  let cand = (RAW_POOLS.Warden || []).filter(m => (m.level || 1) <= band.max);

  if (!cand.length){
    const msg = `No eligible monsters in band ${band.min}-${band.max}.`;
    console.warn('[Royal]', msg, { band });
    pushRoyalLog(`${msg} Check MONSTERS data.`);
    return [];
  }

  const out = [];
  const bag = cand.slice();
  while (out.length < n && bag.length){
    const idx = Math.floor(Math.random()*bag.length);
    out.push(bag.splice(idx,1)[0]);
  }
  if (!out.length){
    const msg = `Picker produced 0 monsters (band ${band.min}-${band.max}).`;
    console.warn('[Royal]', msg);
    pushRoyalLog(`${msg}`);
  }
  return out;
}

/* ---------- Difficulty scaling (qty + #tasks) ---------- */
function layoutForRoyal(rLvl){
  if (rLvl <= 5)  return { tasksMin:2, tasksMax:3, qtyMin:2,  qtyMax:6 };   // softened early-game
  if (rLvl <= 10) return { tasksMin:3, tasksMax:4, qtyMin:8,  qtyMax:16 };
  if (rLvl <= 20) return { tasksMin:4, tasksMax:5, qtyMin:12, qtyMax:20 };
  if (rLvl <= 35) return { tasksMin:5, tasksMax:6, qtyMin:18, qtyMax:28 };
  return            { tasksMin:6, tasksMax:6, qtyMin:24, qtyMax:36 };
}

/* ---------- Rewards (with soft cap) ---------- */
const XP_TUNING = {
  deliverBase:      1.0,
  deliverPerReq:    0.7,
  deliverPerTier:   0.3,
  slayBase:         1.0,
  slayPerLevel:     1.2,
  completePerRoyal: 2.0,
  contractMaxPct:   0.22,
  contractBaseAdd:  60,
  contractMinAbs:   40,
  contractMaxAbs:   6000
};

function computeRewardXp(contract){
  let raw = 0;
  for (const t of (contract?.tasks || [])){
    if (t.kind === 'deliver'){
      const it   = ITEMS[baseId(t.id)];
      const tier = (it?.tier || 1);
      const sr   = Math.min(t.serviceLevel || 1, t.bandMax || 1);
      const per  = XP_TUNING.deliverBase
                 + XP_TUNING.deliverPerReq * sr
                 + XP_TUNING.deliverPerTier * tier;
      raw += Math.round(t.qty * per);
    } else {
      const lev = Math.min(t.level || 1, t.bandMax || 1);
      const per = XP_TUNING.slayBase + XP_TUNING.slayPerLevel * lev;
      raw += Math.round(t.qty * per);
    }
  }
  raw += Math.floor(royalLevel() * XP_TUNING.completePerRoyal);

  const cur = state.royalXp || 0;
  const cap = Math.max(
    XP_TUNING.contractMinAbs,
    Math.min(
      XP_TUNING.contractMaxAbs,
      Math.floor(cur * XP_TUNING.contractMaxPct + XP_TUNING.contractBaseAdd)
    )
  );
  return Math.max(10, Math.min(raw, cap));
}

/* ---------- Inventory (quality-agnostic) ---------- */
function countByBaseId(base){
  const inv = state.inventory || {};
  let total = 0;
  for (const [id, qty] of Object.entries(inv)){
    if (baseId(id) === base) total += (qty || 0);
  }
  return total;
}
function removeByBaseId(base, qty){
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

/* ---------- Slay baselines ---------- */
function currentKills(monsterId){ return Number(state.monsterKills?.[monsterId] || 0); }
function slayCountSince(task){
  const base = Number(task.baseKills || 0);
  const now  = currentKills(task.monsterId);
  return Math.max(0, now - base);
}

/* ---------- Public API ---------- */
export function tryOfferContract(){
  // Always give a contract if we can build tasks
  if (state.royalContract) return state.royalContract;

  const rLvl   = royalLevel();
  const band   = bandForRoyal(rLvl);
  const layout = layoutForRoyal(rLvl);

  const patron = choice(PATRONS);
  const want   = randInt(layout.tasksMin, layout.tasksMax);
  const qtyMin = layout.qtyMin, qtyMax = layout.qtyMax;

  const reduceQty = (qty, factor) => Math.max(1, Math.floor(qty * factor));

  let tasks = [];

  if (patron === 'Warden'){
    const mons = pickMonsters(band, want);
    tasks = mons.map(m => {
      const baseQty = randInt(qtyMin, qtyMax);
      const scaled  = reduceQty(baseQty, 0.4);
      return {
        kind: 'slay',
        monsterId: m.monsterId,
        name: m.name,
        level: Math.min(m.level || 1, band.max),
        bandMax: band.max,
        qty: scaled,
        baseKills: currentKills(m.monsterId) // progress starts from now
      };
    });
  } else {
    const pool = pickDeliverables(patron, band, want);
    const isHalfQty = (patron === 'Armorer' || patron === 'Craftsman'); // ← 50% fewer items
    tasks = pool.map(p => {
      const baseQty = randInt(qtyMin, qtyMax);
      const scaled  = isHalfQty ? reduceQty(baseQty, 0.3) : baseQty;
      return {
        kind: 'deliver',
        id: p.id,
        label: p.label,
        serviceLevel: Math.min(p.level || levelForItemId(p.id) || 1, band.max),
        bandMax: band.max,
        qty: scaled
      };
    });
  }

  // No fallbacks: if no tasks, do not create a contract
  if (!tasks.length){
    const msg = `No eligible tasks for ${patron} at band ${band.min}-${band.max}. Contract not created.`;
    console.warn('[Royal]', msg);
    pushRoyalLog(msg);
    return null;
  }

  const contract = { id: `ctr_${Date.now()}`, patron, tasks, rewardXp: 0 };
  contract.rewardXp = computeRewardXp(contract);
  state.royalContract = contract;
  saveState();
  return contract;
}

export function taskProgress(task){
  if (task.kind === 'slay'){
    if (task.baseKills == null){
      task.baseKills = currentKills(task.monsterId); // migration safety
      saveState();
    }
    const got = slayCountSince(task);
    return { have: Math.min(got, task.qty), need: task.qty };
  } else {
    const have = countByBaseId(baseId(task.id));
    return { have: Math.min(have, task.qty), need: task.qty };
  }
}

export function canTurnInItemTask(task){
  if (task.kind !== 'deliver') return false;
  const have = countByBaseId(baseId(task.id));
  return have >= task.qty;
}
export function turnInItemTask(task){
  if (task.kind !== 'deliver') return false;
  const ok = removeByBaseId(baseId(task.id), task.qty);
  if (!ok) return false;
  task.kind = 'deliver_done';
  saveState();
  return true;
}

function isTaskComplete(task){
  if (task.kind === 'deliver_done') return true;
  if (task.kind === 'deliver') return false;
  if (task.baseKills == null) task.baseKills = currentKills(task.monsterId);
  return slayCountSince(task) >= task.qty;
}

export function completeIfAllDone(){
  const ctr = state.royalContract;
  if (!ctr) return false;

  const allDone = ctr.tasks.every(isTaskComplete);
  if (!allDone) return false;

  state.royalXp    = (state.royalXp || 0) + ctr.rewardXp;
  state.royalFavor = (state.royalFavor || 0) + 1;

  state.royalHistory = state.royalHistory || [];
  state.royalHistory.push({ ...ctr, completedAt: Date.now() });

  state.royalContract = null;
  saveState();

  try {
    window.dispatchEvent(new CustomEvent('royal:complete', {
      detail: { favor: state.royalFavor, lastRewardXp: ctr.rewardXp }
    }));
  } catch {}

  return true;
}

export function abandonContract(){
  if (!state.royalContract) return false;
  state.royalHistory = state.royalHistory || [];
  state.royalHistory.push({ ...state.royalContract, abandonedAt: Date.now() });
  state.royalContract = null;
  saveState();
  return true;
}

// debug in console
/* ---------- Debug helpers (safe to remove later) ---------- */
export function royalPoolsSnapshot() {
  const toRows = (arr, take = 8) =>
    (Array.isArray(arr) ? arr.slice(0, take) : []).map(x => ({
      id: x.id ?? x.monsterId ?? '(?)',
      label: x.label ?? x.name ?? '(?)',
      level: x.level ?? '(?)',
    }));

  return {
    sizes: Object.fromEntries(Object.entries(RAW_POOLS).map(([k, v]) => [k, (v || []).length])),
    craftsman: toRows(RAW_POOLS.Craftsman),
    steward: toRows(RAW_POOLS.Steward),
    armorer: toRows(RAW_POOLS.Armorer),
    quartermaster: toRows(RAW_POOLS.Quartermaster),
    warden: toRows(RAW_POOLS.Warden),
  };
}

if (typeof window !== 'undefined') {
  // quick global hooks for your console
  window.royalPoolsSnapshot = royalPoolsSnapshot;
  window.royalPatronSizes = () =>
    Object.fromEntries(Object.entries(RAW_POOLS).map(([k, v]) => [k, (v || []).length]));
}
