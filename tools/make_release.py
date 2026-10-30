"""Package the playable, dependency-free game for sharing."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re

ROOT = Path(__file__).resolve().parents[1]
files = ['index.html', 'styles.css', 'questions.js', 'engine.js', 'app.js',
         'campaign.js', 'adventure-ui.js', 'adventure.css', 'math.js', 'math.css',
         'room-ui.js', 'rooms.css', 'motion.css', 'room-engine.cjs',
         'table-view.js', 'table.css', 'table-engine.cjs', 'journal.js', 'journal.cjs',
         'vendor/qrcode.cjs', 'vendor/qrcode-LICENSE.txt',
         'Играть.cmd', 'Сетевая игра.cmd', 'README.md', 'server.cjs', 'package.json',
         'tests/engine.test.cjs', 'tests/campaign.test.cjs', 'tests/rooms.test.cjs', 'tests/table.test.cjs', 'tests/journal.test.cjs', 'tools/check_browser.py',
         'tools/check_adventure.py', 'tools/balance.cjs', 'balance-results.json',
         'GAME-DESIGN.md', 'NETWORK.md', 'tools/check_rooms.py', 'tools/check_table.py',
         'tools/prepare_godot.py', 'tools/make_release.py', 'tools/check_godot.py', 'tools/build_site.py',
         'GITHUB.md','.gitignore','.gitattributes','.dockerignore','Dockerfile']
for directory in ('.github','.devcontainer','docs'):
    base=ROOT/directory
    if base.exists():files += [str(p.relative_to(ROOT)) for p in base.rglob('*') if p.is_file()]
for directory in ('tools','tests'):
    files += [str(p.relative_to(ROOT)) for p in (ROOT/directory).iterdir() if p.is_file() and p.suffix in ('.py','.cjs')]
godot=ROOT/'Godot3D'
if godot.exists():
    files += [str(p.relative_to(ROOT)) for p in godot.rglob('*') if p.is_file() and '.godot' not in p.relative_to(godot).parts and p.suffix not in ('.import','.log','.exe')]
files += [str(p.relative_to(ROOT)) for p in (ROOT / 'assets').iterdir()
          if p.suffix in ('.png', '.webp') and not p.name.startswith('triangle-source-')]
target = ROOT / 'Физогэзик — игра.zip'
files=sorted({name.replace('\\','/') for name in files})
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(ROOT / name, 'Физогэзик/' + name.replace('\\','/'))
with ZipFile(target) as archive:
    assert archive.testzip() is None, 'Archive integrity check failed'
    entries=set(archive.namelist())
    assert len(entries)==len(archive.namelist()), 'Duplicate archive entry'
    for resource in re.findall(r'(?:src|href)="([^"#]+)"', (ROOT/'index.html').read_text(encoding='utf-8')):
        assert 'Физогэзик/'+resource in entries, f'Missing resource: {resource}'
print('Ready:', target)
print('Size:', round(target.stat().st_size / 1024), 'KB')
print('Archive integrity and all HTML resources: verified')
godot=ROOT/'Godot3D'
if (godot/'project.godot').exists():
    target3d=ROOT/'Физогэзик — Godot 3D.zip'
    with ZipFile(target3d,'w',ZIP_DEFLATED) as archive:
        for file in godot.rglob('*'):
            if not file.is_file() or '.godot' in file.relative_to(godot).parts or file.suffix=='.import':
                continue
            archive.write(file,'Физогэзик 3D/'+file.relative_to(godot).as_posix())
    with ZipFile(target3d) as archive:
        assert archive.testzip() is None
        assert len(set(archive.namelist()))==len(archive.namelist())
        assert 'Физогэзик 3D/project.godot' in archive.namelist()
        assert 'Физогэзик 3D/data/questions.json' in archive.namelist()
    print('3D source project:',target3d,round(target3d.stat().st_size/1024),'KB')
