/* Topic routing, keyboard tabs and controlled specimens. No site-wide writes. */
(function () {
  'use strict';
  var views=Array.from(document.querySelectorAll('[data-view]'));
  var names={overview:'Overzicht',foundations:'Fundamenten',components:'Componenten',patterns:'Sectiepatronen',media:'Beeld & beweging',guidelines:'Gebruiksregels'};
  var aliases={
    main:['overview'],overview:['overview'],foundations:['foundations','type'],type:['foundations','type'],layout:['foundations','layout'],iconography:['foundations','iconography'],
    components:['components','actions'],actions:['components','actions'],cards:['components','cards'],brand:['components','brand'],'site-footer':['components','brand'],
    patterns:['patterns'],wireframes:['patterns'],media:['media'],motion:['media'],guidelines:['guidelines']
  };
  var video=document.getElementById('cta-video');
  var videoButton=document.getElementById('toggle-video');
  var videoStatus=document.getElementById('video-status');
  var reduced=matchMedia('(prefers-reduced-motion: reduce)');
  var currentView;
  var playRequest=0;
  function pauseVideo(){
    playRequest++;
    video.pause();
    videoButton.setAttribute('aria-pressed','false');
    videoButton.textContent='Speel video';
    videoStatus.textContent='Gepauzeerd · geluid uit';
  }
  function measure(){
    if(window.GlossyLab03) window.GlossyLab03.measureCards();
    document.querySelectorAll('[data-size-for]').forEach(function(output){
      var target=document.getElementById(output.dataset.sizeFor);
      output.textContent=parseFloat(getComputedStyle(target).fontSize).toFixed(1)+'px nu';
    });
  }
  function selectTab(tab){
    var group=tab.closest('[role="tablist"]');
    group.querySelectorAll('[role="tab"]').forEach(function(button){
      var selected=button===tab;
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
      document.getElementById(button.getAttribute('aria-controls')).hidden=!selected;
    });
  }
  document.querySelectorAll('[role="tablist"]').forEach(function(group){selectTab(group.querySelector('[role="tab"]'));});
  function route(hash,focus,tabFocus){
    var key=(hash||'#overview').slice(1), target=aliases[key]||aliases.overview;
    var id=target[0], view=document.getElementById(id);
    views.forEach(function(item){item.hidden=item!==view;});
    if(target[1]) selectTab(document.getElementById('tab-'+target[1]));
    document.querySelectorAll('[data-view-link]').forEach(function(link){
      if(link.dataset.viewLink===id) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    document.getElementById('current-topic').textContent=names[id];
    document.title='Glossy — '+names[id]+' / LAB 03';
    if(currentView && currentView!==id) pauseVideo();
    currentView=id;
    if(focus && !tabFocus){
      window.scrollTo({top:0,behavior:'instant'});
      view.querySelector('h1,h2').focus({preventScroll:true});
    }
    if(tabFocus && target[1]) document.getElementById('tab-'+target[1]).focus({preventScroll:true});
    requestAnimationFrame(measure);
  }
  function navigate(hash,tabFocus){
    if(location.hash!==hash) history.pushState(null,'',hash);
    route(hash,true,tabFocus);
  }
  document.body.classList.add('ds-ready');
  route(location.hash,false,false);
  window.addEventListener('popstate',function(){route(location.hash,true,false);});
  window.addEventListener('hashchange',function(){route(location.hash,true,false);});
  document.addEventListener('click',function(event){
    var link=event.target.closest('a');
    if(!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button!==0) return;
    if(link.closest('[data-demo]')){
      event.preventDefault();
      announce('Voorbeeld geactiveerd: '+link.textContent.trim().replace(/\s+/g,' ')+'. Je blijft in het handboek.');
      return;
    }
    var hash=link.getAttribute('href');
    if(hash==='#main'){
      event.preventDefault();
      document.getElementById('main').focus({preventScroll:true});
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    if(hash && hash[0]==='#' && aliases[hash.slice(1)]){
      event.preventDefault();
      navigate(hash,false);
    }
  });
  document.querySelectorAll('[role="tablist"]').forEach(function(group){
    var buttons=Array.from(group.querySelectorAll('[role="tab"]'));
    group.addEventListener('click',function(event){
      var button=event.target.closest('[role="tab"]');
      if(button) navigate('#'+button.dataset.panel,true);
    });
    group.addEventListener('keydown',function(event){
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      var index=buttons.indexOf(document.activeElement);
      if(index<0) return;
      event.preventDefault();
      if(event.key==='Home') index=0;
      else if(event.key==='End') index=buttons.length-1;
      else index=(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
      navigate('#'+buttons[index].dataset.panel,true);
    });
  });
  document.getElementById('grid-toggle').addEventListener('click',function(){
    var show=this.getAttribute('aria-pressed')!=='true';
    this.setAttribute('aria-pressed',String(show));
    this.textContent=show?'Verberg documentgrid':'Toon documentgrid';
    document.body.classList.toggle('ds-show-grid',show);
  });
  document.querySelectorAll('[data-playground]').forEach(function(playground){
    playground.querySelectorAll('[data-state-choice]').forEach(function(button){
      button.addEventListener('click',function(){
        playground.querySelectorAll('[data-state-choice]').forEach(function(other){other.setAttribute('aria-pressed',String(other===button));});
        playground.querySelector('.ds-specimen').dataset.demoState=button.dataset.stateChoice;
        requestAnimationFrame(measure);
      });
    });
  });
  document.getElementById('card-kind').addEventListener('change',function(){
    var kind=this.value;
    document.querySelectorAll('[data-card-kind]').forEach(function(card){
      card.hidden=card.dataset.cardKind!==kind;
      card.querySelectorAll('.service-hover-active').forEach(function(item){item.classList.remove('service-hover-active');});
    });
    document.querySelectorAll('[data-anatomy]').forEach(function(description){description.hidden=description.dataset.anatomy!==kind;});
    requestAnimationFrame(measure);
  });
  var feedbackTimer;
  function announce(message){
    clearTimeout(feedbackTimer);
    var output=document.getElementById('demo-feedback');
    output.textContent=message;
    feedbackTimer=setTimeout(function(){output.textContent='';},5000);
  }
  videoButton.addEventListener('click',async function(){
    if(!video.paused){pauseVideo();return;}
    var request=++playRequest;
    video.classList.add('ds-explicit-playback');
    try{
      await video.play();
      if(request!==playRequest || currentView!=='media' || document.hidden){video.pause();return;}
      videoButton.setAttribute('aria-pressed','true');
      videoButton.textContent='Pauzeer video';
      videoStatus.textContent='Speelt in loop · geluid uit';
    }catch(error){
      videoStatus.textContent='Afspelen lukte niet. Het posterbeeld blijft beschikbaar.';
      video.classList.remove('ds-explicit-playback');
    }
  });
  video.addEventListener('error',function(){pauseVideo();videoStatus.textContent='Video niet beschikbaar. Het posterbeeld blijft zichtbaar.';});
  document.addEventListener('visibilitychange',function(){if(document.hidden) pauseVideo();});
  reduced.addEventListener('change',function(){pauseVideo();video.classList.remove('ds-explicit-playback');});
  var resizeFrame;
  window.addEventListener('resize',function(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(measure);});
  if(document.fonts) document.fonts.ready.then(measure);
})();
