

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { useFonts } from "expo-font";
import { getAllFoldersByParent, updateFolder } from "../Database/database";
import { getFolderById } from '../Database/database';

// Normaliza las posiciones de las carpetas hijas de un parentId
const normalizeFolderPositions = async (parentId: number | null) => {
  const folders = await getAllFoldersByParent(parentId);
  // Ordenar por posición actual para mantener el orden
  folders.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].position !== i) {
      await updateFolder(folders[i].id, { position: i });
    }
  }
};
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
  View,
  Platform
} from 'react-native';
import {
  deleteCompetencesByFolderId,
  deleteFolder,
  deleteMainTableByCompetenceId,
  deleteRateGeneralByTableId,
  exportFolderData,
  exportFolderZip,
  getCompetencesByFolderId,
  getFolders,
  reorderFolders,
  getFoldersOrderedByPosition,
  getMainTablesByCompetenceId,
  importFolderData,
  importFolderZip,
  insertCompetence, insertFolder, insertMainTable, insertRateGeneral, updateFolderPositions,
  deleteCompetence, updateCompetence,
  getRootFoldersByUserId,
  getFoldersByUserIdAndParent,
  getSubfolders,
  getAllRootFolders,
  getAllSubfolders,
  getFolderPath,
  canMoveFolder,
  hasSubfolders,
  countSubfolders,
  deleteFolderRecursively
} from "../Database/database"; // Adjust the path based on your project structure
import { GridDraggableItem } from "../components/GridDraggableItem";
import CustomNumberPadOptimized from '@/components/CustomNumberPadOptimized_competition';
const { width, height } = Dimensions.get("window");
var isLargeDevice = false;
var isMediumLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;

if (width >= 1368 ) {
  isLargeDevice = true;
} else if (width >= 1200 && width < 1368) {
  isMediumLargeDevice = true;
} else if (width >= 960 && width < 1200) {
  isSmallDevice = true;
} else if (width < 960) {
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
  onNavigateToFolder?: (folderId: number) => void; // ✨ NUEVO: Para navegar a subcarpetas
  hasSubfolders?: boolean; // ✨ NUEVO: Indica si tiene subcarpetas
  moveCompetitionMode?: boolean;
  handleSelectFolderForCompetitionMove?: (folderId: number) => void;
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
  position?: number;
  parentId?: number | null; // ID de la carpeta padre (null para carpetas raíz)
  level?: number; // Nivel de profundidad (0 para raíz, 1 para subcarpetas, etc.)
  hasSubfolders?: boolean; // Indica si tiene subcarpetas
}

interface CompetitionItemProps {
  id: number;
  title: string;
  description: string;
  date: string;
  type: string;
  participants: number;
  selected?: boolean;
  folderType: 1 | 2;
  animationDelay?: number;
  selectionMode?: boolean;
  folderId: number;
  gender: boolean; // mag and wag
  onCardHold?: (id: number) => void; // Para manejar el tap-to-swap
  onSelect?: (id: number) => void;
  moveCompetitionMode?: boolean;
  setCompetitionToMove?: (competition: any) => void;
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
  onCardPress = () => {},
  onNavigateToFolder = () => {}, // ✨ NUEVO: Función para navegar a subcarpetas
  hasSubfolders = false, // ✨ NUEVO: Indica si tiene subcarpetas
  moveCompetitionMode = false,
  handleSelectFolderForCompetitionMove,
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
    // Si está activo el modo mover competencia, mover la competencia aquí
    if (moveCompetitionMode && typeof handleSelectFolderForCompetitionMove === 'function') {
      handleSelectFolderForCompetitionMove(id);
      return;
    }
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
    // Ahora el long press abre el modal de opciones de carpeta
    setLongPressActive(true);
    Vibration.vibrate(50); // Feedback háptico
    onCardPress(id); // Abrir modal de opciones
    // Resetear flag después de más tiempo para evitar conflictos con tap
    setTimeout(() => {
      setLongPressActive(false);
    }, 1000);
  };

  // Funciones para manejar press in/out
  const handlePressIn = () => {
    if (selectionMode || isSwapping) return;
    // Ahora el long press es de 1 segundo para abrir el modal de opciones
    longPressTimer.current = setTimeout(() => {
      handleLongPress();
    }, 1000) as unknown as number; // 1000ms para long press (abrir modal de opciones)
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
      // ✨ CAMBIO: Navegar un nivel más profundo usando la prop
      console.log('Navigating into folder:', folderId);
      onNavigateToFolder(folderId);
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
              {/* ✨ NUEVO: Indicador visual para carpetas con subcarpetas */}
              {hasSubfolders && (
                <Text style={{
                  fontSize: isLargeDevice ? 14 : isMediumLargeDevice ? 13 : isSmallDevice ? 12 : 11,
                  color: '#007AFF',
                  marginLeft: 5
                }}>
                  📁
                </Text>
              )}
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

const CompetitionItem: React.FC<CompetitionItemProps> = ({
  id,
  title,
  description,
  date,
  type,
  participants,
  selected = false,
  folderType,
  gender,
  animationDelay = 0,
  selectionMode = false,
  folderId,
  onCardHold = () => {},
  onSelect = () => {},
  moveCompetitionMode = false,
  setCompetitionToMove,
}) => {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [longPressActive, setLongPressActive] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
      ]).start();
    }, animationDelay);
  }, []);

  // Modificado: Soporte para modo mover competencia
  const handleCardTap = () => {
    if (longPressActive) return;
    if (moveCompetitionMode && setCompetitionToMove) {
      // Imprimir info de la competencia
      console.log('Competencia seleccionada para mover:', { id, title, description, date, type, participants, folderId, gender });
      setCompetitionToMove({ id, title, description, date, type, participants, folderId, gender });
      return;
    }
    if (selectionMode) {
      onSelect(id);
    } else {
      router.replace(`/start-gudging?id=${id}&discipline=${gender}&participants=${participants}&number=0&folderId=${folderId}`);
    }
  };

  const handleLongPress = () => {
    if (selectionMode) return;
    setLongPressActive(true);
    Vibration.vibrate(50);
    onCardHold(id);
    setTimeout(() => {
      setLongPressActive(false);
    }, 1000);
  };

  const handlePressIn = () => {
    if (selectionMode) return;
    longPressTimer.current = setTimeout(() => {
      handleLongPress();
    }, 1000) as unknown as number;
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current as unknown as NodeJS.Timeout);
      longPressTimer.current = null;
    }
    if (!longPressActive) {
      setTimeout(() => {
        if (!longPressActive) {
          handleCardTap();
        }
      }, 50);
    }
  };

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        { width: '100%' },
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
        activeOpacity={0.7}
      >
        <View style={[
          isLargeDevice ? styles.folderContentLarge : null,
          isMediumLargeDevice ? styles.folderContentMediumLarge : null,
          isSmallDevice ? styles.folderContentSmall : null,
          isTinyDevice ? styles.folderContentTiny : null,
        ]}>
          {gender ? (
            <Image
              source={require("../assets/images/gymnast 1.png")}
              style={[
                isLargeDevice ? styles.folderIconLarge : null,
                isMediumLargeDevice ? styles.folderIconMediumLarge : null,
                isSmallDevice ? styles.folderIconSmall : null,
                isTinyDevice ? styles.folderIconTiny : null,
              ]}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require("../assets/images/gymnast 2.png")}
              style={[
                isLargeDevice ? styles.folderIconLarge : null,
                isMediumLargeDevice ? styles.folderIconMediumLarge : null,
                isSmallDevice ? styles.folderIconSmall : null,
                isTinyDevice ? styles.folderIconTiny : null,
              ]}
              resizeMode="cover"
            />
          )}
          <View style={[
            isLargeDevice ? styles.folderInfoLarge : null,
            isMediumLargeDevice ? styles.folderInfoMediumLarge : null,
            isSmallDevice ? styles.folderInfoSmall : null,
            isTinyDevice ? styles.folderInfoTiny : null,
          ]}>
            <Text style={[
              isLargeDevice ? styles.folderTitleLarge : null,
              isMediumLargeDevice ? styles.folderTitleMediumLarge : null,
              isSmallDevice ? styles.folderTitleSmall : null,
              isTinyDevice ? styles.folderTitleTiny : null,
            ]}>{title}</Text>
            <Text 
              style={[
                isLargeDevice ? styles.folderDescriptionLarge : null,
                isMediumLargeDevice ? styles.folderDescriptionMediumLarge : null,
                isSmallDevice ? styles.folderDescriptionSmall : null,
                isTinyDevice ? styles.folderDescriptionTiny : null,
              ]}
            >
              {description}
            </Text>
            <View style={[
              isLargeDevice ? styles.lineLarge : null,
              isMediumLargeDevice ? styles.lineMediumLarge : null,
              isSmallDevice ? styles.lineSmall : null,
              isTinyDevice ? styles.lineTiny : null,
            ]} />
            <View style={[
              isLargeDevice ? styles.folderFooterLarge : null,
              isMediumLargeDevice ? styles.folderFooterMediumLarge : null,
              isSmallDevice ? styles.folderFooterSmall : null,
              isTinyDevice ? styles.folderFooterTiny : null,
            ]}>
              <TouchableOpacity style={[
                isLargeDevice ? styles.entrainementButtonLarge : null,
                isMediumLargeDevice ? styles.entrainementButtonMediumLarge : null,
                isSmallDevice ? styles.entrainementButtonSmall : null,
                isTinyDevice ? styles.entrainementButtonTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.entrainementTextLarge : null,
                  isMediumLargeDevice ? styles.entrainementTextMediumLarge : null,
                  isSmallDevice ? styles.entrainementTextSmall : null,
                  isTinyDevice ? styles.entrainementTextTiny : null,
                ]}>{participants} Gymnasts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[
                isLargeDevice ? styles.entrainementButtonLarge : null,
                isMediumLargeDevice ? styles.entrainementButtonMediumLarge : null,
                isSmallDevice ? styles.entrainementButtonSmall : null,
                isTinyDevice ? styles.entrainementButtonTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.entrainementTextLarge : null,
                  isMediumLargeDevice ? styles.entrainementTextMediumLarge : null,
                  isSmallDevice ? styles.entrainementTextSmall : null,
                  isTinyDevice ? styles.entrainementTextTiny : null,
                ]}>
                {gender ? "MAG" : "WAG"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* ✨ Fecha movida al final para ir hasta abajo */}
        <Text style={[
          isLargeDevice ? styles.dateTextLargecompe : null,
          isMediumLargeDevice ? styles.dateTextMediumLargecompe : null,
          isSmallDevice ? styles.dateTextSmallcompe : null,
          isTinyDevice ? styles.dateTextTinycompe : null,
        ]}>{new Date(date).toLocaleDateString()}</Text>
        {selected && (
          <View style={[
            isLargeDevice ? styles.checkmarkLarge : null,
            isMediumLargeDevice ? styles.checkmarkMediumLarge : null,
            isSmallDevice ? styles.checkmarkSmall : null,
            isTinyDevice ? styles.checkmarkTiny : null,
          ]}>
            <Ionicons name="checkmark" size={20} color="#000" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};


const MainMenu: React.FC = () => {
  // Estados para mover competencia
  const [showMoveCompetitionModal, setShowMoveCompetitionModal] = useState(false);
  const [competitionToMove, setCompetitionToMove] = useState<any>(null);
  const [selectedCompetitionDestination, setSelectedCompetitionDestination] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [addFolderModalVisible, setAddFolderModalVisible] = useState(false);
  const [addCompetitionModalVisible, setAddCompetitionModalVisible] = useState(false);
  const [feedbackAcceptModel, setFeedbackAcceptModel] = useState(false);
  const [feedbackDeniedModel, setFeedbackDeniedModel] = useState(false);
  const [confirmationModel, setConfirmationModel] = useState(false);
  const [editFolderModalVisible, setEditFolderModalVisible] = useState(false);
  const router = useRouter();
  const [ConfirmButtomText, setConfirmButtonText] = useState("Add Competition");

  // Estado para rastrear si es el primer render
  const [isFirstRender, setIsFirstRender] = useState(true);

  /* Selection Mode State */
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<number[]>([]);
  const [selectedCompetitions, setSelectedCompetitions] = useState<number[]>([]);
  const [selectionAction, setSelectionAction] = useState<'select' | 'edit' | 'delete' | 'move' | null>(null);

  /* page logic */
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderType, setFolderType] = useState(true);
  const [folderDate, setFolderDate] = useState(new Date().toLocaleDateString());

  const [folders, setFolders] = useState<Folder[]>([]); // State to store folders
  const [competitions, setCompetitions] = useState<any[]>([]); // State to store competitions
  
  // Loading states for better UX
  const [isLoadingAddFolder, setIsLoadingAddFolder] = useState(false);
  const [isLoadingEditFolder, setIsLoadingEditFolder] = useState(false);
  const [isLoadingDeleteFolder, setIsLoadingDeleteFolder] = useState(false);
  const [isLoadingAddCompetition, setIsLoadingAddCompetition] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // For editing functionality
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editingCompetition, setEditingCompetition] = useState<any>(null);
  const [editCompetitionModalVisible, setEditCompetitionModalVisible] = useState(false);
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
  params.folderId ? parseInt(params.folderId as string) : null
);

