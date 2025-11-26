function qs(sel, root = document){ return root.querySelector(sel); } 

function showMessage(text, type){
  const msg = qs('#loginMessage');
  if(!msg) return;
  msg.textContent = text;
  msg.style.display = 'block';
  msg.className = 'login-message ' + (type || 'info');
}

function hideMessage(){ 
  const msg = qs('#loginMessage'); 
  if(msg) msg.style.display='none'; 
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  if(!form) return;

  // --- Role selector ---
  const roleButtons = document.querySelectorAll('.role-btn');
  let selectedRole = 'admin'; // rol por defecto

  roleButtons.forEach(b =>
    b.addEventListener('click', () => {
      roleButtons.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      // Normalize role values: support English "therapist" and Spanish "terapeuta"
      let r = b.getAttribute('data-role') || 'admin';
      if(r === 'therapist') r = 'terapeuta';
      selectedRole = r;
    })
  );

  // Password toggle for login form
  (function(){
    const toggle = document.getElementById('togglePassword');
    const pwd = document.getElementById('password');
    if(!toggle || !pwd) return;
    // Create simple eye icon inside the toggle if not present
    if(toggle.innerHTML.trim() === ''){
      toggle.innerHTML = '👁️';
      toggle.style.cursor = 'pointer';
    }
    toggle.addEventListener('click', function(){
      const isPwd = pwd.getAttribute('type') === 'password';
      pwd.setAttribute('type', isPwd ? 'text' : 'password');
      toggle.setAttribute('aria-pressed', String(isPwd));
    });
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const email = qs('#email').value.trim();
    const password = qs('#password').value;
    // ensure we have the current role from UI (in case user didn't click)
    const activeBtn = document.querySelector('.role-btn.active');
    if(activeBtn){
      let r = activeBtn.getAttribute('data-role') || 'admin';
      if(r === 'therapist') r = 'terapeuta';
      selectedRole = r;
    }
    console.debug('[login] attempt', { email, selectedRole });

    if(!email || !password){
      showMessage('Completa email y contraseña', 'error');
      return;
    }

    try{
      showMessage('Iniciando sesión...', 'info');

      // First try local authentication (offline testing)
      try{
        if(window.localStore && typeof window.localStore.authenticate === 'function'){
          const localUser = window.localStore.authenticate(email, password, selectedRole);
          if(localUser){
            // persist current user according to role
            try{
              if(selectedRole === 'terapeuta'){
                window.localStore.setCurrentTherapist(localUser);
                window.__currentTherapist = localUser;
              } else {
                window.localStore.setCurrentUser(localUser);
                window.__currentUser = localUser;
              }
            }catch(e){}
            showMessage('Inicio de sesión (local) correcto. Redirigiendo...', 'success');
            setTimeout(()=> {
              if(selectedRole === 'terapeuta') window.location.href = '/Terapeuta/Dashboard/dashboardt.html';
              else window.location.href = '/Administrador/Dashboard/dashboard-admin.html';
            }, 300);
            return;
          }
          // if no local user found, continue to server fallback
        }
      }catch(errLocal){ console.warn('Local auth failed', errLocal); }

      // Fallback: Enviamos email y password al backend
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const body = await res.json().catch(()=>({}));

      if(!res.ok){
        console.warn('[login] server response not ok', res.status, res.statusText);
        try{ const txt = await res.clone().text().catch(()=>null); if(txt) console.debug('[login] response body text:', txt); }catch(e){}
      }

      if(res.ok && body){
        // Keep authentication in-memory only (no persistence)
        if(body.token){
          try{ window.__authToken = body.token; }catch(e){}
        }
        if(body.user){
          try{ window.__currentUser = body.user; }catch(e){}
        }

        // Verificar que el rol seleccionado coincide con el rol real del usuario
        if (body.user && body.user.rol && body.user.rol !== selectedRole) {
          showMessage("Este usuario no pertenece al rol seleccionado", "error");
          return;
        }

        // Persist server-authenticated user locally according to selected role so tests can run offline
        try{
          if(selectedRole === 'terapeuta'){
            if(window.localStore && typeof window.localStore.setCurrentTherapist === 'function'){
              window.localStore.setCurrentTherapist(body.user);
              window.__currentTherapist = body.user;
            }
            sessionStorage.setItem('currentUser_therapist', JSON.stringify(body.user));
            window.__currentTherapist = body.user;
            localStorage.removeItem('currentUser_admin');
            localStorage.removeItem('currentUser_therapist');
          } else {
            if(window.localStore && typeof window.localStore.setCurrentUser === 'function'){
              window.localStore.setCurrentUser(body.user);
              window.__currentUser = body.user;
            } else {
              localStorage.setItem('currentUser_admin', JSON.stringify(body.user));
              window.__currentUser = body.user;
            }
            sessionStorage.removeItem('currentUser_therapist');
          }
        }catch(e){ console.warn('Could not persist server user locally', e); }

        showMessage('Inicio de sesión correcto, redirigiendo...', 'success');
        // Redirección correcta según el rol
        if(selectedRole === 'terapeuta'){
          window.location.href = "/Terapeuta/Dashboard/dashboardt.html";
        } else if(selectedRole === 'admin'){
          window.location.href = "/Administrador/Dashboard/dashboard-admin.html";
        }
        return;
      }

      // If server authentication failed, inform the user
      showMessage((body && body.message) ? body.message : 'Credenciales inválidas o servidor inaccesible.', 'error');

    } catch(err){
      console.error('Login failed', err);
      // No local fallback on network error (local storage disabled)
      showMessage('Error al iniciar sesión: ' + (err.message || err) + '. Autenticación local deshabilitada.', 'error');
    }
  });
});
