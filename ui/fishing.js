// /ui/fishing.js
import { listFishingSpots, canFish } from '../systems/fishing.js';
import { initGatheringPanel } from './skill_ui.js';
import { state } from '../systems/state.js';
import { toolEffectFor } from '../systems/tools.js';

const panel = initGatheringPanel({
  skillId: 'fishing',
  actionType: 'fish',
  getList: (s)=> listFishingSpots(s),
  canUse: (s, tOrId)=> {
    const list = listFishingSpots(s) || [];
    const t = typeof tOrId === 'string' ? list.find(x=>x.id===tOrId) : tOrId;
    return !!t && canFish({ ...s, action:null }, t);
  },
  getSelectedId: ()=> state.selectedSpotId,
  setSelectedId: (id)=> { state.selectedSpotId = id; },
  selectSelector: '#spotSelect',
  startBtnSelector: '#fishBtn',
  stopBtnSelector:  '#fishStopBtn, .fish-stop-btn',
  barSelector: '#fishBar',
  labelSelector: '#fishLabel',
  logChannel: 'fishing',
  autoLabel: 'Auto-fishing…',
  verbPast: 'Caught',
  essenceId: 'sea_essence'
});

(function ensureBadgeCss(){
  if (document.getElementById('fish-boost-css')) return;
  const css = document.createElement('style');
  css.id = 'fish-boost-css';
  css.textContent = `
    .fish-boost-badge{
      margin-left:.5rem; padding:.15rem .5rem; border-radius:999px;
      background:rgba(59,130,246,.15); color:#93c5fd; border:1px solid rgba(59,130,246,.35);
      font-weight:800; font-size:12px; letter-spacing:.2px;
    }
    .fish-boost-hidden{ display:none; }
  `;
  document.head.appendChild(css);
})();

let tick = null;
function ensureBoostBadge(){
  const panelEl = document.querySelector('#tab-fishing');
  if (!panelEl) return;
  let h2 = panelEl.querySelector('h2');
  if (!h2) return;
  let badge = document.getElementById('fishBoostBadge');
  if (!badge){
    badge = document.createElement('span');
    badge.id = 'fishBoostBadge';
    badge.className = 'fish-boost-badge fish-boost-hidden';
    h2.appendChild(badge);
  }
  if (!tick){
    tick = setInterval(updateBoostBadge, 500);
    window.addEventListener('tools:change', updateBoostBadge);
  }
  updateBoostBadge();
}

function updateBoostBadge(){
  const badge = document.getElementById('fishBoostBadge');
  if (!badge) return;
  const eff = toolEffectFor(state, 'fishing');
  if (!eff){
    badge.classList.add('fish-boost-hidden');
    return;
  }
  const secs = Math.max(0, Math.ceil((eff.until - Date.now())/1000));
  const pct  = Math.round((eff.chance||0)*100);
  badge.textContent = `${pct}% double catch · ${secs}s`;
  badge.classList.remove('fish-boost-hidden');
}

export function renderFishing(){
  panel.render();
  ensureBoostBadge();
}
