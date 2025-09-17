// /ui/mining.js
import { state, saveState } from '../systems/state.js';
import { renderSmithing } from './smithing.js';
import { listRocks, canMine } from '../systems/mining.js';
import { qs, on } from '../utils/dom.js';
import { pushLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderEnchanting } from './enchanting.js';
import { renderSkills } from './skills.js';
import { ITEMS } from '../data/items.js';
import { startAfk } from '../systems/afk.js';

const el = {
  rockSelect: qs('#rockSelect'),
  mineBtn:    qs('#mineBtn'),
  mineLabel:  qs('#mineLabel'),
};

function rocks(){ return listRocks(state) || []; }

// Ignore "busy" (state.action) when deciding what's selectable/renderable
function canLevelOnly(r){
  return canMine({ ...state, action: null }, r);
}

function firstAccessibleRock(){
  return rocks().find(r => canLevelOnly(r)) || rocks()[0] || null;
}

function currentRock(){
  const list = rocks();
  return list.find(r => r.id === state.selectedRockId) || list[0] || null;
}

let AFK_MINING_ON = false;

function updateMineLabel(){
  if (!el.mineLabel) return;
  if (state.action?.type === 'mine'){
    el.mineLabel.textContent = 'Mining…';
  } else {
    el.mineLabel.textContent = AFK_MINING_ON ? 'Auto-mining…' : 'Idle';
  }
}

export function renderMining(){
  const list = rocks();
  if (!list.length) return;

  // Use current selection unless truly locked by level (not just busy)
  let sel = currentRock();
  if (!sel || !canLevelOnly(sel)){
    const fb = firstAccessibleRock();
    if (fb && fb.id !== state.selectedRockId){
      state.selectedRockId = fb.id;
      saveState(state);
    }
    sel = fb || list[0] || null;
  }

  if (el.rockSelect){
    el.rockSelect.innerHTML = list.map(r=>{
      const ok = canLevelOnly(r);
      const selAttr = (sel && r.id===sel.id) ? 'selected' : '';
      const disAttr = ok ? '' : 'disabled';
      return `<option value="${r.id}" ${selAttr} ${disAttr}>
        ${r.name || r.id} ${ok ? '' : `(Lv ${r.level||1})`}
      </option>`;
    }).join('');

    // keep user's selection; don't force fallback just because we're busy
    if (!el.rockSelect.value || el.rockSelect.options[el.rockSelect.selectedIndex]?.disabled){
      el.rockSelect.value = sel?.id || (list[0] && list[0].id) || '';
    }
    el.rockSelect.disabled = false;
    el.rockSelect.style.pointerEvents = 'auto';
  }

  // Busy-safe enable: ignore current action when deciding button enabled
  if (el.mineBtn) el.mineBtn.disabled = !canMine({ ...state, action:null }, sel);

  updateMineLabel();
}

// Selection change
on(document, 'change', '#rockSelect', ()=>{
  const selEl = document.getElementById('rockSelect');
  if (!selEl) return;
  const id = selEl.value;
  const r = rocks().find(x=>x.id===id);

  // Only force fallback if actually level-locked, not just busy
  if (!r || !canLevelOnly(r)){
    const fb = firstAccessibleRock();
    if (fb) {
      state.selectedRockId = fb.id;
      selEl.value = fb.id;
    }
  } else {
    state.selectedRockId = id;
  }
  saveState(state);
  renderMining();
});

// Mine click → start AFK session (switches from other skills & restarts timer)
on(document, 'click', '#mineBtn', ()=>{
  let r = currentRock();
  if (!r) return;

  // If somehow selected is level-locked, fall back once
  if (!canLevelOnly(r)){
    const fb = firstAccessibleRock();
    if (!fb) return;
    state.selectedRockId = fb.id;
    r = fb;
    saveState(state);
    renderMining();
  }

  // Kick generic AFK manager for mining
  startAfk(state, { skill:'mining', targetId: r.id });
});

/* -------- AFK event hooks (generic) -------- */

// Turn our HUD label on/off
window.addEventListener('afk:start', (e)=>{
  AFK_MINING_ON = e?.detail?.skill === 'mining';
  updateMineLabel();
});
window.addEventListener('afk:end', ()=>{
  AFK_MINING_ON = false;
  updateMineLabel();
});
window.addEventListener('afk:switch', (e)=>{
  if (e?.detail?.name !== 'mining'){
    AFK_MINING_ON = false;
    updateMineLabel();
  }
});

// Log each AFK cycle with the same format as manual mining
window.addEventListener('afk:cycle', (e)=>{
  const d = e?.detail; if (!d || d.skill !== 'mining') return;
  const itemName = ITEMS[d.dropId]?.name || d.dropId;
  const rockName = d.targetName || d.targetId;
  const essTxt   = d.essence ? ` · +1 ${ITEMS['rock_essence']?.name || 'Rock Essence'}` : '';
  const xp       = d.xp|0;

  pushLog(`Mined ${rockName} → +1 ${itemName}${essTxt} · Mining +${xp} xp`, 'mining');
  renderInventory();
  renderEnchanting();
  renderSkills();
  renderSmithing(); // keep smithing counts fresh
  saveState(state);
  renderMining();
});

/* -------- lightweight HUD refresh loop -------- */
(function raf(){
  updateMineLabel();
  requestAnimationFrame(raf);
})();
