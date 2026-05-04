import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Platform, ScrollView, Dimensions, TextInput, Modal, Alert } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCompetitionById, Competition, Gymnast, getGymnastsByCompetition, getGymnastById, createGymnast, updateGymnast, deleteGymnast } from '../lib/database';
import { useProductionEntitlementCheck } from '../lib/useProductionEntitlementCheck';
import PaywallModalSimple from '../componentes/PaywallModalSimple';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';

interface UndoAction {
  type: 'add' | 'delete' | 'update' | 'import';
  data: any;
  timestamp: number;
}

const { width, height } = Dimensions.get('window');

// On iOS (iPhone and iPad), replace Modal with an absolute-positioned View overlay
// This fixes nested modal issues on iPad where the event picker wasn't showing
const ModalWrapper = ({ visible, children, transparent, animationType, onRequestClose, elevated, ...props }: any) => {
  if (Platform.OS === 'ios') {
    if (!visible) return null;
    return (
      <View style={elevated ? iosOverlayStyle.containerHigher : iosOverlayStyle.container}>
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
  containerHigher: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1100,
  },
});

const MAG_EVENTS = ['FX', 'VT', 'PH', 'SR', 'PB', 'HB'];
const WAG_EVENTS = ['FX', 'UB', 'BB', 'VT'];

