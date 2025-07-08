import React, { useRef, useState } from 'react';
import {
  View,
  Animated,
  PanResponder,
  Vibration,
  StyleSheet,
} from 'react-native';

interface SimpleDraggableItemProps {
  children: React.ReactNode;
  onDragStart?: () => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

export const SimpleDraggableItem: React.FC<SimpleDraggableItemProps> = ({
  children,
  onDragStart,
  onDragEnd,
  onLongPress,
  disabled = false,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => isDragging,

      onPanResponderGrant: () => {
        if (!isDragging) return;
        
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
        
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: false,
        }).start();
        
        onDragStart?.();
      },

      onPanResponderMove: (evt, gestureState) => {
        if (!isDragging) return;
        
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(evt, gestureState);
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (!isDragging) return;
        
        const finalPosition = {
          x: (pan.x as any)._value + gestureState.dx,
          y: (pan.y as any)._value + gestureState.dy,
        };
        
        setIsDragging(false);
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
        ]).start();
        
        onDragEnd?.(finalPosition);
      },
    })
  ).current;

  const handleLongPress = () => {
    if (disabled) return;
    
    console.log('Long press detected - activating drag');
    setIsDragging(true);
    Vibration.vibrate(50);
    onLongPress?.();
    
    Animated.spring(scale, {
      toValue: 1.05,
      useNativeDriver: false,
    }).start();
  };

  const handlePressIn = () => {
    if (disabled || isDragging) return;
    
    const timer = setTimeout(handleLongPress, 500) as unknown as number;
    setLongPressTimer(timer);
  };

  const handlePressOut = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer as unknown as NodeJS.Timeout);
      setLongPressTimer(null);
    }
  };

  return (
    <Animated.View
      style={[
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scale },
          ],
          zIndex: isDragging ? 1000 : 1,
          elevation: isDragging ? 10 : 1,
        },
      ]}
      {...panResponder.panHandlers}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      {children}
      {/* Indicador visual cuando está en modo drag */}
      {isDragging && (
        <View style={styles.dragIndicator}>
          <View style={styles.dragDot} />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dragIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  dragDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
});
