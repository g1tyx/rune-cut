// /ui/crafting.js
import { state, saveState } from '../systems/state.js';
import { CRAFT_RECIPES } from '../data/crafting.js';
import { canCraft, startCraft, finishCraft } from '../systems/crafting.js';
import { renderSmithing } from './smithing.js';
import { qs, on } from '../utils/dom.js';
import { pushCraftLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderSkills } from './skills.js';
import { ITEMS } from '../data/items.js';
import { renderEnchanting } from './enchanting.js';

const el = {
  craftList:  qs('#craftList'),
  craftLabel: qs('#craftLabel'),
  craftBar:   qs('#craftBar'),
};

const PAGES_PREFIX = 'pages_from_';

/* ---------------- helpers ---------------- */
function prettyItemName(id){
  const base = String(id||'').split('@')[0];
  return ITEMS?.[base]?.name || base.replace(/_/g, ' ');
}
function reqStrFromInputs(inputs){
  return (inputs || [])
    .map(inp => `${inp.qty}× ${prettyItemName(inp.id)}`)
    .join(', ');
}
function asList(obj){ return Object.entries(obj||{}).map(([id, r]) => ({ id, ...r })); }

function inputsOf(rec){ return Array.isArray(rec?.inputs) ? rec.inputs : []; }
function outputsOf(rec){ return Array.isArray(rec?.outputs) ? rec.outputs : []; }

function firstOutId(rec){
  const out = outputsOf(rec)[0];
  return out ? String(out.id).split('@')[0] : null;
}
function iconHtmlFromOutput(rec, {tint=null} = {}){
  const outBase = firstOutId(rec);
  const def = outBase ? ITEMS[outBase] : null;
  const src = def?.img || null;
  const tintCls = (tint || def?.tint) ? ` tint-${tint || def?.tint}` : '';
  return src
    ? `<img class="icon-img ${tintCls}" src="${src}" alt="${def?.name || outBase}">`
    : `<span class="icon" style="font-size:24px">🧰</span>`;
}

function isBusyCraft(){ return !!(state.action && state.action.type === 'craft'); }
function activeCraftId(){ return isBusyCraft() ? state.action.key : null; }
function craftProgressPct(){
  if (!isBusyCraft()) return 0;
  const now = performance.now();
  const { startedAt=now, duration=1 } = state.action;
  const p = (now - startedAt) / Math.max(1, duration);
  return Math.max(0, Math.min(1, p));
}

/* ---------- Pages helpers ---------- */
const PAGES_VARIANTS = () => asList(CRAFT_RECIPES).filter(r => r.id.startsWith(PAGES_PREFIX));
function logIdOf(rec){ return inputsOf(rec)[0]?.id || null; }
function pagesYieldOf(rec){ return outputsOf(rec)[0]?.qty || 0; }

function defaultPagesVariant(){
  const vars = PAGES_VARIANTS();
  if (!vars.length) return null;

  const saved = state.ui?.pagesVariantId && vars.find(v => v.id === state.ui.pagesVariantId);
  if (saved) return saved;

  const owned = vars
    .filter(v => (state.inventory[logIdOf(v)] || 0) > 0)
    .sort((a,b) => pagesYieldOf(b) - pagesYieldOf(a));
  if (owned[0]) return owned[0];

  const oak = vars.find(v => logIdOf(v) === 'log_oak');
  return oak || vars[0];
}

function pagesIoText(rec){
  const inp = inputsOf(rec)[0];
  const out = outputsOf(rec)[0];
  if (!inp || !out) return '';
  return `${inp.qty}× ${prettyItemName(inp.id)} → ${out.qty}× ${prettyItemName(out.id)}`;
}

