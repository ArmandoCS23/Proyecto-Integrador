// VIDEO LOADING TEST SCRIPT
// Ejecuta esto en la consola del navegador (F12) en la página de Ejercicios del Terapeuta

console.log('=== VIDEO LOADING TEST SUITE ===\n');

// Test 1: Verificar estructura de datos en localStorage
console.log('Test 1: Verificar estructura de default_exercises');
try {
  const defaults = JSON.parse(localStorage.getItem('default_exercises') || '{}');
  const hasExercises = Object.keys(defaults).length > 0;
  
  if (hasExercises) {
    console.log('✓ PASS: Ejercicios encontrados');
    console.log('  Patologías disponibles:', Object.keys(defaults));
    
    // Mostrar primer ejercicio con mediaRef
    for (const [pathKey, exercises] of Object.entries(defaults)) {
      const exWithMedia = exercises.find(e => e.mediaRef);
      if (exWithMedia) {
        console.log(`\n  Ejemplo de ejercicio con video (${pathKey}):`);
        console.log('  ', exWithMedia);
        break;
      }
    }
  } else {
    console.log('✗ FAIL: No hay ejercicios en localStorage');
  }
} catch (e) {
  console.error('✗ ERROR:', e.message);
}

// Test 2: Simular getExerciseDetails
console.log('\n\nTest 2: Simular getExerciseDetails');
try {
  const defaults = JSON.parse(localStorage.getItem('default_exercises') || '{}');
  let exerciseWithMedia = null;
  let pathologyKey = null;
  
  for (const pKey in defaults) {
    const ex = defaults[pKey].find(e => e.mediaRef);
    if (ex) {
      exerciseWithMedia = ex;
      pathologyKey = pKey;
      break;
    }
  }
  
  if (exerciseWithMedia) {
    console.log('✓ PASS: Ejercicio con mediaRef encontrado');
    console.log('  pathologyKey:', pathologyKey);
    console.log('  mediaRef:', exerciseWithMedia.mediaRef);
    
    // Test 3: Verificar rutas de manifest
    console.log('\n\nTest 3: Verificar rutas de manifest');
    
    const pathologyMap = {
      'espondilolisis': 'Espondilólisis',
      'escoliosis': 'Escoliosis lumbar',
      'hernia': 'Hernia de disco lumbar',
      'lumbalgia': 'Lumbalgia mecánica inespecífica'
    };
    
    const pathologyName = pathologyMap[pathologyKey] || pathologyKey;
    const manifestUrl = `../../Administrador/Ejercicios/videos/${encodeURIComponent(pathologyName)}/manifest.json`;
    
    console.log(`  Intentando cargar: ${manifestUrl}`);
    
    fetch(manifestUrl)
      .then(r => {
        if (!r.ok) {
          console.log(`  ✗ FAIL: ${r.status} ${r.statusText}`);
          console.log('  Intentando fallback...');
          return fetch('../../Administrador/Ejercicios/videos/manifest.json');
        }
        return r;
      })
      .then(r => {
        if (!r.ok) throw new Error('All manifest paths failed');
        return r.json();
      })
      .then(manifest => {
        console.log('  ✓ PASS: Manifest cargado');
        console.log('  Videos en manifest:', manifest.map(v => ({ id: v.id, name: v.name })));
        
        // Test 4: Verificar que el video está en el manifest
        console.log('\n\nTest 4: Verificar video en manifest');
        const videoId = exerciseWithMedia.mediaRef.id;
        const videoInManifest = manifest.find(v => v.id === videoId);
        
        if (videoInManifest) {
          console.log(`  ✓ PASS: Video con ID "${videoId}" encontrado`);
          console.log('  Datos del video:', videoInManifest);
          console.log(`  Ruta relativa: ${videoInManifest.path}`);
        } else {
          console.log(`  ✗ FAIL: Video con ID "${videoId}" no encontrado en manifest`);
          console.log('  Videos disponibles:', manifest.map(v => v.id));
        }
      })
      .catch(e => {
        console.error('  ✗ ERROR:', e.message);
        console.log('  Verifica que los archivos manifest.json existen en las rutas correctas');
      });
  } else {
    console.log('✗ FAIL: No hay ejercicios con mediaRef');
    console.log('  Crea al menos un ejercicio con video en la sección Admin → Ejercicios');
  }
} catch (e) {
  console.error('✗ ERROR:', e.message);
}

console.log('\n\n=== FIN TEST SUITE ===');
