// /ui/router.js
import { qs, on } from '../utils/dom.js';

const PANEL_NAMES = [
  'enchanting','royal','royal_service','construction','forests','farming',
  'crafting','mining','smithing','fishing','cooking','combat','alchemy',
  'mechanics','destruction'
];

function getPanels(){
  const map = new Map();
  document.querySelectorAll('.tabpanel').forEach(el => {
    const id = el.id || '';
    const name = id.startsWith('tab-') ? id.slice(4) : id;
    if (name) map.set(name, el);
  });
  PANEL_NAMES.forEach(name => {
    const el = document.getElementById(`tab-${name}`) || document.getElementById(name);
    if (el) map.set(name, el);
  });
  return map;
}

export function setTab(name){
  const panels = getPanels();
  const entries = [...panels.entries()];
  if (entries.length === 0) return;

  const activeEl = panels.get(name) || entries[0][1];
  const activeName = [...panels].find(([, el]) => el === activeEl)?.[0] || name;

  panels.forEach((el) => {
    if (!el.classList.contains('tabpanel')) el.classList.add('tabpanel');
    const isActive = el === activeEl;
    el.classList.toggle('hidden', !isActive);
    el.toggleAttribute('hidden', !isActive);
    el.style.removeProperty('display');
    el.style.pointerEvents = isActive ? 'auto' : 'none';
    el.setAttribute('aria-hidden', String(!isActive));
  });

  document.querySelectorAll('button.tab[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeName);
  });

  const hash = activeEl.id?.startsWith('tab-') ? activeEl.id.slice(4) : activeName;
  if (hash && location.hash !== `#${hash}`) {
    history.replaceState(null, '', `#${hash}`);
  }

  activeEl?.scrollIntoView?.({ block: 'start' });
}

export function wireRoutes(){
  on(document, 'click', 'button.tab[data-tab]', (e, btn) => setTab(btn.dataset.tab));

  const TILE_TO_TAB = {
    'tile-wc':'forests','tile-craft':'crafting','tile-min':'mining',
    'tile-smith':'smithing','tile-fish':'fishing','tile-cook':'cooking',
    'tile-atk':'combat','tile-str':'combat','tile-def':'combat',
    'tile-enchant':'enchanting','tile-royal':'royal',
    'tile-alch':'alchemy','tile-destruction':'destruction',
    'tile-farming':'farming','tile-mechanics':'mechanics'
  };
  Object.entries(TILE_TO_TAB).forEach(([id, tab])=>{
    const el = qs(`#${id}`); if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => setTab(tab));
  });

  const initial = (location.hash || '').slice(1) || 'forests';
  setTab(initial);
}
