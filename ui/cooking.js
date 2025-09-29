// /ui/cooking.js — unified with systems/cooking.js helpers

import { state, saveNow } from '../systems/state.js';
import { cookDurationMs, canCook, startCook, finishCook, cookOnce, cookGateReason } from '../systems/cooking.js';
import { COOK_RECIPES } from '../data/cooking.js';
import { qs, on } from '../utils/dom.js';
import { pushLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderEnchanting } from './enchanting.js';
import { renderSkills } from './skills.js';
import { buildXpTable, levelFromXp } from '../systems/xp.js';

const XP_TABLE = buildXpTable();

const el = {
  fire:   qs('#cookFire'),
  bar:    qs('#cookBar'),
  zone:   qs('#cookPerfectZone'),
  hint:   qs('#cookHint'),
  auto:   qs('#cookAuto'),   // present in DOM only if unlocked / shown
};

/* ---------- small helpers ---------- */
function baseId(id){ return String(id||'').split('@')[0]; }
function cookedIdOf(raw){ return COOK_RECIPES[raw]?.output?.id || (COOK_RECIPES[raw]?.outputs?.[0]?.id) || null; }
function cookedQtyPerRaw(raw){
  if (COOK_RECIPES[raw]?.output?.qty) return COOK_RECIPES[raw].output.qty|0;
  if (COOK_RECIPES[raw]?.outputs?.[0]?.qty) return COOK_RECIPES[raw].outputs[0].qty|0;
  return 1;
}
function displayName(id=''){ return baseId(id).replace(/^raw_/,'').replace(/_/g,' ').replace(/\b\w/g, m=>m.toUpperCase()); }
function playerLvl(){ return levelFromXp(state.cookXp || 0, XP_TABLE); }
function reqLevel(rawId){ const r = COOK_RECIPES[rawId] || {}; return r.level ?? r.lvl ?? 1; }
function setHint(s){ if (el.hint) el.hint.textContent = s; }

function hasAutoCookUnlocked(){
  // permissive: existing flags, presence of checkbox, or persisted UI toggle
  const u = state.unlocks || {};
  return !!(u.autocook || u.autoCook || u.cooking_auto || u.cook_auto || el.auto || (state.ui && state.ui.autocook));
}
function isAuto(){ return hasAutoCookUnlocked() && !!(state.ui?.autocook); }
function syncAutoToggleToState(){
  if (!el.auto) return;
  el.auto.checked = !!(state.ui?.autocook);
}
function reflectAutoUI(){
  if (el.zone) el.zone.style.visibility = isAuto() ? 'hidden' : 'visible';
  updateBar();
}

/* ---------- golden zone ---------- */
let pendingRawId = null;
let dragRawId = null;
let holding = false;
let holdingMode = null;
let zoneStart = 0.35, zoneEnd = 0.53;

