// /ui/royal_service.js

import { state } from '../systems/state.js';
import { qs } from '../utils/dom.js';
import { ITEMS } from '../data/items.js';
import { UI_TEXT } from '../data/royal_service_config.js';
import {
  patrons,
  tryOfferContract,
  taskProgress,
  canTurnInItemTask,
  turnInItemTask,
  completeIfAllDone,
  abandonContract,
  canAbandon,
} from '../systems/royal_service.js';

const el = {
  panel:       qs('#tab-royal'),
  requestBtn:  qs('#royalRequestBtn'),
  abandonBtn:  qs('#royalAbandonBtn'),
  contractBox: qs('#royalContract'),
  status:      qs('#royalStatus'),
  tabs:        qs('#royalPatronTabs'),
  tagsLine:    qs('#royalTagsLine'),
  unlocksRow:  qs('#royalUnlocks'),
};

function baseId(id){ return String(id||'').split('@')[0]; }
function iconForItem(id){ return (ITEMS?.[baseId(id)]?.img) || ''; }

// Displayed milestones (mirrors systems unlocks)
const UNLOCKS = [
  { favor: 10, key: 'sort_inventory',  label: 'Sort Inventory',  desc: 'Sort your items by type for faster finding.' },
  { favor: 25, key: 'autobattle',      label: 'Autobattle',      desc: 'Auto-resolve low-level encounters.' },
  { favor: 50, key: 'pet_sterling',    label: 'Pet: Sterling',   desc: 'A loyal companion joins your journey.' },
];

