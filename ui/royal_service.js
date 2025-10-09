// /ui/royal_service.js — Royal panel UI

import { state } from '../systems/state.js';
import { qs } from '../utils/dom.js';
import { ITEMS } from '../data/items.js';
import {
  tryOfferContract,
  taskProgress,
  canTurnInItemTask,
  turnInItemTask,
  completeIfAllDone,
  abandonContract,
  ensureRoyalUnlocks
} from '../systems/royal_service.js';

const el = {
  panel:       qs('#tab-royal'),
  requestBtn:  qs('#royalRequestBtn'),
  abandonBtn:  qs('#royalAbandonBtn'),
  contractBox: qs('#royalContract'),
  status:      qs('#royalStatus')
};

const FAVOR_BONUSES = [
  { id:'sort_inventory', name:'Inventory Sort', need:10, desc:'Unlocks the Sort button in the inventory to auto-organize items by use.' },
  { id:'autobattle',     name:'Autobattle',     need:25, desc:'Adds an Autobattle checkbox on the combat card to auto re-engage for 3 minutes.' },
  { id:'pet_sterling',   name:'Royal Service Dog', need:50, desc:'Earn the loyal hound Sterling after serving the royal court.' }
];

function baseId(id){ return String(id||'').split('@')[0]; }
function iconForItem(id){ return (ITEMS?.[baseId(id)]?.img) || ''; }

function ensureRoyalCss(){
  if (document.getElementById('royal-css')) return;
  const css = document.createElement('style'); css.id='royal-css';
  css.textContent = `
    #royalContract .task-row { display:flex; align-items:center; gap:8px; }
    #royalContract .task-icon {
      width: var(--royal-task-icon-size, 24px) !important;
      height: var(--royal-task-icon-size, 24px) !important;
      max-width: var(--royal-task-icon-size, 24px) !important;
      max-height: var(--royal-task-icon-size, 24px) !important;
      flex: 0 0 var(--royal-task-icon-size, 24px) !important;
      object-fit: contain; border-radius:4px; image-rendering:auto;
    }
    .royal-actions { margin-top:10px; display:flex; gap:8px; align-items:center; }
    .royal-celebrate {
      position: fixed; left: 50%; top: 20%;
      transform: translate(-50%, -50%) scale(0.92);
      background: #1b1f2a; color:#fff; padding:12px 16px; border-radius:12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.35); z-index:9999; font-weight:600; letter-spacing:.2px;
      display:flex; align-items:center; gap:10px;
      animation: royal-pop-in 140ms ease-out, royal-fade-out 900ms ease-out 1100ms forwards;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .royal-celebrate .badge { background:#23c55e; color:#0b0f14; font-weight:800; padding:4px 8px; border-radius:999px; }
    @keyframes royal-pop-in { from{opacity:0; transform:translate(-50%,-50%) scale(0.85)} to{opacity:1; transform:translate(-50%,-50%) scale(1)} }
    @keyframes royal-fade-out { from{opacity:1; transform:translate(-50%,-50%) scale(1)} to{opacity:0; transform:translate(-50%,-50%) scale(0.98)} }
  `;
  document.head.appendChild(css);
}
function ensureRoyalBonusCss(){
  if (document.getElementById('royal-bonus-css')) return;
  const css = document.createElement('style'); css.id='royal-bonus-css';
  css.textContent = `
    #royalBonusesWrap { margin-top:14px; }
    #royalBonuses { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap:10px; margin:8px 0; }
    .bonus-card { position:relative; border:1px solid rgba(0,0,0,0.1); border-radius:10px; padding:10px; background:#0d1117; color:#e6edf3; }
    .bonus-card.locked { opacity:0.65; filter:saturate(0.75); }
    .bonus-card .title { font-weight:700; margin-bottom:4px; }
    .bonus-card .req   { font-size:12px; opacity:0.85; }
    .bonus-card .pill  { position:absolute; top:8px; right:8px; font-size:11px; padding:2px 6px; border-radius:999px; background:#222c; }
    .bonus-card.unlocked .pill { background:#15714b; color:#e6edf3; font-weight:600; }
  `;
  document.head.appendChild(css);
}
ensureRoyalCss();
ensureRoyalBonusCss();

function celebrateComplete(){
  const n = document.createElement('div');
  n.className = 'royal-celebrate';
  n.innerHTML = `✅ <span>Royal Contract Complete!</span> <span class="badge">+1 Favor</span>`;
  document.body.appendChild(n);
  setTimeout(()=> n.remove(), 2200);
}

function patronLine(ctr){
  switch (ctr.patron) {
    case 'Warden':       return `The Royal Warden calls upon you to defend the kingdom:`;
    case 'Quartermaster':return `The Royal Quartermaster has requested the following building supplies:`;
    case 'Armorer':      return `The Royal Armorer has issued a contract to arm the kingdom's troops:`;
    case 'Steward':      return `The Royal Steward has requested the following food supplies:`;
    case 'Craftsman':    return `The Royal Craftsman has requested the following goods:`;
    default:             return `A Royal Patron has requested the following:`;
  }
}

