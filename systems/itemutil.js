// systems/itemutil.js
export const baseId = (id)=> (id||'').split('@')[0];
export const qualityFrom = (id)=> {
  const part = (id||'').split('@')[1];
  const n = part ? parseInt(part,10) : null;
  return (Number.isFinite(n) && n>=1 && n<=100) ? n : null;
};

export function resolveItem(ITEMS, id){
  const base = ITEMS[baseId(id)];
  if(!base) return null;
  const q = qualityFrom(id);
  if(!q || base.type!=='equipment') return base;
  const mult = q/100;
  return {
    ...base,
    name: `${base.name} (${q}%)`,
    atk: Math.max(0, Math.round((base.atk||0)*mult)),
    str: Math.max(0, Math.round((base.str||0)*mult)),
    def: Math.max(0, Math.round((base.def||0)*mult)),
    hp:  Math.max(0, Math.round((base.hp||0)*mult)),
    sell: Math.max(0, Math.round((base.sell||0)*mult)),
    _quality:q
  };
}
