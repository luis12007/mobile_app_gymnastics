import * as Crypto from 'expo-crypto';
import { useFonts } from "expo-font";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Clipboard,
  Dimensions,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { getUserById } from "../Database/database";

const { width, height } = Dimensions.get("window");

export default function SelectSex() {
  // Use simpler ternary operators for device size detection
  const isLargeScreen = width >= 1000 && height >= 700;
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = typeof params.userId === 'string' ? parseInt(params.userId, 10) : 0;

  // Estados para el modal de generación de claves
  const [modalVisible, setModalVisible] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Estados para validación de usuario
  const [currentUser, setCurrentUser] = useState(null);
  const [showKeysButton, setShowKeysButton] = useState(false);

  // Load the custom font
  const [fontsLoaded] = useFonts({
    "Rajdhani-Bold": require("../assets/fonts/Rajdhani/Rajdhani-Bold.ttf"),
  });

  // Animation values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-50)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const leftButtonTranslateX = useRef(new Animated.Value(-100)).current;
  const rightButtonTranslateX = useRef(new Animated.Value(100)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const adminButtonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Verificar información del usuario actual
    const checkUserPermissions = async () => {
      try {
        if (userId) {
          const user = await getUserById(userId);
          if (user) {
            setCurrentUser(user);
            console.log("Usuario actual:", user);
            // Verificar si es Bernabe con rol admin
            if (user.username === "Bernabe") {
              setShowKeysButton(true);
            }
          }
        }
      } catch (error) {
        console.error("Error checking user permissions:", error);
      }
    };

    checkUserPermissions();

    // Start animation sequence after component mounts
    Animated.sequence([
      // First fade in the background
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      // Then animate the title
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      // Followed by buttons animation
      Animated.parallel([
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(leftButtonTranslateX, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(rightButtonTranslateX, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        // Admin button animation
        Animated.timing(adminButtonOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]),
    ]).start();

    // Animate title from top to position
    Animated.timing(titleTranslateY, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.2)),
    }).start();
  }, [userId]);

  const handleSelect = (discipline: boolean) => {
    router.push(`/main-menu?discipline=${discipline}&userId=${userId}`); // Pass the value as a query parameter
  };

  // Función para generar clave de activación
  const generateActivationKey = async () => {
    if (!deviceId.trim()) {
      Alert.alert("Error", "Por favor ingrese el ID del dispositivo");
      return;
    }

    setIsGenerating(true);

    try {
      // Secreto compartido (debe ser el mismo en el método de validación)
      const APP_SECRET = 'GymJudge2023SecretKey';
      const timestamp = Date.now().toString(36);
      
      // Crear string para hashear
      const stringToHash = deviceId + APP_SECRET;
      
      // Generar hash
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        stringToHash
      );
      
      // Usar sólo los primeros 8 caracteres del hash
      const shortHash = hash.substring(0, 8);
      
      // Formato: GYM-[hash]-[timestamp]
      const activationKey = `GYM-${shortHash}-${timestamp}`;
      
      setGeneratedKey(activationKey);
      
      // Log para debugging
      console.log(`Clave generada para dispositivo ${deviceId}: ${activationKey}`);
    } catch (error) {
      console.error("Error generando clave:", error);
      Alert.alert("Error", "No se pudo generar la clave de activación");
    } finally {
      setIsGenerating(false);
    }
  };

  // Función para copiar la clave al portapapeles
  const copyToClipboard = () => {
    if (generatedKey) {
      Clipboard.setString(generatedKey);
      Alert.alert("Éxito", "Clave copiada al portapapeles");
    }
  };

  // Función para extraer el deviceId del texto pegado
  const parseDeviceInfo = (text) => {
    try {
      // Buscar el patrón "Device ID: XXX" en el texto
      const match = text.match(/Device ID:\s*([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        setDeviceId(match[1]);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al analizar información del dispositivo:", error);
      return false;
    }
  };

  // Manejar el cambio en el texto del dispositivo
  const handleDeviceInfoChange = (text) => {
    setDeviceInfo(text);
    parseDeviceInfo(text);
  };

  return (
    <View style={styles.container}>
      {/* Background Images with fade-in animation */}
      <Animated.Image
        source={require("../assets/images/Vector2.png")}
        style={[
          isLargeScreen ? styles.backgroundImageLarge : styles.backgroundImageSmall,
          { opacity: backgroundOpacity }
        ]}
        resizeMode="cover"
      />

      <Animated.Image
        source={require("../assets/images/Vector3.png")}
        style={[
          isLargeScreen ? styles.backgroundImageRightLarge : styles.backgroundImageRightSmall,
          { opacity: backgroundOpacity }
        ]}
        resizeMode="cover"
      />

      {/* Admin Key Button - solo visible para usuario Bernabe con rol admin */}
      {showKeysButton && (
        <Animated.View 
          style={[
            styles.adminKeyButton,
            { opacity: adminButtonOpacity }
          ]}
        >
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            style={styles.keyButtonContainer}
          >
            <Image
              source={require("../assets/images/key.png")}
              style={styles.keyIcon}
              resizeMode="contain"
            />
            <Text style={styles.keyButtonText}>Keys</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Animated Title */}
      <Animated.Text
        style={[
          isLargeScreen ? styles.titleTextLarge : styles.titleTextSmall,
          { 
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }]
          }
        ]}
      >
        CHOOSE YOUR DISCIPLINE
      </Animated.Text>

      {/* Two Buttons */}
      <View style={[
        isLargeScreen ? styles.rowContainer : styles.rowContainerSmall
      ]}>
        {/* MAG Button with animation */}
        <Animated.View
          style={{
            opacity: buttonsOpacity,
            transform: [{ translateX: leftButtonTranslateX }],
            width: "47%"
          }}
        >
          <TouchableOpacity
            style={[
              isLargeScreen ? styles.grayRectangle : styles.grayRectangleSmall
            ]}
            onPress={() => handleSelect(true)}
          >
            <Image
              source={require("../assets/images/MAG.webp")}
              style={[
                isLargeScreen ? styles.disciplineImageLarge : styles.disciplineImageSmall
              ]}
              resizeMode="contain"
            />
            <Text style={[
              isLargeScreen ? styles.rectangleTextLarge : styles.rectangleTextSmall
            ]}>MAG</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* WAG Button with animation */}
        <Animated.View
          style={{
            opacity: buttonsOpacity,
            transform: [{ translateX: rightButtonTranslateX }],
            width: "47%"
          }}
        >
          <TouchableOpacity
            style={[
              isLargeScreen ? styles.grayRectangle : styles.grayRectangleSmall
            ]}
            onPress={() => handleSelect(false)}
          >
            <Image
              source={require("../assets/images/WAG.webp")}
              style={[
                isLargeScreen ? styles.disciplineImageLarge : styles.disciplineImageSmall
              ]}
              resizeMode="contain"
            />
            <Text style={[
              isLargeScreen ? styles.rectangleTextLarge : styles.rectangleTextSmall
            ]}>WAG</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Modal para generar claves */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Generador de Claves de Activación</Text>
            
            {/* Información del usuario actual */}
            {currentUser && (
              <View style={styles.userInfoContainer}>
                <Text style={styles.userInfoText}>
                  Usuario: {currentUser.username} ({currentUser.rol})
                </Text>
              </View>
            )}
            
            <Text style={styles.modalLabel}>Pegue la información del dispositivo:</Text>
            <TextInput
              style={styles.modalTextInput}
              multiline
              numberOfLines={8}
              value={deviceInfo}
              onChangeText={handleDeviceInfoChange}
              placeholder="Pegue aquí el correo con la información del dispositivo..."
            />
            
            <View style={styles.deviceIdContainer}>
              <Text style={styles.modalLabel}>ID del Dispositivo:</Text>
              <Text style={styles.deviceIdText}>{deviceId || "No detectado"}</Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.generateButton,
                !deviceId.trim() && styles.disabledButton,
                isGenerating && styles.loadingButton
              ]}
              onPress={generateActivationKey}
              disabled={!deviceId.trim() || isGenerating}
            >
              <Text style={styles.buttonText}>
                {isGenerating ? 'Generando...' : 'Generar Clave'}
              </Text>
            </TouchableOpacity>
            
            {generatedKey ? (
              <View style={styles.keyResultContainer}>
                <Text style={styles.resultLabel}>Clave de Activación:</Text>
                <TouchableOpacity 
                  style={styles.copyContainer}
                  onPress={copyToClipboard}
                >
                  <Text style={styles.generatedKeyText}>{generatedKey}</Text>
                  <Text style={styles.copyText}>Tocar para copiar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                setDeviceInfo('');
                setDeviceId('');
                setGeneratedKey('');
              }}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    backgroundColor: "#F1F3F5",
  },
  // Background images - large variants (width >= 1000 && height >= 700)
  backgroundImageLarge: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 300,
    height: 590,
  },
  backgroundImageRightLarge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 300,
    height: 570,
  },
  // Background images - small variants (width < 1000 || height < 700)
  backgroundImageSmall: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 140,
    height: 280,
  },
  backgroundImageRightSmall: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 140,
    height: 280,
  },
  // Title text styles
  titleTextLarge: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 80,
    textAlign: "center",
    marginTop: 180,
    fontFamily: "Rajdhani-Bold",
  },
  titleTextSmall: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 40,
    textAlign: "center",
    marginTop: "8%",
    fontFamily: "Rajdhani-Bold",
  },
  // Row container styles
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "75%",
    alignSelf: "center",
    marginTop: 40,
  },
  rowContainerSmall: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "70%",
    alignSelf: "center",
    marginTop: 10,
  },
  // Rectangle button styles
  grayRectangle: {
    backgroundColor: "#6E6E6E",
    width: "100%",
    height: 350,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    position: "relative",
  },
  grayRectangleSmall: {
    backgroundColor: "#6E6E6E",
    width: "100%",
    height: 190,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    position: "relative",
  },
  // Text styles for buttons
  rectangleTextLarge: {
    color: "#F1F3F5",
    fontSize: 60,
    fontFamily: "Rajdhani-Bold",
    bottom: 20,
    position: "absolute",
  },
  rectangleTextSmall: {
    color: "#F1F3F5",
    fontSize: 36,
    fontFamily: "Rajdhani-Bold",
    bottom: 10,
    position: "absolute",
  },
  // Image styles
  disciplineImageLarge: {
    width: "55%",
    height: "70%",
    top: -35,
  },
  disciplineImageSmall: {
    width: "50%",
    height: "60%",
    top: -15,
  },
  // Admin key button styles
  adminKeyButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  keyButtonContainer: {
    flexDirection: 'row',
    backgroundColor: '#004aad',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  keyIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
    tintColor: 'white',
  },
  keyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: width >= 1000 ? '50%' : '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#004aad',
    textAlign: 'center',
  },
  userInfoContainer: {
    backgroundColor: '#e8f4ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  userInfoText: {
    fontSize: 14,
    color: '#004aad',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 120,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  deviceIdContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  deviceIdText: {
    fontSize: 16,
    color: '#004aad',
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#004aad',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  loadingButton: {
    backgroundColor: '#6c8eb4',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  keyResultContainer: {
    marginTop: 15,
    backgroundColor: '#e8f4ff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  copyContainer: {
    alignItems: 'center',
  },
  generatedKeyText: {
    fontSize: 18,
    color: '#004aad',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  copyText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#666',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});