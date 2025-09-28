// /ui/enchanting.js
import { state } from '../systems/state.js';
import { ENCHANT_RECIPES } from '../data/enchanting.js';
import { canEnchant, startEnchant, finishEnchant } from '../systems/enchanting.js';
import { ensureMana, manaMaxFor, onManaChange } from '../systems/mana.js';
import { initRecipePanel } from './recipe_ui.js';
import { qs } from '../utils/dom.js';
import { pushLog } from './logs.js';

// DOM refs
const el = {
  mana:  qs('#enchantMana'),
  label: qs('#enchantLabel'),
  list:  qs('#enchantList'),
};

// Strict base helper (strip @quality and #tags)
const baseIdStrict = s => String(s||'').split('@')[0].split('#')[0];

// ---- display helpers ----
const manaText = () => {
  ensureMana(state);
  const cur = Math.max(0, state.manaCurrent|0);
  const max = manaMaxFor(state);
  return `Mana: ${cur}/${max}`;
};

// ---- max make (UI forces single craft; still compute for availability) ----
function maxMake(s, id){
  const r = ENCHANT_RECIPES[id]; if (!r) return 0;

  // material bound
  const matMax = (r.inputs || []).reduce((lim, inp)=>{
    const have = s.inventory?.[inp.id] || 0;
    const can  = Math.floor(have / Math.max(1, inp.qty|0));
    return Math.min(lim, can);
  }, Infinity);

  // mana bound
  const perMana = Math.max(0, Number(r.mana) || 0);
  const manaMax = perMana ? Math.floor((s.manaCurrent|0) / perMana) : Infinity;

  const m = Math.min(matMax, manaMax);
  return Number.isFinite(m) ? Math.max(0, m) : 0;
}

// ---- icon selection (no post-render swaps; prevents flicker) ----
// - Tome/normal recipes with outputs: keep output icon (handled by recipe_ui)
// - Ring-enchant recipes (no outputs): infer ring base from recipe id
// - Optional: for other icon-less recipes with inputs, fall back to first input base
function iconForRecipe(r){
  if (Array.isArray(r.outputs) && r.outputs.length) return null; // use output icon
  if (r?.apply?.mode === 'ring_enchant'){
    const m = String(r?.id||'').match(/^enchant_(.+_ring)$/);
    return m ? m[1] : null; // e.g., "enchant_sapphire_ring" -> "sapphire_ring"
  }
  if (Array.isArray(r.inputs) && r.inputs.length) return baseIdStrict(r.inputs[0].id);
  return null;
}

// ---- init standardized panel (no batching) ----
const panel = initRecipePanel({
  actionType: 'enchant',
  listSelector: '#enchantList',
  labelSelector: '#enchantLabel',

  getAll: () => ENCHANT_RECIPES,

  canMake: (s, id) => canEnchant(s, id),
  maxMake: (s, id) => maxMake(s, id),

  start: (s, id, cb) => startEnchant(s, id, cb),
  finish: (s, id) => {
    const r = ENCHANT_RECIPES[id] || {};
    const out = finishEnchant(s, id); // { id, name, outputs, appliedTo }
    if (!out) return null;

    // Standard result for shared panel
    const name = out.appliedTo
      ? (r.name || id)                  // apply-to-gear recipes use recipe name
      : (out.outputs?.[0]?.id || r.id); // normal recipes use first output id

    // Normalize xp into array-of-gains
    const xpArr = Array.isArray(r.xp) ? r.xp : (r.xp ? [r.xp] : []);
    const xpGains = xpArr.filter(g => g?.skill && g?.amount > 0);

    return { id: out.id || id, name, xpGains };
  },

  // Rename generic log verb
  pushLog: (txt) => pushLog(String(txt).replace(/^Crafted/i, 'Enchanted'), 'enchanting'),

  // Force single-craft behavior:
  getBatchOptions: () => [1],
  getBatchChoice:  () => 1,
  setBatchChoice:  () => {},

  // Final icon is computed here to avoid flicker and keep tome icons correct
  iconFor: iconForRecipe,
});

// ---- public render ----
export function renderEnchanting(){
  if (el.mana) el.mana.textContent = manaText();
  panel.render?.();
  // keep label coherent when idle
  if (el.label && (!state.action || state.action.type !== 'enchant')) {
    el.label.textContent = 'Idle';
  }
}

// keep mana label fresh (coalesced by mana.js)
onManaChange(()=>{
  if (el.mana) el.mana.textContent = manaText();
});

// Re-render panel immediately on shared state changes
['equipment:change','inventory:changed','mana:change','effects:tick'].forEach(ev=>{
  window.addEventListener(ev, ()=> {
    try { renderEnchanting(); } catch {}
  });
});

// init
export function renderEnchantingInit(){
  renderEnchanting();
}
