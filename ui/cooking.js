// /ui/cooking.js
import { state, saveState } from '../systems/state.js';
import { COOK_TIME_MS, canCook, startCook, resolveCook, cookGateReason } from '../systems/cooking.js';
import { COOK_RECIPES } from '../data/cooking.js';
import { qs, on } from '../utils/dom.js';
import { pushLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderEnchanting } from './enchanting.js';
import { renderSkills } from './skills.js';
import { ITEMS } from '../data/items.js';
import { buildXpTable, levelFromXp } from '../systems/xp.js';

const XP_TABLE = buildXpTable();

const el = {
  fire:   qs('#cookFire'),
  bar:    qs('#cookBar'),
  zone:   qs('#cookPerfectZone'),
  hint:   qs('#cookHint'),
};

let pendingRawId = null;       // which raw_* is armed/selected
let dragRawId = null;          // which raw_* is currently being dragged
let holding = false;           // true while timing
let holdingMode = null;        // 'drag' | 'pointer'
let zoneStart = 0.35, zoneEnd = 0.53; // golden zone [0..1]

/* ---------------- helpers ---------------- */
function playerLvl(){ return levelFromXp(state.cookXp || 0, XP_TABLE); }
function reqLevel(rawId){
  const rec = COOK_RECIPES[rawId] || {};
  return rec.level ?? rec.lvl ?? 1;
}

function nameOf(id){
  return (ITEMS?.[id]?.name)
    || String(id||'').replace(/^raw_/, '').replace(/_/g, ' ')
    .replace(/\b\w/g, m=>m.toUpperCase());
}
function setHint(s){ if (el.hint) el.hint.textContent = s; }

/* Golden zone width with scaling: ×2 per 10 levels OVER. */
function zoneWidthFor(rawId){
  const over = Math.max(0, playerLvl() - reqLevel(rawId));
  const steps = Math.floor(over / 10);
  const base = 0.18;
  // clamp so it never covers the whole bar
  return Math.max(0.06, Math.min(0.6, base * Math.pow(2, steps)));
}

function randomizeZone(customWidth){
  const width = (typeof customWidth === 'number' ? customWidth : 0.18);
  const left  = 0.12 + Math.random() * (0.76 - width);
  zoneStart = left;
  zoneEnd   = left + width;
  if (el.zone){
    el.zone.style.left  = (zoneStart*100).toFixed(0) + '%';
    el.zone.style.width = (width*100).toFixed(0) + '%';
  }
}

/* ---------------- inventory dragability ---------------- */
function ensureRawSlotsDraggable(){
  const inv = document.getElementById('inventory'); if (!inv) return;
  inv.querySelectorAll('.inv-slot').forEach(slot=>{
    const id = slot.dataset.id || '';
    if (id.startsWith('raw_') && !slot.hasAttribute('draggable')){
      slot.setAttribute('draggable','true');
    }
  });
}
(function initInvObserver(){
  const inv = document.getElementById('inventory'); if (!inv) return;
  ensureRawSlotsDraggable();
  const mo = new MutationObserver(()=> ensureRawSlotsDraggable());
  mo.observe(inv, { childList:true, subtree:true });
})();

/* ---------------- paint ---------------- */
function updateBar(){
  if (!el.bar) return;
  if (state.action?.type === 'cook' && holding){
    const now = performance.now();
    const pct = Math.max(0, Math.min(1, (now - state.action.startedAt) / (state.action.duration || 1)));
    el.bar.style.width = (pct*100).toFixed(2) + '%';
    setHint(`${state.action.label || 'Cooking'} — ${(pct*100).toFixed(0)}%`);
  } else {
    el.bar.style.width = '0%';
    setHint(pendingRawId ? `Ready: ${nameOf(pendingRawId)} — hold to cook` : 'Drop raw food here');
  }
}
export function renderCooking(){ updateBar(); }

/* -------------------- drag from inventory -------------------- */
on(document, 'dragstart', '.inv-slot', (e, slot)=>{
  const id = slot.dataset.id || '';
  if (!id.startsWith('raw_') || !(state.inventory?.[id] > 0)) return;
  dragRawId = id;
  e.dataTransfer?.setData('text/plain', id);
  e.dataTransfer?.setData('application/x-runecut-item', id);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
});

document.addEventListener('dragend', ()=>{
  if (holding && holdingMode === 'drag'){ endHold('auto'); }
  dragRawId = null;
});

['dragenter','dragover'].forEach(evt=>{
  el.fire?.addEventListener(evt, (e)=>{
    e.preventDefault();
    el.fire.classList.add('dragging');

    // Only start timing if level & mats are OK
    if (!holding && dragRawId && COOK_RECIPES[dragRawId]){
      if (canCook(state, dragRawId)){
        startHoldWith(dragRawId, 'drag');
      } else {
        setHint(cookGateReason(state, dragRawId) || 'Cannot cook this yet');
      }
    }
  });
});

