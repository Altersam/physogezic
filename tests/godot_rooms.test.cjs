const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../room-engine.cjs');
function setup(first='m01'){
  const r=R.create({mode:'godot3d'},'123456',1000);r.deck=[first,...r.deck.filter(id=>id!==first)];
  const a=R.join(r,{name:'Аня',deviceId:'godot_anna_123456789'},1000),b=R.join(r,{name:'Борис',deviceId:'godot_boris_123456789'},1000);
  return {r,a,b};
}
function open(r,token){const s=R.snapshot(r,token);R.draw(r,token,{roundId:r.roundId,cardId:s.market[0].id},1200);}
function answer(r){return r.options.find(o=>o.index===require('../Godot3D/data/questions.json').find(q=>q.id===r.selectedCard.questionId)?.correct)||r.options.find(o=>o.index===require('../Godot3D/data/experiments.json').find(q=>q.id===r.selectedCard.questionId)?.correct);}
test('3D room mixes all 95 cards and never sends answers to the common host screen',()=>{
  const {r,a,b}=setup();assert.equal(r.deck.length,95);R.control(r,r.hostToken,'start',null,1100);
  let host=R.snapshot(r,r.hostToken),player=R.snapshot(r,a.token);assert.equal(host.phase,'draw');assert.equal(host.question,undefined);assert.equal(player.market.length,3);assert.equal(R.snapshot(r,b.token).canDraw,false);
  open(r,a.token);host=R.snapshot(r,r.hostToken);player=R.snapshot(r,a.token);
  assert.equal(host.question.id,'m01');assert.equal(host.question.options,undefined);assert.equal(host.question.correct,undefined);assert.equal(host.question.explanation,undefined);
  assert.equal(player.question.options.length,4);assert.ok(player.question.options.every(o=>!('index'in o)));assert.equal(R.snapshot(r,b.token).question.options,undefined);
  R.submit(r,a,{roundId:r.roundId,answer:answer(r).id},1300);const score=a.score;R.submit(r,a,{roundId:r.roundId,answer:answer(r).id},1400);assert.equal(a.score,score);
  host=R.snapshot(r,r.hostToken);player=R.snapshot(r,a.token);assert.equal(host.question.correct,undefined);assert.equal(host.question.explanation,undefined);assert.equal(player.myResult.correct,true);assert.ok(player.question.explanation);
  assert.throws(()=>R.submit(r,b,{roundId:r.roundId,answer:'fake',correct:true,score:999}));R.control(r,r.hostToken,'next',r.roundId,1500);assert.equal(R.snapshot(r,b.token).eligible,true);
});
test('3D experiments move +level or −1 with zero floor and survive serialization',()=>{
  const {r,a}=setup('lab01');R.control(r,r.hostToken,'start',null,1100);open(r,a.token);
  let s=R.snapshot(r,a.token);assert.equal(s.question.kind,'experiment');assert.equal(s.question.anim,'pendulum');assert.equal(R.snapshot(r,r.hostToken).question.anim,'pendulum');
  R.submit(r,a,{roundId:r.roundId,skip:true},1300);assert.equal(a.score,0);
  R.control(r,r.hostToken,'next',r.roundId,1400);r.turn=0;r.market[0].questionId='lab02';open(r,a.token);a.score=5;
  const q=require('../Godot3D/data/experiments.json').find(q=>q.id===r.selectedCard.questionId);
  R.submit(r,a,{roundId:r.roundId,skip:true},1500);assert.equal(a.score,4);assert.equal(r.history.at(-1).result.steps,-1);
  const restored=JSON.parse(JSON.stringify(r));assert.ok(R.validRoom(restored));assert.equal(R.snapshot(restored,a.token).question.id,q.id);
});
test('only host starts and finishes; stale turns cannot settle twice',()=>{
  const {r,a}=setup();assert.throws(()=>R.control(r,a.token,'start',null));R.control(r,r.hostToken,'start',null);open(r,a.token);R.submit(r,a,{roundId:r.roundId,skip:true});
  const old=r.roundId;R.control(r,a.token,'next',old);assert.equal(r.turn,1);assert.throws(()=>R.control(r,a.token,'next',old));assert.equal(r.history.length,1);R.control(r,r.hostToken,'finish',r.roundId);assert.equal(R.snapshot(r,a.token).phase,'finished');
});
