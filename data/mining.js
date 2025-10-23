// data/mining.js
export const ROCKS = [
  { id:'copper', name:'Copper Rock', level:1, baseTime:2500, drop:'ore_copper', xp:12,
    bonusDrops:[
      { id:'gem_sapphire', chance:0.002 }
    ]},

  { id:'sand_vein', name:'Sand Vein', level:5, baseTime:2800, drop:'silica_sand', xp:12,
    bonusDrops:[
      { id:'gem_sapphire', chance:0.003 }
    ]},

  { id:'tin_rock', name:'Tin Seam', level:10, baseTime:3200, xp:25, drop:'ore_tin',
    bonusDrops:[
      { id:'gem_sapphire', chance:0.006 },
      { id:'gem_emerald',  chance:0.004 }
    ]},

  { id:'iron_rock', name:'Iron Deposit', level:20, baseTime:4000, xp:40, drop:'ore_iron',
    bonusDrops:[
      { id:'gem_sapphire', chance:0.013 },
      { id:'gem_ruby',     chance:0.011 },
      { id:'gem_emerald',  chance:0.009 }
    ]},

  { id:'coal_rock', name:'Coal Bed', level:30, baseTime:4200, xp:60, drop:'ore_coal',
    bonusDrops:[
      { id:'gem_sapphire', chance:0.015 },
      { id:'gem_ruby',     chance:0.012 },
      { id:'gem_diamond',  chance:0.006 }
    ]},

  { id:'nightiron_vein', name:'Nightiron Vein', level:40, baseTime:5600, xp:90, drop:'ore_nightiron',
    bonusDrops:[
      { id:'gem_ruby',     chance:0.014 },
      { id:'gem_emerald',  chance:0.01 },
      { id:'gem_diamond',  chance:0.008 }
    ]},

  { id:'asterium_cluster', name:'Asterium Cluster', level:52, baseTime:6000, xp:135, drop:'ore_asterium',
    bonusDrops:[
      { id:'gem_sapphire',  chance:0.02 },
      { id:'gem_ruby',      chance:0.016 },
      { id:'gem_emerald',   chance:0.012 },
      { id:'gem_diamond',   chance:0.009 },
      { id:'gem_starstone', chance:0.003 }
    ]},
  { id:'draconyx_vein', name:'Draconyx Vein', level:64, baseTime:7200, xp:200, drop:'ore_draconyx',
    bonusDrops:[
      { id:'gem_sapphire',  chance:0.024 },
      { id:'gem_ruby',      chance:0.019 },
      { id:'gem_emerald',   chance:0.014 },
      { id:'gem_diamond',   chance:0.011 },
      { id:'gem_starstone', chance:0.004 }
    ]},
/*
  { id:'voidcoal_deposit', name:'Void Coal Deposit', level:70, baseTime:8000, xp:280, drop:'ore_voidcoal',
    bonusDrops:[
      { id:'gem_ruby',      chance:0.022 },
      { id:'gem_emerald',   chance:0.017 },
      { id:'gem_diamond',   chance:0.013 },
      { id:'gem_starstone', chance:0.006 }
    ]},

  { id:'luminite_crystal', name:'Luminite Crystal', level:75, baseTime:8800, xp:350, drop:'ore_luminite',
    bonusDrops:[
      { id:'gem_emerald',   chance:0.020 },
      { id:'gem_diamond',   chance:0.016 },
      { id:'gem_starstone', chance:0.008 }
    ]}, */
];
