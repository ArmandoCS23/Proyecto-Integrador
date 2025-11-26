// Renderizador del historial completo para un paciente
(function(){
  function readJSON(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
  function safeDate(d){ try{ return d ? new Date(d) : null }catch(e){ return null } }
  function fmtDate(d){ const dt = safeDate(d); if(!dt) return String(d||''); return dt.toLocaleDateString('es-ES'); }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  const params = new URLSearchParams(window.location.search);
  const pid = params.get('patientId');
  const container = document.getElementById('histContent');
  const titleEl = document.getElementById('histTitle');
  const goBack = document.getElementById('goBack');
    const activities = readActivities();
    if(!pid){ container.innerHTML = '<div class="empty-state">No se especificó paciente.</div>'; return; }

    // buscar paciente en terapeuta patients
    const patients = readJSON('therapist_patients') || [];
    const found = patients.find(p=> String(p.id)===String(pid) || String(p.name)===String(pid));
    const patientName = found ? (found.name || found.id) : pid;
    titleEl.textContent = `Historial — ${patientName}`;

    // seleccionar entradas del paciente
    const entries = activities.filter(a=> (a.patientId && String(a.patientId)===String(pid)) || (a.patient && String(a.patient).toLowerCase()===String(patientName).toLowerCase()) );
    if(!entries.length){ container.innerHTML = '<div class="empty-state">No hay registros para este paciente.</div>'; return; }

    const s = stats(entries);
    const repsMap = {};
    entries.forEach(e=>{ const k = String(e.exercise||e.pathology||e.mediaRef||'Ejercicio'); repsMap[k] = (repsMap[k]||0) + 1; });

    const assigned = getAssigned(pid).map(a=> a.exercise || a.name || a.pathology || a.mediaRef || '').filter(Boolean);

    // update cache
    cached.found = found;
    cached.entries = entries.slice();
    cached.assigned = assigned.slice();
    cached.patientName = patientName;
    cached.pid = pid;

    // summary data
    const totalReps = Object.values(repsMap).reduce((a,b)=>a+b,0);
    const weeklyAvg = computeWeeklyAverage(patientName, entries);

    // build left summary panel
    const avatarHtml = found && found.photo ?
      `<div class="summary-avatar"><img src="${escapeHtml(found.photo)}" alt="${escapeHtml(patientName)}"></div>` :
      `<div class="summary-avatar" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent),var(--primary));color:#fff;font-weight:800;font-size:1.6rem">${escapeHtml(String(patientName).split(' ').map(x=>x[0]).slice(0,2).join(''))}</div>`;

    let leftHtml = `
      <div class="summary-panel">
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center">
          ${avatarHtml}
          <div class="summary-name">${escapeHtml(patientName)}</div>
          <div class="summary-meta">Última actividad: ${fmtDate(entries[entries.length-1].date||entries[entries.length-1].at||entries[entries.length-1].timestamp||entries[entries.length-1].ts)}</div>
        </div>

        <div class="stat-list">
          <div class="stat-item"><div class="label">Total registros</div><div class="value">${s.total}</div></div>
          <div class="stat-item"><div class="label">Bien</div><div class="value success">${s.good}</div></div>
          <div class="stat-item"><div class="label">Mal</div><div class="value danger">${s.bad}</div></div>
          <div class="stat-item"><div class="label">Intentos</div><div class="value">${s.attempts}</div></div>
          <div class="stat-item"><div class="label">Cumplimiento</div><div class="value">${s.compliance}%</div></div>
        </div>

        <h4 style="margin-top:12px;margin-bottom:8px">Tendencia semanal</h4>
        <div class="trend" title="Promedio semanal de cumplimiento">
          ${(() => {
            // compute weekly averages and render mini bars
            const msWeek = 7 * 24 * 60 * 60 * 1000;
            const first = safeDate(entries[0].date||entries[0].at||entries[0].timestamp||entries[0].ts);
            const last = safeDate(entries[entries.length-1].date||entries[entries.length-1].at||entries[entries.length-1].timestamp||entries[entries.length-1].ts);
            const start = new Date(first); start.setHours(0,0,0,0);
            const end = new Date(last); end.setHours(23,59,59,999);
            const weeksArr = [];
            for(let cur=new Date(start); cur<=end; cur=new Date(cur.getTime()+msWeek)){
              const wStart = new Date(cur); const wEnd = new Date(cur.getTime()+msWeek-1);
              const weekEntries = entries.filter(e=>{ const ed=safeDate(e.date||e.at||e.timestamp||e.ts); return ed && ed>=wStart && ed<=wEnd; });
              const st = stats(weekEntries); weeksArr.push(st.compliance||0);
            }
            if(weeksArr.length===0) weeksArr.push(0);
            return weeksArr.map(v=> `<div class="trend-bar"><div class="trend-fill" style="height:${Math.max(6,Math.round((v||0)/100*100))}%;background:${ v<50 ? '#ff7a5c' : v<80 ? '#ffd36b' : '#6ed29b' }"></div></div>`).join('');
          })()}
        </div>

        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
          <button class="btn btn-ghost" id="openProfileBtn">Abrir ficha</button>
          <button class="btn" id="downloadPdf">Descargar PDF</button>
        </div>

        <h4 style="margin-top:14px;margin-bottom:8px">Ejercicios asignados</h4>
        <div class="assigned-list">
          ${assigned.length ? assigned.map(a=>`<div class="assigned-item">${escapeHtml(a)}</div>`).join('') : '<div class="assigned-item">No hay ejercicios asignados</div>'}
        </div>
      </div>`;

    // Render weeks on the right column with improved accordions and per-exercise breakdown
    let rightHtml = `<div class="detail-actions"><button class="btn-ghost" id="expandAll">Expandir todo</button><button class="btn-ghost" id="collapseAll">Colapsar todo</button></div>`;
    rightHtml += `<section class="exercises-section"><h3>Progreso por semanas</h3>`;
    weeks.forEach((w, idx)=>{
      const wkNum = idx + 1; // Semana 1 = earliest
      const weekEntries = entries.filter(e=>{ const ed = safeDate(e.date||e.at||e.timestamp||e.ts); return ed && ed >= w.start && ed <= w.end; });
      const ws = stats(weekEntries);
      const repsWeek = {};
      weekEntries.forEach(e=>{ const k = String(e.exercise||e.pathology||e.mediaRef||'Ejercicio'); repsWeek[k] = (repsWeek[k]||0) + 1; });
      const assignedNames = assigned.slice();
      const performed = new Set(weekEntries.map(e=> String(e.exercise||e.pathology||e.mediaRef||'').trim()));
      const completedAssigned = assignedNames.filter(n=> performed.has(n)).length;
      const omittedThisWeek = assignedNames.filter(n=> !performed.has(n));
      const weeklyCompliance = assignedNames.length ? Math.round((completedAssigned/assignedNames.length)*100) : 0;
      const lastActInWeek = weekEntries.slice().map(e=> safeDate(e.date||e.at||e.timestamp||e.ts)).filter(Boolean).sort((a,b)=> b - a)[0];
      const wLabel = `Semana ${wkNum} — ${fmtDate(w.start)} a ${fmtDate(w.end)}`;

      // per-exercise map
      const exMap = {};
      weekEntries.forEach(e=>{ const key = String(e.exercise||e.pathology||e.mediaRef||'Ejercicio'); exMap[key]=exMap[key]||[]; exMap[key].push(e); });

      rightHtml += `
        <div class="accordion week-block" id="week-${wkNum}">
          <div class="accordion-header">
            <div>
              <div class="accordion-title">${escapeHtml(wLabel)}</div>
              <div class="muted">Última actividad: ${ lastActInWeek ? fmtDate(lastActInWeek) : 'Sin registro' } • Registros: ${ws.total}</div>
            </div>
            <div class="muted">Promedio: <strong>${weeklyCompliance}%</strong></div>
          </div>
          <div class="accordion-body">
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">
              <div class="summary-pill">Bien: <strong>${ws.good}</strong></div>
              <div class="summary-pill">Mal: <strong>${ws.bad}</strong></div>
              <div class="summary-pill">Intentos: <strong>${ws.attempts}</strong></div>
              <div class="summary-pill">Omitidos: <strong>${omittedThisWeek.length}</strong></div>
            </div>
            <div>
              ${ Object.keys(exMap).length ? Object.keys(exMap).map(exKey => {
                  const arr = exMap[exKey]; const st = stats(arr);
                  return `<div class="exercise-detail-row"><div><strong>${escapeHtml(exKey)}</strong><div class="muted">Registros: ${arr.length} · Bien: ${st.good} · Mal: ${st.bad} · Intentos: ${st.attempts}</div></div><div class="muted">Último: ${ fmtDate(arr[0].date||arr[0].at||arr[0].timestamp||arr[0].ts) }</div></div>`;
                }).join('') : `<div class="muted">No se registraron ejercicios en esta semana</div>` }
            </div>
          </div>
        </div>`;
    });

    rightHtml += `</section>`;

    // combine into grid
    const html = `<div class="detail-grid">${leftHtml}<div class="detail-right">${rightHtml}</div></div>`;

    container.innerHTML = html;

    // wire open profile button
    const openProfileBtn = document.getElementById('openProfileBtn');
    if(openProfileBtn){ openProfileBtn.addEventListener('click', ()=>{ const pidVal = found && (found.id || found.name) ? encodeURIComponent(found.id || found.name) : encodeURIComponent(patientName); window.location.href = `../Pacientes/perfil-paciente.html?patientId=${pidVal}`; }); }

    // expand/collapse handlers
    const expandAll = document.getElementById('expandAll'); const collapseAll = document.getElementById('collapseAll');
    if(expandAll) expandAll.addEventListener('click', ()=> document.querySelectorAll('.accordion-body').forEach(b=> b.classList.add('show')));
    if(collapseAll) collapseAll.addEventListener('click', ()=> document.querySelectorAll('.accordion-body').forEach(b=> b.classList.remove('show')));

    // accordion toggles
    document.querySelectorAll('.accordion .accordion-header').forEach(h=>{ h.addEventListener('click', ()=>{ const body = h.nextElementSibling; if(!body) return; body.classList.toggle('show'); }); });

    // wire PDF button
    const pdfBtn = document.getElementById('downloadPdf'); if(pdfBtn) pdfBtn.addEventListener('click', ()=>{ if(typeof generatePdf === 'function'){ try{ generatePdf(); }catch(e){ console.error('Error generando PDF:', e); alert('No se pudo generar el PDF.'); } } else alert('PDF no disponible.'); });
          <div class="summary-pill">Mal: <strong>${ws.bad}</strong></div>
          <div class="summary-pill">Repeticiones: <strong>${Object.values(repsWeek).reduce((a,b)=>a+b,0)}</strong></div>
          <div class="summary-pill">Omitidos: <strong>${omittedThisWeek.length}</strong></div>
          <div class="summary-pill">Promedio semana: <strong>${weeklyCompliance}%</strong></div>
        </div>
        <div class="week-progress" style="margin-top:8px">
          <div class="progress-wrap" role="progressbar" aria-valuenow="${weeklyCompliance}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" style="width:${weeklyCompliance}%;"></div>
            <div class="progress-perc ${weeklyCompliance < 25 ? 'low' : ''}">${weeklyCompliance}%</div>
          </div>
        </div>
        <div class="week-body" data-week="${wkNum}" style="display:none">
          <div class="exercise-card"><div class="exercise-attempts">
            <h4>Detalle de ejercicios</h4>
            ${ Object.keys(exMap).length ? Object.keys(exMap).map(exKey => {
                const arr = exMap[exKey];
                const st = stats(arr);
                const done = arr.length; const good = st.good; const bad = st.bad; const attemptsCount = st.attempts;
                const omitted = assigned.filter(a=> String(a).trim()===String(exKey).trim()).length ? (assigned.filter(a=> String(a).trim()===String(exKey).trim()).length ? '' : '') : '';
                return `<div class="assigned-item" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><div style="font-weight:700">${escapeHtml(exKey)}</div><div style="color:var(--muted)">Reg: ${done}</div></div><div style="display:flex;gap:12px;margin-top:6px"><div class="summary-pill">Bien: <strong>${good}</strong></div><div class="summary-pill">Mal: <strong>${bad}</strong></div><div class="summary-pill">Intentos: <strong>${attemptsCount}</strong></div></div></div>`;
              }).join('') : `<div class="assigned-item">No se registraron ejercicios en esta semana</div>` }
          `;

      // list entries for this week grouped by day (earliest first)
      const daysMap = {};
      weekEntries.forEach(e=>{
        const d = safeDate(e.date||e.at||e.timestamp||e.ts);
        const dayKey = d ? d.toISOString().slice(0,10) : 'unknown';
        daysMap[dayKey] = daysMap[dayKey] || [];
        daysMap[dayKey].push(e);
      });
      const dayKeys = Object.keys(daysMap).sort();
      dayKeys.forEach(dayKey=>{
        const dayEntries = daysMap[dayKey].slice().sort((a,b)=> new Date(b.date||b.at||b.timestamp||b.ts) - new Date(a.date||a.at||a.timestamp||a.ts));
        html += `<div class="day-block"><div class="day-title">${fmtDate(dayEntries[0].date||dayEntries[0].at||dayEntries[0].timestamp||dayEntries[0].ts)}</div>`;
        dayEntries.forEach(e=>{
          const date = fmtDate(e.date||e.at||e.timestamp||e.ts);
          const ex = escapeHtml(e.exercise||e.pathology||e.mediaRef||'Ejercicio');
          const resRaw = String(e.result||e.outcome|| (typeof e.score==='number'?('score:'+e.score):'')).toLowerCase();
          const res = translateResult(resRaw);
          html += `<div class="attempt-item ${resRaw==='good' ? 'good':''} ${resRaw==='bad' ? 'bad':''}"><div><div class="attempt-date">${escapeHtml(date)}</div><div class="attempt-result"><strong>${escapeHtml(ex)}</strong> — ${escapeHtml(res)}</div></div></div>`;
        });
        html += `</div>`;
      });

      html += `</div></div></div>`; // close exercise-card, week-body, week-block
    });

    rightHtml += `</div></div></div>`; // close exercise-card, week-body, week-block
    });

    rightHtml += `</section>`;

    // combine into grid
    let html = `<div class="detail-grid">${leftHtml}<div class="detail-right">${rightHtml}</div></div>`;

    // Assigned exercises list (overall)
    if(assigned.length){ html += `<section class="exercises-section"><h3>Ejercicios asignados</h3>`; assigned.forEach(a=>{ html += `<div class="exercise-card"><div class="exercise-header"><h4>${escapeHtml(a)}</h4></div></div>`; }); html += `</section>`; }

    container.innerHTML = html;

    // wire toggle buttons for weeks
    document.querySelectorAll('button[data-toggle-week]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const wnum = btn.getAttribute('data-toggle-week');
        const body = document.querySelector('.week-body[data-week="'+wnum+'"]');
        if(!body) return; body.style.display = body.style.display === 'none' ? 'block' : 'none';
        btn.textContent = body.style.display === 'none' ? 'Ver' : 'Ocultar';
      });
    });

    // animate and style progress bars: color ranges and visible percentage bubble
    (function animateProgressBars(){
      document.querySelectorAll('.week-progress').forEach(wp=>{
        const fill = wp.querySelector('.progress-fill');
        const perc = wp.querySelector('.progress-perc');
        if(!fill || !perc) return;
        // read percent from inline width (e.g. '45%') or aria
        let percent = 0;
        if(fill.style && fill.style.width) percent = parseInt(fill.style.width,10) || 0;
        if(!percent && wp.querySelector('[role="progressbar"]')){
          const bar = wp.querySelector('[role="progressbar"]');
          percent = parseInt(bar.getAttribute('aria-valuenow')) || percent;
        }

        // set range classes
        fill.classList.remove('range-low','range-mid','range-high');
        perc.classList.remove('range-low','range-mid','range-high','outside');
        if(percent < 50) { fill.classList.add('range-low'); perc.classList.add('range-low'); }
        else if(percent < 80){ fill.classList.add('range-mid'); perc.classList.add('range-mid'); }
        else { fill.classList.add('range-high'); perc.classList.add('range-high'); }

        // animate fill from 0 to percent
        fill.style.width = '0%';
        // ensure layout measured
        requestAnimationFrame(()=>{
          requestAnimationFrame(()=>{ fill.style.width = percent + '%'; });
        });

        // after animation, position bubble inside/outside depending on fill pixel width
        setTimeout(()=>{
          const wrap = wp.querySelector('.progress-wrap');
          if(!wrap) return;
          const wrapW = wrap.clientWidth || (wrap.getBoundingClientRect && wrap.getBoundingClientRect().width) || 200;
          const fillW = Math.round(wrapW * (percent/100));
          // if fill is too small, move the bubble outside (left of fill) for visibility
          if(fillW < 56){
            perc.classList.add('outside');
            // ensure contrast (inline fallback)
            perc.style.left = Math.max(8, fillW + 8) + 'px';
            perc.style.right = 'auto';
          } else {
            perc.style.left = 'auto'; perc.style.right = '8px';
            perc.classList.remove('outside');
          }
        }, 260);

        // animate numeric counter
        (function animateNumber(){
          let current = 0; const target = Math.max(0, Math.min(100, percent));
          const step = Math.max(1, Math.floor(target / 18));
          const t = setInterval(()=>{
            current += step;
            if(current >= target){ perc.textContent = target + '%'; clearInterval(t); }
            else perc.textContent = current + '%';
          }, 20);
        })();
      });
    })();

    // wire PDF button to our generator (fallback to reportes if available)
    const pdfBtn = document.getElementById('downloadPdf');
    if(pdfBtn) pdfBtn.addEventListener('click', ()=>{
      if(typeof generatePdf === 'function'){ try{ generatePdf(); }catch(e){ console.error('Error generando PDF:', e); alert('No se pudo generar el PDF.'); } }
      else if(window.__reportes && window.__reportes.downloadPdfForPatient) { window.__reportes.downloadPdfForPatient(found || { id: pid, name: patientName }); }
      else alert('PDF no disponible.');
    });
  }

  // PDF generation for historial detalle (uses cached data)
  function generatePdf(){
    try{
      const data = cached; if(!data || !data.entries || !data.entries.length){ alert('No hay datos para exportar'); return; }
      // robust jsPDF constructor detection
      let doc = null;
      if(window.jspdf && window.jspdf.jsPDF) doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
      else if(window.jsPDF) doc = new window.jsPDF({ unit: 'pt', format: 'a4' });
      else if(window.jspdf && typeof window.jspdf === 'function') doc = new window.jspdf({ unit: 'pt', format: 'a4' });
      if(!doc){ alert('jsPDF no disponible en esta página. Comprueba que la librería esté cargada.'); return; }

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 36; let y = 48;

      // color ranges matching CSS
      const COLORS = { low: '#ff7a5c', mid: '#ffd36b', high: '#6ed29b', bgBar: '#eef6ff', text: '#0f2233' };

      // Header
      doc.setFontSize(18); try{ doc.setFont('helvetica','bold'); }catch(e){}
      doc.setTextColor(COLORS.text); doc.text('Historial del paciente', margin, y);
      doc.setFontSize(11); try{ doc.setFont('helvetica','normal'); }catch(e){}
      doc.text(`Paciente: ${data.patientName}`, margin, y + 20);
      doc.text(`Exportado: ${new Date().toLocaleString('es-ES')}`, pageW - margin, y + 20, { align: 'right' });
      y += 40;

      // overall stats block
      const overall = stats(data.entries);
      doc.setFillColor(250,250,252); doc.rect(margin, y, pageW - margin*2, 36, 'F');
      doc.setFontSize(10); doc.setTextColor('#22303f'); doc.text(`Registros: ${overall.total}   Bien: ${overall.good}   Mal: ${overall.bad}   Intentos: ${overall.attempts}   Cumplimiento: ${overall.compliance}%`, margin + 10, y + 22);
      y += 50;

      // weeks
      doc.setFontSize(13); try{ doc.setFont('helvetica','bold'); }catch(e){} doc.text('Progreso por semanas', margin, y); y += 18;

      const weeks = (function(){
        const entries = data.entries.slice().sort((a,b)=> new Date(a.date||a.at||a.timestamp||a.ts) - new Date(b.date||b.at||b.timestamp||b.ts));
        const first = safeDate(entries[0].date||entries[0].at||entries[0].timestamp||entries[0].ts);
        const last = safeDate(entries[entries.length-1].date||entries[entries.length-1].at||entries[entries.length-1].timestamp||entries[entries.length-1].ts);
        const start = new Date(first); start.setHours(0,0,0,0);
        const end = new Date(last); end.setHours(23,59,59,999);
        const msWeek = 7 * 24 * 60 * 60 * 1000; const out=[];
        for(let cur=new Date(start); cur<=end; cur=new Date(cur.getTime()+msWeek)) out.push({start:new Date(cur), end:new Date(cur.getTime()+msWeek-1)});
        return out;
      })();

      weeks.forEach((w, idx)=>{
        const wkNum = idx+1;
        const weekEntries = data.entries.filter(e=>{ const ed=safeDate(e.date||e.at||e.timestamp||e.ts); return ed && ed>=w.start && ed<=w.end; });
        const ws = stats(weekEntries);
        const assignedNames = data.assigned.slice();
        const performed = new Set(weekEntries.map(e=> String(e.exercise||e.pathology||e.mediaRef||'').trim()));
        const completedAssigned = assignedNames.filter(n=> performed.has(n)).length;
        const weeklyCompliance = assignedNames.length? Math.round((completedAssigned/assignedNames.length)*100):0;

        if(y > pageH - 160){ doc.addPage(); y = margin; }

        // week title
        doc.setFontSize(11); try{ doc.setFont('helvetica','bold'); }catch(e){} doc.setTextColor('#0b69c9'); doc.text(`Semana ${wkNum} — ${fmtDate(w.start)} a ${fmtDate(w.end)}`, margin, y);
        y += 14;

        // summary
        doc.setFontSize(10); try{ doc.setFont('helvetica','normal'); }catch(e){} doc.setTextColor('#22303f');
        doc.text(`Registros: ${ws.total}   Bien: ${ws.good}   Mal: ${ws.bad}   Omitidos: ${assignedNames.length - completedAssigned}   Cumplimiento: ${weeklyCompliance}%`, margin, y);
        y += 12;

        // draw progress bar background
        const barW = pageW - margin*2; const barH = 12; const barX = margin; const barY = y;
        const bgRgb = hexToRgbArr(COLORS.bgBar);
        doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]); doc.rect(barX, barY, barW, barH, 'F');

        // choose color
        let fillColor = COLORS.mid; if(weeklyCompliance < 50) fillColor = COLORS.low; else if(weeklyCompliance >= 80) fillColor = COLORS.high;
        const fillW = Math.max(0, Math.min(100, weeklyCompliance))/100 * barW;
        const fillRgb = hexToRgbArr(fillColor);
        doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]); doc.rect(barX, barY, fillW, barH, 'F');

        // percentage text: inside if fits, otherwise outside to right
        doc.setFontSize(10);
        const percText = `${weeklyCompliance}%`;
        let percWidth = 0;
        try{ percWidth = (typeof doc.getTextWidth === 'function') ? doc.getTextWidth(percText) + 8 : percText.length * 6 + 8; }catch(e){ percWidth = percText.length * 6 + 8; }
        if(fillW > percWidth + 8){ // fits inside
          doc.setTextColor('#ffffff'); doc.text(percText, barX + fillW - 6 - (percWidth/2), barY + barH + 8);
        } else {
          doc.setTextColor('#0f2233'); doc.text(percText, barX + fillW + 8, barY + barH + 8);
        }

        y += barH + 18;

        // day entries
        const daysMap = {};
        weekEntries.forEach(e=>{ const d = safeDate(e.date||e.at||e.timestamp||e.ts); const key = d? d.toISOString().slice(0,10): 'unknown'; (daysMap[key]=daysMap[key]||[]).push(e); });
        const dayKeys = Object.keys(daysMap).sort();
        dayKeys.forEach(dayKey=>{
          if(y > pageH - 80){ doc.addPage(); y = margin; }
          doc.setFontSize(10); try{ doc.setFont('helvetica','bold'); }catch(e){} doc.setTextColor('#0b69c9'); doc.text(fmtDate(dayKeys.length? daysMap[dayKey][0].date : dayKey), margin, y);
          y += 12;
          try{ doc.setFont('helvetica','normal'); }catch(e){} doc.setFontSize(10); doc.setTextColor('#22303f');
          daysMap[dayKey].forEach(e=>{
            const dateStr = fmtDate(e.date||e.at||e.timestamp||e.ts);
            const ex = String(e.exercise||e.pathology||e.mediaRef||'Ejercicio');
            const resRaw = String(e.result||e.outcome|| (typeof e.score==='number'?('score:'+e.score):'')).toLowerCase();
            const res = (resRaw==='good')? 'Bien' : (resRaw==='bad')? 'Mal' : (resRaw==='attempt' || resRaw==='try')? 'Intento' : (resRaw.indexOf('score:')===0? 'Puntaje '+resRaw.split(':')[1] : resRaw);
            const line = `• ${dateStr} — ${ex} — ${res}`;
            const split = doc.splitTextToSize(line, pageW - margin*2 - 20);
            if(y + (split.length*12) > pageH - 40){ doc.addPage(); y = margin; }
            doc.text(split, margin + 6, y);
            y += split.length * 12 + 4;
          });
        });

        y += 8;
      });

      // save pdf
      const name = (data.patientName||data.pid||'historial').toString().replace(/[^a-z0-9\-_\. ]/ig,'_');
      doc.save(`historial_${name}_${new Date().toISOString().slice(0,10)}.pdf`);
    }catch(e){ console.error('Error en generatePdf:', e); alert('No se pudo generar el PDF: ' + (e && e.message ? e.message : String(e))); }

    // helper to convert hex to rgb array for jsPDF
    function hexToRgbArr(hex){ if(!hex) return [230,240,255]; const h = hex.replace('#',''); const bigint = parseInt(h.length===3? h.split('').map(c=>c+c).join('') : h,16); const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255; return [r,g,b]; }
  }

  function translateResult(r){ if(!r) return ''; r = String(r).toLowerCase(); if(r==='good') return 'Bien'; if(r==='bad') return 'Mal'; if(r==='attempt' || r==='try') return 'Intento'; if(r.indexOf('score:')===0) return `Puntaje ${r.split(':')[1]}`; return r; }

  function computeWeeklyAverage(patientName, entries){ try{
    const assigned = getAssigned(patientName).map(a=> String(a.exercise||a.name||a.pathology||a.mediaRef||'').trim()).filter(Boolean);
    if(!assigned.length) return 0;
    const today = new Date(); let sums=0; let count=0;
    for(let i=6;i>=0;i--){ const d = new Date(today); d.setDate(today.getDate()-i); d.setHours(0,0,0,0); const dEnd = new Date(d); dEnd.setHours(23,59,59,999); const present = new Set(entries.filter(e=>{ const ed=safeDate(e.date||e.at||e.timestamp||e.ts); return ed && ed>=d && ed<=dEnd; }).map(e=> String(e.exercise||e.pathology||e.mediaRef||'').trim())); const completed = Array.from(present).filter(x=> assigned.indexOf(x)!==-1).length; sums += (assigned.length? completed/assigned.length : 0); count++; }
    return Math.round((sums/(count||1))*100);
  }catch(e){ return 0; } }

  // expose for manual testing
  window.__historialDetalle = { render };

  // initial render after small delay to ensure other scripts loaded
  setTimeout(render, 40);

})();
