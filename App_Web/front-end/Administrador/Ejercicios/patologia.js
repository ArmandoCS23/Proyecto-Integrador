(function(){
  // helper
  function qs(sel, parent=document){ return parent.querySelector(sel) }
  function qsa(sel, parent=document){ return Array.from(parent.querySelectorAll(sel)) }

  function getQueryParam(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  const pathologyKey = getQueryParam('key') || 'unknown';
  const titleMap = {
    'espondilolisis': 'Espondilólisis',
    'escoliosis': 'Escoliosis lumbar',
    'hernia': 'Hernia de disco lumbar',
    'lumbalgia': 'Lumbalgia mecánica inespecífica'
  };

  const patTitle = titleMap[pathologyKey] || (pathologyKey.charAt(0).toUpperCase()+pathologyKey.slice(1));
  qs('#patologiaTitle').textContent = patTitle;
  qs('#patologiaDesc').textContent = 'Administra los ejercicios predeterminados para '+patTitle+". Crea ejercicios base que luego podrás asignar a terapeutas.";

  // localStorage keys
  const LS_DEFAULT = 'default_exercises'; // object: { pathologyKey: [ex] }
  const LS_ASSIGNED = 'assigned_exercises'; // array of assignments

  function readDefaults(){
    try{ return JSON.parse(localStorage.getItem(LS_DEFAULT) || '{}') }catch(e){ return {} }
  }
  function writeDefaults(obj){ localStorage.setItem(LS_DEFAULT, JSON.stringify(obj)) }

  function readAssigned(){ try{ return JSON.parse(localStorage.getItem(LS_ASSIGNED) || '[]') }catch(e){ return [] } }
  function writeAssigned(arr){ localStorage.setItem(LS_ASSIGNED, JSON.stringify(arr)) }

  // UI elements
  const form = qs('#exerciseForm');
  const exList = qs('#exList');
  const resetBtn = qs('#resetForm');

  // load therapists for assign select
  function loadTherapists(){
    let t = [];
    try{ t = JSON.parse(localStorage.getItem('therapists') || '[]') }catch(e){ t = [] }
    return t;
  }

  function loadPatientsForTherapist(therapistId){
    try{
      const raw = JSON.parse(localStorage.getItem('therapist_patients') || '[]');
      // support two storage formats:
      // 1) object map { therapistId: [patients] }
      // 2) flat array [patientObj, ...] where patientObj.assignedTherapist === therapistId
      // normalize helper to compare diagnosis strings (remove diacritics, lowercase)
      function normalize(str){ try { return String(str||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){ return String(str||'').toLowerCase(); } }
      const desiredDiagnosis = normalize(titleMap[pathologyKey] || pathologyKey || '');
      if(Array.isArray(raw)){
        return raw.filter(p => {
          const owner = (p.assignedTherapist || p.therapistId || '');
          if(String(owner) != String(therapistId)) return false;
          // ensure patient diagnosis matches current pathology
          const pd = normalize(p.diagnosis || '');
          return pd && pd === desiredDiagnosis;
        });
      } else if(raw && typeof raw === 'object'){
        const list = raw[therapistId] || [];
        return (list || []).filter(p => {
          const pd = normalize(p.diagnosis || '');
          return pd && pd === desiredDiagnosis;
        });
      }
      return [];
    }catch(e){ return [] }
  }

  function renderExercises(){
    const all = readDefaults();
    const list = all[pathologyKey] || [];
    // If the exercises list container was removed from the page, skip rendering
    if(!exList) return;
    exList.innerHTML = '';
    if(!list.length){ exList.innerHTML = ''; return }

    // Filtrar ejercicios para mostrar solo el primer ejercicio por nombre en Lumbalgia mecánica inespecífica
    const shownNames = new Set();
    list.forEach(ex => {
      // En Lumbalgia mecánica inespecífica, filtrar por nombre
      if(pathologyKey === 'lumbalgia') {
        if(ex.name && shownNames.has(ex.name)) return;
        if(ex.name) shownNames.add(ex.name);
      }
      // En otras patologías, mostrar todos
      else {
        // Si quieres filtrar en todas, descomenta las siguientes líneas:
        // if(ex.name && shownNames.has(ex.name)) return;
        // if(ex.name) shownNames.add(ex.name);
      }

      const item = document.createElement('div'); item.className = 'ex-item';
      const thumb = document.createElement('div'); thumb.className = 'ex-thumb'; thumb.textContent = ex.icon || '📝';
      const body = document.createElement('div'); body.className = 'ex-body';
      const t = document.createElement('div'); t.className = 'ex-title'; t.textContent = ex.name;
      const d = document.createElement('div'); d.className = 'ex-desc'; d.textContent = ex.desc || '';
      const meta = document.createElement('div'); meta.className = 'ex-badge'; meta.textContent = ex.meta || '';

      const actions = document.createElement('div'); actions.className = 'ex-actions';
      const editBtn = document.createElement('button'); editBtn.className = 'btn btn-small btn-edit'; editBtn.textContent = 'Editar';
      const delBtn = document.createElement('button'); delBtn.className = 'btn btn-small'; delBtn.textContent = 'Eliminar';

      editBtn.onclick = ()=> populateFormForEdit(ex.id);
      delBtn.onclick = ()=> { if(confirm('Eliminar ejercicio?')){ deleteExercise(ex.id) } }

      actions.appendChild(editBtn); actions.appendChild(delBtn);

      body.appendChild(t); body.appendChild(d); body.appendChild(meta); body.appendChild(actions);

      const chk = document.createElement('input'); chk.type='checkbox'; chk.className='ex-select'; chk.dataset.exId = ex.id; chk.title = 'Seleccionar ejercicio';

      const videoBox = document.createElement('div'); videoBox.className = 'video-box';
      let v = null;
      if(ex.media){
        v = document.createElement('video'); v.controls = true; v.src = ex.media; videoBox.appendChild(v);
      } else if(ex.mediaRef && ex.mediaRef.type === 'bundled'){
        v = document.createElement('video'); v.controls = true; v.width = 280; videoBox.appendChild(v);
        loadBundledVideos().then(bundled=>{ const b = bundled.find(x=>x.id===ex.mediaRef.id); if(b) v.src = b.path }).catch(()=>{/* ignore */});
      } else if(ex.mediaRef && ex.mediaRef.type === 'user'){
        v = document.createElement('video'); v.controls = true; v.width = 280; videoBox.appendChild(v);
        const metas = readUserVideosMeta(); const m = metas.find(x=>x.id===ex.mediaRef.id);
        if(m){
          if(m.storedIn==='local' && m.dataUrl){ v.src = m.dataUrl; }
          else if(m.storedIn==='session' && m.sessionUrl){ v.src = m.sessionUrl; }
          else if(m.storedIn==='idb'){
            idbGetVideo(m.id).then(blob=>{ if(blob) v.src = URL.createObjectURL(blob) }).catch(()=>{/* ignore */});
          }
        } else {
          const note = document.createElement('div'); note.textContent = '(video no disponible)'; note.style.color='#6b7280'; videoBox.appendChild(note);
        }
      } else if(window.__exerciseMedia && window.__exerciseMedia[ex.id]){
        v = document.createElement('video'); v.controls = true; v.src = window.__exerciseMedia[ex.id]; videoBox.appendChild(v);
      } else if(ex.mediaName){
        const span = document.createElement('div'); span.textContent = 'Archivo: '+ex.mediaName; span.style.color = '#374151'; videoBox.appendChild(span);
      }
      if(v) {
        v.addEventListener('play', function() {
          qsa('video').forEach(vid => { if(vid !== v) vid.pause(); });
        });
      }
      body.appendChild(videoBox);
      item.appendChild(chk);
      item.appendChild(thumb); item.appendChild(body);
      exList.appendChild(item);
    });
  }

  function saveExerciseObj(obj){
    const all = readDefaults();
    const list = all[pathologyKey] || [];
    const idx = list.findIndex(x=>x.id===obj.id);
    if(idx>=0) list[idx]=obj; else list.unshift(obj);
    all[pathologyKey]=list;
    writeDefaults(all);
    renderExercises();
  }


  // Persist exercise to backend when possible (admin/terapeuta token present)
  async function persistExerciseToServer(obj){
    try{
      const token = localStorage.getItem('token');
      if(!token) return null;
      // build payload compatible with backend
      const payload = { titulo: obj.name || obj.title || '', descripcion: obj.desc || '', patologia: qs('#patologiaTitle')?.textContent || '', videoUrl: obj.media || obj.mediaName || undefined };
      // if object has a direct assignedTo (patient id), send it
      if(obj.assignedTo) payload.assignedTo = obj.assignedTo;
      const res = await fetch('/api/ejercicios', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(payload) });
      if(!res.ok) {
        const data = await res.json().catch(()=>({}));
        console.warn('Servidor rechazó crear ejercicio:', data);
        return null;
      }
      const data = await res.json();
      return data.ejercicio || null;
    }catch(e){ console.warn('Error persisting ejercicio:', e); return null }
  }

  // If there are bundled videos for this pathology but no default exercises saved yet,
  // create one default exercise per bundled video so they appear in the exercises list.
  function ensureDefaultExercisesFromVideos(videos){
    if(!videos || !videos.length) return;
    // respect admin choice: if auto-creation was disabled for this pathology, do nothing
    if(localStorage.getItem('no_auto_create_'+pathologyKey)) return;
    const all = readDefaults();
    const existing = all[pathologyKey] || [];
    if(existing.length > 0) return; // don't auto-create if admin already has exercises
    const now = Date.now();
    const created = videos.map((b, i) => {
      const vidId = b && b.id ? String(b.id) : ('v' + (now + i));
      const exId = pathologyKey + '-' + vidId;
      return {
        id: exId,
        name: b.name || ('Video ' + (i+1)),
        desc: b.notes || b.description || '',
        meta: '',
        icon: '🎬',
        mediaRef: { type: 'bundled', id: b.id || null },
        mediaName: b.name || ''
      };
    });
    all[pathologyKey] = created;
    writeDefaults(all);
    // auto-assign each created exercise to all active therapists
    try{
      const therapists = loadTherapists() || [];
      const active = therapists.filter(t => t && (t.active === true || t.activo === true));
      let assignCount = 0;
      if(active.length){
        created.forEach(ex => {
          active.forEach(t => {
            // reuse assign function but suppress individual toasts
            assignExerciseToTherapist(ex.id, t.id || t.email || t.name || null, null, null, true);
            assignCount++;
          });
        });
      }
      showToast('Se crearon ejercicios desde los videos. Asignados a '+(assignCount>0? assignCount + ' combinaciones terapeuta/ejercicio':'0 terapeutas')+'.');
    }catch(e){
      // fallback: just notify creation
      showToast('Se crearon ejercicios predeterminados a partir de los videos de la carpeta.');
    }
    renderExercises();
  }

  // small in-memory preview store for session-only object URLs
  window.__exerciseMedia = window.__exerciseMedia || {};

  // ----- IndexedDB helper for storing larger user videos -----
  const IDB_NAME = 'integradora-media';
  const IDB_STORE = 'user_videos';

  function openIdb(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function(e){
        const db = e.target.result;
        if(!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
      req.onsuccess = function(e){ resolve(e.target.result) }
      req.onerror = function(e){ reject(e.target.error) }
    })
  }

  function idbPutVideo(meta, blob){
    return openIdb().then(db=>{
      return new Promise((resolve, reject)=>{
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(Object.assign({}, meta, { blob }));
        tx.oncomplete = ()=>{ db.close(); resolve(true) };
        tx.onerror = (e)=>{ db.close(); reject(e) };
      })
    })
  }

  function idbGetVideo(id){
    return openIdb().then(db=>{
      return new Promise((resolve,reject)=>{
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(id);
        req.onsuccess = ()=>{ db.close(); resolve(req.result && req.result.blob ? req.result.blob : null) };
        req.onerror = (e)=>{ db.close(); reject(e) };
      })
    })
  }

  function idbGetAll(){
    return openIdb().then(db=>{
      return new Promise((resolve,reject)=>{
        const tx = db.transaction(IDB_STORE,'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.getAll();
        req.onsuccess = ()=>{ db.close(); resolve(req.result || []) };
        req.onerror = (e)=>{ db.close(); reject(e) };
      })
    })
  }

  // user videos metadata in localStorage
  const LS_USER_VIDEOS = 'user_videos_meta'; // array of {id,name,size,created,storedIn:'local'|'idb',dataUrl?}
  function readUserVideosMeta(){ try{ return JSON.parse(localStorage.getItem(LS_USER_VIDEOS) || '[]') }catch(e){ return [] } }
  function writeUserVideosMeta(arr){ localStorage.setItem(LS_USER_VIDEOS, JSON.stringify(arr)) }

  async function addUserVideo(file){
    const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2,8);
    const meta = { id, name: file.name, size: file.size, created: new Date().toISOString() };
    if(file.size <= 500000){ // small - store as dataURL
      const rd = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file) });
      meta.storedIn = 'local'; meta.dataUrl = rd;
  const list = readUserVideosMeta(); list.unshift(meta); writeUserVideosMeta(list);
  renderUserVideos();
      showToast('Video subido y guardado (persistente, pequeño).');
      return meta;
    } else {
      // store blob in IndexedDB
      try{
        meta.storedIn = 'idb';
        await idbPutVideo(meta, file);
  const list = readUserVideosMeta(); list.unshift(meta); writeUserVideosMeta(list);
  renderUserVideos();
        showToast('Video subido y guardado (IndexedDB).');
        return meta;
      }catch(e){
        // fallback: create object URL (session only)
        const url = URL.createObjectURL(file);
        meta.storedIn = 'session'; meta.sessionUrl = url;
  const list = readUserVideosMeta(); list.unshift(meta); writeUserVideosMeta(list);
  renderUserVideos();
        showToast('Video subido (no persistirá si IndexedDB no está disponible).');
        return meta;
      }
    }
  }

  // bundled videos shipped with the app (manifest in /videos/manifest.json)
  let bundledVideosCache = null;
  async function loadBundledVideos(){
    if(bundledVideosCache) return bundledVideosCache;
    // helper to try fetching a manifest and return array or empty
    async function tryFetchManifest(url){
      try{
        const resp = await fetch(url, { cache: 'no-store' });
        if(!resp.ok) return [];
        const json = await resp.json(); return Array.isArray(json)? json : [];
      }catch(e){ return [] }
    }

    const collected = [];
    // 1) try root manifest
    const root = await tryFetchManifest('videos/manifest.json'); if(root && root.length) collected.push(...root);

    // 2) try manifests inside pathology-named folders (tolerant variants)
    const patTitleLocal = (titleMap[pathologyKey] || (pathologyKey ? (pathologyKey.charAt(0).toUpperCase()+pathologyKey.slice(1)) : '') );
    function slugify(s){ try{ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }catch(e){ return String(s||'').toLowerCase().replace(/\s+/g,'-') } }
    const candidates = [];
    if(patTitleLocal) candidates.push(patTitleLocal);
    const slug = slugify(patTitleLocal); if(slug && !candidates.includes(slug)) candidates.push(slug);
    const enc = encodeURIComponent(patTitleLocal); if(enc && !candidates.includes(enc)) candidates.push(enc);

    for(const cand of candidates){
      // try videos/<cand>/manifest.json - ensure folder segment is URL-encoded to handle spaces and special chars
      const safeFolder = encodeURIComponent(cand);
      const url = 'videos/' + safeFolder + '/manifest.json';
      const arr = await tryFetchManifest(url);
      if(arr && arr.length) collected.push(...arr);
    }

    // deduplicate by id+path
    const seen = new Map();
    for(const it of collected){
      if(!it) continue;
      const key = (it.id||'') + '|' + (it.path||'');
      if(!seen.has(key)) seen.set(key, it);
    }
    bundledVideosCache = Array.from(seen.values());
    return bundledVideosCache;
  }

  // render bundled videos as cards in the UI
  function renderBundledVideos(){
    const container = qs('#bundledVideosList'); if(!container) return;
    container.innerHTML = '';
    loadBundledVideos().then(list=>{
      if(!list || !list.length){ container.innerHTML = '<div class="bundled-empty">No hay videos empaquetados.</div>'; return; }
      // filter bundled videos strictly by path (carpeta):
      // we only show videos whose `path` contains the pathology title (tolerant variants).
      // This implements "por carpeta" behavior: place videos inside folders named like the pathology title
      // (e.g. "Escoliosis lumbar") and they will be shown for that pathology page.
      const patTitle = (titleMap[pathologyKey] || (pathologyKey ? (pathologyKey.charAt(0).toUpperCase()+pathologyKey.slice(1)) : '') );
      function slugify(s){ try{ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }catch(e){ return String(s||'').toLowerCase().replace(/\s+/g,'-') } }
      const slugTitle = slugify(patTitle);
      const encodedTitle = encodeURIComponent(patTitle).toLowerCase();
  let listToShow = list;
      try{
        if(pathologyKey){
          listToShow = list.filter(v => {
            if(!v) return false;
            const p = String(v.path || '').toLowerCase();
            if(!p) return false;
            // check raw key, human title, slug and encoded variants inside the path
            if(p.includes(pathologyKey.toLowerCase())) return true;
            if(p.includes(patTitle.toLowerCase())) return true;
            if(p.includes(slugTitle)) return true;
            if(p.includes(encodedTitle)) return true;
            return false;
          });
        }
      }catch(e){ listToShow = list }

  // if no videos match the pathology folder, show a clear empty state
  if(!listToShow || listToShow.length === 0){ container.innerHTML = '<div class="bundled-empty">No hay videos en la carpeta para esta patología.</div>'; return; }

  // ensure default exercises exist for videos and auto-assign them to therapists
  try{ ensureDefaultExercisesFromVideos(listToShow); }catch(e){ /* ignore */ }
      // Always render videos as cards (grid), even if only one exists — this keeps UI consistent across patologías
      listToShow.forEach(b=>{
        const card = document.createElement('div'); card.className='bundled-video-card';
        card.dataset.videoId = b.id || '';
        card.dataset.videoName = b.name || '';
        const vid = document.createElement('video'); vid.controls = true; vid.src = b.path; vid.preload='metadata';
        // fallback for missing files
        vid.onerror = function(){
          const placeholder = document.createElement('div'); placeholder.style.display='flex'; placeholder.style.alignItems='center'; placeholder.style.justifyContent='center'; placeholder.style.height='160px'; placeholder.style.background='#f3f4f6'; placeholder.style.color='#9ca3af'; placeholder.textContent = 'Video no encontrado';
          vid.replaceWith(placeholder);
        };
        const title = document.createElement('div'); title.className='bundled-video-title'; title.textContent = b.name || b.id;
        const desc = document.createElement('div'); desc.className='bundled-video-desc'; desc.textContent = b.notes || '';
        const metaRow = document.createElement('div'); metaRow.style.display='flex'; metaRow.style.justifyContent='space-between'; metaRow.style.alignItems='center';
        const badge = document.createElement('div'); badge.className='bundled-badge'; badge.textContent='Video';
        metaRow.appendChild(badge);
        card.appendChild(vid); card.appendChild(title); card.appendChild(desc); card.appendChild(metaRow);
        // make card selectable: clicking autocompleta el nombre del ejercicio y guarda la referencia al media
        card.style.cursor = 'pointer';
        card.addEventListener('click', ()=>{
          try{
            const nameInput = qs('#exName'); const mediaIdInput = qs('#exMediaRefId'); const mediaTypeInput = qs('#exMediaRefType');
            if(nameInput) nameInput.value = b.name || nameInput.value || '';
            // fill description with video notes if the description field is empty
            const descInput = qs('#exDesc');
            if(descInput && (!descInput.value || descInput.value.trim() === '') && (b.notes || b.description)){
              descInput.value = b.notes || b.description || '';
            }
            if(mediaIdInput) mediaIdInput.value = b.id || '';
            if(mediaTypeInput) mediaTypeInput.value = 'bundled';
            // visual feedback: mark selected card
            const prev = container.querySelector('.bundled-video-card.selected'); if(prev) prev.classList.remove('selected');
            card.classList.add('selected');
            showToast('Video seleccionado: '+(b.name||b.id));
          }catch(e){/* ignore */}
        });
        container.appendChild(card);
      })
    }).catch(()=>{/* ignore */})
  }

  // render user videos gallery
  function renderUserVideos(){
    if(!userVideosList) return;
    userVideosList.innerHTML = '';
    // show bundled videos first (read from manifest)
    loadBundledVideos().then(bundled=>{
      bundled.forEach(b=>{
        const wrap = document.createElement('div'); wrap.className='user-video-item bundled';
        const title = document.createElement('div'); title.className='uv-title'; title.textContent = b.name + ' (paquete)';
        const holder = document.createElement('div'); holder.className='uv-holder';
        const vid = document.createElement('video'); vid.controls = true; vid.width = 200;
        // try to set src - if file isn't present the player will show error in browser console
        vid.src = b.path;
        holder.appendChild(vid);
        wrap.appendChild(title); wrap.appendChild(holder);
        userVideosList.appendChild(wrap);
      })
    }).catch(()=>{});

    const metas = readUserVideosMeta();
    if(!metas.length){
      // if no user metas and no bundled videos, show hint; otherwise keep bundled listing
      loadBundledVideos().then(b=>{ if(!b || b.length===0) userVideosList.innerHTML = '<p style="color:#6b7280">Aún no subes videos.</p>'; })
    }
    metas.forEach(m=>{
      const wrap = document.createElement('div'); wrap.className='user-video-item';
      const title = document.createElement('div'); title.className='uv-title'; title.textContent = m.name;
      const holder = document.createElement('div'); holder.className='uv-holder';
      const vid = document.createElement('video'); vid.controls = true; vid.width = 200;
      if(m.storedIn==='local' && m.dataUrl){ vid.src = m.dataUrl; holder.appendChild(vid); }
      else if(m.storedIn==='session' && m.sessionUrl){ vid.src = m.sessionUrl; holder.appendChild(vid); }
      else if(m.storedIn==='idb'){
        // async load blob then set src
        idbGetVideo(m.id).then(blob=>{ if(blob){ vid.src = URL.createObjectURL(blob) } else { const note = document.createElement('div'); note.textContent='(no disponible)'; holder.appendChild(note) } }).catch(()=>{ const note = document.createElement('div'); note.textContent='(error al cargar)'; holder.appendChild(note) })
        holder.appendChild(vid);
      }
      const del = document.createElement('button'); del.className='btn btn-small'; del.textContent='Eliminar';
      del.onclick = ()=>{ if(!confirm('Eliminar video de tu galería?')) return; removeUserVideo(m.id) };
      wrap.appendChild(title); wrap.appendChild(holder); wrap.appendChild(del);
      userVideosList.appendChild(wrap);
    })
  }

  async function removeUserVideo(id){
    const metas = readUserVideosMeta(); const m = metas.find(x=>x.id===id); if(!m) return;
    if(m.storedIn==='idb'){
      try{
        const db = await openIdb(); const tx = db.transaction(IDB_STORE,'readwrite'); const store = tx.objectStore(IDB_STORE); store.delete(id);
        // wait
        await new Promise((res,rej)=>{ tx.oncomplete=res; tx.onerror=rej }); db.close();
      }catch(e){ console.warn('Error removing from idb',e) }
    }
    const newList = metas.filter(x=>x.id!==id); writeUserVideosMeta(newList); renderUserVideos(); showToast('Video eliminado');
  }

  


  function deleteExercise(id){
    const all = readDefaults(); const list = all[pathologyKey]||[]; const newList = list.filter(x=>x.id!==id); all[pathologyKey]=newList; writeDefaults(all);
    // if admin removed the last exercise for this pathology, block future auto-creation so deleted items don't reappear
    if(newList.length === 0){
      try{ localStorage.setItem('no_auto_create_'+pathologyKey, '1'); showToast('Auto-creación deshabilitada para esta patología.'); }catch(e){}
    }
    renderExercises();
  }

  function assignExerciseToTherapist(exId, therapistId, patientId, assignmentWeek, suppressToast){
    const assigned = readAssigned();
    assigned.unshift({ id: Date.now().toString(), exerciseId: exId, pathology: pathologyKey, therapistId, patientId: patientId||null, assignmentWeek: assignmentWeek ? String(assignmentWeek).trim() : null, at: new Date().toISOString() });
    writeAssigned(assigned);
    // attempt to persist assignment to backend when a patient is specified
    (async ()=>{
      try{
        const token = localStorage.getItem('token');
        if(token && patientId){
          // call admin endpoint to add exercise to patient
          const res = await fetch('/api/admin/pacientes/'+encodeURIComponent(patientId)+'/asignar-ejercicio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ exerciseId: exId })
          });
          if(!res.ok){ const d = await res.json().catch(()=>({})); console.warn('No se pudo asignar ejercicio en servidor:', d); }
        }
      }catch(e){ console.warn('Error al persistir asignación:', e) }
    })();
    // simple feedback
    if(!suppressToast) showToast('Ejercicio asignado al terapeuta.');
  }

  function showToast(msg){
    const t = document.createElement('div'); t.textContent=msg; t.style.position='fixed'; t.style.right='20px'; t.style.bottom='20px'; t.style.padding='10px 14px'; t.style.background='#1e5fe3'; t.style.color='#fff'; t.style.borderRadius='8px'; t.style.boxShadow='0 8px 24px rgba(30,95,227,0.18)'; document.body.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),300) },1400);
  }

  // Mostrar mensajes inline en el formulario (fallback a toast si no existe contenedor)
  function showFormMessage(msg, type='error', duration=3500){
    try{
      const el = qs('#formMessage');
      if(!el){ showToast(msg); return; }
      el.textContent = msg;
      el.className = 'form-message ' + (type === 'success' ? 'success show' : 'error show');
      el.removeAttribute('hidden');
      // auto hide
      setTimeout(()=>{ try{ el.classList.remove('show'); el.setAttribute('hidden',''); }catch(e){} }, duration);
    }catch(e){ showToast(msg); }
  }

  // form handling
  let editingId = null;
  function populateFormForEdit(id){
    const all = readDefaults(); const list = all[pathologyKey] || []; const ex = list.find(x=>x.id===id); if(!ex) return;
    qs('#exName').value = ex.name || '';
    qs('#exDesc').value = ex.desc || '';
    qs('#exMeta').value = ex.meta || '';
    // restore mediaRef hidden fields if present
    try{
      if(ex.mediaRef){ qs('#exMediaRefId').value = ex.mediaRef.id || ''; qs('#exMediaRefType').value = ex.mediaRef.type || ''; }
      else { qs('#exMediaRefId').value=''; qs('#exMediaRefType').value=''; }
      // mark selected bundled video in UI if visible
      const container = qs('#bundledVideosList'); if(container && ex.mediaRef && ex.mediaRef.type==='bundled'){
        const prev = container.querySelector('.bundled-video-card.selected'); if(prev) prev.classList.remove('selected');
        const card = container.querySelector('.bundled-video-card[data-video-id="'+ex.mediaRef.id+'"]'); if(card) card.classList.add('selected');
      }
    }catch(e){}
    editingId = ex.id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

    // Expose submit handler so a fallback binder can invoke it if needed
    window.patologiaHandleSubmit = function(e){
      if(e && e.preventDefault) e.preventDefault();
      let name = qs('#exName').value.trim();
      // if name is empty, try to use selected bundled video name as fallback
      if(!name){
        const selCard = qs('#bundledVideosList .bundled-video-card.selected');
        if(selCard && selCard.dataset && selCard.dataset.videoName){ name = selCard.dataset.videoName.trim(); if(name) qs('#exName').value = name; }
      }
      if(!name){ showFormMessage('Nombre requerido', 'error'); return; }
      const desc = qs('#exDesc').value.trim();
      const meta = qs('#exMeta').value.trim();
      const assignTherapist = qs('#exAssignTherapist')?.value || '';
      const assignPatient = qs('#exAssignPatient')?.value || '';
      const assignWeek = qs('#exAssignWeek')?.value.trim() || null;
      const id = editingId || Date.now().toString();
      const exObj = { id, name, desc, meta, icon: '⚙️', media: null, mediaName: null };
      // attach mediaRef if a bundled/user video was selected via the form
      try{
        const mediaId = qs('#exMediaRefId')?.value || '';
        const mediaType = qs('#exMediaRefType')?.value || '';
        if(mediaId){ exObj.mediaRef = { type: mediaType || 'bundled', id: mediaId }; exObj.mediaName = name; }
      }catch(e){/* ignore */}
      // No video selection here; exercises reference packaged videos elsewhere
      saveExerciseObj(exObj);
      // if admin selected a therapist or a patient in the form, create an assignment immediately
      if(assignTherapist || assignPatient){ assignExerciseToTherapist(id, assignTherapist || null, assignPatient || null, assignWeek) }
      // Reset most fields but KEEP therapist/patient selections so admin can assign multiple
      const keepTher = qs('#exAssignTherapist')?.value || '';
      const keepPat = qs('#exAssignPatient')?.value || '';
      const keepWeek = qs('#exAssignWeek')?.value || '';
      form.reset();
      if(qs('#exAssignTherapist')) qs('#exAssignTherapist').value = keepTher;
      if(qs('#exAssignPatient')) qs('#exAssignPatient').value = keepPat;
      if(qs('#exAssignWeek')) qs('#exAssignWeek').value = keepWeek;
      editingId = null; showToast('Ejercicio guardado');
    };
    if(form) form.addEventListener('submit', window.patologiaHandleSubmit);

  if(resetBtn){
    resetBtn.addEventListener('click', ()=>{ try{ if(form) form.reset(); editingId=null }catch(e){ console.error('Error en Reset:', e) } })
  }

  // "Asignar ahora" button: guarda el ejercicio actual y lo asigna inmediatamente
  const assignNowBtn = qs('#assignNowBtn');
  if(assignNowBtn){
    // expose assign handler for diagnostics/fallback
    window.patologiaAssignNow = function(){
      const therapist = qs('#exAssignTherapist')?.value || '';
      const patient = qs('#exAssignPatient')?.value || '';
      const assignWeek = qs('#exAssignWeek')?.value.trim() || null;
      // require at least a therapist or a patient (not necessarily both)
      if(!therapist && !patient){ showFormMessage('Por favor selecciona al menos un terapeuta o un paciente para asignar', 'error'); return }
      let name = qs('#exName').value.trim();
      // fallback to selected bundled video name if name blank
      if(!name){ const selCard = qs('#bundledVideosList .bundled-video-card.selected'); if(selCard && selCard.dataset && selCard.dataset.videoName){ name = selCard.dataset.videoName.trim(); if(name) qs('#exName').value = name; } }
      if(!name){ showFormMessage('Nombre requerido', 'error'); return }
      const desc = qs('#exDesc').value.trim();
      const meta = qs('#exMeta')?.value.trim();
      const id = editingId || Date.now().toString();
      const exObj = { id, name, desc, meta, icon: '⚙️', media: null, mediaName: null };
      try{
        const mediaId = qs('#exMediaRefId')?.value || '';
        const mediaType = qs('#exMediaRefType')?.value || '';
        if(mediaId){ exObj.mediaRef = { type: mediaType || 'bundled', id: mediaId }; exObj.mediaName = name; }
      }catch(e){}
      // save exercise and assign (therapist or patient may be null)
      saveExerciseObj(exObj);
      assignExerciseToTherapist(id, therapist || null, patient || null, assignWeek);
      showToast('Ejercicio guardado y asignado');
      // clear only the form fields that describe the exercise but KEEP therapist/patient selections
      qs('#exName').value = '';
      qs('#exDesc').value = '';
      try{ qs('#exMeta').value = ''; }catch(e){}
      try{ qs('#exMediaRefId').value=''; qs('#exMediaRefType').value=''; }catch(e){}
      editingId = null;
      // remove any selected highlight on bundled videos
      try{ const prev = qs('#bundledVideosList .bundled-video-card.selected'); if(prev) prev.classList.remove('selected'); }catch(e){}
    };
    assignNowBtn.addEventListener('click', window.patologiaAssignNow);
  }

  // populate therapist select in form
  function populateFormTherapistSelect(){
    const sel = qs('#exAssignTherapist');
    if(!sel) return;
    sel.innerHTML = '';
    const opt = document.createElement('option'); opt.value=''; opt.textContent='(Seleccionar terapeuta, opcional)'; sel.appendChild(opt);
    const all = loadTherapists() || [];
    try{ console.debug('[patologia] therapists loaded:', all.length, all); }catch(e){}
    if(all.length === 0){
      const hint = document.createElement('option'); hint.value = ''; hint.textContent = '(No hay terapeutas registrados)'; hint.disabled = true; hint.selected = true; sel.appendChild(hint);
      return;
    }
    // Show all therapists normally (do not mark as inactive)
    all.forEach(t => {
      const o = document.createElement('option');
      o.value = t.id || t.email || t.name;
      o.textContent = t.name || t.email || t.id;
      sel.appendChild(o);
    });
  }

  // keep therapist select in sync when therapists are added/updated elsewhere
  function initTherapistSync(){
    // custom event dispatched by alta-terapeuta when a therapist is added
    window.addEventListener('therapists:updated', function(ev){
      try{ populateFormTherapistSelect(); }catch(e){}
    });
    // storage event for other tabs/windows
    window.addEventListener('storage', function(e){
      if(!e) return; if(e.key === 'therapists') populateFormTherapistSelect();
    });
  }

  // populate patient select used by bulk assign
  function populateBulkPatientSelect(){
    const sel = qs('#bulkPatientSelect');
    if(!sel) return;
  sel.innerHTML = '';
    // load patients from therapist_patients (flat array or map)
    const raw = JSON.parse(localStorage.getItem('therapist_patients')||'[]');
    let patients = [];
    if(Array.isArray(raw)) patients = raw;
    else if(raw && typeof raw==='object'){
      // flatten
      Object.keys(raw).forEach(k=>{ const arr = raw[k]||[]; patients = patients.concat(arr) });
    }
    // filter by diagnosis matching current pathology, then deduplicate by id
    function normalize(str){ try { return String(str||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){ return String(str||'').toLowerCase(); } }
    const desiredDiagnosis = normalize(titleMap[pathologyKey] || pathologyKey || '');
    const seen = new Set();
    patients.forEach(p=>{
      const id = p.id||p.email||p.name;
      const pd = normalize(p.diagnosis || '');
      if(pd !== desiredDiagnosis) return; // skip patients of other patologías
      if(!seen.has(id)){
        seen.add(id);
        const o=document.createElement('option'); o.value=id; o.textContent=p.name||p.email||id; sel.appendChild(o);
      }
    });
  }

  // handle bulk assignment action
  function setupBulkAssign(){
    const btn = qs('#bulkAssignBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      const sel = qs('#bulkPatientSelect'); if(!sel) return alert('Selecciona un paciente');
      const patientId = sel.value; if(!patientId) return alert('Selecciona un paciente para asignar');
      // gather checked exercise ids
      const checked = Array.from(document.querySelectorAll('.ex-select:checked')).map(ch=>ch.dataset.exId).filter(Boolean);
      if(!checked.length) return alert('Selecciona al menos un ejercicio');
      checked.forEach(eid=>{ assignExerciseToTherapist(eid, null, patientId, null, true) });
      showToast('Ejercicios asignados al paciente');
    })
  }

  // when therapist select changes, populate patient select
  const formTherSel = qs('#exAssignTherapist');
  const formPatSel = qs('#exAssignPatient');
  if(formTherSel && formPatSel){
    formTherSel.addEventListener('change', ()=>{
      const patients = loadPatientsForTherapist(formTherSel.value);
      formPatSel.innerHTML = '';
      if(!patients || patients.length===0){
        const noOpt = document.createElement('option'); noOpt.value=''; noOpt.textContent='(Sin pacientes disponibles)'; noOpt.disabled = true; noOpt.selected = true; formPatSel.appendChild(noOpt);
      } else {
        const def = document.createElement('option'); def.value=''; def.textContent='(Paciente opcional)'; formPatSel.appendChild(def);
        patients.forEach(pa=>{ const opt=document.createElement('option'); opt.value=pa.id||pa.email||pa.name; opt.textContent=pa.name||pa.email||pa.id; formPatSel.appendChild(opt) });
      }
    });
  }

  // initial render (wrapped to avoid stop-on-error)
  try{
    renderExercises();
    populateFormTherapistSelect();
    initTherapistSync();
    renderBundledVideos();
    // populate bulk patient selector and wire bulk assign
    populateBulkPatientSelect();
    setupBulkAssign();
  }catch(e){
    console.error('Error inicializando patología:', e);
  }
  // no uploader for user videos — only bundled package videos are available

  // expose helpers for debugging
  window.__exercises = { readDefaults, readAssigned, renderExercises };

  // Multi-assign UI removed — functionality no longer needed

})();
