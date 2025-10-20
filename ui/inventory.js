import { ITEMS } from '../data/items.js';
import { state, saveNow } from '../systems/state.js';
import { removeItem, addGold } from '../systems/inventory.js';
import { equipItem, canEquip, equipReqLabel } from '../systems/equipment.js';
import { renderEquipment } from './equipment.js';
import { qs, on } from '../utils/dom.js';
import { drinkPotion } from '../systems/mana.js';
import { renderCharacterEffects } from './character.js';
import { applyEffect } from '../systems/effects.js';
import { iconHtmlForItem } from './sprites.js';
import { equipTool } from '../systems/tools.js';
import {
  baseId,
  baseIdStrict,
  tintClassForItem,
  qualityPct,
  healAmountFor,
  sellPrice,
  getInvOrder,
  setInvOrder,
  syncInvOrderWithEntries,
  sortEntriesByOrder,
  useRank,
  invUseOf,
  REORDER_MIME,
  itemType
} from '../systems/inventory_helpers.js';
import { attachInventoryTooltip } from './inventory_tooltip.js';
import { ensureInventoryCss } from './inventory_css.js';

const elInv = qs('#inventory');
ensureInventoryCss();
attachInventoryTooltip(elInv, state);

export function findInvIconEl(id){
  const tile = document.querySelector(`#inventory .inv-slot[data-id="${CSS.escape(id)}"]`);
  if (tile) return tile.querySelector('img.icon-img, .icon-sprite, .icon');
  const base = baseIdStrict(id);
  const tiles = document.querySelectorAll('#inventory .inv-slot');
  for (const t of tiles){
    const tidBase = baseIdStrict(t.getAttribute('data-id') || '');
    if (tidBase === base){
      return t.querySelector('img.icon-img, .icon, .icon-sprite');
    }
  }
  return null;
}

export function renderInventory(){
  if (!elInv) return;
  let entries = Object.entries(state.inventory || {}).filter(([, qty]) => (qty|0) > 0);
  const f = (state.ui?.invFilterTypes && state.ui.invFilterTypes.length) ? state.ui.invFilterTypes : ['all'];
  const useFilter = !(f.includes('all'));
  if (useFilter){ entries = entries.filter(([id])=> f.includes(itemType(id))); } /*__FILTER_APPLIED__*/
  syncInvOrderWithEntries(entries);
  if (state.ui?.invSortUse) {
    entries = entries.sort((a, b) => {
      const abase = String(a[0]).split('@')[0];
      const bbase = String(b[0]).split('@')[0];
      const au = invUseOf(abase), bu = invUseOf(bbase);
      const ur = useRank(au) - useRank(bu);
      if (ur !== 0) return ur;
      const an = ITEMS[abase]?.name || abase;
      const bn = ITEMS[bbase]?.name || bbase;
      return an.localeCompare(bn);
    });
  } else {
    entries = sortEntriesByOrder(entries);
  }
  if (!entries.length){
    elInv.innerHTML = '<div class="muted">No items yet. Gather or fight to earn loot.</div>';
    return;
  }
  elInv.innerHTML = entries.map(([id, qty])=>{
    const base   = baseIdStrict(id);
    const def    = ITEMS[base] || {};
    const isEquip  = def.type === 'equipment';
    const isFood   = (def.type === 'food') || (healAmountFor(id) > 0);
    const isPotion = (!isFood && (Number(def.mana)>0 || Number(def.accBonus)>0 || Number(def.dmgReduce)>0));
    const isMat    = /^bar_|^ore_/.test(base);
    const imgSrc = def.img || (isMat ? 'assets/materials/ore.png' : null);
    const tintCls = tintClassForItem(id);
    const glow    = !!def.glow;
    function frameForItem(d){
      if (!d || !d.frames) return null;
      if (d.defaultFrame && d.frames[d.defaultFrame]) return d.defaultFrame;
      if (d.frames.icon)   return 'icon';
      if (d.frames.empty)  return 'empty';
      const firstKey = Object.keys(d.frames)[0];
      return firstKey || null;
    }
    const frame = frameForItem(def);
    const iconHtml = iconHtmlForItem(base, { px: 28, frame, tintClass: tintCls, glow, fallback: imgSrc, alt: def.name || base });
    const isTome = isEquip && (def.slot === 'tome');
    const actionBtnHtml = isFood ? `<button class="use-btn" data-use="${id}" title="Eat">Eat</button>` : '';
    const kindClass = isEquip ? 'equip' : isFood ? 'food' : isPotion ? 'potion' : '';
    return `
      <div class="inv-slot ${kindClass}" data-id="${id}" draggable="true" title="${isPotion ? 'Shift-click to drink' : ''}">
        ${iconHtml}
        ${actionBtnHtml}
        <button class="sell-btn" data-sell="${id}">Sell</button>
        ${isTome ? `<button class="equip-quick btn-primary" data-equip="${id}" title="Equip">Equip</button>` : ''}
        <span class="qty-badge">${qty}</span>
      </div>
    `;
  }).join('');
  ensureInvSortBtn();
  ensureInvFilterBar();
}

