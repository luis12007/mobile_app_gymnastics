import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { getRateGeneralByTableId, updateRateGeneral } from "../Database/database";

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

// Available colors for drawing
const COLORS = ["black", "red", "blue", "green", "orange"];
// Available stroke widths
const STROKE_WIDTHS = [2, 5, 10, 15];

// Color for canvas background and eraser
const CANVAS_BACKGROUND = "rgb(224, 224, 224)";

// Key for AsyncStorage to store whiteboard settings
const WHITEBOARD_SETTINGS_KEY = 'WHITEBOARD_SETTINGS_DEFAULT';

// Default settings
const DEFAULT_SETTINGS = {
  selectedColor: "black",
  selectedStrokeWidth: 3,
  selectedPen: 0,
  isEraser: false
};

// Interface for path data
interface PathData {
  path: string;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
  penType?: number; // 0: Normal, 1: Telestrator, 2: Highlighter
}

// Interface for MainRateGeneral
interface MainRateGeneral {
  id: number;
  tableId: number;
  stickBonus: boolean;
  numberOfElements: number;
  difficultyValues: number;
  elementGroups1: number;
  elementGroups2: number;
  elementGroups3: number;
  elementGroups4: number;
  elementGroups5: number;
  execution: number;
  eScore: number;
  myScore: number;
  compD: number;
  compE: number;
  compSd: number;
  compNd: number;
  compScore: number;
  comments: string;
  paths: string; // This will store our serialized paths data
}

interface WhiteboardScreenProps {
  rateGeneralId?: number; // ID of the main rate general record
  tableId: number; // ID of the associated table
  setStickBonus?: Function; // Function to update the stick bonus state
  stickBonus?: boolean; // Current state of the stick bonus
  percentage?: number; // Current percentage value
  oncodetable?: () => void; // Optional callback for code table
  onSaveComplete?: () => void; // Optional callback when save is complete
}

