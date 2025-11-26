# Guía de Integración: Backend + App Móvil

## 📋 Resumen

Se ha integrado el modelo entrenado con la app móvil mediante:
1. **Backend (Flask)**: Expone un endpoint `/api/evaluate_frame` que acepta imágenes y devuelve evaluación de postura.
2. **Frontend (React Native/Expo)**: Nueva pantalla `VideoRefScreen.js` que permite elegir condición médica, video de referencia, y luego captura frames en tiempo real para evaluación remota.
3. **Datos locales**: Modelos (`modelo_posturas.pkl`, `encoder.pkl`) y videos del dataset copiados a `app_movil/assets/`.

---

## 🚀 Cómo ejecutar

### Opción 1: Ejecutar ambos proyectos (Recomendado para pruebas)

#### 1. Backend (en carpeta `modelo/`)
Abre PowerShell en `c:\Users\arman\OneDrive\Documentos\Proyecto Integrador\modelo`:
```powershell
cd "c:\Users\arman\OneDrive\Documentos\Proyecto Integrador\modelo"
python app.py
```
Espera a que veas:
```
 * Running on http://0.0.0.0:5000
```

#### 2. Frontend Móvil (en carpeta `app_movil/`)
Abre PowerShell en `c:\Users\arman\OneDrive\Documentos\Proyecto Integrador\app_movil`:
```powershell
cd "c:\Users\arman\OneDrive\Documentos\Proyecto Integrador\app_movil"
npm start
```

O si ya instalaste dependencias:
```powershell
npx expo start
```

Escanea el QR con Expo Go en tu teléfono (Android/iOS).

---

## 🔧 Configuración necesaria

### Reemplazar la IP del servidor
Edita el archivo `app_movil/config.js` y reemplaza:
```javascript
export const SERVER_URL = "http://192.168.1.100:5000"; // ⚠️ Reemplaza con tu IP real
```

Obtén tu IP local ejecutando en PowerShell:
```powershell
ipconfig
```
Busca la línea `IPv4 Address:` en tu adaptador de red Wi-Fi (ej: `192.168.1.100`).

---

## 📱 Flujo de uso en la app

### En `MainScreen.js` (Pantalla Principal)
- Nuevo botón **🎥 Imitar** (verde) que lleva a `VideoRefScreen`.

### En `VideoRefScreen.js` (Nuevas funciones)

**Paso 1: Seleccionar condición médica**
- Elige entre:
  - Escoliosis lumbar
  - Hernia de disco lumbar
  - Espondilolisis
  - Lumbalgia mecánica inespecífica

**Paso 2: Seleccionar video de referencia**
- Elige un video asociado a la condición.
- Los videos están importados desde `assets/videos/<condicion>/`.

**Paso 3: Grabación y evaluación en tiempo real** ⭐ (Sincronización incluida)
- La cámara captura frames cada ~1.2 segundos.
- El video de referencia se muestra en una ventana PiP (Picture-in-Picture) en la esquina superior izquierda.
- **⭐ Sincronización:** Cada 250ms, la app envía el tiempo actual del video al servidor vía `/api/sync_reference_time`.
- El servidor actualiza `current_reference_index` basado en el tiempo, permitiendo evaluación precisa contra el frame correcto.
- Cada frame capturado se evalúa contra el frame de referencia sincronizado.
- Recibes **feedback en tiempo real**: "Bien" (verde) o "Mal" (rojo) con metricajes.
- Muestra `avg_distance` y `max_distance` (similitud con la referencia).

---

## 🌐 Arquitectura de Comunicación

