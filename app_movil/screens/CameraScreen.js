import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SERVER_URL } from "../config";

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [mensajePostura, setMensajePostura] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [facing, setFacing] = useState("front"); // 👈 cámara frontal por defecto
  const cameraRef = useRef(null);

  const ejercicio = {
    nombre: "Extensión lumbar",
    descripcion:
      "En este ejercicio trabajarás la parte baja de la espalda. Colócate boca abajo y eleva suavemente el pecho sin forzar el cuello.",
    imagen: require("../assets/prueba.jpg"),
  };

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  // Captura periódica y evaluación remota
  useEffect(() => {
    let captureInterval;

    const doCapture = async () => {
      try {
        if (cameraRef.current && cameraRef.current.takePictureAsync) {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.3,
            base64: true,
            skipProcessing: true,
          });

          if (photo && photo.base64) {
            try {
              const resp = await fetch(`${SERVER_URL}/api/evaluate_frame`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: `data:image/jpeg;base64,${photo.base64}` }),
              });

              const j = await resp.json();
              if (j && j.success) {
                const reason = j.reason || j.feedback || "Evaluado";
                setMensajePostura(reason);
              } else {
                setMensajePostura("Error de evaluación");
                console.log("Eval error:", j);
              }
            } catch (err) {
              console.log("Network eval error", err);
            }

            setShowFeedback(true);
            setTimeout(() => setShowFeedback(false), 3000);
          }
        }
      } catch (e) {
        console.log("capture error", e);
      }
    };

    if (showCamera && isCameraReady) {
      // Captura inmediata y luego cada 1.5s
      doCapture();
      captureInterval = setInterval(doCapture, 1500);
    }

    return () => {
      if (captureInterval) clearInterval(captureInterval);
    };
  }, [showCamera, isCameraReady]);

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

  if (!showCamera) {
    return (
      <View style={styles.previewContainer}>
        <Text style={styles.exerciseTitle}>{ejercicio.nombre}</Text>
        <Text style={styles.exerciseDescription}>{ejercicio.descripcion}</Text>

        <Image source={ejercicio.imagen} style={styles.largeImage} />

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => setShowCamera(true)}
        >
          <Text style={styles.startButtonText}>🚀 Comenzar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>⬅ Volver al menú</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🔹 Cámara activa
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        facing={facing} // 👈 Usa el estado para alternar cámaras
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Botón de regreso */}
      <View style={styles.overlayTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowCamera(false)}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Miniatura del ejercicio */}
      <View style={styles.overlayTopRight}>
        <TouchableOpacity onPress={() => setIsImageExpanded(true)}>
          <Image source={ejercicio.imagen} style={styles.exercisePreview} />
        </TouchableOpacity>
      </View>

      {/* 🔄 Botón para cambiar cámara */}
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

      {/* Feedback flotante */}
      {showFeedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{mensajePostura}</Text>
        </View>
      )}

      {/* Modal imagen ampliada */}
      <Modal
        visible={isImageExpanded}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageExpanded(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setIsImageExpanded(false)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          <Image source={ejercicio.imagen} style={styles.fullImage} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Vista previa
  previewContainer: {
    flex: 1,
    backgroundColor: "#f0f3ff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  exerciseTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4a56a6",
    marginBottom: 10,
    textAlign: "center",
  },
  exerciseDescription: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 25,
  },
  largeImage: {
    width: "90%",
    height: 250,
    borderRadius: 15,
    marginBottom: 25,
  },
  startButton: {
    backgroundColor: "#7a8ce2",
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 12,
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  backBtn: {
    marginTop: 20,
  },
  backText: {
    color: "#7a8ce2",
    fontWeight: "600",
  },

  // Cámara
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlayTop: {
    position: "absolute",
    top: 50,
    left: 20,
  },
  backButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 50,
  },
  overlayTopRight: {
    position: "absolute",
    top: 80,
    right: 20,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  exercisePreview: {
    width: 120,
    height: 120,
    resizeMode: "cover",
    opacity: 0.9,
  },

  // 🔄 Botón flip cámara
  overlayBottomRight: {
    position: "absolute",
    bottom: 100,
    right: 30,
  },
  flipButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 50,
  },

  // Feedback
  feedbackContainer: {
    position: "absolute",
    bottom: 160,
    alignSelf: "center",
    backgroundColor: "rgba(74, 86, 166, 0.85)",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 15,
  },
  feedbackText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },

  // Modal imagen
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
  },
  fullImage: {
    width: "90%",
    height: "60%",
    resizeMode: "contain",
  },

  // Permisos
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
    padding: 10,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
