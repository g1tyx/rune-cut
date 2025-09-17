export const qs  = (s, r=document) => r.querySelector(s);
export const qsa = (s, r=document) => [...r.querySelectorAll(s)];
export function on(el, ev, selOrFn, fn){
  if (!el) return;
  if (typeof selOrFn === 'function') { el.addEventListener(ev, selOrFn); return; }
  el.addEventListener(ev, e => { const t = e.target.closest(selOrFn); if (t) fn(e, t); });
}
