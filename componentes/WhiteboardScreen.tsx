import React, { Component, forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Dimensions, Platform, ScrollView, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Canvas, Group, Image as SkiaImage, Path, Skia, SkPath, useImage } from '@shopify/react-native-skia';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { db, getPenColor, getPenStroke, getPenType, setPenColor, setPenStroke, setPenType, toggleGymnastStarred, getGymnastStarred } from '../lib/database';

// ErrorBoundary to catch any rendering errors and prevent app crashes
class SkiaErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      console.warn('[SkiaErrorBoundary] Caught error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <View style={{ flex: 1, backgroundColor: '#f9f9f9' }} />;
    }
    return this.props.children;
  }
}

const TEXT_FONT_DELTA = -3;

const Text = ({ style, ...props }: React.ComponentProps<typeof RNText>) => {
  const flattened = style ? (StyleSheet.flatten(style as any) as any) : undefined;
  const adjustedStyle =
    flattened && typeof flattened.fontSize === 'number'
      ? ({ ...flattened, fontSize: Math.max(1, flattened.fontSize + TEXT_FONT_DELTA) } as any)
      : flattened;

  return (
    <RNText
      {...props}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      style={adjustedStyle}
    />
  );
};

const _wbDim = Dimensions.get('window');
const SCREEN_WIDTH = _wbDim.width;
const SCREEN_HEIGHT = _wbDim.height;

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
  onBeforeAddImage?: () => void | Promise<void>;
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


const MAX_PATHS_MEMORY = 500; // Limit paths to prevent memory issues
const MAX_PHOTOS_RENDERED = 7; // Limit photos to prevent memory issues
// Maximum number of points in a single path before we finalize and start a new one
// This prevents paths from becoming too large and causing memory/performance issues
const MAX_POINTS_PER_PATH = 150; // Reduced to prevent memory accumulation during long strokes
// Minimum time between display updates (throttling) in ms
const DISPLAY_THROTTLE_MS = 48; // ~20fps - conservative to prevent EGL context loss on Android

const PHOTO_DELETE_BUTTON_SIZE = 28;

const getExtFromUri = (uri: string) => {
  const m = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : 'jpg';
};

const isHeic = (ext: string) => ext === 'heic' || ext === 'heif';

const ensurePhotosDir = async (): Promise<string | null> => {
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) return null;

  const dir = baseDir + 'photos/';
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // ignore
  }
  return dir;
};

