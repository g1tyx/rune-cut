// /ui/alchemy.js
import { state, saveState } from '../systems/state.js';
import { ITEMS } from '../data/items.js';
import { ALCHEMY_RECIPES } from '../data/alchemy.js';
import { listAlchemyRecipes, isRecipeUnlocked, startBrew, finishBrew, canBrew } from '../systems/alchemy.js';
import { updateBar, resetBar } from './actionbars.js';
import { qs } from '../utils/dom.js';
import { renderInventory } from './inventory.js';
import { renderSkills } from './skills.js';

const el = {
  panel:  qs('#tab-alchemy'),
  list:   qs('#alchemyRecipes'),
  bar:    qs('#alchBar'),
  label:  qs('#alchLabel'),
};

function baseId(id){ return String(id||'').split('@')[0]; }
function iconFor(id){ return ITEMS?.[baseId(id)]?.img || ''; }
function nameFor(id){ return ITEMS?.[baseId(id)]?.name || baseId(id); }

(function ensureAlchemyCss(){
  if (document.getElementById('alchemy-css')) return;
  const css = document.createElement('style');
  css.id = 'alchemy-css';
  css.textContent = `
    #tab-alchemy .recipe-card { display:flex; gap:12px; align-items:center; padding:14px; border-radius:12px; background:var(--card-bg, #0f1623); border:1px solid rgba(255,255,255,0.06); }
    #tab-alchemy .recipe-card.locked { opacity:0.55; }
    #tab-alchemy .rc-left { display:flex; align-items:center; gap:12px; }
    #tab-alchemy .icon { width:48px; height:48px; border-radius:10px; object-fit:contain; background:#0b1020; }
    #tab-alchemy .title { font-weight:700; }
    #tab-alchemy .sub { font-size:12px; opacity:0.8; }
    #tab-alchemy .mats { font-size:12px; opacity:0.85; margin-top:4px; }
    #tab-alchemy .right { margin-left:auto; display:flex; align-items:center; gap:8px; }
    #tab-alchemy .pill { padding:4px 8px; border-radius:999px; font-size:12px; background:#1b2333; }
    #tab-alchemy .pill.green { background:#14351f; color:#22c55e; }
    #tab-alchemy .pill.blue  { background:#11273a; color:#60a5fa; }
    #tab-alchemy .brew:disabled{ opacity:.6; cursor:not-allowed; filter:saturate(.75); }
  `;
  document.head.appendChild(css);
})();

function cardHtml(r){
  const mats = (r.inputs||[]).map(n => `${nameFor(n.id)} ×${n.qty||1}`).join(', ');
  const img = r.img || iconFor(r.output?.id || r.id);
  const locked = !isRecipeUnlocked(state, r);
  const gate = canBrew(state, r.id, 1);
  const disabled = locked || !gate.ok;

  return `
  <div class="recipe-card ${locked ? 'locked' : ''}" data-id="${r.id}">
    <div class="rc-left">
      <img class="icon" src="${img}" alt="${r.name}" loading="lazy" onerror="this.style.visibility='hidden'">
      <div>
        <div class="title">${r.name}</div>
        <div class="sub">Lv ${r.level||1} · ${mats || '—'}</div>
      </div>
    </div>
    <div class="right">
      <span class="pill blue">+${r.xp||0}xp</span>
      <button class="btn-primary brew" data-act="brew" ${disabled ? 'disabled' : ''}>Brew</button>
    </div>
  </div>`;
}

function wireCard(node, r){
  const brewBtn = node.querySelector('[data-act="brew"]');
  brewBtn?.addEventListener('click', (e)=>{
    e.stopPropagation();
    const ok = startBrew(state, r.id, 1, ()=>{
      const res = finishBrew(state);
      saveState(state);
      renderInventory();
      renderSkills();
      paintProgress();
      // Re-evaluate gating after crafting
      renderAlchemy();
    });
    if (!ok) return;
    saveState(state);
    paintProgress();
  });
}

export function renderAlchemy(){
  if (!el.panel || !el.list) return;

  const rows = listAlchemyRecipes(state).map(r => {
    const wrap = document.createElement('div');
    wrap.innerHTML = cardHtml(r).trim();
    const node = wrap.firstElementChild;
    node && wireCard(node, r);
    return node;
  }).filter(Boolean);

  const frag = document.createDocumentFragment();
  rows.forEach(n => frag.appendChild(n));
  el.list.innerHTML = '';
  el.list.appendChild(frag);

  paintProgress();
}

function paintProgress(){
  const act = state.action;
  if (act && act.type === 'alch' && act.startedAt != null && act.duration != null){
    const now = performance.now();
    const frac = Math.max(0, Math.min(1, (now - act.startedAt) / act.duration));
    updateBar(el.bar, el.label, 'Brewing', frac);
    requestAnimationFrame(paintProgress);
  } else {
    resetBar(el.bar, el.label);
    if (el.label) el.label.textContent = 'Idle';
  }
}

window.addEventListener('inventory:change', renderAlchemy);
window.addEventListener('skills:change', renderAlchemy);
document.addEventListener('DOMContentLoaded', renderAlchemy);
