// /ui/combat.js
import { state, saveState } from '../systems/state.js';
import { MONSTERS } from '../data/monsters.js';
import { beginFight, turnFight, hpMaxFor } from '../systems/combat.js';
import { qs } from '../utils/dom.js';
import { renderInventory } from './inventory.js';
import { renderEquipment } from './equipment.js';
import { renderSkills } from './skills.js';
import { ensureMana, manaMaxFor, startManaRegen } from '../systems/mana.js';
import { ITEMS } from '../data/items.js'; // for food heal values

const overlayEls = {
  overlay:       qs('#combatOverlay'),
  close:         qs('#closeCombat'),

  // Actions (no "-Overlay" suffix in HTML)
  fightBtn:      qs('#fightBtn'),
  eatBtn:        qs('#attackTurnBtn'), // repurposed "Attack" button to Eat
  fleeBtn:       qs('#fleeBtn'),
  training:      qs('#trainingSelect'),

  // Log
  log:           qs('#combatLog'),

  // Monster card
  monImg:        qs('#monsterImg'),
  monName:       qs('#monsterCardName'),
  monLvl:        qs('#monsterCardLevel'),
  monStats:      qs('#monsterCardStats'),

  // HUD
  playerHpBar:   qs('#playerHpBar'),
  playerHpVal:   qs('#playerHpVal'),
  playerManaBar: qs('#playerManaBar'),
  playerManaVal: qs('#playerManaVal'),
  monHpBar:      qs('#monHpBar'),
  monHpVal:      qs('#monHpVal'),
  monNameHud:    qs('#monName'),
};

/* ----------------------------- Favor → Autobattle unlock ----------------------------- */
function isAutobattleUnlocked(){
  return !!(state.unlocks && state.unlocks.autobattle);
}
function getAuto(monId){
  return !!(state.autobattleByMonster && state.autobattleByMonster[monId]);
}
function setAuto(monId, val){
  state.autobattleByMonster = state.autobattleByMonster || {};
  state.autobattleByMonster[monId] = !!val;
  saveState(state);
}

/* ---------- NEW: 3-minute autobattle session control ---------- */
const AUTO_SESSION_MS = 3 * 60 * 1000; // 3 minutes

function startAutoSession(monId){
  state.autobattleMonId   = monId;
  state.autobattleUntilMs = Date.now() + AUTO_SESSION_MS;
  saveState(state);
}
function clearAutoSession(){
  delete state.autobattleMonId;
  delete state.autobattleUntilMs;
  saveState(state);
}
function autoActive(monId){
  if (!isAutobattleUnlocked() || !getAuto(monId)) return false;
  if (state.autobattleMonId !== monId) return false;
  return Date.now() < (state.autobattleUntilMs || 0);
}

/* ----------------------------- Drops preview helpers ----------------------------- */

// rarity buckets -> CSS classes
function rarityFromChance(p = 0){
  if (p >= 0.20)  return 'common';
  if (p >= 0.05)  return 'uncommon';
  if (p >= 0.01)  return 'rare';
  if (p >= 0.002) return 'epic';
  return 'legendary';
}
function fmtPct(p = 0){
  return `${Math.max(0.01, +(p*100).toFixed(p < 0.01 ? 2 : 1))}%`;
}
function itemIconHtml(id){
  const it = ITEMS?.[id] || {};
  const src = it.img || null;
  if (src) return `<img src="${src}" alt="">`;
  return `<span class="icon">${it.icon || '🎁'}</span>`;
}

// discovery helpers
function dropKey(d){
  if (!d) return null;
  if (d.id)   return `item:${d.id}`;
  if (d.gold) return `gold:${d.gold}`;
  return null;
}
function isDiscovered(d){
  const k = dropKey(d);
  return !!(k && state.discoveredDrops && state.discoveredDrops[k]);
}

