import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getCompetenceById, getMainTablesByCompetenceId, getRateGeneralByTableId } from "../Database/database";
import { generateComprehensivePDF } from '../components/exportToPDF';
import { Asset } from "expo-asset";

const { width, height } = Dimensions.get("window");
var isLargeDevice = false;
var isMediumLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;

if (width >= 1368 ) {
  isLargeDevice = true;
} else if (width >= 1200 && width < 1368) {
  isMediumLargeDevice = true;
} else if (width >= 960 && width < 1200) {
  isSmallDevice = true;
} else if (width < 960) {
  isTinyDevice = true;
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
  startValue: number;
  description: string;
  score: number;
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

interface MainTableWithRateGeneral extends MainTable {
  rateGeneral?: MainRateGeneral;
}

import * as FileSystem from 'expo-file-system';
import { useImage } from "@shopify/react-native-skia";

export function useJumpImageBase64(): string | null {
  const [base64, setBase64] = useState<string | null>(null);
  const image = useImage(require('../assets/images/Jump1.png'));

  useEffect(() => {
    if (image) {
      // Skia Image tiene método encodeToBase64
      const b64 = image.encodeToBase64?.() || image.encodeToBase64?.("png") || image.encodeToBase64?.("image/png");
if (b64) {
  setBase64(`data:image/png;base64,${b64}`);
}
    }
  }, [image]);

  return base64;
}
const GymnasticsScoreTable: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse params
  const competenceId = params.competenceId ? Number(params.competenceId) : 0;
  const discipline = params.discipline === "true";
  const event = params.event as string;
  const gymnastId = params.gymnast ? Number(params.gymnast) : 0;
  const number = params.number ? Number(params.number) : 0;
  const participants = params.participants ? Number(params.participants) : 0;
  const folderId = params.folderId;

  const [tables, setTables] = useState<MainTableWithRateGeneral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [competencecurrent, setcurrentcompetence] = useState<Competence | null>(null);



  let jumpImageBase64 = useJumpImageBase64();
  // Fetch data on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const mainTables = await getMainTablesByCompetenceId(competenceId);
        console.log("information tables ===============================================")
        console.log(mainTables);

        if (mainTables.length === 0) {
          setError("No gymnasts found for this competition");
          return;
        }
        
        const getcompetence = await getCompetenceById(competenceId);
        
        if (!getcompetence) {
          setError("Competition not found");
          return;
        }
        
        setcurrentcompetence(getcompetence);
        
        // Sort tables by number
        const sortedTables = [...mainTables].sort((a, b) => a.number - b.number);
        
        // Fetch rate general data for each table with robust error handling
        const tablesWithRates: MainTableWithRateGeneral[] = [];
        let skippedGymnasts: Array<{name: string, id: number, reason: string}> = [];
        let processedCount = 0;
        let errorCount = 0;
        let consecutiveErrors = 0;
        
        const BATCH_SIZE = 10; // Increase batch size for better performance
        const TIMEOUT_MS = 2000; // Reduce timeout to 2 seconds
        const MAX_CONSECUTIVE_ERRORS = 10; // Stop if we get 10 errors in a row
        const MAX_TOTAL_ERRORS = 50; // Stop if we get 50 total errors
        
        // Process gymnasts in small batches to prevent UI blocking and memory issues
        for (let batchStart = 0; batchStart < sortedTables.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, sortedTables.length);
          const batch = sortedTables.slice(batchStart, batchEnd);
          
          for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
            const table = batch[batchIndex];
            const globalIndex = batchStart + batchIndex;
            
            try {
              // Early validation - skip obviously corrupt data
              if (!table.id || !table.name || table.name.trim() === '' || table.id <= 0) {
                skippedGymnasts.push({
                  name: table.name || 'Unknown',
                  id: table.id || 0,
                  reason: 'Invalid gymnast data'
                });
                continue;
              }
              
              // Check for suspicious data patterns that might cause crashes
              if (typeof table.name !== 'string' || table.name.length > 200) {
                skippedGymnasts.push({
                  name: table.name || 'Unknown',
                  id: table.id,
                  reason: 'Suspicious name data'
                });
                continue;
              }
              
              // Check for numeric field corruption that could cause crashes
              const numericFields = ['number', 'j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
              let hasCorruptNumericData = false;
              for (const field of numericFields) {
                const value = table[field as keyof typeof table];
                if (value !== null && value !== undefined && typeof value !== 'number' && isNaN(Number(value))) {
                  hasCorruptNumericData = true;
                }
              }
              
              // Reduced timeout for database operations
              const rateGeneralPromise = getRateGeneralByTableId(table.id);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database timeout')), TIMEOUT_MS)
              );
              
              let rateGeneral = null;
              try {
                rateGeneral = await Promise.race([rateGeneralPromise, timeoutPromise]) as MainRateGeneral | null;
              } catch (timeoutError) {
                errorCount++;
                skippedGymnasts.push({
                  name: table.name,
                  id: table.id,
                  reason: 'Database timeout'
                });
                continue;
              }
            
              
              if (rateGeneral) {
                // Validate rate general data
                if (typeof rateGeneral.myScore !== 'number' || 
                    typeof rateGeneral.compScore !== 'number' || 
                    typeof rateGeneral.eScore !== 'number') {
                  errorCount++;
                  skippedGymnasts.push({
                    name: table.name,
                    id: table.id,
                    reason: 'Corrupt score data'
                  });
                  continue;
                }
              }
              
              // Validate and sanitize table data with defensive programming
              const processedTable: MainTableWithRateGeneral = { 
                ...table,
                // Ensure all numeric fields are valid numbers with defaults
                id: (typeof table.id === 'number' && table.id > 0) ? table.id : parseInt(String(table.id)) || 0,
                number: (typeof table.number === 'number' && table.number >= 0) ? table.number : parseInt(String(table.number)) || 0,
                bib: typeof table.bib === 'string' ? table.bib || "" : (table.bib || ""),
                j: (typeof table.j === 'number' && !isNaN(table.j)) ? table.j : 0,
                i: (typeof table.i === 'number' && !isNaN(table.i)) ? table.i : 0,
                h: (typeof table.h === 'number' && !isNaN(table.h)) ? table.h : 0,
                g: (typeof table.g === 'number' && !isNaN(table.g)) ? table.g : 0,
                f: (typeof table.f === 'number' && !isNaN(table.f)) ? table.f : 0,
                e: (typeof table.e === 'number' && !isNaN(table.e)) ? table.e : 0,
                d: (typeof table.d === 'number' && !isNaN(table.d)) ? table.d : 0,
                c: (typeof table.c === 'number' && !isNaN(table.c)) ? table.c : 0,
                b: (typeof table.b === 'number' && !isNaN(table.b)) ? table.b : 0,
                a: (typeof table.a === 'number' && !isNaN(table.a)) ? table.a : 0,
                dv: (typeof table.dv === 'number' && !isNaN(table.dv)) ? table.dv : 0,
                eg: (typeof table.eg === 'number' && !isNaN(table.eg)) ? table.eg : 0,
                sb: (typeof table.sb === 'number' && !isNaN(table.sb)) ? table.sb : 0,
                nd: (typeof table.nd === 'number' && !isNaN(table.nd)) ? table.nd : 0,
                cv: (typeof table.cv === 'number' && !isNaN(table.cv)) ? table.cv : 0,
                sv: (typeof table.sv === 'number' && !isNaN(table.sv)) ? table.sv : 0,
                e2: (typeof table.e2 === 'number' && !isNaN(table.e2)) ? table.e2 : 0,
                d3: (typeof table.d3 === 'number' && !isNaN(table.d3)) ? table.d3 : 0,
                e3: (typeof table.e3 === 'number' && !isNaN(table.e3)) ? table.e3 : 0,
                delt: (typeof table.delt === 'number' && !isNaN(table.delt)) ? table.delt : 0,
                percentage: (typeof table.percentage === 'number' && !isNaN(table.percentage)) ? table.percentage : 0,
                // Ensure string fields are valid with sanitization
                name: (typeof table.name === 'string' && table.name.trim().length > 0) ? table.name.trim() : 'Unknown',
                event: (typeof table.event === 'string' && table.event.trim().length > 0) ? table.event.trim() : 'FX',
                noc: (typeof table.noc === 'string') ? table.noc.trim() : '---',
                rateGeneral: rateGeneral || undefined 
              };
              
              tablesWithRates.push(processedTable);
              processedCount++;
              consecutiveErrors = 0; // Reset consecutive error counter on success
              
            } catch (error) {
              errorCount++;
              consecutiveErrors++;
              skippedGymnasts.push({
                name: table.name || 'Unknown',
                id: table.id || 0,
                reason: error instanceof Error ? error.message : 'Processing error'
              });
              
              // Circuit breaker - stop if too many consecutive errors
              if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                break;
              }
              
              // Also stop if total errors exceed threshold
              if (errorCount >= MAX_TOTAL_ERRORS) {
                break;
              }
              
              // Continue processing other gymnasts
              continue;
            }
          }
          
          // Check circuit breaker conditions between batches
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS || errorCount >= MAX_TOTAL_ERRORS) {
            break;
          }
          
          // Small delay between batches to prevent UI blocking
          if (batchEnd < sortedTables.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          setError(`Processing stopped after ${consecutiveErrors} consecutive errors. Showing ${tablesWithRates.length} valid gymnasts.`);
        } else if (errorCount >= MAX_TOTAL_ERRORS) {
          setError(`Processing stopped after ${errorCount} total errors. Showing ${tablesWithRates.length} valid gymnasts.`);
        }
        
        setTables(tablesWithRates);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al cargar los datos";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, [competenceId]);

  const handleStartJudging = (tableId: number, tableNumber: number, tableEvent: string) => {
    if (tableEvent === "VT") {
      router.replace(`/main-jump?competenceId=${competenceId}&gymnastId=${discipline}&event=${tableEvent}&discipline=${discipline}&gymnast=${tableId}&number=${tableNumber}&participants=${participants}&folderId=${folderId}`);
    } else {
      router.replace(`/main-floor?competenceId=${competenceId}&gymnastId=${discipline}&event=${tableEvent}&discipline=${discipline}&gymnast=${tableId}&number=${tableNumber}&participants=${participants}&folderId=${folderId}`);
    }
  };

  const handleFinishJudging = () => {
    setModalVisible(false);
    setModalVisible(true);
  };

