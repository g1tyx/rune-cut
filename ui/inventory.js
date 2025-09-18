// /ui/inventory.js
import { ITEMS } from '../data/items.js';
import { saveState, state } from '../systems/state.js';
import { removeItem, addGold } from '../systems/inventory.js';
import { equipItem, canEquip, equipReqLabel } from '../systems/equipment.js';
import { renderEquipment } from './equipment.js';
import { hpMaxFor } from '../systems/combat.js';
import { qs, on } from '../utils/dom.js';
import { showTip, hideTip } from './tooltip.js';
import { tomeDurationMsFor, tomeRemainingMs } from '../systems/tomes.js';

const elInv = qs('#inventory');
const elPopover = qs('#popover');

/* ------------- ensure CSS for quick-equip ------------- */
(function ensureInvEquipCSS(){
  if (document.getElementById('invEquipCSS')) return;
  const css = document.createElement('style');
  css.id = 'invEquipCSS';
  css.textContent = `
    #inventory .icon-img.glow{ filter: drop-shadow(0 0 6px rgba(116,255,255,.85)) drop-shadow(0 0 16px rgba(116,255,255,.45)); }
    #inventory .inv-slot{ position:relative; }
    /* show small action buttons only on hover */
    #inventory .inv-slot .equip-quick,
    #inventory .inv-slot .use-btn{
      position:absolute; left:4px; bottom:4px; z-index:2;
      font-size:11px; padding:2px 6px; line-height:14px;
      opacity:0; pointer-events:none; transition:opacity .15s ease;
    }
    #inventory .inv-slot:hover .equip-quick,
    #inventory .inv-slot:hover .use-btn{ opacity:1; pointer-events:auto; }

    /* keep sell in bottom-right */
    #inventory .inv-slot .sell-btn{
      position:absolute; right:4px; bottom:4px; z-index:2;
    }
  `;
  document.head.appendChild(css);
})();

/* ---------------- equip food helper ----------------- */
function equipFoodAllFromInventory(id){
  const base = baseId(id);
  const have = state.inventory[id] || 0;
  if (have <= 0) return false;

  if (!state.equipment) state.equipment = {};

  // If a different food is equipped, return its stack to inventory first
  if (state.equipment.food && state.equipment.food !== base){
    const prevBase = state.equipment.food;
    const prevQty  = Math.max(0, state.equipment.foodQty|0);
    if (prevQty > 0){
      state.inventory[prevBase] = (state.inventory[prevBase]||0) + prevQty;
    }
    state.equipment.foodQty = 0;
  }

  state.equipment.food    = base;
  state.equipment.foodQty = (state.equipment.foodQty|0) + have;

  // remove entire stack of this id from inventory
  removeItem(state, id, have);
  window.dispatchEvent(new Event('food:change'));
  return true;
}

/* ---------------- metal/tint helpers ---------------- */
function baseId(id){ return String(id).split('@')[0]; }

function metalFromItemId(id=''){
  const s = baseId(id);
  let m = s.match(/^bar_(\w+)/)?.[1] || s.match(/^ore_(\w+)/)?.[1];
  if (m) return m;
  m = s.match(/^(axe|pick)_(\w+)/)?.[2];
  if (m) return m;
  m = s.split('_')[0];
  if (['copper','bronze','iron','steel','mith','adamant','rune'].includes(m)) return m;
  return null;
}
function tintClassForItem(id=''){
  const base = baseId(id);
  const def = ITEMS[base] || {};
  if (def.tint) return ` tint-${def.tint}`;
  const m = metalFromItemId(id);
  return m ? ` tint-${m}` : '';
}

/* ---------------- pricing/consumption helpers ---------------- */
function qualityPct(id){
  const q = parseInt(String(id).split('@')[1], 10);
  return Number.isFinite(q) ? Math.max(1, Math.min(100, q)) : 100;
}

