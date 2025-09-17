// /ui/app.js
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
import './royal_service.js';
import { renderRoyal } from './royal_service.js';

// ---- one-time hydrate + bootstrap ------------------------------------------
hydrateState();
if (state.hpCurrent == null) state.hpCurrent = hpMaxFor(state); // start full HP

// Cache progress bar/label els used by tick (keep IDs aligned with your HTML)
const el = {
  // woodcutting
  actionBar:   qs('#actionBar'),
  actionLabel: qs('#actionLabel'),

  // fishing
  fishBar:     qs('#fishBar'),
  fishLabel:   qs('#fishLabel'),

  // mining
  mineBar:     qs('#mineBar'),
  mineLabel:   qs('#mineLabel'),

  // smithing
  smithBar:    qs('#smithBar'),
  smithLabel:  qs('#smithLabel'),

  // crafting
  craftBar:    qs('#craftBar'),
  craftLabel:  qs('#craftLabel'),

  // cooking
  cookBar:     qs('#cookBar'),
  cookHint:    qs('#cookHint'),
};

// --- Manual save Export/Import helpers ---
function exportSaveFile() {
  const KEY = 'runecut-save';
  // Prefer what's on disk; fallback to current in-memory state
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

  // Merge with defaults to avoid missing keys
  const fresh = defaultState();
  const merged = { ...fresh, ...nextObj };

  // Replace contents of the *same* state object (keep references stable)
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, merged);

  // Clamp HP to new max
  const mx = hpMaxFor(state);
  state.hpCurrent = Math.min(mx, state.hpCurrent == null ? mx : state.hpCurrent);

  saveState(state);

  // Repaint everything
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
  renderPanelLogs();
  renderRoyal();
}

function importSaveFromFile(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const obj = JSON.parse(r.result);
      loadSaveObject(obj);
      alert('Save imported successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to import save: invalid JSON.');
    }
  };
  r.readAsText(file);
}

// Optional: expose simple console hooks
window.exportRunecutSave = exportSaveFile;
window.importRunecutSaveFromText = (txt) => {
  try { loadSaveObject(JSON.parse(txt)); } catch { alert('Bad JSON'); }
};

function wireSaveReset(){
  const saveBtn   = document.getElementById('saveBtn');
  const resetBtn  = document.getElementById('resetBtn');

  // NEW: export/import controls
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
    // reset input so choosing the same file again still fires change
    e.target.value = '';
  });

  // existing Save button
  saveBtn?.addEventListener('click', ()=>{
    try{
      saveState(state);
      const prev = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saved ✓';
      setTimeout(()=>{ saveBtn.disabled = false; saveBtn.textContent = prev; }, 800);
    }catch(err){
      console.error('Save error:', err);
    }
  });

  // existing Reset button
  resetBtn?.addEventListener('click', ()=>{
    if(!confirm('Reset your progress? This cannot be undone.')) return;

    try{ localStorage.removeItem('runecut-save'); }catch{}
    const fresh = defaultState();
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, fresh);
    state.hpCurrent = hpMaxFor(state);
    saveState(state);

    renderInventory();
    renderSmithing();
    renderCooking();
    renderFishing();
    renderMining();
    renderCrafting();
    renderWoodcutting();
    renderCombat();
    renderSkills();
    renderEquipment();
    renderEnchanting();
    renderPanelLogs();
    renderRoyal();
    setTab('forests');
  });
}


// ---- initial renders --------------------------------------------------------
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
  renderRoyal();                 // paint Royal Service once at boot
}

// ---- render after gaining an item ------------------------------------------
export function renderAllSkillingPanels(){
  renderWoodcutting?.();
  renderCrafting?.();
  renderSmithing?.();
  renderEnchanting?.();
  renderFishing?.();
  renderCooking?.();
  renderMining?.();
  renderInventory?.();
  renderEquipment?.();
  renderSkills?.();
  renderRoyal?.();               // update Royal (deliver buttons/progress)
}

// Refresh on inventory changes
window.addEventListener('inventory:change', () => {
  renderAllSkillingPanels();
});

// ---- single RAF loop: progress bars + passive HP regen ----------------------
let rafId = 0;
let last = performance.now();
let regenCarry = 0;
const REGEN_RATE = 1;
const REGEN_COOLDOWN_MS = 2000;

function verbFor(type){
  switch(type){
    case 'chop':  return 'Chopping';
    case 'fish':  return 'Fishing';
    case 'mine':  return 'Mining';
    case 'smith': return 'Smithing';
    case 'craft': return 'Crafting';
    case 'cook':  return 'Cooking';
    default:      return 'Working';
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

  }else{
    resetBar(el.actionBar, el.actionLabel);
    resetBar(el.fishBar,   el.fishLabel);
    resetBar(el.mineBar,   el.mineLabel);
    resetBar(el.smithBar,  el.smithLabel);
    resetBar(el.craftBar,  el.craftLabel);
    resetBar(el.cookBar,   null);
  }

  // Passive HP regen when not in combat
  if (!state.combat){
    const maxHp = hpMaxFor(state);
    const curHp = (state.hpCurrent == null) ? maxHp : state.hpCurrent;

    // optional cooldown after damage (set state.lastDamageMs when you take damage)
    const lastHit = Number(state.lastDamageMs) || 0;
    const sinceDmg = lastHit > 0 ? Math.max(0, now - lastHit) : Infinity;
    
    if (curHp < maxHp && sinceDmg >= REGEN_COOLDOWN_MS){
      regenCarry += dt;                          // accumulate elapsed seconds
      const toHeal = Math.floor(regenCarry * REGEN_RATE);
      if (toHeal > 0){
        state.hpCurrent = Math.min(maxHp, curHp + toHeal);
        regenCarry -= toHeal / REGEN_RATE;       // consume just what we applied
        renderEquipment();
        renderCombat();
      }
    } else {
      // don't let carry build up while full HP or in cooldown
      regenCarry = 0;
    }
  }

  rafId = requestAnimationFrame(tick);
}

// Tome logs
window.addEventListener('tome:tick', (e)=>{
  const { dropId, skill, xp } = e.detail || {};
  pushLog(`Tome gathered +1 ${dropId.replace(/_/g,' ')}${xp?` · +${xp} ${skill} xp`:''}`, skill || 'skilling');
  renderPanelLogs();
});

function refreshInvAndSkills(){
  renderInventory();
  renderSkills();
}

window.addEventListener('tome:tick', refreshInvAndSkills);
window.addEventListener('tome:stack', () => {
  renderEquipment();
  refreshInvAndSkills();
});
window.addEventListener('tome:end', () => {
  renderEquipment();
  renderInventory();
});

// ---- app start --------------------------------------------------------------
function startApp(){
  wireRoutes();

  // Make sure Royal tab triggers a render when you click it
  document.querySelector('.tabs')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    if (btn.getAttribute('data-tab') === 'royal') {
      renderRoyal();
    }
  });

  // Live refresh Royal Service progress on kills (combat dispatches kills:change)
  window.addEventListener('kills:change', () => {
    // If a contract just finished because of this kill, complete & re-render
    import('../systems/royal_service.js')
      .then(m => { m.completeIfAllDone?.(); renderRoyal(); })
      .catch(() => renderRoyal());
  });

  wireLogFilters();
  wireSaveReset();
  initialPaint();
  setInterval(()=>saveState(state), 30_000);
  if (!rafId) rafId = requestAnimationFrame(tick);
  console.log('RuneCut booted');
}

startApp();
