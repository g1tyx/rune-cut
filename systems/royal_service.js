// /systems/royal_service.js
import { state, saveNow } from './state.js';
import { hasItems, removeItem } from './inventory.js';
import { XP_TABLE, levelFromXp } from './xp.js';

import { ITEMS } from '../data/items.js';
import { COOK_RECIPES } from '../data/cooking.js';
import { SMELT_RECIPES, FORGE_RECIPES } from '../data/smithing.js';
import { MONSTERS as _MONSTERS } from '../data/monsters.js';
import {
  PATRONS, CONTRACT_BUDGETS, CONTRACT_LAYOUT, ITEM_LEVEL_CAPS,
  ELIGIBILITY, WEIGHTING, REWARDS, COOLDOWNS,
  COMBAT, SKILLS, TAG_SKILL, TIERING
} from '../data/royal_service_config.js';

const FORGE = Array.isArray(FORGE_RECIPES) ? FORGE_RECIPES : [];
const MONSTERS = Array.isArray(_MONSTERS) ? _MONSTERS : [];

const baseId = (s)=> String(s||'').split('@')[0].split('#')[0];
const randInt = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;

/* ---------- Levels ---------- */
function levelFromXpSafe(xp){ return levelFromXp(xp||0, XP_TABLE); }
function royalLevel(){ return levelFromXpSafe(state.royalXp || 0); }

function pickByLevel(table, level){
  for (const t of table){ if (level <= t.to) return t; }
  return table[table.length - 1];
}

function deriveSkillLevelsFromState(){
  const out = {};
  for (const [skill, xpKey] of Object.entries(SKILLS)){
    const xp = state?.[xpKey] || 0;
    out[skill] = levelFromXpSafe(xp);
  }
  return out;
}

/* ---------- Recipes & gates ---------- */
function normalizeRecipes(src, defSkill){
  const out = [];
  if (Array.isArray(src)) {
    for (const r of src){
      out.push({
        id: r.id, lvl: r.level ?? r.lvl ?? 1,
        inputs: Array.isArray(r.inputs) ? r.inputs : [],
        outputs: Array.isArray(r.outputs) ? r.outputs : (r.output ? [r.output] : []),
        reqSkill: r.reqSkill || r.speedSkill || defSkill || null,
      });
    }
  } else {
    for (const k in (src||{})){
      const r = src[k];
      out.push({
        id: r.id || k, lvl: r.level ?? r.lvl ?? 1,
        inputs: Array.isArray(r.inputs) ? r.inputs : [],
        outputs: Array.isArray(r.outputs) ? r.outputs : (r.output ? [r.output] : []),
        reqSkill: r.reqSkill || r.speedSkill || defSkill || null,
      });
    }
  }
  return out;
}

const ALL_RECIPES = [
  ...normalizeRecipes(COOK_RECIPES,  'cook'),
  ...normalizeRecipes(SMELT_RECIPES, 'smith'),
  ...normalizeRecipes(FORGE, 'smith'),
];

const RECIPES_BY_OUT = (()=> {
  const m = new Map();
  for (const r of ALL_RECIPES){
    for (const o of (r.outputs || [])){
      const id = baseId(o?.id || '');
      if (!id) continue;
      if (!m.has(id)) m.set(id, []);
      m.get(id).push(r);
    }
  }
  return m;
})();

function impliedGate(itemId){
  const recs = RECIPES_BY_OUT.get(baseId(itemId));
  if (!recs || !recs.length) return null;
  let best = { skill:'general', level:1 };
  for (const r of recs){
    const lv = Number(r.lvl || 1);
    if (lv > best.level) best = { skill: r.reqSkill || 'general', level: lv };
  }
  return best;
}

function sellToLevel(sell){
  const v = Math.max(0, Number(sell||0));
  for (const seg of (TIERING.sellToLevel || [])){
    if (v <= seg.sellLTE) return Math.min(seg.level, TIERING.maxInferredLevel || 80);
  }
  return TIERING.maxInferredLevel || 80;
}

