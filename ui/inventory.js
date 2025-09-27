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
import { drinkPotion } from '../systems/mana.js';
import { renderCharacterEffects } from './character.js';
import { applyEffect } from '../systems/effects.js';

const elInv = qs('#inventory');

// ---------- regex / encoding ----------
const ENCH_RE  = /#e:([a-zA-Z_]+):(\d+)/;     // ring enchant encoder
const SWIFT_RE = /#swift:([0-9.]+)/;          // tool swiftness encoder

// ---------- CSS ----------
(function ensureInvEquipCSS(){
  if (document.getElementById('invEquipCSS')) return;
  const css = document.createElement('style');
  css.id = 'invEquipCSS';
  css.textContent = `
    #inventory .icon-img.glow{
      filter: drop-shadow(0 0 6px rgba(116,255,255,.85)) drop-shadow(0 0 16px rgba(116,255,255,.45));
    }
    #inventory .inv-slot{ position:relative; }
    #inventory .inv-slot .equip-quick, #inventory .inv-slot .use-btn{
      position:absolute; left:4px; bottom:4px; z-index:2; font-size:11px; padding:2px 6px; line-height:14px;
      opacity:0; pointer-events:none; transition:opacity .15s ease;
    }
    #inventory .inv-slot:hover .equip-quick, #inventory .inv-slot:hover .use-btn{ opacity:1; pointer-events:auto; }
    #inventory .inv-slot .sell-btn{ position:absolute; right:4px; bottom:4px; z-index:2; }
    #inventory .inv-slot.pulse{ animation: inv-pulse 220ms ease-out; }
    @keyframes inv-pulse { 0% { transform: scale(1); } 50% { transform: scale(0.97); } 100% { transform: scale(1); } }
    #inv-sort-btn.active{ background:#1b2333; border:1px solid rgba(255,255,255,.2); }
  `;
  document.head.appendChild(css);
})();

// ---------- helpers ----------
const baseId = id => String(id).split('@')[0];
const baseIdStrict = s => String(s||'').split('@')[0].split('#')[0];

function metalFromItemId(id=''){
  const base = baseIdStrict(id);
  let m = s.match(/^bar_(\w+)/)?.[1] || s.match(/^ore_(\w+)/)?.[1];
  if (m) return m;
  m = s.match(/^(axe|pick)_(\w+)/)?.[2];
  if (m) return m;
  m = s.split('_')[0];
  if (['copper','bronze','iron','steel','mith','adamant','rune'].includes(m)) return m;
  return null;
}
function tintClassForItem(id=''){
  const base = baseIdStrict(id);
  const def = ITEMS[base] || {};
  if (def.tint) return ` tint-${def.tint}`;
  const s = base;
  let m = s.match(/^bar_(\w+)/)?.[1] || s.match(/^ore_(\w+)/)?.[1];
  if (m) return ` tint-${m}`;
  m = s.match(/^(axe|pick)_(\w+)/)?.[2];
  if (m) return ` tint-${m}`;
  m = s.split('_')[0];
  if (['copper','bronze','iron','steel','blacksteel','starsteel'].includes(m)) return ` tint-${m}`;
  return '';
}

function qualityPct(id){
  const q = parseInt(String(id).split('@')[1], 10);
  return Number.isFinite(q) ? Math.max(1, Math.min(100, q)) : 100;
}
function healAmountFor(id){
  const base = baseIdStrict(id);
  const def = ITEMS[base] || {};
  return Number.isFinite(def.heal) ? def.heal : 0;
}
function eatItem(id){
  const heal = healAmountFor(id);
  if (heal <= 0) return false;
  const max = hpMaxFor(state);
  if (state.hpCurrent >= max) return false;
  state.hpCurrent = Math.min(max, state.hpCurrent + heal);
  removeItem(state, id, 1);
  return true;
}

// parse enchant from id and map to tier
function enchantFromId(id=''){
  const m = String(id).match(ENCH_RE);
  if (!m) return null;
  const stat = m[1], add = Number(m[2])||0;
  const table = {
    hpMax:[12,20,30,45,60],
    manaMax:[10,15,25,38,50],
    defense:[6,10,15,27,30],
    attack:[4,6,10,15,20],
    strength:[4,6,10,15,20],
  };
  const ix = (table[stat]||[]).indexOf(add);
  const keys = ['minor','standard','greater','grand','mythic'];
  const tier = ix>=0 ? keys[ix] : null;
  return { stat, add, tier };
}

