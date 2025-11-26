import cv2
import os
import time
from datetime import datetime

posturas = ['lumbalgia mecánica inespecífica', 'escoliosis lumbar', 'espondilolisis', 'hernia de disco lumbar']
for postura in posturas:
    os.makedirs(f'dataset/{postura}', exist_ok=True)

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print('No se pudo abrir la cámara.')
    exit()

recording = False
out = None
codec = cv2.VideoWriter_fourcc(*'mp4v')
selected_class = posturas[0]

print('Instrucciones:')
print('1-4: seleccionar clase\nR: empezar/detener grabación\nESC: salir')

while True:
    ret, frame = cap.read()
    if not ret:
        break

    condicion_text = f'Clase: {selected_class} | Grabando: {recording}'
    cv2.putText(frame, condicion_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.imshow('Capturar Videos', frame)

    key = cv2.waitKey(1) & 0xFF
    if key == 27:  # ESC
        break
    elif 49 <= key <= 52:  # 1-4
        selected_class = posturas[key - 49]
        print(f'Seleccionada clase: {selected_class}')
    elif key == ord('r') or key == ord('R'):
        if not recording:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'dataset/{selected_class}/video_{timestamp}.mp4'
            out = cv2.VideoWriter(filename, codec, 20.0, (int(cap.get(3)), int(cap.get(4))))
            recording = True
            print(f'Empezando grabación en: {filename}')
        else:
            recording = False
            out.release()
            out = None
            print('Grabación detenida')
    
    if recording and out is not None:
        out.write(frame)

cap.release()
if out is not None:
    out.release()
cv2.destroyAllWindows()
