import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Canvas, Group, Image as SkiaImage, Path, Skia, SkPath, useImage } from '@shopify/react-native-skia';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../lib/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Canvas height similar to other whiteboards (responsive but stable)
const canvasHeight = (() => {
  if (SCREEN_WIDTH >= 1368 && SCREEN_HEIGHT >= 1025) return 720;
  if (SCREEN_WIDTH >= 945 && SCREEN_HEIGHT >= 700) return 600;
  return 350;
})();

type PenType = 0 | 1 | 2;

interface PathData {
  path: string;
  color: string;
  strokeWidth: number;
  penType: PenType;
  isEraser?: boolean;
}

interface PhotoItem {
  id: number;
  uri: string;
  x: number;
  y: number;
  scale: number;
  rotation: number; // degrees
}

interface WhiteboardMinimalProps {
  gymnastId: number;
  width?: number;
  height?: number;
  onLoaded?: () => void;
}

const DEFAULT_PEN: { color: string; strokeWidth: number; penType: PenType } = {
  color: 'black',
  strokeWidth: 2,
  penType: 0,
};

const MAX_PATHS_MEMORY = 150;
const MAX_PHOTOS_RENDERED = 7;

const getExtFromUri = (uri: string) => {
  const m = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : 'jpg';
};

const isHeic = (ext: string) => ext === 'heic' || ext === 'heif';

const ensurePhotosDir = async () => {
  const dir = FileSystem.cacheDirectory + 'photos/';
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // ignore
  }
  return dir;
};

