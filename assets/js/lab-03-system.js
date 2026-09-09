/* LAB rollout: background loops follow the owner’s always-on direction. */
(function(){
  if(!document.body.classList.contains("lab-system")) return;
  function resumeBackgrounds(){
    document.querySelectorAll('video[data-always-animate]').forEach(function(video){
      var play=video.play();
      if(play && play.catch) play.catch(function(){ /* Keep the poster if the browser blocks autoplay. */ });
    });
  }
  window.addEventListener('pageshow',resumeBackgrounds);
  document.addEventListener('visibilitychange',function(){if(!document.hidden) resumeBackgrounds();});
  resumeBackgrounds();

  // Keep the existing menu and routes. Add Escape, background isolation and a focus loop.
  var nav=document.querySelector('[data-nav]'),toggle=nav.querySelector('.nav__toggle'),list=nav.querySelector('.nav__list');
  var outside=Array.from(document.querySelectorAll('main,.footer'));
  function syncMenu(){
    var open=nav.getAttribute('data-open')==='true';
    outside.forEach(function(element){element.inert=open;});
  }
  new MutationObserver(syncMenu).observe(nav,{attributes:true,attributeFilter:['data-open']});
  nav.addEventListener('keydown',function(event){
    if(nav.getAttribute('data-open')!=='true') return;
    if(event.key==='Escape'){event.preventDefault();toggle.click();toggle.focus();return;}
    if(event.key!=='Tab') return;
    var targets=[toggle].concat(Array.from(list.querySelectorAll('a')));
    var first=targets[0],last=targets[targets.length-1];
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  });
  matchMedia('(min-width:861px)').addEventListener('change',function(event){if(event.matches && nav.getAttribute('data-open')==='true')toggle.click();});
})();