el.fire?.addEventListener('dragleave', ()=>{
  el.fire.classList.remove('dragging');
});

el.fire?.addEventListener('drop', (e)=>{
  e.preventDefault();
  el.fire.classList.remove('dragging');

  if (holding && holdingMode === 'drag'){
    endHold('drag');
  } else {
    const id = e.dataTransfer?.getData('application/x-runecut-item') || e.dataTransfer?.getData('text/plain') || '';
    if (id && COOK_RECIPES[id]){
      // If under level, just message; don't arm
      if (!canCook(state, id)){
        setHint(cookGateReason(state, id) || 'Cannot cook this yet');
      } else {
        pendingRawId = id;
        randomizeZone(zoneWidthFor(id));
        updateBar();
      }
    }
  }
  dragRawId = null;
});

/* -------------------- click–hold alternative -------------------- */
el.fire?.addEventListener('pointerdown', (e)=>{
  e.preventDefault();
  el.fire.setPointerCapture?.(e.pointerId);

  // Pick armed or best raw (by highest qty)
  let id = pendingRawId;
  if (!id){
    let best=null, qty=0;
    for (const r of Object.keys(COOK_RECIPES)){
      const q = state.inventory?.[r]||0;
      if (q>qty){ qty=q; best=r; }
    }
    id = best;
    if (id){ pendingRawId = id; randomizeZone(zoneWidthFor(id)); }
  }
  if (!id) return;

  if (!canCook(state, id)){
    setHint(cookGateReason(state, id) || 'Cannot cook this yet');
    return;
  }
  startHoldWith(id, 'pointer');
});

el.fire?.addEventListener('pointerup', (e)=>{
  e.preventDefault();
  el.fire.releasePointerCapture?.(e.pointerId);
  if (holding && holdingMode === 'pointer'){
    endHold('pointer');
  }
});
el.fire?.addEventListener('pointercancel', ()=>{
  if (holding && holdingMode === 'pointer'){
    endHold('cancel');
  }
});

/* -------------------- timing core -------------------- */
/* Duration scaling: ×2 time per 6 levels UNDER (i.e., speed halves). */
function scaledDurationFor(rawId){
  const lvl = playerLvl();
  const req = reqLevel(rawId);
  const under = Math.max(0, req - lvl);
  const factor = Math.pow(2, under / 6); // continuous scaling
  return COOK_TIME_MS * factor;
}

function startHoldWith(rawId, mode){
  if (holding || state.action) return;
  if (!COOK_RECIPES[rawId] || !canCook(state, rawId)){
    setHint(cookGateReason(state, rawId) || 'Cannot cook this yet');
    return;
  }

  pendingRawId = rawId;
  randomizeZone(zoneWidthFor(rawId));

  const ok = startCook(state, rawId);
  if (!ok) return;

  // restart timer exactly now with scaled duration
  state.action.startedAt = performance.now();
  state.action.duration  = scaledDurationFor(rawId);
  state.action.endsAt    = state.action.startedAt + state.action.duration;

  holding = true;
  holdingMode = mode;
  updateBar();
}

function endHold(source){
  if (!holding || state.action?.type !== 'cook') { holding=false; return; }

  const now = performance.now();
  const pct = Math.max(0, Math.min(1, (now - state.action.startedAt) / (state.action.duration || 1)));

  let outcome = 'early';
  if (pct > zoneEnd) outcome = 'burnt';
  else if (pct >= zoneStart && pct <= zoneEnd) outcome = 'perfect';

  const res = resolveCook(state, outcome);

  if (res.ok){
    if (outcome === 'perfect' && res.cooked > 0){
      const cookedName = nameOf(res.cookedId);
      pushLog(`Cooked ${res.cooked}× ${cookedName} → +${res.xp} Cooking xp`, 'cooking');
    } else if (outcome === 'burnt'){
      pushLog(`Burnt ${nameOf(res.rawId)} — no xp`, 'cooking');
    } else {
      pushLog(`Removed too early — still raw`, 'cooking');
    }
    renderEnchanting();
    renderInventory();
    renderSkills();
    saveState(state);
  }

  holding = false;
  holdingMode = null;
  if (outcome !== 'early') pendingRawId = null;

  randomizeZone(zoneWidthFor(pendingRawId || 'raw_shrimps')); // harmless default
  updateBar();
}

// keep the bar smooth
(function raf(){
  updateBar();
  requestAnimationFrame(raf);
})();
