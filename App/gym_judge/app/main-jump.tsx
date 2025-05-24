import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import SimplifiedNumberPad from "@/components/CustomNumberPad";
import {
  getCompetenceById,
  getMainTableById,
  getMainTablesByCompetenceId,
  getRateGeneralByTableId,
  updateMainTable,
  updateRateGeneral,
} from "../Database/database";
import ModalvaultMag from "../components/ModalVaultMag";
import ModalvaultWag from "../components/ModalVaultWag";
import WhiteboardScreen from "../components/WhiteboardScreen_jump";

const { width, height } = Dimensions.get("window");
const isLargeScreen = width >= 1000 && height >= 700;
var isLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;
if (width >= 1368 && height >= 1025) {
  isLargeDevice = true;
}
if (width < 1367 && width >= 945) {
  isSmallDevice = true;
}
if (width < 949) {
  isTinyDevice = true;
}

interface MainRateGeneral {
  id: number;
  tableId: number;
  stickBonus: boolean;
  numberOfElements: number;
  difficultyValues: number;
  elementGroups1: number;
  elementGroups2: number;
  elementGroups3: number;
  elementGroups4: number;
  elementGroups5: number;
  execution: number;
  eScore: number;
  myScore: number;
  compD: number;
  compE: number;
  compSd: number;
  compNd: number;
  compScore: number;
  comments: string;
  paths: string;
  ded: number;
  dedexecution: number;
  vaultNumber: string;
  vaultDescription: string;
}

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

interface Competence {
  id: number;
  name: string;
  description: string;
  date: string; // ISO date string
  type: string; // "Floor", "Jump", etc.
  gender: boolean; // mag and wag
  sessionId: number;
  folderId: number;
  userId: number;
  numberOfParticipants: number;
}

interface VaultScoreDisplayProps {
  onBack: () => void;
  onFilter: () => void;
  onNext: () => void;
  vaultData?: {
    score: number;
    vaultNumbers: string;
    sv: number;
    nd: number;
    sb: number;
    execution: number;
    myScore: number;
    compDeduction: {
      d: number;
      e: number;
      sd: string;
      nd: string;
      score: number;
    };
    neutral: {
      overtime: number;
      line: number;
      other: number;
      total: number;
    };
    startValue: number;
    description: string;
    comments: string;
  };
}

const VaultScoreDisplay: React.FC<VaultScoreDisplayProps> = ({
  onBack,
  onFilter,
  onNext,
  vaultData = {
    score: 100,
    vaultNumbers: "100",
    sv: 2.0,
    nd: 0.0,
    sb: 0.0,
    execution: 0.0,
    myScore: 10.0,
    compDeduction: {
      d: 0.0,
      e: 0.0,
      sd: "##",
      nd: "##",
      score: 0.0,
    },
    neutral: {
      overtime: 0,
      line: 0,
      other: 0,
      total: 1,
    },
    startValue: 0,
    description: "No vault assigned",
    comments: "",
  },
}) => {
  /* Declare params */
  const params = useLocalSearchParams();
  const discipline = params.discipline === "true";
  const participants = params.participants;
  const event = params.event;
  const competenceId = params.competenceId;
  const number = params.number;
  const gymnastid = params.gymnast ? Number(params.gymnast) : 0;
  const folderId = params.folderId;

  const router = useRouter();

  /* Keyboard usestates */
const [isCustomKeyboardVisible, setIsCustomKeyboardVisible] = useState(false);
const [ndInputValue, setNdInputValue] = useState("0.0");

  /* Define usestate */
  const [showNdModal, setShowNdModal] = useState(false);
  const [ndInput, setNdInput] = useState("");
  const ndInputRef = useRef<any>(null);
  const [nd, setNd] = useState(0);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsInput, setCommentsInput] = useState("");
  const commentsInputRef = useRef<any>(null);

  const backButtonOpacity = useRef(new Animated.Value(0)).current;
  const backButtonTranslateX = useRef(new Animated.Value(50)).current;
  const executionInputRef = useRef<any>(null);

  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [execution, setExecution] = useState(0);
  const [executionInput, setExecutionInput] = useState("");

  const [showDModal, setShowDModal] = useState(false);
  const [dInput, setDInput] = useState("");
  const dInputRef = useRef<any>(null);
  const [d, setD] = useState(0);

  const [showEModal, setShowEModal] = useState(false);
  const [eInput, setEInput] = useState("");
  const eInputRef = useRef<any>(null);
  const [e, setE] = useState(0);

  const [showNdModalcomp, setShowNdModalcomp] = useState(false);
  const ndInputRefcomp = useRef<any>(null);
  const [ndInputcomp, setNdInputcomp] = useState("");

  // Track the total elements
  const [totalElements, setTotalElements] = useState(0);
  const [rateid, setRateId] = useState(0);
  const [stickbonus, setStickBonus] = useState(false);
  const [difficultyValues, setDifficultyValues] = useState(0);
  const [gymnastName, setGymnastName] = useState("");
  const [gymnastNoc, setGymnastNoc] = useState("");
  const [gymnastBib, setGymnastBib] = useState(0);
  const [gymnastEvent, setGymnastEvent] = useState("");
  const [elementGroupsTotal, setElementGroupsTotal] = useState(0);
  const [cv, setCv] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [sv, setSv] = useState(0);

  const [eScore, setEScore] = useState(0);
  const [score, setScore] = useState(0);
  const [sb, setSb] = useState(true);
  const [ndcomp, setndcomp] = useState(0);
  const [showNdCompModal, setShowNdCompModal] = useState(false);
  const [comments, setComments] = useState("");
  const [delt, setDelt] = useState(0);
  const [ded, setSetded] = useState(0);
  const [percentage, setpercentage] = useState(0);

  /* DEFINE MODALS */
  const [showmodalmag, setShowModalMag] = useState(false);
  const [showmodalwag, setShowModalWag] = useState(false);
  const [vaultnumber, setVaultNumber] = useState("0");
  const [startValue, setStartValue] = useState(0);
  const [vaultDescription, setVaultDescription] = useState("No Vault Assigned");
  const [gender, setGender] = useState(false);

  /* Useffect */
  useEffect(() => {
    const fetchMainRateGeneral = async () => {
      try {
        const mainRateGeneral = await getMainTableById(gymnastid); // Fetch data by gymnastid
        console.log("MainGeneral data:", mainRateGeneral); // Debugging line
        /* getting rate table with the mainrategeneral id */

        const competence = await getCompetenceById(Number(competenceId));
        console.log("Competence data:", competence); // Debugging line

        if (competence) {
          setGender(competence.gender);
        }
        if (mainRateGeneral) {
          const mainRateGeneralId = mainRateGeneral.id;
          const rateTable = await getRateGeneralByTableId(mainRateGeneralId);
          console.log("Rate Table data:", rateTable); // Debugging line

          setGymnastEvent(mainRateGeneral.event);
          setCv(mainRateGeneral.cv);
          setNd(mainRateGeneral.nd);
          setDelt(mainRateGeneral.delt);
          setpercentage(mainRateGeneral.percentage);

          setGymnastName(mainRateGeneral.name);
          setGymnastNoc(mainRateGeneral.noc);
          setGymnastBib(mainRateGeneral.bib);
          setSv(mainRateGeneral.sv);
          setStartValue(mainRateGeneral.sv);
          setNd(mainRateGeneral.nd);

          if (rateTable) {
            setVaultNumber(rateTable.vaultNumber);
            setVaultDescription(rateTable.vaultDescription);
            setRateId(rateTable.id);
            setStickBonus(rateTable.stickBonus);
            setCommentsInput(rateTable.comments);
            setComments(rateTable.comments);
            setExecution(rateTable.execution);
            setEScore(rateTable.eScore);
            setMyScore(rateTable.myScore);
            setD(rateTable.compD);
            setScore(rateTable.compScore);
            setE(rateTable.compE);
            setSb(rateTable.compSd === 0.1);
            setndcomp(rateTable.compNd);
            setSetded(rateTable.ded);

            /* setTotalElements(rateTable.numberOfElements);
            setDifficultyValues(rateTable.difficultyValues);
            setElementGroupsTotal(rateTable.elementGroups5);
            
            setElementGroupValues({
              I: rateTable.elementGroups1 || 0.0,
              II: rateTable.elementGroups2 || 0.0,
              III: rateTable.elementGroups3 || 0.0,
              IV: rateTable.elementGroups4 || 0.0,
            }); */
          }
        }
      } catch (error) {
        console.error("Error fetching MainRateGeneral data:", error);
      }
    };

    fetchMainRateGeneral();
  }, [gymnastid]); // Re-fetch data when gymnastid changes