function chipHtmlForDrop(d){
  const known = isDiscovered(d);
  if (!known){
    return `<span class="drop-chip unknown" title="Undiscovered"><span class="icon">?</span><span class="name">Unknown</span></span>`;
  }
  if (d.id){
    const it = ITEMS?.[d.id] || {};
    const name = it.name || d.id;
    const rar = rarityFromChance(d.chance || 0);
    const tip = `${name} — ${fmtPct(d.chance || 0)}`;
    // Always show item name (no hover needed)
    return `<span class="drop-chip ${rar}" title="${tip}">${itemIconHtml(d.id)}<span class="name">${name}</span></span>`;
  }
  if (d.gold){
    // For gold, keep minimal: icon only (name not shown)
    const tip = `${d.gold}g — ${fmtPct(d.chance || 0)}`;
    return `<span class="drop-chip gold" title="${tip}"><span class="icon">🪙</span></span>`;
  }
  return '';
}

// small dot for grid cards (top 3)
function dotClassForChance(p = 0){ return rarityFromChance(p); }

/* ----------------------------- Combat loop & HUD ----------------------------- */

const ATK_COOLDOWN_MS = 500;
let atkCooldownUntil = 0;
const nowMs = () => performance.now();

function pulse(el, cls, ms = 300){
  if (!el) return;
  el.classList.add(cls);
  setTimeout(()=> el.classList.remove(cls), ms);
}

function bubbleDamage(anchorBarEl, amount, kind = 'dealt', { crit=false, slam=false, text=null } = {}){
  if (!anchorBarEl) return;
  const progress = anchorBarEl.closest('.progress');
  let host = progress?.parentElement || anchorBarEl.parentElement || anchorBarEl;

  const cs = host ? getComputedStyle(host) : null;
  if (host && cs && cs.position === 'static') host.style.position = 'relative';
  if (host && cs && (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflowY === 'hidden')){
    host = host.parentElement || host;
    const cs2 = getComputedStyle(host);
    if (cs2.position === 'static') host.style.position = 'relative';
  }

  const d = document.createElement('div');
  d.className = `floating-dmg ${kind}${crit ? ' crit' : ''}${slam ? ' slam' : ''}`;
  d.textContent = text ?? `-${amount}`;
  host.appendChild(d);
  d.addEventListener('animationend', ()=> d.remove(), { once:true });
}
function bubbleHeal(anchorBarEl, amount){
  bubbleDamage(anchorBarEl, amount, 'heal', { text: `+${amount}` });
}

function currentMonster(){
  const id = state.selectedMonsterId;
  return MONSTERS.find(m => m.id === id) || MONSTERS[0] || null;
}

function setBar(bar, label, cur, max){
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round(100*cur/max))) : 0;
  if (bar)   bar.style.width = pct + '%';
  if (label) label.textContent = `${cur}/${max}`;
}

/* ---------------- Eating helpers ---------------- */
function healAmountForBase(baseId){
  const def = ITEMS[baseId] || {};
  return Number.isFinite(def.heal) ? def.heal : 0;
}
function canEat(){
  const slots = state.equipment || {};
  const base  = slots.food;
  const qty   = Math.max(0, slots.foodQty|0);
  if (!base || qty <= 0) return false;
  const heal = healAmountForBase(base);
  if (heal <= 0) return false;
  const max = hpMaxFor(state);
  return (state.hpCurrent ?? max) < max;
}
function doEatOnce(){
  const slots = state.equipment || {};
  const base  = slots.food;
  let qty     = Math.max(0, slots.foodQty|0);
  if (!base || qty <= 0) return false;

  const heal = healAmountForBase(base);
  if (heal <= 0) return false;

  const max = hpMaxFor(state);
  const cur = state.hpCurrent == null ? max : state.hpCurrent;
  if (cur >= max) return false;

  const def = ITEMS[base] || {};
  const name = def.name || base;

  const healed = Math.min(heal, max - cur);
  state.hpCurrent = Math.min(max, cur + heal);
  qty -= 1;
  slots.foodQty = Math.max(0, qty);
  if (slots.foodQty === 0) slots.food = '';

  pulse(overlayEls.playerHpBar, 'flash-heal', 350);
  bubbleHeal(overlayEls.playerHpBar, healed);
  if (overlayEls.log){
    const line = document.createElement('div');
    line.textContent = `You eat ${name} and heal ${healed} HP.`;
    overlayEls.log.appendChild(line);
    overlayEls.log.scrollTop = overlayEls.log.scrollHeight;
  }

  try { window.dispatchEvent(new Event('hp:change')); } catch {}
  try { window.dispatchEvent(new Event('food:change')); } catch {}
  renderEquipment();
  renderCombat();
  saveState(state);
  return true;
}

