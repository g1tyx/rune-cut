import { state, saveState } from '../systems/state.js';
import { qs, on } from '../utils/dom.js';
import { unequipItem } from '../systems/equipment.js';
import { showTip, hideTip } from './tooltip.js';
import { ITEMS } from '../data/items.js';
import { derivePlayerStats, hpMaxFor } from '../systems/combat.js';
import { MONSTERS } from '../data/monsters.js';
import { getConsumableEffect } from '../data/enchant_effects.js';
import { renderInventory } from './inventory.js';
import { removeItem } from '../systems/inventory.js';
import { ensureMana, manaMaxFor, startManaRegen, onManaChange } from '../systems/mana.js';
import { ensureTomeEngine, tomeRemainingMs, tomeDurationMsFor } from '../systems/tomes.js';

// ---------- DOM roots ----------
const grid = qs('#equipmentGrid');
const elMpText = qs('#charManaText');
const elMpBar  = qs('#charManaBar');
const elMpLbl  = qs('#charManaLabel');

// ---------- one-time CSS ----------
(function injectEquipCSS(){
  if (!document.getElementById('equipSwiftCSS')) {
    const css = document.createElement('style');
    css.id = 'equipSwiftCSS';
    css.textContent = `
      .equip-grid .slot.drop-ok{ outline:2px solid gold; box-shadow:0 0 12px rgba(255,215,0,.6) inset; }
    `;
    document.head.appendChild(css);
  }
  if (!document.getElementById('equipQtyCSS')) {
    const css = document.createElement('style');
    css.id = 'equipQtyCSS';
    css.textContent = `
      #equipmentGrid .slot{ position:relative; }
      #equipmentGrid .slot .qty-badge{
        position:absolute; right:4px; top:4px;
        font-size:11px; line-height:16px; padding:0 6px;
        background:rgba(0,0,0,.65); color:#fff; border-radius:10px;
        pointer-events:none;
      }
      #equipmentGrid .slot .eat-btn{
        position:absolute; left:4px; bottom:4px;
        font-size:11px; line-height:14px; padding:2px 6px;
        opacity:0; pointer-events:none; transition:opacity .15s ease;
      }
      #equipmentGrid .slot:hover .eat-btn{ opacity:1; pointer-events:auto; }

      /* Enchant badge (tier display) */
      #equipmentGrid .slot .enchant-badge{
        position:absolute; left:4px; top:4px;
        font-size:11px; line-height:16px; padding:0 6px;
        background:rgba(255,215,0,.15); color:#ffd700;
        border:1px solid rgba(255,215,0,.5);
        border-radius:10px; pointer-events:none;
        text-shadow:0 0 6px rgba(255,215,0,.5);
      }

      /* Drop target highlight */
      .equip-grid .equip-cell.drag-target .slot{
        outline:2px dashed rgba(255,215,0,.6);
      }

      /* Small pulse when enchant applied */
      .equip-grid .equip-cell .slot.enchanted-pulse{
        animation: enchantPulse .35s ease;
      }
      @keyframes enchantPulse{
        0%{ box-shadow:0 0 0 rgba(255,215,0,0); }
        50%{ box-shadow:0 0 18px rgba(255,215,0,.8); }
        100%{ box-shadow:0 0 0 rgba(255,215,0,0); }
      }
    `;
    document.head.appendChild(css);
  }
})();

// ---------- helpers ----------
function parseId(id=''){
  const [base, qStr] = String(id).split('@');
  const qNum = parseInt(qStr,10);
  const q = Number.isFinite(qNum) ? Math.max(1, Math.min(100, qNum)) : null;
  return { base, q };
}
function metalFromItemId(id=''){
  const base = String(id).split('@')[0];
  let m = base.match(/^bar_(\w+)/)?.[1] || base.match(/^ore_(\w+)/)?.[1];
  if (m) return m;
  m = base.match(/^(axe|pick)_(\w+)/)?.[2];
  if (m) return m;
  m = base.split('_')[0];
  if (['copper','bronze','iron','steel','mith','adamant','rune'].includes(m)) return m;
  return null;
}
function tintClassForItem(id=''){
  const m = metalFromItemId(id);
  return m ? ` tint-${m}` : '';
}
const baseId = id => String(id||'').split('@')[0];
function healAmountForBase(base){
  const def = ITEMS[base] || {};
  return Number.isFinite(def.heal) ? def.heal : 0;
}
function ensureModsSlot(slot){
  state.equipmentMods = state.equipmentMods || {};
  state.equipmentMods[slot] = state.equipmentMods[slot] || {};
  return state.equipmentMods[slot];
}
function toolHasSpeedStat(toolId){
  const def = ITEMS[baseId(toolId)] || {};
  return Number.isFinite(def.speed) || !!def.speed;
}
function roman(n){ return ['','I','II','III','IV','V','VI','VII','VIII','IX','X'][n]||String(n); }

