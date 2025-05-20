import { Ionicons } from '@expo/vector-icons'; // Make sure to install expo/vector-icons if not already
import React, { useState } from 'react';
import { Dimensions, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Vault data structure
interface VaultOption {
  id: string;
  number: string;
  value: number;
  description: string;
}

// Group data structure
interface VaultGroup {
  id: number;
  title: string;
  color: string;
  vaults: VaultOption[];
}

// Props for the component
interface VaultSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (vault: VaultOption, groupId: number, value: number, description: string) => void;
}

const VaultSelectorModal: React.FC<VaultSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const [selectedVaults, setSelectedVaults] = useState<{[key: number]: VaultOption | null}>({});
  const windowWidth = Dimensions.get('window').width;
  const isSmallScreen = windowWidth < 600;

  // Define the vault groups with their data - using the exact colors provided
  const vaultGroups: VaultGroup[] = [
    {
      id: 1,
      title: "EG 1: Single salto vaults with complex twists",
      color: "#63c7bd", // Teal color provided
      vaults: [
        { id: "101", number: "101", value: 2.4, description: "Hdspr. tucked 1/2t.(Cuervo tucked)" },
        { id: "102", number: "102", value: 2.8, description: "Hdspr. tucked 1/1t.(Cuervo t.w.1/2t.)" },
        { id: "103", number: "103", value: 3.2, description: "Hdspr. tucked 3/2t. (Kroll)" },
        { id: "104", number: "104", value: 3.6, description: "Hdspr. tucked 2/1t. (Canbas)" },
        { id: "107", number: "107", value: 2.8, description: "Hdspr. piked 1/2t.(Cuervo piked)" },
        { id: "108", number: "108", value: 3.2, description: "Hdspr. piked 1/1t (Cuervo p. 1/2t)" },
        { id: "109", number: "109", value: 3.6, description: "Hdspr. piked 3/2t (Cuervo p. 1/1t)" },
        { id: "113", number: "113", value: 3.6, description: "Hdspr. str. 1/2t. (Cuervo str.)" },
        { id: "114", number: "114", value: 4.0, description: "Hdspr. str. 1/1t. (Cuervo str. 1/2t.)" },
        { id: "115", number: "115", value: 4.4, description: "Hdspr. str. 3/2t. (Lou Yun)" },
        { id: "116", number: "116", value: 4.8, description: "Hdspr. str. 2/1t. (Cuervo str.3/2t.)" },
        { id: "117", number: "117", value: 5.2, description: "Hdspr. str. 5/2t. (Yeo 2)" },
        { id: "118", number: "118", value: 5.6, description: "Hdspr. str. 3/1t. (Yang Hak Leon)" },
        { id: "119", number: "119", value: 2.4, description: "Tsuk. tucked 1/1t. (Kasamatsu)" },
        { id: "120", number: "120", value: 2.8, description: "Tsuk. tucked 3/2t." },
        { id: "121", number: "121", value: 3.2, description: "Tsuk. tucked 2/1t. (Barbieri)" },
        { id: "122", number: "122", value: 3.6, description: "Tsuk. tucked 5/2t." },
        { id: "125", number: "125", value: 3.6, description: "Tsuk str. 1/1t." },
        { id: "126", number: "126", value: 4.0, description: "Tsuk str. 3/2t." },
        { id: "127", number: "127", value: 4.4, description: "Tsuk str. 2/1t. (Akopian)" },
        { id: "131", number: "131", value: 4.8, description: "Tsuk. str. 5/2t. (Driggs)" },
        { id: "132", number: "132", value: 5.2, description: "Tsuk. str. 3/1t. (López)" },
        { id: "133", number: "133", value: 5.6, description: "Tsuk. str. 7/2 t. (Yonekura)" },
      ]
    },
    {
      id: 2,
      title: "EG 2: Handspring salto vaults with or without simple twists, and all double salto forward",
      color: "#d8ecf5", // Light blue color provided
      vaults: [
        { id: "201", number: "201", value: 1.2, description: "Handspring" },
        { id: "202", number: "202", value: 1.4, description: "Hdspr. 1/2t." },
        { id: "203", number: "203", value: 1.6, description: "Hdspr. 1/1t." },
        { id: "204", number: "204", value: 1.8, description: "Hdspr. 3/2t." },
        { id: "205", number: "205", value: 2.0, description: "Hdspr. 2/1t." },
        { id: "206", number: "206", value: 2.2, description: "Hdspr. 5/2t. (Tsygankov)" },
        { id: "207", number: "207", value: 2.0, description: "Hdspr. tucked" },
        { id: "213", number: "213", value: 2.4, description: "Hdspr. piked" },
        { id: "219", number: "219", value: 3.2, description: "Hdspr. str." },
        { id: "225", number: "225", value: 4.8, description: "Hdspr. dbl. salto tucked (Roche)" },
        { id: "226", number: "226", value: 5.2, description: "Roche 1/2t. (Dragulescu)" },
        { id: "228", number: "228", value: 5.2, description: "Hdspr. 1/2t.bwd. (Zimmerman)" },
        { id: "231", number: "231", value: 5.2, description: "Hdspr. dbl. piked (Blanik)" },
        { id: "232", number: "232", value: 5.6, description: "Dragulescu piked (Ri Se Gwang 2)" },
      ]
    },
    {
      id: 3,
      title: "EG 3: Handspring sideways and Tsukahara vaults with or without simple twists, and all double salto backward",
      color: "#f5d1c8", // Light pink/salmon color provided
      vaults: [
        { id: "301", number: "301", value: 1.2, description: "Hdspr. sw. 1/4t." },
        { id: "302", number: "302", value: 1.4, description: "Hdspr. sw. 3/4t." },
        { id: "303", number: "303", value: 1.6, description: "Hdspr. sw. 5/4t." },
        { id: "307", number: "307", value: 1.8, description: "Tsuk. tucked (Tsukahara)" },
        { id: "308", number: "308", value: 2.0, description: "Tsuk. piked" },
        { id: "309", number: "309", value: 2.0, description: "Tsuk. tucked 1/2 turn" },
        { id: "313", number: "313", value: 2.8, description: "Tsuk. str." },
        { id: "314", number: "314", value: 3.2, description: "Tsuk. str. 1/2t." },
        { id: "319", number: "319", value: 4.8, description: "Tsuk. double tucked (Yeo)" },
        { id: "320", number: "320", value: 5.2, description: "Tsuk. double piked (Lu Yu Fu)" },
        { id: "321", number: "321", value: 5.6, description: "Tsuk. double 1/1t. (Ri Se Gwang 1)" },
      ]
    },
    {
      id: 4,
      title: "EG 4: Round off entry and single salto vaults with complex twists",
      color: "#f5ca79", // Light orange/yellow color provided
      vaults: [
        { id: "401", number: "401", value: 2.4, description: "Yurchenko tucked 1/1t." },
        { id: "402", number: "402", value: 2.8, description: "Yurchenko tucked 3/2t." },
        { id: "403", number: "403", value: 3.2, description: "Yurchenko tucked 2/1t." },
        { id: "404", number: "404", value: 3.6, description: "Yurchenko tucked 5/2t." },
        { id: "404.2", number: "404.2", value: 3.6, description: "Yurchenko straight 1/1t." },
        { id: "406", number: "406", value: 4.0, description: "Yurchenko straight 3/2t." },
        { id: "407", number: "407", value: 4.4, description: "Yurchenko straight 2/1t." },
        { id: "408", number: "408", value: 4.8, description: "Yur. str. 5/2t. (Shewfelt)" },
        { id: "409", number: "409", value: 5.2, description: "Yur. str. 3/1t. (Shirai-Kim Hee Hoon)" },
        { id: "410", number: "410", value: 5.6, description: "Yur. str. 7/2t. (Shirai 2)" },
        { id: "413", number: "413", value: 2.6, description: "RO, 1/2t. hdspr. tucked 1/2t." },
        { id: "414", number: "414", value: 3.0, description: "RO, 1/2t. hdspr. piked 1/2t. (Nemov)" },
        { id: "415", number: "415", value: 3.8, description: "RO, 1/2t. hdspr. str. 1/2t. (Hutcheon)" },
        { id: "416", number: "416", value: 4.2, description: "RO, 1/2t. hdspr. str. 1/1t." },
        { id: "417", number: "417", value: 4.6, description: "RO, 1/2t. hdspr str. 3/2t." },
        { id: "419", number: "419", value: 5.0, description: "RO, 1/2t. hdspr str. 2/1t." },
        { id: "420", number: "420", value: 5.4, description: "RO, 1/2t. hdspr str. 5/2t.(Li Xiao Peng)" },
      ]
    },
    {
      id: 5,
      title: "EG 5: Round off entry vaults with or without simple salto and all double salto forward or backward",
      color: "#8bc793", // Green color provided
      vaults: [
        { id: "501", number: "501", value: 1.2, description: "RO, ff" },
        { id: "502", number: "502", value: 1.4, description: "RO, ff 1/2t." },
        { id: "503", number: "503", value: 1.6, description: "RO, ff 1/1t." },
        { id: "507", number: "507", value: 1.8, description: "RO, ff salto bwd tucked (Yurchenko)" },
        { id: "508", number: "508", value: 2.0, description: "Yur. tucked 1/2t." },
        { id: "509", number: "509", value: 2.0, description: "Yurchenko piked" },
        { id: "510", number: "510", value: 2.8, description: "Yurchenko straight" },
        { id: "511", number: "511", value: 3.2, description: "Yurchenko straight 1/2t." },
        { id: "513", number: "513", value: 1.4, description: "RO, 1/2t. handspring fwd." },
        { id: "514", number: "514", value: 1.6, description: "RO, 1/2t. handspring fwd. 1/2t." },
        { id: "515", number: "515", value: 1.8, description: "RO, 1/2t. handspring fwd. 1/1t." },
        { id: "516", number: "516", value: 2.2, description: "RO, 1/2t. hdspr. salto tucked" },
        { id: "517", number: "517", value: 2.6, description: "RO, 1/2t. hdspr. salto piked" },
        { id: "518", number: "518", value: 3.4, description: "RO, 1/2t. hdspr. salto straight" },
        { id: "519", number: "519", value: 4.8, description: "Yur. dbl. salto bwd tuck (Melissanidis)" },
        { id: "520", number: "520", value: 5.2, description: "Melissanidis piked (Yang Wei)" },
        { id: "521", number: "521", value: 5.0, description: "RO, 1/2t. hdspr. double salto tucked" },
      ]
    }
  ];

  const handleSelect = (vault: VaultOption, groupId: number, value: number, description: string) => {
    setSelectedVaults({...selectedVaults, [groupId]: vault});
    onSelect(vault, groupId, value, description);
  };

  // Title background color from the image - using a yellow similar to the image header
  const titleBackgroundColor = "#ffeb3b";

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: titleBackgroundColor }]}>
            <Text style={styles.modalTitle}>FIG MAG Vault Value Table 2025-2028</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollView}>
            {vaultGroups.map((group) => (
              <View key={group.id} style={styles.groupContainer}>
                <View style={[styles.groupHeader, { backgroundColor: group.color }]}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                </View>
                
                <View style={[styles.vaultsContainer, isSmallScreen ? styles.vaultsContainerSmall : {}]}>
                  {group.vaults.map((vault) => (
                    <TouchableOpacity
                      key={vault.id}
                      style={[
                        styles.vaultItem,
                        selectedVaults[group.id]?.id === vault.id ? styles.selectedVault : {},
                        { backgroundColor: group.color + '80' } // Add transparency
                      ]}
                      onPress={() => handleSelect(vault, group.id, vault.value, vault.description)}
                    >
                      <View style={styles.vaultNumberValue}>
                        <Text style={styles.vaultNumber}>{vault.number}</Text>
                        <Text style={styles.vaultValue}>{vault.value.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.vaultDescription} numberOfLines={2}>
                        {vault.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={onClose}
            >
              <Text style={styles.saveButtonText}>Apply Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '96%',
    maxWidth: 900,
    maxHeight: '96%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    maxHeight: '80%',
  },
  groupContainer: {
    marginBottom: 8,
    marginHorizontal: 6,
  },
  groupHeader: {
    padding: 8,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
    borderBottomWidth: 0,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  vaultsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    backgroundColor: 'white',
  },
  vaultsContainerSmall: {
/* TODO MAKE IT COLLUM IN SMALL DEVICES */

  },
  vaultItem: {
    width: '31%',
    margin: '1%',
    padding: 8,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 6,
  },
  selectedVault: {
    borderWidth: 2,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  vaultNumberValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vaultNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  vaultValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  vaultDescription: {
    fontSize: 12,
    color: '#333',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#0052b4',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
    alignItems: 'center',
    width: '50%',
    maxWidth: 300,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default VaultSelectorModal;