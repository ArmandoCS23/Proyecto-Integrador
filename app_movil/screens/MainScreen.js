import { Video } from "expo-av";
import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Progress from "react-native-progress";

export default function MainScreen({ navigation }) {
  const [completed, setCompleted] = useState(2);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const videoRef = useRef(null);
  const total = 8;
  const progress = completed / total;

  const ejerciciosHoy = [
    {
      id: "1",
      nombre: "Presión abdominal",
      reps: "3x12",
      tip: "Inhala profundo y presiona el abdomen sin arquear la espalda.",
    },
    {
      id: "2",
      nombre: "Posición de decúbito supino",
      reps: "3x30s",
      tip: "Mantén la espalda apoyada y respira profundamente.",
    },
    {
      id: "3",
      nombre: "Gato-vaca",
      reps: "3x10",
      tip: "Alterna entre arquear y curvar la espalda lentamente.",
    },
    {
      id: "4",
      nombre: "Plancha modificada",
      reps: "3x20s",
      tip: "Mantén el cuerpo recto sin hundir la cadera.",
    },
    {
      id: "5",
      nombre: "Extensión lumbar en el suelo",
      reps: "3x10",
      tip: "Levanta el pecho del suelo suavemente, sin forzar el cuello.",
    },
    {
      id: "6",
      nombre: "Estiramiento lateral con brazo elevado",
      reps: "2x15s por lado",
      tip: "Estira el brazo del lado más corto de la curva hacia arriba.",
    },
    {
      id: "7",
      nombre: "Puente de glúteos",
      reps: "3x12",
      tip: "Sube lentamente y mantén la espalda recta al bajar.",
    },
    {
      id: "8",
      nombre: "Respiración diafragmática",
      reps: "3x10 respiraciones",
      tip: "Inhala por la nariz y lleva el aire al abdomen, no al pecho.",
    },
  ];

  const defaultImage = require("../assets/stretch.png");

  const handleContinue = () => {
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
    navigation.navigate("Camera", {
      ejercicio: selectedExercise.nombre,
      reps: selectedExercise.reps,
    });
    setSelectedExercise(null);
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Hola, Danae 👋</Text>
        <Text style={styles.subtitle}>Ejercicios para Escoliosis Idiopática:</Text>
      </View>

      {/* Barra de progreso */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {completed}/{total} completados
        </Text>
        <Progress.Bar
          progress={progress}
          width={300}
          height={12}
          color="#7a8ce2"
          unfilledColor="#dbeafe"
          borderWidth={0}
          borderRadius={10}
        />
      </View>
    </>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#4CAF50" }]}
        onPress={() => navigation.navigate("VideoRef")}
      >
        <Text style={[styles.btnText, { color: "#fff" }]}>🎥 Imitar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("Historial")}
      >
        <Text style={styles.btnText}>📈 Progreso</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("Contacto")}
      >
        <Text style={styles.btnText}>📞 Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("Perfil")}
      >
        <Text style={styles.btnText}>👤 Perfil</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#7a8ce2" }]}
        onPress={() => navigation.replace("Login")}
      >
        <Text style={[styles.btnText, { color: "#fff" }]}>Salir</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={ejerciciosHoy}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedExercise(item)}
          >
            <Text style={styles.exerciseName}>{item.nombre}</Text>
            <Text style={styles.exerciseReps}>{item.reps}</Text>
            <Text style={styles.tipText}>💡 {item.tip}</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
      />

      {/* Modal de introducción con video */}
      {selectedExercise && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={true}
          onRequestClose={() => setSelectedExercise(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedExercise.nombre}</Text>
              {selectedExercise.video ? (
                <Video
                  ref={videoRef}
                  source={selectedExercise.video}
                  rate={1.0}
                  volume={1.0}
                  resizeMode="contain"
                  shouldPlay
                  useNativeControls
                  style={styles.video}
                />
              ) : (
                <Image source={defaultImage} style={styles.image} />
              )}
              <Text style={styles.modalTip}>💡 {selectedExercise.tip}</Text>

              <TouchableOpacity
                style={styles.continueBtn}
                onPress={handleContinue}
              >
                <Text style={styles.continueText}>Continuar ➜</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedExercise(null)}
              >
                <Text style={styles.closeText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f3ff" },
  header: { marginTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#4a56a6", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 20 },
  progressContainer: { alignItems: "center", marginBottom: 25 },
  progressText: { marginBottom: 8, fontWeight: "600", color: "#444" },
  list: { flexGrow: 0, marginBottom: 40, paddingHorizontal: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 15,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  exerciseName: { fontSize: 17, fontWeight: "700", color: "#4a56a6" },
  exerciseReps: { fontSize: 14, color: "#666", marginTop: 4 },
  tipText: { fontSize: 13, color: "#7a7a7a", marginTop: 6, fontStyle: "italic" },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  btn: {
    flexBasis: "48%",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: { fontWeight: "700", color: "#4a56a6" },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4a56a6",
    marginBottom: 10,
    textAlign: "center",
  },
  video: { width: "100%", height: 250, borderRadius: 10, backgroundColor: "#000" },
  image: { width: "100%", height: 250, borderRadius: 10, resizeMode: "contain" },
  modalTip: {
    fontSize: 14,
    color: "#444",
    marginTop: 10,
    textAlign: "center",
    fontStyle: "italic",
  },
  continueBtn: {
    marginTop: 15,
    backgroundColor: "#4a56a6",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  continueText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  closeBtn: {
    marginTop: 10,
    backgroundColor: "#aaa",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  closeText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
