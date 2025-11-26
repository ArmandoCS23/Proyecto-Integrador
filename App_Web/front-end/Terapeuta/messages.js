// Mensajería simple - demo usando localStorage
document.addEventListener('DOMContentLoaded', () => {
  const contactsList = document.getElementById('contactsList');
  const chatTitle = document.getElementById('chatTitle');
  const chatBody = document.getElementById('chatBody');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  // Obtener pacientes del terapeuta (in-memory)
  const therapistPatients = Array.isArray(window.__therapistPatients) ? window.__therapistPatients : [];
  const patients = therapistPatients.map(p => p.name).filter(Boolean);
  // Si no hay pacientes, agregar ejemplos
  if(patients.length === 0) patients.push('Juan Pérez','Ana Gómez','María López');

  // Cargar lista de pacientes
  patients.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    li.dataset.patient = p;
    li.addEventListener('click', () => selectPatient(p, li));
    contactsList.appendChild(li);
  });

  // Verificar si hay un paciente seleccionado desde el dashboard
  // Check if dashboard passed a selected patient (in-memory)
  let patientToSelect = null;
  try{ if(window.__selectedPatientChat && window.__selectedPatientChat.name) { patientToSelect = window.__selectedPatientChat.name; window.__selectedPatientChat = null; } }catch(e){}

  function selectPatient(patient, li) {
    // marcar activo
    document.querySelectorAll('.contacts li').forEach(n => n.classList.remove('active'));
    if (li) li.classList.add('active');
    chatTitle.textContent = patient;
    chatForm.style.display = 'flex';
    
    // cargar mensajes (in-memory per conversation)
    const convKey = `conv_${patient.replace(/\s+/g,'_')}`;
    const convStore = window.__conversations = window.__conversations || {};
    const conv = Array.isArray(convStore[convKey]) ? convStore[convKey] : [];
    chatBody.innerHTML = '';
    
    if(conv.length === 0) { 
      chatBody.innerHTML = '<div class="empty">Aún no hay mensajes con este paciente</div>'; 
    } else {
      conv.forEach(m => {
        const d = document.createElement('div');
        d.className = 'msg ' + (m.from === 'me' ? 'me' : 'them');
        d.textContent = m.text;
        chatBody.appendChild(d);
      });
    }
    chatBody.scrollTop = chatBody.scrollHeight;
    
    // submit handler
    chatForm.onsubmit = function(e) {
      e.preventDefault();
      const text = chatInput.value.trim();
      if(!text) return;
      appendMessage(patient, {from:'me', text});
      chatInput.value = '';
    };
  }

  function appendMessage(patient, message) {
    const convKey = `conv_${patient.replace(/\s+/g,'_')}`;
      const convStore = window.__conversations = window.__conversations || {};
      const conv = Array.isArray(convStore[convKey]) ? convStore[convKey] : [];
      conv.push(Object.assign({ts: Date.now()}, message));
      convStore[convKey] = conv;
    
    // mostrar en pantalla
    const d = document.createElement('div');
    d.className = 'msg ' + (message.from === 'me' ? 'me' : 'them');
    d.textContent = message.text;
    chatBody.appendChild(d);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Selecciona el paciente que fue pasado desde el dashboard, o el primero por defecto
  if (patientToSelect) {
    const patientElement = Array.from(document.querySelectorAll('.contacts li')).find(li => li.textContent === patientToSelect);
    if (patientElement) {
      patientElement.click();
    }
  } else {
    const first = document.querySelector('.contacts li');
    if(first) first.click();
  }
});
