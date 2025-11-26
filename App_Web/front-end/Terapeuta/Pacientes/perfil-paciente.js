(function(){
  // Helper functions
  function qs(sel, parent=document){ return parent.querySelector(sel) }
  function qsa(sel, parent=document){ return Array.from(parent.querySelectorAll(sel)) }

  let currentPatientId = null;
  let currentAdjustmentId = null;
  let currentConfirmCallback = null;
  const exercisesBaseUrl = new URL('../../Administrador/Ejercicios/', window.location.href);

  function getVideoManifestEntry(videoId){
    const manifest = Array.isArray(window.__exerciseVideoManifest) ? window.__exerciseVideoManifest : [];
    return manifest.find(entry => entry && (entry.id === videoId || String(entry.id) === String(videoId))) || null;
  }

  function attachVideoFromPath(videoPath, container, isModalContext = false) {
    if (!videoPath || !container) return;
    const videoEl = document.createElement('video');
    videoEl.controls = true;
    videoEl.style.width = '100%';
    videoEl.style.borderRadius = '8px';
    videoEl.style.maxHeight = isModalContext ? '200px' : '220px';
    videoEl.style.objectFit = 'cover';
    videoEl.src = new URL(videoPath, exercisesBaseUrl).href;
    container.innerHTML = '';
    container.appendChild(videoEl);
  }

  // Modal confirmation functions
  function showConfirmModal(title, message, onConfirm) {
    qs('#confirmTitle').textContent = title;
    qs('#confirmMessage').textContent = message;
    currentConfirmCallback = onConfirm;
    qs('#confirmModal').classList.add('show');
  }

  function closeConfirmModal() {
    qs('#confirmModal').classList.remove('show');
    currentConfirmCallback = null;
  }

  function confirmAction() {
    if (currentConfirmCallback) {
      currentConfirmCallback();
    }
    closeConfirmModal();
  }

  function showAlertModal(title, message) {
    qs('#confirmTitle').textContent = title;
    qs('#confirmMessage').textContent = message;
    // Hide the cancel button and show a single OK button
    const cancelBtn = qs('#confirmModal .confirm-modal-actions .btn-secondary') || qs('#confirmModal .confirm-modal-footer .btn-secondary');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const confirmBtn = qs('#confirmBtn') || qs('#confirmActionBtn');
    if (confirmBtn) {
      confirmBtn.style.display = 'inline-block';
      confirmBtn.textContent = 'Aceptar';
      confirmBtn.onclick = closeConfirmModal;
    }
    qs('#confirmModal').classList.add('show');
  }

  function closeAlertModal() {
    // Restore buttons
    const cancelBtn = qs('#confirmModal .confirm-modal-actions .btn-secondary') || qs('#confirmModal .confirm-modal-footer .btn-secondary');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    const confirmBtn = qs('#confirmBtn') || qs('#confirmActionBtn');
    if (confirmBtn) {
      confirmBtn.style.display = 'inline-block';
      // restore default behavior if any
      confirmBtn.onclick = executeConfirmAction;
    }
    closeConfirmModal();
  }
  let currentConfirmAction = null; // Store callback for confirmation

  // Get patient ID from URL
  function getPatientIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('patientId') || params.get('id');
  }

  // Get patient data
  function getPatientData(patientId) {
    try {
      const patients = JSON.parse(localStorage.getItem('therapist_patients') || '[]');
      return patients.find(p => p.id === patientId);
    } catch(e) {
      return null;
    }
  }

  // Get exercise details by ID
  function getExerciseDetails(exerciseId) {
    try {
      const defaults = JSON.parse(localStorage.getItem('default_exercises') || '{}');
      for (const pathologyKey in defaults) {
        const exercises = defaults[pathologyKey] || [];
        const ex = exercises.find(e => e.id === exerciseId);
        if (ex) {
          ex.pathology = pathologyKey;
          return ex;
        }
      }
      return null;
    } catch(e) {
      return null;
    }
  }

  // Get pathology name from key
  function getPathologyName(key) {
    const map = {
      'espondilolisis': 'Espondilólisis',
      'escoliosis': 'Escoliosis lumbar',
      'hernia': 'Hernia de disco lumbar',
      'lumbalgia': 'Lumbalgia mecánica inespecífica'
    };
    return map[key] || key;
  }

  // Get assignments for this patient
  function normalizeId(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  function getCurrentTherapistId() {
    const cur = window.__currentUser || null;
    if (!cur) return null;
    return normalizeId(cur.id || cur._id || cur.therapistId || cur.assignedTherapist || '');
  }

  function resolvePatientRef(value) {
    if (!value) return '';
    if (typeof value === 'object') {
      return resolvePatientRef(value.id || value._id || value.code || value.patientId || value.email || value.name);
    }
    return normalizeId(value);
  }

  function matchesPatientAssignment(assignment, targetId) {
    if (!assignment || !targetId) return false;
    const patientRef = resolvePatientRef(assignment.patientId || assignment.patient || assignment.patientName);
    if (patientRef && patientRef === targetId) return true;
    const altRef = resolvePatientRef(assignment.patientCode || assignment.patient_id);
    if (altRef && altRef === targetId) return true;
    return false;
  }

  function matchesTherapistAssignment(assignment, therapistId) {
    if (!assignment || !therapistId) return false;
    const owner = assignment.therapistId || assignment.assignedTo || assignment.assignedTherapist || assignment.terapeutaAsignado || assignment.assigned;
    if (owner && normalizeId(owner) === therapistId) return true;
    if (assignment.therapist) {
      return normalizeId(assignment.therapist) === therapistId;
    }
    return false;
  }

  function getPatientAssignments(patientId) {
    try {
      const assigned = JSON.parse(localStorage.getItem('assigned_exercises') || '[]');
      const therapistId = getCurrentTherapistId();
      const normalizedPatientId = normalizeId(patientId);
      return assigned.filter(a => {
        return matchesPatientAssignment(a, normalizedPatientId) && (!therapistId || matchesTherapistAssignment(a, therapistId));
      });
    } catch(e) {
      return [];
    }
  }

  // Initialize
  function init() {
    currentPatientId = getPatientIdFromUrl();
    if (!currentPatientId) {
      showAlertModal('Error', 'No se especificó el paciente');
      setTimeout(() => history.back(), 2000);
      return;
    }

    const patient = getPatientData(currentPatientId);
    if (!patient) {
      showAlertModal('Error', 'Paciente no encontrado');
      setTimeout(() => history.back(), 2000);
      return;
    }

    // Set patient info
    qs('#pfName').textContent = escapeHtml(patient.name || 'Paciente');
    if (patient.photo) {
      qs('#pfAvatar').src = patient.photo;
    }

    // Build meta info
    const metaParts = [];
    if (patient.age) metaParts.push(`Edad: ${patient.age}`);
    if (patient.phone) metaParts.push(`Tel: ${patient.phone}`);
    if (patient.status) metaParts.push(`Estado: ${patient.status}`);
    qs('#pfMeta').textContent = metaParts.join(' · ') || 'Sin información';

    // Message button
    qs('#msgPatientBtn').addEventListener('click', () => {
      localStorage.setItem('selected_patient_chat', currentPatientId);
      window.location.href = '../messages.html';
    });

    // Render exercises
    renderAssignedExercises();
  }

  // Render assigned exercises
  function renderAssignedExercises() {
    const container = qs('#assignedExercisesList');
    const assignments = getPatientAssignments(currentPatientId);
    
      const therapistAssigned = assignments.filter(a =>
        Array.isArray(a.therapistAssignedDays) && a.therapistAssignedDays.length > 0 && a.therapistAssignedAt
      );

    container.innerHTML = '';

    if (!therapistAssigned.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">No hay ejercicios asignados aún</div></div>';
      return;
    }

    therapistAssigned.forEach(assignment => {
      const exercise = getExerciseDetails(assignment.exerciseId);
      if (!exercise) return;

      const card = document.createElement('div');
      card.className = 'exercise-card';
      card.dataset.assignmentId = assignment.id;

      const exerciseName = escapeHtml(exercise.name);
      const pathologyName = getPathologyName(exercise.pathology);
      const daysText = Array.isArray(assignment.therapistAssignedDays) ? assignment.therapistAssignedDays.join(', ') : '-';
      
      card.innerHTML = `
        <div class="exercise-card-header">
          <div class="exercise-card-icon">🎬</div>
          <div style="flex: 1;">
            <h4 class="exercise-card-title">${exerciseName}</h4>
            <p class="exercise-card-pathology">${pathologyName}</p>
          </div>
        </div>
        <div class="exercise-card-body">
          ${exercise.mediaRef ? `
            <div class="exercise-video-preview" id="video-${assignment.id}">
              <div class="video-placeholder">⏳ Cargando video...</div>
            </div>
          ` : ''}
          <div class="exercise-detail">
            <span class="exercise-detail-label">Repeticiones:</span>
            <span class="exercise-detail-value">${escapeHtml(assignment.therapistReps || '-')}</span>
          </div>
          <div class="exercise-detail">
            <span class="exercise-detail-label">Días:</span>
            <span class="exercise-detail-value">${escapeHtml(daysText)}</span>
          </div>
          ${assignment.assignmentWeek || assignment.weekLabel ? `
            <div class="exercise-detail">
              <span class="exercise-detail-label">Semana:</span>
              <span class="exercise-detail-value">${escapeHtml(assignment.assignmentWeek || assignment.weekLabel)}</span>
            </div>
          ` : ''}
          ${assignment.therapistNotes ? `
            <div class="exercise-detail">
              <span class="exercise-detail-label">Notas:</span>
              <span class="exercise-detail-value">${escapeHtml(assignment.therapistNotes)}</span>
            </div>
          ` : ''}
        </div>

        <div class="exercise-card-actions">
          <button class="btn-adjust-ex" onclick="window.currentApp.openAdjustModal('${escapeHtml(assignment.id)}')">Editar</button>
          <button class="btn-remove-ex" onclick="window.currentApp.removeExercise('${escapeHtml(assignment.id)}')">Eliminar</button>
        </div>
      `;

      container.appendChild(card);

      // Load video preview if available
      try {
        if (exercise.mediaRef) {
          const videoContainer = qs(`#video-${assignment.id}`);
          if (videoContainer) {
            loadExerciseVideoPreview(exercise.mediaRef, videoContainer, exercise.pathology);
          }
        }
      } catch (e) {
        console.error('Error loading exercise video preview:', e);
      }
    });
  }

  // Load video preview dispatcher (bundled or user)
  function loadExerciseVideoPreview(mediaRef, container, pathologyKey) {
    if (!container) return;
    container.innerHTML = '<div class="video-placeholder">⏳ Cargando video...</div>';
    if (mediaRef.type === 'bundled') {
      loadBundledVideoForExercise(mediaRef.id, container, pathologyKey);
    } else if (mediaRef.type === 'user') {
      loadUserVideoForExercise(mediaRef.id, container);
    }
  }

  // Load bundled video (search manifest by pathology, fallback to global)
  function loadBundledVideoForExercise(videoId, container, pathologyKey) {
    try {
      const cachedEntry = getVideoManifestEntry(videoId);
      if (cachedEntry && cachedEntry.path) {
        attachVideoFromPath(cachedEntry.path, container);
        return;
      }

      const pathologyMap = {
        'espondilolisis': 'Espondilólisis',
        'escoliosis': 'Escoliosis lumbar',
        'hernia': 'Hernia de disco lumbar',
        'lumbalgia': 'Lumbalgia mecánica inespecífica'
      };
      const pathologyName = pathologyMap[pathologyKey] || pathologyKey || '';
      const paths = [];
      if (pathologyName) {
        paths.push(`../../Administrador/Ejercicios/videos/${encodeURIComponent(pathologyName)}/manifest.json`);
      }
      paths.push('../../Administrador/Ejercicios/videos/manifest.json');
      paths.push('../../../Administrador/Ejercicios/videos/manifest.json');

      let tried = 0;
      const tryNext = () => {
        if (tried >= paths.length) {
          container.innerHTML = '<div class="video-placeholder">Video no disponible</div>';
          return;
        }
        const manifestPath = paths[tried];
        fetch(manifestPath)
          .then(r => {
            if (!r.ok) throw new Error('Not found');
            const manifestUrl = r.url;
            return r.json().then(manifest => ({ manifest, manifestUrl }));
          })
          .then(({ manifest, manifestUrl }) => {
            const video = manifest.find(v => v.id === videoId || String(v.id) === String(videoId));
            if (video && video.path) {
              attachVideoFromPath(video.path, container);
            } else {
              tried++;
              tryNext();
            }
          })
          .catch(() => {
            tried++;
            tryNext();
          });
      };
      tryNext();
    } catch (e) {
      container.innerHTML = '<div class="video-placeholder">Error al cargar video</div>';
    }
  }

  // Load user video from localStorage metadata
  function loadUserVideoForExercise(videoId, container) {
    try {
      const metas = JSON.parse(localStorage.getItem('user_videos_meta') || '[]');
      const meta = metas.find(m => m.id === videoId || String(m.id) === String(videoId));
      if (meta && meta.storedIn === 'local' && meta.dataUrl) {
        const videoEl = document.createElement('video');
        videoEl.controls = true;
        videoEl.style.width = '100%';
        videoEl.style.borderRadius = '8px';
        videoEl.style.maxHeight = '220px';
        videoEl.src = meta.dataUrl;
        container.innerHTML = '';
        container.appendChild(videoEl);
      } else {
        container.innerHTML = '<div class="video-placeholder">Video no disponible</div>';
      }
    } catch (e) {
      container.innerHTML = '<div class="video-placeholder">Error al cargar video</div>';
    }
  }

  // Open adjust modal
  function openAdjustModal(assignmentId) {
    const assignments = getPatientAssignments(currentPatientId);
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (!assignment) return;

    const exercise = getExerciseDetails(assignment.exerciseId);
    if (!exercise) return;

    currentAdjustmentId = assignmentId;

    // Populate form with therapist's assigned data
    qs('#adjExName').value = escapeHtml(exercise.name || '');
    qs('#adjExReps').value = assignment.therapistReps || '';
    qs('#adjExDuration').value = (assignment.therapistAssignedDays ? assignment.therapistAssignedDays.join(', ') : '') || '';
    qs('#adjExNotes').value = assignment.therapistNotes || '';

    // Show modal
    qs('#adjustExerciseModal').classList.add('show');
  }

  // Close adjust modal
  function closeAdjustExerciseModal() {
    qs('#adjustExerciseModal').classList.remove('show');
    currentAdjustmentId = null;
  }

  // Remove exercise
  function removeExercise(assignmentId) {
    showConfirmDialog(
      '¿Eliminar este ejercicio del paciente?',
      () => {
        try {
          let assigned = JSON.parse(localStorage.getItem('assigned_exercises') || '[]');
          assigned = assigned.filter(a => a.id !== assignmentId);
          localStorage.setItem('assigned_exercises', JSON.stringify(assigned));

          renderAssignedExercises();
          showAlertModal('Éxito', 'Ejercicio eliminado');
        } catch(e) {
          console.error('Error removing exercise:', e);
          showAlertModal('Error', 'Error al eliminar el ejercicio');
        }
      }
    );
  }

  // Show confirmation dialog modal
  function showConfirmDialog(message, callback) {
    currentConfirmAction = callback;
    qs('#confirmMessage').textContent = message;
    qs('#confirmModal').classList.add('show');
  }

  // Close confirmation modal
  function closeConfirmModal() {
    qs('#confirmModal').classList.remove('show');
    currentConfirmAction = null;
  }

  // Execute the confirmed action
  function executeConfirmAction() {
    if (currentConfirmAction && typeof currentConfirmAction === 'function') {
      currentConfirmAction();
    }
    closeConfirmModal();
  }

  // Handle form submit
  qs('#adjustExerciseForm').addEventListener('submit', (e) => {
    e.preventDefault();

    if (!currentAdjustmentId) return;

    const reps = qs('#adjExReps').value.trim();
    const daysText = qs('#adjExDuration').value.trim();
    const notes = qs('#adjExNotes').value.trim();

    if (!reps) {
      showAlertModal('Atención', 'Por favor ingresa las repeticiones');
      return;
    }

    try {
      let assigned = JSON.parse(localStorage.getItem('assigned_exercises') || '[]');
      const idx = assigned.findIndex(a => a.id === currentAdjustmentId);

      if (idx >= 0) {
        // Update therapist's assigned data
        assigned[idx].therapistReps = reps;
        assigned[idx].therapistNotes = notes;
        // Keep existing therapistAssignedDays if not changed
        if (!assigned[idx].therapistAssignedDays) {
          assigned[idx].therapistAssignedDays = [];
        }

        localStorage.setItem('assigned_exercises', JSON.stringify(assigned));

        showAlertModal('Éxito', 'Cambios guardados');
        closeAdjustExerciseModal();
        renderAssignedExercises();
      }
    } catch(e) {
      console.error('Error saving adjustment:', e);
      showAlertModal('Error', 'Error al guardar los cambios');
    }
  });

  // Escape HTML
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  // Click outside modal to close
  document.addEventListener('click', (e) => {
    const modal = qs('#adjustExerciseModal');
    if (e.target === modal) {
      closeAdjustExerciseModal();
    }
    const confirmModal = qs('#confirmModal');
    if (e.target === confirmModal) {
      closeConfirmModal();
    }
  });

  // Keep exercises in sync with other tabs
  window.addEventListener('assigned-exercises:updated', renderAssignedExercises);
  window.addEventListener('storage', (e) => {
    if (e.key === 'assigned_exercises') {
      renderAssignedExercises();
    }
  });

  // Expose functions globally
  window.currentApp = {
    openAdjustModal,
    closeAdjustExerciseModal,
    removeExercise
  };

  // Also expose individual functions as globals to match inline onclick handlers
  window.openAdjustModal = openAdjustModal;
  window.closeAdjustExerciseModal = closeAdjustExerciseModal;
  window.removeExercise = removeExercise;
  window.closeConfirmModal = closeConfirmModal;
  window.executeConfirmAction = executeConfirmAction;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
