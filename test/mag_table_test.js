// Test script to validate computePercentageMAG mapping against provided examples
function safeNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function computePercentageWAG_test(dedInterval, delt) {
  // Use WAG table logic: row from ded (dedInterval/10), col from delta (rounded 1 dec)
  const dedValue = safeNumber(dedInterval, 0) / 10;
  const rd = Math.round(dedValue * 1000) / 1000;
  let rowNumber = 7;
  if (rd <= 0.400) rowNumber = 1;
  else if (rd >= 0.401 && rd <= 0.600) rowNumber = 2;
  else if (rd >= 0.601 && rd <= 1.000) rowNumber = 3;
  else if (rd >= 1.001 && rd <= 1.500) rowNumber = 4;
  else if (rd >= 1.501 && rd <= 2.000) rowNumber = 5;
  else if (rd >= 2.001 && rd <= 2.500) rowNumber = 6;
  else rowNumber = 7;
  const row = Math.max(0, Math.min(6, rowNumber - 1));

  const absDelt = Math.abs(safeNumber(delt, 0));
  const deltaRounded1 = Math.round(absDelt * 10) / 10;
  let col = Math.round(deltaRounded1 * 10);
  if (!Number.isFinite(col)) col = 0;
  col = Math.max(0, col);

  const rowTable = [
    // row 0 (0 - 0.40)
    [100,100,75,65,55,45,35,25,15,5,0,0,0,0,0,0],
    // row 1 (>0.40 - 0.60)
    [100,100,80,70,60,50,40,30,20,10,0,0,0,0,0,0],
    // row 2 (>0.60 - 1.00)
    [100,100,100,80,70,60,50,40,30,20,10,0,0,0,0,0],
    // row 3 (>1.00 - 1.50)
    [100,100,100,90,80,70,60,50,40,30,20,10,0,0,0,0],
    // row 4 (>1.50 - 2.00)
    [100,100,100,100,90,80,70,60,50,40,30,20,10,0,0,0],
    // row 5 (>2.00 - 2.50)
    [100,100,100,100,95,85,80,70,60,50,40,30,20,10,0,0],
    // row 6 (>2.50)
    [100,100,100,100,100,95,85,80,70,60,50,40,30,20,10,0],
  ];

  const selectedRow = rowTable[row] || [];
  const result = col < selectedRow.length ? selectedRow[col] : 0;

  return { result, row, col, rd, deltaRounded1 };
}

const examples = [
  { ref: 9.633, judge: 0.1, delta: 0.3, expected: { pct:65, line:1, col:4 } },
  { ref: 9.533, judge: 0.3, delta: 0.2, expected: { pct:80, line:2, col:3 } },
  { ref: 9.333, judge: 1.1, delta: 0.4, expected: { pct:70, line:3, col:5 } },
  { ref: 8.233, judge: 2.5, delta: 0.7, expected: { pct:60, line:5, col:8 } },
  { ref: 8.900, judge: 0.8, delta: 0.3, expected: { pct:90, line:4, col:4 } },
  { ref: 7.633, judge: 3.2, delta: 0.8, expected: { pct:60, line:6, col:9 } },
];

console.log('MAG table test');
console.log('---------------------------------------------');
// Exhaustive search over combinations to find a mapping that matches the examples
const colMethods = ['round', 'floor'];
const dedSources = ['reference', 'judge'];
const deltaSources = ['provided', 'computed'];
const rowMethods = ['ranges', 'round10'];
const divisors = [1,2,3,4,5,6];

function computeRow_round10(delt) {
  const v = Math.round(delt * 10);
  return Math.max(0, Math.min(6, v - 1));
}

function getRowByMethod(method, delt) {
  if (method === 'ranges') {
    // reuse computePercentageMAG logic to get row
    const res = computePercentageWAG_test(0, delt);
    return res.row;
  }
  return computeRow_round10(delt);
}

function getColByMethod(method, dedInterval, divisor) {
  if (method === 'round') {
    return Math.max(0, Math.round(dedInterval / (divisor||1)) - 1);
  }
  return Math.max(0, Math.floor(dedInterval / (divisor||1)) - 1);
}

