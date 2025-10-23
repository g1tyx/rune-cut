// /systems/enchanting.js 
import { ENCHANT_RECIPES } from '../data/enchanting.js';
import { addItem, removeItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { recalcMana, spendMana } from './mana.js';
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
const ENCH_RE   = /#e:([a-zA-Z_]+):(\d+)/g;     // ring enchant encoder (global for multiple matches)
const SINGLE_ENCH_RE = /#e:([a-zA-Z_]+):(\d+)/; // non-global for single match
const SWIFT_RE  = /#swift:([0-9.]+)/;          // #swift:0.25

function hasRingEnchant(id=''){ return SINGLE_ENCH_RE.test(String(id)); }
function encodeRingEnchant(baseId, stat, add){ return `${baseId}#e:${stat}:${add}`; }

// Count how many enchants are on a jewelry item
function countEnchants(id=''){
  const str = String(id);
  const matches = [...str.matchAll(ENCH_RE)];
  return matches.length;
}

// Get all enchantments from an item
function getEnchants(id=''){
  const enchants = [];
  const str = String(id);
  const matches = [...str.matchAll(ENCH_RE)];
  for (const m of matches){
    enchants.push({ stat: m[1], value: parseInt(m[2], 10) });
  }
  return enchants;
}

// Add a second enchant to jewelry (removes weakest if already has 2)
function addSecondEnchant(currentId, stat, add){
  const existing = getEnchants(currentId);
  const base = baseIdOf(currentId);
  
  if (existing.length === 0){
    // No enchants yet - add first one
    return `${base}#e:${stat}:${add}`;
  } else if (existing.length === 1){
    // One enchant - add second
    return `${currentId}#e:${stat}:${add}`;
  } else {
    // Two enchants - remove the weaker one and add new one
    const sorted = [...existing].sort((a, b) => a.value - b.value);
    const keepEnchant = sorted[1]; // Keep the stronger one
    return `${base}#e:${keepEnchant.stat}:${keepEnchant.value}#e:${stat}:${add}`;
  }
}

// from recipe id like "enchant_sapphire_ring" -> "sapphire_ring" or "enchant_ruby_amulet" -> "ruby_amulet"
function jewelryBaseFromRecipeId(recId=''){
  const m = String(recId).match(/^enchant_(.+(?:_ring|_amulet))$/);
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
      // 1) must be jewelry (ring/amulet) matching the recipe's type
      const needBase = jewelryBaseFromRecipeId(r.id);
      if (!needBase) continue;
      
      // For amulets, accept both silver and gold versions
      if (needBase.includes('amulet')) {
        const gemType = needBase.replace('_amulet', ''); // e.g., "sapphire", "ruby"
        const isMatch = base === `silver_${gemType}_amulet` || base === `gold_${gemType}_amulet`;
        if (!isMatch) continue;
      } else {
        // For rings, require exact match
        if (base !== needBase) continue;
      }
      
      // 2) jewelry cannot already be enchanted
      if (hasRingEnchant(id)) continue;
    } else if (ap.mode === 'dual_enchant'){
      // For dual enchanting: must be jewelry AND already have at least one enchant
      if (slot !== 'ring' && slot !== 'amulet') continue;
      if (!hasRingEnchant(id)) continue;
    } else if (ap.mode === 'tool_swiftness'){
      if (!def.speed) continue; // tools must have speed
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

  // Consume inputs immediately
  listInputs(r).forEach(inp => removeItem(state, inp.id, inp.qty));

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

export function stopEnchant(state){
  const key = state.action?.key;
  const r = getRec(key);
  if (r && r.inputs && r.inputs.length){
    // Return all input items
    const itemsToReturn = listInputs(r).filter(x=>x.qty>0);
    if (itemsToReturn.length){
      itemsToReturn.forEach(item => addItem(state, item.id, item.qty));
    }
  }
  state.action = null;
  return true;
}

export function finishEnchant(state, id){
  const r = getRec(id) || getRec(state.action?.key);
  if (!r){ state.action = null; return null; }

  // Spend mana via API (authoritative path)
  const needMana = Math.max(0, Number(r.mana) || 0);
  if (needMana > 0){
    const ok = spendMana(state, needMana); // notifies if changed
    if (!ok){
      // Can't revert inputs - they were spent on start
      state.action = null;
      return null;
    }
  }

  let appliedTo = null;

  if (r.apply){
    const ap  = r.apply;
    const tgt = findApplyTarget(state, r);
    if (tgt){
      if (ap.mode === 'ring_enchant'){ // bind to equipped jewelry id
        if (hasRingEnchant(state.equipment[tgt.slot])) { state.action = null; return null; }

        const roll = rollEnchant(state, tgt.base);
        if (roll.effects?.length){
          const stat = roll.stat;
          const add  = roll.add;

          state.equipment[tgt.slot] = encodeRingEnchant(tgt.base, stat, add);

          const jewelryName = ITEMS[tgt.base]?.name || tgt.base;
          pushEnchantLog(`Enchanted ${jewelryName} → ✨ +${add} ${stat} (${roll.tierKey})`);

          appliedTo = { slot: tgt.slot, itemId: tgt.base, encoded: state.equipment[tgt.slot], tier: roll.tierKey, stat, add };
        }
      } else if (ap.mode === 'dual_enchant'){
        // Add second enchantment to already enchanted jewelry
        const roll = rollEnchant(state, tgt.base);
        if (roll.effects?.length){
          const stat = roll.stat;
          const add  = roll.add;

          const currentId = state.equipment[tgt.slot];
          state.equipment[tgt.slot] = addSecondEnchant(currentId, stat, add);

          const jewelryName = ITEMS[tgt.base]?.name || tgt.base;
          const enchCount = countEnchants(state.equipment[tgt.slot]);
          pushEnchantLog(`Added ${enchCount === 2 ? '2nd' : 'replacement'} enchant to ${jewelryName} → ✨ +${add} ${stat} (${roll.tierKey})`);

          appliedTo = { slot: tgt.slot, itemId: tgt.base, encoded: state.equipment[tgt.slot], tier: roll.tierKey, stat, add, dual: true };
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

  // Notify UIs so recipe enablement and equipment slot refresh
  try { window.dispatchEvent(new Event('equipment:change')); } catch {}
  try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
  try { window.dispatchEvent(new Event('mana:change')); } catch {}
  try { window.dispatchEvent(new Event('effects:tick')); } catch {}

  state.action = null;
  return { id: r.id, name: r.name, outputs: r.outputs || [], appliedTo };
}
