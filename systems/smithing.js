// /systems/smithing.js
import { SMELT_RECIPES, FORGE_RECIPES } from '../data/smithing.js';
import { addItem, removeItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';

const XP_TABLE = buildXpTable();
const speedFromLevel = lvl => 1 + 0.02*(lvl-1);
const clampMs = (ms)=> Math.max(100, ms);

export const UPGRADE_METALS = ['copper','bronze','iron', 'steel', 'blacksteel'];

export const upgradeBarIdForMetal = (metal='copper') => `${metal}_upgrade_bar`;

export const metalFromBase = (baseId='') => {
  const m = String(baseId).split('_')[0];
  return UPGRADE_METALS.includes(m) ? m : null;
};
export const upgradeBarIdForBase = (baseId='') => {
  const m = metalFromBase(baseId);
  return m ? upgradeBarIdForMetal(m) : null;
};

// ---------- Quality roll tuned by reqLevel (req → req+20 window) ----------
/**
 * Returns an integer quality 1..100.
 * Bias increases linearly from the recipe's required level (t=0) to req+20 (t=1).
 * Past req+20 we clamp at the best bias. Below req we clamp at the worst bias.
 *
 * Tunables:
 *   Q_MEAN_LO:   average quality at req level
 *   Q_MEAN_HI:   average quality at req+20
 *   Q_SPREAD_LO: spread at req (wider/less consistent)
 *   Q_SPREAD_HI: spread at req+20 (tighter/more consistent)
 */
const Q_MEAN_LO = 35;
const Q_MEAN_HI = 88;
const Q_SPREAD_LO = 36;
const Q_SPREAD_HI = 18;

function lerp(a,b,t){ return a + (b-a)*t; }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

/** @param {number} smithLvl player smithing level
 *  @param {number} reqLevel recipe required level
 */
export function rollQuality(smithLvl, reqLevel=1){
  const t = clamp((smithLvl - reqLevel) / 20, 0, 1); // 0 at req, 1 at req+20+
  const mean   = lerp(Q_MEAN_LO,   Q_MEAN_HI,   t);
  const spread = lerp(Q_SPREAD_LO, Q_SPREAD_HI, t);

  // Sample uniform around mean with clamped integer result
  const lo = mean - spread/2;
  const hi = mean + spread/2;
  const raw = lo + Math.random() * (hi - lo);

  // Small upward nudge with skill so high skill slightly prefers the top half
  const bias = (t * 6) * Math.random(); // up to +6 at t=1
  const q = Math.round(raw + bias);

  return clamp(q, 1, 100);
}

// ---- extras (e.g., wood_handle) ----
function hasExtras(state, rec){
  if(!rec?.extras?.length) return true;
  return rec.extras.every(ex => (state.inventory[ex.id]||0) >= ex.qty);
}
function spendExtras(state, rec){
  if(!rec?.extras?.length) return;
  rec.extras.forEach(ex => removeItem(state, ex.id, ex.qty));
}

// Resolve bar id for a forge recipe (multi-metal support)
function barIdFor(rec){
  return rec?.barId || (rec?.metal ? `bar_${rec.metal}` : 'bar_copper');
}

// Monotonic job sequence for race-proof completions
function nextJobId(state){
  state._jobSeq = (state._jobSeq || 0) + 1;
  return state._jobSeq;
}

/* -------------------- Smelting -------------------- */
export function canSmelt(state, outId='bar_copper'){
  const r = SMELT_RECIPES[outId]; if(!r) return false;
  return (r.inputs||[]).every(inp => (state.inventory[inp.id]||0) >= inp.qty);
}
export function maxSmeltable(state, outId='bar_copper'){
  const r = SMELT_RECIPES[outId]; if(!r || !r.inputs?.length) return 0;
  return Math.min(...r.inputs.map(inp => Math.floor((state.inventory[inp.id]||0) / inp.qty)));
}
export function startSmelt(state, outId='bar_copper', onDone){
  if (state.action) return false; // allow tomes; they don't use state.action
  const r = SMELT_RECIPES[outId]; if(!r) return false;

  const need = r.level || 1;
  const lvl  = levelFromXp(state.smithXp||0, XP_TABLE);
  if (lvl < need) return false;
  if(!canSmelt(state, outId)) return false;

  const dur = clampMs((r.time||2000) / speedFromLevel(lvl));
  const now = performance.now();
  const jobId = nextJobId(state);

  state.action = {
    type:'smith', mode:'smelt', key:outId,
    startedAt: now,
    endsAt: now + dur,
    duration: dur,
    jobId
  };

  setTimeout(()=>{
    if (state.action?.type==='smith' && state.action?.mode==='smelt' &&
        state.action?.key===outId && state.action?.jobId===jobId){
      onDone?.();
    }
  }, dur);

  return true;
}
export function finishSmelt(state){
  const key = state.action?.key;
  const r = SMELT_RECIPES[key]; if(!r){ state.action = null; return null; }

  if(!(r.inputs||[]).every(inp => (state.inventory[inp.id]||0) >= inp.qty)){
    state.action = null; return null;
  }
  r.inputs.forEach(inp => removeItem(state, inp.id, inp.qty));
  addItem(state, key, 1);
  const gain = r.xp || 0;
  state.smithXp = (state.smithXp||0) + gain;

  state.action = null;
  return { id:key, xp: gain };
}

/* -------------------- Forging (anvil) -------------------- */
export function canForge(state, outId){
  const rec = FORGE_RECIPES.find(x=>x.id===outId); if(!rec) return false;
  const barId = barIdFor(rec);
  const barsOk = (state.inventory[barId]||0) >= (rec.bars||0);
  const extrasOk = hasExtras(state, rec);
  const lvl = levelFromXp(state.smithXp||0, XP_TABLE);
  const need = rec.level || 1;
  return barsOk && extrasOk && (lvl >= need);
}
export function startForge(state, outId, onDone){
  if (state.action) return false; // allow tomes; they don't use state.action
  const rec = FORGE_RECIPES.find(x=>x.id===outId); if(!rec) return false;
  if(!canForge(state, outId)) return false;

  const lvl = levelFromXp(state.smithXp||0, XP_TABLE);
  const dur = clampMs((rec.time||2000) / speedFromLevel(lvl));
  const now = performance.now();
  const jobId = nextJobId(state);

  state.action = {
    type:'smith', mode:'forge', key:outId,
    startedAt: now,
    endsAt: now + dur,
    duration: dur,
    jobId
  };

  setTimeout(()=>{
    if (state.action?.type==='smith' && state.action?.mode==='forge' &&
        state.action?.key===outId && state.action?.jobId===jobId){
      onDone?.();
    }
  }, dur);

  return true;
}
export function finishForge(state){
  const rec = FORGE_RECIPES.find(x => x.id === state.action?.key);
  if (!rec){ state.action = null; return null; }
  if (!canForge(state, rec.id)){ state.action = null; return null; }

  const barId = barIdFor(rec);
  removeItem(state, barId, rec.bars || 0);
  spendExtras(state, rec);

  const lvl = levelFromXp(state.smithXp || 0, XP_TABLE);
  const giveQuality = (rec.kind !== 'material') && (rec.quality !== false);
  const outId = giveQuality ? `${rec.id}@${rollQuality(lvl, rec.level || 1)}` : rec.id;

  addItem(state, outId, 1);
  const gain = rec.xp || 0;
  state.smithXp = (state.smithXp || 0) + gain;

  state.action = null;
  return { outId, q: giveQuality ? parseInt(outId.split('@')[1],10) : null, xp: gain };
}

/* -------------------- Upgrades -------------------- */
function parseId(id=''){
  const [base, qStr] = String(id).split('@');
  const q = qStr ? Math.max(1, Math.min(100, parseInt(qStr,10)||0)) : null;
  return { base, q };
}
function isUpgradeableGear(baseId){
  return !!metalFromBase(baseId);
}
function rollUpgradeDelta(smithLvl){
  // ~10–25%, slightly higher with Smithing
  const min = 10 + Math.floor(smithLvl/20);
  const max = 25 + Math.floor(smithLvl/15);
  const lo = Math.min(min, max), hi = Math.max(min, max);
  return Math.max(1, Math.floor(lo + Math.random()*(hi - lo + 1)));
}

export function listUpgradable(state, ITEMS){
  const out = [];

  // inventory
  for (const [id, qty] of Object.entries(state.inventory||{})){
    if (!qty) continue;
    const { base, q } = parseId(id);
    if (!q) continue;
    if (!isUpgradeableGear(base)) continue;
    if (q >= 100) continue;
    const name = ITEMS?.[base]?.name || base.replace(/_/g,' ');
    out.push({ where:'inv', token:`inv|${id}`, base, q, name, qty });
  }
  // equipped
  for (const [slot, id] of Object.entries(state.equipment||{})){
    if (!id) continue;
    const { base, q } = parseId(id);
    if (!q) continue;
    if (!isUpgradeableGear(base)) continue;
    if (q >= 100) continue;
    const name = ITEMS?.[base]?.name || base.replace(/_/g,' ');
    out.push({ where:'equip', token:`equip|${slot}`, base, q, name, slot });
  }

  out.sort((a,b)=> (a.q||0)-(b.q||0) || a.name.localeCompare(b.name));
  return out;
}

export function applyUpgrade(state, token){
  const smithLvl = levelFromXp(state.smithXp||0, XP_TABLE);
  const delta = rollUpgradeDelta(smithLvl);
  const UPGRADE_XP = 5;

  function upgradeId(oldId){
    const { base, q } = parseId(oldId);
    if (!q) return null;
    if (!isUpgradeableGear(base)) return null;
    const newQ = Math.min(100, q + delta);
    return { base, oldQ:q, newQ, newId: `${base}@${newQ}` };
  }

  function spendBarForBase(base){
    const barId = upgradeBarIdForBase(base);
    if (!barId) return null;
    if ((state.inventory[barId]||0) <= 0) return null;
    removeItem(state, barId, 1);
    return barId;
  }

  let result = null;

  if (token.startsWith('inv|')){
    const oldId = token.slice(4);
    if ((state.inventory[oldId]||0) <= 0) return null;
    const u = upgradeId(oldId); if(!u) return null;
    const barId = spendBarForBase(u.base); if (!barId) return null;
    removeItem(state, oldId, 1);
    addItem(state, u.newId, 1);
    state.smithXp = (state.smithXp||0) + UPGRADE_XP;
    result = { where:'inv', base:u.base, oldQ:u.oldQ, newQ:u.newQ, xp: UPGRADE_XP, barId };
  } else if (token.startsWith('equip|')){
    const slot = token.slice(6);
    const oldId = state.equipment?.[slot]; if(!oldId) return null;
    const u = upgradeId(oldId); if(!u) return null;
    const barId = spendBarForBase(u.base); if (!barId) return null;
    state.equipment[slot] = u.newId;
    state.smithXp = (state.smithXp||0) + UPGRADE_XP;
    result = { where:'equip', slot, base:u.base, oldQ:u.oldQ, newQ:u.newQ, xp: UPGRADE_XP, barId };
  }

  return result;
}
