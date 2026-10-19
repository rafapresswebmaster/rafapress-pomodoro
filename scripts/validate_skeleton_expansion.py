"""Validate all 96 model assets and build an appearance review contact sheet."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
catalogue=[];board=Image.new('RGBA',(8*144,12*180),'#263247');draw=ImageDraw.Draw(board)
for ci,cls in enumerate(['barbarian','knight','cleric','rogue','ranger','mage']):
 for si,sex in enumerate(['male','female']):
  row=ci*2+si;stem=f'RPGSkeleton_{cls}_{sex}'
  faces=Image.open(ROOT/f'img/faces/{stem}_faces_v7.webp').convert('RGBA');assert faces.size==(1152,144)
  walk=Image.open(ROOT/f'img/characters/{stem}_walk_v7.webp').convert('RGBA');assert walk.size==(768,512)
  fallen=Image.open(ROOT/f'img/characters/{stem}_fallen_v7.webp').convert('RGBA');assert fallen.size==(256,128)
  unique=set()
  def cell_ok(cell,label):
   bb=cell.getbbox();assert bb,label+' empty'
   assert min(bb[:2])>=2 and bb[2]<=cell.width-2 and bb[3]<=cell.height-2,(label,bb)
  for i in range(8):
   face=faces.crop((i*144,0,(i+1)*144,144));cell_ok(face,stem+' face');unique.add(hashlib.sha256(face.tobytes()).hexdigest())
   board.alpha_composite(face,(i*144,row*180));draw.text((i*144+3,row*180+145),f'{cls} {sex}',fill='white');draw.text((i*144+3,row*180+160),f'Appearance {i+1}',fill='white')
   for direction in range(4):
    for pattern in range(3):
     x=(i%4*3+pattern)*64;y=(i//4*4+direction)*64;cell_ok(walk.crop((x,y,x+64,y+64)),stem+' walking')
   x=i%4*64;y=i//4*64;cell_ok(fallen.crop((x,y,x+64,y+64)),stem+' fallen')
   combat=f'{stem}_{i}_v7';sv=Image.open(ROOT/f'img/sv_actors/{combat}.webp').convert('RGBA');assert sv.size==(576,384)
   for y in range(6):
    for x in range(9):cell_ok(sv.crop((x*64,y*64,(x+1)*64,(y+1)*64)),combat+' combat')
   key=f'{cls}:{sex}:'+('default' if i==0 else f'v2:{i-1}' if i<4 else f'v4:{i}')
   catalogue.append(dict(key=key,classId=cls,sex=sex,portrait=dict(sheet=f'{stem}_faces_v7',index=i,columns=8,rows=1),walking=dict(sheet=f'{stem}_walk_v7',index=i),combat=dict(sheet=combat),fallen=dict(sheet=f'{stem}_fallen_v7',index=i,columns=4,rows=2)))
  assert len(unique)==8,(stem,'duplicate portraits')
board.save(ROOT/'docs/Individual_Skeletons_96_Contact.webp')
(ROOT/'data/RPGManagerSkeletonArtV7.json').write_text(json.dumps(catalogue,indent=2)+'\n',encoding='utf-8')
print('Validated 96 unique portraits, 1152 walking frames, 5184 combat frames and 96 defeated poses.')
