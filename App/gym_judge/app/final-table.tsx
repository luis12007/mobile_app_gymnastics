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
    <SafeAreaView style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
        <View>
          {/* Table Header - Keeping original headers */}
          <View style={styles.headerRow}>
            <View style={styles.headerIdCell}>
              <Text style={styles.headerText}>No.</Text>
            </View>
            <View style={styles.headerGymnastCell}>
              <Text style={styles.headerText}>GYMNAST</Text>
            </View>
            <View style={styles.headerEventCell}>
              <Text style={styles.headerText}>EVENT</Text>
            </View>
            <View style={styles.headerNocCell}>
              <Text style={styles.headerText}>NOC</Text>
            </View>
            <View style={styles.headerBibCell}>
              <Text style={styles.headerText}>BIB</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>J</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>I</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>H</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>G</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>F</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>E</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>D</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>C</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>B</Text>
            </View>
            <View style={styles.headerSmallCell}>
              <Text style={styles.headerText}>A</Text>
            </View>
            <View style={styles.headersecondCell}>
              <Text style={styles.headerText}>DV</Text>
            </View>
            <View style={styles.headersecondCell}>
              <Text style={styles.headerText}>EG</Text>
            </View>
            <View style={styles.headersecondCell}>
              <Text style={styles.headerText}>SB</Text>
            </View>
            <View style={styles.headersecondCell}>
              <Text style={styles.headerText}>ND</Text>
            </View>
            <View style={styles.headersecondCell}>
              <Text style={styles.headerText}>CV</Text>
            </View>
            <View style={styles.headersecondCell}>
              <Text style={styles.headerText}>SV</Text>
            </View>
            <View style={styles.headersecondCell}>
              <Text style={styles.headerText}>E</Text>
            </View>
            <View style={styles.headerGoldCell}>
              <Text style={styles.headerText}>D</Text>
            </View>
            <View style={styles.headerGoldCell}>
              <Text style={styles.headerText}>E</Text>
            </View>
            <View style={styles.headerDeltaCell}>
              <Text style={styles.headerText}>DELT</Text>
            </View>
            <View style={styles.headerPercentCell}>
              <Text style={styles.headerText}>%</Text>
            </View>
            <View style={styles.headerCommentsCell}>
              <Text style={styles.headerText}>Comments</Text>
            </View>
          </View>

          {/* Table Body - Dynamic with MainTable data */}
          <ScrollView style={styles.tableBody}>
            {tables.map((table, idx) => (
              <TouchableOpacity 
                key={table.id} 
                style={[
                  styles.tableRow,
                  table.id === gymnastId ? styles.selectedRow : null
                ]}
                onPress={() => handleStartJudging(table.id, table.number, table.event)}
              >
                <View style={styles.idCell}>
                  <Text style={[styles.cellText, 
                  idx === tables.length - 1 ? { borderBottomLeftRadius: 15 } : null
                  ]}>{table.number}</Text>
                </View>
                <View style={styles.gymnastCell}>
                  <Text style={styles.cellText}>{table.name}</Text>
                </View>
                <View style={styles.eventCell}>
                  <Text style={styles.cellText}>{table.event}</Text>
                </View>
                <View style={styles.nocCell}>
                  <Text style={styles.cellText}>{table.noc}</Text>
                </View>
                <View style={styles.bibCell}>
                  <Text style={styles.cellText}>{table.bib}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.j}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.i}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.h}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.g}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.f}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.e}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.d}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.c}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.b}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.a}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.rateGeneral?.difficultyValues.toFixed(1)}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.rateGeneral?.elementGroups5}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.rateGeneral?.stickBonus ? 0.1 : 0}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.nd}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.cv}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.sv.toFixed(1)}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{table.rateGeneral?.eScore.toFixed(3) || '0.000'}</Text>
                </View>
                <View style={styles.goldDataCell}>
                  <Text style={styles.cellText}>{table.rateGeneral?.compD}</Text>
                </View>
                <View style={styles.goldDataCell}>
                  <Text style={styles.cellText}>{table.rateGeneral?.compE}</Text>
                </View>
                <View style={styles.deltaDataCell}>
                  <Text style={styles.cellText}>{table.delt}</Text>
                </View>
                <View style={styles.percentDataCell}>
                  <Text style={styles.cellText}>{table.percentage}</Text>
                </View>
                <View
                  style={[
                    styles.CommentDataCell,
                    idx === tables.length - 1 ? { borderBottomRightRadius: 15 } : null
                  ]}
                >
                  <Text style={styles.cellText}>{table.rateGeneral?.comments}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Button Row */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.startButton} 
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
          <Text style={styles.buttonText}>CONTINUE JUDGING</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinishJudging}>
          <Text style={styles.buttonText}>FINISH JUDGING</Text>
        </TouchableOpacity>
      </View>

      {/* Finish Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>Finish Judging</Text>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>Do you want to download the scoring data as PDF before exiting?</Text>
            </View>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.modalDownloadButton} 
                onPress={handleDownloadPDF}
                disabled={pdfExporting}
              >
                <Text style={styles.buttonText}>
                  {pdfExporting ? "DOWNLOADING..." : "DOWNLOAD PDF"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalExitButton} 
                onPress={handleExit}
              >
                <Text style={styles.buttonText}>EXIT</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  horizontalScroll: {
    flex: 1,
    padding: 10,
    borderRadius: 15,
  },
  headerRow: {
    flexDirection: 'row',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  selectedRow: {
    backgroundColor: '#e3f2fd', // Light blue background for selected row
  },
  // Header styles
  headerIdCell: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderTopLeftRadius: 15,
    borderRightColor: '#ddd',
  },
  headerGymnastCell: {
    width: 430,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
    backgroundColor: '#0052b4', // Blue for header
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerEventCell: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4', // Blue for header
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerNocCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4', // Blue for header
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerBibCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4', // Blue for header
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headersecondCell: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4', // Blue for header
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerSmallCell: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerGoldCell: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E', // Gold/yellow color for D and E headers
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerDeltaCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E', // Gold/yellow color for DELT header
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerPercentCell: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E', // Gold/yellow color for DELT header
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerCommentsCell: {
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4', // Blue for header
    borderTopRightRadius: 15,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  
  // Data row styles - all white background
  idCell: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  gymnastCell: {
    width: 430,
    justifyContent: 'center',
    paddingLeft: 10,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  eventCell: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  nocCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  bibCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  smallCell: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  goldDataCell: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white', // White background for data rows
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  deltaDataCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white', // White background for data rows
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  percentDataCell: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFC0C7', // Pink background for percent column
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  CommentDataCell:{
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white', // White background for comment column
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  cellText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  tableBody: {
    height: 'auto',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f0f4f8',
  },
  startButton: {
    flex: 1,
    backgroundColor: '#0052b4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButton: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
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
  modalHeader: {
    backgroundColor: '#0052b4',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  modalHeaderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modalDownloadButton: {
    flex: 1,
    backgroundColor: '#4CAF50', // Green for download
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalExitButton: {
    flex: 1,
    backgroundColor: '#d32f2f', // Red for exit
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GymnasticsScoreTable;