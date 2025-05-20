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
  deleteCompetence,
  deleteMainTableByCompetenceId,
  deleteRateGeneralByTableId,
  getCompetencesByFolderId,
  getMainTablesByCompetenceId,
  insertCompetence,
  insertMainTable,
  insertRateGeneral,
  updateCompetence,
  updateFolder
} from "../Database/database"; // Make sure you have these functions in your database file

const { width, height } = Dimensions.get("window");

const isLargeScreen = width >= 1000 && height >= 700;
var isLargeDevice = false
var isSmallDevice = false
var isTinyDevice = false
/* if (width >= 1200 && height >= 700) {
  isLargeDevice = true
}
if (width < 1200 && width >= 950 ) {
  isSmallDevice = true
}
if (width < 949 ) {
  isTinyDevice = true
} */

  if (width > 1368) {
    isLargeDevice = true
  }
  if (width < 1367 && width >= 945) {
    isSmallDevice = true
  }
  if (width < 949 ) {
    isTinyDevice = true
  }

// Add this interface to your existing interfaces
interface MainTable {
  id: number;
  competenceId: number;
  number: number;
  name: string;
  event: string;
  noc: string;
  bib: number;
  j: number;
  i: number;
  h: number;
  g: number;
  f: number;
  e: number;
  d: number;
  c: number;
  b: number;
  a: number;
  dv: number;
  eg: number;
  sb: number;
  nd: number;
  cv: number;
  sv: number;
  e2: number;
  d3: number;
  e3: number;
  delt: number;
  percentage: number;
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
  onSelect?: (id: number) => void;
}

