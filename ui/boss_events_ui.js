/* ui/boss_events_ui.js */

const LOG_PREFIX = '[BossEventsUI]';
const $ = (s, r = document) => r.querySelector(s);

// ---- Config ----
const CONFIG = {
  windowSeconds: 4,       // how often to consider spawning
  chancePerWindow: 0.35,  // 35% chance per window while in boss combat
  cutGoal: 4,             // cuts required to succeed
  timeMs: 3500,           // time to finish all cuts
  failDamage: 50,         // damage on fail
  enableForAllBosses: true,
};

let active = false;       // eligible to spawn (boss fight)
let bossId = null;
let rollTimer = null;     // setInterval handle
let runningEvent = false; // true while the mini is on screen

// --- helpers: combat/overlay guards -----------------------------------------
function overlayEl() { return $('#combatOverlay'); }
function isOverlayVisible() {
  const el = overlayEl();
  return !!(el && !el.classList.contains('hidden'));
}
function isInCombat() {
  // Treat “combat overlay visible” as the ground truth here.
  return isOverlayVisible();
}

// ---- DOM bootstrap (auto-mount inside the combat overlay) ----
function ensurePanel() {
  const overlay = overlayEl();
  if (!overlay) return null;

  const box = overlay.querySelector('.combat-box');
  if (!box) return null;

  let mini = overlay.querySelector('#bossMini');
  if (!mini) {
    mini = document.createElement('div');
    mini.id = 'bossMini';
    mini.className = 'boss-mini hidden';
    mini.innerHTML = `
      <div class="boss-mini-head">🌿 Vine Horror</div>
      <div class="boss-mini-body">
        <div class="boss-mini-instr">Cut the vines! (x<span class="need">4</span>)</div>
        <div class="boss-mini-vines">
          <button class="vine">✂️</button>
          <button class="vine">✂️</button>
          <button class="vine">✂️</button>
          <button class="vine">✂️</button>
        </div>
        <div class="boss-mini-progress">
          <div class="bar"></div>
        </div>
      </div>
    `;
    box.prepend(mini);

    // minimal styles (namespaced)
    const style = document.createElement('style');
    style.textContent = `
      .boss-mini{position:absolute; right:12px; top:12px; width:240px; background:#121316e0; border:1px solid #2b2f37; border-radius:12px; box-shadow:0 6px 22px rgba(0,0,0,.35); backdrop-filter: blur(4px); transform: translateY(-10px); opacity:0; transition: all .18s ease;}
      .boss-mini.show{opacity:1; transform: translateY(0);}
      .boss-mini.hidden{display:none;}
      .boss-mini-head{font-weight:700; padding:8px 10px; border-bottom:1px solid #22252c;}
      .boss-mini-body{padding:10px;}
      .boss-mini-instr{font-size:.9rem; color:#c8d1e0;}
      .boss-mini-vines{display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin:8px 0 10px;}
      .boss-mini-vines .vine{font-size:18px; padding:8px 0; border:1px solid #2a2e36; background:#1a1d24; border-radius:10px; cursor:pointer}
      .boss-mini-vines .vine.done{opacity:.45; text-decoration:line-through;}
      .boss-mini-progress{height:8px; background:#1a1d24; border:1px solid #2a2e36; border-radius:999px; overflow:hidden}
      .boss-mini-progress .bar{height:100%; width:100%; background:linear-gradient(90deg,#5ad,#49b); transition:width .05s linear}
    `;
    document.head.appendChild(style);

    // Observe overlay visibility changes; kill timers & close UI immediately
    const mo = new MutationObserver(() => {
      if (!isOverlayVisible()) {
        stopSpawner();
        forceClosePanel();
      }
    });
    mo.observe(overlay, { attributes: true, attributeFilter: ['class'] });

    // Also close on explicit “X” (if present)
    overlay.querySelector('#closeCombat')?.addEventListener('click', () => {
      stopSpawner();
      forceClosePanel();
    });
  }
  return mini;
}

function forceClosePanel() {
  const panel = $('#bossMini');
  if (!panel) return;
  runningEvent = false;
  panel.classList.add('hidden');
  panel.classList.remove('show');
}

// ---- Random spawner loop ----
function startSpawner() {
  stopSpawner();
  rollTimer = setInterval(() => {
    if (!active || runningEvent) return;
    if (!isInCombat()) return;                   // 🔒 hard guard
    if (Math.random() < CONFIG.chancePerWindow) {
      triggerVineHorror();
    }
  }, CONFIG.windowSeconds * 1000);
  // eslint-disable-next-line no-console
  console.debug(LOG_PREFIX, 'spawner started');
}

