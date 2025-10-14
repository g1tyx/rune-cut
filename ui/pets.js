// /ui/pets.js
import { state, saveNow } from '../systems/state.js';
import { PETS } from '../data/pets.js';
import { addPet } from '../systems/pet.js';
import { on } from '../utils/dom.js';
import { openPetBattleMode } from './combat.js';
import { progressFor } from '../systems/xp.js';
import { XP_TABLE, levelFromXp } from '../systems/xp.js';
import { ITEMS } from '../data/items.js';

let inited = false;

/* ---------- styles ---------- */
function ensurePetsCss(){
  if (document.getElementById('pets-equip-css')) return;
  const css = document.createElement('style');
  css.id = 'pets-equip-css';
  css.textContent = `
    .pet-card{
      background:#0b1220;
      border:1px solid rgba(255,255,255,.06);
      border-radius:16px;
      padding:14px;
      margin:10px 0;
      /* soft white ring + faint white glow */
      box-shadow:
        0 0 0 1px rgba(255,255,255,.06),
        0 10px 28px rgba(255,255,255,.05);
      display:flex; align-items:flex-start; gap:14px;
    }
    .pet-card.equipped{
      border-color:#22c55e;
      /* preserve green highlight but keep white ambience */
      box-shadow:
        0 0 0 1px rgba(34,197,94,.35),
        0 10px 28px rgba(255,255,255,.05),
        inset 0 0 0 1px rgba(34,197,94,.45);
    }
    .pet-card .title{ color:#e6edf6; font-weight:800; line-height:1.2; }
    .pet-card .muted{ color:#9fb0c2; font-size:12px; }
    .pet-card img{
      width:128px; height:128px;
      image-rendering:pixelated;
      border-radius:12px;
      background:#fff;
      box-shadow: 0 1px 0 rgba(255,255,255,.5) inset;
    }
    .pet-card .body{ display:flex; flex-direction:column; gap:6px; }
    .stat-row{ display:flex; flex-wrap:wrap; gap:6px; }
    .stat-chip{
      font-size:11px; line-height:1;
      padding:6px 8px; border-radius:999px;
      background:#0f172a; color:#cbd5e1; border:1px solid rgba(255,255,255,.06);
      display:inline-flex; align-items:center; gap:6px; user-select:none;
    }
    .stat-chip .k{ opacity:.75; }
    .stat-chip .v{ font-weight:800; letter-spacing:.2px; }
    .pet-card .actions{
      margin-left:auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap;
    }
    .pet-card .equip-btn,
    .pet-card .fight-btn,
    .pet-card .feed-btn{
      --btn-h: 40px;
      height: var(--btn-h);
      min-width: 96px;
      padding: 0 14px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:#0f172a;
      color:#e2e8f0;
      font-weight:800; letter-spacing:.2px;
      box-shadow: 0 6px 16px rgba(255,255,255,.04);
      transition: transform .06s ease, filter .2s ease, box-shadow .2s ease;
    }
    .pet-card .feed-btn:hover{ filter:brightness(1.08); box-shadow:0 8px 22px rgba(255,255,255,.06); }
    .pet-card .feed-btn[disabled]{ opacity:.55; cursor:not-allowed; }

    .pet-card .equip-btn[disabled]{
      background:#16a34a; border-color:#16a34a; color:#0b1410;
      text-shadow:0 1px 0 rgba(255,255,255,.25);
      cursor:default;
    }
    .pet-card .fight-btn{ background:#4f46e5; border-color:#4f46e5; color:#f8fafc; }
    .pet-card .fight-btn:hover{ filter:brightness(1.06); box-shadow:0 10px 24px rgba(99,102,241,.18); }
    .pet-buff-badge{
      display:inline-flex; align-items:center; gap:6px; padding:6px 10px;
      border-radius:999px; background:rgba(16,185,129,.16); color:#86efac;
      border:1px solid rgba(16,185,129,.24); font-size:12px; font-weight:800;
    }
    .req-chip{
      display:inline-flex; align-items:center; gap:10px;
      padding:0 12px; height:40px;
      border-radius:999px;
      background:#0f172a;
      color:#cbd5e1;
      border:1px solid rgba(255,255,255,.10);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04),
                  0 4px 14px rgba(255,255,255,.04);
      font-size:13px; white-space:nowrap;
    }
    .req-chip img{
      width:22px; height:22px; border-radius:6px; object-fit:contain;
      background:#0b1220; box-shadow:0 0 0 1px rgba(255,255,255,.08) inset;
    }
    .req-chip span:first-of-type b{
      font-weight:900; color:#e6edf6;
    }
    .req-chip .have-ok{ color:#86efac; font-weight:800; }
    .req-chip .have-bad{ color:#fca5a5; font-weight:800; }
    @media (max-width: 600px){
      .pet-card .actions{ flex-direction:column; align-items:stretch; }
      .pet-card .feed-btn, .pet-card .equip-btn, .pet-card .fight-btn, .req-chip{ width:100%; }
    }
  `;
  document.head.appendChild(css);
}

