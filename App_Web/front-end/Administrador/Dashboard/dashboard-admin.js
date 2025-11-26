// Minimal dashboard-admin.js to avoid 404 and wire up profile once DOM is ready
// It relies on admin-manager.js for actual profile logic; here we ensure admin-manager is loaded and invoke helper
(function(){
  function safeParse(v){ try{ return JSON.parse(v||'null'); }catch(e){ return null; } }
  function readArray(key){ try{ const v = JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
  function getTherapists(){ if(window.localStore && typeof window.localStore.getTherapists === 'function') return window.localStore.getTherapists() || []; return readArray('therapists'); }
  function getPatients(){ if(window.localStore && typeof window.localStore.getPatients === 'function') return window.localStore.getPatients() || []; return readArray('therapist_patients'); }
  function updateCounts(){
    const therapistEl = document.getElementById('therapistsCount');
    const patientEl = document.getElementById('patientsCount');
    if(therapistEl){ therapistEl.textContent = String(getTherapists().length || 0); }
    if(patientEl){ patientEl.textContent = String(getPatients().length || 0); }
  }

  function applyProfile(){
    try{
      if(window.__adminManager && typeof window.__adminManager.loadLocalProfile === 'function'){
        window.__adminManager.loadLocalProfile();
        return;
      }
      const cur = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser_admin') || localStorage.getItem('currentUser');
      const user = safeParse(cur);
      if(!user) return;
      const nameEl = document.getElementById('adminName');
      const emailEl = document.getElementById('adminEmail');
      const photoEl = document.getElementById('adminPhoto');
      if(nameEl) nameEl.textContent = user.name || user.fullname || user.email || 'Administrador';
      if(emailEl && (user.email || user.mail || user.correo)) emailEl.textContent = user.email || user.mail || user.correo;
      if(photoEl){ const src = user.photo || user.photoUrl || user.avatar || ''; if(src) photoEl.src = src; }
    }catch(e){ console.warn('dashboard-admin helper failed', e); }
  }

  function initDashboard(){
    applyProfile();
    updateCounts();
  }

  function onDomReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onDomReady(initDashboard);

  window.addEventListener('storage', function(){ updateCounts(); });
  window.addEventListener('therapists:updated', function(){ updateCounts(); });
  window.addEventListener('patients:updated', function(){ updateCounts(); });
})();
