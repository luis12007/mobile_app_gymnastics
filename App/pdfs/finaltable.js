const express = require('express');
const app = express();
const port = 3000;

// Import the sampleData and generateHTML function from generate-jump-pdf.js
const fs = require('fs');
const path = require('path');

// Function to convert image to base64
function imageToBase64(imagePath) {
  try {
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const imageExt = path.extname(imagePath).toLowerCase();
      let mimeType = 'image/png';
      
      if (imageExt === '.jpg' || imageExt === '.jpeg') {
        mimeType = 'image/jpeg';
      } else if (imageExt === '.png') {
        mimeType = 'image/png';
      } else if (imageExt === '.gif') {
        mimeType = 'image/gif';
      } else if (imageExt === '.webp') {
        mimeType = 'image/webp';
      }
      
      return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    }
    return null;
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
}

// Load the jump image (put your image file in the same folder)
const jumpImagePath = path.join(__dirname, 'Jump.png');
const jumpImageBase64 = imageToBase64(jumpImagePath);

// Real sample data - using your actual data structure
const sampleData = {
      competition: {
        title: "Gymnastics Competition Final Results",
        event: "All Events",
        discipline: "MAG (Men's Artistic Gymnastics)" ,
        date: "new Date().toLocaleString()",
        totalParticipants: "tables.length",
        competenceId: "competenceId" || 1
      },
      participants: {
        position: 1,
        number: 1,
        name: "Unknown Gymnast",
        noc: "---",
        event:  "FX",
        bib:  1,
        elements: {
          j: 0,
          i: 0,
          h: 0,
          g: 0,
          f: 0,
          e: 0,
          d: 0,
          c: 0,
          b: 0,
          a: 0
        },
        scores: {
          difficultyValues:  0,
          elementGroups:  0,
          stickBonus:  0,
          neutralDeductions: 0,
          connectionValue: 0,
          startValue: 0,
          executionScore:  0,
          dScore:  0,
          eScore:  0,
          finalScore:  0
        },
        details: {
          delta:  0,
          percentage: 0,
          comments: ""
        }
      }
    };

// Import generateHTML function from generate-jump-pdf.js
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
            const scaledX = parseFloat(x) * 1.6 - 240;
            const scaledY = parseFloat(y) * 1.6;
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
            
                
          </tbody>
        </table>
      </div>

      <!-- Statistics Section -->
      <div class="statistics-section">
        <h3 style="color: #0052b4; margin-bottom: 15px;">📊 Competition Statistics</h3>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">Total Participants</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Highest Score</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Average Score</div>
          </div>
        </div>
      </div>

      
      
      <div class="footer">
        <p><strong>Generated by GymJudge</strong> on ${new Date().toLocaleString()}</p>
        <p>© 2025 GymJudge. All rights reserved. | Competition Report</p>
      </div>
    </body>
    </html>
  `;
};

// Keep track of server restart time for auto-refresh
let serverStartTime = Date.now();

app.get('/', (req, res) => {
  const html = generateHTML(sampleData, jumpImageBase64);
  res.send(html);
});

// Endpoint to check for changes (used by auto-refresh script)
app.get('/check-changes', (req, res) => {
  res.json({ timestamp: serverStartTime });
});

app.listen(port, () => {
  serverStartTime = Date.now(); // Update timestamp when server restarts
  console.log(`🚀 Preview server running at http://localhost:${port}`);
  console.log('🔄 Auto-refresh enabled - browser will reload on changes!');
  console.log('✏️  Edit the HTML/CSS and save to see changes instantly!');
  
  if (jumpImageBase64) {
    console.log('✅ Vault background image loaded successfully!');
  } else {
    console.log('⚠️  No vault background image found. Place "Jump.png" in the same folder.');
  }
  
  console.log(`📄 Generating report for ${sampleData.length} gymnast(s)`);
});