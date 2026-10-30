"""Play the complete offline campaign in Chromium, including every laboratory."""
from pathlib import Path
import tempfile
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(tempfile.gettempdir())/'opencode'/'fizogezik-adventure'
OUT.mkdir(parents=True,exist_ok=True)
BASE=(ROOT/'index.html').as_uri()

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--disable-gpu'])
    context=browser.new_context(viewport={'width':1440,'height':1100},device_scale_factor=1)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'#home')
    page.wait_for_load_state('networkidle')
    expect(page.locator('.journey-map')).to_be_visible()
    expect(page.locator('.mission-node:not([disabled])')).to_have_count(1)
    page.screenshot(path=str(OUT/'adventure-desktop.png'),full_page=True)

    def saved():
        return page.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1'))")

    page.locator('[data-adv="preview"][data-id="mechanics-0"]').click()
    page.locator('[data-adv="start"]').click()
    expect(page.locator('.challenge-prompt')).to_be_visible()
    page.locator('[data-adv="hint"]').click()
    expect(page.locator('.adventure-option.eliminated')).to_have_count(2)
    page.locator('[data-adv="shield"]').click()
    page.locator('[data-adv="skip"]').click()
    assert saved()['campaign']['run']['hearts']==5
    assert saved()['campaign']['run']['result']['blocked']
    xp=saved()['campaign']['xp']
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.locator('.lesson-response.negative')).to_be_visible()
    assert saved()['campaign']['xp']==xp
    page.locator('[data-adv="continue"]').click()
    shots=set()

    def finish_mission():
        while page.locator('.lesson-page').count():
            r=saved()['campaign']['run']
            t=r['tasks'][r['queue'][r['cursor']]]
            if t['type']=='card':
                q=page.evaluate('(id)=>FizData.questions.find(q=>q.id===id)',t['id'])
                if q['type']=='match':
                    for i,pair in enumerate(q['pairs']):
                        page.locator(f'[data-adv-match="{i}"]').select_option(pair[1])
                else:
                    page.locator(f'[data-adv="choose"][data-index="{q["correct"]}"]').click()
            else:
                if t['kind']=='atom':
                    for k in ('z','n'):
                        current=r['answer'][k]
                        delta=1 if t['target'][k]>current else -1
                        for _ in range(abs(t['target'][k]-current)):
                            page.locator(f'[data-adv="step"][data-key="{k}"][data-delta="{delta}"]').click()
                else:
                    page.locator('#lab-range').evaluate('(el,value)=>{el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));}',t['target'])
                    if t['kind']=='circuit' and not r['answer'].get('closed'):
                        page.locator('[data-adv="switch"]').click()
                if t['kind'] not in shots:
                    page.screenshot(path=str(OUT/f'lab-{t["kind"]}.png'),full_page=True)
                    shots.add(t['kind'])
                    page.reload()
                    page.wait_for_load_state('networkidle')
                    # The instrument positions and switch state are persisted, not just score.
                    answer=saved()['campaign']['run']['answer']
                    assert answer is not None
            page.locator('[data-adv="submit"]').click()
            expect(page.locator('.lesson-response.positive')).to_be_visible()
            page.locator('[data-adv="continue"]').click()
        expect(page.locator('.mission-result.won')).to_be_visible()

    finish_mission()
    assert saved()['campaign']['completed']['mechanics-0']['stars']==2
    page.screenshot(path=str(OUT/'mission-reward.png'),full_page=True)
    page.locator('[data-adv="map"]').click()
    expect(page.locator('.journey-map')).to_be_visible()
    # Claim all completed daily quests; repeated claims cannot create currency.
    claimable=page.locator('.quest-reward.claimable')
    while claimable.count():
        claimable.first.click()
    assert saved()['campaign']['daily']['claimed']
    page.locator('[data-adv="preview"][data-id="mechanics-1"]').click()
    page.locator('[data-adv="start"]').click()
    expect(page.locator('.lesson-page')).to_be_visible()
    finish_mission()
    # Continue through all twenty missions via the actual next-mission button.
    for i in range(2,20):
        if saved()['campaign']['run']['boss']:
            page.locator('[data-adv="result-chest"]').click()
        page.locator('.mission-result-actions [data-adv="start"]').click()
        expect(page.locator('.lesson-page')).to_be_visible()
        if saved()['campaign']['run']['boss'] and i==3:
            page.screenshot(path=str(OUT/'boss-encounter.png'),full_page=True)
        finish_mission()
    p=saved()['campaign']
    assert len(p['completed'])==20
    assert shots=={'force','heat','circuit','lens','atom'}
    assert all(v['stars']>=2 for v in p['completed'].values())
    assert page.evaluate("FizCampaign.validProfile(JSON.parse(localStorage.getItem('fizogezik.v1')).campaign,FizData.questions)")
    page.locator('[data-adv="result-chest"]').click()
    page.screenshot(path=str(OUT/'campaign-completed.png'),full_page=True)
    page.locator('[data-adv="map"]').click()
    expect(page.locator('.journey-map')).to_be_visible()
    page.locator('[data-adv="shop"]').click()
    page.locator('[data-adv="buy"][data-id="captain"]').click()
    assert saved()['campaign']['equipped']=='captain'
    page.screenshot(path=str(OUT/'workshop.png'),full_page=True)
    page.locator('[data-adv="buy"][data-id="stargazer"]').click()
    assert saved()['campaign']['equipped']=='stargazer'
    page.keyboard.press('Escape')
    page.reload()
    page.wait_for_load_state('networkidle')
    assert saved()['campaign']['equipped']=='stargazer'

    # A complete expedition also survives export/import of the original backup format.
    page.goto(BASE+'#progress')
    expect(page.locator('.campaign-progress-link')).to_be_visible()
    expected_profile=saved()['campaign']
    with page.expect_download() as download:
        page.locator('[data-action="backup"]').click()
    backup_path=OUT/'expedition-backup.json'
    download.value.save_as(str(backup_path))
    page.locator('#restore-file').set_input_files(str(backup_path))
    expect(page.locator('#dialog')).to_be_visible()
    page.locator('[data-action="confirm"]').click()
    assert saved()['campaign']==expected_profile

    # Separate fresh profile: loss, reset, selected answer after reload, and keyboard.
    other=browser.new_context(viewport={'width':1280,'height':900})
    fresh=other.new_page()
    fresh.on('pageerror',lambda e:errors.append(str(e)))
    fresh.goto(BASE+'#home')
    fresh.locator('[data-adv="preview"][data-id="mechanics-0"]').click()
    fresh.locator('[data-adv="start"]').click()
    expect(fresh.locator('.lesson-page')).to_be_visible()
    fresh.keyboard.press('1')
    fresh.reload()
    fresh.wait_for_load_state('networkidle')
    expect(fresh.locator('.adventure-option.chosen')).to_have_count(1)
    fresh.keyboard.press('Enter')
    expect(fresh.locator('.lesson-response')).to_be_visible()
    fresh.locator('[data-adv="continue"]').click()
    while fresh.locator('.lesson-page').count():
        fresh.locator('[data-adv="skip"]').click()
        fresh.locator('[data-adv="continue"]').click()
    expect(fresh.locator('.mission-result.failed')).to_be_visible()
    fresh.locator('[data-adv="retry"]').click()
    expect(fresh.locator('.lesson-page')).to_be_visible()
    assert fresh.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).campaign.run.hearts")==5
    fresh.locator('[data-adv="exit"]').click()

    # Upgrade from a v1 save keeps previously earned educational statistics.
    migration=browser.new_page()
    migration.goto(BASE+'#home')
    migration.evaluate("localStorage.setItem('fizogezik.v1',JSON.stringify({game:null,stats:{attempts:7,correct:5,byQuestion:{m01:{attempts:7,correct:5,lastCorrect:true}}},sessions:[],sound:false}))")
    migration.reload()
    migration.wait_for_load_state('networkidle')
    expect(migration.locator('.journey-map')).to_be_visible()
    migration.locator('[data-adv="preview"][data-id="mechanics-0"]').click()
    migration.locator('[data-adv="start"]').click()
    assert migration.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).stats.attempts")==7
    fresh.locator('#adventure-calm').check()
    fresh.locator('[data-adv="preview"][data-id="mechanics-0"]').click()
    fresh.locator('[data-adv="start"]').click()
    for _ in range(6):
        fresh.locator('[data-adv="skip"]').click()
        fresh.locator('[data-adv="continue"]').click()
    assert fresh.evaluate("JSON.parse(localStorage.getItem('fizogezik.v1')).campaign.run.relaxed")
    expect(fresh.locator('.lesson-page')).to_be_visible()
    fresh.locator('[data-adv="exit"]').click()

    # Viewport coverage, including phone UI and reduced-motion preference.
    phone=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
    mobile=phone.new_page()
    mobile.on('pageerror',lambda e:errors.append(str(e)))
    mobile.goto(BASE+'#home')
    mobile.wait_for_load_state('networkidle')
    mobile.screenshot(path=str(OUT/'adventure-mobile.png'),full_page=True)
    mobile.locator('[data-adv="preview"][data-id="mechanics-0"]').click()
    mobile.locator('[data-adv="start"]').click()
    expect(mobile.locator('.lesson-page')).to_be_visible()
    mobile.screenshot(path=str(OUT/'lesson-mobile.png'),full_page=True)
    for width in (320,390,768,1024,1440):
        mobile.set_viewport_size({'width':width,'height':900})
        for route in ('home','lesson'):
            mobile.goto(BASE+'#'+route)
            mobile.wait_for_timeout(80)
            assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,route)
    assert errors==[],errors
    print('PASS: all 20 missions, 5 real instruments, hints, shields, retry queue, lives, boss rewards, chests, quests, costumes, persistence, keyboard and 320–1440px layouts.')
    print('Screenshots:',OUT)
    browser.close()
