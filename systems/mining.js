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
  essenceId: ROCK_ESSENCE_ID,
  essenceChance: 0.10,
  levelScale: 0.03,
  minActionMs: 100
});

export const listRocks = mine.listTargets;
export const canMine   = mine.canDo;
export const startMine = mine.start;

export function finishMine(state, rockOrId){
  const res = mine.finish(state, rockOrId);
  if (!res) return 0;

  const bonusParts = Array.isArray(res.bonuses) && res.bonuses.length
    ? res.bonuses.map(b => `+${b.qty || 1} ${(ITEMS?.[b.id]?.name || b.id)}`).join(' · ')
    : '';

  if (bonusParts){
    // distinct, colored bonus log
    pushMineLog(`You found: ${bonusParts}`);
  }

  return res;
}
