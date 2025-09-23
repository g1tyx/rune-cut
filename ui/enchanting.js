// /ui/enchanting.js
import { state, saveState } from '../systems/state.js';
import { ITEMS } from '../data/items.js';
import { ENCHANT_RECIPES } from '../data/enchanting.js';
import { canEnchant, startEnchant, finishEnchant } from '../systems/enchanting.js';
import { ensureMana, manaMaxFor } from '../systems/mana.js';
import { qs, on } from '../utils/dom.js';
import { renderInventory, findInvIconEl } from './inventory.js';
import { renderEquipment } from './equipment.js';
import { renderSkills } from './skills.js';
import { pushLog, renderPanelLogs } from './logs.js';

// ---------- DOM roots ----------
const el = {
  list:   qs('#enchantList'),
  label:  qs('#enchantLabel'),
  mana:   qs('#enchantMana'),
};

// ---------- helpers ----------
function pretty(id){
  const baseId = String(id||'').split('@')[0];
  const item = ITEMS[baseId];

  if (item?.name) return item.name;

  // Format tome IDs like: tome_<element>_<tier>
  // Support novice/apprentice/adept/master
  const m = baseId.match(/^tome_(forest|sea|rock)_(novice|apprentice|adept|master)$/i);
  if (m){
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    return `${cap(m[2])} ${cap(m[1])} Tome`;
  }

  return baseId.replace(/_/g, ' ');
}

function manaText(){
  ensureMana(state);
  const cur = Math.max(0, state.manaCurrent|0);
  const max = manaMaxFor(state);
  return `Mana: ${cur}/${max}`;
}
function recipesList(){
  if (Array.isArray(ENCHANT_RECIPES)) return ENCHANT_RECIPES.slice();
  if (ENCHANT_RECIPES && typeof ENCHANT_RECIPES === 'object'){
    return Object.entries(ENCHANT_RECIPES).map(([id, r]) => ({ id, ...r }));
  }
  return [];
}
function getRec(id){
  if (!id) return null;
  if (Array.isArray(ENCHANT_RECIPES)) return ENCHANT_RECIPES.find(r => (r.id || r.outId) === id) || null;
  if (ENCHANT_RECIPES && typeof ENCHANT_RECIPES === 'object'){
    const r = ENCHANT_RECIPES[id]; return r ? { id, ...r } : null;
  }
  return null;
}
function ioText(r){
  const parts = [];
  const inputs = Array.isArray(r.inputs)
    ? r.inputs.map(x=>({id:x.id, qty:x.qty}))
    : (r.cost && typeof r.cost==='object'
        ? Object.entries(r.cost).map(([id,qty])=>({id, qty}))
        : []);
  inputs.forEach(inp => parts.push(`${inp.qty}× ${pretty(inp.id)}`));
  if (r.mana) parts.push(`${r.mana}× Mana`);
  return parts.join(' · ');
}
function iconHtml(id){
  const base = String(id).split('@')[0];
  const def  = ITEMS[base] || {};
  const src  = def.img || null;
  const tint = def.tint ? ` tint-${def.tint}` : '';
  return src
    ? `<img src="${src}" class="icon-img${tint}" alt="${def.name||base}">`
    : `<span class="icon">${def.icon || '✨'}</span>`;
}
function outputIdOf(r){
  // Prefer explicit outputs[0].id; fall back to outId; then r.id
  if (Array.isArray(r.outputs) && r.outputs[0]?.id) return r.outputs[0].id;
  if (r.outId) return r.outId;
  return r.id || null;
}

// ---------- animation utilities ----------
function _scrollX(){ return window.pageXOffset ?? window.scrollX ?? 0; }
function _scrollY(){ return window.pageYOffset ?? window.scrollY ?? 0; }

function rectOf(el){
  const r = el.getBoundingClientRect();
  return { x: r.left + _scrollX(), y: r.top + _scrollY(), w: r.width, h: r.height };
}

function cloneNodeForAnim(srcEl){
  const isImg = srcEl && srcEl.tagName === 'IMG';
  const clone = document.createElement(isImg ? 'img' : 'span');
  if (isImg) clone.src = srcEl.src;
  clone.className = 'fly-img';
  clone.textContent = isImg ? '' : (srcEl?.textContent || '✨');

  const r = rectOf(srcEl);
  Object.assign(clone.style, {
    position: 'absolute',
    left: `${r.x}px`,
    top: `${r.y}px`,
    width: `${Math.max(1, r.w)}px`,
    height: `${Math.max(1, r.h)}px`,
    pointerEvents: 'none',
    willChange: 'transform, opacity',
    transition: 'transform 550ms ease, opacity 200ms ease',
    transform: 'translate(0px, 0px) scale(1)', // explicit starting state
    transformOrigin: 'center center',
    zIndex: 9999
  });

  document.body.appendChild(clone);
  // Force reflow so Firefox recognizes the starting transform
  // eslint-disable-next-line no-unused-expressions
  clone.offsetWidth;
  return { clone, r };
}