function sellPrice(id){
  const base = baseId(id);
  const it = ITEMS[base] || {};
  const qMul = qualityPct(id) / 100;
  let price = it.sell || 0;
  if (it.type === 'equipment'){
    const statScore = (it.atk||0) + (it.str||0) + (it.def||0) + 0.5*(it.hp||0);
    const toolBonus = it.speed ? 8*it.speed : 0;
    price = Math.max(price, Math.round(2*statScore + toolBonus));
    price = Math.round(Math.max(1, price) * qMul);
  } else {
    price = Math.max(1, Math.round(price || 1));
  }
  return price;
}

function healAmountFor(id){
  const base = baseId(id);
  const def = ITEMS[base] || {};
  return Number.isFinite(def.heal) ? def.heal : 0;
}
function eatItem(id){
  const heal = healAmountFor(id);
  if(heal <= 0) return false;
  const max = hpMaxFor(state);
  if(state.hpCurrent >= max) return false;
  state.hpCurrent = Math.min(max, state.hpCurrent + heal);
  removeItem(state, id, 1);
  return true;
}

/* ---------------- render ---------------- */
export function renderInventory(){
  if (!elInv) return;

  const entries = Object.entries(state.inventory || {})
    .filter(([, qty]) => (qty|0) > 0); // ignore empty stacks

  if (!entries.length){
    elInv.innerHTML = '<div class="muted">No items yet. Gather or fight to earn loot.</div>';
    return;
  }

  elInv.innerHTML = entries.map(([id, qty])=>{
    const base    = baseId(id);
    const it      = ITEMS[base] || {};
    const isEquip = it.type === 'equipment';
    const isFood  = (it.type === 'food') || (healAmountFor(id) > 0);

    // simple material fallback image for ores/bars only; other materials should define their own img
    const isMat   = /^bar_|^ore_/.test(base);
    const imgSrc  = it.img || (isMat ? 'assets/materials/ore.png' : null);

    const tintCls = tintClassForItem(id);
    const glowCls = it.glow ? ' glow' : '';
    const iconHtml = imgSrc
      ? `<img src="${imgSrc}" class="icon-img${tintCls}${glowCls}" alt="${it.name || base}">`
      : `<span class="icon">${it.icon || '❔'}</span>`;

    const isTome = isEquip && (it.slot === 'tome');

    return `
      <div class="inv-slot ${isEquip ? 'equip' : isFood ? 'food' : ''}"
          data-id="${id}" draggable="true">
        ${iconHtml}
        ${isFood ? `<button class="use-btn" data-use="${id}" title="Eat">Eat</button>` : ''}
        <button class="sell-btn" data-sell="${id}">Sell</button>
        ${isTome ? `<button class="equip-quick btn-primary" data-equip="${id}" title="Equip">Equip</button>` : ''}
        <span class="qty-badge">${qty}</span>
      </div>`;
  }).join('');
}

on(elInv, 'click', '.inv-slot.food', (e, tile)=>{
  if (e.target.closest('button')) return; // let Eat/Sell work
  const id = tile.getAttribute('data-id');
  if (equipFoodAllFromInventory(id)){
    renderInventory();
    renderEquipment();
    saveState(state);
  }
});

/* ---------------- interactions ---------------- */
// Eat
on(elInv, 'click', 'button.use-btn', (e, btn)=>{
  e.stopPropagation();
  const id = btn.getAttribute('data-use');
  if (eatItem(id)){ renderInventory(); saveState(state); }
});

// Sell popover open
on(elInv, 'click', 'button.sell-btn', (e, btn)=>{
  e.stopPropagation(); // prevent slot click = equip
  openSellPopover(btn, btn.getAttribute('data-sell'));
});

// Quick-equip for tomes (quantity picker)
on(elInv, 'click', 'button.equip-quick', (e, btn)=>{
  e.stopPropagation();
  const id = btn.getAttribute('data-equip');
  openEquipPopover(btn, id);
});

