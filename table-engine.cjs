// Network transport surrounds the original board-game turn, not the other way round.
const crypto=require('node:crypto'),E=require('./engine.js'),{questions,topics}=require('./questions.js');
const token=()=>crypto.randomBytes(20).toString('base64url');
function fail(message,status=409){throw Object.assign(new Error(message),{status});}
function touch(r,now=Date.now()){r.revision++;r.updatedAt=now;}
function create(config={},code='123456',now=Date.now()){
  const selected=Array.isArray(config.topics)?config.topics.filter(t=>topics[t]):Object.keys(topics),bank=questions.filter(q=>selected.includes(q.topic));
  if(!bank.length)fail('Выберите хотя бы одну тему.',422);
  const count=Math.min(bank.length,Math.max(1,Math.min(45,Number(config.count)||45)));
  return {version:2,code,hostToken:token(),title:String(config.title||'Физогэзик · большой игровой стол').trim().slice(0,70),config:{mode:'board',pace:config.pace==='together'?'together':'turns',check:config.check==='host'?'host':'auto',goal:Number(config.goal)===30?30:15,count,seconds:[0,30,45,60,90,120].includes(Number(config.seconds))?Number(config.seconds):0,topics:selected},players:[],deck:E.shuffle(bank.map(q=>q.id)).slice(0,count),initialCount:count,discard:[],market:[],phase:'lobby',turn:0,round:-1,roundId:null,selectedCard:null,revision:1,createdAt:now,updatedAt:now,startedAt:null,deadline:null,answers:{},history:[],grades:{},reason:null};
}
function authenticate(r,t){if(t===r.hostToken)return {role:'host'};const player=r.players.find(p=>p.token===t);if(!player)fail('Вернитесь в комнату по коду на своём устройстве.',401);return {role:'player',player};}
function join(r,{name,deviceId},now=Date.now()){
  name=String(name||'').trim().replace(/\s+/g,' ').slice(0,24);deviceId=String(deviceId||'');
  if(!name||!/^[\w-]{16,128}$/.test(deviceId))fail('Введите имя и присоединитесь с этого устройства.',422);
  const old=r.players.find(p=>p.deviceId===deviceId);if(old){old.lastSeen=now;return old;}
  if(r.phase!=='lobby')fail('Партия уже началась. Вернуться могут участники этой партии.');
  if(r.players.length>=40)fail('В комнате уже 40 игроков или команд.');
  if(r.players.some(p=>p.name.toLocaleLowerCase('ru')===name.toLocaleLowerCase('ru')))fail('Такое имя уже занято. Добавьте номер команды.',422);
  const p={id:crypto.randomBytes(8).toString('hex'),token:token(),deviceId,name,color:r.players.length,score:0,position:0,correct:0,answered:0,combo:0,bestCombo:0,hints:1,boost:false,totalMs:0,lastSeen:now,records:[],beacons:[]};r.players.push(p);touch(r,now);return p;
}
function actor(r){return r.players[r.turn%r.players.length];}
function required(r){return r.config.pace==='together'?r.players:[actor(r)];}
function canAct(r,t){const a=authenticate(r,t);return a.role==='host'||a.player.id===actor(r)?.id;}
function prepare(r,now){r.phase='draw';r.round++;r.roundId=token().slice(0,14);r.selectedCard=null;r.answers={};r.grades={};r.options=[];r.startedAt=null;r.deadline=null;r.market=r.deck.slice(0,3).map((id,i)=>({id:token().slice(0,12),questionId:id,back:1,slot:i}));touch(r,now);}
function draw(r,t,body,now=Date.now()){
  if(!canAct(r,t))fail('Сейчас карту берёт другой игрок.',403);
  if(r.phase!=='draw'||body.roundId!==r.roundId)fail('Эта карта уже взята или ход сменился.');
  const card=r.market.find(c=>c.id===body.cardId);if(!card)fail('Выберите одну из закрытых карт на столе.',422);
  r.selectedCard={...card};r.deck.splice(r.deck.indexOf(card.questionId),1);r.market=[];
  const q=questions.find(q=>q.id===card.questionId);
  r.options=q.type==='choice'?E.shuffle(q.options.map((text,index)=>({id:token().slice(0,12),text,index}))):E.shuffle(q.pairs.map(p=>p[1]));r.phase='question';r.startedAt=now;r.deadline=r.config.seconds?now+r.config.seconds*1000:null;touch(r,now);
}
function hint(r,t,now=Date.now()){
  const a=authenticate(r,t);if(a.role!=='player'||!required(r).some(p=>p.id===a.player.id))fail('Подсказка доступна отвечающему игроку.',403);
  if(r.phase!=='question'||r.answers[a.player.id])fail('Подсказку берут до отправки ответа.');
  r.hinted=r.hinted||{};if(r.hinted[r.roundId]?.includes(a.player.id))return;
  if(a.player.hints<=0)fail('Жетоны помощи закончились. Новый ждёт на маяке.');
  a.player.hints--;r.hinted[r.roundId]=[...(r.hinted[r.roundId]||[]),a.player.id];touch(r,now);
}
function submit(r,p,body,now=Date.now()){
  if(r.phase!=='question'||body.roundId!==r.roundId)fail('Карта уже закрыта или ход сменился.');
  if(!required(r).some(player=>player.id===p.id))fail('Сейчас отвечает игрок, который открыл карту.',403);
  if(r.answers[p.id])return r.answers[p.id];
  if(r.deadline&&now>=r.deadline)fail('Время ответа истекло.');
  const q=questions.find(q=>q.id===r.selectedCard.questionId);let answer,correct;
  if(body.skip===true){answer=null;correct=false;if(r.config.check==='host')r.grades[p.id]=false;}
  else if(r.config.check==='host'){answer=String(body.answer||'').trim().slice(0,3000);if(!answer)fail('Напишите ответ или рассуждение для ведущего.',422);correct=null;}
  else if(q.type==='choice'){const option=r.options.find(o=>o.id===body.answer);if(!option)fail('Выберите вариант на открытой карте.',422);answer=option.index;correct=E.isCorrect(q,answer);}
  else{if(!Array.isArray(body.answer)||body.answer.length!==q.pairs.length||!body.answer.every(v=>q.pairs.some(pair=>pair[1]===v)))fail('Укажите все шесть переходов.',422);answer=body.answer;correct=E.isCorrect(q,answer);}
  r.answers[p.id]={answer,correct,ms:Math.max(0,now-r.startedAt)};p.lastSeen=now;
  if(required(r).every(player=>r.answers[player.id]))r.phase='checking';touch(r,now);return r.answers[p.id];
}
function reveal(r,now=Date.now()){
  if(!['question','checking','grading'].includes(r.phase))fail('Сначала возьмите карту и ответьте.');
  if(r.config.check==='host'&&required(r).some(p=>r.answers[p.id]&&typeof r.grades[p.id]!=='boolean'))fail('Ведущий должен оценить отправленные ответы.');
  const q=questions.find(q=>q.id===r.selectedCard.questionId),results=[];
  for(const p of required(r)){
    const a=r.answers[p.id],correct=r.config.check==='host'?!!r.grades[p.id]:!!a?.correct,from=p.position,steps=correct?q.level:0;
    p.answered++;if(correct){p.correct++;p.combo++;p.bestCombo=Math.max(p.bestCombo,p.combo);p.position=Math.min(r.config.goal,p.position+steps);p.score+=q.level;p.totalMs+=a.ms;}else p.combo=0;
    const checkpoints=r.config.goal===15?[5,10]:[6,12,18,24],beacons=checkpoints.filter(n=>from<n&&p.position>=n&&!p.beacons.includes(n));
    if(beacons.length){p.hints=Math.min(3,p.hints+beacons.length);p.beacons.push(...beacons);}
    const result={playerId:p.id,name:p.name,correct,steps,points:steps,from,to:p.position,beacons,answered:!!a,ms:a?.ms??null,round:r.round,questionId:q.id,turnOwner:actor(r).id};p.records.push(result);results.push(result);
  }
  r.history.push({round:r.round,roundId:r.roundId,questionId:q.id,event:'card',owner:actor(r).id,results,at:now});r.discard.push(q.id);r.phase='reveal';r.deadline=null;touch(r,now);return results;
}
function control(r,t,action,roundId,now=Date.now(),body={}){
  const auth=authenticate(r,t),host=auth.role==='host';
  if(action==='start'){if(!host)fail('Партию запускает ведущий.',403);if(r.phase!=='lobby')fail('Партия уже началась.');if(!r.players.length)fail('Пригласите хотя бы одного игрока.');r.turn=0;prepare(r,now);return;}
  if(action==='finish'){if(!host)fail('Партию завершает ведущий.',403);if(r.phase==='finished')return;if(r.phase==='reveal'||r.phase==='draw'||r.phase==='lobby'){r.phase='finished';r.reason='host';touch(r,now);return;}fail('Сначала проверьте открытую карту.');}
  if(roundId!==r.roundId)fail('Ход уже сменился.');
  if(action==='check'){if(!host||r.config.check!=='host')fail('Эталон открывает ведущий.',403);if(!['question','checking'].includes(r.phase))fail('Сейчас нечего проверять.');r.phase='grading';r.deadline=null;touch(r,now);return;}
  if(action==='grade'){if(!host||r.phase!=='grading')fail('Ответы оценивает ведущий после открытия эталона.',403);if(!r.answers[body.playerId]||typeof body.correct!=='boolean')fail('Выберите ответ игрока и оценку.',422);r.grades[body.playerId]=body.correct;touch(r,now);return;}
  if(action==='reveal'){if(!host&&(!canAct(r,t)||r.phase!=='checking'||r.config.check==='host'))fail('Проверка доступна ведущему или ходящему игроку после ответа.',403);reveal(r,now);return;}
  if(action==='next'){
    if(!canAct(r,t))fail('Ход передаёт ведущий или ходящий игрок.',403);if(r.phase!=='reveal')fail('Сначала проверьте карту.');
    if(r.players.some(p=>p.position>=r.config.goal)||!r.deck.length){r.phase='finished';r.reason=r.players.some(p=>p.position>=r.config.goal)?'finish':'deck';touch(r,now);}else{r.turn=(r.turn+1)%r.players.length;prepare(r,now);}return;
  }fail('Неизвестное действие игрового стола.',422);
}
function tick(r,now=Date.now()){if(r.phase==='question'&&r.deadline&&now>=r.deadline){if(r.config.check==='host'){r.phase='grading';r.deadline=null;touch(r,now);}else reveal(r,now);return true;}return false;}
function ranking(r){return [...r.players].sort((a,b)=>b.position-a.position||b.correct-a.correct);}
function snapshot(r,t,now=Date.now()){
  const auth=authenticate(r,t),p=auth.player;if(p)p.lastSeen=now;const ranks=ranking(r);let place=1;
  const canSee=['question','checking','grading','reveal','finished'].includes(r.phase)&&r.selectedCard,q=canSee?questions.find(q=>q.id===r.selectedCard.questionId):null,revealed=r.phase==='reveal'||r.phase==='finished',host=auth.role==='host',checkingHost=host&&r.phase==='grading';
  const out={code:r.code,title:r.title,config:r.config,phase:r.phase,round:r.round,roundId:r.roundId,total:r.initialCount,revision:r.revision,serverTime:now,startedAt:r.startedAt,deadline:r.deadline,role:auth.role,me:p?.id||null,goal:r.config.goal,turn:r.turn,activePlayerId:actor(r)?.id||null,activePlayerName:actor(r)?.name||'',canDraw:canAct(r,t)&&r.phase==='draw',canPass:canAct(r,t)&&r.phase==='reveal',canCheck:host||canAct(r,t)&&r.phase==='checking'&&r.config.check==='auto',eligible:host?false:required(r).some(v=>v.id===p.id),remaining:r.deck.length,discardCount:r.discard.length,market:r.phase==='draw'?r.market.map(c=>({id:c.id,back:c.back,slot:c.slot})):[],selectedCard:r.selectedCard?{id:r.selectedCard.id}:null,answerCount:Object.keys(r.answers).length,requiredCount:r.phase==='lobby'?0:required(r).length,reason:r.reason,
    players:ranks.map((v,i)=>{if(i&&(v.position!==ranks[i-1].position||v.correct!==ranks[i-1].correct))place=i+1;return {id:v.id,name:v.name,color:v.color,rank:place,position:v.position,score:v.score,correct:v.correct,answeredCount:v.answered,combo:v.combo,bestCombo:v.bestCombo,hints:v.hints,beacons:v.beacons,answered:!!r.answers[v.id],active:v.id===actor(r)?.id,online:now-v.lastSeen<15000,totalMs:v.totalMs};}),history:r.history};
  if(q){out.question={id:q.id,type:q.type,topic:q.topic,prompt:r.config.check==='host'?q.oral:q.prompt,level:q.level};if(q.type==='choice')out.question.options=r.options.map(o=>({id:o.id,text:o.text}));else{out.question.left=q.pairs.map(pair=>pair[0]);out.question.right=r.options;}
    if(revealed||checkingHost){out.question.correct=q.type==='choice'?r.options.find(o=>o.index===q.correct).id:q.pairs.map(pair=>pair[1]);out.question.explanation=q.explanation;}
    if(p&&r.hinted?.[r.roundId]?.includes(p.id)){out.hint=q.type==='choice'?{eliminated:r.options.filter(o=>o.index!==q.correct).slice(0,2).map(o=>o.id),text:'Два неверных варианта исключены. Сравни оставшиеся.'}:{text:'Плавление, парообразование и сублимация требуют энергии; обратные переходы её выделяют.'};}
  }
  if(p){const a=r.answers[p.id];out.submitted=!!a;out.myAnswer=a?(r.config.check==='host'?a.answer:q.type==='choice'?r.options.find(o=>o.index===a.answer)?.id:a.answer):null;out.myResult=revealed?r.history.at(-1)?.results.find(v=>v.playerId===p.id):null;}
  if(host&&r.phase==='grading')out.review=required(r).filter(v=>r.answers[v.id]).map(v=>({id:v.id,name:v.name,answer:r.answers[v.id].answer,grade:typeof r.grades[v.id]==='boolean'?r.grades[v.id]:null}));
  return out;
}
function validRoom(r){return r&&r.version===2&&r.config?.mode==='board'&&typeof r.hostToken==='string'&&/^\d{6}$/.test(r.code)&&Array.isArray(r.deck)&&r.deck.every(id=>questions.some(q=>q.id===id))&&Array.isArray(r.market)&&Array.isArray(r.players)&&Array.isArray(r.history)&&['lobby','draw','question','checking','grading','reveal','finished'].includes(r.phase);}
module.exports={create,join,authenticate,draw,hint,submit,reveal,control,tick,ranking,snapshot,validRoom};
