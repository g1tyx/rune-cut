// /data/construction.js
// Building data + helpers for the camp palette

// XP per blueprint
const XP_TABLE = {
  oak_hut_t1: 50, oak_hut_t2: 70, oak_hut_t3: 90, oak_hut_t4: 110, oak_hut_t5: 140,
  pine_hut_t1: 180, pine_hut_t2: 220, pine_hut_t3: 270, pine_hut_t4: 330, pine_hut_t5: 400,
  birch_hut_t1: 450, birch_hut_t2: 550, birch_hut_t3: 670, birch_hut_t4: 810, birch_hut_t5: 1000,
  cedar_hut_t1: 1100, cedar_hut_t2: 1350, cedar_hut_t3: 1600, cedar_hut_t4: 1950, cedar_hut_t5: 2300,
  willow_hut_t1: 2700, willow_hut_t2: 3300, willow_hut_t3: 4050, willow_hut_t4: 4950, willow_hut_t5: 5850,
  maple_hut_t1: 6700, maple_hut_t2: 8200, maple_hut_t3: 10050, maple_hut_t4: 12300, maple_hut_t5: 14700,
  yew_hut_t1: 16700, yew_hut_t2: 20400, yew_hut_t3: 25000, yew_hut_t4: 30600, yew_hut_t5: 36500,
  runewood_hut_t1: 41000, runewood_hut_t2: 50200, runewood_hut_t3: 61500, runewood_hut_t4: 75000, runewood_hut_t5: 91000,
  campfire_t1: 60, campfire_t2: 90, campfire_t3: 120, campfire_t4: 170, campfire_t5: 230,
  bonfire_t1: 280, bonfire_t2: 360, bonfire_t3: 450, bonfire_t4: 550, bonfire_t5: 660,
  crafting_table_t1: 220, crafting_table_t2: 320, crafting_table_t3: 500, crafting_table_t4: 700, crafting_table_t5: 1000,
  alchemy_table_t1: 275, alchemy_table_t2: 400, alchemy_table_t3: 625, alchemy_table_t4: 875, alchemy_table_t5: 1250,
  anvil_t1: 260, anvil_t2: 380, anvil_t3: 560, anvil_t4: 820
};

export function CONSTRUCT_XP(id){ return XP_TABLE[id] || 20; }