/** Effective item level: recipe level > item.level > sell-derived */
function effectiveItemLevel(itemId){
  const id = baseId(itemId);
  const rg = impliedGate(id);
  if (rg && Number.isFinite(rg.level)) return rg.level;
  const it = ITEMS[id];
  const iv = Number(it?.level ?? it?.lvl ?? it?.levelReq);
  if (Number.isFinite(iv) && iv > 0) return iv;
  return sellToLevel(it?.sell);
}

function relevantSkillForItem(it){
  const tags = new Set(it?.tags || []);
  for (const [tag, skill] of Object.entries(TAG_SKILL)){
    if (tags.has(tag)) return skill || null;
  }
  const g = impliedGate(it?.id);
  return g?.skill || null;
}

function passesSkillGate(itemId, playerLevels){
  const it = ITEMS[baseId(itemId)];
  const eff = effectiveItemLevel(itemId);
  const skill = relevantSkillForItem(it);
  if (!skill) return true;
  const have = Number(playerLevels?.[skill] ?? 0);
  return have >= eff;
}

/* ---------- Eligibility & actions ---------- */
function recipeInputsAllowed(itemId){
  const recs = RECIPES_BY_OUT.get(baseId(itemId));
  if (!recs || !recs.length) return true;
  for (const r of recs){
    for (const inp of (r.inputs||[])){
      const iid = baseId(inp?.id || '');
      if (!iid) continue;
      if (ELIGIBILITY.excludeInputIds.includes(iid)) return false;
      if (iid.endsWith('_rare')) return false;
      const tags = new Set(ITEMS[iid]?.tags || []);
      for (const bad of ELIGIBILITY.excludeInputTags) if (tags.has(bad)) return false;
    }
  }
  return true;
}

function hasDisallowedTagOrId(it){
  const id = String(it?.id || '');
  if (ELIGIBILITY.excludeIds.includes(id)) return true;
  for (const suf of (ELIGIBILITY.excludeSuffix||[])) if (suf && id.endsWith(suf)) return true;
  const tags = new Set(it?.tags || []);
  for (const bad of (ELIGIBILITY.excludeTags||[])) if (tags.has(bad)) return true;
  return false;
}
function hasAllowedTag(it){
  const tags = new Set(it?.tags || []);
  for (const ok of (ELIGIBILITY.allowedAnyTags||[])) if (tags.has(ok)) return true;
  return false;
}
function actionCost(it){
  const a = Number(it?.actions ?? 0);
  return Number.isFinite(a) && a > 0 ? a : 0;
}

/* ---------- Budgets & weighting ---------- */
function perTaskBudget(contractBudget, layout){
  const lo = Math.floor(contractBudget.min * layout.perTaskFracMin);
  const hi = Math.ceil(contractBudget.max * layout.perTaskFracMax);
  return { min: Math.max(1, lo), max: Math.max(1, hi) };
}

function weightFor(it, a, rsLevel, perTaskBudget){
  const tags = new Set(it.tags || []);
  let tagScore = 0;
  for (const [t, w] of Object.entries(WEIGHTING.tagBase || {})) if (tags.has(t)) tagScore += w;
  tagScore = tagScore || 1.0;
  const slope = (rsLevel >= (WEIGHTING.highLevelAt||40)) ? (WEIGHTING.actionSlopeHigh||-0.02) : (WEIGHTING.actionSlopeLow||-0.06);
  const actionPenalty = Math.max(0.1, 1 + slope * a);
  const mid = (perTaskBudget.min + perTaskBudget.max) / 2;
  const tight = Math.abs(a - mid) <= 0.25*mid ? (WEIGHTING.tightFitBonus || 1.25) : 1.0;
  const value = Number(it.sell || 0);
  const cheapNudge = value > 0 ? Math.max(0.8, 1.1 - Math.log10(1 + value) * 0.1) : 1.0;
  return Math.max(0.001, tagScore * actionPenalty * tight * cheapNudge);
}