const copyToAppCache = async (srcUri: string): Promise<string> => {
  const dir = await ensurePhotosDir();
  const ext = getExtFromUri(srcUri);
  const filename = `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
  const dst = dir + filename;
  try {
    await FileSystem.copyAsync({ from: srcUri, to: dst });
    const info = await FileSystem.getInfoAsync(dst);
    if (info.exists && (info.size ?? 0) > 0) return dst;
  } catch {
    // fallback to original
  }
  return srcUri;
};

// Memoized Skia image
const SkiaPhoto = memo(
  ({ item, registerMeta }: { item: PhotoItem; registerMeta: (id: number, w: number, h: number) => void }) => {
    const img = useImage(item.uri);
    if (!img) return null;

    let bw = img.width();
    let bh = img.height();

    const MAX_W = 400;
    const MAX_H = 400;
    if (bw > MAX_W) {
      const f = MAX_W / bw;
      bw = MAX_W;
      bh *= f;
    }
    if (bh > MAX_H) {
      const f = MAX_H / bh;
      bh = MAX_H;
      bw *= f;
    }

    const MIN_W = 90;
    if (bw < MIN_W) {
      const f = MIN_W / bw;
      bw = MIN_W;
      bh *= f;
    }

    registerMeta(item.id, bw, bh);

    const scale = item.scale || 1;
    const rot = (item.rotation || 0) * (Math.PI / 180);

    return (
      <Group
        transform={[
          { translateX: item.x + (bw * scale) / 2 },
          { translateY: item.y + (bh * scale) / 2 },
          { rotate: rot },
          { scale },
          { translateX: -bw / 2 },
          { translateY: -bh / 2 },
        ]}
      >
        <SkiaImage image={img} x={0} y={0} width={bw} height={bh} fit="contain" />
      </Group>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.x === next.item.x &&
    prev.item.y === next.item.y &&
    prev.item.scale === next.item.scale &&
    prev.item.rotation === next.item.rotation
);
SkiaPhoto.displayName = 'SkiaPhoto';

const WhiteboardMinimal = memo(({ gymnastId, width = SCREEN_WIDTH, height = canvasHeight, onLoaded }: WhiteboardMinimalProps) => {
  // Skia requiere JSI. Si estás usando Remote JS Debugging (Chrome) u otro runtime sin JSI,
  // montar <Canvas> suele crashear con: "Expected arraybuffer as first parameter".
  const hasJSI = typeof (global as any)?.nativeCallSyncHook === 'function';
  const isHermes = !!(global as any)?.HermesInternal;
  const skiaSupported = Platform.OS !== 'web' && hasJSI;

  // Defensive guard
  if (!gymnastId || typeof gymnastId !== 'number' || gymnastId <= 0) {
    return <View style={[styles.container, { height }]} />;
  }

  // Guard: evitar montar Skia cuando no hay soporte
  useEffect(() => {
    if (__DEV__) {
      console.log('[WhiteboardScreen] runtime', {
        platform: Platform.OS,
        hasJSI,
        isHermes,
      });
    }
    if (!skiaSupported) {
      Alert.alert(
        'Skia no disponible',
        'Skia necesita JSI/Hermes. Esto suele pasar cuando está activo “Remote JS Debugging (Chrome)”. Desactívalo en el Dev Menu y recarga.'
      );
    }
  }, [skiaSupported]);

  if (!skiaSupported) {
    return <View style={[styles.container, { width, height }]} />;
  }

  // Drawing state
  const currentPath = useRef<SkPath | null>(null);
  const isDrawingRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [paths, setPaths] = useState<SkPath[]>([]);
  const [pathsData, setPathsData] = useState<PathData[]>([]);
  const [currentPathDisplay, setCurrentPathDisplay] = useState<SkPath | null>(null);

  // Photos state
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [imageMeta, setImageMeta] = useState<Record<number, { w: number; h: number }>>({});

  // Persist helpers
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Photo persistence debounce
  const photoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPhotoUpdatesRef = useRef<Map<number, Partial<PhotoItem>>>(new Map());

  // Selected photo / gesture start
  const selectedPhotoRef = useRef<number | null>(null);
  const photoGestureStartRef = useRef<{ scale: number; rotation: number; x: number; y: number } | null>(null);

  // Minimal pen config (no UI)
  const penConfigRef = useRef(DEFAULT_PEN);

  const registerImageMeta = useCallback((id: number, w: number, h: number) => {
    setImageMeta(prev => (prev[id] ? prev : { ...prev, [id]: { w, h } }));
  }, []);

  const loadPathsFromDatabase = useCallback(async () => {
    try {
      const traces = await db.getAllAsync<any>(
        'SELECT * FROM whiteboard_traces WHERE gymnast_id = ? ORDER BY order_index ASC',
        [gymnastId]
      );

      const loaded: PathData[] = (traces || [])
        .map((trace: any) => {
          try {
            const parsed = JSON.parse(trace.trace_data);
            return {
              path: parsed.path ?? parsed.d ?? trace.trace_data,
              color: parsed.color ?? trace.color ?? penConfigRef.current.color,
              strokeWidth: parsed.strokeWidth ?? parsed.width ?? trace.stroke_width ?? penConfigRef.current.strokeWidth,
              penType: (parsed.penType ?? trace.pen_type ?? 0) as PenType,
              isEraser: !!parsed.isEraser,
            } satisfies PathData;
          } catch {
            return {
              path: trace.trace_data,
              color: trace.color ?? penConfigRef.current.color,
              strokeWidth: trace.stroke_width ?? penConfigRef.current.strokeWidth,
              penType: (trace.pen_type ?? 0) as PenType,
            } satisfies PathData;
          }
        })
        .filter(Boolean);

      const skPaths: SkPath[] = [];
      for (const pd of loaded) {
        try {
          const sk = Skia.Path.MakeFromSVGString(pd.path);
          if (sk) skPaths.push(sk);
        } catch {
          // ignore
        }
      }

      setPathsData(loaded.slice(-MAX_PATHS_MEMORY));
      setPaths(skPaths.slice(-MAX_PATHS_MEMORY));
    } catch {
      setPaths([]);
      setPathsData([]);
    }
  }, [gymnastId]);

  const loadPhotosFromDatabase = useCallback(async () => {
    try {
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM gymnast_images WHERE gymnast_id = ? ORDER BY order_index ASC',
        [gymnastId]
      );
      const items: PhotoItem[] = (rows || []).map((r: any) => ({
        id: r.id,
        uri: r.image_uri,
        x: Number(r.position_x ?? 0),
        y: Number(r.position_y ?? 0),
        scale: Number(r.scale ?? 1) || 1,
        rotation: Number(r.rotation ?? 0) || 0,
      }));
      setPhotoItems(items);
    } catch {
      setPhotoItems([]);
    }
  }, [gymnastId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await Promise.all([loadPathsFromDatabase(), loadPhotosFromDatabase()]);
      if (mounted) onLoaded?.();
    })();
    return () => {
      mounted = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (photoSaveTimeoutRef.current) clearTimeout(photoSaveTimeoutRef.current);
    };
  }, [loadPathsFromDatabase, loadPhotosFromDatabase, onLoaded]);

  const scheduleInsertTrace = useCallback((newPathData: PathData, orderIndex: number) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await db.runAsync(
          `INSERT INTO whiteboard_traces (gymnast_id, trace_data, color, stroke_width, pen_type, order_index)
           VALUES (?, ?, ?, ?, ?, ?)`
          , [
            gymnastId,
            JSON.stringify(newPathData),
            newPathData.color,
            newPathData.strokeWidth,
            String(newPathData.penType),
            orderIndex,
          ]
        );
      } catch {
        // ignore
      }
    }, 250);
  }, [gymnastId]);

  const updatePaths = useCallback((newPath: SkPath) => {
    const cfg = penConfigRef.current;
    const pathString = newPath.toSVGString();

    const newPathData: PathData = {
      path: pathString,
      color: cfg.color,
      strokeWidth: cfg.strokeWidth,
      penType: cfg.penType,
    };

    setPaths(prev => {
      const next = [...prev, newPath];
      return next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
    });

    setPathsData(prev => {
      const next = [...prev, newPathData];
      const limited = next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
      // Insert just the last trace; keep order index stable with limited array length
      scheduleInsertTrace(newPathData, limited.length - 1);
      return limited;
    });
  }, [scheduleInsertTrace]);

  const addSmoothPoint = (path: SkPath, x: number, y: number) => {
    const smoothSteps = 3;
    if (lastPoint.current) {
      const lastX = lastPoint.current.x;
      const lastY = lastPoint.current.y;
      const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
      if (distance > 5) {
        const steps = Math.ceil(distance / smoothSteps);
        for (let i = 1; i <= steps; i++) {
          const ratio = i / steps;
          const ix = lastX + (x - lastX) * ratio;
          const iy = lastY + (y - lastY) * ratio;
          path.lineTo(ix, iy);
        }
      } else {
        path.lineTo(x, y);
      }
    }
    lastPoint.current = { x, y };
  };

  const findPhotoAtPoint = useCallback(
    (x: number, y: number): number | null => {
      for (let i = photoItems.length - 1; i >= 0; i--) {
        const photo = photoItems[i];
        const meta = imageMeta[photo.id];
        if (!meta) continue;
        const w = meta.w * (photo.scale || 1);
        const h = meta.h * (photo.scale || 1);
        if (x >= photo.x && x <= photo.x + w && y >= photo.y && y <= photo.y + h) {
          return photo.id;
        }
      }
      return null;
    },
    [photoItems, imageMeta]
  );

  const flushPendingPhotoUpdates = useCallback(async () => {
    const pending = Array.from(pendingPhotoUpdatesRef.current.entries());
    if (pending.length === 0) return;

    pendingPhotoUpdatesRef.current.clear();

    await Promise.all(
      pending.map(async ([photoId, updates]) => {
        const photo = photoItems.find(p => p.id === photoId);
        const merged: PhotoItem | null = photo ? { ...photo, ...updates } as PhotoItem : null;
        if (!merged) return;

        try {
          await db.runAsync(
            'UPDATE gymnast_images SET position_x = ?, position_y = ?, rotation = ?, scale = ? WHERE id = ?',
            [merged.x, merged.y, merged.rotation, merged.scale, merged.id]
          );
        } catch {
          // ignore
        }
      })
    );
  }, [photoItems]);

  const updatePhotoTransform = useCallback(
    (photoId: number, updates: Partial<PhotoItem>) => {
      setPhotoItems(prev => prev.map(p => (p.id === photoId ? { ...p, ...updates } : p)));

      const currentPending = pendingPhotoUpdatesRef.current.get(photoId) || {};
      pendingPhotoUpdatesRef.current.set(photoId, { ...currentPending, ...updates });

      if (photoSaveTimeoutRef.current) clearTimeout(photoSaveTimeoutRef.current);
      photoSaveTimeoutRef.current = setTimeout(() => {
        flushPendingPhotoUpdates();
        photoSaveTimeoutRef.current = null;
      }, 3000);
    },
    [flushPendingPhotoUpdates]
  );

  const pickImageUriViaDocumentPicker = useCallback(async (): Promise<string | null> => {
    try {
      const res: any = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: false,
        copyToCacheDirectory: false,
      });

      if ((res && 'canceled' in res && res.canceled) || res?.type === 'cancel') return null;
      const asset = (res as any).assets?.[0] ?? res;
      return asset?.uri ?? null;
    } catch {
      return null;
    }
  }, []);

  const handleAddPhoto = useCallback(async () => {
    try {
      let pickedUri: string | null = null;

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const pickerChoice = await new Promise<'gallery' | 'files' | null>(resolve => {
          Alert.alert(
            'Seleccionar imagen',
            '¿De dónde deseas seleccionar la imagen?',
            [
              { text: 'Galería', onPress: () => resolve('gallery') },
              { text: 'Archivos (OneDrive, Drive, etc.)', onPress: () => resolve('files') },
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
            ],
            { cancelable: true, onDismiss: () => resolve(null) }
          );
        });

        if (!pickerChoice) return;

        if (pickerChoice === 'gallery') {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.');
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            base64: false,
            quality: 0.8,
          });

          if (result.canceled) return;
          pickedUri = result.assets?.[0]?.uri ?? null;
        } else {
          pickedUri = await pickImageUriViaDocumentPicker();
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: false,
          base64: false,
          quality: 0.8,
        });
        if (result.canceled) return;
        pickedUri = result.assets?.[0]?.uri ?? null;
      }

      if (!pickedUri) return;

      const ext = getExtFromUri(pickedUri);
      if (isHeic(ext)) {
        Alert.alert(
          'Formato no soportado',
          'Las imágenes HEIC/HEIF no son compatibles para exportar. Por favor, selecciona una imagen JPEG o PNG.'
        );
        return;
      }

      const needsCopy =
        Platform.OS === 'ios' ||
        pickedUri.startsWith('content://') ||
        pickedUri.includes('onedrive') ||
        pickedUri.includes('drive.google') ||
        pickedUri.includes('com.microsoft.skydrive') ||
        !pickedUri.startsWith('file://');

      if (needsCopy) {
        pickedUri = await copyToAppCache(pickedUri);
      }

      const info = await FileSystem.getInfoAsync(pickedUri);
      if (!info.exists || (info.size ?? 0) === 0) {
        Alert.alert('Error', 'No se pudo acceder a la imagen seleccionada.');
        return;
      }
      if ((info.size ?? 0) > 25 * 1024 * 1024) {
        Alert.alert('Imagen muy grande', 'La imagen supera 25MB. Selecciona otra más pequeña.');
        return;
      }

      const existingMax = await db.getFirstAsync<any>(
        'SELECT MAX(order_index) as max_order FROM gymnast_images WHERE gymnast_id = ?',
        [gymnastId]
      );
      const orderIndex = Number(existingMax?.max_order ?? -1) + 1;

      // Initial placement centered
      const photoSize = 120;
      const centerX = Math.round((width - photoSize) / 2);
      const centerY = Math.round((height - photoSize) / 2);
      const initialScale = 0.5;

      const res = await db.runAsync(
        `INSERT INTO gymnast_images (gymnast_id, image_uri, position_x, position_y, rotation, scale, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
        , [gymnastId, pickedUri, centerX, centerY, 0, initialScale, orderIndex]
      );

      const insertedId = Number((res as any)?.lastInsertRowId ?? 0);
      if (!insertedId) {
        // fallback: reload
        await loadPhotosFromDatabase();
        return;
      }

      setPhotoItems(prev => [
        ...prev,
        { id: insertedId, uri: pickedUri, x: centerX, y: centerY, scale: initialScale, rotation: 0 },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error al Agregar Imagen', `No se pudo añadir la imagen:\n${msg}`);
    }
  }, [gymnastId, height, loadPhotosFromDatabase, pickImageUriViaDocumentPicker, width]);

  const deletePhoto = useCallback(
    (photoId: number) => {
      Alert.alert('Eliminar foto', '¿Estás seguro de que deseas eliminar esta foto?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              pendingPhotoUpdatesRef.current.delete(photoId);
              setPhotoItems(prev => prev.filter(p => p.id !== photoId));
              selectedPhotoRef.current = null;
              photoGestureStartRef.current = null;
              await db.runAsync('DELETE FROM gymnast_images WHERE id = ?', [photoId]);
            } catch {
              // ignore
            }
          },
        },
      ]);
    },
    []
  );

  // ======= Gestures =======

  // Single tap: select/deselect photo
  const singleTapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(250)
    .onStart(event => {
      const { x, y } = event;
      const photoId = findPhotoAtPoint(x, y);
      if (photoId) {
        selectedPhotoRef.current = photoId;
        const photo = photoItems.find(p => p.id === photoId);
        if (photo) {
          photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
        }
      } else {
        selectedPhotoRef.current = null;
        photoGestureStartRef.current = null;
      }
    });

  // Double tap: reset photo if hit; else add photo
  const doubleTapGesture = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(event => {
      const { x, y } = event;
      const photoId = findPhotoAtPoint(x, y);
      if (photoId) {
        updatePhotoTransform(photoId, { scale: 1, rotation: 0 });
      } else {
        handleAddPhoto();
      }
    });

  // Long press: delete photo if hit
  const longPressGesture = Gesture.LongPress()
    .runOnJS(true)
    .minDuration(500)
    .onStart(event => {
      const { x, y } = event;
      const photoId = findPhotoAtPoint(x, y);
      if (photoId) deletePhoto(photoId);
    });

  // Pan: move photo (finger) or draw (stylus/mouse)
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(5)
    .onStart(event => {
      const { x, y } = event;
      const pointerType = (event as any).pointerType ?? 0; // 0=finger

      const photoId = findPhotoAtPoint(x, y);
      if (photoId) {
        selectedPhotoRef.current = photoId;
        const photo = photoItems.find(p => p.id === photoId);
        if (photo) {
          photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
        }
        return;
      }

      // Validation: finger does NOT draw (stylus/mouse can draw)
      if (pointerType === 0) return;

      isDrawingRef.current = true;
      currentPath.current = Skia.Path.Make();
      currentPath.current.moveTo(x, y);
      lastPoint.current = { x, y };
      setCurrentPathDisplay(currentPath.current.copy());
    })
    .onUpdate(event => {
      const { x, y, translationX, translationY } = event;
      const pointerType = (event as any).pointerType ?? 0;

      if (selectedPhotoRef.current && photoGestureStartRef.current) {
        const nx = photoGestureStartRef.current.x + translationX;
        const ny = photoGestureStartRef.current.y + translationY;
        updatePhotoTransform(selectedPhotoRef.current, { x: nx, y: ny });
        return;
      }

      if (pointerType === 0) return;

      if (currentPath.current && isDrawingRef.current) {
        addSmoothPoint(currentPath.current, x, y);
        setCurrentPathDisplay(currentPath.current.copy());
      }
    })
    .onEnd(event => {
      const pointerType = (event as any).pointerType ?? 0;

      // finalize draw
      if (pointerType === 0) return;

      if (currentPath.current && isDrawingRef.current) {
        runOnJS(updatePaths)(currentPath.current.copy());
        setCurrentPathDisplay(null);
        currentPath.current = null;
        isDrawingRef.current = false;
        lastPoint.current = null;
      }

      // update gesture start for photo
      if (selectedPhotoRef.current) {
        const photo = photoItems.find(p => p.id === selectedPhotoRef.current);
        if (photo) {
          photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
        }
      }
    });

  // Pinch: scale photo
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(event => {
      const { focalX, focalY } = event;
      const photoId = findPhotoAtPoint(focalX, focalY);
      if (photoId) {
        selectedPhotoRef.current = photoId;
        const photo = photoItems.find(p => p.id === photoId);
        if (photo) {
          photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
        }
      }
    })
    .onUpdate(event => {
      const { scale } = event;
      if (selectedPhotoRef.current && photoGestureStartRef.current) {
        const nextScale = Math.max(0.3, Math.min(3, photoGestureStartRef.current.scale * scale));
        updatePhotoTransform(selectedPhotoRef.current, { scale: nextScale });
      }
    })
    .onEnd(() => {
      if (selectedPhotoRef.current) {
        const photo = photoItems.find(p => p.id === selectedPhotoRef.current);
        if (photo) {
          photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
        }
      }
    });

  // Rotation: rotate photo
  const rotationGesture = Gesture.Rotation()
    .runOnJS(true)
    .onStart(event => {
      const { anchorX, anchorY } = event;
      const photoId = findPhotoAtPoint(anchorX, anchorY);
      if (photoId) {
        selectedPhotoRef.current = photoId;
        const photo = photoItems.find(p => p.id === photoId);
        if (photo) {
          photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
        }
      }
    })
    .onUpdate(event => {
      const { rotation } = event;
      if (selectedPhotoRef.current && photoGestureStartRef.current) {
        const rotationDegrees = (rotation * 180) / Math.PI;
        const nextRotation = (photoGestureStartRef.current.rotation + rotationDegrees) % 360;
        updatePhotoTransform(selectedPhotoRef.current, { rotation: nextRotation });
      }
    })
    .onEnd(() => {
      if (selectedPhotoRef.current) {
        const photo = photoItems.find(p => p.id === selectedPhotoRef.current);
        if (photo) {
          photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
        }
      }
    });

  const combinedGesture = Gesture.Race(
    doubleTapGesture,
    longPressGesture,
    Gesture.Simultaneous(singleTapGesture, Gesture.Simultaneous(pinchGesture, rotationGesture, panGesture))
  );

  const DrawingSurface = useMemo(() => {
    return memo(({
      pathsData,
      paths,
      currentPathDisplay,
      photoItems,
      registerImageMeta,
    }: {
      pathsData: PathData[];
      paths: SkPath[];
      currentPathDisplay: SkPath | null;
      photoItems: PhotoItem[];
      registerImageMeta: (id: number, w: number, h: number) => void;
    }) => {
      const visiblePhotos = photoItems.slice(0, MAX_PHOTOS_RENDERED);

      return (
        <Canvas style={[styles.canvas, { width, height }]}> 
          {visiblePhotos.map(item => (
            <SkiaPhoto key={item.id} item={item} registerMeta={registerImageMeta} />
          ))}

          {paths.map((p, idx) => {
            const pd = pathsData[idx];
            if (!pd) return null;
            return (
              <Path
                key={`p-${idx}`}
                path={p}
                color={pd.isEraser ? '#f9f9f9' : pd.color}
                style="stroke"
                strokeWidth={pd.isEraser ? pd.strokeWidth * 4 : pd.strokeWidth}
                strokeJoin="round"
                strokeCap="round"
              />
            );
          })}

          {currentPathDisplay ? (
            <Path
              path={currentPathDisplay}
              color={penConfigRef.current.color}
              style="stroke"
              strokeWidth={penConfigRef.current.strokeWidth}
              strokeJoin="round"
              strokeCap="round"
            />
          ) : null}
        </Canvas>
      );
    });
  }, [height, width, registerImageMeta]);

  return (
    <View style={[styles.container, { width, height }]}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={combinedGesture}>
          <View style={{ flex: 1 }}>
            <DrawingSurface
              pathsData={pathsData}
              paths={paths}
              currentPathDisplay={currentPathDisplay}
              photoItems={photoItems}
              registerImageMeta={registerImageMeta}
            />
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </View>
  );
});

WhiteboardMinimal.displayName = 'WhiteboardMinimal';

export default WhiteboardMinimal;
export { WhiteboardMinimal };

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvas: {
    backgroundColor: '#f9f9f9',
  },
});
