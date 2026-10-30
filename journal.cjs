const fs=require('node:fs'),path=require('node:path');
const HOUR=60*60*1000;
function createJournal(directory,{now=Date.now,auto=true,onReset=null}={}){
  fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'runtime.log');
  let hour=fs.existsSync(file)?Math.floor(fs.statSync(file).mtimeMs/HOUR):Math.floor(now()/HOUR),timer;
  function resetIfDue(time=now()){
    const next=Math.floor(time/HOUR);if(next===hour)return false;
    fs.writeFileSync(file,'');hour=next;if(onReset)onReset();return true;
  }
  if(!fs.existsSync(file))fs.writeFileSync(file,'');resetIfDue();
  function write(level,message){resetIfDue();fs.appendFileSync(file,`${new Date(now()).toISOString()} [${level}] ${String(message).replace(/[\r\n]+/g,' ').slice(0,2000)}\n`);}
  function schedule(){timer=setTimeout(()=>{resetIfDue();schedule();},HOUR-now()%HOUR+10);timer.unref();}
  if(auto)schedule();
  return {file,resetIfDue,info:message=>write('INFO',message),error:message=>write('ERROR',message),close(){clearTimeout(timer);}};
}
module.exports={HOUR,createJournal};
