// /systems/combat.js
import { MONSTERS } from '../data/monsters.js';
import { renderMonsterGrid } from '../ui/combat.js';
import { addItem, addGold } from './inventory.js';
import { XP_TABLE, levelFromXp } from './xp.js';
import { ITEMS } from '../data/items.js';
import { saveState, state } from './state.js';
import { getActiveEffects } from '../systems/effects.js';
import { PETS } from '../data/pets.js';
import { seedPetForCombat } from './pet.js';
import { applyLevelAndRecalc, grantPetXp } from './pet.js';

const BALANCE = {
  // Player weights (unchanged)
  atkLevelWeight: 3.0,
  atkGearWeight: 2.5,
  strLevelWeight: 0.5,
  strGearWeight: 0.5,
  accBase: 0.15,
  accScale: 0.80,
  defLevelWeight: 1.4,
  defGearWeight: 1.0,
  monAccBase: 0.05,
  monAccScale: 0.90,
  hpBase: 30,
  hpLevelPerDef: 2.5,
  hpGearWeight: 2.0,
  maxHitAtkWeight: 0.1,
  dmgMitigationPerDef: 0.05,

  // Pet-vs-monster tuning
  petTargetDefSlope: 1.1,
  petTargetDefBias: 5,
  petAccBaseReplace: true, // replace base with pet baseAcc rather than add
  petMonAccBase: 0.05,
  petMonAccScale: 0.90,

  // Pet XP
  petXpPerMonsterLevel: 10, // 10 xp per monster level
};

function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

/* ---------------- active effects ---------------- */
function totalAccBonus(s){
  let n = 0;
  for (const eff of getActiveEffects(s)){
    // Accept either key to be compatible with older effects
    const v = Number((eff?.data?.accBonus ?? eff?.data?.hitBonus) || 0);
    if (v) n += v;
  }
  return n;
}
function totalDmgReduce(s){
  let n = 0;
  for (const eff of getActiveEffects(s)){
    const v = Number(eff?.data?.dmgReduce) || 0;
    if (v) n += v;
  }
  return n;
}

/* ---------------- discovery helpers ---------------- */
function dropKey(d){ if (!d) return null; if (d.id) return `item:${d.id}`; if (d.gold) return `gold:${d.gold}`; return null; }
function recordDiscovery(s, d){
  const k = dropKey(d); if (!k) return;
  s.discoveredDrops = s.discoveredDrops || {};
  const firstTime = !s.discoveredDrops[k];
  s.discoveredDrops[k] = true;
  if (firstTime){
    try { window.dispatchEvent(new Event('drops:discover')); } catch {}
  }
}

/* ---------------- gear sum ---------------- */
function sumEquip(s, key){
  let total = 0;
  const eq = s.equipment || {};
  for (const id of Object.values(eq)){
    if (!id) continue;
    const [base, qStr] = String(id).split('@');
    const it = ITEMS[base]; if (!it) continue;
    const mult = qStr ? clamp(parseInt(qStr,10)/100, 0.01, 2) : 1;
    total += Math.round((it[key]||0) * mult);
  }
  return total;
}

function emitHpChange(){ try { window.dispatchEvent(new CustomEvent('hp:change')); } catch {} }

/* -------------------------------- Player stats -------------------------------- */
export function hpMaxFor(s){
  const defLvl = levelFromXp(Number(s.defXp)||0, XP_TABLE);
  const hpGear = sumEquip(s, 'hp');
  return Math.floor(BALANCE.hpBase + defLvl * BALANCE.hpLevelPerDef + hpGear * BALANCE.hpGearWeight);
}

