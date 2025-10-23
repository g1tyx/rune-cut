// /systems/tools.js
import { ITEMS } from '../data/items.js';
import { getQty, removeItem } from './inventory.js';

function baseId(id){ return String(id||'').split('@')[0].split('#')[0]; }
function skillFromType(t){ const m = String(t||'').match(/^(\w+)_tool$/); return m ? m[1] : null; }

export function availableTools(state, skill){
  const out = [];
  const inv = state.inventory || {};
  for (const k of Object.keys(inv)){
    const b = baseId(k);
    const def = ITEMS[b]; if (!def) continue;
    if (skillFromType(def.type) === skill && getQty(state, k) > 0) out.push(b);
  }
  return out;
}

export function equipTool(state, itemId){
  const b = baseId(itemId);
  const def = ITEMS[b] || {};
  const skill = skillFromType(def.type);
  if (!skill) return { ok:false, reason:'bad-type' };
  if (getQty(state, itemId) <= 0) return { ok:false, reason:'no-inventory' };

  const durMs = Math.max(1000, Math.floor((def.duration||0)*1000));
  const chance = Math.max(0, Math.min(1, Number(def.dropTwoChance)||0));
  const smeltBonus = Math.max(0, Math.min(1, Number(def.smeltSpeedBonus)||0));

  state.toolsActive = state.toolsActive || {};
  const cur = state.toolsActive[skill] || null;
  const now = Date.now();

  if (cur && cur.id === b && cur.until > now){
    state.toolsActive[skill] = { id:b, chance, smeltBonus, until: cur.until + durMs, started: cur.started };
  } else {
    state.toolsActive[skill] = { id:b, chance, smeltBonus, until: now + durMs, started: now };
  }

  removeItem(state, itemId, 1);
  try { window.dispatchEvent(new CustomEvent('tools:change', { detail:{ skill } })); } catch {}
  return { ok:true, skill };
}

export function toolEffectFor(state, skill){
  const t = state?.toolsActive?.[skill];
  if (!t) return null;
  if ((t.until||0) <= Date.now()) return null;
  return t;
}

export function toolRemainingMs(state, skill){
  const t = toolEffectFor(state, skill);
  return t ? Math.max(0, t.until - Date.now()) : 0;
}
