// systems/xp.js
// OSRS-like cumulative XP table, rescaled so level 2 requires `level2` XP.
// XP_TABLE[L] = total XP required to *be* level L (XP_TABLE[1] = 0).

export function buildXpTable(maxLevel = 99, { level2 = 55, multiplier = 1.0 } = {}){
  // Build raw OSRS cumulative table
  const raw = new Array(maxLevel + 2).fill(0);
  let acc = 0;
  for (let L = 2; L <= maxLevel + 1; L++){
    // OSRS per-level step (pre-cumulative)
    const step = Math.floor((L - 1) + 300 * Math.pow(2, (L - 1) / 7));
    acc += step;
    raw[L] = Math.floor(acc / 4);
  }
  // Scale so level 2 == level2 XP, then apply optional global multiplier
  const k = (level2 / (raw[2] || 1)) * multiplier;
  const t = new Array(raw.length).fill(0);
  t[1] = 0;
  for (let L = 2; L < raw.length; L++){
    t[L] = Math.floor(raw[L] * k);
  }
  return t;
}

export function levelFromXp(xp, table){
  // table[L] is total XP to *be* level L
  let L = 1;
  for (let i = 2; i < table.length; i++){
    if (xp < table[i]) { L = i - 1; break; }
    L = i - 1;
  }
  return L;
}

export function progressFor(xp, table){
  const lvl  = levelFromXp(xp, table);
  const prev = table[lvl] ?? 0;
  const next = table[lvl + 1] ?? table[lvl];
  const into = Math.max(0, xp - prev);
  const span = Math.max(1, next - prev);
  const need = Math.max(0, next - xp);
  const pct  = Math.max(0, Math.min(100, (into / span) * 100));
  return { lvl, prev, next, into, span, need, pct };
}

// Build one shared table used everywhere.
// Defaults: level2 = 55 XP → Lvl 93 ≈ 4,768,187 XP; Lvl 99 ≈ 8,637,273 XP.
// To make the game easier/harder overall, tweak `multiplier` (e.g., 0.8 or 1.2).
export const XP_TABLE = buildXpTable(99, { level2: 55, multiplier: 1.0 });
