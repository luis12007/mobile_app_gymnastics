// SimplifiedNumberPad.js
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const SimplifiedNumberPad = ({ 
  onNumberPress, 
  onDecimalPress, 
  onDeletePress, 
  onHidePress,
  onSubmitPress,
  visible = true 
}) => {
  // Animación
  const slideAnim = useRef(new Animated.Value(200)).current; // Comienza fuera de pantalla
  const opacityAnim = useRef(new Animated.Value(0)).current; // Comienza invisible

  useEffect(() => {
    if (visible) {
      // Animar entrada
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Animar salida
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 200,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  if (!visible) return null;

  const Button = ({ title, onPress, style = {}, textStyle = {} }) => (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={[styles.buttonText, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[
      styles.container,
      {
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim
      }
    ]}>
      {/* Row 1 */}
      <View style={styles.row}>
        <Button title="7" onPress={() => onNumberPress('7')} />
        <Button title="8" onPress={() => onNumberPress('8')} />
        <Button title="9" onPress={() => onNumberPress('9')} />
        <Button 
          title="⌫" 
          onPress={onDeletePress}
          style={styles.actionButton}
          textStyle={styles.actionText}
        />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        <Button title="4" onPress={() => onNumberPress('4')} />
        <Button title="5" onPress={() => onNumberPress('5')} />
        <Button title="6" onPress={() => onNumberPress('6')} />
        <View style={styles.spacer} />
          
        <View style={styles.tallButtonContainer}>
          <Button 
            title="✓" 
            onPress={onSubmitPress}
            style={styles.tallPrimaryButton}
            textStyle={styles.primaryText}
          />
        </View>
      </View>

      {/* Row 3 */}
      <View style={styles.row}>
        <Button title="1" onPress={() => onNumberPress('1')} />
        <Button title="2" onPress={() => onNumberPress('2')} />
        <Button title="3" onPress={() => onNumberPress('3')} />
        <View style={styles.spacer} />
      </View>

      {/* Row 4 */}
      <View style={styles.row}>
        <Button 
          title="0" 
          onPress={() => onNumberPress('0')}
          style={styles.zeroButton}
        />
        <Button 
          title="." 
          onPress={onDecimalPress}
        />
        <Button 
          title="⌨" 
          onPress={onHidePress}
          style={styles.actionButton}
          textStyle={styles.actionText}
        />
      </View>
    </Animated.View>
  );
};

const getResponsiveDimensions = () => {
  const isSmallScreen = width < 375;
  const isTablet = width > 768;
  
  const buttonWidth = isTablet 
    ? (width - 120) / 4 
    : (width - (isSmallScreen ? 60 : 80)) / 4;
  
  const buttonHeight = isTablet ? 70 : isSmallScreen ? 55 : 60;
  const fontSize = isTablet ? 28 : isSmallScreen ? 20 : 22;
  const padding = isTablet ? 20 : isSmallScreen ? 12 : 16;
  
  return { buttonWidth, buttonHeight, fontSize, padding };
};

const { buttonWidth, buttonHeight, fontSize, padding } = getResponsiveDimensions();

const styles = StyleSheet.create({
  container: {
  position: 'absolute',
  bottom: 0, // Asegúrate que esté en 0
  left: 0,
  right: 0,
  backgroundColor: '#D1D1D6',
  paddingHorizontal: padding,
  paddingTop: padding,
  paddingBottom: Platform.OS === 'ios' ? 34 : padding + 10, // Ajusta para el indicador de inicio en iOS
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
    width: buttonWidth,
    height: buttonHeight,
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
  },
  buttonText: {
    color: '#000000',
    fontSize: fontSize,
    fontWeight: '400',
  },
  zeroButton: {
    backgroundColor: '#FFFFFF',
    width: buttonWidth * 2 + 27,
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
    fontSize: fontSize - 2,
  },
  tallButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: (buttonHeight * 2) + 10,
    width: buttonWidth,
    zIndex: 1,
  },
  tallPrimaryButton: {
    backgroundColor: '#007AFF',
    borderWidth: 0.5,
    borderColor: '#007AFF',
    height: (buttonHeight * 2) + 10,
    width: buttonWidth,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  spacer: {
    width: buttonWidth,
  },
});



export default SimplifiedNumberPad;