export default function StartJudging() {
  // Validar que el usuario tiene entitlemente de producción
  const { hasProduction, isLoading } = useProductionEntitlementCheck('StartJudging');
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const hasShownRef = useRef(false);

  const router = useRouter();
  const { competitionId, lastGymnastId, discipline } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const editValueRef = useRef('');
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searchBib, setSearchBib] = useState('');
  const [searchEvent, setSearchEvent] = useState('');
  const [gymnasts, setGymnasts] = useState<Gymnast[]>([]);
  const [selectedGymnasts, setSelectedGymnasts] = useState<Set<number>>(new Set());
  const [deleteMode, setDeleteMode] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string; gymnastId: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [eventDropdownVisible, setEventDropdownVisible] = useState(false);
  const [eventSearchDropdownVisible, setEventSearchDropdownVisible] = useState(false);
  const [addGymnastModalVisible, setAddGymnastModalVisible] = useState(false);
  const [addGymnastEventPickerVisible, setAddGymnastEventPickerVisible] = useState(false);
  const [newGymnastData, setNewGymnastData] = useState({
    numero: '',
    name: '',
    event: '',
    noc: '',
    bib: ''
  });
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [showContinueButton, setShowContinueButton] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!hasProduction) {
      if (!hasShownRef.current) {
        setShowPaywallModal(true);
        hasShownRef.current = true;
      }
      return;
    }

    loadCompetition();
  }, [competitionId, isLoading, hasProduction]);

  useEffect(() => {
    // Show continue button if we came from a gymnast screen
    if (lastGymnastId) {
      setShowContinueButton(true);
    }
  }, [lastGymnastId]);

  const handleContinueJudging = async () => {
    try {
      if (!lastGymnastId) return;

      const lastIdNum = parseInt(lastGymnastId as string);
      let gymnast: Gymnast | null = gymnasts.find(g => g.id === lastIdNum) ?? null;
      if (!gymnast) gymnast = await getGymnastById(lastIdNum);
      if (!gymnast) {
        Alert.alert('Error', 'Could not find the last gymnast.');
        return;
      }

      const pathname = gymnast.evento === 'VT' ? '/gymnast-vault' : '/gymnast-floor';
      router.push({
        pathname,
        params: {
          gymnastId: String(lastGymnastId),
          competitionId: competitionId as string,
          ...(discipline !== undefined ? { discipline: String(discipline) } : {}),
        },
      });
    } catch (error) {
      console.error('Error in handleContinueJudging:', error);
      Alert.alert('Error', 'Could not continue with the last gymnast.');
    }
  };

  const loadCompetition = async () => {
    try {
      const id = parseInt(competitionId as string);
      const comp = await getCompetitionById(id);
      setCompetition(comp);
      
      if (comp) {
        await loadGymnasts(comp.id);
      }
    } catch (error) {
      console.error('Error loading competition:', error);
    }
  };

  const loadGymnasts = async (compId: number) => {
    try {
      const gymList = await getGymnastsByCompetition(compId);
      setGymnasts(gymList);
    } catch (error) {
      console.error('Error loading gymnasts:', error);
    }
  };

  const reorganizeGymnasts = async (compId: number) => {
    try {
      const gymList = await getGymnastsByCompetition(compId);
      
      // Sort by current numero
      gymList.sort((a, b) => a.numero - b.numero);
      
      // Update each gymnast with sequential numbers
      for (let i = 0; i < gymList.length; i++) {
        const newNumero = i + 1;
        if (gymList[i].numero !== newNumero) {
          await updateGymnast(gymList[i].id, { numero: newNumero });
        }
      }
      
      // Reload gymnasts after reorganization
      await loadGymnasts(compId);
    } catch (error) {
      console.error('Error reorganizing gymnasts:', error);
    }
  };

  const handleBack = () => {
    // Ir a la carpeta de la competencia
    if (competition?.folder_id) {
      router.push(`/folder/${competition.folder_id}`);
    } else {
      router.push('/main-menu');
    }
  };

  const handleUndo = async () => {
    try {
      if (undoStack.length === 0) {
        Alert.alert('Nothing to Undo', 'No actions available to undo.');
        return;
      }

      const lastAction = undoStack[undoStack.length - 1];
      
      if (!competition) return;

      if (lastAction.type === 'add') {
        // Undo add: delete the gymnast
        await deleteGymnast(lastAction.data.id);
        await reorganizeGymnasts(competition.id);
      } else if (lastAction.type === 'delete') {
        // Undo delete: recreate gymnasts
        for (const gymnast of lastAction.data.gymnasts) {
          await createGymnast(
            competition.id,
            gymnast.numero,
            gymnast.gymnasta,
            gymnast.evento,
            gymnast.noc,
            gymnast.bib
          );
        }
        await reorganizeGymnasts(competition.id);
      } else if (lastAction.type === 'update') {
        // Undo update: restore old value
        await updateGymnast(lastAction.data.id, lastAction.data.oldValue);
        await loadGymnasts(competition.id);
      } else if (lastAction.type === 'import') {
        // Undo import: restore old state
        const { oldGymnasts, updatedIds, createdIds } = lastAction.data;
        
        // Delete newly created gymnasts
        for (const id of createdIds) {
          await deleteGymnast(id);
        }
        
        // Restore old values for updated gymnasts
        for (const oldGym of oldGymnasts) {
          const wasUpdated = updatedIds.includes(oldGym.id);
          if (wasUpdated) {
            await updateGymnast(oldGym.id, {
              gymnasta: oldGym.gymnasta,
              evento: oldGym.evento,
              noc: oldGym.noc,
              bib: oldGym.bib
            });
          }
        }
        
        // Recreate any gymnasts that were deleted during import
        const recreateGymnasts = oldGymnasts.filter(
          (g: Gymnast) => !updatedIds.includes(g.id) && g.numero > (updatedIds.length + createdIds.length)
        );
        for (const g of recreateGymnasts) {
          await createGymnast(
            competition.id,
            g.numero,
            g.gymnasta,
            g.evento,
            g.noc,
            g.bib
          );
        }
        
        await reorganizeGymnasts(competition.id);
      }

      // Remove action from stack
      setUndoStack(prev => prev.slice(0, -1));
    } catch (error) {
      console.error('Error undoing action:', error);
      Alert.alert('Error', 'Failed to undo action.');
    }
  };

  const handleImport = async () => {
    try {
      if (!competition) return;

      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/comma-separated-values'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;

      // Read file
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });

      // Parse based on file type
      let data: any[][] = [];
      if (fileName.endsWith('.csv')) {
        // Parse CSV
        const csvContent = atob(fileContent);
        const lines = csvContent.split('\n');
        data = lines.map(line => line.split(',').map(cell => cell.trim()));
      } else {
        // Parse Excel
        const workbook = XLSX.read(fileContent, { type: 'base64' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
      }

      // Remove header row
      if (data.length > 0) {
        data = data.slice(1);
      }

      // Filter out empty rows
      data = data.filter(row => row && row.length > 0 && row.some(cell => cell && cell.toString().trim() !== ''));

      if (data.length === 0) {
        Alert.alert('Empty File', 'The file contains no data.');
        return;
      }

      // Calculate how many we can import (limited by max participants)
      const recordsToImport = Math.min(data.length, competition.number_of_participants);

      // Show confirmation
      const willSkip = data.length - recordsToImport;
      const message = willSkip > 0 
        ? `Will import ${recordsToImport} records and replace existing data. ${willSkip} records will be skipped (maximum reached).`
        : `Will import ${recordsToImport} records and replace existing data.`;

      Alert.alert(
        'Confirm Import',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              try {
                // Save old data for undo
                const oldGymnasts = [...gymnasts];
                
                // Track which gymnasts were updated vs created
                const updatedIds: number[] = [];
                const createdIds: number[] = [];
                
                for (let i = 0; i < recordsToImport; i++) {
                  const row = data[i];
                  const gymnastName = row[0]?.toString() || '';
                  const event = row[1]?.toString() || '';
                  const noc = row[2]?.toString() || '';
                  const bib = row[3]?.toString() || '';
                  const numero = i + 1;

                  // Check if gymnast at this position already exists
                  const existingGymnast = gymnasts.find(g => g.numero === numero);
                  
                  if (existingGymnast) {
                    // Update existing gymnast
                    await updateGymnast(existingGymnast.id, {
                      gymnasta: gymnastName,
                      evento: event,
                      noc: noc,
                      bib: bib
                    });
                    updatedIds.push(existingGymnast.id);
                  } else {
                    // Create new gymnast
                    const id = await createGymnast(
                      competition.id,
                      numero,
                      gymnastName,
                      event,
                      noc,
                      bib
                    );
                    if (id) {
                      createdIds.push(id);
                    }
                  }
                }

                // Delete any gymnasts beyond the imported count
                const gymnastsToDelete = gymnasts.filter(g => g.numero > recordsToImport);
                for (const g of gymnastsToDelete) {
                  await deleteGymnast(g.id);
                }

                // Add to undo stack
                setUndoStack(prev => [...prev, {
                  type: 'import',
                  data: { 
                    oldGymnasts,
                    updatedIds,
                    createdIds
                  },
                  timestamp: Date.now()
                }]);

                await reorganizeGymnasts(competition.id);
                Alert.alert('Success', `Imported ${recordsToImport} records successfully.`);
              } catch (error) {
                console.error('Error importing data:', error);
                Alert.alert('Error', 'Failed to import data.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error importing file:', error);
      Alert.alert('Error', 'Failed to read file. Please ensure it is a valid Excel or CSV file.');
    }
  };

  const handleAdd = async () => {
    try {
      if (!competition) return;
      
      // Validate maximum participants
      if (gymnasts.length >= competition.number_of_participants) {
        Alert.alert(
          'Maximum Reached',
          `Cannot add more than ${competition.number_of_participants} participants.`
        );
        return;
      }

      // Show modal to add gymnast information
      setAddGymnastModalVisible(true);
    } catch (error) {
      console.error('Error preparing to add gymnast:', error);
    }
  };

  const handleConfirmAddGymnast = async () => {
    try {
      if (!competition) return;

      // Determine the numero: use specified number or add to end
      let targetNumero: number;
      if (newGymnastData.numero && newGymnastData.numero.trim() !== '') {
        targetNumero = parseInt(newGymnastData.numero);
        
        // Validate numero is within range
        if (targetNumero < 1 || targetNumero > gymnasts.length + 1) {
          Alert.alert('Invalid Number', `Number must be between 1 and ${gymnasts.length + 1}`);
          return;
        }
        
        // If inserting in the middle, shift existing gymnasts
        if (targetNumero <= gymnasts.length) {
          const gymnastsToShift = gymnasts.filter(g => g.numero >= targetNumero);
          for (const g of gymnastsToShift) {
            await updateGymnast(g.id, { numero: g.numero + 1 });
          }
        }
      } else {
        // Add to end
        targetNumero = gymnasts.length + 1;
      }

      const id = await createGymnast(
        competition.id,
        targetNumero,
        newGymnastData.name,
        newGymnastData.event,
        newGymnastData.noc,
        newGymnastData.bib
      );
      
      // Add to undo stack
      if (id) {
        setUndoStack(prev => [...prev, {
          type: 'add',
          data: { id },
          timestamp: Date.now()
        }]);
      }
      
      // Reorganize to ensure sequential numbering
      await reorganizeGymnasts(competition.id);
      
      // Reset modal and data
      setAddGymnastModalVisible(false);
      setNewGymnastData({ numero: '', name: '', event: '', noc: '', bib: '' });
    } catch (error) {
      console.error('Error adding gymnast:', error);
    }
  };

  const handleDelete = () => {
    if (!deleteMode) {
      // Activate delete mode
      setDeleteMode(true);
      setSelectedGymnasts(new Set());
    } else {
      // Already in delete mode, do nothing (confirmation is on bottom button)
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedGymnasts.size === 0) {
      Alert.alert('No Selection', 'Please select gymnasts to delete');
      return;
    }

    Alert.alert(
      'Delete Gymnasts',
      `Are you sure you want to delete ${selectedGymnasts.size} gymnast(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Save deleted gymnasts for undo
              const deletedGymnasts = gymnasts.filter(g => selectedGymnasts.has(g.id));
              
              for (const id of selectedGymnasts) {
                await deleteGymnast(id);
              }
              
              // Add to undo stack
              setUndoStack(prev => [...prev, {
                type: 'delete',
                data: { gymnasts: deletedGymnasts },
                timestamp: Date.now()
              }]);
              
              if (competition) {
                await reorganizeGymnasts(competition.id);
              }
              setSelectedGymnasts(new Set());
              setDeleteMode(false);
            } catch (error) {
              console.error('Error deleting gymnasts:', error);
            }
          }
        }
      ]
    );
  };

  const handleCancelDelete = () => {
    setDeleteMode(false);
    setSelectedGymnasts(new Set());
  };

  const toggleGymnastSelection = (gymnastId: number) => {
    const newSelection = new Set(selectedGymnasts);
    if (newSelection.has(gymnastId)) {
      newSelection.delete(gymnastId);
    } else {
      newSelection.add(gymnastId);
    }
    setSelectedGymnasts(newSelection);
  };

  const INLINE_EDIT_FIELDS = new Set(['gymnasta', 'noc', 'bib']);

  const commitInlineCell = async (gymnastId: number, field: string, valueOverride?: string) => {
    if (!competition) return;
    if (!INLINE_EDIT_FIELDS.has(field)) return;

    const gymnast = gymnasts.find(g => g.id === gymnastId);
    if (!gymnast) return;

    const nextValue = String((valueOverride ?? editValueRef.current) ?? '').trim();
    const prevValue = String((gymnast as any)[field] ?? '');

    // Salir de edición siempre
    setEditingCell(current => {
      if (current && current.gymnastId === gymnastId && current.field === field) return null;
      return current;
    });
    setEditValue('');
    editValueRef.current = '';

    if (nextValue === prevValue) return;

    try {
      const oldValue = { [field]: (gymnast as any)[field] };
      const updateData: any = { [field]: nextValue };

      await updateGymnast(gymnastId, updateData);

      setUndoStack(prev => [...prev, {
        type: 'update',
        data: {
          id: gymnastId,
          field,
          oldValue,
          newValue: updateData,
        },
        timestamp: Date.now(),
      }]);

      setGymnasts(prev => prev.map(g => (g.id === gymnastId ? ({ ...g, ...(updateData as any) }) : g)));
    } catch (error) {
      console.error('Error saving inline cell:', error);
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  const handleCellClick = async (rowIndex: number, field: string) => {
    const gymnast = gymnasts[rowIndex];
    if (!gymnast) return;

    // Si hay una edición inline en curso, guardarla antes de cambiar de celda.
    if (editingCell && INLINE_EDIT_FIELDS.has(editingCell.field)) {
      const switchingToDifferentCell = editingCell.gymnastId !== gymnast.id || editingCell.field !== field;
      if (switchingToDifferentCell) {
        const valueToCommit = editValueRef.current;
        await commitInlineCell(editingCell.gymnastId, editingCell.field, valueToCommit);
      }
    }

    if (field === 'evento') {
      setEditingCell({ rowIndex, field, gymnastId: gymnast.id });
      setEventDropdownVisible(true);
    } else {
      setEditingCell({ rowIndex, field, gymnastId: gymnast.id });
      const currentValue = String((gymnast as any)[field] || '');
      setEditValue(currentValue);
      editValueRef.current = currentValue;
    }
  };

  const handleSaveCell = async () => {
    if (!editingCell || !competition) return;
    
    try {
      // Get old value for undo
      const gymnast = gymnasts.find(g => g.id === editingCell.gymnastId);
      const oldValue = gymnast ? { [editingCell.field]: gymnast[editingCell.field as keyof Gymnast] } : {};
      
      const updateData: any = {};
      updateData[editingCell.field] = editValue;
      
      await updateGymnast(editingCell.gymnastId, updateData);
      
      // Add to undo stack
      setUndoStack(prev => [...prev, {
        type: 'update',
        data: { 
          id: editingCell.gymnastId,
          field: editingCell.field,
          oldValue,
          newValue: updateData
        },
        timestamp: Date.now()
      }]);
      
      await loadGymnasts(competition.id);
      
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving cell:', error);
    }
  };

  const handleSelectEvent = async (event: string) => {
    if (!editingCell || !competition) return;
    
    try {
      // Get old value for undo
      const gymnast = gymnasts.find(g => g.id === editingCell.gymnastId);
      const oldValue = { evento: gymnast?.evento || '' };
      
      await updateGymnast(editingCell.gymnastId, { evento: event });
      
      // Add to undo stack
      setUndoStack(prev => [...prev, {
        type: 'update',
        data: { 
          id: editingCell.gymnastId,
          field: 'evento',
          oldValue,
          newValue: { evento: event }
        },
        timestamp: Date.now()
      }]);
      
      await loadGymnasts(competition.id);
      
      setEventDropdownVisible(false);
      setEditingCell(null);
    } catch (error) {
      console.error('Error selecting event:', error);
    }
  };

  const handleSelectSearchEvent = (event: string) => {
    setSearchEvent(event);
    setEventSearchDropdownVisible(false);
  };

  const handleStartJudging = () => {
    try {
      // Validate that all gymnasts have an event selected
      const missingEventIndex = gymnasts.findIndex(g => !g.evento || g.evento.trim() === '');
      
      if (missingEventIndex !== -1) {
        // Scroll to the first gymnast missing an event
        scrollViewRef.current?.scrollTo({
          y: missingEventIndex * 48, // Approximate row height
          animated: true
        });

        // Highlight the row in red
        setHighlightedRow(missingEventIndex);
        
        // Remove highlight after 1 second
        setTimeout(() => {
          setHighlightedRow(null);
        }, 1000);

        Alert.alert(
          'Missing Events',
          'Please select an event for all gymnasts before starting judging.'
        );
        return;
      }

      // Navigate to first gymnast
      if (gymnasts.length > 0 && competition) {
        navigateToGymnast(gymnasts[0]);
      }
    } catch (error) {
      console.error('Error starting judging:', error);
      Alert.alert('Error', 'Could not start judging. Please try again.');
    }
  };

  const navigateToGymnast = (gymnast: Gymnast, skipValidation: boolean = false) => {
    try {
      if (!competition) return;

      // Validate that gymnast has an event selected (unless skipping validation)
      if (!skipValidation && (!gymnast.evento || gymnast.evento.trim() === '')) {
        // Find the index of this gymnast in the full list
        const gymnastIndex = gymnasts.findIndex(g => g.id === gymnast.id);
        
        if (gymnastIndex !== -1) {
          // Scroll to the gymnast
          scrollViewRef.current?.scrollTo({
            y: gymnastIndex * 48, // Approximate row height
            animated: true
          });

          // Highlight the row in red
          setHighlightedRow(gymnastIndex);
          
          // Remove highlight after 1 second
          setTimeout(() => {
            setHighlightedRow(null);
          }, 1000);
        }

        Alert.alert(
          'Missing Event',
          'Please select an event for this gymnast before starting judging.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if event is VT (Vault)
      if (gymnast.evento === 'VT') {
        router.push({
          pathname: '/gymnast-vault',
          params: { 
            gymnastId: gymnast.id.toString(),
            competitionId: competition.id.toString()
          }
        });
      } else {
        // For all other events (FX, PH, SR, PB, HB, UB, BB)
        router.push({
          pathname: '/gymnast-floor',
          params: { 
            gymnastId: gymnast.id.toString(),
            competitionId: competition.id.toString()
          }
        });
      }
    } catch (error) {
      console.error('Error navigating to gymnast:', error);
      Alert.alert('Error', 'Could not open the gymnast screen. Please try again.');
    }
  };

  const getAvailableEvents = () => {
    return competition?.gender ? MAG_EVENTS : WAG_EVENTS;
  };

  const getFilteredGymnasts = () => {
    return gymnasts.filter(g => {
      const matchesName = !searchName || (g.gymnasta && g.gymnasta.toLowerCase().includes(searchName.toLowerCase()));
      const matchesBib = !searchBib || (g.bib && g.bib.toLowerCase().includes(searchBib.toLowerCase()));
      const matchesEvent = !searchEvent || g.evento === searchEvent;
      return matchesName && matchesBib && matchesEvent;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.topBarTitle}>{competition?.name || 'Competition'}</Text>
          <Text style={styles.topBarSubtitle}>
            {competition?.gender ? 'MAG' : 'WAG'} • {gymnasts.length} participants
          </Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Name"
          placeholderTextColor="#999"
          value={searchName}
          onChangeText={setSearchName}
        />

        <TextInput
          style={styles.searchInput}
          placeholder="Bib"
          placeholderTextColor="#999"
          value={searchBib}
          onChangeText={setSearchBib}
        />

        <TouchableOpacity 
          style={styles.searchEventButton}
          onPress={() => setEventSearchDropdownVisible(true)}
        >
          <Text style={styles.searchEventText}>{searchEvent || 'Event'}</Text>
        </TouchableOpacity>

        {/* Spacer to push buttons to the right */}
        <View style={styles.spacer} />

        <TouchableOpacity style={styles.actionButton} onPress={handleUndo}>
          <Text style={styles.actionButtonIcon}>↶</Text>
          <Text style={styles.actionButtonLabel}>Undo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleImport}>
          <Text style={styles.actionButtonIcon}>📥</Text>
          <Text style={styles.actionButtonLabel}>Import</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleAdd}>
          <Text style={styles.actionButtonIcon}>+</Text>
          <Text style={styles.actionButtonLabel}>Add</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.deleteActionButton]} onPress={handleDelete}>
          <Text style={styles.actionButtonIcon}>🗑</Text>
          <Text style={styles.actionButtonLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content - Table Card */}
      <View style={styles.content}>
        <View style={styles.tableCard}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            {deleteMode && <Text style={[styles.headerCell, styles.checkboxColumn]}>☑</Text>}
            <Text style={[styles.headerCell, styles.noColumn]}>No.</Text>
            <Text style={[styles.headerCell, styles.gymnastColumn]}>Gymnast</Text>
            <Text style={[styles.headerCell, styles.eventColumn]}>Event</Text>
            <Text style={[styles.headerCell, styles.nocColumn]}>NOC</Text>
            <Text style={[styles.headerCell, styles.bibColumn]}>Bib</Text>
          </View>

          {/* Table Body */}
          <ScrollView ref={scrollViewRef} style={styles.tableBody} showsVerticalScrollIndicator={true}>
            {getFilteredGymnasts().map((gymnast, index) => {
              const isHighlighted = highlightedRow === gymnasts.indexOf(gymnast);
              const isSelected = selectedGymnasts.has(gymnast.id);
              const isStarred = gymnast.starred;
              
              return (
                <View 
                  key={gymnast.id} 
                  style={[
                    styles.tableRow,
                    isStarred && styles.starredRow,
                    isHighlighted && styles.highlightedRow,
                    isSelected && styles.selectedRow
                  ]}
                >
                  {deleteMode && (
                    <TouchableOpacity 
                      style={[styles.tableCell, styles.checkboxColumn]}
                      onPress={() => toggleGymnastSelection(gymnast.id)}
                    >
                      <Text style={styles.checkbox}>
                        {isSelected ? '☑' : '☐'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={[styles.tableCell, styles.noColumn]}
                    onPress={() => navigateToGymnast(gymnast)}
                  >
                    <Text style={styles.tableCellText}>{gymnast.numero}</Text>
                  </TouchableOpacity>
                
                {editingCell?.gymnastId === gymnast.id && editingCell.field === 'gymnasta' ? (
                  <View style={[styles.tableCell, styles.gymnastColumn]}>
                    <TextInput
                      style={styles.tableCellText}
                      value={editValue}
                      onChangeText={(t) => {
                        setEditValue(t);
                        editValueRef.current = t;
                      }}
                      autoFocus
                      onBlur={() => commitInlineCell(gymnast.id, 'gymnasta')}
                      onSubmitEditing={() => commitInlineCell(gymnast.id, 'gymnasta', editValueRef.current)}
                      returnKeyType="done"
                      blurOnSubmit
                      autoCorrect={false}
                    />
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.tableCell, styles.gymnastColumn]}
                    onPress={() => { void handleCellClick(gymnasts.indexOf(gymnast), 'gymnasta'); }}
                  >
                    <Text style={styles.tableCellText}>
                      {gymnast.gymnasta || 'Click to edit'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.tableCell, styles.eventColumn]}
                  onPress={() => { void handleCellClick(gymnasts.indexOf(gymnast), 'evento'); }}
                >
                  <Text style={styles.tableCellText}>
                    {gymnast.evento || 'Click to edit'}
                  </Text>
                </TouchableOpacity>
                
                {editingCell?.gymnastId === gymnast.id && editingCell.field === 'noc' ? (
                  <View style={[styles.tableCell, styles.nocColumn]}>
                    <TextInput
                      style={styles.tableCellText}
                      value={editValue}
                      onChangeText={(t) => {
                        setEditValue(t);
                        editValueRef.current = t;
                      }}
                      autoFocus
                      onBlur={() => commitInlineCell(gymnast.id, 'noc')}
                      onSubmitEditing={() => commitInlineCell(gymnast.id, 'noc', editValueRef.current)}
                      returnKeyType="done"
                      blurOnSubmit
                      autoCorrect={false}
                      autoCapitalize="characters"
                    />
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.tableCell, styles.nocColumn]}
                    onPress={() => { void handleCellClick(gymnasts.indexOf(gymnast), 'noc'); }}
                  >
                    <Text style={styles.tableCellText}>
                      {gymnast.noc || 'Click to edit'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {editingCell?.gymnastId === gymnast.id && editingCell.field === 'bib' ? (
                  <View style={[styles.tableCell, styles.bibColumn]}>
                    <TextInput
                      style={styles.tableCellText}
                      value={editValue}
                      onChangeText={(t) => {
                        setEditValue(t);
                        editValueRef.current = t;
                      }}
                      autoFocus
                      onBlur={() => commitInlineCell(gymnast.id, 'bib')}
                      onSubmitEditing={() => commitInlineCell(gymnast.id, 'bib', editValueRef.current)}
                      returnKeyType="done"
                      blurOnSubmit
                      autoCorrect={false}
                    />
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.tableCell, styles.bibColumn]}
                    onPress={() => { void handleCellClick(gymnasts.indexOf(gymnast), 'bib'); }}
                  >
                    <Text style={styles.tableCellText}>
                      {gymnast.bib || 'Click to edit'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomButtonContainer}>
        {deleteMode ? (
          <View style={styles.deleteButtonsRow}>
            <TouchableOpacity 
              style={[styles.bottomActionButton, styles.cancelDeleteButton]}
              onPress={handleCancelDelete}
            >
              <Text style={styles.cancelDeleteText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bottomActionButton, styles.confirmDeleteButton]}
              onPress={handleConfirmDelete}
            >
              <Text style={styles.confirmDeleteText}>Confirm Delete ({selectedGymnasts.size})</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={showContinueButton ? handleContinueJudging : handleStartJudging}
          >
            <Text style={styles.startButtonText}>
              {showContinueButton ? 'Continue Judging' : 'Start Judging'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Cell Modal */}
      {/* Edit Cell Modal */}
      <ModalWrapper
        visible={!!editingCell && editingCell.field !== 'evento' && editingCell.field !== 'gymnasta' && editingCell.field !== 'noc' && editingCell.field !== 'bib'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingCell(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlayTop}
          activeOpacity={1}
          onPress={() => setEditingCell(null)}
        >
          <View 
            style={styles.editModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>
              Edit {editingCell?.field.toUpperCase()}
            </Text>
            
            <TextInput
              style={styles.editInput}
              placeholder={`Enter ${editingCell?.field}`}
              placeholderTextColor="#999"
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEditingCell(null);
                  setEditValue('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveCell}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </ModalWrapper>

      {/* Event Dropdown Modal */}
      <ModalWrapper
        visible={eventDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setEventDropdownVisible(false);
          setEditingCell(null);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setEventDropdownVisible(false);
            setEditingCell(null);
          }}
        >
          <View 
            style={styles.eventDropdownModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Select Event</Text>
            
            <ScrollView style={styles.eventOptionsScroll} showsVerticalScrollIndicator={true}>
              {getAvailableEvents().map((event) => (
                <TouchableOpacity
                  key={event}
                  style={styles.eventOption}
                  onPress={() => handleSelectEvent(event)}
                >
                  <Text style={styles.eventOptionText}>{event}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.eventCancelButton}
              onPress={() => {
                setEventDropdownVisible(false);
                setEditingCell(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ModalWrapper>

      {/* Event Search Dropdown Modal */}
      <ModalWrapper
        visible={eventSearchDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEventSearchDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEventSearchDropdownVisible(false)}
        >
          <View 
            style={styles.eventDropdownModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Filter by Event</Text>
            
            <TouchableOpacity
              style={styles.eventOption}
              onPress={() => handleSelectSearchEvent('')}
            >
              <Text style={styles.eventOptionText}>All Events</Text>
            </TouchableOpacity>

            <ScrollView style={styles.eventOptionsScroll} showsVerticalScrollIndicator={true}>
              {getAvailableEvents().map((event) => (
                <TouchableOpacity
                  key={event}
                  style={styles.eventOption}
                  onPress={() => handleSelectSearchEvent(event)}
                >
                  <Text style={styles.eventOptionText}>{event}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.eventCancelButton}
              onPress={() => setEventSearchDropdownVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ModalWrapper>

      {/* Add Gymnast Modal */}
      <ModalWrapper
        visible={addGymnastModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddGymnastModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlayTop}
          activeOpacity={1}
          onPress={() => setAddGymnastModalVisible(false)}
        >
          <View 
            style={styles.addGymnastModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Add New Gymnast</Text>
            
            <TextInput
              style={styles.editInput}
              placeholder="Number (optional - auto if empty)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={newGymnastData.numero}
              onChangeText={(text) => setNewGymnastData({...newGymnastData, numero: text})}
            />

            <TextInput
              style={styles.editInput}
              placeholder="Name"
              placeholderTextColor="#999"
              value={newGymnastData.name}
              onChangeText={(text) => setNewGymnastData({...newGymnastData, name: text})}
            />

            <TouchableOpacity
              style={styles.editInput}
              onPress={() => setAddGymnastEventPickerVisible(true)}
            >
              <Text style={newGymnastData.event ? styles.inputText : styles.inputPlaceholder}>
                {newGymnastData.event || 'Event'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.editInput}
              placeholder="NOC"
              placeholderTextColor="#999"
              value={newGymnastData.noc}
              onChangeText={(text) => setNewGymnastData({...newGymnastData, noc: text})}
            />

            <TextInput
              style={styles.editInput}
              placeholder="Bib"
              placeholderTextColor="#999"
              value={newGymnastData.bib}
              onChangeText={(text) => setNewGymnastData({...newGymnastData, bib: text})}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAddGymnastModalVisible(false);
                  setNewGymnastData({ numero: '', name: '', event: '', noc: '', bib: '' });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleConfirmAddGymnast}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </ModalWrapper>
      {/* Add Gymnast Event Picker Modal */}
      <ModalWrapper
        visible={addGymnastEventPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddGymnastEventPickerVisible(false)}
        elevated={true}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddGymnastEventPickerVisible(false)}
        >
          <View 
            style={styles.eventDropdownModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Select Event</Text>
            
            <ScrollView style={styles.eventOptionsScroll} showsVerticalScrollIndicator={true}>
              {getAvailableEvents().map((event) => (
                <TouchableOpacity
                  key={event}
                  style={styles.eventOption}
                  onPress={() => {
                    setNewGymnastData({...newGymnastData, event});
                    setAddGymnastEventPickerVisible(false);
                  }}
                >
                  <Text style={styles.eventOptionText}>{event}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.eventCancelButton}
              onPress={() => setAddGymnastEventPickerVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ModalWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#004aad',
    fontWeight: 'bold',
  },
  titleContainer: {
    marginRight: 8,
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  topBarSubtitle: {
    fontSize: 10,
    color: '#666',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    width: 70,
  },
  searchEventButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchEventText: {
    fontSize: 11,
    color: '#333',
  },
  spacer: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
    gap: 4,
  },
  deleteActionButton: {
    borderColor: '#d32f2f',
    backgroundColor: '#fff0f0',
  },
  actionButtonIcon: {
    fontSize: 14,
  },
  actionButtonLabel: {
    fontSize: 10,
    color: '#333',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  tableCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#004aad',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#003380',
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  starredRow: {
    backgroundColor: '#fffde7', // Mild yellow highlight for starred gymnasts
  },
  highlightedRow: {
    backgroundColor: '#ffcccc',
  },
  selectedRow: {
    backgroundColor: '#e3f2fd',
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  checkboxColumn: {
    width: 40,
  },
  checkbox: {
    fontSize: 18,
    textAlign: 'center',
  },
  noColumn: {
    width: 50,
  },
  gymnastColumn: {
    flex: 2,
  },
  eventColumn: {
    flex: 1.5,
  },
  nocColumn: {
    flex: 1,
  },
  bibColumn: {
    flex: 1,
  },
  bottomButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  startButton: {
    backgroundColor: '#004aad',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButtonSmaller: {
    flex: 1,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  judgingButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomActionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cancelDeleteButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#999',
  },
  confirmDeleteButton: {
    backgroundColor: '#d32f2f',
  },
  continueButton: {
    backgroundColor: '#00aa44',
  },
  cancelDeleteText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
  },
  editModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#999',
  },
  saveButton: {
    backgroundColor: '#004aad',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '70%',
    maxWidth: 300,
  },
  eventOptionsScroll: {
    maxHeight: height * 0.45,
  },
  eventOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  eventOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  eventCancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  addGymnastModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 450,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  inputPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
});
