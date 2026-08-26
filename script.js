const $ = id => document.getElementById(id);

const state = {
  trackId: localStorage.getItem("v6_track") || TRACKS[0].id,
  target: localStorage.getItem("v6_target") || "1:45.000",
  offset: Number(localStorage.getItem("v6_offset") || 0),
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
  chunks: []
};

const DB_NAME = "racing-engineer-v6";
const DB_VERSION = 1;
let db;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains("audio"))d.createObjectStore("audio")};
    req.onsuccess=()=>{db=req.result;resolve(db)};
    req.onerror=()=>reject(req.error);
  });
}
function dbPut(key,blob){return new Promise((res,rej)=>{const r=db.transaction("audio","readwrite").objectStore("audio").put(blob,key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function dbGet(key){return new Promise((res,rej)=>{const r=db.transaction("audio","readonly").objectStore("audio").get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
function dbDelete(key){return new Promise((res,rej)=>{const r=db.transaction("audio","readwrite").objectStore("audio").delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}

function keyFor(trackId,noteId){return `${trackId}::${noteId}`}

function getTrack(){return TRACKS.find(t=>t.id===state.trackId)||TRACKS[0]}
function getNotes(){
  const all=JSON.parse(localStorage.getItem("v6_notes")||"{}");
  return all[state.trackId]||[];
}
function saveNotes(notes){
  const all=JSON.parse(localStorage.getItem("v6_notes")||"{}");
  all[state.trackId]=notes;
  localStorage.setItem("v6_notes",JSON.stringify(all));
}
function parseTime(v){
  if(typeof v==="number")return v;
  const s=String(v||"").trim();
  if(!s)return 0;
  if(s.includes(":")){
    const p=s.split(":").map(Number);
    return (p.length===2?p[0]*60+p[1]:0);
  }
  return Number(s)||0;
}
function fmt(sec){
  sec=Math.max(0,Number(sec)||0);
  const m=Math.floor(sec/60), s=(sec%60).toFixed(3).padStart(6,"0");
  return `${m}:${s}`;
}
function normalizeTimeInput(v){
  const n=parseTime(v);
  return fmt(n);
}
function toast(msg){
  const el=$("toast");el.textContent=msg;el.classList.add("show");
  clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2200);
}
function setStatus(text,active=false){
  $("statusText").textContent=text;
  $("statusDot").style.background=active?"#ff3030":"#45e28a";
  $("statusDot").style.boxShadow=active?"0 0 10px #ff3030":"0 0 10px #45e28a";
}

function initTracks(){
  $("trackSelect").innerHTML=TRACKS.map(t=>`<option value="${t.id}">${t.name}</option>`).join("");
  $("trackSelect").value=state.trackId;
  $("targetTime").value=state.target;
  $("offsetSelect").value=String(state.offset);
  $("targetReadout").textContent=normalizeTimeInput(state.target);
  renderTrack();
}
function renderTrack(){
  const t=getTrack();
  $("trackMeta").textContent=`${t.turns.length} corners • ${t.laps} laps`;
  renderMap();
  renderNotes();
  populateCornerSelect();
  state.selectedCorner=Math.min(state.selectedCorner,t.turns.length-1);
  highlightCorner();
}
function pointsFor(t){
  return SHAPES[t.shape]||SHAPES.bahrain;
}
function pointAtFraction(points,f){
  const lengths=[];let total=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]);
    lengths.push(d);total+=d;
  }
  let target=total*f;
  for(let i=0;i<points.length;i++){
    if(target<=lengths[i]){
      const a=points[i],b=points[(i+1)%points.length],q=target/lengths[i];
      return [a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];
    }
    target-=lengths[i];
  }
  return points[0];
}
function renderMap(){
  const t=getTrack(), pts=pointsFor(t);
  const poly=pts.map(p=>p.join(",")).join(" ");
  const dots=t.turns.map((name,i)=>{
    const p=pointAtFraction(pts,(i+1)/(t.turns.length+1));
    const x=p[0],y=p[1];
    return `<g class="corner-marker" data-index="${i}" tabindex="0">
      <circle class="corner-dot ${i===state.selectedCorner?"selected":""}" cx="${x}" cy="${y}" r="3.2"></circle>
      <text class="corner-text" x="${x}" y="${y}">${i+1}</text>
    </g>`;
  }).join("");
  $("mapWrap").innerHTML=`<svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
    <rect width="100" height="100" fill="#080b10"/>
    <polyline class="track-line" points="${poly} ${pts[0].join(",")}"/>
    <polyline class="track-center" points="${poly} ${pts[0].join(",")}"/>
    <line class="start-line" x1="${pts[0][0]-1}" y1="${pts[0][1]-5}" x2="${pts[0][0]+1}" y2="${pts[0][1]+5}"/>
    ${dots}
  </svg>`;
  document.querySelectorAll(".corner-marker").forEach(g=>{
    g.addEventListener("click",()=>selectCorner(Number(g.dataset.index)));
    g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")selectCorner(Number(g.dataset.index))});
  });
}
function selectCorner(i){
  state.selectedCorner=i;
  highlightCorner();
  openEditorForNew();
  $("noteCorner").value=String(i);
  renderNotes();
}
function highlightCorner(){
  document.querySelectorAll(".corner-dot").forEach((d,i)=>d.classList.toggle("selected",i===state.selectedCorner));
  const t=getTrack();
  $("selectedCornerLabel").textContent=t.turns[state.selectedCorner]||"";
}
function populateCornerSelect(){
  const t=getTrack();
  $("noteCorner").innerHTML=t.turns.map((x,i)=>`<option value="${i}">${x}</option>`).join("");
}
function renderNotes(){
  const notes=[...getNotes()].sort((a,b)=>a.time-b.time);
  const t=getTrack();
  if(!notes.length){$("notesList").innerHTML=`<div class="empty">No notes yet.<br>Tap a corner or add a note.</div>`;return}
  $("notesList").innerHTML=notes.map(n=>`
    <div class="note-card ${n.id===state.editingId?"active":""}" data-id="${n.id}">
      <div class="note-head"><b>${t.turns[n.corner]||"CUSTOM"}</b><span class="note-time">${fmt(n.time)}</span></div>
      <div class="note-text">${escapeHtml(n.text||"")}</div>
      ${n.audioName?`<div class="audio-tag">🎙 ${escapeHtml(n.audioName)}</div>`:""}
    </div>`).join("");
  document.querySelectorAll(".note-card").forEach(c=>c.addEventListener("click",()=>editNote(c.dataset.id)));
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function openEditorForNew(){
  state.editingId=null;state.audioBlob=null;state.audioUrl=null;
  $("noteEditor").classList.add("open");
  $("noteCorner").value=String(state.selectedCorner);
  $("noteTime").value=fmt(state.elapsed || 0);
  $("noteText").value="";
  setAudioUI(null);
}
async function editNote(id){
  const n=getNotes().find(x=>x.id===id);if(!n)return;
  state.editingId=id;state.selectedCorner=n.corner;
  $("noteEditor").classList.add("open");
  $("noteCorner").value=String(n.corner);$("noteTime").value=fmt(n.time);$("noteText").value=n.text||"";
  state.audioBlob=await dbGet(keyFor(state.trackId,id));setAudioUI(n.audioName,state.audioBlob);
  renderMap();highlightCorner();renderNotes();
}
function closeEditor(){ $("noteEditor").classList.remove("open");state.editingId=null;state.audioBlob=null; if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);state.audioUrl=null }
function setAudioUI(name,blob=state.audioBlob){
  $("audioStatus").textContent=name?`Attached: ${name}`:"No audio attached";
  $("playNoteAudioBtn").disabled=!blob;
  $("removeAudioBtn").disabled=!blob;
}
async function saveCurrentNote(){
  const text=$("noteText").value.trim();
  const time=parseTime($("noteTime").value);
  const corner=Number($("noteCorner").value);
  if(!text && !state.audioBlob){toast("Add text or an audio note.");return}
  if(time<0){toast("Timing cannot be negative.");return}
  const notes=getNotes();
  let n=state.editingId?notes.find(x=>x.id===state.editingId):null;
  if(!n){n={id:crypto.randomUUID(),created:Date.now()};notes.push(n)}
  n.corner=corner;n.time=time;n.text=text;n.audioName=$("audioFile").files[0]?.name || n.audioName || "";
  if(state.audioBlob){
    await dbPut(keyFor(state.trackId,n.id),state.audioBlob);
    n.audioType=state.audioBlob.type;
  }else if(!state.editingId){n.audioName=""}
  saveNotes(notes);state.selectedCorner=corner;closeEditor();renderTrack();toast("Note saved.");
}
async function deleteCurrentNote(){
  if(!state.editingId){closeEditor();return}
  await dbDelete(keyFor(state.trackId,state.editingId));
  saveNotes(getNotes().filter(n=>n.id!==state.editingId));
  closeEditor();renderTrack();toast("Note deleted.");
}

function updateTimer(){
  if(!state.running)return;
  state.elapsed=(performance.now()-state.startedAt)/1000;
  $("elapsed").textContent=fmt(state.elapsed);
  const delta=state.elapsed-parseTime(state.target);
  $("delta").textContent=(delta>=0?"+":"")+delta.toFixed(3);
  fireNotes();
  state.timer=requestAnimationFrame(updateTimer);
}
function startLap(demo=false){
  stopLap(false);state.demo=demo;state.elapsed=0;state.fired.clear();
  state.startedAt=performance.now();state.running=true;
  setStatus(demo?"DEMO RUN":"LAP RUN",true);
  $("startBtn").textContent="RUNNING…";$("pauseBtn").disabled=false;
  state.timer=requestAnimationFrame(updateTimer);
}
function pauseLap(){
  if(!state.running)return;
  state.running=false;cancelAnimationFrame(state.timer);setStatus("PAUSED");$("startBtn").textContent="RESUME";
}
function stopLap(reset=true){
  state.running=false;cancelAnimationFrame(state.timer);state.timer=null;
  if(reset){state.elapsed=0;state.fired.clear();$("elapsed").textContent=fmt(0);$("delta").textContent="+0.000"}
  setStatus("READY");$("startBtn").textContent="START LAP";
}
async function fireNotes(){
  const notes=getNotes();
  for(const n of notes){
    const trigger=n.time+state.offset;
    if(!state.fired.has(n.id)&&state.elapsed>=trigger){
      state.fired.add(n.id);
      playNote(n);
    }
  }
  if(state.demo && state.elapsed>=parseTime(state.target)){toast("Demo lap complete.");stopLap(false)}
}
async function playNote(n){
  const label=getTrack().turns[n.corner]||"NOTE";
  if(n.audioName){
    const blob=await dbGet(keyFor(state.trackId,n.id));
    if(blob){const url=URL.createObjectURL(blob);const a=new Audio(url);a.onended=()=>URL.revokeObjectURL(url);a.play().catch(()=>{});return}
  }
  if("speechSynthesis" in window && n.text){
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(n.text);
    u.rate=1.08;u.pitch=1;u.volume=1;u.lang="en-US";
    speechSynthesis.speak(u);
  }
  $("selectedCornerLabel").textContent=`${label} • LIVE`;
}

async function loadSelectedAudio(){
  const file=$("audioFile").files[0];
  if(!file)return;
  if(file.type!=="audio/mpeg" && !file.name.toLowerCase().endsWith(".mp3")){
    toast("Please choose an MP3 file.");$("audioFile").value="";return
  }
  state.audioBlob=file;setAudioUI(file.name,file);
}
function startRecording(){
  if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){toast("Recording is not supported in this browser.");return}
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    const preferred=["audio/mpeg","audio/webm;codecs=opus","audio/webm"].find(x=>MediaRecorder.isTypeSupported(x));
    state.chunks=[];state.recording=new MediaRecorder(stream,preferred?{mimeType:preferred}:{});
    state.recording.ondataavailable=e=>{if(e.data.size)state.chunks.push(e.data)};
    state.recording.onstop=()=>{
      const type=state.recording.mimeType||"audio/webm";
      state.audioBlob=new Blob(state.chunks,{type});
      const ext=type.includes("mpeg")?"mp3":"webm";
      $("audioFile").value="";
      setAudioUI(`recording.${ext}`,state.audioBlob);
      stream.getTracks().forEach(t=>t.stop());
      toast(ext==="mp3"?"MP3 recording attached.":"Recording attached. Use ADD MP3 if your Oculus setup requires MP3 specifically.");
    };
    state.recording.start();$("recordBtn").disabled=true;$("stopRecordBtn").disabled=false;toast("Recording…");
  }).catch(()=>toast("Microphone permission was not granted."));
}
function stopRecording(){if(state.recording?.state!=="inactive")state.recording?.stop();$("recordBtn").disabled=false;$("stopRecordBtn").disabled=true}

async function playEditorAudio(){
  if(!state.audioBlob)return;
  if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);
  state.audioUrl=URL.createObjectURL(state.audioBlob);
  const a=new Audio(state.audioUrl);a.play().catch(()=>toast("Tap PLAY again to allow audio."));
}
async function removeEditorAudio(){
  if(state.editingId)await dbDelete(keyFor(state.trackId,state.editingId));
  state.audioBlob=null;$("audioFile").value="";$("audioStatus").textContent="No audio attached";
  setAudioUI(null);
}

async function exportData(){
  const all=JSON.parse(localStorage.getItem("v6_notes")||"{}");
  const out={version:6,exportedAt:new Date().toISOString(),notes:all,audio:{}};
  for(const t of TRACKS)for(const n of (all[t.id]||[])){
    const b=await dbGet(keyFor(t.id,n.id));if(b)out.audio[keyFor(t.id,n.id)]={type:b.type,data:await blobToBase64(b)};
  }
  const blob=new Blob([JSON.stringify(out)],{type:"application/json"});
  downloadBlob(blob,"racing-engineer-v6-backup.json");toast("Backup exported.");
}
function blobToBase64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
function base64ToBlob(b64,type){const bin=atob(b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type})}
function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function importData(file){
  try{
    const data=JSON.parse(await file.text());
    if(data.version!==6)throw new Error("Unsupported backup");
    localStorage.setItem("v6_notes",JSON.stringify(data.notes||{}));
    for(const [key,v] of Object.entries(data.audio||{}))await dbPut(key,base64ToBlob(v.data,v.type));
    toast("Backup imported.");renderTrack();
  }catch(e){toast("Import failed.");console.error(e)}
}

