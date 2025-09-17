import { qs } from '../utils/dom.js';
const tooltip = qs('#tooltip');

export function showTip(evt, title, body){
  if (!tooltip) return;
  const htmlBody = body ? `<div class="muted">${String(body).replace(/\n/g,'<br>')}</div>` : '';
  tooltip.innerHTML = `<b>${title}</b>${htmlBody}`;
  tooltip.classList.remove('hidden');

  const pad = 12;
  const { innerWidth:w, innerHeight:h } = window;
  const r = tooltip.getBoundingClientRect();
  let x = evt.clientX + pad;
  let y = evt.clientY + pad;
  if (x + r.width > w - 8) x = w - r.width - 8;
  if (y + r.height > h - 8) y = h - r.height - 8;
  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
}
export function hideTip(){ tooltip?.classList.add('hidden'); }
