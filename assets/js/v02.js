/* Shared V02 enhancements; all overview content exists in the static HTML. */
(function(){
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
        if(!c.hidden)c.querySelectorAll('video[data-v02-src]').forEach(v=>{
          v.src=v.dataset.v02Src;delete v.dataset.v02Src;v.play().catch(()=>{});
        });
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
