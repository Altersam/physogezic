(()=>{
  'use strict';
  const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const gate=$('gate'),stage=$('stage'),bar=document.querySelector('.bar');
  let room=null,credentials=null,timer=0,busy=false,selectedAnswer=null,pairs={};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const deviceKey='physogezic.device.v1';
  let deviceId=localStorage.getItem(deviceKey);if(!deviceId){deviceId=crypto.randomUUID();localStorage.setItem(deviceKey,deviceId);}
  const roomKey=code=>'physogezic.godot3d.'+code;
  function save(code,data){credentials={...data,code};localStorage.setItem(roomKey(code),JSON.stringify(credentials));}
  function credentialsFor(code){try{return JSON.parse(localStorage.getItem(roomKey(code)));}catch{return null;}}
  function preserveEngineControls(){for(const id of ['launch','meter','status']){const node=$(id);if(node){node.hidden=true;document.body.appendChild(node);}}}
  async function api(code,action='',options={}){
    const response=await fetch('/api/rooms'+(code?'/'+encodeURIComponent(code)+(action?'/'+action:''):''),{...options,headers:{'Content-Type':'application/json',...(credentials?{'X-Room-Token':credentials.token}:{}),...(options.headers||{})}});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Сервер комнаты недоступен.');return data;
  }
  function note(text,isError=false){const node=$('network-note');if(node){node.textContent=text;node.classList.toggle('error',isError);}}
  function hostBar(){
    if(!$('room-open')){const button=document.createElement('button');button.id='room-open';button.className='full room-open';button.textContent='Комната';button.addEventListener('click',()=>showHostLobby());bar.insertBefore(button,$('fullscreen'));}
    $('room-open').textContent=room?`Код ${room.code} · ${room.players.length} участн.`:'Комната';
  }
  async function refresh(){
    if(!credentials)return;
    try{room=await api(credentials.code,'state');
      if(credentials.role==='host'){hostBar();if(window.physogezicGodotApply)window.physogezicGodotApply(JSON.stringify(room));const panel=$('host-lobby');if(panel&&!panel.hidden)renderHostLobby();}
      else renderPlayer();
    }catch(e){note(e.message,true);if(credentials.role==='host')$('state').textContent=e.message;}
  }
  function poll(){clearInterval(timer);timer=setInterval(refresh,800);}
  window.physogezicRoomCommand=async raw=>{
    const command=typeof raw==='string'?JSON.parse(raw):raw;if(!credentials||busy)return;
    busy=true;try{const action=command.type==='answer'?'answer':command.type==='draw'?'draw':'control',body=action==='control'?{...command,action:command.type}:command;room=await api(credentials.code,action,{method:'POST',body:JSON.stringify(body)});await refresh();}
    catch(e){note(e.message,true);if(credentials.role==='host')$('state').textContent=e.message;}finally{busy=false;}
  };
  function command(type,data={}){if(!room)return;window.physogezicRoomCommand(JSON.stringify({type,roundId:room.roundId,...data}));}
  function showHostLobby(){
    let panel=$('host-lobby');if(!panel){panel=document.createElement('section');panel.id='host-lobby';panel.className='host-lobby';panel.hidden=true;document.body.appendChild(panel);panel.addEventListener('click',e=>{if(e.target===panel||e.target.closest('[data-close]'))panel.hidden=true;});}
    panel.hidden=false;renderHostLobby();
  }
  function renderHostLobby(){
    const panel=$('host-lobby');if(!panel||!room)return;
    const signature=room.revision+':'+room.players.map(p=>p.id).join(',');if(panel.dataset.signature===signature)return;panel.dataset.signature=signature;
    panel.innerHTML=`<div class="lobby-card"><button class="lobby-close" data-close aria-label="Закрыть">×</button><span class="eyebrow">СЕТЕВОЕ 3D-ПУТЕШЕСТВИЕ</span><h2>Код комнаты: ${room.code}</h2><p>Участники открывают QR на телефоне. Здесь остаются общий стол, вопрос и лабораторная установка — без вариантов и правильного ответа.</p><img class="room-qr" alt="QR для подключения" src="/api/rooms/${room.code}/qr?target=godot"><div class="lobby-players">${room.players.map(p=>`<span>${esc(p.name)}</span>`).join('')||'<span>Ожидаем участников…</span>'}</div>${room.phase==='lobby'?`<button class="launch" id="network-start" ${room.players.length?'':'disabled'}>Начать сетевое путешествие</button>`:''}<div id="network-note" class="status"></div></div>`;
    const start=$('network-start');if(start)start.addEventListener('click',()=>{command('start');panel.hidden=true;});
  }
  function createHost(){
    preserveEngineControls();gate.innerHTML=`<span class="emblem">✦</span><h1>Общий 3D-стол</h1><p>Создаём комнату с 45 вопросами и 50 анимированными опытами…</p><div id="network-note" class="status"></div>`;
    api(null,'',{method:'POST',body:JSON.stringify({mode:'godot3d'})}).then(async data=>{save(data.code,data);history.replaceState(null,'','?room='+data.code);await refresh();poll();window.physogezicLaunch?.();setTimeout(showHostLobby,300);}).catch(e=>{note(e.message,true);gate.insertAdjacentHTML('beforeend','<button class="launch" id="network-retry">Попробовать снова</button>');$('network-retry').onclick=createHost;});
  }
  function joinForm(code){
    preserveEngineControls();gate.hidden=false;gate.innerHTML=`<span class="emblem">✦</span><span class="eyebrow">КОМНАТА ${esc(code)}</span><h1>Присоединиться к путешествию</h1><p>Карта и варианты ответа появятся на этом телефоне. Общий стол и опыт учитель показывает на большом экране.</p><form id="join-form" class="join-form"><label for="player-name">Ваше имя или команда</label><input id="player-name" maxlength="24" autocomplete="nickname" required placeholder="Например, Аня"><button class="launch" type="submit">Войти в комнату</button></form><div id="network-note" class="status" role="status"></div>`;
    $('join-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{save(code,await api(code,'join',{method:'POST',body:JSON.stringify({name:$('player-name').value,deviceId})}));await refresh();poll();}catch(error){note(error.message,true);button.disabled=false;}};
  }
  function renderPlayer(){
    if(!room||credentials.role!=='player')return;gate.hidden=false;
    const signature=JSON.stringify([room.revision,selectedAnswer,pairs]);if(gate.dataset.signature===signature)return;gate.dataset.signature=signature;
    const me=room.players.find(p=>p.id===room.me),mine=room.activePlayerId===room.me;
    if(room.phase==='lobby'){
      gate.innerHTML=`<span class="emblem">✦</span><span class="eyebrow">ВЫ В КОМНАТЕ ${room.code}</span><h1>${esc(me?.name)}</h1><p>Участников: ${room.players.length}. Учитель скоро начнёт путешествие — эта страница обновится сама.</p><div class="player-score">${me?.score||0} / 15</div>`;return;
    }
    if(room.phase==='finished'){
      gate.innerHTML=`<span class="emblem">★</span><span class="eyebrow">ПУТЕШЕСТВИЕ ЗАВЕРШЕНО</span><h1>${esc(room.players[0]?.name)} впереди!</h1><div class="ranking">${room.players.map((p,i)=>`<div><b>${i+1}. ${esc(p.name)}</b><span>${p.score} / 15</span></div>`).join('')}</div>`;return;
    }
    if(room.phase==='draw'){
      const cards=mine?room.market.map(c=>`<button class="phone-card" data-card="${c.id}"><span>✦</span>Карта ${c.slot+1}<small>Вопрос или опыт</small></button>`).join(''):'';
      gate.innerHTML=`<span class="eyebrow">${mine?'ВАШ ХОД':'ХОД: '+esc(room.activePlayerName)}</span><h1>${mine?'Выберите карту':'Смотрите на общий стол'}</h1>${mine?`<div class="phone-deck">${cards}</div>`:'<p>Участник открывает карту. Следующий ход появится здесь автоматически.</p>'}<div class="player-score">${me?.score||0} / 15</div>`;
      gate.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{gate.querySelectorAll('button').forEach(x=>x.disabled=true);command('draw',{cardId:b.dataset.card});});return;
    }
    const q=room.question;if(!q)return;
    const lab=q.kind==='experiment',result=room.myResult;
    let answers='';
    if(room.phase==='question'&&mine){
      if(q.type==='choice')answers=`<div class="answer-list">${q.options.map(o=>`<button data-option="${o.id}" class="answer-option ${selectedAnswer===o.id?'selected':''}">${esc(o.text)}</button>`).join('')}</div><button id="send-answer" class="launch" ${selectedAnswer?'':'disabled'}>Ответить</button>`;
      else answers=`<div class="match-list">${q.left.map((left,i)=>`<label>${esc(left)}<select data-pair="${i}"><option value="">Выбрать переход</option>${q.right.map(v=>`<option ${pairs[i]===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`).join('')}</div><button id="send-answer" class="launch" ${q.left.every((_,i)=>pairs[i])?'':'disabled'}>Проверить переходы</button>`;
      answers+='<button id="skip-answer" class="skip-answer">Пока не знаю</button>';
    }else if(result){
      answers=`<div class="result ${result.correct?'correct':'wrong'}"><b>${result.correct?'Верно!':'Разберём ответ'}</b><span>${result.steps>0?'+':''}${result.steps} клетки</span></div><p class="explanation">${esc(q.explanation||'')}</p>${mine?'<button id="next-turn" class="launch">Продолжить путь →</button>':''}`;
    }else answers='<p>Ответ появится у ходящего участника. Наблюдайте за общей лабораторией.</p>';
    gate.innerHTML=`<div class="phone-top"><span class="eyebrow">${lab?'3D-ОПЫТ НА ОБЩЕМ ЭКРАНЕ':'КАРТА · '+q.level+' БАЛЛА'}</span><span>${me?.score||0} / 15</span></div><h2>${esc(q.title||'Физогэзик')}</h2><p class="question">${esc(q.prompt)}</p>${answers}<div id="network-note" class="status" aria-live="polite"></div>`;
    gate.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{selectedAnswer=b.dataset.option;renderPlayer();});
    gate.querySelectorAll('[data-pair]').forEach(s=>s.onchange=()=>{pairs[s.dataset.pair]=s.value;renderPlayer();});
    if($('send-answer'))$('send-answer').onclick=()=>{const answer=q.type==='choice'?selectedAnswer:q.left.map((_,i)=>pairs[i]);command('answer',{answer});};
    if($('skip-answer'))$('skip-answer').onclick=()=>command('answer',{skip:true});
    if($('next-turn'))$('next-turn').onclick=()=>{selectedAnswer=null;pairs={};command('next');};
  }
  function init(){
    const staticHost=location.hostname.endsWith('github.io');
    const tools=document.createElement('div');tools.className='network-entry';tools.innerHTML=staticHost?'<span>Сетевая комната запускается локально: npm start</span>':'<button id="network-host">Создать сетевой 3D-стол</button><button id="network-join">Войти по коду</button>';gate.appendChild(tools);
    if(staticHost)return;
    $('network-host').onclick=createHost;$('network-join').onclick=()=>{const code=(params.get('room')||prompt('Шестизначный код комнаты')||'').trim();if(/^\d{6}$/.test(code))joinForm(code);};
    const code=params.get('room');if(code&&/^\d{6}$/.test(code)){const saved=credentialsFor(code);if(saved){preserveEngineControls();credentials=saved;refresh().then(()=>{poll();if(saved.role==='host')window.physogezicLaunch?.();});}else joinForm(code);}
  }
  init();
})();
