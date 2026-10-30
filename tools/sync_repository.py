"""Prepare an existing repository without touching .git, saves or unknown edits."""
from pathlib import Path
import argparse,hashlib,json,shutil,subprocess

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--target',required=True)
args=parser.parse_args()
target=Path(args.target).resolve()
if target==ROOT:raise SystemExit('Source and target must differ.')
target.mkdir(parents=True,exist_ok=True)
manifest=target/'.sync-manifest.json'
previous=json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else {}
tracked=set()
if (target/'.git').exists():
    tracked=set(subprocess.check_output(['git','ls-files'],cwd=target,text=True,encoding='utf-8').splitlines())
    if not previous:
        dirty=subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=target,text=True,encoding='utf-8')
        if dirty.strip():raise SystemExit('Tracked local edits found; inspect them before preparing this repository.')
def digest(file):return hashlib.sha256(file.read_bytes()).hexdigest()
files=set()
for pattern in ('*.js','*.cjs','*.css'):files.update(ROOT.glob(pattern))
for name in ('index.html','package.json','README.md','NETWORK.md','GAME-DESIGN.md','GITHUB.md',
             'Dockerfile','.dockerignore','.gitignore','.gitattributes','Играть.cmd','Сетевая игра.cmd','balance-results.json'):
    file=ROOT/name
    if file.exists():files.add(file)
for folder in ('assets','vendor','tools','tests','Godot3D','.github','.devcontainer','docs'):
    base=ROOT/folder
    if not base.exists():continue
    for file in base.rglob('*'):
        parts=file.relative_to(ROOT).parts
        if not file.is_file() or any(p in ('.git','.godot','__pycache__') for p in parts):continue
        if file.suffix in ('.import','.pyc','.log','.exe','.zip','.tmp'):continue
        if folder=='assets' and (file.name.startswith('triangle-source-') or file.suffix not in ('.png','.webp')):continue
        files.add(file)
plan=[]
for source in sorted(files):
    relative=source.relative_to(ROOT).as_posix();destination=target/relative;sha=digest(source)
    if destination.exists() and digest(destination)!=sha:
        old=previous.get(relative)
        if old and digest(destination)!=old:raise SystemExit('Preserved an externally modified file: '+relative)
        if not old and relative not in tracked:raise SystemExit('Unmanaged file collision: '+relative)
    plan.append((source,destination,relative,sha))
for source,destination,relative,sha in plan:
    destination.parent.mkdir(parents=True,exist_ok=True)
    if not destination.exists() or digest(destination)!=sha:shutil.copy2(source,destination)
manifest.write_text(json.dumps({relative:sha for _,_,relative,sha in plan},ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared',len(plan),'project files in',target)
print('Git metadata and original assets preserved; no commit or push performed.')