function qtyForBudget(a, perTaskBudget){
  if (a <= 0) return 0;
  const maxQ = Math.floor(perTaskBudget.max / a);
  const minQ = Math.max(1, Math.floor(perTaskBudget.min / a));
  if (maxQ < 1 || minQ > maxQ) return 0;
  return randInt(minQ, maxQ);
}

/* ---------- Tiered XP & gold ---------- */
function tierMultiplier(level){
  const rows = REWARDS.tierXp || [];
  for (const r of rows){ if (level <= r.to) return r.mult; }
  return rows.length ? rows[rows.length - 1].mult : 1.0;
}

function calcTaskRewards(it, qty){
  const actions = actionCost(it) * qty;
  if (actions <= 0) return { totalActs:0, gold:0, xp:0 };

  const effLv = effectiveItemLevel(it.id);
  const mult  = tierMultiplier(effLv);

  const xp = Math.max(
    1,
    Math.round((REWARDS.xpPerActionBase || 8) * mult * Math.pow(actions, REWARDS.actionsExponent ?? 0.92))
  );

  const goldPerItem = Math.round((Number(it.sell || 0) * (REWARDS.goldFromSellPct ?? 0.5)));
  const gold = Math.max(REWARDS.minGold || 0, goldPerItem * qty);

  return { totalActs: actions, gold, xp };
}

function applySoftCap(xp){
  const cur = state.royalXp || 0;
  const sc = REWARDS.softCap || { pctOfCurrent:0.22, baseAdd:60, minAbs:40, maxAbs:6000 };
  const cap = Math.max(sc.minAbs, Math.min(sc.maxAbs, Math.floor(cur * (sc.pctOfCurrent||0) + (sc.baseAdd||0))));
  return Math.max(10, Math.min(cap, xp));
}
function applyPatronXpMult(xp, patronId){
  const mult = (REWARDS.patronXpMult||{})[patronId];
  return Math.round(xp * (mult || 1));
}

/* ---------- Combat ---------- */
function monsterBandForFavor(favor = 0){
  const f = Math.max(0, favor|0);
  if (f >= 90) return { min: 45, max: 90 };
  if (f >= 80) return { min: 40, max: 80 };
  if (f >= 70) return { min: 35, max: 70 };
  if (f >= 60) return { min: 30, max: 60 };
  if (f >= 50) return { min: 25, max: 50 };
  if (f >= 40) return { min: 20, max: 40 };
  if (f >= 30) return { min: 15, max: 30 };
  if (f >= 20) return { min: 10, max: 20 };
  if (f >= 10) return { min: 5,  max: 15 };
  return            { min: 1,  max: 8  };
}

function actionsPerKillForLevel(monLevel){
  const base  = COMBAT?.actionsPerKillBase ?? 2;
  const slope = COMBAT?.actionsPerKillPerLevel ?? 0;
  const lo    = COMBAT?.actionsPerKillMin ?? 1;
  const hi    = COMBAT?.actionsPerKillMax ?? 8;
  const v = base + slope * (monLevel || 1);
  return Math.max(lo, Math.min(hi, v));
}

