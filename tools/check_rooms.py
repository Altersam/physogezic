"""Multi-device quiz flow against the real server, including restart recovery."""
from pathlib import Path
import os
import subprocess
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(tempfile.gettempdir())/'opencode'/'fizogezik-network'
OUT.mkdir(parents=True,exist_ok=True)
DATA=Path(tempfile.mkdtemp(prefix='room-data-',dir=OUT))
BASE='http://127.0.0.1:4175/'
env={**os.environ,'PORT':'4175','FIZ_DATA_DIR':str(DATA),'HOST':'127.0.0.1'}

def launch():
    p=subprocess.Popen(['node',str(ROOT/'server.cjs')],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    for _ in range(60):
        try:
            urllib.request.urlopen(BASE+'api/server-info',timeout=1)
            return p
        except Exception:
            time.sleep(.1)
    raise RuntimeError('Server did not start')

server=launch()
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--disable-gpu'])
        host_context=browser.new_context(viewport={'width':1440,'height':1100},device_scale_factor=1)
        a_context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        b_context=browser.new_context(viewport={'width':1280,'height':900})
        host=host_context.new_page();a=a_context.new_page();b=b_context.new_page()
        errors=[]
        for page in (host,a,b):
            page.on('pageerror',lambda e:errors.append(str(e)))
        host.goto(BASE+'#rooms')
        host.wait_for_load_state('networkidle')
        host.locator('#room-mode').select_option('quiz')
        host.locator('#room-count').select_option('5')
        host.locator('#room-seconds').select_option('0')
        host.locator('[data-room="create"]').click()
        expect(host.locator('.room-code')).to_be_visible()
        code=host.url.split('/')[-1]
        assert len(code)==6 and code.isdigit()
        for page,name in ((a,'Команда Ньютона'),(b,'Световые странники')):
            page.goto(BASE+'#room/'+code)
            page.locator('#room-name').fill(name)
            page.locator('[data-room="join"]').click()
            expect(page.locator('.lobby-signal')).to_be_visible()
        expect(host.locator('.room-person')).to_have_count(2)
        expect(host.locator('.qr-invite img')).to_be_visible()
        host.wait_for_function('document.querySelector(".qr-invite img").naturalWidth>0')
        host.screenshot(path=str(OUT/'room-lobby.png'),full_page=True)
        host.locator('[data-action="rules"]').click()
        expect(host.locator('#dialog-title')).to_have_text('Экспедиция всем экипажем')
        host.keyboard.press('Escape')

        def snap(page):
            return page.evaluate("async(code)=>{const s=JSON.parse(localStorage.getItem('fiz.rooms.v1'))[code];return (await fetch('/api/rooms/'+code+'/state',{headers:{'X-Room-Token':s.token}})).json();}",code)

        host.locator('[data-room="start"]').click()
        expect(a.locator('.network-question')).to_be_visible()
        expect(b.locator('.network-question')).to_be_visible()
        for round_index in range(5):
            expect(host.locator('.room-round')).to_contain_text(f'Раунд {round_index+1}')
            current=snap(a)
            assert current['phase']=='question'
            assert 'correct' not in current['question']
            q=host.evaluate('(id)=>FizData.questions.find(q=>q.id===id)',current['question']['id'])
            if q['type']=='choice':
                right=next(o['id'] for o in current['question']['options'] if o['text']==q['options'][q['correct']])
                wrong=next(o['id'] for o in current['question']['options'] if o['id']!=right)
                a.locator(f'[data-room="select"][data-option="{right}"]').click()
                b.locator(f'[data-room="select"][data-option="{wrong}"]').click()
            else:
                for i,pair in enumerate(q['pairs']):
                    a.locator(f'[data-room-match="{i}"]').select_option(pair[1])
                    b.locator(f'[data-room-match="{i}"]').select_option(q['pairs'][(i+1)%6][1])
            if round_index==0:
                a.locator('[data-room="boost"]').click()
                a.screenshot(path=str(OUT/'player-question-mobile.png'),full_page=True)
            a.locator('[data-room="answer"]').click()
            b.locator('[data-room="answer"]').click()
            expect(a.locator('.answer-sent')).to_be_visible()
            expect(host.locator('.answers-meter')).to_contain_text('2 из 2')
            # Accepted answers survive a player refresh; no extra participant appears.
            if round_index==0:
                a.reload();a.wait_for_load_state('networkidle')
                expect(a.locator('.answer-sent')).to_be_visible()
                assert len(snap(a)['players'])==2
            host.locator('[data-room="reveal"]').click()
            expect(a.locator('.network-feedback.good')).to_be_visible()
            expect(b.locator('.network-feedback.miss')).to_be_visible()
            result=snap(a)
            assert result['myResult']['correct']
            assert result['myResult']['steps']>=q['level']
            assert next(p for p in result['players'] if p['name']=='Световые странники')['position']==0
            if round_index==0:
                host.screenshot(path=str(OUT/'room-field.png'),full_page=True)
                # A restart must preserve tokens, options, results and field positions.
                positions={p['id']:p['position'] for p in result['players']}
                server.terminate();server.wait(timeout=5);server=launch()
                host.reload();host.wait_for_load_state('networkidle')
                expect(host.locator('[data-room="next"]')).to_be_visible()
                assert {p['id']:p['position'] for p in snap(a)['players']}==positions
                host.reload();expect(host.locator('[data-room="next"]')).to_be_visible()
            if round_index==4:
                assert result['event']['id']=='boss'
                host.screenshot(path=str(OUT/'boss-round.png'),full_page=True)
            host.locator('[data-room="next"]').click()
        expect(host.locator('.network-finish')).to_be_visible()
        expect(a.locator('.network-finish')).to_be_visible()
        host.screenshot(path=str(OUT/'network-results.png'),full_page=True)
        assert snap(a)['players'][0]['name']=='Команда Ньютона'
        a.wait_for_function("JSON.parse(localStorage.getItem('fizogezik.v1')).networkRewards.length===1")
        xp=a.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).campaign.xp")
        assert xp==50
        assert a.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).campaign.daily.xp")==50
        a.reload();expect(a.locator('.network-finish')).to_be_visible()
        assert a.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).campaign.xp")==xp
        with host.expect_download() as info:
            host.locator('[data-room="export"]').click()
        info.value.save_as(str(OUT/'network-results.csv'))

        # Mathematical layout is local native MathML, not raw TeX or fake unicode fractions.
        host.goto(BASE+'#formulas')
        expect(host.locator('.formula-card')).to_have_count(20)
        host.wait_for_function('document.querySelectorAll("math mfrac").length>15')
        assert host.locator('math mover').count()>=3
        assert '\\frac' not in host.locator('main').inner_text()
        assert '$' not in host.locator('main').inner_text()
        assert host.locator('math').evaluate_all('(els)=>els.every(el=>el.namespaceURI==="http://www.w3.org/1998/Math/MathML"&&el.getBoundingClientRect().width>0)')
        host.screenshot(path=str(OUT/'formulas-desktop.png'),full_page=True)
        for width in (320,390,768,1024,1440):
            a.set_viewport_size({'width':width,'height':900})
            for route in ('rooms','room/'+code,'formulas'):
                a.goto(BASE+'#'+route)
                a.wait_for_timeout(150)
                assert a.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,route)
        a.set_viewport_size({'width':390,'height':844})
        a.goto(BASE+'#formulas');a.wait_for_timeout(200)
        a.screenshot(path=str(OUT/'formulas-mobile.png'),full_page=True)
        assert errors==[],errors
        # Room checkpoints and host keys must not be downloadable as static files.
        response=host.request.get(BASE+'data/rooms.json')
        assert response.status==403
        browser.close()
        print('PASS: host + two independent devices, code/QR, all rounds, boost, boss, server grading, field movement, reconnect, process restart, CSV, reward idempotency and 320–1440px MathML.')
        print('Screenshots:',OUT)
finally:
    server.terminate()
    try:server.wait(timeout=5)
    except subprocess.TimeoutExpired:server.kill()
