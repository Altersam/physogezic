"""Archive exactly the GitHub-ready project, without .git or local state."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import argparse,subprocess

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--repo',default=str(ROOT if (ROOT/'.git').exists() else ROOT/'physogezic'))
args=parser.parse_args()
repo=Path(args.repo).resolve()
if not (repo/'.git').exists():raise SystemExit('Specify the prepared repository with --repo.')
raw=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=repo)
names=sorted(set(value.decode('utf-8') for value in raw.split(b'\0') if value))
target=repo/'physogezic-source.zip'
included=[]
with ZipFile(target,'w',ZIP_DEFLATED) as archive:
    for name in names:
        file=repo/name
        if not file.is_file() or file.suffix in ('.zip','.log','.exe','.tmp'):continue
        if any(p in ('.git','.godot','node_modules','__pycache__') for p in Path(name).parts):continue
        if Path(name).parts[0] in ('data','dist','build') or name=='.sync-manifest.json':continue
        archive.write(file,'physogezic/'+name)
        included.append(name)
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert len(set(archive.namelist()))==len(archive.namelist())
    for required in ('index.html','journal.js','journal.cjs','vendor/qrcode.cjs','Godot3D/main.gd','Godot3D/game_fx.gd','.github/workflows/pages.yml'):
        assert required in included,required
print('GitHub source archive:',target)
print('Files:',len(included),'Size:',round(target.stat().st_size/1024),'KB')
