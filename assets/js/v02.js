/* Shared V02 enhancements; all overview content exists in the static HTML. */
(function(){
  // Assign video sources only near the viewport. Once loaded, keep the owner's
  // uninterrupted muted loop: no scroll-out pausing and no new controls.
  const pending=new Set();
  let observer;
  function loadVideo(video){
    if(video.closest('[hidden]'))return;
    const sources=[video,...video.querySelectorAll('source')];
    let assigned=false;
    sources.forEach(source=>{
      const src=source.dataset.lazySrc||source.dataset.v02Src;
      if(!src)return;
      source.src=src;delete source.dataset.lazySrc;delete source.dataset.v02Src;assigned=true;
    });
    if(!assigned)return;
    pending.delete(video);observer?.unobserve(video);
    video.dataset.videoLoaded='true';video.muted=true;
    video.load();video.play().catch(()=>{});
  }
  if('IntersectionObserver' in window)observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting)loadVideo(entry.target);});
  },{rootMargin:'250px 0px',threshold:0});
  function watchVideo(video){
    if(video.dataset.videoLoaded)return;
    if(!observer){loadVideo(video);return;}
    if(!pending.has(video)){pending.add(video);observer.observe(video);}
  }
  document.querySelectorAll('video[data-lazy-video]').forEach(watchVideo);
  document.querySelectorAll('[data-set-lang]').forEach(a=>a.addEventListener('click',()=>{
    try{localStorage.setItem('glossy-lang',a.dataset.setLang);}catch{}
  }));
  document.querySelectorAll('[data-paginated]').forEach(grid=>{
    const kind=grid.dataset.paginated,cards=[...grid.children],size=Number(grid.dataset.pageSize)||12;
    const more=document.querySelector(`[data-show-more="${kind}"]`),status=document.querySelector(`[data-collection-status="${kind}"]`);
    if(!more)return;
    let count=Math.min(size,cards.length);
    more.parentElement.classList.add('v02-collection-controls');
    more.parentElement.hidden=false;
    function update(focus=false){
      const first=count-size;
      cards.forEach((c,i)=>{
        c.hidden=i>=count;
        if(!c.hidden)c.querySelectorAll('img[data-v02-src]').forEach(img=>{
          img.src=img.dataset.v02Src;delete img.dataset.v02Src;
        });
        if(!c.hidden)c.querySelectorAll('video[data-lazy-video],video[data-v02-src]').forEach(watchVideo);
      });
      more.hidden=count>=cards.length;
      if(status)status.textContent=`${count} / ${cards.length}`;
      window.GlossyLab03?.measureCards();
      if(focus)cards[Math.max(0,first)]?.focus({preventScroll:true});
    }
    more.addEventListener('click',()=>{const old=count;count=Math.min(count+size,cards.length);update();cards[old]?.focus({preventScroll:true});});
    update();
  });
  document.querySelectorAll('.faq__item').forEach((item,i)=>{
    const btn=item.querySelector('.faq__q'),panel=item.querySelector('.faq__a');
    if(!btn||!panel)return;
    panel.id=panel.id||`faq-answer-${i+1}`;btn.setAttribute('aria-controls',panel.id);
    function sync(){const open=btn.getAttribute('aria-expanded')==='true';panel.inert=!open;panel.setAttribute('aria-hidden',String(!open));}
    new MutationObserver(sync).observe(btn,{attributes:true,attributeFilter:['aria-expanded']});sync();
  });
})();