export function derivePlayerStats(s, mon){
  const atkLvl = levelFromXp(Number(s.atkXp)||0, XP_TABLE);
  const strLvl = levelFromXp(Number(s.strXp)||0, XP_TABLE);
  const defLvl = levelFromXp(Number(s.defXp)||0, XP_TABLE);
  const atkBonus = sumEquip(s,'atk');
  const strBonus = sumEquip(s,'str');
  const defBonus = sumEquip(s,'def');

  const atkRating = atkLvl*BALANCE.atkLevelWeight + atkBonus*BALANCE.atkGearWeight;
  const defRating = defLvl*BALANCE.defLevelWeight + defBonus*BALANCE.defGearWeight;
  const strRating = strLvl*BALANCE.strLevelWeight + strBonus*BALANCE.strGearWeight;

  const targetDef = ((mon?.defense ?? mon?.level ?? 1) * 1.3) + 10;
  let acc = BALANCE.accBase + (atkRating/(atkRating + targetDef))*BALANCE.accScale;
  acc = clamp(acc + totalAccBonus(s), 0.05, 0.99);

  const maxHit = Math.max(1, Math.floor(1 + strRating + atkLvl*BALANCE.maxHitAtkWeight));
  return { atkLvl, strLvl, defLvl, atkBonus, strBonus, defBonus, maxHit, acc, atkRating, defRating, strRating };
}

/* -------------------------------- Pet stats -------------------------------- */
function activePetId(s){ return s.ui?.activePet || null; }

function ensurePetRecord(s, id){
  s.pets = s.pets || {};
  if (!s.pets[id] || typeof s.pets[id] !== 'object'){
    s.pets[id] = { level: 1, xp: 0 };
  } else {
    if (!Number.isFinite(s.pets[id].level)) s.pets[id].level = 1;
    if (!Number.isFinite(s.pets[id].xp))    s.pets[id].xp    = 0;
  }
  return s.pets[id];
}

export function derivePetStats(s, mon){
  const combat = s.combat;
  const petId  = (combat && combat.petId) || s.ui?.activePet;
  const pet    = petId && s.pets ? s.pets[petId] : null;
  if (!pet) return null;

  const d = PETS[petId];
  if (!d) return null;

  const L = Math.max(1, pet.level|0);

  const def    = Math.round(d.baseDef       + (d.growthDef       || 0) * (L - 1));
  const acc    = (d.baseAcc ?? 0)           + (d.growthAcc       || 0) * (L - 1);
  const maxHit = Math.round((d.baseMaxHit   ?? 0) + (d.growthMaxHit || 0) * (L - 1));
  const maxHp  = Math.round(d.baseHp        + (d.growthHp        || 0) * (L - 1));

  // Use combat’s live hp if present, otherwise state hp; clamp to max
  const hp = Math.min(((combat && Number.isFinite(combat.petHp)) ? combat.petHp : (pet.hp|0)), maxHp);

  return {
    name: d.name || petId,
    def, acc, maxHit, hp, maxHp
  };
}

/* ---------------------------- Pet XP & Leveling ---------------------------- */
const PET_XP_MULT = (state?.tuning?.petXpMult ?? 0.70);
function petXpForLevel(L){
  const base = XP_TABLE[L] || 0;
  return Math.floor(base * PET_XP_MULT);
}

/* -------------------------------- Combat lifecycle -------------------------------- */

export function beginFight(state, monsterId, opts = {}){
  const petOnly = !!opts.petOnly;
  const mon = MONSTERS.find(m => m.id === monsterId);
  if (!mon) return null;

  if (petOnly){
    const seeded = seedPetForCombat(state);   // pull from STATE (single source of truth)
    if (!seeded) return null;

    state.combat = {
      monsterId: mon.id,
      monHp: mon.hp | 0,

      petOnly: true,
      petId: seeded.id,
      petName: seeded.name,
      petHp: seeded.hp,
      petMax: seeded.maxHp,
      turn: 0,
    };
  } else {
    const maxHp = hpMaxFor(state);
    if (state.hpCurrent == null) state.hpCurrent = maxHp;
    else state.hpCurrent = Math.max(1, Math.min(maxHp, state.hpCurrent|0));
    state.combat = {
      monsterId: mon.id,
      monHp: mon.hp | 0,
      petOnly: false,
      turn: 0,
    };
  }

  return state.combat;
}


function monXpCanon(mon){
  const x = mon?.xp || {};
  return {
    atk: Number.isFinite(x.atk) ? x.atk : (Number(x.attack)   || 0),
    str: Number.isFinite(x.str) ? x.str : (Number(x.strength) || 0),
    def: Number.isFinite(x.def) ? x.def : (Number(x.defense)  || 0),
  };
}

