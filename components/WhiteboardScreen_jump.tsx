import { useRef, useState, Children, useCallback, useEffect, memo, useMemo } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Animated, Image, Platform, Alert } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView, GestureType } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Path, SkPath, Skia, Canvas, useImage, Image as SkiaImage, Group } from "@shopify/react-native-skia";
import { updateRateGeneral, getRateGeneralByTableId, getMainTableById, updateMainTable, getMainTablePaths, getPhotosForMainTable, addPhotoToMainTable, getPhotoItemsForMainTable, updatePhotoTransformForMainTable, removePhotoFromMainTable } from '../Database/database';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import VaultSelectorModal from './ModalVaultWag';
import { createMountedRef, safeDBOperation, withTimeout, safeLog, safeValidate } from '../utils/crashPrevention';

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
let globalInputMode = '';

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
  setStickBonus?: Function;
  percentage?: number;
  oncodetable?: () => void; // Función para abrir vault table
  discipline?: boolean; // Prop to control stick bonus visibility
  onLoaded?: () => void; // Callback para indicar que todo está listo
}

interface PhotoItem { uri: string; x: number; y: number; scale: number; rotation: number }

// Componente de imagen en Skia memoizado - SIN indicador de activo, control multi-touch directo
const SkiaPhoto = memo(({ item, registerMeta }: { item: PhotoItem; registerMeta: (uri: string, w: number, h: number) => void }) => {
  const img = useImage(item.uri);
  if (!img) return null;
  let bw = img.width();
  let bh = img.height();
  const MAX_W = 400, MAX_H = 400;
  if (bw > MAX_W) { const f = MAX_W / bw; bw = MAX_W; bh *= f; }
  if (bh > MAX_H) { const f = MAX_H / bh; bh = MAX_H; bw *= f; }
  const MIN_W = 90;
  if (bw < MIN_W) { const f = MIN_W / bw; bw = MIN_W; bh *= f; }
  registerMeta(item.uri, bw, bh);
  const scale = item.scale || 1;
  const rot = (item.rotation || 0) * Math.PI / 180;
  return (
    <Group
      transform={[
        { translateX: item.x + (bw * scale) / 2 },
        { translateY: item.y + (bh * scale) / 2 },
        { rotate: rot },
        { scale: scale },
        { translateX: -bw / 2 },
        { translateY: -bh / 2 }
      ]}
    >
      <SkiaImage image={img} x={0} y={0} width={bw} height={bh} fit="contain" />
    </Group>
  );
}, (prev, next) => {
  return prev.item.uri === next.item.uri &&
    prev.item.x === next.item.x &&
    prev.item.y === next.item.y &&
    prev.item.scale === next.item.scale &&
    prev.item.rotation === next.item.rotation;
});

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
  const backgroundImage = useImage(require('../assets/images/Jump1.png'));
  
  const currentPath = useRef<SkPath | null>(null);
  const [paths, setPaths] = useState<SkPath[]>([]);
  const [pathsData, setPathsData] = useState<PathData[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [currentPathDisplay, setCurrentPathDisplay] = useState<SkPath | null>(null);
  const isDrawingRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const photoItemsRef = useRef<PhotoItem[]>([]);
  useEffect(()=>{ photoItemsRef.current = photoItems; },[photoItems]);

  // Metadatos de imagen base (ancho/alto normalizados)
  const [imageMeta, setImageMeta] = useState<Record<string,{w:number;h:number}>>({});
  const registerImageMeta = useCallback((uri:string,w:number,h:number)=>{
    setImageMeta(prev=> prev[uri]? prev : ({...prev,[uri]:{w,h}}));
  },[]);

  // Estados para los botones con límites de memoria
  const [undoStack, setUndoStack] = useState<PathData[]>([]);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  
  // Estado de guardado para indicador visual
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Estado para el modal de vault
  const [vaultModalVisible, setVaultModalVisible] = useState<boolean>(false);
  
  // Estados para configuración de pen/eraser
  const [currentColor, setCurrentColor] = useState<string>(globalPenConfig.color); // Usar configuración global
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(globalPenConfig.strokeWidth); // Usar configuración global
  const [selectedPen, setSelectedPen] = useState<number>(globalPenConfig.penType); // Usar configuración global
  const [normalPenColor, setNormalPenColor] = useState<string>(globalPenConfig.color); // Recordar color del pen normal
  const [previousStrokeWidth, setPreviousStrokeWidth] = useState<number>(globalPenConfig.strokeWidth); // Recordar grosor antes del eraser
  
  // Estado para el modo de entrada: 'pen' o 'finger'
  const [inputMode, setInputMode] = useState(() => {
    // Inicializar desde variable global o por tamaño de dispositivo
    if (globalInputMode) return globalInputMode;
    return isTinyDevice ? 'finger' : 'pen';
  });

  const toggleInputMode = () => {
    const newMode = inputMode === 'pen' ? 'finger' : 'pen';
    setInputMode(newMode);
    globalInputMode = newMode; // Guardar en memoria global
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
      
  // Cargar paths guardados + fotos
  await loadSavedPaths();
  await loadPhotos();
  await loadPhotoItems();
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

  // Auto-ocultar indicador de guardado después de 3 segundos
  useEffect(() => {
    if (lastSaved && !isSaving) {
      const timer = setTimeout(() => {
        setLastSaved(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, isSaving]);

  // Función para limpiar memoria mejorada
  const cleanup = useCallback(async () => {
    // IMPORTANTE: Guardar cambios pendientes de fotos antes de limpiar
    if (photoSaveTimeoutRef.current) {
      clearTimeout(photoSaveTimeoutRef.current);
      photoSaveTimeoutRef.current = null;
    }
    
    // Guardar inmediatamente cualquier cambio pendiente
    const pendingUpdates = Array.from(pendingPhotoUpdatesRef.current.entries());
    if (pendingUpdates.length > 0) {
      console.log(`💾 [Cleanup] Guardando ${pendingUpdates.length} foto(s) pendientes antes de desmontar`);
      
      // Guardar en paralelo para ser más rápido
      await Promise.all(
        pendingUpdates.map(([photoUri, photoUpdates]) => 
          onUpdatePhotoTransform(photoUri, photoUpdates)
        )
      );
      
      pendingPhotoUpdatesRef.current.clear();
    }
    
    // Limpiar arrays para liberar memoria
    setPaths([]);
    setPathsData([]);
    setCurrentPathDisplay(null);
    currentPath.current = null;
    lastPoint.current = null;
    
    // Limpiar undo stack para liberar memoria
    setUndoStack([]);
    
    // Limpiar timeouts de paths
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // Cargar paths desde la base de datos
  const loadSavedPaths = useCallback(async () => {
    return safeDBOperation(async () => {
      const mainTable = await withTimeout(getMainTableById(tableId), 5000);
      if (mainTable) {
        try {
          const pathsString = await withTimeout(getMainTablePaths(mainTable.id), 5000);
          const savedPathsData: PathData[] = JSON.parse(pathsString || '[]');
          
          // Convertir pathsData a SkPath objects de manera eficiente
          const skPaths: SkPath[] = [];
          
          savedPathsData.forEach((pathData) => {
            try {
              const path = Skia.Path.MakeFromSVGString(pathData.path);
              if (path) {
                skPaths.push(path);
              }
            } catch (error) {
              safeLog.warn('Error loading path:', error);
            }
          });
          
          setPathsData(savedPathsData);
          setPaths(skPaths);
        } catch (parseError) {
          safeLog.warn('Error parsing saved paths:', parseError);
          setPathsData([]);
          setPaths([]);
        }
      }
    }, undefined, 'loadSavedPaths');
  }, [tableId]);

  // --- Fotos ---
  const loadPhotos = useCallback(async () => {
    return safeDBOperation(async () => {
      const list = await withTimeout(getPhotosForMainTable(tableId), 5000);
      setPhotos(list);
    }, undefined, 'loadPhotos');
  }, [tableId]);
  const loadPhotoItems = useCallback(async () => {
    try {
      console.log('📸 [loadPhotoItems] Loading photo items for tableId:', tableId);
      const items = await getPhotoItemsForMainTable(tableId);
      console.log('📸 [loadPhotoItems] Loaded', items?.length || 0, 'photo items from DB');
      
      const normalized = items.map((it: any, idx) => {
        const item = { 
          ...it, 
          scale: it.scale && it.scale > 0 ? it.scale : 1, 
          rotation: typeof it.rotation === 'number' ? it.rotation : 0 
        };
        console.log(`📸 [loadPhotoItems] Photo ${idx}:`, {
          uri: item.uri?.substring(0, 50) + '...',
          x: item.x,
          y: item.y,
          scale: item.scale,
          rotation: item.rotation
        });
        return item;
      });
      
      setPhotoItems(normalized);
      console.log('✅ [loadPhotoItems] Photo items state updated with', normalized.length, 'items');
    } catch (e) { 
      console.error('❌ [loadPhotoItems] Error loading photo items:', e);
    }
  }, [tableId]);

  // ✅ FIX iOS: Recargar fotos cuando la pantalla vuelve al foco
  // Esto asegura que las imágenes se carguen correctamente cuando:
  // 1. Vuelves de otra pantalla
  // 2. Cambias de gimnasta
  // 3. La app vuelve al foreground después de estar en background
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [useFocusEffect] Jump screen focused - reloading photos');
      let isMounted = true;
      
      const reloadPhotos = async () => {
        try {
          console.log('📸 [useFocusEffect] Reloading photo items...');
          await loadPhotoItems();
          if (isMounted) {
            console.log('✅ [useFocusEffect] Photo items reloaded successfully');
          }
        } catch (error) {
          console.error('❌ [useFocusEffect] Error reloading photos:', error);
        }
      };
      
      // Ejecutar recarga con un pequeño delay para asegurar que el componente esté listo
      const timer = setTimeout(() => {
        if (isMounted) {
          reloadPhotos();
        }
      }, 100);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
        console.log('🔄 [useFocusEffect] Jump screen unfocused - cleanup');
      };
    }, [loadPhotoItems])
  );

  // Cleanup al desmontar componente: guardar cambios pendientes de fotos
  useEffect(() => {
    return () => {
      // Guardar cambios pendientes antes de desmontar
      const pendingUpdates = Array.from(pendingPhotoUpdatesRef.current.entries());
      if (pendingUpdates.length > 0) {
        console.log(`💾 [Unmount] Guardando ${pendingUpdates.length} foto(s) pendientes`);
        pendingUpdates.forEach(([photoUri, photoUpdates]) => {
          updatePhotoTransformForMainTable(tableId, photoUri, photoUpdates);
        });
        pendingPhotoUpdatesRef.current.clear();
      }
      
      // Limpiar timeout
      if (photoSaveTimeoutRef.current) {
        clearTimeout(photoSaveTimeoutRef.current);
      }
    };
  }, [tableId]);

  // Helpers iOS + logs simplificados en consola (sin persistencia)
  const appendPhotoImportLog = useCallback((entry: Record<string, any>) => {
    const payload = { ts: new Date().toISOString(), platform: Platform.OS, tableId, screen: 'jump', ...entry };
    console.log('[PhotoImport]', payload);
  }, [tableId]);

  const pickImageUriViaDocumentPicker = useCallback(async (): Promise<string | null> => {
    try {
      await appendPhotoImportLog({ step: 'ios_docpicker_start' });
      const res: any = await DocumentPicker.getDocumentAsync({ type: ['image/*'], multiple: false, copyToCacheDirectory: false });
      if ((res && 'canceled' in res && res.canceled) || res?.type === 'cancel') { await appendPhotoImportLog({ step: 'ios_docpicker_canceled' }); return null; }
      const asset = (res as any).assets?.[0] ?? res; const uri = asset?.uri ?? null;
      await appendPhotoImportLog({ step: 'ios_docpicker_selected', assetUri: uri, fileName: asset?.name ?? null, size: asset?.size ?? null, mimeType: asset?.mimeType ?? null });
      return uri;
    } catch (e) {
      const message = (typeof e === 'object' && e && 'message' in e) ? String((e as any).message) : String(e);
      const stack = (typeof e === 'object' && e && 'stack' in e) ? String((e as any).stack) : null;
      await appendPhotoImportLog({ step: 'ios_docpicker_error', message, stack });
      return null;
    }
  }, [appendPhotoImportLog]);

  const handleAddPhoto = useCallback(async () => {
    try {
      await appendPhotoImportLog({ step: 'start', msg: 'Add photo tapped' });

      let pickedUri: string | null = null;
      
      // Mostrar diálogo de selección de origen en Android
      if (Platform.OS === 'android') {
        await appendPhotoImportLog({ step: 'android_show_picker_options' });
        
        // Usar Alert con opciones para elegir entre Galería o Archivos (OneDrive, etc.)
        const pickerChoice = await new Promise<'gallery' | 'files' | null>((resolve) => {
          Alert.alert(
            'Seleccionar imagen',
            '¿De dónde deseas seleccionar la imagen?',
            [
              {
                text: 'Galería',
                onPress: () => resolve('gallery'),
              },
              {
                text: 'Archivos (OneDrive, Drive, etc.)',
                onPress: () => resolve('files'),
              },
              {
                text: 'Cancelar',
                onPress: () => resolve(null),
                style: 'cancel',
              },
            ],
            { cancelable: true, onDismiss: () => resolve(null) }
          );
        });

        if (!pickerChoice) {
          await appendPhotoImportLog({ step: 'picker_choice_canceled' });
          return;
        }

        if (pickerChoice === 'gallery') {
          // Usar ImagePicker para galería
          await appendPhotoImportLog({ step: 'android_gallery_selected' });
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.');
            await appendPhotoImportLog({ step: 'permission_denied' });
            return;
          }
          await appendPhotoImportLog({ step: 'permission_granted' });
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            base64: false,
            quality: 0.8
          });
          if (result.canceled) {
            await appendPhotoImportLog({ step: 'picker_canceled' });
            return;
          }
          const asset = result.assets?.[0];
          await appendPhotoImportLog({ step: 'asset_selected', assetUri: asset?.uri ?? null, fileName: (asset as any)?.fileName ?? null, mimeType: (asset as any)?.mimeType ?? null });
          if (!asset?.uri) {
            await appendPhotoImportLog({ step: 'asset_missing_uri' });
            return;
          }
          pickedUri = asset.uri;
        } else {
          // Usar DocumentPicker para archivos (OneDrive, Drive, etc.)
          await appendPhotoImportLog({ step: 'android_files_selected' });
          pickedUri = await pickImageUriViaDocumentPicker();
        }
      } else if (Platform.OS === 'ios') {
        // iOS: usar DocumentPicker por estabilidad
        pickedUri = await pickImageUriViaDocumentPicker();
      } else {
        // Web: usar ImagePicker
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.');
          await appendPhotoImportLog({ step: 'permission_denied' });
          return;
        }
        await appendPhotoImportLog({ step: 'permission_granted' });
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: false,
          base64: false,
          quality: 0.8
        });
        if (result.canceled) {
          await appendPhotoImportLog({ step: 'picker_canceled' });
          return;
        }
        const asset = result.assets?.[0];
        await appendPhotoImportLog({ step: 'asset_selected', assetUri: asset?.uri ?? null, fileName: (asset as any)?.fileName ?? null, mimeType: (asset as any)?.mimeType ?? null });
        if (!asset?.uri) {
          await appendPhotoImportLog({ step: 'asset_missing_uri' });
          return;
        }
        pickedUri = asset.uri;
      }

      // Pre-validaciones y normalización de URI
      if (!pickedUri) return;
      const ext = getExtFromUri(pickedUri);
      
      // Bloquear HEIC/HEIF en todos los sistemas
      if (isHeic(ext)) {
        Alert.alert('Formato no soportado', 'Las imágenes HEIC/HEIF no son compatibles para exportar. Por favor, selecciona una imagen JPEG o PNG.');
        await appendPhotoImportLog({ step: 'blocked_heic_heif', ext, uri: pickedUri });
        return;
      }
      
      // Copiar a cache para archivos externos (iOS siempre, Android solo si es de DocumentPicker)
      const needsCopy = Platform.OS === 'ios' || 
                        pickedUri.startsWith('content://') || 
                        pickedUri.includes('onedrive') || 
                        pickedUri.includes('drive.google') ||
                        pickedUri.includes('com.microsoft.skydrive') ||
                        !pickedUri.startsWith('file://');
      
      if (needsCopy) {
        const before = pickedUri;
        pickedUri = await copyToAppCache(pickedUri);
        await appendPhotoImportLog({ step: 'copied_to_cache', from: before, to: pickedUri, changed: before !== pickedUri });
      }

      try {
        const info = await FileSystem.getInfoAsync(pickedUri);
        if (!info.exists || (info.size ?? 0) === 0) { Alert.alert('Error','No se pudo acceder a la imagen seleccionada.'); appendPhotoImportLog({ step: 'file_info_invalid', uri: pickedUri, info }); return; }
        if ((info.size ?? 0) > 25*1024*1024) { Alert.alert('Imagen muy grande','La imagen supera 25MB. Selecciona otra más pequeña.'); appendPhotoImportLog({ step: 'file_too_large', size: info.size, uri: pickedUri }); return; }
        appendPhotoImportLog({ step: 'file_info_ok', size: info.size, uri: pickedUri });
      } catch {}

      // Operación transaccional completa: agregar foto y configurar transformación
      const success = await addPhotoToMainTable(tableId, pickedUri);
      appendPhotoImportLog({ step: 'db_add_result', success, uri: pickedUri });
      
      if (!success) {
        throw new Error('No se pudo agregar la foto a la base de datos');
      }
      
      const photoSize = 120;
      const centerX = Math.round((width - photoSize)/2);
      const centerY = Math.round((canvasHeight - photoSize)/2);
      
      // Actualizar transform inicial (operación transaccional)
      const transformSuccess = await updatePhotoTransformForMainTable(tableId, pickedUri, { x: centerX, y: centerY, scale:0.5 });
      
      if (!transformSuccess) {
        throw new Error('No se pudo inicializar la transformación de la foto');
      }
      
      appendPhotoImportLog({ step: 'transform_initialized', x: centerX, y: centerY, scale: 0.5, uri: pickedUri });
      
      await loadPhotos();
      await loadPhotoItems();
      setActivePhoto(pickedUri);
      appendPhotoImportLog({ step: 'success', uri: pickedUri });
      console.log('✅ Foto agregada exitosamente:', pickedUri);
    } catch(e) {
      console.error('❌ handleAddPhoto (jump) error', e);
      const message = (typeof e === 'object' && e && 'message' in e) ? String((e as any).message) : String(e);
      const stack = (typeof e === 'object' && e && 'stack' in e) ? String((e as any).stack) : null;
      appendPhotoImportLog({ step: 'error', message, stack });
      Alert.alert(
        'Error al Agregar Imagen',
        `No se pudo añadir la imagen:\n${message}`,
        [{ text: 'OK' }]
      );
    }
  }, [tableId, loadPhotos, loadPhotoItems]);

  const onUpdatePhotoTransform = useCallback(async (uri:string, data:{x?:number;y?:number;scale?:number;rotation?:number})=>{
    // Guardar estado anterior para posible rollback
    const previousState = photoItemsRef.current.find(p => p.uri === uri);
    
    // Verificar si la foto todavía existe (puede haber sido eliminada)
    const photoExists = photoItemsRef.current.some(p => p.uri === uri);
    if (!photoExists) {
      console.log(`⚠️ Foto ya eliminada, saltando guardado: ${uri}`);
      return;
    }
    
    // IMPORTANTE: Actualizar ref INMEDIATAMENTE (antes de setState) para evitar race conditions
    photoItemsRef.current = photoItemsRef.current.map(p => 
      p.uri === uri ? { ...p, ...data } : p
    );
    
    // Actualizar estado UI inmediatamente (optimistic update)
    setPhotoItems(prev=> prev.map(p=> p.uri===uri? {...p,...data}: p));
    
    try {
      const existing = photoItemsRef.current.find(p=> p.uri===uri);
      const merged: PhotoItem = existing ? { ...existing, ...data } : { uri, x:0, y:0, scale:1, rotation:0, ...data } as PhotoItem;
      if (merged.scale <=0) merged.scale = 1;
      
      // Operación transaccional
      const success = await updatePhotoTransformForMainTable(tableId, uri, { x: merged.x, y: merged.y, scale: merged.scale, rotation: merged.rotation });
      
      if (!success) {
        // Si falla, puede ser porque la foto ya fue eliminada
        const stillExists = photoItemsRef.current.some(p => p.uri === uri);
        if (!stillExists) {
          console.log(`ℹ️ Foto eliminada durante guardado: ${uri}`);
          return; // No mostrar error, es esperado
        }
        throw new Error('La operación de actualización retornó false');
      }
      
      photoItemsRef.current = photoItemsRef.current.map(p=> p.uri===uri? merged: p);
      console.log('✅ Transformación de foto guardada:', { uri, ...data });
    } catch(error) {
      // Verificar si la foto todavía existe antes de mostrar error
      const stillExists = photoItemsRef.current.some(p => p.uri === uri);
      if (!stillExists) {
        console.log(`ℹ️ Error ignorado, foto ya fue eliminada: ${uri}`);
        return;
      }
      
      console.error('❌ Error al guardar transformación de foto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert(
        'Error al Guardar',
        `No se pudo guardar la transformación de la imagen:\n${errorMessage}`,
        [{ text: 'OK' }]
      );
      // Revertir estado UI en caso de error
      if (previousState) {
        setPhotoItems(prev => prev.map(p => p.uri === uri ? previousState : p));
      }
    }
  }, [tableId]);

  

  const ensurePhotosDir = async () => {
    const dir = FileSystem.cacheDirectory + 'photos/';
    try { await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); } catch {}
    return dir;
  };
  const getExtFromUri = (uri: string) => {
    const m = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1].toLowerCase() : 'jpg';
  };
  const isHeic = (ext: string) => ext === 'heic' || ext === 'heif';
  const copyToAppCache = async (srcUri: string): Promise<string> => {
    const dir = await ensurePhotosDir();
    const ext = getExtFromUri(srcUri);
    const filename = `${Date.now()}_${Math.floor(Math.random()*1e6)}.${ext}`;
    const dst = dir + filename;
    try {
      await FileSystem.copyAsync({ from: srcUri, to: dst });
      const info = await FileSystem.getInfoAsync(dst);
      if (info.exists && info.size && info.size > 0) return dst;
    } catch (e) {
      console.warn('copyToAppCache (jump) failed', e);
    }
    return srcUri;
  };

  const handleDeletePhoto = useCallback(async (uri:string) => {
    const idx = photoItems.findIndex(p=> p.uri===uri);
    if (idx === -1) {
      Alert.alert('Error', 'No se encontró la imagen a eliminar');
      return;
    }
    
    try {
      const success = await removePhotoFromMainTable(tableId, idx);
      
      if (!success) {
        throw new Error('La operación de eliminación retornó false');
      }
      
      await loadPhotos();
      await loadPhotoItems();
      setActivePhoto(null);
      console.log('✅ Foto eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error al eliminar foto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert(
        'Error al Eliminar',
        `No se pudo eliminar la imagen:\n${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  }, [tableId, photoItems, loadPhotos, loadPhotoItems]);

  // ==================== NUEVO SISTEMA MULTI-TOUCH ====================
  // Estados para gestos multi-touch en fotos
  const selectedPhotoRef = useRef<string | null>(null);
  const photoGestureStartRef = useRef<{ scale: number; rotation: number; x: number; y: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const photoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Timeout para debounce de guardado
  const pendingPhotoUpdatesRef = useRef<Map<string, Partial<PhotoItem>>>(new Map()); // Cambios pendientes

  // Helper: Encontrar foto en punto
  const findPhotoAtPoint = useCallback((x: number, y: number): string | null => {
    for (let i = photoItems.length - 1; i >= 0; i--) {
      const photo = photoItems[i];
      const meta = imageMeta[photo.uri];
      if (!meta) continue;
      const baseW = meta.w;
      const baseH = meta.h;
      const w = baseW * (photo.scale || 1);
      const h = baseH * (photo.scale || 1);
      if (x >= photo.x && x <= photo.x + w && y >= photo.y && y <= photo.y + h) {
        return photo.uri;
      }
    }
    return null;
  }, [photoItems, imageMeta]);

  // Actualizar transformaciones de foto CON DEBOUNCE de 3 segundos
  const updatePhotoTransform = useCallback((uri: string, updates: Partial<PhotoItem>) => {
    // 1. Actualizar UI inmediatamente (optimistic update)
    setPhotoItems(prev => prev.map(p => {
      if (p.uri === uri) {
        return { ...p, ...updates };
      }
      return p;
    }));

    // 2. Acumular cambios pendientes
    const currentPending = pendingPhotoUpdatesRef.current.get(uri) || {};
    pendingPhotoUpdatesRef.current.set(uri, { ...currentPending, ...updates });

    // 3. Cancelar timeout anterior si existe
    if (photoSaveTimeoutRef.current) {
      clearTimeout(photoSaveTimeoutRef.current);
    }

    // 4. Programar guardado después de 3 segundos de inactividad
    photoSaveTimeoutRef.current = setTimeout(() => {
      // Guardar todos los cambios pendientes
      const pendingUpdates = Array.from(pendingPhotoUpdatesRef.current.entries());
      
      if (pendingUpdates.length > 0) {
        console.log(`💾 Guardando ${pendingUpdates.length} foto(s) después de 3s de inactividad`);
        
        // Guardar cada foto con sus cambios acumulados
        pendingUpdates.forEach(([photoUri, photoUpdates]) => {
          onUpdatePhotoTransform(photoUri, photoUpdates);
        });
        
        // Limpiar cambios pendientes
        pendingPhotoUpdatesRef.current.clear();
      }
      
      photoSaveTimeoutRef.current = null;
    }, 3000); // 3 segundos de delay
  }, [onUpdatePhotoTransform]);

  // Eliminar foto
  const deletePhoto = useCallback((uri: string) => {
    Alert.alert(
      "Eliminar foto",
      "¿Estás seguro de que deseas eliminar esta foto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const index = photoItems.findIndex(p => p.uri === uri);
              if (index !== -1) {
                // 1. Cancelar cualquier actualización pendiente de esta foto
                pendingPhotoUpdatesRef.current.delete(uri);
                console.log(`🗑️ Canceladas actualizaciones pendientes de foto: ${uri}`);
                
                // 2. Actualizar UI inmediatamente
                setPhotoItems(prev => prev.filter(p => p.uri !== uri));
                selectedPhotoRef.current = null;
                
                // 3. Eliminar de la base de datos
                await removePhotoFromMainTable(tableId, index);
                console.log(`✅ Foto eliminada: ${uri}`);
              }
            } catch (error) {
              console.error('❌ Error al eliminar foto:', error);
              // No mostrar alerta si es solo un problema de actualización pendiente
              // La foto ya se eliminó de la UI, que es lo importante
            }
          }
        }
      ]
    );
  }, [tableId, photoItems]);

  // ==================== FIN NUEVO SISTEMA MULTI-TOUCH ====================

  // Guardar paths de manera eficiente con debounce y manejo transaccional
  const savePaths = useCallback(async (newPathsData: PathData[]) => {
    setIsSaving(true);
    try {
      // Limitar el número de paths para evitar problemas de memoria (máximo 1000)
      const limitedPaths = newPathsData.slice(-1000);
      
      const pathsString = JSON.stringify(limitedPaths);
      // Validación tamaño (< ~0.9MB)
      const INLINE_HARD_LIMIT = 900_000; // bytes
      const byteLengthUtf8 = (str: string): number => {
        try { if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length; } catch {}
        try { return unescape(encodeURIComponent(str)).length; } catch { return str.length; }
      };
      const size = byteLengthUtf8(pathsString);
      if (size > INLINE_HARD_LIMIT) {
        setIsSaving(false);
        Alert.alert(
          'Límite alcanzado', 
          'Has alcanzado el límite máximo de trazos. Por favor borra algunos antes de continuar.',
          [{ text: 'OK' }]
        );
        console.warn(`[Whiteboard Jump] Save blocked. paths size=${size} bytes > ${INLINE_HARD_LIMIT}`);
        return;
      }
      
      // Operación transaccional con SQLite
      const mainTable = await getMainTableById(tableId);

      if (!mainTable) {
        throw new Error(`No se encontró la tabla con ID ${tableId}`);
      }

      const success = await updateMainTable(mainTable.id, { paths: pathsString });
      
      if (!success) {
        throw new Error('No se pudo actualizar los paths en la base de datos');
      }

      setLastSaved(new Date());
      console.log(`✅ Guardados ${limitedPaths.length} trazos exitosamente`);
    } catch (error) {
      console.error('❌ Error saving paths:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert(
        'Error al Guardar',
        `No se pudieron guardar los trazos del whiteboard:\n${errorMessage}`,
        [
          { text: 'Reintentar', onPress: () => savePaths(newPathsData) },
          { text: 'Cancelar', style: 'cancel' }
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

  // GESTO 1: Single Tap - Seleccionar foto O iniciar dibujo
  const singleTapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(250)
    .onStart((event) => {
      const { x, y } = event;
      const photoUri = findPhotoAtPoint(x, y);
      
      if (photoUri) {
        // Tap en foto: seleccionar
        selectedPhotoRef.current = photoUri;
        const photo = photoItems.find(p => p.uri === photoUri);
        if (photo) {
          photoGestureStartRef.current = {
            scale: photo.scale || 1,
            rotation: photo.rotation || 0,
            x: photo.x,
            y: photo.y
          };
        }
      } else {
        // Tap fuera: deseleccionar foto
        selectedPhotoRef.current = null;
        photoGestureStartRef.current = null;
      }
    });

  // GESTO 2: Double Tap - Resetear foto a transformaciones por defecto
  const doubleTapGesture = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((event) => {
      const { x, y } = event;
      const photoUri = findPhotoAtPoint(x, y);
      
      if (photoUri) {
        // Double tap en foto: resetear transformaciones
        updatePhotoTransform(photoUri, { scale: 1, rotation: 0 });
        console.log("✨ Foto reseteada a transformaciones por defecto");
      }
    });

  // GESTO 3: Long Press - Eliminar foto
  const longPressGesture = Gesture.LongPress()
    .runOnJS(true)
    .minDuration(500)
    .onStart((event) => {
      const { x, y } = event;
      const photoUri = findPhotoAtPoint(x, y);
      
      if (photoUri) {
        // Long press en foto: eliminar
        deletePhoto(photoUri);
      }
    });

  // GESTO 4: Pan (un dedo) - Mover foto O dibujar
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(5)
    .onStart((event) => {
      const { x, y, pointerType } = event;
      const photoUri = findPhotoAtPoint(x, y);
      
      if (photoUri) {
        // Si tocamos una foto, actualizar la referencia de inicio SIEMPRE
        selectedPhotoRef.current = photoUri;
        const photo = photoItems.find(p => p.uri === photoUri);
        if (photo) {
          // IMPORTANTE: Actualizar con la posición ACTUAL de la foto
          photoGestureStartRef.current = {
            scale: photo.scale || 1,
            rotation: photo.rotation || 0,
            x: photo.x,
            y: photo.y
          };
          console.log(`📌 Pan inicio en foto: x=${photo.x}, y=${photo.y}, scale=${photo.scale}`);
        }
        // Preparar para mover foto, no dibujar
        return;
      }
      
      // Pan fuera de foto O no hay foto seleccionada: DIBUJAR
      if (inputMode === 'pen' && pointerType === 0) return; // Pen mode + dedo = no dibujar
      if (inputMode === 'finger' && pointerType !== 0 && isTinyDevice) return; // Finger mode + stylus en tiny = no dibujar
      
      isDrawingRef.current = true;
      currentPath.current = Skia.Path.Make();
      currentPath.current.moveTo(x, y);
      lastPoint.current = { x, y };
      setCurrentPathDisplay(currentPath.current.copy());
    })
    .onUpdate((event) => {
      const { x, y, translationX, translationY, pointerType } = event;
      
      // Si hay foto seleccionada, moverla
      if (selectedPhotoRef.current && photoGestureStartRef.current) {
        const newX = photoGestureStartRef.current.x + translationX;
        const newY = photoGestureStartRef.current.y + translationY;
        updatePhotoTransform(selectedPhotoRef.current, { x: newX, y: newY });
        return;
      }
      
      // Sino, dibujar
      if (inputMode === 'pen' && pointerType === 0) return;
      if (inputMode === 'finger' && pointerType !== 0 && isTinyDevice) return;
      
      if (currentPath.current && isDrawingRef.current) {
        addSmoothPoint(currentPath.current, x, y, pointerType);
        setCurrentPathDisplay(currentPath.current.copy());
      }
    })
    .onEnd((event) => {
      const { pointerType } = event;
      
      // Resetear inicio de gesto de foto
      if (selectedPhotoRef.current) {
        const photo = photoItems.find(p => p.uri === selectedPhotoRef.current);
        if (photo) {
          photoGestureStartRef.current = {
            scale: photo.scale || 1,
            rotation: photo.rotation || 0,
            x: photo.x,
            y: photo.y
          };
        }
      }
      
      // Finalizar dibujo
      if (inputMode === 'pen' && pointerType === 0) return;
      if (inputMode === 'finger' && pointerType !== 0 && isTinyDevice) return;
      
      if (currentPath.current && isDrawingRef.current) {
        runOnJS(updatePaths)(currentPath.current.copy());
        setCurrentPathDisplay(null);
        currentPath.current = null;
        isDrawingRef.current = false;
        lastPoint.current = null;
      }
    });

  // GESTO 5: Pinch - Escalar foto
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart((event) => {
      const { focalX, focalY } = event;
      const photoUri = findPhotoAtPoint(focalX, focalY);
      
      if (photoUri) {
        selectedPhotoRef.current = photoUri;
        const photo = photoItems.find(p => p.uri === photoUri);
        if (photo) {
          // IMPORTANTE: Actualizar SIEMPRE con la posición ACTUAL de la foto
          photoGestureStartRef.current = {
            scale: photo.scale || 1,
            rotation: photo.rotation || 0,
            x: photo.x,
            y: photo.y
          };
          console.log(`🤏 Pinch inicio en foto: scale=${photo.scale}`);
        }
      }
    })
    .onUpdate((event) => {
      const { scale } = event;
      
      if (selectedPhotoRef.current && photoGestureStartRef.current) {
        const newScale = Math.max(0.3, Math.min(3, photoGestureStartRef.current.scale * scale));
        updatePhotoTransform(selectedPhotoRef.current, { scale: newScale });
      }
    })
    .onEnd(() => {
      // Actualizar el estado de inicio con la nueva escala
      if (selectedPhotoRef.current) {
        const photo = photoItems.find(p => p.uri === selectedPhotoRef.current);
        if (photo) {
          photoGestureStartRef.current = {
            scale: photo.scale || 1,
            rotation: photo.rotation || 0,
            x: photo.x,
            y: photo.y
          };
        }
      }
    });

  // GESTO 6: Rotation - Rotar foto con dos dedos
  const rotationGesture = Gesture.Rotation()
    .runOnJS(true)
    .onStart((event) => {
      const { anchorX, anchorY } = event;
      const photoUri = findPhotoAtPoint(anchorX, anchorY);
      
      if (photoUri) {
        selectedPhotoRef.current = photoUri;
        const photo = photoItems.find(p => p.uri === photoUri);
        if (photo) {
          // IMPORTANTE: Actualizar SIEMPRE con la posición ACTUAL de la foto
          photoGestureStartRef.current = {
            scale: photo.scale || 1,
            rotation: photo.rotation || 0,
            x: photo.x,
            y: photo.y
          };
          console.log(`🔄 Rotation inicio en foto: rotation=${photo.rotation}`);
        }
      }
    })
    .onUpdate((event) => {
      const { rotation } = event;
      
      if (selectedPhotoRef.current && photoGestureStartRef.current) {
        const rotationDegrees = (rotation * 180) / Math.PI;
        const newRotation = (photoGestureStartRef.current.rotation + rotationDegrees) % 360;
        updatePhotoTransform(selectedPhotoRef.current, { rotation: newRotation });
      }
    })
    .onEnd(() => {
      // Actualizar el estado de inicio con la nueva rotación
      if (selectedPhotoRef.current) {
        const photo = photoItems.find(p => p.uri === selectedPhotoRef.current);
        if (photo) {
          photoGestureStartRef.current = {
            scale: photo.scale || 1,
            rotation: photo.rotation || 0,
            x: photo.x,
            y: photo.y
          };
        }
      }
    });

  // Combinar todos los gestos con prioridades correctas
  const combinedGesture = Gesture.Race(
    doubleTapGesture,
    longPressGesture,
    Gesture.Simultaneous(
      singleTapGesture,
      Gesture.Simultaneous(
        pinchGesture,
        rotationGesture,
        panGesture
      )
    )
  );

  // Canvas memoizado para reducir flicker
  const DrawingSurface = useMemo(()=>{
    return memo(({
      pathsData, paths, currentPathDisplay, selectedPen, isEraser, currentColor, currentStrokeWidth, photoItems, activePhoto, registerImageMeta
    }: any)=>{
      let liveColor = isEraser? '#e0e0e0' : selectedPen===1? 'red' : selectedPen===2? 'yellow' : currentColor;
      let liveStrokeWidth = isEraser? currentStrokeWidth*4 : selectedPen===1? 2 : currentStrokeWidth;
      
      // 🔥 FIX: Calcular background image fuera del JSX
      let backgroundImageElement = null;
      if (backgroundImage) {
        const imageWidth = width * 0.9;
        const imageX = (width - imageWidth) / 2;
        backgroundImageElement = (
          <SkiaImage 
            image={backgroundImage} 
            x={imageX} 
            y={0} 
            width={imageWidth} 
            height={canvasHeight} 
            fit="contain" 
            opacity={0.6} 
          />
        );
      }
      
      // 🔥 FIX: Crear pathMap para O(1) lookup en vez de indexOf
      const pathMap = useMemo(() => {
        const map = new Map();
        pathsData.forEach((pd: any, idx: number) => {
          map.set(pd, idx);
        });
        return map;
      }, [pathsData]);
      
      return (
        <Canvas style={[styles.canvas, { height: canvasHeight }]}>
          {/* Imagen de fondo - PRIMERO para que quede debajo de todo */}
          {backgroundImageElement}
          
          {/* Paths normales - validación de arrays */}
          {safeValidate.isArray(pathsData) && Children.toArray(
            pathsData
              .filter((pd:any)=> pd.penType===0 || !pd.penType)
              .map((pd:any)=>{ 
                const idx = pathMap.get(pd); 
                const path = paths[idx]; 
                if(!path) return null; 
                const displayColor = pd.isEraser? '#e0e0e0': pd.color; 
                return <Path key={`n-${idx}`} path={path} color={displayColor} style="stroke" strokeWidth={pd.strokeWidth} strokeCap="round" strokeJoin="round" />; 
              })
          )}
          
          {/* Telestrator paths */}
          {safeValidate.isArray(pathsData) && Children.toArray(
            pathsData
              .filter((pd:any)=> pd.penType===1)
              .map((pd:any)=>{ 
                const idx = pathMap.get(pd); 
                const path = paths[idx]; 
                if(!path) return null; 
                return <Path key={`t-${idx}`} path={path} color={pd.color} style="stroke" strokeWidth={pd.strokeWidth} strokeCap="round" strokeJoin="round" opacity={0.8} />; 
              })
          )}
          
          {/* Highlighter paths */}
          {safeValidate.isArray(pathsData) && Children.toArray(
            pathsData
              .filter((pd:any)=> pd.penType===2)
              .map((pd:any)=>{ 
                const idx = pathMap.get(pd); 
                const path = paths[idx]; 
                if(!path) return null; 
                return <Group key={`h-${idx}`}><Path path={path} color={pd.color} style="fill" opacity={0.3} /><Path path={path} color={pd.color} style="stroke" strokeWidth={pd.strokeWidth} strokeCap="round" strokeJoin="round" opacity={0.5} /></Group>; 
              })
          )}
          
          {/* Photos - validación de arrays */}
          {safeValidate.isArray(photoItems) && photoItems.map((item:PhotoItem)=>(
            <SkiaPhoto key={item.uri} item={item} registerMeta={registerImageMeta} />
          ))}
          
          {currentPathDisplay && (
            <Group>
              {selectedPen===2 && !isEraser && <Path path={currentPathDisplay} color="yellow" style="fill" opacity={0.3} />}
              <Path path={currentPathDisplay} color={liveColor} style="stroke" strokeWidth={liveStrokeWidth} strokeCap="round" strokeJoin="round" opacity={isEraser?1: selectedPen===1?0.8: selectedPen===2?0.5:1} />
            </Group>
          )}
        </Canvas>
      );
    });
  }, [backgroundImage]);

  return (
    <View style={styles.container}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={combinedGesture}>
          <View style={[styles.canvasContainer, { height: canvasHeight }]}>
            <DrawingSurface
              pathsData={pathsData}
              paths={paths}
              currentPathDisplay={currentPathDisplay}
              selectedPen={selectedPen}
              isEraser={isEraser}
              currentColor={currentColor}
              currentStrokeWidth={currentStrokeWidth}
              photoItems={photoItems}
              activePhoto={activePhoto}
              registerImageMeta={registerImageMeta}
            />
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
                  backgroundColor: currentColor,
                },
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
                  <View
                    style={[
                      styles.strokeSliderProgress,
                      { width: `${((currentStrokeWidth - 1) / 9) * 100}%` },
                    ]}
                  />
                  {/* Indicador circular */}
                  <View
                    style={[
                      styles.strokeSliderThumb,
                      { left: `${((currentStrokeWidth - 1) / 9) * 100}%` },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </GestureDetector>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
      {/* Multi-touch gestures - no necesitamos controles flotantes */}

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

      {/* Add Photo button */}
      <View style={styles.photoButtonContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleAddPhoto} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
          <Text style={styles.buttonText}>🖼️</Text>
        </TouchableOpacity>
      </View>

      {/* Stick / Bonus button - bottom right (always visible) */}
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
          <Text style={styles.stickButtonText}>{discipline ? 'STICK BONUS' : 'BONUS'}</Text>
        </TouchableOpacity>
      </Animated.View>

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

      {/* Indicador de guardado - top right */}
      {(isSaving || lastSaved) && (
        <View style={styles.saveIndicatorContainer}>
          {isSaving ? (
            <View style={styles.saveIndicator}>
              <Text style={styles.saveIndicatorText}>💾 Guardando...</Text>
            </View>
          ) : lastSaved && (
            <View style={styles.saveIndicator}>
              <Text style={styles.saveIndicatorTextSuccess}>
                ✅ Guardado {new Date().getTime() - lastSaved.getTime() < 3000 ? 'ahora' : 'hace un momento'}
              </Text>
            </View>
          )}
        </View>
      )}

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
  photoControlsFloating: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1200,
  },
  photoControls: {
    position: 'absolute',
    top: -48, // Ajustado para botones más grandes
    left: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)', // Más opaco para mejor visibilidad
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6, // Mayor separación entre botones
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Sombra en Android
  },
  photoControlBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    minWidth: 44, // Aumentado de 28 a 44 (cerca del estándar de 48dp)
    minHeight: 44, // Añadido para altura mínima
    alignItems: 'center',
    justifyContent: 'center', // Centrar contenido verticalmente
  },
  photoControlText: {
    color: '#fff',
    fontWeight: '700', // Más bold para mejor legibilidad
    fontSize: 16, // Aumentado de 14 a 16
  },
  photoDeleteCtrl: {
    backgroundColor: 'rgba(220,53,69,0.9)' // Más opaco para destacar
  },
  // Estilos específicos para dispositivos tiny (< 960px)
  photoControlsTiny: {
    position: 'absolute',
    top: -38, // Más compacto para tiny
    left: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4, // Menos padding
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3, // Menos espacio entre botones
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  photoControlBtnTiny: {
    paddingHorizontal: 5, // Más compacto
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    minWidth: 32, // Más pequeño para tiny (32px en lugar de 44px)
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoControlTextTiny: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13, // Más pequeño para tiny (13px en lugar de 16px)
  },
  photoButtonContainer: {
    position: 'absolute',
    right: 10,
    top: 120,
    zIndex: 1000,
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
  // Indicador de guardado
  saveIndicatorContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1100,
  },
  saveIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  saveIndicatorText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  saveIndicatorTextSuccess: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DrawingCanvas;