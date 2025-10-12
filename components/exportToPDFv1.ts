import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { PDFDocument } from 'pdf-lib';
import { Buffer } from 'buffer';
import { Dimensions, Platform, Image } from "react-native";
// Integración de fotos del whiteboard
import { getPhotoItemsForMainTable, getMainTableById, getMainTablePaths } from '../Database/database';


const { width, height } = Dimensions.get("window");

// Variables para determinar el tamaño del dispositivo (como en el original)
var isLargeDevice = false;
var isMediumLargeDevice = false;
var isSmallDevice = false;
var isTinyDevice = false;

if (width >= 1368) {
  isLargeDevice = true;
} else if (width >= 1200 && width < 1368) {
  isMediumLargeDevice = true;
} else if (width >= 945 && width < 1200) {
  isSmallDevice = true;
} else if (width < 945) {
  isTinyDevice = true;
}

// Interface for main floor data
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

interface MainTableWithRateGeneral extends MainTable {
  rateGeneral?: MainRateGeneral;
}

// Interface for final table data
interface FinalTableData {
  competition: {
    title: string;
    event: string;
    discipline: string;
    date: string;
    totalParticipants: number;
    competenceId: number;
  };
  participants: Array<{
    position: number;
    number: number;
    name: string;
    noc: string;
    event: string;
    bib: string;
    elements: {
      j: number; i: number; h: number; g: number; f: number;
      e: number; d: number; c: number; b: number; a: number;
    };
    scores: {
      difficultyValues: number;
      elementGroups: number;
      stickBonus: number;
      neutralDeductions: number;
      connectionValue: number;
      startValue: number;
      executionScore: number;
      dScore: number;
      eScore: number;
      finalScore: number;
      myScorefinal: number;
    };
    details: {
      delta: number;
      percentage: number;
      comments: string;
    };
  }>;
}

// Function to get Jump image as base64
// Fallback base64 para imagen de salto (puedes usar una imagen pequeña o un SVG simple)
const JUMP_IMAGE_FALLBACK =
  'data:image/svg+xml;base64,' +
  btoa('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="#888">No Jump Img</text></svg>');

// (Android usa un hook en componentes para obtener esta imagen)


// iOS: lógica mejorada para obtener base64 de la imagen de salto incluso en fallback Expo
const getJumpImageBase64 = async (): Promise<string> => {
  if (Platform.OS !== 'ios') throw new Error('getJumpImageBase64 solo iOS');

  let isFallback = false;
  try {
    const { isIOSUsingFallback } = require('../utils/platformFS');
    isFallback = !!isIOSUsingFallback;
  } catch {}

  // Candidatos en orden
  const candidateRequires = [
    () => require('../assets/images/Jump1.png'),
    () => require('../assets/images/Jump2.webp'),
    () => require('../assets/images/Jump3.jpg'),
    () => require('../assets/images/Jump4.jpeg'),
  ];

  let asset: any = null;
  for (const fn of candidateRequires) {
    try { asset = Asset.fromModule(fn()); break; } catch { asset = null; }
  }
  if (!asset) return JUMP_IMAGE_FALLBACK;

  try { await asset.downloadAsync(); } catch {}

  // Preferir asset.uri (normalmente http://<packager>/...) en fallback porque fetch a file:// puede fallar
  const primaryUri = (!isFallback && asset.localUri) ? asset.localUri : asset.uri || asset.localUri;
  if (!primaryUri) return JUMP_IMAGE_FALLBACK;

  const guessMime = (u: string) => {
    if (/\.jpe?g$/i.test(u)) return 'image/jpeg';
    if (/\.webp$/i.test(u)) return 'image/webp';
    return 'image/png';
  };
  const mime = guessMime(primaryUri);

  // 1. Intentar fetch -> base64
  try {
    const res = await fetch(primaryUri);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      if (base64 && base64.length > 100) {
        return `data:${mime};base64,${base64}`;
      }
    }
  } catch (e) {
    console.warn('[JumpImage] fetch fallo', e);
  }

  // 2. Intentar RNFS si disponible
  if (!isFallback) {
    try {
      const { PFS } = require('../utils/platformFS');
      const base64 = await PFS.readFileBase64(primaryUri);
      if (base64 && base64.length > 100) return `data:${mime};base64,${base64}`;
    } catch (e) {
      console.warn('[JumpImage] RNFS fallo', e);
    }
  }

  // 3. Como último recurso (especialmente en Expo Go fallback) devolver la URI directa.
  // El <image href="..."> dentro del SVG puede aceptar una URI http.
  if (/^https?:/.test(primaryUri)) {
    return primaryUri; // permitir que WebKit la resuelva en print
  }

  return JUMP_IMAGE_FALLBACK;
};






