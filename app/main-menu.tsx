import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, StatusBar, Platform, ScrollView, Dimensions, FlatList, TextInput, Image, Alert } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { getDiscipline, createFolder, getRootFolders, Folder, deleteFolder, updateFolder, swapFolderPositions, moveFolderIntoFolder } from '../lib/database';
import FolderExportModal from '../componentes/FolderExportModal';
import FolderImportModal from '../componentes/FolderImportModal';

const { width, height } = Dimensions.get('window');

const IMG_FOLDER_CLOSED = require('../assets/images/folder.png');
const IMG_FOLDER_OPEN = require('../assets/images/open-folder.png');

// On iOS, replace Modal with an absolute-positioned View overlay
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

export default function MainMenu() {
  const router = useRouter();
  const [discipline, setDisciplineState] = useState<string>('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Reorder mode states
  const [reorderMode, setReorderMode] = useState(false);
  const [selectedFolderForReorder, setSelectedFolderForReorder] = useState<Folder | null>(null);
  const [listKey, setListKey] = useState(0);
  const longPressTriggeredRef = useRef(false);

  // Action choice modal (Exchange vs Insert) states
  const [actionChoiceVisible, setActionChoiceVisible] = useState(false);
  const [pendingTargetFolder, setPendingTargetFolder] = useState<Folder | null>(null);

  // Confirmation toast state
  const [confirmationToast, setConfirmationToast] = useState<{ visible: boolean; message: string; isError: boolean }>({ visible: false, message: '', isError: false });
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  
  

  useEffect(() => {
    loadDiscipline();
    loadFolders();
  }, []);

  const loadDiscipline = async () => {
    try {
      const currentDiscipline = await getDiscipline();
      setDisciplineState(currentDiscipline);
    } catch (error) {
      console.error('Error al cargar disciplina:', error);
    }
  };

  const loadFolders = async () => {
    try {
      console.log('Loading root folders...');
      const rootFolders = await getRootFolders();
      console.log('Root folders loaded:', rootFolders.length, rootFolders.map(f => ({ id: f.id, titulo: f.titulo, display_order: (f as any).display_order })));
      setFolders(rootFolders);
    } catch (error) {
      console.error('Error al cargar carpetas:', error);
    }
  };

  const handleBack = () => {
    router.push('/discipline-select?mode=change');
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleMenuAction = (action: string) => {
    console.log(`Acción seleccionada: ${action}`);
    setMenuVisible(false);
    
    if (action === 'create') {
      setCreateModalVisible(true);
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
      if (editingFolder) {
        await updateFolder(editingFolder.id, folderName.trim(), folderDescription.trim());
        console.log('Folder updated successfully');
      } else {
        await createFolder(folderName.trim(), folderDescription.trim());
        console.log('Folder created successfully');
      }
      setFolderName('');
      setFolderDescription('');
      setEditingFolder(null);
      setCreateModalVisible(false);
      await loadFolders();
    } catch (error) {
      console.error('Error saving folder:', error);
      alert('Error saving folder');
    }
  };

  const handleFolderClick = (folder: Folder) => {
    if (deleteMode) {
      toggleSelection(folder.id);
    } else if (editMode) {
      setEditingFolder(folder);
      setFolderName(folder.titulo);
      setFolderDescription(folder.descripcion || '');
      setCreateModalVisible(true);
      setEditMode(false);
    } else {
      router.push(`/folder/${folder.id}`);
    }
  };

  const toggleSelection = (id: number) => {
    const key = `folder-${id}`;
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
      alert('Please select at least one folder to delete');
      return;
    }
    setConfirmDeleteVisible(true);
  };

  const handleDeleteConfirmed = async () => {
    try {
      const deletePromises: Promise<void>[] = [];
      
      selectedItems.forEach(key => {
        const [, idStr] = key.split('-');
        const id = parseInt(idStr);
        deletePromises.push(deleteFolder(id));
      });
      
      await Promise.all(deletePromises);
      
      console.log(`Deleted ${selectedItems.size} folders`);
      setConfirmDeleteVisible(false);
      setDeleteMode(false);
      setSelectedItems(new Set());
      await loadFolders();
    } catch (error) {
      console.error('Error deleting folders:', error);
      alert('Error deleting folders. Please try again.');
    }
  };

  // Reorder functions
  const handleLongPress = (folder: Folder) => {
    if (deleteMode || editMode) return;
    
    longPressTriggeredRef.current = true;
    setReorderMode(true);
    setSelectedFolderForReorder(folder);
  };

  const handleFolderCardPress = (folder: Folder) => {
    // In reorder mode, always handle the reorder select
    if (reorderMode) {
      longPressTriggeredRef.current = false;
      handleReorderSelect(folder);
      return;
    }
    
    // If long press was just triggered, don't navigate
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    
    handleFolderClick(folder);
  };

  const handleReorderSelect = async (targetFolder: Folder) => {
    if (!selectedFolderForReorder || selectedFolderForReorder.id === targetFolder.id) {
      return;
    }

    // Show action choice modal: Exchange or Insert
    setPendingTargetFolder(targetFolder);
    setActionChoiceVisible(true);
  };

  const showToast = (message: string, isError: boolean = false) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setConfirmationToast({ visible: true, message, isError });
    toastTimeoutRef.current = setTimeout(() => {
      setConfirmationToast({ visible: false, message: '', isError: false });
    }, 2500);
  };

  const handleActionExchange = async () => {
    setActionChoiceVisible(false);
    if (!selectedFolderForReorder || !pendingTargetFolder) return;

    try {
      console.log(`Swapping folders: ${selectedFolderForReorder.id} <-> ${pendingTargetFolder.id}`);
      await swapFolderPositions(selectedFolderForReorder.id, pendingTargetFolder.id);
      console.log('Swap completed, reloading folders...');
      setReorderMode(false);
      setSelectedFolderForReorder(null);
      setPendingTargetFolder(null);
      await loadFolders();
      setListKey(prev => prev + 1);
      console.log('Folders reloaded');
    } catch (error) {
      console.error('Error swapping folder positions:', error);
      Alert.alert('Error', 'Could not swap positions. Please try again.');
    }
  };

  const handleActionInsert = async () => {
    setActionChoiceVisible(false);
    if (!selectedFolderForReorder || !pendingTargetFolder) return;

    try {
      console.log(`Inserting folder ${selectedFolderForReorder.id} into folder ${pendingTargetFolder.id}`);
      await moveFolderIntoFolder(selectedFolderForReorder.id, pendingTargetFolder.id);
      setReorderMode(false);
      setSelectedFolderForReorder(null);
      setPendingTargetFolder(null);
      await loadFolders();
      setListKey(prev => prev + 1);
      showToast(`"${selectedFolderForReorder.titulo}" moved into "${pendingTargetFolder.titulo}"`);
    } catch (error) {
      console.error('Error inserting folder:', error);
      showToast('Error: Could not move folder. ' + (error instanceof Error ? error.message : ''), true);
      setReorderMode(false);
      setSelectedFolderForReorder(null);
      setPendingTargetFolder(null);
    }
  };

  const handleActionCancel = () => {
    setActionChoiceVisible(false);
    setPendingTargetFolder(null);
  };

  const handleCancelReorder = () => {
    setReorderMode(false);
    setSelectedFolderForReorder(null);
    setListKey(prev => prev + 1); // Force complete FlatList re-render
  };

  const renderFolderCard = ({ item }: { item: Folder }) => {
    const itemKey = `folder-${item.id}`;
    const isSelected = selectedItems.has(itemKey);
    const hasContent = (item.child_count ?? 0) > 0 || (item.competition_count ?? 0) > 0;
    const folderIconSource = hasContent ? IMG_FOLDER_OPEN : IMG_FOLDER_CLOSED;
    
    // Reorder mode highlighting
    const isSelectedForReorder = reorderMode && selectedFolderForReorder?.id === item.id;
    const isValidReorderTarget = reorderMode && selectedFolderForReorder && selectedFolderForReorder.id !== item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.folderCard,
          isSelected && styles.selectedCard,
          isSelectedForReorder && styles.reorderSelectedCard,
          isValidReorderTarget && styles.reorderTargetCard
        ]} 
        onPress={() => handleFolderCardPress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={2000}
      >
        {deleteMode && (
          <View style={styles.checkbox}>
            <Text style={styles.checkboxText}>{isSelected ? '✓' : ''}</Text>
          </View>
        )}
        {isSelectedForReorder && (
          <View style={styles.reorderBadge}>
            <Text style={styles.reorderBadgeText}>Selected</Text>
          </View>
        )}
        {isValidReorderTarget && (
          <View style={styles.reorderTargetBadge}>
            <Text style={styles.reorderTargetBadgeText}>Tap to swap</Text>
          </View>
        )}
        <View style={styles.folderImage}>
          <Image source={folderIconSource} style={styles.folderIconImage} resizeMode="contain" />
        </View>
        <View style={styles.cardSeparator} />
        <View style={styles.folderInfo}>
          <Text style={styles.folderTitle} numberOfLines={1}>{item.titulo}</Text>
          <Text style={styles.folderDescription} numberOfLines={2}>
            {item.descripcion || 'No description'}
          </Text>
          <Text style={styles.folderDate}>
            {new Date(item.fecha_creacion).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
          <Text style={styles.topBarTitle}>Main Menu</Text>
          <Text style={styles.topBarSubtitle}>{discipline}</Text>
        </View>
        
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
            Tap another folder to swap positions
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
        {folders.length === 0 ? (
          <Text style={styles.contentText}>No folders. Create a new folder using the menu.</Text>
        ) : (
          <FlatList
            data={folders}
            renderItem={renderFolderCard}
            keyExtractor={(item) => `folder-${item.id}-${(item as any).display_order || item.id}`}
            numColumns={3}
            key={`grid-${listKey}`}
            extraData={[folders, listKey]}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={(Platform.OS === 'ios' && !Platform.isPad) ? { width: '100%' } : undefined}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Delete Mode Buttons */}
      {deleteMode && (
        <View style={styles.bottomButtonContainer}>
          <View style={styles.deleteButtonsContainer}>
            <TouchableOpacity 
              style={[styles.bottomButton, styles.cancelButton]}
              onPress={handleCancelDelete}
            >
              <Text style={styles.bottomButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bottomButton, styles.deleteButton]}
              onPress={handleConfirmDeleteClick}
            >
              <Text style={styles.bottomButtonText}>Delete ({selectedItems.size})</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Confirm Delete Modal */}
      <ModalWrapper
        visible={confirmDeleteVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.modalTitle}>Confirm Delete</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete {selectedItems.size} {selectedItems.size === 1 ? 'folder' : 'folders'}?
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
      </ModalWrapper>

      {/* Create Folder Modal */}
      <ModalWrapper
        visible={createModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCreateModalVisible(false)}
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
              style={[styles.input, (Platform.OS === 'ios' && !Platform.isPad) ? null : styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#999"
              value={folderDescription}
              onChangeText={setFolderDescription}
              multiline={!(Platform.OS === 'ios' && !Platform.isPad)}
              numberOfLines={(Platform.OS === 'ios' && !Platform.isPad) ? 1 : 3}
            />
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => {
                  setCreateModalVisible(false);
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
      </ModalWrapper>

      {/* Hamburger Menu Modal */}
      <ModalWrapper
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
      </ModalWrapper>

      {/* Folder Export Modal */}
      <FolderExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />

      {/* Folder Import Modal */}
      <FolderImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        currentFolderId={null}
        onImportComplete={() => {
          setImportModalVisible(false);
          loadFolders();
        }}
      />

      {/* Action Choice Modal: Exchange vs Insert */}
      <ModalWrapper
        visible={actionChoiceVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleActionCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionChoiceModal}>
            <Text style={styles.modalTitle}>Move Action</Text>
            <Text style={styles.actionChoiceDescription}>
              What would you like to do with "{selectedFolderForReorder?.titulo}"?
            </Text>

            <TouchableOpacity
              style={styles.actionChoiceButton}
              onPress={handleActionExchange}
            >
              <Text style={styles.actionChoiceIcon}>⇄</Text>
              <View style={styles.actionChoiceTextContainer}>
                <Text style={styles.actionChoiceButtonTitle}>Exchange</Text>
                <Text style={styles.actionChoiceButtonDesc}>Swap positions with "{pendingTargetFolder?.titulo}"</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionChoiceButton, styles.actionChoiceInsertButton]}
              onPress={handleActionInsert}
            >
              <Text style={styles.actionChoiceIcon}>📂</Text>
              <View style={styles.actionChoiceTextContainer}>
                <Text style={styles.actionChoiceButtonTitle}>Move to folder</Text>
                <Text style={styles.actionChoiceButtonDesc}>Move inside "{pendingTargetFolder?.titulo}"</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionChoiceCancelButton}
              onPress={handleActionCancel}
            >
              <Text style={styles.actionChoiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ModalWrapper>

      {/* Confirmation Toast */}
      {confirmationToast.visible && (
        <View style={[
          styles.toastContainer,
          confirmationToast.isError ? styles.toastError : styles.toastSuccess
        ]}>
          <Text style={styles.toastIcon}>{confirmationToast.isError ? '✗' : '✓'}</Text>
          <Text style={styles.toastText} numberOfLines={2}>{confirmationToast.message}</Text>
        </View>
      )}
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  topBarSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
    padding: (Platform.OS === 'ios' && !Platform.isPad) ? 2 : 12,
  },
  folderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    ...(Platform.OS === 'ios' && !Platform.isPad
      ? { flex: 1, maxWidth: '32%' }
      : { width: (width - 48) / 3 }),
    height: (Platform.OS === 'ios' && !Platform.isPad)
      ? Math.max(86, Math.min(120, ((width - 20) / 3) * 0.55))
      : Math.max(96, Math.min(140, ((width - 48) / 3) * 0.6)),
    margin: (Platform.OS === 'ios' && !Platform.isPad) ? 2 : 6,
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
  reorderSelectedCard: {
    borderWidth: 3,
    borderColor: '#ff9800',
    backgroundColor: '#fff3e0',
    elevation: 6,
  },
  reorderTargetCard: {
    borderWidth: 2,
    borderColor: '#4caf50',
    borderStyle: 'dashed',
    backgroundColor: '#e8f5e9',
  },
  reorderBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#ff9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  reorderBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  reorderTargetBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#4caf50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  reorderTargetBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
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
  cardSeparator: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  folderIcon: {
    fontSize: Math.min(width * 0.08, 40),
  },
  folderIconImage: {
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
  folderDate: {
    fontSize: Math.min(width * 0.025, 10),
    color: '#999',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'center',
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
    backgroundColor: '#e4e3e3ff',
  },
  cancelButtonText: {
    fontSize: Math.min(width * 0.04, 16),
    color: '#004aad',
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  bottomButtonContainer: {
    backgroundColor: '#fff',
    paddingVertical: Math.max(height * 0.02, 16),
    paddingHorizontal: Math.max(width * 0.04, 16),
    margin: Math.max(width * 0.03, 12),
    borderRadius: 12,
  },
  deleteButtonsContainer: {
    flexDirection: 'row',
    gap: Math.max(width * 0.03, 12),
  },
  bottomButton: {
    paddingVertical: Math.max(height * 0.02, 18),
    minHeight: Math.max(height * 0.07, 56),
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
  },
  bottomButtonText: {
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
  // Action Choice Modal styles
  actionChoiceModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionChoiceDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionChoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0d8f0',
  },
  actionChoiceInsertButton: {
    backgroundColor: '#f0fff4',
    borderColor: '#b8e6c8',
  },
  actionChoiceIcon: {
    fontSize: 24,
    marginRight: 14,
    width: 32,
    textAlign: 'center',
  },
  actionChoiceTextContainer: {
    flex: 1,
  },
  actionChoiceButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  actionChoiceButtonDesc: {
    fontSize: 12,
    color: '#888',
  },
  actionChoiceCancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  actionChoiceCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  // Toast styles
  toastContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 2000,
  },
  toastSuccess: {
    backgroundColor: '#2e7d32',
  },
  toastError: {
    backgroundColor: '#c62828',
  },
  toastIcon: {
    fontSize: 20,
    color: '#fff',
    marginRight: 12,
    fontWeight: 'bold',
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});


