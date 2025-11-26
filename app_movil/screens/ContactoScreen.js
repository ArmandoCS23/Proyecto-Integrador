import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    { id: "1", text: "¡Hola! Soy la Dra. María López 👩‍⚕️", sender: "fisioterapeuta" },
    { id: "2", text: "¿Cómo te sientes con los ejercicios de hoy?", sender: "fisioterapeuta" },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (input.trim() === "") return;
    const newMsg = { id: Date.now().toString(), text: input, sender: "paciente" };
    setMessages([...messages, newMsg]);
    setInput("");
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === "paciente" ? styles.userBubble : styles.therapistBubble,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.sender === "paciente" ? { color: "#fff" } : { color: "#333" },
        ]}
      >
        {item.text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.header}>💬 Chat con tu fisioterapeuta</Text>
        <Text style={styles.subHeader}>Dra. María López</Text>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.chatContainer}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe tu mensaje..."
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>📨</Text>
        </TouchableOpacity>
      </View>

      {/* Botón para regresar al menú */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.navigate("Main")}
      >
        <Text style={styles.backBtnText}>⬅️ Regresar al menú</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f3ff",
    paddingHorizontal: 15,
  },
  headerContainer: {
    marginTop: 60, // 👈 baja el contenido para verse bien en pantallas pequeñas
  },
  header: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4a56a6",
    marginBottom: 5,
    textAlign: "center",
  },
  subHeader: {
    fontSize: 16,
    color: "#7a8ce2",
    marginBottom: 20,
    textAlign: "center",
  },
  chatContainer: {
    flex: 1,
    marginBottom: 10,
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 15,
    padding: 10,
    marginVertical: 6,
  },
  therapistBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#7a8ce2",
  },
  messageText: {
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  sendBtn: {
    backgroundColor: "#7a8ce2",
    borderRadius: 20,
    padding: 8,
  },
  sendText: {
    fontSize: 18,
    color: "#fff",
  },
  backBtn: {
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 30,
    elevation: 3,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4a56a6",
  },
});
