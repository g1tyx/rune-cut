import { state } from '../systems/state.js';
import { getActiveEffects, remainingMs, ensureEffectsTicker } from '../systems/effects.js';
import { qs } from '../utils/dom.js';

const elRow = () => qs('#charMaxHit')?.closest('.row');

(function ensureBadgeCss(){
  if (document.getElementById('char-effects-css')) return;
  const css = document.createElement('style');
  css.id = 'char-effects-css';
  css.textContent = `
    .pill.effect {
      margin-left: 6px;
      background: #0f2a18;
      border: 1px solid rgba(34,197,94,.45);
      color: #22c55e;
      font-weight: 800;
    }
    .pill.effect .name { margin-right: 4px; }
    .pill.effect .time { opacity: .9; font-variant-numeric: tabular-nums; }
  `;
  document.head.appendChild(css);
})();

function fmt(ms){
  const s = Math.max(0, Math.ceil(ms/1000));
  if (s >= 3600){ const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return `${h}h ${m}m`; }
  if (s >= 60){ const m = Math.floor(s/60); const r = s%60; return `${m}m ${r}s`; }
  return `${s}s`;
}

export function renderCharacterEffects(){
  const row = elRow();
  if (!row) return;
  row.querySelectorAll('.pill.effect').forEach(n => n.remove());

  const active = getActiveEffects(state);
  if (!active.length) return;

  for (const eff of active){
    const ms = remainingMs(state, eff.id);
    const badge = document.createElement('span');
    badge.className = 'pill effect';
    badge.dataset.effId = eff.id;
    badge.title = `${eff.name} — ${fmt(ms)} remaining`;
    badge.innerHTML = `<span class="name">${eff.name}</span><span class="time">${fmt(ms)}</span>`;
    row.appendChild(badge);
  }
}

function refreshTimesOnly(){
  const row = elRow(); if (!row) return;
  row.querySelectorAll('.pill.effect').forEach(b => {
    const id = b.dataset.effId;
    const ms = remainingMs(state, id);
    if (ms <= 0){
      b.remove();
    } else {
      b.querySelector('.time').textContent = fmt(ms);
      b.title = `${b.querySelector('.name').textContent} — ${fmt(ms)} remaining`;
    }
  });
}

window.addEventListener('effects:tick', refreshTimesOnly);
document.addEventListener('DOMContentLoaded', () => {
  ensureEffectsTicker();
  renderCharacterEffects();
});

export function onCharacterPanelRerender(){
  renderCharacterEffects();
  ensureEffectsTicker();
}
