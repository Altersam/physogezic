const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const {questions,topics}=require('../questions.js');
const experiments=require('../experiments.js');
const Lab=require('../lab.js');
const bank=questions.concat(experiments);

test('laboratory contains 50 unique, valid experiments across all five topics',()=>{
  assert.equal(experiments.length,50);
  assert.deepEqual(experiments.map(q=>q.id),Array.from({length:50},(_,i)=>`lab${String(i+1).padStart(2,'0')}`));
  assert.equal(new Set(bank.map(q=>q.id)).size,95,'experiment IDs must not collide with the original deck');
  for(const topic of Object.keys(topics))assert.equal(experiments.filter(q=>q.topic===topic).length,10,topic);
  for(const q of experiments){
    assert.equal(q.type,'choice');
    assert.equal(q.kind,'experiment');
    assert.equal(q.penalty,1);
    assert.equal(q.correct,0);
    assert.ok([1,2,3].includes(q.level));
    assert.ok(q.title&&q.prompt&&q.explanation&&q.oral);
    assert.equal(q.options.length,4);
    assert.equal(new Set(q.options).size,4,q.id);
    assert.ok(Lab.types.includes(q.anim),`${q.id}: unknown scene ${q.anim}`);
  }
});

test('every experiment has a complete animated SVG scene with safe accessible markup',()=>{
  for(const q of experiments){
    const html=Lab.scene(q);
    assert.ok(html.startsWith('<svg class="xlab" viewBox="0 0 320 190"'),q.id);
    assert.ok(html.includes('</svg>'),q.id);
    assert.ok(html.includes('class="xa-'),`${q.id}: scene must contain animation`);
    assert.ok(html.includes(`aria-label="${q.title}"`),q.id);
    assert.ok(!/undefined|NaN/.test(html),q.id);
  }
  assert.equal(new Set(experiments.map(q=>q.anim)).size,50,'each card gets its own scene');
});

test('a failed experiment records −1 point but never makes the score negative',()=>{
  const q=experiments[0];
  const g=E.createGame({names:['Исследователь'],mode:'deck',check:'auto',ids:[q.id],lab:true},bank,()=>0);
  E.draw(g,bank,()=>0);
  const result=E.submit(g,bank,1);
  assert.equal(result.correct,false);
  assert.equal(result.points,-1);
  assert.equal(g.players[0].score,0);
  assert.equal(g.history.at(-1).points,-1);
  assert.ok(E.validGame(g,bank));
  const restored=JSON.parse(JSON.stringify(g));
  assert.ok(E.validGame(restored,bank),'penalty feedback must survive save/restore');
});

test('correct experiments award their level and a later error subtracts exactly one point',()=>{
  const selected=experiments.slice(0,2);
  const g=E.createGame({names:['Исследователь'],mode:'deck',check:'auto',ids:selected.map(q=>q.id),lab:true},bank,()=>0);
  E.draw(g,bank,()=>0);
  const first=bank.find(q=>q.id===g.active.id);
  const won=E.submit(g,bank,first.correct);
  assert.equal(won.points,first.level);
  assert.equal(g.players[0].score,first.level);
  assert.ok(E.validGame(g,bank));
  E.advance(g);E.draw(g,bank,()=>0);
  const second=bank.find(q=>q.id===g.active.id);
  const lost=E.submit(g,bank,second.options.findIndex((_,i)=>i!==second.correct));
  assert.equal(lost.points,-1);
  assert.equal(g.players[0].score,Math.max(0,first.level-1));
  assert.ok(E.validGame(g,bank));
});

test('ordinary questions retain their original no-penalty scoring',()=>{
  const q=questions[0];
  const g=E.createGame({names:['Игрок'],mode:'deck',check:'auto',ids:[q.id]},questions,()=>0);
  E.draw(g,questions,()=>0);
  const result=E.submit(g,questions,null);
  assert.equal(result.points,0);
  assert.equal(g.players[0].score,0);
  assert.ok(E.validGame(g,bank));
});
