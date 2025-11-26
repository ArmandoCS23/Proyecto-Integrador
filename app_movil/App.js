import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useRef } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Importación de pantallas
import CameraScreen from "./screens/CameraScreen";
import ContactoScreen from "./screens/ContactoScreen";
import HistorialScreen from "./screens/HistorialScreen";
import LoginScreen from "./screens/LoginScreen";
import MainScreen from "./screens/MainScreen";
import PerfilScreen from "./screens/PerfilScreen";
import VideoRefScreen from "./screens/VideoRefScreen";

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  const scrollRef = useRef(null);

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f3ff" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContainer}>
          <Text style={styles.bienvenida}>¡Bienvenido a PhysioNext! </Text>

          <Image
            source={require("./assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.slogan}>Recupérate, muévete y vive mejor 💪</Text>

          <View style={styles.buttonBlock}>
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.buttonText}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Quiénes somos?</Text>
            <Text style={styles.sectionText}>
              En <Text style={styles.highlight}>PhysioNext</Text> apoyamos tu
              rehabilitación física con rutinas personalizadas, supervisión de
              fisioterapeutas y reportes en tiempo real.
            </Text>

            <Image
              source={require("./assets/stretch.png")}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity style={styles.buttonBack} onPress={scrollToTop}>
            <Text style={styles.buttonBackText}>Volver arriba ⬆️</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Inicio"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={MainScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VideoRef"
          component={VideoRefScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Contacto"
          component={ContactoScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Perfil"
          component={PerfilScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Historial"
          component={HistorialScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f3ff",
    paddingTop: Platform.OS === "android" ? 40 : 0, // 💡 evita que quede pegado al notch
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center", // centra verticalmente todo
    paddingVertical: 40,
    backgroundColor: "#f0f3ff",
  },
  innerContainer: {
    alignItems: "center",
    width: "100%",
  },
  bienvenida: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4a56a6",
    marginBottom: 10,
  },
  logo: {
    width: 300,
    height: 140,
    marginBottom: 10,
  },
  slogan: {
    fontSize: 17,
    fontWeight: "500",
    color: "#555",
    marginBottom: 25,
    textAlign: "center",
  },
  buttonBlock: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "85%",
    alignItems: "center",
    paddingVertical: 25,
    shadowColor: "#7a8ce2",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  buttonPrimary: {
    backgroundColor: "#7a8ce2",
    paddingVertical: 14,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    marginTop: 50,
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 25,
    width: "90%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#7a8ce2",
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  highlight: {
    fontWeight: "700",
    color: "#7a8ce2",
  },
  illustration: {
    width: 220,
    height: 130,
  },
  buttonBack: {
    marginTop: 40,
    backgroundColor: "#7a8ce2",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginBottom: 60,
  },
  buttonBackText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
