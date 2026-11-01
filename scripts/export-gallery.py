from pathlib import Path
from PIL import Image
import struct,json
root=Path(__file__).resolve().parents[1];out=root/'web/gallery';out.mkdir(exist_ok=True)
races='CHINESE EGYPTIAN GREEK JAPANESE MAYA INDIAN NORMAN PERSIAN VIKING ZULU'.split()
groups=[('People','UNIT',races),('Weapons','UNIT','CATAPULT BALLISTA CANNON EXPCART FLAMETHR F_BALLIS'.split()),('Ships','UNIT','VESSEL TRANSPOR CARAVEL GALLEON'.split()),('Buildings','FIRM','FORT FACTORY WARFACT MARKET MINE INN SCIENCE HARBOR'.split()),('Seats of power','SEAT',races),('Greater beings','GOD',races),('Fryhtans','MONSTER','HOBGLOB SKELETON GREMJERM GNOLL GIANTET HEADLESS GOBLIN MAN GITH LYW ROCKMAN LIZARD FIREKIN STRUCT_1 STRUCT_2 STRUCT_3 STRUCT_4'.split())]
names={'INDIAN':'Marathas','EXPCART':'Explosive cart','FLAMETHR':'Flamethrower','F_BALLIS':'Greater ballista','TRANSPOR':'Transport','WARFACT':'War factory','SCIENCE':'Tower of science','HOBGLOB':'Hobgoblin','GREMJERM':'Gremjerm','GIANTET':'Giant','LYW':'Lyw'}
records=[]
for category,folder,entries in groups:
 for name in entries:
  base=next((root/'src/engine/data'/d/folder/name for d in ['ENCYC2','ENCYC'] if (root/'src/engine/data'/d/folder/(name+'.ICN')).exists()),None)
  if base is None:raise RuntimeError((folder,name))
  raw=base.with_suffix('.ICN').read_bytes();w,h=struct.unpack('<HH',raw[:4]);pal=base.with_suffix('.COL').read_bytes()[8:776]
  if max(pal)<=63:pal=bytes(min(255,v*4) for v in pal)
  image=Image.frombytes('P',(w,h),raw[4:4+w*h]);image.putpalette(pal);filename=f'{folder.lower()}-{name.lower()}.png';image.convert('RGB').save(out/filename,optimize=True)
  records.append(dict(id=len(records)+1,title=names.get(name,name.replace('_',' ').title()),category=category,description='',image='gallery/'+filename))
(root/'web/encyclopedia.json').write_text(json.dumps(records,indent=2));print('Exported',len(records),'encyclopedia entries')
