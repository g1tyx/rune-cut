// /systems/inventory.js
import { ITEMS } from '../data/items.js';
import { renderAllSkillingPanels } from '../ui/app.js';

export function addItem(state, id, c) {
  state.inventory[id] = (state.inventory[id] || 0) + c;
  renderAllSkillingPanels();
}
export function removeItem(state, id, c) {
  const next = Math.max(0, (state.inventory[id] || 0) - c);
  if (next === 0) delete state.inventory[id];
  else state.inventory[id] = next;
  renderAllSkillingPanels();
}
export function addGold(state, n) {
  state.gold = (state.gold || 0) + (n | 0);
  try { window.dispatchEvent(new Event('gold:change')); } catch {}
  renderAllSkillingPanels();
}
  