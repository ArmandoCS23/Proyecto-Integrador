import { useState } from "react";
import {
  Dimensions,
  FlatList,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import * as Progress from "react-native-progress";

const { width } = Dimensions.get("window");

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HistorialScreen({ navigation }) {
  const historial = [
    { id: "1", fecha: "10 Oct 2025", completados: 5, total: 5, errores: 0, repeticiones: 15, omitidos: 0 },
    { id: "2", fecha: "9 Oct 2025", completados: 4, total: 5, errores: 2, repeticiones: 12, omitidos: 1 },
    { id: "3", fecha: "8 Oct 2025", completados: 3, total: 5, errores: 3, repeticiones: 10, omitidos: 2 },
    { id: "4", fecha: "7 Oct 2025", completados: 5, total: 5, errores: 1, repeticiones: 15, omitidos: 0 },
  ];

  const [expandedId, setExpandedId] = useState(null);

  const promedio =
    historial.reduce((acc, d) => acc + d.completados / d.total, 0) / historial.length;

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📈 Tu progreso</Text>
      <Text style={styles.subtitle}>Revisa tu desempeño semanal</Text>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Promedio de avance</Text>
        <Progress.Circle
          progress={promedio}
          size={width * 0.5} // más grande y adaptable
          color="#7a8ce2"
          unfilledColor="#dbeafe"
          borderWidth={0}
          showsText={true}
          formatText={() => `${Math.round(promedio * 100)}%`}
        />
      </View>

      <FlatList
        data={historial}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => toggleExpand(item.id)}>
            <View style={styles.card}>
              <Text style={styles.date}>{item.fecha}</Text>
              <Progress.Bar
                progress={item.completados / item.total}
                width={width * 0.8} // se adapta a la pantalla
                height={12}
                color="#7a8ce2"
                unfilledColor="#dbeafe"
                borderWidth={0}
                borderRadius={10}
              />
              <Text style={styles.status}>
                {item.completados}/{item.total} completados
              </Text>

              {expandedId === item.id && (
                <View style={styles.details}>
                  <Text style={styles.detailText}>🔁 Repeticiones: {item.repeticiones}</Text>
                  <Text style={styles.detailText}>⚠️ Errores: {item.errores}</Text>
                  <Text style={styles.detailText}>🚫 Ejercicios omitidos: {item.omitidos}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
         nestedScrollEnabled={true}
      />

      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>⬅ Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f3ff",
    paddingTop: 60, // 🧩 margen superior visualmente correcto
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4a56a6",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 25,
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  progressText: {
    fontWeight: "700",
    color: "#4a56a6",
    marginBottom: 15,
    fontSize: 16,
  },
  listContainer: {
    alignItems: "center",
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    width: width * 0.9, // ocupa casi todo el ancho
    padding: 18,
    borderRadius: 15,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    alignItems: "center",
  },
  date: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4a56a6",
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    color: "#555",
    marginTop: 8,
  },
  details: {
    marginTop: 12,
    backgroundColor: "#eef2ff",
    padding: 10,
    borderRadius: 10,
    width: "100%",
  },
  detailText: {
    color: "#333",
    fontSize: 14,
    marginVertical: 2,
  },
  button: {
    backgroundColor: "#7a8ce2",
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginVertical: 30,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
