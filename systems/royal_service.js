// /systems/royal_service.js — lean version + patron XP multipliers

import { state, saveNow } from './state.js';
import { hasItems, removeItem } from './inventory.js';
import { XP_TABLE, levelFromXp } from './xp.js';

// Data
import { ITEMS as _ITEMS } from '../data/items.js';
import { COOK_RECIPES as _COOK_RECIPES } from '../data/cooking.js';
import { CRAFT_RECIPES as _CRAFT_RECIPES } from '../data/crafting.js';
import { MONSTERS as _MONSTERS } from '../data/monsters.js'; // optional

// ---------- Safe aliases ----------
const ITEMS         = _ITEMS || {};
const COOK_RECIPES  = _COOK_RECIPES || {};
const CRAFT_RECIPES = _CRAFT_RECIPES || {};
const MONSTERS      = Array.isArray(_MONSTERS) ? _MONSTERS : [];

// ---------- Small utils ----------
function baseId(id){ return String(id || '').split('@')[0]; }
function labelFor(id){ return ITEMS?.[baseId(id)]?.name || String(id || '').replace(/[_-]+/g,' '); }
function uniqById(arr){ const s=new Set(); return (arr||[]).filter(x=>x?.id && !s.has(x.id) && s.add(x.id)); }
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function levelForItemId(id){
  const it = ITEMS?.[baseId(id)];
  const n = Number(it?.level ?? it?.lvl ?? it?.levelReq);
  return Number.isFinite(n) ? n : 1;
}
function levelFromRecipe(r){
  const lvl = r?.level ?? r?.lvl ?? r?.levelReq ?? r?.req ?? r?.requirement ?? 1;
  const n = Number(lvl);
  return Number.isFinite(n) ? n : 1;
}
function pickExistingItemId(...candidates){
  for (const raw of candidates){
    const id = typeof raw === 'string' ? raw : raw?.id;
    if (id && ITEMS[baseId(id)]) return baseId(id);
  }
  return null;
}

// ---------- Royal level & banding (original) ----------
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

/** Deliverables: 5-level windows by royal level, used as a max-cap gate (like old file). */
function bandForRoyal(rLvl){
  const start = Math.floor((Math.max(1, rLvl) - 1) / 5) * 5 + 1;
  return { min: start, max: start + 4 };
}

// ---------- Favor-based monster window ----------
/** e.g., 45 Favor → {min:20, max:40}. */
function monsterBandForFavor(favor = 0){
  const f = Math.max(0, favor|0);
  if (f >= 90) return { min: 45, max: 90 };
  if (f >= 80) return { min: 40, max: 80 };
  if (f >= 70) return { min: 35, max: 70 };
  if (f >= 60) return { min: 30, max: 60 };
  if (f >= 50) return { min: 25, max: 50 };
  if (f >= 40) return { min: 20, max: 40 };  // 45 favor → 20–40
  if (f >= 30) return { min: 15, max: 30 };
  if (f >= 20) return { min: 10, max: 20 };
  if (f >= 10) return { min: 5,  max: 15 };
  return            { min: 1,  max: 8  };
}

// ---------- Difficulty scaling (original) ----------
function layoutForRoyal(rLvl){
  if (rLvl <= 5)  return { tasksMin:2, tasksMax:3, qtyMin:2,  qtyMax:6  };
  if (rLvl <= 10) return { tasksMin:3, tasksMax:4, qtyMin:8,  qtyMax:16 };
  if (rLvl <= 20) return { tasksMin:4, tasksMax:5, qtyMin:12, qtyMax:20 };
  if (rLvl <= 35) return { tasksMin:5, tasksMax:6, qtyMin:18, qtyMax:28 };
  return            { tasksMin:6, tasksMax:6, qtyMin:24, qtyMax:36 };
}