### Flujo HTTP + Sincronización
```
App Móvil (Expo)
    ↓ (cada ~1.2s)
POST /api/evaluate_frame
{
  "image": "data:image/jpeg;base64,..."
}
    ↓
Backend Flask (app.py)
    ├─ classify_posture() 
    ├─ evaluate_posture(landmarks, ref_landmarks_sincronizados)
    └─ Retorna feedback + metrics
    ↓
JSON Response:
{
  "success": true,
  "posture": "escoliosis lumbar",
  "feedback": "Bien",
  "reason": "✓ Excelente coincidencia con la referencia (92%)",
  "metrics": { "avg_distance": 0.0425, "max_distance": 0.1050 }
}

⭐ También en paralelo (cada 250ms):
    ↓
POST /api/sync_reference_time
{
  "current_time": 2.5  // segundos del video
}
    ↓
Backend actualiza current_reference_index
    └─ Permite evaluar contra el frame correcto del video
```
{
  "success": true,
  "posture": "escoliosis lumbar",
  "feedback": "Bien",
  "reason": "✓ Excelente coincidencia con la referencia (92%)",
  "metrics": {
    "avg_distance": 0.0425,
    "max_distance": 0.1050
  }
}
```

---

## 📁 Estructura de archivos nueva

```
app_movil/
├── config.js (⭐ Nuevo: URL centralizada del servidor)
├── screens/
│   ├── VideoRefScreen.js (⭐ Nuevo: Pantalla de imitación)
│   ├── CameraScreen.js (✏️ Modificado: Integración de captura)
│   ├── MainScreen.js (✏️ Modificado: Nuevo botón "Imitar")
│   └── ...
├── assets/
│   ├── model/ (⭐ Nuevo)
│   │   ├── encoder.pkl
│   │   ├── modelo_posturas.pkl
│   │   └── pose_landmarker.task
│   ├── videos/ (⭐ Nuevo: Dataset copiado)
│   │   ├── escoliosis lumbar/
│   │   ├── hernia de disco lumbar/
│   │   ├── espondilolisis/
│   │   └── lumbalgia mecánica inespecífica/
│   └── ...
└── ...

modelo/
├── app.py (✏️ Modificado: Nuevo endpoint /api/evaluate_frame)
└── ...
```

---

## 🔍 Resolución de problemas

### ❌ "Conexión rechazada" o "Network error"
- ✅ Verifica que el backend esté ejecutando (`python app.py`).
- ✅ Verifica que la IP en `config.js` sea correcta (prueba ping desde terminal).
- ✅ Asegúrate de que PC y teléfono estén en la **misma red Wi-Fi**.
- ✅ Verifica que Windows Firewall permita conexiones a `python.exe`.

### ❌ "No se capturan imágenes" o "Feedback no aparece"
- ✅ Revisa que `isCameraReady` sea `true` (espera 2-3 segundos después de abrir la cámara).
- ✅ Abre la terminal del backend y busca logs de requests POST a `/api/evaluate_frame`.
- ✅ Prueba reducir la calidad de imagen (actualmente `quality: 0.4`).

### ❌ "Expo Go muestra error blanco"
- ✅ Ejecuta `npm install` nuevamente en `app_movil/`.
- ✅ Ejecuta `npx expo start --tunnel` para usar túnel Expo (sin dependencia de red local).
- ✅ Verifica que todas las dependencias en `package.json` estén instaladas.

### ❌ "Video no carga o no se puede reproducir"
- Los videos deben estar en `assets/videos/` con rutas exactas.
- Solo extensiones soportadas: `.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`.

---

## 💡 Características futuras (Opcionales)

- [ ] Permitir cargar URL del servidor desde un modal en la UI (sin editar `config.js`).
- [ ] Guardar historial de evaluaciones localmente.
- [ ] Integrar estadísticas de progreso por sesión.
- [ ] Añadir slider de tolerancia en la UI móvil para ajustar sensibilidad.
- [ ] Exportar resultados a CSV o PDF.

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs en la terminal del backend.
2. Abre la consola de DevTools en Expo (puedes hacerlo desde la app).
3. Captura pantallazos y guarda los mensajes de error exactos.

---

## ✅ Checklist pre-producción

- [ ] Backend ejecutando sin errores.
- [ ] IP del servidor correcta en `config.js`.
- [ ] PC y teléfono en la misma red.
- [ ] Permisos de cámara otorgados en la app.
- [ ] Firewall permite conexiones a puerto 5000.
- [ ] Probado con al menos una condición médica.
- [ ] Feedback aparece en tiempo real.
- [ ] Métricas (`avg_distance`, `max_distance`) son razonables.

---

**Versión:** 1.0  
**Fecha:** 18 de noviembre de 2025