// ---------- sell value (includes Option C ring-enchant bonus) ----------
function sellPrice(id){
  const base = baseIdStrict(id);
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

  // ring-enchant sale bonus (Option C)
  const m = String(id).match(/#e:([a-zA-Z_]+):(\d+)/);
  if (m){
    const stat = m[1], add = Number(m[2])||0;
    const tiers = { hpMax:[12,20,30,45,60], manaMax:[10,15,25,38,50], defense:[6,10,15,27,30], attack:[4,6,10,15,20], strength:[4,6,10,15,20] };
    const ix = (tiers[stat]||[]).indexOf(add);
    const pct = [15,25,50,100,200][ix] || 0;
    price = Math.round(price * (1 + pct/100));
  }

  return price;
}

// ---------- inventory UI ----------
export function findInvIconEl(id){
  const tile = document.querySelector(`#inventory .inv-slot[data-id="${CSS.escape(id)}"]`);
  if (tile) return tile.querySelector('img.icon-img, .icon');

  const base = baseIdStrict(id);
  const tiles = document.querySelectorAll('#inventory .inv-slot');
  for (const t of tiles){
    const tidBase = baseIdStrict(t.getAttribute('data-id') || '');
    if (tidBase === base){
      return t.querySelector('img.icon-img, .icon');
    }
  }
  return null;
}

export function renderInventory(){
  if (!elInv) return;

  let entries = Object.entries(state.inventory || {}).filter(([, qty]) => (qty|0) > 0);

  // Optional sort toggle (by use then name)
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
  }

  if (!entries.length){
    elInv.innerHTML = '<div class="muted">No items yet. Gather or fight to earn loot.</div>';
    return;
  }

  elInv.innerHTML = entries.map(([id, qty])=>{
    const base = baseIdStrict(id);
    const it = ITEMS[base] || {};
    const isEquip = it.type === 'equipment';
    const isFood = (it.type === 'food') || (healAmountFor(id) > 0);
    const isPotion= (!isFood && (Number(it.mana)>0 || Number(it.accBonus)>0 || Number(it.dmgReduce)>0));
    const isMat = /^bar_|^ore_/.test(base);
    const imgSrc = it.img || (isMat ? 'assets/materials/ore.png' : null);
    const tintCls = tintClassForItem(id);
    const glowCls = it.glow ? ' glow' : '';
    const iconHtml = imgSrc ? `<img src="${imgSrc}" class="icon-img${tintCls}${glowCls}" alt="${it.name || base}">`
                            : `<span class="icon">${it.icon || '❔'}</span>`;
    const isTome = isEquip && (it.slot === 'tome');
    const actionBtnHtml = isFood ? `<button class="use-btn" data-use="${id}" title="Eat">Eat</button>` : '';

    return `<div class="inv-slot ${isEquip ? 'equip' : isFood ? 'food' : isPotion ? 'potion' : ''}" data-id="${id}" draggable="true" title="${isPotion ? 'Shift-click to drink' : ''}">
      ${iconHtml}
      ${actionBtnHtml}
      <button class="sell-btn" data-sell="${id}">Sell</button>
      ${isTome ? `<button class="equip-quick btn-primary" data-equip="${id}" title="Equip">Equip</button>` : ''}
      <span class="qty-badge">${qty}</span>
    </div>`;
  }).join('');
}

// ---------- equip food from inventory (stack) ----------
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
  if (equipFoodAllFromInventory(id)){ renderInventory(); renderEquipment(); saveState(state); }
});

on(elInv, 'click', 'button.use-btn', (e, btn)=>{
  e.stopPropagation();
  const id = btn.getAttribute('data-use');
  if (eatItem(id)){ renderInventory(); saveState(state); }
});

on(elInv, 'click', 'button.sell-btn', (e, btn)=>{
  e.stopPropagation();
  openSellPopover(btn, btn.getAttribute('data-sell'));
});

on(elInv, 'click', 'button.equip-quick', (e, btn)=>{
  e.stopPropagation();
  const id = btn.getAttribute('data-equip');
  openEquipPopover(btn, id);
});

