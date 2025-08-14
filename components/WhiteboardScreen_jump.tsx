import { useRef, useState, Children, useCallback, useEffect } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Animated, Image, Platform } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Path, SkPath, Skia, Canvas, useImage, Image as SkiaImage } from "@shopify/react-native-skia";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateRateGeneral, getRateGeneralByTableId } from '../Database/database';
import VaultSelectorModal from './ModalVaultWag';

// Detectar si estamos en entorno web
const isWeb = Platform.OS === 'web';

// Obtener dimensiones de la pantalla para responsividad
const { width, height } = Dimensions.get("window");

// Variables para determinar el tamaño del dispositivo (como en el original)
var isLargeDevice = false;
var isMediumLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;

if (width >= 1368) {
  isLargeDevice = true;
} else if (width >= 1200 && width < 1368) {
  isMediumLargeDevice = true;
} else if (width >= 960 && width < 1200) {
  isSmallDevice = true;
} else if (width < 960) {
  isTinyDevice = true;
}

// Configuración de layout para botones más compactos
const BUTTON_SIZE = 50; // Tamaño reducido de botones
const BUTTON_GAP = 5; // Separación entre botones
const BUTTON_START_X = 0; // Posición inicial X

// Configuración global del pen (AsyncStorage keys)
const PEN_CONFIG_KEY = '@whiteboard_pen_config';

// Configuración por defecto del pen
const DEFAULT_PEN_CONFIG = {
  color: 'black',
  strokeWidth: 2,
  penType: 0, // 0: Normal, 1: Telestrator, 2: Highlighter
};

// Variable global para mantener la configuración en memoria
let globalPenConfig = { ...DEFAULT_PEN_CONFIG };

// Funciones utilitarias para manejar la configuración global del pen
const loadGlobalPenConfig = async () => {
  try {
    const configString = await AsyncStorage.getItem(PEN_CONFIG_KEY);
    if (configString) {
      const config = JSON.parse(configString);
      globalPenConfig = { ...DEFAULT_PEN_CONFIG, ...config };
      console.log('Loaded pen config:', globalPenConfig);
    }
  } catch (error) {
    console.warn('Error loading pen config:', error);
    globalPenConfig = { ...DEFAULT_PEN_CONFIG };
  }
  return globalPenConfig;
};

const saveGlobalPenConfig = async (config: typeof DEFAULT_PEN_CONFIG) => {
  try {
    globalPenConfig = { ...config };
    await AsyncStorage.setItem(PEN_CONFIG_KEY, JSON.stringify(config));
    console.log('Saved pen config:', config);
  } catch (error) {
    console.warn('Error saving pen config:', error);
  }
};

const updateGlobalPenConfig = async (updates: Partial<typeof DEFAULT_PEN_CONFIG>) => {
  const newConfig = { ...globalPenConfig, ...updates };
  await saveGlobalPenConfig(newConfig);
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
  setStickBonus?: Function;
  percentage?: number;
  oncodetable?: () => void; // Función para abrir vault table
  discipline?: boolean; // Prop to control stick bonus visibility
  onLoaded?: () => void; // Callback para indicar que todo está listo
}

// Calcular altura del canvas basado en el tamaño del dispositivo (como en jump original)
const canvasHeight = (() => {
  console.log("Screen dimensions:", { width, height });
  
  let canvasHeight = 300; // Altura base
  
  if (isLargeDevice) {
    canvasHeight = 720; // Dispositivos grandes
  } else if (isMediumLargeDevice) {
    canvasHeight = 650; // Dispositivos medianos grandes
  } else if (isSmallDevice) {
    canvasHeight = 650; // Dispositivos pequeños
  } else if (isTinyDevice) {
    canvasHeight = 350; // Dispositivos muy pequeños
  }
  
  console.log("Canvas height for jump:", canvasHeight);
  
  return canvasHeight;
})();

