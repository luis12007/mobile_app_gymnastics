import React, { useCallback, useState, useRef, useEffect, memo, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, TouchableOpacity, Text, Animated, Platform, Alert, Image, Modal } from 'react-native';
import Svg, { Path, G, Image as SvgImage } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../lib/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Detectar tamaño de dispositivo
const isLargeDevice = SCREEN_WIDTH >= 1368;
const isMediumLargeDevice = SCREEN_WIDTH >= 1200 && SCREEN_WIDTH < 1368;
const isSmallDevice = SCREEN_WIDTH >= 960 && SCREEN_WIDTH < 1200;
const isTinyDevice = SCREEN_WIDTH < 960;

// Configuración de layout para botones
const BUTTON_SIZE = 50;
const BUTTON_GAP = 5;
const BUTTON_START_X = 0;

// Configuración por defecto del pen
const DEFAULT_PEN_CONFIG = {
  color: 'black',
  strokeWidth: 2,
  penType: 0, // 0: Normal, 1: Telestrator, 2: Highlighter
};

// Variable global para mantener la configuración en memoria
let globalPenConfig = { ...DEFAULT_PEN_CONFIG };
let globalInputMode = '';

// Funciones utilitarias para manejar la configuración global del pen
const loadGlobalPenConfig = () => {
  return globalPenConfig;
};

const saveGlobalPenConfig = (config: typeof DEFAULT_PEN_CONFIG) => {
  globalPenConfig = { ...config };
  console.log('Saved pen config:', config);
};

const updateGlobalPenConfig = (updates: Partial<typeof DEFAULT_PEN_CONFIG>) => {
  const newConfig = { ...globalPenConfig, ...updates };
  saveGlobalPenConfig(newConfig);
  return newConfig;
};

// Constantes de optimización
const SIMPLIFY_TOLERANCE = 1.2;
const MIN_DISTANCE = 0.8;
const BEZIER_SMOOTHNESS = 0.3;
const DEBOUNCE_DELAY = 250;

export interface WhiteboardRef {
  forceSave: () => Promise<void>;
}

