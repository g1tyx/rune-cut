// Centralized, lightweight timed-effects manager.
// Stores active effects on state.effects = { [id]: { id, name, endsAt, data } }
// Non-stacking by ID: reapplying extends duration.
// Dispatches a 'effects:tick' event ~1/sec for UI to refresh badges.
///systems/effects.js
let tickerStarted = false;

function nowMs(){ return Date.now(); }

export function ensureEffectsContainer(state){
  if (!state.effects) state.effects = {};
  return state.effects;
}

export function applyEffect(state, { id, name, durationMs, data={} }){
  if (!id || !durationMs) return false;
  const effects = ensureEffectsContainer(state);
  const cur = effects[id];
  const base = Math.max(nowMs(), cur?.endsAt || 0);
  effects[id] = { id, name: name || id, endsAt: base + durationMs, data };
  dispatchTick();
  return true;
}

export function clearEffect(state, id){
  if (!id) return false;
  const effects = ensureEffectsContainer(state);
  if (effects[id]) { delete effects[id]; dispatchTick(); return true; }
  return false;
}

export function remainingMs(state, id){
  const eff = ensureEffectsContainer(state)[id];
  if (!eff) return 0;
  return Math.max(0, eff.endsAt - nowMs());
}

export function getActiveEffects(state){
  const effects = ensureEffectsContainer(state);
  const out = [];
  for (const eff of Object.values(effects)){
    const rem = eff.endsAt - nowMs();
    if (rem > 0) out.push(eff); else delete effects[eff.id];
  }
  // sort by soonest to expire
  out.sort((a,b)=> a.endsAt - b.endsAt);
  return out;
}

function tickOnce(){
  // prune expired and notify
  dispatchTick();
}

function dispatchTick(){
  try { window.dispatchEvent(new Event('effects:tick')); } catch {}
}

export function ensureEffectsTicker(){
  if (tickerStarted) return;
  tickerStarted = true;
  setInterval(tickOnce, 1000);
}
