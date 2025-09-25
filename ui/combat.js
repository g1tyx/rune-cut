// /ui/combat.js
import { state, saveState } from '../systems/state.js';
import { MONSTERS } from '../data/monsters.js';
import { beginFight, turnFight, hpMaxFor } from '../systems/combat.js';
import { qs } from '../utils/dom.js';
import { renderInventory } from './inventory.js';
import { renderEquipment } from './equipment.js';
import { renderSkills } from './skills.js';
import { ensureMana, manaMaxFor, startManaRegen } from '../systems/mana.js';
import { ITEMS } from '../data/items.js';

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
};

function setPetMode(on){
  state.petBattleMode = !!on; saveState(state);
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

/* --- autobattle (unchanged behavior) --- */
function isAutobattleUnlocked(){ return !!(state.unlocks && state.unlocks.autobattle); }
function getAuto(monId){ return !!(state.autobattleByMonster && state.autobattleByMonster[monId]); }
function setAuto(monId,val){ state.autobattleByMonster=state.autobattleByMonster||{}; state.autobattleByMonster[monId]=!!val; saveState(state); }
const AUTO_SESSION_MS = 180000;
function startAutoSession(monId){ state.autobattleMonId=monId; state.autobattleUntilMs=Date.now()+AUTO_SESSION_MS; saveState(state); }
function clearAutoSession(){ delete state.autobattleMonId; delete state.autobattleUntilMs; saveState(state); }
function autoActive(monId){ return isAutobattleUnlocked() && getAuto(monId) && state.autobattleMonId===monId && Date.now()<(state.autobattleUntilMs||0); }

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
  renderEquipment(); renderCombat(); saveState(state); return true;
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
  if (overlayEls.fightBtn) overlayEls.fightBtn.disabled = inFight || !mon;
  if (overlayEls.eatBtn){
    overlayEls.eatBtn.disabled = state.petBattleMode ? true : !canEat();
    overlayEls.eatBtn.title = state.petBattleMode ? 'Pet battle' :
                              (canEat() ? 'Eat food to heal' : 'Nothing to eat or HP is full');
  }
  if (overlayEls.training) overlayEls.training.disabled = state.petBattleMode;
  if (overlayEls.fleeBtn) overlayEls.fleeBtn.disabled = !inFight;
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
  startManaRegen(state, ()=>{ saveState(state); const maxMp=manaMaxFor(state); setBar(overlayEls.playerManaBar, overlayEls.playerManaVal, state.manaCurrent, maxMp); });
  paintHud();
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

/* FX parser now recognizes pet damage lines ("X hits Cheeken for N.") */
function applyTurnFx(logs){
  const parseDamage=s=>{const m=/for\s+(\d+)/i.exec(s||''); return m?parseInt(m[1],10):null;};
  const hasCrit=s=>/\bcrit/i.test(s||'')||/\bcritical\b/i.test(s||'');
  const petName = state.combat?.petName || state.ui?.activePet || '';
  const dealt = logs.find(l => {
    if (/^You hit\b/i.test(l)) return true;                        // player mode
    if (petName && new RegExp(`^${petName}\\s+hits\\b`, 'i').test(l)) return true; // pet mode
    return false;
  });
  const monHitYou=logs.find(l=>/\bhits you for\b/i.test(l));
  const youMiss=logs.find(l=>/\byou miss\b/i.test(l));
  const monHitPet = petName ? logs.find(l=> new RegExp(`hits\\s+${petName}\\s+for\\s+\\d+\\b`, 'i').test(l) ) : null;
  const monMissYou=logs.find(l=>/misses you\b/i.test(l));
  const petMiss = logs.find(l=>/\bmisses\b.+$/i.test(l)&&!/misses you/i.test(l));

  const dmgMon=parseDamage(dealt);
  const dmgYou=parseDamage(monHitYou);
  const dmgPet=parseDamage(monHitPet);

  if(dmgMon!=null){ const crit=hasCrit(dealt); pulse(overlayEls.monHpBar,'flash-dmg',350); bubbleDamage(overlayEls.monHpBar,dmgMon,'dealt',{crit}); }
  else if(youMiss||petMiss){ bubbleDamage(overlayEls.monHpBar,0,'miss',{text:'Miss'}); }

  if(dmgYou!=null && !state.petBattleMode){ const crit=hasCrit(monHitYou); pulse(overlayEls.playerHpBar,'flash-dmg',350); bubbleDamage(overlayEls.playerHpBar,dmgYou,'taken',{crit,slam:true}); }
  if(dmgPet!=null && state.petBattleMode){ pulse(overlayEls.playerHpBar,'flash-dmg',350); bubbleDamage(overlayEls.playerHpBar,dmgPet,'taken',{slam:true}); }
  else if(monMissYou && !state.petBattleMode){ bubbleDamage(overlayEls.playerHpBar,0,'miss',{text:'Miss'}); }
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
      if (mon && overlayOpen && autoActive(mon.id)){
        setTimeout(() => {
          beginFight(state, mon.id, { petOnly: !!(state.combat && state.combat.petOnly) || !!state.petBattleMode });
          overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent:`Autobattle: re-engaging ${mon.name}...` }));
          if (state.petBattleMode) {
            const petId = state.ui?.activePet;
            const pet = petId && state.pets ? state.pets[petId] : null;
            if (pet && state.combat && state.combat.petOnly) {
              // write what actually happened in combat
              pet.hp = Math.max(0, state.combat.petHp | 0);
              if (Number.isFinite(state.combat.petMax)) pet.maxHp = state.combat.petMax | 0;
              if (Number.isFinite(result?.petLevel) && result.petLevel > 0) pet.level = result.petLevel | 0;
            }
          }
          saveState(state); 
          renderCombat(); 
          renderEquipment(); 
          startFightLoop();
        }, 350);
      } else if (mon && isAutobattleUnlocked() && getAuto(mon.id) && state.autobattleMonId === mon.id){
        overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent:`Autobattle: 3-minute session ended.` }));
        clearAutoSession();
      }
    } else {
      overlayEls.log.appendChild(Object.assign(document.createElement('div'), { textContent: state.petBattleMode ? `Your pet was defeated.` : `You were defeated.` }));
      clearAutoSession();
    }
    saveState(state); 
    renderInventory(); 
    renderEquipment(); 
    renderSkills();
    renderCombat();
  } else {
    saveState(state);
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
      state.selectedMonsterId = e.target.value; saveState(state);
      const mon = MONSTERS.find(m=>m.id===state.selectedMonsterId); if(mon) paintMonsterCard(mon);
    });
  }
  const sel = row.querySelector('#monsterPickerSelect');
  const zone = zoneId || document.querySelector('.zone-btn.active')?.dataset.zone;
  const mons = MONSTERS.filter(m=>!zone || m.zone===zone);
  const selected = preId || state.selectedMonsterId || mons[0]?.id || '';
  sel.innerHTML = mons.map(m=>`<option value="${m.id}" ${m.id===selected?'selected':''}>${m.name} (Lv ${m.level})</option>`).join('');
  state.selectedMonsterId = selected; saveState(state);
}