function renderContract(){
  const ctr = state.royalContract;
  if (!ctr) {
    el.contractBox.innerHTML = `<div class="muted">No active contract. Click “Request Contract”.</div>`;
    el.abandonBtn?.setAttribute('disabled','disabled');
    return;
  }
  el.abandonBtn?.removeAttribute('disabled');

  const tasksHtml = ctr.tasks.map(t=>{
    if (t.kind==='deliver') {
      const p = taskProgress(t);
      const icon = iconForItem(t.id);
      const canTurn = canTurnInItemTask(t);
      const btn = canTurn ? `<button class="btn-success" data-act="turnin" data-id="${t.id}">Turn In</button>` : '';
      return `<li>
        <div class="task-row">
          <img class="task-icon" src="${icon}" alt="" width="24" height="24" loading="lazy"
               onerror="this.style.visibility='hidden'"/>
          <div class="task">
            <strong>Deliver:</strong> ${t.label}
            <span class="qty">${p.have}/${p.need}</span>
            ${btn}
          </div>
        </div>
      </li>`;
    }
    if (t.kind==='slay') {
      const p = taskProgress(t);
      return `<li>
        <div class="task-row">
          <div class="task">
            <strong>Slay:</strong> ${t.name}
            <span class="qty">${p.have}/${p.need}</span>
          </div>
        </div>
      </li>`;
    }
    return `<li>
      <div class="task-row">
        <div class="task done">
          <strong>Delivered:</strong> ${t.label} <span class="qty">✓</span>
        </div>
      </div>
    </li>`;
  }).join('');

  const readyForAll = ctr.tasks.every(t=>{
    if (t.kind==='slay'){
      const p = taskProgress(t);
      return p.have >= p.need;
    }
    if (t.kind==='deliver_done') return true;
    return canTurnInItemTask(t);
  });

  el.contractBox.innerHTML = `
    <div class="ctr-head">
      <div>${patronLine(ctr)}</div>
      <div class="muted"><strong>Reward:</strong> ${ctr.rewardXp} Royal Service XP</div>
    </div>
    <ul class="tasks">${tasksHtml}</ul>
    <div class="royal-actions">
      <button id="royalTurnInAllBtn" class="btn-success" ${readyForAll ? '' : 'disabled'}>Turn In Contract</button>
    </div>
  `;

  // Per-row Turn In must use that row's task id
  el.contractBox.querySelectorAll('button[data-act="turnin"]').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const id = ev.currentTarget.getAttribute('data-id');
      const deliverTask = state.royalContract?.tasks.find(t=>t.kind==='deliver' && t.id === id);
      if (deliverTask && canTurnInItemTask(deliverTask)) {
        turnInItemTask(deliverTask);
        if (completeIfAllDone()) celebrateComplete();
        renderRoyalService();
      }
    });
  });

  el.contractBox.querySelector('#royalTurnInAllBtn')?.addEventListener('click', ()=>{
    const ctr2 = state.royalContract; if (!ctr2) return;
    for (const t of ctr2.tasks) if (t.kind==='deliver' && canTurnInItemTask(t)) turnInItemTask(t);
    if (completeIfAllDone()) celebrateComplete();
    renderRoyalService();
  });
}

function renderHeader(){
  const favor = state.royalFavor || 0;
  el.status.innerHTML = `<strong>Royal Service</strong> — Favor <b>${favor}</b>`;
}

function ensureBonusContainer(){
  if (!el.panel) return null;
  let wrap = document.getElementById('royalBonusesWrap');
  if (!wrap){
    wrap = document.createElement('div');
    wrap.id = 'royalBonusesWrap';
    wrap.innerHTML = `<div class="muted" style="margin:6px 0 2px;">Favor Bonuses</div><div id="royalBonuses"></div>`;
    if (el.contractBox && el.contractBox.parentNode){
      el.contractBox.insertAdjacentElement('afterend', wrap);
    } else {
      el.panel.appendChild(wrap);
    }
  }
  return wrap.querySelector('#royalBonuses');
}

function renderBonuses(){
  const box = ensureBonusContainer(); if (!box) return;
  const favor = state.royalFavor || 0;
  const cards = FAVOR_BONUSES.map(b => {
    const unlocked = favor >= b.need;
    if (unlocked && b.id !== 'pet_sterling') {
      state.unlocks = state.unlocks || {};
      state.unlocks[b.id] = true;
    }
    const cls  = `bonus-card ${unlocked ? 'unlocked' : 'locked'}`;
    const pill = unlocked ? 'Unlocked' : `Needs ${b.need} Favor`;
    return `<div class="${cls}" title="${b.desc.replace(/"/g,'&quot;')}">
      <div class="title">${b.name}</div>
      <div class="req">${unlocked ? 'Available now' : `Unlocks at ${b.need} Favor`}</div>
      <div class="pill">${pill}</div>
    </div>`;
  }).join('');
  box.innerHTML = cards;
  try { window.dispatchEvent(new Event('favor:update')); } catch {}
}

/** Public: paint the Royal tab */
export function renderRoyalService(){
  try { ensureRoyalUnlocks(); } catch {}
  if (!el.panel) return;
  renderHeader();
  renderContract();
  renderBonuses();
}

/* ------------------------ wire up ------------------------ */
(function bind(){
  if (!el.panel) {
    console.warn('[Royal UI] panel not found: #tab-royal');
    return;
  }

  el.requestBtn?.addEventListener('click', ()=>{
    const got = tryOfferContract();
    if (!got) {
      el.contractBox.innerHTML = `<div class="muted">No valid tasks yet. Level up related skills a bit and try again.</div>`;
    }
    renderRoyalService();
  });

  el.abandonBtn?.addEventListener('click', ()=>{
    abandonContract();
    renderRoyalService();
  });

  setInterval(()=>{
    if (completeIfAllDone()) {
      celebrateComplete();
      renderRoyalService();
    }
  }, 1000);

  // Refresh UI when related state changes
  window.addEventListener('inventory:changed', renderRoyalService);
  window.addEventListener('kills:change', renderRoyalService);
  window.addEventListener('royal:complete', ()=>{
    renderRoyalService();
    celebrateComplete();
    renderRoyalService();
  });

  // Initial paint
  renderRoyalService();
})();