function onMonsterKilled(mon){
  state.monsterKills = state.monsterKills || {};
  state.monsterKills[mon.id] = (state.monsterKills[mon.id] || 0) + 1;
  try { window.dispatchEvent(new CustomEvent('kills:change', { detail: { monsterId: mon.id, total: state.monsterKills[mon.id] } })); } catch {}
  saveState();
}

function rollQty(d){
  if (Number.isFinite(d?.qty)) return d.qty;
  const lo = Number.isFinite(d?.min) ? d.min : Number.isFinite(d?.max) ? d.max : 1;
  const hi = Number.isFinite(d?.max) ? d.max : lo;
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

/* Loot award is shared; XP goes to player only in player fights */
function awardWin(s, mon, { playerXp = true } = {}){
  onMonsterKilled(mon);
  renderMonsterGrid(mon.zone);

  const style = s.trainingStyle || 'shared';
  const base = monXpCanon(mon);

  let gained = { atk:0, str:0, def:0 };
  if (playerXp){
    if (style === 'attack') gained.atk = base.atk;
    else if (style === 'strength') gained.str = base.str;
    else if (style === 'defense') gained.def = base.def;
    else {
      gained.atk = base.atk > 0 ? Math.max(1, Math.floor(base.atk/3)) : 0;
      gained.str = base.str > 0 ? Math.max(1, Math.floor(base.str/3)) : 0;
      gained.def = base.def > 0 ? Math.max(1, Math.floor(base.def/3)) : 0;
    }
    s.atkXp = (Number(s.atkXp)||0) + gained.atk;
    s.strXp = (Number(s.strXp)||0) + gained.str;
    s.defXp = (Number(s.defXp)||0) + gained.def;
  }

  const lootNames = [];
  for (const d of (mon.drops || [])){
    if (Math.random() < (d.chance ?? 0)){
      if (d.id){
        const n = rollQty(d);
        addItem(s, d.id, n);
        const nm = ITEMS[d.id]?.name || d.id;
        lootNames.push(`${nm}${n>1 ? ` ×${n}` : ''}`);
      }
      if (d.gold){
        const amount = (Number.isFinite(d.qty) || Number.isFinite(d.min) || Number.isFinite(d.max)) ? rollQty(d) : Number(d.gold) || 0;
        if (amount > 0){
          addGold(s, amount);
          lootNames.push(`${amount}g`);
        }
      }
      recordDiscovery(s, d);
    }
  }

  s.combat = null;
  const xpPayload = playerXp ? { atk: gained.atk, str: gained.str, def: gained.def } : { atk:0, str:0, def:0 };
  return { xp: xpPayload, loot: lootNames };
}

/* -------------------------------- Turn resolution -------------------------------- */
export function turnFight(s){
  const combat = s.combat;
  if (!combat) return { done:true, reason:'no-combat' };

  const mon = MONSTERS.find(m=>m.id===combat.monsterId);
  if (!mon) { s.combat = null; return { done:true, reason:'bad-monster' }; }

  // ---- PET-ONLY PATH ----
  if (combat.petOnly){
    const ps = derivePetStats(s, mon);
    let log = [];
    if (!ps){
      s.combat = null;
      return { done:true, reason:'no-pet', log:[`No pet equipped.`], xp:{atk:0,str:0,def:0}, loot:[], petXp:0 };
    }

    // Pet attacks monster
    if (Math.random() < ps.acc){
      const dmg = 1 + Math.floor(Math.random() * ps.maxHit);
      combat.monHp = Math.max(0, combat.monHp - dmg);
      log.push(`${ps.name} hits ${mon.name} for ${dmg}.`);
    } else {
      log.push(`${ps.name} misses ${mon.name}.`);
    }

    // WIN
    if (combat.monHp <= 0){
      const gained = BALANCE.petXpPerMonsterLevel * Math.max(1, mon.level || 1);
      const petRes = grantPetXp(s, gained);

      // Recalc ALL stats on the pet & FULL HEAL (single source of truth in state)
      const petId = combat.petId || s.ui?.activePet;
      applyLevelAndRecalc(s, petId, s.pets[petId].level);
      // also ensure combat reflects healed vitals right before we clear (optional)
      combat.petMax = s.pets[petId].maxHp;
      combat.petHp  = s.pets[petId].hp;

      const payload = awardWin(s, mon, { playerXp:false }); // award loot for pets

      log.push(`${ps.name} defeated ${mon.name}!`);
      log.push(`${ps.name} gains ${petRes.gained} pet xp.` + (petRes.newLevel > (petRes.oldLevel||0) ? ` Level up! ${petRes.oldLevel} → ${petRes.newLevel}.` : ''));

      return {
        done:true, win:true, log,
        loot: payload.loot || [],
        petXp: petRes.gained, petLevel: petRes.newLevel
      };
    }

    // Monster hits pet
    const petDefRating = ps.def * BALANCE.defLevelWeight;
    const monAtkRating = (mon.attack ?? mon.level)*1.4 + 10;
    const monAcc = clamp(BALANCE.petMonAccBase + (monAtkRating/(monAtkRating + petDefRating))*BALANCE.petMonAccScale, 0.05, 0.95);
    const monMaxHit = mon.maxHit ?? (3 + Math.floor((mon.level||1)/5));

    if (Math.random() < monAcc){
      const dmg = 1 + Math.floor(Math.random()*monMaxHit);
      combat.petHp = Math.max(0, (combat.petHp|0) - dmg);
      log.push(`${mon.name} hits ${ps.name} for ${dmg}.`);
    } else {
      log.push(`${mon.name} misses ${ps.name}.`);
    }

    combat.turn++;

    // LOSS
    if ((combat.petHp|0) <= 0){
      const petId = combat.petId || s.ui?.activePet;
      // On loss: bring hp back to max (no healing system)
      applyLevelAndRecalc(s, petId, s.pets[petId].level);

      const name = ps.name;
      s.combat = null;

      return {
        done: true, win: false,
        log: [...log, `${name} was defeated by ${mon.name}.`],
        petXp: 0
      };
    }

    return { done:false, log, petHp: combat.petHp, petMax: combat.petMax };
  }

  // ---- PLAYER PATH (unchanged) ----
  const ps = derivePlayerStats(s, mon);
  let log = [];

  if (Math.random() < ps.acc){
    const dmg = 1 + Math.floor(Math.random()*ps.maxHit);
    combat.monHp = Math.max(0, combat.monHp - dmg);
    log.push(`You hit ${mon.name} for ${dmg}.`);
  } else {
    log.push(`You miss ${mon.name}.`);
  }

  if (combat.monHp <= 0){
    const payload = awardWin(s, mon, { playerXp:true });
    log.push(`You defeated ${mon.name}!`);
    return { done:true, win:true, log, xp: payload.xp, loot: payload.loot };
  }

  const monAtkRating = (mon.attack ?? mon.level)*1.4 + 10;
  const monAcc = clamp(BALANCE.monAccBase + (monAtkRating/(monAtkRating + ps.defRating))*BALANCE.monAccScale, 0.05, 0.95);
  const monMaxHit = mon.maxHit ?? (3 + Math.floor((mon.level||1)/5));

  if (Math.random() < monAcc){
    let dmg = 1 + Math.floor(Math.random()*monMaxHit);
    const gearMit = Math.floor(ps.defBonus * BALANCE.dmgMitigationPerDef);
    const buffMit = totalDmgReduce(s);
    dmg = Math.max(1, dmg - gearMit - buffMit);
    const mx = hpMaxFor(s);
    const cur = Math.max(0, Math.min(mx, s.hpCurrent ?? mx));
    s.hpCurrent = Math.max(0, cur - dmg);
    s.lastDamageMs = performance.now();
    emitHpChange();
    log.push(`${mon.name} hits you for ${dmg}.`);
  } else {
    log.push(`${mon.name} misses you.`);
  }

  combat.turn++;

  if (s.hpCurrent <= 0){
    s.hpCurrent = 1;
    emitHpChange();
    s.combat = null;
    return { done: true, win: false, log: [...log, `You were defeated by ${mon.name}.`], xp: { atk:0, str:0, def:0 }, loot: [] };
  }

  return { done:false, log };
}
