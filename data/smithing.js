// /data/smithing.js

export const SMELT_RECIPES = {
  bar_copper: {
    id:'bar_copper', name:'Copper Bar',
    level:1, time:2000, reqSkill:'smith', speedSkill:'smith',
    inputs:[{ id:'ore_copper', qty:1 }],
    outputs:[{ id:'bar_copper', qty:1 }],
    xp:[{ skill:'smith', amount:6 }]
  },
  glass_glob: {
    id:'glass_glob', name:'Glass Glob',
    level:1, time:2200, reqSkill:'smith', speedSkill:'smith',
    inputs:[{ id:'silica_sand', qty:1 }],
    outputs:[{ id:'glass_glob', qty:1 }],
    xp:[{ skill:'smith', amount:10 }]
  },
  bar_bronze: {
    id:'bar_bronze', name:'Bronze Bar',
    level:10, time:2000, reqSkill:'smith', speedSkill:'smith',
    inputs:[{ id:'ore_copper', qty:1 }, { id:'ore_tin', qty:1 }],
    outputs:[{ id:'bar_bronze', qty:1 }],
    xp:[{ skill:'smith', amount:15 }]
  },
  bar_iron: {
    id:'bar_iron', name:'Iron Bar',
    level:20, time:2000, reqSkill:'smith', speedSkill:'smith',
    inputs:[{ id:'ore_iron', qty:2 }],
    outputs:[{ id:'bar_iron', qty:1 }],
    xp:[{ skill:'smith', amount:25 }]
  },
  bar_steel: {
    id:'bar_steel', name:'Steel Bar',
    level:30, time:2200, reqSkill:'smith', speedSkill:'smith',
    inputs:[{ id:'ore_iron', qty:1 }, { id:'ore_coal', qty:1 }],
    outputs:[{ id:'bar_steel', qty:1 }],
    xp:[{ skill:'smith', amount:40 }]
  },
  bar_blacksteel: {
    id:'bar_blacksteel', name:'Blacksteel Bar',
    level:40, time:2600, reqSkill:'smith', speedSkill:'smith',
    inputs:[{ id:'ore_nightiron', qty:2 }, { id:'ore_coal', qty:1 }],
    outputs:[{ id:'bar_blacksteel', qty:1 }],
    xp:[{ skill:'smith', amount:60 }]
  },
  bar_starsteel: {
    id:'bar_starsteel', name:'Starsteel Bar',
    level:50, time:3000, reqSkill:'smith', speedSkill:'smith',
    inputs:[{ id:'ore_asterium', qty:2 }, { id:'ore_coal', qty:2 }],
    outputs:[{ id:'bar_starsteel', qty:1 }],
    xp:[{ skill:'smith', amount:90 }]
  },
  bar_draconyx: {
    id:'bar_draconyx', name:'Draconyx Bar',
    level:60, time:3400, reqSkill:'smith', speedSkill:'smith',
    inputs:[{ id:'ore_draconyx', qty:2 }, { id:'ore_coal', qty:3 }],
    outputs:[{ id:'bar_starsteel', qty:1 }],
    xp:[{ skill:'smith', amount:125 }]
  },
};

