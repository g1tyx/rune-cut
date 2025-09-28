// /ui/crafting.js
import { state, saveNow } from '../systems/state.js';
import { CRAFT_RECIPES } from '../data/crafting.js';
import { craftDurationMs, canCraft, startCraft, finishCraft, craftOnce, craftGateReason, maxCraftable } from '../systems/crafting.js';
import { initRecipePanel } from './recipe_ui.js';
import { pushCraftLog } from './logs.js';
import { craftBatchOptions } from '../data/construction.js';

const panel = initRecipePanel({
  actionType: 'craft',
  listSelector:  '#craftList',
  barSelector:   '#craftBar',
  labelSelector: '#craftLabel',

  getAll: ()=> CRAFT_RECIPES,

  canMake: (s, id)=> canCraft(s, id, 1),
  maxMake: (s, id)=> maxCraftable(s, id),

  start: (s, id, cb)=> startCraft(s, id, cb),
  finish: (s, id)=> finishCraft(s, id),

  pushLog: (txt)=> pushCraftLog(txt),

  getBatchOptions: (s)=> craftBatchOptions(s),
  getBatchChoice:  (s)=>{
    const opts = craftBatchOptions(s);
    const def = opts[0] || 1;
    const v = s.ui?.craftBatch;
    return (v == null || !opts.includes(v)) ? def : v;
  },
  setBatchChoice:  (s, v)=>{
    s.ui = s.ui || {};
    s.ui.craftBatch = v;
    saveNow();
  },

  /* ---------- selector groups (example: Pages) ---------- */
  selectorGroups: [{
    id: 'pages',
    title: 'Pages',
    include: (r)=> r.id && r.id.startsWith('pages_from_'),
    // Nice label: "Oak Log (×N) — yields Y"
    optionLabel: (r, H)=>{
      const inId = H.firstInputId(r);
      const have = inId ? H.invCount(inId) : 0;
      const yieldQty = H.outputQty(r);
      return `${H.itemName(inId)} ${have>0?`(×${have})`:''} — yields ${yieldQty}`;
    },
    // Prefer currently owned log with highest yield
    initialChoice: (variants, H)=>{
      const scored = variants.map(v=>{
        const inId = H.firstInputId(v);
        const have = H.invCount(inId);
        const y    = H.outputQty(v);
        return { id:v.id, have, y };
      });
      // prioritize have>0 then by yield desc, else just by yield desc
      scored.sort((a,b)=> (b.have>0)-(a.have>0) || b.y - a.y);
      return scored[0]?.id || variants[0]?.id;
    },
    // sort list by yield asc for readability
    sort: (a,b)=> (a.outputs?.[0]?.qty||0) - (b.outputs?.[0]?.qty||0),
  }]
});

export function renderCrafting(){
  panel.render();
}
