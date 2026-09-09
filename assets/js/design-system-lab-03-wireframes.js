/* Structural atlas: SVG coordinates are original CSS pixels at 1440px.
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
  function head(title) { return text(G,62,'KICKER / SECTIELABEL',20)+text(G,156,title||'Section heading',80); }
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
  function service(a,b,w) { return line(a,b,a+w,'#111')+text(a,b+40,'01',20)+text(a,b+150,'Service title',40)+lines(a,b+190,w,4)+text(a,b+345,'→  See our approach',22); }
  function step(a,b,w,label) { return line(a,b,a+w,'#111')+text(a,b+42,'01 / '+(label||'STEP'),20)+text(a,b+115,'Heading',40)+line(a,b+156,a+w)+text(a,b+196,'Baseline',22)+lines(a,b+235,w,5); }
  function list(a,b,w,label) { return line(a,b,a+w,'#111')+text(a,b+75,label||'Heading',40)+lines(a,b+115,w,4)+Array.from({length:3},function(_,i){return line(a,b+232+i*58,a+w)+text(a,b+268+i*58,'List item',24);}).join(''); }
  function columns(count,draw,y) { return Array.from({length:count},function(_,i){return draw(x(i*12/count),y,col(12/count),i);}).join(''); }
  var specs = [
    {name:'Hero',height:810,grid:'Opening / 12 kolommen',source:'.hero · .about-hero · .consultancy-hero',anatomy:'Eén dominante titel, een heldere introductie en één primaire actie. Video is een variant, geen apart sectietype.',draw:function(){return grid(810)+text(G,100,'KICKER / POSITIONING',20)+text(G,300,'Sharper brand',106)+text(G,412,'decisions.',106)+lines(G,610,col(6),5)+button(x(7),675,320);}},
    {name:'Kaartgrid',height:660,grid:'Vergelijken / 4 + 4 + 4',source:'.section-head + .service-grid / .news-grid / .work-grid',anatomy:'Eén sectiekop, daarna gelijkwaardige items. Services en nieuws gebruiken drie kolommen; projecten meestal twee.',draw:function(){return grid(660)+head('What we do.')+columns(3,service,270);}},
    {name:'Tekst & context',height:660,grid:'Uitleg / 6 + 5 kolommen',source:'.why-copy · .audience-grid · .case-chapter',anatomy:'Titel of hoofdgedachte links, verdieping ernaast. Een lijst, icoon of bewijs vervangt inhoud — niet de basisstructuur.',draw:function(){return grid(660)+text(G,65,'CHAPTER / 01',20)+text(G,190,'The idea.',80)+lines(x(6),135,col(5),9)+line(G,435,W-G)+text(G,500,'SUPPORTING CONTEXT',20)+lines(x(6),480,col(5),5);}},
    {name:'Media',height:810,grid:'Tonen / 12 of 6 + 6',source:'.case-hero · .case-media · .case-chapter',anatomy:'Een ingekaderd beeld op 16:9, of twee beelden naast elkaar. Geen tekstvak erover tenzij het een bewuste CTA is.',draw:function(){return grid(810)+media(G,30,INNER,'16:9 / original project media');}},
    {name:'Video-CTA',height:850,grid:'Converteren / binnen de shell',source:'.contact-panel + .contact-content',anatomy:'Kicker, H2, korte intro en één button op de lichte video. Alles blijft binnen het grid met een eigen binnenmarge.',draw:function(){return grid(850)+rect(G,45,INNER,INNER*9/16,'#f7f7f7')+text(G+35,115,'START A CONVERSATION',20)+text(G+35,405,'What do you want',80)+text(G+35,488,'to change?',80)+lines(G+35,555,col(5),4)+button(G+35,685,320);}},
    {name:'Footer',height:565,grid:'Afsluiten / vier groepen',source:'.footer + .footer-legal',anatomy:'Merk, navigatie, social en erkenningen. De twee logo’s staan onder elkaar. Juridische informatie vormt één rustige onderregel.',draw:function(){return grid(565)+line(G,0,W-G)+text(G,165,'Glossy',42)+text(x(3),105,'EXPLORE',20)+lines(x(3),155,col(2),7)+text(x(6),105,'FOLLOW',20)+lines(x(6),155,col(2),5)+text(x(9),105,'RECOGNISED BY',20)+rect(x(9),150,150,44,'#eee')+rect(x(9),220,145,44,'#eee')+line(G,445,W-G)+text(G,505,'Privacy / KMO',22)+text(x(6),505,'© Glossy Branding',22)+text(x(10),505,'Back to top ↑',20);}}
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
