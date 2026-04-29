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
  Text as RNText,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CustomNumberPadOptimized from "../componentes/CustomNumberPadOptimized";
// import DebugPanel from "../componentes/DebugPanel"; // TODO: Create DebugPanel component
import {
  getCompetitionById,
  getGymnastById,
  getGymnastsByCompetition,
  updateGymnast,
  Gymnast,
  Competition,
} from "../lib/database";
import ModalvaultMag from "../componentes/ModalVaultMag";
import ModalvaultWag from "../componentes/ModalVaultWag";
import WhiteboardScreen, { WhiteboardRef } from "../componentes/WhiteboardScreen_jump_new";
import { ActivityIndicator } from "react-native";

const TEXT_FONT_DELTA = -3;

const Text = ({ style, ...props }: React.ComponentProps<typeof RNText>) => {
  const flattened = style ? (StyleSheet.flatten(style as any) as any) : undefined;
  const adjustedStyle =
    flattened && typeof flattened.fontSize === "number"
      ? ({ ...flattened, fontSize: Math.max(1, flattened.fontSize + TEXT_FONT_DELTA) } as any)
      : flattened;

  return (
    <RNText
      {...props}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      style={adjustedStyle}
    />
  );
};

const _dim = Dimensions.get("window");
const width = _dim.width;
const height = _dim.height;
const isLargeScreen = width >= 1000 && height >= 700;
var isLargeDevice = false;
var isMediumLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;

