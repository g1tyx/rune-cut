// /ui/mining.js
import { listRocks, canMine } from '../systems/mining.js';
import { initGatheringPanel } from './skill_ui.js';
import { state } from '../systems/state.js';

const panel = initGatheringPanel({
  skillId: 'mining',
  actionType: 'mine',
  getList: (s)=> listRocks(s),
  canUse: (s, tOrId)=> {
    const list = listRocks(s) || [];
    const t = typeof tOrId === 'string' ? list.find(x=>x.id===tOrId) : tOrId;
    return !!t && canMine({ ...s, action:null }, t);
  },
  getSelectedId: ()=> state.selectedRockId,
  setSelectedId: (id)=> { state.selectedRockId = id; },
  selectSelector: '#rockSelect',
  startBtnSelector: '#mineBtn',
  stopBtnSelector:  '#mineStopBtn, .mine-stop-btn',
  barSelector: '#mineBar',
  labelSelector: '#mineLabel',
  logChannel: 'mining',
  autoLabel: 'Auto-mining…',
  verbPast: 'Mined',
  essenceId: 'rock_essence'
});

export function renderMining(){
  panel.render();
}
