export const FISHING_SPOTS = [
  { id: 'pond_shallows',     name: 'Pond Shallows',  level: 1,  baseTime: 2500, drop: 'raw_shrimps',       xp: 10 },
  { id: 'river_bend',        name: 'River Bend',     level: 5,  baseTime: 2600, drop: 'raw_trout',         xp: 15 },
  { id: 'marsh_eel',         name: 'Marsh',          level: 10, baseTime: 2800, drop: 'raw_eel',           xp: 24 },
  { id: 'salmon_run',        name: 'River',          level: 20, baseTime: 3000, drop: 'raw_salmon',        xp: 50 },
  { id: 'coast_halibut',     name: 'Coast',          level: 30, baseTime: 3400, drop: 'raw_halibut',       xp: 75, bonusDrops: [
      { id: 'coastal_pearls', chance: 0.12, min: 1, max: 2 }
    ] },
  { id: 'open_ocean_manta',  name: 'Open Ocean',     level: 40, baseTime: 3600, drop: 'raw_manta_ray',     xp: 120 },
  { id: 'abyssal_angler',    name: 'Abyssal Trench', level: 50, baseTime: 3800, drop: 'raw_angler',        xp: 175, bonusDrops: [
      { id: 'anglerfish_oil', chance: 0.12, min: 1, max: 2 }
    ] },
  { id: 'bluewater_tuna',    name: 'Bluewater Run',  level: 60, baseTime: 4200, drop: 'raw_bluefin_tuna',  xp: 250 },
  {
    id: 'sturgeon_depths',
    name: 'Sturgeon Depths',
    level: 70,
    baseTime: 4400,
    drop: 'raw_sturgeon',
    xp: 350,
    bonusDrops: [
      { id: 'caviar', chance: 0.05, min: 1, max: 2 }
    ]
  },
];