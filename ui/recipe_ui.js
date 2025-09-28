// /ui/recipe_ui.js
import { state, saveNow } from '../systems/state.js';
import { on } from '../utils/dom.js';
import { renderInventory } from './inventory.js';
import { renderSkills } from './skills.js';
import { renderEnchanting } from './enchanting.js';
import { ITEMS } from '../data/items.js';

/**
 * Initialize a standardized recipe panel.
 *
 * Supports two render types:
 * 1) Normal recipe cards (one per recipe).
 * 2) Selector groups (one card that lets the player choose between a set of variant recipes).
 *
 * @param {Object} cfg
 * @param {string}   cfg.actionType          'craft' | 'smelt' | 'brew' | 'enchant' | ...
 * @param {string}   cfg.listSelector        '#craftList' (container)
 * @param {string}   [cfg.barSelector]       '#craftBar'   (optional legacy global bar)
 * @param {string}   [cfg.labelSelector]     '#craftLabel' (optional legacy label)
 * @param {function} cfg.getAll(): object map id->recipe OR array of recipes with id
 * @param {function} cfg.canMake(state, id): boolean
 * @param {function} cfg.maxMake(state, id): number
 * @param {function} cfg.start(state, id, cb): boolean
 * @param {function} cfg.finish(state, id): { id, name, xpGains[] } | null
 * @param {function} cfg.pushLog(text): void
 * @param {function} [cfg.getBatchOptions(state)]: (number[] | includes 'X')
 * @param {function} [cfg.getBatchChoice(state)]: number|'X'
 * @param {function} [cfg.setBatchChoice(state, v)]: void
 * @param {function} [cfg.iconFor(recipe)]: string|null  // return a base item id for the icon (overrides output icon)
 *
 * @param {Array}    [cfg.selectorGroups]  optional array of selector groups:
 *   [{
 *      id: 'pages',
 *      title: 'Pages',
 *      include: (r)=> r.id.startsWith('pages_from_'),
 *      optionLabel: (r, helpers)=> string,
 *      initialChoice: (variants, helpers)=> variants[0].id,
 *      sort: (a,b)=> number
 *   }]
 */
