// Non-restarting auto-cook window that starts ONLY when the player
// manually cooks something perfectly. It locks to that raw_* for the
// entire window. No boot/start on refresh. No restart on expiry.

import { state, saveState } from './state.js';
import { constructionBonuses } from './construction.js';
import { COOK_RECIPES } from '../data/cooking.js';
import { cookItems } from './cooking.js';

const TICK_MS = 250;
const COOK_EVERY_MS = 1200;

let tickHandle = 0;
let nextCookAt = 0;
let lockedRawId = null;

function now(){ return performance.now(); }
function hasWindow(){
  const until = Number(state.ui?.autoCookUntil || 0);
  return until > now();
}

/** Start a new fixed window (overwrite, don't extend). */
function startWindow(seconds, { preferRawId=null } = {}){
  if (!seconds || seconds <= 0) return;
  const ui = (state.ui = state.ui || {});
  const n = now();

  // Lock to the given raw (the one the player just cooked)
  lockedRawId = (preferRawId && COOK_RECIPES[preferRawId]) ? preferRawId : null;

  ui.autoCookUntil = n + seconds*1000;
  nextCookAt = n + COOK_EVERY_MS;

  // Tell UI
  try {
    window.dispatchEvent(new CustomEvent('autocook:window', {
      detail: { until: ui.autoCookUntil, rawId: lockedRawId }
    }));
  } catch {}
}

/** End the window cleanly (no restart). */
function endWindow(){
  const ui = (state.ui = state.ui || {});
  if (!ui.autoCookUntil) return;
  ui.autoCookUntil = 0;
  lockedRawId = null;
  try {
    window.dispatchEvent(new CustomEvent('autocook:window', {
      detail: { until: 0, rawId: null }
    }));
  } catch {}
}

/** Cook exactly 1 item of the locked type, if present. */
function doOneAutoCook(){
  if (!lockedRawId) return false;
  if (state.action?.type === 'cook') return false; // don't clash with manual cooking

  const have = state.inventory?.[lockedRawId] | 0;
  if (have <= 0) return false;

  const cooked = cookItems(state, lockedRawId, 1);
  if (cooked > 0){
    saveState(state);
    try { window.dispatchEvent(new Event('inventory:change')); } catch {}
    try {
      const cookedId = COOK_RECIPES[lockedRawId]?.cooked;
      window.dispatchEvent(new CustomEvent('autocook:tick', {
        detail: { rawId: lockedRawId, cookedId, n: cooked }
      }));
    } catch {}
    return true;
  }
  return false;
}

/** Heartbeat loop. Never auto-restarts; only manual cook starts a window. */
function tick(){
  const t = now();

  if (hasWindow()){
    if (t >= nextCookAt){
      doOneAutoCook();
      nextCookAt = t + COOK_EVERY_MS;
    }

    // UI countdown pulse
    try {
      window.dispatchEvent(new CustomEvent('autocook:pulse', {
        detail: { until: state.ui.autoCookUntil, rawId: lockedRawId }
      }));
    } catch {}

    // End exactly when the timer lapses (no restart)
    if (!hasWindow()) endWindow();

    schedule();
    return;
  }

  // Idle: no implicit starts.
  endWindow();
  schedule();
}

function schedule(){ tickHandle = window.setTimeout(tick, TICK_MS); }

/** Public init: set up listeners only (no boot kick). */
export function initAutoCook(){
  if (tickHandle) return;

  // When the player cooks PERFECT manually, start a window for that raw
  window.addEventListener('cook:result', (e)=>{
    const { outcome, rawId } = e.detail || {};
    if (outcome !== 'perfect' || !rawId) return;

    const secs = Number(constructionBonuses(state)?.auto_cook_seconds || 0);
    if (secs > 0){
      startWindow(secs, { preferRawId: rawId });
    }
  });

  nextCookAt = now() + COOK_EVERY_MS;
  tick();
}

export default { initAutoCook };
