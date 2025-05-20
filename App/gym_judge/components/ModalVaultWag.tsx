import { Ionicons } from '@expo/vector-icons';
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
interface WAGVaultSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (vault: VaultOption, groupId: number, value: number, description: string) => void;
}

const WAGVaultSelectorModal: React.FC<WAGVaultSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const [selectedVaults, setSelectedVaults] = useState<{[key: number]: VaultOption | null}>({});
  const windowWidth = Dimensions.get('window').width;
  const isSmallScreen = windowWidth < 600;

  // Use the same green color across all groups but with different shades
  const baseGreen = "#8BC34A";
  const lightGreen = "#C5E1A5";
  const lighterGreen = "#DCEDC8";
  const darkGreen = "#689F38";
  
  // Define the vault groups with their data
  const vaultGroups: VaultGroup[] = [
    {
      id: 1,
      title: "GROUP 1: HANDSPRING, YAMASHITA, ROUND-OFF WITH OR WITHOUT TURN IN 1ST AND/OR 2ND FLIGHT PHASE",
      color: lightGreen,
      vaults: [
        { id: "100", number: "100", value: 1.6, description: "Handspring forward" },
        { id: "101", number: "101", value: 2.0, description: "Handspring forward on - 1/2 turn (180°) off" },
        { id: "102", number: "102", value: 2.6, description: "Handspring forward on - 1/2 turn (180°) off" },
        { id: "103", number: "103", value: 3.2, description: "Handspring forward on - 1 1/2 turn (540°) off (Kim)" },
        { id: "104", number: "104", value: 3.6, description: "Handspring forward on - 2/1 turn (720°) off" },
        { id: "105", number: "105", value: 4.0, description: "Handspring forward on - 2 1/2 turn (900°) off" },
        { id: "110", number: "110", value: 2.0, description: "Yamashita" },
        { id: "111", number: "111", value: 2.4, description: "Yamashita with 1/2 turn (180°) off" },
        { id: "112", number: "112", value: 2.8, description: "Yamashita with 1/1 turn (360°) off" },
        { id: "120", number: "120", value: 1.6, description: "Handspring forward with 1/2 turn (180°) on - repulsion off" },
        { id: "121", number: "121", value: 2.4, description: "Handspring fwd with 1/2 turn (180°) on - 1/2 turn (180°) off (in either direction)" },
        { id: "122", number: "122", value: 2.6, description: "Handspring forward with 1/2 turn (180°) on - 1/1 turn (360°) off" },
        { id: "123", number: "123", value: 3.2, description: "Handspring forward with 1/2 turn (180°) on - 1 1/2 turn (540°) off" },
        { id: "124", number: "124", value: 3.6, description: "Handspring forward with 1/2 turn (180°) on - 2/1 turn (720°) off" },
        { id: "130", number: "130", value: 3.2, description: "Handspring forward with 1/1 turn (360°) on - Handspring forward off" },
        { id: "131", number: "131", value: 3.6, description: "Handspring forward with 1/1 turn (360°) on - 1/1 turn (360°) off (Korbut)" },
        { id: "140", number: "140", value: 2.0, description: "Round-off, flic-flac on - repulsion off" },
        { id: "150", number: "150", value: 2.2, description: "Round-off, flic-flac with 1/2 turn (180°) on - Handspring forward off" },
        { id: "151", number: "151", value: 2.6, description: "Round-off, flic-flac with 1/2 turn (180°) on - 1/2 turn (180°) off" },
        { id: "152", number: "152", value: 3.0, description: "Round-off, flic-flac with 1/2 turn (180°) on - 1/1 turn (360°) off" },
        { id: "153", number: "153", value: 3.4, description: "Round-off, flic-flac with 1/2 turn (180°) on - 1 1/2 turn (540°) off" },
        { id: "160", number: "160", value: 2.4, description: "Round-off, flic-flac with 1/1 turn (360°) on - repulsion off" },
        { id: "161", number: "161", value: 2.8, description: "Round-off, flic-flac with 1/1 turn (360°) on - 1/2 turn (180°) off" },
        { id: "162", number: "162", value: 3.2, description: "Round-off, flic-flac with 1/1 turn (360°) on - 1/1 turn (360°) off" },
      ]
    },
    {
      id: 2,
      title: "GROUP 2: HANDSPRING FWD WITH/WITHOUT 1/1 TURN (360°) IN 1ST FLIGHT PHASE - SALTO FWD/BWD WITH/WITHOUT TWIST IN 2ND FLIGHT PHASE",
      color: lightGreen,
      vaults: [
        { id: "210", number: "210", value: 3.6, description: "Handspring forward on - tucked salto forward off" },
        { id: "211", number: "211", value: 3.8, description: "Handspring fwd on - tucked salto fwd with 1/2 twist (180°) off, also 1/2 turn (180°) and tucked salto bwd off" },
        { id: "212", number: "212", value: 4.2, description: "Handspring forward on - tucked salto forward with 1/1 twist (360°) off" },
        { id: "213", number: "213", value: 4.6, description: "Handspring forward on - tucked salto forward with 1 1/2 twist (540°) off" },
        { id: "220", number: "220", value: 3.8, description: "Handspring forward on - piked salto forward off" },
        { id: "221", number: "221", value: 4.0, description: "Handspring forward on - piked salto fwd with 1/2 twist (180°) off, also - 1/2 turn (180°) and piked salto bwd off" },
        { id: "222", number: "222", value: 4.4, description: "Handspring forward on - piked salto fwd with 1/1 twist (360°) off (Chusovitina)" },
        { id: "230", number: "230", value: 4.4, description: "Handspring forward on - stretched salto forward off (Produnova)" },
        { id: "231", number: "231", value: 4.6, description: "Handspring forward on - stretched salto forward with 1/2 twist (180°) off (Wang)" },
        { id: "232", number: "232", value: 5.0, description: "Handspring forward on - stretched salto forward with 1/1 twist (360°) off" },
        { id: "233", number: "233", value: 5.4, description: "Handspring forward on - stretched salto forward with 1 1/2 twist (540°) off (Chusovitina)" },
        { id: "234", number: "234", value: 5.8, description: "Handspring forward on - stretched salto forward with 1/1 twist (360°) off" },
        { id: "240", number: "240", value: 4.8, description: "Handspring forward with 1/1 turn (360°) on - tucked salto forward off (Davydova)" },
        { id: "241", number: "241", value: 5.2, description: "Handspring forward with 1/1 turn (360°) on - piked salto forward off" },
        { id: "250", number: "250", value: 6.0, description: "Handspring forward on - tucked double salto forward off (Produnova)" },
      ]
    },
    {
      id: 3,
      title: "GROUP 3: HANDSPRING WITH 1/4 - 1/2 TURN (90° - 180°) IN 1ST FLIGHT PHASE (TSUKAHARA) - SALTO BWD WITH/WITHOUT TWIST IN 2ND FLIGHT PHASE",
      color: lightGreen,
      vaults: [
        { id: "310", number: "310", value: 3.2, description: "Tsukahara tucked (Tsukahara)" },
        { id: "311", number: "311", value: 3.4, description: "Tsukahara tucked with 1/2 twist (180°) off" },
        { id: "312", number: "312", value: 3.8, description: "Tsukahara tucked with 1/1 twist (360°) off (Kim)" },
        { id: "313", number: "313", value: 4.2, description: "Tsukahara tucked with 1 1/2 twist (540°) off" },
        { id: "314", number: "314", value: 4.6, description: "Tsukahara tucked with 2/1 twist (360°) off" },
        { id: "320", number: "320", value: 3.4, description: "Tsukahara piked" },
        { id: "330", number: "330", value: 3.8, description: "Tsukahara stretched" },
        { id: "331", number: "331", value: 4.0, description: "Tsukahara stretched with 1/2 twist (180°) off" },
        { id: "332", number: "332", value: 4.4, description: "Tsukahara stretched with 1/1 twist (360°) off (Kim)" },
        { id: "333", number: "333", value: 4.8, description: "Tsukahara stretched with 1 1/2 twist (540°) off" },
        { id: "334", number: "334", value: 5.2, description: "Tsukahara stretched with 2/1 twist (720°) off (Zamolodchikova)" },
        { id: "335", number: "335", value: 5.6, description: "Tsukahara stretched with 2 1/2 twist (900°) off" },
      ]
    },
    {
      id: 4,
      title: "GROUP 4: ROUND-OFF (YURCHENKO) WITH/WO 3/4 TURN (270°) IN 1ST FLIGHT PHASE - SALTO BWD WITH/WITHOUT TWIST IN 2ND FLIGHT PHASE",
      color: lightGreen,
      vaults: [
        { id: "410", number: "410", value: 3.0, description: "Round-off, flic-flac on - tucked salto backward off (Yurchenko)" },
        { id: "411", number: "411", value: 3.2, description: "Round-off, flic-flac on - tucked salto backward with 1/2 twist (180°) off" },
        { id: "412", number: "412", value: 3.6, description: "Round-off, flic-flac on - tucked salto backward with 1/1 twist (360°) off" },
        { id: "413", number: "413", value: 4.0, description: "Round-off, flic-flac on - tucked salto backward with 1 1/2 twist (540°) off" },
        { id: "414", number: "414", value: 4.4, description: "Round-off, flic-flac on - tucked salto backward with 2/1 twist (720°) off (Dungelova)" },
        { id: "420", number: "420", value: 3.2, description: "Round-off, flic-flac on - piked salto backward off" },
        { id: "430", number: "430", value: 2.5, description: "Round-off, flic-flac on - stretched salto backward off" },
        { id: "431", number: "431", value: 3.8, description: "Round-off, flic-flac on - stretched salto backward with 1/2 twist (180°) off" },
        { id: "432", number: "432", value: 4.2, description: "Round-off, flic-flac on - stretched salto backward with 1/1 twist (360°) off" },
        { id: "433", number: "433", value: 4.6, description: "Round-off, flic-flac on - stretched salto backward with 1 1/2 twist (540°) off" },
        { id: "434", number: "434", value: 5.0, description: "Round-off, flic-flac on - stretched salto backward with 2/1 twist (720°) off (Baitova)" },
        { id: "435", number: "435", value: 5.4, description: "Round-off, flic-flac on - stretched salto backward with 2 1/2 twist (900°) off (Amanar)" },
        { id: "440", number: "440", value: 3.6, description: "Round-off, flic-flac with 3/4 turn (270°) on - tucked salto backward off (Luconi)" },
        { id: "441", number: "441", value: 4.0, description: "Round-off, flic-flac with 3/4 turn (270°) on - tucked salto backward with 1/2 twist (180°) off" },
        { id: "442", number: "442", value: 4.2, description: "Round-off, flic-flac with 3/4 turn (270°) on - tucked salto backward with 1/1 twist (360°) off" },
        { id: "450", number: "450", value: 3.8, description: "Round-off, flic-flac with 3/4 turn (270°) on - piked salto backward off" },
        { id: "451", number: "451", value: 4.2, description: "Round-off, flic-flac with 3/4 turn (270°) on - stretched salto backward off" },
        { id: "452", number: "452", value: 4.6, description: "Round-off, flic-flac with 3/4 turn (270°) on - stretched salto backward with 1/2 twist (180°) off" },
        { id: "453", number: "453", value: 5.0, description: "Round-off, flic-flac with 3/4 turn (270°) on - stretched salto backward with 1/1 twist (360°) off" },
        { id: "462", number: "462", value: 6.4, description: "Round-off, flic-flac on - double piked salto backward off (Biles)" },
      ]
    },
    {
      id: 5,
      title: "GROUP 5: ROUND-OFF WITH 1/2 TURN (180°) IN 1ST FLIGHT PHASE - SALTO FWD/BWD WITH/WITHOUT TWIST IN 2ND FLIGHT PHASE",
      color: lightGreen,
      vaults: [
        { id: "510", number: "510", value: 3.8, description: "Round-off, flic-flac with 1/2 turn (180°) on - tucked salto forward off (Ivantcheva)" },
        { id: "511", number: "511", value: 4.0, description: "RO, flic-flac 1/2turn(180°) on-tucked salto fwd 1/2 twist(180°) off, also-1/2 turn(180°) & tucked salto bwd off (Servente)" },
        { id: "512", number: "512", value: 4.4, description: "Round-off, flic-flac with 1/2 turn (180°) on - tucked salto forward with 1/1 twist (360°) off" },
        { id: "513", number: "513", value: 4.8, description: "Round-off, flic-flac with 1/2 turn (180°) on - tucked salto forward with 1 1/2 twist (540°) off (Khorkina)" },
        { id: "520", number: "520", value: 4.0, description: "Round-off, flic-flac with 1/2 turn (180°) on - piked salto forward off (Omeltchik)" },
        { id: "521", number: "521", value: 4.2, description: "RO, flic-flac 1/2turn(180°) on-piked salto fwd 1/2 twist(180°) off, also-1/2 turn(180°) & piked salto bwd off (Podkopayeva)" },
        { id: "522", number: "522", value: 4.6, description: "Round-off, flic-flac with 1/2 turn (180°) on - piked salto forward with 1/1 twist (360°) off" },
        { id: "530", number: "530", value: 4.6, description: "Round-off, flic-flac with 1/2 turn (180°) on - stretched salto forward off" },
        { id: "531", number: "531", value: 4.8, description: "Round-off, flic-flac with 1/2 turn (180°) on - salto forward stretched with 1/2 twist (180°) off" },
        { id: "532", number: "532", value: 5.2, description: "Round-off, flic-flac with 1/2 turn (180°) on - stretched salto forward with 1/1 twist (360°) off" },
        { id: "533", number: "533", value: 5.6, description: "Round-off, flic-flac with 1/2 turn (180°) on - stretched salto forward with 1 1/2 twist (540°) off (Cheng)" },
        { id: "534", number: "534", value: 6.0, description: "Round-off, flic-flac with 1/2 turn (180°) on - stretched salto forward with 2/1 twist (720°) off" },
      ]
    }
  ];

  const handleSelect = (vault: VaultOption, groupId: number, value: number, description: string) => {
    setSelectedVaults({...selectedVaults, [groupId]: vault});
    onSelect(vault, groupId, value, description);
  };

  // Title background color
  const titleBackgroundColor = darkGreen;

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
            <Text style={styles.modalTitle}>WAG VAULT VALUE TABLE</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
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
                        { backgroundColor: lighterGreen }
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
              style={[styles.saveButton, {backgroundColor: darkGreen}]}
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
    color: '#fff',
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
    flexDirection: 'column',
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

export default WAGVaultSelectorModal;