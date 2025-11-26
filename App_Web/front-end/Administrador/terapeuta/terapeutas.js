// Minimal edit flow for therapist cards
// Exposes global editTherapist(id) used by inline onclick handlers

const DEFAULT_THERAPIST_AVATAR = 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=150&h=150&fit=crop&crop=face';

function buildTherapistAvatar(photo){ return photo ? photo : DEFAULT_THERAPIST_AVATAR; }

function resolveTherapistReference(value){
  if(value && typeof value === 'object'){
    return resolveTherapistReference(value._id || value.id || value.therapistId || value.terapeutaAsignado || value.assignedTherapist || value.assigned);
  }
  return value;
}

function normalizeId(value){
  const candidate = resolveTherapistReference(value);
  return String(candidate || '').toLowerCase().replace(/^t/, '').trim();
}

function readTherapistPatientsFromStorage(){
  if(window.localStore && typeof window.localStore.getPatients === 'function'){
    return window.localStore.getPatients() || [];
  }
  try{
    const raw = JSON.parse(localStorage.getItem('therapist_patients') || '{}');
    if(Array.isArray(raw)) return raw;
    const acc = [];
    Object.keys(raw || {}).forEach(tid => {
      const entries = raw[tid] || [];
      (entries || []).forEach(p => {
        const copy = Object.assign({}, p);
        if(!copy.assignedTherapist) copy.assignedTherapist = tid;
        acc.push(copy);
      });
    });
    return acc;
  }catch(e){
    return [];
  }
}

function refreshTherapistPatientCache(){
  const list = readTherapistPatientsFromStorage();
  try{ window.__therapistPatients = list.slice(); }catch(e){}
  return list;
}

function getTherapistPatients(){
  if(Array.isArray(window.__therapistPatients)) return window.__therapistPatients;
  return refreshTherapistPatientCache();
}

function therapistMatches(patient, targetId){
  if(!patient || !targetId) return false;
  const targetNorm = normalizeId(targetId);
  if(!targetNorm) return false;
  const fields = ['assignedTherapist','assignedTherapistAlt','therapistId','assigned','terapeutaAsignado','assignedTherapistId'];
  return fields.some((prop) => normalizeId(patient[prop]) === targetNorm);
}

// Helper: count patients assigned to a therapist
function countPatientsForTherapist(therapistId) {
  try {
    const patients = getTherapistPatients();
    return patients.filter(p => therapistMatches(p, therapistId)).length;
  } catch (e) {
    return 0;
  }
}

// Helper: update patient counts on all cards
function updatePatientCounts() {
  document.querySelectorAll('.therapist-card').forEach(card => {
    const therapistId = card.getAttribute('data-therapist-id');
    if (therapistId) {
      const count = countPatientsForTherapist(therapistId);
      const countEl = card.querySelector('.patient-number');
      if (countEl) countEl.textContent = count;
    }
  });
}

function handleEditPhotoChange(event){
  const input = event.target;
  const file = input && input.files && input.files[0];
  const preview = document.getElementById('editPhotoPreview');
  const dataField = document.getElementById('editPhotoData');
  if(!preview || !dataField) return;
  if(!file){
    dataField.value = '';
    preview.src = buildTherapistAvatar();
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e){
    const value = e.target?.result || '';
    dataField.value = value;
    preview.src = value || buildTherapistAvatar();
  };
  reader.readAsDataURL(file);
}

function resetEditPhotoInput(src){
  const preview = document.getElementById('editPhotoPreview');
  const dataField = document.getElementById('editPhotoData');
  const input = document.getElementById('editPhoto');
  const placeholder = src || '';
  if(preview) preview.src = placeholder || buildTherapistAvatar();
  if(dataField) dataField.value = placeholder;
  if(input) input.value = '';
}

// Delete therapist with confirmation modal
function deleteTherapist(therapistId) {
  showDeleteConfirmModal(therapistId);
}

