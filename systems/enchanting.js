import { ENCHANT_RECIPES } from '../data/enchanting.js';
import { addItem, removeItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { recalcMana } from './mana.js';
import { ITEMS } from '../data/items.js'; // ⬅️ new

const XP = buildXpTable();
const clampMs = (ms)=> Math.max(300, ms);

function getRec(id){ return ENCHANT_RECIPES?.[id] || null; }
function lvlOf(state){ return levelFromXp(state.enchantXp||0, XP); }

// normalize r.inputs (array) and also allow r.cost-style objects (just in case)
function listInputs(r){
  if (Array.isArray(r?.inputs)) return r.inputs;
  if (r?.cost && typeof r.cost === 'object'){
    return Object.entries(r.cost).map(([id, qty])=>({ id, qty:Number(qty)||1 }));
  }
  return [];
}

// pick a valid equipped target based on r.apply
function findApplyTarget(state, r){
  const ap = r?.apply; if (!ap) return null;
  const slots = Array.isArray(ap.targetSlots) ? ap.targetSlots : [];
  for (const slot of slots){
    const id = state.equipment?.[slot];
    if (!id) continue;

    // already has a swift tag? block reapply
    if (/#swift/i.test(String(id))) continue;

    // must have requireStat (e.g., speed) in base item
    const base = String(id).split('@')[0].split('#')[0];
    const def  = ITEMS[base];
    if (!def) continue;
    if (ap.requireStat && !def[ap.requireStat]) continue;

    return { slot, id, base };
  }
  return null;
}

export function canEnchant(state, id){
  const r = getRec(id); if(!r) return false;

  // level gate (support level or lvl)
  const need = (r.level ?? r.lvl ?? 1);
  if ((lvlOf(state)) < need) return false;

  // mana gate
  if ((state.manaCurrent||0) < (r.mana||0)) return false;

  // inputs gate
  const ins = listInputs(r);
  const okInputs = ins.every(inp => (state.inventory[inp.id]||0) >= inp.qty);
  if (!okInputs) return false;

  // apply-to-tool gate (if applicable)
  if (r.apply){
    const tgt = findApplyTarget(state, r);
    if (!tgt) return false; // nothing valid equipped OR already has #swift
  }

  return true;
}

export function startEnchant(state, id, onDone){
  //if (state.action) return false;
  const r = getRec(id); if(!r) return false;
  if (!canEnchant(state, id)) return false;

  const dur = clampMs(r.time || 500);
  const now = performance.now();

  state.action = {
    type: 'enchant',
    key: id,
    label: `Enchant ${r.name || id}`,
    startedAt: now,
    endsAt: now + dur,
    duration: dur
  };

  setTimeout(()=>{
    if (state.action?.type === 'enchant' && state.action?.key === id){
      onDone?.();
    }
  }, dur);

  return true;
}

export function finishEnchant(state, id){
  const r = getRec(id) || getRec(state.action?.key);
  if (!r){ state.action = null; return null; }
  if (!canEnchant(state, r.id)){ state.action = null; return null; }

  // Spend inputs
  listInputs(r).forEach(inp => removeItem(state, inp.id, inp.qty));

  // Spend mana
  state.manaCurrent = Math.max(0, (state.manaCurrent||0) - (r.mana||0));

  let appliedTo = null;

  if (r.apply){
    // apply-to-tool path (no outputs)
    const ap  = r.apply;
    const tgt = findApplyTarget(state, r);
    if (tgt){
      const tag = String(ap.addTag || 'swift1');
      const curId  = String(tgt.id);
      const newId  = /#/.test(curId) ? `${curId}` : `${curId}#${tag}`;
      state.equipment[tgt.slot] = newId;
      appliedTo = { slot: tgt.slot, oldId: curId, newId, effectKey: ap.uniqueKey || 'swift' };
    }
  } else {
    // normal outputs path
    (r.outputs||[]).forEach(out => addItem(state, out.id, out.qty));
  }

  // XP (only once)
  if (r?.xp?.skill === 'enchant' && r?.xp?.amount){
    state.enchantXp = (state.enchantXp||0) + r.xp.amount;
    recalcMana(state);
  }

  state.action = null;
  return { id: r.id, name: r.name, outputs: r.outputs || [], appliedTo };
}
