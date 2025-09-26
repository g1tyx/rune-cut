// /ui/woodcutting.js
import { listTrees, canChop } from '../systems/woodcutting.js';
import { initGatheringPanel } from './skill_ui.js';
import { state } from '../systems/state.js';

const panel = initGatheringPanel({
  skillId: 'forestry',
  actionType: 'chop',
  getList: (s)=> listTrees(s),
  canUse: (s, tOrId)=> {
    const t = typeof tOrId === 'string' ? (listTrees(s)||[]).find(x=>x.id===tOrId) : tOrId;
    return !!t && canChop({ ...s, action:null }, t);
  },
  getSelectedId: ()=> state.selectedTreeId,
  setSelectedId: (id)=> { state.selectedTreeId = id; },
  selectSelector: '#treeSelect, #wcTreeSelect',
  startBtnSelector: '#chopBtn, #wcChopBtn, .chop-btn',
  stopBtnSelector:  '#wcStopBtn, .wc-stop-btn, #stopChopBtn',
  barSelector: '#actionBar',
  labelSelector: '#actionLabel, #wcActionLabel',
  logChannel: 'wc',
  autoLabel: 'Auto-chopping…',
  verbPast: 'Chopped',
  essenceId: 'forest_essence'
});

export function renderWoodcutting(){
  panel.render();
}
