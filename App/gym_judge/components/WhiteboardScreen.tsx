import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  GestureResponderEvent,
  NativeSyntheticEvent,
  NativeTouchEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Svg, { Path } from "react-native-svg";

const { width, height } = Dimensions.get("window");
const isLargeDevice = width >= 1368 && height >= 1025;
const isSmallDevice = width < 1367 && width >= 945;
const isTinyDevice = width < 949;



// Available colors for drawing
const COLORS = ["black", "red", "blue", "green", "orange", "purple"];
// Available stroke widths
const STROKE_WIDTHS = [2, 5, 10, 15];

// Define interface for path data
interface PathData {
  path: string;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
}

export default function WhiteboardScreen() {
  // Store all completed paths with their properties
  const [paths, setPaths] = useState<PathData[]>([]);
  
  // Store the current drawing path
  const [currentPath, setCurrentPath] = useState<string>("");
  // Track if we're currently drawing
  const [drawing, setDrawing] = useState<boolean>(false);
  
  // Selected color, stroke width, and eraser mode
  const [selectedColor, setSelectedColor] = useState<string>("black");
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState<number>(3);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  
  // Menu state
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  
  // Ref to track if we're handling a drawing gesture
  const isDrawingRef = useRef<boolean>(false);
  // Ref to the menu scroll view
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Entrance animations
  const canvasScaleAnim = useRef(new Animated.Value(0.9)).current;
  const canvasOpacityAnim = useRef(new Animated.Value(0)).current;
  const menuButtonAnim = useRef(new Animated.Value(-60)).current;
  const bottomButtonsAnim = useRef(new Animated.Value(60)).current;
  
  // Run entrance animations when component mounts
  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // First fade in and scale the canvas
      Animated.parallel([
        Animated.timing(canvasOpacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad)
        }),
        Animated.timing(canvasScaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        })
      ]),
      
      // Then bring in the menu button from the left
      Animated.timing(menuButtonAnim, {
        toValue: 10,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      
      // Finally, bring in the bottom buttons from the bottom
      Animated.timing(bottomButtonsAnim, {
        toValue: 10,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      })
    ]).start();
  }, []);
  
  // Toggle menu open/closed with animation
  const toggleMenu = () => {
    const toValue = menuOpen ? 0 : 1;
    Animated.timing(menuAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setMenuOpen(!menuOpen);
  };
  
  // Create a "press" handler for the whole menu area
  const handleMenuAreaPress = (event: GestureResponderEvent) => {
    // Prevent drawing when clicking in the menu area
    event.stopPropagation();
    return true;
  };
  
  // Disable drawing on bottom buttons area
  const isInBottomButtonsArea = (y: number) => {
    // Get the canvas height based on device size
    let canvasHeight = height * 0.49; // Large device
    if (isSmallDevice) canvasHeight = height * 0.58;
    if (isTinyDevice) canvasHeight = height * 0.9;
    
    return y > canvasHeight - 60;
  };
  
  // Handle starting a new path
  const onTouchStart = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    
    // Skip if touching the menu button area
    if (locationX < 60 && locationY < 60) {
      return false;
    }
    
    // Skip if touching the menu area when open
    if (menuOpen && locationX < 280 && locationY < 370) {
      return false;
    }
    
    // Skip if touching the bottom buttons
    if (isInBottomButtonsArea(locationY)) {
      return false;
    }
    
    setCurrentPath(`M${locationX} ${locationY}`);
    setDrawing(true);
    isDrawingRef.current = true;
    return true;
  };

  // Continue the current path
  const onTouchMove = (e: GestureResponderEvent) => {
    if (!drawing) return true;
    
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath(prev => `${prev} L${locationX} ${locationY}`);
    return true;
  };

  // Finish the current path and add it to completed paths
  const onTouchEnd = () => {
    if (drawing && currentPath) {
      // Add current path to paths array with current settings
      setPaths(prev => [
        ...prev, 
        {
          path: currentPath,
          color: selectedColor,
          strokeWidth: selectedStrokeWidth,
          isEraser: isEraser
        }
      ]);
      // Reset current path
      setCurrentPath("");
      setDrawing(false);
      isDrawingRef.current = false;
    }
  };

  // For iOS, we need to prevent scroll during drawing
  const preventScroll = (e: NativeSyntheticEvent<NativeTouchEvent>) => {
    const { locationX, locationY } = e.nativeEvent;
    
    // Allow scrolling in the menu area
    if (menuOpen && locationX < 280 && locationY > 60 && locationY < 370) {
      return false;
    }
    
    if (isDrawingRef.current) {
      // This prevents the parent ScrollView from scrolling
      e.stopPropagation();
      return true;
    }
    return false;
  };

  // Clear the canvas
  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath("");
    setDrawing(false);
    isDrawingRef.current = false;
  };

  // Toggle eraser mode
  const toggleEraser = () => {
    setIsEraser(!isEraser);
  };

  // Compute menu height for animation
  const menuHeight = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300], // Increased height for better scrolling
  });
  
  // Determine which canvas style to use
  const baseCanvasStyle = isLargeDevice 
    ? styles.canvas 
    : isSmallDevice 
      ? styles.canvasSmall 
      : styles.canvasTiny;
      
  // Apply animations to the canvas style
  const animatedCanvasStyle = {
    ...baseCanvasStyle,
    opacity: canvasOpacityAnim,
    transform: [{ scale: canvasScaleAnim }]
  };
  
  return (
    <View 
      style={styles.container}
      // iOS-specific props to prevent scrolling
      {...(Platform.OS === 'ios' ? {
        onTouchStart: preventScroll,
        onTouchMove: preventScroll,
        onTouchEnd: preventScroll,
      } : {})}
    >
      {/* Whiteboard canvas with buttons */}
      <Animated.View 
        style={animatedCanvasStyle}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={onTouchStart}
        onResponderMove={onTouchMove}
        onResponderRelease={onTouchEnd}
        onResponderTerminate={onTouchEnd}
        pointerEvents="box-none"
      >
        {/* SVG layer for drawing - positioned below the buttons */}
        <Svg style={styles.svgLayer} height="100%" width="100%">
          {/* Render all completed paths */}
          {paths.map((pathData, index) => (
            <Path
              key={`path-${index}`}
              d={pathData.path}
              stroke={pathData.isEraser ? "#e0e0e0" : pathData.color}
              strokeWidth={pathData.strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          ))}
          
          {/* Render current path being drawn */}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={isEraser ? "#e0e0e0" : selectedColor}
              strokeWidth={selectedStrokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          ) : null}
        </Svg>
        
        {/* Menu button in top left with animation */}
        <Animated.View style={[
          styles.menuButtonContainer,
          { transform: [{ translateX: menuButtonAnim }] }
        ]}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={toggleMenu}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* The menu itself */}
        <Animated.View 
          style={[
            styles.menuContainer, 
            { height: menuHeight, opacity: menuAnimation }
          ]}
          pointerEvents={menuOpen ? "auto" : "none"}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.menuScroll} 
            contentContainerStyle={styles.menuScrollContent}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="always"
            // Critical for making empty areas scrollable
            directionalLockEnabled={true}
            alwaysBounceVertical={true}
            // Block touch events from reaching the canvas
            onTouchStart={(e: GestureResponderEvent) => {
              e.stopPropagation();
              return true;
            }}
            // Ensure the scroll view captures all touch events
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
          >
            {/* First Row: Colors and Stroke Width */}
            <View style={styles.menuRow}>
              {/* Color selector */}
              <View style={styles.controlsSection}>
                <Text style={styles.sectionTitle}>Colors:</Text>
                <View style={styles.colorRow}>
                  {COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && !isEraser && styles.selectedOption
                      ]}
                      onPress={() => {
                        setSelectedColor(color);
                        setIsEraser(false);
                      }}
                    />
                  ))}
                </View>
              </View>
              
              {/* Stroke width selector */}
              <View style={styles.controlsSection}>
                <Text style={styles.sectionTitle}>Size:</Text>
                <View style={styles.widthRow}>
                  {STROKE_WIDTHS.map(width => (
                    <TouchableOpacity
                      key={`width-${width}`}
                      style={[
                        styles.widthOption,
                        selectedStrokeWidth === width && styles.selectedOption
                      ]}
                      onPress={() => setSelectedStrokeWidth(width)}
                    >
                      <View style={[
                        styles.widthCircle, 
                        { 
                          width, 
                          height: width, 
                          borderRadius: width / 2,
                          backgroundColor: isEraser ? "#ccc" : selectedColor 
                        }
                      ]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            {/* Second Row: Eraser and Clear Board */}
            <View style={styles.menuRow}>
              {/* Eraser button */}
              <View style={styles.controlsSection}>
                <Text style={styles.sectionTitle}>Tool:</Text>
                <TouchableOpacity
                  style={[
                    styles.toolOption,
                    isEraser && styles.selectedOption
                  ]}
                  onPress={toggleEraser}
                >
                  <Text style={styles.toolOptionText}>Eraser</Text>
                </TouchableOpacity>
              </View>
              
              {/* Clear button */}
              <View style={styles.controlsSection}>
                <Text style={styles.sectionTitle}>Actions:</Text>
                <TouchableOpacity onPress={clearCanvas} style={styles.clearButton}>
                  <Text style={styles.buttonText}>CLEAR BOARD</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Extra empty space to make scrolling more obvious */}
            <View style={{ height: 120 }} />
          </ScrollView>
        </Animated.View>
        
        {/* Fixed buttons at the bottom with animation */}
        <Animated.View style={[
          styles.bottomButtonsContainer,
          { transform: [{ translateY: bottomButtonsAnim }] }
        ]}>
          <TouchableOpacity style={styles.tableButton}>
            <Text style={styles.buttonText}>CODE TABLE</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.stickButton}>
            <Text style={styles.buttonText}>STICK BONUS</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderColor: "#000",
    // Disable touch scrolling in iOS
    ...(Platform.OS === 'ios' ? {
      position: 'relative',
      zIndex: 1,
    } : {}),
  },
  canvas: {
    width: "100%",
    height: height * 0.49, // Adjust height as needed
    backgroundColor: "#e0e0e0",
    overflow: "hidden", // Critical for preventing scrolling
    // Extra styles for iOS scroll prevention
    ...(Platform.OS === 'ios' ? {
      position: 'relative',
      zIndex: 3, // Higher zIndex to capture touches
    } : {}),
  },
  canvasSmall: {
    width: "100%",
    height: height * 0.61, // Adjust height as needed
    backgroundColor: "#e0e0e0",
    overflow: "hidden", // Critical for preventing scrolling
    // Extra styles for iOS scroll prevention
    ...(Platform.OS === 'ios' ? {
      position: 'relative',
      zIndex: 4, // Higher zIndex to capture touches
    } : {}),
  },
  canvasTiny: {
    width: "100%",
    height: height * 0.9, // Adjust height as needed
    backgroundColor: "#e0e0e0",
    overflow: "hidden", // Critical for preventing scrolling
    // Extra styles for iOS scroll prevention
    ...(Platform.OS === 'ios' ? {
      position: 'relative',
      zIndex: 5, // Higher zIndex to capture touches
    } : {}),
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  menuButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 0, // Left position will be animated
    zIndex: 3,
  },
  menuButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuContainer: {
    position: 'absolute',
    top: 70, // Below the menu button
    left: 10,
    width: 250,
    maxHeight: 240, // Set a maximum height
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderRadius: 10,
    zIndex: 3,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuScroll: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  menuScrollContent: {
    padding: 10,
    paddingBottom: 30, // Extra padding at bottom to ensure scrollability
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  controlsSection: {
    flex: 1,
    marginHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  widthRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  colorOption: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    marginRight: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  toolOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  toolOptionText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  widthOption: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 5,
    marginBottom: 5,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  widthCircle: {
    backgroundColor: "black",
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: "#00a0ff",
  },
  clearButton: {
    backgroundColor: "#B4B4B4",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
    // Match the original button style
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 20, // Bottom position will be animated
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  tableButton: {
    flex: 0.15,
    backgroundColor: "#B4B4B4",
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
    alignItems: "center",
    // Match the original button style
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stickButton: {
    flex: 0.15,
    backgroundColor: "#B4B4B4",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    // Match the original button style
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
});