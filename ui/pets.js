// /ui/pets.js
import { state, saveNow } from '../systems/state.js';
import { PETS } from '../data/pets.js';
import { addPet } from '../systems/pet.js';
import { on } from '../utils/dom.js';
import { openPetBattleMode } from './combat.js';
import { progressFor } from '../systems/xp.js';
import { XP_TABLE, levelFromXp } from '../systems/xp.js';

let inited = false;

/* ---------- styles ---------- */
function ensurePetsCss(){
  if (document.getElementById('pets-equip-css')) return;
  const css = document.createElement('style');
  css.id = 'pets-equip-css';
  css.textContent = `
    .pet-card {
      background:#fff;
      border:1px solid rgba(0,0,0,.12);
      border-radius:12px;
      padding:12px;
      margin:8px 0;
      box-shadow:0 6px 14px rgba(0,0,0,.06);
      display:flex; align-items:flex-start; gap:12px;
    }
    .pet-card.equipped {
      border-color:#2563eb;
      box-shadow:0 6px 18px rgba(37,99,235,.18);
    }
    .pet-card .title { color:#0f172a; font-weight:700; line-height:1.2; }
    .pet-card .muted { color:#475569; font-size:12px; }
    .pet-card img{ width:64px; height:64px; image-rendering:pixelated; border-radius:8px; }
    .pet-card .body { display:flex; flex-direction:column; gap:6px; }
    .stat-row { display:flex; flex-wrap:wrap; gap:6px; }
    .stat-chip {
      font-size:11px; line-height:1;
      padding:6px 8px; border-radius:999px;
      background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0;
      display:inline-flex; align-items:center; gap:6px; user-select:none;
    }
    .stat-chip .k { opacity:.65; }
    .stat-chip .v { font-weight:700; letter-spacing:.2px; }
    .pet-card .actions { margin-left:auto; display:flex; align-items:center; gap:8px; }
    .pet-card .equip-btn, .pet-card .fight-btn {
      appearance:none; border:0; border-radius:10px; padding:6px 10px;
      font-weight:700; cursor:pointer;
    }
    .pet-card .equip-btn { background:#1e293b; color:#e2e8f0; }
    .pet-card.equipped .equip-btn { background:#16a34a; color:#fff; cursor:default; }
    .pet-card .fight-btn { background:#7c3aed; color:#fff; }
  `;
  document.head.appendChild(css);
}

function maybeUnlockNeko(){
  if (state.pets?.neko) return;
  const atkLevel = levelFromXp(Number(state.atkXp)||0, XP_TABLE);
  if (atkLevel >= 55){
    addPet(state, 'neko');               
    saveNow();                           
  }
}

function UnlockSilynara(){
  if (state.pets?.silynara) return;
  const vineHorrorKills = state.monsterKills.vine_horror;
  if (vineHorrorKills >= 10){
    addPet(state, 'silynara');
    saveNow();
  }
}

export function ensureCheekenOwned(){
  if (state.pets?.cheeken) return;
  addPet(state, 'cheeken');          
  saveNow();                
}

/* ---------- unlock UI ---------- */
function updatePetsTabLockUI(){
  const btn = document.getElementById('tabPets');
  if (!btn) return;
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
  saveNow();
  updatePetsTabLockUI();
  return true;
}

/* ---------- helpers ---------- */
function ownedPetIds(){ return Object.keys(state.pets || {}); }

function ensureActivePetDefault(){
  const owned = ownedPetIds();
  state.ui = state.ui || {};
  if (!owned.length) { state.ui.activePet = null; return; }
  if (!owned.includes(state.ui.activePet || '')) {
    state.ui.activePet = owned[0];
    saveNow();
  }
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
    const need = prog.need;                // XP to reach next level
    const pct  = Math.floor(prog.pct);     // % into current level
    const xpTitle = `XP ${prog.into}/${prog.span} (need ${prog.need} to Lv ${prog.lvl + 1})`;

    const isActive = id === active;

    return `
      <div class="pet-card ${isActive ? 'equipped':''}" data-pet="${id}">
        <<img src="${def.img}" alt="${def.name || id}" title="${xpTitle}">
        <div class="body">
          <div class="title">${def.name || id}</div>
          <div class="muted">${def.description || ''}</div>
          <div class="muted">Level ${pet.level|0}</div>
          <div class="stat-row" aria-label="Pet stats">
            <span class="stat-chip"><span class="k">Atk</span><span class="v">${pet.atk|0}</span></span>
            <span class="stat-chip"><span class="k">Str</span><span class="v">${pet.str|0}</span></span>
            <span class="stat-chip"><span class="k">Def</span><span class="v">${pet.def|0}</span></span>
            <span class="stat-chip"><span class="k">Acc</span><span class="v">${(pet.acc ?? 0).toFixed(2)}</span></span>
            <span class="stat-chip"><span class="k">Max</span><span class="v">${pet.maxHit|0}</span></span>
          </div>
        </div>
        <div class="actions">
          <button class="equip-btn" data-equip="${id}" ${isActive ? 'disabled':''}>
            ${isActive ? 'Equipped' : 'Equip'}
          </button>
          ${isActive ? `<button class="fight-btn" data-fight="${id}">Fight</button>` : ``}
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
}
