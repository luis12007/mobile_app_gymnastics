import { Ionicons } from '@expo/vector-icons';
import { useFonts } from "expo-font";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  deleteCompetencesByFolderId,
  deleteFolder,
  deleteMainTableByCompetenceId,
  deleteRateGeneralByTableId,
  getCompetencesByFolderId,
  getFoldersByUserId,
  getMainTablesByCompetenceId,
  insertCompetence, insertFolder, insertMainTable, updateFolder
} from "../Database/database"; // Adjust the path based on your project structure
const { width, height } = Dimensions.get("window");
const isLargeScreen = width >= 1000 && height >= 700;
var isLargeDevice = false
var isSmallDevice = false
var isTinyDevice = false
if (width > 1368) {
  isLargeDevice = true
}
if (width < 1367 && width >= 945) {
  isSmallDevice = true
}
if (width < 949 ) {
  isTinyDevice = true
}
// Update this interface to match the props being passed
interface FolderItemProps {
  id: number; // Add this
  title: string;
  description: string; // Add this
  date: string;
  selected?: boolean;
  folderType: 1 | 2;
  animationDelay?: number;
  selectionMode?: boolean; // Add this
  discipline: Boolean,
  empty?: boolean; // Add this
  onSelect?: (id: number) => void; // Add this
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
  onSelect = () => {}
}) => {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [folderTypeText, setFolderTypeText] = useState(folderType === 1 ? "Training" : "Competence");

  useEffect(() => {
    // Delay each folder's animation for staggered effect
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, animationDelay);
  }, []);

  const goIntoFolder = (folderId: number, discipline: Boolean) => {
    if (selectionMode) {
      onSelect(folderId);
    } else {
      router.push(`/folder?id=${folderId}&discipline=${discipline}`);
    }
  };

  


  return (
    <Animated.View
      style={[
        styles.folderItemContainer,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        style={[
          folderType === 1 ? styles.folderType1 : null,
          folderType === 2 ? styles.folderType2 : null,
          isLargeDevice ? styles.folderItem : null,
          isSmallDevice ? styles.folderItemSmall : null, 
          isTinyDevice ? styles.folderItemTiny : null,
          selected ? styles.selectedFolder : null,
        ]}
        onPress={() => goIntoFolder(id, discipline)}
      >
        <View style={styles.folderContent}>
        <Image
  source={
    empty
      ? require("../assets/images/open-folder.png") // Image for folderType 1
      : require("../assets/images/folder.png") // Image for folderType 2
  }

  style={[
    isLargeDevice ? styles.folderIcon : null, 
    isSmallDevice ? styles.folderIconSmall : null, 
    isTinyDevice ? styles.folderIconTiny : null,
  ]}
  resizeMode="cover"
/>
          
          <View style={[
            isLargeDevice ? styles.folderInfo : null, 
            isSmallDevice ? styles.folderInfoSmall : null, 
            isTinyDevice ? styles.folderInfoTiny : null, 
          ]}>
            <Text 
              style={[
                isLargeDevice ? styles.folderTitle : null, 
                isSmallDevice ? styles.folderTitleSmall : null, 
                isTinyDevice ? styles.folderTitleTiny : null, 
              ]}
            >
              {title}
            </Text>
            
            <Text 
              style={[
                isLargeDevice ? styles.folderDescription : null, 
                isSmallDevice ? styles.folderDescriptionSmall : null, 
                isTinyDevice ? styles.folderDescriptionTiny : null, 
              ]}
            >
              {description}
            </Text>
            
            <View style={[
              isLargeDevice ? styles.folderFooter : null, 
              isSmallDevice ? styles.folderFooterSmall : null, 
              isTinyDevice ? styles.folderFooterTiny : null, 
            ]}>
{/*               <TouchableOpacity 
                style={[
                  isLargeDevice ? styles.entrainementButton : null, 
                  isSmallDevice ? styles.entrainementButtonSmall : null, 
                  isTinyDevice ? styles.entrainementButtonTiny : null, 
                ]}
              >
                <Text style={isLargeScreen ? styles.entrainementText : styles.entrainementTextSmall}>
                  {folderTypeText}
                </Text>
              </TouchableOpacity> */}
              
              <Text 
                style={[
                  isLargeDevice ? styles.dateText : null, 
                  isSmallDevice ? styles.dateTextSmall : null, 
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
            <Ionicons name="checkmark" size={isLargeScreen ? 20 : 16} color="#000" />
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
  const [userId] = useState(1); // Replace with the actual user ID
  
  // For editing functionality
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const params = useLocalSearchParams();
  const discipline = params.discipline === "true";
    const userIdparams = params.userId;


  // variables competition
const [competitionName, setCompetitionName] = useState("");
const [competitionDescription, setCompetitionDescription] = useState("");
const [competitionParticipants, setCompetitionParticipants] = useState("");
const [competitionType, setCompetitionType] = useState("Floor");
const [currentFolderId, setCurrentFolderId] = useState<number | null>(
  params.id ? parseInt(params.id as string) : null
);
const [folderSelectionForCompetition, setFolderSelectionForCompetition] = useState(false);



  // Animation values
  const headerAnimOpacity = useRef(new Animated.Value(0)).current;
  const headerAnimY = useRef(new Animated.Value(-50)).current;
  const buttonAnimOpacity = useRef(new Animated.Value(0)).current;
  const buttonAnimY = useRef(new Animated.Value(50)).current;
  const deleteButtonAnim = useRef(new Animated.Value(0)).current;



  // Load the custom font
  const [fontsLoaded] = useFonts({
    "Rajdhani-Bold": require("../assets/fonts/Rajdhani/Rajdhani-Bold.ttf"),
    "Rajdhani-medium": require("../assets/fonts/Rajdhani/Rajdhani-Medium.ttf"),
  });

  const fetchFolders = async () => {
    try {
      const fetchedFolders = await getFoldersByUserId(userId);
      setFolders(fetchedFolders);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [userId]);

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
  try {
    // Delete each selected folder and its related data
    for (const folderId of selectedFolders) {
      // Fetch competences associated with the folder
      const competences = await getCompetencesByFolderId(folderId);

      for (const competence of competences) {
        // Fetch main tables associated with the competence
        const mainTables = await getMainTablesByCompetenceId(competence.id);

        for (const mainTable of mainTables) {
          // Delete rateGeneral entries associated with the main table
          await deleteRateGeneralByTableId(mainTable.id);
        }

        // Delete main tables associated with the competence
        await deleteMainTableByCompetenceId(competence.id);
      }

      // Delete competences associated with the folder
      await deleteCompetencesByFolderId(folderId);

      // Finally, delete the folder
      await deleteFolder(folderId);
    }

    // Update the folders state to remove deleted folders
    setFolders(prevFolders =>
      prevFolders.filter(folder => !selectedFolders.includes(folder.id))
    );

    setConfirmationModel(false);
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedFolders([]);

    // Show success feedback
    setFeedbackAcceptModel(true);
    setTimeout(() => {
      setFeedbackAcceptModel(false);
    }, 1500);
  } catch (error) {
    console.error("Error deleting folders and related data:", error);
    Alert.alert("Error", "Failed to delete folders and related data.");
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
    if (!editingFolder) return;
    
    if (folderName.trim() === "" || folderDescription.trim() === "") {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    const updatedFolder = {
      ...editingFolder,
      name: folderName,
      description: folderDescription,
      type: folderType,
    };

    try {
      const result = await updateFolder(editingFolder.id, updatedFolder);
      if (result) {
        // Update the folders state with the edited folder
        setFolders(prevFolders => 
          prevFolders.map(folder => 
            folder.id === editingFolder.id ? updatedFolder : folder
          )
        );
        
        setEditFolderModalVisible(false);
        setSelectionMode(false);
        setSelectionAction(null);
        setSelectedFolders([]);
        setEditingFolder(null);
        
        // Show success feedback
        setFeedbackAcceptModel(true);
        setTimeout(() => {
          setFeedbackAcceptModel(false);
        }, 1500);
      } else {
        Alert.alert("Error", "Failed to update folder.");
      }
    } catch (error) {
      console.error("Error updating folder:", error);
      Alert.alert("Error", "Failed to update folder.");
    }
  };

  // Function to add a new folder
  const addNewFolder = async () => {
    if (folderName.trim() === "" || folderDescription.trim() === "") {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    const folderData = {
      userId: userId,
      name: folderName,
      description: folderDescription,
      type: folderType,
      date: new Date().toISOString(),
      filled: false,
    };

    try {
      const result = await insertFolder(folderData);
      if (result) {
        // Add the new folder to state with the returned ID
        const newFolder = {
          id: result,
          ...folderData,
        };
        
        setFolders(prevFolders => [...prevFolders, newFolder]);
        
        // Reset form and close modal
        setFolderName("");
        setFolderDescription("");
        setAddFolderModalVisible(false);
        
        // Show success feedback
        setFeedbackAcceptModel(true);
        setTimeout(() => {
          setFeedbackAcceptModel(false);
        }, 1500);
      } else {
        Alert.alert("Error", "Failed to insert folder.");
      }
    } catch (error) {
      console.error("Error adding folder:", error);
      Alert.alert("Error", "Failed to add folder.");
    }
  };

  const goBack = () => {
    router.push(`/select-sex?userId=${userIdparams}`);
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

  
    if (params.id) {
      setCurrentFolderId(parseInt(params.id as string));
    }

  console.log("Current Folder ID:", currentFolderId);
  console.log("URL Params:", params);


  
  }, [currentFolderId, params]);
  
  // Function to add a new competition
  const addNewCompetition = async () => {
    // Validate inputs
    if (competitionName.trim() === "" || competitionDescription.trim() === "") {
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
    
    // Determine which folder ID to use
    const targetFolderId = currentFolderId || selectedFolders[0];
    console.log("Using folder ID:", targetFolderId);
    
    const competenceData = {
      folderId: targetFolderId,
      name: competitionName,
      description: competitionDescription,
      participants: parseInt(competitionParticipants),
      type: competitionType,
      date: new Date().toISOString(),
      gender: discipline
    };
    
    try {
      const competitionId = await insertCompetence(competenceData);/* TODO */

      /* change filled in the folder in the db */
      
        await updateFolder(targetFolderId, { filled: true }); // Update the folder to mark it as filled
      if (competitionId) {
            // Create Main Table entries for each participant
            await createMainTableEntries(competitionId, parseInt(competitionParticipants));
            

          } else {
            Alert.alert("Error", "Failed to add competition.");
          }

      if (competitionId) {
        // Reset form and close modal
        setCompetitionName("");
        setCompetitionDescription("");
        setCompetitionParticipants("");
        setCompetitionType("Floor");
        setAddCompetitionModalVisible(false);
        setFolderSelectionForCompetition(false);
        setSelectionMode(false);
        setSelectedFolders([]);
        setCurrentFolderId(null);
        
        // Show success feedback
        setFeedbackAcceptModel(true);
        setTimeout(() => {
          setFeedbackAcceptModel(false);
        }, 1500);
        
      } else {
        Alert.alert("Error", "Failed to add competition.");
      }
    } catch (error) {
      console.error("Error adding competition:", error);
      Alert.alert("Error", "Failed to add competition.");
    }
  };

  // Add this new function to create Main Table entries
  const createMainTableEntries = async (competenceId: number, numberOfParticipants: number) => {
    try {
      // Create a main table entry for each participant
      for (let i = 1; i < numberOfParticipants +1; i++) {
        const mainTableData = {
          competenceId: competenceId,
          number: i, // Participant number
          name: "", // Empty initially
          event: "",
          noc: "",
          bib: 0,
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
        
        // Insert the main table entry
        const result = await insertMainTable(mainTableData);
        if (!result) {
          console.error(`Failed to create main table entry ${i} for competition ID: ${competenceId}`);
        }
      }
      console.log(`Successfully created ${numberOfParticipants} main table entries for competition ID: ${competenceId}`);
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
          styles.header,
          { 
            opacity: headerAnimOpacity,
            transform: [{ translateY: headerAnimY }]
          }
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text 
            style={[
              isLargeDevice ? styles.headerTitle : null, 
              isSmallDevice ? styles.headerTitle : null, 
              isTinyDevice ? styles.headerTitleTiny : null, 
            ]}
          >
            Select Discipline
          </Text>
        </TouchableOpacity>
        
        {selectionMode ? (
          <TouchableOpacity onPress={cancelSelectionMode}>
            <Text style={styles.cancelSelectionText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Ionicons name="menu" size={28} color="#000" />
          </TouchableOpacity>
        )}
      </Animated.View>
      
      {/* Folders Grid */}
      <ScrollView style={styles.scrollView}>
        <View style={isLargeScreen ? styles.foldersGrid : styles.foldersGridSmall}>
          {folders.map((folder, index) => (
            <FolderItem
              key={folder.id}
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
            />
          ))}
        </View>
      </ScrollView>
      
      {/* Add Competition Button with Animation */}
<Animated.View 
  style={[
    styles.buttonContainer,
    {
      opacity: buttonAnimOpacity,
      transform: [{ translateY: buttonAnimY }]
    }
  ]}
>
  {!selectionMode ? (
    <TouchableOpacity 
      style={isLargeScreen ? styles.addButton : styles.addButtonSmall} 
      onPress={() => setAddCompetitionModalVisible(true)}
    >
      <Text style={isLargeScreen ? styles.addButtonText : styles.addButtonTextSmall}>
        Add Competition
      </Text>
    </TouchableOpacity>
  ) : selectionAction === 'edit' && selectedFolders.length === 1 ? (
    <TouchableOpacity 
      style={isLargeScreen ? styles.editConfirmButton : styles.editConfirmButtonSmall} 
      onPress={handleEditConfirm}
    >
      <Text style={isLargeScreen ? styles.editConfirmButtonText : styles.editConfirmButtonTextSmall}>
        Edit Selected
      </Text>
    </TouchableOpacity>
  ) : folderSelectionForCompetition && selectedFolders.length === 1 ? (
    <TouchableOpacity 
      style={isLargeScreen ? styles.confirmButton : styles.confirmButtonSmall} 
      onPress={confirmFolderForCompetition}
    >
      <Text style={isLargeScreen ? styles.confirmButtonText : styles.confirmButtonTextSmall}>
        Use Selected Folder
      </Text>
    </TouchableOpacity>
  ) : null}
</Animated.View>
  
      {/* Delete Confirmation Button (appears when in delete mode) */}
      {selectionMode && selectionAction === 'delete' && selectedFolders.length > 0 && (
        <Animated.View 
          style={[
            styles.deleteButtonContainer,
            {
              opacity: deleteButtonAnim,
              transform: [{ scale: deleteButtonAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={isLargeScreen ? styles.deleteButton : styles.deleteButtonSmall} 
            onPress={confirmDelete}
          >
            <Ionicons name="trash" size={isLargeScreen ? 24 : 20} color="#fff" />
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
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View 
            style={[
              isLargeDevice ? styles.menuModal : null, 
              isSmallDevice ? styles.menuModalSmall : null, 
              isTinyDevice ? styles.menuModalTiny : null, 
            ]}
          >
            <TouchableOpacity style={styles.menuItem} onPress={handleAddOption}>
              <Image
                source={require("../assets/images/add.png")}
                style={styles.menuIconPlaceholder}
                resizeMode="cover"
              />
              <Text style={isLargeScreen ? styles.menuText : styles.menuTextSmall}>Add</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity style={styles.menuItem} onPress={handleEditOption}>
              <Image
                source={require("../assets/images/edit.png")}
                style={styles.menuIconPlaceholder}
                resizeMode="cover"
              />
              <Text style={isLargeScreen ? styles.menuText : styles.menuTextSmall}>Edit</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteOption}>
              <Image
                source={require("../assets/images/delete.png")}
                style={styles.menuIconPlaceholder}
                resizeMode="cover"
              />
              <Text style={isLargeScreen ? styles.menuText : styles.menuTextSmall}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
  
      {/* Add Folder Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={addFolderModalVisible}
        onRequestClose={() => setAddFolderModalVisible(false)}
      >
        <View style={styles.addModalOverlay}>
          <View 
            style={[
              isLargeDevice ? styles.addFolderModal : null, 
              isSmallDevice ? styles.addFolderModalSmall : null, 
              isTinyDevice ? styles.addFolderModalTiny : null, 
            ]}
          >
            <Text style={isLargeScreen ? styles.addFolderTitle : styles.addFolderTitleSmall}>Add Folder</Text>
  
            <TextInput
              style={styles.folderInput}
              placeholder="Folder's name"
              placeholderTextColor="#888"
              onChange={(e) => setFolderName(e.nativeEvent.text)}
              value={folderName}
            />
  
            <TextInput
              style={styles.folderInput}
              placeholder="Folder's description"
              placeholderTextColor="#888"
              multiline
              onChange={(e) => setFolderDescription(e.nativeEvent.text)}
              value={folderDescription}
            />
  
            {/* <View style={styles.optionsRow}>
              Training Option 
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  folderType === true && styles.selectedOptionButton,
                ]}
                onPress={() => setFolderType(true)}
              >
                <Text
                  style={[
                    styles.optionText,
                    folderType === true && styles.selectedOptionText,
                  ]}
                >
                  Training
                </Text>
              </TouchableOpacity>
  
               Competence Option 
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  folderType === false && styles.selectedOptionButton,
                ]}
                onPress={() => setFolderType(false)}
              >
                <Text
                  style={[
                    styles.optionText,
                    folderType === false && styles.selectedOptionText,
                  ]}
                >
                  Competence
                </Text>
              </TouchableOpacity>
            </View> */}
  
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={isLargeScreen ? styles.confirmButton : styles.confirmButtonSmall}
                onPress={addNewFolder}
              >
                <Text style={isLargeScreen ? styles.confirmButtonText : styles.confirmButtonTextSmall}>Confirm</Text>
              </TouchableOpacity>
  
              <TouchableOpacity 
                style={isLargeScreen ? styles.cancelButton : styles.cancelButtonSmall}
                onPress={() => setAddFolderModalVisible(false)}
              >
                <Text style={isLargeScreen ? styles.cancelButtonText : styles.cancelButtonTextSmall}>Cancel</Text>
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
        onRequestClose={() => setEditFolderModalVisible(false)}
      >
        <View style={styles.addModalOverlay}>
          <View 
            style={[
              isLargeDevice ? styles.addFolderModal : null, 
              isSmallDevice ? styles.addFolderModalSmall : null, 
              isTinyDevice ? styles.addFolderModalTiny : null, 
            ]}
          >
            <Text style={isLargeScreen ? styles.addFolderTitle : styles.addFolderTitleSmall}>Edit Folder</Text>
  
            <TextInput
              style={styles.folderInput}
              placeholder="Folder's name"
              placeholderTextColor="#888"
              onChange={(e) => setFolderName(e.nativeEvent.text)}
              value={folderName}
            />
  
            <TextInput
              style={styles.folderInput}
              placeholder="Folder's description"
              placeholderTextColor="#888"
              multiline
              onChange={(e) => setFolderDescription(e.nativeEvent.text)}
              value={folderDescription}
            />
  
            {/* <View style={styles.optionsRow}>
              Training Option 
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  folderType === true && styles.selectedOptionButton,
                ]}
                onPress={() => setFolderType(true)}
              >
                <Text
                  style={[
                    styles.optionText,
                    folderType === true && styles.selectedOptionText,
                  ]}
                >
                  Training
                </Text>
              </TouchableOpacity>
  
              Competence Option
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  folderType === false && styles.selectedOptionButton,
                ]}
                onPress={() => setFolderType(false)}
              >
                <Text
                  style={[
                    styles.optionText,
                    folderType === false && styles.selectedOptionText,
                  ]}
                >
                  Competence
                </Text>
              </TouchableOpacity>
            </View> */}
  
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={isLargeScreen ? styles.confirmButton : styles.confirmButtonSmall}
                onPress={saveEditedFolder}
              >
                <Text style={isLargeScreen ? styles.confirmButtonText : styles.confirmButtonTextSmall}>Save</Text>
              </TouchableOpacity>
  
              <TouchableOpacity 
                style={isLargeScreen ? styles.cancelButton : styles.cancelButtonSmall}
                onPress={() => setEditFolderModalVisible(false)}
              >
                <Text style={isLargeScreen ? styles.cancelButtonText : styles.cancelButtonTextSmall}>Cancel</Text>
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
        onRequestClose={() => setConfirmationModel(false)}
      >
        <View style={styles.addModalOverlay}>
          <View 
            style={[
              isLargeDevice ? styles.confirmationModal : null, 
              isSmallDevice ? styles.confirmationmodalSmall : null, 
              isTinyDevice ? styles.confirmationmodalTiny : null, 
            ]}
          >
            <Text style={isLargeScreen ? styles.addFolderTitle : styles.addFolderTitleSmall}>
              Delete {selectedFolders.length} folder{selectedFolders.length > 1 ? 's' : ''}?
            </Text>
  
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={isLargeScreen ? styles.confirmButton : styles.confirmButtonSmall}
                onPress={performDelete}
              >
                <Text style={isLargeScreen ? styles.confirmButtonText : styles.confirmButtonTextSmall}>Confirm</Text>
              </TouchableOpacity>
  
              <TouchableOpacity 
                style={isLargeScreen ? styles.cancelButton : styles.cancelButtonSmall}
                onPress={() => setConfirmationModel(false)}
              >
                <Text style={isLargeScreen ? styles.cancelButtonText : styles.cancelButtonTextSmall}>Cancel</Text>
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
          style={styles.addModalOverlay}
          activeOpacity={1}
          onPress={() => setFeedbackAcceptModel(false)}
        >
          <View style={[
      isLargeDevice ? styles.addFolderfeedback : null,
      isSmallDevice ? styles.addFolderfeedbackSmall : null,
      isTinyDevice ? styles.addFolderfeedbackTiny : null,
    ]}>
            <Text style={isLargeScreen ? styles.addFolderTitle : styles.addFolderTitleSmall}>
              {selectionAction === 'delete' ? 'Delete Complete' : 'Change Processed'}
            </Text>
            <Image
              source={require("../assets/images/checked.png")}
              style={styles.feedbackIcon}
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
  onRequestClose={() => setAddCompetitionModalVisible(false)}
>
  <View style={styles.addModalOverlay}>
    <View 
      style={[
        isLargeDevice ? styles.addFolderModal2 : null, 
        isSmallDevice ? styles.addFolderModal2Small : null, 
        isTinyDevice ? styles.addFolderModal2Tiny : null, 
      ]}
    >
      <Text style={isLargeScreen ? styles.addFolderTitle : styles.addFolderTitleSmall}>Add Competition</Text>

      <TextInput
        style={styles.folderInput}
        placeholder="Competition name"
        placeholderTextColor="#888"
        value={competitionName}
        onChange={(e) => setCompetitionName(e.nativeEvent.text)}
      />

      <TextInput
        style={styles.folderInput}
        placeholder="Competition description"
        placeholderTextColor="#888"
        value={competitionDescription}
        onChange={(e) => setCompetitionDescription(e.nativeEvent.text)}
      />

      <TextInput
        style={styles.folderInput}
        placeholder="Number of participants"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={competitionParticipants}
        onChange={(e) => setCompetitionParticipants(e.nativeEvent.text)}
      />

      {/* <View style={styles.optionsRow}>
        <TouchableOpacity 
          style={[
            styles.optionButton,
            competitionType === "Floor" && styles.selectedOptionButton,
          ]}
          onPress={() => setCompetitionType("Floor")}
        >
          <Text style={[
            styles.optionText,
            competitionType === "Floor" && styles.selectedOptionText,
          ]}>Floor</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.optionButton,
            competitionType === "Jump" && styles.selectedOptionButton,
          ]}
          onPress={() => setCompetitionType("Jump")}
        >
          <Text style={[
            styles.optionText,
            competitionType === "Jump" && styles.selectedOptionText,
          ]}>Jump</Text>
        </TouchableOpacity>
      </View> */}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={isLargeScreen ? styles.confirmButton : styles.confirmButtonSmall}
          onPress={addNewCompetition}
        >
          <Text style={isLargeScreen ? styles.confirmButtonText : styles.confirmButtonTextSmall}>{ConfirmButtomText}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={isLargeScreen ? styles.cancelButton : styles.cancelButtonSmall}
          onPress={() => setAddCompetitionModalVisible(false)}
        >
          <Text style={isLargeScreen ? styles.cancelButtonText : styles.cancelButtonTextSmall}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#999',
    borderRadius: 30,
    margin: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 3,
    top: 1,
    color: '#fff',
    fontFamily: 'Rajdhani-medium',
  },
  headerTitleTiny: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 3,
    color: '#fff',
    fontFamily: 'Rajdhani-medium',
  },
  cancelSelectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Responsive grid styles
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'flex-start',
  },
  foldersGridSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
    justifyContent: 'flex-start',
  },
  folderItemContainer: {
    width: '33.0%',
    marginBottom: 12,
  },
  // Folder item styles - large screen
  folderItem: {
    height: 160,
    width: '96%',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 8,
    position: 'relative',
  },
  // Folder item styles - small screen
  folderItemSmall: {
    height: 160,
    width: '96%',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 8,
    position: 'relative',
  },
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
  feedbackIcon: {
    width: 200,
    height: 200,
    borderRadius: 5,
    marginBottom: 6,
    position: 'relative',
    alignSelf: 'center',
    top: 5,
  },
  folderContent: {
    alignItems: 'stretch',
  },
  // Folder icon - large screen
  folderIcon: {
    width: 90,
    height: 95,
    borderRadius: 5,
    marginBottom: 6,
    position: 'absolute',
    top: 20,
    left: 20,
  },
  // Folder icon - small screen
  folderIconSmall: {
    width: 90,
    height: 95,
    borderRadius: 5,
    marginBottom: 4,
    position: 'absolute',
    top: 20,
    left: 10,
  },
  folderIconTiny: {
    width: 50,
    height: 55,
    borderRadius: 5,
    marginBottom: 4,
    position: 'absolute',
    top: 10,
    left: 5,
  },
  folderType1: {

  },
  folderType2: {

  },
  // Folder info - large screen
  folderInfo: {
    width: '70%',
    height: 135,
    right: 5,
    position: 'absolute',
  },
  // Folder info - small screen
  folderInfoSmall: {
    width: '65%',
    height: 150,
    right: 5,
    position: 'absolute',
    
    
  },
  folderInfoTiny: {
    width: '65%',
    height: 100,
    right: 5,
    position: 'absolute',
  },
  // Folder title - large screen
  folderTitle: {
    fontSize: 40,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  // Folder title - small screen
  folderTitleSmall: {
    fontSize: 30,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    
  },
  folderTitleTiny: {
    fontSize: 24,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  // Folder description - large screen
  folderDescription: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 1,
  },
  // Folder description - small screen
  folderDescriptionSmall: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 10,
    marginLeft: 4,
    
  },
  folderDescriptionTiny: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 2,
    marginLeft: 4,
    marginBottom: 7,
  },
  folderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  folderFooterSmall: {
    textAlign: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  folderFooterTiny: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },

  // Entrainement button - large screen
  entrainementButton: {
    backgroundColor: '#DADADA',
    borderRadius: 12,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#999',
    width: 110,
    height: 30,
    paddingVertical: 2,
    position: 'absolute',
    bottom: 5,
  },
  // Entrainement button - small screen
  entrainementButtonSmall: {
    backgroundColor: '#DADADA',
    borderRadius: 8,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#999',
    width: 120,
    height: 27,
    paddingVertical: 2,
    position: 'absolute',
    bottom: 5,
  },
  entrainementButtonTiny: {
    backgroundColor: '#DADADA',
    borderRadius: 8,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#999',
    width: 80,
    height: 19,
    paddingVertical: 2,
    position: 'absolute',
    bottom: 5,
  },
  // Entrainement text - large screen
  entrainementText: {
    fontSize: 18,
    bottom: 2,
    position: 'relative',
    alignSelf: 'center',
    color: '#333',
  },
  // Entrainement text - small screen
  entrainementTextSmall: {
    fontSize: 10,
    bottom: 1,
    position: 'relative',
    alignSelf: 'center',
    color: '#333',
  },
  // Date text - large screen
  dateText: {
    fontSize: 25,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute',
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center', 
    bottom: 0,
  },
  // Date text - small screen
  dateTextSmall: {
    fontSize: 17,
    color: '#333',
    fontFamily: 'Rajdhani-medium',
    position: 'absolute', 
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center', 
    bottom: 10,

  },
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
  buttonContainer: {
    padding: 16,
  },
  // Add button - large screen
  addButton: {
    backgroundColor: '#0047AB',
    borderRadius: 12,
    padding: 12,
    width: '30%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  // Add button - small screen
  addButtonSmall: {
    backgroundColor: '#0047AB',
    borderRadius: 10,
    padding: 8,
    width: '50%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  // Add button text - large screen
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 30,
  },
  // Add button text - small screen
  addButtonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  
  // Edit confirm button
  editConfirmButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    padding: 12,
    width: '30%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  editConfirmButtonSmall: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
    padding: 8,
    width: '50%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  editConfirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 30,
  },
  editConfirmButtonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  
  // Delete button container (floating button)
  deleteButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  deleteButton: {
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
  
  // Modal Menu Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  // Menu modal - large screen
  menuModal: {
    backgroundColor: '#999',
    width: 180,
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
  // Menu modal - small screen
  menuModalSmall: {
    backgroundColor: '#999',
    width: 140,
    marginTop: 80,
    marginRight: 25,
    borderRadius: 6,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuModalTiny: {
    backgroundColor: '#999',
    width: 120,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIconPlaceholder: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  // Menu text - large screen
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Menu text - small screen
  menuTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // Add Folder Modal Styles
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Feedback modal - large screen
  addFolderfeedback: {
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
  // Feedback modal - small screen
  addFolderfeedbackSmall: {
    backgroundColor: '#fff',
    width: '50%',
    height: 295,
    maxHeight: '90%',
    borderRadius: 15,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
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
  // Confirmation modal - large screen
  confirmationModal: {
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
  confirmationmodalSmall: {
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
  confirmationmodalTiny: {
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
  // Add folder modal - large screen
  addFolderModal: {
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
  // Add folder modal - small screen
  addFolderModalSmall: {
    backgroundColor: '#fff',
    width: '70%',
    height: 270,
    maxHeight: '80%',
    borderRadius: 10,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
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

  // Add competition modal - large screen
  addFolderModal2: {
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
  // Add competition modal - small screen
  addFolderModal2Small: {
    backgroundColor: '#fff',
    width: '70%',
    height: 310,
    maxHeight: '90%',
    borderRadius: 10,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
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

  // Add folder title - large screen
  addFolderTitle: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Rajdhani-medium',
  },
  // Add folder title - small screen
  addFolderTitleSmall: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Rajdhani-medium',
  },
  folderInput: {
    borderColor: '#ddd',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    fontSize: 15,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    width: "45%",
    backgroundColor: "#f8f8f8", // Default background
  },
  selectedOptionButton: {
    borderColor: "rgb(0, 0, 0)", // Highlighted border color
    backgroundColor: "rgb(224, 224, 224)", // Highlighted background color
  },
  optionText: {
    fontSize: 14,
    textAlign: "center",
    color: "#333", // Default text color
  },
  selectedOptionText: {
    color: "#4285F4", // Highlighted text color
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Confirm button - large screen
  confirmButton: {
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
  // Confirm button - small screen
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
    marginRight: 30,
    alignItems: 'center',
  },
  // Confirm button text - large screen
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 26,
  },
  // Confirm button text - small screen
  confirmButtonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  // Cancel button - large screen
  cancelButton: {
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
  // Cancel button - small screen
  cancelButtonSmall: {
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
  // Cancel button text - large screen
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 26,
  },
  // Cancel button text - small screen
  cancelButtonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  }
});

export default MainMenu;