import os
import cv2
import argparse
import pandas as pd
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from tqdm import tqdm

# -- Helpers copied from entrenar_modelo.py

def extract_frames_from_video(video_path, target_fps=1):
    frames = []
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return frames
    orig_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    step = max(1, int(round(orig_fps / target_fps)))
    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % step == 0:
            frames.append(frame)
        idx += 1
    cap.release()
    return frames


def process_frame_landmarks(frame, detector):
    try:
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        imagen_mp = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        resultado = detector.detect(imagen_mp)
        if resultado.pose_landmarks:
            landmarks = [coord for landmark in resultado.pose_landmarks[0] for coord in [landmark.x, landmark.y, landmark.z]]
            return landmarks
    except Exception as e:
        return None
    return None


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Procesar videos para extraer frames y generar CSV con landmarks')
    parser.add_argument('--input-dir', type=str, default='dataset', help='Carpeta raíz con subcarpetas por clase que contienen videos')
    parser.add_argument('--fps', type=int, default=1, help='FPS a extraer de cada video')
    parser.add_argument('--save-frames', action='store_true', help='Guardar frames extraídos en disco (subcarpeta frames/)')
    parser.add_argument('--output', type=str, default='dataset_posturas_videos.csv', help='Archivo CSV de salida')
    args = parser.parse_args()

    # Configurar MediaPipe
    base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
    options = vision.PoseLandmarkerOptions(base_options=base_options, min_pose_detection_confidence=0.5)
    detector = vision.PoseLandmarker.create_from_options(options)

    # Recorrer input dir
    if not os.path.exists(args.input_dir):
        print(f"Error: {args.input_dir} no existe")
        exit(1)

    # Buscar subfolders (classes) y videos
    classes = [d for d in os.listdir(args.input_dir) if os.path.isdir(os.path.join(args.input_dir, d))]
    if not classes:
        print("No se encontraron subcarpetas con clases en el input_dir")
        exit(1)

    print(f"Clases detectadas: {classes}")

    dataset = []
    columnas = [f'lm_{i}_{coord}' for i in range(33) for coord in ['x','y','z']]
    video_extensions = ('.mp4', '.avi', '.mov', '.mkv', '.webm')

    for cls in classes:
        cls_path = os.path.join(args.input_dir, cls)
        videos = [f for f in os.listdir(cls_path) if f.lower().endswith(video_extensions)]
        print(f"Procesando {len(videos)} videos para clase '{cls}'")
        for v in tqdm(videos, desc=f"{cls}"):
            vpath = os.path.join(cls_path, v)
            frames = extract_frames_from_video(vpath, target_fps=args.fps)
            if not frames:
                print(f"WARN: No se pudieron extraer frames de {vpath}")
                continue
            if args.save_frames:
                frames_dir = os.path.join(cls_path, 'frames', os.path.splitext(v)[0])
                os.makedirs(frames_dir, exist_ok=True)
            for i, f in enumerate(frames):
                lands = process_frame_landmarks(f, detector)
                if lands:
                    dataset.append(lands + [cls])
                    if args.save_frames:
                        fname = os.path.join(frames_dir, f"frame_{i:04d}.jpg")
                        cv2.imwrite(fname, f)

    if dataset:
        df = pd.DataFrame(dataset, columns=columnas + ['clase'])
        df.to_csv(args.output, index=False)
        print(f"CSV generado: {args.output} con {len(df)} filas")
    else:
        print("No se generó dataset: no se detectaron landmarks en los videos")
