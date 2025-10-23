// /data/enchanting.js
export const ENCHANT_RECIPES = {
    tome_forest_novice: {
      id: 'tome_forest_novice',
      name: 'Enchant Novice Forest Tome',
      level: 1,
      time: 1300,
      mana: 5,
      inputs: [
        { id: 'book', qty: 1 },
        { id: 'forest_essence', qty: 1 }
      ],
      outputs: [
        { id: 'tome_forest_novice', qty: 1 }
      ],
      xp: { skill: 'enchant', amount: 25 }
    },
  tome_sea_novice: {
    id: 'tome_sea_novice',
    name: 'Enchant Novice Sea Tome',
    level: 1,
    time: 1300,
    mana: 5,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'sea_essence', qty: 1 }
    ],
    outputs: [
      { id: 'tome_sea_novice', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 25 }
  },
  tome_rock_novice: {
    id: 'tome_rock_novice',
    name: 'Enchant Novice Rock Tome',
    level: 1,
    time: 1300,
    mana: 5,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'rock_essence', qty: 1 }
    ],
    outputs: [
      { id: 'tome_rock_novice', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 25 }
  },
  tome_forest_apprentice: {
    id: 'tome_forest_apprentice',
    name: 'Enchant Apprentice Forest Tome',
    level: 15,
    time: 1300,
    mana: 10,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'forest_essence', qty: 2 }
    ],
    outputs: [
      { id: 'tome_forest_apprentice', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 45 }
  },
  tome_sea_apprentice: {
    id: 'tome_sea_apprentice',
    name: 'Enchant Apprentice Sea Tome',
    level: 15,
    time: 1300,
    mana: 10,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'sea_essence', qty: 2 }
    ],
    outputs: [
      { id: 'tome_sea_apprentice', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 45 }
  },
  tome_rock_apprentice: {
    id: 'tome_rock_apprentice',
    name: 'Enchant Apprentice Rock Tome',
    level: 15,
    time: 1300,
    mana: 10,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'rock_essence', qty: 2 }
    ],
    outputs: [
      { id: 'tome_rock_apprentice', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 45 }
  },
  tome_forest_advanced: {
    id: 'tome_forest_advanced',
    name: 'Enchant Advanced Forest Tome',
    level: 25,
    time: 1300,
    mana: 15,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'forest_essence', qty: 3 }
    ],
    outputs: [
      { id: 'tome_forest_advanced', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 85 }
  },
  tome_sea_advanced: {
    id: 'tome_sea_advanced',
    name: 'Enchant Advanced Sea Tome',
    level: 25,
    time: 1300,
    mana: 15,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'sea_essence', qty: 3 }
    ],
    outputs: [
      { id: 'tome_sea_advanced', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 85 }
  },
  tome_rock_advanced: {
    id: 'tome_rock_advanced',
    name: 'Enchant Advanced Rock Tome',
    level: 25,
    time: 1300,
    mana: 15,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'rock_essence', qty: 3 }
    ],
    outputs: [
      { id: 'tome_rock_advanced', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 85 }
  },
  tome_forest_expert: {
    id: 'tome_forest_expert',
    name: 'Enchant Expert Forest Tome',
    level: 40,
    time: 1300,
    mana: 22,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'forest_essence', qty: 5 }
    ],
    outputs: [
      { id: 'tome_forest_expert', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 150 }
  },
  tome_sea_expert: {
    id: 'tome_sea_expert',
    name: 'Enchant Expert Sea Tome',
    level: 40,
    time: 1300,
    mana: 22,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'sea_essence', qty: 5 }
    ],
    outputs: [
      { id: 'tome_sea_expert', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 150 }
  },
  tome_rock_expert: {
    id: 'tome_rock_expert',
    name: 'Enchant Expert Rock Tome',
    level: 40,
    time: 1300,
    mana: 22,
    inputs: [
      { id: 'book', qty: 1 },
      { id: 'rock_essence', qty: 5 }
    ],
    outputs: [
      { id: 'tome_rock_expert', qty: 1 }
    ],
    xp: { skill: 'enchant', amount: 150 }
  },
  swift_tools_I: {
    id: 'swift_tools_I',
    name: 'Swiftness (I)',
    level: 10,
    time: 1300,
    mana: 20,
    inputs: [{ id: 'quicksilver', qty: 1 }],
    outputs: [{ id: 'quicksilver_e', qty: 1 }],
    xp: { skill: 'enchant', amount: 100 },
    desc: 'Imbues quicksilver with speed magic. Drag onto a tool to apply +0.25 speed (non-stacking).'
  },
  swift_tools_II: {
    id: 'swift_tools_II',
    name: 'Swiftness (II)',
    level: 30,
    time: 2300,
    mana: 40,
    inputs: [{ id: 'quicksilver', qty: 5 }],
    outputs: [{ id: 'quicksilver_e2', qty: 1 }],
    xp: { skill: 'enchant', amount: 400 },
    desc: 'Imbues quicksilver with advanced speed magic. Drag onto a tool to apply +0.5 speed (non-stacking).'
  },
  enchant_sapphire_ring: {
    id: 'enchant_sapphire_ring',
    name: 'Enchant Sapphire Ring',
    level: 15,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 200 },
    desc: 'Applies a random stat to the Sapphire Ring. Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['ring'], mode: 'ring_enchant' }
  },

  enchant_ruby_ring: {
    id: 'enchant_ruby_ring',
    name: 'Enchant Ruby Ring',
    level: 22,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 350 },
    desc: 'Applies a random stat to the Ruby Ring. Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['ring'], mode: 'ring_enchant' }
  },

  enchant_emerald_ring: {
    id: 'enchant_emerald_ring',
    name: 'Enchant Emerald Ring',
    level: 29,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 500 },
    desc: 'Applies a random stat to the Emerald Ring. Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['ring'], mode: 'ring_enchant' }
  },

  enchant_diamond_ring: {
    id: 'enchant_diamond_ring',
    name: 'Enchant Diamond Ring',
    level: 36,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 750 },
    desc: 'Applies a random stat to the Diamond Ring. Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['ring'], mode: 'ring_enchant' }
  },

  enchant_starstone_ring: {
    id: 'enchant_starstone_ring',
    name: 'Enchant Starstone Ring',
    level: 43,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 1000 },
    desc: 'Applies a random stat to the Starstone Ring. Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['ring'], mode: 'ring_enchant' }
  },

  enchant_sapphire_amulet: {
    id: 'enchant_sapphire_amulet',
    name: 'Enchant Sapphire Amulet',
    level: 20,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 200 },
    desc: 'Applies a random stat to a Sapphire Amulet (Silver or Gold). Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['amulet'], mode: 'ring_enchant' }
  },

  enchant_ruby_amulet: {
    id: 'enchant_ruby_amulet',
    name: 'Enchant Ruby Amulet',
    level: 27,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 350 },
    desc: 'Applies a random stat to a Ruby Amulet (Silver or Gold). Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['amulet'], mode: 'ring_enchant' }
  },

  enchant_emerald_amulet: {
    id: 'enchant_emerald_amulet',
    name: 'Enchant Emerald Amulet',
    level: 34,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 500 },
    desc: 'Applies a random stat to an Emerald Amulet (Gold only). Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['amulet'], mode: 'ring_enchant' }
  },

  enchant_diamond_amulet: {
    id: 'enchant_diamond_amulet',
    name: 'Enchant Diamond Amulet',
    level: 41,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 750 },
    desc: 'Applies a random stat to a Diamond Amulet (Gold only). Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['amulet'], mode: 'ring_enchant' }
  },

  enchant_starstone_amulet: {
    id: 'enchant_starstone_amulet',
    name: 'Enchant Starstone Amulet',
    level: 48,
    time: 2800,
    mana: 20,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 1000 },
    desc: 'Applies a random stat to a Starstone Amulet (Gold only). Stone controls intensity odds; higher Enchanting level biases to stronger tiers.',
    apply: { targetSlots: ['amulet'], mode: 'ring_enchant' }
  },

  dual_enchant_ring: {
    id: 'dual_enchant_ring',
    name: 'Dual Ring Enchant',
    level: 60,
    time: 7500,
    mana: 80,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 500 },
    desc: 'Adds a second enchantment to an already enchanted ring. If the ring already has 2 enchantments, replaces the weaker one.',
    apply: { targetSlots: ['ring'], mode: 'dual_enchant' }
  },

  dual_enchant_amulet: {
    id: 'dual_enchant_amulet',
    name: 'Dual Amulet Enchant',
    level: 65,
    time: 7500,
    mana: 80,
    inputs: [],
    outputs: [],
    xp: { skill: 'enchant', amount: 600 },
    desc: 'Adds a second enchantment to an already enchanted amulet. If the amulet already has 2 enchantments, replaces the weaker one.',
    apply: { targetSlots: ['amulet'], mode: 'dual_enchant' }
  },
  arcane_phial: {
    id: 'arcane_phial',
    name: 'Enchant Arcane Phial',
    level: 32,
    time: 1100,
    mana: 3,
    inputs:  [ { id:'reinforced_vial', qty:1 } ],
    outputs: [ { id:'arcane_phial',    qty:1 } ],
    xp: { skill: 'enchant', amount: 50 }
  },
  enchanted_phial: {
    id: 'enchanted_phial',
    name: 'Enchant Phial',
    level: 46,
    time: 1100,
    mana: 5,
    inputs:  [ { id:'arcane_phial', qty:1 } ],
    outputs: [ { id:'enchanted_phial',    qty:1 } ],
    xp: { skill: 'enchant', amount: 100 }
  },
};