// Show delete confirmation modal
function showDeleteConfirmModal(therapistId) {
  let confirmModal = document.getElementById('deleteConfirmModal');
  
  if (!confirmModal) {
    confirmModal = document.createElement('div');
    confirmModal.id = 'deleteConfirmModal';
    confirmModal.className = 'modal';
    confirmModal.innerHTML = `
      <div class="modal-content modal-confirm">
        <div class="modal-header modal-warning">
          <h2>⚠️ Confirmar eliminación</h2>
        </div>
        <div class="modal-body">
          <p class="confirm-message">¿Estás seguro de que quieres borrar este terapeuta?</p>
          <p class="confirm-warning">Si tiene pacientes asignados, deberás reasignarlos o actualizar los registros.</p>
          <div id="patientReassignContainer" style="display: none;">
            <div class="reassign-section">
              <h4>Reasignar pacientes</h4>
              <p id="patientCountDisplay" class="patient-info"></p>
              <div class="reassign-options">
                <label>Selecciona un nuevo terapeuta:</label>
                <select id="newTherapistSelect">
                  <option value="">-- Selecciona un terapeuta --</option>
                </select>
                <button class="btn btn-action btn-primary" onclick="reassignPatientsToNew()">Reasignar</button>
              </div>
            </div>
          </div>
          <div class="confirm-actions">
            <button class="btn btn-action btn-secondary" onclick="closeDeleteConfirmModal()">Cancelar</button>
            <button class="btn btn-action" id="reassignBtnToggle" onclick="toggleReassignSection()" style="background: #ffc107; color: #000; font-weight: 600;">Reasignar pacientes</button>
            <button class="btn btn-action btn-danger" id="deleteBtnConfirm" onclick="confirmDeleteTherapist()">Eliminar Terapeuta</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(confirmModal);
  }
  
  // Get therapist info
  const card = document.querySelector(`[data-therapist-id="${therapistId}"]`);
  const therapistName = card ? card.querySelector('.therapist-info h3')?.textContent : 'Terapeuta';
  
  // Count patients for this therapist
  const patientCount = countPatientsForTherapist(therapistId);
  
  // Store the ID to delete
  window.therapistToDelete = therapistId;
  window.therapistName = therapistName;
  window.patientCountToReassign = patientCount;
  
  // Update patient count display
  const countDisplay = document.getElementById('patientCountDisplay');
  if (countDisplay) {
    countDisplay.textContent = `Este terapeuta tiene ${patientCount} paciente(s) asignado(s).`;
  }
  
  // Populate therapist options (all except the one being deleted)
  populateTherapistOptionsForReassign(therapistId);
  
  // Show/hide reassign section based on patient count
  const reassignContainer = document.getElementById('patientReassignContainer');
  if (reassignContainer) {
    reassignContainer.style.display = patientCount > 0 ? 'block' : 'none';
  }
  
  confirmModal.classList.add('show');
}

function populateTherapistOptionsForReassign(excludeTherapistId) {
  const select = document.getElementById('newTherapistSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Selecciona un terapeuta --</option>';
  
  try {
    const cards = document.querySelectorAll('.therapist-card');
    cards.forEach(card => {
      const cardTherapistId = card.getAttribute('data-therapist-id');
      if (cardTherapistId !== excludeTherapistId) {
        const nameEl = card.querySelector('.therapist-info h3');
        const name = nameEl ? nameEl.textContent : `Terapeuta ${cardTherapistId}`;
        const option = document.createElement('option');
        option.value = cardTherapistId;
        option.textContent = name;
        select.appendChild(option);
      }
    });
  } catch (e) {
    console.error('Error al cargar terapeutas:', e);
  }
}

function toggleReassignSection() {
  const container = document.getElementById('patientReassignContainer');
  if (container) {
    const isVisible = container.style.display !== 'none';
    container.style.display = isVisible ? 'none' : 'block';
  }
}

function reassignPatientsToNew() {
  const newTherapistId = document.getElementById('newTherapistSelect').value;
  
  if (!newTherapistId) {
    alert('Por favor, selecciona un terapeuta.');
    return;
  }
  
  try {
    const patients = getTherapistPatients().slice();
    const oldTherapistId = window.therapistToDelete;
    
    // Reasign all patients from old therapist to new therapist
    let reassignedCount = 0;
    patients.forEach(patient => {
      if (therapistMatches(patient, oldTherapistId)) {
        patient.assignedTherapist = newTherapistId;
        reassignedCount++;
      }
    });
    
    if (reassignedCount > 0) {
      window.__therapistPatients = patients;
      // persist changes to localStorage so other pages see updated assignments
      try{ localStorage.setItem('therapist_patients', JSON.stringify(patients)); }catch(e){ console.warn('Could not persist reassigned patients', e); }
      refreshTherapistPatientCache();
      try{ window.dispatchEvent(new Event('patients:updated')); }catch(e){}
      try{ window.dispatchEvent(new Event('app-data-changed')); }catch(e){}

      // Update the success message
      showSuccessMessage(`${reassignedCount} paciente(s) reasignado(s) correctamente.`);

      // Hide reassign section
      document.getElementById('patientReassignContainer').style.display = 'none';

      // Update patient count display to 0
      document.getElementById('patientCountDisplay').textContent = 'Todos los pacientes han sido reasignados.';

      // Store that reassignment is done so the delete flow can proceed
      window.reassignmentDone = true;
    }
  } catch (e) {
    console.error('Error al reasignar pacientes:', e);
    alert('Error al reasignar los pacientes.');
  }
}

function closeDeleteConfirmModal() {
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.classList.remove('show');
  window.therapistToDelete = null;
}

function confirmDeleteTherapist() {
  const therapistId = window.therapistToDelete;
  if (!therapistId) return;
  
  try {
    // reload current lists from localStorage when available
    let list = [];
    try{ list = JSON.parse(localStorage.getItem('therapists')||'[]') || []; }catch(e){ list = Array.isArray(window.__therapists) ? window.__therapists : []; }

    // count assigned patients
    const patients = getTherapistPatients();
    const assigned = patients.filter(p => therapistMatches(p, therapistId)).length;

    // if there are patients and reassignment hasn't been done, require reassignment first
    if(assigned > 0 && !window.reassignmentDone){
      alert('Este terapeuta tiene pacientes. Reasígnelos antes de eliminar.');
      return;
    }

    const index = list.findIndex(t => t.id === therapistId || t.id === therapistId.replace(/^t/, ''));
    if (index > -1) {
      list.splice(index, 1);
      // persist new therapists list
      try{ localStorage.setItem('therapists', JSON.stringify(list)); }catch(e){ console.warn('Could not persist therapists after delete', e); }
        // update in-memory cache and notify
      window.__therapists = list;
      try{ window.dispatchEvent(new Event('therapists:updated')); }catch(e){}
      try{ window.dispatchEvent(new Event('app-data-changed')); }catch(e){}

      // remove card from DOM
      const card = document.querySelector(`[data-therapist-id="${therapistId}"]`);
      if (card) card.remove();
      closeDeleteConfirmModal();
      showSuccessMessage('Terapeuta eliminado correctamente.');
      // clear reassignment flag
      window.reassignmentDone = false;
    } else {
      alert('No se encontró el terapeuta.');
    }
  } catch (e) {
    console.error('Error al borrar terapeuta:', e);
    alert('Error al borrar el terapeuta.');
  }
}

function showSuccessMessage(message) {
  const msgEl = document.createElement('div');
  msgEl.className = 'success-message';
  msgEl.textContent = message;
  document.body.appendChild(msgEl);
  setTimeout(() => msgEl.remove(), 3000);
}

function ensureEditModal() {
  if (document.getElementById('therapistEditModal')) return;

  const modal = document.createElement('div');
  modal.id = 'therapistEditModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2>Editar Terapeuta</h2>
          <p class="modal-sub">Actualiza la información y pulsa Guardar para aplicar los cambios</p>
        </div>
        <button class="close-btn" onclick="closeEditModal()">×</button>
      </div>
      <div class="modal-body">
        <form id="editTherapistForm">
          <input type="hidden" id="editTid">
          <div class="field-grid">
            <div class="form-group input-with-icon">
              <label>Nombre</label>
              <div class="input-row"><span class="field-icon">👤</span><input id="editNombre" type="text" required placeholder="Nombre completo"></div>
            </div>

            <div class="form-group input-with-icon">
              <label>Especialidad</label>
              <div class="input-row"><span class="field-icon">🩺</span><input id="editEspecialidad" type="text" placeholder="p. ej. Fisioterapia deportiva"></div>
            </div>

            <div class="form-group input-with-icon">
              <label>Teléfono</label>
              <div class="input-row"><span class="field-icon">📞</span><input id="editTelefono" type="text" placeholder="Ej: 555-123-4567"></div>
            </div>

            <div class="form-group input-with-icon">
              <label>Email</label>
              <div class="input-row"><span class="field-icon">✉️</span><input id="editEmail" type="email" placeholder="correo@ejemplo.com"></div>
            </div>

            <div class="form-group input-with-icon">
              <label>Experiencia (años)</label>
              <div class="input-row"><span class="field-icon">🎓</span><input id="editExperiencia" type="number" min="0" placeholder="Años de experiencia"></div>
            </div>

            <div class="form-group">
              <label>Estado</label>
              <select id="editEstado">
                <option value="Activo">Activo</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div class="form-group">
              <label>Foto</label>
              <div class="photo-input-row">
                <div class="photo-preview">
                  <img id="editPhotoPreview" src="${buildTherapistAvatar()}" alt="Preview">
                </div>
                <div class="photo-input-controls">
                  <input type="file" id="editPhoto" accept="image/*">
                  <button type="button" class="btn btn-secondary btn-sm" id="clearEditPhotoFile">Eliminar foto</button>
                </div>
              </div>
              <input type="hidden" id="editPhotoData">
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>`;

  document.body.appendChild(modal);
  const photoInput = document.getElementById('editPhoto');
  if(photoInput) photoInput.addEventListener('change', handleEditPhotoChange);
  const clearBtn = document.getElementById('clearEditPhotoFile');
  if(clearBtn) clearBtn.addEventListener('click', ()=> resetEditPhotoInput(''));

  const form = document.getElementById('editTherapistForm');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    saveTherapistEdits();
  });
}

