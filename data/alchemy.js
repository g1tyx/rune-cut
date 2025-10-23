// /data/alchemy.js
export const ALCHEMY_RECIPES = {
  potion_mana_small: {
    id: 'potion_mana_small',
    name: 'Small Mana Potion',
    level: 1,
    time: 3000,
    reqSkill: 'alch',
    speedSkill: 'alch',
    inputs: [
      { id: 'briar_oil', qty: 1 },
      { id: 'empty_vial', qty: 1 }
    ],
    outputs: [{ id: 'potion_mana_small', qty: 1 }],
    xp: [{ skill: 'alch', amount: 15 }],
    img: 'assets/potions/mana_potion.png'
  },
  potion_mana_med: {
    id: 'potion_mana_med',
    name: 'Mana Potion',
    level: 10,
    time: 3500,
    reqSkill: 'alch',
    speedSkill: 'alch',
    inputs: [
      { id: 'bramble_heart', qty: 1 },
      { id: 'reinforced_vial', qty: 1 }
    ],
    outputs: [{ id: 'potion_mana_med', qty: 1 }],
    xp: [{ skill: 'alch', amount: 35 }],
    img: 'assets/potions/med_mana_potion.png'
  },
  potion_accuracy: {
    id: 'potion_accuracy',
    name: 'Accuracy Potion',
    level: 5,
    time: 3300,
    reqSkill: 'alch',
    speedSkill: 'alch',
    inputs: [
      { id: 'empty_vial', qty: 1 },
      { id: 'bat_teeth', qty: 1 }
    ],
    outputs: [{ id: 'potion_accuracy', qty: 1 }],
    xp: [{ skill: 'alch', amount: 25 }]
  },
  potion_advanced_accuracy: {
    id: 'potion_advanced_accuracy',
    name: 'Advanced Accuracy',
    level: 15,
    time: 3700,
    reqSkill: 'alch',
    speedSkill: 'alch',
    inputs: [
      { id: 'ghoul_eye', qty: 1 },
      { id: 'reinforced_vial', qty: 1 }
    ],
    outputs: [{ id: 'potion_advanced_accuracy', qty: 1 }],
    xp: [{ skill: 'alch', amount: 55 }]
  },
  potion_defense: {
    id: 'potion_defense',
    name: 'Defense Potion',
    level: 7,
    time: 3400,
    reqSkill: 'alch',
    speedSkill: 'alch',
    inputs: [
      { id: 'empty_vial', qty: 1 },
      { id: 'birch_resin', qty: 1 }
    ],
    outputs: [{ id: 'potion_defense', qty: 1 }],
    xp: [{ skill: 'alch', amount: 30 }]
  },
  potion_advanced_defense: {
    id: 'potion_advanced_defense',
    name: 'Advanced Defense',
    level: 17,
    time: 3800,
    reqSkill: 'alch',
    speedSkill: 'alch',
    inputs: [
      { id: 'cedar_resin', qty: 1 },
      { id: 'reinforced_vial', qty: 1 }
    ],
    outputs: [{ id: 'potion_advanced_defense', qty: 1 }],
    xp: [{ skill: 'alch', amount: 70 }]
  },
  arcane_potion_mana: {
    id: 'arcane_potion_mana',
    name: 'Arcane Mana Potion',
    level: 22,
    time: 3900,
    inputs: [
      { id: 'arcane_phial', qty: 1 },
      { id: 'coastal_pearls', qty: 1 }
    ],
    outputs: [
      { id: 'arcane_potion_mana', qty: 1 }
    ],
    xp: [{ skill: 'alch', amount: 110 }],
  },
  arcane_potion_accuracy: {
    id: 'arcane_potion_accuracy',
    name: 'Arcane Accuracy Potion',
    level: 27,
    time: 3900,
    inputs: [
      { id: 'arcane_phial', qty: 1 },
      { id: 'willow_resin', qty: 1 }
    ],
    outputs: [
      { id: 'arcane_potion_accuracy', qty: 1 }
    ],
    xp: [{ skill: 'alch', amount: 135 }],
  },
  enchanted_mana_potion: {
    id: 'enchanted_mana_potion',
    name: 'Enchanted Mana Potion',
    level: 40,
    time: 4000,
    inputs: [
      { id: 'enchanted_phial', qty: 1 },
      { id: 'anglerfish_oil', qty: 1 }
    ],
    outputs: [
      { id: 'enchanted_mana_potion', qty: 1 }
    ],
    xp: [{ skill: 'alch', amount: 225 }],
  },
  weapon_poison: {
    id: 'weapon_poison',
    name: 'Weapon Poison',
    level: 9,
    time: 2900,
    inputs: [
      { id: 'empty_vial', qty: 1 },
      { id: 'redcap_fungus', qty: 2 }
    ],
    outputs: [
      { id: 'weapon_poison', qty: 1 }
    ],
    xp: [{ skill: 'alch', amount: 36 }],
  },
  toxic_poison: {
    id: 'toxic_poison',
    name: 'Toxic Poison',
    level: 21,
    time: 3500,
    inputs: [
      { id: 'reinforced_vial', qty: 1 },
      { id: 'spotted_mireheart', qty: 2 }
    ],
    outputs: [
      { id: 'toxic_poison', qty: 1 }
    ],
    xp: [{ skill: 'alch', amount: 100 }],
  },
  deathblight_toxin: {
    id: 'deathblight_toxin',
    name: 'Deathblight Toxin',
    level: 35,
    time: 3800,
    inputs: [
      { id: 'arcane_phial', qty: 1 },
      { id: 'deathcap_toadstool', qty: 2 }
    ],
    outputs: [
      { id: 'deathblight_toxin', qty: 1 }
    ],
    xp: [{ skill: 'alch', amount: 175 }],
  },
  spore_toxin: {
    id: 'spore_toxin',
    name: 'Spore Toxin',
    level: 50,
    time: 4200,
    inputs: [
      { id: 'enchanted_phial', qty: 1 },
      { id: 'sporeshroud_fungus', qty: 2 }
    ],
    outputs: [
      { id: 'spore_toxin', qty: 1 }
    ],
    xp: [{ skill: 'alch', amount: 300 }],
  }
};
