import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { getCompetitionById, Competition, getGymnastsByCompetition } from '../lib/database';
import { generateAndSharePDF } from '../lib/pdfGenerator';
import FolderExportModal from '../componentes/FolderExportModal';
import FolderImportModal from '../componentes/FolderImportModal';

const { width, height } = Dimensions.get("window");

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
  myscore: number;  // My Score
  eScore: number;  // Execution Score
  compd: number;  // Difficulty Score
  compe: number;  // Difficulty Score
  compsb: number;  // Difficulty Score
  compnd: number;  // Difficulty Score
  compscore: number;  // Difficulty Score
  eDelta: number;
  delta: number;
  percentage: number;
  comments: string;
}

const MainTable: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const competitionId = params.competitionId ? Number(params.competitionId) : 0;

  const TABLE_ROW_HEIGHT = 50;
  const TABLE_MIN_WIDTH = 1730;
  const DATA_CHUNK_SIZE = 60;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfModalLayoutReady, setPdfModalLayoutReady] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Cancela cargas previas si el usuario navega rápido
  const loadSeqRef = useRef(0);

  // PDF generation control (UX + safe cancellation)
  const pdfCancelledRef = useRef(false);
  const pdfProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pdfCancelEnableIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pdfStartedAtRef = useRef<number>(0);
  const [allowPdfCancel, setAllowPdfCancel] = useState(false);

  const navigateToCompetitionFolder = useCallback(() => {
    const folderId = competition?.folder_id;
    if (folderId != null && String(folderId).length > 0) {
      router.push({ pathname: '/folder/[id]', params: { id: String(folderId) } });
      return;
    }
    // Fallback (should be rare): if we don't know the folder, go to main menu.
    router.push('/main-menu');
  }, [competition?.folder_id, router]);

  useEffect(() => {
    // Enable cancel button if PDF generation seems stuck (e.g., at 90%).
    if (!generatingPDF) {
      if (pdfCancelEnableIntervalRef.current) {
        clearInterval(pdfCancelEnableIntervalRef.current);
        pdfCancelEnableIntervalRef.current = null;
      }
      setAllowPdfCancel(false);
      return;
    }

    pdfStartedAtRef.current = Date.now();
    setAllowPdfCancel(false);
    pdfCancelEnableIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - pdfStartedAtRef.current;
      // Typical hang scenario is progress capped at 90%; allow cancel after 12s there.
      if (pdfProgress >= 90 && elapsedMs >= 12_000) {
        setAllowPdfCancel(true);
      }
      // Also allow cancel after a hard timeout even if progress is lower.
      if (elapsedMs >= 30_000) {
        setAllowPdfCancel(true);
      }
    }, 1_000);

    return () => {
      if (pdfCancelEnableIntervalRef.current) {
        clearInterval(pdfCancelEnableIntervalRef.current);
        pdfCancelEnableIntervalRef.current = null;
      }
    };
  }, [generatingPDF, pdfProgress]);

  useEffect(() => {
    loadData();
  }, [competitionId]);

  useEffect(() => {
    if (!generatingPDF) {
      setPdfModalLayoutReady(false);
      return;
    }

    setPdfModalLayoutReady(false);
    // Let the modal mount + layout before showing the percentage text to avoid initial misalignment.
    const raf = requestAnimationFrame(() => {
      setTimeout(() => setPdfModalLayoutReady(true), 60);
    });

    return () => cancelAnimationFrame(raf);
  }, [generatingPDF]);

  const yieldToUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  const loadData = async () => {
    const seq = ++loadSeqRef.current;
    try {
      setLoading(true);
      setTableData([]);
      const comp = await getCompetitionById(competitionId);
      const gymList = await getGymnastsByCompetition(competitionId);

      if (seq !== loadSeqRef.current) return;
      
      setCompetition(comp);
      
      // Convert gymnasts to table rows in chunks (avoid blocking UI / reduce crash risk)
      const rows: TableRow[] = [];
      for (let i = 0; i < gymList.length; i += DATA_CHUNK_SIZE) {
        if (seq !== loadSeqRef.current) return;

        const slice = gymList.slice(i, i + DATA_CHUNK_SIZE);
        for (const g of slice) {
          rows.push({
            id: g.id,
            numero: g.numero,
            gymnasta: g.gymnasta || '',
            evento: g.evento || '',
            noc: g.noc || '',
            bib: g.bib || '',
            j: g.j || 0,
            i: g.i || 0,
            h: g.h || 0,
            g: g.g || 0,
            f: g.f || 0,
            e: g.e || 0,
            d: g.d || 0,
            c: g.c || 0,
            b: g.b || 0,
            a: g.a || 0,
            // IMPORTANT: do not recalculate values here; use persisted DB fields.
            dv: g.difficulty_values || 0,
            eg: g.element_group_total || 0,
            sb: g.bonus || 0,
            nd: g.nd || 0,
            cv: g.cv || 0,
            sv: g.sv || 0,
            eScore: g.escore || 0,
            compd: g.competition_d || 0,
            myscore: g.myscore || 0,
            eDelta: g.dedded || 0,
            delta: g.delta || 0,
            percentage: g.percentage || 0,
            comments: g.comments || '',
            compe: g.competition_e || 0,
            compsb: g.competition_sb || 0,
            compnd: g.competition_nd || 0,
            compscore: g.competition_score || 0,

          });
        }

        // Yield to event loop so spinner stays responsive
        await yieldToUI();
      }

      if (seq !== loadSeqRef.current) return;
      
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

  const handleDownloadPDF = async () => {
    if (generatingPDF) return;
    
    try {
      setShowFinishModal(false);
      setGeneratingPDF(true);
      setPdfProgress(0);
      pdfCancelledRef.current = false;
      setAllowPdfCancel(false);
      
      // Simular progreso durante la generación
      if (pdfProgressIntervalRef.current) {
        clearInterval(pdfProgressIntervalRef.current);
        pdfProgressIntervalRef.current = null;
      }

      pdfProgressIntervalRef.current = setInterval(() => {
        setPdfProgress(prev => {
          if (prev >= 90) {
            return 90; // Mantener en 90% hasta que termine
          }
          return prev + 10;
        });
      }, 200);

      // Generar y compartir el PDF
      await generateAndSharePDF(competitionId, tableData);

      // If user cancelled waiting, ignore late completion.
      if (pdfCancelledRef.current) {
        return;
      }
      
      // Detener el intervalo y completar al 100%
      if (pdfProgressIntervalRef.current) {
        clearInterval(pdfProgressIntervalRef.current);
        pdfProgressIntervalRef.current = null;
      }
      setPdfProgress(100);
      
      // Esperar un momento para mostrar el 100%
      setTimeout(() => {
        if (pdfCancelledRef.current) return;
        setGeneratingPDF(false);
        setPdfProgress(0);
        
        Alert.alert(
          'Success',
          'The PDF was shared successfully.',
          [
            { 
              text: 'OK',
              onPress: navigateToCompetitionFolder
            }
          ]
        );
      }, 500);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      
      // Detener el intervalo en caso de error
      if (pdfProgressIntervalRef.current) {
        clearInterval(pdfProgressIntervalRef.current);
        pdfProgressIntervalRef.current = null;
      }
      setGeneratingPDF(false);
      setPdfProgress(0);
      
      // Verificar si el usuario canceló el share
      const errorMessage = error?.message || '';
      const isCancelled = errorMessage.includes('cancel') || errorMessage.includes('dismiss');

      // If user cancelled waiting, ignore.
      if (pdfCancelledRef.current) {
        return;
      }
      
      if (!isCancelled) {
        Alert.alert(
          'Error',
          `Could not ${errorMessage.includes('Timeout') ? 'share' : 'generate'} the PDF. Please try again.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: handleDownloadPDF }
          ]
        );
      } else {
        // Usuario canceló, volver al folder de la competencia sin mostrar error
        navigateToCompetitionFolder();
      }
    }
  };

  const handleCancelPdfWait = useCallback(() => {
    pdfCancelledRef.current = true;
    if (pdfProgressIntervalRef.current) {
      clearInterval(pdfProgressIntervalRef.current);
      pdfProgressIntervalRef.current = null;
    }
    setGeneratingPDF(false);
    setPdfProgress(0);
    setAllowPdfCancel(false);

    Alert.alert(
      'PDF Generation',
      'This is taking longer than expected. You can retry or exit.',
      [
        { text: 'Exit', style: 'cancel', onPress: navigateToCompetitionFolder },
        { text: 'Retry', onPress: handleDownloadPDF },
      ]
    );
  }, [handleDownloadPDF, navigateToCompetitionFolder]);

  const handleFinalize = () => {
    setShowFinishModal(false);
    router.push('/main-menu');
  };

  const handleMenuAction = (action: string) => {
    setMenuVisible(false);
    
    switch (action) {
      case 'export':
        setExportModalVisible(true);
        break;
      case 'import':
        setImportModalVisible(true);
        break;
      default:
        break;
    }
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

  // Component for cells with validation colors
  const DataCell: React.FC<{
    value: string | number;
    width: number;
    isFirst?: boolean;
    columnType?: string;
    compareValue?: number;
  }> = ({ value, width, isFirst, columnType, compareValue }) => {
    let cellStyle = styles.dataCell;
    let styleProps: any = { width };

    if (
      columnType === 'j' ||
      columnType === 'i' ||
      columnType === 'h' ||
      columnType === 'g' ||
      columnType === 'f' ||
      columnType === 'e' ||
      columnType === 'd' ||
      columnType === 'c' ||
      columnType === 'b' ||
      columnType === 'a'
    ) {
      const numValue =
        typeof value === 'number'
          ? value
          : parseFloat(value.toString().replace('%', ''));
      if (Number.isFinite(numValue) && numValue > 0) {
        styleProps.backgroundColor = '#d1f2eb';
      }
      return (
        <View style={[cellStyle, styleProps, isFirst && styles.firstCell]}>
          <Text style={styles.dataText} numberOfLines={1}>{value}</Text>
        </View>
      );
    }

    if (columnType === 'percentage') {
      const stringValue = value.toString().replace('%', '');
      const numValue = parseFloat(stringValue);
      if (!isNaN(numValue)) {
        if (numValue >= 90) {
          styleProps.backgroundColor = '#d1f2eb';
        } else if (numValue >= 70) {
          styleProps.backgroundColor = '#fff3cd';
        } else {
          styleProps.backgroundColor = '#f8d7da';
        }
      }
      return (
        <View style={[cellStyle, styleProps, isFirst && styles.firstCell]}>
          <Text style={styles.dataText} numberOfLines={1}>{value}</Text>
        </View>
      );
    }

    if (columnType === 'sv') {
      // Validación: verde si SV === D Score, rojo si no
      const numValue =
        typeof value === 'number' ? value : parseFloat(value.toString().replace('%', ''));
      if (Number.isFinite(numValue) && typeof compareValue === 'number' && Number.isFinite(compareValue)) {
        // Como mostramos 2 decimales, toleramos diferencias por redondeo
        if (Math.abs(numValue - compareValue) < 0.01) {
          styleProps.backgroundColor = '#d1f2eb'; // verde
        } else {
          styleProps.backgroundColor = '#f8d7da'; // rojo
        }
      }
      return (
        <View style={[cellStyle, styleProps, isFirst && styles.firstCell]}>
          <Text style={styles.dataText} numberOfLines={1}>{value}</Text>
        </View>
      );
    }

    return (
      <View style={[cellStyle, styleProps, isFirst && styles.firstCell]}>
        <Text style={styles.dataText} numberOfLines={1}>{value}</Text>
      </View>
    );
  };

  const renderDataCell = (
    value: string | number,
    width: number,
    isFirst?: boolean,
    columnType?: string,
    compareValue?: number
  ) => {
    return (
      <DataCell
        value={value}
        width={width}
        isFirst={isFirst}
        columnType={columnType}
        compareValue={compareValue}
      />
    );
  };

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
      {renderDataCell(item.j === 0 ? '-' : item.j.toFixed(0), 50, false, 'j')}
      {renderDataCell(item.i === 0 ? '-' : item.i.toFixed(0), 50, false, 'i')}
      {renderDataCell(item.h === 0 ? '-' : item.h.toFixed(0), 50, false, 'h')}
      {renderDataCell(item.g === 0 ? '-' : item.g.toFixed(0), 50, false, 'g')}
      {renderDataCell(item.f === 0 ? '-' : item.f.toFixed(0), 50, false, 'f')}
      {renderDataCell(item.e === 0 ? '-' : item.e.toFixed(0), 50, false, 'e')}
      {renderDataCell(item.d === 0 ? '-' : item.d.toFixed(0), 50, false, 'd')}
      {renderDataCell(item.c === 0 ? '-' : item.c.toFixed(0), 50, false, 'c')}
      {renderDataCell(item.b === 0 ? '-' : item.b.toFixed(0), 50, false, 'b')}
      {renderDataCell(item.a === 0 ? '-' : item.a.toFixed(0), 50, false, 'a')}
      {renderDataCell(item.dv.toFixed(2), 60, false, 'dv')}
      {renderDataCell(item.eg.toFixed(2), 50)}
      {renderDataCell(item.sb.toFixed(2), 50)}
      {renderDataCell(item.nd.toFixed(2), 50)}
      {renderDataCell(item.cv.toFixed(2), 50)}
      {renderDataCell(item.sv.toFixed(2), 60, false, 'sv', item.compd)}
      {renderDataCell(item.eScore.toFixed(3), 70)}
      {renderDataCell(item.compd.toFixed(2), 70)}
      {renderDataCell(item.compe.toFixed(3), 70)}
      {renderDataCell(item.delta.toFixed(1), 70, false, 'delta')}
      {renderDataCell(item.percentage.toFixed(1) + '%', 70, false, 'percentage')}
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
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={[styles.tableWrapper, { minWidth: TABLE_MIN_WIDTH, flex: 1 }]}>
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
              {renderHeaderCell(competition?.gender ? 'SB' : 'DMT', 50)}
              {renderHeaderCell('ND', 50)}
              {renderHeaderCell('CV', 50)}
              {renderHeaderCell('SV', 60)}
              {renderHeaderCell('E Score', 70)}
              {renderHeaderCell('D Score', 70)}
              {renderHeaderCell('Comp E', 70)}
              {renderHeaderCell('Δ', 70)}
              {renderHeaderCell('%', 70)}
              {renderHeaderCell('Comments', 120)}
            </View>

            {/* Data Rows (virtualized) */}
            <FlatList
              data={tableData}
              renderItem={renderRow as any}
              keyExtractor={keyExtractor}
              style={{ flex: 1 }}
              contentContainerStyle={{ minWidth: TABLE_MIN_WIDTH }}
              showsVerticalScrollIndicator
              removeClippedSubviews
              initialNumToRender={12}
              maxToRenderPerBatch={18}
              updateCellsBatchingPeriod={60}
              windowSize={7}
              getItemLayout={(_, index) => ({ length: TABLE_ROW_HEIGHT, offset: TABLE_ROW_HEIGHT * index, index })}
            />
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

      {/* PDF Generation Progress Modal */}
      <Modal visible={generatingPDF} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} onLayout={() => setPdfModalLayoutReady(true)}>
            <Text style={styles.modalTitle}>Generating PDF</Text>
            <Text style={styles.modalText}>Please wait...</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${pdfProgress}%` }]} />
            </View>
            
            <Text style={[styles.progressText, !pdfModalLayoutReady && styles.progressTextHidden]}>
              {pdfModalLayoutReady ? `${pdfProgress}%` : '0%'}
            </Text>

            {allowPdfCancel ? (
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelPdfWait}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View 
            style={styles.menuModalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Options</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => handleMenuAction('import')}
            >
              <Text style={styles.menuButtonIcon}>📥</Text>
              <Text style={styles.modalButtonText}>Import</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => handleMenuAction('export')}
            >
              <Text style={styles.menuButtonIcon}>📤</Text>
              <Text style={styles.modalButtonText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Folder Export Modal */}
      <FolderExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />

      {/* Folder Import Modal */}
      <FolderImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        currentFolderId={competition?.folder_id || null}
        onImportComplete={() => {
          setImportModalVisible(false);
          loadData();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerIcon: {
    fontSize: 28,
    color: '#004aad',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    minWidth: 64,
    textAlign: 'center',
  },
  progressTextHidden: {
    opacity: 0,
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
    backgroundColor: '#fff',
  },
  dataText: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  cellGreen: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    backgroundColor: '#d1f2eb',
  },
  cellYellow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    backgroundColor: '#fff3cd',
  },
  cellRed: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    backgroundColor: '#f8d7da',
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
    gap: 12,
  },
  footerButton: {
    backgroundColor: '#333',
    flex: 1,
    paddingVertical: 16,
    minHeight: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButton: {
    backgroundColor: '#004aad',
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
  menuModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: width * 0.75,
    maxWidth: 350,
  },
  menuButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
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
    backgroundColor: '#004aad',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  finalizeButton: {
    backgroundColor: '#006607ff',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#3a3a3aff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#004aad',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#004aad',
    textAlign: 'center',
  },
});

export default MainTable;
