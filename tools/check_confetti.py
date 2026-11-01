"""Verify confetti fires when a victory screen appears."""
from pathlib import Path
import subprocess, time, urllib.request, shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'images' / 'review'
NODE = shutil.which('node.cmd') or shutil.which('node')
server = subprocess.Popen([NODE, str(ROOT / 'server.cjs')], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=NODE.endswith('.cmd'))
BASE = 'http://127.0.0.1:4173/'
try:
    for _ in range(40):
        try:
            urllib.request.urlopen(BASE, timeout=1); break
        except Exception:
            time.sleep(.15)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--disable-gpu'])
        page = browser.new_page(viewport={'width':1440,'height':1000}, device_scale_factor=2)
        page.goto(BASE + '#table'); page.wait_for_load_state('networkidle')
        page.evaluate("""document.getElementById('main').innerHTML =
          '<div class="results"><div class="results-head"><img src="assets/happy.png"><h1>Побеждает Самир!</h1><p>12 из 15 верно.</p></div></div>'""")
        page.wait_for_timeout(1200)
        count = page.locator('.confetti-piece').count()
        page.screenshot(path=str(OUT/'09-confetti.png'))
        assert count > 50, f'confetti pieces: {count}'
        # pieces must clean themselves up
        page.wait_for_timeout(6000)
        assert page.locator('.confetti-layer').count() == 0
        browser.close()
    print('Confetti OK:', count, 'pieces, cleaned up')
finally:
    server.terminate()
