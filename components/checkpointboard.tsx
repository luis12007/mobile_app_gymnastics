import { useRef, useState, Children, useCallback, useEffect } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Animated, Alert } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Path, SkPath, Skia, Canvas } from "@shopify/react-native-skia";
import { updateRateGeneral, getRateGeneralByTableId } from '../Database/database';

// Obtener dimensiones de la pantalla para responsividad
const { width, height: screenHeight } = Dimensions.get("window");

// Configuración de layout para botones más compactos
const BUTTON_SIZE = 50; // Tamaño reducido de botones
const BUTTON_GAP = 0; // Separación entre botones (más cercanos)
const BUTTON_START_X = 0; // Posición inicial X
const STROKE_BAR_WIDTH = 120; // Ancho de la barra de stroke

// Configuración global del pen (en memoria, se resetea al cerrar app)
const PEN_CONFIG_KEY = '@whiteboard_pen_config';

// Configuración por defecto del pen
const DEFAULT_PEN_CONFIG = {
  color: 'black',
  strokeWidth: 2,
  penType: 0, // 0: Normal, 1: Telestrator, 2: Highlighter
};

// Variable global para mantener la configuración en memoria
let globalPenConfig = { ...DEFAULT_PEN_CONFIG };

// Funciones utilitarias para manejar la configuración global del pen (solo en memoria)
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

// Interfaces
interface PathData {
  path: string;
  color: string;
  strokeWidth: number;
  isEraser?: boolean;
  penType?: number; // 0: Normal, 1: Telestrator, 2: Highlighter
}

interface WhiteboardProps {
  rateGeneralId?: number;
  tableId: number;
  stickBonus?: boolean;
  setStickBonusset?: Function;
  percentage?: number;
}

// Calcular altura del canvas optimizada para el contexto del padre
const canvasHeight = (() => {
  console.log("Screen dimensions:", { width, height: screenHeight });
  
  // Usar una altura fija más visible para debug
  let canvasHeight = 300; // Altura base visible
  
  if (width >= 1368 && screenHeight >= 1025) {
    canvasHeight = 720; // Dispositivos grandes
  } else if (width >= 945 && screenHeight >= 700) {
    canvasHeight = 640; // Dispositivos medianos
  } else {
    canvasHeight = 450; // Dispositivos pequeños
  }
  
  console.log("Canvas height (fixed for visibility):", canvasHeight);
  
  return canvasHeight;
})();

