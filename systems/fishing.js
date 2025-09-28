import { FISHING_SPOTS } from '../data/fishing.js';
import { createGatheringSkill } from './gathering_core.js';
import { ITEMS } from '../data/items.js';
import { pushLog } from '../ui/logs.js'; // optional

export const FISH_ESSENCE_ID = 'sea_essence';

const fish = createGatheringSkill({
  actionType: 'fish',
  selectedIdKey: 'selectedSpotId',
  xpKey: 'fishXp',
  data: FISHING_SPOTS,
  equipmentSlot: null,          // set if rods add speed mods (e.g., 'rod')
  actionBindKey: 'spotId',
  labelVerb: 'Fish',
  autoLabel: 'Auto-fishing…',
  essenceId: FISH_ESSENCE_ID,
});

export function listFishingSpots(state){ return fish.listTargets(state); }
export function canFish(state, spotOrId){ return fish.canDo(state, spotOrId); }
export function startFish(state, spotOrId, onDone){ return fish.start(state, spotOrId, onDone); }
export function finishFish(state, spotOrId){
  const res = fish.finish(state, spotOrId);
  if (!res) return 0;
  if (Array.isArray(res.bonuses) && res.bonuses.length){
    const msg = res.bonuses.map(b => `+${b.qty||1} ${(ITEMS?.[b.id]?.name || b.id)}`).join(' · ');
    try { pushLog(`Fishing: ${msg}`, ['fishing']); } catch {}
  }
  return res;
}
