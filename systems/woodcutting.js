import { TREES } from '../data/woodcutting.js';
import { createGatheringSkill } from './gathering_core.js';
import { ITEMS } from '../data/items.js';
import { pushLog } from '../ui/logs.js';

export const TREE_ESSENCE_ID = 'forest_essence';

const chop = createGatheringSkill({
  actionType: 'chop',
  selectedIdKey: 'selectedTreeId',
  xpKey: 'wcXp',
  data: TREES,
  equipmentSlot: 'axe',
  actionBindKey: 'treeId',
  labelVerb: 'Chop',
  autoLabel: 'Auto-chopping…',
  essenceId: TREE_ESSENCE_ID,
});

export function listTrees(state){ return chop.listTargets(state); }
export function canChop(state, treeOrId){ return chop.canDo(state, treeOrId); }
export function startChop(state, treeOrId, onDone){ return chop.start(state, treeOrId, onDone); }
export function finishChop(state, treeOrId){
  const res = chop.finish(state, treeOrId);
  if (!res) return 0;
  if (Array.isArray(res.bonuses) && res.bonuses.length){
    const msg = res.bonuses.map(b => `+${b.qty||1} ${(ITEMS?.[b.id]?.name || b.id)}`).join(' · ');
    try { pushLog(`Forestry: ${msg}`, ['forestry']); } catch {}
  }
  return res;
}
