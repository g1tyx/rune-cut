// data/smithing.js
export const SMELT_RECIPES = {
  bar_copper: {
    id: 'bar_copper',
    name: 'Copper Bar',
    level: 1,
    time: 2000,
    xp: 6,
    inputs: [{ id: 'ore_copper', qty: 1 }]
  },
  glass_glob: {
    id: 'glass_glob',
    name: 'Glass Glob',
    level: 1,
    time: 2200,
    xp: 10,
    inputs: [{ id: 'silica_sand', qty: 1 }]
  },
  bar_bronze: {
    id: 'bar_bronze',
    name: 'Bronze Bar',
    level: 10,
    time: 2000,
    xp: 15,
    inputs: [{ id: 'ore_copper', qty: 1 }, { id: 'ore_tin', qty: 1 }]
  },
  bar_iron: {
    id: 'bar_iron',
    name: 'Iron Bar',
    level: 20,
    time: 2000,
    xp: 25,
    inputs: [{ id: 'ore_iron', qty: 2 }]
  },
  bar_steel: {
    id: 'bar_steel',
    name: 'Steel Bar',
    level: 30,
    time: 2200,
    xp: 40,
    inputs: [
      { id: 'ore_iron', qty: 1 },
      { id: 'ore_coal', qty: 1 }
    ]
  },
  bar_blacksteel: {
    id: 'bar_blacksteel',
    name: 'Blacksteel Bar',
    level: 40,
    time: 2600,
    xp: 60,
    inputs: [
      { id: 'ore_nightiron', qty: 2 },
      { id: 'ore_coal', qty: 1 }
    ]
  }
};

