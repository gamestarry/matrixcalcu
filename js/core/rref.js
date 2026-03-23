// js/core/rref.js
// Single-matrix operation: RREF (Reduced Row Echelon Form)
// Fraction-friendly Gauss-Jordan elimination with step recording.

function isMatrix(M) {
  return Array.isArray(M) &&
    M.length > 0 &&
    Array.isArray(M[0]) &&
    M[0].length > 0;
}

function assertRectangular(M, name = 'Matrix') {
  if (!isMatrix(M)) {
    throw new Error(`${name} is invalid.`);
  }

  const cols = M[0].length;
  for (let i = 0; i < M.length; i++) {
    if (!Array.isArray(M[i]) || M[i].length !== cols) {
      throw new Error(`${name} is invalid.`);
    }
  }
}

function toMathValue(x) {
  try {
    return math.fraction(x);
  } catch {
    return x;
  }
}

function normalizeMatrix(M) {
  return M.map(row => row.map(toMathValue));
}

function cloneMatrix(M) {
  return M.map(row => row.slice());
}

function isZeroValue(x, eps = 1e-12) {
  try {
    return math.equal(x, 0);
  } catch {
    return Math.abs(Number(x)) < eps;
  }
}

function cleanValue(x) {
  try {
    const f = math.fraction(x);
    if (f.n === 0) return math.fraction(0);
    return f;
  } catch {
    const n = Number(x);
    if (Math.abs(n) < eps) return 0;
    return n;
  }
}

function cleanMatrix(M) {
  return M.map(row => row.map(cell => {
    try {
      const f = math.fraction(cell);
      if (f.n === 0) return math.fraction(0);
      return f;
    } catch {
      const n = Number(cell);
      return Math.abs(n) < 1e-12 ? 0 : n;
    }
  }));
}

function swapRows(M, i, j) {
  const tmp = M[i];
  M[i] = M[j];
  M[j] = tmp;
}

function scaleRow(M, rowIndex, factor) {
  for (let c = 0; c < M[rowIndex].length; c++) {
    M[rowIndex][c] = cleanValue(math.multiply(M[rowIndex][c], factor));
  }
}

function addRowMultiple(M, targetRow, sourceRow, factor) {
  for (let c = 0; c < M[targetRow].length; c++) {
    M[targetRow][c] = cleanValue(
      math.add(
        M[targetRow][c],
        math.multiply(factor, M[sourceRow][c])
      )
    );
  }
}

function formatFraction(value) {
  try {
    const f = math.fraction(value);
    if (f.n === 0) return '0';
    if (f.d === 1) return String(f.s * f.n);
    const sign = f.s < 0 ? '-' : '';
    return `${sign}${f.n}/${f.d}`;
  } catch {
    return String(value);
  }
}

function snapshot(label, M, steps) {
  steps.push({
    label,
    matrix: cloneMatrix(cleanMatrix(M))
  });
}

export const config = {
  validate(matrices) {
    const A = matrices[0];

    if (!A || !A.length) {
      throw new Error('Please enter Matrix A.');
    }

    assertRectangular(A, 'Matrix A');
  }
};

export function calculateRREFWithSteps(inputMatrix) {
  assertRectangular(inputMatrix, 'Matrix A');

  const M = normalizeMatrix(inputMatrix);
  const rows = M.length;
  const cols = M[0].length;
  const steps = [];

  snapshot('Initial matrix', M, steps);

  let leadRow = 0;

  for (let col = 0; col < cols && leadRow < rows; col++) {
    // 1) Find pivot row
    let pivotRow = -1;
    for (let r = leadRow; r < rows; r++) {
      if (!isZeroValue(M[r][col])) {
        pivotRow = r;
        break;
      }
    }

    if (pivotRow === -1) continue;

    // 2) Swap pivot row into position
    if (pivotRow !== leadRow) {
      swapRows(M, pivotRow, leadRow);
      snapshot(`Swap R${pivotRow + 1} ↔ R${leadRow + 1}`, M, steps);
    }

    // 3) Scale pivot row so pivot becomes 1
    const pivotVal = M[leadRow][col];
    if (!isZeroValue(pivotVal) && !math.equal(pivotVal, 1)) {
      const factor = math.divide(1, pivotVal);
      scaleRow(M, leadRow, factor);
      snapshot(`R${leadRow + 1} ← (${formatFraction(factor)})R${leadRow + 1}`, M, steps);
    }

    // 4) Eliminate all other entries in pivot column
    for (let r = 0; r < rows; r++) {
      if (r === leadRow) continue;
      if (isZeroValue(M[r][col])) continue;

      const factor = math.unaryMinus(M[r][col]);
      addRowMultiple(M, r, leadRow, factor);
      
      const factorText = formatFraction(factor);
      if (factorText.startsWith('-')) {
        snapshot(`R${r + 1} ← R${r + 1} - ${factorText.slice(1)}R${leadRow + 1}`, M, steps);
      } else {
        snapshot(`R${r + 1} ← R${r + 1} + ${factorText}R${leadRow + 1}`, M, steps);
      }
    }

    leadRow++;
  }

  const rrefMatrix = cleanMatrix(M);
  return { rrefMatrix, steps };
}

// Optional compatibility helper
export function calculate(matrices) {
  const A = matrices[0];
  return calculateRREFWithSteps(A).rrefMatrix;
}

// RREF uses a dedicated step structure, so we don't use processMatrix here.
export function generateProcessMatrix() {
  return [];
}