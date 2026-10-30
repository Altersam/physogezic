"""Extract original artwork for the browser edition; original files stay intact."""
from pathlib import Path
from zipfile import ZipFile
import json
import pymupdf as fitz
from PIL import Image
from docx import Document

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
doc = fitz.open(ROOT / 'ИТОГОВЫЙ ЛИСТ ФИЗОГЭЗИК.pdf')
page = doc[0]
pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
# Coordinates are relative to the supplied mascot sheet.
for name, box in {
    'mascot': (.527, .023, .995, .992),
    'happy': (.005, .24, .156, .509),
    'thinking': (.177, .237, .325, .513),
    'surprised': (.346, .238, .493, .508),
}.items():
    crop = im.crop(tuple(int(v * (im.width if i % 2 == 0 else im.height)) for i, v in enumerate(box))).convert('RGBA')
    # White is the paper background, including the region outside the silhouette.
    # Flood-fill only edge-connected white so the eye stays white.
    from PIL import ImageDraw
    flood = crop.convert('RGB')
    ImageDraw.floodfill(flood, (0, 0), (255, 0, 255), thresh=32)
    if name == 'mascot':
        # The two closed spaces between arms and torso are also paper.
        for x,y in ((.15,.50),(.82,.51)):
            ImageDraw.floodfill(flood, (int(x*flood.width),int(y*flood.height)), (255,0,255), thresh=32)
    pixels = list(getattr(crop, 'get_flattened_data', crop.getdata)())
    mask = list(getattr(flood, 'get_flattened_data', flood.getdata)())
    crop.putdata([(r,g,b,0) if m == (255,0,255) else (r,g,b,a) for (r,g,b,a),m in zip(pixels,mask)])
    crop.thumbnail((650, 850))
    crop.save(OUT / f'{name}.png', optimize=True)
board = Image.open(ROOT / 'поле физогэз (4).png')
board.thumbnail((1000,1000))
board.save(OUT / 'original-board.webp', quality=85)
for n in (1,2,3):
    image = Image.open(ROOT / f'рубашка{n}.png')
    image.thumbnail((320,500))
    image.save(OUT / f'card-{n}.webp', quality=85)
with ZipFile(ROOT / 'печать.треугольник.docx') as z:
    for i, name in enumerate(n for n in z.namelist() if n.startswith('word/media/')):
        raw = z.read(name)
        (OUT / f'triangle-source-{i}{Path(name).suffix}').write_bytes(raw)
sources = {}
for p in ROOT.glob('*.docx'):
    d = Document(p)
    sources[p.name] = [x.text for x in d.paragraphs if x.text.strip()]
(OUT / 'source-text.json').write_text(json.dumps(sources, ensure_ascii=False, indent=2), encoding='utf-8')
print('Artwork and source text extracted:', OUT)
