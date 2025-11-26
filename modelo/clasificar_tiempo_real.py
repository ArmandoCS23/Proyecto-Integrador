import cv2
import joblib
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.framework.formats import landmark_pb2


try:
    modelo = joblib.load('modelo_posturas.pkl')
    encoder = joblib.load('encoder.pkl')
except FileNotFoundError:
    print("Error: No se encontraron los archivos del modelo")
    print("Ejecuta primero 'entrenar_modelo.py'")
    exit()


base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    min_pose_detection_confidence=0.5
)
detector = vision.PoseLandmarker.create_from_options(options)


cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Error: No se pudo acceder a la cámara")
    exit()

# Colores para cada postura
colores = {
    'lumbalgia mecánica inespecífica': (0, 255, 0),      # Verde
    'hernia de disco lumbar': (0, 255, 255), # Amarillo
    'espondilolisis': (0, 0, 255),   # Rojo
    'escoliosis lumbar': (255, 0, 0)     # Azul
}

def evaluate_posture_simple(landmarks, posture_label):
    if not landmarks or not posture_label:
        return 'Sin evaluación', 'No hay datos suficientes'

    pts = [(landmarks[i], landmarks[i+1], landmarks[i+2]) for i in range(0, len(landmarks), 3)]
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24

    feedback = 'Bien'
    reason = 'Postura dentro de parámetros esperados'

    try:
        ls = pts[LEFT_SHOULDER]
        rs = pts[RIGHT_SHOULDER]
        lh = pts[LEFT_HIP]
        rh = pts[RIGHT_HIP]

        shoulder_avg_y = (ls[1] + rs[1]) / 2
        hip_avg_y = (lh[1] + rh[1]) / 2
        trunk_tilt = hip_avg_y - shoulder_avg_y

        if posture_label == 'espondilolisis':
            if trunk_tilt < 0.02:
                feedback = 'Mal'
                reason = 'Curvatura excesiva del tronco. Endereza la espalda.'
        elif posture_label == 'lumbalgia mecánica inespecífica':
            if abs(trunk_tilt) > 0.08:
                feedback = 'Mal'
                reason = 'Desalineación entre hombros y caderas.'
        elif posture_label == 'escoliosis lumbar':
            shoulder_diff = abs(ls[1] - rs[1])
            if shoulder_diff > 0.04:
                feedback = 'Mal'
                reason = 'Inclinación lateral marcada.'
        elif posture_label == 'hernia de disco lumbar':
            feedback = 'Mal'
            reason = 'Evita movimientos bruscos o torsiones; procura apoyo lumbar.'
    except Exception:
        return 'Sin evaluación', 'Error al calcular landmarks'

    return feedback, reason

print("\nIniciando clasificación en tiempo real...")
print("Presiona ESC para salir")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    # Convertir frame a formato MediaPipe
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    imagen_mp = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
    
    # Detectar postura
    resultado = detector.detect(imagen_mp)
    
    if resultado.pose_landmarks:
        # Convertir a NormalizedLandmarkList
        landmarks_proto = landmark_pb2.NormalizedLandmarkList()
        landmarks_proto.landmark.extend([
            landmark_pb2.NormalizedLandmark(x=landmark.x, y=landmark.y, z=landmark.z) 
            for landmark in resultado.pose_landmarks[0]
        ])
        
        # Extraer landmarks para el modelo
        landmarks_flatten = [coord for landmark in resultado.pose_landmarks[0] 
                           for coord in [landmark.x, landmark.y, landmark.z]]
        
        # Predecir postura (ignorar advertencia de nombres de características)
        with np.errstate(divide='ignore', invalid='ignore'):
            clase_num = modelo.predict([landmarks_flatten])[0]
            postura = encoder.inverse_transform([clase_num])[0]
            color = colores.get(postura, (255, 255, 255))

        # Tratar la etiqueta del modelo como la condición médica
        condition = postura if postura else 'No detectada'
        feedback_label, feedback_reason = evaluate_posture_simple(landmarks_flatten, postura)

        # Dibujar resultado
        cv2.putText(frame, f"Postura: {postura}", (20, 40), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
        cv2.putText(frame, f"Condicion: {condition}", (20, 80),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (30,30,30), 2)
        cv2.putText(frame, f"Feedback: {feedback_label}", (20, 110),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (30,30,30), 2)
        cv2.putText(frame, feedback_reason, (20, 140),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50,50,50), 1)

        # Dibujar landmarks y conexiones
        mp.solutions.drawing_utils.draw_landmarks(
            frame,
            landmarks_proto,
            mp.solutions.pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp.solutions.drawing_utils.DrawingSpec(
                color=color, thickness=2, circle_radius=2),
            connection_drawing_spec=mp.solutions.drawing_utils.DrawingSpec(
                color=color, thickness=2))
    
    cv2.imshow('Clasificador de Posturas', frame)
    if cv2.waitKey(1) == 27:  # ESC
        break

cap.release()
cv2.destroyAllWindows()