/* ---------------- Overlay Control ---------------- */
function openCombat(mon, opts = {}){
  if (!overlayEls.overlay || !mon) return;
  const petOnly = !!opts.petOnly;
  setPetMode(petOnly);
  state.selectedMonsterId = mon.id;
  // keep combat null until beginFight()
  saveState(state);

  if (petOnly) renderPetMonsterPicker(mon.zone, mon.id);
  paintMonsterCard(mon);
  if (overlayEls.training) overlayEls.training.value = state.trainingStyle || 'shared';
  if (overlayEls.log) overlayEls.log.innerHTML = '';
  enableCombatLogAutoScroll();
  overlayEls.overlay.classList.remove('hidden');
  renderCombat();  // <- paints pet.hp / pet.maxHp in pet mode
}

function closeCombat(){
  overlayEls.overlay?.classList.add('hidden'); setPetMode(false);
  state.combat=null; saveState(state); clearAutoSession(); stopFightLoop();
}
overlayEls.close?.addEventListener('click', closeCombat);
overlayEls.overlay?.addEventListener('click', (e)=>{ if (e.target === overlayEls.overlay) closeCombat(); });
document.addEventListener('keydown', (e)=>{ if (e.key==='Escape' && !overlayEls.overlay.classList.contains('hidden')) closeCombat(); });
overlayEls.training?.addEventListener('change', ()=>{ state.trainingStyle = overlayEls.training.value || 'shared'; saveState(state); });

