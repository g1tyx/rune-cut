export const MONSTERS = [
  /* ---------- Swamp ---------- */
  { id:'bog_mite', name:'Bog Mite', level:1, time:2800,
    zone:'Swamp', hp:12, attack:3, defense:2, maxHit:3, type: 'forest',
    xp:{attack:10,strength:10,defense:10},
    drops:[
      {gold:2, chance:0.7},
      {id:'wire_coil', chance:0.3},
      {id:'small_forest_spirit', chance:0.16}
    ],
    img:'assets/monsters/bog_mite.png'
  },
  { id:'bramble_sprite', name:'Bramble Sprite', level:3, time:3000,
    zone:'Swamp', hp:24, attack:6, defense:4, maxHit:4, type: 'forest',
    xp:{attack:30,strength:30,defense:30},
    drops:[
      {id:'briar_oil', chance:0.25},
      {id:'bramble_heart', chance:0.12},
      {gold:4, chance:0.7},
      {id:'small_forest_spirit', chance:0.20}
    ],
    img:'assets/monsters/bramble_sprite.png'
  },
  { id:'gutter_rat', name:'Gutter Rat', level:7, time:3400,
    zone:'Swamp', hp:48, attack:11, defense:8, maxHit:7, type: 'forest',
    xp:{attack:70,strength:70,defense:70},
    drops:[
      {gold:8, chance:0.7},
      {id:'leather', chance:0.4},
      {id:'small_forest_spirit', chance:0.22}
    ],
    img:'assets/monsters/gutter_rat.png'
  },
  { id:'swamp_spider', name:'Swamp Spider', level:9, time:3600,
    zone:'Swamp', hp:63, attack:13, defense:10, maxHit:8, type: 'forest',
    xp:{attack:90,strength:90,defense:90},
    drops:[
      {gold:11, chance:0.7},
      {id:'silk_coil', chance:0.15},
      {id:'small_forest_spirit', chance:0.24}
    ],
    img:'assets/monsters/swamp_spider.png'
  },
  { id:'toxic_frog', name:'Toxic Frog', level:12, time:3800,
    zone:'Swamp', hp:85, attack:15, defense:11, maxHit:10, type: 'forest',
    xp:{attack:120,strength:120,defense:120},
    drops:[
      {gold:14, chance:0.7},
      {id:'small_forest_spirit', chance:0.27},
      {id: 'redcap_fungus', chance: 0.05},
    ],
    img:'assets/monsters/toxic_frog.png'
  },
  {
    id:'swamp_elemental', name:'Swamp Elemental', level:20,
    zone:'Swamp', hp:120, attack:18, defense:14, maxHit:12, type: 'forest',
    img:'assets/monsters/swamp_elemental.png',
    drops:[
      { id:'quicksilver', chance:0.10, min:1, max:1 },
      { id:'small_forest_spirit', chance:0.32, min:1, max:2 }
    ],
    xp:{attack:200,strength:200,defense:200}
  },
  { id:'bog_hydra', name:'Bog Hydra', level:26, time:4200,
    zone:'Swamp', hp:180, attack:24, defense:18, maxHit:16, type: 'forest',
    xp:{attack:260,strength:260,defense:260},
    drops:[
      {gold:18, chance:0.7},
      {id:'small_forest_spirit', chance:0.38, min:1, max:2},
      {id: 'spotted_mireheart', chance: 0.05},
    ],
    img:'assets/monsters/bog_hydra.png'
  },
  { id:'marsh_colossus', name:'Marsh Colossus', level:32, time:4600,
    zone:'Swamp', hp:260, attack:32, defense:24, maxHit:22, type: 'forest',
    xp:{attack:425,strength:425,defense:425},
    drops:[
      {gold:26, chance:0.7},
      {id:'small_forest_spirit', chance:0.42, min:2, max:3},
      {id: 'gold_necklace', chance: 0.2}
    ],
    img:'assets/monsters/marsh_colossus.png'
  },
  {
    id: 'swamp_guardian', name: 'Swamp Guardian', level: 70, time: 6200,
    zone: 'Swamp', hp: 800, attack: 122, defense: 90, maxHit: 70, type: 'forest',
    xp: { attack: 1170, strength: 1170, defense: 1170 },
    drops: [
      { gold: 350, chance: 0.7 },
      { id: 'swamp_mask', chance: 0.02 },
      { id:'small_forest_spirit', chance:0.55, min:3, max:7 }
    ],
    img: 'assets/monsters/swamp_guardian.png'
  },
  /* ---------- Wastes ---------- */
  { id:'dust_rat', name:'Dust Rat', level:5, time:3000,
  zone:'Wastes', hp:35, attack:8, defense:6, maxHit:5, type: 'ground',
  xp:{attack:50,strength:50,defense:50},
  drops:[
    {gold:6, chance:0.7},
    {id:'leather', chance:0.4},
    {id:'small_ground_spirit', chance:0.18}
  ],
  img:'assets/monsters/dust_rat.png'
  },
  { id:'scavenger_dog', name:'Scavenger Dog', level:9, time:3400,
    zone:'Wastes', hp:65, attack:14, defense:10, maxHit:9, type: 'ground',
    xp:{attack:90,strength:90,defense:90},
    drops:[
      {gold:12, chance:0.7},
      {id:'leather', chance:0.40, min:1, max:2},
      {id:'small_ground_spirit', chance:0.22}
    ],
    img:'assets/monsters/scavenger_dog.png'
  },
  { id:'thorn_lizard', name:'Thorn Lizard', level:13, time:3800,
    zone:'Wastes', hp:100, attack:19, defense:14, maxHit:12, type: 'ground',
    xp:{attack:130,strength:130,defense:130},
    drops:[
      {gold:18, chance:0.7},
      {id:'small_ground_spirit', chance:0.26}
    ],
    img:'assets/monsters/thorn_lizard.png'
  },
  { id:'waste_vulture', name:'Waste Vulture', level:17, time:4200,
    zone:'Wastes', hp:140, attack:25, defense:19, maxHit:15, type: 'ground',
    xp:{attack:170,strength:170,defense:170},
    drops:[
      {gold:24, chance:0.7},
      {id:'small_ground_spirit', chance:0.30}
    ],
    img:'assets/monsters/waste_vulture.png'
  },
  { id:'sand_beast', name:'Sand Beast', level:22, time:4600,
    zone:'Wastes', hp:200, attack:31, defense:25, maxHit:20, type: 'ground',
    xp:{attack:220,strength:220,defense:220},
    drops:[
      {gold:34, chance:0.7},
      {id:'small_ground_spirit', chance:0.36, min:1, max:2},
      {id: 'silver_necklace', chance: 0.20}
    ],
    img:'assets/monsters/sand_beast.png'
  },
  { id:'glass_scorpion', name:'Glass Scorpion', level:28, time:5000,
    zone:'Wastes', hp:240, attack:34, defense:28, maxHit:22, type: 'ground',
    xp:{attack:280,strength:280,defense:280},
    drops:[
      {gold:32, chance:0.7},
      {id:'small_ground_spirit', chance:0.40, min:1, max:2}
    ],
    img:'assets/monsters/glass_scorpion.png'
  },
  { id:'dune_titan', name:'Dune Titan', level:36, time:5600,
    zone:'Wastes', hp:340, attack:44, defense:36, maxHit:30, type: 'ground',
    xp:{attack:480,strength:480,defense:480},
    drops:[
      {gold:46, chance:0.7},
      {id:'sandreaver', chance:0.05},
      {id:'small_ground_spirit', chance:0.46, min:2, max:3},
      {id: 'gold_necklace', chance: 0.2}
    ],
    img:'assets/monsters/dune_titan.png'
  },

  /* ---------- Volcano ---------- */
  { id:'fire_mite', name:'Fire Mite', level:6, time:3000,
    zone:'Volcano', hp:40, attack:9, defense:7, maxHit:6, type: 'fire',
    xp:{attack:60,strength:60,defense:60},
    drops:[{gold:7, chance:0.7},{id:'wire_coil', chance:0.35},{id:'small_fire_spirit', chance: 0.22}],
    img:'assets/monsters/fire_mite.png'
  },
  { id:'charred_bat', name:'Charred Bat', level:11, time:3400,
    zone:'Volcano', hp:70, attack:15, defense:11, maxHit:9, type: 'fire',
    xp:{attack:110,strength:110,defense:110},
    drops:[{gold:12, chance:0.7}, { id:'bat_teeth', chance:0.28, min:1, max:1 }, {id:'small_fire_spirit', chance: 0.26}],
    img:'assets/monsters/charred_bat.png'
  },
  { id:'magma_goblin', name:'Magma Goblin', level:16, time:3800,
    zone:'Volcano', hp:115, attack:22, defense:17, maxHit:14, type: 'fire',
    xp:{attack:160,strength:160,defense:160},
    drops:[{gold:20, chance:0.7},{ id:'nylon_coil', chance:0.15 },{id:'small_fire_spirit', chance: 0.29, min:1, max:2}],
    img:'assets/monsters/magma_goblin.png'
  },
  { id:'lava_hound', name:'Lava Hound', level:21, time:4200,
    zone:'Volcano', hp:170, attack:29, defense:23, maxHit:19, type: 'fire',
    xp:{attack:210,strength:210,defense:210},
    drops:[{gold:30, chance:0.7},{ id:'leather', chance:0.4, min:2, max:3}, {id:'small_fire_spirit', chance: 0.30, min:1, max:2}],
    img:'assets/monsters/lava_hound.png'
  },
  { id:'flame_ogre', name:'Flame Ogre', level:28, time:4800,
    zone:'Volcano', hp:260, attack:38, defense:32, maxHit:26, type: 'fire',
    xp:{attack:280,strength:280,defense:280},
    drops:[{gold:44, chance:0.7}, {id:'small_fire_spirit', chance: 0.32, min:1, max:3}],
    img:'assets/monsters/flame_ogre.png'
  },
  { id:'pyre_drake', name:'Pyre Drake', level:36, time:5200,
    zone:'Volcano', hp:340, attack:46, defense:38, maxHit:30, type: 'fire',
    xp:{attack:480,strength:480,defense:480},
    drops:[{gold:46, chance:0.7}, {id: 'dragon_bones', chance:0.3}, {id:'small_fire_spirit', chance: 0.35, min:2, max:2}],
    img:'assets/monsters/pyre_drake.png'
  },
  { id:'inferno_colossus', name:'Inferno Colossus', level:44, time:5800,
    zone:'Volcano', hp:440, attack:58, defense:48, maxHit:38, type: 'fire',
    xp:{attack:580,strength:580,defense:580},
    drops:[{gold:62, chance:0.7}, {id: 'obsidian_maul', chance: .04}, {id:'small_fire_spirit', chance: 0.35, min:2, max:4}],
    img:'assets/monsters/inferno_colossus.png'
  },
  { id:'abyssal_hellion', name:'Abyssal Hellion', level:65, time:7600,
    zone:'Volcano', hp:750, attack:107, defense:85, maxHit:64, type:'fire',
    xp:{attack:1000,strength:1000,defense:1000},
    drops:[
      {gold:310, chance:0.7},
      {id:'small_fire_spirit', chance:0.36, min:3, max:4},
      {id:'abyssal_cord', chance:0.11}
    ],
    img:'assets/monsters/abyssal_hellion.png'
  },

  /* ---------- Crypts ---------- */
  { id:'bone_rat', name:'Bone Rat', level:8, time:3200,
    zone:'Crypts', hp:55, attack:12, defense:9, maxHit:7,
    xp:{attack:80,strength:80,defense:80},
    drops:[{gold:9, chance:0.7}],
    img:'assets/monsters/bone_rat.png'
  },
  { id:'crypt_bat', name:'Crypt Bat', level:13, time:3600,
    zone:'Crypts', hp:95, attack:18, defense:14, maxHit:11,
    xp:{attack:130,strength:130,defense:130},
    drops:[{gold:16, chance:0.7},{ id:'bat_teeth', chance:0.22, min:1, max:1 }],
    img:'assets/monsters/crypt_bat.png'
  },
  { id:'grave_ghoul', name:'Grave Ghoul', level:18, time:4000,
    zone:'Crypts', hp:140, attack:25, defense:19, maxHit:16,
    xp:{attack:180,strength:180,defense:180},
    drops:[{gold:24, chance:0.7},{ id:'ghoul_eye', chance:0.20 }, {id: 'silver_necklace', chance: 0.18}],
    img:'assets/monsters/grave_ghoul.png'
  },
  { id:'tomb_knight', name:'Tomb Knight', level:24, time:4400,
    zone:'Crypts', hp:200, attack:32, defense:26, maxHit:21,
    xp:{attack:240,strength:240,defense:240},
    drops:[{gold:34, chance:0.7}, {id: 'crypt_cord', chance: 0.15}],
    img:'assets/monsters/tomb_knight.png'
  },
  { id:'shadow_wraith', name:'Shadow Wraith', level:32, time:5000,
    zone:'Crypts', hp:320, attack:46, defense:38, maxHit:30,
    xp:{attack:425,strength:425,defense:425},
    drops:[{gold:52, chance:0.7}],
    img:'assets/monsters/shadow_wraith.png'
  },
  { id:'death_priest', name:'Death Priest', level:40, time:5400,
    zone:'Crypts', hp:380, attack:48, defense:40, maxHit:32,
    xp:{attack:540,strength:540,defense:540},
    drops:[{gold:40, chance:0.7},{id: 'spectral_coil', chance:0.13}],
    img:'assets/monsters/death_priest.png'
  },
  { id:'crypt_lich', name:'Crypt Lich', level:48, time:6000,
    zone:'Crypts', hp:520, attack:60, defense:52, maxHit:42,
    xp:{attack:640,strength:640,defense:640},
    drops:[{gold:60, chance:0.7}, {id: 'gravewind_shroud', chance:0.02}],
    img:'assets/monsters/crypt_lich.png'
  },

  /* ---------- Mountains ---------- */
  { id:'cliff_rat', name:'Cliff Rat', level:6, time:3000,
    zone:'Mountains', hp:38, attack:9, defense:7, maxHit:5,
    xp:{attack:60,strength:60,defense:60},
    drops:[{gold:6, chance:0.7},{ id:'leather', chance:0.40}],
    img:'assets/monsters/cliff_rat.png'
  },
  { id:'mountain_goat', name:'Mountain Goat', level:12, time:3400,
    zone:'Mountains', hp:85, attack:16, defense:12, maxHit:10,
    xp:{attack:120,strength:120,defense:120},
    drops:[{gold:14, chance:0.7},{ id:'leather', chance:0.40, min:1, max:2}],
    img:'assets/monsters/mountain_goat.png'
  },
  { id:'rock_troll', name:'Rock Troll', level:18, time:3800,
    zone:'Mountains', hp:150, attack:24, defense:19, maxHit:16,
    xp:{attack:180,strength:180,defense:180},
    drops:[{gold:26, chance:0.7}],
    img:'assets/monsters/rock_troll.png'
  },
  { id:'ice_wolf', name:'Ice Wolf', level:25, time:4200,
    zone:'Mountains', hp:230, attack:34, defense:27, maxHit:23,
    xp:{attack:250,strength:250,defense:250}, type: 'water',
    drops:[{gold:38, chance:0.7},{ id:'leather', chance:0.40, min:2, max:3}, {id:'small_water_spirit', chance: 0.5, min:2, max:3}],
    img:'assets/monsters/ice_wolf.png'
  },
  { id:'peak_giant', name:'Peak Giant', level:34, time:4800,
    zone:'Mountains', hp:350, attack:48, defense:40, maxHit:32,
    xp:{attack:450,strength:450,defense:450},
    drops:[{gold:58, chance:0.7},{id: 'gold_ring', chance: 0.18}],
    img:'assets/monsters/peak_giant.png'
  },
  { id:'frost_drake', name:'Frost Drake', level:42, time:5400,
    zone:'Mountains', hp:420, attack:52, defense:44, maxHit:36,
    xp:{attack:540,strength:540,defense:540}, type: 'water',
    drops:[{gold:50, chance:0.7},{id:'wire_coil', chance:0.3, min:5, max:8},{id: 'dragon_bones', chance:0.34}, {id:'small_water_spirit', chance: 0.5, min:3, max:5}],
    img:'assets/monsters/frost_drake.png'
  },
  { id:'storm_colossus', name:'Storm Colossus', level:50, time:6000,
    zone:'Mountains', hp:560, attack:64, defense:56, maxHit:44,
    xp:{attack:670,strength:670,defense:670}, type: 'water',
    drops:[{gold:70, chance:0.7}, {id:'small_water_spirit', chance: 0.5, min:4, max:7}, {id: 'runed_coil', chance: 0.11}],
    img:'assets/monsters/storm_colossus.png'
  },
  /*dwarfs*/
  { id:'dwarf_scout', name:'Dwarf Scout', level:15, time:6000,
    zone:'Dwarven', hp:120, attack:21, defense:16, maxHit:13,
    xp:{attack:150,strength:150,defense:150}, type: '',
    drops:[{id:'bar_iron', chance: 0.15, min:1, max:2}, {id: 'small_gear', chance: 0.15}],
    img:'assets/monsters/dwarf_scout.png'
  },
];

const BOSSES_APPEND = [
  {
    id: 'vine_horror',
    name: 'Vine Horror',
    level: 100,
    zone: 'Bosses',
    hp: 3000,
    attack: 150,
    defense: 150,
    maxHit: 95,
    xp:{attack:5000,strength:5000,defense:5000},
    type: 'forest',
    time: 7000,
    img: 'assets/bosses/vine_horror.png',
    drops: [
      { gold: 700, chance: 0.85, min: 420, max: 820 },
      { id: 'swamp_mask', chance: 0.08 },
      { id: 'quicksilver', chance: 0.40, min: 2, max: 4 },
      { id: 'small_forest_spirit', chance: 1, min: 7, max: 10 },
    ],
    blurb: 'A massive tangle of thorns and sap — periodically enrages, sprouts thorns, and regrows.',
    events: ['enrage', 'thorns', 'regrow'],
  }
];

try {
  const _ids = new Set((Array.isArray(MONSTERS) ? MONSTERS : []).map(m => m.id));
  for (const b of BOSSES_APPEND) {
    if (!_ids.has(b.id)) MONSTERS.push(b);
  }
} catch (e) {
  console.error('[Bosses append] Failed to push into MONSTERS:', e);
}
