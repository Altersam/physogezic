"""Real Godot host + two independent phone clients against the room server."""
from pathlib import Path
import json,os,shutil,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'images'/'network-3d';OUT.mkdir(parents=True,exist_ok=True)
DATA=Path(tempfile.mkdtemp(prefix='physogezic-network-',dir=tempfile.gettempdir()))
PORT=4181;BASE=f'http://127.0.0.1:{PORT}'
env={**os.environ,'PORT':str(PORT),'FIZ_DATA_DIR':str(DATA),'HOST':'127.0.0.1'}
NODE=shutil.which('node') or 'node'
server=subprocess.Popen([NODE,str(ROOT/'server.cjs')],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
bank=json.loads((ROOT/'Godot3D'/'data'/'questions.json').read_text(encoding='utf-8'))+json.loads((ROOT/'Godot3D'/'data'/'experiments.json').read_text(encoding='utf-8'))
def wait_server():
    for _ in range(80):
        try:urllib.request.urlopen(BASE+'/api/server-info',timeout=1);return
        except Exception:time.sleep(.1)
    raise RuntimeError('Room server did not start')
wait_server()
def credentials(page,code):return page.evaluate("code=>JSON.parse(localStorage.getItem('physogezic.godot3d.'+code))",code)
def snapshot(page,code):
    c=credentials(page,code)
    return page.evaluate("async({code,token})=>{const r=await fetch('/api/rooms/'+code+'/state',{headers:{'X-Room-Token':token}});return await r.json();}",{'code':code,'token':c['token']})
def click_control(page,text):
    page.wait_for_function("text=>window.physogezicGameState?.controls.some(c=>c.text===text)",arg=text,timeout=20000)
    box=page.locator('#canvas').bounding_box();data=page.evaluate('window.physogezicGameState');c=next(c for c in data['controls'] if c['text']==text);x,y,w,h=c['rect'];vw,vh=data['viewport']
    page.mouse.click(box['x']+(x+w/2)/vw*box['width'],box['y']+(y+h/2)/vh*box['height'])
def answer_current(page,code,correct=True):
    state=snapshot(page,code);q=state['question'];source=next(c for c in bank if c['id']==q['id'])
    if q['type']=='match':
        for i,pair in enumerate(source['pairs']):page.locator(f'[data-pair="{i}"]').select_option(pair[1])
    else:
        wanted=source['options'][source['correct']] if correct else next(v for i,v in enumerate(source['options']) if i!=source['correct'])
        option=next(o for o in q['options'] if o['text']==wanted)
        page.locator(f'[data-option="{option["id"]}"]').click()
    page.locator('#send-answer').click()
    expect(page.locator('.result')).to_be_visible()
    return source
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-vulkan'])
        host=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
        contexts=[browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2) for _ in range(2)]
        phones=[c.new_page() for c in contexts];errors=[]
        for page in [host,*phones]:page.on('pageerror',lambda e:errors.append(e.stack))
        host.goto(BASE+'/godot/');host.locator('#network-host').click()
        host.wait_for_function('window.physogezicLoaded===true && window.physogezicGameState?.networkMode===true',timeout=120000)
        code=host.url.split('room=')[1];assert len(code)==6
        expect(host.locator('#host-lobby')).to_be_visible();host.locator('.room-qr').wait_for();host.wait_for_function('document.querySelector(".room-qr").naturalWidth>0')
        qr_check=host.evaluate("""async code=>{const info=await(await fetch('/api/server-info')).json();const auto=await(await fetch(`/api/rooms/${code}/qr?target=godot`)).text();const explicit=await(await fetch(`/api/rooms/${code}/qr?target=godot&base=${encodeURIComponent(info.urls[0])}`)).text();return {base:info.urls[0],same:auto===explicit};}""",code)
        assert qr_check['same'],qr_check
        print('NETWORK_QR_PASS: invitation uses the server-selected LAN/public address:',qr_check['base'])
        host.screenshot(path=str(OUT/'host-invite.png'),full_page=True)
        for page,name in zip(phones,['Аня','Борис']):
            page.goto(BASE+'/godot/?room='+code);page.locator('#player-name').fill(name);page.locator('#join-form button').click();expect(page.locator('.player-score')).to_be_visible()
        expect(host.locator('.lobby-players span')).to_have_count(2,timeout=20000);host.locator('#network-start').click()
        expect(phones[0].locator('.phone-card')).to_have_count(3)
        assert phones[1].locator('.phone-card').count()==0
        phones[0].screenshot(path=str(OUT/'phone-draw.png'),full_page=True)
        phones[0].locator('.phone-card').first.click();host.wait_for_function('window.physogezicGameState?.phase==="answer" && window.physogezicGameState.networkMode',timeout=20000)
        state=snapshot(phones[0],code);host_state=snapshot(host,code)
        assert 'options' not in host_state['question'] and 'correct' not in host_state['question'] and 'explanation' not in host_state['question']
        assert 'correct' not in state['question'] and 'explanation' not in state['question']
        assert len(state['question'].get('options',[])) in (0,4)
        host.screenshot(path=str(OUT/'host-question.png'),full_page=True);phones[0].screenshot(path=str(OUT/'phone-question.png'),full_page=True)
        q=answer_current(phones[0],code,True);host.wait_for_function('window.physogezicGameState?.phase==="feedback"',timeout=20000)
        after=snapshot(phones[0],code);me=next(p for p in after['players'] if p['id']==after['me']);assert me['score']==q['level']
        # Repeating the exact request cannot award another move.
        token=credentials(phones[0],code)['token'];repeat=phones[0].evaluate("async({code,token,roundId,answer})=>{const r=await fetch('/api/rooms/'+code+'/answer',{method:'POST',headers:{'Content-Type':'application/json','X-Room-Token':token},body:JSON.stringify({roundId,answer,correct:true,score:999})});return {status:r.status,body:await r.json()};}",{'code':code,'token':token,'roundId':after['roundId'],'answer':'forged'})
        assert repeat['status']==200;assert next(p for p in snapshot(phones[0],code)['players'] if p['id']==after['me'])['score']==q['level']
        assert 'correct' not in snapshot(host,code)['question']
        click_control(host,'Продолжить путь →');expect(phones[1].locator('.phone-card')).to_have_count(3)
        assert phones[0].locator('.phone-card').count()==0
        # Find a genuine mixed-deck experiment and show its MeshInstance3D scene on the host.
        found=False
        for turn in range(95):
            current=phones[0] if snapshot(host,code)['activePlayerId']==snapshot(phones[0],code)['me'] else phones[1]
            expect(current.locator('.phone-card').first).to_be_visible();current.locator('.phone-card').first.click()
            host.wait_for_function('window.physogezicGameState?.phase==="answer"',timeout=20000)
            state=snapshot(current,code)
            if state['question']['kind']=='experiment':found=True;break
            current.locator('#skip-answer').click();expect(current.locator('#next-turn')).to_be_visible();current.locator('#next-turn').click()
        assert found,'No experiment in the 95-card network deck'
        host.wait_for_function('window.physogezicGameState?.labVisible===true && window.physogezicGameState?.sharedContent===true',timeout=20000)
        lab_id=state['question']['id'];assert 'options' not in snapshot(host,code)['question']
        current.reload();expect(current.locator('.question')).to_be_visible();assert snapshot(current,code)['question']['id']==lab_id
        host.screenshot(path=str(OUT/'host-laboratory.png'),full_page=True);current.screenshot(path=str(OUT/'phone-laboratory.png'),full_page=True)
        before=next(p for p in snapshot(current,code)['players'] if p['id']==snapshot(current,code)['me'])['score'];q=answer_current(current,code,True)
        after=snapshot(current,code);assert next(p for p in after['players'] if p['id']==after['me'])['score']==min(15,before+q['level'])
        host.wait_for_function('window.physogezicGameState?.phase==="feedback" && window.physogezicGameState?.labVisible===true')
        assert not errors,errors;assert host.evaluate('window.physogezicErrors')==[]
        print('NETWORK_GODOT_PASS: real WebGL host, QR/code, two phone contexts, hidden answers, idempotent scores, turn transfer, true 3D lab and reconnect.')
        print('Screenshots:',OUT)
        browser.close()
finally:
    server.terminate()
    try:server.wait(timeout=5)
    except subprocess.TimeoutExpired:server.kill()