/* ---------- small utils ---------- */
function fmtClock(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(s/60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2,'0')}`;
}

function ownedPetIds(){ return Object.keys(state.pets || {}); }
function ensureActivePetDefault(){
  const owned = ownedPetIds();
  state.ui = state.ui || {};
  if (!owned.length) { state.ui.activePet = null; return; }
  if (!owned.includes(state.ui.activePet || '')) { state.ui.activePet = owned[0]; saveNow(); }
}
function invQty(id){ return Math.max(0, (state.inventory?.[id] || 0) | 0); }
function spend(id, n){
  const cur = invQty(id); if (cur < n) return false;
  state.inventory[id] = cur - n;
  try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
  saveNow(); return true;
}

/* --------------- unlocks --------------- */
function updatePetsTabLockUI(){
  const btn = document.getElementById('tabPets'); if (!btn) return;
  const unlocked = !!state.ui?.petsUnlocked;
  btn.textContent = unlocked ? 'Pets' : 'Pets 🔒';
  btn.title = unlocked ? 'View your Pets' : 'Reach Total Level 475 and pay 25,000g to unlock.';
}
function ensurePetsUnlockedFlow(){
  if (!state.ui) state.ui = {};
  if (state.ui.petsUnlocked) return true;
  const totalLevelText = document.getElementById('totalLevel')?.textContent || '0';
  const total = parseInt(totalLevelText, 10) || 0;
  if (total < 475){ alert("Need total level 475."); return false; }
  if ((state.gold|0) < 25_000){ alert("Need 25,000 gold."); return false; }
  if (!confirm("Unlock pets for 25,000 gold?")) return false;
  state.gold = Math.max(0, (state.gold|0) - 25_000);
  state.ui.petsUnlocked = true;
  saveNow(); updatePetsTabLockUI(); return true;
}
function maybeUnlockNeko(){
  if (state.pets?.neko) return;
  const atkLevel = levelFromXp(Number(state.atkXp)||0, XP_TABLE);
  if (atkLevel >= 55){ addPet(state, 'neko'); saveNow(); }
}
function UnlockSilynara(){
  if (state.pets?.silynara) return;
  const vineHorrorKills = state?.monsterKills?.vine_horror | 0;
  if (vineHorrorKills >= 10){ addPet(state, 'silynara'); saveNow(); }
}
export function ensureCheekenOwned(){
  if (state.pets?.cheeken) return; addPet(state, 'cheeken'); saveNow();
}

/* ---------- Item images from ITEMS ---------- */
function itemImgSrc(id){
  const base = String(id || '').split('@')[0].split('#')[0];
  return (ITEMS?.[base]?.img) || "assets/items/placeholder.png";
}

/* ---------- render ---------- */
export function renderPetsPanel(){
  ensureActivePetDefault();
  maybeUnlockNeko();
  UnlockSilynara();

  const panel = document.getElementById('petsPanel');
  if (!panel) return;

  const owned = ownedPetIds();
  if (!owned.length){
    panel.innerHTML = `<div class="pet-card"><div class="muted">No pets yet.</div></div>`;
    return;
  }

  const active = state.ui?.activePet || null;

  panel.innerHTML = owned.map(id=>{
    const def = PETS[id]; if (!def) return '';
    const pet = state.pets[id]; if (!pet) return '';

    const prog = progressFor(pet.xp);
    const pctLvl  = Math.floor(prog.pct);
    const xpTitle = `XP ${prog.into}/${prog.span} (need ${prog.need} to Lv ${prog.lvl + 1})`;

    const isActive = id === active;

    const req = def.feed || null;
    const have = req ? invQty(req.item) : 0;
    const canFeed = req ? have >= (req.qty|0) : false;

    // Active Well-Fed?
    const until = Number(pet.wellFedUntil) || 0;
    const pct   = Number(pet.wellFedPct) || 0;
    const remMs = Math.max(0, until - Date.now());
    const hasBuff = remMs > 0 && pct > 0;

    const reqChip = req ? `
      <div class="req-chip" title="${req.label}">
        <img src="${itemImgSrc(req.item)}" alt="${req.label}">
        <span>Requires <b>x${req.qty}</b> ${req.label}</span>
        <span class="${have>=req.qty ? 'have-ok':'have-bad'}">You have x${have}</span>
      </div>
    ` : '';

    const buffBadge = hasBuff
      ? `<span class="pet-buff-badge">🍀 Well-Fed · +${pct}% · ${fmtClock(remMs)}</span>`
      : `<span class="muted">Not active</span>`;

    return `
      <div class="pet-card ${isActive ? 'equipped':''}" data-pet="${id}">
        <img src="${def.img}" alt="${def.name || id}" title="${xpTitle}">
        <div class="body" style="flex:1">
          <div class="title">${def.name || id}</div>
          <div class="muted">${def.description || ''}</div>
          <div class="muted">Level ${pet.level|0} • ${pctLvl}%</div>
          <div class="stat-row" aria-label="Pet stats" style="margin-top:6px;">
            <span class="stat-chip"><span class="k">Atk</span><span class="v">${pet.atk|0}</span></span>
            <span class="stat-chip"><span class="k">Str</span><span class="v">${pet.str|0}</span></span>
            <span class="stat-chip"><span class="k">Def</span><span class="v">${pet.def|0}</span></span>
            <span class="stat-chip"><span className="k">Acc</span><span class="v">${(pet.acc ?? 0).toFixed(2)}</span></span>
            <span class="stat-chip"><span class="k">Max</span><span class="v">${pet.maxHit|0}</span></span>
          </div>

          <div class="actions" style="margin-top:10px;">
            ${req ? `
              <button class="feed-btn" data-feed="${id}" ${!canFeed ? 'disabled':''}
                title="Feed ${def.name} with x${req.qty} ${req.label}">
                Feed
              </button>` : ``}
            ${reqChip}
            <span style="margin-left:auto">${buffBadge}</span>
            <button class="equip-btn" data-equip="${id}" ${isActive ? 'disabled':''} title="Equip ${def.name}">
              ${isActive ? 'Equipped' : 'Equip'}
            </button>
            ${isActive ? `<button class="fight-btn" data-fight="${id}">Fight</button>` : ``}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ---------- overlay control ---------- */
