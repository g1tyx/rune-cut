// /ui/smithing.js
import { state, saveState } from '../systems/state.js';
import { qs, on } from '../utils/dom.js';
import { FORGE_RECIPES, SMELT_RECIPES } from '../data/smithing.js';
import {
  canSmelt, startSmelt, finishSmelt, maxSmeltable,
  canForge, startForge, finishForge,
  listUpgradable, applyUpgrade
} from '../systems/smithing.js';
import { buildXpTable, levelFromXp } from '../systems/xp.js';
import { pushSmithLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderSkills } from './skills.js';
import { renderEquipment } from './equipment.js';
import { renderEnchanting } from './enchanting.js';
import { ITEMS } from '../data/items.js';

const XP_TABLE = buildXpTable();
const smithLevel = () => levelFromXp(state.smithXp || 0, XP_TABLE);

const el = {
  // progress label
  smithLabel: qs('#smithLabel'),

  // smelting UI
  smeltSelect: qs('#smeltSelect'),
  smeltOneBtn: qs('#smeltOneBtn'),
  smeltAllBtn: qs('#smeltAllBtn'),

  // forging
  forgeList:   qs('#forgeList'),
  forgeMetal:  qs('#forgeMetal'),

  // upgrade UI
  upgradeFilter:   qs('#upgradeFilter'),
  upgradeTarget:   qs('#upgradeTarget'),
  applyUpgradeBtn: qs('#applyUpgradeBtn'),
};

// ---------- helpers ----------
function isSmithBusy(){
  return state.action?.type === 'smith';
}

function stopAfkIfNotSmithingOrTome(reason = 'smithing'){
  const a = state.action;
  if (a && a.type !== 'smith' && a.type !== 'tome') {
    state.action = null;
    try { window.dispatchEvent(new Event('action:stop')); } catch {}
    pushSmithLog(`Stopped ${a.type || 'afk'} to ${reason}.`);
    saveState(state);
    return true;
  }
  return false;
}

function prettyName(idOrBase){
  const base = String(idOrBase).split('@')[0];
  return ITEMS?.[base]?.name || base.replace(/_/g,' ');
}
function qStr(q){ return q!=null ? `qty: ${q}%` : ''; }

function metalOfRecipe(rec){
  if (rec?.metal) return rec.metal;                             // preferred
  const m = String(rec?.id||'').split('_')[0];                  // infer from id
  return ['copper','bronze','iron', 'steel', 'blacksteel'].includes(m) ? m : 'copper';
}
function barForRecipe(rec){
  return rec?.barId || (rec?.metal ? `bar_${rec.metal}` : 'bar_copper');
}

function reqStrForge(rec){
  const parts = [];
  const barId = barForRecipe(rec);
  const barNm = prettyName(barId);
  if (rec.bars) parts.push(`${rec.bars}× ${barNm}`);
  (rec.extras || []).forEach(ex => parts.push(`${ex.qty}× ${prettyName(ex.id)}`));
  return parts.join(', ');
}

function isForging(){
  return state.action?.type === 'smith' && state.action?.mode === 'forge';
}
function activeForgeId(){
  return isForging() ? state.action.key : null;
}
function progressPct(){
  if (!isForging()) return 0;
  const now = performance.now();
  const { startedAt, duration } = state.action;
  const p = (now - (startedAt||now)) / Math.max(1, (duration||1));
  return Math.max(0, Math.min(1, p));
}

// ---------- Smelt dropdown + buttons ----------
function reqStrSmelt(outId){
  const r = SMELT_RECIPES?.[outId];
  if (!r) return '';
  const parts = (r.inputs || []).map(inp => `${inp.qty}× ${prettyName(inp.id)}`);
  return parts.join(' + ');
}

