import { DESTRUCTION_RECIPES } from "../data/destruction.js";
import { createProductionSkill } from './production_core.js';

import { ITEMS } from '../data/items.js';
import { removeItem } from './inventory.js';
import { ensureMana, spendMana } from './mana.js';
import { MONSTERS } from '../data/monsters.js';
import { elementalMultiplier } from './combat.js';
import { saveNow } from './state.js';

const mod = createProductionSkill({
  actionType: 'destruction',
  data: DESTRUCTION_RECIPES,
  labelVerb: 'Create',
  levelScale: 0.03,
  minActionMs: 200,
});

export const getDestructionRecipes = () => DESTRUCTION_RECIPES;
export const canMake      = (state, id, times = 1) => mod.canMake(state, id, times);
export const maxMakable   = (state, id)            => mod.maxCraftable(state, id);
export const startMake    = (state, id, onDone)    => mod.start(state, id, onDone);
export const finishMake   = (state, id)            => mod.finish(state, id);
export const finishOne    = (state)                => mod.finishOne(state);
export const stopMake     = (state)                => mod.stop(state);

const baseIdStrict = s => String(s||'').split('@')[0].split('#')[0];

function getSpellDef(idOrBase){
  const base = baseIdStrict(idOrBase);
  const def  = ITEMS[base] || null;
  return (def && def.type === 'spell') ? def : null;
}

/** Element comes ONLY from the item definition: item.element */
function elementOfSpell(def){
  const raw = (def?.element || '').toString().toLowerCase().trim();
  return (raw === 'fire' || raw === 'forest' || raw === 'water' || raw === 'ground') ? raw : null;
}

function grantDestructionXp(state, amt){
  const n = Math.max(0, amt|0);
  if (!n) return;
  state.destructionXp = (state.destructionXp|0) + n;
  try { window.dispatchEvent(new Event('skills:change')); } catch {}
}

/**
 * Cast a spell item defined in ITEMS. Requires an active fight.
 *
 * @param {Object} state
 * @param {string} idOrBase
 * @param {Object} [opts]
 * @param {boolean} [opts.consume=true]
 * @param {function(number,string)} [opts.onDamage]
 * @param {function(string)} [opts.onLog]
 * @returns {{ok:boolean, reason?:string, damage?:number, manaCost?:number, xpGained?:number, element?:string}}
 */
export function castSpell(state, idOrBase, { consume=true, onDamage, onLog } = {}){
  if (!state?.combat){
    onLog?.(`You can’t cast spells outside of combat.`);
    return { ok:false, reason:'no_fight' };
  }
  if (state?.petBattleMode){
    onLog?.(`Can’t cast spells in Pet-Only mode.`);
    return { ok:false, reason:'pet_only' };
  }

  const id   = String(idOrBase);
  const base = baseIdStrict(id);
  const def  = getSpellDef(base);
  if (!def) return { ok:false, reason:'not_spell' };

  ensureMana(state);

  const manaCost = (def.manaUsed|0) || (def.manaCost|0) || (def.mana|0) || 0;
  if (manaCost > 0 && !spendMana(state, manaCost)){
    onLog?.(`Not enough mana to cast ${def.name || base}.`);
    return { ok:false, reason:'no_mana' };
  }

  const mon = MONSTERS.find(m => m.id === state.combat.monsterId) || null;
  const element = elementOfSpell(def);
  const mult = elementalMultiplier(element, mon?.type || mon);

  const raw = Math.max(0, def.damage|0);
  const dmg = Math.max(0, Math.floor(raw * mult));
  state.combat.monHp = Math.max(0, (state.combat.monHp|0) - dmg);

  const modTxt = (mult > 1.001) ? ' (weakness!)' : (mult < 0.999) ? ' (resisted)' : '';
  onDamage?.(dmg, element || 'fire');
  onLog?.(`You cast ${def.name || base} for ${dmg} damage.${modTxt}`);

  const xpAmt = def.xp|0;
  if (xpAmt) grantDestructionXp(state, xpAmt);

  if (consume) removeItem(state, id, 1);

  try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
  try { window.dispatchEvent(new Event('mana:change')); } catch {}
  try { window.dispatchEvent(new Event('combat:changed')); } catch {}
  saveNow();

  return { ok:true, damage:dmg, manaCost, xpGained: xpAmt, element };
}
