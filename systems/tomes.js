// /systems/tomes.js
import { addItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { TREES } from '../data/woodcutting.js';
import { ROCKS } from '../data/mining.js';
import { ITEMS } from '../data/items.js';

const XP = buildXpTable();

/* -------------------- helpers -------------------- */
const clampMs = (ms)=> Math.max(250, ms);
const speedFromLevel = (lvl)=> 1 + 0.03*(lvl-1);  // same curve as manual

// award to your existing short-key pools
function addSkillXp(state, skillKey, amt){
  if (!amt) return;
  if (skillKey === 'wc')        state.wcXp     = (state.wcXp||0)     + amt;
  else if (skillKey === 'fish') state.fishXp   = (state.fishXp||0)   + amt;
  else if (skillKey === 'min')  state.minXp    = (state.minXp||0)    + amt;
  else if (skillKey === 'smith')state.smithXp  = (state.smithXp||0)  + amt;
  else if (skillKey === 'craft')state.craftXp  = (state.craftXp||0)  + amt;
  else if (skillKey === 'cook') state.cookXp   = (state.cookXp||0)   + amt;
  else if (skillKey === 'atk')  state.atkXp    = (state.atkXp||0)    + amt;
  else if (skillKey === 'str')  state.strXp    = (state.strXp||0)    + amt;
  else if (skillKey === 'def')  state.defXp    = (state.defXp||0)    + amt;
  else if (skillKey === 'enchant') state.enchantXp = (state.enchantXp||0) + amt;
}

// equipment speed lookups (match your manual panels)
function axeSpeedFromState(state){
  const id = state.equipment?.axe;
  const base = id ? String(id).split('@')[0] : null;
  return (base && ITEMS[base]?.speed) || 1;
}
function rodSpeedFromState(state){
  // your fishing tools use slot 'fishing'
  const id = state.equipment?.fishing;
  const base = id ? String(id).split('@')[0] : null;
  return (base && ITEMS[base]?.speed) || 1;
}
function pickSpeedFromState(state){
  const id = state.equipment?.pick;
  const base = id ? String(id).split('@')[0] : null;
  return (base && ITEMS[base]?.speed) || 1;
}

const itemXp = (id) => {
  const base = String(id||'').split('@')[0];
  const xp = ITEMS?.[base]?.xp;
  return Number.isFinite(xp) ? xp : 0;
};

const itemBaseMs = (id, fallbackMs) => {
  const base = String(id||'').split('@')[0];
  const it = ITEMS?.[base];
  if (!it) return fallbackMs;
  if (Number.isFinite(it.baseMs))  return it.baseMs;
  if (Number.isFinite(it.baseSec)) return it.baseSec * 1000;
  return fallbackMs;
};

// map tome.skill → your XP pool key
const XP_KEYS = { forestry:'wc', fishing:'fish', mining:'min' };

/* -------------------- resolvers -------------------- */
// Forestry: treat resourceId as a *log id* (e.g., 'log_pine'), then find the tree by drop.
// No silent fallback to oak.
const RESOLVERS = {
  forestry(state, _baseId, meta){
    const wcLvl  = levelFromXp(state.wcXp||0, XP);
    const logId  = meta?.resourceId; // expected: 'log_*'
    if (!logId || !/^log_/.test(logId)) return null;

    const tree = TREES.find(t => t.drop === logId) || null;
    if (!tree) return null; // unknown log → do not run

    const dropId = logId;
    const baseMs = tree.baseTime || 3000;
    const tickMs = clampMs(baseMs / (axeSpeedFromState(state) * speedFromLevel(wcLvl)));
    const xpPer  = Number.isFinite(meta?.xpPer) ? meta.xpPer : (itemXp(dropId) || tree.xp || 0);
    return { activity:'forestry', xpSkill:XP_KEYS.forestry, sourceId:tree.id, dropId, xpPer, tickMs };
  },

  fishing(state, _baseId, meta){
    const fishLvl = levelFromXp(state.fishXp||0, XP);
    const dropId  = meta?.resourceId; // expected: e.g., 'raw_trout'
    if (!dropId) return null;

    const baseMs  = itemBaseMs(dropId, 2800);
    const tickMs  = clampMs(baseMs / (rodSpeedFromState(state) * speedFromLevel(fishLvl)));
    const xpPer   = Number.isFinite(meta?.xpPer) ? meta.xpPer : (itemXp(dropId) || 4);
    return { activity:'fishing', xpSkill:XP_KEYS.fishing, sourceId:meta?.sourceId||'shore', dropId, xpPer, tickMs };
  },

  mining(state, _baseId, meta){
    const minLvl = levelFromXp(state.minXp||0, XP);
    const dropId = meta?.resourceId;
    if (!dropId) return null;

    const rock   = ROCKS.find(r => r.drop === dropId) || null;
    const baseMs = (rock?.baseTime ?? itemBaseMs(dropId, 3200));
    const tickMs = clampMs(baseMs / (pickSpeedFromState(state) * speedFromLevel(minLvl)));
    const xpPer  = Number.isFinite(meta?.xpPer) ? meta.xpPer : (rock?.xp ?? itemXp(dropId) ?? 5);
    return { activity:'mining', xpSkill:XP_KEYS.mining, sourceId:rock?.id || meta?.sourceId || 'copper', dropId, xpPer, tickMs };
  },
};

/* -------------------- duration -------------------- */
// Duration scales with Enchanting unless explicitly overridden in item meta
export function tomeDurationMsFor(state, itemId){
  const base = String(itemId).split('@')[0];
  const meta = ITEMS?.[base]?.tome || {};
  const minS = (meta.minSeconds ?? meta.baseSec ?? 15);
  const maxS = (meta.maxSeconds ?? meta.maxSec ?? 30);
  const lvl  = levelFromXp(state.enchantXp||0, XP);
  const frac = Math.min(1, Math.max(0, lvl/99));
  return (minS + (maxS - minS)*frac) * 1000;
}

/* -------------------- engine loop -------------------- */
export function isTomeActive(state){ return !!state.activeTome; }
export function tomeRemainingMs(state){
  const t = state.activeTome;
  return t ? Math.max(0, t.endsAt - performance.now()) : 0;
}

let TICK = null;
function ensureLoop(state){
  if (TICK) return;
  TICK = setInterval(()=>{
    const now = performance.now();

    // --- Tome run ---
    const t = state.activeTome;
    if (t){
      while (now >= t.nextTickAt && now < t.endsAt){
        addItem(state, t.dropId, 1);
        addSkillXp(state, t.xpSkill, t.xpPer);
        t.nextTickAt += t.tickMs;
        try { window.dispatchEvent(new CustomEvent('tome:tick', { detail:{ id:t.id, dropId:t.dropId, skill:t.xpSkill, xp:t.xpPer } })); } catch {}
      }
      if (now >= t.endsAt){
        state.activeTome = null;
        if (state.equipment?.tome){
          const eqId = state.equipment.tome;
          const n = Math.max(1, state.equipment.tomeQty|0);
          const left = Math.max(0, n - 1);
          if (left > 0){
            state.equipment.tomeQty = left;
            startTomeRun(state, eqId);
            try { window.dispatchEvent(new CustomEvent('tome:stack', { detail:{ qty:left } })); } catch {}
          } else {
            state.equipment.tome = null;
            delete state.equipment.tomeQty;
            try { window.dispatchEvent(new CustomEvent('tome:empty')); } catch {}
          }
        }
        try { window.dispatchEvent(new CustomEvent('tome:end')); } catch {}
      }
    }

    // --- AFK auto run (kept from your original) ---
    const a = state.activeAuto;
    if (a){
      while (now >= a.nextTickAt && now < a.endsAt){
        addItem(state, a.dropId, 1);
        addSkillXp(state, a.xpSkill, a.xpPer);
        a.nextTickAt += a.tickMs;
        try { window.dispatchEvent(new CustomEvent('auto:tick', { detail:{ id:a.id, dropId:a.dropId, skill:a.xpSkill, xp:a.xpPer } })); } catch {}
      }
      if (now >= a.endsAt){
        state.activeAuto = null;
        try { window.dispatchEvent(new CustomEvent('auto:end')); } catch {}
      }
    }
  }, 250);
}

/* -------------------- control -------------------- */
export function startTomeRun(state, tomeId){
  if (state.activeTome) return false;

  const base = String(tomeId).split('@')[0];
  const meta = ITEMS?.[base]?.tome || {};

  // Route by tome.skill directly (forestry | fishing | mining)
  const skill = String(meta.skill || 'forestry').toLowerCase().trim();
  const resolver = RESOLVERS[skill];
  const spec = resolver ? resolver(state, base, meta) : null;
  if (!spec || !spec.dropId) return false; // strict: do not run without a valid target

  const now = performance.now();
  const dur = tomeDurationMsFor(state, tomeId);

  state.activeTome = {
    id: base,
    activity: spec.activity,
    xpSkill:  spec.xpSkill,      // 'wc' | 'fish' | 'min' (matches your XP pools)
    sourceId: spec.sourceId,
    dropId:   spec.dropId,
    xpPer:    spec.xpPer|0,
    tickMs:   spec.tickMs,
    startedAt: now,
    endsAt:    now + dur,
    nextTickAt:now + spec.tickMs,
  };

  ensureLoop(state);
  return true;
}

export function ensureTomeEngine(state){
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (state && state._tomeDisabledUntil && now < state._tomeDisabledUntil) {
    return true;
  }

  ensureLoop(state);
  const equipped = state.equipment?.tome;
  if (equipped && !state.activeTome){
    startTomeRun(state, equipped);
  }
}

export function stopTomeRun(state){
  // mark that 1 tome should be consumed if the player unequips now
  state._tomeConsumeOnUnequip = true;

  // briefly prevent auto-restart during the unequip click
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  state._tomeDisabledUntil = now + 800; // 0.8s guard

  state.activeTome = null;
}
/* ------------- AFK Logic ------------------- */
// ----- AFK helpers -----
export function afkTimeMs(state){ return Math.max(1000, state.afkTimeMs|0 || 30000); } // default 30s
export function setAfkTimeMs(state, ms){ state.afkTimeMs = Math.max(1000, ms|0); }

function resolveAutoSpec(state, { skill, resourceId }){
  const s = String(skill||'forestry').toLowerCase();
  if (s === 'forestry'){
    const wcLvl  = levelFromXp(state.wcXp||0, XP);
    const logId  = resourceId;
    if (!logId || !/^log_/.test(logId)) return null;
    const tree   = TREES.find(t=>t.drop === logId) || null;
    if (!tree) return null;
    const dropId = logId;
    const tickMs = clampMs((tree.baseTime||3000) / (axeSpeedFromState(state) * speedFromLevel(wcLvl)));
    const xpPer  = tree.xp|0;
    return { activity:'wc', xpSkill:'wc', sourceId:tree.id, dropId, xpPer, tickMs };
  }
  if (s === 'fishing'){
    const fishLvl = levelFromXp(state.fishXp||0, XP);
    const dropId  = resourceId;
    if (!dropId) return null;
    const baseMs  = itemBaseMs(dropId, 2800);
    const tickMs  = clampMs(baseMs / (rodSpeedFromState(state) * speedFromLevel(fishLvl)));
    const xpPer   = itemXp(dropId) || 4;
    return { activity:'fish', xpSkill:'fish', sourceId:'shore', dropId, xpPer, tickMs };
  }
  // mining
  const minLvl = levelFromXp(state.minXp||0, XP);
  const dropId = resourceId;
  if (!dropId) return null;
  const baseMs = itemBaseMs(dropId, 3200);
  const tickMs = clampMs(baseMs / (pickSpeedFromState(state) * speedFromLevel(minLvl)));
  const xpPer  = itemXp(dropId) || 5;
  return { activity:'min', xpSkill:'min', sourceId:'copper', dropId, xpPer, tickMs };
}

export function startAutoRun(state, { skill, resourceId }){
  if (state.activeAuto) return false;
  const spec = resolveAutoSpec(state, { skill, resourceId });
  if (!spec) return false;
  const now  = performance.now();
  const dur  = afkTimeMs(state);

  state.activeAuto = {
    kind: 'auto',
    id: `${skill}:${resourceId||''}`,
    activity: spec.activity,
    xpSkill:  spec.xpSkill,   // 'wc' | 'fish' | 'min'
    sourceId: spec.sourceId,
    dropId:   spec.dropId,
    xpPer:    spec.xpPer|0,
    tickMs:   spec.tickMs,
    startedAt: now,
    endsAt:    now + dur,
    nextTickAt:now + spec.tickMs,
  };

  try { window.dispatchEvent(new CustomEvent('auto:start', { detail:{ id:state.activeAuto.id, endsAt:state.activeAuto.endsAt } })); } catch{}

  ensureLoop(state);
  return true;
}

export function stopAutoRun(state){
  if (state.activeAuto){
    state.activeAuto = null;
    try { window.dispatchEvent(new CustomEvent('auto:end')); } catch{}
  }
}