function equipFoodAllFromInventory(id){
  const base = baseIdStrict(id);
  const have = state.inventory[id] || 0;
  if (have <= 0) return false;
  if (!state.equipment) state.equipment = {};
  if (state.equipment.food && state.equipment.food !== base){
    const prevBase = state.equipment.food;
    const prevQty = Math.max(0, state.equipment.foodQty|0);
    if (prevQty > 0){ state.inventory[prevBase] = (state.inventory[prevBase]||0) + prevQty; }
    state.equipment.foodQty = 0;
  }
  state.equipment.food = base;
  state.equipment.foodQty = (state.equipment.foodQty|0) + have;
  removeItem(state, id, have);
  try { window.dispatchEvent(new Event('food:change')); } catch {}
  return true;
}

on(elInv, 'click', '.inv-slot.food', (e, tile)=>{
  if (e.target.closest('button')) return;
  const id = tile.getAttribute('data-id');
  if (equipFoodAllFromInventory(id)){ renderInventory(); renderEquipment(); saveNow(); }
});

on(elInv, 'click', 'button.use-btn', (e, btn)=>{
  e.stopPropagation();
  const id = btn.getAttribute('data-use');
  if (healAmountFor(id) > 0){
    const heal = healAmountFor(id);
    const max = (state.hpMax|0) || 0;
    if (state.hpCurrent < max){
      state.hpCurrent = Math.min(max, state.hpCurrent + heal);
      removeItem(state, id, 1);
      renderInventory(); saveNow();
    }
  }
});

on(elInv, 'click', 'button.sell-btn', (e, btn)=>{
  e.stopPropagation();
  openSellPopover(btn, btn.getAttribute('data-sell'));
});

on(elInv, 'click', 'button.equip-quick', (e, btn)=>{
  e.stopPropagation();
  openEquipPopover(btn, btn.getAttribute('data-equip'));
});

on(elInv, 'click', '.inv-slot.equip', (e, tile)=>{
  if (e.target.closest('button')) return;
  const id = tile.getAttribute('data-id');
  const base = baseIdStrict(id);
  const it = ITEMS[base];
  if (!it || it.type !== 'equipment') return;
  const gate = canEquip(state, base);
  if (!gate.ok) return;
  equipItem(state, id);
  renderInventory();
  renderEquipment();
  saveNow();
});

const elPopover = document.querySelector('#popover');

function openSellPopover(anchorEl, id){
  if (!elPopover) return;
  const base = baseIdStrict(id);
  const it = ITEMS[base]||{};
  const have = state.inventory[id]||0;
  const rect = anchorEl.getBoundingClientRect();
  const price = sellPrice(id);
  elPopover.dataset.itemId = id;
  elPopover.dataset.mode = 'sell';
  elPopover.innerHTML = `
    <div class="small muted" style="margin-bottom:6px;">Sell <b>${it.icon||''} ${it.name||base}${String(id).includes('@')?` (${qualityPct(id)}%)`:''}</b></div>
    <div class="row">
      <button class="btn-gold" data-amt="1">1</button>
      <button class="btn-gold" data-amt="10">10</button>
      <button class="btn-gold" data-amt="100">100</button>
      <button class="btn-gold" data-amt="-1">All</button>
    </div>
    <div class="row">
      <input type="number" id="sellCustomAmt" min="1" max="${have}" placeholder="Custom" />
      <button class="btn-gold" data-amt="custom">Sell</button>
    </div>
    <div class="small muted">Value: ${price}g each</div>
  `;
  elPopover.style.left = Math.min(window.innerWidth - 200, rect.left) + 'px';
  elPopover.style.top  = (rect.top - 4 + window.scrollY) + 'px';
  elPopover.classList.remove('hidden');
}
export function closePopover(){ elPopover?.classList.add('hidden'); }

