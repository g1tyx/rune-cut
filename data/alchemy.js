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
  }
};
