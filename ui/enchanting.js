// /ui/enchanting.js
import { state, saveState } from '../systems/state.js';
import { ENCHANT_RECIPES } from '../data/enchanting.js';
import { canEnchant, startEnchant, finishEnchant } from '../systems/enchanting.js';
import { ensureMana, manaMaxFor, onManaChange } from '../systems/mana.js';
import { initRecipePanel } from './recipe_ui.js';
import { qs } from '../utils/dom.js';
import { pushLog } from './logs.js';

const el = {
  mana:  qs('#enchantMana'),
  label: qs('#enchantLabel'),
  list:  qs('#enchantList'),
};

// ---- display helpers ----
const manaText = () => {
  ensureMana(state);
  const cur = Math.max(0, state.manaCurrent|0);
  const max = manaMaxFor(state);
  return `Mana: ${cur}/${max}`;
};

// ---- max make (we still compute, but UI will force single craft) ----
function maxMake(state, id){
  const r = ENCHANT_RECIPES[id]; if (!r) return 0;

  // material bound
  const matMax = (r.inputs || []).reduce((lim, inp)=>{
    const have = state.inventory?.[inp.id] || 0;
    const can  = Math.floor(have / Math.max(1, inp.qty|0));
    return Math.min(lim, can);
  }, Infinity);

  // mana bound
  const perMana = Math.max(0, Number(r.mana) || 0);
  const manaMax = perMana ? Math.floor((state.manaCurrent|0) / perMana) : Infinity;

  const m = Math.min(matMax, manaMax);
  return Number.isFinite(m) ? Math.max(0, m) : 0;
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
      ? (r.name || id)                  // apply-to-tool recipes use recipe name
      : (out.outputs?.[0]?.id || r.id); // normal recipes use first output id

    // Normalize xp into array-of-gains; avoids "undefined"
    const xpArr = Array.isArray(r.xp) ? r.xp
                 : (r.xp ? [r.xp] : []);
    const xpGains = xpArr.filter(g => g?.skill && g?.amount > 0);

    return { id: out.id || id, name, xpGains };
  },

  // Rename generic log verb
  pushLog: (txt) => pushLog(String(txt).replace(/^Crafted/i, 'Enchanted'), 'enchanting'),

  // Force single-craft behavior (panel expects these):
  getBatchOptions: () => [1],          // ensures no multi options
  getBatchChoice:  () => 1,            // always 1
  setBatchChoice:  () => {},           // no-op

  // No selectorGroups for enchanting
});

// Remove batch row entirely for enchanting
function removeBatchRow() {
  if (!el.list) return;
  const row = el.list.previousElementSibling;
  if (row && row.classList?.contains('batch-row')) row.remove();
}

// ---- public render ----
export function renderEnchanting(){
  if (el.mana) el.mana.textContent = manaText();
  panel.render?.();
  removeBatchRow();
  // keep label coherent when idle
  if (el.label && (!state.action || state.action.type !== 'enchant')) {
    el.label.textContent = 'Idle';
  }
}

// keep mana label fresh (coalesced by mana.js)
onManaChange(()=>{
  if (el.mana) el.mana.textContent = manaText();
});

// init
export function renderEnchantingInit(){
  renderEnchanting();
}
