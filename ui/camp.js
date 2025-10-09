// /ui/camp.js
import { qs } from '../utils/dom.js';
import { state, saveNow } from '../systems/state.js';
import { ITEMS } from '../data/items.js';
import {
  buildBuildings,     // -> first tier of each allowed family (hut/campfire), hides if already placed
  canBuild,
  buildNow,
  improveBuilding,
  buildingDef,
} from '../systems/construction.js';
import { CONSTRUCT_XP } from '../data/construction.js';
import { pushLog } from './logs.js';
import { renderSkills } from './skills.js';

let inited = false;
let gameRoot = null;
let lastPanelId = null;
const BODY_CAMP_CLASS = 'camp-mode';

/* ---------------- unlock gating (325 total + 10k) ---------------- */
function getTotalLevelFromDom(){
  const el = document.getElementById('totalLevel');
  const n = el ? parseInt(el.textContent, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}
function updateCampTabLockUI(){
  const btn = document.getElementById('tabCamp') || document.getElementById('btnCamp');
  if (!btn) return;
  const unlocked = !!(state.ui && state.ui.campUnlocked);
  btn.textContent = unlocked ? 'Camp' : 'Camp 🔒';
  btn.title = unlocked
    ? 'Open your Camp'
    : 'Reach Total Level 325 and pay 10,000g to unlock.';
}
function ensureCampUnlockedFlow(){
  if (!state.ui) state.ui = {};
  if (state.ui.campUnlocked) return true;

  const total = getTotalLevelFromDom();
  const NEED_LEVEL = 325;
  const COST = 10_000;

  if (total < NEED_LEVEL){
    alert(`Camp locked.\nNeed Total Level ${NEED_LEVEL} (you have ${total}).`);
    return false;
  }
  if ((state.gold|0) < COST){
    alert(`Camp unlock costs 10,000 gold.\nYou have ${state.gold|0}g.`);
    return false;
  }
  if (!confirm(`Unlock Camp for 10,000 gold?`)) return false;

  state.gold = Math.max(0, (state.gold|0) - COST);
  state.ui.campUnlocked = true;
  saveNow();
  try { window.dispatchEvent(new Event('gold:change')); } catch {}
  updateCampTabLockUI();
  return true;
}

/* ---------------- tiny CSS ---------------- */
function injectCampCSS(){
  if (document.getElementById('campTinyCSS')) return;
  const css = document.createElement('style');
  css.id = 'campTinyCSS';
  css.textContent = `
    #camp #campHud, #camp #campPalette, #camp #campInspector { z-index:100; position:absolute; }

    #camp .camp-back{
      appearance:none; border:0; border-radius:12px;
      padding:8px 14px; font-weight:600;
      background:rgba(0,0,0,.45); color:#fff;
      backdrop-filter: blur(4px);
      cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.25);
      transition: transform .08s ease, background .15s ease, box-shadow .15s ease;
    }
    #camp .camp-back:hover{ background:rgba(0,0,0,.55); box-shadow:0 4px 14px rgba(0,0,0,.3); }
    #camp .camp-back:active{ transform: translateY(1px) scale(0.99); }

    .camp-card {
      background: rgba(255,255,255,.92);
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 12px;
      padding: 10px 12px;
      margin: 8px 0;
      box-shadow: 0 6px 14px rgba(0,0,0,.08);
    }
    .camp-card .title { color:#1b2a3a; font-weight:700; margin-bottom:6px; }
    .camp-card .muted { color:#354655; font-size:12px; margin-bottom:8px; white-space:pre-line; }
    .camp-card .btn-primary {
      appearance:none; border:0; border-radius:10px; padding:6px 10px; font-weight:600; cursor:pointer;
      background:#1e90ff; color:#fff; box-shadow:0 2px 8px rgba(30,144,255,.35);
    }
    .camp-card .btn-primary[disabled]{ opacity:.5; cursor:not-allowed; }
    .camp-card[draggable="true"]{ cursor:grab; }
    .camp-card.dragging{ opacity:.7; cursor:grabbing; }

    #camp #campEntities{ position:absolute; inset:0; z-index:60; pointer-events:none; }
    #camp .camp-entity{
      position:absolute;
      bottom:92px;
      transform: translateX(-50%);
      pointer-events:auto;
      user-select:none;
      touch-action:none;
      cursor:grab;
    }
    #camp .camp-entity.dragging{ cursor:grabbing; }
    #camp .camp-entity img{
      display:block;
      width:clamp(128px, 22vw, 380px);
      height:auto;
      image-rendering: pixelated;
      pointer-events:none;
    }
    #camp .camp-entity .label{
      margin-top:4px; text-align:center; font-weight:700; font-size:12px;
      color:#1b2a3a; text-shadow:0 1px 2px rgba(255,255,255,.75);
      pointer-events:none;
    }

    #campInspector .row{ display:flex; align-items:center; gap:8px; margin:8px 0; }
    #campInspector .btn { appearance:none; border:0; border-radius:10px; padding:6px 10px; font-weight:600; cursor:pointer; }
    #campInspector .btn.upgrade{ background:#16a34a; color:#fff; }
    #campInspector .btn.upgrade[disabled]{ opacity:.5; cursor:not-allowed; }

    /* XP toast */
    #constructXpToast{
      position:absolute; top:12px; right:12px; z-index:120;
      background:rgba(22,163,74,.1); border:1px solid rgba(22,163,74,.35); color:#115e35;
      padding:8px 12px; border-radius:10px; font-weight:800; display:none;
      box-shadow:0 4px 16px rgba(0,0,0,.12);
    }
  `;
  document.head.appendChild(css);
}

/* ---------------- scaffold ---------------- */
function ensureCampDOM(){
  const camp = document.getElementById('camp');
  if (!camp) return;

  if (!camp.querySelector('#campHud')){
    const hud = document.createElement('header');
    hud.className = 'camp-hud';
    hud.id = 'campHud';
    hud.style.cssText = 'top:12px; left:12px; right:12px; display:flex; gap:12px; position:absolute;';
    camp.appendChild(hud);
  }
  if (!camp.querySelector('#campPalette')){
    const pal = document.createElement('aside');
    pal.className = 'camp-palette';
    pal.id = 'campPalette';
    pal.style.cssText = 'left:12px; top:56px; width:280px;';
    camp.appendChild(pal);
  }
  if (!camp.querySelector('#campInspector')){
    const insp = document.createElement('aside');
    insp.className = 'camp-inspector';
    insp.id = 'campInspector';
    insp.style.cssText = 'right:12px; top:56px; width:300px;';
    camp.appendChild(insp);
  }
  if (!camp.querySelector('#campEntities')){
    const ents = document.createElement('div');
    ents.id = 'campEntities';
    ents.className = 'camp-entities';
    camp.appendChild(ents);
  }

  if (!camp.querySelector('#constructXpToast')){
    const t = document.createElement('div');
    t.id = 'constructXpToast';
    t.textContent = '+0 Construction xp';
    camp.appendChild(t);
  }

  renderBackButton();
}
function renderBackButton(){
  const hud = document.getElementById('campHud');
  if (!hud) return;
  let btn = hud.querySelector('#campBackBtn');
  if (!btn){
    btn = document.createElement('button');
    btn.id = 'campBackBtn';
    btn.className = 'camp-back';
    btn.type = 'button';
    btn.textContent = '← Back';
    hud.prepend(btn);
  }
  btn.onclick = leaveCamp;
}

/* ---------------- helpers ---------------- */
function effectLine(eff){
  if (!eff) return '';
  switch (eff.type){
    case 'afk_extend':         return `AFK +${eff.seconds || 0}s`;
    case 'auto_cook':          return `Auto-cook +${eff.seconds || 0}s`;
    case 'craft_batch_max':    return `Batch Craft up to ${eff.max === Infinity ? '∞' : eff.max}`;
    case 'forge_batch_max':    return `Batch Forge up to ${eff.max === Infinity ? '∞' : eff.max}`;   // ⬅ NEW
    case 'alchemy_batch_max':  return `Batch Alchemy up to ${eff.max === Infinity ? '∞' : eff.max}`; // ⬅ NEW
    default: return '';
  }
}

function reqLine(recipe=[]){
  if (!Array.isArray(recipe) || !recipe.length) return 'No cost';
  return recipe
    .map(r => {
      const item = ITEMS[r.id];
      const name = item?.name || r.name || r.id;
      return `${r.qty}× ${name}`;
    })
    .join(' · ');
}
function baseIdOf(id){ return String(id).replace(/_t\d+$/,''); }
function tierOf(id){ const m = String(id).match(/_t(\d+)$/); return m ? parseInt(m[1],10) : null; }
function spriteForPlaced(p){
  const def = buildingDef(p.id) || {};
  if (p.sprite) return p.sprite;
  if (def.sprite) return def.sprite;
  return `assets/camp/${baseIdOf(p.id)}.png`;
}
function sizeFor(id){
  const def = buildingDef(id) || {};
  if (def.size && (def.size.w || def.size.h)) return { w:def.size.w|0, h:def.size.h|0, scale:null };
  if (typeof def.scale === 'number') return { w:null, h:null, scale:def.scale };
  return { w:null, h:null, scale:null };
}
function showXpToast(xp){
  const t = document.getElementById('constructXpToast');
  if (!t) return;
  t.textContent = `+${xp} Construction xp`;
  t.style.display = 'block';
  t.animate([{transform:'translateY(0)', opacity:1},{transform:'translateY(-6px)', opacity:1},{opacity:0}], {duration:1200});
  setTimeout(()=>{ t.style.display='none'; }, 1150);
}

/* ---- grid helpers ---- */
function campGrid(){
  const g = state.camp || {};
  return { W: g.gridW || 36, H: g.gridH || 12 };
}
function placedList(){
  const p = state.camp?.placed;
  return Array.isArray(p) ? p : [];
}
function gridToCssPos(x, y){
  const { W, H } = campGrid();
  const gx = Math.max(0, Math.min(W, (x|0)));
  const gy = Math.max(0, Math.min(H, (y|0)));
  return { leftPct: (gx / W) * 100, bottomPct: (gy / H) * 100 };
}
function buildingGridWidth(id){
  const def = buildingDef(id) || {};
  if (def.size?.w){
    if (def.size.w >= 300) return 5;
    if (def.size.w >= 200) return 3;
    return 2;
  }
  const nm = (def.name || id).toLowerCase();
  if (nm.includes('hut')) return 5;
  if (nm.includes('fire')) return 2;
  return 3;
}
function slotFree(x, width, ignoreIdx = -1){
  const L = placedList();
  const pad = 1;
  const left = x - pad;
  const right = x + width + pad - 1;
  for (let i=0; i<L.length; i++){
    if (i === ignoreIdx) continue;
    const p = L[i];
    const w = buildingGridWidth(p.id);
    const l2 = (p.x|0) - pad;
    const r2 = (p.x|0) + w + pad - 1;
    if (!(right < l2 || r2 < left)) return false;
  }
  return true;
}
function chooseFreeX(id){
  const { W } = campGrid();
  const width = buildingGridWidth(id);
  const L = placedList();
  if (L.length === 0){
    return Math.max(0, Math.min(W - width, Math.round((W - width)/2)));
  }
  const guess = Math.round(((L.length + 1) / (L.length + 2)) * (W - width));
  const clampGuess = (v)=> Math.max(0, Math.min(W - width, v|0));
  let x = clampGuess(guess);
  if (slotFree(x, width)) return x;
  for (let d = 1; d < W; d++){
    const left = clampGuess(guess - d);
    if (slotFree(left, width)) return left;
    const right = clampGuess(guess + d);
    if (slotFree(right, width)) return right;
  }
  return 0;
}
function nudgeToFreeX(id, desiredX, ignoreIdx = -1){
  const { W } = campGrid();
  const width = buildingGridWidth(id);
  const clampX = (v)=> Math.max(0, Math.min(W - width, v|0));
  let x = clampX(desiredX);
  if (slotFree(x, width, ignoreIdx)) return x;
  for (let d = 1; d < W; d++){
    const left = clampX(x - d);
    if (slotFree(left, width, ignoreIdx)) return left;
    const right = clampX(x + d);
    if (slotFree(right, width, ignoreIdx)) return right;
  }
  return x;
}

/* ---------------- palette (first tier per allowed family) ---------------- */
function renderCampPalette(){
  const pal = document.getElementById('campPalette');
  if (!pal) return;

  const defs = (typeof buildBuildings === 'function' ? buildBuildings(state) : []) || [];
  if (!defs.length){
    pal.innerHTML = `<div class="camp-card"><div class="muted">No buildings available.</div></div>`;
    return;
  }

  pal.innerHTML = defs.map(d=>{
    const gate = canBuild(state, d.id);
    const dis  = gate.ok ? '' : 'disabled';
    const why  = gate.ok ? '' : (gate.reason === 'mats' ? 'Missing materials' : (gate.reason || 'Locked'));
    const effs = Array.isArray(d.effects) ? d.effects.map(effectLine).filter(Boolean).join(' · ') : '';
    const lines = [ reqLine(d.recipe), effs || '' ].filter(Boolean).join('\n');
    return `
      <div class="camp-card" data-id="${d.id}" draggable="true" aria-grabbed="false">
        <div class="title">${d.name || d.id}</div>
        <div class="muted">${lines}</div>
        <button class="btn-primary" data-build="${d.id}" ${dis} title="${why}">Build</button>
      </div>
    `;
  }).join('');

  // Button click (fallback/non-DnD)
  pal.querySelectorAll('button[data-build]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-build');
      const def = buildingDef(id);
      if (!def) return;
      const gate = canBuild(state, id);
      if (!gate.ok) { try { window.showTip?.(gate.reason || 'Cannot build'); } catch {} ; return; }

      const x = chooseFreeX(id);
      const res = buildNow(state, id, { x, y:0 }); // instant build (stores sprite)
      if (res?.ok){
        const xp = Math.max(1, CONSTRUCT_XP(id)|0);
        pushLog(`Built ${def.name || id} → +${xp} Construction xp`, 'construction');
        showXpToast(xp);
        saveNow();
        renderSkills();
        renderCamp(); // refresh palette, entities, inspector
      }
    });
  });

  // DRAG FROM PALETTE → DROP ON CAMP
  const ents = document.getElementById('campEntities');
  const camp = document.getElementById('camp');

  pal.querySelectorAll('.camp-card').forEach(card=>{
    const id = card.getAttribute('data-id');
    card.addEventListener('dragstart', (e)=>{
      card.classList.add('dragging');
      e.dataTransfer?.setData('text/plain', id);
      e.dataTransfer?.setData('application/x-runecut-build', id);
      e.dataTransfer?.setDragImage?.(card, 20, 10);
    });
    card.addEventListener('dragend', ()=> card.classList.remove('dragging'));
  });

  [ents, camp].forEach(el=>{
    el?.addEventListener('dragover', (e)=>{
      e.preventDefault();
    });
    el?.addEventListener('drop', (e)=>{
      e.preventDefault();
      const id = e.dataTransfer?.getData('application/x-runecut-build') || e.dataTransfer?.getData('text/plain');
      if (!id) return;
      const def = buildingDef(id); if (!def) return;

      const gate = canBuild(state, id);
      if (!gate.ok){ try { window.showTip?.(gate.reason || 'Cannot build'); } catch {}; return; }

      // Compute desired X from pointer
      const rect = camp.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const { W } = campGrid();
      const desiredX = Math.round(pct * W);
      const x = nudgeToFreeX(id, desiredX, -1);

      const res = buildNow(state, id, { x, y:0 });
      if (res?.ok){
        const xp = Math.max(1, CONSTRUCT_XP(id)|0);
        pushLog(`Built ${def.name || id} → +${xp} Construction xp`, 'construction');
        showXpToast(xp);
        saveNow();
        renderSkills();
        renderCamp();
      }
    });
  });
}

