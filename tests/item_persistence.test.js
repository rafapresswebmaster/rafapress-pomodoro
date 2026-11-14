const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../js/plugins/RPGManagerProgression.js');
const roster=require('../data/RPGManagerRoster.json');
const fresh=()=>{const s=P.createState(roster,()=>0);s.gold=10000;return s};

test('every current equipment item purchases, equips, saves, loads and unequips without loss',()=>{
  for(const id of P.armorGearIds()){
    const s=fresh(),item=P.SHOP[id],npc=s.roster.find(n=>P.compatible(n,id))||s.roster[0];npc.classId=item.classes[0];P.ensureLife(npc);
    assert.equal(P.purchase(s,id).ok,true,id+' purchase');
    assert.equal(s.equipmentStock[id],1,id+' stock after purchase');
    assert.equal(P.equipSlot(s,npc.id,id,item.slot).ok,true,id+' equip');
    assert.equal(s.equipmentStock[id],0,id+' stock while equipped');
    const loaded=JSON.parse(JSON.stringify(s));P.upgradeState(loaded);
    const copy=loaded.roster.find(n=>n.id===npc.id);
    assert.equal(copy.equipmentSlots[item.slot],id,id+' equipped after load');
    assert.equal(P.equipSlot(loaded,copy.id,null,item.slot).ok,true,id+' unequip');
    assert.equal(loaded.equipmentStock[id],1,id+' stock after unequip');
  }
});

test('missing or corrupt inventory keys are normalized before purchase',()=>{
  const s=fresh();delete s.equipmentStock.chainmail;
  assert.equal(P.purchase(s,'chainmail').ok,true);assert.equal(s.equipmentStock.chainmail,1);
  s.equipmentStock.iron_shield=NaN;assert.equal(P.purchase(s,'iron_shield').ok,true);assert.equal(s.equipmentStock.iron_shield,1);
});

test('schema 20 null stock corruption recovers purchased equipment',()=>{const s=fresh();s.version=20;s.equipmentStock.chainmail=null;P.upgradeState(s);assert.equal(s.equipmentStock.chainmail,1);assert.match(s.recoveryNotice,/Recovered 1 equipment item/);});

test('swap and death return gear once; dismissal requires confirmation',()=>{
  const s=fresh(),a=s.roster[0],b=s.roster[1];
  for(const id of ['great_helm','plate_armor','iron_shield','reinforced_cloak']){P.purchase(s,id);P.equipSlot(s,a.id,id,P.SHOP[id].slot);}
  P.purchase(s,'leather_cap');assert.equal(P.equipSlot(s,a.id,'leather_cap','head').ok,true);assert.equal(s.equipmentStock.great_helm,1);
  P.killAdventurer(s,a.id,{reason:'test'});P.killAdventurer(s,a.id,{reason:'duplicate'});
  for(const id of ['leather_cap','plate_armor','iron_shield','reinforced_cloak'])assert.equal(s.equipmentStock[id],1,id);
  P.purchase(s,'padded_vest');P.equipSlot(s,b.id,'padded_vest','body');assert.equal(P.dismissAdventurer(s,b.id).ok,false);assert.equal(b.equipmentSlots.body,'padded_vest');assert.equal(s.equipmentStock.padded_vest,0);
});

test('legacy non-slot items cannot be purchased from the current shop',()=>{
  const s=fresh();assert.match(P.purchaseError(s,'blade'),/legacy/i);assert.ok(!P.shopIds().includes('blade'));assert.ok(!P.shopIds().includes('guard'));
});
