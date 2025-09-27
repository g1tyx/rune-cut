// /ui/logs.js
import { state, saveState } from '../systems/state.js';
import { qs } from '../utils/dom.js';

const els = {
  log:        qs('#log'),
  wcLog:      qs('#wcLog'),
  cookLog:    qs('#cookLog'),
  craftLog:   qs('#craftLog'),
  fishLog:    qs('#fishLog'),
  mineLog:    qs('#mineLog'),
  smithLog:   qs('#smithLog'),
  enchantLog: qs('#enchantLog'),
  combatLog:  qs('#combatLog'),
  globalLog:  qs('#globalLog'),
  logFilters: qs('#logFilters'),
};

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}

export function logEvent(type, msg){
  const entry = { t: Date.now(), type, msg };
  (state.logs ||= []).push(entry);
  // keep list from growing forever
  if (state.logs.length > 300) state.logs.splice(0, state.logs.length - 300);
}

function renderGlobalInto(targetEl, types){
  if (!targetEl) return;
  const items = (state.logs||[])
    .filter(en => !types || types.includes(en.type))
    .slice(-120);
  targetEl.innerHTML = items.map(en=>{
    const ts = new Date(en.t).toLocaleTimeString();
    return `<p><span class="muted">[${ts}]</span> ${escapeHtml(en.msg)}</p>`;
  }).join('');
  targetEl.scrollTop = targetEl.scrollHeight;
}

export function renderPanelLogs(){
  // Global log: include all main streams
  renderGlobalInto(els.log, [
    'skilling','wc','crafting','cooking','fishing','mining',
    'smithing','enchanting','combat','economy'
  ]);

  // Per-panel logs
  renderGlobalInto(els.wcLog,      ['wc','economy']);
  renderGlobalInto(els.cookLog,    ['cooking','economy']);
  renderGlobalInto(els.craftLog,   ['crafting','economy']);
  renderGlobalInto(els.fishLog,    ['fishing','economy']);
  renderGlobalInto(els.mineLog,    ['mining','economy']);
  renderGlobalInto(els.smithLog,   ['smithing','economy']);
  renderGlobalInto(els.enchantLog, ['enchanting','economy']);
  renderGlobalInto(els.combatLog,  ['combat','economy']);
}

export function wireLogFilters(){
  els.logFilters?.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-log]'); if(!btn) return;
    document.querySelectorAll('#logFilters .chip')
      .forEach(b=>b.classList.toggle('active', b===btn));
    state.logFilter = btn.dataset.log || 'all';
    saveState(state);
  });
}

/** One logger to rule them all.
 *  Usage examples:
 *    pushLog('Chopped Oak');                           // type 'skilling'
 *    pushLog('Cooked Shrimps → +8 Cooking xp','cooking');
 *    pushLog('Crafted Handle → +6 Crafting xp','crafting');
 */
export const pushLog        = (m, type='skilling') => { logEvent(type, m); renderPanelLogs(); };
export const pushMineLog   = (m)=>{ logEvent('mining',     m); renderPanelLogs(); };
export const pushSmithLog   = (m)=>{ logEvent('smithing',   m); renderPanelLogs(); };
export const pushCombatLog  = (m)=>{ logEvent('combat',     m); renderPanelLogs(); };
export const pushCraftLog   = (m)=>{ logEvent('crafting',   m); renderPanelLogs(); };
export const pushEnchantLog = (m)=>{ logEvent('enchanting', m); renderPanelLogs(); };
