import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';

interface Gymnast {
  id: number;
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
  e_score: number;
  d_score: number;
  e_penalty: number;
  delt: number;
  percentage: number;
}

interface GymnasticsScoreTableProps {
  gymnasts: Gymnast[];
  onStartJudging: () => void;
  onFinishJudging: () => void;
}

const GymnasticsScoreTable: React.FC<GymnasticsScoreTableProps> = ({
  gymnasts = [],
  onStartJudging,
  onFinishJudging
}) => {
  // Sample data if no gymnasts provided
  const sampleGymnasts: Gymnast[] = [
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },{
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 1,
      name: 'Gymnast',
      event: 'FX',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 2,
      name: 'Gymnast',
      event: 'VT',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 3,
      name: 'Gymnast',
      event: 'PH',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    },
    {
      id: 4,
      name: 'Gymnast',
      event: 'Suelo',
      noc: '0',
      bib: '0',
      j: 0,
      i: 0,
      h: 0,
      g: 0,
      f: 0,
      e: 0,
      d: 0,
      c: 0,
      b: 0,
      a: 0,
      dv: 0,
      eg: 0,
      sb: 0,
      nd: 0,
      cv: 0,
      sv: 0,
      e_score: 0,
      d_score: 0,
      e_penalty: 0,
      delt: 0,
      percentage: 0
    }
  ];

  // Use provided gymnasts or sample data if empty
  const displayGymnasts = gymnasts.length > 0 ? gymnasts : sampleGymnasts;
  const windowWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
        <View>
          {/* Table Header */}
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
          </View>

          {/* Table Body - Only display actual data rows */}
          <ScrollView style={styles.tableBody}>
            {displayGymnasts.map((gymnast) => (
              <View key={gymnast.id} style={styles.tableRow}>
                <View style={styles.idCell}>
                  <Text style={styles.cellText}>{gymnast.id}</Text>
                </View>
                <View style={styles.gymnastCell}>
                  <Text style={styles.cellText}>{gymnast.name}</Text>
                </View>
                <View style={styles.eventCell}>
                  <Text style={styles.cellText}>{gymnast.event}</Text>
                </View>
                <View style={styles.nocCell}>
                  <Text style={styles.cellText}>{gymnast.noc}</Text>
                </View>
                <View style={styles.bibCell}>
                  <Text style={styles.cellText}>{gymnast.bib}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.j}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.i}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.h}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.g}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.f}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.e}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.d}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.c}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.b}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.a}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.dv}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.eg}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.sb}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.nd}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.cv}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.sv}</Text>
                </View>
                <View style={styles.smallCell}>
                  <Text style={styles.cellText}>{gymnast.e_score}</Text>
                </View>
                <View style={styles.goldDataCell}>
                  <Text style={styles.cellText}>{gymnast.d_score}</Text>
                </View>
                <View style={styles.goldDataCell}>
                  <Text style={styles.cellText}>{gymnast.e_penalty}</Text>
                </View>
                <View style={styles.deltaDataCell}>
                  <Text style={styles.cellText}>{gymnast.delt}</Text>
                </View>
                <View style={styles.percentDataCell}>
                  <Text style={styles.cellText}>{gymnast.percentage}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Button Row */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.startButton} onPress={onStartJudging}>
          <Text style={styles.buttonText}>START JUDGING</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishButton} onPress={onFinishJudging}>
          <Text style={styles.buttonText}>FINISH JUDGING</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0052b4', // Blue for header
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerSmallCell: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A2A2A2', 

    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerGoldCell: {
    width: 40,
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
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5D76E', // Gold/yellow color for DELT header
    /* backgroundColor: '#FFCDD2',  */
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
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  goldDataCell: {
    width: 40,
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
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFC0C7', // White background for data rows even in percent column
    borderRightWidth: 1,
    /* borderBottomEndRadius: 15, */
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
});

export default GymnasticsScoreTable;