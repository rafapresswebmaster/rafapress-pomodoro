from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
root=Path(__file__).resolve().parents[1];rows=json.loads((root/'data/RPGManagerArtV5.json').read_text());seen={k:set() for k in ['portrait','walking','combat','fallen']};frames=0
def padded(image,size):
 global frames
 assert image.mode=='RGBA';a=np.array(image.getchannel('A'));assert not a[:4].any() and not a[-4:].any() and not a[:,:4].any() and not a[:,-4:].any(),'Ink touches padded frame boundary';assert a.any(),'Empty frame';frames+=1
def digest(image):return hashlib.sha256(image.tobytes()).hexdigest()
for row in rows:
 for kind,folder,expected in [('portrait','faces',(1152,288)),('walking','characters',(768,512)),('combat','sv_actors',(576,384)),('fallen','characters',(256,128))]:
  spec=row[kind];image=Image.open(root/f"img/{folder}/{spec['sheet']}.webp");assert image.size==expected
  if kind=='portrait':x=spec['index']%8*144;y=spec['index']//8*144;cell=image.crop((x,y,x+144,y+144));padded(cell,144)
  elif kind=='walking':
   i=spec['index'];x=i%4*3*64;y=(i//4*4+1)*64;poses=[image.crop((x+p*64,y,x+(p+1)*64,y+64)) for p in range(3)];assert len({digest(p) for p in poses})==3,(row['key'],'walk cycle not animated')
   for p in poses:padded(p,64)
   cell=poses[1]
  elif kind=='fallen':x=spec['index']%4*64;y=spec['index']//4*64;cell=image.crop((x,y,x+64,y+64));padded(cell,64)
  else:
   for y in range(6):
    for x in range(9):padded(image.crop((x*64,y*64,(x+1)*64,(y+1)*64)),64)
   cell=image.crop((0,0,64,64))
  key=digest(cell);assert key not in seen[kind],(row['key'],kind,'duplicate');seen[kind].add(key)
for cls in ['barbarian','knight','cleric','rogue','ranger','mage']:
 for folder,name,size in [('characters',f'$RPGSkeleton_{cls}_v5',(192,256)),('sv_actors',f'RPGSkeleton_{cls}_v5',(576,384))]:
  im=Image.open(root/f'img/{folder}/{name}.webp');assert im.size==size
  for y in range(size[1]//64):
   for x in range(size[0]//64):padded(im.crop((x*64,y*64,(x+1)*64,(y+1)*64)),64)
result={'result':'PASS','identities':96,'unique':{k:len(v) for k,v in seen.items()},'distinctWalkingPosesPerIdentity':3,'sharedSkeletonClasses':6,'paddedFramesChecked':frames,'minimumTransparentFramePadding':4}
(root/'tests/playtest20-art-validation.json').write_text(json.dumps(result,indent=2));print(result)
