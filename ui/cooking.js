// /ui/cooking.js

import { state, saveNow } from '../systems/state.js';
import { cookDurationMs, canCook, startCook, finishCook, cookOnce, cookGateReason, consumeCookInputs } from '../systems/cooking.js';
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
  auto:   qs('#cookAuto'),
};

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
  const u = state.unlocks || {};
  return !!(u.autocook || u.autoCook || u.cooking_auto || u.cook_auto || el.auto || (state.ui && state.ui.autocook));
}
function isAuto(){ return hasAutoCookUnlocked() && !!(state.ui?.autocook); }
function syncAutoToggleToState(){ if (el.auto) el.auto.checked = !!(state.ui?.autocook); }
function reflectAutoUI(){ if (el.zone) el.zone.style.visibility = isAuto() ? 'hidden' : 'visible'; paint(); }

/* ---------- single session controller ---------- */
const Cook = {
  active: false,
  rawId: null,
  mode: null,           // 'drag' | 'pointer'
  startedAt: 0,
  duration: 0,          // ms
  zoneStart: 0.35,      // [0..1]
  zoneEnd: 0.53,        // [0..1]
  raf: null,
};

const FRACTION_TOL = 0.02; // ±2%

function perfectYieldCount(rawId){
  const over = Math.max(0, playerLvl() - reqLevel(rawId));
  return 1 + Math.floor(over / 10);
}

function zoneWidthFor(rawId){
  const over = Math.max(0, playerLvl() - reqLevel(rawId));
  const steps = Math.floor(over / 10);
  const base = 0.18;
  return Math.max(0.06, Math.min(0.6, base * Math.pow(2, steps)));
}
function randomizeZoneFor(rawId){
  const w = zoneWidthFor(rawId);
  const left  = 0.12 + Math.random() * (0.76 - w);
  Cook.zoneStart = left;
  Cook.zoneEnd   = left + w;
  if (el.zone){
    el.zone.style.left  = (Cook.zoneStart*100) + '%';
    el.zone.style.width = (w*100) + '%';
  }
}

function fractionNow(){
  if (!Cook.active) return 0;
  const now = performance.now();
  const p = (now - Cook.startedAt) / Math.max(1, Cook.duration);
  return Math.max(0, Math.min(1, p));
}

function startSession(rawId, mode){
  if (isAuto()) return;
  if (!COOK_RECIPES[rawId] || !canCook(state, rawId)){
    setHint(cookGateReason(state, rawId) || 'Cannot cook this yet');
    return;
  }
  if (state.action?.type === 'cook' && state.action.key !== rawId) {
    state.action = null;
  }
  if (!startCook(state, rawId)) return;

  const lvl = levelFromXp(state.cookXp || 0, XP_TABLE);
  const req = reqLevel(rawId);
  const under = Math.max(0, req - lvl);
  const factor = Math.pow(2, under / 6);

  Cook.active    = true;
  Cook.rawId     = rawId;
  Cook.mode      = mode;
  Cook.startedAt = performance.now();
  Cook.duration  = cookDurationMs(state, rawId) * factor;

  randomizeZoneFor(rawId);
  paint();
  tick();
}

function endSession(){
  if (!Cook.active) return;

  const frac = fractionNow();
  let outcome = 'early';
  if (frac > Cook.zoneEnd + FRACTION_TOL) outcome = 'burnt';
  else if (frac >= Cook.zoneStart - FRACTION_TOL && frac <= Cook.zoneEnd + FRACTION_TOL) outcome = 'perfect';

  if (outcome === 'perfect'){
    const per = perfectYieldCount(Cook.rawId);
    let cooked = 0;
    let totalXp = 0;

    for (let i = 0; i < per; i++){
      if (!canCook(state, Cook.rawId)) break;
      const res = finishCook(state, Cook.rawId);
      if (!res) break;
      cooked += 1;
      totalXp += (res.xp || 0);
    }

    if (cooked > 0){
      try { window.dispatchEvent(new CustomEvent('cook:perfect', { detail:{ rawId: Cook.rawId, count: cooked } })); } catch {}
      const cookedId = cookedIdOf(Cook.rawId);
      const qtyEach  = cookedQtyPerRaw(Cook.rawId);
      const totalQty = cooked * qtyEach;
      pushLog(`Cooked ${totalQty}× ${displayName(cookedId)} → +${totalXp} Cooking xp`, 'cooking');
      renderEnchanting(); renderInventory(); renderSkills(); saveNow();
    } else {
      pushLog(`Not enough ingredients to cook.`, 'cooking');
    }

  } else if (outcome === 'burnt'){
    if (consumeCookInputs(state, Cook.rawId)){
      pushLog(`Burnt ${displayName(Cook.rawId)} — no xp`, 'cooking');
      renderInventory(); saveNow();
    } else {
      pushLog(`Burnt attempt failed — missing ingredients`, 'cooking');
    }
  } else {
    pushLog(`Removed too early — still raw`, 'cooking');
  }

  Cook.active = false;
  Cook.rawId = null;
  Cook.mode = null;
  state.action = null;
  paint();
}

