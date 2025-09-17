// data/cooking.js
// Map RAW id → cooked id, base time (ms), and XP awarded on success.
export const COOK_RECIPES = {
  raw_shrimps: { cooked:'shrimps', xp:10, lvl: 2 },
  raw_trout:   { cooked:'trout',   xp:15, lvl: 6 },
  raw_eel:     { cooked:'eel',     xp:24, lvl: 12 },
  raw_salmon:  { cooked:'salmon',  xp:50, lvl: 24 },
  raw_halibut: { cooked:'halibut', xp:75, lvl: 36 },
  raw_manta_ray: { cooked:'manta_ray', xp:120, lvl: 48 },
  raw_angler:    { cooked:'angler',    xp:175, lvl: 60 },
  raw_dolphin:   { cooked:'dolphin',   xp:250, lvl: 75 },
};
  
  export function canCookId(id){
    const base = String(id||'').split('@')[0];
    return !!COOK_RECIPES[base];
  }
  