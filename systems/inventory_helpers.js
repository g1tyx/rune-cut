import { state } from './state.js';
import { ITEMS } from '../data/items.js';

export const REORDER_MIME = 'application/x-runecut-reorder';

export const baseId = id => String(id).split('@')[0];
export const baseIdStrict = s => String(s||'').split('@')[0].split('#')[0];

export function metalFromItemId(id=''){
  const s = baseIdStrict(id);
  let m = s.match(/^bar_(\w+)/)?.[1] || s.match(/^ore_(\w+)/)?.[1];
  if (m) return m;
  m = s.match(/^(axe|pick)_(\w+)/)?.[2];
  if (m) return m;
  m = s.split('_')[0];
  if (['copper','bronze','iron','steel','mith','adamant','rune','blacksteel','starsteel','draconyx'].includes(m)) return m;
  return null;
}
export function tintClassForItem(id=''){
  const base = baseIdStrict(id);
  const def = ITEMS[base] || {};
  if (def.tint) return ` tint-${def.tint}`;
  const s = base;
  let m = s.match(/^bar_(\w+)/)?.[1] || s.match(/^ore_(\w+)/)?.[1];
  if (m) return ` tint-${m}`;
  m = s.match(/^(axe|pick)_(\w+)/)?.[2];
  if (m) return ` tint-${m}`;
  m = s.split('_')[0];
  if (['copper','bronze','iron','steel','blacksteel','starsteel','draconyx'].includes(m)) return ` tint-${m}`;
  return '';
}

export function qualityPct(id){
  const q = parseInt(String(id).split('@')[1], 10);
  return Number.isFinite(q) ? Math.max(1, Math.min(100, q)) : 100;
}
export function healAmountFor(id){
  const base = baseIdStrict(id);
  const def = ITEMS[base] || {};
  return Number.isFinite(def.heal) ? def.heal : 0;
}

export function enchantFromId(id=''){
  const m = String(id).match(/#e:([a-zA-Z_]+):(\d+)/);
  if (!m) return null;
  const stat = m[1], add = Number(m[2])||0;
  const table = { hpMax:[12,20,30,45,60], manaMax:[10,15,25,38,50], defense:[6,10,15,27,30], attack:[4,6,10,15,20], strength:[4,6,10,15,20] };
  const ix = (table[stat]||[]).indexOf(add);
  const keys = ['minor','standard','greater','grand','mythic'];
  const tier = ix>=0 ? keys[ix] : null;
  return { stat, add, tier };
}

export function sellPrice(id){
  const base = baseIdStrict(id);
  const it = ITEMS[base] || {};
  const qMul = qualityPct(id) / 100;
  let price = it.sell || 0;
  if (it.type === 'equipment'){
    const statScore = (it.atk||0) + (it.str||0) + (it.def||0) + 0.5*(it.hp||0);
    const toolBonus = it.speed ? 8*it.speed : 0;
    price = Math.max(price, Math.round(2*statScore + toolBonus));
    price = Math.round(Math.max(1, price) * qMul);
  } else {
    price = Math.max(1, Math.round(price || 1));
  }
  const m = String(id).match(/#e:([a-zA-Z_]+):(\d+)/);
  if (m){
    const stat = m[1], add = Number(m[2])||0;
    const tiers = { hpMax:[12,20,30,45,60], manaMax:[10,15,25,38,50], defense:[6,10,15,27,30], attack:[4,6,10,15,20], strength:[4,6,10,15,20] };
    const ix = (tiers[stat]||[]).indexOf(add);
    const pct = [15,25,50,100,200][ix] || 0;
    price = Math.round(price * (1 + pct/100));
  }
  return price;
}

export function getInvOrder(){
  state.ui = state.ui || {};
  if (!Array.isArray(state.ui.invOrder)) state.ui.invOrder = [];
  return state.ui.invOrder;
}
export function setInvOrder(arr){
  state.ui = state.ui || {};
  state.ui.invOrder = Array.isArray(arr) ? arr.slice(0, 2000) : [];
}
export function syncInvOrderWithEntries(entries){
  const presentIds = entries.map(([id]) => id);
  const cur = getInvOrder();
  const next = cur.filter(id => presentIds.includes(id));
  for (const id of presentIds){ if (!next.includes(id)) next.push(id); }
  setInvOrder(next);
}
export function sortEntriesByOrder(entries){
  const order = getInvOrder();
  const pos = new Map(order.map((id, i)=>[id, i]));
  return entries.slice().sort((a, b)=>{
    const ai = pos.has(a[0]) ? pos.get(a[0]) : 9e9;
    const bi = pos.has(b[0]) ? pos.get(b[0]) : 9e9;
    return ai - bi;
  });
}

export const USE_ORDER = ['tool','gear','tome','potion','food','essence','wood','plank','orebar','material','resource','misc'];
export const useRank = u => { const i = USE_ORDER.indexOf(u); return i === -1 ? USE_ORDER.length : i; };
export const invUseOf = (base) => {
  const it = ITEMS[base] || {};
  if (it.invUse) return it.invUse;
  if (it.slot === 'tome') return 'tome';
  if (it.type === 'food') return 'food';
  if (it.type === 'potion' || it.mana || it.accBonus || it.dmgReduce) return 'potion';
  if (it.type === 'equipment') {
    if (it.slot === 'axe' || it.slot === 'pick' || it.slot === 'fishing' || it.speed) return 'tool';
    return 'gear';
  }
  const id = String(base);
  if (/_essence$/.test(id)) return 'essence';
  if (id.startsWith('log_') || id.startsWith('plank_')) return 'wood';
  if (id.startsWith('ore_') || id.startsWith('bar_')) return 'orebar';
  if (it.type === 'material') return 'material';
  if (it.type === 'resource') return 'resource';
  return 'misc';
};
export function itemType(id){ const base = baseIdStrict(id); const it = ITEMS[base]||{}; return it.type || 'misc'; }
