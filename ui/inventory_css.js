export function ensureInventoryCss(){
  if (!document.getElementById('invEquipCSS')){
    const css = document.createElement('style');
    css.id = 'invEquipCSS';
    css.textContent = `
      #inventory .icon-img.glow, #inventory .icon-sprite.glow{
        filter: drop-shadow(0 0 6px rgba(147, 160, 160, 0.85)) drop-shadow(0 0 16px rgba(116,255,255,.45));
      }
      #inventory .inv-slot{ position:relative; }
      #inventory .inv-slot .equip-quick, #inventory .inv-slot .use-btn{
        position:absolute; left:4px; bottom:4px; z-index:2; font-size:11px; padding:2px 6px; line-height:14px;
        opacity:0; pointer-events:none; transition:opacity .15s ease;
      }
      #inventory .inv-slot:hover .equip-quick, #inventory .inv-slot:hover .use-btn{ opacity:1; pointer-events:auto; }
      #inventory .inv-slot .sell-btn{ position:absolute; right:4px; bottom:4px; z-index:2; }
      #inventory .inv-slot.pulse{ animation: inv-pulse 220ms ease-out; }
      @keyframes inv-pulse { 0% { transform: scale(1); } 50% { transform: scale(0.97); } 100% { transform: scale(1); } }
      #inv-sort-btn{
        margin-left:8px; padding:6px 10px; line-height:1; border-radius:10px;
        background:#1b2a6b; color:#eaf2ff; border:1px solid rgba(255,255,255,.12);
        box-shadow: 0 6px 14px rgba(59,130,246,.25), inset 0 1px 0 rgba(255,255,255,.15);
        font-weight:700; cursor:pointer;
      }
      #inv-sort-btn:hover{ filter:brightness(1.15); }
      #inv-sort-btn.active{ background:#1b2333; border:1px solid rgba(255,255,255,.2); }
      .inv-title-host{ position:relative; }
      .inv-title-host .inv-sort-anchor{ position:absolute; right:0; top:50%; transform:translateY(-50%); }

      .inv-filter-bar{ display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 10px; }
      .inv-filter-pill{ padding:6px 10px; border-radius:999px; border:1px solid rgba(0,0,0,.12); background:#918c8c; cursor:pointer; font-weight:600; }
      .inv-filter-pill.active{ background:#1b2a6b; color:#eaf2ff; border-color:rgba(255,255,255,.2); }
    `;
    document.head.appendChild(css);
  }
  if (!document.getElementById('inv-dnd-css')){
    const css = document.createElement('style');
    css.id = 'inv-dnd-css';
    css.textContent = `
      #inventory .inv-slot.dragging{ opacity:.6; }
      #inventory .inv-slot.drag-over{ outline:2px dashed #64748b; outline-offset:2px; border-radius:8px; }
    `;
    document.head.appendChild(css);
  }
}
