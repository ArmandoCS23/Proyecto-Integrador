// admin-manager.js
// Responsible for populating admin name/photo/id in the admin sidebar/header
(function(){
  function qs(sel){ return document.querySelector(sel); }

  async function fetchMeFromApi(){
    try{
      // read in-memory auth token only (no localStorage)
      const token = window.__authToken || null;
      if(!token) return null;
      const res = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
      if(!res.ok) return null;
      const data = await res.json();
      if(data && data.user){
        try{ window.__currentUser = data.user; }catch(e){}
        return data.user;
      }
      return data && data.user ? data.user : null;
    }catch(e){ console.warn('Could not fetch /api/auth/me', e); return null; }
  }

  async function getCurrentUser(){
    // 1) in-memory
    try{ if(window.__currentUser) { console.debug('[admin-manager] found in-memory currentUser'); return window.__currentUser; } }catch(e){}
    // 2) check localStore/localStorage persisted current admin (offline testing)
    try{
      if(window.localStore && typeof window.localStore.getCurrentUser === 'function'){
        const lu = window.localStore.getCurrentUser(); if(lu) { console.debug('[admin-manager] found localStore current user', lu && (lu.email||lu.name)); try{ window.__currentUser = lu; }catch(e){} return lu; }
      }
      const persisted = JSON.parse(localStorage.getItem('currentUser_admin')||'null'); if(persisted){ try{ window.__currentUser = persisted; }catch(e){} return persisted; }
      // If no admin present, also accept a persisted therapist session so profile areas render
      if(window.localStore && typeof window.localStore.getCurrentTherapist === 'function'){
        const t = window.localStore.getCurrentTherapist(); if(t){ console.debug('[admin-manager] found persisted therapist session via localStore', t && (t.email||t.name)); try{ window.__currentUser = t; }catch(e){} return t; }
      }
      const persistedTherSession = JSON.parse(sessionStorage.getItem('currentUser_therapist')||'null'); if(persistedTherSession){ try{ window.__currentUser = persistedTherSession; }catch(e){} return persistedTherSession; }
      const persistedTher = JSON.parse(localStorage.getItem('currentUser_therapist')||'null'); if(persistedTher){ try{ window.__currentUser = persistedTher; }catch(e){} return persistedTher; }
    }catch(e){ /* ignore */ }
    // 3) fallback to API if we have an in-memory token
    return await fetchMeFromApi();
  }

  function setProfile(user){
    if(!user) return;
    // Try multiple selectors for name/email/photo so the profile appears across different pages
    const nameSelectors = [
      '#adminName', '#therapistName', '.profile h3', '.profile .name', '.user-name', '[data-user-name]'
    ];
    const emailSelectors = [
      '#adminEmail', '#therapistEmail', '.profile p.muted', '.profile .email', '.user-email', '[data-user-email]'
    ];
    const photoSelectors = [
      '#adminPhoto', '#therapistPhoto', '.profile img', '.avatar img', '.profile-avatar', '.avatar', '[data-user-photo]'
    ];

    function applyToFirst(selectors, applyFn){
      for(const s of selectors){
        try{
          const nodes = document.querySelectorAll(s);
          if(!nodes || nodes.length === 0) continue;
          console.debug('[admin-manager] selector matched:', s, 'nodes:', nodes.length);
          nodes.forEach(n => { try{ applyFn(n); }catch(e){} });
          return true;
        }catch(e){ console.warn('[admin-manager] invalid selector', s, e); }
      }
      console.debug('[admin-manager] no selector matched from list:', selectors);
      return false;
    }

    const displayName = user.name || user.fullname || user.email || 'Administrador';
    applyToFirst(nameSelectors, el => { el.textContent = displayName; });

    // set email if available — force set the #adminEmail and #therapistEmail elements first for pages that include them
    const displayEmail = user.email || user.mail || user.correo || '';
    try{
      const directAdminEmail = document.getElementById('adminEmail');
      if(directAdminEmail){ directAdminEmail.textContent = displayEmail || ''; directAdminEmail.style.display = displayEmail ? '' : 'none'; }
      const directTherapistEmail = document.getElementById('therapistEmail');
      if(directTherapistEmail){ directTherapistEmail.textContent = displayEmail || ''; directTherapistEmail.style.display = displayEmail ? '' : 'none'; }
    }catch(e){}
    if(displayEmail) applyToFirst(emailSelectors, el => {
      // Only replace generic <p> if it looks like an ID line or is muted/placeholder
      try{
        const tag = (el.tagName || '').toLowerCase();
        const text = (el.textContent || '').trim();
        const looksLikeId = /\bID\b[:]?/i.test(text) || /\d{3,}/.test(text);
        const isMuted = el.classList && (el.classList.contains('muted') || el.classList.contains('muted-text'));
        if(tag === 'p'){
          if(looksLikeId || isMuted || !text){ el.textContent = displayEmail; }
          else { /* preserve other paragraph content if it doesn't look like placeholder */ }
        } else {
          el.textContent = displayEmail;
        }
      }catch(e){ try{ el.textContent = displayEmail; }catch(_){} }
    });

    // set photo: support <img> and elements that use background-image or .src
    const photoSrc = user.photo || user.photoUrl || user.avatar || '';
    // Force show admin/therapist photo elements when available
    try{
      const aPhoto = document.getElementById('adminPhoto'); if(aPhoto && photoSrc){ try{ aPhoto.setAttribute('src', photoSrc); aPhoto.style.display=''; }catch(e){} }
      const tPhoto = document.getElementById('therapistPhoto'); if(tPhoto && photoSrc){ try{ tPhoto.setAttribute('src', photoSrc); tPhoto.style.display=''; }catch(e){} }
    }catch(e){}
    if(photoSrc){
      applyToFirst(photoSelectors, el => {
        // If it's an <img>
        if(el.tagName && el.tagName.toLowerCase() === 'img'){
          try{ el.setAttribute('src', photoSrc); }catch(e){ try{ el.src = photoSrc; }catch(e){} }
          el.alt = displayName;
          el.style.display = '';
          el.onerror = function(){ try{ el.setAttribute('src', 'avatar.png'); el.style.display = ''; }catch(e){ el.src = 'avatar.png'; el.style.display = ''; } };
          return;
        }
        // If element uses background-image (e.g., .avatar)
        try{ el.style.backgroundImage = 'url("' + photoSrc + '")'; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }catch(e){}
      });
    }

    // hide any admin ID paragraphs if present to keep UI tidy
    try{
      const idP = document.querySelector('.profile p#adminID, .profile p#therapistID');
      if(idP) idP.style.display = 'none';
    }catch(e){}
  }
  // Try to read current user synchronously (fast path) so we can apply profile immediately
  function getCurrentUserSync(){
    try{ if(window.__currentUser) return window.__currentUser; }catch(e){}
    return null;
  }

  (function initProfile(){
    // Fast synchronous attempt
    try{
      const userSync = getCurrentUserSync();
      if(userSync){
        try{ console.debug('[admin-manager] applying profile from sync storage', userSync && (userSync.email||userSync.name)); }catch(e){}
        setProfile(userSync);
      }
    }catch(e){ /* ignore */ }
  })();

  document.addEventListener('DOMContentLoaded', async function(){
    let user = await getCurrentUser();
    console.debug('[admin-manager] getCurrentUser returned', user);
    // if user is present, propagate to in-memory current user
    if(user){
      try{ window.__currentUser = user; }catch(e){}
      console.debug('[admin-manager] using user:', user && (user.email || user.name));
      setProfile(user);
      // If the profile DOM isn't present yet or may be replaced by other scripts,
      // observe the DOM and re-apply the profile when elements appear.
      try{
        const applyWhenPresent = function(){
          if(document.querySelector('#adminName') || document.querySelector('.profile')){
            setProfile(user);
            return true;
          }
          return false;
        };
        if(!applyWhenPresent()){
          const mo = new MutationObserver((mutations, obs) => {
            if(applyWhenPresent()){ obs.disconnect(); }
          });
          mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
        }
      }catch(e){ /* ignore observer errors */ }
    }
    else {
      console.debug('[admin-manager] no user found after fallbacks; profile will not be applied');
    }
  });

  // If the script is loaded after DOMContentLoaded already fired, run the same logic immediately
  if(document.readyState !== 'loading'){
    (async function(){
      try{
        let user = await getCurrentUser();
        if(user){
          try{ window.__currentUser = user; }catch(e){}
          setProfile(user);
          // attempt to re-apply when elements appear, as in the DOMContentLoaded handler
          try{
            const applyWhenPresent = function(){
              if(document.querySelector('#adminName') || document.querySelector('.profile')){
                setProfile(user);
                return true;
              }
              return false;
            };
            if(!applyWhenPresent()){
              const mo = new MutationObserver((mutations, obs) => { if(applyWhenPresent()){ obs.disconnect(); } });
              mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
            }
          }catch(e){}
        }
      }catch(e){ /* ignore */ }
    })();
  }

  // expose for manual refresh/debug
  window.__adminManager = {
    getCurrentUser,
    setProfile,
    // helper: force-apply an in-memory user for debugging
    loadLocalProfile: function(user){
      try{
        if(!user && window.__currentUser) user = window.__currentUser;
        if(!user){
          // try persisted current user
          try{ if(window.localStore && typeof window.localStore.getCurrentUser === 'function') user = window.localStore.getCurrentUser(); }catch(e){}
          if(!user){ try{ user = JSON.parse(localStorage.getItem('currentUser_admin')||'null'); }catch(e){} }
        }
        if(user){ window.__currentUser = user; console.debug('[admin-manager] loadLocalProfile applied user:', user && (user.email||user.name)); setProfile(user); return user; }
      }catch(e){ console.error('[admin-manager] loadLocalProfile error', e); }
      return null;
    },
    // debug helper
    debugLocalProfile: function(){
      try{
        const fromLocalStore = (window.localStore && typeof window.localStore.getCurrentUser === 'function') ? window.localStore.getCurrentUser() : null;
        const fromLS = JSON.parse(localStorage.getItem('currentUser_admin')||'null');
        return { localStore: fromLocalStore, localStorage: fromLS };
      }catch(e){ console.error('debugLocalProfile error', e); return null; }
    }
  };

  // Immediately attempt to load any persisted local profile so pages show the admin without manual steps
  try{ window.__adminManager.loadLocalProfile(); }catch(e){ /* ignore */ }
  // logout helper used across admin pages
  window.logoutAdmin = function(){
    try{ window.__authToken = null; window.__currentUser = null; }catch(e){}
    window.location.href = '/Administrador/login/index.html';
  };

  // If no user is found, remove default placeholder texts so the page doesn't show generic admin values
  function clearDefaultPlaceholders(){
    try{
      const nameEls = document.querySelectorAll('#adminName, #therapistName, .user-name');
      const emailEls = document.querySelectorAll('#adminEmail, #therapistEmail, .user-email');
      const photoEls = document.querySelectorAll('#adminPhoto, #therapistPhoto, .profile img');
      nameEls.forEach(el => {
        try{ const t = (el.textContent||'').trim(); if(!t || /^(administrador|admin)$/i.test(t)) el.textContent = ''; }catch(e){}
      });
      emailEls.forEach(el => {
        try{ const t = (el.textContent||'').trim(); if(!t || /^admin@/.test(t) || /@ejemplo\.com$/i.test(t)) el.textContent = ''; }catch(e){}
      });
      photoEls.forEach(el => {
        try{
          if(el.tagName && el.tagName.toLowerCase() === 'img'){
            // if image is default avatar, hide it
            const src = el.getAttribute('src') || '';
            if(/avatar(\.png|\.jpg|\.webp)?$/i.test(src) || /default/i.test(src)){
              el.style.display = 'none';
            }
          }
        }catch(e){}
      });
    }catch(e){ /* ignore */ }
  }

  // Expose debug helper to inspect localStore/currentUser quickly from console
  window.debugLocalProfile = function(){
    try{
      const fromLocalStore = (window.localStore && typeof window.localStore.getCurrentUser === 'function') ? window.localStore.getCurrentUser() : null;
      const fromLS = JSON.parse(localStorage.getItem('currentUser_admin')||'null');
      console.log('debugLocalProfile -> localStore.getCurrentUser():', fromLocalStore, 'localStorage.currentUser_admin:', fromLS);
      return { localStore: fromLocalStore, localStorage: fromLS };
    }catch(e){ console.error('debugLocalProfile error', e); return null; }
  };

  // Run placeholder cleanup shortly after load in case no user is available
  setTimeout(clearDefaultPlaceholders, 300);
})();
