import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

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
const getJumpImageBase64 = async (): Promise<string | null> => {
  try {
    // Import the asset
    const asset = Asset.fromModule(require('../assets/images/Jump.png'));
    
    // Download the asset if it's not already cached
    await asset.downloadAsync();
    
    // Read the file and convert to base64
    const base64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Return as data URL
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error loading jump image:', error);
    return null;
  }
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
export const generateAndShareMainFloorPDF = async (data?: MainTableWithRateGeneral) => {
  try {
    const pdfUri = await generateMainFloorPDF(data);
    await shareAsync(pdfUri, { 
      UTI: '.pdf', 
      mimeType: 'application/pdf' 
    });
    return pdfUri;
  } catch (error) {
    console.error('Error generating and sharing PDF:', error);
    throw error;
  }
};


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
  competence: Competence
) => {
  console.log('Generating comprehensive PDF...');
  
  if (!individualData || !Array.isArray(individualData) || individualData.length === 0) {
    throw new Error('No individual data provided for PDF generation');
  }

  // Get the base64 image for vault pages
  const jumpImageBase64 = await getJumpImageBase64();

  // Function to render whiteboard paths (reuse from existing functions)
  const renderWhiteboardPaths = (pathsString: string) => {
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
        const pathCenterX = minX + pathWidth / 2;
        const pathCenterY = minY + pathHeight / 2;
        
        const rightShift = 150; // Move paths 100 units to the right
        const offsetX = centerX - pathCenterX + rightShift;
        const offsetY = centerY - pathCenterY;
        
        transformGroup = `<g transform="translate(${offsetX}, ${offsetY})">`;
      }
      
      const pathElements = paths.map((pathData, index) => {
        let scaledPath = pathData.path;
        
        if (pathData.path) {
          scaledPath = pathData.path.replace(/([ML])\s*([0-9.-]+)\s*([0-9.-]+)/g, (match: string, command: string, x: string, y: string) => {
            const scaledX = parseFloat(x) * 1;
            const scaledY = parseFloat(y) * 1;
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
      
      // Wrap paths in transform group if we have valid centering
      if (transformGroup) {
        return transformGroup + pathElements + '</g>';
      } else {
        return pathElements;
      }
    } catch (error) {
      console.error('Error parsing paths:', error);
      return '';
    }
  };

  // Generate individual pages HTML using the exact same logic from the existing functions
  const individualPagesHTML = individualData.map((gymnast, index) => {
    const isVault = gymnast.event === "VT";
    
    if (isVault) {
      // Use exact vault layout from generateMainJumpPDF
      return `
        <div class="page">
          <div class="header">
            <h1>🏅 GymJudge - Vault Report</h1>
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
              ${renderWhiteboardPaths(gymnast.rateGeneral?.paths || '')}

              ${jumpImageBase64 ? `
                <image href="${jumpImageBase64}" 
                       width="1000" height="663" x="97" y="65" opacity="0.6" />
              ` : `
                <!-- Fallback: Simple vault layout -->
                <rect x="100" y="300" width="1100" height="180" fill="#f0f0f0" stroke="#ccc" stroke-width="2" rx="10"/>
                <rect x="600" y="320" width="100" height="140" fill="#e0e0e0" stroke="#999" stroke-width="2" rx="5"/>
                <rect x="800" y="280" width="400" height="220" fill="#e8f4e8" stroke="#999" stroke-width="2" rx="10"/>
              `}
            </svg>
          </div>
          
          <!-- Tables Section Below Whiteboard -->
          <div class="tables-section">
            <!-- Vault Information Table -->
            <div>
              <div class="vault-table-header">Vault Information</div>
              <table class="vault-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="vault-info-row">
                    <td>Vault Number</td>
                    <td class="vault-info-value">${gymnast.rateGeneral?.vaultNumber || 'N/A'}</td>
                  </tr>
                  <tr class="vault-info-row">
                    <td>Start Value</td>
                    <td class="vault-info-value">${(gymnast.sv || 0).toFixed(1)}</td>
                  </tr>
                  <tr class="vault-info-row">
                    <td>Description</td>
                    <td class="vault-info-value">${gymnast.rateGeneral?.vaultDescription || 'No description'}</td>
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
                      <div class="score-value sb">${gymnast.rateGeneral?.stickBonus ? '0.1' : '0.0'}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">EXEC</div>
                      <div class="score-value execution">${(gymnast.rateGeneral?.execution || 0).toFixed(1)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="info-label">E SCORE</td>
                  <td class="info-value">${(gymnast.rateGeneral?.eScore || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td class="info-label">MY SCORE</td>
                  <td class="info-value orange">${(gymnast.rateGeneral?.myScore || 0).toFixed(3)}</td>
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
              <div class="comp-value">${(gymnast.rateGeneral?.compD || 0).toFixed(1)}</div>
              <div class="comp-cell">E</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compE || 0).toFixed(3)}</div>
              <div class="comp-cell">SB</div>
              <div class="comp-value">${gymnast.rateGeneral?.compSd ? '0.1' : '0.0'}</div>
              <div class="comp-cell">ND</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compNd || gymnast.nd || 0).toFixed(1)}</div>
              <div class="comp-cell">SCORE</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compScore || 0).toFixed(3)}</div>
            </div>
          </div>
          
          <!-- Comments Section -->
          <div class="comments-section">
            <h3>💬 Judge Comments</h3>
            <div class="comments-text">
              ${gymnast.rateGeneral?.comments || 'No comments provided for this vault.'}
            </div>
          </div>
        </div>
      `;
    } else {
      // Use exact floor layout from generateMainFloorPDF
      return `
        <div class="page">
          <div class="header">
            <h1>🏅 GymJudge - Floor Report</h1>
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
              ${renderWhiteboardPaths(gymnast.rateGeneral?.paths || '')}
            </svg>
          </div>
          
          <!-- Tables Section Below Whiteboard -->
          <div class="tables-section">
            <!-- Code Table Section -->
            <div>
              <div class="code-table-header">Elements Code Table</div>
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
                  <td class="info-value ${(gymnast.rateGeneral?.numberOfElements || 0) >= 6 && (gymnast.rateGeneral?.numberOfElements || 0) <= 8 ? 'green' : 'red'}">
                    ${gymnast.rateGeneral?.numberOfElements || 0}
                  </td>
                </tr>
                <tr>
                  <td class="info-label">DIFFICULTY VALUES</td>
                  <td class="info-value">${(gymnast.rateGeneral?.difficultyValues || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td class="info-label">ELEMENT GROUPS</td>
                  <td class="element-groups">
                    <div class="element-group">
                      <div class="group-header">I</div>
                      <div class="group-value">${(gymnast.rateGeneral?.elementGroups1 || 0).toFixed(1)}</div>
                    </div>
                    <div class="element-group">
                      <div class="group-header">II</div>
                      <div class="group-value">${(gymnast.rateGeneral?.elementGroups2 || 0).toFixed(1)}</div>
                    </div>
                    <div class="element-group">
                      <div class="group-header">III</div>
                      <div class="group-value">${(gymnast.rateGeneral?.elementGroups3 || 0).toFixed(1)}</div>
                    </div>
                    <div class="element-group">
                      <div class="group-header">IV</div>
                      <div class="group-value">${(gymnast.rateGeneral?.elementGroups4 || 0).toFixed(1)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="info-label">ELEMENT GROUPS TOTAL</td>
                  <td class="info-value">${(gymnast.rateGeneral?.elementGroups5 || 0).toFixed(1)}</td>
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
                      <div class="score-value sb">${gymnast.rateGeneral?.stickBonus ? '0.1' : '0.0'}</div>
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
                  <td class="info-value">${(gymnast.rateGeneral?.execution || gymnast.e2 || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td class="info-label">E SCORE</td>
                  <td class="info-value">${(gymnast.rateGeneral?.eScore || gymnast.e3 || 0).toFixed(3)}</td>
                </tr>
                <tr>
                  <td class="info-label">MY SCORE</td>
                  <td class="info-value orange">${(gymnast.rateGeneral?.myScore || 0).toFixed(3)}</td>
                </tr>
              </table>
            </div>
          </div>
          
          <!-- Competition Section Below Tables -->
          <div class="competition-section">
            <div class="comp-row">
              <div class="comp-label">COMPETITION</div>
              <div class="comp-cell">D</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compD || gymnast.d3 || 0).toFixed(1)}</div>
              <div class="comp-cell">E</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compE || gymnast.e3 || 0).toFixed(3)}</div>
              <div class="comp-cell">SB</div>
              <div class="comp-value">${gymnast.rateGeneral?.compSd ? '0.1' : '0.0'}</div>
              <div class="comp-cell">ND</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compNd || gymnast.nd || 0).toFixed(1)}</div>
              <div class="comp-cell">SCORE</div>
              <div class="comp-value">${(gymnast.rateGeneral?.compScore || 0).toFixed(3)}</div>
            </div>
          </div>
          
          <!-- Comments Section -->
          <div class="comments-section">
            <h3>💬 Judge Comments</h3>
            <div class="comments-text">
              ${gymnast.rateGeneral?.comments || 'No comments provided for this routine.'}
            </div>
          </div>
        </div>
      `;
    }
  }).join('');

  // Generate final table HTML (exact copy from generateFinalTablePDF)
  const finalTableHTML = `
    <div class="page final-table-page">
      <div class="header final-table-header">
        <h1>🏅 ${finalTableData.competition.title}</h1>
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
          background: #e0e0e0;
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
      ${individualPagesHTML}
      ${finalTableHTML}
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false,
      
    });
    if (true) {
      const newUri = `${FileSystem.documentDirectory}${competence.name}-${competence.date.split('T')[0]}.pdf`;
      await FileSystem.copyAsync({
        from: uri,
        to: newUri
      });
      
      await shareAsync(newUri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf' 
      });
      
      return newUri;
    }
    
  } catch (error) {
    console.error('Error generating comprehensive PDF:', error);
    throw error;
  }
};


// Export types for external use
export type { FinalTableData, MainTableWithRateGeneral };

