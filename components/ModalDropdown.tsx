// ModalDropdown.tsx (or inside your main file)
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const ModalDropdown = ({ visible, onClose, items, onSelect, group }) => {
  if (!visible) return null;
  return (
    <View style={modalDropdownStyles.overlay}>
      <TouchableOpacity style={modalDropdownStyles.backdrop} onPress={onClose} />
      <View style={modalDropdownStyles.dropdown}>
        <ScrollView style={{ maxHeight: 200 }}>
          {items.map((value) => (
            <TouchableOpacity
              key={`${group}-${value}`}
              style={modalDropdownStyles.dropdownItem}
              onPress={() => {
                onSelect(value);
                onClose();
              }}
            >
              <Text style={modalDropdownStyles.dropdownItemText}>{value.toFixed(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const modalDropdownStyles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999999,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 600,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dropdown: {
    minWidth: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100000,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemText: {
    fontSize: 18,
    color: '#0066CC',
    fontWeight: '500',
  },
});