// /ui/smithing.js
import { state, saveNow } from '../systems/state.js';
import { qs, on } from '../utils/dom.js';
import { FORGE_RECIPES, SMELT_RECIPES } from '../data/smithing.js';
import {
  canSmelt, startSmelt, finishSmelt, maxSmeltable,
  canForge, startForge, finishForge,
  listUpgradable, applyUpgrade,
  smithXpOf
} from '../systems/smithing.js';
import { buildXpTable, levelFromXp } from '../systems/xp.js';
import { pushSmithLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderSkills } from './skills.js';
import { renderEquipment } from './equipment.js';
import { renderEnchanting } from './enchanting.js';
import { ITEMS } from '../data/items.js';
import { forgeBatchMax } from '../data/construction.js';

const XP_TABLE = buildXpTable();
const smithLevel = () => levelFromXp(state.smithXp || 0, XP_TABLE);

// --- Normalize smelt data once (supports array or map) ---
const SMELT_LIST = Array.isArray(SMELT_RECIPES) ? SMELT_RECIPES : Object.values(SMELT_RECIPES || {});
const SMELT_BY_ID = Array.isArray(SMELT_RECIPES)
  ? Object.fromEntries(SMELT_RECIPES.map(r => [r.id, r]))
  : (SMELT_RECIPES || {});

const el = {
  smithLabel:   qs('#smithLabel'),
  smithBar:     qs('#smithBar'),
  smeltSelect:  qs('#smeltSelect'),
  smeltOneBtn:  qs('#smeltOneBtn'),
  smeltAllBtn:  qs('#smeltAllBtn'),
  forgeList:    qs('#forgeList'),
  forgeMetal:   qs('#forgeMetal'),
  // created dynamically:
  forgeBatchWrap: null,
  upgradeFilter:   qs('#upgradeFilter'),
  upgradeTarget:   qs('#upgradeTarget'),
  applyUpgradeBtn: qs('#applyUpgradeBtn'),
};

/* ---------- one-time CSS (badges + batch buttons) ---------- */
(function ensureSmithCss(){
  const needBatch = !document.getElementById('smith-batch-css');
  const needBase  = !document.getElementById('smith-badge-css');

  if (needBase){
    const css = document.createElement('style');
    css.id = 'smith-badge-css';
    css.textContent = `
      .badge{display:inline-block;border-radius:999px;font-size:11px;padding:2px 6px;line-height:1;border:1px solid rgba(255,255,255,.12)}
      .badge.level{background:transparent}
      .badge.xp{background:#1b2d1f;color:#22c55e;border-color:#1f3d25}
      .forge-badges{display:flex;gap:6px;align-items:center}
      .forge-head{display:flex;gap:10px;align-items:center}
      .forge-icon.icon-img{width:28px;height:28px;object-fit:contain}
      .progress.xs{height:4px;background:#182033;border-radius:5px;overflow:hidden;margin-top:6px}
      .progress.xs .bar{height:100%;width:0%;background:#3b82f6}
      .forge-icon-fallback{font-size:20px}
    `;
    document.head.appendChild(css);
  }
  if (needBatch){
    const css2 = document.createElement('style');
    css2.id = 'smith-batch-css';
    css2.textContent = `
      .smith-batch{display:flex;gap:6px;align-items:center;margin:8px 0}
      .smith-batch .label{opacity:.8;font-size:12px;margin-right:6px}
      .smith-batch .btn{padding:4px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.12);font-size:12px;background:rgba(255,255,255,.04);cursor:pointer}
      .smith-batch .btn[aria-pressed="true"]{outline:1px solid #3b82f6;background:rgba(59,130,246,.15)}
    `;
    document.head.appendChild(css2);
  }
})();