(function ensureCss(){
  if (document.getElementById('royal-css')) return;
  const css = document.createElement('style'); css.id='royal-css';
  css.textContent = `
    /* Theme */
    #tab-royal { --rs-bg:#0d1117; --rs-card:#0f1621; --rs-ink:#e6edf3; --rs-muted:#9aa4b2; --rs-acc:#6aa4ff; --rs-border:rgba(255,255,255,0.08); }
    #tab-royal { color:var(--rs-ink); }

    /* Header */
    #royalStatus { display:flex; align-items:center; gap:10px; padding:10px 12px; background:linear-gradient(180deg,#0f1724, #0b1320); border:1px solid var(--rs-border); border-radius:12px; }
    .rs-cooldown-badge { margin-left:auto; font-size:12px; padding:4px 8px; border-radius:999px; background:#1a2232; border:1px solid var(--rs-border); color:var(--rs-muted); }
    .rs-cooldown-badge strong { color:var(--rs-ink); }

    /* Unlocks — recipe-card style */
    #royalUnlocks { margin-top:10px; }
    #royalUnlocks .title-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    #royalUnlocks .title-row .title { color:var(--rs-muted); font-weight:700; letter-spacing:.2px; }
    #royalUnlocks .grid {
      display:grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap:10px;
    }
    #royalUnlocks .card {
      background: var(--rs-card);
      border: 1px solid var(--rs-border);
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.25) inset;
      display:flex;
      gap:10px;
    }
    #royalUnlocks .card .art {
      width:42px; height:42px; flex:0 0 42px;
      background:#0b111a; border:1px solid var(--rs-border); border-radius:8px;
      display:flex; align-items:center; justify-content:center;
      font-size:18px; user-select:none;
    }
    #royalUnlocks .card .body { flex:1; display:flex; flex-direction:column; gap:4px; }
    #royalUnlocks .card .hdr { display:flex; align-items:center; gap:8px; }
    #royalUnlocks .card .name { font-weight:700; }
    #royalUnlocks .pill {
      font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid var(--rs-border);
      color:var(--rs-muted); background:#0c1524;
    }
    #royalUnlocks .pill.ok    { color:#9fe3a2; background:#123017; border-color:#2e7d3233; }
    #royalUnlocks .pill.lock  { color:#d69ea3; background:#2a0f14; border-color:#7d2e4733; }
    #royalUnlocks .desc { color:var(--rs-muted); font-size:12px; }
    #royalUnlocks .req { color:var(--rs-muted); font-size:12px; }
    #royalUnlocks .act-row { margin-top:6px; display:flex; gap:6px; align-items:center; }

    /* Patron tabs */
    #royalPatronTabs { display:flex; gap:8px; margin:10px 0; flex-wrap:wrap; }
    #royalPatronTabs .patron-tab { background:#0e1520; color:var(--rs-ink); border:1px solid var(--rs-border); border-radius:10px; padding:6px 10px; cursor:pointer; }
    #royalPatronTabs .patron-tab.active { outline:1px solid #2d77ff; background:#0f1a2e; }
    .royal-pill { display:inline-block; padding:2px 8px; border-radius:999px; border:1px solid var(--rs-border); font-size:11px; margin-left:6px; color:var(--rs-muted); }

    /* Contract card */
    #royalContract { margin-top:8px; }
    #royalContract .ctr-head { background:var(--rs-card); border:1px solid var(--rs-border); border-radius:12px; padding:12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25) inset; }
    #royalContract .ctr-head > div:first-child { font-weight:700; margin-bottom:6px; }
    #royalContract .muted { color:var(--rs-muted); }
    #royalContract .tasks { list-style:none; margin:10px 0 0; padding:0; display:grid; gap:8px; }
    #royalContract .tasks > li { background:#0b111a; border:1px solid var(--rs-border); border-radius:10px; padding:8px 10px; }
    #royalContract .task-row { display:flex; align-items:center; gap:10px; }
    #royalContract .task-icon {
      width: 24px !important; height: 24px !important; max-width:24px !important; max-height:24px !important; flex:0 0 24px !important;
      object-fit:contain; border-radius:4px; image-rendering:auto;
    }
    #royalContract .task strong { font-weight:700; }
    #royalContract .task .qty { margin-left:6px; color:var(--rs-muted); font-weight:600; }
    .royal-actions { margin-top:10px; display:flex; gap:8px; align-items:center; }

    /* Buttons */
    #royalRequestBtn, #royalAbandonBtn { position:relative; }
    #royalAbandonBtn[disabled] { opacity:.7; filter:saturate(.8); cursor:not-allowed; }
    #royalAbandonBtn .rs-timer-chip {
      position:absolute; right:-10px; top:-8px; background:#1a2232; color:var(--rs-ink);
      border:1px solid var(--rs-border); padding:2px 6px; font-size:11px; border-radius:999px; pointer-events:none;
    }

    /* Celebration toast */
    .royal-celebrate {
      position: fixed; left: 50%; top: 20%;
      transform: translate(-50%, -50%) scale(0.92);
      background: #1b2130; color:#fff; padding:12px 16px; border-radius:12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.35); z-index:9999; font-weight:600;
      display:flex; align-items:center; gap:10px;
      animation: royal-pop-in 140ms ease-out, royal-fade-out 900ms ease-out 1100ms forwards;
      border: 1px solid var(--rs-border);
    }
    @keyframes royal-pop-in { from{opacity:0; transform:translate(-50%,-50%) scale(0.85)} to{opacity:1; transform:translate(-50%,-50%) scale(1)} }
    @keyframes royal-fade-out { from{opacity:1; transform:translate(-50%,-50%) scale(1)} to{opacity:0; transform:translate(-50%,-50%) scale(0.98)} }
  `;
  document.head.appendChild(css);
})();

function ensureUnlocksContainer(){
  if (el.unlocksRow && el.unlocksRow.parentNode) return el.unlocksRow;
  let host = qs('#royalUnlocks');
  if (!host){
    host = document.createElement('div');
    host.id = 'royalUnlocks';
    if (el.status && el.status.parentNode){
      el.status.parentNode.insertBefore(host, el.status.nextSibling);
    } else if (el.panel) {
      el.panel.insertBefore(host, el.panel.firstChild);
    } else {
      document.body.appendChild(host);
    }
  }
  el.unlocksRow = host;
  return host;
}

function celebrateComplete(){
  const n = document.createElement('div');
  n.className = 'royal-celebrate';
  n.innerHTML = `✅ <span>Royal Contract Complete!</span> <span class="royal-pill">+1 Favor</span>`;
  document.body.appendChild(n);
  setTimeout(()=> n.remove(), 2200);
}

function patronVoice(id){
  const map = UI_TEXT.patrons || {};
  return map[id] || map.Default || 'A Royal Patron has requested the following:';
}