on(elInv, 'click', '.inv-slot.equip', (e, tile)=>{
  if (e.target.closest('button')) return;
  const id = tile.getAttribute('data-id');    
  const base = baseIdStrict(id);               
  const it = ITEMS[base];
  if (!it || it.type !== 'equipment') return;

  // validate using the base item (avoids "unknown item" from canEquip)
  const gate = canEquip(state, base);
  if (!gate.ok) { showTip(e, it.name || base, gate.message); return; }

  equipItem(state, id);
  renderInventory();
  renderEquipment();
  saveState(state);
});

// keep DnD data on inventory tiles
on(elInv, 'dragstart', '.inv-slot', (e, tile)=>{
  const id = tile.getAttribute('data-id') || '';
  const qty = state.inventory?.[id] | 0;
  if (!id || qty <= 0) return;
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

// ---------- tooltips on inventory tiles ----------
function tomeTooltipLines(base){
  const def = ITEMS[base] || {};
  const lines = [];
  if (def?.tome){
    const ms = tomeDurationMsFor(state, base);
    const secs = Math.round(ms/1000);
    lines.push(`Runs for: ${secs}s (scales with Enchanting)`);
    const rem = tomeRemainingMs(state);
    if (rem > 0){ lines.push(`Active tome remaining: ${Math.ceil(rem/1000)}s`); }
  }
  return lines;
}

on(elInv, 'mousemove', '.inv-slot', (e, tile)=>{
  const id = tile.getAttribute('data-id');
  if (!id){ hideTip(); return; }

  const base = baseIdStrict(id);
  const def = ITEMS[base] || {};
  const isEquip = def.type === 'equipment';
  const isFood  = def.type === 'food' || healAmountFor(id) > 0;
  const isTool  = isEquip && (def.slot === 'axe' || def.slot === 'pick' || def.speed);

  const qStr = String(id).split('@')[1];
  const q = (isEquip && Number.isFinite(parseInt(qStr,10))) ? Math.max(1, Math.min(100, parseInt(qStr,10))) : null;
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

    if (def.slot === 'tome'){ lines.push(...tomeTooltipLines(base)); }
    const req = equipReqLabel(base); if (req) lines.push(req);

    // Bound ring enchant (from id)
    if (def.slot === 'ring'){
      const efx = enchantFromId(id);
      if (efx){
        const pretty = { hpMax:'HP', manaMax:'Mana', defense:'Defense', attack:'Attack', strength:'Strength' }[efx.stat] || efx.stat;
        lines.push(`✨ +${efx.add} ${pretty}${efx.tier?` (${efx.tier[0].toUpperCase()+efx.tier.slice(1)})`:''}`);
      }
    }

    // Swiftness (from id)
    const mSwift = String(id).match(SWIFT_RE);
    if (mSwift){
      const s = parseFloat(mSwift[1])||0;
      lines.push(`⚡ +${s.toFixed(2)} speed`);
    }
  }

  if (isFood){
    const heal = healAmountFor(id);
    if (heal > 0) lines.push(`Heals: ${heal} HP`);
  }

  if (!isEquip && !isFood){
    if (Number(def.mana) > 0) lines.push(`Restores: ${def.mana|0} Mana`);
    if (Number(def.accBonus) > 0){
      const secs = Math.max(1, (def.durationSec|0) || 300);
      const pct = Math.round((Number(def.accBonus)||0)*100);
      lines.push(`Buff: +${pct}% hit chance for ${secs}s`);
    }
    if (Number(def.dmgReduce) > 0){
      const secs = Math.max(1, (def.durationSec|0) || 300);
      const flat = Number(def.dmgReduce)|0;
      lines.push(`Buff: -${flat} enemy damage for ${secs}s`);
    }
  }

  // Qty + gold
  const qty = state.inventory?.[id] || 0;
  if (!isEquip && qty > 0){
    const each = sellPrice(id);
    const total = each ? ` · Total: ${each*qty}g` : '';
    const eaStr = each ? ` · ${each}g ea` : '';
    lines.push(`Qty: ${qty}${eaStr}${qty>1 ? total : ''}`);
  }

  showTip(e, title, lines.join('\n'));
});
on(elInv, 'mouseout', '.inv-slot', (e, tile)=>{
  const to = e.relatedTarget;
  if (!to || !tile.contains(to)) hideTip();
});
elInv?.addEventListener('mouseleave', hideTip);

// ---------- Sell / Equip popovers ----------
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
    closePopover(); renderInventory(); saveState(state);
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
    closePopover(); renderInventory(); renderEquipment(); saveState(state);
  }
});

