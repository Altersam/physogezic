"""Bundle OFL fonts so browser exports do not depend on OS fallback glyphs."""
from pathlib import Path
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'Godot3D'/'assets'/'fonts'
OUT.mkdir(parents=True,exist_ok=True)
sources={
    'NotoSans.ttf':'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf',
    'NotoSansSymbols2.ttf':'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf',
    'NotoSansMath.ttf':'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmath/NotoSansMath-Regular.ttf',
    'NotoSans-OFL.txt':'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/OFL.txt',
    'NotoSansSymbols2-OFL.txt':'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssymbols2/OFL.txt',
    'NotoSansMath-OFL.txt':'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmath/OFL.txt'
}
for name,url in sources.items():
    target=OUT/name
    if target.exists() and target.stat().st_size>1000:continue
    request=urllib.request.Request(url,headers={'User-Agent':'Physogezic-Font-Preparation'})
    target.write_bytes(urllib.request.urlopen(request,timeout=60).read())
print('Bundled browser fonts and OFL licenses:',OUT)
