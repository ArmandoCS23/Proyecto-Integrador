// JS para renderizar el historial clínico con métricas de cumplimiento
(function(){
  function readJSON(key){ try{ return JSON.parse(localStorage.getItem(key) || 'null'); }catch(e){ return null; } }

  let patients = readJSON('therapist_patients') || [];
  let assignedExercises = readJSON('assigned_exercises') || [];

  // posibles claves donde la app móvil podría guardar los logs de actividad
  const activityKeys = ['exercise_activity_logs','activity_logs','therapist_activity','therapist_history','activityEntries','user_activity'];

  function readActivities(){
    let all = [];
    activityKeys.forEach(k=>{
      const arr = readJSON(k);
      if(Array.isArray(arr)) all = all.concat(arr);
    });
    const hist = readJSON('therapist_history');
    if(Array.isArray(hist)) all = all.concat(hist.map(h=> Object.assign({}, h, { result: h.result || h.outcome || undefined })));
    return all.filter(Boolean);
  }

  // dynamic data holders (refreshed by reloadData)
  let activities = [];
  let patientList = [];

  // helper: normalizar id/keys
  function matchPatient(entry, patient){
    if(!entry || !patient) return false;
    if(entry.patientId && patient.id && String(entry.patientId) === String(patient.id)) return true;
    if(entry.patient && patient.name && String(entry.patient).toLowerCase() === String(patient.name).toLowerCase()) return true;
    return false;
  }

  function isGood(entry){
    if(!entry) return false;
    if(entry.result && String(entry.result).toLowerCase() === 'good') return true;
    if(entry.outcome && String(entry.outcome).toLowerCase() === 'good') return true;
    if(typeof entry.correct === 'boolean' && entry.correct === true) return true;
    if(typeof entry.score === 'number' && entry.score >= 0.8) return true;
    return false;
  }
  function isBad(entry){
    if(!entry) return false;
    if(entry.result && String(entry.result).toLowerCase() === 'bad') return true;
    if(entry.outcome && String(entry.outcome).toLowerCase() === 'bad') return true;
    if(typeof entry.correct === 'boolean' && entry.correct === false) return true;
    if(typeof entry.score === 'number' && entry.score < 0.8) return true;
    return false;
  }
  function isAttempt(entry){
    if(!entry) return false;
    const r = String(entry.result || entry.outcome || '').toLowerCase();
    return r === 'attempt' || r === 'try' || r === 'attempted' || entry.attempt === true;
  }

  function safeDate(d){ try{ return d ? new Date(d) : null; }catch(e){ return null; } }
  function fmtDate(d){ const dt = safeDate(d); if(!dt) return '—'; return dt.toLocaleDateString('es-ES'); }

  // check if an activity happened on a scheduled day for a matching assigned exercise
  function activityOnScheduledDay(act){
    if(!act) return false;
    const exId = act.exerciseId || act.mediaRef || act.exercise || act.pathology;
    if(!exId) return false;
    const assignment = assignedExercises.find(a => String(a.id) === String(exId) || String(a.exerciseId) === String(exId) || String(a.assignedId) === String(exId));
    if(!assignment) return false;
    const actDate = safeDate(act.date || act.at || act.timestamp || act.ts);
    if(!actDate) return false;
    // if assignment has explicit scheduledDate
    if(assignment.scheduledDate){
      const ad = new Date(assignment.scheduledDate);
      return ad.toDateString() === actDate.toDateString();
    }
    // if assignment has days array (names or numbers)
    if(Array.isArray(assignment.days) && assignment.days.length){
      const dow = actDate.getDay(); // 0=Sun .. 6=Sat
      const normalized = assignment.days.map(x=>{
        if(typeof x === 'number') return x;
        const s = String(x).toLowerCase();
        const map = { domingo:0, lunes:1, martes:2, miercoles:3, miércoles:3, jueves:4, viernes:5, sabado:6, sábado:6, sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
        return map[s] !== undefined ? map[s] : parseInt(x,10) || null;
      }).filter(n=>typeof n === 'number');
      if(normalized.includes(dow)) return true;
    }
    return false;
  }

  // Build patient list to show: prefer patients array; if empty, derive from activity entries

  function reloadData(){
    patients = readJSON('therapist_patients') || [];
    assignedExercises = readJSON('assigned_exercises') || [];
    activities = readActivities();
    // If a therapist is logged locally, restrict patients and assignedExercises to that therapist
    try{
      const cur = (window.__therapistManager && typeof window.__therapistManager.getCurrent === 'function') ? window.__therapistManager.getCurrent() : (window.__currentUser||null);
      const tid = cur ? (cur.id || cur._id || null) : null;
      if(tid){
        patients = (patients||[]).filter(p=> String(p.assignedTherapist||'') === String(tid));
        assignedExercises = (assignedExercises||[]).filter(a=> String(a.therapistId||a.assignedTo||'') === String(tid));
        // Also limit activities to only those patients
        const patientIds = (patients||[]).map(p=> String(p.id||p.name||'')).filter(Boolean);
        activities = (activities||[]).filter(a=> {
          const pid = a.patientId || a.patient || a.patientName || '';
          return patientIds.indexOf(String(pid)) !== -1;
        });
      }
    }catch(e){ /* ignore */ }

    patientList = (Array.isArray(patients) && patients.length) ? patients : (function(){
      const names = Array.from(new Set(activities.map(a=> a.patient || a.patientName || a.patientId).filter(Boolean)));
      return names.map((n,i)=> ({ id: 'p_'+i, name: String(n) }));
    })();
  }


  // NUEVO: renderizado de tarjetas y detalle
  const patientsCards = document.getElementById('patientsCards');
  const patientHistoryDetail = document.getElementById('patientHistoryDetail');

  function computeStatsForPatient(p){
    const entries = activities.filter(a => matchPatient(a,p));
    const total = entries.length;
    const good = entries.filter(isGood).length;
    const bad = entries.filter(isBad).length;
    const attempts = entries.filter(isAttempt).length;
    const compliance = total ? Math.round((good / total) * 100) : 0;
    const onTime = entries.filter(activityOnScheduledDay).length;
    const last = entries.map(e=> safeDate(e.date || e.at || e.timestamp || e.ts)).filter(Boolean).sort((a,b)=> b-a)[0];
    return { patient: p, entries, total, good, bad, attempts, compliance, onTime, last };
  }


  function renderPatientsCards(){
    patientsCards.innerHTML = '';
    const list = patientList.slice();
    if(list.length === 0){ patientsCards.innerHTML = '<div class="empty-state">No hay pacientes registrados.</div>'; return; }
    list.forEach(p=>{
      const stats = computeStatsForPatient(p);
      const card = document.createElement('div');
      card.className = 'patient-card-list';
      card.innerHTML = `
        <div class="pname">${escapeHtml(p.name||p.id||'Paciente')}</div>
        <div class="pmeta">Total de actividades: ${stats.total} · Cumplimiento: ${stats.compliance}%</div>
        <button class="btn btn-small" style="margin-top:8px" data-id="${escapeHtml(p.id)}">Ver</button>
      `;
      card.querySelector('button').onclick = () => renderPatientHistoryDetail(p);
      patientsCards.appendChild(card);
    });
  }

  function renderPatientHistoryDetail(patient){
    const stats = computeStatsForPatient(patient);
    if(!stats || !stats.entries) { patientHistoryDetail.innerHTML = '<div class="empty-state">No hay datos.</div>'; return; }
    // Agrupar por ejercicio asignado
    const byExercise = {};
    stats.entries.forEach(e=>{
      const key = e.exercise || e.pathology || e.mediaRef || e.exerciseId || 'Sin nombre';
      if(!byExercise[key]) byExercise[key] = { name: key, entries: [] };
      byExercise[key].entries.push(e);
    });
    // Obtener días asignados por ejercicio
    function getAssignedDays(exName){
      const ex = assignedExercises.find(a=> (a.exercise||a.pathology||a.mediaRef||a.name) === exName);
      if(!ex) return [];
      if(Array.isArray(ex.days)) return ex.days;
      if(ex.scheduledDate) return [ex.scheduledDate];
      return [];
    }
    // Historial por ejercicio
    const exercisesHtml = Object.keys(byExercise).map(k=>{
      const arr = byExercise[k].entries;
      const tot = arr.length;
      const good = arr.filter(isGood).length;
      const bad = arr.filter(isBad).length;
      const attempts = arr.filter(isAttempt).length;
      // Días asignados y realizados
      const assignedDays = getAssignedDays(k);
      // Mapear días realizados
      const daysDone = arr.map(a=> fmtDate(a.date||a.at||a.timestamp||a.ts));
      let diasAsignadosHtml = '';
      if(assignedDays.length){
        diasAsignadosHtml = `<div class="assigned-days"><strong>Días asignados:</strong> ${assignedDays.join(', ')}</div>`;
        diasAsignadosHtml += `<div class="done-days"><strong>Días realizados:</strong> ${daysDone.join(', ')}</div>`;
      }
      return `<div class="exercise-detail-block">
        <h4>${escapeHtml(k)}</h4>
        ${diasAsignadosHtml}
        <div class="exercise-meta">Total: ${tot} · Bien: <span class="success">${good}</span> · Mal: <span class="danger">${bad}</span> · Intentos: ${attempts}</div>
        <div class="exercise-progress-list">
          ${arr.map(a=> `<div class="exercise-progress-item">
            <div class="progress-date">${fmtDate(a.date||a.at||a.timestamp||a.ts)}</div>
            <div class="progress-result">${escapeHtml(a.result||a.outcome|| (typeof a.score==='number'?('score:'+a.score):''))}</div>
            <div class="progress-pathology">${escapeHtml(a.pathology||'')}</div>
          </div>`).join('')}
        </div>
      </div>`;
    }).join('');

    patientHistoryDetail.innerHTML = `
      <div class="detail-header">
        <h2>${escapeHtml(patient.name || patient.id || patient)}</h2>
        <div class="detail-meta">Total: ${stats.total} · Bien: <span class="success">${stats.good}</span> · Mal: <span class="danger">${stats.bad}</span> · Intentos: ${stats.attempts} · Cumplimiento: ${stats.compliance}%</div>
      </div>
      <div class="detail-body">
        <h3>Tratamiento y Progreso</h3>
        ${exercisesHtml}
      </div>
    `;
  }

  function renderPatientDetail(patient){
    const stats = computeStatsForPatient(patient);
    if(!stats || !stats.entries) { detailContainer.innerHTML = '<div class="empty-state">No hay datos.</div>'; return; }
    // aggregate by exercise
    const byExercise = {};
    stats.entries.forEach(e=>{
      const key = e.exercise || e.pathology || e.mediaRef || e.exerciseId || 'Sin nombre';
      if(!byExercise[key]) byExercise[key] = { name: key, entries: [] };
      byExercise[key].entries.push(e);
    });
    const exercisesHtml = Object.keys(byExercise).map(k=>{
      const arr = byExercise[k].entries;
      const tot = arr.length;
      const good = arr.filter(isGood).length;
      const bad = arr.filter(isBad).length;
      const attempts = arr.filter(isAttempt).length;
      const compliance = tot ? Math.round((good / tot) * 100) : 0;
      return `<div class="exercise-detail-block">
        <h4>${escapeHtml(k)}</h4>
        <div class="exercise-meta">Total: ${tot} · Bien: <span class="success">${good}</span> · Mal: <span class="danger">${bad}</span> · Intentos: ${attempts} · Cumplimiento: ${compliance}%</div>
        <div class="exercise-progress-list">
          ${arr.map(a=> `<div class="exercise-progress-item">
            <div class="progress-date">${fmtDate(a.date||a.at||a.timestamp||a.ts)}</div>
            <div class="progress-result">${escapeHtml(a.result||a.outcome|| (typeof a.score==='number'?('score:'+a.score):''))}</div>
            <div class="progress-pathology">${escapeHtml(a.pathology||'')}</div>
          </div>`).join('')}
        </div>
      </div>`;
    }).join('');

    detailContainer.classList.remove('empty');
    detailContainer.innerHTML = `
      <div class="detail-header">
        <h2>${escapeHtml(patient.name || patient.id || patient)}</h2>
        <div class="detail-meta">Total: ${stats.total} · Bien: <span class="success">${stats.good}</span> · Mal: <span class="danger">${stats.bad}</span> · Intentos: ${stats.attempts} · Cumplimiento: ${stats.compliance}%</div>
      </div>
      <div class="detail-body">
        <h3>Tratamiento y Progreso</h3>
        ${exercisesHtml}
      </div>
    `;
  }

  // wire search and seed button
  function wireControls(){
    const search = document.getElementById('searchHist');
    if(search && !search._wired){
      search._wired = true;
      search.addEventListener('input', e=> renderPatientsList(e.target.value));
    }
    const seed = document.getElementById('btnSeedData');
    if(seed && !seed._wired){ seed._wired = true; seed.addEventListener('click', ()=>{ seedSampleData(); reloadData(); renderPatientsList(); }); }
  }

  // EJEMPLO: Datos de prueba para mostrar tarjetas y detalle
  const patientList = [
    {
      id: 'p1',
      name: 'Juan Pérez',
    },
    {
      id: 'p2',
      name: 'María López',
    }
  ];

  const activities = [
    { patientId: 'p1', exercise: 'Sentadillas', date: '2025-11-10', result: 'Bien', score: 10 },
    { patientId: 'p1', exercise: 'Sentadillas', date: '2025-11-11', result: 'Mal', score: 4 },
    { patientId: 'p1', exercise: 'Estiramiento lumbar', date: '2025-11-12', result: 'Bien', score: 9 },
    { patientId: 'p2', exercise: 'Sentadillas', date: '2025-11-10', result: 'Bien', score: 8 },
    { patientId: 'p2', exercise: 'Estiramiento lumbar', date: '2025-11-11', result: 'Mal', score: 3 },
  ];

  const assignedExercises = [
    { patientId: 'p1', exercise: 'Sentadillas', days: ['2025-11-10', '2025-11-11'] },
    { patientId: 'p1', exercise: 'Estiramiento lumbar', days: ['2025-11-12'] },
    { patientId: 'p2', exercise: 'Sentadillas', days: ['2025-11-10'] },
    { patientId: 'p2', exercise: 'Estiramiento lumbar', days: ['2025-11-11'] },
  ];

  // Utilidades para demo
  function computeStatsForPatient(patient){
    const entries = activities.filter(a=>a.patientId===patient.id);
    const total = entries.length;
    const good = entries.filter(e=>e.result==='Bien').length;
    const bad = entries.filter(e=>e.result==='Mal').length;
    const attempts = total;
    const compliance = total ? Math.round((good/total)*100) : 0;
    return { patient, total, good, bad, attempts, compliance, entries };
  }
  function isGood(e){ return e.result==='Bien'; }
  function isBad(e){ return e.result==='Mal'; }
  function isAttempt(e){ return true; }
  function fmtDate(d){ return d; }
  function escapeHtml(str){ return String(str).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function reloadData(){} // No-op para demo

  function wireControls(){} // No-op para demo

  // Renderizado de tarjetas y detalle (ya implementado)
  function initialLoad(){ renderPatientsCards(); wireControls(); }

  // Ejecutar al cargar
  window.addEventListener('DOMContentLoaded', initialLoad);

  // helper: obtener query param
  function getQueryParam(name){ const params = new URLSearchParams(window.location.search); return params.get(name); }

  // expose for debugging and helpers
  window.__historial = { getQueryParam, reloadData, renderPatientsList, renderPatientDetail, seedSampleData };

  // small helpers
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // initial render
  initialLoad();

  // si se pide un paciente por query param, mostrar su detalle
  (function autoSelectFromQuery(){
    const pid = getQueryParam('patientId');
    if(!pid) return;
    // buscar por id o por nombre
    const found = patientList.find(p => String(p.id) === String(pid) || String(p.name) === String(pid) || String(p.id) === decodeURIComponent(pid));
    if(found){ renderPatientDetail(found); }
  })();

  // helper para popular datos de ejemplo (no sobreescribe si ya existen logs)
  function seedSampleData(){
    const existing = readJSON('exercise_activity_logs') || [];
    if(existing && existing.length) return console.info('exercise_activity_logs ya contiene datos, no se sobrescribirá.');
    const sample = [
      { patientId: (patientList[0] && patientList[0].id) || 'p0', patient: (patientList[0] && patientList[0].name) || 'Paciente A', exerciseId: (assignedExercises[0] && assignedExercises[0].id) || 'ex1', date: new Date().toISOString(), result: 'good', score: 0.95 },
      { patientId: (patientList[0] && patientList[0].id) || 'p0', patient: (patientList[0] && patientList[0].name) || 'Paciente A', exerciseId: (assignedExercises[0] && assignedExercises[0].id) || 'ex1', date: new Date(Date.now()-86400000).toISOString(), result: 'bad', score: 0.5 },
      { patientId: (patientList[1] && patientList[1].id) || 'p1', patient: (patientList[1] && patientList[1].name) || 'Paciente B', exerciseId: (assignedExercises[1] && assignedExercises[1].id) || 'ex2', date: new Date(Date.now()-2*86400000).toISOString(), result: 'attempt' }
    ];
    localStorage.setItem('exercise_activity_logs', JSON.stringify(sample));
    console.info('Datos de ejemplo guardados en exercise_activity_logs. Recarga o llame a window.__historial.render() para actualizar la vista.');
  }

  // Note: report generation moved to Reportes page (reportes.js)

  // logout (fallback)
  window.logoutTherapist = window.logoutTherapist || function(){ window.location.href = '../../login/index.html'; };

})();