const rowTable = [
  [100,75,65,55,45,35,25,15,5,0],
  [100,80,70,60,50,40,30,20,10,0],
  [100,100,80,70,60,50,40,30,20,10,0],
  [100,100,94,80,70,60,50,40,30,20,10,0],
  [100,100,100,90,80,70,60,50,40,30,20,10,0],
  [100,100,100,96,88,80,70,60,50,40,30,20,10,0],
  [100,100,100,100,93,87,80,70,60,50,40,30,20,0],
];

let best = null;
const tried = [];
for (const dedSource of dedSources) {
  for (const deltaSource of deltaSources) {
    for (const rowMethod of rowMethods) {
      for (const colMethod of colMethods) {
        for (const div of divisors) {
          let score = 0;
          let details = [];
          for (const ex of examples) {
            const dedRef = Math.round((10 - ex.ref) * 1000) / 1000;
            const dedJudge = Math.round((10 - ex.judge) * 1000) / 1000;
            const ded = dedSource === 'reference' ? dedRef : dedJudge;
            const dedInterval = Math.round(ded * 10);

            const deltProvided = Math.abs(Math.round(ex.delta * 10) / 10);
            const deltComputed = Math.abs(Math.round((ex.ref - ex.judge) * 10) / 10);
            const delt = deltaSource === 'provided' ? deltProvided : deltComputed;

            const row = getRowByMethod(rowMethod, delt);
            const col = getColByMethod(colMethod, dedInterval, div);
            const pct = col < (rowTable[row] || []).length ? rowTable[row][col] : 0;

            const matchPct = pct === ex.expected.pct ? 1 : 0;
            const matchLine = (row+1) === ex.expected.line ? 1 : 0;
            const matchCol = (col+1) === ex.expected.col ? 1 : 0;
            score += matchPct + matchLine + matchCol;
            details.push({pct, row: row+1, col: col+1, matchPct, matchLine, matchCol});
          }
          tried.push({dedSource, deltaSource, rowMethod, colMethod, divisor: div, score, details});
          if (!best || score > best.score) best = {dedSource, deltaSource, rowMethod, colMethod, divisor: div, score, details};
        }
      }
    }
  }
}

console.log('Best mapping candidate:', best.dedSource, best.deltaSource, best.rowMethod, best.colMethod, 'div', best.divisor, 'score', best.score);
console.log('\nRunning focused test: ded = 10 - NOTA_REFERENCIA, delta = NOTA_REFERENCIA - NOTA_JUEZ (round 1), col by round(dedInterval) -1, rows by ranges');
examples.forEach((ex, i) => {
  // judgeE is provided as a deduction in examples -> convert to judge execution score
  const judgeE = Math.round((10 - ex.judge) * 1000) / 1000;
  const ded = Math.round((10 - ex.ref) * 1000) / 1000; // ded based on ecomp (NOTA_REFERENCIA)
  // try two mappings for dedInterval: floor and round
  const dedIntervalFloor = Math.floor(ded * 10);
  const dedIntervalRound = Math.round(ded * 10);
  const delt = Math.abs(Math.round((judgeE - ex.ref) * 10) / 10); // absolute delta between execution and ecomp
  const wagFloor = computePercentageWAG_test(dedIntervalFloor, delt);
  const wagRound = computePercentageWAG_test(dedIntervalRound, delt);
  console.log(`Example ${i+1}: ref=${ex.ref} judge=${ex.judge}`);
  console.log(' ded(ref):', ded);
  console.log(' dedIntervalFloor:', dedIntervalFloor, ' => colIndex:', wagFloor.col, ' pctFloor:', wagFloor.result);
  console.log(' dedIntervalRound:', dedIntervalRound, ' => colIndex:', wagRound.col, ' pctRound:', wagRound.result);
  console.log(' judgeE:', judgeE, ' delta(rounded1):', delt);
  console.log(' expected %:', ex.expected.pct, ' expected line:', ex.expected.line, ' expected col:', ex.expected.col);
  console.log(' matchFloorPct:', wagFloor.result === ex.expected.pct, ' matchRoundPct:', wagRound.result === ex.expected.pct);
  console.log('---------------------------------------------');
});

process.exit(0);