/* ---------------- HUD paint ---------------- */
function paintHud(){
  // Player
  const maxHp = hpMaxFor(state);
  const curHpRaw = state.hpCurrent;
  const curHp = Math.max(0, Math.min(maxHp, curHpRaw == null ? maxHp : curHpRaw));
  setBar(overlayEls.playerHpBar, overlayEls.playerHpVal, curHp, maxHp);

  ensureMana(state);
  const maxMp = manaMaxFor(state);
  const curMp = Math.max(0, Math.min(maxMp, state.manaCurrent));
  setBar(overlayEls.playerManaBar, overlayEls.playerManaVal, curMp, maxMp);

  // Monster (selected or active)
  const active = state.combat;
  const mon = active ? MONSTERS.find(m=>m.id===active.monsterId) : currentMonster();
  const monMax = active ? (mon?.hp ?? 20) : (mon?.hp ?? 0);
  const monCur = active ? Math.max(0, state.combat.monHp) : monMax;
  setBar(overlayEls.monHpBar, overlayEls.monHpVal, monCur, monMax);
  if (overlayEls.monNameHud) overlayEls.monNameHud.textContent = mon?.name || '—';

  // Buttons
  const inFight = !!state.combat;

  // Start Fight disabled in-fight or if no monster
  if (overlayEls.fightBtn)  overlayEls.fightBtn.disabled  = inFight || !mon;

  // Eat button: enable when canEat(), regardless of cooldown
  if (overlayEls.eatBtn){
    overlayEls.eatBtn.disabled = !canEat();
    overlayEls.eatBtn.classList.toggle('cooldown', false);
    overlayEls.eatBtn.setAttribute('title', canEat() ? 'Eat food to heal' : 'Nothing to eat or HP is full');
  }

  // Flee only enabled during a fight
  if (overlayEls.fleeBtn)   overlayEls.fleeBtn.disabled   = !inFight;
}

/* ---------------- Monster card paint (with Drops row) ---------------- */
function killsOf(monId){
  return (state.monsterKills && state.monsterKills[monId]) || 0;
}

function paintMonsterDrops(mon){
  const host = document.getElementById('monsterDrops');
  if (!host) return;

  // ensure the right class for your flex-wrap styling
  host.classList.add('monster-drops');

  const rows = (mon?.drops || [])
    .slice()
    .sort((a,b)=>(b.chance||0)-(a.chance||0));

  const chips = rows.map(chipHtmlForDrop).join('');
  host.innerHTML = chips || '<span class="muted small">No known drops</span>';
}

function paintMonsterCard(mon){
  if (!mon) return;
  if (overlayEls.monImg)  { overlayEls.monImg.src = mon.img || ''; overlayEls.monImg.alt = mon.name || mon.id; }
  if (overlayEls.monName) overlayEls.monName.textContent = mon.name || mon.id;
  if (overlayEls.monLvl)  overlayEls.monLvl.textContent  = String(mon.level ?? 1);

  const statsBits = [];
  if (Number.isFinite(mon.hp))      statsBits.push(`HP ${mon.hp}`);
  if (Number.isFinite(mon.attack))  statsBits.push(`Atk ${mon.attack}`);
  if (Number.isFinite(mon.defense)) statsBits.push(`Def ${mon.defense}`);
  if (Number.isFinite(mon.maxHit))  statsBits.push(`Max ${mon.maxHit}`);
  if (overlayEls.monStats) overlayEls.monStats.textContent = statsBits.join(' · ') || '—';

  // labeled Drops row — always show item names; gold stays icon-only
  paintMonsterDrops(mon);

  // Autobattle toggle inside the combat card
  renderCombatAutoToggle(mon);
}