// Modificar el useEffect para mostrar el teclado personalizado
useEffect(() => {
  if (showNdModal) {
    setIsCustomKeyboardVisible(true);
    // Solo enfoca si es necesario para mostrar el cursor, pero sin activar el teclado
    if (ndInputRef.current) {
      setTimeout(() => {
        if (Platform.OS === 'ios') {
          ndInputRef.current?.focus();
        }
      }, 100);
    }
  }
}, [showNdModal]);

  useEffect(() => {
    if (showNdModalcomp && ndInputRefcomp.current) {
      if (Platform.OS === "web") {
        const input = ndInputRefcomp.current;
        if (input && input.focus) {
          input.focus();
          setTimeout(() => {
            if (input.setSelectionRange) {
              input.setSelectionRange(0, input.value.length);
            }
          }, 10);
        }
      } else {
        ndInputRefcomp.current.focus();
      }
    }
  }, [showNdModalcomp]);

  useEffect(() => {
  if (showDModal) {
    setIsCustomKeyboardVisible(true);
    if (dInputRef.current) {
      setTimeout(() => {
        if (Platform.OS === 'ios') {
          dInputRef.current?.blur();
          dInputRef.current?.focus();
        }
      }, 100);
    }
  } else {
    setIsCustomKeyboardVisible(false);
  }
}, [showDModal]);

useEffect(() => {
  if (showEModal) {
    setIsCustomKeyboardVisible(true);
    if (eInputRef.current) {
      setTimeout(() => {
        if (Platform.OS === 'ios') {
          eInputRef.current?.blur();
          eInputRef.current?.focus();
        }
      }, 100);
    }
  } else {
    setIsCustomKeyboardVisible(false);
  }
}, [showEModal]);