function ensureSmeltDropdown(){
  if (!el.smeltSelect) return;

  const lvl  = smithLevel();
  const prev = el.smeltSelect.value;

  // Bars in a sensible order; anything else (like glass_glob) after
  const order = ['bar_copper','glass_glob','bar_bronze','bar_iron','bar_steel','bar_blacksteel'];
  const ordIdx = id => {
    const i = order.indexOf(id);
    return i === -1 ? 999 : i;
  };

  const ids = Object.keys(SMELT_RECIPES || {}).sort((a,b)=>{
    const oa = ordIdx(a), ob = ordIdx(b);
    if (oa !== ob) return oa - ob;
    const na = SMELT_RECIPES[a]?.name || prettyName(a);
    const nb = SMELT_RECIPES[b]?.name || prettyName(b);
    return String(na).localeCompare(String(nb));
  });

  el.smeltSelect.innerHTML = ids.map(id => {
    const r = SMELT_RECIPES[id] || {};
    const need   = r.level || 1;
    const under  = lvl < need;
    const inputs = reqStrSmelt(id); // e.g., "1× ore_copper" or "1× ore_iron + 1× ore_coal"
    const label  = `${r.name || prettyName(id)} (Lv ${need}${inputs ? `) ${inputs}` : ''}`;
    const title  = `${under ? `Requires Lv ${need}. ` : ''}${inputs ? `Inputs: ${inputs}` : ''}`;

    return `<option value="${id}" ${under ? 'disabled' : ''} title="${title}">
      ${label}
    </option>`;
  }).join('');

  // keep previous selection if possible; else first enabled
  if (prev && ids.includes(prev)) el.smeltSelect.value = prev;
  const sel = el.smeltSelect.options[el.smeltSelect.selectedIndex];
  if (!sel || sel.disabled){
    const firstEnabled = Array.from(el.smeltSelect.options).find(o => !o.disabled);
    if (firstEnabled) el.smeltSelect.value = firstEnabled.value;
  }

  // also reflect in a helper line under the select, if present
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
  const need = (SMELT_RECIPES[rid]?.level) || 1;
  const allowed = smithLevel() >= need;
  const smithBusy = isSmithBusy();

  const canOne = allowed && canSmelt(state, rid) && !smithBusy;
  const maxN   = allowed ? maxSmeltable(state, rid) : 0;

  el.smeltOneBtn && (el.smeltOneBtn.disabled = !canOne);
  el.smeltAllBtn && (el.smeltAllBtn.disabled = !(maxN > 0) || smithBusy);
}


// ---------- forge progress loop ----------
let RAF = null;
function stopForgeLoop(){
  if (RAF) cancelAnimationFrame(RAF);
  RAF = null;
}
function startForgeLoop(){
  if (RAF) return;
  const tick = ()=>{
    RAF = null;
    if (!isForging()) return;

    // update progress width on the active button
    const id = activeForgeId();
    const bar = el.forgeList?.querySelector(`[data-id="${id}"] .forge-progress .bar`);
    if (bar) {
      bar.style.width = `${Math.round(progressPct()*100)}%`;
    }

    // optional: label text
    if (el.smithLabel){
      const r = FORGE_RECIPES.find(x=>x.id===id);
      const pctTxt = `${Math.round(progressPct()*100)}%`;
      el.smithLabel.textContent = `Forging ${r?.name || prettyName(id)}… ${pctTxt}`;
    }

    RAF = requestAnimationFrame(tick);
  };
  RAF = requestAnimationFrame(tick);
}

// ---------- renderers ----------
function renderForgeList(){
  if (!el.forgeList) return;
  const want = el.forgeMetal?.value || 'copper';

  const list = (FORGE_RECIPES || [])
    .filter(r => metalOfRecipe(r) === want)
    .slice()
    .sort((a,b) => (a.level||1)-(b.level||1) || String(a.name||a.id).localeCompare(String(b.name||b.id)));

  const busy = isForging();
  const activeId = activeForgeId();
  const nowPct = progressPct();

  el.forgeList.innerHTML = list.map(r=>{
    const ok   = canForge(state, r.id) && !busy;   // lock everything while forging
    const need = r.level || 1;
    const isActive = busy && r.id === activeId;
    const pct = isActive ? Math.round(nowPct*100) : 0;

    const icon = iconHtmlForRecipe(r);

    return `
      <button class="forge-item ${ok ? '' : 'disabled'} ${isActive ? 'busy':''}"
              data-id="${r.id}"
              ${ok ? '' : 'disabled aria-disabled="true"'}
              title="${ok ? '' : (isActive ? 'Forging…' : 'Missing level/materials or busy')}">
        <div class="forge-head">
          ${icon}
          <div class="forge-titles">
            <span class="forge-name">${r.name || prettyName(r.id)}</span>
          </div>
          <span class="forge-lvl">Lv ${need}</span>
        </div>
        <div class="forge-body">
          <div class="forge-costs">
            <span class="cost">${reqStrForge(r)}</span>
          </div>
          ${isActive ? `
            <div class="progress xs forge-progress" aria-hidden="true">
              <div class="bar" style="width:${pct}%;"></div>
            </div>` : ``}
        </div>
      </button>
    `;
  }).join('');

  if (busy) startForgeLoop(); else stopForgeLoop();
}