export function renderCombat(){
  ensureMana(state);
  startManaRegen(state, ()=>{
    saveState(state);
    const maxMp = manaMaxFor(state);
    setBar(overlayEls.playerManaBar, overlayEls.playerManaVal, state.manaCurrent, maxMp);
  });
  paintHud();
}

function enableCombatLogAutoScroll(){
  const log = overlayEls.log;
  if (!log || log._autoScrollReady) return;
  log._autoScrollReady = true;

  const toBottom = ()=> { log.scrollTop = log.scrollHeight; };

  // Scroll on new entries
  const mo = new MutationObserver(toBottom);
  mo.observe(log, { childList: true });

  // Also catch size changes just in case
  const ro = new ResizeObserver(toBottom);
  ro.observe(log);

  // Initial snap
  toBottom();
}


/* ---------------- Auto-fight loop ---------------- */
let fightLoop = null;
function stopFightLoop(){
  if (fightLoop) { clearInterval(fightLoop); fightLoop = null; }
}

function applyTurnFx(logs){
  const parseDamage = (line)=> {
    const m = /for\s+(\d+)/i.exec(line||'');
    return m ? parseInt(m[1],10) : null;
  };
  const hasCrit = (s='') => /\bcrit/i.test(s) || /\bcritical\b/i.test(s);

  const youHitLine  = logs.find(l => l.startsWith('You hit '));
  const monHitLine  = logs.find(l => /\bhits you for\b/i.test(l));
  const youMissLine = logs.find(l => /\byou miss\b/i.test(l));
  const monMissLine = logs.find(l => /misses you\b/i.test(l));
  const youBlockLn  = logs.find(l => /\byou block\b/i.test(l));
  const monBlockLn  = logs.find(l => /\bblocks your\b/i.test(l));

  const dmgMon = parseDamage(youHitLine);
  const dmgYou = parseDamage(monHitLine);

  if (dmgMon != null){
    const crit = hasCrit(youHitLine);
    pulse(overlayEls.monHpBar, 'flash-dmg', 350);
    bubbleDamage(overlayEls.monHpBar, dmgMon, 'dealt', { crit });
  } else if (youMissLine){
    bubbleDamage(overlayEls.monHpBar, 0, 'miss', { text:'Miss' });
  } else if (monBlockLn){
    bubbleDamage(overlayEls.monHpBar, 0, 'block', { text:'Block' });
  }

  if (dmgYou != null){
    const crit = hasCrit(monHitLine);
    pulse(overlayEls.playerHpBar, 'flash-dmg', 350);
    bubbleDamage(overlayEls.playerHpBar, dmgYou, 'taken', { crit, slam:true });
  } else if (monMissLine){
    bubbleDamage(overlayEls.playerHpBar, 0, 'miss', { text:'Miss' });
  } else if (youBlockLn){
    bubbleDamage(overlayEls.playerHpBar, 0, 'block', { text:'Block' });
  }
}

