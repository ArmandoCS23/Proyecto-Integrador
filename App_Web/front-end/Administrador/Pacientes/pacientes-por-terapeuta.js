// pacientes-por-terapeuta.js
const DEFAULT_PATIENT_AVATAR = 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&h=200&fit=crop&crop=face';

(function(){
  const container = document.getElementById('patientsContainer');
  const therapistInfo = document.getElementById('therapistInfo');
  if(!container) return;

  const params = new URLSearchParams(window.location.search);
  const therapistId = params.get('therapist');
  const statusFilter = params.get('filter');

  function normalizeId(value){
    if(!value) return '';
    if(typeof value === 'object'){
      value = value._id || value.id || value.therapistId || value.terapeutaAsignado || value.assignedTherapist || value.assigned || '';
    }
    return String(value || '').toLowerCase().replace(/^t/, '').trim();
  }

  function readPatients(){
    try{
      const raw = JSON.parse(localStorage.getItem('therapist_patients') || '{}');
      if(Array.isArray(raw)) return raw.slice();
      return Object.keys(raw||{}).reduce((acc, key) => {
        const list = raw[key] || [];
        list.forEach(p => {
          const patient = Object.assign({}, p);
          if(!patient.assignedTherapist) patient.assignedTherapist = key;
          acc.push(patient);
        });
        return acc;
      }, []);
    }catch(e){
      console.warn('pacientes-por-terapeuta: no se pudo leer pacientes', e);
      return [];
    }
  }

  function loadTherapistPatients(){
    if(Array.isArray(window.__therapistPatients)) return window.__therapistPatients.slice();
    return readPatients();
  }

  function matchesTherapist(patient){
    if(!therapistId) return true;
    const targetNorm = normalizeId(therapistId);
    const candidate = normalizeId(patient.assignedTherapist);
    return targetNorm && candidate && candidate === targetNorm;
  }

  function isActive(patient){
    return patient.status && patient.status.toLowerCase().includes('activo');
  }

  function getPatients(){
    const patients = readPatients();
    return patients.filter(p => matchesTherapist(p) && (!statusFilter || statusFilter !== 'active' || isActive(p)));
  }

  function escapeHtml(text){ return String(text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function getTherapistName(id){
    try{
      const therapists = JSON.parse(localStorage.getItem('therapists')||'[]');
      const match = therapists.find(t => normalizeId(t.id) === normalizeId(id));
      return match ? match.name : (id || '--');
    }catch(e){
      return id || '--';
    }
  }

  function makeCard(p){
    const div = document.createElement('article');
    div.className = 'patient-card';
    const statusClass = (p.status && p.status.toLowerCase().includes('activo')) ? 'status-active' : (p.status? 'status-followup' : 'status-inactive');
    const photoSrc = p.photo || DEFAULT_PATIENT_AVATAR;
    const emailValue = (p.email || p.correo || '').trim();
    const ageValue = p.age || p.edad || '--';
    const normalizedEmail = emailValue || '--';
    div.innerHTML = `
      <header class="patient-header">
        <div class="patient-avatar">
          <img src="${escapeHtml(photoSrc)}" alt="${escapeHtml(p.name)}"> 
        </div>
        <div class="patient-info">
          <h3>${escapeHtml(p.name)}</h3>
          <p class="patient-specialty">${escapeHtml(p.diagnosis||'--')}</p>
          <p class="patient-email">${escapeHtml(normalizedEmail)}</p>
        </div>
      </header>
      <div class="patient-details">
        <p><strong>Edad:</strong> ${escapeHtml(ageValue)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(p.phone||'--')}</p>
        <p><strong>Correo:</strong> ${escapeHtml(normalizedEmail)}</p>
        <p><strong>Terapeuta asignado:</strong> ${escapeHtml(getTherapistName(p.assignedTherapist))}</p>
        <p><strong>Estado:</strong> <span class="patient-status ${statusClass}">${escapeHtml(p.status||'--')}</span></p>
      </div>
      <footer class="patient-actions">
        <button class="btn btn-primary" onclick="window.location.href='../ver perfil/ver_perfil.html?id=${encodeURIComponent(p.id)}'">Ver perfil</button>
      </footer>`;
    return div;
  }

  let list = [];

  function getVisiblePatients(searchQuery){
    const base = list.filter(p => matchesTherapist(p) && (!statusFilter || statusFilter !== 'active' || isActive(p)));
    if(!searchQuery) return base;
    const lowered = searchQuery.toLowerCase();
    return base.filter(p => (p.name||'').toLowerCase().includes(lowered) || (p.diagnosis||'').toLowerCase().includes(lowered));
  }

  function render(patients){
    container.innerHTML = '';
    if(patients.length === 0){
      container.innerHTML = '<div class="empty-state">No hay pacientes activos para este terapeuta.</div>';
      return;
    }
    patients.forEach(p => container.appendChild(makeCard(p)));
  }

  function refresh(){
    list = loadTherapistPatients();
    const searchValue = (document.getElementById('searchInput')?.value||'');
    render(getVisiblePatients(searchValue));
    if(therapistInfo){
      const displayName = getTherapistName(therapistId);
      therapistInfo.textContent = therapistId ? `Terapeuta: ${displayName}` : 'Pacientes';
    }
  }

  window.filterLocal = function(){
    const q = (document.getElementById('searchInput')?.value||'');
    render(getVisiblePatients(q));
  };

  window.addEventListener('storage', refresh);
  window.addEventListener('patients:updated', refresh);
  window.addEventListener('therapist-patients:loaded', refresh);

  refresh();
})();
