// /ui/combat/consumables_panel.js
import { ITEMS } from '../../data/items.js';
import { state, saveNow } from '../../systems/state.js';
import { usePotion } from '../../systems/consumables.js';
import { castSpell } from '../../systems/destruction.js';
import { renderCharacterEffects } from '../character.js';
import { iconHtmlForItem } from '../sprites.js';
import { renderCombat } from '../combat.js';

const overlay = () => document.querySelector('#combatOverlay');
const els = () => ({
  log: document.querySelector('#combatLog'),
  playerHpBar: document.querySelector('#playerHpBar'),
  monHpBar: document.querySelector('#monHpBar'),
});

const baseIdStrict = s => String(s||'').split('@')[0].split('#')[0];

// --- spell cooldown state (1s) ---
let _spellCooldownUntil = 0;
function isSpellCooldownActive(){ return performance.now() < _spellCooldownUntil; }
function beginSpellCooldown(){
  _spellCooldownUntil = performance.now() + 1000;
  // Update disabled style immediately and after cooldown ends
  applySpellDisabledStyle();
  setTimeout(()=> applySpellDisabledStyle(), 1000);
}
function applySpellDisabledStyle(){
  const tiles = document.querySelectorAll('#combatConsumables .cc-tile.spell');
  tiles.forEach(t => {
    if (isSpellCooldownActive()) t.classList.add('disabled');
    else t.classList.remove('disabled');
  });
}

function ensureCss(){
  if (document.getElementById('combat-consumables-css')) return;
  const css = document.createElement('style');
  css.id = 'combat-consumables-css';
  css.textContent = `
    #combatConsumables{ margin:8px 0 10px; padding:8px; border-radius:10px; background:rgba(16,22,34,.6); border:1px solid rgba(255,255,255,.08);}
    #combatConsumables .cc-head{ font-weight:800; font-size:12px; letter-spacing:.02em; opacity:.9; margin-bottom:6px; }
    #combatConsumables .cc-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(44px,1fr)); gap:6px; }
    #combatConsumables .cc-tile{ position:relative; height:44px; border-radius:8px; background:rgba(255,255,255,.04);
      display:flex; align-items:center; justify-content:center; cursor:pointer; user-select:none; border:1px solid rgba(255,255,255,.08); }
    #combatConsumables .cc-tile:hover{ filter:brightness(1.12); }
    #combatConsumables .cc-tile .qty{ position:absolute; right:4px; bottom:3px; font-size:11px; background:rgba(0,0,0,.55); padding:0 5px; border-radius:6px; line-height:16px; }
    #combatConsumables .cc-tile .icon-img, #combatConsumables .cc-tile .icon-sprite{ width:28px; height:28px; image-rendering:auto; border-radius:4px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }
    #combatConsumables .cc-tile.potion{ outline:1px solid rgba(56,189,248,.15); }
    #combatConsumables .cc-tile.spell{ outline:1px solid rgba(167,139,250,.15); }
    #combatConsumables .cc-empty{ font-size:12px; color:#9aa6bf; padding:4px 0; text-align:center; }
    .flash-dmg{ animation: flashDmg 300ms ease-out; }
    .flash-heal{ animation: flashHeal 300ms ease-out; }
    @keyframes flashDmg{ 0%{filter:brightness(1)} 50%{filter:brightness(1.35)} 100%{filter:brightness(1)} }
    @keyframes flashHeal{ 0%{filter:brightness(1)} 50%{filter:brightness(1.25)} 100%{filter:brightness(1)} }

    .spell-pop{
      position:absolute; left:50%; transform:translateX(-50%);
      animation: spellFloat .9s ease-out forwards;
      font-weight:800; pointer-events:none;
      text-shadow:0 1px 2px rgba(0,0,0,.4);
      top:6px; opacity:0;
    }
    .spell-pop.fire   { color:#f87171; }
    .spell-pop.forest { color:#34d399; }
    .spell-pop.water  { color:#60a5fa; }
    @keyframes spellFloat{ 0%{opacity:0; top:6px} 10%{opacity:1} 100%{opacity:0; top:-22px} }

    /* cooldown UI */
    #combatConsumables .cc-tile.disabled{ pointer-events:none; opacity:.55; }
  `;
  document.head.appendChild(css);
}

