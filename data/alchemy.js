// /data/alchemy.js
// NOTE: Add item defs in data/items.js for: herb_blue, vial_empty, potion_mana_small

export const ALCHEMY_RECIPES = {
    potion_mana_small: {
      id: 'potion_mana_small',
      name: 'Small Mana Potion',
      level: 1,
      xp: 15,
      time: 3000,
      inputs: [
        { id: 'briar_oil',   qty: 1 },
        { id: 'empty_vial',  qty: 1 },
      ],
      output: { id: 'potion_mana_small', qty: 1 },
      img: 'assets/potions/mana_potion.png'
    },
    potion_mana_med: {
        id: 'potion_mana_med',
        name: 'Mana Potion',
        level: 10,
        xp: 35,
        time: 3500,
        inputs: [
          { id: 'bramble_heart',   qty: 1 },
          { id: 'reinforced_vial',  qty: 1 },
        ],
        output: { id: 'potion_mana_med', qty: 1 },
        img: 'assets/potions/med_mana_potion.png'
      },
    potion_accuracy: {
        id: 'potion_accuracy',
        name: 'Accuracy Potion',
        level: 5,
        xp: 25,                   
        time: 3300,
        inputs: [
          { id: 'empty_vial', qty: 1 },
          { id: 'bat_teeth', qty: 1 }
        ],
        output: { id: 'potion_accuracy', qty: 1 }
      },
  };
  