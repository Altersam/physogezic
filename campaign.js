(function(root){
  'use strict';
  const rules={version:1,lives:5,correctXP:10,retryXP:5,comboStart:3,comboBonus:5,clearXP:25,bossXP:50,clearGems:15,bossGems:35,dailyXP:50};
  const worlds=[
    {id:'mechanics',name:'Долина движения',short:'Механика',color:'#8a63d2',dark:'#6444a1',light:'#f1eafa',icon:'rocket',story:'Помоги запустить экспедицию. Восстанови двигатель и разгони исследовательскую тележку.',boss:'Страж инерции',lessons:['Первый импульс','Сила в действии','Энергия движения','Испытание стража']},
    {id:'heat',name:'Тёплый архипелаг',short:'Теплота',color:'#ee9a49',dark:'#b5682e',light:'#fff2df',icon:'flame',story:'Ледяной туман остановил станцию. Собери тепло и зажги её маяк.',boss:'Ледяной туман',lessons:['Искра тепла','Потоки энергии','Меняем состояние','Растопи туман']},
    {id:'electricity',name:'Город искр',short:'Электричество',color:'#47a8ca',dark:'#287d9d',light:'#e8f6fb',icon:'bolt',story:'Город погас. Замкни цепи, найди нужное напряжение и верни свет в обсерваторию.',boss:'Короткое замыкание',lessons:['Зажги лампу','По закону Ома','Магнитный след','Верни городу свет']},
    {id:'optics',name:'Светящийся лес',short:'Оптика',color:'#56b78a',dark:'#348660',light:'#eaf8ef',icon:'eye',story:'Луч потерялся среди деревьев. Настрой линзы, чтобы осветить путь к звёздному порталу.',boss:'Призрачная линза',lessons:['Поймай луч','В точке фокуса','Секрет цвета','Открой портал']},
    {id:'quantum',name:'Атомная обсерватория',short:'Кванты',color:'#cb7ebc',dark:'#99568b',light:'#fbedf7',icon:'atom',story:'Последний сигнал скрыт внутри атома. Исследуй ядро и заряди корабль знаниями.',boss:'Хранитель ядра',lessons:['Внутри атома','След электрона','Превращение ядра','Звёздный экзамен']}
  ];
  const cosmetics=[{id:'explorer',name:'Исследователь',icon:'compass',price:0,description:'Любопытство — твоя суперсила.'},{id:'captain',name:'Капитан экспедиции',icon:'crown',price:80,description:'Золотая корона и след солнечных искр.'},{id:'stargazer',name:'Звездочёт',icon:'star',price:120,description:'Звёздный значок и космическое сияние.'}];
  function dayKey(now=Date.now()){const d=new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function daily(now){return {date:dayKey(now),xp:0,answers:0,lessons:0,combo:0,claimed:[]};}
  function createProfile(){return {version:1,xp:0,gems:0,completed:{},chests:[],owned:['explorer'],equipped:'explorer',streak:0,lastDay:null,daily:daily(),run:null,relaxed:false};}
  function ensureDaily(p,now=Date.now()){if(p.daily.date!==dayKey(now))p.daily=daily(now);return p.daily;}
  function lessons(questions){return worlds.flatMap((w,wi)=>Array.from({length:4},(_,i)=>{const bank=questions.filter(q=>q.topic===w.id);const ids=bank.length<4?[bank[i%bank.length].id]:bank.slice(Math.floor(i*bank.length/4),Math.floor((i+1)*bank.length/4)).map(q=>q.id);return {id:`${w.id}-${i}`,world:wi,index:i,title:w.lessons[i],boss:i===3,ids};}));}
  function unlocked(p,lesson,all){const i=all.findIndex(l=>l.id===lesson.id);return i===0||!!p.completed[all[i-1].id];}
  function nextLesson(p,all){return all.find(l=>!p.completed[l.id])||all[all.length-1];}
  function lab(world,variant=0){
    const k=variant%4;
    if(world===0){const m=[2,4,3,5][k],a=[3,4,6,4][k];return {type:'lab',kind:'force',id:`lab-force-${variant}`,m,a,target:m*a,prompt:`Разгони тележку массой ${m} кг с ускорением ${a} м/с².`,hint:'Второй закон Ньютона: F = ma. Умножь массу на нужное ускорение.',explanation:`F = ma = ${m} × ${a} = ${m*a} Н. Чем больше масса, тем больше сила для того же ускорения.`,initial:{value:0}};}
    if(world===1){const m=[.5,1,.5,1][k],start=20,end=[40,30,60,40][k],target=4.2*m*(end-start);return {type:'lab',kind:'heat',id:`lab-heat-${variant}`,m,start,end,target,prompt:`Нагрей ${String(m).replace('.',',')} кг воды с ${start} до ${end} °C. Сколько энергии подать?`,hint:'Q = cmΔT. Для воды c = 4,2 кДж/(кг·°C). Потери тепла не учитываем.',explanation:`Q = 4,2 × ${String(m).replace('.',',')} × (${end} − ${start}) = ${target} кДж. Энергия идёт на увеличение внутренней энергии воды.`,initial:{value:0}};}
    if(world===2){const r=[3,4,6,2][k],i=[2,3,2,4][k];return {type:'lab',kind:'circuit',id:`lab-circuit-${variant}`,r,i,target:r*i,prompt:`Зажги лампу: замкни цепь и настрой ток ${i} А при сопротивлении ${r} Ом.`,hint:'I = U/R, значит U = IR. Сначала замкни выключатель. Сопротивление лампы считаем постоянным.',explanation:`U = IR = ${i} × ${r} = ${r*i} В. При разомкнутой цепи ток не течёт при любом напряжении.`,initial:{value:0,closed:false}};}
    if(world===3){const f=[10,10,20,20][k],d=[20,30,40,60][k],target=f*d/(d-f);return {type:'lab',kind:'lens',id:`lab-lens-${variant}`,f,d,target,prompt:`Поймай резкое изображение на экране. Фокус линзы ${f} см, предмет находится в ${d} см перед ней.`,hint:'1/F = 1/d + 1/f. Расстояние до экрана f = Fd/(d − F). Двигай экран и наблюдай резкость.',explanation:`f = ${f} × ${d}/(${d} − ${f}) = ${target} см. В этой точке лучи собираются и дают резкое действительное изображение.`,initial:{value:5}};}
    const z=[6,8,11,13][k],n=[8,10,12,14][k];return {type:'lab',kind:'atom',id:`lab-atom-${variant}`,z,n,target:{z:z+1,n:n-1},prompt:`В ядре ${z} протонов и ${n} нейтронов. Произошёл β⁻-распад. Собери новое ядро.`,hint:'При β⁻-распаде один нейтрон превращается в протон. Массовое число остаётся тем же.',explanation:`Было Z = ${z}, N = ${n}. Стало Z = ${z+1}, N = ${n-1}. Число нуклонов ${z+n} не меняется: нейтрон превратился в протон.`,initial:{z,n}};
  }
  function start(p,id,questions,random=Math.random){
    const all=lessons(questions),l=all.find(l=>l.id===id);if(!l||!unlocked(p,l,all))throw new Error('Сначала заверши предыдущую миссию.');
    const tasks=l.ids.map(qid=>({type:'card',id:qid}));
    let variant=l.index;
    while(tasks.length<(l.boss?6:5)){const t=lab(l.world,variant++);tasks.splice(Math.min(tasks.length,1+(variant%Math.max(1,tasks.length))),0,t);}
    p.run={version:1,lessonId:l.id,world:l.world,boss:l.boss,tasks,queue:tasks.map((_,i)=>i),cursor:0,solved:[],hearts:rules.lives,combo:0,bestCombo:0,mistakes:0,xp:0,phase:'answer',answer:null,result:null,attempts:[],hints:[],hintAvailable:true,shieldAvailable:true,shield:false,shieldUsed:false,relaxed:p.relaxed,order:[],status:null,reward:null,settled:false};
    prepare(p.run,questions,random);return p.run;
  }
  function task(run){return run.tasks[run.queue[run.cursor]];}
  function prepare(run,questions,random=Math.random){
    const t=task(run);run.answer=t.type==='lab'?{...t.initial}:null;run.result=null;run.phase='answer';
    if(t.type==='card'){const q=questions.find(q=>q.id===t.id),n=q.type==='choice'?q.options.length:q.pairs.length;run.order=root.FizEngine.shuffle(Array.from({length:n},(_,i)=>i),random);}else run.order=[];
  }
  function labCorrect(t,answer){if(!answer||typeof answer!=='object')return false;if(t.kind==='atom')return answer.z===t.target.z&&answer.n===t.target.n;return Number.isFinite(answer.value)&&Math.abs(answer.value-t.target)<.1&&(t.kind!=='circuit'||answer.closed===true);}
  function useHint(p){const r=p.run;if(!r||r.phase!=='answer'||!r.hintAvailable)return false;r.hintAvailable=false;r.hints.push(r.queue[r.cursor]);return true;}
  function useShield(p){const r=p.run;if(!r||r.phase!=='answer'||!r.shieldAvailable||r.relaxed)return false;r.shieldAvailable=false;r.shield=true;return true;}
  function answer(p,value,questions,now=Date.now()){
    const r=p.run;if(!r||r.phase!=='answer')return null;
    ensureDaily(p,now);const t=task(r),q=t.type==='card'?questions.find(q=>q.id===t.id):null;
    const correct=q?root.FizEngine.isCorrect(q,value):labCorrect(t,value),retry=r.attempts.some(a=>a.task===r.queue[r.cursor]);
    let xp=0,blocked=false;
    if(correct){r.combo++;r.bestCombo=Math.max(r.bestCombo,r.combo);xp=(retry?rules.retryXP:rules.correctXP)+(r.combo>=rules.comboStart?rules.comboBonus:0);r.solved.push(r.queue[r.cursor]);r.xp+=xp;p.xp+=xp;p.daily.xp+=xp;}
    else {r.combo=0;r.mistakes++;if(r.shield){blocked=true;r.shield=false;r.shieldUsed=true;}else if(!r.relaxed)r.hearts--;r.queue.push(r.queue[r.cursor]);}
    p.daily.answers++;p.daily.combo=Math.max(p.daily.combo,r.bestCombo);
    const result={correct,xp,blocked,retry,task:r.queue[r.cursor],cardId:q?q.id:null,answer:value};
    r.attempts.push(result);r.answer=value;r.result=result;r.phase='feedback';return result;
  }
  function advance(p,questions,now=Date.now(),random=Math.random){
    const r=p.run;if(!r||r.phase!=='feedback')return null;
    if(r.hearts<=0&&!r.relaxed){r.phase='done';r.status='failed';settle(p,now);return r;}
    r.cursor++;
    if(r.solved.length===r.tasks.length){r.phase='done';r.status='won';settle(p,now);}else prepare(r,questions,random);
    return r;
  }
  function settle(p,now){
    const r=p.run;if(r.settled)return;r.settled=true;r.reward={xp:0,gems:0,first:false,stars:0};
    if(r.status!=='won')return;
    ensureDaily(p,now);const old=p.completed[r.lessonId],stars=r.mistakes===0?3:r.mistakes<=2?2:1,first=!old;
    const rewardXP=first?(r.boss?rules.bossXP:rules.clearXP):0,gems=first?(r.boss?rules.bossGems:rules.clearGems):0;
    p.completed[r.lessonId]={stars:Math.max(old?.stars||0,stars),bestMistakes:Math.min(old?.bestMistakes??Infinity,r.mistakes),plays:(old?.plays||0)+1};
    p.xp+=rewardXP;p.gems+=gems;p.daily.xp+=rewardXP;p.daily.lessons++;
    const today=dayKey(now);if(p.lastDay!==today){const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);p.streak=p.lastDay===dayKey(yesterday)?p.streak+1:1;p.lastDay=today;}
    r.reward={xp:rewardXP,gems,first,stars};
  }
  function quests(p,now=Date.now()){const d=ensureDaily(p,now);return [{id:'answers',name:'Пять шагов к знанию',detail:'Ответь на 5 заданий',value:d.answers,target:5,reward:10},{id:'lesson',name:'Маленькая победа',detail:'Заверши одну миссию',value:d.lessons,target:1,reward:15},{id:'combo',name:'Поймай поток',detail:'Ответь верно 3 раза подряд',value:d.combo,target:3,reward:10}];}
  function claimQuest(p,id,now=Date.now()){const q=quests(p,now).find(q=>q.id===id);if(!q||q.value<q.target||p.daily.claimed.includes(id))return false;p.daily.claimed.push(id);p.gems+=q.reward;return true;}
  function claimChest(p,world){const id=worlds[world]?.id;if(!id||!p.completed[`${id}-3`]||p.chests.includes(id))return false;p.chests.push(id);p.gems+=30;return true;}
  function buy(p,id){const c=cosmetics.find(c=>c.id===id);if(!c||p.owned.includes(id)||p.gems<c.price)return false;p.gems-=c.price;p.owned.push(id);p.equipped=id;return true;}
  function equip(p,id){if(!p.owned.includes(id))return false;p.equipped=id;return true;}
  function streak(p,now=Date.now()){const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);return p.lastDay===dayKey(now)||p.lastDay===dayKey(yesterday)?p.streak:0;}
  function validProfile(p,questions){
    if(!p||p.version!==1||!['xp','gems','streak'].every(k=>Number.isInteger(p[k])&&p[k]>=0)||!p.completed||typeof p.completed!=='object'||!Array.isArray(p.owned)||!p.owned.includes('explorer')||!p.owned.every(id=>cosmetics.some(c=>c.id===id))||!p.owned.includes(p.equipped)||!Array.isArray(p.chests)||!p.chests.every(id=>worlds.some(w=>w.id===id))||!p.daily||typeof p.daily.date!=='string'||!['xp','answers','lessons','combo'].every(k=>Number.isInteger(p.daily[k])&&p.daily[k]>=0)||!Array.isArray(p.daily.claimed))return false;
    const all=lessons(questions);for(const [id,v] of Object.entries(p.completed)){if(!all.some(l=>l.id===id)||!v||![1,2,3].includes(v.stars)||!Number.isInteger(v.plays)||v.plays<1)return false;}
    if(!p.run)return true;const r=p.run,l=all.find(l=>l.id===r.lessonId);
    if(!l||!Array.isArray(r.tasks)||!r.tasks.length||!Array.isArray(r.queue)||!r.queue.every(i=>Number.isInteger(i)&&i>=0&&i<r.tasks.length)||!Number.isInteger(r.cursor)||r.cursor<0||r.cursor>r.queue.length||!['answer','feedback','done'].includes(r.phase)||!Array.isArray(r.solved)||!Array.isArray(r.attempts)||!Array.isArray(r.hints)||!Number.isInteger(r.hearts)||r.hearts<0||r.hearts>rules.lives||!Number.isInteger(r.xp)||r.xp<0)return false;
    if(!r.tasks.every(t=>t&&(t.type==='card'?questions.some(q=>q.id===t.id):t.type==='lab'&&['force','heat','circuit','lens','atom'].includes(t.kind)&&t.initial&&t.target!==undefined)))return false;
    if(r.phase!=='done'&&(!task(r)||!Array.isArray(r.order)))return false;
    if(r.phase==='feedback'&&(!r.result||typeof r.result.correct!=='boolean'))return false;
    if(r.phase==='done'&&(!['won','failed'].includes(r.status)||!r.reward))return false;
    return true;
  }
  root.FizCampaign={rules,worlds,cosmetics,dayKey,createProfile,ensureDaily,lessons,unlocked,nextLesson,lab,start,task,labCorrect,useHint,useShield,answer,advance,quests,claimQuest,claimChest,buy,equip,streak,validProfile};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.FizCampaign;
})(typeof globalThis!=='undefined'?globalThis:window);
