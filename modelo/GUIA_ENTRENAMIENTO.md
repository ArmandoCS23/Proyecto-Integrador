# Guía para Aumentar el Dataset y Reentrenar el Modelo

## El Problema
El modelo fue entrenado con solo **21 imágenes** (muy pocas). Por eso no detecta bien si estás haciendo la postura correcta. Necesitamos:
- **Mínimo 50 imágenes por enfermedad** (ideal: 100+)
- Para 4 enfermedades = **200-400 imágenes totales**

## Paso 1: Recolectar Imágenes

### Opción A: Captura RÁPIDA (Recomendado ⭐)
Es mucho más rápido capturar múltiples frames automáticamente.

```bash
python captura_rapida_desde_video.py
```

**Instrucciones:**
1. Se abrirá una ventana con la cámara
2. **Presiona 1-4** para cambiar a una enfermedad
3. **Presiona ESPACIO** para iniciar captura rápida (capturará 1 imagen cada 100ms)
4. **Presiona ESPACIO de nuevo** para detener
5. Repite para cada enfermedad (objetivo: 50-100 imágenes cada una)
6. **Presiona ESC** para salir

**Ejemplo de sesión:**
```
Presiona "1" → Te pone en modo "lumbalgia mecánica inespecífica"
Haz la postura de lumbalgia
Presiona ESPACIO → Comienza a capturar 50 imágenes (5 segundos)
Presiona ESPACIO → Para
Presiona "2" → Te pone en modo "escoliosis lumbar"
... repite para cada enfermedad
```

### Opción B: Captura Manual
Si prefieres capturar una imagen a la vez:

```bash
python captura_imagenes.py
```

### Opción C: Captura por Video (Recomendado para mejor generalización)

Puedes grabar videos etiquetados por clase y luego entrenar usando frames extraídos. Esto es mucho más eficiente que capturar imágenes sueltas.

```bash
python captura_videos.py
```

Instrucciones:
- Presiona 1-4 para seleccionar la clase
- Presiona 'R' para comenzar a grabar y 'R' de nuevo para parar
- El archivo se guardará en `dataset/<clase>/video_YYYYMMDD_HHMMSS.mp4`

Consejo: graba 4-5 videos de 10-15s por clase.

**Instrucciones:**
1. Se abrirá una ventana con la cámara
2. **Presiona 1-4** para capturar una imagen de esa enfermedad
3. Repite para cada postura que quieras capturar
4. **Presiona ESC** para salir

---

## Paso 2: Entrenar el Modelo

Después de recolectar imágenes:

```bash
python entrenar_modelo.py
```

Si quieres entrenar únicamente con frames extraídos de videos (ignorar imágenes estáticas), usa:

```bash
python entrenar_modelo.py --videos-only --fps 1
```

### Procesar videos existentes sin entrenar

Si ya tienes videos grabados y solo quieres extraer landmarks y generar un CSV sin entrenar el modelo, usa `procesar_videos.py`:

```bash
python procesar_videos.py --input-dir path/a/videos --fps 1 --output dataset_posturas_videos.csv
```

Opciones útiles:
- `--save-frames` guarda los frames extraídos junto al video en `dataset/<clase>/frames/<video>/frame_XXXX.jpg`.
- `--fps N` controla cuántos frames por segundo se extraen (1 por defecto).
- `--output` cambia el nombre del CSV resultante.
Donde `--fps` controla cuántos frames por segundo extrae de cada video (1 por defecto).

**Qué hace:**
- ✅ Lee todas las imágenes de `dataset/`
- ✅ Extrae landmarks (puntos del cuerpo) con MediaPipe
- ✅ Regenera `dataset_posturas.csv`
- ✅ Entrena un nuevo modelo `modelo_posturas.pkl`
- ✅ Muestra métricas de precisión

**Tiempo estimado:** 2-5 minutos (depende de cuántas imágenes tengas)

---

## Paso 3: Probar en la App

1. **Inicia la app:**
   ```bash
   python app.py
   ```

2. Abre `http://localhost:5000` en tu navegador

3. Selecciona una enfermedad e imagen

4. Prueba hacer la postura → Deberías ver **"Bien"** si lo haces correctamente

---

## Script Automatizado

También puedes usar:
```bash
recolectar_entrenar.bat
```

Este script te mostrará un menú interactivo para:
- Capturar imágenes (opción rápida o manual)
- Entrenar modelo
- Salir

---

## Consejos para Mejor Resultado

### Recolección de Datos
- 📸 **Varía las posiciones:** Captura desde ángulos diferentes (frente, lado, etc.)
- 📸 **Varía la iluminación:** Ten diferentes condiciones de luz
- 📸 **Varía la distancia:** Acércate y aléjate de la cámara
- 📸 **Captura movimiento:** Para cada enfermedad, captura varias posiciones/transiciones

### Entrenamiento
- Después de recolectar datos, **siempre ejecuta `entrenar_modelo.py`**
- Deberías ver que la precisión mejora (mira el "accuracy" en el reporte)
- Si la precisión sigue siendo baja, agrega más imágenes

---

## Estado Actual

```
lumbalgia mecánica inespecífica: ? imágenes
escoliosis lumbar: ? imágenes
espondilolisis: ? imágenes
hernia de disco lumbar: ? imágenes
```

Ejecuta el script de captura para aumentar estos números.

---

## Troubleshooting

**La cámara no abre:**
- Verifica que tu cámara funciona en otras apps
- Intenta reiniciar Python

**Las imágenes no se guardan:**
- Verifica que tienes permisos en la carpeta `dataset/`
- Revisa que haya espacio en disco

**El modelo tiene baja precisión después de entrenar:**
- Agrega más imágenes (mínimo 50 por clase)
- Asegúrate de que las posiciones sean claras y distintas

---

¡Éxito! 🎉
