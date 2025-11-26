// local-store.js - admin-scoped helper for compatibility with existing script tags
// Mirrors the implementation in ../shared/local-store.js
(function(){
  // try to reuse top-level shared helper if present
  if(window.localStore) return;
  const KEY_ADMINS = 'admins';
  const KEY_REGISTERED_CLINICS = 'registeredClinics';
  const KEY_CURRENT_ADMIN = 'currentUser_admin';

  function readArray(key){ try{ const v = JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }

  const localStore = {
    getAdmins(){ return readArray(KEY_ADMINS); },
    getTherapists(){ try{ return JSON.parse(localStorage.getItem('therapists')||'[]')||[]; }catch(e){ return []; } },
    addTherapist(t){ if(!t || !t.email) throw new Error('therapist must have email'); try{ const arr = this.getTherapists(); const email = (t.email||'').toLowerCase(); const idx = arr.findIndex(x=> (x.email||'').toLowerCase()===email); if(idx>=0) arr[idx]=Object.assign({}, arr[idx], t); else arr.unshift(t); localStorage.setItem('therapists', JSON.stringify(arr)); try{ window.dispatchEvent(new Event('storage')); }catch(e){} try{ window.dispatchEvent(new Event('therapists:updated')); }catch(e){} return t; }catch(e){ console.warn('addTherapist failed', e); return null; } },
    getAdminByEmail(email){ if(!email) return null; const list = readArray(KEY_ADMINS); return list.find(a => (a.email||'').toLowerCase() === (email||'').toLowerCase()) || null; },
    saveAdmin(admin){
      if(!admin || !admin.email) throw new Error('admin must have email');
      const list = readArray(KEY_ADMINS).filter(Boolean);
      const email = (admin.email||'').toLowerCase();
      const existingIndex = list.findIndex(a => (a.email||'').toLowerCase() === email);
      if(existingIndex >= 0) list[existingIndex] = admin;
      else list.push(admin);
      localStorage.setItem(KEY_ADMINS, JSON.stringify(list));
      if(admin.clinic) { const norm = String(admin.clinic||'').trim().toLowerCase(); const regs = readArray(KEY_REGISTERED_CLINICS); if(regs.indexOf(norm)===-1){ regs.push(norm); localStorage.setItem(KEY_REGISTERED_CLINICS, JSON.stringify(regs)); } }
      return admin;
    },
    authenticate(email, password){ const a = this.getAdminByEmail(email); if(!a) return null; if(!password) return null; return (a.password === password) ? a : null; },
    isClinicRegistered(clinic){ if(!clinic) return false; const norm = String(clinic||'').trim().toLowerCase(); const regs = readArray(KEY_REGISTERED_CLINICS); return regs.indexOf(norm)!==-1; },
    registerClinic(clinic){ if(!clinic) return; const norm = String(clinic||'').trim().toLowerCase(); const regs = readArray(KEY_REGISTERED_CLINICS); if(regs.indexOf(norm)===-1){ regs.push(norm); localStorage.setItem(KEY_REGISTERED_CLINICS, JSON.stringify(regs)); } },
    getRegisteredClinics(){ return readArray(KEY_REGISTERED_CLINICS); },
    setCurrentUser(admin){ try{ if(!admin) { localStorage.removeItem(KEY_CURRENT_ADMIN); return; } localStorage.setItem(KEY_CURRENT_ADMIN, JSON.stringify(admin)); }catch(e){} },
    getCurrentUser(){ try{ return JSON.parse(localStorage.getItem(KEY_CURRENT_ADMIN)||'null'); }catch(e){ return null; } },
    getPatients(){ try{ return JSON.parse(localStorage.getItem('therapist_patients')||'[]')||[]; }catch(e){ return []; } },
    addPatient(p){ if(!p || !p.email) throw new Error('patient must have email'); try{ const arr = this.getPatients(); const email = (p.email||'').toLowerCase(); const idx = arr.findIndex(x=> (x.email||'').toLowerCase()===email); if(idx>=0) arr[idx]=Object.assign({}, arr[idx], p); else arr.unshift(p); localStorage.setItem('therapist_patients', JSON.stringify(arr)); try{ window.dispatchEvent(new Event('storage')); }catch(e){} try{ window.dispatchEvent(new Event('patients:updated')); }catch(e){} return p; }catch(e){ console.warn('addPatient failed', e); return null; } },
    clearAll(){ try{ localStorage.removeItem(KEY_ADMINS); localStorage.removeItem(KEY_REGISTERED_CLINICS); localStorage.removeItem(KEY_CURRENT_ADMIN); }catch(e){} }
  };
  window.localStore = localStore;
})();
