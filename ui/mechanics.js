// /ui/mechanics.js — basic Mechanics UI using initRecipePanel with single-batch lock

import { state, saveNow } from '../systems/state.js';
import { MECHANICS_RECIPES, mechanicsDurationMs, canAssemble, startMech, finishMech, assembleOnce, mechanicsGateReason, maxMakeMech } from '../systems/mechanics.js';
import { initRecipePanel } from './recipe_ui.js';
import { pushLog } from './logs.js';

// Single-batch policy (until Camp unlock flips this)
function mechanicsBatchOptionsLocked(/*state*/) {
  // Later: if (campUnlocks.has('mech_batch_5')) return [1,5,10,25,'Max'];
  return [1];
}

const panel = initRecipePanel({
  actionType: 'mechanics',
  listSelector:  '#mechanicsList',
  barSelector:   '#mechanicsBar',
  labelSelector: '#mechanicsLabel',

  getAll: ()=> MECHANICS_RECIPES,

  // Respect single-batch lock
  canMake: (s, id)=> canAssemble(s, id, 1),
  maxMake: (s, id)=> Math.min(1, maxMakeMech ? maxMakeMech(s, id) : 1),

  start: (s, id, cb)=> startMech(s, id, cb),
  finish: (s, id)=> finishMech(s, id),

  pushLog: (txt)=> pushLog('mechanicsLog', txt),

  // Batch selectors
  getBatchOptions: mechanicsBatchOptionsLocked,
  getBatchChoice:  (_s)=> 1,
  setBatchChoice:  (_s,_v)=> {/* locked to 1 for now */},

  // Optional: custom per-item duration (panel uses it for ETA text)
  getDurationMs: (s, id)=> mechanicsDurationMs(s, id),

  // Tooltip gate reason (for disabled button hints)
  gateReason: (s, id)=> mechanicsGateReason(s, id, 1)
});

export function renderMechanics(){
  panel.render();
}

// Auto-render when tab becomes active (if your app does that centrally you can remove this)
document.addEventListener('DOMContentLoaded', renderMechanics);
