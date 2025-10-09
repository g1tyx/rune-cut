// /ui/sprites.js
import { ITEMS } from '../data/items.js';

// Percent-based sprite crop — works at any sheet pixel size.
function spriteDiv(def, frame='empty', px=28, extraClass=''){
  const cols = def.cols || 1;
  const rows = def.rows || 1;
  const [cx, cy] = (def.frames && def.frames[frame]) || [0,0];

  const bgSizeX = cols * px;
  const bgSizeY = rows * px;
  const posX = -cx * px;
  const posY = -cy * px;

  return `
    <div class="icon-sprite ${extraClass}"
         style="
           width:${px}px;height:${px}px;
           background-image:url('${def.sheet}');
           background-size:${bgSizeX}px ${bgSizeY}px;
           background-position:${posX}px ${posY}px;
           background-repeat:no-repeat;
         "></div>`;
}


/**
 * iconHtmlForItem(baseId, { px, frame, tintClass, glow, fallback, alt })
 * Returns HTML for either sprite or <img> (with optional fallback path).
 */
export function iconHtmlForItem(baseId, opts={}){
  const { px=28, frame='empty', tintClass='', glow=false, fallback=null, alt=null } = opts;
  const def = ITEMS[baseId];
  if (!def) return `<span class="icon">❔</span>`;

  // Prefer sprite sheets when available
  if (def.sheet && def.frames){
    return spriteDiv(def, frame, px, `${tintClass} ${glow?'glow':''}`.trim());
  }

  // Otherwise fall back to single image if present (or provided fallback)
  const src = def.img || fallback;
  if (src) return `<img class="icon-img ${tintClass} ${glow?'glow':''}" src="${src}" alt="${alt||def.name||baseId}">`;

  // Last resort: emoji/icon char
  return `<span class="icon">${def.icon || '❔'}</span>`;
}

// Inject minimal CSS once
(function ensureSpriteCss(){
  if (document.getElementById('sprite-css')) return;
  const css = document.createElement('style');
  css.id = 'sprite-css';
  css.textContent = `
    .icon-sprite{ display:inline-block; image-rendering: pixelated; background-repeat:no-repeat; }
    /* make glow work for sprites too */
    .icon-sprite.glow{ filter: drop-shadow(0 0 6px rgba(116,255,255,.85)) drop-shadow(0 0 16px rgba(116,255,255,.45)); }
  `;
  document.head.appendChild(css);
})();
