import { useRouter } from "expo-router";
import React, { useState } from 'react';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import WhiteboardScreen from '../components/WhiteboardScreen';

const { width, height } = Dimensions.get("window");
const isLargeScreen = width >= 1000 && height >= 700;
var isLargeDevice = false
var isSmallDevice = false
var isTinyDevice = false
if (width >= 1368 && height >= 1025) {
  isLargeDevice = true
}
if (width < 1367 && width >= 945) {
  isSmallDevice = true
}
if (width < 949 ) {
  isTinyDevice = true
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
    eScore: 10.000,
    myScore: 12.000,
    compDeduction: {
      D: 0.0,
      E: 0.000,
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
  // Track active states for buttons
  const [activeButtons, setActiveButtons] = useState<{[key: string]: number[]}>({
    J: [0],
    I: [0],
    H: [0],
    G: [2, 0],
    F: [0],
    E: [1],
    D: [0],
    C: [3],
    B: [0],
    A: [0],
  });

  const toggleButton = (row: string, num: number) => {
    setActiveButtons(prev => {
      const rowButtons = [...(prev[row] || [])];
      const index = rowButtons.indexOf(num);
      
      if (index >= 0) {
        rowButtons.splice(index, 1);
      } else {
        rowButtons.push(num);
      }
      
      return {
        ...prev,
        [row]: rowButtons
      };
    });
  };
  
  // Generate number buttons (1-9, 0) for each row
  const renderNumberButtons = (rowLabel: string) => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
    
    return (
      <View style={styles.tableRow}>
        <View style={styles.labelCell}>
          <Text style={styles.labelText}>{rowLabel}</Text>
        </View>
        {numbers.map((num) => {
          const isActive = activeButtons[rowLabel].includes(num);
          return (
            <TouchableOpacity 
              key={`${rowLabel}-${num}`} 
              style={[
                styles.numberCell,
                isActive ? (num === 0 ? styles.zeroActive : styles.numberActive) : styles.numberInactive
              ]}
              onPress={() => toggleButton(rowLabel, num)}
            >
              <Text style={[styles.numberText, isActive && num !== 0 && styles.numberActiveText]}>
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* adding conditional if the letter is J or I display  */}
        
        
        {/* Adding the last button */}
        {rowLabel === 'I' && (<View style={styles.labelCellSelected}>
          <Text style={styles.labelText}>2</Text>
        </View>)}
        {rowLabel === 'I' && (<View style={styles.labelCellSelected}>
          <Text style={styles.labelText}>{rowLabel}</Text>
        </View>)}
        {rowLabel !== 'I' && (<View style={styles.labelCell}>
          <Text style={styles.labelText}>2</Text>
        </View>)}
        {rowLabel !== 'I' && (<View style={styles.labelCell}>
          <Text style={styles.labelText}>{rowLabel}</Text>
        </View>)}

      </View>
    );
  };
    const router = useRouter();

  const handleSelect = (discipline: string) => {
    router.push(`/final-table`); // Pass the value as a query parameter
  };
  const [isScrollEnabled, setIsScrollEnabled] = useState(true); // State to control scrolling


  return (
    <SafeAreaView style={styles.container}>

        {/* <View style={styles.scoreDisplay}>
          <Text style={styles.scoreText}>100</Text>
          <TouchableOpacity onPress={() => {}} style={styles.codetable}>
            <Text style={styles.codeTableText}>CODE TABLE</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}} style={styles.stickbonus}>
            <Text style={styles.codeTableText}>STICK BONUS</Text>
          </TouchableOpacity>
        </View> */}
        
        <WhiteboardScreen />
        <ScrollView        scrollEnabled={isScrollEnabled} // Control scrolling here
        >
        {/* <Button
        title={isScrollEnabled ? "Disable Scroll" : "Enable Scroll"}
        onPress={() => setIsScrollEnabled(!isScrollEnabled)}
      />
      <Button
        title={"Go to alternative"}
        onPress={() => gotoalternative("2")}
      /> */}

        <View style={styles.mainContent}>
          {/* Left Side: Code Table */}
          <View style={styles.leftColumn}>

            
            {/* Code table rows */}
            {renderNumberButtons('J')}
            {renderNumberButtons('I')}
            {renderNumberButtons('H')}
            {renderNumberButtons('G')}
            {renderNumberButtons('F')}
            {renderNumberButtons('E')}
            {renderNumberButtons('D')}
            {renderNumberButtons('C')}
            {renderNumberButtons('B')}
            {renderNumberButtons('A')}
          </View>
          
          {/* Right Side: Scores and Info */}
          <View style={styles.rightColumn}>
            <View style={styles.infoTable}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>NUMBER OF ELEMENTS</Text>
                </View>
                <View style={styles.infoValueCellRed}>
                  <Text style={styles.infoValueText}>{judgingData.numberOfElements}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>DIFFICULTY VALUES</Text>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <Text style={styles.infoValueText}>{judgingData.difficultyValues.toFixed(1)}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>ELEMENT GROUPS</Text>
                </View>
                <View style={styles.elementGroupsContainer}>
                  <View style={styles.elementGroupCellTitle}>
                    <Text style={styles.elementGroupText}>I</Text>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <Text style={styles.elementGroupValue}>{judgingData.elementGroups.I.toFixed(1)}</Text>
                  </View>
                  <View style={styles.elementGroupCellTitle}>
                    <Text style={styles.elementGroupText}>II</Text>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <Text style={styles.elementGroupValue}>{judgingData.elementGroups.II.toFixed(1)}</Text>
                  </View>
                  <View style={styles.elementGroupCellTitle}>
                    <Text style={styles.elementGroupText}>III</Text>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <Text style={styles.elementGroupValue}>{judgingData.elementGroups.III.toFixed(1)}</Text>
                  </View>
                  <View style={styles.elementGroupCellTitle}>
                    <Text style={styles.elementGroupText}>IV  </Text>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <Text style={styles.elementGroupValue}>{judgingData.elementGroups.IV.toFixed(1)}</Text>
                  </View>
                  <View style={styles.elementGroupCellTitle}>
                    <Text style={styles.elementGroupText}>V  </Text>
                  </View>
                  <View style={styles.elementGroupCell}>
                    <Text style={styles.elementGroupValue}>{judgingData.elementGroups.V.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>ELEMENT GROUPS TOTAL</Text>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <Text style={styles.infoValueText}>{judgingData.elementGroupsTotal.toFixed(1)}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>CV</Text>
                </View>
                <View style={styles.infoValueCellGreen}>
                  <Text style={styles.infoValueText}>{judgingData.cv.toFixed(1)}</Text>
                </View>
                <View style={styles.stickBonusCell}>
                  <Text 
                  style={[
                    isLargeDevice ? styles.bonusLabelTextStickBonus : null, 
                    isSmallDevice ? styles.bonusLabelTextStickBonusSmall : null, 
                    isTinyDevice ? styles.bonusLabelTextStickBonusTiny : null, 
                  ]}>STICK BONUS</Text>
                </View> 
                <View style={styles.stickBonusCelltext}>
                  <Text style={styles.bonusValueText}>{judgingData.stickBonus.toFixed(1)}</Text>
                </View> 
                <View style={styles.ndCell}>
                  <Text style={styles.bonusLabelText}>ND</Text>
                </View>
                <View style={styles.ndCellText}>
                  <Text style={styles.bonusValueText}>{judgingData.nd.toFixed(1)}</Text>
                </View>
                <View style={styles.svCell}>
                  <Text style={styles.svLabelText}>SV</Text>
                </View>
                <View style={styles.svCellText}>
                  <Text style={styles.svValueText}>{judgingData.sv.toFixed(1)}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>EXECUTION</Text>
                </View>
                <View style={styles.infoValueCellBlue}>
                  <Text style={styles.infoValueText}>{judgingData.execution.toFixed(1)}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoLabelCell}>
                  <Text style={styles.infoLabelText}>E SCORE</Text>
                </View>
                <View style={styles.scoreValueCell}>
                  <Text style={styles.scoreValueText}>{judgingData.eScore.toFixed(3)}</Text>
                </View>
                <View style={styles.myScoreCellScore}>
                  <Text 
                  style={[
                    isLargeDevice ? styles.myScoreLabelTextScore : null, 
                    isSmallDevice ? styles.myScoreLabelTextScoreSmall : null, 
                    isTinyDevice ? styles.myScoreLabelTextScoreTiny : null, 
                  ]}>MY SCORE</Text>
                </View>
                <View style={styles.myScoreCell}>
                  <Text style={styles.myScoreValueText}>{judgingData.myScore.toFixed(3)}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.compDeductionLabelCell}>
                  <Text style={styles.compDeductionLabelText}>COMPETITION{'\n'}INFO</Text>
                </View>
                <View style={styles.dCell}>
                  <Text 
                  style={[
                    isLargeDevice ? styles.dLabelText : null, 
                    isSmallDevice ? styles.dLabelTextSmall : null, 
                    isTinyDevice ? styles.dLabelTextTiny : null, 
                  ]}
                  
                  >D</Text>
                </View>
                <View style={styles.dCellText}>
                  <Text 
                  style={[
                    isLargeDevice ? styles.dValueText : null, 
                    isSmallDevice ? styles.dValueTextSmall : null, 
                    isTinyDevice ? styles.dValueTextTiny : null, 
                  ]}>{judgingData.compDeduction.D.toFixed(1)}</Text>
                </View>
                <View style={styles.eCell}>
                  <Text
                  style={[
                    isLargeDevice ? styles.eLabelText : null, 
                    isSmallDevice ? styles.eLabelTextSmall : null, 
                    isTinyDevice ? styles.eLabelTextTiny : null, 
                  ]}>E</Text>
                </View>
                <View style={styles.eCellText}>
                  <Text
                  style={[
                    isLargeDevice ? styles.eValueText : null, 
                    isSmallDevice ? styles.eValueTextSmall : null, 
                    isTinyDevice ? styles.eValueTextTiny : null, 
                  ]}>{judgingData.compDeduction.E.toFixed(3)}</Text>
                </View>
                <View style={styles.sdCell}>
                  <Text 
                  style={[
                    isLargeDevice ? styles.sdLabelText : null, 
                    isSmallDevice ? styles.sdLabelTextSmall : null, 
                    isTinyDevice ? styles.sdLabelTextTiny : null, 
                  ]}>SD</Text>
                </View>
                <View style={styles.sdCellText}>
                  <Text
                  style={[
                    isLargeDevice ? styles.sdValueText : null, 
                    isSmallDevice ? styles.sdValueTextSmall : null, 
                    isTinyDevice ? styles.sdValueTextTiny : null, 
                  ]}
                  >{judgingData.compDeduction.SD}</Text>
                </View>
                <View style={styles.ndDeductionCell}>
                  <Text 
                  style={[
                    isLargeDevice ? styles.ndLabelText : null, 
                    isSmallDevice ? styles.ndLabelTextSmall : null, 
                    isTinyDevice ? styles.ndLabelTextTiny : null, 
                  ]}
                  >ND</Text>
                </View>
                <View style={styles.ndDeductionCellText}>
                  <Text 
                  style={[
                    isLargeDevice ? styles.ndValueText : null, 
                    isSmallDevice ? styles.ndValueTextSmall : null, 
                    isTinyDevice ? styles.ndValueTextTiny : null, 
                  ]}
                  >{judgingData.compDeduction.ND}</Text>
                </View>
                <View style={styles.scoreCell}>
                  <Text 
                  
                  style={[
                    isLargeDevice ? styles.scoreLabelText : null, 
                    isSmallDevice ? styles.scoreLabelTextSmall : null, 
                    isTinyDevice ? styles.scoreLabelTextTiny : null, 
                  ]}
                  >SCORE</Text>
                </View>
                <View style={styles.scoreCellText}>
                  <Text
                  style={[
                    isLargeDevice ? styles.scoreValueText : null, 
                    isSmallDevice ? styles.scoreValueTextSmall : null, 
                    isTinyDevice ? styles.scoreValueTextTiny : null, 
                  ]}
                  >{judgingData.neutral.total}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.neutralCell}>
                  <Text style={styles.neutralLabelText}>GYMNAST{'\n'}INFO</Text>
                </View>
                <View style={styles.overtimeCell}>
                  <Text style={styles.overtimeValueText}>{judgingData.neutral.overtime}</Text>
                </View>
                <View style={styles.lineCell}>
                  <Text style={styles.lineValueText}>{judgingData.neutral.line}</Text>
                </View>
                <View style={styles.otherCell}>
                  <Text style={styles.otherValueText}>{judgingData.neutral.other}</Text>
                </View>
                <View style={styles.neutralTotalCell}>
                  <Text style={styles.neutralTotalValueText}>{judgingData.neutral.total}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.commentsSection}>
          <Text style={styles.commentsText}>COMMENTS</Text>
            {/* <Text>{judgingData.comments}</Text> */}
            {/* INPUT */}
            <TextInput
              style={styles.commentsBox}
              multiline
              numberOfLines={3}
              value={judgingData.comments}
              onChangeText={(text) => {
                // Handle comment change
                console.log(text);
              }}
            />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.buttonText}>BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mainTableButton} onPress={() => handleSelect('MAG')}>
            <Text style={styles.buttonText}>MAIN TABLE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.buttonText}>NEXT</Text>
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
  scoreDisplay: {
    height: 512,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 10,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  stickbonus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0052b4',
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#B4B4B4',
    borderRadius: 10,
    /* shadow */
    shadowColor: '#000',
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
    fontWeight: 'bold',
    color: '#0052b4',
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#B4B4B4',
    borderRadius: 10,
    /* shadow */
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
  mainContent: {
    flexDirection: 'row',
    width: '100%',
  },
  leftColumn: {
    width: '45%',
  },
  rightColumn: {
    width: '55%',
    
  },
  codeTableHeader: {
    backgroundColor: '#ccc',
    padding: 5,
  },
  codeTableText: {
    fontSize: 20,
    color: 'white',
  },
  tableRow: {
    flexDirection: 'row',
    height: 30,
  },
  labelCell: {
    width: 30,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  labelCellSelected: {
    width: 30,
    backgroundColor: '#00b050',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },

  labelText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  numberCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  numberActive: {
    backgroundColor: '#0052b4',
  },
  zeroActive: {
    backgroundColor: '#00b050',
  },
  numberInactive: {
    backgroundColor: '#fff',
  },
  numberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  numberActiveText: {
    color: '#fff',
  },
  infoTable: {
    marginTop: 0,
    
  },
  infoRow: {
    flexDirection: 'row',
    height: 33.3,
  },
  infoLabelCell: {
    backgroundColor: '#a9def9',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
    borderWidth: 0.1,
    borderColor: '#999',
    width: 200,

  },
  infoLabelText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  infoValueCellRed: {
    flex: 1,
    backgroundColor: '#ff9b9b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  infoValueCellBlue: {
    flex: 1,
    backgroundColor: '#6B9BDF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  infoValueCellGreen: {
    flex: 1,
    backgroundColor: '#f8c471',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  infoValueText: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#333',
  },
  elementGroupsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  elementGroupCell: {
    flex: 1,
    /* row */
    flexDirection: 'row',
    /* space between text */
    backgroundColor: '#6B9BDF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },

  elementGroupCellTitle: {
    flex: 0.5,
    /* row */
    flexDirection: 'row',
    /* space between text */
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  elementGroupText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  elementGroupValue: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  stickBonusCell: {
    flex: 1.4,
    backgroundColor: '#00b050',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  stickBonusCelltext: {
    flex: 0.7,
    backgroundColor: '#f8c471',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },

  bonusLabelText: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  bonusLabelTextStickBonus: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  bonusLabelTextStickBonusSmall: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  bonusLabelTextStickBonusTiny: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },


  bonusValueText: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#333',
  },
  ndCell: {
    flex: 1,
    /* row */
    flexDirection: 'row',
    backgroundColor: '#00b050',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  ndCellText: {
    flex: 1,
    /* row */
    flexDirection: 'row',
    backgroundColor: '#f8c471',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  svCell: {
    flex: 1,
    backgroundColor: '#00b050',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  svCellText: {
    flex: 1,
    backgroundColor: '#ffcb41',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },

  svLabelText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  svValueText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreValueCell: {
    flex: 1,
    backgroundColor: '#6B9BDF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  scoreValueText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreValueTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreValueTextTiny: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },

  myScoreCell: {
    flex: 1,
    backgroundColor: '#6B9BDF',
    justifyContent: 'space-around',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  myScoreCellScore: {
    flex: 1,
    backgroundColor: '#D9D9D9',
    justifyContent: 'space-around',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  myScoreLabelText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  myScoreValueText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  myScoreLabelTextScore: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  myScoreLabelTextScoreSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  myScoreLabelTextScoreTiny: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },

  compDeductionLabelCell: {
    backgroundColor: '#00b050',
    width: 200,
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderWidth: 0.5,
    paddingRight: 10,
    borderColor: '#999',
  },
  compDeductionLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  dCell: {
    flex: 0.6,
    flexDirection: 'row',
    backgroundColor: '#D9D9D9',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  dCellText: {
    flex: 0.9,
    flexDirection: 'row',
    backgroundColor: '#00b050',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },

  dLabelText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  dLabelTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dLabelTextTiny: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dValueText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  dValueTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dValueTextTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  eCell: {
    flex: 0.6,
    flexDirection: 'row',
    backgroundColor: '#D9D9D9',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  eCellText: {
    flex: 1.3,
    flexDirection: 'row',
    backgroundColor: '#00b050',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  eLabelText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  eLabelTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  eLabelTextTiny: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  eValueText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  eValueTextSmall: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  eValueTextTiny: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  sdCell: {
    flex: 0.8,
    backgroundColor: '#D9D9D9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  sdCellText: {
    flex: 0.8,
    backgroundColor: '#00b050',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },


  sdLabelText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  sdLabelTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sdLabelTextTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  sdValueText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  sdValueTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sdValueTextTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  ndDeductionCell: {
    flex: 0.9,
    backgroundColor: '#D9D9D9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  ndDeductionCellText: {
    flex: 0.8,
    backgroundColor: '#00b050',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },


  ndLabelText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  ndLabelTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ndLabelTextTiny: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  ndValueText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  ndValueTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ndValueTextTiny: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  scoreCell: {
    flex: 1.5,
    backgroundColor: '#D9D9D9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  scoreCellText: {
    flex: 1.3,
    backgroundColor: '#00b050',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  scoreLabelText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabelTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabelTextTiny: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },

  neutralCell: {
    width: 200,
    backgroundColor: '#f8c471',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderWidth: 0.5,
    paddingRight: 10,
    borderColor: '#999',
  },
  neutralLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  overtimeCell: {
    flex: 0.8,
    backgroundColor: '#f8c471',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  overtimeValueText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  lineCell: {
    flex: 1,
    backgroundColor: '#f8c471',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  lineValueText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  otherCell: {
    flex: 1,
    backgroundColor: '#f8c471',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  otherValueText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  neutralTotalCell: {
    flex: 1,
    backgroundColor: '#f8c471',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  neutralTotalValueText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  commentsSection: {
    padding: 10,
  },
  commentsText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  commentsBox: {
    height: 60,
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
    marginBottom: 10,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#0052b4',
    padding: 12,
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTableButton: {
    flex: 1,
    backgroundColor: '#0052b4',
    padding: 12,
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#0052b4',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default GymnasticsJudgingTable;