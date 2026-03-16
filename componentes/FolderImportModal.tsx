import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform
} from 'react-native';
import { importFolders, ImportProgress } from '../lib/folderImportExport';

interface FolderImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImportComplete: () => void; // Callback para recargar datos después de importar
  currentFolderId?: number | null; // null = importar en raíz
}

const STAGE_LABELS: Record<ImportProgress['stage'], string> = {
  folders: 'Importing Folders',
  competitions: 'Importing Competitions',
  gymnasts: 'Importing Gymnasts',
  images: 'Importing Images',
  traces: 'Importing Traces',
  complete: 'Completed!'
};

// On iOS, replace Modal with an absolute-positioned View overlay
const ModalWrapper = ({ visible, children, ...props }: any) => {
  if (Platform.OS === 'ios' && !Platform.isPad) {
    if (!visible) return null;
    return (
      <View style={iosOverlayStyle.container}>
        {children}
      </View>
    );
  }
  return (
    <Modal visible={visible} {...props}>
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

export default function FolderImportModal({ 
  visible, 
  onClose, 
  onImportComplete,
  currentFolderId 
}: FolderImportModalProps) {
  const { width, height } = useWindowDimensions();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const handleImport = async () => {
    Alert.alert(
      'Confirm Import',
      currentFolderId === null || currentFolderId === undefined
        ? 'Folders will be imported into the system root.\n\nContinue?'
        : 'Folders will be imported inside the current folder.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              setImporting(true);
              setProgress({
                stage: 'folders',
                current: 0,
                total: 1,
                message: 'Starting...'
              });

              await importFolders(
                currentFolderId ?? null,
                (prog) => {
                  setProgress(prog);
                }
              );

              Alert.alert(
                'Import Successful!',
                'Data was imported successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      onImportComplete();
                      onClose();
                    }
                  }
                ]
              );
            } catch (error: any) {
              const msg = error instanceof Error ? error.message : String(error);
              const isCanceled = /cancel/i.test(msg);
              if (!isCanceled) {
                console.error('Error en importación:', error);
                Alert.alert(
                  'Error',
                  `Could not complete the import:\n${msg}`
                );
              }
              onClose();
            } finally {
              setImporting(false);
              setProgress(null);
            }
          }
        }
      ]
    );
  };

  const handleImportAll = async () => {
    Alert.alert(
      'Confirm Full Import',
      currentFolderId === null || currentFolderId === undefined
        ? 'Import entire dataset from a file into system root. Continue?'
        : 'Import entire dataset from a file into the current folder. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              setImporting(true);
              setProgress({
                stage: 'folders',
                current: 0,
                total: 1,
                message: 'Starting full import...'
              });

              // Import into currentFolderId (null => root)
              await importFolders(currentFolderId ?? null, (prog) => setProgress(prog));

              Alert.alert('Import Successful!', 'Full database import completed.', [
                {
                  text: 'OK',
                  onPress: () => {
                    onImportComplete();
                    onClose();
                  }
                }
              ]);
            } catch (error: any) {
              const msg = error instanceof Error ? error.message : String(error);
              console.error('Error en importación:', error);
              Alert.alert('Error', `Could not complete the import:\n${msg}`);
              onClose();
            } finally {
              setImporting(false);
              setProgress(null);
            }
          }
        }
      ]
    );
  };

  const getProgressPercentage = (): number => {
    if (!progress) return 0;
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  return (
    <ModalWrapper
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={importing ? undefined : onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { width: width * 0.9, maxHeight: height * 0.9 }]}>
          {/* Hidden long-press area to trigger full import (advanced) */}
          <TouchableOpacity
            style={styles.hiddenTrigger}
            onLongPress={handleImportAll}
            accessible={false}
          />
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Import Folders</Text>
            {!importing && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {importing && progress ? (
              // Mostrando progreso de importación
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                
                <Text style={styles.stageLabel}>
                  {STAGE_LABELS[progress.stage]}
                </Text>

                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${getProgressPercentage()}%` }
                    ]} 
                  />
                </View>

                <Text style={styles.progressText}>
                  {progress.message}
                </Text>

                <Text style={styles.progressCount}>
                  {progress.current} / {progress.total}
                </Text>

                <Text style={styles.progressPercentage}>
                  {getProgressPercentage()}%
                </Text>

                <Text style={styles.warningText}>
                  Please do not close the app
                </Text>
              </View>
            ) : (
              // Vista inicial
              <View style={styles.initialContainer}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>📥</Text>
                </View>

                <Text style={styles.description}>
                  Import folders with their full hierarchy
                </Text>

                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>Will import:</Text>
                  <Text style={styles.infoItem}>• Folders and subfolders</Text>
                  <Text style={styles.infoItem}>• All competitions</Text>
                  <Text style={styles.infoItem}>• All gymnasts</Text>
                  <Text style={styles.infoItem}>• All images</Text>
                  <Text style={styles.infoItem}>• All whiteboard traces</Text>
                </View>

                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Import location:</Text>
                  <Text style={styles.locationValue}>
                    {currentFolderId === null || currentFolderId === undefined
                      ? 'System root'
                      : 'Inside current folder'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.importButton}
                  onPress={handleImport}
                >
                  <Text style={styles.importButtonText}>
                    Select File
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.importButton, styles.importAllButton]}
                  onPress={handleImportAll}
                  disabled={importing}
                >
                  <Text style={styles.importButtonText}>
                    Import Here
                  </Text>
                </TouchableOpacity>

                <Text style={styles.fileTypeInfo}>
                  Supported files: .json
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </ModalWrapper>
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
    maxWidth: 500,
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
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: 24,
    flexGrow: 1,
  },
  initialContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 64,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationInfo: {
    width: '100%',
    marginBottom: 24,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 14,
    color: '#007AFF',
  },
  importButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fileTypeInfo: {
    fontSize: 12,
    color: '#999',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  stageLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
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
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#ff9500',
    fontWeight: '500',
  },
  hiddenTrigger: {
    position: 'absolute',
    width: 28,
    height: 28,
    top: 8,
    right: 8,
    opacity: 0.01,
    zIndex: 1000,
  },
  importAllButton: {
    backgroundColor: '#34C759',
  },
});
