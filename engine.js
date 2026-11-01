(function(root) {
  'use strict';
  const VERSION = 1;
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  function createGame(config, questions, random = Math.random) {
    const filtered = questions.filter(q => (!config.topics || config.topics.includes(q.topic)) && (!config.levels || config.levels.includes(q.level)) && (!config.ids || config.ids.includes(q.id)));
    if(!filtered.length) throw new Error('Выберите хотя бы одну тему и один уровень с вопросами.');
    const names = (config.names || ['Игрок 1']).slice(0,4);
    if(!names.length) throw new Error('Добавьте игрока.');
    return {version:VERSION, id:Date.now().toString(36), config:{mode:config.mode || 'race',check:config.check || 'auto',...config,names},
      players:names.map((name,i)=>({name:String(name).trim().slice(0,24)||`Игрок ${i+1}`,color:i,score:0,correct:0,answered:0})),
      deck:shuffle(filtered.map(q=>q.id),random), cursor:0, turn:0, phase:'draw', active:null, history:[],finished:false,createdAt:Date.now()};
  }
  function draw(game, questions, random = Math.random, slot = 0) {
    if(game.finished || game.phase!=='draw') return game;
    const offset=Number.isInteger(slot)?Math.max(0,Math.min(2,slot,game.deck.length-game.cursor-1)):0;
    if(offset)[game.deck[game.cursor],game.deck[game.cursor+offset]]=[game.deck[game.cursor+offset],game.deck[game.cursor]];
    const q = questions.find(q=>q.id===game.deck[game.cursor]);
    if(!q) throw new Error('Карточка не найдена. Начните новую игру.');
    game.active = {id:q.id,order:q.type==='choice'?shuffle(q.options.map((_,i)=>i),random):shuffle(q.pairs.map((_,i)=>i),random),answer:null,result:null};
    game.phase='answer';
    return game;
  }
  function isCorrect(q, answer) {
    if(q.type==='match') return Array.isArray(answer) && answer.length===q.pairs.length && answer.every((v,i)=>v===q.pairs[i][1]);
    return Number.isInteger(answer) && answer===q.correct;
  }
  function submit(game, questions, answer, manual = false) {
    if(game.finished || game.phase!=='answer' || !game.active) return null;
    const q=questions.find(q=>q.id===game.active.id);
    const correct=manual ? answer===true : isCorrect(q,answer);
    const penalty=correct?0:Math.max(0,Math.min(3,Number(q.penalty)||0));
    const p=game.players[game.turn];
    p.answered++; if(correct){p.correct++;p.score+=q.level;}else if(penalty){p.score=Math.max(0,p.score-penalty);}
    const result={id:q.id,player:game.turn,correct,points:correct?q.level:(penalty?-penalty:0),answer,manual,at:Date.now()};
    game.history.push(result);game.active.answer=answer;game.active.result=result;game.phase='feedback';
    return result;
  }
  function advance(game) {
    if(game.phase!=='feedback') return game;
    game.cursor++;
    if((game.config.mode==='race' && game.players.some(p=>p.score>=15)) || game.cursor>=game.deck.length) {
      game.finished=true;game.phase='finished';
    } else {game.turn=(game.turn+1)%game.players.length;game.phase='draw';}
    game.active=null;return game;
  }
  function ranking(game) {return game.players.map((p,i)=>({...p,index:i})).sort((a,b)=>b.score-a.score || b.correct-a.correct);}
  function validGame(game,questions) {
    if(!game || game.version!==VERSION || typeof game.id!=='string' || !Array.isArray(game.players) || !game.players.length || game.players.length>4 || !Array.isArray(game.deck) || !game.deck.length || !Array.isArray(game.history)) return false;
    const byId=new Map(questions.map(q=>[q.id,q]));
    if(!game.deck.every(id=>byId.has(id)) || new Set(game.deck).size!==game.deck.length || !Number.isInteger(game.cursor) || game.cursor<0 || game.cursor>game.deck.length || !Number.isInteger(game.turn) || game.turn<0 || game.turn>=game.players.length || !['draw','answer','feedback','finished'].includes(game.phase) || !game.config || !['auto','host'].includes(game.config.check) || !['race','deck'].includes(game.config.mode))return false;
    if(!game.players.every(p=>p && typeof p.name==='string' && p.name.length<=24 && ['score','correct','answered'].every(k=>Number.isInteger(p[k])&&p[k]>=0)))return false;
    if(game.finished!==(game.phase==='finished') || (game.phase!=='finished' && game.cursor>=game.deck.length))return false;
    const expectedHistory=game.cursor+(game.phase==='feedback'?1:0);
    if(game.history.length!==expectedHistory)return false;
    const totals=game.players.map(()=>({score:0,answered:0,correct:0}));
    for(let i=0;i<game.history.length;i++){
      const h=game.history[i],q=byId.get(game.deck[i]),penalty=Math.max(0,Math.min(3,Number(q.penalty)||0));
      if(!h || h.id!==q.id || h.player!==i%game.players.length || typeof h.correct!=='boolean' || h.points!==(h.correct?q.level:(penalty?-penalty:0)))return false;
      const total=totals[h.player];total.answered++;if(h.correct){total.score+=q.level;total.correct++;}else if(penalty){total.score=Math.max(0,total.score-penalty);}
    }
    if(!game.players.every((p,i)=>['score','correct','answered'].every(k=>p[k]===totals[i][k])))return false;
    if(['answer','feedback'].includes(game.phase)){
      const active=game.active,q=byId.get(game.deck[game.cursor]);
      if(!active || active.id!==q.id || !Array.isArray(active.order))return false;
      const size=q.type==='choice'?q.options.length:q.pairs.length;
      if(active.order.length!==size || new Set(active.order).size!==size || !active.order.every(i=>Number.isInteger(i)&&i>=0&&i<size))return false;
      if(active.answerDraft!==undefined && (typeof active.answerDraft!=='string' || active.answerDraft.length>100000))return false;
      if(game.phase==='feedback' && (!active.result || active.result.id!==active.id || active.result.correct!==game.history.at(-1).correct || active.result.points!==game.history.at(-1).points))return false;
    }
    return true;
  }
  root.FizEngine={VERSION,shuffle,createGame,draw,isCorrect,submit,advance,ranking,validGame};
  if(typeof module!=='undefined' && module.exports) module.exports=root.FizEngine;
})(typeof globalThis!=='undefined'?globalThis:window);
