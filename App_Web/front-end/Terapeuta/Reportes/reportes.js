// Renderizador para la página Reportes (detalle por paciente)
 (function(){
  function readJSON(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
  function getCurrentTherapistId(){
    const manager = window.__therapistManager;
    let current = null;
    if(manager && typeof manager.getCurrent === 'function') current = manager.getCurrent();
    if(!current) current = window.__currentUser || null;
    return current ? (current.id || current._id || null) : null;
  }
  function getAssignedPatients(){
    const manager = window.__therapistManager;
    if(manager && typeof manager.getAssignedPatients === 'function'){
      try{ return manager.getAssignedPatients() || []; }catch(e){ console.warn('therapist-manager getAssignedPatients failed', e); }
    }
    const raw = readJSON('therapist_patients') || [];
    const tid = getCurrentTherapistId();
    if(!tid) return Array.isArray(raw) ? raw.slice() : [];
    if(Array.isArray(raw)) return raw.filter(p => String(p.assignedTherapist || p.assigned) === String(tid));
    if(typeof raw === 'object' && raw !== null){
      return (raw[tid] || []).slice();
    }
    return [];
  }
  const activitiesKeys = ['exercise_activity_logs','activity_logs','therapist_activity','therapist_history','activityEntries','user_activity'];
  function readActivities(){ let out=[]; activitiesKeys.forEach(k=>{ const a=readJSON(k); if(Array.isArray(a)) out=out.concat(a); }); return out.filter(Boolean); }
  let patients = [];
  let allActivities = [];
  let activities = [];
  function refreshActivities(){
    const patientIds = (patients||[]).map(p=> String(p.id||p.name||'')).filter(Boolean);
    activities = (allActivities||[]).filter(a=>{
      const pid = a.patientId || a.patient || a.patientName || '';
      return patientIds.indexOf(String(pid)) !== -1;
    });
  }
  function refreshDataset(){
    patients = getAssignedPatients();
    allActivities = readActivities();
    refreshActivities();
    renderPatientsList(reportSearch && reportSearch.value);
  }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function safeDate(d){ try{ return d ? new Date(d) : null; }catch(e){ return null; } }
  function fmtDate(d){ const dt = safeDate(d); if(!dt) return String(d||''); return dt.toLocaleDateString('es-ES'); }

  function translateResult(r){ if(r===null||r===undefined) return ''; try{ r = String(r||'').toLowerCase(); }catch(e){ return String(r||''); } if(r==='good') return 'Bueno'; if(r==='bad') return 'Malo'; if(r==='attempt' || r==='try') return 'Intento'; if(r.indexOf('score:')===0) return `Puntaje ${r.split(':')[1]}`; return r; }
  const container = document.getElementById('reportPatients');
  const detail = document.getElementById('reportDetail');
  const reportSearch = document.getElementById('reportSearch');

  function matchPatient(a,p){ if(!a||!p) return false; if(a.patientId && p.id && String(a.patientId)===String(p.id)) return true; if(a.patient && p.name && String(a.patient).toLowerCase()===String(p.name).toLowerCase()) return true; return false; }
  function getAssignmentsForPatient(p){
    const assigned = readJSON('assigned_exercises') || [];
    return assigned.filter(a=> matchPatient(a,p));
  }

  function statsForPatient(p){
    const entries = (activities||[]).filter(a=> matchPatient(a,p));
    const total = entries.length;
    const good = entries.filter(e=>{ const r=String(e.result||e.outcome||'').toLowerCase(); if(r==='good') return true; if(typeof e.score==='number'&&e.score>=0.8) return true; if(e.correct===true) return true; return false; }).length;
    const bad = entries.filter(e=>{ const r=String(e.result||e.outcome||'').toLowerCase(); if(r==='bad') return true; if(typeof e.score==='number'&&e.score<0.8) return true; if(e.correct===false) return true; return false; }).length;
    const attempts = entries.filter(e=>{ const r=String(e.result||e.outcome||'').toLowerCase(); return r==='attempt' || r==='try' || e.attempt===true; }).length;
    const compliance = total? Math.round((good/total)*100):0;
    return { entries, total, good, bad, attempts, compliance };
  }

  function getAssignedNamesForPatient(p){
    const forPatient = getAssignmentsForPatient(p);
    const names = new Set(forPatient.map(a=> String(a.exercise||a.name||a.pathology||a.mediaRef||'').trim()).filter(Boolean));
    return names;
  }

  function getAssignmentsWithWeekForPatient(p){
    return getAssignmentsForPatient(p).map(a=>{
      const name = String(a.exercise||a.name||a.pathology||a.mediaRef||'').trim() || 'Ejercicio';
      const week = String(a.assignmentWeek||a.weekLabel||a.week||'').trim();
      return { name, week };
    });
  }

  function computeRepetitions(entries){
    const map = Object.create(null);
    (entries||[]).forEach(e=>{ const k = String(e.exercise||e.pathology||e.mediaRef||'').trim() || 'Ejercicio'; map[k] = (map[k]||0) + 1; });
    let reps = 0;
    Object.keys(map).forEach(k=>{ if(map[k] > 1) reps += (map[k]-1); });
    return { perExercise: map, totalRepetitions: reps };
  }

  function computeWeeklyAverageCompliance(p, entries, windowDays){
    windowDays = windowDays || 7;
    const assigned = Array.from(getAssignedNamesForPatient(p));
    if(!assigned.length) return 0;
    const today = new Date();
    let sums = 0; let countDays = 0;
    for(let i=windowDays-1;i>=0;i--){
      const d = new Date(today); d.setDate(today.getDate()-i); d.setHours(0,0,0,0);
      const dEnd = new Date(d); dEnd.setHours(23,59,59,999);
      const present = new Set((entries||[]).filter(e=>{ const ed = safeDate(e.date||e.at||e.timestamp||e.ts); return ed && ed>=d && ed<=dEnd; }).map(e=> String(e.exercise||e.pathology||e.mediaRef||'').trim()));
      const completed = Array.from(present).filter(x=> assigned.indexOf(x) !== -1).length;
      const dayPct = assigned.length ? (completed/assigned.length) : 0;
      sums += dayPct; countDays++;
    }
    return Math.round((sums / (countDays||1)) * 100);
  }

  // helper stubs removed (filters removed as requested)

  function groupByExercise(entries){
    const map = Object.create(null);
    (entries||[]).forEach(e=>{
      const key = String(e.exercise||e.pathology||e.mediaRef||'Ejercicio');
      if(!map[key]) map[key]=[];
      map[key].push(e);
    });
    return map;
  }

  function lastNDaysStatus(entries, n){
    n = n || 7;
    const today = new Date();
    const days = [];
    for(let i= n-1; i>=0; i--){
      const d = new Date(today); d.setDate(today.getDate()-i); d.setHours(0,0,0,0);
      const dEnd = new Date(d); dEnd.setHours(23,59,59,999);
      const done = (entries||[]).some(e=>{ const ed = safeDate(e.date||e.at||e.timestamp||e.ts); if(!ed) return false; return ed >= d && ed <= dEnd; });
      days.push({ date: d, done });
    }
    return days;
  }

  function didAllAssignedThisWindow(p, entries, windowDays){
    try{
      const assigned = readJSON('assigned_exercises') || [];
      const forPatient = assigned.filter(a=> (a.patientId && p.id && String(a.patientId)===String(p.id)) || (a.patient && p.name && String(a.patient).toLowerCase()===String(p.name).toLowerCase()));
      if(!forPatient.length) return false;
      const assignedNames = new Set(forPatient.map(a=> String(a.exercise||a.name||a.pathology||a.mediaRef||'').trim()).filter(Boolean));
      if(!assignedNames.size) return false;
      const windowStart = new Date(); windowStart.setDate(windowStart.getDate()- (windowDays||7)); windowStart.setHours(0,0,0,0);
      const today = new Date(); today.setHours(23,59,59,999);
      const present = new Set((entries||[]).filter(e=>{ const ed = safeDate(e.date||e.at||e.timestamp||e.ts); return ed && ed >= windowStart && ed <= today; }).map(e=> String(e.exercise||e.pathology||e.mediaRef||'').trim()));
      for(const n of assignedNames) if(!present.has(n)) return false;
      return true;
    }catch(e){ return false; }
  }

  function renderPatientsList(filter){
    container.innerHTML = '';
    const list = (patients && patients.length) ? patients.slice() : Array.from(new Set(activities.map(a=> a.patient || a.patientName || a.patientId))).map((n,i)=>({ id: 'p_'+i, name: n }));
    let shown = list;
    if(filter){ const q = filter.toLowerCase(); shown = list.filter(p=> (p.name||'').toLowerCase().includes(q)); }

    // sort by compliance desc
    shown = shown.map(p=> ({ p, s: statsForPatient(p) }))
                 .sort((a,b)=> (b.s.compliance||0) - (a.s.compliance||0));

    shown.forEach(item=>{
      const p = item.p;
      const s = item.s;
      const entries = s.entries;
      const byEx = groupByExercise(entries);

      const lastAct = entries.slice().map(e=> safeDate(e.date||e.at||e.timestamp||e.ts)).filter(Boolean).sort((a,b)=> b - a)[0];

      const card = document.createElement('div');
      card.className = 'patient-card';

      // avatar initials
      const nameStr = String(p.name || p.id || 'Paciente');
      const initials = nameStr.split(' ').filter(Boolean).slice(0,2).map(x=> x[0].toUpperCase()).join('').slice(0,2);

      // exercise pills (show up to 4)
      const exKeys = Object.keys(byEx).slice(0,4);
      const pills = exKeys.map(k=> `<span class="exercise-pill">${escapeHtml(k)}</span>`).join('');

      const pct = Math.max(0, Math.min(100, s.compliance || 0));
      let complianceLevel = 'Bajo';
      if(pct >= 80) complianceLevel = 'Alto';
      else if(pct >= 60) complianceLevel = 'Medio';

      card.innerHTML = `
        <div class="card-top">
          <div class="avatar">${escapeHtml(initials)}</div>
          <div class="info">
            <div class="pname">${escapeHtml(nameStr)}</div>
            <div class="pmeta">${s.total} actividades • ${complianceLevel} ${pct}%</div>
          </div>
        </div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%;"></div></div>
        <div class="exercise-pills">${pills || '<div class="empty-ex">Sin ejercicios registrados</div>'}</div>
        <div class="card-bottom">
          <div class="last-activity">${lastAct ? fmtDate(lastAct) : 'Sin registro'}</div>
          <div class="card-actions">
            <button class="btn-small" data-pid="${escapeHtml(p.id||p.name)}">Ver</button>
            <button class="btn-small secondary" data-pdf="${escapeHtml(p.id||p.name)}">PDF</button>
          </div>
        </div>
      `;

      // button handlers
      const viewBtn = card.querySelector('.btn-small');
      if(viewBtn) viewBtn.addEventListener('click', (ev)=>{ 
        ev.stopPropagation(); 
        const pidv = viewBtn.getAttribute('data-pid'); 
        const pObj = (patients || []).find(x=> String(x.id)===String(pidv) || String(x.name)===String(pidv)) || { id: pidv, name: pidv };
        try{ showReport(pObj); }catch(err){ console.error('Error mostrando reporte en panel:', err); window.location.href = 'patient-report.html?patientId=' + encodeURIComponent(String(pidv)); }
      });
      const pdfBtn = card.querySelector('.btn-small.secondary');
      if(pdfBtn) pdfBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); const pidv = pdfBtn.getAttribute('data-pdf'); const pObj = (patients || []).find(x=> String(x.id)===String(pidv) || String(x.name)===String(pidv)) || { id: pidv, name: pidv }; downloadPdfForPatient(pObj); });

      container.appendChild(card);
    });

    const rc = document.getElementById('reportCount'); if(rc) rc.textContent = shown.length;
  }

  function showReport(p){
    const s = statsForPatient(p);
    if(!s || s.total===0){ detail.innerHTML = '<div class="empty-state">No hay actividad registrada para este paciente.</div>'; detail.classList.add('empty'); return; }
    const byEx = groupByExercise(s.entries);
    const reps = computeRepetitions(s.entries);
    const assignedNames = Array.from(getAssignedNamesForPatient(p));
    const omitted = assignedNames.filter(n=> !(Object.keys(groupByExercise(s.entries)).indexOf(n) !== -1));
    const weeklyAvg = computeWeeklyAverageCompliance(p, s.entries, 7);
    const assignmentDetails = getAssignmentsWithWeekForPatient(p);
    let detailHtml = `<div class="detail-header"><h2>${escapeHtml(p.name||p.id)}</h2><div class="detail-meta">Total: ${s.total} · Bien: <span class="success">${s.good}</span> · Mal: <span class="danger">${s.bad}</span> · Intentos: ${s.attempts} · Cumpl: ${s.compliance}%</div></div>`;

    // Últimos registros (lista simple: fecha — resultado)
    const recent = (s.entries||[]).slice().map(e=>({d:safeDate(e.date||e.at||e.timestamp||e.ts), r: String(e.result||e.outcome|| (typeof e.score==='number'?('score:'+e.score):'')).toLowerCase(), raw:e})).filter(x=>x.d).sort((a,b)=> b.d - a.d).slice(0,7);
    if(recent.length){
      detailHtml += `<div class="recent-list" style="margin-top:10px;margin-bottom:8px">`;
      recent.forEach(r=>{ detailHtml += `<div class="recent-item">${fmtDate(r.d)} — ${escapeHtml(translateResult(r.r))}</div>`; });
      detailHtml += `</div>`;
    }

    detailHtml += `<div class="report-summary" style="margin:6px 0 8px 0;display:flex;gap:12px;flex-wrap:wrap">
      <div class="summary-pill">Repeticiones: <strong>${reps.totalRepetitions}</strong></div>
      <div class="summary-pill">Errores: <strong>${s.bad}</strong></div>
      <div class="summary-pill">Omitidos: <strong>${omitted.length}</strong></div>
      <div class="summary-pill">Promedio semanal: <strong>${weeklyAvg}%</strong></div>
    </div>`;
    if(assignmentDetails.length){
      detailHtml += `<section class="assignment-week-list">
        <h4 class="assignment-week-title">Asignaciones semanales</h4>
        ${assignmentDetails.map(detail=>`<div class="assignment-week-item"><span class="assignment-week-name">${escapeHtml(detail.name)}</span>${detail.week ? `<span class="assignment-week-label">Semana ${escapeHtml(detail.week)}</span>` : ''}</div>`).join('')}
      </section>`;
    }
    if(omitted.length){
      detailHtml += `<div style="margin:8px 0;color:#ff7043;font-weight:600">Ejercicios omitidos: ${omitted.map(x=> escapeHtml(x)).join(', ')}</div>`;
    }
    // progress with date (incluye etiqueta de porcentaje dentro de la barra)
    const lastActDate = s.entries.slice().map(e=> safeDate(e.date||e.at||e.timestamp||e.ts)).filter(Boolean).sort((a,b)=> b - a)[0];
    detailHtml += `<div class="progress-wrap" style="margin-top:8px"><div class="progress-bar" style="width:${s.compliance}%;"><span class="progress-label">${s.compliance}%</span></div></div><div style="font-size:0.9rem;color:#55607a;margin-top:6px">Última actividad: ${ lastActDate ? fmtDate(lastActDate) : 'Sin registro' }</div>`;
    detailHtml += '<div class="detail-body">';
    Object.keys(byEx).forEach(k=>{
      const arr = byEx[k];
      const good = arr.filter(e=>{ const r=String(e.result||e.outcome||'').toLowerCase(); if(r==='good') return true; if(typeof e.score==='number'&&e.score>=0.8) return true; if(e.correct===true) return true; return false; }).length;
      const bad = arr.length - good;
      detailHtml += `<div class="exercise-block"><h4>${escapeHtml(k)}</h4><div class="summary">Total: ${arr.length} · Bien: ${good} · Mal: ${bad}</div><div class="attempts">`;
      arr.sort((a,b)=> new Date(b.date||b.at||b.timestamp||b.ts) - new Date(a.date||a.at||a.timestamp||a.ts));
      arr.forEach(e=>{ const raw = String(e.result||e.outcome|| (typeof e.score==='number'?('score:'+e.score):'')); detailHtml += `<div class="attempt">${fmtDate(e.date||e.at||e.timestamp||e.ts)} — ${escapeHtml(translateResult(raw))}</div>`; });
      detailHtml += `</div></div>`;
    });
      detailHtml += `<div style="margin-top:12px"><button class="btn" id="downloadPdf">Descargar PDF</button></div>`;
    detailHtml += '</div>';
    detail.classList.remove('empty');
    detail.innerHTML = detailHtml;
      const btn = document.getElementById('downloadPdf'); if(btn) btn.addEventListener('click', ()=> downloadPdfForPatient(p));
  }

  // Descarga PDF usando jsPDF
  function downloadPdf(p, s) {
    const doc = window.jsPDF ? new window.jsPDF({ unit: 'pt', format: 'a4' }) : window.jspdf && window.jspdf.jsPDF ? new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' }) : null;
    if (!doc) { alert('No se pudo inicializar jsPDF'); return; }

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = 40;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte del paciente', margin, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const todayStr = new Date().toLocaleString('es-ES');
    doc.text(`Fecha: ${todayStr}`, pageWidth - margin, y, { align: 'right' });
    y += 22;

    // Patient name
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(String(p.name || p.id), margin, y);
    doc.setFont('helvetica', 'normal');
    y += 18;

    // Compute summary
    const reps = computeRepetitions(s.entries || []);
    const weeklyAvg = computeWeeklyAverageCompliance(p, s.entries || [], 7);
    const assignedNames = Array.from(getAssignedNamesForPatient(p));
    const performedNames = new Set((s.entries||[]).map(e=> String(e.exercise||e.pathology||e.mediaRef||'').trim()));
    const omitted = assignedNames.filter(n=> performedNames.has(n) ? false : true);

    // Summary pills (simple rectangles)
    const pillGap = 10;
    let pillX = margin;
    const pillY = y;
    const pillHeight = 20;
    const pills = [
      { label: 'Repeticiones', value: String(reps.totalRepetitions) },
      { label: 'Errores', value: String(s.bad) },
      { label: 'Ejercicios omitidos', value: String(omitted.length) },
      { label: 'Promedio semanal', value: `${weeklyAvg}%` }
    ];
    doc.setFontSize(10);
    pills.forEach(pil => {
      const text = `${pil.label}: ${pil.value}`;
      const textWidth = doc.getTextWidth(text) + 12;
      doc.setFillColor(245,245,247);
      doc.setDrawColor(220,220,220);
      doc.rect(pillX, pillY - 12, textWidth, pillHeight, 'F');
      doc.setTextColor(15,37,64);
      doc.text(text, pillX + 6, pillY + 4);
      pillX += textWidth + pillGap;
    });
    doc.setTextColor(0,0,0);
    y += 34;

    // Progress bar
    const barWidth = pageWidth - margin*2;
    const barHeight = 12;
    doc.setFillColor(236,240,255);
    doc.rect(margin, y, barWidth, barHeight, 'F');
    const fillW = Math.max(0, Math.min(100, s.compliance || 0)) / 100 * barWidth;
    doc.setFillColor(74,130,255);
    doc.rect(margin, y, fillW, barHeight, 'F');
    doc.setFontSize(10);
    doc.setTextColor(20,30,50);
    doc.text(`Progreso: ${s.compliance}%`, margin + 6, y + barHeight + 14);
    const lastActDate = s.entries.slice().map(e=> safeDate(e.date||e.at||e.timestamp||e.ts)).filter(Boolean).sort((a,b)=> b - a)[0];
    doc.text(`Última actividad: ${ lastActDate ? fmtDate(lastActDate) : 'Sin registro' }`, pageWidth - margin, y + barHeight + 14, { align: 'right' });
    y += barHeight + 28;

    // Omitted list
    if(omitted.length){
      doc.setFontSize(11);
      doc.setTextColor(220,78,0);
      const omitText = `Ejercicios omitidos: ${omitted.join(', ')}`;
      const wrapped = doc.splitTextToSize(omitText, pageWidth - margin*2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 12 + 10;
      doc.setTextColor(0,0,0);
    }

    // Activities header
    doc.setFontSize(12);
    doc.setFont('helvetica','bold');
    const colDateW = 80;
    const colResultW = 100;
    const colExerciseW = pageWidth - margin*2 - colDateW - colResultW - 10;
    doc.text('Fecha', margin, y);
    doc.text('Resultado', margin + colDateW + 6, y);
    doc.text('Ejercicio', margin + colDateW + colResultW + 12, y);
    y += 14;
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);

    // Activities rows
    (s.entries||[]).forEach(entry => {
      const dateStr = fmtDate(entry.date||entry.at||entry.timestamp||entry.ts);
      const resultStr = String(entry.result||entry.outcome|| (typeof entry.score==='number' ? ('score:'+entry.score) : '') || '');
      const resultDisplay = translateResult(resultStr);
      const exerciseStr = String(entry.exercise||entry.pathology||entry.mediaRef||'');
      const exLines = doc.splitTextToSize(exerciseStr, colExerciseW);
      const rowHeight = Math.max(12, exLines.length * 11);
      if(y + rowHeight > doc.internal.pageSize.getHeight() - margin){ doc.addPage(); y = margin; }
      doc.text(dateStr, margin, y + 10);
      doc.text(resultDisplay, margin + colDateW + 6, y + 10);
      doc.text(exLines, margin + colDateW + colResultW + 12, y + 10);
      y += rowHeight + 8;
    });

    const name = (p.name||p.id||'reporte').toString().replace(/[^a-z0-9\-_\. ]/ig,'_');
    doc.save(`reporte_${name}_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  function downloadPdfForPatient(p){ const s = statsForPatient(p); downloadPdf(p,s); }

  const refreshListeners = ['therapist-patients:loaded','therapist-manager:loaded','patients:updated','storage'];
  refreshListeners.forEach(evt => window.addEventListener(evt, refreshDataset));
  // wire search
  if(reportSearch) reportSearch.addEventListener('input', e=> renderPatientsList(e.target.value));
  // wire demo button if present
  // const demoBtn = document.getElementById('loadDemo'); // if(demoBtn) demoBtn.addEventListener('click', ()=> { demoBtn.disabled=true; demoBtn.textContent='Cargando demo...'; try{ seedDemoData(); demoBtn.textContent='Demo cargado'; }catch(e){ demoBtn.textContent='Error'; console.error(e); } setTimeout(()=> demoBtn.disabled=false,800); });

  // auto-select patientId from query
  function tryAutoSelect(){
    const params=new URLSearchParams(window.location.search);
    const pid = params.get('patientId');
    if(!pid) return;
    const found = (patients||[]).find(p=> String(p.id)===String(pid) || String(p.name)===String(pid)) || null;
    if(found){ setTimeout(()=> showReport(found), 50); }
  }

  refreshDataset();
  tryAutoSelect();

  // expose for debugging
  window.__reportes = { renderPatientsList, showReport, downloadPdfForPatient };

  // Demo data seeder removed

})();
