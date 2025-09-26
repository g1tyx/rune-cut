// /systems/woodcutting.js
import { TREES } from '../data/woodcutting.js';
import { createGatheringSkill } from './gathering_core.js';

export const FOREST_ESSENCE_ID = 'forest_essence';

const wc = createGatheringSkill({
  actionType: 'chop',
  selectedIdKey: 'selectedTreeId',
  xpKey: 'wcXp',
  data: TREES,
  equipmentSlot: 'axe',
  actionBindKey: 'treeId',
  labelVerb: 'Chop',
  essenceId: FOREST_ESSENCE_ID,
  essenceChance: 0.10,  // per-tree override via `essenceChance` supported
  levelScale: 0.03,     // +3%/level
  minActionMs: 100
});

// Public API aligned to previous names
export const listTrees  = wc.listTargets;
export const canChop    = wc.canDo;
export const startChop  = wc.start;
export const finishChop = wc.finish;
