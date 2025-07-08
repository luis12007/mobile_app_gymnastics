import React, { useRef, useState } from 'react';
import {
  View,
  Animated,
  PanResponder,
  Vibration,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface GridDraggableItemProps {
  children: React.ReactNode;
  onDragStart?: () => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
  onLongPress?: () => void;
  disabled?: boolean;
  isDragging?: boolean;
}

export const GridDraggableItem: React.FC<GridDraggableItemProps> = ({
  children,
  onDragStart,
  onDragEnd,
  onLongPress,
  disabled = false,
  isDragging = false,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [isActiveDragging, setIsActiveDragging] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => isActiveDragging,

      onPanResponderGrant: () => {
        if (!isActiveDragging) return;
        
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
        
        // Animar el scaling y hacer semi-transparente
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1.1,
            useNativeDriver: false,
          }),
          Animated.spring(opacity, {
            toValue: 0.8,
            useNativeDriver: false,
          })
        ]).start();
        
        onDragStart?.();
      },

      onPanResponderMove: (evt, gestureState) => {
        if (!isActiveDragging) return;
        
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(evt, gestureState);
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (!isActiveDragging) return;
        
        const finalPosition = {
          x: (pan.x as any)._value + gestureState.dx,
          y: (pan.y as any)._value + gestureState.dy,
        };
        
        setIsActiveDragging(false);
        pan.flattenOffset();
        
        // Animar de vuelta a la posición original
        Animated.parallel([
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: false,
          })
        ]).start();
        
        onDragEnd?.(finalPosition);
      },
    })
  ).current;

  const handleLongPress = () => {
    if (disabled) return;
    
    console.log('Long press detected - activating drag');
    setIsActiveDragging(true);
    Vibration.vibrate(50);
    onLongPress?.();
  };

  const handlePressIn = () => {
    if (disabled || isActiveDragging) return;
    
    const timer = setTimeout(handleLongPress, 500) as unknown as number;
    setLongPressTimer(timer);
  };

  const handlePressOut = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer as unknown as NodeJS.Timeout);
      setLongPressTimer(null);
    }
  };

  // Si está siendo arrastrado por otro componente, mostrar un placeholder
  if (isDragging && !isActiveDragging) {
    return (
      <View style={styles.placeholder}>
        <View style={styles.placeholderContent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.draggableContent,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
            opacity: opacity,
            zIndex: isActiveDragging ? 1000 : 1,
            elevation: isActiveDragging ? 10 : 1,
          },
        ]}
        {...panResponder.panHandlers}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
      >
        {children}
        {/* Indicador visual cuando está en modo drag */}
        {isActiveDragging && (
          <View style={styles.dragIndicator}>
            <View style={styles.dragDot} />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Este container mantiene el espacio en el grid con flexbox
    flex: 1,
    margin: 8, // Espacio entre elementos
    minWidth: 150, // Ancho mínimo para mantener la grid
    maxWidth: 250, // Ancho máximo
  },
  draggableContent: {
    // El contenido draggable mantiene las dimensiones originales
    flex: 1,
  },
  placeholder: {
    // Placeholder cuando el elemento está siendo arrastrado
    flex: 1,
    opacity: 0.3,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120, // Ajustar según el tamaño de las carpetas
    margin: 8,
  },
  placeholderContent: {
    width: '80%',
    height: '80%',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
  },
  dragIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dragDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
});
