"""
Script para convertir videos a formato compatible con dispositivos móviles
Codec: H.264 baseline profile, resolución 720p, 30fps
"""
import cv2
import os
from pathlib import Path

def convert_video_to_mobile_compatible(input_path, output_path, target_width=720, target_fps=30):
    """
    Convierte un video a formato compatible con móviles.
    
    Args:
        input_path: Ruta del video original
        output_path: Ruta donde guardar el video convertido
        target_width: Ancho objetivo (altura se calcula manteniendo aspect ratio)
        target_fps: FPS objetivo
    """
    print(f"Convirtiendo: {input_path.name}")
    
    # Abrir video original
    cap = cv2.VideoCapture(str(input_path))
    if not cap.isOpened():
        print(f"  ✗ Error: no se pudo abrir {input_path.name}")
        return False
    
    # Obtener propiedades del video original
    orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    orig_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Calcular nueva altura manteniendo aspect ratio
    aspect_ratio = orig_height / orig_width
    target_height = int(target_width * aspect_ratio)
    # Asegurar que sean números pares (requerido por algunos codecs)
    if target_height % 2 != 0:
        target_height += 1
    
    print(f"  Original: {orig_width}x{orig_height} @ {orig_fps:.1f}fps")
    print(f"  Objetivo: {target_width}x{target_height} @ {target_fps}fps")
    
    # Configurar codec - usar mp4v (MPEG-4) que es ampliamente compatible
    # En producción, usar ffmpeg para H.264 proper, pero mp4v funciona con OpenCV
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    
    # Crear directorio de salida si no existe
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Crear escritor de video
    out = cv2.VideoWriter(
        str(output_path),
        fourcc,
        target_fps,
        (target_width, target_height)
    )
    
    if not out.isOpened():
        print(f"  ✗ Error: no se pudo crear el archivo de salida")
        cap.release()
        return False
    
    # Procesar frames
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Redimensionar frame
        resized = cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)
        out.write(resized)
        
        frame_count += 1
        if frame_count % 30 == 0:
            progress = (frame_count / total_frames) * 100 if total_frames > 0 else 0
            print(f"  Progreso: {progress:.1f}%", end='\r')
    
    print(f"  ✓ Completado: {frame_count} frames procesados")
    
    cap.release()
    out.release()
    return True

def convert_all_videos(source_dir, output_dir):
    """
    Convierte todos los videos en un directorio y sus subdirectorios.
    
    Args:
        source_dir: Directorio con videos originales
        output_dir: Directorio donde guardar videos convertidos
    """
    source_path = Path(source_dir)
    output_path = Path(output_dir)
    
    if not source_path.exists():
        print(f"Error: {source_dir} no existe")
        return
    
    # Buscar todos los archivos .mp4
    video_files = list(source_path.rglob('*.mp4'))
    
    if not video_files:
        print(f"No se encontraron videos .mp4 en {source_dir}")
        return
    
    print(f"Encontrados {len(video_files)} videos para convertir\n")
    
    successful = 0
    failed = 0
    
    for video_file in video_files:
        # Mantener la estructura de subdirectorios
        relative_path = video_file.relative_to(source_path)
        output_file = output_path / relative_path
        
        # Saltar si ya existe
        if output_file.exists():
            print(f"Saltando (ya existe): {relative_path}")
            continue
        
        try:
            if convert_video_to_mobile_compatible(video_file, output_file):
                successful += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  ✗ Error inesperado: {e}")
            failed += 1
        
        print()  # Línea en blanco entre conversiones
    
    print(f"\n{'='*60}")
    print(f"Conversión completada:")
    print(f"  ✓ Exitosos: {successful}")
    print(f"  ✗ Fallidos: {failed}")
    print(f"  Total: {len(video_files)}")
    print(f"{'='*60}")

if __name__ == '__main__':
    # Convertir videos del dataset
    source_directory = Path('dataset')
    output_directory = Path('../app_movil/assets/videos_compatible')
    
    print("="*60)
    print("CONVERTIDOR DE VIDEOS A FORMATO COMPATIBLE MÓVIL")
    print("="*60)
    print(f"Origen: {source_directory.absolute()}")
    print(f"Destino: {output_directory.absolute()}")
    print("="*60)
    print()
    
    convert_all_videos(source_directory, output_directory)
