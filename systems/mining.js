// /systems/mining.js
import { ROCKS } from '../data/mining.js';
import { createGatheringSkill } from './gathering_core.js';
import { ITEMS } from '../data/items.js';
import { pushMineLog } from '../ui/logs.js';

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

export function finishMining(state, rockOrId) {
  const res = mine.finish(state, rockOrId);
  if (!res) return 0;

  const bonusParts = Array.isArray(res.bonuses) && res.bonuses.length
    ? res.bonuses.map(b => `+${(b.qty || 1)} ${(ITEMS?.[b.id]?.name || b.id)}`).join(' · ')
    : '';

  if (bonusParts) pushMineLog(`You found: ${bonusParts}`);
  return res;
}