function openEquipPopover(anchorEl, id){
  if(!elPopover) return;
  const base = baseIdStrict(id);
  const it = ITEMS[base]||{};
  const have = state.inventory[id]||0;
  const rect = anchorEl.getBoundingClientRect();
  elPopover.dataset.equipId = id;
  elPopover.dataset.mode = 'equip';
  elPopover.innerHTML = `
    <div class="small muted" style="margin-bottom:6px;">Equip <b>${it.icon||''} ${it.name||base}</b></div>
    <div class="row">
      <button class="btn-primary" data-eq-amt="1">1</button>
      <button class="btn-primary" data-eq-amt="5">5</button>
      <button class="btn-primary" data-eq-amt="10">10</button>
      <button class="btn-primary" data-eq-amt="-1">All</button>
    </div>
    <div class="row">
      <input type="number" id="equipCustomAmt" min="1" max="${have}" placeholder="Custom" />
      <button class="btn-primary" data-eq-amt="custom">Equip</button>
    </div>
  `;
  elPopover.style.left = Math.min(window.innerWidth - 200, rect.left) + 'px';
  elPopover.style.top  = (rect.top - 4 + window.scrollY) + 'px';
  elPopover.classList.remove('hidden');
}

elPopover?.addEventListener('click', (e)=>{
  const sellBtn = e.target.closest('button[data-amt]');
  if (sellBtn && elPopover.dataset.mode === 'sell'){
    const id = elPopover.dataset.itemId; if(!id) return;
    const have = state.inventory[id]||0; if(have<=0) return;
    let amtAttr = sellBtn.getAttribute('data-amt'); let n = 0;
    if(amtAttr==='custom'){ const input = elPopover.querySelector('#sellCustomAmt'); n = Math.floor(+input.value||0); }
    else n = parseInt(amtAttr,10);
    if(n===-1) n = have;
    if(!Number.isFinite(n) || n<=0) return;
    n = Math.min(n, have);
    const value = sellPrice(id) * n;
    removeItem(state, id, n);
    addGold(state, value);
    closePopover(); renderInventory(); saveNow();
    return;
  }
  const eqBtn = e.target.closest('button[data-eq-amt]');
  if (eqBtn && elPopover.dataset.mode === 'equip'){
    const id = elPopover.dataset.equipId; if(!id) return;
    const have = state.inventory[id]||0; if(have<=0) return;
    let amtAttr = eqBtn.getAttribute('data-eq-amt'); let n = 0;
    if(amtAttr==='custom'){ const input = elPopover.querySelector('#equipCustomAmt'); n = Math.floor(+input.value||0); }
    else n = parseInt(amtAttr,10);
    if(n===-1) n = have;
    if(!Number.isFinite(n) || n<=0) return;
    n = Math.min(n, have);
    for (let i=0;i<n;i++){ equipItem(state, id); }
    closePopover(); renderInventory(); renderEquipment(); saveNow();
  }
});