const handleDownloadPDF = async () => {
  try {
    setPdfExporting(true);
    
    // Prepare data for comprehensive PDF
    const finalTableData = {
      competition: {
        title: "Gymnastics Competition Final Results",
        event: event || "All Events",
        discipline: discipline ? "MAG (Men's Artistic Gymnastics)" : "WAG (Women's Artistic Gymnastics)",
        date: new Date().toLocaleString(),
        totalParticipants: tables.length,
        competenceId: competenceId || 1
      },
      participants: tables.map((table, index) => {
        return {
          position: index + 1,
          number: table.number || index + 1,
          name: table.name || "Unknown Gymnast",
          noc: table.noc || "---",
          event: table.event || event || "FX",
          bib: table.bib ,
          elements: {
            j: table.j || 0,
            i: table.i || 0,
            h: table.h || 0,
            g: table.g || 0,
            f: table.f || 0,
            e: table.e || 0,
            d: table.d || 0,
            c: table.c || 0,
            b: table.b || 0,
            a: table.a || 0
          },
          scores: {
            difficultyValues: table.difficultyValues || 0,
            elementGroups: table.elementGroups5 || 0,
            stickBonus: table.stickBonus ? 0.1 : 0,
            neutralDeductions: table.nd || 0,
            connectionValue: table.cv || 0,
            startValue: table.sv || 0,
            executionScore: table.execution || 0,
            dScore: table.compD || 0,
            eScore: table.compE || 0,
            finalScore: table.compScore || 0,
            myScorefinal: table.myScore || 0,
          },
          details: {
            delta: table.delt || 0,
            percentage: table.percentage || 0,
            comments: table.comments || ""
          }
        };
      })
    };

    // Generate comprehensive PDF with individual pages + final table
    if (!competencecurrent) {
      throw new Error("No se pudo obtener la información de la competencia");
    }
    
    await generateComprehensivePDF(tables, finalTableData, competencecurrent, jumpImageBase64);
    
    setPdfExporting(false);
    setModalVisible(false);
    
    Alert.alert(
      "Success", 
      `Comprehensive report generated!\n\n• Individual reports: ${tables.length} gymnasts\n• Final competition table included`,
      [{ text: "OK" }]
    );
    
    router.replace(`/main-menu?folderId=${folderId}&discipline=${discipline}`);
    
  } catch (err) {
    setPdfExporting(false);
    
    const errorMessage = err instanceof Error ? err.message : "Error desconocido";
    
    Alert.alert(
      "Error", 
      `Failed to generate PDF: ${errorMessage}. Please try again.`,
      [{ text: "OK" }]
    );
  }
};

  const handleExit = () => {
    setModalVisible(false);
    router.replace(`/main-menu?folderId=${folderId}&discipline=${discipline}`);
  };

  return (
    <SafeAreaView style={[
      isLargeDevice ? styles.containerLarge : null,
      isMediumLargeDevice ? styles.containerMediumLarge : null,
      isSmallDevice ? styles.containerSmall : null,
      isTinyDevice ? styles.containerTiny : null,
    ]}>
      {/* Loading Screen */}
      {loading && (
        <View style={[
          isLargeDevice ? styles.loadingContainerLarge : null,
          isMediumLargeDevice ? styles.loadingContainerMediumLarge : null,
          isSmallDevice ? styles.loadingContainerSmall : null,
          isTinyDevice ? styles.loadingContainerTiny : null,
        ]}>
          <View style={[
            isLargeDevice ? styles.loadingCardLarge : null,
            isMediumLargeDevice ? styles.loadingCardMediumLarge : null,
            isSmallDevice ? styles.loadingCardSmall : null,
            isTinyDevice ? styles.loadingCardTiny : null,
          ]}>
            <ActivityIndicator 
              size="large" 
              color="#0052b4" 
              style={[
                isLargeDevice ? styles.loadingSpinnerLarge : null,
                isMediumLargeDevice ? styles.loadingSpinnerMediumLarge : null,
                isSmallDevice ? styles.loadingSpinnerSmall : null,
                isTinyDevice ? styles.loadingSpinnerTiny : null,
              ]}
            />
            <Text style={[
              isLargeDevice ? styles.loadingTextLarge : null,
              isMediumLargeDevice ? styles.loadingTextMediumLarge : null,
              isSmallDevice ? styles.loadingTextSmall : null,
              isTinyDevice ? styles.loadingTextTiny : null,
            ]}>
              Loading Gymnasts
            </Text>
            <Text style={[
              isLargeDevice ? styles.loadingSubtextLarge : null,
              isMediumLargeDevice ? styles.loadingSubtextMediumLarge : null,
              isSmallDevice ? styles.loadingSubtextSmall : null,
              isTinyDevice ? styles.loadingSubtextTiny : null,
            ]}>
              Please wait while we load the data...
            </Text>
          </View>
        </View>
      )}

      {/* Error Screen */}
      {!loading && error && (
        <View style={[
          isLargeDevice ? styles.errorContainerLarge : null,
          isMediumLargeDevice ? styles.errorContainerMediumLarge : null,
          isSmallDevice ? styles.errorContainerSmall : null,
          isTinyDevice ? styles.errorContainerTiny : null,
        ]}>
          <View style={[
            isLargeDevice ? styles.errorCardLarge : null,
            isMediumLargeDevice ? styles.errorCardMediumLarge : null,
            isSmallDevice ? styles.errorCardSmall : null,
            isTinyDevice ? styles.errorCardTiny : null,
          ]}>
            <Text style={[
              isLargeDevice ? styles.errorIconLarge : null,
              isMediumLargeDevice ? styles.errorIconMediumLarge : null,
              isSmallDevice ? styles.errorIconSmall : null,
              isTinyDevice ? styles.errorIconTiny : null,
            ]}>⚠️</Text>
            <Text style={[
              isLargeDevice ? styles.errorTitleLarge : null,
              isMediumLargeDevice ? styles.errorTitleMediumLarge : null,
              isSmallDevice ? styles.errorTitleSmall : null,
              isTinyDevice ? styles.errorTitleTiny : null,
            ]}>
              Error loading data
            </Text>
            <Text style={[
              isLargeDevice ? styles.errorMessageLarge : null,
              isMediumLargeDevice ? styles.errorMessageMediumLarge : null,
              isSmallDevice ? styles.errorMessageSmall : null,
              isTinyDevice ? styles.errorMessageTiny : null,
            ]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[
                isLargeDevice ? styles.retryButtonLarge : null,
                isMediumLargeDevice ? styles.retryButtonMediumLarge : null,
                isSmallDevice ? styles.retryButtonSmall : null,
                isTinyDevice ? styles.retryButtonTiny : null,
              ]}
              onPress={() => {
                setError(null);
                setLoading(true);
                
                // Re-trigger fetch
                const fetchTables = async () => {
                  try {
                    setLoading(true);
                    setError(null);
                    
                    const mainTables = await getMainTablesByCompetenceId(competenceId);
                    
                    if (mainTables.length === 0) {
                      setError("No gymnasts found for this competition");
                      return;
                    }
                    
                    const getcompetence = await getCompetenceById(competenceId);
                    
                    if (!getcompetence) {
                      setError("Competition not found");
                      return;
                    }
                    
                    setcurrentcompetence(getcompetence);
                    
                    const sortedTables = [...mainTables].sort((a, b) => a.number - b.number);
                    
                    const tablesWithRates = await Promise.all(
                      sortedTables.map(async (table, index) => {
                        try {
                          const rateGeneral = await getRateGeneralByTableId(table.id);
                          
                          return { 
                            ...table, 
                            bib: typeof table.bib === 'string' ? table.bib || "" : table.bib,
                            rateGeneral: rateGeneral || undefined 
                          };
                        } catch (error) {
                          return { 
                            ...table, 
                            bib: typeof table.bib === 'string' ? table.bib || "" : table.bib,
                            rateGeneral: undefined 
                          };
                        }
                      })
                    );
                    
                    setTables(sortedTables);
                    
                  } catch (error) {
                    setError(error instanceof Error ? error.message : "Error desconocido al cargar los datos");
                  } finally {
                    setLoading(false);
                  }
                };
                fetchTables();
              }}
            >
              <Text style={[
                isLargeDevice ? styles.retryButtonTextLarge : null,
                isMediumLargeDevice ? styles.retryButtonTextMediumLarge : null,
                isSmallDevice ? styles.retryButtonTextSmall : null,
                isTinyDevice ? styles.retryButtonTextTiny : null,
              ]}>
                Retry
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                isLargeDevice ? styles.backButtonLarge : null,
                isMediumLargeDevice ? styles.backButtonMediumLarge : null,
                isSmallDevice ? styles.backButtonSmall : null,
                isTinyDevice ? styles.backButtonTiny : null,
              ]}
              onPress={() => router.replace(`/main-menu?folderId=${folderId}&discipline=${discipline}`)}
            >
              <Text style={[
                isLargeDevice ? styles.backButtonTextLarge : null,
                isMediumLargeDevice ? styles.backButtonTextMediumLarge : null,
                isSmallDevice ? styles.backButtonTextSmall : null,
                isTinyDevice ? styles.backButtonTextTiny : null,
              ]}>
                Back to Menu
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Main Content - Only show when not loading and no error */}
      {!loading && !error && (
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={[
        isLargeDevice ? styles.horizontalScrollLarge : null,
        isMediumLargeDevice ? styles.horizontalScrollMediumLarge : null,
        isSmallDevice ? styles.horizontalScrollSmall : null,
        isTinyDevice ? styles.horizontalScrollTiny : null,
      ]}>
        <View>
          {/* Table Header - Keeping original headers */}
          <View style={[
            isLargeDevice ? styles.headerRowLarge : null,
            isMediumLargeDevice ? styles.headerRowMediumLarge : null,
            isSmallDevice ? styles.headerRowSmall : null,
            isTinyDevice ? styles.headerRowTiny : null,
          ]}>
            <View style={[
              isLargeDevice ? styles.headerIdCellLarge : null,
              isMediumLargeDevice ? styles.headerIdCellMediumLarge : null,
              isSmallDevice ? styles.headerIdCellSmall : null,
              isTinyDevice ? styles.headerIdCellTiny : null,
            ]}>
              <Text style={[
                isLargeDevice ? styles.headerTextLarge : null,
                isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                isSmallDevice ? styles.headerTextSmall : null,
                isTinyDevice ? styles.headerTextTiny : null,
              ]}>No.</Text>
            </View>
            <View style={[
              isLargeDevice ? styles.headerGymnastCellLarge : null,
              isMediumLargeDevice ? styles.headerGymnastCellMediumLarge : null,
              isSmallDevice ? styles.headerGymnastCellSmall : null,
              isTinyDevice ? styles.headerGymnastCellTiny : null,
            ]}>
              <Text style={[
                isLargeDevice ? styles.headerTextLarge : null,
                isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                isSmallDevice ? styles.headerTextSmall : null,
                isTinyDevice ? styles.headerTextTiny : null,
              ]}>GYMNAST</Text>
            </View>
            <View style={[
              isLargeDevice ? styles.headerEventCellLarge : null,
              isMediumLargeDevice ? styles.headerEventCellMediumLarge : null,
              isSmallDevice ? styles.headerEventCellSmall : null,
              isTinyDevice ? styles.headerEventCellTiny : null,
            ]}>
              <Text style={[
                isLargeDevice ? styles.headerTextLarge : null,
                isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                isSmallDevice ? styles.headerTextSmall : null,
                isTinyDevice ? styles.headerTextTiny : null,
              ]}>EVENT</Text>
            </View>
            <View style={[
              isLargeDevice ? styles.headerNocCellLarge : null,
              isMediumLargeDevice ? styles.headerNocCellMediumLarge : null,
              isSmallDevice ? styles.headerNocCellSmall : null,
              isTinyDevice ? styles.headerNocCellTiny : null,
            ]}>
              <Text style={[
                isLargeDevice ? styles.headerTextLarge : null,
                isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                isSmallDevice ? styles.headerTextSmall : null,
                isTinyDevice ? styles.headerTextTiny : null,
              ]}>NOC</Text>
            </View>
            <View style={[
              isLargeDevice ? styles.headerBibCellLarge : null,
              isMediumLargeDevice ? styles.headerBibCellMediumLarge : null,
              isSmallDevice ? styles.headerBibCellSmall : null,
              isTinyDevice ? styles.headerBibCellTiny : null,
            ]}>
              <Text style={[
                isLargeDevice ? styles.headerTextLarge : null,
                isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                isSmallDevice ? styles.headerTextSmall : null,
                isTinyDevice ? styles.headerTextTiny : null,
              ]}>BIB</Text>
            </View>
            
            {/* Small cells for A-J */}
            {['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'].map((letter) => (
              <View key={letter} style={[
                isLargeDevice ? styles.headerSmallCellLarge : null,
                isMediumLargeDevice ? styles.headerSmallCellMediumLarge : null,
                isSmallDevice ? styles.headerSmallCellSmall : null,
                isTinyDevice ? styles.headerSmallCellTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.headerTextLarge : null,
                  isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                  isSmallDevice ? styles.headerTextSmall : null,
                  isTinyDevice ? styles.headerTextTiny : null,
                ]}>{letter}</Text>
              </View>
            ))}
            
            {/* Second group cells */}
            {['DV', 'EG', 'SB', 'ND', 'CV', 'SV', 'E'].map((label) => (
              <View key={label} style={[
                isLargeDevice ? styles.headersecondCellLarge : null,
                isMediumLargeDevice ? styles.headersecondCellMediumLarge : null,
                isSmallDevice ? styles.headersecondCellSmall : null,
                isTinyDevice ? styles.headersecondCellTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.headerTextLarge : null,
                  isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                  isSmallDevice ? styles.headerTextSmall : null,
                  isTinyDevice ? styles.headerTextTiny : null,
                ]}>{label}</Text>
              </View>
            ))}
            
            {/* Gold cells */}
            {['D', 'E'].map((label) => (
              <View key={`gold-${label}`} style={[
                isLargeDevice ? styles.headerGoldCellLarge : null,
                isMediumLargeDevice ? styles.headerGoldCellMediumLarge : null,
                isSmallDevice ? styles.headerGoldCellSmall : null,
                isTinyDevice ? styles.headerGoldCellTiny : null,
              ]}>
                <Text style={[
                  isLargeDevice ? styles.headerTextLarge : null,
                  isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                  isSmallDevice ? styles.headerTextSmall : null,
                  isTinyDevice ? styles.headerTextTiny : null,
                ]}>{label}</Text>
              </View>
            ))}
            
            <View style={[
              isLargeDevice ? styles.headerDeltaCellLarge : null,
              isMediumLargeDevice ? styles.headerDeltaCellMediumLarge : null,
              isSmallDevice ? styles.headerDeltaCellSmall : null,
              isTinyDevice ? styles.headerDeltaCellTiny : null,
            ]}>
              <Text style={[
                isLargeDevice ? styles.headerTextLarge : null,
                isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                isSmallDevice ? styles.headerTextSmall : null,
                isTinyDevice ? styles.headerTextTiny : null,
              ]}>DELT</Text>
            </View>
            <View style={[
              isLargeDevice ? styles.headerPercentCellLarge : null,
              isMediumLargeDevice ? styles.headerPercentCellMediumLarge : null,
              isSmallDevice ? styles.headerPercentCellSmall : null,
              isTinyDevice ? styles.headerPercentCellTiny : null,
            ]}>
              <Text style={[
                isLargeDevice ? styles.headerTextLarge : null,
                isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                isSmallDevice ? styles.headerTextSmall : null,
                isTinyDevice ? styles.headerTextTiny : null,
              ]}>%</Text>
            </View>
            <View style={[
              isLargeDevice ? styles.headerCommentsCellLarge : null,
              isMediumLargeDevice ? styles.headerCommentsCellMediumLarge : null,
              isSmallDevice ? styles.headerCommentsCellSmall : null,
              isTinyDevice ? styles.headerCommentsCellTiny : null,
            ]}>
              <Text style={[
                isLargeDevice ? styles.headerTextLarge : null,
                isMediumLargeDevice ? styles.headerTextMediumLarge : null,
                isSmallDevice ? styles.headerTextSmall : null,
                isTinyDevice ? styles.headerTextTiny : null,
              ]}>Comments</Text>
            </View>
          </View>

          {/* Table Body - Dynamic with MainTable data */}
          <ScrollView style={[
            isLargeDevice ? styles.tableBodyLarge : null,
            isMediumLargeDevice ? styles.tableBodyMediumLarge : null,
            isSmallDevice ? styles.tableBodySmall : null,
            isTinyDevice ? styles.tableBodyTiny : null,
          ]}>
            {tables.map((table, idx) => (
              <TouchableOpacity 
                key={table.id} 
                style={[
                  isLargeDevice ? styles.tableRowLarge : null,
                  isMediumLargeDevice ? styles.tableRowMediumLarge : null,
                  isSmallDevice ? styles.tableRowSmall : null,
                  isTinyDevice ? styles.tableRowTiny : null,
                  table.id === gymnastId ? (
                    isLargeDevice ? styles.selectedRowLarge :
                    isMediumLargeDevice ? styles.selectedRowMediumLarge :
                    isSmallDevice ? styles.selectedRowSmall :
                    isTinyDevice ? styles.selectedRowTiny : null
                  ) : null
                ]}
                onPress={() => handleStartJudging(table.id, table.number, table.event)}
              >
                {/* ID Cell */}
                <View style={[
                  isLargeDevice ? styles.idCellLarge : null,
                  isMediumLargeDevice ? styles.idCellMediumLarge : null,
                  isSmallDevice ? styles.idCellSmall : null,
                  isTinyDevice ? styles.idCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                    idx === tables.length - 1 ? { borderBottomLeftRadius: 15 } : null
                  ]}>{table.number}</Text>
                </View>
                
                {/* Gymnast Cell */}
                <View style={[
                  isLargeDevice ? styles.gymnastCellLarge : null,
                  isMediumLargeDevice ? styles.gymnastCellMediumLarge : null,
                  isSmallDevice ? styles.gymnastCellSmall : null,
                  isTinyDevice ? styles.gymnastCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.name}</Text>
                </View>
                
                {/* Event Cell */}
                <View style={[
                  isLargeDevice ? styles.eventCellLarge : null,
                  isMediumLargeDevice ? styles.eventCellMediumLarge : null,
                  isSmallDevice ? styles.eventCellSmall : null,
                  isTinyDevice ? styles.eventCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.event}</Text>
                </View>
                
                {/* NOC Cell */}
                <View style={[
                  isLargeDevice ? styles.nocCellLarge : null,
                  isMediumLargeDevice ? styles.nocCellMediumLarge : null,
                  isSmallDevice ? styles.nocCellSmall : null,
                  isTinyDevice ? styles.nocCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.noc}</Text>
                </View>
                
                {/* BIB Cell */}
                <View style={[
                  isLargeDevice ? styles.bibCellLarge : null,
                  isMediumLargeDevice ? styles.bibCellMediumLarge : null,
                  isSmallDevice ? styles.bibCellSmall : null,
                  isTinyDevice ? styles.bibCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.bib}</Text>
                </View>
                
                {/* Small cells data */}
                {[table.j, table.i, table.h, table.g, table.f, table.e, table.d, table.c, table.b, table.a].map((value, index) => (
                  <View key={`small-${index}`} style={[
                    isLargeDevice ? styles.smallCellLarge : null,
                    isMediumLargeDevice ? styles.smallCellMediumLarge : null,
                    isSmallDevice ? styles.smallCellSmall : null,
                    isTinyDevice ? styles.smallCellTiny : null,
                  ]}>
                    <Text style={[
                      isLargeDevice ? styles.cellTextLarge : null,
                      isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                      isSmallDevice ? styles.cellTextSmall : null,
                      isTinyDevice ? styles.cellTextTiny : null,
                    ]}>{value}</Text>
                  </View>
                ))}
                
                {/* Second group data cells */}
                <View style={[
                  isLargeDevice ? styles.smallCellLarge : null,
                  isMediumLargeDevice ? styles.smallCellMediumLarge : null,
                  isSmallDevice ? styles.smallCellSmall : null,
                  isTinyDevice ? styles.smallCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.difficultyValues.toFixed(1)}</Text>
                </View>
                <View style={[
                  isLargeDevice ? styles.smallCellLarge : null,
                  isMediumLargeDevice ? styles.smallCellMediumLarge : null,
                  isSmallDevice ? styles.smallCellSmall : null,
                  isTinyDevice ? styles.smallCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.elementGroups5.toFixed(1)}</Text>
                </View>
                <View style={[
                  isLargeDevice ? styles.smallCellLarge : null,
                  isMediumLargeDevice ? styles.smallCellMediumLarge : null,
                  isSmallDevice ? styles.smallCellSmall : null,
                  isTinyDevice ? styles.smallCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.stickBonus ? 0.1 : "0.0"}</Text>
                </View>
                <View style={[
                  isLargeDevice ? styles.smallCellLarge : null,
                  isMediumLargeDevice ? styles.smallCellMediumLarge : null,
                  isSmallDevice ? styles.smallCellSmall : null,
                  isTinyDevice ? styles.smallCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.nd.toFixed(1)}</Text>
                </View>
                <View style={[
                  isLargeDevice ? styles.smallCellLarge : null,
                  isMediumLargeDevice ? styles.smallCellMediumLarge : null,
                  isSmallDevice ? styles.smallCellSmall : null,
                  isTinyDevice ? styles.smallCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.cv.toFixed(1)}</Text>
                </View>
                <View style={[
                  isLargeDevice ? styles.smallCellLarge : null,
                  isMediumLargeDevice ? styles.smallCellMediumLarge : null,
                  isSmallDevice ? styles.smallCellSmall : null,
                  isTinyDevice ? styles.smallCellTiny : null,
                  // Conditional background color based on SV vs compD comparison
                  {
                    backgroundColor: table.sv.toFixed(1) === table.compD?.toFixed(1)
                      ? '#4CAF50'  // Green if SV equals compD
                      : 'rgb(253, 110, 110)'  // Red if they don't match
                  }
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                    // White text for better contrast on colored backgrounds
                    {
                      color: 'white'
                    }
                  ]}>{table.sv.toFixed(1)}</Text>
                </View>
                <View style={[
                  isLargeDevice ? styles.smallCellLarge : null,
                  isMediumLargeDevice ? styles.smallCellMediumLarge : null,
                  isSmallDevice ? styles.smallCellSmall : null,
                  isTinyDevice ? styles.smallCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.eScore.toFixed(3) || '0.000'}</Text>
                </View>
                
                {/* Gold data cells */}
                <View style={[
                  isLargeDevice ? styles.goldDataCellLarge : null,
                  isMediumLargeDevice ? styles.goldDataCellMediumLarge : null,
                  isSmallDevice ? styles.goldDataCellSmall : null,
                  isTinyDevice ? styles.goldDataCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.compD.toFixed(1)}</Text>
                </View>
                <View style={[
                  isLargeDevice ? styles.goldDataCellLarge : null,
                  isMediumLargeDevice ? styles.goldDataCellMediumLarge : null,
                  isSmallDevice ? styles.goldDataCellSmall : null,
                  isTinyDevice ? styles.goldDataCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.compE.toFixed(3)}</Text>
                </View>
                
                {/* Delta cell */}
                <View style={[
                  isLargeDevice ? styles.deltaDataCellLarge : null,
                  isMediumLargeDevice ? styles.deltaDataCellMediumLarge : null,
                  isSmallDevice ? styles.deltaDataCellSmall : null,
                  isTinyDevice ? styles.deltaDataCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.delt.toFixed(1)}</Text>
                </View>
                
                {/* Percent cell */}
                <View style={[
                  isLargeDevice ? styles.percentDataCellLarge : null,
                  isMediumLargeDevice ? styles.percentDataCellMediumLarge : null,
                  isSmallDevice ? styles.percentDataCellSmall : null,
                  isTinyDevice ? styles.percentDataCellTiny : null,
                  // Conditional background color based on percentage
                  {
                    backgroundColor: table.percentage >= 88 
                      ? '#4CAF50'  // Green for >= 90
                      : table.percentage >= 70 
                        ? '#FFC107'  // Mustard/Yellow for 70-88
                        : 'rgb(253, 110, 110)'  // Red (current color) for < 70
                  }
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                    // Optional: Change text color for better contrast
                    {
                      color: table.percentage >= 88
                        ? 'white'  // White text on green
                        : table.percentage >= 70 
                          ? 'black'  // Black text on yellow
                          : '#333'   // Dark text on light red
                    }
                  ]}>{table.percentage}</Text>
                </View>
                
                {/* Comment cell */}
                <View
                  style={[
                    isLargeDevice ? styles.CommentDataCellLarge : null,
                    isMediumLargeDevice ? styles.CommentDataCellMediumLarge : null,
                    isSmallDevice ? styles.CommentDataCellSmall : null,
                    isTinyDevice ? styles.CommentDataCellTiny : null,
                    idx === tables.length - 1 ? { borderBottomRightRadius: 15 } : null
                  ]}
                >
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
                  ]}>{table.comments}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      )}
      {/* Button Row */}
      <View style={[
        isLargeDevice ? styles.buttonContainerLarge : null,
        isMediumLargeDevice ? styles.buttonContainerMediumLarge : null,
        isSmallDevice ? styles.buttonContainerSmall : null,
        isTinyDevice ? styles.buttonContainerTiny : null,
      ]}>
        <TouchableOpacity 
          style={[
            isLargeDevice ? styles.startButtonLarge : null,
            isMediumLargeDevice ? styles.startButtonMediumLarge : null,
            isSmallDevice ? styles.startButtonSmall : null,
            isTinyDevice ? styles.startButtonTiny : null,
          ]} 
          onPress={() => {
            const currentGymnast = tables.find(t => t.id === gymnastId);
            if (currentGymnast) {
              handleStartJudging(currentGymnast.id, currentGymnast.number, currentGymnast.event);
            } else if (tables.length > 0) {
              // Start with first gymnast if none selected
              handleStartJudging(tables[0].id, tables[0].number, tables[0].event);
            }
          }}
        >
          <Text style={[
            isLargeDevice ? styles.buttonTextLarge : null,
            isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
            isSmallDevice ? styles.buttonTextSmall : null,
            isTinyDevice ? styles.buttonTextTiny : null,
          ]}>CONTINUE JUDGING</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[
          isLargeDevice ? styles.finishButtonLarge : null,
          isMediumLargeDevice ? styles.finishButtonMediumLarge : null,
          isSmallDevice ? styles.finishButtonSmall : null,
          isTinyDevice ? styles.finishButtonTiny : null,
        ]} onPress={handleFinishJudging}>
          <Text style={[
            isLargeDevice ? styles.buttonTextLarge : null,
            isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
            isSmallDevice ? styles.buttonTextSmall : null,
            isTinyDevice ? styles.buttonTextTiny : null,
          ]}>FINISH JUDGING</Text>
        </TouchableOpacity>
      </View>

{(Platform.OS === 'ios' && !Platform.isPad) ? (
  modalVisible && (
    <View
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 24,
          minWidth: 280,
          maxWidth: 400,
          width: "90%",
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          alignItems: "center",
        }}
      >
        <View style={{
          backgroundColor: '#0052b4',
          paddingVertical: 15,
          paddingHorizontal: 20,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          width: '100%',
          alignItems: 'center',
        }}>
          <Text style={{
            color: 'white',
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            Finish Judging
          </Text>
        </View>
        <View style={{
          padding: 20,
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 16,
            color: '#333',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            Do you want to download the scoring data as PDF before exiting?
          </Text>
        </View>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingBottom: 20,
          paddingHorizontal: 20,
          width: '100%',
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#4CAF50',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 4,
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handleDownloadPDF}
            disabled={pdfExporting}
          >
            <Text style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: 16,
            }}>
              {pdfExporting ? "DOWNLOADING..." : "DOWNLOAD PDF"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#d32f2f',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 4,
              marginLeft: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handleExit}
          >
            <Text style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: 16,
            }}>
              EXIT
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
) : (
  <Modal
    animationType="fade"
    transparent={true}
    visible={modalVisible}
    onRequestClose={() => setModalVisible(false)}
  >
    <View style={[
      isLargeDevice ? styles.modalOverlayLarge : null,
      isMediumLargeDevice ? styles.modalOverlayMediumLarge : null,
      isSmallDevice ? styles.modalOverlaySmall : null,
      isTinyDevice ? styles.modalOverlayTiny : null,
    ]}>
      <View style={[
        isLargeDevice ? styles.modalContainerLarge : null,
        isMediumLargeDevice ? styles.modalContainerMediumLarge : null,
        isSmallDevice ? styles.modalContainerSmall : null,
        isTinyDevice ? styles.modalContainerTiny : null,
      ]}>
        <View style={[
          isLargeDevice ? styles.modalHeaderLarge : null,
          isMediumLargeDevice ? styles.modalHeaderMediumLarge : null,
          isSmallDevice ? styles.modalHeaderSmall : null,
          isTinyDevice ? styles.modalHeaderTiny : null,
        ]}>
          <Text style={[
            isLargeDevice ? styles.modalHeaderTextLarge : null,
            isMediumLargeDevice ? styles.modalHeaderTextMediumLarge : null,
            isSmallDevice ? styles.modalHeaderTextSmall : null,
            isTinyDevice ? styles.modalHeaderTextTiny : null,
          ]}>Finish Judging</Text>
        </View>
        <View style={[
          isLargeDevice ? styles.modalBodyLarge : null,
          isMediumLargeDevice ? styles.modalBodyMediumLarge : null,
          isSmallDevice ? styles.modalBodySmall : null,
          isTinyDevice ? styles.modalBodyTiny : null,
        ]}>
          <Text style={[
            isLargeDevice ? styles.modalTextLarge : null,
            isMediumLargeDevice ? styles.modalTextMediumLarge : null,
            isSmallDevice ? styles.modalTextSmall : null,
            isTinyDevice ? styles.modalTextTiny : null,
          ]}>Do you want to download the scoring data as PDF before exiting?</Text>
        </View>
        <View style={[
          isLargeDevice ? styles.modalButtonContainerLarge : null,
          isMediumLargeDevice ? styles.modalButtonContainerMediumLarge : null,
          isSmallDevice ? styles.modalButtonContainerSmall : null,
          isTinyDevice ? styles.modalButtonContainerTiny : null,
        ]}>
          <TouchableOpacity
            style={[
              isLargeDevice ? styles.modalDownloadButtonLarge : null,
              isMediumLargeDevice ? styles.modalDownloadButtonMediumLarge : null,
              isSmallDevice ? styles.modalDownloadButtonSmall : null,
              isTinyDevice ? styles.modalDownloadButtonTiny : null,
            ]}
            onPress={handleDownloadPDF}
            disabled={pdfExporting}
          >
            <Text style={[
              isLargeDevice ? styles.buttonTextLarge : null,
              isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
              isSmallDevice ? styles.buttonTextSmall : null,
              isTinyDevice ? styles.buttonTextTiny : null,
            ]}>
              {pdfExporting ? "DOWNLOADING..." : "DOWNLOAD PDF"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              isLargeDevice ? styles.modalExitButtonLarge : null,
              isMediumLargeDevice ? styles.modalExitButtonMediumLarge : null,
              isSmallDevice ? styles.modalExitButtonSmall : null,
              isTinyDevice ? styles.modalExitButtonTiny : null,
            ]}
            onPress={handleExit}
          >
            <Text style={[
              isLargeDevice ? styles.buttonTextLarge : null,
              isMediumLargeDevice ? styles.buttonTextMediumLarge : null,
              isSmallDevice ? styles.buttonTextSmall : null,
              isTinyDevice ? styles.buttonTextTiny : null,
            ]}>EXIT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
)}
    </SafeAreaView>
  );
};

  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  // Container styles - Large Device (width >= 1368)
  containerLarge: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  // Container styles - Medium Large Device (width >= 1200 && width < 1368)
  containerMediumLarge: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  // Container styles - Small Device (width >= 945 && width < 1200)
  containerSmall: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  // Container styles - Tiny Device (width < 945)
  containerTiny: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  
  // Horizontal scroll styles - Large Device
  horizontalScrollLarge: {
    flex: 1,
    padding: 10,
    borderRadius: 15,
  },
  // Horizontal scroll styles - Medium Large Device
  horizontalScrollMediumLarge: {
    flex: 1,
    padding: 9,
    borderRadius: 14,
  },
  // Horizontal scroll styles - Small Device
  horizontalScrollSmall: {
    flex: 1,
    padding: 8,
    borderRadius: 12,
  },
  // Horizontal scroll styles - Tiny Device
  horizontalScrollTiny: {
    flex: 1,
    padding: 10,
    borderRadius: 15,
  },
  
  // Header row styles - Large Device
  headerRowLarge: {
    flexDirection: 'row',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  // Header row styles - Medium Large Device
  headerRowMediumLarge: {
    flexDirection: 'row',
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  // Header row styles - Small Device
  headerRowSmall: {
    flexDirection: 'row',
    height: 35,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  // Header row styles - Tiny Device
  headerRowTiny: {
    flexDirection: 'row',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  
  // Table row styles - Large Device
  tableRowLarge: {
    flexDirection: 'row',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  // Table row styles - Medium Large Device
  tableRowMediumLarge: {
    flexDirection: 'row',
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  // Table row styles - Small Device
  tableRowSmall: {
    flexDirection: 'row',
    height: 35,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  // Table row styles - Tiny Device
  tableRowTiny: {
    flexDirection: 'row',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  
  // Selected row styles - Large Device
  selectedRowLarge: {
    backgroundColor: '#e3f2fd',
  },
  // Selected row styles - Medium Large Device
  selectedRowMediumLarge: {
    backgroundColor: '#e3f2fd',
  },
  // Selected row styles - Small Device
  selectedRowSmall: {
    backgroundColor: '#e3f2fd',
  },
  // Selected row styles - Tiny Device
  selectedRowTiny: {
    backgroundColor: '#e3f2fd',
  },
  
  // Header ID cell styles - Large Device
  headerIdCellLarge: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderTopLeftRadius: 15,
    borderRightColor: '#ddd',
  },
  // Header ID cell styles - Medium Large Device
  headerIdCellMediumLarge: {
    width: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderTopLeftRadius: 14,
    borderRightColor: '#ddd',
  },
  // Header ID cell styles - Small Device
  headerIdCellSmall: {
    width: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderTopLeftRadius: 12,
    borderRightColor: '#ddd',
  },
  // Header ID cell styles - Tiny Device
  headerIdCellTiny: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderTopLeftRadius: 15,
    borderRightColor: '#ddd',
  },
  
  // Header gymnast cell styles - Large Device (Increased width as requested)
  headerGymnastCellLarge: {
    width: 450, // Increased from 430
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header gymnast cell styles - Medium Large Device
  headerGymnastCellMediumLarge: {
    width: 420,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 9,
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header gymnast cell styles - Small Device
  headerGymnastCellSmall: {
    width: 380,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header gymnast cell styles - Tiny Device
  headerGymnastCellTiny: {
    width: 450,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header event cell styles - Large Device (Increased width as requested)
  headerEventCellLarge: {
    width: 100, // Increased from 80
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header event cell styles - Medium Large Device
  headerEventCellMediumLarge: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header event cell styles - Small Device
  headerEventCellSmall: {
    width: 85,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header event cell styles - Tiny Device
  headerEventCellTiny: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header NOC cell styles - Large Device
  headerNocCellLarge: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header NOC cell styles - Medium Large Device
  headerNocCellMediumLarge: {
    width: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header NOC cell styles - Small Device
  headerNocCellSmall: {
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header NOC cell styles - Tiny Device
  headerNocCellTiny: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header BIB cell styles - Large Device
  headerBibCellLarge: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header BIB cell styles - Medium Large Device
  headerBibCellMediumLarge: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header BIB cell styles - Small Device
  headerBibCellSmall: {
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header BIB cell styles - Tiny Device
  headerBibCellTiny: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header second cell styles - Large Device
  headersecondCellLarge: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header second cell styles - Medium Large Device
  headersecondCellMediumLarge: {
    width: 75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header second cell styles - Small Device
  headersecondCellSmall: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header second cell styles - Tiny Device
  headersecondCellTiny: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header small cell styles - Large Device
  headerSmallCellLarge: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header small cell styles - Medium Large Device
  headerSmallCellMediumLarge: {
    width: 75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header small cell styles - Small Device
  headerSmallCellSmall: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header small cell styles - Tiny Device
  headerSmallCellTiny: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header gold cell styles - Large Device
  headerGoldCellLarge: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header gold cell styles - Medium Large Device
  headerGoldCellMediumLarge: {
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header gold cell styles - Small Device
  headerGoldCellSmall: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header gold cell styles - Tiny Device
  headerGoldCellTiny: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header delta cell styles - Large Device
  headerDeltaCellLarge: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header delta cell styles - Medium Large Device
  headerDeltaCellMediumLarge: {
    width: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header delta cell styles - Small Device
  headerDeltaCellSmall: {
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header delta cell styles - Tiny Device
  headerDeltaCellTiny: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header percent cell styles - Large Device
  headerPercentCellLarge: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header percent cell styles - Medium Large Device
  headerPercentCellMediumLarge: {
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header percent cell styles - Small Device
  headerPercentCellSmall: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header percent cell styles - Tiny Device
  headerPercentCellTiny: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header comments cell styles - Large Device
  headerCommentsCellLarge: {
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderTopRightRadius: 15,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header comments cell styles - Medium Large Device
  headerCommentsCellMediumLarge: {
    width: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderTopRightRadius: 14,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header comments cell styles - Small Device
  headerCommentsCellSmall: {
    width: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderTopRightRadius: 12,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Header comments cell styles - Tiny Device
  headerCommentsCellTiny: {
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4',
    borderTopRightRadius: 15,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Data row styles - Large Device
  idCellLarge: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Data row styles - Medium Large Device
  idCellMediumLarge: {
    width: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Data row styles - Small Device
  idCellSmall: {
    width: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Data row styles - Tiny Device
  idCellTiny: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Gymnast cell styles - Large Device
  gymnastCellLarge: {
    width: 450, // Increased to match header
    justifyContent: 'center',
    paddingLeft: 10,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Gymnast cell styles - Medium Large Device
  gymnastCellMediumLarge: {
    width: 420,
    justifyContent: 'center',
    paddingLeft: 9,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Gymnast cell styles - Small Device
  gymnastCellSmall: {
    width: 380,
    justifyContent: 'center',
    paddingLeft: 8,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Gymnast cell styles - Tiny Device
  gymnastCellTiny: {
    width: 450,
    justifyContent: 'center',
    paddingLeft: 10,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Event cell styles - Large Device
  eventCellLarge: {
    width: 100, // Increased to match header
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Event cell styles - Medium Large Device
  eventCellMediumLarge: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Event cell styles - Small Device
  eventCellSmall: {
    width: 85,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Event cell styles - Tiny Device
  eventCellTiny: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // NOC cell styles - Large Device
  nocCellLarge: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // NOC cell styles - Medium Large Device
  nocCellMediumLarge: {
    width: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // NOC cell styles - Small Device
  nocCellSmall: {
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // NOC cell styles - Tiny Device
  nocCellTiny: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // BIB cell styles - Large Device
  bibCellLarge: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // BIB cell styles - Medium Large Device
  bibCellMediumLarge: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // BIB cell styles - Small Device
  bibCellSmall: {
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // BIB cell styles - Tiny Device
  bibCellTiny: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Small cell styles - Large Device
  smallCellLarge: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Small cell styles - Medium Large Device
  smallCellMediumLarge: {
    width: 75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Small cell styles - Small Device
  smallCellSmall: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Small cell styles - Tiny Device
  smallCellTiny: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Gold data cell styles - Large Device
  goldDataCellLarge: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Gold data cell styles - Medium Large Device
  goldDataCellMediumLarge: {
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Gold data cell styles - Small Device
  goldDataCellSmall: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Gold data cell styles - Tiny Device
  goldDataCellTiny: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Delta data cell styles - Large Device
  deltaDataCellLarge: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Delta data cell styles - Medium Large Device
  deltaDataCellMediumLarge: {
    width: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Delta data cell styles - Small Device
  deltaDataCellSmall: {
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Delta data cell styles - Tiny Device
  deltaDataCellTiny: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Percent data cell styles - Large Device
  percentDataCellLarge: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFC0C7',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Percent data cell styles - Medium Large Device
  percentDataCellMediumLarge: {
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFC0C7',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Percent data cell styles - Small Device
  percentDataCellSmall: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFC0C7',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Percent data cell styles - Tiny Device
  percentDataCellTiny: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFC0C7',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Comment data cell styles - Large Device
  CommentDataCellLarge: {
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Comment data cell styles - Medium Large Device
  CommentDataCellMediumLarge: {
    width: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Comment data cell styles - Small Device
  CommentDataCellSmall: {
    width: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  // Comment data cell styles - Tiny Device
  CommentDataCellTiny: {
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  // Header text styles - Large Device
  headerTextLarge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  // Header text styles - Medium Large Device
  headerTextMediumLarge: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white',
  },
  // Header text styles - Small Device
  headerTextSmall: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  // Header text styles - Tiny Device
  headerTextTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  
  // Cell text styles - Large Device
  cellTextLarge: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  // Cell text styles - Medium Large Device
  cellTextMediumLarge: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  // Cell text styles - Small Device
  cellTextSmall: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  // Cell text styles - Tiny Device
  cellTextTiny: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  
  // Table body styles - Large Device
  tableBodyLarge: {
    height: 'auto',
  },
  // Table body styles - Medium Large Device
  tableBodyMediumLarge: {
    height: 'auto',
  },
  // Table body styles - Small Device
  tableBodySmall: {
    height: 'auto',
  },
  // Table body styles - Tiny Device
  tableBodyTiny: {
    height: 'auto',
  },
  
  // Button container styles - Large Device
  buttonContainerLarge: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f0f4f8',
  },
  // Button container styles - Medium Large Device
  buttonContainerMediumLarge: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#f0f4f8',
  },
  // Button container styles - Small Device
  buttonContainerSmall: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f4f8',
  },
  // Button container styles - Tiny Device
  buttonContainerTiny: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f0f4f8',
  },
  
  // Start button styles - Large Device
  startButtonLarge: {
    flex: 1,
    backgroundColor: '#0052b4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Start button styles - Medium Large Device
  startButtonMediumLarge: {
    flex: 1,
    backgroundColor: '#0052b4',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Start button styles - Small Device
  startButtonSmall: {
    flex: 1,
    backgroundColor: '#0052b4',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 3,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Start button styles - Tiny Device
  startButtonTiny: {
    flex: 1,
    backgroundColor: '#0052b4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Finish button styles - Large Device
  finishButtonLarge: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Finish button styles - Medium Large Device
  finishButtonMediumLarge: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Finish button styles - Small Device
  finishButtonSmall: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 3,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Finish button styles - Tiny Device
  finishButtonTiny: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Button text styles - Large Device
  buttonTextLarge: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Button text styles - Medium Large Device
  buttonTextMediumLarge: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
  },
  // Button text styles - Small Device
  buttonTextSmall: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Button text styles - Tiny Device
  buttonTextTiny: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Modal overlay styles - Large Device
  modalOverlayLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal overlay styles - Medium Large Device
  modalOverlayMediumLarge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal overlay styles - Small Device
  modalOverlaySmall: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal overlay styles - Tiny Device
  modalOverlayTiny: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal container styles - Large Device
  modalContainerLarge: {
    width: windowWidth * 0.6,
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Modal container styles - Medium Large Device
  modalContainerMediumLarge: {
    width: windowWidth * 0.65,
    maxWidth: 480,
    backgroundColor: 'white',
    borderRadius: 7,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Modal container styles - Small Device
  modalContainerSmall: {
    width: windowWidth * 0.75,
    maxWidth: 450,
    backgroundColor: 'white',
    borderRadius: 6,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Modal container styles - Tiny Device
  modalContainerTiny: {
    width: windowWidth * 0.6,
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  // Modal header styles - Large Device
  modalHeaderLarge: {
    backgroundColor: '#0052b4',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  // Modal header styles - Medium Large Device
  modalHeaderMediumLarge: {
    backgroundColor: '#0052b4',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  // Modal header styles - Small Device
  modalHeaderSmall: {
    backgroundColor: '#0052b4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  // Modal header styles - Tiny Device
  modalHeaderTiny: {
    backgroundColor: '#0052b4',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  
  // Modal header text styles - Large Device
  modalHeaderTextLarge: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Modal header text styles - Medium Large Device
  modalHeaderTextMediumLarge: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Modal header text styles - Small Device
  modalHeaderTextSmall: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Modal header text styles - Tiny Device
  modalHeaderTextTiny: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Modal body styles - Large Device
  modalBodyLarge: {
    padding: 20,
    alignItems: 'center',
  },
  // Modal body styles - Medium Large Device
  modalBodyMediumLarge: {
    padding: 18,
    alignItems: 'center',
  },
  // Modal body styles - Small Device
  modalBodySmall: {
    padding: 16,
    alignItems: 'center',
  },
  // Modal body styles - Tiny Device
  modalBodyTiny: {
    padding: 20,
    alignItems: 'center',
  },
  
  // Modal text styles - Large Device
  modalTextLarge: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Modal text styles - Medium Large Device
  modalTextMediumLarge: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 18,
  },
  // Modal text styles - Small Device
  modalTextSmall: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  // Modal text styles - Tiny Device
  modalTextTiny: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Modal button container styles - Large Device
  modalButtonContainerLarge: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  // Modal button container styles - Medium Large Device
  modalButtonContainerMediumLarge: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 18,
    paddingHorizontal: 18,
  },
  // Modal button container styles - Small Device
  modalButtonContainerSmall: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  // Modal button container styles - Tiny Device
  modalButtonContainerTiny: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  
  // Modal download button styles - Large Device
  modalDownloadButtonLarge: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal download button styles - Medium Large Device
  modalDownloadButtonMediumLarge: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal download button styles - Small Device
  modalDownloadButtonSmall: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 3,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal download button styles - Tiny Device
  modalDownloadButtonTiny: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Modal exit button styles - Large Device
  modalExitButtonLarge: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal exit button styles - Medium Large Device
  modalExitButtonMediumLarge: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal exit button styles - Small Device
  modalExitButtonSmall: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 3,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal exit button styles - Tiny Device
  modalExitButtonTiny: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading container styles - Large Device
  loadingContainerLarge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  // Loading container styles - Medium Large Device
  loadingContainerMediumLarge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 18,
  },
  // Loading container styles - Small Device
  loadingContainerSmall: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 16,
  },
  // Loading container styles - Tiny Device
  loadingContainerTiny: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },

  // Loading card styles - Large Device
  loadingCardLarge: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 200,
  },
  // Loading card styles - Medium Large Device
  loadingCardMediumLarge: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 190,
  },
  // Loading card styles - Small Device
  loadingCardSmall: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 180,
  },
  // Loading card styles - Tiny Device
  loadingCardTiny: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 200,
  },

  // Loading spinner styles - Large Device
  loadingSpinnerLarge: {
    marginBottom: 20,
  },
  // Loading spinner styles - Medium Large Device
  loadingSpinnerMediumLarge: {
    marginBottom: 18,
  },
  // Loading spinner styles - Small Device
  loadingSpinnerSmall: {
    marginBottom: 16,
  },
  // Loading spinner styles - Tiny Device
  loadingSpinnerTiny: {
    marginBottom: 20,
  },

  // Loading text styles - Large Device
  loadingTextLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0052b4',
    textAlign: 'center',
    marginBottom: 8,
  },
  // Loading text styles - Medium Large Device
  loadingTextMediumLarge: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0052b4',
    textAlign: 'center',
    marginBottom: 7,
  },
  // Loading text styles - Small Device
  loadingTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0052b4',
    textAlign: 'center',
    marginBottom: 6,
  },
  // Loading text styles - Tiny Device
  loadingTextTiny: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0052b4',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Loading subtext styles - Large Device
  loadingSubtextLarge: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Loading subtext styles - Medium Large Device
  loadingSubtextMediumLarge: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  // Loading subtext styles - Small Device
  loadingSubtextSmall: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // Loading subtext styles - Tiny Device
  loadingSubtextTiny: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Error container styles - Large Device
  errorContainerLarge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  // Error container styles - Medium Large Device
  errorContainerMediumLarge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 18,
  },
  // Error container styles - Small Device
  errorContainerSmall: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 16,
  },
  // Error container styles - Tiny Device
  errorContainerTiny: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },

  // Error card styles - Large Device
  errorCardLarge: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxWidth: 400,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  // Error card styles - Medium Large Device
  errorCardMediumLarge: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxWidth: 380,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  // Error card styles - Small Device
  errorCardSmall: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxWidth: 350,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  // Error card styles - Tiny Device
  errorCardTiny: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxWidth: 400,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },

  // Error icon styles - Large Device
  errorIconLarge: {
    fontSize: 48,
    marginBottom: 16,
  },
  // Error icon styles - Medium Large Device
  errorIconMediumLarge: {
    fontSize: 45,
    marginBottom: 15,
  },
  // Error icon styles - Small Device
  errorIconSmall: {
    fontSize: 42,
    marginBottom: 14,
  },
  // Error icon styles - Tiny Device
  errorIconTiny: {
    fontSize: 48,
    marginBottom: 16,
  },

  // Error title styles - Large Device
  errorTitleLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 12,
  },
  // Error title styles - Medium Large Device
  errorTitleMediumLarge: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 11,
  },
  // Error title styles - Small Device
  errorTitleSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 10,
  },
  // Error title styles - Tiny Device
  errorTitleTiny: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Error message styles - Large Device
  errorMessageLarge: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  // Error message styles - Medium Large Device
  errorMessageMediumLarge: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 21,
  },
  // Error message styles - Small Device
  errorMessageSmall: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  // Error message styles - Tiny Device
  errorMessageTiny: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  // Retry button styles - Large Device
  retryButtonLarge: {
    backgroundColor: '#0052b4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  // Retry button styles - Medium Large Device
  retryButtonMediumLarge: {
    backgroundColor: '#0052b4',
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 7,
    marginBottom: 11,
    minWidth: 115,
    alignItems: 'center',
  },
  // Retry button styles - Small Device
  retryButtonSmall: {
    backgroundColor: '#0052b4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginBottom: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  // Retry button styles - Tiny Device
  retryButtonTiny: {
    backgroundColor: '#0052b4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 120,
    alignItems: 'center',
  },

  // Retry button text styles - Large Device
  retryButtonTextLarge: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Retry button text styles - Medium Large Device
  retryButtonTextMediumLarge: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Retry button text styles - Small Device
  retryButtonTextSmall: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Retry button text styles - Tiny Device
  retryButtonTextTiny: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Back button styles - Large Device
  backButtonLarge: {
    backgroundColor: '#666',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  // Back button styles - Medium Large Device
  backButtonMediumLarge: {
    backgroundColor: '#666',
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: 7,
    minWidth: 115,
    alignItems: 'center',
  },
  // Back button styles - Small Device
  backButtonSmall: {
    backgroundColor: '#666',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 110,
    alignItems: 'center',
  },
  // Back button styles - Tiny Device
  backButtonTiny: {
    backgroundColor: '#666',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },

  // Back button text styles - Large Device
  backButtonTextLarge: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Back button text styles - Medium Large Device
  backButtonTextMediumLarge: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  // Back button text styles - Small Device
  backButtonTextSmall: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Back button text styles - Tiny Device
  backButtonTextTiny: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

  export default GymnasticsScoreTable;