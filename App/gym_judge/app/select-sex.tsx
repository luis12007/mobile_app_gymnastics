import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function SelectSex() {
  // Use simpler ternary operators for device size detection
  const isLargeScreen = width >= 1000 && height >= 700;
  const router = useRouter();

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

  useEffect(() => {
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
      ]),
    ]).start();

    // Animate title from top to position
    Animated.timing(titleTranslateY, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.2)),
    }).start();
  }, []);

  const handleSelect = (discipline: boolean) => {
    router.push(`/main-menu?discipline=${discipline}`); // Pass the value as a query parameter
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
});