import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Modal, ScrollView, TextInput } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getGymnastById, Gymnast, getCompetitionById, Competition, getGymnastsByCompetition } from '../lib/database';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

interface PathData {
  path: string; // SVG string from SkPath
  color: string;
  strokeWidth: number;
  isEraser?: boolean;
}

interface WhiteboardImage {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function GymnastFloor() {
  const router = useRouter();
  const { gymnastId, competitionId } = useLocalSearchParams();
  const [gymnast, setGymnast] = useState<Gymnast | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [allGymnasts, setAllGymnasts] = useState<Gymnast[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Whiteboard state with Skia optimization
  const currentPath = useRef<SkPath | null>(null);
  const [paths, setPaths] = useState<SkPath[]>([]);
  const [pathsData, setPathsData] = useState<PathData[]>([]);
  const [currentPathDisplay, setCurrentPathDisplay] = useState<SkPath | null>(null);
  const isDrawingRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'hand'>('pen');
  const [undoStack, setUndoStack] = useState<PathData[]>([]);
  const [redoStack, setRedoStack] = useState<PathData[]>([]);
  const [whiteboardHeight, setWhiteboardHeight] = useState(0.5);
  const [delta, setDelta] = useState(0);
  const [images, setImages] = useState<WhiteboardImage[]>([]);

  // Modal states
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showStrokePicker, setShowStrokePicker] = useState(false);

  const whiteboardHeightPixels = height * whiteboardHeight;

  useEffect(() => {
    loadData();
  }, [gymnastId]);