// ---------- Pools (validated against ITEMS) ----------
function poolFromCook(){
  return Object.values(COOK_RECIPES).map(r=>{
    const id = pickExistingItemId(
      r?.outputs?.[0]?.id,
      r?.output?.id, r?.output,
      r?.result, r?.product, r?.id
    );
    if (!id) return null;
    return { id, level: levelFromRecipe(r), label: labelFor(id) };
  }).filter(Boolean);
}
function poolFromCraft(){
  return Object.values(CRAFT_RECIPES).map(r=>{
    const id = pickExistingItemId(
      r?.outputs?.[0]?.id,
      r?.output?.id, r?.output,
      r?.result, r?.product, r?.id
    );
    if (!id) return null;
    return { id, level: levelFromRecipe(r), label: labelFor(id) };
  }).filter(Boolean);
}
function poolFromSmithLikeCraft(){
  const ARMORISH = /sword|axe|mace|bow|helm|helmet|hood|chest|plate|armor|armour|mail|shield|greaves|boots|gauntlet|bracer|dagger|spear|pike|arrow|bolt/i;
  return Object.values(CRAFT_RECIPES).map(r=>{
    const id = pickExistingItemId(
      r?.outputs?.[0]?.id, r?.output?.id, r?.output, r?.result, r?.product, r?.id
    );
    if (!id) return null;
    const name = labelFor(id);
    if (!ARMORISH.test(id) && !ARMORISH.test(name)) return null;
    return { id, level: levelFromRecipe(r), label: name };
  }).filter(Boolean);
}
function poolFromQuartermasterResources(){
  const RES = /log|plank|board|stone|rock|ore|bar|coal|brick|fiber|cloth|leather|rope|nail|hinge|timber|ingot|sand|glass/i;
  const seen = new Set();
  const out = [];

  for (const [id, it] of Object.entries(ITEMS)){
    if (!id || seen.has(id)) continue;
    const name = it?.name || id;
    if (RES.test(id) || RES.test(name)){
      out.push({ id, level: Number(it?.level)||1, label: name });
      seen.add(id);
    }
  }
  for (const r of Object.values(CRAFT_RECIPES)){
    const id = pickExistingItemId(
      r?.outputs?.[0]?.id, r?.output?.id, r?.output, r?.result, r?.product, r?.id
    );
    if (!id || seen.has(id)) continue;
    const name = labelFor(id);
    if (RES.test(id) || RES.test(name)){
      out.push({ id, level: levelFromRecipe(r), label: name });
      seen.add(id);
    }
  }
  return out;
}
function poolFromMonsters(){
  return MONSTERS.map(m=>{
    const lvl = Number(m?.level ?? m?.lvl ?? m?.combatLevel ?? 1);
    const name = m?.name || m?.id || 'Monster';
    const id   = m?.id || name.toLowerCase().replace(/\s+/g,'_');
    return { id, level: Number.isFinite(lvl) ? lvl : 1, name };
  }).filter(x=>x.id && x.level >= 1);
}

// Assemble patrons (non-empty only)
const _RAW = {
  Steward:       poolFromCook(),
  Craftsman:     poolFromCraft(),
  Armorer:       poolFromSmithLikeCraft(),
  Quartermaster: poolFromQuartermasterResources(),
  Warden:        poolFromMonsters(),
};
const RAW_POOLS = Object.fromEntries(
  Object.entries(_RAW).filter(([,v]) => Array.isArray(v) && v.length > 0)
);

// ---------- Candidate filtering & picking (original cap-by-max style) ----------
function filterCapLevel(pool, bandMax){
  return (pool||[])
    .map(x=>{
      const lvl = Number.isFinite(x.level) ? x.level : levelForItemId(x.id);
      return { ...x, level: Number.isFinite(lvl) ? lvl : 1 };
    })
    .filter(x => Number.isFinite(x.level) && x.level <= bandMax);
}

