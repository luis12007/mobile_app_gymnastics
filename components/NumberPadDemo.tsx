/**
 * NumberPadDemo.tsx
 * Simple demo component to test the optimized NumberPad
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import CustomNumberPadOptimized from './CustomNumberPadOptimized';

const NumberPadDemo: React.FC = () => {
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NumberPad Demo</Text>
      
      <View style={styles.displayContainer}>
        <Text style={styles.valueText}>Value: {value || '(empty)'}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.showButton}
        onPress={() => setVisible(!visible)}
      >
        <Text style={styles.buttonText}>
          {visible ? 'Hide NumberPad' : 'Show NumberPad'}
        </Text>
      </TouchableOpacity>
      
      <CustomNumberPadOptimized
        value={value}
        onValueChange={setValue}
        visible={visible}
        maxLength={15}
        allowDecimal={true}
        onClose={() => setVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  displayContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  valueText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
  showButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NumberPadDemo;
