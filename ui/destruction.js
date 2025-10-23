import { DESTRUCTION_RECIPES } from "../data/destruction.js";
import { initRecipePanel } from './recipe_ui.js';
import { pushLog } from './logs.js';
import { finishMake, maxMakable, startMake, canMake, getDestructionRecipes, stopMake } from "../systems/destruction.js";

const panel = initRecipePanel({
  actionType: 'destruction',
  listSelector:  '#destructionRecipes',
  barSelector:   '#destructionBar',
  labelSelector: '#destructionLabel',
  getAll:   () => getDestructionRecipes(),
  canMake:  (s, id) => canMake(s, id, 1),
  maxMake:  (s, id) => maxMakable(s, id),
  start:    (s, id, onDone) => startMake(s, id, onDone),
  finish:   (s, id) => finishMake(s, id),
  stop:     (s) => stopMake(s),
  pushLog:  (txt) => pushLog(txt),
});

export function renderDestruction(){
  panel.render();
}

try {
  window.addEventListener('combat:finish', () => {
    try { renderDestruction(); } catch {}
  });
} catch {}
