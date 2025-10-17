// /ui/combat.js
import { state, saveNow } from '../systems/state.js';
import { MONSTERS } from '../data/monsters.js';
import { beginFight, turnFight, hpMaxFor } from '../systems/combat.js';
import { qs } from '../utils/dom.js';
import { renderInventory } from './inventory.js';
import { addItem } from '../systems/inventory.js';
import { renderEquipment } from './equipment.js';
import { renderSkills } from './skills.js';
import { ensureMana, manaMaxFor, startManaRegen } from '../systems/mana.js';
import { ITEMS } from '../data/items.js';
import { PETS } from '../data/pets.js';
import { renderCombatConsumablesPanel } from './combat/consumables_panel.js';

const overlayEls = {
  overlay:       qs('#combatOverlay'),
  close:         qs('#closeCombat'),
  fightBtn:      qs('#fightBtn'),
  eatBtn:        qs('#attackTurnBtn'),
  fleeBtn:       qs('#fleeBtn'),
  training:      qs('#trainingSelect'),
  log:           qs('#combatLog'),
  monImg:        qs('#monsterImg'),
  monName:       qs('#monsterCardName'),
  monLvl:        qs('#monsterCardLevel'),
  monStats:      qs('#monsterCardStats'),
  playerHpBar:   qs('#playerHpBar'),
  playerHpVal:   qs('#playerHpVal'),
  playerManaBar: qs('#playerManaBar'),
  playerManaVal: qs('#playerManaVal'),
  monHpBar:      qs('#monHpBar'),
  monHpVal:      qs('#monHpVal'),
  monNameHud:    qs('#monName'),
  youLabel:      qs('#youLabel') || qs('#playerName') || qs('#playerLabel') || document.querySelector('#combatOverlay .you-label'),
};

function setPetMode(on){
  state.petBattleMode = !!on; saveNow();
  overlayEls.overlay?.classList.toggle('pet-only', !!on);
  if (overlayEls.fightBtn) overlayEls.fightBtn.textContent = on ? 'Pet Fight' : 'Start Fight';
  if (overlayEls.training) overlayEls.training.disabled = !!on;
  renderCombat();
}

export function openPetBattleMode(){
  setPetMode(true);
  const zone = document.querySelector('.zone-btn.active')?.dataset.zone || document.querySelector('.zone-btn')?.dataset.zone;
  if (zone) document.querySelectorAll('.zone-btn').forEach(b=>b.classList.toggle('active', b.dataset.zone===zone));
  const firstMon = MONSTERS.find(m=>m.zone===zone) || MONSTERS[0];
  if (firstMon) openCombat(firstMon, { petOnly:true });
  else overlayEls.overlay?.classList.remove('hidden');
}

/* --- autobattle  --- */
function isAutobattleUnlocked(){ return !!(state.unlocks && state.unlocks.autobattle); }
function getAuto(monId, pet = state.petBattleMode){
  if (pet) return !!(state.petAutobattleByMonster && state.petAutobattleByMonster[monId]);
  return  !!(state.autobattleByMonster && state.autobattleByMonster[monId]);
}
function setAuto(monId, val, pet = state.petBattleMode){
  if (pet){
    state.petAutobattleByMonster = state.petAutobattleByMonster || {};
    state.petAutobattleByMonster[monId] = !!val;
  } else {
    state.autobattleByMonster = state.autobattleByMonster || {};
    state.autobattleByMonster[monId] = !!val;
  }
  saveNow();
}
const AUTO_SESSION_MS = 180000;
function startAutoSession(monId){ state.autobattleMonId=monId; state.autobattleUntilMs=Date.now()+AUTO_SESSION_MS; saveNow(); }
function clearAutoSession(){ delete state.autobattleMonId; delete state.autobattleUntilMs; saveNow(); }
function autoActive(monId){ return isAutobattleUnlocked() && getAuto(monId) && state.autobattleMonId===monId && Date.now()<(state.autobattleUntilMs||0); }
function startPetAutoSession(monId){
  state.petAutobattleMonId = monId;
  state.petAutobattleUntilMs = Date.now() + AUTO_SESSION_MS;
  saveNow();
}
function clearPetAutoSession(){
  delete state.petAutobattleMonId;
  delete state.petAutobattleUntilMs;
  saveNow();
}
function autoPetActive(monId){
  return isAutobattleUnlocked() && getAuto(monId, true) &&
         state.petAutobattleMonId === monId && Date.now() < (state.petAutobattleUntilMs||0);
}
/* --- drop preview helpers --- */
function rarityFromChance(p=0){ if(p>=.20)return'common'; if(p>=.05)return'uncommon'; if(p>=.01)return'rare'; if(p>=.002)return'epic'; return'legendary'; }
function fmtPct(p=0){ return `${Math.max(.01,+(p*100).toFixed(p<.01?2:1))}%`; }
function itemIconHtml(id){ const it=ITEMS?.[id]||{}; return it.img?`<img src="${it.img}" alt="">`:`<span class="icon">${it.icon||'🎁'}</span>`; }
function dropKey(d){ if(!d)return null; if(d.id)return`item:${d.id}`; if(d.gold)return`gold:${d.gold}`; return null; }
function isDiscovered(d){ const k=dropKey(d); return !!(k && state.discoveredDrops && state.discoveredDrops[k]); }
function chipHtmlForDrop(d){
  const known=isDiscovered(d);
  if(!known) return `<span class="drop-chip unknown" title="Undiscovered"><span class="icon">?</span><span class="name">Unknown</span></span>`;
  if(d.id){ const it=ITEMS?.[d.id]||{},name=it.name||d.id,rar=rarityFromChance(d.chance||0),tip=`${name} — ${fmtPct(d.chance||0)}`;
    return `<span class="drop-chip ${rar}" title="${tip}">${itemIconHtml(d.id)}<span class="name">${name}</span></span>`; }
  const tip = `${d.gold}g — ${fmtPct(d.chance||0)}`; return `<span class="drop-chip gold" title="${tip}"><span class="icon">🪙</span></span>`;
}
function dotClassForChance(p=0){ return rarityFromChance(p); }

