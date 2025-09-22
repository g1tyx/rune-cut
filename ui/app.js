import { state, hydrateState, saveState, defaultState } from '../systems/state.js';
import { hpMaxFor } from '../systems/combat.js';

import { renderInventory } from './inventory.js';
import { renderSmithing } from './smithing.js';
import { renderCooking } from './cooking.js';
import { renderFishing } from './fishing.js';
import { renderMining } from './mining.js';
import { renderCrafting } from './crafting.js';
import { renderWoodcutting } from './woodcutting.js';
import { renderEnchanting } from './enchanting.js';
import { renderCombat } from './combat.js';
import { renderSkills } from './skills.js';
import { renderEquipment } from './equipment.js';
import { renderPanelLogs, wireLogFilters, pushLog } from './logs.js';
import { setTab, wireRoutes } from './router.js';
import { updateBar, resetBar } from './actionbars.js';
import { qs } from '../utils/dom.js';
import { renderAlchemy } from './alchemy.js';

import './royal_service.js';
import { renderRoyal } from './royal_service.js';

import { initCamp, renderCamp } from './camp.js';

// 🔥 Auto-cook UI + logic (no boot-starts)
import { initAutoCook } from '../systems/autocook.js';
import { initAutoCookUI } from './autocook.js';

// ---- hydrate first ----
hydrateState();
if (state.hpCurrent == null) state.hpCurrent = hpMaxFor(state);

// Cache progress bars used by RAF tick
const el = {
  actionBar:   qs('#actionBar'),
  actionLabel: qs('#actionLabel'),
  fishBar:     qs('#fishBar'),
  fishLabel:   qs('#fishLabel'),
  mineBar:     qs('#mineBar'),
  mineLabel:   qs('#mineLabel'),
  smithBar:    qs('#smithBar'),
  smithLabel:  qs('#smithLabel'),
  craftBar:    qs('#craftBar'),
  craftLabel:  qs('#craftLabel'),
  cookBar:     qs('#cookBar'),
  cookHint:    qs('#cookHint'),
};

// Export/Import (unchanged)
function exportSaveFile() {
  const KEY = 'runecut-save';
  const data = localStorage.getItem(KEY) || JSON.stringify(state);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `runecut-save_${stamp}.json`;

  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadSaveObject(nextObj) {
  if (!nextObj || typeof nextObj !== 'object') {
    alert('Invalid save file: not JSON object.');
    return;
  }

  const fresh = defaultState();
  const merged = { ...fresh, ...nextObj };

  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, merged);

  const mx = hpMaxFor(state);
  state.hpCurrent = Math.min(mx, state.hpCurrent == null ? mx : state.hpCurrent);

  saveState(state);

  renderInventory();
  renderSmithing();
  renderCooking();
  renderFishing();
  renderMining();
  renderCrafting();
  renderWoodcutting();
  renderEnchanting();
  renderCombat();
  renderSkills();
  renderEquipment();
  renderPanelLogs();
  renderRoyal();
  renderAlchemy();
}

function importSaveFromFile(file) {
  const r = new FileReader();
  r.onload = () => {
    try { loadSaveObject(JSON.parse(r.result)); alert('Save imported successfully.'); }
    catch (e) { console.error(e); alert('Failed to import save: invalid JSON.'); }
  };
  r.readAsText(file);
}

window.exportRunecutSave = exportSaveFile;
window.importRunecutSaveFromText = (txt) => {
  try { loadSaveObject(JSON.parse(txt)); } catch { alert('Bad JSON'); }
};

