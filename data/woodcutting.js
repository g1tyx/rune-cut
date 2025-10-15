//data/woodcutting.js

export const TREES = [
  { id:'oak',       name:'Oak',       level:1,  baseTime:3000, xp:12,  drop:'log_oak' },
  { id:'pine',      name:'Pine',      level:5,  baseTime:3800, xp:20,  drop:'log_pine' },
  { id:'birch',     name:'Birch',     level:15, baseTime:4500, xp:40,  drop:'log_birch',
    bonusDrops: [{ id:'birch_resin',  chance:0.13, qty:1 }] 
  },
  { id:'cedar',     name:'Cedar',     level:25, baseTime:5100, xp:62,  drop:'log_cedar',
    bonusDrops: [{ id:'cedar_resin',  chance:0.12, qty:[1,2] }] 
  },
  { id:'willow',    name:'Willow',    level:35, baseTime:5800, xp:100, drop:'log_willow', 
    bonusDrops: [{ id:'willow_resin',  chance:0.12, qty:[1,2] }]
  },
  { id:'maple',     name:'Maple',     level:45, baseTime:6500, xp:150, drop:'log_maple' },
  { id:'yew',       name:'Yew',       level:60, baseTime:7900, xp:250, drop:'log_yew' },
  { id:'runewood',  name:'Runewood',  level:70, baseTime:9000, xp:350, drop:'log_runewood' },
  { id:'elderwood', name:'Elderwood', level:80, baseTime:10000,xp:500, drop:'log_elderwood' }
];
