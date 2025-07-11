import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useFonts } from "expo-font";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import {
  deleteCompetencesByFolderId,
  deleteFolder,
  deleteMainTableByCompetenceId,
  deleteRateGeneralByTableId,
  exportFolderData,
  getCompetencesByFolderId,
  getFolders,
  reorderFolders,
  getFoldersOrderedByPosition,
  getMainTablesByCompetenceId,
  importFolderData,
  insertCompetence, insertFolder, insertMainTable, insertRateGeneral, updateFolder, updateFolderPositions
} from "../Database/database"; // Adjust the path based on your project structure
import { GridDraggableItem } from "../components/GridDraggableItem";
const { width, height } = Dimensions.get("window");
var isLargeDevice = false;
var isMediumLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;

if (width >= 1368 ) {
  isLargeDevice = true;
} else if (width >= 1200 && width < 1368) {
  isMediumLargeDevice = true;
} else if (width >= 945 && width < 1200) {
  isSmallDevice = true;
} else if (width < 945) {
  isTinyDevice = true;
}

// Update this interface to match the props being passed
interface FolderItemProps {
  id: number;
  title: string;
  description: string;
  date: string;
  selected?: boolean;
  folderType: 1 | 2;
  animationDelay?: number;
  selectionMode?: boolean;
  discipline: Boolean,
  empty?: boolean;
  onSelect?: (id: number) => void;
  isSelectedForSwap?: boolean; // Para indicar si está seleccionada para swap
  isSwapping?: boolean; // Para indicar si está en proceso de swap
  onCardPress?: (id: number) => void; // Para manejar el tap-to-swap
}

interface Competition {
  id?: number;
  folderId: number;
  name: string;
  description: string;
  participants: number;
  type: string; // e.g., "Floor", "Jump", etc.
  date: string;
}

interface Competence {
  id?: number;
  folderId: number;
  name: string;
  description: string;
  participants: number;
  type: string; // e.g., "Floor", "Jump", etc.
  date: string;
}


interface Folder {
  id: number;
  userId: number;
  name: string;
  description: string;
  type: boolean; // true for training, false for competence
  date: string; // ISO date string
  filled: boolean;
}



