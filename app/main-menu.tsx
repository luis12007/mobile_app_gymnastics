import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, StatusBar, Platform, ScrollView, Dimensions, FlatList, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { getDiscipline, createFolder, getRootFolders, Folder, deleteFolder, updateFolder, swapFolderPositions, moveFolderIntoFolder, getSubfolders, getFolderById } from '../lib/database';
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
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
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

  // Action menu modal (appears immediately after long press)
  const [longPressMenuVisible, setLongPressMenuVisible] = useState(false);
  const [longPressedFolder, setLongPressedFolder] = useState<Folder | null>(null);

  // Folder navigation modal for "Move to another folder"
  const [folderNavVisible, setFolderNavVisible] = useState(false);
  const [navFolders, setNavFolders] = useState<Folder[]>([]);
  const [navPath, setNavPath] = useState<Folder[]>([]); // breadcrumb for navigation
  const [currentNavFolderId, setCurrentNavFolderId] = useState<number | null>(null);

  // Bulk selection mode
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [bulkSelectedItems, setBulkSelectedItems] = useState<Set<number>>(new Set());

  // Confirmation toast state
  const [confirmationToast, setConfirmationToast] = useState<{ visible: boolean; message: string; isError: boolean }>({ visible: false, message: '', isError: false });
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  
  

  useEffect(() => {
    const validateAccess = async () => {
      try {
        const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
        const activeEntitlements = customerInfo.entitlements.active ?? {};
        const primaryEntitlement = activeEntitlements['Gym Judge Pro'] ?? Object.values(activeEntitlements)[0];

        console.log('[RC] main-menu access check:', {
          originalAppUserId: customerInfo.originalAppUserId,
          activeEntitlements: Object.keys(activeEntitlements),
          isSandbox: Boolean(primaryEntitlement?.isSandbox),
          store: primaryEntitlement?.store,
          periodType: primaryEntitlement?.periodType,
          ownershipType: primaryEntitlement?.ownershipType,
        });

        if (!primaryEntitlement || !primaryEntitlement.isActive || primaryEntitlement.isSandbox) {
          console.log('[RC] main-menu denied. Redirecting to paywall.');
          router.replace('/');
          return;
        }

        await loadDiscipline();
        await loadFolders();
      } catch (error) {
        console.error('Error validating RevenueCat access in main menu:', error);
        router.replace('/');
      } finally {
        setIsCheckingAccess(false);
      }
    };

    validateAccess();
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

  // Long press shows action menu immediately
  const handleLongPress = (folder: Folder) => {
    if (deleteMode || editMode) return;
    
    longPressTriggeredRef.current = true;
    setLongPressedFolder(folder);
    setLongPressMenuVisible(true);
  };

  // Action menu handlers
  const handleMoveToFolder = async () => {
    setLongPressMenuVisible(false);
    // Load root folders for navigation
    const rootFolders = await getRootFolders();
    // Filter out the folder being moved
    const filteredFolders = rootFolders.filter(f => f.id !== longPressedFolder?.id);
    setNavFolders(filteredFolders);
    setNavPath([]);
    setCurrentNavFolderId(null);
    setFolderNavVisible(true);
  };

  const handleMoveBulk = () => {
    setLongPressMenuVisible(false);
    setBulkSelectMode(true);
    // Pre-select the long pressed folder
    if (longPressedFolder) {
      setBulkSelectedItems(new Set([longPressedFolder.id]));
    }
  };

  const handleExchangeMode = () => {
    setLongPressMenuVisible(false);
    setReorderMode(true);
    setSelectedFolderForReorder(longPressedFolder);
  };

  const handleCancelLongPressMenu = () => {
    setLongPressMenuVisible(false);
    setLongPressedFolder(null);
    longPressTriggeredRef.current = false;
  };

  // Folder navigation handlers
  const navigateToSubfolder = async (folder: Folder) => {
    const subfolders = await getSubfolders(folder.id);
    // Filter out the folder being moved (and bulk selected folders)
    const excludeIds = bulkSelectMode 
      ? Array.from(bulkSelectedItems) 
      : (longPressedFolder ? [longPressedFolder.id] : []);
    const filteredSubfolders = subfolders.filter(f => !excludeIds.includes(f.id));
    setNavFolders(filteredSubfolders);
    setNavPath([...navPath, folder]);
    setCurrentNavFolderId(folder.id);
  };

  const navigateBack = async () => {
    if (navPath.length === 0) return;
    
    const newPath = [...navPath];
    newPath.pop();
    setNavPath(newPath);
    
    if (newPath.length === 0) {
      // Back to root
      const rootFolders = await getRootFolders();
      const excludeIds = bulkSelectMode 
        ? Array.from(bulkSelectedItems) 
        : (longPressedFolder ? [longPressedFolder.id] : []);
      const filteredFolders = rootFolders.filter(f => !excludeIds.includes(f.id));
      setNavFolders(filteredFolders);
      setCurrentNavFolderId(null);
    } else {
      // Go to parent folder
      const parentFolder = newPath[newPath.length - 1];
      const subfolders = await getSubfolders(parentFolder.id);
      const excludeIds = bulkSelectMode 
        ? Array.from(bulkSelectedItems) 
        : (longPressedFolder ? [longPressedFolder.id] : []);
      const filteredSubfolders = subfolders.filter(f => !excludeIds.includes(f.id));
      setNavFolders(filteredSubfolders);
      setCurrentNavFolderId(parentFolder.id);
    }
  };

  const selectDestinationFolder = async () => {
    try {
      if (bulkSelectMode) {
        // Move all bulk selected folders
        for (const folderId of bulkSelectedItems) {
          if (currentNavFolderId) {
            await moveFolderIntoFolder(folderId, currentNavFolderId);
          }
        }
        showToast(`Moved ${bulkSelectedItems.size} folder(s) successfully`);
        setBulkSelectMode(false);
        setBulkSelectedItems(new Set());
      } else if (longPressedFolder && currentNavFolderId) {
        await moveFolderIntoFolder(longPressedFolder.id, currentNavFolderId);
        showToast(`"${longPressedFolder.titulo}" moved successfully`);
      }
      
      setFolderNavVisible(false);
      setLongPressedFolder(null);
      setNavPath([]);
      setCurrentNavFolderId(null);
      longPressTriggeredRef.current = false;
      await loadFolders();
      setListKey(prev => prev + 1);
    } catch (error) {
      console.error('Error moving folder:', error);
      showToast('Error: Could not move folder. ' + (error instanceof Error ? error.message : ''), true);
    }
  };

  const cancelFolderNav = () => {
    setFolderNavVisible(false);
    setLongPressedFolder(null);
    setNavPath([]);
    setCurrentNavFolderId(null);
    longPressTriggeredRef.current = false;
    if (bulkSelectMode) {
      setBulkSelectMode(false);
      setBulkSelectedItems(new Set());
    }
  };

  // Bulk selection handlers
  const toggleBulkSelection = (folderId: number) => {
    const newSelected = new Set(bulkSelectedItems);
    if (newSelected.has(folderId)) {
      newSelected.delete(folderId);
    } else {
      newSelected.add(folderId);
    }
    setBulkSelectedItems(newSelected);
  };

  const handleBulkMoveConfirm = async () => {
    if (bulkSelectedItems.size === 0) {
      Alert.alert('No selection', 'Please select at least one folder to move');
      return;
    }
    // Open folder navigation
    const rootFolders = await getRootFolders();
    const excludeIds = Array.from(bulkSelectedItems);
    const filteredFolders = rootFolders.filter(f => !excludeIds.includes(f.id));
    setNavFolders(filteredFolders);
    setNavPath([]);
    setCurrentNavFolderId(null);
    setFolderNavVisible(true);
  };

  const handleCancelBulkSelect = () => {
    setBulkSelectMode(false);
    setBulkSelectedItems(new Set());
    setListKey(prev => prev + 1); // Force re-render
    longPressTriggeredRef.current = false;
  };

  const handleFolderCardPress = (folder: Folder) => {
    // In bulk select mode, toggle selection
    if (bulkSelectMode) {
      toggleBulkSelection(folder.id);
      return;
    }

    // In reorder/exchange mode, handle exchange
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

    // Directly perform exchange (swap positions)
    try {
      console.log(`Swapping folders: ${selectedFolderForReorder.id} <-> ${targetFolder.id}`);
      await swapFolderPositions(selectedFolderForReorder.id, targetFolder.id);
      console.log('Swap completed, reloading folders...');
      showToast(`Exchanged "${selectedFolderForReorder.titulo}" with "${targetFolder.titulo}"`);
      setReorderMode(false);
      setSelectedFolderForReorder(null);
      await loadFolders();
      setListKey(prev => prev + 1);
    } catch (error) {
      console.error('Error swapping folder positions:', error);
      showToast('Error: Could not swap positions', true);
    }
  };

  const showToast = (message: string, isError: boolean = false) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setConfirmationToast({ visible: true, message, isError });
    toastTimeoutRef.current = setTimeout(() => {
      setConfirmationToast({ visible: false, message: '', isError: false });
    }, 2500);
  };

  const handleCancelReorder = () => {
    setReorderMode(false);
    setSelectedFolderForReorder(null);
    setListKey(prev => prev + 1); // Force complete FlatList re-render
    longPressTriggeredRef.current = false;
  };

  const renderFolderCard = ({ item }: { item: Folder }) => {
    const itemKey = `folder-${item.id}`;
    const isSelected = selectedItems.has(itemKey);
    const hasContent = (item.child_count ?? 0) > 0 || (item.competition_count ?? 0) > 0;
    const folderIconSource = hasContent ? IMG_FOLDER_OPEN : IMG_FOLDER_CLOSED;
    
    // Reorder mode highlighting
    const isSelectedForReorder = reorderMode && selectedFolderForReorder?.id === item.id;
    const isValidReorderTarget = reorderMode && selectedFolderForReorder && selectedFolderForReorder.id !== item.id;

    // Bulk select mode highlighting
    const isBulkSelected = bulkSelectMode && bulkSelectedItems.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.folderCard,
          isSelected && styles.selectedCard,
          isSelectedForReorder && styles.reorderSelectedCard,
          isValidReorderTarget && styles.reorderTargetCard,
          isBulkSelected && styles.bulkSelectedCard,
          bulkSelectMode && !isBulkSelected && styles.bulkSelectableCard
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
        {bulkSelectMode && (
          <View style={[styles.checkbox, isBulkSelected ? styles.checkboxSelected : styles.checkboxUnselected]}>
            <Text style={styles.checkboxText}>{isBulkSelected ? '✓' : ''}</Text>
          </View>
        )}
        {isSelectedForReorder && (
          <View style={styles.reorderBadge}>
            <Text style={styles.reorderBadgeText}>Selected</Text>
          </View>
        )}
        {isValidReorderTarget && (
          <View style={styles.reorderTargetBadge}>
            <Text style={styles.reorderTargetBadgeText}>Tap to exchange</Text>
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

  if (isCheckingAccess) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#004aad" />
        <Text style={styles.loadingText}>Verifying access...</Text>
      </SafeAreaView>
    );
  }

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
            Tap another folder to exchange positions
          </Text>
          <TouchableOpacity 
            style={styles.reorderCancelButton}
            onPress={handleCancelReorder}
          >
            <Text style={styles.reorderCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bulk Select Mode Bar */}
      {bulkSelectMode && (
        <View style={styles.bulkSelectModeBar}>
          <Text style={styles.bulkSelectModeText}>
            Select folders to move ({bulkSelectedItems.size} selected)
          </Text>
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
            extraData={[folders, listKey, bulkSelectMode, bulkSelectedItems, reorderMode, selectedFolderForReorder, deleteMode, selectedItems]}
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

      {/* Bulk Select Mode Buttons */}
      {bulkSelectMode && (
        <View style={styles.bottomButtonContainer}>
          <View style={styles.deleteButtonsContainer}>
            <TouchableOpacity 
              style={[styles.bottomButton, styles.cancelButton]}
              onPress={handleCancelBulkSelect}
            >
              <Text style={styles.bottomButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bottomButton, styles.moveButton]}
              onPress={handleBulkMoveConfirm}
            >
              <Text style={styles.bottomButtonText}>Move ({bulkSelectedItems.size})</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Long Press Action Menu Modal */}
      <ModalWrapper
        visible={longPressMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelLongPressMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelLongPressMenu}
        >
          <View 
            style={styles.actionMenuModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Move Options</Text>
            <Text style={styles.actionMenuDescription}>
              "{longPressedFolder?.titulo}"
            </Text>

            <View style={styles.actionMenuGrid}>
              <TouchableOpacity
                style={styles.actionMenuGridButton}
                onPress={handleMoveToFolder}
              >
                <Text style={styles.actionMenuGridIcon}>📂</Text>
                <Text style={styles.actionMenuGridTitle}>Move to folder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionMenuGridButton}
                onPress={handleMoveBulk}
              >
                <Text style={styles.actionMenuGridIcon}>📑</Text>
                <Text style={styles.actionMenuGridTitle}>Move bulk</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionMenuGridButton}
                onPress={handleExchangeMode}
              >
                <Text style={styles.actionMenuGridIcon}>⇄</Text>
                <Text style={styles.actionMenuGridTitle}>Exchange</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionMenuCancelButton}
              onPress={handleCancelLongPressMenu}
            >
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ModalWrapper>

      {/* Folder Navigation Modal */}
      <ModalWrapper
        visible={folderNavVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelFolderNav}
      >
        <View style={styles.folderNavOverlay}>
          <View style={styles.folderNavModal}>
            <Text style={styles.navModalTitle}>Select Destination</Text>
            
            {/* Breadcrumb */}
            <View style={styles.navBreadcrumb}>
              <TouchableOpacity 
                style={styles.navBreadcrumbItem}
                onPress={async () => {
                  const rootFolders = await getRootFolders();
                  const excludeIds = bulkSelectMode 
                    ? Array.from(bulkSelectedItems) 
                    : (longPressedFolder ? [longPressedFolder.id] : []);
                  const filteredFolders = rootFolders.filter(f => !excludeIds.includes(f.id));
                  setNavFolders(filteredFolders);
                  setNavPath([]);
                  setCurrentNavFolderId(null);
                }}
              >
                <Text style={[styles.navBreadcrumbText, navPath.length === 0 && styles.navBreadcrumbActive]}>Root</Text>
              </TouchableOpacity>
              {navPath.map((folder, index) => (
                <View key={folder.id} style={styles.navBreadcrumbItem}>
                  <Text style={styles.navBreadcrumbSeparator}> / </Text>
                  <TouchableOpacity onPress={async () => {
                    const newPath = navPath.slice(0, index + 1);
                    setNavPath(newPath);
                    const subfolders = await getSubfolders(folder.id);
                    const excludeIds = bulkSelectMode 
                      ? Array.from(bulkSelectedItems) 
                      : (longPressedFolder ? [longPressedFolder.id] : []);
                    const filteredSubfolders = subfolders.filter(f => !excludeIds.includes(f.id));
                    setNavFolders(filteredSubfolders);
                    setCurrentNavFolderId(folder.id);
                  }}>
                    <Text style={[
                      styles.navBreadcrumbText, 
                      index === navPath.length - 1 && styles.navBreadcrumbActive
                    ]} numberOfLines={1}>{folder.titulo}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Folder List */}
            <ScrollView style={styles.navFolderList}>
              {navPath.length > 0 && (
                <TouchableOpacity 
                  style={styles.navFolderItem}
                  onPress={navigateBack}
                >
                  <Text style={styles.navFolderIcon}>⬆️</Text>
                  <Text style={styles.navFolderName}>.. (Go back)</Text>
                </TouchableOpacity>
              )}
              {navFolders.map((folder) => (
                <TouchableOpacity 
                  key={folder.id}
                  style={styles.navFolderItem}
                  onPress={() => navigateToSubfolder(folder)}
                >
                  <Text style={styles.navFolderIcon}>📁</Text>
                  <Text style={styles.navFolderName} numberOfLines={1}>{folder.titulo}</Text>
                  <Text style={styles.navFolderArrow}>›</Text>
                </TouchableOpacity>
              ))}
              {navFolders.length === 0 && navPath.length > 0 && (
                <Text style={styles.navEmptyText}>No subfolders</Text>
              )}
            </ScrollView>

            {/* Current selection info */}
            <View style={styles.navSelectionInfo}>
              <Text style={styles.navSelectionText}>
                {currentNavFolderId 
                  ? `Move to: "${navPath[navPath.length - 1]?.titulo}"`
                  : 'Select a folder to move into'}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.navButtonsRow}>
              <TouchableOpacity
                style={styles.navCancelButton}
                onPress={cancelFolderNav}
              >
                <Text style={styles.navCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navConfirmButton, !currentNavFolderId && styles.navButtonDisabled]}
                onPress={selectDestinationFolder}
                disabled={!currentNavFolderId}
              >
                <Text style={styles.navConfirmButtonText}>Move Here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ModalWrapper>

      {/* Confirm Delete Modal */}
      <ModalWrapper
        visible={confirmDeleteVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <ScrollView 
          style={styles.modalOverlayScroll}
          contentContainerStyle={styles.modalOverlayScrollContent}
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
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
          </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
  modalOverlayScroll: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlayScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Math.max(height * 0.05, 20),
    paddingHorizontal: Math.max(width * 0.05, 12),
    minHeight: height,
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

  // Bulk select mode styles
  bulkSelectedCard: {
    borderWidth: 3,
    borderColor: '#2196f3',
    backgroundColor: '#e3f2fd',
    elevation: 4,
  },
  bulkSelectableCard: {
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  checkboxSelected: {
    backgroundColor: '#2196f3',
  },
  checkboxUnselected: {
    backgroundColor: '#e0e0e0',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  bulkSelectModeBar: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bulkSelectModeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  moveButton: {
    backgroundColor: '#2196f3',
  },

  // Long press action menu modal styles
  actionMenuModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Math.max(width * 0.04, 14),
    width: Math.min(width * 0.88, 340),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionMenuDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 14,
  },
  actionMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionMenuGridButton: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionMenuGridIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  actionMenuGridTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  actionMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionMenuIcon: {
    fontSize: 24,
    marginRight: 14,
    width: 32,
    textAlign: 'center',
  },
  actionMenuTextContainer: {
    flex: 1,
  },
  actionMenuButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  actionMenuButtonDesc: {
    fontSize: 12,
    color: '#888',
  },
  actionMenuCancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  actionMenuCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },

  // Folder navigation modal styles
  folderNavOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  folderNavModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    maxWidth: 420,
    maxHeight: height * 0.85,
    flex: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  navModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  navBreadcrumb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  navBreadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBreadcrumbText: {
    fontSize: 14,
    color: '#666',
  },
  navBreadcrumbActive: {
    color: '#004aad',
    fontWeight: 'bold',
  },
  navBreadcrumbSeparator: {
    color: '#999',
    marginHorizontal: 4,
  },
  navFolderList: {
    flex: 1,
    minHeight: 100,
  },
  navFolderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  navFolderIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  navFolderName: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  navFolderArrow: {
    fontSize: 20,
    color: '#999',
  },
  navEmptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  navSelectionInfo: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  navSelectionText: {
    fontSize: 12,
    color: '#1565c0',
    textAlign: 'center',
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  navCancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  navCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  navConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#004aad',
  },
  navConfirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
  },
});