/* --- combat loop & HUD --- */
const ATK_COOLDOWN_MS = 500; let atkCooldownUntil = 0; const nowMs = ()=>performance.now();
function pulse(el,cls,ms=300){ if(!el)return; el.classList.add(cls); setTimeout(()=>el.classList.remove(cls),ms); }
function bubbleDamage(bar, amount, kind='dealt', {crit=false, slam=false, text=null}={}){ if(!bar)return;
  const progress=bar.closest('.progress'); let host=progress?.parentElement||bar.parentElement||bar;
  const cs=host?getComputedStyle(host):null; if(host&&cs&&cs.position==='static') host.style.position='relative';
  if(host&&cs&&(cs.overflow==='hidden'||cs.overflowX==='hidden'||cs.overflowY==='hidden')){ host=host.parentElement||host; const cs2=getComputedStyle(host); if(cs2.position==='static') host.style.position='relative'; }
  const d=document.createElement('div'); d.className=`floating-dmg ${kind}${crit?' crit':''}${slam?' slam':''}`; d.textContent=text??`-${amount}`;
  host.appendChild(d); d.addEventListener('animationend',()=>d.remove(),{once:true});
}
function bubbleHeal(bar, amount){ bubbleDamage(bar, amount, 'heal', { text:`+${amount}` }); }
function currentMonster(){ const id = state.selectedMonsterId; return MONSTERS.find(m=>m.id===id) || null; }
function setBar(bar,label,cur,max){ const pct=max>0?Math.max(0,Math.min(100,Math.round(100*cur/max))):0; if(bar)bar.style.width=pct+'%'; if(label)label.textContent=`${cur}/${max}`; }

/* food helpers */
function healAmountForBase(baseId){ const def=ITEMS[baseId]||{}; return Number.isFinite(def.heal)?def.heal:0; }
function canEat(){ const eq=state.equipment||{}, base=eq.food, qty=Math.max(0,eq.foodQty|0); if(!base||qty<=0)return false; const heal=healAmountForBase(base); if(heal<=0)return false; const max=hpMaxFor(state); return (state.hpCurrent??max)<max; }
function doEatOnce(){
  const eq=state.equipment||{}, base=eq.food; let qty=Math.max(0,eq.foodQty|0);
  if(!base||qty<=0)return false; const heal=healAmountForBase(base); if(heal<=0)return false;
  const max=hpMaxFor(state), cur=state.hpCurrent==null?max:state.hpCurrent; if(cur>=max)return false;
  const def=ITEMS[base]||{}, name=def.name||base, healed=Math.min(heal,max-cur);
  state.hpCurrent=Math.min(max,cur+heal); qty-=1; eq.foodQty=Math.max(0,qty); if(eq.foodQty===0) eq.food='';
  pulse(overlayEls.playerHpBar,'flash-heal',350); bubbleHeal(overlayEls.playerHpBar, healed);
  if(overlayEls.log){ const line=document.createElement('div'); line.textContent=`You eat ${name} and heal ${healed} HP.`; overlayEls.log.appendChild(line); overlayEls.log.scrollTop=overlayEls.log.scrollHeight; }
  try{ window.dispatchEvent(new Event('hp:change')); }catch{} try{ window.dispatchEvent(new Event('food:change')); }catch{}
  renderEquipment(); renderCombat(); saveNow(); return true;
}

