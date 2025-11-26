(function(){
  // registro-admin.js
  function $(id){return document.getElementById(id);} 
  const form = $('registroForm');
  const messageContainer = $('messageContainer');
  const messageEl = $('message');
  const btnRegistro = $('btnRegistro');
  const imageInput = $('fotoPerfil');

  function readFileAsDataURL(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = ()=> reject(new Error('Error leyendo archivo'));
      reader.readAsDataURL(file);
    });
  }

  function showMessage(text, type){
    if(!messageContainer || !messageEl) return;
    messageEl.textContent = text;
    messageContainer.style.display = 'block';
    messageContainer.className = 'message-container';
    if(type === 'success') messageEl.className = 'mensaje-login success';
    else if(type === 'error') messageEl.className = 'mensaje-login error';
    else messageEl.className = 'mensaje-login';
  }

  function hideMessage(){ if(messageContainer) messageContainer.style.display = 'none'; }

  async function handleSubmit(e){
    e.preventDefault();
    if(!form) return;
    btnRegistro && (btnRegistro.disabled = true);

    const nombre = $('nombre') ? $('nombre').value.trim() : '';
    const email = $('email') ? $('email').value.trim().toLowerCase() : '';
    const clinic = $('clinic') ? $('clinic').value.trim() : '';
    const password = $('password') ? $('password').value : '';
    const confirmarPassword = $('confirmarPassword') ? $('confirmarPassword').value : '';

    // simple validations
    if(!nombre || !email || !password || !clinic){
      showMessage('Completa los campos obligatorios.', 'error');
      btnRegistro && (btnRegistro.disabled = false);
      return;
    }

    // prevent registering same clinic twice (one admin per clinic)
    try{
      const normClinic = String(clinic||'').trim().toLowerCase();
      if(window.localStore && localStore.isClinicRegistered && localStore.isClinicRegistered(normClinic)){
        showMessage('Ya existe un administrador registrado para esa clínica. Redirigiendo a login...', 'error');
        setTimeout(()=> window.location.href = '../login/index.html', 900);
        return;
      }
    }catch(e){ console.warn('Could not check registeredClinics', e); }
    if(password.length < 6){ showMessage('La contraseña debe tener al menos 6 caracteres.', 'error'); btnRegistro && (btnRegistro.disabled = false); return; }
    if(password !== confirmarPassword){ showMessage('Las contraseñas no coinciden.', 'error'); btnRegistro && (btnRegistro.disabled = false); return; }

    // No local persistence: we will not pre-save admin to browser storage.
    // Keep collected image data in payload only until we send to the server.

    // After pre-saving locally, create a local auth token and log the user in (offline-first)
    // Do not perform offline auto-login or local clinic registration. Continue to attempt server registration.

    // Persist admin locally for offline testing using localStore when available
    try{
      const payload = { name: nombre, clinic, email, password, rol: 'admin' };
      if(imageInput && imageInput.files && imageInput.files[0]){
        try{ payload.photo = await readFileAsDataURL(imageInput.files[0]); }catch(e){ console.warn('Could not read image as dataURL', e); }
      }

      // Use localStore helper if available, otherwise fall back to localStorage keys
      try{
        if(window.localStore && typeof window.localStore.saveAdmin === 'function'){
          window.localStore.saveAdmin(payload);
          // set as current user
          try{ window.localStore.setCurrentUser(payload); }catch(e){}
        } else {
          // basic fallback
          const admins = JSON.parse(localStorage.getItem('admins')||'[]');
          admins.push(payload);
          localStorage.setItem('admins', JSON.stringify(admins));
          // register clinic
          const regs = JSON.parse(localStorage.getItem('registeredClinics')||'[]');
          const nc = String(clinic||'').trim().toLowerCase(); if(nc && regs.indexOf(nc)===-1) { regs.push(nc); localStorage.setItem('registeredClinics', JSON.stringify(regs)); }
          localStorage.setItem('currentUser_admin', JSON.stringify(payload));
        }
      }catch(e){ console.warn('Could not persist admin locally', e); }

      showMessage('Administrador registrado localmente. Redirigiendo...', 'success');
      setTimeout(()=> window.location.href = '../Dashboard/dashboard-admin.html', 700);
      return;
    }catch(err){
      console.error('Registro local error', err);
      showMessage('Error guardando datos localmente: ' + (err && err.message ? err.message : ''), 'error');
      btnRegistro && (btnRegistro.disabled = false);
    }
  }
  if(form) form.addEventListener('submit', handleSubmit);

  // Prevent showing registration when the clinic is already registered (live check)
  document.addEventListener('DOMContentLoaded', function(){
    try{
      const clinicInput = $('clinic');
      const submitBtn = $('btnRegistro');
      const infoBox = document.createElement('div');
      infoBox.style.marginTop = '8px';
      infoBox.style.fontSize = '0.95em';
      infoBox.style.color = '#b00';
      if(clinicInput && submitBtn){
        clinicInput.addEventListener('blur', function(){
          try{
            const val = String(clinicInput.value||'').trim();
            if(!val) { infoBox.textContent = ''; if(infoBox.parentNode) infoBox.parentNode.removeChild(infoBox); submitBtn.disabled = false; return; }
            const norm = val.toLowerCase();
            let exists = false;
            if(window.localStore && typeof localStore.isClinicRegistered === 'function') exists = localStore.isClinicRegistered(norm);
            else { const reg = JSON.parse(localStorage.getItem('registeredClinics')||'[]'); exists = (reg.indexOf(norm) !== -1); }
            if(exists){
              infoBox.textContent = 'Ya existe un administrador para esa clínica. No se puede registrar otro.';
              if(!clinicInput.parentNode.contains(infoBox)) clinicInput.parentNode.appendChild(infoBox);
              submitBtn.disabled = true;
            } else {
              infoBox.textContent = '';
              if(infoBox.parentNode) infoBox.parentNode.removeChild(infoBox);
              submitBtn.disabled = false;
            }
          }catch(e){ console.warn('clinic check failed', e); }
        });
      }
    }catch(e){ /* ignore */ }
  });

  // Image preview handling
  (function(){
    const fileInput = $('fotoPerfil');
    const previewContainer = $('previewContainer');
    const imagePreview = $('imagePreview');
    const fileUploadText = document.querySelector('.file-upload-text');
    if(fileInput){
      fileInput.addEventListener('change', async function(){
        try{
          console.log('fotoPerfil change event');
          const f = this.files && this.files[0] ? this.files[0] : null;
          if(!f){
            console.log('no file selected');
            if(previewContainer) previewContainer.style.display = 'none';
            if(fileUploadText) fileUploadText.textContent = 'Seleccionar imagen';
            return;
          }
          console.log('selected file', f.name, f.type, f.size);
          if(f.size > 5 * 1024 * 1024){ alert('La imagen excede 5MB'); this.value=''; if(previewContainer) previewContainer.style.display='none'; return; }

          // try FileReader first, fallback to createObjectURL
          let data = '';
          let usedBlobURL = false;
          try{
            data = await readFileAsDataURL(f);
          }catch(rfErr){
            console.warn('FileReader falló, intentando createObjectURL', rfErr);
            try{ data = URL.createObjectURL(f); usedBlobURL = true; }catch(uriErr){ console.error('No se pudo generar URL para la imagen', uriErr); }
          }

          if(!data){
            // nothing to show
            console.warn('No se obtuvo data de la imagen');
            if(previewContainer) previewContainer.style.display = 'none';
            if(fileUploadText) fileUploadText.textContent = 'Seleccionar imagen';
            return;
          }

          if(imagePreview){
            // ensure the image is visible; set up load/error handlers to debug
            imagePreview.onload = function(){
              console.log('imagePreview loaded successfully');
              // remove inline sizing to let CSS control size
              imagePreview.style.display = 'inline-block';
            };
            imagePreview.onerror = function(ev){
              console.error('imagePreview onerror', ev);
              // if we used a blob URL, try reading as DataURL (unlikely but safe)
              if(usedBlobURL){
                try{ readFileAsDataURL(f).then(d=>{ imagePreview.src = d; }).catch(e=>console.error('fallback FileReader failed', e)); }
                catch(e){ console.error('fallback failed', e); }
              }
            };
            imagePreview.alt = f.name || 'Imagen subida';
            imagePreview.src = data;
            imagePreview.style.display = 'inline-block';
          }

          if(previewContainer) { previewContainer.style.display = 'flex'; previewContainer.style.alignItems = 'center'; previewContainer.style.justifyContent = 'center'; }
          if(fileUploadText) fileUploadText.textContent = f.name;

          // remember blob URL so we can revoke it later in removeImage
          if(usedBlobURL){
            // store on element for cleanup
            imagePreview.__blobURL = data;
          } else if(imagePreview && imagePreview.__blobURL){
            try{ URL.revokeObjectURL(imagePreview.__blobURL); }catch(e){}
            imagePreview.__blobURL = null;
          }

        }catch(err){ console.error('Error en change handler de fotoPerfil', err); alert('No se pudo leer la imagen'); this.value=''; if(previewContainer) previewContainer.style.display='none'; }
      });
    }

    // global removeImage function used in HTML
    window.removeImage = function(){
      const fi = $('fotoPerfil');
      if(fi){ try{ fi.value = ''; }catch(e){ /* ignore */ }
      }
      const pc = $('previewContainer'); if(pc) pc.style.display='none';
      const ip = $('imagePreview'); if(ip){
        // revoke blob URL if present
        try{ if(ip.__blobURL) { URL.revokeObjectURL(ip.__blobURL); ip.__blobURL = null; } }catch(e){}
        ip.src = '';
        ip.style.display = 'none';
      }
      const txt = document.querySelector('.file-upload-text'); if(txt) txt.textContent = 'Seleccionar imagen';
    };
  })();

  // Toggle password visibility for inputs with .toggle-password buttons
  (function(){
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', function(){
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if(!input) return;
        const isPwd = input.getAttribute('type') === 'password';
        input.setAttribute('type', isPwd ? 'text' : 'password');
        btn.setAttribute('aria-pressed', String(!isPwd));
        // toggle icon visibility
        const eye = btn.querySelector('.icon-eye');
        const eyeOff = btn.querySelector('.icon-eye-off');
        if(eye) eye.style.display = isPwd ? 'none' : 'inline-block';
        if(eyeOff) eyeOff.style.display = isPwd ? 'inline-block' : 'none';
      });
    });
  })();

  // expose for debug
  window.__registroAdmin = { readFileAsDataURL };
})();
