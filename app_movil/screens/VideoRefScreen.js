import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Video, Audio } from "expo-av";
import { SERVER_URL } from "../config";

// Mapeo de videos disponibles - usar URIs del servidor en lugar de require()
// Esto permite que el decodificador nativo del dispositivo maneje el formato
const AVAILABLE_VIDEOS = {
  "escoliosis lumbar": [
    { name: "Ambas rodillas al pecho.mp4", src: { uri: `${SERVER_URL}/api/video/escoliosis lumbar/Ambas rodillas al pecho.mp4` } },
    { name: "Cubito supino.mp4", src: { uri: `${SERVER_URL}/api/video/escoliosis lumbar/Cubito supino.mp4` } },
    { name: "Perro de caza.mp4", src: { uri: `${SERVER_URL}/api/video/escoliosis lumbar/Perro de caza.mp4` } },
    { name: "Plancha lateral.mp4", src: { uri: `${SERVER_URL}/api/video/escoliosis lumbar/Plancha lateral.mp4` } },
    { name: "Postura del Avion.mp4", src: { uri: `${SERVER_URL}/api/video/escoliosis lumbar/Postura del Avion.mp4` } },
    { name: "Puente.mp4", src: { uri: `${SERVER_URL}/api/video/escoliosis lumbar/Puente.mp4` } },
    { name: "Rodilla al pecho.mp4", src: { uri: `${SERVER_URL}/api/video/escoliosis lumbar/Rodilla al pecho.mp4` } },
  ],
  "espondilolisis": [
    { name: "Abdominales.mp4", src: { uri: `${SERVER_URL}/api/video/espondilolisis/Abdominales.mp4` } },
    { name: "Ambas rodillas al pecho.mp4", src: { uri: `${SERVER_URL}/api/video/espondilolisis/Ambas rodillas al pecho.mp4` } },
    { name: "Perro de caza.mp4", src: { uri: `${SERVER_URL}/api/video/espondilolisis/Perro de caza.mp4` } },
    { name: "Plancha sobre codos.mp4", src: { uri: `${SERVER_URL}/api/video/espondilolisis/Plancha sobre codos.mp4` } },
    { name: "Puente.mp4", src: { uri: `${SERVER_URL}/api/video/espondilolisis/Puente.mp4` } },
    { name: "Rodilla al pecho.mp4", src: { uri: `${SERVER_URL}/api/video/espondilolisis/Rodilla al pecho.mp4` } },
  ],
  "hernia de disco lumbar": [
    { name: "Ambas rodillas al pecho.mp4", src: { uri: `${SERVER_URL}/api/video/hernia de disco lumbar/Ambas rodillas al pecho.mp4` } },
    { name: "El perro y gato.mp4", src: { uri: `${SERVER_URL}/api/video/hernia de disco lumbar/El perro y gato.mp4` } },
    { name: "En cuatro puntos.mp4", src: { uri: `${SERVER_URL}/api/video/hernia de disco lumbar/En cuatro puntos.mp4` } },
    { name: "Piernas al abdomen.mp4", src: { uri: `${SERVER_URL}/api/video/hernia de disco lumbar/Piernas al abdomen.mp4` } },
    { name: "Posicion de cobra.mp4", src: { uri: `${SERVER_URL}/api/video/hernia de disco lumbar/Posicion de cobra.mp4` } },
    { name: "Posicion de esfinge.mp4", src: { uri: `${SERVER_URL}/api/video/hernia de disco lumbar/Posicion de esfinge.mp4` } },
    { name: "Rodilla al pecho.mp4", src: { uri: `${SERVER_URL}/api/video/hernia de disco lumbar/Rodilla al pecho.mp4` } },
  ],
  "lumbalgia mecánica inespecífica": [
    { name: "Abdominales (pierna contraria).mp4", src: { uri: `${SERVER_URL}/api/video/lumbalgia mecánica inespecífica/Abdominales (pierna contraria).mp4` } },
    { name: "Abdominales (pierna del mismo lado).mp4", src: { uri: `${SERVER_URL}/api/video/lumbalgia mecánica inespecífica/Abdominales (pierna del mismo lado).mp4` } },
    { name: "Abdominales.mp4", src: { uri: `${SERVER_URL}/api/video/lumbalgia mecánica inespecífica/Abdominales.mp4` } },
    { name: "El perro y gato.mp4", src: { uri: `${SERVER_URL}/api/video/lumbalgia mecánica inespecífica/El perro y gato.mp4` } },
    { name: "Extension de la columna.mp4", src: { uri: `${SERVER_URL}/api/video/lumbalgia mecánica inespecífica/Extension de la columna.mp4` } },
    { name: "Inclinacion pelvica de pie.mp4", src: { uri: `${SERVER_URL}/api/video/lumbalgia mecánica inespecífica/Inclinacion pelvica de pie.mp4` } },
    { name: "Perro de caza.mp4", src: { uri: `${SERVER_URL}/api/video/lumbalgia mecánica inespecífica/Perro de caza.mp4` } },
    { name: "Plancha lateral.mp4", src: { uri: `${SERVER_URL}/api/video/lumbalgia mecánica inespecífica/Plancha lateral.mp4` } },
    { name: "Puente.mp4", src: { uri: `${SERVER_URL}/api/video/lumbalgia mecánica inespecífica/Puente.mp4` } },
  ],
};