/* HUD paint: in pet mode, reuse player HP bar to show pet HP */
function toggleManaRow(hidden){
  const bar = overlayEls.playerManaBar;
  if (!bar) return;
  const progress = bar.closest('.progress') || bar.parentElement;
  const row = progress?.parentElement || progress;
  if (row) row.style.display = hidden ? 'none' : '';
  if (overlayEls.playerManaVal) overlayEls.playerManaVal.style.display = hidden ? 'none' : '';
}

function paintHud(){
  try {
    const youEl =
      overlayEls.youLabel ||
      document.querySelector('.combat-hud .hud-col:first-child .hud-name');
    const activePetId = state.ui?.activePet || null;
    const petName = activePetId ? (PETS?.[activePetId]?.name || activePetId) : null;

    if (youEl) {
      if (state.petBattleMode && petName)       youEl.textContent = petName;
      else if (!state.petBattleMode && petName) youEl.textContent = `You and ${petName}`;
      else                                       youEl.textContent = 'You';
    }
  } catch {}

  if (state.petBattleMode) {
    const id  = state.ui?.activePet;
    const pet = id && state.pets ? state.pets[id] : null;

    if (state.combat && state.combat.petOnly) {
      setBar(overlayEls.playerHpBar, overlayEls.playerHpVal, state.combat.petHp|0, state.combat.petMax|0);
    } else if (pet && Number.isFinite(pet.hp) && Number.isFinite(pet.maxHp)) {
      setBar(overlayEls.playerHpBar, overlayEls.playerHpVal, pet.hp, pet.maxHp);
    } else {
      if (overlayEls.playerHpBar) overlayEls.playerHpBar.style.width = '0%';
      if (overlayEls.playerHpVal) overlayEls.playerHpVal.textContent = '—/—';
    }

    const manaRow = overlayEls.playerManaBar?.closest('.row') || overlayEls.playerManaBar?.parentElement;
    if (manaRow) manaRow.style.display = 'none';
  } else {
    const maxHp = hpMaxFor(state);
    const curHp = Math.max(0, Math.min(maxHp, state.hpCurrent == null ? maxHp : state.hpCurrent));
    setBar(overlayEls.playerHpBar, overlayEls.playerHpVal, curHp, maxHp);

    const manaRow = overlayEls.playerManaBar?.closest('.row') || overlayEls.playerManaBar?.parentElement;
    if (manaRow) manaRow.style.display = '';
    ensureMana(state);
    const maxMp = manaMaxFor(state);
    const curMp = Math.max(0, Math.min(maxMp, state.manaCurrent));
    setBar(overlayEls.playerManaBar, overlayEls.playerManaVal, curMp, maxMp);
  }

  const active = state.combat;
  const mon = active ? MONSTERS.find(m=>m.id===active.monsterId) : currentMonster();
  const monMax = active ? (mon?.hp ?? 20) : (mon?.hp ?? 0);
  const monCur = active ? Math.max(0, state.combat.monHp) : monMax;
  setBar(overlayEls.monHpBar, overlayEls.monHpVal, monCur, monMax);
  if (overlayEls.monNameHud) overlayEls.monNameHud.textContent = mon?.name || '—';

  const inFight = !!state.combat;

  if (overlayEls.fightBtn) {
    overlayEls.fightBtn.disabled = inFight || !mon;
  }

  if (overlayEls.eatBtn) {
    const can = !state.petBattleMode && canEat();
    overlayEls.eatBtn.disabled = !can;
    overlayEls.eatBtn.title = state.petBattleMode
      ? 'Pet battle'
      : (can ? 'Eat food to heal' : 'Nothing to eat or HP is full');
  }

  if (overlayEls.training) {
    overlayEls.training.disabled = state.petBattleMode;
  }

  if (overlayEls.fleeBtn) {
    overlayEls.fleeBtn.disabled = !inFight;
  }
}