useEffect(() => {
  if (showExecutionModal) {
    setIsCustomKeyboardVisible(true);
    if (executionInputRef.current) {
      setTimeout(() => {
        if (Platform.OS === 'ios') {
          executionInputRef.current?.blur();
          executionInputRef.current?.focus();
        }
      }, 100);
    }
  } else {
    setIsCustomKeyboardVisible(false);
  }
}, [showExecutionModal]);

  /* Buttons un the bottom */

  const handleSelect = () => {
    router.push(
      `/final-table?competenceId=${competenceId}&gymnastId=${discipline}&event=${event}&discipline=${discipline}&gymnast=${gymnastid}&number=${number}&participants=${participants}&folderId=${folderId}`
    );
  };

  const handlegobacklist = () => {
    router.push(
      `/start-gudging?id=${competenceId}&discipline=${discipline}&participants=${participants}&number=${number}&gymnast=${gymnastid}&folderId=${folderId}`
    ); // Pass the value as a query parameter
  };

  const handleGoForward = async () => {
    try {
      // Fetch all MainTable entries for the current competenceId

      if (number === participants) {
        router.push(
          `/final-table?competenceId=${competenceId}&gymnastId=${discipline}&event=${event}&discipline=${discipline}&gymnast=${gymnastid}&number=${number}&participants=${participants}&folderId=${folderId}`
        );
        return;
      }
      const mainTables = await getMainTablesByCompetenceId(
        Number(competenceId)
      );
      console.log("Main Tables:", mainTables); // Debugging line

      // Sort the main tables by number to ensure proper order
      const sortedTables = mainTables.sort((a, b) => a.number - b.number);

      // Start searching for the next valid gymnast
      let nextNumber = Number(number) + 1;
      let nextTable = null;

      while (
        !nextTable &&
        nextNumber <= sortedTables[sortedTables.length - 1]?.number
      ) {
        nextTable = sortedTables.find((table) => table.number === nextNumber);
        if (!nextTable) nextNumber++; // Increment if not found
      }

      if (nextTable) {
        if (nextTable?.event === "VT") {
          router.push(
            `/main-jump?competenceId=${competenceId}&gymnastId=${discipline}&event=${nextTable?.event}&discipline=${discipline}&gymnast=${nextTable.id}&number=${nextTable.number}&participants=${participants}&folderId=${folderId}`
          );
        } else {
          router.push(
            `/main-floor?competenceId=${competenceId}&gymnastId=${discipline}&event=${nextTable?.event}&discipline=${discipline}&gymnast=${nextTable.id}&number=${nextTable.number}&participants=${participants}&folderId=${folderId}`
          );
        }
      } else {
        console.warn("No next gymnast found.");
        alert("No next gymnast found.");
      }
    } catch (error) {
      console.error("Error navigating to the next gymnast:", error);
    }
  };

  const handleGoBack = async () => {
    try {
      // Fetch all MainTable entries for the current competenceId
      const mainTables = await getMainTablesByCompetenceId(
        Number(competenceId)
      );

      // Sort the main tables by number to ensure proper order
      const sortedTables = mainTables.sort((a, b) => a.number - b.number);

      // Start searching for the previous valid gymnast
      let previousNumber = Number(number) - 1;
      let previousTable = null;

      while (!previousTable && previousNumber >= sortedTables[0]?.number) {
        previousTable = sortedTables.find(
          (table) => table.number === previousNumber
        );
        if (!previousTable) previousNumber--; // Decrement if not found
      }

      if (previousTable) {
        if (previousTable?.event === "VT") {
          router.push(
            `/main-jump?competenceId=${competenceId}&gymnastId=${discipline}&event=${previousTable?.event}&discipline=${discipline}&gymnast=${previousTable.id}&number=${previousTable.number}&participants=${participants}&folderId=${folderId}`
          );
        } else {
          router.push(
            `/main-floor?competenceId=${competenceId}&gymnastId=${discipline}&event=${previousTable?.event}&discipline=${discipline}&gymnast=${previousTable.id}&number=${previousTable.number}&participants=${participants}&folderId=${folderId}`
          );
        }
      } else {
        console.warn("No previous gymnast found.");
        alert("No previous gymnast found.");
      }
    } catch (error) {
      console.error("Error navigating to the previous gymnast:", error);
    }
  };

  /* Logic ======================================================== */
  const handleStickBonusChange = async (value: boolean) => {
    setStickBonus(value);
    const newmyscore = eScore + sv + (value ? 0.1 : 0.0) - nd;

    setMyScore(newmyscore);

    try {
      // Save the stickBonus value in MainRateGeneral
      const updateData: Partial<MainRateGeneral> = {
        stickBonus: value,
        myScore: newmyscore,
      };
      console.log("Update Data:", updateData); // Debugging line
      console.log("Rate ID:", rateid); // Debugging line
      const success = await updateRateGeneral(rateid, updateData);

      if (success) {
        console.log(`Saved stickBonus = ${value} in MainRateGeneral.`);
      } else {
        console.error(`Failed to save stickBonus in MainRateGeneral.`);
      }
    } catch (error) {
      console.error("Error saving stickBonus to MainRateGeneral:", error);
    }
  };
  /* Logic ======================================================== */

  const oncodetable = async () => {
    if (gender == true) {
      setShowModalMag(true);
    } else {
      setShowModalWag(true);
    }
  };

  const handleVaultSelect = (value: {
    number: string;
    value: number;
    description: string;
  }) => {
    console.log("Selected vault from :", value);
    setVaultNumber(value.number);
    setStartValue(value.value);
    setSv(value.value);

    setVaultDescription(value.description);

    const newmyscore = eScore + value.value + (stickbonus ? 0.1 : 0.0) - nd;
    setMyScore(newmyscore);
    updateRateGeneral(rateid, {
      vaultNumber: value.number,
      vaultDescription: value.description,
      myScore: newmyscore,
    }).then((success) => {
      if (success) {
        console.log("Vault number and description updated successfully.");
      } else {
        console.error("Failed to update vault number and description.");
      }
    });

    updateMainTable(gymnastid, {
      sv: value.value,
    }).then((success) => {
      if (success) {
        console.log("Vault SV updated successfully.");
      } else {
        console.error("Failed to update vault SV.");
      }
    });
  };

  /* Helpers ============================================== */
  function trimDecimals(num: number, decimals: number) {
    const [int, dec] = String(num).split(".");
    if (!dec) return int + "." + "0".repeat(decimals);
    return int + "." + dec.slice(0, decimals).padEnd(decimals, "0");
  }

  function getDeductionIntervalValue(newded: number): number {
    if (newded >= 0.0 && newded <= 0.4) return 1;
    if (newded > 0.4 && newded <= 0.6) return 2;
    if (newded > 0.6 && newded <= 1.0) return 3;
    if (newded > 1.0 && newded <= 1.5) return 4;
    if (newded > 1.5 && newded <= 2.0) return 5;
    if (newded > 2.0 && newded <= 2.5) return 6;
    if (newded > 2.5 && newded <= 10.0) return 7;
    return 0; // Out of range
  }

  const percentageTable = [
    // 0.000 0.100 0.200 0.300 0.400 0.500 0.600 0.700 0.800 0.900 1.000 1.100 1.200 1.300 1.400 1.500 1.600
    [100, 75, 65, 55, 45, 35, 25, 15, 5, 0, 0, 0, 0, 0, 0, 0, 0], // 1
    [100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0], // 2
    [100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0, 0], // 3
    [100, 100, 94, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0], // 4
    [100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0], // 5
    [100, 100, 100, 96, 88, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0], // 6
    [100, 100, 100, 100, 93, 87, 80, 70, 60, 50, 40, 30, 20, 0, 0, 0, 0], // 7
  ];
  const deltSteps = [
    0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4,
    1.5, 1.6,
  ];

  function getPercentageFromTable(dedInterval: number, delt: number): number {
    if (delt >= 1.4) return 0;
    if (dedInterval < 1 || dedInterval > 7) return 0;

    // Find the closest delt step index (without exceeding delt)
    let deltIndex =
      deltSteps.findIndex((step, idx) => delt < step && idx > 0) - 1;
    if (deltIndex < 0) deltIndex = deltSteps.length - 1;
    if (delt >= deltSteps[deltSteps.length - 1])
      deltIndex = deltSteps.length - 1;

    // If delt is less than the first step, use index 0
    if (delt < deltSteps[0]) deltIndex = 0;

    // Table is 0-indexed, dedInterval is 1-indexed
    return percentageTable[dedInterval - 1][deltIndex] || 0;
  }

  useEffect(() => {
  if (showNdCompModal) {
    setIsCustomKeyboardVisible(true);
    if (ndInputRefcomp.current) {
      setTimeout(() => {
        if (Platform.OS === 'ios') {
          ndInputRefcomp.current?.blur();
          ndInputRefcomp.current?.focus();
        }
      }, 100);
    }
  } else {
    setIsCustomKeyboardVisible(false);
  }
}, [showNdCompModal]);


  return (
    <SafeAreaView style={styles.container}>
{showNdCompModal && (
  <View
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 10000,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
      height: "105%",
    }}
  >
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        minWidth: 250,
        alignItems: "center",
        elevation: 10,
        marginBottom: isCustomKeyboardVisible ? "50%" : "30%",
      }}
    >
      
        <TextInput
          ref={ndInputRefcomp}
          style={[
            styles.infoValueText,
            { fontSize: 40, marginBottom: 16, textAlign: "center" },
          ]}
          value={ndInputcomp}
          keyboardType="phone-pad"
          showSoftInputOnFocus={false}
          caretHidden={Platform.OS === 'ios'}
          onFocus={() => setIsCustomKeyboardVisible(true)}
          selectTextOnFocus
          onChangeText={(text) => {
            if (/^\d*\.?\d*$/.test(text)) {
              setNdInputcomp(text);
            }
          }}
          maxLength={5}
          autoFocus
          editable={false}
        />
        <TouchableOpacity
          style={{
            marginTop: 10,
            padding: 10,
            backgroundColor: "#0052b4",
            borderRadius: 8,
          }}
          onPress={() => {
            setShowNdCompModal(false);
            setIsCustomKeyboardVisible(false);
            ndInputRefcomp.current?.blur();
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
        </TouchableOpacity>
    </View>
    
    {isCustomKeyboardVisible && (
      <SimplifiedNumberPad
        visible={isCustomKeyboardVisible}
        onNumberPress={(number) => {
  // Verifica si todo el texto está seleccionado (primer toque)
  if (ndInputcomp === ndcomp.toFixed(1)) {
    setNdInputcomp(number);
  } else {
    let newValue = ndInputcomp;
    if (ndInputcomp === "0" || ndInputcomp === "0.0") {
      newValue = number;
    } else {
      newValue = ndInputcomp + number;
    }
    setNdInputcomp(newValue);
  }
}}
        onDecimalPress={() => {
          if (!ndInputcomp.includes(".")) {
            setNdInputcomp(ndInputcomp + ".");
          }
        }}
        onDeletePress={() => {
          if (ndInputcomp.length > 0) {
            setNdInputcomp(ndInputcomp.slice(0, -1));
            if (ndInputcomp.length === 1) {
              setNdInputcomp("0");
            }
          }
        }}
        onHidePress={() => {
          setIsCustomKeyboardVisible(false);
        }}
        onSubmitPress={() => {
          const num = parseFloat(ndInputcomp.replace(",", "."));
          if (!isNaN(num)) {
            const rounded = Math.round(num * 10) / 10;
            setndcomp(rounded);
            
            const compscorecalc = d + e + (sb ? 0.1 : 0.0) - rounded;
            setScore(compscorecalc);
            updateRateGeneral(rateid, {
              compNd: rounded,
              compScore: compscorecalc,
            });
          }
          setShowNdCompModal(false);
          setIsCustomKeyboardVisible(false);
        }}
      />
    )}
  </View>
)}

