// /systems/mining.js
import { ROCKS } from '../data/mining.js';
import { addItem } from './inventory.js';
import { ITEMS } from '../data/items.js';
import { buildXpTable, levelFromXp } from './xp.js';

const XP_TABLE = buildXpTable();
const speedFromLevel = (lvl)=> 1 + 0.03*(lvl-1); // +3% per Mining level
const clampMs = (ms)=> Math.max(100, ms);
export const ROCK_ESSENCE_ID = 'rock_essence';

function baseId(id){ return String(id||'').split('@')[0]; }

/* ---------- helpers ---------- */
export function listRocks(_state){
  return ROCKS;
}

function resolveRock(state, rockOrId){
  if (!rockOrId) return ROCKS.find(r=>r.id===state.selectedRockId) || ROCKS[0] || null;
  if (typeof rockOrId === 'string') return ROCKS.find(r=>r.id===rockOrId) || null;
  if (rockOrId && rockOrId.id) return ROCKS.find(r=>r.id===rockOrId.id) || rockOrId;
  return null;
}

function requiredLevel(rock){ return rock.level || 1; }

function pickSpeedFromState(state){
  const pickId = state.equipment?.pick || '';
  const def    = ITEMS[baseId(pickId)] || {};
  const base   = Number(def.speed || 1);
  const swift  = Number(state.equipmentMods?.pick?.swift?.addSpeed || 0);
  return base + swift;
}

/* ---------- ui-facing api ---------- */
export function canMine(state, rockOrId){
  //if (state.action) return false;
  const rock = resolveRock(state, rockOrId);
  if (!rock) return false;
  const lvl = levelFromXp(state.minXp || 0, XP_TABLE);
  return lvl >= requiredLevel(rock);
}

export function startMine(state, rockOrId, onDone){
  const rock = resolveRock(state, rockOrId);
  if (!rock || !canMine(state, rock)) return false;

  const minLvl    = levelFromXp(state.minXp || 0, XP_TABLE);
  const pickSpeed = pickSpeedFromState(state);
  const baseTime  = rock.baseTime || 2000;
  const dur       = clampMs(baseTime / (pickSpeed * speedFromLevel(minLvl)));
  const now       = performance.now();

  state.selectedRockId = rock.id;

  state.action = {
    type: 'mine',
    label: `Mine ${rock.name || rock.id}`,
    startedAt: now,
    endsAt: now + dur,
    duration: dur,
    rockId: rock.id
  };

  setTimeout(()=>{
    if (state.action?.type === 'mine' && state.action?.rockId === rock.id){
      onDone?.();
    }
  }, dur);

  return true;
}

export function finishMine(state, rockOrId){
  const rock = resolveRock(state, rockOrId) || ROCKS.find(r=>r.id===state.action?.rockId);
  if (!rock){ state.action = null; return 0; }

  addItem(state, rock.drop, 1);
  const essence = Math.random() < 0.10;
  if (essence) addItem(state, ROCK_ESSENCE_ID, 1);

  state.minXp = (state.minXp || 0) + (rock.xp || 0);
  state.action = null;
  return { qty: 1, essence };
}