/** BUILDINGS: each blueprint is a node in an improve/upgrade chain. */
export const BUILDINGS = {
  // ---------------- OAK HUT chain (AFK extend) ----------------
  oak_hut_t1: { id:'oak_hut_t1', name:'Oak Hut (T1)', size:{w:320,h:320}, sprite:'assets/camp/buildings/oak_hut.png', recipe:[{id:'plank_oak',qty:20},{id:'nails',qty:40}], time:3000, xp:CONSTRUCT_XP('oak_hut_t1'), effects:[{type:'afk_extend',seconds:10}], improvesTo:'oak_hut_t2', showInPalette:true },
  oak_hut_t2: { id:'oak_hut_t2', name:'Oak Hut (T2)', size:{w:320,h:320}, sprite:'assets/camp/buildings/oak_hut.png', recipe:[{id:'plank_oak',qty:30},{id:'nails',qty:50}], time:3500, xp:CONSTRUCT_XP('oak_hut_t2'), effects:[{type:'afk_extend',seconds:14}], improvesTo:'oak_hut_t3' },
  oak_hut_t3: { id:'oak_hut_t3', name:'Oak Hut (T3)', size:{w:320,h:320}, sprite:'assets/camp/buildings/oak_hut.png', recipe:[{id:'plank_oak',qty:45},{id:'nails',qty:60}], time:3800, xp:CONSTRUCT_XP('oak_hut_t3'), effects:[{type:'afk_extend',seconds:18}], improvesTo:'oak_hut_t4' },
  oak_hut_t4: { id:'oak_hut_t4', name:'Oak Hut (T4)', size:{w:320,h:320}, sprite:'assets/camp/buildings/oak_hut.png', recipe:[{id:'plank_oak',qty:60},{id:'nails',qty:70}], time:4200, xp:CONSTRUCT_XP('oak_hut_t4'), effects:[{type:'afk_extend',seconds:22}], improvesTo:'oak_hut_t5' },
  oak_hut_t5: { id:'oak_hut_t5', name:'Oak Hut (T5)', size:{w:320,h:320}, sprite:'assets/camp/buildings/oak_hut.png', recipe:[{id:'plank_oak',qty:80},{id:'nails',qty:80}], time:4600, xp:CONSTRUCT_XP('oak_hut_t5'), effects:[{type:'afk_extend',seconds:26}], upgradesTo:'pine_hut_t1' },

  // ---------------- PINE HUT chain ----------------
  pine_hut_t1: { id:'pine_hut_t1', name:'Pine Hut (T1)', size:{w:320,h:320}, sprite:'assets/camp/buildings/pine_hut.png', recipe:[{id:'plank_pine',qty:30},{id:'nails',qty:50}], time:3600, xp:CONSTRUCT_XP('pine_hut_t1'), effects:[{type:'afk_extend',seconds:30}], improvesTo:'pine_hut_t2', showInPalette:false },
  pine_hut_t2: { id:'pine_hut_t2', name:'Pine Hut (T2)', size:{w:320,h:320}, sprite:'assets/camp/buildings/pine_hut.png', recipe:[{id:'plank_pine',qty:45},{id:'nails',qty:60}], time:4000, xp:CONSTRUCT_XP('pine_hut_t2'), effects:[{type:'afk_extend',seconds:36}], improvesTo:'pine_hut_t3' },
  pine_hut_t3: { id:'pine_hut_t3', name:'Pine Hut (T3)', size:{w:320,h:320}, sprite:'assets/camp/buildings/pine_hut.png', recipe:[{id:'plank_pine',qty:60},{id:'nails',qty:70}], time:4400, xp:CONSTRUCT_XP('pine_hut_t3'), effects:[{type:'afk_extend',seconds:42}], improvesTo:'pine_hut_t4' },
  pine_hut_t4: { id:'pine_hut_t4', name:'Pine Hut (T4)', size:{w:320,h:320}, sprite:'assets/camp/buildings/pine_hut.png', recipe:[{id:'plank_pine',qty:80},{id:'nails',qty:80}], time:4800, xp:CONSTRUCT_XP('pine_hut_t4'), effects:[{type:'afk_extend',seconds:48}], improvesTo:'pine_hut_t5' },
  pine_hut_t5: { id:'pine_hut_t5', name:'Pine Hut (T5)', size:{w:320,h:320}, sprite:'assets/camp/buildings/pine_hut.png', recipe:[{id:'plank_pine',qty:110},{id:'nails',qty:90}], time:5200, xp:CONSTRUCT_XP('pine_hut_t5'), effects:[{type:'afk_extend',seconds:55}], upgradesTo:'birch_hut_t1' },

  // ---------------- BIRCH HUT chain ----------------
  birch_hut_t1: { id:'birch_hut_t1', name:'Birch Hut (T1)', size:{w:320,h:320}, sprite:'assets/camp/buildings/birch_hut.png', recipe:[{id:'plank_birch',qty:40},{id:'nails',qty:60}], time:3800, xp:CONSTRUCT_XP('birch_hut_t1'), effects:[{type:'afk_extend',seconds:62}], improvesTo:'birch_hut_t2', showInPalette:false },
  birch_hut_t2: { id:'birch_hut_t2', name:'Birch Hut (T2)', size:{w:320,h:320}, sprite:'assets/camp/buildings/birch_hut.png', recipe:[{id:'plank_birch',qty:60},{id:'nails',qty:70}], time:4200, xp:CONSTRUCT_XP('birch_hut_t2'), effects:[{type:'afk_extend',seconds:70}], improvesTo:'birch_hut_t3' },
  birch_hut_t3: { id:'birch_hut_t3', name:'Birch Hut (T3)', size:{w:320,h:320}, sprite:'assets/camp/buildings/birch_hut.png', recipe:[{id:'plank_birch',qty:90},{id:'nails',qty:80}], time:4600, xp:CONSTRUCT_XP('birch_hut_t3'), effects:[{type:'afk_extend',seconds:78}], improvesTo:'birch_hut_t4' },
  birch_hut_t4: { id:'birch_hut_t4', name:'Birch Hut (T4)', size:{w:320,h:320}, sprite:'assets/camp/buildings/birch_hut.png', recipe:[{id:'plank_birch',qty:120},{id:'nails',qty:90}], time:5000, xp:CONSTRUCT_XP('birch_hut_t4'), effects:[{type:'afk_extend',seconds:86}], improvesTo:'birch_hut_t5' },
  birch_hut_t5: { id:'birch_hut_t5', name:'Birch Hut (T5)', size:{w:320,h:320}, sprite:'assets/camp/buildings/birch_hut.png', recipe:[{id:'plank_birch',qty:160},{id:'nails',qty:100}], time:5400, xp:CONSTRUCT_XP('birch_hut_t5'), effects:[{type:'afk_extend',seconds:95}], upgradesTo:'cedar_hut_t1' },

  // ---------------- CEDAR HUT chain ----------------
  cedar_hut_t1: { id:'cedar_hut_t1', name:'Cedar Hut (T1)', size:{w:320,h:320}, sprite:'assets/camp/buildings/cedar_hut.png', recipe:[{id:'plank_cedar',qty:50},{id:'nails',qty:70}], time:5600, xp:CONSTRUCT_XP('cedar_hut_t1'), effects:[{type:'afk_extend',seconds:104}], improvesTo:'cedar_hut_t2', showInPalette:false },
  cedar_hut_t2: { id:'cedar_hut_t2', name:'Cedar Hut (T2)', size:{w:320,h:320}, sprite:'assets/camp/buildings/cedar_hut.png', recipe:[{id:'plank_cedar',qty:70},{id:'nails',qty:80}], time:6000, xp:CONSTRUCT_XP('cedar_hut_t2'), effects:[{type:'afk_extend',seconds:114}], improvesTo:'cedar_hut_t3' },
  cedar_hut_t3: { id:'cedar_hut_t3', name:'Cedar Hut (T3)', size:{w:320,h:320}, sprite:'assets/camp/buildings/cedar_hut.png', recipe:[{id:'plank_cedar',qty:95},{id:'nails',qty:90}], time:6400, xp:CONSTRUCT_XP('cedar_hut_t3'), effects:[{type:'afk_extend',seconds:126}], improvesTo:'cedar_hut_t4' },
  cedar_hut_t4: { id:'cedar_hut_t4', name:'Cedar Hut (T4)', size:{w:320,h:320}, sprite:'assets/camp/buildings/cedar_hut.png', recipe:[{id:'plank_cedar',qty:130},{id:'nails',qty:100}], time:6800, xp:CONSTRUCT_XP('cedar_hut_t4'), effects:[{type:'afk_extend',seconds:138}], improvesTo:'cedar_hut_t5' },
  cedar_hut_t5: { id:'cedar_hut_t5', name:'Cedar Hut (T5)', size:{w:320,h:320}, sprite:'assets/camp/buildings/cedar_hut.png', recipe:[{id:'plank_cedar',qty:180},{id:'nails',qty:110}], time:7200, xp:CONSTRUCT_XP('cedar_hut_t5'), effects:[{type:'afk_extend',seconds:152}], upgradesTo:'willow_hut_t1' },

  // ---------------- WILLOW HUT chain ----------------
  willow_hut_t1: { id:'willow_hut_t1', name:'Willow Hut (T1)', size:{w:320,h:320}, sprite:'assets/camp/buildings/willow_hut.png', recipe:[{id:'plank_willow',qty:60},{id:'nails',qty:80}], time:6800, xp:CONSTRUCT_XP('willow_hut_t1'), effects:[{type:'afk_extend',seconds:166}], improvesTo:'willow_hut_t2', showInPalette:false },
  willow_hut_t2: { id:'willow_hut_t2', name:'Willow Hut (T2)', size:{w:320,h:320}, sprite:'assets/camp/buildings/willow_hut.png', recipe:[{id:'plank_willow',qty:85},{id:'nails',qty:90}], time:7200, xp:CONSTRUCT_XP('willow_hut_t2'), effects:[{type:'afk_extend',seconds:182}], improvesTo:'willow_hut_t3' },
  willow_hut_t3: { id:'willow_hut_t3', name:'Willow Hut (T3)', size:{w:320,h:320}, sprite:'assets/camp/buildings/willow_hut.png', recipe:[{id:'plank_willow',qty:120},{id:'nails',qty:100}], time:7600, xp:CONSTRUCT_XP('willow_hut_t3'), effects:[{type:'afk_extend',seconds:200}], improvesTo:'willow_hut_t4' },
  willow_hut_t4: { id:'willow_hut_t4', name:'Willow Hut (T4)', size:{w:320,h:320}, sprite:'assets/camp/buildings/willow_hut.png', recipe:[{id:'plank_willow',qty:160},{id:'nails',qty:110}], time:8000, xp:CONSTRUCT_XP('willow_hut_t4'), effects:[{type:'afk_extend',seconds:220}], improvesTo:'willow_hut_t5' },
  willow_hut_t5: { id:'willow_hut_t5', name:'Willow Hut (T5)', size:{w:320,h:320}, sprite:'assets/camp/buildings/willow_hut.png', recipe:[{id:'plank_willow',qty:220},{id:'nails',qty:120}], time:8400, xp:CONSTRUCT_XP('willow_hut_t5'), effects:[{type:'afk_extend',seconds:242}], upgradesTo:'maple_hut_t1' },

  // ---------------- MAPLE HUT chain ----------------
  maple_hut_t1: { id:'maple_hut_t1', name:'Maple Hut (T1)', size:{w:400,h:400}, sprite:'assets/camp/buildings/maple_hut.png', recipe:[{id:'plank_maple',qty:75},{id:'nails',qty:100}], time:8000, xp:CONSTRUCT_XP('maple_hut_t1'), effects:[{type:'afk_extend',seconds:268}], improvesTo:'maple_hut_t2', showInPalette:false },
  maple_hut_t2: { id:'maple_hut_t2', name:'Maple Hut (T2)', size:{w:400,h:400}, sprite:'assets/camp/buildings/maple_hut.png', recipe:[{id:'plank_maple',qty:110},{id:'nails',qty:110}], time:8400, xp:CONSTRUCT_XP('maple_hut_t2'), effects:[{type:'afk_extend',seconds:294}], improvesTo:'maple_hut_t3' },
  maple_hut_t3: { id:'maple_hut_t3', name:'Maple Hut (T3)', size:{w:400,h:400}, sprite:'assets/camp/buildings/maple_hut.png', recipe:[{id:'plank_maple',qty:155},{id:'nails',qty:120}], time:8800, xp:CONSTRUCT_XP('maple_hut_t3'), effects:[{type:'afk_extend',seconds:324}], improvesTo:'maple_hut_t4' },
  maple_hut_t4: { id:'maple_hut_t4', name:'Maple Hut (T4)', size:{w:400,h:400}, sprite:'assets/camp/buildings/maple_hut.png', recipe:[{id:'plank_maple',qty:210},{id:'nails',qty:130}], time:9200, xp:CONSTRUCT_XP('maple_hut_t4'), effects:[{type:'afk_extend',seconds:358}], improvesTo:'maple_hut_t5' },
  maple_hut_t5: { id:'maple_hut_t5', name:'Maple Hut (T5)', size:{w:400,h:400}, sprite:'assets/camp/buildings/maple_hut.png', recipe:[{id:'plank_maple',qty:290},{id:'nails',qty:140}], time:9600, xp:CONSTRUCT_XP('maple_hut_t5'), effects:[{type:'afk_extend',seconds:396}], upgradesTo:'yew_hut_t1' },

  // ---------------- YEW HUT chain ----------------
  yew_hut_t1: { id:'yew_hut_t1', name:'Yew Hut (T1)', size:{w:504,h:370}, sprite:'assets/camp/buildings/yew_hut.png', recipe:[{id:'plank_yew',qty:100},{id:'nails',qty:140}], time:9600, xp:CONSTRUCT_XP('yew_hut_t1'), effects:[{type:'afk_extend',seconds:438}], improvesTo:'yew_hut_t2', showInPalette:false },
  yew_hut_t2: { id:'yew_hut_t2', name:'Yew Hut (T2)', size:{w:504,h:370}, sprite:'assets/camp/buildings/yew_hut.png', recipe:[{id:'plank_yew',qty:145},{id:'nails',qty:150}], time:10000, xp:CONSTRUCT_XP('yew_hut_t2'), effects:[{type:'afk_extend',seconds:484}], improvesTo:'yew_hut_t3' },
  yew_hut_t3: { id:'yew_hut_t3', name:'Yew Hut (T3)', size:{w:504,h:370}, sprite:'assets/camp/buildings/yew_hut.png', recipe:[{id:'plank_yew',qty:205},{id:'nails',qty:160}], time:10400, xp:CONSTRUCT_XP('yew_hut_t3'), effects:[{type:'afk_extend',seconds:536}], improvesTo:'yew_hut_t4' },
  yew_hut_t4: { id:'yew_hut_t4', name:'Yew Hut (T4)', size:{w:504,h:370}, sprite:'assets/camp/buildings/yew_hut.png', recipe:[{id:'plank_yew',qty:280},{id:'nails',qty:170}], time:10800, xp:CONSTRUCT_XP('yew_hut_t4'), effects:[{type:'afk_extend',seconds:592}], improvesTo:'yew_hut_t5' },
  yew_hut_t5: { id:'yew_hut_t5', name:'Yew Hut (T5)', size:{w:504,h:370}, sprite:'assets/camp/buildings/yew_hut.png', recipe:[{id:'plank_yew',qty:390},{id:'nails',qty:180}], time:11200, xp:CONSTRUCT_XP('yew_hut_t5'), effects:[{type:'afk_extend',seconds:654}], upgradesTo:'runewood_hut_t1' },

  // ---------------- RUNEWOOD HUT chain ----------------
  runewood_hut_t1: { id:'runewood_hut_t1', name:'Runewood Hut (T1)', size:{w:500,h:500}, sprite:'assets/camp/buildings/runewood_hut.png', recipe:[{id:'plank_runewood',qty:130},{id:'nails',qty:200}], time:11200, xp:CONSTRUCT_XP('runewood_hut_t1'), effects:[{type:'afk_extend',seconds:720}], improvesTo:'runewood_hut_t2', showInPalette:false },
  runewood_hut_t2: { id:'runewood_hut_t2', name:'Runewood Hut (T2)', size:{w:500,h:500}, sprite:'assets/camp/buildings/runewood_hut.png', recipe:[{id:'plank_runewood',qty:190},{id:'nails',qty:220}], time:11600, xp:CONSTRUCT_XP('runewood_hut_t2'), effects:[{type:'afk_extend',seconds:800}], improvesTo:'runewood_hut_t3' },
  runewood_hut_t3: { id:'runewood_hut_t3', name:'Runewood Hut (T3)', size:{w:500,h:500}, sprite:'assets/camp/buildings/runewood_hut.png', recipe:[{id:'plank_runewood',qty:270},{id:'nails',qty:240}], time:12000, xp:CONSTRUCT_XP('runewood_hut_t3'), effects:[{type:'afk_extend',seconds:888}], improvesTo:'runewood_hut_t4' },
  runewood_hut_t4: { id:'runewood_hut_t4', name:'Runewood Hut (T4)', size:{w:500,h:500}, sprite:'assets/camp/buildings/runewood_hut.png', recipe:[{id:'plank_runewood',qty:370},{id:'nails',qty:260}], time:12400, xp:CONSTRUCT_XP('runewood_hut_t4'), effects:[{type:'afk_extend',seconds:984}], improvesTo:'runewood_hut_t5' },
  runewood_hut_t5: { id:'runewood_hut_t5', name:'Runewood Hut (T5)', size:{w:500,h:500}, sprite:'assets/camp/buildings/runewood_hut.png', recipe:[{id:'plank_runewood',qty:520},{id:'nails',qty:280}], time:12800, xp:CONSTRUCT_XP('runewood_hut_t5'), effects:[{type:'afk_extend',seconds:1080}] },

  // ---------------- CAMPFIRE chain ----------------
  campfire_t1: { id:'campfire_t1', name:'Campfire (T1)', size:{w:120,h:120}, sprite:'assets/camp/buildings/campfire.png', recipe:[{id:'log_oak',qty:40}], time:2500, xp:CONSTRUCT_XP('campfire_t1'), effects:[{type:'auto_cook',seconds:15}], improvesTo:'campfire_t2', showInPalette:true },
  campfire_t2: { id:'campfire_t2', name:'Campfire (T2)', size:{w:120,h:120}, sprite:'assets/camp/buildings/campfire.png', recipe:[{id:'log_oak',qty:44}], time:2800, xp:CONSTRUCT_XP('campfire_t2'), effects:[{type:'auto_cook',seconds:22}], improvesTo:'campfire_t3' },
  campfire_t3: { id:'campfire_t3', name:'Campfire (T3)', size:{w:120,h:120}, sprite:'assets/camp/buildings/campfire.png', recipe:[{id:'log_oak',qty:48}], time:3200, xp:CONSTRUCT_XP('campfire_t3'), effects:[{type:'auto_cook',seconds:28}], improvesTo:'campfire_t4' },
  campfire_t4: { id:'campfire_t4', name:'Campfire (T4)', size:{w:120,h:120}, sprite:'assets/camp/buildings/campfire.png', recipe:[{id:'log_oak',qty:52}], time:3600, xp:CONSTRUCT_XP('campfire_t4'), effects:[{type:'auto_cook',seconds:34}], improvesTo:'campfire_t5' },
  campfire_t5: { id:'campfire_t5', name:'Campfire (T5)', size:{w:120,h:120}, sprite:'assets/camp/buildings/campfire.png', recipe:[{id:'log_oak',qty:56}], time:4000, xp:CONSTRUCT_XP('campfire_t5'), effects:[{type:'auto_cook',seconds:40}], upgradesTo:'bonfire_t1' },

  // ---------------- BONFIRE chain ----------------
  bonfire_t1: { id:'bonfire_t1', name:'Bonfire (T1)', size:{w:120,h:140}, sprite:'assets/camp/buildings/bonfire.png', recipe:[{id:'log_pine',qty:45}], time:3600, xp:CONSTRUCT_XP('bonfire_t1'), effects:[{type:'auto_cook',seconds:48}], improvesTo:'bonfire_t2', showInPalette:false },
  bonfire_t2: { id:'bonfire_t2', name:'Bonfire (T2)', size:{w:120,h:120}, sprite:'assets/camp/buildings/bonfire.png', recipe:[{id:'log_pine',qty:50}], time:4000, xp:CONSTRUCT_XP('bonfire_t2'), effects:[{type:'auto_cook',seconds:56}], improvesTo:'bonfire_t3' },
  bonfire_t3: { id:'bonfire_t3', name:'Bonfire (T3)', size:{w:120,h:120}, sprite:'assets/camp/buildings/bonfire.png', recipe:[{id:'log_pine',qty:55}], time:4400, xp:CONSTRUCT_XP('bonfire_t3'), effects:[{type:'auto_cook',seconds:64}], improvesTo:'bonfire_t4' },
  bonfire_t4: { id:'bonfire_t4', name:'Bonfire (T4)', size:{w:120,h:120}, sprite:'assets/camp/buildings/bonfire.png', recipe:[{id:'log_pine',qty:60}], time:4800, xp:CONSTRUCT_XP('bonfire_t4'), effects:[{type:'auto_cook',seconds:72}], improvesTo:'bonfire_t5' },
  bonfire_t5: { id:'bonfire_t5', name:'Bonfire (T5)', size:{w:120,h:120}, sprite:'assets/camp/buildings/bonfire.png', recipe:[{id:'log_pine',qty:65}], time:5200, xp:CONSTRUCT_XP('bonfire_t5'), effects:[{type:'auto_cook',seconds:80}] },

  // ---------------- CRAFTING TABLE chain ----------------
  crafting_table_t1: { id:'crafting_table_t1', name:'Crafting Table (T1)', size:{w:220,h:140}, sprite:'assets/camp/buildings/crafting_table.png', recipe:[{id:'log_oak',qty:100},{id:'wire_coil',qty:10}], time:2400, xp:CONSTRUCT_XP('crafting_table_t1'), effects:[{type:'craft_batch_max',max:2}], improvesTo:'crafting_table_t2', showInPalette:true },
  crafting_table_t2: { id:'crafting_table_t2', name:'Crafting Table (T2)', size:{w:220,h:140}, sprite:'assets/camp/buildings/crafting_table.png', recipe:[{id:'log_pine',qty:100},{id:'silk_coil',qty:12}], time:2800, xp:CONSTRUCT_XP('crafting_table_t2'), effects:[{type:'craft_batch_max',max:5}], improvesTo:'crafting_table_t3' },
  crafting_table_t3: { id:'crafting_table_t3', name:'Crafting Table (T3)', size:{w:220,h:140}, sprite:'assets/camp/buildings/crafting_table.png', recipe:[{id:'log_birch',qty:120},{id:'nylon_coil',qty:14}], time:3200, xp:CONSTRUCT_XP('crafting_table_t3'), effects:[{type:'craft_batch_max',max:10}], improvesTo:'crafting_table_t4' },
  crafting_table_t4: { id:'crafting_table_t4', name:'Crafting Table (T4)', size:{w:220,h:140}, sprite:'assets/camp/buildings/crafting_table.png', recipe:[{id:'log_cedar',qty:140},{id:'crypt_cord',qty:15}], time:3600, xp:CONSTRUCT_XP('crafting_table_t4'), effects:[{type:'craft_batch_max',max:25}] },
  // crafting_table_t5 reserved

  // ---------------- A N V I L  (Forge batch crafting) ----------------
  anvil_t1: { id:'anvil_t1', name:'Anvil (T1)', size:{w:100,h:68}, sprite:'assets/camp/buildings/anvil.png', recipe:[{id:'bar_bronze',qty:20}], time:2600, xp:CONSTRUCT_XP('anvil_t1'), effects:[{type:'forge_batch_max',max:2}], improvesTo:'anvil_t2', showInPalette:true },
  anvil_t2: { id:'anvil_t2', name:'Anvil (T2)', size:{w:100,h:68}, sprite:'assets/camp/buildings/anvil.png', recipe:[{id:'bar_iron',qty:30}], time:3000, xp:CONSTRUCT_XP('anvil_t2'), effects:[{type:'forge_batch_max',max:5}], improvesTo:'anvil_t3' },
  anvil_t3: { id:'anvil_t3', name:'Anvil (T3)', size:{w:100,h:68}, sprite:'assets/camp/buildings/anvil.png', recipe:[{id:'bar_steel',qty:40}], time:3400, xp:CONSTRUCT_XP('anvil_t3'), effects:[{type:'forge_batch_max',max:10}], improvesTo:'anvil_t4' },
  anvil_t4: { id:'anvil_t4', name:'Anvil (T4)', size:{w:100,h:68}, sprite:'assets/camp/buildings/anvil.png', recipe:[{id:'bar_blacksteel',qty:50}], time:3800, xp:CONSTRUCT_XP('anvil_t4'), effects:[{type:'forge_batch_max',max:25}] },

  // ---------------- ALCHEMY TABLE chain ----------------
  alchemy_table_t1: { id:'alchemy_table_t1', name:'Alchemy Table (T1)', size:{w:220,h:140}, sprite:'assets/camp/buildings/alchemy_table.png', recipe:[{id:'plank_oak',qty:30},{id:'potion_mana_small',qty:5},{id:'potion_accuracy',qty:5},{id:'potion_defense',qty:5}], time:2200, xp:CONSTRUCT_XP('alchemy_table_t1'), effects:[{type:'alchemy_batch_max',max:2}], improvesTo:'alchemy_table_t2', showInPalette:true },
  alchemy_table_t2: { id:'alchemy_table_t2', name:'Alchemy Table (T2)', size:{w:220,h:140}, sprite:'assets/camp/buildings/alchemy_table.png', recipe:[{id:'plank_pine',qty:45},{id:'potion_mana_small',qty:7},{id:'potion_accuracy',qty:7},{id:'potion_defense',qty:7}], time:2700, xp:CONSTRUCT_XP('alchemy_table_t2'), effects:[{type:'alchemy_batch_max',max:5}], improvesTo:'alchemy_table_t3' },
  alchemy_table_t3: { id:'alchemy_table_t3', name:'Alchemy Table (T3)', size:{w:220,h:140}, sprite:'assets/camp/buildings/alchemy_table.png', recipe:[{id:'plank_birch',qty:60},{id:'potion_mana_med',qty:5},{id:'potion_advanced_accuracy',qty:5},{id:'potion_advanced_defense',qty:5}], time:3200, xp:CONSTRUCT_XP('alchemy_table_t3'), effects:[{type:'alchemy_batch_max',max:10}], improvesTo:'alchemy_table_t4' },
  alchemy_table_t4: { id:'alchemy_table_t4', name:'Alchemy Table (T4)', size:{w:220,h:140}, sprite:'assets/camp/buildings/alchemy_table.png', recipe:[{id:'plank_cedar',qty:80},{id:'potion_mana_med',qty:7},{id:'potion_advanced_accuracy',qty:7},{id:'potion_advanced_defense',qty:7}], time:3800, xp:CONSTRUCT_XP('alchemy_table_t4'), effects:[{type:'alchemy_batch_max',max:25}] }
};

