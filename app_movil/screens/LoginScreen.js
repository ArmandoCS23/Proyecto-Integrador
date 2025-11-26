import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen({ navigation }) {
  const [usuario, setUsuario] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [alertType, setAlertType] = useState("success");
  const [alertMessage, setAlertMessage] = useState("");

  const showCustomAlert = (type, message) => {
    setAlertType(type);
    setAlertMessage(message);
    setModalVisible(true);
  };

  const handleLogin = () => {
    if (!usuario || !contraseña) {
      showCustomAlert("error", "Por favor ingresa usuario y contraseña");
      return;
    }

    if (usuario === "batman" && contraseña === "12345") {
      showCustomAlert("success", "Inicio de sesión exitoso 😎");
    } else {
      showCustomAlert("error", "Usuario o contraseña incorrectos 😢");
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    if (alertType === "success") {
      navigation.replace("Main");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Modal personalizado */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                alertType === "success"
                  ? styles.modalSuccess
                  : styles.modalError,
              ]}
            >
              <Text style={styles.modalText}>{alertMessage}</Text>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  alertType === "success"
                    ? styles.buttonSuccess
                    : styles.buttonError,
                ]}
                onPress={closeModal}
              >
                <Text style={styles.modalButtonText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Logo */}
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Título */}
        <Text style={styles.title}>Inicia sesión</Text>

        {/* Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Usuario"
          placeholderTextColor="#999"
          value={usuario}
          onChangeText={setUsuario}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          secureTextEntry
          value={contraseña}
          onChangeText={setContraseña}
        />

        {/* Botón Entrar */}
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>

        {/* Volver */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>⬅ Volver al inicio</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f3ff",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingTop: 100, // 🔽 AQUI BAJAMOS TODO UN POCO
  },
  logo: {
    width: 220,
    height: 110,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4a56a6",
    marginBottom: 25,
  },
  input: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#d6d9ff",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#7a8ce2",
    paddingVertical: 14,
    borderRadius: 10,
    width: "85%",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  backText: {
    marginTop: 20,
    color: "#7a8ce2",
    fontWeight: "600",
  },
  // 🔹 Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  modalContent: {
    width: "75%",
    padding: 25,
    borderRadius: 15,
    alignItems: "center",
    elevation: 5,
  },
  modalSuccess: {
    backgroundColor: "#b4c3ff",
  },
  modalError: {
    backgroundColor: "#ffb4b4",
  },
  modalText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonSuccess: {
    backgroundColor: "#5b6fe3",
  },
  buttonError: {
    backgroundColor: "#e35b5b",
  },
});