elInv?.addEventListener('click', (e)=>{
  if (!e.shiftKey) return;
  const tile = e.target.closest('[data-id]');
  if (!tile) return;
  const id = tile.getAttribute('data-id');
  const bid = baseId(id);
  const def = ITEMS[bid] || {};
  let used = false;
  if (/_tool$/.test(def.type)) {
    const res = equipTool(state, bid);
    if (!res?.ok) return;
    used = true;
  } else if (Number(def.mana) > 0) {
    const r = drinkPotion(state, bid);
    if (!r || !r.ok) return;
    used = true;
  } else if (Number(def.accBonus) > 0) {
    const durMs = Math.max(1000, (def.durationSec|0)*1000 || 300000);
    applyEffect(state, { id: bid, name: def.name || 'Accuracy', durationMs: durMs, data: { accBonus: Number(def.accBonus)||0 } });
    removeItem(state, id, 1);
    used = true;
  } else if (Number(def.dmgReduce) > 0) {
    const durMs = Math.max(1000, (def.durationSec|0)*1000 || 300000);
    applyEffect(state, { id: bid, name: def.name || 'Defense', durationMs: durMs, data: { dmgReduce: Number(def.dmgReduce)||0 } });
    removeItem(state, id, 1);
    used = true;
  } else if (Number(def.damage) > 0) {
    const durMs = Math.max(1000, (def.durationSec|0)*1000 || 180000);
    applyEffect(state, { id: bid, name: def.name || 'Weapon Poison', durationMs: durMs, data: { poisonDmg: Number(def.damage)||0 } });
    removeItem(state, id, 1);
    used = true;
    try { window.dispatchEvent(new Event('effects:tick')); } catch {}
  } else {
    return;
  }
  if (!used) return;
  tile.classList.add('pulse');
  setTimeout(()=>tile.classList.remove('pulse'), 200);
  renderCharacterEffects();
  renderEquipment();
  renderInventory();
  saveNow();
  try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
  try { window.dispatchEvent(new Event('tools:change')); } catch {}
});

document.addEventListener('click', (e)=>{
  const inside = e.target.closest('#popover');
  const isSell = e.target.closest('button.sell-btn');
  const isEquipQuick = e.target.closest('button.equip-quick');
  if(!inside && !isSell && !isEquipQuick) closePopover();
});
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closePopover(); });

const USE_ORDER = ['tool','gear','tome','potion','food','essence','wood','plank','orebar','material','resource','misc'];
const useRankLocal = u => { const i = USE_ORDER.indexOf(u); return i === -1 ? USE_ORDER.length : i; };

function placeSortButtonNextToTitle(btn){
  if (!elInv) return;
  let header = null;
  let sib = elInv.previousElementSibling;
  while (sib){
    if (/inventory/i.test((sib.textContent || ''))) { header = sib; break; }
    sib = sib.previousElementSibling;
  }
  if (!header){
    const parent = elInv.parentElement;
    if (parent){
      header =
        parent.querySelector(':scope > .inventory-title, :scope > .inv-title') ||
        parent.querySelector(':scope > h2, :scope > h3');
      if (header && !/inventory/i.test((header.textContent || ''))) header = null;
    }
  }
  if (!header){
    header = Array.from(document.querySelectorAll('h1,h2,h3,.inv-title,.inventory-title'))
      .find(n => /inventory/i.test((n.textContent || '')));
  }
  if (header){
    header.classList.add('inv-title-host');
    let anchor = header.querySelector('.inv-sort-anchor');
    if (!anchor){
      anchor = document.createElement('span');
      anchor.className = 'inv-sort-anchor';
      header.appendChild(anchor);
    }
    if (btn.parentElement !== anchor) anchor.appendChild(btn);
  } else {
    const host = elInv.parentElement || document.body;
    if (btn.parentElement !== host) host.insertBefore(btn, elInv);
  }
}

function ensureInvSortBtn(){
  if (!elInv) return;
  let btn = document.getElementById('inv-sort-btn');
  if (!btn){
    btn = document.createElement('button');
    btn.id = 'inv-sort-btn'; btn.textContent = 'Sort'; btn.className = 'btn';
    btn.addEventListener('click', ()=>{
      state.ui = state.ui || {};
      state.ui.invSortUse = !state.ui.invSortUse;
      btn.classList.toggle('active', !!state.ui.invSortUse);
      renderInventory(); saveNow();
    });
    if (state.ui?.invSortUse) btn.classList.add('active');
    placeSortButtonNextToTitle(btn);
  }
  btn.style.display = (state.unlocks && state.unlocks.sort_inventory) ? '' : 'none';
}

document.addEventListener('DOMContentLoaded', ensureInvSortBtn);
window.addEventListener('favor:update', ensureInvSortBtn);
window.addEventListener('unlocks:changed', ensureInvSortBtn);
window.addEventListener('inventory:changed', ensureInvSortBtn);

