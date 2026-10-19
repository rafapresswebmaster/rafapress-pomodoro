"""Extract complete source silhouettes, preserving ownership across atlas cell boundaries."""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from collections import defaultdict

def components(mask):
 parents=[];runs=[];previous=[]
 def find(i):
  while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
  return i
 for y,line in enumerate(mask):
  edges=np.flatnonzero(np.diff(np.r_[False,line,False]));current=[];pi=0
  for start,end in zip(edges[::2],edges[1::2]):
   idx=len(parents);parents.append(idx);runs.append((int(start),int(end),y));current.append(idx)
   while pi<len(previous) and runs[previous[pi]][1]<start:pi+=1
   j=pi
   while j<len(previous) and runs[previous[j]][0]<=end:parents[find(previous[j])]=find(idx);j+=1
  previous=current
 groups=defaultdict(list)
 for i,run in enumerate(runs):groups[find(i)].append(run)
 return list(groups.values())

def extract_grid(path,cols,rows):
 """Find transparent gutters and isolate each padded character silhouette."""
 im=Image.open(path).convert('RGBA');pixels=np.array(im);mask=pixels[:,:,3]>=96;h,w=mask.shape
 # Locate the real transparent gutters before component analysis. Some generated
 # weapons touch their neighbors; a minimum-ink gutter separates those clusters.
 def gutter(projection,center,radius):
  lo=max(1,round(center-radius));hi=min(len(projection)-1,round(center+radius));values=projection[lo:hi]
  candidates=np.flatnonzero(values==values.min())+lo
  return int(min(candidates,key=lambda x:abs(x-center)))
 ys=[0]+[gutter(mask.sum(1),i*h/rows,h/rows*.28) for i in range(1,rows)]+[h]
 result={};bounds=[]
 for row in range(rows):
  projection=mask[ys[row]:ys[row+1]].sum(0);xs=[0]+[gutter(projection,i*w/cols,w/cols*.25) for i in range(1,cols)]+[w]
  for col in range(cols):
   box=pixels[ys[row]:ys[row+1],xs[col]:xs[col+1]].copy();box[box[:,:,3]<96]=0
   # Remove disconnected fragments from neighboring art, while retaining weapons
   # connected through a two-pixel transparent seam around the actor's hands.
   opaque=box[:,:,3]>0;py,px=np.nonzero(opaque);assert len(px),(path,row,col)
   nearest=np.argmin((px-px.mean())**2+(py-py.mean())**2);seed=(int(px[nearest]),int(py[nearest]))
   joined=Image.fromarray((opaque*255).astype('uint8')).filter(ImageFilter.MaxFilter(5));ImageDraw.floodfill(joined,seed,128)
   box[np.array(joined)!=128]=0
   out=Image.fromarray(box);bb=out.getbbox();assert bb,(path,row,col)
   result[row,col]=out.crop(bb);bounds.append({'row':row,'column':col,'bounds':[xs[col]+bb[0],ys[row]+bb[1],xs[col]+bb[2],ys[row]+bb[3]],'gutterBox':[xs[col],ys[row],xs[col+1],ys[row+1]]})
 return result,bounds
def extract(path,cols,rows):
 """Extract whole actors before packing, never cut weapons at nominal cell edges."""
 if path.stem=='skeleton':return extract_grid(path,cols,rows)
 thresholds={'front':224,'side':96,'rear':240,'attack':248,'strideA':160,'strideB':248,'fallen':248,'cleric_strideB_spaced':96}
 threshold=96 if path.stem.endswith('_opposite') else thresholds[path.stem];pixels=np.array(Image.open(path).convert('RGBA'));h,w=pixels.shape[:2]
 groups=[g for g in components(pixels[:,:,3]>=threshold) if sum(b-a for a,b,y in g)>1200]
 assert len(groups)==cols*rows,(path,len(groups))
 labels=np.zeros((h,w),dtype=np.int16);cells={}
 for label,g in enumerate(groups,1):
  area=sum(b-a for a,b,y in g);cx=sum((a+b)*.5*(b-a) for a,b,y in g)/area;cy=sum(y*(b-a) for a,b,y in g)/area
  cell=(min(rows-1,int(cy/h*rows)),min(cols-1,int(cx/w*cols)))
  assert cell not in cells,(path,cell)
  cells[cell]=label
  for a,b,y in g:labels[y,a:b]=label
 # Lower the alpha threshold in stages. Detached weapon cores and glow details
 # join their owner before translucent bridges join neighboring characters. A
 # component containing two actors never transfers pixels between their masks.
 for alpha in [240,224,192,160,128,96]:
  if alpha>=threshold:continue
  for group in components(pixels[:,:,3]>=alpha):
   owners=set()
   for a,b,y in group:
    owners.update(int(v) for v in np.unique(labels[y,a:b]) if v)
    if len(owners)>1:break
   if len(owners)==1:
    owner=owners.pop()
    for a,b,y in group:labels[y,a:b]=owner
 # Restore antialiased outlines without joining adjacent actors through translucent
 # spell glows. Ownership starts from complete connected solid silhouettes globally.
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
 for (row,col),label in sorted(cells.items()):
  py,px=np.nonzero(labels==label);left,right,top,bottom=int(px.min()),int(px.max()+1),int(py.min()),int(py.max()+1)
  box=pixels[top:bottom,left:right].copy();box[labels[top:bottom,left:right]!=label]=0
  result[row,col]=Image.fromarray(box);bounds.append({'row':row,'column':col,'bounds':[left,top,right,bottom],'coreAlpha':threshold,'corePixels':sum(b-a for a,b,y in groups[label-1])})
 return result,bounds