// shift-click item use (potions / buffs)
elInv?.addEventListener('click', (e)=>{
  if (!e.shiftKey) return;
  const tile = e.target.closest('[data-id]'); if (!tile) return;
  const id = tile.getAttribute('data-id');
  const bid = baseId(id);
  const def = ITEMS[bid] || {};
  if (Number(def.mana) > 0){
    const res = drinkPotion(state, bid);
    if (!res || !res.ok) return;
  } else if (Number(def.accBonus) > 0){
    const durMs = Math.max(1000, (def.durationSec|0) * 1000 || 300000);
    applyEffect(state, { id: bid, name: def.name || 'Accuracy', durationMs: durMs, data: { accBonus: Number(def.accBonus)||0 } });
    removeItem(state, id, 1);
  } else if (Number(def.dmgReduce) > 0){
    const durMs = Math.max(1000, (def.durationSec|0) * 1000 || 300000);
    applyEffect(state, { id: bid, name: def.name || 'Defense', durationMs: durMs, data: { dmgReduce: Number(def.dmgReduce)||0 } });
    removeItem(state, id, 1);
  } else { return; }

  tile.classList.add('pulse'); setTimeout(()=> tile.classList.remove('pulse'), 200);
  renderCharacterEffects(); renderEquipment(); renderInventory(); saveState(state);
  try { window.dispatchEvent(new Event('inventory:change')); } catch {}
  try { window.dispatchEvent(new Event('effects:tick')); } catch {}
});

// popover close
document.addEventListener('click', (e)=>{
  const inside = e.target.closest('#popover');
  const isSell = e.target.closest('button.sell-btn');
  const isEquipQuick = e.target.closest('button.equip-quick');
  if(!inside && !isSell && !isEquipQuick) closePopover();
});
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closePopover(); });

// ---------- sorting toggle ----------
const USE_ORDER = ['tool','gear','tome','potion','food','essence','wood','plank','orebar','material','resource','misc'];
const useRank = u => { const i = USE_ORDER.indexOf(u); return i === -1 ? USE_ORDER.length : i; };
const invUseOf = (base) => {
  const it = ITEMS[base] || {};
  if (it.invUse) return it.invUse; // optional override
  if (it.slot === 'tome') return 'tome';
  if (it.type === 'food') return 'food';
  if (it.type === 'potion' || it.mana || it.accBonus || it.dmgReduce) return 'potion';
  if (it.type === 'equipment') {
    if (it.slot === 'axe' || it.slot === 'pick' || it.slot === 'fishing' || it.speed) return 'tool';
    return 'gear';
  }
  const id = String(base);
  if (/_essence$/.test(id)) return 'essence';
  if (id.startsWith('log_') || id.startsWith('plank_')) return 'wood';
  if (id.startsWith('ore_') || id.startsWith('bar_')) return 'orebar';
  if (it.type === 'material') return 'material';
  if (it.type === 'resource') return 'resource';
  return 'misc';
};

(function ensureInvSortBtn(){
  if (!elInv || document.getElementById('inv-sort-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'inv-sort-btn'; btn.textContent = 'Sort'; btn.className = 'btn';
  btn.style.margin = '0 0 8px 0';
  btn.style.background = 'rgb(28, 18, 139)';
  btn.style.color = '#eaf2ff';
  btn.style.border = '1px solid rgba(255,255,255,0.12)';
  btn.style.boxShadow = '0 6px 14px rgba(59,130,246,.25), inset 0 1px 0 rgba(255,255,255,.15)';
  btn.style.fontWeight = '700';
  btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.25)'; });
  btn.addEventListener('mouseleave', () => { btn.style.filter = ''; });
  const host = elInv.parentElement || document.body;
  host.insertBefore(btn, elInv);
  btn.addEventListener('click', ()=>{
    state.ui = state.ui || {};
    state.ui.invSortUse = !state.ui.invSortUse;
    btn.classList.toggle('active', !!state.ui.invSortUse);
    renderInventory(); saveState(state);
  });
  function syncSortBtnVis(){ btn.style.display = (state.unlocks && state.unlocks.sort_inventory) ? '' : 'none'; }
  syncSortBtnVis();
  window.addEventListener('favor:update', syncSortBtnVis);
  if (state.ui?.invSortUse) btn.classList.add('active');
})();