// Runs one combat turn: logs, FX, HUD, end handling. Returns result from turnFight.
function runCombatTurn(){
  const result = turnFight(state);
  const logs = result?.log || [];

  // don't log per-hit lines anymore, but DO play the damage/heal FX
  applyTurnFx(logs);

  atkCooldownUntil = nowMs() + ATK_COOLDOWN_MS;

  renderCombat();
  renderEquipment();

  if (result?.done){
    if (result.win){
      const xp = result.xp || { atk:0, str:0, def:0 };
      const loot = result.loot || [];
      overlayEls.log.appendChild(Object.assign(document.createElement('div'),{
        textContent: `Victory! XP — Atk +${xp.atk||0}, Str +${xp.str||0}, Def +${xp.def||0}.`
      }));
      if (loot.length) overlayEls.log.appendChild(Object.assign(document.createElement('div'),{
        className: 'loot-line',
        textContent: `Loot: ${loot.join(', ')}`
      }));

      paintMonsterDrops(currentMonster());

      const mon = currentMonster();
      const overlayOpen = !overlayEls.overlay?.classList.contains('hidden');
      if (mon && overlayOpen && autoActive(mon.id)){
        setTimeout(()=>{
          beginFight(state, mon.id);
          overlayEls.log.appendChild(Object.assign(document.createElement('div'),{
            textContent:`Autobattle: re-engaging ${mon.name}...`
          }));
          saveState(state);
          renderCombat();
          renderEquipment();
          startFightLoop();
        }, 350);
      } else if (mon && isAutobattleUnlocked() && getAuto(mon.id) && state.autobattleMonId === mon.id) {
        overlayEls.log.appendChild(Object.assign(document.createElement('div'),{
          textContent:`Autobattle: 3-minute session ended.`
        }));
        clearAutoSession();
      }
    } else {
      overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent: `You were defeated.`}));
      clearAutoSession();
    }
    saveState(state);
    renderInventory();
    renderEquipment();
    renderSkills();
  } else {
    saveState(state);
  }

  return result;
}

function startFightLoop(){
  stopFightLoop();
  fightLoop = setInterval(()=>{
    if (!state.combat) { stopFightLoop(); return; }
    if (nowMs() < atkCooldownUntil) return; // respect cooldown
    const res = runCombatTurn();
    if (res?.done) stopFightLoop();
  }, ATK_COOLDOWN_MS);
}

/* ---------------- Overlay Control ---------------- */
function openCombat(mon){
  if (!overlayEls.overlay) return;

  state.selectedMonsterId = mon.id;
  saveState(state);

  paintMonsterCard(mon);

  if (overlayEls.training) {
    overlayEls.training.value = state.trainingStyle || 'shared';
  }

  if (overlayEls.log) overlayEls.log.innerHTML = '';
  enableCombatLogAutoScroll();

  overlayEls.overlay.classList.remove('hidden');
  renderCombat();
}
function closeCombat(){
  overlayEls.overlay?.classList.add('hidden');
  state.combat = null;
  saveState(state);
  clearAutoSession();
  stopFightLoop();
}
overlayEls.close?.addEventListener('click', closeCombat);
overlayEls.overlay?.addEventListener('click', (e)=>{
  if (e.target === overlayEls.overlay) closeCombat();
});
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && !overlayEls.overlay.classList.contains('hidden')) closeCombat();
});
overlayEls.training?.addEventListener('change', ()=>{
  state.trainingStyle = overlayEls.training.value || 'shared';
  saveState(state);
});

