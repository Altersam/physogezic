const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../room-engine.cjs'),{questions}=require('../questions.js'),M=require('../math.js');
function setup(deck=['m01','m02','m03'],seconds=0){const r=R.create({mode:'quiz',count:3,seconds},'123456',1000);r.deck=deck;const a=R.join(r,{name:'Аня',deviceId:'device_anna_123456789'},1000),b=R.join(r,{name:'Борис',deviceId:'device_boris_123456789'},1000);return {r,a,b};}
function correct(r){const q=questions.find(q=>q.id===r.deck[r.round]);return q.type==='choice'?r.options.find(o=>o.index===q.correct).id:q.pairs.map(p=>p[1]);}
test('quiz-style rooms: reconnect reuses a slot, host authority and hidden answer boundaries hold',()=>{
  const {r,a}=setup();const again=R.join(r,{name:'Аня',deviceId:a.deviceId},1200);assert.equal(again.id,a.id);assert.equal(r.players.length,2);
  assert.deepEqual(R.snapshot(r,r.hostToken,1200).players.map(p=>p.rank),[1,1]);
  assert.throws(()=>R.control(r,a.token,'start',null,1200));
  R.control(r,r.hostToken,'start',null,1200);const s=R.snapshot(r,a.token,1300);
  assert.equal(s.role,'player');assert.equal(s.question.correct,undefined);assert.equal(s.question.explanation,undefined);
  assert.ok(!JSON.stringify(s).includes(r.hostToken));assert.ok(!JSON.stringify(s).includes(a.deviceId));
  assert.ok(s.question.options.every(o=>!('index'in o)));
  assert.throws(()=>R.join(r,{name:'Поздний',deviceId:'late_device_12345678'},1400));
});
test('answers are scored on the server once; stale rounds and fake outcome payloads cannot move a ship',()=>{
  const {r,a,b}=setup();R.control(r,r.hostToken,'start',null,1200);
  const id=r.roundId;const wrong=r.options.find(o=>o.id!==correct(r)).id;
  R.submit(r,a,{roundId:id,answer:correct(r),boost:true},1500);
  R.submit(r,a,{roundId:id,answer:wrong,correct:false,score:999999},1600);
  R.submit(r,b,{roundId:id,answer:wrong,correct:true,score:999999},1600);
  assert.equal(a.position,0);R.control(r,r.hostToken,'reveal',id,1800);
  assert.equal(a.position,3);assert.equal(b.position,0);assert.equal(a.boost,false);
  assert.throws(()=>R.control(r,r.hostToken,'reveal',id,1900));assert.equal(a.position,3);
  R.control(r,r.hostToken,'next',id,2000);assert.throws(()=>R.submit(r,a,{roundId:id,answer:correct(r)},2100));
  assert.equal(R.snapshot(r,a.token).history.length,1);
});
test('timeout, full matching answer and end of deck have one settlement path',()=>{
  const {r,a}=setup(['h06','m01','m02'],30);R.control(r,r.hostToken,'start',null,1200);
  assert.throws(()=>R.submit(r,a,{roundId:r.roundId,answer:['Плавление']},1300));
  R.submit(r,a,{roundId:r.roundId,answer:correct(r)},1300);
  assert.equal(R.tick(r,31199),false);assert.equal(R.tick(r,31200),true);
  assert.equal(R.tick(r,32000),false);assert.equal(a.position,2);
  while(r.phase!=='finished'){R.control(r,r.hostToken,'next',r.roundId,40000);if(r.phase==='question'){R.submit(r,a,{roundId:r.roundId,answer:correct(r)},40100);R.control(r,r.hostToken,'reveal',r.roundId,40200);}}
  assert.equal(r.history.length,3);assert.equal(a.records.length,3);assert.ok(R.validRoom(JSON.parse(JSON.stringify(r))));
  const score=a.score;R.control(r,r.hostToken,'finish',r.roundId);assert.equal(a.score,score);
});
test('room capacity, unique names, stage events and 30-station finish are explicit',()=>{
  const {r}=setup();assert.throws(()=>R.join(r,{name:'Аня',deviceId:'other_device_12345678'}));
  for(let i=2;i<40;i++)R.join(r,{name:'Экипаж '+i,deviceId:'unique_device_number_'+i});
  assert.throws(()=>R.join(r,{name:'Лишний',deviceId:'unique_extra_device_1'}));
  assert.equal(R.eventFor(2).id,'boost');assert.equal(R.eventFor(3).id,'recharge');assert.equal(R.eventFor(4).multiplier,2);
  assert.equal(R.GOAL,30);
});
test('crossing a world beacon restores a charge and gives a one-time checkpoint reward',()=>{
  const {r,a}=setup();R.control(r,r.hostToken,'start',null,1200);a.position=5;a.boost=false;
  R.submit(r,a,{roundId:r.roundId,answer:correct(r)},1400);R.control(r,r.hostToken,'reveal',r.roundId,1500);
  assert.equal(a.position,6);assert.equal(a.boost,true);assert.equal(a.score,150);assert.deepEqual(a.records[0].beacons,[6]);
  assert.throws(()=>R.control(r,r.hostToken,'reveal',r.roundId,1600));assert.equal(a.score,150);
});
test('mathematical typography: fractions, vectors and scripts render as safe MathML',()=>{
  const fraction=M.render('s_x=\\frac{v_x^2-v_{0x}^2}{2a_x}');assert.match(fraction,/<mfrac>/);assert.match(fraction,/<msub>/);assert.match(fraction,/<msubsup>/);assert.match(M.render('v^2'),/<msup>/);
  assert.match(M.rich('F⃗рез = ma⃗'),/<mover/);assert.match(M.rich('I = U/R'),/<mfrac>/);
  assert.match(M.rich('$D=\\frac{1}{F}$'),/<mfrac>/);assert.ok(!M.rich('<script>alert(1)</script>').includes('<script>'));
  assert.ok(!M.render('\\text{<img src=x>}').includes('<img'));
  assert.equal(require('../questions.js').formulas.length,20);
});
