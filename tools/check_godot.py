"""Run real Godot tests; optionally render gameplay screenshots."""
from pathlib import Path
import argparse,os,re,shutil,subprocess,tempfile

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--godot',default=os.environ.get('GODOT_EXE'))
parser.add_argument('--screenshots',action='store_true')
args=parser.parse_args()
fallback=Path(tempfile.gettempdir())/'opencode'/'godot-4.5.1'/'Godot_v4.5.1-stable_win64_console.exe'
godot=args.godot or shutil.which('godot') or shutil.which('godot4') or (str(fallback) if fallback.exists() else None)
if not godot:raise SystemExit('Specify --godot PATH or GODOT_EXE (Godot 4.5+).')
project=ROOT/'Godot3D'
out=Path(tempfile.gettempdir())/'opencode'/'fizogezik-godot-effects'
out.mkdir(parents=True,exist_ok=True)

def run(arguments,marker=None,environment=None):
    result=subprocess.run([godot,'--path',str(project),*arguments],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=100,env=environment)
    output=result.stdout+'\n'+result.stderr
    if result.returncode or re.search(r'(SCRIPT ERROR|^ERROR:)',output,re.MULTILINE) or (marker and marker not in output):
        print(output)
        raise SystemExit('Godot verification failed')
    for line in output.splitlines():
        if 'PASS' in line or 'CAPTURE' in line:print(line)

run(['--headless','--editor','--import'])
run(['--headless','--fixed-fps','60','--quit-after','300','--','--smoke'],'GODOT_SMOKE_PASS')
run(['--headless','--fixed-fps','60','--quit-after','1800','--','--effects-test'],'GODOT_EFFECTS_PASS')
if args.screenshots:
    for scene in ('draw','card','correct','wrong','victory'):
        target=out/f'{scene}.png'
        options=['--rendering-method','gl_compatibility','--','--capture']
        if scene!='draw':options.append('--capture-'+scene)
        run(options,'GODOT_CAPTURE',{**os.environ,'FIZ_CAPTURE':str(target).replace('\\','/')})
        assert target.exists() and target.stat().st_size>10000
    print('Rendered screenshots:',out)
print('Godot gameplay and feedback checks passed.')