function editTherapist(id) {
  ensureEditModal();
  // accept id in multiple formats: full data-therapist-id (e.g. 't123' or ObjectId), or raw id
  const tryIds = [];
  if (!id) return alert('ID inválido');
  tryIds.push(String(id));
  if (!String(id).startsWith('t')) tryIds.push('t' + id);
  else tryIds.push(String(id).replace(/^t/, ''));
  // try to find a matching card for any candidate
  let card = null;
  for (const candidate of tryIds){
    card = document.querySelector(`[data-therapist-id="${candidate}"]`);
    if(card) { id = candidate; break; }
  }
  if (!card) {
    alert('No se encontró la tarjeta del terapeuta.');
    return;
  }

  // populate fields from card
  const dataset = card.dataset || {};
  const tid = card.getAttribute('data-therapist-id');
  document.getElementById('editTid').value = tid;
  document.getElementById('editNombre').value = dataset.name || (card.querySelector('.therapist-info h3')?.textContent?.trim() || '');
  document.getElementById('editEspecialidad').value = dataset.specialty || '';
  document.getElementById('editTelefono').value = dataset.phone || '';
  document.getElementById('editEmail').value = dataset.email || '';
  document.getElementById('editExperiencia').value = dataset.experience || '';
  document.getElementById('editEstado').value = dataset.status || (card.querySelector('.status-badge')?.textContent.trim() || 'Activo');
  const photoValue = dataset.photo || '';
  resetEditPhotoInput(photoValue);

  // show modal (use class to trigger CSS)
  const modal = document.getElementById('therapistEditModal');
  if (modal) modal.classList.add('show');
}

