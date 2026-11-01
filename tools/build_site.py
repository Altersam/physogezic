"""Build the static GitHub Pages edition using an explicit runtime allowlist."""
from pathlib import Path
import argparse,re,shutil

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--web-only',action='store_true',help='Validate only the lightweight game; not a full release.')
args=parser.parse_args()
OUT=ROOT/'dist'/'site'
OUT.mkdir(parents=True,exist_ok=True)
files=['index.html','play.html','launcher.css','launcher.js','styles.css','adventure.css','math.css','rooms.css','motion.css','table.css','beauty.css','lab.css',
       'math.js','journal.js','questions.js','experiments.js','lab.js','engine.js','campaign.js','adventure-ui.js',
       'table-view.js','room-ui.js','app.js','beauty.js']
for name in files:
    if name in ('index.html','play.html'):
        content=(ROOT/name).read_text(encoding='utf-8').replace('<html lang="ru">','<html lang="ru" data-hosting="static">')
        (OUT/name).write_text(content,encoding='utf-8')
    else:shutil.copy2(ROOT/name,OUT/name)
(OUT/'assets').mkdir(exist_ok=True)
for file in (ROOT/'assets').iterdir():
    if file.suffix in ('.png','.webp') and not file.name.startswith('triangle-source-'):
        shutil.copy2(file,OUT/'assets'/file.name)
(OUT/'.nojekyll').write_text('',encoding='utf-8')
for file in (ROOT/'docs'/'images').glob('*.png'):
    (OUT/'docs'/'images').mkdir(parents=True,exist_ok=True)
    shutil.copy2(file,OUT/'docs'/'images'/file.name)
godot=ROOT/'build'/'godot-web'
if not args.web_only:
    for name in ('index.html','index.js','index.wasm','index.pck','build.json'):
        if not (godot/name).is_file():raise SystemExit('Build Godot first: python tools/export_godot_web.py (missing '+name+')')
    shutil.copytree(godot,OUT/'godot',dirs_exist_ok=True)
for name in ('index.html','play.html'):
    html=(OUT/name).read_text(encoding='utf-8')
    for resource in re.findall(r'(?:src|href)="([^"#]+)"',html):
        if resource.startswith(('http:','https:','mailto:')):continue
        resource=resource.split('#')[0].split('?')[0]
        if not resource or args.web_only and resource.startswith('godot/'):continue
        assert (OUT/resource).is_file(),resource
assert not (OUT/'server.cjs').exists()
assert not (OUT/'data').exists()
assert 'data-hosting="static"' in (OUT/'play.html').read_text(encoding='utf-8')
print('GitHub Pages site ready:',OUT)
print('Static resources verified; room state and server files excluded. Godot:',not args.web_only)
