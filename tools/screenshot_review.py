"""Screenshot all main screens of the game for visual review."""
from pathlib import Path
import subprocess, tempfile, time, urllib.request, shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'images' / 'review'
OUT.mkdir(parents=True, exist_ok=True)
NODE = shutil.which('node.cmd') or shutil.which('node.exe') or shutil.which('node')
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
        page.goto(BASE + '#table'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(800)
        page.screenshot(path=str(OUT/'01-table.png'), full_page=True)

        page.goto(BASE + '#home'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(800)
        page.screenshot(path=str(OUT/'02-adventure.png'), full_page=True)

        page.goto(BASE + '#library'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'03-library.png'), full_page=True)

        page.goto(BASE + '#formulas'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'04-formulas.png'), full_page=True)

        page.goto(BASE + '#progress'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'05-progress.png'), full_page=True)

        page.goto(BASE + '#rooms'); page.wait_for_load_state('networkidle'); page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'06-rooms.png'), full_page=True)

        # Start a local game and draw a card
        page.goto(BASE + '#table'); page.wait_for_load_state('networkidle')
        page.locator('[data-action="start"]').click(); page.wait_for_timeout(500)
        page.locator('[data-action="draw"]').click(); page.wait_for_timeout(900)
        page.screenshot(path=str(OUT/'07-card-open.png'), full_page=True)

        # Mobile viewport
        mob = browser.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
        mob.goto(BASE + '#table'); mob.wait_for_load_state('networkidle'); mob.wait_for_timeout(600)
        mob.screenshot(path=str(OUT/'08-mobile.png'), full_page=True)
        browser.close()
    print('OK', OUT)
finally:
    server.terminate()
