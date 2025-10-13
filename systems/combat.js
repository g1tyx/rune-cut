// /systems/combat.js
import { MONSTERS } from '../data/monsters.js';
import { renderMonsterGrid } from '../ui/combat.js';
import { addItem, addGold } from './inventory.js';
import { XP_TABLE, levelFromXp } from './xp.js';
import { ITEMS } from '../data/items.js';
import { saveNow, state } from './state.js';
import { getActiveEffects } from '../systems/effects.js';
import { PETS } from '../data/pets.js';
import { seedPetForCombat } from './pet.js';
import { applyLevelAndRecalc, grantPetXp } from './pet.js';
import { renderAlchemy } from '../ui/alchemy.js';
import { renderFarming } from '../ui/farming.js';
import { recordWardenKill } from './royal_service.js';

const BALANCE = {
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
  hpGearWeight: 1.0,
  maxHitAtkWeight: 0.1,
  dmgMitigationPerDef: 0.05,

  petTargetDefSlope: 1.1,
  petTargetDefBias: 5,
  petAccBaseReplace: true,
  petMonAccBase: 0.05,
  petMonAccScale: 0.90,

  petXpPerMonsterLevel: 10,
};

export function elementalMultiplier(elem, monOrType){
  if (!elem) return 1.0;
  const t = (typeof monOrType === 'string') ? monOrType : (monOrType?.type || null);
  if (!t) return 1.0;

  const E = String(elem).toLowerCase();
  const T = String(t).toLowerCase();

  if (E === 'fire'){
    if (T === 'forest') return 1.25;
    if (T === 'water')  return 0.75;
  }
  if (E === 'water'){
    if (T === 'fire')   return 1.25;
    if (T === 'forest') return 0.75;
    if (T === 'ground') return 1.25;
  }
  if (E === 'forest'){
    if (T === 'water')  return 1.25;
    if (T === 'ground') return 1.25;
  }

  return 1.0;
}

function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

const RING_ENCH_RE = /#e:([a-zA-Z_]+):(\d+)/;
function ringEnchant(state){
  const id = state?.equipment?.ring;
  if (!id) return null;
  const m = String(id).match(RING_ENCH_RE);
  return m ? { stat: m[1], add: Number(m[2])||0 } : null;
}