function wireSaveReset(){
  const saveBtn   = document.getElementById('saveBtn');
  const resetBtn  = document.getElementById('resetBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  let importInput = document.getElementById('importFile');

  if (!importInput) {
    importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = 'application/json';
    importInput.id = 'importFile';
    importInput.hidden = true;
    document.body.appendChild(importInput);
  }

  exportBtn?.addEventListener('click', exportSaveFile);
  importBtn?.addEventListener('click', ()=> importInput?.click());
  importInput?.addEventListener('change', (e)=>{
    const f = e.target.files?.[0];
    if (f) importSaveFromFile(f);
    e.target.value = '';
  });

  saveBtn?.addEventListener('click', ()=>{
    try{
      saveState(state);
      const prev = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saved ✓';
      setTimeout(()=>{ saveBtn.disabled = false; saveBtn.textContent = prev; }, 800);
    }catch(err){ console.error('Save error:', err); }
  });

  resetBtn?.addEventListener('click', ()=>{
    if(!confirm('Reset your progress? This cannot be undone.')) return;
    try{ localStorage.removeItem('runecut-save'); }catch{}
    location.reload();
  });
}

// ---- initial renders ----
function initialPaint(){
  renderInventory();
  renderSmithing();
  renderCooking();
  renderFishing();
  renderMining();
  renderCrafting();
  renderWoodcutting();
  renderEnchanting();
  renderCombat();
  renderSkills();
  renderEquipment();
  renderPanelLogs();
  renderRoyal();
  renderAlchemy();
  initCamp();
  renderCamp();
}

// Combined re-render helper
export function renderAllSkillingPanels(){
  renderWoodcutting?.();
  renderCrafting?.();
  renderSmithing?.();
  renderEnchanting?.();
  renderFishing?.();
  renderCooking?.();
  renderMining?.();
  renderInventory?.();
  renderAlchemy?.();
  renderCamp?.();
  renderEquipment?.();
  renderSkills?.();
  renderRoyal?.();
}

window.addEventListener('inventory:change', () => {
  renderAllSkillingPanels();
});

// ---- RAF loop (unchanged except new verbs) ----
let rafId = 0;
let last = performance.now();
let regenCarry = 0;
const REGEN_RATE = 1;
const REGEN_COOLDOWN_MS = 2000;

function verbFor(type){
  switch(type){
    case 'chop':      return 'Chopping';
    case 'fish':      return 'Fishing';
    case 'mine':      return 'Mining';
    case 'smith':     return 'Smithing';
    case 'craft':     return 'Crafting';
    case 'cook':      return 'Cooking';
    case 'alch':      return 'Brewing';    // ✅ new
    case 'construct': return 'Building';   // ✅ new (if/when used)
    default:          return 'Working';
  }
}

function tick(){
  const now = performance.now();
  const dt  = (now - last) / 1000;
  last = now;

  const act = state.action;
  if (act && act.startedAt != null && act.duration != null){
    const frac = Math.max(0, Math.min(1, (now - act.startedAt) / act.duration));
    const v = verbFor(act.type);

    if (act.type === 'chop')   updateBar(el.actionBar, el.actionLabel, v, frac);
    if (act.type === 'fish')   updateBar(el.fishBar,    el.fishLabel,   v, frac);
    if (act.type === 'mine')   updateBar(el.mineBar,    el.mineLabel,   v, frac);
    if (act.type === 'smith')  updateBar(el.smithBar,   el.smithLabel,  v, frac);
    if (act.type === 'craft')  updateBar(el.craftBar,   el.craftLabel,  v, frac);
    if (act.type === 'cook')   updateBar(el.cookBar,    null,           v, frac);
    // Note: Alchemy progress is handled inside /ui/alchemy.js with its own bar.
    // Construction may have its own UI (camp/building); no central bar here unless added later.
  }else{
    resetBar(el.actionBar, el.actionLabel);
    resetBar(el.fishBar,   el.fishLabel);
    resetBar(el.mineBar,   el.mineLabel);
    resetBar(el.smithBar,  el.smithLabel);
    resetBar(el.craftBar,  el.craftLabel);
    resetBar(el.cookBar,   null);
  }

  // Passive regen
  if (!state.combat){
    const maxHp = hpMaxFor(state);
    const curHp = (state.hpCurrent == null) ? maxHp : state.hpCurrent;

    const lastHit = Number(state.lastDamageMs) || 0;
    const sinceDmg = lastHit > 0 ? Math.max(0, now - lastHit) : Infinity;

    if (curHp < maxHp && sinceDmg >= REGEN_COOLDOWN_MS){
      regenCarry += dt;
      const toHeal = Math.floor(regenCarry * REGEN_RATE);
      if (toHeal > 0){
        state.hpCurrent = Math.min(maxHp, curHp + toHeal);
        regenCarry -= toHeal / REGEN_RATE;
        renderEquipment();
        renderCombat();
      }
    } else {
      regenCarry = 0;
    }
  }

  rafId = requestAnimationFrame(tick);
}

// ---- boot ----
function startApp(){
  wireRoutes();
  wireSaveReset();
  initialPaint();

  // Auto-cook UI first, then logic (no automatic start on refresh)
  initAutoCookUI();
  initAutoCook();

  setInterval(()=>saveState(state), 30_000);
  if (!rafId) rafId = requestAnimationFrame(tick);
}

startApp();
