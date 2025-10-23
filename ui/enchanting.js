// /ui/enchanting.js
import { state } from '../systems/state.js';
import { ENCHANT_RECIPES } from '../data/enchanting.js';
import { canEnchant, startEnchant, finishEnchant, stopEnchant } from '../systems/enchanting.js';
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
// - Jewelry-enchant recipes (no outputs): infer jewelry base from recipe id
// - For amulets, prefer gold version if it exists
// - For dual_enchant, show double sparkle
// - Optional: for other icon-less recipes with inputs, fall back to first input base
function iconForRecipe(r){
  if (Array.isArray(r.outputs) && r.outputs.length) return null; // use output icon
  
  // Dual enchant gets a special sparkle icon
  if (r?.id === 'dual_enchant') return null; // will show sparkle in recipe_ui
  
  if (r?.apply?.mode === 'ring_enchant'){
    const m = String(r?.id||'').match(/^enchant_(.+(?:_ring|_amulet))$/);
    if (m) {
      const jewelryType = m[1]; // e.g., "sapphire_ring" or "emerald_amulet"
      
      // For amulets, prefer gold version for icon display
      if (jewelryType.includes('amulet')) {
        // Sapphire and Ruby have silver versions, others have gold
        if (jewelryType === 'sapphire_amulet') return 'silver_sapphire_amulet';
        if (jewelryType === 'ruby_amulet') return 'silver_ruby_amulet';
        if (jewelryType === 'emerald_amulet') return 'gold_emerald_amulet';
        if (jewelryType === 'diamond_amulet') return 'gold_diamond_amulet';
        if (jewelryType === 'starstone_amulet') return 'gold_starstone_amulet';
      }
      
      return jewelryType; // rings work as-is
    }
    return null;
  }
  if (Array.isArray(r.inputs) && r.inputs.length) return baseIdStrict(r.inputs[0].id);
  return null;
}

// ---- filter state ----
let currentFilter = 'all'; // 'all', 'tomes', 'vials', 'equipment'

function matchesFilter(recipe) {
  if (currentFilter === 'all') return true;
  
  const id = recipe.id;
  
  if (currentFilter === 'tomes') {
    return id.startsWith('tome_');
  }
  
  if (currentFilter === 'vials') {
    return id === 'arcane_phial' || id === 'enchanted_phial';
  }
  
  if (currentFilter === 'equipment') {
    // Ring enchants and swiftness consumables
    return id.startsWith('enchant_') || id.startsWith('swift_');
  }
  
  return true;
}

// ---- init standardized panel (no batching) ----
const panel = initRecipePanel({
  actionType: 'enchant',
  listSelector: '#enchantList',
  labelSelector: '#enchantLabel',

  getAll: () => {
    const all = ENCHANT_RECIPES;
    const filtered = {};
    for (const [id, recipe] of Object.entries(all)) {
      if (matchesFilter(recipe)) {
        filtered[id] = recipe;
      }
    }
    return filtered;
  },

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
  stop: (s) => stopEnchant(s),

  // Rename generic log verb
  pushLog: (txt) => pushLog(String(txt).replace(/^Crafted/i, 'Enchanted'), 'enchanting'),

  // Force single-craft behavior:
  getBatchOptions: () => [1],
  getBatchChoice:  () => 1,
  setBatchChoice:  () => {},

  // Final icon is computed here to avoid flicker and keep tome icons correct
  iconFor: iconForRecipe,
});

// ---- render filter buttons ----
function renderFilterButtons() {
  const container = document.querySelector('#enchantList')?.parentElement;
  if (!container) return;
  
  let filterRow = container.querySelector('.filter-row');
  if (!filterRow) {
    filterRow = document.createElement('div');
    filterRow.className = 'filter-row';
    const list = container.querySelector('#enchantList');
    container.insertBefore(filterRow, list);
  }
  
  const filters = [
    { id: 'all', label: 'All', emoji: '✨' },
    { id: 'tomes', label: 'Tomes', emoji: '📚' },
    { id: 'vials', label: 'Vials', emoji: '⚗️' },
    { id: 'equipment', label: 'Equipment', emoji: '💍' }
  ];
  
  filterRow.innerHTML = filters.map(f => {
    const active = currentFilter === f.id ? 'active' : '';
    return `<button class="filter-btn ${active}" data-filter="${f.id}">${f.emoji} ${f.label}</button>`;
  }).join('');
}

// ---- public render ----
export function renderEnchanting(){
  if (el.mana) el.mana.textContent = manaText();
  renderFilterButtons();
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

// ---- filter button handler ----
window.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  
  const filter = btn.dataset.filter;
  if (filter && filter !== currentFilter) {
    currentFilter = filter;
    renderEnchanting();
  }
});

// ---- CSS for filters ----
function ensureFilterCss() {
  if (document.getElementById('enchant-filter-css')) return;
  const style = document.createElement('style');
  style.id = 'enchant-filter-css';
  style.textContent = `
    .filter-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      background: #1b2333;
      color: #cfe3ff;
      border: 1px solid rgba(255,255,255,.06);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-btn:hover {
      background: #252f42;
      border-color: rgba(255,255,255,.12);
    }
    .filter-btn.active {
      background: #2563eb;
      color: white;
      border-color: #3b82f6;
    }
  `;
  document.head.appendChild(style);
}
ensureFilterCss();

// init
export function renderEnchantingInit(){
  renderEnchanting();
}