/* ---------- helpers ---------- */
function prettyName(idOrBase){
  const base = String(idOrBase).split('@')[0];
  return ITEMS?.[base]?.name || base.replace(/_/g,' ');
}
function qStr(q){ return q!=null ? `qty: ${q}%` : ''; }
function inputsOf(r){ return Array.isArray(r?.inputs) ? r.inputs : []; }
function inferMetalFromId(id){ return String(id||'').split('_')[0] || null; }
function metalOfRecipe(rec){ return rec?.metal || inferMetalFromId(rec?.id) || 'misc'; }
function metalsInOrder(){
  const order = [];
  for (const r of (FORGE_RECIPES || [])){
    const m = metalOfRecipe(r);
    if (m && !order.includes(m)) order.push(m);
  }
  return order.length ? order : ['misc'];
}
function isSmithBusy(){ return state.action?.type === 'smith'; }
function isForging(){ return state.action?.type === 'smith' && state.action?.mode === 'forge'; }
function isSmelting(){ return state.action?.type === 'smith' && state.action?.mode === 'smelt'; }
function activeForgeId(){ return isForging() ? state.action.key : null; }

function pctFromAction(){
  if (!isSmithBusy()) return 0;
  const now = performance.now();
  const { startedAt = now, duration = 1 } = state.action || {};
  const p = (now - startedAt) / Math.max(1, duration);
  return Math.max(0, Math.min(1, p));
}

function stopAfkIfNotSmithingOrTome(reason = 'smithing'){
  const a = state.action;
  if (a && a.type !== 'smith' && a.type !== 'tome') {
    state.action = null;
    try { window.dispatchEvent(new Event('action:stop')); } catch {}
    pushSmithLog(`Stopped ${a.type || 'afk'} to ${reason}.`);
    saveNow();
    return true;
  }
  return false;
}

/* ---------- smelting UI ---------- */
function smeltRec(outId){ return SMELT_BY_ID[outId] || null; }

function reqStrSmelt(outId){
  const r = smeltRec(outId);
  if (!r) return '';
  return inputsOf(r).map(inp => `${inp.qty}× ${prettyName(inp.id)}`).join(' + ');
}

function ensureSmeltDropdown(){
  if (!el.smeltSelect) return;
  const lvl  = smithLevel();
  const prev = el.smeltSelect.value;

  el.smeltSelect.innerHTML = SMELT_LIST.map(r => {
    const need   = r.level || 1;
    const under  = lvl < need;
    const inputs = inputsOf(r).map(inp => `${inp.qty}× ${prettyName(inp.id)}`).join(' + ');
    const label  = `${r.name || prettyName(r.id)} (Lv ${need})${inputs ? ` — ${inputs}` : ''}`;
    const title  = `${under ? `Requires Lv ${need}. ` : ''}${inputs ? `Inputs: ${inputs}` : ''}`;
    return `<option value="${r.id}" ${under ? 'disabled' : ''} title="${title}">${label}</option>`;
  }).join('');

  if (prev && SMELT_BY_ID[prev]) el.smeltSelect.value = prev;

  const sel = el.smeltSelect.options[el.smeltSelect.selectedIndex];
  if (!sel || sel.disabled){
    const firstEnabled = Array.from(el.smeltSelect.options).find(o => !o.disabled);
    if (firstEnabled) el.smeltSelect.value = firstEnabled.value;
  }

  const outId = el.smeltSelect.value;
  const reqEl = document.getElementById('smeltReqs');
  if (outId && reqEl) reqEl.textContent = reqStrSmelt(outId);
}

function updateSmeltButtons(){
  const rid = el.smeltSelect?.value;
  if (!rid){
    el.smeltOneBtn && (el.smeltOneBtn.disabled = true);
    el.smeltAllBtn && (el.smeltAllBtn.disabled = true);
    return;
  }
  const rec = smeltRec(rid);
  const need = (rec?.level) || 1;
  const allowed = smithLevel() >= need;
  const smithBusy = isSmithBusy();
  const canOne = allowed && canSmelt(state, rid) && !smithBusy;
  const maxN   = allowed ? maxSmeltable(state, rid) : 0;
  el.smeltOneBtn && (el.smeltOneBtn.disabled = !canOne);
  el.smeltAllBtn && (el.smeltAllBtn.disabled = !(maxN > 0) || smithBusy);
}

