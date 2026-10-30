const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createJournal,HOUR}=require('../journal.cjs'),browser=require('../journal.js');
test('hourly journal resets on the next hour without touching saved room state',()=>{
  const parent=path.join(os.tmpdir(),'opencode');fs.mkdirSync(parent,{recursive:true});const dir=fs.mkdtempSync(path.join(parent,'fiz-journal-'));
  let now=Date.now();const log=createJournal(path.join(dir,'logs'),{now:()=>now,auto:false});const state=path.join(dir,'rooms.json');fs.writeFileSync(state,'{"score":12}');
  log.info('first event');assert.match(fs.readFileSync(log.file,'utf8'),/first event/);assert.equal(log.resetIfDue(),false);
  now=(Math.floor(now/HOUR)+1)*HOUR;assert.equal(log.resetIfDue(),true);assert.equal(fs.readFileSync(log.file,'utf8'),'');assert.equal(fs.readFileSync(state,'utf8'),'{"score":12}');
  log.info('new hour');assert.match(fs.readFileSync(log.file,'utf8'),/new hour/);assert.doesNotMatch(fs.readFileSync(log.file,'utf8'),/first event/);log.close();fs.rmSync(dir,{recursive:true});
});
test('visible move journals show only the current hour while retaining game history',()=>{
  const now=12*HOUR+1000,items=[{at:11*HOUR+100},{at:12*HOUR},{at:now}];assert.equal(browser.recent(items,now).length,2);assert.equal(items.length,3);assert.equal(browser.recent(items,13*HOUR).length,0);
});
