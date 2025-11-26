"""
Script de calibración: extrae landmarks de un video y los compara consigo mismos
para obtener métricas de distancia mínima esperada y recomendaciones de tolerancia.
"""

import cv2
import mediapipe as mp
import numpy as np
from pathlib import Path
import statistics

# Configurar MediaPipe
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5)

def extract_landmarks_from_video(video_path, target_fps=2):
    """Extrae landmarks de un video muestreado."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"❌ No se pudo abrir {video_path}")
        return []
    
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(video_fps / target_fps)))
    
    seq = []
    frame_idx = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_idx % step == 0:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(frame_rgb)
            
            if results.pose_landmarks:
                landmarks = [coord for landmark in results.pose_landmarks.landmark
                           for coord in [landmark.x, landmark.y, landmark.z]]
                seq.append(landmarks)
        
        frame_idx += 1
    
    cap.release()
    return seq

def calc_distance(lm1, lm2):
    """Calcula distancia euclidiana entre dos listas de landmarks."""
    if not lm1 or not lm2 or len(lm1) != len(lm2):
        return None
    
    distances = []
    for i in range(0, len(lm1), 3):
        x1, y1, z1 = lm1[i], lm1[i+1], lm1[i+2]
        x2, y2, z2 = lm2[i], lm2[i+1], lm2[i+2]
        dist = np.sqrt((x1-x2)**2 + (y1-y2)**2 + (z1-z2)**2)
        distances.append(dist)
    
    return np.mean(distances), np.max(distances)

def calibrate_from_video(video_path):
    """Prueba: compara frames del mismo video entre sí."""
    print(f"\n📹 Extrayendo landmarks de {Path(video_path).name}...")
    landmarks_seq = extract_landmarks_from_video(video_path, target_fps=2)
    
    if len(landmarks_seq) < 2:
        print("❌ No se extrajeron suficientes frames.")
        return
    
    print(f"✓ Se extrajeron {len(landmarks_seq)} frames")
    
    # Calcular distancias entre frames consecutivos (variación natural)
    consecutive_distances = []
    for i in range(len(landmarks_seq) - 1):
        avg_d, max_d = calc_distance(landmarks_seq[i], landmarks_seq[i+1])
        if avg_d is not None:
            consecutive_distances.append(avg_d)
    
    # Calcular distancias entre frames más lejanos (variación mayor)
    distant_distances = []
    for i in range(0, len(landmarks_seq) - 5, 2):
        j = min(i + 5, len(landmarks_seq) - 1)
        avg_d, max_d = calc_distance(landmarks_seq[i], landmarks_seq[j])
        if avg_d is not None:
            distant_distances.append(avg_d)
    
    # Estadísticas
    if consecutive_distances:
        consec_avg = np.mean(consecutive_distances)
        consec_max = np.max(consecutive_distances)
        consec_min = np.min(consecutive_distances)
        consec_median = statistics.median(consecutive_distances)
        
        print(f"\n📊 Distancias entre frames CONSECUTIVOS:")
        print(f"   Promedio:  {consec_avg:.4f}")
        print(f"   Mín:       {consec_min:.4f}")
        print(f"   Máx:       {consec_max:.4f}")
        print(f"   Mediana:   {consec_median:.4f}")
    
    if distant_distances:
        dist_avg = np.mean(distant_distances)
        dist_max = np.max(distant_distances)
        dist_min = np.min(distant_distances)
        
        print(f"\n📊 Distancias entre frames DISTANTES (5 frames):")
        print(f"   Promedio:  {dist_avg:.4f}")
        print(f"   Mín:       {dist_min:.4f}")
        print(f"   Máx:       {dist_max:.4f}")
    
    # Recomendaciones
    print(f"\n💡 RECOMENDACIONES DE UMBRALES:")
    if consecutive_distances:
        print(f"\n   Tolerancia ESTRICTA (usuario imita perfectamente):")
        print(f"      - avg_distance < {consec_median * 1.2:.4f}")
        
        print(f"\n   Tolerancia NORMAL (usuario imita bien, con ligeras variaciones):")
        print(f"      - avg_distance < {consec_median * 2.0:.4f}")
        
        print(f"\n   Tolerancia RELAJADA (usuario imita aproximadamente):")
        print(f"      - avg_distance < {consec_median * 3.5:.4f}")
    
    print(f"\n🎯 Sugerencia:")
    print(f"   Para que el usuario imite sin problemas, usa:")
    print(f"      avg_threshold ~ 0.12-0.18 (depende del video y cámara)")
    print(f"      max_threshold ~ 0.30-0.45")
    print(f"      O ajusta 'Tolerancia' en la UI (slider: 1.0-1.5 es recomendado)")

def find_and_calibrate():
    """Busca el primer video en dataset/ y lo calibra."""
    dataset_path = Path('dataset')
    if not dataset_path.exists():
        print("❌ Carpeta 'dataset' no encontrada.")
        return
    
    video_files = list(dataset_path.rglob('*.mp4'))
    if not video_files:
        print("❌ No se encontraron videos .mp4 en dataset/")
        return
    
    video_path = video_files[0]
    print(f"✓ Video encontrado: {video_path.relative_to(dataset_path)}")
    calibrate_from_video(str(video_path))

if __name__ == '__main__':
    find_and_calibrate()