const copyToAppCache = async (srcUri: string): Promise<string> => {
  const dir = await ensurePhotosDir();
  if (!dir) return srcUri;
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

// Track loaded image IDs globally to trigger re-renders when images load
const loadedImageIds = new Set<number>();

// Memoized Skia image with robust error handling and loading state
const SkiaPhoto = memo(
  ({
    item,
    registerMeta,
    renderNonce,
    onImageLoaded,
  }: {
    item: PhotoItem;
    registerMeta: (id: number, w: number, h: number) => void;
    renderNonce: number;
    onImageLoaded?: (id: number) => void;
  }) => {
    // Track if we've registered and notified for this image instance
    const hasRegisteredRef = useRef(false);
    const hasNotifiedRef = useRef(false);
    const itemIdRef = useRef(item.id);

    // Reset refs if item ID changes (new image)
    if (itemIdRef.current !== item.id) {
      itemIdRef.current = item.id;
      hasRegisteredRef.current = false;
      hasNotifiedRef.current = false;
    }

    // useImage can throw or return null; wrap in try-catch conceptually
    let img: ReturnType<typeof useImage> = null;
    try {
      img = useImage(item.uri);
    } catch (e) {
      // Skia useImage failed - likely corrupted URI or native error
      if (__DEV__) console.warn('[SkiaPhoto] useImage error for', item.id, e);
      return null;
    }

    // Image not yet loaded - notify parent to keep polling
    if (!img) {
      // Remove from loaded set so parent knows to keep polling
      loadedImageIds.delete(item.id);
      return null;
    }

    // Mark as loaded
    loadedImageIds.add(item.id);

    // Safe dimension extraction with fallbacks
    let bw: number;
    let bh: number;
    try {
      bw = img.width();
      bh = img.height();
      // Validate dimensions
      if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {
        if (__DEV__) console.warn('[SkiaPhoto] Invalid dimensions for', item.id, bw, bh);
        return null;
      }
    } catch (e) {
      if (__DEV__) console.warn('[SkiaPhoto] Error getting dimensions for', item.id, e);
      return null;
    }

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

    // Only register once per image load to avoid loops
    if (!hasRegisteredRef.current) {
      hasRegisteredRef.current = true;
      // Use setTimeout to avoid calling during render
      setTimeout(() => {
        registerMeta(item.id, bw, bh);
      }, 0);
    }

    // Notify parent that image loaded (for forcing re-render)
    if (!hasNotifiedRef.current && onImageLoaded) {
      hasNotifiedRef.current = true;
      setTimeout(() => {
        onImageLoaded(item.id);
      }, 50);
    }

    const scale = item.scale || 1;
    const rot = (item.rotation || 0) * (Math.PI / 180);

    // Validate transform values
    const safeX = Number.isFinite(item.x) ? item.x : 0;
    const safeY = Number.isFinite(item.y) ? item.y : 0;
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const safeRot = Number.isFinite(rot) ? rot : 0;

    // Wrap rendering in try-catch to prevent crashes
    try {
      return (
        <Group
          transform={[
            { translateX: safeX + (bw * safeScale) / 2 },
            { translateY: safeY + (bh * safeScale) / 2 },
            { rotate: safeRot },
            { scale: safeScale },
            { translateX: -bw / 2 },
            { translateY: -bh / 2 },
          ]}
        >
          <SkiaImage image={img} x={0} y={0} width={bw} height={bh} fit="contain" />
        </Group>
      );
    } catch (e) {
      if (__DEV__) console.warn('[SkiaPhoto] Render error for', item.id, e);
      return null;
    }
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
  onBeforeAddImage,
  percentage,
  stickBonus,
  setStickBonus,
  onToggleStickBonus,
  showJumpBackground = false,
  discipline = true,
  event,
}: WhiteboardMinimalProps, ref) => {
  // Some Android devices/OS versions can lose the GL context during app transitions.
  // When that happens, Skia may crash natively (SIGSEGV in librnskia.so).
  // We proactively stop Skia work while the app is not active.
  const isAppActiveRef = useRef(true);
  const [isAppActive, setIsAppActive] = useState(true);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const active = next === 'active';
      isAppActiveRef.current = active;
      setIsAppActive(active);

      if (active) {
        // Returning to active: force Canvas repaint to recover from potential GL surface loss
        if (repaintTimerRef.current) clearTimeout(repaintTimerRef.current);
        repaintTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setCanvasRepaintNonce(n => n + 1);
          }
          repaintTimerRef.current = null;
        }, 300);
      }

      if (!active) {
        // Best-effort: stop any in-progress drawing gesture.
        try {
          currentPath.current = null;
          isDrawingRef.current = false;
          currentPathPointCount.current = 0;
          lastRawPoint.current = null;
          lastFilteredPoint.current = null;
          lastTimestampRef.current = null;
          // Avoid calling scheduleDisplayPath here (it may not be initialized yet at hook evaluation time)
          // and keep this effect dependency-free.
          pendingDisplayPathRef.current = null;
          if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          setCurrentPathDisplay(null);
        } catch {
          // ignore
        }
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    // Initialize with current state
    onChange(AppState.currentState);
    return () => {
      sub.remove();
    };
  }, []);
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

  // NOTE: Early returns removed from here to respect React's Rules of Hooks.
  // Guards moved after all hook declarations (see before the JSX return).
  const invalidGymnast = !gymnastId || typeof gymnastId !== 'number' || gymnastId <= 0;

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

  // NOTE: Guard for !skiaSupported || !isAppActive moved after all hooks (before JSX return).

  // Drawing state
  const currentPath = useRef<SkPath | null>(null);
  const isDrawingRef = useRef(false);
  const lastRawPoint = useRef<{ x: number; y: number } | null>(null);
  const lastFilteredPoint = useRef<{ x: number; y: number } | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  // Counter for points in current path to prevent overly long paths
  const currentPathPointCount = useRef(0);
  // Throttle display updates
  const lastDisplayUpdateTime = useRef(0);

  // Avoid React re-render on every pointer update (smoother)
  const rafRef = useRef<number | null>(null);
  const pendingDisplayPathRef = useRef<SkPath | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Track multi-touch gestures (pinch/rotation) to pause Canvas updates
  // and prevent EGL context loss → SIGSEGV on Android
  const isMultiTouchActiveRef = useRef(false);

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
  
  // Ref to keep current photoItems for use in callbacks (avoids stale closure issues)
  const photoItemsRef = useRef<PhotoItem[]>([]);

  // UI state (menu + tools)
  const [menuOpen, setMenuOpen] = useState(false);
  const [handMode, setHandMode] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [selectedPen, setSelectedPen] = useState<PenType>(DEFAULT_PEN.penType);
  const [currentColor, setCurrentColor] = useState<string>(DEFAULT_PEN.color);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(DEFAULT_PEN.strokeWidth);
  const [previousStrokeWidth, setPreviousStrokeWidth] = useState<number>(DEFAULT_PEN.strokeWidth);
  const [redoStack, setRedoStack] = useState<PathData[]>([]);

  // Safety repaint nonce: bumped after path mutations to force Canvas re-render
  // even when the GPU/GL surface was silently invalidated during heavy JS work.
  const [canvasRepaintNonce, setCanvasRepaintNonce] = useState(0);
  const repaintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCanvasRepaint = useCallback(() => {
    if (repaintTimerRef.current) clearTimeout(repaintTimerRef.current);
    repaintTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setCanvasRepaintNonce(n => n + 1);
      }
      repaintTimerRef.current = null;
    }, 600);
  }, []);

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

  // Selected photo for UI overlays
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);

  // Starred gymnast state
  const [isStarred, setIsStarred] = useState(false);

  // Minimal pen config (no UI)
  const penConfigRef = useRef(DEFAULT_PEN);

  // Persistencia global (DB) de herramienta: color + stroke + tipo.
  // Se usa como default tanto para Floor como para Salto.
  const penPrefsHydratedRef = useRef(false);
  const penPrefsSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampStrokeWidth = useCallback((w: number) => Math.max(STROKE_MIN, Math.min(STROKE_MAX, w)), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [savedColor, savedStroke, savedType] = await Promise.all([
          getPenColor(),
          getPenStroke(),
          getPenType(),
        ]);

        if (cancelled) return;

        const stroke = clampStrokeWidth(Number(savedStroke));
        const type = String(savedType || 'normal');

        // No restauramos borrador: solo pen tool.
        setIsEraser(false);

        if (type === 'telestrator') {
          setSelectedPen(1);
          setCurrentColor('red');
          setCurrentStrokeWidth(2);
          setPreviousStrokeWidth(2);
        } else if (type === 'highlighter') {
          setSelectedPen(2);
          setCurrentColor('yellow');
          setCurrentStrokeWidth(stroke);
          setPreviousStrokeWidth(stroke);
        } else {
          setSelectedPen(0);
          setCurrentColor(savedColor || DEFAULT_PEN.color);
          setCurrentStrokeWidth(stroke);
          setPreviousStrokeWidth(stroke);
        }
      } catch {
        // ignore
      } finally {
        penPrefsHydratedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clampStrokeWidth]);

  useEffect(() => {
    // Evitar pisar el valor guardado con el DEFAULT antes de hidratar.
    if (!penPrefsHydratedRef.current) return;

    // No guardar el estado del borrador (cambia stroke a STROKE_MAX temporalmente).
    if (isEraser) return;

    if (penPrefsSaveTimeoutRef.current) clearTimeout(penPrefsSaveTimeoutRef.current);
    penPrefsSaveTimeoutRef.current = setTimeout(() => {
      const type = selectedPen === 1 ? 'telestrator' : selectedPen === 2 ? 'highlighter' : 'normal';
      Promise.all([
        setPenType(type),
        setPenColor(currentColor),
        setPenStroke(currentStrokeWidth),
      ]).catch(() => {
        // ignore
      });
      penPrefsSaveTimeoutRef.current = null;
    }, 250);

    return () => {
      if (penPrefsSaveTimeoutRef.current) {
        clearTimeout(penPrefsSaveTimeoutRef.current);
        penPrefsSaveTimeoutRef.current = null;
      }
    };
  }, [currentColor, currentStrokeWidth, isEraser, selectedPen]);

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

  // Keep photoItemsRef in sync with state to avoid stale closures
  useEffect(() => {
    photoItemsRef.current = photoItems;
  }, [photoItems]);

  // Load starred status for gymnast
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const starred = await getGymnastStarred(gymnastId);
        if (!cancelled && isMountedRef.current) {
          setIsStarred(starred);
        }
      } catch (e) {
        if (__DEV__) console.warn('[Whiteboard] Error loading starred status:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [gymnastId]);

  // Handle toggle starred
  const handleToggleStarred = useCallback(async () => {
    try {
      const newStarred = await toggleGymnastStarred(gymnastId);
      if (isMountedRef.current) {
        setIsStarred(newStarred);
      }
    } catch (e) {
      if (__DEV__) console.warn('[Whiteboard] Error toggling starred:', e);
    }
  }, [gymnastId]);

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

      // IMPORTANT: mantenemos alineación 1:1 entre pathsData y paths.
      // Si un SVG está corrupto o no se puede parsear, se descarta (skip) para evitar crashes.
      const alignedData: PathData[] = [];
      const alignedPaths: SkPath[] = [];
      for (const pd of loaded) {
        const pathStr = typeof pd.path === 'string' ? pd.path : '';
        if (!pathStr) continue;

        const strokeW = Number(pd.strokeWidth);
        const safePd: PathData = {
          path: pathStr,
          color: pd.color ?? penConfigRef.current.color,
          strokeWidth: Number.isFinite(strokeW) && strokeW > 0 ? strokeW : 1,
          penType: (pd.penType ?? 0) as PenType,
          isEraser: !!pd.isEraser,
        };

        try {
          const sk = Skia.Path.MakeFromSVGString(safePd.path);
          if (!sk) continue;
          alignedData.push(safePd);
          alignedPaths.push(sk);
        } catch {
          // ignore
        }
      }

      setPathsData(alignedData.slice(-MAX_PATHS_MEMORY));
      setPaths(alignedPaths.slice(-MAX_PATHS_MEMORY));

      // Safety repaint after loading paths from DB
      scheduleCanvasRepaint();
    } catch {
      setPaths([]);
      setPathsData([]);
    }
  }, [gymnastId, scheduleCanvasRepaint]);

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
      // Also update ref immediately
      photoItemsRef.current = items;

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
      photoItemsRef.current = [];
    }
  }, [gymnastId]);

  useEffect(() => {
    isMountedRef.current = true;
    let mounted = true;
    (async () => {
      await Promise.all([loadPathsFromDatabase(), loadPhotosFromDatabase()]);
      if (mounted) onLoaded?.();
    })();
    return () => {
      mounted = false;
      isMountedRef.current = false;
      
      // Clear all timeouts
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (photoSaveTimeoutRef.current) clearTimeout(photoSaveTimeoutRef.current);
      if (photosRefreshTimeoutRef.current) clearTimeout(photosRefreshTimeoutRef.current);
      if (penPrefsSaveTimeoutRef.current) clearTimeout(penPrefsSaveTimeoutRef.current);
      if (repaintTimerRef.current) clearTimeout(repaintTimerRef.current);
      
      // Clear pending operations
      pendingTraceInsertsRef.current = [];
      pendingPhotoUpdatesRef.current?.clear();
      
      // Cancel any pending animation frame
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      // Clear pending display path to prevent memory leaks
      pendingDisplayPathRef.current = null;
      
      // Reset drawing state to prevent crashes if gesture callback fires after unmount
      currentPath.current = null;
      isDrawingRef.current = false;
      currentPathPointCount.current = 0;
      lastRawPoint.current = null;
      lastFilteredPoint.current = null;
      lastTimestampRef.current = null;
      
      // Clear loaded image tracking for this component instance
      loadedImageIds.clear();
    };
  }, [loadPathsFromDatabase, loadPhotosFromDatabase, onLoaded]);

  // Polling mechanism to ensure images become visible
  // This runs when there are photos and keeps checking until all are loaded
  const imagePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingAttemptsRef = useRef(0);
  const MAX_POLLING_ATTEMPTS = 20; // Max 20 attempts (4 seconds at 200ms interval)

  useEffect(() => {
    // Clear any existing polling
    if (imagePollingRef.current) {
      clearInterval(imagePollingRef.current);
      imagePollingRef.current = null;
    }
    pollingAttemptsRef.current = 0;

    // No photos to poll for
    if (photoItems.length === 0) return;

    // Check if all images are loaded
    const checkAllLoaded = () => {
      const allLoaded = photoItems.every(p => loadedImageIds.has(p.id));
      return allLoaded;
    };

    // If already all loaded, no need to poll
    if (checkAllLoaded()) return;

    // Start polling
    imagePollingRef.current = setInterval(() => {
      pollingAttemptsRef.current += 1;

      // Force re-render to give useImage a chance to resolve
      setPhotosRenderNonce(n => n + 1);

      // Check if all loaded or max attempts reached
      if (checkAllLoaded() || pollingAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
        if (imagePollingRef.current) {
          clearInterval(imagePollingRef.current);
          imagePollingRef.current = null;
        }
      }
    }, 200);

    return () => {
      if (imagePollingRef.current) {
        clearInterval(imagePollingRef.current);
        imagePollingRef.current = null;
      }
    };
  }, [photoItems]);

  const persistTraceBatch = useCallback(
    async (batch: PathData[]) => {
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
    },
    [gymnastId]
  );

  const flushPendingTracesNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const batch = pendingTraceInsertsRef.current;
    pendingTraceInsertsRef.current = [];

    await persistTraceBatch(batch);
  }, [persistTraceBatch]);

  const scheduleInsertTrace = useCallback(
    (newPathData: PathData) => {
      try {
        // Validate input
        if (!newPathData || !newPathData.path) return;

        // Debounced BATCH insert: no pierde trazos si el usuario dibuja rápido.
        if (!pendingTraceInsertsRef.current) {
          pendingTraceInsertsRef.current = [];
        }
        pendingTraceInsertsRef.current.push(newPathData);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          try {
            void flushPendingTracesNow();
          } catch {
            // ignore
          }
        }, 250);
      } catch {
        // ignore
      }
    },
    [flushPendingTracesNow]
  );

  const updatePaths = useCallback((newPath: SkPath) => {
    try {
      // Avoid operating if Skia unsupported
      if (!skiaSupported) {
        if (__DEV__) console.warn('[updatePaths] Skia not supported, skipping update');
        return;
      }
      // Check if component is still mounted
      if (!isMountedRef.current) return;
      
      // Validate input
      if (!newPath) return;

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

      let pathString = '';
      try {
        pathString = newPath.toSVGString();
      } catch (e) {
        if (__DEV__) console.warn('[updatePaths] toSVGString error:', e);
        return;
      }
      if (typeof pathString !== 'string' || pathString.length === 0) return;
      
      // Limit path string size to prevent memory issues with very complex paths
      if (pathString.length > 50000) {
        if (__DEV__) console.warn('[updatePaths] Path string too long, skipping:', pathString.length);
        return;
      }

      // Sanitizar strokeWidth por seguridad
      if (!Number.isFinite(pathStrokeWidth) || pathStrokeWidth <= 0) {
        pathStrokeWidth = STROKE_MIN;
      }

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
        try {
          const next = [...prev, newPath];
          return next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
        } catch {
          return prev;
        }
      });

      setPathsData(prev => {
        try {
          const next = [...prev, newPathData];
          const limited = next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
          scheduleInsertTrace(newPathData);
          return limited;
        } catch {
          return prev;
        }
      });
      // Safety repaint to catch stale GL surface
      scheduleCanvasRepaint();
    } catch (e) {
      if (__DEV__) console.warn('[updatePaths] Error:', e);
    }
  }, [currentColor, currentStrokeWidth, isEraser, scheduleInsertTrace, selectedPen, scheduleCanvasRepaint]);

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
    try {
      const current = pathsDataRef.current;
      if (!current || current.length === 0) return;

      // Cancel any in-progress stroke preview
      try {
        setCurrentPathDisplay(null);
        currentPath.current = null;
        isDrawingRef.current = false;
        currentPathPointCount.current = 0;
      } catch {
        // ignore
      }

      const undone = current[current.length - 1];
      if (!undone) return;

      setPaths(prev => {
        try {
          return prev.length ? prev.slice(0, -1) : prev;
        } catch {
          return prev;
        }
      });

      setPathsData(prev => {
        try {
          return prev.length ? prev.slice(0, -1) : prev;
        } catch {
          return prev;
        }
      });

      setRedoStack(prev => {
        try {
          const next = [...prev, undone];
          return next.length > MAX_REDO_STACK ? next.slice(-MAX_REDO_STACK) : next;
        } catch {
          return prev;
        }
      });

      // DB sync: if the last stroke is still pending (not flushed), pop it from pending instead of deleting DB.
      if (pendingTraceInsertsRef.current && pendingTraceInsertsRef.current.length > 0) {
        pendingTraceInsertsRef.current.pop();
        if (pendingTraceInsertsRef.current.length === 0 && saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        return;
      }

      await deleteLastTraceRow();

      // Safety repaint
      scheduleCanvasRepaint();
    } catch (e) {
      if (__DEV__) console.warn('[handleUndo] Error:', e);
    }
  }, [deleteLastTraceRow, scheduleCanvasRepaint]);

  const handleRedo = useCallback(async () => {
    try {
      const stack = redoStackRef.current;
      if (!stack || stack.length === 0) return;

      const toRestore = stack[stack.length - 1];
      if (!toRestore || !toRestore.path) return;

      setRedoStack(prev => {
        try {
          return prev.length ? prev.slice(0, -1) : prev;
        } catch {
          return prev;
        }
      });

      try {
        const sk = Skia.Path.MakeFromSVGString(toRestore.path);
        if (!sk) return;

        setPaths(prev => {
          try {
            const next = [...prev, sk];
            return next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
          } catch {
            return prev;
          }
        });

        setPathsData(prev => {
          try {
            const next = [...prev, toRestore];
            return next.length > MAX_PATHS_MEMORY ? next.slice(-MAX_PATHS_MEMORY) : next;
          } catch {
            return prev;
          }
        });

        // Persist (debounced batch)
        scheduleInsertTrace(toRestore);
      } catch {
        // ignore
      }

      // Safety repaint
      scheduleCanvasRepaint();
    } catch (e) {
      if (__DEV__) console.warn('[handleRedo] Error:', e);
    }
  }, [scheduleInsertTrace, scheduleCanvasRepaint]);

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
        try {
          const { x } = event;
          if (!Number.isFinite(x)) return;
          const pct = Math.max(0, Math.min(1, x / STROKE_BAR_WIDTH));
          const newWidth = Math.round(STROKE_MIN + pct * (STROKE_MAX - STROKE_MIN));
          if (!Number.isFinite(newWidth)) return;
          // Already running on JS thread (runOnJS(true))
          changeStrokeWidth(newWidth);
        } catch {
          // ignore
        }
      });
  }, [changeStrokeWidth]);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  // Safety helpers to avoid passing extreme values to native Skia methods
  const SKIA_SAFE_COORD_LIMIT = 100000;
  const isFiniteSafeNum = (v: unknown) => Number.isFinite(v as number) && Math.abs(v as number) < SKIA_SAFE_COORD_LIMIT;
  const isValidSkPath = (p: any) => !!p && (typeof p.copy === 'function' || typeof p.toSVGString === 'function');

  const safeCopyPath = useCallback((p: SkPath | null): SkPath | null => {
    if (!p || !skiaSupported) return null;
    try {
      if (typeof (p as any).copy === 'function') {
        return (p as any).copy();
      }
      return null;
    } catch (e) {
      if (__DEV__) console.warn('[safeCopyPath] Error copying path:', e);
      return null;
    }
  }, [skiaSupported]);

  const scheduleDisplayPath = useCallback((pathCopy: SkPath | null) => {
    try {
      // Early exit if unmounted
      if (!isMountedRef.current) return;
      // Avoid using Skia display if probe shows no support
      if (!skiaSupported) return;
      // Skip display updates during multi-touch to prevent EGL context loss
      if (isMultiTouchActiveRef.current && pathCopy != null) return;

      pendingDisplayPathRef.current = pathCopy;
      if (rafRef.current != null) return;

      const doUpdate = () => {
        if (!isMountedRef.current) {
          rafRef.current = null;
          pendingDisplayPathRef.current = null;
          return;
        }
        try {
          const p = pendingDisplayPathRef.current;
          setCurrentPathDisplay(p ?? null);
        } catch (e) {
          if (__DEV__) console.warn('[scheduleDisplayPath] Error applying display path:', e);
          // reset to avoid holding invalid refs
          setCurrentPathDisplay(null);
          pendingDisplayPathRef.current = null;
        }
        rafRef.current = null;
      };

      if (typeof requestAnimationFrame === 'function') {
        rafRef.current = requestAnimationFrame(doUpdate as FrameRequestCallback);
      } else {
        // fallback for environments without RAF
        rafRef.current = (setTimeout(doUpdate as any, 16) as unknown) as number;
      }
    } catch (e) {
      if (__DEV__) console.warn('[scheduleDisplayPath] Scheduling failed:', e);
      // Best-effort fallback: clear state
      try {
        pendingDisplayPathRef.current = null;
        setCurrentPathDisplay(null);
      } catch {
        // ignore
      }
    }
  }, []);

  const addSmoothedPoint = (path: SkPath, x: number, y: number, timestamp?: number): boolean => {
    try {
      if (!path) return false;
      if (!skiaSupported) return false;
      if (!isFiniteSafeNum(x) || !isFiniteSafeNum(y)) return false;

      // Clamp coordinates to reasonable bounds to prevent extreme values
      const safeX = Math.max(-SKIA_SAFE_COORD_LIMIT, Math.min(SKIA_SAFE_COORD_LIMIT, x));
      const safeY = Math.max(-SKIA_SAFE_COORD_LIMIT, Math.min(SKIA_SAFE_COORD_LIMIT, y));

      const now = typeof timestamp === 'number' ? timestamp : Date.now();

      const prevRaw = lastRawPoint.current;
      const prevFiltered = lastFilteredPoint.current;
      const prevT = lastTimestampRef.current;

      // First point
      if (!prevRaw || !prevFiltered || prevT == null) {
        try {
          path.moveTo(safeX, safeY);
          currentPathPointCount.current = 1;
        } catch (e) {
          if (__DEV__) console.warn('[addSmoothedPoint] moveTo error:', e);
          return false;
        }
        lastRawPoint.current = { x: safeX, y: safeY };
        lastFilteredPoint.current = { x: safeX, y: safeY };
        lastTimestampRef.current = now;
        return true;
      }

      const dx = safeX - prevRaw.x;
      const dy = safeY - prevRaw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!Number.isFinite(dist) || dist <= 0) return false;

      // Ignore ultra tiny jitter
      if (dist < 1.5) return false; // Increased threshold to reduce points

      const dtMs = Math.max(1, now - prevT);
      const speedPxPerSec = (dist / dtMs) * 1000;

      // Adaptive low-pass: slow => more accurate (alpha high), fast => smoother (alpha low)
      const alpha = clamp(0.85 - speedPxPerSec * 0.0004, 0.25, 0.85);
      const fx = prevFiltered.x + alpha * (safeX - prevFiltered.x);
      const fy = prevFiltered.y + alpha * (safeY - prevFiltered.y);

      if (!isFiniteSafeNum(fx) || !isFiniteSafeNum(fy)) return false;

      // Quadratic smoothing using midpoint
      const midX = (prevFiltered.x + fx) / 2;
      const midY = (prevFiltered.y + fy) / 2;
      
      if (!isFiniteSafeNum(midX) || !isFiniteSafeNum(midY)) return false;
      
      try {
        path.quadTo(prevFiltered.x, prevFiltered.y, midX, midY);
        currentPathPointCount.current += 1;
      } catch (e) {
        if (__DEV__) console.warn('[addSmoothedPoint] quadTo error:', e);
        return false;
      }

      lastRawPoint.current = { x: safeX, y: safeY };
      lastFilteredPoint.current = { x: fx, y: fy };
      lastTimestampRef.current = now;
      return true;
    } catch (e) {
      if (__DEV__) console.warn('[addSmoothedPoint] Unexpected error:', e);
      return false;
    }
  };

  const finalizeSmoothedPath = (path: SkPath) => {
    try {
      if (!skiaSupported || !path) return;
      const last = lastFilteredPoint.current;
      if (!last) return;
      if (!isFiniteSafeNum(last.x) || !isFiniteSafeNum(last.y)) return;
      try {
        path.lineTo(last.x, last.y);
      } catch (e) {
        if (__DEV__) console.warn('[finalizeSmoothedPath] lineTo error:', e);
      }
    } catch (e) {
      if (__DEV__) console.warn('[finalizeSmoothedPath] Unexpected error:', e);
    }
  };

  const findPhotoAtPoint = useCallback(
    (x: number, y: number): number | null => {
      try {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        if (!photoItems || !Array.isArray(photoItems)) return null;
        for (let i = photoItems.length - 1; i >= 0; i--) {
          const photo = photoItems[i];
          if (!photo) continue;
          const meta = imageMeta[photo.id];
          if (!meta) continue;
          const w = meta.w * (photo.scale || 1);
          const h = meta.h * (photo.scale || 1);
          if (!Number.isFinite(w) || !Number.isFinite(h)) continue;
          if (x >= photo.x && x <= photo.x + w && y >= photo.y && y <= photo.y + h) {
            return photo.id;
          }
        }
        return null;
      } catch {
        return null;
      }
    },
    [photoItems, imageMeta]
  );

  const flushPendingPhotoUpdates = useCallback(async () => {
    try {
      if (!pendingPhotoUpdatesRef.current) return;
      const pending = Array.from(pendingPhotoUpdatesRef.current.entries());
      if (pending.length === 0) return;

      // Clear pending BEFORE async operations to prevent double-flush
      pendingPhotoUpdatesRef.current.clear();

      // Use photoItemsRef to get the CURRENT state (avoids stale closure)
      const currentPhotoItems = photoItemsRef.current;

      await Promise.all(
        pending.map(async ([photoId, updates]) => {
          try {
            // Use ref to get most up-to-date photo data
            const photo = currentPhotoItems.find(p => p.id === photoId);
            const merged: PhotoItem | null = photo ? { ...photo, ...updates } as PhotoItem : null;
            if (!merged) return;

            await db.runAsync(
              'UPDATE gymnast_images SET position_x = ?, position_y = ?, rotation = ?, scale = ? WHERE id = ?',
              [merged.x, merged.y, merged.rotation, merged.scale, merged.id]
            );
          } catch {
            // ignore individual update failure
          }
        })
      );
    } catch (e) {
      if (__DEV__) console.warn('[flushPendingPhotoUpdates] Error:', e);
    }
  }, []); // No dependencies - uses refs for current data

  const forceSave = useCallback(async () => {
    // No debe crashear: best-effort flush.
    // 1) Commit del trazo activo para evitar perder el último stroke si se guarda mientras dibuja.
    try {
      if (currentPath.current && isDrawingRef.current) {
        finalizeSmoothedPath(currentPath.current);
        const copy = safeCopyPath(currentPath.current);
        if (copy) {
          // Aquí NO usamos runOnJS: ya estamos en JS thread.
          updatePaths(copy);
        }
        scheduleDisplayPath(null);
        currentPath.current = null;
        isDrawingRef.current = false;
        lastRawPoint.current = null;
        lastFilteredPoint.current = null;
        lastTimestampRef.current = null;
      }
    } catch {
      // ignore
    }

    // 2) Flush de trazos pendientes
    try {
      await flushPendingTracesNow();
    } catch {
      // ignore
    }

    try {
      if (photoSaveTimeoutRef.current) {
        clearTimeout(photoSaveTimeoutRef.current);
        photoSaveTimeoutRef.current = null;
      }
      await flushPendingPhotoUpdates();
    } catch {
      // ignore
    }
  }, [flushPendingPhotoUpdates, flushPendingTracesNow, safeCopyPath, scheduleDisplayPath, updatePaths]);

  useImperativeHandle(ref, () => ({ forceSave }), [forceSave]);

  // Immediately save photo position to DB (used when deselecting)
  const savePhotoPositionImmediately = useCallback(
    async (photoId: number) => {
      try {
        if (!photoId || typeof photoId !== 'number') return;
        
        // Cancel any pending timeout save
        if (photoSaveTimeoutRef.current) {
          clearTimeout(photoSaveTimeoutRef.current);
          photoSaveTimeoutRef.current = null;
        }
        
        // Get the photo from current ref (most up-to-date)
        const photo = photoItemsRef.current.find(p => p.id === photoId);
        if (!photo) return;
        
        // Also merge any pending updates that haven't been flushed
        const pendingUpdates = pendingPhotoUpdatesRef.current?.get(photoId) || {};
        const merged = { ...photo, ...pendingUpdates };
        
        // Clear pending for this photo since we're saving now
        pendingPhotoUpdatesRef.current?.delete(photoId);
        
        await db.runAsync(
          'UPDATE gymnast_images SET position_x = ?, position_y = ?, rotation = ?, scale = ? WHERE id = ?',
          [merged.x, merged.y, merged.rotation, merged.scale, merged.id]
        );
        
        if (__DEV__) console.log('[savePhotoPositionImmediately] Saved photo', photoId, 'at', merged.x, merged.y);
      } catch (e) {
        if (__DEV__) console.warn('[savePhotoPositionImmediately] Error:', e);
      }
    },
    []
  );

  const updatePhotoTransform = useCallback(
    (photoId: number, updates: Partial<PhotoItem>) => {
      try {
        if (!photoId || typeof photoId !== 'number') return;
        if (!updates || typeof updates !== 'object') return;

        setPhotoItems(prev => {
          try {
            const updated = prev.map(p => (p.id === photoId ? { ...p, ...updates } : p));
            // Also update ref immediately for consistency
            photoItemsRef.current = updated;
            return updated;
          } catch {
            return prev;
          }
        });

        const currentPending = pendingPhotoUpdatesRef.current?.get(photoId) || {};
        pendingPhotoUpdatesRef.current?.set(photoId, { ...currentPending, ...updates });

        // Reduced timeout from 3000ms to 500ms for faster auto-save
        if (photoSaveTimeoutRef.current) clearTimeout(photoSaveTimeoutRef.current);
        photoSaveTimeoutRef.current = setTimeout(() => {
          try {
            flushPendingPhotoUpdates();
          } catch {
            // ignore
          }
          photoSaveTimeoutRef.current = null;
        }, 500);
      } catch (e) {
        if (__DEV__) console.warn('[updatePhotoTransform] Error:', e);
      }
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

      // Antes de tocar file system / DB de imágenes, guardar el estado del gimnasta.
      if (typeof onBeforeAddImage === 'function') {
        try {
          await onBeforeAddImage();
        } catch (e) {
          console.error('[Whiteboard] onBeforeAddImage failed', e);
          // No bloqueamos Add Image: esto es best-effort para evitar pérdida de datos.
        }
      }

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

      // Check if component is still mounted
      if (!isMountedRef.current) return;

      // Limit number of images to prevent memory issues
      if (photoItems.length >= MAX_PHOTOS_RENDERED) {
        Alert.alert(
          'Image limit reached',
          `Maximum of ${MAX_PHOTOS_RENDERED} images allowed per gymnast. Please delete an existing image first.`
        );
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
      const initialScale = 1.5; // Larger initial scale so images don't appear too small

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

      const newPhoto: PhotoItem = { id: insertedId, uri: pickedUri, x: centerX, y: centerY, scale: initialScale, rotation: 0 };

      setPhotoItems(prev => {
        const updated = [...prev, newPhoto];
        // Also update ref immediately
        photoItemsRef.current = updated;
        return updated;
      });

      // Force multiple re-renders to ensure the image becomes visible
      // This addresses the async nature of Skia's useImage hook
      setPhotosRenderNonce(n => n + 1);
      
      // Schedule additional re-render nudges to ensure visibility
      // Check isMountedRef before each update to prevent crashes after unmount
      setTimeout(() => {
        if (isMountedRef.current) setPhotosRenderNonce(n => n + 1);
      }, 100);
      
      setTimeout(() => {
        if (isMountedRef.current) setPhotosRenderNonce(n => n + 1);
      }, 300);

      setTimeout(() => {
        if (isMountedRef.current) setPhotosRenderNonce(n => n + 1);
      }, 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error Adding Image', `Could not add the image:\n${msg}`);
    }
  }, [gymnastId, height, loadPhotosFromDatabase, onBeforeAddImage, photoItems.length, pickImageUriViaDocumentPicker, width]);

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
              setPhotoItems(prev => {
                const updated = prev.filter(p => p.id !== photoId);
                // Also update ref immediately
                photoItemsRef.current = updated;
                return updated;
              });
              selectedPhotoRef.current = null;
              setSelectedPhotoId(null);
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

  const selectedPhotoDeleteButtonPos = useMemo(() => {
    if (!selectedPhotoId) return null;
    const photo = photoItems.find(p => p.id === selectedPhotoId);
    if (!photo) return null;
    const meta = imageMeta[selectedPhotoId];
    if (!meta) return null;

    const w = meta.w * (photo.scale || 1);
    const h = meta.h * (photo.scale || 1);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return null;

    // Place circle centered on the top-right corner of the (axis-aligned) photo bounds.
    const left = clamp(photo.x + w - PHOTO_DELETE_BUTTON_SIZE / 2, 0, width - PHOTO_DELETE_BUTTON_SIZE);
    const top = clamp(photo.y - PHOTO_DELETE_BUTTON_SIZE / 2, 0, height - PHOTO_DELETE_BUTTON_SIZE);

    return { left, top };
  }, [height, imageMeta, photoItems, selectedPhotoId, width]);

  // ======= Gestures =======

  // Single tap: select/deselect photo
  const singleTapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(250)
    .onStart(event => {
      try {
        const { x, y } = event;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const photoId = findPhotoAtPoint(x, y);
        if (photoId) {
          selectedPhotoRef.current = photoId;
          setSelectedPhotoId(photoId);
          const photo = photoItemsRef.current.find(p => p.id === photoId);
          if (photo) {
            photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
          }
        } else {
          // Clicked outside - if there was a selected photo, save its position immediately
          const previouslySelectedId = selectedPhotoRef.current;
          if (previouslySelectedId) {
            // Save position immediately before deselecting
            savePhotoPositionImmediately(previouslySelectedId);
          }
          selectedPhotoRef.current = null;
          setSelectedPhotoId(null);
          photoGestureStartRef.current = null;
        }
      } catch {
        // ignore
    }
    });

  // Double tap: reset photo transform if hit; does nothing on empty area
  const doubleTapGesture = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(event => {
      try {
        const { x, y } = event;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const photoId = findPhotoAtPoint(x, y);
        if (photoId) {
          updatePhotoTransform(photoId, { scale: 1, rotation: 0 });
        }
        // No action on empty area – use the 🖼️ button to add images
      } catch {
        // ignore
      }
    });

  // Long press delete removed: deletion is via the X button overlay on the selected image.

  // Pan: move photo (any pointer) or draw (depends on Pen/Hand mode)
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(1)
    .onStart(event => {
      try {
        const { x, y } = event;
        // Basic validation: ensure Skia is available and coords are sane
        if (!skiaSupported) return;
        if (!isFiniteSafeNum(x) || !isFiniteSafeNum(y)) return;
        const pointerType = (event as any).pointerType ?? 0; // 0=finger

        handBlockLoggedRef.current = false;

        const photoId = findPhotoAtPoint(x, y);
        if (photoId) {
          selectedPhotoRef.current = photoId;
          setSelectedPhotoId(photoId);
          // Use ref for most up-to-date photo data
          const photo = photoItemsRef.current.find(p => p.id === photoId);
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

        let p: SkPath | null = null;
        try {
          p = Skia.Path.Make();
        } catch {
          p = null;
        }
        if (!p) return;

        isDrawingRef.current = true;
        currentPath.current = p;
        currentPathPointCount.current = 0;
        lastRawPoint.current = null;
        lastFilteredPoint.current = null;
        lastTimestampRef.current = null;
        lastDisplayUpdateTime.current = 0;
        addSmoothedPoint(currentPath.current, x, y, (event as any)?.timestamp);
        scheduleDisplayPath(safeCopyPath(currentPath.current));
      } catch {
        // ignore
      }
    })
    .onUpdate(event => {
      try {
        const { x, y, translationX, translationY } = event;
        // Basic validation
        if (!skiaSupported) return;
        if (!isFiniteSafeNum(x) || !isFiniteSafeNum(y)) return;
        const pointerType = (event as any).pointerType ?? 0;

        if (selectedPhotoRef.current && photoGestureStartRef.current) {
          const tx = Number.isFinite(translationX) ? translationX : 0;
          const ty = Number.isFinite(translationY) ? translationY : 0;
          const nx = photoGestureStartRef.current.x + tx;
          const ny = photoGestureStartRef.current.y + ty;
          updatePhotoTransform(selectedPhotoRef.current, { x: nx, y: ny });
          return;
        }

        const canDraw = handMode ? pointerType === 0 : pointerType !== 0;
        if (!canDraw) return;

        // Check if component is still mounted
        if (!isMountedRef.current) return;

        // Block drawing updates while pinch/rotation gestures are active
        // to prevent EGL context loss → SIGSEGV on Android
        if (isMultiTouchActiveRef.current) return;

        if (currentPath.current && isDrawingRef.current) {
          const pointAdded = addSmoothedPoint(currentPath.current, x, y, (event as any)?.timestamp);
          
          // Check if path has too many points - if so, finalize current and start new
          if (pointAdded && currentPathPointCount.current >= MAX_POINTS_PER_PATH) {
            // Check mount status before heavy operations
            if (!isMountedRef.current) return;
            
            // Finalize current path
            finalizeSmoothedPath(currentPath.current);
            const completedPath = safeCopyPath(currentPath.current);
            if (completedPath && isMountedRef.current) updatePaths(completedPath);
            
            // Start a new path from the current position
            let newPath: SkPath | null = null;
            try {
              newPath = Skia.Path.Make();
            } catch (e) {
              if (__DEV__) console.warn('[panGesture] Failed to create new path:', e);
              newPath = null;
            }
            
            if (newPath && isMountedRef.current) {
              currentPath.current = newPath;
              currentPathPointCount.current = 0;
              // Reset smoothing state but keep last position for continuity
              const lastPos = lastFilteredPoint.current;
              lastRawPoint.current = null;
              lastFilteredPoint.current = null;
              lastTimestampRef.current = null;
              // Start new path at the current position
              if (lastPos && Number.isFinite(lastPos.x) && Number.isFinite(lastPos.y)) {
                addSmoothedPoint(newPath, lastPos.x, lastPos.y, Date.now());
              }
            }
          }
          
          // Throttle display updates to prevent excessive re-renders
          const now = Date.now();
          // Only update display when we actually added a point (avoid useless copies)
          if (pointAdded && now - lastDisplayUpdateTime.current >= DISPLAY_THROTTLE_MS) {
            lastDisplayUpdateTime.current = now;
            if (isMountedRef.current) {
              scheduleDisplayPath(safeCopyPath(currentPath.current));
            }
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('[panGesture.onUpdate] Error:', e);
      }
    })
    .onEnd(event => {
      try {
        const pointerType = (event as any).pointerType ?? 0;

        // If we were dragging a photo, save its position immediately when pan ends
        if (selectedPhotoRef.current && photoGestureStartRef.current) {
          savePhotoPositionImmediately(selectedPhotoRef.current);
        }

        // finalize draw
        const canDraw = handMode ? pointerType === 0 : pointerType !== 0;
        if (!canDraw) return;

        if (currentPath.current && isDrawingRef.current) {
          finalizeSmoothedPath(currentPath.current);
          const copy = safeCopyPath(currentPath.current);
          if (copy) updatePaths(copy);
          scheduleDisplayPath(null);
          currentPath.current = null;
          isDrawingRef.current = false;
          lastRawPoint.current = null;
          lastFilteredPoint.current = null;
          lastTimestampRef.current = null;
          currentPathPointCount.current = 0;
        }

        // update gesture start for photo using ref for current data
        if (selectedPhotoRef.current) {
          const photo = photoItemsRef.current.find(p => p.id === selectedPhotoRef.current);
          if (photo) {
            photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
          }
        }
      } catch {
        // ignore
      }
    })
    // onEnd no siempre se dispara si el gesto se cancela/compite con otros (tap).
    // onFinalize se ejecuta tanto en success como en cancel/fail.
    .onFinalize(() => {
      try {
        if (selectedPhotoRef.current && photoGestureStartRef.current) {
          savePhotoPositionImmediately(selectedPhotoRef.current);
          const photo = photoItemsRef.current.find(p => p.id === selectedPhotoRef.current);
          if (photo) {
            photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
          }
        }
      } catch {
        // ignore
      }
    });

  // Pinch: scale photo
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(event => {
      try {
        isMultiTouchActiveRef.current = true;
        // Immediately stop any in-progress drawing to avoid GL contention
        if (isDrawingRef.current && currentPath.current) {
          try {
            finalizeSmoothedPath(currentPath.current);
            const copy = safeCopyPath(currentPath.current);
            if (copy) updatePaths(copy);
          } catch { /* ignore */ }
          currentPath.current = null;
          isDrawingRef.current = false;
          scheduleDisplayPath(null);
        }

        const { focalX, focalY } = event;
        if (!Number.isFinite(focalX) || !Number.isFinite(focalY)) return;
        const photoId = findPhotoAtPoint(focalX, focalY);
        if (photoId) {
          selectedPhotoRef.current = photoId;
          setSelectedPhotoId(photoId);
          const photo = photoItemsRef.current.find(p => p.id === photoId);
          if (photo) {
            photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
          }
        }
      } catch {
        // ignore
      }
    })
    .onUpdate(event => {
      try {
        const { scale } = event;
        if (!Number.isFinite(scale)) return;
        if (selectedPhotoRef.current && photoGestureStartRef.current) {
          const nextScale = Math.max(0.3, Math.min(3, photoGestureStartRef.current.scale * scale));
          if (Number.isFinite(nextScale)) {
            updatePhotoTransform(selectedPhotoRef.current, { scale: nextScale });
          }
        }
      } catch {
        // ignore
      }
    })
    .onEnd(() => {
      try {
        if (selectedPhotoRef.current) {
          // Save position immediately after pinch gesture ends
          savePhotoPositionImmediately(selectedPhotoRef.current);
          const photo = photoItemsRef.current.find(p => p.id === selectedPhotoRef.current);
          if (photo) {
            photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
          }
        }
      } catch {
        // ignore
      }
    })
    .onFinalize(() => {
      try {
        isMultiTouchActiveRef.current = false;
        if (selectedPhotoRef.current) {
          savePhotoPositionImmediately(selectedPhotoRef.current);
          const photo = photoItemsRef.current.find(p => p.id === selectedPhotoRef.current);
          if (photo) {
            photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
          }
        }
      } catch {
        // ignore
      }
    });

  // Rotation: rotate photo
  const rotationGesture = Gesture.Rotation()
    .runOnJS(true)
    .onStart(event => {
      try {
        isMultiTouchActiveRef.current = true;
        const { anchorX, anchorY } = event;
        if (!Number.isFinite(anchorX) || !Number.isFinite(anchorY)) return;
        const photoId = findPhotoAtPoint(anchorX, anchorY);
        if (photoId) {
          selectedPhotoRef.current = photoId;
          setSelectedPhotoId(photoId);
          const photo = photoItemsRef.current.find(p => p.id === photoId);
          if (photo) {
            photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
          }
        }
      } catch {
        // ignore
      }
    })
    .onUpdate(event => {
      try {
        const { rotation } = event;
        if (!Number.isFinite(rotation)) return;
        if (selectedPhotoRef.current && photoGestureStartRef.current) {
          const rotationDegrees = (rotation * 180) / Math.PI;
          const nextRotation = (photoGestureStartRef.current.rotation + rotationDegrees) % 360;
          if (Number.isFinite(nextRotation)) {
            updatePhotoTransform(selectedPhotoRef.current, { rotation: nextRotation });
          }
        }
      } catch {
        // ignore
      }
    })
    .onEnd(() => {
      try {
        if (selectedPhotoRef.current) {
          // Save position immediately after rotation gesture ends
          savePhotoPositionImmediately(selectedPhotoRef.current);
          const photo = photoItemsRef.current.find(p => p.id === selectedPhotoRef.current);
          if (photo) {
            photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
          }
        }
      } catch {
        // ignore
      }
    })
    .onFinalize(() => {
      try {
        isMultiTouchActiveRef.current = false;
        if (selectedPhotoRef.current) {
          savePhotoPositionImmediately(selectedPhotoRef.current);
          const photo = photoItemsRef.current.find(p => p.id === selectedPhotoRef.current);
          if (photo) {
            photoGestureStartRef.current = { x: photo.x, y: photo.y, scale: photo.scale, rotation: photo.rotation };
          }
        }
      } catch {
        // ignore
      }
    });

  // Avoid Race() between tap gestures and continuous gestures.
  // Race cancellation can trigger warnings like "Can't cancel already finished gesture" on some Android devices.
  const tapGesture = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const transformGesture = Gesture.Simultaneous(pinchGesture, rotationGesture, panGesture);
  const combinedGesture = Gesture.Simultaneous(tapGesture, transformGesture);

  // Callback when an image finishes loading - forces re-render for visibility
  const handleImageLoaded = useCallback((photoId: number) => {
    // Force a re-render to ensure the image is visible
    setPhotosRenderNonce(n => n + 1);
  }, []);

  const DrawingSurface = useMemo(() => {
    return memo(({
      canvasWidth,
      canvasHeight,
      pathsData,
      paths,
      currentPathDisplay,
      photoItems,
      registerImageMeta,
      onImageLoaded,
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
      onImageLoaded?: (id: number) => void;
      currentColor: string;
      currentStrokeWidth: number;
      isEraser: boolean;
      selectedPen: PenType;
      showJumpBackground: boolean;
      jumpBg: any;
      photosRenderNonce: number;
      canvasRepaintNonce: number;
    }) => {
      const visiblePhotos = (photoItems || []).slice(0, MAX_PHOTOS_RENDERED);

      // Safely filter paths with validation and align data->path
      const safePaths = (paths || []);
      const safePathsData = (pathsData || []);

      // Align path objects with their metadata and skip invalid/skia-unsafe entries
      const aligned: Array<{ pd: PathData; idx: number; path: SkPath }> = [];
      for (let i = 0; i < safePathsData.length; i++) {
        const pd = safePathsData[i];
        const p = safePaths[i];
        if (!pd || !p) continue;
        if (!isValidSkPath(p)) continue;
        aligned.push({ pd, idx: i, path: p as SkPath });
      }

      const normalPaths = aligned.filter(x => (x.pd.penType ?? 0) === 0 || x.pd.isEraser);
      const telePaths = aligned.filter(x => (x.pd.penType ?? 0) === 1);
      const highlightPaths = aligned.filter(x => (x.pd.penType ?? 0) === 2);

      // Back-compat: older eraser traces stored un-multiplied widths
      const getEraserStrokeWidth = (w: number) => (w <= 10 ? w * 4 : w);

      const safeStrokeWidth = (w: unknown, fallback = 1) => {
        const n = Number(w);
        return Number.isFinite(n) && n > 0 ? n : fallback;
      };

      const liveColor = isEraser
        ? '#f9f9f9'
        : selectedPen === 1
          ? 'red'
          : selectedPen === 2
            ? 'yellow'
            : currentColor;
      const liveStrokeWidth = isEraser
        ? safeStrokeWidth(currentStrokeWidth) * 4
        : selectedPen === 1
          ? 2
          : safeStrokeWidth(currentStrokeWidth);

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

          {/* Draw paths and eraser on an offscreen layer.
              This allows the eraser to use blendMode="clear" without affecting the jump background or images. */}
          <Group layer>
            {normalPaths.map(({ pd, idx, path }) => {
              try {
                return (
                  <Path
                    key={`n-${idx}`}
                    path={path as SkPath}
                    color={pd.isEraser ? 'transparent' : pd.color}
                    style="stroke"
                    strokeWidth={pd.isEraser ? getEraserStrokeWidth(safeStrokeWidth(pd.strokeWidth)) : safeStrokeWidth(pd.strokeWidth)}
                    strokeJoin="round"
                    strokeCap="round"
                    blendMode={pd.isEraser ? 'clear' : 'srcOver'}
                  />
                );
              } catch (e) {
                if (__DEV__) console.warn('[DrawingSurface] render normal path error', idx, e);
                return null;
              }
            })}

            {telePaths.map(({ pd, idx, path }) => {
              try {
                return (
                  <Path
                    key={`t-${idx}`}
                    path={path as SkPath}
                    color={pd.color}
                    style="stroke"
                    strokeWidth={safeStrokeWidth(pd.strokeWidth)}
                    strokeJoin="round"
                    strokeCap="round"
                    opacity={0.8}
                  />
                );
              } catch (e) {
                if (__DEV__) console.warn('[DrawingSurface] render tele path error', idx, e);
                return null;
              }
            })}

            {highlightPaths.map(({ pd, idx, path }) => {
              try {
                return (
                  <Group key={`h-${idx}`}>
                    <Path path={path as SkPath} color={pd.color} style="fill" opacity={0.3} />
                    <Path
                      path={path as SkPath}
                      color={pd.color}
                      style="stroke"
                      strokeWidth={safeStrokeWidth(pd.strokeWidth)}
                      strokeJoin="round"
                      strokeCap="round"
                      opacity={0.5}
                    />
                  </Group>
                );
              } catch (e) {
                if (__DEV__) console.warn('[DrawingSurface] render highlight path error', idx, e);
                return null;
              }
            })}

            {currentPathDisplay && isValidSkPath(currentPathDisplay) ? (
              <Group>
                {selectedPen === 2 && !isEraser ? (
                  <Path path={currentPathDisplay} color="yellow" style="fill" opacity={0.3} />
                ) : null}
                {(() => {
                  try {
                    return (
                      <Path
                        path={currentPathDisplay}
                        color={isEraser ? 'transparent' : liveColor}
                        style="stroke"
                        strokeWidth={safeStrokeWidth(liveStrokeWidth)}
                        strokeJoin="round"
                        strokeCap="round"
                        opacity={isEraser ? 1 : selectedPen === 1 ? 0.8 : selectedPen === 2 ? 0.5 : 1}
                        blendMode={isEraser ? 'clear' : 'srcOver'}
                      />
                    );
                  } catch (e) {
                    if (__DEV__) console.warn('[DrawingSurface] render currentPathDisplay error', e);
                    return null;
                  }
                })()}
              </Group>
            ) : null}
          </Group>

          {/* Images rendered on top of paths/eraser so they are always visible above drawings */}
          {visiblePhotos.map(item => (
            <SkiaPhoto key={item.id} item={item} registerMeta={registerImageMeta} renderNonce={photosRenderNonce} onImageLoaded={onImageLoaded} />
          ))}
        </Canvas>
      );
    });
  }, []);

  // ── Guards (after all hooks to respect Rules of Hooks) ──────────────
  if (invalidGymnast) {
    return <View style={[styles.container, { height }]} />;
  }

  if (!skiaSupported || !isAppActive) {
    return <View style={[styles.container, { width, height }]} />;
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={combinedGesture}>
          <View style={styles.drawingContainer}>
            <SkiaErrorBoundary>
              <DrawingSurface
                canvasWidth={width}
                canvasHeight={height}
                pathsData={pathsData}
                paths={paths}
                currentPathDisplay={currentPathDisplay}
                photoItems={photoItems}
                registerImageMeta={registerImageMeta}
                onImageLoaded={handleImageLoaded}
                currentColor={currentColor}
                currentStrokeWidth={currentStrokeWidth}
                isEraser={isEraser}
                selectedPen={selectedPen}
                showJumpBackground={showJumpBackground}
                jumpBg={jumpBg}
                photosRenderNonce={photosRenderNonce}
                canvasRepaintNonce={canvasRepaintNonce}
              />
            </SkiaErrorBoundary>
          </View>
        </GestureDetector>

        {selectedPhotoId && selectedPhotoDeleteButtonPos ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.photoDeleteButtonWrapper,
              { left: selectedPhotoDeleteButtonPos.left, top: selectedPhotoDeleteButtonPos.top },
            ]}
          >
            <TouchableOpacity
              style={styles.photoDeleteButton}
              onPress={() => deletePhoto(selectedPhotoId)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.photoDeleteButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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

        {/* Top toolbar (outside hamburger): star/undo/redo/eraser + quick pens + stroke bar */}
        <View style={styles.topToolbarContainer}>
          {/* Star toggle button */}
          <TouchableOpacity
            style={[styles.actionButton, isStarred && styles.starredButton]}
            onPress={handleToggleStarred}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>{isStarred ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
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
                {discipline ?  'STICK BONUS' :  'DMT BONUS'}
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
  drawingContainer: {
    flex: 1,
  },
  canvas: {
    backgroundColor: '#f9f9f9',
  },
  photoDeleteButtonWrapper: {
    position: 'absolute',
    width: PHOTO_DELETE_BUTTON_SIZE,
    height: PHOTO_DELETE_BUTTON_SIZE,
    zIndex: 1500,
  },
  photoDeleteButton: {
    width: PHOTO_DELETE_BUTTON_SIZE,
    height: PHOTO_DELETE_BUTTON_SIZE,
    borderRadius: PHOTO_DELETE_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    borderWidth: 1,
    borderColor: 'black',
  },
  photoDeleteButtonText: {
    color: '#f9f9f9',
    fontSize: 18,
    lineHeight: 18,
    fontWeight: 'bold',
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
  starredButton: {
    backgroundColor: '#fffde7',
    borderWidth: 2,
    borderColor: '#ffc107',
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