// ---------- draggable inventory (generic) ----------
on(document, 'dragstart', '#inventory .inv-slot', (e, slot)=>{
  const id = slot.getAttribute('data-id') || '';
  if (!id) return;
  slot.setAttribute('draggable','true');
  e.dataTransfer?.setData('application/x-runecut-item', id);
  e.dataTransfer?.setData('text/plain', id);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
});

// ensure inventory slots remain draggable as the inventory re-renders
const invObs = new MutationObserver(()=>{
  const inv = document.getElementById('inventory');
  if (!inv) return;
  inv.querySelectorAll('.inv-slot').forEach(s=> s.setAttribute('draggable','true'));
});
invObs.observe(document.body, { childList:true, subtree:true });

// ---------- equip-slot helpers ----------
function slotEl(slot){ return grid?.querySelector(`.equip-cell[data-slot="${slot}"] .slot`); }
function fallbackIcon(slot){
  const map = {
    head:'🪖', cape:'🧣', amulet:'📿',
    weapon:'🗡️', body:'🧥', shield:'🛡️',
    gloves:'🧤', legs:'👖', boots:'🥾',
    ring:'💍', axe:'🪓', pick:'⛏️', tome:'📖',
    food:'🍖', fishing:'🎣'
  };
  return map[slot] || '⬜';
}
function iconHtmlForId(id){
  const base = String(id).split('@')[0];
  const def = ITEMS[base] || {};
  const isMat = /^bar_|^ore_/.test(base);
  const imgSrc = def.img || (isMat ? 'assets/materials/ore.png' : null);
  const tintCls = tintClassForItem(id) || (def.tint ? ` tint-${def.tint}` : '');
  return imgSrc
    ? `<img src="${imgSrc}" class="icon-img${tintCls}" alt="">`
    : `<span class="icon">${def.icon || '❔'}</span>`;
}

function setSlot(slot, id){
  const el = slotEl(slot); if (!el) return;
  el.classList.remove('empty','has-item','enchanted-pulse');
  el.innerHTML = '';
  el.dataset.itemId = id || '';

  if (!id){
    el.classList.add('empty');
    el.innerHTML = `<span class="icon">${fallbackIcon(slot)}</span><button class="unequip-x" data-unequip="${slot}" title="Unequip">✕</button>`;
    el.querySelector('.qty-badge')?.remove();
    el.querySelector('.enchant-badge')?.remove();
    return;
  }

  el.classList.add('has-item');
  el.innerHTML = `${iconHtmlForId(id)}<button class="unequip-x" data-unequip="${slot}" title="Unequip">✕</button>`;

  // Tome stack badge
  if (slot === 'tome'){
    const n = Math.max(0, state.equipment?.tomeQty|0);
    if (n >= 1){
      const badge = document.createElement('span');
      badge.className = 'qty-badge';
      badge.textContent = `×${n}`;
      el.appendChild(badge);
    }
  }

  // Food stack + eat
  if (slot === 'food'){
    const n = Math.max(0, state.equipment?.foodQty|0);
    if (n >= 1){
      const badge = document.createElement('span');
      badge.className = 'qty-badge';
      badge.textContent = `×${n}`;
      el.appendChild(badge);

      const eat = document.createElement('button');
      eat.className = 'eat-btn btn-primary';
      eat.textContent = 'Eat';
      eat.title = 'Eat one';
      eat.setAttribute('data-eat-food', '1');
      el.appendChild(eat);
    }
  }

  // Enchant badge (e.g. Swiftness I)
  el.querySelector('.enchant-badge')?.remove();
  const mods = state.equipmentMods?.[slot] || {};
  const swift = mods.swift;
  if (swift){
    const span = document.createElement('span');
    span.className = 'enchant-badge';
    span.title = `+${swift.addSpeed ?? 0} speed`;
    span.textContent = `⚡ ${roman(swift.tier ?? 1)}`;
    el.appendChild(span);
  }
}

// ---------- eat on food slot ----------
on(grid, 'click', '.eat-btn[data-eat-food]', ()=>{
  const slots = state.equipment || {};
  const base  = slots.food;
  const qty   = Math.max(0, slots.foodQty|0);
  if (!base || qty <= 0) return;

  const heal = healAmountForBase(base);
  if (heal <= 0) return;

  const max = hpMaxFor(state);
  if ((state.hpCurrent ?? max) >= max) return;

  state.hpCurrent = Math.min(max, (state.hpCurrent ?? max) + heal);
  slots.foodQty = Math.max(0, qty - 1);
  if (slots.foodQty === 0){
    slots.food = '';
  }
  window.dispatchEvent(new Event('hp:change'));
  window.dispatchEvent(new Event('food:change'));
  renderEquipment();
  saveState(state);
});