function stopSpawner() {
  if (rollTimer) {
    clearInterval(rollTimer);
    rollTimer = null;
    // eslint-disable-next-line no-console
    console.debug(LOG_PREFIX, 'spawner stopped');
  }
}

// ---- Event implementation ----
function triggerVineHorror() {
  if (!isInCombat()) return;                     // 🔒 guard before showing
  const panel = ensurePanel();
  if (!panel) return;

  runningEvent = true;
  // eslint-disable-next-line no-console
  console.debug(LOG_PREFIX, 'Vine Horror -> START');

  // reset UI
  panel.classList.remove('hidden');
  // force reflow to allow transition
  void panel.offsetHeight;
  panel.classList.add('show');

  const needEl = panel.querySelector('.need');
  const vines = [...panel.querySelectorAll('.vine')];
  const bar = panel.querySelector('.bar');

  let cuts = 0;
  let ended = false;
  const goal = CONFIG.cutGoal;
  const t0 = performance.now();

  needEl.textContent = String(goal);
  vines.forEach(v => v.classList.remove('done'));

  const onClick = (e) => {
    if (ended) return;
    const btn = e.currentTarget;
    if (btn.classList.contains('done')) return;
    btn.classList.add('done');
    cuts++;
    needEl.textContent = String(Math.max(0, goal - cuts));
    if (cuts >= goal) {
      resolve(true);
    }
  };
  vines.forEach(v => v.addEventListener('click', onClick));

  // progress timer
  const tick = () => {
    if (ended) return;
    if (!isInCombat()) {            // 🔒 fight ended mid-event; auto-cancel with no penalty
      resolve(null);
      return;
    }
    const dt = performance.now() - t0;
    const remain = Math.max(0, 1 - (dt / CONFIG.timeMs));
    bar.style.width = (remain * 100).toFixed(1) + '%';
    if (dt >= CONFIG.timeMs) {
      resolve(false);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  function teardown() {
    vines.forEach(v => v.removeEventListener('click', onClick));
    panel.classList.remove('show');
    // hide a bit after transition
    setTimeout(() => { panel.classList.add('hidden'); }, 200);
    runningEvent = false;
  }

  // success === true  -> award nothing here; just a log (damage can be applied elsewhere if you want)
  // success === false -> apply fail *only if still in combat*
  // success === null  -> cancelled (fight ended) no-op
  function resolve(success) {
    if (ended) return;
    ended = true;

    if (success === true) {
      window.dispatchEvent(new CustomEvent('boss:event:log', {
        detail: { text: 'You slice the vines before they tighten.' }
      }));
      // eslint-disable-next-line no-console
      console.debug(LOG_PREFIX, 'Vine Horror -> SUCCESS');
    } else if (success === false) {
      if (active && isInCombat()) { // 🔒 only punish during an active fight
        window.dispatchEvent(new CustomEvent('boss:event:apply', {
          detail: { damage: CONFIG.failDamage, unequipFood: true, reason: 'vine_whip' }
        }));
        window.dispatchEvent(new CustomEvent('boss:event:log', {
          detail: { text: 'Vine Horror whips you! You drop your food.' }
        }));
        // eslint-disable-next-line no-console
        console.debug(LOG_PREFIX, 'Vine Horror -> FAIL (damage, unequip food)');
      } else {
        // eslint-disable-next-line no-console
        console.debug(LOG_PREFIX, 'Vine Horror -> FAIL IGNORED (not in combat)');
      }
    } else {
      // cancelled because combat ended mid-event; do nothing
      // eslint-disable-next-line no-console
      console.debug(LOG_PREFIX, 'Vine Horror -> CANCELLED (combat ended)');
    }

    teardown();
  }
}

// ---- Wiring to combat lifecycle ----
window.addEventListener('boss:engage', (e) => {
  const { boss } = e.detail || {};
  bossId = e.detail?.bossId || null;

  if (!CONFIG.enableForAllBosses) {
    const allowed = boss?.tags?.includes?.('vine');
    active = !!allowed;
  } else {
    active = true;
  }

  ensurePanel();
  // eslint-disable-next-line no-console
  console.debug(LOG_PREFIX, 'boss:engage', { bossId, active });

  if (active && isInCombat()) startSpawner();
});

window.addEventListener('combat:finish', () => {
  active = false;
  bossId = null;
  stopSpawner();
  forceClosePanel();
});