// Clicking an equipment tile equips it — but ignore if a nested button was clicked
on(elInv, 'click', '.inv-slot.equip', (e, tile)=>{
  if (e.target.closest('button')) return; // don't equip when pressing Sell/Equip buttons
  const id   = tile.getAttribute('data-id');
  const base = baseId(id);
  const it   = ITEMS[base];
  if (!it || it.type !== 'equipment') return;

  const gate = canEquip(state, id); // handles @quality internally
  if (!gate.ok) {
    // 3-arg signature: (event, title, body)
    showTip(e, it.name || base, gate.message);
    return;
  }

  equipItem(state, id);
  renderInventory();
  renderEquipment();
  saveState(state);
});

on(elInv, 'dragstart', '.inv-slot', (e, tile)=>{
  const id  = tile.getAttribute('data-id') || '';
  const qty = state.inventory?.[id] | 0;
  if (!id || qty <= 0) return;

  // standardize drag payload for all systems (equipment, enchanting, etc.)
  if (e.dataTransfer){
    e.dataTransfer.setData('application/x-runecut-item', id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'copy';
  }
});

on(document, 'dragstart', '#inventory .inv-slot', (e, tile)=>{
  const id = tile.getAttribute('data-id') || '';
  if (!id) return;
  e.dataTransfer?.setData('application/x-runecut-item', id);
  e.dataTransfer?.setData('text/plain', id);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
});

/* ---------------- tooltip ---------------- */
function tomeTooltipLines(base){
  const def = ITEMS[base] || {};
  const lines = [];
  if (def?.tome){
    const ms = tomeDurationMsFor(state, base);
    const secs = Math.round(ms/1000);
    lines.push(`Runs for: ${secs}s (scales with Enchanting)`);
    const rem = tomeRemainingMs(state);
    if (rem > 0){
      lines.push(`Active tome remaining: ${Math.ceil(rem/1000)}s`);
    }
  }
  return lines;
}

on(elInv, 'mousemove', '.inv-slot', (e, tile)=>{
  const id = tile.getAttribute('data-id'); 
  if (!id){ hideTip(); return; }

  const base = baseId(id);
  const def  = ITEMS[base] || {};
  const isEquip = def.type === 'equipment';
  const isFood  = def.type === 'food' || healAmountFor(id) > 0;
  const isTool  = isEquip && (def.slot === 'axe' || def.slot === 'pick' || def.speed);

  const qStr = String(id).split('@')[1];
  const q = (isEquip && Number.isFinite(parseInt(qStr,10))) 
    ? Math.max(1, Math.min(100, parseInt(qStr,10))) 
    : null;
  const mult = q ? q/100 : 1;

  const title = `${def.name || base}`;
  const lines = [];

  if (isEquip){
    if (q != null) lines.push(`Quality: ${q}%`);

    const stats = [];
    if (def.atk) stats.push(`Atk: ${Math.round(def.atk*mult)}`);
    if (def.str) stats.push(`Str: ${Math.round(def.str*mult)}`);
    if (def.def) stats.push(`Def: ${Math.round(def.def*mult)}`);
    if (def.hp)  stats.push(`HP: ${Math.round(def.hp*mult)}`);
    if (stats.length) lines.push(stats.join(' · '));

    if (isTool && def.speed) lines.push(`Speed: ${Number(def.speed).toFixed(2)}×`);

    // Tome specifics
    if (def.slot === 'tome'){
      lines.push(...tomeTooltipLines(base));
    }
    const req = equipReqLabel(base);
    if (req) lines.push(req);
  }

  if (isFood){
    const heal = healAmountFor(id);
    if (heal > 0) lines.push(`Heals: ${heal} HP`);
  }

  if (!isEquip){
    const qty  = state.inventory?.[id] || 0;
    const each = sellPrice(id);
    if (qty > 0){
      const total = each ? ` · Total: ${each*qty}g` : '';
      const eaStr = each ? ` · ${each}g ea` : '';
      lines.push(`Qty: ${qty}${eaStr}${qty>1 ? total : ''}`);
    }
  }

  showTip(e, title, lines.join('\n'));
});

on(elInv, 'mouseout', '.inv-slot', (e, tile)=>{
  const to = e.relatedTarget;
  if (!to || !tile.contains(to)) hideTip();
});
elInv?.addEventListener('mouseleave', hideTip);

/* ---------------- sell popover ---------------- */
function openSellPopover(anchorEl, id){
  if (!elPopover) return;
  const base = baseId(id);
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
  elPopover.style.top = (rect.top - 4 + window.scrollY) + 'px';
  elPopover.classList.remove('hidden');
}
export function closePopover(){ elPopover?.classList.add('hidden'); }

/* ---------------- equip popover (tomes) ---------------- */
function openEquipPopover(anchorEl, id){
  if(!elPopover) return;
  const base = baseId(id);
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
  elPopover.style.top = (rect.top - 4 + window.scrollY) + 'px';
  elPopover.classList.remove('hidden');
}

export function findInvIconEl(id){
  // exact-id match first
  const tile = document.querySelector(`#inventory .inv-slot[data-id="${CSS.escape(id)}"]`);
  if (tile) return tile.querySelector('img.icon-img, .icon');
  // fallback: match by base id (before @quality), pick the first
  const base = String(id).split('@')[0];
  const tiles = document.querySelectorAll('#inventory .inv-slot');
  for (const t of tiles){
    const tid = t.getAttribute('data-id') || '';
    if (tid.split('@')[0] === base){
      return t.querySelector('img.icon-img, .icon');
    }
  }
  return null;
}
/* ---------------- popover click handling ---------------- */
elPopover?.addEventListener('click', (e)=>{
  // SELL mode
  const sellBtn = e.target.closest('button[data-amt]');
  if (sellBtn && elPopover.dataset.mode === 'sell'){
    const id = elPopover.dataset.itemId; if(!id) return;
    const have = state.inventory[id]||0; if(have<=0) return;
    let amtAttr = sellBtn.getAttribute('data-amt');
    let n = 0;
    if(amtAttr==='custom'){ const input = elPopover.querySelector('#sellCustomAmt'); n = Math.floor(+input.value||0); }
    else n = parseInt(amtAttr,10);
    if(n===-1) n = have;
    if(!Number.isFinite(n) || n<=0) return;
    n = Math.min(n, have);
    const value = sellPrice(id) * n;
    removeItem(state, id, n);
    addGold(state, value);
    closePopover(); renderInventory(); saveState(state);
    return;
  }

  // EQUIP mode
  const eqBtn = e.target.closest('button[data-eq-amt]');
  if (eqBtn && elPopover.dataset.mode === 'equip'){
    const id = elPopover.dataset.equipId; if(!id) return;
    const have = state.inventory[id]||0; if(have<=0) return;

    let amtAttr = eqBtn.getAttribute('data-eq-amt');
    let n = 0;
    if(amtAttr==='custom'){ const input = elPopover.querySelector('#equipCustomAmt'); n = Math.floor(+input.value||0); }
    else n = parseInt(amtAttr,10);
    if(n===-1) n = have;
    if(!Number.isFinite(n) || n<=0) return;
    n = Math.min(n, have);

    for (let i=0;i<n;i++){
      equipItem(state, id);
    }
    closePopover();
    renderInventory(); renderEquipment(); saveState(state);
  }
});

// close popover globally
document.addEventListener('click', (e)=>{
  const inside = e.target.closest('#popover');
  const isSell = e.target.closest('button.sell-btn');
  const isEquipQuick = e.target.closest('button.equip-quick');
  if(!inside && !isSell && !isEquipQuick) closePopover();
});
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closePopover(); });
