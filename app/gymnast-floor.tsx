import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCompetitionById, getGymnastById, getGymnastsByCompetition, updateGymnast, Gymnast, Competition, Folder, getFolderById } from "../lib/database";
import WhiteboardScreen, { WhiteboardRef } from "@/componentes/WhiteboardScreen";
import CustomNumberPadOptimized from "@/componentes/CustomNumberPadOptimized";

const TEXT_FONT_DELTA = -3;

// On iPhone (not iPad), replace Modal with an absolute-positioned View overlay
const ModalWrapper = ({ visible, children, transparent, animationType, onRequestClose, ...props }: any) => {
  if (Platform.OS === 'ios' && !Platform.isPad) {
    if (!visible) return null;
    return (
      <View style={iosOverlayStyle.container}>
        {children}
      </View>
    );
  }
  return (
    <Modal visible={visible} transparent={transparent} animationType={animationType} onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
};

const iosOverlayStyle = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});

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

interface ElementCounts {
  [key: string]: { value: number; selected: boolean };
}

interface ElementGroupValues {
  I: number;
  II: number;
  III: number;
  IV: number;
}

export default function GymnastFloor() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const gymnastId = params.gymnastId ? Number(params.gymnastId) : 0;
  const competitionId = params.competitionId ? Number(params.competitionId) : 0;

  // Use reactive dimensions for whiteboard sizing on iPhone
  const windowDim = useWindowDimensions();
  const safeInsets = useSafeAreaInsets();
  const isIphone = Platform.OS === 'ios' && !Platform.isPad;
  // On iPhone, subtract horizontal safe-area insets so the whiteboard fits inside the SafeAreaView
  const liveWidth = isIphone
    ? windowDim.width - safeInsets.left - safeInsets.right
    : windowDim.width;
  const liveHeight = windowDim.height;

  const parseBooleanParam = (value: unknown): boolean | null => {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) return parseBooleanParam(value[0]);
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
    }
    return null;
  };

  const disciplineParam = parseBooleanParam(params.discipline);
  const [discipline, setDiscipline] = useState<boolean>(disciplineParam ?? false); // true = MAG, false = WAG
  
  // Ref para whiteboard
  const whiteboardRef = useRef<WhiteboardRef>(null);

  // Estado principal
  const [loading, setLoading] = useState(true);
  const [gymnast, setGymnast] = useState<Gymnast | null>(null);
  const [allGymnasts, setAllGymnasts] = useState<Gymnast[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [folder, setFolder] = useState<Folder | null>(null);

  // Elementos de dificultad (A-J)
  const [elementCounts, setElementCounts] = useState<ElementCounts>({
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

  // Grupos de elementos
  const [elementGroupValues, setElementGroupValues] = useState<ElementGroupValues>({
    I: 0.0,
    II: 0.0,
    III: 0.0,
    IV: 0.0,
  });

  // Modales
  const [showElementGroupModal, setShowElementGroupModal] = useState<{ [key: string]: boolean }>({
    I: false,
    II: false,
    III: false,
    IV: false,
  });
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsInput, setCommentsInput] = useState("");

  // Modal CustomNumberPadOptimized
  const [showNumberPadModal, setShowNumberPadModal] = useState(false);
  const [numberPadValue, setNumberPadValue] = useState("");
  const [numberPadTarget, setNumberPadTarget] = useState("");

  const safeNumber = (n: any, fallback = 0) => {
    const v = typeof n === "number" ? n : Number(n);
    return Number.isFinite(v) ? v : fallback;
  };

  // Función para abrir el modal y definir el target
  const openNumberPadModal = (target: string, value: number) => {
    try {
      // Normalizar target para ND y EXECUTION
      let normalizedTarget = target;
      if (target === "COMP_ND") normalizedTarget = "COMP_ND";
      else if (target === "ND") normalizedTarget = "ND";
      else if (target === "EXECUTION") normalizedTarget = "EXECUTION";
      setNumberPadTarget(normalizedTarget);
      setNumberPadValue(safeNumber(value).toString());
      setShowNumberPadModal(true);
    } catch (error) {
      console.error('Error opening number pad:', error);
      Alert.alert('Error', 'Could not open input. Please try again.');
    }
  };

  // Función para guardar el valor editado
  const saveNumberPadValue = (value: string) => {
    try {
      const parsed = parseFloat(value);
      const num = Number.isFinite(parsed) ? parsed : 0;
      switch (numberPadTarget) {
      case "CV": {
        setCv(num);
        // Recalcular SV y myScore según integración
        const newSv = difficultyValues + elementGroupsTotal + num;
        setSv(newSv);
        const rawScore = eScore + newSv + (stickBonus ? getStickBonusValue() : 0) - nd;
        const newMyScore = safeRound(adjustScoreFor99(rawScore), 3);
        setMyScore(newMyScore);
        // Guardar en base de datos si corresponde
        // await updateGymnast(gymnastId, { cv: num, sv: newSv, myscore: newMyScore });
        break;
      }
      case "D": {
        setCompD(num);
        // Recalcular compScore, delt, ded y percentage según integración
        const compscorecalc = num + compE + (compSb ? getStickBonusValue() : 0) - compNd;
        const finalScore = Math.round(compscorecalc * 1000) / 1000;
        setCompScore(finalScore);
        const newdelt = Math.abs(Math.round((eScore - compE) * 1000) / 1000);
        setDelta(newdelt);
        const newded = 10 - compE;
        setDedded(Number(newded));
        const dedInterval = getDeductionIntervalValue(Number(newded));
        const roundedDed = Math.round((10 - compE) * 10) / 10;
        const percentageValue = getPercentageFromTable(dedInterval, newdelt, roundedDed);
        console.log('[Floor-D] dedInput:', num, 'ded:', newded, 'roundedDed:', roundedDed, 'interval:', dedInterval, 'delt:', newdelt, 'percentage:', percentageValue);
        setPercentage(percentageValue);
        // Guardar en base de datos si corresponde
        // await updateGymnast(gymnastId, { competition_d: num, competition_score: finalScore, delt: newdelt, dedded: newded, percentage: percentageValue });
        break;
      }
      case "E": {
        setCompE(num);
        // Recalcular compScore, delt, ded y percentage según integración
        const compscorecalc = compD + num + (compSb ? getStickBonusValue() : 0) - compNd;
        const finalScore = Math.round(compscorecalc * 1000) / 1000;
        setCompScore(finalScore);
        const newdelt = Math.abs(Math.round((eScore - num) * 1000) / 1000);
        setDelta(newdelt);
        const newded = 10 - num;
        setDedded(Number(newded));
        const dedInterval = getDeductionIntervalValue(Number(newded));
        const roundedDed = Math.round((10 - num) * 10) / 10;
        const percentageValue = getPercentageFromTable(dedInterval, newdelt, roundedDed);
        console.log('[Floor-E] dedInput:', num, 'ded:', newded, 'roundedDed:', roundedDed, 'interval:', dedInterval, 'delt:', newdelt, 'percentage:', percentageValue);
        setPercentage(percentageValue);
        // Guardar en base de datos si corresponde
        // await updateGymnast(gymnastId, { competition_e: num, competition_score: finalScore, delt: newdelt, dedded: newded, percentage: percentageValue });
        break;
      }
      case "ND": {
        setNd(num);
        // Recalcular myScore según integración
        const rawScore = eScore + sv + (stickBonus ? getStickBonusValue() : 0) - num;
        const newMyScore = safeRound(adjustScoreFor99(rawScore), 3);
        setMyScore(newMyScore);
        // Guardar en base de datos si corresponde
        // await updateGymnast(gymnastId, { nd: num, myscore: newMyScore });
        break;
      }
      case "COMP_ND": {
        setCompNd(num);
        // Recalcular compScore, delt, ded y percentage según integración
        const compscorecalc = compD + compE + (compSb ? getStickBonusValue() : 0) - num;
        const finalScore = Math.round(compscorecalc * 1000) / 1000;
        setCompScore(finalScore);
        const newdelt = Math.abs(Math.round((eScore - compE) * 1000) / 1000);
        setDelta(newdelt);
        const newded = 10 - compE;
        setDedded(Number(newded));
        const dedInterval = getDeductionIntervalValue(Number(newded));
        const roundedDed = Math.round((10 - compE) * 10) / 10;
        const percentageValue = getPercentageFromTable(dedInterval, newdelt, roundedDed);
        console.log('[Floor-COMP_ND] dedInput:', num, 'ded:', newded, 'roundedDed:', roundedDed, 'interval:', dedInterval, 'delt:', newdelt, 'percentage:', percentageValue);
        setPercentage(percentageValue);
        // Guardar en base de datos si corresponde
        // await updateGymnast(gymnastId, { competition_nd: num, competition_score: finalScore, delt: newdelt, dedded: newded, percentage: percentageValue });
        break;
      }
      case "SB": {
        const isBonus = num === getStickBonusValue();
        setCompSb(isBonus);
        // Recalcular SV y myScore según integración
        const newSv = difficultyValues + elementGroupsTotal + cv;
        setSv(newSv);
        const rawMyScore = eScore + newSv + (isBonus ? getStickBonusValue() : 0) - nd;
        const newMyScore = safeRound(adjustScoreFor99(rawMyScore), 3);
        setMyScore(newMyScore);
        // Recalcular compScore, delt, ded y percentage para competencia
        const compscorecalc = compD + compE + (isBonus ? getStickBonusValue() : 0) - compNd;
        const finalScore = Math.round(compscorecalc * 1000) / 1000;
        setCompScore(finalScore);
        const newdelt = Math.abs(Math.round((eScore - compE) * 1000) / 1000);
        setDelta(newdelt);
        const newded = 10 - compE;
        setDedded(Number(newded));
        const dedInterval = getDeductionIntervalValue(Number(newded));
        const roundedDed = Math.round((10 - compE) * 10) / 10;
        const percentageValue = getPercentageFromTable(dedInterval, newdelt, roundedDed);
        console.log('[Floor-SB] dedInput:', num, 'ded:', newded, 'roundedDed:', roundedDed, 'interval:', dedInterval, 'delt:', newdelt, 'percentage:', percentageValue);
        setPercentage(percentageValue);
        // Guardar en base de datos si corresponde
        // await updateGymnast(gymnastId, { competition_sb: isBonus ? getStickBonusValue() : 0, competition_score: finalScore, delt: newdelt, dedded: newded, percentage: percentageValue });
        break;
      }
      case "EXECUTION": {
        setExecution(num);
        // Recalcular eScore y myScore según integración
        const newEScore = Number((10 - num).toFixed(3));
        setEScore(newEScore);
        // Recalcular delta, ded y percentage (dependen de eScore)
        const newdelt = Math.abs(Math.round((newEScore - compE) * 1000) / 1000);
        setDelta(newdelt);
        const newded = 10 - compE;
        setDedded(Number(newded));
        const dedInterval = getDeductionIntervalValue(Number(newded));
        const roundedDed = Math.round((10 - compE) * 10) / 10;
        const percentageValue = getPercentageFromTable(dedInterval, newdelt, roundedDed);
        console.log('[Floor-EXECUTION] dedInput:', num, 'ded:', newded, 'roundedDed:', roundedDed, 'interval:', dedInterval, 'delt:', newdelt, 'percentage:', percentageValue);
        setPercentage(percentageValue);
        const rawScore = newEScore + sv + (stickBonus ? getStickBonusValue() : 0) - nd;
        const newMyScore = safeRound(adjustScoreFor99(rawScore), 3);
        setMyScore(newMyScore);
        // Guardar en base de datos si corresponde
        // await updateGymnast(gymnastId, { execution: num, escore: newEScore, myscore: newMyScore });
        break;
      }
      case "SV": {
        setSv(num);
        // Recalcular myScore según integración
        const rawScore = eScore + num + (stickBonus ? getStickBonusValue() : 0) - nd;
        const newMyScore = safeRound(adjustScoreFor99(rawScore), 3);
        setMyScore(newMyScore);
        // Guardar en base de datos si corresponde
        // await updateGymnast(gymnastId, { sv: num, myscore: newMyScore });
        break;
      }
      case "EG_I":
        setElementGroupValues((prev) => ({ ...prev, I: num }));
        break;
      case "EG_II":
        setElementGroupValues((prev) => ({ ...prev, II: num }));
        break;
      case "EG_III":
        setElementGroupValues((prev) => ({ ...prev, III: num }));
        break;
      case "EG_IV":
        setElementGroupValues((prev) => ({ ...prev, IV: num }));
        break;
      default:
        break;
      }
      setShowNumberPadModal(false);
    } catch (error) {
      console.error('Error in saveNumberPadValue:', error);
      Alert.alert('Error', 'Could not save the value. Please try again.');
      setShowNumberPadModal(false);
    }
  };

  // Bonus
  const [stickBonus, setStickBonus] = useState(false);

  // Función para obtener el valor máximo permitido para grupos según evento y disciplina
  const getMaxValueForGroup = (evento: string, isDiscipline: boolean): number => {
    if (isDiscipline && evento === "FX") {
      return 0.5;
    } else if (
      !isDiscipline &&
      (evento === "FX" || evento === "UB" || evento === "BB")
    ) {
      return 0.5;
    } else if (
      isDiscipline &&
      (evento === "PH" || evento === "SR" || evento === "PB" || evento === "HB")
    ) {
      return 0.5;
    } else {
      return 1.1;
    }
  };

  // Función para obtener los valores permitidos en el modal según evento y disciplina
  const getAvailableValuesForGroup = (evento: string, isDiscipline: boolean, groupName: string): number[] => {
    // Solo el grupo IV tiene lógica específica por evento
    if (groupName === "IV") {
      if (isDiscipline && evento === "FX") {
        return [0.0, 0.3, 0.5];
      } else if (
        !isDiscipline &&
        (evento === "FX" || evento === "UB" || evento === "BB")
      ) {
        return [0.0, 0.5];
      } else if (
        isDiscipline &&
        (evento === "PH" || evento === "SR" || evento === "PB" || evento === "HB")
      ) {
        return [0.0, 0.1, 0.2, 0.3, 0.4, 0.5];
      } else {
        return [0.0, 0.1, 0.2, 0.3, 0.4, 0.5];
      }
    } else {
      // Grupos I, II, III: Solo dependen de discipline
      return isDiscipline ?  [0.0, 0.3, 0.5] :   [0.0, 0.5];
    }
  };

  // Valores calculados
  const [totalElements, setTotalElements] = useState(0);
  const [difficultyValues, setDifficultyValues] = useState(0);
  const [elementGroupsTotal, setElementGroupsTotal] = useState(0);
  const [cv, setCv] = useState(0);
  const [sv, setSv] = useState(0);
  const [execution, setExecution] = useState(0);
  const [eScore, setEScore] = useState(0);
  const [nd, setNd] = useState(0);
  const [myScore, setMyScore] = useState(0);

  // Valores de competencia
  const [compD, setCompD] = useState(0);
  const [compE, setCompE] = useState(0);
  const [compSb, setCompSb] = useState(false);
  const [compNd, setCompNd] = useState(0);
  const [compScore, setCompScore] = useState(0);

  // Comentarios y delta
  const [comments, setComments] = useState("");
  const [delta, setDelta] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [dedded, setDedded] = useState(0);

  const getStickBonusValue = () => (discipline ? 0.1 : 0.2);

  const adjustScoreFor99 = (score: number): number => {
    const roundedScore = Math.round(score * 1000) / 1000;
    const scoreStr = roundedScore.toFixed(3);
    const endsWithX99Pattern = /\d\.\d99$/;
    if (endsWithX99Pattern.test(scoreStr)) return roundedScore + 0.001;
    return roundedScore;
  };

  // Helper functions for percentage calculation
  function getDeductionIntervalValue(newded: number): number {
    // Redondear a 2 decimales para evitar problemas de precisión
    const rounded = Math.round(newded * 100) / 100;
    if (rounded >= 0.0 && rounded <= 0.4) return 1;
    if (rounded > 0.4 && rounded <= 0.6) return 2;
    if (rounded > 0.6 && rounded <= 1.0) return 3;
    if (rounded > 1.0 && rounded <= 1.5) return 4;
    if (rounded > 1.5 && rounded <= 2.0) return 5;
    if (rounded > 2.0 && rounded <= 2.5) return 6;
    if (rounded > 2.5 && rounded <= 10.0) return 7;
    return 0;
  }

  const percentageTableDisciplineTrue  = [
    [100, 75, 65, 55, 45, 35, 25, 15, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    [100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0],
    [100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0, 0],
    [100, 100, 94, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0],
    [100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0],
    [100, 100, 100, 96, 88, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0],
    [100, 100, 100, 100, 93, 87, 80, 70, 60, 50, 40, 30, 20, 0, 0, 0, 0],
  ];

  const percentageTableDisciplineFalse = [
    [100, 100, 75, 65, 55, 45, 35, 25, 15, 5, 0, 0, 0, 0, 0, 0],
    [100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0],
    [100, 100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0],
    [100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0],
    [100, 100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0],
    [100, 100, 100, 100, 95, 85, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0],
    [100, 100, 100, 100, 100, 95, 85, 80, 70, 60, 50, 40, 30, 20, 10, 0],
  ];

  const deltSteps = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];

  function getPercentageFromTable(dedInterval: number, delt: number, roundedDed?: number): number {
    const percentageTable = discipline ? percentageTableDisciplineTrue : percentageTableDisciplineFalse;
    // Misma regla que Vault/integration: si delta > 1.4, percentage = 0
    if (delt > 1.4) return 0;
    if (dedInterval < 1 || dedInterval > 7) return 0;

    // Determine row using roundedDed (ded redondeado a 1 decimal) when available
    let rowNumber = 7;
    if (typeof roundedDed === 'number') {
      // roundedDed ya está redondeado a 1 decimal (ej: 1.2, 1.4, 1.6)
      if (roundedDed <= 0.4) rowNumber = 1;
      else if (roundedDed > 0.4 && roundedDed <= 0.6) rowNumber = 2;
      else if (roundedDed > 0.6 && roundedDed <= 1.0) rowNumber = 3;
      else if (roundedDed > 1.0 && roundedDed <= 1.5) rowNumber = 4;
      else if (roundedDed > 1.5 && roundedDed <= 2.0) rowNumber = 5;
      else if (roundedDed > 2.0 && roundedDed <= 2.5) rowNumber = 6;
      else rowNumber = 7;
    } else {
      rowNumber = dedInterval > 0 ? dedInterval : 7;
    }

    const row = Math.max(0, Math.min(6, rowNumber - 1));

    // Accuracy: redondear delta al step de 0.1 más cercano (ej: 0.267 -> 0.3)
    const deltRounded = Math.round((delt + Number.EPSILON) * 10) / 10;

    let deltIndex = deltSteps.findIndex((step) => Math.abs(step - deltRounded) < 1e-9);
    if (deltIndex < 0) {
      deltIndex = deltSteps.reduce((bestIdx, step, idx) => {
        return Math.abs(step - deltRounded) < Math.abs(deltSteps[bestIdx] - deltRounded) ? idx : bestIdx;
      }, 0);
    }

    const result = percentageTable[row][deltIndex] || 0;
    console.log('[Floor-getPercentageFromTable] roundedDed:', roundedDed, 'rowNumber:', rowNumber, 'row:', row, 'deltRounded:', deltRounded, 'deltIndex:', deltIndex, 'result:', result);
    return result;
  }

  const saveGymnastData = async () => {
    try {
      const gymnastUpdate = {
        a: elementCounts.A.value,
        b: elementCounts.B.value,
        c: elementCounts.C.value,
        d: elementCounts.D.value,
        e: elementCounts.E.value,
        f: elementCounts.F.value,
        g: elementCounts.G.value,
        h: elementCounts.H.value,
        i: elementCounts.I.value,
        j: elementCounts.J.value,
        number_of_element: totalElements,
        difficulty_values: difficultyValues,
        element_group1: elementGroupValues.I,
        element_group2: elementGroupValues.II,
        element_group3: elementGroupValues.III,
        element_group4: elementGroupValues.IV,
        element_group_total: elementGroupsTotal,
        cv: cv,
        sv: sv,
        bonus: stickBonus ? getStickBonusValue() : 0,
        nd: nd,
        execution: execution,
        escore: eScore,
        myscore: myScore,
        competition_d: compD,
        competition_e: compE,
        competition_sb: compSb ? getStickBonusValue() : 0,
        competition_nd: compNd,
        competition_score: compScore,
        comments: comments,
        delta: delta,
        percentage: percentage,
        dedded: dedded,
      };
      return await updateGymnast(gymnastId, gymnastUpdate);
    } catch (error) {
      console.error("Error saving gymnast data:", error);
      throw error;
    }
  };

  useEffect(() => {
    loadGymnastData();
  }, [gymnastId]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      try {
        // Clear all state
        setGymnast(null);
        setAllGymnasts([]);
        setCompetition(null);
        setFolder(null);
        setCurrentIndex(0);
        
        // Clear element counts and group values
        setElementCounts({
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
        setElementGroupValues({ I: 0, II: 0, III: 0, IV: 0 });
        
        // Clear scores and values
        setTotalElements(0);
        setDifficultyValues(0);
        setElementGroupsTotal(0);
        setCv(0);
        setSv(0);
        setExecution(0);
        setEScore(0);
        setNd(0);
        setMyScore(0);
        setStickBonus(false);
        
        // Clear modal states
        setShowElementGroupModal({ I: false, II: false, III: false, IV: false });
        setShowCommentsModal(false);
        setShowNumberPadModal(false);
        
        // Clear comments and other values
        setComments('');
        setDelta(0);
        setPercentage(0);
        setDedded(0);
        
        // Clear competition values
        setCompD(0);
        setCompE(0);
        setCompSb(false);
        setCompNd(0);
        setCompScore(0);
        
        // On Android, trigger GC to help with memory
        if (Platform.OS === 'android') {
          try {
            require('react-native').NativeModules?.ExponentUtil?.sendEvent?.('RCTNativeAppDelegate.onPause');
          } catch (e) {
            // GC trigger attempt - ignore if it fails
          }
        }
      } catch (e) {
        console.error('[GymnastFloor] Error during cleanup:', e);
      }
    };
  }, []);

  const loadGymnastData = async () => {
    try {
      setLoading(true);
      const gymnastData = await getGymnastById(gymnastId);
      const allGymList = await getGymnastsByCompetition(competitionId);

      // Si no llega discipline por params, inferirla desde la competencia
      if (disciplineParam === null && competitionId) {
        try {
          const competitionData = await getCompetitionById(competitionId);
          if (competitionData) {
            setDiscipline(competitionData.gender);
            setCompetition(competitionData);
            
            // Cargar carpeta si la competencia tiene folder_id
            if (competitionData.folder_id) {
              try {
                const folderData = await getFolderById(competitionData.folder_id);
                setFolder(folderData);
              } catch (e) {
                console.warn('[GymnastFloor] Could not load folder:', e);
              }
            }
          }
        } catch (e) {
          console.warn('[GymnastFloor] Could not load competition:', e);
        }
      } else if (competitionId) {
        // Cargar competencia incluso si discipline viene por params
        try {
          const competitionData = await getCompetitionById(competitionId);
          if (competitionData) {
            setCompetition(competitionData);
            
            if (competitionData.folder_id) {
              try {
                const folderData = await getFolderById(competitionData.folder_id);
                setFolder(folderData);
              } catch (e) {
                console.warn('[GymnastFloor] Could not load folder:', e);
              }
            }
          }
        } catch (e) {
          console.warn('[GymnastFloor] Could not load competition:', e);
        }
      }

      if (!gymnastData) {
        Alert.alert("Error", "Gymnast not found");
        router.back();
        return;
      }

      setGymnast(gymnastData);
      setAllGymnasts(allGymList);
      
      // Calcular y guardar el índice actual
      const index = allGymList.findIndex(g => g.id === gymnastId);
      setCurrentIndex(index !== -1 ? index : 0);

      // Cargar elementos de dificultad
      setElementCounts({
        J: { value: gymnastData.j || 0, selected: (gymnastData.j || 0) > 0 },
        I: { value: gymnastData.i || 0, selected: (gymnastData.i || 0) > 0 },
        H: { value: gymnastData.h || 0, selected: (gymnastData.h || 0) > 0 },
        G: { value: gymnastData.g || 0, selected: (gymnastData.g || 0) > 0 },
        F: { value: gymnastData.f || 0, selected: (gymnastData.f || 0) > 0 },
        E: { value: gymnastData.e || 0, selected: (gymnastData.e || 0) > 0 },
        D: { value: gymnastData.d || 0, selected: (gymnastData.d || 0) > 0 },
        C: { value: gymnastData.c || 0, selected: (gymnastData.c || 0) > 0 },
        B: { value: gymnastData.b || 0, selected: (gymnastData.b || 0) > 0 },
        A: { value: gymnastData.a || 0, selected: (gymnastData.a || 0) > 0 },
      });

      // Cargar grupos de elementos
      setElementGroupValues({
        I: safeNumber(gymnastData.element_group1, 0),
        II: safeNumber(gymnastData.element_group2, 0),
        III: safeNumber(gymnastData.element_group3, 0),
        IV: safeNumber(gymnastData.element_group4, 0),
      });

      // Cargar valores
      setTotalElements(safeNumber(gymnastData.number_of_element, 0));
      setDifficultyValues(safeNumber(gymnastData.difficulty_values, 0));
      setElementGroupsTotal(safeNumber(gymnastData.element_group_total, 0));
      setCv(safeNumber(gymnastData.cv, 0));
      setSv(safeNumber(gymnastData.sv, 0));
      setExecution(safeNumber(gymnastData.execution, 0));
      setEScore(safeNumber(gymnastData.escore, 0));
      setNd(safeNumber(gymnastData.nd, 0));
      setMyScore(safeNumber(gymnastData.myscore, 0));
      setStickBonus(gymnastData.bonus > 0);

      // Cargar valores de competencia
      setCompD(safeNumber(gymnastData.competition_d, 0));
      setCompE(safeNumber(gymnastData.competition_e, 0));
      setCompSb(gymnastData.competition_sb > 0);
      setCompNd(safeNumber(gymnastData.competition_nd, 0));
      setCompScore(safeNumber(gymnastData.competition_score, 0));
      setComments(gymnastData.comments || "");
      setDelta(safeNumber(gymnastData.delta, 0));
      setPercentage(safeNumber(gymnastData.percentage, 0));
      setDedded(safeNumber(gymnastData.dedded, 0));


    } catch (error) {
      console.error("Error loading gymnast:", error);
      Alert.alert("Error", "Could not load gymnast data.");
    } finally {
      setLoading(false);
    }
  };

  const safeRound = (num: number, decimals: number = 1): number => {
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  };

  const calculateDifficultyValues = (counts: ElementCounts): number => {
    return (
      counts.A.value * 0.1 +
      counts.B.value * 0.2 +
      counts.C.value * 0.3 +
      counts.D.value * 0.4 +
      counts.E.value * 0.5 +
      counts.F.value * 0.6 +
      counts.G.value * 0.7 +
      counts.H.value * 0.8 +
      counts.I.value * 0.9 +
      counts.J.value * 1.0
    );
  };

  const recalculateScores = async (updates: Partial<Gymnast>) => {
    try {
      await updateGymnast(gymnastId, updates);
      console.log("âœ… Datos guardados correctamente");
    } catch (error) {
      console.error("âŒ Error guardando datos:", error);
      Alert.alert("Error", "Could not save data.");
    }
  };

  const toggleElement = async (element: string, num: number) => {
    try {
      setElementCounts((prev) => {
        try {
          const newCounts = { ...prev };
          if (newCounts[element].selected && newCounts[element].value === num) {
            newCounts[element] = { value: 0, selected: false };
          } else {
            newCounts[element] = { value: num, selected: true };
          }

          const sum = Object.values(newCounts).reduce(
            (acc, item) => (item.selected ? acc + item.value : acc),
            0
          );

          const newDifficulty = calculateDifficultyValues(newCounts);
          const newSv = newDifficulty + elementGroupsTotal + cv;
          const rawScore = eScore + newSv + (stickBonus ? getStickBonusValue() : 0) - nd;
      const newMyScore = safeRound(adjustScoreFor99(rawScore), 3);

      setTotalElements(sum);
      setDifficultyValues(newDifficulty);
      setSv(newSv);
      setMyScore(newMyScore);

      // Guardar en DB
      recalculateScores({
        [element.toLowerCase()]: newCounts[element].value,
        number_of_element: sum,
        difficulty_values: newDifficulty,
        sv: newSv,
        myscore: newMyScore,
      });

          return newCounts;
        } catch (innerError) {
          console.error('Error in toggleElement state update:', innerError);
          Alert.alert('Error', 'Could not update element. Please try again.');
          return prev;
        }
      });
    } catch (error) {
      console.error('Error in toggleElement:', error);
      Alert.alert('Error', 'Could not update element. Please try again.');
    }
  };

  const handleElementGroupChange = async (group: string, value: number) => {
    try {
      // Validaciones según el evento
      const evento = gymnast?.evento || '';
      
      // Validar rango de valores según disciplina y evento
      const maxValue = getMaxValueForGroup(evento, discipline);
      if (value < 0 || value > maxValue) {
        Alert.alert('Error', `El valor debe estar entre 0.0 y ${maxValue.toFixed(1)}`);
        return;
      }
      
      const updated = { ...elementGroupValues, [group]: value };
      const total = updated.I + updated.II + updated.III + updated.IV;

      setElementGroupValues(updated);
      setElementGroupsTotal(total);

      const newSv = difficultyValues + total + cv;
      const rawScore = eScore + newSv + (stickBonus ? getStickBonusValue() : 0) - nd;
      const newMyScore = safeRound(adjustScoreFor99(rawScore), 3);

      setSv(newSv);
      setMyScore(newMyScore);

      setShowElementGroupModal((prev) => ({ ...prev, [group]: false }));

      await recalculateScores({
        element_group1: updated.I,
        element_group2: updated.II,
        element_group3: updated.III,
        element_group4: updated.IV,
        element_group_total: total,
        sv: newSv,
        myscore: newMyScore,
      });
    } catch (error) {
      console.error('Error in handleElementGroupChange:', error);
      Alert.alert('Error', 'Could not save element group. Please try again.');
      setShowElementGroupModal((prev) => ({ ...prev, [group]: false }));
    }
  };
  
  const getMaxGroupsForEvent = (evento: string): number => {
    switch (evento) {
      case 'FX': // Floor
        return 4;
      case 'PH': // Pommel Horse
      case 'PB': // Parallel Bars
      case 'HB': // Horizontal Bar
      case 'UB': // Uneven Bars
      case 'BB': // Balance Beam
        return 5;
      case 'SR': // Still Rings
        return 3;
      case 'VT': // Vault
        return 0; // Vault no tiene grupos
      default:
        return 4; // Default para Floor
    }
  };

  const handleStickBonusChange = async (value: boolean) => {
    try {
      setStickBonus(value);
      const bonus = value ? getStickBonusValue() : 0;
      const rawScore = eScore + sv + bonus - nd;
      const newMyScore = safeRound(adjustScoreFor99(rawScore), 3);
      setMyScore(newMyScore);

      await recalculateScores({
        bonus: bonus,
        myscore: newMyScore,
      });
    } catch (error) {
      console.error('Error in handleStickBonusChange:', error);
      Alert.alert('Error', 'Could not save bonus. Please try again.');
    }
  };

  const saveGymnastDataAndNavigate = async (nextGymnast?: Gymnast) => {
    try {
      await saveGymnastData();
      if (whiteboardRef.current) {
        try {
          await whiteboardRef.current.forceSave();
        } catch (e) {
          console.error('Whiteboard forceSave failed:', e);
          // No bloquear navegación por whiteboard; evitar crash.
        }
      }

      if (nextGymnast) {
        const pathname = nextGymnast.evento === 'VT' ? '/gymnast-vault' : '/gymnast-floor';
        router.replace({
          pathname,
          params: { 
            gymnastId: nextGymnast.id.toString(), 
            competitionId: competitionId.toString(),
            discipline: discipline.toString()
          }
        });
      } else {
        router.push({
          pathname: "/main-table",
          params: { competitionId: competitionId.toString() }
        });
      }
    } catch (error) {
      console.error('Error in saveGymnastDataAndNavigate:', error);
      Alert.alert('Error', 'Could not save the data. Please try again.');
    }
  };

  const handleNext = async () => {
    try {
      const nextIndex = currentIndex + 1;
      if (nextIndex < allGymnasts.length) {
        const nextGymnast = allGymnasts[nextIndex];
        await saveGymnastDataAndNavigate(nextGymnast);
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
      Alert.alert('Error', 'Could not navigate to next gymnast. Please try again.');
    }
  };

  const handlePrevious = async () => {
    try {
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const prevGymnast = allGymnasts[prevIndex];
        await saveGymnastDataAndNavigate(prevGymnast);
      }
    } catch (error) {
      console.error('Error in handlePrevious:', error);
      Alert.alert('Error', 'Could not navigate to previous gymnast. Please try again.');
    }
  };

  const handleFinish = async () => {
    try {
      await saveGymnastDataAndNavigate();
    } catch (error) {
      console.error('Error in handleFinish:', error);
      Alert.alert('Error', 'Could not save data. Please try again.');
    }
  };

  // Safe renderer for Whiteboard to avoid unhandled render exceptions crashing the screen
  const isValidDimension = (w: unknown, h: unknown) =>
    Number.isFinite(w as number) && Number.isFinite(h as number) && (w as number) > 0 && (h as number) > 0;

  const renderWhiteboardSafe = () => {
    try {
      if (!isValidDimension(liveWidth, liveHeight)) {
        if (__DEV__) console.warn('[GymnastFloor] Invalid whiteboard dimensions', { liveWidth, liveHeight });
        return <View />;
      }
      return (
        <WhiteboardScreen
          ref={whiteboardRef}
          gymnastId={gymnastId}
          width={liveWidth}
          height={liveHeight * 0.69}
          stickBonus={stickBonus}
          setStickBonus={handleStickBonusChange}
          discipline={discipline}
          event={gymnast?.evento}
          percentage={percentage}
          onBeforeAddImage={saveGymnastData}
        />
      );
    } catch (e) {
      console.error('[GymnastFloor] Whiteboard render error:', e);
      return <View />;
    }
  };

  const handleGoBack = async () => {
    try {
      await saveGymnastData();
      if (whiteboardRef.current) {
        try {
          await whiteboardRef.current.forceSave();
        } catch (e) {
          console.error('Whiteboard forceSave failed:', e);
          // No bloquear navegación por whiteboard; evitar crash.
        }
      }

      router.push({
        pathname: '/start-judging',
        params: {
          competitionId: competitionId.toString(),
          lastGymnastId: gymnastId.toString(),
          discipline: discipline.toString(),
        },
      });
    } catch (error) {
      console.error('Error in handleGoBack:', error);
      Alert.alert('Error', 'Could not save the data. Please try again.');
    }
  };

  const renderNumberButtons = (rowLabel: string) => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
    const isRowSelected = elementCounts[rowLabel].selected;
    const selectedValue = elementCounts[rowLabel].value;

    const sumOtherRows = Object.entries(elementCounts)
      .filter(([label]) => label !== rowLabel)
      .reduce((acc, [, item]) => (item.selected ? acc + item.value : acc), 0);

    return (
      <View key={rowLabel} style={styles.tableRow}>
        <View style={[styles.labelCell, isRowSelected && styles.labelCellSelected]}>
          <Text style={styles.labelText}>{rowLabel}</Text>
        </View>
        {numbers.map((num) => {
          const isSelected = isRowSelected && selectedValue === num;
          const wouldExceed = sumOtherRows + num > 8;
          const isDisabled = !isSelected && wouldExceed;

          return (
            <TouchableOpacity
              key={`${rowLabel}-${num}`}
              style={[
                styles.numberCell,
                isSelected ? styles.numberActive : styles.numberInactive,
                isDisabled && styles.numberDisabled,
              ]}
              onPress={() => !isDisabled && toggleElement(rowLabel, num)}
              disabled={isDisabled}
            >
              <Text style={[styles.numberText, isSelected && styles.numberActiveText]}>
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={[styles.selectedCell, isRowSelected ? styles.selectedCellActive : styles.selectedCellInactive]}>
          <Text style={styles.selectedCellText}>{isRowSelected ? selectedValue : "0"}</Text>
        </View>
        <View style={[styles.selectedCell, isRowSelected ? styles.selectedCellActive : styles.selectedCellInactive]}>
          <Text style={styles.selectedCellText}>{rowLabel}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004aad" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!gymnast) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={isIphone ? styles.whiteboardWrapperIphone : undefined}>
        {renderWhiteboardSafe()}
      </View>
      
      {/* Header with Breadcrumbs/Folder Info */}
      {(folder || competition) && (
        <View style={styles.breadcrumbContainer}>
          <TouchableOpacity 
            style={styles.breadcrumbButton} 
            onPress={() => {
              try {
                if (folder) {
                  // Navigate back to folder view
                  router.push({
                    pathname: '/folder/[id]',
                    params: { id: folder.id.toString() }
                  });
                } else if (competition) {
                  // Navigate back to main table
                  router.push({
                    pathname: '/main-table',
                    params: { competitionId: competition.id.toString() }
                  });
                }
              } catch (e) {
                console.error('Error navigating from breadcrumb:', e);
                router.back();
              }
            }}
          >
            <Text style={styles.breadcrumbText}>
              {folder ? `📁 ${folder.titulo}` : `🏆 ${competition?.name || 'Competition'}`}
              {folder && competition ? ` > 🏆 ${competition.name}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView>
        <View style={styles.mainContent}>
          {/* Left Column: Code Table */}
          <View style={styles.leftColumn}>
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

          {/* Right Column: Scores and Info */}
          <View style={styles.rightColumn}>
            <View style={styles.infoTable}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text allowFontScaling={false} style={styles.infoLabelText}>NUMBER OF ELEMENTS</Text>
                </View>
                <View style={[
                  styles.infoValueCell,
                  ((discipline ? totalElements >= 6 : totalElements >= 6) && totalElements <= 8)
                    ? styles.infoValueCellGreen
                    : styles.infoValueCellRed,
                ]}>
                  <Text style={styles.infoValueText}>{String(totalElements)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>DIFFICULTY VALUES</Text>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <Text style={styles.infoValueText}>{difficultyValues.toFixed(1)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>ELEMENT GROUPS</Text>
                </View>
                <View style={styles.elementGroupsContainer}>
                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity onPress={() => setShowElementGroupModal({ ...showElementGroupModal, I: true })} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={styles.elementGroupText}>I</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <TouchableOpacity onPress={() => setShowElementGroupModal({ ...showElementGroupModal, I: true })} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={styles.elementGroupValue}>{elementGroupValues.I.toFixed(1)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity onPress={() => setShowElementGroupModal({ ...showElementGroupModal, II: true })} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={styles.elementGroupText}>II</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <TouchableOpacity onPress={() => setShowElementGroupModal({ ...showElementGroupModal, II: true })} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={styles.elementGroupValue}>{elementGroupValues.II.toFixed(1)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity onPress={() => setShowElementGroupModal({ ...showElementGroupModal, III: true })} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={styles.elementGroupText}>III</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <TouchableOpacity onPress={() => setShowElementGroupModal({ ...showElementGroupModal, III: true })} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={styles.elementGroupValue}>{elementGroupValues.III.toFixed(1)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.elementGroupCellTitle}>
                    <TouchableOpacity onPress={() => setShowElementGroupModal({ ...showElementGroupModal, IV: true })} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={styles.elementGroupText}>IV</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <TouchableOpacity onPress={() => setShowElementGroupModal({ ...showElementGroupModal, IV: true })} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={styles.elementGroupValue}>{elementGroupValues.IV.toFixed(1)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>TOTAL EG</Text>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <Text style={styles.infoValueText}>{elementGroupsTotal.toFixed(1)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>CONNECTION VALUE</Text>
                </View>
                {/* CV: Ocultar si evento es PH/PB o si es MAG en SR */}
                {gymnast?.evento !== 'PH' && gymnast?.evento !== 'PB' && !(discipline && gymnast?.evento === 'SR') && (
                  <>
                    <View style={styles.stickBonusCelltext}>
                      <TouchableOpacity style={styles.fullCellTouchable} onPress={() => openNumberPadModal("CV", cv)}>
                        <Text style={styles.bonusLabelText}>CV</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.stickBonusCell}>
                      <TouchableOpacity style={styles.fullCellTouchable} onPress={() => openNumberPadModal("CV", cv)}>
                        <Text style={styles.bonusValueText}>{cv.toFixed(1)}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                {/* SB: Ocultar si evento es PH, mostrar en PB y otros eventos según discipline */}
                {gymnast?.evento !== 'PH' && (
                  <>
                    {!discipline && (
                      <>
                        <View style={styles.stickBonusCelltext}>
                          <TouchableOpacity style={styles.fullCellTouchable} onPress={() => handleStickBonusChange(!stickBonus)}>
                            <Text style={styles.bonusLabelText}>{discipline ? 'SB' : 'DT'}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.stickBonusCell}>
                          <TouchableOpacity style={styles.fullCellTouchable} onPress={() => handleStickBonusChange(!stickBonus)}>
                            <Text style={styles.bonusValueText}>{stickBonus ? getStickBonusValue().toFixed(1) : "0.0"}</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                    {discipline && (
                      <>
                        <View style={styles.stickBonusCelltext}>
                          <TouchableOpacity style={styles.fullCellTouchable} onPress={() => handleStickBonusChange(!stickBonus)}>
                            <Text style={styles.bonusLabelText}>{gymnast?.evento === 'PB' ? 'BONUS' : 'SB'}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.stickBonusCell}>
                          <TouchableOpacity style={styles.fullCellTouchable} onPress={() => handleStickBonusChange(!stickBonus)}>
                            <Text style={styles.bonusValueText}>{stickBonus ? getStickBonusValue().toFixed(1) : "0.0"}</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </>
                )}
                {/* ND: Siempre visible */}
                <View style={styles.ndCell}>
                  <TouchableOpacity style={styles.fullCellTouchable} onPress={() => openNumberPadModal("ND", nd)}>
                    <Text style={styles.bonusLabelText}>ND</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.ndCellText}>
                  <TouchableOpacity style={styles.fullCellTouchable} onPress={() => openNumberPadModal("ND", nd)}>
                    <Text style={styles.bonusValueText}>{nd.toFixed(1)}</Text>
                  </TouchableOpacity>
                </View>
                {/* SV: Siempre visible */}
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
                <View style={styles.infoValueCellBlue}>
                  <TouchableOpacity style={styles.fullCellTouchable} onPress={() => openNumberPadModal("EXECUTION", execution)}>
                    <Text style={styles.infoValueText}>{execution.toFixed(1)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>E SCORE</Text>
                </View>
                <View style={styles.scoreValueCell}>
                  <Text style={styles.scoreValueText}>{eScore.toFixed(1)}</Text>
                </View>
                <View style={styles.myScoreCellScore}>
                  <Text style={styles.myScoreLabelTextSmall}>MY SCORE</Text>
                </View>
                <View style={styles.myScoreCell}>
                  <Text style={styles.myScoreValueText}>{myScore.toFixed(3)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>DELTA (Δ)</Text>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <Text style={styles.infoValueText}>{delta.toFixed(1)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.compDeductionLabelCell}>
                  <Text style={styles.compDeductionLabelText}>COMPETITION INFO</Text>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <TouchableOpacity style={styles.fullCellTouchable} onPress={() => openNumberPadModal("D", compD)}>
                    <Text style={styles.infoValueText}>D: {compD.toFixed(1)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <TouchableOpacity style={styles.fullCellTouchable} onPress={() => openNumberPadModal("E", compE)}>
                    <Text style={styles.infoValueText}>E: {compE.toFixed(3)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <TouchableOpacity
                    style={styles.fullCellTouchable}
                    onPress={() => {
                      try {
                        const nextCompSb = !compSb;
                        setCompSb(nextCompSb);

                        const compscorecalc = compD + compE + (nextCompSb ? getStickBonusValue() : 0) - compNd;
                        const finalScore = Math.round(compscorecalc * 1000) / 1000;
                        setCompScore(finalScore);

                        const newdelt = Math.abs(Math.round((eScore - compE) * 1000) / 1000);
                        setDelta(newdelt);

                        const newded = 10 - compE;
                        setDedded(Number(newded));

                        const dedInterval = getDeductionIntervalValue(Number(newded));   
                        const roundedDed = Math.round((10 - eScore) * 10) / 10;
                        const percentageValue = getPercentageFromTable(dedInterval, newdelt, roundedDed);
                        console.log('[Floor-CompSB-Toggle] ded:', newded, 'roundedDed:', roundedDed, 'interval:', dedInterval, 'delt:', newdelt, 'percentage:', percentageValue);
                        setPercentage(percentageValue);
                      } catch (error) {
                        console.error('Error toggling compSb:', error);
                        Alert.alert('Error', 'Could not update SB. Please try again.');
                      }
                    }}
                  >
                    <Text style={styles.infoValueText}>{discipline ? 'SB' : 'DMT' }: {compSb ? getStickBonusValue().toFixed(1) : "0.0"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <TouchableOpacity style={styles.fullCellTouchable} onPress={() => openNumberPadModal("COMP_ND", compNd)}>
                    <Text style={styles.infoValueText}>ND: {compNd.toFixed(1)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.infoValueCellGreen}>
                  <Text style={styles.compScoreText}>SCORE: {compScore.toFixed(3)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.neutralCell}>
                  <Text style={styles.neutralLabelText}>GYMNAST INFO</Text>
                </View>
                <View style={styles.overtimeCell}>
                  <Text style={styles.overtimeValueText}>{gymnast?.gymnasta || ""}</Text>
                </View>
                <View style={styles.lineCell}>
                  <Text style={styles.lineValueText}>{gymnast?.noc || ""}</Text>
                </View>
                <View style={styles.otherCell}>
                  <Text style={styles.lineValueText}>{gymnast?.bib || ""}</Text>
                </View>
                <View style={styles.otherCell}>
                  <Text style={styles.otherValueText}>{gymnast?.evento || ""}</Text>
                </View>
                <View style={styles.neutralTotalCell}>
                  <Text style={styles.neutralTotalValueText}>{gymnast?.numero || ""}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <TouchableOpacity onPress={() => { setCommentsInput(comments); setShowCommentsModal(true); }} style={styles.commentsBoxTouchable}>
            <Text numberOfLines={3} style={styles.commentsBoxTextPreview}>
              {comments ? comments : "Tap to add comments..."}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handlePrevious} disabled={currentIndex === 0}>
            <Text style={styles.buttonText}>BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mainTableButton} onPress={handleGoBack}>
            <Text style={styles.buttonText}>START LIST</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mainTableButton} onPress={handleFinish}>
            <Text style={styles.buttonText}>MAIN TABLE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: currentIndex === allGymnasts.length - 1 ? "#DC3545" : "#0052b4" }]}
            onPress={currentIndex === allGymnasts.length - 1 ? handleFinish : handleNext}
          >
            <Text style={styles.buttonText}>{currentIndex === allGymnasts.length - 1 ? "FINISH" : "NEXT"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Element Group Modals */}
      {Object.keys(showElementGroupModal).map((group) => (
        <ModalWrapper
          key={group}
          transparent
          visible={showElementGroupModal[group]}
          animationType="fade"
          onRequestClose={() => setShowElementGroupModal({ ...showElementGroupModal, [group]: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Group {group}</Text>
              <ScrollView style={styles.modalScrollView}>
                {getAvailableValuesForGroup(gymnast?.evento || '', discipline, group).map((value) => (
                  <TouchableOpacity
                    key={`${group}-${value}`}
                    style={[
                      styles.modalItem,
                      elementGroupValues[group as keyof ElementGroupValues] === value && styles.modalItemSelected,
                    ]}
                    onPress={() => handleElementGroupChange(group, value)}
                  >
                    <Text style={[
                      styles.modalItemText,
                      elementGroupValues[group as keyof ElementGroupValues] === value && styles.modalItemTextSelected,
                    ]}>
                      {value.toFixed(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowElementGroupModal({ ...showElementGroupModal, [group]: false })}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ModalWrapper>
      ))}

      {/* Comments Modal */}
            {/* Modal CustomNumberPadOptimized para editar valores */}
            {showNumberPadModal && (
              <ModalWrapper transparent visible={showNumberPadModal} animationType="fade">
                    <CustomNumberPadOptimized
                      visible={showNumberPadModal}
                      value={numberPadValue}
                      onValueChange={setNumberPadValue}
                      onClose={(val) => {
                        if (val !== undefined) {
                          saveNumberPadValue(val);
                        } else {
                          setShowNumberPadModal(false);
                        }
                      }}
                    />
              </ModalWrapper>
            )}
      <ModalWrapper transparent visible={showCommentsModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Comments</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={commentsInput}
              onChangeText={setCommentsInput}
              multiline
              placeholder="Write your comments..."
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowCommentsModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={() => { 
                try {
                  setComments(commentsInput); 
                  setShowCommentsModal(false); 
                } catch (error) {
                  console.error('Error saving comments:', error);
                  Alert.alert('Error', 'Could not save comments. Please try again.');
                }
              }}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ModalWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0e0e0",
  },
  whiteboardWrapperIphone: {
    width: '100%',
    overflow: 'hidden',
  },
  breadcrumbContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  breadcrumbButton: {
    padding: 8,
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#0066cc',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  mainContent: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-start",
  },
  leftColumn: {
    width: "45%",
  },
  rightColumn: {
    width: "55%",
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
  numberDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.5,
  },
  numberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  numberActiveText: {
    color: "#fff",
  },
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
    height: 30,
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
    fontSize: 14,
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
  compScoreText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
  },
  elementGroupsContainer: {
    flex: 1,
    flexDirection: "row",
  },
  elementGroupCell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#6B9BDF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  elementGroupCellTitle: {
    flex: 0.5,
    flexDirection: "row",
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
    flexDirection: "row",
    backgroundColor: "#f8c471" ,
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  },
  ndCellText: {
    flex: 1,
    flexDirection: "row",
    backgroundColor:  "#00b050",
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
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  myScoreValueText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  myScoreLabelTextScore: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
  },
  myScoreLabelTextSmall: {
    fontSize: 11,
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
    fontSize: 13,
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
    fontSize: 13,
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
  fullCellTouchable: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
  },
  modalInputMultiline: {
    height: 100,
    textAlignVertical: "top",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#0052b4",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#666",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
