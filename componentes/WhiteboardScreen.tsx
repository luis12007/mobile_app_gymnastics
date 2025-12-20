import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  percentage?: number;
  stickBonus?: boolean;
  setStickBonus?: (value: boolean) => void;
  onToggleStickBonus?: () => void;
  showJumpBackground?: boolean;
  discipline?: boolean;
  event?: string;
}

export interface WhiteboardRef {
  forceSave: () => Promise<void>;
}

const DEFAULT_PEN: { color: string; strokeWidth: number; penType: PenType } = {
  color: 'black',
  strokeWidth: 2,
  penType: 0,
};

const BUTTON_SIZE = 50;
const BUTTON_GAP = 5;
const BUTTON_START_X = 10;

const STROKE_MIN = 1;
const STROKE_MAX = 15;
const STROKE_BAR_WIDTH = 160;

const MAX_PATHS_MEMORY = 300;
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
  ({
    item,
    registerMeta,
    renderNonce,
  }: {
    item: PhotoItem;
    registerMeta: (id: number, w: number, h: number) => void;
    renderNonce: number;
  }) => {
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
    prev.renderNonce === next.renderNonce &&
    prev.item.id === next.item.id &&
    prev.item.uri === next.item.uri &&
    prev.item.x === next.item.x &&
    prev.item.y === next.item.y &&
    prev.item.scale === next.item.scale &&
    prev.item.rotation === next.item.rotation
);
SkiaPhoto.displayName = 'SkiaPhoto';

