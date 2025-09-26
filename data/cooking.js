// /data/cooking.js
export const COOK_RECIPES = {
  raw_shrimps:      { id:'raw_shrimps',      name:'Shrimps',       level:1,  xp:10,  time:1600, output:{ id:'shrimps',       qty:1 } },
  raw_trout:        { id:'raw_trout',        name:'Trout',         level:5,  xp:15,  time:1650, output:{ id:'trout',         qty:1 } },
  raw_eel:          { id:'raw_eel',          name:'Eel',           level:12, xp:24,  time:1700, output:{ id:'eel',           qty:1 } },
  raw_salmon:       { id:'raw_salmon',       name:'Salmon',        level:24, xp:50,  time:1750, output:{ id:'salmon',        qty:1 } },
  raw_halibut:      { id:'raw_halibut',      name:'Halibut',       level:36, xp:75,  time:1800, output:{ id:'halibut',       qty:1 } },
  raw_manta_ray:    { id:'raw_manta_ray',    name:'Manta Ray',     level:48, xp:120, time:1850, output:{ id:'manta_ray',     qty:1 } },
  raw_angler:       { id:'raw_angler',       name:'Angler',        level:60, xp:175, time:1900, output:{ id:'angler',        qty:1 } },
  raw_bluefin_tuna: { id:'raw_bluefin_tuna', name:'Bluefin Tuna',  level:60, xp:250, time:1950, output:{ id:'bluefin_tuna',  qty:1 } },
  raw_sturgeon:     { id:'raw_sturgeon',     name:'Sturgeon',      level:70, xp:350, time:2000, output:{ id:'sturgeon',      qty:1 } },
};
// Helper to check by baseId (handles quality suffixes if ever added)
export function canCookId(id){
  const base = String(id||'').split('@')[0];
  return !!COOK_RECIPES[base];
}