// ---------- unequip (single handler; no duplicates) ----------
on(grid, 'click', '.unequip-x', (e, btn)=>{
  const slot = btn.getAttribute('data-unequip');
  if (!slot) return;

  // Food returns stack
  if (slot === 'food'){
    const base = state.equipment?.food;
    const qty  = Math.max(0, state.equipment?.foodQty|0);
    if (base && qty > 0){
      state.inventory[base] = (state.inventory[base]||0) + qty;
    }
    if (state.equipment){
      state.equipment.food = '';
      state.equipment.foodQty = 0;
    }
    window.dispatchEvent(new Event('food:change'));
    saveState(state);
    renderInventory();
    renderEquipment();
    return;
  }

  // Normal slots (tome-safe handled in systems/equipment.js)
  const ok = unequipItem(state, slot);
  if (!ok && slot === 'tome') {
    // optional toast that tomes can’t be unequipped while active
  }
  saveState(state);
  renderInventory();
  renderEquipment();
});

// ---------- apply consumable to a slot (generic & tiered) ----------
function applyConsumableEnchantToSlot(consumableId, slot){
  const eff = getConsumableEffect(consumableId);
  const toolId = state.equipment?.[slot];

  if (!eff) return { ok:false, reason:'no-effect' };
  if (!toolId) return { ok:false, reason:'no-tool' };
  if (!eff.slots.includes(slot)) return { ok:false, reason:'bad-slot' };
  if (!toolHasSpeedStat(toolId)) return { ok:false, reason:'not-speed-tool' };

  const invKey = baseId(consumableId);
  if ((state.inventory[invKey]||0) <= 0) return { ok:false, reason:'no-item' };

  const mods = ensureModsSlot(slot);
  const cur = mods[eff.group]; // e.g. 'swift'
  if (cur && cur.tier >= eff.tier) return { ok:false, reason:'already-high' };

  removeItem(state, invKey, 1);
  mods[eff.group] = { tier: eff.tier, addSpeed: eff.addSpeed, from: invKey };
  saveState(state);
  return { ok:true, eff, slot };
}

// ---------- DnD targets on equipment grid ----------
on(document, 'dragover', '.equip-cell', (e, cell)=>{
  e.preventDefault();
  cell.classList.add('drag-target');
});
on(document, 'dragleave', '.equip-cell', (_e, cell)=>{
  cell.classList.remove('drag-target');
});
on(document, 'drop', '.equip-cell', (e, cell)=>{
  e.preventDefault();
  cell.classList.remove('drag-target');

  const slot = cell?.dataset?.slot;
  const dragged =
    e.dataTransfer?.getData('application/x-runecut-item') ||
    e.dataTransfer?.getData('text/plain') || '';
  if (!slot || !dragged) return;

  const res = applyConsumableEnchantToSlot(dragged, slot);
  if (res.ok){
    const slotDiv = cell.querySelector('.slot');
    slotDiv?.classList.add('enchanted-pulse');
    setTimeout(()=> slotDiv?.classList.remove('enchanted-pulse'), 380);
    renderInventory();
    renderEquipment();
  }
});

// ---------- character HUD ----------
function renderCharacter(){
  const elHpText = qs('#charHpText');
  const elAtk    = qs('#charAtk');
  const elStr    = qs('#charStr');
  const elDef    = qs('#charDef');
  const elHpBar  = qs('#charHpBar');
  const elHpLbl  = qs('#charHpLabel');
  const elMaxHit = qs('#charMaxHit');
  const elAcc    = qs('#charAcc');
  const elDefB   = qs('#charDefBonus');

  const maxHp = hpMaxFor(state);
  if (state.hpCurrent == null) state.hpCurrent = maxHp;
  const curHp = Math.max(0, Math.min(maxHp, state.hpCurrent));
  const hpPct = maxHp > 0 ? Math.round(100*curHp/maxHp) : 0;
  if (elHpText) elHpText.textContent = `${curHp}/${maxHp}`;
  if (elHpBar)  elHpBar.style.width = `${hpPct}%`;
  if (elHpLbl)  elHpLbl.textContent = `${curHp}/${maxHp}`;

  ensureMana(state);
  const maxMp = manaMaxFor(state);
  const curMp = Math.max(0, Math.min(maxMp, state.manaCurrent));
  const mpPct = maxMp > 0 ? Math.round(100*curMp/maxMp) : 0;
  if (elMpText) elMpText.textContent = `${curMp}/${maxMp}`;
  if (elMpBar)  elMpBar.style.width  = `${mpPct}%`;
  if (elMpLbl)  elMpLbl.textContent  = `${curMp}/${maxMp}`;

  const monSel = qs('#monsterSelect');
  const mon = monSel ? MONSTERS.find(m=>m.id===monSel.value) : null;

  const ps = derivePlayerStats(state, mon);
  if (elAtk)  elAtk.textContent = ps.atkBonus ?? 0;
  if (elStr)  elStr.textContent = ps.strBonus ?? 0;
  if (elDef)  elDef.textContent = ps.defBonus ?? 0;
  if (elMaxHit) elMaxHit.textContent = ps.maxHit ?? 1;
  if (elAcc)    elAcc.textContent    = mon ? `${Math.round((ps.acc||0)*100)}%` : '—';
  if (elDefB)   elDefB.textContent   = `+${ps.defBonus ?? 0}`;
}

