(function(){
  function safeParse(v){ try{ return JSON.parse(v||'null'); }catch(e){ return null; } }
  function applyProfile(u){
    if(!u) return;
    try{
      const name = u.name || u.nombre || u.email || '';
      const email = u.email || u.mail || u.correo || '';
      const photo = u.photo || u.foto || '';
      const nameEls = document.querySelectorAll('#therapistName');
      const emailEls = document.querySelectorAll('#therapistEmail');
      const photoEls = document.querySelectorAll('#therapistPhoto');
      nameEls.forEach(el => el.textContent = name);
      emailEls.forEach(el => el.textContent = email);
      photoEls.forEach(el => { if(photo) el.setAttribute('src', photo); else el.style.display = photo ? '' : 'none'; });
      console.debug('[therapist-manager] applied profile', { name: name, email: email, photo: photo });
    }catch(e){ console.warn('therapist-manager apply failed', e); }
  }

  function loadLocal(){
    let u = null;
    try{ if(window.localStore && typeof window.localStore.getCurrentTherapist === 'function') u = window.localStore.getCurrentTherapist(); }catch(e){}
    try{ if(!u) u = safeParse(sessionStorage.getItem('currentUser_therapist')||'null'); }catch(e){}
    try{ if(!u) u = safeParse(localStorage.getItem('currentUser_therapist')||'null'); }catch(e){}
    // apply persisted profile (localStore or localStorage)
    applyProfile(u);
    // Expose helpful globals for therapist pages to read assigned data
    window.__therapistManager = window.__therapistManager || {};
    window.__therapistManager.loadLocal = loadLocal;
    window.__therapistManager.current = u || null;
    // expose a normalized current user global used across pages
    window.__currentUser = u || null;

    // patients stored under 'therapist_patients'
    function normalizeTherapistPatients(raw){
      if(!raw) return [];
      if(Array.isArray(raw)) return raw.slice();
      if(typeof raw !== 'object') return [];
      const acc = [];
      Object.keys(raw).forEach(tid => {
        (raw[tid]||[]).forEach(p => {
          const patient = Object.assign({}, p);
          if(!patient.assignedTherapist) patient.assignedTherapist = tid;
          acc.push(patient);
        });
      });
      return acc;
    }
    try{
      const storageValue = (window.localStore && typeof window.localStore.getPatients === 'function') ? window.localStore.getPatients() : JSON.parse(localStorage.getItem('therapist_patients')||'[]');
      window.__therapistPatients = normalizeTherapistPatients(storageValue);
    }catch(e){ window.__therapistPatients = []; }
    try{ window.dispatchEvent(new CustomEvent('therapist-patients:loaded', { detail: Array.isArray(window.__therapistPatients) ? window.__therapistPatients.slice() : [] })); }catch(e){ }
    // assigned exercises mapping (array of assignments)
    try{ window.__assignedExercises = JSON.parse(localStorage.getItem('assigned_exercises')||'[]')||[]; }catch(e){ window.__assignedExercises = []; }
    // normalize assigned entries: if missing therapistId but patient has assignedTherapist, fill it
    try{
      if(Array.isArray(window.__assignedExercises) && Array.isArray(window.__therapistPatients)){
        const patientsById = Object.create(null);
        window.__therapistPatients.forEach(p=>{ if(p && (p.id||p.email)) patientsById[String(p.id||p.email)] = p; });
        window.__assignedExercises.forEach(a=>{
          if(!a) return;
          if(!a.therapistId){
            const pid = a.patientId || a.patient || '';
            const p = patientsById[String(pid)];
            if(p && (p.assignedTherapist || p.assigned)) a.therapistId = a.therapistId || (p.assignedTherapist || p.assigned);
          }
        });
      }
    }catch(e){ /* ignore normalization errors */ }
    // default exercises (if any)
    try{ window.__defaultExercises = JSON.parse(localStorage.getItem('default_exercises')||'{}')||{}; }catch(e){ window.__defaultExercises = {}; }
    // user-uploaded video metadata
    try{ window.__userVideosMeta = JSON.parse(localStorage.getItem('user_videos_meta')||'[]')||[]; }catch(e){ window.__userVideosMeta = []; }

    // helper functions for pages
    window.__therapistManager.getCurrent = function(){ return window.__currentUser; };
    window.__therapistManager.getAssignedExercises = function(){
      const cur = window.__currentUser; if(!cur) return [];
      const id = cur.id || cur._id || null; if(!id) return [];
      return (Array.isArray(window.__assignedExercises) ? window.__assignedExercises : []).filter(a => String(a.therapistId || a.assignedTo || '') === String(id));
    };
    window.__therapistManager.getAssignedPatients = function(){
      const cur = window.__currentUser; if(!cur) return [];
      const id = cur.id || cur._id || null; if(!id) return [];
      // Patients have field assignedTherapist linking them
      return (Array.isArray(window.__therapistPatients) ? window.__therapistPatients : []).filter(p => String(p.assignedTherapist||'') === String(id));
    };
    try{ window.dispatchEvent(new CustomEvent('therapist-manager:loaded', { detail: { currentUser: window.__currentUser } })); }catch(e){}
  }

  // listen to events to refresh profile
  window.addEventListener('storage', function(){ loadLocal(); });
  window.addEventListener('therapists:updated', function(){ loadLocal(); });

  // run on DOM ready
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadLocal);
  else loadLocal();
})();
