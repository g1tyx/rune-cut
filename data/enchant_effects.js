// Map consumable item → effect descriptor.
// Add more tiers by adding more entries with the same `group: 'swift'`.
export const ENCHANT_CONSUMABLES = {
    // Tier I (example)
    quicksilver_e: {
      group: 'swift',         // unique non-stacking group
      tier: 1,                // used for replace-if-higher logic
      addSpeed: 0.25,         // bonus
      slots: ['axe','pick','fishing'], // where it can apply
      badge: 'I',             // UI hint (roman numeral)
    },
  
    // Future tiers (examples; add when you create items/recipes)
    // quicksilver_e_II: { group:'swift', tier:2, addSpeed:0.50, slots:['axe','pick','fishing'], badge:'II' },
    // quicksilver_e_III:{ group:'swift', tier:3, addSpeed:0.75, slots:['axe','pick','fishing'], badge:'III' },
  };
  
  export function getConsumableEffect(itemId){
    const base = String(itemId||'').split('@')[0];
    return ENCHANT_CONSUMABLES[base] || null;
  }
  