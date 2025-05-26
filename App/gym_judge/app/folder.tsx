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
        isMediumLargeDevice ? { width: '48%' } : null,
        isSmallDevice ? { width: '48%' } : null,
        isTinyDevice ? { width: '100%' } : null,
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
        onPress={() => handleCompetitionPress(id,gender,participants)}
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
            <Text style={[
              isLargeDevice ? styles.dateTextLarge : null,
              isMediumLargeDevice ? styles.dateTextMediumLarge : null,
              isSmallDevice ? styles.dateTextSmall : null,
              isTinyDevice ? styles.dateTextTiny : null,
            ]}>{date}</Text>
            
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
  <SafeAreaView style={[
    isLargeDevice ? styles.containerLarge : null,
    isMediumLargeDevice ? styles.containerMediumLarge : null,
    isSmallDevice ? styles.containerSmall : null,
    isTinyDevice ? styles.containerTiny : null,
  ]}>
    <StatusBar barStyle="dark-content" />
    
    {/* Header with Animation */}
    <Animated.View 
      style={[
        isLargeDevice ? styles.headerLarge : null,
        isMediumLargeDevice ? styles.headerMediumLarge : null,
        isSmallDevice ? styles.headerSmall : null,
        isTinyDevice ? styles.headerTiny : null,
        {
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }]
        }
      ]}
    >
      <TouchableOpacity style={[
        isLargeDevice ? styles.backButtonLarge : null,
        isMediumLargeDevice ? styles.backButtonMediumLarge : null,
        isSmallDevice ? styles.backButtonSmall : null,
        isTinyDevice ? styles.backButtonTiny : null,
      ]} onPress={() => goBack(discipline)}>
        <Ionicons name="arrow-back" size={24} color="#000" />
        <Text style={[
          isLargeDevice ? styles.headerTitleLarge : null,
          isMediumLargeDevice ? styles.headerTitleMediumLarge : null,
          isSmallDevice ? styles.headerTitleSmall : null,
          isTinyDevice ? styles.headerTitleTiny : null,
        ]}>Main Menu</Text>
      </TouchableOpacity>
      
      {selectionMode ? (
        <TouchableOpacity onPress={cancelSelectionMode}>
          <Text style={[
            isLargeDevice ? styles.cancelSelectionTextLarge : null,
            isMediumLargeDevice ? styles.cancelSelectionTextMediumLarge : null,
            isSmallDevice ? styles.cancelSelectionTextSmall : null,
            isTinyDevice ? styles.cancelSelectionTextTiny : null,
          ]}>Cancel</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Ionicons name="menu" size={28} color="#000" />
        </TouchableOpacity>
      )}
    </Animated.View>
    
    {/* Competitions Grid with Staggered Animation */}
    <ScrollView style={[
      isLargeDevice ? styles.scrollViewLarge : null,
      isMediumLargeDevice ? styles.scrollViewMediumLarge : null,
      isSmallDevice ? styles.scrollViewSmall : null,
      isTinyDevice ? styles.scrollViewTiny : null,
    ]}>
      <View style={[
        isLargeDevice ? styles.foldersGridLarge : null,
        isMediumLargeDevice ? styles.foldersGridMediumLarge : null,
        isSmallDevice ? styles.foldersGridSmall : null,
        isTinyDevice ? styles.foldersGridTiny : null,
      ]}>
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
        isLargeDevice ? styles.buttonContainerLarge : null,
        isMediumLargeDevice ? styles.buttonContainerMediumLarge : null,
        isSmallDevice ? styles.buttonContainerSmall : null,
        isTinyDevice ? styles.buttonContainerTiny : null,
        {
          opacity: buttonOpacity,
          transform: [{ translateY: buttonTranslate }]
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
          ]} 
          onPress={() => setAddCompetitionModalVisible(true)}
        >
          <Text style={[
            isLargeDevice ? styles.addButtonTextLarge : null,
            isMediumLargeDevice ? styles.addButtonTextMediumLarge : null,
            isSmallDevice ? styles.addButtonTextSmall : null,
            isTinyDevice ? styles.addButtonTextTiny : null,
          ]}>
            Add Competition
          </Text>
        </TouchableOpacity>
      ) : selectionAction === 'edit' && selectedCompetitions.length === 1 ? (
        <TouchableOpacity 
          style={[
            isLargeDevice ? styles.editConfirmButtonLarge : null,
            isMediumLargeDevice ? styles.editConfirmButtonMediumLarge : null,
            isSmallDevice ? styles.editConfirmButtonSmall : null,
            isTinyDevice ? styles.editConfirmButtonTiny : null,
          ]} 
          onPress={handleEditConfirm}
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
      ) : null}
    </Animated.View>

    {/* Delete Confirmation Button (appears when in delete mode) */}
    {selectionMode && selectionAction === 'delete' && selectedCompetitions.length > 0 && (
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
          ]} 
          onPress={confirmDelete}
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
            Add Competition
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
              ]}
              onPress={addNewCompetition}
            >
              <Text style={[
                isLargeDevice ? styles.confirmButtonTextLarge : null,
                isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
                isSmallDevice ? styles.confirmButtonTextSmall : null,
                isTinyDevice ? styles.confirmButtonTextTiny : null,
              ]}>
                Confirm
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.cancelButtonLarge : null,
                isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
                isSmallDevice ? styles.cancelButtonSmall : null,
                isTinyDevice ? styles.cancelButtonTiny : null,
              ]}
              onPress={() => setAddCompetitionModalVisible(false)}
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
    
    {/* Edit Competition Modal */}
    <Modal
      animationType="fade"
      transparent={true}
      visible={editCompetitionModalVisible}
      onRequestClose={() => setEditCompetitionModalVisible(false)}
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
            multiline
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
              ]}
              onPress={() => saveEditedCompetition(editingCompetition?.id)} // Pass the id here FIX
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
              ]}
              onPress={() => setEditCompetitionModalVisible(false)}
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
    
    {/* Delete Confirmation Modal */}
    <Modal
      animationType="fade"
      transparent={true}
      visible={confirmationModel}
      onRequestClose={() => setConfirmationModel(false)}
    >
      <View style={[
        isLargeDevice ? styles.addModalOverlayLarge : null,
        isMediumLargeDevice ? styles.addModalOverlayMediumLarge : null,
        isSmallDevice ? styles.addModalOverlaySmall : null,
        isTinyDevice ? styles.addModalOverlayTiny : null,
      ]}>
        <View style={[
          isLargeDevice ? styles.addFolderModalLarge : null,
          isMediumLargeDevice ? styles.addFolderModalMediumLarge : null,
          isSmallDevice ? styles.addFolderModalSmall : null,
          isTinyDevice ? styles.addFolderModalTiny : null,
        ]}>
          <Text style={[
            isLargeDevice ? styles.addFolderTitleLarge : null,
            isMediumLargeDevice ? styles.addFolderTitleMediumLarge : null,
            isSmallDevice ? styles.addFolderTitleSmall : null,
            isTinyDevice ? styles.addFolderTitleTiny : null,
          ]}>
            Delete {selectedCompetitions.length} competition{selectedCompetitions.length > 1 ? 's' : ''}?
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
              ]}
              onPress={performDelete}
            >
              <Text style={[
                isLargeDevice ? styles.confirmButtonTextLarge : null,
                isMediumLargeDevice ? styles.confirmButtonTextMediumLarge : null,
                isSmallDevice ? styles.confirmButtonTextSmall : null,
                isTinyDevice ? styles.confirmButtonTextTiny : null,
              ]}>Confirm</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                isLargeDevice ? styles.cancelButtonLarge : null,
                isMediumLargeDevice ? styles.cancelButtonMediumLarge : null,
                isSmallDevice ? styles.cancelButtonSmall : null,
                isTinyDevice ? styles.cancelButtonTiny : null,
              ]}
              onPress={() => setConfirmationModel(false)}
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
    
    {/* Feedback Modal */}
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
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  // Container styles - Large Device (width >= 1368)
  containerLarge: {
    flex: 1,
    backgroundColor: '#E6F0F7',
  },
  // Container styles - Medium Large Device (width >= 1200 && width < 1368)
  containerMediumLarge: {
    flex: 1,
    backgroundColor: '#E6F0F7',
  },
  // Container styles - Small Device (width >= 945 && width < 1200)
  containerSmall: {
    flex: 1,
    backgroundColor: '#E6F0F7',
  },
  // Container styles - Tiny Device (width < 945)
  containerTiny: {
    flex: 1,
    backgroundColor: '#E6F0F7',
  },
  
  // Header styles - Large Device
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
  // Header styles - Medium Large Device
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
  // Header styles - Small Device
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
  // Header styles - Tiny Device
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
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#fff',
  },
  // Header title styles - Medium Large Device
  headerTitleMediumLarge: {
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 7,
    color: '#fff',
  },
  // Header title styles - Small Device
  headerTitleSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
    color: '#fff',
  },
  // Header title styles - Tiny Device
  headerTitleTiny: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#fff',
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
  
  // Folder item styles - Large Device
  folderItemLarge: {
    width: '97%',
    height: 200,
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
    position: 'relative',
  },
  // Folder item styles - Medium Large Device
  folderItemMediumLarge: {
    width: '98%',
    height: 250,
    backgroundColor: '#F1F3F5',
    borderRadius: 9,
    padding: 7,
    marginBottom: 11,
    marginLeft: 25,
    position: 'relative',
  },
  // Folder item styles - Small Device
  folderItemSmall: {
    width: '97%',
    height: 180,
    backgroundColor: '#F1F3F5',
    borderRadius: 8,
    padding: 6,
    marginBottom: 10,
    position: 'relative',
  },
  // Folder item styles - Tiny Device
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
  
  // Folder icon styles - Large Device
  folderIconLarge: {
    width: 120,
    height: 120,
    borderRadius: 5,
    marginBottom: 6,
    position: 'absolute',
    top: 30,
    left: 10,
  },
  // Folder icon styles - Medium Large Device
  folderIconMediumLarge: {
    width: 140,
    height: 140,
    borderRadius: 5,
    marginBottom: 5,
    position: 'absolute',
    top: 40,
    left: 20,
  },
  // Folder icon styles - Small Device
  folderIconSmall: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginBottom: 4,
    position: 'absolute',
    top: 20,
    left: 8,
  },
  // Folder icon styles - Tiny Device
  folderIconTiny: {
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
    width: '70%',
    height: 135,
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
    fontSize: 22,
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
    fontSize: 40,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
  },
  
  // Folder description styles - Large Device
  folderDescriptionLarge: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    width: '90%',
    alignSelf: 'center',
    marginVertical: 10,
  },
  // Folder description styles - Medium Large Device
  folderDescriptionMediumLarge: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    width: '95%',
    alignSelf: 'center',
    marginVertical: 9,
  },
  // Folder description styles - Small Device
  folderDescriptionSmall: {
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'Rajdhani-medium',
    width: '85%',
    alignSelf: 'center',
    marginVertical: 8,
  },
  // Folder description styles - Tiny Device
  folderDescriptionTiny: {
    fontSize: 18,
    textAlign: 'center',
    width: '80%',
    alignSelf: 'center',
    fontFamily: 'Rajdhani-medium',
    marginVertical: 10,
  },
  
  // Folder footer styles - Large Device
  folderFooterLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  // Folder footer styles - Medium Large Device
  folderFooterMediumLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    position: 'relative',
    bottom: 0,
  },
  // Folder footer styles - Small Device
  folderFooterSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  // Folder footer styles - Tiny Device
  folderFooterTiny: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
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
    width: 125,
    height: 28,
    paddingVertical: 2,
  },
  // Entrainement button styles - Small Device
  entrainementButtonSmall: {
    backgroundColor: '#DADADA',
    borderRadius: 10,
    paddingHorizontal: 3,
    borderBlockColor: '#999',
    borderWidth: 2,
    borderColor: '#999',
    width: 110,
    height: 26,
    paddingVertical: 1,
  },
  // Entrainement button styles - Tiny Device
  entrainementButtonTiny: {
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
    fontSize: 10,
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
    fontSize: 18,
    bottom: 2,
    position: 'relative',
    alignSelf: 'center',
    color: '#333',
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
  
  // Date text styles - Large Device
  dateTextLarge: {
    fontSize: 25,
    color: '#333',
    fontWeight: 'light',
    fontFamily: 'Rajdhani-light',
    alignSelf: 'center',
    marginBottom: 7,
  },
  // Date text styles - Medium Large Device
  dateTextMediumLarge: {
    fontSize: 19,
    color: '#333',
    fontWeight: 'light',
    fontFamily: 'Rajdhani-light',
    alignSelf: 'center',
    marginBottom: 6,
  },
  // Date text styles - Small Device
  dateTextSmall: {
    fontSize: 21,
    color: '#333',
    fontWeight: 'light',
    fontFamily: 'Rajdhani-light',
    alignSelf: 'center',
    marginBottom: 5,
  },
  // Date text styles - Tiny Device
  dateTextTiny: {
    fontSize: 25,
    color: '#333',
    fontWeight: 'light',
    fontFamily: 'Rajdhani-light',
    alignSelf: 'center',
    marginBottom: 7,
  },
  
  // Checkmark styles - Large Device
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
    borderRadius: 12,
    padding: 12,
    width: '30%',
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
    fontSize: 23,
  },
  // Add button text styles - Small Device
  addButtonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Add button text styles - Tiny Device
  addButtonTextTiny: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  
  // Continue with all other styles following the same pattern...
  // I'll include the most important ones to complete the structure
  
  // Modal overlay styles for all devices
  modalOverlayLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  modalOverlayMediumLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  modalOverlaySmall: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  modalOverlayTiny: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  
  // Menu modal styles - Large Device
  menuModalLarge: {
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
  // Menu modal styles - Medium Large Device
  menuModalMediumLarge: {
    backgroundColor: '#999',
    width: 160,
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
    width: 140,
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
  
  // Menu divider styles for all devices
  menuDividerLarge: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuDividerMediumLarge: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuDividerSmall: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuDividerTiny: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // Add modal overlay styles for all devices
  addModalOverlayLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalOverlayMediumLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalOverlaySmall: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalOverlayTiny: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Add folder modal 2 styles - Large Device
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
  // Add folder modal 2 styles - Medium Large Device
  addFolderModal2MediumLarge: {
    backgroundColor: '#fff',
    width: '60%',
    height: 365,
    maxHeight: '80%',
    borderRadius: 9,
    padding: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add folder modal 2 styles - Small Device
  addFolderModal2Small: {
    backgroundColor: '#fff',
    width: '70%',
    height: 315,
    maxHeight: '85%',
    borderRadius: 8,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add folder modal 2 styles - Tiny Device
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
  
  // Add folder modal styles - Large Device
  addFolderModalLarge: {
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
  // Add folder modal styles - Medium Large Device
  addFolderModalMediumLarge: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 9,
    padding: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add folder modal styles - Small Device
  addFolderModalSmall: {
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 8,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Add folder modal styles - Tiny Device
  addFolderModalTiny: {
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
  
  // Add folder title styles - Large Device
  addFolderTitleLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Add folder title styles - Medium Large Device
  addFolderTitleMediumLarge: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 18,
  },
  // Add folder title styles - Small Device
  addFolderTitleSmall: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Rajdhani-medium',
  },
  // Add folder title styles - Tiny Device
  addFolderTitleTiny: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Rajdhani-medium',
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
    height: 290,
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
    width: 200,
    height: 200,
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
  
  // Folder input styles - Large Device
  folderInputLarge: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 14,
  },
  // Folder input styles - Medium Large Device
  folderInputMediumLarge: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 9,
    marginBottom: 14,
    fontSize: 14,
  },
  // Folder input styles - Small Device
  folderInputSmall: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    marginBottom: 12,
    fontSize: 13,
  },
  // Folder input styles - Tiny Device
  folderInputTiny: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 14,
  },
  
  // Buttons container styles - Large Device
  buttonsContainerLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Buttons container styles - Medium Large Device
  buttonsContainerMediumLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Buttons container styles - Small Device
  buttonsContainerSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Buttons container styles - Tiny Device
  buttonsContainerTiny: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  // Confirm button styles - Large Device
  confirmButtonLarge: {
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
  // Confirm button styles - Medium Large Device
  confirmButtonMediumLarge: {
    backgroundColor: '#0047AB',
    borderRadius: 9,
    padding: 11,
    width: '40%',
    shadowColor: '#000',
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
    marginRight: 30,
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
    fontSize: 20,
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
    marginLeft: 30,
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
    fontSize: 20,
  },
  // Cancel button text styles - Tiny Device
  cancelButtonTextTiny: {
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
    padding: 8,
    width: '50%',
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
    fontSize: 20,
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
  }
});

export default Folder;