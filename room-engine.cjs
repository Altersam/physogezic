const crypto=require('node:crypto');
const E=require('./engine.js');
const {questions,topics}=require('./questions.js');
const GOAL=30,MAX_PLAYERS=40;
function fail(message,status=409){const error=new Error(message);error.status=status;throw error;}
function secret(){return crypto.randomBytes(24).toString('base64url');}
function eventFor(index){return index%5===4?{id:'boss',title:'Испытание стража',icon:'crown',description:'Верный ответ даёт вдвое больше шагов.',multiplier:2}:index%5===2?{id:'boost',title:'Попутный импульс',icon:'bolt',description:'К верному ответу добавляется один шаг.',extra:1}:index%5===3?{id:'recharge',title:'Станция поддержки',icon:'heart',description:'Каждый верный ответ восстанавливает заряд усилителя.'}:{id:'normal',title:'Исследовательский раунд',icon:'compass',description:'Верный ответ двигает корабль на сложность вопроса.'};}
function create(config={},code='123456',now=Date.now()){
  const selected=Array.isArray(config.topics)?config.topics.filter(t=>topics[t]):Object.keys(topics);
  const bank=questions.filter(q=>selected.includes(q.topic));if(!bank.length)fail('Выберите хотя бы одну тему.',422);
  const count=Math.min(bank.length,Math.max(3,Math.min(30,Number(config.count)||15)));
  const seconds=[0,30,45,60,90,120].includes(Number(config.seconds))?Number(config.seconds):60;
  return {version:1,code,hostToken:secret(),title:String(config.title||'Космическая экспедиция').trim().slice(0,70)||'Космическая экспедиция',config:{count,seconds,topics:selected},deck:E.shuffle(bank.map(q=>q.id)).slice(0,count),players:[],phase:'lobby',round:-1,roundId:null,revision:1,createdAt:now,updatedAt:now,startedAt:null,deadline:null,answers:{},history:[],reason:null};
}
function touch(room,now=Date.now()){room.revision++;room.updatedAt=now;}
function authenticate(room,token){if(token===room.hostToken)return {role:'host'};const player=room.players.find(p=>p.token===token);if(!player)fail('Откройте сохранённую комнату или присоединитесь по коду.',401);return {role:'player',player};}
function join(room,{name,deviceId},now=Date.now()){
  name=String(name||'').trim().replace(/\s+/g,' ').slice(0,24);deviceId=String(deviceId||'');
  if(!name)fail('Введите имя или название команды.',422);if(!/^[\w-]{16,128}$/.test(deviceId))fail('Некорректный идентификатор устройства.',422);
  const existing=room.players.find(p=>p.deviceId===deviceId);if(existing){existing.lastSeen=now;return existing;}
  if(room.phase!=='lobby')fail('Экспедиция уже началась. Подключиться заново можно с устройства, которое участвовало в лобби.');
  if(room.players.length>=MAX_PLAYERS)fail('В комнате уже 40 участников.');
  if(room.players.some(p=>p.name.toLocaleLowerCase('ru')===name.toLocaleLowerCase('ru')))fail('Это имя уже занято. Добавьте фамилию или номер команды.',422);
  const player={id:crypto.randomBytes(8).toString('hex'),token:secret(),deviceId,name,color:room.players.length,score:0,position:0,correct:0,combo:0,bestCombo:0,boost:true,totalMs:0,lastSeen:now,records:[]};
  room.players.push(player);touch(room,now);return player;
}
function startRound(room,now){room.round++;room.phase='question';room.startedAt=now;room.deadline=room.config.seconds?now+room.config.seconds*1000:null;room.answers={};room.roundId=secret().slice(0,14);
  const q=questions.find(q=>q.id===room.deck[room.round]);
  room.options=q.type==='choice'?E.shuffle(q.options.map((text,index)=>({id:secret().slice(0,12),text,index}))):E.shuffle(q.pairs.map(p=>p[1]));touch(room,now);
}
function submit(room,player,body,now=Date.now()){
  if(room.phase!=='question'||body.roundId!==room.roundId)fail('Этот раунд уже закрыт. Дождитесь нового.');
  if(room.deadline&&now>=room.deadline)fail('Время ответа истекло.');
  if(room.answers[player.id])return room.answers[player.id];
  const q=questions.find(q=>q.id===room.deck[room.round]);let answer;
  if(q.type==='choice'){const option=room.options.find(o=>o.id===body.answer);if(!option)fail('Выберите один вариант ответа.',422);answer=option.index;}
  else {if(!Array.isArray(body.answer)||body.answer.length!==q.pairs.length||!body.answer.every(v=>q.pairs.some(p=>p[1]===v)))fail('Заполните все шесть переходов.',422);answer=body.answer;}
  const boost=body.boost===true&&player.boost;if(boost)player.boost=false;
  const record={answer,boost,correct:E.isCorrect(q,answer),ms:Math.max(0,now-room.startedAt)};
  room.answers[player.id]=record;player.lastSeen=now;touch(room,now);return record;
}
function reveal(room,now=Date.now()){
  if(room.phase!=='question')fail('Сейчас нет открытого раунда.');
  const q=questions.find(q=>q.id===room.deck[room.round]),event=eventFor(room.round),results=[];
  for(const p of room.players){const a=room.answers[p.id],correct=!!a?.correct;let steps=0,points=0,beacons=[];
    if(correct){p.correct++;p.combo++;p.bestCombo=Math.max(p.bestCombo,p.combo);steps=q.level*(event.multiplier||1)+(event.extra||0)+(p.combo>=3?1:0)+(a.boost?2:0);points=q.level*100+(p.combo>=3?50:0)+(a.boost?100:0);const before=p.position;p.position=Math.min(GOAL,p.position+steps);beacons=[6,12,18,24].filter(tile=>before<tile&&p.position>=tile);points+=beacons.length*50;p.score+=points;p.totalMs+=a.ms;if(event.id==='recharge'||beacons.length)p.boost=true;}
    else p.combo=0;
    const result={playerId:p.id,name:p.name,correct,steps,points,beacons,answered:!!a,boost:!!a?.boost,ms:a?.ms??null,round:room.round,questionId:q.id};p.records.push(result);results.push(result);
  }
  room.history.push({round:room.round,questionId:q.id,event:event.id,results,at:now});room.phase='reveal';touch(room,now);return results;
}
function control(room,token,action,expectedRoundId,now=Date.now()){
  if(authenticate(room,token).role!=='host')fail('Управлять раундами может только ведущий.',403);
  if(action==='start'){if(room.phase!=='lobby')fail('Игра уже началась.');if(!room.players.length)fail('Подключите хотя бы одного игрока.');startRound(room,now);}
  else if(action==='reveal'){if(expectedRoundId!==room.roundId)fail('Раунд уже сменился.');reveal(room,now);}
  else if(action==='next'){
    if(room.phase!=='reveal'||expectedRoundId!==room.roundId)fail('Сначала завершите текущий раунд.');
    if(room.round+1>=room.deck.length||room.players.some(p=>p.position>=GOAL)){room.phase='finished';room.reason=room.players.some(p=>p.position>=GOAL)?'finish':'deck';touch(room,now);}else startRound(room,now);
  }else if(action==='finish'){
    if(room.phase==='finished')return;if(room.phase==='question')reveal(room,now);room.phase='finished';room.reason='host';touch(room,now);
  }else fail('Неизвестная команда.',422);
}
function tick(room,now=Date.now()){if(room.phase==='question'&&room.deadline&&now>=room.deadline){reveal(room,now);return true;}return false;}
function ranking(room){return [...room.players].sort((a,b)=>b.position-a.position||b.score-a.score||b.correct-a.correct||a.totalMs-b.totalMs);}
function tied(a,b){return a&&b&&a.position===b.position&&a.score===b.score&&a.correct===b.correct&&a.totalMs===b.totalMs;}
function snapshot(room,token,now=Date.now()){
  const auth=authenticate(room,token),player=auth.player;
  if(player)player.lastSeen=now;
  const q=room.round>=0?questions.find(q=>q.id===room.deck[room.round]):null,revealed=['reveal','finished'].includes(room.phase);
  const ranked=ranking(room);let place=1;
  const out={code:room.code,title:room.title,config:room.config,phase:room.phase,round:room.round,roundId:room.roundId,total:room.deck.length,revision:room.revision,serverTime:now,startedAt:room.startedAt,deadline:room.deadline,role:auth.role,me:player?.id||null,goal:GOAL,event:room.round>=0?eventFor(room.round):null,answerCount:Object.keys(room.answers).length,
    players:ranked.map((p,i)=>{if(i&&!tied(p,ranked[i-1]))place=i+1;return {id:p.id,name:p.name,rank:place,color:p.color,position:p.position,score:p.score,correct:p.correct,combo:p.combo,bestCombo:p.bestCombo,boost:p.boost,answered:!!room.answers[p.id],online:now-p.lastSeen<15000,totalMs:p.totalMs};}),reason:room.reason,history:revealed?room.history:room.history.slice(0,room.round)};
  if(q&&room.phase!=='lobby'){
    out.question={id:q.id,type:q.type,topic:q.topic,prompt:q.prompt,level:q.level};
    if(q.type==='choice')out.question.options=room.options.map(o=>({id:o.id,text:o.text}));
    else {out.question.left=q.pairs.map(p=>p[0]);out.question.right=room.options;}
    if(revealed){out.question.correct=q.type==='choice'?room.options.find(o=>o.index===q.correct).id:q.pairs.map(p=>p[1]);out.question.explanation=q.explanation;}
  }
  if(player){out.submitted=!!room.answers[player.id];out.myAnswer=room.answers[player.id]?(q?.type==='choice'?room.options.find(o=>o.index===room.answers[player.id].answer)?.id:room.answers[player.id].answer):null;out.myResult=revealed?room.history.at(-1)?.results.find(r=>r.playerId===player.id):null;}
  return out;
}
function validRoom(r){return r&&r.version===1&&/^\d{6}$/.test(r.code)&&typeof r.hostToken==='string'&&['lobby','question','reveal','finished'].includes(r.phase)&&Array.isArray(r.deck)&&r.deck.every(id=>questions.some(q=>q.id===id))&&Array.isArray(r.players)&&r.players.length<=MAX_PLAYERS&&Array.isArray(r.history);}
const tabletop=require('./table-engine.cjs');
const quiz={create,join,authenticate,submit,control,reveal,tick,ranking,snapshot,eventFor,validRoom};
const dispatch=name=>(room,...args)=>(room.config?.mode==='board'?tabletop:quiz)[name](room,...args);
module.exports={GOAL,MAX_PLAYERS,eventFor,create:(config={},...args)=>config.mode==='quiz'?create(config,...args):tabletop.create(config,...args),...Object.fromEntries(['join','authenticate','submit','control','reveal','tick','ranking','snapshot'].map(name=>[name,dispatch(name)])),draw:(room,...args)=>{if(room.config.mode!=='board')fail('Колода доступна в настольном режиме.');return tabletop.draw(room,...args);},hint:(room,...args)=>{if(room.config.mode!=='board')fail('Жетоны доступны в настольном режиме.');return tabletop.hint(room,...args);},validRoom:room=>room?.config?.mode==='board'?tabletop.validRoom(room):validRoom(room)};