{showEModal && (
  <View
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 10000,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
      height: "105%",
    }}
  >
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        minWidth: 250,
        alignItems: "center",
        elevation: 10,
        marginBottom: isCustomKeyboardVisible ? "50%" : "30%",
      }}
    >
      
        <TextInput
          ref={eInputRef}
          style={[
            styles.infoValueText,
            { fontSize: 40, marginBottom: 16, textAlign: "center" },
          ]}
          value={eInput}
          keyboardType="decimal-pad"
          showSoftInputOnFocus={false}
          caretHidden={Platform.OS === 'ios'}
          onFocus={() => setIsCustomKeyboardVisible(true)}
          selectTextOnFocus
          onChangeText={(text) => {
            if (/^\d*\.?\d*$/.test(text)) {
              setEInput(text);
            }
          }}
          maxLength={5}
          autoFocus
          editable={false}
        />
        <TouchableOpacity
          style={{
            marginTop: 10,
            padding: 10,
            backgroundColor: "#0052b4",
            borderRadius: 8,
          }}
          onPress={() => {
            setShowEModal(false);
            setIsCustomKeyboardVisible(false);
            eInputRef.current?.blur();
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
        </TouchableOpacity>
    </View>
    
    {isCustomKeyboardVisible && (
      <SimplifiedNumberPad
        visible={isCustomKeyboardVisible}
        onNumberPress={(number) => {
  // Verifica si todo el texto está seleccionado (primer toque)
  if (eInput === e.toFixed(3)) {
    setEInput(number);
  } else {
    let newValue = eInput;
    if (eInput === "0" || eInput === "0.0") {
      newValue = number;
    } else {
      newValue = eInput + number;
    }
    setEInput(newValue);
  }
}}
        onDecimalPress={() => {
          if (!eInput.includes(".")) {
            setEInput(eInput + ".");
          }
        }}
        onDeletePress={() => {
          if (eInput.length > 0) {
            setEInput(eInput.slice(0, -1));
            if (eInput.length === 1) {
              setEInput("0");
            }
          }
        }}
        onHidePress={() => {
          setIsCustomKeyboardVisible(false);
        }}
        onSubmitPress={() => {
          const num = parseFloat(eInput.replace(",", "."));
          if (!isNaN(num)) {
            const rounded = Math.round(num * 1000) / 1000;
            setE(rounded);
            // Save to database
            const compscorecalc = d + rounded + (sb ? 0.1 : 0.0) - ndcomp;
            setScore(compscorecalc);

            /* ============================================================== */
            const newdelt = Math.abs(
              Math.round((eScore - rounded) * 10) / 10
            );
            setDelt(newdelt);
            
            const newded = 10 - rounded;
            setSetded(Number(newded.toFixed(1)));
            
            const dedInterval = getDeductionIntervalValue(
              Number(newded.toFixed(1))
            );
            const percentageValue = getPercentageFromTable(
              dedInterval,
              newdelt
            );
            setpercentage(percentageValue);

            updateMainTable(gymnastid, {
              delt: newdelt,
              percentage: percentageValue,
            });

            /* ============================================================== */
            updateRateGeneral(rateid, {
              compE: rounded,
              compScore: compscorecalc,
              ded: newded,
            });
          }
          setShowEModal(false);
          setIsCustomKeyboardVisible(false);
        }}
      />
    )}
  </View>
)}

{showDModal && (
  <View
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 10000,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
      height: "105%",
    }}
  >
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        minWidth: 250,
        alignItems: "center",
        elevation: 10,
        marginBottom: isCustomKeyboardVisible ? "50%" : "30%",
      }}
    >
      
        <TextInput
          ref={dInputRef}
          style={[
            styles.infoValueText,
            { fontSize: 40, marginBottom: 16, textAlign: "center" },
          ]}
          value={dInput}
          keyboardType="decimal-pad"
          showSoftInputOnFocus={false}
caretHidden={Platform.OS === 'ios'}
          onFocus={() => setIsCustomKeyboardVisible(true)}
          selectTextOnFocus
          onChangeText={(text) => {
            if (/^\d*\.?\d*$/.test(text)) {
              setDInput(text);
            }
          }}
          maxLength={5}
          autoFocus
          editable={false}
        />
        <TouchableOpacity
          style={{
            marginTop: 10,
            padding: 10,
            backgroundColor: "#0052b4",
            borderRadius: 8,
          }}
          onPress={() => {
            setShowDModal(false);
            setIsCustomKeyboardVisible(false);
            dInputRef.current?.blur();
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
        </TouchableOpacity>
    </View>
    
    {isCustomKeyboardVisible && (
      <SimplifiedNumberPad
        visible={isCustomKeyboardVisible}
        onNumberPress={(number) => {
  // Verifica si todo el texto está seleccionado (primer toque)
  if (dInput === d.toFixed(1)) {
    setDInput(number);
  } else {
    let newValue = dInput;
    if (dInput === "0" || dInput === "0.0") {
      newValue = number;
    } else {
      newValue = dInput + number;
    }
    setDInput(newValue);
  }
}}
        onDecimalPress={() => {
          if (!dInput.includes(".")) {
            setDInput(dInput + ".");
          }
        }}
        onDeletePress={() => {
          if (dInput.length > 0) {
            setDInput(dInput.slice(0, -1));
            if (dInput.length === 1) {
              setDInput("0");
            }
          }
        }}
        onHidePress={() => {
          setIsCustomKeyboardVisible(false);
        }}
        onSubmitPress={() => {
          const num = parseFloat(dInput.replace(",", "."));
          if (!isNaN(num)) {
            const rounded = Math.round(num * 10) / 10;
            setD(rounded);

            const compscorecalc = rounded + e + (sb ? 0.1 : 0.0) - ndcomp;
            setScore(compscorecalc);
            updateRateGeneral(rateid, {
              compD: rounded,
              compScore: compscorecalc,
            });
          }
          setShowDModal(false);
          setIsCustomKeyboardVisible(false);
        }}
      />
    )}
  </View>
)}

{showExecutionModal && (
  <View
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 10000,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
      height: "105%",
    }}
  >
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        minWidth: 250,
        alignItems: "center",
        elevation: 10,
        marginBottom: isCustomKeyboardVisible ? "50%" : "30%",
      }}
    >
      
        <TextInput
          ref={executionInputRef}
          style={[
            styles.infoValueText,
            { fontSize: 40, marginBottom: 16, textAlign: "center" },
          ]}
          value={executionInput}
          keyboardType="number-pad"
          showSoftInputOnFocus={false}
