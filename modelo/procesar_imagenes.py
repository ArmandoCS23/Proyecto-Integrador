import os
import cv2
import pandas as pd
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from tqdm import tqdm

# Configuración
posturas = ['lumbalgia mecánica inespecífica', 'escoliosis lumbar', 'espondilolisis', 'hernia de disco lumbar']

# 1. Verificación inicial de imágenes
print("Verificando estructura del dataset...")
for postura in posturas:
    path = f'dataset/{postura}'
    if not os.path.exists(path):
        print(f"❌ Error: No existe la carpeta {path}")
        exit()
    
    imagenes = [f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if not imagenes:
        print(f"❌ Error: No hay imágenes en {path}")
        exit()
    print(f"✓ {postura}: {len(imagenes)} imágenes")

# 2. Configurar detector
base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    min_pose_detection_confidence=0.5
)
detector = vision.PoseLandmarker.create_from_options(options)

# 3. Procesamiento con manejo de errores
print("\nProcesando imágenes...")
dataset = []
columnas = [f'lm_{i}_{coord}' for i in range(33) for coord in ['x', 'y', 'z']]

for postura in posturas:
    print(f"\nAnalizando: {postura}")
    imagenes = [f for f in os.listdir(f'dataset/{postura}') if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    for img in tqdm(imagenes, desc=postura):
        try:
            # Convertir a formato compatible con MediaPipe
            img_path = f'dataset/{postura}/{img}'
            frame = cv2.imread(img_path)
            if frame is None:
                continue
                
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            imagen_mp = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
            
            # Detección
            resultado = detector.detect(imagen_mp)
            
            if resultado.pose_landmarks:
                landmarks = [coord for landmark in resultado.pose_landmarks[0] 
                           for coord in [landmark.x, landmark.y, landmark.z]]
                dataset.append(landmarks + [postura])
            else:
                print(f"\n⚠ No se detectó postura en {img_path}")
                
        except Exception as e:
            print(f"\n❌ Error procesando {img}: {str(e)}")

# 4. Guardar resultados
if dataset:
    df = pd.DataFrame(dataset, columns=columnas + ['clase'])
    df.to_csv('dataset_posturas.csv', index=False)
    print(f"\n✅ Dataset generado con {len(df)} muestras válidas")
else:
    print("\n❌ No se pudo generar el dataset. Razones posibles:")
    print("- Imágenes no contienen personas visibles")
    print("- Posturas no son detectables (muy similares)")
    print("- Problemas con el modelo pose_landmarker.task")