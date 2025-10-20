import { listRocks, canMine } from '../systems/mining.js';
import { initGatheringPanel } from './skill_ui.js';
import { state } from '../systems/state.js';
import { toolEffectFor } from '../systems/tools.js';

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

(function ensureBadgeCss(){
  if (document.getElementById('mine-boost-css')) return;
  const css = document.createElement('style');
  css.id = 'mine-boost-css';
  css.textContent = `
    .mine-boost-badge{
      margin-left:.5rem; padding:.15rem .5rem; border-radius:999px;
      background:rgba(16,185,129,.15); color:#86efac; border:1px solid rgba(16,185,129,.35);
      font-weight:800; font-size:12px; letter-spacing:.2px;
    }
    .mine-boost-hidden{ display:none; }
  `;
  document.head.appendChild(css);
})();

let tick = null;
function ensureBoostBadge(){
  const panelEl = document.querySelector('#tab-mining');
  if (!panelEl) return;
  let h2 = panelEl.querySelector('h2');
  if (!h2) return;
  let badge = document.getElementById('mineBoostBadge');
  if (!badge){
    badge = document.createElement('span');
    badge.id = 'mineBoostBadge';
    badge.className = 'mine-boost-badge mine-boost-hidden';
    h2.appendChild(badge);
  }
  if (!tick){
    tick = setInterval(updateBoostBadge, 500);
    window.addEventListener('tools:change', updateBoostBadge);
  }
  updateBoostBadge();
}

function updateBoostBadge(){
  const badge = document.getElementById('mineBoostBadge');
  if (!badge) return;
  const eff = toolEffectFor(state, 'mining');
  if (!eff){
    badge.classList.add('mine-boost-hidden');
    return;
  }
  const secs = Math.max(0, Math.ceil((eff.until - Date.now())/1000));
  const pct  = Math.round((eff.chance||0)*100);
  badge.textContent = `${pct}% double drop · ${secs}s`;
  badge.classList.remove('mine-boost-hidden');
}

export function renderMining(){
  panel.render();
  ensureBoostBadge();
}