const DrawingCanvas = ({ 
  rateGeneralId = 0, 
  tableId, 
  stickBonus = false, 
  setStickBonus = () => {}, 
  percentage = 0,
  oncodetable,
  discipline = false,
  onLoaded
}: WhiteboardProps) => {
  // Cargar imagen de fondo usando Skia
  const backgroundImage = useImage(require('../assets/images/Jump.png'));
  
  const currentPath = useRef<SkPath | null>(null);
  const [paths, setPaths] = useState<SkPath[]>([]);
  const [pathsData, setPathsData] = useState<PathData[]>([]);
  const [currentPathDisplay, setCurrentPathDisplay] = useState<SkPath | null>(null);
  const isDrawingRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Estados para los botones con límites de memoria
  const [undoStack, setUndoStack] = useState<PathData[]>([]);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  
  // Estado para el modal de vault
  const [vaultModalVisible, setVaultModalVisible] = useState<boolean>(false);
  
  // Estados para configuración de pen/eraser
  const [currentColor, setCurrentColor] = useState<string>(globalPenConfig.color); // Usar configuración global
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(globalPenConfig.strokeWidth); // Usar configuración global
  const [selectedPen, setSelectedPen] = useState<number>(globalPenConfig.penType); // Usar configuración global
  const [normalPenColor, setNormalPenColor] = useState<string>(globalPenConfig.color); // Recordar color del pen normal
  const [previousStrokeWidth, setPreviousStrokeWidth] = useState<number>(globalPenConfig.strokeWidth); // Recordar grosor antes del eraser
  
  // Estado para el modo de entrada: 'pen' o 'finger'
  const [inputMode, setInputMode] = useState('pen');
  useEffect(() => {
    const loadInputMode = async () => {
      try {
        const saved = await AsyncStorage.getItem('inputMode');
        if (saved) {
          setInputMode(saved);
        } else {
          setInputMode(isTinyDevice ? 'finger' : 'pen');
        }
      } catch (e) {
        setInputMode(isTinyDevice ? 'finger' : 'pen');
      }
    };
    loadInputMode();
  }, [isTinyDevice]);

  const toggleInputMode = async () => {
    const newMode = inputMode === 'pen' ? 'finger' : 'pen';
    setInputMode(newMode);
    await AsyncStorage.setItem('inputMode', newMode);
  };

  // Límites para optimización de memoria
  const MAX_UNDO_STACK = 20; // Limitar a 50 acciones de undo
  const MAX_PATHS_MEMORY = 500; // Limitar paths en memoria
  
    const getButtonOffset = (index: number) => {
    if (isTinyDevice) {
      // Ejemplo: primer botón *1.2, segundo *1.4, tercero *1.6, etc.
      const factors = [1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6];
      return BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * factors[index];
    }
    return BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * index;
  };
  
    const menuButtonAnim = useRef(new Animated.Value(10)).current;
  const undoButtonAnim = useRef(new Animated.Value(getButtonOffset(1))).current;
  const redoButtonAnim = useRef(new Animated.Value(getButtonOffset(2))).current;
  const eraserButtonAnim = useRef(new Animated.Value(getButtonOffset(3))).current;
  const penButtonAnim = useRef(new Animated.Value(getButtonOffset(4))).current;
  const redPenButtonAnim = useRef(new Animated.Value(getButtonOffset(5))).current;
  const bluePenButtonAnim = useRef(new Animated.Value(getButtonOffset(6))).current;
  const strokeBarAnim = useRef(new Animated.Value(getButtonOffset(7))).current;
  const stickButtonAnim = useRef(new Animated.Value(10)).current;
  const vaultButtonAnim = useRef(new Animated.Value(10)).current; // Nuevo botón vault

  // Cargar paths guardados al montar el componente
  useEffect(() => {
    let didCancel = false;
    const initializeComponent = async () => {
      // Cargar configuración global del pen
      const config = await loadGlobalPenConfig();
      setCurrentColor(config.color);
      setCurrentStrokeWidth(config.strokeWidth);
      setSelectedPen(config.penType);
      setNormalPenColor(config.color);
      setPreviousStrokeWidth(config.strokeWidth);
      
      // Cargar modo de entrada guardado
      try {
        const savedInputMode = await AsyncStorage.getItem('inputMode');
        if (savedInputMode) {
          setInputMode(savedInputMode);
        } else {
          setInputMode(isTinyDevice ? 'finger' : 'pen');
        }
      } catch (e) {
        setInputMode(isTinyDevice ? 'finger' : 'pen');
      }
      
      // Cargar paths guardados
      await loadSavedPaths();
      // Esperar 1.5s y llamar onLoaded si está definido
      if (onLoaded && !didCancel) {
        setTimeout(() => {
          if (onLoaded && !didCancel) onLoaded();
        }, 1500);
      }
    };
    initializeComponent();
    // Asignar directamente los valores finales de toValue a cada Animated.Value (sin animación)
    return () => {
      didCancel = true;
      // Cleanup: cancelar timers y limpiar memoria
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      cleanup();
    };
  }, [tableId, onLoaded]);

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

  // Guardar paths de manera eficiente con debounce
  const savePaths = useCallback(async (newPathsData: PathData[]) => {
    try {
      // Limitar el número de paths para evitar problemas de memoria (máximo 1000)
      const limitedPaths = newPathsData.slice(-1000);
      
      const pathsString = JSON.stringify(limitedPaths);
      
      const rateData = await getRateGeneralByTableId(tableId);
      if (rateData) {
        await updateRateGeneral(rateData.id, { paths: pathsString });
      }
      
      console.log(`Saved ${limitedPaths.length} paths efficiently`);
    } catch (error) {
      console.error('Error saving paths:', error);
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
      pathStrokeWidth = currentStrokeWidth * 4; // Eraser 4x más grueso
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
      
      // Establecer grosor máximo para eraser (limitado a 10 para que no se salga de la barra)
      setCurrentStrokeWidth(Math.min(10, 15)); // Máximo 10 para mantener dentro del gráfico
      
      setIsEraser(true);
    } else {
      // Desactivando eraser - restaurar grosor previo
      setCurrentStrokeWidth(previousStrokeWidth);
      setIsEraser(false);
    }
  }, [isEraser, selectedPen, currentColor, normalPenColor, currentStrokeWidth, previousStrokeWidth]);

  const toggleStickBonus = useCallback(() => {
    const newStickBonus = !stickBonus;
    if (setStickBonus) {
      setStickBonus(newStickBonus);
    }
  }, [stickBonus, setStickBonus]);

  // Función para abrir vault table
  const openVaultTable = useCallback(() => {
    if (oncodetable) {
      oncodetable(); // Llamar la función original si existe
    } else {
      setVaultModalVisible(true); // O abrir modal local
    }
  }, [oncodetable]);

  // Función para manejar selección de vault
  const handleVaultSelect = useCallback((vault: any, groupId: number, value: number, description: string) => {
    console.log('Vault selected:', { vault, groupId, value, description });
    setVaultModalVisible(false);
    // Aquí puedes agregar lógica adicional para manejar la selección del vault
  }, []);

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
    setCurrentColor('black'); // Siempre usar color negro para el lápiz principal
    setIsEraser(false);
    
    // Guardar configuración global
    await updateGlobalPenConfig({ 
      penType: 0, 
      color: 'black',
      strokeWidth: isEraser ? previousStrokeWidth : currentStrokeWidth
    });
  }, [isEraser, previousStrokeWidth, currentStrokeWidth]);

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

  // Función para seleccionar lápiz rojo
  const selectRedPen = useCallback(async () => {
    // Si estamos en eraser, restaurar grosor previo
    if (isEraser) {
      setCurrentStrokeWidth(previousStrokeWidth);
    }
    
    setSelectedPen(0);
    setCurrentColor('red');
    setIsEraser(false);
    
    // Guardar configuración global
    await updateGlobalPenConfig({ 
      penType: 0, 
      color: 'red',
      strokeWidth: isEraser ? previousStrokeWidth : currentStrokeWidth
    });
  }, [isEraser, previousStrokeWidth, currentStrokeWidth]);

  // Función para seleccionar lápiz azul
  const selectBluePen = useCallback(async () => {
    // Si estamos en eraser, restaurar grosor previo
    if (isEraser) {
      setCurrentStrokeWidth(previousStrokeWidth);
    }
    
    setSelectedPen(0);
    setCurrentColor('blue');
    setIsEraser(false);
    
    // Guardar configuración global
    await updateGlobalPenConfig({ 
      penType: 0, 
      color: 'blue',
      strokeWidth: isEraser ? previousStrokeWidth : currentStrokeWidth
    });
  }, [isEraser, previousStrokeWidth, currentStrokeWidth]);

  // Función para manejar el cambio en la barra de stroke
  const handleStrokeBarChange = useCallback(async (event: any) => {
    const { locationX } = event.nativeEvent;
    const barWidth = 150; // Ancho efectivo más largo (160 - 10 de padding)
    const percentage = Math.max(0, Math.min(1, locationX / barWidth));
    const newWidth = Math.round(1 + (percentage * 9)); // De 1 a 10
    
    setCurrentStrokeWidth(newWidth);
    
    // Guardar configuración global
    await updateGlobalPenConfig({ 
      penType: selectedPen, 
      color: currentColor,
      strokeWidth: newWidth
    });
  }, [selectedPen, currentColor]);

  // Gesture para la barra de stroke
  const strokeSliderGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((event) => {
      const { x } = event;
      const barWidth = 150; // Ancho efectivo más largo (160 - 10 de padding)
      const percentage = Math.max(0, Math.min(1, x / barWidth));
      const newWidth = Math.round(1 + (percentage * 9)); // De 1 a 10
      
      if (newWidth !== currentStrokeWidth) {
        runOnJS(setCurrentStrokeWidth)(newWidth);
      }
    })
    .onEnd(async () => {
      // Guardar configuración al final del gesto
      runOnJS(async () => {
        await updateGlobalPenConfig({ 
          penType: selectedPen, 
          color: currentColor,
          strokeWidth: currentStrokeWidth
        });
      })();
    });

  // Función para suavizar puntos, ahora recibe pointerType
  const addSmoothPoint = (path: SkPath, x: number, y: number, pointerType?: number) => {
    const smoothSteps = (inputMode === 'finger' && pointerType === 0) ? 1 : 3;
    if (lastPoint.current) {
      const lastX = lastPoint.current.x;
      const lastY = lastPoint.current.y;
      const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
      if (distance > 5) {
        const steps = Math.ceil(distance / smoothSteps);
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

  // Gestos de dibujo con lógica de inputMode
  const drawGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onStart((event) => {
      const { x, y, pointerType } = event;
      if (inputMode === 'pen') {
        if (pointerType !== undefined && pointerType === 0) {
          return;
        }
      } else if (inputMode === 'finger') {
        if (pointerType !== undefined && pointerType !== 0 && isTinyDevice) {
          return;
        }
      }
      isDrawingRef.current = true;
      currentPath.current = Skia.Path.Make();
      currentPath.current.moveTo(x, y);
      lastPoint.current = { x, y };
      setCurrentPathDisplay(currentPath.current.copy());
    })
    .onUpdate((event) => {
      const { x, y, pointerType } = event;
      if (inputMode === 'pen') {
        if (pointerType !== undefined && pointerType === 0) {
          return;
        }
      } else if (inputMode === 'finger') {
        if (pointerType !== undefined && pointerType !== 0 && isTinyDevice) {
          return;
        }
      }
      if (currentPath.current && isDrawingRef.current) {
        addSmoothPoint(currentPath.current, x, y, pointerType);
        setCurrentPathDisplay(currentPath.current.copy());
      }
    })
    .onEnd((event) => {
      const { pointerType } = event;
      if (inputMode === 'pen') {
        if (pointerType !== undefined && pointerType === 0) {
          return;
        }
      } else if (inputMode === 'finger') {
        if (pointerType !== undefined && pointerType !== 0 && isTinyDevice) {
          return;
        }
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
          <View style={[styles.canvasContainer, { height: canvasHeight }]}>
            {/* Canvas para dibujar con imagen de fondo integrada */}
            <Canvas style={[styles.canvas, { height: canvasHeight }]}>
              {/* LAYER 1: Normal paths (type 0) - incluye eraser que se ve como gris */}
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
                      opacity={1}
                    />
                  );
                })
              )}

              {/* Current path para pen normal (tipo 0) y eraser - renderizado en LAYER 1 */}
              {currentPathDisplay && (selectedPen === 0 || isEraser) && (
                <Path 
                  path={currentPathDisplay} 
                  color={isEraser ? '#e0e0e0' : currentColor}
                  style="stroke"
                  strokeWidth={isEraser ? currentStrokeWidth * 4 : currentStrokeWidth}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={1}
                />
              )}

              {/* LAYER 2: Imagen de fondo - renderizada por encima de normal paths */}
              {backgroundImage && (() => {
                // Calcular dimensiones para 90% del ancho y centrado
                const imageWidth = width * 0.9; // 90% del ancho total
                const imageX = (width - imageWidth) / 2; // Centrar horizontalmente
                
                return (
                  <SkiaImage
                    image={backgroundImage}
                    x={imageX}
                    y={0}
                    width={imageWidth}
                    height={canvasHeight}
                    fit="contain"
                  />
                );
              })()}

              {/* LAYER 3: Telestrator paths (type 1) - por encima de la imagen */}
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
                      opacity={0.8}
                    />
                  );
                })
              )}

              {/* Current path para telestrator (tipo 1) - renderizado en LAYER 3 */}
              {currentPathDisplay && selectedPen === 1 && !isEraser && (
                <Path 
                  path={currentPathDisplay} 
                  color="red"
                  style="stroke"
                  strokeWidth={2}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={0.8}
                />
              )}

              {/* LAYER 4: Highlighter paths (type 2) - por encima de todo */}
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
                        opacity={0.3}
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
                        opacity={0.5}
                      />
                    </>
                  );
                })
              )}

              {/* Current path para highlighter (tipo 2) - renderizado en LAYER 4 */}
              {currentPathDisplay && selectedPen === 2 && !isEraser && (
                <>
                  <Path 
                    path={currentPathDisplay} 
                    color="yellow"
                    style="fill"
                    opacity={0.3}
                  />
                  <Path 
                    path={currentPathDisplay} 
                    color="yellow"
                    style="stroke"
                    strokeWidth={currentStrokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={0.5}
                  />
                </>
              )}
            </Canvas>
          </View>
        </GestureDetector>

        {/* Stroke Width Control Bar con GestureDetector dentro del GestureHandlerRootView */}
        <Animated.View style={[
          styles.strokeBarContainer,
          { transform: [{ translateX: strokeBarAnim }] }
        ]}>
          <View style={styles.strokeBar}>
            {/* Indicador de grosor actual */}
            <View style={styles.strokeIndicator}>
              <View style={[
                styles.strokePreview, 
                { 
                  width: currentStrokeWidth * 2, 
                  height: currentStrokeWidth * 2,
                  backgroundColor: currentColor 
                }
              ]} />
              <Text style={styles.strokeValue}>{currentStrokeWidth}</Text>
            </View>
            
            {/* Barra interactiva */}
            <GestureDetector gesture={strokeSliderGesture}>
              <TouchableOpacity 
                style={styles.strokeSliderContainer}
                onPress={handleStrokeBarChange}
                activeOpacity={1}
              >
                <View style={styles.strokeSliderTrack}>
                  {/* Progreso de la barra */}
                  <View style={[
                    styles.strokeSliderProgress,
                    { width: `${((currentStrokeWidth - 1) / 9) * 100}%` }
                  ]} />
                  {/* Indicador circular */}
                  <View style={[
                    styles.strokeSliderThumb,
                    { left: `${((currentStrokeWidth - 1) / 9) * 100}%` }
                  ]} />
                </View>
              </TouchableOpacity>
            </GestureDetector>
          </View>
        </Animated.View>
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
            !isEraser && selectedPen === 0 && currentColor === 'black' && styles.activeButton
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
            !isEraser && currentColor === 'red' && styles.activeButton
          ]}
          onPress={selectRedPen}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>🔴</Text>
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
            !isEraser && currentColor === 'blue' && styles.activeButton
          ]}
          onPress={selectBluePen}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>🔵</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Stick Bonus button - bottom right */}
      {discipline && (
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
      )}

      {/* Vault Table button - bottom left */}
      <Animated.View style={[
        styles.vaultButtonContainer,
        { transform: [{ translateY: vaultButtonAnim }] }
      ]}>
        <TouchableOpacity 
          style={styles.vaultButton}
          onPress={openVaultTable}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.vaultButtonText}>VAULT TABLE</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Percentage display */}
      <Text style={styles.percentageText}>{percentage}</Text>

      {/* Vault Modal */}
      <VaultSelectorModal
        visible={vaultModalVisible}
        onClose={() => setVaultModalVisible(false)}
        onSelect={handleVaultSelect}
      />

      {/* Botón de alternancia pen/finger en la UI */}
      <Animated.View style={[styles.toggleInputModeButtonContainer]}> 
        <TouchableOpacity 
          style={[styles.actionButton, inputMode === 'finger' && { backgroundColor: '#d1e7dd' }]} 
          onPress={toggleInputMode}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.buttonText}>{inputMode === 'pen' ? '✍️' : '🖐️'}</Text>
        </TouchableOpacity>
      </Animated.View>
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
  canvasContainer: {
    width: '100%',
    position: 'relative',
  },
  canvas: {
    width: '100%',
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
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
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 1, // Botón 1
    zIndex: 1000,
  },
  redoButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 2, // Botón 2
    zIndex: 1000,
  },
  eraserButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 3, // Botón 3
    zIndex: 1000,
  },
  penButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 4, // Botón 4
    zIndex: 1000,
  },
  // Stick bonus button - bottom right
  stickButtonContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 1000,
  },
  // Vault button - bottom left
  vaultButtonContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
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
  // Estilos específicos para vault button
  vaultButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#007BFF', // Azul para vault
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
  vaultButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
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
    fontSize: 8,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  // Red Pen button
  redPenButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 5, // Botón 5
    zIndex: 1000,
  },
  // Blue Pen button
  bluePenButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 6, // Botón 6
    zIndex: 1000,
  },
  // Stroke Width Control Bar
  strokeBarContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + (BUTTON_SIZE + BUTTON_GAP) * 7, // A la derecha de los botones de colores
    zIndex: 1000,
  },
  strokeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 160, // Ancho mínimo más grande para la barra
  },
  // Estilos para la nueva barra interactiva de stroke
  strokeIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    minWidth: 40,
  },
  strokePreview: {
    borderRadius: 10,
    marginBottom: 2,
  },
  strokeValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  strokeSliderContainer: {
    width: 160, // Hacer la barra más larga
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  strokeSliderTrack: {
    height: 8,
    backgroundColor: 'rgba(200, 200, 200, 0.8)',
    borderRadius: 4,
    position: 'relative',
  },
  strokeSliderProgress: {
    height: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  strokeSliderThumb: {
    position: 'absolute',
    top: -5,
    width: 18,
    height: 18,
    backgroundColor: '#4CAF50',
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginLeft: -9, // Centrar el thumb
  },
  toggleInputModeButtonContainer: {
    position: 'absolute',
    right: 10,
    top: 60,
    zIndex: 10,
  },
});

export default DrawingCanvas;