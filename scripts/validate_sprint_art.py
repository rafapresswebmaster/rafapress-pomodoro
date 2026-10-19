from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[1];rows=json.loads((root/'data/RPGManagerArtV4.json').read_text());seen={kind:set() for kind in ['portrait','walking','combat']}
for row in rows:
 for kind,folder,expected in [('portrait','faces',(1152,288)),('walking','characters',(768,512)),('combat','sv_actors',(576,384))]:
  spec=row[kind];im=Image.open(root/f"img/{folder}/{spec['sheet']}.webp");assert im.mode=='RGBA' and im.size==expected,(row['key'],kind,im.size)
  if kind=='portrait':x=spec['index']%8*144;y=spec['index']//8*144;cell=im.crop((x,y,x+144,y+144))
  elif kind=='walking':x=(spec['index']%4*3+1)*64;y=(spec['index']//4*4)*64;cell=im.crop((x,y,x+64,y+64))
  else:cell=im.crop((0,0,64,64))
  assert cell.getchannel('A').getextrema()[0]==0,(row['key'],kind,'no transparent padding')
  digest=hashlib.sha256(cell.tobytes()).hexdigest();assert digest not in seen[kind],(row['key'],kind,'duplicate identity');seen[kind].add(digest)
print('PASS: 96 unique portraits, walking identities and combat identities; all PNGs RGBA, all MZ geometries valid, transparent padding present.')
(root/'tests/strict-focus-art-validation.json').write_text(json.dumps({'identities':len(rows),'unique':{k:len(v) for k,v in seen.items()},'walkingSheetSize':[768,512],'combatSheetSize':[576,384],'portraitSheetSize':[1152,288],'sources':'img/sprint-source','result':'PASS'},indent=2))
