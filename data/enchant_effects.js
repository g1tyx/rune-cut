// /data/enchant_effects.js
// Add more tiers by adding more entries with the same `group: 'swift'`.
import { buildXpTable, levelFromXp } from '../systems/xp.js';

const XP_TABLE = buildXpTable();
export const ENCHANT_CONSUMABLES = {
    // Tier I (example)
    quicksilver_e: {
      group: 'swift',         // unique non-stacking group
      tier: 1,                // used for replace-if-higher logic
      addSpeed: 0.25,         // bonus
      slots: ['axe','pick','fishing'], // where it can apply
      badge: 'I',             // UI hint (roman numeral)
    },
    quicksilver_e2: {
      group: 'swift',         // unique non-stacking group
      tier: 2,                // used for replace-if-higher logic
      addSpeed: 0.5,         // bonus
      slots: ['axe','pick','fishing'], // where it can apply
      badge: 'II',             // UI hint (roman numeral)
    },
  
    // Future tiers (examples; add when you create items/recipes)
    // quicksilver_e_II: { group:'swift', tier:2, addSpeed:0.50, slots:['axe','pick','fishing'], badge:'II' },
    // quicksilver_e_III:{ group:'swift', tier:3, addSpeed:0.75, slots:['axe','pick','fishing'], badge:'III' },
  };

  export function getConsumableEffect(itemId){
    const base = String(itemId||'').split('@')[0];
    return ENCHANT_CONSUMABLES[base] || null;
  }
  
  const ENCHANT_STATS = ['hpMax', 'manaMax', 'defense', 'attack', 'strength'];

// Intensity tiers (low → high) with per-stat magnitudes
// Tune freely; these numbers are deliberately conservative vs. gear.
const TIERS = [
  { key:'minor',   add:{ hpMax:12,  manaMax:10,  defense:6, attack:4, strength:4 } },
  { key:'standard',add:{ hpMax:20, manaMax:15, defense:10, attack:6, strength:6 } },
  { key:'greater', add:{ hpMax:30, manaMax:25, defense:15, attack:10, strength:10 } },
  { key:'grand',   add:{ hpMax:45, manaMax:38, defense:27, attack:15, strength:15 } },
  { key:'mythic',  add:{ hpMax:60, manaMax:50, defense:30,attack:20,strength:20} },
];

// Base tier weights by stone (probabilities sum to 1.0)
// Order corresponds to TIERS above.
const STONE_BASE_WEIGHTS = {
  sapphire_ring:  [0.55, 0.28, 0.12, 0.04, 0.01],
  ruby_ring:      [0.45, 0.30, 0.16, 0.07, 0.02],
  emerald_ring:   [0.42, 0.30, 0.18, 0.08, 0.02],
  diamond_ring:   [0.28, 0.32, 0.24, 0.12, 0.04],
  starstone_ring: [0.15, 0.28, 0.28, 0.20, 0.09],
};

// Level bias settings
// Every N levels, shift some probability mass upward.
const LEVEL_STEP = 10;   // every 10 Enchanting levels
const SHIFT_PER_STEP = 0.08; // 8% of current tier weight flows up per step (distributed from lower → higher)

// --- helpers ---
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

function normalize(w){
  const s = w.reduce((a,b)=>a+b,0) || 1;
  return w.map(x => x/s);
}

function applyLevelBias(baseWeights, enchLevel){
  const steps = Math.floor(Math.max(0, enchLevel) / LEVEL_STEP);
  if (!steps) return baseWeights.slice();

  let w = baseWeights.slice();
  for (let s=0; s<steps; s++){
    // move a fraction upward across tiers (skip top)
    const next = w.slice();
    for (let i=0; i<w.length-1; i++){
      const flow = w[i] * SHIFT_PER_STEP;
      next[i]     -= flow;
      next[i+1]   += flow;
    }
    w = next;
  }
  // soft renormalize and clamp
  w = normalize(w.map(clamp01));
  return w;
}

function weightedChoice(weights, rng=Math.random){
  let r = rng();
  for (let i=0;i<weights.length;i++){
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length-1;
}

function rollStat(rng=Math.random){
  const i = Math.floor(rng() * ENCHANT_STATS.length);
  return ENCHANT_STATS[Math.max(0, Math.min(i, ENCHANT_STATS.length-1))];
}

// --- public API ---

/**
 * Returns true if the item can receive a gem-intensity enchant (i.e., is one of our gem rings)
 */
export function canEnchantItem(itemId){
  return Object.prototype.hasOwnProperty.call(STONE_BASE_WEIGHTS, itemId);
}

/**
 * Roll an enchant outcome for a ring at the player's current Enchanting level.
 * @param {Object} state - game state (reads state.enchantXp)
 * @param {string} itemId - e.g., 'sapphire_ring'
 * @param {Function} [rng] - optional RNG for testing
 * @returns {Object} { tierKey, tierIndex, stat, add, effects:[{stat, add}], summary }
 */
export function rollEnchant(state, itemId, rng=Math.random){
  if (!canEnchantItem(itemId)) return { tierKey:null, tierIndex:-1, stat:null, add:0, effects:[], summary:'' };

  const enchLevel = levelFromXp(state.enchantXp || 0, XP_TABLE);

  const baseW  = STONE_BASE_WEIGHTS[itemId];
  const biasW  = applyLevelBias(baseW, enchLevel);
  const tierIx = weightedChoice(biasW, rng);
  const tier   = TIERS[tierIx];

  const stat   = rollStat(rng);
  const add    = tier.add[stat];

  const eff = { stat, add };
  const summary = `Enchant (${tier.key}) → +${add} ${labelForStat(stat)}`;

  return { tierKey: tier.key, tierIndex: tierIx, stat, add, effects:[eff], summary };
}

/**
 * Deterministic compute (no rolling): useful when you want to preview ranges/labels
 * @param {string} itemId
 * @param {number} enchLevel
 * @returns {{weights:number[], tiers:string[]}} normalized tier distribution
 */
export function tierDistribution(itemId, enchLevel){
  if (!canEnchantItem(itemId)) return { weights:[], tiers:[] };
  const baseW = STONE_BASE_WEIGHTS[itemId];
  const w = applyLevelBias(baseW, enchLevel);
  return { weights: w, tiers: TIERS.map(t=>t.key) };
}

function labelForStat(s){
  switch(s){
    case 'hpMax': return 'HP';
    case 'manaMax': return 'Mana';
    case 'defense': return 'Defense';
    case 'attack': return 'Attack';
    case 'strength': return 'Strength';
    default: return s;
  }
}