/* ---------------- Buttons ---------------- */
overlayEls.fightBtn?.addEventListener('click', ()=>{
  const mon = currentMonster();
  if (!mon || state.combat) return;
  beginFight(state, mon.id);
  overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`You engage ${mon.name}!`}));

  // If player has autobattle enabled for this monster, (re)start a 3-minute session on fight
  if (isAutobattleUnlocked() && getAuto(mon.id) && !autoActive(mon.id)) {
    startAutoSession(mon.id);
    overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle: session started (3 minutes).`}));
  }

  saveState(state);
  renderCombat();
  renderEquipment();
  startFightLoop(); // auto-attacks every 0.5s
});
overlayEls.eatBtn?.addEventListener('click', ()=>{
  if (!canEat()) return;
  doEatOnce();
});
overlayEls.fleeBtn?.addEventListener('click', ()=>{
  if (!state.combat) return;
  const mon = MONSTERS.find(m=>m.id===state.combat.monsterId);
  overlayEls.log.appendChild(Object.assign(document.createElement('div'),{textContent:`You fled from ${mon?.name || state.combat.monsterId}.`}));
  closeCombat();
});

/* ---------------- Styles: Autobattle in combat + always-visible drop names ---------------- */
(function ensureCombatUiCss(){
  if (document.getElementById('combat-ui-css')) return;
  const css = document.createElement('style');
  css.id = 'combat-ui-css';
  css.textContent = `
    /* Autobattle toggle inside combat card */
    .combat-auto-host { margin-top: 6px; }
    .combat-auto-row { display:flex; align-items:center; gap:6px; font-size:12px; opacity:0.95; user-select:none; }
    .combat-auto-row input { transform: translateY(1px); }

    /* Always show item names in drops (gold stays icon-only) */
    #monsterDrops .drop-chip .name { display:inline !important; }
    #monsterDrops .drop-chip.gold .name { display:none !important; }
    #combatLog .loot-line { color:#eab308; font-weight:700; }
  `;
  document.head.appendChild(css);
})();

/* ---------------- Combat-card Autobattle toggle ---------------- */
function ensureCombatAutoHost(){
  // Try to place the toggle right below the stats line
  const anchor = overlayEls.monStats?.parentElement || document.querySelector('#monsterCard');
  if (!anchor) return null;
  let host = document.getElementById('combatAutoHost');
  if (!host){
    host = document.createElement('div');
    host.id = 'combatAutoHost';
    host.className = 'combat-auto-host';
    anchor.appendChild(host);
  }
  return host;
}
function renderCombatAutoToggle(mon){
  const host = ensureCombatAutoHost();
  if (!host) return;
  host.innerHTML = '';
  if (!isAutobattleUnlocked() || !mon) return;

  const row = document.createElement('label');
  row.className = 'combat-auto-row';
  row.title = 'Autobattle this monster';
  row.innerHTML = `
    <input type="checkbox" id="combatAutoChk" ${getAuto(mon.id) ? 'checked' : ''}/>
    <span>Autobattle</span>
  `;
  host.appendChild(row);

  row.querySelector('#combatAutoChk')?.addEventListener('change', (e)=>{
    setAuto(mon.id, e.target.checked);
    if (e.target.checked){
      startAutoSession(mon.id);
      overlayEls.log?.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle: session started (3 minutes).`}));
    } else {
      clearAutoSession();
      overlayEls.log?.appendChild(Object.assign(document.createElement('div'),{textContent:`Autobattle: disabled.`}));
    }
  });
}

/* ---------------- Monster Grid & Zones ---------------- */
export function renderMonsterGrid(zone) {
  const grid = document.querySelector('#monsterGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const monsters = MONSTERS.filter(m => m.zone === zone);
  monsters.forEach(mon => {
    const topDrops = (mon.drops||[])
      .slice()
      .sort((a,b)=>(b.chance||0)-(a.chance||0))
      .slice(0,3);

    const dots = topDrops.map(d => {
      const known = isDiscovered(d);
      if (!known){
        return `<span class="dot unknown" title="Undiscovered"></span>`;
      }
      const name = d.id ? (ITEMS?.[d.id]?.name || d.id) : `${d.gold}g`;
      return `<span class="dot ${dotClassForChance(d.chance||0)}" title="${name} · ${fmtPct(d.chance||0)}"></span>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'monster-choice';
    card.dataset.id = mon.id;

    // Checkbox REMOVED from grid; it now lives in the combat card only
    card.innerHTML = `
      <img src="${mon.img || ''}" alt="${mon.name}">
      <div class="title">${mon.name}</div>
      <div class="muted">Lv ${mon.level}</div>
      <div class="muted">Kills: <span id="monsterKillCount">${killsOf(mon.id)}</span></div>
      <div class="drops-row" aria-label="Notable drops">${dots}</div>
    `;

    card.addEventListener('click', ()=> openCombat(mon));
    grid.appendChild(card);
  });
}

function setupZones() {
  const map = document.querySelector('#combatMap');
  if (!map) return;
  map.querySelectorAll('.zone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      map.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMonsterGrid(btn.dataset.zone);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupZones();
  const firstZone = document.querySelector('.zone-btn')?.dataset.zone;
  if (firstZone) renderMonsterGrid(firstZone);
});

/* Repaint drops if an external system signals new discovery */
window.addEventListener('drops:discover', ()=>{
  paintMonsterDrops(currentMonster());
});