function wire(){
  $("trackSelect").addEventListener("change",e=>{state.trackId=e.target.value;state.selectedCorner=0;localStorage.setItem("v6_track",state.trackId);closeEditor();renderTrack()});
  $("targetTime").addEventListener("change",e=>{state.target=normalizeTimeInput(e.target.value);e.target.value=state.target;localStorage.setItem("v6_target",state.target);$("targetReadout").textContent=state.target});
  $("offsetSelect").addEventListener("change",e=>{state.offset=Number(e.target.value);localStorage.setItem("v6_offset",state.offset)});
  $("startBtn").addEventListener("click",()=>state.running?pauseLap():startLap(false));
  $("pauseBtn").addEventListener("click",pauseLap);
  $("resetBtn").addEventListener("click",()=>stopLap(true));
  $("demoBtn").addEventListener("click",()=>startLap(true));
  $("addNoteBtn").addEventListener("click",openEditorForNew);
  $("saveNoteBtn").addEventListener("click",saveCurrentNote);
  $("deleteNoteBtn").addEventListener("click",deleteCurrentNote);
  $("cancelNoteBtn").addEventListener("click",closeEditor);
  $("audioFile").addEventListener("change",loadSelectedAudio);
  $("recordBtn").addEventListener("click",startRecording);
  $("stopRecordBtn").addEventListener("click",stopRecording);
  $("playNoteAudioBtn").addEventListener("click",playEditorAudio);
  $("removeAudioBtn").addEventListener("click",removeEditorAudio);
  $("exportBtn").addEventListener("click",exportData);
  $("importFile").addEventListener("change",e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""});
  $("clearBtn").addEventListener("click",async()=>{
    if(!confirm("Delete every V6 note and stored audio from this browser?"))return;
    localStorage.removeItem("v6_notes");
    const tx=db.transaction("audio","readwrite");tx.objectStore("audio").clear();
    closeEditor();renderTrack();toast("Local V6 data cleared.");
  });
  $("noteCorner").addEventListener("change",e=>{state.selectedCorner=Number(e.target.value);renderMap();highlightCorner()});
}

(async()=>{await openDB();initTracks();wire();$("pauseBtn").disabled=true})();