if (width >= 1368) {
  isLargeDevice = true;
} else if (width >= 1200 && width < 1368) {
  isMediumLargeDevice = true;
} else if (width >= 960 && width < 1200) {
  isSmallDevice = true;
} else if (width < 960) {
  isTinyDevice = true;
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

  // Use reactive dimensions for whiteboard sizing
  const windowDim = useWindowDimensions();
  const safeInsets = useSafeAreaInsets();
  const isIphone = Platform.OS === 'ios' && !Platform.isPad;
  // On iPhone, subtract horizontal safe-area insets so the whiteboard fits inside the SafeAreaView
  const liveWidth = isIphone
    ? windowDim.width - safeInsets.left - safeInsets.right
    : windowDim.width;
  const liveHeight = windowDim.height;

  const gymnastid = params.gymnastId 
    ? Number(params.gymnastId) 
    : params.gymnast 
    ? Number(params.gymnast) 
    : 0;
  const competitionIdParam = params.competitionId || params.competenceId;
  
  // Estados para parámetros que se obtienen de la BD
  const [competenceId, setCompetenceId] = useState<string | number>("");
  const [discipline, setDiscipline] = useState(false);
  const [participants, setParticipants] = useState("");
  const [folderId, setFolderId] = useState("");
  const [gymnastNumber, setGymnastNumber] = useState(0);
  
  // Variables para DebugPanel (comentado actualmente)
  const event = "";
  const number = gymnastNumber;

  const router = useRouter();
  const whiteboardRef = useRef<WhiteboardRef>(null);

  /* Keyboard usestates - removed because CustomNumberPadOptimized handles everything internally */

  // Debug and warning states
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [saveWarning, setSaveWarning] = useState("");
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveAttempts, setSaveAttempts] = useState(0);

  // Debug logs
  const [logs, setLogs] = useState<
    Array<{ id: number; timestamp: string; level: string; message: string }>
  >([]);

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
      showSaveWarning(
        `Failed to save ${operation}. Please check your connection.`
      );
    }
  };

  /* Define usestate */
  const [showNdModal, setShowNdModal] = useState(false);
  const [ndInput, setNdInput] = useState("");
  const [nd, setNd] = useState(0);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsInput, setCommentsInput] = useState("");
  const commentsInputRef = useRef<any>(null);

  // Valor dinámico de stick/bonus (0.1 si discipline true, 0.2 si false) - alineado con integration.txt
  const getStickBonusValue = () => (discipline ? 0.1 : 0.2);

  // Eliminar animaciones: dejar los valores finales directamente
  const backButtonOpacity = { setValue: () => {}, _value: 1 };
  const backButtonTranslateX = { setValue: () => {}, _value: 0 };

  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [execution, setExecution] = useState(0);
  const [executionInput, setExecutionInput] = useState("");
  const [executionSet, setExecutionSet] = useState(false);

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
  const [allGymnasts, setAllGymnasts] = useState<Gymnast[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [difficultyValues, setDifficultyValues] = useState(0);
  const [gymnastName, setGymnastName] = useState("");
  const [gymnastNoc, setGymnastNoc] = useState("");
  const [gymnastBib, setGymnastBib] = useState("");
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
  const [elementCounts] = useState<{
    [key: string]: { value: number; selected: boolean };
  }>({});
  const [elementGroupValues] = useState<{ [key: string]: number }>({});

  const safeNumber = (n: any, fallback = 0) => {
    const v = typeof n === "number" ? n : Number(n);
    return Number.isFinite(v) ? v : fallback;
  };

  /* DEFINE MODALS */
  const [showmodalmag, setShowModalMag] = useState(false);
  const [showmodalwag, setShowModalWag] = useState(false);
  const [vaultnumber, setVaultNumber] = useState("0");
  const [startValue, setStartValue] = useState(0);
  const [vaultDescription, setVaultDescription] = useState("No Vault Assigned");

  const [gender, setGender] = useState(false);
  // Estado de carga para mostrar el modal hasta que todo esté listo
  const [isLoading, setIsLoading] = useState(true);



  /* Useffect */
  useEffect(() => {
    const fetchGymnastData = async () => {
      try {
        const gymnast = await getGymnastById(gymnastid);
        const compId = gymnast?.competence_id || Number(competitionIdParam);
        const competition = await getCompetitionById(compId);
        const gymnasts = await getGymnastsByCompetition(compId);
        
        setAllGymnasts(gymnasts);
        
        // Find current index
        const index = gymnasts.findIndex(g => g.id === gymnastid);
        setCurrentIndex(index !== -1 ? index : 0);
        
        if (competition) {
          setGender(competition.gender);
          setDiscipline(competition.gender); // true = MAG, false = WAG
          setCompetenceId(competition.id.toString());
          setParticipants(competition.number_of_participants.toString());
          setFolderId(competition.folder_id.toString());
        }
        
        if (gymnast) {
          setGymnastEvent(gymnast.evento || '');
          setGymnastNumber(safeNumber(gymnast.numero, 0));
          setCv(safeNumber(gymnast.cv, 0));
          setNd(safeNumber(gymnast.nd, 0));
          setDelt(safeNumber(gymnast.delta, 0));
          setpercentage(safeNumber(gymnast.percentage, 0));
          setGymnastName(gymnast.gymnasta || '');
          setGymnastNoc(gymnast.noc || '');
          setGymnastBib(gymnast.bib || '');
          setSv(safeNumber(gymnast.sv, 0));
          setStartValue(safeNumber(gymnast.vault_value, 0));
          setVaultNumber(gymnast.vault || '0');
          setVaultDescription(gymnast.vault_description || 'No Vault Assigned');
          setRateId(gymnast.id);
          setStickBonus(safeNumber(gymnast.bonus, 0) > 0);
          setCommentsInput(gymnast.comments || '');
          setComments(gymnast.comments || '');
          const execVal = gymnast.execution;
          setExecution(safeNumber(execVal, 0));
          setExecutionSet(execVal != null);
          setEScore(safeNumber(gymnast.escore, 0));
          setMyScore(safeNumber(gymnast.myscore, 0));
          setD(safeNumber(gymnast.competition_d, 0));
          setScore(safeNumber(gymnast.competition_score, 0));
          setE(safeNumber(gymnast.competition_e, 0));
          setSb(safeNumber(gymnast.competition_sb, 0) > 0);
          setndcomp(safeNumber(gymnast.competition_nd, 0));
          setSetded(safeNumber(gymnast.dedded, 0));
        }
      } catch (error) {
        console.error("Error fetching gymnast data:", error);
        Alert.alert("Error", "Could not load gymnast data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchGymnastData();
  }, [gymnastid, competitionIdParam]);
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0052b4" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </SafeAreaView>
    );
  }

  /* Buttons un the bottom */

  const handleFinish = async () => {
    try {
      console.log("handleFinish: Saving data before going to main table...");
      await saveGymnastData();
      console.log("handleFinish: Data saved, forcing whiteboard save...");
      // Forzar guardado de whiteboard inmediatamente
      if (whiteboardRef.current) {
        try {
          await whiteboardRef.current.forceSave();
        } catch (e) {
          console.error('Whiteboard forceSave failed:', e);
        }
      }
      console.log("handleFinish: Navigating to main table...");
      
      router.push({
        pathname: '/main-table',
        params: { competitionId: competenceId.toString() }
      });
    } catch (error) {
      console.error("Error in handleFinish:", error);
      Alert.alert("Error", "Could not save the data. Please try again.");
    }
  };

  const handleGoBack = async () => {
    try {
      console.log("handleGoBack: Saving data before going to start judging...");
      await saveGymnastData();
      console.log("handleGoBack: Data saved, forcing whiteboard save...");
      // Forzar guardado de whiteboard inmediatamente
      if (whiteboardRef.current) {
        try {
          await whiteboardRef.current.forceSave();
        } catch (e) {
          console.error('Whiteboard forceSave failed:', e);
        }
      }
      console.log("handleGoBack: Navigating to start judging...");

      // Ir directamente a start-judging (sin lastGymnastId para evitar loop)
      router.push({
        pathname: '/start-judging',
        params: { 
          competitionId: competenceId.toString(),
          lastGymnastId: gymnastid.toString(),
        }
      });
    } catch (error) {
      console.error("Error in handleGoBack:", error);
      Alert.alert("Error", "Could not save the data. Please try again.");
    }
  };

  const handleNext = async () => {
    try {
      console.log("handleNext: Saving data before going to next gymnast...");
      await saveGymnastData();
      console.log("handleNext: Data saved, forcing whiteboard save...");
      // Forzar guardado de whiteboard inmediatamente
      if (whiteboardRef.current) {
        try {
          await whiteboardRef.current.forceSave();
        } catch (e) {
          console.error('Whiteboard forceSave failed:', e);
        }
      }
      console.log("handleNext: Navigating...");
      
      if (currentIndex < allGymnasts.length - 1) {
        const nextGymnast = allGymnasts[currentIndex + 1];
        console.log("Going to next gymnast:", nextGymnast.id, nextGymnast.gymnasta);
        router.replace({
          pathname: nextGymnast.evento === 'VT' ? '/gymnast-vault' : '/gymnast-floor',
          params: { 
            gymnastId: nextGymnast.id.toString(), 
            competitionId: competenceId.toString()
          }
        });
      } else {
        console.log("Last gymnast, going to main table");
        router.push({
          pathname: '/main-table',
          params: { competitionId: competenceId.toString() }
        });
      }
    } catch (error) {
      console.error("Error in handleNext:", error);
      Alert.alert("Error", "Could not save the data. Please try again.");
    }
  };

  const handlePrevious = async () => {
    try {
      console.log("handlePrevious: Saving data before going to previous gymnast...");
      await saveGymnastData();
      console.log("handlePrevious: Data saved, forcing whiteboard save...");
      // Forzar guardado de whiteboard inmediatamente
      if (whiteboardRef.current) {
        await whiteboardRef.current.forceSave();
      }
      console.log("handlePrevious: Navigating...");
      
      if (currentIndex > 0) {
        const prevGymnast = allGymnasts[currentIndex - 1];
        console.log("Going to previous gymnast:", prevGymnast.id, prevGymnast.gymnasta);
        router.replace({
          pathname: prevGymnast.evento === 'VT' ? '/gymnast-vault' : '/gymnast-floor',
          params: { 
            gymnastId: prevGymnast.id.toString(), 
            competitionId: competenceId.toString()
          }
        });
      } else {
        console.log("Already at first gymnast");
      }
    } catch (error) {
      console.error("Error in handlePrevious:", error);
      Alert.alert("Error", "Could not save the data. Please try again.");
    }
  };

  const saveGymnastData = async () => {
    try {
      console.log("=== SAVING GYMNAST DATA ===");
      console.log("Gymnast ID:", gymnastid);
      
      const gymnastUpdate = {
        sv: sv,
        nd: nd,
        delta: delt,
        percentage: percentage,
        dedded: ded,
        cv: cv,
        vault_value: startValue,
        bonus: stickbonus ? getStickBonusValue() : 0,
        execution: execution,
        escore: eScore,
        myscore: myScore,
        competition_d: d,
        competition_e: e,
        competition_sb: sb ? getStickBonusValue() : 0,
        competition_nd: ndcomp,
        competition_score: score,
        comments: comments,
        vault: vaultnumber,
        vault_description: vaultDescription,
      };
      
      console.log("Data to save:", JSON.stringify(gymnastUpdate, null, 2));
      
      const result = await updateGymnast(gymnastid, gymnastUpdate);
      
      console.log("Save result:", result);
      console.log("=== DATA SAVED SUCCESSFULLY ===");
      
      return result;
    } catch (error) {
      console.error("ERROR SAVING GYMNAST DATA:", error);
      throw error;
    }
  };

  /* Logic ======================================================== */
  const handleStickBonusChange = async (value: boolean) => {
    try {
      console.log("handleStickBonusChange called with:", value);
      console.log("Current values - eScore:", String(eScore), "sv:", String(sv), "nd:", String(nd));
      setStickBonus(value);
      
      // Usar operación más robusta para evitar errores de punto flotante
      const newmyscore = Math.round((eScore + sv + (value ? getStickBonusValue() : 0) - nd) * 1000) / 1000;
      console.log("handleStickBonusChange calculation:", String(eScore), "+", String(sv), "+", String(value ? getStickBonusValue() : 0), "-", String(nd), "=", String(newmyscore));
      const finalScore = newmyscore;
      console.log("Final Score (handleStickBonusChange):", String(finalScore));

      setMyScore(finalScore);
    } catch (error) {
      console.error('Error in handleStickBonusChange:', error);
      Alert.alert('Error', 'Could not update bonus. Please try again.');
    }
    // No need to save immediately, will be saved on navigation
  };
  /* Logic ======================================================== */

  const oncodetable = async () => {
    try {
      if (gender == true) {
        setShowModalMag(true);
      } else {
        setShowModalWag(true);
      }
    } catch (error) {
      console.error('Error in oncodetable:', error);
      Alert.alert('Error', 'Could not open vault selector. Please try again.');
    }
  };

  const handleVaultSelect = (value: {
    number: string;
    value: number;
    description: string;
  }) => {
    try {
      console.log("Selected vault from :", value);
      setVaultNumber(value.number);
      setStartValue(value.value);
      setVaultDescription(value.description);
    } catch (error) {
      console.error('Error in handleVaultSelect:', error);
      Alert.alert('Error', 'Could not select vault. Please try again.');
    }
  };

  /* Helpers ============================================== */
  function trimDecimals(num: number, decimals: number) {
    const safe = safeNumber(num, 0);
    const factor = 10 ** decimals;
    const rounded = Math.round((safe + Number.EPSILON) * factor) / factor;
    return rounded.toFixed(decimals);
  }

  function getDeductionIntervalValue(newded: number): number {
    // Map a deduction value (0..10) to a column index in the table (0..100)
    const v = safeNumber(newded, 0);
    const idx = Math.round(v * 10);
    return Math.max(0, Math.min(100, idx));
  }

  // Keep 2 decimals, but if the second decimal is 5 or more, bump the first decimal and set the second to 0.
  // This works from the raw string so we do not lose precision to floating-point conversion.
  function normalizeTwoDecimalsSpecial(value: string | number): string {
    const raw = String(value).trim().replace(",", ".");
    const negative = raw.startsWith("-");
    const unsigned = negative ? raw.slice(1) : raw;
    const [wholePartRaw, decimalPartRaw = ""] = unsigned.split(".");

    let wholePart = wholePartRaw || "0";
    const decimalDigits = decimalPartRaw.replace(/\D/g, "");
    const firstDecimal = Number(decimalDigits[0] || "0");
    const secondDecimal = Number(decimalDigits[1] || "0");

    if (secondDecimal >= 5) {
      let bumpedFirst = firstDecimal + 1;
      let bumpedWhole = Number(wholePart);

      if (bumpedFirst >= 10) {
        bumpedFirst = 0;
        bumpedWhole += 1;
      }

      const sign = negative ? "-" : "";
      return `${sign}${bumpedWhole}.${bumpedFirst}0`;
    }

    const sign = negative ? "-" : "";
    return `${sign}${wholePart}.${firstDecimal}${secondDecimal}`;
  }

  /* Tables removed — implementing percentage calculation from scratch
     The arrays that mapped deduction intervals + delt -> percentage
     have been removed. Provide clear stub functions that define the
     interface for implementing percentage logic from 0. The app
     calls `getPercentageFromTable(dedInterval, delt)` in multiple
     places; keep that wrapper but forward to explicit compute
     functions that currently return 0 as placeholders.
  */

  function computePercentageMAG(dedInterval: number, delt: number, gymnastEvent?: string): number {
    // Rows defined by delta ranges:
    // 0: 0.000 - 0.400
    // 1: 0.401 - 0.600
    // 2: 0.601 - 1.000
    // 3: 1.001 - 1.500
    // 4: 1.501 - 2.000
    // 5: 2.001 - 2.500
    // 6: 2.501 - 10.000
    // Round delta to 3 decimals to match table precision
    // Now: row is computed from the deduction based on ecomp (ded = dedInterval/10)
    const dedValue = safeNumber(dedInterval, 0) / 10;
    // Round dedValue to 3 decimals for stable comparison
    const rd = Math.round(dedValue * 1000) / 1000;
    let rowNumber = 7;
    if (rd <= 0.400) rowNumber = 1;
    else if (rd >= 0.401 && rd <= 0.600) rowNumber = 2;
    else if (rd >= 0.601 && rd <= 1.000) rowNumber = 3;
    else if (rd >= 1.001 && rd <= 1.500) rowNumber = 4;
    else if (rd >= 1.501 && rd <= 2.000) rowNumber = 5;
    else if (rd >= 2.001 && rd <= 2.500) rowNumber = 6;
    else rowNumber = 7;
    const row = Math.max(0, Math.min(6, rowNumber - 1));

    // Column is computed from delta: round(delta * 10) -> zero-based index
    const absDelt = Math.abs(safeNumber(delt, 0));
    const deltaRounded1 = Math.round(absDelt * 10) / 10;
    let col = Math.round(deltaRounded1 * 10);
    if (!Number.isFinite(col)) col = 0;
    col = Math.max(0, col);

    // Table for MAG — each subarray has 101 entries (0..100). We only fill
    // the leading entries present in the provided spec; remaining values default to 0.
    const rowTable: number[][] = [
      // row 0 (0.000 - 0.400)
      [
        /* 0.0 */100, /*0.1*/75, /*0.2*/65, /*0.3*/55, /*0.4*/45, /*0.5*/35, /*0.6*/25, /*0.7*/15, /*0.8*/5, /*0.9*/0,
      ],
      // row 1 (0.401 - 0.600)
      [100,80,70,60,50,40,30,20,10,0],
      // row 2 (0.601 - 1.000)
      [100,100,80,70,60,50,40,30,20,10,0],
      // row 3 (1.001 - 1.500)
      [100,100,94,80,70,60,50,40,30,20,10,0],
      // row 4 (1.501 - 2.000)
      [100,100,100,90,80,70,60,50,40,30,20,10,0],
      // row 5 (2.001 - 2.500)
      [100,100,100,96,88,80,70,60,50,40,30,20,10,0],
      // row 6 (2.501 - 10.000)actua
      [100,100,100,100,93,87,80,70,60,50,40,30,20,0],
    ];

    const selectedRow = rowTable[row] || [];

    // If the requested column is beyond provided values, return 0
    const result = col < selectedRow.length ? selectedRow[col] : 0;

    if (__DEV__) {
      try {
        console.log('[DEBUG] Table lookup (MAG):', {
          dedInterval,
          delt: deltaRounded1,
          rowIndex: row,
          colIndex: col,
          value: result,
        });
      } catch (err) {
        console.log('[DEBUG] Table lookup (MAG) stringify error', err);
      }
    }

    return result;
  }

  function computePercentageWAG(dedInterval: number, delt: number, gymnastEvent?: string): number {
    // Row computed from deduction (ded = dedInterval / 10)
    const dedValue = safeNumber(dedInterval, 0) / 10;
    const rd = Math.round(dedValue * 1000) / 1000;
    let rowNumber = 7;
    if (rd <= 0.400) rowNumber = 1;
    else if (rd >= 0.401 && rd <= 0.600) rowNumber = 2;
    else if (rd >= 0.601 && rd <= 1.000) rowNumber = 3;
    else if (rd >= 1.001 && rd <= 1.500) rowNumber = 4;
    else if (rd >= 1.501 && rd <= 2.000) rowNumber = 5;
    else if (rd >= 2.001 && rd <= 2.500) rowNumber = 6;
    else rowNumber = 7;
    const row = Math.max(0, Math.min(6, rowNumber - 1));

    // Column from delta (rounded to 1 decimal -> *10)
    const absDelt = Math.abs(safeNumber(delt, 0));
    const deltaRounded1 = Math.round(absDelt * 10) / 10;
    let col = Math.round(deltaRounded1 * 10);
    if (!Number.isFinite(col)) col = 0;
    col = Math.max(0, col);

    const rowTable: number[][] = [
      // row 0 (0 - 0.40)
      [100,100,75,65,55,45,35,25,15,5,0,0,0,0,0,0],
      // row 1 (>0.40 - 0.60)
      [100,100,80,70,60,50,40,30,20,10,0,0,0,0,0,0],
      // row 2 (>0.60 - 1.00)
      [100,100,100,80,70,60,50,40,30,20,10,0,0,0,0,0],
      // row 3 (>1.00 - 1.50)
      [100,100,100,90,80,70,60,50,40,30,20,10,0,0,0,0],
      // row 4 (>1.50 - 2.00)
      [100,100,100,100,90,80,70,60,50,40,30,20,10,0,0,0],
      // row 5 (>2.00 - 2.50)
      [100,100,100,100,95,85,80,70,60,50,40,30,20,10,0,0],
      // row 6 (>2.50)
      [100,100,100,100,100,95,85,80,70,60,50,40,30,20,10,0],
    ];

    const selectedRow = rowTable[row] || [];
    const result = col < selectedRow.length ? selectedRow[col] : 0;

    if (__DEV__) {
      try {
        console.log('[DEBUG] Table lookup (WAG):', {
          dedValue: rd,
          dedInterval,
          delt: deltaRounded1,
          rowIndex: row,
          colIndex: col,
          value: result,
        });
      } catch (err) {
        console.log('[DEBUG] Table lookup (WAG) stringify error', err);
      }
    }

    return result;
  }

  // Public wrapper preserved for compatibility — replace internals later
  function getPercentageFromTable(dedInterval: number, delt: number): number {
    return discipline
      ? computePercentageMAG(dedInterval, delt, gymnastEvent)
      : computePercentageWAG(dedInterval, delt, gymnastEvent);
  }
  const isValidDimension = (w: unknown, h: unknown) =>
    Number.isFinite(w as number) && Number.isFinite(h as number) && (w as number) > 0 && (h as number) > 0;

  const renderWhiteboardSafe = () => {
    try {
      if (!isValidDimension(liveWidth, liveHeight)) {
        if (__DEV__) console.warn('[GymnastVault] Invalid whiteboard dimensions', { liveWidth, liveHeight });
        return <View />;
      }
      return (
        <WhiteboardScreen
          ref={whiteboardRef}
          gymnastId={gymnastid}
          stickBonus={stickbonus}
          width={liveWidth}
          height={liveHeight * 0.75}
          setStickBonus={handleStickBonusChange}
          percentage={percentage}
          oncodetable={oncodetable}
          discipline={discipline}
          onBeforeAddImage={saveGymnastData}
        />
      );
    } catch (e) {
      console.error('[GymnastVault] Whiteboard render error:', e);
      return <View />;
    }
  };

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
          onValueChange={(value: string) => {
            setNdInputcomp(value);
          }}
          onClose={(finalValue: string) => {
            try {
              console.log("ndInputcomp:", String(finalValue));

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

                const compscorecalc = d + e + (sb ? getStickBonusValue() : 0) - rounded;
                const finalScore = Math.round(compscorecalc * 1000) / 1000;

                setScore(finalScore);
                
              } else {
                Alert.alert("Invalid Input", "Please enter a valid ND value.", [
                  { text: "OK" },
                ]);
                return;
              }
              setShowNdCompModal(false);
            } catch (error) {
              console.error('Error in ND Competition modal:', error);
              Alert.alert('Error', 'Could not save ND value. Please try again.');
              setShowNdCompModal(false);
            }
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
          onValueChange={(value: string) => {
            setSvInput(value);
          }}
          onClose={(finalValue: string) => {
            try {
              console.log("svInput:", String(finalValue));

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
                const rounded = Math.round(num * 100) / 100;
                setSv(rounded);
                console.log("Rounded SV:", String(rounded));
                console.log("eScore:", String(eScore));
                console.log("nd:", String(nd));
                console.log("stickbonus:", String(stickbonus));
                
                // Usar operación más robusta para evitar errores de punto flotante
                const newmyscore = Math.round((eScore + rounded + (stickbonus ? getStickBonusValue() : 0) - nd) * 1000) / 1000;
                console.log("Calculation: ", String(eScore), "+", String(rounded), "+", String(stickbonus ? getStickBonusValue() : 0), "-", String(nd), "=", String(newmyscore));
                const finalScore = newmyscore;

                console.log("Final Score (SV Modal):", String(finalScore));
                setMyScore(finalScore);
                
              } else {
                Alert.alert("Invalid Input", "Please enter a valid SV value.", [
                  { text: "OK" },
                ]);
                return;
              }
              setShowSvModal(false);
            } catch (error) {
              console.error('Error in SV modal:', error);
              Alert.alert('Error', 'Could not save SV value. Please try again.');
              setShowSvModal(false);
            }
          }}
          title="Enter Start Value"
          allowDecimal={true}
          maxLength={5}
        />
      )}

      {showEModal && (
        <CustomNumberPadOptimized
          visible={showEModal}
          value={eInput}
          onValueChange={(value: string) => {
            setEInput(value);
          }}
          onClose={(finalValue: string) => {
            try {
              console.log("eInput:", String(finalValue));

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
                const compscorecalc = d + rounded + (sb ? getStickBonusValue() : 0) - ndcomp;
                const finalScore = Math.round(compscorecalc * 1000) / 1000;

                setScore(finalScore);

                /* ============================================================== */
                const newdelt = Math.abs(Math.round((eScore - rounded) * 10) / 10);
                setDelt(newdelt);

                const newded = Math.round((10 - rounded) * 10) / 10;
                setSetded(newded);

                const dedInterval = getDeductionIntervalValue(newded);
                const percentageValue = getPercentageFromTable(
                  dedInterval,
                  newdelt
                );
                setpercentage(percentageValue);

                console.log('[DEBUG] E modal values:', {
                  competitionE: rounded,
                  judgeE: eScore,
                  newdelt,
                  newded,
                  dedInterval,
                  percentageValue,
                });

                /* ============================================================== */
                
              } else {
                Alert.alert("Invalid Input", "Please enter a valid E value.", [
                  { text: "OK" },
                ]);
                return;
              }
              setShowEModal(false);
            } catch (error) {
              console.error('Error in E modal:', error);
              Alert.alert('Error', 'Could not save E value. Please try again.');
              setShowEModal(false);
            }
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
          onValueChange={(value: string) => {
            setDInput(value);
          }}
          onClose={(finalValue: string) => {
            try {
              console.log("dInput:", String(finalValue));

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

                const compscorecalc = rounded + e + (sb ? getStickBonusValue() : 0) - ndcomp;
                const finalScore = Math.round(compscorecalc * 1000) / 1000;

                setScore(finalScore);

                // Calcular percentage y dedded basado en eScore y competition E
                const newdelt = Math.abs(Math.round((eScore - e) * 10) / 10);
                setDelt(newdelt);

                const newded = Math.round((10 - e) * 10) / 10;
                setSetded(newded);

                const dedInterval = getDeductionIntervalValue(newded);
                const percentageValue = getPercentageFromTable(dedInterval, newdelt);
                setpercentage(percentageValue);

                console.log('[DEBUG] D modal values:', {
                  competitionE: e,
                  judgeE: eScore,
                  newdelt,
                  newded,
                  dedInterval,
                  percentageValue,
                });
                
              } else {
                Alert.alert("Invalid Input", "Please enter a valid D value.", [
                  { text: "OK" },
                ]);
                return;
              }
              setShowDModal(false);
            } catch (error) {
              console.error('Error in D modal:', error);
              Alert.alert('Error', 'Could not save D value. Please try again.');
              setShowDModal(false);
            }
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
          onValueChange={(value: string) => {
            setExecutionInput(value);
          }}
          onClose={(finalValue: string) => {
            try {
              console.log("executionInput:", String(finalValue));

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
                // Apply special rounding first, before any calculation.
                const dedInputText = normalizeTwoDecimalsSpecial(inputString);
                const dedInput = parseFloat(dedInputText);
                setExecutionInput(dedInputText);

                // Input is a deduction value (deduction = num). Convert to judge execution score.
                const judgeE = Math.round((10 - dedInput) * 1000) / 1000;

                // store judgeE into execution state and escore
                setExecution(judgeE);
                setExecutionSet(true);
                setEScore(judgeE);

                // MyScore uses judgeE + SV + stickbonus - ND
                const newmyscore = judgeE + sv + (stickbonus ? getStickBonusValue() : 0) - nd;
                const finalScore = Math.round(newmyscore * 1000) / 1000;
                setMyScore(finalScore);

                // Delta is the absolute difference between competition reference E (state `e`) and judgeE
                const newdelt = Math.abs(Math.round((e - judgeE) * 10) / 10);
                setDelt(newdelt);

                // For the deduction interval we use the competition reference deduction (10 - competitionE)
                const newded = Math.round((10 - e) * 10) / 10;
                setSetded(newded);

                const dedInterval = getDeductionIntervalValue(newded);
                const percentageValue = getPercentageFromTable(dedInterval, newdelt);
                setpercentage(percentageValue);

                console.log('[DEBUG] Execution modal values (ded input):', {
                  dedInput,
                  judgeE,
                  newdelt,
                  newded,
                  dedInterval,
                  percentageValue,
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
            } catch (error) {
              console.error('Error in Execution modal:', error);
              Alert.alert('Error', 'Could not save Execution value. Please try again.');
              setShowExecutionModal(false);
            }
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
                  try {
                    setComments(commentsInput);
                    setShowCommentsModal(false);
                  } catch (error) {
                    console.error('Error saving comments:', error);
                    Alert.alert('Error', 'Could not save comments. Please try again.');
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
          onValueChange={(value: string) => {
            setNdInput(value);
          }}
          onClose={(finalValue: string) => {
            try {
              console.log("ndInput:", String(finalValue));

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
                const newmyscore =
                  eScore + sv + (stickbonus ? getStickBonusValue() : 0) - rounded;
                const finalScore = Math.round(newmyscore * 1000) / 1000;

                setMyScore(finalScore);
                
              } else {
                Alert.alert("Invalid Input", "Please enter a valid ND value.", [
                  { text: "OK" },
                ]);
                return;
              }
              setShowNdModal(false);
            } catch (error) {
              console.error('Error in ND modal:', error);
              Alert.alert('Error', 'Could not save ND value. Please try again.');
              setShowNdModal(false);
            }
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
          onSelect={(value: { number: string; value: number; description: string }) => {
            handleVaultSelect(value);
            setShowModalMag(false);
          }}
        />
      )}

      {showmodalwag && (
        <ModalvaultWag
          visible={showmodalwag}
          onClose={() => setShowModalWag(false)}
          onSelect={(value: { number: string; value: number; description: string }) => {
            handleVaultSelect(value);
            setShowModalWag(false);
          }}
        />
      )}

      {/* Whiteboard Screen */}
      <View style={isIphone ? styles.whiteboardWrapperIphone : undefined}>
        {renderWhiteboardSafe()}
      </View>
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
                ANNOUNCED VAULT
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
              <View style={styles.sbCell}>
                <Text
                  style={[
                    isLargeDevice ? styles.cellHeaderTextLarge : null,
                    isMediumLargeDevice
                      ? styles.cellHeaderTextMediumLarge
                      : null,
                    isSmallDevice ? styles.cellHeaderTextSmall : null,
                    isTinyDevice ? styles.cellHeaderTextTiny : null,
                  ]}
                >
                  {discipline ? "SB" : "B"}
                </Text>
              </View>
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
                setSvInput(safeNumber(sv, 0).toFixed(1)); // Set current value before opening modal
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
                {safeNumber(sv, 0).toFixed(1)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ndValueCell}
              onPress={() => {
                setNdInput(safeNumber(nd, 0).toFixed(1)); // Set current value before opening modal
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
                {safeNumber(nd, 0).toFixed(1)}
              </Text>
            </TouchableOpacity>
              <View style={styles.sbValueCell}>
                <Text
                  style={[
                    isLargeDevice ? styles.valueTextLarge : null,
                    isMediumLargeDevice ? styles.valueTextMediumLarge : null,
                    isSmallDevice ? styles.valueTextSmall : null,
                    isTinyDevice ? styles.valueTextTiny : null,
                  ]}
                >
                  {stickbonus ? getStickBonusValue() : "0.0"}
                </Text>
              </View>
            <View style={styles.executionValueCellflex}>
              <TouchableOpacity
                style={styles.executionValueCell}
                activeOpacity={0.7}
                onPress={() => {
                  // Prefill modal with current deduction (10 - execution) only if execution exists
                    if (executionSet) {
                      setExecutionInput(trimDecimals(10 - execution, 2));
                    } else {
                      // no execution yet: default to 0
                      setExecutionInput("0.00");
                    }
                  setShowExecutionModal(true);
                }}
              >
                <Text
                  style={[
                    styles.infoValueText,
                    isLargeDevice ? styles.valueTextLarge : null,
                    isMediumLargeDevice ? styles.valueTextMediumLarge : null,
                    isSmallDevice ? styles.valueTextSmall : null,
                    isTinyDevice ? styles.valueTextTiny : null,
                  ]}
                >
                  {executionSet ? trimDecimals(10 - execution, 2) : trimDecimals(0, 2)}
                </Text>
              </TouchableOpacity>
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
                    {safeNumber(eScore, 0).toFixed(3)}
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
              <TouchableOpacity
                style={styles.fullCellTouchable}
                activeOpacity={0.7}
                onPress={() => {
                  setDInput(d.toFixed(1));
                  setShowDModal(true);
                }}
              >
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
              </TouchableOpacity>
            </View>
            <View style={styles.dValueCell}>
              <TouchableOpacity
                style={styles.fullCellTouchable}
                activeOpacity={0.7}
                onPress={() => {
                  setDInput(d.toFixed(1));
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
            </View>
            <View style={styles.eCell}>
              <TouchableOpacity
                style={styles.fullCellTouchable}
                activeOpacity={0.7}
                onPress={() => {
                  setEInput(e.toFixed(3));
                  setShowEModal(true);
                }}
              >
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
              </TouchableOpacity>
            </View>
            <View style={styles.eValueCell}>
              <TouchableOpacity
                style={styles.fullCellTouchable}
                activeOpacity={0.7}
                onPress={() => {
                  setEInput(e.toFixed(3));
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
            </View>
              <>
                <View style={styles.sdCell}>
                  <TouchableOpacity
                    style={styles.fullCellTouchable}
                    activeOpacity={0.7}
                    onPress={() => {
                      const newValue = !sb;
                      setSb(newValue);
                      const compscorecalc =
                        d + e + (newValue ? getStickBonusValue() : 0) - ndcomp;
                      const finalScore = Math.round(compscorecalc * 1000) / 1000;

                      setScore(finalScore);
                    }}
                  >
                    <Text
                      style={[
                        isLargeDevice ? styles.smallCellTextLarge : null,
                        isMediumLargeDevice
                          ? styles.smallCellTextMediumLarge
                          : null,
                        isSmallDevice ? styles.smallCellTextSmall : null,
                        isTinyDevice ? styles.smallCellTextTiny : null,
                      ]}
                    >
                      {discipline ? "SB" : "B"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.sdValueCell}>
                  <TouchableOpacity
                    style={styles.fullCellTouchable}
                    activeOpacity={0.7}
                    onPress={() => {
                      const newValue = !sb;
                      setSb(newValue);
                      const compscorecalc =
                        d + e + (newValue ? getStickBonusValue() : 0) - ndcomp;
                      const finalScore = Math.round(compscorecalc * 1000) / 1000;

                      setScore(finalScore);
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
                      {sb ? getStickBonusValue() : "0.0"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            <View style={styles.ndDeductionCell}>
              <TouchableOpacity
                style={styles.fullCellTouchable}
                activeOpacity={0.7}
                onPress={() => {
                  setNdInputcomp(ndcomp.toFixed(1));
                  setShowNdCompModal(true);
                }}
              >
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
              </TouchableOpacity>
            </View>
            <View style={styles.ndDeductionValueCell}>
              <TouchableOpacity
                style={styles.fullCellTouchable}
                activeOpacity={0.7}
                onPress={() => {
                  setNdInputcomp(ndcomp.toFixed(1));
                  setShowNdCompModal(true);
                }}
              >
                <Text
                  style={[
                    isLargeDevice ? styles.ndValueTextLarge : null,
                    isMediumLargeDevice ? styles.ndValueTextMediumLarge : null,
                    isSmallDevice ? styles.ndValueTextSmall : null,
                    isTinyDevice ? styles.ndValueTextTiny : null,
                  ]}
                >
                  {ndcomp.toFixed(1)}
                </Text>
              </TouchableOpacity>
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
                {String(gymnastName || '')}
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
                {String(gymnastNoc || '')}
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
                {String(gymnastBib || '')}
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
                {String(gymnastEvent || '')}
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
                {String(number || '')}
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
            style={[
              styles.backButton,
              currentIndex === 0 && { opacity: 0.5 }
            ]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Text style={styles.buttonText}>BACK</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.mainTableButton}
            onPress={handleGoBack}
          >
            <Text style={styles.buttonText}>START LIST</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.mainTableButton}
            onPress={handleFinish}
          >
            <Text style={styles.buttonText}>MAIN TABLE</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              currentIndex === allGymnasts.length - 1 && { backgroundColor: "#DC3545" }
            ]}
            onPress={currentIndex === allGymnasts.length - 1 ? handleFinish : handleNext}
          >
            <Text style={styles.buttonText}>
              {currentIndex === allGymnasts.length - 1 ? "FINISH" : "NEXT"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debug Panel - Commented until component is created
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
          width={width}
          height={height}
          isLargeDevice={isLargeDevice}
          isSmallDevice={isSmallDevice}
          isTinyDevice={isTinyDevice}
          clearLogs={clearLogs}
        />
        */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0e0e0",
  },
  whiteboardWrapperIphone: {
    width: '100%',
    overflow: 'hidden',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  fullCellTouchable: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
      : 400,
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
    flex: 0.4,
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
    alignSelf: "stretch",
  },
  svValueTextMediumLarge: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    alignSelf: "stretch",
  },
  svValueTextSmall: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    alignSelf: "stretch",
  },
  svValueTextTiny: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    alignSelf: "stretch",
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
    fontSize: 21,
    fontWeight: "bold",
    color: "#000",
    textAlign: "left",
    alignSelf: "flex-end",
    paddingRight: 10,
  },
  compDeductionTextMediumLarge: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    textAlign: "left",
    alignSelf: "flex-end",
    paddingRight: 9,
  },
  compDeductionTextSmall: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    textAlign: "left",
    alignSelf: "flex-end",
    paddingRight: 8,
  },
  compDeductionTextTiny: {
    fontSize: 14,
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
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  ScoresmallCellTextMediumLarge: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#000",
  },
  ScoresmallCellTextSmall: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#000",
  },
  ScoresmallCellTextTiny: {
    fontSize: 17,
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
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    alignSelf: "flex-end",
    paddingRight: 10,
  },
  gymnastInfoTextMediumLarge: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    alignSelf: "flex-end",
    paddingRight: 9,
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
    fontSize: 18,
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
    alignItems: "center",
    padding: 10,
    gap: 8,
    marginTop: isLargeDevice
      ? 30
      : isMediumLargeDevice
      ? 25
      : isSmallDevice
      ? 20
      : 15,
  },
  backButton: {
    flex: 1,
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
    minWidth: 0,
  },
  mainTableButton: {
    flex: 1,
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
    minWidth: 0,
  },
  nextButton: {
    flex: 1,
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
    minWidth: 0,
  },
  buttonText: {
    fontSize: isLargeDevice
      ? 14
      : isMediumLargeDevice
      ? 13
      : isSmallDevice
      ? 11
      : 10,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
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

export default VaultScoreDisplay;
