// /ui/royal_service.js
import { state } from '../systems/state.js';
import { qs } from '../utils/dom.js';
import {
  tryOfferContract,
  taskProgress,
  canTurnInItemTask,
  turnInItemTask,
  completeIfAllDone,
  abandonContract
} from '../systems/royal_service.js';
import { ITEMS } from '../data/items.js';

const el = {
  panel:       qs('#tab-royal'),
  requestBtn:  qs('#royalRequestBtn'),
  abandonBtn:  qs('#royalAbandonBtn'),
  contractBox: qs('#royalContract'),
  status:      qs('#royalStatus')
};

/* ------------------------ helpers ------------------------ */
function baseId(id){ return String(id || '').split('@')[0]; }
function iconForItem(id){
    const bid = baseId(id);
    const it  = ITEMS?.[bid];
    return it?.img || '';
  }
function ensureRoyalCss(){
  if (document.getElementById('royal-css')) return;
  const css = document.createElement('style');
  css.id = 'royal-css';
  css.textContent = `
    #royalContract .task-row { display:flex; align-items:center; gap:8px; }
    #royalContract .task-icon {
      width: var(--royal-task-icon-size, 24px) !important;
      height: var(--royal-task-icon-size, 24px) !important;
      max-width: var(--royal-task-icon-size, 24px) !important;
      max-height: var(--royal-task-icon-size, 24px) !important;
      flex: 0 0 var(--royal-task-icon-size, 24px) !important;
      object-fit: contain;
      border-radius: 4px;
      image-rendering: auto;
    }
    .royal-actions { margin-top: 10px; display: flex; gap: 8px; align-items: center; }
    .royal-celebrate {
      position: fixed; left: 50%; top: 20%;
      transform: translate(-50%, -50%) scale(0.92);
      background: #1b1f2a; color: #fff; padding: 12px 16px; border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.35);
      z-index: 9999; font-weight: 600; letter-spacing: .2px;
      display: flex; align-items: center; gap: 10px;
      animation: royal-pop-in 140ms ease-out, royal-fade-out 900ms ease-out 1100ms forwards;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .royal-celebrate .badge {
      background: #23c55e; color: #0b0f14; font-weight: 800; padding: 4px 8px; border-radius: 999px;
    }
    @keyframes royal-pop-in {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    @keyframes royal-fade-out {
      from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      to   { opacity: 0; transform: translate(-50%, -50%) scale(0.98); }
    }
  `;
  document.head.appendChild(css);
}
ensureRoyalCss();

function celebrateComplete(){
  const n = document.createElement('div');
  n.className = 'royal-celebrate';
  n.innerHTML = `✅ <span>Royal Contract Complete!</span> <span class="badge">+1 Favor</span>`;
  document.body.appendChild(n);
  setTimeout(()=> n.remove(), 2200);
}

function patronLine(ctr){
  switch (ctr.patron) {
    case 'Warden':
      return `The Royal Warden calls upon you to defend the kingdom:`;
    case 'Quartermaster':
      return `The Royal Quartermaster has requested the following building supplies:`;
    case 'Armorer':
      return `The Royal Armorer has issued a contract to arm the kingdom's troops:`;
    case 'Steward':
      return `The Royal Quartermaster has requested the following food supplies in service to the kingdom:`;
    case 'Craftsman':
      return `The Royal Craftsman has requested the following in service to the kingdom:`;
    default:
      return `A Royal Patron has requested the following in service to the kingdom:`;
  }
}

/* ------------------------ contract UI ------------------------ */
function renderContract(){
  const ctr = state.royalContract;
  if (!ctr) {
    el.contractBox.innerHTML = `<div class="muted">No active contract. Click “Request Contract”.</div>`;
    el.abandonBtn?.setAttribute('disabled','disabled');
    return;
  }
  el.abandonBtn?.removeAttribute('disabled');

  // Build task list with small icons for Deliver tasks
  const tasksHtml = ctr.tasks.map(t=>{
    if (t.kind==='deliver') {
      const p = taskProgress(t);
      const icon = iconForItem(t.id);
      const canTurn = canTurnInItemTask(t);
      const btn = canTurn ? `<button class="btn-success" data-act="turnin">Turn In</button>` : '';
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

  // Contract-level turn-in availability
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

  // per-task "Turn In"
  el.contractBox.querySelectorAll('button[data-act="turnin"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const deliverTask = state.royalContract?.tasks.find(t=>t.kind==='deliver' && canTurnInItemTask(t));
      if (deliverTask) {
        turnInItemTask(deliverTask);
        if (completeIfAllDone()) celebrateComplete();
        renderRoyal();
      }
    });
  });

  // bulk "Turn In Contract"
  el.contractBox.querySelector('#royalTurnInAllBtn')?.addEventListener('click', ()=>{
    const ctr2 = state.royalContract;
    if (!ctr2) return;

    for (const t of ctr2.tasks) {
      if (t.kind==='deliver' && canTurnInItemTask(t)) {
        turnInItemTask(t);
      }
    }
    if (completeIfAllDone()) celebrateComplete();
    renderRoyal();
  });
}

function renderHeader(){
  const favor = state.royalFavor || 0;
  el.status.innerHTML = `<strong>Royal Service</strong> — Favor <b>${favor}</b>`;
}

export function renderRoyal(){
  if (!el.panel) return;
  renderHeader();
  renderContract();
}

/* ------------------------ wire up ------------------------ */
(function bind(){
  if (!el.panel) {
    console.warn('[Royal UI] panel not found: #tab-royal');
    return;
  }
  if (!el.requestBtn) console.warn('[Royal UI] requestBtn not found: #royalRequestBtn');
  if (!el.abandonBtn) console.warn('[Royal UI] abandonBtn not found: #royalAbandonBtn');

  el.requestBtn?.addEventListener('click', ()=>{
    const got = tryOfferContract();
    if (!got) {
      el.contractBox.innerHTML = `<div class="muted">No valid tasks yet. Level up related skills a bit and try again.</div>`;
    }
    renderRoyal();
  });

  el.abandonBtn?.addEventListener('click', ()=>{
    abandonContract();
    renderRoyal();
  });

  setInterval(()=>{
    if (completeIfAllDone()) {
      celebrateComplete();
      renderRoyal();
    }
  }, 1000);

  window.addEventListener('kills:change', renderRoyal);
  window.addEventListener('royal:complete', ()=>{
    celebrateComplete();
    renderRoyal();
  });
})();
