// data/farming.js
export const FARM_PLOTS = 6;

export const FARM_RECIPES = {
  seed_beet: { cropId: 'beet', time: 6_000, name: 'Beet', xp: 5, lvl: 1 },
  seed_corn: { cropId: 'corn', time: 12_000, name: 'Corn', xp: 10, lvl: 3 },
  redcap_fungus: { cropId: 'redcap_fungus', time: 15_000, name: 'Redcap Fungus', xp: 20, lvl: 10 },
  seed_pumpkin: { cropId: 'pumpkin', time: 16_000, name: 'Pumpkin', xp: 30, lvl: 17 },
  spotted_mireheart: { cropId: 'spotted_mireheart', time: 20_000, name: 'Spotted Mireheart', xp: 40, lvl: 25 },
  seed_strawberry: { cropId: 'strawberry', time: 22_000, name: 'Strawberry', xp: 70, lvl: 30 },
  deathcap_toadstool: { cropId: 'deathcap_toadstool', time: 25_000, name: 'Deathcap Toadstool', xp: 110, lvl: 38 },
  sporeshroud_fungus: { cropId: 'sporeshroud_fungus', time: 30_000, name: 'Sporeshroud Fungus', xp: 225, lvl: 50 },

};

/**
 * Return a normalized recipe for a given seed id
 */
export function recipeForSeed(seedId, ITEMS) {
  const r = FARM_RECIPES[seedId];
  if (r)
    return {
      cropId: r.cropId,
      time: r.time,
      name: r.name,
      xp: r.xp,
      lvl: r.lvl,
    };

  const d = ITEMS?.[seedId];
  if (d?.type === 'seed') {
    const cropId = d.cropId || String(seedId).replace(/^seed_/, '');
    return {
      cropId,
      time: d.time,
      name: d.name,
      xp: d.xp,
      lvl: d.lvl,
    };
  }
  return null;
}
