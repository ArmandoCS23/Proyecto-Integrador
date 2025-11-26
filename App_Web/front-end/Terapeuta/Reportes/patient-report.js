(function(){
  function readJSON(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
  function safeDate(d){ try{ return d ? new Date(d) : null; }catch(e){ return null; } }
  function fmtDate(d){ const dt = safeDate(d); if(!dt) return String(d||''); return dt.toLocaleString('es-ES'); }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function translateResult(r){ if(r===null||r===undefined) return ''; try{ r = String(r||'').toLowerCase(); }catch(e){ return String(r||''); } if(r==='good') return 'Bueno'; if(r==='bad') return 'Malo'; if(r==='attempt' || r==='try') return 'Intento'; if(r.indexOf('score:')===0) return `Puntaje ${r.split(':')[1]}`; return r; }

  const activitiesKeys = ['exercise_activity_logs','activity_logs','therapist_activity','therapist_history','activityEntries','user_activity'];
  function readActivities(){ let out=[]; activitiesKeys.forEach(k=>{ const a=readJSON(k); if(Array.isArray(a)) out=out.concat(a); }); return out.filter(Boolean); }
  const activities = readActivities();

  const params = new URLSearchParams(window.location.search);
  const pid = params.get('patientId');

  function matchPatient(a,pid){ if(!a || !pid) return false; if(a.patientId && String(a.patientId)===String(pid)) return true; if(a.patient && String(a.patient).toLowerCase()===String(pid).toLowerCase()) return true; if(a.patientName && String(a.patientName).toLowerCase()===String(pid).toLowerCase()) return true; return false; }

  const entries = activities.filter(a=> matchPatient(a, pid));

  function groupByExercise(entries){ const map = Object.create(null); (entries||[]).forEach(e=>{ const key = String(e.exercise||e.pathology||e.mediaRef||'Ejercicio'); if(!map[key]) map[key]=[]; map[key].push(e); }); return map; }

  function computeOverall(entries){ const total = entries.length; const good = entries.filter(e=>{ const r=String(e.result||e.outcome||'').toLowerCase(); if(r==='good') return true; if(typeof e.score==='number'&&e.score>=0.8) return true; if(e.correct===true) return true; return false; }).length; const bad = entries.filter(e=>{ const r=String(e.result||e.outcome||'').toLowerCase(); if(r==='bad') return true; if(typeof e.score==='number'&&e.score<0.8) return true; if(e.correct===false) return true; return false; }).length; const attempts = entries.filter(e=>{ const r=String(e.result||e.outcome||'').toLowerCase(); return r==='attempt' || r==='try' || e.attempt===true; }).length; const compliance = total? Math.round((good/total)*100):0; return { total, good, bad, attempts, compliance }; }

  function lastNDaysStatus(entries, n){ n = n||14; const today = new Date(); const days = []; for(let i=n-1;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); d.setHours(0,0,0,0); const dEnd=new Date(d); dEnd.setHours(23,59,59,999); const done = (entries||[]).some(e=>{ const ed = safeDate(e.date||e.at||e.timestamp||e.ts); return ed && ed >= d && ed <= dEnd; }); days.push({date:d,done}); } return days; }

  function didAllAssignedThisWindow(pid, entries, windowDays){ try{ const assigned = readJSON('assigned_exercises') || []; const forPatient = assigned.filter(a=> (a.patientId && String(a.patientId)===String(pid)) || (a.patient && String(a.patient).toLowerCase()===String(pid).toLowerCase())); if(!forPatient.length) return false; const assignedNames = new Set(forPatient.map(a=> String(a.exercise||a.name||a.pathology||a.mediaRef||'').trim()).filter(Boolean)); if(!assignedNames.size) return false; const windowStart = new Date(); windowStart.setDate(windowStart.getDate() - (windowDays||14)); windowStart.setHours(0,0,0,0); const today = new Date(); today.setHours(23,59,59,999); const present = new Set((entries||[]).filter(e=>{ const ed = safeDate(e.date||e.at||e.timestamp||e.ts); return ed && ed >= windowStart && ed <= today; }).map(e=> String(e.exercise||e.pathology||e.mediaRef||'').trim())); for(const n of assignedNames) if(!present.has(n)) return false; return true; }catch(e){ return false; } }

  // render
  const container = document.getElementById('patientReportContainer');
  if(!container) return;
  if(!pid){ container.innerHTML = '<div class="empty-state">Paciente no especificado.</div>'; return; }
  if(!entries.length){ container.innerHTML = '<div class="empty-state">No hay actividad registrada para este paciente.</div>'; return; }

  const overall = computeOverall(entries);
  const byEx = groupByExercise(entries);
  const days = lastNDaysStatus(entries, 14);
  const allAssigned = didAllAssignedThisWindow(pid, entries, 14);

  let html = `<div class="patient-report">
    <div class="report-header">
      <div class="back-button-container">
        <button class="btn-back" id="backBtn">← Volver</button>
      </div>
      <div class="patient-info-card">
        <h2>Paciente: <span class="patient-name">${escapeHtml(pid)}</span></h2>
      </div>
    </div>

    <div class="stats-container">
      <div class="stat-card">
        <div class="stat-value">${overall.total}</div>
        <div class="stat-label">Total de Actividades</div>
      </div>
      <div class="stat-card">
        <div class="stat-value success">${overall.good}</div>
        <div class="stat-label">Completadas Correctamente</div>
      </div>
      <div class="stat-card">
        <div class="stat-value danger">${overall.bad}</div>
        <div class="stat-label">Con Dificultades</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${overall.attempts}</div>
        <div class="stat-label">Intentos</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-value">${overall.compliance}%</div>
        <div class="stat-label">Cumplimiento</div>
      </div>
    </div>

    <div class="calendar-section">
      <h3>Actividad Últimos 14 Días</h3>
      <div class="days-calendar">`;
  html += days.map(d=> `<div class="day-dot-container"><span class="day-dot ${d.done? 'done':'miss'}" title="${fmtDate(d.date)}">${d.done? '✓':'−'}</span><small>${d.date.getDate()}</small></div>`).join('');
  html += `</div></div>`;

  html += `<div class="exercises-section">
    <h3>Detalles por Ejercicio</h3>`;
  Object.keys(byEx).forEach(k=>{
    const arr = byEx[k].slice().sort((a,b)=> new Date(b.date||b.at||b.timestamp||b.ts) - new Date(a.date||a.at||a.timestamp||a.ts));
    const good = arr.filter(e=>{ const r=String(e.result||e.outcome||'').toLowerCase(); if(r==='good') return true; if(typeof e.score==='number'&&e.score>=0.8) return true; if(e.correct===true) return true; return false; }).length;
    const bad = arr.length - good;
    html += `<div class="exercise-card">
      <div class="exercise-header">
        <h4>${escapeHtml(k)}</h4>
        <div class="exercise-stats">
          <span class="stat-badge">Total: ${arr.length}</span>
          <span class="stat-badge success">Bien: ${good}</span>
          <span class="stat-badge danger">Mal: ${bad}</span>
        </div>
      </div>
      <div class="exercise-attempts">`;
    arr.forEach(e=>{ 
      const isGood = String(e.result||e.outcome||'').toLowerCase() === 'good' || (typeof e.score==='number'&&e.score>=0.8) || e.correct===true;
      const raw = String(e.result||e.outcome|| (typeof e.score==='number'?('score:'+e.score):''));
      html += `<div class="attempt-item ${isGood? 'good':'bad'}">
        <span class="attempt-date">${fmtDate(e.date||e.at||e.timestamp||e.ts)}</span>
        <span class="attempt-result">${escapeHtml(translateResult(raw))}</span>
      </div>`; 
    });
    html += `</div></div>`;
  });
  html += `</div>`;

  html += `<div class="action-bar">
    <div class="status-message ${allAssigned? 'success':'warning'}">
      <strong>${allAssigned? 'Completó todas las rutinas en la ventana' : 'No completó todas las rutinas asignadas'}</strong>
    </div>
    <button class="btn btn-primary" id="downloadAll">Descargar Reporte (CSV)</button>
  </div>`;

  container.innerHTML = html;

  document.getElementById('backBtn').addEventListener('click', ()=> window.location.href='Reportes.html');
  document.getElementById('downloadAll').addEventListener('click', ()=>{
    const rows=[['Paciente', String(pid)], ['Total','Bien','Mal','Intentos','Cumplimiento (%)'], [overall.total, overall.good, overall.bad, overall.attempts, overall.compliance], [], ['Fecha','Resultado','Ejercicio']];
    entries.forEach(e=> { const raw = String(e.result||e.outcome|| (typeof e.score==='number'?('score:'+e.score):'')); rows.push([fmtDate(e.date||e.at||e.timestamp||e.ts), translateResult(raw), e.exercise||e.pathology||e.mediaRef||'']); });
    const csv = rows.map(r=> r.map(c=> '"'+String(c||'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; const name = String(pid).replace(/[^a-z0-9\-_\. ]/ig,'_'); a.download=`reporte_${name}_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

})();
