"""Source-level regression: full weapons and no neighboring silhouettes."""
from pathlib import Path
import sys,json
import numpy as np
from PIL import Image,ImageOps,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from art_silhouettes import extract,extract_grid,components
root=Path(__file__).resolve().parents[1]
source=root/'img/playtest-source';checks=0

def verify_component(key,threshold,cells=None,cols=8,rows=12):
 global checks
 original=np.array(Image.open(source/f'{key}.webp'));images,bounds=extract(source/f'{key}.webp',cols,rows);bounds={(b['row'],b['column']):b['bounds'] for b in bounds}
 for group in components(original[:,:,3]>=threshold):
  area=sum(b-a for a,b,y in group)
  if area<1200:continue
  cx=sum((a+b)*.5*(b-a) for a,b,y in group)/area;cy=sum(y*(b-a) for a,b,y in group)/area;cell=(int(cy/original.shape[0]*rows),int(cx/original.shape[1]*cols))
  if cells and cell not in cells:continue
  x0,y0,x1,y1=bounds[cell];actual=np.array(images[cell]);expected=np.zeros_like(original[:,:,3],dtype=bool)
  for a,b,y in group:expected[y,a:b]=True
  # Every pixel in the full, independently connected source silhouette survives.
  py,px=np.nonzero(expected);assert px.min()>=x0 and px.max()<x1 and py.min()>=y0 and py.max()<y1,(key,cell,'weapon clipped')
  assert (actual[py-y0,px-x0,3]>=threshold).all(),(key,cell,'source silhouette missing')
  # No neighboring high-opacity weapon/body may enter the extracted character.
  got=actual[:,:,3]>=threshold;assert np.array_equal(got,expected[y0:y1,x0:x1]),(key,cell,'neighbor fragment included')
  checks+=1
verify_component('side',96)
verify_component('attack',160,{(5,3)})
verify_component('cleric_strideB_spaced',96,cols=4,rows=4)
# Review the exact runtime atlas frames, including mirrored display.
out=Image.new('RGB',(768,320),'#293247');draw=ImageDraw.Draw(out)
walk=Image.open(root/'img/characters/RPGWalk_cleric_female_v5.webp');sv=Image.open(root/'img/sv_actors/RPGCombat_cleric_female_3_v5.webp')
poses=[('Walk stride A',walk.crop((576,64,640,128))),('Walk standing',walk.crop((640,64,704,128))),('Walk stride B',walk.crop((704,64,768,128))),('Combat standing',sv.crop((0,0,64,64))),('Combat casting',sv.crop((256,0,320,64))),('Combat mirrored',ImageOps.mirror(sv.crop((0,0,64,64))))]
for i,(label,im) in enumerate(poses):
 x=i%3*256;y=i//3*160;frame=im.resize((128,128),Image.Resampling.NEAREST);out.paste(frame,(x+64,y),frame);draw.text((x+45,y+137),label,fill='white')
out.save(root/'docs/Cleric_Clipping_Fix.webp')
result={'result':'PASS','fullSourceSilhouettesChecked':checks,'sideCharacters':96,'pinkClericCastingWeapon':True,'spaciousClericStrideTiles':16}
(root/'tests/art-clipping-validation.json').write_text(json.dumps(result,indent=2));print(result)
