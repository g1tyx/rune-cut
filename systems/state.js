// /systems/state.js

const STORAGE_ACTIVE_KEY = 'runecut:active';
const STORAGE_SLOT_A     = 'runecut:save:a';
const STORAGE_SLOT_B     = 'runecut:save:b';
const SLOTS              = { a: STORAGE_SLOT_A, b: STORAGE_SLOT_B };

export const SCHEMA = 5;

export const state = {};

export function defaultState(){
  return {
    _v: SCHEMA,

    gold: 0,

    wcXp: 0, fishXp: 0, minXp: 0,
    atkXp: 0, strXp: 0, defXp: 0,
    smithXp: 0, craftXp: 0, cookXp: 0,
    enchantXp: 0, alchXp: 0,
    constructionXp: 0, royalXp: 0,
    destructionXp: 0, farmingXp: 0,

    hp: 10,

    inventory: {},
    equipment: {
      axe:null, pick:null, weapon:null, shield:null,
      head:null, body:null, legs:null, gloves:null, boots:null,
      amulet:null, ring:null, cape:null,
      food:null, foodQty:0,
      tome:null, tomeQty:0
    },
    equipmentMods: {},

    pets: {},
    ui: { activePet: null, autoCookUntil: 0, lastCookedRawId: null, invSortUse: false },

    royalFavor: 0,
    royalContract: null,
    royalHistory: [],

    unlocks: { autobattle: false, sort_inventory: false },

    action: null,

    settings: { sfx: true, music: false },
  };
}

function djb2(str){ let h=5381; for (let i=0;i<str.length;i++) h=((h<<5)+h)^str.charCodeAt(i); return (h>>>0).toString(36); }

function activeSlot(){
  const s = localStorage.getItem(STORAGE_ACTIVE_KEY);
  return (s === 'a' || s === 'b') ? s : 'a';
}
function nextSlot(s){ return s === 'a' ? 'b' : 'a'; }

function readSlot(key){
  try{
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    if (obj._checksum && obj._payload && obj._checksum !== djb2(obj._payload)) return null;
    return obj._payload ? JSON.parse(obj._payload) : obj;
  }catch{ return null; }
}

function writeSlot(key, obj){
  const payload = JSON.stringify(obj);
  const wrapped = JSON.stringify({ _ts: Date.now(), _v: SCHEMA, _payload: payload, _checksum: djb2(payload) });
  localStorage.setItem(key, wrapped);
}

function migrate(s){
  if (!s || typeof s !== 'object') return { ...defaultState() };
  let cur = { ...defaultState(), ...s };

  switch ((s._v|0)) {
    case 0:
    case 1:
      if (!cur.settings) cur.settings = {};
      if (typeof cur.settings.sfx !== 'boolean') cur.settings.sfx = true;
      if (typeof cur.settings.music !== 'boolean') cur.settings.music = false;
      cur._v = 2;
    case 2:
      cur._v = 3;
    case 3:
      cur._v = 4;
    case 4:
      cur._v = 5;
      break;
    case 5:
      break;
    default:
      break;
  }
  cur._v = SCHEMA;
  return cur;
}

function isDefaultish(s){
  if (!s) return true;
  const invEmpty = !s.inventory || Object.keys(s.inventory).length === 0;
  const gold0 = !s.gold;
  const totalXp =
    (s.wcXp|0)+(s.fishXp|0)+(s.minXp|0)+(s.atkXp|0)+(s.strXp|0)+(s.defXp|0)+
    (s.smithXp|0)+(s.craftXp|0)+(s.cookXp|0)+(s.enchantXp|0)+(s.alchXp|0)+
    (s.constructionXp|0)+(s.royalXp|0);
  return invEmpty && gold0 && totalXp === 0;
}

function recoverLegacySave(){
  const candidateKeys = [
    'runecut-save', 'runecut:save', 'runecut_save',
    'runecut', 'RuneCutSave', 'save', 'state'
  ];
  const all = Object.keys(localStorage);
  for (const k of [...candidateKeys, ...all]){
    try{
      const v = localStorage.getItem(k);
      if (!v) continue;
      let obj = null;
      try{
        const parsed = JSON.parse(v);
        obj = parsed && parsed._payload ? JSON.parse(parsed._payload) : parsed;
      }catch{ obj = null; }
      if (!obj || typeof obj !== 'object') continue;
      if ('inventory' in obj || 'gold' in obj || 'wcXp' in obj || 'craftXp' in obj || 'cookXp' in obj) {
        return obj;
      }
    }catch{}
  }
  return null;
}

let _saveTimer = null;
let _pendingNotify = false;

export function initState(){
  // normalize active marker
  const a0 = activeSlot();
  if (a0 !== 'a' && a0 !== 'b') localStorage.setItem(STORAGE_ACTIVE_KEY, 'a');

  const a = activeSlot();
  const b = nextSlot(a);

  const slotA = readSlot(SLOTS[a]);
  const slotB = readSlot(SLOTS[b]);

  let candidate = slotA ?? slotB;

  if (!candidate || isDefaultish(candidate)){
    const legacy = recoverLegacySave();
    if (legacy && !isDefaultish(legacy)) {
      candidate = legacy;
    }
  }

  const loaded = migrate(candidate || defaultState());

  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, loaded);

  saveNow();                   // stamp into rotating slots immediately
  try { window.dispatchEvent(new Event('state:loaded')); } catch {}

  scheduleSave(800);
  return state;
}

export function setState(patch, opts={}){
  const next = typeof patch === 'function' ? patch(state) : patch;
  if (next && typeof next === 'object') Object.assign(state, next);

  if (!opts.silent){
    if (!_pendingNotify){
      _pendingNotify = true;
      requestAnimationFrame(()=>{
        _pendingNotify = false;
        try { window.dispatchEvent(new Event('state:changed')); } catch {}
      });
    }
    scheduleSave();
  }
  return state;
}

export function setAt(path, value, opts={}){
  const parts = String(path||'').split('.');
  if (!parts[0]) return state;
  let cur = state;
  for (let i=0;i<parts.length-1;i++){
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length-1]] = value;
  return setState({}, opts);
}

function scheduleSave(delay=1200){
  if (_saveTimer) return;
  const run = ()=>{ _saveTimer = null; saveNow(); };
  if ('requestIdleCallback' in window){
    _saveTimer = setTimeout(()=>requestIdleCallback(run, { timeout: 1500 }), delay);
  } else {
    _saveTimer = setTimeout(run, delay);
  }
}

export function saveNow(){
  try{
    const slot = activeSlot();
    writeSlot(SLOTS[slot], { ...state, _v: SCHEMA });
    localStorage.setItem(STORAGE_ACTIVE_KEY, nextSlot(slot));
    try { window.dispatchEvent(new Event('state:saved')); } catch {}
  }catch{}
}