interface WhiteboardProps {
  gymnastId: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  onPathsChange?: (count: number) => void;
  stickBonus?: boolean;
  setStickBonus?: Function;
  percentage?: number;
  discipline?: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface PathData {
  id: string;
  d: string;
  color: string;
  width: number;
  penType: number;
  isEraser?: boolean;
}

interface ImageData {
  id: number;
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
}

const WhiteboardScreen = memo(forwardRef<WhiteboardRef, WhiteboardProps>(({
  gymnastId,
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT * 0.7,
  backgroundColor = '#FFFFFF',
  onPathsChange,
  stickBonus = false,
  setStickBonus = () => {},
  percentage = 0,
  discipline = false,
}: WhiteboardProps, ref) => {
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [images, setImages] = useState<ImageData[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [isManipulatingImage, setIsManipulatingImage] = useState(false);
  
  // Estados para configuración del pen
  const [currentColor, setCurrentColor] = useState<string>(globalPenConfig.color);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(globalPenConfig.strokeWidth);
  const [selectedPen, setSelectedPen] = useState<number>(globalPenConfig.penType);
  const [normalPenColor, setNormalPenColor] = useState<string>(globalPenConfig.color);
  const [previousStrokeWidth, setPreviousStrokeWidth] = useState<number>(globalPenConfig.strokeWidth);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  
  // Estados para botones
  const [undoStack, setUndoStack] = useState<PathData[]>([]);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  
  // Estado para modo de entrada
  const [inputMode, setInputMode] = useState(() => {
    if (globalInputMode) return globalInputMode;
    return isTinyDevice ? 'finger' : 'pen';
  });
  
  const currentPointsRef = useRef<Point[]>([]);
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathIdCounterRef = useRef(0);
  const lastPointRef = useRef<Point | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Refs para manipulación de imágenes
  const imageGestureRef = useRef({
    initialDistance: 0,
    initialAngle: 0,
    initialScale: 1,
    initialRotation: 0,
    lastTapTime: 0,
    longPressTimer: null as NodeJS.Timeout | null,
  });
  const imagesRef = useRef<ImageData[]>([]);
  const isManipulatingImageRef = useRef(false);
  const selectedImageIdRef = useRef<number | null>(null);
  
  // Refs para capturar el estado actual en tiempo real
  const currentColorRef = useRef<string>(currentColor);
  const currentStrokeWidthRef = useRef<number>(currentStrokeWidth);
  const selectedPenRef = useRef<number>(selectedPen);
  const isEraserRef = useRef<boolean>(isEraser);
  const backgroundColorRef = useRef<string>(backgroundColor);

  // Actualizar refs cuando cambian los estados
  useEffect(() => {
    currentColorRef.current = currentColor;
  }, [currentColor]);

  useEffect(() => {
    currentStrokeWidthRef.current = currentStrokeWidth;
  }, [currentStrokeWidth]);

  useEffect(() => {
    selectedPenRef.current = selectedPen;
  }, [selectedPen]);

  useEffect(() => {
    isEraserRef.current = isEraser;
  }, [isEraser]);

  useEffect(() => {
    backgroundColorRef.current = backgroundColor;
  }, [backgroundColor]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    isManipulatingImageRef.current = isManipulatingImage;
  }, [isManipulatingImage]);

  useEffect(() => {
    selectedImageIdRef.current = selectedImageId;
  }, [selectedImageId]);

  const getButtonOffset = (index: number) => {
    if (isTinyDevice) {
      const factors = [1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6];
      return BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * factors[index];
    }
    return BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * index;
  };

  // Catmull-Rom a Bezier cúbica - ULTRA SMOOTH
  const getCubicBezierControlPoints = useCallback((
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    tension: number = BEZIER_SMOOTHNESS
  ) => {
    const t = tension;
    
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;
    
    return { cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y } };
  }, []);

  // Convertir puntos a path SVG con curvas Bezier cúbicas suaves
  const pointsToSmoothPath = useCallback((points: Point[], closePathForFill: boolean = false): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    if (points.length === 2) {
      const path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
      return closePathForFill ? path + ' Z' : path;
    }

    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    
    // Para paths muy cortos, usar líneas simples
    if (points.length === 3) {
      const mid = {
        x: (points[0].x + points[1].x + points[2].x) / 3,
        y: (points[0].y + points[1].y + points[2].y) / 3
      };
      path += ` Q ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)} ${points[2].x.toFixed(2)} ${points[2].y.toFixed(2)}`;
      return closePathForFill ? path + ' Z' : path;
    }

    // Usar Catmull-Rom para suavizado perfecto
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      
      const { cp1, cp2 } = getCubicBezierControlPoints(p0, p1, p2, p3);
      
      path += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    
    // Si es highlighter, cerrar el path para crear un área rellena
    if (closePathForFill) {
      path += ' Z';
    }
    
    return path;
  }, [getCubicBezierControlPoints]);

  // Guardar con transacción batch optimizada
  const savePathsToDatabase = useCallback(async () => {
    if (isSavingRef.current || paths.length === 0) return;
    isSavingRef.current = true;
    
    try {
      // Usar transacción para mejor rendimiento
      await db.execAsync(`
        DELETE FROM whiteboard_traces WHERE gymnast_id = ${gymnastId};
      `);
      
      // Batch insert optimizado - Guardar trace_data como JSON completo
      const values = paths.map((p, i) => {
        const traceData = JSON.stringify({
          path: p.d,
          color: p.color,
          strokeWidth: p.width,
          penType: p.penType,
          isEraser: p.isEraser || false,
        });
        return `(${gymnastId}, '${traceData.replace(/'/g, "''")}', '${p.color}', ${p.width}, ${p.penType}, ${i})`;
      }).join(',');
      
      if (values) {
        await db.execAsync(`
          INSERT INTO whiteboard_traces (gymnast_id, trace_data, color, stroke_width, pen_type, order_index) 
          VALUES ${values};
        `);
      }
      
      onPathsChange?.(paths.length);
    } catch (error) {
      console.error('❌ Error al guardar paths:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [gymnastId, paths, onPathsChange]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(savePathsToDatabase, DEBOUNCE_DELAY);
  }, [savePathsToDatabase]);

  // Exponer función para forzar guardado desde el componente padre
  useImperativeHandle(ref, () => ({
    forceSave: async () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      await savePathsToDatabase();
      await saveImagesToDatabase(images);
    }
  }), [savePathsToDatabase, images]);

  const loadPathsFromDatabase = useCallback(async () => {
    try {
      setIsLoaded(false);
      const traces = await db.getAllAsync<any>(
        'SELECT * FROM whiteboard_traces WHERE gymnast_id = ? ORDER BY order_index ASC',
        [gymnastId]
      );

      const loadedPaths: PathData[] = traces.map((trace, index) => {
        // Intentar parsear trace_data como JSON completo
        let pathInfo;
        try {
          pathInfo = JSON.parse(trace.trace_data);
        } catch {
          // Si falla, asumir que trace_data es solo el path SVG (formato antiguo)
          pathInfo = {
            path: trace.trace_data,
            color: trace.color || currentColor,
            strokeWidth: trace.stroke_width || currentStrokeWidth,
            penType: trace.pen_type || 0,
            isEraser: false,
          };
        }

        return {
          id: `loaded-${gymnastId}-${index}-${Date.now()}`,
          d: pathInfo.path || pathInfo.d || trace.trace_data,
          color: pathInfo.color || trace.color || currentColor,
          width: pathInfo.strokeWidth || pathInfo.width || trace.stroke_width || currentStrokeWidth,
          penType: pathInfo.penType !== undefined ? pathInfo.penType : (trace.pen_type || 0),
          isEraser: pathInfo.isEraser || false,
        };
      });

      setPaths(loadedPaths);
      pathIdCounterRef.current = loadedPaths.length;
      setIsLoaded(true);
      onPathsChange?.(loadedPaths.length);
    } catch (error) {
      console.error('❌ Error cargando paths:', error);
      setPaths([]);
      setIsLoaded(true);
    }
  }, [gymnastId, currentColor, currentStrokeWidth, onPathsChange]);

  useEffect(() => {
    // Cargar configuración global
    const config = loadGlobalPenConfig();
    setCurrentColor(config.color);
    setCurrentStrokeWidth(config.strokeWidth);
    setSelectedPen(config.penType);
    setNormalPenColor(config.color);
    
    loadPathsFromDatabase();
    loadImagesFromDatabase();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (paths.length > 0) savePathsToDatabase();
    };
  }, [gymnastId]);

  // Optimizado: solo actualizar si hay cambio significativo
  const shouldAddPoint = useCallback((newPoint: Point): boolean => {
    if (!lastPointRef.current) return true;
    
    const dx = newPoint.x - lastPointRef.current.x;
    const dy = newPoint.y - lastPointRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance >= MIN_DISTANCE;
  }, []);

  const handleTouchStart = useCallback((x: number, y: number) => {
    const point = { x, y };
    currentPointsRef.current = [point];
    lastPointRef.current = point;
    setCurrentPath(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
  }, []);

  // Renderizado con requestAnimationFrame para 60 FPS
  const updateCurrentPath = useCallback(() => {
    if (currentPointsRef.current.length > 0) {
      const smoothPath = pointsToSmoothPath(currentPointsRef.current);
      setCurrentPath(smoothPath);
    }
  }, [pointsToSmoothPath]);

  const handleTouchMove = useCallback((x: number, y: number) => {
    const newPoint = { x, y };
    
    if (shouldAddPoint(newPoint)) {
      currentPointsRef.current.push(newPoint);
      lastPointRef.current = newPoint;
      
      // Usar RAF para actualizaciones suaves a 60fps
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(updateCurrentPath);
    }
  }, [shouldAddPoint, updateCurrentPath]);

  const handleTouchEnd = useCallback(() => {
    if (currentPointsRef.current.length > 1) {
      // USAR REFS para obtener los valores ACTUALES en tiempo real
      const capturedColor = currentColorRef.current;
      const capturedStrokeWidth = currentStrokeWidthRef.current;
      const capturedSelectedPen = selectedPenRef.current;
      const capturedIsEraser = isEraserRef.current;
      const capturedBackgroundColor = backgroundColorRef.current;
      
      console.log('🎨 === INICIANDO FINALIZACIÓN DE TRAZO ===');
      console.log('📊 Puntos capturados:', currentPointsRef.current.length);
      console.log('🖌️ Tipo de pen:', capturedSelectedPen === 0 ? 'Normal' : capturedSelectedPen === 1 ? 'Telestrator' : 'Highlighter');
      console.log('🎨 Color:', capturedColor);
      console.log('📏 Grosor:', capturedStrokeWidth);
      console.log('🧽 Es borrador:', capturedIsEraser);
      
      // Para highlighter, cerrar el path para crear área rellena
      const isHighlighter = capturedSelectedPen === 2;
      const finalPath = pointsToSmoothPath(currentPointsRef.current, isHighlighter);
      
      // Determinar color y grosor según configuración capturada
      let pathColor: string;
      let pathStrokeWidth: number;
      
      if (capturedIsEraser) {
        pathColor = '#f9f9f9'; // Gris del fondo de la whiteboard
        pathStrokeWidth = capturedStrokeWidth * 4;
      } else {
        switch (capturedSelectedPen) {
          case 1: // Telestrator
            pathColor = 'red';
            pathStrokeWidth = 2;
            break;
          case 2: // Highlighter
            pathColor = 'yellow';
            pathStrokeWidth = capturedStrokeWidth;
            break;
          default: // Normal pen
            pathColor = capturedColor;
            pathStrokeWidth = capturedStrokeWidth;
            break;
        }
      }
      
      const newPath: PathData = {
        id: `path-${gymnastId}-${pathIdCounterRef.current++}-${Date.now()}`,
        d: finalPath,
        color: pathColor,
        width: pathStrokeWidth,
        penType: capturedSelectedPen,
        isEraser: capturedIsEraser,
      };
      
      console.log('✅ Path creado con ID:', newPath.id);
      console.log('🎨 Color final:', pathColor);
      console.log('📏 Grosor final:', pathStrokeWidth);
      console.log('✨ === TRAZO COMPLETADO Y AÑADIDO ===');
      
      setPaths(prev => [...prev, newPath]);
      setCurrentPath('');
      currentPointsRef.current = [];
      lastPointRef.current = null;
      debouncedSave();
    } else {
      console.log('❌ Trazo cancelado - Muy pocos puntos:', currentPointsRef.current.length);
      setCurrentPath('');
      currentPointsRef.current = [];
      lastPointRef.current = null;
    }
  }, [gymnastId, pointsToSmoothPath, debouncedSave]);

  // Funciones para los botones
  const toggleMenu = useCallback(() => {
    setMenuOpen(!menuOpen);
  }, [menuOpen]);

  const handleUndo = useCallback(() => {
    if (paths.length > 0) {
      const lastPath = paths[paths.length - 1];
      setUndoStack(prev => [...prev, lastPath]);
      setPaths(prev => prev.slice(0, -1));
      debouncedSave();
    }
  }, [paths, debouncedSave]);

  const handleRedo = useCallback(() => {
    if (undoStack.length > 0) {
      const pathToRedo = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      setPaths(prev => [...prev, pathToRedo]);
      debouncedSave();
    }
  }, [undoStack, debouncedSave]);

  const toggleEraser = useCallback(() => {
    if (!isEraser) {
      // Activar eraser
      if (selectedPen !== 0) {
        setSelectedPen(0);
      }
      setPreviousStrokeWidth(currentStrokeWidth);
      setCurrentStrokeWidth(Math.min(10, 15));
      setIsEraser(true);
    } else {
      // Desactivar eraser - restaurar color y grosor previo
      setCurrentStrokeWidth(previousStrokeWidth);
      setCurrentColor(normalPenColor);
      setIsEraser(false);
    }
  }, [isEraser, selectedPen, normalPenColor, currentStrokeWidth, previousStrokeWidth]);

  const toggleInputMode = () => {
    const newMode = inputMode === 'pen' ? 'finger' : 'pen';
    setInputMode(newMode);
    globalInputMode = newMode;
  };

  const changeColor = useCallback(async (color: string) => {
    setCurrentColor(color);
    if (selectedPen === 0) {
      setNormalPenColor(color);
      await updateGlobalPenConfig({ color });
    }
  }, [selectedPen]);

  const changeStrokeWidth = useCallback(async (width: number) => {
    setCurrentStrokeWidth(width);
    if (selectedPen === 0 && !isEraser) {
      await updateGlobalPenConfig({ strokeWidth: width });
    }
  }, [selectedPen, isEraser]);

  const selectNormalPen = useCallback(async () => {
    if (isEraser) {
      setCurrentStrokeWidth(previousStrokeWidth);
    }
    setSelectedPen(0);
    setCurrentColor('black');
    setIsEraser(false);
    await updateGlobalPenConfig({ 
      penType: 0, 
      color: 'black',
      strokeWidth: isEraser ? previousStrokeWidth : currentStrokeWidth
    });
  }, [isEraser, previousStrokeWidth, currentStrokeWidth]);

  const selectRedPen = useCallback(async () => {
    if (isEraser) {
      setCurrentStrokeWidth(previousStrokeWidth);
    }
    setSelectedPen(0);
    setCurrentColor('red');
    setIsEraser(false);
    await updateGlobalPenConfig({ 
      penType: 0, 
      color: 'red',
      strokeWidth: isEraser ? previousStrokeWidth : currentStrokeWidth
    });
  }, [isEraser, previousStrokeWidth, currentStrokeWidth]);

  const selectBluePen = useCallback(async () => {
    if (isEraser) {
      setCurrentStrokeWidth(previousStrokeWidth);
    }
    setSelectedPen(0);
    setCurrentColor('blue');
    setIsEraser(false);
    await updateGlobalPenConfig({ 
      penType: 0, 
      color: 'blue',
      strokeWidth: isEraser ? previousStrokeWidth : currentStrokeWidth
    });
  }, [isEraser, previousStrokeWidth, currentStrokeWidth]);

  const selectTelestrator = useCallback(async () => {
    if (isEraser) {
      setPreviousStrokeWidth(currentStrokeWidth);
    }
    if (selectedPen === 0) {
      setNormalPenColor(currentColor);
      await updateGlobalPenConfig({ color: currentColor });
    }
    setSelectedPen(1);
    setCurrentColor('red');
    setCurrentStrokeWidth(2);
    setIsEraser(false);
  }, [selectedPen, currentColor, isEraser, currentStrokeWidth]);

  const selectHighlighter = useCallback(async () => {
    if (isEraser) {
      setPreviousStrokeWidth(currentStrokeWidth);
    }
    if (selectedPen === 0) {
      setNormalPenColor(currentColor);
      await updateGlobalPenConfig({ color: currentColor });
    }
    setSelectedPen(2);
    setCurrentColor('yellow');
    setIsEraser(false);
  }, [selectedPen, currentColor, isEraser, currentStrokeWidth]);

  const toggleStickBonus = useCallback(() => {
    const newStickBonus = !stickBonus;
    if (setStickBonus) {
      // Llamar a la función con el nuevo valor (puede ser setter o función handler)
      setStickBonus(newStickBonus);
    }
  }, [stickBonus, setStickBonus]);

  const handleStrokeBarChange = useCallback(async (event: any) => {
    const { locationX, target } = event.nativeEvent;
    // Obtener el ancho real del slider desde el evento
    const barWidth = event.currentTarget?.clientWidth || 180;
    const percentage = Math.max(0, Math.min(1, locationX / barWidth));
    const newWidth = Math.round(1 + (percentage * 9));
    
    setCurrentStrokeWidth(newWidth);
    await updateGlobalPenConfig({ 
      penType: selectedPen, 
      color: currentColor,
      strokeWidth: newWidth
    });
  }, [selectedPen, currentColor]);

  const pickImageFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para acceder a las fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await addImageToWhiteboard(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo cargar la imagen');
    } finally {
      setShowImagePicker(false);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await addImageToWhiteboard(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    } finally {
      setShowImagePicker(false);
    }
  };

  const addImageToWhiteboard = async (uri: string) => {
    try {
      const centerX = width / 2;
      const centerY = height / 2;
      const imageWidth = 150;
      const imageHeight = 150;

      const newImage: ImageData = {
        id: Date.now(),
        uri: uri,
        x: centerX - imageWidth / 2,
        y: centerY - imageHeight / 2,
        width: imageWidth,
        height: imageHeight,
        rotation: 0,
        scale: 1,
      };

      setImages(prev => [...prev, newImage]);
      await saveImagesToDatabase([...images, newImage]);
    } catch (error) {
      console.error('Error adding image:', error);
      Alert.alert('Error', 'No se pudo agregar la imagen');
    }
  };

  const saveImagesToDatabase = async (imagesToSave: ImageData[]) => {
    try {
      await db.execAsync(`DELETE FROM gymnast_images WHERE gymnast_id = ${gymnastId};`);
      
      if (imagesToSave.length > 0) {
        const values = imagesToSave.map((img, index) => 
          `(${gymnastId}, '${img.uri}', ${img.x}, ${img.y}, ${img.rotation}, ${img.scale}, ${index})`
        ).join(',');
        
        await db.execAsync(`
          INSERT INTO gymnast_images (gymnast_id, image_uri, position_x, position_y, rotation, scale, order_index)
          VALUES ${values};
        `);
      }
    } catch (error) {
      console.error('Error saving images:', error);
    }
  };

  const loadImagesFromDatabase = async () => {
    try {
      const imageRecords = await db.getAllAsync<any>(
        'SELECT * FROM gymnast_images WHERE gymnast_id = ? ORDER BY order_index ASC',
        [gymnastId]
      );

      const loadedImages: ImageData[] = imageRecords.map(record => ({
        id: record.id,
        uri: record.image_uri,
        x: record.position_x,
        y: record.position_y,
        width: 150,
        height: 150,
        rotation: record.rotation || 0,
        scale: record.scale || 1,
      }));

      setImages(loadedImages);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const deleteImage = async (imageId: number) => {
    try {
      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);
      await saveImagesToDatabase(updatedImages);
      setSelectedImageId(null);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const updateImageTransform = (imageId: number, updates: Partial<ImageData>) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, ...updates } : img
    ));
  };

  const resetImageTransform = async (imageId: number) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      const updates = {
        scale: 1,
        rotation: 0,
        width: 150,
        height: 150,
      };
      updateImageTransform(imageId, updates);
      // Guardar en BD después de un pequeño delay
      setTimeout(async () => {
        const updatedImages = images.map(img => 
          img.id === imageId ? { ...img, ...updates } : img
        );
        await saveImagesToDatabase(updatedImages);
      }, 100);
    }
  };

  const calculateDistance = (touch1: any, touch2: any) => {
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calculateAngle = (touch1: any, touch2: any) => {
    return Math.atan2(touch2.pageY - touch1.pageY, touch2.pageX - touch1.pageX);
  };

  const isPointInImage = (x: number, y: number, image: ImageData) => {
    // Calcular el centro de la imagen
    const centerX = image.x + (image.width * image.scale) / 2;
    const centerY = image.y + (image.height * image.scale) / 2;
    
    // Convertir el ángulo de rotación a radianes
    const angleRad = (-image.rotation * Math.PI) / 180;
    
    // Trasladar el punto al sistema de coordenadas de la imagen (con centro en 0,0)
    const translatedX = x - centerX;
    const translatedY = y - centerY;
    
    // Rotar el punto en dirección opuesta a la rotación de la imagen
    const rotatedX = translatedX * Math.cos(angleRad) - translatedY * Math.sin(angleRad);
    const rotatedY = translatedX * Math.sin(angleRad) + translatedY * Math.cos(angleRad);
    
    // Verificar si el punto rotado está dentro del rectángulo sin rotar
    const halfWidth = (image.width * image.scale) / 2;
    const halfHeight = (image.height * image.scale) / 2;
    
    return (
      rotatedX >= -halfWidth &&
      rotatedX <= halfWidth &&
      rotatedY >= -halfHeight &&
      rotatedY <= halfHeight
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        
        // Usar ref para obtener el array actual de imágenes y la imagen seleccionada
        const currentImages = imagesRef.current;
        const currentSelectedId = selectedImageIdRef.current;
        
        // Verificar si ya hay una imagen seleccionada
        if (currentSelectedId !== null) {
          const selectedImage = currentImages.find(img => img.id === currentSelectedId);
          
          // Si tocamos la imagen seleccionada, permitir manipularla
          if (selectedImage && isPointInImage(locationX, locationY, selectedImage)) {
            setIsManipulatingImage(true);
            isManipulatingImageRef.current = true;
            return true;
          } else {
            // Si tocamos fuera de la imagen seleccionada, deseleccionar y permitir dibujar o seleccionar otra
            setSelectedImageId(null);
            selectedImageIdRef.current = null;
            setIsManipulatingImage(false);
            isManipulatingImageRef.current = false;
          }
        }
        
        // Verificar si tocamos una imagen (iterar desde el final para priorizar las de arriba)
        for (let i = currentImages.length - 1; i >= 0; i--) {
          const image = currentImages[i];
          if (isPointInImage(locationX, locationY, image)) {
            // Seleccionar la imagen (sin manipularla aún)
            setSelectedImageId(image.id);
            selectedImageIdRef.current = image.id;
            setIsManipulatingImage(false);
            isManipulatingImageRef.current = false;
            
            // Iniciar timer para long press (eliminar)
            imageGestureRef.current.longPressTimer = setTimeout(() => {
              Alert.alert(
                'Eliminar Imagen',
                '¿Estás seguro de que quieres eliminar esta imagen?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Eliminar', 
                    style: 'destructive',
                    onPress: () => deleteImage(image.id)
                  }
                ]
              );
            }, 2000); // 2000ms (2 segundos) para long press
            
            return true;
          }
        }
        
        // No tocamos ninguna imagen, permitir dibujar
        setIsManipulatingImage(false);
        isManipulatingImageRef.current = false;
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Cancelar long press si hay movimiento
        if (imageGestureRef.current.longPressTimer) {
          clearTimeout(imageGestureRef.current.longPressTimer);
          imageGestureRef.current.longPressTimer = null;
        }
        
        // Si hay una imagen seleccionada y estamos manipulando, permitir el gesto
        const currentlyManipulating = isManipulatingImageRef.current;
        if (currentlyManipulating) {
          return true;
        }
        
        // Activar manipulación si tocamos una imagen seleccionada y movemos
        const { locationX, locationY } = evt.nativeEvent;
        const currentSelectedId = selectedImageIdRef.current;
        const currentImages = imagesRef.current;
        
        if (currentSelectedId !== null) {
          const selectedImage = currentImages.find(img => img.id === currentSelectedId);
          if (selectedImage && isPointInImage(locationX, locationY, selectedImage)) {
            setIsManipulatingImage(true);
            isManipulatingImageRef.current = true;
            return true;
          }
        }
        
        return true;
      },
      onPanResponderGrant: (evt) => {
        // Usar refs para verificar el estado actual
        const currentlyManipulating = isManipulatingImageRef.current;
        const currentSelectedId = selectedImageIdRef.current;

        if (!currentlyManipulating && currentSelectedId === null) {
          // Solo iniciar dibujo si NO hay imagen seleccionada
          const { locationX, locationY } = evt.nativeEvent;
          handleTouchStart(locationX, locationY);
        } else if (currentlyManipulating && currentSelectedId !== null) {
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length === 2) {
            // Iniciar gesto de pinch/rotate
            imageGestureRef.current.initialDistance = calculateDistance(touches[0], touches[1]);
            imageGestureRef.current.initialAngle = calculateAngle(touches[0], touches[1]);
            const image = imagesRef.current.find(img => img.id === currentSelectedId);
            if (image) {
              imageGestureRef.current.initialScale = image.scale;
              imageGestureRef.current.initialRotation = image.rotation;
            }
          }
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        // Usar refs para el estado actual
        const currentlyManipulating = isManipulatingImageRef.current;
        const currentSelectedId = selectedImageIdRef.current;
        
        if (!currentlyManipulating && currentSelectedId === null) {
          // Solo dibujar si NO hay imagen seleccionada
          const { locationX, locationY } = evt.nativeEvent;
          handleTouchMove(locationX, locationY);
        } else if (currentlyManipulating && currentSelectedId !== null) {
          const touches = evt.nativeEvent.touches;
          
          if (touches && touches.length === 2) {
            // Pinch para escalar y rotar
            const currentDistance = calculateDistance(touches[0], touches[1]);
            const currentAngle = calculateAngle(touches[0], touches[1]);
            
            const scaleChange = currentDistance / imageGestureRef.current.initialDistance;
            const newScale = Math.max(0.3, Math.min(3, imageGestureRef.current.initialScale * scaleChange));
            
            const angleChange = currentAngle - imageGestureRef.current.initialAngle;
            const newRotation = imageGestureRef.current.initialRotation + (angleChange * 180 / Math.PI);
            
            updateImageTransform(currentSelectedId, {
              scale: newScale,
              rotation: newRotation
            });
          } else {
            // Mover con un dedo
            const image = imagesRef.current.find(img => img.id === currentSelectedId);
            if (image) {
              updateImageTransform(currentSelectedId, {
                x: gestureState.moveX - (image.width * image.scale) / 2,
                y: gestureState.moveY - (image.height * image.scale) / 2,
              });
            }
          }
        }
      },
      onPanResponderRelease: (evt) => {
        // Cancelar long press
        if (imageGestureRef.current.longPressTimer) {
          clearTimeout(imageGestureRef.current.longPressTimer);
          imageGestureRef.current.longPressTimer = null;
        }

        const currentlyManipulating = isManipulatingImageRef.current;
        const currentSelectedId = selectedImageIdRef.current;

        if (!currentlyManipulating && currentSelectedId === null) {
          handleTouchEnd();
        } else if (currentlyManipulating && currentSelectedId !== null) {
          // Guardar transformación en BD
          saveImagesToDatabase(imagesRef.current);
          
          // Detectar doble tap para resetear
          const now = Date.now();
          const timeSinceLastTap = now - imageGestureRef.current.lastTapTime;
          
          if (timeSinceLastTap < 300) {
            // Doble tap - resetear transformación
            resetImageTransform(currentSelectedId);
          }
          
          imageGestureRef.current.lastTapTime = now;
          
          // Dejar la imagen seleccionada pero no en estado de manipulación
          setIsManipulatingImage(false);
          isManipulatingImageRef.current = false;
        }
      },
      onPanResponderTerminate: () => {
        // Cancelar long press
        if (imageGestureRef.current.longPressTimer) {
          clearTimeout(imageGestureRef.current.longPressTimer);
          imageGestureRef.current.longPressTimer = null;
        }

        const currentlyManipulating = isManipulatingImageRef.current;
        const currentSelectedId = selectedImageIdRef.current;

        if (!currentlyManipulating && currentSelectedId === null) {
          handleTouchEnd();
        } else {
          setIsManipulatingImage(false);
          isManipulatingImageRef.current = false;
        }
      },
    })
  ).current;

  if (!isLoaded) {
    return (
      <View style={[styles.container, { width, height, backgroundColor }]}>
        <View style={styles.loadingContainer} />
      </View>
    );
  }

  // Determinar color y grosor en vivo para el path actual
  let liveColor = isEraser ? '#f9f9f9' : selectedPen === 1 ? 'red' : selectedPen === 2 ? 'yellow' : currentColor;
  let liveStrokeWidth = isEraser ? currentStrokeWidth * 4 : selectedPen === 1 ? 2 : currentStrokeWidth;

  return (
    <View style={[styles.container, { width, height, backgroundColor }]}>
      <View {...panResponder.panHandlers} style={styles.drawingArea}>
        <Svg 
          width={width} 
          height={height} 
          style={styles.svg}
        >
          <G>
            {/* Capa 1: Todos los paths (pens y borrador) en el ORDEN que fueron dibujados */}
            {paths.map((path) => {
              const isHighlighter = path.penType === 2 && !path.isEraser;
              const isEraser = path.isEraser;
              
              if (isHighlighter) {
                // Highlighter: relleno amarillo
                return (
                  <Path
                    key={path.id}
                    d={path.d}
                    stroke="none"
                    strokeWidth={0}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill={path.color}
                    opacity={0.4}
                  />
                );
              } else {
                // Normal pen, telestrator, o eraser
                return (
                  <Path
                    key={path.id}
                    d={path.d}
                    stroke={path.color}
                    strokeWidth={path.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={1}
                  />
                );
              }
            })}
            
            {/* Capa 2: Path actual mientras se dibuja */}
            {currentPath && (
              <Path
                d={currentPath}
                stroke={selectedPen === 2 ? 'none' : liveColor}
                strokeWidth={selectedPen === 2 ? 0 : liveStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={selectedPen === 2 ? liveColor : 'none'}
                opacity={selectedPen === 2 ? 0.4 : 1}
              />
            )}
            
            {/* Capa 3: Imágenes del usuario (SIEMPRE ENCIMA, nunca afectadas por borrador) */}
            {images.map((img) => {
              return (
                <G key={img.id}>
                  <SvgImage
                    x={img.x}
                    y={img.y}
                    width={img.width * img.scale}
                    height={img.height * img.scale}
                    href={{ uri: img.uri }}
                    preserveAspectRatio="xMidYMid meet"
                    rotation={img.rotation}
                    origin={`${img.x + (img.width * img.scale) / 2}, ${img.y + (img.height * img.scale) / 2}`}
                    opacity={1}
                  />
                </G>
              );
            })}
          </G>
        </Svg>
      </View>

      {/* Menu button */}
      <View style={styles.menuButtonContainer}>
        <TouchableOpacity 
          style={[styles.menuButton, menuOpen && styles.activeButton]}
          onPress={toggleMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* Menu desplegable */}
      {menuOpen && (
        <View style={styles.menuDropdown}>
          <Text style={styles.menuTitle}>Drawing Tools</Text>
          
          {/* Selector de color */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Colors:</Text>
            <View style={styles.colorRow}>
              {['black', 'red', 'blue', 'green', 'orange'].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    currentColor === color && styles.selectedColorButton
                  ]}
                  onPress={() => changeColor(color)}
                />
              ))}
            </View>
          </View>

          {/* Selector de grosor */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Stroke: {currentStrokeWidth}px</Text>
            <View style={styles.strokeRow}>
              {[2, 5, 10, 15].map((width) => (
                <TouchableOpacity
                  key={width}
                  style={[
                    styles.strokeButton,
                    currentStrokeWidth === width && styles.selectedStrokeButton
                  ]}
                  onPress={() => changeStrokeWidth(width)}
                >
                  <View style={[
                    styles.strokeDot,
                    { 
                      width: Math.max(6, width * 1.5), 
                      height: Math.max(6, width * 1.5),
                      borderRadius: Math.max(3, width * 0.75)
                    }
                  ]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selector de tipo de pen */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Pen Type:</Text>
            <View style={styles.penTypeRow}>
              <TouchableOpacity
                style={[
                  styles.penTypeButton,
                  selectedPen === 0 && styles.selectedPenTypeButton
                ]}
                onPress={selectNormalPen}
              >
                <Text style={styles.penTypeIcon}>✏️</Text>
                <Text style={styles.penTypeLabel}>Normal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.penTypeButton,
                  selectedPen === 1 && styles.selectedPenTypeButton
                ]}
                onPress={selectTelestrator}
              >
                <Text style={styles.penTypeIcon}>🖍️</Text>
                <Text style={styles.penTypeLabel}>Telestrator</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.penTypeButton,
                  selectedPen === 2 && styles.selectedPenTypeButton
                ]}
                onPress={selectHighlighter}
              >
                <Text style={styles.penTypeIcon}>⭐</Text>
                <Text style={styles.penTypeLabel}>Highlighter</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón para cerrar menú */}
          <TouchableOpacity 
            style={styles.closeMenuButton}
            onPress={toggleMenu}
          >
            <Text style={styles.closeMenuText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Undo button */}
      <View style={styles.undoButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            paths.length === 0 && styles.disabledButton
          ]}
          onPress={handleUndo}
          disabled={paths.length === 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>↩</Text>
        </TouchableOpacity>
      </View>

      {/* Redo button */}
      <View style={styles.redoButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            undoStack.length === 0 && styles.disabledButton
          ]}
          onPress={handleRedo}
          disabled={undoStack.length === 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>↪</Text>
        </TouchableOpacity>
      </View>

      {/* Eraser button */}
      <View style={styles.eraserButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            isEraser && styles.activeButton
          ]}
          onPress={toggleEraser}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>🧽</Text>
        </TouchableOpacity>
      </View>

      {/* Pen button (black) */}
      <View style={styles.penButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            !isEraser && selectedPen === 0 && currentColor === 'black' && styles.activeButton
          ]}
          onPress={selectNormalPen}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>✏️</Text>
        </TouchableOpacity>
      </View>

      {/* Red Pen button */}
      <View style={styles.redPenButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            !isEraser && currentColor === 'red' && styles.activeButton
          ]}
          onPress={selectRedPen}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>🔴</Text>
        </TouchableOpacity>
      </View>

      {/* Blue Pen button */}
      <View style={styles.bluePenButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            !isEraser && currentColor === 'blue' && styles.activeButton
          ]}
          onPress={selectBluePen}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>🔵</Text>
        </TouchableOpacity>
      </View>

      {/* Stroke Width Control Bar - MOVED TO TOP */}
      <View style={styles.strokeBarContainer}>
        <View style={styles.strokeBar}>
          <View style={styles.strokeIndicator}>
            <View style={[
              styles.strokePreview,
              {
                width: currentStrokeWidth * 2,
                height: currentStrokeWidth * 2,
                backgroundColor: currentColor,
              },
            ]} />
            <Text style={styles.strokeValue}>{String(currentStrokeWidth || 2)}</Text>
          </View>

          <TouchableOpacity
            style={styles.strokeSliderContainer}
            onPress={handleStrokeBarChange}
            activeOpacity={1}
          >
            <View style={styles.strokeSliderTrack}>
              <View
                style={[
                  styles.strokeSliderProgress,
                  { width: `${((currentStrokeWidth - 1) / 9) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.strokeSliderThumb,
                  { left: `${((currentStrokeWidth - 1) / 9) * 100}%` },
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Input mode toggle (pen/finger) */}
      <View style={styles.inputModeButtonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, inputMode === 'pen' && styles.activeButton]}
          onPress={toggleInputMode}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>{inputMode === 'pen' ? '🖊️' : '👆'}</Text>
        </TouchableOpacity>
      </View>

      {/* Add Image button */}
      <View style={styles.imageButtonContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowImagePicker(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>🖼️</Text>
        </TouchableOpacity>
      </View>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.imagePickerOverlay}>
          <View style={styles.imagePickerContainer}>
            <Text style={styles.imagePickerTitle}>Agregar Imagen</Text>
            
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={pickImageFromLibrary}
            >
              <Text style={styles.imagePickerIcon}>📁</Text>
              <Text style={styles.imagePickerButtonText}>Elegir de Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={pickImageFromCamera}
            >
              <Text style={styles.imagePickerIcon}>📷</Text>
              <Text style={styles.imagePickerButtonText}>Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.imagePickerButton, styles.imagePickerCancelButton]}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.imagePickerButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bonus/Stick button - bottom right */}
      <View style={styles.stickButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.stickButton,
            stickBonus && styles.stickButtonActive
          ]}
          onPress={toggleStickBonus}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.stickButtonText}>{discipline ? 'STICK BONUS' : 'BONUS'}</Text>
        </TouchableOpacity>
      </View>

      {/* Percentage display - top right */}
      <View style={styles.deltaContainer}>
        <Text style={styles.deltaText}>{String(percentage !== null && percentage !== undefined ? percentage : '0')}%</Text>
      </View>
    </View>
  );
}));

WhiteboardScreen.displayName = 'WhiteboardScreen';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
  },
  drawingArea: {
    flex: 1,
  },
  svg: {
    backgroundColor: 'transparent',
  },
  // Botones
  menuButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1000,
  },
  menuButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  activeButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
  },
  disabledButton: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 24,
    color: 'white',
  },
  undoButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 10 + (BUTTON_SIZE + BUTTON_GAP) * 1,
    zIndex: 1000,
  },
  redoButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 10 + (BUTTON_SIZE + BUTTON_GAP) * 2,
    zIndex: 1000,
  },
  eraserButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 10 + (BUTTON_SIZE + BUTTON_GAP) * 3,
    zIndex: 1000,
  },
  penButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 10 + (BUTTON_SIZE + BUTTON_GAP) * 4,
    zIndex: 1000,
  },
  redPenButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 10 + (BUTTON_SIZE + BUTTON_GAP) * 5,
    zIndex: 1000,
  },
  bluePenButtonContainer: {
    position: 'absolute',
    top: 10,
    left: 10 + (BUTTON_SIZE + BUTTON_GAP) * 6,
    zIndex: 1000,
  },
  inputModeButtonContainer: {
    position: 'absolute',
    bottom: 70,
    right: 10,
    zIndex: 1000,
  },
  imageButtonContainer: {
    position: 'absolute',
    bottom: 130,
    right: 10,
    zIndex: 1000,
  },
  imagePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  imagePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  imagePickerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePickerCancelButton: {
    backgroundColor: '#999',
  },
  // Menu desplegable
  menuDropdown: {
    position: 'absolute',
    top: 70,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 15,
    minWidth: 300,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 2000,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  menuSection: {
    marginBottom: 15,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  selectedColorButton: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  strokeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  strokeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  selectedStrokeButton: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  strokeDot: {
    backgroundColor: '#333',
    borderRadius: 10,
  },
  closeMenuButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  closeMenuText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  penTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  penTypeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  selectedPenTypeButton: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  penTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  penTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  // Stroke bar - MOVED TO TOP, positioned after blue pen button - RESPONSIVE
  strokeBarContainer: {
    position: 'absolute',
    top: 10,
    left: 10 + (BUTTON_SIZE + BUTTON_GAP) * 7,
    right: 100,
    maxWidth: SCREEN_WIDTH * 0.225,
    zIndex: 1000,
  },
  strokeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
    gap: 6,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  strokeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strokePreview: {
    borderRadius: 8,
  },
  strokeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    minWidth: 16,
  },
  strokeSliderContainer: {
    flex: 1,
    minWidth: 100,
    maxWidth: 234,
    height: 30,
    justifyContent: 'center',
  },
  strokeSliderTrack: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    position: 'relative',
  },
  strokeSliderProgress: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  strokeSliderThumb: {
    position: 'absolute',
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
    marginLeft: -9,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // Bonus/Stick button
  stickButtonContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 1000,
  },
  stickButton: {
    backgroundColor: 'rgba(158, 158, 158, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  stickButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  stickButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Delta display
  deltaContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  deltaText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WhiteboardScreen;
export { WhiteboardScreen };

// Funciones auxiliares
export const deleteAllTracesForGymnast = async (gymnastId: number): Promise<void> => {
  try {
    await db.runAsync('DELETE FROM whiteboard_traces WHERE gymnast_id = ?', [gymnastId]);
    console.log(`✅ Eliminados todos los traces para gimnasta ${gymnastId}`);
  } catch (error) {
    console.error('❌ Error al eliminar traces:', error);
    throw error;
  }
};

export const getTracesCountForGymnast = async (gymnastId: number): Promise<number> => {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM whiteboard_traces WHERE gymnast_id = ?',
      [gymnastId]
    );
    return result?.count || 0;
  } catch (error) {
    console.error('❌ Error al contar traces:', error);
    return 0;
  }
};
