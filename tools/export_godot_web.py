"""Export a real, single-threaded Godot Web build without installing all templates."""
from pathlib import Path
from collections import OrderedDict
import argparse,io,json,os,re,shutil,subprocess,tempfile,urllib.request,zipfile

ROOT=Path(__file__).resolve().parents[1]
TEMP=Path(tempfile.gettempdir())/'opencode'

class RemoteZip(io.RawIOBase):
    """Seekable, bounded HTTP Range reader; fetch only selected template members."""
    def __init__(self,url):
        request=urllib.request.Request(url,method='HEAD',headers={'User-Agent':'Physogezic-Web-Exporter','Accept-Encoding':'identity'})
        with urllib.request.urlopen(request,timeout=90) as response:
            self.url=response.geturl()
            self.length=int(response.headers['Content-Length'])
        self.position=0
        self.cache=OrderedDict()
        self.block=2*1024*1024
        self.downloaded=0
    def readable(self):return True
    def seekable(self):return True
    def tell(self):return self.position
    def seek(self,offset,whence=0):
        self.position=offset if whence==0 else self.position+offset if whence==1 else self.length+offset
        return self.position
    def read(self,size=-1):
        if size<0:size=self.length-self.position
        end=min(self.length,self.position+size)
        chunks=[]
        while self.position<end:
            number=self.position//self.block
            start=number*self.block
            if number not in self.cache:
                stop=min(self.length-1,start+self.block-1)
                request=urllib.request.Request(self.url,headers={'Range':f'bytes={start}-{stop}','Accept-Encoding':'identity','User-Agent':'Physogezic-Web-Exporter'})
                with urllib.request.urlopen(request,timeout=90) as response:
                    if response.status!=206:raise RuntimeError('Download server did not honor HTTP Range; use --template with an installed Web template.')
                    data=response.read(stop-start+2)
                if len(data)!=stop-start+1:raise RuntimeError('Incomplete template range')
                self.cache[number]=data
                self.downloaded+=len(data)
                if len(self.cache)>4:self.cache.popitem(last=False)
            else:self.cache.move_to_end(number)
            block=self.cache[number]
            take=min(end-self.position,len(block)-(self.position-start))
            chunks.append(block[self.position-start:self.position-start+take])
            self.position+=take
        return b''.join(chunks)

def editor_path(explicit):
    fallback=TEMP/'godot-4.5.1'/'Godot_v4.5.1-stable_win64_console.exe'
    value=explicit or os.environ.get('GODOT_EXE') or shutil.which('godot') or shutil.which('godot4') or (str(fallback) if fallback.exists() else None)
    if not value:raise RuntimeError('Godot not found. Set GODOT_EXE or use --godot PATH.')
    return value

def template_path(version,explicit):
    if explicit:
        file=Path(explicit).resolve()
        if not file.is_file():raise RuntimeError('Web template not found: '+str(file))
        return file
    roots=[Path(os.environ.get('APPDATA',Path.home()/'AppData'/'Roaming'))/'Godot'/'export_templates',Path.home()/'.local'/'share'/'godot'/'export_templates']
    for root in roots:
        file=root/(version+'.stable')/'web_nothreads_release.zip'
        if file.exists():return file
    directory=TEMP/('godot-web-'+version)
    directory.mkdir(parents=True,exist_ok=True)
    file=directory/'web_nothreads_release.zip'
    if file.exists() and zipfile.is_zipfile(file):return file
    url=f'https://github.com/godotengine/godot-builds/releases/download/{version}-stable/Godot_v{version}-stable_export_templates.tpz'
    print('Fetching only the official single-thread Web template...',flush=True)
    remote=RemoteZip(url)
    with zipfile.ZipFile(remote) as archive:
        name=next((name for name in archive.namelist() if name.endswith('/web_nothreads_release.zip') or name=='web_nothreads_release.zip'),None)
        if not name:raise RuntimeError('Single-thread Web template not found in the official bundle')
        with archive.open(name) as source,file.open('wb') as target:shutil.copyfileobj(source,target,1024*1024)
    with zipfile.ZipFile(file) as archive:
        if archive.testzip() is not None:raise RuntimeError('Template integrity check failed')
    print('Template cached:',file,'Downloaded:',round(remote.downloaded/1024/1024,1),'MiB',flush=True)
    return file

def run(godot,project,args):
    result=subprocess.run([godot,'--headless','--path',str(project),*args],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=180)
    output=result.stdout+'\n'+result.stderr
    if result.returncode or re.search(r'(^ERROR:|SCRIPT ERROR)',output,re.MULTILINE):
        print(output)
        raise RuntimeError(f'Godot Web export failed with exit code {result.returncode}')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--godot')
    parser.add_argument('--template')
    parser.add_argument('--out',default=str(ROOT/'build'/'godot-web'))
    parser.add_argument('--templates-only',action='store_true')
    args=parser.parse_args()
    TEMP.mkdir(parents=True,exist_ok=True)
    godot=editor_path(args.godot)
    raw=subprocess.check_output([godot,'--version'],text=True,encoding='utf-8',errors='replace').strip()
    match=re.search(r'(\d+\.\d+\.\d+)\.stable',raw)
    if not match:raise RuntimeError('A stable Godot 4.5+ editor is required: '+raw)
    version=match[1]
    template=template_path(version,args.template)
    if args.templates_only:
        print('Web template ready:',template)
        return
    out=Path(args.out).resolve()
    out.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='physogezic-web-stage-',dir=TEMP) as temp:
        project=Path(temp)/'project'
        shutil.copytree(ROOT/'Godot3D',project,ignore=shutil.ignore_patterns('.godot','*.log','*.exe'))
        presets=project/'export_presets.cfg'
        config=presets.read_text(encoding='utf-8').replace('custom_template/release=""','custom_template/release='+json.dumps(template.as_posix()))
        presets.write_text(config,encoding='utf-8')
        for attempt in range(3):
            try:
                run(godot,project,['--editor','--import'])
                break
            except RuntimeError as error:
                if attempt==2 or 'exit code -11' not in str(error):raise
                print('Godot importer segfaulted; retrying with the recovered import cache...',flush=True)
        run(godot,project,['--export-release','Web',str(out/'index.html')])
    for name in ('index.html','index.js','index.wasm','index.pck'):
        if not (out/name).is_file():raise RuntimeError('Missing export: '+name)
    shutil.copy2(ROOT/'Godot3D'/'network_client.js',out/'network_client.js')
    licenses=out/'licenses'
    licenses.mkdir(exist_ok=True)
    for file in (ROOT/'Godot3D'/'assets'/'fonts').glob('*OFL.txt'):shutil.copy2(file,licenses/file.name)
    license_file=ROOT/'Godot3D'/'GODOT_LICENSE.txt'
    if license_file.exists():shutil.copy2(license_file,licenses/license_file.name)
    manifest={'version':1,'godot':version,'renderer':'WebGL 2.0','threads':False,'files':{file.name:file.stat().st_size for file in out.iterdir() if file.is_file() and file.name!='build.json'}}
    (out/'build.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Godot WebGL build ready:',out)
    print('Single-threaded: no COOP/COEP headers required. Godot:',version)

if __name__=='__main__':main()
