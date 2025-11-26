// Admin view: mostrar perfil de paciente y ejercicios asignados
(function(){
  function qs(sel){ return document.querySelector(sel) }
  const params = new URLSearchParams(window.location.search);
  const pid = params.get('id') || params.get('patient') || params.get('name');

  function readPatients(){ try{ return JSON.parse(localStorage.getItem('therapist_patients')||'[]') }catch(e){ return [] } }
  function readTherapists(){ try{ return JSON.parse(localStorage.getItem('therapists')||'[]') }catch(e){ return [] } }
  function readAssigned(){ try{ return JSON.parse(localStorage.getItem('assigned_exercises')||'[]') }catch(e){ return [] } }
  function readDefaults(){ try{ return JSON.parse(localStorage.getItem('default_exercises')||'{}') }catch(e){ return {} } }
  function readUserVideosMeta(){ try{ return JSON.parse(localStorage.getItem('user_videos_meta')||'[]') }catch(e){ return [] } }

  // Minimal IndexedDB helper for reading stored blobs (used for user videos stored in idb)
  const IDB_NAME = 'integradora-media';
  const IDB_STORE = 'user_videos';
  function openIdb(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = e=>{ const db = e.target.result; if(!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'id' }); }
      req.onsuccess = e=> resolve(e.target.result);
      req.onerror = e=> reject(e.target.error);
    })
  }
  function idbGetVideo(id){
    return openIdb().then(db=>{
      return new Promise((resolve,reject)=>{
        const tx = db.transaction(IDB_STORE,'readonly'); const store = tx.objectStore(IDB_STORE); const r = store.get(id);
        r.onsuccess = ()=>{ db.close(); resolve(r.result && r.result.blob ? r.result.blob : null) };
        r.onerror = e=>{ db.close(); reject(e) };
      })
    })
  }

  // load bundled manifests (reused logic similar to patologia.js)
  let bundledCache = null;
  async function tryFetchManifest(url){ try{ console.debug('[ver_perfil] tryFetchManifest', url); const resp = await fetch(url,{cache:'no-store'}); if(!resp.ok){ console.debug('[ver_perfil] manifest not found', url, resp.status); return []; } const j = await resp.json(); console.debug('[ver_perfil] manifest loaded', url, (Array.isArray(j)? j.length : 0)); return Array.isArray(j)? j : []; }catch(e){ console.debug('[ver_perfil] manifest fetch error', url, e); return [] } }

  // Try multiple folder-name variants (key, human title, slug, encoded) similar to patologia.js
  const titleMap = {
    'espondilolisis': 'Espondilólisis',
    'escoliosis': 'Escoliosis lumbar',
    'hernia': 'Hernia de disco lumbar',
    'lumbalgia': 'Lumbalgia mecánica inespecífica'
  };

  function slugify(s){ try{ return String(s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }catch(e){ return String(s||'').toLowerCase().replace(/\s+/g,'-') } }

  async function loadBundledVideos(){
    if(bundledCache) return bundledCache;
    const collected = [];
    // try a root manifest under Ejercicios/videos
    const root = await tryFetchManifest('../Ejercicios/videos/manifest.json'); if(root && root.length) collected.push(...root);

    try{
      const defs = readDefaults();
      // gather candidate keys: include keys from defaults and also a few common pathology keys
      const keys = new Set(Object.keys(defs||[]).slice(0,12));
      ['escoliosis','hernia','lumbalgia','espondilolisis'].forEach(k=>keys.add(k));
      for(const k of keys){
        const human = titleMap[k] || (k ? k.replace(/[_-]/g,' ') : k);
        const slug = slugify(human || k);
        const candidates = [k, human, slug, encodeURIComponent(human||k)];
        for(const cand of candidates){ if(!cand) continue; const safe = encodeURIComponent(cand); const urls = [
          '../Ejercicios/videos/'+safe+'/manifest.json',
          '../Ejercicios/videos/'+cand+'/manifest.json'
        ];
          for(const url of urls){ const arr = await tryFetchManifest(url); if(arr && arr.length) collected.push(...arr); }
        }
      }
    }catch(e){ console.debug('[ver_perfil] error while trying folder manifests', e) }

    // dedupe
    const seen = new Map(); for(const it of collected){ if(!it) continue; const key = (it.id||'')+'|'+(it.path||''); if(!seen.has(key)) seen.set(key,it); }
    bundledCache = Array.from(seen.values()); console.debug('[ver_perfil] bundled videos total', bundledCache.length); return bundledCache;
  }

  function findPatient(){
    const patients = readPatients();
    if(!patients || !patients.length) return null;
    let p = null;
    p = patients.find(x=> x.id && pid && String(x.id) === String(pid)); if(p) return p;
    p = patients.find(x=> x.name && pid && String(x.name) === String(pid));
    return p || patients[0];
  }

  function humanizePathology(k){ if(!k) return '—'; return String(k).replace(/[_-]/g,' ').replace(/\b\w/g, s=>s.toUpperCase()); }

  function writeAssigned(arr){ localStorage.setItem('assigned_exercises', JSON.stringify(arr)) }
  function deleteAssignment(assignmentId){
    const assigned = readAssigned();
    const newList = assigned.filter(a => a && a.id !== assignmentId);
    writeAssigned(newList);
    render(); // re-render the profile
  }
  window.deleteAssignment = deleteAssignment; // expose to onclick

  // Modal helpers for confirmation
  let pendingDeleteId = null;
  function showDeleteModal(assignmentId){
    pendingDeleteId = assignmentId;
    const modal = document.getElementById('deleteModal');
    if(modal) modal.classList.add('show');
  }
  function cancelDeleteAssignment(){
    pendingDeleteId = null;
    const modal = document.getElementById('deleteModal');
    if(modal) modal.classList.remove('show');
  }
  function confirmDeleteAssignment(){
    if(pendingDeleteId){
      deleteAssignment(pendingDeleteId);
      cancelDeleteAssignment();
    }
  }
  window.showDeleteModal = showDeleteModal;
  window.cancelDeleteAssignment = cancelDeleteAssignment;
  window.confirmDeleteAssignment = confirmDeleteAssignment;

  async function render(){
    const p = findPatient();
    if(!p){ qs('#profilePanel').innerHTML = '<div style="padding:18px;color:#64748b">Paciente no encontrado.</div>'; return }
    qs('#pfName').textContent = p.name || 'Paciente';
    // show assigned therapist if available
    const therapists = readTherapists();
    function getTherapistName(id){ if(!id) return '--'; const t = therapists.find(x=>x.id === id); return t? t.name : id }
    const therapistLabel = getTherapistName(p.assignedTherapist);
    qs('#pfMeta').textContent = `Edad: ${p.age||'--'} · Terapeuta: ${therapistLabel} · Tel: ${p.phone||'--'} · Estado: ${p.status||'--'}`;
    // show patient photo if available (dataURL or path)
    try{
      const avatarEl = qs('#pfAvatar');
      if(avatarEl){
        if(p.photo){ avatarEl.src = p.photo; }
        // if no photo saved, keep existing placeholder image in HTML
      }
    }catch(e){ console.debug('Error al asignar foto de paciente:', e); }

    const assigned = readAssigned(); const defaults = readDefaults();
    const matches = (assigned||[]).filter(a=>{
      if(!a) return false;
      if(a.patientId && p.id && String(a.patientId) === String(p.id)) return true;
      if(a.patientId && p.name && String(a.patientId) === String(p.name)) return true;
      return false;
    });

    const container = qs('#exercisesContainer'); container.innerHTML = '';
    if(!matches.length){ container.innerHTML = '<div style="color:#64748b;padding:12px">No hay ejercicios asignados a este paciente.</div>'; return }

    // preload bundled index
    const bundled = await loadBundledVideos().catch(()=>[]);

    // for each assignment, resolve exercise definition and render comprehensive card
    for(const a of matches){
      const list = defaults[a.pathology] || [];
      const ex = list.find(x=> x.id === a.exerciseId) || { name: a.exerciseId || 'Ejercicio', desc: '', meta: '' };
      const card = document.createElement('div'); card.className = 'ex-card';

      // build inner HTML with placeholders; we'll wire video srcs afterwards
      const title = ex.name || ex.title || 'Ejercicio';
      const shortDesc = ex.desc || ex.notes || '';
      const metaStr = ex.meta || ex.meta || '';
      const pathologyLabel = humanizePathology(a.pathology || ex._originPathology || '—');
      const weekLabel = a.assignmentWeek || a.weekLabel || a.week || '';

      card.innerHTML = `
        <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <div class="video-col" style="flex:0 0 320px">
            <div class="video-holder" style="background:#f8fafc;border-radius:8px;padding:6px;display:flex;align-items:center;justify-content:center;min-height:160px">
              <!-- video will be injected here -->
            </div>
          </div>
          <div style="flex:1;min-width:220px">
            <h4 style="margin:0 0 6px 0">${title}</h4>
            <div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span class="badge-path" style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">${pathologyLabel}</span>
            </div>
            <div style="margin-bottom:8px"><strong>Descripción:</strong> <div style="color:#475569;margin-top:4px">${shortDesc||'—'}</div></div>
            ${weekLabel ? `<div style="margin-top:8px;font-size:0.9rem;color:#475569">Semana: ${escapeHtml(weekLabel)}</div>` : ''}
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
              <small style="color:#94a3b8">Asignado: ${new Date(a.at||Date.now()).toLocaleString()}</small>
              <button class="btn btn-small" style="background:#ff6b6b;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:0.85rem;" onclick="showDeleteModal('${a.id}')">Eliminar</button>
            </div>
          </div>
        </div>
      `;

      // inject video element depending on media source
      const holder = card.querySelector('.video-holder');
      async function attachVideoFromExercise(e){
        try{
          if(e.media){ const v = document.createElement('video'); v.controls=true; v.src = e.media; v.style.maxWidth='100%'; v.style.borderRadius='6px'; console.debug('[ver_perfil] using direct media', e.media); holder.appendChild(v); return }
          if(e.mediaRef && e.mediaRef.type === 'bundled'){
            const vid = document.createElement('video'); vid.controls = true; vid.style.maxWidth='100%'; vid.style.borderRadius='6px'; holder.appendChild(vid);
            const found = bundled.find(b=> String(b.id) === String(e.mediaRef.id));
            if(found && found.path){
              // manifest paths are relative to the Ejercicios folder (e.g. "videos/Escoliosis lumbar/uno.mp4");
              // from this page we need to prefix ../Ejercicios/ so try that first and fall back to the raw path.
              try{
                const candidate = String(found.path||'');
                const c1 = candidate.startsWith('videos/') ? ('../Ejercicios/' + candidate) : candidate;
                console.debug('[ver_perfil] bundled found by id', found.id, 'trying', c1);
                vid.src = c1;
                return;
              }catch(e){ console.debug('[ver_perfil] error setting bundled src', e) }
            }
            // fallback: try searching by name
            const byName = bundled.find(b=> b.name && e.mediaName && String(b.name) === String(e.mediaName));
            if(byName){ const candidate = String(byName.path||''); const c1 = candidate.startsWith('videos/') ? ('../Ejercicios/' + candidate) : candidate; console.debug('[ver_perfil] bundled found by name', byName.name, 'trying', c1); vid.src = c1; }
            else { console.debug('[ver_perfil] no bundled match for mediaRef id/name', e.mediaRef && e.mediaRef.id, e.mediaName); }
            return
          }
          if(e.mediaRef && e.mediaRef.type === 'user'){
            const metas = readUserVideosMeta(); const m = metas.find(x=> String(x.id) === String(e.mediaRef.id));
            if(m){ if(m.storedIn==='local' && m.dataUrl){ const v=document.createElement('video'); v.controls=true; v.src=m.dataUrl; v.style.maxWidth='100%'; holder.appendChild(v); return }
              if(m.storedIn==='session' && m.sessionUrl){ const v=document.createElement('video'); v.controls=true; v.src=m.sessionUrl; v.style.maxWidth='100%'; holder.appendChild(v); return }
              if(m.storedIn==='idb'){ const v=document.createElement('video'); v.controls=true; v.style.maxWidth='100%'; holder.appendChild(v); try{ const blob = await idbGetVideo(m.id); if(blob){ v.src = URL.createObjectURL(blob); } }catch(e){ const note=document.createElement('div'); note.textContent='(error al cargar video)'; holder.appendChild(note) } return }
            }
          }
          // no media available
          const note = document.createElement('div'); note.style.color='#64748b'; note.textContent='(sin video disponible)'; holder.appendChild(note);
        }catch(err){ const note = document.createElement('div'); note.style.color='#64748b'; note.textContent='(error cargando media)'; holder.appendChild(note); }
      }

      // attach video
      await attachVideoFromExercise(ex);

      container.appendChild(card);
    }
  }

  document.addEventListener('DOMContentLoaded', render);
})();
