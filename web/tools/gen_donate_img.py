import struct
from PIL import Image, ImageDraw, ImageFont
from sword import load_pal

PAL = load_pal('/Users/fahd/Claude/7kaa/upstream/data/RESOURCE/PAL_MENU.RES')
FONT = '/System/Library/Fonts/Supplemental/Baskerville.ttc'

CAP = 19           # cap height in px (prominent, > version's ~14)
TXT = 'Donate'

# gold ramps (dark -> bright), indices from PAL_MENU's title-gold ramp
NORMAL = [228, 230, 232, 233]     # 181,132,8 -> 255,239,24
BRIGHT = [231, 232, 233, 234]     # hover: brighter

def text_alpha(txt, cap, font_path):
    f = ImageFont.truetype(font_path, 120, index=0)
    tmp = Image.new('L', (2000, 400), 0); d = ImageDraw.Draw(tmp)
    bb = d.textbbox((0, 0), txt, font=f)
    img = Image.new('L', (bb[2]-bb[0]+8, bb[3]-bb[1]+8), 0); d = ImageDraw.Draw(img)
    d.text((4-bb[0], 4-bb[1]), txt, fill=255, font=f)
    img = img.crop(img.getbbox())
    sc = cap/img.size[1]
    return img.resize((max(1, round(img.size[0]*sc)), cap), Image.LANCZOS)

def heart_alpha(size):
    # render at 4x then downscale for smooth edges
    S = size*4
    im = Image.new('L', (S, S), 0); d = ImageDraw.Draw(im)
    r = S*0.26
    d.ellipse([S*0.5-2*r, S*0.12, S*0.5, S*0.12+2*r], fill=255)
    d.ellipse([S*0.5, S*0.12, S*0.5+2*r, S*0.12+2*r], fill=255)
    d.polygon([(S*0.5-2*r+1, S*0.12+r+2), (S*0.5+2*r-1, S*0.12+r+2), (S*0.5, S*0.93)], fill=255)
    return im.resize((size, size), Image.LANCZOS)

def compose():
    txt = text_alpha(TXT, CAP, FONT)
    hh = int(CAP*1.05)
    heart = heart_alpha(hh)
    gap = 6
    W = heart.width + gap + txt.width
    H = max(heart.height, txt.height) + 2
    canvas = Image.new('L', (W, H), 0)
    canvas.paste(heart, (0, (H-heart.height)//2))
    canvas.paste(txt, (heart.width+gap, (H-txt.height)//2))
    return canvas

def map_ramp(a, ramp):
    if a < 32: return 255   # TRANSPARENT_CODE (put_bitmap_trans skips 255)
    if a > 200: return ramp[3]
    if a > 135: return ramp[2]
    if a > 80:  return ramp[1]
    return ramp[0]

def to_icn(alpha, ramp):
    w, h = alpha.size; m = alpha.load()
    px = bytearray(w*h)
    for y in range(h):
        for x in range(w):
            px[y*w+x] = map_ramp(m[x, y], ramp)
    return w, h, bytes(struct.pack('<hh', w, h)) + bytes(px)

def preview(alpha, ramp, out):
    w, h = alpha.size; m = alpha.load()
    im = Image.new('RGB', (w, h))
    for y in range(h):
        for x in range(w):
            i = map_ramp(m[x, y], ramp)
            im.putpixel((x, y), (40, 30, 20) if i == 255 else (PAL[i*3], PAL[i*3+1], PAL[i*3+2]))
    im.resize((w*5, h*5), Image.NEAREST).save(out)

alpha = compose()
wN, hN, icnN = to_icn(alpha, NORMAL)
wB, hB, icnB = to_icn(alpha, BRIGHT)
preview(alpha, NORMAL, '/tmp/donate_img_normal.png')
preview(alpha, BRIGHT, '/tmp/donate_img_bright.png')
print('bitmap', wN, 'x', hN, 'bytes', len(icnN))

def carr(name, data):
    s = 'static const unsigned char %s[] = {\n' % name
    for i in range(0, len(data), 20):
        s += '  ' + ','.join(str(b) for b in data[i:i+20]) + ',\n'
    return s + '};\n'

with open('/Users/fahd/Claude/7kaa/upstream/src/donate_img.h', 'w') as f:
    f.write('// Auto-generated gold "Donate" link bitmap (ICN: [w:int16][h:int16][8bpp]).\n')
    f.write('// index 0 = transparent (blit via put_bitmap_trans). See /tmp/gen_donate_img.py\n')
    f.write(carr('donate_img_normal', icnN))
    f.write(carr('donate_img_bright', icnB))
print('wrote src/donate_img.h')