function closeEditModal() {
  const modal = document.getElementById('therapistEditModal');
  if (modal) modal.classList.remove('show');
  resetEditPhotoInput('');
}

function saveTherapistEdits() {
  const tid = document.getElementById('editTid').value;
  const card = document.querySelector(`[data-therapist-id="${tid}"]`);
  if (!card) {
    alert('Error al guardar: tarjeta no encontrada.');
    return;
  }

  const nombre = document.getElementById('editNombre').value.trim();
  const especialidad = document.getElementById('editEspecialidad').value.trim();
  const telefono = document.getElementById('editTelefono').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const experiencia = document.getElementById('editExperiencia').value.trim();
  const estado = document.getElementById('editEstado').value;
  const photoData = document.getElementById('editPhotoData').value;

  // Update DOM
  const nameEl = card.querySelector('.therapist-info h3');
  if (nameEl) nameEl.textContent = nombre;

  const details = card.querySelectorAll('.therapist-details p');
  if (details[0]) details[0].innerHTML = `<strong>Especialidad:</strong> ${especialidad}`;
  if (details[1]) details[1].innerHTML = `<strong>📞 Teléfono:</strong> ${telefono}`;
  if (details[2]) details[2].innerHTML = `<strong>📧 Email:</strong> ${email}`;
  if (details[3]) details[3].innerHTML = `<strong>🎓 Experiencia:</strong> ${experiencia} años`;

  const statusEl = card.querySelector('.status-badge');
  if (statusEl) {
    statusEl.textContent = estado;
    statusEl.className = 'status-badge';
    if (estado.toLowerCase() === 'activo') statusEl.classList.add('status-active');
    else if (estado.toLowerCase() === 'pendiente') statusEl.classList.add('status-pending');
    else statusEl.classList.add('status-inactive');
  }

  const avatarImg = card.querySelector('.therapist-avatar img');
  const photoSrc = photoData || buildTherapistAvatar(card.dataset.photo || '');
  if (avatarImg) avatarImg.src = photoSrc;

  card.dataset.name = nombre;
  card.dataset.specialty = especialidad;
  card.dataset.phone = telefono;
  card.dataset.email = email;
  card.dataset.experience = experiencia;
  card.dataset.status = estado;
  card.dataset.photo = photoData || '';

  // Persist to localStorage if therapists array exists
  try {
    const list = JSON.parse(localStorage.getItem('therapists') || '[]');
    const index = list.findIndex(t => t.id === tid || t.id === tid.replace(/^t/,'') || t.id === tid);
    if (index > -1) {
      list[index].name = nombre;
      list[index].specialty = especialidad;
      list[index].phone = telefono;
      list[index].email = email;
      list[index].experience = experiencia;
      list[index].active = (estado.toLowerCase() === 'activo');
      list[index].photo = photoData || '';
      list[index].status = estado;
      localStorage.setItem('therapists', JSON.stringify(list));
      window.__therapists = list;
      // notify
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    // ignore persistence errors
    console.warn('No se pudo persistir cambios en localStorage:', e);
  }

  closeEditModal();
}

// Build a therapist card DOM node from a therapist object
function buildTherapistCard(t) {
  const el = document.createElement('div');
  el.className = 'therapist-card';
  const tid = t.id || t._id || ('t' + (t.id || t._id || Math.random().toString(36).slice(2)));
  el.setAttribute('data-therapist-id', tid);
  el.dataset.photo = t.photo || '';
  el.dataset.specialty = t.specialty || t.speciality || '';
  el.dataset.phone = t.phone || '';
  el.dataset.email = t.email || '';
  el.dataset.experience = t.experience || t.years || '';
  el.dataset.status = t.active ? 'Activo' : (t.status || 'Pendiente');
  el.dataset.name = t.name || '';
  el.innerHTML = `
    <div class="therapist-header">
      <div class="therapist-profile-info">
        <div class="therapist-avatar">
          <img src="${buildTherapistAvatar(t.photo)}" alt="${t.name || ''}">
        </div>
        <div class="therapist-info">
          <h3>${t.name || ''}</h3>
          <span class="status-badge ${t.active ? 'status-active' : (t.status === 'Pendiente' ? 'status-pending' : 'status-inactive')}">${t.active ? 'Activo' : (t.status || 'Pendiente')}</span>
        </div>
      </div>
    </div>
    <div class="therapist-details">
      <p><strong>Especialidad:</strong> ${t.specialty || t.speciality || ''}</p>
      <p><strong>📞 Teléfono:</strong> ${t.phone || ''}</p>
      <p><strong>📧 Email:</strong> ${t.email || ''}</p>
      <p><strong>🎓 Experiencia:</strong> ${t.experience || t.years || ''} años</p>
      <p class="patient-count"><strong>👥 Pacientes:</strong> <span class="patient-number">0</span></p>
    </div>
    <div class="therapist-actions">
      <button class="btn btn-action btn-edit" onclick="editTherapist('${(tid||'').replace(/'/g,"\\'")}')">Editar</button>
      <a class="btn btn-action btn-view" href="../Pacientes/pacientes-por-terapeuta.html?therapist=${encodeURIComponent(tid)}">Ver pacientes</a>
      <button class="btn btn-action btn-danger" onclick="deleteTherapist('${(tid||'').replace(/'/g,"\\'")}')">Borrar</button>
    </div>`;
  return el;
}

// Load therapists from server and render; fallback to existing DOM/localStorage
async function loadAndRenderTherapists() {
  const container = document.getElementById('therapistsContainer');
  if (!container) return;
  // Try to fetch server list, but always merge with localStorage entries (local may have unsynced items)
  let serverList = null;
  try {
    const token = window.__authToken || null;
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    // fetch therapists from admin API (requires admin token)
    const resp = await fetch('/api/admin/terapeutas', { headers });
    if (resp.ok) {
      const j = await resp.json();
      // server returns { terapeutas: [...] }
      serverList = Array.isArray(j.terapeutas) ? j.terapeutas : (Array.isArray(j) ? j : null);
    } else {
      console.warn('Therapist API responded with', resp.status);
    }
    // also attempt to fetch patients for counts
    if (token) {
      try {
        const pr = await fetch('/api/admin/pacientes', { headers });
        if (pr.ok) {
          const pj = await pr.json();
          // pj.pacientes is array
          window.__adminPatients = Array.isArray(pj.pacientes) ? pj.pacientes : [];
        }
      } catch(e){ console.warn('Could not fetch pacientes for counts', e); }
    }
  } catch (e) {
    console.warn('Could not fetch therapists from API', e);
  }

  let localList = [];
  try {
    // prefer in-memory list if present
    if(Array.isArray(window.__therapists) && window.__therapists.length) localList = window.__therapists;
    else {
      // fallback: read persisted therapists from localStorage
      try{ localList = JSON.parse(localStorage.getItem('therapists') || '[]') || []; }catch(e){ localList = []; }
      // also mirror into in-memory cache for other modules
      window.__therapists = localList;
    }
  } catch(e){ localList = []; }

  // Merge by email (server wins), fall back to id when no email
  const map = new Map();
  // add local first
  (localList||[]).forEach(t => {
    const key = (t.email||t.id||'').toString().toLowerCase();
    if(key) map.set(key, t);
    else map.set(t.id || ('local_'+Math.random().toString(36).slice(2)), t);
  });
  // overlay server data
  if(serverList && Array.isArray(serverList)){
    serverList.forEach(t => {
      const key = (t.email||t._id||t.id||'').toString().toLowerCase();
      if(key) map.set(key, t);
      else map.set(t._id || t.id || ('srv_'+Math.random().toString(36).slice(2)), t);
    });
  }

  // Render merged list
  container.innerHTML = '';
  Array.from(map.values()).forEach(t => {
    container.appendChild(buildTherapistCard(t));
  });
  // If we fetched patients from admin API, compute counts from it, otherwise fallback
  if(window.__adminPatients){
    // compute map of therapistId -> count
    const counts = {};
    window.__adminPatients.forEach(p => {
      const tid = (p.terapeutaAsignado && (p.terapeutaAsignado._id || p.terapeutaAsignado)) || null;
      if(tid) counts[tid] = (counts[tid] || 0) + 1;
    });
    document.querySelectorAll('.therapist-card').forEach(card => {
      const therapistId = card.getAttribute('data-therapist-id');
      const countEl = card.querySelector('.patient-number');
      if(countEl){
        const c = counts[therapistId] || counts[therapistId.replace(/^t/, '')] || 0;
        countEl.textContent = c;
      }
    });
  } else {
    // load patients from localStorage into the window cache so counts work
    refreshTherapistPatientCache();
    updatePatientCounts();
  }
}

// ensure modal exists early
document.addEventListener('DOMContentLoaded', function() {
  // Load dynamic therapists (from server or localStorage). Then ensure modals and counts.
  loadAndRenderTherapists().then(()=>{
    ensureEditModal();
    updatePatientCounts();
  });
  // listen for in-memory app data changes
  window.addEventListener('app-data-changed', function(){ loadAndRenderTherapists().then(updatePatientCounts); });
  // Listen for storage events and custom updates to re-render immediately
  window.addEventListener('storage', function(){
    try{ window.__therapists = JSON.parse(localStorage.getItem('therapists')||'[]') || []; }catch(e){ window.__therapists = window.__therapists || []; }
    loadAndRenderTherapists().then(updatePatientCounts);
  });
  window.addEventListener('therapists:updated', function(){
    try{ window.__therapists = JSON.parse(localStorage.getItem('therapists')||'[]') || []; }catch(e){ window.__therapists = window.__therapists || []; }
    loadAndRenderTherapists().then(updatePatientCounts);
  });
});
