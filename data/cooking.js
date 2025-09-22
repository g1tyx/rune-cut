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
  raw_bluefin_tuna: { cooked:'bluefin_tuna', id:'bluefin_tuna', xp: 250, level: 60 },
  raw_sturgeon:     { cooked:'sturgeon',     id:'sturgeon',     xp: 350, level: 70 },
};
  
  export function canCookId(id){
    const base = String(id||'').split('@')[0];
    return !!COOK_RECIPES[base];
  }
  