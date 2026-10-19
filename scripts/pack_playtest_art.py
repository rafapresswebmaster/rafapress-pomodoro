"""Extract complete connected character silhouettes, then pack padded MZ frames.

Generated bitmap artwork is retained unchanged. This is deterministic atlas assembly.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFilter
import numpy as np,json,hashlib,shutil
from art_silhouettes import extract, extract_grid, components
root=Path(__file__).resolve().parents[1];sources=root/'img/playtest-source';sources.mkdir(exist_ok=True)
generated=Path(r'C:\Users\rafae\.codex\generated_images\01a14645-6612-7f73-a0c3-252f036916de')
new={'cleric_strideB_spaced':'exec-d9226bd3-1404-4e60-8186-d01e467f0e02.webp','strideA':'exec-ef7166f5-3eae-4abd-a82b-a89397c1785d.webp','strideB':'exec-435550e3-41d9-4050-8d81-4a4b146d7b07.webp','fallen':'exec-fc861b32-147c-4318-83b2-1bb39942989b.webp','skeleton':'exec-e950daae-a6cd-4356-a55d-1d50d4d8849c.webp'}
for key,name in new.items():
 if (generated/name).is_file():shutil.copy2(generated/name,sources/f'{key}.webp')
for key in ['front','side','rear','attack']:
 shutil.copy2(root/f'img/sprint-source/{key}.webp',sources/f'{key}.webp')
views={};inventory={}
for key in ['front','side','rear','attack','strideA','strideB','fallen','skeleton']:
 views[key],inventory[key]=extract(sources/f'{key}.webp',6 if key=='skeleton' else 8,6 if key=='skeleton' else 12)
# The original second-stride clerics physically overlap their neighbors' staffs.
# Use the spacious repaired source; keep all identity keys and other poses intact.
clericStride,inventory['clericStrideBSpaced']=extract(sources/'cleric_strideB_spaced.webp',4,4)
for variant in range(16):
 cell=(4+variant//8,variant%8);pose=clericStride[variant//4,variant%4];height=views['strideA'][cell].height
 views['strideB'][cell]=pose.resize((round(pose.width*height/pose.height),height),Image.Resampling.NEAREST)

# Opposing contact poses, isolated in spacious class-specific source sheets.
for ci,cls in enumerate(['barbarian','knight','cleric','rogue','ranger','mage']):
 poses,inventory[f'{cls}Opposite']=extract(root/f'img/quest-followup-source/{cls}_opposite.webp',4,4)
 for variant in range(16):
  cell=(ci*2+variant//8,variant%8);pose=poses[variant//4,variant%4];height=views['strideA'][cell].height
  views['strideB'][cell]=pose.resize((round(pose.width*height/pose.height),height),Image.Resampling.NEAREST)

def head_axis(im):
 # Anchor the largest opaque head/hair cluster rather than the weapon's bounds.
 mask=np.array(im)[:max(1,round(im.height*.4)),:,3]>=160
 groups=components(mask);group=max(groups,key=lambda g:sum(b-a for a,b,y in g))
 return sum((a+b)*.5*(b-a) for a,b,y in group)/sum(b-a for a,b,y in group)

def fit(im,scale=None,portrait=False,anchor=None):
 size=144 if portrait else 64;pad=8 if portrait else 5
 ratio=scale or min((size-2*pad)/im.width,(size-2*pad)/im.height)
 target=im.resize((max(1,round(im.width*ratio)),max(1,round(im.height*ratio))),Image.Resampling.NEAREST)
 canvas=Image.new('RGBA',(size,size));x=(size-target.width)//2 if anchor is None else round(anchor-head_axis(im)*ratio)
 canvas.alpha_composite(target,(x,size-pad-target.height));return canvas
classes=['barbarian','knight','cleric','rogue','ranger','mage'];catalogue=[];contact=Image.new('RGBA',(8*176,12*160),'#202940');draw=ImageDraw.Draw(contact)
for ci,cls in enumerate(classes):
 faces=Image.new('RGBA',(1152,288))
 for si,sex in enumerate(['male','female']):
  row=ci*2+si;walk=Image.new('RGBA',(768,512));fallen=Image.new('RGBA',(256,128))
  for i in range(8):
   images={key:views[key][row,i] for key in views if key!='skeleton'};front=images['front'];head=front.crop((0,0,front.width,max(1,round(front.height*.66))));portrait=fit(head,portrait=True);faces.alpha_composite(portrait,(i*144,si*144))
   scale=min(54/max(images[k].width for k in ['front','side','rear','strideA','strideB']),54/max(images[k].height for k in ['front','side','rear','strideA','strideB']))
   sideFrames=[images[k] for k in ['strideA','side','strideB']]
   # Preserve one head anchor and ground baseline across the full A/pass/B/pass cycle.
   left=max(head_axis(im) for im in sideFrames);right=max(im.width-head_axis(im) for im in sideFrames)
   scale=min(scale,54/(left+right));low=5+left*scale;high=59-right*scale;anchor=max(low,min(high,32))
   for direction in range(4):
    for pattern in range(3):
     image=images['front' if direction==0 else 'rear' if direction==3 else ['strideA','side','strideB'][pattern]]
     if direction==2:image=ImageOps.mirror(image)
     walk.alpha_composite(fit(image,scale,anchor=(64-anchor if direction==2 else anchor) if direction in [1,2] else None),(((i%4)*3+pattern)*64,((i//4)*4+direction)*64))
   fallenFrame=fit(images['fallen']);fallen.alpha_composite(fallenFrame,(i%4*64,i//4*64))
   sv=Image.new('RGBA',(576,384));combatScale=min(54/max(images[k].width for k in ['side','attack']),54/max(images[k].height for k in ['side','attack']))
   for motion in range(18):
    for pattern in range(3):
     frame=fallenFrame if motion==17 else fit(images['attack' if motion in [6,7,8,9,10,11,12,13] and pattern==1 else 'side'],combatScale)
     sv.alpha_composite(frame,((motion//6*3+pattern)*64,motion%6*64))
   combat=f'RPGCombat_{cls}_{sex}_{i}_v5';sv.save(root/f'img/sv_actors/{combat}.webp')
   key=f'{cls}:{sex}:'+('default' if i==0 else f'v2:{i-1}' if i<4 else f'v4:{i}')
   catalogue.append({'key':key,'classId':cls,'sex':sex,'portrait':{'sheet':f'RPGPortrait_{cls}_v5','index':i+si*8,'columns':8,'rows':2},'walking':{'sheet':f'RPGWalk_{cls}_{sex}_v5','index':i},'combat':{'sheet':combat},'fallen':{'sheet':f'RPGFallen_{cls}_{sex}_v5','index':i,'columns':4,'rows':2}})
   contact.alpha_composite(portrait.resize((80,80),Image.Resampling.NEAREST),(i*176,row*160));contact.alpha_composite(fit(images['strideA'],scale),(i*176+80,row*160));contact.alpha_composite(fit(images['strideB'],scale),(i*176+108,row*160+54));draw.text((i*176+2,row*160+139),f'{cls} {sex[0]} {i+1}',fill='white')
  walk.save(root/f'img/characters/RPGWalk_{cls}_{sex}_v5.webp');fallen.save(root/f'img/characters/RPGFallen_{cls}_{sex}_v5.webp')
 faces.save(root/f'img/faces/RPGPortrait_{cls}_v5.webp')
# Shared skeleton model per class, preserving the underlying class mechanics.
skfaces=Image.new('RGBA',(6*144,144))
for ci,cls in enumerate(classes):
 poses=[views['skeleton'][ci,i] for i in range(6)];scale=min(54/max(p.width for p in poses[:5]),54/max(p.height for p in poses[:5]));walk=Image.new('RGBA',(192,256));sv=Image.new('RGBA',(576,384))
 for direction in range(4):
  for pattern in range(3):
   im=poses[0 if direction==0 else 2 if direction==3 else [3,1,4][pattern]]
   if direction==2:im=ImageOps.mirror(im)
   walk.alpha_composite(fit(im,scale),(pattern*64,direction*64))
 for motion in range(18):
  for pattern in range(3):sv.alpha_composite(fit(poses[5]) if motion==17 else fit(poses[1],scale),((motion//6*3+pattern)*64,motion%6*64))
 walk.save(root/f'img/characters/$RPGSkeleton_{cls}_v5.webp');sv.save(root/f'img/sv_actors/RPGSkeleton_{cls}_v5.webp')
 skfaces.alpha_composite(fit(poses[0].crop((0,0,poses[0].width,round(poses[0].height*.66))),portrait=True),(ci*144,0))
skfaces.save(root/'img/faces/RPGSkeletons_v5.webp');contact.convert('RGB').save(root/'docs/Playtest_20_Art_Contact.webp')
(root/'data/RPGManagerArtV5.json').write_text(json.dumps(catalogue,indent=2),encoding='utf-8');(root/'docs/Playtest_20_Extraction_Bounds.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')
print('Packed 96 cleaned identities, actual stride A/B frames, 96 fallen poses and six skeleton class models.')
