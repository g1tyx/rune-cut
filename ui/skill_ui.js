// /ui/skill_ui.js
import { state, saveState } from '../systems/state.js';
import { on } from '../utils/dom.js';
import { pushLog } from './logs.js';
import { renderInventory } from './inventory.js';
import { renderSkills } from './skills.js';
import { renderEnchanting } from './enchanting.js';
import { ITEMS } from '../data/items.js';
import { isAfkSkillActive, startAfk, switchAfkTarget, stopAfk } from '../systems/afk.js';

/**
 * Create a standardized gathering-skill UI controller.
 *
 * @param {Object} cfg
 * @param {string}   cfg.skillId             e.g. 'forestry' | 'fishing' | 'mining'
 * @param {string}   cfg.actionType          e.g. 'chop' | 'fish' | 'mine' (matches state.action.type)
 * @param {function} cfg.getList(state):[]   returns array of targets with {id, name, level, baseTime?}
 * @param {function} cfg.canUse(state, tOrId):boolean  level gate (ignore busy internally)
 * @param {function} cfg.getSelectedId():string        read selected id from global state
 * @param {function} cfg.setSelectedId(id):void        write selected id to global state
 * @param {string}   cfg.selectSelector       CSS selector for <select> (e.g. '#treeSelect')
 * @param {string}   cfg.startBtnSelector     CSS selector for Start button
 * @param {string}   cfg.stopBtnSelector      CSS selector for Stop button
 * @param {string}   cfg.barSelector          CSS selector for progress .bar
 * @param {string}   cfg.labelSelector        CSS selector for progress label
 * @param {string}   cfg.logChannel           'wc' | 'fishing' | 'mining' (for pushLog)
 * @param {string}   cfg.autoLabel            e.g. 'Auto-chopping…'
 * @param {string}   cfg.verbPast             e.g. 'Chopped' | 'Caught' | 'Mined' (for cycle logs)
 * @param {string}   cfg.essenceId            e.g. 'forest_essence' | 'sea_essence' | 'earth_essence'
 */
export function initGatheringPanel(cfg){
  const selEl = document.querySelector(cfg.selectSelector);
  const barEl = document.querySelector(cfg.barSelector);
  const lblEl = document.querySelector(cfg.labelSelector);

  /* ---------- stable-select freeze logic ---------- */
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

  /* ---------- rendering ---------- */
  function currentList(){ return cfg.getList(state) || []; }

  function ensureSelectedExists(list){
    const sel = cfg.getSelectedId();
    if (!list.some(t => t.id === sel)){
      const fallback = list[0]?.id || '';
      if (fallback !== sel){
        cfg.setSelectedId(fallback);
        saveState(state);
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
    // Update disabled flags & labels without rebuilding
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
  }

  function render(){
    if (!SELECT_FROZEN) rebuildSelect(); else updateSelectNonDestructive();
    // Enable/disable start button cosmetically based on capability (ignore busy)
    const startBtn = document.querySelector(cfg.startBtnSelector);
    if (startBtn){
      const selId = cfg.getSelectedId();
      startBtn.disabled = !cfg.canUse({ ...state, action:null }, selId);
    }
    updateBar();
  }

  /* ---------- interactions ---------- */
  // Dropdown change
  if (selEl){
    on(document, 'change', cfg.selectSelector, ()=>{
      const id = selEl.value;
      onSelectTarget(id);
    });
  }

  // Start
  on(document, 'click', cfg.startBtnSelector, ()=>{
    const id = cfg.getSelectedId();
    onStart(id);
  });

  // Stop
  on(document, 'click', cfg.stopBtnSelector, ()=>{
    onStop();
  });

  function onSelectTarget(targetId){
    const list = currentList();
    const t = list.find(x => x.id === targetId);
    if (!t) return;
    if (!cfg.canUse({ ...state, action:null }, t)) return; // level guardrail

    cfg.setSelectedId(targetId);
    saveState(state);

    if (isAfkSkillActive(cfg.skillId)) {
      switchAfkTarget(state, { skill: cfg.skillId, targetId });
    }
    render();
  }

  function onStart(targetId){
    // Avoid “half bar”: ignore if same target is already active for this action type
    if (state.action?.type === cfg.actionType){
      // If it's the same selected target, no-op. Else it's a switch via startAfk.
      const same = true; // action label already bound to target; we treat start as switch anyway
      if (same && isAfkSkillActive(cfg.skillId) && cfg.getSelectedId() === targetId){
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

  /* ---------- logging ---------- */
  window.addEventListener('afk:start', (e)=>{
    if (e?.detail?.skill !== cfg.skillId) return;
    const list = currentList();
    const t = list.find(x => x.id === e.detail.targetId);
    const name = t?.name || e.detail.targetId;
    pushLog(`Started ${cfg.autoLabel.toLowerCase()} at ${name}.`.replace('at Auto-', 'Auto-'), cfg.logChannel);
    saveState(state);
    render();
  });

  window.addEventListener('afk:switch', (e)=>{
    if (e?.detail?.name !== cfg.skillId) return;
    const nextId = e.detail.nextTargetId ?? cfg.getSelectedId();
    const list = currentList();
    const t = list.find(x => x.id === nextId);
    const name = t?.name || nextId;
    pushLog(`Switched to ${name}.`, cfg.logChannel);
    saveState(state);
    render();
  });

  window.addEventListener('afk:cycle', (e)=>{
    const d = e?.detail; if (!d || d.skill !== cfg.skillId) return;
    const itemName = ITEMS[d.dropId]?.name || d.dropName || d.dropId;
    const targetName = d.targetName || d.targetId;
    const essTxt = d.essence ? ` · +1 ${ITEMS[cfg.essenceId]?.name || 'Essence'}` : '';
    const xp = d.xp|0;

    pushLog(`${cfg.verbPast} ${targetName} → +1 ${itemName}${essTxt} · +${xp} ${cfg.skillId[0].toUpperCase()+cfg.skillId.slice(1)} xp`, cfg.logChannel);
    saveState(state);
    render();
    renderInventory();
    renderEnchanting();
    renderSkills();
  });

  window.addEventListener('afk:end', (e)=>{
    if (e?.detail?.skill !== cfg.skillId) return;
    pushLog(`Stopped ${cfg.autoLabel.toLowerCase()}`, cfg.logChannel);
    saveState(state);
    render();
  });

  /* ---------- public ---------- */
  // Smooth HUD loop
  (function raf(){
    updateBar();
    requestAnimationFrame(raf);
  })();

  return { render, onSelectTarget, onStart, onStop };
}
