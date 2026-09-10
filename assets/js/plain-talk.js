(function(){
 'use strict';
 var trigger=document.querySelector('[data-plain-talk-open]'),dialog=document.querySelector('dialog.plain-talk');
 if(!trigger||!dialog||typeof dialog.showModal!=='function')return;
 var title=dialog.querySelector('h2'),cookieBar=document.querySelector('[data-cookie-bar]');
 function syncCookieOffset(){
  var visible=cookieBar&&!cookieBar.hidden&&cookieBar.getAttribute('data-open')==='true';
  trigger.style.setProperty('--plain-talk-cookie-offset',visible?Math.ceil(cookieBar.getBoundingClientRect().height)+'px':'0px');
 }
 trigger.hidden=false;syncCookieOffset();
 if(cookieBar){new MutationObserver(syncCookieOffset).observe(cookieBar,{attributes:true,attributeFilter:['data-open','hidden','style']});if('ResizeObserver'in window)new ResizeObserver(syncCookieOffset).observe(cookieBar);}
 trigger.addEventListener('click',function(){
  if(dialog.open)return;
  var nav=document.querySelector('.nav[data-open="true"]');if(nav)nav.querySelector('.nav__toggle').click();
  dialog.showModal();document.documentElement.classList.add('plain-talk-open');trigger.setAttribute('aria-expanded','true');dialog.querySelector('.plain-talk__body').scrollTop=0;title.focus({preventScroll:true});
 });
 dialog.querySelector('[data-plain-talk-close]').addEventListener('click',function(){dialog.close();});
 var backdropPress=false;
 function outside(e){var r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;}
 dialog.addEventListener('pointerdown',function(e){backdropPress=e.target===dialog&&outside(e);});
 dialog.addEventListener('click',function(e){if(backdropPress&&e.target===dialog&&outside(e))dialog.close();backdropPress=false;});
 dialog.addEventListener('close',function(){document.documentElement.classList.remove('plain-talk-open');trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});});
 window.addEventListener('pageshow',function(event){if(event.persisted&&dialog.open)dialog.close();syncCookieOffset();});
})();
