// admin-pacientes.js
// Render patients dynamically for the admin Pacientes page and support filtering
(function(){
  function readTherapists(){ return JSON.parse(localStorage.getItem('therapists')||'[]'); }
  // therapist_patients might be stored as a map { therapistId: [patients] } or as a flat array.
  function readPatients(){
    const raw = JSON.parse(localStorage.getItem('therapist_patients')||'{}');
    if(Array.isArray(raw)) return raw; // already an array of patient objects
    // otherwise it's an object mapping therapistId -> array
    const arr = [];
    Object.keys(raw || {}).forEach(tid => {
      const list = raw[tid] || [];
      (list||[]).forEach(p => {
        // ensure patient object knows assigned therapist
        const copy = Object.assign({}, p);
        copy.assignedTherapist = copy.assignedTherapist || tid;
        arr.push(copy);
      })
    })
    return arr;
  }
  const container = document.getElementById('patientsContainer');
  if(!container) return;

  const params = new URLSearchParams(window.location.search);
  const filter = params.get('filter');
  const therapistParam = params.get('therapist') || null;

  let patients = readPatients();
  let therapists = readTherapists();

  function getTherapistName(id){ if(!id) return '--'; const t = therapists.find(x=>x.id===id); return t? t.name : id; }

  function makeCard(p){
    const div = document.createElement('div');
    div.className = 'patient-card';
    const statusClass = (p.status && p.status.toLowerCase().includes('activo')) ? 'status-active' : (p.status? 'status-followup':'status-inactive');
    // use patient photo if available (data URL or stored path), otherwise fallback to admin avatar
    const photoSrc = p && p.photo ? p.photo : '../Dashboard/avatar.png';
    div.innerHTML = `
      <div class="patient-header" style="display:flex;gap:12px;align-items:center">
        <div class="patient-avatar" style="flex:0 0 auto">
          <img src="${escapeHtml(photoSrc)}" alt="Foto paciente" style="width:64px;height:64px;border-radius:8px;object-fit:cover;" />
        </div>
        <div class="patient-info" style="flex:1">
          <h3>${escapeHtml(p.name)}</h3>
          <div class="patient-specialty">${escapeHtml(p.diagnosis||'--')}</div>
        </div>
      </div>
      <div class="patient-details">
        <p><strong>Terapeuta asignado:</strong> ${escapeHtml(getTherapistName(p.assignedTherapist))}</p>
        <p><strong>Correo:</strong> ${escapeHtml(p.email||p.correo||'--')}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(p.phone||'--')}</p>
        <p><strong>Estado:</strong> <span class="patient-status ${statusClass}">${escapeHtml(p.status||'--')}</span></p>
      </div>
      <div class="patient-actions">
        <button class="btn btn-primary" onclick="window.location.href='../ver perfil/ver_perfil.html?id=${encodeURIComponent(p.id)}'">Ver perfil</button>
      </div>`;
    return div;
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Note: therapist filter select removed from the UI. If a therapist URL param exists, it will still be used.

  function renderForSelection(){
    let list = patients.slice();
    if(filter==='active') list = list.filter(p=> p.status && p.status.toLowerCase().includes('activo'));
    const selected = (therapistParam||null);
    if(selected) list = list.filter(p=> p.assignedTherapist === selected);

    container.innerHTML = '';
    if(list.length===0){ container.innerHTML = '<div class="empty-state">No hay pacientes que coincidan con el filtro.</div>'; return; }
    list.forEach(p=> container.appendChild(makeCard(p)));
  }

  // initial render
  renderForSelection();

  // update when patients/therapists change
  function refreshPatients(){ patients = readPatients(); therapists = readTherapists(); renderForSelection(); }
  window.addEventListener('storage', function(){ try{ refreshPatients(); }catch(e){} });
  window.addEventListener('patients:updated', function(){ try{ refreshPatients(); }catch(e){} });

  // also keep a window-level cache for other modules
  try{ window.__therapistPatients = patients.slice(); }catch(e){}
  // update cache when changes arrive
  function refreshAndCache(){ patients = readPatients(); try{ window.__therapistPatients = patients.slice(); }catch(e){}; renderForSelection(); }
  window.addEventListener('patients:updated', function(){ try{ refreshAndCache(); }catch(e){} });
})();
