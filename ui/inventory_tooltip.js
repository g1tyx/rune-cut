import { ITEMS } from '../data/items.js';
import { showTip, hideTip } from './tooltip.js';
import { equipReqLabel } from '../systems/equipment.js';
import { tomeDurationMsFor, tomeRemainingMs } from '../systems/tomes.js';
import { baseIdStrict, healAmountFor, enchantFromId, sellPrice } from '../systems/inventory_helpers.js';

function tomeTooltipLines(state, base){
  const def = ITEMS[base] || {};
  const lines = [];
  if (def?.tome){
    const ms = tomeDurationMsFor(state, base);
    const secs = Math.round(ms/1000);
    lines.push(`Runs for: ${secs}s (scales with Enchanting)`);
    const rem = tomeRemainingMs(state);
    if (rem > 0){ lines.push(`Active tome remaining: ${Math.ceil(rem/1000)}s`); }
  }
  return lines;
}

export function attachInventoryTooltip(elInv, state){
  elInv?.addEventListener('mousemove', (e)=>{
    const tile = e.target.closest('.inv-slot');
    if (!tile){ hideTip(); return; }
    const id = tile.getAttribute('data-id');
    if (!id){ hideTip(); return; }
    const base = baseIdStrict(id);
    const def = ITEMS[base] || {};
    const isEquip = def.type === 'equipment';
    const isFood  = def.type === 'food' || healAmountFor(id) > 0;
    const isTool  = isEquip && (def.slot === 'axe' || def.slot === 'pick' || def.speed);
    const qStr = String(id).split('@')[1];
    const q = (isEquip && Number.isFinite(parseInt(qStr,10))) ? Math.max(1, Math.min(100, parseInt(qStr,10))) : null;
    const mult = q ? q/100 : 1;
    const title = `${def.name || base}`;
    const lines = [];
    if (isEquip){
      if (q != null) lines.push(`Quality: ${q}%`);
      const stats = [];
      if (def.atk) stats.push(`Atk: ${Math.round(def.atk*mult)}`);
      if (def.str) stats.push(`Str: ${Math.round(def.str*mult)}`);
      if (def.def) stats.push(`Def: ${Math.round(def.def*mult)}`);
      if (def.hp)  stats.push(`HP: ${Math.round(def.hp*mult)}`);
      if (stats.length) lines.push(stats.join(' · '));
      if (isTool && def.speed) lines.push(`Speed: ${Number(def.speed).toFixed(2)}×`);
      if (def.slot === 'tome'){ lines.push(...tomeTooltipLines(state, base)); }
      const req = equipReqLabel(base); if (req) lines.push(req);
      if (def.slot === 'ring' || def.slot === 'amulet'){
        // Get all enchants from the item
        const enchStr = String(id);
        const enchMatches = [...enchStr.matchAll(/#e:([a-zA-Z_]+):(\d+)/g)];
        if (enchMatches.length > 0){
          for (const m of enchMatches){
            const stat = m[1];
            const value = parseInt(m[2], 10);
            const pretty = { hpMax:'HP', manaMax:'Mana', defense:'Defense', attack:'Attack', strength:'Strength' }[stat] || stat;
            lines.push(`+${value} ${pretty}`);
          }
        }
      }
      const mSwift = String(id).match(/#swift:([0-9.]+)/);
      if (mSwift){
        const s = parseFloat(mSwift[1])||0;
        lines.push(`+${s.toFixed(2)} speed`);
      }
    }
    if (isFood){
      const heal = healAmountFor(id);
      if (heal > 0) lines.push(`Heals: ${heal} HP`);
    }
    if (!isEquip && !isFood){
      if (Number(def.mana) > 0) lines.push(`Restores: ${def.mana|0} Mana`);
      if (Number(def.accBonus) > 0){
        const secs = Math.max(1, (def.durationSec|0) || 300);
        const pct = Math.round((Number(def.accBonus)||0)*100);
        lines.push(`+${pct}% hit chance for ${secs}s`);
      }
      if (Number(def.dmgReduce) > 0){
        const secs = Math.max(1, (def.durationSec|0) || 300);
        const flat = Number(def.dmgReduce)|0;
        lines.push(`-${flat} enemy damage for ${secs}s`);
      }
    }
    const each = sellPrice(id);
    const qty = state.inventory?.[id] || 0;
    if (qty > 0){
      const eaStr = each ? ` · ${each}g` : '';
      const total = each ? ` · Total: ${each*qty}g` : '';
      lines.push(`Qty: ${qty}${eaStr}${qty>1 ? total : ''}`);
    }
    try {
      const t = def && def.tip;
      if (typeof t === 'string' && t.trim()) {
        lines.push(t.trim());
      } else if (Array.isArray(t)) {
        for (const s of t) if (typeof s === 'string' && s.trim()) lines.push(s.trim());
      } else if (typeof t === 'function') {
        const out = t({ state, id, base, qty });
        if (typeof out === 'string' && out.trim()) lines.push(out.trim());
        else if (Array.isArray(out)) for (const s of out) if (typeof s === 'string' && s.trim()) lines.push(s.trim());
      }
    } catch {}
    showTip(e, title, lines.join('\n'));
  });
  elInv?.addEventListener('mouseout', (e)=>{
    const tile = e.currentTarget;
    const to = e.relatedTarget;
    if (!to || !tile.contains(to)) hideTip();
  });
  elInv?.addEventListener('mouseleave', hideTip);
}