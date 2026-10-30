(() => {
  'use strict';
  const {questions,topics,formulas}=FizData, E=FizEngine;
  const $=s=>document.querySelector(s), main=$('#main');
  const KEY='fizogezik.v1', colors=['#9870ce','#d49a54','#509f9c','#cc7392'];
  const emptyStore=()=>({game:null,campaign:FizCampaign.createProfile(),networkRewards:[],stats:{attempts:0,correct:0,byQuestion:{}},sessions:[],sound:false});
  let store=emptyStore();
  try {
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(saved && saved.stats && Number.isFinite(saved.stats.attempts) && typeof saved.stats.byQuestion==='object' && Array.isArray(saved.sessions)) {
      store={...store,...saved};
      if(store.game && !E.validGame(store.game,questions)) store.game=null;
    }
  } catch { $('#storage-warning').hidden=false; }
  if(!FizCampaign.validProfile(store.campaign,questions))store.campaign=FizCampaign.createProfile();
  const adventure=FizAdventureUI.create({main,questions,esc,save,go,toast,openDialog,playTone,getStore:()=>store,onAttempt(id,correct){const s=store.stats;s.attempts++;if(correct)s.correct++;const entry=s.byQuestion[id]||(s.byQuestion[id]={attempts:0,correct:0});entry.attempts++;if(correct)entry.correct++;entry.lastCorrect=correct;}});
  const rooms=FizRoomUI.create({main,esc,go,toast,save,openDialog,onReward(code,correct){if(!Array.isArray(store.networkRewards))store.networkRewards=[];if(store.networkRewards.includes(code))return;store.networkRewards.push(code);FizCampaign.ensureDaily(store.campaign);store.campaign.xp+=correct*10;store.campaign.daily.xp+=correct*10;store.campaign.gems+=Math.min(20,correct*2);save();if(correct)toast(`Экспедиция принесла ${correct*10} XP в личный прогресс!`);}});
  const setup={party:false,count:2,names:['Игрок 1','Игрок 2','Игрок 3','Игрок 4'],topics:Object.keys(topics),levels:[1,2,3],mode:'race',check:'auto'};
  let route='',libraryTopic='all',libraryLevel=0,search='',formulaTopic='all',selected=null,matchAnswers=[],oralDraft='',revealed=false,toastTimer;
  function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(store));}catch{$('#storage-warning').hidden=false;}}
  function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
  function plural(n,one,two,many){const k=n%100;return k>=11&&k<=14?many:n%10===1?one:n%10>=2&&n%10<=4?two:many;}
  function pointText(n){return `${n} ${plural(n,'балл','балла','баллов')}`;}
  function cardText(n){return `${n} ${plural(n,'карточка','карточки','карточек')}`;}
  function topicTag(id){const t=topics[id];return `<span class="topic-tag" style="--topic-color:${t.color}"><span>${t.icon}</span>${t.name}</span>`;}
  function difficulty(q){return `<span class="difficulty" aria-label="Сложность: ${pointText(q.level)}">${'●'.repeat(q.level)}${'○'.repeat(3-q.level)} &nbsp; ${pointText(q.level)}</span>`;}
  function correctText(q){return q.type==='match'?q.pairs.map(p=>`${p[0]} — ${p[1].toLowerCase()}`).join('; '):q.options[q.correct];}
  function mistakes(ids){return questions.filter(q=>(!ids || ids.includes(q.id)) && store.stats.byQuestion[q.id]?.lastCorrect===false);}
  function go(target){if(location.hash===`#${target}`){render();window.scrollTo(0,0);}else location.hash=target;}
  function render(){
    route=location.hash.slice(1).split('?')[0] || 'table';
    if(route.startsWith('room/'))route='room';
    if(route==='game' && !store.game) route='home';
    if(!['home','table','lesson','game','library','formulas','progress','rooms','room'].includes(route)) route='home';
    if(route!=='rooms'&&route!=='room')rooms.stop();
    document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===(route==='game'?'table':route==='lesson'?'home':route==='room'?'rooms':route);a.classList.toggle('active',active);active?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current');});
    document.body.classList.toggle('in-adventure',route==='home'||route==='lesson');
    if(route==='home') adventure.renderHome();
    if(route==='table') renderHome();
    if(route==='lesson') adventure.renderLesson();
    if(route==='game') renderGame();
    if(route==='library') renderLibrary();
    if(route==='formulas') renderFormulas();
    if(route==='progress') renderProgress();
    if(route==='rooms'||route==='room')rooms.render();
    document.title=`${{home:'Приключение',table:'Настольная игра',lesson:'Миссия',game:'Игра',library:'Карточки',formulas:'Формулы',progress:'Мой прогресс',rooms:'Вместе',room:'Комната'}[route]} — Физогэзик`;
  }
  function renderHome(){
    main.innerHTML=`${store.game&&!store.game.finished?`<div class="resume-banner"><div><strong>Твоя партия ждёт продолжения</strong><p>Ход ${store.game.cursor+1} из ${store.game.deck.length} · ${store.game.players.map(p=>esc(p.name)).join(', ')}</p></div><button class="primary" data-action="resume">Продолжить <span class="arrow">↗</span></button></div>`:''}
    <div class="home-layout table-home-layout"><section class="table-home-board"><div class="table-home-intro"><span class="tag">Настолка, которая ожила</span><h1>Твоё поле. Твоя карта.<br>Твой следующий ход.</h1><p>Открывай карты, вспоминай физику и двигай фишку к финишу.</p></div>${FizTableUI.field(15,[{id:'preview',name:'Твоя фишка',color:0,position:0}],null,FizTableUI.deckWell([{id:'p1'},{id:'p2'},{id:'p3'}],false,'Давай сыграем!',false,true))}<div class="table-home-footer"><span>45 карт</span><span>5 тем физики</span><span>1–4 игрока на одном экране</span></div></section>
    <section class="setup" aria-labelledby="setup-title"><h2 id="setup-title">Начнём партию?</h2><p>Пара настроек — и можно делать первый ход.</p><a class="network-table-link" href="#rooms">🚀 Играть с отдельных устройств по коду</a>
    <div class="segmented" aria-label="Количество игроков"><button data-action="solo" class="${!setup.party?'selected':''}" aria-pressed="${!setup.party}">◎ Самостоятельно</button><button data-action="party" class="${setup.party?'selected':''}" aria-pressed="${setup.party}">♧ С друзьями</button></div>
    ${setup.party?`<span class="field-title">Сколько игроков или команд?</span><div class="player-count">${[2,3,4].map(n=>`<button class="count-button ${setup.count===n?'selected':''}" data-action="count" data-value="${n}" aria-pressed="${setup.count===n}">${n}</button>`).join('')}</div><div class="player-inputs">${setup.names.slice(0,setup.count).map((name,i)=>`<label class="name-field" style="--player-color:${colors[i]}"><i class="dot"></i><input data-name-index="${i}" value="${esc(name)}" maxlength="24" aria-label="Имя игрока ${i+1}"></label>`).join('')}</div>`:''}
    <span class="field-title">Что повторим? <small>Можно выбрать несколько</small></span><div class="chips">${Object.entries(topics).map(([id,t])=>`<button class="chip ${setup.topics.includes(id)?'selected':''}" data-action="topic" data-value="${id}" aria-pressed="${setup.topics.includes(id)}"><span>${t.icon}</span> ${t.name}</button>`).join('')}</div>
    <span class="field-title">Сложность карточек</span><div class="level-row">${[1,2,3].map(n=>`<button class="chip ${setup.levels.includes(n)?'selected':''}" data-action="level" data-value="${n}" aria-pressed="${setup.levels.includes(n)}">${'●'.repeat(n)} &nbsp; ${pointText(n)}</button>`).join('')}</div>
    <label for="game-mode" class="field-title">Как играем?</label><select id="game-mode"><option value="race" ${setup.mode==='race'?'selected':''}>До финиша — набрать 15 баллов</option><option value="deck" ${setup.mode==='deck'?'selected':''}>Вся колода — победит лучший результат</option></select>
    <label class="check-line"><input type="checkbox" id="host-mode" ${setup.check==='host'?'checked':''}><span>С ведущим: отвечаем своими словами,<br>ведущий сверяет ответ с эталоном</span></label>
    <div class="setup-foot"><span id="deck-count">${cardText(availableQuestions().length)} в колоде</span><span>Без таймера</span></div><div class="form-error" id="setup-error" role="alert" hidden></div><button class="primary wide" data-action="start" ${!availableQuestions().length?'disabled':''}>${setup.party?'Начать игру':'Поехали играть'}<span class="arrow">↗</span></button><p class="save-note">Прогресс сохраняется в этом браузере</p></section></div>
    <div class="learning-strip"><a href="#progress" class="learning-item"><span class="learning-icon">↺</span><div><h3>Ошибки — тоже опыт</h3><p>${mistakes().length?`${cardText(mistakes().length)} для повторения`:'Сложные вопросы вернутся в тренировке'}</p></div><span class="end-arrow">↗</span></a><a href="#formulas" class="learning-item"><span class="learning-icon">ƒ</span><div><h3>Формулы под рукой</h3><p>Короткий справочник по всем темам</p></div><span class="end-arrow">↗</span></a><button data-action="rules" class="learning-item" style="text-align:left"><span class="learning-icon">♧</span><div><h3>Как в настоящей настолке</h3><p>Один экран, друзья и немного азарта</p></div><span class="end-arrow">↗</span></button></div>
    <h2 class="section-heading">Вся физика, шаг за шагом</h2><div class="topic-overview">${Object.entries(topics).map(([id,t])=>`<a href="#library" data-library-topic="${id}"><span class="topic-symbol" style="--topic-color:${t.color}">${t.icon}</span><div><h3>${t.name}</h3><p>${cardText(questions.filter(q=>q.topic===id).length)}</p></div></a>`).join('')}</div>`;
  }
  function availableQuestions(){return questions.filter(q=>setup.topics.includes(q.topic)&&setup.levels.includes(q.level));}
  function newGame(config){
    try{store.game=E.createGame(config,questions);resetAnswer();save();go('game');}catch(e){toast(e.message);}
  }
  function start(){
    const config={names:setup.party?setup.names.slice(0,setup.count):['Ты'],topics:[...setup.topics],levels:[...setup.levels],mode:setup.mode,check:setup.check};
    if(store.game&&!store.game.finished){confirmDialog('Начать новую партию?','Текущая партия будет заменена. Ответы и учебный прогресс останутся в статистике.',()=>newGame(config),'Начать новую');}
    else newGame(config);
  }
  function resetAnswer(){selected=null;matchAnswers=[];oralDraft='';revealed=false;}
  function board(game){
    const position=p=>game.config.mode==='race'?Math.min(15,p.score):p.score===0?0:((p.score-1)%15)+1;
    const players=game.players.map((p,i)=>({...p,id:'local-'+i,color:i,position:position(p)}));
    const q=game.active?questions.find(q=>q.id===game.active.id):null;
    const well=q?FizTableUI.face(q,{back:game.phase==='feedback',animate:true,explanation:game.phase==='feedback'?(game.active.result.correct?'Верно! Фишка движется на '+game.active.result.points+' клетки.':'Разберём ответ и попробуем на следующем ходу.'):'',owner:'Карту открыл '+game.players[game.turn].name}):FizTableUI.deckWell(game.deck.slice(game.cursor,game.cursor+3).map((_,i)=>({id:String(i)})),true,'Ходит '+game.players[game.turn].name,true);
    return FizTableUI.field(15,players,'local-'+game.turn,well,game.phase)+`<div class="physical-deck-footer"><span class="mini-card-stack">▱▱▱</span><div><strong>${game.deck.length-game.cursor} карт в колоде</strong><small>Вопрос скрыт до открытия</small></div><span>Сброс: ${game.cursor}</span></div>`;
  }
  function playerCards(g){return `<div class="players">${g.players.map((p,i)=>`<div class="player-card ${!g.finished&&g.turn===i?'current':''}" style="--player-color:${colors[i]}"><div class="player-name"><i class="dot"></i>${esc(p.name)} ${g.players.length>1?`<span class="small-caps">${i+1}</span>`:''}</div><div class="player-meta"><span>${p.correct} из ${p.answered} верно</span><b>${p.score}<small style="font-size:10px;font-weight:400;color:var(--muted)"> ${g.config.mode==='race'?'/ 15':'бал.'}</small></b></div><div class="player-progress"><i style="width:${Math.min(p.score/15*100,100)}%"></i></div></div>`).join('')}</div>`;}
  function renderGame(){
    const g=store.game;
    if(g.finished){renderResults(g);return;}
    const p=g.players[g.turn];
    main.innerHTML=`<div class="game-top"><div class="game-title"><button class="back-button" data-action="pause" aria-label="Сохранить и выйти на главную">‹</button><div><h1>${g.config.practice?'Тренировка ошибок':g.players.length===1?'Твоя орбита знаний':'Большая игра'}</h1><p>${g.config.mode==='race'?'До 15 баллов':`Вся колода: ${g.deck.length} вопросов`} · ${g.config.check==='host'?'С ведущим':'Автопроверка'}</p></div></div><div class="game-controls"><button class="text-button" data-action="sound" aria-label="${store.sound?'Выключить':'Включить'} звук">${store.sound?'♫':'♩'} <span class="sound-label">${store.sound?'Звук вкл.':'Звук выкл.'}</span></button><button class="text-button" data-action="rules">Правила</button></div></div>
    <div class="game-layout"><div class="board-column">${board(g)}${renderLog(g)}</div><section aria-label="Текущий ход">${playerCards(g)}<div class="turn-card"><div class="turn-label"><span><i class="dot" style="--player-color:${colors[g.turn]}"></i> &nbsp; Ходит <strong>${esc(p.name)}</strong></span><span>Ход ${g.cursor+1} / ${g.deck.length}</span></div><div id="turn-content" aria-live="polite">${turnContent(g)}</div></div><div class="key-note">Клавиши 1–4 — выбрать вариант · Enter — подтвердить</div></section></div>`;
    FizTableUI.movePieces(main);
  }
  function renderLog(g){const entries=FizJournal.recent(g.history);return `<section class="session-log"><h3>Последние ходы</h3>${entries.length?entries.slice(-3).reverse().map(h=>{const q=questions.find(q=>q.id===h.id);return `<div class="log-item"><i class="dot" style="--player-color:${colors[h.player]}"></i><strong>${esc(g.players[h.player].name)}</strong><span class="log-text">${esc(q.prompt)}</span><span class="log-result">${h.correct?`+${h.points}`:'без шага'}</span></div>`;}).join(''):'<p class="subtle" style="font-size:11px">Здесь появятся ходы текущего часа.</p>'}</section>`;}
  function turnContent(g){
    if(g.phase==='draw')return `<div class="draw-content"><div class="deck-visual"><img src="assets/card-1.webp" alt="Колода карточек с Физогэзиком"></div><h2>Всё начинается с вопроса</h2><p>Вытяни карточку. Чем сложнее вопрос,<br>тем дальше продвинется твоя фишка.</p><button class="primary wide" data-action="draw">Взять карточку <span class="arrow">↗</span></button></div><div class="draw-hint"><img src="assets/thinking.png" alt=""><span>${g.config.check==='host'?'Сначала ответьте сами. Затем ведущий откроет эталон и оценит ответ.':'Не спеши. Здесь нет таймера: можно подумать и вспомнить нужную формулу.'}</span></div>`;
    const q=questions.find(q=>q.id===g.active.id),feedback=g.phase==='feedback';
    let content=`<div class="question-meta">${topicTag(q.topic)}${difficulty(q)}</div><h2 class="question-text">${esc(g.config.check==='host'?q.oral:q.prompt)}</h2>`;
    if(g.config.check==='host'){
      content+=`<p class="oral-note">Ответь вслух или запиши рассуждение. Ведущий проверит его по эталону.</p><textarea class="oral-area" id="oral-draft" placeholder="Моё объяснение…" aria-label="Ответ своими словами" ${feedback||revealed?'readonly':''}>${esc(feedback?g.active.answerDraft||'':oralDraft)}</textarea>`;
      if(revealed||feedback)content+=`<div class="host-answer"><strong>Эталон ответа</strong><p>${esc(q.explanation)}</p></div>`;
      if(!feedback)content+=revealed?`<p class="oral-note" style="margin-top:14px">Ведущий, засчитать ответ? ${pointText(q.level)} за полный ответ.</p><div class="grade-buttons"><button data-action="grade-yes">✓ Ответ верный</button><button class="no" data-action="grade-no">Нужно повторить</button></div>`:`<div class="question-actions"><button class="primary wide" data-action="reveal">Показать эталон ведущему</button></div>`;
    }else if(q.type==='choice'){
      content+=`<div class="options">${g.active.order.map((index,i)=>{const chosen=feedback?g.active.answer===index:selected===index;const cls=feedback?(index===q.correct?'correct':chosen?'wrong':''):(chosen?'selected':'');return `<button class="option ${cls}" data-action="answer" data-index="${index}" ${feedback?'disabled':''} aria-pressed="${chosen}"><span class="option-letter">${feedback&&index===q.correct?'✓':['А','Б','В','Г'][i]}</span><span>${esc(q.options[index])}</span></button>`;}).join('')}</div>`;
      if(!feedback)content+=`<div class="question-actions"><button class="primary wide" data-action="submit" ${selected===null?'disabled':''}>Проверить ответ</button><button class="text-button wide" data-action="skip">Пока не знаю</button></div>`;
    }else{
      content+=`<div class="phase-diagram" aria-hidden="true"><b>Твёрдое</b><span>⇄</span><b>Жидкость</b><span>⇄</span><b>Газ</b></div><div class="match-answers">${q.pairs.map(([label,answer],i)=>{const current=feedback?g.active.answer?.[i]||'':matchAnswers[i]||'';return `<label class="match-row"><span>${label}</span><select data-match-index="${i}" aria-label="${label}" ${feedback?'disabled':''} class="${feedback?(current===answer?'match-correct':'match-wrong'):''}"><option value="">Выбрать…</option>${g.active.order.map(j=>`<option value="${q.pairs[j][1]}" ${current===q.pairs[j][1]?'selected':''}>${q.pairs[j][1]}</option>`).join('')}</select></label>`;}).join('')}</div>`;
      if(!feedback)content+=`<div class="question-actions"><button class="primary wide" data-action="submit" ${q.pairs.every((_,i)=>matchAnswers[i])?'':'disabled'}>Проверить переходы</button><button class="text-button wide" data-action="skip">Пока не знаю</button></div>`;
    }
    if(feedback){const r=g.active.result;content+=`<div class="feedback ${r.correct?'':'incorrect'}" role="status"><h3>${r.correct?`✓ Верно! +${pointText(r.points)}`:'↺ Это повод разобраться'}</h3>${g.config.check==='auto'?`${!r.correct?`<p class="correct-answer-text">${q.type==='match'?'Правильные переходы':'Правильный ответ'}: ${esc(correctText(q))}.</p>`:''}<p style="margin-top:${r.correct?'0':'9px'}">${esc(q.explanation)}</p>`:'<p>Оценка ведущего записана. Следующий ход — новая возможность.</p>'}</div><div class="question-actions"><button class="primary wide" data-action="next">${(g.config.mode==='race'&&g.players.some(p=>p.score>=15))||g.cursor+1===g.deck.length?'Посмотреть результаты':'Следующий ход'} <span class="arrow">↗</span></button></div>`;}
    return content;
  }
  function updateTurn(){const content=$('#turn-content');if(content)content.innerHTML=turnContent(store.game);}
  function draw(slot=0){E.draw(store.game,questions,Math.random,slot);resetAnswer();save();renderGame();focusQuestion();}
  function focusQuestion(){const heading=$('.question-text');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  function submitAnswer(answer,manual=false){
    const g=store.game;if(!g||g.phase!=='answer')return;
    const result=E.submit(g,questions,answer,manual);if(!result)return;
    if(manual)g.active.answerDraft=oralDraft;
    const s=store.stats;s.attempts++;if(result.correct)s.correct++;
    const entry=s.byQuestion[result.id]||(s.byQuestion[result.id]={attempts:0,correct:0});entry.attempts++;if(result.correct)entry.correct++;entry.lastCorrect=result.correct;
    save();playTone(result.correct);renderGame();
    const feedback=$('.feedback');if(feedback){feedback.tabIndex=-1;feedback.focus({preventScroll:true});if(window.innerWidth<651)feedback.scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'nearest'});}
  }
  function next(){const g=store.game;if(!g||g.phase!=='feedback')return;E.advance(g);resetAnswer();if(g.finished){
    if(!store.sessions.some(s=>s.id===g.id)){store.sessions.unshift({id:g.id,at:Date.now(),players:g.players,attempts:g.history.length,correct:g.history.filter(h=>h.correct).length,practice:!!g.config.practice});store.sessions=store.sessions.slice(0,30);}
  }save();renderGame();if(g.finished)window.scrollTo(0,0);}
  function renderResults(g){
    const ranking=E.ranking(g),max=ranking[0].score,winners=ranking.filter(p=>p.score===max),wrong=[...new Set(g.history.filter(h=>!h.correct).map(h=>h.id))],correct=g.history.filter(h=>h.correct).length;
    main.innerHTML=`<div class="results"><div class="results-head"><img src="assets/happy.png" alt="Улыбающийся Физогэзик"><span class="tag" style="display:table;margin:7px auto">${g.config.practice?'Тренировка завершена':'Партия завершена'}</span><h1>${g.players.length===1?(g.players[0].score>=15&&g.config.mode==='race'?'Финиш. Отличная работа!':'Ещё на шаг ближе к ОГЭ!'):winners.length>1?'Дружеская ничья!':`Побеждает ${esc(winners[0].name)}!`}</h1><p>${correct} из ${g.history.length} ${plural(g.history.length,'ответа','ответов','ответов')} верно. ${wrong.length?'Теперь можно спокойно разобрать сложные моменты.':'Все вопросы пройдены без ошибок. Так держать!'}</p></div>
    <div class="results-rank">${ranking.map((p,i)=>`<div class="rank-row"><span class="rank-num">${p.score===max?'✦':i+1}</span><i class="dot" style="--player-color:${colors[p.index]}"></i><div><div class="rank-name">${esc(p.name)}</div><div class="rank-info">${p.correct} из ${p.answered} верно${p.answered?` · ${Math.round(p.correct/p.answered*100)} %`:''}</div></div><div class="rank-score">${p.score} <small>${plural(p.score,'балл','балла','баллов')}</small></div></div>`).join('')}</div>
    <div class="results-actions"><button class="primary" data-action="rematch">Сыграть ещё <span class="arrow">↗</span></button>${wrong.length?`<button class="secondary" data-action="retry-session">Повторить ошибки (${wrong.length})</button>`:''}<button class="secondary" data-action="export">Скачать итог</button><a class="text-button" href="#home">На главную</a></div>
    ${wrong.length?`<h2 class="section-heading">Разберём вопросы</h2><div class="mistake-list">${wrong.map(id=>mistakeCard(questions.find(q=>q.id===id))).join('')}</div>`:''}</div>`;
  }
  function mistakeCard(q){return `<details class="mistake-card"><summary><div class="subtle">${topics[q.topic].name} · ${pointText(q.level)}</div>${esc(q.prompt)}</summary><p><strong>${esc(correctText(q))}</strong></p><p>${esc(q.explanation)}</p></details>`;}
  function startPractice(ids){if(!ids.length){toast('Ошибок для повторения пока нет. Отличный повод сыграть!');return;}const config={names:['Ты'],mode:'deck',check:'auto',practice:true,ids};if(store.game&&!store.game.finished)confirmDialog('Перейти к тренировке?','Текущая партия будет заменена тренировкой ошибок. Учебный прогресс сохранится.',()=>newGame(config),'Тренироваться');else newGame(config);}
  function filters(active,action){return `<div class="filters"><button class="filter-button ${active==='all'?'selected':''}" data-action="${action}" data-value="all">Все темы</button>${Object.entries(topics).map(([id,t])=>`<button class="filter-button ${active===id?'selected':''}" data-action="${action}" data-value="${id}">${t.icon} ${t.name}</button>`).join('')}</div>`;}
  function renderLibrary(){
    main.innerHTML=`<div class="page-top"><div><h1>Колода знаний</h1><p>Все 45 вопросов настолки. Изучай карточки в своём темпе.</p></div><span class="tag">20 простых · 15 средних · 10 сложных</span></div>
    ${filters(libraryTopic,'library-topic')}<div class="library-controls"><label class="search"><span>⌕</span><input id="library-search" type="search" placeholder="Найти закон, явление или формулу" value="${esc(search)}" aria-label="Поиск по карточкам"></label><div class="filters" style="margin:0">${[0,1,2,3].map(n=>`<button data-action="library-level" data-value="${n}" class="filter-button ${libraryLevel===n?'selected':''}">${n?pointText(n):'Любая сложность'}</button>`).join('')}</div></div><p id="library-count" class="subtle" style="margin:18px 0;font-size:11px"></p><div class="library-grid" id="library-results"></div><p class="reference-note">Карточки адаптированы для автоматической проверки. В режиме с ведущим доступны открытые вопросы. Объяснения уточняют условия физических законов и исправляют неточности исходного набора.</p>`;
    renderLibraryCards();
  }
  function renderLibraryCards(){const normalized=search.toLocaleLowerCase('ru').replace(/ё/g,'е');const items=questions.filter(q=>(libraryTopic==='all'||q.topic===libraryTopic)&&(!libraryLevel||q.level===libraryLevel)&&`${q.prompt} ${q.explanation} ${correctText(q)}`.toLocaleLowerCase('ru').replace(/ё/g,'е').includes(normalized));
    $('#library-count').textContent=`Найдено: ${cardText(items.length)}`;
    $('#library-results').innerHTML=items.length?items.map(q=>`<article class="library-card"><div class="question-meta">${topicTag(q.topic)}${difficulty(q)}</div><h3>${esc(q.prompt)}</h3><details><summary>Открыть ответ и объяснение</summary><p><strong>${esc(correctText(q))}</strong></p><p>${esc(q.explanation)}</p></details></article>`).join(''):`<div class="empty-state"><h2>Таких карточек нет</h2><p>Измени запрос или выбери другую тему и сложность.</p><button class="secondary" data-action="clear-search">Сбросить фильтры</button></div>`;
  }
  function renderFormulas(){const filtered=formulas.filter(f=>formulaTopic==='all'||f[0]===formulaTopic);main.innerHTML=`<div class="page-top"><div><h1>Формулы под рукой</h1><p>Проверенные записи, единицы СИ и условия применения.</p></div><span class="tag">20 разделов · математическая вёрстка</span></div>${filters(formulaTopic,'formula-topic')}<div class="formula-grid">${filtered.map(([topic,title,formula,note])=>`<article class="formula-card">${topicTag(topic)}<h3>${title}</h3><div class="formula-main">${esc(formula)}</div><p>${esc(note)}</p></article>`).join('')}</div><div class="reference-note">Переводи величины в СИ и проверяй условия применения формул. Стрелка над символом обозначает вектор, нижний индекс x — его проекцию. Буква P обозначает мощность или вес в соответствующем разделе, p — давление или модуль импульса; контекст указан в карточке. Это справочник к игре, а не полный кодификатор экзамена.</div>`;}
  function renderProgress(){const s=store.stats,wrong=mistakes();main.innerHTML=`<div class="page-top"><div><h1>Знания остаются с тобой</h1><p>Все партии и тренировки в этом браузере — в одной копилке.</p></div>${wrong.length?`<button class="secondary" data-action="practice">↺ Повторить ошибки (${wrong.length})</button>`:''}</div>
    <a href="#home" class="campaign-progress-link"><span>✦ <strong>Твоя экспедиция</strong><small>${Object.keys(store.campaign.completed).length} из 20 миссий · ${store.campaign.xp} XP · ${store.campaign.gems} кристаллов</small></span><span>На карту ↗</span></a>
    <div class="stats-grid"><div class="stat-card"><b>${s.attempts}</b><span>Ответов за всё время</span></div><div class="stat-card"><b>${s.attempts?Math.round(s.correct/s.attempts*100):0}<small style="font-size:18px"> %</small></b><span>Верных ответов</span></div><div class="stat-card"><b>${Object.keys(s.byQuestion).filter(id=>questions.some(q=>q.id===id)).length}<small style="font-size:18px"> / 45</small></b><span>Карточек изучено</span></div><div class="stat-card"><b>${store.sessions.length}${store.sessions.length===30?'+':''}</b><span>Завершённых партий</span></div></div>
    ${!s.attempts?`<div class="empty-state"><img src="assets/thinking.png" alt="Задумчивый Физогэзик"><h2>Твоя история ещё впереди</h2><p>Сыграй первую партию — здесь появятся сильные темы и вопросы, которые стоит повторить.</p><a class="primary" href="#home">Начать путешествие <span class="arrow">↗</span></a></div>`:`<div class="progress-layout"><section class="panel"><h2>Как идут дела по темам</h2>${Object.entries(topics).map(([id,t])=>{const stats=questions.filter(q=>q.topic===id).map(q=>s.byQuestion[q.id]).filter(Boolean),a=stats.reduce((n,q)=>n+q.attempts,0),c=stats.reduce((n,q)=>n+q.correct,0);return `<div class="topic-progress" style="--topic-color:${t.color}"><div class="topic-progress-label"><span><b>${t.icon}</b>${t.name}</span><span>${a?`${c} / ${a} верно`:'Пока нет ответов'}</span></div><div class="topic-progress-bar"><i style="width:${a?c/a*100:0}%"></i></div></div>`;}).join('')}</section><section class="panel"><h2>Последние партии</h2>${store.sessions.length?store.sessions.slice(0,5).map(session=>`<div class="session-item"><div><strong>${session.practice?'Тренировка ошибок':session.players.length===1?'Самостоятельная игра':`Игра на ${session.players.length} ${plural(session.players.length,'участника','участников','участников')}`}</strong><small>${new Date(session.at).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})} · ${session.correct} из ${session.attempts} верно</small></div><span style="color:var(--purple);white-space:nowrap">${Math.max(...session.players.map(p=>p.score))} бал.</span></div>`).join(''):'<p class="subtle">Заверши партию — её результат появится здесь.</p>'}</section></div>`}
    ${wrong.length?`<section class="stats-mistakes"><h2 class="section-heading">Ещё немного практики</h2><p class="subtle" style="font-size:12px;margin-bottom:15px">Здесь карточки, на которые последний ответ был неверным. Верный ответ в новой игре уберёт карточку из списка.</p><div class="mistake-list">${wrong.map(mistakeCard).join('')}</div></section>`:''}
    <div class="progress-bottom"><p>Прогресс хранится локально. В режиме с ведущим учитывается его оценка.<br>Для переноса между устройствами сохрани резервную копию.</p><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="text-button" data-action="backup">Сохранить копию</button><button class="text-button" data-action="restore">Загрузить копию</button><button class="text-button danger-text" data-action="reset">Сбросить</button></div><input id="restore-file" type="file" accept=".json,application/json" hidden></div>`;}
  function openDialog(title,body){$('#dialog-content').innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="close-dialog" data-action="close-dialog" aria-label="Закрыть">×</button></div><div class="dialog-body">${body}</div>`;if(!$('#dialog').open)$('#dialog').showModal();}
  let pendingConfirm=null;
  function confirmDialog(title,text,callback,label='Подтвердить'){pendingConfirm=callback;openDialog(title,`<p>${text}</p><div class="dialog-actions"><button class="secondary" data-action="close-dialog">Отмена</button><button class="primary" data-action="confirm">${label}</button></div>`);}
  function rules(){openDialog('Один вопрос — один ход',`<div class="dialog-art"><img src="assets/happy.png" alt="Физогэзик"><p>В настолке ведущий читал ответы и двигал фишки. Здесь я помогу с проверкой и подсчётом. Играй один или собирай до четырёх игроков и команд за одним экраном.</p></div><ol><li><strong>Настрой партию.</strong> Выбери темы, сложность и условие окончания.</li><li><strong>Возьми карточку.</strong> Колода перемешана, вопросы не повторяются в пределах партии.</li><li><strong>Ответь.</strong> Выбери вариант или сопоставь фазовые переходы. «Пока не знаю» засчитывается как ошибка без штрафных баллов.</li><li><strong>Сделай шаг.</strong> За правильный ответ получи столько баллов, сколько указано на карточке. Фишка двигается автоматически; при ошибке остаётся на месте.</li><li><strong>Передай ход.</strong> Сначала прочитай объяснение, затем нажми «Следующий ход».</li></ol><div class="rules-points"><span>● ○ ○<br><strong>1 балл = 1 шаг</strong></span><span>● ● ○<br><strong>2 балла = 2 шага</strong></span><span>● ● ●<br><strong>3 балла = 3 шага</strong></span></div><h3>Два способа закончить игру</h3><p><strong>До финиша:</strong> побеждает первый, набравший не менее 15 баллов. Если колода закончилась раньше — выигрывает наибольший результат.<br><strong>Вся колода:</strong> фишки ходят по кругу, очки продолжают накапливаться. Побеждает игрок с наибольшей суммой; при равенстве очков — ничья.</p><h3>Режим с ведущим</h3><p>Ответь своими словами, а ведущий откроет эталон и оценит полноту ответа. Свободный текст сохраняется в текущей партии; компьютер не пытается оценивать его по ключевым словам.</p><h3>Тренировка и сохранение</h3><p>Ошибки попадают в «Мой прогресс». Их можно повторить отдельной колодой. Таймера нет. Партия сохраняется после каждого действия — можно выйти и продолжить позже.</p><div class="dialog-actions"><button class="primary" data-action="close-dialog">Понятно, играем!</button></div>`);}
  function about(){openDialog('Настолка стала ближе',`<p>Цифровая версия создана по вашим материалам: «Инструкция Физогэзик», «Вопросы.Физогэзик», игровое поле, три рубашки карточек, треугольник фазовых переходов и итоговый лист с маскотом. Использованы исходные персонаж, палитра и механика движения за знания.</p><img class="about-board" src="assets/original-board.webp" alt="Оригинальное поле настольной игры Физогэзик"><h3>Что изменилось в цифре</h3><p>Все 45 вопросов сохранены по смыслу и распределению сложности: 20 + 15 + 10. Добавлены варианты ответов, интерактивное сопоставление шести фазовых переходов, объяснения, одиночная игра и повторение ошибок. В режиме с ведущим вопросы остаются открытыми.</p><h3>Уточнения по физике</h3><ul><li>Внутреннюю энергию изменяют работой и теплопередачей.</li><li>Для NaOH указано состояние: ток проводит водный раствор или расплав, а не сухое твёрдое вещество.</li><li>Электризация: трение, контакт, индукция. «Удар» не выделен как самостоятельный универсальный способ.</li><li>При упругом столкновении сохраняется кинетическая энергия <strong>системы</strong>, а не каждого тела по отдельности.</li><li>Уточнены условия опыта с перевёрнутой пробиркой и ускорение опоры вверх для увеличения веса.</li><li>Скорость звука объяснена отношением упругости к плотности; время закипания в горах не объявлено безусловно меньшим.</li><li>Формулы записаны со скобками, индексами и полными условиями применения.</li></ul><h3>Технические источники</h3><p>При разработке изучены <a href="https://developer.mozilla.org/en-US/docs/Games/Techniques" target="_blank" rel="noopener noreferrer">MDN: браузерные игры</a>, открытые руководства <a href="https://github.com/anthropics/skills/tree/main/skills/frontend-design" target="_blank" rel="noopener noreferrer">Frontend Design</a> и <a href="https://github.com/anthropics/skills/tree/main/skills/webapp-testing" target="_blank" rel="noopener noreferrer">Webapp Testing</a>. Для самой игры интернет не нужен.</p>`);}
  function download(name,content,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  function exportResult(){const g=store.game;const lines=['ФИЗОГЭЗИК — ИТОГ ПАРТИИ',new Date().toLocaleString('ru-RU'),'',...E.ranking(g).map(p=>`${p.name}: ${pointText(p.score)}, верно ${p.correct} из ${p.answered}`),'','РАЗБОР ВОПРОСОВ',...g.history.map((h,i)=>{const q=questions.find(q=>q.id===h.id);return `${i+1}. ${g.players[h.player].name} — ${h.correct?'верно':'нужно повторить'}\n${q.prompt}\nОтвет: ${correctText(q)}\n${q.explanation}\n`;})];download('Физогэзик — результат.txt','\uFEFF'+lines.join('\n'),'text/plain;charset=utf-8');toast('Итог партии скачан');}
  function reducedMotion(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  let audio;
  function playTone(correct){if(!store.sound)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const now=audio.currentTime;[correct?523:330,correct?659:294,correct?784:262].forEach((f,i)=>{const o=audio.createOscillator(),gain=audio.createGain();o.type='sine';o.frequency.value=f;gain.gain.setValueAtTime(0,now+i*.09);gain.gain.linearRampToValueAtTime(.045,now+i*.09+.015);gain.gain.exponentialRampToValueAtTime(.001,now+i*.09+.2);o.connect(gain);gain.connect(audio.destination);o.start(now+i*.09);o.stop(now+i*.09+.21);});}catch{}}
  document.addEventListener('click',event=>{
    const topicLink=event.target.closest('[data-library-topic]');if(topicLink){libraryTopic=topicLink.dataset.libraryTopic;search='';libraryLevel=0;if(route==='library')renderLibrary();}
    const btn=event.target.closest('[data-action]');if(!btn||btn.disabled)return;
    const action=btn.dataset.action,value=btn.dataset.value;
    switch(action){
      case 'solo': setup.party=false;renderHome();break;
      case 'party': setup.party=true;renderHome();break;
      case 'count': setup.count=Number(value);renderHome();break;
      case 'topic': setup.topics=setup.topics.includes(value)?setup.topics.filter(x=>x!==value):[...setup.topics,value];renderHome();break;
      case 'level': {const n=Number(value);setup.levels=setup.levels.includes(n)?setup.levels.filter(x=>x!==n):[...setup.levels,n];renderHome();break;}
      case 'start': start();break;
      case 'resume': go('game');break;
      case 'pause': save();go('table');break;
      case 'draw': draw(Number(btn.dataset.slot)||0);break;
      case 'draw-card': draw(Number(btn.dataset.slot)||0);break;
      case 'answer': selected=Number(btn.dataset.index);updateTurn();$(`[data-action="answer"][data-index="${selected}"]`)?.focus({preventScroll:true});break;
      case 'submit': {const q=questions.find(q=>q.id===store.game.active.id);if(q.type==='match'&&!q.pairs.every((_,i)=>matchAnswers[i]))return;if(q.type==='choice'&&selected===null)return;submitAnswer(q.type==='match'?[...matchAnswers]:selected);break;}
      case 'skip': submitAnswer(null);break;
      case 'next': next();break;
      case 'reveal': revealed=true;store.game.active.answerDraft=oralDraft;save();updateTurn();break;
      case 'grade-yes': submitAnswer(true,true);break;
      case 'grade-no': submitAnswer(false,true);break;
      case 'sound': store.sound=!store.sound;save();if(store.sound)playTone(true);renderGame();break;
      case 'rules': if(route==='home'||route==='lesson')adventure.help();else if(route==='rooms'||route==='room')rooms.help();else rules();break;
      case 'about': about();break;
      case 'close-dialog': $('#dialog').close();pendingConfirm=null;break;
      case 'confirm': {const fn=pendingConfirm;pendingConfirm=null;$('#dialog').close();if(fn)fn();break;}
      case 'rematch': newGame({...store.game.config});break;
      case 'practice': startPractice(mistakes().map(q=>q.id));break;
      case 'retry-session': startPractice([...new Set(store.game.history.filter(h=>!h.correct).map(h=>h.id))]);break;
      case 'library-topic': libraryTopic=value;renderLibrary();break;
      case 'library-level': libraryLevel=Number(value);renderLibrary();break;
      case 'clear-search': search='';libraryTopic='all';libraryLevel=0;renderLibrary();break;
      case 'formula-topic': formulaTopic=value;renderFormulas();break;
      case 'export': exportResult();break;
      case 'backup': download('Физогэзик — сохранение.json',JSON.stringify({format:'fizogezik-backup',version:1,data:store},null,2),'application/json');toast('Резервная копия скачана');break;
      case 'restore': $('#restore-file').click();break;
      case 'reset': confirmDialog('Сбросить весь прогресс?','Будут удалены статистика, приключение и сохранённая партия в этом браузере. При необходимости сначала сохраните резервную копию.',()=>{store=emptyStore();adventure.reset();save();renderProgress();toast('Прогресс сброшен');},'Сбросить прогресс');break;
    }
  });
  document.addEventListener('input',event=>{const el=event.target;if(el.matches('[data-name-index]'))setup.names[Number(el.dataset.nameIndex)]=el.value;if(el.id==='library-search'){search=el.value;renderLibraryCards();}if(el.id==='oral-draft'){oralDraft=el.value;store.game.active.answerDraft=oralDraft;save();}});
  document.addEventListener('change',event=>{const el=event.target;if(el.id==='game-mode')setup.mode=el.value;if(el.id==='host-mode')setup.check=el.checked?'host':'auto';if(el.matches('[data-match-index]')){const index=Number(el.dataset.matchIndex);matchAnswers[index]=el.value;updateTurn();$(`[data-match-index="${index}"]`)?.focus({preventScroll:true});}if(el.id==='restore-file')restoreFile(el.files[0]);});
  async function restoreFile(file){if(!file)return;try{if(file.size>2e6)throw new Error();const backup=JSON.parse(await file.text());const d=backup.data;if(backup.format!=='fizogezik-backup'||backup.version!==1||!d||!d.stats||!Number.isInteger(d.stats.attempts)||d.stats.attempts<0||!Number.isInteger(d.stats.correct)||d.stats.correct<0||d.stats.correct>d.stats.attempts||!d.stats.byQuestion||typeof d.stats.byQuestion!=='object'||Array.isArray(d.stats.byQuestion)||!Array.isArray(d.sessions)||d.sessions.length>30||(d.game&&!E.validGame(d.game,questions))||(d.campaign&&!FizCampaign.validProfile(d.campaign,questions)))throw new Error();for(const [id,v] of Object.entries(d.stats.byQuestion)){if(!questions.some(q=>q.id===id)||!v||!Number.isInteger(v.attempts)||v.attempts<0||!Number.isInteger(v.correct)||v.correct<0||v.correct>v.attempts)throw new Error();}for(const s of d.sessions){if(!s||!Array.isArray(s.players)||!s.players.length||!s.players.every(p=>typeof p.name==='string'&&Number.isFinite(p.score))||!Number.isFinite(s.at)||!Number.isInteger(s.correct)||!Number.isInteger(s.attempts))throw new Error();}confirmDialog('Восстановить сохранение?','Текущая статистика и партия будут заменены данными из выбранного файла.',()=>{store={...emptyStore(),...d};adventure.reset();resetAnswer();save();render();toast('Прогресс восстановлен');},'Восстановить');}catch{toast('Не удалось прочитать сохранение. Выбери JSON-копию, скачанную из Физогэзика.');}}
  document.addEventListener('keydown',event=>{
    if(route!=='game'||$('#dialog').open||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)||event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;
    const g=store.game;if(!g||g.finished)return;
    if(/^[1-4]$/.test(event.key)&&g.phase==='answer'&&g.config.check==='auto'){
      const buttons=document.querySelectorAll('[data-action="answer"]');buttons[Number(event.key)-1]?.click();event.preventDefault();
    }
    if(event.key==='Enter'&&event.target.matches('[data-action="answer"]')){
      const button=$('[data-action="submit"]');if(button&&!button.disabled){button.click();event.preventDefault();}return;
    }
    if(event.key==='Enter'&&event.target.tagName!=='BUTTON'&&event.target.tagName!=='A'){
      const action=g.phase==='draw'?'draw':g.phase==='feedback'?'next':'submit';const button=$(`[data-action="${action}"]`);if(button&&!button.disabled){button.click();event.preventDefault();}
    }
  });
  $('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('#dialog').close();}});
  window.addEventListener('hashchange',()=>{if(route==='game'&&store.game?.active){oralDraft=store.game.active.answerDraft||oralDraft;}render();window.scrollTo(0,0);});
  if(store.game?.active)oralDraft=store.game.active.answerDraft||'';
  render();
})();
