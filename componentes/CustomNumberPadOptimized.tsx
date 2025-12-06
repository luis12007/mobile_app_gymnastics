import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Determinar tamaño del dispositivo
const isSmallDevice = width < 768;
const isMediumDevice = width >= 768 && width < 1024;
const isLargeDevice = width >= 1024;

interface CustomNumberPadOptimizedProps {
  visible: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onClose: (finalValue: string) => void;
  title?: string;
  allowDecimal?: boolean;
  maxLength?: number;
  allowNegative?: boolean;
}

const CustomNumberPadOptimized: React.FC<CustomNumberPadOptimizedProps> = ({
  visible,
  value,
  onValueChange,
  onClose,
  title = 'Enter Value',
  allowDecimal = true,
  maxLength = 10,
  allowNegative = false,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Resetear valor local cuando se abre el modal
  React.useEffect(() => {
    if (visible) {
      setLocalValue(value || '');
    }
  }, [visible, value]);

  const handleNumberPress = (num: string) => {
    if (localValue.length >= maxLength) return;
    
    const newValue = localValue + num;
    setLocalValue(newValue);
    onValueChange(newValue);
  };

  const handleDecimalPress = () => {
    if (!allowDecimal) return;
    if (localValue.includes('.')) return;
    if (localValue === '' || localValue === '-') {
      const newValue = localValue + '0.';
      setLocalValue(newValue);
      onValueChange(newValue);
    } else {
      const newValue = localValue + '.';
      setLocalValue(newValue);
      onValueChange(newValue);
    }
  };

  const handleNegativePress = () => {
    if (!allowNegative) return;
    if (localValue.startsWith('-')) {
      const newValue = localValue.substring(1);
      setLocalValue(newValue);
      onValueChange(newValue);
    } else {
      const newValue = '-' + localValue;
      setLocalValue(newValue);
      onValueChange(newValue);
    }
  };

  const handleBackspace = () => {
    const newValue = localValue.slice(0, -1);
    setLocalValue(newValue);
    onValueChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onValueChange('');
  };

  const handleConfirm = () => {
    onClose(localValue);
  };

  const handleCancel = () => {
    setLocalValue(value);
    onValueChange(value);
    onClose(value);
  };

  const renderButton = (label: string, onPress: () => void, style?: any) => {
    return (
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, style?.textStyle]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
        />
        
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>

            {/* Display */}
            <View style={styles.display}>
              <Text style={styles.displayText}>
                {localValue || '0'}
              </Text>
            </View>

            {/* Number Pad */}
            <View style={styles.numberPad}>
              {/* Row 1 */}
              <View style={styles.row}>
                {renderButton('7', () => handleNumberPress('7'))}
                {renderButton('8', () => handleNumberPress('8'))}
                {renderButton('9', () => handleNumberPress('9'))}
              </View>

              {/* Row 2 */}
              <View style={styles.row}>
                {renderButton('4', () => handleNumberPress('4'))}
                {renderButton('5', () => handleNumberPress('5'))}
                {renderButton('6', () => handleNumberPress('6'))}
              </View>

              {/* Row 3 */}
              <View style={styles.row}>
                {renderButton('1', () => handleNumberPress('1'))}
                {renderButton('2', () => handleNumberPress('2'))}
                {renderButton('3', () => handleNumberPress('3'))}
              </View>

              {/* Row 4 */}
              <View style={styles.row}>
                {allowNegative
                  ? renderButton('±', handleNegativePress, styles.specialButton)
                  : renderButton('', () => {}, { ...styles.specialButton, backgroundColor: '#f0f0f0' })}
                {renderButton('0', () => handleNumberPress('0'))}
                {allowDecimal
                  ? renderButton('.', handleDecimalPress, styles.specialButton)
                  : renderButton('', () => {}, { ...styles.specialButton, backgroundColor: '#f0f0f0' })}
              </View>

              {/* Row 5 - Actions */}
              <View style={styles.row}>
                {renderButton('Clear', handleClear, styles.clearButton)}
                {renderButton('⌫', handleBackspace, styles.backspaceButton)}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {renderButton('Cancel', handleCancel, styles.cancelButton)}
              {renderButton('OK', handleConfirm, styles.confirmButton)}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getResponsiveSize = () => {
  // Tamaños más pequeños para todos los dispositivos
  // Card más larga y responsive
  let cardHeight = height * 0.8;
  if (height < 700) cardHeight = height * 0.95;
  return {
    containerWidth: Math.min(width * 0.98, 400),
    containerMaxHeight: Math.max(cardHeight, 350),
    buttonSize: 70,
    fontSize: 32,
    displayFontSize: 28,
    titleFontSize: 16,
    padding: 8,
  };
};

const sizes = getResponsiveSize();

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: sizes.containerWidth,
    maxHeight: sizes.containerMaxHeight,
    minHeight: 350,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    alignSelf: 'center',
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    padding: sizes.padding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingVertical: sizes.padding * 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: sizes.padding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: sizes.titleFontSize,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  display: {
    backgroundColor: '#f5f5f5',
    padding: sizes.padding,
    borderRadius: 8,
    marginBottom: sizes.padding,
    minHeight: sizes.displayFontSize + sizes.padding,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0052b4',
    width: '100%',
  },
  displayText: {
    fontSize: sizes.displayFontSize,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  numberPad: {
    marginBottom: sizes.padding,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: sizes.padding * 0.25,
    gap: sizes.padding * 0.25,
    flexWrap: 'wrap',
  },
  button: {
    width: sizes.buttonSize * 1.4, // mucho más ancho
    height: sizes.buttonSize,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0052b4',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 2,
  },
  buttonText: {
    fontSize: sizes.fontSize,
    fontWeight: '600',
    color: '#0052b4',
    textAlign: 'center',
  },
  specialButton: {
    backgroundColor: '#e3f2fd',
  },
  clearButton: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  backspaceButton: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: sizes.padding * 0.5,
    marginTop: sizes.padding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    width: sizes.buttonSize * 2,
    height: sizes.buttonSize * 0.75,
    backgroundColor: '#f5f5f5',
    borderColor: '#9e9e9e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    width: sizes.buttonSize * 2,
    height: sizes.buttonSize * 0.75,
    backgroundColor: '#0052b4',
    borderColor: '#0052b4',
    justifyContent: 'center',
    alignItems: 'center',
    textStyle: {
      color: '#ffffff',
    },
  },
});

export default CustomNumberPadOptimized;
