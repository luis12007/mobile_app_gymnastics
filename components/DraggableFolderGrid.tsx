import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Dimensions,
  Animated,
  StyleSheet,
  PanResponder,
  Vibration,
  TouchableWithoutFeedback,
  Easing,
  ScrollView,
  Text,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FolderData {
  id: number;
  position?: number;
  [key: string]: any;
}

interface DraggableFolderGridProps {
  folders: FolderData[];
  renderItem: (folder: FolderData, isDragging: boolean) => React.ReactNode;
  onPositionChange: (newPositions: { id: number; position: number }[]) => void;
  numColumns: number;
  itemWidth: number;
  itemHeight: number;
  itemSpacing: number;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

export const DraggableFolderGrid: React.FC<DraggableFolderGridProps> = ({
  folders,
  renderItem,
  onPositionChange,
  numColumns,
  itemWidth,
  itemHeight,
  itemSpacing,
  scrollViewRef,
}) => {
  const [sortedFolders, setSortedFolders] = useState<FolderData[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [autoScrollTimer, setAutoScrollTimer] = useState<number | null>(null);

  // Ordenar carpetas por posición
  useEffect(() => {
    const sorted = [...folders].sort((a, b) => {
      if (a.position === undefined && b.position === undefined) return 0;
      if (a.position === undefined) return 1;
      if (b.position === undefined) return -1;
      return a.position - b.position;
    });
    setSortedFolders(sorted);
  }, [folders]);

  const calculatePosition = (index: number) => {
    const row = Math.floor(index / numColumns);
    const col = index % numColumns;
    return {
      x: col * (itemWidth + itemSpacing) + itemSpacing,
      y: row * (itemHeight + itemSpacing) + itemSpacing,
    };
  };

  const findIndexFromPosition = (x: number, y: number) => {
    const col = Math.max(0, Math.min(numColumns - 1, Math.round((x - itemSpacing) / (itemWidth + itemSpacing))));
    const row = Math.max(0, Math.round((y - itemSpacing) / (itemHeight + itemSpacing)));
    return Math.min(sortedFolders.length - 1, row * numColumns + col);
  };

  const moveFolder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newSorted = [...sortedFolders];
    const [movedFolder] = newSorted.splice(fromIndex, 1);
    newSorted.splice(toIndex, 0, movedFolder);
    
    setSortedFolders(newSorted);
    
    // Vibración para feedback
    Vibration.vibrate(20);
    
    // Actualizar posiciones en la base de datos
    const newPositions = newSorted.map((folder, index) => ({
      id: folder.id,
      position: index,
    }));
    
    onPositionChange(newPositions);
  };

  const handleAutoScroll = (y: number, containerHeight: number) => {
    if (!scrollViewRef?.current) return;
    
    const scrollThreshold = 100; // píxeles del borde para activar auto-scroll
    const scrollSpeed = 10;
    
    if (y < scrollThreshold) {
      // Scroll hacia arriba
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - scrollSpeed), animated: true });
    } else if (y > containerHeight - scrollThreshold) {
      // Scroll hacia abajo
      scrollViewRef.current.scrollTo({ y: y + scrollSpeed, animated: true });
    }
  };

  const DraggableItem: React.FC<{ 
    folder: FolderData; 
    index: number; 
  }> = ({ folder, index }) => {
    const position = calculatePosition(index);
    const pan = useRef(new Animated.ValueXY(position)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const isDragging = draggingId === folder.id;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => {
          // Solo activar si la carpeta está en modo dragging
          return isDragging;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Activar si ya está dragging o si hay movimiento significativo
          return isDragging || (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5);
        },
        
        onPanResponderGrant: (evt, gestureState) => {
          if (!isDragging) return;
          
          pan.setOffset({
            x: (pan.x as any)._value,
            y: (pan.y as any)._value,
          });
          pan.setValue({ x: 0, y: 0 });
          
          Animated.spring(scale, {
            toValue: 1.2,
            useNativeDriver: false,
          }).start();
        },
        
        onPanResponderMove: (evt, gestureState) => {
          if (!isDragging) return;
          
          Animated.event([null, { dx: pan.x, dy: pan.y }], {
            useNativeDriver: false,
          })(evt, gestureState);
          
          // Calcular nueva posición
          const currentX = position.x + gestureState.dx;
          const currentY = position.y + gestureState.dy;
          const centerX = currentX + itemWidth / 2;
          const centerY = currentY + itemHeight / 2;
          
          const newIndex = findIndexFromPosition(centerX, centerY);
          
          if (newIndex !== index && newIndex >= 0 && newIndex < sortedFolders.length) {
            moveFolder(index, newIndex);
          }
        },
        
        onPanResponderRelease: () => {
          if (!isDragging) return;
          
          pan.flattenOffset();
          setDraggingId(null);
          
          // Animar de vuelta a la posición de la grid
          const newIndex = sortedFolders.findIndex(f => f.id === folder.id);
          const newPosition = calculatePosition(newIndex);
          
          Animated.parallel([
            Animated.spring(pan, {
              toValue: newPosition,
              useNativeDriver: false,
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: false,
            }),
          ]).start();
        },
      })
    ).current;

    // Actualizar posición cuando el índice cambie
    useEffect(() => {
      if (!isDragging) {
        const newPosition = calculatePosition(index);
        Animated.spring(pan, {
          toValue: newPosition,
          tension: 120,
          friction: 7,
          useNativeDriver: false,
        }).start();
      }
    }, [index, isDragging]);

    const handleLongPress = () => {
      console.log('Long press detected for folder:', folder.id);
      setDraggingId(folder.id);
      Vibration.vibrate(50); // Vibración simple y rápida
      
      // Animación de feedback visual más inmediata
      Animated.spring(scale, {
        toValue: 1.1,
        useNativeDriver: false,
        tension: 200,
        friction: 5,
      }).start();
    };

    const handlePressIn = () => {
      console.log('Press IN detected for folder:', folder.id, 'Current dragging:', draggingId);
      if (draggingId === null) { // Solo si no hay ninguna carpeta siendo arrastrada
        // Reducir tiempo a 400ms para activación más rápida
        const timer = setTimeout(handleLongPress, 400) as unknown as number;
        setLongPressTimer(timer);
      }
    };

    const handlePressOut = () => {
      console.log('Press OUT detected for folder:', folder.id);
      if (longPressTimer) {
        clearTimeout(longPressTimer as unknown as NodeJS.Timeout);
        setLongPressTimer(null);
      }
    };

    return (
      <Animated.View
        style={[
          styles.itemContainer,
          {
            width: itemWidth,
            height: itemHeight,
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
            zIndex: isDragging ? 1000 : 1,
            elevation: isDragging ? 10 : 1,
            shadowOpacity: isDragging ? 0.3 : 0,
            shadowRadius: isDragging ? 8 : 0,
            shadowOffset: isDragging ? { width: 0, height: 4 } : { width: 0, height: 0 },
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableWithoutFeedback
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={false}
        >
          <View style={styles.itemContent}>
            {renderItem(folder, isDragging)}
            {/* Debug indicator */}
            {isDragging && (
              <View style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 20,
                height: 20,
                backgroundColor: 'red',
                borderRadius: 10,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1001,
              }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>D</Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  };

  const totalRows = Math.ceil(sortedFolders.length / numColumns);
  const containerHeight = totalRows * (itemHeight + itemSpacing) + itemSpacing;

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {sortedFolders.map((folder, index) => (
        <DraggableItem
          key={folder.id}
          folder={folder}
          index={index}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  itemContainer: {
    position: 'absolute',
  },
  itemContent: {
    width: '100%',
    height: '100%',
  },
});