/** Returns the list of palette blueprints (Tier-1 entries) */
export function buildBuildings(_state){
  return Object.values(BUILDINGS).filter(b => b.showInPalette);
}

/** Helper: derive craft batch toggle options from placed Crafting Table tier. */
export function craftBatchOptions(state){
  const placed = (state?.camp?.placed || []).map(p => String(p?.id || ''));
  const tiers = ['crafting_table_t1','crafting_table_t2','crafting_table_t3','crafting_table_t4','crafting_table_t5'];
  let best = 0; for (let i = tiers.length - 1; i >= 0; i--){ if (placed.includes(tiers[i])) { best = i + 1; break; } }
  if (best === 0) return [1]; if (best === 1) return [1,2]; if (best === 2) return [1,2,5]; if (best === 3) return [1,2,5,10]; if (best === 4) return [1,2,5,10,25]; return [1,2,5,10,25,'X'];
}

/** Helper: get numeric max (Infinity for T5) */
export function craftBatchMax(state){
  const opts = craftBatchOptions(state);
  if (opts.includes('X')) return Infinity;
  return Math.max(...opts);
}

export function alchemyBatchOptions(state){
  const placed = (state?.camp?.placed || []).map(p => String(p?.id || ''));
  const tiers = ['alchemy_table_t1','alchemy_table_t2','alchemy_table_t3','alchemy_table_t4','alchemy_table_t5'];
  let best = 0; for (let i = tiers.length - 1; i >= 0; i--){ if (placed.includes(tiers[i])) { best = i + 1; break; } }
  if (best === 0) return [1]; if (best === 1) return [1,2]; if (best === 2) return [1,2,5]; if (best === 3) return [1,2,5,10]; if (best === 4) return [1,2,5,10,25]; return [1,2,5,10,25,'X'];
}

export function alchemyBatchMax(state){
  const opts = alchemyBatchOptions(state);
  if (opts.includes('X')) return Infinity;
  return Math.max(...opts);
}

export function forgeBatchMax(state){
  const placed = (state?.camp?.placed || []);
  let max = 1;
  for (const p of placed){
    const d = BUILDINGS[p.id];
    if (!d || !Array.isArray(d.effects)) continue;
    for (const eff of d.effects){
      if (eff?.type === 'forge_batch_unlimited') return Infinity;
      if (eff?.type === 'forge_batch_max'){
        const v = Number(eff.max) || 1;
        if (v > max) max = v;
      }
    }
  }
  return max;
}