export function initRecipePanel(cfg){
  const listEl  = document.querySelector(cfg.listSelector);
  const barEl   = cfg.barSelector   ? document.querySelector(cfg.barSelector)   : null;
  const labelEl = cfg.labelSelector ? document.querySelector(cfg.labelSelector) : null;

  // batching is optional
  const supportsBatch = () =>
    typeof cfg.getBatchOptions === 'function' &&
    typeof cfg.getBatchChoice  === 'function' &&
    typeof cfg.setBatchChoice  === 'function';

  // strict base helper (strips @quality and #tags if any)
  const baseIdStrict = (s) => String(s||'').split('@')[0].split('#')[0];

  /* ---------- helpers ---------- */
  function getAllMap(){
    const all = cfg.getAll() || {};
    if (Array.isArray(all)) {
      const m = {};
      for (const r of all) { m[r.id] = r; }
      return m;
    }
    return all;
  }

  function asArray(allMap){
    return Object.entries(allMap).map(([id, r]) => ({ id, ...r }));
  }

  function isBusy(){
    return !!(state.action && state.action.type === cfg.actionType);
  }
  function activeId(){
    return isBusy() ? state.action.key : null;
  }
  function progressPct(){
    if (!isBusy()) return 0;
    const now = performance.now();
    const { startedAt=now, duration=1 } = state.action;
    const p = (now - startedAt) / Math.max(1, duration);
    return Math.max(0, Math.min(1, p));
  }

  const H = {
    itemName(id){
      const base = baseIdStrict(id);
      return ITEMS?.[base]?.name || base.replace(/_/g, ' ');
    },
    optionDisabled(id){ return !cfg.canMake(state, id); },
    outputQty(r){
      const out = Array.isArray(r.outputs) ? r.outputs[0] : null;
      return out ? Number(out.qty || 0) : 0;
    },
    firstInputId(r){
      const inp = Array.isArray(r.inputs) ? r.inputs[0] : null;
      return inp ? String(inp.id) : null;
    },
    invCount(id){
      return state.inventory?.[id] || 0;
    },
    xpArr(r){
      return Array.isArray(r.xp) ? r.xp.filter(g => g?.skill && g?.amount>0) : [];
    },
    xpBadge(r){
      const arr = H.xpArr(r);
      const tot = arr.reduce((s,g)=>s+g.amount,0);
      return tot ? `<span class="badge xp" title="${arr.map(g=>`+${g.amount} ${g.skill} xp`).join(', ')}">+${tot}xp</span>` : '';
    },

    // Preferred icon logic (no post-render swaps):
    // 1) If cfg.iconFor(recipe) returns a base id whose def has an image, use it.
    // 2) Otherwise, if recipe has outputs, use the first output image (e.g., tomes).
    // 3) Otherwise, show a small sparkle.
    iconHtml(r){
      let src = null;

      if (typeof cfg.iconFor === 'function'){
        const forcedBase = cfg.iconFor(r);
        if (forcedBase){
          const b = baseIdStrict(forcedBase);
          const def = ITEMS[b];
          if (def?.img) src = def.img;
        }
      }

      if (!src && Array.isArray(r.outputs) && r.outputs.length){
        const outBase = baseIdStrict(r.outputs[0].id);
        const def = ITEMS[outBase];
        if (def?.img) src = def.img;
      }

      return src
        ? `<img class="icon-img" src="${src}" alt="">`
        : `<span class="icon" style="font-size:20px">✨</span>`;
    },

    reqLine(r){
      const ins = Array.isArray(r.inputs) ? r.inputs : [];
      return ins.map(i => `${i.qty}× ${H.itemName(i.id)}`).join(', ');
    }
  };

  /* ---------- CSS (once) ---------- */
  function ensureCss(){
    if (document.getElementById('prod-css')) return;
    const css = document.createElement('style');
    css.id = 'prod-css';
    css.textContent = `
        .batch-row{display:flex;gap:6px;align-items:center;margin:0 0 8px;flex-wrap:wrap}
        .batch-row .batch-btn{padding:4px 8px;border-radius:8px;font-size:12px;background:#1b2333;color:#cfe3ff;border:1px solid rgba(255,255,255,.06)}
        .batch-row .batch-btn.active{background:#14351f;color:#22c55e;border-color:#1b3b25}
        .batch-row .batch-btn:disabled{opacity:.6;cursor:not-allowed}
        .recipe-card,.selector-card{display:block;width:100%;text-align:left;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:#0f1524;margin:0}
        .recipe-card.disabled,.selector-card.disabled{opacity:.6;cursor:not-allowed}
        .recipe-card .head,.selector-card .head{display:flex;gap:10px;align-items:center}
        .recipe-card .titles,.selector-card .titles{flex:1 1 auto;min-width:0}
        .recipe-card .name,.selector-card .name{font-weight:600}
        .recipe-card .sub,.selector-card .sub{font-size:12px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .recipe-card .badges,.selector-card .badges{display:flex;gap:6px}
        .recipe-card .progress,.selector-card .progress{height:4px;background:#182033;border-radius:5px;overflow:hidden;margin-top:6px}
        .recipe-card .progress .bar,.selector-card .progress .bar{height:100%;width:0%;background:#3b82f6}
        .badge.level{font-size:11px;padding:2px 6px;border:1px solid rgba(255,255,255,.08);border-radius:999px}
        .badge.xp{font-size:11px;padding:2px 6px;background:#1b2d1f;color:#22c55e;border:1px solid #1f3d25;border-radius:999px}
        .icon-img{width:28px;height:28px;object-fit:contain}
        .selector-body{margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .selector-body select{min-width:220px}
    `;
    document.head.appendChild(css);
  }
  ensureCss();

  /* ---------- batching row ---------- */
  function renderBatchRow(){
    if (!listEl) return;

    // If this panel doesn't support batching, remove any stale row and bail.
    if (!supportsBatch()){
      const stale = listEl.previousElementSibling;
      if (stale && stale.classList?.contains('batch-row')) stale.remove();
      return;
    }

    let row = listEl.previousElementSibling;
    const isRow = row && row.classList?.contains('batch-row');
    if (!isRow){
      row = document.createElement('div');
      row.className = 'batch-row';
      listEl.parentElement.insertBefore(row, listEl);
    }
    const opts = (supportsBatch() ? (cfg.getBatchOptions(state) || [1]) : [1]);
    const choice = supportsBatch() ? cfg.getBatchChoice(state) : 1;
    const busy = isBusy();
    row.innerHTML = `
      <span class="muted">Batch:</span>
      ${opts.map(v=>{
        const label = (v === 'X') ? 'Max' : v;
        const active = (v === choice) ? 'active' : '';
        return `<button class="batch-btn ${active}" data-batch="${v}" ${busy?'disabled':''}>${label}</button>`;
      }).join('')}
    `;
  }

  on(document, 'click', '.batch-row .batch-btn', (e, btn)=>{
    if (!supportsBatch()) return;
    const v = btn.getAttribute('data-batch');
    const val = (v === 'X') ? 'X' : parseInt(v,10);
    cfg.setBatchChoice(state, val);
    saveNow();
    render();
  });

  /* ---------- crafting many (time-queued) ---------- */
  function craftMany(id, count, onDone){
    const doOne = ()=>{
      if (!cfg.canMake(state, id)) { onDone?.(); render(); return; }
      const ok = cfg.start(state, id, ()=>{
        const res = cfg.finish(state, id);
        if (res){
          const txt = `Crafted ${res.name || res.id} → ${res.xpGains.map(g=>`+${g.amount} ${g.skill} xp`).join(', ') || '+0 xp'}`;
          cfg.pushLog(txt);
          renderInventory(); renderEnchanting(); renderSkills();
        }
        saveNow();
        if (count === 'X'){
          if (cfg.maxMake(state, id) > 0) requestAnimationFrame(doOne);
          else { onDone?.(); render(); }
        } else {
          count -= 1;
          if (count > 0) requestAnimationFrame(doOne);
          else { onDone?.(); render(); }
        }
      });
      if (ok && labelEl) labelEl.textContent = (getAllMap()?.[id]?.name || id);
      render();
    };
    doOne();
  }

  // helper to compute count respecting optional batching
  function computeCount(){
    if (!supportsBatch()) return 1;
    const choice = cfg.getBatchChoice(state);
    return (choice === 'X') ? 'X' : Math.max(1, choice|0);
  }

  /* ---------- selector state helpers ---------- */
  function selectorKey(groupId){ return `${cfg.actionType}:${groupId}`; }
  function getSelectorChoice(groupId, variants, initialChoice){
    state.ui = state.ui || {};
    state.ui.recipeSelectors = state.ui.recipeSelectors || {};
    let choice = state.ui.recipeSelectors[selectorKey(groupId)];
    if (!choice || !variants.some(v => v.id === choice)){
      choice = initialChoice ? initialChoice(variants, H) : variants[0]?.id;
      state.ui.recipeSelectors[selectorKey(groupId)] = choice;
      saveNow();
    }
    return choice;
  }
  function setSelectorChoice(groupId, id){
    state.ui = state.ui || {};
    state.ui.recipeSelectors = state.ui.recipeSelectors || {};
    state.ui.recipeSelectors[selectorKey(groupId)] = id;
    saveNow();
  }

  /* ---------- render ---------- */
  function render(){
    if (!listEl) return;

    // Label + global bar (legacy)
    if (labelEl){
      if (!isBusy()) labelEl.textContent = 'Idle';
      else           labelEl.textContent = state.action.label || 'Working…';
    }
    if (barEl && !isBusy()) barEl.style.width = '0%';

    renderBatchRow();

    const map = getAllMap();
    const arr = asArray(map);

    // Split into selector groups and normal recipes
    const groups = (cfg.selectorGroups || []).map(g=>{
      const vs = arr.filter(g.include);
      if (typeof g.sort === 'function') vs.sort(g.sort);
      return { ...g, variants: vs };
    });

    // IDs used by selectors (not rendered as individual cards)
    const selectorIds = new Set();
    for (const g of groups) for (const v of g.variants) selectorIds.add(v.id);

    const normals = arr
      .filter(r => !selectorIds.has(r.id))
      .sort((a,b)=> (a.level||1)-(b.level||1) || String(a.name||a.id).localeCompare(String(b.name||b.id)));

    const active = activeId();
    const pct    = Math.round(progressPct()*100);
    const busy   = isBusy();

    // Build HTML
    let html = '';

    // Render selector groups first
    for (const g of groups){
      if (!g.variants.length) continue;
      const chosen = getSelectorChoice(g.id, g.variants, g.initialChoice);
      const chosenRec = map[chosen] || g.variants[0];
      const canChosen = cfg.canMake(state, chosen);
      const isActive  = active && g.variants.some(v => v.id === active);
      const icon      = H.iconHtml(chosenRec);
      const lvl       = chosenRec.level || 1;
      const xpBadge   = H.xpBadge(chosenRec);
      const subLine   = H.reqLine(chosenRec);

      const options = g.variants.map(v=>{
        const dis = H.optionDisabled(v.id) ? 'disabled' : '';
        const sel = v.id === chosen ? 'selected' : '';
        const label = (typeof g.optionLabel === 'function')
          ? g.optionLabel(v, H)
          : (v.name || v.id);
        return `<option value="${v.id}" ${sel} ${dis}>${label}</option>`;
      }).join('');

      html += `
        <div class="selector-card ${busy && !isActive ? 'disabled' : ''} ${isActive ? 'active' : ''}" data-group="${g.id}">
          <div class="head">
            ${icon}
            <div class="titles">
              <div class="name">${g.title || chosenRec.name || chosenRec.id}</div>
              <div class="sub">${subLine || '&nbsp;'}</div>
            </div>
            <div class="badges">
              <span class="badge level">Lv ${lvl}</span>
              ${xpBadge}
            </div>
          </div>
          ${isActive ? `<div class="progress"><div class="bar" style="width:${pct}%"></div></div>` : ''}
          <div class="selector-body">
            <label class="muted" for="sel-${g.id}">Variant</label>
            <select id="sel-${g.id}" data-group="${g.id}">${options}</select>
            <button class="btn-primary sel-craft-btn" data-group="${g.id}" ${busy ? 'disabled' : ''} ${canChosen ? '' : 'disabled'}>Craft</button>
          </div>
        </div>
      `;
    }

    // Render normal recipe cards
    html += normals.map(r=>{
      const ok     = cfg.canMake(state, r.id);
      const dis    = busy || !ok;
      const isAct  = active === r.id;
      const lvl    = r.level || 1;
      const icon   = H.iconHtml(r);
      const reqs   = H.reqLine(r);
      return `
        <button class="recipe-card ${dis?'disabled':''} ${isAct?'active':''}"
                data-id="${r.id}" ${dis?'disabled':''}
                title="${dis && !isAct ? 'Missing materials/level or busy' : ''}">
          <div class="head">
            ${icon}
            <div class="titles">
              <div class="name">${r.name || r.id}</div>
              <div class="sub">${reqs || '&nbsp;'}</div>
            </div>
            <div class="badges">
              <span class="badge level">Lv ${lvl}</span>
              ${H.xpBadge(r)}
            </div>
          </div>
          ${isAct ? `<div class="progress"><div class="bar" style="width:${pct}%"></div></div>` : ''}
        </button>
      `;
    }).join('');

    listEl.innerHTML = html;

    if (busy) startTick();
  }

  /* ---------- interactions: selector groups ---------- */
  on(document, 'change', `${cfg.listSelector} .selector-card select`, (e, sel)=>{
    const groupId = sel?.dataset?.group; if (!groupId) return;
    const choice = sel.value;
    setSelectorChoice(groupId, choice);
    saveNow();
    render();
  });

  on(document, 'click', `${cfg.listSelector} .selector-card .sel-craft-btn`, (e, btn)=>{
    const groupId = btn?.dataset?.group; if (!groupId) return;
    const choice = (state.ui?.recipeSelectors || {})[`${cfg.actionType}:${groupId}`];
    if (!choice) return;
    if (!cfg.canMake(state, choice)) return;

    const count = computeCount();

    craftMany(choice, count, ()=>{
      saveNow();
      renderInventory(); renderEnchanting(); renderSkills();
      render();
    });

    if (labelEl) labelEl.textContent = (getAllMap()?.[choice]?.name || choice);
    render();
  });

  /* ---------- interactions: normal cards ---------- */
  on(document, 'click', `${cfg.listSelector} .recipe-card`, (e, btn)=>{
    const id = btn?.dataset?.id; if (!id) return;
    if (!cfg.canMake(state, id)) return;

    const count = computeCount();

    craftMany(id, count, ()=>{
      saveNow();
      renderInventory(); renderEnchanting(); renderSkills();
      render();
    });

    if (labelEl) labelEl.textContent = (getAllMap()?.[id]?.name || id);
    render();
  });

  /* ---------- smooth progress loop ---------- */
  let RAF = null;
  function tick(){
    RAF = null;
    if (!isBusy()) return;
    const p = Math.round(progressPct()*100);
    // active in selector card
    listEl.querySelectorAll('.selector-card.active .progress .bar').forEach(b=>{
      b.style.width = p + '%';
    });
    // active normal cards
    listEl.querySelectorAll('.recipe-card.active .progress .bar').forEach(b=>{
      b.style.width = p + '%';
    });
    RAF = requestAnimationFrame(tick);
  }
  function startTick(){
    stopTick();
    RAF = requestAnimationFrame(tick);
  }
  function stopTick(){
    if (RAF) cancelAnimationFrame(RAF);
    RAF = null;
  }

  return { render };
}