/* monster card paint */
function killsOf(monId){ return (state.monsterKills && state.monsterKills[monId]) || 0; }
function paintMonsterDrops(mon){
  const host=document.getElementById('monsterDrops'); if(!host)return; host.classList.add('monster-drops');
  const rows=(mon?.drops||[]).slice().sort((a,b)=>(b.chance||0)-(a.chance||0));
  host.innerHTML = rows.map(chipHtmlForDrop).join('') || '<span class="muted small">No known drops</span>';
}
function paintMonsterCard(mon){
  if(!mon)return;
  if (overlayEls.monImg){ overlayEls.monImg.src = mon.img || ''; overlayEls.monImg.alt = mon.name || mon.id; }
  if (overlayEls.monName) overlayEls.monName.textContent = mon.name || mon.id;
  if (overlayEls.monLvl)  overlayEls.monLvl.textContent  = String(mon.level ?? 1);
  const bits=[]; if(Number.isFinite(mon.hp))bits.push(`HP ${mon.hp}`); if(Number.isFinite(mon.attack))bits.push(`Atk ${mon.attack}`); if(Number.isFinite(mon.defense))bits.push(`Def ${mon.defense}`); if(Number.isFinite(mon.maxHit))bits.push(`Max ${mon.maxHit}`);
  if (overlayEls.monStats) overlayEls.monStats.textContent = bits.join(' · ') || '—';
  paintMonsterDrops(mon); renderCombatAutoToggle(mon);
}

export function renderCombat(){
  ensureMana(state);
  startManaRegen(state, ()=>{ saveNow(); const maxMp=manaMaxFor(state); setBar(overlayEls.playerManaBar, overlayEls.playerManaVal, state.manaCurrent, maxMp); });
  paintHud();
  renderCombatConsumablesPanel();
}

function enableCombatLogAutoScroll(){
  const log=overlayEls.log; if(!log||log._autoScrollReady)return; log._autoScrollReady=true;
  const toBottom=()=>{ log.scrollTop=log.scrollHeight; };
  new MutationObserver(toBottom).observe(log,{childList:true});
  new ResizeObserver(toBottom).observe(log);
  toBottom();
}

/* loop + FX */
let fightLoop=null; function stopFightLoop(){ if(fightLoop){ clearInterval(fightLoop); fightLoop=null; } }

/* FX parser  */
function applyTurnFx(logs){
  const parseIntAfterFor = s => { const m = /for\s+(\d+)/i.exec(s||''); return m ? parseInt(m[1],10) : null; };
  const hasCrit = s => /\bcrit/i.test(s||'') || /\bcritical\b/i.test(s||'');

  const activePetId = state.ui?.activePet || null;
  const petName     = activePetId ? (PETS?.[activePetId]?.name || activePetId) : null;

  const combo = logs.find(l => /^You and .+ hit .+ for \d+\s*\+\s*\d+\.\s*$/i.test(l));
  if (combo){
    const m = combo.match(/for\s+(\d+)\s*\+\s*(\d+)/i);
    const pD = m ? parseInt(m[1],10) : 0;
    const qD = m ? parseInt(m[2],10) : 0;
    if (pD > 0 || qD > 0){
      pulse(overlayEls.monHpBar,'flash-dmg',350);
      if (pD > 0) bubbleDamage(overlayEls.monHpBar, pD, 'dealt left');
      if (qD > 0) setTimeout(()=> bubbleDamage(overlayEls.monHpBar, qD, 'pet right'), 80);
    } else {
      bubbleDamage(overlayEls.monHpBar, 0, 'miss', { text:'Miss' });
    }
  } else {
    const youDealt = logs.find(l => /^You hit\b/i.test(l));
    const youMiss  = logs.find(l => /\byou miss\b/i.test(l));
    const petDealt = petName ? logs.find(l => new RegExp(`^${petName}\\s+hits\\b`, 'i').test(l)) : null;
    const petMiss  = petName ? logs.find(l => new RegExp(`^${petName}\\s+misses\\b`, 'i').test(l)) : null;

    const dmgMon = parseIntAfterFor(youDealt);
    const dmgPet = parseIntAfterFor(petDealt);

    if (dmgMon != null){
      pulse(overlayEls.monHpBar,'flash-dmg',350);
      bubbleDamage(overlayEls.monHpBar, dmgMon, 'dealt left');
    }
    if (dmgPet != null){
      pulse(overlayEls.monHpBar,'flash-dmg',350);
      setTimeout(()=> bubbleDamage(overlayEls.monHpBar, dmgPet, 'pet right'), 80);
    }
    if ((!youDealt && youMiss) || (!petDealt && petMiss)){
      bubbleDamage(overlayEls.monHpBar, 0, 'miss', { text:'Miss' });
    }
  }

  // Poison bubbles: support both "Poison seeps into <Monster> for N." and "Poison deals N damage to <Monster>."
  const poisonLines = logs.filter(l => /^Poison\b/i.test(l));
  for (const line of poisonLines){
    let amt = null;
    let m = /for\s+(\d+)/i.exec(line);
    if (!m) m = /deals\s+(\d+)\s+damage/i.exec(line);
    if (m) amt = parseInt(m[1], 10);
    if (Number.isFinite(amt) && amt > 0){
      pulse(overlayEls.monHpBar,'flash-dmg',350);
      bubbleDamage(overlayEls.monHpBar, amt, 'poison');
    }
  }

  const monHitYou  = logs.find(l => /\bhits you for\b/i.test(l));
  const monMissYou = logs.find(l => /misses you\b/i.test(l));
  const monHitPet  = petName ? logs.find(l => new RegExp(`\\bhits\\s+${petName}\\s+for\\s+\\d+\\b`, 'i').test(l)) : null;
  const monMissPet = petName ? logs.find(l => new RegExp(`\\bmisses\\s+${petName}\\b`, 'i').test(l)) : null;

  const dmgYou = parseIntAfterFor(monHitYou);
  const dmgPet = parseIntAfterFor(monHitPet);

  if (state.petBattleMode) {
    if (dmgPet != null){
      pulse(overlayEls.playerHpBar,'flash-dmg',350);
      bubbleDamage(overlayEls.playerHpBar, dmgPet, 'taken', { slam:true });
    } else if (monMissPet) {
      bubbleDamage(overlayEls.playerHpBar, 0, 'miss', { text:'Miss' });
    }
  } else {
    if (dmgYou != null){
      const crit = hasCrit(monHitYou);
      pulse(overlayEls.playerHpBar,'flash-dmg',350);
      bubbleDamage(overlayEls.playerHpBar, dmgYou, 'taken', { crit, slam:true });
    } else if (monMissYou) {
      bubbleDamage(overlayEls.playerHpBar, 0, 'miss', { text:'Miss' });
    }
  }
}