function flyFromTo(srcEl, dstEl, { scale = 1.35, shrinkAtEnd = true, travelMs = 550 } = {}){
  if (!srcEl || !dstEl) return Promise.resolve();
  const { clone, r: sr } = cloneNodeForAnim(srcEl);
  const dr = rectOf(dstEl);
  const dx = (dr.x + dr.w / 2) - (sr.x + sr.w / 2);
  const dy = (dr.y + dr.h / 2) - (sr.y + sr.h / 2);

  return new Promise(resolve => {
    let finished = false;
    let timeoutId;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      if (shrinkAtEnd) {
        clone.style.transition = 'transform 180ms ease, opacity 180ms ease';
        clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
        clone.style.opacity = '0';
        setTimeout(() => { clone.remove(); resolve(); }, 190);
      } else {
        clone.remove(); resolve();
      }
    };

    const onEnd = (ev) => {
      if (ev && ev.propertyName && ev.propertyName !== 'transform') return;
      clone.removeEventListener('transitionend', onEnd);
      clone.removeEventListener('transitioncancel', onEnd);
      finish();
    };

    clone.addEventListener('transitionend', onEnd);
    clone.addEventListener('transitioncancel', onEnd);

    // Fallback in case transitionend never fires (FF edge cases / zero distance)
    timeoutId = setTimeout(() => onEnd({ propertyName: 'transform' }), travelMs + 1000);

    // Apply the transform in the next frame to ensure the transition starts
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    });
  });
}

// --- center-combine animation (inputs → screen center → glow) ---
function viewportCenterRect(size=40){
  const x = window.scrollX + window.innerWidth/2;
  const y = window.scrollY + window.innerHeight/2;
  return { x: x - size/2, y: y - size/2, w: size, h: size };
}

