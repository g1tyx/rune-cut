// /systems/consumables.js
import { hpMaxFor } from './combat.js';
import { applyEffect } from './effects.js';
import { removeItem } from './inventory.js';
import { drinkPotion } from './mana.js';
import { ITEMS } from '../data/items.js';

const baseIdStrict = s => String(s||'').split('@')[0].split('#')[0];

export function usePotion(state, idOrBase, { onHeal, onLog } = {}){
  const id   = String(idOrBase);
  const base = baseIdStrict(id);
  const def  = ITEMS[base] || {};
  const have = (state.inventory?.[id] || 0)|0;

  if (id.includes('@') && have <= 0) return { ok:false, reason:'none' };

  // Mana potions
  if (Number(def.mana) > 0){
    const res = drinkPotion(state, base);
    if (!res || !res.ok) return { ok:false, reason:'mana_failed' };
    onLog?.(`You drink ${def.name || base}.`);
    try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
    try { window.dispatchEvent(new Event('mana:change')); } catch {}
    return { ok:true, kind:'mana' };
  }

  // Accuracy buff
  if (Number(def.accBonus) > 0){
    const durMs = Math.max(1000, (def.durationSec|0)*1000 || 300000);
    applyEffect(state, { id: base, name: def.name || 'Accuracy', durationMs: durMs, data:{ accBonus: Number(def.accBonus)||0 } });
    removeItem(state, id, 1);
    onLog?.(`You drink ${def.name || base}. Accuracy rises.`);
    try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
    try { window.dispatchEvent(new Event('effects:tick')); } catch {}
    return { ok:true, kind:'acc' };
  }

  // Defense buff
  if (Number(def.dmgReduce) > 0){
    const durMs = Math.max(1000, (def.durationSec|0)*1000 || 300000);
    applyEffect(state, { id: base, name: def.name || 'Defense', durationMs: durMs, data:{ dmgReduce: Number(def.dmgReduce)|0 } });
    removeItem(state, id, 1);
    onLog?.(`You drink ${def.name || base}. You feel tougher.`);
    try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
    try { window.dispatchEvent(new Event('effects:tick')); } catch {}
    return { ok:true, kind:'def' };
  }

  // HP heal
  if (Number.isFinite(def.heal) && def.heal > 0){
    const max = hpMaxFor(state);
    const cur = state.hpCurrent == null ? max : state.hpCurrent|0;
    const healed = Math.min(def.heal|0, Math.max(0, max - cur));
    if (healed > 0){
      state.hpCurrent = Math.min(max, cur + healed);
      onHeal?.(healed);
    }
    removeItem(state, id, 1);
    onLog?.(`You drink ${def.name || base}${healed ? ` and heal ${healed} HP` : ''}.`);
    try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
    try { window.dispatchEvent(new Event('hp:change')); } catch {}
    return { ok:true, kind:'heal', healed };
  }

  return { ok:false, reason:'unsupported' };
}