/* ---------- forge “Batch” controls ---------- */
function ensureForgeMetalOptions(){
  if (!el.forgeMetal) return;
  const metals = metalsInOrder();
  const have = new Set(Array.from(el.forgeMetal.options).map(o => o.value));
  metals.forEach(m => {
    if (!have.has(m)) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m.charAt(0).toUpperCase() + m.slice(1);
      el.forgeMetal.appendChild(opt);
    }
  });
  if (!el.forgeMetal.value) el.forgeMetal.value = metals[0] || '';
}

function forgeBatchOptionsFromMax(max){
  if (!Number.isFinite(max)) return [1, 2, 5, 10, 25, 'X'];
  if (max >= 25) return [1, 2, 5, 10, 25];
  if (max >= 10) return [1, 2, 5, 10];
  if (max >= 5)  return [1, 2, 5];
  if (max >= 2)  return [1, 2];
  return [1];
}
function currentForgeBatchChoice(){
  const max = forgeBatchMax(state);
  const opts = forgeBatchOptionsFromMax(max);
  const v = state.ui?.forgeBatch;
  if (v == null) return opts[0];
  if (v === 'X') return opts.includes('X') ? 'X' : opts[opts.length-1];
  const n = Math.max(1, parseInt(v, 10) || 1);
  const allowedNums = opts.filter(x => x !== 'X');
  const clamped = Math.min(n, Math.max(...allowedNums));
  return allowedNums.includes(clamped) ? clamped : allowedNums[0];
}
function setForgeBatchChoice(v){
  state.ui = state.ui || {};
  state.ui.forgeBatch = v;
  saveNow();
  syncForgeBatchButtons();
}
function ensureForgeBatchControls(){
  if (el.forgeBatchWrap && document.body.contains(el.forgeBatchWrap)) return;
  const anchor = qs('#forgeSection') || el.forgeList?.parentElement || document.querySelector('#smithingPanel') || document.body;
  const wrap = document.createElement('div');
  wrap.className = 'smith-batch';
  wrap.id = 'forgeBatchWrap';
  wrap.innerHTML = `<span class="label">Batch:</span><div class="btns"></div>`;
  anchor.insertBefore(wrap, anchor.firstChild);
  el.forgeBatchWrap = wrap;

  wrap.addEventListener('click', (e)=>{
    const btn = e.target.closest?.('.btn[data-v]');
    if (!btn) return;
    const raw = btn.getAttribute('data-v');
    setForgeBatchChoice(raw === 'X' ? 'X' : Math.max(1, parseInt(raw, 10)));
  });
  buildForgeBatchButtons();
}
function buildForgeBatchButtons(){
  if (!el.forgeBatchWrap) return;
  const btnsHost = el.forgeBatchWrap.querySelector('.btns');
  if (!btnsHost) return;
  const max = forgeBatchMax(state);
  const opts = forgeBatchOptionsFromMax(max);
  btnsHost.innerHTML = opts.map(v => `<button class="btn" type="button" data-v="${v}">${v}</button>`).join('');
  syncForgeBatchButtons();
}
function syncForgeBatchButtons(){
  if (!el.forgeBatchWrap) return;
  const val = currentForgeBatchChoice();
  for (const b of el.forgeBatchWrap.querySelectorAll('.btn')){
    const v = b.getAttribute('data-v');
    const pressed = (v === 'X' && val === 'X') || (v !== 'X' && Number(v) === Number(val));
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }
}

