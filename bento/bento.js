/* ---------- VIDEO BENTO GENERATOR ---------- */
document.addEventListener('DOMContentLoaded', () => {
  /* Canvas */
  const canvas = document.getElementById('renderCanvas');
  const ctx = canvas.getContext('2d');
  const viewportContainer = document.querySelector('.viewport-container');

  /* CONSTANTS */
  const CARDS_PER_ROW = 3, ROWS = 3;
  const RECORDING_FPS = 30;
  const REC_BITRATE = 8_000_000;
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 200 * 1024 * 1024;
  const MP4_MIME_TYPES = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1.424028',
    'video/mp4;codecs=avc1',
    'video/mp4'
  ];

  /* STATE */
  let isAnimating=false, isRecording=false, animationProgress=0, lastTimestamp=0;
  let animationSpeed=1, animationDuration=10000, cornerRadius=8, canvasBgColor='#5D5D5D';
  let cardSpacing=18, cardWidthScale=1, aspectRatio='16-9', orientation='horizontal';
  let mediaRecorder, recordingStream, recordedChunks=[], animationFrameId;
  let isPreparingRecording=false;
  let recordingAvailable=false;
  const cardMedia = new Array(9).fill(null);
  const uploadedFiles = new Array(9).fill(null);
  const uploadedBlobURLs = new Array(9).fill(null);
  const loadedImages = new Map(), loadedVideos = new Map(), loadedGIFs = new Map();
  const videoFrameCaches = new Map();
  let totalFileSize = 0;

  /* DOM SHORTCUTS */
  const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];
  const viewportBgColorPicker = qs('#viewportBgColorPickerInput');
  const cardCornerRadiusSlider = qs('#card-corner-radius');
  const cardSpacingSlider = qs('#card-spacing');
  const cardWidthSlider = qs('#card-width');
  const animSpeedSlider = qs('#anim-speed');
  const animDurationSlider = qs('#anim-duration');
  const updateMediaBtn = qs('#updateMediaBtn');
  const batchMediaInput = qs('#batchMediaInput');
  const batchUploadBtn = qs('#batchUploadBtn');
  const batchUploadStatus = qs('#batchUploadStatus');
  const toggleAnimationBtn = qs('#toggleAnimationBtn');
  const toggleRecordingBtn = qs('#toggleRecordingBtn');
  const recordingStatus = qs('#recordingStatus');
  const panel = qs('.control-panel');
  const toggle = qs('#panelToggle');

  /* ---------- DEBUG FUNCTIONS ---------- */
  function checkRecordingSupport() {
    const results = {
      captureStream: !!HTMLCanvasElement.prototype.captureStream,
      mediaRecorder: !!window.MediaRecorder,
      mp4: false,
      mp4MimeType: '',
      https: location.protocol === 'https:'
    };

    if (window.MediaRecorder) {
      results.mp4MimeType = getSupportedMp4MimeType();
      results.mp4 = Boolean(results.mp4MimeType);
    }

    console.log('Recording Support Check:', results);
    return results;
  }

  function debugCanvasState() {
    const info = {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      styleWidth: canvas.style.width,
      styleHeight: canvas.style.height,
      offsetWidth: canvas.offsetWidth,
      offsetHeight: canvas.offsetHeight,
      isConnected: canvas.isConnected,
      contextType: ctx ? 'available' : 'null',
      isAnimating: isAnimating
    };

    console.log('Canvas Debug Info:', info);
    return info;
  }

  function logError(message, error) {
    console.error(message, error);
    setRecordingStatus(`${message}: ${error?.message || error}`, 'error');
  }

  function setRecordingStatus(message, type='') {
    recordingStatus.textContent = message;
    recordingStatus.className = `recording-status ${type}`.trim();
  }

  function getSupportedMp4MimeType() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    return MP4_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) || '';
  }

  /* ---------- BUILD FILE INPUTS WITH DRAG & REORDER ---------- */
  const mediaInputs = qs('#mediaInputs');
  for (let i=1;i<=9;i++){
    const idx=i-1;
    const grp=document.createElement('div'); grp.className='media-input-group'; grp.draggable=true; grp.dataset.index=idx;
    grp.innerHTML=`
      <label>Card ${String(i).padStart(2,'0')}</label>
      <div class="media-upload-row">
        <input type="file" id="card${String(i).padStart(2,'0')}-file" accept="image/*,video/*,.gif" style="display:none">
        <button class="button upload-btn" onclick="document.getElementById('card${String(i).padStart(2,'0')}-file').click()">→ Upload File</button>
        <img class="media-thumbnail" id="thumb${String(i).padStart(2,'0')}" alt="">
      </div>
      <div class="upload-progress"><div class="upload-progress-bar"></div></div>
      <span class="media-status" id="status${String(i).padStart(2,'0')}"></span>`;
    mediaInputs.appendChild(grp);
    grp.querySelector('input[type=file]').addEventListener('change', e=>handleFileUpload(idx, e.target.files[0]));
    /* drag & drop reorder */
    grp.addEventListener('dragstart', e=>{e.dataTransfer.setData('text/plain', idx); grp.classList.add('dragging')});
    grp.addEventListener('dragend', ()=>grp.classList.remove('dragging'));
    grp.addEventListener('dragover', e=>{e.preventDefault(); grp.classList.add('drag-over')});
    grp.addEventListener('dragleave', ()=>grp.classList.remove('drag-over'));
    grp.addEventListener('drop', e=>{
      e.preventDefault();
      const from=+e.dataTransfer.getData('text/plain');
      const to=+grp.dataset.index;
      reorderCards(from,to);
      grp.classList.remove('drag-over');
    });
  }

  function reorderCards(from,to){
    if (from === to || from < 0 || to < 0 || from > 8 || to > 8) return;
    [uploadedFiles[from], uploadedFiles[to]]=[uploadedFiles[to], uploadedFiles[from]];
    [uploadedBlobURLs[from], uploadedBlobURLs[to]]=[uploadedBlobURLs[to], uploadedBlobURLs[from]];
    [cardMedia[from], cardMedia[to]]=[cardMedia[to], cardMedia[from]];
    reloadMedia();
    refreshUploadUI();
  }

  function refreshUploadUI(){
    for(let i=0;i<9;i++){
      const file=uploadedFiles[i], url=uploadedBlobURLs[i];
      const thumb=qs(`#thumb${String(i+1).padStart(2,'0')}`);
      if(file&&url){
        const video=loadedVideos.get(url);
        if(isVideo(file)){
          if(video?.readyState>=2)setVideoThumbnail(video,thumb);else clearThumbnail(thumb);
        }else setImageThumbnail(thumb,url);
        setStatus(i,`✓ ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)`,'success');
      }else{
        clearThumbnail(thumb); setStatus(i,'');
      }
    }
  }

  /* ---------- CANVAS SIZE ---------- */
  function updateCanvasSize(){
    const {width:cw,height:ch}=viewportContainer.getBoundingClientRect();
    const pad=20;
    const maxW=cw-pad*2, maxH=ch-pad*2;

    let canvasW, canvasH; // Internal canvas dimensions (for recording)
    let displayW, displayH; // Visual display dimensions (for viewport)

    if(!aspectRatio){
      // No aspect ratio selected - use viewport size for both
      canvasW = displayW = maxW;
      canvasH = displayH = maxH;
    } else {
      // Fixed canvas dimensions based on aspect ratio selection
      switch(aspectRatio) {
        case '16-9':
          canvasW = 1920;
          canvasH = 1080;
          break;
        case '1-1':
          canvasW = 1080;
          canvasH = 1080;
          break;
        case '9-16':
          canvasW = 1080;
          canvasH = 1920;
          break;
        default:
          // Fallback to dynamic sizing
          const [rw,rh] = aspectRatio.split('-').map(Number);
          const r = rw/rh;
          if(maxW/maxH > r) {
            canvasH = displayH = maxH;
            canvasW = displayW = maxH * r;
          } else {
            canvasW = displayW = maxW;
            canvasH = displayH = maxW / r;
          }
          break;
      }

      // Calculate display size to fit viewport while maintaining aspect ratio
      if(['16-9', '1-1', '9-16'].includes(aspectRatio)) {
        const canvasRatio = canvasW / canvasH;
        if(maxW / maxH > canvasRatio) {
          displayH = maxH;
          displayW = maxH * canvasRatio;
        } else {
          displayW = maxW;
          displayH = maxW / canvasRatio;
        }
      }
    }

    // Set internal canvas dimensions (this determines video resolution)
    canvas.width = Math.max(2, Math.floor(canvasW / 2) * 2);
    canvas.height = Math.max(2, Math.floor(canvasH / 2) * 2);

    // Set visual display size (this determines how it looks in browser)
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';

    console.log('📐 Canvas internal size (video resolution):', canvas.width, 'x', canvas.height);
    console.log('🖥️ Canvas display size (visual):', displayW, 'x', displayH);
  }
  let resizeRaf;
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeRaf);resizeRaf=requestAnimationFrame(updateCanvasSize)});
  updateCanvasSize();

  /* ---------- CARD LAYOUT ---------- */
  function calcLayout(){
    const pad=cardSpacing;
    const aw=canvas.width-pad*2, ah=canvas.height-pad*2;
    const cw0=(aw-(CARDS_PER_ROW-1)*cardSpacing)/CARDS_PER_ROW;
    const cw=cw0*cardWidthScale;
    const ch=(ah-(ROWS-1)*cardSpacing)/ROWS;
    return {pad,cardGap:cardSpacing,cardWidth:cw,cardHeight:ch};
  }

  /* ---------- DRAW HELPERS ---------- */
  function drawRoundedRect(x,y,w,h,r){
    r=Math.max(0,Math.min(r,w/2,h/2));
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }
  function drawImageCover(src,dx,dy,dw,dh){
    const sw=src.videoWidth||src.width, sh=src.videoHeight||src.height;
    if(!sw||!sh)return;
    const sr=sw/sh, dr=dw/dh;
    let sx=0,sy=0,ssw=sw,ssh=sh;
    if(sr>dr){ssw=sh*dr;sx=(sw-ssw)/2;}else{ssh=sw/dr;sy=(sh-ssh)/2;}
    ctx.drawImage(src,sx,sy,ssw,ssh,dx,dy,dw,dh);
  }
  function captureVideoFrame(cache){
    const {video,canvas:frameCanvas,context:frameContext}=cache;
    if(cache.stopped||video.seeking||video.readyState<2||!video.videoWidth||!video.videoHeight)return;
    try{
      const scale=Math.min(1,1280/video.videoWidth,1280/video.videoHeight);
      const frameWidth=Math.max(1,Math.round(video.videoWidth*scale));
      const frameHeight=Math.max(1,Math.round(video.videoHeight*scale));
      if(frameCanvas.width!==frameWidth||frameCanvas.height!==frameHeight){
        frameCanvas.width=frameWidth;
        frameCanvas.height=frameHeight;
      }
      frameContext.drawImage(video,0,0,frameCanvas.width,frameCanvas.height);
      cache.hasFrame=true;
    }catch(error){
      console.warn('Could not buffer video frame',error);
    }
  }
  function startVideoFrameCache(url,video){
    const frameCanvas=document.createElement('canvas');
    const usesVideoFrameCallback=typeof video.requestVideoFrameCallback==='function';
    const cache={video,canvas:frameCanvas,context:frameCanvas.getContext('2d'),hasFrame:false,stopped:false,callbackId:null,usesVideoFrameCallback};
    videoFrameCaches.set(url,cache);

    const captureNextFrame=()=>{
      if(cache.stopped)return;
      captureVideoFrame(cache);
      cache.callbackId=video.requestVideoFrameCallback(captureNextFrame);
    };
    video.addEventListener('loadeddata',()=>captureVideoFrame(cache));
    video.addEventListener('seeked',()=>captureVideoFrame(cache));
    if(usesVideoFrameCallback){
      cache.callbackId=video.requestVideoFrameCallback(captureNextFrame);
    }else{
      video.addEventListener('timeupdate',()=>captureVideoFrame(cache));
    }
  }
  function stopVideoFrameCache(url){
    const cache=videoFrameCaches.get(url);
    if(!cache)return;
    cache.stopped=true;
    if(cache.callbackId!==null&&typeof cache.video.cancelVideoFrameCallback==='function'){
      cache.video.cancelVideoFrameCallback(cache.callbackId);
    }
    videoFrameCaches.delete(url);
  }
  function drawCard(x,y,w,h,n,url){
    ctx.save();
    drawRoundedRect(x,y,w,h,cornerRadius);ctx.clip();
    ctx.fillStyle='#fff';ctx.fillRect(x,y,w,h);
    let ok=false;
    if(url){
      if(loadedVideos.has(url)){
        const v=loadedVideos.get(url), cache=videoFrameCaches.get(url);
        if(cache&&!cache.usesVideoFrameCallback)captureVideoFrame(cache);
        if(cache?.hasFrame){drawImageCover(cache.canvas,x,y,w,h);ok=true;}
        else if(v.readyState>=2&&!v.seeking){drawImageCover(v,x,y,w,h);ok=true;}
        else v.play().catch(()=>0);
      }
      else if(loadedImages.has(url)){const img=loadedImages.get(url);if(img.complete&&img.naturalWidth){drawImageCover(img,x,y,w,h);ok=true;}}
      else if(loadedGIFs.has(url)){const img=loadedGIFs.get(url);if(img.complete&&img.naturalWidth){drawImageCover(img,x,y,w,h);ok=true;}}
    }
    if(!ok){
      ctx.fillStyle='#5D5D5D';
      const fs=Math.max(Math.min(w*.15,30),12);
      ctx.font=`400 ${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText(String(n).padStart(2,'0')+'.',x+w*.1,y+h*.25);
      const tfs=Math.max(Math.min(w*.04,22),8);
      const dotRadius=Math.max(Math.min(tfs*.22,4),2);
      const dotX=x+w*.1, dotY=y+h*.85;
      ctx.fillStyle='#8B8B8B'; ctx.beginPath(); ctx.arc(dotX,dotY,dotRadius,0,Math.PI*2); ctx.fill();
      ctx.font=`${tfs}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText(`Card ${n} Content`,dotX+dotRadius*2+tfs*.35,dotY+tfs/3);
    }
    ctx.restore();
  }

  /* ---------- ANIMATION LOOP ---------- */
  function animate(ts){
    if(!lastTimestamp)lastTimestamp=ts;
    const dt=ts-lastTimestamp; lastTimestamp=ts;
    if(isAnimating){animationProgress=(animationProgress+(dt*animationSpeed)/animationDuration)%1;}
    ctx.fillStyle=canvasBgColor;ctx.fillRect(0,0,canvas.width,canvas.height);
    const {pad,cardGap,cardWidth,cardHeight}=calcLayout();
    const axis=orientation==='horizontal'?'x':'y';
    const span=orientation==='horizontal'?canvas.width:canvas.height;
    const cardSize=orientation==='horizontal'?cardWidth:cardHeight;
    for(let row=0;row<ROWS;row++){
      const dir=(row%2?-1:1);
      const progress=dir>0?animationProgress:(1-animationProgress);
      const needed=Math.ceil(span/(cardSize+cardGap))+2;
      const totalSpan=needed*(cardSize+cardGap);
      for(let set=0;set<2;set++){
        for(let i=0;i<needed;i++){
          const cardNo=row*CARDS_PER_ROW+(i%CARDS_PER_ROW)+1;
          let x,y;
          if(orientation==='horizontal'){
            x=pad+i*(cardWidth+cardGap)+(-progress*totalSpan+set*totalSpan);
            y=pad+row*(cardHeight+cardGap);
          }else{
            x=pad+row*(cardWidth+cardGap);
            y=pad+i*(cardHeight+cardGap)+(-progress*totalSpan+set*totalSpan);
          }
          const visible=orientation==='horizontal'?(x+cardWidth>0&&x<canvas.width):(y+cardHeight>0&&y<canvas.height);
          if(visible) drawCard(x,y,cardWidth,cardHeight,cardNo,cardMedia[cardNo-1]);
        }
      }
    }
    animationFrameId=requestAnimationFrame(animate);
  }

  /* ---------- MEDIA HANDLING ---------- */
  function updateTotal(){
    totalFileSize=uploadedFiles.reduce((s,f)=>s+(f?f.size:0),0);
    const mb=(totalFileSize/1024/1024).toFixed(1);
    qs('#totalFileSize').textContent=mb+' MB';
    qs('#totalFileSize').style.color=totalFileSize>200*1024*1024?'#ff4444':(totalFileSize>150*1024*1024?'#ffaa00':'');
  }
  function setStatus(idx,msg,type='info'){
    const status=qs(`#status${String(idx+1).padStart(2,'0')}`);
    status.textContent=msg;
    status.className=`media-status ${type}`;
    if(msg)status.title=msg;else status.removeAttribute('title');
  }
  function setBatchStatus(msg,type=''){
    batchUploadStatus.textContent=msg;
    batchUploadStatus.className=`media-status ${type}`.trim();
  }
  function isVideo(f){return f && f.type.startsWith('video/')}
  function isGIF(f){return f && f.type==='image/gif'}
  function isSupportedMedia(f){return f&&(f.type.startsWith('image/')||f.type.startsWith('video/'))}
  function clearThumbnail(thumb){
    thumb.removeAttribute('src');
    thumb.style.display='none';
  }
  function setImageThumbnail(thumb,url){
    thumb.src=url;
    thumb.style.display='block';
  }
  function setVideoThumbnail(video,thumb){
    if(!video.videoWidth||!video.videoHeight){clearThumbnail(thumb);return;}
    try{
      const preview=document.createElement('canvas');
      preview.width=96; preview.height=96;
      const previewCtx=preview.getContext('2d');
      const sourceRatio=video.videoWidth/video.videoHeight;
      let sx=0,sy=0,sw=video.videoWidth,sh=video.videoHeight;
      if(sourceRatio>1){sw=video.videoHeight;sx=(video.videoWidth-sw)/2;}
      else{sh=video.videoWidth;sy=(video.videoHeight-sh)/2;}
      previewCtx.drawImage(video,sx,sy,sw,sh,0,0,preview.width,preview.height);
      setImageThumbnail(thumb,preview.toDataURL('image/jpeg',.82));
    }catch(error){
      console.warn('Could not create video thumbnail',error);
      clearThumbnail(thumb);
    }
  }
  async function handleFileUpload(idx,file){
    if(!file)return;
    if(!isSupportedMedia(file)){setStatus(idx,'Unsupported file type','error');return;}
    if(file.size>MAX_FILE_SIZE){setStatus(idx,'>25 MB','error');return;}
    const newTot=totalFileSize-(uploadedFiles[idx]?.size||0)+file.size;
    if(newTot>MAX_TOTAL_SIZE){setStatus(idx,'>200 MB total','error');return;}
    if(uploadedBlobURLs[idx]){
      loadedVideos.get(uploadedBlobURLs[idx])?.pause();
      stopVideoFrameCache(uploadedBlobURLs[idx]);
      loadedVideos.delete(uploadedBlobURLs[idx]); loadedImages.delete(uploadedBlobURLs[idx]); loadedGIFs.delete(uploadedBlobURLs[idx]);
      URL.revokeObjectURL(uploadedBlobURLs[idx]);
    }
    uploadedFiles[idx]=file; const url=URL.createObjectURL(file); uploadedBlobURLs[idx]=url;
    cardMedia[idx]=url;

    /* Progress bar simulation */
    const bar=qs(`#mediaInputs .media-input-group:nth-child(${idx+1}) .upload-progress-bar`);
    bar.style.width='0%';
    let p=0; const iv=setInterval(()=>{p+=10; bar.style.width=p+'%'; if(p>=100){clearInterval(iv);bar.style.width='0%'}},50);

    const thumb=qs(`#thumb${String(idx+1).padStart(2,'0')}`);
    clearThumbnail(thumb);
    if(isVideo(file)){
      const v=document.createElement('video'); v.src=url; v.loop=v.muted=v.playsInline=true;
      v.preload='auto';
      startVideoFrameCache(url,v);
      v.addEventListener('loadeddata',()=>{setVideoThumbnail(v,thumb);v.play().catch(()=>0);setStatus(idx,`✓ ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)`,'success')});
      v.addEventListener('error',()=>setStatus(idx,'Video error','error'));
      loadedVideos.set(url,v); v.load();
    }else if(isGIF(file)){
      const img=new Image(); img.src=url; img.onload=()=>{loadedGIFs.set(url,img);setImageThumbnail(thumb,url);setStatus(idx,`✓ ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)`,'success')};
      img.onerror=()=>setStatus(idx,'GIF error','error');
    }else{
      const img=new Image(); img.src=url; img.onload=()=>{loadedImages.set(url,img);setImageThumbnail(thumb,url);setStatus(idx,`✓ ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)`,'success')};
      img.onerror=()=>setStatus(idx,'Image error','error');
    }
    updateTotal();
    const mb=(file.size/1024/1024).toFixed(1);
    setStatus(idx,`✓ ${file.name} (${mb}MB)`,'success');
  }
  async function handleBatchUpload(fileList){
    const files=[...fileList];
    if(!files.length)return;
    if(files.length>9){setBatchStatus('Select a maximum of 9 files.','error');return;}

    const invalidFile=files.find(file=>!isSupportedMedia(file));
    if(invalidFile){setBatchStatus(`Unsupported file: ${invalidFile.name}`,'error');return;}
    const oversizedFile=files.find(file=>file.size>MAX_FILE_SIZE);
    if(oversizedFile){setBatchStatus(`${oversizedFile.name} exceeds 25 MB.`,'error');return;}

    const filenameCollator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
    files.sort((a,b)=>filenameCollator.compare(a.name,b.name));
    const replacedSize=files.reduce((sum,file,index)=>sum+(uploadedFiles[index]?.size||0),0);
    const incomingSize=files.reduce((sum,file)=>sum+file.size,0);
    if(totalFileSize-replacedSize+incomingSize>MAX_TOTAL_SIZE){setBatchStatus('These files exceed the 200 MB total.','error');return;}

    setBatchStatus(`Loading ${files.length} files…`);
    for(let i=0;i<files.length;i++)await handleFileUpload(i,files[i]);
    setBatchStatus(`✓ ${files.length} files placed in filename order.`,'success');
  }
  function reloadMedia(){
    loadedVideos.forEach(video=>video.pause());
    [...videoFrameCaches.keys()].forEach(stopVideoFrameCache);
    loadedImages.clear(); loadedVideos.clear(); loadedGIFs.clear();
    for(let i=0;i<9;i++){
      const url=uploadedBlobURLs[i];
      if(!url){cardMedia[i]=null;continue}
      cardMedia[i]=url;
      const file=uploadedFiles[i];
      const thumb=qs(`#thumb${String(i+1).padStart(2,'0')}`);
      if(isVideo(file)){
        clearThumbnail(thumb);
        const v=document.createElement('video'); v.src=url; v.loop=v.muted=v.playsInline=true; v.preload='auto'; startVideoFrameCache(url,v); v.addEventListener('loadeddata',()=>{setVideoThumbnail(v,thumb);v.play().catch(()=>0)}); v.load(); loadedVideos.set(url,v);
      }else{
        const img=new Image(); img.src=url; img.addEventListener('load',()=>setImageThumbnail(thumb,url)); isGIF(file)?loadedGIFs.set(url,img):loadedImages.set(url,img);
      }
    }
  }

  function resetUploadedVideos(){
    loadedVideos.forEach(video=>{
      try{video.currentTime=0;}catch(error){console.warn('Could not rewind uploaded video',error)}
      video.play().catch(()=>0);
    });
  }

  async function isMp4Blob(blob){
    if(blob.size<12)return false;
    const header=new Uint8Array(await blob.slice(0,12).arrayBuffer());
    return String.fromCharCode(...header.slice(4,8))==='ftyp';
  }

  function downloadBlob(blob,filename){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.style.display='none'; a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }

  function setControlsLocked(locked){
    qsa('.control-panel input, .control-panel button').forEach(control=>{
      if(control!==toggleRecordingBtn)control.disabled=locked;
    });
  }

  function resetRecordingUI(){
    isRecording=false; isPreparingRecording=false;
    mediaRecorder=null;
    setControlsLocked(false);
    toggleRecordingBtn.disabled=!recordingAvailable;
    toggleRecordingBtn.textContent=recordingAvailable?'Start MP4 Recording':'MP4 Export Not Supported';
    toggleRecordingBtn.style.background='';
  }

  /* ---------- MP4 RECORDING ---------- */
  async function startRecording() {
    if(isRecording||isPreparingRecording)return;
    isPreparingRecording=true;
    toggleRecordingBtn.disabled=true;
    toggleRecordingBtn.textContent='Preparing MP4…';
    setRecordingStatus('Preparing MP4 recording…');
    try {
      console.log('🎬 Starting recording process...');

      // Check browser support first
      const support = checkRecordingSupport();
      recordingAvailable=support.captureStream&&support.mediaRecorder&&support.mp4;
      if (!support.captureStream) {
        logError('Recording failed', 'Canvas recording not supported in this browser');
        resetRecordingUI();
        return;
      }
      if (!support.mediaRecorder) {
        logError('Recording failed', 'MediaRecorder not supported in this browser');
        resetRecordingUI();
        return;
      }
      if (!support.mp4) {
        logError('MP4 export unavailable', 'Use a current version of Chrome, Edge, or Safari');
        resetRecordingUI();
        return;
      }
      // Validate canvas state
      const canvasInfo = debugCanvasState();
      if (canvasInfo.canvasWidth === 0 || canvasInfo.canvasHeight === 0) {
        logError('Recording failed', 'Canvas has invalid dimensions');
        resetRecordingUI();
        return;
      }

      recordedChunks = [];

      // Ensure animation is running
      if (!isAnimating) {
        isAnimating = true;
        toggleAnimationBtn.textContent = 'Pause Animation';
        console.log('✅ Animation started for recording');
      }
      animationProgress = 0;
      lastTimestamp = 0;
      resetUploadedVideos();

      // Create canvas stream
      console.log('🎥 Creating canvas stream...');
      const stream = canvas.captureStream(RECORDING_FPS);
      recordingStream = stream;

      if (!stream || stream.getVideoTracks().length === 0) {
        logError('Recording failed', 'Could not create video stream from canvas');
        resetRecordingUI();
        return;
      }

      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.contentHint = 'motion';
      console.log('✅ Canvas stream created with', stream.getVideoTracks().length, 'video track(s)');

      const recorder = new MediaRecorder(stream, {
        mimeType: support.mp4MimeType,
        videoBitsPerSecond: REC_BITRATE
      });
      console.log('✅ MP4 MediaRecorder created with',support.mp4MimeType);

      // Set up event handlers
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
          console.log('📦 Data chunk received:', event.data.size, 'bytes');
        }
      };

      recorder.onstop = async () => {
        console.log('🛑 Recording stopped. Total chunks:', recordedChunks.length);
        recordingStream?.getTracks().forEach(track=>track.stop());
        recordingStream=null;

        if (recordedChunks.length === 0) {
          logError('Recording failed', 'No video data was recorded');
          resetRecordingUI();
          return;
        }

        const totalSize = recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('📊 Total recorded data:', totalSize, 'bytes');

        try {
          const blob = new Blob(recordedChunks, { type: recorder.mimeType || support.mp4MimeType });
          if(!await isMp4Blob(blob))throw new Error('The browser did not produce a valid MP4 container');
          downloadBlob(blob,`bento-animation-${Date.now()}.mp4`);
          console.log('✅ Recording saved successfully');
          setRecordingStatus(`MP4 saved (${(blob.size/1024/1024).toFixed(1)} MB).`,'success');

        } catch (error) {
          logError('Download failed', error);
        } finally {
          resetRecordingUI();
        }
      };

      recorder.onerror = (event) => {
        console.error('🚨 Recording error:', event.error);
        logError('Recording error occurred', event.error);
        recordingStream?.getTracks().forEach(track=>track.stop());
        recordingStream=null;
        resetRecordingUI();
      };

      // Start recording
      console.log('🚀 Starting MediaRecorder...');
      mediaRecorder = recorder;
      isRecording = true;
      isPreparingRecording = false;
      setControlsLocked(true);
      toggleRecordingBtn.disabled = false;
      toggleRecordingBtn.textContent = 'Stop & Export MP4';
      toggleRecordingBtn.style.background = '#ff4444';
      setRecordingStatus(`Recording MP4 at ${RECORDING_FPS} fps…`);
      recorder.start(1000);

      console.log('✅ Recording started successfully!');

    } catch (error) {
      console.error('🚨 Recording failed:', error);
      logError('Failed to start recording', error);

      // Reset state on failure
      recordingStream?.getTracks().forEach(track=>track.stop());
      recordingStream=null;
      resetRecordingUI();
    }
  }

  function stopRecording() {
    console.log('🛑 Stopping recording...');

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch (error) {
        console.error('Error stopping recorder:', error);
      }
    }

    isRecording = false;
    toggleRecordingBtn.disabled = true;
    toggleRecordingBtn.textContent = 'Finishing MP4…';
    setRecordingStatus('Finalizing and validating MP4…');

    console.log('✅ Recording stopped');
  }

  /* ---------- CONTROLS ---------- */
  qsa('.aspect-ratio-buttons .button').forEach(b => b.addEventListener('click', e => {
    qsa('.aspect-ratio-buttons .button').forEach(x => x.classList.remove('active'));
    e.target.classList.add('active'); aspectRatio = e.target.dataset.aspect; updateCanvasSize();
  }));
  qsa('.orientation-buttons .button').forEach(b => b.addEventListener('click', e => {
    qsa('.orientation-buttons .button').forEach(x => x.classList.remove('active'));
    e.target.classList.add('active'); orientation = e.target.dataset.orientation; animationProgress = 0;
  }));
  viewportBgColorPicker.addEventListener('input', e => canvasBgColor = e.target.value);

  function updateSlider(slider, textCallback) {
    const min = +slider.min || 0, max = +slider.max || 100, val = +slider.value || 0;
    const percent = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--slider-fill-percent', percent + '%');
    const label = slider.parentElement.querySelector('.slider-value');
    if (label && textCallback) label.textContent = textCallback(val);
  }
  [cardCornerRadiusSlider, cardSpacingSlider, cardWidthSlider, animSpeedSlider, animDurationSlider].forEach(sl => {
    updateSlider(sl);
    sl.addEventListener('input', () => {
      updateSlider(sl, v => {
        switch (sl.id) {
          case 'card-corner-radius': cornerRadius = v; return v + ' px';
          case 'card-spacing': cardSpacing = v; return v + ' px';
          case 'card-width': cardWidthScale = v / 100; return v + '%';
          case 'anim-speed': animationSpeed = v; return v.toFixed(1) + 'x';
          case 'anim-duration': animationDuration = v * 1000; return v.toFixed(1) + 's';
        }
      });
    });
  });

  updateMediaBtn.addEventListener('click', reloadMedia);
  batchUploadBtn.addEventListener('click',()=>batchMediaInput.click());
  batchMediaInput.addEventListener('change',async e=>{
    await handleBatchUpload(e.target.files);
    e.target.value='';
  });

  toggleAnimationBtn.addEventListener('click', () => {
    isAnimating = !isAnimating;
    toggleAnimationBtn.textContent = isAnimating ? 'Pause Animation' : 'Start Animation';
    lastTimestamp = 0;
  });

  toggleRecordingBtn.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  /* ---------- DEBUG TOOLS (only in development) ---------- */
  if (location.hostname === 'localhost' || location.search.includes('debug=1')) {
    console.log('🔧 Debug mode enabled');

    // Add debug buttons
    const debugSection = document.createElement('div');
    debugSection.className = 'control-section';
    debugSection.innerHTML = `
      <h3>Debug Tools</h3>
      <button class="button" id="checkSupportBtn" style="margin-bottom: 5px;">Check Recording Support</button>
      <button class="button" id="debugCanvasBtn" style="margin-bottom: 5px;">Debug Canvas</button>
      <button class="button" id="testRecordBtn">Test Record (3s)</button>
    `;

    panel.appendChild(debugSection);

    qs('#checkSupportBtn').addEventListener('click', () => {
      const support = checkRecordingSupport();
      const status = Object.entries(support)
        .map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`)
        .join('\n');
      alert('Browser Support:\n' + status);
    });

    qs('#debugCanvasBtn').addEventListener('click', () => {
      const info = debugCanvasState();
      const status = Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      alert('Canvas Info:\n' + status);
    });

    qs('#testRecordBtn').addEventListener('click', async () => {
      if (!isRecording) {
        await startRecording();
        setTimeout(() => {
          if (isRecording) stopRecording();
        }, 3000);
      }
    });
  }

  /* ---------- SIDE-PANEL TOGGLE ---------- */
  toggle.addEventListener('click', ()=> panel.classList.toggle('open'));
  document.querySelector('.viewport-container').addEventListener('click', ()=> panel.classList.remove('open'));

  /* ---------- KEYBOARD SHORTCUTS ---------- */
  window.addEventListener('keydown', e=>{
    if(e.repeat||/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName))return;
    if(e.code==='Space'){e.preventDefault(); toggleAnimationBtn.click()}
    if(e.code==='KeyR'&&!toggleRecordingBtn.disabled){e.preventDefault(); toggleRecordingBtn.click()}
  });

  /* ---------- INIT ---------- */
  console.log('🚀 Bento Generator initialized');
  console.log('📊 Canvas initial size:', canvas.width, 'x', canvas.height);

  // Check recording support on load
  const support = checkRecordingSupport();
  recordingAvailable=support.captureStream&&support.mediaRecorder&&support.mp4;
  if (!recordingAvailable) {
    console.warn('⚠️ Native MP4 recording is not supported in this browser');
    toggleRecordingBtn.disabled = true;
    toggleRecordingBtn.textContent = 'MP4 Export Not Supported';
    setRecordingStatus('Use a current version of Chrome, Edge, or Safari for MP4 export.','error');
  }

  viewportBgColorPicker.value=canvasBgColor;
  qs('.orientation-buttons .button[data-orientation=horizontal]').classList.add('active');
  updateTotal();
  animate(0);

  window.addEventListener('beforeunload',()=>{
    uploadedBlobURLs.forEach(url=>{if(url)URL.revokeObjectURL(url)});
    recordingStream?.getTracks().forEach(track=>track.stop());
    cancelAnimationFrame(animationFrameId);
  });
});
