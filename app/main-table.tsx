import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { getCompetitionById, Competition, getGymnastsByCompetition, Gymnast } from '../lib/database';

const { width, height } = Dimensions.get("window");

interface TableRow {
  id: number;
  numero: number;
  gymnasta: string;
  evento: string;
  noc: string;
  bib: string;
  // Judge scores
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
  // Difficulty & Execution
  dv: number;  // Difficulty Value
  eg: number;  // Element Group
  sb: number;  // Stick Bonus
  nd: number;  // Neutral Deduction
  cv: number;  // Connection Value
  sv: number;  // Start Value
  eScore: number;  // Execution Score
  dScore: number;  // Difficulty Score
  eDelta: number;
  delta: number;
  percentage: number;
  comments: string;
}

const MainTable: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const competitionId = params.competitionId ? Number(params.competitionId) : 0;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [gymnasts, setGymnasts] = useState<Gymnast[]>([]);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadData();
  }, [competitionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const comp = await getCompetitionById(competitionId);
      const gymList = await getGymnastsByCompetition(competitionId);
      
      setCompetition(comp);
      setGymnasts(gymList);
      
      // Convert gymnasts to table rows with placeholder scoring data
      const rows: TableRow[] = gymList.map(g => ({
        id: g.id,
        numero: g.numero,
        gymnasta: g.gymnasta,
        evento: g.evento,
        noc: g.noc,
        bib: g.bib,
        j: 0, i: 0, h: 0, g: 0, f: 0, e: 0, d: 0, c: 0, b: 0, a: 0,
        dv: 0, eg: 0, sb: 0, nd: 0, cv: 0, sv: 0,
        eScore: 0, dScore: 0, eDelta: 0, delta: 0, percentage: 0,
        comments: ''
      }));
      
      setTableData(rows);
    } catch (error) {
      console.error('Error loading table data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleFinishPress = () => {
    setShowFinishModal(true);
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download logic
    console.log('Download PDF - To be implemented');
    setShowFinishModal(false);
  };

  const handleFinalize = () => {
    setShowFinishModal(false);
    router.push('/main-menu');
  };

  const handleRowPress = useCallback((row: TableRow) => {
    const pathname = row.evento === 'VT' ? '/gymnast-vault' : '/gymnast-floor';
    router.push({
      pathname,
      params: { 
        gymnastId: row.id.toString(), 
        competitionId: competitionId.toString() 
      }
    });
  }, [competitionId, router]);

  const renderHeaderCell = (text: string, width: number, isFirst?: boolean) => (
    <View style={[styles.headerCell, { width }, isFirst && styles.firstCell]}>
      <Text style={styles.headerText} numberOfLines={1}>{text}</Text>
    </View>
  );

  const renderDataCell = (value: string | number, width: number, isFirst?: boolean) => (
    <View style={[styles.dataCell, { width }, isFirst && styles.firstCell]}>
      <Text style={styles.dataText} numberOfLines={1}>{value}</Text>
    </View>
  );

  const renderRow = useCallback(({ item }: { item: TableRow }) => (
    <TouchableOpacity 
      style={styles.row} 
      onPress={() => handleRowPress(item)}
      activeOpacity={0.7}
    >
      {renderDataCell(item.numero, 60, true)}
      {renderDataCell(item.gymnasta, 150)}
      {renderDataCell(item.evento, 60)}
      {renderDataCell(item.noc, 60)}
      {renderDataCell(item.bib, 60)}
      {renderDataCell(item.j, 50)}
      {renderDataCell(item.i, 50)}
      {renderDataCell(item.h, 50)}
      {renderDataCell(item.g, 50)}
      {renderDataCell(item.f, 50)}
      {renderDataCell(item.e, 50)}
      {renderDataCell(item.d, 50)}
      {renderDataCell(item.c, 50)}
      {renderDataCell(item.b, 50)}
      {renderDataCell(item.a, 50)}
      {renderDataCell(item.dv, 60)}
      {renderDataCell(item.eg, 50)}
      {renderDataCell(item.sb, 50)}
      {renderDataCell(item.nd, 50)}
      {renderDataCell(item.cv, 50)}
      {renderDataCell(item.sv, 60)}
      {renderDataCell(item.eScore.toFixed(2), 70)}
      {renderDataCell(item.dScore.toFixed(2), 70)}
      {renderDataCell(item.eDelta.toFixed(2), 70)}
      {renderDataCell(item.delta.toFixed(2), 70)}
      {renderDataCell(item.percentage.toFixed(1) + '%', 70)}
      {renderDataCell(item.comments || '-', 120)}
    </TouchableOpacity>
  ), [handleRowPress]);

  const keyExtractor = useCallback((item: TableRow) => item.id.toString(), []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#333" />
          <Text style={styles.loadingText}>Loading table...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Table */}
      <View style={styles.tableContainer}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={true}
          scrollEventThrottle={16}
        >
          <View style={styles.tableWrapper}>
            {/* Header Row */}
            <View style={styles.headerRow}>
              {renderHeaderCell('No.', 60, true)}
              {renderHeaderCell('Gymnast', 150)}
              {renderHeaderCell('Event', 60)}
              {renderHeaderCell('NOC', 60)}
              {renderHeaderCell('Bib', 60)}
              {renderHeaderCell('J', 50)}
              {renderHeaderCell('I', 50)}
              {renderHeaderCell('H', 50)}
              {renderHeaderCell('G', 50)}
              {renderHeaderCell('F', 50)}
              {renderHeaderCell('E', 50)}
              {renderHeaderCell('D', 50)}
              {renderHeaderCell('C', 50)}
              {renderHeaderCell('B', 50)}
              {renderHeaderCell('A', 50)}
              {renderHeaderCell('DV', 60)}
              {renderHeaderCell('EG', 50)}
              {renderHeaderCell('SB', 50)}
              {renderHeaderCell('ND', 50)}
              {renderHeaderCell('CV', 50)}
              {renderHeaderCell('SV', 60)}
              {renderHeaderCell('E Score', 70)}
              {renderHeaderCell('D Score', 70)}
              {renderHeaderCell('E Δ', 70)}
              {renderHeaderCell('Δ', 70)}
              {renderHeaderCell('%', 70)}
              {renderHeaderCell('Comments', 120)}
            </View>

            {/* Data Rows */}
            <ScrollView 
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
            >
              {tableData.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.row} 
                  onPress={() => handleRowPress(item)}
                  activeOpacity={0.7}
                >
                  {renderDataCell(item.numero, 60, true)}
                  {renderDataCell(item.gymnasta, 150)}
                  {renderDataCell(item.evento, 60)}
                  {renderDataCell(item.noc, 60)}
                  {renderDataCell(item.bib, 60)}
                  {renderDataCell(item.j, 50)}
                  {renderDataCell(item.i, 50)}
                  {renderDataCell(item.h, 50)}
                  {renderDataCell(item.g, 50)}
                  {renderDataCell(item.f, 50)}
                  {renderDataCell(item.e, 50)}
                  {renderDataCell(item.d, 50)}
                  {renderDataCell(item.c, 50)}
                  {renderDataCell(item.b, 50)}
                  {renderDataCell(item.a, 50)}
                  {renderDataCell(item.dv, 60)}
                  {renderDataCell(item.eg, 50)}
                  {renderDataCell(item.sb, 50)}
                  {renderDataCell(item.nd, 50)}
                  {renderDataCell(item.cv, 50)}
                  {renderDataCell(item.sv, 60)}
                  {renderDataCell(item.eScore.toFixed(2), 70)}
                  {renderDataCell(item.dScore.toFixed(2), 70)}
                  {renderDataCell(item.eDelta.toFixed(2), 70)}
                  {renderDataCell(item.delta.toFixed(2), 70)}
                  {renderDataCell(item.percentage.toFixed(1) + '%', 70)}
                  {renderDataCell(item.comments || '-', 120)}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleBack}>
          <Text style={styles.footerButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.footerButton, styles.finishButton]} onPress={handleFinishPress}>
          <Text style={styles.footerButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Finish Modal */}
      <Modal visible={showFinishModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finish Competition</Text>
            <Text style={styles.modalText}>What would you like to do?</Text>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleDownloadPDF}>
              <Text style={styles.modalButtonText}>Download PDF</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalButton, styles.finalizeButton]} onPress={handleFinalize}>
              <Text style={styles.modalButtonText}>Finalize & Exit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowFinishModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  tableContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tableWrapper: {
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  headerCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#555',
  },
  firstCell: {
    borderLeftWidth: 0,
  },
  headerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    minHeight: 50,
  },
  dataCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  dataText: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#333',
  },
  footerButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  finishButton: {
    backgroundColor: '#4CAF50',
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  footerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  finalizeButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MainTable;
