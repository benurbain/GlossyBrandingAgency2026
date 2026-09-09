/* Real video luminance -> ASCII glyphs; not a texture over a colour video. */
(function(){
  const COLS=104,ROWS=36,CELL_W=8,CELL_H=13;
  const GLYPHS=' .,:;irsXA253hMHGS#9B&@';
  const atlas=document.createElement('canvas');
  atlas.width=GLYPHS.length*CELL_W;atlas.height=CELL_H;
  const ac=atlas.getContext('2d');
  const tokens=getComputedStyle(document.body),paper=tokens.getPropertyValue('--paper').trim()||'#fff';
  ac.fillStyle=tokens.getPropertyValue('--ink').trim()||'#111';
  ac.font='bold 13px monospace';ac.textBaseline='top';
  [...GLYPHS].forEach((g,i)=>ac.fillText(g,i*CELL_W,0));
  const visible=new Set();
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);
  }),{threshold:.01});
  const states=new WeakMap();
  document.querySelectorAll('a.project').forEach(card=>{
    const figure=card.querySelector('figure'),source=figure?.querySelector('video,img');
    if(!source)return;
    card.dataset.asciiMode='true';
    const canvas=document.createElement('canvas');canvas.className='case-ascii';
    canvas.width=COLS*CELL_W;canvas.height=ROWS*CELL_H;
    canvas.setAttribute('aria-hidden','true');figure.append(canvas);
    const sample=document.createElement('canvas');sample.width=COLS;sample.height=ROWS;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    const state={source,canvas,ctx,sample,out:canvas.getContext('2d'),lastTime:-1,poster:null,blocked:false};
    if(source.tagName==='VIDEO'&&source.poster){
      state.poster=new Image();state.poster.src=source.poster;
      // Keep the original working video if an external host disallows CORS.
      source.addEventListener('error',()=>{
        if(source.hasAttribute('crossorigin')){source.removeAttribute('crossorigin');source.load();source.play().catch(()=>{});state.blocked=true;}
      },{once:true});
    }
    states.set(card,state);observer.observe(card);
  });
  function draw(card){
    if(card.hidden||card.matches(':active,:focus-visible')||(fine.matches&&card.matches(':hover')))return;
    const s=states.get(card);
    let source=s.source;
    const video=source.tagName==='VIDEO';
    if(video&&(source.readyState<2||s.blocked))source=s.poster;
    if(!source)return;
    const w=source.videoWidth||source.naturalWidth,h=source.videoHeight||source.naturalHeight;
    if(!w||!h)return;
    const time=source.tagName==='VIDEO'?source.currentTime:-2;
    if(s.lastTime===time)return;
    const scale=Math.max(s.canvas.width/w,s.canvas.height/h),sw=s.canvas.width/scale,sh=s.canvas.height/scale;
    try{
      s.ctx.drawImage(source,(w-sw)/2,(h-sh)/2,sw,sh,0,0,COLS,ROWS);
      const pixels=s.ctx.getImageData(0,0,COLS,ROWS).data;
      s.out.fillStyle=paper;s.out.fillRect(0,0,s.canvas.width,s.canvas.height);
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        const i=(y*COLS+x)*4;
        const luminance=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
        const glyph=Math.min(GLYPHS.length-1,Math.floor((255-luminance)/255*GLYPHS.length));
        if(glyph)s.out.drawImage(atlas,glyph*CELL_W,0,CELL_W,CELL_H,x*CELL_W,y*CELL_H,CELL_W,CELL_H);
      }
      s.lastTime=time;card.dataset.asciiReady='true';
      card.dataset.asciiSource=source.tagName==='VIDEO'?'video':'image';
    }catch{
      s.blocked=true;s.sample.width=COLS; // Reset a tainted sampling canvas.
    }
  }
  // Only visible cards render; source videos keep their existing autoplay/loop.
  setInterval(()=>{if(!document.hidden)visible.forEach(draw);},1000/12);
})();
