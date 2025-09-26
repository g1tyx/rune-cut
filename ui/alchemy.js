// /ui/alchemy.js
import { state, saveState } from '../systems/state.js';
import { getAlchemyRecipes, canBrew, maxBrewable, startBrew, finishBrew } from '../systems/alchemy.js';
import { initRecipePanel } from './recipe_ui.js';
import { pushCraftLog } from './logs.js';

const panel = initRecipePanel({
  actionType: 'alch',
  listSelector:  '#alchemyRecipes',
  barSelector:   '#alchBar',
  labelSelector: '#alchLabel',

  getAll:   () => getAlchemyRecipes(),
  canMake:  (s, id) => canBrew(s, id, 1),
  maxMake:  (s, id) => maxBrewable(s, id),

  start:    (s, id, cb) => startBrew(s, id, cb),
  finish:   (s, id) => finishBrew(s, id),

  // Reuse crafting log style for consistency
  pushLog:  (txt) => pushCraftLog(txt),

  // No batching for alchemy (omit batch config entirely)

  // No selector groups needed currently
  selectorGroups: []
});

export function renderAlchemy(){
  panel.render();
}