function runCombatTurn(){
  const result = turnFight(state);
  const logs = result?.log || [];
  applyTurnFx(logs);

  atkCooldownUntil = nowMs() + ATK_COOLDOWN_MS;
  renderCombat(); 
  renderEquipment();

  if (result?.done){
    if (result.win){
      const xp = result.xp || { atk:0, str:0, def:0 }, loot = result.loot || [];
      if (!state.petBattleMode){
        overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent: `Victory! XP — Atk +${xp.atk||0}, Str +${xp.str||0}, Def +${xp.def||0}.` }));
      } else {
        const px = result.petXp|0, newLv = result.petLevel|0;
        overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent: `Victory! Pet XP +${px}.` }));
        if (newLv) overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent: `Pet level ${newLv}!` }));
      }
      if (loot.length) overlayEls.log.appendChild(Object.assign(document.createElement('div'), { className:'loot-line', textContent:`Loot: ${loot.join(', ')}` }));

      paintMonsterDrops(currentMonster());
      renderCombat();

      const mon = currentMonster(), overlayOpen = !overlayEls.overlay?.classList.contains('hidden');
      if (mon && overlayOpen && (
          (!state.petBattleMode && autoActive(mon.id)) ||
          ( state.petBattleMode && autoPetActive(mon.id))
        )){
      setTimeout(() => {
        beginFight(state, mon.id, { petOnly: !!(state.combat && state.combat.petOnly) || !!state.petBattleMode });
        if (mon.zone === 'Bosses') {
          window.dispatchEvent(new CustomEvent('boss:engage', { detail: { bossId: mon.id, boss: mon } }));
        }
        overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent:`Autobattle${state.petBattleMode?' (Pet)':''}: re-engaging ${mon.name}...` }));
        if (state.petBattleMode) {
          const petId = state.ui?.activePet;
          const pet = petId && state.pets ? state.pets[petId] : null;
          if (pet && state.combat && state.combat.petOnly) {
            pet.hp = Math.max(0, state.combat.petHp | 0);
            if (Number.isFinite(state.combat.petMax)) pet.maxHp = state.combat.petMax | 0;
            if (Number.isFinite(result?.petLevel) && result.petLevel > 0) pet.level = result.petLevel | 0;
          }
        }
        saveNow(); 
        renderCombat(); 
        renderEquipment(); 
        startFightLoop();
      }, 350);
    } else if (mon && isAutobattleUnlocked()){
      if (!state.petBattleMode && getAuto(mon.id, false) && state.autobattleMonId === mon.id){
        overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent:`Autobattle: 3-minute session ended.` }));
        clearAutoSession();
      }
      if ( state.petBattleMode && getAuto(mon.id, true) && state.petAutobattleMonId === mon.id){
        overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent:`Autobattle (Pet): 3-minute session ended.` }));
        clearPetAutoSession();
      }
    }

    } else {
      overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent: state.petBattleMode ? `Your pet was defeated.` : `You were defeated.` }));
      clearAutoSession();
    }
    saveNow(); 
    renderInventory(); 
    renderEquipment(); 
    renderSkills();
    renderCombat();
  } else {
    saveNow();
  }

  return result;
}

