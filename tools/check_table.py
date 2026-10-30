"""The game must be a board with cards before it is a connected quiz."""
from pathlib import Path
import os,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(tempfile.gettempdir())/'opencode'/'fizogezik-table'
OUT.mkdir(parents=True,exist_ok=True)
DATA=Path(tempfile.mkdtemp(prefix='room-',dir=OUT))
BASE='http://127.0.0.1:4176/'
env={**os.environ,'PORT':'4176','FIZ_DATA_DIR':str(DATA),'HOST':'127.0.0.1'}
def launch():
    p=subprocess.Popen(['node',str(ROOT/'server.cjs')],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    for _ in range(60):
        try:urllib.request.urlopen(BASE+'api/server-info',timeout=1);return p
        except Exception:time.sleep(.1)
    raise RuntimeError('server startup')
server=launch()
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--disable-gpu'])
        host=browser.new_page(viewport={'width':1440,'height':1050})
        a=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        b=browser.new_page(viewport={'width':1280,'height':900})
        errors=[]
        for page in (host,a,b):page.on('pageerror',lambda e:errors.append(str(e)))
        host.goto(BASE+'#rooms');host.wait_for_load_state('networkidle')
        assert host.locator('#room-mode').input_value()=='board'
        assert host.locator('#room-seconds').input_value()=='0'
        host.locator('#room-count').select_option('5')
        host.locator('[data-room="create"]').click()
        expect(host.locator('.board-room')).to_be_visible()
        code=host.url.split('/')[-1]
        for page,name in ((a,'Аня'),(b,'Борис')):
            page.goto(BASE+'#room/'+code);page.locator('#room-name').fill(name);page.locator('[data-room="join"]').click()
            expect(page.locator('.table-watch')).to_be_visible()
        expect(host.locator('.table-seat')).to_have_count(2)
        host.wait_for_function('document.querySelector(".qr-invite img").naturalWidth>0')
        host.locator('[data-action="rules"]').click()
        expect(host.locator('#dialog-title')).to_have_text('Физогэзик — правила настолки')
        host.keyboard.press('Escape')
        host.locator('[data-room="start"]').click()
        expect(a.locator('[data-table="draw"]:not([disabled])')).to_have_count(3)
        expect(b.locator('[data-table="draw"]:not([disabled])')).to_have_count(0)
        expect(host.locator('.table-cell')).to_have_count(16)
        host.screenshot(path=str(OUT/'table-closed-cards.png'),full_page=True)
        a.screenshot(path=str(OUT/'phone-draw.png'),full_page=True)
        def snap(page):
            return page.evaluate("async(code)=>{const s=JSON.parse(localStorage.getItem('fiz.rooms.v1'))[code];return(await fetch('/api/rooms/'+code+'/state',{headers:{'X-Room-Token':s.token}})).json();}",code)
        def answer_right(page):
            s=snap(page);q=page.evaluate('(id)=>FizData.questions.find(q=>q.id===id)',s['question']['id'])
            if q['type']=='choice':
                right=next(o['id'] for o in s['question']['options'] if o['text']==q['options'][q['correct']])
                page.locator(f'[data-table="select"][data-option="{right}"]').click()
            else:
                for i,pair in enumerate(q['pairs']):page.locator(f'[data-table-match="{i}"]').select_option(pair[1])
            page.locator('[data-table="answer"]').click()
            expect(page.locator('.table-answer-sent')).to_be_visible()
            return q
        for i in range(5):
            player=a if i%2==0 else b
            expect(player.locator('[data-table="draw"]:not([disabled])').first).to_be_visible()
            before=snap(player)
            assert before['phase']=='draw' and 'question' not in before
            player.locator('[data-table="draw"]').last.click()
            expect(player.locator('.paper-card.question-side')).to_be_visible()
            expect(host.locator('.paper-card.question-side')).to_be_visible()
            if i==0:
                host.screenshot(path=str(OUT/'table-open-card.png'),full_page=True)
                player.screenshot(path=str(OUT/'phone-card.png'),full_page=True)
                # The selected physical card must persist over refresh, without another draw.
                qid=snap(player)['question']['id'];player.reload();player.wait_for_load_state('networkidle')
                expect(player.locator('.paper-card.question-side')).to_be_visible()
                assert snap(player)['question']['id']==qid
            q=answer_right(player)
            expect(player.locator('[data-table="reveal"]')).to_be_visible()
            player.locator('[data-table="reveal"]').click()
            expect(player.locator('.paper-card.answer-side')).to_be_visible()
            expect(host.locator('.paper-card.answer-side')).to_be_visible()
            after=snap(player);mine=next(p for p in after['players'] if p['id']==after['me'])
            old=next(p for p in before['players'] if p['id']==before['me'])
            assert mine['position']==min(15,old['position']+q['level'])
            assert after['discardCount']==i+1
            if i==0:
                host.screenshot(path=str(OUT/'table-resolved.png'),full_page=True)
                server.terminate();server.wait(timeout=5);server=launch()
                host.reload();host.wait_for_load_state('networkidle')
                expect(host.locator('.paper-card.answer-side')).to_be_visible()
            player.locator('[data-table="next"]').click()
        expect(a.locator('.table-finish')).to_be_visible()
        expect(host.locator('.table-finish')).to_be_visible()
        assert len(snap(a)['history'])==5
        host.screenshot(path=str(OUT/'table-finish.png'),full_page=True)

        # Together mode still starts with a closed deck chosen by the current player.
        host.goto(BASE+'#rooms');host.locator('#table-pace').select_option('together');host.locator('#room-count').select_option('5')
        host.locator('[data-room="create"]').click();expect(host.locator('.board-room')).to_be_visible();code=host.url.split('/')[-1]
        for page,name in ((a,'Аня'),(b,'Борис')):
            page.goto(BASE+'#room/'+code);page.locator('#room-name').fill(name);page.locator('[data-room="join"]').click()
        expect(host.locator('.table-seat')).to_have_count(2);host.locator('[data-room="start"]').click()
        a.locator('[data-table="draw"]').first.click();expect(b.locator('[data-table="answer"]')).to_be_visible()
        answer_right(a);assert snap(a)['phase']=='question'
        expect(a.locator('[data-table="reveal"]')).to_have_count(0)
        answer_right(b);a.locator('[data-table="reveal"]').click();expect(b.locator('.paper-card.answer-side')).to_be_visible()
        assert all(p['position']>0 for p in snap(a)['players'])

        # Teacher mode accepts prose and uses explicit evaluation of the same open card.
        host.goto(BASE+'#rooms');host.locator('#table-check').select_option('host');host.locator('[data-room="create"]').click()
        expect(host.locator('.board-room')).to_be_visible();code=host.url.split('/')[-1]
        a.goto(BASE+'#room/'+code);a.locator('#room-name').fill('Аня');a.locator('[data-room="join"]').click()
        expect(host.locator('.table-seat')).to_have_count(1);host.locator('[data-room="start"]').click();a.locator('[data-table="draw"]').first.click()
        a.locator('#table-free-answer').fill('Мой ответ своими словами, с условиями применения закона.')
        a.reload();expect(a.locator('#table-free-answer')).to_have_value('Мой ответ своими словами, с условиями применения закона.')
        a.locator('[data-table="answer"]').click();host.locator('[data-table="check"]').click()
        expect(host.locator('.table-oral-review')).to_be_visible();host.locator('[data-table="grade"][data-grade="true"]').click()
        expect(host.locator('[data-table="reveal"]')).to_be_enabled();host.locator('[data-table="reveal"]').click()
        expect(a.locator('.paper-card.answer-side')).to_be_visible()
        assert next(p for p in snap(a)['players'] if p['id']==snap(a)['me'])['position']>0

        # Direct-file play uses the very same board, back artwork and card animation.
        local=browser.new_page(viewport={'width':1440,'height':1000})
        local.on('pageerror',lambda e:errors.append(str(e)))
        local.goto((ROOT/'index.html').as_uri());local.wait_for_load_state('networkidle')
        expect(local.locator('.table-home-board')).to_be_visible();local.screenshot(path=str(OUT/'local-home.png'),full_page=True)
        local.locator('[data-action="start"]').click();expect(local.locator('[data-action="draw-card"]')).to_have_count(3)
        expected=local.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).game.deck[2]")
        local.locator('[data-action="draw-card"][data-slot="2"]').click()
        assert local.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).game.active.id")==expected
        expect(local.locator('.paper-card')).to_be_visible()
        for width in (320,390,768,1024,1440):
            a.set_viewport_size({'width':width,'height':900});a.reload();a.wait_for_load_state('networkidle')
            expect(a.locator('.real-game-board')).to_be_visible()
            assert a.evaluate('document.documentElement.scrollWidth<=innerWidth'),('room',width)
            local.set_viewport_size({'width':width,'height':900})
            assert local.evaluate('document.documentElement.scrollWidth<=innerWidth'),('local',width)
        assert errors==[],errors
        print('PASS: closed cards, chosen draw, actual flip, original 1–3 steps, turn ownership, pass turn, phones on the same board, shared-answer variant, teacher grading, reload, restart, offline play and 320–1440px.')
        print('Screenshots:',OUT)
        browser.close()
finally:
    server.terminate()
    try:server.wait(timeout=5)
    except subprocess.TimeoutExpired:server.kill()
