import * as Print from 'expo-print';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { 
  getCompetitionById, 
  getGymnastsByCompetition, 
  Competition, 
  Gymnast,
  getGymnastTracesAsJSON,
  getGymnastImages,
  GymnastImage
} from './database';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

export interface TableRow {
  id: number;
  numero: number;
  gymnasta: string;
  evento: string;
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
  eScore: number;
  dScore: number;
  eDelta: number;
  delta: number;
  percentage: number;
  comments: string;
}

/**
 * Genera un PDF con la tabla de resultados de la competencia
 */
export async function generateCompetitionPDF(
  competitionId: number,
  tableData: TableRow[]
): Promise<string> {
  try {
    console.log('[PDF] Iniciando generación de PDF para competencia:', competitionId);

    // Obtener información de la competencia
    const competition = await getCompetitionById(competitionId);
    if (!competition) {
      throw new Error('Competencia no encontrada');
    }

    // Obtener gimnastas con datos completos de la base de datos
    const gymnasts = await getGymnastsByCompetition(competitionId);

    // Generar HTML del PDF
    const html = await generatePDFHTML(competition, tableData, gymnasts);

    // Generar el PDF con un nombre único para evitar problemas de cache
    console.log('[PDF] Generando PDF...');
    const timestamp = Date.now();
    const fileName = `competition_${competitionId}_${timestamp}.pdf`;
    
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false
    });
    
    console.log('[PDF] PDF generado en:', uri);

    // Verificar que el archivo existe
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('El archivo PDF no se generó correctamente');
    }
    
    console.log('[PDF] Archivo verificado, tamaño:', fileInfo.size, 'bytes');

    return uri;
  } catch (error) {
    console.error('[PDF] Error al generar PDF:', error);
    throw error;
  }
}

/**
 * Carga la imagen del salto y la convierte a base64 para usar en el PDF
 */
async function getJumpImageBase64(): Promise<string> {
  try {
    // Cargar el asset de la imagen
    const asset = Asset.fromModule(require('../assets/images/Jump1.png'));
    await asset.downloadAsync();
    
    if (!asset.localUri) {
      console.warn('[PDF] No se pudo obtener URI local de la imagen');
      return '';
    }
    
    // Leer el archivo como base64
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.warn('[PDF] Error al cargar imagen del salto:', error);
    return '';
  }
}

/**
 * Renderiza las imágenes del gimnasta en SVG para el PDF
 */
