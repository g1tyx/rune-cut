// /systems/combat.js — quality-aware gear, stable HP calc, UI-compatible XP payload
import { MONSTERS } from '../data/monsters.js';
import { renderMonsterGrid } from '../ui/combat.js';
import { addItem, addGold } from './inventory.js';
import { XP_TABLE, levelFromXp } from './xp.js';
import { ITEMS } from '../data/items.js';
import { saveState, state } from './state.js';

/* ------------------- Tuning knobs ------------------- */
const BALANCE = {
  // Player ratings
  atkLevelWeight: 3.0,   // Attack level → accuracy
  atkGearWeight:  2.5,   // +Atk gear → accuracy
  strLevelWeight: 0.5,   // Strength level → max hit
  strGearWeight:  0.5,   // +Str gear → max hit

  // Accuracy curves
  accBase:   0.15,       // flat base hit chance
  accScale:  0.80,       // portion driven by ratings vs target

  // Defense vs monsters
  defLevelWeight: 1.4,   // Defense level → resist
  defGearWeight:  0.8,   // +Def gear → resist
  monAccBase:  0.05,     // monster base hit chance
  monAccScale: 0.90,     // monster accuracy scaling

  // HP
  hpBase: 30,
  hpLevelPerDef: 2.5,
  hpGearWeight: 2.0,

  // Minor extra tie-in: a bit of Attack into max hit
  maxHitAtkWeight: 0.1,

  // Damage mitigation from your defense gear (per point)
  dmgMitigationPerDef: 0.05
};

function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

function dropKey(d){
  if (!d) return null;
  if (d.id)   return `item:${d.id}`;
  if (d.gold) return `gold:${d.gold}`;
  return null;
}
function recordDiscovery(state, d){
  const k = dropKey(d);
  if (!k) return;
  state.discoveredDrops = state.discoveredDrops || {};
  state.discoveredDrops[k] = true;
}

/* ------------------- Equipment helpers ------------------- */
// Quality-aware equipment stat sum (supports ids like "copper_plate@87")
function sumEquip(state, key){
  let total = 0;
  const eq = state.equipment || {};
  for (const id of Object.values(eq)){
    if (!id) continue;
    const [base, qStr] = String(id).split('@');
    const it = ITEMS[base]; if (!it) continue;
    const mult = qStr ? clamp(parseInt(qStr,10)/100, 0.01, 2) : 1; // 1–100% => 0.01–1.00 (cap 2x just in case)
    total += Math.round((it[key]||0) * mult);
  }
  return total;
}

function emitHpChange(){ try { window.dispatchEvent(new CustomEvent('hp:change')); } catch {} }

/* ------------------- Public: HP calc ------------------- */
export function hpMaxFor(state){
  const defLvl = levelFromXp(Number(state.defXp)||0, XP_TABLE);
  const hpGear = sumEquip(state, 'hp');
  return Math.floor(
    BALANCE.hpBase +
    defLvl * BALANCE.hpLevelPerDef +
    hpGear * BALANCE.hpGearWeight
  );
}

/* ------------------- Public: player snapshot ------------------- */
export function derivePlayerStats(state, mon){
  const atkLvl = levelFromXp(Number(state.atkXp)||0, XP_TABLE);
  const strLvl = levelFromXp(Number(state.strXp)||0, XP_TABLE);
  const defLvl = levelFromXp(Number(state.defXp)||0, XP_TABLE);

  const atkBonus = sumEquip(state,'atk');
  const strBonus = sumEquip(state,'str');
  const defBonus = sumEquip(state,'def');

  // Ratings (bigger numbers = stronger effect)
  const atkRating = atkLvl*BALANCE.atkLevelWeight + atkBonus*BALANCE.atkGearWeight;
  const defRating = defLvl*BALANCE.defLevelWeight + defBonus*BALANCE.defGearWeight;
  const strRating = strLvl*BALANCE.strLevelWeight + strBonus*BALANCE.strGearWeight;

  // Accuracy vs selected monster
  const targetDef = ((mon?.defense ?? mon?.level ?? 1) * 1.3) + 10;
  const acc = clamp(BALANCE.accBase + (atkRating/(atkRating + targetDef))*BALANCE.accScale, 0.05, 0.95);

  // Max hit — driven by Strength, lightly by Attack level
  const maxHit = Math.max(1, Math.floor(1 + strRating + atkLvl*BALANCE.maxHitAtkWeight));

  return { atkLvl, strLvl, defLvl, atkBonus, strBonus, defBonus, maxHit, acc, atkRating, defRating, strRating };
}

/* ------------------- Combat lifecycle ------------------- */
export function beginFight(state, monsterId){
  if (state.combat) return;
  const mon = MONSTERS.find(m=>m.id===monsterId);
  if (!mon) return;
  const mx = hpMaxFor(state);
  // Initialize or clamp current HP to new max
  if (state.hpCurrent == null) state.hpCurrent = mx;
  else state.hpCurrent = Math.min(state.hpCurrent, mx);
  state.combat = { monsterId, monHp: mon.hp ?? 20, turn: 0 };
}

