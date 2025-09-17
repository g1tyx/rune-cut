export function updateBar(barEl, labelEl, verb, pct){
    if (barEl)   barEl.style.width = (pct*100).toFixed(2) + '%';
    if (labelEl) labelEl.textContent = `${verb}… ${Math.round(pct*100)}%`;
  }
  export function resetBar(barEl, labelEl){
    if (barEl)   barEl.style.width = '0%';
    if (labelEl) labelEl.textContent = 'Idle';
  }
  