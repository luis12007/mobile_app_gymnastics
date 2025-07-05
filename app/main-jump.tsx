export const unstable_settings = {
  unmountOnBlur: true,
};

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
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

import CustomNumberPadOptimized from "../components/CustomNumberPadOptimized";
import DebugPanel from "../components/DebugPanel";
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
var isMediumLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;

if (width >= 1368) {
  isLargeDevice = true;
} else if (width >= 1200 && width < 1368) {
  isMediumLargeDevice = true;
} else if (width >= 945 && width < 1200) {
  isSmallDevice = true;
} else if (width < 945) {
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

  /* Keyboard usestates - removed because CustomNumberPadOptimized handles everything internally */
  
  // Debug and warning states
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [saveWarning, setSaveWarning] = useState("");
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveAttempts, setSaveAttempts] = useState(0);

  // Debug logs
  const [logs, setLogs] = useState<Array<{ id: number; timestamp: string; level: string; message: string }>>([]);
  
  const clearLogs = () => {
    setLogs([]);
  };

  // Save warning and debugging functions
  const showSaveWarning = (message: string) => {
    setSaveWarning(message);
    setTimeout(() => setSaveWarning(""), 5000); // Clear warning after 5 seconds
  };

  const trackSaveAttempt = (success: boolean, operation: string) => {
    setSaveAttempts((prev) => prev + 1);
    if (success) {
      setLastSaveTime(new Date());
      setSaveWarning("");
    } else {
      showSaveWarning(`Failed to save ${operation}. Please check your connection.`);
    }
  };

  /* Define usestate */
  const [showNdModal, setShowNdModal] = useState(false);
  const [ndInput, setNdInput] = useState("");
  const [nd, setNd] = useState(0);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsInput, setCommentsInput] = useState("");
  const commentsInputRef = useRef<any>(null);

  const backButtonOpacity = useRef(new Animated.Value(0)).current;
  const backButtonTranslateX = useRef(new Animated.Value(50)).current;

  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [execution, setExecution] = useState(0);
  const [executionInput, setExecutionInput] = useState("");

  const [showDModal, setShowDModal] = useState(false);
  const [dInput, setDInput] = useState("");
  const [d, setD] = useState(0);

  const [showEModal, setShowEModal] = useState(false);
  const [eInput, setEInput] = useState("");
  const [e, setE] = useState(0);

  const [showNdModalcomp, setShowNdModalcomp] = useState(false);
  const [ndInputcomp, setNdInputcomp] = useState("");

  const [showSvModal, setShowSvModal] = useState(false);
  const [svInput, setSvInput] = useState("");

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
  const [showCvModal] = useState(false); // Not used in vault, but required by DebugPanel interface
  const [comments, setComments] = useState("");
  const [delt, setDelt] = useState(0);
  const [ded, setSetded] = useState(0);
  const [percentage, setpercentage] = useState(0);

  // Element counts and groups (vault-specific - simplified)
  const [elementCounts] = useState<{ [key: string]: { value: number; selected: boolean } }>({});
  const [elementGroupValues] = useState<{ [key: string]: number }>({});

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
          setGymnastBib(Number(mainRateGeneral.bib));
          setSv(mainRateGeneral.sv);
          setStartValue(mainRateGeneral.e2);
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

  /* Buttons un the bottom */

  const handleSelect = () => {
    router.replace(
      `/final-table?competenceId=${competenceId}&gymnastId=${discipline}&event=${event}&discipline=${discipline}&gymnast=${gymnastid}&number=${number}&participants=${participants}&folderId=${folderId}`
    );
  };

  const handlegobacklist = () => {
    router.replace       (
      `/start-gudging?id=${competenceId}&discipline=${discipline}&participants=${participants}&number=${number}&gymnast=${gymnastid}&folderId=${folderId}`
    ); // Pass the value as a query parameter
  };

  const handleGoForward = async () => {
    try {
      // Fetch all MainTable entries for the current competenceId

      if (number === participants) {
        router.replace(
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
          router.replace(
            `/main-jump?competenceId=${competenceId}&gymnastId=${discipline}&event=${nextTable?.event}&discipline=${discipline}&gymnast=${nextTable.id}&number=${nextTable.number}&participants=${participants}&folderId=${folderId}`
          );
        } else {
          router.replace(
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
          router.replace(
            `/main-jump?competenceId=${competenceId}&gymnastId=${discipline}&event=${previousTable?.event}&discipline=${discipline}&gymnast=${previousTable.id}&number=${previousTable.number}&participants=${participants}&folderId=${folderId}`
          );
        } else {
          router.replace(
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

    const truncated = Math.floor(newmyscore * 100) / 100;
    const truncatedStr = truncated.toFixed(2);
    const finalScore = parseFloat(truncatedStr + truncatedStr.charAt(truncatedStr.length - 1));

    setMyScore(finalScore);

    try {
      // Save the stickBonus value in MainRateGeneral
      const updateData: Partial<MainRateGeneral> = {
        stickBonus: value,
        myScore: finalScore,
      };
      console.log("Update Data:", updateData); // Debugging line
      console.log("Rate ID:", rateid); // Debugging line
      const success = await updateRateGeneral(rateid, updateData);

      if (success) {
        console.log(`Saved stickBonus = ${value} in MainRateGeneral.`);
        trackSaveAttempt(true, "stick bonus");
      } else {
        console.error(`Failed to save stickBonus in MainRateGeneral.`);
        trackSaveAttempt(false, "stick bonus");
      }
    } catch (error) {
      console.error("Error saving stickBonus to MainRateGeneral:", error);
      trackSaveAttempt(false, "stick bonus");
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

    setVaultDescription(value.description);


    updateRateGeneral(rateid, {
      vaultNumber: value.number,
      vaultDescription: value.description,
    }).then((success) => {
      if (success) {
        console.log("Vault number and description updated successfully.");
        trackSaveAttempt(true, "vault info");
      } else {
        console.error("Failed to update vault number and description.");
        trackSaveAttempt(false, "vault info");
      }
    }).catch((error) => {
      console.error("Error updating vault info:", error);
      trackSaveAttempt(false, "vault info");
    });

    updateMainTable(gymnastid, {
      e2: value.value,
    }).then((success) => {
      if (success) {
        console.log("Vault E2 updated successfully.");
        trackSaveAttempt(true, "vault E2");
      } else {
        console.error("Failed to update vault E2.");
        trackSaveAttempt(false, "vault E2");
      }
    }).catch((error) => {
      console.error("Error updating vault E2:", error);
      trackSaveAttempt(false, "vault E2");
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

  // Percentage table for discipline = true (current implementation)
  const percentageTableDisciplineTrue = [
    // 0.000 0.100 0.200 0.300 0.400 0.500 0.600 0.700 0.800 0.900 1.000 1.100 1.200 1.300 1.400 1.500 1.600
    [100, 75, 65, 55, 45, 35, 25, 15, 5, 0, 0, 0, 0, 0, 0, 0, 0], // 1: 0 - 0.40
    [100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0], // 2: > 0.40 - 0.60
    [100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0, 0], // 3: > 0.60 - 1.00
    [100, 100, 94, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0], // 4: > 1.00 - 1.50
    [100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0], // 5: > 1.50 - 2.00
    [100, 100, 100, 96, 88, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0], // 6: > 2.00 - 2.50
    [100, 100, 100, 100, 93, 87, 80, 70, 60, 50, 40, 30, 20, 0, 0, 0, 0], // 7: > 2.50
  ];

  // Percentage table for discipline = false (new implementation based on image)
  const percentageTableDisciplineFalse = [
    // 0.000 0.100 0.200 0.300 0.400 0.500 0.600 0.700 0.800 0.900 1.000 1.100 1.200 1.300 1.400 >1.400
    [100, 100, 75, 65, 55, 45, 35, 25, 15, 5, 0, 0, 0, 0, 0, 0], // 1: 0 - 0.40
    [100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0], // 2: > 0.40 - 0.60
    [100, 100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0], // 3: > 0.60 - 1.00
    [100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0], // 4: > 1.00 - 1.50
    [100, 100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0], // 5: > 1.50 - 2.00
    [100, 100, 100, 100, 95, 85, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0], // 6: > 2.00 - 2.50
    [100, 100, 100, 100, 100, 95, 85, 80, 70, 60, 50, 40, 30, 20, 10, 0], // 7: > 2.50
  ];

  const deltSteps = [
    0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5,
  ];

  /**
   * Calculate percentage from examination table based on discipline type
   * @param dedInterval - Deduction interval (1-7)
   * @param delt - Delta value (difference from expert deductions)
   * @returns Percentage value based on the appropriate table
   * 
   * When discipline = true: Uses the original percentage table
   * When discipline = false: Uses the new percentage table with different ranges
   */
  function getPercentageFromTable(dedInterval: number, delt: number): number {
    // Choose the appropriate table based on discipline
    const percentageTable = discipline 
      ? percentageTableDisciplineTrue 
      : percentageTableDisciplineFalse;

    if (delt > 1.4) return 0;
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Save Warning Banner */}
      {saveWarning ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ {saveWarning}</Text>
        </View>
      ) : null}
      
      {showNdCompModal && (
        <CustomNumberPadOptimized
          visible={showNdCompModal}
          value={ndInputcomp}
          onValueChange={(value) => {
            setNdInputcomp(value);
          }}
          onClose={(finalValue) => {
            console.log("ndInputcomp:", finalValue);

            // First check if finalValue exists and is not empty
            if (!finalValue || finalValue === "" || finalValue === ".") {
              Alert.alert("Invalid Input", "Please enter a ND value.", [
                { text: "OK" },
              ]);
              return;
            }

            // Handle case where input ends with "." - add "0"
            let processedInput = finalValue;
            if (finalValue.endsWith(".")) {
              processedInput = finalValue + "0";
            }

            // Make sure processedInput is a string before using replace
            const inputString = processedInput.toString();
            const num = parseFloat(inputString.replace(",", "."));

            if (!isNaN(num)) {
              const rounded = Math.round(num * 10) / 10;
              setNdInputcomp(rounded.toString());
              setndcomp(rounded);

              const compscorecalc = d + e + (sb ? 0.1 : 0.0) - rounded;
              const truncated = Math.floor(compscorecalc * 100) / 100;
              const truncatedStr = truncated.toFixed(2);
              const finalScore = parseFloat(
                truncatedStr + truncatedStr.charAt(truncatedStr.length - 1)
              );

              setScore(finalScore);
              updateRateGeneral(rateid, {
                compNd: rounded,
                compScore: finalScore,
              })
                .then((success) => {
                  if (success) {
                    console.log(
                      `Saved ndcomp = ${rounded} in MainRateGeneral.`
                    );
                    trackSaveAttempt(true, "comp ND score");
                  } else {
                    console.error(
                      `Failed to save ndcomp in MainRateGeneral.`
                    );
                    trackSaveAttempt(false, "comp ND score");
                  }
                })
                .catch((error) => {
                  console.error(
                    "Error saving ndcomp to MainRateGeneral:",
                    error
                  );
                  trackSaveAttempt(false, "comp ND score");
                });
            } else {
              Alert.alert(
                "Invalid Input",
                "Please enter a valid ND value.",
                [{ text: "OK" }]
              );
              return;
            }
            setShowNdCompModal(false);
          }}
          title="Enter ND Competition Value"
          allowDecimal={true}
          maxLength={4}
        />
      )}


{showSvModal && (
        <CustomNumberPadOptimized
          visible={showSvModal}
          value={svInput}
          onValueChange={(value) => {
            setSvInput(value);
          }}
          onClose={(finalValue) => {
            console.log("svInput:", finalValue);

            // First check if finalValue exists and is not empty
            if (!finalValue || finalValue === "" || finalValue === ".") {
              Alert.alert("Invalid Input", "Please enter a SV value.", [
                { text: "OK" },
              ]);
              return;
            }

            // Handle case where input ends with "." - add "0"
            let processedInput = finalValue;
            if (finalValue.endsWith(".")) {
              processedInput = finalValue + "0";
            }

            // Make sure processedInput is a string before using replace
            const inputString = processedInput.toString();
            const num = parseFloat(inputString.replace(",", "."));

            if (!isNaN(num)) {
              const rounded = Math.round(num * 10) / 10;
              setSv(rounded);
              setStartValue(rounded);
              const newmyscore = eScore + rounded + (stickbonus ? 0.1 : 0.0) - nd;
              const truncated = Math.floor(newmyscore * 100) / 100;
              const truncatedStr = truncated.toFixed(2);
              const finalScore = parseFloat(
                truncatedStr + truncatedStr.charAt(truncatedStr.length - 1)
              );

              setMyScore(finalScore);

              // Update database
              updateRateGeneral(rateid, { myScore: finalScore })
                .then((success) => {
                  trackSaveAttempt(success, "my score (SV)");
                })
                .catch((error) => {
                  console.error("Error saving my score:", error);
                  trackSaveAttempt(false, "my score (SV)");
                });
              updateMainTable(gymnastid, { sv: rounded })
                .then((success) => {
                  if (success) {
                    console.log(`Saved sv = ${rounded} in MainTable.`);
                    trackSaveAttempt(true, "SV value");
                  } else {
                    console.error(`Failed to save sv in MainTable.`);
                    trackSaveAttempt(false, "SV value");
                  }
                })
                .catch((error) => {
                  console.error("Error saving sv to MainTable:", error);
                  trackSaveAttempt(false, "SV value");
                });
            } else {
              Alert.alert(
                "Invalid Input",
                "Please enter a valid SV value.",
                [{ text: "OK" }]
              );
              return;
            }
            setShowSvModal(false);
          }}
          title="Enter Start Value"
          allowDecimal={true}
          maxLength={4}
        />
      )}

      {showEModal && (
        <CustomNumberPadOptimized
          visible={showEModal}
          value={eInput}
          onValueChange={(value) => {
            setEInput(value);
          }}
          onClose={(finalValue) => {
            console.log("eInput:", finalValue);

            // First check if finalValue exists and is not empty
            if (!finalValue || finalValue === "" || finalValue === ".") {
              Alert.alert("Invalid Input", "Please enter an E value.", [
                { text: "OK" },
              ]);
              return;
            }

            // Handle case where input ends with "." - add "0"
            let processedInput = finalValue;
            if (finalValue.endsWith(".")) {
              processedInput = finalValue + "0";
            }

            // Make sure processedInput is a string before using replace
            const inputString = processedInput.toString();
            const num = parseFloat(inputString.replace(",", "."));

            if (!isNaN(num)) {
              const rounded = Math.round(num * 1000) / 1000;
              setE(rounded);
              // Save to database
              const compscorecalc = d + rounded + (sb ? 0.1 : 0.0) - ndcomp;
              const truncated = Math.floor(compscorecalc * 100) / 100;
              const truncatedStr = truncated.toFixed(2);
              const finalScore = parseFloat(
                truncatedStr + truncatedStr.charAt(truncatedStr.length - 1)
              );

              setScore(finalScore);

              /* ============================================================== */
              const newdelt = Math.abs(Math.round((eScore - rounded) * 10) / 10);
              setDelt(newdelt);

              const newded = 10 - rounded;
              setSetded(Number(newded));

              const dedInterval = getDeductionIntervalValue(Number(newded));
              const percentageValue = getPercentageFromTable(
                dedInterval,
                newdelt
              );
              setpercentage(percentageValue);

              updateMainTable(gymnastid, {
                delt: newdelt,
                percentage: percentageValue,
              })
                .then((success) => {
                  trackSaveAttempt(success, "E score calculations");
                })
                .catch((error) => {
                  console.error("Error saving E score calculations:", error);
                  trackSaveAttempt(false, "E score calculations");
                });

              /* ============================================================== */
              updateRateGeneral(rateid, {
                compE: rounded,
                compScore: finalScore,
                ded: newded,
              })
                .then((success) => {
                  trackSaveAttempt(success, "comp E score");
                })
                .catch((error) => {
                  console.error("Error saving comp E score:", error);
                  trackSaveAttempt(false, "comp E score");
                });
            } else {
              Alert.alert(
                "Invalid Input",
                "Please enter a valid E value.",
                [{ text: "OK" }]
              );
              return;
            }
            setShowEModal(false);
          }}
          title="Enter E Score"
          allowDecimal={true}
          maxLength={5}
        />
      )}

      {showDModal && (
        <CustomNumberPadOptimized
          visible={showDModal}
          value={dInput}
          onValueChange={(value) => {
            setDInput(value);
          }}
          onClose={(finalValue) => {
            console.log("dInput:", finalValue);

            // First check if finalValue exists and is not empty
            if (!finalValue || finalValue === "" || finalValue === ".") {
              Alert.alert("Invalid Input", "Please enter a D value.", [
                { text: "OK" },
              ]);
              return;
            }

            // Handle case where input ends with "." - add "0"
            let processedInput = finalValue;
            if (finalValue.endsWith(".")) {
              processedInput = finalValue + "0";
            }

            // Make sure processedInput is a string before using replace
            const inputString = processedInput.toString();
            const num = parseFloat(inputString.replace(",", "."));

            if (!isNaN(num)) {
              const rounded = Math.round(num * 10) / 10;
              setD(rounded);

              const compscorecalc = rounded + e + (sb ? 0.1 : 0.0) - ndcomp;
              const truncated = Math.floor(compscorecalc * 100) / 100;
              const truncatedStr = truncated.toFixed(2);
              const finalScore = parseFloat(
                truncatedStr + truncatedStr.charAt(truncatedStr.length - 1)
              );

              setScore(finalScore);
              updateRateGeneral(rateid, {
                compD: rounded,
                compScore: finalScore,
              })
                .then((success) => {
                  trackSaveAttempt(success, "comp D score");
                })
                .catch((error) => {
                  console.error("Error saving comp D score:", error);
                  trackSaveAttempt(false, "comp D score");
                });
            } else {
              Alert.alert(
                "Invalid Input",
                "Please enter a valid D value.",
                [{ text: "OK" }]
              );
              return;
            }
            setShowDModal(false);
          }}
          title="Enter D Score"
          allowDecimal={true}
          maxLength={4}
        />
      )}


{showExecutionModal && (
        <CustomNumberPadOptimized
          visible={showExecutionModal}
          value={executionInput}
          onValueChange={(value) => {
            setExecutionInput(value);
          }}
          onClose={(finalValue) => {
            console.log("executionInput:", finalValue);

            // First check if finalValue exists and is not empty
            if (!finalValue || finalValue === "" || finalValue === ".") {
              Alert.alert("Invalid Input", "Please enter an Execution value.", [
                { text: "OK" },
              ]);
              return;
            }

            // Handle case where input ends with "." - add "0"
            let processedInput = finalValue;
            if (finalValue.endsWith(".")) {
              processedInput = finalValue + "0";
            }

            // Make sure processedInput is a string before using replace
            const inputString = processedInput.toString();
            const num = parseFloat(inputString.replace(",", "."));

            if (!isNaN(num)) {
              const rounded = Math.round(num * 10) / 10;
              setExecution(rounded);
              const eScore = Number((10 - rounded).toFixed(3));
              const newmyscore = eScore + sv + (stickbonus ? 0.1 : 0.0) - nd;
              const truncated = Math.floor(newmyscore * 100) / 100;
              const truncatedStr = truncated.toFixed(2);
              const finalScore = parseFloat(
                truncatedStr + truncatedStr.charAt(truncatedStr.length - 1)
              );

              setMyScore(finalScore);

              /* Lógica de delt existente */
              const newdelt = Math.abs(Math.round((eScore - e) * 10) / 10);
              setDelt(newdelt);

              const newded = 10 - e;
              setSetded(Number(newded));

              const dedInterval = getDeductionIntervalValue(Number(newded));
              const percentageValue = getPercentageFromTable(
                dedInterval,
                newdelt
              );
              setpercentage(percentageValue);

              updateMainTable(gymnastid, {
                delt: newdelt,
                percentage: percentageValue,
              })
                .then((success) => {
                  trackSaveAttempt(success, "execution calculations");
                })
                .catch((error) => {
                  console.error("Error saving execution calculations:", error);
                  trackSaveAttempt(false, "execution calculations");
                });

              setEScore(eScore);
              updateRateGeneral(rateid, {
                execution: rounded,
                eScore,
                myScore: finalScore,
              })
                .then((success) => {
                  trackSaveAttempt(success, "execution score");
                })
                .catch((error) => {
                  console.error("Error saving execution score:", error);
                  trackSaveAttempt(false, "execution score");
                });
            } else {
              Alert.alert(
                "Invalid Input",
                "Please enter a valid Execution value.",
                [{ text: "OK" }]
              );
              return;
            }
            setShowExecutionModal(false);
          }}
          title="Enter Execution Score"
          allowDecimal={true}
          maxLength={5}
        />
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
              style={{ fontWeight: "bold", fontSize: 12, marginBottom: 10 }}
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
                    const success = await updateRateGeneral(rateid, {
                      comments: commentsInput,
                    });
                    trackSaveAttempt(success, "comments");
                  } catch (error) {
                    console.error(
                      "Error saving comments to MainRateGeneral:",
                      error
                    );
                    trackSaveAttempt(false, "comments");
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
        <CustomNumberPadOptimized
          visible={showNdModal}
          value={ndInput}
          onValueChange={(value) => {
            setNdInput(value);
          }}
          onClose={(finalValue) => {
            console.log("ndInput:", finalValue);

            // First check if finalValue exists and is not empty
            if (!finalValue || finalValue === "" || finalValue === ".") {
              Alert.alert("Invalid Input", "Please enter a ND value.", [
                { text: "OK" },
              ]);
              return;
            }

            // Handle case where input ends with "." - add "0"
            let processedInput = finalValue;
            if (finalValue.endsWith(".")) {
              processedInput = finalValue + "0";
            }

            // Make sure processedInput is a string before using replace
            const inputString = processedInput.toString();
            const num = parseFloat(inputString.replace(",", "."));

            if (!isNaN(num)) {
              const rounded = Math.round(num * 10) / 10;
              setNd(rounded);
              const newmyscore = eScore + sv + (stickbonus ? 0.1 : 0.0) - rounded;
              const truncated = Math.floor(newmyscore * 100) / 100;
              const truncatedStr = truncated.toFixed(2);
              const finalScore = parseFloat(
                truncatedStr + truncatedStr.charAt(truncatedStr.length - 1)
              );

              setMyScore(finalScore);
              updateRateGeneral(rateid, { myScore: finalScore })
                .then((success) => {
                  trackSaveAttempt(success, "my score (ND)");
                })
                .catch((error) => {
                  console.error("Error saving my score:", error);
                  trackSaveAttempt(false, "my score (ND)");
                });

              // Save to database
              updateMainTable(gymnastid, { nd: rounded })
                .then((success) => {
                  if (success) {
                    console.log(`Saved nd = ${rounded} in MainTable.`);
                    trackSaveAttempt(true, "ND value");
                  } else {
                    console.error(`Failed to save nd in MainTable.`);
                    trackSaveAttempt(false, "ND value");
                  }
                })
                .catch((error) => {
                  console.error("Error saving nd to MainTable:", error);
                  trackSaveAttempt(false, "ND value");
                });
            } else {
              Alert.alert(
                "Invalid Input",
                "Please enter a valid ND value.",
                [{ text: "OK" }]
              );
              return;
            }
            setShowNdModal(false);
          }}
          title="Enter ND Value"
          allowDecimal={true}
          maxLength={4}
        />
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
        discipline={discipline}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Main Table */}
        <View style={styles.tableContainer}>
          {/* Header Row */}
          <View style={styles.tableRow}>
            <View style={styles.vaultNumbersCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderTextLarge : null,
                  isMediumLargeDevice ? styles.cellHeaderTextMediumLarge : null,
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
                  isLargeDevice ? styles.cellHeaderTextLarge : null,
                  isMediumLargeDevice ? styles.cellHeaderTextMediumLarge : null,
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
                  isLargeDevice ? styles.cellHeaderTextLarge : null,
                  isMediumLargeDevice ? styles.cellHeaderTextMediumLarge : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null,
                ]}
              >
                ND
              </Text>
            </View>
            {discipline && (
              <View style={styles.sbCell}>
                <Text
                  style={[
                    isLargeDevice ? styles.cellHeaderTextLarge : null,
                    isMediumLargeDevice ? styles.cellHeaderTextMediumLarge : null,
                    isSmallDevice ? styles.cellHeaderTextSmall : null,
                    isTinyDevice ? styles.cellHeaderTextTiny : null,
                  ]}
                >
                  SB
                </Text>
              </View>
            )}
            <View style={styles.executionCell}>
              <Text
                style={[
                  isLargeDevice ? styles.cellHeaderTextLarge : null,
                  isMediumLargeDevice ? styles.cellHeaderTextMediumLarge : null,
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
                  isLargeDevice ? styles.cellHeaderTextLarge : null,
                  isMediumLargeDevice ? styles.cellHeaderTextMediumLarge : null,
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
                  isLargeDevice ? styles.vaultValueTextLarge : null,
                  isMediumLargeDevice ? styles.vaultValueTextMediumLarge : null,
                  isSmallDevice ? styles.vaultValueTextSmall : null,
                  isTinyDevice ? styles.vaultValueTextTiny : null,
                ]}
              >
                {vaultnumber}
              </Text>
            </View>
            <TouchableOpacity
  style={[
    styles.emptyBlueCell,
    {
      width: isLargeDevice
        ? 210
        : isMediumLargeDevice
        ? 180
        : isSmallDevice
        ? 160
        : 110,
      justifyContent: "center",
      alignItems: "center",
    },
  ]}
  onPress={() => {
    setSvInput(sv.toFixed(1)); // Set current value before opening modal
    setShowSvModal(true);
  }}
>
  <Text
    style={[
      isLargeDevice ? styles.svValueTextLarge : null,
      isMediumLargeDevice ? styles.svValueTextMediumLarge : null,
      isSmallDevice ? styles.svValueTextSmall : null,
      isTinyDevice ? styles.svValueTextTiny : null,
    ]}
  >
    {sv.toFixed(1)}
  </Text>
</TouchableOpacity>
            <TouchableOpacity
  style={styles.ndValueCell}
  onPress={() => {
    setNdInput(nd.toFixed(1)); // Set current value before opening modal
    setShowNdModal(true);
  }}
>
  <Text
    style={[
      isLargeDevice ? styles.valueTextLarge : null,
      isMediumLargeDevice ? styles.valueTextMediumLarge : null,
      isSmallDevice ? styles.valueTextSmall : null,
      isTinyDevice ? styles.valueTextTiny : null,
    ]}
  >
    {nd.toFixed(1)}
  </Text>            </TouchableOpacity>
            {discipline && (
              <View style={styles.sbValueCell}>
                <Text
                  style={[
                    isLargeDevice ? styles.valueTextLarge : null,
                    isMediumLargeDevice ? styles.valueTextMediumLarge : null,
                    isSmallDevice ? styles.valueTextSmall : null,
                    isTinyDevice ? styles.valueTextTiny : null,
                  ]}
                >
                  {stickbonus ? "0.1" : "0.0"}
                </Text>
              </View>
            )}
            <View style={styles.executionValueCellflex}>
              <View style={styles.executionValueCell}>
                <Text
                  style={[
                    isLargeDevice ? styles.valueTextLarge : null,
                    isMediumLargeDevice ? styles.valueTextMediumLarge : null,
                    isSmallDevice ? styles.valueTextSmall : null,
                    isTinyDevice ? styles.valueTextTiny : null,
                  ]}
                >
                  <TouchableOpacity
  onPress={() => {
    setExecutionInput(execution.toFixed(1)); // Set current value before opening modal
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
                    isLargeDevice ? styles.valueTextLarge : null,
                    isMediumLargeDevice ? styles.valueTextMediumLarge : null,
                    isSmallDevice ? styles.valueTextSmall : null,
                    isTinyDevice ? styles.valueTextTiny : null,
                  ]}
                >
                  <Text
                    style={[
                      isLargeDevice ? styles.scoreValueTextLarge : null,
                      isMediumLargeDevice
                        ? styles.scoreValueTextMediumLarge
                        : null,
                      isSmallDevice ? styles.scoreValueTextSmall : null,
                      isTinyDevice ? styles.scoreValueTextTiny : null,
                    ]}
                  >
                    {eScore.toFixed(3)}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.myScoreValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.scoreValueTextLarge : null,
                  isMediumLargeDevice ? styles.scoreValueTextMediumLarge : null,
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
                  isLargeDevice ? styles.cellHeaderTextLarge : null,
                  isMediumLargeDevice ? styles.cellHeaderTextMediumLarge : null,
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
                  isLargeDevice ? styles.cellHeaderTextLarge : null,
                  isMediumLargeDevice ? styles.cellHeaderTextMediumLarge : null,
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
                  isLargeDevice ? styles.compDeductionTextLarge : null,
                  isMediumLargeDevice
                    ? styles.compDeductionTextMediumLarge
                    : null,
                  isSmallDevice ? styles.compDeductionTextSmall : null,
                  isTinyDevice ? styles.compDeductionTextTiny : null,
                ]}
              >
                COMPETITION
              </Text>
              <Text
                style={[
                  isLargeDevice ? styles.compDeductionTextLarge : null,
                  isMediumLargeDevice
                    ? styles.compDeductionTextMediumLarge
                    : null,
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
                  isLargeDevice ? styles.smallCellTextLarge : null,
                  isMediumLargeDevice ? styles.smallCellTextMediumLarge : null,
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
                  isLargeDevice ? styles.smallValueTextLarge : null,
                  isMediumLargeDevice ? styles.smallValueTextMediumLarge : null,
                  isSmallDevice ? styles.smallValueTextSmall : null,
                  isTinyDevice ? styles.smallValueTextTiny : null,
                ]}
              >
                <TouchableOpacity
  onPress={() => {
    setDInput(d.toFixed(1)); // Set current value before opening modal
    setShowDModal(true);
  }}
>
  <Text
    style={[
      isLargeDevice ? styles.dValueTextLarge : null,
      isMediumLargeDevice ? styles.dValueTextMediumLarge : null,
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
                  isLargeDevice ? styles.smallCellTextLarge : null,
                  isMediumLargeDevice ? styles.smallCellTextMediumLarge : null,
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
                  isLargeDevice ? styles.smallValueTextLarge : null,
                  isMediumLargeDevice ? styles.smallValueTextMediumLarge : null,
                  isSmallDevice ? styles.smallValueTextSmall : null,
                  isTinyDevice ? styles.smallValueTextTiny : null,
                ]}
              >
                <TouchableOpacity
  onPress={() => {
    setEInput(e.toFixed(3)); // Set current value before opening modal
    setShowEModal(true);
  }}
>
  <Text
    style={[
      isLargeDevice ? styles.eValueTextLarge : null,
      isMediumLargeDevice ? styles.eValueTextMediumLarge : null,
      isSmallDevice ? styles.eValueTextSmall : null,
      isTinyDevice ? styles.eValueTextTiny : null,
    ]}
  >
    {e.toFixed(3)}
  </Text>
</TouchableOpacity>
              </Text>
            </View>
            {discipline && (
              <>
                <View style={styles.sdCell}>
                  <Text
                    style={[
                      isLargeDevice ? styles.smallCellTextLarge : null,
                      isMediumLargeDevice ? styles.smallCellTextMediumLarge : null,
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
                      isLargeDevice ? styles.smallValueTextLarge : null,
                      isMediumLargeDevice ? styles.smallValueTextMediumLarge : null,
                      isSmallDevice ? styles.smallValueTextSmall : null,
                      isTinyDevice ? styles.smallValueTextTiny : null,
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        const newValue = !sb;
                        setSb(newValue);
                        const compscorecalc =
                          d + e + (newValue ? 0.1 : 0.0) - ndcomp;
                        const truncated = Math.floor(compscorecalc * 100) / 100;
const truncatedStr = truncated.toFixed(2);
const finalScore = parseFloat(truncatedStr + truncatedStr.charAt(truncatedStr.length - 1));

setScore(finalScore);
                        updateRateGeneral(rateid, {
                          compSd: newValue ? 0.1 : 0.0,
                          compScore: finalScore,
                        })
                          .then((success) => {
                            trackSaveAttempt(success, "stick bonus");
                          })
                          .catch((error) => {
                            console.error("Error saving stick bonus:", error);
                            trackSaveAttempt(false, "stick bonus");
                          });
                      }}
                    >
                      <Text
                        style={[
                          isLargeDevice ? styles.sdValueTextLarge : null,
                          isMediumLargeDevice
                            ? styles.sdValueTextMediumLarge
                            : null,
                          isSmallDevice ? styles.sdValueTextSmall : null,
                          isTinyDevice ? styles.sdValueTextTiny : null,
                        ]}
                      >
                        {sb ? "0.1" : "0.0"}
                      </Text>
                    </TouchableOpacity>
                  </Text>
                </View>
              </>
            )}
            <View style={styles.ndDeductionCell}>
              <Text
                style={[
                  isLargeDevice ? styles.smallCellTextLarge : null,
                  isMediumLargeDevice ? styles.smallCellTextMediumLarge : null,
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
                  isLargeDevice ? styles.smallValueTextLarge : null,
                  isMediumLargeDevice ? styles.smallValueTextMediumLarge : null,
                  isSmallDevice ? styles.smallValueTextSmall : null,
                  isTinyDevice ? styles.smallValueTextTiny : null,
                ]}
              >
                <TouchableOpacity
  onPress={() => {
    setNdInputcomp(ndcomp.toFixed(1)); // Set current value before opening modal
    setShowNdCompModal(true);
  }}
>
  <Text
    style={[
      isLargeDevice ? styles.ndValueTextLarge : null,
      isMediumLargeDevice
        ? styles.ndValueTextMediumLarge
        : null,
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
                  isLargeDevice ? styles.ScoresmallCellTextLarge : null,
                  isMediumLargeDevice
                    ? styles.ScoresmallCellTextMediumLarge
                    : null,
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
                  isLargeDevice ? styles.smallValueTextLarge : null,
                  isMediumLargeDevice ? styles.smallValueTextMediumLarge : null,
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
                  isLargeDevice ? styles.startValueValueTextLarge : null,
                  isMediumLargeDevice
                    ? styles.startValueValueTextMediumLarge
                    : null,
                  isSmallDevice ? styles.startValueValueTextSmall : null,
                  isTinyDevice ? styles.startValueValueTextTiny : null,
                ]}
              >
                {startValue.toFixed(1)}
              </Text>
            </View>
            <View style={styles.descriptionValueCell}>
              <Text
                style={[
                  isLargeDevice ? styles.descriptionValueTextLarge : null,
                  isMediumLargeDevice
                    ? styles.descriptionValueTextMediumLarge
                    : null,
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
                  isLargeDevice ? styles.gymnastInfoTextLarge : null,
                  isMediumLargeDevice
                    ? styles.gymnastInfoTextMediumLarge
                    : null,
                  isSmallDevice ? styles.gymnastInfoTextSmall : null,
                  isTinyDevice ? styles.gymnastInfoTextTiny : null,
                ]}
              >
                GYMNAST
              </Text>
              <Text
                style={[
                  isLargeDevice ? styles.gymnastInfoTextLarge : null,
                  isMediumLargeDevice
                    ? styles.gymnastInfoTextMediumLarge
                    : null,
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
                  isLargeDevice ? styles.neutralTextLarge : null,
                  isMediumLargeDevice ? styles.neutralTextMediumLarge : null,
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
                  isLargeDevice ? styles.neutralTextLarge : null,
                  isMediumLargeDevice ? styles.neutralTextMediumLarge : null,
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
                  isLargeDevice ? styles.neutralTextLarge : null,
                  isMediumLargeDevice ? styles.neutralTextMediumLarge : null,
                  isSmallDevice ? styles.neutralTextSmall : null,
                  isTinyDevice ? styles.neutralTextTiny : null,
                ]}
              >
                {gymnastEvent}
              </Text>
            </View>
            <View style={styles.neutralTotalCell}>
              <Text
                style={[
                  isLargeDevice ? styles.neutralTotalTextLarge : null,
                  isMediumLargeDevice
                    ? styles.neutralTotalTextMediumLarge
                    : null,
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

        {/* Debug Panel */}
        <DebugPanel
          showDebugPanel={showDebugPanel}
          setShowDebugPanel={setShowDebugPanel}
          currentPath="/main-jump"
          competenceId={competenceId}
          event={event}
          number={number}
          participants={participants}
          folderId={folderId}
          discipline={discipline}
          gymnastid={gymnastid}
          gymnastName={gymnastName}
          gymnastNoc={gymnastNoc}
          gymnastBib={String(gymnastBib)}
          gymnastEvent={gymnastEvent}
          rateid={rateid}
          totalElements={totalElements}
          difficultyValues={difficultyValues}
          elementGroupsTotal={elementGroupsTotal}
          cv={cv}
          sv={sv}
          nd={nd}
          stickbonus={stickbonus}
          execution={execution}
          eScore={eScore}
          myScore={myScore}
          score={score}
          delt={delt}
          ded={ded}
          percentage={percentage}
          elementCounts={elementCounts}
          elementGroupValues={elementGroupValues}
          d={d}
          e={e}
          ndcomp={ndcomp}
          sb={sb}
          saveAttempts={saveAttempts}
          lastSaveTime={lastSaveTime}
          saveWarning={saveWarning}
          showCvModal={showCvModal}
          showNdModal={showNdModal}
          showExecutionModal={showExecutionModal}
          showCommentsModal={showCommentsModal}
          showDModal={showDModal}
          showEModal={showEModal}
          showNdCompModal={showNdCompModal}
          showSvModal={showSvModal}
          vaultnumber={vaultnumber}
          vaultDescription={vaultDescription}
          startValue={startValue}
          gender={gender}
          showmodalmag={showmodalmag}
          showmodalwag={showmodalwag}
          comments={comments}
          logs={logs}
          clearLogs={clearLogs}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0e0e0",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  tableContainer: {
    width: "100%",
  },

  // Table row styles based on device size
  tableRow: {
    flexDirection: "row",
    height: isLargeDevice
      ? 55
      : isMediumLargeDevice
      ? 50
      : isSmallDevice
      ? 45
      : 35,
  },

  // Dynamic cell widths and styles based on device size
  vaultNumbersCell: {
    width: isLargeDevice
      ? 700
      : isMediumLargeDevice
      ? 600
      : isSmallDevice
      ? 500
      : 400,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    paddingLeft: 10,
    borderWidth: 1,
    borderColor: "black",
  },

  svValueCell: {
    width: isLargeDevice
      ? 210
      : isMediumLargeDevice
      ? 180
      : isSmallDevice
      ? 160
      : 110,
    backgroundColor: "#ffca28",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  ndCell: {
    width: isLargeDevice
      ? 105
      : isMediumLargeDevice
      ? 90
      : isSmallDevice
      ? 80
      : 60,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  sbCell: {
    width: isLargeDevice
      ? 105
      : isMediumLargeDevice
      ? 90
      : isSmallDevice
      ? 80
      : 60,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  executionCell: {
    width: isLargeDevice
      ? 210
      : isMediumLargeDevice
      ? 180
      : isSmallDevice
      ? 160
      : 120,
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
    width: isLargeDevice
      ? 700
      : isMediumLargeDevice
      ? 600
      : isSmallDevice
      ? 500
      : 300,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
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
    width: isLargeDevice
      ? 105
      : isMediumLargeDevice
      ? 90
      : isSmallDevice
      ? 80
      : 60,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  sbValueCell: {
    width: isLargeDevice
      ? 105
      : isMediumLargeDevice
      ? 90
      : isSmallDevice
      ? 80
      : 60,
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
    width: isLargeDevice
      ? 210
      : isMediumLargeDevice
      ? 180
      : isSmallDevice
      ? 160
      : 120,
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

  startValueCell: {
    width: isLargeDevice
      ? 250
      : isMediumLargeDevice
      ? 220
      : isSmallDevice
      ? 180
      : 120,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  descriptionCell: {
    width: isLargeDevice
      ? 450
      : isMediumLargeDevice
      ? 380
      : isSmallDevice
      ? 320
      : 180,
    backgroundColor: "#64b5f6",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  compDeductionHeaderCell: {
    width: isLargeDevice
      ? 210
      : isMediumLargeDevice
      ? 180
      : isSmallDevice
      ? 160
      : 110,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  dCell: {
    flex: 0.5,
    backgroundColor: "#A3A3A3",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  dValueCell: {
    flex: 0.5,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
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
    width: isLargeDevice
      ? 250
      : isMediumLargeDevice
      ? 220
      : isSmallDevice
      ? 180
      : 120,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  descriptionValueCell: {
    width: isLargeDevice
      ? 450
      : isMediumLargeDevice
      ? 380
      : isSmallDevice
      ? 320
      : 180,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  gymnastInfoCell: {
    width: isLargeDevice
      ? 210
      : isMediumLargeDevice
      ? 180
      : isSmallDevice
      ? 160
      : 110,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  neutralValueCell: {
    flex: 0.5,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  neutralValueCellname: {
    flex: 2.0,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  neutralTotalCell: {
    flex: 0.5,
    backgroundColor: "rgb(150, 150, 150)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  // Cell header text styles
  cellHeaderTextLarge: {
    fontSize: 25,
    fontWeight: "bold",
    alignSelf: "center",
    color: "#000",
  },
  cellHeaderTextMediumLarge: {
    fontSize: 12,
    fontWeight: "bold",
    alignSelf: "center",
    color: "#000",
  },
  cellHeaderTextSmall: {
    fontSize: 12,
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

  // Vault value text styles
  vaultValueTextLarge: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  vaultValueTextMediumLarge: {
    fontSize: 18,
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

  // SV value text styles
  svValueTextLarge: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    alignSelf: "center",
    justifyContent: "center",
    paddingTop: 6,
  },
  svValueTextMediumLarge: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    alignSelf: "center",
    justifyContent: "center",
    paddingTop: 5,
  },
  svValueTextSmall: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    alignSelf: "center",
    height: "100%",
    paddingTop: 5,
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

  // Value text styles
  valueTextLarge: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  valueTextMediumLarge: {
    fontSize: 18,
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

  // Score value text styles
  scoreValueTextLarge: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  scoreValueTextMediumLarge: {
    fontSize: 12,
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

  // Competition deduction text styles
  compDeductionTextLarge: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
    textAlign: "left",
    alignSelf: "flex-end",
    paddingRight: 10,
  },
  compDeductionTextMediumLarge: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000",
    textAlign: "left",
    alignSelf: "flex-end",
    paddingRight: 9,
  },
  compDeductionTextSmall: {
    fontSize: 8,
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

  // Small cell text styles
  smallCellTextLarge: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  smallCellTextMediumLarge: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
  },
  smallCellTextSmall: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
  },
  smallCellTextTiny: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
  },

  // Small value text styles
  smallValueTextLarge: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },
  smallValueTextMediumLarge: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
  },
  smallValueTextSmall: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
  },
  smallValueTextTiny: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
  },

  // Score small cell text styles
  ScoresmallCellTextLarge: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  ScoresmallCellTextMediumLarge: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#000",
  },
  ScoresmallCellTextSmall: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#000",
  },
  ScoresmallCellTextTiny: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
  },

  // ND value text styles
  ndValueTextLarge: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  ndValueTextMediumLarge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  ndValueTextSmall: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  ndValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },

  // SD value text styles
  sdValueTextLarge: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  sdValueTextMediumLarge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  sdValueTextSmall: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  sdValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },

  // E value text styles
  eValueTextLarge: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  eValueTextMediumLarge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  eValueTextSmall: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  eValueTextTiny: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },

  // D value text styles
  dValueTextLarge: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  dValueTextMediumLarge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  dValueTextSmall: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  dValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },

  // Start value text styles
  startValueValueTextLarge: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  startValueValueTextMediumLarge: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },
  startValueValueTextSmall: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },
  startValueValueTextTiny: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },

  // Description value text styles
  descriptionValueTextLarge: {
    fontSize: 14,
    color: "#000",
  },
  descriptionValueTextMediumLarge: {
    fontSize: 10,
    color: "#000",
  },
  descriptionValueTextSmall: {
    fontSize: 10,
    color: "#000",
  },
  descriptionValueTextTiny: {
    fontSize: 18,
    color: "#000",
  },

  // Gymnast info text styles
  gymnastInfoTextLarge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    alignSelf: "flex-end",
    paddingRight: 10,
  },
  gymnastInfoTextMediumLarge: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    alignSelf: "flex-end",
    paddingRight: 9,
  },
  gymnastInfoTextSmall: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    alignSelf: "flex-end",
    paddingRight: 8,
  },
  gymnastInfoTextTiny: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    alignSelf: "flex-end",
    paddingRight: 5,
  },

  // Neutral text styles
  neutralTextLarge: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTextMediumLarge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTextSmall: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTextTiny: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },

  // Neutral total text styles
  neutralTotalTextLarge: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTotalTextMediumLarge: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTotalTextSmall: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
  },
  neutralTotalTextTiny: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },

  // Comments section
  commentsSection: {
    padding: 10,
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

  // Button styles
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    marginTop: isLargeDevice
      ? 30
      : isMediumLargeDevice
      ? 25
      : isSmallDevice
      ? 20
      : 15,
  },
  backButton: {
    flex: 3,
    backgroundColor: "#0052b4",
    padding: isLargeDevice
      ? 15
      : isMediumLargeDevice
      ? 13
      : isSmallDevice
      ? 12
      : 10,
    borderRadius: 5,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
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
  nextButton: {
    flex: 3,
    backgroundColor: "#0052b4",
    padding: isLargeDevice
      ? 15
      : isMediumLargeDevice
      ? 13
      : isSmallDevice
      ? 12
      : 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
  },

  // Modal and input styles
  infoValueText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  modalWithKeyboard: {
    marginBottom: "50%",
  },
  modalWithoutKeyboard: {
    marginBottom: "30%",
  },

  // Warning banner styles
  warningBanner: {
    backgroundColor: "#ffecb3",
    borderBottomColor: "#ffc107",
    borderBottomWidth: 2,
    padding: 12,
    alignItems: "center",
  },
  warningText: {
    color: "#e65100",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default VaultScoreDisplay;
