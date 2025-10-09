// /ui/skills.js
import { state } from '../systems/state.js';
import { XP_TABLE, levelFromXp } from '../systems/xp.js';
import { showTip, hideTip } from './tooltip.js';

const SK = [
  { key:'wc',      xp:'wcXp',      id:'#tile-wc',        label:'Woodcutting' },
  { key:'fish',    xp:'fishXp',    id:'#tile-fish',      label:'Fishing' },
  { key:'min',     xp:'minXp',     id:'#tile-min',       label:'Mining' },
  { key:'smith',   xp:'smithXp',   id:'#tile-smith',     label:'Smithing' },
  { key:'craft',   xp:'craftXp',   id:'#tile-craft',     label:'Crafting' },
  { key:'enchant', xp:'enchantXp', id:'#tile-enchant',   label:'Enchanting' },
  { key:'construction', xp:'constructionXp', id:'#tile-construct', label:'Construction' },
  { key:'alch',    xp:'alchXp',    id:'#tile-alch',      label:'Alchemy' },
  { key:'destruction',    xp:'destructionXp',    id:'#tile-destruction',      label:'Destruction' },
  { key:'cook',    xp:'cookXp',    id:'#tile-cook',      label:'Cooking' },
  { key:'atk',     xp:'atkXp',     id:'#tile-atk',       label:'Attack' },
  { key:'str',     xp:'strXp',     id:'#tile-str',       label:'Strength' },
  { key:'def',     xp:'defXp',     id:'#tile-def',       label:'Defense' },
  { key:'royal',   xp:'royalXp',   id:'#tile-royal',     label:'Royal Service' },
];

// Helpers around your XP table (assumed cumulative thresholds by level)
function levelFor(xp){ return levelFromXp(xp || 0, XP_TABLE); }
function thresholdsFor(level){
  if (Array.isArray(XP_TABLE)) {
    const base = Number.isFinite(XP_TABLE[level])   ? XP_TABLE[level]   : 0;
    const next = Number.isFinite(XP_TABLE[level+1]) ? XP_TABLE[level+1] : base + level*100;
    return { base, next };
  }
  // Fallback curve if XP_TABLE shape is unexpected
  const base = (level-1) * level * 50;
  const next = base + level*100;
  return { base, next };
}
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

// Format & paint Gold
function formatGold(n){ try { return (n|0).toLocaleString(); } catch { return String(n|0); } }
export function renderGold(){
  const el = document.getElementById('gold');
  if (!el) return;
  el.textContent = formatGold(state.gold|0);
}

// Update a single tile; returns the computed level so we can total them
function paintTile(s){
  const tile = document.querySelector(s.id);
  if (!tile) return 1;

  const xp  = state[s.xp] || 0;
  const lvl = levelFor(xp);
  const { base, next } = thresholdsFor(lvl);
  const gained = Math.max(0, xp - base);
  const need   = Math.max(1, next - base);
  const frac   = clamp01(gained / need);

  // 1) Level number
  const lvlNumEl =
    document.getElementById(`${s.key}LevelMini`) ||
    tile.querySelector('.tile-level b') ||
    tile.querySelector('b');
  if (lvlNumEl) lvlNumEl.textContent = String(lvl);

  // 2) Progress bar inside the tile
  const prog = tile.querySelector('.progress');
  if (prog) {
    const bar = prog.querySelector('.bar');
    const lab = prog.querySelector('.label');
    if (bar) bar.style.width = (frac * 100).toFixed(2) + '%';
    if (lab) lab.textContent = `${gained}/${need}`;
  }

  // 3) Title + data attribute
  tile.title = `${s.label} — Lv ${lvl} · ${xp} xp · ${gained}/${need} this level (${next - xp} to next)`;
  tile.dataset.level = String(lvl);

  return lvl;
}

// Public render: paints tiles, Total, and Gold
export function renderSkills(){
  let total = 0;
  for (const s of SK) total += paintTile(s);
  const totalEl = document.querySelector('#totalLevel');
  if (totalEl) totalEl.textContent = String(total);
  
  attachHoversOnce();
  renderGold();
}

// Richer hover tooltip with totals + progress (bound once)
function attachHoversOnce(){
  SK.forEach(s=>{
    const tile = document.querySelector(s.id);
    if (!tile || tile.__skillHoverBound) return;
    tile.__skillHoverBound = true;

    tile.addEventListener('mousemove', e=>{
      const xp  = state[s.xp] || 0;
      const lvl = levelFor(xp);
      const { base, next } = thresholdsFor(lvl);
      const gained = Math.max(0, xp - base);
      const need   = Math.max(1, next - base);
      const toNext = Math.max(0, next - xp);
      showTip(e, `${s.label} — Lv ${lvl}`, `${xp} total xp\n${gained}/${need} this level\n${toNext} xp to next`);
    });
    tile.addEventListener('mouseleave', hideTip);
  });
}

// Utility used by app.js (or anywhere) to detect XP changes cheaply
export function skillsXpSignature(){
  return (
    (state.wcXp|0)       + (state.fishXp|0)     + (state.minXp|0) +
    (state.smithXp|0)    + (state.craftXp|0)    + (state.enchantXp|0) +
    (state.constructionXp|0) + (state.alchXp|0) +
    (state.cookXp|0)     + (state.atkXp|0)      + (state.strXp|0) +
    (state.defXp|0)      + (state.royalXp|0) + (state.destructionXp|0)
  );
}

// live gold updates when other systems change it
window.addEventListener('gold:change', renderGold);
