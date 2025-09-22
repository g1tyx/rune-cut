// /systems/woodcutting.js
import { TREES } from '../data/woodcutting.js';
import { ITEMS } from '../data/items.js';
import { addItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';

const XP_TABLE = buildXpTable();
const speedFromLevel = (lvl)=> 1 + 0.03*(lvl-1);  // +3% per Woodcutting level
const clampMs = (ms)=> Math.max(100, ms);         // floor so actions aren’t instant
export const FOREST_ESSENCE_ID = 'forest_essence';

/* ----------- swiftness / equipment mod helper ----------- */
const modSpeed = (state, slot) => {
  const m = state?.equipmentMods?.[slot] || {};
  if (typeof m.swift === 'object') return Number(m.swift.addSpeed || 0);   // new shape
  return Number(m.speedBonus || 0);                                        // legacy shape
};

/* ---------------- helpers ---------------- */
export function listTrees(_state){
  return TREES;
}

function resolveTree(state, treeOrId){
  if (!treeOrId) {
    return TREES.find(t => t.id === state.selectedTreeId) || TREES[0] || null;
  }
  if (typeof treeOrId === 'string') {
    return TREES.find(t => t.id === treeOrId) || null;
  }
  if (treeOrId && treeOrId.id) {
    return TREES.find(t => t.id === treeOrId.id) || treeOrId;
  }
  return null;
}

function requiredLevel(tree){
  return tree.level || 1;
}

function axeSpeedFromState(state){
  const axeId = state.equipment?.axe;
  const base = axeId ? String(axeId).split('@')[0] : '';
  const def = base ? ITEMS[base] : null;
  const baseSpeed = (def?.speed) || 1;
  return baseSpeed + modSpeed(state, 'axe');
}

/* ---------------- ui-facing api ---------------- */
export function canChop(state, treeOrId){
  //if (state.action) return false; // busy
  const t = resolveTree(state, treeOrId);
  if (!t) return false;

  const wcLvl = levelFromXp(state.wcXp || 0, XP_TABLE);
  if (wcLvl < requiredLevel(t)) return false;

  return true;
}

export function startChop(state, treeOrId, onDone){
  const t = resolveTree(state, treeOrId);
  if (!t || !canChop(state, t)) return false;

  const wcLvl    = levelFromXp(state.wcXp || 0, XP_TABLE);
  const axeSpd   = axeSpeedFromState(state);
  const baseTime = t.baseTime || 2000;
  const dur      = clampMs(baseTime / (axeSpd * speedFromLevel(wcLvl)));
  const now      = performance.now();

  state.selectedTreeId = t.id;

  state.action = {
    type: 'chop',
    label: `Chop ${t.name || t.id}`,
    startedAt: now,
    endsAt: now + dur,
    duration: dur,
    treeId: t.id
  };

  setTimeout(()=>{
    if (state.action?.type === 'chop' && state.action?.treeId === t.id){
      onDone?.();
    }
  }, dur);

  return true;
}

export function finishChop(state, treeOrId){
  const t = resolveTree(state, treeOrId) || TREES.find(x => x.id === state.action?.treeId);
  if (!t){ state.action = null; return 0; }
  addItem(state, t.drop, 1);
  const bonuses = [];
  const list = Array.isArray(t.bonusDrops) ? t.bonusDrops : [];
  for (const b of list){
    const chance = Number(b?.chance ?? 0);
    if (chance > 0 && Math.random() < chance){
      const qty = Math.max(1, (b?.qty|0) || 1);
      addItem(state, b.id, qty);
      bonuses.push({ id: b.id, qty });
    }
  }
  const essence = Math.random() < 0.10;
  if (essence) addItem(state, FOREST_ESSENCE_ID, 1);
  state.wcXp = (state.wcXp || 0) + (t.xp || 0);
  state.action = null;

  return { qty: 1, essence, bonuses };
}
