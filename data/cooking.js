// data/cooking.js
// Map RAW id → cooked id, base time (ms), and XP awarded on success.
export const COOK_RECIPES = {
  raw_shrimps: { cooked:'shrimps', id: 'shrimps', xp:10, level: 1 },
  raw_trout:   { cooked:'trout',   id: 'trout', xp:15, level: 5 },
  raw_eel:     { cooked:'eel',     id: 'eel', xp:24, level: 12 },
  raw_salmon:  { cooked:'salmon',  id: 'salmon', xp:50, level: 24 },
  raw_halibut: { cooked:'halibut', id: 'halibut', xp:75, level: 36 },
  raw_manta_ray: { cooked:'manta_ray', id: 'manta_ray', xp:120, level: 48 },
  raw_angler:    { cooked:'angler',    id: 'angler', xp:175, level: 60 },
  raw_dolphin:   { cooked:'dolphin',   id: 'dolphin', xp:250, level: 75 },
};
  
  export function canCookId(id){
    const base = String(id||'').split('@')[0];
    return !!COOK_RECIPES[base];
  }
  