function zoneWidthFor(rawId){
  const over = Math.max(0, playerLvl() - reqLevel(rawId));
  const steps = Math.floor(over / 10);
  const base = 0.18;
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

/* ---------- interrupt helper ---------- */
function cancelCooking(){
  if (state.action?.type === 'cook') state.action = null; // no reward
  holding = false;
  holdingMode = null;
  updateBar();
}

/* ---------- paint ---------- */
function updateBar(){
  if (!el.bar) return;
  if (isAuto()){
    el.bar.style.width = '0%';
    setHint('Auto-cook: drop raw food to cook instantly');
    return;
  }
  if (state.action?.type === 'cook' && holding){
    const now = performance.now();
    const pct = Math.max(0, Math.min(1, (now - state.action.startedAt) / Math.max(1, (state.action.duration||1))));
    el.bar.style.width = (pct*100).toFixed(2) + '%';
    setHint(`${state.action.label || 'Cooking'} — ${(pct*100).toFixed(0)}%`);
  } else if (state.action?.type === 'cook'){
    // show idle progress if an action was armed but not currently holding
    const now = performance.now();
    const pct = Math.max(0, Math.min(1, (now - (state.action.startedAt||now)) / Math.max(1, (state.action.duration||1))));
    el.bar.style.width = (pct*100).toFixed(2) + '%';
    setHint(state.action.label || 'Cooking');
  } else {
    el.bar.style.width = '0%';
    setHint(pendingRawId ? `Ready: ${displayName(pendingRawId)} — hold to cook` : 'Drop raw food here');
  }
}
export function renderCooking(){ updateBar(); }

/* ---------- drag from inventory ---------- */
on(document, 'dragstart', '.inv-slot', (e, slot)=>{
  const id = slot.dataset.id || '';
  if (!id.startsWith('raw_') || !(state.inventory?.[id] > 0)) return;
  dragRawId = baseId(id);
  e.dataTransfer?.setData('text/plain', dragRawId);
  e.dataTransfer?.setData('application/x-runecut-item', dragRawId);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
});

document.addEventListener('dragend', ()=>{
  if (holding && holdingMode === 'drag'){ endHold(); }
  dragRawId = null;
});

['dragenter','dragover'].forEach(evt=>{
  el.fire?.addEventListener(evt, (e)=>{
    e.preventDefault();
    el.fire.classList.add('dragging');

    const raw = dragRawId;
    if (!raw || !COOK_RECIPES[raw]) return;

    if (isAuto()){
      const reason = cookGateReason(state, raw);
      const cookedId = cookedIdOf(raw);
      setHint(reason ? reason : `Release to auto-cook 1× ${displayName(cookedId)}`);
      return;
    }

    if (!holding && canCook(state, raw)){
      pendingRawId = raw;
      randomizeZone(zoneWidthFor(raw));
      // ⬇ allow interrupt: if another cook is active, cancel it
      if (state.action?.type === 'cook' && state.action.key !== raw) cancelCooking();
      startHoldWith(raw, 'drag');
    } else if (!holding){
      setHint(cookGateReason(state, raw) || 'Cannot cook this yet');
    }
  });
});

el.fire?.addEventListener('dragleave', ()=>{
  el.fire.classList.remove('dragging');
});

el.fire?.addEventListener('drop', (e)=>{
  e.preventDefault();
  el.fire.classList.remove('dragging');

  const raw = (e.dataTransfer?.getData('application/x-runecut-item') || e.dataTransfer?.getData('text/plain') || dragRawId || '').trim();
  if (!raw || !COOK_RECIPES[raw]){ dragRawId = null; return; }

  if (isAuto()){
    const reason = cookGateReason(state, raw);
    if (reason){
      setHint(reason);
    } else {
      const res = cookOnce(state, raw); // consume + grant + xp
      if (res){
        const cookedId = cookedIdOf(raw);
        const qty = cookedQtyPerRaw(raw);
        pushLog(`Auto-cooked ${qty}× ${displayName(cookedId)} → +${res.xp} Cooking xp`, 'cooking');
        renderEnchanting(); renderInventory(); renderSkills(); saveNow();
      }
      setHint('Auto-cook: drop raw food to cook instantly');
    }
    dragRawId = null;
    return;
  }

  // If we were holding and drop switches target, cancel and re-arm
  if (holding && holdingMode === 'drag' && pendingRawId !== raw){
    cancelCooking();
  }
  // interrupt if another cook is active
  if (state.action?.type === 'cook' && state.action.key !== raw) cancelCooking();

  pendingRawId = raw;
  randomizeZone(zoneWidthFor(raw));
  startHoldWith(raw, 'drag');
  dragRawId = null;
});

/* ---------- click–hold alternative ---------- */
el.fire?.addEventListener('pointerdown', (e)=>{
  e.preventDefault();
  el.fire.setPointerCapture?.(e.pointerId);

  const auto = isAuto();
  let id = pendingRawId;

  if (!id){
    // pick best available raw (highest qty)
    let best=null, qty=0;
    for (const raw of Object.keys(COOK_RECIPES)){
      const q = state.inventory?.[raw]||0;
      if (q>qty){ qty=q; best=raw; }
    }
    id = best;
    if (!auto && id){ pendingRawId = id; randomizeZone(zoneWidthFor(id)); }
  }
  if (!id) return;

  if (auto){
    const reason = cookGateReason(state, id);
    if (reason){ setHint(reason); return; }
    const res = cookOnce(state, id);
    if (res){
      const cookedId = cookedIdOf(id);
      const qty = cookedQtyPerRaw(id);
      pushLog(`Auto-cooked ${qty}× ${displayName(cookedId)} → +${res.xp} Cooking xp`, 'cooking');
      renderEnchanting(); renderInventory(); renderSkills(); saveNow();
    }
    return;
  }

  if (!canCook(state, id)){
    setHint(cookGateReason(state, id) || 'Cannot cook this yet');
    return;
  }

  // ⬇ allow interrupt: if another cook is active, cancel it
  if (state.action?.type === 'cook' && state.action.key !== id) cancelCooking();
  startHoldWith(id, 'pointer');
});

el.fire?.addEventListener('pointerup', (e)=>{
  e.preventDefault();
  el.fire.releasePointerCapture?.(e.pointerId);
  if (holding && holdingMode === 'pointer'){
    endHold();
  }
});
el.fire?.addEventListener('pointercancel', ()=>{
  if (holding && holdingMode === 'pointer'){
    endHold();
  }
});

/* ---------- timing core ---------- */
function scaledDurationFor(rawId){
  const lvl = playerLvl();
  const req = reqLevel(rawId);
  const under = Math.max(0, req - lvl);
  const factor = Math.pow(2, under / 6);
  // use system duration (already floored via MIN_COOK_TIME_MS) then apply difficulty
  return cookDurationMs(state, rawId) * factor;
}
function startHoldWith(rawId, mode){
  if (isAuto()) return;

  // ⬇ remove the old blocker; allow cancel+restart
  if (!COOK_RECIPES[rawId] || !canCook(state, rawId)){
    setHint(cookGateReason(state, rawId) || 'Cannot cook this yet');
    return;
  }
  // if something else is cooking, cancel it first
  if (state.action?.type === 'cook' && state.action.key !== rawId) cancelCooking();
  if (holding) cancelCooking();

  const ok = startCook(state, rawId);
  if (!ok) return;
  state.action.startedAt = performance.now();
  state.action.duration  = scaledDurationFor(rawId);
  state.action.endsAt    = state.action.startedAt + state.action.duration;
  holding = true;
  holdingMode = mode;
  updateBar();
}
function endHold(){
  if (!holding || state.action?.type !== 'cook') { holding=false; return; }
  const now = performance.now();
  const pct = Math.max(0, Math.min(1, (now - state.action.startedAt) / Math.max(1, (state.action.duration || 1))));
  let outcome = 'early';
  if (pct > zoneEnd) outcome = 'burnt';
  else if (pct >= zoneStart && pct <= zoneEnd) outcome = 'perfect';

  if (outcome === 'perfect'){
    const res = finishCook(state, state.action?.key);
    if (res){
      try { window.dispatchEvent(new CustomEvent('cook:perfect', { detail:{ rawId: res.id } })); } catch {}
      const cookedId = cookedIdOf(res.id);
      const qty = cookedQtyPerRaw(res.id);
      pushLog(`Cooked ${qty}× ${displayName(cookedId)} → +${res.xp} Cooking xp`, 'cooking');
      renderEnchanting(); renderInventory(); renderSkills(); saveNow();
    }
  } else if (outcome === 'burnt'){
    pushLog(`Burnt ${displayName(state.action?.key)} — no xp`, 'cooking');
  } else {
    pushLog(`Removed too early — still raw`, 'cooking');
  }

  holding = false; holdingMode = null;
  if (!isAuto()){
    pendingRawId = null;
    randomizeZone(zoneWidthFor('raw_shrimps'));
  }
  state.action = null;
  updateBar();
}

/* ---------- smooth bar ---------- */
(function raf(){ updateBar(); requestAnimationFrame(raf); })();

/* ---------- toggle wiring ---------- */
state.ui = state.ui || {};
if (el.auto){
  syncAutoToggleToState();
  reflectAutoUI();
  el.auto.addEventListener('change', ()=>{
    state.ui.autocook = !!el.auto.checked;
    saveNow();
    reflectAutoUI();
  });
} else {
  // Do NOT force-disable autocook when checkbox isn't present
}
