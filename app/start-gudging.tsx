import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker"; // Install if not present: npx expo install @react-native-picker/picker
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { read, utils } from "xlsx";
import {
  deleteMainTable,
  deleteRateGeneralByTableId,
  getCompetenceById,
  getMainTableById,
  getMainTablesByCompetenceId,
  getRateGeneralByTableId,
  insertMainTable,
  insertRateGeneral,
  updateCompetence,
  updateMainTable,
} from "../Database/database"; // Adjust the import path as needed

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get("window");
const isLargeScreen = width >= 1000 && height >= 700;

var isLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;
if (width >= 1200 && height >= 700) {
  isLargeDevice = true;
}
if (width < 1200 && width >= 950) {
  isSmallDevice = true;
}
if (width < 949) {
  isTinyDevice = true;
}

// Define the type for a gymnast entry
// Define the type for a gymnast entry
interface GymnastEntry {
  id: number;
  competenceId: number;
  number: number;
  name: string;
  event: string;
  noc: string;
  bib: string;
  // Agregar todos los campos de scoring
  j?: number;
  i?: number;
  h?: number;
  g?: number;
  f?: number;
  e?: number;
  d?: number;
  c?: number;
  b?: number;
  a?: number;
  dv?: number;
  eg?: number;
  sb?: number;
  nd?: number;
  cv?: number;
  sv?: number;
  e2?: number;
  d3?: number;
  e3?: number;
  delt?: number;
  percentage?: number;
  // Campos adicionales que puedan existir
  rateGeneralData?: any;
}

// Define the props for the component
interface GymnasticsTableProps {
  onStartJudging?: (discipline: string) => void;
}