on(elInv, 'dragstart', '.inv-slot', (e, tile)=>{
  const id = tile.getAttribute('data-id') || '';
  const qty = state.inventory?.[id] | 0;
  if (!id || qty <= 0) return;
  if (e.dataTransfer){
    e.dataTransfer.setData('application/x-runecut-item', id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData(REORDER_MIME, '1');
    e.dataTransfer.effectAllowed = 'copyMove';
  }
  tile.classList.add('dragging');
});

on(document, 'dragstart', '#inventory .inv-slot', (e, tile)=>{
  const id = tile.getAttribute('data-id') || '';
  if (!id) return;
  e.dataTransfer?.setData('application/x-runecut-item', id);
  e.dataTransfer?.setData('text/plain', id);
  e.dataTransfer?.setData(REORDER_MIME, '1');
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copyMove';
  tile.classList.add('dragging');
});

on(document, 'dragenter', '#inventory .inv-slot', (e, tile)=>{
  if (!e.dataTransfer?.types?.includes(REORDER_MIME)) return;
  e.preventDefault();
  tile.classList.add('drag-over');
});
on(document, 'dragover', '#inventory .inv-slot', (e)=>{
  if (!e.dataTransfer?.types?.includes(REORDER_MIME)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});
on(document, 'dragleave', '#inventory .inv-slot', (_e, tile)=>{
  tile.classList.remove('drag-over');
});
on(document, 'drop', '#inventory .inv-slot', (e, tile)=>{
  if (!e.dataTransfer?.types?.includes(REORDER_MIME)) return;
  e.preventDefault();
  const fromId = e.dataTransfer.getData('text/plain') || '';
  const toId   = tile.getAttribute('data-id') || '';
  tile.classList.remove('drag-over');
  if (!fromId || !toId || fromId === toId) return;
  const order = getInvOrder().slice();
  const fromIdx = order.indexOf(fromId);
  const toIdx   = order.indexOf(toId);
  if (fromIdx === -1 || toIdx === -1) return;
  order.splice(fromIdx, 1);
  order.splice(toIdx, 0, fromId);
  setInvOrder(order);
  saveNow();
  renderInventory();
});
on(document, 'dragend', '#inventory .inv-slot', (_e, tile)=>{
  tile?.classList?.remove('dragging');
  elInv?.querySelectorAll('.drag-over')?.forEach(n=>n.classList.remove('drag-over'));
});


function ensureInvFilterBar(){
  if (!elInv) return;
  let host = elInv.previousElementSibling;
  while (host && !/inventory/i.test(host.textContent||'')) host = host.previousElementSibling;
  if (!host) host = elInv.parentElement;
  if (!host) host = document.body;
  let bar = document.getElementById('inv-filter-bar');
  if (!bar){
    bar = document.createElement('div');
    bar.id = 'inv-filter-bar';
    bar.className = 'inv-filter-bar';
    const types = ['all','equipment','food','potion','resource','material','reagent','gem','vial','spell'];
    for (const t of types){
      const pill = document.createElement('button');
      pill.className = 'inv-filter-pill';
      pill.dataset.t = t;
      pill.textContent = t[0].toUpperCase()+t.slice(1);
      bar.appendChild(pill);
    }
    host.insertBefore(bar, host.firstChild);
    bar.addEventListener('click', (e)=>{
      const pill = e.target.closest('.inv-filter-pill'); if (!pill) return;
      const t = pill.dataset.t;
      const arr = (state.ui?.invFilterTypes && Array.isArray(state.ui.invFilterTypes)) ? state.ui.invFilterTypes.slice() : [];
      const ix = arr.indexOf(t);
      if (t === 'all'){
        state.ui = state.ui || {};
        state.ui.invFilterTypes = ['all'];
      } else {
        if (ix>=0) arr.splice(ix,1); else arr.push(t);
        state.ui = state.ui || {};
        state.ui.invFilterTypes = arr.filter(x=>x!=='all');
      }
      updateFilterPills();
      renderInventory();
      try{ saveNow(); }catch{}
    });
  }
  updateFilterPills();
}
function updateFilterPills(){
  const bar = document.getElementById('inv-filter-bar'); if (!bar) return;
  const arr = (state.ui?.invFilterTypes && Array.isArray(state.ui.invFilterTypes)) ? state.ui.invFilterTypes : ['all'];
  const active = new Set(arr.length?arr:['all']);
  bar.querySelectorAll('.inv-filter-pill').forEach(p=>{
    const t = p.dataset.t;
    p.classList.toggle('active', active.has(t) || (active.has('all') && t==='all'));
  });
}

export { ensureInvSortBtn };