import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PerfilScreen() {
  const navigation = useNavigation();

  const [nombre, setNombre] = useState("Danae Barqueras");
  const [edad, setEdad] = useState("20");
  const [correo, setCorreo] = useState("danae@physionext.mx");
  const [patologia] = useState("Escoliosis idiopática");

  const [originalData, setOriginalData] = useState({
    nombre: "Danae Barqueras",
    edad: "20",
    correo: "danae@physionext.mx",
  });

  const handleGuardar = () => {
    setOriginalData({ nombre, edad, correo });
    Alert.alert("✅ Éxito", "Cambios guardados con éxito");
  };

  const handleDescartar = () => {
    setNombre(originalData.nombre);
    setEdad(originalData.edad);
    setCorreo(originalData.correo);
    Alert.alert("ℹ️ Cambios descartados", "Se restauraron los valores anteriores");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Tu Perfil 👤</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Tu nombre"
          />

          <Text style={styles.label}>Edad</Text>
          <TextInput
            style={styles.input}
            value={edad}
            onChangeText={setEdad}
            keyboardType="numeric"
            placeholder="Tu edad"
          />

          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            placeholder="Tu correo"
          />

          <Text style={styles.label}>Condición del paciente</Text>
          <View style={styles.patologiaBox}>
            <Text style={styles.patologiaText}>{patologia}</Text>
          </View>
        </View>

        <View style={styles.btnContainer}>
          <TouchableOpacity style={[styles.btn, styles.btnGuardar]} onPress={handleGuardar}>
            <Text style={styles.btnText}>💾 Guardar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnDescartar]} onPress={handleDescartar}>
            <Text style={styles.btnText}>↩️ Descartar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnVolver]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnText}>⬅️ Volver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f3ff",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#f0f3ff",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#4a56a6",
    marginBottom: 25,
  },
  card: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontWeight: "600",
    color: "#4a56a6",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#f7f8ff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d6d9ff",
    marginBottom: 10,
  },
  patologiaBox: {
    backgroundColor: "#e9ebff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cfd3ff",
    marginBottom: 10,
  },
  patologiaText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "500",
  },
  btnContainer: {
    marginTop: 30,
    width: "85%",
    gap: 10,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnGuardar: {
    backgroundColor: "#7a8ce2",
  },
  btnDescartar: {
    backgroundColor: "#aab4f8",
  },
  btnVolver: {
    backgroundColor: "#4a56a6",
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
