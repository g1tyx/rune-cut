// data/items.js
export const ITEMS = {
  raw_dolphin: { id: 'raw_dolphin', name: 'Raw Dolphin', type: 'resource', sell: 90, xp: 250, img: 'assets/food/raw_dolphin.png' },
  dolphin:     { id: 'dolphin',     name: 'Dolphin',     type: 'food',     heal: 55, sell: 115, img: 'assets/food/dolphin.png' },
  /* ----------------------------- Logs ------------------------------ */
  log_oak:      { id: 'log_oak',       name: 'Oak Logs',        type: 'resource', sell: 1,  img: 'assets/forestry/oak.png' },
  log_pine:     { id: 'log_pine',      name: 'Pine Logs',       type: 'resource', sell: 2,  img: 'assets/forestry/pine.png' },
  log_birch:    { id: 'log_birch',     name: 'Birch Logs',      type: 'resource', sell: 3,  img: 'assets/forestry/birch.png' },
  log_cedar:    { id: 'log_cedar',     name: 'Cedar Logs',      type: 'resource', sell: 5,  img: 'assets/forestry/cedar.png' },
  log_willow:   { id: 'log_willow',    name: 'Willow Logs',     type: 'resource', sell: 8,  img: 'assets/forestry/willow.png' },
  log_maple:    { id: 'log_maple',     name: 'Maple Logs',      type: 'resource', sell: 12, img: 'assets/forestry/maple.png' },
  log_yew:      { id: 'log_yew',       name: 'Yew Logs',        type: 'resource', sell: 18, img: 'assets/forestry/yew.png' },
  log_runewood: { id: 'log_runewood',  name: 'Runewood Logs',   type: 'resource', sell: 30, img: 'assets/forestry/runewood.png' },
  log_elder:    { id: 'log_elderwood', name: 'Elderwood Logs',  type: 'resource', sell: 50, img: 'assets/forestry/elder.png' },

  /* ---------------------------- Planks ----------------------------- */
  plank_oak:       { id: 'plank_oak',       name: 'Oak Plank',       type: 'resource', sell: 2,  img: 'assets/forestry/oak_plank.png' },
  plank_pine:      { id: 'plank_pine',      name: 'Pine Plank',      type: 'resource', sell: 4,  img: 'assets/forestry/pine_plank.png' },
  plank_birch:     { id: 'plank_birch',     name: 'Birch Plank',     type: 'resource', sell: 6,  img: 'assets/forestry/birch_plank.png' },
  plank_cedar:     { id: 'plank_cedar',     name: 'Cedar Plank',     type: 'resource', sell: 10, img: 'assets/forestry/cedar_plank.png' },
  plank_willow:    { id: 'plank_willow',    name: 'Willow Plank',    type: 'resource', sell: 16, img: 'assets/forestry/willow_plank.png' },
  plank_maple:     { id: 'plank_maple',     name: 'Maple Plank',     type: 'resource', sell: 24, img: 'assets/forestry/maple_plank.png' },
  plank_yew:       { id: 'plank_yew',       name: 'Yew Plank',       type: 'resource', sell: 36, img: 'assets/forestry/yew_plank.png' },
  plank_runewood:  { id: 'plank_runewood',  name: 'Runewood Plank',  type: 'resource', sell: 60, img: 'assets/forestry/runewood_plank.png' },
  plank_elderwood: { id: 'plank_elderwood', name: 'Elderwood Plank', type: 'resource', sell: 90, img: 'assets/forestry/elderwood_plank.png' },

  /* --------------------------- Materials --------------------------- */
  wood_handle:  { id: 'wood_handle',  name: 'Wood Handle',  type: 'material', sell: 2,  img: 'assets/materials/handle.png' },
  pages:        { id: 'pages',        name: 'Pages',        type: 'resource', sell: 0,  img: 'assets/materials/pages.png' },
  leather:      { id: 'leather',      name: 'Leather',      type: 'resource', sell: 4,  img: 'assets/materials/leather.png' },
  book:         { id: 'book',         name: 'Book',         type: 'resource', sell: 10, img: 'assets/materials/book.png' },
  silica_sand:  { id: 'silica_sand',  name: 'Silica Sand',  type: 'resource', sell: 1,  img: 'assets/materials/silica_sand.png' },
  glass_glob:   { id: 'glass_glob',   name: 'Glass Glob',   type: 'resource', sell: 4,  img: 'assets/materials/glass_glob.png' },
  empty_vial:      { id: 'empty_vial',      name: 'Glass Vial',       type: 'vial', tier: 1, sell: 2, img: 'assets/potions/empty_vial.png' },
  reinforced_vial: { id: 'reinforced_vial', name: 'Reinforced Vial',  type: 'vial', tier: 2, sell: 5, img: 'assets/potions/reinforced_vial.png' },
  arcane_phial:    { id: 'arcane_phial',    name: 'Arcane Phial',     type: 'vial', tier: 3, sell: 9, img: 'assets/potions/arcane_phial.png' },

  forest_essence: { id: 'forest_essence', name: 'Forest Essence', type: 'resource', sell: 12, img: 'assets/materials/forest-essence.png' },
  sea_essence:    { id: 'sea_essence',    name: 'Sea Essence',   type: 'resource', sell: 12, img: 'assets/materials/sea-essence.png' },
  rock_essence:   { id: 'rock_essence',   name: 'Rock Essence',  type: 'resource', sell: 12, img: 'assets/materials/rock-essence.png' },

  quicksilver:   { id: 'quicksilver',   name: 'Quicksilver',   type: 'material', sell: 12, img: 'assets/materials/quicksilver.png' },
  quicksilver_e: { id: 'quicksilver_e', name: 'Quicksilver(e)', img: 'assets/materials/quicksilver.png', glow: true, sell: 30, type: 'material' },

  wire_coil:   { id: 'wire_coil',   name: 'Wire Coil',   type: 'resource', sell: 2, img: 'assets/materials/wire-coil.png' },
  silk_coil:   { id: 'silk_coil',   name: 'Silk Coil',   type: 'resource', sell: 6, img: 'assets/materials/silk-coil.png' },
  nylon_coil:  { id: 'nylon_coil',  name: 'Nylon Coil',  type: 'resource', sell: 12, img: 'assets/materials/nylon-coil.png' },
  nails:       { id: 'nails',       name: 'Nails',       type: 'resource', sell: 1, img: 'assets/materials/nails.png' },

  /* ----------------------------- Tools ----------------------------- */
  axe_copper:       { id: 'axe_copper',       name: 'Copper Axe',  type: 'equipment', slot: 'axe',     speed: 1.25, img: 'assets/equipment/bronze-axe.png' },
  pick_copper:      { id: 'pick_copper',      name: 'Copper Pick', type: 'equipment', slot: 'pick',    speed: 1.25, img: 'assets/equipment/bronze-pick.png' },
  axe_bronze:       { id: 'axe_bronze',       name: 'Bronze Axe',  type: 'equipment', slot: 'axe',     speed: 1.35, img: 'assets/equipment/bronze-axe.png' },
  pick_bronze:      { id: 'pick_bronze',      name: 'Bronze Pick', type: 'equipment', slot: 'pick',    speed: 1.35, img: 'assets/equipment/bronze-pick.png' },
  axe_iron:         { id: 'axe_iron',         name: 'Iron Axe',    type: 'equipment', slot: 'axe',     speed: 1.50, img: 'assets/equipment/bronze-axe.png' },
  pick_iron:        { id: 'pick_iron',        name: 'Iron Pick',   type: 'equipment', slot: 'pick',    speed: 1.50, img: 'assets/equipment/bronze-pick.png' },
  axe_steel:        { id: 'axe_steel',        name: 'Steel Axe',   type: 'equipment', slot: 'axe',     speed: 1.75, img: 'assets/equipment/bronze-axe.png' },
  pick_steel:       { id: 'pick_steel',       name: 'Steel Pick',  type: 'equipment', slot: 'pick',    speed: 1.75, img: 'assets/equipment/bronze-pick.png' },
  axe_blacksteel:   { id: 'axe_blacksteel',   name: 'Blacksteel Axe', type: 'equipment', slot: 'axe',  speed: 2.0,  img: 'assets/equipment/black_axe.png' },
  pick_blacksteel:  { id: 'pick_blacksteel',  name: 'Blacksteel Pick', type: 'equipment', slot: 'pick', speed: 2.0, img: 'assets/equipment/black_pick.png' },
  fishing_pole:     { id: 'fishing_pole',     name: 'Fishing Pole',   type: 'equipment', slot: 'fishing', speed: 1.25, img: 'assets/equipment/fishing-pole.png' },
  sturdy_pole:      { id: 'sturdy_pole',      name: 'Sturdy Pole',    type: 'equipment', slot: 'fishing', speed: 1.35, img: 'assets/equipment/sturdy-pole.png' },
  anglers_pride:    { id: 'anglers_pride',    name: 'Anglers Pride',  type: 'equipment', slot: 'fishing', speed: 1.50, img: 'assets/equipment/anglers-pride.png' },

  /* ----------------------- Fishing resources ----------------------- */
  raw_shrimps:    { id: 'raw_shrimps',    name: 'Raw Shrimp',      type: 'resource', sell: 1,  xp: 10,  img: 'assets/food/raw_shrimp.png' },
  raw_trout:      { id: 'raw_trout',      name: 'Raw Trout',       type: 'resource', sell: 2,  xp: 15,  img: 'assets/food/raw_trout.png' },
  raw_eel:        { id: 'raw_eel',        name: 'Raw Eel',         type: 'resource', sell: 8,  xp: 24,  img: 'assets/food/raw_eel.png' },
  raw_salmon:     { id: 'raw_salmon',     name: 'Raw Salmon',      type: 'resource', sell: 15, xp: 50,  img: 'assets/food/raw_salmon.png' },
  raw_halibut:    { id: 'raw_halibut',    name: 'Raw Halibut',     type: 'resource', sell: 29, xp: 75,  img: 'assets/food/raw_halibut.png' },
  raw_manta_ray:  { id: 'raw_manta_ray',  name: 'Raw Manta Ray',   type: 'resource', sell: 40, xp: 120, img: 'assets/food/raw_manta-ray.png' },
  raw_angler:     { id: 'raw_angler',     name: 'Raw Angler',      type: 'resource', sell: 65, xp: 175, img: 'assets/food/raw_angler.png' },
  raw_bluefin_tuna: { id: 'raw_bluefin_tuna', name: 'Raw Bluefin Tuna', type: 'resource', sell: 90,  xp: 250, img: 'assets/food/raw_bluefin_tuna.png' },
  raw_sturgeon:     { id: 'raw_sturgeon',     name: 'Raw Sturgeon',     type: 'resource', sell: 125, xp: 350, img: 'assets/food/raw_sturgeon.png' },

  // Rare secondary drop (not cooked)
  caviar:           { id: 'caviar',           name: 'Caviar',           type: 'resource', sell: 400, xp: 0,   img: 'assets/food/caviar.png', rarity: 'rare' },

  /* -------------------------- Cooked foods ------------------------- */
  shrimps:  { id: 'shrimps',  name: 'Shrimp',  type: 'food', heal: 5,  sell: 2,   img: 'assets/food/shrimp.png' },
  trout:    { id: 'trout',    name: 'Trout',   type: 'food', heal: 12, sell: 3,   img: 'assets/food/trout.png' },
  eel:      { id: 'eel',      name: 'Eel',     type: 'food', heal: 20, sell: 10,  img: 'assets/food/eel.png' },
  salmon:   { id: 'salmon',   name: 'Salmon',  type: 'food', heal: 30, sell: 19,  img: 'assets/food/salmon.png' },
  halibut:  { id: 'halibut',  name: 'Halibut', type: 'food', heal: 38, sell: 36,  img: 'assets/food/halibut.png' },
  manta_ray:{ id: 'manta_ray',name: 'Manta Ray', type: 'food', heal: 45, sell: 52, img: 'assets/food/manta-ray.png' },
  angler:   { id: 'angler',   name: 'Angler',     type: 'food', heal: 50, sell: 82, img: 'assets/food/angler.png' },
  bluefin_tuna: { id: 'bluefin_tuna', name: 'Bluefin Tuna',     type: 'food', heal: 55, sell: 115, img: 'assets/food/bluefin_tuna.png' },
  sturgeon:     { id: 'sturgeon',     name: 'Sturgeon Steak', type: 'food', heal: 62, sell: 160, img: 'assets/food/sturgeon.png' },
  /* ------------------------------ Ores ----------------------------- */
  ore_copper:    { id: 'ore_copper',    name: 'Copper Ore',   type: 'resource', sell: 2,  img: 'assets/materials/ore.png' },
  ore_tin:       { id: 'ore_tin',       name: 'Tin Ore',      type: 'resource', sell: 4,  img: 'assets/materials/ore.png' },
  ore_iron:      { id: 'ore_iron',      name: 'Iron Ore',     type: 'resource', sell: 8,  img: 'assets/materials/ore.png' },
  ore_coal:      { id: 'ore_coal',      name: 'Coal',         type: 'resource', sell: 16,  img: 'assets/materials/coal.png' },
  ore_nightiron: { id: 'ore_nightiron', name: 'Nightiron Ore', type: 'resource', sell: 32, img: 'assets/materials/nightiron.png' },

  /* ------------------------ Smithing resources --------------------- */
  bar_copper:            { id: 'bar_copper',            name: 'Copper Bar',       type: 'resource', sell: 3,   img: 'assets/materials/bar.png' },
  bar_bronze:            { id: 'bar_bronze',            name: 'Bronze Bar',       type: 'resource', sell: 8,   img: 'assets/materials/bar.png' },
  bar_iron:              { id: 'bar_iron',              name: 'Iron Bar',         type: 'resource', sell: 20,   img: 'assets/materials/bar.png' },
  bar_steel:             { id: 'bar_steel',             name: 'Steel Bar',        type: 'resource', sell: 40,  img: 'assets/materials/bar.png' },
  bar_blacksteel:        { id: 'bar_blacksteel',        name: 'Blacksteel Bar',   type: 'resource', sell: 90,  img: 'assets/materials/bar_nightiron.png' },
  copper_upgrade_bar:    { id: 'copper_upgrade_bar',    name: 'Copper Upgrade Bar',   type: 'material', sell: 10,  icon: '➕', img: 'assets/equipment/armor-upgrade.png' },
  bronze_upgrade_bar:    { id: 'bronze_upgrade_bar',    name: 'Bronze Upgrade Bar',   type: 'material', sell: 28, icon: '➕', img: 'assets/equipment/armor-upgrade.png', tint: 'bronze' },
  iron_upgrade_bar:      { id: 'iron_upgrade_bar',      name: 'Iron Upgrade Bar',     type: 'material', sell: 70, icon: '➕', img: 'assets/equipment/armor-upgrade.png', tint: 'iron' },
  steel_upgrade_bar:     { id: 'steel_upgrade_bar',     name: 'Steel Upgrade Bar',    type: 'material', sell: 140, icon: '➕', img: 'assets/equipment/armor-upgrade.png', tint: 'steel' },
  blacksteel_upgrade_bar:{ id: 'blacksteel_upgrade_bar',name: 'Blacksteel Upgrade Bar',type: 'material', sell: 300, icon: '➕', img: 'assets/equipment/upgrade_nightiron.png', tint: 'steel' },

  /* --------------------------- Copper set -------------------------- */
  copper_helm:   { id: 'copper_helm',   name: 'Copper Helm',     type: 'equipment', slot: 'head',   def: 3,  sell: 6,  img: 'assets/equipment/bronze-helm.png',   reqDef: 1 },
  copper_plate:  { id: 'copper_plate',  name: 'Copper Plate',    type: 'equipment', slot: 'body',   def: 8,  sell: 18, img: 'assets/equipment/bronze-plate.png',  reqDef: 1 },
  copper_legs:   { id: 'copper_legs',   name: 'Copper Greaves',  type: 'equipment', slot: 'legs',   def: 5,  sell: 12, img: 'assets/equipment/bronze-legs.png',   reqDef: 1 },
  copper_gloves: { id: 'copper_gloves', name: 'Copper Gloves',   type: 'equipment', slot: 'gloves', def: 2,  sell: 3,  img: 'assets/equipment/bronze-gloves.png', reqDef: 1 },
  copper_boots:  { id: 'copper_boots',  name: 'Copper Boots',    type: 'equipment', slot: 'boots',  def: 2,  sell: 3,  img: 'assets/equipment/bronze-boots.png',  reqDef: 1 },
  copper_shield: { id: 'copper_shield', name: 'Copper Shield',   type: 'equipment', slot: 'shield', def: 7,  sell: 15, img: 'assets/equipment/bronze-shield.png', reqDef: 1 },
  copper_dagger: { id: 'copper_dagger', name: 'Copper Dagger',   type: 'equipment', slot: 'weapon', atk: 6,  str: 2,  sell: 10, img: 'assets/equipment/bronze-dagger.png', reqAtk: 1 },
  copper_sword:  { id: 'copper_sword',  name: 'Copper sword',    type: 'equipment', slot: 'weapon', atk: 9,  str: 5,  sell: 18, img: 'assets/equipment/bronze-sword.png',  reqAtk: 1 },
  copper_hammer: { id: 'copper_hammer', name: 'Copper hammer',   type: 'equipment', slot: 'weapon', atk: 4,  str: 10, sell: 18, img: 'assets/equipment/bronze-hammer.png', reqAtk: 1 },

  /* --------------------------- Bronze set -------------------------- */
  bronze_helm:   { id: 'bronze_helm',   name: 'Bronze Helm',     type: 'equipment', slot: 'head',   def: 5,  sell: 12, img: 'assets/equipment/bronze-helm.png',   tint: 'bronze', reqDef: 5 },
  bronze_plate:  { id: 'bronze_plate',  name: 'Bronze Plate',    type: 'equipment', slot: 'body',   def: 12, sell: 28, img: 'assets/equipment/bronze-plate.png',  tint: 'bronze', reqDef: 5 },
  bronze_legs:   { id: 'bronze_legs',   name: 'Bronze Greaves',  type: 'equipment', slot: 'legs',   def: 8,  sell: 20, img: 'assets/equipment/bronze-legs.png',   tint: 'bronze', reqDef: 5 },
  bronze_gloves: { id: 'bronze_gloves', name: 'Bronze Gloves',   type: 'equipment', slot: 'gloves', def: 3,  sell: 6,  img: 'assets/equipment/bronze-gloves.png', tint: 'bronze', reqDef: 5 },
  bronze_boots:  { id: 'bronze_boots',  name: 'Bronze Boots',    type: 'equipment', slot: 'boots',  def: 3,  sell: 6,  img: 'assets/equipment/bronze-boots.png',  tint: 'bronze', reqDef: 5 },
  bronze_shield: { id: 'bronze_shield', name: 'Bronze Shield',   type: 'equipment', slot: 'shield', def: 10, sell: 24, img: 'assets/equipment/bronze-shield.png', tint: 'bronze', reqDef: 5 },
  bronze_dagger: { id: 'bronze_dagger', name: 'Bronze Dagger',   type: 'equipment', slot: 'weapon', atk: 9,  str: 4,  sell: 16, img: 'assets/equipment/bronze-dagger.png', tint: 'bronze', reqAtk: 5 },
  bronze_sword:  { id: 'bronze_sword',  name: 'Bronze Sword',    type: 'equipment', slot: 'weapon', atk: 12, str: 9,  sell: 28, img: 'assets/equipment/bronze-sword.png',  tint: 'bronze', reqAtk: 5 },
  bronze_hammer: { id: 'bronze_hammer', name: 'Bronze Hammer',   type: 'equipment', slot: 'weapon', atk: 8,  str: 16, sell: 28, img: 'assets/equipment/bronze-hammer.png', tint: 'bronze', reqAtk: 5 },

  /* ---------------------------- Iron set --------------------------- */
  iron_helm:   { id: 'iron_helm',   name: 'Iron Helm',     type: 'equipment', slot: 'head',   def: 8,  sell: 22, img: 'assets/equipment/bronze-helm.png',   tint: 'iron', reqDef: 15 },
  iron_plate:  { id: 'iron_plate',  name: 'Iron Plate',    type: 'equipment', slot: 'body',   def: 18, sell: 42, img: 'assets/equipment/bronze-plate.png',  tint: 'iron', reqDef: 15 },
  iron_legs:   { id: 'iron_legs',   name: 'Iron Greaves',  type: 'equipment', slot: 'legs',   def: 12, sell: 32, img: 'assets/equipment/bronze-legs.png',   tint: 'iron', reqDef: 15 },
  iron_gloves: { id: 'iron_gloves', name: 'Iron Gloves',   type: 'equipment', slot: 'gloves', def: 5,  sell: 12, img: 'assets/equipment/bronze-gloves.png', tint: 'iron', reqDef: 15 },
  iron_boots:  { id: 'iron_boots',  name: 'Iron Boots',    type: 'equipment', slot: 'boots',  def: 5,  sell: 12, img: 'assets/equipment/bronze-boots.png',  tint: 'iron', reqDef: 15 },
  iron_shield: { id: 'iron_shield', name: 'Iron Shield',   type: 'equipment', slot: 'shield', def: 15, sell: 38, img: 'assets/equipment/bronze-shield.png', tint: 'iron', reqDef: 15 },
  iron_dagger: { id: 'iron_dagger', name: 'Iron Dagger',   type: 'equipment', slot: 'weapon', atk: 13, str: 6,  sell: 24, img: 'assets/equipment/bronze-dagger.png', tint: 'iron', reqAtk: 15 },
  iron_sword:  { id: 'iron_sword',  name: 'Iron Sword',    type: 'equipment', slot: 'weapon', atk: 16, str: 12, sell: 40, img: 'assets/equipment/bronze-sword.png',  tint: 'iron', reqAtk: 15 },
  iron_hammer: { id: 'iron_hammer', name: 'Iron Hammer',   type: 'equipment', slot: 'weapon', atk: 11, str: 25, sell: 40, img: 'assets/equipment/bronze-hammer.png', tint: 'iron', reqAtk: 15 },

  /* --------------------------- Steel set --------------------------- */
  steel_helm:   { id: 'steel_helm',   name: 'Steel Helm',     type: 'equipment', slot: 'head',   def: 12, sell: 34, img: 'assets/equipment/bronze-helm.png',   tint: 'steel', reqDef: 25 },
  steel_plate:  { id: 'steel_plate',  name: 'Steel Plate',    type: 'equipment', slot: 'body',   def: 27, sell: 64, img: 'assets/equipment/bronze-plate.png',  tint: 'steel', reqDef: 25 },
  steel_legs:   { id: 'steel_legs',   name: 'Steel Greaves',  type: 'equipment', slot: 'legs',   def: 18, sell: 48, img: 'assets/equipment/bronze-legs.png',   tint: 'steel', reqDef: 25 },
  steel_gloves: { id: 'steel_gloves', name: 'Steel Gloves',   type: 'equipment', slot: 'gloves', def: 8,  sell: 18, img: 'assets/equipment/bronze-gloves.png', tint: 'steel', reqDef: 25 },
  steel_boots:  { id: 'steel_boots',  name: 'Steel Boots',    type: 'equipment', slot: 'boots',  def: 8,  sell: 18, img: 'assets/equipment/bronze-boots.png',  tint: 'steel', reqDef: 25 },
  steel_shield: { id: 'steel_shield', name: 'Steel Shield',   type: 'equipment', slot: 'shield', def: 22, sell: 60, img: 'assets/equipment/bronze-shield.png', tint: 'steel', reqDef: 25 },
  steel_dagger: { id: 'steel_dagger', name: 'Steel Dagger',   type: 'equipment', slot: 'weapon', atk: 18, str: 8,  sell: 38, img: 'assets/equipment/bronze-dagger.png', tint: 'steel', reqAtk: 25 },
  steel_sword:  { id: 'steel_sword',  name: 'Steel Sword',    type: 'equipment', slot: 'weapon', atk: 22, str: 16, sell: 62, img: 'assets/equipment/bronze-sword.png',  tint: 'steel', reqAtk: 25 },
  steel_hammer: { id: 'steel_hammer', name: 'Steel Hammer',   type: 'equipment', slot: 'weapon', atk: 15, str: 35, sell: 62, img: 'assets/equipment/bronze-hammer.png', tint: 'steel', reqAtk: 25 },

  /* ------------------------ Blacksteel set ------------------------- */
  blacksteel_helm:   { id: 'blacksteel_helm',   name: 'Blacksteel Helm',    type: 'equipment', slot: 'head',   def: 18, sell: 120, img: 'assets/equipment/helm.png',   tint: 'blacksteel', reqDef: 35 },
  blacksteel_plate:  { id: 'blacksteel_plate',  name: 'Blacksteel Plate',   type: 'equipment', slot: 'body',   def: 38, sell: 260, img: 'assets/equipment/plate.png',  tint: 'blacksteel', reqDef: 35 },
  blacksteel_legs:   { id: 'blacksteel_legs',   name: 'Blacksteel Greaves', type: 'equipment', slot: 'legs',   def: 26, sell: 190, img: 'assets/equipment/legs.png',   tint: 'blacksteel', reqDef: 35 },
  blacksteel_gloves: { id: 'blacksteel_gloves', name: 'Blacksteel Gloves',  type: 'equipment', slot: 'gloves', def: 12, sell: 90,  img: 'assets/equipment/gloves.png', tint: 'blacksteel', reqDef: 35 },
  blacksteel_boots:  { id: 'blacksteel_boots',  name: 'Blacksteel Boots',   type: 'equipment', slot: 'boots',  def: 12, sell: 90,  img: 'assets/equipment/boots.png',  tint: 'blacksteel', reqDef: 35 },
  blacksteel_shield: { id: 'blacksteel_shield', name: 'Blacksteel Shield',  type: 'equipment', slot: 'shield', def: 30, sell: 220, img: 'assets/equipment/shield.png', tint: 'blacksteel', reqDef: 35 },
  blacksteel_dagger: { id: 'blacksteel_dagger', name: 'Blacksteel Dagger',  type: 'equipment', slot: 'weapon', atk: 24, str: 12, sell: 160, img: 'assets/equipment/dagger.png', tint: 'blacksteel', reqAtk: 35 },
  blacksteel_sword:  { id: 'blacksteel_sword',  name: 'Blacksteel Sword',   type: 'equipment', slot: 'weapon', atk: 30, str: 22, sell: 280, img: 'assets/equipment/sword.png',  tint: 'blacksteel', reqAtk: 35 },
  blacksteel_axe:    { id: 'blacksteel_axe',    name: 'Blacksteel Axe',     type: 'equipment', slot: 'weapon', atk: 20, str: 40, sell: 280, img: 'assets/equipment/axe.png',   tint: 'blacksteel', reqAtk: 35 },

  /* --------------------------- Enchanting -------------------------- */
  tome_forest_novice: {
    id: 'tome_forest_novice',
    name: 'Novice Forest Tome',
    type: 'equipment',
    slot: 'tome',
    img: 'assets/materials/book.png',
    tint: 'forest',
    sell: 25,
    tome: {
      kind: 'auto_gather',
      skill: 'forestry',
      resourceId: 'log_oak',
      minLevel: 1,
      baseSec: 25,
      maxSec: 45,
    },
  },
  tome_sea_novice: {
    id: 'tome_sea_novice',
    name: 'Novice Sea Tome',
    type: 'equipment',
    slot: 'tome',
    img: 'assets/materials/book.png',
    tint: 'sea',
    sell: 25,
    tome: {
      kind: 'auto_gather',
      skill: 'fishing',
      resourceId: 'raw_shrimps',
      minLevel: 1,
      baseSec: 25,
      maxSec: 45,
    },
  },
  tome_rock_novice: {
    id: 'tome_rock_novice',
    name: 'Novice Rock Tome',
    type: 'equipment',
    slot: 'tome',
    img: 'assets/materials/book.png',
    tint: 'rock',
    sell: 25,
    tome: {
      kind: 'auto_gather',
      skill: 'mining',
      resourceId: 'ore_copper',
      minLevel: 1,
      baseSec: 25,
      maxSec: 45,
    },
  },

  /* -------------------------- Ingredients ------------------------- */
  briar_oil:     { id: 'briar_oil',     name: 'Briar Oil',     type: 'reagent', sell: 5,  icon: '🛢️' },
  bramble_heart: { id: 'bramble_heart', name: 'Bramble Heart', type: 'reagent', sell: 25, icon: '💚' },
  bat_teeth:     { id: 'bat_teeth', name: 'Bat Teeth',         type: 'reagent', sell: 20, img: 'assets/materials/bat_teeth.png'},

  potion_mana_small: {
    id: 'potion_mana_small',
    name: 'Small Mana Potion',
    type: 'potion',
    mana: 5,
    sell: 10,
    img: 'assets/potions/mana_potion.png'
  },
  potion_mana_med: {
    id: 'potion_mana_med',
    name: 'Mana Potion',
    type: 'potion',
    mana: 10,
    sell: 40,
    img: 'assets/potions/med_mana_potion.png'
  },
  potion_accuracy: {
    id: 'potion_accuracy',
    name: 'Accuracy Potion',
    img: 'assets/potions/accuracy_potion.png',
    type: 'potion',
    accBonus: 0.08,
    durationSec: 60,
    sell: 25
  },
};
