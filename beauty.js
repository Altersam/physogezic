/* Beauty pack: confetti when a finished game screen appears. */
(function(){
  'use strict';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const colors=['#8f6ede','#7456c3','#e8cc8b','#f3e2b3','#a98ad6','#fff5d9','#7fd0a8','#ffb3c2'];
  let celebrated=null;
  function burst(){
    const layer=document.createElement('div');
    layer.className='confetti-layer';
    document.body.appendChild(layer);
    for(let i=0;i<110;i++){
      const piece=document.createElement('i');
      piece.className='confetti-piece';
      const size=6+Math.random()*8;
      piece.style.left=(Math.random()*100)+'%';
      piece.style.width=size+'px';
      piece.style.height=(size*(0.5+Math.random()))+'px';
      piece.style.background=colors[i%colors.length];
      piece.style.setProperty('--dx',(Math.random()*240-120)+'px');
      piece.style.setProperty('--rot',(360+Math.random()*720)+'deg');
      piece.style.setProperty('--dur',(2.4+Math.random()*1.8)+'s');
      piece.style.setProperty('--delay',(Math.random()*0.9)+'s');
      if(i%3===0)piece.style.borderRadius='50%';
      layer.appendChild(piece);
    }
    setTimeout(()=>layer.remove(),6500);
  }
  function check(){
    const main=document.getElementById('main');
    if(!main)return;
    const finish=main.querySelector('.results-head, .table-finish');
    if(finish&&celebrated!==finish){celebrated=finish;burst();}
    if(!finish)celebrated=null;
  }
  const main=document.getElementById('main');
  if(main)new MutationObserver(check).observe(main,{childList:true,subtree:true});
  /* Juice API: короткий отклик поля и фишки на результат ответа. */
  function pulse(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),ms);}
  window.FizJuice={
    shake(el){pulse(el,'juice-shake',340);},
    pop(el){pulse(el,'juice-pop',620);}
  };
})();