export const FORGE_RECIPES = [
  // Copper gear
  { id:'copper_helm',   metal:'copper', name:'Copper Helm',       barId:'bar_copper', bars:2, time:2000, xp:16, level:2 },
  { id:'copper_plate',  metal:'copper', name:'Copper Platebody',  barId:'bar_copper', bars:5, time:3200, xp:40, level:5 },
  { id:'copper_legs',   metal:'copper', name:'Copper Platelegs',  barId:'bar_copper', bars:4, time:2800, xp:32, level:3 },
  { id:'copper_gloves', metal:'copper', name:'Copper Gloves',     barId:'bar_copper', bars:1, time:1500, xp:8,  level:1 },
  { id:'copper_boots',  metal:'copper', name:'Copper Boots',      barId:'bar_copper', bars:1, time:1500, xp:8,  level:1 },
  { id:'copper_shield', metal:'copper', name:'Copper Shield',     barId:'bar_copper', bars:3, time:2600, xp:24, level:4 },
  { id:'copper_dagger', metal:'copper', name:'Copper Dagger',     bars:1, time:1600, xp:10,  extras:[{ id:'wood_handle', qty:1 }], level:1 },
  { id:'copper_sword',  metal:'copper', name:'Copper Sword',      bars:3, time:2600, xp:28, extras:[{ id:'wood_handle', qty:1 }], level:3 },
  { id:'copper_hammer', metal:'copper', name:'Copper hammer',     bars:3, time:2600, xp:28, extras:[{ id:'wood_handle', qty:1 }], level:4 },
  { id:'axe_copper',    metal:'copper', name:'Copper Axe',        bars:2, time:2200, xp:19, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:1 },
  { id:'pick_copper',   metal:'copper', name:'Copper Pickaxe',    bars:2, time:2400, xp:19, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:1 },

  // Bronze gear
  { id:'bronze_helm',   metal:'bronze', name:'Bronze Helm',       barId:'bar_bronze', bars:2, time:2600, xp:40, level:11 },
  { id:'bronze_plate',  metal:'bronze', name:'Bronze Platebody',  barId:'bar_bronze', bars:5, time:3400, xp:100, level:15 },
  { id:'bronze_legs',   metal:'bronze', name:'Bronze Platelegs',  barId:'bar_bronze', bars:4, time:3000, xp:80, level:13 },
  { id:'bronze_gloves', metal:'bronze', name:'Bronze Gloves',     barId:'bar_bronze', bars:1, time:2000, xp:20,  level:10 },
  { id:'bronze_boots',  metal:'bronze', name:'Bronze Boots',      barId:'bar_bronze', bars:1, time:2000, xp:20,  level:10 },
  { id:'bronze_shield', metal:'bronze', name:'Bronze Shield',     barId:'bar_bronze', bars:3, time:3200, xp:60, level:14 },
  { id:'bronze_dagger', metal:'bronze', name:'Bronze Dagger',     barId:'bar_bronze', bars:1, time:2200, xp:23, extras:[{ id:'wood_handle', qty:1 }], level:10 },
  { id:'bronze_sword',  metal:'bronze', name:'Bronze Sword',      barId:'bar_bronze', bars:3, time:2800, xp:65, extras:[{ id:'wood_handle', qty:1 }], level:13 },
  { id:'bronze_hammer', metal:'bronze', name:'Bronze Hammer',     barId:'bar_bronze', bars:3, time:2800, xp:65, extras:[{ id:'wood_handle', qty:1 }], level:15 },
  { id:'axe_bronze',    metal:'bronze', name:'Bronze Axe',        barId:'bar_bronze', bars:2, time:2400, xp:42, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:10 },
  { id:'pick_bronze',   metal:'bronze', name:'Bronze Pickaxe',    barId:'bar_bronze', bars:2, time:2600, xp:42, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:10 },

  // Iron gear
  { id:'iron_helm',     metal:'iron',   name:'Iron Helm',         barId:'bar_iron',   bars:2, time:3000, xp:66, level:21 },
  { id:'iron_plate',    metal:'iron',   name:'Iron Platebody',    barId:'bar_iron',   bars:5, time:3800, xp:165, level:25 },
  { id:'iron_legs',     metal:'iron',   name:'Iron Platelegs',    barId:'bar_iron',   bars:4, time:3400, xp:132, level:23 },
  { id:'iron_gloves',   metal:'iron',   name:'Iron Gloves',       barId:'bar_iron',   bars:1, time:2400, xp:33, level:20 },
  { id:'iron_boots',    metal:'iron',   name:'Iron Boots',        barId:'bar_iron',   bars:1, time:2400, xp:33, level:20 },
  { id:'iron_shield',   metal:'iron',   name:'Iron Shield',       barId:'bar_iron',   bars:3, time:3600, xp:99, level:24 },
  { id:'iron_dagger',   metal:'iron',   name:'Iron Dagger',       barId:'bar_iron',   bars:1, time:2600, xp:36, extras:[{ id:'wood_handle', qty:1 }], level:20 },
  { id:'iron_sword',    metal:'iron',   name:'Iron Sword',        barId:'bar_iron',   bars:3, time:3200, xp:103, extras:[{ id:'wood_handle', qty:1 }], level:23 },
  { id:'iron_hammer',   metal:'iron',   name:'Iron Hammer',       barId:'bar_iron',   bars:3, time:3200, xp:103, extras:[{ id:'wood_handle', qty:1 }], level:25 },
  { id:'axe_iron',      metal:'iron',   name:'Iron Axe',          barId:'bar_iron',   bars:2, time:2600, xp:70, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:20 },
  { id:'pick_iron',     metal:'iron',   name:'Iron Pickaxe',      barId:'bar_iron',   bars:2, time:2800, xp:70, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:20 },

  // --- Steel gear (lvl 30+) 
  { id:'steel_helm',     metal:'steel',   name:'Steel Helm',         barId:'bar_steel',   bars:2, time:3400, xp:100, level:31 },
  { id:'steel_plate',    metal:'steel',   name:'Steel Platebody',    barId:'bar_steel',   bars:5, time:4300, xp:250, level:35 },
  { id:'steel_legs',     metal:'steel',   name:'Steel Platelegs',    barId:'bar_steel',   bars:4, time:3800, xp:200, level:33 },
  { id:'steel_gloves',   metal:'steel',   name:'Steel Gloves',       barId:'bar_steel',   bars:1, time:2700, xp:50,  level:30 },
  { id:'steel_boots',    metal:'steel',   name:'Steel Boots',        barId:'bar_steel',   bars:1, time:2700, xp:50,  level:30 },
  { id:'steel_shield',   metal:'steel',   name:'Steel Shield',       barId:'bar_steel',   bars:3, time:4000, xp:150, level:34 },
  { id:'steel_dagger',   metal:'steel',   name:'Steel Dagger',       barId:'bar_steel',   bars:1, time:2900, xp:55,  extras:[{ id:'wood_handle', qty:1 }], level:30 }, // 50 *1.1
  { id:'steel_sword',    metal:'steel',   name:'Steel Sword',        barId:'bar_steel',   bars:3, time:3600, xp:165, extras:[{ id:'wood_handle', qty:1 }], level:33 }, // 150 *1.1
  { id:'steel_hammer',   metal:'steel',   name:'Steel Hammer',       barId:'bar_steel',   bars:3, time:3600, xp:165, extras:[{ id:'wood_handle', qty:1 }], level:35 }, // 150 *1.1
  { id:'axe_steel',      metal:'steel',   name:'Steel Axe',          barId:'bar_steel',   bars:2, time:2900, xp:110, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:30 }, // 100 *1.1
  { id:'pick_steel',     metal:'steel',   name:'Steel Pickaxe',      barId:'bar_steel',   bars:2, time:3100, xp:110, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:30 }, // 100 *1.1

  // --- Blacksteel gear (lvl 40+)
  { id:'blacksteel_helm',   metal:'blacksteel', name:'Blacksteel Helm',       barId:'bar_blacksteel', bars:2, time:3900, xp:180, level:41 },
  { id:'blacksteel_plate',  metal:'blacksteel', name:'Blacksteel Platebody',  barId:'bar_blacksteel', bars:5, time:4900, xp:450, level:45 },
  { id:'blacksteel_legs',   metal:'blacksteel', name:'Blacksteel Platelegs',  barId:'bar_blacksteel', bars:4, time:4400, xp:360, level:43 },
  { id:'blacksteel_gloves', metal:'blacksteel', name:'Blacksteel Gloves',     barId:'bar_blacksteel', bars:1, time:3100, xp:90,  level:40 },
  { id:'blacksteel_boots',  metal:'blacksteel', name:'Blacksteel Boots',      barId:'bar_blacksteel', bars:1, time:3100, xp:90,  level:40 },
  { id:'blacksteel_shield', metal:'blacksteel', name:'Blacksteel Shield',     barId:'bar_blacksteel', bars:3, time:4600, xp:270, level:44 },
  { id:'blacksteel_dagger', metal:'blacksteel', name:'Blacksteel Dagger',     barId:'bar_blacksteel', bars:1, time:3300, xp:99,  extras:[{ id:'wood_handle', qty:1 }], level:40 }, // 90 *1.1
  { id:'blacksteel_sword',  metal:'blacksteel', name:'Blacksteel Sword',      barId:'bar_blacksteel', bars:3, time:4100, xp:297, extras:[{ id:'wood_handle', qty:1 }], level:43 }, // 270 *1.1
  { id:'blacksteel_axe',    metal:'blacksteel', name:'Blacksteel Axe (Wpn)',  barId:'bar_blacksteel', bars:3, time:4100, xp:297, extras:[{ id:'wood_handle', qty:1 }], level:45 }, // 270 *1.1
  { id:'axe_blacksteel',    metal:'blacksteel', name:'Blacksteel Axe',        barId:'bar_blacksteel', bars:2, time:3300, xp:198, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:40 }, // 180 *1.1
  { id:'pick_blacksteel',   metal:'blacksteel', name:'Blacksteel Pickaxe',    barId:'bar_blacksteel', bars:2, time:3600, xp:198, extras:[{ id:'wood_handle', qty:1 }], quality:false, level:40 }, // 180 *1.1

  // Upgrade materials
  { id:'copper_upgrade_bar', name:'Copper Upgrade Bar', metal:'copper', barId:'bar_copper', bars:3, time:1200, xp:18, kind:'material', quality:false, level:5 },
  { id:'bronze_upgrade_bar', name:'Bronze Upgrade Bar', metal:'bronze', barId:'bar_bronze', bars:3, time:2000, xp:45, kind:'material', quality:false, level:15 },
  { id:'iron_upgrade_bar',   name:'Iron Upgrade Bar',   metal:'iron',   barId:'bar_iron',   bars:3, time:2000, xp:75, kind:'material', quality:false, level:25 },
  { id:'steel_upgrade_bar',      name:'Steel Upgrade Bar',      metal:'steel',      barId:'bar_steel',      bars:3, time:2300, xp:150,  kind:'material', quality:false, level:30 },
  { id:'blacksteel_upgrade_bar', name:'Blacksteel Upgrade Bar', metal:'blacksteel', barId:'bar_blacksteel', bars:3, time:2700, xp:270,  kind:'material', quality:false, level:40 },
];
