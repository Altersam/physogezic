// Authoritative network journey for the Godot host and phone participants.
const crypto=require('node:crypto'),E=require('./engine.js');
const fs=require('node:fs'),path=require('node:path');
const bank=['questions.json','experiments.json'].flatMap(name=>JSON.parse(fs.readFileSync(path.join(__dirname,'Godot3D','data',name),'utf8')));
const byId=new Map(bank.map(card=>[card.id,card]));
const token=()=>crypto.randomBytes(20).toString('base64url');
function fail(message,status=409){throw Object.assign(new Error(message),{status});}
function touch(r,now=Date.now()){r.revision++;r.updatedAt=now;}
function create(config={},code='123456',now=Date.now()){
  return {version:3,code,hostToken:token(),title:'Физогэзик · 3D-путешествие',config:{mode:'godot3d',goal:15,count:95},players:[],deck:E.shuffle(bank.map(q=>q.id)),discard:[],market:[],phase:'lobby',turn:0,round:-1,roundId:null,selectedCard:null,revision:1,createdAt:now,updatedAt:now,startedAt:null,answers:{},history:[],reason:null};
}
function authenticate(r,t){if(t===r.hostToken)return {role:'host'};const p=r.players.find(p=>p.token===t);if(!p)fail('Вернитесь в комнату на своём устройстве.',401);return {role:'player',player:p};}
function join(r,{name,deviceId},now=Date.now()){
  name=String(name||'').trim().replace(/\s+/g,' ').slice(0,24);deviceId=String(deviceId||'');
  if(!name||!/^[\w-]{16,128}$/.test(deviceId))fail('Введите имя и присоединитесь с этого устройства.',422);
  const old=r.players.find(p=>p.deviceId===deviceId);if(old){old.lastSeen=now;return old;}
  if(r.phase!=='lobby')fail('Партия уже началась. Вернуться могут её участники.');
  if(r.players.length>=40)fail('В комнате уже 40 участников.');
  if(r.players.some(p=>p.name.toLocaleLowerCase('ru')===name.toLocaleLowerCase('ru')))fail('Такое имя уже занято.',422);
  const p={id:crypto.randomBytes(8).toString('hex'),token:token(),deviceId,name,color:r.players.length,score:0,correct:0,streak:0,lastSeen:now,records:[]};r.players.push(p);touch(r,now);return p;
}
function actor(r){return r.players.length?r.players[r.turn%r.players.length]:null;}
function canAct(r,t){const a=authenticate(r,t);return a.role==='host'||a.player.id===actor(r)?.id;}
function prepare(r,now){r.phase='draw';r.round++;r.roundId=token().slice(0,14);r.selectedCard=null;r.answers={};r.startedAt=null;r.market=r.deck.slice(0,3).map((id,i)=>({id:token().slice(0,12),questionId:id,slot:i}));touch(r,now);}
function draw(r,t,body,now=Date.now()){
  if(!canAct(r,t))fail('Сейчас карту берёт другой участник.',403);
  if(r.phase!=='draw'||body.roundId!==r.roundId)fail('Эта карта уже взята или ход сменился.');
  const card=r.market.find(c=>c.id===body.cardId);if(!card)fail('Выберите одну из закрытых карт.',422);
  r.selectedCard={...card};r.deck.splice(r.deck.indexOf(card.questionId),1);r.market=[];
  const q=byId.get(card.questionId);r.options=q.type==='choice'?E.shuffle(q.options.map((text,index)=>({id:token().slice(0,12),text,index}))):E.shuffle(q.pairs.map(p=>p[1]));
  r.phase='question';r.startedAt=now;touch(r,now);
}
function submit(r,p,body,now=Date.now()){
  if(body.roundId===r.roundId&&r.answers[p.id])return r.answers[p.id];
  if(r.phase!=='question'||body.roundId!==r.roundId)fail('Карта уже закрыта или ход сменился.');
  if(actor(r)?.id!==p.id)fail('Сейчас отвечает другой участник.',403);
  const q=byId.get(r.selectedCard.questionId);let answer,correct;
  if(body.skip===true){answer=null;correct=false;}
  else if(q.type==='choice'){const option=r.options.find(o=>o.id===body.answer);if(!option)fail('Выберите вариант ответа.',422);answer=option.index;correct=option.index===q.correct;}
  else {if(!Array.isArray(body.answer)||body.answer.length!==q.pairs.length||!body.answer.every(v=>q.pairs.some(pair=>pair[1]===v)))fail('Укажите все шесть переходов.',422);answer=body.answer;correct=E.isCorrect(q,answer);}
  const previous=p.score,delta=correct?q.level:-(q.penalty||0);p.score=Math.max(0,Math.min(15,p.score+delta));p.correct+=correct?1:0;p.streak=correct?p.streak+1:0;
  const result={playerId:p.id,name:p.name,correct,steps:p.score-previous,from:previous,to:p.score,questionId:q.id,ms:Math.max(0,now-r.startedAt)};
  p.records.push(result);r.answers[p.id]={correct,answer};r.history.push({round:r.round,questionId:q.id,owner:p.id,result,at:now});r.discard.push(q.id);r.phase='reveal';p.lastSeen=now;touch(r,now);return r.answers[p.id];
}
function reveal(r,now=Date.now()){
  if(r.phase!=='question')fail('Сейчас нет открытой карты.');
  const p=actor(r);if(p)submit(r,p,{roundId:r.roundId,skip:true},now);
}
function control(r,t,action,roundId,now=Date.now()){
  const auth=authenticate(r,t),host=auth.role==='host';
  if(action==='start'){if(!host)fail('Партию запускает ведущий.',403);if(r.phase!=='lobby')fail('Партия уже началась.');if(!r.players.length)fail('Подключите хотя бы одного участника.');r.turn=0;prepare(r,now);return;}
  if(action==='finish'){if(!host)fail('Партию завершает ведущий.',403);r.phase='finished';r.reason='host';touch(r,now);return;}
  if(roundId!==r.roundId)fail('Ход уже сменился.');
  if(action==='reveal'){if(!host)fail('Пропустить ответ может ведущий.',403);reveal(r,now);return;}
  if(action==='next'){
    if(!canAct(r,t)||r.phase!=='reveal')fail('Сначала завершите текущую карту.');
    if(r.players.some(p=>p.score>=15)||!r.deck.length){r.phase='finished';r.reason=r.players.some(p=>p.score>=15)?'finish':'deck';touch(r,now);}
    else{r.turn=(r.turn+1)%r.players.length;prepare(r,now);}return;
  }fail('Неизвестное действие.',422);
}
function tick(){return false;}
function ranking(r){return [...r.players].sort((a,b)=>b.score-a.score||b.correct-a.correct);}
function publicCard(q,includeOptions,r){
  if(!q)return null;
  const out={id:q.id,type:q.type,topic:q.topic,prompt:q.prompt,level:q.level,kind:q.kind||'question',anim:q.anim||'',title:q.title||'',slot:r.selectedCard.slot};
  if(includeOptions){if(q.type==='choice')out.options=r.options.map(o=>({id:o.id,text:o.text}));else{out.left=q.pairs.map(p=>p[0]);out.right=r.options;}}
  return out;
}
function snapshot(r,t,now=Date.now()){
  const auth=authenticate(r,t),p=auth.player;if(p)p.lastSeen=now;
  const host=auth.role==='host',current=actor(r),q=r.selectedCard?byId.get(r.selectedCard.questionId):null,eligible=!host&&p?.id===current?.id,canSee=q&&['question','reveal','finished'].includes(r.phase),revealed=r.phase==='reveal'||r.phase==='finished';
  const out={code:r.code,title:r.title,config:r.config,phase:r.phase,round:r.round,roundId:r.roundId,total:95,revision:r.revision,serverTime:now,role:auth.role,me:p?.id||null,goal:15,turn:r.turn,activePlayerId:current?.id||null,activePlayerName:current?.name||'',canDraw:canAct(r,t)&&r.phase==='draw',canPass:canAct(r,t)&&r.phase==='reveal',eligible,remaining:r.deck.length,discardCount:r.discard.length,market:r.phase==='draw'?r.market.map(c=>({id:c.id,slot:c.slot})):[],selectedCard:r.selectedCard?{id:r.selectedCard.id}:null,answerCount:Object.keys(r.answers).length,reason:r.reason,players:ranking(r).map(v=>({id:v.id,name:v.name,color:v.color,position:v.score,score:v.score,correct:v.correct,streak:v.streak,active:v.id===current?.id,online:now-v.lastSeen<15000}))};
  if(canSee){out.question=publicCard(q,eligible&&!revealed,r);if(revealed&&eligible){out.question.explanation=q.explanation;out.myResult=r.history.at(-1)?.result;out.question.correct=q.type==='choice'?r.options.find(o=>o.index===q.correct)?.text:q.pairs.map(pair=>pair[1]);}}
  if(p)out.submitted=!!r.answers[p.id];
  return out;
}
function validRoom(r){return r&&r.version===3&&r.config?.mode==='godot3d'&&typeof r.hostToken==='string'&&/^\d{6}$/.test(r.code)&&Array.isArray(r.deck)&&r.deck.every(id=>byId.has(id))&&Array.isArray(r.players)&&r.players.length<=40&&Array.isArray(r.history)&&['lobby','draw','question','reveal','finished'].includes(r.phase);}
module.exports={create,join,authenticate,draw,hint:()=>fail('В 3D-путешествии нет жетонов подсказок.',422),submit,reveal,control,tick,ranking,snapshot,validRoom};
