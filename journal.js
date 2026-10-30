(function(root){
  'use strict';const HOUR=3600000;
  function hourStart(now=Date.now()){return Math.floor(now/HOUR)*HOUR;}
  function recent(items,now=Date.now()){return items.filter(item=>Number(item.at)>=hourStart(now));}
  root.FizJournal={HOUR,hourStart,recent};
  if(typeof document!=='undefined'){
    let currentHour=hourStart();
    function resetPanels(){currentHour=hourStart();document.querySelectorAll('.session-log').forEach(el=>{el.innerHTML='<h3>Последние ходы</h3><p class="subtle" style="font-size:11px">Журнал нового часа. Следующие ходы появятся здесь.</p>';});document.querySelectorAll('.table-turn-log').forEach(el=>el.remove());document.dispatchEvent(new CustomEvent('fiz-hour-reset'));}
    function schedule(){setTimeout(()=>{resetPanels();schedule();},HOUR-Date.now()%HOUR+15);}
    schedule();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&hourStart()!==currentHour)resetPanels();});
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=root.FizJournal;
})(typeof globalThis!=='undefined'?globalThis:window);
