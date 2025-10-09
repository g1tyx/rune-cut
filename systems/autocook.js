// /systems/autocook.js — fixed to use Date.now() (epoch) across reloads

import { state, saveNow } from './state.js';
import { constructionBonuses } from './construction.js';
import { COOK_RECIPES } from '../data/cooking.js';
import { cookOnce } from './cooking.js';

const TICK_MS = 250;
const COOK_EVERY_MS = 1200;

let tickHandle = 0;
let nextCookAtEpoch = 0;   // epoch ms
let lockedRawId = null;

const now = () => Date.now();

/* Back-compat: if old perf.now() value (< ~year 2001 in ms range), nuke it */
function sanitizeSavedUntil(){
  const ui = (state.ui = state.ui || {});
  const until = Number(ui.autoCookUntil || 0);
  if (!until) return 0;
  // If it's less than 1e12, it's almost certainly a perf.now timestamp
  if (until < 1e12) {
    ui.autoCookUntil = 0;
    saveNow();
    return 0;
  }
  return until;
}

function getWindowUntil(){
  const ui = (state.ui = state.ui || {});
  return Number(ui.autoCookUntil || 0);
}
function setWindowUntil(epochMs){
  const ui = (state.ui = state.ui || {});
  ui.autoCookUntil = Math.floor(Number(epochMs)); // keep full epoch ms
  saveNow();
}

function hasWindow(){
  const until = getWindowUntil();
  return until > now();
}

function cookedIdOf(raw){
  const r = COOK_RECIPES?.[raw];
  if (!r) return null;
  if (r.output?.id) return r.output.id;
  if (Array.isArray(r.outputs) && r.outputs[0]?.id) return r.outputs[0].id;
  return null;
}

/** Start a new fixed window (overwrite, don't extend). */
function startWindow(seconds, { preferRawId = null } = {}){
  const secs = Math.max(0, Number(seconds) || 0);
  if (secs <= 0) return;

  const n = now();
  lockedRawId = (preferRawId && COOK_RECIPES[preferRawId]) ? preferRawId : null;

  const until = n + secs * 1000;
  setWindowUntil(until);

  nextCookAtEpoch = n + COOK_EVERY_MS;

  try {
    window.dispatchEvent(new CustomEvent('autocook:window', {
      detail: { until, rawId: lockedRawId }
    }));
  } catch {}
}

/** End the window cleanly (no restart). */
function endWindow(){
  if (!getWindowUntil()) return;
  setWindowUntil(0);
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

  const res = cookOnce(state, lockedRawId);
  if (res){
    saveNow();
    try { window.dispatchEvent(new Event('inventory:changed')); } catch {}
    try {
      window.dispatchEvent(new CustomEvent('autocook:tick', {
        detail: { rawId: lockedRawId, cookedId: cookedIdOf(lockedRawId), n: 1 }
      }));
    } catch {}
    return true;
  }
  return false;
}

/** Heartbeat loop. Never auto-restarts; only manual cook starts a window. */
function tick(){
  // sanitize legacy values once per tick
  sanitizeSavedUntil();

  const t = now();

  if (hasWindow()){
    if (!nextCookAtEpoch) nextCookAtEpoch = t + COOK_EVERY_MS;

    // Don’t schedule cooks past the end of the window
    const until = getWindowUntil();
    if (t >= nextCookAtEpoch && t < until){
      doOneAutoCook();
      nextCookAtEpoch = Math.min(until, t + COOK_EVERY_MS);
    }

    // UI countdown pulse
    try {
      window.dispatchEvent(new CustomEvent('autocook:pulse', {
        detail: { until, rawId: lockedRawId }
      }));
    } catch {}

    if (!hasWindow()) endWindow();
    schedule();
    return;
  }

  // Idle
  endWindow();
  nextCookAtEpoch = 0;
  schedule();
}

function schedule(){ tickHandle = window.setTimeout(tick, TICK_MS); }

/** Public init: set up listeners only (no boot kick). */
export function initAutoCook(){
  if (tickHandle) return;

  // When the player cooks PERFECT manually, start a window for that raw.
  window.addEventListener('cook:perfect', (e)=>{
    const { rawId } = e.detail || {};
    if (!rawId) return;
    const secs = Number((state?.tuning?.autoCookSeconds) ?? (constructionBonuses(state)?.auto_cook_seconds) ?? 0);
    if (secs > 0){
      startWindow(secs, { preferRawId: rawId });
    }
  });

  // Do not start a window on load; just begin ticking.
  nextCookAtEpoch = 0;
  tick();
}

export default { initAutoCook };
