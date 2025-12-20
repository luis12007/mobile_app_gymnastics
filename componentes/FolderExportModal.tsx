import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  useWindowDimensions
} from 'react-native';
import { Folder, getRootFolders, getAllFolders } from '../lib/database';
import { exportFolders } from '../lib/folderImportExport';

interface FolderExportModalProps {
  visible: boolean;
  onClose: () => void;
  currentFolderId?: number | null; // null = vista raíz
}

export default function FolderExportModal({ visible, onClose, currentFolderId }: FolderExportModalProps) {
  const { width, height } = useWindowDimensions();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    if (visible) {
      loadFolders();
      setSelectedFolders(new Set());
    }
  }, [visible, currentFolderId]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      let folderList: Folder[];
      
      if (currentFolderId === null || currentFolderId === undefined) {
        // Vista raíz: mostrar todos los folders raíz
        folderList = await getRootFolders();

        // Fallback: some databases may not mark root folders as NULL/0 consistently.
        // If root comes back empty but there are folders, show all so export still works.
        if (folderList.length === 0) {
          folderList = await getAllFolders();
        }
      } else {
        // Vista de folder específico: mostrar todos los folders
        // (para permitir exportar cualquier folder desde cualquier nivel)
        folderList = await getAllFolders();
      }
      
      setFolders(folderList);
    } catch (error) {
      console.error('Error cargando folders:', error);
      Alert.alert('Error', 'Could not load folders.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolderSelection = (folderId: number) => {
    const newSelection = new Set(selectedFolders);
    if (newSelection.has(folderId)) {
      newSelection.delete(folderId);
    } else {
      newSelection.add(folderId);
    }
    setSelectedFolders(newSelection);
  };

  const handleExport = async () => {
    if (selectedFolders.size === 0) {
      Alert.alert('Selection required', 'Please select at least one folder to export.');
      return;
    }

    Alert.alert(
      'Confirm Export',
      `Do you want to export ${selectedFolders.size} folder(s) with all contents?\n\nThis will include:\n• All subfolders\n• All competitions\n• All gymnasts\n• All images\n• All whiteboard traces`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              setExporting(true);
              setExportProgress(0);
              setExportMessage('Starting...');

              await exportFolders(
                Array.from(selectedFolders),
                (progress, message) => {
                  setExportProgress(progress);
                  setExportMessage(message);
                }
              );

              Alert.alert(
                'Export Successful!',
                'Data was exported successfully.',
                [{ text: 'OK', onPress: () => onClose() }]
              );
            } catch (error) {
              console.error('Error en exportación:', error);
              Alert.alert(
                'Error',
                `Could not complete the export:\n${error instanceof Error ? error.message : 'Unknown error'}`
              );
            } finally {
              setExporting(false);
              setExportProgress(0);
              setExportMessage('');
            }
          }
        }
      ]
    );
  };

  const selectAll = () => {
    setSelectedFolders(new Set(folders.map(f => f.id)));
  };

  const deselectAll = () => {
    setSelectedFolders(new Set());
  };

  const renderFolder = ({ item }: { item: Folder }) => {
    const isSelected = selectedFolders.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.folderItem, isSelected && styles.folderItemSelected]}
        onPress={() => toggleFolderSelection(item.id)}
        disabled={exporting}
      >
        <View style={styles.folderIcon}>
          <Text style={styles.folderIconText}>📁</Text>
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderTitle}>{item.titulo}</Text>
          {item.descripcion ? (
            <Text style={styles.folderDescription} numberOfLines={1}>
              {item.descripcion}
            </Text>
          ) : null}
          <Text style={styles.folderDate}>
            {new Date(item.fecha_creacion).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={exporting ? undefined : onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            {
              width: width * 0.9,
              height: Math.min(Math.max(420, height * 0.8), 720),
              maxHeight: height * 0.9,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Export Folders</Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={exporting}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de folders */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading folders...</Text>
            </View>
          ) : exporting ? (
            <View style={styles.exportingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.exportingTitle}>Exporting...</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${exportProgress}%` }]} />
              </View>
              <Text style={styles.exportingMessage}>{exportMessage}</Text>
              <Text style={styles.exportingProgress}>{exportProgress}%</Text>
            </View>
          ) : folders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No folders available to export</Text>
            </View>
          ) : (
            <FlatList
              data={folders}
              renderItem={renderFolder}
              keyExtractor={(item) => item.id.toString()}
              style={styles.folderList}
              contentContainerStyle={styles.folderListContent}
              ListHeaderComponent={
                <>
                  <View style={styles.instructions}>
                    <Text style={styles.instructionsText}>
                      Select the folders you want to export. All contents will be exported, including subfolders, competitions, and gymnasts.
                    </Text>
                  </View>
                  {!exporting && (
                    <View style={styles.quickActions}>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={selectAll}
                        disabled={loading}
                      >
                        <Text style={styles.quickActionText}>Select All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={deselectAll}
                        disabled={loading}
                      >
                        <Text style={styles.quickActionText}>Deselect All</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              }
            />
          )}

          {/* Footer con contador y botón de exportar */}
          {!exporting && !loading && (
            <View style={styles.footer}>
              <Text style={styles.selectionCount}>
                {selectedFolders.size} folder(s) selected
              </Text>
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  selectedFolders.size === 0 && styles.exportButtonDisabled
                ]}
                onPress={handleExport}
                disabled={selectedFolders.size === 0}
              >
                <Text style={styles.exportButtonText}>
                  Export
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    maxWidth: 600,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  instructions: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  exportingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  exportingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  exportingMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  exportingProgress: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  folderList: {
    flex: 1,
  },
  folderListContent: {
    padding: 12,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  folderItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  folderIcon: {
    marginRight: 12,
  },
  folderIconText: {
    fontSize: 32,
  },
  folderInfo: {
    flex: 1,
  },
  folderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  folderDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  folderDate: {
    fontSize: 12,
    color: '#999',
  },
  checkboxContainer: {
    marginLeft: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  selectionCount: {
    fontSize: 14,
    color: '#666',
  },
  exportButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