// Estados para importar/exportar
const [showExportModal, setShowExportModal] = useState(false);
const [showImportModal, setShowImportModal] = useState(false);
const [userFolders, setUserFolders] = useState<any[]>([]);
const [selectedFolder, setSelectedFolder] = useState<any>(null);
const [isExporting, setIsExporting] = useState(false);
const [isImporting, setIsImporting] = useState(false);
const [folderSelectionForCompetition, setFolderSelectionForCompetition] = useState(false);

// Estados para navegación anidada
const [currentParentId, setCurrentParentId] = useState<number | null>(null);
const [folderPath, setFolderPath] = useState<Folder[]>([]);
const [currentLevel, setCurrentLevel] = useState(0);

// Referencias
const scrollViewRef = useRef<ScrollView>(null);

// Estado para swap functionality (reemplaza drag & drop)
const [selectedCardForSwap, setSelectedCardForSwap] = useState<number | null>(null);
const [isSwapping, setIsSwapping] = useState(false);
const [renderKey, setRenderKey] = useState(0); // Para forzar re-renders después del swap
const swapTimeoutRef = useRef<number | null>(null); // Para auto-cancelar selección de swap

// Estados para el modal de opciones de carpeta
const [showFolderOptionsModal, setShowFolderOptionsModal] = useState(false);
const [selectedFolderForOptions, setSelectedFolderForOptions] = useState<Folder | null>(null);
const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);
const [showChangePositionModal, setShowChangePositionModal] = useState(false);
const [availableFoldersForMove, setAvailableFoldersForMove] = useState<Folder[]>([]);
// Estados para el modal de opciones de competencia
const [showCompetitionOptionsModal, setShowCompetitionOptionsModal] = useState(false);
const [selectedCompetitionForOptions, setSelectedCompetitionForOptions] = useState<any>(null);
  const [showNumberPad, setShowNumberPad] = useState(false);


// Estados para la barra de carga unificada
const [showLoadingModal, setShowLoadingModal] = useState(false);
const [loadingMessage, setLoadingMessage] = useState("");
const [loadingProgress, setLoadingProgress] = useState(0);
const [isLoadingOperation, setIsLoadingOperation] = useState(false);

// --- NUEVA LÓGICA PARA MOVER COMPETENCIA ---
const [moveCompetitionMode, setMoveCompetitionMode] = useState(false);



// Al seleccionar 'Move to another folder' en el modal de opciones
const handleMoveCompetitionOption = () => {
  if (!selectedCompetitionForOptions) {
    Alert.alert('Error', 'No hay competencia seleccionada.');
    return;
  }
  setShowCompetitionOptionsModal(false);
  setMoveCompetitionMode(true);
  setCompetitionToMove(selectedCompetitionForOptions);
};

