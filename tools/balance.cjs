// Reproducible first-pass progression model. Uses the actual campaign rules.
require('../engine.js');
const C=require('../campaign.js'),{questions}=require('../questions.js');
const fs=require('node:fs');
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const trials=Number(args.trials)||2000,seed=Number(args.seed)||20261029;
if(args.lives)C.rules.lives=Number(args.lives);
let state=seed>>>0;
const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
const all=C.lessons(questions),now=new Date(2026,9,29,12).getTime();
function right(r){const t=C.task(r);if(t.type==='lab')return t.kind==='atom'?{...t.target}:{value:t.target,closed:true};const q=questions.find(q=>q.id===t.id);return q.type==='match'?q.pairs.map(p=>p[1]):q.correct;}
function simulate(pCorrect,boss,shield){
  const p=C.createProfile(),index=boss?3:0;
  for(let i=0;i<index;i++)p.completed[all[i].id]={stars:3,bestMistakes:0,plays:1};
  C.start(p,all[index].id,questions,random);if(shield)C.useShield(p);
  while(p.run.phase!=='done'){if(p.run.attempts.length>100)throw new Error('Termination guard failed');C.answer(p,random()<pCorrect?right(p.run):null,questions,now);C.advance(p,questions,now,random);}
  if(p.gems<0||p.run.hearts<0||p.run.hearts>C.rules.lives)throw new Error('Resource invariant failed');
  return {won:p.run.status==='won',actions:p.run.attempts.length,xp:p.xp};
}
const baseline=simulate(1,false,false);if(baseline.xp!==90||baseline.actions!==5)throw new Error('Known-case mismatch: perfect ordinary lesson must give 90 XP in 5 actions');
const scenarios=[];
for(const accuracy of [0,.5,.7,.9,1])for(const boss of [false,true])for(const shield of [false,true]){
  const runs=Array.from({length:trials},()=>simulate(accuracy,boss,shield)),actions=runs.map(r=>r.actions).sort((a,b)=>a-b);
  scenarios.push({accuracy,boss,shield,winRate:+(runs.filter(r=>r.won).length/trials).toFixed(3),meanActions:+(actions.reduce((a,b)=>a+b,0)/trials).toFixed(2),p90Actions:actions[Math.floor(trials*.9)],meanXP:+(runs.reduce((n,r)=>n+r.xp,0)/trials).toFixed(1)});
}
const p=C.createProfile();for(const l of all){C.start(p,l.id,questions,random);while(p.run.phase!=='done'){C.answer(p,right(p.run),questions,now);C.advance(p,questions,now,random);}if(l.boss)C.claimChest(p,l.world);}
const report={modelVersion:1,seed,trials,rules:C.rules,knownCase:baseline,targets:{ordinaryAt70Percent:'.85–1 win rate with optional shield',normalActions:'5–10',bossActions:'6–11'},scenarios,perfectCampaign:{missions:Object.keys(p.completed).length,xp:p.xp,gems:p.gems},assumptions:['Independent answer accuracy; not a real learner model.','No hints or knowledge improvement after a mistake.','Unlimited immediate retries; lives reset per mission.','First-clear currency is capped; cosmetics do not change answers.'],verdict:scenarios.find(s=>s.accuracy===.7&&!s.boss&&s.shield).winRate>=.85?'PASS':'REVIEW'};
console.table(scenarios);console.log('Perfect campaign:',report.perfectCampaign,'Guardrail:',report.verdict);
if(args.out)fs.writeFileSync(args.out,JSON.stringify(report,null,2));
