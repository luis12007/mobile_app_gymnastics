import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomNumberPadProps {
  visible: boolean;
  currentValue?: string;
  onNumberPress: (number: string) => void;
  onBackspace: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

const CustomNumberPad: React.FC<CustomNumberPadProps> = ({
  visible,
  currentValue = '',
  onNumberPress,
  onBackspace,
  onConfirm,
  onClose,
}) => {
  if (!visible) return null;

  const { width, height } = Dimensions.get('window');
  const keyWidth = (width - 80) / 3 - 10; // Mejor cálculo para 3 columnas con más margen
  const keyHeight = Math.min(70, (height * 0.4) / 4 - 15); // Altura adaptativa pero máximo 70

  const numberKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace']
  ];

  const renderKey = (key: string, index: number) => {
    if (key === 'backspace') {
      return (
        <TouchableOpacity
          key={`${key}-${index}`}
          style={[styles.key, styles.actionKey, { width: keyWidth, height: keyHeight }]}
          onPress={onBackspace}
          activeOpacity={0.7}
        >
          <Ionicons name="backspace-outline" size={28} color="#fff" />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={`${key}-${index}`}
        style={[styles.key, styles.numberKey, { width: keyWidth }]}
        onPress={() => onNumberPress(key)}
        activeOpacity={0.7}
      >
        <Text style={styles.keyText}>{key}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Overlay para cerrar */}
      <TouchableOpacity 
        style={styles.overlay} 
        onPress={onClose}
        activeOpacity={1}
      />
      
      {/* Contenedor del teclado */}
      <View style={styles.keyboardContainer}>
        {/* Header con botones de acción */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.headerButton, styles.closeButton]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#666" />
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.headerButton, styles.confirmButton]}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.confirmButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        {/* Display del valor actual */}
        <View style={styles.displayContainer}>
          <Text style={styles.displayText}>
            {currentValue || ''}
          </Text>
          {!currentValue && (
            <Text style={styles.displayPlaceholder}>Enter number...</Text>
          )}
        </View>
        
        {/* Filas de números */}
        <View style={styles.keysContainer}>
          {numberKeys.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keyRow}>
              {row.map((key, keyIndex) => renderKey(key, keyIndex))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  keyboardContainer: {
    backgroundColor: '#d1d5db',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  closeButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#0052b4',
  },
  headerButtonText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  confirmButtonText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  displayContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  displayText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    minHeight: 35,
  },
  displayPlaceholder: {
    position: 'absolute',
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
  },
  keysContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  key: {
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    flex: 1,
    marginHorizontal: 5,
  },
  numberKey: {
    backgroundColor: '#fff',
  },
  actionKey: {
    backgroundColor: '#6b7280',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#333',
  },
});

export default CustomNumberPad;
