from pathlib import Path
import sys,json
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'scripts'))
from art_silhouettes import components,extract
checks=0
for cls in ['barbarian','knight','cleric','rogue','ranger','mage']:
 path=root/f'img/quest-followup-source/{cls}_opposite.webp';original=np.array(Image.open(path));mask=original[:,:,3]>=96;h,w=mask.shape
 assert not mask[0].any() and not mask[-1].any() and not mask[:,0].any() and not mask[:,-1].any(),(cls,'clipped source border')
 groups=[g for g in components(mask) if sum(b-a for a,b,y in g)>1200];assert len(groups)==16,(cls,len(groups));images,bounds=extract(path,4,4);bounds={(b['row'],b['column']):b['bounds'] for b in bounds}
 for g in groups:
  area=sum(b-a for a,b,y in g);cx=sum((a+b)*.5*(b-a) for a,b,y in g)/area;cy=sum(y*(b-a) for a,b,y in g)/area;cell=int(cy/h*4),int(cx/w*4);x0,y0,x1,y1=bounds[cell];expected=np.zeros((y1-y0,x1-x0),dtype=bool)
  for a,b,y in g:assert x0<=a<b<=x1 and y0<=y<y1;expected[y-y0,a-x0:b-x0]=True
  assert np.array_equal(np.array(images[cell])[:,:,3]>=96,expected),(cls,cell,'neighbor or clipped silhouette');checks+=1
result={'result':'PASS','completeOpposingContactSilhouettes':checks,'classes':6,'sourceBorderClips':0};(root/'tests/quest-followup-art.json').write_text(json.dumps(result,indent=2));print(result)
