// /ui/fishing.js
import { state, saveState } from '../systems/state.js';
import { listFishingSpots, isSpotUnlocked, canFish, startFish, finishFish } from '../systems/fishing.js';
import { qs, on } from '../utils/dom.js';
import { pushLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderEnchanting } from './enchanting.js';
import { renderSkills } from './skills.js';
import { ITEMS } from '../data/items.js';
import { startAfk } from '../systems/afk.js';

const el = {
  spotSelect: qs('#spotSelect'),
  fishBtn:    qs('#fishBtn'),
  fishBar:    qs('#fishBar'),
  fishLabel:  qs('#fishLabel'),
};

function spots(){ return listFishingSpots(state) || []; }
function currentSpot(){
  const s = spots();
  return s.find(x => x.id === state.selectedSpotId) || s[0] || null;
}
function firstUnlocked(){
  const s = spots();
  return s.find(sp => isSpotUnlocked(state, sp)) || s[0] || null;
}

let AFK_FISH_ON = false;

function updateBarLabel(){
  if (!el.fishBar || !el.fishLabel) return;
  if (state.action?.type === 'fish'){
    const now = performance.now();
    const pct = Math.max(0, Math.min(1, (now - state.action.startedAt) / (state.action.duration || 1)));
    el.fishBar.style.width = (pct*100).toFixed(2) + '%';
    el.fishLabel.textContent = `${state.action.label || 'Fishing'} — ${(pct*100).toFixed(0)}%`;
  } else {
    el.fishBar.style.width = '0%';
    el.fishLabel.textContent = AFK_FISH_ON ? 'Auto-fishing…' : 'Idle';
  }
}

export function renderFishing(){
  const list = spots();
  if (!list.length) return;

  // Keep selection sticky unless truly locked by level.
  let sel = currentSpot();
  if (!sel || !isSpotUnlocked(state, sel)){
    sel = firstUnlocked();
    if (sel && sel.id !== state.selectedSpotId){
      state.selectedSpotId = sel.id;
      saveState(state);
    }
  }
  const selId = sel?.id || '';

  // Build dropdown
  if (el.spotSelect){
    el.spotSelect.innerHTML = list.map(sp=>{
      const unlocked = isSpotUnlocked(state, sp);
      const selAttr  = sp.id === selId ? 'selected' : '';
      const disAttr  = unlocked ? '' : 'disabled';
      const lvlStr   = sp.level ? ` (Lv ${sp.level})` : '';
      return `<option value="${sp.id}" ${selAttr} ${disAttr}>${sp.name || sp.id}${unlocked ? '' : lvlStr}</option>`;
    }).join('');
    el.spotSelect.value = selId;
  }

  // Busy-safe enable: ignore current action when deciding button enabled
  if (el.fishBtn) el.fishBtn.disabled = !canFish({ ...state, action:null }, selId);

  updateBarLabel();
}

/* -------- interactions -------- */

on(document, 'change', '#spotSelect', ()=>{
  const selEl = document.getElementById('spotSelect');
  if (!selEl) return;
  const id = selEl.value;
  const sp = spots().find(s=>s.id===id);
  if (!sp || !isSpotUnlocked(state, sp)){
    const fb = firstUnlocked();
    if (fb) { selEl.value = fb.id; state.selectedSpotId = fb.id; }
  } else {
    state.selectedSpotId = id;
  }
  saveState(state);
  renderFishing();
});

// Start AFK (switch from other skills & restart timer)
on(document, 'click', '#fishBtn', ()=>{
  const sp = currentSpot();
  if (!sp) return;
  startAfk(state, { skill:'fishing', targetId: sp.id });
});

/* -------- AFK event hooks (generic) -------- */

// Turn our HUD label on/off
window.addEventListener('afk:start', (e)=>{
  AFK_FISH_ON = e?.detail?.skill === 'fishing';
  if (AFK_FISH_ON && el.fishLabel) el.fishLabel.textContent = 'Auto-fishing…';
});
window.addEventListener('afk:end', ()=>{
  AFK_FISH_ON = false;
  if (el.fishLabel) el.fishLabel.textContent = 'Idle';
});
window.addEventListener('afk:switch', (e)=>{
  if (e?.detail?.name !== 'fishing'){
    AFK_FISH_ON = false;
    if (el.fishLabel) el.fishLabel.textContent = 'Idle';
  }
});

// Log each AFK catch using the same message format
window.addEventListener('afk:cycle', (e)=>{
  const d = e?.detail; if (!d || d.skill !== 'fishing') return;
  const itemName = ITEMS[d.dropId]?.name || d.dropName || d.dropId;
  const spotName = d.targetName || d.targetId;
  const essTxt   = d.essence ? ` · +1 ${ITEMS['sea_essence']?.name || 'Sea Essence'}` : '';
  const xp       = d.xp|0;

  pushLog(`Caught ${itemName} at ${spotName} → +1 ${itemName}${essTxt} · +${xp} Fishing xp`, 'fishing');
  saveState(state);
  renderFishing();
  renderEnchanting();
  renderInventory();
  renderSkills();
});

// Smooth bar
(function raf(){
  updateBarLabel();
  requestAnimationFrame(raf);
})();
