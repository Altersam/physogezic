"""Exercise the built site at a repository-style URL, without a Node backend."""
from pathlib import Path
import subprocess,sys,time,urllib.request
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(ROOT/'tools'/'build_site.py')],cwd=ROOT,check=True)
server=subprocess.Popen([sys.executable,'-m','http.server','4178','--bind','127.0.0.1','--directory',str(ROOT/'dist')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
BASE='http://127.0.0.1:4178/site/'
try:
    for _ in range(40):
        try:urllib.request.urlopen(BASE,timeout=1);break
        except Exception:time.sleep(.1)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--disable-gpu'])
        page=browser.new_page(viewport={'width':1280,'height':900})
        errors=[];apis=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:apis.append(r.url) if '/api/' in r.url else None)
        page.goto(BASE);page.wait_for_load_state('networkidle')
        expect(page.locator('#launch-web')).to_be_visible()
        expect(page.locator('#launch-godot')).to_be_visible()
        assert page.locator('html').get_attribute('data-hosting')=='static'
        page.locator('#launch-web').click()
        expect(page.locator('.real-game-board')).to_be_visible()
        page.goto(BASE+'#rooms')
        expect(page.locator('.network-launch-note')).to_be_visible()
        expect(page.locator('[data-room="create"]')).to_be_disabled()
        assert not apis,apis
        page.goto(BASE+'#table')
        page.locator('[data-action="start"]').click()
        expect(page.locator('[data-action="draw-card"]')).to_have_count(3)
        page.locator('[data-action="draw-card"]').first.click()
        expect(page.locator('.paper-card.question-side')).to_be_visible()
        page.locator('[data-action="skip"]').click()
        expect(page.locator('.paper-card.answer-side')).to_be_visible()
        page.goto(BASE+'#formulas')
        expect(page.locator('.formula-card')).to_have_count(20)
        page.wait_for_function('document.querySelectorAll("math mfrac").length>10')
        assert not errors,errors
        browser.close()
    print('PASS: version chooser, static GitHub Pages edition, repository subpath, legacy links, closed/open cards, local game, MathML, honest room launch and no backend requests.')
finally:
    server.terminate();server.wait(timeout=5)