/* ---------------- Buttons ---------------- */
overlayEls.fightBtn?.addEventListener('click', ()=>{
  const monId = state.petBattleMode ? (document.getElementById('monsterPickerSelect')?.value) : (state.selectedMonsterId);
  const mon = MONSTERS.find(m=>m.id===monId); if (!mon || state.combat) return;
  if (state.petBattleMode){
    beginFight(state, mon.id, { petOnly:true });
    overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`Your pet engages ${mon.name}!`}));
  } else {
    beginFight(state, mon.id);
    overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`You engage ${mon.name}!`}));
    if (isAutobattleUnlocked() && getAuto(mon.id) && !autoActive(mon.id)) {
      startAutoSession(mon.id);
      overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle: session started (3 minutes).`}));
    }
  }
  saveState(state); renderCombat(); renderEquipment(); startFightLoop();
});
overlayEls.eatBtn?.addEventListener('click', ()=>{ if (state.petBattleMode) return; if (!canEat()) return; doEatOnce(); });
overlayEls.fleeBtn?.addEventListener('click', ()=>{
  if (!state.combat) return;
  const mon = MONSTERS.find(m=>m.id===state.combat.monsterId);
  overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent: state.petBattleMode ? `You called your pet back from ${mon?.name||state.combat.monsterId}.` : `You fled from ${mon?.name||state.combat.monsterId}.`}));
  closeCombat();
});

/* --- cosmetic CSS (kept minimal; no hiding of HP bar now) --- */
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
    /* keep training/eat hidden in pet mode, but DO show HP bar for pet */
    #combatOverlay.pet-only #trainingSelect{display:none!important;}
    #combatOverlay.pet-only #attackTurnBtn{display:none!important;}
    /* Hide mana UI in pet-only mode */
    #combatOverlay.pet-only #playerManaBar,
    #combatOverlay.pet-only #playerManaVal { display:none!important; }
  `;
  document.head.appendChild(css);
})();

/* --- combat-card Autobattle toggle (unchanged) --- */
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
  const row=document.createElement('label'); row.className='combat-auto-row'; row.title='Autobattle this monster';
  row.innerHTML=`<input type="checkbox" id="combatAutoChk" ${getAuto(mon.id)?'checked':''}/><span>Autobattle</span>`;
  host.appendChild(row);
  row.querySelector('#combatAutoChk')?.addEventListener('change',(e)=>{
    setAuto(mon.id,e.target.checked);
    if(e.target.checked){ startAutoSession(mon.id); overlayEls.log?.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle: session started (3 minutes).`})); }
    else { clearAutoSession(); overlayEls.log?.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle: disabled.`})); }
  });
}

/* --- Monster Grid & Zones --- */
export function renderMonsterGrid(zone){
  const grid=document.querySelector('#monsterGrid'); if(!grid)return; grid.innerHTML='';
  const monsters=MONSTERS.filter(m=>m.zone===zone);
  monsters.forEach(mon=>{
    const topDrops=(mon.drops||[]).slice().sort((a,b)=>(b.chance||0)-(a.chance||0)).slice(0,3);
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
        if (firstInZone){ state.selectedMonsterId = firstInZone.id; saveState(state); renderPetMonsterPicker(btn.dataset.zone, firstInZone.id); paintMonsterCard(firstInZone); }
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
