// data/farming.js
export const FARM_PLOTS = 6;

export const FARM_RECIPES = {
  seed_beet: { cropId: 'beet', time: 5_000, name: 'Beet', xp: 6, lvl: 1 },
  seed_corn: { cropId: 'corn', time: 12_000, name: 'Corn', xp: 9, lvl: 3 },
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
