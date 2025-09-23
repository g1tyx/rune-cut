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
import { craftBatchOptions } from '../data/construction.js';

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

function xpArray(rec){
  return Array.isArray(rec?.xp)
    ? rec.xp.map(g => ({ skill:g?.skill, amount:(g?.amount|0) }))
           .filter(g => g.skill && g.amount > 0)
    : [];
}
function xpTotal(rec){ return xpArray(rec).reduce((s,g)=>s+g.amount,0); }
function xpTooltip(rec){
  const parts = xpArray(rec).map(g => `+${g.amount} ${g.skill} xp`);
  return parts.join(', ');
}
function xpLogText(gains){
  const parts = (Array.isArray(gains) ? gains : []).map(g => `+${g.amount} ${g.skill} xp`);
  return parts.join(', ');
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

function getBatchOpts(){ return craftBatchOptions(state); }
function getBatchChoice(){
  const def = getBatchOpts()[0] || 1;
  const v = state.ui?.craftBatch;
  return (v == null || !getBatchOpts().includes(v)) ? def : v;
}
function setBatchChoice(v){
  state.ui = state.ui || {};
  state.ui.craftBatch = v;
  saveState(state);
}

function maxCraftableFor(rec){
  const ins = inputsOf(rec);
  if (!ins.length) return Infinity;
  let m = Infinity;
  for (const inp of ins){
    const have = state.inventory[String(inp.id)] || 0;
    m = Math.min(m, Math.floor(have / Math.max(1, inp.qty|0)));
  }
  return Math.max(0, m);
}

// Chain crafts one after another, honoring the action timer
function craftMany(id, count, onDone){
  const rec = CRAFT_RECIPES[id]; if (!rec) return;
  const doOne = ()=>{
    if (!canCraft(state, id)) { onDone?.(); renderCrafting(); return; }
    const ok = startCraft(state, id, ()=>{
      const res = finishCraft(state, id);
      if (res){
        const name = res.name || res.id || 'Item';
        const gainsText = xpLogText(res?.xpGains);
        pushCraftLog(`Crafted ${name} → ${gainsText || '+0 xp'}`);
        renderInventory(); renderSmithing(); renderEnchanting(); renderSkills();
      }
      saveState(state);
      if (count === 'X'){
        // re-evaluate max each round
        if (maxCraftableFor(rec) > 0) { requestAnimationFrame(doOne); }
        else { onDone?.(); renderCrafting(); }
      } else {
        count -= 1;
        if (count > 0) { requestAnimationFrame(doOne); }
        else { onDone?.(); renderCrafting(); }
      }
    });
    if (ok && el.craftLabel) el.craftLabel.textContent = (rec?.name || id);
    renderCrafting();
  };
  doOne();
}

function ensureBatchCss(){
  if (document.getElementById('craft-batch-css')) return;
  const css = document.createElement('style');
  css.id = 'craft-batch-css';
  css.textContent = `
    #craftBatchRow{ display:flex; gap:6px; align-items:center; margin:0 0 8px; flex-wrap:wrap; }
    #craftBatchRow .batch-btn{ padding:4px 8px; border-radius:8px; font-size:12px; background:#1b2333; color:#cfe3ff; border:1px solid rgba(255,255,255,.06); }
    #craftBatchRow .batch-btn.active{ background:#14351f; color:#22c55e; border-color:#1b3b25; }
    #craftBatchRow .batch-btn:disabled{ opacity:.6; cursor:not-allowed; }
  `;
  document.head.appendChild(css);
}
ensureBatchCss();

function renderBatchRow(){
  const parent = el.craftList?.parentElement;
  if (!parent) return;
  let row = document.getElementById('craftBatchRow');
  if (!row){
    row = document.createElement('div');
    row.id = 'craftBatchRow';
    parent.insertBefore(row, el.craftList);
  }

  const busy = isBusyCraft();
  const opts = getBatchOpts();
  const choice = getBatchChoice();

  row.innerHTML = `
    <span class="muted">Batch:</span>
    ${opts.map(v=>{
      const label = (v === 'X') ? 'Max' : v;
      const active = (v === choice) ? 'active' : '';
      return `<button class="batch-btn ${active}" data-batch="${v}" ${busy?'disabled':''}>${label}</button>`;
    }).join('')}
  `;
}

// click handler
on(document,'click','#craftBatchRow .batch-btn',(e,btn)=>{
  const v = btn.getAttribute('data-batch');
  const val = (v === 'X') ? 'X' : parseInt(v,10);
  setBatchChoice(val);
  renderBatchRow();
});

/* ---------------- render ---------------- */
export function renderCrafting(){
  const busy = isBusyCraft();
  const activeId = activeCraftId();
  renderBatchRow();

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
    const xpAmt = xpTotal(r);
    const xpTip = xpTooltip(r);

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
            ${xpAmt ? `<span class="badge xp" title="${xpTip}">+${xpAmt}xp</span>` : ''}
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
  const xpAmt = xpTotal(baseVar);
  const xpTip = xpTooltip(baseVar);

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
          ${xpAmt ? `<span class="badge xp" title="${xpTip}">+${xpAmt}xp</span>` : ''}
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
  const id = btn.dataset.id; if (!id) return;
  if (!canCraft(state, id)) return;

  const batch = getBatchChoice();
  const count = (batch === 'X') ? 'X' : Math.max(1, batch | 0);

  craftMany(id, count, () => {
    saveState(state);
    renderInventory();
    renderSmithing();
    renderEnchanting();
    renderSkills();
    renderCrafting();
  });

  if (el.craftLabel) el.craftLabel.textContent = (CRAFT_RECIPES[id]?.name || id);
  renderCrafting();
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
  const lvlEl = card.querySelector('.badge.level');
  const xpEl  = card.querySelector('.badge.xp');
  const xp  = xpTotal(rec);
  const tip = xpTooltip(rec);
  if (xpEl){
    if (xp){ xpEl.textContent = `+${xp}xp`; xpEl.title = tip; }
    else { xpEl.textContent = ''; xpEl.removeAttribute('title'); }
}
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
  const batch = getBatchChoice();
  const count = (batch === 'X') ? 'X' : Math.max(1, batch|0);
  craftMany(rid, count, ()=>{ renderCrafting(); });

  const r = CRAFT_RECIPES[rid] || {};
  const xpAmt   = r?.xp?.amount || 0;
  const xpSkill = r?.xp?.skill || 'craft';

  const ok = startCraft(state, rid, ()=>{
    const res = finishCraft(state, rid);
    if (res){
      const name = res.name || res.id || 'Pages';
      const gainsText = xpLogText(res.xpGains);
      pushCraftLog(`Crafted ${name} → ${gainsText || '+0 xp'}`);
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