export function pickDeliverables(patron, band, n){
  let cand = filterCapLevel(RAW_POOLS[patron], band.max);
  cand = uniqById(cand);
  if (!cand.length) return [];

  const bag = cand.slice();
  const out = [];
  while (out.length < n && bag.length){
    const idx = Math.floor(Math.random()*bag.length);
    out.push(bag.splice(idx,1)[0]);
  }
  return out;
}
function pickMonstersFavor(band, n){
  // Favor-based band (min..max), simple selection
  let cand = (RAW_POOLS.Warden || []).filter(m =>
    (m.level || 1) >= band.min && (m.level || 1) <= band.max
  );
  if (!cand.length) return [];

  const bag = cand.slice();
  const out = [];
  while (out.length < n && bag.length){
    const idx = Math.floor(Math.random()*bag.length);
    out.push(bag.splice(idx,1)[0]);
  }
  return out;
}

// ---------- Rewards (original base) + Patron multipliers ----------
const XP_TUNING = {
  deliverBase:      4.0,
  deliverPerReq:    1.7,
  deliverPerTier:   1.3,
  slayBase:         1.0,
  slayPerLevel:     1.2,
  completePerRoyal: 2.0,
  contractMaxPct:   0.22,
  contractBaseAdd:  60,
  contractMinAbs:   40,
  contractMaxAbs:   6000
};

// New: XP multiplier by patron (Steward 0.6x, Quartermaster 2.2x, Craftsman 2.5x, Warden 1.2x, Armorer 1.0x)
function patronXpMultiplier(patron){
  switch (patron){
    case 'Steward':       return 0.60; // 40% less
    case 'Quartermaster': return 2.20; // 120% more
    case 'Craftsman':     return 2.50; // 150% more
    case 'Warden':        return 1.20; // 20% more
    default:              return 1.00; // Armorer/others unchanged
  }
}

