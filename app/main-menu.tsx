import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, StatusBar, Platform, ScrollView, Dimensions, FlatList, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getDiscipline, createFolder, getRootFolders, Folder, deleteFolder, updateFolder } from '../lib/database';
import FolderExportModal from '../componentes/FolderExportModal';
import FolderImportModal from '../componentes/FolderImportModal';

const { width, height } = Dimensions.get('window');

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
      const rootFolders = await getRootFolders();
      setFolders(rootFolders);
    } catch (error) {
      console.error('Error al cargar carpetas:', error);
    }
  };

  const handleBack = () => {
    router.push('/discipline-select');
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

  const renderFolderCard = ({ item }: { item: Folder }) => {
    const itemKey = `folder-${item.id}`;
    const isSelected = selectedItems.has(itemKey);
    
    return (
      <TouchableOpacity 
        style={[
          styles.folderCard,
          isSelected && styles.selectedCard
        ]} 
        onPress={() => handleFolderClick(item)}
      >
        {deleteMode && (
          <View style={styles.checkbox}>
            <Text style={styles.checkboxText}>{isSelected ? '✓' : ''}</Text>
          </View>
        )}
        <View style={styles.folderImage}>
          <Text style={styles.folderIcon}>📁</Text>
        </View>
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

      {/* Content Area */}
      <View style={styles.content}>
        {folders.length === 0 ? (
          <Text style={styles.contentText}>No folders. Create a new folder using the menu.</Text>
        ) : (
          <FlatList
            data={folders}
            renderItem={renderFolderCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            key={'3-columns'}
            contentContainerStyle={styles.gridContainer}
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
      </Modal>

      {/* Create Folder Modal */}
      <Modal
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
        currentFolderId={null}
        onImportComplete={() => {
          setImportModalVisible(false);
          loadFolders();
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
    padding: 12,
  },
  folderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: (width - 48) / 3,
    margin: 6,
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
    width: '100%',
    height: ((width - 48) / 3) * 0.6,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderIcon: {
    fontSize: Math.min(width * 0.08, 40),
  },
  folderInfo: {
    padding: 8,
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
    backgroundColor: '#666',
  },
  cancelButtonText: {
    fontSize: Math.min(width * 0.04, 16),
    color: '#004aad',
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  bottomButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  deleteButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomButton: {
    paddingVertical: 16,
    borderRadius: 8,
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
});