// Al hacer click en un folder cuando está activo el modo de mover competencia
const handleSelectFolderForCompetitionMove = async (folderId: number) => {
  if (!moveCompetitionMode || !competitionToMove) return;
  try {
    showLoading('Moviendo competencia...', 0);
    await updateCompetence(competitionToMove.id, { folderId });
    setMoveCompetitionMode(false);
    setCompetitionToMove(null);
    await fetchFolders();
    setFeedbackAcceptModel(true);
    setTimeout(() => setFeedbackAcceptModel(false), 1200);
    hideLoading();
  } catch (error) {
    hideLoading();
    Alert.alert('Error', 'No se pudo mover la competencia.');
  }
};

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
      console.log('=== FETCHING NESTED FOLDERS AND COMPETITIONS ===');
      console.log('Current parent ID:', currentParentId);
      console.log('Current level:', currentLevel);
      
      // ✨ OBTENER CARPETAS DEL NIVEL ACTUAL (SIN FILTRO DE USUARIO)
      let fetchedFolders = [];
      if (currentParentId === null) {
        // Si estamos en el nivel raíz, obtener todas las carpetas raíz
        fetchedFolders = await getAllRootFolders();
      } else {
        // Si estamos en un nivel más profundo, obtener subcarpetas
        fetchedFolders = await getAllSubfolders(currentParentId);
      }
      
      // Agregar información sobre subcarpetas
      const foldersWithSubfolders = await Promise.all(
        fetchedFolders.map(async (folder) => {
          const hasSubfoldersCount = await countSubfolders(folder.id);
          return {
            ...folder,
            hasSubfolders: hasSubfoldersCount > 0,
            level: currentLevel
          };
        })
      );
      
      // ✨ OBTENER COMPETENCIAS
      let allCompetitions: any[] = [];
      
      if (currentParentId !== null) {
        // Solo mostrar competencias cuando estamos DENTRO de una carpeta específica
        console.log('Fetching competitions for current folder:', currentParentId);
        try {
          const folderCompetitions = await getCompetencesByFolderId(currentParentId);
          allCompetitions = folderCompetitions.map(comp => ({
            ...comp,
            folderId: currentParentId,
            folderName: 'Current Folder' // Podríamos obtener el nombre real si es necesario
          }));
          console.log('Found competitions for current folder:', allCompetitions.length);
        } catch (error) {
          console.error(`Error fetching competitions for current folder ${currentParentId}:`, error);
        }
      } else {
        // En el nivel raíz, no mostrar competencias (solo carpetas)
        console.log('At root level - not showing competitions');
      }
      
      console.log('Fetched folders count:', foldersWithSubfolders?.length || 0);
      console.log('Fetched competitions count:', allCompetitions?.length || 0);
      console.log('Fetched folders for level:', foldersWithSubfolders?.map(f => ({ 
        id: f.id, 
        name: f.name, 
        parentId: f.parentId, 
        level: f.level,
        hasSubfolders: f.hasSubfolders,
        position: f.position
      })));
      console.log('Fetched competitions:', allCompetitions?.map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.type,
        participants: c.numberOfParticipants 
      })));
      
      // Ordenar carpetas por posición antes de renderizar
      const orderedFolders = (foldersWithSubfolders || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      setFolders(orderedFolders);
      setCompetitions(allCompetitions || []);
      
      // Actualizar la ruta de navegación si estamos en una subcarpeta
      if (currentParentId !== null) {
        const path = await getFolderPath(currentParentId);
        setFolderPath(path);
      } else {
        setFolderPath([]);
      }
      
      console.log('Folders and competitions state updated');
      console.log('=== FETCH COMPLETE ===');
    } catch (error) {
      console.error("Error fetching folders and competitions:", error);
      setFolders([]);
      setCompetitions([]);
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

  // ============== FUNCIONES PARA NAVEGACIÓN ANIDADA ==============

  // Función para navegar hacia una subcarpeta
  const navigateToFolder = async (folderId: number) => {
    try {
      console.log('Navigating to folder:', folderId);
      setCurrentParentId(folderId);
      setCurrentLevel(currentLevel + 1);
      // ✨ CAMBIO: El useEffect se encargará de fetchFolders automáticamente
    } catch (error) {
      console.error('Error navigating to folder:', error);
    }
  };

  // Función para navegar hacia atrás (al padre)
  const navigateToParent = async () => {
    try {
      console.log('Navigating to parent from level:', currentLevel);
      
      if (currentLevel <= 0) {
        // Ya estamos en el nivel raíz, no podemos ir más atrás
        return;
      }
      
      if (currentLevel === 1) {
        // Vamos de nivel 1 a nivel 0 (raíz)
        setCurrentParentId(null);
        setCurrentLevel(0);
        setFolderPath([]);
      } else {
        // Vamos a un nivel superior usando el folderPath
        const newLevel = currentLevel - 1;
        if (folderPath.length >= newLevel && newLevel > 0) {
          const parentFolder = folderPath[newLevel - 1];
          setCurrentParentId(parentFolder.id);
        } else {
          setCurrentParentId(null);
        }
        setCurrentLevel(newLevel);
      }
      
      // ✨ CAMBIO: El useEffect se encargará de fetchFolders automáticamente
    } catch (error) {
      console.error('Error navigating to parent:', error);
    }
  };

  // Efecto para cargar todos los folders al montar el componente
  useEffect(() => {
    // Si hay folderId en los params, abrir ese folder al montar
    const folderIdParam = params.folderId;
    let parsedId: number | undefined = undefined;
    if (folderIdParam) {
      if (typeof folderIdParam === 'string') {
        const n = parseInt(folderIdParam, 10);
        if (!isNaN(n)) parsedId = n;
      } else if (Array.isArray(folderIdParam)) {
        const n = parseInt(folderIdParam[0], 10);
        if (!isNaN(n)) parsedId = n;
      }
    }
    if (parsedId !== undefined) {
      setCurrentParentId(parsedId);
      // Buscar el folder y usar su nivel real
      (async () => {
        try {
          // IMPORTANTE: Asegúrate de importar getFolderById desde tu base de datos
          const folder = await getFolderById(parsedId);
          if (folder && typeof folder.level === 'number') {
            setCurrentLevel(folder.level);
          } else {
            setCurrentLevel(1); // fallback
          }
        } catch (e) {
          setCurrentLevel(1); // fallback
        }
      })();
    }
    fetchFolders();
    setIsFirstRender(false); // Marcar que ya no es el primer render
  }, []); // Solo se ejecuta al montar
  
  // Función para navegar directamente a la raíz
  const navigateToRoot = async () => {
    try {
      console.log('Navigating to root');
      setCurrentParentId(null);
      setCurrentLevel(0);
      setFolderPath([]);
      // ✨ CAMBIO: El useEffect se encargará de fetchFolders automáticamente
    } catch (error) {
      console.error('Error navigating to root:', error);
    }
  };



  const handleConfirmMoveCompetition = async () => {
  if (!competitionToMove || selectedCompetitionDestination == null) return;
  showLoading('Moviendo competencia...', 0);
  try {
    await updateCompetence(competitionToMove.id, { folderId: selectedCompetitionDestination });
    setShowMoveCompetitionModal(false);
    setSelectionMode(false);
    setSelectionAction(null);
    setCompetitionToMove(null);
    setSelectedCompetitionDestination(null);
    await fetchFolders();
    setFeedbackAcceptModel(true);
    setTimeout(() => setFeedbackAcceptModel(false), 1200);
  } catch (error) {
    hideLoading();
    Alert.alert('Error', 'No se pudo mover la competencia.');
  }
};

  // Función para navegar usando el breadcrumb
  const navigateFromBreadcrumb = async (folderId: number | null) => {
    try {
      console.log('Navigating from breadcrumb to:', folderId);
      
      if (folderId === null) {
        await navigateToRoot();
      } else {
        // Encontrar el nivel del folder en el path
        const folderInPath = folderPath.find(f => f.id === folderId);
        if (folderInPath) {
          const newLevel = folderPath.indexOf(folderInPath);
          setCurrentParentId(folderId);
          setCurrentLevel(newLevel + 1);
          // ✨ CAMBIO: El useEffect se encargará de fetchFolders automáticamente
        }
      }
    } catch (error) {
      console.error('Error navigating from breadcrumb:', error);
    }
  };

  // ============== FIN FUNCIONES NAVEGACIÓN ANIDADA ==============

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

  // Nueva función para manejar el hold y abrir el modal de opciones
  const handleCardHold = (folderId: number) => {
    if (selectionMode || isSwapping) return;
    setSelectedFolderForOptions(folders.find(f => f.id === folderId) || null);
    setShowFolderOptionsModal(true);
  };

  // Nueva función para manejar el hold en competencia
  const handleCompetitionHold = (competitionId: number) => {
    if (selectionMode) return;
    setSelectedCompetitionForOptions(competitions.find(c => c.id === competitionId) || null);
    setShowCompetitionOptionsModal(true);
  };
  // Estado para el modal de mover carpeta/competencia
  // (ya existen showFolderOptionsModal y selectedFolderForOptions)

  // Función para mover a otra carpeta del mismo nivel
  const handleMoveToFolder = async () => {
    if (!selectedFolderForOptions) return;
    // Cargar carpetas del mismo nivel (excluyendo la actual)
    let sameLevelFolders = folders.filter(f => f.parentId === selectedFolderForOptions.parentId && f.id !== selectedFolderForOptions.id);
    setAvailableFoldersForMove(sameLevelFolders);
    setShowMoveToFolderModal(true);
  };

  // Función para sacar de la carpeta actual
  const handleRemoveFromFolder = async () => {
    if (!selectedFolderForOptions) {
      Alert.alert("Error", "No folder selected.");
      return;
    }
    if (selectedFolderForOptions.parentId === null) {
      Alert.alert("Not allowed", "This folder is already at the root level.");
      return;
    }
    // Buscar el padre actual en folderPath
    const parentIndex = folderPath.findIndex(f => f.id === selectedFolderForOptions.parentId);
    let newParentId = null;
    let newLevel = 0;
    if (parentIndex > 0) {
      // Hay un padre del padre
      newParentId = folderPath[parentIndex - 1]?.id ?? null;
      newLevel = folderPath[parentIndex - 1]?.level ?? 0;
    }
    // Si parentIndex === 0, el nuevo padre es root (null)
    await updateFolder(selectedFolderForOptions.id, {
      parentId: newParentId,
      level: newLevel
    });
    setShowFolderOptionsModal(false);
    await fetchFolders();
    setRenderKey(prev => prev + 1); // Forzar re-render visual
    setFeedbackAcceptModel(true);
    setTimeout(() => setFeedbackAcceptModel(false), 1200);
  };

  // Nuevo: Cambiar posición usando selección
  const handleChangePosition = () => {
    console.log('Entering move selection mode');
    setSelectionMode(true);
    setSelectionAction('move');
    setSelectedFolders([]);
    setShowFolderOptionsModal(false);
  };

  // Nuevo: Cuando se selecciona una carpeta y se pulsa 'Move', abrir modal para elegir carpeta destino
  // El flujo de mover carpeta ahora es solo por tap directo en toggleFolderSelection
  // Función para confirmar mover a otra carpeta
  const confirmMoveToFolder = async (targetFolderId: number) => {
    console.log('[MOVE] confirmMoveToFolder called');
    if (!selectedFolderForOptions) {
      console.log('[MOVE] No selectedFolderForOptions, aborting');
      return;
    }
    console.log('[MOVE] Moving folder:', selectedFolderForOptions);
    console.log('[MOVE] Target folderId:', targetFolderId);
    // Buscar la carpeta destino para calcular el nuevo nivel
    const destinationFolder = folders.find(f => f.id === targetFolderId);
    console.log('[MOVE] Destination folder:', destinationFolder);
    let newLevel = 0;
    if (destinationFolder) {
      newLevel = (destinationFolder.level ?? 0) + 1;
    }
    console.log('[MOVE] New parentId:', targetFolderId, 'New level:', newLevel);
    await updateFolder(selectedFolderForOptions.id, {
      parentId: targetFolderId,
      level: newLevel
    });
    console.log('[MOVE] updateFolder completed');
    setShowMoveToFolderModal(false);
    setShowFolderOptionsModal(false);
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedFolders([]);
    console.log('[MOVE] UI state reset, fetching folders...');
    await fetchFolders();
    console.log('[MOVE] fetchFolders completed, showing feedback');
    setFeedbackAcceptModel(true);
    setTimeout(() => setFeedbackAcceptModel(false), 1200);
  };

  // Función para confirmar cambio de posición
  const confirmChangePosition = async (newIndex: number) => {
    if (!selectedFolderForOptions) return;
    console.log('--- CHANGE POSITION ---');
    console.log('Selected folder for options:', selectedFolderForOptions);
    // Obtener carpetas del mismo nivel
    let sameLevelFolders = folders.filter(f => f.parentId === selectedFolderForOptions.parentId);
    // Ordenar por posición
    sameLevelFolders.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    console.log('Same level folders before:', sameLevelFolders.map(f => ({ id: f.id, name: f.name, position: f.position })));
    // Remover la carpeta seleccionada
    const filtered = sameLevelFolders.filter(f => f.id !== selectedFolderForOptions.id);
    console.log('Filtered folders (without selected):', filtered.map(f => ({ id: f.id, name: f.name })));
    // Insertar la carpeta seleccionada en la nueva posición
    console.log('Inserting folder at new index:', newIndex);
    filtered.splice(newIndex, 0, selectedFolderForOptions);
    // Actualizar posiciones (incluyendo la carpeta movida)
    const newPositions = filtered.map((f, idx) => ({ id: f.id, position: idx }));
    // Si la carpeta movida no está en la lista (caso borde), la agregamos
    if (!newPositions.some(p => p.id === selectedFolderForOptions.id)) {
      newPositions.splice(newIndex, 0, { id: selectedFolderForOptions.id, position: newIndex });
    }
    console.log('New positions array:', newPositions);
    console.log('Updating folder positions in DB...');
    await updateFolderPositions(newPositions);
    setShowChangePositionModal(false);
    console.log('Positions updated, fetching folders...');
    await fetchFolders();
    setRenderKey(prev => prev + 1); // Forzar re-render visual
    console.log('RenderKey incremented, UI should update');
    setFeedbackAcceptModel(true);
    setTimeout(() => setFeedbackAcceptModel(false), 1200);
  };
  // ...existing code...
  // ...existing code...



  {/* Cambio de posición: View flotante en Android, Modal en otras plataformas */}
  {(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) && showChangePositionModal ? (
    <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:9999, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.3)' }}>
      <View style={{ backgroundColor:'#fff', borderRadius:12, padding:24, minWidth:280 }}>
        <Text style={{ fontWeight:'bold', fontSize:18, marginBottom:16 }}>Change Position</Text>
        {availableFoldersForMove.length === 0 ? (
          <Text>No folders at this level.</Text>
        ) : (
          availableFoldersForMove.map((folder, idx) => (
            <TouchableOpacity
              key={folder.id}
              onPress={() => confirmChangePosition(idx)}
              style={{
                marginBottom: 10,
                padding: 10,
                borderRadius: 8,
                backgroundColor: folder.id === selectedFolderForOptions?.id ? '#d1e7dd' : '#f0f0f0',
                borderWidth: folder.id === selectedFolderForOptions?.id ? 2 : 1,
                borderColor: folder.id === selectedFolderForOptions?.id ? '#198754' : '#ccc',
              }}
            >
              <Text style={{ fontSize: 16, color: folder.id === selectedFolderForOptions?.id ? '#198754' : '#333' }}>
                {idx + 1}. {folder.name}{folder.id === selectedFolderForOptions?.id ? ' (Current)' : ''}
              </Text>
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity onPress={() => setShowChangePositionModal(false)}>
          <Text style={{ color:'red', marginTop:8 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null}

  {!((Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice)) && (
  <Modal
    visible={showChangePositionModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowChangePositionModal(false)}
  >
    <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.3)' }}>
      <View style={{ backgroundColor:'#fff', borderRadius:12, padding:24, minWidth:280 }}>
        <Text style={{ fontWeight:'bold', fontSize:18, marginBottom:16 }}>Change Position</Text>
        {availableFoldersForMove.length === 0 ? (
          <Text>No folders at this level.</Text>
        ) : (
          availableFoldersForMove.map((folder, idx) => (
            <TouchableOpacity
              key={folder.id}
              onPress={() => confirmChangePosition(idx)}
              style={{
                marginBottom: 10,
                padding: 10,
                borderRadius: 8,
                backgroundColor: folder.id === selectedFolderForOptions?.id ? '#d1e7dd' : '#f0f0f0',
                borderWidth: folder.id === selectedFolderForOptions?.id ? 2 : 1,
                borderColor: folder.id === selectedFolderForOptions?.id ? '#198754' : '#ccc',
              }}
            >
              <Text style={{ fontSize: 16, color: folder.id === selectedFolderForOptions?.id ? '#198754' : '#333' }}>
                {idx + 1}. {folder.name}{folder.id === selectedFolderForOptions?.id ? ' (Current)' : ''}
              </Text>
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity onPress={() => setShowChangePositionModal(false)}>
          <Text style={{ color:'red', marginTop:8 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}



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
        Alert.alert('Error', 'Error updating folder positions: Please try again.');
      }
    } catch (error) {
      console.error("Error swapping folders:", error);
      setFolders(folders); // Revertir cambios
      Alert.alert('Error', 'Error swapping folders: ');
    } finally {
      setIsSwapping(false);
    }
  };

  // Función para cargar folders del nivel actual para exportar
  const loadUserFolders = async () => {
    try {
      // ✨ ACTUALIZADO: Solo cargar carpetas del nivel actual donde está navegando
      let foldersToExport = [];
      
      if (currentParentId === null) {
        // Si estamos en el nivel raíz, obtener todas las carpetas raíz
        foldersToExport = await getAllRootFolders();
        console.log('Loading root folders for export:', foldersToExport.length);
      } else {
        // Si estamos en un nivel más profundo, obtener subcarpetas del nivel actual
        foldersToExport = await getAllSubfolders(currentParentId);
        console.log('Loading subfolders for export from parent:', currentParentId, 'count:', foldersToExport.length);
      }
      
      setUserFolders(foldersToExport || []);
    } catch (error) {
      console.error("Error loading user folders for export:", error);
      setUserFolders([]);
    }
  };

  // Función para exportar folder
  const handleExportFolder = async () => {
    if (!selectedFolder) {
      Alert.alert("Error", "Please select a folder to export");
      return;
    }
    
    if (isLoadingOperation) return;
    
    console.log("Starting export with userId:", userId, "and folderId:", selectedFolder.id);
    
    // Cerrar modal de exportación PRIMERO
    setShowExportModal(false);
    
    // Pequeño delay para asegurar que el modal se cierre completamente
    setTimeout(() => {
      // Mostrar barra de carga
      showLoading("Preparing export...", 0);
      setIsExporting(true);
      
      // Ejecutar la exportación asíncrona
      exportFolderAsync(selectedFolder.id, selectedFolder.name);
    }, 300);
  };

  // Nueva función para manejar la exportación asíncrona
  const exportFolderAsync = async (folderId: number, folderName: string) => {
    try {
      // Exportar datos del folder con progreso
  console.log("Calling exportFolderZip...");
  const zipBytes = await exportFolderZip(folderId, updateLoading);
  if (!zipBytes) {
        throw new Error("No data exported");
      }
  console.log("Export successful, bytes:", zipBytes.length);
  updateLoading("Creating file...", 97);
  // Crear archivo temporal ZIP
  const fileName = `folder_${folderName}_${new Date().toISOString().split('T')[0]}.zip`;
  const fileUri = FileSystem.documentDirectory + fileName;
  // Guardar bytes en Base64 por compatibilidad con RN FS
  const base64 = Buffer.from(zipBytes).toString('base64');
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      updateLoading("Preparing to share...", 99);
      // Share file
      if (await Sharing.isAvailableAsync()) {
        updateLoading("Sharing file...", 100);
        try {
          await Sharing.shareAsync(fileUri, {
    mimeType: 'application/zip',
    dialogTitle: 'Exportar Folder',
    UTI: 'public.zip-archive'
          });
        } catch (shareError) {
          console.warn("Sharing cancelled or failed:", shareError);
        }
        hideLoading();
        Alert.alert(
          "Success", 
          "Folder exported successfully. The file has been shared.",
          [{ text: "OK", onPress: () => {
            setMenuVisible(false);
          }}]
        );
      } else {
        hideLoading();
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (error: any) {
      console.error("Error exporting folder:", error);
      hideLoading();
      Alert.alert("Error", `Error exporting folder: ${error.message || error}`);
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
        type: ['application/zip', 'application/x-zip-compressed', 'application/json', 'text/plain'],
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        setIsImporting(false);
        // No cerrar el modal, el usuario puede intentar de nuevo
        return;
      }

      // Solo cerrar el modal si el usuario seleccionó un archivo
      setShowImportModal(false);

      // Pequeño delay para asegurar que el modal se cierre completamente
      setTimeout(() => {
        // Ahora mostrar barra de carga
        showLoading("Reading file...", 5);
        setIsImporting(true);
        // Ejecutar la importación asíncrona
  importFileAsync(result.assets[0].uri, result.assets[0].mimeType || result.assets[0].name);
      }, 300);

    } catch (error: any) {
      console.error("Error selecting file:", error);
      Alert.alert("Error", `Error selecting file: ${error.message || error}`);
    }
  };

  // Nueva función para manejar la importación asíncrona
  const importFileAsync = async (fileUri: string, mimeOrName?: string) => {
    try {
      const isZip = (mimeOrName || '').includes('.zip') || (mimeOrName || '').includes('zip');
      let importedOk = false;
      if (isZip) {
        // Leer como bytes base64 y convertir a Uint8Array
        const b64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        const bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
        const targetFolderId = currentParentId || 0;
        importedOk = await importFolderZip(bytes, targetFolderId, updateLoading);
      } else {
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const targetFolderId = currentParentId || 0; // 0 para carpetas raíz
        importedOk = await importFolderData(fileContent, targetFolderId, updateLoading);
      }
      
      if (importedOk) {
        updateLoading("Updating list...", 98);

        // ✨ ACTUALIZADO: Recargar carpetas y competencias del nivel actual
        await fetchFolders();

        updateLoading("Completed", 100);

        setTimeout(() => {
          hideLoading();
          Alert.alert(
            "Success", 
            "Folder imported successfully.",
            [{ text: "OK", onPress: () => {
              setMenuVisible(false);
            }}]
          );
        }, 500);
      } else {
        throw new Error("Error processing import file");
      }

    } catch (error: any) {
      console.error("Error importing folder:", error);
      hideLoading();
      Alert.alert("Error", `Error importing folder: ${error.message || error}`);
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
    setIsFirstRender(false); // Marcar que ya no es el primer render
  }, []); // Solo se ejecuta al montar

  // ✨ NUEVO: Efecto para re-fetchear carpetas cuando cambia la navegación
  useEffect(() => {
    // Solo evitar ejecutar en el primer render
    if (!isFirstRender) {
      console.log('Navigation changed - refetching folders for level:', currentLevel, 'parent:', currentParentId);
      fetchFolders();
    }
  }, [currentParentId, currentLevel, isFirstRender]); // Se ejecuta cuando cambia la navegación

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
  const toggleFolderSelection = async (id: number) => {
    // Si estamos en modo mover y ya hay una carpeta seleccionada, moverla dentro de la tocada
    if (selectionAction === 'move' && selectedFolders.length === 1 && !selectedFolders.includes(id)) {
      const folderToMove = folders.find(f => f.id === selectedFolders[0]);
      const destinationFolder = folders.find(f => f.id === id);
      if (!folderToMove || !destinationFolder) return;
      // Evitar mover dentro de sí misma o de un descendiente
      const getDescendantIds = (folderId: number, allFolders: Folder[]): number[] => {
        let descendants: number[] = [];
        const directChildren = allFolders.filter(f => f.parentId === folderId);
        for (const child of directChildren) {
          descendants.push(child.id);
          descendants = descendants.concat(getDescendantIds(child.id, allFolders));
        }
        return descendants;
      };
      const forbiddenIds = [folderToMove.id, ...getDescendantIds(folderToMove.id, folders)];
      if (forbiddenIds.includes(destinationFolder.id)) {
        Alert.alert('Invalid move', 'Cannot move a folder into itself or its descendant.');
        return;
      }
      // Mover carpeta
      let newLevel = (destinationFolder.level ?? 0) + 1;
      await updateFolder(folderToMove.id, {
        parentId: destinationFolder.id,
        level: newLevel
      });
      setSelectionMode(false);
      setSelectionAction(null);
      setSelectedFolders([]);
      await fetchFolders();
      setFeedbackAcceptModel(true);
      setTimeout(() => setFeedbackAcceptModel(false), 1200);
      return;
    }
    // Comportamiento normal
    setSelectedFolders(prev => {
      if (prev.includes(id)) {
        return prev.filter(folderId => folderId !== id);
      } else {
        // For edit mode, only allow selecting one item (clear competitions if selecting folder)
        if (selectionAction === 'edit') {
          setSelectedCompetitions([]);
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

  // Function to toggle competition selection
  const toggleCompetitionSelection = (id: number) => {
    setSelectedCompetitions(prev => {
      if (prev.includes(id)) {
        return prev.filter(competitionId => competitionId !== id);
      } else {
        // For edit mode, only allow selecting one item (clear folders if selecting competition)
        if (selectionAction === 'edit') {
          setSelectedFolders([]);
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
    setSelectedCompetitions([]);
  };

  // Function to handle the Delete option from menu
  const handleDeleteOption = () => {
    setMenuVisible(false);
    setSelectionMode(true);
    setSelectionAction('delete');
    setSelectedFolders([]);
    setSelectedCompetitions([]);
    
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
    setSelectedCompetitions([]);
    
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

  // Function to actually delete the selected folders and competitions
const performDelete = async () => {
  if (isLoadingOperation) return; // Prevent multiple deletions
  
  try {
    // Mostrar barra de carga
    showLoading("Calculando total de elementos...", 0);
    setIsLoadingDeleteFolder(true);
    setConfirmationModel(false); // Close modal immediately to prevent double-clicks
    
    console.log('Starting deletion process for folders:', selectedFolders);
    console.log('Starting deletion process for competitions:', selectedCompetitions);
    
    // First, calculate total number of gymnasts across all folders and competitions
    let totalGymnasts = 0;
    
    // Calculate gymnasts from selected folders
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
    
    // Calculate gymnasts from selected competitions
    for (const competitionId of selectedCompetitions) {
      try {
        const mainTables = await getMainTablesByCompetenceId(competitionId);
        totalGymnasts += mainTables.length;
      } catch (error) {
        console.error(`Error calculating gymnasts for competition ${competitionId}:`, error);
      }
    }
    
    console.log(`Total gymnasts to delete: ${totalGymnasts}`);
    updateLoading(`Deleting ${totalGymnasts} gymnasts...`, 5);

    let processedGymnasts = 0;
    
    // Process folder deletions sequentially
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
            const progress = Math.floor((processedGymnasts / totalGymnasts) * 70);
            updateLoading(`Deleting gymnast ${processedGymnasts} of ${totalGymnasts}...`, progress);
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
    
    // Process competition deletions sequentially
    for (const competitionId of selectedCompetitions) {
      console.log(`Deleting competition ${competitionId}...`);
      
      try {
        // Fetch main tables associated with the competition
        const mainTables = await getMainTablesByCompetenceId(competitionId);
        console.log(`Found ${mainTables.length} main tables for competition ${competitionId}`);

        for (const mainTable of mainTables) {
          // Delete rateGeneral entries associated with the main table
          await deleteRateGeneralByTableId(mainTable.id);
          console.log(`Deleted rate general for main table ${mainTable.id}`);
          
          processedGymnasts++;
          const progress = Math.floor((processedGymnasts / totalGymnasts) * 70);
          updateLoading(`Deleting Gymnast ${processedGymnasts} of ${totalGymnasts}...`, progress);
        }

        // Delete main tables associated with the competition
        await deleteMainTableByCompetenceId(competitionId);
        console.log(`Deleted main tables for competition ${competitionId}`);
        
        // Delete the competition itself
        await deleteCompetence(competitionId);
        console.log(`Deleted competition ${competitionId}`);
        
      } catch (error) {
        console.error(`Error deleting competition ${competitionId}:`, error);
        // Continue with other deletions even if one fails
      }
    }

    updateLoading("Updating list...", 90);
    // Refresh the folders list instead of manually updating state
    await refreshFolders();

    // Reset all selection states
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedFolders([]);
    setSelectedCompetitions([]);

    // Hide the delete confirmation button
    Animated.timing(deleteButtonAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    updateLoading("Completed", 100);

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
    Alert.alert("Error", "Failed to delete some items. Please try again.");
    
    // Reset states even if there's an error
    setConfirmationModel(false);
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedFolders([]);
    setSelectedCompetitions([]);
    
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
    } else if (selectedCompetitions.length === 1) {
      const competitionToEdit = competitions.find(competition => competition.id === selectedCompetitions[0]);
      if (competitionToEdit) {
        setEditingCompetition(competitionToEdit);
        setCompetitionName(competitionToEdit.name);
        setCompetitionDescription(competitionToEdit.description);
        setCompetitionParticipants(competitionToEdit.numberOfParticipants.toString());
        setCompetitionType(competitionToEdit.type);
        setEditCompetitionModalVisible(true);
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
    showLoading("Updating folder...", 0);
    setIsLoadingEditFolder(true);

    const updatedFolder = {
      ...editingFolder,
      name: folderName,
      description: folderDescription,
      type: folderType,
    };

    try {
      updateLoading("Saving changes...", 40);
      const result = await updateFolder(editingFolder.id, updatedFolder);
      
      if (result) {
        updateLoading("Updating list...", 80);
        // Refresh the folders list to ensure UI is up to date
        await refreshFolders();

        updateLoading("Finalizing...", 100);

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
  // Function to add a new folder (actualizada para carpetas anidadas)
  const addNewFolder = async () => {
    if (folderName.trim() === "") {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (isLoadingOperation) return; // Prevent multiple submissions

    // Mostrar barra de carga
    showLoading("Creating folder...", 0);
    setIsLoadingAddFolder(true);

    try {
      updateLoading("Preparing new folder...", 10);

      console.log('Creating folder in current parent:', currentParentId, 'at level:', currentLevel);

      // Obtener carpetas del nivel actual para calcular la posición
      const currentLevelFolders = await getAllFoldersByParent(currentParentId);
      const newPosition = currentLevelFolders && currentLevelFolders.length > 0
        ? Math.max(...currentLevelFolders.map(f => f.position ?? 0)) + 1
        : 0;

      updateLoading("Creating new folder...", 45);

      const folderData = {
        userId: userId,
        name: folderName,
        description: folderDescription,
        type: folderType,
        date: new Date().toISOString(),
        filled: false,
        position: newPosition, // Nueva carpeta al final
        parentId: currentParentId, // ✨ NUEVO: Asignar el padre actual
        level: currentLevel, // ✨ NUEVO: Asignar el nivel actual
      };

      updateLoading("Saving new folder...", 60);
      const result = await insertFolder(folderData);

      if (result) {
        // Normalizar posiciones después de insertar
        await normalizeFolderPositions(currentParentId);
        updateLoading("Updating list...", 70);
        // Refresh the folders list to ensure UI is up to date
        await refreshFolders();

        updateLoading("Finalizing...", 100);

        // Reset form and close modal
        setFolderName("");
        setFolderDescription("");
        setAddFolderModalVisible(false);

        setTimeout(() => {
          hideLoading();
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
    
    if (isLoadingOperation) return; // Prevent multiple submissions

    // ✨ LÓGICA CORREGIDA: Crear competencia EN la carpeta actual donde está navegando
    let targetFolderId: number;

    if (currentParentId !== null) {
      // Si estamos dentro de una carpeta, crear la competencia EN esa carpeta
      targetFolderId = currentParentId;
      console.log("Creating competition IN current folder:", targetFolderId);
    } else {
      // Si estamos en el nivel raíz, necesitamos seleccionar una carpeta
      if (folders.length === 0) {
        Alert.alert("Info", "No folders found at this level. Create a folder first.");
        return;
      }
      
      if (folders.length === 1) {
        // Si solo hay una carpeta en el nivel raíz, usarla automáticamente
        targetFolderId = folders[0].id;
        console.log("Auto-selecting single root folder:", targetFolderId);
      } else if (selectedFolders.length === 1) {
        // Si el usuario ha seleccionado una carpeta específica en el nivel raíz, usarla
        targetFolderId = selectedFolders[0];
        console.log("Using user-selected root folder:", targetFolderId);
      } else {
        // Si hay múltiples carpetas y ninguna seleccionada, pedir selección
        Alert.alert(
          "Select Folder", 
          `There are ${folders.length} folders available. Please select a folder to create the competition.`,
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Select", 
              onPress: () => {
                setFolderSelectionForCompetition(true);
                setSelectionMode(true);
                setSelectionAction('select');
                setSelectedFolders([]);
                /* hide modal create */
                setAddCompetitionModalVisible(false); 
              }
            }
          ]
        );
        return;
      }
    }

    const numberOfParticipants = parseInt(competitionParticipants);
    
    // Cerrar modal de competencia PRIMERO
    setAddCompetitionModalVisible(false);
    
    // Pequeño delay para asegurar que el modal se cierre completamente
    setTimeout(() => {
      // Mostrar barra de carga
      showLoading("Creating competition...", 0);
      setIsLoadingAddCompetition(true);
      
      console.log("Creating competition in folder ID:", targetFolderId, "at navigation level:", currentLevel);
      
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
      updateLoading("Saving competition...", 20);
      console.log("=== CREATING COMPETITION ===");
      console.log("Competition data:", competenceData);
      console.log("Target folder ID:", targetFolderId);
      console.log("Current parent ID:", currentParentId);
      
      const competitionId = await insertCompetence(competenceData);
      console.log("Competition created with ID:", competitionId);

      /* change filled in the folder in the db */
      await updateFolder(targetFolderId, { filled: true }); // Update the folder to mark it as filled
      
      if (competitionId) {
        updateLoading(`Creating ${numberOfParticipants} gymnasts...`, 40);
        // Create Main Table entries for each participant with progress tracking
        await createMainTableEntriesWithProgress(competitionId, numberOfParticipants);

        updateLoading("Updating list...", 90);
        console.log("=== BEFORE REFRESH ===");
        console.log("Current navigation state - Parent ID:", currentParentId, "Level:", currentLevel);
        
        // Refresh folders list to reflect changes
        await refreshFolders();
        
        // Verificar las competencias después del refresh
        console.log("=== AFTER REFRESH ===");
        console.log("Competitions in state:", competitions.length);
        if (currentParentId !== null) {
          try {
            const testCompetitions = await getCompetencesByFolderId(currentParentId);
            console.log("Direct DB query for competitions in current folder:", testCompetitions);
          } catch (error) {
            console.error("Error in direct DB query:", error);
          }
        }
        
        updateLoading("Finalizing...", 100);
        
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

    const saveEditedCompetition = async (id: number) => {
      if (!editingCompetition || isLoadingOperation) return;
      
      if (competitionName.trim() === "") {
        Alert.alert("Error", "Please fill in all required fields.");
        return;
      }
      
      if (!competitionParticipants || isNaN(parseInt(competitionParticipants))) {
        Alert.alert("Error", "Please enter a valid number of participants.");
        return;
      }

      // Close modal and show loading after a short delay
      setEditCompetitionModalVisible(false);
      setTimeout(() => {
        showLoading("Updating competition...", 10);
      }, 300);
      
      const updatedCompetition = {
        ...editingCompetition,
        name: competitionName,
        description: competitionDescription,
        numberOfParticipants: parseInt(competitionParticipants),
        type: competitionType,
      };
  
      try {
        updateLoading("Saving changes...", 50);

        const result = await updateCompetence(id, updatedCompetition);
  
        /* count number of main table related to that competition an if th participants are less delete main table 
        with the competence id from 1 increasing up to the number of participants TODO */
        if (result) {
          updateLoading("Updating competition list...", 80);

          // Refresh folders and competitions to reflect changes
          await refreshFolders();

          updateLoading("Clearing selection...", 95);

          setSelectionMode(false);
          setSelectionAction(null);
          setSelectedCompetitions([]);
          setEditingCompetition(null);

          updateLoading("Update complete!", 100);

          // Wait a moment to show 100% before hiding
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
          Alert.alert("Error", "Failed to update competition.");
        }
      } catch (error) {
        console.error("Error updating competition:", error);
        hideLoading();
        Alert.alert("Error", "Failed to update competition.");
      }
    };

    


// --- LÓGICA DE FOLDERS ---


// --- LÓGICA DE COMPETENCIAS ---
const handleMoveCompetition = () => {

};

const handleRemoveCompetition = async () => {
  if (!selectedCompetitionForOptions) {
    console.log('[REMOVE_COMP] No competition selected');
    Alert.alert("Error", "No competition selected.");
    return;
  }
  // Buscar la carpeta actual de la competencia en folderPath o folders
  let currentFolderId = selectedCompetitionForOptions.folderId;
  let currentFolder = null;
  if (currentFolderId != null) {
    currentFolder = folderPath.find(f => f.id === currentFolderId) || folders.find(f => f.id === currentFolderId);
  } else {
    // Si folderId es nulo, usar el último folder del path (donde está navegando el usuario)
    if (folderPath.length > 0) {
      currentFolder = folderPath[folderPath.length - 1];
      currentFolderId = currentFolder.id;
    }
  }
  console.log('[REMOVE_COMP] currentFolderId:', currentFolderId);
  console.log('[REMOVE_COMP] currentFolder:', currentFolder);
  if (!currentFolder) {
    console.log('[REMOVE_COMP] No se encontró la carpeta de la competencia');
    Alert.alert("Error", "No competition folder found.");
    return;
  }
  // Si el padre de la carpeta actual es null, ya está en root, no permitir
  console.log('[REMOVE_COMP] currentFolder.parentId:', currentFolder.parentId);
  if (currentFolder.parentId === null) {
    console.log('[REMOVE_COMP] La competencia ya está en root, no se puede subir más');
    Alert.alert("Not allowed", "Cannot move competition up, it is already at the root level.");
    return;
  }
  // Subir solo un nivel: el nuevo folderId será el parentId del folder actual
  const newParentId = currentFolder.parentId;
  console.log('[REMOVE_COMP] Subiendo solo un nivel, newParentId:', newParentId);
  try {
    showLoading("Moving competition up one level...");
    await updateCompetence(selectedCompetitionForOptions.id, { folderId: newParentId });
    setShowCompetitionOptionsModal(false);
    await fetchFolders();
    // Navigate to the parent folder after moving the competition
  await navigateFromBreadcrumb(newParentId ?? null);
    setFeedbackAcceptModel(true);
    setTimeout(() => {
      setFeedbackAcceptModel(false);
      hideLoading();
    }, 1200);
  } catch (error) {
    console.log('[REMOVE_COMP] ERROR:', error);
    hideLoading();
    Alert.alert("Error", "Failed to move competition.");
  }
};

  // Add this new function to create Main Table entries with progress tracking
  const createMainTableEntriesWithProgress = async (competenceId: number, numberOfParticipants: number) => {
    try {
      // Create a main table entry for each participant with progress tracking
      for (let i = 1; i <= numberOfParticipants; i++) {
        const progress = 40 + Math.floor((i / numberOfParticipants) * 45); // 40% to 85%
        updateLoading(`Creating gymnast ${i} of ${numberOfParticipants}...`, progress);

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
          percentage: 0,
          stickBonus: false,
          numberOfElements: 0,
          difficultyValues: 0,
          elementGroups1: 0.5,
          elementGroups2: 0.5,
          elementGroups3: 0.5,
          elementGroups4: 0.5,
          elementGroups5: 2.0,
          execution: 0,
          eScore: 0,
          myScore: 2.000,
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
            startValue: 0,
          description: "",
        score: 0,

        };
        
        // Insert the main table entry and get the ID of the inserted row
        const mainTableId = await insertMainTable(mainTableData);
        if (!mainTableId) {
          console.error(`Failed to create main table entry ${i} for competition ID: ${competenceId}`);
          continue;
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
        ]} onPress={currentLevel > 0 ? () => navigateToParent() : goBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text 
            style={[
              isLargeDevice ? styles.headerTitleLarge : null,
              isMediumLargeDevice ? styles.headerTitleMediumLarge : null,
              isSmallDevice ? styles.headerTitleSmall : null,
              isTinyDevice ? styles.headerTitleTiny : null,
            ]}
          >
            {currentLevel > 0 ? "Back" : "Select Discipline"}
          </Text>
        </TouchableOpacity>
        
        {/* ✨ NUEVO: Breadcrumb para navegación anidada */}
        {currentLevel > 0 && folderPath.length > 0 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 10,
            flex: 1,
            flexWrap: 'wrap'
          }}>
            <TouchableOpacity onPress={navigateToRoot}>
              <Text style={{
                fontSize: isLargeDevice ? 14 : isMediumLargeDevice ? 13 : isSmallDevice ? 12 : 11,
                color: '#007AFF',
                fontFamily: "Rajdhani-medium"
              }}>
                Home
              </Text>
            </TouchableOpacity>
            {folderPath.map((folder, index) => (
              <View key={folder.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{
                  fontSize: isLargeDevice ? 14 : isMediumLargeDevice ? 13 : isSmallDevice ? 12 : 11,
                  color: '#666',
                  marginHorizontal: 5
                }}>
                  /
                </Text>
                <TouchableOpacity onPress={() => navigateFromBreadcrumb(folder.id)}>
                  <Text style={{
                    fontSize: isLargeDevice ? 14 : isMediumLargeDevice ? 13 : isSmallDevice ? 12 : 11,
                    color: index === folderPath.length - 1 ? '#333' : '#007AFF',
                    fontFamily: "Rajdhani-medium",
                    maxWidth: 120
                  }} numberOfLines={1}>
                    {folder.name}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
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
            {/* Renderizar carpetas */}
            {folders.map((folder, index) => {
              // Si está activo el modo de mover competencia, al hacer click en un folder se mueve la competencia
              const handleFolderClick = moveCompetitionMode && competitionToMove
                ? () => handleSelectFolderForCompetitionMove(folder.id)
                : () => toggleFolderSelection(folder.id);
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
                    onSelect={handleFolderClick}
                    isSelectedForSwap={selectedCardForSwap === folder.id}
                    isSwapping={isSwapping}
                    onCardPress={handleCardHold}
                    onNavigateToFolder={!moveCompetitionMode ? (id) => navigateToFolder(id) : undefined}
                    hasSubfolders={folder.hasSubfolders}
                    moveCompetitionMode={moveCompetitionMode}
                    handleSelectFolderForCompetitionMove={handleSelectFolderForCompetitionMove}
                  />
                </View>
              );
            })}
            
            {/* ✨ NUEVO: Renderizar competencias */}
            {competitions.map((competition, index) => {
              return (
                <View
                  key={`competition-${competition.id}-${index}-${renderKey}`}
                  style={styles.folderItemContainer}
                >
            <CompetitionItem
              id={competition.id}
              title={competition.name}
              description={competition.description}
              date={competition.date}
              type={competition.type}
              participants={competition.numberOfParticipants}
              selected={selectedCompetitions.includes(competition.id)}
              folderType={competition.gender ? 1 : 2}
              animationDelay={(folders.length + index) * 100}
              selectionMode={selectionMode}
              folderId={competition.folderId}
              gender={competition.gender}
              onSelect={toggleCompetitionSelection}
              onCardHold={handleCompetitionHold}
              moveCompetitionMode={moveCompetitionMode}
              setCompetitionToMove={setCompetitionToMove}
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
        ) : selectionAction === 'edit' && (selectedFolders.length === 1 || selectedCompetitions.length === 1) ? (
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
      {/* Botón Move oculto: la acción de mover carpeta es directa con tap-to-move */}
      
      {selectionMode && selectionAction === 'delete' && (selectedFolders.length > 0 || selectedCompetitions.length > 0) && (
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
  
      {/* Menu Modal: View en iOS (iPhone), Modal en otras plataformas */}
      {(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
        menuVisible && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
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
                {/* ...contenido del menú igual que antes... */}
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
                ]} onPress={() => {
                  if (currentLevel === 0) {
                    alert('Importing at the root level is not allowed. Please enter a folder and try again.');
                    return;
                  }
                  openImportModal();
                }}>
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
          </View>
        )
      ) : (
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
              {/* ...contenido del menú igual que antes... */}
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
              ]} onPress={() => {
                if (currentLevel === 0) {
                  alert('Importing at the root level is not allowed. Please enter a folder and try again.');
                  return;
                }
                openImportModal();
              }}>
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
      )}

{/* Import Folder Modal - Styled */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  showImportModal && (
    <View style={[
      isLargeDevice ? styles.addModalOverlayLarge : null,
      isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
      isSmallDevice ? styles.addModalOverlaySmall : null,
      isTinyDevice ? styles.addModalOverlayTiny : null,
      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }
    ]}>
      <View
        style={[
          isLargeDevice ? styles.addFolderModalLarge : null,
          isMediumLargeDevice ? styles.addFolderModalMediumLarge : null,
          isSmallDevice ? styles.addFolderModalSmall : null,
          isTinyDevice ? styles.addFolderModalTiny : null,
          { alignItems: 'center' }
        ]}
      >
        <Text style={[
          isLargeDevice ? styles.addFolderTitleLarge : null,
          isMediumLargeDevice ? styles.addFolderTitleMediumLarge : null,
          isSmallDevice ? styles.addFolderTitleSmall : null,
          isTinyDevice ? styles.addFolderTitleTiny : null,
          { color: '#007AFF', fontFamily: 'Rajdhani-Bold', marginBottom: 12 }
        ]}>
          Import Folder
        </Text>
        <Text style={[
          isLargeDevice ? styles.modalLabelLarge : null,
          isMediumLargeDevice ? styles.modalLabelMediumLarge : null,
          isSmallDevice ? styles.modalLabelSmall : null,
          isTinyDevice ? styles.modalLabelTiny : null,
          { color: '#333', textAlign: 'center', marginBottom: 18 }
        ]}>
          Select a previously exported .json file to import its data into the current folder.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 370, marginTop: 8 }}>
          <TouchableOpacity
            onPress={handleImportFolder}
            style={[
              isLargeDevice ? styles.confirmButtonLarge : null,
              isMediumLargeDevice ? styles.confirmButtonMediumLarge : null,
              isSmallDevice ? styles.confirmButtonSmall : null,
              isTinyDevice ? styles.confirmButtonTiny : null,
              { backgroundColor: isImporting ? '#A0CFFF' : '#007AFF', width: 170, marginRight: 10 }
            ]}
            disabled={isImporting}
          >
            <Text style={[
              isLargeDevice ? styles.confirmButtonTextLarge : null,
              isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
              isSmallDevice ? styles.confirmButtonTextSmall : null,
              isTinyDevice ? styles.confirmButtonTextTiny : null,
              { color: '#fff', fontWeight: 'bold', textAlign: 'center' }
            ]}>
              {isImporting ? 'Importing...' : 'Select File'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowImportModal(false)}
            style={[
              isLargeDevice ? styles.cancelButtonLarge : null,
              isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
              isSmallDevice ? styles.cancelButtonSmall : null,
              isTinyDevice ? styles.cancelButtonTiny : null,
              { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FF3B30', width: 170, marginLeft: 10 }
            ]}
            disabled={isImporting}
          >
            <Text style={[
              isLargeDevice ? styles.cancelButtonTextLarge : null,
              isMediumLargeDevice ? styles.cancelButtonTextMediumLarge : null,
              isSmallDevice ? styles.cancelButtonTextSmall : null,
              isTinyDevice ? styles.cancelButtonTextTiny : null,
              { color: '#FF3B30', fontWeight: 'bold', textAlign: 'center' }
            ]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
) : (
  <Modal
    visible={showImportModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowImportModal(false)}
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
          { alignItems: 'center' }
        ]}
      >
        <Text style={[
          isLargeDevice ? styles.addFolderTitleLarge : null,
          isMediumLargeDevice ? styles.addFolderTitleMediumLarge : null,
          isSmallDevice ? styles.addFolderTitleSmall : null,
          isTinyDevice ? styles.addFolderTitleTiny : null,
          { color: '#007AFF', fontFamily: 'Rajdhani-Bold', marginBottom: 12 }
        ]}>
          Import Folder
        </Text>
        <Text style={[
          isLargeDevice ? styles.modalLabelLarge : null,
          isMediumLargeDevice ? styles.modalLabelMediumLarge : null,
          isSmallDevice ? styles.modalLabelSmall : null,
          isTinyDevice ? styles.modalLabelTiny : null,
          { color: '#333', textAlign: 'center', marginBottom: 18 }
        ]}>
          Select a previously exported .json file to import its data into the current folder.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 370, marginTop: 8 }}>
          <TouchableOpacity
            onPress={handleImportFolder}
            style={[
              isLargeDevice ? styles.confirmButtonLarge : null,
              isMediumLargeDevice ? styles.confirmButtonMediumLarge : null,
              isSmallDevice ? styles.confirmButtonSmall : null,
              isTinyDevice ? styles.confirmButtonTiny : null,
              { backgroundColor: isImporting ? '#A0CFFF' : '#007AFF', width: 170, marginRight: 10 }
            ]}
            disabled={isImporting}
          >
            <Text style={[
              isLargeDevice ? styles.confirmButtonTextLarge : null,
              isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
              isSmallDevice ? styles.confirmButtonTextSmall : null,
              isTinyDevice ? styles.confirmButtonTextTiny : null,
              { color: '#fff', fontWeight: 'bold', textAlign: 'center' }
            ]}>
              {isImporting ? 'Importing...' : 'Select File'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowImportModal(false)}
            style={[
              isLargeDevice ? styles.cancelButtonLarge : null,
              isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
              isSmallDevice ? styles.cancelButtonSmall : null,
              isTinyDevice ? styles.cancelButtonTiny : null,
              { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FF3B30', width: 170, marginLeft: 10 }
            ]}
            disabled={isImporting}
          >
            <Text style={[
              isLargeDevice ? styles.cancelButtonTextLarge : null,
              isMediumLargeDevice ? styles.cancelButtonTextMediumLarge : null,
              isSmallDevice ? styles.cancelButtonTextSmall : null,
              isTinyDevice ? styles.cancelButtonTextTiny : null,
              { color: '#FF3B30', fontWeight: 'bold', textAlign: 'center' }
            ]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
)}
  
{/* Add Folder Modal */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  addFolderModalVisible && (
    <View style={[
      isLargeDevice ? styles.addModalOverlayLarge : null,
      isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
      isSmallDevice ? styles.addModalOverlaySmall : null,
      isTinyDevice ? styles.addModalOverlayTiny : null,
      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }
    ]}>
      <View 
        style={[
          isLargeDevice ? styles.addFolderModalLarge : null,
          isMediumLargeDevice ? styles.addFolderModalMediumLarge : null,
          isSmallDevice ? styles.addFolderModalSmall : null,
          isTinyDevice ? styles.addFolderModalTiny : null,
        ]}
      >
        {/* ...contenido del modal... */}
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
              isLoadingAddFolder && { opacity: 0.6 }
            ]}
            onPress={addNewFolder}
            disabled={isLoadingAddFolder}
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
            disabled={isLoadingAddFolder}
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
  )
) : (
  <Modal
    animationType="fade"
    transparent={true}
    visible={addFolderModalVisible}
    onRequestClose={isLoadingOperation ? undefined : () => setAddFolderModalVisible(false)}
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
        {/* ...contenido del modal... */}
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
              isLoadingAddFolder && { opacity: 0.6 }
            ]}
            onPress={addNewFolder}
            disabled={isLoadingAddFolder}
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
            disabled={isLoadingAddFolder}
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
)}
  
{/* Edit Folder Modal */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  editFolderModalVisible && (
    <View style={[
      isLargeDevice ? styles.addModalOverlayLarge : null,
      isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
      isSmallDevice ? styles.addModalOverlaySmall : null,
      isTinyDevice ? styles.addModalOverlayTiny : null,
      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }
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
              isLoadingEditFolder && { opacity: 0.6 }
            ]}
            onPress={saveEditedFolder}
            disabled={isLoadingEditFolder}
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
            disabled={isLoadingEditFolder}
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
  )
) : (
  <Modal
    animationType="fade"
    transparent={true}
    visible={editFolderModalVisible}
    onRequestClose={isLoadingOperation ? undefined : () => setEditFolderModalVisible(false)}
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
              isLoadingEditFolder && { opacity: 0.6 }
            ]}
            onPress={saveEditedFolder}
            disabled={isLoadingEditFolder}
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
            disabled={isLoadingEditFolder}
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
)}
  
{/* Delete Confirmation Modal */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  confirmationModel && (
    <View style={[
      isLargeDevice ? styles.addModalOverlayLarge : null,
      isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
      isSmallDevice ? styles.addModalOverlaySmall : null,
      isTinyDevice ? styles.addModalOverlayTiny : null,
      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }
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
              isLoadingDeleteFolder && { opacity: 0.6 }
            ]}
            onPress={performDelete}
            activeOpacity={0.7}
            disabled={isLoadingDeleteFolder}
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
            disabled={isLoadingDeleteFolder}
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
  )
) : (
  <Modal
    animationType="fade"
    transparent={true}
    visible={confirmationModel}
    onRequestClose={isLoadingOperation ? undefined : () => setConfirmationModel(false)}
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
              isLoadingDeleteFolder && { opacity: 0.6 }
            ]}
            onPress={performDelete}
            activeOpacity={0.7}
            disabled={isLoadingDeleteFolder}
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
            disabled={isLoadingDeleteFolder}
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
)}
  
{/* Success Feedback Modal */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  feedbackAcceptModel && (
    <TouchableOpacity
      style={[
        isLargeDevice ? styles.addModalOverlayLarge : null,
        isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
        isSmallDevice ? styles.addModalOverlaySmall : null,
        isTinyDevice ? styles.addModalOverlayTiny : null,
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }
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
  )
) : (
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
)}
  
{/* Add Competition Modal */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  addCompetitionModalVisible && (
    <View style={[
      isLargeDevice ? styles.addModalOverlayLarge : null,
      isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
      isSmallDevice ? styles.addModalOverlaySmall : null,
      isTinyDevice ? styles.addModalOverlayTiny : null,
      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }
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

        {Platform.OS === 'android' ? (
  <>
    <TouchableOpacity
      style={[
        styles.folderInputTiny,
        { justifyContent: 'center', minHeight: 48 }
      ]}
      onPress={() => setShowNumberPad(true)}
      activeOpacity={0.8}
    >
      <Text style={{ color: competitionParticipants ? '#333' : '#888', fontSize: 15 }}>
        {competitionParticipants || 'Number of participants'}
      </Text>
    </TouchableOpacity>
    <CustomNumberPadOptimized
      visible={showNumberPad}
      value={competitionParticipants}
      onValueChange={setCompetitionParticipants}
      onClose={() => setShowNumberPad(false)}
      title="Number of participants"
      allowDecimal={false}
      maxLength={3}
    />
  </>
) : (
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
)}

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
              isLoadingAddCompetition && { opacity: 0.6 }
            ]}
            onPress={addNewCompetition}
            disabled={isLoadingAddCompetition}
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
            disabled={isLoadingAddCompetition}
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
  )
) : (
  <Modal
    animationType="fade"
    transparent={true}
    visible={addCompetitionModalVisible}
    onRequestClose={isLoadingOperation ? undefined : () => setAddCompetitionModalVisible(false)}
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
        {isTinyDevice ? (
  <>
    <TouchableOpacity
      style={[
        styles.folderInputTiny,
        { justifyContent: 'center', minHeight: 48 }
      ]}
      onPress={() => setShowNumberPad(true)}
      activeOpacity={0.8}
    >
      <Text style={{ color: competitionParticipants ? '#333' : '#888', fontSize: 15 }}>
        {competitionParticipants || 'Number of participants'}
      </Text>
    </TouchableOpacity>
    <CustomNumberPadOptimized
      visible={showNumberPad}
      value={competitionParticipants}
      onValueChange={setCompetitionParticipants}
      onClose={() => setShowNumberPad(false)}
      title="Number of participants"
      allowDecimal={false}
      maxLength={3}
    />
  </>
) : (
  <TextInput
    style={[
      isLargeDevice ? styles.folderInputLarge : null,
      isMediumLargeDevice ? styles.folderInputMediumLarge : null,
      isSmallDevice ? styles.folderInputSmall : null,
      isTinyDevice ? styles.folderInputTiny : null,
    ]}
    placeholder="Number of participants"
    placeholderTextColor="#888"
    keyboardType="default"
    value={competitionParticipants}
    onChange={(e) => setCompetitionParticipants(e.nativeEvent.text)}
  />
)}

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
              isLoadingAddCompetition && { opacity: 0.6 }
            ]}
            onPress={addNewCompetition}
            disabled={isLoadingAddCompetition}
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
            disabled={isLoadingAddCompetition}
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
)}

{/* Modal para exportar folders */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  showExportModal && (
    <View style={[
      styles.modalOverlay,
      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }
    ]}>
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
  )
) : (
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
)}

{/* Modal de opciones de competencia */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  showCompetitionOptionsModal && (
    <View style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(30,30,30,0.18)'
    }}>
      <View style={{
        width: isLargeDevice ? 420 : isMediumLargeDevice ? 350 : isSmallDevice ? 300 : 260,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.97)',
        paddingVertical: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 24,
        paddingHorizontal: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: 'Rajdhani-Bold',
          fontSize: isLargeDevice ? 26 : isMediumLargeDevice ? 22 : 18,
          color: '#222',
          marginBottom: isLargeDevice ? 18 : 12,
          letterSpacing: 0.5,
        }}>
          Competition Options
        </Text>
        <View style={{ width: '100%', gap: isLargeDevice ? 18 : 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleMoveCompetitionOption}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Move to another folder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleRemoveCompetition}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Remove from current folder</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{ marginTop: isLargeDevice ? 24 : 16 }}
          onPress={() => setShowCompetitionOptionsModal(false)}
        >
          <Text style={{ color: '#888', fontSize: isLargeDevice ? 16 : 13, fontFamily: 'Rajdhani-medium' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
) : (
  <Modal
    visible={showCompetitionOptionsModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowCompetitionOptionsModal(false)}
  >
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(30,30,30,0.18)' }}>
      <View style={{
        width: isLargeDevice ? 420 : isMediumLargeDevice ? 350 : isSmallDevice ? 300 : 260,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.97)',
        paddingVertical: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 24,
        paddingHorizontal: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: 'Rajdhani-Bold',
          fontSize: isLargeDevice ? 26 : isMediumLargeDevice ? 22 : 18,
          color: '#222',
          marginBottom: isLargeDevice ? 18 : 12,
          letterSpacing: 0.5,
        }}>
          Competition Options
        </Text>
        <View style={{ width: '100%', gap: isLargeDevice ? 18 : 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleMoveCompetitionOption}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Move to another folder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleRemoveCompetition}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Remove from current folder</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{ marginTop: isLargeDevice ? 24 : 16 }}
          onPress={() => setShowCompetitionOptionsModal(false)}
        >
          <Text style={{ color: '#888', fontSize: isLargeDevice ? 16 : 13, fontFamily: 'Rajdhani-medium' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}

{/* Modal de Carga Unificada */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  showLoadingModal && (
    <View style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
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
          shadowOffset: { width: 0, height: 10 },
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
  )
) : (
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
          shadowOffset: { width: 0, height: 10 },
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
)}

{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  editCompetitionModalVisible && (
    <View style={[
      isLargeDevice ? styles.addModalOverlayLarge : null,
      isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
      isSmallDevice ? styles.addModalOverlaySmall : null,
      isTinyDevice ? styles.addModalOverlayTiny : null,
      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }
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
        ]}>
          Edit Competition
        </Text>

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
              isLoadingOperation && { opacity: 0.6 }
            ]}
            onPress={() => editingCompetition?.id && saveEditedCompetition(editingCompetition.id)}
            disabled={isLoadingOperation}
          >
            <Text style={[
              isLargeDevice ? styles.confirmButtonTextLarge : null,
              isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
              isSmallDevice ? styles.confirmButtonTextSmall : null,
              isTinyDevice ? styles.confirmButtonTextTiny : null,
            ]}>
              Save
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              isLargeDevice ? styles.cancelButtonLarge : null,
              isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
              isSmallDevice ? styles.cancelButtonSmall : null,
              isTinyDevice ? styles.cancelButtonTiny : null,
              isLoadingOperation && { opacity: 0.5 }
            ]}
            onPress={() => setEditCompetitionModalVisible(false)}
            disabled={isLoadingOperation}
          >
            <Text style={[
              isLargeDevice ? styles.cancelButtonTextLarge : null,
              isMediumLargeDevice ? styles.cancelButtonTextMediumLarge : null,
              isSmallDevice ? styles.cancelButtonTextSmall : null,
              isTinyDevice ? styles.cancelButtonTextTiny : null,
            ]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
) : (
  <Modal
    animationType="fade"
    transparent={true}
    visible={editCompetitionModalVisible}
    onRequestClose={() => !isLoadingOperation && setEditCompetitionModalVisible(false)}
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
        ]}>
          Edit Competition
        </Text>

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
              isLoadingOperation && { opacity: 0.6 }
            ]}
            onPress={() => editingCompetition?.id && saveEditedCompetition(editingCompetition.id)}
            disabled={isLoadingOperation}
          >
            <Text style={[
              isLargeDevice ? styles.confirmButtonTextLarge : null,
              isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
              isSmallDevice ? styles.confirmButtonTextSmall : null,
              isTinyDevice ? styles.confirmButtonTextTiny : null,
            ]}>
              Save
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              isLargeDevice ? styles.cancelButtonLarge : null,
              isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
              isSmallDevice ? styles.cancelButtonSmall : null,
              isTinyDevice ? styles.cancelButtonTiny : null,
              isLoadingOperation && { opacity: 0.5 }
            ]}
            onPress={() => setEditCompetitionModalVisible(false)}
            disabled={isLoadingOperation}
          >
            <Text style={[
              isLargeDevice ? styles.cancelButtonTextLarge : null,
              isMediumLargeDevice ? styles.cancelButtonTextMediumLarge : null,
              isSmallDevice ? styles.cancelButtonTextSmall : null,
              isTinyDevice ? styles.cancelButtonTextTiny : null,
            ]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
)}

{/* Modal de opciones de carpeta */}
{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  showFolderOptionsModal && (
    <View style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(30,30,30,0.18)'
    }}>
      <View style={{
        width: isLargeDevice ? 420 : isMediumLargeDevice ? 350 : isSmallDevice ? 300 : 260,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.97)',
        paddingVertical: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 24,
        paddingHorizontal: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: 'Rajdhani-Bold',
          fontSize: isLargeDevice ? 26 : isMediumLargeDevice ? 22 : 18,
          color: '#222',
          marginBottom: isLargeDevice ? 18 : 12,
          letterSpacing: 0.5,
        }}>
          Folder Options
        </Text>
        <View style={{ width: '100%', gap: isLargeDevice ? 18 : 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={() => {
              setSelectionMode(true);
              setSelectionAction('move');
              if (selectedFolderForOptions?.id != null) {
                setSelectedFolders([selectedFolderForOptions.id]);
              } else {
                Alert.alert('Select a folder', 'No folder selected to move.');
                return;
              }
              setShowFolderOptionsModal(false);
              setAvailableFoldersForMove(folders.filter(f => f.id !== selectedFolderForOptions?.id));
            }}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Move to another folder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleRemoveFromFolder}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Remove from current folder</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{ marginTop: isLargeDevice ? 24 : 16 }}
          onPress={() => setShowFolderOptionsModal(false)}
        >
          <Text style={{ color: '#888', fontSize: isLargeDevice ? 16 : 13, fontFamily: 'Rajdhani-medium' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
) : (
  <Modal
    visible={showFolderOptionsModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowFolderOptionsModal(false)}
  >
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(30,30,30,0.18)' }}>
      <View style={{
        width: isLargeDevice ? 420 : isMediumLargeDevice ? 350 : isSmallDevice ? 300 : 260,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.97)',
        paddingVertical: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 24,
        paddingHorizontal: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: 'Rajdhani-Bold',
          fontSize: isLargeDevice ? 26 : isMediumLargeDevice ? 22 : 18,
          color: '#222',
          marginBottom: isLargeDevice ? 18 : 12,
          letterSpacing: 0.5,
        }}>
          Folder Options
        </Text>
        <View style={{ width: '100%', gap: isLargeDevice ? 18 : 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={() => {
              setSelectionMode(true);
              setSelectionAction('move');
              if (selectedFolderForOptions?.id != null) {
                setSelectedFolders([selectedFolderForOptions.id]);
              } else {
                Alert.alert('Select a folder', 'No folder selected to move.');
                return;
              }
              setShowFolderOptionsModal(false);
              setAvailableFoldersForMove(folders.filter(f => f.id !== selectedFolderForOptions?.id));
            }}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Move to another folder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleRemoveFromFolder}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Remove from current folder</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{ marginTop: isLargeDevice ? 24 : 16 }}
          onPress={() => setShowFolderOptionsModal(false)}
        >
          <Text style={{ color: '#888', fontSize: isLargeDevice ? 16 : 13, fontFamily: 'Rajdhani-medium' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}

{(Platform.OS === 'ios' && !Platform.isPad) || (Platform.OS === 'android' && isTinyDevice) ? (
  showCompetitionOptionsModal && (
    <View style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(30,30,30,0.18)'
    }}>
      <View style={{
        width: isLargeDevice ? 420 : isMediumLargeDevice ? 350 : isSmallDevice ? 300 : 260,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.97)',
        paddingVertical: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 24,
        paddingHorizontal: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: 'Rajdhani-Bold',
          fontSize: isLargeDevice ? 26 : isMediumLargeDevice ? 22 : 18,
          color: '#222',
          marginBottom: isLargeDevice ? 18 : 12,
          letterSpacing: 0.5,
        }}>
          Competition Options
        </Text>
        <View style={{ width: '100%', gap: isLargeDevice ? 18 : 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleMoveCompetitionOption}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Move to another folder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleRemoveCompetition}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Remove from current folder</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{ marginTop: isLargeDevice ? 24 : 16 }}
          onPress={() => setShowCompetitionOptionsModal(false)}
        >
          <Text style={{ color: '#888', fontSize: isLargeDevice ? 16 : 13, fontFamily: 'Rajdhani-medium' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
) : (
  <Modal
    visible={showCompetitionOptionsModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowCompetitionOptionsModal(false)}
  >
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(30,30,30,0.18)' }}>
      <View style={{
        width: isLargeDevice ? 420 : isMediumLargeDevice ? 350 : isSmallDevice ? 300 : 260,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.97)',
        paddingVertical: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 24,
        paddingHorizontal: isLargeDevice ? 38 : isMediumLargeDevice ? 32 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: 'Rajdhani-Bold',
          fontSize: isLargeDevice ? 26 : isMediumLargeDevice ? 22 : 18,
          color: '#222',
          marginBottom: isLargeDevice ? 18 : 12,
          letterSpacing: 0.5,
        }}>
          Competition Options
        </Text>
        <View style={{ width: '100%', gap: isLargeDevice ? 18 : 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleMoveCompetitionOption}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Move to another folder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              borderRadius: 12,
              paddingVertical: isLargeDevice ? 16 : 12,
              alignItems: 'center',
              marginBottom: 6,
            }}
            onPress={handleRemoveCompetition}
          >
            <Text style={{ fontSize: isLargeDevice ? 18 : 15, color: '#222', fontFamily: 'Rajdhani-medium' }}>Remove from current folder</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{ marginTop: isLargeDevice ? 24 : 16 }}
          onPress={() => setShowCompetitionOptionsModal(false)}
        >
          <Text style={{ color: '#888', fontSize: isLargeDevice ? 16 : 13, fontFamily: 'Rajdhani-medium' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}
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
    width: '98%',
    backgroundColor: '#F1F3F5',
    borderRadius: 9,
    padding: 7,
    position: 'relative',
  },
  // Folder item styles - Small Device
  folderItemSmall: {
    height: 140,
    width: '98%',
    backgroundColor: '#F1F3F5',
    borderRadius: 8,
    padding: 6,
    position: 'relative',
  },
  // Folder item styles - Tiny Device
  folderItemTiny: {
    height: 125,
    width: '98%',
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
    width: 100,
    height: 105,
    borderRadius: 5,
    marginBottom: 6,
    position: 'absolute',
    top: 20,
    left: 20,
  },
  // Folder icon styles - Medium Large Device
  folderIconMediumLarge: {
    width: 95,
    height: 100,
    borderRadius: 5,
    marginBottom: 5,
    position: 'absolute',
    top: 18,
    left: 18,
  },
  // Folder icon styles - Small Device
  folderIconSmall: {
    width: 85,
    height: 90,
    borderRadius: 5,
    marginBottom: 4,
    position: 'absolute',
    top: 15,
    left: 12,
  },
  // Folder icon styles - Tiny Device
  folderIconTiny: {
    width: 80,
    height: 90,
    borderRadius: 5,
    marginBottom: 4,
    position: 'absolute',
    top: 10,
    left: 5,
  },
  
  folderType1: {
    height: 50,
    borderRadius: 5,
  },
  folderType2: {
    height: 50,
    borderRadius: 5,
  },
  
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
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  // Folder title styles - Medium Large Device
  folderTitleMediumLarge: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  // Folder title styles - Small Device
  folderTitleSmall: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  // Folder title styles - Tiny Device
  folderTitleTiny: {
    fontSize: 12,
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
    fontSize: 8,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 2,
  },
  // Folder description styles - Small Device
  folderDescriptionSmall: {
    fontSize: 14,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  
  // Date text styles - Large Device
  dateTextLarge: {
    fontSize: 18,
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
    fontSize: 12,
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
    fontSize: 15,
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
    fontSize: 12,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute', 
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center', 
    bottom: 1,
  },

  // Date text styles - Large Device
  dateTextLargecompe: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute',
    alignSelf: 'center',
    width: '74%',
    textAlign: 'center', 
    bottom: 5,
    right: 0,

  },
  // Date text styles - Medium Large Device
  dateTextMediumLargecompe: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute',
    alignSelf: 'center',
    width: '73%',
    textAlign: 'center', 
    bottom: 2,
    right: 0,

  },
  // Date text styles - Small Device
  dateTextSmallcompe: {
    fontSize: 15,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute', 
    alignSelf: 'center',
    width: '73%',
    textAlign: 'center', 
    bottom: 5,
    right: 0,

  },

  // Date text styles - Tiny Device
  dateTextTinycompe: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute', 
    alignSelf: 'center',
    width: '74%',
    textAlign: 'center', 
    bottom: 1,
    right: 0,
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
    width: '100%',
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
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Rajdhani-medium',
  },
  // Add folder title styles - Medium Large Device
  addFolderTitleMediumLarge: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 18,
    fontFamily: 'Rajdhani-medium',
  },
  // Add folder title styles - Small Device
  addFolderTitleSmall: {
    fontSize: 30,
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
    maxHeight: 45,
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
  },

  // ✨ ESTILOS PARA COMPETENCIAS (copiados de folder.tsx)
  
  // Folder content styles - Large Device
  folderContentLarge: {
    alignItems: 'center',
  },
  // Folder content styles - Medium Large Device
  folderContentMediumLarge: {
    alignItems: 'center',
  },
  // Folder content styles - Small Device
  folderContentSmall: {
    alignItems: 'center',
  },
  // Folder content styles - Tiny Device
  folderContentTiny: {
    alignItems: 'center',
  },

  // Line styles - Large Device
  lineLarge: {
    height: 1,
    backgroundColor: "#333",
    width: "90%",
    marginBottom: 10,
    alignSelf: "center",
  },
  // Line styles - Medium Large Device
  lineMediumLarge: {
    height: 1,
    backgroundColor: "#333",
    width: "88%",
    marginBottom: 9,
    alignSelf: "center",
  },
  // Line styles - Small Device
  lineSmall: {
    height: 1,
    backgroundColor: "#333",
    width: "85%",
    marginBottom: 8,
    alignSelf: "center",
  },
  // Line styles - Tiny Device
  lineTiny: {
    height: 1,
    backgroundColor: "#333",
    width: "90%",
    marginBottom: 10,
    alignSelf: "center",
  },

  // Entrainement button styles - Large Device
  entrainementButtonLarge: {
    backgroundColor: '#DADADA',
    borderRadius: 12,
    paddingHorizontal: 4,
    borderBlockColor: '#999',
    borderWidth: 2,
    borderColor: '#999',
    width: 130,
    height: 30,
    paddingVertical: 2,
  },
  // Entrainement button styles - Medium Large Device
  entrainementButtonMediumLarge: {
    backgroundColor: '#DADADA',
    borderRadius: 11,
    paddingHorizontal: 4,
    borderBlockColor: '#999',
    borderWidth: 2,
    borderColor: '#999',
    width: 100,
    height: 28,
    paddingVertical: 2,
  },
  // Entrainement button styles - Small Device
  entrainementButtonSmall: {
    backgroundColor: '#DADADA',
    borderRadius: 10,
    paddingHorizontal: 4,
    borderBlockColor: '#999',
    borderWidth: 2,
    borderColor: '#999',
    width: 100,
    height: 26,
    paddingVertical: 2,
  },
  // Entrainement button styles - Tiny Device
  entrainementButtonTiny: {
    backgroundColor: '#DADADA',
    borderRadius: 12,
    paddingHorizontal: 4,
    borderBlockColor: '#999',
    borderWidth: 2,
    borderColor: '#999',
    width: 70,
    height: 24,
    paddingVertical: 2,
  },

  // Entrainement text styles - Large Device
  entrainementTextLarge: {
    fontSize: 18,
    bottom: 2,
    position: 'relative',
    alignSelf: 'center',
    color: '#333',
  },
  // Entrainement text styles - Medium Large Device
  entrainementTextMediumLarge: {
    fontSize: 9,
    bottom: 2,
    position: 'relative',
    alignSelf: 'center',
    color: '#333',
  },
  // Entrainement text styles - Small Device
  entrainementTextSmall: {
    fontSize: 14,
    bottom: 1,
    position: 'relative',
    alignSelf: 'center',
    color: '#333',
  },
  // Entrainement text styles - Tiny Device
  entrainementTextTiny: {
    fontSize: 13,
    bottom: 2,
    position: 'relative',
    alignSelf: 'center',
    color: '#333',
  },

  // Checkmark styles - Large Device (para competencias seleccionadas)
  checkmarkLarge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Checkmark styles - Medium Large Device
  checkmarkMediumLarge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#fff',
    borderRadius: 9,
    width: 19,
    height: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Checkmark styles - Small Device
  checkmarkSmall: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Checkmark styles - Tiny Device
  checkmarkTiny: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MainMenu;