function fmtTimer(ms){
  const s = Math.max(0, Math.ceil(ms/1000));
  const m = Math.floor(s/60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2,'0')}`;
}

/* ------------------------ renderers ------------------------ */

function renderHeader(){
  const favor = state.royalFavor || 0;
  const cd = canAbandon();
  const badge = cd.ok ? '' : `<span class="rs-cooldown-badge">Cancel available in <strong>${fmtTimer(cd.remainingMs)}</strong></span>`;
  el.status.innerHTML = `<strong>${UI_TEXT.headerTitle}</strong> — Favor <b>${favor}</b>${badge}`;
}

function renderUnlocks(){
  const host = ensureUnlocksContainer();
  const favor = state.royalFavor || 0;

  const cards = UNLOCKS.map(u => {
    const unlocked = favor >= u.favor;
    const pill = unlocked
      ? `<span class="pill ok">✅ Unlocked</span>`
      : `<span class="pill lock">🔒 Locked</span>`;

    const artEmoji =
      u.key === 'sort_inventory' ? '⇅' :
      u.key === 'autobattle'     ? '⚔️' :
      u.key === 'pet_sterling'   ? '🐦' : '⭐';

    const req = unlocked
      ? `<span class="req">Unlocked at Favor ${u.favor}</span>`
      : `<span class="req">Requires Favor ${u.favor} (you: ${favor})</span>`;

    return `
      <div class="card" data-key="${u.key}">
        <div class="art">${artEmoji}</div>
        <div class="body">
          <div class="hdr">
            <span class="name">${u.label}</span>
            ${pill}
          </div>
          <div class="desc">${u.desc || ''}</div>
          ${req}
        </div>
      </div>
    `;
  });

  host.innerHTML = `
    <div class="title-row">
      <span class="title">Royal Unlocks</span>
    </div>
    <div class="grid">
      ${cards.join('')}
    </div>
  `;

  try { window.dispatchEvent(new Event('unlocks:changed')); } catch {}
}

function renderPatronTabs(){
  if (!el.tabs) return;
  const ps = patrons();
  const stats = state.royalStats || {};
  const active = state.royalContract?.patron || ps[0]?.id;
  el.tabs.innerHTML = ps.map(p=>{
    const s = stats[p.id]?.completed || 0;
    const cls = `patron-tab ${active===p.id ? 'active' : ''}`;
    return `<button class="${cls}" data-p="${p.id}">${p.id} <span class="royal-pill">${s} done</span></button>`;
  }).join('');
  el.tabs.querySelectorAll('button[data-p]').forEach(btn=>{
    btn.addEventListener('click', ()=> renderRoyalService());
  });
}

function renderTagsLine(){
  if (!el.tagsLine) return;
  const ctr = state.royalContract;
  if (!ctr){ el.tagsLine.innerHTML = ''; return; }
  const ps = patrons();
  const pat = ps.find(x=>x.id===ctr.patron);
  const tags = (pat?.tags || []).join(', ');
  el.tagsLine.innerHTML = tags ? `<span class="muted">${UI_TEXT.patronTagsLabel}:</span> ${tags}` : '';
}

function renderContract(){
  const ctr = state.royalContract;
  if (!ctr) {
    el.contractBox.innerHTML = `<div class="muted">${UI_TEXT.noContract}</div>`;
    el.abandonBtn?.setAttribute('disabled','disabled');
    const chip = el.abandonBtn?.querySelector('.rs-timer-chip'); if (chip) chip.remove();
    return;
  }

  const cd = canAbandon();
  if (cd.ok) el.abandonBtn?.removeAttribute('disabled'); else el.abandonBtn?.setAttribute('disabled','disabled');

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

  const rewardLine = `<div class="muted"><strong>${UI_TEXT.rewardLabel}:</strong> ${ctr.rewardXp} RS XP • ${ctr.rewardGold} gold</div>`;

  const readyForAll = ctr.tasks.every(t=>{
    if (t.kind==='slay'){ const p = taskProgress(t); return p.have >= p.need; }
    if (t.kind==='deliver_done') return true;
    return canTurnInItemTask(t);
  });

  el.contractBox.innerHTML = `
    <div class="ctr-head">
      <div>${patronVoice(ctr.patron)}</div>
      ${rewardLine}
    </div>
    <ul class="tasks">${tasksHtml}</ul>
    <div class="royal-actions">
      <button id="royalTurnInAllBtn" class="btn-success" ${readyForAll ? '' : 'disabled'}>${UI_TEXT.turnInAllBtn}</button>
    </div>
  `;

  // Per-row Turn In
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

  // Turn in all
  el.contractBox.querySelector('#royalTurnInAllBtn')?.addEventListener('click', ()=>{
    const ctr2 = state.royalContract; if (!ctr2) return;
    for (const t of ctr2.tasks) if (t.kind==='deliver' && canTurnInItemTask(t)) turnInItemTask(t);
    if (completeIfAllDone()) celebrateComplete();
    renderRoyalService();
  });

  // Abandon button timer chip
  const ensureChip = ()=>{
    if (!el.abandonBtn) return null;
    let chip = el.abandonBtn.querySelector('.rs-timer-chip');
    if (!chip){
      chip = document.createElement('span');
      chip.className = 'rs-timer-chip';
      el.abandonBtn.appendChild(chip);
    }
    return chip;
  };
  const chip = ensureChip();
  if (chip){
    const cd2 = canAbandon();
    if (cd2.ok){ chip.textContent = ''; chip.style.display='none'; }
    else { chip.textContent = fmtTimer(cd2.remainingMs); chip.style.display='inline-block'; }
  }
}

function renderHeaderRow(){
  renderTagsLine();
}

export function renderRoyalService(){
  if (!el.panel) return;
  renderHeader();
  renderUnlocks();
  renderPatronTabs();
  renderContract();
  renderHeaderRow();
}
/*------------------------- Overlay ------------------------*/
function isMin(){ return !!(state.ui && state.ui.rsHudMin); }
function setMin(v){
  state.ui = state.ui || {};
  state.ui.rsHudMin = !!v;
  window.runecut?.save?.();
}

function contractTotals(ctr){
  let done = 0, total = 0;
  for (const t of (ctr?.tasks||[])) {
    const { have, need } = taskProgress(t);
    done += Math.min(have, need);
    total += Math.max(need, 0);
  }
  return { done, total };
}

function taskRow(t){
  const { have, need } = taskProgress(t);
  const label = t.label || t.name || (String(t.id||'').replace(/[_-]+/g,' '));
  const pct = need ? Math.round((Math.min(have,need)/need)*100) : 0;
  return `<div class="rsli">
    <span class="rslab">${label}</span>
    <span class="rsqty">${have}/${need}</span>
    <div class="rsbar"><div class="rsbarin" style="width:${pct}%"></div></div>
  </div>`;
}

function overlayExpandedHtml(){
  const ctr = state.royalContract;
  if (!ctr) return `<div class="rsempty">No active contract</div>`;
  const { done, total } = contractTotals(ctr);
  const rows = (ctr.tasks||[]).slice(0,10).map(taskRow).join('');
  const more = (ctr.tasks?.length||0) > 10 ? `<div class="rsmore">+${ctr.tasks.length-4} more</div>` : '';
  return `
    <div class="rshdr">
      <span>👑 Royal Contract</span>
      <div class="rshdrbtns">
        <button class="rsopen" type="button" title="Open">Open</button>
        <button class="rsmin"  type="button" title="Minimize">×</button>
      </div>
    </div>
    <div class="rsprog"><b>${done}</b>/<b>${total}</b></div>
    <div class="rslist">${rows}${more}</div>`;
}

function overlayMinHtml(){
  const ctr = state.royalContract;
  if (!ctr) {
    return `<div class="rspill" title="Royal Service">
      <span>👑 RS</span><button class="rsrestore" type="button">Expand</button>
    </div>`;
  }
  const { done, total } = contractTotals(ctr);
  return `<div class="rspill" title="Royal Service">
    <span>👑 RS ${done}/${total}</span>
    <button class="rsrestore" type="button" title="Expand">▣</button>
  </div>`;
}

function overlayHtml(){
  return isMin() ? overlayMinHtml() : overlayExpandedHtml();
}

export function renderRoyalOverlay(){
  const root = document.getElementById('royalOverlayHud');
  if (!root) return;
  root.innerHTML = overlayHtml();

  const open = root.querySelector('.rsopen');
  if (open) open.onclick = () => window.runecut?.setTab?.('royal');

  const min = root.querySelector('.rsmin');
  if (min) min.onclick = () => { setMin(true); renderRoyalOverlay(); };

  const restore = root.querySelector('.rsrestore');
  if (restore) restore.onclick = () => { setMin(false); renderRoyalOverlay(); };
}

export function mountRoyalOverlay(){
  if (document.getElementById('royalOverlayHud')) return;
  const el = document.createElement('div');
  el.id = 'royalOverlayHud';
  el.style.cssText = `
    position:fixed; right:12px; bottom:12px; z-index:1000;
    width:260px; max-width:70vw; background:#111; color:#eee;
    border:1px solid #333; border-radius:12px; padding:10px; box-shadow:0 6px 18px rgba(0,0,0,0.35);
    font:14px/1.3 system-ui,sans-serif;
  `;

  const style = document.createElement('style');
  style.textContent = `
    #royalOverlayHud .rshdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    #royalOverlayHud .rshdrbtns{display:flex;gap:6px}
    #royalOverlayHud .rsopen{background:#2d6cdf;color:#fff;border:0;border-radius:8px;padding:4px 8px;cursor:pointer}
    #royalOverlayHud .rsmin{background:#222;color:#aaa;border:1px solid #444;border-radius:8px;padding:2px 8px;cursor:pointer}
    #royalOverlayHud .rsprog{margin:4px 0 6px;color:#bbb}
    #royalOverlayHud .rslist{display:flex;flex-direction:column;gap:6px}
    #royalOverlayHud .rsli{display:grid;grid-template-columns:1fr auto;gap:4px;align-items:center}
    #royalOverlayHud .rslab{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px}
    #royalOverlayHud .rsqty{color:#aaa;font-variant-numeric:tabular-nums}
    #royalOverlayHud .rsbar{grid-column:1 / -1;height:6px;background:#222;border-radius:6px;overflow:hidden}
    #royalOverlayHud .rsbarin{height:100%;background:#4ade80}
    #royalOverlayHud .rsmore{color:#888;font-size:12px}
    #royalOverlayHud .rsempty{color:#aaa}
    #royalOverlayHud .rspill{display:flex;align-items:center;gap:8px}
    #royalOverlayHud .rspill .rsrestore{margin-left:auto;background:#2d6cdf;color:#fff;border:0;border-radius:8px;padding:3px 8px;cursor:pointer}
  `;
  document.body.appendChild(style);
  document.body.appendChild(el);

  const rerender = () => { try { renderRoyalOverlay(); } catch {} };
  window.addEventListener('royal:change', rerender);
  window.addEventListener('kills:change', rerender);
  window.addEventListener('inventory:changed', rerender);
  window.addEventListener('unlocks:changed', rerender);
  rerender();
}
/* ------------------------ wire up ------------------------ */
(function bind(){
  if (!el.panel) return;

  el.requestBtn?.addEventListener('click', ()=>{
    const got = tryOfferContract();
    if (!got) el.contractBox.innerHTML = `<div class="muted">${UI_TEXT.noneAvailable}</div>`;
    renderRoyalService();
  });

  el.abandonBtn?.addEventListener('click', ()=>{
    const chk = canAbandon();
    if (!chk.ok){
      el.abandonBtn.title = UI_TEXT.cooldown(Math.ceil(chk.remainingMs/60000));
      return;
    }
    if (abandonContract()) renderRoyalService();
  });

  // Live updates: cooldown + auto-complete + unlocks
  setInterval(()=>{
    const cd = canAbandon();
    if (cd.ok) el.abandonBtn?.removeAttribute('disabled');
    else el.abandonBtn?.setAttribute('disabled','disabled');

    // Update header badge & button chip without full re-render
    if (el.status){
      const badge = el.status.querySelector('.rs-cooldown-badge');
      if (badge){
        if (cd.ok) badge.remove();
        else badge.innerHTML = `Cancel available in <strong>${fmtTimer(cd.remainingMs)}</strong>`;
      } else if (!cd.ok) {
        const span = document.createElement('span');
        span.className = 'rs-cooldown-badge';
        span.innerHTML = `Cancel available in <strong>${fmtTimer(cd.remainingMs)}</strong>`;
        el.status.appendChild(span);
      }
    }
    if (el.abandonBtn){
      const chip = el.abandonBtn.querySelector('.rs-timer-chip');
      if (chip){
        if (cd.ok){ chip.textContent=''; chip.style.display='none'; }
        else { chip.textContent = fmtTimer(cd.remainingMs); chip.style.display='inline-block'; }
      }
    }

    if (completeIfAllDone()) {
      celebrateComplete();
      renderRoyalService();
    }
    renderUnlocks();
  }, 1000);

  window.addEventListener('inventory:changed', renderRoyalService);
  window.addEventListener('kills:change', renderRoyalService);
  window.addEventListener('royal:complete', renderRoyalService);
  window.addEventListener('royal:change', renderRoyalService);
  window.addEventListener('royal:stats', renderRoyalService);
  window.addEventListener('favor:update', renderRoyalService);

  renderRoyalService();
})();