/* ---------------- entities (render + drag + inspector) ---------------- */
export function renderCampEntities(){
  const host = document.getElementById('campEntities');
  if (!host) return;

  const placed = placedList();
  host.innerHTML = '';

  placed.forEach((p, idx)=>{
    const def = buildingDef(p.id) || {};
    const { leftPct, bottomPct } = gridToCssPos(p.x ?? chooseFreeX(p.id), p.y ?? 0);

    const wrap = document.createElement('div');
    wrap.className = 'camp-entity';
    wrap.style.left   = `${leftPct}%`;
    wrap.style.bottom = `${bottomPct}%`;
    wrap.title = (() => {
      const effs = Array.isArray(def.effects) ? def.effects.map(effectLine).filter(Boolean).join(' · ') : '';
      const nm = def.name || p.id;
      return effs ? `${nm} — ${effs}` : nm;
    })();
    wrap.dataset.idx = String(idx);

    const img = document.createElement('img');
    img.src = spriteForPlaced(p);
    img.alt = def.name || p.id;

    const sz = sizeFor(p.id);
    if (sz.w)  img.style.width  = `${sz.w}px`;
    if (sz.h)  img.style.height = `${sz.h}px`;
    if (sz.scale && !sz.w && !sz.h){
      img.style.width = `calc(clamp(128px, 22vw, 380px) * ${sz.scale})`;
    }

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = def.name || p.id;

    wrap.appendChild(img);
    wrap.appendChild(label);
    host.appendChild(wrap);

    wrap.addEventListener('click', ()=> openInspectorFor(idx));
    enableDragMove(wrap, idx);
    enableKeyboardNudge(wrap, idx);
  });
}

