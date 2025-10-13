// ui/farming.js — Farming panel with plots + Farm Store + level restriction
import { state, saveNow } from '../systems/state.js';
import { ITEMS } from '../data/items.js';
import { recipeForSeed } from '../data/farming.js';
import {
  ensureFarmState,
  unlockPlot,
  plantSeed,
  harvest,
  FARM_PLOTS,
  UNLOCK_COSTS,
  UNLOCK_LEVEL_REQS,   // ← NEW: import level requirements
  getFarmingXp,
} from '../systems/farming.js';
import { buildXpTable, levelFromXp } from '../systems/xp.js';
import { pushLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderSkills } from './skills.js';

const $ = (s, r = document) => r.querySelector(s);
const now = () => Date.now();
const XP_TABLE = buildXpTable();
const PLOTS = FARM_PLOTS;

function fmtMs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}m ${r}s`;
}

function seedOptions() {
  const inv = state.inventory || {};
  return Object.keys(inv)
    .filter((id) => ITEMS[id]?.type === 'seed' && inv[id] > 0)
    .map((id) => ({ id, qty: inv[id], name: ITEMS[id].name || id }));
}

function wireBtn(btn, handler) {
  if (!btn) return;
  const on = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { handler(e); } catch (err) { console.error('[Farming]', err); }
  };
  btn.addEventListener('click', on);
  btn.addEventListener('touchstart', on, { passive: false });
}

function injectStylesOnce() {
  if ($('#farmStyles')) return;
  const st = document.createElement('style');
  st.id = 'farmStyles';
  st.textContent = `
    .farm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:8px;}
    .farm-plot{background:#10131a;border:1px solid #2a2f3a;border-radius:14px;padding:12px;min-height:120px;display:flex;flex-direction:column;gap:8px}
    .farm-plot.ready{box-shadow:0 0 0 2px rgba(66,255,168,.15) inset}
    .farm-plot .progress{height:8px;background:#171922;border:1px solid #2a2f3a;border-radius:999px;overflow:hidden}
    .farm-plot .bar{height:100%;background:linear-gradient(90deg,#5ad,#49b);width:0%}
    .farm-store{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:8px;}
    .farm-store-item{background:#10131a;border:1px solid #2a2f3a;border-radius:14px;padding:8px;display:flex;align-items:center;gap:8px;}
    .farm-store-img{width:40px;height:40px;border-radius:8px;object-fit:contain;}
    .farm-store-info{flex:1;display:flex;flex-direction:column;}
    .farm-store-info .name{font-weight:600;}
    .farm-store-info .price{opacity:.75;font-size:0.9em;}
    .seed-select{user-select: none;}
  `;
  document.head.appendChild(st);
}

function renderPlot(i, grid) {
  ensureFarmState();
  const p = state.farm.plots[i];
  const div = document.createElement('div');
  div.className = 'farm-plot';
  div.dataset.idx = String(i);

  if (!p.unlocked) {
    const cost = UNLOCK_COSTS[i];
    const lvlReq = UNLOCK_LEVEL_REQS[i];
    const playerLvl = levelFromXp(state.farmingXp || 0, XP_TABLE);
    const meetsLvl = (lvlReq == null) || (playerLvl >= lvlReq);

    div.innerHTML = `
      <div class="title">Plot ${i + 1}</div>
      <div class="muted">
        ${cost != null ? `Unlock cost: ${cost} gold` : 'Unlock cost: —'}
        ${lvlReq != null ? ` • Req: Farming Lvl ${lvlReq}` : ''}
      </div>
      ${
        cost != null
          ? `<button class="btn btn-primary plot-unlock" ${meetsLvl ? '' : 'disabled'}>${meetsLvl ? `Unlock (${cost})` : `Requires L${lvlReq}`}</button>`
          : `<span class="pill">Locked</span>`
      }
    `;
    grid.appendChild(div);

    const btn = div.querySelector('.plot-unlock');
    wireBtn(btn, () => {
      unlockPlot(i);
      renderInventory();
      renderFarming();
    });
    return;
  }

  if (!p.seedId) {
    const seeds = seedOptions();
    const playerLvl = levelFromXp(state.farmingXp || 0, XP_TABLE);
    const has = seeds.length > 0;

    div.innerHTML = `
      <div class="title">Plot ${i + 1}</div>
      <div class="row">
        <select class="seed-select" name="seed-select-${i}" ${has ? '' : 'disabled'}>
          ${seeds.map((s) => {
            const rec = recipeForSeed(s.id, ITEMS);
            const lvlReq = rec?.lvl || 1;
            const disabled = playerLvl < lvlReq ? 'disabled' : '';
            const label = playerLvl < lvlReq
              ? `${ITEMS[s.id]?.name || s.id} (Lvl ${lvlReq})`
              : `${ITEMS[s.id]?.name || s.id} (${s.qty})`;
            return `<option value="${s.id}" ${disabled}>${label}</option>`;
          }).join('')}
        </select>
        <button class="btn btn-primary plot-plant" ${has ? '' : 'disabled'}>Plant</button>
      </div>
      <div class="muted">${has ? 'Choose a seed to plant.' : 'You have no seeds.'}</div>
    `;
    grid.appendChild(div);

    const btn = div.querySelector('.plot-plant');
    const sel = div.querySelector('.seed-select');
    wireBtn(btn, () => {
      if (!sel?.value) return;
      const rec = recipeForSeed(sel.value, ITEMS);
      const playerLvl2 = levelFromXp(state.farmingXp || 0, XP_TABLE);
      if (playerLvl2 < (rec.lvl || 1)) {
        pushLog(`You need Farming level ${rec.lvl} to plant ${rec.name}.`, 'farming');
        return;
      }
      plantSeed(i, sel.value);
      renderFarming();
    });
    return;
  }

  const rec = recipeForSeed(p.seedId, ITEMS);
  const name = rec?.name || p.seedId;
  const total = Math.max(1, p.doneAt - p.plantedAt);
  const remain = Math.max(0, p.doneAt - now());
  const pct = Math.max(0, Math.min(1, 1 - remain / total)) * 100;
  const ready = remain <= 0;

  div.classList.add(ready ? 'ready' : 'growing');
  div.innerHTML = `
    <div class="title">${name}</div>
    <div class="muted">${ready ? 'Ready to harvest!' : `Growing — ${fmtMs(remain)}`}</div>
    <div class="progress"><div class="bar" style="width:${pct.toFixed(1)}%"></div></div>
    <div class="row">
      ${ready ? `<button class="btn btn-primary plot-harvest">Harvest (×3)</button>` : `<span class="pill">Growing</span>`}
    </div>
  `;
  grid.appendChild(div);

  if (ready) {
    const btn = div.querySelector('.plot-harvest');
    wireBtn(btn, () => {
      btn.disabled = true;
      harvest(i);
      saveNow();
      setTimeout(saveNow, 0);
      renderInventory();
      renderSkills();
      renderFarming();
    });
  }
}

function renderFarmStore() {
  const el = $('#farmStore');
  if (!el) return;

  const seeds = Object.values(ITEMS)
    .filter((it) => it?.farmStore && it.sell)
    .sort((a, b) => a.name.localeCompare(b.name));

  el.innerHTML = seeds.map((it) => {
    const afford = (state.gold | 0) >= (it.sell | 0);
    return `
      <div class="farm-store-item">
        <img src="${it.img}" alt="" class="farm-store-img">
        <div class="farm-store-info">
          <div class="name">${it.name}</div>
          <div class="price">${it.sell} gold</div>
        </div>
        <button class="btn btn-primary buy-btn" data-id="${it.id}" ${afford ? '' : 'disabled'}>Buy</button>
      </div>
    `;
  }).join('');

  el.querySelectorAll('.buy-btn').forEach((btn) => {
    wireBtn(btn, (e) => {
      const id = e.currentTarget.dataset.id;
      const def = ITEMS[id];
      if (!def) return;
      const cost = def.sell | 0;
      if ((state.gold | 0) < cost) {
        pushLog('Not enough gold.', 'farming');
        return;
      }
      state.gold -= cost;
      state.inventory[id] = (state.inventory[id] || 0) + 1;
      pushLog(`Bought 1× ${def.name} for ${cost} gold.`, 'farming');
      saveNow();
      renderInventory();
      renderFarmStore();
      renderFarming();
    });
  });
}

export function renderFarming() {
  ensureFarmState();
  const grid = $('#farmGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < PLOTS; i++) renderPlot(i, grid);
  $('#farmXp').textContent = `- Full Farming Functionality coming soon -`;
  renderFarmStore();
}

function mountOnce() {
  const tab = $('#tab-farming');
  if (!tab || tab.dataset.wired) return;
  tab.innerHTML = `
    <h2>🌾 Farming</h2>
    <div id="farmXp" style="margin-bottom:6px;">XP: ${getFarmingXp()}</div>
    <div class="farm-grid" id="farmGrid"></div>
    <h3 style="margin-top:16px;">🛒 Farm Store</h3>
    <div id="farmStore" class="farm-store"></div>
  `;
  tab.dataset.wired = '1';
}

export function initFarming() {
  injectStylesOnce();
  mountOnce();
  renderFarming();

  setInterval(() => {
    const grid = document.querySelector('#farmGrid');
    if (!grid) return;
    let shouldRefresh = false;
    const plots = state.farm?.plots || [];
    plots.forEach((p, i) => {
      if (!p.seedId) return;
      const left = Math.max(0, p.doneAt - Date.now());
      const total = Math.max(1, p.doneAt - p.plantedAt);
      const pct = Math.max(0, Math.min(1, 1 - left / total)) * 100;
      const el = grid.children[i];
      const bar = el?.querySelector('.bar');
      if (bar) bar.style.width = pct.toFixed(1) + '%';
      if (left <= 0 && !el?.classList.contains('ready')) shouldRefresh = true;
    });
    if (shouldRefresh) renderFarming();
  }, 1000);
}

function hookFarmingTabClicks() {
  const selectors = [
    'a[href="#tab-farming"]',
    '[data-target="#tab-farming"]',
    '[data-tab="farming"]',
    '#nav-farming',
  ];
  document.addEventListener('click', (e) => {
    const t = e.target.closest(selectors.join(','));
    if (!t) return;
    requestAnimationFrame(() => initFarming());
  });
  window.addEventListener('tab:show', (e) => {
    const id = e?.detail?.id;
    const target = e?.detail?.target;
    if (id === 'farming' || target === '#tab-farming') {
      requestAnimationFrame(() => initFarming());
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    hookFarmingTabClicks();
    initFarming();
  }, { once: true });
} else {
  hookFarmingTabClicks();
  initFarming();
}
