import struct
from PIL import Image, ImageDraw

IIF = '/tmp/iif'
PAL = '/Users/fahd/Claude/7kaa/upstream/data/RESOURCE/PAL_MENU.RES'

def load_pal(path=PAL):
    raw = open(path,'rb').read()
    pal = raw[8:8+768]
    mx = max(pal)
    scale = (255.0/63.0) if mx <= 63 else 1.0
    out=[]
    for i in range(256):
        out += [int(pal[i*3]*scale), int(pal[i*3+1]*scale), int(pal[i*3+2]*scale)]
    return out

def load_icn(path):
    d = open(path,'rb').read()
    w,h = struct.unpack('<hh', d[:4])
    px = bytearray(d[4:4+w*h])
    return w,h,px

def save_icn(path,w,h,px):
    with open(path,'wb') as f:
        f.write(struct.pack('<hh',w,h)); f.write(bytes(px))

def to_img(w,h,px,pal):
    im = Image.frombytes('P',(w,h),bytes(px)); im.putpalette(pal); return im.convert('RGB')

def render(w,h,px,pal,out,scale=2,crop=None,grid=0,gridstep=10):
    im = to_img(w,h,px,pal)
    if crop: im = im.crop(crop)
    cw,ch = im.size
    im = im.resize((cw*scale,ch*scale), Image.NEAREST)
    if grid:
        d=ImageDraw.Draw(im)
        ox,oy = (crop[0],crop[1]) if crop else (0,0)
        for gx in range(0,cw,gridstep):
            d.line([(gx*scale,0),(gx*scale,ch*scale)],fill=(255,0,0),width=1)
            d.text((gx*scale+1,1),str(ox+gx),fill=(255,255,0))
        for gy in range(0,ch,gridstep):
            d.line([(0,gy*scale),(cw*scale,gy*scale)],fill=(0,180,255),width=1)
            d.text((1,gy*scale+1),str(oy+gy),fill=(0,255,255))
    im.save(out)
    return out

if __name__ == '__main__':
    pal=load_pal()
    w,h,px=load_icn(f'{IIF}/00009-SWRD-1.icn')
    print('SWRD-1',w,h)
    # ENCYCLOPEDIA blade  (local y 121..176) -> source for D,O,N,A,E
    render(w,h,px,pal,'/tmp/enc.png',scale=6,crop=(6,118,282,180),grid=1,gridstep=10)
    # CREDITS blade (y 224..295) -> source for T (and D,E)
    render(w,h,px,pal,'/tmp/cre.png',scale=6,crop=(6,236,282,290),grid=1,gridstep=10)
    # QUIT blade (y 297..337, x 40..254) -> target
    render(w,h,px,pal,'/tmp/quit.png',scale=6,crop=(40,295,254,340),grid=1,gridstep=10)