const DrawingCanvas = ({ 
  rateGeneralId = 0, 
  tableId, 
  stickBonus = false, 
  setStickBonusset, 
  percentage = 0 
}: WhiteboardProps) => {
  const currentPath = useRef<SkPath | null>(null);
  const [paths, setPaths] = useState<SkPath[]>([]);
  const [pathsData, setPathsData] = useState<PathData[]>([]);
  const [currentPathDisplay, setCurrentPathDisplay] = useState<SkPath | null>(null);
  const isDrawingRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Estados para el indicador de guardado
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Estados para los botones con límites de memoria
  const [undoStack, setUndoStack] = useState<PathData[]>([]);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  
  // Estados para configuración de pen/eraser
  const [currentColor, setCurrentColor] = useState<string>(globalPenConfig.color); // Usar configuración global
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(globalPenConfig.strokeWidth); // Usar configuración global
  const [selectedPen, setSelectedPen] = useState<number>(globalPenConfig.penType); // Usar configuración global
  const [normalPenColor, setNormalPenColor] = useState<string>(globalPenConfig.color); // Recordar color del pen normal
  const [previousStrokeWidth, setPreviousStrokeWidth] = useState<number>(globalPenConfig.strokeWidth); // Recordar grosor antes del eraser
  
  // Límites para optimización de memoria
  const MAX_UNDO_STACK = 20; // Limitar a 50 acciones de undo
  const MAX_PATHS_MEMORY = 500; // Limitar paths en memoria
  
  // Animaciones para los botones (más cercanos)
  const menuButtonAnim = useRef(new Animated.Value(-60)).current;
  const undoButtonAnim = useRef(new Animated.Value(-60)).current;
  const redoButtonAnim = useRef(new Animated.Value(-60)).current;
  const eraserButtonAnim = useRef(new Animated.Value(-60)).current;
  const penButtonAnim = useRef(new Animated.Value(-60)).current;
  const redPenButtonAnim = useRef(new Animated.Value(-60)).current;
  const bluePenButtonAnim = useRef(new Animated.Value(-60)).current;
  const strokeBarAnim = useRef(new Animated.Value(-60)).current;
  const stickButtonAnim = useRef(new Animated.Value(60)).current;

  // Cargar paths guardados al montar el componente
  useEffect(() => {
    const initializeComponent = async () => {
      // Cargar configuración global del pen
      const config = await loadGlobalPenConfig();
      
      // Actualizar estados con la configuración cargada
      setCurrentColor(config.color);
      setCurrentStrokeWidth(config.strokeWidth);
      setSelectedPen(config.penType);
      setNormalPenColor(config.color);
      setPreviousStrokeWidth(config.strokeWidth);
      
      // Cargar paths guardados
      loadSavedPaths();
    };
    
    initializeComponent();
    
    // Animaciones de entrada para los botones (posiciones corregidas)
    Animated.parallel([
      Animated.timing(menuButtonAnim, {
        toValue: 10,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(undoButtonAnim, {
        toValue: 65, // Coincide con el estilo
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(redoButtonAnim, {
        toValue: 120, // Coincide con el estilo
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(eraserButtonAnim, {
        toValue: 175, // Coincide con el estilo
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(penButtonAnim, {
        toValue: 230, // Coincide con el estilo, sin solapar porcentaje
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(redPenButtonAnim, {
        toValue: 285, // Nuevo botón lápiz rojo
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(bluePenButtonAnim, {
        toValue: 340, // Nuevo botón lápiz azul
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(strokeBarAnim, {
        toValue: 395, // Barra de stroke
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(stickButtonAnim, {
        toValue: 10, // Desde abajo hacia arriba
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
    
    return () => {
      // Cleanup: cancelar timers y limpiar memoria
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      cleanup();
    };
  }, [tableId]);

  // Auto-hide del indicador de guardado después de 3 segundos
  useEffect(() => {
    if (lastSaved) {
      const timer = setTimeout(() => {
        setLastSaved(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  // Función para limpiar memoria mejorada
  const cleanup = useCallback(() => {
    // Limpiar arrays para liberar memoria
    setPaths([]);
    setPathsData([]);
    setCurrentPathDisplay(null);
    currentPath.current = null;
    lastPoint.current = null;
    
    // Limpiar undo stack para liberar memoria
    setUndoStack([]);
    
    // Limpiar timeouts
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // Cargar paths desde la base de datos
  const loadSavedPaths = useCallback(async () => {
    try {
      const rateData = await getRateGeneralByTableId(tableId);
      
      if (rateData && rateData.paths) {
        try {
          const savedPathsData: PathData[] = JSON.parse(rateData.paths);
          
          // Convertir pathsData a SkPath objects de manera eficiente
          const skPaths: SkPath[] = [];
          
          savedPathsData.forEach((pathData) => {
            try {
              const path = Skia.Path.MakeFromSVGString(pathData.path);
              if (path) {
                skPaths.push(path);
              }
            } catch (error) {
              console.warn('Error loading path:', error);
            }
          });
          
          setPathsData(savedPathsData);
          setPaths(skPaths);
        } catch (parseError) {
          console.warn('Error parsing saved paths:', parseError);
          setPathsData([]);
          setPaths([]);
        }
      }
    } catch (error) {
      console.error('Error loading paths:', error);
    }
  }, [tableId]);

  // Guardar paths de manera eficiente con debounce y transaccional
  const savePaths = useCallback(async (newPathsData: PathData[]) => {
    setIsSaving(true);
    try {
      // Limitar el número de paths para evitar problemas de memoria (máximo 1000)
      const limitedPaths = newPathsData.slice(-1000);
      
      const pathsString = JSON.stringify(limitedPaths);
      
      const rateData = await getRateGeneralByTableId(tableId);
      if (!rateData) {
        throw new Error('No se encontró el registro de RateGeneral');
      }

      const success = await updateRateGeneral(rateData.id, { paths: pathsString });
      
      if (!success) {
        throw new Error('Error al guardar los trazos en la base de datos');
      }

      setLastSaved(new Date());
      console.log(`✅ Guardados ${limitedPaths.length} trazos correctamente`);
    } catch (error) {
      console.error('❌ Error al guardar trazos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al guardar';
      
      Alert.alert(
        'Error al guardar',
        `No se pudieron guardar los trazos: ${errorMessage}`,
        [
          {
            text: 'Reintentar',
            onPress: () => savePaths(newPathsData)
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsSaving(false);
    }
  }, [tableId]);

  // Guardar con debounce para evitar demasiadas escrituras
  const debouncedSave = useCallback((newPathsData: PathData[]) => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      savePaths(newPathsData);
    }, 1000); // Esperar 1 segundo antes de guardar
  }, [savePaths]);

  const updatePaths = useCallback((newPath: SkPath) => {
    // Obtener configuración actual según el modo y tipo de pen
    let pathColor: string;
    let pathStrokeWidth: number;
    
    if (isEraser) {
      pathColor = '#e0e0e0'; // Eraser usa color de fondo
      pathStrokeWidth = currentStrokeWidth * 3; // Eraser 3x más grueso
    } else {
      // Configuración según el tipo de pen
      switch (selectedPen) {
        case 1: // Telestrator
          pathColor = 'red';
          pathStrokeWidth = 2; // Fijo para telestrator
          break;
        case 2: // Highlighter
          pathColor = 'yellow';
          pathStrokeWidth = currentStrokeWidth;
          break;
        default: // Normal pen
          pathColor = currentColor;
          pathStrokeWidth = currentStrokeWidth;
          break;
      }
    }
    
    // Convertir SkPath a string para guardar
    const pathString = newPath.toSVGString();
    const newPathData: PathData = {
      path: pathString,
      color: pathColor,
      strokeWidth: pathStrokeWidth,
      isEraser: isEraser,
      penType: selectedPen
    };
    
    // Limpiar undo stack cuando se agrega un nuevo path para ahorrar memoria
    if (undoStack.length > 0) {
      setUndoStack([]);
    }
    
    // Actualizar estados con límite de memoria
    setPaths((prevState) => {
      const newPaths = [...prevState, newPath];
      // Limitar paths en memoria para performance
      if (newPaths.length > MAX_PATHS_MEMORY) {
        return newPaths.slice(-MAX_PATHS_MEMORY);
      }
      return newPaths;
    });
    
    setPathsData((prevData) => {
      const newData = [...prevData, newPathData];
      
      // Limitar paths data para performance
      const limitedData = newData.length > MAX_PATHS_MEMORY 
        ? newData.slice(-MAX_PATHS_MEMORY) 
        : newData;
      
      // Guardar de manera asíncrona con debounce
      debouncedSave(limitedData);
      
      return limitedData;
    });
  }, [debouncedSave, isEraser, undoStack.length, currentColor, currentStrokeWidth, selectedPen]);

  // Funciones para los botones con optimización de memoria
  const toggleMenu = useCallback(() => {
    setMenuOpen(!menuOpen);
    // Eliminar animaciones de botones - mantener siempre visibles
  }, [menuOpen]);

  const handleUndo = useCallback(() => {
    if (paths.length > 0 && pathsData.length > 0) {
      const lastPath = pathsData[pathsData.length - 1];
      
      // Agregar al stack de undo con límite de memoria
      setUndoStack(prev => {
        const newStack = [...prev, lastPath];
        // Limitar el tamaño del stack para evitar problemas de memoria
        return newStack.length > MAX_UNDO_STACK 
          ? newStack.slice(-MAX_UNDO_STACK) 
          : newStack;
      });
      
      // Remover el último path
      setPaths(prev => prev.slice(0, -1));
      setPathsData(prev => {
        const newData = prev.slice(0, -1);
        debouncedSave(newData);
        return newData;
      });
    }
  }, [paths.length, pathsData, debouncedSave]);

  const handleRedo = useCallback(() => {
    if (undoStack.length > 0) {
      const pathToRedo = undoStack[undoStack.length - 1];
      
      // Remover del undo stack
      setUndoStack(prev => prev.slice(0, -1));
      
      // Recrear el SkPath y agregarlo
      try {
        const skPath = Skia.Path.MakeFromSVGString(pathToRedo.path);
        if (skPath) {
          setPaths(prev => {
            const newPaths = [...prev, skPath];
            // Aplicar límite de memoria
            return newPaths.length > MAX_PATHS_MEMORY 
              ? newPaths.slice(-MAX_PATHS_MEMORY) 
              : newPaths;
          });
          
          setPathsData(prev => {
            const newData = [...prev, pathToRedo];
            const limitedData = newData.length > MAX_PATHS_MEMORY 
              ? newData.slice(-MAX_PATHS_MEMORY) 
              : newData;
            debouncedSave(limitedData);
            return limitedData;
          });
        }
      } catch (error) {
        console.warn('Error recreating path for redo:', error);
      }
    }
  }, [undoStack, debouncedSave]);

  const toggleEraser = useCallback(() => {
    if (!isEraser) {
      // Activando eraser
      // Validación: si no estamos en pen normal, cambiar a pen normal primero
      if (selectedPen !== 0) {
        // Guardar el color actual si estamos en pen normal
        if (selectedPen === 0) {
          setNormalPenColor(currentColor);
        }
        // Cambiar a pen normal antes de activar eraser
        setSelectedPen(0);
        setCurrentColor(normalPenColor);
      }
      
      // Guardar el grosor actual antes de activar eraser
      setPreviousStrokeWidth(currentStrokeWidth);
      
      // Establecer grosor máximo para eraser (15 es el máximo en nuestro selector)
      setCurrentStrokeWidth(15);
      
      setIsEraser(true);
    } else {
      // Desactivando eraser - restaurar grosor previo
      setCurrentStrokeWidth(previousStrokeWidth);
      setIsEraser(false);
    }
  }, [isEraser, selectedPen, currentColor, normalPenColor, currentStrokeWidth, previousStrokeWidth]);

  const toggleStickBonus = useCallback(() => {
    const newStickBonus = !stickBonus;
    if (setStickBonusset) {
      setStickBonusset(newStickBonus);
    }
  }, [stickBonus, setStickBonusset]);

  // Funciones para cambiar color y grosor del pen/eraser
  const changeColor = useCallback(async (color: string) => {
    setCurrentColor(color);
    // Si estamos en pen normal, recordar este color
    if (selectedPen === 0) {
      setNormalPenColor(color);
      // Guardar globalmente solo para pen normal
      await updateGlobalPenConfig({ color });
    }
  }, [selectedPen]);

  const changeStrokeWidth = useCallback(async (width: number) => {
    setCurrentStrokeWidth(width);
    // Solo guardar globalmente si estamos en pen normal (no en eraser, telestrator o highlighter)
    if (selectedPen === 0 && !isEraser) {
      await updateGlobalPenConfig({ strokeWidth: width });
    }
  }, [selectedPen, isEraser]);

  // Funciones para cambiar tipo de pen
  const selectNormalPen = useCallback(async () => {
    // Si estamos en eraser, restaurar grosor previo
    if (isEraser) {
      setCurrentStrokeWidth(previousStrokeWidth);
    }
    
    setSelectedPen(0);
    setCurrentColor(normalPenColor); // Restaurar color guardado del pen normal
    setIsEraser(false);
    
    // Guardar configuración global
    await updateGlobalPenConfig({ 
      penType: 0, 
      color: normalPenColor,
      strokeWidth: isEraser ? previousStrokeWidth : currentStrokeWidth
    });
  }, [normalPenColor, isEraser, previousStrokeWidth, currentStrokeWidth]);

  const selectTelestrator = useCallback(async () => {
    // Si estamos en eraser, guardar el grosor actual como previo
    if (isEraser) {
      setPreviousStrokeWidth(currentStrokeWidth);
    }
    
    // Si estamos en pen normal, guardar el color actual
    if (selectedPen === 0) {
      setNormalPenColor(currentColor);
      // Actualizar la configuración global con el color del pen normal
      await updateGlobalPenConfig({ color: currentColor });
    }
    setSelectedPen(1);
    setCurrentColor('red');
    setCurrentStrokeWidth(2);
    setIsEraser(false);
  }, [selectedPen, currentColor, isEraser, currentStrokeWidth]);

  const selectHighlighter = useCallback(async () => {
    // Si estamos en eraser, guardar el grosor actual como previo
    if (isEraser) {
      setPreviousStrokeWidth(currentStrokeWidth);
    }
    
    // Si estamos en pen normal, guardar el color actual
    if (selectedPen === 0) {
      setNormalPenColor(currentColor);
      // Actualizar la configuración global con el color del pen normal
      await updateGlobalPenConfig({ color: currentColor });
    }
    setSelectedPen(2);
    setCurrentColor('yellow');
    setIsEraser(false);
  }, [selectedPen, currentColor, isEraser, currentStrokeWidth]);

  // Función para lápiz rojo
  const selectRedPen = useCallback(async () => {
    // Si estamos en eraser, restaurar grosor previo
    if (isEraser) {
      setCurrentStrokeWidth(previousStrokeWidth);
    }
    
    setSelectedPen(0); // Usar tipo pen normal
    setCurrentColor('red');
    setNormalPenColor('red');
    setIsEraser(false);
    
    // Guardar configuración global
    await updateGlobalPenConfig({ 
      penType: 0, 
      color: 'red',
      strokeWidth: isEraser ? previousStrokeWidth : currentStrokeWidth
    });
  }, [isEraser, previousStrokeWidth, currentStrokeWidth]);

  // Función para lápiz azul
  const selectBluePen = useCallback(async () => {
    // Si estamos en eraser, restaurar grosor previo
    if (isEraser) {
      setCurrentStrokeWidth(previousStrokeWidth);
    }
    
    setSelectedPen(0); // Usar tipo pen normal
    setCurrentColor('blue');
    setNormalPenColor('blue');
    setIsEraser(false);
    
    // Guardar configuración global
    await updateGlobalPenConfig({ 
      penType: 0, 
      color: 'blue',
      strokeWidth: isEraser ? previousStrokeWidth : currentStrokeWidth
    });
  }, [isEraser, previousStrokeWidth, currentStrokeWidth]);

  // Función para interpolar puntos y hacer líneas más suaves
  const addSmoothPoint = (path: SkPath, x: number, y: number) => {
    if (lastPoint.current) {
      const lastX = lastPoint.current.x;
      const lastY = lastPoint.current.y;
      
      // Calcular distancia entre puntos
      const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
      
      // Si la distancia es grande, agregar puntos intermedios para suavizar
      if (distance > 5) {
        const steps = Math.ceil(distance / 3); // Más puntos para mayor suavidad
        
        for (let i = 1; i <= steps; i++) {
          const ratio = i / steps;
          const interpX = lastX + (x - lastX) * ratio;
          const interpY = lastY + (y - lastY) * ratio;
          path.lineTo(interpX, interpY);
        }
      } else {
        path.lineTo(x, y);
      }
    }
    
    lastPoint.current = { x, y };
  };

    const drawGesture = Gesture.Pan()
      .runOnJS(true)
      .minDistance(0) // Eliminar el umbral de distancia
      .onStart((event) => {
        const { x, y } = event;
        // Solo permitir dibujo con stylus/pen, no con dedo
        // pointerType: 0 = touch/finger, 1 = pen/stylus, 2 = mouse
        if (event.pointerType !== undefined && event.pointerType === 0) {
          return; // Ignorar toques con dedo
        }
        
        isDrawingRef.current = true;
        currentPath.current = Skia.Path.Make();
        currentPath.current.moveTo(x, y);
        lastPoint.current = { x, y };
        setCurrentPathDisplay(currentPath.current.copy());
      })
      .onUpdate((event) => {
        const { x, y } = event;
        // Solo continuar si no es un dedo
        if (event.pointerType !== undefined && event.pointerType === 0) {
          return;
        }
        
        if (currentPath.current && isDrawingRef.current) {
          addSmoothPoint(currentPath.current, x, y);
          setCurrentPathDisplay(currentPath.current.copy());
        }
      })
      .onEnd((event) => {
        // Solo terminar si no es un dedo
        if (event.pointerType !== undefined && event.pointerType === 0) {
          return;
        }
        
        if (currentPath.current && isDrawingRef.current) {
          runOnJS(updatePaths)(currentPath.current.copy());
          setCurrentPathDisplay(null);
          currentPath.current = null;
          isDrawingRef.current = false;
          lastPoint.current = null;
        }
      });

  return (
    <View style={styles.container}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={drawGesture}>
          <Canvas style={[styles.canvas, { height: canvasHeight }]}>
            {/* Renderizar todos los paths separados por tipo para manejar opacidades */}
            
            {/* Normal paths (type 0) */}
            {Children.toArray(pathsData
              .filter(pathData => pathData.penType === 0 || !pathData.penType)
              .map((pathData, index) => {
                const pathIndex = pathsData.findIndex(p => p === pathData);
                const path = paths[pathIndex];
                if (!path) return null;
                
                const displayColor = pathData.isEraser ? '#e0e0e0' : pathData.color;
                
                return (
                  <Path 
                    key={`normal-${pathIndex}`}
                    path={path} 
                    color={displayColor}
                    style="stroke"
                    strokeWidth={pathData.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={pathData.isEraser ? 1 : 1} // Eraser y normal sin transparencia
                  />
                );
              })
            )}

            {/* Telestrator paths (type 1) */}
            {Children.toArray(pathsData
              .filter(pathData => pathData.penType === 1)
              .map((pathData, index) => {
                const pathIndex = pathsData.findIndex(p => p === pathData);
                const path = paths[pathIndex];
                if (!path) return null;
                
                return (
                  <Path 
                    key={`telestrator-${pathIndex}`}
                    path={path} 
                    color={pathData.color}
                    style="stroke"
                    strokeWidth={pathData.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={0.8} // Telestrator semi-transparente
                  />
                );
              })
            )}

            {/* Highlighter paths (type 2) - con relleno */}
            {Children.toArray(pathsData
              .filter(pathData => pathData.penType === 2)
              .map((pathData, index) => {
                const pathIndex = pathsData.findIndex(p => p === pathData);
                const path = paths[pathIndex];
                if (!path) return null;
                
                return (
                  <>
                    {/* Relleno del highlighter */}
                    <Path 
                      key={`highlighter-fill-${pathIndex}`}
                      path={path} 
                      color={pathData.color}
                      style="fill"
                      opacity={0.3} // Relleno más transparente
                    />
                    {/* Borde del highlighter */}
                    <Path 
                      key={`highlighter-stroke-${pathIndex}`}
                      path={path} 
                      color={pathData.color}
                      style="stroke"
                      strokeWidth={pathData.strokeWidth}
                      strokeCap="round"
                      strokeJoin="round"
                      opacity={0.5} // Borde semi-transparente
                    />
                  </>
                );
              })
            )}

            {/* Current path being drawn */}
            {currentPathDisplay && (
              <>
                {/* Si es highlighter, mostrar relleno + borde */}
                {selectedPen === 2 && !isEraser && (
                  <Path 
                    path={currentPathDisplay} 
                    color="yellow"
                    style="fill"
                    opacity={0.3} // Relleno transparente
                  />
                )}
                {/* Path principal */}
                <Path 
                  path={currentPathDisplay} 
                  color={
                    isEraser ? '#e0e0e0' : 
                    selectedPen === 1 ? 'red' : 
                    selectedPen === 2 ? 'yellow' : 
                    currentColor
                  }
                  style="stroke"
                  strokeWidth={
                    isEraser ? currentStrokeWidth * 3 : 
                    selectedPen === 1 ? 2 : 
                    currentStrokeWidth
                  }
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={
                    isEraser ? 1 : // Eraser completamente opaco
                    selectedPen === 1 ? 0.8 : 
                    selectedPen === 2 ? 0.5 : 
                    1
                  }
                />
              </>
            )}
          </Canvas>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Menu button */}
      <Animated.View style={[
        styles.menuButtonContainer,
        { transform: [{ translateX: menuButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[styles.menuButton, menuOpen && styles.activeButton]}
          onPress={toggleMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>☰</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Menu desplegable responsivo */}
      {menuOpen && (
        <View style={styles.menuDropdown}>
          <Text style={styles.menuTitle}>Herramientas de Dibujo</Text>
          
          {/* Selector de color */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Color:</Text>
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
            <Text style={styles.menuSectionTitle}>Grosor: {currentStrokeWidth}px</Text>
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
            <Text style={styles.menuSectionTitle}>Tipo de Pen:</Text>
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
            <Text style={styles.closeMenuText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Undo button */}
      <Animated.View style={[
        styles.undoButtonContainer,
        { transform: [{ translateX: undoButtonAnim }] }
      ]}>
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
      </Animated.View>

      {/* Redo button */}
      <Animated.View style={[
        styles.redoButtonContainer,
        { transform: [{ translateX: redoButtonAnim }] }
      ]}>
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
      </Animated.View>

      {/* Eraser button */}
      <Animated.View style={[
        styles.eraserButtonContainer,
        { transform: [{ translateX: eraserButtonAnim }] }
      ]}>
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
      </Animated.View>

      {/* Pen button */}
      <Animated.View style={[
        styles.penButtonContainer,
        { transform: [{ translateX: penButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            !isEraser && selectedPen === 0 && styles.activeButton
          ]}
          onPress={selectNormalPen}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>✏️</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Red Pen button */}
      <Animated.View style={[
        styles.redPenButtonContainer,
        { transform: [{ translateX: redPenButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            !isEraser && selectedPen === 0 && currentColor === 'red' && styles.activeButton,
            { backgroundColor: currentColor === 'red' && !isEraser ? 'rgba(244, 67, 54, 0.9)' : 'rgba(255, 255, 255, 0.9)' }
          ]}
          onPress={selectRedPen}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.buttonText, { color: currentColor === 'red' && !isEraser ? 'white' : 'red' }]}>✏️</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Blue Pen button */}
      <Animated.View style={[
        styles.bluePenButtonContainer,
        { transform: [{ translateX: bluePenButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            !isEraser && selectedPen === 0 && currentColor === 'blue' && styles.activeButton,
            { backgroundColor: currentColor === 'blue' && !isEraser ? 'rgba(33, 150, 243, 0.9)' : 'rgba(255, 255, 255, 0.9)' }
          ]}
          onPress={selectBluePen}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.buttonText, { color: currentColor === 'blue' && !isEraser ? 'white' : 'blue' }]}>✏️</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Stroke Width Bar */}
      <Animated.View style={[
        styles.strokeBarContainer,
        { transform: [{ translateX: strokeBarAnim }] }
      ]}>
        <View style={styles.strokeBar}>
          <TouchableOpacity 
            style={styles.strokeControlButton}
            onPress={() => changeStrokeWidth(Math.max(1, currentStrokeWidth - 1))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.strokeControlText}>−</Text>
          </TouchableOpacity>
          
          <View style={styles.strokeDisplay}>
            <Text style={styles.strokeValue}>{currentStrokeWidth}</Text>
            <View style={[
              styles.strokePreview,
              { 
                width: Math.max(4, currentStrokeWidth * 2),
                height: Math.max(4, currentStrokeWidth * 2),
                backgroundColor: isEraser ? '#999' : currentColor
              }
            ]} />
          </View>
          
          <TouchableOpacity 
            style={styles.strokeControlButton}
            onPress={() => changeStrokeWidth(Math.min(20, currentStrokeWidth + 1))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.strokeControlText}>+</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Stick Bonus button - bottom right */}
      <Animated.View style={[
        styles.stickButtonContainer,
        { transform: [{ translateY: stickButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={[
            styles.stickButton,
            stickBonus && styles.stickButtonActive
          ]}
          onPress={toggleStickBonus}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.stickButtonText}>STICK BONUS</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Percentage display */}
      <Text style={styles.percentageText}>{percentage}</Text>

      {/* Indicador de guardado */}
      {(isSaving || lastSaved) && (
        <View style={styles.saveIndicator}>
          <Text style={styles.saveIndicatorText}>
            {isSaving ? '💾 Guardando...' : '✅ Guardado'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
    marginHorizontal: 4,
    minHeight: canvasHeight - 20,
  },
  canvas: {
    width: '100%',
    backgroundColor: '#e0e0e0',
  },
  // Estilos para los botones (posiciones calculadas dinámicamente)
  menuButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X, // Botón 0: posición inicial
    zIndex: 1000,
  },
  undoButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 1.1, // Botón 1: inicio + 1 * (tamaño + gap)
    zIndex: 1000,
  },
  redoButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 2.2, // Botón 2: inicio + 2 * (tamaño + gap)
    zIndex: 1000,
  },
  eraserButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 3.3, // Botón 3: inicio + 3 * (tamaño + gap)
    zIndex: 1000,
  },
  penButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 4.4, // Botón 4: inicio + 4 * (tamaño + gap)
    zIndex: 1000,
  },
  // Red pen button container
  redPenButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 5.5, // Botón 5: después del pen normal
    zIndex: 1000,
  },
  // Blue pen button container
  bluePenButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 6.6, // Botón 6: después del pen rojo
    zIndex: 1000,
  },
  // Stroke bar container
  strokeBarContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 7.7, // Después de los botones de pen
    zIndex: 1000,
  },
  // Stick bonus button - bottom right
  stickButtonContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 1000,
  },
  menuButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  activeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  disabledButton: {
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    opacity: 0.6,
  },
  // Estilos específicos para stick bonus
  stickButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#DC3545',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
  },
  stickButtonActive: {
    backgroundColor: '#3AAA35', // Color verde como el original
  },
  stickButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  percentageText: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    zIndex: 999, // Menor que los botones para no interferir
  },
  // Estilos para el menú desplegable responsivo
  menuDropdown: {
    position: 'absolute',
    top: 70,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1001,
    maxWidth: Math.min(width * 0.8, 400), // Responsivo: máximo 80% del ancho o 400px
    alignSelf: 'center',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  menuSection: {
    marginBottom: 15,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColorButton: {
    borderColor: '#333',
    borderWidth: 3,
  },
  strokeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  strokeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStrokeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderColor: '#333',
  },
  strokeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  strokeDot: {
    backgroundColor: '#333',
    borderRadius: 10,
  },
  closeMenuButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  closeMenuText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Estilos para tipos de pen
  penTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  penTypeButton: {
    flex: 1,
    minWidth: 80,
    padding: 10,
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPenTypeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderColor: '#333',
  },
  penTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  penTypeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  // Estilos para la barra de stroke
  strokeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: STROKE_BAR_WIDTH,
  },
  strokeControlButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  strokeControlText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  strokeDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  strokeValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  strokePreview: {
    borderRadius: 10,
  },
  // Estilos para el indicador de guardado
  saveIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 1000,
  },
  saveIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DrawingCanvas;