// /ui/app.js — centralized bootstrap with safer wiring and autosave
import { state, initState, saveNow, defaultState } from '../systems/state.js';
import { hpMaxFor } from '../systems/combat.js';

import { renderInventory }   from './inventory.js';
import { renderSmithing }    from './smithing.js';
import { renderCooking }     from './cooking.js';
import { renderFishing }     from './fishing.js';
import { renderMining }      from './mining.js';
import { renderCrafting }    from './crafting.js';
import { renderWoodcutting } from './woodcutting.js';
import { renderEnchanting }  from './enchanting.js';
import { renderCombat }      from './combat.js';
import { renderSkills }      from './skills.js';
import { renderEquipment }   from './equipment.js';
import { renderPanelLogs, wireLogFilters, pushLog } from './logs.js';
import { setTab, wireRoutes } from './router.js';
import { qs } from '../utils/dom.js';
import { initAutoCookUI } from './autocook.js';
import { initCamp, renderCamp, renderCampEntities } from './camp.js';
import { initPets, renderPetsPanel } from './pets.js';
import { renderRoyalService } from './royal_service.js';
import { renderAlchemy } from './alchemy.js';
import { initAutoCook } from '../systems/autocook.js';

/* --------------------------------------------------------
   Utilities
---------------------------------------------------------*/
function safe(fn, label){
  try { return fn(); } catch (e) { console.warn(`[app] ${label||'fn'} failed:`, e); }
}

function repaintAll(){
  safe(()=>renderInventory(),   'renderInventory');
  safe(()=>renderEquipment(),   'renderEquipment');
  safe(()=>renderSkills(),      'renderSkills');
  safe(()=>renderCombat(),      'renderCombat');
  safe(()=>renderWoodcutting(), 'renderWoodcutting');
  safe(()=>renderSmithing(),    'renderSmithing');
  safe(()=>renderMining(),      'renderMining');
  safe(()=>renderFishing(),     'renderFishing');
  safe(()=>renderCooking(),     'renderCooking');
  safe(()=>renderCrafting(),    'renderCrafting');
  safe(()=>renderEnchanting(),  'renderEnchanting');
  safe(()=>renderPanelLogs(),   'renderPanelLogs');
  safe(()=>renderCamp(),        'renderCamp');
  safe(()=>renderPetsPanel(),   'renderPetsPanel');
  safe(()=>renderRoyalService(),'renderRoyalService');
  safe(()=>renderAlchemy(),     'renderAlchemy');
}

function updateMiniHeader(){
  const goldEl = qs('#gold');
  if (goldEl) goldEl.textContent = (state.gold||0).toLocaleString();

  const hpBar = qs('#hpBarMini');
  const hpLbl = qs('#hpMini');
  if (hpBar || hpLbl){
    const maxHp = hpMaxFor(state) || 1;
    const cur   = Math.min(maxHp, Math.max(0, state.hp||maxHp));
    if (hpBar) hpBar.style.width = `${Math.round((cur/maxHp)*100)}%`;
    if (hpLbl) hpLbl.textContent = `${cur}/${maxHp}`;
  }
}

let rafId = 0;
function tick(){
  rafId = requestAnimationFrame(tick);
  // keep HUD countdown fresh even if systems didn’t pulse yet
  try {
    const until = Number(state.ui?.autoCookUntil || 0);
    const rawId = state.ui?.lastCookedRawId || null;
    window.dispatchEvent(new CustomEvent('autocook:pulse', { detail:{ until, rawId } }));
  } catch {}
  updateMiniHeader();
}

function initialPaint(){
  repaintAll();
  safe(()=>initAutoCookUI(), 'initAutoCookUI');
}

function doReset(){
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, defaultState());
  saveNow();
  repaintAll();
  pushLog('Reset game to a fresh save.', ['system']);
}

function exportSave(){
  try {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'runecut-save.json';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    alert('Export failed');
    console.warn(e);
  }
}

function loadSaveObject(obj){
  try {
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, { ...defaultState(), ...obj });
    saveNow();
    repaintAll();
    pushLog('Imported save file.', ['system']);
  } catch (e) {
    alert('Import failed');
    console.warn(e);
  }
}

function wireSaveReset(){
  const byId = id => document.getElementById(id);
  const saveBtn   = byId('saveBtn');
  const resetBtn  = byId('resetBtn');
  const exportBtn = byId('exportBtn');
  const importBtn = byId('importBtn');

  if (saveBtn)   saveBtn.addEventListener('click', () => safe(()=>saveNow(),'saveNow'));
  if (resetBtn)  resetBtn.addEventListener('click', () => {
    if (confirm('Reset your progress? This cannot be undone.')) doReset();
  });
  if (exportBtn) exportBtn.addEventListener('click', exportSave);
  if (importBtn) importBtn.addEventListener('click', async ()=>{
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try{
        const text = await file.text();
        const json = JSON.parse(text);
        loadSaveObject(json);
      }catch{
        alert('Bad JSON');
      }
    };
    input.click();
  });
}

/* --------------------------------------------------------
   Boot
---------------------------------------------------------*/
function startApp(){
  safe(()=>initState(), 'initState');
  safe(()=>wireRoutes(), 'wireRoutes');

  // Autocook systems before first paint so HUD can pick up persisted window
  safe(()=>initAutoCook(), 'initAutoCook');
  safe(()=>initCamp(), 'initCamp');
  safe(()=>initPets(), 'initPets');

  // Persist locked raw + window endpoints whenever systems announce them
  window.addEventListener('autocook:window', (e)=>{
    const d = e.detail || {};
    state.ui = state.ui || {};
    if (typeof d.until === 'number') state.ui.autoCookUntil = d.until;
    if (d.rawId) state.ui.lastCookedRawId = d.rawId;
    try { saveNow(); } catch {}
  });

  initialPaint();

  setInterval(()=>safe(()=>saveNow(),'saveNow:interval'), 30_000);
  if (!rafId) rafId = requestAnimationFrame(tick);

  wireSaveReset();

  const repaintForInventory = () => {
    try { renderInventory(); } catch {}
    try { renderSkills(); } catch {}
    try { renderCrafting(); } catch {}
    try { renderSmithing(); } catch {}
    try { renderCooking(); } catch {}
    try { renderEquipment(); } catch {}
    try { renderEnchanting(); } catch {}
    try { renderCampEntities(); } catch {}
  };
  window.addEventListener('inventory:changed', repaintForInventory);

  window.addEventListener('gold:change', () => {
    const el = document.getElementById('gold');
    if (el) el.textContent = (state.gold||0).toLocaleString();
  });

  window.addEventListener('skills:change', () => {
    try { renderSkills(); } catch {}
  });

  window.runecut = Object.assign(window.runecut||{}, { state, repaintAll, save:()=>saveNow(), setTab });
}

startApp();
