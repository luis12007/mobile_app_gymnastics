const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Sample data - replace with your test data
const sampleData = [
  {
    name: "John Doe",
    noc: "USA",
    event: "VT",
    number: 1,
    bib: 101,
    percentage: 85,
    sv: 5.2,
    nd: 0.3,
    sb: 0.1,
    delt: 0.2,
    rateGeneral: {
      vaultNumber: "5.20",
      vaultDescription: "Yurchenko Double Pike",
      ded: 0.3,
      stickBonus: true,
      execution: 8.7,
      eScore: 8.400,
      myScore: 13.600,
      compD: 5.2,
      compE: 8.400,
      compNd: 0.0,
      compScore: 13.600,
      comments: "Excellent vault with good height and distance. Minor form deductions on landing.",
      paths: JSON.stringify([
        {
          path: "M 300 400 L 350 380 L 400 390",
          color: "red",
          strokeWidth: 3,
          penType: 0
        },
        {
          path: "M 500 300 L 600 320 L 700 310",
          color: "blue", 
          strokeWidth: 5,
          penType: 1
        }
      ])
    }
  }
];

// Your HTML template (exact copy from React Native function)
const generateHTML = (data, jumpImageBase64 = null) => {
  
  const renderWhiteboardPaths = (pathsString) => {
    if (!pathsString) return '';
    
    try {
      const paths = JSON.parse(pathsString);
      if (!Array.isArray(paths)) return '';
      
      return paths.map((pathData, index) => {
        let scaledPath = pathData.path;
        
        if (pathData.path) {
          scaledPath = pathData.path.replace(/([ML])\s*([0-9.-]+)\s*([0-9.-]+)/g, (match, command, x, y) => {
            const scaledX = parseFloat(x) * 1.3;
            const scaledY = parseFloat(y) * 1.3;
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
              stroke="${pathData.isEraser ? '#e0e0e0' : (pathData.color || 'black')}" 
              stroke-width="${pathData.strokeWidth || 3}" 
              fill="none" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            />`;
        }
        
        return pathElement;
      }).join('');
    } catch (error) {
      console.error('Error parsing paths:', error);
      return '';
    }
  };

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
        
        .page {
          background: white;
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          page-break-after: always;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          background: linear-gradient(135deg, #0052b4, #004aad);
          color: white;
          padding: 12px;
          border-radius: 6px;
        }
        
        .header h1 {
          font-size: 18px;
          margin-bottom: 3px;
        }
        
        .header h2 {
          font-size: 14px;
          font-weight: normal;
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
          width: 70%;
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
        
        .score-value.sv {
          background: #6B9BDF;
        }
        
        .score-value.nd {
          background: #ff9b9b;
        }
        
        .score-value.sb {
          background: #00b050;
          color: white;
        }
        
        .score-value.execution {
          background: #f8c471;
        }
        
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
        }
      </style>
    </head>
    <body>
      ${data.map((gymnast, index) => `
        <div class="page">
          <div class="header">
            <h1>🏅 GymJudge - Vault Report</h1>
            <h2>${gymnast.name || 'Unknown Gymnast'} (${gymnast.noc || 'UNK'}) - ${gymnast.event || 'VT'}</h2>
          </div>
          
          <div class="gymnast-info">
            <strong>Gymnast:</strong> ${gymnast.name || 'Unknown'} | 
            <strong>NOC:</strong> ${gymnast.noc || 'UNK'} | 
            <strong>Event:</strong> ${gymnast.event || 'VT'} | 
            <strong>Number:</strong> ${gymnast.number || 0} | 
            <strong>BIB:</strong> ${gymnast.bib || 0} | 
            <strong>Performance:</strong> ${gymnast.percentage || 0}%
          </div>
          
          <!-- Full Width Whiteboard Section -->
          <div class="whiteboard-section">
            <div class="whiteboard-title">Judge's Whiteboard</div>
            <svg class="whiteboard-canvas" viewBox="0 0 1300 780" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              <!-- Jump background image -->
              ${jumpImageBase64 ? `
                <image href="${jumpImageBase64}" 
                       width="1105" height="663" x="97.5" y="58.5" opacity="0.6" />
              ` : `
                <!-- Fallback: Simple vault layout -->
                <rect x="100" y="300" width="1100" height="180" fill="#f0f0f0" stroke="#ccc" stroke-width="2" rx="10"/>
                <rect x="600" y="320" width="100" height="140" fill="#e0e0e0" stroke="#999" stroke-width="2" rx="5"/>
                <rect x="800" y="280" width="400" height="220" fill="#e8f4e8" stroke="#999" stroke-width="2" rx="10"/>
              `}
              ${renderWhiteboardPaths(gymnast.rateGeneral?.paths || '')}
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
                  <tr class="vault-info-row">
                    <td>Execution Deduction</td>
                    <td class="vault-info-value">${(gymnast.rateGeneral?.ded || 0).toFixed(1)}</td>
                  </tr>
                  <tr class="vault-info-row">
                    <td>Stick Bonus</td>
                    <td class="vault-info-value">${gymnast.rateGeneral?.stickBonus ? 'Yes (0.1)' : 'No (0.0)'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Scoring Information Table -->
            <div>
              <table class="info-table">
                <tr>
                  <td class="info-label">VAULT NUMBER</td>
                  <td class="info-value">${gymnast.rateGeneral?.vaultNumber || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="info-label">START VALUE</td>
                  <td class="info-value">${(gymnast.sv || 0).toFixed(1)}</td>
                </tr>
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
                      <div class="score-value sb">${(gymnast.sb || 0).toFixed(1)}</div>
                    </div>
                    <div class="score-group">
                      <div class="score-header">EXEC</div>
                      <div class="score-value execution">${(gymnast.rateGeneral?.execution || 0).toFixed(1)}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="info-label">EXECUTION</td>
                  <td class="info-value">${(gymnast.rateGeneral?.execution || 0).toFixed(1)}</td>
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
                  <td class="info-label">DELTA</td>
                  <td class="info-value ${(gymnast.delt || 0) <= 0.3 ? 'green' : (gymnast.delt || 0) <= 0.6 ? 'yellow' : 'red'}">${(gymnast.delt || 0).toFixed(1)}</td>
                </tr>
                <tr>
                  <td class="info-label">DEDUCTION</td>
                  <td class="info-value">${(gymnast.rateGeneral?.ded || 0).toFixed(1)}</td>
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
              <div class="comp-value">${gymnast.rateGeneral?.stickBonus ? '0.1' : (gymnast.sb || 0).toFixed(1)}</div>
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
          
          ${index === data.length - 1 ? `
            <div class="footer">
              <p><strong>Generated by GymJudge</strong> on ${new Date().toLocaleString()}</p>
              <p>© 2025 GymJudge. All rights reserved. | Report ID: GJ-${Date.now()}</p>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </body>
    </html>
  `;
};

async function generatePDF() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // If you have a Jump.png image, convert it to base64 and use it
  // For now, we'll use null to show the fallback geometric layout
  const jumpImageBase64 = null;
  
  const html = generateHTML(sampleData, jumpImageBase64);
  
  // Save HTML for inspection
  fs.writeFileSync('generated.html', html);
  console.log('HTML saved to generated.html');
  
  // Generate PDF
  await page.setContent(html);
  await page.pdf({
    path: 'vault-report.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
      left: '0.5in'
    }
  });
  
  console.log('PDF generated: vault-report.pdf');
  await browser.close();
}

generatePDF().catch(console.error);