# Extrai as 6 poses do "Cute raccoon characters set.jpg" como PNGs transparentes.
# Remove o fundo branco por flood-fill a partir das bordas (preserva brancos internos = barriga).
# Detecta cada personagem por componentes conexos e recorta. Gera tambem um montage indexado.
import sys, os
from collections import deque
try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow nao instalado. Rode: python -m pip install Pillow")

SRC = r"C:\epiuse-mkt-office\public\inbound\Cute raccoon characters set.jpg"
OUT = r"C:\epiuse-mkt-office\public\inbound\assets\rax"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert("RGB")
W, H = img.size
px = img.load()
THRESH = 238  # pixel considerado "fundo branco" se R,G,B todos >= THRESH

def is_white(x, y):
    r, g, b = px[x, y]
    return r >= THRESH and g >= THRESH and b >= THRESH

# 1) flood-fill do fundo a partir das 4 bordas -> marca exterior
exterior = bytearray(W * H)
dq = deque()
for x in range(W):
    for y in (0, H - 1):
        if is_white(x, y) and not exterior[y * W + x]:
            exterior[y * W + x] = 1; dq.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if is_white(x, y) and not exterior[y * W + x]:
            exterior[y * W + x] = 1; dq.append((x, y))
while dq:
    x, y = dq.popleft()
    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx, ny = x+dx, y+dy
        if 0 <= nx < W and 0 <= ny < H and not exterior[ny*W+nx] and is_white(nx, ny):
            exterior[ny*W+nx] = 1; dq.append((nx, ny))

# alpha: opaco onde NAO eh exterior
rgba = img.convert("RGBA")
rp = rgba.load()
for y in range(H):
    for x in range(W):
        if exterior[y*W+x]:
            rp[x, y] = (0, 0, 0, 0)

# 2) componentes conexos dos pixels opacos -> personagens (com label por pixel)
visited = bytearray(W * H)
labels = bytearray(W * H)  # 0 = nenhum; id do componente caso contrario
comps = []  # (minx,miny,maxx,maxy,cnt,cid)
cid = 0
for y in range(H):
    for x in range(W):
        idx = y*W+x
        if exterior[idx] or visited[idx]:
            continue
        minx=maxx=x; miny=maxy=y; pix=[]
        st=deque([(x,y)]); visited[idx]=1
        while st:
            cx, cy = st.popleft(); pix.append(cy*W+cx)
            if cx<minx:minx=cx
            if cx>maxx:maxx=cx
            if cy<miny:miny=cy
            if cy>maxy:maxy=cy
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                nx,ny=cx+dx,cy+dy
                if 0<=nx<W and 0<=ny<H:
                    ni=ny*W+nx
                    if not exterior[ni] and not visited[ni]:
                        visited[ni]=1; st.append((nx,ny))
        if len(pix) > 8000:  # ignora ruido/fragmentos pequenos
            cid += 1
            for p in pix: labels[p] = cid
            comps.append((minx,miny,maxx,maxy,len(pix),cid))

comps.sort(key=lambda b:(round((b[1])/600), b[0]))
print(f"Imagem {W}x{H} | {len(comps)} personagens detectados")

pad = 8
crops = []
for i,(minx,miny,maxx,maxy,cnt,cid) in enumerate(comps, 1):
    bx0=max(0,minx-pad); by0=max(0,miny-pad); bx1=min(W,maxx+pad); by1=min(H,maxy+pad)
    crop = rgba.crop((bx0,by0,bx1,by1))
    cp = crop.load()
    cw0, ch0 = crop.size
    for yy in range(ch0):
        row=(by0+yy)*W
        for xx in range(cw0):
            if labels[row + bx0+xx] != cid:   # pixel de vizinho -> transparente
                cp[xx, yy] = (0,0,0,0)
    crop.save(os.path.join(OUT, f"rax-{i}.png"))
    crops.append(crop)
    print(f"rax-{i}.png  box=({bx0},{by0},{bx1},{by1})  px={cnt}")

cols=3; cw=200; ch=200; rows=(len(crops)+cols-1)//cols
sheet=Image.new("RGBA",(cols*cw, rows*ch),(240,240,245,255))
for i,c in enumerate(crops):
    cc=c.copy(); cc.thumbnail((cw-20,ch-30))
    r,col=divmod(i,cols)
    sheet.paste(cc,(col*cw+(cw-cc.width)//2, r*ch+10), cc)
sheet.save(os.path.join(OUT,"_montage.png"))
print("montage:", os.path.join(OUT,"_montage.png"))
