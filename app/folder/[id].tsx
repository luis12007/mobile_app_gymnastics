import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, StatusBar, Platform, ScrollView, Dimensions, FlatList, TextInput, Image, Alert } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDiscipline, getSubfolders, getFolderById, getFolderPath, Folder, createFolder, createCompetition, getCompetitionsByFolder, Competition, deleteFolder, deleteCompetition, updateFolder, updateCompetition, swapItemPositions, normalizeDisplayOrderInFolder } from '../../lib/database';
import FolderExportModal from '../../componentes/FolderExportModal';
import FolderImportModal from '../../componentes/FolderImportModal';
import CustomNumberPadOptimized from '../../componentes/CustomNumberPadOptimized';

const IMG_FOLDER_CLOSED = require('../../assets/images/folder.png');
const IMG_FOLDER_OPEN = require('../../assets/images/open-folder.png');
const IMG_GYMNAST_MAG = require('../../assets/images/gymnast1.png');
const IMG_GYMNAST_WAG = require('../../assets/images/gymnast2.png');

const { width, height } = Dimensions.get('window');

export default function FolderView() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [discipline, setDisciplineState] = useState<string>('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [createFolderModalVisible, setCreateFolderModalVisible] = useState(false);
  const [createCompetitionModalVisible, setCreateCompetitionModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Folder[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [combinedItems, setCombinedItems] = useState<Array<{ type: 'folder' | 'competition', data: Folder | Competition }>>([]);
  
  // Folder creation
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  
  // Competition creation
  const [competitionName, setCompetitionName] = useState('');
  const [competitionDescription, setCompetitionDescription] = useState('');
  const [competitionGender, setCompetitionGender] = useState<'MAG' | 'WAG'>('MAG');
  const [competitionParticipants, setCompetitionParticipants] = useState('');
  // Estado para mostrar el pad de participantes
  const [showParticipantsPad, setShowParticipantsPad] = useState(false);

  // Reorder mode states
  const [reorderMode, setReorderMode] = useState(false);
  const [selectedItemForReorder, setSelectedItemForReorder] = useState<{ type: 'folder' | 'competition', item: Folder | Competition } | null>(null);
  const [listKey, setListKey] = useState(0);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    loadDiscipline();
    loadFolderData();
  }, [id]);

  const loadDiscipline = async () => {
    try {
      const currentDiscipline = await getDiscipline();
      setDisciplineState(currentDiscipline);
      setCompetitionGender(currentDiscipline as 'MAG' | 'WAG');
    } catch (error) {
      console.error('Error loading discipline:', error);
    }
  };

  const loadFolderData = async () => {
    try {
      const folderId = parseInt(id as string);
      
      // Normalize display_order to fix any duplicates
      await normalizeDisplayOrderInFolder(folderId);
      
      // Load current folder
      const folder = await getFolderById(folderId);
      setCurrentFolder(folder);
      
      // Load breadcrumb
      const path = await getFolderPath(folderId);
      setBreadcrumb(path);
      
      // Load subfolders
      const subfolders = await getSubfolders(folderId);
      setFolders(subfolders);
      
      // Load competitions
      const comps = await getCompetitionsByFolder(folderId);
      setCompetitions(comps);
      
      // Combine folders and competitions, then sort by display_order
      const combined = [
        ...subfolders.map(f => ({ type: 'folder' as const, data: f })),
        ...comps.map(c => ({ type: 'competition' as const, data: c }))
      ];
      
      // Sort by display_order (or id as fallback)
      combined.sort((a, b) => {
        const orderA = (a.data as any).display_order ?? a.data.id;
        const orderB = (b.data as any).display_order ?? b.data.id;
        return orderA - orderB;
      });
      
      setCombinedItems(combined);
    } catch (error) {
      console.error('Error loading folder data:', error);
    }
  };

  const handleBack = () => {
    // Ir al folder padre o al root
    if (currentFolder?.parent_folder_id) {
      router.push(`/folder/${currentFolder.parent_folder_id}`);
    } else {
      router.push('/main-menu');
    }
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleMenuAction = (action: string) => {
    console.log(`Action selected: ${action}`);
    setMenuVisible(false);
    
    if (action === 'create') {
      setCreateFolderModalVisible(true);
    } else if (action === 'edit') {
      setEditMode(true);
    } else if (action === 'delete') {
      setDeleteMode(true);
      setSelectedItems(new Set());
    } else if (action === 'export') {
      setExportModalVisible(true);
    } else if (action === 'import') {
      setImportModalVisible(true);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    try {
      const folderId = parseInt(id as string);
      if (editingFolder) {
        await updateFolder(editingFolder.id, folderName.trim(), folderDescription.trim());
        console.log('Folder updated successfully');
      } else {
        await createFolder(folderName.trim(), folderDescription.trim(), folderId);
        console.log('Folder created successfully');
      }
      setFolderName('');
      setFolderDescription('');
      setEditingFolder(null);
      setCreateFolderModalVisible(false);
      await loadFolderData();
    } catch (error) {
      console.error('Error saving folder:', error);
      alert('Error saving folder');
    }
  };

  const handleCreateCompetition = async () => {
    if (!competitionName.trim()) {
      alert('Please enter a competition name');
      return;
    }

    if (!competitionParticipants.trim()) {
      alert('Please enter the number of participants');
      return;
    }

    try {
      const folderId = parseInt(id as string);
      const participants = parseInt(competitionParticipants);
      const genderBoolean = competitionGender === 'MAG';
      
      if (editingCompetition) {
        await updateCompetition(editingCompetition.id, {
          name: competitionName.trim(),
          description: competitionDescription.trim(),
          gender: genderBoolean,
          number_of_participants: participants
        });
        console.log('Competition updated successfully');
      } else {
        const currentDate = new Date().toISOString().split('T')[0];
        await createCompetition(
          competitionName.trim(),
          competitionDescription.trim(),
          currentDate,
          genderBoolean,
          folderId,
          participants
        );
        console.log('Competition created successfully');
      }
      
      setCompetitionName('');
      setCompetitionDescription('');
      setCompetitionParticipants('');
      setEditingCompetition(null);
      setCreateCompetitionModalVisible(false);
      await loadFolderData();
    } catch (error) {
      console.error('Error saving competition:', error);
      alert('Error saving competition');
    }
  };

  const handleFolderClick = (folder: Folder) => {
    if (deleteMode) {
      toggleSelection('folder', folder.id);
    } else if (editMode) {
      setEditingFolder(folder);
      setFolderName(folder.titulo);
      setFolderDescription(folder.descripcion || '');
      setCreateFolderModalVisible(true);
      setEditMode(false);
    } else {
      router.push(`/folder/${folder.id}`);
    }
  };

  const handleCompetitionClick = (competition: Competition) => {
    if (deleteMode) {
      toggleSelection('competition', competition.id);
    } else if (editMode) {
      setEditingCompetition(competition);
      setCompetitionName(competition.name);
      setCompetitionDescription(competition.description || '');
      setCompetitionParticipants(competition.number_of_participants.toString());
      setCompetitionGender(competition.gender ? 'MAG' : 'WAG');
      setCreateCompetitionModalVisible(true);
      setEditMode(false);
    } else {
      router.push(`/start-judging?competitionId=${competition.id}`);
    }
  };

  const toggleSelection = (type: 'folder' | 'competition', id: number) => {
    const key = `${type}-${id}`;
    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedItems(newSelected);
  };

  const handleCancelDelete = () => {
    setDeleteMode(false);
    setSelectedItems(new Set());
  };

  const handleConfirmDeleteClick = () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item to delete');
      return;
    }
    setConfirmDeleteVisible(true);
  };

  const handleDeleteConfirmed = async () => {
    try {
      const deletePromises: Promise<void>[] = [];
      
      selectedItems.forEach(key => {
        const [type, idStr] = key.split('-');
        const id = parseInt(idStr);
        
        if (type === 'folder') {
          deletePromises.push(deleteFolder(id));
        } else if (type === 'competition') {
          deletePromises.push(deleteCompetition(id));
        }
      });
      
      await Promise.all(deletePromises);
      
      console.log(`Deleted ${selectedItems.size} items`);
      setConfirmDeleteVisible(false);
      setDeleteMode(false);
      setSelectedItems(new Set());
      await loadFolderData();
    } catch (error) {
      console.error('Error deleting items:', error);
      alert('Error deleting items. Please try again.');
    }
  };

  // Reorder functions
  const handleLongPress = (type: 'folder' | 'competition', item: Folder | Competition) => {
    if (deleteMode || editMode) return;
    
    longPressTriggeredRef.current = true;
    setReorderMode(true);
    setSelectedItemForReorder({ type, item });
  };

  const handleCardPress = (type: 'folder' | 'competition', item: Folder | Competition) => {
    // In reorder mode, always handle the reorder select
    if (reorderMode) {
      longPressTriggeredRef.current = false;
      handleReorderSelect(type, item);
      return;
    }
    
    // If long press was just triggered, don't navigate
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    
    if (type === 'folder') {
      handleFolderClick(item as Folder);
    } else {
      handleCompetitionClick(item as Competition);
    }
  };

  const handleReorderSelect = async (type: 'folder' | 'competition', targetItem: Folder | Competition) => {
    if (!selectedItemForReorder) return;
    
    // Skip if selecting the same item
    if (selectedItemForReorder.type === type && selectedItemForReorder.item.id === targetItem.id) {
      return;
    }

    try {
      await swapItemPositions(
        selectedItemForReorder.type,
        selectedItemForReorder.item.id,
        type,
        targetItem.id
      );
      setReorderMode(false);
      setSelectedItemForReorder(null);
      await loadFolderData();
      setListKey(prev => prev + 1); // Force complete FlatList re-render
    } catch (error) {
      console.error('Error swapping positions:', error);
      Alert.alert('Error', 'Could not swap positions. Please try again.');
    }
  };

  const handleCancelReorder = () => {
    setReorderMode(false);
    setSelectedItemForReorder(null);
    setListKey(prev => prev + 1); // Force complete FlatList re-render
  };

  const handleBreadcrumbClick = (folder: Folder) => {
    router.push(`/folder/${folder.id}`);
  };

  const renderCard = ({ item }: { item: { type: 'folder' | 'competition', data: Folder | Competition } }) => {
    const isFolder = item.type === 'folder';
    const data = item.data;
    const itemKey = `${item.type}-${data.id}`;
    const isSelected = selectedItems.has(itemKey);
    
    // Reorder mode highlighting - now any item can be a target
    const isReorderSelected = reorderMode && selectedItemForReorder?.type === item.type && selectedItemForReorder?.item.id === data.id;
    const isReorderTarget = reorderMode && !(selectedItemForReorder?.type === item.type && selectedItemForReorder?.item.id === data.id);
    
    if (isFolder) {
      const folder = data as Folder;
      const hasContent = (folder.child_count ?? 0) > 0 || (folder.competition_count ?? 0) > 0;
      const folderIconSource = hasContent ? IMG_FOLDER_OPEN : IMG_FOLDER_CLOSED;
      return (
        <TouchableOpacity 
          style={[
            styles.folderCard,
            isSelected && styles.selectedCard,
            isReorderSelected && styles.reorderSelectedCard,
            isReorderTarget && styles.reorderTargetCard
          ]} 
          onPress={() => handleCardPress('folder', folder)}
          onLongPress={() => handleLongPress('folder', folder)}
          delayLongPress={2000}
        >
          {deleteMode && (
            <View style={styles.checkbox}>
              <Text style={styles.checkboxText}>{isSelected ? '✓' : ''}</Text>
            </View>
          )}
          {isReorderSelected && (
            <View style={styles.reorderBadge}>
              <Text style={styles.reorderBadgeText}>Moving</Text>
            </View>
          )}
          <View style={styles.folderImage}>
            <Image source={folderIconSource} style={styles.itemIconImage} resizeMode="contain" />
          </View>
          <View style={styles.cardSeparator} />
          <View style={styles.folderInfo}>
            <Text style={styles.folderTitle} numberOfLines={1}>{folder.titulo}</Text>
            <Text style={styles.folderDescription} numberOfLines={2}>
              {folder.descripcion || 'No description'}
            </Text>
            <Text style={styles.folderDate}>
              {new Date(folder.fecha_creacion).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      );
    } else {
      const competition = data as Competition;
      const competitionIconSource = competition.gender ? IMG_GYMNAST_MAG : IMG_GYMNAST_WAG;
      return (
        <TouchableOpacity 
          style={[
            styles.folderCard,
            isSelected && styles.selectedCard,
            isReorderSelected && styles.reorderSelectedCard,
            isReorderTarget && styles.reorderTargetCard
          ]} 
          onPress={() => handleCardPress('competition', competition)}
          onLongPress={() => handleLongPress('competition', competition)}
          delayLongPress={2000}
        >
          {deleteMode && (
            <View style={styles.checkbox}>
              <Text style={styles.checkboxText}>{isSelected ? '✓' : ''}</Text>
            </View>
          )}
          {isReorderSelected && (
            <View style={styles.reorderBadge}>
              <Text style={styles.reorderBadgeText}>Moving</Text>
            </View>
          )}
          <View style={[styles.folderImage, styles.competitionImage]}>
            <Image source={competitionIconSource} style={styles.itemIconImage} resizeMode="contain" />
          </View>
          <View style={styles.cardSeparator} />
          <View style={styles.folderInfo}>
            <Text style={styles.folderTitle} numberOfLines={1}>{competition.name}</Text>
            <Text style={styles.folderDescription} numberOfLines={1}>
              {competition.description || 'No description'}
            </Text>
            <Text style={styles.competitionDetails}>
              {competition.gender ? 'MAG' : 'WAG'} • {competition.number_of_participants} participants
            </Text>
            <Text style={styles.folderDate}>
              {new Date(competition.date).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Top Bar with Breadcrumb */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <ScrollView 
          horizontal 
          style={styles.breadcrumbContainer}
          showsHorizontalScrollIndicator={false}
        >
          {breadcrumb.map((folder, index) => (
            <View key={folder.id} style={styles.breadcrumbItem}>
              <TouchableOpacity onPress={() => handleBreadcrumbClick(folder)}>
                <Text style={styles.breadcrumbText}>{folder.titulo}</Text>
              </TouchableOpacity>
              {index < breadcrumb.length - 1 && (
                <Text style={styles.breadcrumbSeparator}> / </Text>
              )}
            </View>
          ))}
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={toggleMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Reorder Mode Bar */}
      {reorderMode && (
        <View style={styles.reorderModeBar}>
          <Text style={styles.reorderModeText}>
            Tap another item to swap positions
          </Text>
          <TouchableOpacity 
            style={styles.reorderCancelButton}
            onPress={handleCancelReorder}
          >
            <Text style={styles.reorderCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content Area */}
      <View style={styles.content}>
        {combinedItems.length === 0 ? (
          <Text style={styles.contentText}>No folders or competitions. Create using the menu or button below.</Text>
        ) : (
          <FlatList
            data={combinedItems}
            renderItem={renderCard}
            keyExtractor={(item, index) => `${item.type}-${item.data.id}-${(item.data as any).display_order || item.data.id}-${index}`}
            numColumns={3}
            key={`grid-${listKey}`}
            extraData={[combinedItems, listKey]}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtonContainer}>
        {deleteMode ? (
          <View style={styles.deleteButtonsContainer}>
            <TouchableOpacity 
              style={styles.deleteCancelButton}
              onPress={handleCancelDelete}
            >
              <Text style={styles.deleteCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleConfirmDeleteClick}
            >
              <Text style={styles.deleteButtonText}>Delete ({selectedItems.size})</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.createCompetitionButton}
            onPress={() => setCreateCompetitionModalVisible(true)}
          >
            <Text style={styles.createCompetitionButtonText}>+ Create Competition</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Create Folder Modal */}
      <Modal
        visible={createFolderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCreateFolderModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCreateFolderModalVisible(false)}
        >
          <View 
            style={styles.createModalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>{editingFolder ? 'Edit Folder' : 'Create New Folder'}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Folder name"
              placeholderTextColor="#999"
              value={folderName}
              onChangeText={setFolderName}
              autoFocus
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#999"
              value={folderDescription}
              onChangeText={setFolderDescription}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => {
                  setCreateFolderModalVisible(false);
                  setFolderName('');
                  setFolderDescription('');
                  setEditingFolder(null);
                }}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.createActionButton]}
                onPress={handleCreateFolder}
              >
                <Text style={styles.createActionText}>{editingFolder ? 'Update' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        visible={confirmDeleteVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.modalTitle}>Confirm Delete</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}?
            </Text>
            <Text style={styles.warningText}>
              This action cannot be undone. Folders will be deleted along with all their contents.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancelButton]}
                onPress={() => setConfirmDeleteVisible(false)}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmDeleteButton]}
                onPress={handleDeleteConfirmed}
              >
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Competition Modal */}
      <Modal
        visible={createCompetitionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCreateCompetitionModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCreateCompetitionModalVisible(false)}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View 
              style={styles.createModalContent}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.modalTitle}>{editingCompetition ? 'Edit Competition' : 'Create New Competition'}</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Competition name"
                placeholderTextColor="#999"
                value={competitionName}
                onChangeText={setCompetitionName}
                autoFocus
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                placeholderTextColor="#999"
                value={competitionDescription}
                onChangeText={setCompetitionDescription}
                multiline
                numberOfLines={2}
              />
              
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowParticipantsPad(true)}
                activeOpacity={0.8}
              >
                <Text style={{ color: competitionParticipants ? '#333' : '#999', fontSize: 16 }}>
                  {competitionParticipants ? competitionParticipants : 'Number of participants'}
                </Text>
              </TouchableOpacity>

              {/* CustomNumberPadOptimized para participantes */}
              <CustomNumberPadOptimized
                visible={showParticipantsPad}
                value={competitionParticipants}
                onValueChange={setCompetitionParticipants}
                onClose={(finalValue: string) => {
                  setCompetitionParticipants(finalValue);
                  setShowParticipantsPad(false);
                }}
                title="Number of participants"
                allowDecimal={false}
                maxLength={4}
              />
              
              <View style={styles.genderContainer}>
                <Text style={styles.label}>Discipline:</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity 
                    style={[styles.genderButton, competitionGender === 'MAG' && styles.genderButtonActive]}
                    onPress={() => setCompetitionGender('MAG')}
                  >
                    <Text style={[styles.genderButtonText, competitionGender === 'MAG' && styles.genderButtonTextActive]}>
                      MAG
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.genderButton, competitionGender === 'WAG' && styles.genderButtonActive]}
                    onPress={() => setCompetitionGender('WAG')}
                  >
                    <Text style={[styles.genderButtonText, competitionGender === 'WAG' && styles.genderButtonTextActive]}>
                      WAG
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelActionButton]}
                  onPress={() => {
                    setCreateCompetitionModalVisible(false);
                    setCompetitionName('');
                    setCompetitionDescription('');
                    setCompetitionParticipants('');
                    setEditingCompetition(null);
                  }}
                >
                  <Text style={styles.cancelActionText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.createActionButton]}
                  onPress={handleCreateCompetition}
                >
                  <Text style={styles.createActionText}>{editingCompetition ? 'Update' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </Modal>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View 
              style={styles.modalContent}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.modalTitle}>Options</Text>
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => handleMenuAction('create')}
              >
                <Text style={styles.modalButtonIcon}>+</Text>
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => handleMenuAction('edit')}
              >
                <Text style={styles.modalButtonIcon}>✎</Text>
                <Text style={styles.modalButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => handleMenuAction('delete')}
              >
                <Text style={styles.modalButtonIcon}>🗑</Text>
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => handleMenuAction('import')}
              >
                <Text style={styles.modalButtonIcon}>📥</Text>
                <Text style={styles.modalButtonText}>Import</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => handleMenuAction('export')}
              >
                <Text style={styles.modalButtonIcon}>📤</Text>
                <Text style={styles.modalButtonText}>Export</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </Modal>

      {/* Folder Export Modal */}
      <FolderExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />

      {/* Folder Import Modal */}
      <FolderImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        currentFolderId={currentFolder?.id || null}
        onImportComplete={() => {
          setImportModalVisible(false);
          loadFolderData();
        }}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#004aad',
    fontWeight: 'bold',
  },
  breadcrumbContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 16,
    color: '#004aad',
    fontWeight: '500',
  },
  breadcrumbSeparator: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 4,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 3,
    backgroundColor: '#004aad',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 20,
    marginTop: 40,
  },
  gridContainer: {
    padding: 12,
  },
  folderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: (width - 48) / 3,
    height: Math.max(96, Math.min(140, ((width - 48) / 3) * 0.6)),
    margin: 6,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCard: {
    borderWidth: 3,
    borderColor: '#004aad',
    elevation: 4,
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#004aad',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  checkboxText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  folderImage: {
    width: '33%',
    height: '100%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  competitionImage: {
    backgroundColor: 'transparent',
  },
  cardSeparator: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  folderIcon: {
    fontSize: Math.min(width * 0.08, 40),
  },
  itemIconImage: {
    width: Math.min(width * 0.14, 72),
    height: Math.min(width * 0.14, 72),
  },
  folderInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  folderTitle: {
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  folderDescription: {
    fontSize: Math.min(width * 0.028, 11),
    color: '#666',
    marginBottom: 4,
    minHeight: 28,
  },
  competitionDetails: {
    fontSize: Math.min(width * 0.025, 10),
    color: '#004aad',
    fontWeight: '600',
    marginBottom: 2,
  },
  folderDate: {
    fontSize: Math.min(width * 0.025, 10),
    color: '#999',
  },
  bottomButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  createCompetitionButton: {
    backgroundColor: '#004aad',
    paddingVertical: Math.max(height * 0.018, 14),
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  createCompetitionButtonText: {
    color: '#fff',
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: 'bold',
  },
  deleteButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: '#e4e3e3ff',
    paddingVertical: Math.max(height * 0.018, 14),
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: Math.max(height * 0.018, 14),
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deleteCancelButtonText: {
    color: '#fff',
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Math.max(width * 0.05, 12),
    paddingVertical: Math.max(height * 0.05, 20),
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: Math.max(height * 0.02, 12),
    paddingHorizontal: Math.max(width * 0.04, 12),
    width: width > 400 ? 400 : width * 0.9,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: Math.min(width * 0.05, 20),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: Math.max(height * 0.015, 12),
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: Math.max(height * 0.012, 10),
    paddingHorizontal: Math.max(width * 0.03, 12),
    borderRadius: 10,
    marginBottom: Math.max(height * 0.01, 8),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 44,
  },
  modalButtonIcon: {
    fontSize: Math.min(width * 0.045, 18),
    marginRight: Math.max(width * 0.025, 10),
    width: Math.max(width * 0.06, 24),
    textAlign: 'center',
  },
  modalButtonText: {
    fontSize: Math.min(width * 0.04, 16),
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderColor: '#004aad',
    borderWidth: 2,
    marginTop: Math.max(height * 0.01, 6),
  },
  cancelButtonText: {
    fontSize: Math.min(width * 0.04, 16),
    color: '#004aad',
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  createModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: Math.max(height * 0.02, 20),
    paddingHorizontal: Math.max(width * 0.04, 16),
    width: width > 400 ? 400 : width * 0.9,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  genderContainer: {
    marginBottom: 12,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#004aad',
    borderColor: '#004aad',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelActionButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#999',
  },
  createActionButton: {
    backgroundColor: '#004aad',
  },
  cancelActionText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  confirmText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelButton: {
    backgroundColor: '#666',
  },
  confirmDeleteButton: {
    backgroundColor: '#d32f2f',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Reorder mode styles
  reorderModeBar: {
    flexDirection: 'row',
    backgroundColor: '#004aad',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reorderModeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  reorderCancelButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reorderCancelButtonText: {
    color: '#004aad',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reorderSelectedCard: {
    backgroundColor: '#e3f2fd',
    borderWidth: 3,
    borderColor: '#1976d2',
    transform: [{ scale: 1.02 }],
  },
  reorderTargetCard: {
    borderWidth: 2,
    borderColor: '#4caf50',
    borderStyle: 'dashed',
  },
  reorderBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  reorderBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