/* ---------- Candidate build ---------- */
function poolForPatronTags(patronTags, rsLevel, playerLvls, perTaskBudget){
  const tagsWanted = new Set(patronTags || []);
  const wl = new Set(ELIGIBILITY.whitelistIds || []);
  const capRow = pickByLevel(ITEM_LEVEL_CAPS, rsLevel);
  const maxItemLevel = capRow?.maxItemLevel ?? 10;

  const out = [];
  for (const id in ITEMS){
    const it = ITEMS[id]; if (!it || baseId(it.id) !== id) continue;

    if (wl.has(id)){
      const a = actionCost(it); if (!a) continue;
      if (a > perTaskBudget.max) continue;
      if (!recipeInputsAllowed(id)) continue;
      if (!passesSkillGate(id, playerLvls)) continue;
      if (effectiveItemLevel(id) > maxItemLevel) continue;
      out.push({ id, it, a });
      continue;
    }

    if (hasDisallowedTagOrId(it)) continue;
    if (!hasAllowedTag(it)) continue;

    if (tagsWanted.size){
      const itTags = new Set(it.tags || []);
      let ok = false;
      for (const t of tagsWanted){ if (itTags.has(t)) { ok = true; break; } }
      if (!ok) continue;
    }

    const a = actionCost(it); if (!a) continue;
    if (a > perTaskBudget.max) continue;
    if (!recipeInputsAllowed(id)) continue;
    if (!passesSkillGate(id, playerLvls)) continue;
    if (effectiveItemLevel(id) > maxItemLevel) continue;

    out.push({ id, it, a });
  }
  return out;
}

/* ---------- Helpers to satisfy min task count by inflating qty ---------- */
function inflateTasksToMeetMin(tasks, tasksMin){
  if (!Array.isArray(tasks) || !tasks.length) return tasks;
  if (tasks.length >= tasksMin) return tasks;

  const factor = Math.max(1, Math.ceil(tasksMin / tasks.length));
  for (const t of tasks){
    const cur = t.need ?? t.qty ?? 1;
    const newQty = Math.max(1, cur * factor);
    t.qty = newQty;
    t.need = newQty;
  }
  return tasks;
}

/* ---------- Task builders ---------- */
function buildDeliverTasks(patronTags, rsLevel, playerLvls, contractBudget, layout){
  const want = randInt(layout.tasksMin, layout.tasksMax);
  const ptBudget = perTaskBudget(contractBudget, layout);
  const candidates = poolForPatronTags(patronTags, rsLevel, playerLvls, ptBudget);

  if (!candidates.length) throw new Error('No eligible delivery items for contract.');

  const tasks = [];
  const bag = candidates.slice();
  let guard = 0;

  while (tasks.length < want && bag.length && guard++ < 500){
    const weights = bag.map(c => weightFor(c.it, c.a, rsLevel, ptBudget));
    const sum = weights.reduce((s,w)=>s+w,0) || 1;
    let r = Math.random()*sum, idx = 0;
    for (let i=0;i<bag.length;i++){ r -= weights[i]; if (r <= 0){ idx=i; break; } }
    const pick = bag.splice(idx,1)[0];

    let qty = qtyForBudget(pick.a, ptBudget);
    if (!qty){
      const fallback = Math.max(1, Math.floor(ptBudget.min / Math.max(1,pick.a)));
      qty = fallback;
    }

    tasks.push({
      kind: 'deliver',
      id: pick.id,
      label: ITEMS[pick.id]?.name || pick.id.replace(/[_-]+/g,' '),
      serviceLevel: effectiveItemLevel(pick.id),
      bandMax: rsLevel,
      qty, need: qty, have: 0
    });
  }

  const ensured = inflateTasksToMeetMin(tasks, layout.tasksMin);
  if (!ensured.length) throw new Error('Unable to assemble delivery tasks for contract.');
  return ensured;
}