function flyInputsToCenterMerge(srcEls = [], { travelMs = 700, mergeMs = 550, scale = 1.45 } = {}){
  if (!srcEls.length) return Promise.resolve({ clones: [], centerRect: viewportCenterRect(18) });

  const clones = srcEls.map(el => {
    const { clone, r } = cloneNodeForAnim(el);
    clone.style.transition = `transform ${travelMs}ms ease`;
    // eslint-disable-next-line no-unused-expressions
    clone.offsetWidth; // ensure start state
    return { clone, from: r };
  });

  const center = viewportCenterRect(40);
  const targets = clones.map((c, i) => {
    const sr = c.from;
    const offset = i % 2 === 0 ? -48 : 48;
    const tx = (center.x + center.w / 2 + offset) - (sr.x + sr.w / 2);
    const ty = (center.y + center.h / 2) - (sr.y + sr.h / 2);
    return { tx, ty };
  });

  return new Promise(resolve => {
    let arrived = 0;
    let timeoutId;

    const finishTravel = () => {
      const center2 = viewportCenterRect(18);
      clones.forEach(c => {
        const sr = c.from;
        const dx = (center2.x + center2.w / 2) - (sr.x + sr.w / 2);
        const dy = (center2.y + center2.h / 2) - (sr.y + sr.h / 2);
        c.clone.style.transition = `transform ${mergeMs}ms ease-out`;
        // eslint-disable-next-line no-unused-expressions
        c.clone.offsetWidth;
        c.clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scale * 1.1})`;
      });

      setTimeout(() => {
        const GLOW_SIZE = 120;
        const cx = center2.x + center2.w / 2 - GLOW_SIZE / 2;
        const cy = center2.y + center2.w / 2 - GLOW_SIZE / 2;

        const glow = document.createElement('div');
        Object.assign(glow.style, {
          position: 'absolute',
          left: `${cx}px`,
          top: `${cy}px`,
          width: `${GLOW_SIZE}px`,
          height: `${GLOW_SIZE}px`,
          borderRadius: '50%',
          boxShadow: [
            '0 0 40px 25px rgba(116,255,148,0.80)',
            '0 0 80px 35px rgba(116,255,148,0.40)'
          ].join(', '),
          opacity: '0',
          zIndex: 9998,
          pointerEvents: 'none',
          transition: 'opacity 320ms ease'
        });
        document.body.appendChild(glow);
        requestAnimationFrame(() => { glow.style.opacity = '1'; });
        setTimeout(() => {
          glow.style.opacity = '0';
          setTimeout(() => glow.remove(), 260);
        }, 280);

        resolve({ clones, centerRect: center2 });
      }, mergeMs + 10);
    };

    const onArriveOne = (ev) => {
      if (ev && ev.propertyName && ev.propertyName !== 'transform') return;
      arrived++;
      if (arrived >= clones.length) {
        clearTimeout(timeoutId);
        finishTravel();
      }
    };

    // Fallback if some 'transitionend' don't fire
    timeoutId = setTimeout(() => {
      arrived = clones.length;
      finishTravel();
    }, travelMs + 1000);

    requestAnimationFrame(() => {
      clones.forEach(({ clone }, i) => {
        const { tx, ty } = targets[i];
        clone.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        clone.addEventListener('transitionend', onArriveOne, { once: true });
        clone.addEventListener('transitioncancel', onArriveOne, { once: true });
      });
    });
  });
}


function spawnOutputAtCenterAndFly(outImgSrc, centerRect, dstEl, { travelMs = 700 } = {}){
  if (!outImgSrc || !dstEl) return Promise.resolve();
  const ghost = document.createElement('img');
  ghost.src = outImgSrc;
  ghost.className = 'fly-img';
  Object.assign(ghost.style, {
    position: 'absolute',
    left: `${centerRect.x}px`,
    top: `${centerRect.y}px`,
    width: `${Math.max(26, centerRect.w)}px`,
    height: `${Math.max(26, centerRect.h)}px`,
    transform: 'scale(1.0)', // explicit start
    willChange: 'transform, opacity',
    transition: `transform ${travelMs}ms ease, opacity 200ms ease`,
    zIndex: 9999,
    pointerEvents: 'none'
  });
  document.body.appendChild(ghost);
  // Ensure layout before flying
  // eslint-disable-next-line no-unused-expressions
  ghost.offsetWidth;

  return flyFromTo(ghost, dstEl, { scale: 1.2 }).then(() => ghost.remove());
}

// ---------- list CSS (once) ----------
(function ensureEnchantCSS(){
  if (document.getElementById('enchantCSS')) return;
  const css = document.createElement('style');
  css.id = 'enchantCSS';
  css.textContent = `
    #enchantList .enchant-row{ display:flex; align-items:center; gap:.65rem; }
    #enchantList .enchant-row .thumb{ width:32px; height:32px; flex:0 0 32px; display:grid; place-items:center; }
    #enchantList .enchant-row .thumb img.icon-img{ width:28px; height:28px; image-rendering:pixelated; }
    #enchantList .enchant-row .left{ flex:1 1 auto; min-width:0; }
    #enchantList .enchant-row .title{ font-weight:600; }
    #enchantList .enchant-row .io{ color:#fff; font-size:.92em; }
    #enchantList .enchant-row .right{ margin-left:.5rem; display:flex; gap:.35rem; }
    #enchantList .enchant-row .badge{ background:#2234; border:1px solid #fff2; padding:.1rem .4rem; border-radius:.4rem; font-size:.85em; }
    #enchantList .craft-item.disabled{ opacity:.6; }
  `;
  document.head.appendChild(css);
})();

// ---------- render ----------
function recipeRows(){
  return recipesList()
    .slice()
    .sort((a,b)=>(a.level||1)-(b.level||1) || String(a.name||a.id||a.outId).localeCompare(String(b.name||b.id||b.outId)));
}

export function renderEnchanting(){
  if (el.label) el.label.textContent = (state.action?.type==='enchant') ? (state.action.label||'Enchanting…') : 'Idle';
  if (el.mana)  el.mana.textContent  = manaText();
  if (!el.list) return;

  const busyId = state.action?.type==='enchant' ? state.action.key : null;
  const otherBusy = state.action && state.action.type !== 'enchant';

  el.list.innerHTML = recipeRows().map(r=>{
    const rid  = r.id || r.outId;
    const ok   = canEnchant(state, rid);
    const dis  = otherBusy || (busyId && busyId!==rid) || !ok;
    const lvl  = r.level || 1;
    const xp   = r?.xp?.amount || 0;

    // icons for inputs (hidden offscreen, used for animation fallback)
    const inputsIcons = (r.inputs||[]).map(i => iconHtml(i.id)).join('');

    // Output icon for the row
    const outId = outputIdOf(r);
    const outIcon = outId ? iconHtml(outId) : '<span class="icon">✨</span>';

    return `
      <button class="craft-item enchant-row ${dis ? 'disabled':''} ${busyId===rid?'active':''}"
              data-id="${rid}" ${dis?'disabled':''}>
        <div class="thumb" aria-hidden="true">${outIcon}</div>
        <div class="left">
          <div class="title">${r.name || pretty(rid)}</div>
          <div class="io">${ioText(r) || '&nbsp;'}</div>
          <span class="combine-spot" aria-hidden="true"
            style="position:absolute;left:-9999px;top:-9999px;width:24px;height:24px;opacity:0"></span>
          <span class="io-icons" aria-hidden="true"
            style="position:absolute;left:-9999px;top:-9999px;opacity:0">${inputsIcons}</span>
        </div>
        <div class="right">
          <span class="badge level">Lv ${lvl}</span>
          ${xp ? `<span class="badge xp">+${xp}xp</span>` : ''}
        </div>
      </button>
    `;
  }).join('');
}

// ---------- interactions ----------
on(document, 'click', '#enchantList .craft-item', async (e, row)=>{
  if (!row || row.classList.contains('disabled')) return;
  const rid = row.dataset.id; if (!rid) return;
  //if (state.action && state.action.type !== 'enchant') return;
  if (!canEnchant(state, rid)) return;

  // Disable all rows during the ritual
  el.list.querySelectorAll('.craft-item').forEach(b=> b.disabled = true);

  const rec = getRec(rid) || {};
  // Prefer real inventory icons; fall back to hidden icons in the row
  const srcIcons = (rec.inputs||[])
    .map(inp => findInvIconEl(inp.id) || row.querySelector('.io-icons img.icon-img, .io-icons .icon'))
    .filter(Boolean);

  // 1) Inputs → center, merge and glow
  const { clones, centerRect } = await flyInputsToCenterMerge(srcIcons, { travelMs:700, mergeMs:550, scale:1.6 });

  // 2) Start enchant; finish will grant output
  const started = startEnchant(state, rid, async ()=>{
    const res = finishEnchant(state, rid);
    renderInventory(); // ensure inventory tile exists

    // If effect was applied to equipped tool, log that; else fall back to old message
    if (res?.appliedTo){
      const baseOld = String(res.appliedTo.oldId).split('@')[0].split('#')[0];
      const toolName = pretty(baseOld);
      const r = getRec(rid) || {};
      pushLog(`Enchanted ${toolName} with ${r.name || pretty(rid)} (+0.25 speed)`, 'enchanting');
    } else {
      const out = Array.isArray(res?.outputs) ? res.outputs[0] : null;
      const outId = out?.id;
      const r = getRec(rid) || {};
      pushLog(`Enchanted ${pretty(outId || rid)} → +${r?.xp?.amount||0} Enchanting xp`, 'enchanting');
    }
    if (rec?.mana) pushLog(`Mana spent: ${rec.mana}`, 'enchanting');
    (rec.inputs||[]).forEach(inp=> pushLog(`Consumed ${inp.qty}× ${pretty(inp.id)}`, 'enchanting'));
    renderPanelLogs();
    // Animate the new tome (first output) from center → inventory
    const out = Array.isArray(res?.outputs) ? res.outputs[0] : (rec.outputs?.[0] || null);
    const outId = out?.id;
    const dst = outId ? findInvIconEl(outId) : null;
    const outSrc = outId ? (ITEMS[String(outId).split('@')[0]]?.img || null) : null;
    if (dst && outSrc){
      await spawnOutputAtCenterAndFly(outSrc, centerRect || viewportCenterRect(18), dst, { travelMs:700 });
    }

    // Clean up the input clones if any remain
    (clones||[]).forEach(c=>{
      try { c.clone.style.transition='opacity 180ms ease'; c.clone.style.opacity='0'; setTimeout(()=>c.clone.remove(), 180); } catch{}
    });

    // Logs (duplicate-safe)
    pushLog(`Enchanted ${pretty(outId || rid)} → +${rec?.xp?.amount||0} Enchanting xp`, 'enchanting');
    if (rec?.mana) pushLog(`Mana spent: ${rec.mana}`, 'enchanting');
    (rec.inputs||[]).forEach(inp=> pushLog(`Consumed ${inp.qty}× ${pretty(inp.id)}`, 'enchanting'));
    renderPanelLogs();

    // UI updates
    if (el.mana) el.mana.textContent = manaText();
    renderEquipment();
    renderSkills();
    renderEnchanting();
    saveState(state);
  });

  if (!started){
    // Re-enable rows if resources changed and we couldn't start
    el.list.querySelectorAll('.craft-item').forEach(b=> b.disabled = false);
    return;
  }

  if (el.label) el.label.textContent = 'Enchanting…';
});

// Refresh on return to tab
document.addEventListener('visibilitychange', ()=> {
  if (!document.hidden) {
    if (el.mana) el.mana.textContent = manaText();
    renderEnchanting();
  }
});

// Public init
export function renderEnchantingInit(){
  renderEnchanting();
}