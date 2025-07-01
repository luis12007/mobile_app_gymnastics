// OptimizedNumberPad.tsx
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Constantes precalculadas para mejor rendimiento
const { width } = Dimensions.get('window');
const IS_IOS = Platform.OS === 'ios';
const IS_SMALL_SCREEN = width < 375;
const IS_TABLET = width > 768;

// Dimensiones calculadas una sola vez
const BUTTON_WIDTH = IS_TABLET 
  ? (width - 120) / 4 
  : (width - (IS_SMALL_SCREEN ? 60 : 80)) / 4;

const BUTTON_HEIGHT = IS_TABLET ? 70 : IS_SMALL_SCREEN ? 55 : 60;
const FONT_SIZE = IS_TABLET ? 28 : IS_SMALL_SCREEN ? 20 : 22;
const PADDING = IS_TABLET ? 20 : IS_SMALL_SCREEN ? 12 : 16;

// Configuraciones de animación optimizadas
const ANIMATION_CONFIG = {
  duration: 250,
  useNativeDriver: true,
};

// Configuración de Pressable optimizada
const PRESS_CONFIG = {
  android_ripple: { color: 'rgba(0, 0, 0, 0.1)', borderless: false },
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
};

// HitSlop específico para el botón submit
const SUBMIT_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

// Tipos para las props del componente
interface NumberPadProps {
  onNumberPress: (number: string) => void;
  onDecimalPress: () => void;
  onDeletePress: () => void;
  onHidePress: () => void;
  onSubmitPress: () => void;
  visible?: boolean;
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  style?: any;
  textStyle?: any;
  isSubmit?: boolean;
}

// Componente Button optimizado con React.memo
const OptimizedButton = React.memo<ButtonProps>(({ 
  title, 
  onPress, 
  style, 
  textStyle, 
  isSubmit = false 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const buttonStyle = useMemo(() => [
    styles.button,
    style,
    { transform: [{ scale: scaleAnim }] }
  ], [style, scaleAnim]);

  const combinedTextStyle = useMemo(() => [
    styles.buttonText,
    textStyle
  ], [textStyle]);

  return (
    <Animated.View style={buttonStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={isSubmit ? SUBMIT_HIT_SLOP : PRESS_CONFIG.hitSlop}
        android_ripple={PRESS_CONFIG.android_ripple}
        style={styles.pressableContent}
      >
        <Text style={combinedTextStyle}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
});

const SimplifiedNumberPad: React.FC<NumberPadProps> = ({ 
  onNumberPress, 
  onDecimalPress, 
  onDeletePress, 
  onHidePress,
  onSubmitPress,
  visible = true 
}) => {
  // Animaciones optimizadas
  const translateY = useRef(new Animated.Value(200)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Callbacks memoizados para evitar recreaciones
  const handleNumberPress = useCallback((number: string) => {
    onNumberPress(number);
  }, [onNumberPress]);

  const handleDecimalPress = useCallback(() => {
    onDecimalPress();
  }, [onDecimalPress]);

  const handleDeletePress = useCallback(() => {
    onDeletePress();
  }, [onDeletePress]);

  const handleHidePress = useCallback(() => {
    onHidePress();
  }, [onHidePress]);

  const handleSubmitPress = useCallback(() => {
    onSubmitPress();
  }, [onSubmitPress]);

  // Animación de entrada/salida optimizada
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          ...ANIMATION_CONFIG,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          ...ANIMATION_CONFIG,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 200,
          ...ANIMATION_CONFIG,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          ...ANIMATION_CONFIG,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  // Memoizar estilos del contenedor
  const containerStyle = useMemo(() => [
    styles.container,
    {
      transform: [{ translateY }],
      opacity,
    }
  ], [translateY, opacity]);

  // Early return si no es visible
  if (!visible) return null;

  return (
    <Animated.View style={containerStyle}>
      {/* Row 1 */}
      <View style={styles.row}>
        <OptimizedButton title="7" onPress={() => handleNumberPress('7')} />
        <OptimizedButton title="8" onPress={() => handleNumberPress('8')} />
        <OptimizedButton title="9" onPress={() => handleNumberPress('9')} />
        <OptimizedButton 
          title="⌫" 
          onPress={handleDeletePress}
          style={styles.actionButton}
          textStyle={styles.actionText}
        />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        <OptimizedButton title="4" onPress={() => handleNumberPress('4')} />
        <OptimizedButton title="5" onPress={() => handleNumberPress('5')} />
        <OptimizedButton title="6" onPress={() => handleNumberPress('6')} />
        <View style={styles.spacer} />
          
        <View style={styles.tallButtonContainer}>
          <OptimizedButton 
            title="✓"
            onPress={handleSubmitPress}
            style={styles.tallPrimaryButton}
            textStyle={styles.primaryText}
            isSubmit={true}
          />
        </View>
      </View>

      {/* Row 3 */}
      <View style={styles.row}>
        <OptimizedButton title="1" onPress={() => handleNumberPress('1')} />
        <OptimizedButton title="2" onPress={() => handleNumberPress('2')} />
        <OptimizedButton title="3" onPress={() => handleNumberPress('3')} />
        <View style={styles.spacer} />
      </View>

      {/* Row 4 */}
      <View style={styles.row}>
        <OptimizedButton 
          title="0" 
          onPress={() => handleNumberPress('0')}
          style={styles.zeroButton}
        />
        <OptimizedButton 
          title="." 
          onPress={handleDecimalPress}
        />
        <OptimizedButton 
          title="⌨" 
          onPress={handleHidePress}
          style={styles.actionButton}
          textStyle={styles.actionText}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D1D1D6',
    paddingHorizontal: PADDING,
    paddingTop: PADDING,
    paddingBottom: IS_IOS ? 34 : PADDING + 10,
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
    zIndex: 9999,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    position: 'relative',
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: '#C6C6C8',
    overflow: 'visible',
  },
  pressableContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: FONT_SIZE,
    fontWeight: '400',
    textAlign: 'center',
  },
  zeroButton: {
    backgroundColor: '#FFFFFF',
    width: BUTTON_WIDTH * 2 + 27,
    borderWidth: 0.5,
    borderColor: '#C6C6C8',
  },
  actionButton: {
    backgroundColor: '#AEB3BC',
    borderWidth: 0.5,
    borderColor: '#C6C6C8',
  },
  actionText: {
    color: '#000000',
    fontSize: FONT_SIZE - 2,
    textAlign: 'center',
  },
  tallButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: (BUTTON_HEIGHT * 2) + 10,
    width: BUTTON_WIDTH,
    zIndex: 1,
  },
  tallPrimaryButton: {
    backgroundColor: '#007AFF',
    borderWidth: 0.5,
    borderColor: '#007AFF',
    height: (BUTTON_HEIGHT * 2) + 10,
    width: BUTTON_WIDTH,
    overflow: 'hidden',
    borderRadius: 6,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  spacer: {
    width: BUTTON_WIDTH,
    pointerEvents: 'none',
  },
});

export default SimplifiedNumberPad;