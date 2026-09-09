/* V02 experiment: one active case reel, original media and link untouched. */
(function(){
  const root=new URL('../../',document.currentScript.src);
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const FRAME_MS=1000/12,HOVER_INTRO_MS=2000;
  let catalogue,active,externalMedia=false;
  const url=src=>new URL(src,root).href;
  const data=()=>catalogue||(catalogue=fetch(new URL('data/case-previews.json',root))
    .then(r=>{if(!r.ok)throw Error('Preview unavailable');return r.json();})
    .catch(()=>{catalogue=null;return {};}));
  function dispose(node){
    node.remove();
    if(node.tagName==='VIDEO'){node.pause();node.removeAttribute('src');node.load();}
    if(node.tagName==='IFRAME')node.src='about:blank';
  }
  function delay(ms,signal){
    return new Promise(resolve=>{
      if(signal.aborted)return resolve(false);
      const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve(!signal.aborted);};
      const timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true});
    });
  }
  function prepare(item,figure,signal){
    return new Promise(resolve=>{
      if(signal.aborted)return resolve(null);
      const video=item.type==='video',embed=item.type==='embed';
      const node=document.createElement(video?'video':embed?'iframe':'img');
      node.className='case-preview-frame';node.setAttribute('aria-hidden','true');
      if(video){node.muted=true;node.autoplay=true;node.loop=true;node.playsInline=true;node.preload='auto';}
      if(embed){node.tabIndex=-1;node.title='Case preview';node.allow='autoplay';}
      if(!video&&!embed){node.alt='';node.decoding='async';}
      let settled=false;
      const event=video?'loadeddata':'load';
      const finish=ok=>{
        if(settled)return;settled=true;clearTimeout(timer);
        node.removeEventListener(event,ready);node.removeEventListener('error',fail);signal.removeEventListener('abort',fail);
        if(!ok){dispose(node);resolve(null);}else {if(video)node.pause();resolve(node);}
      };
      const ready=()=>{if(node.tagName==='IMG')node.decode().then(()=>finish(true),()=>finish(false));else finish(true);},fail=()=>finish(false);
      const timer=setTimeout(fail,12000);
      node.addEventListener(event,ready,{once:true});node.addEventListener('error',fail,{once:true});
      signal.addEventListener('abort',fail,{once:true});figure.append(node);
      if(embed){
        const src=url(item.src).replace(/^https?:\/\/(?:www\.)?vimeo.com\/(\d+).*$/,'https://player.vimeo.com/video/$1');
        const player=new URL(src);
        for(const [key,value] of Object.entries({dnt:1,background:1,autoplay:1,muted:1,loop:1,controls:0}))player.searchParams.set(key,value);
        node.src=player.href;
      }else node.src=url(item.src);
      if(video)node.play().catch(()=>{});
    });
  }
  function stop(){
    if(!active)return;
    active.controller.abort();
    active.figure.querySelectorAll('.case-preview-frame').forEach(dispose);
    delete active.card.dataset.previewActive;
    delete active.card.dataset.previewLoading;
    active=null;
  }
  async function start(card){
    if(!fine.matches||reduced.matches||document.hidden)return;
    stop();
    const slug=new URL(card.href).pathname.match(/\/cases\/([^/]+)\.html$/)?.[1];
    const figure=card.querySelector('figure');
    if(!slug||!figure)return;
    const controller=new AbortController(),signal=controller.signal;
    const hoveredAt=performance.now();
    active={card,figure,controller};
    card.dataset.previewLoading='true';
    const catalogue=await data();
    if(signal.aborted)return;
    const frames=(catalogue[slug]||[]).filter(m=>['image','video','embed'].includes(m.type)&&(m.type!=='embed'||externalMedia));
    if(frames.length<2){stop();return;}
    // First show a different frame; include the original again when the reel wraps.
    const original=figure.querySelector('video,img');
    const current=original?.currentSrc||original?.src;
    const originalIndex=frames.findIndex(m=>url(m.src)===current);
    const offset=originalIndex<0?0:(originalIndex+1)%frames.length;
    const ordered=[...frames.slice(offset),...frames.slice(0,offset)];
    const ready=new Array(ordered.length).fill(null);
    let loadingIndex=0;
    // Load only the hovered case, with bounded concurrency. Keep decoded frames
    // for the entire ordered loop before starting its fixed 12-fps clock.
    async function loadFrames(){
      while(!signal.aborted&&loadingIndex<ordered.length){
        const slot=loadingIndex++;
        ready[slot]=await prepare(ordered[slot],figure,signal);
      }
    }
    const workerCount=Math.min(3,ordered.length);
    await Promise.all(Array.from({length:workerCount},()=>loadFrames()));
    if(signal.aborted)return;
    // The original colour video gets two seconds while the reel buffers.
    // Slow connections retain it longer instead of showing incomplete media.
    if(!await delay(Math.max(0,HOVER_INTRO_MS-(performance.now()-hoveredAt)),signal))return;
    const reel=ready.filter(Boolean);
    card.dataset.previewUnavailable=String(ready.length-reel.length);
    delete card.dataset.previewLoading;
    if(reel.length<2){stop();return;}
    let index=0,shown=null,deadline=performance.now();
    while(!signal.aborted){
      const next=reel[index];index=(index+1)%reel.length;
      if(shown){shown.classList.remove('is-visible');if(shown.tagName==='VIDEO')shown.pause();}
      next.classList.add('is-visible');card.dataset.previewActive='true';
      if(next.tagName==='VIDEO')next.play().catch(()=>{});
      shown=next;
      // No catch-up burst after a stalled browser frame, and no skipped assets.
      deadline=Math.max(deadline+FRAME_MS,performance.now()+1);
      if(!await delay(Math.max(1,deadline-performance.now()),signal))return;
    }
  }
  document.querySelectorAll('a.project').forEach(card=>{
    card.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')start(card);});
    card.addEventListener('pointerleave',()=>{if(active?.card===card)stop();});
    card.addEventListener('pointercancel',()=>{if(active?.card===card)stop();});
    card.addEventListener('click',stop);
  });
  document.addEventListener('glossy:consentchange',event=>{externalMedia=!!event.detail.externalMedia;stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')stop();});
  window.addEventListener('blur',stop);window.addEventListener('pagehide',stop);
  fine.addEventListener('change',stop);reduced.addEventListener('change',stop);
})();
