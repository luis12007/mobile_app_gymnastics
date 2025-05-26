import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
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

import SimplifiedNumberPad from "@/components/CustomNumberPad";
import { ModalDropdown } from "@/components/ModalDropdown";
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
  const executionInputRef = useRef<any>(null);

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
  const cvInputRef = useRef<any>(null);



  const ndInputRef = useRef<any>(null);
  const [nd, setNd] = useState(0.0);

  const [showDModal, setShowDModal] = useState(false);
  const [dInput, setDInput] = useState("");
  const dInputRef = useRef<any>(null);
  const [d, setD] = useState(0);

  const [showEModal, setShowEModal] = useState(false);
  const [eInput, setEInput] = useState("");
  const eInputRef = useRef<any>(null);
  const [e, setE] = useState(0);

    const [showNdModal, setShowNdModal] = useState(false);
  const [ndInput, setNdInput] = useState("");
  const [ndInputcomp, setNdInputcomp] = useState("");

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsInput, setCommentsInput] = useState("");
  const commentsInputRef = useRef<any>(null);

  // Start animations when component mounts
  useEffect(() => {
    // Animate back button
    Animated.sequence([
      Animated.delay(500),
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
  }, []);

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
  const [gymnastBib, setGymnastBib] = useState(0);
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

const [isCustomKeyboardVisible, setIsCustomKeyboardVisible] = useState(false);

  const [showDropdown, setShowDropdown] = useState<{ [key: string]: boolean }>({
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

  const handleStickBonusChange = async (value: boolean) => {
    setStickBonus(value);
    const newmyscore = eScore + sv + (value ? 0.1 : 0.0) - nd;

    setMyScore(newmyscore);
    console.log("stickBonus value:", value);
    
    try {
      // Save the stickBonus value in MainRateGeneral
      const updateData: Partial<MainRateGeneral> = {
        stickBonus: value,
        myScore: newmyscore,
      };
      console.log("updateData:", updateData);
      console.log("rateid:", rateid);
      if (rateid) {
      updateRateGeneral(rateid, updateData).then((success) => {
        if (success) {
          console.log(`Saved stickBonus in MainRateGeneral.`);
        } else {
          console.error(`Failed to save stickBonus in MainRateGeneral.`);
        }
      });
      }

      
    } catch (error) {
      console.error("Error saving stickBonus to MainRateGeneral:", error);
    }
  };

useEffect(() => {
  if (showCvModal) {
    setIsCustomKeyboardVisible(true);
    if (cvInputRef.current) {
      setTimeout(() => {
        if (Platform.OS === 'ios') {
          cvInputRef.current?.blur();
          cvInputRef.current?.focus();
        }
      }, 100);
    }
  } else {
    setIsCustomKeyboardVisible(false);
  }
}, [showCvModal]);

useEffect(() => {
  if (showNdCompModal) {
    setIsCustomKeyboardVisible(true);
    if (ndInputRef.current) {
      setTimeout(() => {
        if (Platform.OS === 'ios') {
          ndInputRef.current?.blur();
          ndInputRef.current?.focus();
        }
      }, 100);
    }
  } else {
    setIsCustomKeyboardVisible(false);
  }
}, [showNdCompModal]);

  // Fetch MainRateGeneral data and populate elementCounts
  useEffect(() => {
    const fetchMainRateGeneral = async () => {
      try {
        const mainRateGeneral = await getMainTableById(gymnastid); // Fetch data by gymnastid
        console.log("MainGeneral data:", mainRateGeneral); // Debugging line
        /* getting rate table with the mainrategeneral id */
        if (mainRateGeneral) {
          const mainRateGeneralId = mainRateGeneral.id;
          const rateTable = await getRateGeneralByTableId(mainRateGeneralId);
          console.log("Rate Table data:", rateTable); // Debugging line
          setElementCounts({
            J: {
              value: mainRateGeneral.j || 0,
              selected: mainRateGeneral.j > 0,
            },
            I: {
              value: mainRateGeneral.i || 0,
              selected: mainRateGeneral.i > 0,
            },
            H: {
              value: mainRateGeneral.h || 0,
              selected: mainRateGeneral.h > 0,
            },
            G: {
              value: mainRateGeneral.g || 0,
              selected: mainRateGeneral.g > 0,
            },
            F: {
              value: mainRateGeneral.f || 0,
              selected: mainRateGeneral.f > 0,
            },
            E: {
              value: mainRateGeneral.e || 0,
              selected: mainRateGeneral.e > 0,
            },
            D: {
              value: mainRateGeneral.d || 0,
              selected: mainRateGeneral.d > 0,
            },
            C: {
              value: mainRateGeneral.c || 0,
              selected: mainRateGeneral.c > 0,
            },
            B: {
              value: mainRateGeneral.b || 0,
              selected: mainRateGeneral.b > 0,
            },
            A: {
              value: mainRateGeneral.a || 0,
              selected: mainRateGeneral.a > 0,
            },
          });
          setGymnastName(mainRateGeneral.name);
          setGymnastNoc(mainRateGeneral.noc);
          setGymnastBib(mainRateGeneral.bib);
          setGymnastEvent(mainRateGeneral.event);
          setSv(mainRateGeneral.sv);
          setCv(mainRateGeneral.cv);
          setNd(mainRateGeneral.nd);
          setDelt(mainRateGeneral.delt);
          setpercentage(mainRateGeneral.percentage);
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
            setElementGroupValues({
              I: rateTable.elementGroups1 || 0.0,
              II: rateTable.elementGroups2 || 0.0,
              III: rateTable.elementGroups3 || 0.0,
              IV: rateTable.elementGroups4 || 0.0,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching MainRateGeneral data:", error);
      }
    };

    fetchMainRateGeneral();
  }, [gymnastid]); // Re-fetch data when gymnastid changes

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

useEffect(() => {
  if (showNdModal) {
    setIsCustomKeyboardVisible(true);
    if (ndInputRef.current) {
      setTimeout(() => {
        if (Platform.OS === 'ios') {
          ndInputRef.current?.blur();
          ndInputRef.current?.focus();
        }
      }, 100);
    }
  } else {
    setIsCustomKeyboardVisible(false);
  }
}, [showNdModal]);

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
  const toggleDropdown = (group: string) => {
    // Close all other dropdowns and toggle the selected one
    setShowDropdown({
      I: group === "I" ? !showDropdown.I : false,
      II: group === "II" ? !showDropdown.II : false,
      III: group === "III" ? !showDropdown.III : false,
      IV: group === "IV" ? !showDropdown.IV : false,
    });
  };
  // Function to select a value from dropdown
  const selectValue = async (group: string, value: number) => {
    const updated = { ...elementGroupValues, [group]: value };
    const total = updated.I + updated.II + updated.III + updated.IV;

    setElementGroupValues((prev) => {
      const updated = { ...prev, [group]: value };
      // Calculate the sum for elementGroups5

      return updated;
    });
    // Close the dropdown after selection
    setShowDropdown((prev) => ({
      ...prev,
      [group]: false,
    }));

    // Here you would add your save to database logic
    try {
      // Example: Update the element group value in your database
      console.log(`total:`, total);

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

      setElementGroupsTotal(total);
      setSv(total + difficultyValues + cv);
      const newsv = total + difficultyValues + cv;
      const newmyscore =
        eScore +
        (total + difficultyValues + cv) +
        (stickbonus ? 0.1 : 0.0) -
        nd;
      setMyScore(newmyscore);

      const updateData2: Partial<MainRateGeneral> = {
        elementGroups5: total,
        myScore: newmyscore,
      };

      const successmaintable = await updateMainTable(gymnastid, { sv: newsv });

      if (successmaintable) {
        console.log(`Saved sv in MainTable.`);
      } else {
        console.error(`Failed to save sv in MainTable.`);
      }

      const success2 = await updateRateGeneral(rateid, updateData2);
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

  const toggleButton = async (row: keyof MainTable, num: number) => {
    let newCounts: typeof elementCounts;
    let sum = 0;

    setElementCounts((prev) => {
      newCounts = { ...prev };

      // If this number is already selected for this row, unselect it
      if (newCounts[row].selected && newCounts[row].value === num) {
        newCounts[row] = { value: 0, selected: false };
      } else {
        // Otherwise, select this number for this row
        newCounts[row] = { value: num, selected: true };
      }

      sum = Object.values(newCounts).reduce(
        (acc, item) => (item.selected ? acc + item.value : acc),
        0
      );
      setTotalElements(sum);

      return newCounts;
    });

    setTimeout(async () => {
      const valueToSave = newCounts[row].value;

      // Calculate difficulty values
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

      try {
        setSv(difficulty + elementGroupsTotal + cv);
        const newmyscore =
          eScore +
          (difficulty + elementGroupsTotal + cv) +
          (stickbonus ? 0.1 : 0.0) -
          nd;
        setMyScore(newmyscore);
        const updateData: Partial<MainTable> = {
          [row.toLowerCase()]: valueToSave,
          sv: difficulty + elementGroupsTotal + cv,
        };

        const updateratetable: Partial<MainRateGeneral> = {
          numberOfElements: sum,
          difficultyValues: difficulty,
          myScore: newmyscore,
        };

        const success = await updateMainTable(gymnastid, updateData);
        const successratetable = await updateRateGeneral(
          rateid,
          updateratetable
        );

        if (successratetable) {
          console.log(
            `Saved ${sum} and difficulty ${difficulty} in RateTable.`
          );
        } else {
          console.error(`Failed to save ${sum} or difficulty in RateTable.`);
        }

        if (success) {
          console.log(`Saved ${valueToSave} for row ${row} in MainTable.`);
        } else {
          console.error(
            `Failed to save ${valueToSave} for row ${row} in MainTable.`
          );
        }
      } catch (error) {
        console.error("Error saving to MainTable:", error);
      }
    }, 0);
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
  ref={ndInputRef}
  style={[
    styles.infoValueText,
    { fontSize: 40, marginBottom: 16, textAlign: "center" },
  ]}
  value={ndInputcomp}
  keyboardType="decimal-pad"
  showSoftInputOnFocus={false} // Esto debería prevenir el teclado, pero no siempre funciona en iOS
  caretHidden={true} // Oculta el cursor de edición
  onFocus={() => {
    // Desenfoque inmediato para evitar que aparezca el teclado
    ndInputRef.current?.blur();
    // Luego mostrar nuestro teclado personalizado
    setIsCustomKeyboardVisible(true);
  }}
  selectTextOnFocus
  onChangeText={(text) => {
    if (/^\d*\.?\d*$/.test(text)) {
      setNdInputcomp(text);
    }
  }}
  maxLength={5}
  editable={false} // Esta es la clave - hace que el campo no sea editable
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
          ndInputRef.current?.blur();
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
            })
              .then((success) => {
                if (success) {
                  console.log(
                    `Saved ndcomp = ${rounded} in MainRateGeneral.`
                  );
                } else {
                  console.error(
                    `Failed to save ndcomp in MainRateGeneral.`
                  );
                }
              })
              .catch((error) => {
                console.error(
                  "Error saving ndcomp to MainRateGeneral:",
                  error
                );
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
            console.log("delt:", newdelt);

            const newded = 10 - rounded;
            setSetded(Number(newded.toFixed(1)));
            console.log("ded:", Number(newded.toFixed(1)));

            /* logic of the table */
            const dedInterval = getDeductionIntervalValue(
              Number(newded.toFixed(1))
            );
            console.log("dedInterval:", dedInterval);
            const percentageValue = getPercentageFromTable(
              dedInterval,
              newdelt
            );
            console.log("percentageValue:", percentageValue);
            setpercentage(percentageValue);

            updateMainTable(gymnastid, {
              delt: newdelt,
              percentage: percentageValue,
            });
            console.log("percentage:", percentageValue);

            /* ============================================================== */

            updateRateGeneral(rateid, {
              compE: rounded,
              compScore: compscorecalc,
              ded: newded,
            })
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
          }
          setShowEModal(false);
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
            // Save to database
            updateRateGeneral(rateid, {
              compD: rounded,
              compScore: compscorecalc,
            })
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
          }
          setShowDModal(false);
          setIsCustomKeyboardVisible(false);
        }}
      />
    )}
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
        keyboardType="numeric"
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
          setShowNdModal(false);
          setIsCustomKeyboardVisible(false);
          ndInputRef.current?.blur();
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
          console.log("ndInput:", ndInput);
          
          // First check if ndInput exists
          if (!ndInput) {
            Alert.alert(
              "Invalid Input",
              "Please enter a value.",
              [{ text: "OK" }]
            );
            return;
          }
          
          // Make sure ndInput is a string before using replace
          const inputString = ndInput.toString();
          const num = parseFloat(inputString.replace(",", "."));
          
          if (!isNaN(num)) {
            const rounded = Math.round(num * 10) / 10;
            setNd(rounded);
            const newmyscore =
              eScore + sv + (stickbonus ? 0.1 : 0.0) - rounded;
            setMyScore(newmyscore);
            updateRateGeneral(rateid, { myScore: newmyscore });
            // Save to database
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

{showCvModal && (
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
        ref={cvInputRef}
        style={[
          styles.infoValueText,
          { fontSize: 40, marginBottom: 16, textAlign: "center" },
        ]}
        value={cvInput}
        keyboardType="phone-pad"
        showSoftInputOnFocus={false}
        caretHidden={Platform.OS === 'ios'}
        onFocus={() => setIsCustomKeyboardVisible(true)}
        selectTextOnFocus
        onChangeText={(text) => {
          if (/^\d*\.?\d*$/.test(text)) {
            setCvInput(text);
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
          setShowCvModal(false);
          setIsCustomKeyboardVisible(false);
          cvInputRef.current?.blur();
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
          if (cvInput === cv.toFixed(1)) {
            setCvInput(number);
          } else {
            let newValue = cvInput;
            if (cvInput === "0" || cvInput === "0.0") {
              newValue = number;
            } else {
              newValue = cvInput + number;
            }
            setCvInput(newValue);
          }
        }}
        onDecimalPress={() => {
          if (!cvInput.includes(".")) {
            setCvInput(cvInput + ".");
          }
        }}
        onDeletePress={() => {
          if (cvInput.length > 0) {
            setCvInput(cvInput.slice(0, -1));
            if (cvInput.length === 1) {
              setCvInput("0");
            }
          }
        }}
        onHidePress={() => {
          setIsCustomKeyboardVisible(false);
        }}
        onSubmitPress={() => {
          console.log("cvInput:", cvInput);
          
          // First check if cvInput exists
          if (!cvInput) {
            // Handle the case where cvInput is undefined or empty
            Alert.alert(
              "Invalid Input",
              "Please enter a CV value.",
              [{ text: "OK" }]
            );
            return;
          }
          
          // Then check if it's "0"
          if (cvInput === "0" || cvInput.toString() === "0") {
            Alert.alert(
              "Invalid CV",
              "Please enter a valid CV value.",
              [{ text: "OK" }]
            );
            return;
          }

          // Make sure cvInput is a string before using replace
          const inputString = cvInput.toString();
          const num = parseFloat(inputString.replace(",", "."));
          
          if (!isNaN(num)) {
            const rounded = Math.round(num * 10) / 10;
            setCv(rounded);
            setSv(rounded + difficultyValues + elementGroupsTotal);
            const newmyscore =
              eScore +
              (rounded + difficultyValues + elementGroupsTotal) +
              (stickbonus ? 0.1 : 0.0) -
              nd;
            setMyScore(newmyscore);
            updateRateGeneral(rateid, { myScore: newmyscore });
            console.log("cv:", rounded);
            
            // Save to database
            updateMainTable(gymnastid, {
              cv: rounded,
              sv: rounded + difficultyValues + elementGroupsTotal,
            })
              .then((success) => {
                if (success) {
                  console.log(
                    `Saved cv = ${rounded} and sv = ${
                      rounded + difficultyValues + elementGroupsTotal
                    } in MainTable.`
                  );
                } else {
                  console.error(`Failed to save cv and sv in MainTable.`);
                }
              })
              .catch((error) => {
                console.error("Error saving cv and sv to MainTable:", error);
              });
          }
          setShowCvModal(false);
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
        keyboardType="numeric"
        showSoftInputOnFocus={false}
        caretHidden={Platform.OS === 'ios'}
        onFocus={() => setIsCustomKeyboardVisible(true)}
        selectTextOnFocus
        onChangeText={(text) => {
          // Only update the input string, not the number
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
            console.log("delt:", newdelt);

            const newded = 10 - e;
            setSetded(Number(newded.toFixed(1)));
            console.log("ded:", Number(newded.toFixed(1)));

            /* logic of the table */
            const dedInterval = getDeductionIntervalValue(
              Number(newded.toFixed(1))
            );
            console.log("dedInterval:", dedInterval);
            const percentageValue = getPercentageFromTable(
              dedInterval,
              newdelt
            );
            console.log("percentageValue:", percentageValue);
            setpercentage(percentageValue);

            updateMainTable(gymnastid, {
              delt: newdelt,
              percentage: percentageValue,
            });
            console.log("percentage:", percentageValue);

            /* ============================================================== */

            setEScore(eScore);
            updateRateGeneral(rateid, {
              execution: rounded,
              eScore,
              myScore: newmyscore,
            })
              .then((success) => {
                if (success) {
                  console.log(
                    `Saved execution = ${rounded}, eScore = ${eScore} in MainRateGeneral.`
                  );
                } else {
                  console.error(
                    `Failed to save execution/eScore in MainRateGeneral.`
                  );
                }
              })
              .catch((error) => {
                console.error(
                  "Error saving execution/eScore to MainRateGeneral:",
                  error
                );
              });
          }
          setShowExecutionModal(false);
          setIsCustomKeyboardVisible(false);
        }}
      />
    )}
  </View>
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
                      onPress={() => toggleDropdown("I")}
                      style={styles.dropdownButton}
                    >
                      <Text style={styles.elementGroupText}>I</Text>
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[styles.elementGroupCell, { position: "relative" }]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleDropdown("I")}
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

                    {/* Dropdown for Group I */}
                    {Platform.OS === "web" ? (
                      <ModalDropdown
                        visible={showDropdown.I}
                        onClose={() =>
                          setShowDropdown((prev) => ({ ...prev, I: false }))
                        }
                        items={[0.5, 0.3, 0.0]}
                        onSelect={(value) => selectValue("I", value)}
                        group="I"
                      />
                    ) : (
                      showDropdown.I && (
                        <View style={styles.dropdownContainer}>
                          <ScrollView style={{ maxHeight: 300 }}>
                            {[0.5, 0.3, 0.0].map((value) => (
                              <TouchableOpacity
                                key={`I-${value}`}
                                style={styles.dropdownItem}
                                onPress={() => selectValue("I", value)}
                              >
                                <Text style={styles.dropdownItemText}>
                                  {value.toFixed(1)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )
                    )}
                  </View>

                  {/* Group II */}
                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity
                      onPress={() => toggleDropdown("II")}
                      style={styles.dropdownButton}
                    >
                      <Text style={styles.elementGroupText}>II</Text>
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[styles.elementGroupCell, { position: "relative" }]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleDropdown("II")}
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

                    {/* Dropdown for Group II */}
                    {Platform.OS === "web" ? (
                      <ModalDropdown
                        visible={showDropdown.II}
                        onClose={() =>
                          setShowDropdown((prev) => ({ ...prev, II: false }))
                        }
                        items={[0.5, 0.3, 0.0]}
                        onSelect={(value) => selectValue("II", value)}
                        group="II"
                      />
                    ) : (
                      showDropdown.II && (
                        <View style={styles.dropdownContainer}>
                          <ScrollView style={{ maxHeight: 300 }}>
                            {[0.5, 0.3, 0.0].map((value) => (
                              <TouchableOpacity
                                key={`II-${value}`}
                                style={styles.dropdownItem}
                                onPress={() => selectValue("II", value)}
                              >
                                <Text style={styles.dropdownItemText}>
                                  {value.toFixed(1)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )
                    )}
                  </View>

                  {/* Group III */}
                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity
                      onPress={() => toggleDropdown("III")}
                      style={styles.dropdownButton}
                    >
                      <Text style={styles.elementGroupText}>III</Text>
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[styles.elementGroupCell, { position: "relative" }]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleDropdown("III")}
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

                    {/* Dropdown for Group III */}
                    {Platform.OS === "web" ? (
                      <ModalDropdown
                        visible={showDropdown.III}
                        onClose={() =>
                          setShowDropdown((prev) => ({ ...prev, III: false }))
                        }
                        items={[0.5, 0.3, 0.0]}
                        onSelect={(value) => selectValue("III", value)}
                        group="III"
                      />
                    ) : (
                      showDropdown.III && (
                        <View style={styles.dropdownContainer}>
                          <ScrollView style={{ maxHeight: 300 }}>
                            {[0.5, 0.3, 0.0].map((value) => (
                              <TouchableOpacity
                                key={`III-${value}`}
                                style={styles.dropdownItem}
                                onPress={() => selectValue("III", value)}
                              >
                                <Text style={styles.dropdownItemText}>
                                  {value.toFixed(1)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )
                    )}
                  </View>

                  {/* Group IV */}
                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity
                      onPress={() => toggleDropdown("IV")}
                      style={styles.dropdownButton}
                    >
                      <Text style={styles.elementGroupText}>IV</Text>
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[styles.elementGroupCell, { position: "relative" }]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleDropdown("IV")}
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

                    {Platform.OS === "web" ? (
                      <ModalDropdown
                        visible={showDropdown.IV}
                        onClose={() =>
                          setShowDropdown((prev) => ({ ...prev, IV: false }))
                        }
                        items={
                          gymnastEvent === "PH"
                            ? [
                                0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8,
                                0.9, 1.0, 1.1,
                              ]
                            : [0.5, 0.3, 0.0]
                        }
                        onSelect={(value) => selectValue("IV", value)}
                        group="IV"
                      />
                    ) : (
                      showDropdown.IV && (
                        <View style={styles.dropdownContainer}>
                          <ScrollView style={{ maxHeight: 300 }}>
                            {(gymnastEvent === "PH"
                              ? [
                                  0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8,
                                  0.9, 1.0, 1.1,
                                ]
                              : [0.5, 0.3, 0.0]
                            ).map((value) => (
                              <TouchableOpacity
                                key={`IV-${value}`}
                                style={styles.dropdownItem}
                                onPress={() => selectValue("IV", value)}
                              >
                                <Text style={styles.dropdownItemText}>
                                  {value.toFixed(1)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )
                    )}
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
                <View style={styles.infoLabelCellcv}>
                  <Text style={styles.infoLabelText}>CV</Text>
                </View>
                <View style={styles.infovalueCellText}>
                  <TouchableOpacity
                    onPress={() => {
                      setCvInput(cv); // Set value BEFORE opening modal
                      setShowCvModal(true);
                    }}
                  >
                    <Text style={styles.infoValueText}>{cv.toFixed(1)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.stickBonusCell}>
                  <Text
                    style={[
                      isLargeDevice ? styles.bonusLabelTextStickBonus : null,
                      isSmallDevice
                        ? styles.bonusLabelTextStickBonusSmall
                        : null,
                      isTinyDevice ? styles.bonusLabelTextStickBonusTiny : null,
                    ]}
                  >
                    STICK BONUS
                  </Text>
                </View>
                <View style={styles.stickBonusCelltext}>
                  <Text style={styles.bonusValueText}>
                    {stickbonus ? "0.1" : "0.0"}
                  </Text>
                </View>
                <View style={styles.ndCell}>
                  <Text style={styles.bonusLabelText}>ND</Text>
                </View>
                <View style={styles.ndCellText}>
                  <TouchableOpacity
                    onPress={() => {
                      setNdInput(nd); // Set value BEFORE opening modal
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
                <TouchableOpacity style={styles.infoValueCellBlue2} onPress={() => {
                      setExecutionInput(execution.toFixed(1)); // Set value BEFORE opening modal
                      setShowExecutionModal(true);
                    }}>
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
                    COMPETITION{"\n"}INFO
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
                </View>

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
                </View>
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
                  <Text style={styles.neutralLabelText}>GYMNAST{"\n"}INFO</Text>
                </View>
                <View style={styles.overtimeCell}>
                  <Text style={styles.overtimeValueText}>{gymnastName}</Text>
                </View>
                <View style={styles.lineCell}>
                  <Text style={styles.lineValueText}>{gymnastNoc}</Text>
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
    fontSize: 7,
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
    backgroundColor: "#00b050",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  svCellText: {
    flex: 1,
    backgroundColor: "#ffcb41",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  svLabelText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  svValueText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
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
    flex: 0.8,
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
    flex: 1,
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
    flex: 1,
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
    flex: 1,
    backgroundColor: "#D9D9D9",

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
    elevation: 8,
    zIndex: 9999, // Increased zIndex
    maxHeight: 200,
    height: 200,
    overflow: "visible",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    margin: 4,
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
});

export default GymnasticsJudgingTable;