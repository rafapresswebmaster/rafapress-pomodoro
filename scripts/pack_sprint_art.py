"""Pack generated views into MZ atlases; source images are retained unchanged.

This performs atlas extraction/frame assembly, not replacement artwork generation.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json, shutil, hashlib
root=Path(__file__).resolve().parents[1]
source=Path(r'C:\Users\rafae\.codex\generated_images\01a14645-6612-7f73-a0c3-252f036916de')
names={'front':'exec-96c9b47b-e7a7-4871-a643-dc612bdd7fe7.webp','side':'exec-8f8b2a89-f304-42c8-932e-34ef9e0ef813.webp','rear':'exec-904e0807-cfdd-4943-bfee-f013544be215.webp','attack':'exec-53119b32-d018-4376-be7a-80e662b24a4f.webp'}
dest=root/'img/sprint-source';dest.mkdir(exist_ok=True)
views={}
for view,name in names.items():
    if (source/name).is_file():shutil.copy2(source/name,dest/f'{view}.webp')
    assert (dest/f'{view}.webp').is_file(),f'Missing generated source: {view}'
    views[view]=Image.open(dest/f'{view}.webp').convert('RGBA')
classes=['barbarian','knight','cleric','rogue','ranger','mage'];catalogue=[]
contact=Image.new('RGBA',(8*144,12*176),(31,40,59,255));draw=ImageDraw.Draw(contact)
def cell(view,row,col):
    im=views[view];w,h=im.size
    return im.crop((col*w//8,row*h//12,(col+1)*w//8,(row+1)*h//12))
def frame(image,bob=0):
    canvas=Image.new('RGBA',(64,64));image=image.resize((60,60),Image.Resampling.NEAREST)
    canvas.alpha_composite(image,(2,2+bob));return canvas
for ci,cls in enumerate(classes):
    faces=Image.new('RGBA',(8*144,2*144))
    for si,sex in enumerate(['male','female']):
        row=ci*2+si;walk=Image.new('RGBA',(12*64,8*64))
        for i in range(8):
            key=f'{cls}:{sex}:'+('default' if i==0 else f'v2:{i-1}' if i<4 else f'v4:{i}')
            front=cell('front',row,i);side=cell('side',row,i);rear=cell('rear',row,i);attack=cell('attack',row,i)
            # Portraits are head/shoulder crops; body models always come from complete bodies.
            portrait=front.crop((16,0,112,96)).resize((144,144),Image.Resampling.NEAREST)
            faces.alpha_composite(portrait,(i*144,si*144))
            walking=f'RPGWalk_{cls}_{sex}_v4';combat=f'RPGCombat_{cls}_{sex}_{i}_v4'
            for direction,view in enumerate([front,side,ImageOps.mirror(side),rear]):
                for pattern in range(3):walk.alpha_composite(frame(view,1 if pattern!=1 else 0),(((i%4)*3+pattern)*64,((i//4)*4+direction)*64))
            sv=Image.new('RGBA',(9*64,6*64))
            for motion in range(18):
                for pattern in range(3):
                    view=attack if motion in [6,7,8,9,10,11,12,13] and pattern==1 else side
                    sv.alpha_composite(frame(view,1 if pattern!=1 else 0),((motion//6*3+pattern)*64,(motion%6)*64))
            sv.save(root/f'img/sv_actors/{combat}.webp')
            entry={'key':key,'classId':cls,'sex':sex,'portrait':{'sheet':f'RPGPortrait_{cls}_v4','index':i+8*si,'columns':8,'rows':2},'walking':{'sheet':walking,'index':i},'combat':{'sheet':combat,'columns':9,'rows':6}}
            entry['portraitHash']=hashlib.sha256(portrait.tobytes()).hexdigest();entry['walkingHash']=hashlib.sha256(front.tobytes()).hexdigest();catalogue.append(entry)
            contact.alpha_composite(portrait.resize((88,88),Image.Resampling.NEAREST),(i*144,row*176))
            contact.alpha_composite(frame(side),(i*144+80,row*176+82))
            draw.text((i*144+3,row*176+148),f'{cls[:4]} {sex[0]} {i+1}',fill='white')
        walk.save(root/f'img/characters/{walking}.webp')
    faces.save(root/f'img/faces/RPGPortrait_{cls}_v4.webp')
contact.convert('RGB').save(root/'docs/Next_Sprint_Art_Contact.webp')
(root/'data/RPGManagerArtV4.json').write_text(json.dumps(catalogue,indent=2),encoding='utf-8')
assert len(catalogue)==len({x['portraitHash'] for x in catalogue})==len({x['walkingHash'] for x in catalogue})==96
print('Packed 96 portraits, 96 walking cells in 12 sheets, 96 combat sheets; contact catalogue saved.')