function startFightLoop(){ stopFightLoop(); fightLoop=setInterval(()=>{ if(!state.combat){ stopFightLoop(); return; } if(nowMs()<atkCooldownUntil) return; const r=runCombatTurn(); if(r?.done) stopFightLoop(); }, ATK_COOLDOWN_MS); }

/* ---------------- ONLY-PET Monster Picker ---------------- */
function renderPetMonsterPicker(zoneId, preId){
  let row = document.getElementById('monsterPickerRow');
  if (!row){
    const anchor = overlayEls.fightBtn?.parentElement;
    row = document.createElement('div');
    row.id = 'monsterPickerRow';
    row.style.display = 'flex'; row.style.gap = '8px'; row.style.margin = '8px 0';
    row.innerHTML = `<label class="muted" style="font-size:12px;">Monster</label><select id="monsterPickerSelect" style="flex:1;min-width:180px;"></select>`;
    anchor?.parentElement?.insertBefore(row, anchor);
    row.querySelector('#monsterPickerSelect').addEventListener('change', (e)=>{
      state.selectedMonsterId = e.target.value; saveNow();
      const mon = MONSTERS.find(m=>m.id===state.selectedMonsterId); if(mon) paintMonsterCard(mon);
    });
  }
  const sel = row.querySelector('#monsterPickerSelect');
  const zone = zoneId || document.querySelector('.zone-btn.active')?.dataset.zone;
  const mons = MONSTERS.filter(m=>!zone || m.zone===zone);
  const selected = preId || state.selectedMonsterId || mons[0]?.id || '';
  sel.innerHTML = mons.map(m=>`<option value="${m.id}" ${m.id===selected?'selected':''}>${m.name} (Lv ${m.level})</option>`).join('');
  state.selectedMonsterId = selected; saveNow();
}

/* ---------------- Overlay Control ---------------- */
function openCombat(mon, opts = {}){
  if (!overlayEls.overlay || !mon) return;
  const petOnly = !!opts.petOnly;
  setPetMode(petOnly);
  state.selectedMonsterId = mon.id;
  saveNow();

  if (petOnly) renderPetMonsterPicker(mon.zone, mon.id);
  paintMonsterCard(mon);
  if (overlayEls.training) overlayEls.training.value = state.trainingStyle || 'shared';
  if (overlayEls.log) overlayEls.log.innerHTML = '';
  enableCombatLogAutoScroll();
  overlayEls.overlay.classList.remove('hidden');
  renderCombat();
}

function closeCombat(){
  overlayEls.overlay?.classList.add('hidden'); setPetMode(false);
  state.combat=null; saveNow(); clearAutoSession(); clearPetAutoSession(); stopFightLoop();
}
overlayEls.close?.addEventListener('click', closeCombat);
overlayEls.overlay?.addEventListener('click', (e)=>{ if (e.target === overlayEls.overlay) closeCombat(); });
document.addEventListener('keydown', (e)=>{ if (e.key==='Escape' && !overlayEls.overlay.classList.contains('hidden')) closeCombat(); });
overlayEls.training?.addEventListener('change', ()=>{ state.trainingStyle = overlayEls.training.value || 'shared'; saveNow(); });

window.addEventListener('inventory:changed', renderCombatConsumablesPanel);
window.addEventListener('mana:change', renderCombatConsumablesPanel);

