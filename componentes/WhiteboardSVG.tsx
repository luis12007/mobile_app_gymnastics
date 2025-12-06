import React, { useCallback, useState, useRef, useEffect, memo } from 'react';
import { View, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { db } from '../lib/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WhiteboardProps {
  gymnastId: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  penType?: string;
  onPathsChange?: (count: number) => void;
}

interface Point {
  x: number;
  y: number;
}

interface PathData {
  id: string;
  d: string; // SVG path data
  color: string;
  width: number;
  penType: string;
}

const WhiteboardSVG = memo(({
  gymnastId,
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT * 0.7,
  strokeColor = '#000000',
  strokeWidth = 3,
  backgroundColor = '#FFFFFF',
  penType = 'normal',
  onPathsChange,
}: WhiteboardProps) => {
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const currentPointsRef = useRef<Point[]>([]);
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathIdCounterRef = useRef(0);

  // Convertir puntos a SVG path con suavizado Catmull-Rom
  const pointsToSmoothPath = useCallback((points: Point[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    // Smooth path usando cuadrática Bezier para mejor rendimiento
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      
      // Punto de control en el medio para suavizado
      const cpx = (p0.x + p1.x) / 2;
      const cpy = (p0.y + p1.y) / 2;
      
      path += ` Q ${p0.x} ${p0.y} ${cpx} ${cpy}`;
    }
    
    // Último punto
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;
    
    return path;
  }, []);

  // Simplificar puntos para mejor rendimiento (algoritmo Ramer-Douglas-Peucker simplificado)
  const simplifyPoints = useCallback((points: Point[], tolerance: number = 2): Point[] => {
    if (points.length <= 2) return points;
    
    const simplified: Point[] = [points[0]];
    let lastPoint = points[0];
    
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance >= tolerance) {
        simplified.push(point);
        lastPoint = point;
      }
    }
    
    simplified.push(points[points.length - 1]);
    return simplified;
  }, []);

  // Guardar a base de datos
  const savePathsToDatabase = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    
    try {
      await db.runAsync('DELETE FROM whiteboard_traces WHERE gymnast_id = ?', [gymnastId]);
      
      for (let i = 0; i < paths.length; i++) {
        const pathData = paths[i];
        await db.runAsync(
          `INSERT INTO whiteboard_traces (gymnast_id, trace_data, color, stroke_width, pen_type, order_index) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [gymnastId, pathData.d, pathData.color, pathData.width, pathData.penType, i]
        );
      }
      
      console.log(`✅ Guardados ${paths.length} paths para gimnasta ${gymnastId}`);
      onPathsChange?.(paths.length);
    } catch (error) {
      console.error('❌ Error al guardar paths:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [gymnastId, paths, onPathsChange]);

  // Guardar con debounce
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(savePathsToDatabase, 300);
  }, [savePathsToDatabase]);

  // Cargar desde base de datos
  const loadPathsFromDatabase = useCallback(async () => {
    try {
      setIsLoaded(false);
      const traces = await db.getAllAsync<any>(
        'SELECT * FROM whiteboard_traces WHERE gymnast_id = ? ORDER BY order_index ASC',
        [gymnastId]
      );

      const loadedPaths: PathData[] = traces.map((trace, index) => ({
        id: `loaded-${gymnastId}-${index}-${Date.now()}`,
        d: trace.trace_data,
        color: trace.color || strokeColor,
        width: trace.stroke_width || strokeWidth,
        penType: trace.pen_type || 'normal',
      }));

      setPaths(loadedPaths);
      pathIdCounterRef.current = loadedPaths.length;
      setIsLoaded(true);
      onPathsChange?.(loadedPaths.length);
      console.log(`✅ Cargados ${loadedPaths.length} paths para gimnasta ${gymnastId}`);
    } catch (error) {
      console.error('❌ Error cargando paths:', error);
      setPaths([]);
      setIsLoaded(true);
    }
  }, [gymnastId, strokeColor, strokeWidth, onPathsChange]);

  useEffect(() => {
    loadPathsFromDatabase();
  }, [loadPathsFromDatabase]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (paths.length > 0) savePathsToDatabase();
    };
  }, [savePathsToDatabase, paths.length]);

  // Manejar gestos
  const handleTouchStart = useCallback((x: number, y: number) => {
    currentPointsRef.current = [{ x, y }];
    setCurrentPath(`M ${x} ${y}`);
  }, []);

  const handleTouchMove = useCallback((x: number, y: number) => {
    currentPointsRef.current.push({ x, y });
    
    // Actualizar path en tiempo real con suavizado
    const smoothPath = pointsToSmoothPath(currentPointsRef.current);
    setCurrentPath(smoothPath);
  }, [pointsToSmoothPath]);

  const handleTouchEnd = useCallback(() => {
    if (currentPointsRef.current.length > 1) {
      // Simplificar y suavizar puntos finales
      const simplified = simplifyPoints(currentPointsRef.current, 1.5);
      const finalPath = pointsToSmoothPath(simplified);
      
      const newPath: PathData = {
        id: `path-${gymnastId}-${pathIdCounterRef.current++}-${Date.now()}`,
        d: finalPath,
        color: strokeColor,
        width: strokeWidth,
        penType,
      };
      
      setPaths(prev => [...prev, newPath]);
      setCurrentPath('');
      currentPointsRef.current = [];
      debouncedSave();
    } else {
      setCurrentPath('');
      currentPointsRef.current = [];
    }
  }, [gymnastId, strokeColor, strokeWidth, penType, simplifyPoints, pointsToSmoothPath, debouncedSave]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        handleTouchStart(locationX, locationY);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        handleTouchMove(locationX, locationY);
      },
      onPanResponderRelease: handleTouchEnd,
      onPanResponderTerminate: handleTouchEnd,
    })
  ).current;

  // Funciones públicas para manipular el whiteboard
  const clearAll = useCallback(() => {
    setPaths([]);
    setCurrentPath('');
    currentPointsRef.current = [];
    debouncedSave();
  }, [debouncedSave]);

  const undo = useCallback(() => {
    if (paths.length > 0) {
      setPaths(prev => prev.slice(0, -1));
      debouncedSave();
    }
  }, [paths.length, debouncedSave]);

  // Exponer funciones a través de ref
  React.useImperativeHandle(
    useRef(),
    () => ({
      clearAll,
      undo,
      getPathsCount: () => paths.length,
    }),
    [clearAll, undo, paths.length]
  );

  if (!isLoaded) {
    return (
      <View style={[styles.container, { width, height, backgroundColor }]}>
        <View style={styles.loadingContainer} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height, backgroundColor }]}>
      <View {...panResponder.panHandlers} style={styles.drawingArea}>
        <Svg width={width} height={height} style={styles.svg}>
          <G>
            {/* Paths guardados */}
            {paths.map((path) => (
              <Path
                key={path.id}
                d={path.d}
                stroke={path.color}
                strokeWidth={path.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            
            {/* Path actual siendo dibujado */}
            {currentPath && (
              <Path
                d={currentPath}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
          </G>
        </Svg>
      </View>
    </View>
  );
});

WhiteboardSVG.displayName = 'WhiteboardSVG';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
});

export default WhiteboardSVG;
export { WhiteboardSVG };

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
