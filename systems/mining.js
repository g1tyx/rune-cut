// /systems/mining.js
import { ROCKS } from '../data/mining.js';
import { createGatheringSkill } from './gathering_core.js';
import { ITEMS } from '../data/items.js';
import { pushMineLog } from '../ui/logs.js';
import { grantItems } from './inventory.js';
import { toolEffectFor } from './tools.js';

export const ROCK_ESSENCE_ID = 'rock_essence';

const mine = createGatheringSkill({
  actionType: 'mine',
  selectedIdKey: 'selectedRockId',
  xpKey: 'minXp',
  data: ROCKS,
  equipmentSlot: 'pick',
  actionBindKey: 'rockId',
  labelVerb: 'Mine',
  autoLabel: 'Auto-mining…',
  essenceId: ROCK_ESSENCE_ID,
});

export function listRocks(state) {
  return mine.listTargets(state);
}

export function canMine(state, rockOrId) {
  return mine.canDo(state, rockOrId);
}

export function startMining(state, rockOrId, onDone) {
  return mine.start(state, rockOrId, onDone);
}

function getRockDef(rockOrId) {
  if (!rockOrId) return null;
  if (typeof rockOrId === 'string') {
    if (Array.isArray(ROCKS)) return ROCKS.find(r => r.id === rockOrId) || null;
    return ROCKS[rockOrId] || null;
  }
  return rockOrId;
}

export function finishMining(state, rockOrId) {
  const res = mine.finish(state, rockOrId);
  if (!res) return 0;

  const eff = toolEffectFor(state, 'mining');
  const rdef = getRockDef(rockOrId);
  const dropName = ITEMS?.[res.dropId]?.name || res.dropId;

  if (eff && res.dropId && Math.random() < eff.chance) {
    const bonusQty = Math.max(1, res.qty | 0);
    grantItems(state, [{ id: res.dropId, qty: bonusQty }]);
    res.bonuses = Array.isArray(res.bonuses) ? res.bonuses.slice() : [];
    res.bonuses.push({ id: res.dropId, qty: bonusQty });
    const addXp = Math.max(0, Number(rdef?.xp) || 0);
    state.minXp = (Number(state.minXp) || 0) + addXp;
    try { window.dispatchEvent(new Event('xp:change')); } catch {}
    pushMineLog(`Lucky strike! 2× ${dropName}`);
  }

  if (Array.isArray(res.bonuses) && res.bonuses.length) {
    const txt = res.bonuses.map(b => `+${b.qty || 1} ${(ITEMS?.[b.id]?.name || b.id)}`).join(' · ');
    pushMineLog(`You found: ${txt}`);
  }

  return res;
}