export const FORGE_RECIPES = [
  // ----- Copper -----
  { id:'copper_helm',   name:'Copper Helm',      level:2,  time:2000, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:2}], outputs:[{id:'copper_helm',qty:1}],  xp:[{skill:'smith',amount:16}] },
  { id:'copper_plate',  name:'Copper Platebody', level:5,  time:3200, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:5}], outputs:[{id:'copper_plate',qty:1}], xp:[{skill:'smith',amount:40}] },
  { id:'copper_legs',   name:'Copper Platelegs', level:3,  time:2800, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:4}], outputs:[{id:'copper_legs',qty:1}],  xp:[{skill:'smith',amount:32}] },
  { id:'copper_gloves', name:'Copper Gloves',    level:1,  time:1500, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:1}], outputs:[{id:'copper_gloves',qty:1}],xp:[{skill:'smith',amount:8}] },
  { id:'copper_boots',  name:'Copper Boots',     level:1,  time:1500, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:1}], outputs:[{id:'copper_boots',qty:1}], xp:[{skill:'smith',amount:8}] },
  { id:'copper_shield', name:'Copper Shield',    level:4,  time:2600, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:3}], outputs:[{id:'copper_shield',qty:1}],xp:[{skill:'smith',amount:24}] },
  { id:'copper_dagger', name:'Copper Dagger',    level:1,  time:1600, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:1},{id:'wood_handle',qty:1}], outputs:[{id:'copper_dagger',qty:1}], xp:[{skill:'smith',amount:10}] },
  { id:'copper_sword',  name:'Copper Sword',     level:3,  time:2600, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'copper_sword',qty:1}],  xp:[{skill:'smith',amount:28}] },
  { id:'copper_hammer', name:'Copper hammer',    level:4,  time:2600, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'copper_hammer',qty:1}], xp:[{skill:'smith',amount:28}] },
  { id:'axe_copper',    name:'Copper Axe',       level:1,  time:2200, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'axe_copper',qty:1}],    xp:[{skill:'smith',amount:19}], quality:false },
  { id:'pick_copper',   name:'Copper Pickaxe',   level:1,  time:2400, reqSkill:'smith', speedSkill:'smith', metal:'copper', inputs:[{id:'bar_copper',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'pick_copper',qty:1}],   xp:[{skill:'smith',amount:19}], quality:false },

  // ----- Bronze -----
  { id:'bronze_helm',   name:'Bronze Helm',      level:11, time:2600, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:2}], outputs:[{id:'bronze_helm',qty:1}],   xp:[{skill:'smith',amount:40}] },
  { id:'bronze_plate',  name:'Bronze Platebody', level:15, time:3400, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:5}], outputs:[{id:'bronze_plate',qty:1}],  xp:[{skill:'smith',amount:100}] },
  { id:'bronze_legs',   name:'Bronze Platelegs', level:13, time:3000, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:4}], outputs:[{id:'bronze_legs',qty:1}],   xp:[{skill:'smith',amount:80}] },
  { id:'bronze_gloves', name:'Bronze Gloves',    level:10, time:2000, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:1}], outputs:[{id:'bronze_gloves',qty:1}], xp:[{skill:'smith',amount:20}] },
  { id:'bronze_boots',  name:'Bronze Boots',     level:10, time:2000, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:1}], outputs:[{id:'bronze_boots',qty:1}],  xp:[{skill:'smith',amount:20}] },
  { id:'bronze_shield', name:'Bronze Shield',    level:14, time:3200, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:3}], outputs:[{id:'bronze_shield',qty:1}], xp:[{skill:'smith',amount:60}] },
  { id:'bronze_dagger', name:'Bronze Dagger',    level:10, time:2200, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:1},{id:'wood_handle',qty:1}], outputs:[{id:'bronze_dagger',qty:1}], xp:[{skill:'smith',amount:23}] },
  { id:'bronze_sword',  name:'Bronze Sword',     level:13, time:2800, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'bronze_sword',qty:1}],   xp:[{skill:'smith',amount:65}] },
  { id:'bronze_hammer', name:'Bronze Hammer',    level:15, time:2800, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'bronze_hammer',qty:1}],  xp:[{skill:'smith',amount:65}] },
  { id:'axe_bronze',    name:'Bronze Axe',       level:10, time:2400, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'axe_bronze',qty:1}],     xp:[{skill:'smith',amount:42}], quality:false },
  { id:'pick_bronze',   name:'Bronze Pickaxe',   level:10, time:2600, reqSkill:'smith', speedSkill:'smith', metal:'bronze', inputs:[{id:'bar_bronze',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'pick_bronze',qty:1}],    xp:[{skill:'smith',amount:42}], quality:false },

  // ----- Iron -----
  { id:'iron_helm',   name:'Iron Helm',      level:21, time:3000, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:2}], outputs:[{id:'iron_helm',qty:1}],   xp:[{skill:'smith',amount:66}] },
  { id:'iron_plate',  name:'Iron Platebody', level:25, time:3800, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:5}], outputs:[{id:'iron_plate',qty:1}],  xp:[{skill:'smith',amount:165}] },
  { id:'iron_legs',   name:'Iron Platelegs', level:23, time:3400, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:4}], outputs:[{id:'iron_legs',qty:1}],   xp:[{skill:'smith',amount:132}] },
  { id:'iron_gloves', name:'Iron Gloves',    level:20, time:2400, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:1}], outputs:[{id:'iron_gloves',qty:1}], xp:[{skill:'smith',amount:33}] },
  { id:'iron_boots',  name:'Iron Boots',     level:20, time:2400, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:1}], outputs:[{id:'iron_boots',qty:1}],  xp:[{skill:'smith',amount:33}] },
  { id:'iron_shield', name:'Iron Shield',    level:24, time:3600, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:3}], outputs:[{id:'iron_shield',qty:1}], xp:[{skill:'smith',amount:99}] },
  { id:'iron_dagger', name:'Iron Dagger',    level:20, time:2600, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:1},{id:'wood_handle',qty:1}], outputs:[{id:'iron_dagger',qty:1}], xp:[{skill:'smith',amount:36}] },
  { id:'iron_sword',  name:'Iron Sword',     level:23, time:3200, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'iron_sword',qty:1}],   xp:[{skill:'smith',amount:103}] },
  { id:'iron_hammer', name:'Iron Hammer',    level:25, time:3200, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'iron_hammer',qty:1}],  xp:[{skill:'smith',amount:103}] },
  { id:'axe_iron',    name:'Iron Axe',       level:20, time:2600, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'axe_iron',qty:1}],     xp:[{skill:'smith',amount:70}], quality:false },
  { id:'pick_iron',   name:'Iron Pickaxe',   level:20, time:2800, reqSkill:'smith', speedSkill:'smith', metal:'iron', inputs:[{id:'bar_iron',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'pick_iron',qty:1}],    xp:[{skill:'smith',amount:70}], quality:false },

  // ----- Steel -----
  { id:'steel_helm',   name:'Steel Helm',      level:31, time:3400, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:2}], outputs:[{id:'steel_helm',qty:1}],   xp:[{skill:'smith',amount:100}] },
  { id:'steel_plate',  name:'Steel Platebody', level:35, time:4300, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:5}], outputs:[{id:'steel_plate',qty:1}],  xp:[{skill:'smith',amount:250}] },
  { id:'steel_legs',   name:'Steel Platelegs', level:33, time:3800, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:4}], outputs:[{id:'steel_legs',qty:1}],   xp:[{skill:'smith',amount:200}] },
  { id:'steel_gloves', name:'Steel Gloves',    level:30, time:2700, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:1}], outputs:[{id:'steel_gloves',qty:1}], xp:[{skill:'smith',amount:50}] },
  { id:'steel_boots',  name:'Steel Boots',     level:30, time:2700, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:1}], outputs:[{id:'steel_boots',qty:1}],  xp:[{skill:'smith',amount:50}] },
  { id:'steel_shield', name:'Steel Shield',    level:34, time:4000, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:3}], outputs:[{id:'steel_shield',qty:1}], xp:[{skill:'smith',amount:150}] },
  { id:'steel_dagger', name:'Steel Dagger',    level:30, time:2900, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:1},{id:'wood_handle',qty:1}], outputs:[{id:'steel_dagger',qty:1}], xp:[{skill:'smith',amount:55}] },
  { id:'steel_sword',  name:'Steel Sword',     level:33, time:3600, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'steel_sword',qty:1}],   xp:[{skill:'smith',amount:165}] },
  { id:'steel_hammer', name:'Steel Hammer',    level:35, time:3600, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'steel_hammer',qty:1}],  xp:[{skill:'smith',amount:165}] },
  { id:'axe_steel',    name:'Steel Axe',       level:30, time:2900, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'axe_steel',qty:1}],     xp:[{skill:'smith',amount:110}], quality:false },
  { id:'pick_steel',   name:'Steel Pickaxe',   level:30, time:3100, reqSkill:'smith', speedSkill:'smith', metal:'steel', inputs:[{id:'bar_steel',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'pick_steel',qty:1}],    xp:[{skill:'smith',amount:110}], quality:false },

  // ----- Blacksteel -----
  { id:'blacksteel_helm',   name:'Blacksteel Helm',      level:41, time:3900, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:2}], outputs:[{id:'blacksteel_helm',qty:1}],   xp:[{skill:'smith',amount:180}] },
  { id:'blacksteel_plate',  name:'Blacksteel Platebody', level:45, time:4900, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:5}], outputs:[{id:'blacksteel_plate',qty:1}],  xp:[{skill:'smith',amount:450}] },
  { id:'blacksteel_legs',   name:'Blacksteel Platelegs', level:43, time:4400, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:4}], outputs:[{id:'blacksteel_legs',qty:1}],   xp:[{skill:'smith',amount:360}] },
  { id:'blacksteel_gloves', name:'Blacksteel Gloves',    level:40, time:3100, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:1}], outputs:[{id:'blacksteel_gloves',qty:1}], xp:[{skill:'smith',amount:90}] },
  { id:'blacksteel_boots',  name:'Blacksteel Boots',     level:40, time:3100, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:1}], outputs:[{id:'blacksteel_boots',qty:1}],  xp:[{skill:'smith',amount:90}] },
  { id:'blacksteel_shield', name:'Blacksteel Shield',    level:44, time:4600, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:3}], outputs:[{id:'blacksteel_shield',qty:1}], xp:[{skill:'smith',amount:270}] },
  { id:'blacksteel_dagger', name:'Blacksteel Dagger',    level:40, time:3300, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:1},{id:'wood_handle',qty:1}], outputs:[{id:'blacksteel_dagger',qty:1}], xp:[{skill:'smith',amount:99}] },
  { id:'blacksteel_sword',  name:'Blacksteel Sword',     level:43, time:4100, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'blacksteel_sword',qty:1}],   xp:[{skill:'smith',amount:297}] },
  { id:'blacksteel_axe',    name:'Blacksteel Axe',       level:45, time:4100, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'blacksteel_axe',qty:1}],     xp:[{skill:'smith',amount:297}] },
  { id:'axe_blacksteel',    name:'Blacksteel Axe',       level:40, time:3300, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'axe_blacksteel',qty:1}],     xp:[{skill:'smith',amount:198}], quality:false },
  { id:'pick_blacksteel',   name:'Blacksteel Pickaxe',   level:40, time:3600, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'pick_blacksteel',qty:1}],    xp:[{skill:'smith',amount:198}], quality:false },

  // ----- Starsteel -----
  { id:'starsteel_helm',   name:'Starsteel Helm',      level:51, time:4500, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:2}], outputs:[{id:'starsteel_helm',qty:1}],   xp:[{skill:'smith',amount:300}], rareChance:0.10, rareId:'starsteel_helm_rare' },
  { id:'starsteel_plate',  name:'Starsteel Platebody', level:55, time:5600, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:5}], outputs:[{id:'starsteel_plate',qty:1}],  xp:[{skill:'smith',amount:750}], rareChance:0.10, rareId:'starsteel_plate_rare' },
  { id:'starsteel_legs',   name:'Starsteel Platelegs', level:53, time:5000, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:4}], outputs:[{id:'starsteel_legs',qty:1}],   xp:[{skill:'smith',amount:600}], rareChance:0.10, rareId:'starsteel_legs_rare' },
  { id:'starsteel_gloves', name:'Starsteel Gloves',    level:50, time:3500, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:1}], outputs:[{id:'starsteel_gloves',qty:1}], xp:[{skill:'smith',amount:150}], rareChance:0.10, rareId:'starsteel_gloves_rare' },
  { id:'starsteel_boots',  name:'Starsteel Boots',     level:50, time:3500, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:1}], outputs:[{id:'starsteel_boots',qty:1}],  xp:[{skill:'smith',amount:150}], rareChance:0.10, rareId:'starsteel_boots_rare' },
  { id:'starsteel_shield', name:'Starsteel Shield',    level:54, time:5200, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:3}], outputs:[{id:'starsteel_shield',qty:1}], xp:[{skill:'smith',amount:450}], rareChance:0.10, rareId:'starsteel_shield_rare' },
  { id:'starsteel_dagger', name:'Starsteel Dagger',    level:50, time:3700, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:1},{id:'wood_handle',qty:1}], outputs:[{id:'starsteel_dagger',qty:1}], xp:[{skill:'smith',amount:150}], rareChance:0.10, rareId:'starsteel_dagger_rare' },
  { id:'starsteel_sword',  name:'Starsteel Sword',     level:53, time:4700, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'starsteel_sword',qty:1}],  xp:[{skill:'smith',amount:450}], rareChance:0.10, rareId:'starsteel_sword_rare' },
  { id:'starsteel_axe',    name:'Starsteel Axe',       level:55, time:4700, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:3},{id:'wood_handle',qty:1}], outputs:[{id:'starsteel_axe',qty:1}],    xp:[{skill:'smith',amount:450}], rareChance:0.10, rareId:'starsteel_axe_rare' },
  { id:'axe_starsteel',  name:'Starsteel Axe',     level:50, time:3800, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'axe_starsteel',qty:1}],  xp:[{skill:'smith',amount:300}], quality:false },
  { id:'pick_starsteel', name:'Starsteel Pickaxe', level:50, time:4100, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:2},{id:'wood_handle',qty:1}], outputs:[{id:'pick_starsteel',qty:1}], xp:[{skill:'smith',amount:300}], quality:false },

  { id:'draconyx_helm', name:'Draconyx Helm', level:62, time:5040, reqSkill:'smith', speedSkill:'smith', metal:'draconyx',
    inputs:[{id:'bar_draconyx',qty:2},{id:'dragon_bones',qty:1}],
    outputs:[{id:'draconyx_helm',qty:1}],
    xp:[{skill:'smith',amount:500}],
    rareChance:0.10, rareId:'draconyx_helm_rare' },

  { id:'draconyx_plate', name:'Draconyx Platebody', level:65, time:6270, reqSkill:'smith', speedSkill:'smith', metal:'draconyx',
    inputs:[{id:'bar_draconyx',qty:5},{id:'dragon_bones',qty:1}],
    outputs:[{id:'draconyx_plate',qty:1}],
    xp:[{skill:'smith',amount:1250}],
    rareChance:0.10, rareId:'draconyx_plate_rare' },

  { id:'draconyx_legs', name:'Draconyx Greaves', level:63, time:5600, reqSkill:'smith', speedSkill:'smith', metal:'draconyx',
    inputs:[{id:'bar_draconyx',qty:4},{id:'dragon_bones',qty:1}],
    outputs:[{id:'draconyx_legs',qty:1}],
    xp:[{skill:'smith',amount:1000}],
    rareChance:0.10, rareId:'draconyx_legs_rare' },

  { id:'draconyx_gloves', name:'Draconyx Gauntlets', level:61, time:3920, reqSkill:'smith', speedSkill:'smith', metal:'draconyx',
    inputs:[{id:'bar_draconyx',qty:1},{id:'dragon_bones',qty:1}],
    outputs:[{id:'draconyx_gloves',qty:1}],
    xp:[{skill:'smith',amount:250}],
    rareChance:0.10, rareId:'draconyx_gloves_rare' },

  { id:'draconyx_boots', name:'Draconyx Boots', level:61, time:3920, reqSkill:'smith', speedSkill:'smith', metal:'draconyx',
    inputs:[{id:'bar_draconyx',qty:1},{id:'dragon_bones',qty:1}],
    outputs:[{id:'draconyx_boots',qty:1}],
    xp:[{skill:'smith',amount:250}],
    rareChance:0.10, rareId:'draconyx_boots_rare' },

  { id:'draconyx_sword', name:'Draconyx Sword', level:63, time:5250, reqSkill:'smith', speedSkill:'smith', metal:'draconyx',
    inputs:[{id:'bar_draconyx',qty:3},{id:'wood_handle',qty:1},{id:'dragon_bones',qty:1}],
    outputs:[{id:'draconyx_sword',qty:1}],
    xp:[{skill:'smith',amount:825}],
    rareChance:0.10, rareId:'draconyx_sword_rare' },

  { id:'draconyx_axe', name:'Draconyx Battleaxe', level:64, time:5250, reqSkill:'smith', speedSkill:'smith', metal:'draconyx',
    inputs:[{id:'bar_draconyx',qty:3},{id:'wood_handle',qty:1},{id:'dragon_bones',qty:1}],
    outputs:[{id:'draconyx_axe',qty:1}],
    xp:[{skill:'smith',amount:825}],
    rareChance:0.10, rareId:'draconyx_axe_rare' },
  
    {
      id: 'draconyx_shield',
      name: 'Draconyx Shield',
      level: 64,
      time: 5800,
      reqSkill: 'smith',
      speedSkill: 'smith',
      metal: 'draconyx',
      inputs: [
        { id: 'bar_draconyx', qty: 3 },
        { id: 'dragon_bones', qty: 1 }
      ],
      outputs: [
        { id: 'draconyx_shield', qty: 1 }
      ],
      xp: [
        { skill: 'smith', amount: 750 }
      ],
      rareChance:0.10,
      rareId: 'draconyx_shield_rare'
    },

  { id:'axe_draconyx', name:'Draconyx Axe', level:60, time:4250, reqSkill:'smith', speedSkill:'smith', metal:'draconyx',
    inputs:[{id:'bar_draconyx',qty:2},{id:'wood_handle',qty:1},{id:'dragon_bones',qty:1}],
    outputs:[{id:'axe_draconyx',qty:1}],
    xp:[{skill:'smith',amount:550}],
    quality: false },

  { id:'pick_draconyx', name:'Draconyx Pickaxe', level:60, time:4550, reqSkill:'smith', speedSkill:'smith', metal:'draconyx',
    inputs:[{id:'bar_draconyx',qty:2},{id:'wood_handle',qty:1},{id:'dragon_bones',qty:1}],
    outputs:[{id:'pick_draconyx',qty:1}],
    xp:[{skill:'smith',amount:550}],
    quality: false },

  // Upgrade materials (kind:'material' disables quality)
  { id:'copper_upgrade_bar', name:'Copper Upgrade Bar',   level:5,  time:1200, reqSkill:'smith', speedSkill:'smith', metal:'copper',     inputs:[{id:'bar_copper',qty:3}],     outputs:[{id:'copper_upgrade_bar',qty:1}],   xp:[{skill:'smith',amount:18}],  kind:'material', quality:false },
  { id:'bronze_upgrade_bar', name:'Bronze Upgrade Bar',   level:15, time:2000, reqSkill:'smith', speedSkill:'smith', metal:'bronze',     inputs:[{id:'bar_bronze',qty:3}],     outputs:[{id:'bronze_upgrade_bar',qty:1}],   xp:[{skill:'smith',amount:45}],  kind:'material', quality:false },
  { id:'iron_upgrade_bar',   name:'Iron Upgrade Bar',     level:25, time:2000, reqSkill:'smith', speedSkill:'smith', metal:'iron',       inputs:[{id:'bar_iron',qty:3}],       outputs:[{id:'iron_upgrade_bar',qty:1}],     xp:[{skill:'smith',amount:75}],  kind:'material', quality:false },
  { id:'steel_upgrade_bar',  name:'Steel Upgrade Bar',    level:30, time:2300, reqSkill:'smith', speedSkill:'smith', metal:'steel',      inputs:[{id:'bar_steel',qty:3}],      outputs:[{id:'steel_upgrade_bar',qty:1}],    xp:[{skill:'smith',amount:150}], kind:'material', quality:false },
  { id:'blacksteel_upgrade_bar', name:'Blacksteel Upgrade Bar', level:40, time:2700, reqSkill:'smith', speedSkill:'smith', metal:'blacksteel', inputs:[{id:'bar_blacksteel',qty:3}], outputs:[{id:'blacksteel_upgrade_bar',qty:1}], xp:[{skill:'smith',amount:270}], kind:'material', quality:false },
  { id:'starsteel_upgrade_bar',  name:'Starsteel Upgrade Bar',  level:50, time:2900, reqSkill:'smith', speedSkill:'smith', metal:'starsteel', inputs:[{id:'bar_starsteel',qty:3}], outputs:[{id:'starsteel_upgrade_bar',qty:1}],  xp:[{skill:'smith',amount:450}], kind:'material', quality:false },
  { id:'draconyx_upgrade_bar',  name:'Draconyx Upgrade Bar',  level:60, time:3400, reqSkill:'smith', speedSkill:'smith', metal:'draconyx', inputs:[{id:'bar_draconyx',qty:3}], outputs:[{id:'draconyx_upgrade_bar',qty:1}],  xp:[{skill:'smith',amount:750}], kind:'material', quality:false },
];
