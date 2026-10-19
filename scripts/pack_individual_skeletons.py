"""Pack each generated identity's seven poses into MZ runtime sheets."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
from art_silhouettes import components
import argparse,json,shutil
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('class_id');parser.add_argument('sex');parser.add_argument('source');args=parser.parse_args()
key=f'{args.class_id}_{args.sex}';stem=f'RPGSkeleton_{key}'
path=ROOT/f'img/fantasy-source/{key}_skeletons.webp'
if Path(args.source).resolve()!=path.resolve():shutil.copy2(args.source,path)
def extract_whole(path):
 pixels=np.array(Image.open(path).convert('RGBA'));threshold=252 if key=='knight_male' else 240 if key=='rogue_male' else 192
 groups=[g for g in components(pixels[:,:,3]>=threshold) if sum(b-a for a,b,y in g)>1200]
 assert len(groups)==56,(key,len(groups))
 def center(g):
  mass=sum(b-a for a,b,y in g);return (sum((a+b)*.5*(b-a) for a,b,y in g)/mass,sum(y*(b-a) for a,b,y in g)/mass)
 groups.sort(key=lambda g:center(g)[1]);ordered=[]
 for row in range(8):ordered.extend(sorted(groups[row*7:row*7+7],key=lambda g:center(g)[0]))
 labels=np.zeros(pixels.shape[:2],dtype='int16')
 for label,group in enumerate(ordered,1):
  for a,b,y in group:labels[y,a:b]=label
 # Restore attached lower-alpha details only when ownership is unambiguous.
 for alpha in [248,240,224,192,160,128,96]:
  if alpha>=threshold:continue
  for group in components(pixels[:,:,3]>=alpha):
   owners=set()
   for a,b,y in group:
    owners.update(int(v) for v in np.unique(labels[y,a:b]) if v)
    if len(owners)>1:break
   if len(owners)==1:
    owner=owners.pop()
    for a,b,y in group:labels[y,a:b]=owner
 allowed=pixels[:,:,3]>=96
 for step in range(4):
  previous=labels.copy()
  for dy,dx in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]:
   shifted=np.roll(previous,(dy,dx),(0,1))
   if dy<0:shifted[dy:]=0
   if dy>0:shifted[:dy]=0
   if dx<0:shifted[:,dx:]=0
   if dx>0:shifted[:,:dx]=0
   take=(labels==0)&allowed&(shifted>0);labels[take]=shifted[take]
 result={};bounds=[]
 for index in range(56):
  label=index+1;py,px=np.nonzero(labels==label);l,r,t,b=int(px.min()),int(px.max()+1),int(py.min()),int(py.max()+1)
  box=pixels[t:b,l:r].copy();box[labels[t:b,l:r]!=label]=0;row,col=divmod(index,7);result[row,col]=Image.fromarray(box);bounds.append(dict(row=row,column=col,bounds=[l,t,r,b],coreAlpha=threshold))
 return result,bounds
poses,bounds=extract_whole(path)
walk=Image.new('RGBA',(768,512));faces=Image.new('RGBA',(1152,144));fallen=Image.new('RGBA',(256,128));contact=Image.new('RGBA',(7*128,8*144),'#263247')
for i in range(8):
 scale=min(54/max(poses[i,j].width for j in range(6)),54/max(poses[i,j].height for j in range(6)))
 def fit(im,size=64,ratio=scale):
  out=Image.new('RGBA',(size,size));im=im.resize((max(1,round(im.width*ratio)),max(1,round(im.height*ratio))),Image.Resampling.LANCZOS);out.alpha_composite(im,((size-im.width)//2,size-5-im.height));return out
 down=poses[i,6];down=fit(down,ratio=min(54/down.width,54/down.height));fallen.alpha_composite(down,(i%4*64,i//4*64))
 front=poses[i,0];head=front.crop((0,0,front.width,round(front.height*.66)));faces.alpha_composite(fit(head,144,min(128/head.width,128/head.height)),(i*144,0))
 for direction in range(4):
  for pattern in range(3):
   pose=poses[i,0 if direction==0 else 2 if direction==3 else [3,1,4][pattern]]
   if direction==2:pose=ImageOps.mirror(pose)
   walk.alpha_composite(fit(pose),(((i%4)*3+pattern)*64,((i//4)*4+direction)*64))
 sv=Image.new('RGBA',(576,384))
 for motion in range(18):
  for pattern in range(3):
   frame=down if motion==17 else fit(poses[i,5 if motion in range(6,14) and pattern==1 else 1])
   sv.alpha_composite(frame,((motion//6*3+pattern)*64,motion%6*64))
 sv.save(ROOT/f'img/sv_actors/{stem}_{i}_v7.webp')
 for j in range(7):
  im=poses[i,j];contact.alpha_composite(fit(im,128,min(112/im.width,112/im.height)),(j*128,i*144))
 ImageDraw.Draw(contact).text((2,i*144+128),f'{key} {i+1}',fill='white')
walk.save(ROOT/f'img/characters/{stem}_walk_v7.webp');fallen.save(ROOT/f'img/characters/{stem}_fallen_v7.webp');faces.save(ROOT/f'img/faces/{stem}_faces_v7.webp')
contact.save(ROOT/f'docs/Skeleton_{key}_Contact.webp')
(ROOT/f'docs/Skeleton_{key}_Bounds.json').write_text(json.dumps(bounds,indent=2),encoding='utf-8')
print('Packed eight individual skeleton identities:',key)
