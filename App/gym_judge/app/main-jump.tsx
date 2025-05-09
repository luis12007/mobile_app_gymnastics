import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Dimensions, 
  Image, 
  TextInput
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Device size detection for responsive design
const isLargeDevice = width >= 1200 && height >= 700;
const isSmallDevice = width < 1200 && width >= 950;
const isTinyDevice = width < 950;

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
    vaultNumbers: '100',
    sv: 2.0,
    nd: 0.0,
    sb: 0.0,
    execution: 0.0,
    myScore: 10.000,
    compDeduction: {
      d: 0.0,
      e: 0.000,
      sd: '##',
      nd: '##',
      score: 0.000,
    },
    neutral: {
      overtime: 0,
      line: 0,
      other: 0,
      total: 1,
    },
    startValue: 0,
    description: 'No vault assigned',
    comments: '',
  },
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Score Display */}
        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreText}>100</Text>
        </View>

        {/* Graph Image */}
        <View style={styles.graphContainer}>
          <Image
            source={require("../assets/images/Jump.png")}
            style={styles.graphContainerimg}
            resizeMode="contain"
          />

          <TouchableOpacity 
            onPress={() => {}} 
            style={styles.codetable}
          >
            <Text 
              style={[
                isLargeDevice ? styles.codeTableText : null,
                isSmallDevice ? styles.codeTableTextSmall : null,
                isTinyDevice ? styles.codeTableTextTiny : null
              ]}
            >
              CODE TABLE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Table */}
        <View style={styles.tableContainer}>
          {/* Header Row */}
          <View style={styles.tableRow}>
            <View style={styles.vaultNumbersCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.cellHeaderText : null,
                  isSmallDevice ? styles.cellHeaderTextSmall : null,
                  isTinyDevice ? styles.cellHeaderTextTiny : null
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
                  isTinyDevice ? styles.cellHeaderTextTiny : null
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
                  isTinyDevice ? styles.cellHeaderTextTiny : null
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
                  isTinyDevice ? styles.cellHeaderTextTiny : null
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
                  isTinyDevice ? styles.cellHeaderTextTiny : null
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
                  isTinyDevice ? styles.cellHeaderTextTiny : null
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
                  isTinyDevice ? styles.vaultValueTextTiny : null
                ]}
              >
                {vaultData.vaultNumbers}
              </Text>
            </View>
            <View style={[styles.emptyBlueCell, {width: 210}]}>
              <Text 
                style={[
                  isLargeDevice ? styles.svValueText : null,
                  isSmallDevice ? styles.svValueTextSmall : null,
                  isTinyDevice ? styles.svValueTextTiny : null
                ]}
              >
                2.0
              </Text>
            </View>
            <View style={styles.ndValueCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.valueText : null,
                  isSmallDevice ? styles.valueTextSmall : null,
                  isTinyDevice ? styles.valueTextTiny : null
                ]}
              >
                {vaultData.nd.toFixed(1)}
              </Text>
            </View>
            <View style={styles.sbValueCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.valueText : null,
                  isSmallDevice ? styles.valueTextSmall : null,
                  isTinyDevice ? styles.valueTextTiny : null
                ]}
              >
                {vaultData.sb.toFixed(1)}
              </Text>
            </View>
            <View style={styles.executionValueCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.valueText : null,
                  isSmallDevice ? styles.valueTextSmall : null,
                  isTinyDevice ? styles.valueTextTiny : null
                ]}
              >
                {vaultData.execution.toFixed(1)}
              </Text>
            </View>
            <View style={styles.myScoreValueCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.scoreValueText : null,
                  isSmallDevice ? styles.scoreValueTextSmall : null,
                  isTinyDevice ? styles.scoreValueTextTiny : null
                ]}
              >
                {vaultData.myScore.toFixed(3)}
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
                  isTinyDevice ? styles.cellHeaderTextTiny : null
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
                  isTinyDevice ? styles.cellHeaderTextTiny : null
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
                  isTinyDevice ? styles.compDeductionTextTiny : null
                ]}
              >
                COMPETITION
              </Text>
              <Text 
                style={[
                  isLargeDevice ? styles.compDeductionText : null,
                  isSmallDevice ? styles.compDeductionTextSmall : null,
                  isTinyDevice ? styles.compDeductionTextTiny : null
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
                  isTinyDevice ? styles.smallCellTextTiny : null
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
                  isTinyDevice ? styles.smallValueTextTiny : null
                ]}
              >
                {vaultData.compDeduction.d.toFixed(1)}
              </Text>
            </View>
            <View style={styles.eCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.smallCellText : null,
                  isSmallDevice ? styles.smallCellTextSmall : null,
                  isTinyDevice ? styles.smallCellTextTiny : null
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
                  isTinyDevice ? styles.smallValueTextTiny : null
                ]}
              >
                {vaultData.compDeduction.e.toFixed(3)}
              </Text>
            </View>
            <View style={styles.sdCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.smallCellText : null,
                  isSmallDevice ? styles.smallCellTextSmall : null,
                  isTinyDevice ? styles.smallCellTextTiny : null
                ]}
              >
                SD
              </Text>
            </View>
            <View style={styles.sdValueCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.smallValueText : null,
                  isSmallDevice ? styles.smallValueTextSmall : null,
                  isTinyDevice ? styles.smallValueTextTiny : null
                ]}
              >
                {vaultData.compDeduction.sd}
              </Text>
            </View>
            <View style={styles.ndDeductionCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.smallCellText : null,
                  isSmallDevice ? styles.smallCellTextSmall : null,
                  isTinyDevice ? styles.smallCellTextTiny : null
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
                  isTinyDevice ? styles.smallValueTextTiny : null
                ]}
              >
                {vaultData.compDeduction.nd}
              </Text>
            </View>
            <View style={styles.scoreHeaderCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.smallCellText : null,
                  isSmallDevice ? styles.smallCellTextSmall : null,
                  isTinyDevice ? styles.smallCellTextTiny : null
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
                  isTinyDevice ? styles.smallValueTextTiny : null
                ]}
              >
                {vaultData.compDeduction.score.toFixed(3)}
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
                  isTinyDevice ? styles.startValueValueTextTiny : null
                ]}
              >
                {vaultData.startValue}
              </Text>
            </View>
            <View style={styles.descriptionValueCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.descriptionValueText : null,
                  isSmallDevice ? styles.descriptionValueTextSmall : null,
                  isTinyDevice ? styles.descriptionValueTextTiny : null
                ]}
              >
                {vaultData.description}
              </Text>
            </View>
            <View style={styles.gymnastInfoCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.gymnastInfoText : null,
                  isSmallDevice ? styles.gymnastInfoTextSmall : null,
                  isTinyDevice ? styles.gymnastInfoTextTiny : null
                ]}
              >
                GYMNAST
              </Text>
              <Text 
                style={[
                  isLargeDevice ? styles.gymnastInfoText : null,
                  isSmallDevice ? styles.gymnastInfoTextSmall : null,
                  isTinyDevice ? styles.gymnastInfoTextTiny : null
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
                  isTinyDevice ? styles.neutralTextTiny : null
                ]}
              >
                0
              </Text>
            </View>
            <View style={styles.neutralValueCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.neutralText : null,
                  isSmallDevice ? styles.neutralTextSmall : null,
                  isTinyDevice ? styles.neutralTextTiny : null
                ]}
              >
                0
              </Text>
            </View>
            <View style={styles.neutralValueCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.neutralText : null,
                  isSmallDevice ? styles.neutralTextSmall : null,
                  isTinyDevice ? styles.neutralTextTiny : null
                ]}
              >
                0
              </Text>
            </View>
            <View style={styles.neutralTotalCell}>
              <Text 
                style={[
                  isLargeDevice ? styles.neutralTotalText : null,
                  isSmallDevice ? styles.neutralTotalTextSmall : null,
                  isTinyDevice ? styles.neutralTotalTextTiny : null
                ]}
              >
                1
              </Text>
            </View>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text 
            style={[
              isLargeDevice ? styles.commentsText : null,
              isSmallDevice ? styles.commentsTextSmall : null,
              isTinyDevice ? styles.commentsTextTiny : null
            ]}
          >
            COMMENTS
          </Text>
          <TextInput
            style={styles.commentsBox}
            multiline
            numberOfLines={3}
            onChangeText={(text) => {
              // Handle comment change
              console.log(text);
            }}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text 
              style={[
                isLargeDevice ? styles.buttonText : null,
                isSmallDevice ? styles.buttonTextSmall : null,
                isTinyDevice ? styles.buttonTextTiny : null
              ]}
            >
              BACK
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.filterButton} onPress={onFilter}>
            <Text 
              style={[
                isLargeDevice ? styles.buttonText : null,
                isSmallDevice ? styles.buttonTextSmall : null,
                isTinyDevice ? styles.buttonTextTiny : null
              ]}
            >
              MAIN TABLE
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text 
              style={[
                isLargeDevice ? styles.buttonText : null,
                isSmallDevice ? styles.buttonTextSmall : null,
                isTinyDevice ? styles.buttonTextTiny : null
              ]}
            >
              NEXT
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
    backgroundColor: '#e0e0e0',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  scoreDisplay: {
    height: 50,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 10,
  },
  scoreText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  graphContainer: {
    height: isLargeDevice ? 450 : isSmallDevice ? 350 : 250,
    width: '100%',
    position: 'relative',
  },
  graphContainerimg: {
    width: isLargeDevice ? '70%' : isSmallDevice ? '60%' : '50%',
    height: isLargeDevice ? '70%' : isSmallDevice ? '60%' : '50%',
    position: 'relative',
    alignSelf: 'center',
    top: isLargeDevice ? 60 : isSmallDevice ? 50 : 40,
    left: 0,
  },
  codetable: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0052b4',
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#B4B4B4',
    borderRadius: 10,
    shadowColor: '#000',
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
    color: 'white',
  },
  codeTableTextSmall: {
    fontSize: 16,
    color: 'white',
  },
  codeTableTextTiny: {
    fontSize: 12,
    color: 'white',
  },
  tableContainer: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    height: isLargeDevice ? 55 : isSmallDevice ? 45 : 35,
  },
  vaultNumbersCell: {
    width: isLargeDevice ? 700 : isSmallDevice ? 500 : 300,
    backgroundColor: '#64b5f6',
    justifyContent: 'center',
    paddingLeft: 10,
    borderWidth: 0.5,
    borderColor: '#999',
  },
  cellHeaderText: {
    fontSize: 25,
    fontWeight: 'bold',
    alignSelf: 'center',
    color: '#000',
  },
  cellHeaderTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    alignSelf: 'center',
    color: '#000',
  },
  cellHeaderTextTiny: {
    fontSize: 15,
    fontWeight: 'bold',
    alignSelf: 'center',
    color: '#000',
  },
  svValueCell: {
    width: isLargeDevice ? 210 : isSmallDevice ? 160 : 110,
    backgroundColor: '#ffca28',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  svValueText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  svValueTextSmall: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  svValueTextTiny: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  ndCell: {
    flex: 1,
    backgroundColor: '#64b5f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  sbCell: {
    flex: 1,
    backgroundColor: '#f48fb1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  executionCell: {
    flex: 2,
    backgroundColor: '#f48fb1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  myScoreCell: {
    flex: 2,
    backgroundColor: '#64b5f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  vaultValueCell: {
    width: isLargeDevice ? 700 : isSmallDevice ? 500 : 300,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  vaultValueText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  vaultValueTextSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  vaultValueTextTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyBlueCell: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#999',
    zIndex: -1,
  },
  ndValueCell: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  valueText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  valueTextSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  valueTextTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  sbValueCell: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  executionValueCell: {
    flex: 2,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  myScoreValueCell: {
    flex: 2,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  scoreValueText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  scoreValueTextSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  scoreValueTextTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  startValueCell: {
    width: isLargeDevice ? 250 : isSmallDevice ? 180 : 120,
    backgroundColor: '#64b5f6',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  descriptionCell: {
    width: isLargeDevice ? 450 : isSmallDevice ? 320 : 180,
    backgroundColor: '#64b5f6',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  compDeductionHeaderCell: {
    width: isLargeDevice ? 210 : isSmallDevice ? 160 : 110,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  compDeductionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'left',
    alignSelf: 'flex-end',
    paddingRight: 10,
  },
  compDeductionTextSmall: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'left',
    alignSelf: 'flex-end',
    paddingRight: 8,
  },
  compDeductionTextTiny: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'left',
    alignSelf: 'flex-end',
    paddingRight: 5,
  },
  dCell: {
    flex: 0.5,
    backgroundColor: '#A3A3A3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  smallCellText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  smallCellTextSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  smallCellTextTiny: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  dValueCell: {
    flex: 0.5,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  smallValueText: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#000',
  },
  smallValueTextSmall: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#000',
  },
  smallValueTextTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  eCell: {
    flex: 0.5,
    backgroundColor: '#A3A3A3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  eValueCell: {
    flex: 0.7,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  sdCell: {
    flex: 0.5,
    backgroundColor: '#A3A3A3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  sdValueCell: {
    flex: 0.5,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  ndDeductionCell: {
    flex: 0.5,
    backgroundColor: '#A3A3A3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  ndDeductionValueCell: {
    flex: 0.5,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  scoreHeaderCell: {
    flex: 0.5,
    backgroundColor: '#A3A3A3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  scoreTotalCell: {
    flex: 0.7,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  startValueValueCell: {
    width: isLargeDevice ? 250 : isSmallDevice ? 180 : 120,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  startValueValueText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000',
  },
  startValueValueTextSmall: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#000',
  },
  startValueValueTextTiny: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  descriptionValueCell: {
    width: isLargeDevice ? 450 : isSmallDevice ? 320 : 180,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  descriptionValueText: {
    fontSize: 30,
    color: '#000',
  },
  descriptionValueTextSmall: {
    fontSize: 25,
    color: '#000',
  },
  descriptionValueTextTiny: {
    fontSize: 18,
    color: '#000',
  },
  gymnastInfoCell: {
    width: isLargeDevice ? 210 : isSmallDevice ? 160 : 110,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  gymnastInfoText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
    alignSelf: 'flex-end',
    paddingRight: 10,
  },
  gymnastInfoTextSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
    alignSelf: 'flex-end',
    paddingRight: 8,
  },
  gymnastInfoTextTiny: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
    alignSelf: 'flex-end',
    paddingRight: 5,
  },
  neutralValueCell: {
    flex: 2,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  neutralValueCellname: {
    flex: 4,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  neutralText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000',
  },
  neutralTextSmall: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#000',
  },
  neutralTextTiny: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  neutralTotalCell: {
    flex: 0.7,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  neutralTotalText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000',
  },
  neutralTotalTextSmall: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#000',
  },
  neutralTotalTextTiny: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  commentsSection: {
    padding: 10,
  },
  commentsText: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#333',
  },
  commentsTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  commentsTextTiny: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  commentsBox: {
    height: isLargeDevice ? 60 : isSmallDevice ? 50 : 40,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    marginTop: isLargeDevice ? 30 : isSmallDevice ? 20 : 15,
  },
  backButton: {
    flex: 3,
    backgroundColor: '#0052b4',
    padding: isLargeDevice ? 15 : isSmallDevice ? 12 : 10,
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#0052b4',
    padding: isLargeDevice ? 15 : isSmallDevice ? 12 : 10,
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 3,
    backgroundColor: '#0052b4',
    padding: isLargeDevice ? 15 : isSmallDevice ? 12 : 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonTextSmall: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonTextTiny: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default VaultScoreDisplay;