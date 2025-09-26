// /ui/fishing.js
import { listFishingSpots, canFish } from '../systems/fishing.js';
import { initGatheringPanel } from './skill_ui.js';
import { state } from '../systems/state.js';

const panel = initGatheringPanel({
  skillId: 'fishing',
  actionType: 'fish',
  getList: (s)=> listFishingSpots(s),
  canUse: (s, tOrId)=> {
    const list = listFishingSpots(s) || [];
    const t = typeof tOrId === 'string' ? list.find(x=>x.id===tOrId) : tOrId;
    return !!t && canFish({ ...s, action:null }, t);
  },
  getSelectedId: ()=> state.selectedSpotId,
  setSelectedId: (id)=> { state.selectedSpotId = id; },
  selectSelector: '#spotSelect',
  startBtnSelector: '#fishBtn',
  stopBtnSelector:  '#fishStopBtn, .fish-stop-btn',
  barSelector: '#fishBar',
  labelSelector: '#fishLabel',
  logChannel: 'fishing',
  autoLabel: 'Auto-fishing…',
  verbPast: 'Caught',
  essenceId: 'sea_essence'
});

export function renderFishing(){
  panel.render();
}