const FolderItem: React.FC<FolderItemProps> = ({ 
  id,
  title, 
  description,
  date, 
  selected = false, 
  folderType, 
  animationDelay = 0,
  selectionMode = false,
  discipline,
  empty,
  onSelect = () => {},
  isSelectedForSwap = false,
  isSwapping = false,
  onCardPress = () => {}
}) => {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [folderTypeText, setFolderTypeText] = useState(folderType === 1 ? "Training" : "Competence");

  // Variables para tap-to-swap system
  const swapHighlightAnim = useRef(new Animated.Value(0)).current;
  const swapPulseAnim = useRef(new Animated.Value(1)).current;

  // Estado para manejar long press
  const [longPressActive, setLongPressActive] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  // Función para manejar el tap simple en la carta
  const handleCardTap = () => {
    if (longPressActive) return; // Evitar tap si hay long press activo
    
    if (selectionMode) {
      onSelect(id);
    } else if (!isSwapping) {
      // Tap normal - siempre abre carpeta, sin importar estado de swap
      goIntoFolder(id, discipline);
    }
  };

  // Función para manejar el long press
  const handleLongPress = () => {
    if (selectionMode || isSwapping) return;
    
    console.log('Long press detected, activating swap mode for:', id);
    setLongPressActive(true);
    Vibration.vibrate(50); // Feedback háptico
    onCardPress(id); // Activar modo swap
    
    // Resetear flag después de más tiempo para evitar conflictos con tap
    setTimeout(() => {
      setLongPressActive(false);
    }, 1000); // Extender a 1 segundo
  };

  // Funciones para manejar press in/out
  const handlePressIn = () => {
    if (selectionMode || isSwapping) return;
    
    longPressTimer.current = setTimeout(() => {
      handleLongPress();
    }, 500) as unknown as number; // 500ms para long press
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current as unknown as NodeJS.Timeout);
      longPressTimer.current = null;
    }
    
    // Si no hay long press activo, ejecutar tap normal después de un pequeño delay
    if (!longPressActive) {
      setTimeout(() => {
        if (!longPressActive) { // Verificar de nuevo después del delay
          handleCardTap();
        }
      }, 50); // Pequeño delay para dar tiempo al long press
    }
  };

  // Efecto para animar la aparición inicial de las carpetas
  useEffect(() => {
    // Delay each folder's animation for staggered effect
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false, // Cambiar a false para consistencia
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false, // Cambiar a false para consistencia
        }),
      ]).start();
    }, animationDelay);
  }, []);

  // Efecto para animar el estado de selección para swap
  useEffect(() => {
    if (isSelectedForSwap) {
      console.log(`Card ${id} selected for swap, starting highlight animation`);
      Animated.timing(swapHighlightAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(swapPulseAnim, {
            toValue: 1.05, // Escala completa (inicial + pulso)
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(swapPulseAnim, {
            toValue: 1.0, // Volver a escala inicial
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      );
      pulseLoop.start();
      
      return () => {
        pulseLoop.stop();
      };
    } else {
      console.log(`Card ${id} deselected for swap, stopping highlight animation`);
      swapPulseAnim.stopAnimation();
      Animated.parallel([
        Animated.timing(swapHighlightAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(swapPulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isSelectedForSwap]);

  const goIntoFolder = (folderId: number, discipline: Boolean) => {
    if (selectionMode) {
      onSelect(folderId);
    } else {
      router.replace(`/folder?id=${folderId}&discipline=${discipline}`);
    }
  };

  

  // Determinar borderRadius según el tamaño del dispositivo para que coincida con el TouchableOpacity
  const getBorderRadius = () => {
    if (isLargeDevice) return 10;
    if (isMediumLargeDevice) return 9;
    if (isSmallDevice) return 8;
    if (isTinyDevice) return 8;
    return 10; // default
  };

  return (
    <Animated.View
      style={[
        { 
          opacity: opacityAnim,
          transform: [
            { 
              scale: isSelectedForSwap ? swapPulseAnim : scaleAnim
            }
          ],
          flex: 1,
        },
        // Efecto visual para carta seleccionada para swap
        isSelectedForSwap ? {
          borderRadius: getBorderRadius(),
          borderWidth: 1,
          borderColor: swapHighlightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', '#00AAFF'],
          }),
          // Usar padding en lugar de margin para hacer el highlight más pequeño que el container
          shadowColor: '#00AAFF',
          marginRight: 25, // Asegurar que el padding sea consistente
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: swapHighlightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.3],
          }),
          shadowRadius: 2,
          elevation: 3,
          backgroundColor: swapHighlightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', 'rgba(0, 170, 255, 0.05)'],
          }),
        } : null,
      ]}
    >
      <TouchableOpacity
        style={[
          folderType === 1 ? styles.folderType1 : null,
          folderType === 2 ? styles.folderType2 : null,
          isLargeDevice ? styles.folderItemLarge : null,
          isMediumLargeDevice ? styles.folderItemMediumLarge : null,
          isSmallDevice ? styles.folderItemSmall : null, 
          isTinyDevice ? styles.folderItemTiny : null,
          selected ? styles.selectedFolder : null,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isSwapping && !isSelectedForSwap}
        activeOpacity={0.7}
      >
        <View style={styles.folderContent}>
          <Image
            source={
              empty
                ? require("../assets/images/open-folder.png")
                : require("../assets/images/folder.png")
            }
            style={[
              isLargeDevice ? styles.folderIconLarge : null, 
              isSmallDevice ? styles.folderIconSmall : null, 
              isMediumLargeDevice ? styles.folderIconMediumLarge : null,
              isTinyDevice ? styles.folderIconTiny : null,
            ]}
            resizeMode="cover"
          />
          
          <View style={[
            isLargeDevice ? styles.folderInfoLarge : null, 
            isSmallDevice ? styles.folderInfoSmall : null, 
            isMediumLargeDevice ? styles.folderInfoMediumLarge : null,
            isTinyDevice ? styles.folderInfoTiny : null, 
          ]}>
            <Text 
              style={[
                isLargeDevice ? styles.folderTitleLarge : null, 
                isSmallDevice ? styles.folderTitleSmall : null, 
                isMediumLargeDevice ? styles.folderTitleMediumLarge : null,
                isTinyDevice ? styles.folderTitleTiny : null, 
              ]}
            >
              {title}
            </Text>
            
            <Text 
              style={[
                isLargeDevice ? styles.folderDescriptionLarge : null, 
                isSmallDevice ? styles.folderDescriptionSmall : null, 
                isMediumLargeDevice ? styles.folderDescriptionMediumLarge : null,
                isTinyDevice ? styles.folderDescriptionTiny : null, 
              ]}
            >
              {description}
            </Text>
            
            <View style={[
              isLargeDevice ? styles.folderFooterSmall : null, 
              isSmallDevice ? styles.folderFooterSmall : null, 
              isMediumLargeDevice ? styles.folderFooterMediumLarge : null,
              isTinyDevice ? styles.folderFooterTiny : null, 
            ]}>
              <Text 
                style={[
                  isLargeDevice ? styles.dateTextLarge : null, 
                  isSmallDevice ? styles.dateTextSmall : null, 
                  isMediumLargeDevice ? styles.dateTextMediumLarge : null,
                  isTinyDevice ? styles.dateTextTiny : null, 
                ]}
              >
                {date}
              </Text>
            </View>
          </View>
        </View>
        
        {selected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={17} color="#000" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};


const MainMenu: React.FC = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [addFolderModalVisible, setAddFolderModalVisible] = useState(false);
  const [addCompetitionModalVisible, setAddCompetitionModalVisible] = useState(false);
  const [feedbackAcceptModel, setFeedbackAcceptModel] = useState(false);
  const [feedbackDeniedModel, setFeedbackDeniedModel] = useState(false);
  const [confirmationModel, setConfirmationModel] = useState(false);
  const [editFolderModalVisible, setEditFolderModalVisible] = useState(false);
  const router = useRouter();
  const [ConfirmButtomText, setConfirmButtonText] = useState("Select Folder");

  /* Selection Mode State */
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<number[]>([]);
  const [selectionAction, setSelectionAction] = useState<'select' | 'edit' | 'delete' | null>(null);

  /* page logic */
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderType, setFolderType] = useState(true);
  const [folderDate, setFolderDate] = useState(new Date().toLocaleDateString());

  const [folders, setFolders] = useState<Folder[]>([]); // State to store folders
  
  // Loading states for better UX
  const [isLoadingAddFolder, setIsLoadingAddFolder] = useState(false);
  const [isLoadingEditFolder, setIsLoadingEditFolder] = useState(false);
  const [isLoadingDeleteFolder, setIsLoadingDeleteFolder] = useState(false);
  const [isLoadingAddCompetition, setIsLoadingAddCompetition] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // For editing functionality
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const params = useLocalSearchParams();
  const discipline = params.discipline === "true";
  const userIdparams = params.userId;
  
  // Use userId from params or default to 1, ensure it's a valid number
  const userId = (() => {
    if (typeof userIdparams === 'string') {
      const parsed = parseInt(userIdparams, 10);
      return !isNaN(parsed) ? parsed : 1;
    } else if (typeof userIdparams === 'number') {
      return !isNaN(userIdparams) ? userIdparams : 1;
    }
    return 1;
  })();


  // variables competition
const [competitionName, setCompetitionName] = useState("");
const [competitionDescription, setCompetitionDescription] = useState("");
const [competitionParticipants, setCompetitionParticipants] = useState("");
const [competitionType, setCompetitionType] = useState("Floor");
const [currentFolderId, setCurrentFolderId] = useState<number | null>(
  params.id ? parseInt(params.id as string) : null
);

// Estados para importar/exportar
const [showExportModal, setShowExportModal] = useState(false);
const [showImportModal, setShowImportModal] = useState(false);
const [userFolders, setUserFolders] = useState<any[]>([]);
const [selectedFolder, setSelectedFolder] = useState<any>(null);
const [isExporting, setIsExporting] = useState(false);
const [isImporting, setIsImporting] = useState(false);
const [folderSelectionForCompetition, setFolderSelectionForCompetition] = useState(false);

// Referencias
const scrollViewRef = useRef<ScrollView>(null);

// Estado para swap functionality (reemplaza drag & drop)
const [selectedCardForSwap, setSelectedCardForSwap] = useState<number | null>(null);
const [isSwapping, setIsSwapping] = useState(false);
const [renderKey, setRenderKey] = useState(0); // Para forzar re-renders después del swap
const swapTimeoutRef = useRef<number | null>(null); // Para auto-cancelar selección de swap

// Estados para la barra de carga unificada
const [showLoadingModal, setShowLoadingModal] = useState(false);
const [loadingMessage, setLoadingMessage] = useState("");
const [loadingProgress, setLoadingProgress] = useState(0);
const [isLoadingOperation, setIsLoadingOperation] = useState(false);



  // Animation values
  const headerAnimOpacity = useRef(new Animated.Value(0)).current;
  const headerAnimY = useRef(new Animated.Value(-50)).current;
  const buttonAnimOpacity = useRef(new Animated.Value(0)).current;
  const buttonAnimY = useRef(new Animated.Value(50)).current;
  const deleteButtonAnim = useRef(new Animated.Value(0)).current;
  
  // Animation values para la barra de carga
  const loadingSpinAnim = useRef(new Animated.Value(0)).current;
  const loadingScaleAnim = useRef(new Animated.Value(0.8)).current;
  const loadingOpacityAnim = useRef(new Animated.Value(0)).current;



  // Load the custom font
  const [fontsLoaded] = useFonts({
    "Rajdhani-Bold": require("../assets/fonts/Rajdhani/Rajdhani-Bold.ttf"),
    "Rajdhani-medium": require("../assets/fonts/Rajdhani/Rajdhani-Medium.ttf"),
  });

  // Funciones para controlar la barra de carga unificada
  const showLoading = (message: string, progress: number = 0) => {
    setLoadingMessage(message);
    setLoadingProgress(progress);
    setIsLoadingOperation(true);
    setShowLoadingModal(true);
    
    // Animar entrada del modal
    Animated.parallel([
      Animated.timing(loadingOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(loadingScaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
    ]).start();
    
    // Animación de rotación continua
    Animated.loop(
      Animated.timing(loadingSpinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const updateLoading = (message: string, progress: number) => {
    setLoadingMessage(message);
    setLoadingProgress(progress);
  };

  const hideLoading = () => {
    // Animar salida del modal
    Animated.parallel([
      Animated.timing(loadingOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(loadingScaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLoadingModal(false);
      setIsLoadingOperation(false);
      setLoadingProgress(0);
      loadingSpinAnim.setValue(0);
    });
  };

  const fetchFolders = async () => {
    try {
      console.log('=== FETCHING FOLDERS ===');
      console.log('Fetching ALL folders ordered by position (not filtered by userId)');
      // Cargar TODOS los folders ordenados por posición, sin filtrar por userId
      const fetchedFolders = await getFoldersOrderedByPosition();
      console.log('Fetched folders count:', fetchedFolders?.length || 0);
      console.log('Fetched folders ordered:', fetchedFolders?.map(f => ({ id: f.id, name: f.name, position: f.position })));
      setFolders(fetchedFolders || []);
      console.log('Folders state updated');
      console.log('=== FETCH COMPLETE ===');
    } catch (error) {
      console.error("Error fetching folders:", error);
      setFolders([]);
    }
  };

  // Function to refresh folders list - better UX
  const refreshFolders = async () => {
    console.log('Starting refresh folders...');
    setIsRefreshing(true);
    try {
      await fetchFolders();
      console.log('Folders refreshed successfully');
    } catch (error) {
      console.error('Error refreshing folders:', error);
    } finally {
      setIsRefreshing(false);
      console.log('Finished refresh folders');
    }
  };

  // Force refresh - útil para debugging o cuando hay problemas
  const forceRefreshFolders = async () => {
    console.log('FORCE REFRESH: Clearing folders and reloading ALL folders...');
    setFolders([]); // Limpiar estado primero
    await refreshFolders();
  };

  // Función para manejar el cambio de posiciones de las carpetas
  const handleFolderPositionChange = async (newPositions: { id: number; position: number }[]) => {
    try {
      // Actualizar posiciones en la base de datos
      const success = await updateFolderPositions(newPositions);
      
      if (success) {
        // Recargar las carpetas para reflejar el nuevo orden
        await fetchFolders();
      }
    } catch (error) {
      console.error("Error updating folder positions:", error);
    }
  };

  // Función para cancelar la selección de swap
  const cancelSwapSelection = () => {
    if (selectedCardForSwap !== null) {
      setSelectedCardForSwap(null);
      console.log('Swap selection cancelled');
    }
    // Limpiar timeout si existe
    if (swapTimeoutRef.current) {
      clearTimeout(swapTimeoutRef.current);
      swapTimeoutRef.current = null;
    }
  };

  // Función para manejar la selección de cartas para swap
  const handleCardSelection = (folderId: number) => {
    if (selectionMode || isSwapping) return; // No permitir swap durante otros modos
    
    if (selectedCardForSwap === null) {
      // Primera carta seleccionada con long press
      setSelectedCardForSwap(folderId);
      console.log('First card selected for swap:', folderId);
      Vibration.vibrate(50); // Feedback háptico
      
      // Configurar timeout para auto-cancelar después de 10 segundos
      swapTimeoutRef.current = setTimeout(() => {
        console.log('Auto-cancelling swap selection after 10 seconds');
        setSelectedCardForSwap(null);
        swapTimeoutRef.current = null;
      }, 10000);
      
    } else if (selectedCardForSwap === folderId) {
      // Misma carta con long press, deseleccionar
      cancelSwapSelection();
    } else {
      // Segunda carta con long press, realizar swap automáticamente
      console.log('Second card long pressed, performing swap:', selectedCardForSwap, '->', folderId);
      // Limpiar timeout ya que se va a hacer el swap
      if (swapTimeoutRef.current) {
        clearTimeout(swapTimeoutRef.current);
        swapTimeoutRef.current = null;
      }
      handleFolderSwap(selectedCardForSwap, folderId);
    }
  };

  // Función para intercambiar dos carpetas con animación
  const handleFolderSwap = async (firstFolderId: number, secondFolderId: number) => {
    if (isSwapping) return;
    
    try {
      setIsSwapping(true);
      console.log('=== STARTING FOLDER SWAP ===');
      console.log('Swapping folders:', firstFolderId, '<->', secondFolderId);
      
      // Encontrar los índices de las carpetas
      const firstIndex = folders.findIndex(folder => folder.id === firstFolderId);
      const secondIndex = folders.findIndex(folder => folder.id === secondFolderId);
      
      if (firstIndex === -1 || secondIndex === -1) {
        console.error('One or both folders not found');
        setSelectedCardForSwap(null);
        setIsSwapping(false);
        return;
      }
      
      console.log('Swapping folders at indices:', firstIndex, '<->', secondIndex);
      
      // Crear una copia del array y hacer el intercambio
      const swappedFolders = [...folders];
      [swappedFolders[firstIndex], swappedFolders[secondIndex]] = 
      [swappedFolders[secondIndex], swappedFolders[firstIndex]];
      
      // Actualizar estado local inmediatamente para feedback visual
      setFolders(swappedFolders);
      
      // Limpiar selección
      setSelectedCardForSwap(null);
      
      // Crear array de posiciones para la base de datos
      const folderPositions = swappedFolders.map((folder, index) => ({
        id: folder.id,
        position: index
      }));
      
      console.log('Updating database with new positions:', folderPositions);
      
      // Actualizar en la base de datos
      const success = await updateFolderPositions(folderPositions);
      
      if (success) {
        console.log('Database update successful');
        Vibration.vibrate([100, 50, 100]); // Patrón de vibración para confirmar
        
        // Recargar desde la base de datos para asegurar consistencia
        await fetchFolders();
        
        // Forzar re-render
        setRenderKey(prev => prev + 1);
        console.log('=== FOLDER SWAP COMPLETED SUCCESSFULLY ===');
      } else {
        console.error('Database update failed, reverting changes');
        setFolders(folders); // Revertir cambios
        Alert.alert('Error', 'No se pudo guardar el nuevo orden de las carpetas');
      }
    } catch (error) {
      console.error("Error swapping folders:", error);
      setFolders(folders); // Revertir cambios
      Alert.alert('Error', 'Error al intercambiar las carpetas');
    } finally {
      setIsSwapping(false);
    }
  };

  // Función para cargar folders del usuario
  const loadUserFolders = async () => {
    try {
      // Cargar todos los folders disponibles, no filtrar por usuario
      const folders = await getFolders();
      setUserFolders(folders || []);
    } catch (error) {
      console.error("Error loading user folders:", error);
      setUserFolders([]);
    }
  };

  // Función para exportar folder
  const handleExportFolder = async () => {
    if (!selectedFolder) {
      Alert.alert("Error", "Por favor selecciona un folder para exportar");
      return;
    }
    
    if (isLoadingOperation) return;
    
    console.log("Starting export with userId:", userId, "and folderId:", selectedFolder.id);
    
    // Cerrar modal de exportación PRIMERO
    setShowExportModal(false);
    
    // Pequeño delay para asegurar que el modal se cierre completamente
    setTimeout(() => {
      // Mostrar barra de carga
      showLoading("Preparando exportación...", 0);
      setIsExporting(true);
      
      // Ejecutar la exportación asíncrona
      exportFolderAsync(selectedFolder.id, selectedFolder.name);
    }, 300);
  };

  // Nueva función para manejar la exportación asíncrona
  const exportFolderAsync = async (folderId: number, folderName: string) => {
    try {
      // Exportar datos del folder con progreso
      console.log("Calling exportFolderData...");
      const exportedData = await exportFolderData(folderId, updateLoading);
      
      if (!exportedData) {
        throw new Error("No se pudieron exportar los datos del folder");
      }

      console.log("Export successful, data length:", exportedData.length);

      updateLoading("Creando archivo...", 97);
      // Crear archivo temporal
      const fileName = `folder_${folderName}_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, exportedData);

      updateLoading("Preparando compartir...", 99);
      // Compartir archivo
      if (await Sharing.isAvailableAsync()) {
        updateLoading("Compartiendo archivo...", 100);
        
        setTimeout(async () => {
          hideLoading();
          
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Exportar Folder'
          });
          
          Alert.alert(
            "Éxito", 
            "Folder exportado correctamente. El archivo ha sido compartido.",
            [{ text: "OK", onPress: () => {
              setMenuVisible(false);
            }}]
          );
        }, 500);
      } else {
        hideLoading();
        Alert.alert("Error", "No se puede compartir archivos en este dispositivo");
      }

    } catch (error: any) {
      console.error("Error exporting folder:", error);
      hideLoading();
      Alert.alert("Error", `No se pudo exportar el folder: ${error.message || error}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Función para importar folder
  const handleImportFolder = async () => {
    if (isLoadingOperation) return;
    
    try {
      // Seleccionar archivo PRIMERO, sin mostrar barra de carga aún
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        setIsImporting(false);
        return;
      }

      // Cerrar modal de importación una vez seleccionado el archivo
      setShowImportModal(false);
      
      // Pequeño delay para asegurar que el modal se cierre completamente
      setTimeout(() => {
        // Ahora mostrar barra de carga
        showLoading("Leyendo archivo...", 5);
        setIsImporting(true);
        
        // Ejecutar la importación asíncrona
        importFileAsync(result.assets[0].uri);
      }, 300);

    } catch (error: any) {
      console.error("Error selecting file:", error);
      Alert.alert("Error", `Error al seleccionar archivo: ${error.message || error}`);
    }
  };

  // Nueva función para manejar la importación asíncrona
  const importFileAsync = async (fileUri: string) => {
    try {
      // Leer archivo
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      // Validar y importar con progreso
      const success = await importFolderData(fileContent, userId, updateLoading);
      
      if (success) {
        updateLoading("Actualizando lista...", 98);
        
        // Recargar la lista de folders
        await fetchFolders();
        
        updateLoading("Completado", 100);
        
        setTimeout(() => {
          hideLoading();
          Alert.alert(
            "Éxito", 
            "Folder importado correctamente. Los datos se han agregado a tu cuenta.",
            [{ text: "OK", onPress: () => {
              setMenuVisible(false);
            }}]
          );
        }, 500);
      } else {
        throw new Error("Error al procesar el archivo de importación");
      }

    } catch (error: any) {
      console.error("Error importing folder:", error);
      hideLoading();
      Alert.alert("Error", `No se pudo importar el folder: ${error.message || error}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Abrir modal de exportación
  const openExportModal = () => {
    setMenuVisible(false);
    loadUserFolders();
    setShowExportModal(true);
  };

  // Abrir modal de importación
  const openImportModal = () => {
    setMenuVisible(false);
    setShowImportModal(true);
  };

  // Efecto para cargar todos los folders al montar el componente
  useEffect(() => {
    console.log('Component mounted, fetching all folders');
    fetchFolders();
  }, []); // Solo se ejecuta al montar

  // Refresh folders when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused - force refreshing ALL folders...');
      // Usar force refresh para asegurar que se recarguen todos los folders
      forceRefreshFolders();
      
      // También resetear estados de swap por si acaso
      setSelectedCardForSwap(null);
      setIsSwapping(false);
      
      // Limpiar timeout de swap si existe
      if (swapTimeoutRef.current) {
        clearTimeout(swapTimeoutRef.current);
        swapTimeoutRef.current = null;
      }
      
      return () => {
        console.log('Screen unfocused - cleaning up...');
        // Limpiar timeout cuando se pierde el foco
        if (swapTimeoutRef.current) {
          clearTimeout(swapTimeoutRef.current);
          swapTimeoutRef.current = null;
        }
      };
    }, []) // Sin dependencias ya que siempre cargamos todos los folders
  );

  useEffect(() => {
    // Animate header
    Animated.timing(headerAnimOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();

    Animated.timing(headerAnimY, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.2)),
    }).start();

    // Animate add button (bottom)
    Animated.sequence([
      Animated.delay(1200), // Wait for folders to animate
      Animated.timing(buttonAnimOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnimY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
    ]).start();
  }, []);

  // Function to toggle folder selection
  const toggleFolderSelection = (id: number) => {
    setSelectedFolders(prev => {
      if (prev.includes(id)) {
        return prev.filter(folderId => folderId !== id);
      } else {
        // For edit mode, only allow selecting one folder
        if (selectionAction === 'edit') {
          return [id];
        }
        // For competition folder selection, only allow one folder
        if (folderSelectionForCompetition || selectionAction === 'select') {
          return [id];
        }
        // For delete mode, allow multiple selections
        return [...prev, id];
      }
    });
  };

  // Function to handle the Add option from menu
  const handleAddOption = () => {
    setMenuVisible(false);
    setAddFolderModalVisible(true);
  };

  // Function to handle the Edit option from menu
  const handleEditOption = () => {
    setMenuVisible(false);
    setSelectionMode(true);
    setSelectionAction('edit');
    setSelectedFolders([]);
  };

  // Function to handle the Delete option from menu
  const handleDeleteOption = () => {
    setMenuVisible(false);
    setSelectionMode(true);
    setSelectionAction('delete');
    setSelectedFolders([]);
    
    // Animate the delete confirmation button
    Animated.timing(deleteButtonAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Function to cancel selection mode
  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedFolders([]);
    
    // Hide the delete confirmation button
    Animated.timing(deleteButtonAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Function to confirm deletion
  const confirmDelete = () => {
    setConfirmationModel(true);
  };

  // Function to actually delete the selected folders
const performDelete = async () => {
  if (isLoadingOperation) return; // Prevent multiple deletions
  
  try {
    // Mostrar barra de carga
    showLoading("Calculando total de gimnastas...", 0);
    setIsLoadingDeleteFolder(true);
    setConfirmationModel(false); // Close modal immediately to prevent double-clicks
    
    console.log('Starting deletion process for folders:', selectedFolders);
    
    // First, calculate total number of gymnasts across all folders
    let totalGymnasts = 0;
    for (const folderId of selectedFolders) {
      try {
        const competences = await getCompetencesByFolderId(folderId);
        for (const competence of competences) {
          const mainTables = await getMainTablesByCompetenceId(competence.id);
          totalGymnasts += mainTables.length;
        }
      } catch (error) {
        console.error(`Error calculating gymnasts for folder ${folderId}:`, error);
      }
    }
    
    console.log(`Total gymnasts to delete: ${totalGymnasts}`);
    updateLoading(`Eliminando ${totalGymnasts} gimnastas...`, 5);
    
    let processedGymnasts = 0;
    
    // Process deletions sequentially to avoid race conditions
    for (const folderId of selectedFolders) {
      console.log(`Deleting folder ${folderId}...`);
      
      try {
        // Fetch competences associated with the folder
        const competences = await getCompetencesByFolderId(folderId);
        console.log(`Found ${competences.length} competences for folder ${folderId}`);

        for (const competence of competences) {
          console.log(`Processing competence ${competence.id}...`);
          
          // Fetch main tables associated with the competence
          const mainTables = await getMainTablesByCompetenceId(competence.id);
          console.log(`Found ${mainTables.length} main tables for competence ${competence.id}`);

          for (const mainTable of mainTables) {
            // Delete rateGeneral entries associated with the main table
            await deleteRateGeneralByTableId(mainTable.id);
            console.log(`Deleted rate general for main table ${mainTable.id}`);
            
            processedGymnasts++;
            const progress = Math.floor((processedGymnasts / totalGymnasts) * 80);
            updateLoading(`Eliminando gimnasta ${processedGymnasts} de ${totalGymnasts}...`, progress);
          }

          // Delete main tables associated with the competence
          await deleteMainTableByCompetenceId(competence.id);
          console.log(`Deleted main tables for competence ${competence.id}`);
        }

        // Delete competences associated with the folder
        await deleteCompetencesByFolderId(folderId);
        console.log(`Deleted competences for folder ${folderId}`);

        // Finalmente, eliminar la carpeta
        await deleteFolder(folderId);
        console.log(`Deleted folder ${folderId}`);
        
      } catch (error) {
        console.error(`Error deleting folder ${folderId}:`, error);
        // Continue with other deletions even if one fails
      }
    }

    updateLoading("Actualizando lista...", 90);
    // Refresh the folders list instead of manually updating state
    await refreshFolders();

    // Reset all selection states
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedFolders([]);

    // Hide the delete confirmation button
    Animated.timing(deleteButtonAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    updateLoading("Completado", 100);
    
    setTimeout(() => {
      hideLoading();
      // Show success feedback
      setFeedbackAcceptModel(true);
      setTimeout(() => {
        setFeedbackAcceptModel(false);
      }, 1500);
    }, 500);
    
    console.log('Deletion process completed successfully');
    
  } catch (error) {
    console.error("Error in performDelete:", error);
    hideLoading();
    Alert.alert("Error", "Failed to delete some folders. Please try again.");
    
    // Reset states even if there's an error
    setConfirmationModel(false);
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedFolders([]);
    
    // Hide the delete confirmation button
    Animated.timing(deleteButtonAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  } finally {
    setIsLoadingDeleteFolder(false);
  }
};

  // Function to handle edit confirmation
  const handleEditConfirm = () => {
    if (selectedFolders.length === 1) {
      const folderToEdit = folders.find(folder => folder.id === selectedFolders[0]);
      if (folderToEdit) {
        setEditingFolder(folderToEdit);
        setFolderName(folderToEdit.name);
        setFolderDescription(folderToEdit.description);
        setFolderType(folderToEdit.type);
        setEditFolderModalVisible(true);
      }
    }
  };

  // Function to save edited folder
  const saveEditedFolder = async () => {
    if (!editingFolder || isLoadingOperation) return;
    
    if (folderName.trim() === "" ) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    // Mostrar barra de carga
    showLoading("Actualizando carpeta...", 0);
    setIsLoadingEditFolder(true);

    const updatedFolder = {
      ...editingFolder,
      name: folderName,
      description: folderDescription,
      type: folderType,
    };

    try {
      updateLoading("Guardando cambios...", 40);
      const result = await updateFolder(editingFolder.id, updatedFolder);
      
      if (result) {
        updateLoading("Actualizando lista...", 80);
        // Refresh the folders list to ensure UI is up to date
        await refreshFolders();
        
        updateLoading("Finalizando...", 100);
        
        setEditFolderModalVisible(false);
        setSelectionMode(false);
        setSelectionAction(null);
        setSelectedFolders([]);
        setEditingFolder(null);
        
        setTimeout(() => {
          hideLoading();
          // Show success feedback
          setFeedbackAcceptModel(true);
          setTimeout(() => {
            setFeedbackAcceptModel(false);
          }, 1500);
        }, 500);
      } else {
        hideLoading();
        Alert.alert("Error", "Failed to update folder.");
      }
    } catch (error) {
      console.error("Error updating folder:", error);
      hideLoading();
      Alert.alert("Error", "Failed to update folder.");
    } finally {
      setIsLoadingEditFolder(false);
    }
  };

  // Function to add a new folder
  const addNewFolder = async () => {
    if (folderName.trim() === "") {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (isLoadingOperation) return; // Prevent multiple submissions

    // Mostrar barra de carga
    showLoading("Creando carpeta...", 0);
    setIsLoadingAddFolder(true);

    try {
      updateLoading("Preparando nueva carpeta...", 10);
      
      // Obtener todas las carpetas existentes ordenadas por posición
      const currentFolders = await getFoldersOrderedByPosition();
      
      console.log('Current folders count:', currentFolders?.length || 0);
      console.log('New folder will be inserted at position 0 (first position)');

      // Si hay carpetas existentes, incrementar todas sus posiciones en +1
      if (currentFolders && currentFolders.length > 0) {
        updateLoading("Reorganizando carpetas existentes...", 25);
        
        // Crear array de nuevas posiciones: cada carpeta aumenta su posición en +1
        const updatedPositions = currentFolders.map((folder) => ({
          id: folder.id,
          position: (folder.position ?? 0) + 1 // Incrementar cada posición existente en 1 (usar 0 si position es undefined)
        }));
        
        console.log('Shifting existing folders positions +1:', updatedPositions);
        
        // Actualizar las posiciones en la base de datos
        const positionsUpdated = await updateFolderPositions(updatedPositions);
        if (!positionsUpdated) {
          throw new Error("Failed to update existing folder positions");
        }
        
        console.log('Successfully shifted all existing folders to make room for new folder at position 0');
      }

      updateLoading("Creando nueva carpeta...", 45);

      const folderData = {
        userId: userId,
        name: folderName,
        description: folderDescription,
        type: folderType,
        date: new Date().toISOString(),
        filled: false,
        position: 0, // Nueva carpeta siempre en posición 0 (primera)
      };

      updateLoading("Guardando nueva carpeta...", 60);
      const result = await insertFolder(folderData);
      
      if (result) {
        updateLoading("Actualizando lista...", 70);
        // Refresh the folders list to ensure UI is up to date
        await refreshFolders();
        
        updateLoading("Finalizando...", 100);
        
        // Reset form and close modal
        setFolderName("");
        setFolderDescription("");
        setAddFolderModalVisible(false);
        
        setTimeout(() => {
          hideLoading();
          // Show success feedback
          setFeedbackAcceptModel(true);
          setTimeout(() => {
            setFeedbackAcceptModel(false);
          }, 1500);
        }, 500);
      } else {
        hideLoading();
        Alert.alert("Error", "Failed to insert folder.");
      }
    } catch (error) {
      console.error("Error adding folder:", error);
      hideLoading();
      Alert.alert("Error", "Failed to add folder.");
    } finally {
      setIsLoadingAddFolder(false);
    }
  };

  const goBack = () => {
    router.replace(`/select-sex?userId=${userIdparams}&changeDis=${true}`);
  };

  useEffect(() => {
    // Animate header
    Animated.timing(headerAnimOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();

    Animated.timing(headerAnimY, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.2)),
    }).start();

    // Animate add button (bottom)
    Animated.sequence([
      Animated.delay(1200), // Wait for folders to animate
      Animated.timing(buttonAnimOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnimY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
    ]).start();
  }, []);

  // Function to add a new competition
  const addNewCompetition = async () => {
    // Validate inputs
    if (competitionName.trim() === "" ) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    
    if (!competitionParticipants || isNaN(parseInt(competitionParticipants))) {
      Alert.alert("Error", "Please enter a valid number of participants.");
      return;
    }
    
    // Check if we have a folder ID (either from URL or selection)
    if (!currentFolderId && selectedFolders.length === 0) {
      // We need to select a folder first
      setAddCompetitionModalVisible(false);
      setFolderSelectionForCompetition(true);
      setSelectionMode(true);
      setSelectionAction('select');
      setConfirmButtonText("Confirm");
      Alert.alert("Info", "Please select a folder for this competition.");
      return;
    }
    
    if (isLoadingOperation) return; // Prevent multiple submissions

    const numberOfParticipants = parseInt(competitionParticipants);
    
    // Cerrar modal de competencia PRIMERO
    setAddCompetitionModalVisible(false);
    
    // Pequeño delay para asegurar que el modal se cierre completamente
    setTimeout(() => {
      // Mostrar barra de carga
      showLoading("Creando competencia...", 0);
      setIsLoadingAddCompetition(true);
      
      // Determine which folder ID to use
      const targetFolderId = currentFolderId || selectedFolders[0];
      console.log("Using folder ID:", targetFolderId);
      
      const competenceData = {
        folderId: targetFolderId,
        name: competitionName,
        description: competitionDescription,
        numberOfParticipants: numberOfParticipants,
        type: competitionType,
        date: new Date().toISOString(),
        gender: discipline,
        sessionId: 1, // Default session ID
        userId: userId, // Use current user ID
      };
      
      // Ejecutar la creación asíncrona
      createCompetitionAsync(competenceData, numberOfParticipants, targetFolderId);
    }, 300);
  };

  // Nueva función para manejar la creación asíncrona
  const createCompetitionAsync = async (competenceData: any, numberOfParticipants: number, targetFolderId: number) => {
    try {
      updateLoading("Guardando competencia...", 20);
      const competitionId = await insertCompetence(competenceData);

      /* change filled in the folder in the db */
      await updateFolder(targetFolderId, { filled: true }); // Update the folder to mark it as filled
      
      if (competitionId) {
        updateLoading(`Creando ${numberOfParticipants} gimnastas...`, 40);
        // Create Main Table entries for each participant with progress tracking
        await createMainTableEntriesWithProgress(competitionId, numberOfParticipants);
        
        updateLoading("Actualizando lista...", 90);
        // Refresh folders list to reflect changes
        await refreshFolders();
        
        updateLoading("Finalizando...", 100);
        
        // Reset form and close modal
        setCompetitionName("");
        setCompetitionDescription("");
        setCompetitionParticipants("");
        setCompetitionType("Floor");
        setFolderSelectionForCompetition(false);
        setSelectionMode(false);
        setSelectedFolders([]);
        setCurrentFolderId(null);
        
        setTimeout(() => {
          hideLoading();
          // Show success feedback
          setFeedbackAcceptModel(true);
          setTimeout(() => {
            setFeedbackAcceptModel(false);
          }, 1500);
        }, 500);
      } else {
        hideLoading();
        Alert.alert("Error", "Failed to add competition.");
      }
    } catch (error) {
      console.error("Error adding competition:", error);
      hideLoading();
      Alert.alert("Error", "Failed to add competition.");
    } finally {
      setIsLoadingAddCompetition(false);
    }
  };

  // Add this new function to create Main Table entries with progress tracking
  const createMainTableEntriesWithProgress = async (competenceId: number, numberOfParticipants: number) => {
    try {
      // Create a main table entry for each participant with progress tracking
      for (let i = 1; i <= numberOfParticipants; i++) {
        const progress = 40 + Math.floor((i / numberOfParticipants) * 45); // 40% to 85%
        updateLoading(`Creando gimnasta ${i} de ${numberOfParticipants}...`, progress);
        
        const mainTableData = {
          competenceId: competenceId,
          number: i, // Participant number
          name: "", // Empty initially
          event: "",
          noc: "",
          bib: "", // String type as per interface
          j: 0,
          i: 0,
          h: 0,
          g: 0,
          f: 0,
          e: 0,
          d: 0,
          c: 0,
          b: 0,
          a: 0,
          dv: 0,
          eg: 0,
          sb: 0,
          nd: 0,
          cv: 0,
          sv: 0,
          e2: 0,
          d3: 0,
          e3: 0,
          delt: 0,
          percentage: 0
        };
        
        // Insert the main table entry and get the ID of the inserted row
        const mainTableId = await insertMainTable(mainTableData);
        if (!mainTableId) {
          console.error(`Failed to create main table entry ${i} for competition ID: ${competenceId}`);
          continue;
        }

        // Create the corresponding MainRateGeneral entry
        const mainRateGeneralData = {
          tableId: mainTableId, // Use the ID of the inserted MainTable
          stickBonus: false,
          numberOfElements: 0,
          difficultyValues: 0,
          elementGroups1: 0,
          elementGroups2: 0,
          elementGroups3: 0,
          elementGroups4: 0,
          elementGroups5: 0,
          execution: 0,
          eScore: 0,
          myScore: 0,
          compD: 0,
          compE: 0,
          compSd: 0,
          compNd: 0,
          compScore: 0,
          comments: "",
          paths: "",
          ded: 0,
          dedexecution: 0,
          vaultNumber: "",
          vaultDescription: "",
        };

        const rateGeneralResult = await insertRateGeneral(mainRateGeneralData);
        if (!rateGeneralResult) {
          console.error(`Failed to create MainRateGeneral entry for MainTable ID: ${mainTableId}`);
        }
      }
      console.log(`Successfully created ${numberOfParticipants} main table entries and rate general entries for competition ID: ${competenceId}`);
    } catch (error) {
      console.error("Error creating main table entries:", error);
      // We don't show an alert here as the competition was already created successfully
    }
  };

const confirmFolderForCompetition = () => {
  if (selectedFolders.length === 1) {
    setAddCompetitionModalVisible(true);
    setFolderSelectionForCompetition(false);
    setSelectionMode(false);
  } else {
    Alert.alert("Error", "Please select a folder for the competition.");
  }
};

 return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with Animation */}
      <Animated.View 
        style={[
          isLargeDevice ? styles.headerLarge : null,
          isMediumLargeDevice ? styles.headerMediumLarge : null,
          isSmallDevice ? styles.headerSmall : null,
          isTinyDevice ? styles.headerTiny : null,
          { 
            opacity: headerAnimOpacity,
            transform: [{ translateY: headerAnimY }]
          }
        ]}
      >
        <TouchableOpacity style={[
          isLargeDevice ? styles.backButtonLarge : null,
          isMediumLargeDevice ? styles.backButtonMediumLarge : null,
          isSmallDevice ? styles.backButtonSmall : null,
          isTinyDevice ? styles.backButtonTiny : null,
        ]} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text 
            style={[
              isLargeDevice ? styles.headerTitleLarge : null,
              isMediumLargeDevice ? styles.headerTitleMediumLarge : null,
              isSmallDevice ? styles.headerTitleSmall : null,
              isTinyDevice ? styles.headerTitleTiny : null,
            ]}
          >
            Select Discipline
          </Text>
        </TouchableOpacity>
        
        {selectionMode ? (
          <TouchableOpacity 
            onPress={cancelSelectionMode}
            disabled={isLoadingOperation}
            style={[
              isLoadingOperation && { opacity: 0.5 }
            ]}
          >
            <Text style={[
              isLargeDevice ? styles.cancelSelectionTextLarge : null,
              isMediumLargeDevice ? styles.cancelSelectionTextMediumLarge : null,
              isSmallDevice ? styles.cancelSelectionTextSmall : null,
              isTinyDevice ? styles.cancelSelectionTextTiny : null,
            ]}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            {/* Botón de refresh manual */}
            <TouchableOpacity 
              onPress={forceRefreshFolders}
              disabled={isRefreshing || isLoadingOperation}
              style={[
                (isRefreshing || isLoadingOperation) && { opacity: 0.5 }
              ]}
            >
              <Ionicons 
                name="refresh" 
                size={24} 
                color={isRefreshing ? "#0066CC" : "#000"} 
              />
            </TouchableOpacity>
            
            {/* Botón de menú */}
            <TouchableOpacity 
              onPress={() => setMenuVisible(true)}
              disabled={isLoadingOperation}
              style={[
                isLoadingOperation && { opacity: 0.5 }
              ]}
            >
              <Ionicons name="menu" size={28} color="#000" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
      
      {/* Folders Grid */}
      <ScrollView 
        ref={scrollViewRef}
        style={[
          isLargeDevice ? styles.scrollViewLarge : null,
          isMediumLargeDevice ? styles.scrollViewMediumLarge : null,
          isSmallDevice ? styles.scrollViewSmall : null,
          isTinyDevice ? styles.scrollViewTiny : null,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFolders}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        scrollEnabled={!isSwapping} // Deshabilitar scroll durante swap
      >
        {/* Loading overlay when performing operations */}
        {isLoadingOperation && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.1)',
            zIndex: 999,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{
              color: '#007AFF',
              fontSize: 16,
              fontWeight: 'bold'
            }}>
              {loadingMessage}
            </Text>
          </View>
        )}
        
        {/* TouchableOpacity para cancelar selección de swap tocando área vacía */}
        <TouchableOpacity 
          style={{ flex: 1, minHeight: '100%' }}
          activeOpacity={1}
          onPress={cancelSwapSelection}
        >
          {/* Grid de carpetas con sistema hold-to-swap */}
          {/* Para reordenar: mantén presionada una carpeta por 500ms para seleccionar, mantén presionada otra para intercambiar */}
          <View style={[
            isLargeDevice ? styles.foldersGridLarge : null,
            isMediumLargeDevice ? styles.foldersGridMediumLarge : null,
            isSmallDevice ? styles.foldersGridSmall : null,
            isTinyDevice ? styles.foldersGridTiny : null,
          ]}>
            {folders.map((folder, index) => {
              return (
                <View
                  key={`folder-${folder.id}-${index}-${renderKey}`}
                  style={styles.folderItemContainer}
                >
                  <FolderItem
                    id={folder.id}
                    title={folder.name}
                    description={folder.description}
                    date={new Date(folder.date).toLocaleDateString()}
                    folderType={folder.type ? 1 : 2}
                    selected={selectedFolders.includes(folder.id)}
                    animationDelay={index * 100}
                    selectionMode={selectionMode}
                    discipline={discipline}
                    empty={folder.filled}
                    onSelect={toggleFolderSelection}
                    isSelectedForSwap={selectedCardForSwap === folder.id}
                    isSwapping={isSwapping}
                    onCardPress={handleCardSelection}
                  />
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Add Competition Button with Animation */}
      <Animated.View 
        style={[
          isLargeDevice ? styles.buttonContainerLarge : null,
          isMediumLargeDevice ? styles.buttonContainerMediumLarge : null,
          isSmallDevice ? styles.buttonContainerSmall : null,
          isTinyDevice ? styles.buttonContainerTiny : null,
          {
            opacity: buttonAnimOpacity,
            transform: [{ translateY: buttonAnimY }]
          }
        ]}
      >
        {!selectionMode ? (
          <TouchableOpacity 
            style={[
              isLargeDevice ? styles.addButtonLarge : null,
              isMediumLargeDevice ? styles.addButtonMediumLarge : null,
              isSmallDevice ? styles.addButtonSmall : null,
              isTinyDevice ? styles.addButtonTiny : null,
              (isLoadingOperation || isRefreshing) && { opacity: 0.6 } // Visual feedback when loading
            ]} 
            onPress={() => setAddCompetitionModalVisible(true)}
            disabled={isLoadingOperation || isRefreshing} // Disable when loading
          >
            <Text style={[
              isLargeDevice ? styles.addButtonTextLarge : null,
              isMediumLargeDevice ? styles.addButtonTextMediumLarge : null,
              isSmallDevice ? styles.addButtonTextSmall : null,
              isTinyDevice ? styles.addButtonTextTiny : null,
            ]}>
              {isRefreshing ? "Refreshing..." : "Add Competition"}
            </Text>
          </TouchableOpacity>
        ) : selectionAction === 'edit' && selectedFolders.length === 1 ? (
          <TouchableOpacity 
            style={[
              isLargeDevice ? styles.editConfirmButtonLarge : null,
              isMediumLargeDevice ? styles.editConfirmButtonMediumLarge : null,
              isSmallDevice ? styles.editConfirmButtonSmall : null,
              isTinyDevice ? styles.editConfirmButtonTiny : null,
              isLoadingOperation && { opacity: 0.6 } // Visual feedback when loading
            ]} 
            onPress={handleEditConfirm}
            disabled={isLoadingOperation} // Disable when loading
          >
            <Text style={[
              isLargeDevice ? styles.editConfirmButtonTextLarge : null,
              isMediumLargeDevice ? styles.editConfirmButtonTextMediumLarge : null,
              isSmallDevice ? styles.editConfirmButtonTextSmall : null,
              isTinyDevice ? styles.editConfirmButtonTextTiny : null,
            ]}>
              Edit Selected
            </Text>
          </TouchableOpacity>
        ) : folderSelectionForCompetition && selectedFolders.length === 1 ? (
          <TouchableOpacity 
            style={[
              isLargeDevice ? styles.confirmButtonLarge : null,
              isMediumLargeDevice ? styles.confirmButtonMediumLarge : null,
              isSmallDevice ? styles.confirmButtonSmall : null,
              isTinyDevice ? styles.confirmButtonTiny : null,
            ]} 
            onPress={confirmFolderForCompetition}
          >
            <Text style={[
              isLargeDevice ? styles.confirmButtonTextLarge : null,
              isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
              isSmallDevice ? styles.confirmButtonTextSmall : null,
              isTinyDevice ? styles.confirmButtonTextTiny : null,
            ]}>
              Use Selected Folder
            </Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
  
      {/* Delete Confirmation Button (appears when in delete mode) */}
      {selectionMode && selectionAction === 'delete' && selectedFolders.length > 0 && (
        <Animated.View 
          style={[
            isLargeDevice ? styles.deleteButtonContainerLarge : null,
            isMediumLargeDevice ? styles.deleteButtonContainerMediumLarge : null,
            isSmallDevice ? styles.deleteButtonContainerSmall : null,
            isTinyDevice ? styles.deleteButtonContainerTiny : null,
            {
              opacity: deleteButtonAnim,
              transform: [{ scale: deleteButtonAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={[
              isLargeDevice ? styles.deleteButtonLarge : null,
              isMediumLargeDevice ? styles.deleteButtonMediumLarge : null,
              isSmallDevice ? styles.deleteButtonSmall : null,
              isTinyDevice ? styles.deleteButtonTiny : null,
              isLoadingOperation && { opacity: 0.6 } // Visual feedback when loading
            ]} 
            onPress={confirmDelete}
            disabled={isLoadingOperation} // Disable when loading
          >
            <Ionicons name="trash" size={isLargeDevice ? 24 : isMediumLargeDevice ? 22 : isSmallDevice ? 20 : 20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
  
      {/* Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={[
            isLargeDevice ? styles.modalOverlayLarge : null,
            isMediumLargeDevice ? styles.modalOverlayMediumLarge : null,
            isSmallDevice ? styles.modalOverlaySmall : null,
            isTinyDevice ? styles.modalOverlayTiny : null,
          ]} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View 
            style={[
              isLargeDevice ? styles.menuModalLarge : null,
              isMediumLargeDevice ? styles.menuModalMediumLarge : null,
              isSmallDevice ? styles.menuModalSmall : null,
              isTinyDevice ? styles.menuModalTiny : null,
            ]}
          >
            <TouchableOpacity style={[
              isLargeDevice ? styles.menuItemLarge : null,
              isMediumLargeDevice ? styles.menuItemMediumLarge : null,
              isSmallDevice ? styles.menuItemSmall : null,
              isTinyDevice ? styles.menuItemTiny : null,
            ]} onPress={handleAddOption}>
              <Image
                source={require("../assets/images/add.png")}
                style={[
                  isLargeDevice ? styles.menuIconPlaceholderLarge : null,
                  isMediumLargeDevice ? styles.menuIconPlaceholderMediumLarge : null,
                  isSmallDevice ? styles.menuIconPlaceholderSmall : null,
                  isTinyDevice ? styles.menuIconPlaceholderTiny : null,
                ]}
                resizeMode="cover"
              />
              <Text style={[
                isLargeDevice ? styles.menuTextLarge : null,
                isMediumLargeDevice ? styles.menuTextMediumLarge : null,
                isSmallDevice ? styles.menuTextSmall : null,
                isTinyDevice ? styles.menuTextTiny : null,
              ]}>Add</Text>
            </TouchableOpacity>
            
            <View style={[
              isLargeDevice ? styles.menuDividerLarge : null,
              isMediumLargeDevice ? styles.menuDividerMediumLarge : null,
              isSmallDevice ? styles.menuDividerSmall : null,
              isTinyDevice ? styles.menuDividerTiny : null,
            ]} />
            
            <TouchableOpacity style={[
              isLargeDevice ? styles.menuItemLarge : null,
              isMediumLargeDevice ? styles.menuItemMediumLarge : null,
              isSmallDevice ? styles.menuItemSmall : null,
              isTinyDevice ? styles.menuItemTiny : null,
            ]} onPress={handleEditOption}>
              <Image
                source={require("../assets/images/edit.png")}
                style={[
                  isLargeDevice ? styles.menuIconPlaceholderLarge : null,
                  isMediumLargeDevice ? styles.menuIconPlaceholderMediumLarge : null,
                  isSmallDevice ? styles.menuIconPlaceholderSmall : null,
                  isTinyDevice ? styles.menuIconPlaceholderTiny : null,
                ]}
                resizeMode="cover"
              />
              <Text style={[
                isLargeDevice ? styles.menuTextLarge : null,
                isMediumLargeDevice ? styles.menuTextMediumLarge : null,
                isSmallDevice ? styles.menuTextSmall : null,
                isTinyDevice ? styles.menuTextTiny : null,
              ]}>Edit</Text>
            </TouchableOpacity>
            
            <View style={[
              isLargeDevice ? styles.menuDividerLarge : null,
              isMediumLargeDevice ? styles.menuDividerMediumLarge : null,
              isSmallDevice ? styles.menuDividerSmall : null,
              isTinyDevice ? styles.menuDividerTiny : null,
            ]} />
            
            <TouchableOpacity style={[
              isLargeDevice ? styles.menuItemLarge : null,
              isMediumLargeDevice ? styles.menuItemMediumLarge : null,
              isSmallDevice ? styles.menuItemSmall : null,
              isTinyDevice ? styles.menuItemTiny : null,
            ]} onPress={handleDeleteOption}>
              <Image
                source={require("../assets/images/delete.png")}
                style={[
                  isLargeDevice ? styles.menuIconPlaceholderLarge : null,
                  isMediumLargeDevice ? styles.menuIconPlaceholderMediumLarge : null,
                  isSmallDevice ? styles.menuIconPlaceholderSmall : null,
                  isTinyDevice ? styles.menuIconPlaceholderTiny : null,
                ]}
                resizeMode="cover"
              />
              <Text style={[
                isLargeDevice ? styles.menuTextLarge : null,
                isMediumLargeDevice ? styles.menuTextMediumLarge : null,
                isSmallDevice ? styles.menuTextSmall : null,
                isTinyDevice ? styles.menuTextTiny : null,
              ]}>Delete</Text>
            </TouchableOpacity>

            <View style={[
              isLargeDevice ? styles.menuDividerLarge : null,
              isMediumLargeDevice ? styles.menuDividerMediumLarge : null,
              isSmallDevice ? styles.menuDividerSmall : null,
              isTinyDevice ? styles.menuDividerTiny : null,
            ]} />

            <TouchableOpacity style={[
              isLargeDevice ? styles.menuItemLarge : null,
              isMediumLargeDevice ? styles.menuItemMediumLarge : null,
              isSmallDevice ? styles.menuItemSmall : null,
              isTinyDevice ? styles.menuItemTiny : null,
            ]} onPress={openExportModal}>
              <Image
                source={require("../assets/images/export.png")}
                style={[
                  isLargeDevice ? styles.menuIconPlaceholderLarge : null,
                  isMediumLargeDevice ? styles.menuIconPlaceholderMediumLarge : null,
                  isSmallDevice ? styles.menuIconPlaceholderSmall : null,
                  isTinyDevice ? styles.menuIconPlaceholderTiny : null,
                ]}
                resizeMode="cover"
              />
              <Text style={[
                isLargeDevice ? styles.menuTextLarge : null,
                isMediumLargeDevice ? styles.menuTextMediumLarge : null,
                isSmallDevice ? styles.menuTextSmall : null,
                isTinyDevice ? styles.menuTextTiny : null,
              ]}>Export</Text>
            </TouchableOpacity>

            <View style={[
              isLargeDevice ? styles.menuDividerLarge : null,
              isMediumLargeDevice ? styles.menuDividerMediumLarge : null,
              isSmallDevice ? styles.menuDividerSmall : null,
              isTinyDevice ? styles.menuDividerTiny : null,
            ]} />

            <TouchableOpacity style={[
              isLargeDevice ? styles.menuItemLarge : null,
              isMediumLargeDevice ? styles.menuItemMediumLarge : null,
              isSmallDevice ? styles.menuItemSmall : null,
              isTinyDevice ? styles.menuItemTiny : null,
            ]} onPress={openImportModal}>
              <Image
                source={require("../assets/images/import.png")}
                style={[
                  isLargeDevice ? styles.menuIconPlaceholderLarge : null,
                  isMediumLargeDevice ? styles.menuIconPlaceholderMediumLarge : null,
                  isSmallDevice ? styles.menuIconPlaceholderSmall : null,
                  isTinyDevice ? styles.menuIconPlaceholderTiny : null,
                ]}
                resizeMode="cover"
              />
              <Text style={[
                isLargeDevice ? styles.menuTextLarge : null,
                isMediumLargeDevice ? styles.menuTextMediumLarge : null,
                isSmallDevice ? styles.menuTextSmall : null,
                isTinyDevice ? styles.menuTextTiny : null,
              ]}>Import</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
  
      {/* Add Folder Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={addFolderModalVisible}
        onRequestClose={isLoadingOperation ? undefined : () => setAddFolderModalVisible(false)} // Disable modal close during loading
      >
        <View style={[
          isLargeDevice ? styles.addModalOverlayLarge : null,
          isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
          isSmallDevice ? styles.addModalOverlaySmall : null,
          isTinyDevice ? styles.addModalOverlayTiny : null,
        ]}>
          <View 
            style={[
              isLargeDevice ? styles.addFolderModalLarge : null,
              isMediumLargeDevice ? styles.addFolderModalMediumLarge : null,
              isSmallDevice ? styles.addFolderModalSmall : null,
              isTinyDevice ? styles.addFolderModalTiny : null,
            ]}
          >
            <Text style={[
              isLargeDevice ? styles.addFolderTitleLarge : null,
              isMediumLargeDevice ? styles.addFolderTitleMediumLarge : null,
              isSmallDevice ? styles.addFolderTitleSmall : null,
              isTinyDevice ? styles.addFolderTitleTiny : null,
            ]}>Add Folder</Text>
  
            <TextInput
              style={[
                isLargeDevice ? styles.folderInputLarge : null,
                isMediumLargeDevice ? styles.folderInputMediumLarge : null,
                isSmallDevice ? styles.folderInputSmall : null,
                isTinyDevice ? styles.folderInputTiny : null,
              ]}
              placeholder="Folder's name"
              placeholderTextColor="#888"
              onChange={(e) => setFolderName(e.nativeEvent.text)}
              value={folderName}
            />
  
            <TextInput
              style={[
                isLargeDevice ? styles.folderInputLarge : null,
                isMediumLargeDevice ? styles.folderInputMediumLarge : null,
                isSmallDevice ? styles.folderInputSmall : null,
                isTinyDevice ? styles.folderInputTiny : null,
              ]}
              placeholder="Folder's description"
              placeholderTextColor="#888"
              multiline
              onChange={(e) => setFolderDescription(e.nativeEvent.text)}
              value={folderDescription}
            />
  
            <View style={[
              isLargeDevice ? styles.buttonsContainerLarge : null,
              isMediumLargeDevice ? styles.buttonsContainerMediumLarge : null,
              isSmallDevice ? styles.buttonsContainerSmall : null,
              isTinyDevice ? styles.buttonsContainerTiny : null,
            ]}>
              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.confirmButtonLarge : null,
                  isMediumLargeDevice ? styles.confirmButtonMediumLarge : null,
                  isSmallDevice ? styles.confirmButtonSmall : null,
                  isTinyDevice ? styles.confirmButtonTiny : null,
                  isLoadingAddFolder && { opacity: 0.6 } // Visual feedback when loading
                ]}
                onPress={addNewFolder}
                disabled={isLoadingAddFolder} // Disable when loading
              >
                <Text style={[
                  isLargeDevice ? styles.confirmButtonTextLarge : null,
                  isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
                  isSmallDevice ? styles.confirmButtonTextSmall : null,
                  isTinyDevice ? styles.confirmButtonTextTiny : null,
                ]}>{isLoadingAddFolder ? "Adding..." : "Confirm"}</Text>
              </TouchableOpacity>
  
              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.cancelButtonLarge : null,
                  isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
                  isSmallDevice ? styles.cancelButtonSmall : null,
                  isTinyDevice ? styles.cancelButtonTiny : null,
                ]}
                onPress={() => setAddFolderModalVisible(false)}
                disabled={isLoadingAddFolder} // Disable cancel button during folder creation
              >
                <Text style={[
                  isLargeDevice ? styles.cancelButtonTextLarge : null,
                  isMediumLargeDevice ? styles.cancelButtonTextMediumLarge : null,
                  isSmallDevice ? styles.cancelButtonTextSmall : null,
                  isTinyDevice ? styles.cancelButtonTextTiny : null,
                ]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  
      {/* Edit Folder Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editFolderModalVisible}
        onRequestClose={isLoadingOperation ? undefined : () => setEditFolderModalVisible(false)} // Disable modal close during loading
      >
        <View style={[
          isLargeDevice ? styles.addModalOverlayLarge : null,
          isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
          isSmallDevice ? styles.addModalOverlaySmall : null,
          isTinyDevice ? styles.addModalOverlayTiny : null,
        ]}>
          <View 
            style={[
              isLargeDevice ? styles.addFolderModalLarge : null,
              isMediumLargeDevice ? styles.addFolderModalMediumLarge : null,
              isSmallDevice ? styles.addFolderModalSmall : null,
              isTinyDevice ? styles.addFolderModalTiny : null,
            ]}
          >
            <Text style={[
              isLargeDevice ? styles.addFolderTitleLarge : null,
              isMediumLargeDevice ? styles.addFolderTitleMediumLarge : null,
              isSmallDevice ? styles.addFolderTitleSmall : null,
              isTinyDevice ? styles.addFolderTitleTiny : null,
            ]}>Edit Folder</Text>
  
            <TextInput
              style={[
                isLargeDevice ? styles.folderInputLarge : null,
                isMediumLargeDevice ? styles.folderInputMediumLarge : null,
                isSmallDevice ? styles.folderInputSmall : null,
                isTinyDevice ? styles.folderInputTiny : null,
              ]}
              placeholder="Folder's name"
              placeholderTextColor="#888"
              onChange={(e) => setFolderName(e.nativeEvent.text)}
              value={folderName}
            />
  
            <TextInput
              style={[
                isLargeDevice ? styles.folderInputLarge : null,
                isMediumLargeDevice ? styles.folderInputMediumLarge : null,
                isSmallDevice ? styles.folderInputSmall : null,
                isTinyDevice ? styles.folderInputTiny : null,
              ]}
              placeholder="Folder's description"
              placeholderTextColor="#888"
              multiline
              onChange={(e) => setFolderDescription(e.nativeEvent.text)}
              value={folderDescription}
            />
  
            <View style={[
              isLargeDevice ? styles.buttonsContainerLarge : null,
              isMediumLargeDevice ? styles.buttonsContainerMediumLarge : null,
              isSmallDevice ? styles.buttonsContainerSmall : null,
              isTinyDevice ? styles.buttonsContainerTiny : null,
            ]}>
              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.confirmButtonLarge : null,
                  isMediumLargeDevice ? styles.confirmButtonMediumLarge : null,
                  isSmallDevice ? styles.confirmButtonSmall : null,
                  isTinyDevice ? styles.confirmButtonTiny : null,
                  isLoadingEditFolder && { opacity: 0.6 } // Visual feedback when loading
                ]}
                onPress={saveEditedFolder}
                disabled={isLoadingEditFolder} // Disable when loading
              >
                <Text style={[
                  isLargeDevice ? styles.confirmButtonTextLarge : null,
                  isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
                  isSmallDevice ? styles.confirmButtonTextSmall : null,
                  isTinyDevice ? styles.confirmButtonTextTiny : null,
                ]}>{isLoadingEditFolder ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
  
              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.cancelButtonLarge : null,
                  isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
                  isSmallDevice ? styles.cancelButtonSmall : null,
                  isTinyDevice ? styles.cancelButtonTiny : null,
                ]}
                onPress={() => setEditFolderModalVisible(false)}
                disabled={isLoadingEditFolder} // Disable cancel button during folder editing
              >
                <Text style={[
                  isLargeDevice ? styles.cancelButtonTextLarge : null,
                  isMediumLargeDevice ? styles.cancelButtonTextMediumLarge : null,
                  isSmallDevice ? styles.cancelButtonTextSmall : null,
                  isTinyDevice ? styles.cancelButtonTextTiny : null,
                ]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  
      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmationModel}
        onRequestClose={isLoadingOperation ? undefined : () => setConfirmationModel(false)} // Disable modal close during loading
      >
        <View style={[
          isLargeDevice ? styles.addModalOverlayLarge : null,
          isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
          isSmallDevice ? styles.addModalOverlaySmall : null,
          isTinyDevice ? styles.addModalOverlayTiny : null,
        ]}>
          <View 
            style={[
              isLargeDevice ? styles.confirmationModalLarge : null,
              isMediumLargeDevice ? styles.confirmationModalMediumLarge : null,
              isSmallDevice ? styles.confirmationModalSmall : null,
              isTinyDevice ? styles.confirmationModalTiny : null,
            ]}
          >
            <Text style={[
              isLargeDevice ? styles.addFolderTitleLarge : null,
              isMediumLargeDevice ? styles.addFolderTitleMediumLarge : null,
              isSmallDevice ? styles.addFolderTitleSmall : null,
              isTinyDevice ? styles.addFolderTitleTiny : null,
            ]}>
              Delete {selectedFolders.length} folder{selectedFolders.length > 1 ? 's' : ''}?
            </Text>
  
            <View style={[
              isLargeDevice ? styles.buttonsContainerLarge : null,
              isMediumLargeDevice ? styles.buttonsContainerMediumLarge : null,
              isSmallDevice ? styles.buttonsContainerSmall : null,
              isTinyDevice ? styles.buttonsContainerTiny : null,
            ]}>
              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.confirmButtonLarge : null,
                  isMediumLargeDevice ? styles.confirmButtonMediumLarge : null,
                  isSmallDevice ? styles.confirmButtonSmall : null,
                  isTinyDevice ? styles.confirmButtonTiny : null,
                  isLoadingDeleteFolder && { opacity: 0.6 } // Visual feedback when loading
                ]}
                onPress={performDelete}
                activeOpacity={0.7} // Prevent multiple taps
                disabled={isLoadingDeleteFolder} // Disable when loading
              >
                <Text style={[
                  isLargeDevice ? styles.confirmButtonTextLarge : null,
                  isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
                  isSmallDevice ? styles.confirmButtonTextSmall : null,
                  isTinyDevice ? styles.confirmButtonTextTiny : null,
                ]}>{isLoadingDeleteFolder ? "Deleting..." : "Confirm"}</Text>
              </TouchableOpacity>
  
              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.cancelButtonLarge : null,
                  isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
                  isSmallDevice ? styles.cancelButtonSmall : null,
                  isTinyDevice ? styles.cancelButtonTiny : null,
                ]}
                onPress={() => setConfirmationModel(false)}
                activeOpacity={0.7}
                disabled={isLoadingDeleteFolder} // Disable cancel button during folder deletion
              >
                <Text style={[
                  isLargeDevice ? styles.cancelButtonTextLarge : null,
                  isMediumLargeDevice ? styles.cancelButtonTextMediumLarge : null,
                  isSmallDevice ? styles.cancelButtonTextSmall : null,
                  isTinyDevice ? styles.cancelButtonTextTiny : null,
                ]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  
      {/* Success Feedback Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={feedbackAcceptModel}
        onRequestClose={() => setFeedbackAcceptModel(false)}
      >
        <TouchableOpacity
          style={[
            isLargeDevice ? styles.addModalOverlayLarge : null,
            isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
            isSmallDevice ? styles.addModalOverlaySmall : null,
            isTinyDevice ? styles.addModalOverlayTiny : null,
          ]}
          activeOpacity={1}
          onPress={() => setFeedbackAcceptModel(false)}
        >
          <View style={[
            isLargeDevice ? styles.addFolderfeedbackLarge : null,
            isMediumLargeDevice ? styles.addFolderfeedbackMediumLarge : null,
            isSmallDevice ? styles.addFolderfeedbackSmall : null,
            isTinyDevice ? styles.addFolderfeedbackTiny : null,
          ]}>
            <Text style={[
              isLargeDevice ? styles.addFolderTitleLarge : null,
              isMediumLargeDevice ? styles.addFolderTitleMediumLarge : null,
              isSmallDevice ? styles.addFolderTitleSmall : null,
              isTinyDevice ? styles.addFolderTitleTiny : null,
            ]}>
              {selectionAction === 'delete' ? 'Delete Complete' : 'Change Processed'}
            </Text>
            <Image
              source={require("../assets/images/checked.png")}
              style={[
                isLargeDevice ? styles.feedbackIconLarge : null,
                isMediumLargeDevice ? styles.feedbackIconMediumLarge : null,
                isSmallDevice ? styles.feedbackIconSmall : null,
                isTinyDevice ? styles.feedbackIconTiny : null,
              ]}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>
      </Modal>
  
      {/* Add Competition Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={addCompetitionModalVisible}
        onRequestClose={isLoadingOperation ? undefined : () => setAddCompetitionModalVisible(false)} // Disable modal close during loading
      >
        <View style={[
          isLargeDevice ? styles.addModalOverlayLarge : null,
          isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
          isSmallDevice ? styles.addModalOverlaySmall : null,
          isTinyDevice ? styles.addModalOverlayTiny : null,
        ]}>
          <View 
            style={[
              isLargeDevice ? styles.addFolderModal2Large : null,
              isMediumLargeDevice ? styles.addFolderModal2MediumLarge : null,
              isSmallDevice ? styles.addFolderModal2Small : null,
              isTinyDevice ? styles.addFolderModal2Tiny : null,
            ]}
          >
            <Text style={[
              isLargeDevice ? styles.addFolderTitleLarge : null,
              isMediumLargeDevice ? styles.addFolderTitleMediumLarge : null,
              isSmallDevice ? styles.addFolderTitleSmall : null,
              isTinyDevice ? styles.addFolderTitleTiny : null,
            ]}>Add Competition</Text>

            <TextInput
              style={[
                isLargeDevice ? styles.folderInputLarge : null,
                isMediumLargeDevice ? styles.folderInputMediumLarge : null,
                isSmallDevice ? styles.folderInputSmall : null,
                isTinyDevice ? styles.folderInputTiny : null,
              ]}
              placeholder="Competition name"
              placeholderTextColor="#888"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.nativeEvent.text)}
            />

            <TextInput
              style={[
                isLargeDevice ? styles.folderInputLarge : null,
                isMediumLargeDevice ? styles.folderInputMediumLarge : null,
                isSmallDevice ? styles.folderInputSmall : null,
                isTinyDevice ? styles.folderInputTiny : null,
              ]}
              placeholder="Competition description"
              placeholderTextColor="#888"
              value={competitionDescription}
              onChange={(e) => setCompetitionDescription(e.nativeEvent.text)}
            />

            <TextInput
              style={[
                isLargeDevice ? styles.folderInputLarge : null,
                isMediumLargeDevice ? styles.folderInputMediumLarge : null,
                isSmallDevice ? styles.folderInputSmall : null,
                isTinyDevice ? styles.folderInputTiny : null,
              ]}
              placeholder="Number of participants"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={competitionParticipants}
              onChange={(e) => setCompetitionParticipants(e.nativeEvent.text)}
            />

            <View style={[
              isLargeDevice ? styles.buttonsContainerLarge : null,
              isMediumLargeDevice ? styles.buttonsContainerMediumLarge : null,
              isSmallDevice ? styles.buttonsContainerSmall : null,
              isTinyDevice ? styles.buttonsContainerTiny : null,
            ]}>
              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.confirmButtonLarge : null,
                  isMediumLargeDevice ? styles.confirmButtonMediumLarge : null,
                  isSmallDevice ? styles.confirmButtonSmall : null,
                  isTinyDevice ? styles.confirmButtonTiny : null,
                  isLoadingAddCompetition && { opacity: 0.6 } // Visual feedback when loading
                ]}
                onPress={addNewCompetition}
                disabled={isLoadingAddCompetition} // Disable when loading
              >
                <Text style={[
                  isLargeDevice ? styles.confirmButtonTextLarge : null,
                  isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
                  isSmallDevice ? styles.confirmButtonTextSmall : null,
                  isTinyDevice ? styles.confirmButtonTextTiny : null,
                ]}>{isLoadingAddCompetition ? "Adding..." : ConfirmButtomText}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.cancelButtonLarge : null,
                  isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
                  isSmallDevice ? styles.cancelButtonSmall : null,
                  isTinyDevice ? styles.cancelButtonTiny : null,
                ]}
                onPress={() => setAddCompetitionModalVisible(false)}
                disabled={isLoadingAddCompetition} // Disable cancel button during competition creation
              >
                <Text style={[
                  isLargeDevice ? styles.cancelButtonTextLarge : null,
                  isMediumLargeDevice ? styles.cancelButtonTextMediumLarge : null,
                  isSmallDevice ? styles.cancelButtonTextSmall : null,
                  isTinyDevice ? styles.cancelButtonTextTiny : null,
                ]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para exportar folders */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showExportModal}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            isLargeDevice ? styles.modalContainerLarge : null,
            isMediumLargeDevice ? styles.modalContainerMediumLarge : null,
            isSmallDevice ? styles.modalContainerSmall : null,
            isTinyDevice ? styles.modalContainerTiny : null,
          ]}>
            <Text style={[
              isLargeDevice ? styles.modalTitleLarge : null,
              isMediumLargeDevice ? styles.modalTitleMediumLarge : null,
              isSmallDevice ? styles.modalTitleSmall : null,
              isTinyDevice ? styles.modalTitleTiny : null,
            ]}>Exportar Folder</Text>
            
            <Text style={[
              isLargeDevice ? styles.modalLabelLarge : null,
              isMediumLargeDevice ? styles.modalLabelMediumLarge : null,
              isSmallDevice ? styles.modalLabelSmall : null,
              isTinyDevice ? styles.modalLabelTiny : null,
            ]}>Selecciona el folder que deseas exportar:</Text>
            
            {/* Lista de folders del usuario */}
            <ScrollView style={{ width: '100%', maxHeight: 200 }}>
              {userFolders.length === 0 ? (
                <Text style={styles.noFoldersText}>No tienes folders disponibles para exportar.</Text>
              ) : (
                userFolders.map((folder) => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[
                      styles.folderItem,
                      selectedFolder?.id === folder.id && styles.selectedFolderItem
                    ]}
                    onPress={() => setSelectedFolder(folder)}
                  >
                    <Text style={styles.folderItemText}>{folder.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.generateButtonLarge : null,
                isMediumLargeDevice ? styles.generateButtonMediumLarge : null,
                isSmallDevice ? styles.generateButtonSmall : null,
                isTinyDevice ? styles.generateButtonTiny : null,
                !selectedFolder && styles.disabledButton,
                isExporting && styles.loadingButton
              ]}
              onPress={handleExportFolder}
              disabled={!selectedFolder || isExporting}
            >
              <Text style={[
                isLargeDevice ? styles.buttonTextLarge : null,
                isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
                isSmallDevice ? styles.buttonTextSmall : null,
                isTinyDevice ? styles.buttonTextTiny : null,
              ]}>
                {isExporting ? 'Exportando...' : 'Exportar Folder'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.closeButtonLarge : null,
                isMediumLargeDevice ? styles.closeButtonMediumLarge : null,
                isSmallDevice ? styles.closeButtonSmall : null,
                isTinyDevice ? styles.closeButtonTiny : null,
              ]}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={[
                isLargeDevice ? styles.closeButtonTextLarge : null,
                isMediumLargeDevice ? styles.closeButtonTextMediumLarge : null,
                isSmallDevice ? styles.closeButtonTextSmall : null,
                isTinyDevice ? styles.closeButtonTextTiny : null,
              ]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para importar folders */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showImportModal}
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            isLargeDevice ? styles.modalContainerLarge : null,
            isMediumLargeDevice ? styles.modalContainerMediumLarge : null,
            isSmallDevice ? styles.modalContainerSmall : null,
            isTinyDevice ? styles.modalContainerTiny : null,
          ]}>
            <Text style={[
              isLargeDevice ? styles.modalTitleLarge : null,
              isMediumLargeDevice ? styles.modalTitleMediumLarge : null,
              isSmallDevice ? styles.modalTitleSmall : null,
              isTinyDevice ? styles.modalTitleTiny : null,
            ]}>Importar Folder</Text>
            
            <Text style={[
              isLargeDevice ? styles.modalLabelLarge : null,
              isMediumLargeDevice ? styles.modalLabelMediumLarge : null,
              isSmallDevice ? styles.modalLabelSmall : null,
              isTinyDevice ? styles.modalLabelTiny : null,
            ]}>Selecciona el archivo del folder que deseas importar:</Text>
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.generateButtonLarge : null,
                isMediumLargeDevice ? styles.generateButtonMediumLarge : null,
                isSmallDevice ? styles.generateButtonSmall : null,
                isTinyDevice ? styles.generateButtonTiny : null,
                isImporting && styles.loadingButton
              ]}
              onPress={handleImportFolder}
              disabled={isImporting}
            >
              <Text style={[
                isLargeDevice ? styles.buttonTextLarge : null,
                isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
                isSmallDevice ? styles.buttonTextSmall : null,
                isTinyDevice ? styles.buttonTextTiny : null,
              ]}>
                {isImporting ? 'Importando...' : 'Importar Folder'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.closeButtonLarge : null,
                isMediumLargeDevice ? styles.closeButtonMediumLarge : null,
                isSmallDevice ? styles.closeButtonSmall : null,
                isTinyDevice ? styles.closeButtonTiny : null,
              ]}
              onPress={() => setShowImportModal(false)}
            >
              <Text style={[
                isLargeDevice ? styles.closeButtonTextLarge : null,
                isMediumLargeDevice ? styles.closeButtonTextMediumLarge : null,
                isSmallDevice ? styles.closeButtonTextSmall : null,
                isTinyDevice ? styles.closeButtonTextTiny : null,
              ]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Carga Unificada */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showLoadingModal}
        onRequestClose={() => {}} // No permitir cerrar durante la carga
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Animated.View style={[
            {
              backgroundColor: 'white',
              borderRadius: isLargeDevice ? 20 : isMediumLargeDevice ? 18 : isSmallDevice ? 16 : 14,
              padding: isLargeDevice ? 40 : isMediumLargeDevice ? 35 : isSmallDevice ? 30 : 25,
              width: isLargeDevice ? 380 : isMediumLargeDevice ? 340 : isSmallDevice ? 300 : 280,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 10,
              },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 15,
            },
            {
              opacity: loadingOpacityAnim,
              transform: [{ scale: loadingScaleAnim }]
            }
          ]}>
            {/* Icono de carga animado */}
            <Animated.View style={[
              {
                width: isLargeDevice ? 80 : isMediumLargeDevice ? 70 : isSmallDevice ? 60 : 50,
                height: isLargeDevice ? 80 : isMediumLargeDevice ? 70 : isSmallDevice ? 60 : 50,
                borderRadius: isLargeDevice ? 40 : isMediumLargeDevice ? 35 : isSmallDevice ? 30 : 25,
                borderWidth: 4,
                borderColor: '#007AFF',
                borderTopColor: 'transparent',
                marginBottom: isLargeDevice ? 30 : isMediumLargeDevice ? 25 : isSmallDevice ? 20 : 18,
              },
              {
                transform: [{
                  rotate: loadingSpinAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg']
                  })
                }]
              }
            ]} />

            {/* Mensaje de carga */}
            <Text style={{
              fontSize: isLargeDevice ? 20 : isMediumLargeDevice ? 18 : isSmallDevice ? 16 : 14,
              fontFamily: "Rajdhani-Bold",
              color: '#333',
              textAlign: 'center',
              marginBottom: isLargeDevice ? 20 : isMediumLargeDevice ? 18 : isSmallDevice ? 16 : 14,
            }}>
              {loadingMessage}
            </Text>

            {/* Barra de progreso */}
            <View style={{
              width: '100%',
              height: isLargeDevice ? 8 : isMediumLargeDevice ? 7 : isSmallDevice ? 6 : 5,
              backgroundColor: '#E0E0E0',
              borderRadius: isLargeDevice ? 4 : isMediumLargeDevice ? 3.5 : isSmallDevice ? 3 : 2.5,
              overflow: 'hidden',
              marginBottom: isLargeDevice ? 15 : isMediumLargeDevice ? 12 : isSmallDevice ? 10 : 8,
            }}>
              <Animated.View style={{
                height: '100%',
                backgroundColor: '#007AFF',
                width: `${loadingProgress}%`,
                borderRadius: isLargeDevice ? 4 : isMediumLargeDevice ? 3.5 : isSmallDevice ? 3 : 2.5,
              }} />
            </View>

            {/* Porcentaje */}
            <Text style={{
              fontSize: isLargeDevice ? 16 : isMediumLargeDevice ? 15 : isSmallDevice ? 14 : 12,
              fontFamily: "Rajdhani-medium",
              color: '#666',
              textAlign: 'center',
            }}>
              {Math.round(loadingProgress)}%
            </Text>
          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F0F7',
  },
  
  // Header styles - Large Device (width >= 1368)
  headerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
       backgroundColor: '#999',
    borderRadius: 30,
    margin: 16,
  },
  // Header styles - Medium Large Device (width >= 1200 && width < 1368)
  headerMediumLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#999',
    borderRadius: 28,
    margin: 14,
  },
  // Header styles - Small Device (width >= 945 && width < 1200)
  headerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#999',
    borderRadius: 25,
    margin: 12,
  },
  // Header styles - Tiny Device (width < 945)
  headerTiny: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#999',
    borderRadius: 30,
    margin: 16,
  },
  
  // Back button styles - Large Device
  backButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Back button styles - Medium Large Device
  backButtonMediumLarge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Back button styles - Small Device
  backButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Back button styles - Tiny Device
 
  backButtonTiny: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Header title styles - Large Device
  headerTitleLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 3,
    top: 1,
    color: '#fff',
    fontFamily: 'Rajdhani-medium',
  },
  // Header title styles - Medium Large Device
  headerTitleMediumLarge: {
    fontSize: 21,
    fontWeight: 'bold',
    marginLeft: 3,
    top: 1,
    color: '#fff',
    fontFamily: 'Rajdhani-medium',
  },
  // Header title styles - Small Device
  headerTitleSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 3,
    top: 1,
    color: '#fff',
    fontFamily: 'Rajdhani-medium',
  },
  // Header title styles - Tiny Device
  headerTitleTiny: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 3,
    color: '#fff',
    fontFamily: 'Rajdhani-medium',
  },
  
  // Cancel selection text styles - Large Device
  cancelSelectionTextLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    padding: 8,
  },
  // Cancel selection text styles - Medium Large Device
  cancelSelectionTextMediumLarge: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    padding: 7,
  },
  // Cancel selection text styles - Small Device
  cancelSelectionTextSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    padding: 6,
  },
  // Cancel selection text styles - Tiny Device
  cancelSelectionTextTiny: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    padding: 8,
  },
  
  // Scroll view styles - Large Device
  scrollViewLarge: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Scroll view styles - Medium Large Device
  scrollViewMediumLarge: {
    flex: 1,
    paddingHorizontal: 18,
  },
  // Scroll view styles - Small Device
  scrollViewSmall: {
    flex: 1,
    paddingHorizontal: 15,
  },
  // Scroll view styles - Tiny Device
  scrollViewTiny: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Folders grid styles - Large Device
  foldersGridLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'flex-start',
  },
  // Folders grid styles - Medium Large Device
  foldersGridMediumLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 7,
    justifyContent: 'flex-start',
  },
  // Folders grid styles - Small Device
  foldersGridSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    justifyContent: 'flex-start',
  },
  // Folders grid styles - Tiny Device
  foldersGridTiny: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
    justifyContent: 'flex-start',
  },
  
  folderItemContainer: {
    width: '33.0%',
    marginBottom: 12,
  },
  
  folderDragContainer: {
    width: '100%',
    height: '100%',
    // Permite que el contenido se muestre correctamente
  },
  
  // Folder item styles - Large Device
  folderItemLarge: {
    height: 160,
    width: '96%',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 8,
    position: 'relative',
  },
  // Folder item styles - Medium Large Device
  folderItemMediumLarge: {
    height: 150,
    width: '96%',
    backgroundColor: '#F1F3F5',
    borderRadius: 9,
    padding: 7,
    position: 'relative',
  },
  // Folder item styles - Small Device
  folderItemSmall: {
    height: 140,
    width: '96%',
    backgroundColor: '#F1F3F5',
    borderRadius: 8,
    padding: 6,
    position: 'relative',
  },
  // Folder item styles - Tiny Device
  folderItemTiny: {
    height: 125,
    backgroundColor: '#F1F3F5',
    borderRadius: 8,
    padding: 6,
    position: 'relative',
  },
  
  selectedFolder: {
    backgroundColor: '#DADADA',
    borderWidth: 1,
    borderColor: '#4285F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  selectedForSwapFolder: {
    backgroundColor: 'rgba(0, 170, 255, 0.15)',
    borderWidth: 3,
    borderColor: '#00AAFF',
    shadowColor: '#00AAFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 15,
  },
  
  folderContent: {
    alignItems: 'stretch',
  },
  
  // Folder icon styles - Large Device
  folderIconLarge: {
    width: 90,
    height: 95,
    borderRadius: 5,
    marginBottom: 6,
    position: 'absolute',
    top: 20,
    left: 20,
  },
  // Folder icon styles - Medium Large Device
  folderIconMediumLarge: {
    width: 85,
    height: 90,
    borderRadius: 5,
    marginBottom: 5,
    position: 'absolute',
    top: 18,
    left: 18,
  },
  // Folder icon styles - Small Device
  folderIconSmall: {
    width: 75,
    height: 80,
    borderRadius: 5,
    marginBottom: 4,
    position: 'absolute',
    top: 15,
    left: 12,
  },
  // Folder icon styles - Tiny Device
  folderIconTiny: {
    width: 50,
    height: 55,
    borderRadius: 5,
    marginBottom: 4,
    position: 'absolute',
    top: 10,
    left: 5,
  },
  
  folderType1: {},
  folderType2: {},
  
  // Folder info styles - Large Device
  folderInfoLarge: {
    width: '70%',
    height: 135,
    right: 5,
    position: 'absolute',
  },
  // Folder info styles - Medium Large Device
  folderInfoMediumLarge: {
    width: '68%',
    height: 125,
    right: 5,
    position: 'absolute',
  },
  // Folder info styles - Small Device
  folderInfoSmall: {
    width: '67%',
    height: 115,
    right: 5,
    position: 'absolute',
  },
  // Folder info styles - Tiny Device
  folderInfoTiny: {
    width: '65%',
    height: 100,
    right: 5,
    position: 'absolute',
  },
  
  // Folder title styles - Large Device
  folderTitleLarge: {
    fontSize: 40,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  // Folder title styles - Medium Large Device
  folderTitleMediumLarge: {
    fontSize: 17,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  // Folder title styles - Small Device
  folderTitleSmall: {
    fontSize: 32,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  // Folder title styles - Tiny Device
  folderTitleTiny: {
    fontSize: 24,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  
  // Folder description styles - Large Device
  folderDescriptionLarge: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 1,
  },
  // Folder description styles - Medium Large Device
  folderDescriptionMediumLarge: {
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 2,
  },
  // Folder description styles - Small Device
  folderDescriptionSmall: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 3,
    marginLeft: 4,
  },
  // Folder description styles - Tiny Device
  folderDescriptionTiny: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 2,
    marginLeft: 4,
    marginBottom: 7,
  },
  
  // Folder footer styles - Large Device
  folderFooterLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  // Folder footer styles - Medium Large Device
  folderFooterMediumLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  // Folder footer styles - Small Device
  folderFooterSmall: {
    textAlign: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  // Folder footer styles - Tiny Device
  folderFooterTiny: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  
  // Date text styles - Large Device
  dateTextLarge: {
    fontSize: 25,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute',
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center', 
    bottom: 0,
  },
  // Date text styles - Medium Large Device
  dateTextMediumLarge: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute',
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center', 
    bottom: 2,
  },
  // Date text styles - Small Device
  dateTextSmall: {
    fontSize: 19,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute', 
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center', 
    bottom: 5,
  },
  // Date text styles - Tiny Device
  dateTextTiny: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute', 
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center', 
    bottom: 1,
  },
  
  checkmark: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  
  // Button container styles - Large Device
  buttonContainerLarge: {
    padding: 16,
  },
  // Button container styles - Medium Large Device
  buttonContainerMediumLarge: {
    padding: 14,
  },
  // Button container styles - Small Device
  buttonContainerSmall: {
    padding: 12,
  },
  // Button container styles - Tiny Device
  buttonContainerTiny: {
    padding: 16,
  },
  
  // Add button styles - Large Device
  addButtonLarge: {
    backgroundColor: '#0047AB',
    borderRadius: 12,
    padding: 12,
    width: '30%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  // Add button styles - Medium Large Device
  addButtonMediumLarge: {
    backgroundColor: '#0047AB',
    borderRadius: 11,
    padding: 11,
    width: '35%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  // Add button styles - Small Device
  addButtonSmall: {
    backgroundColor: '#0047AB',
    borderRadius: 10,
    padding: 10,
    width: '45%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  // Add button styles - Tiny Device
  addButtonTiny: {
    backgroundColor: '#0047AB',
    borderRadius: 10,
    padding: 8,
    width: '50%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  
  // Add button text styles - Large Device
  addButtonTextLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 30,
  },
  // Add button text styles - Medium Large Device
  addButtonTextMediumLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 26,
  },
  // Add button text styles - Small Device
  addButtonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  // Add button text styles - Tiny Device
  addButtonTextTiny: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  
  // Edit confirm button styles - Large Device
  editConfirmButtonLarge: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    padding: 12,
    width: '30%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  // Edit confirm button styles - Medium Large Device
  editConfirmButtonMediumLarge: {
    backgroundColor: '#4285F4',
    borderRadius: 11,
    padding: 11,
    width: '35%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  // Edit confirm button styles - Small Device
  editConfirmButtonSmall: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
    padding: 10,
    width: '45%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  // Edit confirm button styles - Tiny Device
  editConfirmButtonTiny: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
    padding: 8,
    width: '50%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  
  // Edit confirm button text styles - Large Device
  editConfirmButtonTextLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 30,
  },
  // Edit confirm button text styles - Medium Large Device
  editConfirmButtonTextMediumLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 26,
  },
  // Edit confirm button text styles - Small Device
  editConfirmButtonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  // Edit confirm button text styles - Tiny Device
  editConfirmButtonTextTiny: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  
  // Delete button container styles - Large Device
  deleteButtonContainerLarge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  // Delete button container styles - Medium Large Device
  deleteButtonContainerMediumLarge: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    zIndex: 10,
  },
  // Delete button container styles - Small Device
  deleteButtonContainerSmall: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    zIndex: 10,
  },
  // Delete button container styles - Tiny Device
  deleteButtonContainerTiny: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  
  // Delete button styles - Large Device
  deleteButtonLarge: {
    backgroundColor: '#DC3545',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  // Delete button styles - Medium Large Device
  deleteButtonMediumLarge: {
    backgroundColor: '#DC3545',
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  // Delete button styles - Small Device
  deleteButtonSmall: {
    backgroundColor: '#DC3545',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  // Delete button styles - Tiny Device
  deleteButtonTiny: {
    backgroundColor: '#DC3545',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  
  // Modal overlay styles - Large Device
  modalOverlayLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  // Modal overlay styles - Medium Large Device
  modalOverlayMediumLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  // Modal overlay styles - Small Device
  modalOverlaySmall: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  // Modal overlay styles - Tiny Device
  modalOverlayTiny: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  
  // Menu modal styles - Large Device
  menuModalLarge: {
    backgroundColor: '#999',
    width: 200,
    marginTop: 60,
    marginRight: 25,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Menu modal styles - Medium Large Device
  menuModalMediumLarge: {
    backgroundColor: '#999',
    width: 180,
    marginTop: 55,
    marginRight: 22,
    borderRadius: 7,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Menu modal styles - Small Device
  menuModalSmall: {
    backgroundColor: '#999',
    width: 160,
    marginTop: 50,
    marginRight: 20,
    borderRadius: 6,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Menu modal styles - Tiny Device
  menuModalTiny: {
    backgroundColor: '#999',
    width: 140,
    marginTop: 60,
    marginRight: 20,
    borderRadius: 6,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  // Menu item styles - Large Device
  menuItemLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  // Menu item styles - Medium Large Device
  menuItemMediumLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  // Menu item styles - Small Device
  menuItemSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  // Menu item styles - Tiny Device
  menuItemTiny: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  
  // Menu icon placeholder styles - Large Device
  menuIconPlaceholderLarge: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  // Menu icon placeholder styles - Medium Large Device
  menuIconPlaceholderMediumLarge: {
    width: 22,
    height: 22,
    marginRight: 14,
  },
  // Menu icon placeholder styles - Small Device
  menuIconPlaceholderSmall: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  // Menu icon placeholder styles - Tiny Device
  menuIconPlaceholderTiny: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  
  // Menu text styles - Large Device
  menuTextLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Menu text styles - Medium Large Device
  menuTextMediumLarge: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  // Menu text styles - Small Device
  menuTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Menu text styles - Tiny Device
  menuTextTiny: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Menu divider styles - Tiny Device
  menuDividerTiny: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // Add modal overlay styles - Large Device
  addModalOverlayLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add modal overlay styles - Medium Large Device
  addModalOverlayMediumLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add modal overlay styles - Small Device
  addModalOverlaySmall: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add modal overlay styles - Tiny Device
  addModalOverlayTiny: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Feedback modal styles - Large Device
  addFolderfeedbackLarge: {
    backgroundColor: '#fff',
    width: '30%',
    height: 300,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Feedback modal styles - Medium Large Device
  addFolderfeedbackMediumLarge: {
    backgroundColor: '#fff',
    width: '40%',
    height: 320,
    maxHeight: '80%',
    borderRadius: 18,
    padding: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Feedback modal styles - Small Device
  addFolderfeedbackSmall: {
    backgroundColor: '#fff',
    width: '50%',
    height: 280,
    maxHeight: '85%',
    borderRadius: 15,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Feedback modal styles - Tiny Device
  addFolderfeedbackTiny: {
    backgroundColor: '#fff',
    width: '50%',
    height: 295,
    maxHeight: '96%',
    borderRadius: 15,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  // Feedback icon styles - Large Device
  feedbackIconLarge: {
    width: 200,
    height: 200,
    borderRadius: 5,
    marginBottom: 6,
    position: 'relative',
    alignSelf: 'center',
    top: 5,
  },
  // Feedback icon styles - Medium Large Device
  feedbackIconMediumLarge: {
    width: 180,
    height: 180,
    borderRadius: 5,
    marginBottom: 6,
    position: 'relative',
    alignSelf: 'center',
    top: 5,
  },
  // Feedback icon styles - Small Device
  feedbackIconSmall: {
    width: 160,
    height: 160,
    borderRadius: 5,
    marginBottom: 6,
    position: 'relative',
    alignSelf: 'center',
    top: 5,
  },
  // Feedback icon styles - Tiny Device
  feedbackIconTiny: {
    width: 200,
    height: 200,
    borderRadius: 5,
    marginBottom: 6,
    position: 'relative',
    alignSelf: 'center',
    top: 5,
  },
  
  // Confirmation modal styles - Large Device
  confirmationModalLarge: {
    backgroundColor: '#fff',
    width: '50%',
    height: 170,
    maxHeight: '80%',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Confirmation modal styles - Medium Large Device
  confirmationModalMediumLarge: {
    backgroundColor: '#fff',
    width: '60%',
    height: 160,
    maxHeight: '80%',
    borderRadius: 9,
    padding: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Confirmation modal styles - Small Device
  confirmationModalSmall: {
    backgroundColor: '#fff',
    width: '70%',
    height: 150,
    maxHeight: '80%',
    borderRadius: 8,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Confirmation modal styles - Tiny Device
  confirmationModalTiny: {
    backgroundColor: '#fff',
    width: '70%',
    height: 150,
    maxHeight: '80%',
    borderRadius: 10,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  // Add folder modal styles - Large Device
  addFolderModalLarge: {
    backgroundColor: '#fff',
    width: '50%',
    height: 305,
    maxHeight: '80%',
    borderRadius: 10,
    padding: 22,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add folder modal styles - Medium Large Device
  addFolderModalMediumLarge: {
    backgroundColor: '#fff',
    width: '60%',
    height: 330,
    maxHeight: '80%',
    borderRadius: 9,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add folder modal styles - Small Device
  addFolderModalSmall: {
    backgroundColor: '#fff',
    width: '70%',
    height: 225,
    maxHeight: '80%',
    borderRadius: 8,
    padding: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add folder modal styles - Tiny Device
  addFolderModalTiny: {
    backgroundColor: '#fff',
    width: '70%',
    height: 260,
    maxHeight: '90%',
    borderRadius: 10,
    paddingTop: 15,
    paddingLeft: 15,
    paddingRight: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

   menuDividerLarge: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Menu divider styles - Medium Large Device
  menuDividerMediumLarge: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Menu divider styles - Small Device
  menuDividerSmall: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  

  // Add competition modal styles - Large Device
  addFolderModal2Large: {
    backgroundColor: '#fff',
    width: '50%',
    height: 340,
    maxHeight: '80%',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add competition modal styles - Medium Large Device
  addFolderModal2MediumLarge: {
    backgroundColor: '#fff',
    width: '60%',
    height: 395,
    maxHeight: '80%',
    borderRadius: 9,
    padding: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add competition modal styles - Small Device
  addFolderModal2Small: {
    backgroundColor: '#fff',
    width: '70%',
    height: 275,
    maxHeight: '85%',
    borderRadius: 8,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add competition modal styles - Tiny Device
  addFolderModal2Tiny: {
    backgroundColor: '#fff',
    width: '70%',
    height: 310,
    maxHeight: '97%',
    borderRadius: 10,
    paddingTop: 15,
    paddingLeft: 15,
    paddingRight: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  // Add folder title styles - Large Device
  addFolderTitleLarge: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Rajdhani-medium',
  },
  // Add folder title styles - Medium Large Device
  addFolderTitleMediumLarge: {
    fontSize: 36,
    textAlign: 'center',
    marginBottom: 18,
    fontFamily: 'Rajdhani-medium',
  },
  // Add folder title styles - Small Device
  addFolderTitleSmall: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Rajdhani-medium',
  },
  // Add folder title styles - Tiny Device
  addFolderTitleTiny: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Rajdhani-medium',
  },
  
  // Folder input styles - Large Device
  folderInputLarge: {
    borderColor: '#ddd',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    fontSize: 15,
  },
  // Folder input styles - Medium Large Device
  folderInputMediumLarge: {
    borderColor: '#ddd',
    backgroundColor: '#F8F8F8',
    borderRadius: 9,
    padding: 9,
    marginBottom: 14,
    fontSize: 14,
  },
  // Folder input styles - Small Device
  folderInputSmall: {
    borderColor: '#ddd',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    fontSize: 13,
  },
  // Folder input styles - Tiny Device
  folderInputTiny: {
    borderColor: '#ddd',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    fontSize: 15,
  },
  
  // Buttons container styles - Large Device
  buttonsContainerLarge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Buttons container styles - Medium Large Device
  buttonsContainerMediumLarge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Buttons container styles - Small Device
  buttonsContainerSmall: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Buttons container styles - Tiny Device
  buttonsContainerTiny: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Confirm button styles - Large Device
  confirmButtonLarge: {
    backgroundColor: '#0047AB',
    borderRadius: 10,
    padding: 12,
    width: '40%',
    shadowColor: '#000',
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 2.5 },
    shadowOpacity: 0.55,
    shadowRadius: 3.84,
    elevation: 5,
    marginRight: 50,
    alignItems: 'center',
  },
  // Confirm button styles - Medium Large Device
  confirmButtonMediumLarge: {
    backgroundColor: '#0047AB',
    borderRadius: 9,
    padding: 11,
    width: '40%',
    shadowColor: '#000',
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 2.5 },
    shadowOpacity: 0.55,
    shadowRadius: 3.84,
    elevation: 5,
    marginRight: 40,
    alignItems: 'center',
  },
  // Confirm button styles - Small Device
  confirmButtonSmall: {
    backgroundColor: '#0047AB',
    borderRadius: 8,
    padding: 10,
    width: '40%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 3,
    elevation: 5,
    marginRight: 35,
    alignItems: 'center',
  },
  // Confirm button styles - Tiny Device
  confirmButtonTiny: {
    backgroundColor: '#0047AB',
    borderRadius: 8,
    padding: 10,
    width: '40%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 3,
    elevation: 5,
    marginRight: 30,
    alignItems: 'center',
  },
  
  // Confirm button text styles - Large Device
  confirmButtonTextLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 26,
  },
  // Confirm button text styles - Medium Large Device
  confirmButtonTextMediumLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
  },
  // Confirm button text styles - Small Device
  confirmButtonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  // Confirm button text styles - Tiny Device
  confirmButtonTextTiny: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  
  // Cancel button styles - Large Device
  cancelButtonLarge: {
    backgroundColor: '#DC3545',
    borderRadius: 10,
    padding: 12,
    marginLeft: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2.5 },
    shadowOpacity: 0.55,
    shadowRadius: 3.84,
    elevation: 5,
    width: '40%',
    alignItems: 'center',
  },
  // Cancel button styles - Medium Large Device
  cancelButtonMediumLarge: {
    backgroundColor: '#DC3545',
    borderRadius: 9,
    padding: 11,
    marginLeft: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2.5 },
    shadowOpacity: 0.55,
    shadowRadius: 3.84,
    elevation: 5,
    width: '40%',
    alignItems: 'center',
  },
  // Cancel button styles - Small Device
  cancelButtonSmall: {
    backgroundColor: '#DC3545',
    borderRadius: 8,
    padding: 10,
    marginLeft: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 3,
    elevation: 5,
    width: '40%',
    alignItems: 'center',
  },
  // Cancel button styles - Tiny Device
  cancelButtonTiny: {
    backgroundColor: '#DC3545',
    borderRadius: 8,
    padding: 10,
    marginLeft: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 3,
    elevation: 5,
    width: '40%',
    alignItems: 'center',
  },
  
  // Cancel button text styles - Large Device
  cancelButtonTextLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 26,
  },
  // Cancel button text styles - Medium Large Device
  cancelButtonTextMediumLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
  },
  // Cancel button text styles - Small Device
  cancelButtonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  // Cancel button text styles - Tiny Device
  cancelButtonTextTiny: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },

  // Modal overlay styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal container styles - Large Device
  modalContainerLarge: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    width: '85%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainerMediumLarge: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    width: '80%',
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainerSmall: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainerTiny: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    width: '95%',
    maxHeight: '65%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Modal title styles
  modalTitleLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#004aad',
    textAlign: 'center',
  },
  modalTitleMediumLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#004aad',
    textAlign: 'center',
  },
  modalTitleSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#004aad',
    textAlign: 'center',
  },
  modalTitleTiny: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
    color: '#004aad',
    textAlign: 'center',
  },

  // Modal label styles
  modalLabelLarge: {
    fontSize: 18,
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  modalLabelMediumLarge: {
    fontSize: 16,
    marginBottom: 13,
    color: '#333',
    textAlign: 'center',
  },
  modalLabelSmall: {
    fontSize: 14,
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  modalLabelTiny: {
    fontSize: 12,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },

  // Folder item styles
  folderItem: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedFolderItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  folderItemText: {
    fontSize: 16,
    color: '#333',
  },
  noFoldersText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },

  // Generate button styles
  generateButtonLarge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    width: '80%',
    alignItems: 'center',
  },
  generateButtonMediumLarge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 7,
    marginTop: 18,
    width: '80%',
    alignItems: 'center',
  },
  generateButtonSmall: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 16,
    width: '80%',
    alignItems: 'center',
  },
  generateButtonTiny: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 5,
    marginTop: 14,
    width: '80%',
    alignItems: 'center',
  },

  // Button text styles
  buttonTextLarge: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonTextMediumLarge: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSmall: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonTextTiny: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Close button styles
  closeButtonLarge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    width: '80%',
    alignItems: 'center',
  },
  closeButtonMediumLarge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 7,
    marginTop: 9,
    width: '80%',
    alignItems: 'center',
  },
  closeButtonSmall: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 8,
    width: '80%',
    alignItems: 'center',
  },
  closeButtonTiny: {
    backgroundColor: '#f44336',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 5,
    marginTop: 7,
    width: '80%',
    alignItems: 'center',
  },

  // Close button text styles
  closeButtonTextLarge: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButtonTextMediumLarge: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButtonTextSmall: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeButtonTextTiny: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Disabled and loading button styles
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  loadingButton: {
    backgroundColor: '#999999',
  }
});

export default MainMenu;