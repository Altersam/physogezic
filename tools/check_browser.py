"""End-to-end checks against real Chromium, including direct file:// launch."""
from pathlib import Path
import json
import subprocess
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(tempfile.gettempdir()) / 'opencode' / 'fizogezik-check'
OUT.mkdir(parents=True, exist_ok=True)
server = subprocess.Popen(['node', str(ROOT / 'server.cjs')], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
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
        context = browser.new_context(viewport={'width':1440,'height':1050}, device_scale_factor=1)
        page = context.new_page()
        errors=[]
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type=='error' else None)
        page.goto(BASE+'#table')
        page.wait_for_load_state('networkidle')
        assert page.locator('.real-game-board').is_visible()
        assert page.locator('.topic-overview a').count()==5
        assert page.locator('#deck-count').inner_text()=='45 карточек в колоде'
        page.screenshot(path=str(OUT/'home-desktop.png'), full_page=True)

        # Single-player race: wrong first, then finish correctly.
        page.locator('[data-action="start"]').click()
        page.locator('[data-action="draw"]').click()
        page.screenshot(path=str(OUT/'game-desktop.png'), full_page=True)
        first_id=page.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).game.active.id")
        page.locator('[data-action="skip"]').click()
        assert page.locator('.feedback.incorrect').is_visible()
        page.reload()
        page.wait_for_load_state('networkidle')
        assert page.locator('.feedback.incorrect').is_visible()
        assert page.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).stats.attempts")==1
        page.locator('[data-action="next"]').click()

        def answer_correct():
            q=page.evaluate("FizData.questions.find(q=>q.id===JSON.parse(localStorage.getItem('fizogezik.v1')).game.active.id)")
            if q['type']=='match':
                for i,pair in enumerate(q['pairs']):
                    page.locator(f'[data-match-index="{i}"]').select_option(pair[1])
            else:
                page.locator(f'[data-action="answer"][data-index="{q["correct"]}"]').click()
            page.locator('[data-action="submit"]').click()
            assert page.locator('.feedback:not(.incorrect)').is_visible()
            page.locator('[data-action="next"]').click()

        while page.locator('[data-action="draw"]').count():
            page.locator('[data-action="draw"]').click()
            answer_correct()
        assert page.locator('.results-head').is_visible()
        assert page.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).game.players[0].score")>=15
        page.screenshot(path=str(OUT/'results-desktop.png'),full_page=True)
        page.locator('[data-action="retry-session"]').click()
        assert page.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).game.deck")==[first_id]
        page.locator('[data-action="draw"]').click()
        answer_correct()
        assert page.evaluate(f"JSON.parse(localStorage.getItem('fizogezik.v1')).stats.byQuestion['{first_id}'].lastCorrect")

        # Four players, whole 45-card deck, automatic verification, including matching.
        page.goto(BASE+'#table')
        page.locator('[data-action="party"]').click()
        page.locator('[data-action="count"][data-value="4"]').click()
        for i,name in enumerate(['Аня','Борис','Команда света','Исследователи']):
            page.locator(f'[data-name-index="{i}"]').fill(name)
        page.locator('#game-mode').select_option('deck')
        page.locator('[data-action="start"]').click()
        expect(page.locator('.player-card')).to_have_count(4)
        for i in range(45):
            page.locator('[data-action="draw"]').click()
            if i==8:
                page.reload()
                page.wait_for_load_state('networkidle')
                assert page.locator('.question-text').is_visible()
            answer_correct()
        result=page.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).game")
        assert result['finished'] and len(result['history'])==45
        assert sum(p['score'] for p in result['players'])==80
        page.screenshot(path=str(OUT/'results-party.png'),full_page=True)

        # Oral mode and draft persistence. Only the teacher can award points.
        page.goto(BASE+'#table')
        page.locator('[data-action="solo"]').click()
        page.locator('#host-mode').check()
        page.locator('[data-action="start"]').click()
        page.locator('[data-action="draw"]').click()
        page.locator('#oral-draft').fill('Объяснение своими словами: физический закон и его условия.')
        page.reload()
        page.wait_for_load_state('networkidle')
        assert 'Объяснение' in page.locator('#oral-draft').input_value()
        page.locator('[data-action="reveal"]').click()
        assert page.locator('.host-answer').is_visible()
        page.locator('[data-action="grade-yes"]').click()
        assert page.locator('.feedback:not(.incorrect)').is_visible()
        page.locator('[data-action="pause"]').click()
        expect(page.locator('[data-action="resume"]')).to_be_visible()

        # Reference and progress sections, search, navigation, keyboard, dialogs.
        page.goto(BASE+'#library')
        expect(page.locator('.library-card')).to_have_count(95)
        page.locator('#library-search').fill('нейтрон')
        assert 0<page.locator('.library-card').count()<95
        page.locator('#library-search').fill('несуществующий запрос 999')
        assert page.locator('.empty-state').is_visible()
        page.locator('[data-action="clear-search"]').click()
        assert page.locator('.library-card').count()==95
        page.goto(BASE+'#formulas')
        expect(page.locator('.formula-card')).to_have_count(20)
        page.goto(BASE+'#progress')
        expect(page.locator('.stat-card')).to_have_count(4)
        page.screenshot(path=str(OUT/'progress-desktop.png'),full_page=True)
        with page.expect_download() as info:
            page.locator('[data-action="backup"]').click()
        backup=info.value
        backup.save_as(str(OUT/'backup.json'))
        page.locator('#restore-file').set_input_files(str(OUT/'backup.json'))
        expect(page.locator('#dialog')).to_be_visible()
        page.locator('[data-action="confirm"]').click()
        assert page.locator('.stat-card').count()==4
        page.locator('[data-action="rules"]').first.click()
        expect(page.locator('#dialog')).to_be_visible()
        page.keyboard.press('Escape')
        assert not page.locator('#dialog').is_visible()

        # Small touchscreen layout, no horizontal overflow, and real game controls.
        phone=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
        mobile=phone.new_page()
        mobile.on('pageerror',lambda err:errors.append(str(err)))
        mobile.goto(BASE+'#table')
        mobile.wait_for_load_state('networkidle')
        mobile.screenshot(path=str(OUT/'home-mobile.png'),full_page=True)
        assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        mobile.locator('[data-action="start"]').click()
        mobile.locator('[data-action="draw"]').click()
        mobile.screenshot(path=str(OUT/'game-mobile.png'),full_page=True)
        assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        mobile.locator('[data-action="skip"]').click()
        assert mobile.locator('.feedback.incorrect').is_visible()
        for route in ('library','formulas','progress'):
            mobile.goto(BASE+'#'+route)
            mobile.wait_for_timeout(50)
            assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),route

        # The promised zero-install launch must work without a server.
        direct=browser.new_page()
        direct.on('pageerror',lambda err:errors.append(str(err)))
        direct.goto((ROOT/'index.html').as_uri()+'#table')
        direct.wait_for_load_state('networkidle')
        assert direct.locator('.real-game-board').is_visible()
        direct.locator('[data-action="start"]').click()
        direct.locator('[data-action="draw"]').click()
        assert direct.locator('.question-text').is_visible()
        assert direct.locator('img').evaluate_all('(imgs)=>imgs.every(i=>i.complete && i.naturalWidth>0)')

        # Keyboard selection followed by Enter must submit, rather than select twice.
        if direct.locator('[data-action="answer"]').count():
            direct.keyboard.press('1')
            direct.keyboard.press('Enter')
            expect(direct.locator('.feedback')).to_be_visible()

        # Responsive edge sizes must not grow wider than the viewport.
        for width in (320,768,1024):
            mobile.set_viewport_size({'width':width,'height':900})
            for route in ('home','library','formulas','progress','game'):
                mobile.goto(BASE+'#'+route)
                mobile.wait_for_timeout(50)
                assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),(width,route)
        assert errors==[],errors
        browser.close()
        print('PASS: race, reload, mistakes, 4-player whole deck, all six matches, oral mode, reference, search, backup restore, mobile and file://. No browser errors.')
        print('Screenshots:',OUT)
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
