import { state, saveNow } from '../systems/state.js';
import { on } from '../utils/dom.js';
import { pushLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderSkills } from './skills.js';
import { renderEnchanting } from './enchanting.js';
import { ITEMS } from '../data/items.js';
import { isAfkSkillActive, startAfk, switchAfkTarget, stopAfk } from '../systems/afk.js';
import { toolEffectFor, toolRemainingMs } from '../systems/tools.js';

function ensureBoostCss(){
  if (document.getElementById('skill-boost-css')) return;
  const css = document.createElement('style');
  css.id = 'skill-boost-css';
  css.textContent = `
    .skill-boost-tip{
      margin-left:8px; font-weight:800; font-size:12px; color:#86efac;
      background:rgba(16,185,129,.12); border:1px solid rgba(16,185,129,.25);
      padding:2px 8px; border-radius:999px; white-space:nowrap;
    }
  `;
  document.head.appendChild(css);
}

function ensureBoostTipNear(labelEl, tipId){
  if (!labelEl) return null;
  let tip = document.getElementById(tipId);
  if (!tip){
    tip = document.createElement('span');
    tip.id = tipId;
    tip.className = 'skill-boost-tip';
    tip.hidden = true;
    labelEl.insertAdjacentElement('afterend', tip);
  }
  return tip;
}

function fmtSecs(ms){
  const s = Math.max(0, Math.ceil(ms/1000));
  return `${s}s`;
}

/**
 * Create a standardized gathering-skill UI controller.
 *
 * @param {Object} cfg
 * @param {string}   cfg.skillId
 * @param {string}   cfg.actionType
 * @param {function} cfg.getList
 * @param {function} cfg.canUse
 * @param {function} cfg.getSelectedId
 * @param {function} cfg.setSelectedId
 * @param {string}   cfg.selectSelector
 * @param {string}   cfg.startBtnSelector
 * @param {string}   cfg.stopBtnSelector
 * @param {string}   cfg.barSelector
 * @param {string}   cfg.labelSelector
 * @param {string}   cfg.logChannel
 * @param {string}   cfg.autoLabel
 * @param {string}   cfg.verbPast
 * @param {string}   cfg.essenceId
 */