function totalAccBonus(s){
  let n = 0;
  for (const eff of getActiveEffects(s)){
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

// NEW: sum of all active poison effects (player-only)
function totalPoisonDamage(s){
  let n = 0;
  for (const eff of getActiveEffects(s)){
    const v = Number(eff?.data?.poisonDmg) || 0;
    if (v > 0) n += v;
  }
  return n | 0;
}

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

function afterCombatFinish(win, monId){
  try { renderAlchemy(); } catch {}
  try { renderFarming(); } catch {}
  try { window.dispatchEvent(new CustomEvent('combat:finish', { detail: { id: monId, win: !!win } })); } catch {}
}

export function hpMaxFor(s){
  const defLvl = levelFromXp(Number(s.defXp)||0, XP_TABLE);
  const hpGear = sumEquip(s, 'hp');
  let max = BALANCE.hpBase + defLvl * BALANCE.hpLevelPerDef + hpGear * BALANCE.hpGearWeight;

  const m = String(s?.equipment?.ring || '').match(/#e:([a-zA-Z_]+):(\d+)/);
  if (m && m[1] === 'hpMax'){
    max += Number(m[2]) || 0;
  }
  return Math.floor(max);
}

export function ensureHp(state){
  const max = hpMaxFor(state);
  if (state.hpCurrent == null) state.hpCurrent = max;
  state.hpCurrent = Math.max(0, Math.min(max, state.hpCurrent));
  try { window.dispatchEvent(new Event('hp:change')); } catch {}
  return state.hpCurrent;
}

export function derivePlayerStats(s, mon){
  const atkLvl = levelFromXp(Number(s.atkXp)||0, XP_TABLE);
  const strLvl = levelFromXp(Number(s.strXp)||0, XP_TABLE);
  const defLvl = levelFromXp(Number(s.defXp)||0, XP_TABLE);

  let atkBonus = sumEquip(s,'atk');
  let strBonus = sumEquip(s,'str');
  let defBonus = sumEquip(s,'def');

  const m = String(s?.equipment?.ring || '').match(/#e:([a-zA-Z_]+):(\d+)/);
  if (m){
    const stat = m[1], add = Number(m[2])||0;
    if (stat === 'attack')   atkBonus += add;
    if (stat === 'strength') strBonus += add;
    if (stat === 'defense')  defBonus += add;
  }

  const atkRating = atkLvl*BALANCE.atkLevelWeight + atkBonus*BALANCE.atkGearWeight;
  const defRating = defLvl*BALANCE.defLevelWeight + defBonus*BALANCE.defGearWeight;
  const strRating = strLvl*BALANCE.strLevelWeight + strBonus*BALANCE.strGearWeight;

  const targetDef = ((mon?.defense ?? mon?.level ?? 1) * 1.3) + 10;
  let acc = BALANCE.accBase + (atkRating/(atkRating + targetDef))*BALANCE.accScale;
  acc = clamp(acc + totalAccBonus(s), 0.05, 0.99);

  const maxHit = Math.max(1, Math.floor(1 + strRating + atkLvl*BALANCE.maxHitAtkWeight));

  return { atkLvl, strLvl, defLvl, atkBonus, strBonus, defBonus, maxHit, acc, atkRating, defRating, strRating };
}

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

  const hp = Math.min(((combat && Number.isFinite(combat.petHp)) ? combat.petHp : (pet.hp|0)), maxHp);

  return {
    name: d.name || petId,
    def, acc, maxHit, hp, maxHp
  };
}

const PET_XP_MULT = (state?.tuning?.petXpMult ?? 0.70);
function petXpForLevel(L){
  const base = XP_TABLE[L] || 0;
  return Math.floor(base * PET_XP_MULT);
}

export function beginFight(state, monsterId, opts = {}){
  const petOnly = !!opts.petOnly;
  const mon = MONSTERS.find(m => m.id === monsterId);
  if (!mon) return null;

  if (petOnly){
    const seeded = seedPetForCombat(state);
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
  saveNow();
}

function rollQty(d){
  if (Number.isFinite(d?.qty)) return d.qty;
  const lo = Number.isFinite(d?.min) ? d.min : Number.isFinite(d?.max) ? d.max : 1;
  const hi = Number.isFinite(d?.max) ? d.max : lo;
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

function awardWin(s, mon, { playerXp = true } = {}){
  onMonsterKilled(mon);
  recordWardenKill(mon.id);
  renderMonsterGrid(mon.zone);

  const style = s.trainingStyle || 'shared';
  const base = monXpCanon(mon);

  let gained = { atk:0, str:0, def:0 };
  if (playerXp){
    if (style === 'attack') gained.atk = base.atk;
    else if (style === 'strength') gained.str = base.str;
    else if (style === 'defense')  gained.def = base.def;
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
  afterCombatFinish(true, mon.id);
  const xpPayload = playerXp ? { atk: gained.atk, str: gained.str, def: gained.def } : { atk:0, str:0, def:0 };
  return { xp: xpPayload, loot: lootNames };
}

function deriveCompanionAttacker(s, mon){
  const petId = s.ui?.activePet || null;
  if (!petId || !s.pets || !s.pets[petId]) return null;
  const d = PETS[petId]; if (!d) return null;

  const ps = derivePetStats(s, mon);
  if (!ps) return null;
  return { id: petId, name: ps.name, acc: ps.acc ?? 0, maxHit: Math.max(1, ps.maxHit|0) };
}

export function turnFight(s){
  const combat = s.combat;
  if (!combat) return { done:true, reason:'no-combat' };

  const mon = MONSTERS.find(m=>m.id===combat.monsterId);
  if (!mon) { s.combat = null; return { done:true, reason:'bad-monster' }; }

  if (combat.petOnly){
    const ps = derivePetStats(s, mon);
    let log = [];
    if (!ps){
      s.combat = null;
      afterCombatFinish(false, mon.id);
      return { done:true, reason:'no-pet', log:[`No pet equipped.`], xp:{atk:0,str:0,def:0}, loot:[], petXp:0 };
    }

    if (Math.random() < ps.acc){
      const dmg = 1 + Math.floor(Math.random() * ps.maxHit);
      combat.monHp = Math.max(0, combat.monHp - dmg);
      log.push(`${ps.name} hits ${mon.name} for ${dmg}.`);
    } else {
      log.push(`${ps.name} misses ${mon.name}.`);
    }

    if (combat.monHp <= 0){
      const gained = BALANCE.petXpPerMonsterLevel * Math.max(1, mon.level || 1);
      const petRes = grantPetXp(s, gained);

      const petId = combat.petId || s.ui?.activePet;
      applyLevelAndRecalc(s, petId, s.pets[petId].level);
      combat.petMax = s.pets[petId].maxHp;
      combat.petHp  = s.pets[petId].hp;

      const payload = awardWin(s, mon, { playerXp:false });

      log.push(`${ps.name} defeated ${mon.name}!`);
      log.push(`${ps.name} gains ${petRes.gained} pet xp.` + (petRes.newLevel > (petRes.oldLevel||0) ? ` Level up! ${petRes.oldLevel} → ${petRes.newLevel}.` : ''));

      return {
        done:true, win:true, log,
        loot: payload.loot || [],
        petXp: petRes.gained, petLevel: petRes.newLevel
      };
    }

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

    if ((combat.petHp|0) <= 0){
      const petId = combat.petId || s.ui?.activePet;
      applyLevelAndRecalc(s, petId, s.pets[petId].level);

      const name = ps.name;
      s.combat = null;
      afterCombatFinish(false, mon.id);
      return {
        done: true, win: false,
        log: [...log, `${name} was defeated by ${mon.name}.`],
        petXp: 0
      };
    }

    return { done:false, log, petHp: combat.petHp, petMax: combat.petMax };
  }

  const ps = derivePlayerStats(s, mon);
  const buddy = deriveCompanionAttacker(s, mon);
  let log = [];

  const playerHits = Math.random() < ps.acc;
  const playerDmg  = playerHits ? (1 + Math.floor(Math.random()*ps.maxHit)) : 0;

  let petHits = false, petDmg = 0;
  if (buddy){
    petHits = Math.random() < buddy.acc;
    petDmg  = petHits ? (1 + Math.floor(Math.random()*buddy.maxHit)) : 0;
  }

  const totalDmg = playerDmg + petDmg;

  if (buddy){
    if (totalDmg > 0){
      combat.monHp = Math.max(0, combat.monHp - totalDmg);
      log.push(`You and ${buddy.name} hit ${mon.name} for ${playerDmg} + ${petDmg}.`);
    } else {
      log.push(`You and ${buddy.name} miss ${mon.name}.`);
    }
  } else {
    if (playerHits){
      combat.monHp = Math.max(0, combat.monHp - playerDmg);
      log.push(`You hit ${mon.name} for ${playerDmg}.`);
    } else {
      log.push(`You miss ${mon.name}.`);
    }
  }

  // NEW: player-only poison tick (stacks across active poison effects)
  const poison = totalPoisonDamage(s);
  if (poison > 0){
    combat.monHp = Math.max(0, combat.monHp - poison);
    log.push(`Poison seeps into ${mon.name} for ${poison}.`);
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
    try { window.dispatchEvent(new Event('hp:change')); } catch {}
    log.push(`${mon.name} hits you for ${dmg}.`);
  } else {
    log.push(`${mon.name} misses you.`);
  }

  combat.turn++;

  if (s.hpCurrent <= 0){
    s.hpCurrent = 1;
    try { window.dispatchEvent(new Event('hp:change')); } catch {}
    s.combat = null;
    afterCombatFinish(false, mon.id);
    return { done: true, win: false, log: [...log, `You were defeated by ${mon.name}.`], xp: { atk:0, str:0, def:0 }, loot: [] };
  }

  return { done:false, log };
}
