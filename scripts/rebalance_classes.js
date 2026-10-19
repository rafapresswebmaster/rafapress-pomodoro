const fs=require('node:fs');const file='data/RPGManagerClasses.json',data=JSON.parse(fs.readFileSync(file,'utf8'));
const specs={
 barbarian:{base:{hp:4,armor:1,ward:0,dodge:12,crit:15,armorRecovery:0,damage:1},growth:{2:{armor:1},3:{crit:5},4:{armor:1,armorRecovery:1},5:{hp:1},6:{damage:1},7:{dodge:5},8:{armor:1,armorRecovery:1}}},
 knight:{base:{hp:3,armor:4,ward:0,dodge:8,crit:5,armorRecovery:1,damage:1},growth:{2:{armor:1},3:{ward:1},4:{armor:1,armorRecovery:1},5:{hp:1},6:{armor:1,damage:1},7:{dodge:4},8:{armor:1,armorRecovery:1}}},
 ranger:{base:{hp:3,armor:1,ward:1,dodge:24,crit:18,armorRecovery:0,damage:1},growth:{2:{dodge:3},3:{ward:1},4:{crit:4},5:{hp:1},6:{damage:1},7:{dodge:4},8:{ward:1}}},
 rogue:{base:{hp:3,armor:1,ward:0,dodge:32,crit:25,armorRecovery:0,damage:1},growth:{2:{dodge:3},3:{armor:1},4:{crit:5},5:{ward:1},6:{damage:1},7:{dodge:4},8:{armor:1}}},
 mage:{base:{hp:2,armor:0,ward:4,dodge:10,crit:12,armorRecovery:0,damage:1},growth:{2:{ward:1},3:{dodge:3},4:{ward:1},5:{hp:1},6:{damage:1},7:{ward:1},8:{crit:5}}},
 cleric:{base:{hp:3,armor:1,ward:3,dodge:10,crit:8,armorRecovery:0,damage:1},growth:{2:{ward:1},3:{armor:1},4:{ward:1},5:{dodge:4},6:{armorRecovery:1},7:{ward:1,damage:1},8:{armor:1}}}
};
for(const c of data.classes){const x=specs[c.id];c.combat=x.base;c.growth=x.growth;c.stats.maxHealth=x.base.hp;c.ranges.maxHealth=[x.base.hp,x.base.hp];}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
