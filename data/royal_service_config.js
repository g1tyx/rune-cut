// /data/royal_service_config.js

export const PATRONS = [
  { id: 'Warden',        kind: 'slay',    tags: [] },
  { id: 'Quartermaster', kind: 'deliver', tags: ['log','plank','ore','bar','resource'] },
  { id: 'Armorer',       kind: 'deliver', tags: ['bar','equipment'] },
  { id: 'Steward',       kind: 'deliver', tags: ['food'] },
  { id: 'Craftsman',     kind: 'deliver', tags: ['plank','glass','cloth','rope','board'] },
];

/** Map your state XP keys -> skill ids we’ll use for gating */
export const SKILLS = {
  woodcut:     'wcXp',
  fishing:     'fishXp',
  mining:      'minXp',
  smith:       'smithXp',
  craft:       'craftXp',
  cook:        'cookXp',
  construction:'constructionXp',
};

export const TAG_SKILL = {
  log: 'woodcut',
  plank: 'construction',
  ore: 'mining',
  bar: 'smith',
  equipment: 'smith',
  food: 'cook',
  fish: 'fishing',
  glass: 'craft',
  cloth: 'craft',
  rope: 'craft',
  board: 'construction',
  resource: null, 
};

export const TIERING = {
  sellToLevel: [
    { sellLTE: 10, level: 1 },
    { sellLTE: 25, level: 5 },
    { sellLTE: 60, level: 10 },
    { sellLTE: 150, level: 20 },
    { sellLTE: 300, level: 30 },
    { sellLTE: 600, level: 40 },
    { sellLTE: 1200, level: 50 },
    { sellLTE: 2400, level: 60 },
    { sellLTE: 5000, level: 70 },
    { sellLTE: 9999999, level: 80 },
  ],
  maxInferredLevel: 80,
};

export const CONTRACT_BUDGETS = [
  { to:  5, min:  22, max:  35 },
  { to: 15, min:  36, max: 60 },
  { to: 30, min: 61, max: 91 },
  { to: 50, min: 92, max: 120 },
  { to: 75, min: 121, max: 161 },
  { to: 99, min: 162, max: 300 },
];

export const CONTRACT_LAYOUT = [
  { to:  5, tasksMin: 3, tasksMax: 4, perTaskFracMin: 0.18, perTaskFracMax: 0.28 },
  { to: 15, tasksMin: 4, tasksMax: 5, perTaskFracMin: 0.16, perTaskFracMax: 0.26 },
  { to: 30, tasksMin: 5, tasksMax: 6, perTaskFracMin: 0.14, perTaskFracMax: 0.24 },
  { to: 50, tasksMin: 5, tasksMax: 6, perTaskFracMin: 0.14, perTaskFracMax: 0.22 },
  { to: 75, tasksMin: 6, tasksMax: 6, perTaskFracMin: 0.13, perTaskFracMax: 0.21 },
  { to: 99, tasksMin: 6, tasksMax: 6, perTaskFracMin: 0.12, perTaskFracMax: 0.20 },
];

/** Max allowed effective item level per Royal Service level band */
export const ITEM_LEVEL_CAPS = [
  { to:  5, maxItemLevel: 10 },
  { to: 15, maxItemLevel: 25 },
  { to: 30, maxItemLevel: 40 },
  { to: 50, maxItemLevel: 55 },
  { to: 75, maxItemLevel: 70 },
  { to: 99, maxItemLevel: 80 },
];

/** Eligibility rules */
export const ELIGIBILITY = {
  allowedAnyTags: ['resource','log','plank','ore','bar','food','equipment','glass','cloth','rope','board'],
  excludeTags:    ['rare','seed','spell','page'],
  excludeIds:     ['dragon_bones','pages'],
  excludeSuffix:  ['_rare'],
  excludeInputTags: ['rare','seed','spell','page'],
  excludeInputIds:  ['dragon_bones'],
  whitelistIds:   [],
};

/** Weighted picking for deliverable candidates */
export const WEIGHTING = {
  tagBase: { log:1.4, ore:1.3, bar:1.2, plank:1.1, food:1.2, resource:1.0, equipment:1.0, glass:1.1, cloth:1.1, rope:1.1, board:1.1 },
  tightFitBonus: 1.25,
  actionSlopeLow: -0.06,
  actionSlopeHigh: -0.02,
  highLevelAt: 40,
};

/** Rewards tuning */
export const REWARDS = {
  // Deliverables XP = (xpPerActionBase * tierMult(level)) * actions^actionsExponent
  xpPerActionBase: 8,
  actionsExponent: 0.92,

  // Tier multiplier by effective level (first match wins)
  tierXp: [
    { to: 10, mult: 1.00 },
    { to: 20, mult: 1.06 },
    { to: 30, mult: 1.12 },
    { to: 40, mult: 1.18 },
    { to: 50, mult: 1.25 },
    { to: 60, mult: 1.33 },
    { to: 70, mult: 1.42 },
    { to: 80, mult: 1.52 },
    { to: 99, mult: 1.62 },
  ],

  // Gold: 50% of item sell value per item (deliver tasks only)
  goldFromSellPct: 0.50,
  minGold: 0,

  // Patron multipliers (after summing tasks)
  patronXpMult: { Steward:0.60, Quartermaster:2.20, Craftsman:2.50, Warden:1.20, Armorer:1.60 },

  // Warden XP (no gold): xpPerKill = combatXpBase + combatXpPerLevel * monsterLevel
  combatXpBase: 4,
  combatXpPerLevel: 1.1,

  // Soft cap on total XP per contract (applied last)
  softCap: { pctOfCurrent: 0.22, baseAdd: 60, minAbs: 40, maxAbs: 6000 },
};

/** Warden kill sizing uses the same action budget via actionsPerKill */
export const COMBAT = {
  actionsPerKillBase: 2.0,
  actionsPerKillPerLevel: 0.02,
  actionsPerKillMin: 1.0,
  actionsPerKillMax: 8.0,
};

export const COOLDOWNS = {
  abandonMs: 5 * 60 * 1000,
};

export const UI_TEXT = {
  headerTitle: 'Royal Service',
  requestBtn: 'Request Contract',
  abandonBtn: 'Abandon Contract',
  turnInAllBtn: 'Turn In Contract',
  rewardLabel: 'Reward',
  effortLabel: 'Effort',
  patronTagsLabel: 'Patron Tags',
  noContract: 'No active contract. Click “Request Contract”.',
  noneAvailable: 'No valid tasks yet. Level up related skills and try again.',
  cooldown: (mins)=> `You can cancel a contract again in ${mins} min`,
  patrons: {
    Warden:        'The Royal Warden calls upon you to defend the kingdom:',
    Quartermaster: 'The Royal Quartermaster has requested the following building supplies:',
    Armorer:       'The Royal Armorer has issued a contract to arm the kingdom\'s troops:',
    Steward:       'The Royal Steward has requested the following food supplies:',
    Craftsman:     'The Royal Craftsman has requested the following goods:',
    Default:       'A Royal Patron has requested the following:',
  },
};
