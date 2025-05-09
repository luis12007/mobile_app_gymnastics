import React, { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
const CURRENT_USER_KEY = "currentUser";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  ImageStyle,
} from "react-native";
import { useRouter } from "expo-router";

import { insertUser, validateUser } from "../Database/database";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  // Use simpler ternary operators for device size detection
  const isLargeScreen = width >= 1000 && height >= 700;
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Animation values
  const logoScale = useRef(new Animated.Value(2)).current;
  const logoPosition = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const inputsTranslateY = useRef(new Animated.Value(50)).current;
  const buttonTranslateY = useRef(new Animated.Value(50)).current;

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

    // Add a test user when the app starts
    const addTestUser = async () => {
      try {
        await insertUser("Luis", "123");
        console.log("Test user added (or already exists)");
      } catch (error) {
        console.error("Error adding test user:", error);
      }
    };
    
    addTestUser();
  }, []);

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
        router.push('/select-sex');
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

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Username and password cannot be empty");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await insertUser(username.trim(), password.trim());
      if (success) {
        Alert.alert("User Registered", "You can now log in.");
      } else {
        Alert.alert("Registration Failed", "User already exists or registration failed.");
      }
    } catch (error) {
      console.error("Error registering:", error);
      Alert.alert("Error", "Failed to register");
    } finally {
      setIsLoading(false);
    }
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
      {/* Background Images with fade-in animation - using ternary operator for sizes */}
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
        {/* Logo Section with scale and position animation */}
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

        {/* Form elements with fade and slide animation */}
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

        {/* Login Button with slide animation */}
        <Animated.View 
          style={{ 
            opacity: contentOpacity, 
            transform: [{ translateY: buttonTranslateY }],
            width: "100%",
            alignItems: "center"
          }}
        >
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
        </Animated.View>
        
        {/* Default user credentials with fade animation */}
        <Animated.View style={[
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
        </Animated.View>
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
  loginButtonSmall: {
    backgroundColor: "#004aad",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    width: "34%"
    ,
    alignSelf: "center",
    marginTop: 8,
  },
  // Login text styles
  loginTextLarge: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 30,
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
});