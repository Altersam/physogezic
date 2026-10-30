"""Build the static GitHub Pages edition using an explicit runtime allowlist."""
from pathlib import Path
import re,shutil

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'/'site'
OUT.mkdir(parents=True,exist_ok=True)
files=['index.html','styles.css','adventure.css','math.css','rooms.css','motion.css','table.css',
       'math.js','journal.js','questions.js','engine.js','campaign.js','adventure-ui.js',
       'table-view.js','room-ui.js','app.js']
for name in files:
    if name=='index.html':
        content=(ROOT/name).read_text(encoding='utf-8').replace('<html lang="ru">','<html lang="ru" data-hosting="static">')
        (OUT/name).write_text(content,encoding='utf-8')
    else:shutil.copy2(ROOT/name,OUT/name)
(OUT/'assets').mkdir(exist_ok=True)
for file in (ROOT/'assets').iterdir():
    if file.suffix in ('.png','.webp') and not file.name.startswith('triangle-source-'):
        shutil.copy2(file,OUT/'assets'/file.name)
(OUT/'.nojekyll').write_text('',encoding='utf-8')
html=(OUT/'index.html').read_text(encoding='utf-8')
for resource in re.findall(r'(?:src|href)="([^"#]+)"',html):
    assert (OUT/resource).is_file(),resource
assert not (OUT/'server.cjs').exists()
assert not (OUT/'data').exists()
assert 'data-hosting="static"' in html
print('GitHub Pages site ready:',OUT)
print('Static resources verified; room state and server files excluded.')
