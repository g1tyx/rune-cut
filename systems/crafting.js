// /systems/crafting.js
import { CRAFT_RECIPES } from '../data/crafting.js';
import { createProductionSkill } from './production_core.js';

const craft = createProductionSkill({
  actionType: 'craft',
  data: CRAFT_RECIPES,
  labelVerb: 'Craft',
  levelScale: 0.03, // +3%/level on speedSkill
  minActionMs: 300
});

export const getRecipe       = (id)=> craft.get(id);
export const canCraft        = (state, id, times=1)=> craft.canMake(state, id, times);
export const maxCraftable    = (state, id)=> craft.maxCraftable(state, id);
export const startCraft      = (state, id, onDone)=> craft.start(state, id, onDone);
export const finishCraft     = (state, id)=> craft.finish(state, id);
export const finishOneCraft  = (state)=> craft.finishOne(state);