async function renderGymnastImages(images: GymnastImage[], scaleX: number, scaleY: number, offsetX: number): Promise<string> {
  if (!images || images.length === 0) return '';
  
  try {
    const imageElements = await Promise.all(
      images.map(async (img) => {
        try {
          // Leer la imagen y convertirla a base64
          const base64 = await FileSystem.readAsStringAsync(img.image_uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          const imageData = `data:image/png;base64,${base64}`;
          
          // Escalar posición y tamaño con multiplicador de 1.5x
          const x = img.position_x * scaleX + offsetX;
          const y = img.position_y * scaleY;
          const width = 100 * img.scale * scaleX * 1.5; // Tamaño base de 100 con multiplicador 1.5x
          const height = 100 * img.scale * scaleY * 1.5;
          
          return `
            <image 
              x="${x}" 
              y="${y}" 
              width="${width}" 
              height="${height}" 
              href="${imageData}" 
              transform="rotate(${img.rotation}, ${x + width/2}, ${y + height/2})" 
              preserveAspectRatio="xMidYMid meet" 
            />
          `;
        } catch (error) {
          console.warn('[PDF] Error al cargar imagen:', img.image_uri, error);
          return '';
        }
      })
    );
    
    return imageElements.filter(el => el).join('\n');
  } catch (error) {
    console.warn('[PDF] Error al renderizar imágenes:', error);
    return '';
  }
}

/**
 * Renderiza los paths del whiteboard en formato SVG
 */
/**
 * Escala un path SVG por un factor dado y lo centra
 */
function scaleSVGPath(pathString: string, scaleX: number, scaleY: number, offsetX: number = 0, offsetY: number = 0): string {
  if (!pathString) return '';
  
  // Expresión regular para encontrar comandos y números en el path
  const pathRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let scaledPath = '';
  let match;
  
  while ((match = pathRegex.exec(pathString)) !== null) {
    const command = match[1];
    const coords = match[2].trim();
    
    if (!coords) {
      scaledPath += command;
      continue;
    }
    
    // Separar los números
    const numbers = coords.split(/[,\s]+/).filter(n => n && !isNaN(parseFloat(n))).map(n => parseFloat(n));
    
    // Escalar según el comando
    const scaledNumbers: number[] = [];
    const isAbsolute = command === command.toUpperCase();
    
    for (let i = 0; i < numbers.length; i += 2) {
      if (i + 1 < numbers.length) {
        // Para comandos absolutos, aplicar offset; para relativos, no
        const x = numbers[i] * scaleX + (isAbsolute ? offsetX : 0);
        const y = numbers[i + 1] * scaleY + (isAbsolute ? offsetY : 0);
        scaledNumbers.push(x);
        scaledNumbers.push(y);
      } else if (command.toUpperCase() === 'H') {
        // Comando horizontal - solo escalar X
        const x = numbers[i] * scaleX + (isAbsolute ? offsetX : 0);
        scaledNumbers.push(x);
      } else if (command.toUpperCase() === 'V') {
        // Comando vertical - solo escalar Y
        const y = numbers[i] * scaleY + (isAbsolute ? offsetY : 0);
        scaledNumbers.push(y);
      } else {
        scaledNumbers.push(numbers[i] * scaleX);
      }
    }
    
    scaledPath += command + scaledNumbers.join(',');
  }
  
  return scaledPath || pathString; // Si falla, devolver original
}

function renderWhiteboardPaths(pathsString: string): string {
  if (!pathsString || pathsString.trim() === '') return '';
  
  try {
    const pathsData = JSON.parse(pathsString);
    if (!Array.isArray(pathsData) || pathsData.length === 0) return '';
    
    // Tamaño original del whiteboard en la app
    const originalWidth = 1300;
    const originalHeight = 780;
    
    // Tamaño del SVG en el PDF
    const pdfWidth = 650;
    const pdfHeight = 390;
    
    // Factor de escala
    const scaleX = pdfWidth / originalWidth;
    const scaleY = pdfHeight / originalHeight;
    
    // Offset para centrar (como en el componente whiteboard)
    // Ajustado: mover a la derecha y el doble hacia abajo
    const baseOffsetX = (pdfWidth - (originalWidth * scaleX)) / 2;
    const offsetX = baseOffsetX + 30; // Mover 30px a la derecha
    const offsetY = 60; // Mover 60px hacia abajo (el doble de 30)
    
    return pathsData.map((pathData: any) => {
      let color = pathData.color || '#000000';
      const strokeWidth = (pathData.strokeWidth || 2) * scaleX; // Escalar grosor también
      const path = pathData.path || '';
      const isEraser = pathData.isEraser || false;
      
      // Si es borrador o el color es blanco/muy claro, usar el MISMO gris del fondo
      if (isEraser || color === '#FFFFFF' || color === '#ffffff' || color === 'white') {
        color = '#f9f9f9'; // Mismo color que el fondo
      }
      
      if (!path) return '';
      
      // Escalar el path con offset de centrado
      const scaledPath = scaleSVGPath(path, scaleX, scaleY, offsetX, offsetY);
      
      return `<path d="${scaledPath}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('\n');
  } catch (error) {
    console.warn('[PDF] Error parsing whiteboard paths:', error);
    return '';
  }
}

/**
 * Genera y comparte el PDF de la competencia
 */
export async function generateAndSharePDF(
  competitionId: number,
  tableData: TableRow[]
): Promise<void> {
  let pdfUri: string | null = null;
  
  try {
    // Generar el PDF
    pdfUri = await generateCompetitionPDF(competitionId, tableData);
    
    console.log('[PDF] Preparando para compartir PDF desde:', pdfUri);
    
    // Verificar que el archivo existe antes de compartir
    const fileInfo = await FileSystem.getInfoAsync(pdfUri);
    if (!fileInfo.exists) {
      throw new Error('El archivo PDF no existe');
    }
    
    console.log('[PDF] Verificando disponibilidad de sharing...');
    
    // Verificar si sharing está disponible
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      console.error('[PDF] Sharing no está disponible en este dispositivo');
      throw new Error('La función de compartir no está disponible en este dispositivo');
    }
    
    console.log('[PDF] Sharing disponible, creando copia en Downloads...');
    
    // Crear una copia del PDF en el directorio de documentos
    const fileName = `Competition_${competitionId}_${Date.now()}.pdf`;
    const newPath = `${FileSystem.documentDirectory}${fileName}`;
    
    // Copiar el archivo
    await FileSystem.copyAsync({
      from: pdfUri,
      to: newPath
    });
    
    console.log('[PDF] PDF copiado a:', newPath);
    
    // Compartir el PDF desde la nueva ubicación
    console.log('[PDF] Abriendo diálogo para compartir...');
    
    await Sharing.shareAsync(newPath, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir Reporte de Competencia',
      UTI: 'com.adobe.pdf'
    });
    
    console.log('[PDF] PDF compartido exitosamente');
    
    // Limpiar el archivo temporal después de compartir
    try {
      await FileSystem.deleteAsync(pdfUri, { idempotent: true });
      console.log('[PDF] Archivo temporal eliminado');
    } catch (cleanupError) {
      console.warn('[PDF] No se pudo eliminar el archivo temporal:', cleanupError);
    }
    
  } catch (error: any) {
    const errorMsg = error?.message || '';
    console.error('[PDF] Error en generateAndSharePDF:', errorMsg);
    
    // Si el error es por cancelación del usuario, re-lanzarlo
    if (errorMsg.includes('cancel') || errorMsg.includes('dismiss') || errorMsg.includes('User cancelled')) {
      console.log('[PDF] Usuario canceló el share');
      throw error;
    }
    
    // Para otros errores, también re-lanzar
    throw error;
  }
}

/**
 * Genera una página individual para Floor
 */
async function generateFloorPage(row: TableRow, gymnast: Gymnast | undefined): Promise<string> {
  const elements = ['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  const selectedElements = elements.filter(code => (row[code.toLowerCase() as keyof TableRow] as number) > 0);
  
  // Obtener traces del whiteboard si existe el gimnasta
  let whiteboardPaths = '';
  let gymnastImagesHTML = '';
  
  if (gymnast) {
    try {
      const tracesJSON = await getGymnastTracesAsJSON(gymnast.id);
      whiteboardPaths = renderWhiteboardPaths(tracesJSON);
      
      // Obtener imágenes del gimnasta
      const images = await getGymnastImages(gymnast.id);
      if (images.length > 0) {
        // Parámetros de escala (mismos que en renderWhiteboardPaths)
        const scaleX = 650 / 1300;
        const scaleY = 390 / 780;
        const offsetX = (650 - (1300 * scaleX)) / 2;
        gymnastImagesHTML = await renderGymnastImages(images, scaleX, scaleY, offsetX);
      }
    } catch (error) {
      console.warn('[PDF] Error getting traces for gymnast:', gymnast.id, error);
    }
  }
  
  return `
    <div class="page">
      <div class="header">
        <h1>Floor - ${row.gymnasta}</h1>
        <p>${row.noc} | Bib: ${row.bib}</p>
      </div>
      
      <div class="gymnast-info-box">
        <strong>Number:</strong> ${row.numero} | 
        <strong>Gymnast:</strong> ${row.gymnasta || 'N/A'} | 
        <strong>NOC:</strong> ${row.noc || 'N/A'} | 
        <strong>Event:</strong> ${row.evento || 'FX'} | 
        <strong>BIB:</strong> ${row.bib || 'N/A'}
      </div>

      <!-- Whiteboard Section -->
      <div class="whiteboard-section">
        <h3>📝 Judge's Whiteboard</h3>
        <svg class="whiteboard-canvas" viewBox="0 0 650 390" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <rect width="650" height="390" fill="#f9f9f9" />
          
          <!-- Capa 1: Paths (nivel más bajo) -->
          ${whiteboardPaths}
          
          <!-- Capa 2: Imágenes del gimnasta (nivel más alto) -->
          ${gymnastImagesHTML}
        </svg>
      </div>

      <div class="tables-section">
        <!-- Difficulty Values Table -->
        <div>
          <div class="section-title">DIFFICULTY VALUES</div>
          <table class="code-table">
            <tbody>
              ${['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'].map(code => {
                const value = row[code.toLowerCase() as keyof TableRow] as number;
                return `
                  <tr class="element-row">
                    <td class="code-cell ${value > 0 ? 'selected' : ''}">${code}</td>
                    ${[1, 2, 3, 4, 5, 6, 7, 8].map(num => 
                      `<td class="number-cell ${value === num ? 'selected' : ''}">${num}</td>`
                    ).join('')}
                    <td class="sel-cell ${value > 0 ? 'selected' : ''}">${value}</td>
                    <td class="selected-value ${value > 0 ? 'has-selection' : ''}">${code}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Scores Info Table -->
        <div>
          <table class="info-table">
            <tr>
              <td class="info-label">NUMBER OF ELEMENTS</td>
              <td class="info-value ${row.dv >= 6 && row.dv <= 8 ? 'green' : 'red'}">${row.dv.toFixed(0)}</td>
            </tr>
            <tr>
              <td class="info-label">DIFFICULTY VALUES</td>
              <td class="info-value">${row.dv.toFixed(1)}</td>
            </tr>
            <tr>
              <td class="info-label">ELEMENT GROUPS</td>
              <td class="info-value">${row.eg.toFixed(1)}</td>
            </tr>
            <tr>
              <td class="info-label">SCORES</td>
              <td class="score-groups-cell">
                <div class="score-mini-grid">
                  <div><span class="score-label">CV:</span> ${row.cv.toFixed(1)}</div>
                  <div><span class="score-label">SB:</span> ${row.sb.toFixed(1)}</div>
                  <div><span class="score-label">ND:</span> ${row.nd.toFixed(1)}</div>
                  <div><span class="score-label">SV:</span> ${row.sv.toFixed(1)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td class="info-label">EXECUTION</td>
              <td class="info-value">${row.eScore.toFixed(3)}</td>
            </tr>
            <tr>
              <td class="info-label">MY SCORE</td>
              <td class="info-value orange">${(row.eScore + row.dScore).toFixed(3)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Competition Section -->
      <div class="competition-section">
        <div class="comp-row">
          <div class="comp-label">COMPETITION</div>
          <div class="comp-cell">D</div>
          <div class="comp-value">${row.dScore.toFixed(1)}</div>
          <div class="comp-cell">E</div>
          <div class="comp-value">${row.eScore.toFixed(3)}</div>
          <div class="comp-cell">SB</div>
          <div class="comp-value">${row.sb.toFixed(1)}</div>
          <div class="comp-cell">ND</div>
          <div class="comp-value">${row.nd.toFixed(1)}</div>
          <div class="comp-cell">SCORE</div>
          <div class="comp-value">${(row.eScore + row.dScore).toFixed(3)}</div>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="comments-section">
        <h3>💬 Judge's Comments</h3>
        <div class="comments-text">${row.comments || 'No comments for this routine.'}</div>
      </div>
    </div>
  `;
}

/**
 * Genera una página individual para Vault
 */
async function generateVaultPage(row: TableRow, gymnast: Gymnast | undefined): Promise<string> {
  // Obtener traces del whiteboard si existe el gimnasta
  let whiteboardPaths = '';
  let gymnastImagesHTML = '';
  
  if (gymnast) {
    try {
      const tracesJSON = await getGymnastTracesAsJSON(gymnast.id);
      whiteboardPaths = renderWhiteboardPaths(tracesJSON);
      
      // Obtener imágenes del gimnasta
      const images = await getGymnastImages(gymnast.id);
      if (images.length > 0) {
        // Parámetros de escala (mismos que en renderWhiteboardPaths)
        const scaleX = 650 / 1300;
        const scaleY = 390 / 780;
        const offsetX = (650 - (1300 * scaleX)) / 2;
        gymnastImagesHTML = await renderGymnastImages(images, scaleX, scaleY, offsetX);
      }
    } catch (error) {
      console.warn('[PDF] Error getting traces for gymnast:', gymnast.id, error);
    }
  }
  
  // Cargar imagen del salto como base64
  const jumpImageBase64 = await getJumpImageBase64();
  
  return `
    <div class="page">
      <div class="header">
        <h1>Vault - ${row.gymnasta}</h1>
        <p>${row.noc} | Bib: ${row.bib}</p>
      </div>
      
      <div class="gymnast-info-box">
        <strong>Number:</strong> ${row.numero} | 
        <strong>Gymnast:</strong> ${row.gymnasta || 'N/A'} | 
        <strong>NOC:</strong> ${row.noc || 'N/A'} | 
        <strong>Event:</strong> ${row.evento || 'VT'} | 
        <strong>BIB:</strong> ${row.bib || 'N/A'} |
        <strong>Execution Performance:</strong> ${row.percentage.toFixed(1)}%
      </div>

      <!-- Whiteboard Section with Jump Background -->
      <div class="whiteboard-section">
        <h3>📝 Judge's Whiteboard</h3>
        <svg class="whiteboard-canvas" viewBox="0 0 650 390" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <rect width="650" height="390" fill="#f9f9f9" />
          
          <!-- Capa 1: Paths (nivel más bajo) -->
          ${whiteboardPaths}
          
          ${jumpImageBase64 ? `
          <!-- Capa 2: Imagen del trampolín (nivel medio) -->
          <image 
            x="${(650 - 650 * 0.9) / 2}" 
            y="0" 
            width="${650 * 0.9}" 
            height="390" 
            href="${jumpImageBase64}" 
            opacity="0.6" 
            preserveAspectRatio="xMidYMid meet" 
          />
          ` : ''}
          
          <!-- Capa 3: Imágenes del gimnasta (nivel más alto) -->
          ${gymnastImagesHTML}
        </svg>
      </div>

      <div class="tables-section">
        <!-- Vault Information -->
        <div>
          <div class="section-title">ANNOUNCED VAULT</div>
          <table class="vault-table">
            <tbody>
              <tr class="vault-info-row">
                <td class="vault-label">VAULT NUMBER</td>
                <td class="vault-value">${gymnast?.vault || 'N/A'}</td>
              </tr>
              <tr class="vault-info-row">
                <td class="vault-label">START VALUE</td>
                <td class="vault-value">${gymnast?.vault_value?.toFixed(1) || row.sv.toFixed(1)}</td>
              </tr>
              <tr class="vault-info-row">
                <td class="vault-label">DESCRIPTION</td>
                <td class="vault-value">${gymnast?.vault_description || 'No description'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Scoring Information -->
        <div>
          <table class="info-table">
            <tr>
              <td class="info-label">SCORES</td>
              <td class="score-groups-cell">
                <div class="score-mini-grid">
                  <div><span class="score-label">SV:</span> ${row.sv.toFixed(1)}</div>
                  <div><span class="score-label">ND:</span> ${row.nd.toFixed(1)}</div>
                  <div><span class="score-label">SB:</span> ${row.sb.toFixed(1)}</div>
                  <div><span class="score-label">EXEC:</span> ${row.eScore.toFixed(1)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td class="info-label">E SCORE</td>
              <td class="info-value">${row.eScore.toFixed(3)}</td>
            </tr>
            <tr>
              <td class="info-label">MY SCORE</td>
              <td class="info-value orange">${(row.eScore + row.dScore).toFixed(3)}</td>
            </tr>
            <tr>
              <td class="info-label">EXECUTION PERFORMANCE</td>
              <td class="info-value">${row.percentage.toFixed(1)}%</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Competition Section -->
      <div class="competition-section">
        <div class="comp-row">
          <div class="comp-label">COMPETITION</div>
          <div class="comp-cell">D</div>
          <div class="comp-value">${row.dScore.toFixed(1)}</div>
          <div class="comp-cell">E</div>
          <div class="comp-value">${row.eScore.toFixed(3)}</div>
          <div class="comp-cell">SB</div>
          <div class="comp-value">${row.sb.toFixed(1)}</div>
          <div class="comp-cell">ND</div>
          <div class="comp-value">${row.nd.toFixed(1)}</div>
          <div class="comp-cell">SCORE</div>
          <div class="comp-value">${(row.eScore + row.dScore).toFixed(3)}</div>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="comments-section">
        <h3>💬 Judge's Comments</h3>
        <div class="comments-text">${row.comments || 'No comments for this vault.'}</div>
      </div>
    </div>
  `;
}

/**
 * Genera el HTML para el PDF
 */
async function generatePDFHTML(competition: Competition, tableData: TableRow[], gymnasts: Gymnast[]): Promise<string> {
  const formattedDate = new Date(competition.date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calcular estadísticas
  const totalParticipants = tableData.filter(p => p.eScore > 0).length;
  const avgPercentage = totalParticipants > 0 
    ? (tableData.filter(p => p.eScore > 0).reduce((sum, p) => sum + p.percentage, 0) / totalParticipants).toFixed(2)
    : '0.00';
  const minPercentage = totalParticipants > 0
    ? Math.min(...tableData.filter(p => p.eScore > 0).map(p => p.percentage))
    : 0;

  // Generar páginas individuales para TODOS los gimnastas (incluyendo VT)
  const individualPagesPromises = tableData
    .filter(row => row.gymnasta && row.gymnasta.trim() !== '')
    .map(async (row) => {
      const gymnast = gymnasts.find(g => g.id === row.id);
      const isVault = row.evento === 'VT';
      return isVault ? await generateVaultPage(row, gymnast) : await generateFloorPage(row, gymnast);
    });
  
  const individualPages = (await Promise.all(individualPagesPromises)).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 9px;
          line-height: 1.4;
          color: #333;
          background: #f5f5f5;
          padding: 20px;
        }
        
        .page {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          page-break-after: always;
          margin-bottom: 20px;
        }

        .individual-page {
          background: #f9f9f9;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #0052b4, #004aad);
          color: white;
          padding: 20px;
          border-radius: 8px;
        }

        .individual-header {
          background: linear-gradient(135deg, #28a745, #218838);
        }
        
        .header h1 {
          font-size: 24px;
          margin-bottom: 8px;
          font-weight: bold;
        }
        
        .header h2 {
          font-size: 16px;
          opacity: 0.95;
        }
        
        .header p {
          font-size: 14px;
          opacity: 0.9;
        }

        .gymnast-info-box {
          background: #e8f4ff;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          border-left: 4px solid #0052b4;
          font-size: 10px;
          font-weight: 600;
        }
        
        .competition-info {
          background: #e8f4ff;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          border-left: 4px solid #0052b4;
        }
        
        .competition-info h2 {
          color: #0052b4;
          margin-bottom: 10px;
          font-size: 16px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        
        .info-item {
          background: white;
          padding: 10px;
          border-radius: 4px;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .info-label {
          font-size: 8px;
          color: #666;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        
        .info-value {
          font-size: 12px;
          font-weight: bold;
          color: #0052b4;
        }

        .tables-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .section-title {
          background: #0052b4;
          color: white;
          text-align: center;
          padding: 8px;
          font-weight: bold;
          font-size: 11px;
          border-radius: 4px 4px 0 0;
        }

        .code-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 0 0 4px 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 8px;
        }

        .code-table td {
          border: 1px solid #ddd;
          padding: 4px;
          text-align: center;
          font-weight: bold;
        }

        .element-row {
          background: #a9def9;
        }

        .code-cell {
          background: #a9def9;
          color: #333;
          width: 30px;
        }

        .code-cell.selected {
          background: #28a745 !important;
          color: white !important;
        }

        .number-cell {
          background: #a9def9;
          color: #333;
          width: 25px;
        }

        .number-cell.selected {
          background: #28a745 !important;
          color: white !important;
        }

        .sel-cell {
          background: #a9def9;
          color: #333;
          width: 30px;
        }

        .sel-cell.selected {
          background: #28a745 !important;
          color: white !important;
        }

        .selected-value {
          background: #6B9BDF;
          color: white;
          width: 30px;
        }

        .selected-value.has-selection {
          background: #28a745 !important;
          color: white !important;
        }

        .vault-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 9px;
        }

        .vault-table td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: center;
          font-weight: bold;
        }

        .vault-info-row {
          background: #a9def9;
        }

        .vault-label {
          background: #a9def9;
          color: #333;
          text-align: right;
          width: 150px;
        }

        .vault-value {
          background: #6B9BDF;
          color: white;
          font-weight: bold;
        }

        .info-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 9px;
          border: 1px solid #ddd;
        }

        .info-table tr {
          min-height: 25px;
        }

        .info-table .info-label {
          background: #a9def9;
          padding: 6px 8px;
          font-weight: bold;
          text-align: right;
          width: 140px;
          border: 1px solid #ddd;
          font-size: 9px;
          color: #333;
        }

        .info-table .info-value {
          background: #6B9BDF;
          padding: 6px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #ddd;
          font-size: 11px;
          color: white;
        }

        .info-table .info-value.green {
          background: #28a745;
        }

        .info-table .info-value.red {
          background: #dc3545;
        }

        .info-table .info-value.orange {
          background: #ffc107;
          color: #333;
        }

        .score-groups-cell {
          background: #6B9BDF;
          padding: 4px;
          border: 1px solid #ddd;
        }

        .score-mini-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
        }

        .score-mini-grid > div {
          background: white;
          padding: 4px;
          border-radius: 3px;
          text-align: center;
          font-size: 9px;
          font-weight: bold;
        }

        .score-label {
          color: #666;
          font-weight: normal;
          font-size: 8px;
        }

        .competition-section {
          background: white;
          border-radius: 6px;
          margin: 0 auto 15px auto;
          max-width: 600px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .comp-row {
          display: flex;
          min-height: 28px;
        }

        .comp-label {
          background: #28a745;
          color: white;
          text-align: center;
          padding: 6px 8px;
          font-weight: bold;
          width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }

        .comp-cell {
          flex: 1;
          background: #d9d9d9;
          text-align: center;
          padding: 6px;
          font-weight: bold;
          border: 1px solid #999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }

        .comp-value {
          flex: 1;
          background: #28a745;
          color: white;
          text-align: center;
          padding: 6px;
          font-weight: bold;
          border: 1px solid #1e7e34;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }

        .comments-section {
          background: white;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .comments-section h3 {
          color: #0052b4;
          margin-bottom: 8px;
          border-bottom: 2px solid #0052b4;
          padding-bottom: 4px;
          font-size: 12px;
        }

        .comments-text {
          font-size: 10px;
          line-height: 1.4;
          text-align: justify;
          color: #555;
        }
        
        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th {
          background: #0052b4;
          color: white;
          padding: 10px 6px;
          text-align: center;
          font-weight: bold;
          font-size: 8px;
          border-right: 1px solid rgba(255,255,255,0.2);
        }
        
        th:last-child {
          border-right: none;
        }
        
        td {
          padding: 8px 6px;
          text-align: center;
          border-bottom: 1px solid #e0e0e0;
          border-right: 1px solid #e0e0e0;
          font-size: 8px;
        }
        
        td:last-child {
          border-right: none;
        }
        
        tbody tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        tbody tr:hover {
          background: #f0f7ff;
        }
        
        .gymnast-name {
          text-align: left !important;
          font-weight: bold;
          padding-left: 10px !important;
        }
        
        .percentage-high {
          background: #d4edda !important;
          color: #155724;
          font-weight: bold;
        }
        
        .percentage-medium {
          background: #fff3cd !important;
          color: #856404;
          font-weight: bold;
        }
        
        .percentage-low {
          background: #f8d7da !important;
          color: #721c24;
          font-weight: bold;
        }
        
        .text-green {
          color: #28a745;
          font-weight: bold;
        }
        
        .text-yellow {
          color: #ffc107;
          font-weight: bold;
        }
        
        .text-red {
          color: #dc3545;
          font-weight: bold;
        }
        
        .statistics {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .statistics h3 {
          color: #0052b4;
          margin-bottom: 15px;
          font-size: 16px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        
        .stat-box {
          text-align: center;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 2px solid #e0e0e0;
        }
        
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #0052b4;
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
        }

        .comments-summary {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .comments-summary h3 {
          color: #0052b4;
          margin-bottom: 15px;
          font-size: 16px;
          border-bottom: 2px solid #0052b4;
          padding-bottom: 8px;
        }

        .comment-item {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          border-left: 4px solid #0052b4;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 11px;
        }

        .comment-header strong {
          color: #333;
          font-size: 12px;
        }

        .comment-event {
          background: #0052b4;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
        }

        .comment-body {
          font-size: 11px;
          line-height: 1.5;
          color: #555;
          text-align: justify;
        }

        .no-comments {
          text-align: center;
          color: #999;
          font-style: italic;
          padding: 20px;
          font-size: 12px;
        }
        
        .whiteboard-section {
          background: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .whiteboard-section h3 {
          color: #0052b4;
          margin-bottom: 10px;
          border-bottom: 2px solid #0052b4;
          padding-bottom: 4px;
          font-size: 12px;
        }

        .whiteboard-canvas {
          width: 70%;
          height: auto;
          max-width: 650px;
          margin: 0 auto;
          display: block;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background: #f9f9f9;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 2px solid #e0e0e0;
          font-size: 8px;
          color: #666;
        }
        
        .footer p {
          margin: 3px 0;
        }
        
        @media print {
          body {
            background: white;
            padding: 10px;
          }
          
          .page {
            box-shadow: none;
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body>
      ${individualPages}

      <div class="page">
        <div class="header">
          <h1>${competition.name}</h1>
          <p>${formattedDate} | ${competition.gender ? 'MAG' : 'WAG'}</p>
        </div>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-number">${totalParticipants}</div>
            <div class="stat-label">Participantes</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${avgPercentage}%</div>
            <div class="stat-label">Promedio</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${minPercentage}%</div>
            <div class="stat-label">Mínimo</div>
          </div>
        </div>
        
        <!-- Results Table -->
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Gimnasta</th>
                <th>Evento</th>
                <th>NOC</th>
                <th>BIB</th>
                <th>J</th>
                <th>I</th>
                <th>H</th>
                <th>G</th>
                <th>F</th>
                <th>E</th>
                <th>D</th>
                <th>C</th>
                <th>B</th>
                <th>A</th>
                <th>DV</th>
                <th>EG</th>
                <th>SB</th>
                <th>ND</th>
                <th>CV</th>
                <th>SV</th>
                <th>E Score</th>
                <th>D Score</th>
                <th>E Δ</th>
                <th>Δ</th>
                <th>%</th>
                <th>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              ${tableData.map(row => {
                let percentageClass = '';
                if (row.percentage >= 88) percentageClass = 'percentage-high';
                else if (row.percentage >= 70) percentageClass = 'percentage-medium';
                else if (row.percentage > 0) percentageClass = 'percentage-low';
                
                // Validation for DV (6-8 range)
                let dvClass = '';
                if (row.dv >= 6 && row.dv <= 8) dvClass = 'text-green';
                else dvClass = 'text-red';
                
                // Validation for Delta (absolute value)
                let deltaClass = '';
                const absDelta = Math.abs(row.delta);
                if (absDelta <= 0.5) deltaClass = 'text-green';
                else if (absDelta <= 1.0) deltaClass = 'text-yellow';
                else deltaClass = 'text-red';
                
                // Validation for Percentage
                let percentageTextClass = '';
                if (row.percentage >= 90) percentageTextClass = 'text-green';
                else if (row.percentage >= 70) percentageTextClass = 'text-yellow';
                else percentageTextClass = 'text-red';
                
                return `
                  <tr>
                    <td>${row.numero}</td>
                    <td class="gymnast-name">${row.gymnasta || '-'}</td>
                    <td>${row.evento || '-'}</td>
                    <td>${row.noc || '-'}</td>
                    <td>${row.bib || '-'}</td>
                    <td>${row.j}</td>
                    <td>${row.i}</td>
                    <td>${row.h}</td>
                    <td>${row.g}</td>
                    <td>${row.f}</td>
                    <td>${row.e}</td>
                    <td>${row.d}</td>
                    <td>${row.c}</td>
                    <td>${row.b}</td>
                    <td>${row.a}</td>
                    <td class="${dvClass}">${row.dv.toFixed(1)}</td>
                    <td>${row.eg.toFixed(1)}</td>
                    <td>${row.sb.toFixed(1)}</td>
                    <td>${row.nd.toFixed(1)}</td>
                    <td>${row.cv.toFixed(1)}</td>
                    <td>${row.sv.toFixed(1)}</td>
                    <td>${row.eScore.toFixed(3)}</td>
                    <td>${row.dScore.toFixed(2)}</td>
                    <td>${row.eDelta.toFixed(2)}</td>
                    <td class="${deltaClass}">${row.delta.toFixed(2)}</td>
                    <td class="${percentageTextClass}">${row.percentage.toFixed(1)}%</td>
                    <td style="text-align: left; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${row.comments || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Statistics -->
        <div class="statistics">
          <h3>📊 Estadísticas de la Competencia</h3>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-number">${totalParticipants}</div>
              <div class="stat-label">Total Participantes</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${avgPercentage}%</div>
              <div class="stat-label">Promedio General</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${minPercentage}%</div>
              <div class="stat-label">Porcentaje Mínimo</div>
            </div>
          </div>
        </div>
        
        <!-- Comments Summary Section -->
        <div class="comments-summary">
          <h3>💬 Resumen de Comentarios</h3>
          ${tableData
            .filter(row => row.comments && row.comments.trim() !== '')
            .map(row => `
              <div class="comment-item">
                <div class="comment-header">
                  <strong>No. ${row.numero} - ${row.gymnasta}</strong>
                  <span class="comment-event">${row.evento || '-'}</span>
                </div>
                <div class="comment-body">${row.comments}</div>
              </div>
            `).join('') || '<p class="no-comments">No hay comentarios registrados para esta competencia.</p>'}
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p><strong>Generado por GymJudge</strong> el ${new Date().toLocaleString('es-ES')}</p>
          <p>© ${new Date().getFullYear()} GymJudge. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
