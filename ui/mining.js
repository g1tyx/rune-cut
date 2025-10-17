// /ui/mining.js
import { listRocks, canMine } from '../systems/mining.js';
import { initGatheringPanel } from './skill_ui.js';
import { state, saveNow } from '../systems/state.js';
import { ITEMS } from '../data/items.js';
import { availableTools, equipTool, toolRemainingMs } from '../systems/tools.js';

const panel = initGatheringPanel({
  skillId: 'mining',
  actionType: 'mine',
  getList: (s)=> listRocks(s),
  canUse: (s, tOrId)=> {
    const list = listRocks(s) || [];
    const t = typeof tOrId === 'string' ? list.find(x=>x.id===tOrId) : tOrId;
    return !!t && canMine({ ...s, action:null }, t);
  },
  getSelectedId: ()=> state.selectedRockId,
  setSelectedId: (id)=> { state.selectedRockId = id; },
  selectSelector: '#rockSelect',
  startBtnSelector: '#mineBtn',
  stopBtnSelector:  '#mineStopBtn, .mine-stop-btn',
  barSelector: '#mineBar',
  labelSelector: '#mineLabel',
  logChannel: 'mining',
  autoLabel: 'Auto-mining…',
  verbPast: 'Mined',
  essenceId: 'rock_essence'
});

function el(id){ return document.querySelector(id); }
function ensureToolUI(){
  const host = document.querySelector('#tab-mining .row');
  if (!host) return;
  if (!document.getElementById('miningToolSlot')){
    const box = document.createElement('div');
    box.id = 'miningToolSlot';
    box.innerHTML = `
      <label class="muted" for="miningToolSelect">Tool</label>
      <select id="miningToolSelect"></select>
      <button id="miningToolEquip" class="btn-primary">Equip</button>
      <span id="miningToolBadge" class="pill">No tool</span>
    `;
    host.appendChild(box);
  }
}

function refreshToolSelect(){
  const sel = el('#miningToolSelect');
  if (!sel) return;
  const list = availableTools(state, 'mining');
  const options = list.map(id=>{
    const it = ITEMS[id]||{};
    return `<option value="${id}">${it.name||id}</option>`;
  }).join('');
  sel.innerHTML = options || `<option disabled>No tools</option>`;
}

function fmtClock(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(s/60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2,'0')}`;
}

function refreshToolBadge(){
  const badge = el('#miningToolBadge'); if (!badge) return;
  const rem = toolRemainingMs(state, 'mining');
  if (rem > 0){
    badge.className = 'pill';
    badge.textContent = `Tool active · ${fmtClock(rem)}`;
  } else {
    badge.className = 'pill';
    badge.textContent = 'No tool';
  }
}

function wireToolUI(){
  const btn = el('#miningToolEquip');
  if (btn && !btn._wired){
    btn._wired = true;
    btn.addEventListener('click', ()=>{
      const sel = el('#miningToolSelect');
      const id = sel?.value;
      if (!id) return;
      const res = equipTool(state, id);
      if (res?.ok){
        saveNow();
        refreshToolSelect();
        refreshToolBadge();
      }
    });
  }
  let t = el('#miningToolTicker');
  if (!t){
    t = document.createElement('div');
    t.id = 'miningToolTicker';
    t.style.display = 'none';
    document.body.appendChild(t);
    setInterval(refreshToolBadge, 1000);
  }
}

export function renderMining(){
  panel.render();
  ensureToolUI();
  refreshToolSelect();
  refreshToolBadge();
  wireToolUI();
}

window.addEventListener('inventory:changed', ()=>{
  refreshToolSelect();
});
window.addEventListener('tools:change', ()=>{
  refreshToolBadge();
});