function enableKeyboardNudge(el, idx){
  el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', (e)=>{
    const p = placedList()[idx];
    if (!p) return;
    const { W } = campGrid();
    const w = buildingGridWidth(p.id);
    let dx = 0;
    if (e.key === 'ArrowLeft') dx = -1;
    if (e.key === 'ArrowRight') dx = 1;
    if (dx === 0) return;

    e.preventDefault();
    const newX = nudgeToFreeX(p.id, Math.max(0, Math.min(W - w, (p.x|0) + dx)), idx);
    if (newX !== p.x){
      p.x = newX;
      saveNow();
      renderCampEntities();
    }
  });
}

function enableDragMove(el, idx){
    let dragging = false;
    let maybeDrag = false;
    let startX = 0;
    let startLeftPct = 0;
  
    const DRAG_THRESHOLD_PX = 6;
  
    el.addEventListener('pointerdown', (e)=>{
      const p = placedList()[idx];
      if (!p) return;
      // do NOT preventDefault — we want the click to fire if there is no drag
      startX = e.clientX;
      maybeDrag = true;
      dragging = false;
      // don't setPointerCapture yet; wait until we cross the threshold
    });
  
    el.addEventListener('pointermove', (e)=>{
      const p = placedList()[idx];
      if (!maybeDrag || !p) return;
  
      if (!dragging){
        const moved = Math.abs(e.clientX - startX);
        if (moved < DRAG_THRESHOLD_PX) return;
  
        // crossed threshold → begin drag
        dragging = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
        const currentLeft = el.style.left.endsWith('%') ? parseFloat(el.style.left) : 50;
        startLeftPct = currentLeft;
      }
  
      const camp = document.getElementById('camp');
      const rect = camp.getBoundingClientRect();
      const dxPx = e.clientX - startX;
      const dxPct = (dxPx / rect.width) * 100;
      let nextPct = Math.max(0, Math.min(100, startLeftPct + dxPct));
      el.style.left = `${nextPct}%`;
    });
  
    el.addEventListener('pointerup', (e)=>{
      const p = placedList()[idx];
      maybeDrag = false;
  
      if (!dragging) {
        // Not a drag → let the regular click handler open the inspector.
        return;
      }
  
      dragging = false;
      el.releasePointerCapture(e.pointerId);
      el.classList.remove('dragging');
  
      if (!p) return;
      const leftPct = parseFloat(el.style.left) || 0;
      const { W } = campGrid();
      const desiredX = Math.round((leftPct / 100) * W);
      const nudged = nudgeToFreeX(p.id, desiredX, idx);
      p.x = nudged;
  
      saveNow();
      renderCampEntities();
    });
  
    // Safety: if pointer is canceled mid-drag
    el.addEventListener('pointercancel', ()=>{
      dragging = false;
      maybeDrag = false;
      el.classList.remove('dragging');
    });
  }  

