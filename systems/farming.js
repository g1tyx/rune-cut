// /systems/farming.js
import { state, saveNow } from './state.js';
import { ITEMS } from '../data/items.js';
import { recipeForSeed } from '../data/farming.js';
import { pushFarmLog } from '../ui/logs.js';
import { renderInventory } from '../ui/inventory.js';
import { renderSkills } from '../ui/skills.js';
import { renderAlchemy } from '../ui/alchemy.js';
import { buildXpTable, levelFromXp } from './xp.js';
import { toolEffectFor } from './tools.js';

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
  if (cost == null && lvlReq == null) return pushFarmLog('This plot cannot be unlocked yet.');

  const playerLvl = levelFromXp(state.farmingXp || 0, XP_TABLE);
  if (lvlReq != null && playerLvl < lvlReq) {
    return pushFarmLog(`You need Farming level ${lvlReq} to unlock Plot ${i+1}.`);
  }

  if ((state.gold|0) < (cost|0)) {
    return pushFarmLog(`Not enough gold (need ${cost}).`);
  }

  const p = state.farm.plots[i];
  if (p.unlocked) return;

  state.gold -= (cost|0);
  p.unlocked = true;
  pushFarmLog(`Unlocked Plot ${i+1} (−${cost} gold).`);
  saveNow(); renderInventory();
}

export function plantSeed(i, seedId){
  ensureFarmState();
  const p = state.farm.plots[i];
  if (!p.unlocked || p.seedId) return;
  const rec = recipeForSeed(seedId, ITEMS);
  if (!rec) return pushFarmLog(`Cannot plant ${seedId}.`);
  const inv = state.inventory || {};
  if ((inv[seedId]|0) <= 0) return pushFarmLog(`You don't have ${seedId}.`);
  inv[seedId] -= 1; if (inv[seedId] <= 0) delete inv[seedId];
  const now = Date.now();
  let growTime = rec.time|0;
  
  // Apply Harvest Scythe growth time reduction
  const eff = toolEffectFor(state, 'farming');
  let bonusMsg = '';
  if (eff && eff.id === 'harvest_scythe') {
    const reduction = 0.2; // 20% faster growth
    const savedTime = Math.floor(growTime * reduction);
    growTime = Math.floor(growTime * (1 - reduction));
    bonusMsg = ` (20% faster with Harvest Scythe · −${Math.floor(savedTime/1000)}s)`;
  }
  
  p.seedId = seedId;
  p.plantedAt = now;
  p.doneAt = now + growTime;
  pushFarmLog(`Planted ${rec.name || seedId}.${bonusMsg}`);
  saveNow(); renderInventory();
}

export function harvest(i){
  ensureFarmState();
  const p = state.farm.plots[i];
  if (!p.seedId) return;
  const rec = recipeForSeed(p.seedId, ITEMS);
  if (!rec?.cropId) return pushFarmLog('Error: unknown crop.');
  const now = Date.now();
  if (now < p.doneAt) return pushFarmLog('Not ready yet.');

  const add = Math.max(0, rec.xp) * 3;
  const crop = rec.cropId;

  state.inventory[crop] = (state.inventory[crop]||0) + 3;

  grantFarmingXp(add);
  saveNow();

  pushFarmLog(`Harvested 3× ${crop} → +${add} Farming XP`);

  p.seedId = null; p.plantedAt = 0; p.doneAt = 0;
  saveNow();
  setTimeout(saveNow, 0);

  renderInventory(); renderSkills(); renderAlchemy();
}
