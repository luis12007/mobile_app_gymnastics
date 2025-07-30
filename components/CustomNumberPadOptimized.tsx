/**
 * CustomNumberPadOptimized.tsx
 * Ultra-optimized number pad component using React Native Reanimated 3
 * and advanced performance techniques for maximum responsiveness
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  StyleSheet,
  Modal,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Performance constants - Object.freeze for immutability
const SCREEN_DIMENSIONS = Object.freeze({
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
});

const { width, height } = Dimensions.get("window");
var isLargeDevice = false;
var isMediumLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;

if (width >= 1368 ) {
  isLargeDevice = true;
} else if (width >= 1200 && width < 1368) {
  isMediumLargeDevice = true;
} else if (width >= 960 && width < 1200) {
  isSmallDevice = true;
} else if (width < 960) {
  isTinyDevice = true;
}



// Animación desactivada: el modal aparece instantáneamente
const ANIMATION_CONFIG = Object.freeze({
  spring: {
    damping: 1,
    stiffness: 1,
    mass: 1,
  },
  timing: {
    duration: 0,
  },
});

const LAYOUT_CONSTANTS = Object.freeze({
  BUTTON_MARGIN: 12,    // Increased margin for better spacing
  PADDING: 24,          // Increased padding
  BORDER_RADIUS: 18,    // Larger border radius for modern look
  BUTTON_HEIGHT: 85,    // Even larger buttons for easier tapping
  GRID_GAP: 18,         // Increased gap between buttons
});

// Button data structure - Unified layout with single larger buttons for repeated elements
const BUTTON_DATA = isTinyDevice
  ? Object.freeze([
      Object.freeze(['C',  '.','', '✓', '⌫']),
      Object.freeze(['1', '2', '3', '4', '5']),
      Object.freeze(['6', '7', '8', '9', '0']),
    ])
  : Object.freeze([
      Object.freeze(['C', '', '⌫']),
      Object.freeze(['1', '2', '3']),
      Object.freeze(['4', '5', '6']),
      Object.freeze(['7', '8', '9']),
      Object.freeze(['0', '.', '✓']),
    ]);

// Pre-calculated styles for maximum performance
const createOptimizedStyles = () => {
  const margin = LAYOUT_CONSTANTS.BUTTON_MARGIN;
  const buttonHeight = LAYOUT_CONSTANTS.BUTTON_HEIGHT;
  
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContainer: {
      backgroundColor: '#ffffff',
      borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS,
      padding: LAYOUT_CONSTANTS.PADDING,
      width: '100%',
      maxWidth: 420,
      maxHeight: '85%',
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
    },
    header: {
      marginBottom: 24,
      alignItems: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: '#1a1a1a',
      marginBottom: 16,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    inputContainer: {
      backgroundColor: '#f8f9fb',
      borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS,
      borderWidth: 2,
      borderColor: '#e1e5e9',
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    input: {
      fontSize: 28,
      fontWeight: '700',
      color: '#1a1a1a',
      textAlign: 'center',
      paddingVertical: 18,
      paddingHorizontal: 24,
      minHeight: 70,
      letterSpacing: 1,
    },
    container: {
      backgroundColor: 'transparent',
      width: '100%',
    },
    grid: {
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
      gap: LAYOUT_CONSTANTS.GRID_GAP,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      height: buttonHeight,
      gap: LAYOUT_CONSTANTS.GRID_GAP,
    },
    button: {
      flex: 1,
      height: buttonHeight,
      borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      // Perfect symmetry and touch area
      minWidth: 0,
      aspectRatio: 1.2, // Makes buttons rectangular (wider than tall)
      overflow: 'hidden', // Ensures border radius is properly applied
      // Improved touch target
      marginHorizontal: 2, // Small horizontal margin for better visual separation
    },
    buttonText: {
      fontSize: 32,       // Even larger text for rectangular buttons
      fontWeight: '700',  // Bolder text
      color: '#333',
      textAlign: 'center',
    },
    wideButton: {
      flex: 2.5, // Makes the button wider than normal buttons
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    closeButtonText: {
      fontSize: 20,
      fontWeight: '700',
      color: '#666',
      lineHeight: 20,
    },
  });
};

const STYLES = createOptimizedStyles();
Object.freeze(STYLES);

// Interfaces
interface CustomNumberPadOptimizedProps {
  value: string;
  onValueChange: (value: string) => void;
  visible: boolean;
  maxLength?: number;
  allowDecimal?: boolean;
  onClose?: (finalValue?: string) => void;
  title?: string;
  placeholder?: string;
}

interface ButtonProps {
  text: string;
  onPress: () => void;
  isNumber?: boolean;
  isOperator?: boolean;
  isAction?: boolean;
  isSpecial?: boolean;
}

// Optimized Button Component with React.memo
const OptimizedButton = React.memo<ButtonProps>(({ 
  text, 
  onPress, 
  isNumber = false,
  isOperator = false,
  isAction = false,
  isSpecial = false
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  }, []);
  
  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(0.96, ANIMATION_CONFIG.spring); // Less scale for subtler effect
    opacity.value = withTiming(0.85, ANIMATION_CONFIG.timing); // Less opacity change
    
    // OPTIMIZED: Reduced haptic feedback for better performance
    if (Platform.OS === 'ios' && isNumber) { // Only for number buttons
      runOnJS(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      })();
    }
  }, [scale, opacity, isNumber]);
  
  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, ANIMATION_CONFIG.spring);
    opacity.value = withTiming(1, ANIMATION_CONFIG.timing);
  }, [scale, opacity]);
  
  const buttonStyle = useMemo(() => {
    let backgroundColor = '#f8f9fa'; // Default soft gray
    let borderColor = '#e9ecef';
    let elevation = 2;
    
    if (isNumber) {
      backgroundColor = '#ffffff'; // Pure white for numbers
      borderColor = '#dee2e6';
      elevation = 3;
    } else if (isOperator) {
      backgroundColor = '#ff6b35'; // Modern orange for operators
      borderColor = '#ff4500';
      elevation = 4;
    } else if (isAction) {
      backgroundColor = '#6c757d'; // Sophisticated gray for actions
      borderColor = '#495057';
      elevation = 3;
    } else if (isSpecial) {
      if (text === '✓') {
        backgroundColor = '#28a745'; // Success green for submit
        borderColor = '#1e7e34';
      } else if (text === '⌨') {
        backgroundColor = '#17a2b8'; // Info blue for hide
        borderColor = '#117a8b';
      } else {
        backgroundColor = '#007bff'; // Primary blue for special
        borderColor = '#0056b3';
      }
      elevation = 4;
    }
    
    return [
      STYLES.button,
      { 
        backgroundColor,
        borderWidth: 1,
        borderColor,
        elevation,
        shadowColor: backgroundColor === '#ffffff' ? '#000' : backgroundColor,
        shadowOpacity: backgroundColor === '#ffffff' ? 0.1 : 0.25,
      },
    ];
  }, [isNumber, isOperator, isAction, isSpecial, text]);
  
  const textStyle = useMemo(() => {
    let color = '#343a40'; // Default dark gray
    let fontWeight: '400' | '500' | '600' | '700' | '800' = '700';
    let fontSize = 32; // Larger base font size for rectangular buttons
    
    if (isNumber) {
      color = '#212529'; // Darker for numbers
      fontWeight = '800';
      fontSize = 36; // Even larger for numbers
    } else if (isOperator || isAction || isSpecial) {
      color = '#ffffff'; // White text for colored buttons
      fontWeight = '800';
      fontSize = text === '✓' ? 32 : 34; // Larger symbols
    }
    
    return [
      STYLES.buttonText,
      { color, fontWeight, fontSize },
    ];
  }, [isNumber, isOperator, isAction, isSpecial, text]);
  
  return (
    <Animated.View style={[buttonStyle, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={StyleSheet.absoluteFill}
      >
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={textStyle}>{text}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text &&
    prevProps.isNumber === nextProps.isNumber &&
    prevProps.isOperator === nextProps.isOperator &&
    prevProps.isAction === nextProps.isAction &&
    prevProps.isSpecial === nextProps.isSpecial
  );
});

OptimizedButton.displayName = 'OptimizedButton';

// Main Component
const CustomNumberPadOptimized: React.FC<CustomNumberPadOptimizedProps> = React.memo(({
  value,
  onValueChange,
  visible,
  maxLength = 10,
  allowDecimal = true,
  onClose,
  title = "Enter Value",
  placeholder = "0",
}) => {
  const modalScale = useSharedValue(visible ? 1 : 0.8);
  const modalOpacity = useSharedValue(visible ? 1 : 0);
  
  // OPTIMIZED: Use React.useRef to track editing state without re-renders (removed useState)
  
  // Use ref to keep track of the most current value to avoid stale closure issues
  const currentValueRef = React.useRef(value);
  
  // Update ref whenever value changes - OPTIMIZED: Reduced logging
  React.useEffect(() => {
    currentValueRef.current = value;
  }, [value]);
  
  React.useEffect(() => {
    if (visible) {
      modalScale.value = 1;
      modalOpacity.value = 1;
      isEditingRef.current = false;
    } else {
      modalScale.value = 0.8;
      modalOpacity.value = 0;
    }
  }, [visible, modalScale, modalOpacity]);
  
  const handleClose = useCallback(() => {
    const currentValue = currentValueRef.current;
    if (onClose) onClose(currentValue);
  }, [onClose]);
  
  const handleModalRequestClose = useCallback(() => {
    const currentValue = currentValueRef.current;
    if (onClose) onClose(currentValue);
  }, [onClose]);
  
  const modalAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: modalScale.value }],
      opacity: modalOpacity.value,
    };
  }, []);
  
  // OPTIMIZED: Use React.useRef to track editing state without re-renders
  const isEditingRef = React.useRef(false);

  const handleButtonPress = useCallback((buttonText: string) => {
    // Always use the most current value to avoid stale closure issues
    const currentValue = currentValueRef.current;
    
    switch (buttonText) {
      case 'C':
        // Always clear completely and reset editing state
        onValueChange('');
        isEditingRef.current = false;
        break;
      case '⌫':
        // Simple backspace - just remove last character
        if (currentValue.length > 0) {
          const newValue = currentValue.slice(0, -1);
          onValueChange(newValue);
          isEditingRef.current = true; // User is now editing
        }
        break;
      case '.':
        // Allow decimal if enabled and not already present
        if (allowDecimal) {
          if (!isEditingRef.current) {
            // If not editing, start fresh with '0.'
            onValueChange('0.');
            isEditingRef.current = true;
          } else if (!currentValue.includes('.')) {
            // If editing and no decimal present, append decimal
            const newValue = (currentValue === '' || currentValue === '0') ? '0.' : currentValue + '.';
            onValueChange(newValue);
          }
        }
        break;
      case '✓':
        // Submit button - call onClose with current value
        if (onClose) onClose(currentValue);
        break;
      default:
        // Handle numeric input (0-9)
        if (/^\d$/.test(buttonText)) { // Only for digits 0-9
          let newValue;
          
          if (!isEditingRef.current) {
            // If not editing, replace the current value completely
            newValue = buttonText;
            isEditingRef.current = true; // Now user is editing
          } else {
            // If editing, check if we can append
            if (currentValue.length < maxLength) {
              newValue = currentValue + buttonText;
            } else {
              // Can't append due to max length
              return;
            }
          }
          
          onValueChange(newValue);
        }
        break;
    }
  }, [onValueChange, maxLength, allowDecimal, onClose]);

const renderRow = useCallback((rowData: readonly string[], rowIndex: number) => (
  <View key={rowIndex} style={STYLES.row}>
    {rowData.map((buttonText, index) => {
      // Skip empty buttons - render invisible spacer for empty strings
      if (!buttonText || buttonText.trim() === '') {
        return <View key={`${rowIndex}-${index}`} style={{ flex: 1 }} />;
      }

      // Handle wide buttons (buttons that span multiple columns)
      const isWideButton = buttonText.includes('-wide');
      const displayText = buttonText.replace('-wide', '');

      // Define button categories for styling
      const isNumber = /^\d$/.test(displayText); // 0-9
      const isOperator = ['÷', '×', '-', '+'].includes(displayText);
      const isAction = ['C', '⌫', '±'].includes(displayText);
      const isSpecial = ['✓', '.', '⌨'].includes(displayText);

      // --- Cambia aquí el estilo del botón según isTinyDevice ---
      const buttonContainerStyle = [
        { flex: 1 },
        isWideButton && STYLES.wideButton,
        isTinyDevice && {
          minHeight: 50,
          maxHeight: 20,
          minWidth: 0,
          marginHorizontal: 1,
        }
      ];

      return (
        <View
          key={`${rowIndex}-${index}`}
          style={buttonContainerStyle}
        >
          <OptimizedButton
            text={displayText}
            onPress={() => handleButtonPress(displayText)}
            isNumber={isNumber}
            isOperator={isOperator}
            isAction={isAction}
            isSpecial={isSpecial}
          />
        </View>
      );
    })}
  </View>
), [handleButtonPress]);

  return ((Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice)? (
  visible && (
    <View
      style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
      }}
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.5)" barStyle="light-content" />
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleClose}
      />
      <Animated.View
        style={[
          {
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 18,
            width: '100%',
            maxWidth: 400,
            minWidth: 260,
            maxHeight: '95%',
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)',
            alignItems: 'center',
          },
          modalAnimatedStyle,
        ]}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 2,
          }}
          onPress={handleClose}
        >
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#666' }}>×</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ marginBottom: 14, alignItems: 'center', width: '100%' }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: 5,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}
          >
            {title}
          </Text>
          {/* Value Input Display */}
          <View
            style={{
              backgroundColor: '#f8f9fb',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#e1e5e9',
              marginBottom: 5,
              width: '50%',
              alignItems: 'center',
            }}
          >
            <TextInput
              style={{
                fontSize: 26,
                fontWeight: '700',
                color: '#1a1a1a',
                textAlign: 'center',
                paddingVertical: 14,
                paddingHorizontal: 18,
                minHeight: 54,
                letterSpacing: 1,
                width: '100%',
              }}
              value={value || ''}
              placeholder={placeholder}
              placeholderTextColor="#999"
              editable={false}
              selectTextOnFocus={false}
            />
          </View>
        </View>

        {/* Number Pad */}
        <View style={{ width: '100%' }}>
          <View style={{ flexDirection: 'column', alignItems: 'stretch', width: '100%',  }}>
            {BUTTON_DATA.map(renderRow)}
          </View>
        </View>
      </Animated.View>
    </View>
  )
) : (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={handleModalRequestClose}
    statusBarTranslucent={true}
  >
    <StatusBar backgroundColor="rgba(0, 0, 0, 0.5)" barStyle="light-content" />
    <SafeAreaView style={STYLES.modalOverlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleClose}
      />
      <Animated.View style={[STYLES.modalContainer, modalAnimatedStyle]}>
        {/* Close Button */}
        <TouchableOpacity style={STYLES.closeButton} onPress={handleClose}>
          <Text style={STYLES.closeButtonText}>×</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={STYLES.header}>
          <Text style={STYLES.title}>{title}</Text>
          {/* Value Input Display */}
          <View style={STYLES.inputContainer}>
            <TextInput
              style={STYLES.input}
              value={value || ''}
              placeholder={placeholder}
              placeholderTextColor="#999"
              editable={false}
              selectTextOnFocus={false}
            />
          </View>
        </View>

        {/* Number Pad */}
        <View style={STYLES.container}>
          <View style={STYLES.grid}>
            {BUTTON_DATA.map(renderRow)}
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  </Modal>
));
}, (prevProps, nextProps) => {
  // More comprehensive comparison for React.memo
  return (
    prevProps.value === nextProps.value &&
    prevProps.visible === nextProps.visible &&
    prevProps.maxLength === nextProps.maxLength &&
    prevProps.allowDecimal === nextProps.allowDecimal &&
    prevProps.title === nextProps.title &&
    prevProps.placeholder === nextProps.placeholder
  );
});

CustomNumberPadOptimized.displayName = 'CustomNumberPadOptimized';

export default CustomNumberPadOptimized;
