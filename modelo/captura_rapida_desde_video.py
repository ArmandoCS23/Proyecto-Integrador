"""
Script para capturar imágenes rápidamente desde la cámara.
Presiona 1-4 para capturar frames de la enfermedad correspondiente.
Presiona ESPACIO para capturar múltiples frames rápidamente.
Presiona ESC para salir.
"""

import os
import cv2
import time

# Configuración
posturas = ['lumbalgia mecánica inespecífica', 'escoliosis lumbar', 'espondilolisis', 'hernia de disco lumbar']
for postura in posturas:
    os.makedirs(f'dataset/{postura}', exist_ok=True)

def capturar_imagenes_rapidas():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    contador = {postura: 0 for postura in posturas}
    capturando = False
    clase_actual = None
    intervalo_captura = 0.1  # Capturar cada 100ms
    ultimo_capture = time.time()
    
    print("=" * 80)
    print("CAPTURADOR DE IMÁGENES RÁPIDO")
    print("=" * 80)
    print("\nInstrucciones:")
    print("  1: Capturar lumbalgia mecánica inespecífica")
    print("  2: Capturar escoliosis lumbar")
    print("  3: Capturar espondilolisis")
    print("  4: Capturar hernia de disco lumbar")
    print("  ESPACIO: Capturar rápidamente (cada 100ms)")
    print("  ESC: Salir")
    print("\n" + "=" * 80 + "\n")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Mostrar instrucciones
        texto = "1:Lumbalgia | 2:Escoliosis | 3:Espondilolisis | 4:Hernia | ESPACIO:Rapido | ESC:Salir"
        cv2.putText(frame, texto, (5, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        
        # Mostrar contador actual
        contador_texto = " | ".join([f"{p.split()[0]}:{contador[p]}" for p in posturas])
        cv2.putText(frame, contador_texto, (5, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        
        # Mostrar estado de captura rápida
        if capturando:
            cv2.putText(frame, "CAPTURANDO RAPIDO (ESPACIO para parar)", (5, 75), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            
            ahora = time.time()
            if ahora - ultimo_capture > intervalo_captura:
                cv2.imwrite(f'dataset/{clase_actual}/postura_{contador[clase_actual]}.jpg', frame)
                contador[clase_actual] += 1
                ultimo_capture = ahora
                print(f"✓ {clase_actual}: {contador[clase_actual]} imágenes")
        
        cv2.imshow('Captura de Posturas', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            if capturando:
                capturando = False
                print(f"\nCaptura rápida detenida. Total: {contador[clase_actual]} imágenes de {clase_actual}")
            else:
                break
        elif key == 32:  # ESPACIO
            if not capturando:
                # Detectar qué clase está seleccionada (si es que hay una)
                print("\nInicia captura rápida. Presiona ESPACIO nuevamente para detener.")
                capturando = True
                clase_actual = posturas[0]  # Por defecto, primera clase
                ultimo_capture = time.time()
            else:
                capturando = False
                print(f"\nCaptura rápida detenida. Total: {contador[clase_actual]} imágenes de {clase_actual}")
        elif 49 <= key <= 52:  # Teclas 1-4
            clase = posturas[key - 49]
            if capturando:
                capturando = False
                print(f"Captura rápida detenida.")
            clase_actual = clase
            cv2.imwrite(f'dataset/{clase}/postura_{contador[clase]}.jpg', frame)
            contador[clase] += 1
            print(f"✓ Imagen capturada: {clase} ({contador[clase]})")
    
    cap.release()
    cv2.destroyAllWindows()
    
    print("\n" + "=" * 80)
    print("RESUMEN FINAL:")
    print("=" * 80)
    total = 0
    for p in posturas:
        print(f"{p}: {contador[p]} imágenes")
        total += contador[p]
    print(f"\nTotal de imágenes capturadas: {total}")
    print("=" * 80)

if __name__ == "__main__":
    capturar_imagenes_rapidas()
