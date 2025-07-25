import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
  View,
  ScrollView
} from "react-native";
import { getUserById, getFoldersByUserId, exportFolderData, importFolderData } from "../Database/database";

const { width, height } = Dimensions.get("window");
var isLargeDevice = false;
var isMediumLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;

if (width >= 1368 ) {
  isLargeDevice = true;
} else if (width >= 1200 && width < 1368) {
  isMediumLargeDevice = true;
} else if (width >= 945 && width < 1200) {
  isSmallDevice = true;
} else if (width < 945) {
  isTinyDevice = true;
}

const DEFAULT_DISCIPLINE_KEY = "defaultDiscipline";

export default function SelectSex() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = typeof params.userId === 'string' ? parseInt(params.userId, 10) : 0;
  const changeDis = params.changeDis === 'true';

  // Estados para el modal de generación de claves
  const [modalVisible, setModalVisible] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Estados para validación de usuario
  const [currentUser, setCurrentUser] = useState(null);
  const [showKeysButton, setShowKeysButton] = useState(false);

  // Estados para disciplina por defecto
  const [defaultDiscipline, setDefaultDiscipline] = useState<boolean | null>(null); // true = MAG, false = WAG, null = no default
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);

  // Estados para importar/exportar
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [userFolders, setUserFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
  const toggleButtonOpacity = useRef(new Animated.Value(0)).current;

  // Cargar disciplina por defecto
  const loadDefaultDiscipline = async () => {
    try {
      const storedDefault = await AsyncStorage.getItem(DEFAULT_DISCIPLINE_KEY);
      if (storedDefault !== null) {
        setDefaultDiscipline(storedDefault === 'true');
      }
    } catch (error) {
      console.error("Error loading default discipline:", error);
    } finally {
      setIsLoadingDefault(false);
    }
  };

  // Guardar disciplina por defecto
  const saveDefaultDiscipline = async (discipline: boolean | null) => {
    try {
      if (discipline === null) {
        await AsyncStorage.removeItem(DEFAULT_DISCIPLINE_KEY);
      } else {
        await AsyncStorage.setItem(DEFAULT_DISCIPLINE_KEY, discipline.toString());
      }
      setDefaultDiscipline(discipline);
    } catch (error) {
      console.error("Error saving default discipline:", error);
    }
  };

  // Auto-route si no hay changeDis y hay disciplina por defecto
  const checkAutoRoute = async () => {
    if (!changeDis && !isLoadingDefault && defaultDiscipline !== null) {
      // Auto-route con la disciplina por defecto
      router.replace(`/main-menu?discipline=${defaultDiscipline}&userId=${0}`);
    }
  };

  useEffect(() => {
    loadDefaultDiscipline();
  }, []);

    const createDefaultUsers = async () => {
  try {
    // Lista de usuarios predeterminados
    const defaultUsers = [
      { username: "Bernabe", password: "Bernabe2025", rol: "admin" },
      { username: "Luis", password: "TestDev1", rol: "user" },
      { username: "LuisAdmin", password: "TestDev2", rol: "admin" }
    ];
    
    // Importar la función para verificar si un usuario existe
    const { checkUserExists, insertUserWithoutValidation } = await import("../Database/database");
    
    // Crear cada usuario solo si no existe
    for (const user of defaultUsers) {
      // Verificar si el usuario ya existe
      const exists = await checkUserExists(user.username);
      
      if (exists) {
        console.log(`El usuario ${user.username} ya existe, no se creará nuevamente`);
        continue; // Saltar al siguiente usuario
      }
      
      // Crear usuario sin validación de dispositivo para usuarios por defecto
      const userId = await insertUserWithoutValidation(user.username, user.password, "null", "null", user.rol);
      
      if (userId) {
        console.log(`Usuario por defecto creado: ${user.username} (${user.rol})`);
      } else {
        console.error(`Error al crear usuario por defecto: ${user.username}`);
      }
    }
    
    console.log("Proceso de creación de usuarios por defecto completado");
    
  } catch (error) {
    console.error("Error creando usuarios por defecto:", error);
  }
};

  useEffect(() => {
    createDefaultUsers();
    checkAutoRoute();
  }, [changeDis, isLoadingDefault, defaultDiscipline]);



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

    // Solo mostrar animaciones si changeDis es true o no hay disciplina por defecto
    if (changeDis || defaultDiscipline === null) {
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
          // Toggle button animation
          Animated.timing(toggleButtonOpacity, {
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
    }
  }, [userId, changeDis, defaultDiscipline]);

  const handleSelect = (discipline: boolean) => {
    router.replace(`/main-menu?discipline=${discipline}&userId=${userId}`);
  };

  // Toggle disciplina por defecto
  const toggleDefaultDiscipline = () => {
    if (defaultDiscipline === null) {
      // Si no hay default, establecer MAG como default
      saveDefaultDiscipline(true);
    } else if (defaultDiscipline === true) {
      // Si es MAG, cambiar a WAG
      saveDefaultDiscipline(false);
    } else {
      // Si es WAG, quitar default
      saveDefaultDiscipline(null);
    }
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

  // Función para cargar folders del usuario
  const loadUserFolders = async () => {
    try {
      if (userId === 0) {
        setUserFolders([]);
        return;
      }
      
      const folders = await getFoldersByUserId(userId);
      setUserFolders(folders || []);
    } catch (error) {
      console.error("Error loading user folders:", error);
      setUserFolders([]);
    }
  };

  // Función para exportar folder
  const handleExportFolder = async () => {
    if (!selectedFolder) {
      Alert.alert("Error", "Por favor selecciona un folder para exportar");
      return;
    }
    
    setIsExporting(true);
    try {
      // Exportar datos del folder
      const exportedData = await exportFolderData(selectedFolder.id);
      
      if (!exportedData) {
        throw new Error("No se pudieron exportar los datos del folder");
      }

      // Crear archivo temporal
      const fileName = `folder_${selectedFolder.name}_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, exportedData);

      // Compartir archivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar Folder'
        });
        
        Alert.alert(
          "Éxito", 
          "Folder exportado correctamente. El archivo ha sido compartido.",
          [{ text: "OK", onPress: () => setShowExportModal(false) }]
        );
      } else {
        Alert.alert("Error", "No se puede compartir archivos en este dispositivo");
      }

    } catch (error: any) {
      console.error("Error exporting folder:", error);
      Alert.alert("Error", `No se pudo exportar el folder: ${error.message || error}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Función para importar folder
  const handleImportFolder = async () => {
    setIsImporting(true);
    try {
      // Seleccionar archivo
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        setIsImporting(false);
        return;
      }

      // Leer archivo
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      
      // Validar y importar
      const success = await importFolderData(fileContent, userId);
      
      if (success) {
        Alert.alert(
          "Éxito", 
          "Folder importado correctamente. Los datos se han agregado a tu cuenta.",
          [{ text: "OK", onPress: () => setShowImportModal(false) }]
        );
      } else {
        throw new Error("Error al procesar el archivo de importación");
      }

    } catch (error: any) {
      console.error("Error importing folder:", error);
      Alert.alert("Error", `No se pudo importar el folder: ${error.message || error}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Abrir modal de exportación
  const openExportModal = () => {
    loadUserFolders();
    setShowExportModal(true);
  };

  // Abrir modal de importación
  const openImportModal = () => {
    setShowImportModal(true);
  };

  // Si está cargando o debe auto-route, mostrar loading o nada
  if (isLoadingDefault || (!changeDis && defaultDiscipline !== null)) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: '#004aad' }}>Loading...</Text>
      </View>
    );
  }

return (
    <View style={styles.container}>
      {/* Background Images with fade-in animation */}
      <Animated.Image
        source={require("../assets/images/Vector2.png")}
        style={[
          isLargeDevice ? styles.backgroundImageLarge : null,
          isMediumLargeDevice ? styles.backgroundImageMediumLarge : null,
          isSmallDevice ? styles.backgroundImageSmall : null,
          isTinyDevice ? styles.backgroundImageTiny : null,
          { opacity: backgroundOpacity }
        ]}
        resizeMode="cover"
      />

      <Animated.Image
        source={require("../assets/images/Vector3.png")}
        style={[
          isLargeDevice ? styles.backgroundImageRightLarge : null,
          isMediumLargeDevice ? styles.backgroundImageRightMediumLarge : null,
          isSmallDevice ? styles.backgroundImageRightSmall : null,
          isTinyDevice ? styles.backgroundImageRightTiny : null,
          { opacity: backgroundOpacity }
        ]}
        resizeMode="cover"
      />

      {/* Admin Key Button - solo visible para usuario Bernabe con rol admin */}
      {showKeysButton && (
        <Animated.View 
          style={[
            isLargeDevice ? styles.adminKeyButtonLarge : null,
            isMediumLargeDevice ? styles.adminKeyButtonMediumLarge : null,
            isSmallDevice ? styles.adminKeyButtonSmall : null,
            isTinyDevice ? styles.adminKeyButtonTiny : null,
            { opacity: adminButtonOpacity }
          ]}
        >
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            style={[
              isLargeDevice ? styles.keyButtonContainerLarge : null,
              isMediumLargeDevice ? styles.keyButtonContainerMediumLarge : null,
              isSmallDevice ? styles.keyButtonContainerSmall : null,
              isTinyDevice ? styles.keyButtonContainerTiny : null,
            ]}
          >
            <Image
              source={require("../assets/images/key.png")}
              style={[
                isLargeDevice ? styles.keyIconLarge : null,
                isMediumLargeDevice ? styles.keyIconMediumLarge : null,
                isSmallDevice ? styles.keyIconSmall : null,
                isTinyDevice ? styles.keyIconTiny : null,
              ]}
              resizeMode="contain"
            />
            <Text style={[
              isLargeDevice ? styles.keyButtonTextLarge : null,
              isMediumLargeDevice ? styles.keyButtonTextMediumLarge : null,
              isSmallDevice ? styles.keyButtonTextSmall : null,
              isTinyDevice ? styles.keyButtonTextTiny : null,
            ]}>Keys</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Animated Title */}
      <Animated.Text
        style={[
          isLargeDevice ? styles.titleTextLarge : null,
          isMediumLargeDevice ? styles.titleTextMediumLarge : null,
          isSmallDevice ? styles.titleTextSmall : null,
          isTinyDevice ? styles.titleTextTiny : null,
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
        isLargeDevice ? styles.rowContainerLarge : null,
        isMediumLargeDevice ? styles.rowContainerMediumLarge : null,
        isSmallDevice ? styles.rowContainerSmall : null,
        isTinyDevice ? styles.rowContainerTiny : null,
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
              isLargeDevice ? styles.grayRectangleLarge : null,
              isMediumLargeDevice ? styles.grayRectangleMediumLarge : null,
              isSmallDevice ? styles.grayRectangleSmall : null,
              isTinyDevice ? styles.grayRectangleTiny : null,
              defaultDiscipline === true && styles.defaultSelectedButton
            ]}
            onPress={() => handleSelect(true)}
          >
            <Image
              source={require("../assets/images/MAG.webp")}
              style={[
                isLargeDevice ? styles.disciplineImageLarge : null,
                isMediumLargeDevice ? styles.disciplineImageMediumLarge : null,
                isSmallDevice ? styles.disciplineImageSmall : null,
                isTinyDevice ? styles.disciplineImageTiny : null,
              ]}
              resizeMode="contain"
            />
            <Text style={[
              isLargeDevice ? styles.rectangleTextLarge : null,
              isMediumLargeDevice ? styles.rectangleTextMediumLarge : null,
              isSmallDevice ? styles.rectangleTextSmall : null,
              isTinyDevice ? styles.rectangleTextTiny : null,
            ]}>MAG</Text>
            {defaultDiscipline === true && (
              <View style={[
                isLargeDevice ? styles.defaultBadgeLarge : null,
                isMediumLargeDevice ? styles.defaultBadgeMediumLarge : null,
                isSmallDevice ? styles.defaultBadgeSmall : null,
                isTinyDevice ? styles.defaultBadgeTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.defaultBadgeTextLarge : null,
                  isMediumLargeDevice ? styles.defaultBadgeTextMediumLarge : null,
                  isSmallDevice ? styles.defaultBadgeTextSmall : null,
                  isTinyDevice ? styles.defaultBadgeTextTiny : null,
                ]}>DEFAULT</Text>
              </View>
            )}
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
              isLargeDevice ? styles.grayRectangleLarge : null,
              isMediumLargeDevice ? styles.grayRectangleMediumLarge : null,
              isSmallDevice ? styles.grayRectangleSmall : null,
              isTinyDevice ? styles.grayRectangleTiny : null,
              defaultDiscipline === false && styles.defaultSelectedButton
            ]}
            onPress={() => handleSelect(false)}
          >
            <Image
              source={require("../assets/images/WAG.webp")}
              style={[
                isLargeDevice ? styles.disciplineImageLarge : null,
                isMediumLargeDevice ? styles.disciplineImageMediumLarge : null,
                isSmallDevice ? styles.disciplineImageSmall : null,
                isTinyDevice ? styles.disciplineImageTiny : null,
              ]}
              resizeMode="contain"
            />
            <Text style={[
              isLargeDevice ? styles.rectangleTextLarge : null,
              isMediumLargeDevice ? styles.rectangleTextMediumLarge : null,
              isSmallDevice ? styles.rectangleTextSmall : null,
              isTinyDevice ? styles.rectangleTextTiny : null,
            ]}>WAG</Text>
            {defaultDiscipline === false && (
              <View style={[
                isLargeDevice ? styles.defaultBadgeLarge : null,
                isMediumLargeDevice ? styles.defaultBadgeMediumLarge : null,
                isSmallDevice ? styles.defaultBadgeSmall : null,
                isTinyDevice ? styles.defaultBadgeTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.defaultBadgeTextLarge : null,
                  isMediumLargeDevice ? styles.defaultBadgeTextMediumLarge : null,
                  isSmallDevice ? styles.defaultBadgeTextSmall : null,
                  isTinyDevice ? styles.defaultBadgeTextTiny : null,
                ]}>DEFAULT</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Toggle Default Discipline Button */}
      <Animated.View style={{ opacity: toggleButtonOpacity }}>
        <TouchableOpacity
          style={[
            isLargeDevice ? styles.toggleButtonLarge : null,
            isMediumLargeDevice ? styles.toggleButtonMediumLarge : null,
            isSmallDevice ? styles.toggleButtonSmall : null,
            isTinyDevice ? styles.toggleButtonTiny : null,
          ]}
          onPress={toggleDefaultDiscipline}
        >
          <Text style={[
            isLargeDevice ? styles.toggleButtonTextLarge : null,
            isMediumLargeDevice ? styles.toggleButtonTextMediumLarge : null,
            isSmallDevice ? styles.toggleButtonTextSmall : null,
            isTinyDevice ? styles.toggleButtonTextTiny : null,
          ]}>
            {defaultDiscipline === null 
              ? "SET AS DEFAULT" 
              : defaultDiscipline === true 
                ? "MAG DEFAULT → WAG DEFAULT" 
                : "WAG DEFAULT → REMOVE DEFAULT"
            }
          </Text>
          <Text style={[
            isLargeDevice ? styles.toggleSubtextLarge : null,
            isMediumLargeDevice ? styles.toggleSubtextMediumLarge : null,
            isSmallDevice ? styles.toggleSubtextSmall : null,
            isTinyDevice ? styles.toggleSubtextTiny : null,
          ]}>
            {defaultDiscipline === null 
              ? "Tap to set MAG as default" 
              : "Tap to change default discipline"
            }
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Modal para generar claves */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            isLargeDevice ? styles.modalContainerLarge : null,
            isMediumLargeDevice ? styles.modalContainerMediumLarge : null,
            isSmallDevice ? styles.modalContainerSmall : null,
            isTinyDevice ? styles.modalContainerTiny : null,
          ]}>
            <Text style={[
              isLargeDevice ? styles.modalTitleLarge : null,
              isMediumLargeDevice ? styles.modalTitleMediumLarge : null,
              isSmallDevice ? styles.modalTitleSmall : null,
              isTinyDevice ? styles.modalTitleTiny : null,
            ]}>Generador de Claves de Activación</Text>
            

            
            <Text style={[
              isLargeDevice ? styles.modalLabelLarge : null,
              isMediumLargeDevice ? styles.modalLabelMediumLarge : null,
              isSmallDevice ? styles.modalLabelSmall : null,
              isTinyDevice ? styles.modalLabelTiny : null,
            ]}>Pegue la información del dispositivo:</Text>
            <TextInput
              style={[
                isLargeDevice ? styles.modalTextInputLarge : null,
                isMediumLargeDevice ? styles.modalTextInputMediumLarge : null,
                isSmallDevice ? styles.modalTextInputSmall : null,
                isTinyDevice ? styles.modalTextInputTiny : null,
              ]}
              multiline
              numberOfLines={8}
              value={deviceInfo}
              onChangeText={handleDeviceInfoChange}
              placeholder="Pegue aquí el correo con la información del dispositivo..."
            />
            
            <View style={[
              isLargeDevice ? styles.deviceIdContainerLarge : null,
              isMediumLargeDevice ? styles.deviceIdContainerMediumLarge : null,
              isSmallDevice ? styles.deviceIdContainerSmall : null,
              isTinyDevice ? styles.deviceIdContainerTiny : null,
            ]}>
              <Text style={[
                isLargeDevice ? styles.modalLabelLarge : null,
                isMediumLargeDevice ? styles.modalLabelMediumLarge : null,
                isSmallDevice ? styles.modalLabelSmall : null,
                isTinyDevice ? styles.modalLabelTiny : null,
              ]}>ID del Dispositivo:</Text>
              <Text style={[
                isLargeDevice ? styles.deviceIdTextLarge : null,
                isMediumLargeDevice ? styles.deviceIdTextMediumLarge : null,
                isSmallDevice ? styles.deviceIdTextSmall : null,
                isTinyDevice ? styles.deviceIdTextTiny : null,
              ]}>{deviceId || "No detectado"}</Text>
            </View>
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.generateButtonLarge : null,
                isMediumLargeDevice ? styles.generateButtonMediumLarge : null,
                isSmallDevice ? styles.generateButtonSmall : null,
                isTinyDevice ? styles.generateButtonTiny : null,
                !deviceId.trim() && styles.disabledButton,
                isGenerating && styles.loadingButton
              ]}
              onPress={generateActivationKey}
              disabled={!deviceId.trim() || isGenerating}
            >
              <Text style={[
                isLargeDevice ? styles.buttonTextLarge : null,
                isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
                isSmallDevice ? styles.buttonTextSmall : null,
                isTinyDevice ? styles.buttonTextTiny : null,
              ]}>
                {isGenerating ? 'Generando...' : 'Generar Clave'}
              </Text>
            </TouchableOpacity>
            
            {/* {generatedKey ? (
              <View style={[
                isLargeDevice ? styles.keyResultContainerLarge : null,
                isMediumLargeDevice ? styles.keyResultContainerMediumLarge : null,
                isSmallDevice ? styles.keyResultContainerSmall : null,
                isTinyDevice ? styles.keyResultContainerTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.resultLabelLarge : null,
                  isMediumLargeDevice ? styles.resultLabelMediumLarge : null,
                  isSmallDevice ? styles.resultLabelSmall : null,
                  isTinyDevice ? styles.resultLabelTiny : null,
                ]}>Clave de Activación:</Text>
                <TouchableOpacity 
                  style={[
                    isLargeDevice ? styles.copyContainerLarge : null,
                    isMediumLargeDevice ? styles.copyContainerMediumLarge : null,
                    isSmallDevice ? styles.copyContainerSmall : null,
                    isTinyDevice ? styles.copyContainerTiny : null,
                  ]}
                  onPress={copyToClipboard}
                >
                  <Text style={[
                    isLargeDevice ? styles.generatedKeyTextLarge : null,
                    isMediumLargeDevice ? styles.generatedKeyTextMediumLarge : null,
                    isSmallDevice ? styles.generatedKeyTextSmall : null,
                    isTinyDevice ? styles.generatedKeyTextTiny : null,
                  ]}>{generatedKey}</Text>
                  <Text style={[
                    isLargeDevice ? styles.copyTextLarge : null,
                    isMediumLargeDevice ? styles.copyTextMediumLarge : null,
                    isSmallDevice ? styles.copyTextSmall : null,
                    isTinyDevice ? styles.copyTextTiny : null,
                  ]}>Tocar para copiar</Text>
                </TouchableOpacity>
              </View>
            ) : null} */}
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.closeButtonLarge : null,
                isMediumLargeDevice ? styles.closeButtonMediumLarge : null,
                isSmallDevice ? styles.closeButtonSmall : null,
                isTinyDevice ? styles.closeButtonTiny : null,
              ]}
              onPress={() => {
                setModalVisible(false);
                setDeviceInfo('');
                setDeviceId('');
                setGeneratedKey('');
              }}
            >
              <Text style={[
                isLargeDevice ? styles.closeButtonTextLarge : null,
                isMediumLargeDevice ? styles.closeButtonTextMediumLarge : null,
                isSmallDevice ? styles.closeButtonTextSmall : null,
                isTinyDevice ? styles.closeButtonTextTiny : null,
              ]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para exportar folders */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showExportModal}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            isLargeDevice ? styles.modalContainerLarge : null,
            isMediumLargeDevice ? styles.modalContainerMediumLarge : null,
            isSmallDevice ? styles.modalContainerSmall : null,
            isTinyDevice ? styles.modalContainerTiny : null,
          ]}>
            <Text style={[
              isLargeDevice ? styles.modalTitleLarge : null,
              isMediumLargeDevice ? styles.modalTitleMediumLarge : null,
              isSmallDevice ? styles.modalTitleSmall : null,
              isTinyDevice ? styles.modalTitleTiny : null,
            ]}>Exportar Folder</Text>
            
            <Text style={[
              isLargeDevice ? styles.modalLabelLarge : null,
              isMediumLargeDevice ? styles.modalLabelMediumLarge : null,
              isSmallDevice ? styles.modalLabelSmall : null,
              isTinyDevice ? styles.modalLabelTiny : null,
            ]}>Selecciona el folder que deseas exportar:</Text>
            
            {/* Lista de folders del usuario */}
            <ScrollView style={{ width: '100%' }}>
              {userFolders.length === 0 ? (
                <Text style={styles.noFoldersText}>No tienes folders disponibles para exportar.</Text>
              ) : (
                userFolders.map((folder) => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[
                      styles.folderItem,
                      selectedFolder?.id === folder.id && styles.selectedFolderItem
                    ]}
                    onPress={() => setSelectedFolder(folder)}
                  >
                    <Text style={styles.folderItemText}>{folder.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.generateButtonLarge : null,
                isMediumLargeDevice ? styles.generateButtonMediumLarge : null,
                isSmallDevice ? styles.generateButtonSmall : null,
                isTinyDevice ? styles.generateButtonTiny : null,
                !selectedFolder && styles.disabledButton,
                isExporting && styles.loadingButton
              ]}
              onPress={handleExportFolder}
              disabled={!selectedFolder || isExporting}
            >
              <Text style={[
                isLargeDevice ? styles.buttonTextLarge : null,
                isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
                isSmallDevice ? styles.buttonTextSmall : null,
                isTinyDevice ? styles.buttonTextTiny : null,
              ]}>
                {isExporting ? 'Exportando...' : 'Exportar Folder'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.closeButtonLarge : null,
                isMediumLargeDevice ? styles.closeButtonMediumLarge : null,
                isSmallDevice ? styles.closeButtonSmall : null,
                isTinyDevice ? styles.closeButtonTiny : null,
              ]}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={[
                isLargeDevice ? styles.closeButtonTextLarge : null,
                isMediumLargeDevice ? styles.closeButtonTextMediumLarge : null,
                isSmallDevice ? styles.closeButtonTextSmall : null,
                isTinyDevice ? styles.closeButtonTextTiny : null,
              ]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para importar folders */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showImportModal}
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            isLargeDevice ? styles.modalContainerLarge : null,
            isMediumLargeDevice ? styles.modalContainerMediumLarge : null,
            isSmallDevice ? styles.modalContainerSmall : null,
            isTinyDevice ? styles.modalContainerTiny : null,
          ]}>
            <Text style={[
              isLargeDevice ? styles.modalTitleLarge : null,
              isMediumLargeDevice ? styles.modalTitleMediumLarge : null,
              isSmallDevice ? styles.modalTitleSmall : null,
              isTinyDevice ? styles.modalTitleTiny : null,
            ]}>Importar Folder</Text>
            
            <Text style={[
              isLargeDevice ? styles.modalLabelLarge : null,
              isMediumLargeDevice ? styles.modalLabelMediumLarge : null,
              isSmallDevice ? styles.modalLabelSmall : null,
              isTinyDevice ? styles.modalLabelTiny : null,
            ]}>Selecciona el archivo del folder que deseas importar:</Text>
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.generateButtonLarge : null,
                isMediumLargeDevice ? styles.generateButtonMediumLarge : null,
                isSmallDevice ? styles.generateButtonSmall : null,
                isTinyDevice ? styles.generateButtonTiny : null,
                isImporting && styles.loadingButton
              ]}
              onPress={handleImportFolder}
              disabled={isImporting}
            >
              <Text style={[
                isLargeDevice ? styles.buttonTextLarge : null,
                isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
                isSmallDevice ? styles.buttonTextSmall : null,
                isTinyDevice ? styles.buttonTextTiny : null,
              ]}>
                {isImporting ? 'Importando...' : 'Importar Folder'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.closeButtonLarge : null,
                isMediumLargeDevice ? styles.closeButtonMediumLarge : null,
                isSmallDevice ? styles.closeButtonSmall : null,
                isTinyDevice ? styles.closeButtonTiny : null,
              ]}
              onPress={() => setShowImportModal(false)}
            >
              <Text style={[
                isLargeDevice ? styles.closeButtonTextLarge : null,
                isMediumLargeDevice ? styles.closeButtonTextMediumLarge : null,
                isSmallDevice ? styles.closeButtonTextSmall : null,
                isTinyDevice ? styles.closeButtonTextTiny : null,
              ]}>Cerrar</Text>
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
  
  // Background images - Large Device (width >= 1368)
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
  
  // Background images - Medium Large Device (width >= 1200 && width < 1368)
  backgroundImageMediumLarge: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 250,
    height: 490,
  },
  backgroundImageRightMediumLarge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 250,
    height: 470,
  },
  
  // Background images - Small Device (width >= 945 && width < 1200)
  backgroundImageSmall: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 180,
    height: 360,
  },
  backgroundImageRightSmall: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 180,
    height: 360,
  },
  
  // Background images - Tiny Device (width < 945)
  backgroundImageTiny: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 140,
    height: 280,
  },
  backgroundImageRightTiny: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 140,
    height: 280,
  },
  
  // Title text styles - Large Device
  titleTextLarge: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 80,
    textAlign: "center",
    marginTop: "10%",
    fontFamily: "Rajdhani-Bold",
  },
  // Title text styles - Medium Large Device
  titleTextMediumLarge: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 70,
    textAlign: "center",
    marginTop: "10%",
    fontFamily: "Rajdhani-Bold",
  },
  // Title text styles - Small Device
  titleTextSmall: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 55,
    textAlign: "center",
    marginTop: "10%",
    fontFamily: "Rajdhani-Bold",
  },
  // Title text styles - Tiny Device
  titleTextTiny: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 40,
    textAlign: "center",
    marginTop: "8%",
    fontFamily: "Rajdhani-Bold",
  },
  
  // Row container styles - Large Device
  rowContainerLarge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "75%",
    alignSelf: "center",
    marginTop: 40,
  },
  // Row container styles - Medium Large Device
  rowContainerMediumLarge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "72%",
    alignSelf: "center",
    marginTop: 35,
  },
  // Row container styles - Small Device
  rowContainerSmall: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "70%",
    alignSelf: "center",
    marginTop: 25,
  },
  // Row container styles - Tiny Device
  rowContainerTiny: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "70%",
    alignSelf: "center",
    marginTop: 10,
  },
  
  // Rectangle button styles - Large Device
  grayRectangleLarge: {
    backgroundColor: "#6E6E6E",
    width: "100%",
    height: 350,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    position: "relative",
  },
  // Rectangle button styles - Medium Large Device
  grayRectangleMediumLarge: {
    backgroundColor: "#6E6E6E",
    width: "100%",
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 28,
    position: "relative",
  },
  // Rectangle button styles - Small Device
  grayRectangleSmall: {
    backgroundColor: "#6E6E6E",
    width: "100%",
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    position: "relative",
  },
  // Rectangle button styles - Tiny Device
  grayRectangleTiny: {
    backgroundColor: "#6E6E6E",
    width: "100%",
    height: 190,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    position: "relative",
  },

  // Default selected button style
  defaultSelectedButton: {
    borderWidth: 4,
    borderColor: "#004aad",
    shadowColor: "#004aad",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  
  // Text styles for buttons - Large Device
  rectangleTextLarge: {
    color: "#F1F3F5",
    fontSize: 60,
    fontFamily: "Rajdhani-Bold",
    bottom: 20,
    position: "absolute",
  },
  // Text styles for buttons - Medium Large Device
  rectangleTextMediumLarge: {
    color: "#F1F3F5",
    fontSize: 35,
    fontFamily: "Rajdhani-Bold",
    bottom: 5,
    position: "absolute",
  },
  // Text styles for buttons - Small Device
  rectangleTextSmall: {
    color: "#F1F3F5",
    fontSize: 44,
    fontFamily: "Rajdhani-Bold",
    bottom: 15,
    position: "absolute",
  },
  // Text styles for buttons - Tiny Device
  rectangleTextTiny: {
    color: "#F1F3F5",
    fontSize: 36,
    fontFamily: "Rajdhani-Bold",
    bottom: 10,
    position: "absolute",
  },
  
  // Image styles - Large Device
  disciplineImageLarge: {
    width: "55%",
    height: "70%",
    top: -35,
  },
  // Image styles - Medium Large Device
  disciplineImageMediumLarge: {
    width: "53%",
    height: "68%",
    top: -30,
  },
  // Image styles - Small Device
  disciplineImageSmall: {
    width: "52%",
    height: "65%",
    top: -25,
  },
  // Image styles - Tiny Device
  disciplineImageTiny: {
    width: "50%",
    height: "60%",
    top: -15,
  },

  // Default badge styles - Large Device
  defaultBadgeLarge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#004aad',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  // Default badge styles - Medium Large Device
  defaultBadgeMediumLarge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#004aad',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  // Default badge styles - Small Device
  defaultBadgeSmall: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#004aad',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  // Default badge styles - Tiny Device
  defaultBadgeTiny: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#004aad',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  // Default badge text styles - Large Device
  defaultBadgeTextLarge: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Default badge text styles - Medium Large Device
  defaultBadgeTextMediumLarge: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Default badge text styles - Small Device
  defaultBadgeTextSmall: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  // Default badge text styles - Tiny Device
  defaultBadgeTextTiny: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Toggle button styles - Large Device
  toggleButtonLarge: {
    backgroundColor: "#4A5568",
    marginTop: 40,
    marginHorizontal: 60,
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  // Toggle button styles - Medium Large Device
  toggleButtonMediumLarge: {
    backgroundColor: "#4A5568",
    marginTop: 35,
    marginHorizontal: 50,
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  // Toggle button styles - Small Device
  toggleButtonSmall: {
    backgroundColor: "#4A5568",
    marginTop: 30,
    marginHorizontal: 40,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  // Toggle button styles - Tiny Device
  toggleButtonTiny: {
    backgroundColor: "#4A5568",
    marginTop: 25,
    marginHorizontal: 30,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  // Toggle button text styles - Large Device
  toggleButtonTextLarge: {
    color: "#F1F3F5",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Rajdhani-Bold",
    textAlign: "center",
  },
  // Toggle button text styles - Medium Large Device
  toggleButtonTextMediumLarge: {
    color: "#F1F3F5",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Rajdhani-Bold",
    textAlign: "center",
  },
  // Toggle button text styles - Small Device
  toggleButtonTextSmall: {
    color: "#F1F3F5",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Rajdhani-Bold",
    textAlign: "center",
  },
  // Toggle button text styles - Tiny Device
  toggleButtonTextTiny: {
    color: "#F1F3F5",
    fontWeight: "bold",
    fontSize: 12,
    fontFamily: "Rajdhani-Bold",
    textAlign: "center",
  },

  // Toggle subtext styles - Large Device
  toggleSubtextLarge: {
    color: "#CBD5E0",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Toggle subtext styles - Medium Large Device
  toggleSubtextMediumLarge: {
    color: "#CBD5E0",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Toggle subtext styles - Small Device
  toggleSubtextSmall: {
    color: "#CBD5E0",
    fontSize: 10,
    marginTop: 3,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Toggle subtext styles - Tiny Device
  toggleSubtextTiny: {
    color: "#CBD5E0",
    fontSize: 9,
    marginTop: 3,
    textAlign: "center",
    fontStyle: "italic",
  },
  
  // Admin key button styles - Large Device
  adminKeyButtonLarge: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  // Admin key button styles - Medium Large Device
  adminKeyButtonMediumLarge: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 10,
  },
  // Admin key button styles - Small Device
  adminKeyButtonSmall: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
  },
  // Admin key button styles - Tiny Device
  adminKeyButtonTiny: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  
  // Key button container styles - Large Device
  keyButtonContainerLarge: {
    flexDirection: 'row',
    backgroundColor: '#004aad',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  // Key button container styles - Medium Large Device
  keyButtonContainerMediumLarge: {
    flexDirection: 'row',
    backgroundColor: '#004aad',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: 'center',
  },
  // Key button container styles - Small Device
  keyButtonContainerSmall: {
    flexDirection: 'row',
    backgroundColor: '#004aad',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  // Key button container styles - Tiny Device
  keyButtonContainerTiny: {
    flexDirection: 'row',
    backgroundColor: '#004aad',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  
  // Key icon styles - Large Device
  keyIconLarge: {
    width: 20,
    height: 20,
    marginRight: 5,
    tintColor: 'white',
  },
  // Key icon styles - Medium Large Device
  keyIconMediumLarge: {
    width: 18,
    height: 18,
    marginRight: 4,
    tintColor: 'white',
  },
  // Key icon styles - Small Device
  keyIconSmall: {
    width: 16,
    height: 16,
    marginRight: 4,
    tintColor: 'white',
  },
  // Key icon styles - Tiny Device
  keyIconTiny: {
    width: 20,
    height: 20,
    marginRight: 5,
    tintColor: 'white',
  },
  
  // Key button text styles - Large Device
  keyButtonTextLarge: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Key button text styles - Medium Large Device
  keyButtonTextMediumLarge: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Key button text styles - Small Device
  keyButtonTextSmall: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Key button text styles - Tiny Device
  keyButtonTextTiny: {
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
  
  // Modal container styles - Large Device
  modalContainerLarge: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '50%',
    maxHeight: '80%',
  },
  // Modal container styles - Medium Large Device
  modalContainerMediumLarge: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    width: '60%',
    maxHeight: '80%',
  },
  // Modal container styles - Small Device
  modalContainerSmall: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '75%',
    maxHeight: '80%',
  },
  // Modal container styles - Tiny Device
  modalContainerTiny: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
  },
  
  // Modal title styles - Large Device
  modalTitleLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#004aad',
    textAlign: 'center',
  },
  // Modal title styles - Medium Large Device
  modalTitleMediumLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#004aad',
    textAlign: 'center',
  },
  // Modal title styles - Small Device
  modalTitleSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#004aad',
    textAlign: 'center',
  },
  // Modal title styles - Tiny Device
  modalTitleTiny: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#004aad',
    textAlign: 'center',
  },
  
  // User info container styles - Large Device
  userInfoContainerLarge: {
    backgroundColor: '#e8f4ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  // User info container styles - Medium Large Device
  userInfoContainerMediumLarge: {
    backgroundColor: '#e8f4ff',
    padding: 9,
    borderRadius: 7,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  // User info container styles - Small Device
  userInfoContainerSmall: {
    backgroundColor: '#e8f4ff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  // User info container styles - Tiny Device
  userInfoContainerTiny: {
    backgroundColor: '#e8f4ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  
  // User info text styles - Large Device
  userInfoTextLarge: {
    fontSize: 14,
    color: '#004aad',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // User info text styles - Medium Large Device
  userInfoTextMediumLarge: {
    fontSize: 13,
    color: '#004aad',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // User info text styles - Small Device
  userInfoTextSmall: {
    fontSize: 12,
    color: '#004aad',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // User info text styles - Tiny Device
  userInfoTextTiny: {
    fontSize: 14,
    color: '#004aad',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Modal label styles - Large Device
  modalLabelLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  // Modal label styles - Medium Large Device
  modalLabelMediumLarge: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  // Modal label styles - Small Device
  modalLabelSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  // Modal label styles - Tiny Device
  modalLabelTiny: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  
  // Modal text input styles - Large Device
  modalTextInputLarge: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 120,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  // Modal text input styles - Medium Large Device
  modalTextInputMediumLarge: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 7,
    padding: 9,
    minHeight: 110,
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  // Modal text input styles - Small Device
  modalTextInputSmall: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    minHeight: 100,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  // Modal text input styles - Tiny Device
  modalTextInputTiny: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 120,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  
  // Device ID container styles - Large Device
  deviceIdContainerLarge: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  // Device ID container styles - Medium Large Device
  deviceIdContainerMediumLarge: {
    backgroundColor: '#f5f5f5',
    padding: 9,
    borderRadius: 7,
    marginBottom: 14,
  },
  // Device ID container styles - Small Device
  deviceIdContainerSmall: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  // Device ID container styles - Tiny Device
  deviceIdContainerTiny: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  
  // Device ID text styles - Large Device
  deviceIdTextLarge: {
    fontSize: 16,
    color: '#004aad',
    fontWeight: 'bold',
  },
  // Device ID text styles - Medium Large Device
  deviceIdTextMediumLarge: {
    fontSize: 15,
    color: '#004aad',
    fontWeight: 'bold',
  },
  // Device ID text styles - Small Device
  deviceIdTextSmall: {
    fontSize: 14,
    color: '#004aad',
    fontWeight: 'bold',
  },
  // Device ID text styles - Tiny Device
  deviceIdTextTiny: {
    fontSize: 16,
    color: '#004aad',
    fontWeight: 'bold',
  },
  
  // Generate button styles - Large Device
  generateButtonLarge: {
    backgroundColor: '#004aad',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  // Generate button styles - Medium Large Device
  generateButtonMediumLarge: {
    backgroundColor: '#004aad',
    paddingVertical: 11,
    borderRadius: 7,
    alignItems: 'center',
    marginVertical: 9,
  },
  // Generate button styles - Small Device
  generateButtonSmall: {
    backgroundColor: '#004aad',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 8,
  },
  // Generate button styles - Tiny Device
  generateButtonTiny: {
    backgroundColor: '#004aad',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  
  // Disabled and loading button states
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  loadingButton: {
    backgroundColor: '#6c8eb4',
  },
  
  // Button text styles - Large Device
  buttonTextLarge: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Button text styles - Medium Large Device
  buttonTextMediumLarge: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Button text styles - Small Device
  buttonTextSmall: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Button text styles - Tiny Device
  buttonTextTiny: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Key result container styles - Large Device
  keyResultContainerLarge: {
    marginTop: 15,
    backgroundColor: '#e8f4ff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  // Key result container styles - Medium Large Device
  keyResultContainerMediumLarge: {
    marginTop: 14,
    backgroundColor: '#e8f4ff',
    padding: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  // Key result container styles - Small Device
  keyResultContainerSmall: {
    marginTop: 12,
    backgroundColor: '#e8f4ff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  // Key result container styles - Tiny Device
  keyResultContainerTiny: {
    marginTop: 15,
    backgroundColor: '#e8f4ff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbd8f9',
  },
  
  // Result label styles - Large Device
  resultLabelLarge: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  // Result label styles - Medium Large Device
  resultLabelMediumLarge: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  // Result label styles - Small Device
  resultLabelSmall: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  // Result label styles - Tiny Device
  resultLabelTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  
  // Copy container styles - Large Device
  copyContainerLarge: {
    alignItems: 'center',
  },
  // Copy container styles - Medium Large Device
  copyContainerMediumLarge: {
    alignItems: 'center',
  },
  // Copy container styles - Small Device
  copyContainerSmall: {
    alignItems: 'center',
  },
  // Copy container styles - Tiny Device
  copyContainerTiny: {
    alignItems: 'center',
  },
  
  // Generated key text styles - Large Device
  generatedKeyTextLarge: {
    fontSize: 18,
    color: '#004aad',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  // Generated key text styles - Medium Large Device
  generatedKeyTextMediumLarge: {
    fontSize: 17,
    color: '#004aad',
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  // Generated key text styles - Small Device
  generatedKeyTextSmall: {
    fontSize: 16,
    color: '#004aad',
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  // Generated key text styles - Tiny Device
  generatedKeyTextTiny: {
    fontSize: 18,
    color: '#004aad',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  
  // Copy text styles - Large Device
  copyTextLarge: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  // Copy text styles - Medium Large Device
  copyTextMediumLarge: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  // Copy text styles - Small Device
  copyTextSmall: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  // Copy text styles - Tiny Device
  copyTextTiny: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  
  // Close button styles - Large Device
  closeButtonLarge: {
    backgroundColor: '#666',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  // Close button styles - Medium Large Device
  closeButtonMediumLarge: {
    backgroundColor: '#666',
    paddingVertical: 9,
    borderRadius: 7,
    alignItems: 'center',
    marginTop: 18,
  },
  // Close button styles - Small Device
  closeButtonSmall: {
    backgroundColor: '#666',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 15,
  },
  // Close button styles - Tiny Device
  closeButtonTiny: {
    backgroundColor: '#666',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  
  // Close button text styles - Large Device
  closeButtonTextLarge: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Close button text styles - Medium Large Device
  closeButtonTextMediumLarge: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Close button text styles - Small Device
  closeButtonTextSmall: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Close button text styles - Tiny Device
  closeButtonTextTiny: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Folder item styles
  folderItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  folderItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFolderItem: {
    backgroundColor: '#e0f7fa',
    borderColor: '#004aad',
  },
  
  // No folders text style
  noFoldersText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },

  // Import/Export container styles - Large Device
  importExportContainerLarge: {
    position: 'absolute',
    top: 40,
    right: 40,
    zIndex: 10,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  // Import/Export container styles - Medium Large Device
  importExportContainerMediumLarge: {
    position: 'absolute',
    top: 35,
    right: 35,
    zIndex: 10,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  // Import/Export container styles - Small Device
  importExportContainerSmall: {
    position: 'absolute',
    top: 30,
    right: 30,
    zIndex: 10,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  // Import/Export container styles - Tiny Device
  importExportContainerTiny: {
    position: 'absolute',
    top: 25,
    right: 25,
    zIndex: 10,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  
  // Import/Export button styles - Large Device
  importExportButtonLarge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 8,
  },
  // Import/Export button styles - Medium Large Device
  importExportButtonMediumLarge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 7,
  },
  // Import/Export button styles - Small Device
  importExportButtonSmall: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 6,
  },
  // Import/Export button styles - Tiny Device
  importExportButtonTiny: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 7,
  },

  // Import/Export text styles - Large Device
  importExportTextLarge: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Import/Export text styles - Medium Large Device
  importExportTextMediumLarge: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  // Import/Export text styles - Small Device
  importExportTextSmall: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  // Import/Export text styles - Tiny Device
  importExportTextTiny: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});