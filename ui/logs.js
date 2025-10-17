// /ui/logs.js
import { state, saveNow } from '../systems/state.js';
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

const MAIN_STREAMS = ['skilling','wc','crafting','cooking','fishing','mining','smithing','enchanting','combat','economy'];

const PANEL_DEFS = {
  global: () => {
    const filter = state.logFilter || 'all';
    return (filter === 'all') ? MAIN_STREAMS : MAIN_STREAMS.filter(t => t === filter || t === 'economy');
  },
  wcLog:      ['wc','economy'],
  cookLog:    ['cooking','economy'],
  craftLog:   ['crafting','economy'],
  fishLog:    ['fishing','economy'],
  mineLog:    ['mining','economy'],
  smithLog:   ['smithing','economy'],
  enchantLog: ['enchanting','economy'],
  combatLog:  ['combat','economy'],
};

function escapeHtml(s=''){
  s = String(s);
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function logEvent(type, msg){
  const entry = { t: Date.now(), type, msg };
  (state.logs ||= []).push(entry);
  if (state.logs.length > 300) state.logs.splice(0, state.logs.length - 300);
}

function renderInto(targetEl, types){
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

function panelTypes(name){
  const def = PANEL_DEFS[name];
  return typeof def === 'function' ? def() : def;
}

function renderPanel(name){
  if (name === 'global') {
    renderInto(els.globalLog, panelTypes('global'));
  } else {
    renderInto(els[name], panelTypes(name));
  }
}

export function renderPanelLogs(){
  renderPanel('global');
  renderPanel('wcLog');
  renderPanel('cookLog');
  renderPanel('craftLog');
  renderPanel('fishLog');
  renderPanel('mineLog');
  renderPanel('smithLog');
  renderPanel('enchantLog');
  renderPanel('combatLog');
}

function renderAffectedPanels(type){
  renderPanel('global');
  for (const name of Object.keys(PANEL_DEFS)){
    if (name === 'global') continue;
    const types = panelTypes(name);
    if (types?.includes(type)) renderPanel(name);
  }
}

export function wireLogFilters(){
  els.logFilters?.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-log]'); if(!btn) return;
    document.querySelectorAll('#logFilters .chip')
      .forEach(b=>b.classList.toggle('active', b===btn));
    state.logFilter = btn.dataset.log || 'all';
    saveNow();
    renderPanel('global');
  });
}

export const pushLog        = (m, type='skilling') => { logEvent(type, m); renderAffectedPanels(type); };
export const pushWcLog      = (m)=>{ logEvent('wc',         m); renderAffectedPanels('wc'); };
export const pushCookLog    = (m)=>{ logEvent('cooking',    m); renderAffectedPanels('cooking'); };
export const pushCraftLog   = (m)=>{ logEvent('crafting',   m); renderAffectedPanels('crafting'); };
export const pushFishLog    = (m)=>{ logEvent('fishing',    m); renderAffectedPanels('fishing'); };
export const pushMineLog    = (m)=>{ logEvent('mining',     m); renderAffectedPanels('mining'); };
export const pushSmithLog   = (m)=>{ logEvent('smithing',   m); renderAffectedPanels('smithing'); };
export const pushEnchantLog = (m)=>{ logEvent('enchanting', m); renderAffectedPanels('enchanting'); };
export const pushCombatLog  = (m)=>{ logEvent('combat',     m); renderAffectedPanels('combat'); };
export const pushEconomyLog = (m)=>{ logEvent('economy',    m); renderAffectedPanels('economy'); };
