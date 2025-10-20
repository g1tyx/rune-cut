import { ROCKS } from '../data/mining.js';
import { createGatheringSkill } from './gathering_core.js';
import { ITEMS } from '../data/items.js';
import { pushMineLog } from '../ui/logs.js';
import { addItem } from './inventory.js';
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

export function listRocks(state){ return mine.listTargets(state); }
export function canMine(state, rockOrId){ return mine.canDo(state, rockOrId); }
export function startMining(state, rockOrId, onDone){ return mine.start(state, rockOrId, onDone); }

export function finishMining(state, rockOrId){
  const res = mine.finish(state, rockOrId);
  if (!res) return 0;

  let doubleCount = 0;
  const eff = toolEffectFor(state, 'mining');
  if (eff && Math.random() < Math.max(0, Math.min(1, eff.chance||0))){
    addItem(state, res.dropId, 1);
    state.minXp = (state.minXp||0) + (res.xp||0);
    doubleCount = 1;
    const nm = ITEMS?.[res.dropId]?.name || res.dropId;
    pushMineLog(`Double drop: +1 ${nm}`);
  }

  if (Array.isArray(res.bonuses) && res.bonuses.length){
    const msg = res.bonuses.map(b => `+${b.qty||1} ${(ITEMS?.[b.id]?.name || b.id)}`).join(' · ');
    pushMineLog(`You found: ${msg}`);
  }

  return { ...res, doubleCount, totalQty: res.qty + doubleCount };
}