interface Competence {
  id: number;
  folderId: number;
  name: string;
  description: string;
  participants: number;
  type: string; // e.g., "Floor", "Jump", etc.
  gender: boolean; // true for MAG, false for WAG
  date: string;
}

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
  onSelect = () => {}
}) => {
  const router = useRouter();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  
  useEffect(() => {
    // Start animation after delay (for staggered effect)
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

  const handleCompetitionPress = (competitionId: number,gender: boolean,participants:number) => {
    if (selectionMode) {
      onSelect(competitionId);
    } else {
      router.push(`/start-gudging?id=${competitionId}&discipline=${gender}&participants=${participants}&number=0&folderId=${folderId}`);
    }
  };

  return (
    <Animated.View
      style={[
        { 
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        isLargeDevice ? { width: '32.5%' } : null,
        isSmallDevice ? { width: '48%' } : null,
        isTinyDevice ? { width: '100%' } : null,
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
        onPress={() => handleCompetitionPress(id,gender,participants)}
      >
        <View style={styles.folderContent}>
          {gender ? (
            <Image
            source={require("../assets/images/gymnast 1.png")}
            style={styles.folderIcon}
            resizeMode="cover"
          />
          ) : (
            <Image
              source={require("../assets/images/gymnast 2.png")}
              style={styles.folderIcon}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.folderInfo}>
            <Text style={styles.folderTitle}>{title}</Text>
            <Text 
              style={[
                isLargeDevice ? styles.folderDescription : null, 
                isSmallDevice ? styles.folderDescriptionSmall : null, 
                isTinyDevice ? styles.folderDescriptionTiny : null, 
              ]}
            >
              {description}
            </Text>
            <View style={styles.line} />
            <Text style={styles.dateText}>{date}</Text>
            
            <View style={styles.folderFooter}>
              <TouchableOpacity style={styles.entrainementButton}>
                <Text style={styles.entrainementText}>{participants} Gymnasts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.entrainementButton}>
                <Text style={styles.entrainementText}>
                {gender ? "MAG" : "WAG"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {selected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={20} color="#000" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const Folder: React.FC = () => {
  // Get folder ID from the URL
  const params = useLocalSearchParams();
  console.log("params", params);
  const discipline = params.discipline === "true"
  const folderId = params.id ? parseInt(params.id as string) : null;
  console.log("Folder ID:", folderId);
  
  // State for competitions
  const [competitions, setCompetitions] = useState<Competence[]>([]);
  
  // State for modals and UI
  const [menuVisible, setMenuVisible] = useState(false);
  const [addCompetitionModalVisible, setAddCompetitionModalVisible] = useState(false);
  const [editCompetitionModalVisible, setEditCompetitionModalVisible] = useState(false);
  const [feedbackAcceptModel, setFeedbackAcceptModel] = useState(false);
  const [feedbackDeniedModel, setFeedbackDeniedModel] = useState(false);
  const [confirmationModel, setConfirmationModel] = useState(false);
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCompetitions, setSelectedCompetitions] = useState<number[]>([]);
  const [selectionAction, setSelectionAction] = useState<'edit' | 'delete' | null>(null);
  
  // For editing functionality
  const [editingCompetition, setEditingCompetition] = useState<Competence | null | undefined>(null);
  
  // Competition form data
  const [competitionName, setCompetitionName] = useState("");
  const [competitionDescription, setCompetitionDescription] = useState("");
  const [competitionParticipants, setCompetitionParticipants] = useState("");
  const [competitionType, setCompetitionType] = useState("Floor");
  
  const router = useRouter();
  
  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-50)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslate = useRef(new Animated.Value(50)).current;
  const deleteButtonAnim = useRef(new Animated.Value(0)).current;
  
  // Load the custom font
  const [fontsLoaded] = useFonts({
    "Rajdhani-Bold": require("../assets/fonts/Rajdhani/Rajdhani-Bold.ttf"),
    "Rajdhani-medium": require("../assets/fonts/Rajdhani/Rajdhani-Medium.ttf"),
    "Rajdhani-light": require("../assets/fonts/Rajdhani/Rajdhani-Light.ttf"),
  });

  

  // Replace your existing addNewCompetition function with this updated version
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
  
  if (!folderId) {
    Alert.alert("Error", "No folder selected.");
    return;
  }
  
  const competenceData = {
    folderId: folderId,
    name: competitionName,
    description: competitionDescription,
    participants: parseInt(competitionParticipants),
    type: competitionType,
    date: new Date().toISOString(),
    gender: discipline
  };
  
  try {
    // Insert the competition into the database
    await updateFolder(folderId, { filled: true }); // Update the folder to mark it as filled
    const competitionId = await insertCompetence(competenceData);
    
    if (competitionId) {
      // Create Main Table entries for each participant
      await createMainTableEntries(competitionId, parseInt(competitionParticipants));
      
      // Add the new competition to the state
      const newCompetition = {
        id: competitionId,
        ...competenceData,
      };
      
      setCompetitions(prevCompetitions => [...prevCompetitions, newCompetition]);
      
      // Reset form and close modal
      setCompetitionName("");
      setCompetitionDescription("");
      setCompetitionParticipants("");
      setCompetitionType("Floor");
      setAddCompetitionModalVisible(false);
      
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
    for (let i = 1; i <= numberOfParticipants; i++) {
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
        percentage: 0,
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
      };

      const rateGeneralResult = await insertRateGeneral(mainRateGeneralData);
      if (!rateGeneralResult) {
        console.error(`Failed to create MainRateGeneral entry for MainTable ID: ${mainTableId}`);
      }
    }
    console.log(`Successfully created ${numberOfParticipants} main table and rate general entries for competition ID: ${competenceId}`);
  } catch (error) {
    console.error("Error creating main table and rate general entries:", error);
  }
};


  // Fetch competitions in this folder
  const fetchCompetitions = async () => {
    if (!folderId) return;
    
    try {
      const fetchedCompetitions = await getCompetencesByFolderId(folderId);
      setCompetitions(fetchedCompetitions); /* TODO */
    } catch (error) {
      console.error("Error fetching competitions:", error);
      Alert.alert("Error", "Failed to load competitions.");
    }
  };

  useEffect(() => {
    // Fetch competitions when component mounts
    fetchCompetitions();
    
    // Animate UI elements
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
    
    Animated.timing(headerTranslate, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.2)),
    }).start();
    
    // Animate button (with delay)
    setTimeout(() => {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
      
      Animated.timing(buttonTranslate, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }).start();
    }, 1000);
  }, [folderId]);

  // Function to toggle competition selection
  const toggleCompetitionSelection = (id: number) => {
    setSelectedCompetitions(prev => {
      if (prev.includes(id)) {
        return prev.filter(compId => compId !== id);
      } else {
        // For edit mode, only allow selecting one competition
        if (selectionAction === 'edit') {
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
    setAddCompetitionModalVisible(true);
  };

  // Function to handle the Edit option from menu
  const handleEditOption = () => {
    setMenuVisible(false);
    setSelectionMode(true);
    setSelectionAction('edit');
    setSelectedCompetitions([]);
  };

  // Function to handle the Delete option from menu
  const handleDeleteOption = () => {
    setMenuVisible(false);
    setSelectionMode(true);
    setSelectionAction('delete');
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

  // Function to actually delete the selected competitions
const performDelete = async () => {
  try {
    // Delete each selected competition and its related data
    for (const competitionId of selectedCompetitions) {
      // Fetch main tables associated with the competition
      const mainTables = await getMainTablesByCompetenceId(competitionId);

      for (const mainTable of mainTables) {
        // Delete rateGeneral entries associated with the main table
        await deleteRateGeneralByTableId(mainTable.id);
      }

      // Delete main tables associated with the competition
      await deleteMainTableByCompetenceId(competitionId);

      // Finally, delete the competition
      await deleteCompetence(competitionId);
    }

    // Update the competitions state to remove deleted competitions
    setCompetitions(prevCompetitions =>
      prevCompetitions.filter(comp => !selectedCompetitions.includes(comp.id))
    );

    setConfirmationModel(false);
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedCompetitions([]);

    // Show success feedback
    setFeedbackAcceptModel(true);
    setTimeout(() => {
      setFeedbackAcceptModel(false);
    }, 1500);
  } catch (error) {
    console.error("Error deleting competitions and related data:", error);
    Alert.alert("Error", "Failed to delete competitions and related data.");
  }
};

  // Function to handle edit confirmation
  const handleEditConfirm = () => {
    if (selectedCompetitions.length === 1) {
      const competitionToEdit = competitions.find(comp => comp.id === selectedCompetitions[0]);
      if (competitionToEdit) {
        setEditingCompetition(competitionToEdit);
        setCompetitionName(competitionToEdit.name);
        setCompetitionDescription(competitionToEdit.description);
        setCompetitionParticipants(competitionToEdit.participants.toString());
        setCompetitionType(competitionToEdit.type);
        setEditCompetitionModalVisible(true);
      }
    }
  };

  // Function to save edited competition
  const saveEditedCompetition = async (id: number) => {
    if (!editingCompetition) return;
    
    if (competitionName.trim() === "" || competitionDescription.trim() === "") {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    
    if (!competitionParticipants || isNaN(parseInt(competitionParticipants))) {
      Alert.alert("Error", "Please enter a valid number of participants.");
      return;
    }
    
    const updatedCompetition = {
      ...editingCompetition,
      name: competitionName,
      description: competitionDescription,
      participants: parseInt(competitionParticipants),
      type: competitionType,
    };

    try {
      const result = await updateCompetence(id,updatedCompetition);

      /* count number of main table related to that competition an if th participants are less delete main table 
      with the competence id from 1 increasing up to the number of participants TODO */
      if (result) {
        // Update the competitions state with the edited competition
        setCompetitions(prevCompetitions => 
          prevCompetitions.map(comp => 
            comp.id === editingCompetition.id ? updatedCompetition : comp
          )
        );
        
        setEditCompetitionModalVisible(false);
        setSelectionMode(false);
        setSelectionAction(null);
        setSelectedCompetitions([]);
        setEditingCompetition(null);
        
        // Show success feedback
        setFeedbackAcceptModel(true);
        setTimeout(() => {
          setFeedbackAcceptModel(false);
        }, 1500);
      } else {
        Alert.alert("Error", "Failed to update competition.");
      }
    } catch (error) {
      console.error("Error updating competition:", error);
      Alert.alert("Error", "Failed to update competition.");
    }
  };

  console.log("Competitions:", competitions);

  const goBack = (discipline:Boolean) => {
    router.push(`/main-menu?discipline=${discipline}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with Animation */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }]
          }
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => goBack(discipline)}>
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.headerTitle}>Main Menu</Text>
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
      
      {/* Competitions Grid with Staggered Animation */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.foldersGrid}>
          {competitions.map((competition, index) => (
            <CompetitionItem
              key={competition.id}
              id={competition.id}
              title={competition.name}
              description={competition.description}
              date={new Date(competition.date).toLocaleDateString()}
              type={competition.type}
              participants={competition.participants}
              folderType={competition.type === "Floor" ? 1 : 2}
              selected={selectedCompetitions.includes(competition.id)}
              animationDelay={index * 100}
              gender={competition.gender ? true : false}
              selectionMode={selectionMode}
              onSelect={toggleCompetitionSelection}
              folderId={folderId} // Pass the folderId to the CompetitionItem
            />
          ))}
        </View>
      </ScrollView>
      
      {/* Add/Edit/Delete Buttons with Animation */}
      <Animated.View 
        style={[
          styles.buttonContainer,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslate }]
          }
        ]}
      >
        {!selectionMode ? (
          <TouchableOpacity 
            style={isLargeScreen ? styles.addButton : styles.addButtonSmall} 
            onPress={() => setAddCompetitionModalVisible(true)}
          >
            <Text style={isLargeScreen ? styles.addButtonText : styles.addButtonTextTiny}>
              Add Competition
            </Text>
          </TouchableOpacity>
        ) : selectionAction === 'edit' && selectedCompetitions.length === 1 ? (
          <TouchableOpacity 
            style={isLargeScreen ? styles.editConfirmButton : styles.editConfirmButtonSmall} 
            onPress={handleEditConfirm}
          >
            <Text style={isLargeScreen ? styles.editConfirmButtonText : styles.editConfirmButtonTextSmall}>
              Edit Selected
            </Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      {/* Delete Confirmation Button (appears when in delete mode) */}
      {selectionMode && selectionAction === 'delete' && selectedCompetitions.length > 0 && (
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
            <Text style={isLargeScreen ? styles.addFolderTitle : styles.addFolderTitleSmall}>
              Add Competition
            </Text>

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
                <Text style={isLargeScreen ? styles.confirmButtonText : styles.confirmButtonTextSmall}>
                  Confirm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={isLargeScreen ? styles.cancelButton : styles.cancelButtonSmall}
                onPress={() => setAddCompetitionModalVisible(false)}
              >
                <Text style={isLargeScreen ? styles.cancelButtonText : styles.cancelButtonTextSmall}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Edit Competition Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editCompetitionModalVisible}
        onRequestClose={() => setEditCompetitionModalVisible(false)}
      >
        <View style={styles.addModalOverlay}>
          <View 
            style={[
              isLargeDevice ? styles.addFolderModal2 : null, 
              isSmallDevice ? styles.addFolderModal2Small : null, 
              isTinyDevice ? styles.addFolderModal2Tiny : null, 
            ]}
          >
            <Text style={isLargeScreen ? styles.addFolderTitle : styles.addFolderTitleSmall}>
              Edit Competition
            </Text>

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
              multiline
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
                onPress={() => saveEditedCompetition(editingCompetition?.id)} // Pass the id here FIX
              >
                <Text style={isLargeScreen ? styles.confirmButtonText : styles.confirmButtonTextSmall}>
                  Save
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={isLargeScreen ? styles.cancelButton : styles.cancelButtonSmall}
                onPress={() => setEditCompetitionModalVisible(false)}
              >
                <Text style={isLargeScreen ? styles.cancelButtonText : styles.cancelButtonTextSmall}>
                  Cancel
                </Text>
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
          <View style={styles.addFolderModal}>
            <Text style={styles.addFolderTitle}>
              Delete {selectedCompetitions.length} competition{selectedCompetitions.length > 1 ? 's' : ''}?
            </Text>
            
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={performDelete}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setConfirmationModel(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
{/* Feedback Modal */}
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
</SafeAreaView>
);
};

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
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#fff',
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
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'flex-start',

  },
  folderItem: {
    width: '97%', // The width is controlled by the parent Animated.View
    height: 200,
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
    position: 'relative',
  },
  folderItemSmall: {
    width: '97%', // The width is controlled by the parent Animated.View
    height: 200,
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
    position: 'relative',
  },
  folderItemTiny: {
    width:'97%',
    height: 220,
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
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
    alignItems: 'center',
  },
  folderIcon: {
    width: 120,
    height: 120,
    borderRadius: 5,
    marginBottom: 6,
    position: 'absolute',
    top: 30,
    left: 10,
  },
  folderType1: {
    height: 50,
    borderRadius: 5,
  },
  folderType2: {
    height: 50,
    borderRadius: 5,
  },
  folderTab: {
    position: 'absolute',
    top: 0,
    left: 15,
    width: 30,
    height: 6,
    backgroundColor: '#4285F4',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  folderInfo: {
    width: '70%',
    height: 135,
    right: 5,
    position: 'absolute',
  },
  folderTitle: {
    fontSize: 40,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  folderDescription: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    width: '90%',
    alignSelf: 'center',
    marginVertical: 10,
  },
  folderDescriptionSmall: {
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    width: '80%',
    alignSelf: 'center',
    marginVertical: 10,
  },
  folderDescriptionTiny: {
    fontSize: 18,
    textAlign: 'center',
    width: '80%',
    alignSelf: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 10,
  },
  folderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  entrainementButton: {
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
  entrainementText: {
    fontSize: 18,
    bottom: 2,
    position: 'relative',
    alignSelf: 'center',
    color: '#333',
  },
  line: {
    height: 1, // Thickness of the line
    backgroundColor: "#333", // Line color
    width: "90%", // Full width of the container
    marginBottom: 10, // Space below the line
    alignSelf: "center", // Center the line horizontally
  },
  dateText: {
    fontSize: 25,
    color: '#333',
    fontWeight: 'light',
    fontFamily: 'Rajdhani-light',
    alignSelf: 'center',
    marginBottom: 7,
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
  },
  buttonContainer: {
    padding: 16,
  },
  addButton: {
    backgroundColor: '#0047AB',
    borderRadius: 12,
    padding: 12,
    width: '30%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addButtonSmall: {
    backgroundColor: '#0047AB',
    borderRadius: 12,
    padding: 12,
    width: '30%',
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 30,
  },
  addButtonTextTiny: {
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

  // Add Folder Modal Styles
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFolderModal: {
    backgroundColor: '#fff',
    width: '80%',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addFolderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Add folder title - small screen
  addFolderTitleSmall: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Rajdhani-medium',
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


  folderInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    width: '45%',
  },
  optionText: {
    fontSize: 14,
    textAlign: 'center',
    color: "#333", // Default text color
  },
  selectedOptionButton: {
    borderColor: "rgb(0, 0, 0)", // Highlighted border color
    backgroundColor: "rgb(224, 224, 224)", // Highlighted background color
  },
  selectedOptionText: {
    color: "#4285F4", // Highlighted text color
  },
  optionLabel: {
    fontSize: 14,
    width: '45%',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Confirm button - large screen
  confirmButton: {
    backgroundColor: '#0047AB',
    borderRadius: 10,
    padding: 12,
    width: '40%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2.5 },
    shadowOpacity: 0.55,
    shadowRadius: 3.84,
    elevation: 5,
    marginRight: 50,
    alignItems: 'center',
  },
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

export default Folder;