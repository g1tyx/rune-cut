// /data/pets.js
export const PETS = {
    cheeken: {
      name: "Cheeken",
      img: "assets/pets/cheeken.png",
      description: "A cheerful baby chick peeking out of his cracked egg, glowing with warmth and curiosity—your first loyal pet companion.",
      baseAtk: 3,
      baseStr: 3,
      baseDef: 3,
      baseHp: 15,
      baseAcc: 0.55,
      baseMaxHit: 3,
      growthAtk: 0.5,
      growthStr: 0.6,
      growthDef: 0.4,
      growthHp: 2,
      growthAcc: 0.01,
      growthMaxHit: 0.25
    },
    sterling: {
        name: "Sterling",
        img: "assets/pets/sterling.png",
        description:
        "A loyal royal service hound who earned his crown assisting the court—steadfast, brave, and always at your side after countless duties for the realm.",
        baseAtk: 4,
        baseStr: 4,
        baseDef: 4,
        baseHp: 18,
        baseAcc: 0.60,
        baseMaxHit: 4,
        growthAtk: 0.6,
        growthStr: 0.7,
        growthDef: 0.5,
        growthHp: 2.5,
        growthAcc: 0.012,
        growthMaxHit: 0.30
  },
  neko: {
    name: "Neko",
    img: "assets/pets/neko.png",
    description:
      "A nimble blade-dancing cat with quick paws and sharper instincts. Swift, precise, and always landing on its feet.",
    baseAtk: 5,
    baseStr: 5,
    baseDef: 4,
    baseHp: 20,
    baseAcc: 0.63,
    baseMaxHit: 5,
    growthAtk: 0.7,
    growthStr: 0.8,
    growthDef: 0.55,
    growthHp: 2.8,
    growthAcc: 0.013,
    growthMaxHit: 0.35,
    requires: { attack: 55 }
  }
  
  };
  