/* ---------------- inspector (click building -> Upgrade) ---------------- */
function nextTierId(currentId){
  const cur = buildingDef(currentId) || {};
  if (cur.improvesTo || cur.upgradesTo) return (cur.improvesTo || cur.upgradesTo);
  const base = baseIdOf(currentId);
  const t = tierOf(currentId) ?? 0;
  const candidate = `${base}_t${t+1}`;
  return buildingDef(candidate) ? candidate : null;
}

function openInspectorFor(idx){
    const insp = document.getElementById('campInspector');
    if (!insp) return;
  
    // one-time CSS for contrast + upgrade animation
    if (!document.getElementById('campNextCss')){
      const css = document.createElement('style');
      css.id = 'campNextCss';
      css.textContent = `
        .camp-card .next-title{ color:#0b1220; font-weight:800; margin:8px 0 4px; }
        .camp-card .next-lines{ color:#1b2a3a; font-size:12px; white-space:pre-line; }
  
        /* upgrade pop on the camp entity */
        @keyframes camp-upgrade-pop {
          0%   { transform: translateX(-50%) scale(1);   filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          30%  { transform: translateX(-50%) scale(1.06); filter: drop-shadow(0 6px 16px rgba(34,197,94,.35)); }
          100% { transform: translateX(-50%) scale(1);   filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
        }
        .camp-entity.upgraded img{ animation: camp-upgrade-pop 500ms ease-out; }
        .camp-entity.upgraded .label{ color:#0f5132; text-shadow:0 1px 6px rgba(34,197,94,.35); }
      `;
      document.head.appendChild(css);
    }
  
    // helpers
    const getInv = (id)=> (state.inventory?.[id] | 0);
    function hasAllMats(recipe=[]){
      if (!Array.isArray(recipe) || !recipe.length) return true;
      return recipe.every(r => getInv(r.id) >= (r.qty|0));
    }
    function missingList(recipe=[]){
      if (!Array.isArray(recipe) || !recipe.length) return '';
      const miss = recipe
        .map(r => {
          const need = r.qty|0, have = getInv(r.id);
          return have < need ? `${need-have}× ${r.name || r.id}` : '';
        })
        .filter(Boolean);
      return miss.length ? `Missing: ${miss.join(' · ')}` : '';
    }
  
    const placed = placedList();
    const p = placed[idx];
    if (!p) { insp.innerHTML = ''; return; }
  
    const cur    = buildingDef(p.id) || {};
    const nextId = nextTierId(p.id);
    const nextDef= nextId ? buildingDef(nextId) : null;
  
    const effs = Array.isArray(cur.effects)
      ? cur.effects.map(effectLine).filter(Boolean).join(' · ')
      : '';
  
    let body = `
      <div class="camp-card">
        <div class="title">${cur.name || p.id}</div>
        <div class="muted">${effs || '—'}</div>
    `;
  
    if (nextDef){
      const reqs = reqLine(nextDef.recipe);
      const neffs = Array.isArray(nextDef.effects)
        ? nextDef.effects.map(effectLine).filter(Boolean).join(' · ')
        : '';
  
      const haveMats = hasAllMats(nextDef.recipe);
      const disAttr  = haveMats ? '' : 'disabled';
      const why      = haveMats ? '' : (missingList(nextDef.recipe) || 'Missing materials');
  
      body += `
        <hr class="muted" />
        <div class="next-title">Next: ${nextDef.name || nextId}</div>
        <div class="next-lines">${[reqs || '', neffs || ''].filter(Boolean).join('\n')}</div>
        <div class="row">
          <button class="btn upgrade" id="btnUpgrade" ${disAttr} title="${why}">Upgrade</button>
        </div>
      `;
    } else {
      body += `<div class="muted">Max tier.</div>`;
    }
  
    body += `</div>`;
    insp.innerHTML = body;
  
    // Upgrade: perform, re-render, animate the entity
    if (nextDef){
      const btnUp = insp.querySelector('#btnUpgrade');
      if (btnUp){
        btnUp.addEventListener('click', ()=>{
          // guard if user lost mats between render and click
          if (!hasAllMats(nextDef.recipe)){
            try { window.showTip?.(missingList(nextDef.recipe) || 'Missing materials'); } catch {}
            // also update disabled state immediately
            btnUp.disabled = true;
            btnUp.title = missingList(nextDef.recipe) || 'Missing materials';
            return;
          }
  
          const res = (typeof improveBuilding === 'function') ? improveBuilding(state, idx) : null;
          if (!res || res.ok === false){
            try { window.showTip?.((res && res.reason) || 'Cannot upgrade'); } catch {}
            return;
          }
  
          const xp = Math.max(1, (typeof CONSTRUCT_XP === 'function' ? CONSTRUCT_XP(res.id) : 1)|0);
          pushLog?.(`Upgraded to ${buildingDef(res.id)?.name || res.id} → +${xp} Construction xp`, 'construction');
          showXpToast?.(xp);
          saveNow();
  
          // Re-render panels
          renderSkills?.();
          renderCamp?.();
  
          // After the DOM refresh, tag the upgraded entity to play the pop animation
          requestAnimationFrame(()=>{
            const host = document.getElementById('campEntities');
            if (!host) return;
            const el = host.querySelector(`.camp-entity[data-idx="${idx}"]`) || host.children[idx];
            if (!el) return;
            el.classList.add('upgraded');
            setTimeout(()=> el.classList.remove('upgraded'), 520);
          });
  
          // Reopen inspector to reflect the new tier
          openInspectorFor(idx);
        });
      }
    }
  }
  

