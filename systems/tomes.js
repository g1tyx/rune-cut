// /systems/tomes.js
import { addItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { TREES } from '../data/woodcutting.js';
import { ITEMS } from '../data/items.js';

const XP = buildXpTable();

/* -------------------- helpers -------------------- */
const clampMs = (ms)=> Math.max(250, ms);
const speedFromLevel = (lvl)=> 1 + 0.03*(lvl-1);  // same curve as manual

// award to your existing short-key pools
function addSkillXp(state, skillKey, amt){
  if (!amt) return;
  if (skillKey === 'wc')       state.wcXp    = (state.wcXp||0)    + amt;
  else if (skillKey === 'fish')state.fishXp  = (state.fishXp||0)  + amt;
  else if (skillKey === 'min') state.minXp   = (state.minXp||0)   + amt;
  else if (skillKey === 'smith')state.smithXp= (state.smithXp||0) + amt;
  else if (skillKey === 'craft')state.craftXp= (state.craftXp||0) + amt;
  else if (skillKey === 'cook') state.cookXp = (state.cookXp||0)  + amt;
  else if (skillKey === 'atk')  state.atkXp  = (state.atkXp||0)   + amt;
  else if (skillKey === 'str')  state.strXp  = (state.strXp||0)   + amt;
  else if (skillKey === 'def')  state.defXp  = (state.defXp||0)   + amt;
  else if (skillKey === 'enchant') state.enchantXp = (state.enchantXp||0) + amt;
}

// equipment speed lookups (match your manual panels)
function axeSpeedFromState(state){
  const id = state.equipment?.axe;
  return (id && ITEMS[id]?.speed) || 1;
}
function rodSpeedFromState(state){
  const id = state.equipment?.rod;
  return (id && ITEMS[id]?.speed) || 1;
}
function pickSpeedFromState(state){
  const id = state.equipment?.pick;
  return (id && ITEMS[id]?.speed) || 1;
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
// Keep resolvers tiny: compute dropId, xpPer, tickMs using the same inputs as manual.
const RESOLVERS = {
  forestry(state, _baseId, meta){
    const wcLvl  = levelFromXp(state.wcXp||0, XP);
    const treeId = meta?.resourceId || meta?.sourceId || 'oak';
    const tree   = TREES.find(t=>t.id===treeId) || TREES.find(t=>t.id==='oak') || { baseTime:3000, drop:'log_oak', xp:5 };
    const dropId = meta?.dropId || tree.drop || 'log_oak';
    const baseMs = tree.baseTime || 3000; // identical to manual woodcutting
    const tickMs = clampMs(baseMs / (axeSpeedFromState(state) * speedFromLevel(wcLvl)));
    const xpPer  = Number.isFinite(meta?.xpPer) ? meta.xpPer : (itemXp(dropId) || tree.xp || 0);
    return { activity:'forestry', xpSkill:XP_KEYS.forestry, sourceId:treeId, dropId, xpPer, tickMs };
  },

  fishing(state, _baseId, meta){
    const fishLvl = levelFromXp(state.fishXp||0, XP);
    const dropId  = meta?.dropId || meta?.resourceId || 'raw_shrimps';
    // Use item base time if provided so it matches your panel; else sensible default
    const baseMs  = itemBaseMs(dropId, 2800);
    const tickMs  = clampMs(baseMs / (rodSpeedFromState(state) * speedFromLevel(fishLvl)));
    const xpPer   = Number.isFinite(meta?.xpPer) ? meta.xpPer : (itemXp(dropId) || 4);
    return { activity:'fishing', xpSkill:XP_KEYS.fishing, sourceId:meta?.sourceId||'shore', dropId, xpPer, tickMs };
  },

  mining(state, _baseId, meta){
    const minLvl = levelFromXp(state.minXp||0, XP);
    const dropId = meta?.dropId || meta?.resourceId || 'ore_copper';
    const baseMs = itemBaseMs(dropId, 3200);
    const tickMs = clampMs(baseMs / (pickSpeedFromState(state) * speedFromLevel(minLvl)));
    const xpPer  = Number.isFinite(meta?.xpPer) ? meta.xpPer : (itemXp(dropId) || 5);
    return { activity:'mining', xpSkill:XP_KEYS.mining, sourceId:meta?.sourceId||'copper', dropId, xpPer, tickMs };
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

    // --- Tome run (unchanged) ---
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

    // --- AFK auto run (NEW) ---
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
  const resolver = RESOLVERS[skill] || RESOLVERS.forestry;
  const spec = resolver(state, base, meta);

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
  ensureLoop(state);
  const equipped = state.equipment?.tome;
  if (equipped && !state.activeTome){
    startTomeRun(state, equipped);
  }
}

export function stopTomeRun(state){
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
      const treeId = resourceId || 'oak';
      const tree   = TREES.find(t=>t.id===treeId) || TREES.find(t=>t.id==='oak') || { baseTime:3000, drop:'log_oak', xp:5 };
      const dropId = tree.drop || 'log_oak';
      const xpPer  = tree.xp|0; // logs don’t have xp on the item; use tree.xp
      const tickMs = clampMs((tree.baseTime||3000) / ((state.equipment?.axe && ITEMS[state.equipment.axe]?.speed)||1 * (1+0.03*(levelFromXp(state.wcXp||0, XP)-1))));
      return { activity:'wc', xpSkill:'wc', sourceId:treeId, dropId, xpPer, tickMs };
    }
  
    if (s === 'fishing'){
      const fishLvl = levelFromXp(state.fishXp||0, XP);
      const dropId  = resourceId || 'raw_shrimps';
      const baseMs  = itemBaseMs(dropId, 2800);
      const rodSpd  = (state.equipment?.fishing && ITEMS[state.equipment.fishing]?.speed) || (state.equipment?.rod && ITEMS[state.equipment.rod]?.speed) || 1;
      const tickMs  = clampMs(baseMs / (rodSpd * (1+0.03*(fishLvl-1))));
      const xpPer   = itemXp(dropId) || 4;
      return { activity:'fish', xpSkill:'fish', sourceId:'shore', dropId, xpPer, tickMs };
    }
  
    // mining
    const minLvl = levelFromXp(state.minXp||0, XP);
    const dropId = resourceId || 'ore_copper';
    const baseMs = itemBaseMs(dropId, 3200);
    const pickSp = (state.equipment?.pick && ITEMS[state.equipment.pick]?.speed) || 1;
    const tickMs = clampMs(baseMs / (pickSp * (1+0.03*(minLvl-1))));
    const xpPer  = itemXp(dropId) || 5;
    return { activity:'min', xpSkill:'min', sourceId:'copper', dropId, xpPer, tickMs };
  }

  export function startAutoRun(state, { skill, resourceId }){
    if (state.activeAuto) return false;
    const spec = resolveAutoSpec(state, { skill, resourceId });
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
  