// FINAL TABLE PDF GENERATION
export const generateFinalTablePDF = async (data: FinalTableData) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.2;
          color: #333;
          background: #f0f4f8;
          padding: 15px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #0052b4, #004aad);
          color: white;
          padding: 20px;
          border-radius: 8px;
        }
        
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        .competition-info {
          background: #e8f4ff;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-left: 4px solid #0052b4;
        }
        
        .competition-info h2 {
          color: #0052b4;
          margin-bottom: 10px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        
        .info-item {
          background: white;
          padding: 8px;
          border-radius: 4px;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .info-label {
          font-weight: bold;
          color: #0052b4;
          font-size: 10px;
        }
        
        .info-value {
          font-size: 12px;
          margin-top: 2px;
        }
        
        .table-container {
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .results-table th {
          padding: 8px 4px;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          color: white;
          border-right: 1px solid #ddd;
          height: 40px;
        }
        
        /* Header colors - exact match */
        .header-gray {
          background: #A2A2A2;
        }
        
        .header-blue {
          background: #0052b4;
        }
        
        .header-gold {
          background: #F5D76E;
          color: #333 !important;
        }
        
        /* First header cell with rounded corner */
        .header-first {
          border-top-left-radius: 15px;
        }
        
        /* Last header cell with rounded corner */
        .header-last {
          border-top-right-radius: 15px;
        }
        
        .results-table td {
          padding: 6px 4px;
          text-align: center;
          border-right: 1px solid #ddd;
          border-bottom: 1px solid #ddd;
          font-size: 10px;
          background: white;
          height: 40px;
          vertical-align: middle;
        }
        
        /* Position column styling */
        .position-cell {
          background: white !important;
          font-weight: bold;
          color: #333;
        }
        
        /* Gymnast name column */
        .name-cell {
          text-align: left !important;
          padding-left: 10px !important;
          font-weight: bold;
          max-width: 200px;
        }
        
        /* Percentage column - pink background */
        .percentage-cell {
          background: #FFC0C7 !important;
          font-weight: bold;
        }
        
        /* Score cells styling */
        .score-cell {
          font-weight: bold;
          color: #333;
        }
        
        /* Comments column styling */
        .comments-cell {
          text-align: justify !important;
          padding: 4px 6px !important;
          font-size: 9px;
          line-height: 1.1;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* Last row corners */
        .bottom-left {
          border-bottom-left-radius: 15px;
        }
        
        .bottom-right {
          border-bottom-right-radius: 15px;
        }
        
        .statistics-section {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        
        .stat-box {
          text-align: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        .stat-number {
          font-size: 20px;
          font-weight: bold;
          color: #0052b4;
        }
        
        .stat-label {
          font-size: 10px;
          color: #666;
          margin-top: 2px;
        }
        
        .comments-section {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .comments-section h3 {
          color: #0052b4;
          margin-bottom: 15px;
          border-bottom: 2px solid #0052b4;
          padding-bottom: 5px;
        }
        
        .comment-item {
          margin-bottom: 10px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 4px solid #0052b4;
        }
        
        .comment-gymnast {
          font-weight: bold;
          color: #0052b4;
          margin-bottom: 5px;
        }
        
        .comment-text {
          color: #555;
          font-size: 11px;
          text-align: justify;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        
        @media print {
          body { padding: 10px; }
          .header h1 { font-size: 24px; }
          .results-table { font-size: 9px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏅 ${data.competition.title}</h1>
        <p>${data.competition.discipline}</p>
      </div>
      
      <div class="competition-info">
        <h2>Competition Details</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">DATE</div>
            <div class="info-value">${data.competition.date}</div>
          </div>
          <div class="info-item">
            <div class="info-label">PARTICIPANTS</div>
            <div class="info-value">${data.competition.totalParticipants}</div>
          </div>
        </div>
      </div>

      <!-- Results Table - Exact replica -->
      <div class="table-container">
        <table class="results-table">
          <thead>
            <tr>
              <th class="header-gray header-first">No.</th>
              <th class="header-blue">GYMNAST</th>
              <th class="header-blue">EVENT</th>
              <th class="header-blue">NOC</th>
              <th class="header-blue">BIB</th>
              <th class="header-gray">J</th>
              <th class="header-gray">I</th>
              <th class="header-gray">H</th>
              <th class="header-gray">G</th>
              <th class="header-gray">F</th>
              <th class="header-gray">E</th>
              <th class="header-gray">D</th>
              <th class="header-gray">C</th>
              <th class="header-gray">B</th>
              <th class="header-gray">A</th>
              <th class="header-blue">DV</th>
              <th class="header-blue">EG</th>
              <th class="header-blue">SB</th>
              <th class="header-blue">ND</th>
              <th class="header-blue">CV</th>
              <th class="header-blue">SV</th>
              <th class="header-blue">E</th>
              <th class="header-gold">D</th>
              <th class="header-gold">E</th>
              <th class="header-gold">DELT</th>
              <th class="header-gold">%</th>
              <th class="header-blue header-last">Comments</th>
            </tr>
          </thead>
          <tbody>
            ${data.participants.map((participant, index) => {
              const isLastRow = index === data.participants.length - 1;
              const truncateComment = (text: string) => {
                if (!text || text.trim() === '') return '';
                
                // Split text into chunks of 12 characters
                const chunks = [];
                for (let i = 0; i < text.length; i += 12) {
                  chunks.push(text.substring(i, i + 12));
                }
                
                // Limit to maximum 3 lines
                if (chunks.length <= 3) {
                  // If 3 lines or less, show all lines
                  return chunks.join('<br>');
                } else {
                  // If more than 3 lines, show first 2 lines + truncated 3rd line with ...
                  const firstTwoLines = chunks.slice(0, 2);
                  const thirdLineText = chunks[2];
                  
                  // Cut the third line to make room for "..." (9 characters + "...")
                  const truncatedThirdLine = thirdLineText.substring(0, 9) + '...';
                  
                  return [...firstTwoLines, truncatedThirdLine].join('<br>');
                }
              };
              
              return `
                <tr>
                  <td class="position-cell ${isLastRow ? 'bottom-left' : ''}">${participant.position}</td>
                  <td class="name-cell">${participant.name}</td>
                  <td>${participant.event}</td>
                  <td>${participant.noc}</td>
                  <td>${participant.bib}</td>
                  <td>${participant.elements.j}</td>
                  <td>${participant.elements.i}</td>
                  <td>${participant.elements.h}</td>
                  <td>${participant.elements.g}</td>
                  <td>${participant.elements.f}</td>
                  <td>${participant.elements.e}</td>
                  <td>${participant.elements.d}</td>
                  <td>${participant.elements.c}</td>
                  <td>${participant.elements.b}</td>
                  <td>${participant.elements.a}</td>
                  <td>${participant.scores.difficultyValues.toFixed(1)}</td>
                  <td>${participant.scores.elementGroups.toFixed(1)}</td>
                  <td>${participant.scores.stickBonus.toFixed(1)}</td>
                  <td>${participant.scores.neutralDeductions.toFixed(1)}</td>
                  <td>${participant.scores.connectionValue.toFixed(1)}</td>
                  <td>${participant.scores.startValue.toFixed(1)}</td>
                  <td>${participant.scores.executionScore.toFixed(3)}</td>
                  <td class="score-cell">${participant.scores.dScore.toFixed(3)}</td>
                  <td class="score-cell">${participant.scores.eScore.toFixed(3)}</td>
                  <td class="score-cell">${participant.details.delta.toFixed(3)}</td>
                  <td class="percentage-cell">${participant.details.percentage}%</td>
                  <td class="comments-cell ${isLastRow ? 'bottom-right' : ''}" title="${participant.details.comments || ''}">${truncateComment(participant.details.comments)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Statistics Section -->
      <div class="statistics-section">
        <h3 style="color: #0052b4; margin-bottom: 15px;">📊 Competition Statistics</h3>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-number">${data.participants.length}</div>
            <div class="stat-label">Total Participants</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${Math.max(...data.participants.map(p => p.scores.myScorefinal)).toFixed(3)}</div>
            <div class="stat-label">Highest Score</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${(data.participants.reduce((sum, p) => sum + p.scores.myScorefinal, 0) / data.participants.length).toFixed(3)}</div>
            <div class="stat-label">Average Score</div>
          </div>
        </div>
      </div>

      ${(() => {
        // Check if any participant has comments
        const participantsWithComments = data.participants.filter(p => p.details.comments && p.details.comments.trim() !== '');
        
        if (participantsWithComments.length > 0) {
          return `
            <!-- Comments Section - Only show if there are comments -->
            <div class="comments-section">
              <h3>💬 Judge Comments</h3>
              ${participantsWithComments.map(participant => `
                <div class="comment-item">
                  <div class="comment-gymnast">${participant.name} (${participant.noc})</div>
                  <div class="comment-text">${participant.details.comments}</div>
                </div>
              `).join('')}
            </div>
          `;
        }
        return '';
      })()}
      
      <div class="footer">
        <p><strong>Generated by GymJudge</strong> on ${new Date().toLocaleString()}</p>
        <p>© 2025 GymJudge. All rights reserved. | Competition Report</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false 
    });
    
    await shareAsync(uri, { 
      UTI: '.pdf', 
      mimeType: 'application/pdf' 
    });
    
    return uri;
  } catch (error) {
    console.error('Error generating final table PDF:', error);
    throw error;
  }
};


// EXPORT FUNCTIONS
// Nota: función de compartir PDF individual por aparato fue eliminada porque
// referenciaba generateMainFloorPDF, que no existe en este archivo.


// Add this function after the existing functions and before the EXPORT FUNCTIONS section:

// Replace the existing generateComprehensivePDF function with this corrected version:

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




export const generateComprehensivePDF = async (
  individualData: MainTableWithRateGeneral[], 
  finalTableData: FinalTableData,
  competence: Competence,
  jumpImageBase64: string | null,
  progressCb?: (msg: string, progress: number) => void,
  control?: { cancelled?: boolean; abort?: () => void }
) => {
  console.log('[PDF] Inicio generateComprehensivePDF');
  progressCb?.('Inicializando…', 0);
  if (control) {
    control.cancelled = false;
    control.abort = () => { control.cancelled = true; };
  }
  
  if (!individualData || !Array.isArray(individualData) || individualData.length === 0) {
    throw new Error('No individual data provided for PDF generation');
  }

  // Obtener la imagen base64 de salto según plataforma
  if (Platform.OS === 'ios') {
    jumpImageBase64 = await getJumpImageBase64();
  }

  const checkCancel = () => {
    if (control?.cancelled) {
      console.warn('[PDF] Cancelado por el usuario');
      throw new Error('PDF cancelado');
    }
  };
  checkCancel();

  const isFileRef = (value?: string | null): boolean => {
    if (!value) return false;
    return value.startsWith('file://') || value.startsWith('content://');
  };

  // Resolve externalized whiteboard paths if needed
  const resolvedData: MainTableWithRateGeneral[] = await Promise.all(
    individualData.map(async (g) => {
      console.log('🔍 Resolving paths for gymnast:', g.name);
      console.log('🔍 Original g.paths:', g.paths ? (g.paths.substring(0, 100) + '...') : 'EMPTY');
      console.log('🔍 Original g.paths length:', g.paths?.length || 0);
      
      let pathsVal = g.paths || '';
      if (isFileRef(pathsVal)) {
        console.log('🔍 Paths is a file reference:', pathsVal);
        
        // ✅ INTENTA LEER EL ARCHIVO PRIMERO (incluso en iOS)
        let fileReadSuccess = false;
        try {
          console.log('🔍 Attempting to read paths file...');
          
          // Intenta con la función de database que maneja la lógica correctamente
          const mainTable = await getMainTableById(g.id);
          if (mainTable) {
            const pathsFromDb = await getMainTablePaths(mainTable.id);
            if (pathsFromDb && pathsFromDb !== '[]') {
              pathsVal = pathsFromDb;
              fileReadSuccess = true;
              console.log('🔍 ✅ Paths read via getMainTablePaths, length:', pathsVal.length);
              console.log('🔍 Paths content preview:', pathsVal.substring(0, 200) + '...');
            }
          }
        } catch (dbError) {
          console.warn('🔍 getMainTablePaths failed, trying FileSystem...', dbError);
        }
        
        // Si getMainTablePaths falló, intentar FileSystem directo
        if (!fileReadSuccess) {
          try {
            pathsVal = await (FileSystem as any).readAsStringAsync(pathsVal);
            fileReadSuccess = true;
            console.log('🔍 ✅ Paths read via FileSystem, length:', pathsVal.length);
            console.log('🔍 Paths content preview:', pathsVal.substring(0, 200) + '...');
          } catch (fsError) {
            console.warn('🔍 FileSystem read failed:', fsError);
          }
        }
        
        // Si ambos fallaron, usar array vacío
        if (!fileReadSuccess) {
          console.warn('🔍 ⚠️ All methods failed - using empty paths');
          pathsVal = '[]';
        }
      } else {
        console.log('🔍 Paths is NOT a file reference - using direct value');
      }
      
      console.log('🔍 Final pathsVal for', g.name, ':', pathsVal ? (pathsVal.substring(0, 100) + '...') : 'EMPTY');
      console.log('🔍 Final pathsVal length:', pathsVal?.length || 0);
      
      return { ...g, paths: pathsVal } as MainTableWithRateGeneral;
    })
  );

  // ------------------------------------------------------------------
  // CARGA Y CODIFICACIÓN DE FOTOS (re-aplicando integración previa)
  // ------------------------------------------------------------------
  progressCb?.('Cargando fotos…', 0.07);
  interface EncodedPhotoItem {
    uri: string;
    dataUrl: string;
    x: number; // posición topleft igual a whiteboard (después de aplicar límite de tamaño base)
    y: number;
    scale: number; // mismo scale guardado
    rotation: number; // grados
    baseWidth: number;  // bw tras clamps whiteboard (ANTES scale)
    baseHeight: number; // bh tras clamps whiteboard (ANTES scale)
  }

  const gymnastPhotosMap: Record<number, EncodedPhotoItem[]> = {};

  const inferMimeFromExt = (u: string): string => {
    if (/\.jpe?g$/i.test(u)) return 'image/jpeg';
    if (/\.png$/i.test(u)) return 'image/png';
    if (/\.webp$/i.test(u)) return 'image/webp';
    return 'image/png';
  };

  // Obtiene dimensiones reales de la imagen (promesa)
  const getImageSize = (uri: string): Promise<{ width: number; height: number; }> => new Promise(resolve => {
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), () => resolve({ width: DEFAULT_EXPORT_PHOTO_WIDTH, height: DEFAULT_EXPORT_PHOTO_HEIGHT }));
  });

  const __photoCache: Record<string, string> = {};
  const encodePhotoUri = async (uri: string): Promise<string> => {
    if (!uri) return '';
    if (uri.startsWith('data:image')) return uri;
    if (__photoCache[uri]) return __photoCache[uri];
    const mime = inferMimeFromExt(uri);
    const build = (b64: string) => `data:${mime};base64,${b64}`;
    const placeholder = (light = false) => 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="${light ? '#ddd' : '#ccc'}"/><text x="50%" y="50%" font-size="8" text-anchor="middle" dominant-baseline="middle">IMG</text></svg>`);
    const tryFetch = async () => {
      try {
        const res = await fetch(uri);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        if (base64 && base64.length > 40) return build(base64);
      } catch {}
      return null;
    };
    if (Platform.OS === 'ios') {
      let isFallback = false;
      try { const { isIOSUsingFallback } = require('../utils/platformFS'); if (isIOSUsingFallback) isFallback = true; } catch {}
      // Siempre intentar fetch primero (funciona para assets y fotos seleccionadas en Expo Go)
      const fetched = await tryFetch();
      if (fetched) { __photoCache[uri] = fetched; return fetched; }
      if (!isFallback) {
        // Intentar RNFS wrapper solo si no es fallback
        try {
          const { PFS } = require('../utils/platformFS');
          const b64 = await PFS.readFileBase64(uri);
          if (b64 && b64.length > 40) { const d = build(b64); __photoCache[uri] = d; return d; }
        } catch {}
      }
      const ph = placeholder(isFallback);
      __photoCache[uri] = ph;
      return ph;
    } else {
      const fetched = await tryFetch();
      if (fetched) { __photoCache[uri] = fetched; return fetched; }
      // Último recurso fuera iOS: FileSystem (no prohibido)
      try {
        const b64 = await (FileSystem as any).readAsStringAsync(uri, { encoding: 'base64' });
        if (b64 && b64.length > 40) { const d = build(b64); __photoCache[uri] = d; return d; }
      } catch {}
      const ph = placeholder();
      __photoCache[uri] = ph;
      return ph;
    }
  };

  // Tamaño base placeholder (TODO: capturar dimensiones reales y persistirlas)
  const DEFAULT_EXPORT_PHOTO_WIDTH = 200;
  const DEFAULT_EXPORT_PHOTO_HEIGHT = 200;
  const MAX_W = 400, MAX_H = 400, MIN_W = 90; // mismos límites que whiteboard

  await Promise.all(
    resolvedData.map(async (g, idx) => {
      checkCancel();
      try {
    const items = await getPhotoItemsForMainTable(g.id);
        if (!items || !items.length) return;
        const limited = items.slice(-4); // límite de fotos por PDF por gimnasta
        const encoded: EncodedPhotoItem[] = [];
        for (const it of limited) {
          const dataUrl = await encodePhotoUri(it.uri);
            // Dimensiones reales
            // Dimensiones reales originales
            const real = await getImageSize(it.uri);
            let bw = real.width || DEFAULT_EXPORT_PHOTO_WIDTH;
            let bh = real.height || DEFAULT_EXPORT_PHOTO_HEIGHT;
            // Reducción adicional de calidad visual: si el área supera 160k px, reducir a 70%
            const AREA_LIMIT = 160000; // ~400x400
            if ((bw * bh) > AREA_LIMIT) {
              bw *= 0.7;
              bh *= 0.7;
            }
            if (bw > MAX_W) { const f = MAX_W / bw; bw = MAX_W; bh *= f; }
            if (bh > MAX_H) { const f = MAX_H / bh; bh = MAX_H; bw *= f; }
            if (bw < MIN_W) { const f = MIN_W / bw; bw = MIN_W; bh *= f; }
            encoded.push({
              uri: it.uri,
              dataUrl,
              x: Number.isFinite(it.x) ? it.x : 40,
              y: Number.isFinite(it.y) ? it.y : 40,
              scale: Number.isFinite(it.scale) ? it.scale : 1,
              rotation: Number.isFinite(it.rotation) ? it.rotation : 0,
              baseWidth: bw,
              baseHeight: bh,
            });
        }
        gymnastPhotosMap[g.id] = encoded;
      } catch (e) {
        console.warn('No se pudieron cargar fotos para gimnasta', g.id, e);
      }
      if (idx % 5 === 0) {
        progressCb?.(`Fotos procesadas: ${idx + 1}/${resolvedData.length}`, 0.1 + (0.1 * (idx / resolvedData.length)));
      }
    })
  );

  // Function to render whiteboard paths (reuse from existing functions)
  const renderWhiteboardPaths = (pathsString: string, photos: EncodedPhotoItem[] = []) => {
    if (!pathsString) return '';
    
    try {
      const paths = JSON.parse(pathsString);
      if (!Array.isArray(paths)) return '';
      
      // Calculate bounding box of all paths
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      paths.forEach(pathData => {
        if (pathData.path) {
          const matches = pathData.path.match(/([ML])\s*([0-9.-]+)\s*([0-9.-]+)/g);
          if (matches) {
            matches.forEach((match: string) => {
              const coords = match.match(/([ML])\s*([0-9.-]+)\s*([0-9.-]+)/);
              if (coords) {
                const x = parseFloat(coords[2]);
                const y = parseFloat(coords[3]);
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              }
            });
          }
        }
      });
      
      // If we found valid coordinates, calculate centering transform
      let transformGroup = '';
      if (minX !== Infinity && minY !== Infinity && maxX !== -Infinity && maxY !== -Infinity) {
        const pathWidth = maxX - minX;
        const pathHeight = maxY - minY;
        
        // SVG viewBox dimensions
        const svgWidth = 1300;
        const svgHeight = 780;
        
        // Calculate centering offsets with additional right shift
        const centerX = svgWidth / 2;
        const centerY = svgHeight / 2;
        const pathCenterX = (minX + pathWidth / 2);
        const pathCenterY = (minY + pathHeight / 2);
        
        // Ajustar shift según tamaño de dispositivo
        let rightShift = 0;
        let bShift = 0;
        if (isLargeDevice || isMediumLargeDevice) {
          rightShift = 120; // Move paths 120 units to the right
          bShift = 60;      // Move paths 60 units down
        }
        // Si es small o tiny, no aplicar shift
        const offsetX = centerX - pathCenterX + rightShift;
        const offsetY = centerY - pathCenterY + bShift;
        transformGroup = `<g transform="translate(${offsetX}, ${offsetY})">`;
      }
      
  const pathElements = paths.map((pathData, index) => {
        let scaledPath = pathData.path;
        
        if (pathData.path) {
          scaledPath = pathData.path.replace(/([ML])\s*([0-9.-]+)\s*([0-9.-]+)/g, (match: string, command: string, x: string, y: string) => {
            const scaledX = parseFloat(x) * 0.85;
            const scaledY = parseFloat(y) * 0.85;
            return `${command} ${scaledX} ${scaledY}`;
          });
        }
        
        let pathElement = '';
        
        if (pathData.penType === 2) {
          pathElement = `
            <path 
              d="${scaledPath}" 
              stroke="${pathData.color || 'yellow'}" 
              stroke-width="4" 
              fill="${pathData.color || 'yellow'}" 
              fill-opacity="0.4" 
              stroke-opacity="0.8"
            />`;
        } else if (pathData.penType === 1) {
          pathElement = `
            <path 
              d="${scaledPath}" 
              stroke="red" 
              stroke-width="3" 
              fill="none" 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              opacity="1"
            />`;
        } else {
          pathElement = `
            <path 
              d="${scaledPath}" 
              stroke="${pathData.isEraser ? 'white' : (pathData.color || 'black')}" 
              stroke-width="${pathData.strokeWidth || 3}" 
              fill="none" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            />`;
        }
        
        return pathElement;
      }).join('');
      
      // Render fotos (mismo grupo de centrado y factor de escala 0.85)
      const photoElements = (photos || []).map(ph => {
        // Aplicar mismo factor global de paths (0.85) después de reproducir escala igual que en whiteboard
        const scaledBaseW = ph.baseWidth * ph.scale;
        const scaledBaseH = ph.baseHeight * ph.scale;
  const PHOTO_LEFT_MARGIN = 30; // margen adicional a la izquierda para la imagen
  const sx = ph.x * 0.85 + PHOTO_LEFT_MARGIN;
        const sy = ph.y * 0.85;
        const sw = scaledBaseW * 0.85;
        const sh = scaledBaseH * 0.85;
        const cx = sx + sw / 2;
        const cy = sy + sh / 2;
        const rotation = ph.rotation || 0;
        return `
          <g>
            <image href="${ph.dataUrl}" x="${sx}" y="${sy}" width="${sw}" height="${sh}" preserveAspectRatio="none" transform="rotate(${rotation}, ${cx}, ${cy})" />
            <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="2" transform="rotate(${rotation}, ${cx}, ${cy})" />
          </g>`;
      }).join('');

      const combined = pathElements + photoElements;

      if (transformGroup) {
        return transformGroup + combined + '</g>';
      } else {
        return combined;
      }
    } catch (error) {
      console.error('Error parsing paths:', error);
      return '';
    }
  };

  // Generate individual pages HTML using the exact same logic from the existing functions
  // Función que construye la página de un gimnasta usando el estado actual de fotos
  const buildGymnastPageHTML = (gymnast: MainTableWithRateGeneral) => {
    const isVault = gymnast.event === "VT";
    
    if (isVault) {
      // Use exact vault layout from generateMainJumpPDF
      return `
        <div class="page">
          <div class="header">
            <h1>🏅 Judges' Report</h1>
            <h2>${gymnast.name || 'Unknown Gymnast'} (${gymnast.noc || 'UNK'}) - ${gymnast.event || 'VT'}</h2>
          </div>
          
          <div class="gymnast-info">
          <strong>Number:</strong> ${gymnast.number || 0} | 
            <strong>Gymnast:</strong> ${gymnast.name || 'Unknown'} | 
            <strong>NOC:</strong> ${gymnast.noc || 'UNK'} | 
            <strong>Event:</strong> ${gymnast.event || 'VT'} | 
            <strong>BIB:</strong> ${gymnast.bib || 0} | 
            <strong>Execution Performance:</strong> ${gymnast.percentage || 0}%
          </div>
          
          <!-- Full Width Whiteboard Section -->
          <div class="whiteboard-section">
            <div class="whiteboard-title">Judge's Whiteboard</div>
            <svg class="whiteboard-canvas" viewBox="0 0 1300 780" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              <!-- Jump background image -->
              ${jumpImageBase64 ? `
                <image href="${jumpImageBase64}" 
            width="1000" height="663" x="80" y="65" opacity="0.6" />
              ` : `
                
              `}
              ${renderWhiteboardPaths(gymnast.paths || '', gymnastPhotosMap[gymnast.id] || [])}

            </svg>
          </div>
          
          <!-- Tables Section Below Whiteboard -->
          <div class="tables-section">
            <!-- Vault Information Table -->
            <div>
              <div class="vault-table-header">ANNOUNCED VAULT</div>
              <table class="vault-table">
                <thead>
                  <tr>
                    <th>CATEGORY</th>
                    <th>VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="vault-info-row">
                    <td>VAULT NUMBER</td>
                    <td class="vault-info-value">${gymnast.vaultNumber || 'N/A'}</td>
                  </tr>
                  <tr class="vault-info-row">
                    <td>START VALUE</td>
                    <td class="vault-info-value">${(gymnast.e2 || 0).toFixed(1)}</td>
                  </tr>
                  <tr class="vault-info-row">
                    <td>DESCRIPTION</td>
                    <td class="vault-info-value">${gymnast.vaultDescription || 'No description'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Scoring Information Table -->
            <div>
              <table class="info-table">
                <tr>
                  <td class="info-label">SCORES</td>
                  <td class="score-groups">
                    <div class="score-group">
                      <div class="score-header">SV</div>
                      <div class="score-value sv">${(gymnast.sv || 0).toFixed(1)}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">ND</div>
                      <div class="score-value nd">${(gymnast.nd || 0).toFixed(1)}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">SB</div>
                      <div class="score-value sb">${gymnast.stickBonus ? '0.1' : '0.0'}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">EXEC</div>
                      <div class="score-value execution">${(gymnast.execution || 0).toFixed(1)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="info-label">E SCORE</td>
                  <td class="info-value">${(gymnast.eScore || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td class="info-label">MY SCORE</td>
                  <td class="info-value orange">${(gymnast.myScore || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td class="info-label">EXECUTION PERFORMANCE</td>
                  <td class="info-value">${(gymnast.percentage || 0)}%</td>
                </tr>
              </table>
            </div>
          </div>
          
          <!-- Competition Section Below Tables -->
          <div class="competition-section">
            <div class="comp-row">
              <div class="comp-label">COMPETITION</div>
              <div class="comp-cell">D</div>
              <div class="comp-value">${(gymnast.compD || 0).toFixed(1)}</div>
              <div class="comp-cell">E</div>
              <div class="comp-value">${(gymnast.compE || 0).toFixed(3)}</div>
              <div class="comp-cell">SB</div>
              <div class="comp-value">${gymnast.compSd ? '0.1' : '0.0'}</div>
              <div class="comp-cell">ND</div>
              <div class="comp-value">${(gymnast.compNd || gymnast.nd || 0).toFixed(1)}</div>
              <div class="comp-cell">SCORE</div>
              <div class="comp-value">${(gymnast.compScore || 0).toFixed(3)}</div>
            </div>
          </div>
          
          <!-- Comments Section -->
          <div class="comments-section">
            <h3>💬 Judge Comments</h3>
            <div class="comments-text">
              ${gymnast.comments || 'No comments provided for this vault.'}
            </div>
          </div>
        </div>
      `;
    } else {
      // Use exact floor layout from generateMainFloorPDF
      return `
        <div class="page">
          <div class="header">
            <h1>🏅 Judges' Report</h1>
            <h2>${gymnast.name || 'Unknown Gymnast'} (${gymnast.noc || 'UNK'}) - ${gymnast.event || 'FX'}</h2>
          </div>
          
          <div class="gymnast-info">
            <strong>Number:</strong> ${gymnast.number || 0} | 
            <strong>Gymnast:</strong> ${gymnast.name || 'Unknown'} | 
            <strong>NOC:</strong> ${gymnast.noc || 'UNK'} | 
            <strong>Event:</strong> ${gymnast.event || 'FX'} | 
            <strong>BIB:</strong> ${gymnast.bib || ""} | 
            <strong>Execution Performance:</strong> ${gymnast.percentage || 0}%
          </div>
          
          <!-- Full Width Whiteboard Section -->
          <div class="whiteboard-section">
            <div class="whiteboard-title">Judge's Whiteboard</div>
            <svg class="whiteboard-canvas" viewBox="0 0 1300 780" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              ${renderWhiteboardPaths(gymnast.paths || '', gymnastPhotosMap[gymnast.id] || [])}
            </svg>
          </div>
          
          <!-- Tables Section Below Whiteboard -->
          <div class="tables-section">
            <!-- Code Table Section -->
            <div>
              <div class="code-table-header">Difficulty Values</div>
              <table class="code-table">
                
                <tbody>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.j || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''} ">J</td>
                    <td class="number-cell ${(gymnast.j || 0) === 1 ? 'selected' : ''}" ${(gymnast.j || 0) === 1 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.j || 0) === 2 ? 'selected' : ''}" ${(gymnast.j || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.j || 0) === 3 ? 'selected' : ''}" ${(gymnast.j || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.j || 0) === 4 ? 'selected' : ''}" ${(gymnast.j || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.j || 0) === 5 ? 'selected' : ''}" ${(gymnast.j || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.j || 0) === 6 ? 'selected' : ''}" ${(gymnast.j || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.j || 0) === 7 ? 'selected' : ''}" ${(gymnast.j || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.j || 0) === 8 ? 'selected' : ''}" ${(gymnast.j || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.j || 0) > 0 ? 'selected' : ''}" ${(gymnast.j || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.j || 0}</td>
                    <td class="${(gymnast.j || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.j || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>J</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.i || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}">I</td>
                    <td class="number-cell ${(gymnast.i || 0) === 1 ? 'selected' : ''}" ${(gymnast.i || 0) === 1 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.i || 0) === 2 ? 'selected' : ''}" ${(gymnast.i || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.i || 0) === 3 ? 'selected' : ''}" ${(gymnast.i || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.i || 0) === 4 ? 'selected' : ''}" ${(gymnast.i || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.i || 0) === 5 ? 'selected' : ''}" ${(gymnast.i || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.i || 0) === 6 ? 'selected' : ''}" ${(gymnast.i || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.i || 0) === 7 ? 'selected' : ''}" ${(gymnast.i || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.i || 0) === 8 ? 'selected' : ''}" ${(gymnast.i || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.i || 0) > 0 ? 'selected' : ''}" ${(gymnast.i || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.i || 0}</td>
                    <td class="${(gymnast.i || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.i || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>I</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.h || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}">H</td>
                    <td class="number-cell ${(gymnast.h || 0) === 1 ? 'selected' : ''}" ${(gymnast.h || 0) === 1 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.h || 0) === 2 ? 'selected' : ''}" ${(gymnast.h || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.h || 0) === 3 ? 'selected' : ''}" ${(gymnast.h || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.h || 0) === 4 ? 'selected' : ''}" ${(gymnast.h || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.h || 0) === 5 ? 'selected' : ''}" ${(gymnast.h || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.h || 0) === 6 ? 'selected' : ''}" ${(gymnast.h || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.h || 0) === 7 ? 'selected' : ''}" ${(gymnast.h || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.h || 0) === 8 ? 'selected' : ''}" ${(gymnast.h || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.h || 0) > 0 ? 'selected' : ''}" ${(gymnast.h || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.h || 0}</td>
                    <td class="${(gymnast.h || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.h || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>H</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.g || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}">G</td>
                    <td class="number-cell ${(gymnast.g || 0) === 1 ? 'selected' : ''}" ${(gymnast.g || 0) === 1 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.g || 0) === 2 ? 'selected' : ''}" ${(gymnast.g || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.g || 0) === 3 ? 'selected' : ''}" ${(gymnast.g || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.g || 0) === 4 ? 'selected' : ''}" ${(gymnast.g || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.g || 0) === 5 ? 'selected' : ''}" ${(gymnast.g || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.g || 0) === 6 ? 'selected' : ''}" ${(gymnast.g || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.g || 0) === 7 ? 'selected' : ''}" ${(gymnast.g || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.g || 0) === 8 ? 'selected' : ''}" ${(gymnast.g || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.g || 0) > 0 ? 'selected' : ''}" ${(gymnast.g || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.g || 0}</td>
                    <td class="${(gymnast.g || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.g || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>G</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.f || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}">F</td>
                    <td class="number-cell ${(gymnast.f || 0) === 1 ? 'selected' : ''}" ${(gymnast.f || 0) === 1 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.f || 0) === 2 ? 'selected' : ''}" ${(gymnast.f || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.f || 0) === 3 ? 'selected' : ''}" ${(gymnast.f || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.f || 0) === 4 ? 'selected' : ''}" ${(gymnast.f || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.f || 0) === 5 ? 'selected' : ''}" ${(gymnast.f || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.f || 0) === 6 ? 'selected' : ''}" ${(gymnast.f || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.f || 0) === 7 ? 'selected' : ''}" ${(gymnast.f || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.f || 0) === 8 ? 'selected' : ''}" ${(gymnast.f || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.f || 0) > 0 ? 'selected' : ''}" ${(gymnast.f || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.f || 0}</td>
                    <td class="${(gymnast.f || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.f || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>F</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.e || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}">E</td>
                    <td class="number-cell ${(gymnast.e || 0) === 1 ? 'selected' : ''}" ${(gymnast.e || 0) === 1 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.e || 0) === 2 ? 'selected' : ''}" ${(gymnast.e || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.e || 0) === 3 ? 'selected' : ''}" ${(gymnast.e || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.e || 0) === 4 ? 'selected' : ''}" ${(gymnast.e || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.e || 0) === 5 ? 'selected' : ''}" ${(gymnast.e || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.e || 0) === 6 ? 'selected' : ''}" ${(gymnast.e || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.e || 0) === 7 ? 'selected' : ''}" ${(gymnast.e || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.e || 0) === 8 ? 'selected' : ''}" ${(gymnast.e || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.e || 0) > 0 ? 'selected' : ''}" ${(gymnast.e || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.e || 0}</td>
                    <td class="${(gymnast.e || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.e || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>E</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.d || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}">D</td>
                    <td class="number-cell ${(gymnast.d || 0) === 1 ? 'selected' : ''}" ${(gymnast.d || 0) === 1 ? 'style="color:rgb(153, 1, 1)!important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.d || 0) === 2 ? 'selected' : ''}" ${(gymnast.d || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.d || 0) === 3 ? 'selected' : ''}" ${(gymnast.d || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.d || 0) === 4 ? 'selected' : ''}" ${(gymnast.d || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.d || 0) === 5 ? 'selected' : ''}" ${(gymnast.d || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.d || 0) === 6 ? 'selected' : ''}" ${(gymnast.d || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.d || 0) === 7 ? 'selected' : ''}" ${(gymnast.d || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.d || 0) === 8 ? 'selected' : ''}" ${(gymnast.d || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.d || 0) > 0 ? 'selected' : ''}" ${(gymnast.d || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.d || 0}</td>
                    <td class="${(gymnast.d || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.d || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>D</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.c || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}">C</td>
                    <td class="number-cell ${(gymnast.c || 0) === 1 ? 'selected' : ''}" ${(gymnast.c || 0) === 1 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.c || 0) === 2 ? 'selected' : ''}" ${(gymnast.c || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.c || 0) === 3 ? 'selected' : ''}" ${(gymnast.c || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.c || 0) === 4 ? 'selected' : ''}" ${(gymnast.c || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.c || 0) === 5 ? 'selected' : ''}" ${(gymnast.c || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.c || 0) === 6 ? 'selected' : ''}" ${(gymnast.c || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.c || 0) === 7 ? 'selected' : ''}" ${(gymnast.c || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.c || 0) === 8 ? 'selected' : ''}" ${(gymnast.c || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.c || 0) > 0 ? 'selected' : ''}" ${(gymnast.c || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.c || 0}</td>
                    <td class="${(gymnast.c || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.c || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>C</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.b || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}">B</td>
                    <td class="number-cell ${(gymnast.b || 0) === 1 ? 'selected' : ''}" ${(gymnast.b || 0) === 1 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.b || 0) === 2 ? 'selected' : ''}" ${(gymnast.b || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.b || 0) === 3 ? 'selected' : ''}" ${(gymnast.b || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.b || 0) === 4 ? 'selected' : ''}" ${(gymnast.b || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.b || 0) === 5 ? 'selected' : ''}" ${(gymnast.b || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.b || 0) === 6 ? 'selected' : ''}" ${(gymnast.b || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.b || 0) === 7 ? 'selected' : ''}" ${(gymnast.b || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.b || 0) === 8 ? 'selected' : ''}" ${(gymnast.b || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.b || 0) > 0 ? 'selected' : ''}" ${(gymnast.b || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.b || 0}</td>
                    <td class="${(gymnast.b || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.b || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>B</td>
                  </tr>
                  <tr class="element-row">
                    <td class="code-cell ${(gymnast.a || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}">A</td>
                    <td class="number-cell ${(gymnast.a || 0) === 1 ? 'selected' : ''}" ${(gymnast.a || 0) === 1 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>1</td>
                    <td class="number-cell ${(gymnast.a || 0) === 2 ? 'selected' : ''}" ${(gymnast.a || 0) === 2 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>2</td>
                    <td class="number-cell ${(gymnast.a || 0) === 3 ? 'selected' : ''}" ${(gymnast.a || 0) === 3 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>3</td>
                    <td class="number-cell ${(gymnast.a || 0) === 4 ? 'selected' : ''}" ${(gymnast.a || 0) === 4 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>4</td>
                    <td class="number-cell ${(gymnast.a || 0) === 5 ? 'selected' : ''}" ${(gymnast.a || 0) === 5 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>5</td>
                    <td class="number-cell ${(gymnast.a || 0) === 6 ? 'selected' : ''}" ${(gymnast.a || 0) === 6 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>6</td>
                    <td class="number-cell ${(gymnast.a || 0) === 7 ? 'selected' : ''}" ${(gymnast.a || 0) === 7 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>7</td>
                    <td class="number-cell ${(gymnast.a || 0) === 8 ? 'selected' : ''}" ${(gymnast.a || 0) === 8 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>8</td>
                    <td class="sel-cell ${(gymnast.a || 0) > 0 ? 'selected' : ''}" ${(gymnast.a || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>${gymnast.a || 0}</td>
                    <td class="${(gymnast.a || 0) > 0 ? 'selected-value has-selection' : 'selected-value'}" ${(gymnast.a || 0) > 0 ? 'style="color: rgb(153, 1, 1) !important; font-weight: bold !important;"' : ''}>A</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Info Table -->


            
            <div>
              <table class="info-table">
                <tr>
                  <td class="info-label">NUMBER OF ELEMENTS</td>
                  <td class="info-value ${(gymnast.numberOfElements || 0) >= 6 && (gymnast.numberOfElements || 0) <= 8 ? 'green' : 'red'}">
                    ${gymnast.numberOfElements || 0}
                  </td>
                </tr>
                <tr>
                  <td class="info-label">DIFFICULTY VALUES</td>
                  <td class="info-value">${(gymnast.difficultyValues || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td class="info-label">ELEMENT GROUPS</td>
                  <td class="element-groups">
                    <div class="element-group">
                      <div class="group-header">I</div>
                      <div class="group-value">${(gymnast.elementGroups1 || 0).toFixed(1)}</div>
                    </div>
                    <div class="element-group">
                      <div class="group-header">II</div>
                      <div class="group-value">${(gymnast.elementGroups2 || 0).toFixed(1)}</div>
                    </div>
                    <div class="element-group">
                      <div class="group-header">III</div>
                      <div class="group-value">${(gymnast.elementGroups3 || 0).toFixed(1)}</div>
                    </div>
                    <div class="element-group">
                      <div class="group-header">IV</div>
                      <div class="group-value">${(gymnast.elementGroups4 || 0).toFixed(1)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="info-label">ELEMENT GROUPS TOTAL</td>
                  <td class="info-value">${(gymnast.elementGroups5 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td class="info-label">SCORES</td>
                  <td class="score-groups">
                    <div class="score-group">
                      <div class="score-header">CV</div>
                      <div class="score-value cv">${(gymnast.cv || 0).toFixed(1)}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">SB</div>
                      <div class="score-value sb">${gymnast.stickBonus ? '0.1' : '0.0'}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">ND</div>
                      <div class="score-value nd">${(gymnast.nd || 0).toFixed(1)}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">SV</div>
                      <div class="score-value sv">${(gymnast.sv || 0).toFixed(1)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="info-label">EXECUTION</td>
                  <td class="info-value">${(gymnast.execution || gymnast.e2 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td class="info-label">E SCORE</td>
                  <td class="info-value">${(gymnast.eScore || gymnast.e3 || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td class="info-label">MY SCORE</td>
                  <td class="info-value orange">${(gymnast.myScore || 0).toFixed(3)}</td>
                </tr>
              </table>
            </div>
          </div>
          
          <!-- Competition Section Below Tables -->
          <div class="competition-section">
            <div class="comp-row">
              <div class="comp-label">COMPETITION</div>
              <div class="comp-cell">D</div>
              <div class="comp-value">${(gymnast.compD || gymnast.d3 || 0).toFixed(1)}</div>
              <div class="comp-cell">E</div>
              <div class="comp-value">${(gymnast.compE || gymnast.e3 || 0).toFixed(3)}</div>
              <div class="comp-cell">SB</div>
              <div class="comp-value">${gymnast.compSd ? '0.1' : '0.0'}</div>
              <div class="comp-cell">ND</div>
              <div class="comp-value">${(gymnast.compNd || gymnast.nd || 0).toFixed(1)}</div>
              <div class="comp-cell">SCORE</div>
              <div class="comp-value">${(gymnast.compScore || 0).toFixed(3)}</div>
            </div>
          </div>
          
          <!-- Comments Section -->
          <div class="comments-section">
            <h3>💬 Judge Comments</h3>
            <div class="comments-text">
              ${gymnast.comments || 'No comments provided for this routine.'}
            </div>
          </div>
        </div>
      `;
    }
  };

  // Array dinámico de páginas (se puede regenerar una página tras eliminar fotos)
  let pagesArray: string[] = resolvedData.map(g => buildGymnastPageHTML(g));

  // Generate final table HTML (exact copy from generateFinalTablePDF)
  const finalTableHTML = `
    <div class="page final-table-page">
      <div class="header final-table-header">
        <h1>🏅 Judging Summary</h1>
        <p>${finalTableData.competition.discipline}</p>
      </div>
      
      <div class="competition-info">
        <h2>Competition Details</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-value">DATE: ${finalTableData.competition.date}</div>
          </div>
          <div class="info-item">
            <div class="info-value">PARTICIPANTS: ${finalTableData.competition.totalParticipants}</div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table class="results-table">
          <thead>
            <tr>
              <th class="header-gray header-first">No.</th>
              <th class="header-blue">GYMNAST</th>
              <th class="header-blue">EVENT</th>
              <th class="header-blue">NOC</th>
              <th class="header-blue">BIB</th>
              <th class="header-gray">J</th>
              <th class="header-gray">I</th>
              <th class="header-gray">H</th>
              <th class="header-gray">G</th>
              <th class="header-gray">F</th>
              <th class="header-gray">E</th>
              <th class="header-gray">D</th>
              <th class="header-gray">C</th>
              <th class="header-gray">B</th>
              <th class="header-gray">A</th>
              <th class="header-blue">DV</th>
              <th class="header-blue">EG</th>
              <th class="header-blue">SB</th>
              <th class="header-blue">ND</th>
              <th class="header-blue">CV</th>
              <th class="header-blue">SV</th>
              <th class="header-blue">E</th>
              <th class="header-gold">D</th>
              <th class="header-gold">E</th>
              <th class="header-gold">DELT</th>
              <th class="header-gold">%</th>
            </tr>
          </thead>
          <tbody>
            ${finalTableData.participants.map((participant, index) => {
              const isLastRow = index === finalTableData.participants.length - 1;
              const truncateComment = (text: string) => {
                if (!text || text.trim() === '') return '';
                const chunks = [];
                for (let i = 0; i < text.length; i += 12) {
                  chunks.push(text.substring(i, i + 12));
                }
                if (chunks.length <= 3) {
                  return chunks.join('<br>');
                } else {
                  const firstTwoLines = chunks.slice(0, 2);
                  const thirdLineText = chunks[2];
                  const truncatedThirdLine = thirdLineText.substring(0, 9) + '...';
                  return [...firstTwoLines, truncatedThirdLine].join('<br>');
                }
              };
              
              return `
                <tr>
                  <td class="position-cell ${isLastRow ? 'bottom-left' : ''}">${participant.position}</td>
                  <td class="name-cell">${participant.name}</td>
                  <td>${participant.event}</td>
                  <td>${participant.noc}</td>
                  <td>${participant.bib}</td>
                  <td>${participant.elements.j}</td>
                  <td>${participant.elements.i}</td>
                  <td>${participant.elements.h}</td>
                  <td>${participant.elements.g}</td>
                  <td>${participant.elements.f}</td>
                  <td>${participant.elements.e}</td>
                  <td>${participant.elements.d}</td>
                  <td>${participant.elements.c}</td>
                  <td>${participant.elements.b}</td>
                  <td>${participant.elements.a}</td>
                  <td>${participant.scores.difficultyValues.toFixed(1)}</td>
                  <td>${participant.scores.elementGroups.toFixed(1)}</td>
                  <td>${participant.scores.stickBonus.toFixed(1)}</td>
                  <td>${participant.scores.neutralDeductions.toFixed(1)}</td>
                  <td>${participant.scores.connectionValue.toFixed(1)}</td>
                  <td class="${participant.scores.startValue.toFixed(1) !== participant.scores.dScore.toFixed(1) ? 'red-text' : ''}">${participant.scores.startValue.toFixed(1)}</td>
                  <td>${participant.scores.executionScore.toFixed(3)}</td>
                  <td class="score-cell">${participant.scores.dScore.toFixed(1)}</td>
                  <td class="score-cell">${participant.scores.eScore.toFixed(3)}</td>
                  <td class="score-cell">${participant.details.delta.toFixed(1)}</td>
                  <td class="${participant.details.percentage >= 88 ? 'green-text' : participant.details.percentage >= 70 ? 'yellow-text' : 'red-text'} ${isLastRow ? 'bottom-right' : ''}">${participant.details.percentage}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Statistics Section -->
      <div class="statistics-section">
        <h3 style="color: #0052b4; margin-bottom: 15px;">📊 Competition Statistics</h3>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-number">${finalTableData.participants.filter(p => p.scores.executionScore > 0 ).length}</div>
            <div class="stat-label">Total Participants</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${(() => {
              const realParticipants = finalTableData.participants.filter(p => p.scores.executionScore > 0);
              return realParticipants.length > 0 ? (realParticipants.reduce((sum, p) => sum + p.details.percentage, 0) / realParticipants.length).toFixed(2) : '0.0';
            })()}%</div>
            <div class="stat-label">Average Percentage</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${(() => {
              const realParticipants = finalTableData.participants.filter(p => p.scores.executionScore > 0);
              return realParticipants.length > 0 ? Math.min(...realParticipants.map(p => p.details.percentage)) : 0;
            })()}%</div>
            <div class="stat-label">Lowest Percentage</div>
          </div>
        </div>
      </div>

      ${(() => {
        const participantsWithComments = finalTableData.participants.filter(p => p.details.comments && p.details.comments.trim() !== '');
        
        if (participantsWithComments.length > 0) {
          return `
            <div class="comments-section">
              <h3>💬 Judge Comments</h3>
              ${participantsWithComments.map(participant => `
                <div class="comment-item">
                  <div class="comment-gymnast">${participant.name} (${participant.noc})</div>
                  <div class="comment-text">${participant.details.comments}</div>
                </div>
              `).join('')}
            </div>
          `;
        }
        return '';
      })()}
      
      <div class="footer">
        <p><strong>Generated by GymJudge</strong> on ${new Date().toLocaleString()}</p>
        <p>© 2025 GymJudge. All rights reserved. | Competition Report</p>
      </div>
    </div>
  `;

  // Combine ALL CSS from both functions (vault + floor + final table)
  // --- Chunking + Merge para evitar OOM ---
  // Si existe al menos una imagen en toda la competencia, usar chunks de 1 (más seguro de memoria).
  // Si no hay imágenes, podemos agrupar en chunks de 15 para acelerar.
  const hasAnyPhotos = Object.values(gymnastPhotosMap).some(arr => (arr?.length ?? 0) > 0);
  const MAX_PAGES_PER_CHUNK = hasAnyPhotos ? 2 : 15;
  const MAX_HTML_CHARS = 750_000; // fallback por tamaño
  const pagesCount = pagesArray.length;
  console.log(`[PDF] Total páginas individuales: ${pagesCount}`);

  const buildFullHTML = (pages: string[] | string, includeFinalTable: boolean) => {
    const arr = Array.isArray(pages) ? pages : [pages];
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 10px;
          line-height: 1.2;
          color: #333;
          background: #f5f5f5;
          padding: 8px;
        }
        
        .red-text {
          color:rgb(153, 1, 1) !important;
        }
        
        .green-text {
          color:rgb(27, 92, 29) !important;
        }
        .yellow-text {
          color:rgb(188, 142, 28) !important;
        }

        .page {
          background: white;
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          page-break-after: always;
        }
        .page:last-child { page-break-after: auto; }
        
        .final-table-page {
          background: #f0f4f8 !important;
          padding: 15px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          background: linear-gradient(135deg, #0052b4, #004aad);
          color: white;
          padding: 12px;
          border-radius: 6px;
        }
        
        .final-table-header {
          padding: 20px;
        }
        
        .header h1 {
          font-size: 18px;
          margin-bottom: 3px;
        }
        
        .header h2 {
          font-size: 14px;
          font-weight: normal;
        }
        
        .final-table-header h1 {
          font-size: 28px !important;
          margin-bottom: 10px;
        }
        
        .gymnast-info {
          background: #e8f4ff;
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 15px;
          border-left: 3px solid #0052b4;
          font-size: 9px;
        }
        
        .whiteboard-section {
          background: #f9f9f9;
          border-radius: 6px;
          padding: 15px 25px 20px 25px;
          border: 1px solid #ddd;
          margin-bottom: 15px;
          text-align: center;
        }
        
        .whiteboard-title {
          font-size: 12px;
          font-weight: bold;
          color: #0052b4;
          margin-bottom: 8px;
          text-align: center;
        }
        
        .whiteboard-canvas {
          width: 60%;
          height: 180px;
          background: #ffffffff;
          border: 1px solid #ccc;
          border-radius: 4px;
          margin: 0 auto;
          position: relative;
        }
        
        .tables-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        /* VAULT TABLE STYLES - From generateMainJumpPDF */
        .vault-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 8px;
        }
        
        .vault-table-header {
          background: #0052b4;
          color: white;
          text-align: center;
          padding: 6px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .vault-table th,
        .vault-table td {
          border: 1px solid #ddd;
          padding: 3px;
          text-align: center;
          font-weight: bold;
        }
        
        .vault-table th {
          background: #f0f0f0;
          font-size: 8px;
        }
        
        .vault-info-row {
          background: #a9def9;
        }
        
        .vault-info-value {
          background: #6B9BDF;
          color: white;
          font-weight: bold;
          font-size: 10px;
        }
        
        /* CODE TABLE STYLES - From generateMainFloorPDF */
        .code-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 8px;
        }
        
        .code-table-header {
          background: #0052b4;
          color: white;
          text-align: center;
          padding: 6px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .code-table th,
        .code-table td {
          border: 1px solid #ddd;
          padding: 3px;
          text-align: center;
          font-weight: bold;
        }
        
        .code-table th {
          background: #f0f0f0;
          font-size: 7px;
        }
        
        .element-row {
          background: #a9def9;
        }
        
        .code-cell {
          background: #a9def9;
          color: #333;
        }

        .code-cell.selected {
          background: #28a745 !important; 
          color: white !important;
        }
        
        .number-cell {
          background: #a9def9;
          color: #333;
        }
        
        .number-cell.selected {
          background: #28a745 !important; 
          color: #ffffff !important;
          font-weight: bold !important;
        }

        .sel-cell {
          background: #a9def9;
          color: #333;
        }

        .sel-cell.selected {
          background: #28a745 !important;
          color: white !important;
        }
        
        .selected-value {
          color:  #333; 
        }

        .selected-value.has-selection {
          background: #28a745 !important; 
          color: white !important;
        }
        
        /* INFO TABLE STYLES - Common to both */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 8px;
          border: 1px solid #ddd;
        }
        
        .info-table tr {
          height: 22px;
        }
        
        .info-label {
          background: #a9def9;
          padding: 3px 6px;
          font-weight: bold;
          text-align: right;
          width: 120px;
          border: 1px solid #ddd;
          font-size: 8px;
        }
        
        .info-value {
          background: #6B9BDF;
          padding: 3px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #ddd;
          font-size: 10px;
        }
        
        .info-value.green {
          background: #00b050;
        }
        
        .info-value.red {
          background: #ff9b9b;
        }
        
        .info-value.yellow {
          background: #f8c471;
        }
        
        .info-value.orange {
          background: #ffcb41;
        }
        
        /* ELEMENT GROUPS - From Floor */
        .element-groups {
          display: flex;
          flex: 1;
        }
        
        .element-group {
          flex: 1;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .group-header {
          background: #D9D9D9;
          padding: 3px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .group-value {
          background: #6B9BDF;
          padding: 3px;
          font-weight: bold;
          font-size: 10px;
        }
        
        /* SCORE GROUPS - Common to both */
        .score-groups {
          display: flex;
          flex: 1;
        }
        
        .score-group {
          flex: 1;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .score-header {
          background: #D9D9D9;
          padding: 3px;
          font-weight: bold;
          font-size: 8px;
        }
        
        .score-value {
          padding: 3px;
          font-weight: bold;
          font-size: 9px;
        }
        
        .score-value.cv {
          background: #f8c471;
        }
        
        .score-value.sb {
          background: #00b050;
          color: white;
        }
        
        .score-value.nd {
          background: #ff9b9b;
        }
        
        .score-value.sv {
          background: #6B9BDF;
        }
        
        .score-value.execution {
          background: #f8c471;
        }
        
        /* COMPETITION SECTION - Common to both */
        .competition-section {
          background: white;
          border-radius: 4px;
          margin: 0 auto 10px auto;
          max-width: 600px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .comp-row {
          display: flex;
          height: 25px;
        }
        
        .comp-label {
          background: #00b050;
          color: white;
          text-align: center;
          padding: 3px 6px;
          font-weight: bold;
          width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
        }
        
        .comp-cell {
          flex: 1;
          background: #D9D9D9;
          text-align: center;
          padding: 3px;
          font-weight: bold;
          border: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
        }
        
        .comp-value {
          flex: 1;
          background: #00b050;
          color: white;
          text-align: center;
          padding: 3px;
          font-weight: bold;
          border: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }
        
        /* COMMENTS SECTION - Common to both */
        .comments-section {
          background: white;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .comments-section h3 {
          color: #0052b4;
          margin-bottom: 6px;
          border-bottom: 1px solid #0052b4;
          padding-bottom: 3px;
          font-size: 11px;
        }
        
        .comments-text {
          font-size: 9px;
          line-height: 1.3;
          text-align: justify;
        }
        
        /* FINAL TABLE STYLES - From generateFinalTablePDF */
        .competition-info {
          background: #e8f4ff;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-left: 4px solid #0052b4;
        }
        
        .competition-info h2 {
          color: #0052b4;
          margin-bottom: 10px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        
        .info-item {
          background: white;
          padding: 8px;
          border-radius: 4px;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .table-container {
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .results-table th {
          padding: 8px 4px;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          color: white;
          border-right: 1px solid #ddd;
          height: 40px;
        }
        
        .header-gray { background: #A2A2A2; }
        .header-blue { background: #0052b4; }
        .header-gold { background: #F5D76E; color: #333 !important; }
        .header-first { border-top-left-radius: 15px; }
        .header-last { border-top-right-radius: 15px; }
        
        .results-table td {
          padding: 6px 4px;
          text-align: center;
          border-right: 1px solid #ddd;
          border-bottom: 1px solid #ddd;
          font-size: 10px;
          background: white;
          height: 40px;
          vertical-align: middle;
        }
        
        .position-cell {
          background: white !important;
          font-weight: bold;
          color: #333;
        }
        
        .name-cell {
          text-align: left !important;
          padding-left: 10px !important;
          font-weight: bold;
          max-width: 200px;
        }
        
        .percentage-cell {
          background: #FFC0C7 !important;
          font-weight: bold;
        }
        
        .score-cell {
          font-weight: bold;
          color: #333;
        }
        
        .comments-cell {
          text-align: justify !important;
          padding: 4px 6px !important;
          font-size: 9px;
          line-height: 1.1;
          max-width: 120px;
        }
        
        .bottom-left { border-bottom-left-radius: 15px; }
        .bottom-right { border-bottom-right-radius: 15px; }
        
        .statistics-section {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        
        .stat-box {
          text-align: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        .stat-number {
          font-size: 20px;
          font-weight: bold;
          color: #0052b4;
        }
        
        .stat-label {
          font-size: 10px;
          color: #666;
          margin-top: 2px;
        }
        
        .comment-item {
          margin-bottom: 10px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 4px solid #0052b4;
        }
        
        .comment-gymnast {
          font-weight: bold;
          color: #0052b4;
          margin-bottom: 5px;
        }
        
        .comment-text {
          color: #555;
          font-size: 11px;
          text-align: justify;
        }
        
        .footer {
          text-align: center;
          margin-top: 15px;
          font-size: 8px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 8px;
        }
        
        @media print {
          body { padding: 5px; }
          .page { margin-bottom: 0; page-break-after: always; }
          .header h1 { font-size: 16px; }
          .final-table-header h1 { font-size: 24px !important; }
          .results-table { font-size: 9px; }
        }
      </style>
    </head>
    <body>
    ${arr.join('')}
      ${includeFinalTable ? finalTableHTML : ''}
    </body>
    </html>`;
  };

  let finalUri: string | null = null;

  const needsChunk = pagesCount > MAX_PAGES_PER_CHUNK || buildFullHTML(pagesArray, true).length > MAX_HTML_CHARS;
  console.log(`[PDF] needsChunk = ${needsChunk}`);
  if (needsChunk) {
    progressCb?.('Dividiendo en chunks…', 0.05);
  const chunkUris: string[] = [];
  const chunkBase64: string[] = []; // almacenar base64 para merge sin filesystem
    const totalChunks = Math.ceil(pagesCount / MAX_PAGES_PER_CHUNK);

    const isOOMMessage = (msg: string) => /OutOfMemory|Failed to allocate/i.test(msg);

    // Remueve la foto más grande (por área * scale^2) dentro del conjunto de ids y devuelve true si removió
    const removeLargestPhotoInSet = (gymnastIds: number[]): boolean => {
      let target: { gid: number; index: number; weight: number } | null = null;
      for (const gid of gymnastIds) {
        const arr = gymnastPhotosMap[gid];
        if (!arr || !arr.length) continue;
        arr.forEach((ph, idx) => {
          const weight = (ph.baseWidth * ph.baseHeight) * (ph.scale * ph.scale);
          if (!target || weight > target.weight) {
            target = { gid, index: idx, weight };
          }
        });
      }
  if (!target) return false;
  const { gid, index } = target as { gid: number; index: number; weight: number }; // assert
  gymnastPhotosMap[gid].splice(index, 1);
      return true;
    };

    for (let i = 0; i < pagesCount; i += MAX_PAGES_PER_CHUNK) {
      checkCancel();
      console.log(`[PDF][ChunkLoop] Inicio iteración i=${i} pagesCount=${pagesCount} MAX_PAGES_PER_CHUNK=${MAX_PAGES_PER_CHUNK}`);
      const chunkStart = i;
      const chunkEnd = Math.min(i + MAX_PAGES_PER_CHUNK, pagesCount);
      const pageIndices = Array.from({ length: chunkEnd - chunkStart }, (_, k) => chunkStart + k);
      const gymnastIdsInChunk = pageIndices.map(idx => resolvedData[idx].id);
      let attempt = 0;
      let rebuilt = false;
      while (true) {
        if (rebuilt) {
          // Rebuild only changed pages after photo removals
          pageIndices.forEach(pi => { pagesArray[pi] = buildGymnastPageHTML(resolvedData[pi]); });
          rebuilt = false;
        }
        let slice = pagesArray.slice(chunkStart, chunkEnd);
        // Remover page-break de la última página del slice para evitar página en blanco extra
        if (slice.length > 0) {
          const lastIndex = slice.length - 1;
          slice[lastIndex] = slice[lastIndex].replace(/page-break-after:\s*always;?/g, '');
        }
        const includeFinal = chunkEnd >= pagesCount; // última chunk incluye tabla final
        const chunkHtml = buildFullHTML(slice, includeFinal);
        try {
          console.log(`[PDF] Generando chunk ${Math.floor(chunkStart / MAX_PAGES_PER_CHUNK) + 1}/${totalChunks} páginas ${chunkStart + 1}-${chunkEnd} intento ${attempt + 1} length=${chunkHtml.length}`);
          progressCb?.(`Chunk ${(Math.floor(chunkStart / MAX_PAGES_PER_CHUNK) + 1)}/${totalChunks}`, 0.1 + 0.35 * (chunkStart / pagesCount));
          checkCancel();
          const { uri, base64 } = await Print.printToFileAsync({ html: chunkHtml, base64: true });
          chunkUris.push(uri);
          if (base64) chunkBase64.push(base64); else console.warn('[PDF] chunk sin base64 (omitido en merge)');
          console.log(`[PDF][ChunkLoop] Chunk completado start=${chunkStart} end=${chunkEnd} totalChunks=${totalChunks} uri=${uri}`);
          break; // éxito
        } catch (err: any) {
          const msg = String(err?.message || err);
          const isOOM = isOOMMessage(msg);
          console.warn(`[PDF][ChunkLoop] Error en chunk start=${chunkStart} end=${chunkEnd} intento=${attempt + 1} msg=${msg}`);
          if (control?.cancelled) {
            console.warn('[PDF] Cancel detectado durante error de chunk');
            throw new Error('PDF cancelado');
          }
          // contar fotos en el chunk
          const totalPhotosInChunk = gymnastIdsInChunk.reduce((sum, gid) => sum + ((gymnastPhotosMap[gid]?.length) || 0), 0);
          if (isOOM || totalPhotosInChunk > 0) {
            const removed = removeLargestPhotoInSet(gymnastIdsInChunk);
            if (removed) {
              attempt++;
              rebuilt = true;
              progressCb?.(`${isOOM ? 'OOM' : 'Error'} chunk, removiendo imagen grande (intent ${attempt})`, 0.1 + 0.35 * (chunkStart / pagesCount));
              if (attempt > 40) {
                console.warn('Demasiados intentos; eliminando todas las imágenes del chunk');
                gymnastIdsInChunk.forEach(gid => { gymnastPhotosMap[gid] = []; });
                rebuilt = true;
              }
              continue; // reintentar con menos imágenes
            }
          }
          // Si sigue fallando (no OOM o sin imágenes removibles), dividir en páginas individuales
          if (pageIndices.length > 1) {
            console.warn('Fallo chunk completo; dividiendo en páginas individuales');
            for (const pi of pageIndices) {
              let singleAttempts = 0;
              while (true) {
                checkCancel();
                try {
                  const includeFinalSingle = includeFinal && pi === pagesCount - 1;
                  const singleHtml = buildFullHTML(pagesArray[pi], includeFinalSingle);
                  const { uri, base64 } = await Print.printToFileAsync({ html: singleHtml, base64: true });
                  chunkUris.push(uri);
                  if (base64) chunkBase64.push(base64); else console.warn('[PDF] página individual sin base64');
                  console.log(`[PDF][ChunkLoop] Página individual OK index=${pi} uri=${uri}`);
                  break;
                } catch (singleErr: any) {
                  const smsg = String(singleErr?.message || singleErr);
                  const isSingleOOM = isOOMMessage(smsg);
                  const gid = resolvedData[pi].id;
                  const photosArr = gymnastPhotosMap[gid] || [];
                  if ((isSingleOOM || photosArr.length > 0) && photosArr.length > 0) {
                    // quitar más grande de ESTA página
                    let largestIndex = -1; let largestWeight = -1;
                    photosArr.forEach((ph, idx) => {
                      const w = (ph.baseWidth * ph.baseHeight) * (ph.scale * ph.scale);
                      if (w > largestWeight) { largestWeight = w; largestIndex = idx; }
                    });
                    if (largestIndex >= 0) {
                      photosArr.splice(largestIndex, 1);
                      gymnastPhotosMap[gid] = photosArr;
                      pagesArray[pi] = buildGymnastPageHTML(resolvedData[pi]);
                      singleAttempts++;
                      if (singleAttempts > 25) {
                        console.warn('Demasiados intentos página individual, sin imágenes restantes o persistente fallo');
                        break;
                      }
                      continue; // reintentar página
                    }
                  }
                  console.error('Fallo página individual sin recuperación posible', singleErr);
                  if (control?.cancelled) throw new Error('PDF cancelado');
                  break; // abandonamos esa página para no bloquear restantes
                }
              }
            }
            console.log(`[PDF][ChunkLoop] Finalizada división en páginas individuales para rango start=${chunkStart} end=${chunkEnd}`);
            break; // salir del while chunk; seguimos con el siguiente chunk
          }
          console.error('Error generando chunk no recuperable', err);
          throw err;
        }
      }
      console.log(`[PDF][ChunkLoop] Salida de while para chunk start=${chunkStart} -> preparando siguiente chunk`);
    }

    // Merge chunks (siempre fusionar en memoria y crear un archivo nuevo si es posible; si no, compartir base64)
    if (chunkUris.length === 1) {
      finalUri = chunkUris[0];
    } else {
      const merged = await PDFDocument.create();
      console.log('[PDF] Iniciando merge de', chunkUris.length, 'chunks');
      progressCb?.('Fusionando chunks…', 0.55);
      for (let i = 0; i < chunkBase64.length; i++) {
        checkCancel();
        const b64 = chunkBase64[i];
        try {
          const pdf = await PDFDocument.load(Buffer.from(b64, 'base64'));
          const pages = await merged.copyPages(pdf, pdf.getPageIndices());
          pages.forEach(p => merged.addPage(p));
          console.log('[PDF] Chunk fusionado (memoria)', i, 'páginas añadidas:', pages.length);
        } catch (e) {
          console.warn('Fallo al fusionar chunk (memoria) index', i, e);
        }
        progressCb?.(`Fusionando chunk ${i + 1}/${chunkBase64.length}`, 0.55 + 0.35 * ((i + 1) / chunkBase64.length));
      }
      const mergedBytes = await merged.save();
      const expectedPages = pagesArray.length + 1; // +1 final table (incluída en pagesArray? ajustar si ya incluida)
      let realPages = 0;
      try {
        const verifyDoc = await PDFDocument.load(mergedBytes);
        realPages = verifyDoc.getPageCount();
      } catch (e) {
        console.warn('[PDF] No se pudo verificar conteo de páginas merged', e);
      }
      if (realPages && realPages < expectedPages) {
        console.warn(`[PDF] Mismatch páginas merged real=${realPages} esperado≈${expectedPages}. Intentando reconstrucción incremental.`);
        try {
          const rebuilt = await PDFDocument.create();
          for (let i = 0; i < chunkBase64.length; i++) {
            try {
              const pdf = await PDFDocument.load(Buffer.from(chunkBase64[i], 'base64'));
              const idxs = pdf.getPageIndices();
              const pages = await rebuilt.copyPages(pdf, idxs);
              pages.forEach(p=>rebuilt.addPage(p));
            } catch (e) { console.warn('[PDF] Falla reconstrucción chunk', i, e); }
          }
          const rbBytes = await rebuilt.save();
          const rbDoc = await PDFDocument.load(rbBytes);
          const rbCount = rbDoc.getPageCount();
            if (rbCount >= realPages) {
              console.log('[PDF] Reconstrucción exitosa páginas=', rbCount);
              // Reasignar mergedBytes
              (mergedBytes as any).set?.(rbBytes) // noop si no existe
              // Usar copia reconstruida
              // Simplemente reusar variable
              // @ts-ignore
              mergedBytes = rbBytes;
              realPages = rbCount;
            }
        } catch (e) { console.warn('[PDF] Reconstrucción fallida', e); }
      }
      const mergedB64 = Buffer.from(mergedBytes).toString('base64');
      // Intentar persistir si hay FS; si no, generar un data URL y usar Print para obtener un file temporal
      let wrote = false;
      try {
  const hasRNFS = Platform.OS === 'ios' && (function(){ try { return !!require('../utils/platformFS').PFS; } catch { return false; } })();
  const expoFS: any = FileSystem as any;
  const docDirPrimary = hasRNFS ? require('../utils/platformFS').PFS.documentDir() : (expoFS.documentDirectory || '');
  const docDirFallback = expoFS.cacheDirectory || '';
  const docDir = docDirPrimary || docDirFallback;
        if (docDir) {
          const out = `${docDir}${competence.name}-${competence.date.split('T')[0]}-merged.pdf`;
          if (hasRNFS) {
            try { await require('../utils/platformFS').PFS.writeFileBase64(out, mergedB64); finalUri = out; wrote = true; } catch (e) { console.warn('No se pudo escribir merged RNFS', e); }
          } else {
            try { await (FileSystem as any).writeAsStringAsync(out, mergedB64, { encoding: 'base64' }); finalUri = out; wrote = true; } catch (e) { console.warn('No se pudo escribir merged ExpoFS', e); }
            if (!wrote && docDirFallback) {
              const out2 = `${docDirFallback}${competence.name}-${competence.date.split('T')[0]}-merged.pdf`;
              try { await (FileSystem as any).writeAsStringAsync(out2, mergedB64, { encoding: 'base64' }); finalUri = out2; wrote = true; } catch (e2) { console.warn('Fallback cacheDirectory falló', e2); }
            }
          }
        }
      } catch (e) {
        console.warn('Fallo al intentar escribir merged, se usará impresión temporal', e);
      }
      if (!wrote) {
        // Crear un PDF temporal vía data URL (embed base64 en un iframe HTML y print de nuevo)
        try {
          const tempHtml = `<html><body style="margin:0"><embed width="100%" height="100%" type="application/pdf" src="data:application/pdf;base64,${mergedB64}" /></body></html>`;
          const printed = await Print.printToFileAsync({ html: tempHtml, base64: true });
          if (printed?.uri) { finalUri = printed.uri; }
          else { finalUri = chunkUris[0]; console.warn('[PDF] Fallback a primer chunk por falla en impresión temporal'); }
        } catch (e) {
          console.warn('Fallo ruta temporal de impresión, se intenta forzar primer chunk como último recurso', e);
          finalUri = chunkUris[0];
        }
      }
      console.log('[PDF] Merge completo. URI final:', finalUri);
      if (realPages && realPages < expectedPages) {
        console.warn(`[PDF] Advertencia: PDF final tiene ${realPages} páginas (< esperado ${expectedPages}).`);
      }
    }
  } else {
  const html = buildFullHTML(pagesArray, true);
    console.log('[PDF] Generando PDF en único archivo length=', html.length);
    progressCb?.('Generando PDF…', 0.4);
    const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });
    if (Platform.OS === 'ios' && (require('../utils/platformFS').PFS)) {
      // intentar copiar a docDir
      try {
        const out = require('../utils/platformFS').PFS.documentDir() + `${competence.name}-${competence.date.split('T')[0]}.pdf`;
        await require('../utils/platformFS').PFS.writeFileBase64(out, base64);
        finalUri = out;
      } catch (e) {
        console.warn('[PDF] No se pudo escribir archivo único en iOS RNFS, usando uri temporal');
        finalUri = uri;
      }
    } else {
      finalUri = uri;
    }
  }

  if (!finalUri) throw new Error('No se pudo generar el PDF');

  try {
    // Si ya está en destino final no copiamos.
    progressCb?.('Compartiendo…', 0.95);
    console.log('[PDF] Compartiendo archivo', finalUri);
    await shareAsync(finalUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    progressCb?.('Completado', 1);
    console.log('[PDF] Proceso completado');
    return finalUri;
  } catch (shareErr) {
    console.warn('Fallback share directo', shareErr);
    progressCb?.('Compartiendo (fallback)…', 0.95);
    await shareAsync(finalUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    progressCb?.('Completado', 1);
    return finalUri;
  }
};


// Export types for external use
export type { FinalTableData, MainTableWithRateGeneral };

