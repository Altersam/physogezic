"""Play all 50 laboratory cards in Chromium and verify scoring, SVG motion and persistence."""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'images' / 'review'
OUT.mkdir(parents=True, exist_ok=True)
NODE = shutil.which('node.cmd') or shutil.which('node.exe') or shutil.which('node')
with tempfile.TemporaryDirectory(prefix='fizogezik-lab-') as temp:
    env = os.environ.copy()
    env['FIZ_DATA_DIR'] = temp
    server = subprocess.Popen([NODE, str(ROOT / 'server.cjs')], cwd=ROOT, env=env,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                              shell=NODE.endswith('.cmd'))
    BASE = 'http://127.0.0.1:4173/'
    try:
        for _ in range(40):
            try:
                urllib.request.urlopen(BASE, timeout=1)
                break
            except Exception:
                time.sleep(.15)
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=['--disable-gpu'])
            page = browser.new_page(viewport={'width':1440,'height':1050}, device_scale_factor=1)
            errors = []
            page.on('pageerror', lambda err: errors.append(str(err)))
            page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
            page.goto(BASE + '#table')
            page.wait_for_load_state('networkidle')
            page.locator('#lab-mode').check()
            assert page.locator('#deck-count').inner_text() == '95 карточек в колоде'
            page.locator('[data-action="start"]').click()
            page.evaluate("""() => {
              const key='fizogezik.v1', store=JSON.parse(localStorage.getItem(key));
              const ids=FizData.experiments.map(q=>q.id);
              store.game=FizEngine.createGame({names:['Лаборант'],mode:'deck',check:'auto',ids,lab:true},FizData.experiments);
              store.game.deck=ids;
              localStorage.setItem(key,JSON.stringify(store));
            }""")
            page.reload()
            page.wait_for_load_state('networkidle')
            expected_score = 0
            for i in range(50):
                page.locator('[data-action="draw"]').click()
                q = page.evaluate("FizData.experiments.find(q=>q.id===JSON.parse(localStorage.getItem('fizogezik.v1')).game.active.id)")
                assert q['id'] == f'lab{i+1:02d}'
                scene = page.locator('.xlab-stage svg.xlab')
                expect(scene).to_be_visible()
                assert scene.get_attribute('aria-label') == q['title']
                assert page.locator('.xlab-caption').inner_text() == q['title']
                assert page.locator('.xlab-stage [class*="xa-"]').evaluate_all(
                    "els=>els.some(el=>getComputedStyle(el).animationName!=='none')"), q['id']
                if i == 0:
                    before = page.locator('.xa-swing').evaluate("el=>getComputedStyle(el).transform")
                    page.wait_for_timeout(320)
                    after = page.locator('.xa-swing').evaluate("el=>getComputedStyle(el).transform")
                    assert before != after, 'pendulum must actually move'
                correct = i == 1 or i >= 3
                answer = q['correct'] if correct else (q['correct'] + 1) % 4
                page.locator(f'[data-action="answer"][data-index="{answer}"]').click()
                page.locator('[data-action="submit"]').click()
                expected_score = expected_score + q['level'] if correct else max(0, expected_score - 1)
                state = page.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).game")
                assert state['players'][0]['score'] == expected_score, q['id']
                assert state['active']['result']['points'] == (q['level'] if correct else -1), q['id']
                expect(page.locator('.feedback')).to_be_visible()
                if not correct:
                    assert '−1' in page.locator('.feedback h3').inner_text()
                if i == 0:
                    assert expected_score == 0, 'score must not become negative'
                    page.screenshot(path=str(OUT/'10-lab.png'), full_page=True)
                if i == 24:
                    page.reload()
                    page.wait_for_load_state('networkidle')
                    expect(page.locator('.xlab-stage svg.xlab')).to_be_visible()
                    expect(page.locator('.feedback')).to_be_visible()
                page.locator('[data-action="next"]').click()
            expect(page.locator('.results-head')).to_be_visible()
            assert page.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).game.history.length") == 50
            assert page.evaluate("FizEngine.validGame(JSON.parse(localStorage.getItem('fizogezik.v1')).game,FizData.questions.concat(FizData.experiments))")

            page.goto(BASE + '#library')
            page.locator('[data-action="library-topic"][data-value="lab"]').click()
            expect(page.locator('.library-card')).to_have_count(50)
            page.locator('.library-card details').first.click()
            expect(page.locator('.library-card .xlab-stage svg').first).to_be_visible()
            page.screenshot(path=str(OUT/'12-lab-library.png'), full_page=False)

            mobile = browser.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
            mobile.on('pageerror', lambda err: errors.append(str(err)))
            mobile.goto(BASE + '#table')
            mobile.wait_for_load_state('networkidle')
            mobile.locator('#lab-mode').check()
            mobile.locator('[data-action="start"]').click()
            mobile.evaluate("""() => {
              const key='fizogezik.v1', store=JSON.parse(localStorage.getItem(key));
              store.game=FizEngine.createGame({names:['Лаборант'],mode:'deck',check:'auto',ids:['lab01'],lab:true},FizData.experiments);
              localStorage.setItem(key,JSON.stringify(store));
            }""")
            mobile.reload()
            mobile.wait_for_load_state('networkidle')
            mobile.locator('[data-action="draw"]').click()
            expect(mobile.locator('.xlab-stage svg.xlab')).to_be_visible()
            assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            mobile.screenshot(path=str(OUT/'11-lab-mobile.png'), full_page=True)

            reduced = browser.new_context(viewport={'width':1000,'height':800}, reduced_motion='reduce')
            calm = reduced.new_page()
            calm.goto(BASE + '#library')
            calm.locator('[data-action="library-topic"][data-value="lab"]').click()
            calm.locator('.library-card details').first.click()
            assert calm.locator('.library-card [class*="xa-"]').first.evaluate("el=>getComputedStyle(el).animationName==='none'")
            assert errors == [], errors
            browser.close()
        print('PASS: all 50 animated experiments, +level/−1 scoring, zero floor, reload, library, mobile and reduced motion.')
        print('Screenshots:', OUT)
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
