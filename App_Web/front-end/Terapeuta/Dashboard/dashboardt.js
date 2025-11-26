// Load real authenticated therapist data from API
function escapeHtml(value){ return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
async function loadTherapistDashboard(){
  // Verify and load current authenticated user
  let currentUser = null;
  let dashboardData = null;
  console.debug('[dashboardt] start loadTherapistDashboard', {
    __authToken: window.__authToken,
    currentUser_admin: localStorage.getItem('currentUser_admin'),
    currentUser_therapist: sessionStorage.getItem('currentUser_therapist') || localStorage.getItem('currentUser_therapist')
  });
  
  try {
    // Prefer server-backed flow when an auth token is present, but fall back to localStorage/localStore
    const token = window.__authToken || null;
    if (token) {
      try{
        const meRes = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
        if (meRes.ok) currentUser = await meRes.json();
      }catch(e){ console.warn('Could not reach auth/me endpoint, will try local fallback', e); }
    }

    // Local fallback: try persisted therapist session
    if(!currentUser){
      try{ if(window.localStore && typeof window.localStore.getCurrentTherapist === 'function') currentUser = window.localStore.getCurrentTherapist(); }catch(e){}
      try{ if(!currentUser) currentUser = JSON.parse(sessionStorage.getItem('currentUser_therapist')||'null'); }catch(e){}
      try{ if(!currentUser) currentUser = JSON.parse(localStorage.getItem('currentUser_therapist')||'null'); }catch(e){}
    }

    if(!currentUser){
      // diagnostic: attempt to read via window.localStore if available
      try{ if(window.localStore && typeof window.localStore.getCurrentTherapist === 'function') {
        const v = window.localStore.getCurrentTherapist();
        console.debug('[dashboardt] localStore.getCurrentTherapist ->', v);
      }}catch(e){}
      console.warn('No authenticated therapist found (server or local). Redirecting to login.');
      window.location.href = '/Administrador/login/index.html';
      return;
    }

    // Try to fetch dashboard data from API if token exists, otherwise use localStore/localStorage
    if(token){
      try{
        const dashRes = await fetch('/api/therapists/me/dashboard', { headers: { 'Authorization': 'Bearer ' + token } });
        if(dashRes.ok){ dashboardData = await dashRes.json(); console.log('Dashboard data loaded from MongoDB:', dashboardData); }
      }catch(e){ console.warn('Could not fetch therapist dashboard from API, falling back to local', e); }
    }
    if(!dashboardData){
      // assemble dashboardData from persisted local storage for testing
      const patients = (window.localStore && typeof window.localStore.getPatients === 'function') ? window.localStore.getPatients() : (JSON.parse(localStorage.getItem('therapist_patients')||'[]')||[]);
      const exercises = (window.localStore && typeof window.localStore.getExercises === 'function') ? (window.localStore.getExercises()||[]) : [];
      dashboardData = { therapist: currentUser, patients: patients || [], exercises: exercises || [] };
    }
    
    // Update sidebar with real user data
    let displayName = '';
    let displayEmail = '';
    let displayPhoto = '';
    try {
      const nameEl = document.getElementById('therapistName');
      const emailEl = document.getElementById('therapistEmail');
      const photoEl = document.getElementById('therapistPhoto');
      displayName = currentUser.name || currentUser.nombre || currentUser.email || '';
      displayPhoto = currentUser.photo || currentUser.foto || '';
      displayEmail = currentUser.email || currentUser.mail || currentUser.correo || '';
      if (nameEl) nameEl.textContent = displayName;
      if (emailEl) emailEl.textContent = displayEmail;
      if (photoEl && displayPhoto) photoEl.setAttribute('src', displayPhoto);
    } catch (e) { console.warn('Sidebar update failed:', e); }
    console.debug('[dashboardt] applied sidebar for', { displayName: displayName, displayEmail: displayEmail, displayPhoto: displayPhoto });
  } catch (err) {
    console.error('Error loading therapist data:', err);
    dashboardData = { therapist: currentUser || {}, patients: [], exercises: [] };
  }

  // Use MongoDB data if available, otherwise empty arrays (no local persistence)
  const patientsStore = dashboardData && dashboardData.patients ? dashboardData.patients : [];
  const assignedExercises = dashboardData && dashboardData.exercises ? dashboardData.exercises : [];
  
  const todayList = document.getElementById('todayList');
  if(todayList) todayList.innerHTML = '';

  function buildAvatar(name){
    const text = (name || 'Paciente').split(' ').map(w=>w[0]).join('').toUpperCase();
    return text.slice(0,2);
  }

  function statusForPatient(patientExercises, idx){
    if(patientExercises.length === 0) return { text: 'Sin ejercicios', icon: '⏳', cls: 'status-pending' };
    if(idx % 3 === 0) return { text: 'Requiere atención', icon: '⚠️', cls: 'status-alert' };
    return { text: 'Activo', icon: '✅', cls: 'status-good' };
  }

  function makeExercisePills(patientExercises){
    const wrapper = document.createElement('div');
    wrapper.className = 'patient-exercise-list';
    if(patientExercises.length === 0){
      const pill = document.createElement('span');
      pill.className = 'patient-exercise-pill';
      pill.textContent = 'Sin ejercicios asignados';
      wrapper.appendChild(pill);
      return wrapper;
    }
    patientExercises.slice(0,2).forEach(ex=>{
      const pill = document.createElement('span');
      pill.className = 'patient-exercise-pill';
      pill.textContent = ex.pathology || 'Ejercicio personalizado';
      wrapper.appendChild(pill);
    });
    if(patientExercises.length > 2){
      const more = document.createElement('span');
      more.className = 'patient-exercise-pill';
      more.textContent = `+${patientExercises.length - 2} más`;
      wrapper.appendChild(more);
    }
    return wrapper;
  }

  function renderPatientsList(){
    if(!todayList) return;
    if(patientsStore.length === 0){
      todayList.innerHTML = '<div class="empty-state">No hay pacientes asignados</div>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'patient-tracker';
    patientsStore.slice(0, 3).forEach((patient, idx) => {
      const patientExercises = assignedExercises.filter(a =>
        (a.patientId === patient.id || a.patientId === patient.email || a.patientId === patient.name)
      );
      const card = document.createElement('article');
      card.className = 'patient-card';
      const status = statusForPatient(patientExercises, idx);
      card.innerHTML = `
        <div class="patient-card-header">
          <div class="patient-avatar">${escapeHtml(buildAvatar(patient.name))}</div>
          <div>
            <h3>${escapeHtml(patient.name || 'Paciente')}</h3>
            <p>${escapeHtml(patient.condition || patient.diagnosis || 'Seguimiento general')}</p>
          </div>
          <span class="status-pill ${status.cls}">${status.icon} ${status.text}</span>
        </div>
      `;
      const table = document.createElement('div');
      table.className = 'patient-table';
      table.innerHTML = `
        <div class="patient-row header">
          <span>Edad</span>
          <span>Estado</span>
          <span>Teléfono</span>
          <span>Última actividad</span>
        </div>
        <div class="patient-row">
          <span>${escapeHtml(patient.age || '--')}</span>
          <span>${escapeHtml(patient.status || 'Pendiente')}</span>
          <span>${escapeHtml(patient.phone || '--')}</span>
          <span>${escapeHtml(patient.lastActive || 'Sin registro')}</span>
        </div>
      `;
      card.appendChild(table);
      const exerciseRow = document.createElement('div');
      exerciseRow.className = 'patient-row exercises-row';
      const exerciseLabel = document.createElement('span');
      exerciseLabel.textContent = 'Ejercicios recientes';
      const pills = makeExercisePills(patientExercises);
      const wrapper = document.createElement('div');
      wrapper.className = 'exercise-label-row';
      wrapper.appendChild(exerciseLabel);
      wrapper.appendChild(pills);
      exerciseRow.appendChild(wrapper);
      card.appendChild(exerciseRow);
      grid.appendChild(card);
    });
    if(patientsStore.length > 3){
      const more = document.createElement('div');
      more.className = 'more-indicator';
      more.textContent = `+${patientsStore.length - 3} pacientes más`;
      grid.appendChild(more);
    }
    todayList.appendChild(grid);
  }

  if(todayList) renderPatientsList();

  // Agregar event listeners a los botones de detalles y mensajes
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('action-btn')) {
      const patientCard = e.target.closest('.patient-card');
      if (patientCard) {
        const patientName = patientCard.querySelector('.patient-name strong').textContent;
        const patientInitials = patientCard.querySelector('.patient-avatar').textContent;
        
        // Determinar si es botón de detalles o mensajes
        if (e.target.textContent.includes('Mensaje')) {
          // Store selected patient in-memory for messages page (no localStorage)
          try{ window.__selectedPatientChat = { name: patientName, initials: patientInitials }; }catch(e){}
          // Navigate to messages page
          window.location.href = '../messages.html';
        } else {
          console.log('Ver detalles de:', patientName);
          // window.location.href = '../Pacientes/pacientes.html?id=' + patientName;
        }
      }
    }
  });
  

  // Actividad reciente: ejercicios asignados recientemente
  const activityList = document.getElementById('activityList');
  if(activityList){
    activityList.innerHTML = '';
    if (assignedExercises.length === 0) {
      activityList.innerHTML = '<div class="empty-state" role="status" aria-live="polite"><div class="empty-icon">🕒</div><div>No hay actividad reciente</div></div>';
    } else {
      const recentAssignments = assignedExercises
        .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
        .slice(0, 6);
      recentAssignments.forEach(assignment => {
        const card = document.createElement('div');
        card.className = 'activity-card';
        const date = new Date(assignment.at || Date.now());
        const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
        card.innerHTML = `
          <div class="badge">Ejercicio asignado</div>
          <div class="details">
            <strong style="display:block; color:#0A1B4F;">${assignment.pathology || 'General'}</strong>
            <small style="color:#64748b;">Paciente: ${assignment.patientName || assignment.patientId || 'Desconocido'}</small>
          </div>
          <div class="time">${dateStr} · ${timeStr}</div>
        `;
        activityList.appendChild(card);
      });
    }
  }

  // Keyword focus improvements for cards
  document.querySelectorAll('.card').forEach(c=>{
    c.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ c.click(); } });
  });
}

// Ensure initialization runs whether DOMContentLoaded already fired or not
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadTherapistDashboard);
else loadTherapistDashboard();

function logoutTherapist(){
  try{ window.__authToken = null; window.__currentUser = null; window.__currentTherapist = null; window.__selectedPatientChat = null; }catch(e){ console.warn('logout: unable to clear globals', e); }
  try{ if(window.localStore && typeof window.localStore.setCurrentTherapist === 'function'){ window.localStore.setCurrentTherapist(null); window.localStore.setCurrentUser(null); } }catch(e){ console.warn('logout: localStore clear failed', e); }
  ['currentUser_therapist','currentUser_admin','authToken','token','__authToken'].forEach(key=> localStorage.removeItem(key));
  sessionStorage.removeItem('currentUser_therapist');
  window.location.href = '/Administrador/login/index.html';
}
window.logoutTherapist = logoutTherapist;
