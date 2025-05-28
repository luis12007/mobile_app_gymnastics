import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageStyle,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const CURRENT_USER_KEY = "currentUser";
const DEVICE_ID_KEY = "deviceId";
const APP_ACTIVATED_KEY = "appActivated";
const FIRST_RUN_KEY = "app_first_run";

import { insertUser, registerActivatedDevice, validateUser } from "../Database/database";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  // Use simpler ternary operators for device size detection
  const isLargeScreen = width >= 1000 && height >= 700;
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // New states for device registration
  const [showRegistration, setShowRegistration] = useState(false);
  const [activationKey, setActivationKey] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deviceInfo, setDeviceInfo] = useState(null);

  // Animation values
  const logoScale = useRef(new Animated.Value(2)).current;
  const logoPosition = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const inputsTranslateY = useRef(new Animated.Value(50)).current;
  const buttonTranslateY = useRef(new Animated.Value(50)).current;

// Función para crear usuarios por defecto solo si no existen
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
  // Start the animation sequence after a short delay
  setTimeout(() => {
    Animated.sequence([
      // First animate the logo (scaling down and moving up)
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false, // Changed to false since we're animating position
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(logoPosition, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false, // Changed to false since we're animating position
          easing: Easing.out(Easing.back(1.2)),
        }),
      ]),
      // Then fade in the content
      Animated.stagger(200, [
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(inputsTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
      ]),
    ]).start(() => {
      setShowContent(true);
    });
  }, 300);

  // Always create default users if they don't exist
  createDefaultUsers();

  // Check if device is already registered
  checkDeviceRegistration();
}, []);
  
  // Function to check if the device is already registered
  const checkDeviceRegistration = async () => {
    try {
      const isActivated = await AsyncStorage.getItem(APP_ACTIVATED_KEY);
      if (isActivated === 'true') {
        // Device is already activated
        console.log("Device is already activated");
      }
    } catch (error) {
      console.error("Error checking device registration:", error);
    }
  };

  const handleLogin = async () => {
    try {
      // Validate input
      if (!username.trim() || !password.trim()) {
        Alert.alert("Error", "Username and password cannot be empty");
        return;
      }
      
      setIsLoading(true);
      
      // Try to validate the user
      const userId = await validateUser(username.trim(), password.trim());
      console.log("User ID:", userId);
      if (userId) {
        // Store the current user ID
        await AsyncStorage.setItem(CURRENT_USER_KEY, userId.toString());
        console.log("User logged in successfully. User ID:", userId);
        
        // Navigate to the main menu after successful login
        router.push(`/select-sex?userId=${userId}`);
      } else {
        Alert.alert("Error", "Invalid username or password");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      Alert.alert("Error", "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to initiate the device registration process
  const initiateRegistration = async () => {
    setIsLoading(true);
    try {
      // Gather device information
      const deviceData = await getDeviceInfo();
      setDeviceInfo(deviceData);
      
      // Generate a unique device ID
      const deviceId = await generateDeviceId(deviceData);
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      
      // Create email with device information
      const emailSubject = encodeURIComponent("GymJudge Device Registration Request");
      const emailBody = encodeURIComponent(
        `Hello,\n\nI would like to register my device for the GymJudge application.\n\n` +
        `Device Information:\n${JSON.stringify(deviceData, null, 2)}\n\n` +
        `Device ID: ${deviceId}\n\n` +
        `Please send me an activation key for this device.\n\nThank you.`
      );
      
      const mailtoLink = `mailto:luishdezmtz12@gmail.com?subject=${emailSubject}&body=${emailBody}`;
      
      // Open the user's mail client
      const canOpen = await Linking.canOpenURL(mailtoLink);
      
      if (canOpen) {
        await Linking.openURL(mailtoLink);
        setShowRegistration(true);
        Alert.alert(
          "Registration Started",
          "An email has been prepared with your device information. Send it to receive your activation key."
        );
      } else {
        Alert.alert(
          "Error",
          "Could not open email client. Please contact support manually."
        );
      }
    } catch (error) {
      console.error("Error initiating registration:", error);
      Alert.alert("Error", "Failed to start registration process");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to complete the registration process
  const completeRegistration = async () => {
    if (!activationKey.trim() || !registerUsername.trim() || !registerPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "All fields are required");
      return;
    }
    
    if (registerPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the stored device ID
      const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      
      if (!deviceId) {
        Alert.alert("Error", "Device information not found. Please restart the registration process.");
        return;
      }
      
      // Validate the activation key
      const isValid = await validateActivationKey(activationKey, deviceId);
      
      if (isValid) {
        // Register the new user
        const userId = await insertUser(registerUsername, registerPassword);
        
        if (userId) {
          // Mark the device as activated
          await AsyncStorage.setItem(APP_ACTIVATED_KEY, 'true');
          
          // Register the activated device
          await registerActivatedDevice(deviceId, activationKey, userId);
          
          Alert.alert(
            "Registration Complete",
            "Your account has been created successfully. You can now log in.",
            [{ text: "OK", onPress: () => setShowRegistration(false) }]
          );
        } else {
          Alert.alert("Registration Failed", "Username may already exist or registration failed.");
        }
      } else {
        Alert.alert("Invalid Key", "The activation key is not valid for this device.");
      }
    } catch (error) {
      console.error("Error completing registration:", error);
      Alert.alert("Error", "Failed to complete registration");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to collect device information
  const getDeviceInfo = async () => {
    return {
      deviceName: Device.deviceName || 'Unknown',
      brand: Device.brand || 'Unknown',
      modelName: Device.modelName || 'Unknown',
      osName: Device.osName || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      timestamp: new Date().toISOString()
    };
  };
  
  // Function to generate a unique device ID
  const generateDeviceId = async (deviceInfo) => {
    const deviceString = JSON.stringify(deviceInfo);
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      deviceString
    );
    return hash.substring(0, 16); // Use only first 16 characters for readability
  };
  
  // Function to validate the activation key
  const validateActivationKey = async (key, deviceId) => {
    // Key format: GYM-[hash]-[timestamp]
    const parts = key.split('-');
    
    if (parts.length !== 3 || parts[0] !== 'GYM') {
      return false;
    }
    
    // Extract the hash from the key
    const keyHash = parts[1];
    
    // Recreate the hash using the device ID and app secret
    const APP_SECRET = 'GymJudge2023SecretKey'; // Should be stored more securely
    const validationString = deviceId + APP_SECRET;
    
    const expectedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      validationString
    );
    
    // Compare first 8 characters for simplicity
    const expectedShortHash = expectedHash.substring(0, 8);
    
    return keyHash === expectedShortHash;
  };

  // Calculate logo transform based on animation values
  const logoTransform = [
    { scale: logoScale },
    { 
      translateY: logoPosition.interpolate({
        inputRange: [0, 1],
        outputRange: [height * 0.1, 0] // Move from center to final position
      }) 
    }
  ];
  
  // Initial position styles that will be applied conditionally
  const initialLogoStyles = {
    position: 'absolute',
    top: height / 2 - 100,
    left: 0,
    right: 0,
    alignSelf: 'center',
    zIndex: 10
  };

  return (
    <View style={styles.container}>
      {/* Background Images with fade-in animation */}
      <Animated.Image
        source={require("../assets/images/Vector2.png")}
        style={[
          isLargeScreen ? styles.backgroundImageLarge : styles.backgroundImageSmall,
          { opacity: contentOpacity },
        ]}
        resizeMode="cover"
      />

      <Animated.Image
        source={require("../assets/images/Vector3.png")}
        style={[
          isLargeScreen ? styles.backgroundImageRightLarge : styles.backgroundImageRightSmall,
          { opacity: contentOpacity },
        ]}
        resizeMode="cover"
      />

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Logo Section */}
        <Animated.Image
          source={require("../assets/images/Logo_Background.png")}
          style={[
            isLargeScreen ? styles.logoLarge : styles.logoSmall,
            ...(logoPosition.interpolate({
              inputRange: [0, 0.5],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }) as any) > 0.5 ? [initialLogoStyles as Animated.WithAnimatedObject<ImageStyle>] : [],
            { transform: logoTransform },
          ]}
          resizeMode="contain"
        />

        {/* Show Registration Form or Login Form based on state */}
        {showRegistration ? (
          // Registration Form
          <ScrollView 
            contentContainerStyle={{ alignItems: 'center' }}
            style={{ width: '100%' }}
          >
            <Animated.View 
              style={{ 
                opacity: contentOpacity, 
                transform: [{ translateY: inputsTranslateY }],
                width: "100%",
                alignItems: "center",
                paddingHorizontal: 20
              }}
            >
              <Text style={styles.registrationTitle}>Complete Registration</Text>
              <Text style={styles.registrationSubtitle}>
                Enter the activation key you received by email and create your account
              </Text>

              {/* Activation Key Input */}
              <View style={[isLargeScreen ? styles.inputContainerLarge : styles.inputContainerSmall]}>
                <Image
                  source={require("../assets/images/locked-computer.png")}
                  style={[isLargeScreen ? styles.image_inputLarge : styles.image_inputSmall]}
                  resizeMode="contain"
                />
                <TextInput
                  placeholder="Activation Key"
                  style={[isLargeScreen ? styles.inputTextLarge : styles.inputTextSmall]}
                  placeholderTextColor="#555"
                  value={activationKey}
                  onChangeText={setActivationKey}
                  autoCapitalize="none"
                />
              </View>

              {/* Username Input */}
              <View style={[isLargeScreen ? styles.inputContainerLarge : styles.inputContainerSmall]}>
                <Image
                  source={require("../assets/images/user.png")}
                  style={[isLargeScreen ? styles.image_inputLarge : styles.image_inputSmall]}
                  resizeMode="contain"
                />
                <TextInput
                  placeholder="Username"
                  style={[isLargeScreen ? styles.inputTextLarge : styles.inputTextSmall]}
                  placeholderTextColor="#555"
                  value={registerUsername}
                  onChangeText={setRegisterUsername}
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <View style={[isLargeScreen ? styles.inputContainerLarge : styles.inputContainerSmall]}>
                <Image
                  source={require("../assets/images/locked-computer.png")}
                  style={[isLargeScreen ? styles.image_inputLarge : styles.image_inputSmall]}
                  resizeMode="contain"
                />
                <TextInput
                  placeholder="Password"
                  secureTextEntry
                  style={[isLargeScreen ? styles.inputTextLarge : styles.inputTextSmall]}
                  placeholderTextColor="#555"
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  autoCapitalize="none"
                />
              </View>

              {/* Confirm Password Input */}
              <View style={[isLargeScreen ? styles.inputContainerLarge : styles.inputContainerSmall]}>
                <Image
                  source={require("../assets/images/locked-computer.png")}
                  style={[isLargeScreen ? styles.image_inputLarge : styles.image_inputSmall]}
                  resizeMode="contain"
                />
                <TextInput
                  placeholder="Confirm Password"
                  secureTextEntry
                  style={[isLargeScreen ? styles.inputTextLarge : styles.inputTextSmall]}
                  placeholderTextColor="#555"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => setShowRegistration(false)}
                  style={[
                    isLargeScreen ? styles.secondaryButtonLarge : styles.secondaryButtonSmall,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={completeRegistration}
                  style={[
                    isLargeScreen ? styles.loginButtonLargeRegister : styles.loginButtonSmallRegister,
                    { marginLeft: 10,}
                  ]}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[isLargeScreen ? styles.loginTextLargeRegister : styles.loginTextSmallRegister]}>
                      Register
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              
              <Text style={styles.helpText}>
                If you don't have an activation key, use the "Register New Device" button
                on the login screen to request one.
              </Text>
            </Animated.View>
          </ScrollView>
        ) : (
          // Login Form
          <>
            <Animated.View 
              style={{ 
                opacity: contentOpacity, 
                transform: [{ translateY: inputsTranslateY }],
                width: "100%",
                alignItems: "center"
              }}
            >
              {/* Username Input */}
              <View
                style={[
                  isLargeScreen ? styles.inputContainerLarge : styles.inputContainerSmall,
                ]}
              >
                <Image
                  source={require("../assets/images/user.png")}
                  style={[
                    isLargeScreen ? styles.image_inputLarge : styles.image_inputSmall
                  ]}
                  resizeMode="contain"
                />
                <TextInput
                  placeholder="Username"
                  style={[
                    isLargeScreen ? styles.inputTextLarge : styles.inputTextSmall
                  ]}
                  placeholderTextColor="#555"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <View
                style={[
                  isLargeScreen ? styles.inputContainerLarge : styles.inputContainerSmall,
                ]}
              >
                <Image
                  source={require("../assets/images/locked-computer.png")}
                  style={[
                    isLargeScreen ? styles.image_inputLarge : styles.image_inputSmall
                  ]}
                  resizeMode="contain"
                />
                <TextInput
                  placeholder="Password"
                  secureTextEntry
                  style={[
                    isLargeScreen ? styles.inputTextLarge : styles.inputTextSmall
                  ]}
                  placeholderTextColor="#555"
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
              </View>
            </Animated.View>

            {/* Login and Register Buttons */}
            <Animated.View 
              style={{ 
                opacity: contentOpacity, 
                transform: [{ translateY: buttonTranslateY }],
                width: "100%",
                alignItems: "center"
              }}
            >
              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                style={[
                  isLargeScreen ? styles.loginButtonLarge : styles.loginButtonSmall,
                ]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      isLargeScreen ? styles.loginTextLarge : styles.loginTextSmall,
                    ]}
                  >
                    Log In
                  </Text>
                )}
              </TouchableOpacity>
              
              {/* Register Device Button */}
              <TouchableOpacity
                onPress={initiateRegistration}
                style={[
                  isLargeScreen ? styles.registerButtonLarge : styles.registerButtonSmall,
                ]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      isLargeScreen ? styles.registerTextLarge : styles.registerTextSmall,
                    ]}
                  >
                    Register New Device
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            
            {/* Default user credentials */}
            {/* <Animated.View style={[
              styles.defaultUserContainer, 
              { opacity: contentOpacity },
              !isLargeScreen && styles.defaultUserContainerSmall
            ]}>
              <Text style={[
                isLargeScreen ? styles.defaultUserTextLarge : styles.defaultUserTextSmall
              ]}>Default User:</Text>
              <Text style={[
                isLargeScreen ? styles.defaultUserTextLarge : styles.defaultUserTextSmall
              ]}>Username: Luis</Text>
              <Text style={[
                isLargeScreen ? styles.defaultUserTextLarge : styles.defaultUserTextSmall
              ]}>Password: 123</Text>
              <Text style={[
                isLargeScreen ? styles.defaultUserTextLarge : styles.defaultUserTextSmall
              ]}>Width: {width} ~ Height: {height}</Text>
            </Animated.View> */}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    backgroundColor: "#F1F3F5",
  },
  // Background images - large variants
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
  // Background images - small variants
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
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    zIndex: 1,
  },
  // Logo styles
  logoLarge: {
    alignSelf: "center",
    width: "30%",
    height: "40%",
    position: "relative",
    bottom: -40,
  },
  logoSmall: {
    alignSelf: "center",
    width: "25%",
    height: "40%",
    position: "relative",
    bottom: -20,
  },
  // Input container styles
  inputContainerLarge: {
    backgroundColor: "#D9D9D9",
    borderRadius: 8,
    paddingHorizontal: 30,
    paddingVertical: 10,
    marginBottom: 20,
    width: "30%",
    position: "relative",
    alignSelf: "center",
  },
  inputContainerSmall: {
    backgroundColor: "#D9D9D9",
    borderRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 10,
    width: "40%",
    position: "relative",
    alignSelf: "center",
  },
  // Input icon styles
  image_inputLarge: {
    position: "absolute",
    top: 5,
    left: 10,
    width: 30,
    height: 30,
  },
  image_inputSmall: {
    position: "absolute",
    top: 15,
    left: 7,
    width: 20,
    height: 20,
  },
  // Input text styles
  inputTextLarge: {
    paddingLeft: 25,
    fontSize: 16,
  },
  inputTextSmall: {
    paddingLeft: 20,
    fontSize: 14,
  },
  // Login button styles
  loginButtonLarge: {
    backgroundColor: "#004aad",
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    width: "30%",
    alignSelf: "center",
    marginTop: 10,
  },
  loginButtonLargeRegister: {
    backgroundColor: "#004aad",
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    width: "30%",
    alignSelf: "center",
  },
  loginButtonSmallRegister: {
    backgroundColor: "#004aad",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    width: "34%",
    alignSelf: "center",
  },

  loginButtonSmall: {
    backgroundColor: "#004aad",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    width: "34%",
    alignSelf: "center",
    marginTop: 8,
  },
  // Login text styles
  loginTextLarge: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 30,
  },

  loginTextLargeRegister: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 28,
  },

  loginTextSmallRegister: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },

  loginTextSmall: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 23,
  },
  
  // Default user container styles
  defaultUserContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  defaultUserContainerSmall: {
    marginTop: 10,
  },
  // Default user text styles
  defaultUserTextLarge: {
    fontSize: 14,
    color: "#555",
  },
  defaultUserTextSmall: {
    fontSize: 12,
    color: "#555",
  },
  // New styles for registration
  registrationTitle: {
    fontSize: width >= 1000 && height >= 700 ? 28 : 22,
    fontWeight: "bold",
    color: "#004aad",
    marginBottom: 10,
    textAlign: "center"
  },
  registrationSubtitle: {
    fontSize: width >= 1000 && height >= 700 ? 16 : 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    maxWidth: "80%"
  },
  registerButtonLarge: {
    backgroundColor: "#2E8B57", // Dark Green
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    width: "30%",
    alignSelf: "center",
    marginTop: 10,
  },
  registerButtonSmall: {
    backgroundColor: "#2E8B57", // Dark Green
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    width: "34%",
    alignSelf: "center",
    marginTop: 8,
  },
  registerTextLarge: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 24,
  },
  registerTextSmall: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10
  },
  secondaryButtonLarge: {
    backgroundColor: "#888",
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    width: "15%",
  },
  secondaryButtonSmall: {
    backgroundColor: "#888",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    width: "17%",
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: width >= 1000 && height >= 700 ? 30 : 23,
  },
  helpText: {
    marginTop: 20,
    fontSize: width >= 1000 && height >= 700 ? 14 : 12,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 20
  }
});