/* ---------------- render ---------------- */
export function renderCrafting(){
  const busy = isBusyCraft();
  const activeId = activeCraftId();

  // Label
  if (el.craftLabel){
    if (!busy) el.craftLabel.textContent = 'Idle';
    else       el.craftLabel.textContent = state.action.label || 'Crafting…';
  }

  // Hide the global progress row while crafting; show it when idle
  const globalProg = el.craftBar?.closest('.progress') || null;
  if (globalProg) globalProg.style.display = busy ? 'none' : '';

  // Keep legacy global progress accurate when shown (idle/other renders)
  if (el.craftBar && !busy) el.craftBar.style.width = '0%';

  if (!el.craftList) return;

  // Build list excluding pages_from_*; we’ll insert a Pages card at the top
  const list = asList(CRAFT_RECIPES)
    .filter(r => !r.id.startsWith(PAGES_PREFIX))
    .sort((a,b) => (a.level||1)-(b.level||1) || String(a.name||a.id).localeCompare(String(b.name||b.id)));

  const nowPct = craftProgressPct();

  el.craftList.innerHTML = list.map(r => {
    const ok       = canCraft(state, r.id);
    const dis      = busy || !ok;
    const isActive = r.id === activeId;
    const lvl      = r.level || 1;
    const xpAmt    = r?.xp?.amount || 0;

    const icon = iconHtmlFromOutput(r);
    const io   = reqStrFromInputs(r.inputs);

    return `
      <button class="craft-card ${dis ? 'disabled' : ''} ${isActive ? 'active' : ''}"
              data-id="${r.id}" ${dis?'disabled':''}
              title="${dis && !isActive ? 'Missing materials/level or busy' : ''}">
        <div class="craft-head">
          ${icon}
          <div class="craft-titles">
            <div class="craft-name">${r.name || prettyItemName(firstOutId(r) || r.id)}</div>
            <div class="craft-sub muted">${io || '&nbsp;'}</div>
          </div>
          <div class="craft-badges">
            <span class="badge level">Lv ${lvl}</span>
            ${xpAmt ? `<span class="badge xp">+${xpAmt}xp</span>` : ''}
          </div>
        </div>
        ${isActive ? `
          <div class="craft-progress" aria-hidden="true">
            <div class="bar" style="width:${Math.round(nowPct*100)}%"></div>
          </div>` : ``}
      </button>
    `;
  }).join('');

  // Inject compact Pages card at the top (same layout)
  renderPagesCard(el.craftList);

  // If crafting, keep the in-card bar ticking
  if (busy) startInlineProgressLoop();
}

/* ------------- Pages card ------------- */
function renderPagesCard(containerEl){
  const vars = PAGES_VARIANTS();
  if (!vars.length) return;

  const busy = isBusyCraft();
  const activeId = activeCraftId();
  const activeVar = activeId && activeId.startsWith(PAGES_PREFIX)
    ? vars.find(v => v.id === activeId)
    : null;

  const baseVar = activeVar || defaultPagesVariant() || vars[0];
  const lvl = baseVar.level || 1;
  const xpAmt = baseVar?.xp?.amount || 0;

  const optionsHtml = vars
    .slice()
    .sort((a,b) => pagesYieldOf(a) - pagesYieldOf(b))
    .map(v=>{
      const logId = logIdOf(v);
      const have  = state.inventory[logId] || 0;
      const dis   = have <= 0 ? 'disabled' : '';
      const sel   = v.id === baseVar.id ? 'selected' : '';
      return `<option value="${v.id}" ${sel} ${dis}>
        ${prettyItemName(logId)} ${have>0?`(×${have})`:''} — yields ${pagesYieldOf(v)}
      </option>`;
    }).join('');

  const outIcon = iconHtmlFromOutput(baseVar);
  const isActive = !!activeVar;
  const nowPct = craftProgressPct();

  containerEl.insertAdjacentHTML('afterbegin', `
    <div class="craft-card ${busy && !isActive ? 'disabled':''} ${isActive ? 'active':''}">
      <div class="craft-head">
        ${outIcon}
        <div class="craft-titles">
          <div class="craft-name">Pages</div>
          <div class="craft-sub muted" id="pagesIo">${pagesIoText(baseVar)}</div>
        </div>
        <div class="craft-badges">
          <span class="badge level">Lv ${lvl}</span>
          ${xpAmt ? `<span class="badge xp">+${xpAmt}xp</span>` : ''}
        </div>
      </div>
      ${isActive ? `
      <div class="craft-progress" aria-hidden="true">
        <div class="bar" style="width:${Math.round(nowPct*100)}%"></div>
      </div>` : ``}
      <div class="craft-body">
        <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;">
          <label class="muted" for="pagesLogSelect">Logs</label>
          <select id="pagesLogSelect">${optionsHtml}</select>
          <button class="btn-primary" id="pagesCraftBtn">Craft</button>
        </div>
      </div>
    </div>
  `);

  const btn = containerEl.querySelector('#pagesCraftBtn');
  if (btn) btn.disabled = busy || !canCraft(state, baseVar.id);
}

