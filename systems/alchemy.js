// /systems/alchemy.js
import { ALCHEMY_RECIPES } from '../data/alchemy.js';
import { createProductionSkill } from './production_core.js';

const alch = createProductionSkill({
  actionType: 'alch',
  data: ALCHEMY_RECIPES,
  labelVerb: 'Brew',
  levelScale: 0.03,
  minActionMs: 300,
  xpKeyOf: (skill)=> ({ alch:'alchXp', craft:'craftXp', smith:'smithXp', wc:'wcXp', fish:'fishXp', min:'minXp', construction:'constructionXp' }[skill] || (skill + 'Xp'))
});

export const getAlchemyRecipes = () => ALCHEMY_RECIPES;
export const canBrew         = (state, id, times=1) => alch.canMake(state, id, times);
export const maxBrewable     = (state, id)          => alch.maxCraftable(state, id);
export const startBrew       = (state, id, onDone)  => alch.start(state, id, onDone);
export const finishBrew      = (state, id)          => alch.finish(state, id);
export const finishOneBrew   = (state)              => alch.finishOne(state);

export function listAlchemyRecipes(){
  return Object.values(ALCHEMY_RECIPES).slice().sort((a,b)=> (a.level||1)-(b.level||1) || String(a.name||a.id).localeCompare(String(b.name||b.id)));
}

export function isRecipeUnlocked(state, recipeOrId){
  const id = typeof recipeOrId === 'string' ? recipeOrId : recipeOrId?.id;
  return !!id && !!canBrew(state, id, 1);
}
