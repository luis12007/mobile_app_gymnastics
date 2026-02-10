import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';

// On iPhone (not iPad), replace Modal with an absolute-positioned View overlay
const ModalWrapper = ({ visible, children, transparent, animationType, onRequestClose, ...props }: any) => {
  if (Platform.OS === 'ios' && !Platform.isPad) {
    if (!visible) return null;
    return (
      <View style={iosOverlayStyle.container}>
        {children}
      </View>
    );
  }
  return (
    <Modal visible={visible} transparent={transparent} animationType={animationType} onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
};

const iosOverlayStyle = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});

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
  const { width, height } = useWindowDimensions();
  const [localValue, setLocalValue] = useState(value);
  const replaceOnNextInputRef = useRef(false);
  const initialValueRef = useRef(value);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const layoutMode: 'vertical' | 'horizontal' = useMemo(() => {
    // Si la altura es muy baja, la UI vertical puede no caber.
    // En ese caso, usamos layout horizontal.
    return height < 650 ? 'horizontal' : 'vertical';
  }, [height]);

  const sizes = useMemo(() => getResponsiveSize(width, height, layoutMode), [width, height, layoutMode]);
  const styles = useMemo(() => createStyles(sizes, layoutMode), [sizes, layoutMode]);

  const shouldScroll = useMemo(() => {
    if (!viewportHeight || !contentHeight) return false;
    return contentHeight > viewportHeight + 1;
  }, [contentHeight, viewportHeight]);

  // Resetear valor local cuando se abre el modal.
  // Importante: NO re-sincronizar en cada cambio de `value` mientras está visible,
  // porque eso re-activa overwrite y rompe secuencias como: 2 . 5.
  useEffect(() => {
    if (visible) {
      const next = value || '';
      initialValueRef.current = next;
      setLocalValue(next);
      replaceOnNextInputRef.current = next.length > 0;
    }
  }, [visible]);

  const commitValue = useCallback((next: string) => {
    setLocalValue(next);
    onValueChange(next);
  }, [onValueChange]);

  const shouldReplace = () => replaceOnNextInputRef.current;

  const consumeReplace = () => {
    replaceOnNextInputRef.current = false;
  };

  const handleNumberPress = useCallback((num: string) => {
    const base = shouldReplace() ? '' : localValue;
    if (base.length >= maxLength) return;

    const newValue = base + num;
    consumeReplace();
    commitValue(newValue);
  }, [commitValue, localValue, maxLength]);

  const handleDecimalPress = useCallback(() => {
    if (!allowDecimal) return;
    const current = shouldReplace() ? '' : localValue;
    if (current.includes('.')) {
      consumeReplace();
      return;
    }
    consumeReplace();
    if (current === '' || current === '-') {
      commitValue(current + '0.');
    } else {
      commitValue(current + '.');
    }
  }, [allowDecimal, commitValue, localValue]);

  const handleNegativePress = useCallback(() => {
    if (!allowNegative) return;
    const current = shouldReplace() ? '' : localValue;
    consumeReplace();
    if (current.startsWith('-')) {
      commitValue(current.substring(1));
    } else {
      commitValue('-' + current);
    }
  }, [allowNegative, commitValue, localValue]);

  const handleBackspace = useCallback(() => {
    if (shouldReplace()) {
      consumeReplace();
      commitValue('');
      return;
    }
    commitValue(localValue.slice(0, -1));
  }, [commitValue, localValue]);

  const handleClear = useCallback(() => {
    consumeReplace();
    commitValue('');
  }, [commitValue]);

  const handleConfirm = useCallback(() => {
    onClose(localValue);
  }, [localValue, onClose]);

  const handleCancel = useCallback(() => {
    const initial = initialValueRef.current || '';
    setLocalValue(initial);
    onValueChange(initial);
    onClose(initial);
  }, [onClose, onValueChange]);

  const renderButton = useCallback((label: string, onPress: () => void, style?: any, textStyle?: any) => {
    return (
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, textStyle]}>{label}</Text>
      </TouchableOpacity>
    );
  }, [styles]);

  const NumberPad = (
    <View style={styles.numberPad}>
      <View style={styles.row}>
        {renderButton('7', () => handleNumberPress('7'))}
        {renderButton('8', () => handleNumberPress('8'))}
        {renderButton('9', () => handleNumberPress('9'))}
      </View>

      <View style={styles.row}>
        {renderButton('4', () => handleNumberPress('4'))}
        {renderButton('5', () => handleNumberPress('5'))}
        {renderButton('6', () => handleNumberPress('6'))}
      </View>

      <View style={styles.row}>
        {renderButton('1', () => handleNumberPress('1'))}
        {renderButton('2', () => handleNumberPress('2'))}
        {renderButton('3', () => handleNumberPress('3'))}
      </View>

      <View style={styles.row}>
        {allowNegative
          ? renderButton('±', handleNegativePress, styles.specialButton)
          : renderButton('', () => {}, { ...styles.specialButton, backgroundColor: '#f0f0f0' })}
        {renderButton('0', () => handleNumberPress('0'))}
        {allowDecimal
          ? renderButton('.', handleDecimalPress, styles.specialButton)
          : renderButton('', () => {}, { ...styles.specialButton, backgroundColor: '#f0f0f0' })}
      </View>

      <View style={styles.row}>
        {renderButton('Clear', handleClear, styles.clearButton, styles.clearButtonText)}
        {renderButton('⌫', handleBackspace, styles.backspaceButton)}
      </View>
    </View>
  );

  return (
    <ModalWrapper
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
            style={styles.scrollViewport}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={shouldScroll}
            scrollEnabled={shouldScroll}
            onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => setContentHeight(h)}
          >
            {layoutMode === 'horizontal' ? (
              <View style={[styles.horizontalRoot, styles.rootFill]}>
                <View style={styles.leftPane}>
                  <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                  </View>
                  <View style={styles.display}>
                    <Text style={styles.displayText}>{localValue || '0'}</Text>
                  </View>
                  <View style={styles.actionButtonsVertical}>
                    {renderButton('Cancel', handleCancel, styles.cancelButton)}
                    {renderButton('OK', handleConfirm, styles.confirmButton, styles.confirmButtonText)}
                  </View>
                </View>
                <View style={styles.rightPane}>{NumberPad}</View>
              </View>
            ) : (
              <View style={[styles.verticalRoot, styles.rootFill]}>
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                </View>
                <View style={styles.display}>
                  <Text style={styles.displayText}>{localValue || '0'}</Text>
                </View>
                {NumberPad}
                <View style={styles.actionButtons}>
                  {renderButton('Cancel', handleCancel, styles.cancelButton)}
                  {renderButton('OK', handleConfirm, styles.confirmButton, styles.confirmButtonText)}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ModalWrapper>
  );
};

