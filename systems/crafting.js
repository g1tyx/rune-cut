// systems/crafting.js
import { CRAFT_RECIPES } from '../data/crafting.js';
import { addItem, removeItem } from './inventory.js';
import { buildXpTable, levelFromXp } from './xp.js';

const XP = buildXpTable();
const clampMs = (ms)=> Math.max(300, ms);

// ---- helpers ----
function levelOf(state, skill){
  if(skill==='wc')    return levelFromXp(state.wcXp||0, XP);
  if(skill==='fish')  return levelFromXp(state.fishXp||0, XP);
  if(skill==='min')   return levelFromXp(state.minXp||0, XP);
  if(skill==='smith') return levelFromXp(state.smithXp||0, XP);
  if(skill==='craft') return levelFromXp(state.craftXp||0, XP);
  return 1;
}
function speedMult(state, recipe){
  if(!recipe?.speedSkill) return 1;
  const lvl = levelOf(state, recipe.speedSkill);
  return 1 + 0.03*(lvl-1); // +3%/level
}
function resolveId(recipeOrId){
  if (!recipeOrId) return null;
  if (typeof recipeOrId === 'string') return recipeOrId;
  if (recipeOrId.id) return recipeOrId.id;
  return null;
}
function getRec(id){
  const r = CRAFT_RECIPES[id];
  if (!r) return null;
  return { id, name: r.name || id, ...r };
}
function awardXp(state, r){
  if(!r?.xp?.skill || !r?.xp?.amount) return;
  const amt = r.xp.amount;
  if(r.xp.skill==='craft') state.craftXp = (state.craftXp||0) + amt;
  else if(r.xp.skill==='wc')    state.wcXp    = (state.wcXp||0)    + amt;
  else if(r.xp.skill==='fish')  state.fishXp  = (state.fishXp||0)  + amt;
  else if(r.xp.skill==='min')   state.minXp   = (state.minXp||0)   + amt;
  else if(r.xp.skill==='smith') state.smithXp = (state.smithXp||0) + amt;
}

// Which skill gates the recipe's required level? Default to 'craft'.
function gateSkillFor(r){ return r.reqSkill || 'craft'; }
function meetsLevel(state, r){
  const needed = r.level || 1;
  const have = levelOf(state, gateSkillFor(r));
  return have >= needed;
}

// ---- core checks (UI-friendly) ----
export function canCraft(state, recipeOrId, times=1){
  const id = resolveId(recipeOrId);
  const r = getRec(id); if(!r) return false;

  if (!meetsLevel(state, r)) return false; // level gate

  const needTimes = Math.max(1, times|0);
  return (r.inputs||[]).every(inp => (state.inventory[inp.id]||0) >= inp.qty * needTimes);
}

export function maxCraftable(state, recipeOrId){
  const id = resolveId(recipeOrId);
  const r = getRec(id); if(!r || !r.inputs?.length) return 0;
  if (!meetsLevel(state, r)) return 0; // under-leveled
  return Math.min(...r.inputs.map(inp => Math.floor((state.inventory[inp.id]||0)/inp.qty)));
}

// ---- callback-style single craft (used by /ui/crafting.js) ----
export function startCraft(state, recipeOrId, onDone){
  //if (state.action) return false;
  const id = resolveId(recipeOrId);
  const r = getRec(id); if(!r) return false;
  if (!canCraft(state, id, 1)) return false;

  const dur = clampMs((r.time || 1000) / speedMult(state, r));
  const now = performance.now();

  state.action = {
    type: 'craft',
    label: `Craft ${r.name}`,
    startedAt: now,
    endsAt: now + dur,
    duration: dur,
    key: id
  };

  // ✅ Schedule completion so the bar resets and inventory/xp apply
  setTimeout(()=>{
    if (state.action?.type === 'craft' && state.action?.key === id){
      onDone?.();
    }
  }, dur);

  return true;
}

export function finishCraft(state, recipeOrId){
  const id = resolveId(recipeOrId) || state.action?.key;
  const r = getRec(id); if(!r){ state.action = null; return null; }
  if (!canCraft(state, id, 1)){ state.action = null; return null; }

  (r.inputs || []).forEach(inp => removeItem(state, inp.id, inp.qty));
  (r.outputs|| []).forEach(out => addItem(state, out.id, out.qty));
  awardXp(state, r);

  state.action = null;
  return { id, name: r.name };
}

// ---- legacy queue-style API (kept for compatibility) ----
export function startCraftQueued(state, id, count=1){
  //if(state.action) return false;
  const r = getRec(id); if(!r) return false;
  if(!canCraft(state, id, 1)) return false;

  const dur = clampMs((r.time || 1000) / speedMult(state, r));
  state.action = {
    type:'craft', key:id,
    startedAt: performance.now(),
    endsAt: performance.now()+dur,
    duration: dur,
    queue: Math.max(1, count|0)
  };
  return true;
}

export function finishOneCraft(state){
  const key = state.action?.key; if(!key) return null;
  const r = getRec(key); if(!r) return null;
  if(!canCraft(state, key, 1)) return null;

  (r.inputs||[]).forEach(inp => removeItem(state, inp.id, inp.qty));
  (r.outputs||[]).forEach(out => addItem(state, out.id, out.qty));
  awardXp(state, r);

  return { id:key, name:r.name };
}