/* ---------------- interactions ---------------- */

// Click a normal craft card → craft 1
on(document, 'click', '#craftList .craft-card', (e, btn) => {
  if (btn.querySelector('#pagesCraftBtn')) return; // Pages card uses its own button
  //if (state.action) return;
  const id = btn.dataset.id; if (!id) return;
  if (!canCraft(state, id)) return;

  const r = CRAFT_RECIPES[id] || {};
  const xpAmt = r?.xp?.amount || 0;
  const xpSkill = r?.xp?.skill || 'craft';

  const ok = startCraft(state, id, () => {
    const res = finishCraft(state, id);
    if (res){
      const name = res.name || res.id || id;
      pushCraftLog(`Crafted ${name} → +${xpAmt} ${xpSkill} xp`);
      renderInventory(); renderSmithing(); renderEnchanting(); renderSkills();
    }
    saveState(state);
    renderCrafting();
  });

  if (ok){
    if (el.craftLabel) el.craftLabel.textContent = (CRAFT_RECIPES[id]?.name || id);
    renderCrafting();
  }
});

// Pages selector changed
on(document, 'change', '#pagesLogSelect', (e, sel)=>{
  const card = sel.closest('.craft-card');
  if (!card) return;
  const rid = sel.value;

  state.ui = state.ui || {};
  state.ui.pagesVariantId = rid;
  saveState(state);

  const rec = CRAFT_RECIPES[rid];
  const ioEl  = card.querySelector('#pagesIo');
  if (rec && ioEl) ioEl.textContent = pagesIoText(rec);

  const lvl = rec?.level || 1;
  const xp  = rec?.xp?.amount || 0;
  const lvlEl = card.querySelector('.badge.level');
  const xpEl  = card.querySelector('.badge.xp');
  if (lvlEl) lvlEl.textContent = `Lv ${lvl}`;
  if (xpEl)  xpEl.textContent  = xp ? `+${xp}xp` : '';

  const btn = card.querySelector('#pagesCraftBtn');
  if (btn) btn.disabled = isBusyCraft() || !canCraft(state, rid);
});

// Pages craft button
on(document, 'click', '#pagesCraftBtn', (e, btn)=>{
  //if (state.action) return;
  const card = btn.closest('.craft-card');
  const sel  = card?.querySelector('#pagesLogSelect');
  const rid  = sel?.value;
  if (!rid || !canCraft(state, rid)) return;

  const r = CRAFT_RECIPES[rid] || {};
  const xpAmt   = r?.xp?.amount || 0;
  const xpSkill = r?.xp?.skill || 'craft';

  const ok = startCraft(state, rid, ()=>{
    const res = finishCraft(state, rid);
    if (res){
      const name = res.name || 'Pages';
      pushCraftLog(`Crafted ${name} → +${xpAmt} ${xpSkill} xp`);
      renderInventory(); renderSmithing(); renderEnchanting(); renderSkills();
    }
    saveState(state);
    renderCrafting();
  });

  if (ok){
    if (el.craftLabel) el.craftLabel.textContent = (r?.name || 'Pages');
    renderCrafting();
    renderEnchanting();
  }
});

/* -------- in-card progress loop while crafting -------- */
let RAF = null;
function startInlineProgressLoop(){
  stopInlineProgressLoop();
  const tick = ()=>{
    RAF = null;
    if (!isBusyCraft()) { stopInlineProgressLoop(); return; }
    const pct = Math.round(craftProgressPct()*100);
    // Update any in-card bars
    document.querySelectorAll('#craftList .craft-progress .bar').forEach(b=>{
      b.style.width = pct + '%';
    });
    RAF = requestAnimationFrame(tick);
  };
  RAF = requestAnimationFrame(tick);
}
function stopInlineProgressLoop(){
  if (RAF) cancelAnimationFrame(RAF);
  RAF = null;
}
