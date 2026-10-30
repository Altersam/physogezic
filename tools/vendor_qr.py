"""Fetch a pinned MIT-licensed QR encoder for offline room invite codes."""
from pathlib import Path
import hashlib
import io
import tarfile
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'vendor'
out.mkdir(exist_ok=True)
url='https://registry.npmjs.org/qrcode-generator/-/qrcode-generator-1.4.4.tgz'
data=urllib.request.urlopen(url,timeout=30).read()
with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as package:
    for source,target in [('package/qrcode.js','qrcode.cjs')]:
        member=package.extractfile(source)
        if member is None:raise RuntimeError(source)
        (out/target).write_bytes(member.read())
print('Vendored qrcode-generator@1.4.4 (MIT), archive SHA256:',hashlib.sha256(data).hexdigest())
