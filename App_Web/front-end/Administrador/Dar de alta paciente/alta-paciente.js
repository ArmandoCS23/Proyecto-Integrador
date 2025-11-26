// JS ligero para poblar terapeutas y guardar paciente en localStorage
(function(){
    // almacenará la imagen seleccionada como dataURL
    var currentPhotoData = null;
    function ensureDefaultTherapists(){
        // No default therapists by default. This function kept for compatibility but does not
        // insert any demo therapists so lists reflect what was explicitly created by the user.
        return;
    }

    function populateTherapistSelect(){
        ensureDefaultTherapists();
        let therapists = [];
        try{ therapists = (window.localStore && localStore.getTherapists) ? localStore.getTherapists() : JSON.parse(localStorage.getItem('therapists')||'[]'); }catch(e){ therapists = JSON.parse(localStorage.getItem('therapists')||'[]'); }
        const select = document.getElementById('assignedTherapist');
        if(!select) return;
        select.innerHTML = '';
        const emptyOpt = document.createElement('option'); emptyOpt.value=''; emptyOpt.textContent='(Sin asignar)'; select.appendChild(emptyOpt);
        therapists.forEach(t=>{ const opt = document.createElement('option'); opt.value=t.id; opt.textContent=t.name; select.appendChild(opt); });
    }

    // Gestión de la subida de la foto y previsualizado
    function setupPhotoPreview(){
        var input = document.getElementById('photo');
        var preview = document.getElementById('photoPreview');
        if(!input || !preview) return;
        input.addEventListener('change', function(e){
            var file = e.target.files && e.target.files[0];
            if(!file){ currentPhotoData = null; preview.src = ''; preview.style.display = 'none'; return; }
            var reader = new FileReader();
            reader.onload = function(ev){ currentPhotoData = ev.target.result; preview.src = currentPhotoData; preview.style.display = 'block'; };
            reader.readAsDataURL(file);
        });
        // permitir clic en la previsualización para reabrir selector
        preview.addEventListener('click', function(){ input.click(); });
    }

    populateTherapistSelect();
    setupPhotoPreview();

    // listen for changes when a therapist is added in the same tab
    window.addEventListener('storage', function(){ populateTherapistSelect(); });
    window.addEventListener('therapists:updated', function(){ populateTherapistSelect(); });

    // Save flow with confirmation modal and success overlay
    const form = document.getElementById('adminNewPatientForm');
    const confirmModal = document.getElementById('confirmModal');
    const confirmSaveBtn = document.getElementById('confirmSave');
    const cancelConfirmBtn = document.getElementById('cancelConfirm');
    const successOverlay = document.getElementById('successOverlay');
    const goToPatientsBtn = document.getElementById('goToPatients');

    let pendingPatient = null;

    if(form){
        form.addEventListener('submit', function(e){
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            if(!name){ alert('El nombre es requerido'); return; }
            const email = document.getElementById('email').value.trim();
                if(!email){ alert('El correo electrónico es requerido'); return; }
                // duplicate email check across admins, therapists and existing patients
                try{
                    const lower = String(email||'').toLowerCase();
                    // check admins
                    if(window.localStore && typeof localStore.getAdminByEmail === 'function'){
                        const a = localStore.getAdminByEmail(lower);
                        if(a){ alert('El correo ' + email + ' ya está en uso por un administrador.'); return; }
                    } else {
                        const admins = JSON.parse(localStorage.getItem('admins')||'[]');
                        if((admins||[]).some(x=> (x.email||'').toLowerCase()===lower)){ alert('El correo ' + email + ' ya está en uso por un administrador.'); return; }
                    }
                    // check therapists
                    try{
                        const therapists = JSON.parse(localStorage.getItem('therapists')||'[]');
                        if((therapists||[]).some(t=> (t.email||'').toLowerCase()===lower)){ alert('El correo ' + email + ' ya está en uso por un terapeuta.'); return; }
                    }catch(e){}
                    // check patients
                    try{
                        const patients = JSON.parse(localStorage.getItem('therapist_patients')||'[]');
                        if((patients||[]).some(p=> (p.email||'').toLowerCase()===lower)){ alert('El correo ' + email + ' ya está en uso por un paciente.'); return; }
                    }catch(e){}
                }catch(e){ console.warn('duplicate check failed', e); }
            const password = document.getElementById('password').value.trim();
            if(!password){ alert('La contraseña es requerida'); return; }
            // build the patient object but don't save yet
            pendingPatient = {
                id: 'p_'+Date.now(),
                name,
                age: document.getElementById('age').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                status: document.getElementById('status').value,
                diagnosis: document.getElementById('diagnosis').value,
                assignedTherapist: document.getElementById('assignedTherapist').value || null,
                summary: document.getElementById('summary').value.trim(),
                email: email,
                password: password,
                exercises: [], assigned: [], created: new Date().toISOString(),
                photo: currentPhotoData || null
            };
            // show confirmation modal
            if(confirmModal){
                confirmModal.setAttribute('aria-hidden','false');
                confirmModal.style.display = 'flex';
            }
            // focus confirm button for keyboard users
            if(confirmSaveBtn) confirmSaveBtn.focus();
        });
    }

    if(cancelConfirmBtn){
        cancelConfirmBtn.addEventListener('click', function(){
            pendingPatient = null;
            if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display = 'none'; }
        });
    }

    if(confirmSaveBtn){
        confirmSaveBtn.addEventListener('click', async function(){
            if(!pendingPatient) return;
            // Try to save to server API first
            try{
                const token = localStorage.getItem('authToken') || localStorage.getItem('token') || null;
                const payload = {
                    name: pendingPatient.name,
                    email: pendingPatient.email,
                    password: pendingPatient.password,
                    age: pendingPatient.age || null,
                    phone: pendingPatient.phone || '',
                    status: pendingPatient.status || 'Activo',
                    diagnosis: pendingPatient.diagnosis || '',
                    summary: pendingPatient.summary || '',
                    photo: pendingPatient.photo || '',
                    assignedTherapist: pendingPatient.assignedTherapist || null
                };
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = 'Bearer ' + token;
                const resp = await fetch('/api/admin/pacientes', { method: 'POST', headers, body: JSON.stringify(payload) });
                if(resp.ok){
                    let saved = await resp.json();
                    // also persist a local copy so the patients listing shows immediately
                    try{
                        const toStore = {
                            id: saved.paciente._id || saved.paciente.id || 'p_'+Date.now(),
                            name: saved.paciente.name,
                            email: saved.paciente.email,
                            age: saved.paciente.age,
                            phone: saved.paciente.phone,
                            status: saved.paciente.status,
                            diagnosis: saved.paciente.diagnosis,
                            summary: saved.paciente.summary,
                            photo: saved.paciente.photo || pendingPatient.photo || '',
                            assignedTherapist: saved.paciente.terapeutaAsignado?._id || saved.paciente.terapeutaAsignado || pendingPatient.assignedTherapist
                        };
                        try{ if(window.localStore && localStore.addPatient){ localStore.addPatient(toStore); } else { const existing = JSON.parse(localStorage.getItem('therapist_patients')||'[]'); existing.unshift(toStore); localStorage.setItem('therapist_patients', JSON.stringify(existing)); try{ window.dispatchEvent(new Event('patients:updated')); }catch(e){} } console.log('saved patient (server)', toStore); }catch(e){ console.warn('Could not sync patient to localStorage', e); }
                    }catch(e){ console.warn('Could not sync patient to localStorage', e); }
                    // hide modal
                    if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display = 'none'; }
                    // show success overlay
                    if(successOverlay){ successOverlay.setAttribute('aria-hidden','false'); successOverlay.style.display = 'flex'; }
                    // clear pending
                    pendingPatient = null;
                    // auto-redirect after a short pause
                    setTimeout(()=>{ window.location.href = '../Pacientes/pacientes.html'; }, 1400);
                    return;
                }
                // If server returns error, fall back to localStorage
                const j = await resp.json().catch(()=>({}));
                if(resp.status === 409){ alert(j.error || 'Paciente ya existe en servidor'); pendingPatient = null; if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; } return; }
            }catch(err){ console.warn('API save failed, falling back to localStorage', err); }
            // fallback: persist locally
            try{
                if(window.localStore && localStore.addPatient){ localStore.addPatient(pendingPatient); }
                else { const arr = JSON.parse(localStorage.getItem('therapist_patients')||'[]'); arr.unshift(pendingPatient); localStorage.setItem('therapist_patients', JSON.stringify(arr)); try{ window.dispatchEvent(new Event('patients:updated')); }catch(e){} }
                console.log('saved patient (fallback)', pendingPatient);
            }catch(e){ console.warn('Could not persist patient locally', e); }
            // hide modal
            if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display = 'none'; }
            // show success overlay
            if(successOverlay){ successOverlay.setAttribute('aria-hidden','false'); successOverlay.style.display = 'flex'; }
            // clear pending
            pendingPatient = null;
            // auto-redirect after a short pause
            setTimeout(()=>{ window.location.href = '../Pacientes/pacientes.html'; }, 1400);
        });
    }

    if(goToPatientsBtn){
        goToPatientsBtn.addEventListener('click', function(){
            window.location.href = '../Pacientes/pacientes.html';
        });
    }

    // close handlers: close button, overlay click, Escape key
    const modalCloseBtn = document.querySelector('#confirmModal .modal-close');
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', ()=>{ pendingPatient=null; if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; } });
    if(document.getElementById('confirmModal')){
        document.getElementById('confirmModal').addEventListener('click', function(ev){ if(ev.target===document.getElementById('confirmModal')){ pendingPatient=null; if(confirmModal){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; } }});
    }
    document.addEventListener('keydown', function(ev){ if(ev.key==='Escape'){
        if(confirmModal && confirmModal.getAttribute('aria-hidden')==='false'){ pendingPatient=null; confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; }
        if(successOverlay && successOverlay.getAttribute('aria-hidden')==='false'){ successOverlay.setAttribute('aria-hidden','true'); successOverlay.style.display='none'; }
    }});
})();
