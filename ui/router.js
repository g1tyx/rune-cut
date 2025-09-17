// /ui/router.js
import { qs, on } from '../utils/dom.js';

// Known panel names you use today (safe to grow later)
const PANEL_NAMES = ['forests','crafting','mining','smithing','fishing','cooking','combat'];

// Find all panels robustly (works even if some are missing the .tabpanel class)
function getPanels(){
  const map = new Map();

  // Any element already marked as a tab panel
  document.querySelectorAll('.tabpanel').forEach(el => {
    const id = el.id || '';
    const name = id.startsWith('tab-') ? id.slice(4) : id;
    if (name) map.set(name, el);
  });

  // Also pick up well-known ids like #tab-forests, etc.
  PANEL_NAMES.forEach(name => {
    const el = document.getElementById(`tab-${name}`);
    if (el) map.set(name, el);
  });

  return map;
}

export function setTab(name){
  const panels = getPanels();

  // Fallback to first available if name is unknown
  const activeEl = panels.get(name) || [...panels.values()][0];

  panels.forEach((el) => {
    // Ensure the class exists so your CSS continues to work
    if (!el.classList.contains('tabpanel')) el.classList.add('tabpanel');

    const isActive = el === activeEl;

    // Authoritative hide/show (prevents “panel stacking”)
    el.classList.toggle('hidden', !isActive);
    el.style.setProperty('display', isActive ? 'block' : 'none', 'important');
    el.style.setProperty('visibility', isActive ? 'visible' : 'hidden', 'important');    el.style.pointerEvents = isActive ? 'auto' : 'none';
    el.setAttribute('aria-hidden', String(!isActive));
  });

  // Reflect active state in any top nav buttons
  document.querySelectorAll('button.tab[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });

  // Optional: keep the URL hash in sync for reload/deep-linking
  if (activeEl?.id?.startsWith('tab-')) {
    const hash = activeEl.id.slice(4);
    if (location.hash !== `#${hash}`) {
      history.replaceState(null, '', `#${hash}`);
    }
  }

  activeEl?.scrollIntoView?.({ block: 'start' });
}

export function wireRoutes(){
  // Top tab buttons
  on(document, 'click', 'button.tab[data-tab]', (e, btn) => setTab(btn.dataset.tab));

  // Dashboard skill tiles -> tabs
  const TILE_TO_TAB = {
    'tile-wc':'forests','tile-craft':'crafting','tile-min':'mining',
    'tile-smith':'smithing','tile-fish':'fishing','tile-cook':'cooking',
    'tile-atk':'combat','tile-str':'combat','tile-def':'combat',
  };
  Object.entries(TILE_TO_TAB).forEach(([id, tab])=>{
    const el = qs(`#${id}`);
    if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => setTab(tab));
  });

  // Open tab from hash on first load (or forests by default)
  const initial = (location.hash || '').slice(1) || 'forests';
  setTab(initial);
}
