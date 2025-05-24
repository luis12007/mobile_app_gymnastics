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
  getCompetenceById,
  getMainTablesByCompetenceId,
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
interface GymnastEntry {
  id: number;
  competenceId: number;
  number: number;
  name: string;
  event: string;
  noc: string;
  bib: number;
  // Include other fields from MainTable if needed
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

  const [isDeleteMode, setIsDeleteMode] = useState(false);
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
  const [gymnastToDelete, setGymnastToDelete] = useState<number | null>(null);
  const [isTypeSearchExpanded, setIsTypeSearchExpanded] = useState(false);
  const [isearching, setIsSearching] = useState(false);
  const [invalidGymnastIds, setInvalidGymnastIds] = useState<number[]>([]);

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
            bib: table.bib || 0,
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
            noc: table.noc || 0,
            bib: table.bib || 0,
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
            setRowDropdownPosition({
              top: pageY + height,
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
    // Close any open dropdowns
    setSearchDropdownVisible(false);
    setActiveRowDropdown(null);
    setDropdownVisible(false);
  };

  // Perform the actual deletion
  const performDelete = async () => {
    if (gymnastToDelete === null) {
      setConfirmationModal(false);
      return;
    }

    try {
      // Delete from database
      const success = await deleteMainTable(gymnastToDelete);

      if (success) {
        // Get the gymnast that will be deleted
        const gymnastToRemove = gymnasts.find((g) => g.id === gymnastToDelete);

        // Remove from local state
        setGymnasts(
          gymnasts.filter((gymnast) => gymnast.id !== gymnastToDelete)
        );

        // Update competition number of participants
        if (competenceData && competenceData.numberOfParticipants > 0) {
          const updatedCompetence = {
            ...competenceData,
            numberOfParticipants: competenceData.numberOfParticipants - 1,
          };

          await updateCompetence(competenceId, updatedCompetence);
          setCompetenceData(updatedCompetence);
        }
      } else {
        console.error("Failed to delete gymnast");
      }
    } catch (error) {
      console.error("Error deleting gymnast:", error);
    } finally {
      // Close modal and reset selected gymnast
      setConfirmationModal(false);
      setGymnastToDelete(null);
    }
  };

  // Show confirmation modal for deletion
  const showDeleteConfirmation = (gymnastId: number) => {
    setGymnastToDelete(gymnastId);
    setConfirmationModal(true);
  };

  const handleAddGymnast = async () => {
    try {
      // Find the next available number
      const usedNumbers = gymnasts.map((g) => g.number);
      let newNumber = 1;
      while (usedNumbers.includes(newNumber)) {
        newNumber++;
      }

      // Create a new gymnast entry with default values
      const newGymnast = {
        competenceId: competenceId,
        number: newNumber,
        name: "",
        event: "", // Set the first event as default
        noc: "",
        bib: 0,
        // Add default values for other fields as needed
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

      // Insert into database
      const id = await insertMainTable(newGymnast);

      // Create the corresponding MainRateGeneral entry
      const mainRateGeneralData = {
        tableId: id, // Use the ID of the inserted MainTable
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
      };

      const rateGeneralResult = await insertRateGeneral(mainRateGeneralData);
      if (!rateGeneralResult) {
        console.error(
          `Failed to create MainRateGeneral entry for MainTable ID: ${id}`
        );
      }

      if (id) {
        // Add to local state
        setGymnasts([...gymnasts, { ...newGymnast, id: id as number }]);

        // Update competition number of participants
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

  const handleSelectStart = () => {
    // Validate gymnasts for empty fields
    const invalids = gymnasts
      .filter((g) => !g.name || !g.event || !g.noc || !g.bib)
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
        const event = firstGymnast.event;
        if (event === "VT") {
          router.push(
            `/main-jump?competenceId=${firstGymnast.competenceId}&gymnastId=${firstGymnast.id}&event=${event}&discipline=${discipline}&gymnast=${firstGymnast.id}&number=${number}&participants=${participants}&folderId=${folderId}`
          );
        } else {
          router.push(
            `/main-floor?competenceId=${firstGymnast.competenceId}&gymnastId=${firstGymnast.id}&event=${event}&discipline=${discipline}&gymnast=${firstGymnast.id}&number=${number}&participants=${participants}&folderId=${folderId}`
          );
        }
      } else {
        const firstGymnast = gymnasts[0];
        const event = firstGymnast.event;
        if (event === "VT") {
          router.push(
            `/main-jump?competenceId=${firstGymnast.competenceId}&gymnastId=${firstGymnast.id}&event=${event}&discipline=${discipline}&gymnast=${firstGymnast.id}&number=${number}&participants=${participants}&folderId=${folderId}`
          );
        } else {
          router.push(
            `/main-floor?competenceId=${firstGymnast.competenceId}&gymnastId=${firstGymnast.id}&event=${event}&discipline=${discipline}&gymnast=${firstGymnast.id}&number=${number}&participants=${participants}&folderId=${folderId}`
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

  // Add these state variables at the top with other state variables

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
  const handleTypeSelect = (option) => {
    setTypeSearch(option);
    setIsTypeSearchExpanded(false);
  };

  const gotogymnastcalculator = (
    competenceId,
    gymnastId,
    event,
    discipline,
    gymnast,
    number
  ) => {
    if (event === "VT") {
      router.push(
        `/main-jump?competenceId=${competenceId}&gymnastId=${gymnastId}&event=${event}&discipline=${discipline}&gymnast=${gymnast}&number=${number}&participants=${participants}&folderId=${folderId}`
      );
    } else {
      router.push(
        `/main-floor?competenceId=${competenceId}&gymnastId=${gymnastId}&event=${event}&discipline=${discipline}&gymnast=${gymnast}&number=${number}&participants=${participants}&folderId=${folderId}`
      );
    }
  };

const handleImportPress = async () => {
  try {
    let data = [];
    let rowsToImport = 0;

    // Verificar si estamos en entorno web o móvil
    if (Platform.OS === 'web') {
      // Implementación específica para web
      try {
        // Crear un input de tipo file oculto
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.xlsx,.xls,.csv,.numbers';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Esperar a que el usuario seleccione un archivo
        const filePromise = new Promise((resolve) => {
          fileInput.onchange = (event) => {
            const files = event.target.files;
            if (files && files.length > 0) {
              resolve(files[0]);
            }
          };
          fileInput.click();
        });
        
        // Mostrar indicador de carga
        setIsSaving(true);
        
        // Procesar el archivo seleccionado
        const file = await filePromise;
        if (!file) {
          setIsSaving(false);
          document.body.removeChild(fileInput);
          return;
        }
        
        // Leer el archivo con FileReader
        const reader = new FileReader();
        const dataPromise = new Promise((resolve, reject) => {
          reader.onload = (e) => {
            try {
              const arrayBuffer = e.target.result;
              const workbook = read(arrayBuffer, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              
              // Obtener datos como matriz (incluye encabezados)
              const rawData = utils.sheet_to_json(worksheet, { header: 1 });
              resolve(rawData);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('Error reading file'));
          reader.readAsArrayBuffer(file);
        });
        
        const rawData = await dataPromise;
        document.body.removeChild(fileInput);
        
        // Validar que tenemos suficientes filas
        if (rawData.length < 2) {
          Alert.alert(
            "Error",
            "The file must contain at least two rows (header row + data)"
          );
          setIsSaving(false);
          return;
        }
        
        // Ignoramos la primera fila (encabezados) y tomamos las 3 primeras columnas de cada fila
        data = rawData.slice(1).map((row) => {
          const formattedRow = Array.isArray(row) ? row : [row];
          while (formattedRow.length < 3) formattedRow.push("");
          
          return {
            name: formattedRow[0]?.toString() || "",
            noc: formattedRow[1]?.toString() || "",
            bib: formattedRow[2]?.toString() || "",
          };
        });
        
        // Validar que hay datos para importar
        if (data.length === 0) {
          Alert.alert("Error", "No data found in the spreadsheet");
          setIsSaving(false);
          return;
        }
        
        // Limitar al número de participantes
        rowsToImport = Math.min(data.length, participants);
        if (data.length > participants) {
          Alert.alert(
            "Warning",
            `The file contains ${data.length} rows, but only ${participants} participants are allowed. Only the first ${participants} will be imported.`
          );
        }
      } catch (error) {
        console.error("Error processing file (web):", error);
        Alert.alert(
          "Import Error",
          "Failed to process the Excel file. Please make sure it's in the correct format."
        );
        setIsSaving(false);
        return;
      }
    } else {
      // Implementación específica para móviles (código existente)
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "*/*",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.apple-numbers",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      // Mostrar indicador de carga
      setIsSaving(true);

      try {
        // Leer el archivo
        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Parsear el archivo Excel
        const workbook = read(fileContent, { type: "base64" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Obtener datos como matriz (incluye encabezados)
        const rawData = utils.sheet_to_json(worksheet, { header: 1 });
        
        // Validar que tenemos suficientes filas
        if (rawData.length < 2) {
          Alert.alert(
            "Error",
            "The file must contain at least two rows (header row + data)"
          );
          setIsSaving(false);
          return;
        }

        // Ignoramos la primera fila (encabezados) y tomamos las 3 primeras columnas de cada fila
        data = rawData.slice(1).map((row) => {
          // Asegurar que tenemos 3 columnas por fila
          const formattedRow = Array.isArray(row) ? row : [row];
          while (formattedRow.length < 3) formattedRow.push("");

          return {
            name: formattedRow[0]?.toString() || "",
            noc: formattedRow[1]?.toString() || "",
            bib: formattedRow[2]?.toString() || "",
          };
        });

        // Validar que hay datos para importar
        if (data.length === 0) {
          Alert.alert("Error", "No data found in the spreadsheet");
          setIsSaving(false);
          return;
        }

        // Limitar al número de participantes
        rowsToImport = Math.min(data.length, participants);
        if (data.length > participants) {
          Alert.alert(
            "Warning",
            `The file contains ${data.length} rows, but only ${participants} participants are allowed. Only the first ${participants} will be imported.`
          );
        }
      } catch (error) {
        console.error("Error processing file (mobile):", error);
        Alert.alert(
          "Import Error",
          "Failed to process the Excel file. Please make sure it's in the correct format."
        );
        setIsSaving(false);
        return;
      }
    }

    // A partir de aquí, el código es común para web y móvil
    // Ya tenemos los datos en la variable 'data' y rowsToImport
    console.log("Rows to import:", rowsToImport);
    
    try {
      // Obtener todos los gimnastas actuales para esta competencia
      const existingGymnasts = await getMainTablesByCompetenceId(
        competenceId
      );
      console.log("Existing gymnasts:", existingGymnasts);
      
      // Mapear NÚMERO a gimnasta en lugar de BIB
      const numberToGymnastMap = new Map();
      existingGymnasts.forEach((gymnast) => {
        // Usamos el número del gimnasta como clave en lugar del BIB
        numberToGymnastMap.set(gymnast.number.toString(), gymnast);
      });
      console.log("Number to gymnast map:", numberToGymnastMap);

      // Preparar datos para importar
      let updatedCount = 0;
      let createdCount = 0;
      let errors = 0;

      // Array para registrar los números usados durante esta importación
      const currentUsedNumbers = gymnasts.map((g) => g.number);

      // Procesar cada fila (gimnasta)
      for (let i = 0; i < rowsToImport; i++) {
        try {
          const row = data[i];
          const bibNumber = parseInt(row.bib) || 0;
          
          // Usamos i+1 como número de gimnasta para la importación
          // Esto significa que la primera fila (índice 0) corresponde al gimnasta número 1
          const gymnastNumber = i + 1;
          
          // Verificar si el gimnasta ya existe por su NÚMERO
          const existingGymnast = numberToGymnastMap.get(gymnastNumber.toString());

          if (existingGymnast) {
            // Actualizar gimnasta existente con los datos del archivo
            const updatedGymnast = {
              ...existingGymnast,
              name: row.name || existingGymnast.name,
              noc: row.noc || existingGymnast.noc,
              bib: bibNumber || existingGymnast.bib,
            };
            
            // Guardar en la base de datos
            await updateMainTable(existingGymnast.id, updatedGymnast);
            
            // Actualizar en el estado local
            setGymnasts(prev => 
              prev.map(g => g.id === existingGymnast.id ? 
                { ...g, name: updatedGymnast.name, noc: updatedGymnast.noc, bib: updatedGymnast.bib } : g
              )
            );
            
            updatedCount++;
          } else {
            // Verificar si aún hay espacio para nuevos gimnastas
            if (gymnasts.length + createdCount >= participants) {
              Alert.alert(
                "Import Limit Reached",
                `Cannot add more gymnasts. Maximum of ${participants} participants reached.`
              );
              break;
            }

            // Encontrar un número disponible para el nuevo gimnasta
            let newNumber = gymnastNumber;
            while (currentUsedNumbers.includes(newNumber)) {
              newNumber++;
            }
            
            // Añadir el nuevo número a nuestro registro local
            currentUsedNumbers.push(newNumber);

            // Crear nuevo gimnasta
            const newGymnast = {
              competenceId: competenceId,
              number: newNumber,
              name: row.name || "",
              event: "", // Event vacío por defecto
              noc: row.noc || "",
              bib: bibNumber,
              // Valores por defecto para otros campos
              j: 0, i: 0, h: 0, g: 0, f: 0, e: 0, d: 0, c: 0, b: 0, a: 0,
              dv: 0, eg: 0, sb: 0, nd: 0, cv: 0, sv: 0,
              e2: 0, d3: 0, e3: 0, delt: 0, percentage: 0,
            };

            // Insertar en base de datos
            const id = await insertMainTable(newGymnast);

            // Crear la entrada correspondiente en MainRateGeneral
            const mainRateGeneralData = {
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
            };

            await insertRateGeneral(mainRateGeneralData);

            // Añadir a estado local
            setGymnasts(prev => [...prev, { ...newGymnast, id: id as number }]);
            createdCount++;
          }
        } catch (error) {
          console.error(`Error importing row ${i}:`, error);
          errors++;
        }
      }

      // Actualizar el número de participantes en la competencia
      if (createdCount > 0 && competenceData) {
        const updatedCompetence = {
          ...competenceData,
          numberOfParticipants: (competenceData.numberOfParticipants || 0) + createdCount,
        };

        await updateCompetence(competenceId, updatedCompetence);
        setCompetenceData(updatedCompetence);
      }

      // Mostrar resultado
      Alert.alert(
        "Import Complete",
        `Successfully imported ${createdCount + updatedCount} gymnasts (${createdCount} new, ${updatedCount} updated)${errors > 0 ? ` (${errors} errors)` : ""}.`
      );
    } catch (error) {
      console.error("Error in import process:", error);
      Alert.alert("Import Error", "Failed to complete the import process.");
    }
  } catch (error) {
    console.error("General error in import:", error);
    Alert.alert("Import Error", "An unexpected error occurred during import.");
  } finally {
    setIsSaving(false);
  }
};

  return (
    <View style={styles.container} onTouchStart={handleGlobalClick}>
      {/* Search Bar with Animation */}
      <Animated.View
        style={[
          styles.importButton,
          {
            opacity: backButtonOpacity,
            transform: [{ translateX: backButtonTranslateX }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.importButtonInner}
          onPress={handleImportPress}
        >
          <Ionicons name="cloud-upload-outline" size={28} color="#0052b4" />
          <Text style={styles.importButtonText}>Import</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.backButton,
          {
            opacity: backButtonOpacity,
            transform: [{ translateX: backButtonTranslateX }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButtonInner}
          onPress={() =>
            router.push(`/folder?id=${folderId}&discipline=${discipline}`)
          }
        >
          <Ionicons name="arrow-back" size={28} color="#0052b4" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: searchBarOpacity,
            transform: [{ translateY: searchBarTranslateY }],
          },
        ]}
      >
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Name"
            placeholderTextColor="#999"
            value={nameSearch}
            onChangeText={setNameSearch}
          />
        </View>

        {/* Event Dropdown for Search */}
        <View style={styles.searchInputContainer}>
          <View
            style={{
              position: "relative",
              zIndex: Platform.OS === "ios" ? 999 : 10,
            }}
          >
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={(e) => {
                e.stopPropagation();
                toggleSearchDropdown();
              }}
            >
              <Text style={styles.dropdownButtonText}>
                {typeSearch || "Select Event"}
              </Text>
              <Ionicons
                name={isTypeSearchExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>

            {/* Dropdown options as part of the component, not absolute */}
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
                {/* None option */}
                <TouchableOpacity
                  style={styles.dropdownItem}
                  activeOpacity={0.7}
                  onPress={() => handleTypeSelect("")}
                >
                  <Text style={styles.dropdownItemText}>None</Text>
                </TouchableOpacity>

                {/* Event options */}
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

        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="BIB"
            placeholderTextColor="#999"
            value={bibSearch}
            onChangeText={setBibSearch}
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={24} color="black" />
        </TouchableOpacity>
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
            /* Rows with animation - only animated on initial load */
            gymnasts.map((gymnast, index) => (
              <Animated.View
                key={gymnast.id}
                style={[
                  styles.row,
                  initialLoadComplete
                    ? null
                    : {
                        opacity: rowAnimations[index]?.opacity || 1,
                        transform: [
                          { translateX: rowAnimations[index]?.translateX || 0 },
                        ],
                      },
                  invalidGymnastIds.includes(gymnast.id) && {
                    borderColor: "red",
                    borderWidth: 2,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.noCell}
                  onPress={() =>
                    gotogymnastcalculator(
                      competenceId,
                      gymnast.id,
                      gymnast.event,
                      discipline,
                      gymnast.id,
                      gymnast.number
                    )
                  }
                >
                  <Text style={styles.cellText}>{gymnast.number}</Text>
                </TouchableOpacity>

                <View style={styles.gymnastCell}>
                  {editingField.gymnastId === gymnast.id &&
                  editingField.field === "name" ? (
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
                      onPress={() => startEditing(gymnast.id, "name")}
                    >
                      <Text style={styles.cellText}>
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
                      onValueChange={(itemValue) =>
                        handleGymnastChange(gymnast.id, "event", itemValue)
                      }
                      mode="dropdown"
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
                      ref={(el) => (rowRefs.current[gymnast.id] = el)}
                      style={styles.eventDropdownButton}
                      onPress={() => {
                        if (Platform.OS === "ios") {
                          setDropdownVisible(false);
                          setTimeout(() => {
                            startEditing(gymnast.id, "event");
                          }, 50);
                        } else {
                          startEditing(gymnast.id, "event");
                        }
                      }}
                    >
                      <Text style={styles.cellText}>
                        {gymnast.event || "Select"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color="#666"
                        style={{ marginLeft: 5 }}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.standardCell}>
                  {editingField.gymnastId === gymnast.id &&
                  editingField.field === "noc" ? (
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
                      onPress={() => startEditing(gymnast.id, "noc")}
                    >
                      <Text style={styles.cellText}>
                        {gymnast.noc || "Click to edit"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.standardCell}>
                  {editingField.gymnastId === gymnast.id &&
                  editingField.field === "bib" ? (
                    <TextInput
                      style={styles.editInput}
                      placeholder="Enter BIB"
                      value={gymnast.bib ? gymnast.bib.toString() : ""}
                      onChangeText={(text) =>
                        handleGymnastChange(
                          gymnast.id,
                          "bib",
                          parseInt(text) || 0
                        )
                      }
                      onBlur={() => saveField(gymnast.id)}
                      keyboardType="number-pad"
                      autoFocus
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => startEditing(gymnast.id, "bib")}
                    >
                      <Text style={styles.cellText}>
                        {gymnast.bib !== 0 ? gymnast.bib : "Click to edit"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Delete button in row */}
                {isDeleteMode && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => showDeleteConfirmation(gymnast.id)}
                  >
                    <Ionicons name="trash-outline" size={24} color="black" />
                  </TouchableOpacity>
                )}
              </Animated.View>
            ))
          )}

          {/* Add Gymnast Row */}
          {gymnasts.length < participants && !isearching && (
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
        <TouchableOpacity
          style={[
            styles.startButton,
            {
              backgroundColor: number === 1 ? "#0052b4" : "rgb(28, 82, 147)", // Change background color based on `number`
              opacity: gymnasts.length > 0 ? 1 : 0.5,
            },
          ]}
          onPress={() => handleSelectStart()}
          disabled={gymnasts.length === 0 || isSaving}
        >
          <Text style={styles.buttonText}>
            {number == 0 ? "START JUDGING" : "CONTINUE JUDGING"}{" "}
            {/* Change text based on `number` */}
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
            <Text style={styles.editButtonText}>
              {isDeleteMode ? "DONE" : "DELETE MODE"}
            </Text>
          )}
        </TouchableOpacity>
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
              Delete this gymnast?
            </Text>

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
    height: 170,
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
    maxHeight: "80%",
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
    top: 22,
    right: 30,
    zIndex: 1000,
  },
  backButtonInner: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  backButtonText: {
    color: "#0052b4",
    fontWeight: "bold",
    marginLeft: 5,
    fontSize: 16,
  },
  importButton: {
    position: "absolute",
    top: 22,
    right: 150, // Posicionado a la izquierda del botón "Go Back"
    marginRight: 15,
    zIndex: 1000,
  },
  importButtonInner: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  importButtonText: {
    color: "#0052b4",
    fontWeight: "bold",
    marginLeft: 5,
    fontSize: 16,
  },
});

export default GymnasticsTable;