function buildWardenTasks(rsLevel, layout, favor, contractBudget){
  const band = monsterBandForFavor(favor);
  const want = randInt(layout.tasksMin, layout.tasksMax);

  const cand = (MONSTERS || []).filter(m => {
    const lvl = Number(m?.level ?? m?.lvl ?? m?.combatLevel ?? 1);
    return lvl >= band.min && lvl <= band.max;
  });

  if (!cand.length) throw new Error('No eligible monsters for Warden contract.');

  const ptBudget = perTaskBudget(contractBudget, layout);
  const tasks = [];
  const bag = cand.slice();
  let guard = 0;

  while (tasks.length < want && bag.length && guard++ < 500){
    const idx = Math.floor(Math.random()*bag.length);
    const m = bag.splice(idx,1)[0];
    const lvl = Number(m?.level || 1);
    const perKillActs = actionsPerKillForLevel(lvl);

    const maxQ = Math.max(1, Math.floor(ptBudget.max / perKillActs));
    const minQ = Math.max(1, Math.floor(ptBudget.min / perKillActs));

    if (maxQ < 1 || minQ > maxQ) throw new Error('Invalid per-task budget for Warden contract.');

    const qty = randInt(minQ, maxQ);
    tasks.push({
      kind: 'slay',
      id: m.id || m.name?.toLowerCase().replace(/\s+/g,'_'),
      name: m.name || m.id || 'Monster',
      level: Math.min(lvl, band.max),
      bandMax: band.max,
      qty, need: qty, have: 0
    });
  }

  const ensured = inflateTasksToMeetMin(tasks, layout.tasksMin);
  if (!ensured.length) throw new Error('Unable to assemble Warden tasks for contract.');
  return ensured;
}

/* ---------- Rewards rollup ---------- */
function computeContractRewards(contract){
  let totalXp = 0, totalGold = 0, totalActs = 0;

  for (const t of (contract.tasks||[])){
    if (t.kind === 'deliver'){
      const it = ITEMS[baseId(t.id)];
      const r = calcTaskRewards(it, t.qty ?? t.need ?? 0);
      totalXp += r.xp;
      totalGold += r.gold;
      totalActs += r.totalActs;
    } else {
      const per = (REWARDS.combatXpBase || 4) + (REWARDS.combatXpPerLevel || 1.1) * (t.level||1);
      totalXp += Math.round((t.qty||0) * per);
    }
  }

  totalXp = applySoftCap(applyPatronXpMult(totalXp, contract.patron));
  totalGold = Math.max(REWARDS.minGold||0, Math.round(totalGold));
  return { rewardXp: totalXp, rewardGold: totalGold, totalActions: totalActs };
}

/* ---------- Public API ---------- */
export function patrons(){ return PATRONS.slice(); }

function generateInternal(patron, rsLevel, playerLvls, budget, layout){
  if (patron.kind === 'slay'){
    const tasks = buildWardenTasks(rsLevel, layout, +(state.royalFavor||0), budget);
    const ctr = { id:`ctr_${Date.now()}`, patron: patron.id, tasks };
    const r = computeContractRewards(ctr);
    return { ...ctr, ...r };
  }
  const tasks = buildDeliverTasks(patron.tags, rsLevel, playerLvls, budget, layout);
  const ctr = { id:`ctr_${Date.now()}`, patron: patron.id, tasks };
  const r = computeContractRewards(ctr);
  return { ...ctr, ...r };
}

export function tryOfferContract(){
  if (state.royalContract) return state.royalContract;

  const rsLevel = royalLevel();
  const layout  = pickByLevel(CONTRACT_LAYOUT, rsLevel);
  const budget  = pickByLevel(CONTRACT_BUDGETS, rsLevel);
  const playerLvls = deriveSkillLevelsFromState();

  const available = PATRONS.filter(p => p.kind === 'slay' ? MONSTERS.length > 0 : (p.tags||[]).length > 0);
  const pool = available.length ? available : PATRONS;
  const patron = pool[Math.floor(Math.random()*pool.length)];

  const contract = generateInternal(patron, rsLevel, playerLvls, budget, layout);
  if (!contract) throw new Error('Contract generation failed.');

  state.royalContract = { ...contract, createdAt: Date.now() };
  saveNow();
  try { window.dispatchEvent(new Event('royal:change')); } catch {}
  return state.royalContract;
}