/* ---------------- Buttons ---------------- */
overlayEls.fightBtn?.addEventListener('click', ()=>{
  const monId = state.petBattleMode ? (document.getElementById('monsterPickerSelect')?.value) : (state.selectedMonsterId);
  const mon = MONSTERS.find(m=>m.id===monId); if (!mon || state.combat) return;

  if (state.petBattleMode){
    beginFight(state, mon.id, { petOnly:true });
    overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`Your pet engages ${mon.name}!`}));
    if (isAutobattleUnlocked() && getAuto(mon.id, true) && !autoPetActive(mon.id)) {
      startPetAutoSession(mon.id);
      overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle (Pet): session started (3 minutes).`}));
    }
  } else {
    beginFight(state, mon.id);
    overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`You engage ${mon.name}!`}));

    if (mon.zone === 'Bosses') {
      window.dispatchEvent(new CustomEvent('boss:engage', { detail: { bossId: mon.id, boss: mon } }));
    }

    if (isAutobattleUnlocked() && getAuto(mon.id) && !autoActive(mon.id)) {
      startAutoSession(mon.id);
      overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle: session started (3 minutes).`}));
    }
  }
  saveNow(); renderCombat(); renderEquipment(); startFightLoop();
});

overlayEls.eatBtn?.addEventListener('click', ()=>{ if (state.petBattleMode) return; if (!canEat()) return; doEatOnce(); });
overlayEls.fleeBtn?.addEventListener('click', ()=>{
  if (!state.combat) return;
  const mon = MONSTERS.find(m=>m.id===state.combat.monsterId);
  overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent: state.petBattleMode ? `You called your pet back from ${mon?.name||state.combat.monsterId}.` : `You fled from ${mon?.name||state.combat.monsterId}.`}));
  closeCombat();
});

/* ==== Boss Event plumbing (Vine Horror) ==== */
function logToCombat(text){
  const n = document.createElement('div');
  n.textContent = text;
  const log = document.querySelector('#combatLog');
  if (log) { log.appendChild(n); log.scrollTop = log.scrollHeight; }
}

function unequipFoodToInventory(){
  const eq = state.equipment || {};
  const base = eq.food;
  const qty  = Math.max(0, eq.foodQty|0);
  if (!base || qty <= 0) return false;

  try { addItem(state, base, qty); } catch {}
  eq.food = '';
  eq.foodQty = 0;

  try { renderInventory(); } catch {}
  try { renderEquipment(); } catch {}
  try { window.dispatchEvent(new Event('food:change')); } catch {}
  return true;
}

window.addEventListener('boss:event:apply', (e)=>{
  const { damage = 0, unequipFood = false, reason = 'event' } = e.detail || {};

  if (damage > 0){
    const mx = hpMaxFor(state);
    const cur = Math.max(0, Math.min(mx, state.hpCurrent == null ? mx : state.hpCurrent));
    state.hpCurrent = Math.max(0, cur - damage);
    logToCombat(`You take ${damage} damage (${reason}).`);
    try { window.dispatchEvent(new Event('hp:change')); } catch {}
    renderCombat();
  }

  if (unequipFood){
    const ok = unequipFoodToInventory();
    logToCombat(ok ? 'Vine whip knocks your food off!' : 'Vine whip lashes, but you had no food equipped.');
  }
});

window.addEventListener('boss:event:log', (e)=>{
  if (e.detail?.text) logToCombat(e.detail.text);
});

/* --- cosmetic & FX CSS (adds poison color) --- */
(function ensureCss(){
  if (document.getElementById('combat-ui-css')) return;
  const css=document.createElement('style'); css.id='combat-ui-css';
  css.textContent=`
    .combat-auto-host{margin-top:6px;}
    .combat-auto-row{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.95;user-select:none;}
    .combat-auto-row input{transform:translateY(1px);}
    #monsterDrops .drop-chip .name{display:inline!important;}
    #monsterDrops .drop-chip.gold .name{display:none!important;}
    #combatLog .loot-line{color:#eab308;font-weight:700;}
    #combatOverlay.pet-only #trainingSelect{display:none!important;}
    #combatOverlay.pet-only #attackTurnBtn{display:none!important;}
    #combatOverlay.pet-only #playerManaBar,
    #combatOverlay.pet-only #playerManaVal { display:none!important; }

    .floating-dmg{position:absolute;left:50%;transform:translateX(-50%);animation:floatUp .9s ease-out forwards;
      font-weight:800; pointer-events:none; text-shadow:0 1px 2px rgba(0,0,0,.4);}
    .floating-dmg.dealt{color:#f87171;}
    .floating-dmg.taken{color:#60a5fa;}
    .floating-dmg.pet{color:#34d399;}
    .floating-dmg.heal{color:#22c55e;}
    .floating-dmg.miss{color:#9ca3af;}
    .floating-dmg.poison{color:#2f7a43;} /* dark poison green */
    .floating-dmg.left{ left:35%; }
    .floating-dmg.right{ left:65%; }
    @keyframes floatUp{0%{opacity:0;top:6px}10%{opacity:1}100%{opacity:0;top:-22px}}
  `;
  document.head.appendChild(css);
})();