/* ---------- smithing progress loop ---------- */
let RAF = null;
function stopSmithLoop(){ if (RAF) cancelAnimationFrame(RAF); RAF = null; }
function startSmithLoop(){
  if (RAF) return;
  const tick = ()=>{
    RAF = null;
    if (!isSmithBusy()) {
      if (el.smithBar)   el.smithBar.style.width = '0%';
      if (el.smithLabel) el.smithLabel.textContent = 'Idle';
      updateSmeltButtons();
      renderForgeList();
      return;
    }

    const pct = Math.round(pctFromAction()*100);

    if (isSmelting()){
      if (el.smithBar) el.smithBar.style.width = `${pct}%`;
      if (el.smithLabel){
        const id = state.action?.key;
        el.smithLabel.textContent = `Smelting ${prettyName(id)}… ${pct}%`;
      }
    } else if (isForging()){
      const id = activeForgeId();
      const bar = el.forgeList?.querySelector(`[data-id="${id}"] .forge-progress .bar`);
      if (bar) bar.style.width = `${pct}%`;
      if (el.smithLabel){
        const r = (FORGE_RECIPES || []).find(x=>x.id===id);
        el.smithLabel.textContent = `Forging ${r?.name || prettyName(id)}… ${pct}%`;
      }
    }

    RAF = requestAnimationFrame(tick);
  };
  RAF = requestAnimationFrame(tick);
}

/* ---------- icons/badges ---------- */
function tintClassForRecipe(rec){
  if (rec?.tint) return ` tint-${rec.tint}`;
  const metal = metalOfRecipe(rec);
  const TINTABLE = new Set(metalsInOrder().filter(m => ['copper','bronze','iron','steel'].includes(m)));
  if (!TINTABLE.has(metal)) return '';
  return ` tint-${metal}`;
}
function iconHtmlForRecipe(rec){
  const baseId = rec.id;
  const def = ITEMS?.[baseId] || {};
  const isMaterial = rec.kind === 'material' || /^bar_|^ore_/.test(baseId);
  const src = def.img || (isMaterial ? 'assets/materials/ore.png' : null);
  const tint = tintClassForRecipe(rec);
  return src
    ? `<img class="forge-icon icon-img${tint}" src="${src}" alt="${def.name || baseId}">`
    : `<span class="forge-icon forge-icon-fallback">🛠️</span>`;
}
function badgesHtmlForForge(rec){
  const lvl = `<span class="badge level">Lv ${rec.level || 1}</span>`;
  const xp  = Math.max(0, Number(smithXpOf(rec) || 0));
  const xpBadge = xp ? `<span class="badge xp" title="+${xp} Smithing xp">+${xp}xp</span>` : '';
  return `<div class="forge-badges">${lvl}${xpBadge ? ` ${xpBadge}` : ''}</div>`;
}

/* ---------- renderers ---------- */
function renderForgeList(){
  if (!el.forgeList) return;
  const metals = metalsInOrder();
  if (!el.forgeMetal.value) el.forgeMetal.value = metals[0] || '';
  const want = el.forgeMetal.value || metals[0] || '';

  const list = (FORGE_RECIPES || []).filter(r => metalOfRecipe(r) === want);

  const busy = isForging();
  const actId = activeForgeId();
  const pct = Math.round(pctFromAction()*100);

  el.forgeList.innerHTML = list.map(r=>{
    const ok   = canForge(state, r.id) && !isSmithBusy();
    const isActive = busy && r.id === actId;
    const costs = inputsOf(r).map(inp => `${inp.qty}× ${prettyName(inp.id)}`).join(', ');
    return `
      <button class="forge-item ${ok ? '' : 'disabled'} ${isActive ? 'busy':''}"
              data-id="${r.id}"
              ${ok ? '' : 'disabled aria-disabled="true"'}
              title="${ok ? '' : (isActive ? 'Forging…' : 'Missing level/materials or busy')}">
        <div class="forge-head">
          ${iconHtmlForRecipe(r)}
          <div class="forge-titles"><span class="forge-name">${r.name || prettyName(r.id)}</span></div>
          ${badgesHtmlForForge(r)}
        </div>
        <div class="forge-body">
          <div class="forge-costs"><span class="cost">${costs}</span></div>
          ${isActive ? `<div class="progress xs forge-progress" aria-hidden="true"><div class="bar" style="width:${pct}%;"></div></div>` : ``}
        </div>
      </button>
    `;
  }).join('');

  if (isForging()) startSmithLoop();
}