const WhiteboardMinimal = memo(forwardRef<WhiteboardRef, WhiteboardMinimalProps>(({
  gymnastId,
  width = SCREEN_WIDTH,
  height = canvasHeight,
  onLoaded,
  percentage,
  stickBonus,
  setStickBonus,
  onToggleStickBonus,
  showJumpBackground = false,
  discipline = true,
  event,
}: WhiteboardMinimalProps, ref) => {
  // Skia requiere runtime nativo/JSI. En RN New Architecture, `nativeCallSyncHook` puede no existir
  // aunque JSI sí esté activo, así que detectamos Skia creando un Picture pequeño.
  const skiaProbeRef = useRef<{ supported: boolean; reason?: string } | null>(null);
  if (skiaProbeRef.current == null) {
    try {
      // Prueba barata: crear un path y una picture mínima.
      const anySkia: any = Skia as any;
      const p = anySkia?.Path?.Make?.();
      if (!p) throw new Error('Skia.Path.Make() returned null/undefined');

      const recorder = anySkia?.PictureRecorder?.();
      if (!recorder?.beginRecording) throw new Error('Skia.PictureRecorder() not available');

      const rect = anySkia?.XYWHRect ? anySkia.XYWHRect(0, 0, 1, 1) : { x: 0, y: 0, width: 1, height: 1 };
      const canvas = recorder.beginRecording(rect);
      if (!canvas) throw new Error('beginRecording returned null/undefined');

      // No dibujamos nada; sólo cerramos.
      const pic = recorder.finishRecordingAsPicture?.();
      if (!pic) throw new Error('finishRecordingAsPicture returned null/undefined');

      skiaProbeRef.current = { supported: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      skiaProbeRef.current = { supported: false, reason: msg };
    }
  }

  const skiaSupported = Platform.OS !== 'web' && !!skiaProbeRef.current?.supported;

  // Defensive guard
  if (!gymnastId || typeof gymnastId !== 'number' || gymnastId <= 0) {
    return <View style={[styles.container, { height }]} />;
  }

  // Guard: evitar montar Skia cuando no hay soporte
  useEffect(() => {
    if (!skiaSupported) {
      if (__DEV__) {
        console.log('[WhiteboardScreen] Skia probe failed', {
          platform: Platform.OS,
          reason: skiaProbeRef.current?.reason,
          isHermes: !!(global as any)?.HermesInternal,
        });
      }
      Alert.alert(
        'Skia not available',
        'Skia could not be initialized in this runtime. Make sure you are using the Dev Client app (not Expo Go). If you are using Dev Client, check the “Skia probe failed” log.'
      );
    }
  }, [skiaSupported]);

  if (!skiaSupported) {
    return <View style={[styles.container, { width, height }]} />;
  }

  // Drawing state
  const currentPath = useRef<SkPath | null>(null);
  const isDrawingRef = useRef(false);
  const lastRawPoint = useRef<{ x: number; y: number } | null>(null);
  const lastFilteredPoint = useRef<{ x: number; y: number } | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Avoid React re-render on every pointer update (smoother)
  const rafRef = useRef<number | null>(null);
  const pendingDisplayPathRef = useRef<SkPath | null>(null);

  const [paths, setPaths] = useState<SkPath[]>([]);
  const [pathsData, setPathsData] = useState<PathData[]>([]);
  const [currentPathDisplay, setCurrentPathDisplay] = useState<SkPath | null>(null);

  // Refs to avoid relying on async state timing (undo/redo correctness)
  const pathsRef = useRef<SkPath[]>([]);
  const pathsDataRef = useRef<PathData[]>([]);
  const redoStackRef = useRef<PathData[]>([]);

  // Photos state
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [imageMeta, setImageMeta] = useState<Record<number, { w: number; h: number }>>({});
  const [photosRenderNonce, setPhotosRenderNonce] = useState(0);
  const photosRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI state (menu + tools)
  const [menuOpen, setMenuOpen] = useState(false);
  const [handMode, setHandMode] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [selectedPen, setSelectedPen] = useState<PenType>(DEFAULT_PEN.penType);
  const [currentColor, setCurrentColor] = useState<string>(DEFAULT_PEN.color);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(DEFAULT_PEN.strokeWidth);
  const [previousStrokeWidth, setPreviousStrokeWidth] = useState<number>(DEFAULT_PEN.strokeWidth);
  const [redoStack, setRedoStack] = useState<PathData[]>([]);

  const [internalStickBonus, setInternalStickBonus] = useState(false);
  const effectiveStickBonus = stickBonus ?? internalStickBonus;
  const jumpBg = useImage(require('../assets/images/Jump1.png'));

  const MAX_REDO_STACK = 25;

/*   // Debug: log tool mode changes
  useEffect(() => {
    if (__DEV__) {
      console.log('[Whiteboard] toolMode', { handMode, mode: handMode ? 'HAND' : 'PEN' });
    }
  }, [handMode]); */

  const handBlockLoggedRef = useRef(false);

  // Persist helpers
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTraceInsertsRef = useRef<PathData[]>([]);

  // Photo persistence debounce
  const photoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPhotoUpdatesRef = useRef<Map<number, Partial<PhotoItem>>>(new Map());

  // Selected photo / gesture start
  const selectedPhotoRef = useRef<number | null>(null);
  const photoGestureStartRef = useRef<{ scale: number; rotation: number; x: number; y: number } | null>(null);

  // Minimal pen config (no UI)
  const penConfigRef = useRef(DEFAULT_PEN);

  // Keep penConfigRef in sync with UI state
  useEffect(() => {
    penConfigRef.current = {
      color: currentColor,
      strokeWidth: currentStrokeWidth,
      penType: selectedPen,
    };
  }, [currentColor, currentStrokeWidth, selectedPen]);

  // Keep refs in sync
  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    pathsDataRef.current = pathsData;
  }, [pathsData]);

  useEffect(() => {
    redoStackRef.current = redoStack;
  }, [redoStack]);

  const registerImageMeta = useCallback((id: number, w: number, h: number) => {
    setImageMeta(prev => (prev[id] ? prev : { ...prev, [id]: { w, h } }));
  }, []);

  const loadPathsFromDatabase = useCallback(async () => {
    try {
      // Reset ephemeral stacks when reloading persisted state
      setRedoStack([]);
      pendingTraceInsertsRef.current = [];
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

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

      // IMPORTANT: En algunos runtimes, `useImage()` puede resolver sin forzar un re-render inmediato.
      // Hacemos un pequeño "nudge" para que imágenes preexistentes aparezcan al entrar,
      // sin depender de que el usuario agregue otra imagen.
      setPhotosRenderNonce(n => n + 1);
      if (photosRefreshTimeoutRef.current) clearTimeout(photosRefreshTimeoutRef.current);
      photosRefreshTimeoutRef.current = setTimeout(() => {
        setPhotosRenderNonce(n => n + 1);
        photosRefreshTimeoutRef.current = null;
      }, 450);
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
      if (photosRefreshTimeoutRef.current) clearTimeout(photosRefreshTimeoutRef.current);
      pendingTraceInsertsRef.current = [];
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [loadPathsFromDatabase, loadPhotosFromDatabase, onLoaded]);

  const scheduleInsertTrace = useCallback((newPathData: PathData) => {
    // Debounced BATCH insert: no pierde trazos si el usuario dibuja rápido.
    pendingTraceInsertsRef.current.push(newPathData);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const batch = pendingTraceInsertsRef.current;
      pendingTraceInsertsRef.current = [];
      saveTimeoutRef.current = null;

      if (batch.length === 0) return;
      try {
        const maxRow = await db.getFirstAsync<any>(
          'SELECT MAX(order_index) as max_order FROM whiteboard_traces WHERE gymnast_id = ?',
          [gymnastId]
        );
        let nextOrder = Number(maxRow?.max_order ?? -1) + 1;

        for (const pd of batch) {
          await db.runAsync(
            `INSERT INTO whiteboard_traces (gymnast_id, trace_data, color, stroke_width, pen_type, order_index)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [gymnastId, JSON.stringify(pd), pd.color, pd.strokeWidth, String(pd.penType), nextOrder]
          );
          nextOrder += 1;
        }
      } catch {
        // ignore
      }
    }, 250);
  }, [gymnastId]);

  const updatePaths = useCallback((newPath: SkPath) => {
    // Match integration.txt: eraser uses background; telestrator fixed red+2; highlighter yellow; normal uses currentColor.
    let pathColor: string;
    let pathStrokeWidth: number;

    if (isEraser) {
      pathColor = '#f9f9f9';
      pathStrokeWidth = currentStrokeWidth * 4;
    } else {
      switch (selectedPen) {
        case 1:
          pathColor = 'red';
          pathStrokeWidth = 2;
          break;
        case 2:
          pathColor = 'yellow';
          pathStrokeWidth = currentStrokeWidth;
          break;
        default:
          pathColor = currentColor;
          pathStrokeWidth = currentStrokeWidth;
          break;
      }
    }

    const pathString = newPath.toSVGString();

    const newPathData: PathData = {
      path: pathString,
      color: pathColor,
      strokeWidth: pathStrokeWidth,
      penType: selectedPen,
      isEraser,
    };

    // Once we draw a new stroke, redo is no longer valid
    setRedoStack([]);

    setPaths(prev => {
      const next = [...prev, newPath];
      return next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
    });

    setPathsData(prev => {
      const next = [...prev, newPathData];
      const limited = next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
      scheduleInsertTrace(newPathData);
      return limited;
    });
  }, [currentColor, currentStrokeWidth, isEraser, scheduleInsertTrace, selectedPen]);

  const toggleMenu = useCallback(() => setMenuOpen(v => !v), []);

  const changeColor = useCallback((color: string) => {
    setCurrentColor(color);
  }, []);

  const changeStrokeWidth = useCallback((w: number) => {
    setCurrentStrokeWidth(Math.max(STROKE_MIN, Math.min(STROKE_MAX, w)));
  }, []);

  const selectNormalPen = useCallback(() => {
    if (isEraser) setCurrentStrokeWidth(previousStrokeWidth);
    setSelectedPen(0);
    setIsEraser(false);
  }, [isEraser, previousStrokeWidth]);

  const selectTelestrator = useCallback(() => {
    if (isEraser) setPreviousStrokeWidth(currentStrokeWidth);
    setSelectedPen(1);
    setCurrentColor('red');
    setCurrentStrokeWidth(2);
    setIsEraser(false);
  }, [currentStrokeWidth, isEraser]);

  const selectHighlighter = useCallback(() => {
    if (isEraser) setPreviousStrokeWidth(currentStrokeWidth);
    setSelectedPen(2);
    setCurrentColor('yellow');
    setIsEraser(false);
  }, [currentStrokeWidth, isEraser]);

  const toggleEraser = useCallback(() => {
    setIsEraser(prev => {
      const next = !prev;
      if (next) {
        // entering eraser: remember previous stroke width and use a thicker one
        setPreviousStrokeWidth(currentStrokeWidth);
        setCurrentStrokeWidth(STROKE_MAX);
      } else {
        // leaving eraser: restore stroke width
        setCurrentStrokeWidth(previousStrokeWidth);
      }
      return next;
    });
  }, [currentStrokeWidth, previousStrokeWidth]);

  const selectNormalColor = useCallback(
    (color: string) => {
      selectNormalPen();
      changeColor(color);
    },
    [changeColor, selectNormalPen]
  );

  const deleteLastTraceRow = useCallback(async () => {
    try {
      await db.runAsync(
        `DELETE FROM whiteboard_traces
         WHERE id = (
           SELECT id FROM whiteboard_traces
           WHERE gymnast_id = ?
           ORDER BY order_index DESC, id DESC
           LIMIT 1
         )`,
        [gymnastId]
      );
    } catch {
      // ignore
    }
  }, [gymnastId]);

  const handleUndo = useCallback(async () => {
    const current = pathsDataRef.current;
    if (current.length === 0) return;

    // Cancel any in-progress stroke preview
    setCurrentPathDisplay(null);
    currentPath.current = null;
    isDrawingRef.current = false;

    const undone = current[current.length - 1];

    setPaths(prev => (prev.length ? prev.slice(0, -1) : prev));
    setPathsData(prev => (prev.length ? prev.slice(0, -1) : prev));

    setRedoStack(prev => {
      const next = [...prev, undone];
      return next.length > MAX_REDO_STACK ? next.slice(-MAX_REDO_STACK) : next;
    });

    // DB sync: if the last stroke is still pending (not flushed), pop it from pending instead of deleting DB.
    if (pendingTraceInsertsRef.current.length > 0) {
      pendingTraceInsertsRef.current.pop();
      if (pendingTraceInsertsRef.current.length === 0 && saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      return;
    }

    await deleteLastTraceRow();
  }, [deleteLastTraceRow]);

  const handleRedo = useCallback(async () => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;

    const toRestore = stack[stack.length - 1];
    setRedoStack(prev => (prev.length ? prev.slice(0, -1) : prev));

    try {
      const sk = Skia.Path.MakeFromSVGString(toRestore.path);
      if (!sk) return;

      setPaths(prev => {
        const next = [...prev, sk];
        return next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
      });

      setPathsData(prev => {
        const next = [...prev, toRestore];
        return next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
      });

      // Persist (debounced batch)
      scheduleInsertTrace(toRestore);
    } catch {
      // ignore
    }
  }, [scheduleInsertTrace]);

  const handleStrokeBarChange = useCallback((event: any) => {
    const { locationX } = event.nativeEvent;
    const pct = Math.max(0, Math.min(1, locationX / STROKE_BAR_WIDTH));
    const newWidth = Math.round(STROKE_MIN + pct * (STROKE_MAX - STROKE_MIN));
    changeStrokeWidth(newWidth);
  }, [changeStrokeWidth]);

  const strokeSliderGesture = useMemo(() => {
    return Gesture.Pan()
      .runOnJS(true)
      .onUpdate(event => {
        const { x } = event;
        const pct = Math.max(0, Math.min(1, x / STROKE_BAR_WIDTH));
        const newWidth = Math.round(STROKE_MIN + pct * (STROKE_MAX - STROKE_MIN));
        runOnJS(changeStrokeWidth)(newWidth);
      });
  }, [changeStrokeWidth]);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const scheduleDisplayPath = useCallback((pathCopy: SkPath | null) => {
    pendingDisplayPathRef.current = pathCopy;
    if (rafRef.current != null) return;

    rafRef.current = requestAnimationFrame(() => {
      const p = pendingDisplayPathRef.current;
      setCurrentPathDisplay(p ? p.copy() : null);
      rafRef.current = null;
    });
  }, []);

  const addSmoothedPoint = (path: SkPath, x: number, y: number, timestamp?: number) => {
    const now = typeof timestamp === 'number' ? timestamp : Date.now();

    const prevRaw = lastRawPoint.current;
    const prevFiltered = lastFilteredPoint.current;
    const prevT = lastTimestampRef.current;

    // First point
    if (!prevRaw || !prevFiltered || prevT == null) {
      path.moveTo(x, y);
      lastRawPoint.current = { x, y };
      lastFilteredPoint.current = { x, y };
      lastTimestampRef.current = now;
      return;
    }

    const dx = x - prevRaw.x;
    const dy = y - prevRaw.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Ignore ultra tiny jitter
    if (dist < 0.75) return;

    const dtMs = Math.max(1, now - prevT);
    const speedPxPerSec = (dist / dtMs) * 1000;

    // Adaptive low-pass: slow => more accurate (alpha high), fast => smoother (alpha low)
    const alpha = clamp(0.85 - speedPxPerSec * 0.0004, 0.25, 0.85);
    const fx = prevFiltered.x + alpha * (x - prevFiltered.x);
    const fy = prevFiltered.y + alpha * (y - prevFiltered.y);

    // Quadratic smoothing using midpoint
    const midX = (prevFiltered.x + fx) / 2;
    const midY = (prevFiltered.y + fy) / 2;
    path.quadTo(prevFiltered.x, prevFiltered.y, midX, midY);

    lastRawPoint.current = { x, y };
    lastFilteredPoint.current = { x: fx, y: fy };
    lastTimestampRef.current = now;
  };

  const finalizeSmoothedPath = (path: SkPath) => {
    const last = lastFilteredPoint.current;
    if (last) path.lineTo(last.x, last.y);
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

  const forceSave = useCallback(async () => {
    // Trazos: guardado con debounce corto; esperamos un poco.
    if (saveTimeoutRef.current) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Fotos: guardado con debounce largo; flush inmediato.
    await flushPendingPhotoUpdates();
  }, [flushPendingPhotoUpdates]);

  useImperativeHandle(ref, () => ({ forceSave }), [forceSave]);

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
            'Select image',
            'Where do you want to select the image from?',
            [
              { text: 'Gallery', onPress: () => resolve('gallery') },
              { text: 'Files (OneDrive, Drive, etc.)', onPress: () => resolve('files') },
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            ],
            { cancelable: true, onDismiss: () => resolve(null) }
          );
        });

        if (!pickerChoice) return;

        if (pickerChoice === 'gallery') {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission required', 'Gallery access is required.');
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
          Alert.alert('Permission required', 'Gallery access is required.');
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
          'Unsupported format',
          'HEIC/HEIF images are not supported for export. Please select a JPEG or PNG image.'
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
        Alert.alert('Error', 'Could not access the selected image.');
        return;
      }
      if ((info.size ?? 0) > 25 * 1024 * 1024) {
        Alert.alert('Image too large', 'The image exceeds 25MB. Please select a smaller one.');
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
      Alert.alert('Error Adding Image', `Could not add the image:\n${msg}`);
    }
  }, [gymnastId, height, loadPhotosFromDatabase, pickImageUriViaDocumentPicker, width]);

  const deletePhoto = useCallback(
    (photoId: number) => {
      Alert.alert('Delete photo', 'Are you sure you want to delete this photo?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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

  // Pan: move photo (any pointer) or draw (depends on Pen/Hand mode)
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(1)
    .onStart(event => {
      const { x, y } = event;
      const pointerType = (event as any).pointerType ?? 0; // 0=finger

      handBlockLoggedRef.current = false;

      const photoId = findPhotoAtPoint(x, y);
      if (photoId) {
        selectedPhotoRef.current = photoId;
        const photo = photoItems.find(p => p.id === photoId);
        if (photo) {
          photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
        }
        return;
      }

      // Validation (flipped):
      // - HAND mode 🤚: only finger can draw
      // - PEN mode ✍️: only stylus/mouse can draw
      const canDraw = handMode ? pointerType === 0 : pointerType !== 0;
      if (!canDraw) {
        if (__DEV__ && !handBlockLoggedRef.current) {
          console.log('[Whiteboard] blocked draw by pointerType', {
            pointerType,
            handMode,
            mode: handMode ? 'HAND' : 'PEN',
          });
          handBlockLoggedRef.current = true;
        }
        return;
      }

      isDrawingRef.current = true;
      currentPath.current = Skia.Path.Make();
      lastRawPoint.current = null;
      lastFilteredPoint.current = null;
      lastTimestampRef.current = null;
      addSmoothedPoint(currentPath.current, x, y, (event as any)?.timestamp);
      scheduleDisplayPath(currentPath.current.copy());
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

      const canDraw = handMode ? pointerType === 0 : pointerType !== 0;
      if (!canDraw) return;

      if (currentPath.current && isDrawingRef.current) {
        addSmoothedPoint(currentPath.current, x, y, (event as any)?.timestamp);
        scheduleDisplayPath(currentPath.current.copy());
      }
    })
    .onEnd(event => {
      const pointerType = (event as any).pointerType ?? 0;

      // finalize draw
      const canDraw = handMode ? pointerType === 0 : pointerType !== 0;
      if (!canDraw) return;

      if (currentPath.current && isDrawingRef.current) {
        finalizeSmoothedPath(currentPath.current);
        runOnJS(updatePaths)(currentPath.current.copy());
        scheduleDisplayPath(null);
        currentPath.current = null;
        isDrawingRef.current = false;
        lastRawPoint.current = null;
        lastFilteredPoint.current = null;
        lastTimestampRef.current = null;
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
      canvasWidth,
      canvasHeight,
      pathsData,
      paths,
      currentPathDisplay,
      photoItems,
      registerImageMeta,
      currentColor,
      currentStrokeWidth,
      isEraser,
      selectedPen,
      showJumpBackground,
      jumpBg,
      photosRenderNonce,
    }: {
      canvasWidth: number;
      canvasHeight: number;
      pathsData: PathData[];
      paths: SkPath[];
      currentPathDisplay: SkPath | null;
      photoItems: PhotoItem[];
      registerImageMeta: (id: number, w: number, h: number) => void;
      currentColor: string;
      currentStrokeWidth: number;
      isEraser: boolean;
      selectedPen: PenType;
      showJumpBackground: boolean;
      jumpBg: any;
      photosRenderNonce: number;
    }) => {
      const visiblePhotos = photoItems.slice(0, MAX_PHOTOS_RENDERED);

      const normalPaths = pathsData
        .map((pd, idx) => ({ pd, idx, path: paths[idx] }))
        .filter(x => !!x.path)
        .filter(x => (x.pd.penType ?? 0) === 0 || x.pd.isEraser);

      const telePaths = pathsData
        .map((pd, idx) => ({ pd, idx, path: paths[idx] }))
        .filter(x => !!x.path)
        .filter(x => (x.pd.penType ?? 0) === 1);

      const highlightPaths = pathsData
        .map((pd, idx) => ({ pd, idx, path: paths[idx] }))
        .filter(x => !!x.path)
        .filter(x => (x.pd.penType ?? 0) === 2);

      // Back-compat: older eraser traces stored un-multiplied widths
      const getEraserStrokeWidth = (w: number) => (w <= 10 ? w * 4 : w);

      const liveColor = isEraser
        ? '#f9f9f9'
        : selectedPen === 1
          ? 'red'
          : selectedPen === 2
            ? 'yellow'
            : currentColor;
      const liveStrokeWidth = isEraser
        ? currentStrokeWidth * 4
        : selectedPen === 1
          ? 2
          : currentStrokeWidth;

      const bgW = canvasWidth * 0.9;
      const bgH = canvasHeight * 0.9;
      const bgX = (canvasWidth - bgW) / 2;
      const bgY = (canvasHeight - bgH) / 2;

      return (
        <Canvas style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}> 
          {showJumpBackground && jumpBg ? (
            <Group opacity={0.6}>
              <SkiaImage image={jumpBg} x={bgX} y={bgY} width={bgW} height={bgH} fit="contain" />
            </Group>
          ) : null}

          {visiblePhotos.map(item => (
            <SkiaPhoto key={item.id} item={item} registerMeta={registerImageMeta} renderNonce={photosRenderNonce} />
          ))}

          {normalPaths.map(({ pd, idx, path }) => (
            <Path
              key={`n-${idx}`}
              path={path as SkPath}
              color={pd.isEraser ? '#f9f9f9' : pd.color}
              style="stroke"
              strokeWidth={pd.isEraser ? getEraserStrokeWidth(pd.strokeWidth) : pd.strokeWidth}
              strokeJoin="round"
              strokeCap="round"
            />
          ))}

          {telePaths.map(({ pd, idx, path }) => (
            <Path
              key={`t-${idx}`}
              path={path as SkPath}
              color={pd.color}
              style="stroke"
              strokeWidth={pd.strokeWidth}
              strokeJoin="round"
              strokeCap="round"
              opacity={0.8}
            />
          ))}

          {highlightPaths.map(({ pd, idx, path }) => (
            <Group key={`h-${idx}`}>
              <Path path={path as SkPath} color={pd.color} style="fill" opacity={0.3} />
              <Path
                path={path as SkPath}
                color={pd.color}
                style="stroke"
                strokeWidth={pd.strokeWidth}
                strokeJoin="round"
                strokeCap="round"
                opacity={0.5}
              />
            </Group>
          ))}

          {currentPathDisplay ? (
            <Group>
              {selectedPen === 2 && !isEraser ? (
                <Path path={currentPathDisplay} color="yellow" style="fill" opacity={0.3} />
              ) : null}
              <Path
                path={currentPathDisplay}
                color={liveColor}
                style="stroke"
                strokeWidth={liveStrokeWidth}
                strokeJoin="round"
                strokeCap="round"
                opacity={isEraser ? 1 : selectedPen === 1 ? 0.8 : selectedPen === 2 ? 0.5 : 1}
              />
            </Group>
          ) : null}
        </Canvas>
      );
    });
  }, []);

  return (
    <View style={[styles.container, { width, height }]}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={combinedGesture}>
          <View style={{ flex: 1 }}>
            <DrawingSurface
              canvasWidth={width}
              canvasHeight={height}
              pathsData={pathsData}
              paths={paths}
              currentPathDisplay={currentPathDisplay}
              photoItems={photoItems}
              registerImageMeta={registerImageMeta}
              currentColor={currentColor}
              currentStrokeWidth={currentStrokeWidth}
              isEraser={isEraser}
              selectedPen={selectedPen}
              showJumpBackground={showJumpBackground}
              jumpBg={jumpBg}
              photosRenderNonce={photosRenderNonce}
            />
          </View>
        </GestureDetector>

        {/* Menu button */}
        <View style={styles.menuButtonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, menuOpen && styles.activeButton]}
            onPress={toggleMenu}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* Top toolbar (outside hamburger): undo/redo/eraser + quick pens + stroke bar */}
        <View style={styles.topToolbarContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleUndo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.buttonText}>↩️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleRedo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.buttonText}>↪️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, isEraser && styles.activeButton]}
            onPress={toggleEraser}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>🧽</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, !isEraser && selectedPen === 0 && currentColor === 'black' && styles.activeButton]}
            onPress={() => selectNormalColor('black')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>⚫</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, !isEraser && selectedPen === 0 && currentColor === 'red' && styles.activeButton]}
            onPress={() => selectNormalColor('red')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>🔴</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, !isEraser && selectedPen === 0 && currentColor === 'blue' && styles.activeButton]}
            onPress={() => selectNormalColor('blue')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>🔵</Text>
          </TouchableOpacity>

          <View style={styles.topStrokeBar}>
            <View style={styles.strokeIndicator}>
              <View
                style={[
                  styles.strokePreview,
                  {
                    width: Math.max(4, currentStrokeWidth * 2),
                    height: Math.max(4, currentStrokeWidth * 2),
                    backgroundColor: isEraser ? 'black' : currentColor,
                  },
                ]}
              />
            </View>

            <GestureDetector gesture={strokeSliderGesture}>
              <TouchableOpacity style={styles.strokeSliderContainer} onPress={handleStrokeBarChange} activeOpacity={1}>
                <View style={styles.strokeSliderTrack}>
                  <View
                    style={[
                      styles.strokeSliderProgress,
                      { width: `${((currentStrokeWidth - STROKE_MIN) / (STROKE_MAX - STROKE_MIN)) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.strokeSliderThumb,
                      { left: `${((currentStrokeWidth - STROKE_MIN) / (STROKE_MAX - STROKE_MIN)) * 100}%` },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </GestureDetector>
          </View>
        </View>

        {/* Hamburger dropdown (colors + stroke buttons + pen types) */}
        {menuOpen ? (
          <View style={[styles.menuDropdown, { maxHeight: Math.max(180, height - 90) }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.menuTitle}>Drawing Tools</Text>

              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>Colors:</Text>
                <View style={styles.colorRow}>
                  {['black', 'red', 'blue', 'green', 'orange'].map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        currentColor === color && styles.selectedColorButton,
                      ]}
                      onPress={() => selectNormalColor(color)}
                    />
                  ))}
                </View>
                <Text style={styles.menuHint}>Telestrator=rojo fijo, Highlighter=amarillo fijo</Text>
              </View>

              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>Stroke:</Text>
                <View style={styles.strokePresetRow}>
                  {[2, 5, 10, 15].map(w => (
                    <TouchableOpacity
                      key={w}
                      style={[styles.strokePresetButton, currentStrokeWidth === w && styles.selectedStrokePresetButton]}
                      onPress={() => changeStrokeWidth(w)}
                    >
                      <Text style={styles.strokePresetText}>{String(w)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>Pen Type:</Text>
                <View style={styles.penTypeRow}>
                  <TouchableOpacity
                    style={[styles.penTypeButton, selectedPen === 0 && styles.selectedPenTypeButton]}
                    onPress={selectNormalPen}
                  >
                    <Text style={styles.penTypeIcon}>✏️</Text>
                    <Text style={styles.penTypeLabel}>Normal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.penTypeButton, selectedPen === 1 && styles.selectedPenTypeButton]}
                    onPress={selectTelestrator}
                  >
                    <Text style={styles.penTypeIcon}>🖍️</Text>
                    <Text style={styles.penTypeLabel}>Telestrator</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.penTypeButton, selectedPen === 2 && styles.selectedPenTypeButton]}
                    onPress={selectHighlighter}
                  >
                    <Text style={styles.penTypeIcon}>⭐</Text>
                    <Text style={styles.penTypeLabel}>Highlighter</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.closeMenuButton} onPress={toggleMenu}>
                <Text style={styles.closeMenuText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : null}

        {/* Stick/DMT Bonus button (bottom right). Hide if event is PH */}
        {(event ?? '') !== 'PH' ? (
          <View style={styles.stickButtonContainer}>
            <TouchableOpacity
              style={[styles.stickButton, effectiveStickBonus && styles.stickButtonActive]}
              onPress={() => {
                if (typeof onToggleStickBonus === 'function') {
                  onToggleStickBonus();
                  return;
                }
                if (typeof setStickBonus === 'function') {
                  setStickBonus(!effectiveStickBonus);
                  return;
                }
                setInternalStickBonus(v => !v);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.stickButtonText}>
                {discipline ? (event === 'PB' ? 'BONUS' : 'STICK BONUS') : 'DMT BONUS'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}


        {/* Percentage display */}
        <Text style={styles.percentageText}>{String(percentage ?? '0.0')}</Text>

        {/* Add Image button */}
        <View style={styles.photoButtonContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddPhoto}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>🖼️</Text>
          </TouchableOpacity>
        </View>

        {/* Pen/Hand toggle (under image button) */}
        <View style={styles.handModeButtonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, handMode && styles.activeButton]}
            onPress={() => {
              setHandMode(v => {
                const next = !v;
                if (__DEV__) console.log('[Whiteboard] toggle toolMode', { nextHandMode: next, mode: next ? 'HAND' : 'PEN' });
                return next;
              });
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>{handMode ? '🤚' : '✍️'}</Text>
          </TouchableOpacity>
        </View>

      </GestureHandlerRootView>
    </View>
  );
}));

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
  menuButtonContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X,
    zIndex: 1000,
  },
  topToolbarContainer: {
    position: 'absolute',
    top: 10,
    left: BUTTON_START_X + BUTTON_SIZE + BUTTON_GAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BUTTON_GAP,
    zIndex: 1000,
  },
  topStrokeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 5,
  },
  actionButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: 'black',
  },
  activeButton: {
    borderWidth: 2,
  },
  buttonText: {
    color: 'black',
    fontSize: 18,
    lineHeight: 20,
  },
  photoButtonContainer: {
    position: 'absolute',
    right: 10,
    top: 10 + BUTTON_SIZE + BUTTON_GAP,
    zIndex: 1000,
  },

  handModeButtonContainer: {
    position: 'absolute',
    right: 10,
    top: 10 + (BUTTON_SIZE + BUTTON_GAP) * 2,
    zIndex: 1000,
  },

  stickButtonContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 1000,
  },
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
    backgroundColor: '#3AAA35',
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
    zIndex: 999,
  },

  // Hamburger dropdown
  menuDropdown: {
    position: 'absolute',
    top: 70,
    left: 10,
    right: 10,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 12,
    padding: 12,
    zIndex: 2000,
  },
  menuTitle: {
    color: 'black',
    fontSize: 16,
    marginBottom: 8,
  },
  menuSection: {
    marginTop: 10,
  },
  menuSectionTitle: {
    color: 'black',
    fontSize: 13,
    marginBottom: 6,
  },
  menuHint: {
    marginTop: 6,
    color: 'black',
    fontSize: 11,
    opacity: 0.7,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallActionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: 'black',
  },
  smallButtonText: {
    color: 'black',
    fontSize: 18,
    lineHeight: 20,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'black',
  },
  selectedColorButton: {
    borderWidth: 3,
  },
  penTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  penTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  selectedPenTypeButton: {
    borderWidth: 2,
  },
  penTypeIcon: {
    fontSize: 18,
    lineHeight: 20,
    color: 'black',
  },
  penTypeLabel: {
    marginTop: 4,
    fontSize: 11,
    color: 'black',
  },
  closeMenuButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  closeMenuText: {
    color: 'black',
    fontSize: 13,
  },

  // Stroke slider (inside menu)
  strokeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  strokeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strokePreview: {
    borderRadius: 999,
  },
  strokeSliderContainer: {
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  strokeSliderTrack: {
    width: STROKE_BAR_WIDTH,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'black',
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  strokeSliderProgress: {
    height: '100%',
    backgroundColor: 'black',
  },
  strokeSliderThumb: {
    position: 'absolute',
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'black',
    backgroundColor: '#f9f9f9',
    marginLeft: -9,
  },
  strokePresetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  strokePresetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'black',
    backgroundColor: '#f9f9f9',
  },
  selectedStrokePresetButton: {
    borderWidth: 2,
  },
  strokePresetText: {
    color: 'black',
    fontSize: 13,
  },
});