function computeRewardXp(contract){
  let raw = 0;
  for (const t of (contract?.tasks || [])){
    if (t.kind === 'deliver'){
      const it   = ITEMS[baseId(t.id)];
      const tier = (it?.tier || 1);
      const sr   = Math.min(t.serviceLevel || 1, t.bandMax || 1);
      const per  = XP_TUNING.deliverBase + XP_TUNING.deliverPerReq * sr + XP_TUNING.deliverPerTier * tier;
      raw += Math.round((t.qty ?? t.need ?? 0) * per);
    } else {
      const lev = Math.min(t.level || 1, t.bandMax || 1);
      const per = XP_TUNING.slayBase + XP_TUNING.slayPerLevel * lev;
      raw += Math.round((t.qty ?? 0) * per);
    }
  }

  // Apply patron multiplier once to the total (contracts are single-patron)
  raw = Math.round(raw * patronXpMultiplier(contract?.patron));

  // Completion bonus & soft cap as before
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

// ---------- Favor & unlocks ----------
function royalFavor(){ return +(state.royalFavor || 0); }
export function ensureRoyalUnlocks(){
  try {
    const favor = royalFavor();
    const pets = (state.pets = state.pets || {});
    if (favor >= 50 && !pets.sterling){
      pets.sterling = { id: 'sterling', level: 1, xp: 0, owned: true };
      saveNow();
      try { window.dispatchEvent(new CustomEvent('pets:change')); } catch {}
    }
  } catch (e) {
    console.error('[Royal] ensureRoyalUnlocks error', e);
  }
}

// ---------- Contract engine (original quantities) ----------
function randomPatron(){
  const order = ['Warden','Quartermaster','Armorer','Steward','Craftsman'];
  const keys = order.filter(k => (RAW_POOLS[k]||[]).length);
  return keys[Math.floor(Math.random()*keys.length)] || 'Steward';
}

export function tryOfferContract(){
  if (state.royalContract) return state.royalContract;

  const rLvl   = royalLevel();
  const dBand  = bandForRoyal(rLvl);            // deliverables cap-by-max
  const fBand  = monsterBandForFavor(royalFavor()); // monsters favor-based
  const layout = layoutForRoyal(rLvl);
  const patron = randomPatron();

  const want   = randInt(layout.tasksMin, layout.tasksMax);
  const qtyMin = layout.qtyMin, qtyMax = layout.qtyMax;

  let tasks = [];

  if (patron === 'Warden'){
    const mons = pickMonstersFavor(fBand, want);
    tasks = mons.map(m => ({
      kind: 'slay',
      id: m.id,
      name: m.name,
      level: Math.min(m.level || 1, fBand.max),
      bandMax: fBand.max,
      // ORIGINAL slay amount scale: ~40% of deliver quantities
      qty: Math.max(1, Math.floor(randInt(qtyMin, qtyMax) * 0.4)),
      need: undefined, have: 0
    }));
  } else {
    const pool = pickDeliverables(patron, dBand, want);
    const isHalfQty = (patron === 'Armorer' || patron === 'Craftsman'); // ORIGINAL: crafts/armorer lower
    tasks = pool.map(p => {
      const qty = Math.max(1, Math.floor(randInt(qtyMin, qtyMax) * (isHalfQty ? 0.3 : 1)));
      return {
        kind: 'deliver',
        id: p.id,
        label: p.label || labelFor(p.id),
        serviceLevel: Math.min(p.level || levelForItemId(p.id) || 1, dBand.max),
        bandMax: dBand.max,
        qty, need: qty, have: 0
      };
    });
  }

  if (!tasks.length) return false;

  const contract = { id: `ctr_${Date.now()}`, patron, tasks, rewardXp: 0 };
  contract.rewardXp = computeRewardXp(contract);
  state.royalContract = contract;
  saveNow();
  try { window.dispatchEvent(new Event('royal:change')); } catch {}
  return contract;
}

// ---------- UI helpers ----------
export function taskProgress(t){
  if (!t) return { have:0, need:0 };
  return { have: Math.max(0, t.have|0), need: Math.max(0, t.need ?? t.qty ?? 0) };
}
export function canTurnInItemTask(t){
  if (!t || t.kind !== 'deliver') return false;
  const remaining = Math.max(0, (t.need|0) - (t.have|0));
  if (remaining <= 0) return false;
  return hasItems(state, [{ id: t.id, qty: remaining }]);
}
export function turnInItemTask(t){
  if (!canTurnInItemTask(t)) return false;
  const remaining = Math.max(0, t.need - t.have);
  if (!remaining) return false;
  removeItem(state, t.id, remaining);
  t.have = t.need;
  t.kind = 'deliver_done';
  saveNow();
  try { window.dispatchEvent(new Event('royal:change')); } catch {}
  return true;
}

export function completeIfAllDone(){
  const ctr = state.royalContract;
  if (!ctr) return false;

  const done = ctr.tasks.every(x => {
    if (x.kind === 'deliver') return (x.have|0) >= (x.need|0);
    return (x.have|0) >= (x.need ?? x.qty ?? 0);
  });
  if (!done) return false;

  state.royalXp    = (state.royalXp || 0) + (ctr.rewardXp || 0);
  state.royalFavor = (state.royalFavor || 0) + 1;

  state.royalHistory = state.royalHistory || [];
  try { state.royalHistory.push({ ...ctr, completedAt: Date.now() }); } catch {}

  state.royalContract = null;
  saveNow();
  try {
    window.dispatchEvent(new Event('royal:complete'));
    window.dispatchEvent(new Event('favor:update'));
  } catch {}
  try { ensureRoyalUnlocks(); } catch {}

  return true;
}

export function abandonContract(){
  if (!state.royalContract) return false;
  state.royalHistory = state.royalHistory || [];
  try { state.royalHistory.push({ ...state.royalContract, abandonedAt: Date.now() }); } catch {}
  state.royalContract = null;
  saveNow();
  try { window.dispatchEvent(new Event('royal:change')); } catch {}
  return true;
}

// Optional: dev helpers
if (typeof window !== 'undefined') {
  window.__royalPools = () =>
    Object.fromEntries(Object.entries(RAW_POOLS).map(([k,v]) => [k, (v||[]).length]));
  window.ensureRoyalUnlocks = ensureRoyalUnlocks;
}
