const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../engine.js');
const C=require('../campaign.js');
const {questions}=require('../questions.js');
const all=C.lessons(questions);
function answerFor(r){const t=C.task(r);if(t.type==='lab')return t.kind==='atom'?{...t.target}:{value:t.target,closed:true};const q=questions.find(q=>q.id===t.id);return q.type==='match'?q.pairs.map(p=>p[1]):q.correct;}
function finish(p,now=Date.now()){while(p.run.phase!=='done'){C.answer(p,answerFor(p.run),questions,now);C.advance(p,questions,now);}return p;}
test('20 sequential missions cover all 45 cards and contain playable labs',()=>{
  assert.equal(all.length,20);
  assert.equal(new Set(all.flatMap(l=>l.ids)).size,45);
  const p=C.createProfile();
  for(let i=0;i<all.length;i++){
    const l=all[i];assert.ok(C.unlocked(p,l,all));
    if(i<19)assert.equal(C.unlocked(p,all[i+1],all),false);
    C.start(p,l.id,questions);assert.equal(p.run.tasks.length,l.boss?6:5);
    assert.ok(p.run.tasks.some(t=>t.type==='lab'));
    finish(p);assert.equal(p.run.status,'won');assert.ok(C.validProfile(p,questions));
  }
  assert.equal(Object.keys(p.completed).length,20);
  assert.equal(p.xp,2000);
});
test('known reward baseline: five perfect answers = 65 XP, first-clear bonus = 25 XP',()=>{
  const p=C.createProfile();C.start(p,all[0].id,questions);finish(p);
  assert.equal(p.xp,90);assert.equal(p.gems,15);assert.equal(p.completed[all[0].id].stars,3);
  const old=p.xp;C.advance(p,questions);assert.equal(p.xp,old,'final reward is idempotent');
  C.start(p,all[0].id,questions);finish(p);
  assert.equal(p.xp,155,'repeat earns answers, not first-clear bonus');assert.equal(p.gems,15);
});
test('mistakes return to the end, a shield blocks exactly one loss, duplicate submits do nothing',()=>{
  const p=C.createProfile();C.start(p,all[0].id,questions);const original=C.task(p.run).id;
  assert.ok(C.useShield(p));assert.equal(C.useShield(p),false);
  const result=C.answer(p,null,questions);assert.ok(result.blocked);assert.equal(p.run.hearts,5);
  assert.equal(C.answer(p,null,questions),null);
  assert.equal(p.run.queue.length,6);C.advance(p,questions);
  C.answer(p,null,questions);assert.equal(p.run.hearts,4);C.advance(p,questions);
  finish(p);assert.equal(p.run.status,'won');assert.equal(p.run.solved.length,5);
  assert.equal(p.run.attempts.filter(a=>a.cardId===original).length,2);
  assert.equal(p.completed[all[0].id].stars,2);
});
test('five losses end a mission; immediate retry restores hearts and does not unlock next mission',()=>{
  const p=C.createProfile();C.start(p,all[0].id,questions);
  for(let i=0;i<5;i++){C.answer(p,null,questions);C.advance(p,questions);}
  assert.equal(p.run.status,'failed');assert.equal(p.run.hearts,0);assert.equal(p.gems,0);
  assert.equal(C.unlocked(p,all[1],all),false);
  C.start(p,all[0].id,questions);assert.equal(p.run.hearts,5);assert.equal(p.run.mistakes,0);
});
test('exploration mode prevents a dead end without losing learning retries',()=>{
  const p=C.createProfile();p.relaxed=true;C.start(p,all[0].id,questions);
  for(let i=0;i<9;i++){C.answer(p,null,questions);C.advance(p,questions);}
  assert.equal(p.run.phase,'answer');assert.equal(p.run.hearts,5);finish(p);
  assert.equal(p.run.status,'won');assert.equal(p.completed[all[0].id].stars,1);
});
test('all five lab families obey physical targets over parameter variants',()=>{
  for(let w=0;w<5;w++)for(let i=0;i<8;i++){
    const t=C.lab(w,i),a=t.kind==='atom'?{...t.target}:{value:t.target,closed:true};
    assert.ok(C.labCorrect(t,a));assert.equal(C.labCorrect(t,null),false);
    assert.equal(C.labCorrect(t,{...a,...(t.kind==='atom'?{n:a.n+1}:{value:a.value+1})}),false);
    if(t.kind==='circuit')assert.equal(C.labCorrect(t,{...a,closed:false}),false);
    if(t.kind==='atom')assert.equal(t.target.z+t.target.n,t.z+t.n);
    else if(t.kind==='force')assert.equal(t.target/t.m,t.a);
    else if(t.kind==='lens')assert.ok(Math.abs(1/t.f-1/t.d-1/t.target)<1e-10);
  }
});
test('daily quests, calendar streaks, chests and cosmetics have bounded, one-time rewards',()=>{
  const p=C.createProfile(),today=new Date(2026,9,29,12).getTime(),tomorrow=new Date(2026,9,30,12).getTime();
  C.start(p,all[0].id,questions);finish(p,today);
  assert.equal(C.streak(p,today),1);assert.ok(C.claimQuest(p,'lesson',today));assert.equal(C.claimQuest(p,'lesson',today),false);
  C.start(p,all[0].id,questions);finish(p,tomorrow);assert.equal(C.streak(p,tomorrow),2);
  assert.equal(p.daily.date,'2026-10-30');assert.deepEqual(p.daily.claimed,[]);
  assert.equal(C.claimChest(p,0),false);
  for(const l of all.slice(1,4)){C.start(p,l.id,questions);finish(p,tomorrow);}
  assert.ok(C.claimChest(p,0));assert.equal(C.claimChest(p,0),false);
  const before=p.gems;assert.ok(C.buy(p,'captain'));assert.equal(p.gems,before-80);
  assert.equal(C.buy(p,'captain'),false);assert.equal(C.buy(p,'missing'),false);
  assert.ok(C.equip(p,'explorer'));assert.equal(p.equipped,'explorer');
});
test('reload round trip preserves selected answers, hints, shield and pending feedback',()=>{
  let p=C.createProfile();C.start(p,all[0].id,questions);C.useHint(p);C.useShield(p);p.run.answer=1;
  p=JSON.parse(JSON.stringify(p));assert.ok(C.validProfile(p,questions));assert.equal(p.run.answer,1);assert.ok(p.run.shield);
  C.answer(p,answerFor(p.run),questions);p=JSON.parse(JSON.stringify(p));assert.ok(C.validProfile(p,questions));
  const xp=p.xp;assert.equal(C.answer(p,answerFor(p.run),questions),null);assert.equal(p.xp,xp);
  C.advance(p,questions);finish(p);assert.ok(C.validProfile(p,questions));
  p.gems=-10;assert.equal(C.validProfile(p,questions),false);
});
