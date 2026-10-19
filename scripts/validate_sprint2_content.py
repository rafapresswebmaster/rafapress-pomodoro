from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
read=lambda f:json.loads((ROOT/'data'/f).read_text(encoding='utf-8'))
names=read('RPGManagerIdentity.json')['names'];classes={c['id'] for c in read('RPGManagerClasses.json')['classes']}
assert set(names)==classes
seen=set()
for c,pairs in names.items():
 assert set(pairs)=={'male','female'}
 for sex,pool in pairs.items():
  assert len(pool)>=10 and len(pool)==len(set(pool))
  for n in pool:
   assert isinstance(n,str) and n.strip()==n and n.isalpha() and n.casefold() not in seen,(c,sex,n)
   seen.add(n.casefold())
narrative=read('RPGManagerNarratives.json');quests=read('RPGManagerStage3.json')['quests'];assert set(narrative['quests'])=={q['id'] for q in quests}
texts=set()
for id,pool in narrative['quests'].items():
 assert len(pool)>=20
 for n in pool:
  assert n['context'] in {'travel','return','aftermath'} and 8<=len(n['text'])<=180 and n['text'] not in texts,(id,n)
  texts.add(n['text'])
assert len(narrative['shared'])>=20
for n in narrative['shared']:
 assert n['text'] not in texts;texts.add(n['text'])
for q in quests:
 assert (ROOT/'img'/q.get('battlebackFolder','battlebacks1')/(q['battleback']+'.webp')).is_file(),q['id']
print(f'PASS: {len(seen)} exclusive names, {len(names)*2} categories, {len(texts)} unique notes, {len(quests)} valid quest backgrounds.')
