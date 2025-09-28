// /systems/alchemy.js — production_core wrapper (same pattern as Crafting)

import { ALCHEMY_RECIPES } from '../data/alchemy.js';
import { createProductionSkill } from './production_core.js';

// Mirror Crafting’s config; only differences are actionType + labelVerb
const mod = createProductionSkill({
  actionType: 'alch',
  data: ALCHEMY_RECIPES,
  labelVerb: 'Brew',
  levelScale: 0.03,
  minActionMs: 300, // same floor Crafting uses
});

// Public API expected by /ui/recipe_ui.js
export const getAlchemyRecipes = () => ALCHEMY_RECIPES;
export const canBrew         = (state, id, times = 1) => mod.canMake(state, id, times);
export const maxBrewable     = (state, id)            => mod.maxCraftable(state, id);
export const startBrew       = (state, id, onDone)    => mod.start(state, id, onDone);
export const finishBrew      = (state, id)            => mod.finish(state, id);
export const brewOnce        = (state)                => mod.finishOne(state);

// (Optional helpers to keep parity with other skills)
export const listAlchemyRecipes = () =>
  Object.values(ALCHEMY_RECIPES || {}).slice()
    .sort((a,b)=> (a.level||0)-(b.level||0) || String(a.name||a.id).localeCompare(String(b.name||b.id)));

export const isRecipeUnlocked = (state, recipeOrId) => {
  const id = typeof recipeOrId === 'string' ? recipeOrId : recipeOrId?.id;
  return !!id && !!canBrew(state, id, 1);
};
