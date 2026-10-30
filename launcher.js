(()=>{
  'use strict';
  // Keep existing room invitations, saved lesson links and old bookmarks working.
  if(/^#(?:table|home|game|lesson|library|formulas|progress|rooms|room\/\d{6})(?:[?&].*)?$/.test(location.hash)){
    location.replace('play.html'+location.search+location.hash);
    return;
  }
  const note=document.getElementById('local-note'),godot=document.getElementById('launch-godot');
  if(location.protocol==='file:'){
    note.hidden=false;
    godot.addEventListener('click',event=>{event.preventDefault();note.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});note.tabIndex=-1;note.focus({preventScroll:true});});
  }
})();
