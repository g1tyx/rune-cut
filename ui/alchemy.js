// /ui/alchemy.js — identical panel wiring to Crafting, re-renders on combat finish

import { state, saveNow } from '../systems/state.js';
import {
  getAlchemyRecipes,
  canBrew,
  maxBrewable,
  startBrew,
  finishBrew,
} from '../systems/alchemy.js';
import { initRecipePanel } from './recipe_ui.js';
import { pushLog } from './logs.js';
import { alchemyBatchOptions } from '../data/construction.js';

const panel = initRecipePanel({
  actionType: 'alch',
  listSelector:  '#alchemyRecipes',
  barSelector:   '#alchBar',
  labelSelector: '#alchLabel',

  // Data
  getAll:   () => getAlchemyRecipes(),
  canMake:  (s, id) => canBrew(s, id, 1),
  maxMake:  (s, id) => maxBrewable(s, id),

  // Lifecycle — match Crafting: start(state,id,onDone) and finish(state,id)
  start:    (s, id, onDone) => startBrew(s, id, onDone),
  finish:   (s, id) => finishBrew(s, id),

  // Logs
  pushLog:  (txt) => pushLog(txt),

  // Batching — same pattern as Crafting
  getBatchOptions: (s) => alchemyBatchOptions(s),
  getBatchChoice:  (s) => {
    const opts = alchemyBatchOptions(s);
    const def = opts[0] || 1;
    const v = s.ui?.alchBatch;
    return (v == null || !opts.includes(v)) ? def : v;
  },
  setBatchChoice:  (s, v) => {
    s.ui = s.ui || {};
    s.ui.alchBatch = v;
    saveNow();
  },
  iconFor:      (r) => r.outputs?.[0]?.id,
  iconFrameFor: ()  => 'icon', 
  selectorGroups: []
});

export function renderAlchemy(){
  panel.render();
}

/* ✅ Re-render Alchemy whenever combat finishes */
try {
  window.addEventListener('combat:finish', () => {
    try { renderAlchemy(); } catch {}
  });
} catch {}
