const $ = id => document.getElementById(id);

const state = {
  trackId: localStorage.getItem('v6_track') || TRACKS[0].id,
  target: localStorage.getItem('v6_target') || '1:45.000',
  offset: Number(localStorage.getItem('v6_offset') || 0),
  selectedCorner: 0,
  editingId: null,
  audioBlob: null,
  audioUrl: null,
  timer: null,
  startedAt: 0,
  elapsed: 0,
  running: false,
  fired: new Set(),
  demo: false,
  recording: null,
  chunks: [],
  micStream: null
};

const DB_NAME = 'racing-engineer-v6';
const DB_VERSION = 2;
let db;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if(!d.objectStoreNames.contains('audio')) d.createObjectStore('audio');
    };
    req.onsuccess = () => { db=req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}
function dbPut(key,blob){return new Promise((res,rej)=>{const r=db.transaction('audio','readwrite').objectStore('audio').put(blob,key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function dbGet(key){return new Promise((res,rej)=>{const r=db.transaction('audio','readonly').objectStore('audio').get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
function dbDelete(key){return new Promise((res,rej)=>{const r=db.transaction('audio','readwrite').objectStore('audio').delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function keyFor(trackId,noteId){return `${trackId}::${noteId}`}
function getTrack(){return TRACKS.find(t=>t.id===state.trackId)||TRACKS[0]}
function getNotes(){const all=JSON.parse(localStorage.getItem('v6_notes')||'{}');return all[state.trackId]||[]}
function saveNotes(notes){const all=JSON.parse(localStorage.getItem('v6_notes')||'{}');all[state.trackId]=notes;localStorage.setItem('v6_notes',JSON.stringify(all))}
function parseTime(v){
  if(typeof v==='number') return v;
  const s=String(v||'').trim(); if(!s) return 0;
  if(s.includes(':')){const p=s.split(':').map(Number);return p.length===2?p[0]*60+p[1]:0}
  return Number(s)||0;
}
function fmt(sec){sec=Math.max(0,Number(sec)||0);const m=Math.floor(sec/60),s=(sec%60).toFixed(3).padStart(6,'0');return `${m}:${s}`}
function normalizeTimeInput(v){return fmt(parseTime(v))}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2500)}
function setStatus(text,active=false){$('statusText').textContent=text;$('statusDot').style.background=active?'#ff3030':'#45e28a';$('statusDot').style.boxShadow=active?'0 0 10px #ff3030':'0 0 10px #45e28a'}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function initTracks(){
  $('trackSelect').innerHTML=TRACKS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  $('trackSelect').value=state.trackId;
  $('targetTime').value=state.target;
  $('offsetSelect').value=String(state.offset);
  $('targetReadout').textContent=normalizeTimeInput(state.target);
  renderTrack();
}

function renderTrack(){
  const t=getTrack();
  $('trackMeta').textContent=`${t.turns.length} corners • ${t.laps} laps`;
  renderMap(); renderNotes(); populateCornerSelect();
  state.selectedCorner=Math.min(state.selectedCorner,t.turns.length-1);
  highlightCorner();
}

function fallbackMapSvg(t){
  const pts=FALLBACK_SHAPE.map(p=>p.join(',')).join(' ');
  return `<svg class="fallback-svg" viewBox="0 0 100 100" aria-label="${escapeHtml(t.name)} schematic"><polyline points="${pts} ${FALLBACK_SHAPE[0].join(',')}"/><text x="50" y="50">MAP ASSET PENDING</text></svg>`;
}
function renderMap(){
  const t=getTrack();
  const markers=(t.markerPositions||[]).map((p,i)=>`
    <button class="map-corner ${i===state.selectedCorner?'selected':''}" style="left:${p[0]}%;top:${p[1]}%" data-index="${i}" title="${escapeHtml(t.turns[i])}">${i+1}</button>`).join('');
  const map=t.mapUrl
    ? `<img src="${t.mapUrl}" alt="${escapeHtml(t.name)} circuit layout" loading="eager" onerror="this.style.display='none';this.nextElementSibling.classList.add('show')">${fallbackMapSvg(t)}`
    : fallbackMapSvg(t);
  $('mapWrap').innerHTML=`<div class="real-map">${map}<div class="map-overlay">${markers}</div></div>`;
  document.querySelectorAll('.map-corner').forEach(b=>b.addEventListener('click',()=>selectCorner(Number(b.dataset.index))));
}

function selectCorner(i){
  state.selectedCorner=i;
  highlightCorner();
  renderMap();
  renderNotes();
  openEditorForNew();
  $('noteCorner').value=String(i);
}
function highlightCorner(){
  document.querySelectorAll('.map-corner').forEach((d,i)=>d.classList.toggle('selected',i===state.selectedCorner));
  const t=getTrack(); $('selectedCornerLabel').textContent=t.turns[state.selectedCorner]||'';
}
function populateCornerSelect(){const t=getTrack();$('noteCorner').innerHTML=t.turns.map((x,i)=>`<option value="${i}">${x}</option>`).join('')}

function renderNotes(){
  const notes=[...getNotes()].sort((a,b)=>a.time-b.time),t=getTrack();
  if(!notes.length){$('notesList').innerHTML='<div class="empty">No notes yet.<br>Tap a corner or add a note.</div>';return}
  $('notesList').innerHTML=notes.map(n=>`
    <div class="note-card ${n.id===state.editingId?'active':''}" data-id="${n.id}">
      <div class="note-head"><b>${escapeHtml(t.turns[n.corner]||'CUSTOM')}</b><span class="note-time">${fmt(n.time)}</span></div>
      <div class="note-text">${escapeHtml(n.text||'')}</div>
      ${n.audioAttached?`<div class="audio-tag">🎙 ${escapeHtml(n.audioName||'Voice recording')}</div>`:''}
    </div>`).join('');
  document.querySelectorAll('.note-card').forEach(c=>c.addEventListener('click',()=>editNote(c.dataset.id)));
}

function openEditorForNew(){
  state.editingId=null;state.audioBlob=null;state.audioUrl=null;
  $('noteEditor').classList.add('open');
  $('noteCorner').value=String(state.selectedCorner);
  $('noteTime').value=fmt(state.elapsed||0);
  $('noteText').value=''; $('audioFile').value=''; setAudioUI(null);
}
async function editNote(id){
  const n=getNotes().find(x=>x.id===id); if(!n)return;
  state.editingId=id;state.selectedCorner=n.corner;
  $('noteEditor').classList.add('open');
  $('noteCorner').value=String(n.corner);$('noteTime').value=fmt(n.time);$('noteText').value=n.text||'';$('audioFile').value='';
  state.audioBlob=await dbGet(keyFor(state.trackId,id));
  setAudioUI(state.audioBlob?(n.audioName||'Voice recording'):null,state.audioBlob);
  renderMap();highlightCorner();renderNotes();
}
function closeEditor(){
  $('noteEditor').classList.remove('open');state.editingId=null;state.audioBlob=null;
  if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);state.audioUrl=null;
}
function setAudioUI(name,blob=state.audioBlob){
  $('audioStatus').textContent=name?`Attached: ${name}`:'No audio attached';
  $('playNoteAudioBtn').disabled=!blob;$('removeAudioBtn').disabled=!blob;
}

async function saveCurrentNote(){
  const text=$('noteText').value.trim(),time=parseTime($('noteTime').value),corner=Number($('noteCorner').value);
  if(!text&&!state.audioBlob){toast('Add text or a voice recording.');return}
  if(time<0){toast('Timing cannot be negative.');return}
  const notes=getNotes();
  let n=state.editingId?notes.find(x=>x.id===state.editingId):null;
  if(!n){n={id:crypto.randomUUID(),created:Date.now()};notes.push(n)}
  n.corner=corner;n.time=time;n.text=text;
  const file=$('audioFile').files[0];
  n.audioName=file?.name || n.audioName || (state.audioBlob?'Voice recording':'');
  n.audioAttached=!!state.audioBlob;
  if(state.audioBlob){await dbPut(keyFor(state.trackId,n.id),state.audioBlob);n.audioType=state.audioBlob.type}
  else if(!n.audioAttached){await dbDelete(keyFor(state.trackId,n.id));n.audioName='';n.audioType=''}
  saveNotes(notes);state.selectedCorner=corner;closeEditor();renderTrack();toast('Note saved.');
}
async function deleteCurrentNote(){
  if(!state.editingId){closeEditor();return}
  await dbDelete(keyFor(state.trackId,state.editingId));saveNotes(getNotes().filter(n=>n.id!==state.editingId));closeEditor();renderTrack();toast('Note deleted.')
}

function updateTimer(){
  if(!state.running)return;
  state.elapsed=(performance.now()-state.startedAt)/1000;$('elapsed').textContent=fmt(state.elapsed);
  const delta=state.elapsed-parseTime(state.target);$('delta').textContent=(delta>=0?'+':'')+delta.toFixed(3);
  fireNotes();state.timer=requestAnimationFrame(updateTimer);
}
function startLap(demo=false){
  stopLap(false);state.demo=demo;state.elapsed=0;state.fired.clear();state.startedAt=performance.now();state.running=true;
  setStatus(demo?'DEMO RUN':'LAP RUN',true);$('startBtn').textContent='RUNNING…';$('pauseBtn').disabled=false;state.timer=requestAnimationFrame(updateTimer)
}
function pauseLap(){if(!state.running)return;state.running=false;cancelAnimationFrame(state.timer);setStatus('PAUSED');$('startBtn').textContent='RESUME'}
function stopLap(reset=true){state.running=false;cancelAnimationFrame(state.timer);state.timer=null;if(reset){state.elapsed=0;state.fired.clear();$('elapsed').textContent=fmt(0);$('delta').textContent='+0.000'}setStatus('READY');$('startBtn').textContent='START LAP'}
async function fireNotes(){
  const notes=getNotes();
  for(const n of notes){
    const trigger=n.time+state.offset;
    if(!state.fired.has(n.id)&&state.elapsed>=trigger){state.fired.add(n.id);playNote(n)}
  }
  if(state.demo&&state.elapsed>=parseTime(state.target)){toast('Demo lap complete.');stopLap(false)}
}
async function playNote(n){
  const label=getTrack().turns[n.corner]||'NOTE';
  if(n.audioAttached){
    const blob=await dbGet(keyFor(state.trackId,n.id));
    if(blob){
      const url=URL.createObjectURL(blob),a=new Audio(url);
      a.preload='auto';a.onended=()=>URL.revokeObjectURL(url);
      try{await a.play();$('selectedCornerLabel').textContent=`${label} • VOICE`;return}catch(e){URL.revokeObjectURL(url);toast('Voice playback was blocked; tap the page once and retry.')}
    }
  }
  if('speechSynthesis' in window&&n.text){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(n.text);u.rate=1.08;u.pitch=1;u.volume=1;u.lang='en-US';speechSynthesis.speak(u)}
  $('selectedCornerLabel').textContent=`${label} • LIVE`;
}

function loadSelectedAudio(){
  const file=$('audioFile').files[0];if(!file)return;
  if(!file.name.toLowerCase().endsWith('.mp3')){toast('Use an MP3 file for uploaded audio.');$('audioFile').value='';return}
  state.audioBlob=file;setAudioUI(file.name,file);toast('MP3 attached. Save the note to keep it.');
}

async function startRecording(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('This browser cannot record. Use Chrome/Quest Browser over HTTPS.');return}
  try{
    state.micStream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    const candidates=['audio/webm;codecs=opus','audio/webm','audio/mp4'];
    const mime=candidates.find(x=>MediaRecorder.isTypeSupported(x));
    if(!mime)throw new Error('No supported recording format');
    state.chunks=[];
    state.recording=new MediaRecorder(state.micStream,{mimeType:mime,audioBitsPerSecond:128000});
    state.recording.ondataavailable=e=>{if(e.data&&e.data.size)state.chunks.push(e.data)};
    state.recording.onerror=()=>{cleanupRecorder();toast('Recording error.');};
    state.recording.onstop=()=>{
      const type=state.recording.mimeType||mime;
      state.audioBlob=new Blob(state.chunks,{type});
      const ext=type.includes('mp4')?'m4a':'webm';
      $('audioFile').value='';setAudioUI(`recording.${ext}`,state.audioBlob);
      cleanupRecorder();toast('Voice recording attached. Tap SAVE NOTE.');
    };
    state.recording.start(250);$('recordBtn').disabled=true;$('stopRecordBtn').disabled=false;setStatus('RECORDING',true);toast('Recording… tap STOP when finished.');
  }catch(e){console.error(e);cleanupRecorder();toast('Microphone permission/recording failed. Check browser microphone permission.');}
}
function cleanupRecorder(){
  if(state.micStream){state.micStream.getTracks().forEach(t=>t.stop());state.micStream=null}
  state.recording=null;$('recordBtn').disabled=false;$('stopRecordBtn').disabled=true;if(!state.running)setStatus('READY');
}
function stopRecording(){if(state.recording&&state.recording.state!=='inactive')state.recording.stop()}

async function playEditorAudio(){
  if(!state.audioBlob)return;
  if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);
  state.audioUrl=URL.createObjectURL(state.audioBlob);
  const a=new Audio(state.audioUrl);a.onended=()=>URL.revokeObjectURL(state.audioUrl);a.play().catch(()=>toast('Tap PLAY again after interacting with the page.'))
}
async function removeEditorAudio(){
  if(state.editingId)await dbDelete(keyFor(state.trackId,state.editingId));
  state.audioBlob=null;$('audioFile').value='';setAudioUI(null)
}

async function exportData(){
  const all=JSON.parse(localStorage.getItem('v6_notes')||'{}'),out={version:6,exportedAt:new Date().toISOString(),notes:all,audio:{}};
  for(const t of TRACKS)for(const n of(all[t.id]||[])){const b=await dbGet(keyFor(t.id,n.id));if(b)out.audio[keyFor(t.id,n.id)]={type:b.type,data:await blobToBase64(b)}}
  downloadBlob(new Blob([JSON.stringify(out)],{type:'application/json'}),'racing-engineer-v6-backup.json');toast('Backup exported.')
}
function blobToBase64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
function base64ToBlob(b64,type){const bin=atob(b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type})}
function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function importData(file){try{const data=JSON.parse(await file.text());if(data.version!==6)throw new Error('Unsupported backup');localStorage.setItem('v6_notes',JSON.stringify(data.notes||{}));for(const[key,v]of Object.entries(data.audio||{}))await dbPut(key,base64ToBlob(v.data,v.type));toast('Backup imported.');renderTrack()}catch(e){console.error(e);toast('Import failed.')}}

function wire(){
  $('trackSelect').addEventListener('change',e=>{state.trackId=e.target.value;state.selectedCorner=0;localStorage.setItem('v6_track',state.trackId);closeEditor();renderTrack()});
  $('targetTime').addEventListener('change',e=>{state.target=normalizeTimeInput(e.target.value);e.target.value=state.target;localStorage.setItem('v6_target',state.target);$('targetReadout').textContent=state.target});
  $('offsetSelect').addEventListener('change',e=>{state.offset=Number(e.target.value);localStorage.setItem('v6_offset',state.offset)});
  $('startBtn').addEventListener('click',()=>state.running?pauseLap():startLap(false));$('pauseBtn').addEventListener('click',pauseLap);$('resetBtn').addEventListener('click',()=>stopLap(true));$('demoBtn').addEventListener('click',()=>startLap(true));
  $('addNoteBtn').addEventListener('click',openEditorForNew);$('saveNoteBtn').addEventListener('click',saveCurrentNote);$('deleteNoteBtn').addEventListener('click',deleteCurrentNote);$('cancelNoteBtn').addEventListener('click',closeEditor);
  $('audioFile').addEventListener('change',loadSelectedAudio);$('recordBtn').addEventListener('click',startRecording);$('stopRecordBtn').addEventListener('click',stopRecording);$('playNoteAudioBtn').addEventListener('click',playEditorAudio);$('removeAudioBtn').addEventListener('click',removeEditorAudio);
  $('exportBtn').addEventListener('click',exportData);$('importFile').addEventListener('change',e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=''});
  $('clearBtn').addEventListener('click',async()=>{if(!confirm('Delete every V6 note and stored audio from this browser?'))return;localStorage.removeItem('v6_notes');db.transaction('audio','readwrite').objectStore('audio').clear();closeEditor();renderTrack();toast('Local V6 data cleared.')});
  $('noteCorner').addEventListener('change',e=>{state.selectedCorner=Number(e.target.value);renderMap();highlightCorner()});
}

(async()=>{try{await openDB();initTracks();wire();$('pauseBtn').disabled=true}catch(e){console.error(e);toast('V6 failed to initialize. Reload the page.')}})();
