import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { getRateGeneralByTableId, updateRateGeneral } from "../Database/database"; // Import database functions

const { width, height } = Dimensions.get('window');

// Available colors for drawing
const COLORS = ["black", "red", "blue", "green", "orange"];
// Available stroke widths
const STROKE_WIDTHS = [2, 5, 10, 15];

// Color for canvas background and eraser
const CANVAS_BACKGROUND = "rgb(224, 224, 224)";

// Interface for path data
interface PathData {
  path: string;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
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
  setStickBonusset: Function; // Function to update the stick bonus state
  stickBonus?: boolean; // Current state of the stick bonus
  percentage?: number; // Current percentage value
  onSaveComplete?: () => void; // Optional callback when save is complete
}

const OptimizedWhiteboardDebug = ({ 
  rateGeneralId, 
  tableId, 
  stickBonus = false, 
  setStickBonusset, 
  percentage = 0,
  onSaveComplete 
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
  const [debugMode, setDebugMode] = useState<boolean>(true);
  const [lastTouchInfo, setLastTouchInfo] = useState<any>({});
  const [touchSource, setTouchSource] = useState<string>('None');
  const [pointerTypeValue, setPointerTypeValue] = useState<string>('Unknown');
  
  // Colors and widths
  const [selectedColor, setSelectedColor] = useState<string>("black");
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState<number>(3);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  
  // Menu state
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  
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
      // Bring in the undo button right after
      Animated.timing(undoButtonAnim, {
        toValue: 70, // Position it to the right of the menu button
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      // Bring in the redo button after undo
      Animated.timing(redoButtonAnim, {
        toValue: 130, // Position it to the right of the undo button
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      // Bring in bottom buttons from the bottom
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
              setPaths(parsedPaths);
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
  
  // Save drawing data to the database
  const saveDrawingData = async () => {
    try {
      setSaving(true);
      
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
          
          // Call the onSaveComplete callback if provided
          if (onSaveComplete) {
            onSaveComplete();
          }
        }
      }
    } catch (error) {
      console.error("Error saving drawing data:", error);
    } finally {
      setSaving(false);
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
    // Don't save on initial load
    if (!loading && paths.length > 0) {
      console.log("Paths changed, now has", paths.length, "items");
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
    setIsEraser(!isEraser);
  };
  
  // Clear the canvas
  const clearCanvas = () => {
    setPaths([]);
    setUndoStack([]);
    setCurrentPath('');
    pathBufferRef.current = '';
    pointsBufferRef.current = [];
    
    // Save the empty canvas
    setTimeout(() => debouncedSave(), 0);
  };

  // Toggle stick bonus
  const toggleStickBonus = () => {
    setStickBonusset(!stickBonus);
    // Save the updated stick bonus

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
      
      // Only proceed with drawing if it's a pen
      if (isPencil) {
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
      if (distance > 1.5) {
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
          
          // Add the final path to paths array if it has actual content
          setPaths(prev => {
            const newPaths = [...prev, { 
              path: finalPath, 
              color: selectedColor,
              strokeWidth: selectedStrokeWidth,
              isEraser: isEraser
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
  
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Debug panel */}
      {/* {debugMode && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>TOUCH DEBUG INFO</Text>
          <Text style={styles.debugText}>
            Raw pointerType: <Text style={styles.highlightText}>{pointerTypeValue}</Text>
          </Text>
          <Text style={styles.debugText}>
            Detected as: <Text style={styles.highlightText}>{touchSource}</Text>
          </Text>
          <Text style={styles.debugText}>
            Drawing enabled: <Text style={styles.highlightText}>{drawing ? 'Yes' : 'No'}</Text>
          </Text>
          <Text style={styles.debugText}>
            Points in buffer: <Text style={styles.highlightText}>{pointsBufferRef.current.length}</Text>
          </Text>
          <Text style={styles.debugText}>
            Position: <Text style={styles.highlightText}>
              X: {Math.round(lastTouchInfo.x || 0)}, Y: {Math.round(lastTouchInfo.y || 0)}
            </Text>
          </Text>
        </View>
      )} */}
      
      {/* Drawing canvas */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.canvas}>
          <Svg height="100%" width="100%">
            {/* Render completed paths */}
            {paths.map((pathData, index) => (
              <Path
                key={`path-${index}`}
                d={pathData.path}
                stroke={pathData.isEraser ? CANVAS_BACKGROUND : pathData.color}
                strokeWidth={pathData.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            
            {/* Render current path */}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={isEraser ? CANVAS_BACKGROUND : selectedColor}
                strokeWidth={selectedStrokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>
      </GestureDetector>
      
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
      
      {/* Undo button next to menu button */}
      <Animated.View style={[
        styles.undoButtonContainer,
        { transform: [{ translateX: undoButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            styles.undoButton,
            paths.length === 0 && styles.disabledButton
          ]}
          onPress={handleUndo}
          disabled={paths.length === 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.undoButtonText}>↩</Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Redo button next to undo button */}
      <Animated.View style={[
        styles.redoButtonContainer,
        { transform: [{ translateX: redoButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            styles.redoButton,
            undoStack.length === 0 && styles.disabledButton
          ]}
          onPress={handleRedo}
          disabled={undoStack.length === 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.redoButtonText}>↪</Text>
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
        <View style={styles.menuContent}>
          {/* Colors */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Colors</Text>
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
          
          {/* Stroke Widths */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Stroke Width</Text>
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
          
          {/* Eraser and Clear */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Tools</Text>
            <View style={styles.toolsRow}>
              <TouchableOpacity
                style={[
                  styles.toolButton,
                  isEraser && styles.selectedOption
                ]}
                onPress={toggleEraser}
              >
                <Text style={styles.toolButtonText}>Eraser</Text>
              </TouchableOpacity>

            </View>
          </View>
          
          {/* Debug Toggle */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Settings</Text>
            <TouchableOpacity
              style={[
                styles.toolButton,
                debugMode && styles.selectedOption
              ]}
              onPress={toggleDebugMode}
            >
              <Text style={styles.toolButtonText}>
                {debugMode ? 'Debug ON' : 'Debug OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      
      {/* Stick bonus button in the bottom right */}
      <Animated.View style={[
        styles.bottomButtonsContainer,
        { transform: [{ translateY: bottomButtonsAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            styles.stickButton,
            stickBonus && styles.stickButtonActive
          ]}
          onPress={toggleStickBonus}
        >
          <Text style={styles.buttonText}>STICK BONUS</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.finalcalcContainer}>{percentage}</Text>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
  },
  canvas: {
    height: 520,
    backgroundColor: CANVAS_BACKGROUND,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  menuButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 10,
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
  undoButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 10,
  },
  undoButton: {
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
  undoButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  redoButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 0,
    zIndex: 10,
  },
  redoButton: {
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
  redoButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.5,
  },
  menuContainer: {
    position: 'absolute',
    top: 70,
    left: 10,
    width: 250,
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderRadius: 10,
    zIndex: 10,
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
  menuContent: {
    padding: 15,
  },
  menuSection: {
    marginBottom: 15,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  widthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  widthOption: {
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
  widthCircle: {
    backgroundColor: 'black',
  },
  toolsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  toolButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toolButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedOption: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    backgroundColor: 'transparent',
    bottom: 20,
    width: 170,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
    finalcalcContainer: {
    position: 'absolute',
    backgroundColor: 'transparent',
    top: 10,
    flex: 1,
    fontSize: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  stickButton: {
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
  stickButtonActive: {
    backgroundColor: "#3AAA35", // Green when active
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
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
});

export default OptimizedWhiteboardDebug;