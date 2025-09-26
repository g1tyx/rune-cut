// /systems/gathering_core.js
import { ITEMS } from '../data/items.js';
import { addItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import {
  clampMs, requiredLevel, resolveTarget,
  speedModFrom, applyDrops, chance
} from './utils.js';

const XP_TABLE = buildXpTable();

/**
 * Create a standardized gathering skill module.
 *
 * @param {Object} cfg
 * @param {string}   cfg.actionType           'chop' | 'fish' | 'mine'
 * @param {string}   cfg.selectedIdKey        e.g. 'selectedTreeId' | 'selectedSpotId' | 'selectedRockId'
 * @param {string}   cfg.xpKey                e.g. 'wcXp' | 'fishXp' | 'miningXp'
 * @param {Array}    cfg.data                 data array with objects: { id, name?, level?, baseTime?, xp?, drop, qty?, bonusDrops? }
 * @param {string}   cfg.equipmentSlot        'axe' | 'fishing' | 'pickaxe' (key in state.equipment & equipmentMods)
 * @param {string}   cfg.actionBindKey        property stored in state.action to bind the target id (e.g. 'treeId' | 'spotId' | 'rockId')
 * @param {string}   [cfg.labelVerb]          'Chop' | 'Fish' | 'Mine' (defaults to capitalized actionType)
 * @param {string}   [cfg.essenceId]          essence item id for this skill
 * @param {number}   [cfg.essenceChance=0.10] default essence chance if target doesn’t specify its own
 * @param {number}   [cfg.levelScale=0.03]    +3% speed per level by default
 * @param {number}   [cfg.minActionMs=100]    minimum duration clamp
 */
export function createGatheringSkill(cfg){
  const {
    actionType,
    selectedIdKey,
    xpKey,
    data,
    equipmentSlot,
    actionBindKey,
    labelVerb = (actionType?.[0]?.toUpperCase() + actionType?.slice(1)) || 'Do',
    essenceId,
    essenceChance = 0.10,
    levelScale = 0.03,
    minActionMs = 100,
  } = cfg;

  function speedFromLevel(lvl){ return 1 + levelScale * (lvl - 1); }

  function equipmentSpeed(state){
    const eqId = state?.equipment?.[equipmentSlot];
    const base = eqId ? String(eqId).split('@')[0] : '';
    const def  = base ? ITEMS[base] : null;
    const baseSpeed = (def?.speed) || 1;
    return baseSpeed + speedModFrom(state, equipmentSlot);
  }

  function listTargets(_state){ return data; }

  function canDo(state, tOrId){
    const t = resolveTarget(data, state[selectedIdKey], tOrId);
    if (!t) return false;
    const lvl = levelFromXp(state[xpKey] || 0, XP_TABLE);
    return lvl >= requiredLevel(t);
  }

  function start(state, tOrId, onDone){
    const t = resolveTarget(data, state[selectedIdKey], tOrId);
    if (!t || !canDo(state, t)) return false;

    const lvl      = levelFromXp(state[xpKey] || 0, XP_TABLE);
    const eqSpeed  = equipmentSpeed(state);
    const baseTime = t.baseTime || 2000;
    const dur      = clampMs(baseTime / (eqSpeed * speedFromLevel(lvl)), minActionMs);
    const now      = performance.now();

    state[selectedIdKey] = t.id;

    state.action = {
      type: actionType,
      label: `${labelVerb} ${t.name || t.id}`,
      startedAt: now,
      endsAt: now + dur,
      duration: dur,
      [actionBindKey]: t.id
    };

    // AFK-safe completion guard: only fire if our action is still the same
    setTimeout(()=>{
      if (state.action?.type === actionType && state.action?.[actionBindKey] === t.id){
        onDone?.();
      }
    }, dur);

    return true;
  }

  function finish(state, tOrId){
    // allow explicit arg first, else read from in-flight action
    const t = resolveTarget(data, state.action?.[actionBindKey], tOrId);
    if (!t){ state.action = null; return 0; }

    // base drop (allow qty number or omitted → 1)
    const qty = Math.max(1, Number(t.qty || 1));
    addItem(state, t.drop, qty);

    // standardized bonus drops: [{ id, chance, qty }] with qty number or [min,max]
    const bonuses = applyDrops(state, Array.isArray(t.bonusDrops) ? t.bonusDrops : [], addItem);

    // essence (per-target override or default)
    const roll = Number(t.essenceChance ?? essenceChance);
    const essence = chance(roll);
    if (essence && essenceId) addItem(state, essenceId, 1);

    // apply XP & clear action
    state[xpKey] = (state[xpKey] || 0) + (t.xp || 0);
    state.action = null;

    return { qty, essence, bonuses };
  }

  return {
    listTargets,
    canDo,
    start,
    finish,
    _equipmentSpeed: equipmentSpeed,
  };
}