  const loadData = async () => {
    try {
      const id = parseInt(gymnastId as string);
      const compId = parseInt(competitionId as string);
      
      const gym = await getGymnastById(id);
      const comp = await getCompetitionById(compId);
      const gymnasts = await getGymnastsByCompetition(compId);
      
      setGymnast(gym);
      setCompetition(comp);
      setAllGymnasts(gymnasts);
      
      // Find current index
      const index = gymnasts.findIndex(g => g.id === id);
      setCurrentIndex(index !== -1 ? index : 0);
    } catch (error) {
      console.error('Error loading gymnast:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevGymnast = allGymnasts[currentIndex - 1];
      router.push({
        pathname: prevGymnast.evento === 'VT' ? '/gymnast-vault' : '/gymnast-floor',
        params: { gymnastId: prevGymnast.id.toString(), competitionId: competitionId as string }
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < allGymnasts.length - 1) {
      const nextGymnast = allGymnasts[currentIndex + 1];
      router.push({
        pathname: nextGymnast.evento === 'VT' ? '/gymnast-vault' : '/gymnast-floor',
        params: { gymnastId: nextGymnast.id.toString(), competitionId: competitionId as string }
      });
    }
  };

  const handleStartJudging = () => {
    router.push({
      pathname: '/start-judging',
      params: { 
        competitionId: competitionId as string,
        lastGymnastId: gymnastId as string
      }
    });
  };

  const handleMainTable = () => {
    router.push({
      pathname: '/main-table',
      params: { competitionId: competitionId as string }
    });
  };

  // Smooth point addition (from integration.txt)
  const addSmoothPoint = useCallback((path: SkPath, x: number, y: number) => {
    const last = lastPoint.current;
    if (last) {
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        path.lineTo(x, y);
        lastPoint.current = { x, y };
      }
    } else {
      path.moveTo(x, y);
      lastPoint.current = { x, y };
    }
  }, []);

  // Update paths with optimization
  const updatePaths = useCallback((newPath: SkPath) => {
    const pathString = newPath.toSVGString();
    const newPathData: PathData = {
      path: pathString,
      color: currentTool === 'eraser' ? '#FFFFFF' : selectedColor,
      strokeWidth: currentTool === 'eraser' ? strokeWidth * 2 : strokeWidth,
      isEraser: currentTool === 'eraser',
    };
    
    if (undoStack.length > 0) {
      setUndoStack(prev => prev.slice(-10)); // Limit undo stack
    }
    
    setUndoStack(prev => [...prev, pathsData[pathsData.length - 1]]);
    setPathsData(prev => [...prev, newPathData]);
    setPaths(prev => [...prev, newPath]);
    setRedoStack([]);
  }, [currentTool, selectedColor, strokeWidth, pathsData, undoStack]);

  // Skia Pan Gesture (adapted from integration.txt)
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      'worklet';
      const { x, y } = event;
      if (currentTool === 'hand') return;
      
      const path = Skia.Path.Make();
      runOnJS((p: SkPath, px: number, py: number) => {
        addSmoothPoint(p, px, py);
        currentPath.current = p;
        setCurrentPathDisplay(Skia.Path.MakeFromSVGString(p.toSVGString())!);
        isDrawingRef.current = true;
      })(path, x, y);
    })
    .onUpdate((event) => {
      'worklet';
      const { x, y } = event;
      if (currentTool === 'hand' || !isDrawingRef.current) return;
      
      runOnJS((px: number, py: number) => {
        if (currentPath.current) {
          addSmoothPoint(currentPath.current, px, py);
          setCurrentPathDisplay(Skia.Path.MakeFromSVGString(currentPath.current.toSVGString())!);
        }
      })(x, y);
    })
    .onEnd(() => {
      'worklet';
      if (currentTool === 'hand' || !isDrawingRef.current) return;
      
      runOnJS(() => {
        if (currentPath.current) {
          updatePaths(currentPath.current);
          currentPath.current = null;
          setCurrentPathDisplay(null);
          lastPoint.current = null;
          isDrawingRef.current = false;
        }
      })();
    });

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const lastPathData = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, pathsData[pathsData.length - 1]]);
    setPathsData(prev => prev.slice(0, -1));
    setPaths(prev => prev.slice(0, -1));
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, pathsData]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const nextPathData = redoStack[redoStack.length - 1];
    const nextPath = Skia.Path.MakeFromSVGString(nextPathData.path);
    if (nextPath) {
      setUndoStack(prev => [...prev, pathsData[pathsData.length - 1]]);
      setPathsData(prev => [...prev, nextPathData]);
      setPaths(prev => [...prev, nextPath]);
      setRedoStack(prev => prev.slice(0, -1));
    }
  }, [redoStack, pathsData]);

  const handleClearAll = useCallback(() => {
    if (paths.length > 0) {
      setUndoStack(prev => [...prev, ...pathsData]);
    }
    setPaths([]);
    setPathsData([]);
    setRedoStack([]);
  }, [paths, pathsData]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      // TODO: Add image to whiteboard
      console.log('Image selected:', result.assets[0].uri);
    }
  };

  const colors = [
    '#FF0000', '#0000FF', '#00FF00', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#000000', '#FFFFFF', '#808080', '#964B00'
  ];

  const strokeWidths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Whiteboard Container */}
        <View style={[styles.whiteboardContainer, { height: whiteboardHeightPixels }]}>
          {/* Top Left Controls */}
          <View style={styles.topLeftControls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => setShowMenu(true)}>
              <Text style={styles.controlIcon}>☰</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, undoStack.length === 0 && styles.controlButtonDisabled]} 
              onPress={handleUndo}
              disabled={undoStack.length === 0}
            >
              <Text style={styles.controlIcon}>↶</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, redoStack.length === 0 && styles.controlButtonDisabled]} 
              onPress={handleRedo}
              disabled={redoStack.length === 0}
            >
              <Text style={styles.controlIcon}>↷</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, currentTool === 'eraser' && styles.controlButtonActive]} 
              onPress={() => setCurrentTool('eraser')}
            >
              <Text style={styles.controlIcon}>⌫</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, currentTool === 'pen' && styles.controlButtonActive]} 
              onPress={() => setCurrentTool('pen')}
            >
              <Text style={styles.controlIcon}>✎</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.colorButton, { backgroundColor: '#FF0000' }]} 
              onPress={() => { setSelectedColor('#FF0000'); setCurrentTool('pen'); }}
            />
            
            <TouchableOpacity 
              style={[styles.colorButton, { backgroundColor: '#0000FF' }]} 
              onPress={() => { setSelectedColor('#0000FF'); setCurrentTool('pen'); }}
            />
          </View>

          {/* Top Right Controls */}
          <View style={styles.topRightControls}>
            <View style={styles.deltaContainer}>
              <Text style={styles.deltaLabel}>Δ</Text>
              <TextInput
                style={styles.deltaInput}
                value={delta.toString()}
                onChangeText={(text) => setDelta(parseFloat(text) || 0)}
                keyboardType="numeric"
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.controlButton, currentTool === 'hand' && styles.controlButtonActive]} 
              onPress={() => setCurrentTool(currentTool === 'hand' ? 'pen' : 'hand')}
            >
              <Text style={styles.controlIcon}>{currentTool === 'hand' ? '✋' : '✎'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={pickImage}>
              <Text style={styles.controlIcon}>🖼️</Text>
            </TouchableOpacity>
          </View>

          {/* Whiteboard Canvas - Skia optimized */}
          <GestureDetector gesture={panGesture}>
            <Canvas 
              style={[styles.canvas, { width, height: whiteboardHeightPixels, backgroundColor: '#FFFFFF' }]}
            >
              {/* Draw saved paths from pathsData */}
              {paths.map((path, index) => {
                const data = pathsData[index];
                if (!data) return null;
                return (
                  <Path
                    key={index}
                    path={path}
                    color={data.color}
                    style="stroke"
                    strokeWidth={data.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                );
              })}
              
              {/* Draw current path being drawn */}
              {currentPathDisplay && (
                <Path
                  path={currentPathDisplay}
                  color={currentTool === 'eraser' ? '#FFFFFF' : selectedColor}
                  style="stroke"
                  strokeWidth={currentTool === 'eraser' ? strokeWidth * 2 : strokeWidth}
                  strokeCap="round"
                  strokeJoin="round"
                />
              )}
            </Canvas>
          </GestureDetector>
        </View>

        {/* Bottom Info Section - 2 Columns */}
        <View style={styles.bottomSection}>
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.columnsContainer}>
              {/* Left Column */}
              <View style={styles.column}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Gymnast Info</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Number:</Text>
                    <Text style={styles.infoValue}>{gymnast?.numero}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Name:</Text>
                    <Text style={styles.infoValue}>{gymnast?.gymnasta}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Event:</Text>
                    <Text style={styles.infoValue}>{gymnast?.evento}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>NOC:</Text>
                    <Text style={styles.infoValue}>{gymnast?.noc}</Text>
                  </View>
                </View>
              </View>

              {/* Right Column */}
              <View style={styles.column}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Scoring</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>D Score:</Text>
                    <Text style={styles.infoValue}>-</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>E Score:</Text>
                    <Text style={styles.infoValue}>-</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Penalty:</Text>
                    <Text style={styles.infoValue}>-</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Total:</Text>
                    <Text style={styles.infoValue}>-</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity 
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]} 
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            >
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.navButton} onPress={handleStartJudging}>
              <Text style={styles.navButtonText}>Start Judging</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.navButton} onPress={handleMainTable}>
              <Text style={styles.navButtonText}>Main Table</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, currentIndex === allGymnasts.length - 1 && styles.navButtonDisabled]} 
              onPress={handleNext}
              disabled={currentIndex === allGymnasts.length - 1}
            >
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Modal */}
        <Modal visible={showMenu} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Menu</Text>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowColorPicker(true); setShowMenu(false); }}>
                <Text style={styles.menuItemText}>Choose Color</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowStrokePicker(true); setShowMenu(false); }}>
                <Text style={styles.menuItemText}>Stroke Width: {strokeWidth}px</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => { handleClearAll(); setShowMenu(false); }}>
                <Text style={styles.menuItemText}>Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuItemText}>Whiteboard Height: {Math.round(whiteboardHeight * 100)}%</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowMenu(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Color Picker Modal */}
        <Modal visible={showColorPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Color</Text>
              <View style={styles.colorGrid}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedColor(color);
                      setCurrentTool('pen');
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowColorPicker(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Stroke Width Picker Modal */}
        <Modal visible={showStrokePicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Stroke Width</Text>
              <View style={styles.strokeSliderContainer}>
                {strokeWidths.map((width) => (
                  <TouchableOpacity
                    key={width}
                    style={styles.strokeDotContainer}
                    onPress={() => {
                      setStrokeWidth(width);
                      setShowStrokePicker(false);
                    }}
                  >
                    <View 
                      style={[
                        styles.strokeDot,
                        { 
                          width: width * 2,
                          height: width * 2,
                          backgroundColor: strokeWidth === width ? '#333' : '#999'
                        }
                      ]} 
                    />
                    <Text style={styles.strokeDotLabel}>{width}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowStrokePicker(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backIcon: {
    fontSize: 28,
    color: '#333',
  },
  titleContainer: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  topBarSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  whiteboardContainer: {
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    position: 'relative',
  },
  topLeftControls: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
    flexWrap: 'wrap',
    maxWidth: width * 0.6,
  },
  topRightControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  controlButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  controlIcon: {
    fontSize: 20,
    color: '#333',
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  strokeWidthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  deltaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#333',
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  deltaLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginRight: 8,
  },
  deltaInput: {
    fontSize: 16,
    color: '#333',
    width: 50,
    fontWeight: '600',
  },
  canvas: {
    backgroundColor: '#FFFFFF',
  },
  svg: {
    backgroundColor: '#FFFFFF',
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  columnsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  column: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoKey: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#ccc',
  },
  colorOptionSelected: {
    borderColor: '#333',
    borderWidth: 4,
  },
  strokeSliderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  strokeDotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  strokeDot: {
    borderRadius: 100,
    marginBottom: 4,
  },
  strokeDotLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  strokeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  strokeOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  strokeOptionSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  strokeOptionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#666',
  },
});
