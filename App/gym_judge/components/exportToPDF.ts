import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function exportToPDF(tables: any[], fileName = 'Gymnastics_Scores.pdf') {
  // Styled gymnastPages for PDF export
  const gymnastPages = tables.map((table, idx) => `
    <div class="gymnast-main-container">
      <div class="gymnast-header">
        <span class="gymnast-title">Gymnast: <b>${table.name}</b></span>
        <span class="gymnast-event">Event: <b>${table.event}</b></span>
        <span class="gymnast-noc">NOC: <b>${table.noc}</b></span>
        <span class="gymnast-bib">BIB: <b>${table.bib}</b></span>
      </div>
      <div class="gymnast-table">
        <table>
          <tr>
            <th class="main-label">NUMBER OF ELEMENTS</th>
            <td class="main-value">${table.rateGeneral?.numberOfElements ?? ''}</td>
          </tr>
          <tr>
            <th class="main-label">DIFFICULTY VALUES</th>
            <td class="main-value">${table.rateGeneral?.difficultyValues?.toFixed?.(1) ?? ''}</td>
          </tr>
          <tr>
            <th class="main-label">ELEMENT GROUPS</th>
            <td class="main-value">
              I: ${table.rateGeneral?.elementGroups1 ?? ''} &nbsp;
              II: ${table.rateGeneral?.elementGroups2 ?? ''} &nbsp;
              III: ${table.rateGeneral?.elementGroups3 ?? ''} &nbsp;
              IV: ${table.rateGeneral?.elementGroups4 ?? ''} &nbsp;
              V: ${table.rateGeneral?.elementGroups5 ?? ''}
            </td>
          </tr>
          <tr>
            <th class="main-label">ELEMENT GROUPS TOTAL</th>
            <td class="main-value">${table.rateGeneral?.elementGroupsTotal ?? ''}</td>
          </tr>
          <tr>
            <th class="main-label">CV</th>
            <td class="main-value">${table.rateGeneral?.cv ?? ''}</td>
          </tr>
          <tr>
            <th class="main-label">STICK BONUS</th>
            <td class="main-value">${table.rateGeneral?.stickBonus ? '0.1' : '0.0'}</td>
          </tr>
          <tr>
            <th class="main-label">ND</th>
            <td class="main-value">${table.rateGeneral?.nd ?? ''}</td>
          </tr>
          <tr>
            <th class="main-label">SV</th>
            <td class="main-value">${table.rateGeneral?.sv ?? ''}</td>
          </tr>
          <tr>
            <th class="main-label">EXECUTION</th>
            <td class="main-value">${table.rateGeneral?.execution ?? ''}</td>
          </tr>
          <tr>
            <th class="main-label">E SCORE</th>
            <td class="main-value">${table.rateGeneral?.eScore?.toFixed?.(3) ?? ''}</td>
          </tr>
          <tr>
            <th class="main-label">MY SCORE</th>
            <td class="main-value">${table.rateGeneral?.myScore?.toFixed?.(3) ?? ''}</td>
          </tr>
          <tr>
            <th class="main-label">COMPETITION INFO</th>
            <td class="main-value">
              D: ${table.rateGeneral?.compD ?? ''} &nbsp;
              E: ${table.rateGeneral?.compE ?? ''} &nbsp;
              SB: ${table.rateGeneral?.compSd ?? ''} &nbsp;
              ND: ${table.rateGeneral?.compNd ?? ''} &nbsp;
              SCORE: ${table.rateGeneral?.compScore ?? ''}
            </td>
          </tr>
          <tr>
            <th class="main-label">GYMNAST INFO</th>
            <td class="main-value">
              Name: ${table.name} &nbsp;
              NOC: ${table.noc} &nbsp;
              Event: ${table.event} &nbsp;
              Number: ${table.number}
            </td>
          </tr>
          <tr>
            <th class="main-label">COMMENTS</th>
            <td class="main-value comments-cell">${table.rateGeneral?.comments ?? ''}</td>
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
      <td>${table.rateGeneral?.difficultyValues ?? ''}</td>
      <td>${table.rateGeneral?.elementGroups5 ?? ''}</td>
      <td>${table.rateGeneral?.stickBonus ? '0.1' : '0'}</td>
      <td>${table.nd}</td>
      <td>${table.cv}</td>
      <td>${table.sv}</td>
      <td>${table.rateGeneral?.compD ?? ''}</td>
      <td>${table.rateGeneral?.compE ?? ''}</td>
      <td>${table.delt ?? ''}</td>
      <td>${table.percentage ?? ''}</td>
      <td>${table.rateGeneral?.comments ?? ''}</td>
    </tr>
  `).join('');

  const summaryTableHTML = `
    <div>
      <h2>Summary Table</h2>
      <table border="1" cellspacing="0" cellpadding="4" style="width:100%; font-size:12px;">
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
  `;

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; background: #f8f8f8; }
          .gymnast-main-container {
            background: #e0e0e0;
            border-radius: 16px;
            padding: 24px 18px;
            margin: 24px 0;
            font-family: Arial, sans-serif;
          }
          .gymnast-header {
            display: flex;
            flex-wrap: wrap;
            gap: 18px;
            margin-bottom: 18px;
            font-size: 18px;
            color: #0052b4;
            font-weight: bold;
          }
          .gymnast-table table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            font-size: 16px;
          }
          .gymnast-table th, .gymnast-table td {
            border: 1px solid #bbb;
            padding: 8px 12px;
            text-align: left;
          }
          .gymnast-table th.main-label {
            background: #a9def9;
            color: #333;
            font-weight: bold;
            width: 260px;
          }
          .gymnast-table td.main-value {
            background: #f9f9f9;
            color: #333;
            font-weight: bold;
          }
          .gymnast-table tr:nth-child(even) td {
            background: #f0f4f8;
          }
          .gymnast-table td.comments-cell {
            color: #888;
            font-style: italic;
          }
          h2 { color: #0052b4; }
          table { border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 4px; }
          th { background: #f0f4f8; }
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