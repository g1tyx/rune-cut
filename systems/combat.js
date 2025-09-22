import { MONSTERS } from '../data/monsters.js';
import { renderMonsterGrid } from '../ui/combat.js';
import { addItem, addGold } from './inventory.js';
import { XP_TABLE, levelFromXp } from './xp.js';
import { ITEMS } from '../data/items.js';
import { saveState, state } from './state.js';
import { getActiveEffects } from '../systems/effects.js';

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
  hpGearWeight: 2.0,
  maxHitAtkWeight: 0.1,
  dmgMitigationPerDef: 0.05
};

function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

function totalAccBonus(s){
  let n = 0;
  for (const eff of getActiveEffects(s)){
    const v = Number(eff?.data?.accBonus) || 0;
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

function dropKey(d){ if (!d) return null; if (d.id) return `item:${d.id}`; if (d.gold) return `gold:${d.gold}`; return null; }
function recordDiscovery(s, d){ const k = dropKey(d); if (!k) return; s.discoveredDrops = s.discoveredDrops || {}; s.discoveredDrops[k] = true; }

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

export function beginFight(s, monsterId){
  if (s.combat) return;
  const mon = MONSTERS.find(m=>m.id===monsterId);
  if (!mon) return;
  const mx = hpMaxFor(s);
  if (s.hpCurrent == null) s.hpCurrent = mx;
  else s.hpCurrent = Math.min(s.hpCurrent, mx);
  s.combat = { monsterId, monHp: mon.hp ?? 20, turn: 0 };
}

export function turnFight(s){
  if (!s.combat) return { done:true, reason:'no-combat' };
  const mon = MONSTERS.find(m=>m.id===s.combat.monsterId);
  if (!mon) { s.combat = null; return { done:true, reason:'bad-monster' }; }

  const ps = derivePlayerStats(s, mon);
  let log = [];

  if (Math.random() < ps.acc){
    const dmg = 1 + Math.floor(Math.random()*ps.maxHit);
    s.combat.monHp = Math.max(0, s.combat.monHp - dmg);
    log.push(`You hit ${mon.name} for ${dmg}.`);
  } else {
    log.push(`You miss ${mon.name}.`);
  }

  if (s.combat.monHp <= 0){
    const payload = awardWin(s, mon);
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

  s.combat.turn++;

  if (s.hpCurrent <= 0){
    s.hpCurrent = 1;
    emitHpChange();
    s.combat = null;
    return { done: true, win: false, log: [...log, `You were defeated by ${mon.name}.`], xp: { atk:0, str:0, def:0 }, loot: [] };
  }

  return { done:false, log };
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

function awardWin(s, mon){
  onMonsterKilled(mon);
  renderMonsterGrid(mon.zone);

  const style = s.trainingStyle || 'shared';
  const base = monXpCanon(mon);
  let gained = { atk:0, str:0, def:0 };
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
  const xpPayload = { atk: gained.atk, str: gained.str, def: gained.def };
  return { xp: xpPayload, loot: lootNames };
}