function renderUpgradeDropdown(){
  if (!el.upgradeTarget) return;
  const metal = el.upgradeFilter?.value || 'all';

  const list = listUpgradable(state, ITEMS).filter(x=>{
    if (metal === 'all') return true;
    return x.base.startsWith(`${metal}_`);
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

  if (el.applyUpgradeBtn) el.applyUpgradeBtn.disabled = false;
}

export function renderSmithing(){
  // Only show Idle when *not* smithing (you already do this)
  if (el.smithLabel && (!state.action || state.action.type!=='smith')) {
    el.smithLabel.textContent = 'Idle';
  }

  ensureSmeltDropdown();
  updateSmeltButtons();

  renderForgeList();
  renderUpgradeDropdown();
}

// ---------- interactions ----------

// Smelt 1 / All read the CURRENT selection value
on(document, 'click', '#smeltOneBtn', ()=>{
  const outId = el.smeltSelect?.value || 'bar_copper';
  const need = (SMELT_RECIPES[outId]?.level) || 1;
  if (smithLevel() < need) return;
  if (!canSmelt(state, outId)) return;
  stopAfkIfNotSmithingOrTome('smelt');
  const ok = startSmelt(state, outId, ()=>{
    const res = finishSmelt(state);
    const xp = (SMELT_RECIPES?.[outId]?.xp) || 0;
    pushSmithLog(`Smelted ${prettyName(outId)} → +${xp} Smithing xp`);
    saveState(state);
    renderSmithing();
    renderInventory();
    renderSkills();
  });
  if (ok) renderSmithing();
});

on(document, 'click', '#smeltAllBtn', ()=>{
  const outId = el.smeltSelect?.value || 'bar_copper';
  const need = (SMELT_RECIPES[outId]?.level) || 1;
  if (smithLevel() < need) return;
  stopAfkIfNotSmithingOrTome('smelt');

  const N = maxSmeltable(state, outId);
  if (N <= 0) return;
  let left = N;

  const step = ()=>{
    if (left <= 0) return;
    if (!canSmelt(state, outId)) return;

    const ok = startSmelt(state, outId, ()=>{
      const res = finishSmelt(state);
      const xp = (SMELT_RECIPES?.[outId]?.xp) || 0;
      pushSmithLog(`Smelted ${prettyName(outId)} → +${xp} Smithing xp`);
      saveState(state);
      renderSmithing();
      renderEnchanting();
      renderInventory();
      renderSkills();
      left -= 1;
      step();
    });
    if (ok) renderSmithing();
  };
  step();
});

// Changing the smelt dropdown
on(document, 'change', '#smeltSelect', ()=>{
  updateSmeltButtons();
  // Optional: show input requirements below the select
  const outId = el.smeltSelect?.value;
  if (outId){
    const reqEl = document.getElementById('smeltReqs');
    if (reqEl) reqEl.textContent = reqStrSmelt(outId);
  }
});

// Forge metal filter
on(document, 'change', '#forgeMetal', ()=>{
  renderForgeList();
});

// Upgrade metal filter
on(document, 'change', '#upgradeFilter', ()=>{
  renderUpgradeDropdown();
});

// Click a forge recipe (now shows progress on the button and locks others)
on(document, 'click', '#forgeList .forge-item', (e, btn)=>{
  const id = btn.dataset.id;
  // hard guard: disabled/locked or busy
  if (!id || btn.hasAttribute('disabled') || btn.classList.contains('disabled') || isForging()) return;
  if (!canForge(state, id)) return;
  stopAfkIfNotSmithingOrTome('forge');

  const ok = startForge(state, id, ()=>{
    const res = finishForge(state); // { outId, q, xp }
    if (res){
      const base = String(res.outId).split('@')[0];
      const name = prettyName(base);
      const q = res.q!=null ? ` · ${qStr(res.q)}` : '';
      pushSmithLog(`Forged ${name}${q} → +${res.xp} Smithing xp`);
    }
    saveState(state);
    renderSmithing();      // stops loop if finished
    renderInventory();
    renderEquipment();
    renderSkills();
  });

  if (ok){
    // Immediately re-render to lock buttons and show initial bar, then animate
    renderSmithing();
    startForgeLoop();
    saveState(state);
  }
});

// tint from recipe metal
function tintClassForRecipe(rec){
  // Prefer explicit metal, otherwise infer from id prefix (e.g., "iron_helm")
  const metal = (rec?.metal) || String(rec?.id||'').split('_')[0];

  // We tint these families using shared bronze/iron art, and now steel too:
  const TINTABLE = new Set(['copper','bronze','iron','steel']);

  // Blacksteel (and other late-tier sets with bespoke art) should NOT be tinted
  if (!TINTABLE.has(metal)) return '';

  return ` tint-${metal}`;
}

// choose an icon for the recipe's output
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

// Apply upgrade
on(document, 'click', '#applyUpgradeBtn', ()=>{
  const token = el.upgradeTarget?.value;
  if (!token || token.startsWith('Nothing')) return;

  const res = applyUpgrade(state, token);
  if (!res) return;

  const name = prettyName(res.base);
  const barUsed = prettyName(res.barId);
  pushSmithLog(`Upgraded ${name}: ${qStr(res.oldQ)} → ${qStr(res.newQ)} (+${res.xp} Smithing xp) (−1 ${barUsed})`);

  saveState(state);
  renderSmithing();
  renderInventory();
  renderEquipment();
  renderSkills();
});