function renderUpgradeDropdown(){
  if (!el.upgradeTarget) return;
  const metalFilter = el.upgradeFilter?.value || 'all';

  const list = listUpgradable(state, ITEMS).filter(x=>{
    if (metalFilter === 'all') return true;
    const baseMetal = inferMetalFromId(x.base);
    return baseMetal === metalFilter;
  });

  if (!list.length){
    el.upgradeTarget.innerHTML = `<option disabled selected>Nothing upgradable</option>`;
    if (el.applyUpgradeBtn) el.applyUpgradeBtn.disabled = true;
    return;
  }

  el.upgradeTarget.innerHTML = list.map(x=>{
    const loc = x.where === 'equip' ? `Equipped` : `Inventory`;
    const extra = x.where === 'equip' ? ` (${x.slot})` : '';
    return `<option value="${x.token}">${x.name} · ${qStr(x.q)} — ${loc}${extra}</option>`;
  }).join('');

  if (!el.applyUpgradeBtn) return;
  el.applyUpgradeBtn.disabled = false;
}

export function renderSmithing(){
  if (el.smithLabel && (!state.action || state.action.type!=='smith')) {
    el.smithLabel.textContent = 'Idle';
  }
  if (el.smithBar) el.smithBar.style.width = isSmithBusy() ? `${Math.round(pctFromAction()*100)}%` : '0%';

  ensureSmeltDropdown();
  updateSmeltButtons();
  ensureForgeMetalOptions();

  // Batch UI
  ensureForgeBatchControls();
  buildForgeBatchButtons();
  syncForgeBatchButtons();

  renderForgeList();
  renderUpgradeDropdown();

  if (isSmithBusy()) startSmithLoop(); else stopSmithLoop();
}

/* ---------- interactions ---------- */
on(document, 'click', '#smeltOneBtn', ()=>{
  const outId = el.smeltSelect?.value;
  if (!outId) return;
  const need = (smeltRec(outId)?.level) || 1;
  if (smithLevel() < need) return;
  if (!canSmelt(state, outId)) return;
  stopAfkIfNotSmithingOrTome('smelt');

  const ok = startSmelt(state, outId, ()=>{
    finishSmelt(state);
    const xp = smithXpOf(smeltRec(outId)) || 0;
    pushSmithLog(`Smelted ${prettyName(outId)} → +${xp} Smithing xp`);
    saveNow();
    renderSmithing();
    renderInventory();
    renderSkills();
  });
  if (ok){
    renderSmithing();
    startSmithLoop();
  }
});

on(document, 'click', '#smeltAllBtn', ()=>{
  const outId = el.smeltSelect?.value;
  if (!outId) return;
  const need = (smeltRec(outId)?.level) || 1;
  if (smithLevel() < need) return;
  stopAfkIfNotSmithingOrTome('smelt');

  const N = maxSmeltable(state, outId);
  if (N <= 0) return;
  let left = N;

  const step = ()=>{
    if (left <= 0) {
      if (state.action?.type === 'smith') {
        state.action = null;
        try { window.dispatchEvent(new Event('action:stop')); } catch {}
      }
      saveNow();
      renderSmithing();
      renderEnchanting();
      renderInventory();
      renderSkills();
      return;
    }
    if (!canSmelt(state, outId)) {
      if (state.action?.type === 'smith') {
        state.action = null;
        try { window.dispatchEvent(new Event('action:stop')); } catch {}
      }
      saveNow();
      renderSmithing();
      return;
    }
    const ok = startSmelt(state, outId, ()=>{
      finishSmelt(state);
      const xp = smithXpOf(smeltRec(outId)) || 0;
      pushSmithLog(`Smelted ${prettyName(outId)} → +${xp} Smithing xp`);
      saveNow();
      renderSmithing();
      renderEnchanting();
      renderInventory();
      renderSkills();
      left -= 1;
      step();
    });
    if (ok){
      renderSmithing();
      startSmithLoop();
    }
  };
  step();
});

on(document, 'change', '#smeltSelect', ()=>{
  updateSmeltButtons();
  const outId = el.smeltSelect?.value;
  if (outId){
    const reqEl = document.getElementById('smeltReqs');
    if (reqEl) reqEl.textContent = reqStrSmelt(outId);
  }
});