export function showPets(){
  if (!state.ui?.petsUnlocked){
    if (!ensurePetsUnlockedFlow()) return;
  }
  document.getElementById('petsOverlay')?.classList.remove('hidden');
  renderPetsPanel();
}
export function leavePets(){
  document.getElementById('petsOverlay')?.classList.add('hidden');
}

/* ---------- init & events ---------- */
export function initPets(){
  if (inited) return;
  inited = true;
  ensurePetsCss();
  updatePetsTabLockUI();

  document.getElementById('tabPets')?.addEventListener('click', (e)=>{
    e.preventDefault();
    showPets();
  });

  document.getElementById('petsBackBtn')?.addEventListener('click', leavePets);

  // Equip
  on(document, 'click', 'button[data-equip]', (_e, btn)=>{
    const id = btn.getAttribute('data-equip');
    if (!id) return;
    if (!state.pets || typeof state.pets[id] !== 'object'){
      alert('Pet not found in state.'); return;
    }
    state.ui = state.ui || {};
    state.ui.activePet = id;
    saveNow();
    renderPetsPanel();
  });

  // Fight (active pet only)
  on(document, 'click', '.fight-btn', (_e, btn)=>{
    const id = btn.getAttribute('data-fight');
    if (!id) return;
    if ((state.ui?.activePet || null) !== id) return;
    leavePets();
    openPetBattleMode();
  });

  // Feed — consumes crops and STACKS duration on top of remaining time
  on(document, 'click', 'button[data-feed]', (_e, btn)=>{
    const id = btn.getAttribute('data-feed');
    if (!id) return;

    const def = PETS[id];
    const req = def?.feed;
    if (!req) return;

    if (!spend(req.item, req.qty)){
      alert(`Need x${req.qty} ${req.label} to feed ${def?.name || id}.`);
      return;
    }

    state.pets[id] = state.pets[id] || {};
    const now = Date.now();
    const currentUntil = Number(state.pets[id].wellFedUntil);
    const base = Math.max(now, currentUntil);
    const dur = req.durMs;
    state.pets[id].wellFedPct = req.pct || state.pets[id].wellFedPct || 10;
    state.pets[id].wellFedUntil = base + dur;

    saveNow();
    renderPetsPanel();
  });

  setInterval(()=>{
    const overlay = document.getElementById('petsOverlay');
    if (overlay && !overlay.classList.contains('hidden')){
      renderPetsPanel();
    }
  }, 1000);
}