const DropdownList = ({
  visible,
  discipline,
  onSelect,
  onClose,
  top = 100,
  left = 50,
  width = 200,
}) => {
  if (!visible) return null;

  const options = discipline
    ? ["FX", "VT", "PH", "SR", "PB", "HB"]
    : ["FX", "UB", "BB", "VT"];

  return (
    <View style={[styles.dropdownContainer, { top, left, width }]}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={styles.dropdownItem}
          onPress={() => {
            if (onSelect) {
              onSelect(option);
            }
            if (onClose) {
              onClose();
            }
          }}
        >
          <Text style={styles.dropdownItemText}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const GymnasticsTable: React.FC<GymnasticsTableProps> = ({
  onStartJudging,
}) => {
  const params = useLocalSearchParams();
  const discipline = params.discipline === "true";
  const participants = params.participants ? Number(params.participants) : 0;
  const competenceId = params.id ? Number(params.id) : 0;
  const number = params.number ? Number(params.number) : 1;
  const folderId = params.folderId;
  const backButtonOpacity = useRef(new Animated.Value(0)).current;
  const backButtonTranslateX = useRef(new Animated.Value(50)).current;

  // Define the event options based on discipline
  const maleEvents = ["FX", "VT", "PH", "SR", "PB", "HB"];
  const femaleEvents = ["FX", "UB", "BB", "VT"];
  const eventOptions = discipline ? maleEvents : femaleEvents;

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [activeDropdownGymnastId, setActiveDropdownGymnastId] = useState<
    number | null
  >(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // Replace single delete states with multiple selection states
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedGymnasts, setSelectedGymnasts] = useState<number[]>([]);
  const [nameSearch, setNameSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [bibSearch, setBibSearch] = useState("");
  const [gymnasts, setGymnasts] = useState<GymnastEntry[]>([]);
  const [competenceName, setCompetenceName] = useState("");
  const [competenceData, setCompetenceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Dropdown states
  const [searchDropdownVisible, setSearchDropdownVisible] = useState(false);
  const [activeRowDropdown, setActiveRowDropdown] = useState<number | null>(
    null
  );

  // Historial para funcionalidad de deshacer
  const [history, setHistory] = useState<
    {
      action: "delete" | "add";
      gymnasts: GymnastEntry[];
      timestamp: number;
    }[]
  >([]);

  // Refs to store positions for dropdowns
  const searchButtonRef = useRef<View>(null);
  const [searchDropdownPosition, setSearchDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 200,
  });
  const rowRefs = useRef<{ [key: number]: any }>({});
  const [rowDropdownPosition, setRowDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 150,
  });

  // State for confirmation modal
  const [confirmationModal, setConfirmationModal] = useState(false);
  // Remove gymnastToDelete state as we now use selectedGymnasts
  const [isearching, setIsSearching] = useState(false);
  const [invalidGymnastIds, setInvalidGymnastIds] = useState<number[]>([]);
  const [isTypeSearchExpanded, setIsTypeSearchExpanded] = useState(false);

  // Track which field is being edited
  const [editingField, setEditingField] = useState<{
    gymnastId: number | null;
    field: string | null;
  }>({ gymnastId: null, field: null });

  // Animation values
  const searchBarOpacity = useRef(new Animated.Value(0)).current;
  const searchBarTranslateY = useRef(new Animated.Value(-50)).current;
  const tableOpacity = useRef(new Animated.Value(0)).current;
  const tableScale = useRef(new Animated.Value(0.95)).current;
  const buttonContainerOpacity = useRef(new Animated.Value(0)).current;
  const buttonContainerTranslateY = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Row animation values (for staggered effect)
  const rowAnimations = useRef<
    { opacity: Animated.Value; translateX: Animated.Value }[]
  >([]).current;

  const router = useRouter();

  // Initialize row animations only on initial load
  useEffect(() => {
    if (!initialLoadComplete && gymnasts.length > 0) {
      // Reset and recreate row animations
      rowAnimations.length = 0;

      gymnasts.forEach(() => {
        rowAnimations.push({
          opacity: new Animated.Value(0),
          translateX: new Animated.Value(-20),
        });
      });

      // Start the row animations
      rowAnimations.forEach((anim, index) => {
        Animated.sequence([
          Animated.delay(700 + index * 100), // Staggered delay for each row
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease),
            }),
            Animated.timing(anim.translateX, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
              easing: Easing.out(Easing.back(1.5)),
            }),
          ]),
        ]).start();
      });

      setInitialLoadComplete(true);
    }
  }, [gymnasts, initialLoadComplete]);

  // Run animations when component mounts
  useEffect(() => {
    // Animate search bar
    Animated.timing(searchBarOpacity, {
      toValue: 1,
      duration: 2000, // Changed from 600 to 2000 ms (2 seconds)
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();

    Animated.timing(searchBarTranslateY, {
      toValue: 0,
      duration: 2000, // Changed from 700 to 2000 ms (2 seconds)
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.2)),
    }).start();

    // Animate table
    Animated.sequence([
      Animated.delay(300), // Wait for search bar animation
      Animated.timing(tableOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(tableScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.05)),
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(500), // Start after search bar animation begins
      Animated.parallel([
        Animated.timing(backButtonOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(backButtonTranslateX, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }),
      ]),
    ]).start();

    // Animate button container
    Animated.sequence([
      Animated.delay(1200), // Wait for table animation
      Animated.parallel([
        Animated.timing(buttonContainerOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(buttonContainerTranslateY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }),
      ]),
    ]).start();
  }, []);

  // Load gymnasts data from AsyncStorage based on competenceId
  useEffect(() => {
    const loadData = async () => {
      if (competenceId) {
        setIsLoading(true);
        try {
          // Load competence data
          const competence = await getCompetenceById(competenceId);
          if (competence) {
            setCompetenceName(competence.name);
            setCompetenceData(competence);
          }

          // Load gymnasts data
          const tables = await getMainTablesByCompetenceId(competenceId);
          const formattedGymnasts = tables.map((table) => ({
            id: table.id,
            competenceId: table.competenceId,
            number: table.number,
            name: table.name || "",
            event: table.event || "",
            noc: table.noc?.toString() || "", // Convert to string
            bib: table.bib?.toString() || "",
            // Add other fields as needed
          }));

          setGymnasts(formattedGymnasts);
        } catch (error) {
          console.error("Error loading data:", error);
          Alert.alert("Error", "Failed to load gymnasts data");
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [competenceId]);

  // Effect to measure search dropdown position
  useEffect(() => {
    if (searchButtonRef.current) {
      searchButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setSearchDropdownPosition({
          top: pageY + height,
          left: pageX,
          width: width,
        });
      });
    }
  }, [searchDropdownVisible]);

  // Effect to measure row dropdown position
  useEffect(() => {
    if (activeRowDropdown !== null && rowRefs.current[activeRowDropdown]) {
      rowRefs.current[activeRowDropdown].measure(
        (x, y, width, height, pageX, pageY) => {
          setRowDropdownPosition({
            top: pageY + height,
            left: pageX,
            width: width,
          });
        }
      );
    }
  }, [activeRowDropdown]);

  const handleSearch = () => {
    // Filter gymnasts based on search criteria
    setIsSearching(true);
    const loadData = async () => {
      if (competenceId) {
        setIsLoading(true);
        try {
          // Load all gymnasts first
          const tables = await getMainTablesByCompetenceId(competenceId);
          let filteredTables = tables;

          // Apply filters if search terms are provided
          if (nameSearch) {
            filteredTables = filteredTables.filter((table) =>
              table.name?.toLowerCase().includes(nameSearch.toLowerCase())
            );
          }

          if (typeSearch) {
            filteredTables = filteredTables.filter(
              (table) => table.event === typeSearch
            );
          }

          if (bibSearch) {
            filteredTables = filteredTables.filter((table) =>
              table.bib?.toString().includes(bibSearch)
            );
          }

          const formattedGymnasts = filteredTables.map((table) => ({
            id: table.id,
            competenceId: table.competenceId,
            number: table.number,
            name: table.name || "",
            event: table.event || "",
            noc: table.noc?.toString() || "",
            bib: table.bib?.toString() || "",
            // Add other fields as needed
          }));

          setGymnasts(formattedGymnasts);
          console.log("Filtered gymnasts:", formattedGymnasts);
          if (!nameSearch && !typeSearch && !bibSearch) {
            setIsSearching(false);
          }
        } catch (error) {
          console.error("Error searching data:", error);
          Alert.alert("Error", "Failed to search gymnasts data");
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
    // Close dropdown after search
    setSearchDropdownVisible(false);
  };

  // Function to handle opening the event dropdown for a specific gymnast
  const handleOpenEventDropdown = (gymnastId: number) => {
    // First close any open dropdowns
    setActiveRowDropdown(null);
    setSearchDropdownVisible(false);

    // Set the active gymnast for the dropdown
    setActiveDropdownGymnastId(gymnastId);

    // Find the position for the dropdown
    if (rowRefs.current[gymnastId]) {
      // Use setTimeout to ensure the measure happens after the current render cycle
      // This helps with iOS rendering issues
      setTimeout(() => {
        rowRefs.current[gymnastId].measure(
          (x, y, width, height, pageX, pageY) => {
            // Calculate dropdown height (approximately 50px per item + padding)
            const dropdownHeight = (eventOptions.length - 0.5) * 50 + 20; // +1 for "None" option
            const screenHeight = Dimensions.get("window").height;

            // Check if there's enough space below the button
            const spaceBelow = screenHeight - (pageY + height);
            const spaceAbove = pageY;

            let dropdownTop;
            if (spaceBelow >= dropdownHeight) {
              // Show below (normal behavior)
              dropdownTop = pageY + height;
            } else if (spaceAbove >= dropdownHeight) {
              // Show above with some padding from the top
              dropdownTop = pageY - dropdownHeight - 10; // Added 10px padding
            } else {
              // Not enough space either way, show where there's more space
              if (spaceAbove > spaceBelow) {
                dropdownTop = Math.max(50, pageY - dropdownHeight - 10); // Changed from 20px to 50px margin from top + 10px padding
              } else {
                dropdownTop = pageY + height;
              }
            }

            setRowDropdownPosition({
              top: dropdownTop,
              left: pageX,
              width: width,
            });

            // Now show the dropdown
            setDropdownVisible(true);
          }
        );
      }, 100);
    } else {
      // Fallback if ref isn't available
      setDropdownVisible(true);
    }
  };

  // Start editing a field
  const startEditing = (gymnastId: number, field: string) => {
    setEditingField({ gymnastId, field });

    // For event field, open dropdown
    if (field === "event") {
      handleOpenEventDropdown(gymnastId);
    }
  };

  // Function to handle changes to gymnast data
  const handleGymnastChange = (
    id: number,
    field: keyof GymnastEntry,
    value: any
  ) => {
    setGymnasts((prevGymnasts) =>
      prevGymnasts.map((gymnast) =>
        gymnast.id === id ? { ...gymnast, [field]: value } : gymnast
      )
    );
  };

  // Function to handle event selection from dropdown
  const handleEventSelect = (event: string) => {
    if (activeDropdownGymnastId !== null) {
      // First update the gymnast data with the new event
      handleGymnastChange(activeDropdownGymnastId, "event", event);

      // Then immediately save this change to the database
      const gymnast = gymnasts.find((g) => g.id === activeDropdownGymnastId);
      if (gymnast) {
        // Create an updated gymnast object with the new event
        const updatedGymnast = { ...gymnast, event };

        // Save to database
        updateMainTable(activeDropdownGymnastId, updatedGymnast)
          .then(() => {
            console.log(
              `Event updated for gymnast ${activeDropdownGymnastId} to ${event}`
            );
          })
          .catch((error) => {
            console.error("Error saving event:", error);
            Alert.alert("Error", "Failed to save event change");
          });
      }

      // Close the dropdown and reset editing state
      setDropdownVisible(false);
      setActiveDropdownGymnastId(null);
      setEditingField({ gymnastId: null, field: null });
    }
  };

  // Function to save edited field to database
  const saveField = async (gymnastId: number) => {
    try {
      const gymnast = gymnasts.find((g) => g.id === gymnastId);
      if (gymnast) {
        await updateMainTable(gymnastId, gymnast);
        console.log(`Field updated for gymnast ${gymnastId}`);
      }
    } catch (error) {
      console.error("Error saving field:", error);
      Alert.alert("Error", "Failed to save changes");
    } finally {
      setEditingField({ gymnastId: null, field: null });
      setActiveRowDropdown(null);
    }
  };

  // Toggle delete mode on/off
  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedGymnasts([]); // Clear selections when toggling
    // Close any open dropdowns
    setSearchDropdownVisible(false);
    setActiveRowDropdown(null);
    setDropdownVisible(false);
  };

  // Handle gymnast selection for deletion
  const toggleGymnastSelection = (gymnastId: number) => {
    setSelectedGymnasts((prev) => {
      if (prev.includes(gymnastId)) {
        return prev.filter((id) => id !== gymnastId);
      } else {
        return [...prev, gymnastId];
      }
    });
  };

  // Show confirmation modal for deletion
  const showDeleteConfirmation = () => {
    if (selectedGymnasts.length > 0) {
      setConfirmationModal(true);
    }
  };

// Perform the actual deletion
const performDelete = async () => {
  if (selectedGymnasts.length === 0) {
    setConfirmationModal(false);
    return;
  }

  try {
    // Obtener datos completos de los gimnastas a eliminar
    const completeGymnastsToDelete = [];
    
    for (const gymnastId of selectedGymnasts) {
      // Obtener datos completos de MainTable
      const mainTableData = await getMainTableById(gymnastId);
      // Obtener datos de RateGeneral si existen
      const rateGeneralData = await getRateGeneralByTableId(gymnastId);
      
      if (mainTableData) {
        completeGymnastsToDelete.push({
          ...mainTableData,
          rateGeneralData: rateGeneralData || null
        });
      }
    }
    
    // Agregar al historial ANTES de eliminar con datos completos
    addHistory('delete', completeGymnastsToDelete);

    // Delete from database (incluyendo RateGeneral)
    for (const gymnastId of selectedGymnasts) {
      // Primero eliminar RateGeneral si existe
      try {
        await deleteRateGeneralByTableId(gymnastId);
      } catch (error) {
        console.warn("No RateGeneral data to delete for gymnast:", gymnastId);
      }
      // Luego eliminar MainTable
      await deleteMainTable(gymnastId);
    }

    // Remove from local state
    const remainingGymnasts = gymnasts.filter(
      gymnast => !selectedGymnasts.includes(gymnast.id)
    );

    // Reorganize numbers
    const reorganizedGymnasts = remainingGymnasts.map((gymnast, index) => ({
      ...gymnast,
      number: index + 1
    }));

    // Update numbers in database
    for (const gymnast of reorganizedGymnasts) {
      if (gymnast.number !== gymnasts.find(g => g.id === gymnast.id)?.number) {
        await updateMainTable(gymnast.id, { number: gymnast.number });
      }
    }

    setGymnasts(reorganizedGymnasts);

    // Update competition number of participants
    if (competenceData && competenceData.numberOfParticipants > 0) {
      const updatedCompetence = {
        ...competenceData,
        numberOfParticipants: competenceData.numberOfParticipants - selectedGymnasts.length,
      };

      await updateCompetence(competenceId, updatedCompetence);
      setCompetenceData(updatedCompetence);
    }

    // Reset selections and exit delete mode
    setSelectedGymnasts([]);
    setIsDeleteMode(false);

  } catch (error) {
    console.error("Error deleting gymnasts:", error);
    Alert.alert("Error", "Failed to delete selected gymnasts");
  } finally {
    setConfirmationModal(false);
  }
};

  const handleAddGymnast = async () => {
    try {
      // Encontrar el siguiente número disponible
      const usedNumbers = gymnasts.map((g) => g.number);
      let newNumber = 1;
      while (usedNumbers.includes(newNumber)) {
        newNumber++;
      }

      // Crear un nuevo gimnasta con valores predeterminados
      const newGymnast = {
        competenceId: competenceId,
        number: newNumber,
        name: "",
        event: "",
        noc: "",
        bib: "",
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
      };

      // Insertar en la base de datos
      const id = await insertMainTable(newGymnast);

      // Crear la entrada correspondiente en MainRateGeneral
      const mainRateGeneralData = {
        tableId: id as number,
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
        vaultNumber: "0",
        vaultDescription: "",
      };

      await insertRateGeneral(mainRateGeneralData);

      if (id) {
        // Agregar al estado local y reordenar
        // Crear el gimnasta agregado para el historial
        const addedGymnast = { ...newGymnast, id };
        
        // Agregar al historial
        addHistory('add', [addedGymnast]);

        // Agregar al estado local y reordenar
        const updatedGymnasts = [...gymnasts, addedGymnast];
        const sortedGymnasts = updatedGymnasts.sort((a, b) => a.number - b.number);



        // Aplicar animación de reordenamiento
        rowAnimations.length = 0;
        sortedGymnasts.forEach(() => {
          rowAnimations.push({
            opacity: new Animated.Value(0),
            translateX: new Animated.Value(-20),
          });
        });

        setGymnasts(sortedGymnasts);

        // Iniciar animación
        rowAnimations.forEach((anim, index) => {
          Animated.sequence([
            Animated.delay(index * 100), // Retraso escalonado
            Animated.parallel([
              Animated.timing(anim.opacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(anim.translateX, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
            ]),
          ]).start();
        });

        // Actualizar número de participantes en la competencia
        if (competenceData) {
          const updatedCompetence = {
            ...competenceData,
            numberOfParticipants:
              (competenceData.numberOfParticipants || 0) + 1,
          };
          await updateCompetence(competenceId, updatedCompetence);
          setCompetenceData(updatedCompetence);
        }
      }
    } catch (error) {
      console.error("Error adding gymnast:", error);
      Alert.alert("Error", "Failed to add new gymnast");
    }
  };

  // Función para reordenar los gimnastas y aplicar animación
  const reorderGymnasts = async () => {
    try {
      // Ordenar gimnastas por número
      const sortedGymnasts = [...gymnasts].sort((a, b) => a.number - b.number);

      // Actualizar números en la base de datos
      for (const [index, gymnast] of sortedGymnasts.entries()) {
        if (gymnast.number !== index + 1) {
          await updateMainTable(gymnast.id, { number: index + 1 });
          gymnast.number = index + 1; // Actualizar localmente
        }
      }

      // Aplicar animación de reordenamiento
      rowAnimations.length = 0;
      sortedGymnasts.forEach(() => {
        rowAnimations.push({
          opacity: new Animated.Value(0),
          translateX: new Animated.Value(-20),
        });
      });

      setGymnasts(sortedGymnasts);

      // Iniciar animación
      rowAnimations.forEach((anim, index) => {
        Animated.sequence([
          Animated.delay(index * 100), // Retraso escalonado
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateX, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    } catch (error) {
      console.error("Error reordering gymnasts:", error);
      Alert.alert("Error", "Failed to reorder gymnasts.");
    }
  };

  const handleSelectStart = () => {
    // Validate gymnasts for empty fields
    const invalids = gymnasts
      .filter((g) => !g.name || !g.event || !g.noc)
      .map((g) => g.id);

    if (invalids.length > 0) {
      setInvalidGymnastIds(invalids);
      /* Alert.alert("Incomplete Gymnast", "Please fill all fields for each gymnast."); */

      // Scroll to the first invalid gymnast
      const firstInvalidIndex = gymnasts.findIndex((g) => g.id === invalids[0]);
      if (firstInvalidIndex !== -1 && scrollViewRef.current) {
        // Adjust 60 to your row height if needed
        scrollViewRef.current.scrollTo({
          y: firstInvalidIndex * 60,
          animated: true,
        });
      }

      setTimeout(() => setInvalidGymnastIds([]), 1000);
      return;
    }

    /* start go to the first gymnast */
    if (gymnasts.length > 0) {
      if (number !== 0) {
        const firstGymnast = gymnasts[number - 1];
        if (firstGymnast === undefined) {
          const firstGymnast = gymnasts[0];
          const event = firstGymnast.event;
          if (event === "VT") {
            router.replace(
              `/main-jump?competenceId=${firstGymnast.competenceId}&gymnastId=${
                firstGymnast.id
              }&event=${event}&discipline=${discipline}&gymnast=${
                firstGymnast.id
              }&number=${
                number + 1
              }&participants=${participants}&folderId=${folderId}`
            );
          } else {
            router.replace(
              `/main-floor?competenceId=${
                firstGymnast.competenceId
              }&gymnastId=${
                firstGymnast.id
              }&event=${event}&discipline=${discipline}&gymnast=${
                firstGymnast.id
              }&number=${
                number + 1
              }&participants=${participants}&folderId=${folderId}`
            );
          }
          return;
        }
        const event = firstGymnast.event;
        if (event === "VT") {
          router.replace(
            `/main-jump?competenceId=${firstGymnast.competenceId}&gymnastId=${
              firstGymnast.id
            }&event=${event}&discipline=${discipline}&gymnast=${
              firstGymnast.id
            }&number=${
              number + 1
            }&participants=${participants}&folderId=${folderId}`
          );
        } else {
          router.replace(
            `/main-floor?competenceId=${firstGymnast.competenceId}&gymnastId=${
              firstGymnast.id
            }&event=${event}&discipline=${discipline}&gymnast=${
              firstGymnast.id
            }&number=${
              number + 1
            }&participants=${participants}&folderId=${folderId}`
          );
        }
      } else {
        const firstGymnast = gymnasts[0];
        const event = firstGymnast.event;
        if (event === "VT") {
          router.replace(
            `/main-jump?competenceId=${firstGymnast.competenceId}&gymnastId=${
              firstGymnast.id
            }&event=${event}&discipline=${discipline}&gymnast=${
              firstGymnast.id
            }&number=${
              number + 1
            }&participants=${participants}&folderId=${folderId}`
          );
        } else {
          router.replace(
            `/main-floor?competenceId=${firstGymnast.competenceId}&gymnastId=${
              firstGymnast.id
            }&event=${event}&discipline=${discipline}&gymnast=${
              firstGymnast.id
            }&number=${
              number + 1
            }&participants=${participants}&folderId=${folderId}`
          );
        }
      }
    }
  };

  // Add this state variable at the top with other state variables
  const [isTogglingSearch, setIsTogglingSearch] = useState(false);

  // Global click handler to close dropdowns if clicking elsewhere
  const handleGlobalClick = () => {
    // On iOS, we need to be more careful about touch handling
    if (Platform.OS === "ios") {
      // Set a small delay to ensure we don't interfere with other touch events
      setTimeout(() => {
        setSearchDropdownVisible(false);
        setActiveRowDropdown(null);
        // Don't close the dropdown immediately to prevent conflicts with other touch events
        if (!activeDropdownGymnastId) {
          setDropdownVisible(false);
        }
      }, 10);
    } else {
      // For other platforms, we can close immediately
      setSearchDropdownVisible(false);
      setActiveRowDropdown(null);
      setDropdownVisible(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0052b4" />
        <Text style={styles.loadingText}>Loading gymnasts...</Text>
      </SafeAreaView>
    );
  }

  // Replace the toggleSearchDropdown function
  const toggleSearchDropdown = () => {
    // Prevent rapid consecutive toggles
    if (isTogglingSearch) return;

    setIsTogglingSearch(true);

    // Toggle dropdown expanded state
    setIsTypeSearchExpanded(!isTypeSearchExpanded);

    // Close other dropdowns
    setActiveRowDropdown(null);
    setDropdownVisible(false);
    setSearchDropdownVisible(false);

    // Reset the flag after a short delay
    setTimeout(() => {
      setIsTogglingSearch(false);
    }, 300);
  };

  // Add this function to handle type selection
  const handleTypeSelect = (option: string) => {
    setTypeSearch(option);
    setIsTypeSearchExpanded(false);
  };

  const gotogymnastcalculator = (
    competenceId: number,
    gymnastId: number,
    event: string,
    discipline: boolean,
    gymnast: number,
    number: number
  ) => {
    if (event === "VT") {
      router.replace(
        `/main-jump?competenceId=${competenceId}&gymnastId=${gymnastId}&event=${event}&discipline=${discipline}&gymnast=${gymnast}&number=${number}&participants=${participants}&folderId=${folderId}`
      );
    } else {
      router.replace(
        `/main-floor?competenceId=${competenceId}&gymnastId=${gymnastId}&event=${event}&discipline=${discipline}&gymnast=${gymnast}&number=${number}&participants=${participants}&folderId=${folderId}`
      );
    }
  };

  // Función para agregar al historial
const addHistory = (action: 'delete' | 'add', gymnastsData: GymnastEntry[]) => {
  const newHistoryEntry = {
    action,
    gymnasts: JSON.parse(JSON.stringify(gymnastsData)), // Deep copy
    timestamp: Date.now()
  };
  
  // Limitar historial a últimas 5 acciones
  setHistory(prev => [...prev, newHistoryEntry].slice(-5));
};

// Función para manejar deshacer
const handleUndo = async () => {
  if (history.length === 0) {
    Alert.alert("No Action", "No actions to undo");
    return;
  }

  const lastAction = history[history.length - 1];
  
  try {
    if (lastAction.action === 'delete') {
      // Restaurar gimnastas eliminados con todos sus datos
      for (const gymnast of lastAction.gymnasts) {
        // Crear el registro en MainTable con todos los datos originales
        const newGymnastData = {
          competenceId: gymnast.competenceId,
          number: gymnast.number,
          name: gymnast.name || "",
          event: gymnast.event || "",
          noc: gymnast.noc || "",
          bib: gymnast.bib || "",
          j: gymnast.j || 0,
          i: gymnast.i || 0,
          h: gymnast.h || 0,
          g: gymnast.g || 0,
          f: gymnast.f || 0,
          e: gymnast.e || 0,
          d: gymnast.d || 0,
          c: gymnast.c || 0,
          b: gymnast.b || 0,
          a: gymnast.a || 0,
          dv: gymnast.dv || 0,
          eg: gymnast.eg || 0,
          sb: gymnast.sb || 0,
          nd: gymnast.nd || 0,
          cv: gymnast.cv || 0,
          sv: gymnast.sv || 0,
          e2: gymnast.e2 || 0,
          d3: gymnast.d3 || 0,
          e3: gymnast.e3 || 0,
          delt: gymnast.delt || 0,
          percentage: gymnast.percentage || 0,
        };

        const id = await insertMainTable(newGymnastData);
        
        // Restaurar RateGeneral si existía
        if (gymnast.rateGeneralData && id) {
          const rateGeneralData = {
            ...gymnast.rateGeneralData,
            tableId: id, // Usar el nuevo ID
          };
          await insertRateGeneral(rateGeneralData);
        } else if (id) {
          // Si no había datos de RateGeneral, crear uno básico
          const basicRateGeneralData = {
            tableId: id,
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
            vaultNumber: "0",
            vaultDescription: "",
          };
          await insertRateGeneral(basicRateGeneralData);
        }
      }

      // Actualizar competencia
      if (competenceData) {
        const updatedCompetence = {
          ...competenceData,
          numberOfParticipants: (competenceData.numberOfParticipants || 0) + lastAction.gymnasts.length,
        };
        await updateCompetence(competenceId, updatedCompetence);
        setCompetenceData(updatedCompetence);
      }

    } else if (lastAction.action === 'add') {
      // Eliminar últimos gimnastas agregados
      for (const gymnast of lastAction.gymnasts) {
        // Eliminar RateGeneral primero
        try {
          await deleteRateGeneralByTableId(gymnast.id);
        } catch (error) {
          console.warn("No RateGeneral data to delete for gymnast:", gymnast.id);
        }
        // Luego eliminar MainTable
        await deleteMainTable(gymnast.id);
      }

      // Actualizar competencia
      if (competenceData) {
        const updatedCompetence = {
          ...competenceData,
          numberOfParticipants: Math.max(0, (competenceData.numberOfParticipants || 0) - lastAction.gymnasts.length),
        };
        await updateCompetence(competenceId, updatedCompetence);
        setCompetenceData(updatedCompetence);
      }
    }

    // Recargar datos completos
    const tables = await getMainTablesByCompetenceId(competenceId);
    const formattedGymnasts = tables.map((table) => ({
      id: table.id,
      competenceId: table.competenceId,
      number: table.number,
      name: table.name || "",
      event: table.event || "",
      noc: table.noc?.toString() || "",
      bib: table.bib?.toString() || "",
      // Incluir todos los campos de scoring
      j: table.j || 0,
      i: table.i || 0,
      h: table.h || 0,
      g: table.g || 0,
      f: table.f || 0,
      e: table.e || 0,
      d: table.d || 0,
      c: table.c || 0,
      b: table.b || 0,
      a: table.a || 0,
      dv: table.dv || 0,
      eg: table.eg || 0,
      sb: table.sb || 0,
      nd: table.nd || 0,
      cv: table.cv || 0,
      sv: table.sv || 0,
      e2: table.e2 || 0,
      d3: table.d3 || 0,
      e3: table.e3 || 0,
      delt: table.delt || 0,
      percentage: table.percentage || 0,
    }));

    // Reordenar números
    const reorderedGymnasts = formattedGymnasts
      .sort((a, b) => a.number - b.number)
      .map((gymnast, index) => ({ ...gymnast, number: index + 1 }));

    // Actualizar números en base de datos
    for (const gymnast of reorderedGymnasts) {
      const originalGymnast = formattedGymnasts.find(g => g.id === gymnast.id);
      if (originalGymnast && gymnast.number !== originalGymnast.number) {
        await updateMainTable(gymnast.id, { number: gymnast.number });
      }
    }

    setGymnasts(reorderedGymnasts);
    
    // Remover del historial
    setHistory(prev => prev.slice(0, -1));
    
    Alert.alert("Success", `${lastAction.action === 'delete' ? 'Deletion' : 'Addition'} undone successfully`);

  } catch (error) {
    console.error("Error undoing action:", error);
    Alert.alert("Error", "Failed to undo action");
  }
};


const handleImportPress = async () => {
  try {
    console.log("🚀 Iniciando proceso de importación...");
    setIsSaving(true);

    // Paso 1: Selección de archivo
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "*/*",
        "application/vnd.ms-excel", // .xls
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.apple.numbers", // .numbers
        "text/csv", // .csv
        "text/comma-separated-values", // .csv alternative
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log("❌ Selección de archivo cancelada");
      setIsSaving(false);
      return;
    }

    const selectedFile = result.assets[0];
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    
    console.log("📄 Archivo seleccionado:", {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.mimeType,
      extension: fileExtension
    });

    // Paso 2: Validaciones iniciales
    const allowedExtensions = ['xlsx', 'xls', 'csv', 'numbers'];
    if (!allowedExtensions.includes(fileExtension)) {
      Alert.alert(
        "Tipo de Archivo No Soportado",
        `El archivo .${fileExtension} no es compatible. Tipos permitidos: ${allowedExtensions.join(', ')}`
      );
      setIsSaving(false);
      return;
    }

    // Validar tamaño del archivo (max 25MB)
    if (selectedFile.size && selectedFile.size > 25 * 1024 * 1024) {
      Alert.alert(
        "Archivo Muy Grande",
        "El archivo supera los 25MB. Por favor usa un archivo más pequeño."
      );
      setIsSaving(false);
      return;
    }

    // Paso 3: Procesar archivo usando XLSX
    const processedData = await processFileWithXLSX(selectedFile, fileExtension);
    
    if (!processedData || processedData.length === 0) {
      Alert.alert("Sin Datos", "No se encontraron datos válidos en el archivo");
      setIsSaving(false);
      return;
    }

    console.log(`✅ Datos procesados exitosamente: ${processedData.length} filas`);

    // Paso 4: Procesar e insertar datos
    await processAndInsertData(processedData);

  } catch (error: any) {
    console.error("❌ Error en importación:", error);
    
    let errorMessage = "Ocurrió un error inesperado durante la importación.";
    
    if (error.message?.includes("Unsupported file")) {
      errorMessage = "El formato del archivo no es compatible.";
    } else if (error.message?.includes("corrupted")) {
      errorMessage = "El archivo parece estar corrupto.";
    } else if (error.message?.includes("Empty")) {
      errorMessage = "El archivo está vacío o no contiene datos válidos.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    Alert.alert("Error de Importación", errorMessage);
  } finally {
    setIsSaving(false);
  }
};

// Función principal para procesar archivos usando XLSX
const processFileWithXLSX = async (selectedFile: any, fileExtension: string): Promise<any[]> => {
  console.log(`📊 Procesando archivo ${fileExtension.toUpperCase()}...`);
  
  try {
    let workbook: any;
    
    // Estrategia de lectura dependiendo del tipo de archivo
    if (fileExtension === 'csv') {
      workbook = await processCSVWithXLSX(selectedFile);
    } else {
      workbook = await processExcelWithXLSX(selectedFile, fileExtension);
    }

    // Verificar que tenemos un workbook válido
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("No se encontraron hojas en el archivo");
    }

    console.log(`📋 Hojas encontradas: ${workbook.SheetNames.join(', ')}`);

    // Tomar la primera hoja
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    if (!worksheet) {
      throw new Error("La primera hoja está vacía o corrupta");
    }

    // Convertir hoja a JSON con opciones específicas
    const rawData = utils.sheet_to_json(worksheet, {
      header: 1, // Usar índices de columna en lugar de nombres
      defval: "", // Valor por defecto para celdas vacías
      raw: false, // Convertir todo a string
      dateNF: 'YYYY-MM-DD' // Formato de fecha estándar
    });

    console.log(`📏 Filas brutas extraídas: ${rawData.length}`);

    if (!rawData || rawData.length < 2) {
      throw new Error("El archivo debe contener al menos una fila de encabezado y una fila de datos");
    }

    // Procesar y limpiar datos
    const processedData = cleanAndValidateData(rawData);
    
    console.log(`🧹 Datos limpiados: ${processedData.length} filas válidas`);
    
    return processedData;

  } catch (error: any) {
    console.error(`❌ Error procesando ${fileExtension}:`, error);
    throw new Error(`No se pudo procesar el archivo ${fileExtension.toUpperCase()}: ${error.message}`);
  }
};

// Función para procesar archivos CSV con XLSX
const processCSVWithXLSX = async (selectedFile: any): Promise<any> => {
  console.log("📄 Procesando CSV...");
  
  try {
    // Leer como texto UTF-8
    const csvContent = await FileSystem.readAsStringAsync(selectedFile.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (!csvContent || csvContent.trim().length === 0) {
      throw new Error("El archivo CSV está vacío");
    }

    console.log(`📝 Contenido CSV leído: ${csvContent.length} caracteres`);

    // Usar XLSX para parsear CSV
    const workbook = read(csvContent, {
      type: 'string',
      raw: false,
      codepage: 65001 // UTF-8
    });

    return workbook;

  } catch (error: any) {
    console.error("❌ Error procesando CSV:", error);
    
    // Fallback: parsing manual del CSV
    try {
      console.log("🔄 Intentando parsing manual del CSV...");
      
      const csvContent = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        throw new Error("CSV debe tener al menos 2 líneas");
      }
      
      const data = lines.map(line => {
        // Parseo simple de CSV (maneja comillas básicas)
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        
        return result;
      });
      
      // Crear workbook manual
      const worksheet = utils.aoa_to_sheet(data);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      console.log("✅ CSV parseado manualmente");
      return workbook;
      
    } catch (fallbackError: any) {
      throw new Error(`Error procesando CSV: ${fallbackError.message}`);
    }
  }
};

// Función para procesar archivos Excel/Numbers con XLSX
const processExcelWithXLSX = async (selectedFile: any, fileExtension: string): Promise<any> => {
  console.log(`📊 Procesando archivo ${fileExtension.toUpperCase()}...`);
  
  const strategies = [
    'fetch_arraybuffer',
    'filesystem_base64',
    'filesystem_arraybuffer'
  ];

  let lastError: any = null;

  for (const strategy of strategies) {
    try {
      console.log(`🔄 Probando estrategia: ${strategy}`);
      
      let arrayBuffer: ArrayBuffer;
      
      switch (strategy) {
        case 'fetch_arraybuffer':
          const response = await fetch(selectedFile.uri);
          if (!response.ok) throw new Error(`Fetch falló: ${response.status}`);
          arrayBuffer = await response.arrayBuffer();
          break;
          
        case 'filesystem_base64':
          const base64Content = await FileSystem.readAsStringAsync(selectedFile.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (!base64Content) throw new Error("No se pudo leer como base64");
          arrayBuffer = base64ToArrayBuffer(base64Content);
          break;
          
        case 'filesystem_arraybuffer':
          // Intentar leer directamente como binario
          const binaryContent = await FileSystem.readAsStringAsync(selectedFile.uri, {
            encoding: 'base64' as any
          });
          if (!binaryContent) throw new Error("No se pudo leer archivo");
          arrayBuffer = base64ToArrayBuffer(binaryContent);
          break;
          
        default:
          throw new Error(`Estrategia desconocida: ${strategy}`);
      }

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error("ArrayBuffer vacío");
      }

      console.log(`📁 Archivo leído: ${arrayBuffer.byteLength} bytes`);

      // Procesar con XLSX
      const workbook = read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
        raw: false,
        codepage: 65001,
        password: undefined
      });

      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("No se encontraron hojas en el archivo");
      }

      console.log(`✅ Archivo procesado exitosamente con estrategia: ${strategy}`);
      return workbook;

    } catch (error: any) {
      console.log(`❌ Estrategia ${strategy} falló:`, error.message);
      lastError = error;
      continue;
    }
  }

  // Si todas las estrategias fallaron
  const helpMessage = getFileTypeHelp(fileExtension);
  throw new Error(`No se pudo procesar el archivo ${fileExtension.toUpperCase()}. ${helpMessage}Error: ${lastError?.message || 'Desconocido'}`);
};

// Función auxiliar para convertir base64 a ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error: any) {
    throw new Error(`Error convirtiendo base64: ${error.message}`);
  }
};

// Función para limpiar y validar datos extraídos
const cleanAndValidateData = (rawData: any[]): any[] => {
  console.log("🧹 Limpiando y validando datos...");
  
  // Filtrar filas completamente vacías y tomar solo datos (sin header)
  const dataRows = rawData.slice(1).filter((row: any) => {
    if (!Array.isArray(row)) return false;
    return row.some((cell: any) => cell !== null && cell !== undefined && cell !== "");
  });

  console.log(`📊 Filas de datos encontradas: ${dataRows.length}`);

  const processedData = dataRows.map((row: any, index: number) => {
    // Asegurar que tengamos al menos 4 columnas
    const paddedRow = Array.isArray(row) ? [...row] : [row];
    while (paddedRow.length < 4) paddedRow.push("");
    
    const cleanString = (value: any): string => {
      if (value === null || value === undefined) return "";
      return String(value)
        .trim()
        .replace(/[\n\r\t]/g, " ")
        .replace(/\s+/g, " "); // Reemplazar múltiples espacios con uno solo
    };
    
    const cleaned = {
      name: cleanString(paddedRow[0]),
      event: cleanString(paddedRow[1]),
      noc: cleanString(paddedRow[2]),
      bib: cleanString(paddedRow[3]),
      rowIndex: index + 2
    };
    
    // Log de fila procesada para debugging
    if (index < 3) { // Solo las primeras 3 para no saturar el log
      console.log(`📝 Fila ${index + 1}:`, cleaned);
    }
    
    return cleaned;
  }).filter(row => {
    // Filtrar filas que tengan al menos un campo no vacío
    return row.name || row.event || row.noc || row.bib;
  });

  console.log(`✅ Datos procesados: ${processedData.length} filas válidas`);
  
  return processedData;
};

// Función para obtener ayuda específica por tipo de archivo
const getFileTypeHelp = (fileType: string): string => {
  switch (fileType) {
    case 'numbers':
      return "Los archivos Numbers tienen compatibilidad limitada. Para mejores resultados, exporta desde Numbers como Excel (.xlsx) o CSV. ";
    case 'xlsx':
      return "Si el archivo Excel tiene características avanzadas (macros, gráficos, etc.), intenta guardarlo como archivo Excel simple. ";
    case 'xls':
      return "Los archivos Excel antiguos (.xls) pueden tener problemas. Intenta convertirlo a .xlsx. ";
    case 'csv':
      return "Verifica que el archivo CSV use codificación UTF-8 y comas como separadores. ";
    default:
      return "";
  }
};

// Función para procesar e insertar los datos validados
const processAndInsertData = async (data: any[]) => {
  console.log(`💾 Procesando ${data.length} filas para inserción...`);
  
  // Limitar al número de participantes permitido
  const rowsToImport = Math.min(data.length, participants);
  
  if (data.length > participants) {
    Alert.alert(
      "Límite de Importación",
      `El archivo contiene ${data.length} filas válidas, pero solo se permiten ${participants} participantes. Solo se importarán los primeros ${participants}.`
    );
  }

  // Obtener gimnastas existentes
  const existingGymnasts = await getMainTablesByCompetenceId(competenceId);
  const numberToGymnastMap = new Map();
  existingGymnasts.forEach((gymnast) => {
    numberToGymnastMap.set(gymnast.number.toString(), gymnast);
  });

  // Función para validar eventos
  const validateEvent = (eventName: any): string => {
    if (!eventName) return "";
    const upperEvent = eventName.toString().toUpperCase().trim();
    return eventOptions.includes(upperEvent) ? upperEvent : "";
  };

  let updatedCount = 0;
  let createdCount = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  console.log("🔄 Iniciando inserción de datos...");

  // Procesar cada fila con numeración correlativa
  for (let i = 0; i < rowsToImport; i++) {
    try {
      const row = data[i];
      const correlativeNumber = i + 1;
      const existingGymnast = numberToGymnastMap.get(correlativeNumber.toString());
      
      // Limpiar y validar datos de la fila
      const bibNumber = row.bib?.toString().trim() || "";
      const validEvent = validateEvent(row.event);
      const cleanName = row.name?.trim() || "";
      const cleanNoc = row.noc?.trim() || "";

      if (existingGymnast) {
        // Actualizar gimnasta existente
        const updatedGymnast = {
          ...existingGymnast,
          name: cleanName || existingGymnast.name,
          noc: cleanNoc || existingGymnast.noc,
          bib: bibNumber || existingGymnast.bib,
          event: validEvent || existingGymnast.event,
          number: correlativeNumber,
        };
        
        await updateMainTable(existingGymnast.id, updatedGymnast);
        updatedCount++;
        
        console.log(`✏️ Actualizado gimnasta ${correlativeNumber}: ${cleanName}`);
        
      } else {
        // Verificar límite de participantes
        if (gymnasts.length + createdCount >= participants) {
          console.log(`⚠️ Límite de participantes alcanzado: ${participants}`);
          break;
        }
        
        // Crear nuevo gimnasta
        const newGymnast = {
          competenceId: competenceId,
          number: correlativeNumber,
          name: cleanName,
          event: validEvent,
          noc: cleanNoc,
          bib: bibNumber,
          // Campos de scoring inicializados
          j: 0, i: 0, h: 0, g: 0, f: 0, e: 0, d: 0, c: 0, b: 0, a: 0,
          dv: 0, eg: 0, sb: 0, nd: 0, cv: 0, sv: 0, e2: 0, d3: 0, e3: 0, 
          delt: 0, percentage: 0,
        };
        
        const id = await insertMainTable(newGymnast);
        
        if (id && typeof id === 'number') {
          // Crear registro RateGeneral correspondiente
          const mainRateGeneralData = {
            tableId: id,
            stickBonus: false,
            numberOfElements: 0,
            difficultyValues: 0,
            elementGroups1: 0, elementGroups2: 0, elementGroups3: 0,
            elementGroups4: 0, elementGroups5: 0,
            execution: 0, eScore: 0, myScore: 0,
            compD: 0, compE: 0, compSd: 0, compNd: 0, compScore: 0,
            comments: "", paths: "", ded: 0, dedexecution: 0,
            vaultNumber: "0", vaultDescription: "",
          };
          
          await insertRateGeneral(mainRateGeneralData);
          createdCount++;
          
          console.log(`➕ Creado gimnasta ${correlativeNumber}: ${cleanName}`);
          
        } else {
          errors++;
          errorDetails.push(`Fila ${correlativeNumber}: Error al insertar en base de datos`);
        }
      }
      
    } catch (error: any) {
      errors++;
      errorDetails.push(`Fila ${i + 1}: ${error.message || 'Error desconocido'}`);
      console.error(`❌ Error procesando fila ${i + 1}:`, error);
    }
  }

  // Recargar y reordenar todos los gimnastas
  console.log("🔄 Reordenando gimnastas...");
  
  const allUpdatedGymnasts = await getMainTablesByCompetenceId(competenceId);
  const sortedGymnasts = allUpdatedGymnasts.sort((a, b) => a.number - b.number);
  
  // Actualizar numeración correlativa en base de datos
  for (let index = 0; index < sortedGymnasts.length; index++) {
    const gymnast = sortedGymnasts[index];
    const newNumber = index + 1;
    if (gymnast.number !== newNumber) {
      await updateMainTable(gymnast.id, { number: newNumber });
      gymnast.number = newNumber;
    }
  }

  // Actualizar estado local con todos los campos necesarios
  const finalGymnasts = sortedGymnasts.map((table) => ({
    id: table.id,
    competenceId: table.competenceId,
    number: table.number,
    name: table.name || "",
    event: table.event || "",
    noc: table.noc?.toString() || "",
    bib: table.bib?.toString() || "",
    // Incluir todos los campos de scoring
    j: table.j || 0, i: table.i || 0, h: table.h || 0, g: table.g || 0,
    f: table.f || 0, e: table.e || 0, d: table.d || 0, c: table.c || 0,
    b: table.b || 0, a: table.a || 0, dv: table.dv || 0, eg: table.eg || 0,
    sb: table.sb || 0, nd: table.nd || 0, cv: table.cv || 0, sv: table.sv || 0,
    e2: table.e2 || 0, d3: table.d3 || 0, e3: table.e3 || 0, delt: table.delt || 0,
    percentage: table.percentage || 0,
  }));

  setGymnasts(finalGymnasts);

  // Actualizar número de participantes en la competencia
  if (createdCount > 0 && competenceData) {
    const updatedCompetence = {
      ...competenceData,
      numberOfParticipants: (competenceData.numberOfParticipants || 0) + createdCount,
    };
    await updateCompetence(competenceId, updatedCompetence);
    setCompetenceData(updatedCompetence);
  }

  // Mostrar resultado final
  let resultMessage = `Importación exitosa:\n• ${createdCount} gimnastas nuevos\n• ${updatedCount} gimnastas actualizados`;
  
  if (errors > 0) {
    resultMessage += `\n• ${errors} errores encontrados`;
    console.warn("⚠️ Errores durante importación:", errorDetails);
  }

  console.log("✅ Importación completada:", {
    created: createdCount,
    updated: updatedCount,
    errors: errors,
    total: finalGymnasts.length
  });

  Alert.alert("Importación Completa", resultMessage);
};
  
  return (
    <View style={styles.container} onTouchStart={handleGlobalClick}>
      {/* Top Control Bar - Single Row with All Controls */}
      <Animated.View
        style={[
          styles.topControlsContainer,
          {
            opacity: searchBarOpacity,
            transform: [{ translateY: searchBarTranslateY }],
          },
        ]}
      >
        {/* Left Section - Inputs */}
        <View style={styles.inputsSection}>
          <View style={styles.compactInputContainer}>
            <TextInput
              style={styles.compactInput}
              placeholder="Name"
              placeholderTextColor="#999"
              value={nameSearch}
              onChangeText={setNameSearch}
            />
          </View>

          {/* Event Dropdown */}
          <View style={styles.compactInputContainer}>
            <View
              style={{
                position: "relative",
                zIndex: Platform.OS === "ios" ? 999 : 10,
              }}
            >
              <TouchableOpacity
                style={styles.compactDropdownButton}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleSearchDropdown();
                }}
              >
                <Text style={styles.compactDropdownText}>
                  {typeSearch || "Event"}
                </Text>
                <Ionicons
                  name={isTypeSearchExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#666"
                />
              </TouchableOpacity>

              {/* Dropdown options */}
              {isTypeSearchExpanded && (
                <View
                  style={{
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: "#ddd",
                    borderRadius: 5,
                    marginTop: 2,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                    width: "100%",
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    zIndex: 1000,
                  }}
                >
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    activeOpacity={0.7}
                    onPress={() => handleTypeSelect("")}
                  >
                    <Text style={styles.dropdownItemText}>None</Text>
                  </TouchableOpacity>

                  {eventOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dropdownItem,
                        index === eventOptions.length - 1
                          ? { borderBottomWidth: 0 }
                          : null,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleTypeSelect(option)}
                    >
                      <Text style={styles.dropdownItemText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.compactInputContainer}>
            <TextInput
              style={styles.compactInput}
              placeholder="BIB"
              placeholderTextColor="#999"
              value={bibSearch}
              onChangeText={setBibSearch}
            />
          </View>
        </View>

        {/* Center Section - Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.compactActionButton} onPress={handleSearch}>
            <Ionicons name="search" size={isTinyDevice ? 16 : 20} color="#0052b4" />
            <Text style={styles.compactActionText}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.compactActionButton} onPress={handleUndo}>
            <Ionicons 
              name="arrow-undo-outline" 
              size={isTinyDevice ? 16 : 20} 
              color="#0052b4" 
            />
            <Text style={styles.compactActionText}>Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.compactActionButton} onPress={handleImportPress}>
            <Ionicons 
              name="cloud-upload-outline" 
              size={isTinyDevice ? 16 : 20} 
              color="#0052b4" 
            />
            <Text style={styles.compactActionText}>Import</Text>
          </TouchableOpacity>
        </View>

        {/* Right Section - Navigation Buttons */}
        <View style={styles.navigationSection}>
          <TouchableOpacity
            style={styles.compactNavButton}
            onPress={() =>
              router.replace(`/folder?id=${folderId}&discipline=${discipline}`)
            }
          >
            <Ionicons 
              name="arrow-back" 
              size={isTinyDevice ? 16 : 20} 
              color="#fff" 
            />
            <Text style={styles.compactNavText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.compactStartButton,
              {
                backgroundColor: number === 1 ? "#0052b4" : "rgb(28, 82, 147)",
                opacity: gymnasts.length > 0 ? 1 : 0.5,
              },
            ]}
            onPress={() => handleSelectStart()}
            disabled={gymnasts.length === 0 || isSaving}
          >
            <Ionicons 
              name="play" 
              size={isTinyDevice ? 16 : 20} 
              color="#fff" 
            />
            <Text style={styles.compactNavText}>
              {number === 0 ? "Start" : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Table with Animation */}
      <Animated.View
        style={[
          styles.tableContainer,
          {
            opacity: tableOpacity,
            transform: [{ scale: tableScale }],
          },
        ]}
      >
        {/* Table Header */}
        <View style={styles.headerRow}>
          {isDeleteMode && (
            <View style={styles.checkboxCell}>
              <Text style={styles.headerText}>Select</Text>
            </View>
          )}
          <View style={styles.noCell}>
            <Text style={styles.headerText}>No.</Text>
          </View>
          <View style={styles.gymnastCell}>
            <Text style={styles.headerText}>GYMNAST</Text>
          </View>
          <View style={styles.eventCell}>
            <Text style={styles.headerText}>EVENT</Text>
          </View>
          <View style={styles.standardCell}>
            <Text style={styles.headerText}>NOC</Text>
          </View>
          <View style={styles.standardCell}>
            <Text style={styles.headerText}>BIB</Text>
          </View>
        </View>

        {/* Table Body */}
        <ScrollView style={styles.tableBody} ref={scrollViewRef}>
          {/* Display message if no gymnasts */}
          {gymnasts.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No gymnasts found</Text>
              <Text style={styles.emptyStateSubtext}> </Text>
            </View>
          ) : (
            /* Rows with animation and selection */
            gymnasts.map((gymnast, index) => (
              <Animated.View
                key={gymnast.id}
                style={[
                  styles.row,
                  {
                    opacity: rowAnimations[index]?.opacity || 1,
                    transform: [
                      { translateX: rowAnimations[index]?.translateX || 0 },
                    ],
                  },
                  invalidGymnastIds.includes(gymnast.id) && {
                    borderColor: "red",
                    borderWidth: 2,
                  },
                  selectedGymnasts.includes(gymnast.id) &&
                    isDeleteMode && {
                      backgroundColor: "#ffebee",
                    },
                ]}
              >
                {/* Checkbox for selection in delete mode */}
                {isDeleteMode && (
                  <TouchableOpacity
                    style={styles.checkboxCell}
                    onPress={() => toggleGymnastSelection(gymnast.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        selectedGymnasts.includes(gymnast.id) &&
                          styles.checkboxSelected,
                      ]}
                    >
                      {selectedGymnasts.includes(gymnast.id) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.noCell}
                  onPress={() => {
                    if (!isDeleteMode) {
                      gotogymnastcalculator(
                        competenceId,
                        gymnast.id,
                        gymnast.event,
                        discipline,
                        gymnast.id,
                        gymnast.number
                      );
                    }
                  }}
                  disabled={isDeleteMode}
                >
                  <Text
                    style={[styles.cellText, isDeleteMode && { color: "#999" }]}
                  >
                    {gymnast.number}
                  </Text>
                </TouchableOpacity>

                <View style={styles.gymnastCell}>
                  {editingField.gymnastId === gymnast.id &&
                  editingField.field === "name" &&
                  !isDeleteMode ? (
                    <TextInput
                      style={styles.editInput}
                      placeholder="Enter name"
                      value={gymnast.name}
                      onChangeText={(text) =>
                        handleGymnastChange(gymnast.id, "name", text)
                      }
                      onBlur={() => saveField(gymnast.id)}
                      autoFocus
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        if (!isDeleteMode) {
                          startEditing(gymnast.id, "name");
                        }
                      }}
                      disabled={isDeleteMode}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isDeleteMode && { color: "#999" },
                        ]}
                      >
                        {gymnast.name || "Click to edit"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Event Cell with Dropdown */}
                <View style={styles.eventCell}>
                  {Platform.OS === "android" ? (
                    <Picker
                      selectedValue={gymnast.event}
                      style={{ height: 60, width: "100%" }}
                      onValueChange={(itemValue) => {
                        if (!isDeleteMode) {
                          handleGymnastChange(gymnast.id, "event", itemValue);
                        }
                      }}
                      mode="dropdown"
                      enabled={!isDeleteMode}
                    >
                      <Picker.Item label="Select" value="" />
                      {eventOptions.map((option) => (
                        <Picker.Item
                          key={option}
                          label={option}
                          value={option}
                        />
                      ))}
                    </Picker>
                  ) : (
                    <TouchableOpacity
                      ref={(el) => {
                        if (el) {
                          rowRefs.current[gymnast.id] = el;
                        }
                      }}
                      style={styles.eventDropdownButton}
                      onPress={() => {
                        if (!isDeleteMode) {
                          if (Platform.OS === "ios") {
                            setDropdownVisible(false);
                            setTimeout(() => {
                              startEditing(gymnast.id, "event");
                            }, 50);
                          } else {
                            startEditing(gymnast.id, "event");
                          }
                        }
                      }}
                      disabled={isDeleteMode}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isDeleteMode && { color: "#999" },
                        ]}
                      >
                        {gymnast.event || "Select"}
                      </Text>
                      {!isDeleteMode && (
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color="#666"
                          style={{ marginLeft: 5 }}
                        />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.standardCell}>
                  {editingField.gymnastId === gymnast.id &&
                  editingField.field === "noc" &&
                  !isDeleteMode ? (
                    <TextInput
                      style={styles.editInput}
                      placeholder="Enter NOC"
                      value={gymnast.noc}
                      onChangeText={(text) =>
                        handleGymnastChange(gymnast.id, "noc", text)
                      }
                      onBlur={() => saveField(gymnast.id)}
                      autoFocus
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        if (!isDeleteMode) {
                          startEditing(gymnast.id, "noc");
                        }
                      }}
                      disabled={isDeleteMode}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isDeleteMode && { color: "#999" },
                        ]}
                      >
                        {gymnast.noc || "Click to edit"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.standardCell}>
                  {editingField.gymnastId === gymnast.id &&
                  editingField.field === "bib" &&
                  !isDeleteMode ? (
                    <TextInput
                      style={styles.editInput}
                      placeholder="Enter BIB"
                      value={gymnast.bib ? gymnast.bib.toString() : ""}
                      onChangeText={(text) =>
                        handleGymnastChange(gymnast.id, "bib", text)
                      }
                      onBlur={() => saveField(gymnast.id)}
                      keyboardType="default"
                      autoFocus
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        if (!isDeleteMode) {
                          startEditing(gymnast.id, "bib");
                        }
                      }}
                      disabled={isDeleteMode}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isDeleteMode && { color: "#999" },
                        ]}
                      >
                        {gymnast.bib || "Click to edit"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            ))
          )}

          {/* Add Gymnast Row - hide in delete mode */}
          {gymnasts.length < participants && !isearching && !isDeleteMode && (
            <TouchableOpacity style={styles.addRow} onPress={handleAddGymnast}>
              <Text style={styles.addText}>+</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      {/* Button Container with Animation */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonContainerOpacity,
            transform: [{ translateY: buttonContainerTranslateY }],
          },
        ]}
      >
        {!isDeleteMode ? (
          <>
            <TouchableOpacity
              style={[
                styles.startButton,
                {
                  backgroundColor:
                    number === 1 ? "#0052b4" : "rgb(28, 82, 147)",
                  opacity: gymnasts.length > 0 ? 1 : 0.5,
                },
              ]}
              onPress={() => handleSelectStart()}
              disabled={gymnasts.length === 0 || isSaving}
            >
              <Text style={styles.buttonText}>
                {number == 0 ? "START JUDGING" : "CONTINUE JUDGING"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editButton}
              onPress={toggleDeleteMode}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <Text style={styles.editButtonText}>DELETE MODE</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.cancelDeleteButton}
              onPress={toggleDeleteMode}
            >
              <Text style={styles.cancelDeleteButtonText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmDeleteButton,
                {
                  opacity: selectedGymnasts.length > 0 ? 1 : 0.5,
                },
              ]}
              onPress={showDeleteConfirmation}
              disabled={selectedGymnasts.length === 0}
            >
              <Text style={styles.confirmDeleteButtonText}>
                DELETE ({selectedGymnasts.length})
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Event Dropdown (shown conditionally) */}
      {dropdownVisible && (
        <View
          style={[
            styles.dropdownContainer,
            styles.eventDropdownList,
            {
              top: rowDropdownPosition.top,
              left: rowDropdownPosition.left,
              width: rowDropdownPosition.width,
              zIndex: Platform.OS === "ios" ? 9999 : 1000,
            },
          ]}
        >
          {/* Add empty option at the beginning */}
          <TouchableOpacity
            style={styles.dropdownItem}
            activeOpacity={0.7}
            onPress={() => {
              const currentGymnastId = activeDropdownGymnastId;
              if (currentGymnastId !== null) {
                // Handle selecting empty option
                if (Platform.OS === "ios") {
                  setTimeout(() => {
                    handleEventSelect("");
                  }, 50);
                } else {
                  handleEventSelect("");
                }
              }
            }}
          >
            <Text style={styles.dropdownItemText}>None</Text>
          </TouchableOpacity>

          {/* Existing options */}
          {eventOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={() => {
                const currentGymnastId = activeDropdownGymnastId;

                if (currentGymnastId !== null) {
                  if (Platform.OS === "ios") {
                    setTimeout(() => {
                      handleEventSelect(option);
                    }, 50);
                  } else {
                    handleEventSelect(option);
                  }
                }
              }}
            >
              <Text style={styles.dropdownItemText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmationModal}
        onRequestClose={() => setConfirmationModal(false)}
      >
        <View style={styles.addModalOverlay}>
          <View
            style={[
              isLargeDevice ? styles.confirmationModal : null,
              isSmallDevice ? styles.confirmationmodalSmall : null,
              isTinyDevice ? styles.confirmationmodalTiny : null,
            ]}
          >
            <Text
              style={
                isLargeScreen
                  ? styles.addFolderTitle
                  : styles.addFolderTitleSmall
              }
            >
              Delete {selectedGymnasts.length} gymnast
              {selectedGymnasts.length > 1 ? "s" : ""}?
            </Text>
            nnn
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={
                  isLargeScreen
                    ? styles.confirmButton
                    : styles.confirmButtonSmall
                }
                onPress={performDelete}
              >
                <Text
                  style={
                    isLargeScreen
                      ? styles.confirmButtonText
                      : styles.confirmButtonTextSmall
                  }
                >
                  Confirm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  isLargeScreen ? styles.cancelButton : styles.cancelButtonSmall
                }
                onPress={() => setConfirmationModal(false)}
              >
                <Text
                  style={
                    isLargeScreen
                      ? styles.cancelButtonText
                      : styles.cancelButtonTextSmall
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  competenceTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
    color: "#0052b4",
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "center",
    marginTop: 10,
    marginLeft: 20,
    width: "60%",
    zIndex: 10,
  },
  searchInputContainer: {
    flex: 1,
    marginRight: 8,
    position: "relative",
  },
  searchInput: {
    backgroundColor: "#e8e8e8",
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: "#e8e8e8",
    width: 44,
    height: 44,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  // Dropdown styles
  dropdownContainer: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // Sets a high zIndex for all platforms
    zIndex: 1000,
  },
  // Additional styles specifically for event dropdown
  eventDropdownList: {
    // For iOS, we need to ensure it's above everything
    ...(Platform.OS === "ios"
      ? {
          position: "absolute",
          zIndex: 9999,
        }
      : {}),
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  inlineDropdown: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: "100%",
    position: "absolute",
    top: "100%",
    left: 0,
    zIndex: 1000,
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownButton: {
    backgroundColor: "#e8e8e8",
    borderRadius: 5,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownButtonText: {
    fontSize: 14,
    color: "#999",
  },
  // Event dropdown button in table
  eventDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 4,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 20,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#0052b4",
    paddingVertical: 12,
  },
  headerText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    alignItems: "center",
  },
  cellText: {
    textAlign: "center",
    fontSize: 20,
    color: "#666",
  },
  editInput: {
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 6,
    textAlign: "center",
    width: "100%",
    backgroundColor: "#f9f9f9",
  },
  noCell: {
    width: 60,
    height: 40,

    justifyContent: "center",
    paddingHorizontal: 5,
  },
  gymnastCell: {
    flex: 2,
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  eventCell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 5,
    position: "relative",
  },
  standardCell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  deleteButton: {
    width: 40,
    alignItems: "center",
  },
  addRow: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    fontSize: 24,
    color: "#999",
  },
  tableBody: {
    maxHeight: "100%",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 20,
    color: "#999",
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#999",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    zIndex: 1,
  },
  startButton: {
    flex: 3,
    backgroundColor: "#0052b4",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#f2c94c",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  editButtonText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 14,
  },

  // Modal styles
  addModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Confirmation modal - large screen
  confirmationModal: {
    backgroundColor: "#fff",
    width: "50%",
    height: 190,
    maxHeight: "80%",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmationmodalSmall: {
    backgroundColor: "#fff",
    width: "70%",
    height: 150,
    borderRadius: 10,
    padding: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmationmodalTiny: {
    backgroundColor: "#fff",
    width: "70%",
    height: 150,
    maxHeight: "80%",
    borderRadius: 10,
    padding: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addFolderTitle: {
    marginBottom: 25,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  addFolderTitleSmall: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  // Confirm button - large screen
  confirmButton: {
    backgroundColor: "#0047AB",
    borderRadius: 10,
    padding: 12,
    width: "40%",
    shadowColor: "#000",
    alignSelf: "center",
    shadowOffset: { width: 0, height: 2.5 },
    shadowOpacity: 0.55,
    shadowRadius: 3.84,
    elevation: 5,
    marginRight: 50,
    alignItems: "center",
  },
  // Confirm button - small screen
  confirmButtonSmall: {
    backgroundColor: "#0047AB",
    borderRadius: 8,
    padding: 10,
    width: "40%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 3,
    elevation: 5,
    marginRight: 30,
    alignItems: "center",
  },
  // Confirm button text - large screen
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 26,
  },
  // Confirm button text - small screen
  confirmButtonTextSmall: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  // Cancel button - large screen
  cancelButton: {
    backgroundColor: "#DC3545",
    borderRadius: 10,
    padding: 12,
    marginLeft: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2.5 },
    shadowOpacity: 0.55,
    shadowRadius: 3.84,
    elevation: 5,
    width: "40%",
    alignItems: "center",
  },
  // Cancel button - small screen
  cancelButtonSmall: {
    backgroundColor: "#DC3545",
    borderRadius: 8,
    padding: 10,
    marginLeft: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 3,
    elevation: 5,
    width: "40%",
    alignItems: "center",
  },
  // Cancel button text - large screen
  cancelButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 26,
  },
  // Cancel button text - small screen
  cancelButtonTextSmall: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  backButton: {
    position: "absolute",
    top: isLargeDevice ? 35 : isTinyDevice ? 20 : 28, // Más margen superior
    right: isLargeDevice ? 60 : isTinyDevice ? 30 : 45, // Más margen derecho para alineación
    zIndex: 1000,
  },
  backButtonInner: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: isLargeDevice ? 10 : isTinyDevice ? 8 : 9, // Even less height
    paddingHorizontal: isLargeDevice ? 20 : isTinyDevice ? 12 : 16, // Más ancho
    borderRadius: isLargeDevice ? 8 : 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    minWidth: isLargeDevice ? 120 : isTinyDevice ? 85 : 100, // Más ancho mínimo
  },
  backButtonText: {
    color: "#0052b4",
    fontWeight: "bold",
    marginLeft: isLargeDevice ? 5 : 3,
    fontSize: isLargeDevice ? 16 : isTinyDevice ? 11 : 13,
  },
  importButton: {
    position: "absolute",
    top: isLargeDevice ? 35 : isTinyDevice ? 20 : 28, // Más margen superior
    right: isLargeDevice ? 320 : isTinyDevice ? 230 : 275, // More spacing from back button
    zIndex: 1000,
  },

  importButtonSecond: {
    position: "absolute",
    top: isLargeDevice ? 35 : isTinyDevice ? 20 : 28, // Más margen superior
    right: isLargeDevice ? 580 : isTinyDevice ? 430 : 505, // More spacing from import button
    zIndex: 1000,
  },
  importButtonInner: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: isLargeDevice ? 10 : isTinyDevice ? 8 : 9, // Even less height
    paddingHorizontal: isLargeDevice ? 20 : isTinyDevice ? 12 : 16, // Más ancho
    borderRadius: isLargeDevice ? 8 : 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    minWidth: isLargeDevice ? 120 : isTinyDevice ? 80 : 95, // Más ancho mínimo
  },
  importButtonText: {
    color: "#0052b4",
    fontWeight: "bold",
    marginLeft: isLargeDevice ? 5 : 3,
    fontSize: isLargeDevice ? 16 : isTinyDevice ? 11 : 13,
  },

  // New styles for checkbox functionality
  checkboxCell: {
    width: 50,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  checkboxSelected: {
    backgroundColor: "#0052b4",
    borderColor: "#0052b4",
  },

  // New styles for delete mode buttons
  cancelDeleteButton: {
    flex: 1,
    backgroundColor: "#6c757d",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cancelDeleteButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  confirmDeleteButton: {
    flex: 2,
    backgroundColor: "#dc3545",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },

  // Add confirmation subtitle style
  confirmationSubtitle: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  // New compact top controls layout
  topControlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },

  inputsSection: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  actionsSection: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  navigationSection: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },

  compactInputContainer: {
    flex: 1,
    position: "relative",
  },

  compactInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: isTinyDevice ? 8 : 10,
    fontSize: isTinyDevice ? 12 : 14,
    color: "#333",
  },

  compactDropdownButton: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: isTinyDevice ? 8 : 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  compactDropdownText: {
    fontSize: isTinyDevice ? 12 : 14,
    color: "#333",
    flex: 1,
  },

  compactActionButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: isTinyDevice ? 8 : 12,
    paddingVertical: isTinyDevice ? 6 : 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },

  compactActionText: {
    fontSize: isTinyDevice ? 10 : 12,
    color: "#0052b4",
    fontWeight: "500",
  },

  compactNavButton: {
    backgroundColor: "#6c757d",
    borderRadius: 8,
    paddingHorizontal: isTinyDevice ? 8 : 12,
    paddingVertical: isTinyDevice ? 6 : 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  compactStartButton: {
    backgroundColor: "#0052b4",
    borderRadius: 8,
    paddingHorizontal: isTinyDevice ? 8 : 12,
    paddingVertical: isTinyDevice ? 6 : 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  compactNavText: {
    fontSize: isTinyDevice ? 10 : 12,
    color: "#fff",
    fontWeight: "500",
  },
});

export default GymnasticsTable;