/* --- combat-card Autobattle toggle  --- */
function ensureCombatAutoHost(){
  const anchor = overlayEls.monStats?.parentElement || document.querySelector('#monsterCard');
  if (!anchor) return null;
  let host=document.getElementById('combatAutoHost');
  if(!host){ host=document.createElement('div'); host.id='combatAutoHost'; host.className='combat-auto-host'; anchor.appendChild(host); }
  return host;
}
function renderCombatAutoToggle(mon){
  const host=ensureCombatAutoHost(); if(!host) return; host.innerHTML='';
  if(!isAutobattleUnlocked()||!mon) return;
  const checked = getAuto(mon.id, state.petBattleMode);
  const row=document.createElement('label'); row.className='combat-auto-row';
  row.title = state.petBattleMode ? 'Autobattle this boss (Pet)' : 'Autobattle this monster';
  row.innerHTML=`<input type="checkbox" id="combatAutoChk" ${checked?'checked':''}/><span>Autobattle${state.petBattleMode?' (Pet)':''}</span>`;
  host.appendChild(row);
  row.querySelector('#combatAutoChk')?.addEventListener('change',(e)=>{
    setAuto(mon.id, e.target.checked, state.petBattleMode);
    if (e.target.checked){
      if (state.petBattleMode){ startPetAutoSession(mon.id); }
      else { startAutoSession(mon.id); }
      overlayEls.log?.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle${state.petBattleMode?' (Pet)':''}: session started (3 minutes).`}));
    } else {
      if (state.petBattleMode){ clearPetAutoSession(); }
      else { clearAutoSession(); }
      overlayEls.log?.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle${state.petBattleMode?' (Pet)':''}: disabled.`}));
    }
  });
}

/* --- Monster Grid & Zones --- */
export function renderMonsterGrid(zone){
  const grid=document.querySelector('#monsterGrid'); if(!grid)return; grid.innerHTML='';
  const monsters=MONSTERS.filter(m=>m.zone===zone);
  monsters.forEach(mon=>{
    const topDrops=(mon.drops||[]).slice().sort((a,b)=>(b.chance||0)-(a.chance||0));
    const dots=topDrops.map(d=>{
      if(!isDiscovered(d)) return `<span class="dot unknown" title="Undiscovered"></span>`;
      const name=d.id?(ITEMS?.[d.id]?.name||d.id):`${d.gold}g`;
      return `<span class="dot ${dotClassForChance(d.chance||0)}" title="${name} · ${fmtPct(d.chance||0)}"></span>`;
    }).join('');
    const card=document.createElement('div'); card.className='monster-choice'; card.dataset.id=mon.id;
    card.innerHTML=`<img src="${mon.img||''}" alt="${mon.name}"><div class="title">${mon.name}</div><div class="muted">Lv ${mon.level}</div><div class="muted">Kills: <span id="monsterKillCount">${killsOf(mon.id)}</span></div><div class="drops-row" aria-label="Notable drops">${dots}</div>`;
    card.addEventListener('click',()=>openCombat(mon,{ petOnly: !!state.petBattleMode }));
    grid.appendChild(card);
  });
}
function setupZones(){
  const map=document.querySelector('#combatMap'); if(!map)return;
  map.querySelectorAll('.zone-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      map.querySelectorAll('.zone-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderMonsterGrid(btn.dataset.zone);
      if (state.petBattleMode){
        const firstInZone = MONSTERS.find(m=>m.zone===btn.dataset.zone) || null;
        if (firstInZone){ state.selectedMonsterId = firstInZone.id; saveNow(); renderPetMonsterPicker(btn.dataset.zone, firstInZone.id); paintMonsterCard(firstInZone); }
      }
    });
  });
}
document.addEventListener('DOMContentLoaded', ()=>{
  setupZones();
  const firstZone=document.querySelector('.zone-btn')?.dataset.zone;
  if (firstZone) renderMonsterGrid(firstZone);
});
window.addEventListener('drops:discover', ()=>{ const mon=currentMonster(); if(mon) paintMonsterDrops(mon); });
