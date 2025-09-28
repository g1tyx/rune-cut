// /data/construction.js
// Building data + helpers for the camp palette

// XP per blueprint
const XP_TABLE = {
    oak_hut_t1: 50,  oak_hut_t2: 70,  oak_hut_t3: 90,  oak_hut_t4: 110, oak_hut_t5: 140,
    pine_hut_t1: 180, pine_hut_t2: 220, pine_hut_t3: 270, pine_hut_t4: 330, pine_hut_t5: 400,
  
    birch_hut_t1: 450, birch_hut_t2: 550, birch_hut_t3: 670, birch_hut_t4: 810, birch_hut_t5: 1000,
  
    cedar_hut_t1: 1100, cedar_hut_t2: 1350, cedar_hut_t3: 1600, cedar_hut_t4: 1950, cedar_hut_t5: 2300,
    elderwood_hut_t1: 2500, elderwood_hut_t2: 3000, elderwood_hut_t3: 3600, elderwood_hut_t4: 4300, elderwood_hut_t5: 5000,
  
    campfire_t1: 60,  campfire_t2: 90,  campfire_t3: 120, campfire_t4: 170, campfire_t5: 230,
    bonfire_t1: 280,  bonfire_t2: 360,  bonfire_t3: 450, bonfire_t4: 550, bonfire_t5: 660,
  
    crafting_table_t1: 220, crafting_table_t2: 320, crafting_table_t3: 500, crafting_table_t4: 700, crafting_table_t5: 1000
  };
  
  export function CONSTRUCT_XP(id){ return XP_TABLE[id] || 20; }
  
  /** BUILDINGS: each blueprint is a node in an improve/upgrade chain.
   * - improvesTo: next tier within same wood type (T1→T2→…→T5)
   * - upgradesTo: next material family after T5
   * - effects: additive bonuses the systems aggregate
   * - showInPalette: only Tier-1 cards visible in build palette
   */
  export const BUILDINGS = {
    // ---------------- OAK HUT chain (AFK extend) ----------------
    oak_hut_t1: {
      id: 'oak_hut_t1',
      name: 'Oak Hut (T1)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/oak_hut.png',
      recipe: [{ id: 'plank_oak', qty: 20 }, { id: 'nails', qty: 40}],
      time: 3000,
      xp: CONSTRUCT_XP('oak_hut_t1'),
      effects: [{ type: 'afk_extend', seconds: 10 }],
      improvesTo: 'oak_hut_t2',
      showInPalette: true
    },
    oak_hut_t2: {
      id: 'oak_hut_t2',
      name: 'Oak Hut (T2)',
      recipe: [{ id: 'plank_oak', qty: 30 }, { id: 'nails', qty: 50}],
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/oak_hut.png',
      time: 3500,
      xp: CONSTRUCT_XP('oak_hut_t2'),
      effects: [{ type: 'afk_extend', seconds: 14 }],
      improvesTo: 'oak_hut_t3'
    },
    oak_hut_t3: {
      id: 'oak_hut_t3',
      name: 'Oak Hut (T3)',
      recipe: [{ id: 'plank_oak', qty: 45 }, { id: 'nails', qty: 60}],
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/oak_hut.png',
      time: 3800,
      xp: CONSTRUCT_XP('oak_hut_t3'),
      effects: [{ type: 'afk_extend', seconds: 18 }],
      improvesTo: 'oak_hut_t4'
    },
    oak_hut_t4: {
      id: 'oak_hut_t4',
      name: 'Oak Hut (T4)',
      recipe: [{ id: 'plank_oak', qty: 60 }, { id: 'nails', qty: 70}],
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/oak_hut.png',
      time: 4200,
      xp: CONSTRUCT_XP('oak_hut_t4'),
      effects: [{ type: 'afk_extend', seconds: 22 }],
      improvesTo: 'oak_hut_t5'
    },
    oak_hut_t5: {
      id: 'oak_hut_t5',
      name: 'Oak Hut (T5)',
      recipe: [{ id: 'plank_oak', qty: 80 }, { id: 'nails', qty: 80}],
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/oak_hut.png',
      time: 4600,
      xp: CONSTRUCT_XP('oak_hut_t5'),
      effects: [{ type: 'afk_extend', seconds: 26 }],
      upgradesTo: 'pine_hut_t1'
    },
  
    // ---------------- PINE HUT chain ----------------
    pine_hut_t1: {
      id: 'pine_hut_t1',
      name: 'Pine Hut (T1)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/pine_hut.png',
      recipe: [{ id: 'plank_pine', qty: 30 }, { id: 'nails', qty: 50}],
      time: 3600,
      xp: CONSTRUCT_XP('pine_hut_t1'),
      effects: [{ type: 'afk_extend', seconds: 30 }],
      improvesTo: 'pine_hut_t2',
      showInPalette: false
    },
    pine_hut_t2: {
      id: 'pine_hut_t2',
      name: 'Pine Hut (T2)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/pine_hut.png',
      recipe: [{ id: 'plank_pine', qty: 45 }, { id: 'nails', qty: 60}],
      time: 4000,
      xp: CONSTRUCT_XP('pine_hut_t2'),
      effects: [{ type: 'afk_extend', seconds: 36 }],
      improvesTo: 'pine_hut_t3'
    },
    pine_hut_t3: {
      id: 'pine_hut_t3',
      name: 'Pine Hut (T3)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/pine_hut.png',
      recipe: [{ id: 'plank_pine', qty: 60 }, { id: 'nails', qty: 70}],
      time: 4400,
      xp: CONSTRUCT_XP('pine_hut_t3'),
      effects: [{ type: 'afk_extend', seconds: 42 }],
      improvesTo: 'pine_hut_t4'
    },
    pine_hut_t4: {
      id: 'pine_hut_t4',
      name: 'Pine Hut (T4)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/pine_hut.png',
      recipe: [{ id: 'plank_pine', qty: 80 }, { id: 'nails', qty: 80}],
      time: 4800,
      xp: CONSTRUCT_XP('pine_hut_t4'),
      effects: [{ type: 'afk_extend', seconds: 48 }],
      improvesTo: 'pine_hut_t5'
    },
    pine_hut_t5: {
      id: 'pine_hut_t5',
      name: 'Pine Hut (T5)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/pine_hut.png',
      recipe: [{ id: 'plank_pine', qty: 110 }, { id: 'nails', qty: 90}],
      time: 5200,
      xp: CONSTRUCT_XP('pine_hut_t5'),
      effects: [{ type: 'afk_extend', seconds: 55 }],
      upgradesTo: 'birch_hut_t1',
    },
  
    // ---------------- BIRCH HUT chain (new) ----------------
    birch_hut_t1: {
      id: 'birch_hut_t1',
      name: 'Birch Hut (T1)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/birch_hut.png',
      recipe: [{ id: 'plank_birch', qty: 40 }, { id: 'nails', qty: 60}],
      time: 3800,
      xp: CONSTRUCT_XP('birch_hut_t1'),
      effects: [{ type: 'afk_extend', seconds: 62 }],
      improvesTo: 'birch_hut_t2',
      showInPalette: false
    },
    birch_hut_t2: {
      id: 'birch_hut_t2',
      name: 'Birch Hut (T2)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/birch_hut.png',
      recipe: [{ id: 'plank_birch', qty: 60 }, { id: 'nails', qty: 70}],
      time: 4200,
      xp: CONSTRUCT_XP('birch_hut_t2'),
      effects: [{ type: 'afk_extend', seconds: 70 }],
      improvesTo: 'birch_hut_t3'
    },
    birch_hut_t3: {
      id: 'birch_hut_t3',
      name: 'Birch Hut (T3)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/birch_hut.png',
      recipe: [{ id: 'plank_birch', qty: 90 }, { id: 'nails', qty: 80}],
      time: 4600,
      xp: CONSTRUCT_XP('birch_hut_t3'),
      effects: [{ type: 'afk_extend', seconds: 78 }],
      improvesTo: 'birch_hut_t4'
    },
    birch_hut_t4: {
      id: 'birch_hut_t4',
      name: 'Birch Hut (T4)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/birch_hut.png',
      recipe: [{ id: 'plank_birch', qty: 120 }, { id: 'nails', qty: 90}],
      time: 5000,
      xp: CONSTRUCT_XP('birch_hut_t4'),
      effects: [{ type: 'afk_extend', seconds: 86 }],
      improvesTo: 'birch_hut_t5'
    },
    birch_hut_t5: {
      id: 'birch_hut_t5',
      name: 'Birch Hut (T5)',
      size: { w: 320, h: 320 },
      sprite: 'assets/camp/buildings/birch_hut.png',
      recipe: [{ id: 'plank_birch', qty: 160 }, { id: 'nails', qty: 100}],
      time: 5400,
      xp: CONSTRUCT_XP('birch_hut_t5'),
      effects: [{ type: 'afk_extend', seconds: 95 }]
    },
  
    // ---------------- CAMPFIRE chain (Auto-cook) ----------------
    campfire_t1: {
      id: 'campfire_t1',
      name: 'Campfire (T1)',
      size: { w: 120, h: 120 },
      sprite: 'assets/camp/buildings/campfire.png',
      recipe: [{ id: 'log_oak', qty: 40 }],
      time: 2500,
      xp: CONSTRUCT_XP('campfire_t1'),
      effects: [{ type: 'auto_cook', seconds: 15 }],
      improvesTo: 'campfire_t2',
      showInPalette: true
    },
    campfire_t2: {
      id: 'campfire_t2',
      name: 'Campfire (T2)',
      size: { w: 120, h: 120 },
      sprite: 'assets/camp/buildings/campfire.png',
      recipe: [{ id: 'log_oak', qty: 44 }],
      time: 2800,
      xp: CONSTRUCT_XP('campfire_t2'),
      effects: [{ type: 'auto_cook', seconds: 22 }],
      improvesTo: 'campfire_t3'
    },
    campfire_t3: {
      id: 'campfire_t3',
      name: 'Campfire (T3)',
      size: { w: 120, h: 120 },
      sprite: 'assets/camp/buildings/campfire.png',
      recipe: [{ id: 'log_oak', qty: 48 }],
      time: 3200,
      xp: CONSTRUCT_XP('campfire_t3'),
      effects: [{ type: 'auto_cook', seconds: 28 }],
      improvesTo: 'campfire_t4'
    },
    campfire_t4: {
      id: 'campfire_t4',
      name: 'Campfire (T4)',
      size: { w: 120, h: 120 },
      sprite: 'assets/camp/buildings/campfire.png',
      recipe: [{ id: 'log_oak', qty: 52 }],
      time: 3600,
      xp: CONSTRUCT_XP('campfire_t4'),
      effects: [{ type: 'auto_cook', seconds: 34 }],
      improvesTo: 'campfire_t5'
    },
    campfire_t5: {
      id: 'campfire_t5',
      name: 'Campfire (T5)',
      size: { w: 120, h: 120 },
      sprite: 'assets/camp/buildings/campfire.png',
      recipe: [{ id: 'log_oak', qty: 56 }],
      time: 4000,
      xp: CONSTRUCT_XP('campfire_t5'),
      effects: [{ type: 'auto_cook', seconds: 40 }],
      upgradesTo: 'bonfire_t1'
    },
  
    // ---------------- BONFIRE chain ----------------
    bonfire_t1: {
      id: 'bonfire_t1',
      name: 'Bonfire (T1)',
      size: { w: 120, h: 140 },
      sprite: 'assets/camp/buildings/bonfire.png',
      recipe: [{ id: 'log_pine', qty: 45 }],
      time: 3600,
      xp: CONSTRUCT_XP('bonfire_t1'),
      effects: [{ type: 'auto_cook', seconds: 48 }],
      improvesTo: 'bonfire_t2',
      showInPalette: false
    },
    bonfire_t2: {
      id: 'bonfire_t2',
      name: 'Bonfire (T2)',
      size: { w: 120, h: 120 },
      sprite: 'assets/camp/buildings/bonfire.png',
      recipe: [{ id: 'log_pine', qty: 50 }],
      time: 4000,
      xp: CONSTRUCT_XP('bonfire_t2'),
      effects: [{ type: 'auto_cook', seconds: 56 }],
      improvesTo: 'bonfire_t3'
    },
    bonfire_t3: {
      id: 'bonfire_t3',
      name: 'Bonfire (T3)',
      size: { w: 120, h: 120 },
      sprite: 'assets/camp/buildings/bonfire.png',
      recipe: [{ id: 'log_pine', qty: 55 }],
      time: 4400,
      xp: CONSTRUCT_XP('bonfire_t3'),
      effects: [{ type: 'auto_cook', seconds: 64 }],
      improvesTo: 'bonfire_t4'
    },
    bonfire_t4: {
      id: 'bonfire_t4',
      name: 'Bonfire (T4)',
      size: { w: 120, h: 120 },
      sprite: 'assets/camp/buildings/bonfire.png',
      recipe: [{ id: 'log_pine', qty: 60 }],
      time: 4800,
      xp: CONSTRUCT_XP('bonfire_t4'),
      effects: [{ type: 'auto_cook', seconds: 72 }],
      improvesTo: 'bonfire_t5'
    },
    bonfire_t5: {
      id: 'bonfire_t5',
      name: 'Bonfire (T5)',
      size: { w: 120, h: 120 },
      sprite: 'assets/camp/buildings/bonfire.png',
      recipe: [{ id: 'log_pine', qty: 65 }],
      time: 5200,
      xp: CONSTRUCT_XP('bonfire_t5'),
      effects: [{ type: 'auto_cook', seconds: 80 }]
    },
  
    // ---------------- CRAFTING TABLE chain (new) ----------------
    // Each tier grants bigger batch sizes; UI can read via craft_batch_max effect.
    crafting_table_t1: {
      id: 'crafting_table_t1',
      name: 'Crafting Table (T1)',
      size: { w: 220, h: 140 },
      sprite: 'assets/camp/buildings/crafting_table.png',
      recipe: [{ id: 'log_oak', qty: 100 }, { id: 'wire_coil', qty: 10 }],
      time: 2400,
      xp: CONSTRUCT_XP('crafting_table_t1'),
      effects: [{ type: 'craft_batch_max', max: 2 }],
      improvesTo: 'crafting_table_t2',
      showInPalette: true
    },
    crafting_table_t2: {
      id: 'crafting_table_t2',
      name: 'Crafting Table (T2)',
      size: { w: 220, h: 140 },
      sprite: 'assets/camp/buildings/crafting_table.png',
      recipe: [{ id: 'log_pine', qty: 100 }, { id: 'silk_coil', qty: 12 }],
      time: 2800,
      xp: CONSTRUCT_XP('crafting_table_t2'),
      effects: [{ type: 'craft_batch_max', max: 5 }],
      improvesTo: 'crafting_table_t3'
    },
    crafting_table_t3: {
      id: 'crafting_table_t3',
      name: 'Crafting Table (T3)',
      size: { w: 220, h: 140 },
      sprite: 'assets/camp/buildings/crafting_table.png',
      recipe: [{ id: 'log_birch', qty: 120 }, { id: 'nylon_coil', qty: 14 }],
      time: 3200,
      xp: CONSTRUCT_XP('crafting_table_t3'),
      effects: [{ type: 'craft_batch_max', max: 10 }],
      improvesTo: 'crafting_table_t4'
    },
    crafting_table_t4: {
      id: 'crafting_table_t4',
      name: 'Crafting Table (T4)',
      size: { w: 220, h: 140 },
      sprite: 'assets/camp/buildings/crafting_table.png',
      recipe: [{ id: 'log_cedar', qty: 140 }, { id: 'crypt_cord', qty: 15 }],
      time: 3600,
      xp: CONSTRUCT_XP('crafting_table_t4'),
      effects: [{ type: 'craft_batch_max', max: 25 }],
      //improvesTo: 'crafting_table_t5'
    },
    /** 
    crafting_table_t5: {
      id: 'crafting_table_t5',
      name: 'Crafting Table (T5)',
      size: { w: 220, h: 140 },
      sprite: 'assets/camp/buildings/crafting_table_t5.png',
      recipe: [{ id: 'log_maple', qty: 300 }, { id: 'wire_coil', qty: 45 }],
      time: 4000,
      xp: CONSTRUCT_XP('crafting_table_t5'),
      effects: [{ type: 'craft_batch_unlimited', max: Infinity }]
    }
      */
  };
  
  /** Returns the list of palette blueprints (Tier-1 entries) */
  export function buildBuildings(_state){
    return Object.values(BUILDINGS).filter(b => b.showInPalette);
  }
  
  /** Helper: derive craft batch toggle options from placed Crafting Table tier.
   *  Reads state.camp.placed[].id and returns an array of allowed options.
   *  Use in UI to render toggle buttons.
   */
  export function craftBatchOptions(state){
    const placed = (state?.camp?.placed || []).map(p => String(p?.id || ''));
    // find highest crafting_table tier placed
    const tiers = [
      'crafting_table_t1',
      'crafting_table_t2',
      'crafting_table_t3',
      'crafting_table_t4',
      'crafting_table_t5'
    ];
    let best = 0;
    for (let i = tiers.length - 1; i >= 0; i--){
      if (placed.includes(tiers[i])) { best = i + 1; break; }
    }
    if (best === 0) return [1];           // no table
    if (best === 1) return [1, 2];
    if (best === 2) return [1, 2, 5];
    if (best === 3) return [1, 2, 5, 10];
    if (best === 4) return [1, 2, 5, 10, 25];
    return [1, 2, 5, 10, 25, 'X'];        // T5 unlimited
  }
  
  /** Helper: get numeric max (Infinity for T5) */
  export function craftBatchMax(state){
    const opts = craftBatchOptions(state);
    if (opts.includes('X')) return Infinity;
    return Math.max(...opts);
  }
  