function ensureHost(){
  const root = overlay(); if (!root) return null;
  let host = document.getElementById('combatConsumables');
  if (host) return host;
  const anchor = root.querySelector('#combatLog')?.parentElement || root.querySelector('#combatLog') || root;
  host = document.createElement('div');
  host.id = 'combatConsumables';
  host.className = 'combat-consumables';
  host.innerHTML = `
    <div class="cc-head">Spells &amp; Potions</div>
    <div class="cc-grid" id="combatConsumablesGrid"></div>
  `;
  anchor.parentElement?.insertBefore(host, anchor);
  ensureCss();
  return host;
}

function shouldShow(def, base){
  if (def?.type === 'potion' || def?.type === 'spell') return true;
  const name = (def?.name || base || '').toLowerCase();
  return name.includes('potion');
}

function iconFor(base){
  const def = ITEMS[base] || {};
  return iconHtmlForItem(base, {
    px: 28,
    glow: !!def.glow,
    tintClass: def.tint ? `tint-${def.tint}` : '',
    fallback: def.img || null,
    alt: def.name || base
  });
}

function rows(){
  const bag = state.inventory || {};
  const out = [];
  for (const [id, qty] of Object.entries(bag)){
    if ((qty|0) <= 0) continue;
    const base = baseIdStrict(id);
    const def  = ITEMS[base] || {};
    if (shouldShow(def, base)) out.push([id, qty, def]);
  }
  return out;
}

export function renderCombatConsumablesPanel(){
  const host = ensureHost(); if (!host) return;
  const grid = host.querySelector('#combatConsumablesGrid'); if (!grid) return;

  const list = rows();
  if (!list.length){
    grid.innerHTML = `<div class="cc-empty" style="grid-column:1/-1;">None in bag</div>`;
  } else {
    grid.innerHTML = list.map(([id, qty, def])=>{
      const base = baseIdStrict(id);
      const cls  = (def.type === 'spell') ? 'spell' : 'potion';
      return `<div class="cc-tile ${cls}" data-id="${id}" title="${def.name||base}">
        ${iconFor(base)}<div class="qty">${qty}</div>
      </div>`;
    }).join('');
  }

  // apply current cooldown state to tiles after (re)render
  applySpellDisabledStyle();
}

function bubbleSpellDamage(barEl, amount, element='fire'){
  if (!barEl) return;
  let host = barEl.closest('.progress')?.parentElement || barEl.parentElement || barEl;
  const cs = host ? getComputedStyle(host) : null;
  if (host && cs && cs.position === 'static') host.style.position = 'relative';
  const d = document.createElement('div');
  d.className = `spell-pop ${element}`;
  d.textContent = `-${amount}`;
  host.appendChild(d);
  d.addEventListener('animationend', ()=>d.remove(), { once:true });
}

document.addEventListener('click', (e)=>{
  const tile = e.target.closest?.('#combatConsumables .cc-tile');
  if (!tile) return;

  // Global cooldown gate
  if (tile.classList.contains('spell') && isSpellCooldownActive()) return;
  if (tile.classList.contains('disabled')) return;

  const id   = tile.getAttribute('data-id');
  const base = baseIdStrict(id);
  const def  = ITEMS[base] || {};
  const have = (state.inventory?.[id] || 0)|0;
  if (have <= 0) return;

  const ui = els();

  if (def.type === 'spell'){
    if (!state.combat){
      ui.log?.appendChild(Object.assign(document.createElement('div'), { textContent:`You can’t cast spells outside of combat.` }));
      return;
    }
    const res = castSpell(state, id, {
      consume:true,
      onDamage:(dmg, element)=>{
        ui.monHpBar?.classList.add('flash-dmg');
        bubbleSpellDamage(ui.monHpBar, dmg, element || 'fire');
        setTimeout(()=>ui.monHpBar?.classList.remove('flash-dmg'), 300);
      },
      onLog:(t)=> ui.log?.appendChild(Object.assign(document.createElement('div'), { textContent:t })),
    });
    if (!res.ok) return;

    // start 1s cooldown after a successful cast
    beginSpellCooldown();
    renderCombat();

  } else {
    const res = usePotion(state, id, {
      onHeal:(_h)=>{
        ui.playerHpBar?.classList.add('flash-heal');
        setTimeout(()=>ui.playerHpBar?.classList.remove('flash-heal'), 300);
      },
      onLog:(t)=> ui.log?.appendChild(Object.assign(document.createElement('div'), { textContent:t })),
    });
    if (!res.ok) return;

    try { renderCharacterEffects(); } catch {}
    try { window.dispatchEvent(new Event('effects:tick')); } catch {}
  }

  saveNow();
  renderCombatConsumablesPanel();
  try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
  try { window.dispatchEvent(new Event('mana:change')); } catch {}
});
