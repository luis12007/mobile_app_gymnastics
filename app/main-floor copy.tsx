export const unstable_settings = {
  unmountOnBlur: true,
};
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
import WhiteboardScreen from "../components/WhiteboardScreen";
import DebugPanel from "../components/DebugPanel";

import CustomNumberPadOptimized from "../components/CustomNumberPadOptimized";
import {
  getMainTableById,
  getMainTablesByCompetenceId,
  getRateGeneralByTableId,
  updateMainTable,
  updateRateGeneral,
} from "../Database/database";

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
  bib: string;
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

interface JudgingTableProps {
  onBack: () => void;
  onMainTable: () => void;
  onNext: () => void;
  judgingData?: {
    numberOfElements: number;
    difficultyValues: number;
    elementGroups: {
      I: number;
      II: number;
      III: number;
      IV: number;
      V: number;
    };
    elementGroupsTotal: number;
    cv: number;
    stickBonus: number;
    nd: number;
    sv: number;
    execution: number;
    eScore: number;
    myScore: number;
    compDeduction: {
      D: number;
      E: number;
      SD: string;
      ND: string;
    };
    neutral: {
      overtime: string;
      line: string;
      other: string;
      total: string;
    };
    comments: string;
  };
}

const GymnasticsJudgingTable: React.FC<JudgingTableProps> = ({
  onBack,
  onMainTable,
  onNext,
  judgingData = {
    numberOfElements: 0,
    difficultyValues: 0.8,
    elementGroups: {
      I: 0.5,
      II: 0.5,
      III: 0.5,
      IV: 0.5,
      V: 0.5,
    },
    elementGroupsTotal: 0.0,
    cv: 0.0,
    stickBonus: 0.0,
    nd: 0.0,
    sv: 2.0,
    execution: 0.0,
    eScore: 10.0,
    myScore: 12.0,
    compDeduction: {
      D: 0.0,
      E: 0.0,
      SD: "##",
      ND: "##",
    },
    neutral: {
      overtime: "Text1",
      line: "Text2",
      other: "Text3",
      total: "0.0",
    },
    comments: "",

  
  },
}) => {
  // Animated values for Go Back button
  const backButtonOpacity = useRef(new Animated.Value(0)).current;
  const backButtonTranslateX = useRef(new Animated.Value(50)).current;

  const router = useRouter();

  const params = useLocalSearchParams();
  const discipline = params.discipline === "true";
  const participants = params.participants;
  const event = params.event;
  const competenceId = params.competenceId;
  const number = params.number;
  const gymnastid = params.gymnast ? Number(params.gymnast) : 0;
  const folderId = params.folderId;

  const [showCvModal, setShowCvModal] = useState(false);
  const [cvInput, setCvInput] = useState("");

  const [nd, setNd] = useState(0.0);

  const [showDModal, setShowDModal] = useState(false);
  const [dInput, setDInput] = useState("");
  const [d, setD] = useState(0);

  const [showEModal, setShowEModal] = useState(false);
  const [eInput, setEInput] = useState("");
  const [e, setE] = useState(0);

  const [showNdModal, setShowNdModal] = useState(false);
  const [ndInput, setNdInput] = useState("");
  const [ndInputcomp, setNdInputcomp] = useState("");

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsInput, setCommentsInput] = useState("");
  const commentsInputRef = useRef<any>(null);

  // Handlers optimizados para CustomNumberPadOptimized
  function handleNdCompValueChange(value: string) {
    setNdInputcomp(value);
  }

  function handleNdCompClose(finalValue: string) {
    console.log("ndInputcomp:", finalValue);
    if (!finalValue || finalValue === "" || finalValue === ".") {
      Alert.alert("Invalid Input", "Please enter a ND value.", [
        { text: "OK" },
      ]);
      return;
    }
    let processedInput = finalValue;
    if (finalValue.endsWith(".")) {
      processedInput = finalValue + "0";
    }
    const inputString = processedInput.toString();
    const num = parseFloat(inputString.replace(",", "."));
    if (!isNaN(num)) {
      const rounded = safeRound(num, 1);
      setNdInputcomp(rounded.toString());
      setndcomp(rounded);
      let compscorecalc = d + e + (sb ? 0.1 : 0.0) - rounded;
      const finalScore = Math.round(compscorecalc * 1000) / 1000;
      setScore(finalScore);
      const newdelt = Math.abs(Math.round((eScore - e) * 10) / 10);
      setDelt(newdelt);
      const newded = 10 - e;
      setSetded(Number(newded));
      const dedInterval = getDeductionIntervalValue(Number(newded));
      const percentageValue = getPercentageFromTable(dedInterval, newdelt);
      setpercentage(percentageValue);
      updateMainTable(gymnastid, { delt: newdelt, percentage: percentageValue });
      updateRateGeneral(rateid, { compNd: rounded, compScore: finalScore })
        .then((success) => {
          if (success) {
            console.log(`Saved ndcomp = ${rounded} in MainRateGeneral.`);
          } else {
            console.error(`Failed to save ndcomp in MainRateGeneral.`);
          }
        })
        .catch((error) => {
          console.error("Error saving ndcomp to MainRateGeneral:", error);
        });
    } else {
      Alert.alert("Invalid Input", "Please enter a valid ND value.", [{ text: "OK" }]);
      return;
    }
    setShowNdCompModal(false);
  }

  function handleEValueChange(value: string) {
    setEInput(value);
  }

  function handleEClose(finalValue: string) {
    console.log("eInput:", finalValue);
    if (!finalValue || finalValue === "" || finalValue === ".") {
      Alert.alert("Invalid Input", "Please enter an E value.", [
        { text: "OK" },
      ]);
      return;
    }
    let processedInput = finalValue;
    if (finalValue.endsWith(".")) {
      processedInput = finalValue + "0";
    }
    const inputString = processedInput.toString();
    const num = parseFloat(inputString.replace(",", "."));
    if (!isNaN(num)) {
      const rounded = safeRound(num, 3);
      setE(rounded);
      let compscorecalc = d + rounded + (sb ? 0.1 : 0.0) - ndcomp;
      const finalScore = Math.round(compscorecalc * 1000) / 1000;
      setScore(finalScore);
      const newdelt = Math.abs(Math.round((eScore - rounded) * 10) / 10);
      setDelt(newdelt);
      const newded = 10 - rounded;
      setSetded(Number(newded));
      const dedInterval = getDeductionIntervalValue(Number(newded));
      const percentageValue = getPercentageFromTable(dedInterval, newdelt);
      setpercentage(percentageValue);
      updateMainTable(gymnastid, { delt: newdelt, percentage: percentageValue });
      updateRateGeneral(rateid, { compE: rounded, compScore: finalScore, ded: newded })
        .then((success) => {
          if (success) {
            console.log(`Saved e = ${rounded} in MainTable.`);
          } else {
            console.error(`Failed to save e in MainTable.`);
          }
        })
        .catch((error) => {
          console.error("Error saving e to MainTable:", error);
        });
    } else {
      Alert.alert("Invalid Input", "Please enter a valid E value.", [{ text: "OK" }]);
      return;
    }
    setShowEModal(false);
  }

  function handleDValueChange(value: string) {
    setDInput(value);
  }

  function handleDClose(finalValue: string) {
    console.log("dInput:", finalValue);
    if (!finalValue || finalValue === "" || finalValue === ".") {
      Alert.alert("Invalid Input", "Please enter a D value.", [
        { text: "OK" },
      ]);
      return;
    }
    let processedInput = finalValue;
    if (finalValue.endsWith(".")) {
      processedInput = finalValue + "0";
    }
    const inputString = processedInput.toString();
    const num = parseFloat(inputString.replace(",", "."));
    if (!isNaN(num)) {
      const rounded = safeRound(num, 1);
      setD(rounded);
      let compscorecalc = rounded + e + (sb ? 0.1 : 0.0) - ndcomp;
      const finalScore = Math.round(compscorecalc * 1000) / 1000;
      setScore(finalScore);
      const newdelt = Math.abs(Math.round((eScore - e) * 10) / 10);
      setDelt(newdelt);
      const newded = 10 - e;
      setSetded(Number(newded));
      const dedInterval = getDeductionIntervalValue(Number(newded));
      const percentageValue = getPercentageFromTable(dedInterval, newdelt);
      setpercentage(percentageValue);
      updateMainTable(gymnastid, { delt: newdelt, percentage: percentageValue });
      updateRateGeneral(rateid, { compD: rounded, compScore: finalScore, ded: newded })
        .then((success) => {
          if (success) {
            console.log(`Saved d = ${rounded} in MainTable.`);
          } else {
            console.error(`Failed to save d in MainTable.`);
          }
        })
        .catch((error) => {
          console.error("Error saving d to MainTable:", error);
        });
    } else {
      Alert.alert("Invalid Input", "Please enter a valid D value.", [{ text: "OK" }]);
      return;
    }
    setShowDModal(false);
  }

  function handleNdValueChange(value: string) {
    setNdInput(value);
  }

  function handleNdClose(finalValue: string) {
    console.log("ndInput:", finalValue);
    if (!finalValue || finalValue === "" || finalValue === ".") {
      Alert.alert("Invalid Input", "Please enter a ND value.", [
        { text: "OK" },
      ]);
      return;
    }
    let processedInput = finalValue;
    if (finalValue.endsWith(".")) {
      processedInput = finalValue + "0";
    }
    const inputString = processedInput.toString();
    const num = parseFloat(inputString.replace(",", "."));
    if (!isNaN(num)) {
      const rounded = safeRound(num, 1);
      setNd(rounded);
      let newmyscore = eScore + sv + (stickbonus ? 0.1 : 0.0) - rounded;
      const finalScore = Math.round(newmyscore * 1000) / 1000;
      setMyScore(finalScore);
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
    } else {
      Alert.alert("Invalid Input", "Please enter a valid ND value.", [{ text: "OK" }]);
      return;
    }
    setShowNdModal(false);
  }

  function handleExecutionValueChange(value: string) {
    setExecutionInput(value);
  }

  function handleExecutionClose(finalValue: string) {
    console.log("executionInput:", finalValue);
    if (!finalValue || finalValue === "" || finalValue === ".") {
      Alert.alert("Invalid Input", "Please enter an Execution value.", [
        { text: "OK" }]);
      return;
    }
    let processedInput = finalValue;
    if (finalValue.endsWith(".")) {
      processedInput = finalValue + "0";
    }
    const inputString = processedInput.toString();
    const num = parseFloat(inputString.replace(",", "."));
    if (!isNaN(num)) {
      const rounded = safeRound(num, 1);
      setExecution(rounded);
      const newEScore = Number((10 - rounded).toFixed(3));
      setEScore(newEScore);
      let rawScore = newEScore + sv + (stickbonus ? 0.1 : 0.0) - nd;
      const finalScore = Math.round(rawScore * 1000) / 1000;
      setMyScore(finalScore);
      const newdelt = Math.abs(Math.round((newEScore - e) * 10) / 10);
      setDelt(newdelt);
      const newded = 10 - e;
      setSetded(Number(newded));
      const dedInterval = getDeductionIntervalValue(Number(newded));
      const percentageValue = getPercentageFromTable(dedInterval, newdelt);
      setpercentage(percentageValue);
      updateMainTable(gymnastid, { delt: newdelt, percentage: percentageValue })
        .then((mainTableSuccess) => {
          if (mainTableSuccess) {
            console.log(`Successfully saved delt = ${newdelt} and percentage = ${percentageValue} to MainTable from execution modal.`);
          } else {
            console.error(`Failed to save delt and percentage to MainTable from execution modal.`);
          }
        })
        .catch((error) => {
          console.error("Error saving to MainTable from execution modal:", error);
        });
      updateRateGeneral(rateid, { execution: rounded, eScore: newEScore, myScore: finalScore, ded: newded })
        .then((success) => {
          if (success) {
            console.log(`Saved execution = ${rounded} and percentage = ${percentageValue} in database.`);
          } else {
            console.error(`Failed to save execution in database.`);
          }
        })
        .catch((error) => {
          console.error("Error saving execution to database:", error);
        });
    } else {
      Alert.alert("Invalid Input", "Please enter a valid Execution value.", [{ text: "OK" }]);
      return;
    }
    setShowExecutionModal(false);
  }
  
  

  // Element selection state structure
  const [elementCounts, setElementCounts] = useState<{
    [key: string]: { value: number; selected: boolean };
  }>({
    J: { value: 0, selected: false },
    I: { value: 0, selected: false },
    H: { value: 0, selected: false },
    G: { value: 0, selected: false },
    F: { value: 0, selected: false },
    E: { value: 0, selected: false },
    D: { value: 0, selected: false },
    C: { value: 0, selected: false },
    B: { value: 0, selected: false },
    A: { value: 0, selected: false },
  });
  // Add at the top of your component
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  // Track the total elements
  const [totalElements, setTotalElements] = useState(0);
  const [rateid, setRateId] = useState(0);
  const [stickbonus, setStickBonus] = useState(false);
  const [difficultyValues, setDifficultyValues] = useState(0);
  const [gymnastName, setGymnastName] = useState("");
  const [gymnastNoc, setGymnastNoc] = useState("");
  const [gymnastBib, setGymnastBib] = useState("");
  const [gymnastEvent, setGymnastEvent] = useState("");
  const [elementGroupsTotal, setElementGroupsTotal] = useState(0);
  const [cv, setCv] = useState(0.0);
  const [myScore, setMyScore] = useState(0);
  const [sv, setSv] = useState(0);
  const [execution, setExecution] = useState(0);
  const [executionInput, setExecutionInput] = useState("");
  const [eScore, setEScore] = useState(0);
  const [score, setScore] = useState(0);
  const [sb, setSb] = useState(judgingData.compDeduction.SD === "0.1");
  const [ndcomp, setndcomp] = useState(0);
  const [showNdCompModal, setShowNdCompModal] = useState(false);
  const [comments, setComments] = useState("");
  const [delt, setDelt] = useState(0);
  const [ded, setSetded] = useState(0);
  const [percentage, setpercentage] = useState(0);

  // Debug and warning states
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [saveWarning, setSaveWarning] = useState("");
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveAttempts, setSaveAttempts] = useState(0);
  const [logs, setLogs] = useState<Array<{id: number, timestamp: string, level: string, message: string}>>([]);

  const [showDropdown, setShowDropdown] = useState<{ [key: string]: boolean }>({
    I: false,
    II: false,
    III: false,
    IV: false,
  });

  const [showElementGroupModal, setShowElementGroupModal] = useState<{
    [key: string]: boolean;
  }>({
    I: false,
    II: false,
    III: false,
    IV: false,
  });

  const [elementGroupValues, setElementGroupValues] = useState({
    I: 0.0,
    II: 0.0,
    III: 0.0,
    IV: 0.0,
  });

  // Optimized helper functions for better performance
  const formatValueForInput = React.useMemo(() => (value: number, decimals: number = 1): string => {
    if (value === 0) return "0";
    if (value % 1 === 0) return value.toString();
    const formatted = value.toFixed(decimals);
    return formatted.replace(/\.?0+$/, '') || "0";
  }, []);

  // Optimized safe round using bitwise operations for common cases
  const safeRound = React.useMemo(() => (num: number, decimals: number = 1): number => {
    if (decimals === 1) return Math.round(num * 10) / 10;
    if (decimals === 2) return Math.round(num * 100) / 100;
    if (decimals === 3) return Math.round(num * 1000) / 1000;
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  }, []);

  // Optimized string to number conversion with memoization
  const safeStringToNumber = React.useMemo(() => (value: string): number => {
    if (!value || value === '.' || value === '') return 0;
    
    // Pre-process the string in one go
    const cleanValue = value.endsWith('.') 
      ? value + '0' 
      : value.replace(',', '.');
    
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
  }, []);

  const adjustScoreFor99 = (score: number): number => {
    // Round to 3 decimal places first to handle floating point precision issues
    const roundedScore = Math.round(score * 1000) / 1000;
    
    // Convert to string with 3 decimal places to check precisely
    const scoreStr = roundedScore.toFixed(3);
    
    console.log("Original score:", score, "Rounded score:", roundedScore, "Score string:", scoreStr);
    
    // Check if it ends with x99 specifically (like 9.699, 12.899, etc.)
    // This regex matches: digit.digit99 (e.g., 9.699, 12.899) but NOT 9.639, 9.669
    const endsWithX99Pattern = /\d\.\d99$/;
    
    if (endsWithX99Pattern.test(scoreStr)) {
      // Add 0.001 to round up to next hundredth
      const adjustedScore = roundedScore + 0.001;
      console.log("Score ends with x99 pattern, adjusting from", roundedScore, "to", adjustedScore);
      return adjustedScore;
    }
    
    console.log("Score does not match x99 pattern, no adjustment needed");
    return roundedScore;
  };

  const handleStickBonusChange = async (value: boolean) => {
    setStickBonus(value);
    
    // Calculate the raw score first
    let rawScore = eScore + sv + (value ? 0.1 : 0.0) - nd;
    console.log("Raw myScore calculation:", eScore, "+", sv, "+", (value ? 0.1 : 0.0), "-", nd, "=", rawScore);
    


    const finalScore = Math.round(rawScore * 1000) / 1000;
    
    console.log("Final myScore:", finalScore);
    setMyScore(finalScore);

    try {
      // Save the stickBonus value in MainRateGeneral
      const updateData: Partial<MainRateGeneral> = {
        stickBonus: value,
        myScore: finalScore,
      };
      console.log("updateData:", updateData);
      console.log("rateid:", rateid);
      if (rateid) {
        updateRateGeneral(rateid, updateData).then((success) => {
          trackSaveAttempt(success, "stick bonus");
          if (success) {
            console.log(`Saved stickBonus in MainRateGeneral.`);
          } else {
            console.error(`Failed to save stickBonus in MainRateGeneral.`);
          }
        });
      } else {
        showSaveWarning("No rate ID available. Cannot save stick bonus.");
      }
    } catch (error) {
      console.error("Error saving stickBonus to MainRateGeneral:", error);
    }
  };

  // Fetch MainTable data and populate elementCounts
  useEffect(() => {
    const fetchMainRateGeneral = async () => {
      try {
        const mainTable = await getMainTableById(gymnastid); // Fetch data by gymnastid
        console.log("MainGeneral data:", mainTable); // Debugging line
        /* getting rate table with the mainrategeneral id */
        if (mainTable) {
          const mainRateGeneralId = mainTable.id;
          const rateTable = await getRateGeneralByTableId(mainRateGeneralId);
          console.log("Rate Table data:", rateTable); // Debugging line
          setElementCounts({
            J: {
              value: mainTable.j || 0,
              selected: mainTable.j > 0,
            },
            I: {
              value: mainTable.i || 0,
              selected: mainTable.i > 0,
            },
            H: {
              value: mainTable.h || 0,
              selected: mainTable.h > 0,
            },
            G: {
              value: mainTable.g || 0,
              selected: mainTable.g > 0,
            },
            F: {
              value: mainTable.f || 0,
              selected: mainTable.f > 0,
            },
            E: {
              value: mainTable.e || 0,
              selected: mainTable.e > 0,
            },
            D: {
              value: mainTable.d || 0,
              selected: mainTable.d > 0,
            },
            C: {
              value: mainTable.c || 0,
              selected: mainTable.c > 0,
            },
            B: {
              value: mainTable.b || 0,
              selected: mainTable.b > 0,
            },
            A: {
              value: mainTable.a || 0,
              selected: mainTable.a > 0,
            },
          });
          setGymnastName(mainTable.name);
          setGymnastNoc(mainTable.noc);
          setGymnastBib(mainTable.bib);
          setGymnastEvent(mainTable.event);
          setSv(mainTable.sv);
          setCv(mainTable.cv);
          setNd(mainTable.nd);
          setDelt(mainTable.delt);
          setpercentage(mainTable.percentage);
          if (rateTable) {
            setTotalElements(rateTable.numberOfElements);
            setRateId(rateTable.id);
            setStickBonus(rateTable.stickBonus);
            setDifficultyValues(rateTable.difficultyValues);
            setElementGroupsTotal(rateTable.elementGroups5);
            setExecution(rateTable.execution);
            setEScore(rateTable.eScore);
            setMyScore(rateTable.myScore);
            setD(rateTable.compD);
            setScore(rateTable.compScore);
            setE(rateTable.compE);
            setSb(rateTable.compSd === 0.1);
            setndcomp(rateTable.compNd);
            setComments(rateTable.comments);
            setSetded(rateTable.ded);

            // Check if all element groups are 0.0 and set defaults
            const loadedValues = {
              I: rateTable.elementGroups1 || 0.0,
              II: rateTable.elementGroups2 || 0.0,
              III: rateTable.elementGroups3 || 0.0,
              IV: rateTable.elementGroups4 || 0.0,
            };

            /* const allAreZero = Object.values(loadedValues).every(
              (value) => value === 0.0
            ) && rateTable.execution === 0 && rateTable.eScore === 0 && 
            rateTable.compD === 0 && rateTable.compE === 0 && 
            rateTable.compNd === 0 && rateTable.compScore === 0 && 
            mainTable.cv === 0 && mainTable.nd === 0; */
            const allAreZero = rateTable.execution === 0 && rateTable.eScore === 0 && 
            rateTable.compD === 0 && rateTable.compE === 0 && 
            rateTable.compNd === 0 && rateTable.compScore === 0 && 
            mainTable.cv === 0 && mainTable.nd === 0;

            if (allAreZero) {
              // Set defaults when all values are zero
              const defaultValues = {
                I: 0.5,
                II: 0.5,
                III: 0.5,
                IV: 0.5,
              };
              setElementGroupValues(defaultValues);

              // Save the default values to database immediately
              const updateData: Partial<MainRateGeneral> = {
                elementGroups1: 0.5,
                elementGroups2: 0.5,
                elementGroups3: 0.5,
                elementGroups4: 0.5,
                elementGroups5: 2.0, // Total of 0.5 * 4
              };

              updateRateGeneral(rateTable.id, updateData).then((success) => {
                if (success) {
                  console.log(
                    "Saved default element group values to database"
                  );
                  // Update local state with new values
                  const newTotal = 2.0;
                  setElementGroupsTotal(newTotal);
                  
                  // Update SV and myScore with new total
                  const newSv = rateTable.difficultyValues + newTotal + mainTable.cv;
                  setSv(newSv);
                  const newmyscore =
                    rateTable.eScore +
                    newSv +
                    (rateTable.stickBonus ? 0.1 : 0.0) -
                    mainTable.nd;
                  const finalScore = Math.round(newmyscore * 1000) / 1000;
                  setMyScore(finalScore);

                  // Update MainTable with new SV
                  updateMainTable(gymnastid, {
                    sv: newSv,
                  });
                  updateRateGeneral(rateTable.id, { myScore: finalScore });
                } else {
                  console.error("Failed to save default element group values");
                }
              });
            } else {
              // Not all zero - use loaded values
              setElementGroupValues(loadedValues);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching MainRateGeneral data:", error);
      }
    };

    fetchMainRateGeneral();
  }, [gymnastid]); // Re-fetch data when gymnastid changes

  // Save warning and debugging functions
  const showSaveWarning = (message: string) => {
    setSaveWarning(message);
    setTimeout(() => setSaveWarning(""), 5000); // Clear warning after 5 seconds
  };

  const trackSaveAttempt = (success: boolean, operation: string) => {
    setSaveAttempts(prev => prev + 1);
    if (success) {
      setLastSaveTime(new Date());
      setSaveWarning("");
    } else {
      showSaveWarning(`Failed to save ${operation}. Please check your connection.`);
    }
  };

  // Log capture functionality
  const addLog = (level: string, message: string) => {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep only last 100 logs
  };

  // Log clearing function
  const clearLogs = () => {
    setLogs([]);
  };

  // Setup log interception
  useEffect(() => {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    // Override console methods to capture logs
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      addLog('LOG', message);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      addLog('ERROR', message);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      addLog('WARN', message);
      originalWarn.apply(console, args);
    };

    console.info = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      addLog('INFO', message);
      originalInfo.apply(console, args);
    };

    // Cleanup function to restore original console methods
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  // Add this callback to calculate the element groups total whenever the values change
  useEffect(() => {
    const total =
      elementGroupValues.I +
      elementGroupValues.II +
      elementGroupValues.III +
      elementGroupValues.IV;
    // You might want to update this in your state or database
    console.log("Element groups total:", total);

    // Save the total to the database
    const saveElementGroupsTotal = async () => {
      try {
        const updateData: Partial<MainRateGeneral> = {
          elementGroups1: elementGroupValues.I,
          elementGroups2: elementGroupValues.II,
          elementGroups3: elementGroupValues.III,
          elementGroups4: elementGroupValues.IV,
        };

        const success = await updateRateGeneral(rateid, updateData);
        trackSaveAttempt(success, "element groups total");

        if (success) {
          console.log(`Saved element groups total in MainRateGeneral.`);
        } else {
          console.error(
            `Failed to save element groups total in MainRateGeneral.`
          );
        }
      } catch (error) {
        console.error(
          "Error saving element groups total to MainRateGeneral:",
          error
        );
      }
    };

    if (rateid) {
      saveElementGroupsTotal();
    }
  }, [elementGroupValues, rateid]);

  // Function to toggle dropdown visibility
  // Hacer el modal más rápido usando el estado funcional
  const toggleModal = (group: string) => {
    setShowElementGroupModal((prev) => ({
      I: group === "I" ? !prev.I : false,
      II: group === "II" ? !prev.II : false,
      III: group === "III" ? !prev.III : false,
      IV: group === "IV" ? !prev.IV : false,
    }));
  };
  // Function to select a value from dropdown
  const selectValue = async (group: string, value: number) => {
    const updated = { ...elementGroupValues, [group]: value };
    const total = updated.I + updated.II + updated.III + updated.IV;

    setElementGroupValues((prev) => {
      const updated = { ...prev, [group]: value };
      return updated;
    });

    // Close the modal after selection
    setShowElementGroupModal((prev) => ({
      ...prev,
      [group]: false,
    }));

    try {
      console.log(`Element groups total:`, total);

      const updateData: Partial<MainRateGeneral> = {
        [`elementGroups${
          group === "I"
            ? "1"
            : group === "II"
            ? "2"
            : group === "III"
            ? "3"
            : "4"
        }`]: value,
      };

      const success = await updateRateGeneral(rateid, updateData);
      trackSaveAttempt(success, `element group ${group}`);

      setElementGroupsTotal(total);
      setSv(total + difficultyValues + cv);
      const newsv = total + difficultyValues + cv;
      
      // Calculate raw score first
      let rawScore = eScore + (total + difficultyValues + cv) + (stickbonus ? 0.1 : 0.0) - nd;
      console.log("Raw myScore calculation (element groups):", eScore, "+", newsv, "+", (stickbonus ? 0.1 : 0.0), "-", nd, "=", rawScore);
      

      
      const finalScore = Math.round(rawScore * 1000) / 1000;

      console.log("Final myScore (element groups):", finalScore);
      setMyScore(finalScore);

      const updateData2: Partial<MainRateGeneral> = {
        elementGroups5: total,
        myScore: finalScore,
      };

      const successmaintable = await updateMainTable(gymnastid, { sv: newsv });

      if (successmaintable) {
        console.log(`Saved sv in MainTable.`);
      } else {
        console.error(`Failed to save sv in MainTable.`);
      }

      const success2 = await updateRateGeneral(rateid, updateData2);
      trackSaveAttempt(success2, "my score and element groups total");
      if (success2) {
        console.log(`Saved element groups total in MainRateGeneral.`);
      } else {
        console.error(
          `Failed to save element groups total in MainRateGeneral.`
        );
      }

      if (success) {
        console.log(
          `Saved element group ${group} = ${value} in MainRateGeneral.`
        );
      } else {
        console.error(
          `Failed to save element group ${group} in MainRateGeneral.`
        );
      }
    } catch (error) {
      console.error(
        `Error saving element group ${group} to MainRateGeneral:`,
        error
      );
    }
  };

  // Lock para evitar condiciones de carrera en clics rápidos
  const [isSavingElement, setIsSavingElement] = useState(false);
  const toggleButton = async (row: string, num: number) => {
    if (isSavingElement) return; // Evita múltiples guardados simultáneos
    setIsSavingElement(true);

    setElementCounts((prev) => {
      const newCounts = { ...prev };
      if (newCounts[row].selected && newCounts[row].value === num) {
        newCounts[row] = { value: 0, selected: false };
      } else {
        newCounts[row] = { value: num, selected: true };
      }
      const sum = Object.values(newCounts).reduce(
        (acc, item) => (item.selected ? acc + item.value : acc),
        0
      );
      setTotalElements(sum);
      // Guardar usando el nuevo estado
      (async () => {
        // Calcula difficulty y valores relacionados
        const difficulty =
          newCounts.A.value * 0.1 +
          newCounts.B.value * 0.2 +
          newCounts.C.value * 0.3 +
          newCounts.D.value * 0.4 +
          newCounts.E.value * 0.5 +
          newCounts.F.value * 0.6 +
          newCounts.G.value * 0.7 +
          newCounts.H.value * 0.8 +
          newCounts.I.value * 0.9 +
          newCounts.J.value * 1.0;
        setDifficultyValues(difficulty);
        setSv(difficulty + elementGroupsTotal + cv);
        let rawScore = eScore + (difficulty + elementGroupsTotal + cv) + (stickbonus ? 0.1 : 0.0) - nd;
        let adjustedScore = adjustScoreFor99(rawScore);
        const finalScore = Math.round(adjustedScore * 1000) / 1000;
        setMyScore(finalScore);
        const updateData = {
          [row.toLowerCase()]: newCounts[row].value,
          sv: difficulty + elementGroupsTotal + cv,
        };
        const updateratetable = {
          numberOfElements: sum,
          difficultyValues: difficulty,
          myScore: finalScore,
        };
        try {
          const success = await updateMainTable(gymnastid, updateData);
          const successratetable = await updateRateGeneral(rateid, updateratetable);
          if (successratetable) {
            console.log(`Saved ${sum} and difficulty ${difficulty} in RateTable.`);
          } else {
            console.error(`Failed to save ${sum} or difficulty in RateTable.`);
          }
          if (success) {
            console.log(`Saved ${newCounts[row].value} for row ${row} in MainTable.`);
          } else {
            console.error(`Failed to save ${newCounts[row].value} for row ${row} in MainTable.`);
          }
        } catch (error) {
          console.error("Error saving to MainTable:", error);
        } finally {
          setIsSavingElement(false);
        }
      })();
      return newCounts;
    });
  };

  // Generate number buttons (1-9, 0) for each row
  const renderNumberButtons = (rowLabel: string) => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
    const isRowSelected = elementCounts[rowLabel].selected;
    const selectedValue = elementCounts[rowLabel].value;

    // Calculate the sum of all selected values except the current row
    const sumOtherRows = Object.entries(elementCounts)
      .filter(([label]) => label !== rowLabel)
      .reduce((acc, [, item]) => (item.selected ? acc + item.value : acc), 0);

    return (
      <View style={styles.tableRow}>
        <View
          style={[
            styles.labelCell,
            isRowSelected ? styles.labelCellSelected : null,
          ]}
        >
          <Text style={styles.labelText}>{rowLabel}</Text>
        </View>
        {numbers.map((num) => {
          // If this button is already selected, always allow it
          const isSelected = isRowSelected && selectedValue === num;
          // Block if sum with this value would exceed 8 and it's not the selected value
          const wouldExceed = sumOtherRows + num > 8;
          const isDisabled = !isSelected && wouldExceed;

          return (
            <TouchableOpacity
              key={`${rowLabel}-${num}`}
              style={[
                styles.numberCell,
                isSelected
                  ? styles.numberActive
                  : isDisabled
                  ? { backgroundColor: "#ccc" }
                  : styles.numberInactive,
              ]}
              onPress={() => !isDisabled && toggleButton(rowLabel, num)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.numberText,
                  isSelected && styles.numberActiveText,
                  isDisabled && { color: "#888" },
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Selected number display */}
        <View
          style={[
            styles.selectedCell,
            isRowSelected
              ? styles.selectedCellActive
              : styles.selectedCellInactive,
          ]}
        >
          <Text style={styles.selectedCellText}>
            {isRowSelected ? `${selectedValue}` : "0"}
          </Text>
        </View>

        <View
          style={[
            styles.selectedCell,
            isRowSelected
              ? styles.selectedCellActive
              : styles.selectedCellInactive,
          ]}
        >
          <Text style={styles.selectedCellText}>{rowLabel}</Text>
        </View>
      </View>
    );
  };

  const handleSelect = () => {
    router.replace(
      `/final-table?competenceId=${competenceId}&gymnastId=${discipline}&event=${event}&discipline=${discipline}&gymnast=${gymnastid}&number=${number}&participants=${participants}&folderId=${folderId}`
    );
  };

  const handlegobacklist = () => {
    router.replace(
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

  const [isScrollEnabled, setIsScrollEnabled] = useState(true); // State to control scrolling

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

  // Percentage table for discipline = true (MAG)
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

  // Percentage table for discipline = false (WAG)
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

  /**
   * Calculate percentage from examination table based on discipline type
   * @param dedInterval - Deduction interval (1-7)
   * @param delt - Delta value (difference from expert deductions)
   * @returns Percentage value based on the appropriate table
   * 
   * When discipline = true (MAG): Uses the original percentage table
   * When discipline = false (WAG): Uses the new percentage table with different ranges
   */
  function getPercentageFromTable(dedInterval: number, delt: number): number {
    // Choose the appropriate table based on discipline
    const currentPercentageTable = discipline 
      ? percentageTableDisciplineTrue 
      : percentageTableDisciplineFalse;

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
    return currentPercentageTable[dedInterval - 1][deltIndex] || 0;
  }

  // Optimized CV handlers for better performance
  const handleCvInputChange = React.useCallback((value: string) => {
    setCvInput(value);
  }, []);

  const calculateCvScore = React.useCallback((cvValue: number) => {
    const newSv = cvValue + difficultyValues + elementGroupsTotal;
    let rawScore = eScore + newSv + (stickbonus ? 0.1 : 0.0) - nd;
    

    
    const finalScore = Math.round(rawScore * 1000) / 1000;
    
    return { newSv, finalScore };
  }, [difficultyValues, elementGroupsTotal, eScore, stickbonus, nd, adjustScoreFor99]);

  const handleCvClose = React.useCallback(async (finalValue?: string) => {
    // Cerrar el modal inmediatamente para una experiencia instantánea
    setShowCvModal(false);

    // El resto de la lógica se ejecuta de forma asíncrona
    setTimeout(async () => {
      console.log("CV Modal onClose - finalValue received:", finalValue);
      if (!finalValue || finalValue === "" || finalValue === ".") {
        // Validación: no mostrar alert aquí porque el modal ya se cerró
        return;
      }

      // Use optimized conversion
      const num = safeStringToNumber(finalValue);
      const rounded = safeRound(num, 1);

      console.log("CV Modal - Processing optimized:", {
        finalValue,
        parsedNum: num,
        safeRounded: rounded
      });

      // Batch state updates for mejor performance
      const { newSv, finalScore } = calculateCvScore(rounded);
      setCv(rounded);
      setSv(newSv);
      setMyScore(finalScore);

      try {
        // Batch database updates for mejor performance
        const [mainTableSuccess, rateGeneralSuccess] = await Promise.all([
          updateMainTable(gymnastid, { cv: rounded, sv: newSv }),
          updateRateGeneral(rateid, { myScore: finalScore })
        ]);

        trackSaveAttempt(mainTableSuccess && rateGeneralSuccess, "CV value");
        if (mainTableSuccess && rateGeneralSuccess) {
          console.log(`CV saved successfully: ${rounded}`);
        } else {
          console.error("Failed to save CV value");
        }
      } catch (error) {
        console.error("Error saving CV to database:", error);
      }
    }, 0);
  }, [safeStringToNumber, safeRound, calculateCvScore, gymnastid, rateid, trackSaveAttempt]);

  // Estado de carga para mostrar el modal hasta que todo esté listo
  const [isLoading, setIsLoading] = React.useState(true);




  // Memoizar el callback para que la referencia no cambie
  const handleLoaded = React.useCallback(() => setIsLoading(false), []);

  if (isLoading) {
    return (
      <>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0052b4" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </SafeAreaView>
        {/* WhiteboardScreen se monta aunque esté el loading, pero oculto visualmente */}
        <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
          <WhiteboardScreen
            rateGeneralId={0}
            tableId={gymnastid}
            stickBonus={stickbonus}
            setStickBonusset={handleStickBonusChange}
            percentage={percentage}
            discipline={discipline}
            event={gymnastEvent}
            onLoaded={handleLoaded}
          />
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Save Warning Banner */}
      {saveWarning ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ {saveWarning}</Text>
        </View>
      ) : null}
      
      {/* Element Group Modals */}
      {Object.keys(showElementGroupModal).map((group) => (
        <Modal
          key={group}
          transparent
          visible={showElementGroupModal[group]}
          animationType="fade"
          onRequestClose={() =>
            setShowElementGroupModal((prev) => ({ ...prev, [group]: false }))
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                Select Element Group {group}
              </Text>
              <ScrollView style={styles.modalScrollView}>
                {(group === "IV"
                  ? (() => {
                      if (discipline && gymnastEvent === "FX") {
                        return [0.0, 0.3, 0.5];
                      } else if (
                        !discipline &&
                        (gymnastEvent === "FX" ||
                          gymnastEvent === "UB" ||
                          gymnastEvent === "BB")
                      ) {
                        return [0.0, 0.5];
                      } else if (
                        discipline &&
                        (gymnastEvent === "PH" ||
                          gymnastEvent === "SR" ||
                          gymnastEvent === "PB" ||
                          gymnastEvent === "HB")
                      ) {
                        return [
                          0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
                          1.1,
                        ];
                      } else {
                        return [
                          0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
                          1.1,
                        ];
                      }
                    })()
                  : discipline
                  ? [0.0, 0.3, 0.5]
                  : [0.0, 0.5]
                ).map((value) => (
                  <TouchableOpacity
                    key={`${group}-${value}`}
                    style={[
                      styles.modalItem,
                      elementGroupValues[group as keyof typeof elementGroupValues] === value &&
                        styles.modalItemSelected,
                    ]}
                    onPress={() => selectValue(group, value)}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        elementGroupValues[group as keyof typeof elementGroupValues] === value &&
                          styles.modalItemTextSelected,
                      ]}
                    >
                      {value.toFixed(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() =>
                  setShowElementGroupModal((prev) => ({
                    ...prev,
                    [group]: false,
                  }))
                }
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ))}

      {showNdCompModal && (
        <CustomNumberPadOptimized
          visible={showNdCompModal}
          value={ndInputcomp}
          onValueChange={(value) => {
            setNdInputcomp(value);
          }}
          onClose={(finalValue) => {
            // Cerrar el modal inmediatamente
            setShowNdCompModal(false);
            setTimeout(() => {
              // Submit logic asíncrono
              console.log("ndInputcomp:", finalValue);
              if (!finalValue || finalValue === "" || finalValue === ".") {
                return;
              }
              let processedInput = finalValue;
              if (finalValue.endsWith(".")) {
                processedInput = finalValue + "0";
              }
              const inputString = processedInput.toString();
              const num = parseFloat(inputString.replace(",", "."));
              if (!isNaN(num)) {
                const rounded = safeRound(num, 1);
                setNdInputcomp(rounded.toString());
                setndcomp(rounded);
                let compscorecalc = d + e + (sb ? 0.1 : 0.0) - rounded;
                const finalScore = Math.round(compscorecalc * 1000) / 1000;
                setScore(finalScore);
                const newdelt = Math.abs(Math.round((eScore - e) * 10) / 10);
                setDelt(newdelt);
                const newded = 10 - e;
                setSetded(Number(newded));
                const dedInterval = getDeductionIntervalValue(Number(newded));
                const percentageValue = getPercentageFromTable(dedInterval, newdelt);
                setpercentage(percentageValue);
                updateMainTable(gymnastid, { delt: newdelt, percentage: percentageValue });
                updateRateGeneral(rateid, { compNd: rounded, compScore: finalScore });
              }
            }, 0);
          }}
          title="Enter ND Value"
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
            setShowEModal(false);
            setTimeout(() => {
              // Submit logic for E modal asíncrono
              console.log("eInput:", finalValue);
              if (!finalValue || finalValue === "" || finalValue === ".") {
                return;
              }
              let processedInput = finalValue;
              if (finalValue.endsWith(".")) {
                processedInput = finalValue + "0";
              }
              const inputString = processedInput.toString();
              const num = parseFloat(inputString.replace(",", "."));
              if (!isNaN(num)) {
                const rounded = safeRound(num, 3);
                setE(rounded);
                let compscorecalc = d + rounded + (sb ? 0.1 : 0.0) - ndcomp;
                const finalScore = Math.round(compscorecalc * 1000) / 1000;
                setScore(finalScore);
                const newdelt = Math.abs(Math.round((eScore - rounded) * 10) / 10);
                setDelt(newdelt);
                const newded = 10 - rounded;
                setSetded(Number(newded));
                const dedInterval = getDeductionIntervalValue(Number(newded));
                const percentageValue = getPercentageFromTable(dedInterval, newdelt);
                setpercentage(percentageValue);
                updateMainTable(gymnastid, { delt: newdelt, percentage: percentageValue });
                updateRateGeneral(rateid, { compE: rounded, compScore: finalScore, ded: newded });
              }
            }, 0);
          }}
          title="Enter E Value"
          allowDecimal={true}
          maxLength={6}
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

      {showDModal && (
        <CustomNumberPadOptimized
          visible={showDModal}
          value={dInput}
          onValueChange={(value) => {
            setDInput(value);
          }}
          onClose={(finalValue) => {
            setShowDModal(false);
            setTimeout(() => {
              console.log("dInput:", finalValue);
              if (!finalValue || finalValue === "" || finalValue === ".") {
                return;
              }
              let processedInput = finalValue;
              if (finalValue.endsWith(".")) {
                processedInput = finalValue + "0";
              }
              const inputString = processedInput.toString();
              const num = parseFloat(inputString.replace(",", "."));
              if (!isNaN(num)) {
                const rounded = safeRound(num, 1);
                setD(rounded);
                let compscorecalc = rounded + e + (sb ? 0.1 : 0.0) - ndcomp;
                const finalScore = Math.round(compscorecalc * 1000) / 1000;
                setScore(finalScore);
                const newdelt = Math.abs(Math.round((eScore - e) * 10) / 10);
                setDelt(newdelt);
                const newded = 10 - e;
                setSetded(Number(newded));
                const dedInterval = getDeductionIntervalValue(Number(newded));
                const percentageValue = getPercentageFromTable(dedInterval, newdelt);
                setpercentage(percentageValue);
                updateMainTable(gymnastid, { delt: newdelt, percentage: percentageValue });
                updateRateGeneral(rateid, { compD: rounded, compScore: finalScore, ded: newded });
              }
            }, 0);
          }}
          title="Enter D Value"
          allowDecimal={true}
          maxLength={4}
        />
      )}

      {showNdModal && (
        <CustomNumberPadOptimized
          visible={showNdModal}
          value={ndInput}
          onValueChange={(value) => {
            setNdInput(value);
          }}
          onClose={(finalValue) => {
            setShowNdModal(false);
            setTimeout(() => {
              console.log("ndInput:", finalValue);
              if (!finalValue || finalValue === "" || finalValue === ".") {
                return;
              }
              let processedInput = finalValue;
              if (finalValue.endsWith(".")) {
                processedInput = finalValue + "0";
              }
              const inputString = processedInput.toString();
              const num = parseFloat(inputString.replace(",", "."));
              if (!isNaN(num)) {
                const rounded = safeRound(num, 1);
                setNd(rounded);
                let newmyscore = eScore + sv + (stickbonus ? 0.1 : 0.0) - rounded;
                const finalScore = Math.round(newmyscore * 1000) / 1000;
                setMyScore(finalScore);
                updateMainTable(gymnastid, { nd: rounded });
              }
            }, 0);
          }}
          title="Enter ND Value"
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
            setShowExecutionModal(false);
            setTimeout(() => {
              console.log("executionInput:", finalValue);
              if (!finalValue || finalValue === "" || finalValue === ".") {
                return;
              }
              let processedInput = finalValue;
              if (finalValue.endsWith(".")) {
                processedInput = finalValue + "0";
              }
              const inputString = processedInput.toString();
              const num = parseFloat(inputString.replace(",", "."));
              if (!isNaN(num)) {
                const rounded = safeRound(num, 1);
                setExecution(rounded);
                const eScoreCalc = Number((10 - rounded).toFixed(3));
                setEScore(eScoreCalc);
                let rawScore = eScoreCalc + sv + (stickbonus ? 0.1 : 0.0) - nd;
                const finalScore = Math.round(rawScore * 1000) / 1000;
                setMyScore(finalScore);
                const newdelt = Math.abs(Math.round((eScoreCalc - e) * 10) / 10);
                setDelt(newdelt);
                const newded = 10 - e;
                setSetded(Number(newded));
                const dedInterval = getDeductionIntervalValue(Number(newded));
                const percentageValue = getPercentageFromTable(dedInterval, newdelt);
                setpercentage(percentageValue);
                updateMainTable(gymnastid, { delt: newdelt, percentage: percentageValue });
                updateRateGeneral(rateid, { execution: rounded, eScore: eScoreCalc, myScore: finalScore, ded: newded });
              }
            }, 0);
          }}
          title="Enter Execution Value"
          allowDecimal={true}
          maxLength={4}
        />
      )}

      {showCvModal && (
        <CustomNumberPadOptimized
          visible={showCvModal}
          value={cvInput}
          onValueChange={handleCvInputChange}
          onClose={handleCvClose}
          title="Enter CV Value"
          allowDecimal={true}
          maxLength={4}
        />
      )}

      {/* <ModalVaultMag
          rateGeneralId={0}
          tableId={gymnastid}
          stickBonus={stickbonus}
          setStickBonus={handleStickBonusChange}
        /> */}

      <WhiteboardScreen
        rateGeneralId={0}
        tableId={gymnastid}
        stickBonus={stickbonus}
        setStickBonusset={handleStickBonusChange}
        percentage={percentage}
        discipline={discipline}
        event={gymnastEvent}
        onLoaded={handleLoaded}
      />

      <ScrollView scrollEnabled={isScrollEnabled}>
        <View style={styles.mainContent}>
          {/* Left Side: Code Table */}
          <View style={styles.leftColumn}>
            {/* Code table rows */}
            {renderNumberButtons("J")}
            {renderNumberButtons("I")}
            {renderNumberButtons("H")}
            {renderNumberButtons("G")}
            {renderNumberButtons("F")}
            {renderNumberButtons("E")}
            {renderNumberButtons("D")}
            {renderNumberButtons("C")}
            {renderNumberButtons("B")}
            {renderNumberButtons("A")}
          </View>

          {/* Right Side: Scores and Info */}
          <View style={styles.rightColumn}>
            <View style={styles.infoTable}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>NUMBER OF ELEMENTS</Text>
                </View>
                <View
                  style={[
                    styles.infoValueCell,
                    totalElements >= 6 && totalElements <= 8
                      ? styles.infoValueCellGreen
                      : styles.infoValueCellRed,
                  ]}
                >
                  <Text style={styles.infoValueText}>{totalElements}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>DIFFICULTY VALUES</Text>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <Text style={styles.infoValueText}>
                    {difficultyValues.toFixed(1)}
                  </Text>
                </View>
              </View>

              {/* Replace the element groups section with this code */}
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>ELEMENT GROUPS</Text>
                </View>
                <View style={styles.elementGroupsContainer}>
                  {/* Group I */}
                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity
                      onPress={() => toggleModal("I")}
                      style={styles.dropdownButton}
                    >
                      <Text style={styles.elementGroupText}>I</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <TouchableOpacity
                      onPress={() => toggleModal("I")}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={styles.elementGroupValue}>
                        {elementGroupValues.I.toFixed(1)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Group II */}
                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity
                      onPress={() => toggleModal("II")}
                      style={styles.dropdownButton}
                    >
                      <Text style={styles.elementGroupText}>II</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <TouchableOpacity
                      onPress={() => toggleModal("II")}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={styles.elementGroupValue}>
                        {elementGroupValues.II.toFixed(1)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Group III */}
                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity
                      onPress={() => toggleModal("III")}
                      style={styles.dropdownButton}
                    >
                      <Text style={styles.elementGroupText}>III</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <TouchableOpacity
                      onPress={() => toggleModal("III")}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={styles.elementGroupValue}>
                        {elementGroupValues.III.toFixed(1)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Group IV */}
                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity
                      onPress={() => toggleModal("IV")}
                      style={styles.dropdownButton}
                    >
                      <Text style={styles.elementGroupText}>IV</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <TouchableOpacity
                      onPress={() => toggleModal("IV")}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={styles.elementGroupValue}>
                        {elementGroupValues.IV.toFixed(1)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>ELEMENT GROUPS TOTAL</Text>
                </View>
                <View style={styles.infoValueCellBlue1}>
                  <Text style={styles.infoValueText}>
                    {elementGroupsTotal.toFixed(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={[
                  styles.infoLabelCellcv,
                  // Apply green background when CV shows, skyblue when hidden
                  (!discipline || (discipline && (gymnastEvent === 'FX' || gymnastEvent === 'HB'))) 
                    ? { backgroundColor: '#00b050' }  // Green when CV is visible
                    : { backgroundColor: '#a9def9' }, // Skyblue when CV is hidden
                ]}>
                  <Text
                    style={[
                      isLargeDevice ? styles.infoLabelTextCVTEXT : null,
                      isSmallDevice ? styles.scoreValueTextCVTEXTSmall : null,
                      isTinyDevice ? styles.scoreValueTextCVTEXTTiny : null,
                    ]}
                  >
                    {/* Only show CV text if discipline is false OR if discipline is true and event is FX or HB */}
                    {(!discipline || (discipline && (gymnastEvent === 'FX' || gymnastEvent === 'HB'))) ? 'CV' : ''}
                  </Text>
                </View>
                {(!discipline || (discipline && (gymnastEvent === 'FX' || gymnastEvent === 'HB'))) ? <View style={[
                  styles.infovalueCellText,
                  // Apply green background when CV shows
                  { backgroundColor: '#f8c471' },
                ]}>
                  <TouchableOpacity                  onPress={() => {
                    const formattedValue = formatValueForInput(cv);
                    console.log("Opening CV modal - cv value:", cv, "formatted:", formattedValue);
                    setCvInput(formattedValue);
                    setShowCvModal(true);
                  }}
                  >
                    <Text style={styles.infoValueText}>
                      {/* Only show CV value if discipline is false OR if discipline is true and event is FX or HB */}
                      {cv.toFixed(1)}
                    </Text>
                  </TouchableOpacity>
                </View> : ''}
                {discipline && gymnastEvent !== 'PH' && (
  <>
    <View style={styles.stickBonusCell}>
      <Text
        style={[
          isLargeDevice ? styles.bonusLabelTextStickBonus : null,
          isSmallDevice ? styles.bonusLabelTextStickBonusSmall : null,
          isTinyDevice ? styles.bonusLabelTextStickBonusTiny : null,
        ]}
      >
        BONUS
      </Text>
    </View>
    <View style={styles.stickBonusCelltext}>
      <Text style={styles.bonusValueText}>
        {stickbonus ? "0.1" : "0.0"}
      </Text>
    </View>
  </>
)}

                <View style={styles.ndCell}>
                  <Text style={styles.bonusLabelText}>ND</Text>
                </View>
                <View style={styles.ndCellText}>
                  <TouchableOpacity                  onPress={() => {
                    setNdInput(formatValueForInput(nd));
                    setShowNdModal(true);
                  }}
                  >
                    <Text style={styles.bonusValueText}>{nd.toFixed(1)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.svCell}>
                  <Text style={styles.svLabelText}>SV</Text>
                </View>
                <View style={styles.svCellText}>
                  <Text style={styles.svValueText}>{sv.toFixed(1)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>EXECUTION</Text>
                </View>
                <TouchableOpacity
                  style={styles.infoValueCellBlue2}                onPress={() => {
                  setExecutionInput(formatValueForInput(execution));
                  setShowExecutionModal(true);
                }}
                >
                  <Text style={styles.infoValueText}>
                    {execution.toFixed(1)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>E SCORE</Text>
                </View>
                <View style={styles.scoreValueCell}>
                  <Text style={styles.scoreValueText}>{eScore.toFixed(3)}</Text>
                </View>
                <View style={styles.myScoreCellScore}>
                  <Text
                    style={[
                      isLargeDevice ? styles.myScoreLabelTextScore : null,
                      isSmallDevice ? styles.myScoreLabelTextScoreSmall : null,
                      isTinyDevice ? styles.myScoreLabelTextScoreTiny : null,
                    ]}
                  >
                    MY SCORE
                  </Text>
                </View>
                <View style={styles.myScoreCell}>
                  <Text style={styles.myScoreValueText}>
                    {myScore.toFixed(3)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.compDeductionLabelCell}>
                  <Text style={styles.compDeductionLabelText}>
                    COMPETITION INFO
                  </Text>
                </View>
                <View style={styles.dCell}>
                  <Text
                    style={[
                      isLargeDevice ? styles.dLabelText : null,
                      isSmallDevice ? styles.dLabelTextSmall : null,
                      isTinyDevice ? styles.dLabelTextTiny : null,
                    ]}
                  >
                    D
                  </Text>
                </View>
                <View style={styles.dCellText}>
                  <TouchableOpacity
                    onPress={() => {
                      setDInput(formatValueForInput(d));
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
                </View>

                <View style={styles.eCell}>
                  <Text
                    style={[
                      isLargeDevice ? styles.eLabelText : null,
                      isSmallDevice ? styles.eLabelTextSmall : null,
                      isTinyDevice ? styles.eLabelTextTiny : null,
                    ]}
                  >
                    E
                  </Text>
                </View>

                <View style={styles.eCellText}>
                  <TouchableOpacity
                    onPress={() => {
                      setEInput(formatValueForInput(e, 3));
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
                </View>

                {discipline && (
                  <>
                    <View style={styles.sdCell}>
                      <Text
                        style={[
                          isLargeDevice ? styles.sdLabelText : null,
                          isSmallDevice ? styles.sdLabelTextSmall : null,
                          isTinyDevice ? styles.sdLabelTextTiny : null,
                        ]}
                      >
                        SB
                      </Text>
                    </View>
                    <View style={styles.sdCellText}>
                      <TouchableOpacity
                        onPress={() => {
                          const newValue = !sb;
                          setSb(newValue);
                          // Save to database if needed
                          let compscorecalc =
                            d + e + (newValue ? 0.1 : 0.0) - ndcomp;

                          // Apply the 99 adjustment

                          const finalScore = Math.round(compscorecalc * 1000) / 1000;

                          setScore(finalScore);

                          updateRateGeneral(rateid, {
                            compSd: newValue ? 0.1 : 0.0,
                            compScore: finalScore,
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
                    </View>
                  </>
                )}
                <View style={styles.ndDeductionCell}>
                  <Text
                    style={[
                      isLargeDevice ? styles.ndLabelText : null,
                      isSmallDevice ? styles.ndLabelTextSmall : null,
                      isTinyDevice ? styles.ndLabelTextTiny : null,
                    ]}
                  >
                    ND
                  </Text>
                </View>

                <View style={styles.ndDeductionCellText}>
                  <TouchableOpacity
                    onPress={() => {
                      setNdInputcomp(formatValueForInput(ndcomp));
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
                </View>

                <View style={styles.scoreCell}>
                  <Text
                    style={[
                      isLargeDevice ? styles.scoreLabelText : null,
                      isSmallDevice ? styles.scoreLabelTextSmall : null,
                      isTinyDevice ? styles.scoreLabelTextTiny : null,
                    ]}
                  >
                    SCORE
                  </Text>
                </View>
                <View style={styles.scoreCellText}>
                  <Text
                    style={[
                      isLargeDevice ? styles.scoreValueText : null,
                      isSmallDevice ? styles.scoreValueTextSmall : null,
                      isTinyDevice ? styles.scoreValueTextTiny : null,
                    ]}
                  >
                    {trimDecimals(score, 3)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.neutralCell}>
                  <Text style={styles.neutralLabelText}>GYMNAST INFO</Text>
                </View>
                <View style={styles.overtimeCell}>
                  <Text style={styles.overtimeValueText}>{gymnastName}</Text>
                </View>
                <View style={styles.lineCell}>
                  <Text style={styles.lineValueText}>{gymnastNoc}</Text>
                </View>
                <View style={styles.otherCell}>
                  <Text style={styles.lineValueText}>{gymnastBib}</Text>
                </View>
                <View style={styles.otherCell}>
                  <Text style={styles.otherValueText}>{gymnastEvent}</Text>
                </View>
                <View style={styles.neutralTotalCell}>
                  <Text style={styles.neutralTotalValueText}>{number}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

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

        <DebugPanel
          showDebugPanel={showDebugPanel}
          setShowDebugPanel={setShowDebugPanel}
          currentPath="/main-floor"
          competenceId={competenceId}
          event={event}
          number={number}
          participants={participants}
          folderId={folderId}
          discipline={discipline}
          gymnastid={gymnastid}
          gymnastName={gymnastName}
          gymnastNoc={gymnastNoc}
          gymnastBib={gymnastBib}
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
  // Go Back button styles
  goBackButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 1000,
  },
  goBackButtonInner: {
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
  goBackButtonText: {
    color: "#0052b4",
    fontWeight: "bold",
    marginLeft: 5,
    fontSize: 16,
  },
  scoreDisplay: {
    height: 512,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: 10,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  stickbonus: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0052b4",
    position: "absolute",
    bottom: 10,
    backgroundColor: "#B4B4B4",
    borderRadius: 10,
    /* shadow */
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,

    padding: 5,
    right: 10,
  },
  codetable: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0052b4",
    position: "absolute",
    bottom: 10,
    backgroundColor: "#B4B4B4",
    borderRadius: 10,
    /* shadow */
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
  mainContent: {
    flexDirection: "row",
    width: "100%",
  },
  leftColumn: {
    width: "45%",
  },
  rightColumn: {
    width: "55%",
  },
  codeTableHeader: {
    backgroundColor: "#ccc",
    padding: 5,
  },
  codeTableText: {
    fontSize: 20,
    color: "white",
  },
  tableRow: {
    flexDirection: "row",
    height: 30,
  },
  labelCell: {
    width: 30,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  labelCellSelected: {
    width: 30,
    backgroundColor: "#00b050",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  numberCell: {
    flex: 1,

    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
    backgroundColor: " #ccc",
  },
  numberActive: {
    backgroundColor: "#0052b4",
  },
  zeroActive: {
    backgroundColor: "#00b050",
  },
  numberInactive: {
    backgroundColor: "#a9def9",
  },
  numberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  numberActiveText: {
    color: "#fff",
  },
  // Selected value cell styles
  selectedCell: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  selectedCellActive: {
    backgroundColor: "#00b050",
  },
  selectedCellInactive: {
    backgroundColor: "#ccc",
  },
  selectedCellText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  infoTable: {
    marginTop: 0,
  },
  infoRow: {
    flexDirection: "row",
    height: 33.3,
  },
  infoLabelCell: {
    backgroundColor: "#a9def9",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 10,
    borderWidth: 1,
    borderColor: "white",
    width: 200,
  },
  infoLabelCellcv: {
    backgroundColor: "#00b050",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 10,
    borderWidth: 0.1,
    borderColor: "black",
    width: 200,
  },
  infoLabelText: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#333",
  },
  infoLabelTextCVTEXT: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  scoreValueTextCVTEXTSmall: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
  },
  scoreValueTextCVTEXTTiny: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },

  // Common cell style for value cells
  infoValueCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  infoValueCellRed: {
    flex: 1,
    backgroundColor: "#ff9b9b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  infoValueCellBlue: {
    flex: 1,
    backgroundColor: "#6B9BDF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderBottomWidth: 0.5,
    borderColor: "white",
  },
  infoValueCellBlue1: {
    flex: 1,
    backgroundColor: "#6B9BDF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderBottomWidth: 0.5,
    borderColor: "white",
    borderBottomColor: "black",
  },
  infoValueCellBlue2: {
    flex: 1,
    backgroundColor: "#6B9BDF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderBottomWidth: 0.5,
    borderColor: "white",
    borderTopColor: "black",
  },
  infoValueCellGreen: {
    flex: 1,
    backgroundColor: "#00b050",

    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  infovalueCellText: {
    backgroundColor: "#f8c471",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },

  infoValueText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  elementGroupsContainer: {
    flex: 1,
    flexDirection: "row",
  },
  elementGroupCell: {
    flex: 1,
    /* row */
    flexDirection: "row",
    /* space between text */
    backgroundColor: "#6B9BDF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  elementGroupCellTitle: {
    flex: 0.5,
    /* row */
    flexDirection: "row",
    /* space between text */
    backgroundColor: "#D9D9D9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  elementGroupText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  elementGroupValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  stickBonusCell: {
    flex: 1.4,
    backgroundColor: "#00b050",
    justifyContent: "space-around",
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "black",
  },
  stickBonusCelltext: {
    flex: 0.7,
    backgroundColor: "#f8c471",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  bonusLabelText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  bonusLabelTextStickBonus: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  bonusLabelTextStickBonusSmall: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  bonusLabelTextStickBonusTiny: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  bonusValueText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  ndCell: {
    flex: 1,
    /* row */
    flexDirection: "row",
    backgroundColor: "#00b050",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  ndCellText: {
    flex: 1,
    /* row */
    flexDirection: "row",
    backgroundColor: "#f8c471",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  svCell: {
    flex: 1,
    backgroundColor: "rgb(221, 221, 221)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  svCellText: {
    flex: 1,
    backgroundColor: "rgb(221, 221, 221)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  svLabelText: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgb(236, 45, 45)",
  },
  svValueText: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgb(236, 45, 45)",
  },
  scoreValueCell: {
    flex: 1,
    backgroundColor: "#6B9BDF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
    borderBottomColor: "black",
  },
  scoreValueText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  scoreValueTextSmall: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  scoreValueTextTiny: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  myScoreCell: {
    flex: 1,
    backgroundColor: "#6B9BDF",
    justifyContent: "space-around",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
    borderBottomColor: "black",
  },
  myScoreCellScore: {
    flex: 1,
    backgroundColor: "#D9D9D9",
    justifyContent: "space-around",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
    borderBottomColor: "black",
  },
  myScoreLabelText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  myScoreValueText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  myScoreLabelTextScore: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  myScoreLabelTextScoreSmall: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  myScoreLabelTextScoreTiny: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  compDeductionLabelCell: {
    backgroundColor: "#00b050",
    width: 200,
    justifyContent: "center",
    alignItems: "flex-end",
    borderWidth: 1,
    paddingRight: 10,
    borderColor: "black",
  },
  compDeductionLabelText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
  },
  dCell: {
    flex: 0.6,
    flexDirection: "row",
    backgroundColor: "#D9D9D9",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  dCellText: {
    flex: 0.9,
    flexDirection: "row",
    backgroundColor: "#00b050",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  dLabelText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  dLabelTextSmall: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  dLabelTextTiny: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  dValueText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  dValueTextSmall: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  dValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  eCell: {
    flex: 0.6,
    flexDirection: "row",
    backgroundColor: "#D9D9D9",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  eCellText: {
    flex: 1.3,
    flexDirection: "row",
    backgroundColor: "#00b050",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  eLabelText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  eLabelTextSmall: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  eLabelTextTiny: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  eValueText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  eValueTextSmall: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  eValueTextTiny: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  sdCell: {
    flex: 0.8,
    backgroundColor: "#D9D9D9",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  sdCellText: {
    flex: 0.8,
    backgroundColor: "#00b050",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  sdLabelText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  sdLabelTextSmall: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  sdLabelTextTiny: {
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
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  sdValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  ndDeductionCell: {
    flex: 0.9,
    backgroundColor: "#D9D9D9",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  ndDeductionCellText: {
    flex: 0.8,
    backgroundColor: "#00b050",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  ndLabelText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  ndLabelTextSmall: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  ndLabelTextTiny: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  ndValueText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
  },
  ndValueTextSmall: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  ndValueTextTiny: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  scoreCell: {
    flex: 1.5,
    backgroundColor: "#D9D9D9",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  scoreCellText: {
    flex: 1.3,
    backgroundColor: "#00b050",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  scoreLabelText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  scoreLabelTextSmall: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  scoreLabelTextTiny: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333",
  },
  neutralCell: {
    width: 200,
    backgroundColor: "rgba(0,176,80,1.00)",
    justifyContent: "center",
    alignItems: "flex-end",
    borderWidth: 1,
    paddingRight: 10,
    borderColor: "black",
  },
  neutralLabelText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
  },
  overtimeCell: {
    flex: 2.0,
    backgroundColor: "#D9D9D9",

    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  overtimeValueText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  lineCell: {
    flex: 0.4,
    backgroundColor: "#D9D9D9",

    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  lineValueText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  otherCell: {
    flex: 0.3,
    backgroundColor: "#D9D9D9",

    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  otherValueText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  neutralTotalCell: {
    flex: 0.4,
    backgroundColor: "rgb(150, 150, 150)",

    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  neutralTotalValueText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  commentsSection: {
    padding: 10,
  },
  commentsText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  commentsBox: {
    height: 60,
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
    marginBottom: 10,
  },
  backButton: {
    flex: 1,
    backgroundColor: "#0052b4",
    padding: 12,
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
    flex: 1,
    backgroundColor: "#0052b4",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

  dropdownButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContainer: {
    position: "absolute", // absolute is correct
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 25,
    zIndex: 99999999, // Increased zIndex
    maxHeight: 200,
    height: 200,
    overflow: "visible",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownItemText: {
    fontSize: 18,
    color: "#0066CC",
    fontWeight: "500",
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(0, 102, 204, 0.08)",
  },
  dropdownItemTextSelected: {
    color: "#0066CC",
    fontWeight: "bold",
  },
  elementGroupCellWithDropdown: {
    position: "relative",
    backgroundColor: "#6B9BDF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
    overflow: "visible", // Important to allow dropdown to show
  },
  elementGroupValueDropdown: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#333",
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownArrow: {
    marginLeft: 5,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    minWidth: 300,
    maxWidth: 400,
    maxHeight: "80%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  modalItemSelected: {
    backgroundColor: "#e3f2fd",
  },
  modalItemText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "500",
  },
  modalItemTextSelected: {
    color: "#0066CC",
    fontWeight: "bold",
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#0052b4",
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Warning banner styles
  warningBanner: {
    backgroundColor: "#ff6b6b",
    padding: 12,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff4757",
  },
  warningText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#0052b4',
    fontWeight: 'bold',
  },

});

export default GymnasticsJudgingTable;