/* ---------- Cooldown / abandon ---------- */
export function getAbandonCooldown(){
  const until = state.royalCooldowns?.abandonAfter || 0;
  const rem = Math.max(0, until - Date.now());
  return { allowed: rem === 0, remainingMs: rem };
}
export function canAbandon(){
  const cool = getAbandonCooldown();
  return { ok: cool.allowed, remainingMs: cool.remainingMs };
}
export function abandonContract(){
  const cool = getAbandonCooldown();
  if (!cool.allowed) return false;
  if (!state.royalContract) return false;

  state.royalHistory = state.royalHistory || [];
  try { state.royalHistory.push({ ...state.royalContract, abandonedAt: Date.now() }); } catch {}
  state.royalContract = null;

  state.royalCooldowns = state.royalCooldowns || {};
  state.royalCooldowns.abandonAfter = Date.now() + (COOLDOWNS.abandonMs || (5*60*1000));

  saveNow();
  try { window.dispatchEvent(new Event('royal:change')); } catch {}
  return true;
}

/* ---------- UI helpers / progress ---------- */
function invQty(id){
  const bid = baseId(id);
  const v = state.inventory?.[bid];
  return typeof v === 'object' ? (v?.qty|0) : (v|0);
}

export function taskProgress(t){
  if (!t) return { have:0, need:0 };
  const need = Math.max(0, t.need ?? t.qty ?? 0);
  const haveLive = (t.have|0) + invQty(t.id);
  return { have: Math.min(need, haveLive), need };
}

export function canTurnInItemTask(t){
  if (!t || t.kind !== 'deliver') return false;
  const remaining = Math.max(0, (t.need|0) - (t.have|0));
  if (remaining <= 0) return false;
  return hasItems(state, [{ id: baseId(t.id), qty: remaining }]);
}

export function turnInItemTask(t){
  if (!canTurnInItemTask(t)) return false;
  const remaining = Math.max(0, (t.need|0) - (t.have|0));
  if (!remaining) return false;
  removeItem(state, baseId(t.id), remaining);
  t.have = t.need;
  t.kind = 'deliver_done';
  saveNow();
  try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
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
  state.gold       = Math.max(0, (state.gold || 0) + (ctr.rewardGold || 0));
  state.royalFavor = (state.royalFavor || 0) + 1;

  const pid = ctr.patron || 'Unknown';
  state.royalStats = state.royalStats || {};
  const ps = (state.royalStats[pid] = state.royalStats[pid] || {});
  ps.completed = (ps.completed || 0) + 1;
  ps.lastCompletedAt = Date.now();

  state.royalHistory = state.royalHistory || [];
  try { state.royalHistory.push({ ...ctr, completedAt: Date.now() }); } catch {}

  state.royalContract = null;
  saveNow();

  try {
    window.dispatchEvent(new Event('skills:change'));
    window.dispatchEvent(new Event('royal:complete'));
    window.dispatchEvent(new Event('favor:update'));
    window.dispatchEvent(new Event('royal:change'));
    window.dispatchEvent(new Event('royal:stats'));
  } catch {}
  return true;
}

/* ---------- Combat progress ---------- */
export function recordWardenKill(monOrId){
  const id = baseId(monOrId?.id || monOrId);
  const ctr = state.royalContract;
  if (!ctr) return false;
  let touched = false;
  for (const t of (ctr.tasks || [])){
    if (t.kind !== 'slay') continue;
    if (baseId(t.id) !== id) continue;
    const need = t.need ?? t.qty ?? 0;
    if ((t.have|0) >= need) continue;
    t.have = (t.have|0) + 1;
    touched = true;
  }
  if (touched){
    saveNow();
    try { window.dispatchEvent(new Event('kills:change')); } catch {}
  }
  return touched;
}

/* ---------- Favor unlocks ---------- */
export function ensureRoyalUnlocks(){
  try {
    const favor = +(state.royalFavor || 0);
    state.unlocks = state.unlocks || {};
    if (favor >= 10) state.unlocks.sort_inventory = true;
    if (favor >= 25) state.unlocks.autobattle = true;
    state.pets = state.pets || {};
    if (favor >= 50 && !state.pets.sterling){
      state.pets.sterling = { id: 'sterling', level: 1, xp: 0, owned: true };
      try { window.dispatchEvent(new CustomEvent('pets:change')); } catch {}
    }
  } catch(e){}
}