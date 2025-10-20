// /ui/woodcutting.js
import { listTrees, canChop } from '../systems/woodcutting.js';
import { initGatheringPanel } from './skill_ui.js';
import { state } from '../systems/state.js';
import { toolEffectFor } from '../systems/tools.js';

const panel = initGatheringPanel({
  skillId: 'forestry',
  actionType: 'chop',
  getList: (s)=> listTrees(s),
  canUse: (s, tOrId)=> {
    const t = typeof tOrId === 'string' ? (listTrees(s)||[]).find(x=>x.id===tOrId) : tOrId;
    return !!t && canChop({ ...s, action:null }, t);
  },
  getSelectedId: ()=> state.selectedTreeId,
  setSelectedId: (id)=> { state.selectedTreeId = id; },
  selectSelector: '#treeSelect, #wcTreeSelect',
  startBtnSelector: '#chopBtn, #wcChopBtn, .chop-btn',
  stopBtnSelector:  '#wcStopBtn, .wc-stop-btn, #stopChopBtn',
  barSelector: '#actionBar',
  labelSelector: '#actionLabel, #wcActionLabel',
  logChannel: 'wc',
  autoLabel: 'Auto-chopping…',
  verbPast: 'Chopped',
  essenceId: 'forest_essence'
});

(function ensureBadgeCss(){
  if (document.getElementById('wc-boost-css')) return;
  const css = document.createElement('style');
  css.id = 'wc-boost-css';
  css.textContent = `
    .wc-boost-badge{
      margin-left:.5rem; padding:.15rem .5rem; border-radius:999px;
      background:rgba(16,185,129,.15); color:#86efac; border:1px solid rgba(16,185,129,.35);
      font-weight:800; font-size:12px; letter-spacing:.2px;
    }
    .wc-boost-hidden{ display:none; }
  `;
  document.head.appendChild(css);
})();

let tick = null;
function ensureBoostBadge(){
  const panelEl = document.querySelector('#tab-forests');
  if (!panelEl) return;
  let h2 = panelEl.querySelector('h2');
  if (!h2) return;
  let badge = document.getElementById('wcBoostBadge');
  if (!badge){
    badge = document.createElement('span');
    badge.id = 'wcBoostBadge';
    badge.className = 'wc-boost-badge wc-boost-hidden';
    h2.appendChild(badge);
  }
  if (!tick){
    tick = setInterval(updateBoostBadge, 500);
    window.addEventListener('tools:change', updateBoostBadge);
  }
  updateBoostBadge();
}

function updateBoostBadge(){
  const badge = document.getElementById('wcBoostBadge');
  if (!badge) return;
  const eff = toolEffectFor(state, 'forestry');
  if (!eff){
    badge.classList.add('wc-boost-hidden');
    return;
  }
  const secs = Math.max(0, Math.ceil((eff.until - Date.now())/1000));
  const pct  = Math.round((eff.chance||0)*100);
  badge.textContent = `${pct}% double drop · ${secs}s`;
  badge.classList.remove('wc-boost-hidden');
}

export function renderWoodcutting(){
  panel.render();
  ensureBoostBadge();
}
