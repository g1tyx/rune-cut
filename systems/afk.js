// /systems/afk.js
import { ITEMS } from '../data/items.js';
import { listRocks, canMine, startMine, finishMine } from './mining.js';
import { listTrees, canChop, startChop, finishChop } from './woodcutting.js';
import { listFishingSpots, isSpotUnlocked as fishUnlocked, canFish, startFish, finishFish } from './fishing.js';

// --- Config ---
export const afkTimeMs = (state)=> Math.max(1000, state.afkTimeMs|0 || 30000);
export const setAfkTimeMs = (state, ms)=> { state.afkTimeMs = Math.max(1000, ms|0); };

// --- Driver registry (plug more skills here anytime) ---
const DRIVERS = new Map();

/** Register a skill driver.
 * driver(state, targetId, done) -> boolean started
 *  - call `done(detail)` when the action finishes; detail merged into event payload
 */
export function registerAfkSkill(skill, driver){
  DRIVERS.set(String(skill), driver);
}

// -------- Built-in drivers: Forestry & Fishing --------

registerAfkSkill('forestry', function forestryDriver(state, treeId, done){
  const trees = listTrees(state) || [];
  const t = trees.find(x => x.id === treeId) || trees[0];
  if (!t) return false;
  if (!canChop(state, t)) return false;

  return startChop(state, t, ()=>{
    const res = finishChop(state, t);
    done({
      skill: 'forestry',
      targetId: t.id,
      targetName: t.name || t.id,
      dropId: t.drop,
      dropName: ITEMS[t.drop]?.name || t.drop,
      xp: t.xp || 0,
      essence: !!res?.essence
    });
  });
});

registerAfkSkill('fishing', function fishingDriver(state, spotId, done){
  const spots = listFishingSpots(state) || [];
  const sp = spots.find(s => s.id === spotId) || spots[0];
  if (!sp) return false;
  if (!fishUnlocked(state, sp)) return false;
  if (!canFish(state, sp.id)) return false;

  return startFish(state, sp.id, ()=>{
    const res = finishFish(state, sp.id);
    done({
      skill: 'fishing',
      targetId: sp.id,
      targetName: sp.name || sp.id,
      dropId: sp.drop,
      dropName: ITEMS[sp.drop]?.name || sp.drop,
      xp: sp.xp || 0,
      essence: !!res?.essence
    });
  });
});

registerAfkSkill('mining', (state, veinId, done)=>{
  const rocks = listRocks(state) || [];
  const r = rocks.find(x=>x.id===veinId) || rocks[0];
  if (!r) return false;
  if (!canMine(state, r)) return false;
  return startMine(state, r, ()=>{
    const res = finishMine(state, r);
    done({
      skill: 'mining',
      targetId: r.id,
      targetName: r.name || r.id,
      dropId: r.drop,
      dropName: ITEMS[r.drop]?.name || r.drop,
      xp: r.xp || 0,
      essence: !!res?.essence
    });
  });
});

// Example stub you can add later:
// registerAfkSkill('mining', (state, veinId, done)=>{ /* startMine/finishMine */ });

// --- Session + loop ---
let AFK = null;

export function isAfkRunning(){ return !!AFK; }
export function currentAfk(){ return AFK ? { ...AFK } : null; }

export function stopAfk(){
  if (!AFK) return;
  const ended = { skill: AFK.skill, targetId: AFK.targetId };
  AFK = null;
  try { window.dispatchEvent(new CustomEvent('afk:end', { detail: ended })); } catch {}
}

export function startAfk(state, { skill, targetId }){
  const key = String(skill);
  // Tell UIs/other skills we’re switching
  try { window.dispatchEvent(new CustomEvent('afk:switch', { detail:{ name:key } })); } catch {}

  const endAt = performance.now() + afkTimeMs(state);
  AFK = { skill:key, targetId, endAt };

  try { window.dispatchEvent(new CustomEvent('afk:start', { detail:{ ...AFK } })); } catch {}

  runLoop(state);
  return true;
}

function runLoop(state){
  if (!AFK) return;
  const now = performance.now();

  if (now >= AFK.endAt){
    stopAfk();
    return;
  }

  // If something else is mid-action (progress bar running), try shortly
  if (state.action?.type){
    setTimeout(()=>runLoop(state), 80);
    return;
  }

  const driver = DRIVERS.get(AFK.skill);
  if (!driver){
    console.warn('[AFK] No driver for skill:', AFK.skill);
    stopAfk();
    return;
  }

  // Kick one normal action; on completion, we emit a cycle event and loop again
  const started = driver(state, AFK.targetId, (detail={})=>{
    if (!AFK) return; // canceled mid-run
    try {
      window.dispatchEvent(new CustomEvent('afk:cycle', {
        detail: { ...detail, skill: AFK.skill, targetId: AFK.targetId }
      }));
    } catch {}
    setTimeout(()=>runLoop(state), 0);
  });

  if (!started){
    // Couldn’t start now (gate/resources) — try again soon
    setTimeout(()=>runLoop(state), 250);
  }
}