/* ---------------- full re-render ---------------- */
export function renderCamp(){
  renderBackButton();
  renderCampPalette();
  renderCampEntities();
}

/* ---------------- panel switching ---------------- */
function hideAllPanelsInRoot(){
  if (!gameRoot) return;
  gameRoot.querySelectorAll(':scope > .panel').forEach(p => p.classList.add('hidden'));
}
function currentVisiblePanelId(){
  if (!gameRoot) return null;
  const p = Array.from(gameRoot.querySelectorAll(':scope > .panel'))
    .find(el => !el.classList.contains('hidden') && el.id !== 'camp');
  return p?.id || null;
}
function defaultPanelId(){
  if (!gameRoot) return null;
  const smith = gameRoot.querySelector(':scope > #smithing.panel');
  if (smith) return 'smithing';
  const first = Array.from(gameRoot.querySelectorAll(':scope > .panel'))
    .find(el => el.id && el.id !== 'camp');
  return first?.id || null;
}
function showPanelInRoot(id){
  if (!gameRoot) return;
  hideAllPanelsInRoot();
  const el = id ? gameRoot.querySelector(`#${CSS.escape(id)}`) : null;
  if (el) el.classList.remove('hidden');
}

/* ---------------- public ---------------- */
export function showCamp(){
  if (!state.ui?.campUnlocked){
    const ok = ensureCampUnlockedFlow();
    if (!ok) return;
  }
  ensureCampDOM();
  document.body.classList.add(BODY_CAMP_CLASS);
  const camp = document.getElementById('camp');
  if (camp) camp.classList.remove('hidden');

  if (!lastPanelId){
    const cur = currentVisiblePanelId();
    if (cur && cur !== 'camp') lastPanelId = cur;
  }
  renderCamp();
}
export function leaveCamp(){
  const camp = document.getElementById('camp');
  if (camp) camp.classList.add('hidden');
  const target = lastPanelId || defaultPanelId();
  if (target) showPanelInRoot(target);
  document.body.classList.remove(BODY_CAMP_CLASS);
}

/* ---------------- init ---------------- */
export function initCamp(){
  if (inited) return;
  inited = true;

  gameRoot = document.getElementById('gameRoot') || qs('#game') || qs('#app');

  injectCampCSS();
  ensureCampDOM();
  renderCamp();

  const btn = document.getElementById('tabCamp') || document.getElementById('btnCamp');
  if (btn){
    btn.addEventListener('click', (e)=> {
      e.preventDefault();
      if (!state.ui?.campUnlocked){
        if (!ensureCampUnlockedFlow()) return; // still locked
      }
      showCamp();
    });
  }

  // keep the tab label/tooltip correct
  updateCampTabLockUI();

  // Live-update palette enable/disable when inventory changes
  window.addEventListener('inventory:changed', renderCampPalette);

  // When total level or gold updates, keep lock label fresh
  const totalEl = document.getElementById('totalLevel');
  if (totalEl){
    const mo = new MutationObserver(updateCampTabLockUI);
    mo.observe(totalEl, { childList: true, characterData: true, subtree: true });
  }
  window.addEventListener('gold:change', updateCampTabLockUI);
}