// ---------- tooltips (restored) ----------
on(grid, 'mousemove', '.slot', (e, slotDiv)=>{
  const id = slotDiv.dataset.itemId;
  const slotName = slotDiv.closest('.equip-cell')?.dataset.slot || 'slot';

  // Empty slot -> simple tooltip
  if (!id){
    const title = slotName.charAt(0).toUpperCase() + slotName.slice(1);
    showTip(e, title, 'Empty');
    return;
  }

  const { base, q } = parseId(id);
  const def = ITEMS[base] || {};
  const mult = q ? q/100 : 1;

  const lines = [];
  if (q != null) lines.push(`Quality: ${q}%`);

  // Food: heal + stack size
  if (slotName === 'food'){
    const heal = healAmountForBase(base);
    const qty  = Math.max(0, state.equipment?.foodQty|0);
    if (heal > 0) lines.push(`Heals: ${heal} HP`);
    lines.push(`Stack: ×${qty}`);
    showTip(e, def.name || base, lines.join('\n'));
    return;
  }

  // Normal stat lines
  const stats = [];
  if (def.atk) stats.push(`Atk: ${Math.round(def.atk*mult)}`);
  if (def.str) stats.push(`Str: ${Math.round(def.str*mult)}`);
  if (def.def) stats.push(`Def: ${Math.round(def.def*mult)}`);
  if (def.hp)  stats.push(`HP: ${Math.round(def.hp*mult)}`);
  if (stats.length) lines.push(stats.join(' · '));

  // Speed (include enchant bonus if present)
  if (def.speed){
    const mod = state.equipmentMods?.[slotName]?.swift?.addSpeed || 0;
    const total = Number(def.speed) + Number(mod || 0);
    lines.push(`Speed: ${Number(def.speed).toFixed(2)}×${mod ? `  (+${mod.toFixed(2)} → ${total.toFixed(2)}×)` : ''}`);
  }

  // Tome details (if applicable)
  if (def.slot === 'tome' && def.tome){
    const qty = Math.max(0, state.equipment?.tomeQty|0);
    const baseSec = def.tome.baseSec || def.tome.minSeconds || 15;
    const maxSec  = def.tome.maxSec  || def.tome.maxSeconds || 30;
    const resId   = def.tome.dropId || def.tome.resourceId;
    const resName = ITEMS[resId]?.name || resId || 'Unknown';
    lines.push(`Auto-gathers: ${resName}`);
    lines.push(`Duration per tome: ${baseSec}–${maxSec}s (scales with Enchanting)`);

    // live timing (if you want it)
    try {
      const remMs = tomeRemainingMs(state);
      const perMs = tomeDurationMsFor(state, base);
      const totalMs = remMs + Math.max(0, qty-1)*perMs;
      lines.push(`Equipped stack: ×${Math.max(1, qty)}`);
      if (remMs > 0) lines.push(`Active run remaining: ${Math.ceil(remMs/1000)}s`);
      if (totalMs > 0) lines.push(`Total remaining: ${Math.ceil(totalMs/1000)}s`);
    } catch {}
  }

  showTip(e, def.name || base, lines.join('\n'));
});

on(grid, 'mouseout', '.slot', (e, slotDiv)=>{
  const to = e.relatedTarget;
  if (!to || !slotDiv.contains(to)) hideTip();
});
grid?.addEventListener('mouseleave', hideTip);


// ---------- public render ----------
export function renderEquipment(){
  if (!grid) return;
  const slots = state.equipment || {};
  Object.keys(slots).forEach(slot => {
    if (slot === 'tome' && !slots[slot]) {
      const el = slotEl('tome'); if (el) el.querySelector('.qty-badge')?.remove();
    }
    setSlot(slot, slots[slot]);
  });

  startManaRegen(state, ()=>{
    renderCharacter();
    saveState(state);
  });

  renderCharacter();
  ensureTomeEngine(state);
}

// lightweight repaints
onManaChange(()=> { try { renderCharacter(); } catch {} });
window.addEventListener('hp:change', ()=> { try { renderCharacter(); } catch {} });
on(document, 'change', '#monsterSelect', ()=> renderEquipment());
window.addEventListener('tome:stack', ()=> renderEquipment());
window.addEventListener('tome:end',  ()=> renderEquipment());