caretHidden={Platform.OS === 'ios'}
          onFocus={() => setIsCustomKeyboardVisible(true)}
          selectTextOnFocus
          onChangeText={(text) => {
            if (/^\d*\.?\d*$/.test(text)) {
              setExecutionInput(text);
            }
          }}
          maxLength={5}
          autoFocus
          editable={false}
        />
        <TouchableOpacity
          style={{
            marginTop: 10,
            padding: 10,
            backgroundColor: "#0052b4",
            borderRadius: 8,
          }}
          onPress={() => {
            setShowExecutionModal(false);
            setIsCustomKeyboardVisible(false);
            executionInputRef.current?.blur();
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
        </TouchableOpacity>
    </View>
    
    {/* Teclado personalizado */}
    {isCustomKeyboardVisible && (
      <SimplifiedNumberPad
        visible={isCustomKeyboardVisible}
        onNumberPress={(number) => {
  // Verifica si todo el texto está seleccionado (primer toque)
  if (executionInput === execution.toFixed(1)) {
    setExecutionInput(number);
  } else {
    let newValue = executionInput;
    if (executionInput === "0" || executionInput === "0.0") {
      newValue = number;
    } else {
      newValue = executionInput + number;
    }
    setExecutionInput(newValue);
  }
}}
        onDecimalPress={() => {
          if (!executionInput.includes(".")) {
            setExecutionInput(executionInput + ".");
          }
        }}
        onDeletePress={() => {
          if (executionInput.length > 0) {
            setExecutionInput(executionInput.slice(0, -1));
            if (executionInput.length === 1) {
              setExecutionInput("0");
            }
          }
        }}
        onHidePress={() => {
          setIsCustomKeyboardVisible(false);
        }}
        onSubmitPress={() => {
          // Parse y actualizar solo al cerrar
          const num = parseFloat(executionInput.replace(",", "."));
          if (!isNaN(num)) {
            const rounded = Math.round(num * 10) / 10;
            setExecution(rounded);
            const eScore = Number((10 - rounded).toFixed(3));
            const newmyscore = eScore + sv + (stickbonus ? 0.1 : 0.0) - nd;
            setMyScore(newmyscore);

            /* Lógica de delt existente */
            const newdelt = Math.abs(Math.round((eScore - e) * 10) / 10);
            setDelt(newdelt);

            const newded = 10 - e;
            setSetded(Number(newded.toFixed(1)));

            const dedInterval = getDeductionIntervalValue(Number(newded.toFixed(1)));
            const percentageValue = getPercentageFromTable(dedInterval, newdelt);
            setpercentage(percentageValue);

            updateMainTable(gymnastid, {
              delt: newdelt,
              percentage: percentageValue,
            });

            setEScore(eScore);
            updateRateGeneral(rateid, {
              execution: rounded,
              eScore,
              myScore: newmyscore,
            });
          }
          setShowExecutionModal(false);
          setIsCustomKeyboardVisible(false);
        }}
      />
    )}
  </View>
)}

      {showCommentsModal && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 10000,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              minWidth: 350,
              width: "80%",
              maxWidth: 700,

              alignItems: "center",
              elevation: 10,
              marginBottom: "30%",
            }}
          >
            <Text
              style={{ fontWeight: "bold", fontSize: 20, marginBottom: 10 }}
            >
              Edit Comments
            </Text>
            <TextInput
              ref={commentsInputRef}
              style={{
                width: "100%",
                minHeight: 120,
                maxHeight: 250,
                borderColor: "#ccc",
                borderWidth: 1,
                borderRadius: 10,
                padding: 12,
                fontSize: 18,
                textAlignVertical: "top",
                backgroundColor: "#f9f9f9",
              }}
              multiline
              value={commentsInput}
              onChangeText={setCommentsInput}
              autoFocus
            />
            <View style={{ flexDirection: "row", marginTop: 18 }}>
              <TouchableOpacity
                style={{
                  marginRight: 16,
                  padding: 10,
                  backgroundColor: "#0052b4",
                  borderRadius: 8,
                  minWidth: 80,
                  alignItems: "center",
                }}
                onPress={async () => {
                  setComments(commentsInput);
                  setShowCommentsModal(false);
                  try {
                    await updateRateGeneral(rateid, {
                      comments: commentsInput,
                    });
                  } catch (error) {
                    console.error(
                      "Error saving comments to MainRateGeneral:",
                      error
                    );
                  }
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  padding: 10,
                  backgroundColor: "#ccc",
                  borderRadius: 8,
                  minWidth: 80,
                  alignItems: "center",
                }}
                onPress={() => setShowCommentsModal(false)}
              >
                <Text style={{ color: "#333", fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

{showNdModal && (
  <View
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 10000,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
      height: "105%",
    }}
  >
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        minWidth: 250,
        alignItems: "center",
        elevation: 10,
        marginBottom: isCustomKeyboardVisible ? "50%" : "30%",
      }}
    >

      <TextInput
        ref={ndInputRef}
        style={[
          styles.infoValueText,
          { fontSize: 40, marginBottom: 16, textAlign: "center" },
        ]}
        value={ndInput}
        keyboardType="phone-pad"
        showSoftInputOnFocus={false}
