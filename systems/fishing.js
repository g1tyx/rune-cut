// /systems/fishing.js
import { FISHING_SPOTS } from '../data/fishing.js';
import { addItem } from './inventory.js';
import { ITEMS } from '../data/items.js';
import { buildXpTable, levelFromXp } from './xp.js';

const XP_TABLE = buildXpTable();
const speedFromLevel = (lvl)=> 1 + 0.03*(lvl-1); // +3% per Fishing level
const clampMs = (ms)=> Math.max(100, ms);

// Essence (10% drop like other skills)
export const SEA_ESSENCE_ID = 'sea_essence';
// Compat alias (some older code referenced this misnamed identifier)
export const FOREST_ESSENCE_ID = SEA_ESSENCE_ID;

function baseId(id){ return String(id||'').split('@')[0]; }

function rodSpeedFromState(state){
  const rodId = state.equipment?.fishing || '';
  const def   = ITEMS[baseId(rodId)] || {};
  const base  = Number(def.speed || 1);
  const swift = Number(state.equipmentMods?.fishing?.swift?.addSpeed || 0);
  return base + swift;
}

/* ---------- helpers ---------- */
export function listFishingSpots(_state){
  return FISHING_SPOTS;
}

function resolveSpot(state, spotOrId){
  if (!spotOrId) return FISHING_SPOTS.find(s=>s.id===state.selectedSpotId) || FISHING_SPOTS[0] || null;
  if (typeof spotOrId === 'string') return FISHING_SPOTS.find(s=>s.id===spotOrId) || null;
  if (spotOrId && spotOrId.id) return FISHING_SPOTS.find(s=>s.id===spotOrId.id) || spotOrId;
  return null;
}

function requiredLevel(spot){ return spot.level || 1; }

export function isSpotUnlocked(state, spotOrId){
  const spot = resolveSpot(state, spotOrId);
  if (!spot) return false;
  const lvl = levelFromXp(state.fishXp || 0, XP_TABLE);
  return lvl >= requiredLevel(spot);
}

/* ---------- bonus drop support ---------- */
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

function awardPrimary(state, spot){
  const qty = Math.max(1, spot.qty || 1);
  addItem(state, spot.drop, qty);
  return [{ id: spot.drop, qty }];
}

function awardBonus(state, spot){
  const awarded = [];
  const list = Array.isArray(spot.bonusDrops) ? spot.bonusDrops : [];
  for (const b of list){
    const p = Math.max(0, Math.min(1, b.chance ?? 0));
    if (Math.random() < p){
      const qty = randInt(b.min ?? 1, b.max ?? (b.min ?? 1));
      addItem(state, b.id, qty);
      awarded.push({ id: b.id, qty });
    }
  }
  return awarded;
}

/* ---------- ui-facing api ---------- */
export function canFish(state, spotOrId){
  // if (state.action) return false;
  const spot = resolveSpot(state, spotOrId);
  if (!spot) return false;
  return isSpotUnlocked(state, spot);
}

export function startFish(state, spotOrId, onDone){
  const spot = resolveSpot(state, spotOrId);
  if (!spot || !canFish(state, spot)) return false;

  const fishLvl  = levelFromXp(state.fishXp || 0, XP_TABLE);
  const rodSpeed = rodSpeedFromState(state);
  const baseTime = spot.baseTime || 2000;
  const dur      = clampMs(baseTime / (rodSpeed * speedFromLevel(fishLvl)));
  const now      = performance.now();

  state.selectedSpotId = spot.id;

  state.action = {
    type: 'fish',
    label: `Fish ${spot.name || spot.id}`,
    startedAt: now,
    endsAt: now + dur,
    duration: dur,
    spotId: spot.id
  };

  setTimeout(()=>{
    if (state.action?.type === 'fish' && state.action?.spotId === spot.id){
      onDone?.();
    }
  }, dur);

  return true;
}

export function finishFish(state, spotOrId){
  const spot = resolveSpot(state, spotOrId) || FISHING_SPOTS.find(s=>s.id===state.action?.spotId);
  if (!spot){ state.action = null; return 0; }

  const drops = [];
  drops.push(...awardPrimary(state, spot));   // primary fish
  drops.push(...awardBonus(state, spot));     // rare extras (e.g., caviar)

  // Essence roll
  const essence = Math.random() < 0.10;
  if (essence) { addItem(state, SEA_ESSENCE_ID, 1); drops.push({ id: SEA_ESSENCE_ID, qty: 1 }); }

  // XP
  state.fishXp = (state.fishXp || 0) + (spot.xp || 0);

  // clear action
  state.action = null;

  return { drops, essence, xp: (spot.xp || 0) };
}

/* ---------- save migration ---------- */
// Call this once on load after state is available
export function migrateFishingItemsV1(state){
  // Replace legacy dolphin items with bluefin tuna equivalents
  const rawD = state.inventory?.['raw_dolphin'] || 0;
  if (rawD > 0){
    delete state.inventory['raw_dolphin'];
    state.inventory['raw_bluefin_tuna'] = (state.inventory['raw_bluefin_tuna'] || 0) + rawD;
  }
  const cookedD = state.inventory?.['dolphin'] || 0;
  if (cookedD > 0){
    delete state.inventory['dolphin'];
    state.inventory['bluefin_tuna'] = (state.inventory['bluefin_tuna'] || 0) + cookedD;
  }

  // Ensure inventory object exists
  if (!state.inventory) state.inventory = {};
}
