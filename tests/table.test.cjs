const {test}=require('node:test'),assert=require('node:assert/strict'),R=require('../room-engine.cjs'),E=require('../engine.js'),{questions}=require('../questions.js');
function setup(config={}){const r=R.create({...config,seconds:0},'654321',1000),a=R.join(r,{name:'Аня',deviceId:'table_anna_device_1234'},1000),b=R.join(r,{name:'Борис',deviceId:'table_boris_device_1234'},1000);R.control(r,r.hostToken,'start',null,1200);return {r,a,b};}
function open(r,p,slot=0){const s=R.snapshot(r,p.token,1300);R.draw(r,p.token,{roundId:r.roundId,cardId:s.market[slot].id},1400);return questions.find(q=>q.id===r.selectedCard.questionId);}
function right(r){const q=questions.find(q=>q.id===r.selectedCard.questionId);return q.type==='choice'?r.options.find(o=>o.index===q.correct).id:q.pairs.map(p=>p[1]);}
test('the default network game is the original turn-based board, with a closed draw phase',()=>{
  const {r,a,b}=setup();assert.equal(r.config.mode,'board');assert.equal(r.config.goal,15);assert.equal(r.config.count,45);assert.equal(r.phase,'draw');
  let s=R.snapshot(r,a.token);assert.equal(s.question,undefined);assert.equal(s.market.length,3);assert.ok(s.market.every(c=>!c.questionId));
  assert.throws(()=>R.draw(r,b.token,{roundId:r.roundId,cardId:s.market[0].id}));
  const q=open(r,a,2);s=R.snapshot(r,b.token);assert.equal(s.question.prompt,q.prompt);assert.equal(s.eligible,false);assert.equal(s.question.correct,undefined);
  assert.throws(()=>R.submit(r,b,{roundId:r.roundId,answer:right(r)}));
  R.submit(r,a,{roundId:r.roundId,answer:right(r)},1800);assert.equal(r.phase,'checking');assert.equal(a.position,0);
  R.control(r,a.token,'reveal',r.roundId,1900);assert.equal(a.position,q.level);assert.equal(b.position,0);assert.equal(r.discard.length,1);
  assert.throws(()=>R.control(r,b.token,'next',r.roundId));R.control(r,a.token,'next',r.roundId,2000);assert.equal(r.phase,'draw');assert.equal(R.snapshot(r,b.token).activePlayerId,b.id);
});
test('drawing removes one card, restores on reload and never reveals the next three questions',()=>{
  const {r,a}=setup();const n=r.deck.length,q=open(r,a);assert.equal(r.deck.length,n-1);
  const restored=JSON.parse(JSON.stringify(r));assert.ok(R.validRoom(restored));assert.equal(R.snapshot(restored,a.token).question.id,q.id);
  assert.throws(()=>R.draw(restored,a.token,{roundId:r.roundId,cardId:r.selectedCard.id}));
  R.submit(restored,restored.players[0],{roundId:r.roundId,skip:true});R.control(restored,a.token,'reveal',r.roundId);assert.equal(restored.players[0].position,0);
});
test('together mode keeps the card draw and turns while allowing everybody to answer',()=>{
  const {r,a,b}=setup({pace:'together'}),q=open(r,a);
  R.submit(r,a,{roundId:r.roundId,answer:right(r)});assert.equal(r.phase,'question');assert.throws(()=>R.control(r,a.token,'reveal',r.roundId));
  R.submit(r,b,{roundId:r.roundId,answer:right(r)});assert.equal(r.phase,'checking');R.control(r,a.token,'reveal',r.roundId);
  assert.equal(a.position,q.level);assert.equal(b.position,q.level);R.control(r,a.token,'next',r.roundId);assert.equal(r.turn,1);
});
test('oral answers need teacher evaluation and cannot be self-awarded',()=>{
  const {r,a}=setup({check:'host'});const q=open(r,a);R.submit(r,a,{roundId:r.roundId,answer:'Моё рассуждение о физическом законе.'});
  assert.throws(()=>R.control(r,a.token,'reveal',r.roundId));assert.equal(R.snapshot(r,a.token).question.explanation,undefined);
  R.control(r,r.hostToken,'check',r.roundId);assert.ok(R.snapshot(r,r.hostToken).question.explanation);assert.equal(R.snapshot(r,a.token).question.explanation,undefined);
  assert.throws(()=>R.control(r,r.hostToken,'reveal',r.roundId));assert.throws(()=>R.control(r,a.token,'grade',r.roundId,2000,{playerId:a.id,correct:true}));
  R.control(r,r.hostToken,'grade',r.roundId,2100,{playerId:a.id,correct:true});R.control(r,r.hostToken,'reveal',r.roundId,2200);assert.equal(a.position,q.level);
});
test('help tokens do not alter the original 1/2/3-step reward; the first finisher ends the game',()=>{
  const {r,a}=setup();r.market[0].questionId='m01';r.deck[0]='m01';const q=open(r,a);assert.equal(q.level,1);
  R.hint(r,a.token);R.hint(r,a.token);assert.equal(a.hints,0);assert.equal(R.snapshot(r,a.token).hint.eliminated.length,2);
  a.position=4;R.submit(r,a,{roundId:r.roundId,answer:right(r)});R.control(r,a.token,'reveal',r.roundId);assert.equal(a.position,5);assert.equal(a.hints,1);assert.equal(a.score,1);
  const turn=r.roundId;R.control(r,a.token,'next',turn);const b=r.players[1];open(r,b);b.position=14;R.submit(r,b,{roundId:r.roundId,answer:right(r)});R.control(r,b.token,'reveal',r.roundId);R.control(r,b.token,'next',r.roundId);assert.equal(r.phase,'finished');assert.equal(r.reason,'finish');
});
test('offline card selection draws the chosen back and preserves the rest of the deck',()=>{
  const g=E.createGame({names:['Ты']},questions);const original=[...g.deck];E.draw(g,questions,Math.random,2);assert.equal(g.active.id,original[2]);assert.equal(g.deck[2],original[0]);assert.ok(E.validGame(g,questions));
});