export default function VideoRefScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState("select_condition"); // "select_condition" | "select_video" | "recording"
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [mensajePostura, setMensajePostura] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [facing, setFacing] = useState("front");
  const [videoCurrentTime, setVideoCurrentTime] = useState(0); // ⭐ Sincronización: tiempo actual del video
  const [videoLoaded, setVideoLoaded] = useState(false); // ⭐ Indica si video está listo
  const [isVideoExpanded, setIsVideoExpanded] = useState(false); // ⭐ Controla modo expandido del video
  const [noMovementWarning, setNoMovementWarning] = useState(false); // ⭐ Aviso de falta de movimiento
  const [lastMovementTime, setLastMovementTime] = useState(Date.now()); // ⭐ Último momento con movimiento detectado
  const [distanceWarning, setDistanceWarning] = useState(null); // ⭐ Aviso de distancia: 'too_close' | 'too_far' | null
  const [connectionError, setConnectionError] = useState(false); // ⭐ Error de conexión
  const [videoError, setVideoError] = useState(false); // ⭐ Error al cargar video
  const cameraRef = useRef(null);
  const videoRef = useRef(null);
  const syncIntervalRef = useRef(null); // ⭐ Referencia al intervalo de sincronización
  const previousFrameRef = useRef(null); // ⭐ Frame anterior para detección de movimiento

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  // ⭐ Estado para rastrear el último feedback y evitar sonidos repetidos
  const [lastFeedback, setLastFeedback] = useState(null);
  const soundSuccessRef = useRef(null);
  const soundErrorRef = useRef(null);

  // ⭐ Cargar y configurar sonidos de feedback
  useEffect(() => {
    const setupSounds = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Crear sonidos usando frecuencias (beeps)
        // Sonido de éxito: beep agudo corto
        // Sonido de error: beep grave largo
      } catch (error) {
        console.log("Error configurando audio:", error);
      }
    };
    setupSounds();

    return () => {
      // Limpiar sonidos al desmontar
      if (soundSuccessRef.current) {
        soundSuccessRef.current.unloadAsync();
      }
      if (soundErrorRef.current) {
        soundErrorRef.current.unloadAsync();
      }
    };
  }, []);

  // ⭐ Función para reproducir sonido de éxito
  const playSuccessSound = async () => {
    try {
      // Vibración para feedback táctil
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100); // Vibración corta para éxito
      }
      
      // Crear sonido usando Web Audio API (si está disponible)
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Frecuencia alta (aguda) para éxito
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      }
    } catch (error) {
      // Silenciar errores de audio
    }
  };

  // ⭐ Función para reproducir sonido de error
  const playErrorSound = async () => {
    try {
      // Vibración para feedback táctil
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([150, 50, 150]); // Vibración doble para error
      }
      
      // Crear sonido usando Web Audio API (si está disponible)
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 300; // Frecuencia baja (grave) para error
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.25);
      }
    } catch (error) {
      // Silenciar errores de audio
    }
  };

  // ⭐ Efecto para establecer el video de referencia en el servidor cuando se selecciona
  useEffect(() => {
    if (step === "recording" && selectedVideo && selectedCondition && videoLoaded) {
      const setReferenceVideo = async () => {
        try {
          // Informar al servidor sobre el video de referencia seleccionado
          // El servidor buscará el video en dataset/<condicion>/<nombre_video>
          const response = await fetch(`${SERVER_URL}/api/set_reference_video`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              condition: selectedCondition,
              video_name: selectedVideo.name,
              target_fps: 2,
            }),
          });
          
          const result = await response.json();
          if (result.success) {
            console.log("Video de referencia establecido en servidor:", result.message);
          } else {
            console.warn("No se pudo establecer video de referencia en servidor:", result.message);
            console.warn("El servidor usará heurísticas en lugar de comparación con video");
          }
        } catch (err) {
          console.warn("Error al establecer video de referencia:", err);
          console.warn("El servidor usará heurísticas en lugar de comparación con video");
        }
      };
      
      // Esperar un momento para que el video esté completamente cargado
      const timeout = setTimeout(() => {
        setReferenceVideo();
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [step, selectedVideo, selectedCondition, videoLoaded]);

  // ⭐ Efecto de sincronización de tiempo del video con servidor
  useEffect(() => {
    if (step === "recording" && videoLoaded && videoCurrentTime !== null) {
      // Limpiar intervalo anterior si existe
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      // Emitir tiempo cada 250ms al servidor (igual que en web)
      syncIntervalRef.current = setInterval(async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout para sync
          
          await fetch(`${SERVER_URL}/api/sync_reference_time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ current_time: videoCurrentTime }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
        } catch (err) {
          // Silenciar errores de sincronización (no es crítico)
          // Solo loguear si no es un error de aborto
          if (err.name !== 'AbortError') {
            console.log("Sync error (non-blocking):", err.message);
          }
        }
      }, 250);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [step, videoLoaded, videoCurrentTime]);

  // ⭐ Detección de movimiento mejorada: compara hash de frames consecutivos
  // (Se usa principalmente como respaldo, la detección principal se hace con la respuesta del servidor)
  const detectMovement = (currentBase64) => {
    if (!previousFrameRef.current) {
      previousFrameRef.current = currentBase64.substring(0, 1000); // Guardar solo una porción para comparación rápida
      return true; // Primer frame, asumir movimiento
    }

    // Comparación mejorada: comparar una porción del hash para detectar cambios significativos
    const currentHash = currentBase64.substring(0, 1000);
    const previousHash = previousFrameRef.current;
    
    // Calcular diferencia simple (número de caracteres diferentes)
    let differences = 0;
    const minLength = Math.min(currentHash.length, previousHash.length);
    for (let i = 0; i < minLength; i++) {
      if (currentHash[i] !== previousHash[i]) {
        differences++;
      }
    }
    
    // Si hay más del 5% de diferencias, hay movimiento
    const hasMovement = differences > (minLength * 0.05);
    previousFrameRef.current = currentHash;
    
    return hasMovement;
  };

  // Captura periódica y evaluación remota (SIN mostrar capturas, solo feedback)
  useEffect(() => {
    let captureInterval;
    let movementCheckInterval;

    const doCapture = async () => {
      try {
        // ⭐ Verificar que la cámara esté lista y disponible
        if (!cameraRef.current) {
          console.log("Camera ref is null, skipping capture");
          setIsEvaluating(false);
          return;
        }

        if (!cameraRef.current.takePictureAsync) {
          console.log("takePictureAsync not available, camera may not be ready");
          setIsEvaluating(false);
          return;
        }

        if (isEvaluating) {
          return; // Ya hay una evaluación en curso
        }

        setIsEvaluating(true);
        let photo = null;
        try {
          photo = await cameraRef.current.takePictureAsync({
            quality: 0.3, // Menor calidad para más velocidad
            base64: true,
            skipProcessing: true,
          });
        } catch (captureErr) {
          console.log("capture attempt failed, retrying:", captureErr);
          // retry once after short delay
          await new Promise((res) => setTimeout(res, 500));
          
          // Verificar nuevamente que la cámara esté disponible
          if (!cameraRef.current || !cameraRef.current.takePictureAsync) {
            console.log("Camera not available after retry");
            setIsEvaluating(false);
            return;
          }

          try {
            photo = await cameraRef.current.takePictureAsync({
              quality: 0.3,
              base64: true,
              skipProcessing: true,
            });
          } catch (secondErr) {
            console.log("second capture attempt failed:", secondErr);
            setMensajePostura("Cámara no disponible");
            setShowFeedback(true);
            setTimeout(() => setShowFeedback(false), 1500);
            setIsEvaluating(false);
            return; // abort this cycle
          }
        }

        if (photo && photo.base64) {
          // ⭐ Detectar movimiento básico (respaldo)
          detectMovement(photo.base64);

          try {
            // ⭐ Timeout aumentado y mejor manejo de errores
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

            const resp = await fetch(`${SERVER_URL}/api/evaluate_frame`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify({
                image: `data:image/jpeg;base64,${photo.base64}`,
                // ⭐ Enviar información del video de referencia para sincronización
                reference_video: selectedVideo ? {
                  condition: selectedCondition,
                  video_name: selectedVideo.name,
                  current_time: videoCurrentTime,
                } : null,
              }),
              signal: controller.signal,
            }).catch((fetchError) => {
              clearTimeout(timeoutId);
              throw fetchError;
            });

            clearTimeout(timeoutId);
            setConnectionError(false);

            if (!resp || !resp.ok) {
              throw new Error(`HTTP error! status: ${resp ? resp.status : 'no response'}`);
            }

            const j = await resp.json();
            if (j && j.success) {
              const serverFeedback = (j.feedback || "Evaluado");
              const serverMetrics = j.metrics || {};
              const posture = j.posture || null;
              const distanceStatus = j.distance_status || null;
              const poseSize = j.pose_size || null;
              const serverIsGood = (typeof j.is_good === 'boolean') ? j.is_good : null;
              const serverConfidence = (typeof j.confidence === 'number') ? j.confidence : null;

              // ⭐ Detección de movimiento y distancia mejorada
              if (posture && posture !== "No detectada") {
                setLastMovementTime(Date.now());
                setNoMovementWarning(false);
                
                // ⭐ Detección de distancia: actualizar aviso según distancia del usuario
                if (distanceStatus === 'too_close') {
                  setDistanceWarning('too_close');
                } else if (distanceStatus === 'too_far') {
                  setDistanceWarning('too_far');
                } else if (distanceStatus === 'optimal') {
                  setDistanceWarning(null); // Distancia óptima, no mostrar aviso
                } else {
                  // Si no hay información de distancia pero hay postura, asumir óptima
                  setDistanceWarning(null);
                }
              } else {
                // Si no se detecta postura, puede ser falta de movimiento o persona fuera de frame
                const timeSinceLastMovement = Date.now() - lastMovementTime;
                if (timeSinceLastMovement > 3000) {
                  // Solo mostrar aviso si ya pasaron 3 segundos sin detección
                  setNoMovementWarning(true);
                }
                // Si no hay postura detectada, probablemente está muy lejos o fuera de frame
                // Solo mostrar aviso de distancia si no hay aviso de movimiento (para no duplicar)
                if (timeSinceLastMovement <= 3000) {
                  setDistanceWarning('too_far');
                }
              }

              // ⭐ Priorizar valor booleano del servidor si está disponible
              let isGood = false;
              let displayText = "Evaluando...";

              if (!posture || posture === "No detectada") {
                displayText = "No se detecta postura";
                setLastFeedback(null);
              } else if (serverIsGood !== null) {
                isGood = serverIsGood;
                displayText = isGood ? "Bien — ¡Buen movimiento!" : "Mal — Ajusta la postura";
                // Si tenemos confianza numérica, podemos mostrarla en métricas
                if (serverConfidence !== null && serverConfidence >= 0) {
                  setMetrics((prev) => ({ ...prev, server_confidence: serverConfidence }));
                }
              } else if (serverFeedback) {
                const feedbackLower = serverFeedback.toLowerCase();
                if (feedbackLower.includes("sin evaluación") || feedbackLower.includes("no hay datos")) {
                  displayText = "Esperando detección...";
                  setLastFeedback(null);
                } else {
                  isGood = feedbackLower.includes("bien") || feedbackLower.includes("excelente") || feedbackLower.includes("buena");
                  displayText = isGood ? "Bien — ¡Buen movimiento!" : "Mal — Ajusta la postura";
                }
              } else if (serverMetrics && typeof serverMetrics.avg_distance === "number") {
                isGood = serverMetrics.avg_distance < 0.08;
                if (serverMetrics.max_distance && serverMetrics.max_distance > 0.20) {
                  isGood = false;
                }
                displayText = isGood ? "Bien — ¡Buen movimiento!" : "Mal — Ajusta la postura";
              } else {
                displayText = "Evaluando...";
                setLastFeedback(null);
              }

              // ⭐ Reproducir sonido solo si el feedback cambió
              if (lastFeedback !== isGood) {
                if (isGood) {
                  playSuccessSound();
                } else {
                  playErrorSound();
                }
                setLastFeedback(isGood);
              }

              setMensajePostura(displayText);
              setMetrics(serverMetrics);
            } else {
              setMensajePostura("Error de evaluación");
              setConnectionError(false); // Si hay respuesta pero no success, no es error de conexión
            }
          } catch (err) {
            console.log("Network eval error", err);
            setConnectionError(true);
            setMensajePostura("Sin conexión");
            setNoMovementWarning(false); // Ocultar aviso de movimiento si hay error de conexión
            setDistanceWarning(null); // Ocultar aviso de distancia si hay error de conexión
            
            // Si es error de timeout o red, mostrar mensaje más específico
            if (err.name === 'AbortError') {
              setMensajePostura("Timeout - Verifica tu conexión");
            } else if (err.message && err.message.includes('Network request failed')) {
              setMensajePostura("Error de red - Verifica el servidor");
            } else if (err.message && err.message.includes('Failed to fetch')) {
              setMensajePostura("No se puede conectar al servidor");
            }
          }

          setShowFeedback(true);
          setTimeout(() => setShowFeedback(false), 2000); // Mostrar feedback 2s
          setIsEvaluating(false);
        } else {
          // Si no hay foto, resetear estado
          setIsEvaluating(false);
        }
      } catch (e) {
        console.log("capture error", e);
        setIsEvaluating(false);
      }
    };

    // ⭐ Verificar movimiento periódicamente
    const checkMovement = () => {
      const timeSinceLastMovement = Date.now() - lastMovementTime;
      // Si no hay movimiento por más de 5 segundos, mostrar aviso
      if (timeSinceLastMovement > 5000) {
        setNoMovementWarning(true);
      } else {
        setNoMovementWarning(false);
      }
    };

    if (step === "recording" && isCameraReady) {
      doCapture();
      captureInterval = setInterval(doCapture, 1500); // Evaluar cada 1.5s
      movementCheckInterval = setInterval(checkMovement, 2000); // Verificar movimiento cada 2s
    }

    return () => {
      if (captureInterval) clearInterval(captureInterval);
      if (movementCheckInterval) clearInterval(movementCheckInterval);
    };
  }, [step, isCameraReady, isEvaluating, lastMovementTime]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Verificando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Se necesita acceso a la cámara</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Dar permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Paso 1: Seleccionar condición médica
  if (step === "select_condition") {
    return (
      <View style={styles.previewContainer}>
        <Text style={styles.title}>Selecciona una condición médica</Text>
        <ScrollView style={styles.listContainer}>
          {Object.keys(AVAILABLE_VIDEOS).map((condition) => (
            <TouchableOpacity
              key={condition}
              style={styles.conditionButton}
              onPress={() => {
                setSelectedCondition(condition);
                setStep("select_video");
              }}
            >
              <Text style={styles.conditionButtonText}>{condition}</Text>
              <Ionicons name="chevron-forward" size={24} color="#7a8ce2" />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>⬅ Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Paso 2: Seleccionar video
  if (step === "select_video" && selectedCondition) {
    const videos = AVAILABLE_VIDEOS[selectedCondition] || [];
    return (
      <View style={styles.previewContainer}>
        <Text style={styles.title}>Elige un video de referencia</Text>
        <Text style={styles.subtitle}>{selectedCondition}</Text>
        <ScrollView style={styles.listContainer}>
          {videos.map((video, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.videoButton}
              onPress={() => {
                setSelectedVideo(video);
                setStep("recording");
              }}
            >
              <Ionicons name="play-circle" size={32} color="#7a8ce2" />
              <Text style={styles.videoButtonText}>{video.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            setSelectedCondition(null);
            setStep("select_condition");
          }}
        >
          <Text style={styles.backText}>⬅ Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Paso 3: Grabación y evaluación en tiempo real
  if (step === "recording" && selectedCondition && selectedVideo) {

    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          ref={cameraRef}
          facing={facing}
          onCameraReady={() => setIsCameraReady(true)}
        />

        {/* ⭐ Video de referencia en overlay (PiP) - Versión compacta en esquina inferior izquierda */}
        {!isVideoExpanded && selectedVideo && (
          <TouchableOpacity
            style={styles.videoPiPContainer}
            onPress={() => setIsVideoExpanded(true)}
            activeOpacity={0.8}
          >
            {!videoError && selectedVideo?.src ? (
              <Video
                ref={videoRef}
                source={selectedVideo.src}
                style={styles.videoPiP}
                rate={1.0}
                volume={0.5}
                resizeMode="cover"
                shouldPlay
                useNativeControls={false}
                isLooping={true}
                onProgress={(e) => {
                  setVideoCurrentTime(e.currentTime);
                }}
                onLoad={() => {
                  console.log("✓ Video PiP cargado:", selectedVideo.name);
                  setVideoLoaded(true);
                  setVideoError(false);
                }}
                onLoadStart={() => {
                  console.log("→ Iniciando carga Video PiP:", selectedVideo.name);
                  setVideoError(false);
                }}
                onError={(error) => {
                  console.error("✗ Video PiP error:", error);
                  console.error("  - Video:", selectedVideo.name);
                  console.error("  - Source type:", typeof selectedVideo.src);
                  setVideoError(true);
                  setVideoLoaded(false);
                  setTimeout(() => {
                    Alert.alert(
                      "Error al reproducir video",
                      `El video "${selectedVideo.name}" no se pudo cargar.\n\nPrueba con otro video de la lista.`,
                      [{ text: "OK" }]
                    );
                  }, 100);
                }}
              />
            ) : (
              <View style={styles.videoErrorPlaceholder}>
                <Ionicons name="videocam-off" size={40} color="#666" />
                <Text style={styles.videoErrorPlaceholderText}>Error</Text>
              </View>
            )}
            {!videoError && (
              <>
                <Text style={styles.videoPiPTime}>{Math.floor(videoCurrentTime)}s</Text>
                <Ionicons
                  name="expand"
                  size={20}
                  color="#fff"
                  style={styles.expandIcon}
                />
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ⭐ Modal expandido del video (pantalla completa) */}
        {isVideoExpanded && (
          <Modal
            visible={isVideoExpanded}
            transparent={false}
            animationType="slide"
            onRequestClose={() => setIsVideoExpanded(false)}
          >
            <View style={styles.expandedVideoContainer}>
              {selectedVideo?.src ? (
                <Video
                  ref={videoRef}
                  source={selectedVideo.src}
                  style={styles.expandedVideo}
                  rate={1.0}
                  volume={1.0}
                  resizeMode="contain"
                  shouldPlay
                  useNativeControls={true}
                  isLooping={true}
                  onProgress={(e) => {
                    setVideoCurrentTime(e.currentTime);
                  }}
                  onLoad={() => {
                    console.log("✓ Video expandido cargado:", selectedVideo.name);
                    setVideoLoaded(true);
                    setVideoError(false);
                  }}
                  onLoadStart={() => {
                    console.log("→ Iniciando carga Video expandido:", selectedVideo.name);
                    setVideoError(false);
                  }}
                  onError={(error) => {
                    console.error("✗ Video expandido error:", error);
                    console.error("  - Video:", selectedVideo.name);
                    setVideoError(true);
                    setVideoLoaded(false);
                    setTimeout(() => {
                      Alert.alert(
                        "Error al reproducir video",
                        `El video "${selectedVideo.name}" no se pudo cargar en modo expandido.`,
                        [
                          { text: "Cerrar", onPress: () => setIsVideoExpanded(false) },
                          { text: "OK" }
                        ]
                      );
                    }, 100);
                  }}
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff' }}>Video source no disponible</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.closeExpandedButton}
                onPress={() => setIsVideoExpanded(false)}
              >
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.expandedVideoTime}>
                {selectedCondition} - {Math.floor(videoCurrentTime)}s
              </Text>
            </View>
          </Modal>
        )}

        {/* Encabezado con botón atrás */}
        <View style={styles.overlayTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setStep("select_video");
              setSelectedVideo(null);
              setVideoLoaded(false);
              setVideoCurrentTime(0);
              setIsVideoExpanded(false);
            }}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Información y cambio de cámara */}
        <View style={styles.overlayTopRight}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{selectedCondition}</Text>
          </View>
        </View>

        {/* Botón flip cámara */}
        <View style={styles.overlayBottomRight}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() =>
              setFacing((prev) => (prev === "front" ? "back" : "front"))
            }
          >
            <Ionicons name="camera-reverse" size={30} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ⭐ Aviso de falta de movimiento */}
        {noMovementWarning && (
          <View style={styles.noMovementWarning}>
            <Ionicons name="warning" size={24} color="#FFA500" />
            <Text style={styles.noMovementText}>
              No se detecta movimiento
            </Text>
            <Text style={styles.noMovementSubtext}>
              Muévete para continuar
            </Text>
          </View>
        )}

        {/* ⭐ Aviso de error de conexión */}
        {connectionError && (
          <View style={styles.connectionErrorWarning}>
            <Ionicons name="cloud-offline" size={24} color="#fff" />
            <Text style={styles.connectionErrorText}>
              Error de conexión
            </Text>
            <Text style={styles.connectionErrorSubtext}>
              Verifica el servidor
            </Text>
          </View>
        )}

        {/* ⭐ Aviso de error de video */}
        {videoError && (
          <View style={styles.videoErrorWarning}>
            <Ionicons name="videocam-off" size={24} color="#fff" />
            <Text style={styles.videoErrorText}>
              Error al cargar video
            </Text>
          </View>
        )}

        {/* ⭐ Aviso de distancia (demasiado cerca o lejos) - Solo si no hay otros avisos */}
        {distanceWarning && !connectionError && !noMovementWarning && (
          <View style={[
            styles.distanceWarning,
            distanceWarning === 'too_close' ? styles.distanceWarningClose : styles.distanceWarningFar
          ]}>
            <Ionicons 
              name={distanceWarning === 'too_close' ? "remove-circle" : "expand"} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.distanceWarningText}>
              {distanceWarning === 'too_close' 
                ? "Demasiado cerca" 
                : "Demasiado lejos"}
            </Text>
            <Text style={styles.distanceWarningSubtext}>
              {distanceWarning === 'too_close'
                ? "Aléjate de la cámara"
                : "Acércate (1.5-3m)"}
            </Text>
          </View>
        )}

        {/* Feedback flotante - FEEDBACK VISUAL MEJORADO */}
        {showFeedback && (
          <View
            style={[
              styles.feedbackContainer,
              {
                backgroundColor:
                  mensajePostura.includes("Bien") || mensajePostura.includes("✓")
                    ? "rgba(76, 175, 80, 0.95)"
                    : "rgba(255, 107, 107, 0.95)",
              },
            ]}
          >
            {/* Emoji indicador */}
            <Text style={styles.feedbackEmoji}>
              {mensajePostura.includes("Bien") || mensajePostura.includes("✓") ? "✅" : "❌"}
            </Text>
            
            {/* Texto feedback */}
            <Text style={styles.feedbackText}>{mensajePostura}</Text>
            
            {/* Métricas opcionales */}
            {metrics && (metrics.avg_distance || metrics.max_distance) && (
              <Text style={styles.metricsText}>
                Distancia: {metrics.avg_distance?.toFixed(3) || "—"}
              </Text>
            )}
          </View>
        )}

        {/* Indicador de evaluación */}
        {isEvaluating && (
          <View style={styles.evaluatingIndicator}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.text}>Cargando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Selección y preview
  previewContainer: {
    flex: 1,
    backgroundColor: "#f0f3ff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#4a56a6",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7a8ce2",
    marginBottom: 15,
    textAlign: "center",
  },
  listContainer: {
    width: "100%",
    maxHeight: 400,
  },
  conditionButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#7a8ce2",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  conditionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#4a56a6",
  },
  videoButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  videoButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#555",
    marginLeft: 15,
    flex: 1,
  },
  backBtn: {
    marginTop: 30,
    backgroundColor: "transparent",
  },
  backText: {
    color: "#7a8ce2",
    fontWeight: "700",
    fontSize: 16,
  },

  // Cámara
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  // ⭐ Video PiP (Picture-in-Picture) - Compacto en esquina inferior izquierda (responsivo)
  videoPiPContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#7a8ce2",
    backgroundColor: "#000",
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 10,
  },
  videoPiP: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  videoErrorPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  videoErrorPlaceholderText: {
    color: "#666",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  videoPiPTime: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expandIcon: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  // ⭐ Video expandido (pantalla completa)
  expandedVideoContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  expandedVideo: {
    width: "100%",
    height: "80%",
  },
  closeExpandedButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 30,
    zIndex: 100,
  },
  expandedVideoTime: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    padding: 12,
    borderRadius: 8,
    textAlign: "center",
  },
  overlayTop: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 40,
    elevation: 40,
  },
  backButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 50,
  },
  overlayTopRight: {
    position: "absolute",
    top: 60,
    right: 20,
    maxWidth: 150,
  },
  infoBox: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#7a8ce2",
  },
  infoText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  videoNameText: {
    color: "#7a8ce2",
    fontSize: 12,
    fontWeight: "500",
  },

  // Botón flip
  overlayBottomRight: {
    position: "absolute",
    bottom: 20,
    right: 30,
  },
  flipButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 50,
  },

  // Feedback - Compacto y bien posicionado
  feedbackContainer: {
    position: "absolute",
    bottom: 200,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 140,
    maxWidth: "75%",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 10,
  },
  feedbackEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  feedbackText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  metricsText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
    opacity: 0.9,
    fontWeight: "600",
  },

  // ⭐ Aviso de falta de movimiento - Compacto
  noMovementWarning: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    backgroundColor: "rgba(255, 165, 0, 0.95)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 200,
    maxWidth: "80%",
    zIndex: 50,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 15,
    borderWidth: 2,
    borderColor: "#FF8C00",
  },
  noMovementText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
    textAlign: "center",
  },
  noMovementSubtext: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
    opacity: 0.9,
  },

  // ⭐ Aviso de distancia - Compacto (posicionado más abajo para no sobreponerse)
  distanceWarning: {
    position: "absolute",
    top: 160,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 200,
    maxWidth: "80%",
    zIndex: 50,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 15,
    borderWidth: 2,
  },
  distanceWarningClose: {
    backgroundColor: "rgba(255, 87, 34, 0.95)", // Naranja rojizo para "muy cerca"
    borderColor: "#FF5722",
  },
  distanceWarningFar: {
    backgroundColor: "rgba(33, 150, 243, 0.95)", // Azul para "muy lejos"
    borderColor: "#2196F3",
  },
  distanceWarningText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
    textAlign: "center",
  },
  distanceWarningSubtext: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
    opacity: 0.95,
    lineHeight: 16,
  },

  // ⭐ Aviso de error de conexión - Compacto (prioridad alta, arriba)
  connectionErrorWarning: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    backgroundColor: "rgba(244, 67, 54, 0.95)", // Rojo para error
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 200,
    maxWidth: "80%",
    zIndex: 60,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 15,
    borderWidth: 2,
    borderColor: "#D32F2F",
  },
  connectionErrorText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
    textAlign: "center",
  },
  connectionErrorSubtext: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
    opacity: 0.95,
    lineHeight: 16,
  },

  // ⭐ Aviso de error de video
  videoErrorWarning: {
    position: "absolute",
    bottom: 310,
    left: 20,
    backgroundColor: "rgba(244, 67, 54, 0.9)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 15,
    borderWidth: 1,
    borderColor: "#D32F2F",
  },
  videoErrorText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  // Indicador de evaluación - Discreto en la esquina (arriba a la derecha, no sobre el botón flip)
  evaluatingIndicator: {
    position: "absolute",
    top: 100,
    right: 20,
    backgroundColor: "rgba(122, 140, 226, 0.8)",
    padding: 8,
    borderRadius: 50,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
  },

  // Permisos/Errores
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f3ff",
    padding: 20,
  },
  text: {
    fontSize: 18,
    color: "#4a56a6",
    fontWeight: "600",
    textAlign: "center",
  },
  btn: {
    marginTop: 15,
    backgroundColor: "#4a56a6",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
