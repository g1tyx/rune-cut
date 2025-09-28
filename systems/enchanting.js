// /systems/enchanting.js 
import { ENCHANT_RECIPES } from '../data/enchanting.js';
import { addItem, removeItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { recalcMana } from './mana.js';
import { ITEMS } from '../data/items.js';
import { rollEnchant, canEnchantItem } from '../data/enchant_effects.js';
import { pushEnchantLog } from '../ui/logs.js';

const XP = buildXpTable();
const clampMs = (ms)=> Math.max(300, ms);

const baseIdOf = (id)=> String(id||'').split('@')[0].split('#')[0];

function getRec(id){ return ENCHANT_RECIPES?.[id] || null; }
function lvlOf(state){
  const xp =
    (state && state.enchantXp != null ? state.enchantXp : null) ??
    (state && state.skills && state.skills.enchantXp != null ? state.skills.enchantXp : null) ??
    (state && state.skills && state.skills.enchant != null ? state.skills.enchant : null) ??
    0;
  return levelFromXp(xp, XP);
}
function listInputs(r){
  if (Array.isArray(r?.inputs)) return r.inputs;
  if (r?.cost && typeof r.cost === 'object'){
    return Object.entries(r.cost).map(([id, qty])=>({ id, qty:Number(qty)||1 }));
  }
  return [];
}

// ——— Enchant encoding helpers (rings + tools) ———
const ENCH_RE   = /#e:([a-zA-Z_]+):(\d+)/;     // #e:stat:add
const SWIFT_RE  = /#swift:([0-9.]+)/;          // #swift:0.25

function hasRingEnchant(id=''){ return ENCH_RE.test(String(id)); }
function encodeRingEnchant(baseId, stat, add){ return `${baseId}#e:${stat}:${add}`; }

// from recipe id like "enchant_sapphire_ring" -> "sapphire_ring"
function ringBaseFromRecipeId(recId=''){
  const m = String(recId).match(/^enchant_(.+_ring)$/);
  return m ? m[1] : null;
}

// pick a valid equipped target based on r.apply
function findApplyTarget(state, r){
  const ap = r?.apply; if (!ap) return null;
  const slots = Array.isArray(ap.targetSlots) ? ap.targetSlots : [];
  const blockRe = ap.blockTagRegex ? new RegExp(ap.blockTagRegex, 'i') : null;

  for (const slot of slots){
    const id = state.equipment?.[slot];
    if (!id) continue;

    if (blockRe && blockRe.test(String(id))) continue;

    const base = baseIdOf(id);
    const def  = ITEMS[base]; if (!def) continue;

    if (ap.requireStat && !def[ap.requireStat]) continue;

    if (ap.mode === 'ring_enchant'){
      // 1) must be a ring matching the recipe’s ring type
      const needBase = ringBaseFromRecipeId(r.id);
      if (!needBase || base !== needBase) continue;
      // 2) ring cannot already be enchanted
      if (hasRingEnchant(id)) continue;
    } else if (ap.mode === 'tool_swiftness'){
      // tools must have speed
      if (!def.speed) continue;
    }

    return { slot, id, base };
  }
  return null;
}

export function canEnchant(state, id){
  const r = getRec(id); 
  if (!r) return false;

  const needLevel = (r.level != null ? r.level : (r.lvl != null ? r.lvl : 1));
  if (lvlOf(state) < needLevel) return false;

  const curMana = Number((state && state.manaCurrent) || 0);
  const needMana = Number(r.mana || 0);
  if (curMana < needMana) return false;

  const inv = (state && state.inventory) ? state.inventory : {};
  const ins = listInputs(r);
  const okInputs = ins.every(inp => Number(inv[inp.id] || 0) >= Number(inp.qty || 0));
  if (!okInputs) return false;

  if (r.apply){
    const tgt = findApplyTarget(state, r);
    if (!tgt) return false;
  }

  return true;
}

export function startEnchant(state, id, onDone){
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

  // Spend inputs & mana
  listInputs(r).forEach(inp => removeItem(state, inp.id, inp.qty));
  state.manaCurrent = Math.max(0, (state.manaCurrent||0) - (r.mana||0));

  let appliedTo = null;

  if (r.apply){
    const ap  = r.apply;
    const tgt = findApplyTarget(state, r);
    if (tgt){
      if (ap.mode === 'ring_enchant'){ // bind to equipped ring id
        // safety: hard fail if already enchanted (should be caught earlier)
        if (hasRingEnchant(state.equipment[tgt.slot])) {
          state.action = null; return null;
        }

        // roll using the ring base (sapphire_ring, etc.)
        const roll = rollEnchant(state, tgt.base);
        if (roll.effects?.length){
          const stat = roll.stat;
          const add  = roll.add;

          // encode directly onto the item id (bound to item)
          state.equipment[tgt.slot] = encodeRingEnchant(tgt.base, stat, add);

          const ringName = ITEMS[tgt.base]?.name || tgt.base;
          pushEnchantLog(`Enchanted ${ringName} → ✨ +${add} ${stat} (${roll.tierKey})`);

          appliedTo = { slot: tgt.slot, itemId: tgt.base, encoded: state.equipment[tgt.slot], tier: roll.tierKey, stat, add };
        }
      } else {
        // Legacy tag-apply path (e.g., Swiftness via legacy)
        const tag = String(ap.addTag || 'swift1');
        const curId  = String(tgt.id);
        const newId  = /#/.test(curId) ? `${curId}` : `${curId}#${tag}`;
        state.equipment[tgt.slot] = newId;
        appliedTo = { slot: tgt.slot, oldId: curId, newId, effectKey: ap.uniqueKey || 'swift' };
      }
    }
  } else {
    // normal outputs path
    (r.outputs||[]).forEach(out => addItem(state, out.id, out.qty));
  }

  // XP & mana scaling after craft
  if (r?.xp?.skill === 'enchant' && r?.xp?.amount){
    state.enchantXp = (state.enchantXp||0) + r.xp.amount;
    recalcMana(state);
  }

  // Notify UIs so recipe enablement and equipment slot refresh without a page reload
  try { window.dispatchEvent(new Event('equipment:change')); } catch {}
  try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
  try { window.dispatchEvent(new Event('mana:change')); } catch {}
  try { window.dispatchEvent(new Event('effects:tick')); } catch {}

  state.action = null;
  return { id: r.id, name: r.name, outputs: r.outputs || [], appliedTo };
}