export function turnFight(state){
  if (!state.combat) return { done:true, reason:'no-combat' };
  const mon = MONSTERS.find(m=>m.id===state.combat.monsterId);
  if (!mon) { state.combat = null; return { done:true, reason:'bad-monster' }; }

  const ps = derivePlayerStats(state, mon);
  let log = [];

  // --- Player attacks ---
  if (Math.random() < ps.acc){
    const dmg = 1 + Math.floor(Math.random()*ps.maxHit); // 1..maxHit
    state.combat.monHp = Math.max(0, state.combat.monHp - dmg);
    log.push(`You hit ${mon.name} for ${dmg}.`);
  } else {
    log.push(`You miss ${mon.name}.`);
  }

  if (state.combat.monHp <= 0){
    const payload = awardWin(state, mon);           // <-- includes onMonsterKilled()
    log.push(`You defeated ${mon.name}!`);
    return { done:true, win:true, log, xp: payload.xp, loot: payload.loot };
  }

  // --- Monster attacks ---
  const monAtkRating = (mon.attack ?? mon.level)*1.4 + 10;
  const monAcc = clamp(BALANCE.monAccBase + (monAtkRating/(monAtkRating + ps.defRating))*BALANCE.monAccScale, 0.05, 0.95);
  const monMaxHit = mon.maxHit ?? (3 + Math.floor((mon.level||1)/5));

  if (Math.random() < monAcc){
    let dmg = 1 + Math.floor(Math.random()*monMaxHit);
    const mitigation = Math.floor(ps.defBonus * BALANCE.dmgMitigationPerDef);
    dmg = Math.max(1, dmg - mitigation);
    const mx = hpMaxFor(state);
    const cur = Math.max(0, Math.min(mx, state.hpCurrent ?? mx));
    state.hpCurrent = Math.max(0, cur - dmg);
    state.lastDamageMs = performance.now();
    emitHpChange();
    log.push(`${mon.name} hits you for ${dmg}.`);
  } else {
    log.push(`${mon.name} misses you.`);
  }

  state.combat.turn++;

  if (state.hpCurrent <= 0){
    // You "die", but don't lose progress; exit combat
    state.hpCurrent = 1;
    emitHpChange();
    state.combat = null;
    return {
      done: true,
      win: false,
      log: [...log, `You were defeated by ${mon.name}.`],
      xp: { atk:0, str:0, def:0 },
      loot: []
    };
  }

  return { done:false, log };
}

/* ------------------- Rewards ------------------- */
function monXpCanon(mon){
  const x = mon?.xp || {};
  return {
    atk: Number.isFinite(x.atk) ? x.atk : (Number(x.attack)   || 0),
    str: Number.isFinite(x.str) ? x.str : (Number(x.strength) || 0),
    def: Number.isFinite(x.def) ? x.def : (Number(x.defense)  || 0),
  };
}

// Ensure the kills map exists and notify listeners (Royal Service)
function onMonsterKilled(mon){
  state.monsterKills = state.monsterKills || {};
  state.monsterKills[mon.id] = (state.monsterKills[mon.id] || 0) + 1;
  try {
    window.dispatchEvent(new CustomEvent('kills:change', {
      detail: { monsterId: mon.id, total: state.monsterKills[mon.id] }
    }));
  } catch {}
  saveState();
}

function awardWin(state, mon){
  // 1) Mark kill FIRST so any listeners (Royal Service) update immediately
  onMonsterKilled(mon);
  renderMonsterGrid(mon.zone);

  // 2) Grant combat XP based on training style
  const style = state.trainingStyle || 'shared';
  const base = monXpCanon(mon);

  let gained = { atk:0, str:0, def:0 };
  if (style === 'attack')        gained.atk = base.atk;
  else if (style === 'strength') gained.str = base.str;
  else if (style === 'defense')  gained.def = base.def;
  else {
    // shared — split, but guarantee at least 1 each if base > 0
    gained.atk = base.atk > 0 ? Math.max(1, Math.floor(base.atk/3)) : 0;
    gained.str = base.str > 0 ? Math.max(1, Math.floor(base.str/3)) : 0;
    gained.def = base.def > 0 ? Math.max(1, Math.floor(base.def/3)) : 0;
  }

  state.atkXp = (Number(state.atkXp)||0) + gained.atk;
  state.strXp = (Number(state.strXp)||0) + gained.str;
  state.defXp = (Number(state.defXp)||0) + gained.def;

  // 3) Loot roll (single pass, with discovery tracking)
  const lootNames = [];
  for (const d of (mon.drops || [])){
    if (Math.random() < (d.chance ?? 0)){
      if (d.id){
        addItem(state, d.id, 1);
        lootNames.push(ITEMS[d.id]?.name || d.id);
      }
      if (d.gold){
        addGold(state, d.gold);
        lootNames.push(`${d.gold}g`);
      }
      recordDiscovery(state, d);
    }
  }

  // 4) Exit combat
  state.combat = null;

  // 5) Return payload in the *UI shape* { atk, str, def }
  const xpPayload = { atk: gained.atk, str: gained.str, def: gained.def };
  return { xp: xpPayload, loot: lootNames };
}
