import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  PanResponderGestureState,
  GestureResponderEvent,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface DraggableFolderItemProps {
  children: React.ReactNode;
  onDragStart?: () => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
  onDrag?: (position: { x: number; y: number }) => void;
  disabled?: boolean;
  initialPosition?: { x: number; y: number };
}

export const DraggableFolderItem: React.FC<DraggableFolderItemProps> = ({
  children,
  onDragStart,
  onDragEnd,
  onDrag,
  disabled = false,
  initialPosition = { x: 0, y: 0 },
}) => {
  const pan = useRef(new Animated.ValueXY(initialPosition)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Activar el drag si se mueve más de 10px después de 200ms
        return !disabled && (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10);
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: (evt, gestureState) => {
        if (disabled) return;
        
        isDragging.current = true;
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
        
        // Animación de escalado al empezar a arrastrar
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: false,
        }).start();
        
        onDragStart && onDragStart();
      },
      onPanResponderMove: (evt, gestureState) => {
        if (disabled) return;
        
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(evt, gestureState);
        
        const currentPosition = {
          x: (pan.x as any)._value + gestureState.dx,
          y: (pan.y as any)._value + gestureState.dy,
        };
        
        onDrag && onDrag(currentPosition);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (disabled) return;
        
        isDragging.current = false;
        pan.flattenOffset();
        
        // Animación de escalado al terminar de arrastrar
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: false,
        }).start();
        
        const finalPosition = {
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        };
        
        onDragEnd && onDragEnd(finalPosition);
      },
      onPanResponderTerminate: (evt, gestureState) => {
        if (disabled) return;
        
        isDragging.current = false;
        pan.flattenOffset();
        
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        transform: [
          { translateX: pan.x },
          { translateY: pan.y },
          { scale: scale },
        ],
        zIndex: isDragging.current ? 1000 : 1,
        elevation: isDragging.current ? 1000 : 1,
      }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
};
