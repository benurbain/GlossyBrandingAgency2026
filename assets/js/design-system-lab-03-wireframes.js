/* Refined structural atlas: SVG coordinates are original CSS pixels at 1440px.
   Rendered width and height are exactly 25%; labels live outside the scale. */
(function () {
  var atlas = document.getElementById('wireframe-atlas');
  if (!atlas) return;
  var W = 1440, G = 61.92, GAP = 28.8, INNER = W - 2 * G;
  function col(n) { return (INNER - 11 * GAP) / 12 * n + GAP * (n - 1); }
  function x(n) { return G + (col(1) + GAP) * n; }
  function rect(a,b,w,h,fill,stroke) {
    return '<rect x="'+a+'" y="'+b+'" width="'+w+'" height="'+h+'" fill="'+(fill||'#fff')+'" stroke="'+(stroke||'#bdbdbd')+'" vector-effect="non-scaling-stroke"/>';
  }
  function line(a,b,c,d) { return '<path d="M'+a+' '+b+'H'+c+'" fill="none" stroke="'+(d||'#ccc')+'" vector-effect="non-scaling-stroke"/>'; }
  function text(a,b,t,size) { return '<text x="'+a+'" y="'+b+'" fill="#555" font-size="'+(size||24)+'" font-family="Rethink Sans, sans-serif">'+t+'</text>'; }
  function lines(a,b,w,n) {
    return Array.from({length:n||3},function(_,i){return rect(a,b+i*20,w*(i===(n||3)-1?.72:1),6,'#dedede','none');}).join('');
  }
  function media(a,b,w,label) {
    var h=w*9/16;
    return rect(a,b,w,h,'#f4f4f4')+'<path d="M'+a+' '+b+'l'+w+' '+h+'M'+(a+w)+' '+b+'l-'+w+' '+h+'" stroke="#ddd" vector-effect="non-scaling-stroke"/>'+text(a+20,b+h/2,label||'16:9 / beeld',26);
  }
  function icon(a,b,file) { return '<image href="assets/img/'+file+'.svg" x="'+a+'" y="'+b+'" width="64" height="64"/>'; }
  function button(a,b,w) { return rect(a,b,w||260,52,'#eee')+line(a+52,b,a+52)+text(a+18,b+34,'→',26)+text(a+70,b+32,'Button',22); }
  function head(title) { return text(G,40,'KICKER / SECTIELABEL',12)+text(G,110,title||'Section heading',52); }
  function grid(height) {
    return Array.from({length:12},function(_,i){return rect(x(i),0,col(1),height,'none','#ededed');}).join('');
  }
  function project(a,b,w,active) {
    var inset=active?20:0, m=w-2*inset;
    return (active?rect(a,b,w,w*9/16+76,'#111','#111'):'')+
      media(a+inset,b+inset,m,'16:9 / project')+
      text(a+inset,b+inset+m*9/16+38,'→  Project title',26)+
      text(a+inset+240,b+inset+m*9/16+38,'Details',20)+
      line(a,b+w*9/16+64,a+w);
  }
  function news(a,b,w) { return media(a,b,w,'16:9 / news')+text(a,b+w*9/16+36,'DATE / LABEL',20)+lines(a,b+w*9/16+62,w,2)+line(a,b+w*9/16+110,a+w); }
  function service(a,b,w) { return line(a,b,a+w,'#111')+text(a,b+32,'01',12)+text(a,b+100,'Service title',28.8)+lines(a,b+130,w,4)+text(a,b+255,'→  See our approach',14); }
  function step(a,b,w,label) { return line(a,b,a+w,'#111')+text(a,b+42,'01 / '+(label||'STEP'),20)+text(a,b+115,'Heading',40)+line(a,b+156,a+w)+text(a,b+196,'Baseline',22)+lines(a,b+235,w,5); }
  function list(a,b,w,label) { return line(a,b,a+w,'#111')+text(a,b+75,label||'Heading',40)+lines(a,b+115,w,4)+Array.from({length:3},function(_,i){return line(a,b+232+i*58,a+w)+text(a,b+268+i*58,'List item',24);}).join(''); }
  function columns(count,draw,y) { return Array.from({length:count},function(_,i){return draw(x(i*12/count),y,col(12/count),i);}).join(''); }
  var specs = [
    {name:'Hero',height:520,grid:'Binnenpagina / 12 kolommen',source:'.about-hero · .consultancy-hero · .page-intro',anatomy:'Inhoud bepaalt de hoogte. Paginatitel, intro met primaire actie links en bewijs rechts. Alleen de homepage behoudt een full-bleed opening met de grotere Home-rol.',draw:function(){return grid(520)+text(G,65,'KICKER / POSITIONING',12)+text(G,165,'Sharper brand decisions.',69)+lines(G,240,col(5),4)+button(G,355,320)+lines(x(6),240,col(6),9);}},
    {name:'Kaartgrid',height:510,grid:'Vergelijken / 4 + 4 + 4',source:'.section-head + .service-grid / .news-grid / .work-grid',anatomy:'Eén sectiekop met 28–48px afstand tot de inhoud. H4 voor services en subgrids; geen geforceerde lege kaarthoogte. De stabiele hover-buitenmaat blijft behouden.',draw:function(){return grid(510)+head('What we do.')+columns(3,service,170);}},
    {name:'Tekst & context',height:450,grid:'Uitleg / 6 + 5 kolommen',source:'.why-copy · .audience-grid · .case-chapter',anatomy:'Hoofdgedachte en verdieping horen visueel samen. Sectieruimte 64–128px; ondersteunende secties 48–80px. Leesbreedte en grid blijven behouden.',draw:function(){return grid(450)+text(G,40,'CHAPTER / 01',12)+text(G,115,'The idea.',52)+lines(x(6),75,col(5),7)+line(G,270,W-G)+text(G,315,'SUPPORTING CONTEXT',12)+lines(x(6),305,col(5),5);}},
    {name:'Media',height:810,grid:'Tonen / 12, 6 + 6 of 4 + 4 + 4',source:'.case-hero · .case-media · .case-chapter',anatomy:'Case-inhoud behoudt de originele beeldverhouding: breedte op het grid, hoogte naar het beeld. Twee of drie beelden kunnen naast elkaar. Alleen previewkaarten zijn vast 16:9.',draw:function(){return grid(810)+media(G,30,INNER,'Voorbeeld 16:9 / natuurlijke verhouding');}},
    {name:'Video-CTA',height:470,grid:'Converteren / binnen de shell',source:'.contact-panel + .contact-content',anatomy:'Label, H2, korte intro en één button op de lichte video. Hoogte volgt inhoud en 32–64px verticale padding, niet een verplicht 16:9 vlak.',draw:function(){return grid(470)+rect(G,20,INNER,425,'#f7f7f7')+text(G+35,85,'START A CONVERSATION',12)+text(G+35,163,'What do you want to change?',52)+lines(G+35,212,col(6),4)+button(G+35,332,320);}},
    {name:'Footer',height:400,grid:'Afsluiten / vier groepen',source:'.footer + .footer-legal',anatomy:'Merk, navigatie, social en erkenningen. Beide logo’s onder elkaar. 48–80px bovenruimte, met een compacte juridische onderregel.',draw:function(){return grid(400)+line(G,0,W-G)+text(G,100,'Glossy',42)+text(x(3),70,'EXPLORE',12)+lines(x(3),110,col(2),7)+text(x(6),70,'FOLLOW',12)+lines(x(6),110,col(2),5)+text(x(9),70,'RECOGNISED BY',12)+rect(x(9),105,145,28,'#eee')+rect(x(9),158,145,28,'#eee')+line(G,310,W-G)+text(G,365,'Privacy / KMO',12)+text(x(6),365,'© Glossy Branding',12)+text(x(10),365,'Back to top ↑',12);}}
  ];
  function svg(s,scale) {
    return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+s.name+' — schematische opbouw op '+(scale*100)+' procent" width="'+(W*scale)+'" height="'+(s.height*scale)+'" viewBox="0 0 '+W+' '+s.height+'">'+s.draw()+'</svg>';
  }
  specs.forEach(function (s,i) {
    var article=document.createElement('article');
    article.className='ds-wireframe';
    article.innerHTML='<header><span class="ds-label">'+String(i+1).padStart(2,'0')+'</span><h3>'+s.name+'</h3></header>'+
      '<div class="ds-wireframe-scroll" tabindex="0" role="region" aria-label="'+s.name+' op 25 procent, indien nodig horizontaal schuifbaar"><div class="ds-wireframe-stage">'+svg(s,.25)+'</div></div>'+
      '<div class="ds-wireframe-meta"><span>'+s.grid+'</span><span>1440 → 360px</span></div><p>'+s.anatomy+'</p><code>'+s.source+'</code>'+
      '<button class="ds-control" type="button" data-pattern-index="'+i+'" aria-haspopup="dialog">Bekijk op 100% <span class="visually-hidden">— '+s.name+'</span></button>';
    atlas.appendChild(article);
  });
  var dialog=document.getElementById('pattern-dialog');
  var opener;
  atlas.addEventListener('click',function(event){
    var button=event.target.closest('[data-pattern-index]');
    if(!button) return;
    var spec=specs[Number(button.dataset.patternIndex)];
    opener=button;
    document.getElementById('pattern-dialog-title').textContent=spec.name;
    document.getElementById('pattern-dialog-description').textContent=spec.anatomy;
    dialog.querySelector('.ds-pattern-full').innerHTML=svg(spec,1);
    dialog.showModal();
    dialog.querySelector('.ds-pattern-full').scrollTo(0,0);
  });
  document.getElementById('close-pattern').addEventListener('click',function(){dialog.close();});
  dialog.addEventListener('close',function(){if(opener) opener.focus({preventScroll:true});});
})();