const OptimizedWhiteboardDebug = ({ 
  rateGeneralId, 
  tableId, 
  stickBonus = false, 
  setStickBonus = () => {}, 
  percentage = 0,
  oncodetable,
  onSaveComplete,
}: WhiteboardScreenProps) => {
  // Drawing state
  const [paths, setPaths] = useState<PathData[]>([]);
  const [undoStack, setUndoStack] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [drawing, setDrawing] = useState<boolean>(false);
  
  // Loading and saving state
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Debug state
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [lastTouchInfo, setLastTouchInfo] = useState<any>({});
  const [touchSource, setTouchSource] = useState<string>('None');
  const [pointerTypeValue, setPointerTypeValue] = useState<string>('Unknown');
  
  // Variables para guardar el color y el grosor del trazo
  const [selectedColor, setSelectedColor] = useState(DEFAULT_SETTINGS.selectedColor);
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(DEFAULT_SETTINGS.selectedStrokeWidth);
  const [isEraser, setIsEraser] = useState(DEFAULT_SETTINGS.isEraser);
  const [selectedPen, setSelectedPen] = useState<number>(DEFAULT_SETTINGS.selectedPen);
  
  // Menu state
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const eraserButtonAnim = useRef(new Animated.Value(-60)).current;
  const penButtonAnim = useRef(new Animated.Value(-60)).current;
  
  // Entrance animations
  const menuButtonAnim = useRef(new Animated.Value(-60)).current;
  const undoButtonAnim = useRef(new Animated.Value(-60)).current;
  const redoButtonAnim = useRef(new Animated.Value(-60)).current;
  const bottomButtonsAnim = useRef(new Animated.Value(60)).current;
  
  // Refs for optimal performance
  const pathBufferRef = useRef<string>('');
  const lastPointRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const pointsBufferRef = useRef<Array<{x: number, y: number}>>([]);
  
  // Save timeout ref to handle debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Save status animation state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const saveStatusAnim = useRef(new Animated.Value(0)).current;
  const loadingRotateAnim = useRef(new Animated.Value(0)).current;
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar configuraciones desde AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem(WHITEBOARD_SETTINGS_KEY);
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          setSelectedColor(parsedSettings.selectedColor || DEFAULT_SETTINGS.selectedColor);
          setSelectedStrokeWidth(parsedSettings.selectedStrokeWidth || DEFAULT_SETTINGS.selectedStrokeWidth);
          setIsEraser(parsedSettings.isEraser || DEFAULT_SETTINGS.isEraser);
          setSelectedPen(parsedSettings.selectedPen || DEFAULT_SETTINGS.selectedPen);
        }
      } catch (error) {
        console.error("Error loading whiteboard settings:", error);
      }
    };
    loadSettings();
  }, []);

  // Guardar configuraciones en AsyncStorage
  useEffect(() => {
    const saveSettings = async () => {
      try {
        const settings = {
          selectedColor,
          selectedStrokeWidth,
          isEraser,
          selectedPen,
        };
        await AsyncStorage.setItem(WHITEBOARD_SETTINGS_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error("Error saving whiteboard settings:", error);
      }
    };
    saveSettings();
  }, [selectedColor, selectedStrokeWidth, isEraser, selectedPen]);
  
  // Load existing drawing data on component mount
  useEffect(() => {
    loadDrawingData();
    
    // Run entrance animations
    Animated.parallel([
      Animated.timing(menuButtonAnim, {
        toValue: 10,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      Animated.timing(undoButtonAnim, {
        toValue: 70,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      Animated.timing(redoButtonAnim, {
        toValue: 130,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      Animated.timing(eraserButtonAnim, {
        toValue: 190,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      Animated.timing(penButtonAnim, {
        toValue: 250,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      Animated.timing(bottomButtonsAnim, {
        toValue: 10,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      })
    ]).start();
  }, []);
  
  // Load existing drawing from the database
  const loadDrawingData = async () => {
    try {
      setLoading(true);
      
      if (tableId) {
        const rateGeneral = await getRateGeneralByTableId(tableId);
        console.log("Loaded rateGeneral:", rateGeneral);
        
        if (rateGeneral && rateGeneral.paths) {
          try {
            // Parse the stored paths data
            const parsedPaths = JSON.parse(rateGeneral.paths);
            if (Array.isArray(parsedPaths)) {
  // Ensure penType is set for all paths
  const fixedPaths = parsedPaths.map(p => ({
    ...p,
    penType: typeof p.penType === "number" ? p.penType : 0
  }));
  setPaths(fixedPaths);
}
            
            // Also load stick bonus state
            if (typeof rateGeneral.stickBonus === 'boolean') {
            }
          } catch (parseError) {
            console.error("Error parsing stored paths data:", parseError);
            // If there's an error parsing, just start with empty paths
            setPaths([]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading drawing data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Start loading animation
  const startLoadingAnimation = () => {
    setSaveStatus('loading');
    
    // Fade in the indicator
    Animated.timing(saveStatusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Start rotating animation for loading spinner
    const rotateAnimation = () => {
      loadingRotateAnim.setValue(0);
      Animated.timing(loadingRotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.linear,
      }).start(() => {
        if (saveStatus === 'loading') {
          rotateAnimation();
        }
      });
    };
    rotateAnimation();
  };
  
  // Show success animation
  const showSuccessAnimation = () => {
    setSaveStatus('success');
    
    // Clear any existing timeout
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }
    
    // Hide after 1 second
    saveStatusTimeoutRef.current = setTimeout(() => {
      Animated.timing(saveStatusAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setSaveStatus('idle');
      });
    }, 1000);
  };
  
  // Show error animation
  const showErrorAnimation = (errorMessage: string) => {
    setSaveStatus('error');
    
    // Show error alert
    Alert.alert(
      'Save Error',
      `Failed to save drawing: ${errorMessage}`,
      [{ text: 'OK' }]
    );
    
    // Clear any existing timeout
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }
    
    // Hide after 1 second
    saveStatusTimeoutRef.current = setTimeout(() => {
      Animated.timing(saveStatusAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setSaveStatus('idle');
      });
    }, 1000);
  };
  
  // Save drawing data to the database
  const saveDrawingData = async () => {
    try {
      startLoadingAnimation();
      
      if (tableId) {
        // Get current rate general data
        const rateGeneral = await getRateGeneralByTableId(tableId);
        
        if (rateGeneral) {
          // Make a deep copy of paths to ensure we're saving the most current data
          const currentPaths = [...paths];
          
          // Serialize paths data
          const serializedPaths = JSON.stringify(currentPaths);
          
          console.log("Saving paths count:", currentPaths.length);
          
          // Update the rateGeneral object with the new paths data and stick bonus
          const updatedRateGeneral: MainRateGeneral = {
            ...rateGeneral,
            paths: serializedPaths,
          };
          
          // Save to database
          await updateRateGeneral(rateGeneral.id, updatedRateGeneral);
          
          // Show success animation
          showSuccessAnimation();
          
          // Call the onSaveComplete callback if provided
          if (onSaveComplete) {
            onSaveComplete();
          }
        }
      }
    } catch (error) {
      console.error("Error saving drawing data:", error);
      showErrorAnimation(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };
  
  // Debounced save function to avoid too many database writes
  const debouncedSave = () => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set a new timeout to save after 500ms of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      // Log the current paths state before saving
      console.log("Debounced save triggered with paths count:", paths.length);
      saveDrawingData();
    }, 500);
  };
  
  // Track changes to paths and save when needed
  useEffect(() => {
  if (!loading) {
    debouncedSave();
  }
}, [paths]);
  
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
  
  // Handle undo with direct save
  const handleUndo = () => {
    if (paths.length > 0) {
      const lastPath = paths[paths.length - 1];
      
      // Update paths state and save
      setPaths(prev => {
        const newPaths = prev.slice(0, -1);
        
        // Force an immediate save to ensure it persists
        setTimeout(() => saveDrawingData(), 100);
        
        return newPaths;
      });
      
      // Add to undo stack
      setUndoStack(prev => [...prev, lastPath]);
    }
  };
  
  // Redo last undone path
  const handleRedo = () => {
    if (undoStack.length > 0) {
      // Get the last item from the undo stack
      const pathToRedo = undoStack[undoStack.length - 1];
      
      // Remove from undo stack first
      setUndoStack(prev => prev.slice(0, -1));
      
      // Add to paths and trigger a save
      setPaths(prev => {
        const newPaths = [...prev, pathToRedo];
        
        // Force an immediate save to ensure it persists
        setTimeout(() => saveDrawingData(), 100);
        
        return newPaths;
      });
    }
  };
  
  // Toggle eraser mode
  const toggleEraser = () => {
    if (!isEraser) {
      setSelectedPen(0);
    }
    setIsEraser(!isEraser);
  };
  
  // Clear the canvas
  const clearCanvas = () => {
    setPaths([]);
    setUndoStack([]);
    setCurrentPath('');
    pathBufferRef.current = '';
    pointsBufferRef.current = [];
    
    setTimeout(() => debouncedSave(), 0);
  };

  // Toggle stick bonus
  const toggleStickBonus = () => {
    setStickBonus(!stickBonus);
    setTimeout(() => debouncedSave(), 0);
  };
  
  // Toggle debug mode
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
    if (!debugMode) {
      console.log('Debug mode enabled - touch info will be logged to console');
    }
  };
  
  // Compute menu height for animation
  const menuHeight = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 270],
  });
  
  // Rotation interpolation for loading spinner
  const loadingRotation = loadingRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  // Optimization: Pre-save all points immediately to avoid missing any
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    // Optimize for performance
    .minDistance(0)
    .maxPointers(1)
    .onStart((event) => {
      // Skip if touching the menu button area
      if (event.x < 60 && event.y < 60) {
        return;
      }
      
      // Skip if touching the undo button area
      if (event.x > 60 && event.x < 120 && event.y < 60) {
        return;
      }
      
      // Skip if touching the redo button area
      if (event.x > 120 && event.x < 180 && event.y < 60) {
        return;
      }
      
      // Skip if touching the menu area when open
      if (menuOpen && event.x < 280 && event.y < 370) {
        return;
      }
      
      // Skip if touching the bottom button area
      if (event.x > width - 190 && event.y > height - 70) {
        return;
      }
      
      // Determine if it's a stylus
      const isPencil = 
        event.pointerType === 'pen' || 
        event.pointerType === 1 ||
        event.tool === 'pen' || 
        (event.iOS && event.iOS.force > 0) ||
        (event.pencilTouches && event.pencilTouches.length > 0);
      
      // Store the raw pointer type value and detection result for debugging
      if (debugMode) {
        console.log('Touch Start Properties:', JSON.stringify(event, null, 2));
        setLastTouchInfo(event);
        setPointerTypeValue(String(event.pointerType || 'undefined'));
        setTouchSource(isPencil ? 'Likely Stylus/Pen' : 'Likely Finger');
      }
      
      // --- CHANGE: On Android, allow drawing with any pointer type ---
      const allowDrawing = Platform.OS === 'android' ? true : isPencil;
      // --------------------------------------------------------------
      
      if (allowDrawing) {
        // Immediately save the starting point without waiting for validation
        const { x, y } = event;
        
        // Store the starting point for both immediate and delayed drawing
        lastPointRef.current = { x, y };
        pathBufferRef.current = `M${x} ${y}`;
        pointsBufferRef.current = [{ x, y }];
        
        // Also update the visible path
        setCurrentPath(`M${x} ${y}`);
        setDrawing(true);
        
        // Clear undo stack when starting a new drawing
        if (undoStack.length > 0) {
          setUndoStack([]);
        }
      } else {
        // Not a pen - don't draw, but update debug info
        // Reset any potential drawing state
        setDrawing(false);
        setCurrentPath('');
        pathBufferRef.current = '';
        pointsBufferRef.current = [];
      }
    })
    .onUpdate((event) => {
      // Only process updates if we're in drawing mode (which only happens with pen)
      if (!drawing) return;
      
      // Immediately capture all points, even if not all render
      const { x, y } = event;
      
      // Store points for buffer to ensure we don't miss any
      pointsBufferRef.current.push({ x, y });
      
      // Calculate distance to optimize performance by skipping tiny movements
      const lastPoint = lastPointRef.current;
      const distance = Math.sqrt(
        Math.pow(x - lastPoint.x, 2) + 
        Math.pow(y - lastPoint.y, 2)
      );
      
      // Only update on significant movements (reduces excessive updates)
      // This threshold can be adjusted - lower means more precision but more updates
      if (distance > 0) {
        // Update last point reference
        lastPointRef.current = { x, y };
        
        // Update buffer path
        pathBufferRef.current += ` L${x} ${y}`;
        
        // Update visible path with a slight delay
        setCurrentPath(pathBufferRef.current);
      }
      
      // Debug info - update even if not drawing
      if (debugMode) {
        setLastTouchInfo(event);
      }
    })
    .onEnd((event) => {
      // Capture all missed points before finishing
      if (drawing) {
        // Create the final path by processing all buffered points
        let finalPath = '';
        
        // Only proceed if we have at least 2 points
        if (pointsBufferRef.current.length > 1) {
          // Start with the first point
          const firstPoint = pointsBufferRef.current[0];
          finalPath = `M${firstPoint.x} ${firstPoint.y}`;
          
          // Add all subsequent points as lines
          for (let i = 1; i < pointsBufferRef.current.length; i++) {
            const point = pointsBufferRef.current[i];
            finalPath += ` L${point.x} ${point.y}`;
          }
          
          // For highlighter pen (type 2), automatically close the path
          if (selectedPen === 2) {
            // Close back to the first point to create a fillable shape
            finalPath += ` Z`;
          }
          
          // Add the final path to paths array if it has actual content
          setPaths(prev => {
            const newPaths = [...prev, { 
              path: finalPath, 
              color: selectedPen === 1 ? "red" : selectedPen === 2 ? "yellow" : selectedColor, // Force colors for special pens
              strokeWidth: selectedPen === 1 ? 2 : selectedStrokeWidth, // Force thin stroke for telestrator
              isEraser: isEraser,
              penType: selectedPen
            }];
            
            // Force an immediate save instead of debouncing
            setTimeout(() => saveDrawingData(), 100);
            
            return newPaths;
          });
        }
        
        // Reset state
        setCurrentPath('');
        pathBufferRef.current = '';
        pointsBufferRef.current = [];
        setDrawing(false);
        
        // Final debug info
        if (debugMode) {
          console.log('Touch End Properties:', JSON.stringify(event, null, 2));
          setLastTouchInfo({...event, endType: 'End'});
        }
      }
    });
  
    // Only for web
const [webDrawing, setWebDrawing] = useState(false);

const handleWebTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
  if (Platform.OS !== 'web') return;
  let x, y;
  if ('touches' in e && e.touches.length > 0) {
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
  } else if ('clientX' in e) {
    x = e.clientX;
    y = e.clientY;
  }
    lastPointRef.current = { x, y };
    pathBufferRef.current = `M${x} ${y}`;
    pointsBufferRef.current = [{ x, y }];
    setCurrentPath(`M${x} ${y}`);
    setWebDrawing(true);
};

const handleWebTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
  if (Platform.OS !== 'web' || !webDrawing) return;
  let x, y;
  if ('touches' in e && e.touches.length > 0) {
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
  } else if ('clientX' in e) {
    x = e.clientX;
    y = e.clientY;
  }
    pointsBufferRef.current.push({ x, y });
    pathBufferRef.current += ` L${x} ${y}`;
    setCurrentPath(pathBufferRef.current);
};

const handleWebTouchEnd = () => {
  if (Platform.OS !== 'web' || !webDrawing) return;
  if (pointsBufferRef.current.length > 1) {
    const firstPoint = pointsBufferRef.current[0];
    let finalPath = `M${firstPoint.x} ${firstPoint.y}`;
    for (let i = 1; i < pointsBufferRef.current.length; i++) {
      const point = pointsBufferRef.current[i];
      finalPath += ` L${point.x} ${point.y}`;
    }
    setPaths(prev => [
      ...prev,
      {
        path: finalPath,
        color: selectedPen === 1 ? "red" : selectedPen === 2 ? "yellow" : selectedColor,
        strokeWidth: selectedPen === 1 ? 2 : selectedStrokeWidth,
        isEraser: isEraser,
        penType: selectedPen,
      },
    ]);
  }
  setCurrentPath('');
  pathBufferRef.current = '';
  pointsBufferRef.current = [];
  setWebDrawing(false);
};
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Drawing canvas */}
      <GestureDetector gesture={panGesture}>
        <View 
        style={[
          isLargeDevice ? styles.canvasLarge : null,
          isMediumLargeDevice ? styles.canvasMediumLarge : null,
          isSmallDevice ? styles.canvasSmall : null,
          isTinyDevice ? styles.canvasTiny : null,
        ]}
        onTouchStart={Platform.OS === 'web' || Platform.OS === 'android' ? handleWebTouchStart : undefined}
        onTouchMove={Platform.OS === 'web' || Platform.OS === 'android' ? handleWebTouchMove : undefined}
        onTouchEnd={Platform.OS === 'web' || Platform.OS === 'android' ? handleWebTouchEnd : undefined}
        onMouseDown={Platform.OS === 'web' || Platform.OS === 'android' ? handleWebTouchStart : undefined}
        onMouseMove={Platform.OS === 'web' || Platform.OS === 'android' ? handleWebTouchMove : undefined}
        onMouseUp={Platform.OS === 'web' || Platform.OS === 'android' ? handleWebTouchEnd : undefined}
        >
          {/* Background image - outside SVG to stay on top */}
          <Image
            source={require('../assets/images/Jump.png')}
            style={[
              isLargeDevice ? styles.backgroundImageLarge : null,
              isMediumLargeDevice ? styles.backgroundImageMediumLarge : null,
              isSmallDevice ? styles.backgroundImageSmall : null,
              isTinyDevice ? styles.backgroundImageTiny : null,
            ]}
            resizeMode="contain"
            pointerEvents="none"
          />
          <Svg height="100%" width="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            {/* Normal pen paths (type 0) */}
            {paths
              .filter(pathData => pathData.penType === 0)
              .map((pathData, index) => (
                <Path
                  key={`normal-path-${index}`}
                  d={pathData.path}
                  stroke={pathData.isEraser ? CANVAS_BACKGROUND : pathData.color}
                  strokeWidth={pathData.isEraser ? pathData.strokeWidth * 3 : pathData.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
            ))}

            {/* Telestrator paths (type 1) */}
            {paths
              .filter(pathData => pathData.penType === 1)
              .map((pathData, index) => (
                <Path
                  key={`telestrator-path-${index}`}
                  d={pathData.path}
                  stroke={pathData.isEraser ? CANVAS_BACKGROUND : "red"}
                  strokeWidth={pathData.isEraser ? 6 : 2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
            ))}

            {/* Highlighter paths (type 2) - renders as filled areas */}
            {paths
              .filter(pathData => pathData.penType === 2)
              .map((pathData, index) => {
                let fillPath = pathData.path;
                
                if (fillPath && fillPath.length > 0) {
                  if (!fillPath.endsWith('Z')) {
                    fillPath += ' Z';
                  }
                }
                
                return (
                  <Path
                    key={`highlighter-path-${index}`}
                    d={fillPath}
                    stroke={pathData.isEraser ? CANVAS_BACKGROUND : "yellow"}
                    strokeWidth={pathData.isEraser ? 3 : 1}
                    fill={pathData.isEraser ? CANVAS_BACKGROUND : "yellow"}
                    fillOpacity={0.3}
                    strokeOpacity={0.5}
                  />
                );
            })}
            
            {/* Render current path */}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={isEraser ? CANVAS_BACKGROUND : (
                  selectedPen === 1 ? "red" : 
                  selectedPen === 2 ? "yellow" : 
                  selectedColor
                )}
                strokeWidth={isEraser ? (selectedPen === 1 ? 6 : selectedStrokeWidth * 3) : (selectedPen === 1 ? 2 : selectedStrokeWidth)}
                fill={selectedPen === 2 && !isEraser ? "yellow" : "none"}
                fillOpacity={selectedPen === 2 && !isEraser ? 0.3 : 0}
                strokeOpacity={selectedPen === 1 ? 0.8 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>
      </GestureDetector>

      {/* Menu button in top left with animation */}
      <Animated.View style={[
        isLargeDevice ? styles.menuButtonContainerLarge : null,
        isMediumLargeDevice ? styles.menuButtonContainerMediumLarge : null,
        isSmallDevice ? styles.menuButtonContainerSmall : null,
        isTinyDevice ? styles.menuButtonContainerTiny : null,
        { transform: [{ translateX: menuButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            isLargeDevice ? styles.menuButtonLarge : null,
            isMediumLargeDevice ? styles.menuButtonMediumLarge : null,
            isSmallDevice ? styles.menuButtonSmall : null,
            isTinyDevice ? styles.menuButtonTiny : null,
          ]}
          onPress={toggleMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[
            isLargeDevice ? styles.menuButtonTextLarge : null,
            isMediumLargeDevice ? styles.menuButtonTextMediumLarge : null,
            isSmallDevice ? styles.menuButtonTextSmall : null,
            isTinyDevice ? styles.menuButtonTextTiny : null,
          ]}>☰</Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Undo button next to menu button */}
      <Animated.View style={[
        isLargeDevice ? styles.undoButtonContainerLarge : null,
        isMediumLargeDevice ? styles.undoButtonContainerMediumLarge : null,
        isSmallDevice ? styles.undoButtonContainerSmall : null,
        isTinyDevice ? styles.undoButtonContainerTiny : null,
        { transform: [{ translateX: undoButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            isLargeDevice ? styles.undoButtonLarge : null,
            isMediumLargeDevice ? styles.undoButtonMediumLarge : null,
            isSmallDevice ? styles.undoButtonSmall : null,
            isTinyDevice ? styles.undoButtonTiny : null,
            paths.length === 0 && styles.disabledButton
          ]}
          onPress={handleUndo}
          disabled={paths.length === 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[
            isLargeDevice ? styles.undoButtonTextLarge : null,
            isMediumLargeDevice ? styles.undoButtonTextMediumLarge : null,
            isSmallDevice ? styles.undoButtonTextSmall : null,
            isTinyDevice ? styles.undoButtonTextTiny : null,
          ]}>↩</Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Redo button next to undo button */}
      <Animated.View style={[
        isLargeDevice ? styles.redoButtonContainerLarge : null,
        isMediumLargeDevice ? styles.redoButtonContainerMediumLarge : null,
        isSmallDevice ? styles.redoButtonContainerSmall : null,
        isTinyDevice ? styles.redoButtonContainerTiny : null,
        { transform: [{ translateX: redoButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            isLargeDevice ? styles.redoButtonLarge : null,
            isMediumLargeDevice ? styles.redoButtonMediumLarge : null,
            isSmallDevice ? styles.redoButtonSmall : null,
            isTinyDevice ? styles.redoButtonTiny : null,
            undoStack.length === 0 && styles.disabledButton
          ]}
          onPress={handleRedo}
          disabled={undoStack.length === 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[
            isLargeDevice ? styles.redoButtonTextLarge : null,
            isMediumLargeDevice ? styles.redoButtonTextMediumLarge : null,
            isSmallDevice ? styles.redoButtonTextSmall : null,
            isTinyDevice ? styles.redoButtonTextTiny : null,
          ]}>↪</Text>
        </TouchableOpacity>
      </Animated.View>
      {/* Eraser button next to redo button */}
            <Animated.View style={[
              isLargeDevice ? styles.eraserButtonContainerLarge : null,
              isMediumLargeDevice ? styles.eraserButtonContainerMediumLarge : null,
              isSmallDevice ? styles.eraserButtonContainerSmall : null,
              isTinyDevice ? styles.eraserButtonContainerTiny : null,
              { transform: [{ translateX: eraserButtonAnim }] }
            ]}>
              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.eraserButtonLarge : null,
                  isMediumLargeDevice ? styles.eraserButtonMediumLarge : null,
                  isSmallDevice ? styles.eraserButtonSmall : null,
                  isTinyDevice ? styles.eraserButtonTiny : null,
                  isEraser && styles.activeButton
                ]}
                onPress={toggleEraser}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[
                  isLargeDevice ? styles.eraserButtonTextLarge : null,
                  isMediumLargeDevice ? styles.eraserButtonTextMediumLarge : null,
                  isSmallDevice ? styles.eraserButtonTextSmall : null,
                  isTinyDevice ? styles.eraserButtonTextTiny : null,
                ]}>🧽</Text>
              </TouchableOpacity>
            </Animated.View>
            
            {/* Pen button next to eraser button */}
            <Animated.View style={[
              isLargeDevice ? styles.penButtonContainerLarge : null,
              isMediumLargeDevice ? styles.penButtonContainerMediumLarge : null,
              isSmallDevice ? styles.penButtonContainerSmall : null,
              isTinyDevice ? styles.penButtonContainerTiny : null,
              { transform: [{ translateX: penButtonAnim }] }
            ]}>
              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.penButtonLarge : null,
                  isMediumLargeDevice ? styles.penButtonMediumLarge : null,
                  isSmallDevice ? styles.penButtonSmall : null,
                  isTinyDevice ? styles.penButtonTiny : null,
                  !isEraser && styles.activeButton
                ]}
                onPress={() => {
                  setIsEraser(false);
                  setSelectedPen(0);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[
                  isLargeDevice ? styles.penButtonTextLarge : null,
                  isMediumLargeDevice ? styles.penButtonTextMediumLarge : null,
                  isSmallDevice ? styles.penButtonTextSmall : null,
                  isTinyDevice ? styles.penButtonTextTiny : null,
                ]}>✏️</Text>
              </TouchableOpacity>
            </Animated.View>
      
      {/* The menu itself */}
      <Animated.View 
        style={[
          isLargeDevice ? styles.menuContainerLarge : null,
          isMediumLargeDevice ? styles.menuContainerMediumLarge : null,
          isSmallDevice ? styles.menuContainerSmall : null,
          isTinyDevice ? styles.menuContainerTiny : null,
          { height: menuHeight, opacity: menuAnimation }
        ]}
        pointerEvents={menuOpen ? "auto" : "none"}
      >
        <View style={[
          isLargeDevice ? styles.menuContentLarge : null,
          isMediumLargeDevice ? styles.menuContentMediumLarge : null,
          isSmallDevice ? styles.menuContentSmall : null,
          isTinyDevice ? styles.menuContentTiny : null,
        ]}>
          <View style={{flexDirection: 'row'}}>
            {/* Left Column */}
            <View style={{flex: 0.65}}>
              {/* Colors */}
              <View style={[
                isLargeDevice ? styles.menuSectionLarge : null,
                isMediumLargeDevice ? styles.menuSectionMediumLarge : null,
                isSmallDevice ? styles.menuSectionSmall : null,
                isTinyDevice ? styles.menuSectionTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.menuSectionTitleLarge : null,
                  isMediumLargeDevice ? styles.menuSectionTitleMediumLarge : null,
                  isSmallDevice ? styles.menuSectionTitleSmall : null,
                  isTinyDevice ? styles.menuSectionTitleTiny : null,
                ]}>Colors</Text>
                <View style={[
                  isLargeDevice ? styles.colorRowLarge : null,
                  isMediumLargeDevice ? styles.colorRowMediumLarge : null,
                  isSmallDevice ? styles.colorRowSmall : null,
                  isTinyDevice ? styles.colorRowTiny : null,
                ]}>
                  {COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        isLargeDevice ? styles.colorOptionLarge : null,
                        isMediumLargeDevice ? styles.colorOptionMediumLarge : null,
                        isSmallDevice ? styles.colorOptionSmall : null,
                        isTinyDevice ? styles.colorOptionTiny : null,
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

              {/* Stroke Widths */}
              <View style={[
                isLargeDevice ? styles.menuSectionLarge : null,
                isMediumLargeDevice ? styles.menuSectionMediumLarge : null,
                isSmallDevice ? styles.menuSectionSmall : null,
                isTinyDevice ? styles.menuSectionTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.menuSectionTitleLarge : null,
                  isMediumLargeDevice ? styles.menuSectionTitleMediumLarge : null,
                  isSmallDevice ? styles.menuSectionTitleSmall : null,
                  isTinyDevice ? styles.menuSectionTitleTiny : null,
                ]}>Stroke Width</Text>
                <View style={[
                  isLargeDevice ? styles.widthRowLarge : null,
                  isMediumLargeDevice ? styles.widthRowMediumLarge : null,
                  isSmallDevice ? styles.widthRowSmall : null,
                  isTinyDevice ? styles.widthRowTiny : null,
                ]}>
                  {STROKE_WIDTHS.map(width => (
                    <TouchableOpacity
                      key={`width-${width}`}
                      style={[
                        isLargeDevice ? styles.widthOptionLarge : null,
                        isMediumLargeDevice ? styles.widthOptionMediumLarge : null,
                        isSmallDevice ? styles.widthOptionSmall : null,
                        isTinyDevice ? styles.widthOptionTiny : null,
                        selectedStrokeWidth === width && styles.selectedOption
                      ]}
                      onPress={() => setSelectedStrokeWidth(width)}
                    >
                      <View style={[
                        styles.widthCircle, 
                        { 
                          width: width * 1.2,
                          height: width * 1.2, 
                          borderRadius: (width * 1.2) / 2,
                          backgroundColor: isEraser ? "#ccc" : selectedColor 
                        }
                      ]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Right Column */}
            <View style={{flex: 1}}>
              {/* Pens */}
              <View style={[
                isLargeDevice ? styles.menuSectionLarge : null,
                isMediumLargeDevice ? styles.menuSectionMediumLarge : null,
                isSmallDevice ? styles.menuSectionSmall : null,
                isTinyDevice ? styles.menuSectionTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.menuSectionTitleLarge : null,
                  isMediumLargeDevice ? styles.menuSectionTitleMediumLarge : null,
                  isSmallDevice ? styles.menuSectionTitleSmall : null,
                  isTinyDevice ? styles.menuSectionTitleTiny : null,
                ]}>Pen</Text>
                <View style={[
                  isLargeDevice ? styles.penRowLarge : null,
                  isMediumLargeDevice ? styles.penRowMediumLarge : null,
                  isSmallDevice ? styles.penRowSmall : null,
                  isTinyDevice ? styles.penRowTiny : null,
                ]}>
                  <TouchableOpacity
                    style={[
                      isLargeDevice ? styles.penOptionLarge : null,
                      isMediumLargeDevice ? styles.penOptionMediumLarge : null,
                      isSmallDevice ? styles.penOptionSmall : null,
                      isTinyDevice ? styles.penOptionTiny : null,
                      selectedPen === 0 && styles.selectedOption
                    ]}
                    onPress={() => {
                      setSelectedPen(0);
                      setSelectedColor("black");
                      setIsEraser(false);
                    }}
                  >
                    <Text style={[
                      isLargeDevice ? styles.toolButtonTextLarge : null,
                      isMediumLargeDevice ? styles.toolButtonTextMediumLarge : null,
                      isSmallDevice ? styles.toolButtonTextSmall : null,
                      isTinyDevice ? styles.toolButtonTextTiny : null,
                    ]}>✏️</Text>
                    <Text style={[
                      isLargeDevice ? styles.penLabelLarge : null,
                      isMediumLargeDevice ? styles.penLabelMediumLarge : null,
                      isSmallDevice ? styles.penLabelSmall : null,
                      isTinyDevice ? styles.penLabelTiny : null,
                    ]}>Normal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      isLargeDevice ? styles.penOptionLarge : null,
                      isMediumLargeDevice ? styles.penOptionMediumLarge : null,
                      isSmallDevice ? styles.penOptionSmall : null,
                      isTinyDevice ? styles.penOptionTiny : null,
                      selectedPen === 1 && styles.selectedOption
                    ]}
                    onPress={() => {
                      setSelectedPen(1);
                      setSelectedColor("red");
                      setSelectedStrokeWidth(2);
                      setIsEraser(false);
                    }}
                  >
                    <Text style={[
                      isLargeDevice ? styles.toolButtonTextLarge : null,
                      isMediumLargeDevice ? styles.toolButtonTextMediumLarge : null,
                      isSmallDevice ? styles.toolButtonTextSmall : null,
                      isTinyDevice ? styles.toolButtonTextTiny : null,
                    ]}>🖍️</Text>
                    <Text style={[
                      isLargeDevice ? styles.penLabelLarge : null,
                      isMediumLargeDevice ? styles.penLabelMediumLarge : null,
                      isSmallDevice ? styles.penLabelSmall : null,
                      isTinyDevice ? styles.penLabelTiny : null,
                    ]}>Telestrator</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      isLargeDevice ? styles.penOptionLarge : null,
                      isMediumLargeDevice ? styles.penOptionMediumLarge : null,
                      isSmallDevice ? styles.penOptionSmall : null,
                      isTinyDevice ? styles.penOptionTiny : null,
                      selectedPen === 2 && styles.selectedOption
                    ]}
                    onPress={() => {
                      setSelectedPen(2);
                      setSelectedColor("yellow");
                      setIsEraser(false);
                    }}
                  >
                    <Text style={[
                      isLargeDevice ? styles.toolButtonTextLarge : null,
                      isMediumLargeDevice ? styles.toolButtonTextMediumLarge : null,
                      isSmallDevice ? styles.toolButtonTextSmall : null,
                      isTinyDevice ? styles.toolButtonTextTiny : null,
                    ]}>⭐</Text>
                    <Text style={[
                      isLargeDevice ? styles.penLabelLarge : null,
                      isMediumLargeDevice ? styles.penLabelMediumLarge : null,
                      isSmallDevice ? styles.penLabelSmall : null,
                      isTinyDevice ? styles.penLabelTiny : null,
                    ]}>Highlighter</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tools */}
              <View style={[
                isLargeDevice ? styles.menuSectionLarge : null,
                isMediumLargeDevice ? styles.menuSectionMediumLarge : null,
                isSmallDevice ? styles.menuSectionSmall : null,
                isTinyDevice ? styles.menuSectionTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.menuSectionTitleLarge : null,
                  isMediumLargeDevice ? styles.menuSectionTitleMediumLarge : null,
                  isSmallDevice ? styles.menuSectionTitleSmall : null,
                  isTinyDevice ? styles.menuSectionTitleTiny : null,
                ]}>Tools</Text>
                <View style={[
                  isLargeDevice ? styles.toolsRowLarge : null,
                  isMediumLargeDevice ? styles.toolsRowMediumLarge : null,
                  isSmallDevice ? styles.toolsRowSmall : null,
                  isTinyDevice ? styles.toolsRowTiny : null,
                ]}>
                  <TouchableOpacity
                    style={[
                      isLargeDevice ? styles.toolButtonLarge : null,
                      isMediumLargeDevice ? styles.toolButtonMediumLarge : null,
                      isSmallDevice ? styles.toolButtonSmall : null,
                      isTinyDevice ? styles.toolButtonTiny : null,
                      isEraser && styles.selectedOption
                    ]}
                    onPress={toggleEraser}
                  >
                    <Text style={[
                      isLargeDevice ? styles.toolButtonTextLarge : null,
                      isMediumLargeDevice ? styles.toolButtonTextMediumLarge : null,
                      isSmallDevice ? styles.toolButtonTextSmall : null,
                      isTinyDevice ? styles.toolButtonTextTiny : null,
                    ]}>Eraser</Text>
                  </TouchableOpacity>
                  {/* <TouchableOpacity
                    style={[
                      isLargeDevice ? styles.toolButtonLarge : null,
                      isMediumLargeDevice ? styles.toolButtonMediumLarge : null,
                      isSmallDevice ? styles.toolButtonSmall : null,
                      isTinyDevice ? styles.toolButtonTiny : null,
                    ]}
                    onPress={clearCanvas}
                  >
                    <Text style={[
                      isLargeDevice ? styles.toolButtonTextLarge : null,
                      isMediumLargeDevice ? styles.toolButtonTextMediumLarge : null,
                      isSmallDevice ? styles.toolButtonTextSmall : null,
                      isTinyDevice ? styles.toolButtonTextTiny : null,
                    ]}>Clear</Text>
                  </TouchableOpacity> */}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
      
      {/* Bottom buttons */}
      <Animated.View style={[
        isLargeDevice ? styles.bottomButtonsContainerLarge : null,
        isMediumLargeDevice ? styles.bottomButtonsContainerMediumLarge : null,
        isSmallDevice ? styles.bottomButtonsContainerSmall : null,
        isTinyDevice ? styles.bottomButtonsContainerTiny : null,
        { transform: [{ translateY: bottomButtonsAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            isLargeDevice ? styles.stickButtonLargeSTICK : null,
            isMediumLargeDevice ? styles.stickButtonMediumLargeSTICK : null,
            isSmallDevice ? styles.stickButtonSmallSTICK : null,
            isTinyDevice ? styles.stickButtonTinySTICK : null,
            stickBonus && styles.stickButtonActive
          ]}
          onPress={toggleStickBonus}
        >
          <Text style={[
            isLargeDevice ? styles.buttonTextLarge : null,
            isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
            isSmallDevice ? styles.buttonTextSmall : null,
            isTinyDevice ? styles.buttonTextTiny : null,
          ]}>STICK BONUS</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[
        isLargeDevice ? styles.bottomButtonsContainercodetableLarge : null,
        isMediumLargeDevice ? styles.bottomButtonsContainercodetableMediumLarge : null,
        isSmallDevice ? styles.bottomButtonsContainercodetableSmall : null,
        isTinyDevice ? styles.bottomButtonsContainercodetableTiny : null,
        { transform: [{ translateY: bottomButtonsAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            isLargeDevice ? styles.stickButtonLarge : null,
            isMediumLargeDevice ? styles.stickButtonMediumLarge : null,
            isSmallDevice ? styles.stickButtonSmall : null,
            isTinyDevice ? styles.stickButtonTiny : null,
          ]}
          onPress={oncodetable}
        >
          <Text style={[
            isLargeDevice ? styles.buttonTextLarge : null,
            isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
            isSmallDevice ? styles.buttonTextSmall : null,
            isTinyDevice ? styles.buttonTextTiny : null,
          ]}>VAULT TABLE</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={[
        isLargeDevice ? styles.finalcalcContainerLarge : null,
        isMediumLargeDevice ? styles.finalcalcContainerMediumLarge : null,
        isSmallDevice ? styles.finalcalcContainerSmall : null,
        isTinyDevice ? styles.finalcalcContainerTiny : null,
      ]}>{percentage}</Text>

      {/* Save Status Indicator */}
      <Animated.View style={[
        isLargeDevice ? styles.saveStatusContainerLarge : null,
        isMediumLargeDevice ? styles.saveStatusContainerMediumLarge : null,
        isSmallDevice ? styles.saveStatusContainerSmall : null,
        isTinyDevice ? styles.saveStatusContainerTiny : null,
        {
          opacity: saveStatusAnim,
          transform: [{ scale: saveStatusAnim }]
        }
      ]}>
        {saveStatus === 'loading' && (
          <Animated.View style={[
            isLargeDevice ? styles.saveIndicatorLarge : null,
            isMediumLargeDevice ? styles.saveIndicatorMediumLarge : null,
            isSmallDevice ? styles.saveIndicatorSmall : null,
            isTinyDevice ? styles.saveIndicatorTiny : null,
            styles.loadingIndicator,
            { transform: [{ rotate: loadingRotation }] }
          ]}>
            <View style={[
              isLargeDevice ? styles.loadingSpinnerLarge : null,
              isMediumLargeDevice ? styles.loadingSpinnerMediumLarge : null,
              isSmallDevice ? styles.loadingSpinnerSmall : null,
              isTinyDevice ? styles.loadingSpinnerTiny : null,
            ]} />
          </Animated.View>
        )}
        
        {saveStatus === 'success' && (
          <View style={[
            isLargeDevice ? styles.saveIndicatorLarge : null,
            isMediumLargeDevice ? styles.saveIndicatorMediumLarge : null,
            isSmallDevice ? styles.saveIndicatorSmall : null,
            isTinyDevice ? styles.saveIndicatorTiny : null,
            styles.successIndicator
          ]}>
            <Text style={[
              isLargeDevice ? styles.statusIconLarge : null,
              isMediumLargeDevice ? styles.statusIconMediumLarge : null,
              isSmallDevice ? styles.statusIconSmall : null,
              isTinyDevice ? styles.statusIconTiny : null,
            ]}>✓</Text>
          </View>
        )}
        
        {saveStatus === 'error' && (
          <View style={[
            isLargeDevice ? styles.saveIndicatorLarge : null,
            isMediumLargeDevice ? styles.saveIndicatorMediumLarge : null,
            isSmallDevice ? styles.saveIndicatorSmall : null,
            isTinyDevice ? styles.saveIndicatorTiny : null,
            styles.errorIndicator
          ]}>
            <Text style={[
              isLargeDevice ? styles.statusIconLarge : null,
              isMediumLargeDevice ? styles.statusIconMediumLarge : null,
              isSmallDevice ? styles.statusIconSmall : null,
              isTinyDevice ? styles.statusIconTiny : null,
            ]}>✗</Text>
          </View>
        )}
      </Animated.View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
  },
  
  // Canvas styles - Large Device
  canvasLarge: {
    height: 540,
    backgroundColor: CANVAS_BACKGROUND,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Canvas styles - Medium Large Device
  canvasMediumLarge: {
    height: 620,
    backgroundColor: CANVAS_BACKGROUND,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Canvas styles - Small Device
  canvasSmall: {
    height: 620,
    backgroundColor: CANVAS_BACKGROUND,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Canvas styles - Tiny Device
  canvasTiny: {
    height: 240,
    backgroundColor: CANVAS_BACKGROUND,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  // Background image styles - Large Device
  backgroundImageLarge: {
    position: 'absolute',
    width: '78%',
    height: '78%',
    top: '11%',
    left: '11%',
    opacity: 0.8,
    zIndex: 1,
  },
  // Background image styles - Medium Large Device
  backgroundImageMediumLarge: {
    position: 'absolute',
    width: '75%',
    height: '75%',
    top: '12.5%',
    left: '12.5%',
    opacity: 0.8,
    zIndex: 1,
  },
  // Background image styles - Small Device
  backgroundImageSmall: {
    position: 'absolute',
    width: '72%',
    height: '72%',
    top: '14%',
    left: '14%',
    opacity: 0.8,
    zIndex: 1,
  },
  // Background image styles - Tiny Device
  backgroundImageTiny: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    top: '15%',
    left: '15%',
    opacity: 0.8,
    zIndex: 1,
  },
  
  // Menu container styles - Large Device
  menuContainerLarge: {
    position: 'absolute',
    top: 80,
    left: 12,
    width: 660,
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderRadius: 12,
    zIndex: 10,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Menu container styles - Medium Large Device
  menuContainerMediumLarge: {
    position: 'absolute',
    top: 70,
    left: 10,
    width: 600,
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderRadius: 10,
    zIndex: 10,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Menu container styles - Small Device
  menuContainerSmall: {
    position: 'absolute',
    top: 60,
    left: 8,
    width: 540,
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderRadius: 8,
    zIndex: 10,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Menu container styles - Tiny Device
  menuContainerTiny: {
    position: 'absolute',
    top: 50,
    left: 6,
    width: 480,
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderRadius: 6,
    zIndex: 10,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  // Menu button container styles - Large Device
  menuButtonContainerLarge: {
    position: 'absolute',
    top: 12,
    left: 0,
    zIndex: 10,
  },
  // Menu button container styles - Medium Large Device
  menuButtonContainerMediumLarge: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 10,
  },
  // Menu button container styles - Small Device
  menuButtonContainerSmall: {
    position: 'absolute',
    top: 8,
    left: 0,
    zIndex: 10,
  },
  // Menu button container styles - Tiny Device
  menuButtonContainerTiny: {
    position: 'absolute',
    top: 6,
    left: 0,
    zIndex: 10,
  },
  
  // Menu button styles - Large Device
  menuButtonLarge: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
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
  // Menu button styles - Medium Large Device
  menuButtonMediumLarge: {
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
  // Menu button styles - Small Device
  menuButtonSmall: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
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
  // Menu button styles - Tiny Device
  menuButtonTiny: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  
  // Menu button text styles - Large Device
  menuButtonTextLarge: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  // Menu button text styles - Medium Large Device
  menuButtonTextMediumLarge: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Menu button text styles - Small Device
  menuButtonTextSmall: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  // Menu button text styles - Tiny Device
  menuButtonTextTiny: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Undo button container styles - Large Device
  undoButtonContainerLarge: {
    position: 'absolute',
    top: 12,
    left: 0,
    zIndex: 10,
  },
  // Undo button container styles - Medium Large Device
  undoButtonContainerMediumLarge: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 10,
  },
  // Undo button container styles - Small Device
  undoButtonContainerSmall: {
    position: 'absolute',
    top: 8,
    left: 0,
    zIndex: 10,
  },
  // Undo button container styles - Tiny Device
  undoButtonContainerTiny: {
    position: 'absolute',
    top: 6,
    left: 0,
    zIndex: 10,
  },
  
  // Undo button styles - Large Device
  undoButtonLarge: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#0052b4',
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
  // Undo button styles - Medium Large Device
  undoButtonMediumLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0052b4',
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
  // Undo button styles - Small Device
  undoButtonSmall: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#0052b4',
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
  // Undo button styles - Tiny Device
  undoButtonTiny: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0052b4',
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
  
  // Undo button text styles - Large Device
  undoButtonTextLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Undo button text styles - Medium Large Device
  undoButtonTextMediumLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Undo button text styles - Small Device
  undoButtonTextSmall: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Undo button text styles - Tiny Device
  undoButtonTextTiny: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Redo button container styles - Large Device
  redoButtonContainerLarge: {
    position: 'absolute',
    top: 12,
    left: 0,
    zIndex: 10,
  },
  // Redo button container styles - Medium Large Device
  redoButtonContainerMediumLarge: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 10,
  },
  // Redo button container styles - Small Device
  redoButtonContainerSmall: {
    position: 'absolute',
    top: 8,
    left: 0,
    zIndex: 10,
  },
  // Redo button container styles - Tiny Device
  redoButtonContainerTiny: {
    position: 'absolute',
    top: 6,
    left: 0,
    zIndex: 10,
  },
  
  // Redo button styles - Large Device
  redoButtonLarge: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#28a745',
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
  // Redo button styles - Medium Large Device
  redoButtonMediumLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#28a745',
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
  // Redo button styles - Small Device
  redoButtonSmall: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#28a745',
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
  // Redo button styles - Tiny Device
  redoButtonTiny: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#28a745',
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
  
  // Redo button text styles - Large Device
  redoButtonTextLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Redo button text styles - Medium Large Device
  redoButtonTextMediumLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Redo button text styles - Small Device
  redoButtonTextSmall: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Redo button text styles - Tiny Device
  redoButtonTextTiny: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.5,
  },
  
  // Menu content styles - Large Device
  menuContentLarge: {
    padding: 18,
  },
  // Menu content styles - Medium Large Device
  menuContentMediumLarge: {
    padding: 15,
  },
  // Menu content styles - Small Device
  menuContentSmall: {
    padding: 12,
  },
  // Menu content styles - Tiny Device
  menuContentTiny: {
    padding: 10,
  },
  
  // Menu section styles - Large Device
  menuSectionLarge: {
    marginBottom: 18,
  },
  // Menu section styles - Medium Large Device
  menuSectionMediumLarge: {
    marginBottom: 15,
  },
  // Menu section styles - Small Device
  menuSectionSmall: {
    marginBottom: 12,
  },
  // Menu section styles - Tiny Device
  menuSectionTiny: {
    marginBottom: 10,
  },
  
  // Menu section title styles - Large Device
  menuSectionTitleLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  // Menu section title styles - Medium Large Device
  menuSectionTitleMediumLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  // Menu section title styles - Small Device
  menuSectionTitleSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  // Menu section title styles - Tiny Device
  menuSectionTitleTiny: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  
  // Color row styles - Large Device
  colorRowLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 14,
  },
  // Color row styles - Medium Large Device
  colorRowMediumLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 12,
  },
  // Color row styles - Small Device
  colorRowSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 10,
  },
  // Color row styles - Tiny Device
  colorRowTiny: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 8,
  },
  
  // Color option styles - Large Device
  colorOptionLarge: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Color option styles - Medium Large Device
  colorOptionMediumLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Color option styles - Small Device
  colorOptionSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Color option styles - Tiny Device
  colorOptionTiny: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  // Width row styles - Large Device
  widthRowLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  // Width row styles - Medium Large Device
  widthRowMediumLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  // Width row styles - Small Device
  widthRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Width row styles - Tiny Device
  widthRowTiny: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  
  // Width option styles - Large Device
  widthOptionLarge: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Width option styles - Medium Large Device
  widthOptionMediumLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Width option styles - Small Device
  widthOptionSmall: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Width option styles - Tiny Device
  widthOptionTiny: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  widthCircle: {
    backgroundColor: 'black',
  },
  
  // Tools row styles - Large Device
  toolsRowLarge: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  // Tools row styles - Medium Large Device
  toolsRowMediumLarge: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  // Tools row styles - Small Device
  toolsRowSmall: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  // Tools row styles - Tiny Device
  toolsRowTiny: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  
  // Tool button styles - Large Device
  toolButtonLarge: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Tool button styles - Medium Large Device
  toolButtonMediumLarge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Tool button styles - Small Device
  toolButtonSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Tool button styles - Tiny Device
  toolButtonTiny: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  // Tool button text styles - Large Device
  toolButtonTextLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  // Tool button text styles - Medium Large Device
  toolButtonTextMediumLarge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  // Tool button text styles - Small Device
  toolButtonTextSmall: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  // Tool button text styles - Tiny Device
  toolButtonTextTiny: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  
  selectedOption: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  
  // Pen row styles - Large Device
  penRowLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 3,
  },
  // Pen row styles - Medium Large Device
  penRowMediumLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  // Pen row styles - Small Device
  penRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  // Pen row styles - Tiny Device
  penRowTiny: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 1,
  },
  
  // Pen option styles - Large Device
  penOptionLarge: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 38,
    alignItems: 'center',
  },
  // Pen option styles - Medium Large Device
  penOptionMediumLarge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 32,
    alignItems: 'center',
  },
  // Pen option styles - Small Device
  penOptionSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 28,
    alignItems: 'center',
  },
  // Pen option styles - Tiny Device
  penOptionTiny: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 24,
    alignItems: 'center',
  },
  
  // Pen label styles - Large Device
  penLabelLarge: {
    fontSize: 12,
    marginTop: 3,
  },
  // Pen label styles - Medium Large Device
  penLabelMediumLarge: {
    fontSize: 10,
    marginTop: 2,
  },
  // Pen label styles - Small Device
  penLabelSmall: {
    fontSize: 9,
    marginTop: 2,
  },
  // Pen label styles - Tiny Device
  penLabelTiny: {
    fontSize: 8,
    marginTop: 1,
  },
  
  // Bottom buttons container styles - Large Device
  bottomButtonsContainerLarge: {
    position: 'absolute',
    backgroundColor: 'transparent',
    bottom: 25,
    width: 190,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  // Bottom buttons container styles - Medium Large Device
  bottomButtonsContainerMediumLarge: {
    position: 'absolute',
    backgroundColor: 'transparent',
    bottom: 20,
    width: 170,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  // Bottom buttons container styles - Small Device
  bottomButtonsContainerSmall: {
    position: 'absolute',
    backgroundColor: 'transparent',
    bottom: 15,
    width: 150,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  // Bottom buttons container styles - Tiny Device
  bottomButtonsContainerTiny: {
    position: 'absolute',
    backgroundColor: 'transparent',
    bottom: 10,
    width: 130,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  
  // Bottom buttons container code table styles - Large Device
  bottomButtonsContainercodetableLarge: {
    position: 'absolute',
    backgroundColor: 'transparent',
    bottom: 25,
    width: 190,
    left: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  // Bottom buttons container code table styles - Medium Large Device
  bottomButtonsContainercodetableMediumLarge: {
    position: 'absolute',
    backgroundColor: 'transparent',
    bottom: 20,
    width: 170,
    left: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  // Bottom buttons container code table styles - Small Device
  bottomButtonsContainercodetableSmall: {
    position: 'absolute',
    backgroundColor: 'transparent',
    bottom: 15,
    width: 150,
    left: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  // Bottom buttons container code table styles - Tiny Device
  bottomButtonsContainercodetableTiny: {
    position: 'absolute',
    backgroundColor: 'transparent',
    bottom: 10,
    width: 130,
    left: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  
  // Final calc container styles - Large Device
  finalcalcContainerLarge: {
    position: 'absolute',
    backgroundColor: 'transparent',
    top: 12,
    fontSize: 24,
    right: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  // Final calc container styles - Medium Large Device
  finalcalcContainerMediumLarge: {
    position: 'absolute',
    backgroundColor: 'transparent',
    top: 10,
    fontSize: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  // Final calc container styles - Small Device
  finalcalcContainerSmall: {
    position: 'absolute',
    backgroundColor: 'transparent',
    top: 8,
    fontSize: 18,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  // Final calc container styles - Tiny Device
  finalcalcContainerTiny: {
    position: 'absolute',
    backgroundColor: 'transparent',
    top: 6,
    fontSize: 16,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  
  // Stick button styles - Large Device
  stickButtonLarge: {
    flex: 1,
    backgroundColor: "#B4B4B4",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stickButtonLargeSTICK: {
    flex: 1,
    backgroundColor: "#DC3545",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Stick button styles - Medium Large Device
  stickButtonMediumLarge: {
    flex: 1,
    backgroundColor: "#B4B4B4",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stickButtonMediumLargeSTICK: {
    flex: 1,
    backgroundColor: "#DC3545",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Stick button styles - Small Device
  stickButtonSmall: {
    flex: 1,
    backgroundColor: "#B4B4B4",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stickButtonSmallSTICK: {
    flex: 1,
    backgroundColor: "#DC3545",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Stick button styles - Tiny Device
  stickButtonTiny: {
    flex: 1,
    backgroundColor: "#B4B4B4",
    padding: 6,
    borderRadius: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stickButtonTinySTICK: {
    flex: 1,
    backgroundColor: "#DC3545",
    padding: 6,
    borderRadius: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  stickButtonActive: {
    backgroundColor: "#3AAA35",
  },
  
  // Button text styles - Large Device
  buttonTextLarge: {
    fontSize: 14,
    color: "white",
    fontWeight: "bold",
  },
  // Button text styles - Medium Large Device
  buttonTextMediumLarge: {
    fontSize: 12,
    color: "white",
    fontWeight: "bold",
  },
  // Button text styles - Small Device
  buttonTextSmall: {
    fontSize: 11,
    color: "white",
    fontWeight: "bold",
  },
  // Button text styles - Tiny Device
  buttonTextTiny: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
  },
  
  // Legacy styles (keeping for compatibility)
  colorPenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  debugPanel: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  debugTitle: {
    color: '#ff4500',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  debugText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 3,
  },
  highlightText: {
    color: '#ffcc00',
    fontWeight: 'bold',
  },
  centeredImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  centeredImage: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 9999,
    width: 700,
    height: 700,
    opacity: 0.8,
    paddingBottom: 100,
  },
  
  // Save status container styles - Large Device
  saveStatusContainerLarge: {
    position: 'absolute',
    top: 12,
    right: 80,
    zIndex: 100,
  },
  // Save status container styles - Medium Large Device
  saveStatusContainerMediumLarge: {
    position: 'absolute',
    top: 10,
    right: 70,
    zIndex: 100,
  },
  // Save status container styles - Small Device
  saveStatusContainerSmall: {
    position: 'absolute',
    top: 8,
    right: 60,
    zIndex: 100,
  },
  // Save status container styles - Tiny Device
  saveStatusContainerTiny: {
    position: 'absolute',
    top: 6,
    right: 50,
    zIndex: 100,
  },
  
  // Save indicator styles - Large Device
  saveIndicatorLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  // Save indicator styles - Medium Large Device
  saveIndicatorMediumLarge: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
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
  // Save indicator styles - Small Device
  saveIndicatorSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  // Save indicator styles - Tiny Device
  saveIndicatorTiny: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
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
  
  loadingIndicator: {
    backgroundColor: '#007AFF',
  },
  
  successIndicator: {
    backgroundColor: '#28a745',
  },
  
  errorIndicator: {
    backgroundColor: '#dc3545',
  },
  
  // Loading spinner styles - Large Device
  loadingSpinnerLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
  },
  // Loading spinner styles - Medium Large Device
  loadingSpinnerMediumLarge: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
  },
  // Loading spinner styles - Small Device
  loadingSpinnerSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
  },
  // Loading spinner styles - Tiny Device
  loadingSpinnerTiny: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
  },
  
  // Status icon styles - Large Device
  statusIconLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  // Status icon styles - Medium Large Device
  statusIconMediumLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  // Status icon styles - Small Device
  statusIconSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  // Status icon styles - Tiny Device
  statusIconTiny: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  
  // Toolbar styles
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f0f0f0",
  },
  toolButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#ddd",
    marginHorizontal: 5,
  },
  activeToolButton: {
    backgroundColor: "#007AFF",
  },
  toolButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  activeColorButton: {
    borderColor: "#007AFF",
  },
  strokeButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#ddd",
    marginHorizontal: 5,
  },
  activeStrokeButton: {
    backgroundColor: "#007AFF",
  },
  strokeButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  redoButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#ddd",
    marginHorizontal: 5,
  },
  redoButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  // Eraser button container styles
  eraserButtonContainerLarge: {
    position: 'absolute',
    top: 12,
    left: 0,
    zIndex: 10,
  },
  eraserButtonContainerMediumLarge: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 10,
  },
  eraserButtonContainerSmall: {
    position: 'absolute',
    top: 8,
    left: 0,
    zIndex: 10,
  },
  eraserButtonContainerTiny: {
    position: 'absolute',
    top: 6,
    left: 0,
    zIndex: 10,
  },
  
  // Eraser button styles
  eraserButtonLarge: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#dc3545',
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
  eraserButtonMediumLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dc3545',
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
  eraserButtonSmall: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#dc3545',
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
  eraserButtonTiny: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dc3545',
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
  
  // Eraser button text styles
  eraserButtonTextLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  eraserButtonTextMediumLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  eraserButtonTextSmall: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  eraserButtonTextTiny: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Pen button container styles
  penButtonContainerLarge: {
    position: 'absolute',
    top: 12,
    left: 0,
    zIndex: 10,
  },
  penButtonContainerMediumLarge: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 10,
  },
  penButtonContainerSmall: {
    position: 'absolute',
    top: 8,
    left: 0,
    zIndex: 10,
  },
  penButtonContainerTiny: {
    position: 'absolute',
    top: 6,
    left: 0,
    zIndex: 10,
  },
  
  // Pen button styles
  penButtonLarge: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#6c757d',
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
  penButtonMediumLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6c757d',
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
  penButtonSmall: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#6c757d',
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
  penButtonTiny: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6c757d',
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
  
  // Pen button text styles
  penButtonTextLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  penButtonTextMediumLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  penButtonTextSmall: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  penButtonTextTiny: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Active button state
  activeButton: {
    backgroundColor: '#007AFF',
    transform: [{ scale: 1.1 }],
  },
});
export default OptimizedWhiteboardDebug;