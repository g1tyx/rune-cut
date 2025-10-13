// /systems/farming.js
import { state, saveNow } from './state.js';
import { ITEMS } from '../data/items.js';
import { recipeForSeed } from '../data/farming.js';
import { pushLog } from '../ui/logs.js';
import { renderInventory } from '../ui/inventory.js';
import { renderSkills } from '../ui/skills.js';
import { renderAlchemy } from '../ui/alchemy.js';
import { buildXpTable, levelFromXp } from './xp.js';

const XP_TABLE = buildXpTable();

export const FARM_PLOTS = 6;

export const UNLOCK_COSTS      = [        1,   10000,    50000,   150000,   500000, 2000000 ];
export const UNLOCK_LEVEL_REQS = [        1,      20,       40,       60,       80,      90 ];

export function ensureFarmState(){
  const f = (state.farm = state.farm || {});
  f.plots = Array.isArray(f.plots)
    ? f.plots
    : Array.from({ length: FARM_PLOTS }, () => ({
        unlocked: false,
        seedId: null,
        plantedAt: 0,
        doneAt: 0,
      }));
  if (f.plots.length !== FARM_PLOTS) {
    const cur = f.plots;
    f.plots = Array.from({ length: FARM_PLOTS }, (_, i) => cur[i] ?? {
      unlocked: false, seedId: null, plantedAt: 0, doneAt: 0
    });
  }
  state.farmingXp = Number(state.farmingXp || 0);
  return f;
}

export function getFarmingXp(){ return state.farmingXp | 0; }

export function grantFarmingXp(amount){
  const add = Math.max(0, amount|0);
  if (!add) return 0;
  state.farmingXp = (state.farmingXp|0) + add;
  try {
    window.dispatchEvent(new CustomEvent('xp:gain', {
      detail:{ skill:'farming', xp:add, total:state.farmingXp|0 }
    }));
  } catch {}
  return add;
}

export function unlockPlot(i){
  ensureFarmState();
  const cost   = UNLOCK_COSTS[i];
  const lvlReq = UNLOCK_LEVEL_REQS[i];
  if (cost == null && lvlReq == null) return pushLog('This plot cannot be unlocked yet.', 'farming');

  const playerLvl = levelFromXp(state.farmingXp || 0, XP_TABLE);
  if (lvlReq != null && playerLvl < lvlReq) {
    return pushLog(`You need Farming level ${lvlReq} to unlock Plot ${i+1}.`, 'farming');
  }

  if ((state.gold|0) < (cost|0)) {
    return pushLog(`Not enough gold (need ${cost}).`, 'farming');
  }

  const p = state.farm.plots[i];
  if (p.unlocked) return;

  state.gold -= (cost|0);
  p.unlocked = true;
  pushLog(`Unlocked Plot ${i+1} (−${cost} gold).`, 'farming');
  saveNow(); renderInventory();
}

// (rest of file unchanged)


export function plantSeed(i, seedId){
  ensureFarmState();
  const p = state.farm.plots[i];
  if (!p.unlocked || p.seedId) return;
  const rec = recipeForSeed(seedId, ITEMS);
  if (!rec) return pushLog(`Cannot plant ${seedId}.`, 'farming');
  const inv = state.inventory || {};
  if ((inv[seedId]|0) <= 0) return pushLog(`You don't have ${seedId}.`, 'farming');
  inv[seedId] -= 1; if (inv[seedId] <= 0) delete inv[seedId];
  const now = Date.now();
  p.seedId = seedId;
  p.plantedAt = now;
  p.doneAt = now + (rec.time|0);
  pushLog(`Planted ${rec.name || seedId}.`, 'farming');
  saveNow(); renderInventory();
}

export function harvest(i){
  ensureFarmState();
  const p = state.farm.plots[i];
  if (!p.seedId) return;
  const rec = recipeForSeed(p.seedId, ITEMS);
  if (!rec?.cropId) return pushLog('Error: unknown crop.', 'farming');
  const now = Date.now();
  if (now < p.doneAt) return pushLog('Not ready yet.', 'farming');

  const add = Math.max(0, rec.xp) * 3;
  const crop = rec.cropId;

  state.inventory[crop] = (state.inventory[crop]||0) + 3;

  grantFarmingXp(add);
  saveNow();

  pushLog(`Harvested 3× ${crop} → +${add} Farming XP`, 'farming');

  p.seedId = null; p.plantedAt = 0; p.doneAt = 0;
  saveNow();
  setTimeout(saveNow, 0);

  renderInventory(); renderSkills(); renderAlchemy();
}
