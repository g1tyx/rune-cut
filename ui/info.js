// /ui/info.js
import { state } from '../systems/state.js';
import { levelFromXp, progressFor, XP_TABLE } from '../systems/xp.js';
import { on } from '../utils/dom.js';
import { SKILL_INFO } from '../data/info.js';

/* =========================
   CSS & DOM SCAFFOLD
========================= */
function ensureInfoCss() {
  if (document.getElementById('info-css')) return;
  const css = document.createElement('style');
  css.id = 'info-css';
  css.textContent = `
    .info-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:grid;place-items:center;z-index:1000;}
    .info-overlay.hidden{display:none;}
    .info-box{position:relative;width:min(980px,92vw);max-height:86vh;overflow:auto;background:#fff;color:#0f172a;border-radius:14px;border:1px solid rgba(0,0,0,.12);box-shadow:0 16px 48px rgba(2,6,23,.35);padding:14px 16px 16px;}
    .info-box h2{margin:0 0 10px;font-weight:800;color:#0b1220;}
    .info-box .close-btn{position:absolute;right:18px;top:12px;border:0;background:#0f172a;color:#e2e8f0;width:28px;height:28px;border-radius:8px;cursor:pointer;}
    /* Two-column layout */
    .info-layout{display:grid;grid-template-columns:220px 1fr;gap:12px;align-items:start;}
    .info-layout .tabs{display:flex;flex-direction:column;gap:6px;position:sticky;top:8px;align-self:start;}
    .info-layout .tabs .tab{padding:8px 10px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;cursor:pointer;font-weight:700;text-align:left;}
    .info-layout .tabs .tab.active{background:#1e293b;color:#e2e8f0;border-color:#0f172a;}
    .info-panel{display:grid;gap:12px;}
    .info-card{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff;box-shadow:0 6px 14px rgba(0,0,0,.05);}
    .info-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}
    #infoOverlay .info-box .pill{background:#f1f5f9;border:1px solid #e2e8f0;padding:6px 10px;border-radius:999px;font-weight:700;}
    .info-muted{color:#475569;font-size:12px;}
    .info-title{font-weight:800;color:#0f172a;margin-bottom:6px;}
    .progress.info{position:relative;height:12px;border-radius:999px;overflow:hidden;background:#e2e8f0;border:1px solid #cbd5e1;}
    .progress.info .bar{height:100%;background:#16a34a;width:0%;transition:width .25s ease;}
    .progress.info .label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#0f172a;mix-blend-mode:multiply;}
    .small{font-size:12px;}
    .muted{color:#64748b;}
    .kv{display:grid;grid-template-columns:140px 1fr;gap:6px;align-items:center;}
    .kv .k{color:#475569;font-size:12px;}
    .kv .v{font-weight:700;}
    .bullets{margin:6px 0 0 14px;padding:0;}
    .bullets li{margin:3px 0;}
    @media (max-width: 720px){
      .info-layout{grid-template-columns:1fr;}
      .info-layout .tabs{flex-direction:row;flex-wrap:wrap;position:static;}
      .info-layout .tabs .tab{text-align:center;}
    }
  `;
  document.head.appendChild(css);
}

