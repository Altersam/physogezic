"""Run the exported Godot in real Chromium/WebGL without COOP/COEP headers."""
from pathlib import Path
import argparse,json,subprocess,sys,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--rebuild',action='store_true')
args=parser.parse_args()
if args.rebuild:subprocess.run([sys.executable,str(ROOT/'tools'/'export_godot_web.py')],cwd=ROOT,check=True)
subprocess.run([sys.executable,str(ROOT/'tools'/'build_site.py')],cwd=ROOT,check=True)
OUT=Path(tempfile.gettempdir())/'opencode'/'physogezic-webgl'
OUT.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen([sys.executable,'-m','http.server','4180','--bind','127.0.0.1','--directory',str(ROOT/'dist')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
BASE='http://127.0.0.1:4180/site/'
try:
    for _ in range(50):
        try:urllib.request.urlopen(BASE,timeout=1);break
        except Exception:time.sleep(.1)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-vulkan'])
        page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
        page.set_default_timeout(120000)
        failures=[];console=[]
        page.on('pageerror',lambda e:failures.append(str(e)))
        page.on('console',lambda m:console.append(m.type+': '+m.text))
        page.goto(BASE);page.wait_for_load_state('networkidle')
        expect(page.locator('#launch-web')).to_be_visible()
        expect(page.locator('#launch-godot')).to_be_visible()
        page.screenshot(path=str(OUT/'launcher-desktop.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.locator('#launch-godot').click()
        try:
            page.wait_for_function('window.physogezicLoaded===true && window.physogezicGameState?.phase==="draw"',timeout=120000)
        except Exception:
            print('\n'.join(console));print(page.locator('#status').inner_text())
            page.screenshot(path=str(OUT/'launch-failure.png'),full_page=True)
            raise
        assert not page.evaluate('crossOriginIsolated'),'The test must exercise ordinary GitHub Pages hosting'
        assert page.evaluate('window.physogezicGameState.remaining')==95
        assert page.evaluate('window.physogezicGameState.players.length')==2
        canvas_metrics=page.evaluate('''() => {const c=document.querySelector('#canvas'),r=c.getBoundingClientRect();return {width:c.width,height:c.height,cssWidth:r.width,cssHeight:r.height,dpr:devicePixelRatio};}''')
        assert canvas_metrics['width']>=canvas_metrics['cssWidth']*canvas_metrics['dpr']-1,canvas_metrics
        assert canvas_metrics['height']>=canvas_metrics['cssHeight']*canvas_metrics['dpr']-1,canvas_metrics
        print('CANVAS_RESOLUTION_PASS:',canvas_metrics)
        response=page.request.get(BASE+'godot/index.wasm')
        assert 'application/wasm' in response.headers.get('content-type','')
        page.screenshot(path=str(OUT/'godot-webgl-running.png'),full_page=True)

        # Реальные пропорции экрана, включая ультраширокий 3440×1440.
        # Canvas обязан заполнять доступную область без рамок 16:9 и чёрных полос.
        for width,height in ((1280,720),(1920,1080),(2560,1440),(3440,1440),(3840,2160),(1024,768)):
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_function('''() => {const c=document.querySelector('#canvas'),r=c.getBoundingClientRect();return c.width>=r.width*devicePixelRatio-1&&c.height>=r.height*devicePixelRatio-1;}''',timeout=20000)
            metrics=page.evaluate('''() => {const c=document.querySelector('#canvas'),s=document.querySelector('#stage'),r=c.getBoundingClientRect(),q=s.getBoundingClientRect();return {width:c.width,height:c.height,cssWidth:r.width,cssHeight:r.height,stageWidth:q.width,stageHeight:q.height,dpr:devicePixelRatio,overflow:document.documentElement.scrollWidth>innerWidth};}''')
            assert abs(metrics['cssWidth']-metrics['stageWidth'])<=2,metrics
            assert abs(metrics['cssHeight']-metrics['stageHeight'])<=2,metrics
            assert not metrics['overflow'],metrics
            assert metrics['width']>=metrics['cssWidth']*metrics['dpr']-1,metrics
            assert metrics['height']>=metrics['cssHeight']*metrics['dpr']-1,metrics
            page.screenshot(path=str(OUT/f'godot-{width}x{height}.png'),full_page=True,timeout=120000)
            print('RESPONSIVE_CANVAS_PASS:',width,height,metrics)
        page.set_viewport_size({'width':3440,'height':1440})
        page.locator('#fullscreen').click()
        page.wait_for_function('document.fullscreenElement!==null')
        page.wait_for_timeout(450)
        fullscreen_metrics=page.evaluate('''() => {const c=document.querySelector('#canvas'),r=c.getBoundingClientRect();return {width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight};}''')
        assert abs(fullscreen_metrics['width']-fullscreen_metrics['viewportWidth'])<=1,fullscreen_metrics
        assert abs(fullscreen_metrics['height']-fullscreen_metrics['viewportHeight'])<=1,fullscreen_metrics
        page.screenshot(path=str(OUT/'godot-fullscreen-3440x1440.png'),full_page=True)
        page.evaluate('document.exitFullscreen()')
        page.wait_for_function('document.fullscreenElement===null')
        page.set_viewport_size({'width':1440,'height':1000})
        page.wait_for_timeout(450)

        def state():return page.evaluate('window.physogezicGameState')
        def click_control(text):
            box=page.locator('#canvas').bounding_box();assert box
            for scroll_attempt in range(8):
                data=state();control=next((c for c in data['controls'] if c['text']==text),None)
                assert control is not None,(text,data['controls'])
                x,y,w,h=control['rect'];vw,vh=data['viewport']
                if y>=0 and y+h<=vh:break
                page.mouse.move(box['x']+box['width']*.84,box['y']+box['height']*.72)
                page.mouse.wheel(0,420 if y+h>vh else -420)
                page.wait_for_timeout(300)
            else:raise AssertionError(f'Control did not scroll into view: {text}')
            page.mouse.click(box['x']+(x+w/2)/vw*box['width'],box['y']+(y+h/2)/vh*box['height'])

        click_control('Ведущий: стол')
        page.wait_for_function('window.physogezicGameState.hostMode===true')
        assert not any(c['text'].startswith('Открыть карту') for c in state()['controls'])
        assert not state()['sharedContent']
        page.screenshot(path=str(OUT/'godot-host-table.png'),full_page=True)
        click_control('Участник: карты')
        page.wait_for_function('window.physogezicGameState.hostMode===false')
        assert any(c['text']=='Открыть карту 1' for c in state()['controls'])
        print('HOST_PARTICIPANT_WEBGL_PASS')
        click_control('Открыть карту 1')
        page.wait_for_function('window.physogezicGameState.phase==="answer"',timeout=20000)
        card=state();assert card['remaining']==94
        page.screenshot(path=str(OUT/'godot-webgl-card.png'),full_page=True)
        click_control('Ведущий: стол')
        page.wait_for_function('window.physogezicGameState.hostMode===true && window.physogezicGameState.sharedContent===true')
        assert not any(c['text']=='Пока не знаю' for c in state()['controls']),'Host must not receive answer controls'
        page.screenshot(path=str(OUT/'godot-host-question.png'),full_page=True)
        click_control('Участник: карты')
        page.wait_for_function('window.physogezicGameState.hostMode===false')
        if card['question']['type']=='match':
            click_control('Проверить переходы')
        else:
            bank=json.loads((ROOT/'Godot3D'/'data'/'questions.json').read_text(encoding='utf-8'))+json.loads((ROOT/'Godot3D'/'data'/'experiments.json').read_text(encoding='utf-8'))
            q=next(q for q in bank if q['id']==card['question']['id'])
            click_control(q['options'][q['correct']])
        page.wait_for_function('window.physogezicGameState.phase==="feedback"',timeout=20000)
        resolved=state()
        assert resolved['players'][resolved['turn']]['score']==(card['question']['level'] if card['question']['type']=='choice' else 0)
        page.screenshot(path=str(OUT/'godot-webgl-feedback.png'),full_page=True)
        click_control('Продолжить путь →')
        page.wait_for_function('window.physogezicGameState.phase==="draw" && window.physogezicGameState.turn===1',timeout=20000)
        page.locator('#canvas').focus();page.keyboard.press('2')
        page.wait_for_function('window.physogezicGameState.phase==="answer"',timeout=20000)
        click_control('Пока не знаю')
        page.wait_for_function('window.physogezicGameState.phase==="feedback"',timeout=20000)
        assert state()['players'][1]['score']==0
        click_control('Звук: вкл')
        page.wait_for_function('window.physogezicGameState.controls.some(c=>c.text==="Звук: выкл")')
        click_control('Эффекты: вкл')
        page.wait_for_function('window.physogezicGameState.controls.some(c=>c.text==="Эффекты: выкл")')

        # Находим настоящий опыт в обычной перемешанной колоде. Эффекты уже
        # отключены, поэтому переходы быстрые, а игровые правила не изменены.
        click_control('Продолжить путь →')
        page.wait_for_function('window.physogezicGameState.phase==="draw"',timeout=20000)
        found_lab=False
        for attempt in range(45):
            click_control('Открыть карту 1')
            page.wait_for_function('window.physogezicGameState.phase==="answer"',timeout=20000)
            if str(state()['question']['id']).startswith('lab'):
                found_lab=True
                break
            click_control('Пока не знаю')
            page.wait_for_function('window.physogezicGameState.phase==="feedback"',timeout=20000)
            click_control('Продолжить путь →')
            page.wait_for_function('window.physogezicGameState.phase==="draw"',timeout=20000)
        assert found_lab,'No laboratory found in the mixed deck'
        page.set_viewport_size({'width':3440,'height':1440})
        page.wait_for_timeout(500)
        page.locator('#fullscreen').click()
        page.wait_for_function('document.fullscreenElement!==null')
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'godot-lab-fullscreen-3440x1440.png'),full_page=True)
        page.evaluate('document.exitFullscreen()')
        page.wait_for_function('document.fullscreenElement===null')
        page.set_viewport_size({'width':1280,'height':720})
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'godot-lab-1280x720.png'),full_page=True)
        click_control('Ведущий: стол')
        page.wait_for_function('window.physogezicGameState.hostMode===true && window.physogezicGameState.sharedContent===true')
        assert state()['labVisible'],'Host must broadcast the actual 3D laboratory'
        assert not any(c['text']=='Пока не знаю' for c in state()['controls'])
        page.screenshot(path=str(OUT/'godot-host-lab.png'),full_page=True)
        click_control('Участник: карты')
        page.wait_for_function('window.physogezicGameState.hostMode===false && window.physogezicGameState.labVisible===true')
        print('HOST_SHARED_LAB_PASS:',state()['question']['id'])
        for width,height in ((360,800),(390,844),(768,1024)):
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_function('window.physogezicGameState.mobileLayout===true && window.physogezicGameState.labVisible===true')
            page.wait_for_timeout(400)
            data=state();vw,vh=data['viewport']
            assert vw<=700 and vh<=1000,(width,height,data['viewport'],'Desktop logical scale leaked into portrait')
            for control in data['controls']:
                if control['text']=='Стол учителя' or control['text'].endswith(' игр.'):
                    x,y,w,h=control['rect']
                    assert x>=0 and y>=0 and x+w<=vw+1 and y+h<=vh+1,(width,height,control,data['viewport'])
            page.screenshot(path=str(OUT/f'godot-mobile-lab-{width}x{height}.png'),full_page=True)
            print('MOBILE_LAB_PASS:',width,height,data['viewport'])
        click_control('Пока не знаю')
        page.wait_for_function('window.physogezicGameState.phase==="feedback"',timeout=20000)
        click_control('Продолжить путь →')
        page.wait_for_function('window.physogezicGameState.phase==="draw"',timeout=20000)
        page.screenshot(path=str(OUT/'godot-mobile-participant-768x1024.png'),full_page=True)
        click_control('Открыть карту 1')
        page.wait_for_function('window.physogezicGameState.phase==="answer"',timeout=20000)
        assert state()['mobileLayout']
        page.screenshot(path=str(OUT/'godot-mobile-answer-768x1024.png'),full_page=True)
        print('MOBILE_PARTICIPANT_INPUT_PASS')
        print('RESPONSIVE_LAB_PASS:',state()['question']['id'])
        errors=page.evaluate('window.physogezicErrors')
        assert not errors,errors
        assert not failures,failures
        page.locator('.back').click()
        expect(page.locator('#launch-web')).to_be_visible()
        page.locator('#launch-web').click()
        expect(page.locator('.real-game-board')).to_be_visible()
        page.goto(BASE+'#formulas')
        expect(page.locator('.formula-card')).to_have_count(20)
        assert 'play.html#formulas' in page.url
        for width in (320,390,768):
            page.set_viewport_size({'width':width,'height':844});page.goto(BASE)
            expect(page.locator('#launch-web')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        page.set_viewport_size({'width':390,'height':844})
        page.goto(BASE)
        page.screenshot(path=str(OUT/'launcher-mobile.png'),full_page=True)
        browser.close()
        print('PASS: choice page, actual single-thread Godot WebGL startup, 95 mixed cards, real card/answer/score/turn input, HiDPI canvas, keyboard, sound/effects toggles, back navigation and repository URL prefix.')
        print('Screenshots:',OUT)
finally:
    server.terminate();server.wait(timeout=5)
