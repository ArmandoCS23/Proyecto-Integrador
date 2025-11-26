## Integrantes del proyecto

| Nombre                                  |
|-----------------------------------------|
| Armando Castelán Sánchez                |
| Josandy Danae Barqueras Andrade         |
| Luz Amairani Martinez Monroy            |

---

## Descarga del modelo de MediaPipe

Para utilizar los landmarker avanzados de MediaPipe, descarga el modelo necesario ejecutando:

```sh
wget -O pose_landmarker.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task
```

> [!NOTE]
> Si usas Windows y no tienes `wget`, puedes descargar el archivo manualmente desde el enlace anterior.

---

## Descripción

Este proyecto implementa un sistema de clasificación de posturas humanas utilizando puntos clave del cuerpo (landmarks) extraídos con MediaPipe y un modelo de machine learning. El sistema permite identificar condiciones como **lumbalgia mecánica inespecífica**, **escoliosis lumbar**, **espondilolisis** y **hernia de disco lumbar** en tiempo real o desde imágenes.

> [!NOTE]
> MediaPipe es una librería de Google muy eficiente para la extracción de puntos clave del cuerpo, rostro y manos.

---

## Pasos realizados

### 1. Propuesta y planteamiento

Se propone un sistema capaz de clasificar posturas humanas a partir de imágenes o video, usando los landmarks del cuerpo extraídos con MediaPipe. El objetivo es entrenar un modelo de machine learning que reconozca diferentes posturas.

> [!TIP]
> Puedes adaptar este sistema para otras tareas de clasificación usando landmarks, como gestos de manos o expresiones faciales.

### 2. Recolección de imágenes

- Se crearon carpetas para cada postura en `dataset/`.
- Las imágenes se recolectaron de internet y mediante la webcam usando [`captura_imagenes.py`](captura_imagenes.py).
- No es indispensable almacenar todas las imágenes, pero se recomienda para reproducibilidad.

> [!IMPORTANT]
> Asegúrate de tener suficientes imágenes variadas para cada clase de postura para mejorar la precisión del modelo.

### 3. Extracción de características con MediaPipe

- Se utilizó [`procesar_imagenes.py`](procesar_imagenes.py) para procesar las imágenes y extraer los landmarks del cuerpo usando MediaPipe.
- Los datos extraídos se guardaron en un archivo CSV: [`dataset_posturas.csv`](dataset_posturas.csv).

> [!WARNING]
> Verifica que todas las imágenes sean procesadas correctamente; imágenes mal procesadas pueden afectar el entrenamiento.

### 4. Entrenamiento del modelo

- Se entrenó un modelo de clasificación (Random Forest) usando [`entrenar_modelo.py`](entrenar_modelo.py).
- El modelo y el encoder de clases se guardaron como [`modelo_posturas.pkl`](modelo_posturas.pkl) y [`encoder.pkl`](encoder.pkl).

### 5. Prueba del modelo

- Se evaluó el modelo con un conjunto de prueba y se generó un reporte de clasificación.
- Se puede realizar clasificación en tiempo real con [`clasificar_tiempo_real.py`](clasificar_tiempo_real.py).

> [!CAUTION]
> Si el modelo no reconoce bien las posturas, revisa la calidad y cantidad de los datos de entrenamiento.

### 6. Implementación en aplicación web

- Se desarrolló una aplicación web con Flask y SocketIO en [`app.py`](app.py).
- La interfaz web permite ver la cámara y la postura detectada en tiempo real ([`templates/index.html`](templates/index.html)).

---

## Requisitos

- Python 3.8+
- MediaPipe
- scikit-learn
- Flask
- Flask-SocketIO
- OpenCV

Instalar dependencias:
```sh
pip install -r requirements.txt
```

> [!NOTE]
> Si usas Python 3.12, asegúrate de que la versión de numpy sea >=1.26.0 para evitar errores de compatibilidad.

---

## Estructura del repositorio

```
proyecto_postura/
│
├── app.py
├── captura_imagenes.py
├── clasificar_tiempo_real.py
├── entrenar_modelo.py
├── procesar_imagenes.py
├── dataset/
│   ├── [escoliosis lumbar]/
│   ├── [espondilolisis]/
│   ├── [hernia de disco lumbar]/
│   ├── [lumbalgia mecánica inespecífica]/
├── dataset_posturas.csv
├── modelo_posturas.pkl
├── encoder.pkl
├── requirements.txt
├── README.md
└── templates/
   └── index.html
```

---

## Uso rápido

1. **Recolectar imágenes:**  
   Ejecutar `captura_imagenes.py` o agregar imágenes a `dataset/`.

2. **Procesar imágenes y generar dataset:**  
   ```
   python procesar_imagenes.py
   ```

3. **Entrenar el modelo:**  
   ```
   python entrenar_modelo.py
   ```

4. **Probar el modelo en tiempo real:**  
   ```
   python clasificar_tiempo_real.py
   ```

5. **Iniciar la aplicación web:**  
   ```
   python app.py
   ```

---

## Estado del proyecto

- [x] Recolección de imágenes
- [x] Procesamiento y extracción de landmarks
- [x] Entrenamiento del modelo
- [x] Clasificación en tiempo real
- [x] Aplicación web

> [!INFO]
> El proyecto está completo y funcionando. Se recomienda seguir los pasos de este README para reproducir el sistema.