function ensureOverlay() {
  if (document.getElementById('infoOverlay')) return;
  const el = document.createElement('section');
  el.id = 'infoOverlay';
  el.className = 'info-overlay hidden';
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <div class="info-box" id="infoBox">
      <button id="infoBackBtn" class="close-btn" aria-label="Close info overlay">×</button>
      <h2>📘 Info</h2>
      <div id="infoTabs" class="tabs"></div>
      <div id="infoPanel" class="info-panel"></div>
    </div>
  `;
  document.body.appendChild(el);
}

function ensureInfoLayout() {
  const box = document.getElementById('infoBox');
  const tabs = document.getElementById('infoTabs');
  const panel = document.getElementById('infoPanel');
  if (!box || !tabs || !panel) return;
  if (tabs.parentElement?.classList.contains('info-layout')) return;

  const layout = document.createElement('div');
  layout.className = 'info-layout';
  box.insertBefore(layout, tabs);
  layout.appendChild(tabs);
  layout.appendChild(panel);
}

function ensureHeaderButton() {
  const header = document.querySelector('header .row') || document.querySelector('header');
  if (!header) return;

  if (!document.getElementById('tabInfo')) {
    const btn = document.createElement('button');
    btn.id = 'tabInfo';
    btn.type = 'button';
    btn.textContent = 'Info';
    btn.className = 'btn';
    btn.style.marginLeft = '8px';
    header.insertBefore(btn, header.firstChild);
  }
  if (!document.getElementById('supportLink')) {
    const a = document.createElement('a');
    a.id = 'supportLink';
    a.href = 'https://www.patreon.com/cw/runecut/shop';
    a.target = '_blank';
    a.rel = 'noopener noreferrer nofollow';
    a.textContent = '❤ Buy Dev Coffee';
    a.className = 'btn';
    a.style.marginLeft = '6px';
    a.style.background = '#341214ff';
    a.style.color = '#ebe2e2ff';
    a.style.border = '1px solid rgba(0,0,0,.08)';
    a.style.boxShadow = '0 6px 14px rgba(255,66,77,.25)';
    header.insertBefore(a, header.firstChild?.nextSibling || null);
  }
}

/* =========================
   DATA & HELPERS
========================= */
const SKILLS = [
  { key: 'general',   name: 'General',    icon: ''                 },
  { key: 'wc',        name: 'Forestry',   icon: '🪓', xpKey: 'wcXp',          toolSlot: 'axe' },
  { key: 'craft',     name: 'Crafting',   icon: '🪚', xpKey: 'craftXp'                      },
  { key: 'min',       name: 'Mining',     icon: '⛏️', xpKey: 'minXp',         toolSlot: 'pick' },
  { key: 'smith',     name: 'Smithing',   icon: '⚒️', xpKey: 'smithXp'                     },
  { key: 'fish',      name: 'Fishing',    icon: '🎣', xpKey: 'fishXp',        toolSlot: 'fishing' },
  { key: 'cook',      name: 'Cooking',    icon: '🍳', xpKey: 'cookXp'                      },
  { key: 'alchemy',   name: 'Alchemy',    icon: '🧪', xpKey: 'alchemyXp'                   },
  { key: 'construct', name: 'Construct',  icon: '🏕️', xpKey: 'constructionXp'             },
  { key: 'enchant',   name: 'Enchanting', icon: '🪄', xpKey: 'enchantXp'                   },
  { key: 'combat',    name: 'Combat',     icon: '⚔️'        },
  { key: 'royal',     name: 'Royal Service',    icon: '👑', xpKey: 'royalXp'                     },
];

function xpBlock(xpVal=0) {
  const lvl  = levelFromXp(xpVal|0, XP_TABLE);
  const prog = progressFor(xpVal|0);
  const pct  = Math.max(0, Math.min(100, prog.pct|0));
  return {
    lvl,
    pct,
    label: `XP ${prog.into}/${prog.span} (need ${prog.need} to Lv ${prog.lvl+1})`
  };
}

function tipsForSkill(key, meta) {
  const fromData = (SKILL_INFO?.[key]?.tips ?? [])
    .filter(s => typeof s === 'string' && s.trim())
    .map(s => s.trim());

  if (fromData.length) return fromData;

  // fallback tips if none provided in SKILL_INFO
  const generic = [
    'Higher level increases efficiency and unlocks more content.',
    'Hover items in Inventory to see sell price, stats, and notes.'
  ];
  const toolLine = meta?.toolSlot ? 'Better tools and Swiftness increase action speed.' : null;
  return toolLine ? [toolLine, ...generic] : generic;
}

/* =========================
   RENDER
========================= */
function renderTabs(activeKey) {
  const tabs = document.getElementById('infoTabs');
  if (!tabs) return;

  tabs.innerHTML = SKILLS.map(s => `
    <button class="tab ${s.key===activeKey ? 'active':''}" data-skill="${s.key}">
      ${s.icon ? `${s.icon} ` : ''}${s.name}
    </button>
  `).join('');
}

function renderPanel(key) {
  const panel = document.getElementById('infoPanel');
  if (!panel) return;

  const meta = SKILLS.find(s => s.key === key) || SKILLS[0];

  // General tab: no XP bar, just tips/info
  if (meta.key === 'general') {
    const lines = tipsForSkill('general', meta);
    panel.innerHTML = `
      <div class="info-card">
        <div class="info-title">Welcome to RuneCut. The Incremental Skilling RPG</div>
        <ul class="bullets">${lines.map(li=>`<li>${li}</li>`).join('')}</ul>
      </div>
    `;
    return;
  }

  const xpVal = Number(state[meta.xpKey] || 0);
  const xpUI  = xpBlock(xpVal);
  const tips  = tipsForSkill(key, meta);

  const coreHtml = `
    <div class="info-card">
      <div class="info-title">${meta.icon ? meta.icon+' ' : ''}${meta.name}</div>
      <div class="info-row" style="gap:12px;margin-bottom:8px;">
        <span class="pill">Level <b>${xpUI.lvl}</b></span>
        <span class="pill">XP <b>${xpVal|0}</b></span>
      </div>
      <div class="progress info" title="${xpUI.label}">
        <div class="bar" style="width:${xpUI.pct}%"></div>
        <div class="label">${xpUI.pct}%</div>
      </div>
      <div class="info-muted small" style="margin-top:6px;">${xpUI.label}</div>
    </div>
  `;

  const tipsHtml = `
    <div class="info-card">
      <div class="info-title">Tips</div>
      <ul class="bullets">${tips.map(li=>`<li>${li}</li>`).join('')}</ul>
    </div>
  `;

  panel.innerHTML = coreHtml + tipsHtml;
}

/* =========================
   OPEN/CLOSE
========================= */
export function showInfo() {
  document.getElementById('infoOverlay')?.classList.remove('hidden');
}
export function leaveInfo() {
  document.getElementById('infoOverlay')?.classList.add('hidden');
}

/* =========================
   INIT
========================= */
let inited = false;
export function initInfo() {
  if (inited) return;
  inited = true;

  ensureInfoCss();
  ensureOverlay();
  ensureInfoLayout();
  ensureHeaderButton();

  // Default active tab remembered on state.ui
  const defaultKey = state.ui?.infoActiveKey || SKILLS[0].key;
  renderTabs(defaultKey);
  renderPanel(defaultKey);

  // Header button to open
  document.getElementById('tabInfo')?.addEventListener('click', (e)=>{
    e.preventDefault();
    ensureInfoLayout();
    const k = state.ui?.infoActiveKey || SKILLS[0].key;
    renderTabs(k);
    renderPanel(k);
    showInfo();
  });

  // Close handlers
  document.getElementById('infoBackBtn')?.addEventListener('click', leaveInfo);
  on(document, 'keydown', null, (e)=>{
    if (e.key === 'Escape') leaveInfo();
  });

  // Tab clicks
  on(document, 'click', '#infoTabs .tab', (_e, btn)=>{
    const key = btn.getAttribute('data-skill');
    if (!key) return;
    state.ui = state.ui || {};
    state.ui.infoActiveKey = key;
    renderTabs(key);
    renderPanel(key);
  });
}

/* Auto-init when module loads (to wire header button quickly) */
initInfo();
