/* ----------  ENHANCED JAVASCRIPT WITH RECORDING FIXES  ---------- */
document.addEventListener('DOMContentLoaded', () => {
  /* Canvas */
  const canvas = document.getElementById('renderCanvas');
  const ctx = canvas.getContext('2d');
  const viewportContainer = document.querySelector('.viewport-container');

  /* CONSTANTS (60 fps recording) */
  const CARDS_PER_ROW = 3, ROWS = 3;
  const FPS = 60;
  const RECORDING_FPS = 30; // Reduced for better compatibility
  const REC_BITRATE = 5_000_000; // Reduced bitrate for stability

  /* STATE */
  let isAnimating=false, isRecording=false, animationProgress=0, lastTimestamp=0;
  let animationSpeed=1, animationDuration=10000, cornerRadius=8, canvasBgColor='#5D5D5D';
  let cardSpacing=18, cardWidthScale=1, aspectRatio=null, orientation='horizontal';
  let mediaRecorder, recordedChunks=[], animationFrameId;
  const cardMedia = new Array(9).fill(null);
  const uploadedFiles = new Array(9).fill(null);
  const uploadedBlobURLs = new Array(9).fill(null);
  const loadedImages = new Map(), loadedVideos = new Map(), loadedGIFs = new Map();
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
  const toggleAnimationBtn = qs('#toggleAnimationBtn');
  const toggleRecordingBtn = qs('#toggleRecordingBtn');
  const panel = qs('.control-panel');
  const toggle = qs('#panelToggle');

  /* ---------- DEBUG FUNCTIONS ---------- */
  function checkRecordingSupport() {
    const results = {
      captureStream: !!HTMLCanvasElement.prototype.captureStream,
      mediaRecorder: !!window.MediaRecorder,
      vp9: false,
      vp8: false,
      webm: false,
      https: location.protocol === 'https:'
    };

    if (window.MediaRecorder) {
      results.vp9 = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
      results.vp8 = MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
      results.webm = MediaRecorder.isTypeSupported('video/webm');
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
    // Show user-friendly error message
    const userMsg = `${message}: ${error?.message || error}`;
    alert(userMsg);
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
        <img class="media-thumbnail" id="thumb${String(i).padStart(2,'0')}">
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
    [uploadedFiles[from], uploadedFiles[to]]=[uploadedFiles[to], uploadedFiles[from]];
    [uploadedBlobURLs[from], uploadedBlobURLs[to]]=[uploadedBlobURLs[to], uploadedBlobURLs[from]];
    [cardMedia[from], cardMedia[to]]=[cardMedia[to], cardMedia[from]];
    reloadMedia();
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
    canvas.width = Math.floor(canvasW);
    canvas.height = Math.floor(canvasH);

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
  function drawCard(x,y,w,h,n,url){
    ctx.save();
    drawRoundedRect(x,y,w,h,cornerRadius);ctx.clip();
    ctx.fillStyle='#fff';ctx.fillRect(x,y,w,h);
    let ok=false;
    if(url){
      if(loadedVideos.has(url)){const v=loadedVideos.get(url);if(v.readyState>=2){drawImageCover(v,x,y,w,h);ok=true;}else v.play().catch(()=>0);}
      else if(loadedImages.has(url)){const img=loadedImages.get(url);if(img.complete&&img.naturalWidth){drawImageCover(img,x,y,w,h);ok=true;}}
      else if(loadedGIFs.has(url)){const img=loadedGIFs.get(url);if(img.complete&&img.naturalWidth){drawImageCover(img,x,y,w,h);ok=true;}}
    }
    if(!ok){
      ctx.fillStyle='#5D5D5D';
      const fs=Math.max(Math.min(w*.15,30),12);
      ctx.font=`400 ${fs}px var(--font-main)`;
      ctx.fillText(String(n).padStart(2,'0')+'.',x+w*.1,y+h*.25);
      ctx.fillStyle='#8B8B8B'; ctx.beginPath(); ctx.arc(x+w*.1,y+h*.85,Math.max(w*.015,2),0,Math.PI*2); ctx.fill();
      const tfs=Math.max(w*.08,8);
      ctx.font=`${tfs}px var(--font-main)`;
      ctx.fillText(`Card ${n} Content`,x+w*.1+7,y+h*.85+tfs/3);
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
    qs(`#status${String(idx+1).padStart(2,'0')}`).textContent=msg;
    qs(`#status${String(idx+1).padStart(2,'0')}`).className=`media-status ${type}`;
  }
  function isVideo(f){return f && f.type.startsWith('video/')}
  function isGIF(f){return f && f.type==='image/gif'}
  async function handleFileUpload(idx,file){
    const MAX=25*1024*1024, MAXTOT=200*1024*1024;
    if(!file)return;
    if(file.size>MAX){setStatus(idx,'>25 MB','error');return;}
    const newTot=totalFileSize-(uploadedFiles[idx]?.size||0)+file.size;
    if(newTot>MAXTOT){setStatus(idx,'>200 MB total','error');return;}
    if(uploadedBlobURLs[idx])URL.revokeObjectURL(uploadedBlobURLs[idx]);
    uploadedFiles[idx]=file; const url=URL.createObjectURL(file); uploadedBlobURLs[idx]=url;
    cardMedia[idx]=url;

    /* Progress bar simulation */
    const bar=qs(`#mediaInputs .media-input-group:nth-child(${idx+1}) .upload-progress-bar`);
    bar.style.width='0%';
    let p=0; const iv=setInterval(()=>{p+=10; bar.style.width=p+'%'; if(p>=100){clearInterval(iv);bar.style.width='0%'}},50);

    const thumb=qs(`#thumb${String(idx+1).padStart(2,'0')}`);
    if(isVideo(file)){
      const v=document.createElement('video'); v.src=url; v.loop=v.muted=v.playsInline=true;
      v.addEventListener('loadeddata',()=>{v.play().catch(()=>0);setStatus(idx,'✓ Video ready','success')});
      v.addEventListener('error',()=>setStatus(idx,'Video error','error'));
      loadedVideos.set(url,v); v.load();
    }else if(isGIF(file)){
      const img=new Image(); img.src=url; img.onload=()=>{loadedGIFs.set(url,img);setStatus(idx,'✓ GIF ready','success')};
      img.onerror=()=>setStatus(idx,'GIF error','error');
    }else{
      const img=new Image(); img.src=url; img.onload=()=>{loadedImages.set(url,img);setStatus(idx,'✓ Image ready','success')};
      img.onerror=()=>setStatus(idx,'Image error','error');
    }
    thumb.src=url; thumb.style.display='block';
    updateTotal();
    const mb=(file.size/1024/1024).toFixed(1);
    setStatus(idx,`✓ ${file.name} (${mb}MB)`,'success');
  }
  function reloadMedia(){
    loadedImages.clear(); loadedVideos.clear(); loadedGIFs.clear();
    for(let i=0;i<9;i++){
      const url=uploadedBlobURLs[i];
      if(!url){cardMedia[i]=null;continue}
      cardMedia[i]=url;
      const file=uploadedFiles[i];
      if(isVideo(file)){
        const v=document.createElement('video'); v.src=url; v.loop=v.muted=v.playsInline=true; v.play().catch(()=>0); loadedVideos.set(url,v);
      }else{
        const img=new Image(); img.src=url; isGIF(file)?loadedGIFs.set(url,img):loadedImages.set(url,img);
      }
    }
  }

  /* ---------- ENHANCED RECORDING WITH FIXES ---------- */
  async function startRecording() {
    try {
      console.log('🎬 Starting recording process...');

      // Check browser support first
      const support = checkRecordingSupport();
      if (!support.captureStream) {
        logError('Recording failed', 'Canvas recording not supported in this browser');
        return;
      }
      if (!support.mediaRecorder) {
        logError('Recording failed', 'MediaRecorder not supported in this browser');
        return;
      }
      if (!support.https && location.hostname !== 'localhost') {
        logError('Recording failed', 'HTTPS required for recording (except localhost)');
        return;
      }

      // Validate canvas state
      const canvasInfo = debugCanvasState();
      if (canvasInfo.canvasWidth === 0 || canvasInfo.canvasHeight === 0) {
        logError('Recording failed', 'Canvas has invalid dimensions');
        return;
      }

      recordedChunks = [];

      // Ensure animation is running
      if (!isAnimating) {
        isAnimating = true;
        toggleAnimationBtn.textContent = 'Pause Animation';
        console.log('✅ Animation started for recording');
      }

      // Create canvas stream
      console.log('🎥 Creating canvas stream...');
      const stream = canvas.captureStream(RECORDING_FPS);

      if (!stream || stream.getVideoTracks().length === 0) {
        logError('Recording failed', 'Could not create video stream from canvas');
        return;
      }

      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.contentHint = 'motion';
      console.log('✅ Canvas stream created with', stream.getVideoTracks().length, 'video track(s)');

      // Try different MediaRecorder configurations
      let recorder;
      const configurations = [
        { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: REC_BITRATE },
        { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: REC_BITRATE },
        { mimeType: 'video/webm', videoBitsPerSecond: REC_BITRATE },
        { videoBitsPerSecond: REC_BITRATE },
        {} // No options as last resort
      ];

      for (let i = 0; i < configurations.length; i++) {
        try {
          const config = configurations[i];
          console.log(`🔧 Trying MediaRecorder config ${i + 1}:`, config);
          recorder = new MediaRecorder(stream, config);
          console.log('✅ MediaRecorder created successfully with config:', config);
          break;
        } catch (error) {
          console.warn(`❌ Config ${i + 1} failed:`, error.message);
          if (i === configurations.length - 1) {
            logError('Recording failed', 'No supported MediaRecorder configuration found');
            return;
          }
        }
      }

      // Set up event handlers
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
          console.log('📦 Data chunk received:', event.data.size, 'bytes');
        }
      };

      recorder.onstop = () => {
        console.log('🛑 Recording stopped. Total chunks:', recordedChunks.length);

        if (recordedChunks.length === 0) {
          logError('Recording failed', 'No video data was recorded');
          return;
        }

        const totalSize = recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('📊 Total recorded data:', totalSize, 'bytes');

        try {
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);

          // Create and trigger download
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `bento-animation-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Clean up
          setTimeout(() => URL.revokeObjectURL(url), 1000);

          console.log('✅ Recording saved successfully');
          alert('Recording saved successfully!');

        } catch (error) {
          logError('Download failed', error);
        }
      };

      recorder.onerror = (event) => {
        console.error('🚨 Recording error:', event.error);
        logError('Recording error occurred', event.error);
        stopRecording();
      };

      // Start recording
      console.log('🚀 Starting MediaRecorder...');
      recorder.start(1000); // Record in 1-second chunks

      // Wait for first data to ensure recording actually started
      await new Promise((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('Recording failed to start within 3 seconds'));
          }
        }, 3000);

        const originalHandler = recorder.ondataavailable;
        recorder.ondataavailable = (event) => {
          originalHandler(event);
          if (!resolved && event.data && event.data.size > 0) {
            resolved = true;
            clearTimeout(timeout);
            recorder.ondataavailable = originalHandler;
            resolve();
          }
        };
      });

      // Reset animation progress for clean start
      animationProgress = 0;

      // Update UI and state
      mediaRecorder = recorder;
      isRecording = true;
      toggleRecordingBtn.textContent = 'Stop Recording';
      toggleRecordingBtn.style.background = '#ff4444';

      console.log('✅ Recording started successfully!');

    } catch (error) {
      console.error('🚨 Recording failed:', error);
      logError('Failed to start recording', error);

      // Reset state on failure
      isRecording = false;
      toggleRecordingBtn.textContent = 'Start Recording';
      toggleRecordingBtn.style.background = '';
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

    // Reset UI state
    isRecording = false;
    toggleRecordingBtn.textContent = 'Start Recording';
    toggleRecordingBtn.style.background = '';

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

  toggleAnimationBtn.addEventListener('click', () => {
    isAnimating = !isAnimating;
    toggleAnimationBtn.textContent = isAnimating ? 'Pause Animation' : 'Start Animation';
    if (!isAnimating) animationProgress = 0;
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
    if(e.code==='Space'){e.preventDefault(); toggleAnimationBtn.click()}
    if(e.code==='KeyR'){e.preventDefault(); toggleRecordingBtn.click()}
  });

  /* ---------- INIT ---------- */
  console.log('🚀 Bento Generator initialized');
  console.log('📊 Canvas initial size:', canvas.width, 'x', canvas.height);

  // Check recording support on load
  const support = checkRecordingSupport();
  if (!support.captureStream || !support.mediaRecorder) {
    console.warn('⚠️ Recording not fully supported in this browser');
    toggleRecordingBtn.disabled = true;
    toggleRecordingBtn.textContent = 'Recording Not Supported';
    toggleRecordingBtn.style.opacity = '0.5';
  }

  viewportBgColorPicker.value=canvasBgColor;
  qs('.orientation-buttons .button[data-orientation=horizontal]').classList.add('active');
  updateTotal();
  animate(0);
});
