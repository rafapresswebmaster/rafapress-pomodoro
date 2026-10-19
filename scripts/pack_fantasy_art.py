"""Pack generated silhouettes into padded runtime atlases, without repainting."""
from pathlib import Path
from PIL import Image, ImageOps
from art_silhouettes import extract_grid,components
import numpy as np
import argparse, shutil, json
ROOT=Path(__file__).resolve().parents[1]
def fit(im,size=64,pad=5):
 ratio=min((size-pad*2)/im.width,(size-pad*2)/im.height)
 out=Image.new('RGBA',(size,size));im=im.resize((max(1,round(im.width*ratio)),max(1,round(im.height*ratio))),Image.Resampling.LANCZOS)
 out.alpha_composite(im,((size-im.width)//2,size-pad-im.height));return out
parser=argparse.ArgumentParser();parser.add_argument('kind',choices=['enemies','female']);parser.add_argument('source');a=parser.parse_args()
source=ROOT/'img/fantasy-source';source.mkdir(exist_ok=True);target=source/(a.kind+'.webp');shutil.copy2(a.source,target)
if a.kind=='enemies':
 # Creature wings and weapons extend across nominal grid edges. Extract whole
 # connected silhouettes globally before placing them in padded runtime cells.
 pixels=np.array(Image.open(target).convert('RGBA'));h,w=pixels.shape[:2];poses={};bounds=[]
 groups=[g for g in components(pixels[:,:,3]>=96) if sum(b-a for a,b,y in g)>1200]
 assert len(groups)==20,len(groups)
 for group in groups:
  mass=sum(b-a for a,b,y in group);cx=sum((a+b)*.5*(b-a) for a,b,y in group)/mass;cy=sum(y*(b-a) for a,b,y in group)/mass
  row=min(3,int(cy/h*4));col=min(4,int(cx/w*5));assert (row,col) not in poses
  left=min(a for a,b,y in group);right=max(b for a,b,y in group);top=min(y for a,b,y in group);bottom=max(y for a,b,y in group)+1
  box=np.zeros((bottom-top,right-left,4),dtype='uint8')
  for start,end,y in group:box[y-top,start-left:end-left]=pixels[y,start:end]
  poses[row,col]=Image.fromarray(box);bounds.append(dict(row=row,column=col,bounds=[left,top,right,bottom]))
 atlas=Image.new('RGBA',(5*256,4*256))
 for (row,col),im in poses.items():atlas.alpha_composite(fit(im,256,16),(col*256,row*256))
 for folder in ['pictures','faces']:atlas.save(ROOT/f'img/{folder}/RPGFantasyEnemies_v6.webp')
else:
 poses,bounds=extract_grid(target,6,6);faces=Image.new('RGBA',(864,144))
 for ci,cls in enumerate(['barbarian','knight','cleric','rogue','ranger','mage']):
  walk=Image.new('RGBA',(192,256));sv=Image.new('RGBA',(576,384))
  # A common scale keeps the body and feet stable across every upright frame.
  scale=min(54/max(poses[ci,j].width for j in range(5)),54/max(poses[ci,j].height for j in range(5)))
  def frame(im):
   out=Image.new('RGBA',(64,64));im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS);out.alpha_composite(im,((64-im.width)//2,59-im.height));return out
  for direction in range(4):
   for pattern in range(3):
    im=poses[ci,0 if direction==0 else 2 if direction==3 else [3,1,4][pattern]]
    if direction==2:im=ImageOps.mirror(im)
    walk.alpha_composite(frame(im),(pattern*64,direction*64))
  for motion in range(18):
   for pattern in range(3):sv.alpha_composite(fit(poses[ci,5]) if motion==17 else frame(poses[ci,1]),((motion//6*3+pattern)*64,motion%6*64))
  walk.save(ROOT/f'img/characters/$RPGSkeleton_{cls}_female_v6.webp');sv.save(ROOT/f'img/sv_actors/RPGSkeleton_{cls}_female_v6.webp')
  im=poses[ci,0];head=im.crop((0,0,im.width,round(im.height*.66)));faces.alpha_composite(fit(head,144,8),(ci*144,0))
 faces.save(ROOT/'img/faces/RPGSkeletons_female_v6.webp')
(ROOT/f'docs/Fantasy_{a.kind}_Art_Bounds.json').write_text(json.dumps(bounds,indent=2),encoding='utf-8')
print('Packed',a.kind)
