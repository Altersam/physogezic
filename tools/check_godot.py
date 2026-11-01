"""Run real Godot tests; optionally render native 3840×2160 gameplay frames."""
from pathlib import Path
import argparse,os,re,shutil,struct,subprocess,tempfile

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--godot',default=os.environ.get('GODOT_EXE'))
parser.add_argument('--screenshots',action='store_true')
args=parser.parse_args()
fallback=Path(tempfile.gettempdir())/'opencode'/'godot-4.5.1'/'Godot_v4.5.1-stable_win64_console.exe'
godot=args.godot or shutil.which('godot') or shutil.which('godot4') or (str(fallback) if fallback.exists() else None)
if not godot:raise SystemExit('Specify --godot PATH or GODOT_EXE (Godot 4.5+).')
project=ROOT/'Godot3D'
out=ROOT/'docs'/'images'/'godot-4k'
out.mkdir(parents=True,exist_ok=True)

def run(arguments,marker=None,environment=None):
    result=subprocess.run([godot,'--path',str(project),*arguments],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=120,env=environment)
    output=result.stdout+'\n'+result.stderr
    if result.returncode or re.search(r'(SCRIPT ERROR|^ERROR:)',output,re.MULTILINE) or (marker and marker not in output):
        print(output)
        raise SystemExit('Godot verification failed')
    for line in output.splitlines():
        if 'PASS' in line or 'CAPTURE' in line:print(line)

run(['--headless','--editor','--import'])
run(['--headless','--fixed-fps','60','--quit-after','300','--','--smoke'],'GODOT_SMOKE_PASS')
run(['--headless','--fixed-fps','60','--quit-after','400','--','--lab-test'],'GODOT_LAB_PASS')
run(['--headless','--fixed-fps','60','--quit-after','2400','--','--effects-test'],'GODOT_EFFECTS_PASS')
if args.screenshots:
    scenes=[('draw',None),('card',None),('correct',None),('wrong',None),('victory',None),
            ('lab-prism','prism'),('lab-pendulum','pendulum'),('lab-boiling','boiling'),
            ('lab-circuit','circuit'),('lab-atom','atom'),('lab-penalty','collision')]
    for scene,experiment in scenes:
        target=out/f'{scene}.png'
        options=['--rendering-method','gl_compatibility','--','--capture']
        if experiment:
            options.append('--capture-lab-wrong' if scene=='lab-penalty' else '--capture-lab')
        elif scene!='draw':options.append('--capture-'+scene)
        environment={**os.environ,'FIZ_CAPTURE':str(target).replace('\\','/')}
        if experiment:environment['FIZ_LAB_ANIM']=experiment
        run(options,'GODOT_CAPTURE',environment)
        assert target.exists() and target.stat().st_size>10000
        with target.open('rb') as image:
            header=image.read(24)
        assert header[:8]==b'\x89PNG\r\n\x1a\n'
        assert struct.unpack('>II',header[16:24])==(3840,2160),f'{scene} is not native 4K'
    print('Rendered native 4K screenshots:',out)
print('Godot gameplay, 50 animated experiments and feedback checks passed.')