caretHidden={Platform.OS === 'ios'}
        onFocus={() => setIsCustomKeyboardVisible(true)}
        selectTextOnFocus
        onChangeText={(text) => {
          if (/^\d*\.?\d*$/.test(text)) {
            setNdInput(text);
          }
        }}
        maxLength={5}
        autoFocus
        editable={false}
      />
      <TouchableOpacity
        style={{
          marginTop: 10,
          padding: 10,
          backgroundColor: "#0052b4",
          borderRadius: 8,
        }}
        onPress={() => {
          // Tu lógica existente de onPress
  // Tu lógica existente...
  setShowNdModal(false);
  setIsCustomKeyboardVisible(false);
  // Asegúrate de quitar el enfoque
  ndInputRef.current?.blur();
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
      </TouchableOpacity>

    </View>
    
    {/* Añadir el teclado personalizado */}
    {isCustomKeyboardVisible && (
      <SimplifiedNumberPad
        visible={isCustomKeyboardVisible}
        onNumberPress={(number) => {
  // Verifica si todo el texto está seleccionado (primer toque)
  if (ndInput === nd.toFixed(1)) {
    setNdInput(number);
  } else {
    let newValue = ndInput;
    if (ndInput === "0" || ndInput === "0.0") {
      newValue = number;
    } else {
      newValue = ndInput + number;
    }
    setNdInput(newValue);
  }
}}
        onDecimalPress={() => {
          if (!ndInput.includes(".")) {
            setNdInput(ndInput + ".");
          }
        }}
        onDeletePress={() => {
          if (ndInput.length > 0) {
            setNdInput(ndInput.slice(0, -1));
            if (ndInput.length === 1) {
              setNdInput("0");
            }
          }
        }}
        onHidePress={() => {
          setIsCustomKeyboardVisible(false);
        }}
        onSubmitPress={() => {
          // Obtener el valor actual y procesarlo
          const num = parseFloat(ndInput.replace(",", "."));
          if (!isNaN(num)) {
            const rounded = Math.round(num * 10) / 10;
            setNd(rounded);
            const newmyscore = eScore + sv + (stickbonus ? 0.1 : 0.0) - rounded;
            setMyScore(newmyscore);
            updateRateGeneral(rateid, { myScore: newmyscore });
            
            // Guardar en la base de datos
            updateMainTable(gymnastid, { nd: rounded })
              .then((success) => {
                if (success) {
                  console.log(`Saved nd = ${rounded} in MainTable.`);
                } else {
                  console.error(`Failed to save nd in MainTable.`);
                }
              })
              .catch((error) => {
                console.error("Error saving nd to MainTable:", error);
              });
          }
          setShowNdModal(false);
          setIsCustomKeyboardVisible(false);
        }}
      />
    )}
  </View>
)}

      {showmodalmag && (
        <ModalvaultMag
          visible={showmodalmag}
          onClose={() => setShowModalMag(false)}
          onSelect={(value) => {
            handleVaultSelect(value);
          }}
        />
      )}

      {showmodalwag && (
        <ModalvaultWag
          visible={showmodalwag}
          onClose={() => setShowModalWag(false)}
          onSelect={(value) => {
            handleVaultSelect(value);
          }}
        />
      )}

      {/* Whiteboard Screen */}
      <WhiteboardScreen
        rateGeneralId={0}
        tableId={gymnastid}
        stickBonus={stickbonus}
        setStickBonus={handleStickBonusChange}
        percentage={percentage}
        oncodetable={oncodetable}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Main Table */}
        <View style={styles.tableContainer}>
          {/* Header Row */}
          <View style={styles.tableRow}>
            <View style={styles.vaultNumbersCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderText : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null,
                ]}
              >
                VAULT NUMBERS
              </Text>
            </View>
            <View style={styles.svValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderText : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null,
                ]}
              >
                SV
              </Text>
            </View>
            <View style={styles.ndCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderText : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null,
                ]}
              >
                ND
              </Text>
            </View>
            <View style={styles.sbCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderText : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null,
                ]}
              >
                SB
              </Text>
            </View>
            <View style={styles.executionCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderText : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null,
                ]}
              >
                EXECUTION
              </Text>
            </View>
            <View style={styles.myScoreCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderText : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null,
                ]}
              >
                MY SCORE
              </Text>
            </View>
          </View>

          {/* Values Row */}
          <View style={styles.tableRow}>
            <View style={styles.vaultValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.vaultValueText : null,
                  isSmallDevice ? styles.vaultValueTextSmall : null,
                  isTinyDevice ? styles.vaultValueTextTiny : null,
                ]}
              >
                {vaultnumber}
              </Text>
            </View>
            <View
              style={[
                styles.emptyBlueCell,
                { width: isLargeDevice ? 210 : isSmallDevice ? 160 : 110 },
              ]}
            >
              <Text
                style={[
                  isLargeDevice ? styles.svValueText : null,
                  isSmallDevice ? styles.svValueTextSmall : null,
                  isTinyDevice ? styles.svValueTextTiny : null,
                ]}
              >
                {sv}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.ndValueCell}
              onPress={() => {
                setNdInput(nd.toFixed(1)); // Set value BEFORE opening modal
                setShowNdModal(true);
              }}
            >
              <Text
                style={[
                  isLargeDevice ? styles.valueText : null,
                  isSmallDevice ? styles.valueTextSmall : null,
                  isTinyDevice ? styles.valueTextTiny : null,
                ]}
              >
                {nd.toFixed(1)}
              </Text>
            </TouchableOpacity>
            <View style={styles.sbValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.valueText : null,
                  isSmallDevice ? styles.valueTextSmall : null,
                  isTinyDevice ? styles.valueTextTiny : null,
                ]}
              >
                {stickbonus ? "0.1" : "0.0"}
              </Text>
            </View>
            <View style={styles.executionValueCellflex}>
              <View style={styles.executionValueCell}>
                <Text
                  style={[
                    isLargeDevice ? styles.valueText : null,
                    isSmallDevice ? styles.valueTextSmall : null,
                    isTinyDevice ? styles.valueTextTiny : null,
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setExecutionInput(execution.toFixed(1)); // Set value BEFORE opening modal
                      setShowExecutionModal(true);
                    }}
                  >
                    <Text style={styles.infoValueText}>
                      {execution.toFixed(1)}
                    </Text>
                  </TouchableOpacity>
                </Text>
              </View>
              <View style={styles.executionValueCell}>
                <Text
                  style={[
                    isLargeDevice ? styles.valueText : null,
                    isSmallDevice ? styles.valueTextSmall : null,
                    isTinyDevice ? styles.valueTextTiny : null,
                  ]}
                >
                  <Text style={styles.scoreValueText}>{eScore.toFixed(3)}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.myScoreValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.scoreValueText : null,
                  isSmallDevice ? styles.scoreValueTextSmall : null,
                  isTinyDevice ? styles.scoreValueTextTiny : null,
                ]}
              >
                {myScore.toFixed(3)}
              </Text>
            </View>
          </View>

          {/* Start Value / Description Row */}
          <View style={styles.tableRow}>
            <View style={styles.startValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderText : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null,
                ]}
              >
                START VALUE
              </Text>
            </View>
            <View style={styles.descriptionCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderText : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null,
                ]}
              >
                DESCRIPTION
              </Text>
            </View>
            <View style={styles.compDeductionHeaderCell}>
              <Text
                style={[
                  isLargeDevice ? styles.compDeductionText : null,
                  isSmallDevice ? styles.compDeductionTextSmall : null,
                  isTinyDevice ? styles.compDeductionTextTiny : null,
                ]}
              >
                COMPETITION
              </Text>
              <Text
                style={[
                  isLargeDevice ? styles.compDeductionText : null,
                  isSmallDevice ? styles.compDeductionTextSmall : null,
                  isTinyDevice ? styles.compDeductionTextTiny : null,
                ]}
              >
                DEDUCTION
              </Text>
            </View>
            <View style={styles.dCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallCellText : null,
                  isSmallDevice ? styles.smallCellTextSmall : null,
                  isTinyDevice ? styles.smallCellTextTiny : null,
                ]}
              >
                D
              </Text>
            </View>
            <View style={styles.dValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallValueText : null,
                  isSmallDevice ? styles.smallValueTextSmall : null,
                  isTinyDevice ? styles.smallValueTextTiny : null,
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    setDInput(d.toFixed(1)); // Set value BEFORE opening modal
                    setShowDModal(true);
                  }}
                >
                  <Text
                    style={[
                      isLargeDevice ? styles.dValueText : null,
                      isSmallDevice ? styles.dValueTextSmall : null,
                      isTinyDevice ? styles.dValueTextTiny : null,
                    ]}
                  >
                    {d.toFixed(1)}
                  </Text>
                </TouchableOpacity>
              </Text>
            </View>
            <View style={styles.eCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallCellText : null,
                  isSmallDevice ? styles.smallCellTextSmall : null,
                  isTinyDevice ? styles.smallCellTextTiny : null,
                ]}
              >
                E
              </Text>
            </View>
            <View style={styles.eValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallValueText : null,
                  isSmallDevice ? styles.smallValueTextSmall : null,
                  isTinyDevice ? styles.smallValueTextTiny : null,
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    setEInput(e.toFixed(3)); // Set value BEFORE opening modal
                    setShowEModal(true);
                  }}
                >
                  <Text
                    style={[
                      isLargeDevice ? styles.eValueText : null,
                      isSmallDevice ? styles.eValueTextSmall : null,
                      isTinyDevice ? styles.eValueTextTiny : null,
                    ]}
                  >
                    {e.toFixed(3)}
                  </Text>
                </TouchableOpacity>
              </Text>
            </View>
            <View style={styles.sdCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallCellText : null,
                  isSmallDevice ? styles.smallCellTextSmall : null,
                  isTinyDevice ? styles.smallCellTextTiny : null,
                ]}
              >
                SB
              </Text>
            </View>
            <View style={styles.sdValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallValueText : null,
                  isSmallDevice ? styles.smallValueTextSmall : null,
                  isTinyDevice ? styles.smallValueTextTiny : null,
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    const newValue = !sb;
                    setSb(newValue);
                    // Save to database if needed
                    const compscorecalc =
                      d + e + (newValue ? 0.1 : 0.0) - ndcomp;
                    setScore(compscorecalc);
                    updateRateGeneral(rateid, {
                      compSd: newValue ? 0.1 : 0.0,
                      compScore: compscorecalc,
                    })
                      .then((success) => {
                        if (success) {
                          console.log(
                            `Saved SB = ${
                              newValue ? "0.1" : "0.0"
                            } in MainRateGeneral.`
                          );
                        } else {
                          console.error(
                            `Failed to save SB in MainRateGeneral.`
                          );
                        }
                      })
                      .catch((error) => {
                        console.error(
                          "Error saving SB to MainRateGeneral:",
                          error
                        );
                      });
                  }}
                >
                  <Text
                    style={[
                      isLargeDevice ? styles.sdValueText : null,
                      isSmallDevice ? styles.sdValueTextSmall : null,
                      isTinyDevice ? styles.sdValueTextTiny : null,
                    ]}
                  >
                    {sb ? "0.1" : "0.0"}
                  </Text>
                </TouchableOpacity>
              </Text>
            </View>
            <View style={styles.ndDeductionCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallCellText : null,
                  isSmallDevice ? styles.smallCellTextSmall : null,
                  isTinyDevice ? styles.smallCellTextTiny : null,
                ]}
              >
                ND
              </Text>
            </View>
            <View style={styles.ndDeductionValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallValueText : null,
                  isSmallDevice ? styles.smallValueTextSmall : null,
                  isTinyDevice ? styles.smallValueTextTiny : null,
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    setNdInputcomp(ndcomp.toFixed(1)); // Set value BEFORE opening modal
                    setShowNdCompModal(true); // Open the ND COMP modal
                  }}
                >
                  <Text
                    style={[
                      isLargeDevice ? styles.ndValueText : null,
                      isSmallDevice ? styles.ndValueTextSmall : null,
                      isTinyDevice ? styles.ndValueTextTiny : null,
                    ]}
                  >
                    {ndcomp.toFixed(1)}
                  </Text>
                </TouchableOpacity>
              </Text>
            </View>
            <View style={styles.scoreHeaderCell}>
              <Text
                style={[
                  isLargeDevice ? styles.ScoresmallCellText : null,
                  isSmallDevice ? styles.ScoresmallCellTextSmall : null,
                  isTinyDevice ? styles.ScoresmallCellTextTiny : null,
                ]}
              >
                SCORE
              </Text>
            </View>
            <View style={styles.scoreTotalCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallValueText : null,
                  isSmallDevice ? styles.smallValueTextSmall : null,
                  isTinyDevice ? styles.smallValueTextTiny : null,
                ]}
              >
                {trimDecimals(score, 3)}
              </Text>
            </View>
          </View>

          {/* Data Row */}
          <View style={styles.tableRow}>
            <View style={styles.startValueValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.startValueValueText : null,
                  isSmallDevice ? styles.startValueValueTextSmall : null,
                  isTinyDevice ? styles.startValueValueTextTiny : null,
                ]}
              >
                {startValue}
              </Text>
            </View>
            <View style={styles.descriptionValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.descriptionValueText : null,
                  isSmallDevice ? styles.descriptionValueTextSmall : null,
                  isTinyDevice ? styles.descriptionValueTextTiny : null,
                ]}
              >
                {vaultDescription}
              </Text>
            </View>
            <View style={styles.gymnastInfoCell}>
              <Text
                style={[
                  isLargeDevice ? styles.gymnastInfoText : null,
                  isSmallDevice ? styles.gymnastInfoTextSmall : null,
                  isTinyDevice ? styles.gymnastInfoTextTiny : null,
                ]}
              >
                GYMNAST
              </Text>
              <Text
                style={[
                  isLargeDevice ? styles.gymnastInfoText : null,
                  isSmallDevice ? styles.gymnastInfoTextSmall : null,
                  isTinyDevice ? styles.gymnastInfoTextTiny : null,
                ]}
              >
                INFO
              </Text>
            </View>
            <View style={styles.neutralValueCellname}>
              <Text
                style={[
                  isLargeDevice ? styles.neutralText : null,
                  isSmallDevice ? styles.neutralTextSmall : null,
                  isTinyDevice ? styles.neutralTextTiny : null,
                ]}
              >
                {gymnastName}
              </Text>
            </View>
            <View style={styles.neutralValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.neutralText : null,
                  isSmallDevice ? styles.neutralTextSmall : null,
                  isTinyDevice ? styles.neutralTextTiny : null,
                ]}
              >
                {gymnastNoc}
              </Text>
            </View>
            <View style={styles.neutralValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.neutralText : null,
                  isSmallDevice ? styles.neutralTextSmall : null,
                  isTinyDevice ? styles.neutralTextTiny : null,
                ]}
              >
                {gymnastBib}
              </Text>
            </View>
            <View style={styles.neutralTotalCell}>
              <Text
                style={[
                  isLargeDevice ? styles.neutralTotalText : null,
                  isSmallDevice ? styles.neutralTotalTextSmall : null,
                  isTinyDevice ? styles.neutralTotalTextTiny : null,
                ]}
              >
                {number}
              </Text>
            </View>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <TouchableOpacity
            onPress={() => {
              setCommentsInput(comments); // Set current comments before opening
              setShowCommentsModal(true);
            }}
            style={styles.commentsBoxTouchable}
          >
            <Text numberOfLines={3} style={styles.commentsBoxTextPreview}>
              {comments ? comments : "Tap to add comments..."}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => handleGoBack()}
          >
            <Text style={styles.buttonText}>BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mainTableButton}
            onPress={() => handlegobacklist()}
          >
            <Text style={styles.buttonText}>START LIST</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mainTableButton}
            onPress={() => handleSelect()}
          >
            <Text style={styles.buttonText}>MAIN TABLE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                backgroundColor:
                  number === participants ? "#DC3545" : "#0052b4",
              },
            ]}
            onPress={() => handleGoForward()}
          >
            <Text style={styles.buttonText}>
              {number === participants ? "FINISH" : "NEXT"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0e0e0",
  },
  ndValueText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  ndValueTextSmall: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  ndValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  sdValueText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  sdValueTextSmall: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  sdValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  eValueText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  eValueTextSmall: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
  },
  eValueTextTiny: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  dValueText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  dValueTextSmall: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  dValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  scoreDisplay: {
    height: 50,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: 10,
  },
  scoreText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
  },
  graphContainer: {
    height: isLargeDevice ? 450 : isSmallDevice ? 350 : 250,
    width: "100%",
    position: "relative",
  },
  graphContainerimg: {
    width: isLargeDevice ? "70%" : isSmallDevice ? "60%" : "50%",
    height: isLargeDevice ? "70%" : isSmallDevice ? "60%" : "50%",
    position: "relative",
    alignSelf: "center",
    top: isLargeDevice ? 60 : isSmallDevice ? 50 : 40,
    left: 0,
  },
  codetable: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0052b4",
    position: "absolute",
    bottom: 10,
    backgroundColor: "#B4B4B4",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 5,
    left: 10,
  },
  codeTableText: {
    fontSize: 20,
    color: "white",
  },
  codeTableTextSmall: {
    fontSize: 16,
    color: "white",
  },
  codeTableTextTiny: {
    fontSize: 12,
    color: "white",
  },
  tableContainer: {
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    height: isLargeDevice ? 55 : isSmallDevice ? 45 : 35,
  },
  vaultNumbersCell: {
    width: isLargeDevice ? 700 : isSmallDevice ? 500 : 400,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    paddingLeft: 10,
    borderWidth: 1,
    borderColor: "black",
  },
  cellHeaderText: {
    fontSize: 25,
    fontWeight: "bold",
    alignSelf: "center",
    color: "#000",
  },
  cellHeaderTextSmall: {
    fontSize: 20,
    fontWeight: "bold",
    alignSelf: "center",
    color: "#000",
  },
  cellHeaderTextTiny: {
    fontSize: 15,
    fontWeight: "bold",
    alignSelf: "center",
    color: "#000",
  },
  svValueCell: {
    width: isLargeDevice ? 210 : isSmallDevice ? 160 : 110,
    backgroundColor: "#ffca28",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  svValueText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    alignSelf: "center",
    justifyContent: "center",
    paddingTop: 6,
  },
  svValueTextSmall: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    alignSelf: "center",
    height: "100%",
    paddingTop: 9,
  },
  svValueTextTiny: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    alignSelf: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  ndCell: {
    width: isLargeDevice ? 105 : isSmallDevice ? 80 : 60,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  sbCell: {
    width: isLargeDevice ? 105 : isSmallDevice ? 80 : 60,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  executionCell: {
    width: isLargeDevice ? 210 : isSmallDevice ? 160 : 120,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  myScoreCell: {
    flex: 1,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  vaultValueCell: {
    width: isLargeDevice ? 700 : isSmallDevice ? 500 : 300,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  vaultValueText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  vaultValueTextSmall: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  vaultValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  emptyBlueCell: {
    backgroundColor: "#f5f5f5",
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "black",
    zIndex: -1,
  },
  ndValueCell: {
    width: isLargeDevice ? 105 : isSmallDevice ? 80 : 60,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  valueText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  valueTextSmall: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  valueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  sbValueCell: {
    width: isLargeDevice ? 105 : isSmallDevice ? 80 : 60,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  executionValueCell: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    height: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  executionValueCellflex: {
    width: isLargeDevice ? 210 : isSmallDevice ? 160 : 120,
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderColor: "black",
  },
  myScoreValueCell: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  scoreValueText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  scoreValueTextSmall: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  scoreValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  startValueCell: {
    width: isLargeDevice ? 250 : isSmallDevice ? 180 : 120,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  descriptionCell: {
    width: isLargeDevice ? 450 : isSmallDevice ? 320 : 180,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  compDeductionHeaderCell: {
    width: isLargeDevice ? 210 : isSmallDevice ? 160 : 110,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  compDeductionText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
    textAlign: "left",
    alignSelf: "flex-end",
    paddingRight: 10,
  },
  compDeductionTextSmall: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
    textAlign: "left",
    alignSelf: "flex-end",
    paddingRight: 8,
  },
  compDeductionTextTiny: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000",
    textAlign: "left",
    alignSelf: "flex-end",
    paddingRight: 5,
  },
  dCell: {
    flex: 0.5,
    backgroundColor: "#A3A3A3",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  smallCellText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  smallCellTextSmall: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#000",
  },
  smallCellTextTiny: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
  },
  ScoresmallCellText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  ScoresmallCellTextSmall: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
  },
  ScoresmallCellTextTiny: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
  },
  dValueCell: {
    flex: 0.5,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  smallValueText: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#000",
  },
  smallValueTextSmall: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
  },
  smallValueTextTiny: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
  },
  eCell: {
    flex: 0.5,
    backgroundColor: "#A3A3A3",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  eValueCell: {
    flex: 0.7,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  sdCell: {
    flex: 0.5,
    backgroundColor: "#A3A3A3",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  sdValueCell: {
    flex: 0.5,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  ndDeductionCell: {
    flex: 0.5,
    backgroundColor: "#A3A3A3",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  ndDeductionValueCell: {
    flex: 0.5,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  scoreHeaderCell: {
    flex: 0.5,
    backgroundColor: "#A3A3A3",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  scoreTotalCell: {
    flex: 0.7,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  startValueValueCell: {
    width: isLargeDevice ? 250 : isSmallDevice ? 180 : 120,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  startValueValueText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  startValueValueTextSmall: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
  },
  startValueValueTextTiny: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  descriptionValueCell: {
    width: isLargeDevice ? 450 : isSmallDevice ? 320 : 180,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  descriptionValueText: {
    fontSize: 20,
    color: "#000",
  },
  descriptionValueTextSmall: {
    fontSize: 18,
    color: "#000",
  },
  descriptionValueTextTiny: {
    fontSize: 18,
    color: "#000",
  },
  gymnastInfoCell: {
    width: isLargeDevice ? 210 : isSmallDevice ? 160 : 110,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  gymnastInfoText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    alignSelf: "flex-end",
    paddingRight: 10,
  },
  gymnastInfoTextSmall: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    alignSelf: "flex-end",
    paddingRight: 8,
  },
  gymnastInfoTextTiny: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    alignSelf: "flex-end",
    paddingRight: 5,
  },
  neutralValueCell: {
    flex: 2,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  neutralValueCellname: {
    flex: 4,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  neutralText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTextSmall: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTextTiny: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTotalCell: {
    flex: 0.7,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  neutralTotalText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTotalTextSmall: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTotalTextTiny: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  commentsSection: {
    padding: 10,
  },
  commentsText: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#333",
  },
  commentsTextSmall: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  commentsTextTiny: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  commentsBox: {
    height: isLargeDevice ? 60 : isSmallDevice ? 50 : 40,
    borderRadius: 15,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    marginTop: isLargeDevice ? 30 : isSmallDevice ? 20 : 15,
  },
  backButton: {
    flex: 3,
    backgroundColor: "#0052b4",
    padding: isLargeDevice ? 15 : isSmallDevice ? 12 : 10,
    borderRadius: 5,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#0052b4",
    padding: isLargeDevice ? 15 : isSmallDevice ? 12 : 10,
    borderRadius: 5,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    flex: 3,
    backgroundColor: "#0052b4",
    padding: isLargeDevice ? 15 : isSmallDevice ? 12 : 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  buttonTextSmall: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  buttonTextTiny: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "bold",
  },
  mainTableButton: {
    flex: 1,
    backgroundColor: "#0052b4",
    padding: 12,
    borderRadius: 5,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  commentsBoxTouchable: {
    backgroundColor: "#fff",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    minHeight: 60,
    justifyContent: "center",
  },
  commentsBoxTextPreview: {
    fontSize: 16,
    color: "#333",
  },
  infoValueText: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#333",
  },  
  modalWithKeyboard: {
    marginBottom: "50%",
  },
  modalWithoutKeyboard: {
    marginBottom: "30%",
  },
});

export default VaultScoreDisplay;
