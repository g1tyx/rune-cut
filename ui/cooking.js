import { state, saveState } from '../systems/state.js';
import { COOK_TIME_MS, canCook, startCook, resolveCook, cookGateReason, cookItems } from '../systems/cooking.js';
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
  auto:   qs('#cookAuto'),   // present in DOM only if unlocked
};

/* ---------- small helpers ---------- */
function baseId(id){ return String(id||'').split('@')[0]; }
function cookedIdOf(raw){ return COOK_RECIPES[raw]?.output?.id || null; }
function cookedQtyPerRaw(raw){ return COOK_RECIPES[raw]?.output?.qty || 1; }
function displayName(id=''){ return baseId(id).replace(/^raw_/,'').replace(/_/g,' ').replace(/\b\w/g, m=>m.toUpperCase()); }
function playerLvl(){ return levelFromXp(state.cookXp || 0, XP_TABLE); }
function reqLevel(rawId){ const r = COOK_RECIPES[rawId] || {}; return r.level ?? r.lvl ?? 1; }
function setHint(s){ if (el.hint) el.hint.textContent = s; }

function hasAutoCookUnlocked(){ return !!(state.unlocks?.autocook); }
function isAuto(){
  // Auto mode only if feature unlocked AND toggle exists+checked in UI state
  if (!hasAutoCookUnlocked()) return false;
  return !!(state.ui?.autocook);
}
function syncAutoToggleToState(){
  if (!el.auto) return;
  if (!hasAutoCookUnlocked()){
    // If UI accidentally has it, hide/remove so it "only exists when unlocked"
    try { el.auto.closest('label')?.remove(); } catch {}
    return;
  }
  el.auto.checked = !!(state.ui?.autocook);
}
function reflectAutoUI(){
  if (el.zone) el.zone.style.visibility = isAuto() ? 'hidden' : 'visible';
  updateBar();
}
function setAuto(v){
  if (!hasAutoCookUnlocked()) return;
  state.ui = state.ui || {};
  state.ui.autocook = !!v;
  saveState(state);
  syncAutoToggleToState();
  if (isAuto()){
    // abort any manual timing
    if (state.action?.type === 'cook') state.action = null;
    holding = false; holdingMode = null;
  }
  reflectAutoUI();
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
    const pct = Math.max(0, Math.min(1, (now - state.action.startedAt) / (state.action.duration || 1)));
    el.bar.style.width = (pct*100).toFixed(2) + '%';
    setHint(`${state.action.label || 'Cooking'} — ${(pct*100).toFixed(0)}%`);
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
      const cookedCount = cookItems(state, raw, 1); // returns cooked items produced
      if (cookedCount > 0){
        const cookedId = cookedIdOf(raw);
        const xp = (COOK_RECIPES[raw]?.xp || 0) * 1; // xp is per-raw (we used 1 raw)
        pushLog(`Auto-cooked ${cookedCount}× ${displayName(cookedId)} → +${xp} Cooking xp`, 'cooking');
        renderEnchanting(); renderInventory(); renderSkills(); saveState(state);
        // keep armed for repeated drags
      }
      setHint('Auto-cook: drop raw food to cook instantly');
    }
    dragRawId = null;
    return;
  }

  if (holding && holdingMode === 'drag'){
    endHold();
  } else {
    pendingRawId = raw;
    randomizeZone(zoneWidthFor(raw));
    updateBar();
  }
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
    const cookedCount = cookItems(state, id, 1);
    if (cookedCount > 0){
      const cookedId = cookedIdOf(id);
      const xp = (COOK_RECIPES[id]?.xp || 0) * 1;
      pushLog(`Auto-cooked ${cookedCount}× ${displayName(cookedId)} → +${xp} Cooking xp`, 'cooking');
      renderEnchanting(); renderInventory(); renderSkills(); saveState(state);
    }
    return;
  }

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
  return COOK_TIME_MS * factor;
}
function startHoldWith(rawId, mode){
  if (isAuto()) return;
  if (holding || state.action) return;
  if (!COOK_RECIPES[rawId] || !canCook(state, rawId)){
    setHint(cookGateReason(state, rawId) || 'Cannot cook this yet');
    return;
  }
  pendingRawId = rawId;
  randomizeZone(zoneWidthFor(rawId));
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
  const pct = Math.max(0, Math.min(1, (now - state.action.startedAt) / (state.action.duration || 1)));
  let outcome = 'early';
  if (pct > zoneEnd) outcome = 'burnt';
  else if (pct >= zoneStart && pct <= zoneEnd) outcome = 'perfect';
  const res = resolveCook(state, outcome);
  if (res.ok){
    if (outcome === 'perfect' && res.cooked > 0){
      const cookedName = displayName(res.cookedId);
      pushLog(`Cooked ${res.cooked}× ${cookedName} → +${res.xp} Cooking xp`, 'cooking');
    } else if (outcome === 'burnt'){
      const rawName = displayName(res.rawId);
      pushLog(`Burnt ${rawName} — no xp`, 'cooking');
    } else {
      pushLog(`Removed too early — still raw`, 'cooking');
    }
    renderEnchanting(); renderInventory(); renderSkills(); saveState(state);
  }
  holding = false; holdingMode = null;
  if (!isAuto()){
    pendingRawId = null;
    randomizeZone(zoneWidthFor('raw_shrimps'));
  }
  updateBar();
}

/* ---------- smooth bar ---------- */
(function raf(){ updateBar(); requestAnimationFrame(raf); })();

/* ---------- toggle wiring (no HTML changes) ---------- */
if (el.auto){
  syncAutoToggleToState();
  reflectAutoUI();
  el.auto.addEventListener('change', ()=> setAuto(!!el.auto.checked));
} else {
  // If toggle isn't present, make sure auto mode can't be entered accidentally
  state.ui = state.ui || {}; state.ui.autocook = false;
}
