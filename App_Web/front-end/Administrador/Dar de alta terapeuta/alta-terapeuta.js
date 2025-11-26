// alta-terapeuta.js
(function(){
  const form = document.getElementById('therapistForm');
  const successBox = document.getElementById('successMessage');
  const creds = document.getElementById('therapistCredentials');

  function readTherapists(){
    try{ if(window.localStore && localStore.getTherapists) return localStore.getTherapists(); }catch(e){}
    try{ return JSON.parse(localStorage.getItem('therapists')||'[]'); }catch(e){ return []; }
  }
  function writeTherapists(arr){
    try{ if(window.localStore && localStore.addTherapist){ // sync array into localStore
        (arr||[]).forEach(t=> localStore.addTherapist(t));
        return;
      }
    }catch(e){ }
    try{ localStorage.setItem('therapists', JSON.stringify(arr)); try{ window.dispatchEvent(new Event('therapists:updated')); }catch(e){} }catch(e){ }
  }

  function uid(){ return 't' + Date.now().toString(36); }

  function showSuccess(t){
    // Show floating toast instead of inline box
    const toastArea = document.getElementById('toastContainer');
    if(!toastArea) return;
    const id = 'toast_'+Date.now();
    const el = document.createElement('div');
    el.className = 'toast toast-success';
    el.id = id;
    el.innerHTML = `
      <div class="toast-body">
        <strong>✅ Terapeuta registrado</strong>
        <div class="toast-text"><div><strong>Nombre:</strong> ${escapeHtml(t.name)}</div><div><strong>Usuario:</strong> ${escapeHtml(t.email)}</div></div>
      </div>
      <button class="toast-close" aria-label="Cerrar">×</button>
    `;
    toastArea.appendChild(el);
    // close handler
    el.querySelector('.toast-close').addEventListener('click', ()=> removeToast(el));
    // auto remove
    setTimeout(()=> removeToast(el), 6000);
  }

  function removeToast(el){
    if(!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(()=> el.remove(), 250);
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  window.limpiarFormulario = function(){ form.reset(); successBox.style.display='none'; };

  if(form){
    // enhanced save flow: confirmation modal and large success overlay
    const confirmModal = document.getElementById('confirmModal');
    const confirmSaveBtn = document.getElementById('confirmSave');
    const cancelConfirmBtn = document.getElementById('cancelConfirm');
    const successOverlay = document.getElementById('successOverlay');
    const goToTherapistsBtn = document.getElementById('goToTherapists');
    let pendingTherapist = null;

    form.addEventListener('submit', function(e){
      e.preventDefault();
      const name = document.getElementById('nombre').value.trim();
      const especialidad = document.getElementById('especialidad').value;
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const telefono = document.getElementById('telefono').value.trim();
      const activo = document.getElementById('activo').checked;
      // validations
      if(!name || !email || !password) { alert('Por favor completa los campos obligatorios'); return; }
      // duplicate email check (quick client-side) across admins, therapists and patients
      try{
        const lower = String(email||'').toLowerCase();
        // admins
        try{ if(window.localStore && typeof localStore.getAdminByEmail === 'function'){ if(localStore.getAdminByEmail(lower)){ alert('El correo ' + email + ' ya está en uso por un administrador.'); return; } } else { const admins = JSON.parse(localStorage.getItem('admins')||'[]'); if((admins||[]).some(a=> (a.email||'').toLowerCase()===lower)){ alert('El correo ' + email + ' ya está en uso por un administrador.'); return; } } }catch(e){}
        // patients
        try{ const patients = JSON.parse(localStorage.getItem('therapist_patients')||'[]'); if((patients||[]).some(p=> (p.email||'').toLowerCase()===lower)){ alert('El correo ' + email + ' ya está en uso por un paciente.'); return; } }catch(e){}
        // therapists
        try{ const therapists = readTherapists(); if((therapists||[]).some(t=> (t.email||'').toLowerCase()===lower)){ alert('El correo ' + email + ' ya está en uso por otro terapeuta.'); return; } }catch(e){}
      }catch(e){ console.warn('duplicate check failed', e); }

      // process photo if present
      const photoInput = document.getElementById('foto');
      const file = photoInput && photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;
      const proceed = function(photoData){
        pendingTherapist = { id: uid(), name, photo: photoData || '', specialty: especialidad, email, password, phone: telefono, active: !!activo, createdAt: new Date().toISOString() };
        // show confirmation modal
        if(confirmModal){ confirmModal.setAttribute('aria-hidden','false'); confirmModal.style.display='flex'; confirmSaveBtn && confirmSaveBtn.focus(); }
      };
      if(file){
        // read dataURL
        const reader = new FileReader();
        reader.onload = function(){ proceed(reader.result); };
        reader.onerror = function(){ alert('No se pudo leer la imagen'); proceed(''); };
        // limit 5MB
        if(file.size > 5 * 1024 * 1024){ alert('La imagen excede 5MB'); return; }
        reader.readAsDataURL(file);
      } else {
        proceed('');
      }
    });

    cancelConfirmBtn && cancelConfirmBtn.addEventListener('click', function(){
      pendingTherapist = null;
      if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; }
    });

    confirmSaveBtn && confirmSaveBtn.addEventListener('click', function(){
      if(!pendingTherapist) return;
      // Try to save to server API first
      (async function(){
        try{
          // Try to save to server API first - use admin endpoint and proper field mapping
          const token = localStorage.getItem('authToken') || localStorage.getItem('token') || null;
          const payload = { nombre: pendingTherapist.name, email: pendingTherapist.email, password: pendingTherapist.password };
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const resp = await fetch('/api/admin/terapeutas', { method: 'POST', headers, body: JSON.stringify(payload) });
          if(resp.ok){
            let saved = await resp.json();
            // normalize server response when it wraps created user
            if(saved && saved.terapeuta) saved = saved.terapeuta;
            // also persist a local copy so the therapists listing shows immediately
            try{
              const toStore = {
                id: 't' + (saved._id || saved.id || Date.now()),
                name: saved.name || pendingTherapist.name,
                email: saved.email || pendingTherapist.email,
                // persist a usable password for local testing: prefer server-provided, then createdPassword, then pending
                password: saved.password || saved._createdPassword || pendingTherapist.password || '',
                photo: saved.photo || pendingTherapist.photo || '',
                specialty: saved.specialty || pendingTherapist.specialty || '',
                phone: saved.phone || pendingTherapist.phone || '',
                active: typeof saved.active !== 'undefined' ? saved.active : pendingTherapist.active
              };
              try{
                if(window.localStore && localStore.addTherapist){ localStore.addTherapist(toStore); }
                else {
                  const existing = readTherapists();
                  const dupIdx = (existing||[]).findIndex(t=>String(t.email||'').toLowerCase() === String(toStore.email||'').toLowerCase());
                  if(dupIdx === -1) existing.unshift(toStore);
                  else existing[dupIdx] = Object.assign({}, existing[dupIdx], toStore);
                  writeTherapists(existing);
                }
              }catch(e){ console.warn('Could not sync therapist to localStorage', e); }
            }catch(e){ console.warn('Could not sync therapist to localStorage', e); }

            // show success and display any generated credentials the server returned
            showSuccess(saved);
            if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; }
            if(successOverlay){ successOverlay.setAttribute('aria-hidden','false'); successOverlay.style.display='flex'; }

            // display credentials area if server returned a generated password
            try{
              const credEl = document.getElementById('createdCredentials');
              const credEmail = document.getElementById('credEmail');
              const credPassword = document.getElementById('credPassword');
              const copyBtn = document.getElementById('copyCred');
              if(saved && saved._createdPassword && credEl && credEmail && credPassword){
                credEmail.textContent = saved.email || pendingTherapist.email || '';
                credPassword.textContent = saved._createdPassword;
                credEl.style.display = 'block';
                copyBtn && copyBtn.addEventListener('click', function(){
                  try{ navigator.clipboard.writeText(saved._createdPassword); copyBtn.textContent = 'Copiado'; setTimeout(()=> copyBtn.textContent = 'Copiar', 2000); }catch(e){ console.warn('Clipboard failed', e); }
                });
              } else if(credEl){ credEl.style.display = 'none'; }
            }catch(e){ console.warn('Could not show created credentials', e); }

            form.reset(); try{ window.dispatchEvent(new Event('storage')); }catch(e){}
            pendingTherapist = null;
            // give admin time to copy credentials if present, otherwise quick redirect
            setTimeout(()=>{ window.location.href = '/Administrador/login/index.html'; }, (saved && saved._createdPassword) ? 6000 : 900);
            return;
          }
          // If server returns conflict or error, fall back to localStorage
          const j = await resp.json().catch(()=>({}));
          if(resp.status === 409){ alert(j.error || 'Terapeuta ya existe en servidor'); pendingTherapist = null; if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; } return; }
        }catch(err){ console.warn('API save failed, falling back to localStorage', err); }
        // fallback: persist locally
        try{
          if(window.localStore && localStore.addTherapist){
            // addTherapist handles duplicates and emits therapists:updated
            localStore.addTherapist(pendingTherapist);
          } else {
            const therapists = readTherapists();
            const dup = (therapists||[]).find(t => String(t.email||'').toLowerCase() === String(pendingTherapist.email||'').toLowerCase());
            if(dup){ alert('Ya existe un terapeuta con ese correo.'); pendingTherapist = null; if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; } return; }
            therapists.unshift(pendingTherapist);
            writeTherapists(therapists);
            try{ console.log('saved therapist (fallback)', pendingTherapist); window.dispatchEvent(new Event('therapists:updated')); }catch(e){}
          }
        }catch(e){ console.warn('Could not persist therapist locally', e); }
        showSuccess(pendingTherapist);
        if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; }
        if(successOverlay){ successOverlay.setAttribute('aria-hidden','false'); successOverlay.style.display='flex'; }
        form.reset(); try{ window.dispatchEvent(new Event('storage')); }catch(e){}
        pendingTherapist = null; setTimeout(()=>{ window.location.href = '../terapeuta/terapeutas.html'; }, 900);
      })();
    });

    goToTherapistsBtn && goToTherapistsBtn.addEventListener('click', function(){ window.location.href = '../terapeuta/terapeutas.html'; });
    // close handlers: modal close button, overlay click and Escape key
    const modalCloseBtn = document.querySelector('#confirmModal .modal-close');
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', ()=>{ pendingTherapist=null; confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; });
    if(confirmModal) confirmModal.addEventListener('click', function(ev){ if(ev.target===confirmModal){ pendingTherapist=null; confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; }});
    document.addEventListener('keydown', function(ev){ if(ev.key==='Escape'){
      if(confirmModal && confirmModal.getAttribute('aria-hidden')==='false'){ pendingTherapist=null; confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; }
      if(successOverlay && successOverlay.getAttribute('aria-hidden')==='false'){ successOverlay.setAttribute('aria-hidden','true'); successOverlay.style.display='none'; }
    }});
  }
})();
