import { FISHING_SPOTS } from '../data/fishing.js';
import { createGatheringSkill } from './gathering_core.js';
import { ITEMS } from '../data/items.js';
import { pushFishLog } from '../ui/logs.js';
import { addItem } from './inventory.js';
import { toolEffectFor } from './tools.js';

export const FISH_ESSENCE_ID = 'sea_essence';

const fish = createGatheringSkill({
  actionType: 'fish',
  selectedIdKey: 'selectedSpotId',
  xpKey: 'fishXp',
  data: FISHING_SPOTS,
  equipmentSlot: 'fishing',
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
  
  // Check for double drop from angler reel
  let doubleCount = 0;
  const eff = toolEffectFor(state, 'fishing');
  if (eff && Math.random() < Math.max(0, Math.min(1, eff.chance||0))){
    addItem(state, res.dropId, 1);
    state.fishXp = (state.fishXp||0) + (res.xp||0);
    doubleCount = 1;
    const nm = ITEMS?.[res.dropId]?.name || res.dropId;
    pushFishLog(`Double catch! +1 ${nm}`);
  }
  
  if (Array.isArray(res.bonuses) && res.bonuses.length){
    const msg = res.bonuses.map(b => `+${b.qty||1} ${(ITEMS?.[b.id]?.name || b.id)}`).join(' · ');
    try { pushFishLog(`You found: ${msg}`); } catch {}
  }
  return { ...res, doubleCount, totalQty: res.qty + doubleCount };
}
