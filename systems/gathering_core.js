import { ITEMS } from '../data/items.js';
import { addItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';
import {
  clampMs, requiredLevel, resolveTarget,
  speedModFrom, applyDrops, chance
} from './utils.js';

const XP_TABLE = buildXpTable();

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

    // hard-reset any previous action/timer/carry
    if (state._gatherTimer) { try { clearTimeout(state._gatherTimer); } catch {} }
    delete state._gatherTimer;

    // action nonce to prevent stale timers from completing new runs
    state._gatherSeq = (state._gatherSeq|0) + 1;
    const nonce = state._gatherSeq;

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
      _nonce: nonce,
      [actionBindKey]: t.id
    };

    // schedule completion guarded by the nonce + current action match
    state._gatherTimer = setTimeout(()=>{
      const a = state.action;
      if (
        a &&
        a.type === actionType &&
        a[actionBindKey] === t.id &&
        a._nonce === nonce
      ){
        try { onDone && onDone(); } catch {}
      }
    }, dur);

    return true;
  }

  function finish(state, tOrId){
    // cancel any pending timer; completion now handled synchronously here
    if (state._gatherTimer) { try { clearTimeout(state._gatherTimer); } catch {} }
    delete state._gatherTimer;

    const t = resolveTarget(data, state.action?.[actionBindKey], tOrId);
    if (!t){ state.action = null; return 0; }

    const qty = Math.max(1, Number(t.qty || 1));
    addItem(state, t.drop, qty);

    const bonuses = applyDrops(state, Array.isArray(t.bonusDrops) ? t.bonusDrops : [], addItem);

    const roll = Number(t.essenceChance ?? essenceChance);
    const essence = chance(roll);
    if (essence && essenceId) addItem(state, essenceId, 1);

    const gainedXp = (t.xp || 0);
    state[xpKey] = (state[xpKey] || 0) + gainedXp;

    // clear action at the end
    state.action = null;

    return {
      qty,
      essence,
      bonuses,        // [{ id, qty }, ...]
      dropId: t.drop, // for naming
      xp: gainedXp,   // for log line
      target: t.name || t.id,
      essenceId       // for naming
    };
  }

  return {
    listTargets,
    canDo,
    start,
    finish,
    _equipmentSpeed: equipmentSpeed,
  };
}
