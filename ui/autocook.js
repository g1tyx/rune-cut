import { state } from '../systems/state.js';
import { COOK_RECIPES } from '../data/cooking.js';

let pill = null;
let countdown = null;
let nameEl = null;

function ensureHud(){
  const host = document.getElementById('tab-cooking') || document.body;
  if (!host) return;

  if (!pill){
    pill = document.createElement('div');
    pill.id = 'autocookPill';
    pill.style.cssText = `
      display:none; align-items:center; gap:8px;
      padding:6px 10px; border-radius:999px;
      background:rgba(255,140,0,.12); color:#b24a00; font-weight:700;
      border:1px solid rgba(255,140,0,.35); width:max-content;
      margin:6px 0 8px;
    `;
    const flame = document.createElement('span'); flame.textContent = '🔥';
    nameEl = document.createElement('span'); nameEl.textContent = 'Auto-cook —';
    countdown = document.createElement('b'); countdown.textContent = '0s';
    pill.appendChild(flame);
    pill.appendChild(nameEl);
    pill.appendChild(countdown);
    host.prepend(pill);
  }
}

function nameOfRaw(id){
  return String(id || '').replace(/^raw_/, '').replace(/_/g,' ').replace(/\b\w/g, m=>m.toUpperCase());
}

function updateCountdown(until){
  if (!countdown) return;
  const rem = Math.max(0, Math.ceil((until - Date.now())/1000));
  countdown.textContent = `${rem}s`;
}

function show(untilMs, rawId){
  ensureHud();
  if (!pill) return;

  if (untilMs > Date.now()){
    pill.style.display = 'inline-flex';
    nameEl.textContent = rawId ? `Auto-cooking ${nameOfRaw(rawId)} —` : 'Auto-cook —';
    updateCountdown(untilMs);
  } else {
    pill.style.display = 'none';
  }
}

// Start/stop window
window.addEventListener('autocook:window', (e)=>{
  const { until, rawId } = e.detail || {};
  show(Number(until||0), rawId || state.ui?.lastCookedRawId || null);
});

// Frequent pulses to keep the seconds fresh
window.addEventListener('autocook:pulse', (e)=>{
  const { until, rawId } = e.detail || {};
  if (!until) { if (pill) pill.style.display='none'; return; }
  show(Number(until||0), rawId || state.ui?.lastCookedRawId || null);
});

// Small flash per cook
window.addEventListener('autocook:tick', ()=>{
  if (!pill) return;
  pill.animate([{opacity:1},{opacity:.6},{opacity:1}], {duration:300});
});

export function initAutoCookUI(){
  ensureHud();
  const until = Number(state.ui?.autoCookUntil || 0);
  const rawId = state.ui?.lastCookedRawId || null;
  if (until > Date.now()) show(until, rawId);
}