const getResponsiveSize = (w: number, h: number, layoutMode: 'vertical' | 'horizontal') => {
  const padding = Math.max(6, Math.min(10, Math.round(h * 0.012)));
  const isCompactHeight = h < 650;

  const containerWidth = layoutMode === 'horizontal'
    ? Math.min(w * 0.94, 620)
    : Math.min(w * 0.98, 420);

  const containerMaxHeight = Math.max(Math.round(h * 0.92), isCompactHeight ? 320 : 360);
  const baseButton = layoutMode === 'horizontal'
    ? (isCompactHeight ? 50 : 58)
    : (isCompactHeight ? 54 : 64);

  const buttonWidth = Math.round(baseButton * (layoutMode === 'horizontal' ? 1.22 : 1.35));

  const leftPaneWidth = layoutMode === 'horizontal'
    ? Math.max(200, Math.min(260, Math.round(containerWidth * 0.38)))
    : 0;

  const rowGap = Math.round(padding * 0.25);
  const keypadWidth = layoutMode === 'horizontal'
    ? Math.min(
        containerWidth - leftPaneWidth - padding,
        buttonWidth * 3 + rowGap * 2 + 12
      )
    : 0;

  const columnGap = layoutMode === 'horizontal' ? Math.round(padding * 1.6) : padding;
  const panePadding = layoutMode === 'horizontal' ? Math.round(padding * 0.8) : 0;

  return {
    containerWidth,
    containerMaxHeight,
    minHeight: isCompactHeight ? 300 : 350,
    buttonSize: baseButton,
    buttonWidth,
    fontSize: isCompactHeight ? 26 : 30,
    displayFontSize: isCompactHeight ? 22 : 28,
    titleFontSize: isCompactHeight ? 14 : 16,
    padding,
    leftPaneWidth,
    keypadWidth,
    columnGap,
    panePadding,
  };
};

const createStyles = (
  sizes: ReturnType<typeof getResponsiveSize>,
  layoutMode: 'vertical' | 'horizontal'
) => {
  return StyleSheet.create({
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
      minHeight: sizes.minHeight,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      alignSelf: 'center',
      flexShrink: 1,
      padding: sizes.padding,
    },
    scrollViewport: {
      width: '100%',
      flexGrow: 0,
    },
    scrollContent: {
      flexGrow: 1,
    },
    rootFill: {
      flex: 1,
    },
    verticalRoot: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    horizontalRoot: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: sizes.columnGap,
    },
    leftPane: {
      width: layoutMode === 'horizontal' ? sizes.leftPaneWidth : undefined,
      flexGrow: 0,
      flexShrink: 1,
      justifyContent: 'center',
      paddingHorizontal: layoutMode === 'horizontal' ? sizes.panePadding : 0,
    },
    rightPane: {
      width: layoutMode === 'horizontal' ? sizes.keypadWidth : undefined,
      flexGrow: 0,
      flexShrink: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: layoutMode === 'horizontal' ? sizes.panePadding : 0,
    },
    header: {
      paddingVertical: sizes.padding * 0.4,
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
      flexWrap: layoutMode === 'horizontal' ? 'nowrap' : 'wrap',
    },
    button: {
      width: sizes.buttonWidth,
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
    clearButtonText: {
      fontSize: Math.max(16, Math.round(sizes.fontSize * 0.72)),
      fontWeight: '700' as const,
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
      width: '100%',
    },
    actionButtonsVertical: {
      flexDirection: 'column',
      gap: sizes.padding * 0.5,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      marginTop: sizes.padding,
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
    },
    confirmButtonText: {
      color: '#ffffff',
    },
  });
};

export default CustomNumberPadOptimized;
