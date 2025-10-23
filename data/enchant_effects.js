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

// Intensity tiers with BASE magnitudes (will be scaled by gem tier)
// Scaled so mythic starstone (2.0x mult) gives max 25 for attack/strength at level 99
// Formula: 25 / 2.0 / 1.10 (max variance) = ~11.36 base -> round to 11
const TIERS = [
  { key:'minor',   base:{ hpMax:7,   manaMax:5,   defense:3,  attack:2,  strength:2  } },
  { key:'standard',base:{ hpMax:12,  manaMax:9,   defense:6,  attack:3,  strength:3  } },
  { key:'greater', base:{ hpMax:18,  manaMax:14,  defense:9,  attack:6,  strength:6  } },
  { key:'grand',   base:{ hpMax:26,  manaMax:22,  defense:16, attack:9,  strength:9  } },
  { key:'mythic',  base:{ hpMax:36,  manaMax:30,  defense:19, attack:11, strength:11 } },
];

// Gem tier multipliers (applied to base stats)
const GEM_MULTIPLIERS = {
  sapphire_ring:  1.0,   // Base (100%)
  ruby_ring:      1.15,  // +15%
  emerald_ring:   1.30,  // +30%
  diamond_ring:   1.50,  // +50%
  starstone_ring: 2.00,  // +100% (MYTHIC tier stone!)
  // Silver amulets - same as rings
  silver_sapphire_amulet:  1.0,
  silver_ruby_amulet:      1.15,
  // Gold amulets - stronger than silver but capped properly
  gold_emerald_amulet:     1.50,  // 1.30 * 1.15 = ~1.50
  gold_diamond_amulet:     1.73,  // 1.50 * 1.15 = ~1.73
  gold_starstone_amulet:   2.05,  // Just above starstone ring, caps at ~25 at level 99
};

// Base tier weights by stone (probabilities sum to 1.0)
// Order corresponds to TIERS above: [minor, standard, greater, grand, mythic]
// Better gems = much better odds at higher tiers
const STONE_BASE_WEIGHTS = {
  sapphire_ring:  [0.60, 0.25, 0.10, 0.04, 0.01],  // Low tier: mostly minor/standard
  ruby_ring:      [0.40, 0.30, 0.20, 0.08, 0.02],  // Mid-low: better greater chance
  emerald_ring:   [0.25, 0.35, 0.25, 0.12, 0.03],  // Mid: balanced toward greater
  diamond_ring:   [0.15, 0.25, 0.35, 0.20, 0.05],  // Mid-high: strong greater/grand
  starstone_ring: [0.05, 0.15, 0.30, 0.35, 0.15],  // High tier: mostly grand/mythic
  // Silver amulets - same odds as corresponding rings
  silver_sapphire_amulet:  [0.60, 0.25, 0.10, 0.04, 0.01],
  silver_ruby_amulet:      [0.40, 0.30, 0.20, 0.08, 0.02],
  // Gold amulets - same as next tier up of rings
  gold_emerald_amulet:     [0.15, 0.25, 0.35, 0.20, 0.05],  // diamond tier odds
  gold_diamond_amulet:     [0.05, 0.15, 0.30, 0.35, 0.15],  // starstone tier odds
  gold_starstone_amulet:   [0.02, 0.10, 0.25, 0.38, 0.25],  // even better than starstone ring!
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
  const gemMult = GEM_MULTIPLIERS[itemId] || 1.0;
  
  // Apply level-based variance: ±10% range that shifts upward with level
  // At level 1: 0.90-1.00 range (can't go above base)
  // At level 99: 1.00-1.10 range (guaranteed base or better)
  const levelProgress = Math.min(1.0, enchLevel / 99);
  const minRoll = 0.90 + (levelProgress * 0.10);  // 0.90 → 1.00
  const maxRoll = 1.00 + (levelProgress * 0.10);  // 1.00 → 1.10
  const rollVar = minRoll + rng() * (maxRoll - minRoll);
  
  const baseAdd = tier.base[stat];
  const add = Math.round(baseAdd * gemMult * rollVar);

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