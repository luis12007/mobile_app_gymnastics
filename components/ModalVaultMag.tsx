import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { Dimensions, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CustomNumberPadOptimized from './CustomNumberPadOptimized';

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
  const [searchNumber, setSearchNumber] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [activeInputType, setActiveInputType] = useState<'number' | 'value' | null>(null);
  const [tempInputValue, setTempInputValue] = useState('');
  const [originalInputValue, setOriginalInputValue] = useState('');
  const windowWidth = Dimensions.get('window').width;
  const isSmallScreen = windowWidth < 600;

  // Reset search filters when modal opens
  useEffect(() => {
    if (visible) {
      setSearchNumber('');
      setSearchValue('');
      setSearchDescription('');
      setShowNumberPad(false);
      setActiveInputType(null);
      setTempInputValue('');
      setOriginalInputValue('');
    }
  }, [visible]);

  // Filter vaults based on search criteria
  const filterVaults = (vaults: VaultOption[]) => {
    return vaults.filter(vault => {
      const numberMatch = !searchNumber || vault.number.toLowerCase().includes(searchNumber.toLowerCase());
      const valueMatch = !searchValue || vault.value.toString().includes(searchValue);
      const descriptionMatch = !searchDescription || vault.description.toLowerCase().includes(searchDescription.toLowerCase());
      
      return numberMatch && valueMatch && descriptionMatch;
    });
  };

  // Define the vault groups with their data based on the image
  const vaultGroups: VaultGroup[] = [
    {
      id: 1,
      title: "EG 1: Single salto vaults with complex twists.",
      color: "#63c7bd", // Teal
      vaults: [
        { id: "101", number: "101", value: 2.4, description: "Handspring and salto forward tucked 1/2 turn (Cuervo tucked)" },
        { id: "102", number: "102", value: 2.8, description: "Handspring and salto forward tucked 1/1 turn (Cuervo tucked with 1/2 turn)" },
        { id: "103", number: "103", value: 3.2, description: "Handspring and salto forward tucked 3/2 turns (Kroll)" },
        { id: "104", number: "104", value: 3.6, description: "Handspring and salto forward tucked 2/1 turns (Canbas)" },
        { id: "107", number: "107", value: 2.8, description: "Handspring and salto forward piked 1/2 turn (Cuervo piked)" },
        { id: "108", number: "108", value: 3.2, description: "Handspring and salto forward piked 1/1 turn (Cuervo piked 1/2 turn)" },
        { id: "109", number: "109", value: 3.6, description: "Handspring and salto forward piked 3/2 turn (Cuervo piked 1/1 turn)" },
        { id: "113", number: "113", value: 3.6, description: "Handspring and salto forward straight 1/2 turn (Cuervo straight)" },
        { id: "114", number: "114", value: 4.0, description: "Handspring and salto forward straight 1/1 turn (Cuervo straight 1/2 turn)" },
        { id: "115", number: "115", value: 4.4, description: "Handspring and salto forward straight 3/2 turns (Lou Yun)" },
        { id: "116", number: "116", value: 4.8, description: "Handspring and salto forward straight 2/1 turns (Cuervo straight 3/2 turns) " },
        { id: "117", number: "117", value: 5.2, description: "Handspring and salto forward straight 5/2 turns (Yeo 2)" },
        { id: "118", number: "118", value: 5.6, description: "Handspring and salto forward straight 3/1 turns (Yang Hak Leon)" },
        { id: "119", number: "119", value: 2.4, description: "Tsukahara tucked 1/1 turn (Kasamatsu)" },
        { id: "120", number: "120", value: 2.8, description: "Tsukahara tucked 3/2 turns" },
        { id: "121", number: "121", value: 3.2, description: "Tsukahara tucked 2/1 turns (Barbieri)" },
        { id: "122", number: "122", value: 3.6, description: "Tsukahara tucked 5/2 turns" },
        { id: "125", number: "125", value: 3.6, description: "Tsukahara straight 1/1 turn" },
        { id: "126", number: "126", value: 4.0, description: "Tsukahara straight 3/2 turns" },
        { id: "127", number: "127", value: 4.4, description: "Tsukahara straight 2/1 turns (Akopian)" },
        { id: "131", number: "131", value: 4.8, description: "Tsukahara straight 5/2 turns (Driggs)" },
        { id: "132", number: "132", value: 5.2, description: "Tsukahara straight 3/1 turns (López)" },
        { id: "133", number: "133", value: 5.6, description: "Tsukahara straight 7/2 turns (Yonekura)" }
      ]
    },
    {
      id: 2,
      title: "EG 2: Handspring salto vaults with or without simple twists, and all double salto forward.",
      color: "#d8ecf5", // Light blue
      vaults: [
        { id: "201", number: "201", value: 1.2, description: "Handspring forward" },
        { id: "202", number: "202", value: 1.4, description: "Handspring forward 1/2 turn" },
        { id: "203", number: "203", value: 1.6, description: "Handspring forward 1/1 turn" },
        { id: "204", number: "204", value: 1.8, description: "Handspring forward 3/2 turns" },
        { id: "205", number: "205", value: 2.0, description: "Handspring forward 2/1 turns" },
        { id: "206", number: "206", value: 2.2, description: "Handspring forward 5/2 turns (Tsygankov)" },
        { id: "207", number: "207", value: 2.0, description: "Handspring salto forward tucked" },
        { id: "213", number: "213", value: 2.4, description: "Handspring salto forward piked" },
        { id: "219", number: "219", value: 3.2, description: "Handspring salto forward straight" },
        { id: "225", number: "225", value: 4.8, description: "Handspring double salto tucked (Roche)" },
        { id: "226", number: "226", value: 5.2, description: "Roche 1/2 turn (Dragulescu)" },
        { id: "228", number: "228", value: 5.2, description: "Handspring salto fwd 1/2t & salto back tucked (Zimmerman)" },
        { id: "231", number: "231", value: 5.2, description: "Handspring double salto piked (Blanik)" },
        { id: "232", number: "232", value: 5.6, description: "Dragulescu piked (Ri Se Gwang 2)" }
      ]
    },
    {
      id: 3,
      title: "EG 3: Handspring sideways and Tsukahara vaults with or without simple twists, and all double salto backward.",
      color: "#f5d1c8", // Light pink/salmon
      vaults: [
        { id: "301", number: "301", value: 1.2, description: "Handspring sideways (Round Off) 1/4 turn" },
        { id: "302", number: "302", value: 1.4, description: "Handspring sideways (Round Off) 3/4 turn" },
        { id: "303", number: "303", value: 1.6, description: "Handspring sideways (Round Off) 5/4 turns" },
        { id: "307", number: "307", value: 1.8, description: "Tsukahara tucked (Tsukahara)" },
        { id: "308", number: "308", value: 2.0, description: "Tsukahara piked" },
        { id: "309", number: "309", value: 2.0, description: "Tsukahara tucked 1/2 turn" },
        { id: "313", number: "313", value: 2.8, description: "Tsukahara straight" },
        { id: "314", number: "314", value: 3.2, description: "Tsukahara straight 1/2 turn" },
        { id: "319", number: "319", value: 4.8, description: "Tsukahara double back tucked (Yeo)" },
        { id: "320", number: "320", value: 5.2, description: "Tsukahara double back piked (Lu Yu Fu)" },
        { id: "321", number: "321", value: 5.6, description: "Tsukahara double back 1/1turn (Ri Se Gwang 1)" }
      ]
    },
    {
      id: 4,
      title: "EG 4: Round off entry and single salto vaults with complex twists.",
      color: "#f5ca79", // Light orange/yellow
      vaults: [
        { id: "401", number: "401", value: 2.4, description: "Yurchenko tucked 1/1 turn" },
        { id: "402", number: "402", value: 2.8, description: "Yurchenko tucked 3/2 turn" },
        { id: "403", number: "403", value: 3.2, description: "Yurchenko tucked 2/1 turns" },
        { id: "404", number: "404", value: 3.6, description: "Yurchenko tucked 5/2 turns" },
        { id: "405", number: "405", value: 3.6, description: "Yurchenko straight 1/1 turn" },
        { id: "406", number: "406", value: 4.0, description: "Yurchenko straight 3/2 turns" },
        { id: "407", number: "407", value: 4.4, description: "Yurchenko straight 2/1 turns" },
        { id: "408", number: "408", value: 4.8, description: "Yurchenko straight 5/2 turns (Shewfelt)" },
        { id: "409", number: "409", value: 5.2, description: "Yurchenko straight 3/1 turns (Shirai-Kim Hee Hoon)" },
        { id: "410", number: "410", value: 5.6, description: "Yurchenko straight 7/2 turns (Shirai 2)" },
        { id: "413", number: "413", value: 2.6, description: "Round Off 1/2 turn & handspring salto forward tucked 1/2 turn" },
        { id: "414", number: "414", value: 3.0, description: "Round Off 1/2 turn & handspring salto forward piked 1/2 turn (Nemov)" },
        { id: "415", number: "415", value: 3.8, description: "Round Off 1/2 turn & handspring salto forward straight 1/2 turn (Hutcheon)" },
        { id: "416", number: "416", value: 4.2, description: "Round Off 1/2 turn & handspring salto forward straight 1/1 turn" },
        { id: "417", number: "417", value: 4.6, description: "Round Off 1/2 turn & handspring salto forward straight 3/2 turns" },
        { id: "419", number: "419", value: 5.0, description: "Round Off 1/2 turn & handspring salto forward straight 2/1 turns" },
        { id: "420", number: "420", value: 5.4, description: "Round Off 1/2 turn & handspring salto forward straight 5/2 turns (Li Xiao Peng)" }
      ]
    },
    {
      id: 5,
      title: "EG 5: Round off entry vaults with or without simple salto and all double salto forward and backward.",
      color: "#8bc793", // Green
      vaults: [
        { id: "501", number: "501", value: 1.2, description: "RO, handspring backward" },
        { id: "502", number: "502", value: 1.4, description: "RO, handspring backward 1/2 turn" },
        { id: "503", number: "503", value: 1.6, description: "RO, handspring backward 1/1 turn" },
        { id: "507", number: "507", value: 1.8, description: "Round Off, back handspring, salto backward tucked (Yurchenko)" },
        { id: "508", number: "508", value: 2.0, description: "Yurchenko tucked 1/2 turn" },
        { id: "509", number: "509", value: 2.0, description: "Yurchenko piked" },
        { id: "510", number: "510", value: 2.8, description: "Yurchenko straight" },
        { id: "511", number: "511", value: 3.2, description: "Yurchenko straight 1/2 turn" },
        { id: "513", number: "513", value: 1.4, description: "Round Off 1/2 turn, handspring forward" },
        { id: "514", number: "514", value: 1.6, description: "Round Off 1/2 turn, handspring forward 1/2 turn" },
        { id: "515", number: "515", value: 1.8, description: "Round Off 1/2 turn, handspring forward 1/1 turn" },
        { id: "516", number: "516", value: 2.2, description: "Round Off 1/2 turn, handspring salto forward tucked" },
        { id: "517", number: "517", value: 2.6, description: "Round Off 1/2 turn, handspring salto forward piked" },
        { id: "518", number: "518", value: 3.4, description: "Round Off 1/2 turn, handspring salto forward straight" },
        { id: "519", number: "519", value: 4.8, description: "Yurchenko double salto backward tucked (Melissanidis)" },
        { id: "520", number: "520", value: 5.2, description: "Melissanidis piked (Yang Wei)" },
        { id: "521", number: "521", value: 5.0, description: "Round Off 1/2 turn, handspring double salto tucked" },
        { id: "522", number: "522", value: 5.6, description: "Yurchencko double salto backward tucked 1/1 turn (Olfati)" }
      ]
    }
  ];

  const handleSelect = (vault: VaultOption, groupId: number, value: number, description: string) => {
    setSelectedVaults({...selectedVaults, [groupId]: vault});
    onSelect(vault, groupId, value, description);
  };

  // Title background color from the image
  const titleBackgroundColor = "#ffeb3b";

  // Funciones para manejar el teclado numérico
  const handleNumberInputPress = (type: 'number' | 'value') => {
    setActiveInputType(type);
    const currentValue = type === 'number' ? searchNumber : searchValue;
    setOriginalInputValue(currentValue);
    setTempInputValue(currentValue);
    setShowNumberPad(true);
  };

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
          
          {/* Search Bars */}
          <View style={styles.searchContainer}>
            <TouchableOpacity 
              style={styles.searchInputContainer}
              onPress={() => handleNumberInputPress('number')}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={16} color="#666" style={styles.searchIcon} />
              <View style={styles.searchInputTextWrapper}>
                <Text style={[
                  styles.searchInputText,
                  !searchNumber && styles.searchInputPlaceholder
                ]}>
                  {searchNumber || "Search by number..."}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.searchInputContainer}
              onPress={() => handleNumberInputPress('value')}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={16} color="#666" style={styles.searchIcon} />
              <View style={styles.searchInputTextWrapper}>
                <Text style={[
                  styles.searchInputText,
                  !searchValue && styles.searchInputPlaceholder
                ]}>
                  {searchValue || "Search by value..."}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={16} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by description..."
                value={searchDescription}
                onChangeText={setSearchDescription}
                placeholderTextColor="#999"
              />
            </View>
          </View>
          
          <ScrollView style={styles.scrollView} horizontal={true}>
            <View style={styles.groupsContainer}>
              {vaultGroups.map((group) => {
                const filteredVaults = filterVaults(group.vaults);
                
                // Only show group if it has filtered vaults
                if (filteredVaults.length === 0) {
                  return null;
                }
                
                return (
                  <View key={group.id} style={styles.groupColumn}>
                    <View style={[styles.groupHeader, { backgroundColor: group.color }]}>
                      <Text style={styles.groupTitle}>{group.title}</Text>
                    </View>
                    
                    <ScrollView style={styles.vaultsScrollContainer} nestedScrollEnabled={true}>
                      <View style={styles.vaultsContainer}>
                        {filteredVaults.map((vault) => (
                          <TouchableOpacity
                            key={vault.id}
                            style={[
                              styles.vaultItem,
                              selectedVaults[group.id]?.id === vault.id ? styles.selectedVault : {},
                              { backgroundColor: group.color + '20' } // Add transparency
                            ]}
                            onPress={() => handleSelect(vault, group.id, vault.value, vault.description)}
                          >
                            <View style={styles.vaultNumberValue}>
                              <Text style={styles.vaultNumber}>{vault.number}</Text>
                              <Text style={styles.vaultValue}>{vault.value.toFixed(1)}</Text>
                            </View>
                            <Text style={styles.vaultDescription}>
                              {vault.description}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                );
              })}
            </View>
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
        {showNumberPad && (
          <CustomNumberPadOptimized
            visible={showNumberPad}
            value={tempInputValue}
            onValueChange={(value) => {
              setTempInputValue(value);
              // Actualizar en tiempo real
              if (activeInputType === 'number') {
                setSearchNumber(value);
              } else if (activeInputType === 'value') {
                setSearchValue(value);
              }
            }}
            onClose={(finalValue) => {
              // Los valores ya se han actualizado en tiempo real
              setShowNumberPad(false);
              setActiveInputType(null);
              setTempInputValue('');
              setOriginalInputValue('');
            }}
            title={activeInputType === 'number' ? 'Search by Number' : 'Search by Value'}
            allowDecimal={activeInputType === 'value'}
            maxLength={activeInputType === 'number' ? 3 : 4}
          />
        )}
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
    width: '98%',
    maxWidth: 1200,
    maxHeight: '98%',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    maxHeight: '85%',
  },
  groupsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  groupColumn: {
    width: 280,
    marginHorizontal: 4,
    flex: 1,
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
    minHeight: 80,
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  vaultsScrollContainer: {
    maxHeight: '100%',
  },
  vaultsContainer: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    backgroundColor: 'white',
    borderTopWidth: 0,
  },
  vaultsContainerSmall: {
  },
  vaultItem: {
    width: '100%',
    padding: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
    minHeight: 100,
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
    lineHeight: 16,
    flexWrap: 'wrap',
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
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  searchInputTextWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  searchInputText: {
    color: '#333',
    fontSize: 14,
    lineHeight: 16,
    textAlignVertical: 'center',
    includeFontPadding: false,
    paddingVertical: 0,
    marginVertical: 0,
  },
  searchInputPlaceholder: {
    color: '#999',
  },
});

export default VaultSelectorModal;
