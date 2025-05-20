import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function exportToPDF(tables: any[], fileName = 'Gymnastics_Scores.pdf') {
  // Styled gymnastPages for PDF export with improved design based on main-floor component
  const gymnastPages = tables.map((table, idx) => `
    <div class="gymnast-main-container">
      <div class="gymnast-header">
        <div class="header-item gymnast-name">Gymnast: <b>${table.name}</b></div>
        <div class="header-item gymnast-event">Event: <b>${table.event}</b></div>
        <div class="header-item gymnast-noc">NOC: <b>${table.noc}</b></div>
        <div class="header-item gymnast-number">Number: <b>${table.number}</b></div>
        <div class="header-item gymnast-bib">BIB: <b>${table.bib}</b></div>
      </div>
      
      <div class="gymnast-table">
        <table>
          <tr>
            <th class="main-label">NUMBER OF ELEMENTS</th>
            <td class="${(table.rateGeneral?.numberOfElements >= 6 && table.rateGeneral?.numberOfElements <= 8) ? 'main-value-green' : 'main-value-red'}">
              ${table.rateGeneral?.numberOfElements ?? ''}
            </td>
          </tr>
          
          <tr>
            <th class="main-label">DIFFICULTY VALUES</th>
            <td class="main-value-blue">${table.rateGeneral?.difficultyValues?.toFixed?.(1) ?? ''}</td>
          </tr>
          
          <tr>
            <th class="main-label">ELEMENT GROUPS</th>
            <td class="element-groups-container">
              <div class="element-group">
                <span class="group-label">I:</span>
                <span class="group-value">${table.rateGeneral?.elementGroups1?.toFixed?.(1) ?? ''}</span>
              </div>
              <div class="element-group">
                <span class="group-label">II:</span>
                <span class="group-value">${table.rateGeneral?.elementGroups2?.toFixed?.(1) ?? ''}</span>
              </div>
              <div class="element-group">
                <span class="group-label">III:</span>
                <span class="group-value">${table.rateGeneral?.elementGroups3?.toFixed?.(1) ?? ''}</span>
              </div>
              <div class="element-group">
                <span class="group-label">IV:</span>
                <span class="group-value">${table.rateGeneral?.elementGroups4?.toFixed?.(1) ?? ''}</span>
              </div>
              <div class="element-group">
                <span class="group-label">V:</span>
                <span class="group-value">${table.rateGeneral?.elementGroups5?.toFixed?.(1) ?? ''}</span>
              </div>
            </td>
          </tr>
          
          <tr>
            <th class="main-label">ELEMENT GROUPS TOTAL</th>
            <td class="main-value-blue">${table.rateGeneral?.elementGroupsTotal?.toFixed?.(1) ?? ''}</td>
          </tr>
          
          <tr>
            <th class="main-label">CV</th>
            <td class="main-value-orange">${table.rateGeneral?.cv?.toFixed?.(1) ?? ''}</td>
          </tr>
          
          <tr class="multi-cell-row">
            <th class="main-label">MODIFIERS</th>
            <td class="modifiers-container">
              <div class="modifier-group">
                <div class="modifier-label">STICK BONUS</div>
                <div class="modifier-value">${table.rateGeneral?.stickBonus ? '0.1' : '0.0'}</div>
              </div>
              <div class="modifier-group">
                <div class="modifier-label">ND</div>
                <div class="modifier-value">${table.rateGeneral?.nd?.toFixed?.(1) ?? ''}</div>
              </div>
              <div class="modifier-group">
                <div class="modifier-label">SV</div>
                <div class="modifier-value sv-value">${table.rateGeneral?.sv?.toFixed?.(1) ?? ''}</div>
              </div>
            </td>
          </tr>
          
          <tr>
            <th class="main-label">EXECUTION</th>
            <td class="main-value-blue">${table.rateGeneral?.execution?.toFixed?.(1) ?? ''}</td>
          </tr>
          
          <tr class="multi-cell-row">
            <th class="main-label">SCORES</th>
            <td class="scores-container">
              <div class="score-group">
                <div class="score-label">E SCORE</div>
                <div class="score-value">${table.rateGeneral?.eScore?.toFixed?.(3) ?? ''}</div>
              </div>
              <div class="score-group">
                <div class="score-label">MY SCORE</div>
                <div class="score-value my-score">${table.rateGeneral?.myScore?.toFixed?.(3) ?? ''}</div>
              </div>
            </td>
          </tr>
          
          <tr class="multi-cell-row">
            <th class="main-label">COMPETITION INFO</th>
            <td class="comp-info-container">
              <div class="comp-info-group">
                <div class="comp-info-label">D</div>
                <div class="comp-info-value">${table.rateGeneral?.compD?.toFixed?.(1) ?? ''}</div>
              </div>
              <div class="comp-info-group">
                <div class="comp-info-label">E</div>
                <div class="comp-info-value">${table.rateGeneral?.compE?.toFixed?.(3) ?? ''}</div>
              </div>
              <div class="comp-info-group">
                <div class="comp-info-label">SB</div>
                <div class="comp-info-value">${table.rateGeneral?.compSd ?? ''}</div>
              </div>
              <div class="comp-info-group">
                <div class="comp-info-label">ND</div>
                <div class="comp-info-value">${table.rateGeneral?.compNd?.toFixed?.(1) ?? ''}</div>
              </div>
              <div class="comp-info-group">
                <div class="comp-info-label">SCORE</div>
                <div class="comp-info-value comp-score">${table.rateGeneral?.compScore?.toFixed?.(3) ?? ''}</div>
              </div>
            </td>
          </tr>
          
          <tr>
            <th class="main-label">PERFORMANCE METRICS</th>
            <td class="performance-container">
              <div class="performance-group">
                <div class="performance-label">DELT</div>
                <div class="performance-value">${table.delt?.toFixed?.(1) ?? ''}</div>
              </div>
              <div class="performance-group">
                <div class="performance-label">PERCENTAGE</div>
                <div class="performance-value">${table.percentage ?? ''}%</div>
              </div>
            </td>
          </tr>
          
          <tr>
            <th class="main-label">COMMENTS</th>
            <td class="comments-cell">${table.rateGeneral?.comments ?? ''}</td>
          </tr>
        </table>
      </div>
    </div>
  `).join('<div style="page-break-after: always;"></div>');

  // Generate HTML for the summary table (like final-table)
  const summaryTableRows = tables.map(table => `
    <tr>
      <td>${table.number}</td>
      <td>${table.name}</td>
      <td>${table.event}</td>
      <td>${table.noc}</td>
      <td>${table.bib}</td>
      <td>${table.j}</td>
      <td>${table.i}</td>
      <td>${table.h}</td>
      <td>${table.g}</td>
      <td>${table.f}</td>
      <td>${table.e}</td>
      <td>${table.d}</td>
      <td>${table.c}</td>
      <td>${table.b}</td>
      <td>${table.a}</td>
      <td>${table.rateGeneral?.difficultyValues?.toFixed?.(1) ?? ''}</td>
      <td>${table.rateGeneral?.elementGroups5?.toFixed?.(1) ?? ''}</td>
      <td>${table.rateGeneral?.stickBonus ? '0.1' : '0.0'}</td>
      <td>${table.nd?.toFixed?.(1) ?? ''}</td>
      <td>${table.cv?.toFixed?.(1) ?? ''}</td>
      <td>${table.sv?.toFixed?.(1) ?? ''}</td>
      <td>${table.rateGeneral?.compD?.toFixed?.(1) ?? ''}</td>
      <td>${table.rateGeneral?.compE?.toFixed?.(3) ?? ''}</td>
      <td>${table.delt?.toFixed?.(1) ?? ''}</td>
      <td>${table.percentage ?? ''}</td>
      <td class="comments-column">${table.rateGeneral?.comments ?? ''}</td>
    </tr>
  `).join('');

  const summaryTableHTML = `
    <div class="summary-section">
      <h2>Summary Table</h2>
      <div class="table-container">
        <table class="summary-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Gymnast</th>
              <th>Event</th>
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
              <th>D</th>
              <th>E</th>
              <th>DELT</th>
              <th>%</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            ${summaryTableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: #f0f4f8; 
            margin: 0;
            padding: 20px;
          }
          
          /* Gymnast Container Styles */
          .gymnast-main-container {
            background: #e0e0e0;
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
          
          /* Header Styles */
          .gymnast-header {
            display: flex;
            flex-wrap: wrap;
            gap: 18px;
            margin-bottom: 18px;
            background: #f8f8f8;
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .header-item {
            font-size: 18px;
            color: #0052b4;
            font-weight: 500;
          }
          
          /* Table Styles */
          .gymnast-table table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          }
          
          .gymnast-table th, .gymnast-table td {
            border: 1px solid #bbb;
            padding: 12px;
            text-align: left;
          }
          
          .gymnast-table th.main-label {
            background: #a9def9;
            color: #333;
            font-weight: bold;
            width: 220px;
            font-size: 16px;
          }
          
          .gymnast-table td.main-value-blue {
            background: #6B9BDF;
            color: #333;
            font-weight: bold;
            font-size: 22px;
            text-align: center;
          }
          
          .gymnast-table td.main-value-green {
            background: #00b050;
            color: #333;
            font-weight: bold;
            font-size: 22px;
            text-align: center;
          }
          
          .gymnast-table td.main-value-red {
            background: #ff9b9b;
            color: #333;
            font-weight: bold;
            font-size: 22px;
            text-align: center;
          }
          
          .gymnast-table td.main-value-orange {
            background: #f8c471;
            color: #333;
            font-weight: bold;
            font-size: 22px;
            text-align: center;
          }
          
          /* Element Groups Styling */
          .element-groups-container {
            display: flex;
            justify-content: space-around;
            align-items: center;
            background: #6B9BDF;
            padding: 8px 0;
          }
          
          .element-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0 8px;
          }
          
          .group-label {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 18px;
          }
          
          .group-value {
            font-weight: bold;
            font-size: 20px;
          }
          
          /* Modifiers Row Styling */
          .modifiers-container {
            display: flex;
            justify-content: space-around;
            align-items: center;
            background: #f8f8f8;
          }
          
          .modifier-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 15px;
          }
          
          .modifier-label {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 16px;
            color: #333;
            text-align: center;
          }
          
          .modifier-value {
            font-weight: bold;
            font-size: 20px;
            color: #333;
            background: #f8c471;
            padding: 5px 10px;
            border-radius: 6px;
            min-width: 60px;
            text-align: center;
          }
          
          .sv-value {
            background: #ffcb41;
          }
          
          /* Scores Row Styling */
          .scores-container {
            display: flex;
            justify-content: space-around;
            align-items: center;
            background: #f8f8f8;
          }
          
          .score-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 15px;
          }
          
          .score-label {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 16px;
            color: #333;
          }
          
          .score-value {
            font-weight: bold;
            font-size: 20px;
            color: #333;
            background: #6B9BDF;
            padding: 5px 10px;
            border-radius: 6px;
            min-width: 80px;
            text-align: center;
          }
          
          .my-score {
            background: #6B9BDF;
          }
          
          /* Competition Info Styling */
          .comp-info-container {
            display: flex;
            justify-content: space-around;
            align-items: center;
            background: #f8f8f8;
            flex-wrap: wrap;
          }
          
          .comp-info-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 10px;
          }
          
          .comp-info-label {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 16px;
            color: #333;
          }
          
          .comp-info-value {
            font-weight: bold;
            font-size: 18px;
            color: #333;
            background: #00b050;
            padding: 5px 10px;
            border-radius: 6px;
            min-width: 60px;
            text-align: center;
          }
          
          .comp-score {
            min-width: 80px;
          }
          
          /* Performance Metrics Styling */
          .performance-container {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            background: #f8f8f8;
            gap: 30px;
            padding-left: 20px;
          }
          
          .performance-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 10px;
          }
          
          .performance-label {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 16px;
            color: #333;
          }
          
          .performance-value {
            font-weight: bold;
            font-size: 18px;
            color: #333;
            background: #D9D9D9;
            padding: 5px 10px;
            border-radius: 6px;
            min-width: 60px;
            text-align: center;
          }
          
          /* Comments Styling */
          .comments-cell {
            background: #f9f9f9;
            color: #555;
            font-style: italic;
            font-size: 16px;
            padding: 15px;
            min-height: 60px;
          }
          
          /* Summary Table Styles */
          .summary-section {
            margin-top: 40px;
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
          
          .summary-section h2 {
            color: #0052b4;
            font-size: 24px;
            margin-bottom: 15px;
            text-align: center;
          }
          
          .table-container {
            overflow-x: auto;
          }
          
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          
          .summary-table th {
            background-color: #f0f4f8;
            padding: 10px 6px;
            border: 1px solid #ddd;
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
          }
          
          .summary-table td {
            border: 1px solid #ddd;
            padding: 8px 6px;
            text-align: center;
          }
          
          .summary-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          .summary-table tr:hover {
            background-color: #f0f8ff;
          }
          
          .comments-column {
            max-width: 200px;
            text-align: left;
            white-space: normal;
            font-size: 11px;
            color: #666;
          }
          
          .multi-cell-row th {
            vertical-align: middle;
          }
        </style>
      </head>
      <body>
        ${gymnastPages}
        ${summaryTableHTML}
      </body>
    </html>
  `;

  // Generate PDF and get its URI
  const { uri, base64 } = await Print.printToFileAsync({ html, base64: Platform.OS === 'web' });

  if (Platform.OS === 'web') {
    // This opens the browser's print dialog for the user to save/print as PDF
    await Print.printAsync({ html });
    return;
  } else {
    // Share the PDF file on native
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF', UTI: 'com.adobe.pdf' });
    } else {
      alert('Sharing is not available on this device');
    }
    return uri;
  }
}