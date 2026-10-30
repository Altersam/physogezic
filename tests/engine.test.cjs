const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const {questions}=require('../questions.js');
const correct=q=>q.type==='match'?q.pairs.map(p=>p[1]):q.correct;
const config={names:['Аня','Борис'],mode:'race',check:'auto'};

test('the original 45-card set is complete, unique and internally valid',()=>{
  assert.equal(questions.length,45);
  assert.equal(new Set(questions.map(q=>q.id)).size,45);
  assert.deepEqual([1,2,3].map(n=>questions.filter(q=>q.level===n).length),[20,15,10]);
  for(const q of questions){
    assert.ok(q.prompt && q.explanation);
    if(q.type==='choice'){assert.equal(new Set(q.options).size,4);assert.ok(q.correct>=0&&q.correct<4);}
    else {assert.equal(q.pairs.length,6);assert.equal(new Set(q.pairs.map(p=>p[1])).size,6);}
  }
});
test('race: correct answers move the right player, incorrect answers do not; first finisher wins',()=>{
  const g=E.createGame(config,questions);
  while(!g.finished){
    const turn=g.turn,p=g.players[turn],score=p.score;
    E.draw(g,questions);
    const q=questions.find(q=>q.id===g.active.id);
    E.submit(g,questions,turn===0?correct(q):null);
    assert.equal(p.score,score+(turn===0?q.level:0));
    assert.equal(g.turn,turn,'turn must wait for reading feedback');
    const count=g.history.length;
    assert.equal(E.submit(g,questions,correct(q)),null,'duplicate submission must be ignored');
    assert.equal(g.history.length,count);
    E.advance(g);
  }
  assert.ok(g.players[0].score>=15);
  assert.equal(E.ranking(g)[0].name,'Аня');
  assert.equal(g.players[1].score,0);
  assert.ok(g.cursor<45);
});
test('whole-deck game continues after 15 points and every card is used exactly once',()=>{
  const g=E.createGame({...config,mode:'deck'},questions);
  for(let i=0;i<45;i++){
    assert.equal(g.finished,false);
    E.draw(g,questions);const q=questions.find(q=>q.id===g.active.id);
    E.submit(g,questions,correct(q));E.advance(g);
    if(i<44)assert.equal(g.finished,false);
  }
  assert.equal(g.finished,true);
  assert.equal(g.history.length,45);
  assert.equal(new Set(g.history.map(h=>h.id)).size,45);
  assert.equal(g.players.reduce((n,p)=>n+p.score,0),80);
});
test('a short filtered race ends at deck exhaustion even when no player reaches finish',()=>{
  const g=E.createGame({...config,topics:['quantum'],levels:[3]},questions);
  assert.equal(g.deck.length,2);
  for(let i=0;i<2;i++){E.draw(g,questions);E.submit(g,questions,null);E.advance(g);}
  assert.equal(g.finished,true);
  assert.equal(g.players[0].score,g.players[1].score);
});
test('phase transitions require all six correct pairings',()=>{
  const q=questions.find(q=>q.type==='match'),answer=correct(q);
  assert.ok(E.isCorrect(q,answer));
  assert.equal(E.isCorrect(q,answer.slice(1)),false);
  [answer[0],answer[1]]=[answer[1],answer[0]];
  assert.equal(E.isCorrect(q,answer),false);
  assert.equal(E.isCorrect(q,null),false);
});
test('oral grading and saved feedback are idempotent across a JSON round trip',()=>{
  let g=E.createGame({...config,check:'host'},questions);
  E.draw(g,questions);E.submit(g,questions,true,true);
  const score=g.players[0].score;
  g=JSON.parse(JSON.stringify(g));
  assert.ok(E.validGame(g,questions));
  assert.equal(E.submit(g,questions,true,true),null);
  assert.equal(g.players[0].score,score);
  E.advance(g);assert.equal(g.turn,1);
});
test('practice filters preserve only requested IDs and invalid empty selections are rejected',()=>{
  const g=E.createGame({names:['Ты'],mode:'deck',ids:['m01','h06']},questions);
  assert.deepEqual([...g.deck].sort(),['h06','m01']);
  assert.throws(()=>E.createGame({topics:[]},questions));
  assert.throws(()=>E.createGame({levels:[]},questions));
  assert.equal(E.validGame({...g,deck:['missing']},questions),false);
  assert.equal(E.validGame({...g,turn:8},questions),false);
});
test('broken backups cannot inject scores or incomplete feedback into resumed games',()=>{
  const g=E.createGame(config,questions);
  assert.ok(E.validGame(g,questions));
  g.players[0].score=100;
  assert.equal(E.validGame(g,questions),false);
  g.players[0].score=0;
  E.draw(g,questions);assert.ok(E.validGame(g,questions));
  const q=questions.find(q=>q.id===g.active.id);
  E.submit(g,questions,correct(q));assert.ok(E.validGame(g,questions));
  g.active.result=null;
  assert.equal(E.validGame(g,questions),false);
});
