"""Prepare the small Godot follow-up after the web game; no global install."""
from pathlib import Path
import json,os,shutil,subprocess,tempfile,urllib.request,zipfile

ROOT=Path(__file__).resolve().parents[1]
PROJECT=ROOT/'Godot3D'
EDITOR=Path(tempfile.gettempdir())/'opencode'/'godot-4.5.1'
EDITOR.mkdir(parents=True,exist_ok=True)
PROJECT.mkdir(exist_ok=True)
(PROJECT/'assets').mkdir(exist_ok=True)
(PROJECT/'data').mkdir(exist_ok=True)
for name in ('happy.png','mascot.png','card-1.webp'):
    shutil.copy2(ROOT/'assets'/name,PROJECT/'assets'/name)
raw=subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('./questions.js').questions))"],cwd=ROOT)
(PROJECT/'data'/'questions.json').write_bytes(raw)
experiments=subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('./experiments.js')))"],cwd=ROOT)
(PROJECT/'data'/'experiments.json').write_bytes(experiments)
executables=list(EDITOR.glob('*_console.exe'))
if not executables:
    url='https://github.com/godotengine/godot-builds/releases/download/4.5.1-stable/Godot_v4.5.1-stable_win64.exe.zip'
    archive=EDITOR/'godot.zip'
    if not archive.exists():
        print('Downloading official Godot 4.5.1 portable editor...',flush=True)
        req=urllib.request.Request(url,headers={'User-Agent':'Fizogezik-development/1.0'})
        with urllib.request.urlopen(req,timeout=120) as response,archive.open('wb') as output:
            shutil.copyfileobj(response,output)
    with zipfile.ZipFile(archive) as package:
        for entry in package.infolist():
            if entry.filename.lower().endswith('.exe'):
                target=EDITOR/Path(entry.filename).name
                with package.open(entry) as source,target.open('wb') as output:shutil.copyfileobj(source,output)
    executables=list(EDITOR.glob('*_console.exe')) or list(EDITOR.glob('*.exe'))
if not executables:raise RuntimeError('Godot binary was not found')
print('Godot editor:',executables[0])
print('3D project:',PROJECT)
