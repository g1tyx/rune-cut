import { state, saveState } from '../systems/state.js';
import { PETS } from '../data/pets.js';

let inited = false;

function updatePetsTabLockUI(){
  const btn = document.getElementById('tabPets');
  if (!btn) return;
  const unlocked = !!state.ui?.petsUnlocked;
  btn.textContent = unlocked ? 'Pets' : 'Pets 🔒';
  btn.title = unlocked
    ? 'View your Pets'
    : 'Reach Total Level 475 and pay 25,000g to unlock.';
}

function ensurePetsUnlockedFlow(){
  if (!state.ui) state.ui = {};
  if (state.ui.petsUnlocked) return true;

  const total = parseInt(document.getElementById('totalLevel')?.textContent||0,10);
  if (total < 475){ alert("Need total level 475."); return false; }
  if ((state.gold|0) < 25_000){ alert("Need 25,000 gold."); return false; }

  if (!confirm("Unlock pets for 25,000 gold?")) return false;
  state.gold -= 25_000;
  state.ui.petsUnlocked = true;
  saveState(state);
  updatePetsTabLockUI();
  return true;
}

export function renderPetsPanel(){
  const panel = document.getElementById('petsPanel');
  if (!panel) return;
  const owned = Object.keys(state.pets||{});
  if (!owned.length){
    panel.innerHTML = `<div class="pet-card"><div class="muted">No pets yet.</div></div>`;
    return;
  }
  panel.innerHTML = owned.map(id=>{
    const pet = PETS[id];
    return `
      <div class="pet-card">
        <img src="${pet.img}" alt="${id}">
        <div>
          <div class="title">${id}</div>
          <div class="muted">${pet.description}</div>
          <div class="muted">Attack: ${pet.attack} · Level: ${pet.level}</div>
        </div>
      </div>
    `;
  }).join('');
}

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

export function initPets(){
  if (inited) return;
  inited = true;

  const btn = document.getElementById('tabPets');
  btn?.addEventListener('click', e=>{
    e.preventDefault();
    showPets();
  });

  document.getElementById('petsBackBtn')?.addEventListener('click', leavePets);

  updatePetsTabLockUI();
}
