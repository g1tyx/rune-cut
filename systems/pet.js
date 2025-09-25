// /systems/pet.js
import { PETS } from '../data/pets.js';
import { levelFromXp, progressFor } from './xp.js';

/**
 * State pet shape (no normalization/backfill):
 * s.pets[id] = { id, xp, level, atk, str, def, acc, maxHit, maxHp, hp }
 */

function defOf(id){
  const d = PETS[id];
  if (!d) throw new Error(`Unknown pet id: ${id}`);
  return d;
}

/** Pure stat derivation from PETS + level (no state writes). */
export function computeDerived(def, level){
  const L = Math.max(1, level|0);
  const steps = L - 1;

  const atk = Math.round((def.baseAtk ?? 0) + (def.growthAtk ?? 0) * steps);
  const str = Math.round((def.baseStr ?? 0) + (def.growthStr ?? 0) * steps);
  const deff = Math.round((def.baseDef ?? 0) + (def.growthDef ?? 0) * steps);
  const acc = (def.baseAcc ?? 0) + (def.growthAcc ?? 0) * steps;

  // Max hit now includes a STR contribution: + 0.3 * STR (rounded at the end)
  const perStr = 0.3;
  const baseMax = (def.baseMaxHit ?? 1) + (def.growthMaxHit ?? 0) * steps;
  const maxHit = Math.round(baseMax + perStr * str);

  const maxHp = Math.round((def.baseHp ?? 1) + (def.growthHp ?? 0) * steps);

  return { atk, str, def: deff, acc, maxHit, maxHp };
}

/** Create a pet at XP=0 using PETS; fill stats; set active if none. */
export function addPet(s, id){
  const def = defOf(id);
  s.pets = s.pets || {};
  if (s.pets[id]) return s.pets[id];

  const xp = 0;
  const level = levelFromXp(xp);
  const core  = computeDerived(def, level);

  const pet = { id, xp, level, ...core, hp: core.maxHp };
  s.pets[id] = pet;

  s.ui = s.ui || {};
  if (!s.ui.activePet) s.ui.activePet = id;

  return pet;
}

/** Add XP → recompute level from XP_TABLE (same as player); re-derive stats on level up. */
export function grantPetXp(s, gained){
  const id = s.ui?.activePet;
  const pet = id && s.pets ? s.pets[id] : null;
  if (!pet) return { gained: 0, oldLevel: 0, newLevel: 0, progress: null };

  const add = Math.max(0, gained|0);
  const oldLevel = levelFromXp(pet.xp|0);

  pet.xp = (pet.xp|0) + add;

  const newLevel = levelFromXp(pet.xp|0);
  if (newLevel !== pet.level){
    applyLevelAndRecalc(s, id, newLevel);   // full heal per your rule
  } else {
    // Keep maxHp in sync and clamp current hp
    const def = defOf(id);
    const core = computeDerived(def, pet.level);
    pet.maxHp = core.maxHp;
    pet.hp = Math.min(pet.hp|0, pet.maxHp);
  }

  return { gained: add, oldLevel, newLevel, progress: progressFor(pet.xp|0) };
}

/** Set level explicitly, re-derive stats, and fully heal. */
export function applyLevelAndRecalc(s, id, level){
  const pet = s.pets?.[id];
  if (!pet) throw new Error(`applyLevelAndRecalc: missing pet ${id}`);
  const def = defOf(id);

  pet.level = Math.max(1, level|0);
  const core = computeDerived(def, pet.level);
  Object.assign(pet, core);
  pet.hp = pet.maxHp;
}

/** Snapshot current pet stats from STATE for combat (XP → level via XP_TABLE). */
export function seedPetForCombat(s){
  const id = s.ui?.activePet;
  const pet = id && s.pets ? s.pets[id] : null;
  if (!pet) return null;

  const def = defOf(id);
  const level = levelFromXp(pet.xp|0);
  const core  = computeDerived(def, level);

  return {
    id,
    name: def.name || id,
    atk: core.atk,
    str: core.str,
    def: core.def,
    acc: core.acc,
    maxHit: core.maxHit,
    maxHp: core.maxHp,
    hp: Math.min(pet.hp|0, core.maxHp),
  };
}

/** UI helper for tooltips (xp → prev/next/pct). */
export function petProgress(s, id){
  const pet = s.pets?.[id];
  if (!pet) return null;
  return progressFor(pet.xp|0);
}
