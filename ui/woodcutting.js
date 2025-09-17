// /ui/woodcutting.js
import { state, saveState } from '../systems/state.js';
import { qs, on } from '../utils/dom.js';
import { renderInventory } from './inventory.js';
import { renderCrafting } from './crafting.js';
import { pushLog } from './logs.js';
import { renderSkills } from './skills.js';
import { listTrees, canChop } from '../systems/woodcutting.js';
import { ITEMS } from '../data/items.js';
import { renderEnchanting } from './enchanting.js';
import { startAfk } from '../systems/afk.js';

const el = {
  treeList:   qs('#treeList') || qs('#forestList'),
  treeSelect: qs('#treeSelect') || qs('#wcTreeSelect'),
  chopBtn:    qs('#chopBtn') || qs('#wcChopBtn') || qs('.chop-btn'),
  actionLbl:  qs('#actionLabel') || qs('#wcActionLabel'),
};

function trees(){ return listTrees(state) || []; }

function firstAccessibleTree(){
  const list = trees();
  for (const t of list) if (canLevelOnly(state, t)) return t;
  return list[0] || null;
}

function currentTree(){
  const list = trees();
  return list.find(x => x.id === state.selectedTreeId) || list[0] || null;
}

// Ignore "busy" while rendering/validating selection
function canLevelOnly(t){
  return canChop({ ...state, action: null }, t);
}

let AFK_WC_ON = false;

function updateActionLabel(){
  if (!el.actionLbl) return;
  if (state.action?.type === 'chop') {
    el.actionLbl.textContent = 'Chopping…';
  } else {
    el.actionLbl.textContent = AFK_WC_ON ? 'Auto-chopping…' : 'Idle';
  }
}

export function renderWoodcutting(){
  const list = trees();
  if (!list.length) return;

  // Compute a *valid & enabled* selection up-front.
  const has = id => list.some(t => t.id === id);

  let selId = state.selectedTreeId && has(state.selectedTreeId)
    ? state.selectedTreeId
    : null;

  let selTree = selId ? list.find(t => t.id === selId) : null;

  // If current selection is missing or *locked*, pick first accessible.
  if (!selTree || !canLevelOnly(selTree)) {
    selTree = list.find(canLevelOnly) || list[0];
    if (selTree && selTree.id !== state.selectedTreeId) {
      state.selectedTreeId = selTree.id;
      saveState(state);
    }
  }
  selId = selTree?.id;

  // --- Tiles ---
  if (el.treeList){
    el.treeList.innerHTML = list.map(t=>{
      const ok = canLevelOnly(t);
      const isSel = t.id === selId;
      return `
        <button class="tree ${ok?'':'disabled locked'} ${isSel?'active selected':''}"
                data-id="${t.id}" ${ok?'':'disabled aria-disabled="true"'}
                title="${ok ? '' : `Requires Lv ${t.level||1}`}">
          <span class="name">${t.name || t.id}</span>
          <small class="io">Lv ${t.level||1}${t.baseTime?` · ${Math.round(t.baseTime/1000)}s`:''}</small>
        </button>`;
    }).join('');
  }

  // --- Dropdown ---
  if (el.treeSelect){
    el.treeSelect.innerHTML = list.map(t=>{
      const ok = canLevelOnly(t);
      const selAttr = t.id === selId ? 'selected' : '';
      const disAttr = ok ? '' : 'disabled';
      return `<option value="${t.id}" ${selAttr} ${disAttr}>
        ${t.name || t.id} ${ok ? '' : `(Lv ${t.level||1})`}
      </option>`;
    }).join('');

    if (!el.treeSelect.value || el.treeSelect.options[el.treeSelect.selectedIndex]?.disabled) {
      el.treeSelect.value = selId;
    }

    el.treeSelect.disabled = false;
    el.treeSelect.style.pointerEvents = 'auto';
    void el.treeSelect.offsetWidth;
  }

  updateActionLabel();
}

/* ---------- interactions ---------- */

// Tile click (ignore locked)
on(document, 'click', '#treeList .tree, #forestList .tree', (e, btn)=>{
  if (btn.classList.contains('disabled') || btn.hasAttribute('disabled')) return;
  const id = btn.dataset.id;
  if (!id) return;
  state.selectedTreeId = id;
  saveState(state);
  renderWoodcutting();
});

// Dropdown change (supports #treeSelect or #wcTreeSelect)
on(document, 'change', '#treeSelect, #wcTreeSelect', ()=>{
  const sel = document.querySelector('#treeSelect, #wcTreeSelect');
  if (!sel) return;
  const id = sel.value;
  // If somehow a locked <option> gets selected, revert to a valid one
  const t = trees().find(x => x.id === id);
  if (!t || !canChop(state, t)){
    const fb = firstAccessibleTree();
    if (fb) sel.value = fb.id, state.selectedTreeId = fb.id;
  } else {
    state.selectedTreeId = id;
  }
  saveState(state);
  renderWoodcutting();
});

// Chop → start AFK session (switches from other skills & restarts timer)
on(document, 'click', '#chopBtn, #wcChopBtn, .chop-btn', ()=>{
  const t = currentTree();
  if (!t) return;
  startAfk(state, { skill:'forestry', targetId: t.id });
});

/* ---------- AFK hooks (generic) ---------- */

// Show our HUD label when forestry AFK is active
window.addEventListener('afk:start', (e)=>{
  AFK_WC_ON = e?.detail?.skill === 'forestry';
  updateActionLabel();
});

// Clear HUD label when AFK ends
window.addEventListener('afk:end', ()=>{
  AFK_WC_ON = false;
  updateActionLabel();
});

// If another skill takes over, stop showing auto label
window.addEventListener('afk:switch', (e)=>{
  if (e?.detail?.name !== 'forestry'){
    AFK_WC_ON = false;
    updateActionLabel();
  }
});

// Log each AFK chop using the same message format
window.addEventListener('afk:cycle', (e)=>{
  const d = e?.detail; if (!d || d.skill !== 'forestry') return;
  const itemName = ITEMS[d.dropId]?.name || d.dropId;
  const treeName = d.targetName || d.targetId;
  const essTxt   = d.essence ? ` · +1 ${ITEMS['forest_essence']?.name || 'Forest Essence'}` : '';
  const xp       = d.xp|0;

  pushLog(`Chopped ${treeName} → +1 ${itemName}${essTxt} · Forestry +${xp} xp`, 'wc');
  saveState(state);
  renderWoodcutting();
  renderInventory();
  renderEnchanting();
  renderCrafting();
  renderSkills();
});

/* ---------- lightweight HUD refresh loop ---------- */
(function raf(){
  updateActionLabel();
  requestAnimationFrame(raf);
})();