/* ---------- paint & loop ---------- */
function paint(){
  if (!el.bar){
    return;
  }
  if (isAuto()){
    el.bar.style.width = '0%';
    setHint('Auto-cook: drop raw food to cook instantly');
    return;
  }
  if (Cook.active){
    const pct = (fractionNow()*100);
    el.bar.style.width = pct + '%';
    setHint(`Cook ${displayName(Cook.rawId)} — ${pct.toFixed(0)}%`);
  } else {
    el.bar.style.width = '0%';
    setHint('Drop raw food here');
  }
}
function tick(){
  if (!Cook.active) return;
  paint();
  Cook.raf = requestAnimationFrame(tick);
}

/* ---------- drag & drop ---------- */
let dragRawId = null;

on(document, 'mouseenter', '.inv-slot', (_e, slot)=>{
  if (!slot.hasAttribute('draggable')) slot.setAttribute('draggable', 'true');
});
on(document, 'mouseenter', '.inv-slot img', (_e, img)=>{
  img.setAttribute('draggable', 'false');
});

on(document, 'dragstart', '.inv-slot', (_e, slot)=>{
  const id = slot.dataset.id || '';
  if (!id.startsWith('raw_') || !(state.inventory?.[id] > 0)) return;
  dragRawId = baseId(id);
});

document.addEventListener('dragend', ()=>{
  if (Cook.active && Cook.mode === 'drag'){
    endSession();
  }
  dragRawId = null;
});

['dragenter','dragover'].forEach(evt=>{
  el.fire?.addEventListener(evt, (e)=>{
    e.preventDefault();
    try { if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; } catch {}
    const raw = dragRawId;
    if (!raw || !COOK_RECIPES[raw]) return;

    if (isAuto()){
      const reason = cookGateReason(state, raw);
      const cookedId = cookedIdOf(raw);
      setHint(reason ? reason : `Release to auto-cook 1× ${displayName(cookedId)}`);
      return;
    }

    if (!Cook.active && canCook(state, raw)){
      startSession(raw, 'drag');
    } else if (!Cook.active){
      setHint(cookGateReason(state, raw) || 'Cannot cook this yet');
    }
  });
});

el.fire?.addEventListener('drop', (e)=>{
  e.preventDefault();
  const raw = (e.dataTransfer?.getData('application/x-runecut-item')
            || e.dataTransfer?.getData('text/plain')
            || dragRawId || '').trim();
  if (!raw || !COOK_RECIPES[raw]) { dragRawId = null; return; }

  if (isAuto()){
    const reason = cookGateReason(state, raw);
    if (reason){
      setHint(reason);
    } else {
      const res = cookOnce(state, raw);
      if (res){
        const cookedId = cookedIdOf(raw);
        const qty = cookedQtyPerRaw(raw);
        pushLog(`Cooked ${qty}× ${displayName(cookedId)} → +${res.xp} Cooking xp`, 'cooking');
        renderEnchanting(); renderInventory(); renderSkills(); saveNow();
      }
      setHint('Auto-cook: drop raw food to cook instantly');
    }
    dragRawId = null;
    return;
  }

  dragRawId = null;
});

/* ---------- click–hold alternative ---------- */
el.fire?.addEventListener('pointerdown', (e)=>{
  e.preventDefault();
  el.fire.setPointerCapture?.(e.pointerId);

  if (isAuto()){
    let best=null, qty=0;
    for (const raw of Object.keys(COOK_RECIPES)){
      const q = state.inventory?.[raw]||0;
      if (q>qty){ qty=q; best=raw; }
    }
    if (!best) return;
    const reason = cookGateReason(state, best);
    if (reason){ setHint(reason); return; }
    const res = cookOnce(state, best);
    if (res){
      const cookedId = cookedIdOf(best);
      const q = cookedQtyPerRaw(best);
      pushLog(`Cooked ${q}× ${displayName(cookedId)} → +${res.xp} Cooking xp`, 'cooking');
      renderEnchanting(); renderInventory(); renderSkills(); saveNow();
    }
    return;
  }

  if (!Cook.active){
    let best=null, qty=0;
    for (const raw of Object.keys(COOK_RECIPES)){
      const q = state.inventory?.[raw]||0;
      if (q>qty){ qty=q; best=raw; }
    }
    if (!best) return;
    if (!canCook(state, best)){ setHint(cookGateReason(state, best) || 'Cannot cook this yet'); return; }
    startSession(best, 'pointer');
  }
});

el.fire?.addEventListener('pointerup', (e)=>{
  e.preventDefault();
  el.fire.releasePointerCapture?.(e.pointerId);
  if (Cook.active && Cook.mode === 'pointer'){ endSession(); }
});
el.fire?.addEventListener('pointercancel', ()=>{
  if (Cook.active && Cook.mode === 'pointer'){ endSession(); }
});

/* ---------- auto toggle wiring ---------- */
state.ui = state.ui || {};
if (el.auto){
  syncAutoToggleToState();
  reflectAutoUI();
  el.auto.addEventListener('change', ()=>{
    state.ui.autocook = !!el.auto.checked;
    saveNow();
    reflectAutoUI();
  });
}

/* ---------- frame loop ---------- */
(function raf(){ paint(); requestAnimationFrame(raf); })();

/* ---------- PUBLIC API (used by app.js) ---------- */
export function renderCooking(){ paint(); }