export function initGatheringPanel(cfg){
  ensureBoostCss();

  const selEl = document.querySelector(cfg.selectSelector);
  const barEl = document.querySelector(cfg.barSelector);
  const lblEl = document.querySelector(cfg.labelSelector);
  const boostTip = ensureBoostTipNear(lblEl, `${cfg.skillId}-boost-tip`);

  let SELECT_FROZEN = false;
  let PENDING_REBUILD = false;
  let lastIds = '';

  function idsOf(list){ return list.map(x=>x.id).join('|'); }
  function freezeSelect(){ SELECT_FROZEN = true; }
  function unfreezeSelect(){
    SELECT_FROZEN = false;
    if (PENDING_REBUILD){
      PENDING_REBUILD = false;
      rebuildSelect();
    }
  }

  if (selEl){
    selEl.addEventListener('pointerdown', freezeSelect, { passive:true });
    selEl.addEventListener('focusin', freezeSelect, { passive:true });
    selEl.addEventListener('change', unfreezeSelect);
    selEl.addEventListener('blur', unfreezeSelect);
    selEl.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab'){
        setTimeout(unfreezeSelect, 0);
      }
    });
  }

  function currentList(){ return cfg.getList(state) || []; }

  function ensureSelectedExists(list){
    const sel = cfg.getSelectedId();
    if (!list.some(t => t.id === sel)){
      const fallback = list[0]?.id || '';
      if (fallback !== sel){
        cfg.setSelectedId(fallback);
        saveNow();
      }
    }
  }

  function rebuildSelect(){
    if (!selEl) return;
    const list = currentList();
    if (!list.length) return;
    ensureSelectedExists(list);
    const selId = cfg.getSelectedId();
    selEl.innerHTML = list.map(t=>{
      const ok = cfg.canUse({ ...state, action: null }, t);
      const selAttr = t.id === selId ? 'selected' : '';
      const disAttr = ok ? '' : 'disabled';
      const lvlStr  = t.level ? ` (Lv ${t.level})` : '';
      return `<option value="${t.id}" ${selAttr} ${disAttr}>${t.name || t.id}${ok ? '' : lvlStr}</option>`;
    }).join('');
    selEl.value = selId;
    lastIds = idsOf(list);
  }

  function updateSelectNonDestructive(){
    if (!selEl) return;
    const list = currentList();
    const curr = idsOf(list);
    if (curr !== lastIds){
      if (SELECT_FROZEN){ PENDING_REBUILD = true; return; }
      rebuildSelect();
      return;
    }
    const optById = new Map();
    for (let i=0;i<selEl.options.length;i++){
      const o = selEl.options[i];
      optById.set(o.value, o);
    }
    for (const t of list){
      const o = optById.get(t.id);
      if (!o) continue;
      const ok = cfg.canUse({ ...state, action:null }, t);
      if (ok) o.removeAttribute('disabled'); else o.setAttribute('disabled','');
      const lvlStr  = t.level ? ` (Lv ${t.level})` : '';
      const text = (t.name || t.id) + (ok ? '' : lvlStr);
      if (o.textContent !== text) o.textContent = text;
    }
  }

  function updateBoostTip(){
    if (!boostTip) return;
    const eff = toolEffectFor(state, cfg.skillId);
    if (!eff){
      boostTip.hidden = true;
      return;
    }
    const left = toolRemainingMs(state, cfg.skillId);
    if (left <= 0){
      boostTip.hidden = true;
      return;
    }
    const pct = Math.round(Math.max(0, Math.min(1, eff.chance || 0)) * 100);
    boostTip.textContent = `${pct}% double drop for ${fmtSecs(left)}`;
    boostTip.hidden = false;
  }

  function updateBar(){
    if (!barEl || !lblEl) return;
    const a = state.action;
    if (a?.type === cfg.actionType){
      const now = performance.now();
      const pct = Math.max(0, Math.min(1, (now - a.startedAt) / (a.duration || 1)));
      barEl.style.width = (pct*100).toFixed(2) + '%';
      lblEl.textContent = `${a.label || ''} — ${(pct*100).toFixed(0)}%`;
    } else {
      barEl.style.width = '0%';
      lblEl.textContent = isAfkSkillActive(cfg.skillId) ? cfg.autoLabel : 'Idle';
    }
    updateBoostTip();
  }

  function render(){
    if (!SELECT_FROZEN) rebuildSelect(); else updateSelectNonDestructive();
    const startBtn = document.querySelector(cfg.startBtnSelector);
    if (startBtn){
      const selId = cfg.getSelectedId();
      startBtn.disabled = !cfg.canUse({ ...state, action:null }, selId);
    }
    updateBar();
  }

  if (selEl){
    on(document, 'change', cfg.selectSelector, ()=>{
      const id = selEl.value;
      onSelectTarget(id);
    });
  }

  on(document, 'click', cfg.startBtnSelector, ()=>{
    const id = cfg.getSelectedId();
    onStart(id);
  });

  on(document, 'click', cfg.stopBtnSelector, ()=>{
    onStop();
  });

  function onSelectTarget(targetId){
    const list = currentList();
    const t = list.find(x => x.id === targetId);
    if (!t) return;
    if (!cfg.canUse({ ...state, action:null }, t)) return;
    cfg.setSelectedId(targetId);
    saveNow();
    if (isAfkSkillActive(cfg.skillId)) {
      switchAfkTarget(state, { skill: cfg.skillId, targetId });
    }
    render();
  }

  function onStart(targetId){
    if (state.action?.type === cfg.actionType){
      if (isAfkSkillActive(cfg.skillId) && cfg.getSelectedId() === targetId){
        return;
      }
    }
    startAfk(state, { skill: cfg.skillId, targetId });
    render();
  }

  function onStop(){
    stopAfk(state, 'manual');
    render();
  }

  window.addEventListener('afk:start', (e)=>{
    if (e?.detail?.skill !== cfg.skillId) return;
    const list = currentList();
    const t = list.find(x => x.id === e.detail.targetId);
    const name = t?.name || e.detail.targetId;
    pushLog(`Started ${cfg.autoLabel.toLowerCase()} at ${name}.`.replace('at Auto-', 'Auto-'), cfg.logChannel);
    saveNow();
    render();
  });

  window.addEventListener('afk:switch', (e)=>{
    if (e?.detail?.name !== cfg.skillId) return;
    const nextId = e.detail.nextTargetId ?? cfg.getSelectedId();
    const list = currentList();
    const t = list.find(x => x.id === nextId);
    const name = t?.name || nextId;
    pushLog(`Switched to ${name}.`, cfg.logChannel);
    saveNow();
    render();
  });

  window.addEventListener('afk:cycle', (e)=>{
    const d = e?.detail; if (!d || d.skill !== cfg.skillId) return;
    const itemName = ITEMS[d.dropId]?.name || d.dropName || d.dropId;
    const targetName = d.targetName || d.targetId;
    const essTxt = d.essence ? ` · +1 ${ITEMS[cfg.essenceId]?.name || 'Essence'}` : '';
    const extraTxt = d.doubleCount && d.doubleCount > 0 ? ` · +${d.doubleCount} extra ${itemName}` : '';
    const xp = d.xp|0;
    pushLog(`${cfg.verbPast} ${targetName} → +1 ${itemName}${extraTxt}${essTxt} · +${xp} ${cfg.skillId[0].toUpperCase()+cfg.skillId.slice(1)} xp`, cfg.logChannel);
    saveNow();
    render();
    renderInventory();
    renderEnchanting();
    renderSkills();
  });

  window.addEventListener('afk:end', (e)=>{
    if (e?.detail?.skill !== cfg.skillId) return;
    pushLog(`Stopped ${cfg.autoLabel.toLowerCase()}`, cfg.logChannel);
    saveNow();
    render();
  });

  (function raf(){
    updateBar();
    requestAnimationFrame(raf);
  })();

  return { render, onSelectTarget, onStart, onStop };
}
