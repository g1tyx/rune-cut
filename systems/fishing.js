// /systems/fishing.js
import { FISHING_SPOTS } from '../data/fishing.js';
import { createGatheringSkill } from './gathering_core.js';

export const SEA_ESSENCE_ID = 'sea_essence';

const fish = createGatheringSkill({
  actionType: 'fish',
  selectedIdKey: 'selectedSpotId',
  xpKey: 'fishXp',
  data: FISHING_SPOTS,
  equipmentSlot: 'fishing',
  actionBindKey: 'spotId',
  labelVerb: 'Fish',
  essenceId: SEA_ESSENCE_ID,
  essenceChance: 0.10,  // per-spot override via `essenceChance`
  levelScale: 0.03,
  minActionMs: 100
});

export const listFishingSpots = fish.listTargets;
export const canFish          = fish.canDo;
export const startFish        = fish.start;
export const finishFish       = fish.finish;

