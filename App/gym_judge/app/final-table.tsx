import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getMainTablesByCompetenceId, getRateGeneralByTableId } from "../Database/database";
import { generateComprehensivePDF } from '../components/exportToPDF';

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

interface MainTableWithRateGeneral extends MainTable {
  rateGeneral?: MainRateGeneral;
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
  const [modalVisible, setModalVisible] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        const mainTables = await getMainTablesByCompetenceId(competenceId);

        // Sort tables by number
        const sortedTables = [...mainTables].sort((a, b) => a.number - b.number);
        
        // Fetch rate general data for each table
        const tablesWithRates = await Promise.all(
          sortedTables.map(async (table) => {
            try {
              const rateGeneral = await getRateGeneralByTableId(table.id);
              return { ...table, rateGeneral };
            } catch (error) {
              console.error(`Error fetching rate general for table ${table.id}:`, error);
              return { ...table };
            }
          })
        );
        console.log("Tables with rates:", tablesWithRates);
        setTables(tablesWithRates);
      } catch (error) {
        console.error("Error fetching tables:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, [competenceId]);

  const handleStartJudging = (tableId: number, tableNumber: number, tableEvent: string) => {
    if (tableEvent === "VT") {
      router.push(`/main-jump?competenceId=${competenceId}&gymnastId=${discipline}&event=${tableEvent}&discipline=${discipline}&gymnast=${tableId}&number=${tableNumber}&participants=${participants}&folderId=${folderId}`);
    } else {
      router.push(`/main-floor?competenceId=${competenceId}&gymnastId=${discipline}&event=${tableEvent}&discipline=${discipline}&gymnast=${tableId}&number=${tableNumber}&participants=${participants}&folderId=${folderId}`);
    }
  };

  const handleFinishJudging = () => {
    // Show the modal instead of navigating directly
    setModalVisible(false);
    setModalVisible(true);
  };

const handleDownloadPDF = async () => {
  try {
    setPdfExporting(true);
    
    console.log('Starting comprehensive PDF generation...');
    
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
      participants: tables.map((table, index) => ({
        position: index + 1,
        number: table.number || index + 1,
        name: table.name || "Unknown Gymnast",
        noc: table.noc || "---",
        event: table.event || event || "FX",
        bib: table.bib || index + 1,
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
          difficultyValues: table.rateGeneral?.difficultyValues || 0,
          elementGroups: table.rateGeneral?.elementGroups5 || 0,
          stickBonus: table.rateGeneral?.stickBonus ? 0.1 : 0,
          neutralDeductions: table.nd || 0,
          connectionValue: table.cv || 0,
          startValue: table.sv || 0,
          executionScore: table.rateGeneral?.eScore || 0,
          dScore: table.rateGeneral?.compD || 0,
          eScore: table.rateGeneral?.compE || 0,
          finalScore: table.rateGeneral?.compScore || 0,
          myScorefinal: table.rateGeneral?.myScore || 0,
        },
        details: {
          delta: table.delt || 0,
          percentage: table.percentage || 0,
          comments: table.rateGeneral?.comments || ""
        }
      }))
    };

    // Generate comprehensive PDF with individual pages + final table
    await generateComprehensivePDF(tables, finalTableData);
    
    console.log('Comprehensive PDF generated successfully');
    
    setPdfExporting(false);
    setModalVisible(false);
    
    Alert.alert(
      "Success", 
      `Comprehensive report generated!\n\n• Individual reports: ${tables.length} gymnasts\n• Final competition table included`,
      [{ text: "OK" }]
    );
    
    router.push(`/main-menu?discipline=${discipline}`);
    
  } catch (error) {
    console.error("Error exporting PDF:", error);
    setPdfExporting(false);
    
    Alert.alert(
      "Error", 
      `Failed to generate PDF: ${error.message}. Please try again.`,
      [{ text: "OK" }]
    );
  }
};

  const handleExit = () => {
    // Navigate back without exporting
    setModalVisible(false)
    router.push(`/main-menu?discipline=${discipline}`);
  };

  return (
    <SafeAreaView style={[
      isLargeDevice ? styles.containerLarge : null,
      isMediumLargeDevice ? styles.containerMediumLarge : null,
      isSmallDevice ? styles.containerSmall : null,
      isTinyDevice ? styles.containerTiny : null,
    ]}>
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
                    isLargeDevice ? styles.selectedRowLarge : null ||
                    isMediumLargeDevice ? styles.selectedRowMediumLarge : null ||
                    isSmallDevice ? styles.selectedRowSmall : null ||
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
                  ]}>{table.rateGeneral?.difficultyValues.toFixed(1)}</Text>
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
                  ]}>{table.rateGeneral?.elementGroups5}</Text>
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
                  ]}>{table.rateGeneral?.stickBonus ? 0.1 : 0}</Text>
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
                  ]}>{table.nd}</Text>
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
                  ]}>{table.cv}</Text>
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
                  ]}>{table.rateGeneral?.eScore.toFixed(3) || '0.000'}</Text>
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
                  ]}>{table.rateGeneral?.compD}</Text>
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
                  ]}>{table.rateGeneral?.compE}</Text>
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
                  ]}>{table.delt}</Text>
                </View>
                
                {/* Percent cell */}
                <View style={[
                  isLargeDevice ? styles.percentDataCellLarge : null,
                  isMediumLargeDevice ? styles.percentDataCellMediumLarge : null,
                  isSmallDevice ? styles.percentDataCellSmall : null,
                  isTinyDevice ? styles.percentDataCellTiny : null,
                ]}>
                  <Text style={[
                    isLargeDevice ? styles.cellTextLarge : null,
                    isMediumLargeDevice ? styles.cellTextMediumLarge : null,
                    isSmallDevice ? styles.cellTextSmall : null,
                    isTinyDevice ? styles.cellTextTiny : null,
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
                  ]}>{table.rateGeneral?.comments}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

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

      {/* Finish Modal */}
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
});

  export default GymnasticsScoreTable;