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
const COOK_RECIPES   = Array.isArray(_COOK_RECIPES) ? _COOK_RECIPES : [];
const CRAFT_RECIPES  = Array.isArray(_CRAFT_RECIPES) ? _CRAFT_RECIPES : [];
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

/* ---------- Source pools (levels come from data files) ---------- */
function poolFromCook(){
  return COOK_RECIPES.map(r=>{
    const id = pickExistingItemId(outIdFromRecipe(r));
    if (!id) return null;
    return { id, level: levelFromRecipe(r), label: labelFor(id) };
  }).filter(Boolean);
}
function poolFromCraft(){
  return CRAFT_RECIPES.map(r=>{
    const id = pickExistingItemId(outIdFromRecipe(r));
    if (!id) return null;
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

  return SMELT_RECIPES.map(r=>{
    const id = pickExistingItemId(outIdFromRecipe(r));
    if (!id) return null;
    return { id, level: levelFromRecipe(r), label: labelFor(id) };
  }).filter(Boolean);
}
function poolFromQuartermaster(){
  const logs = TREES.map(tr=>{
    const id = pickExistingItemId(tr?.logId, tr?.dropId, tr?.yieldId, tr?.itemId, tr?.id);
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

/* ---------- Absolute cap helper (never go above band.max) ---------- */
function filterCapLevel(pool, bandMax){
  // Only keep entries with level defined and <= bandMax
  return (pool || []).filter(x => Number.isFinite(x.level) && (x.level || 1) <= bandMax);
}

/* ---------- Fallbacks that also HONOR the cap ---------- */
function deriveItemLevelFromItem(it){
  if (!it) return 1;
  const lvl = it.levelReq ?? it.req ?? (it.tier ? (1 + (it.tier-1)*5) : 1);
  const n = Number(lvl);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function anyItemsUpTo(max, limit=30){
  const out = [];
  for (const [id,it] of Object.entries(ITEMS)){
    const lvl = deriveItemLevelFromItem(it);
    if (lvl <= max) out.push({ id, level: lvl, label: it?.name || humanizeId(id) });
    if (out.length >= limit) break;
  }
  return out;
}

/* ---------- Static POOLS (built once from data) ---------- */
const RAW_POOLS = {
  Armorer:       poolFromArmorer(),
  Steward:       poolFromCook(),
  Craftsman:     poolFromCraft(),
  Quartermaster: poolFromQuartermaster(),
  Warden:        poolFromWarden()
};

/* ---------- Band-aware pickers (NEVER exceed band.max) ---------- */
function pickDeliverables(patron, band, n){
  // Start with the patron’s pool
  let cand = filterCapLevel(RAW_POOLS[patron], band.max);

  // If empty, fallback to *any* items but still <= band.max
  if (!cand.length){
    cand = anyItemsUpTo(band.max, 50);
  }

  // Still empty (extremely unlikely)? fabricate a couple level-1 entries
  if (!cand.length){
    cand = [{ id: 'log', level: 1, label: 'Log' }, { id: 'ore_copper', level: 1, label: 'Copper Ore' }];
    cand = cand.filter(x => ITEMS[x.id]); // only if present in ITEMS
    if (!cand.length){
      // give up and return a neutral thing with level 1 (UI can still display)
      cand = [{ id: Object.keys(ITEMS)[0] || 'unknown_item', level: 1, label: 'Supply' }];
    }
  }

  cand = uniqById(cand);
  const out = [];
  const bag = cand.slice();
  while (out.length < n && bag.length){
    const idx = Math.floor(Math.random()*bag.length);
    out.push(bag.splice(idx,1)[0]);
  }
  return out;
}

function pickMonsters(band, n){
  // Strict cap: only monsters <= band.max
  let cand = (RAW_POOLS.Warden || []).filter(m => (m.level || 1) <= band.max);
  if (!cand.length){
    // fallback: any monster up to band.max (if RAW_POOLS had junk levels)
    cand = (MONSTERS || []).filter(m => (m.level || 1) <= band.max).map(m=>({
      monsterId: m.id, name: m.name, level: m.level || 1
    }));
  }
  // If still empty, pick the very easiest monster if exists
  if (!cand.length){
    cand = (MONSTERS.length ? [{
      monsterId: MONSTERS[0].id, name: MONSTERS[0].name, level: MONSTERS[0].level || 1
    }] : [{ monsterId: 'bog_mite', name: 'Bog Mite', level: 1 }]);
  }

  const out = [];
  const bag = cand.slice();
  while (out.length < n && bag.length){
    const idx = Math.floor(Math.random()*bag.length);
    out.push(bag.splice(idx,1)[0]);
  }
  return out;
}

/* ---------- Difficulty scaling (qty + #tasks) ---------- */
function layoutForRoyal(rLvl){
  if (rLvl <= 5)  return { tasksMin:2, tasksMax:3, qtyMin:4,  qtyMax:10 };
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
  contractMaxAbs:   600
};

function computeRewardXp(contract){
  let raw = 0;
  for (const t of (contract?.tasks || [])){
    if (t.kind === 'deliver'){
      const it   = ITEMS[baseId(t.id)];
      const tier = (it?.tier || 1);
      // never count harder than the band cap
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
  // Always give a contract (never null)
  if (state.royalContract) return state.royalContract;

  const rLvl   = royalLevel();
  const band   = bandForRoyal(rLvl);
  const layout = layoutForRoyal(rLvl);

  const patron = choice(PATRONS);
  const want   = randInt(layout.tasksMin, layout.tasksMax);
  const qtyMin = layout.qtyMin, qtyMax = layout.qtyMax;

  let tasks = [];

  if (patron === 'Warden'){
    const mons = pickMonsters(band, want);
    tasks = mons.map(m => ({
      kind: 'slay',
      monsterId: m.monsterId,
      name: m.name,
      level: Math.min(m.level || 1, band.max),
      bandMax: band.max,
      qty: randInt(qtyMin, qtyMax),
      baseKills: currentKills(m.monsterId) // progress starts from now
    }));
  } else {
    const pool = pickDeliverables(patron, band, want);
    tasks = pool.map(p => ({
      kind: 'deliver',
      id: p.id,
      label: p.label,
      serviceLevel: Math.min(p.level || 1, band.max),
      bandMax: band.max,
      qty: randInt(qtyMin, qtyMax)
    }));
  }

  // Ultimate safety: if something went wrong, synthesize 2 easy ≤ band.max items
  if (!tasks.length){
    const easy = anyItemsUpTo(band.max, 10);
    const picks = easy.slice(0, 2).length ? easy.slice(0, 2) : [{ id: Object.keys(ITEMS)[0], level: 1, label: 'Supply' }];
    tasks = picks.map(p => ({
      kind: 'deliver',
      id: p.id,
      label: p.label,
      serviceLevel: Math.min(p.level || 1, band.max),
      bandMax: band.max,
      qty: randInt(qtyMin, qtyMax)
    }));
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
