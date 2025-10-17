// /data/mechanics.js
export const small_gear = {
  small_gear: {
    id: 'small_gear',
    name: 'Small Gear',
    level: 1,
    time: 3000,
    reqSkill: 'mechanics',
    speedSkill: 'mechanics',
    inputs: [
      { id: 'bar_iron', qty: 1 },
    ],
    outputs: [{ id: 'small_gear', qty: 1 }],
    xp: [{ skill: 'mechanics', amount: 18 }],
    img: 'assets/mechanics/small_gear.png'
  },
  handcrank_drill: {
    id: 'handcrank_drill',
    name: 'Handcrank Drill',
    level: 5,
    time: 3900,
    reqSkill: 'mechanics',
    speedSkill: 'mechanics',
    inputs: [
      { id: 'small_gear', qty: 1},
      { id: 'wood_handle', qty: 1},
    ],
    outputs: [{ id: 'handcrank_drill', qty: 1 }],
    xp: [{ skill: 'mechanics', amount: 30 }],
    img: 'assets/mechanics/handcrank_drill.png'
  },
}