on(document, 'change', '#forgeMetal', ()=>{
  renderForgeList();
});

function stopSmith(reason = 'smithing'){
  if (state.action?.type === 'smith') {
    state.action = null;
    stopSmithLoop();
    try { window.dispatchEvent(new Event('action:stop')); } catch {}
    if (el.smithLabel) el.smithLabel.textContent = 'Idle';
    if (el.smithBar)   el.smithBar.style.width = '0%';
    const rowBar = el.forgeList?.querySelector('.forge-progress .bar');
    if (rowBar) rowBar.style.width = '0%';

    saveNow();
    renderSmithing();
    renderInventory();
    renderEnchanting();
    renderSkills();
    return true;
  }
  return false;
}
on(document, 'click', '#smeltStopBtn, .smelt-stop-btn', ()=>{
  if (isSmelting()) stopSmith('smelt');
});

/* ---------- Upgrade filter ---------- */
(function ensureUpgradeFilterOptions(){
  if (!el.upgradeFilter) return;
  const metals = ['all', ...metalsInOrder()];
  const have = new Set(Array.from(el.upgradeFilter.options).map(o => o.value));
  metals.forEach(m => {
    if (!have.has(m)) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m === 'all' ? 'All' : (m.charAt(0).toUpperCase() + m.slice(1));
      el.upgradeFilter.appendChild(opt);
    }
  });
  if (!el.upgradeFilter.value) el.upgradeFilter.value = 'all';
})();

on(document, 'change', '#upgradeFilter', ()=>{
  renderUpgradeDropdown();
});

/* ---------- Forge click (with batch chaining) ---------- */
on(document, 'click', '#forgeList .forge-item', (e, btn)=>{
  const id = btn?.dataset?.id;
  if (!id || btn.hasAttribute('disabled') || btn.classList.contains('disabled') || isSmithBusy()) return;
  if (!canForge(state, id)) return;
  stopAfkIfNotSmithingOrTome('forge');

  // Determine how many to attempt this click
  const choice = currentForgeBatchChoice();
  const targetCount = (choice === 'X') ? Infinity : Math.max(1, Number(choice) || 1);

  let made = 0;
  const step = ()=>{
    if (made >= targetCount) {
      // finished desired batch
      if (state.action?.type === 'smith') {
        state.action = null;
        try { window.dispatchEvent(new Event('action:stop')); } catch {}
      }
      saveNow();
      renderSmithing();
      renderInventory();
      renderEquipment();
      renderSkills();
      return;
    }
    if (!canForge(state, id)) {
      // ran out of mats mid-batch
      if (state.action?.type === 'smith') {
        state.action = null;
        try { window.dispatchEvent(new Event('action:stop')); } catch {}
      }
      saveNow();
      renderSmithing();
      return;
    }

    const ok = startForge(state, id, ()=>{
      const res = finishForge(state); // { outId, q, xp }
      if (res){
        const base = String(res.outId).split('@')[0];
        const name = prettyName(base);
        const q = res.q!=null ? ` · ${qStr(res.q)}` : '';
        pushSmithLog(`Forged ${name}${q} → +${res.xp} Smithing xp`);
      }
      made += 1;
      saveNow();
      renderSmithing();
      renderInventory();
      renderEquipment();
      renderSkills();
      step();
    });

    if (ok){
      renderSmithing();
      startSmithLoop();
    }
  };

  step();
});

on(document, 'click', '#applyUpgradeBtn', ()=>{
  const token = el.upgradeTarget?.value;
  if (!token || token.startsWith('Nothing')) return;

  const res = applyUpgrade(state, token);
  if (!res) return;

  const name = prettyName(res.base);
  const barUsed = prettyName(res.barId);
  pushSmithLog(`Upgraded ${name}: ${qStr(res.oldQ)} → ${qStr(res.newQ)} (+${res.xp} Smithing xp) (−1 ${barUsed})`);

  saveNow();
  renderSmithing();
  renderInventory();
  renderEquipment();
  renderSkills();
});
