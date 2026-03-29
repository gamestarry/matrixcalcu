import { userError } from '../i18n/user-error.js';

// js/core/rank.js
// Single-matrix: Rank(A)
// Interface aligned with other core modules: config / calculate / generateProcessMatrix
// Implementation uses fraction-safe Gaussian elimination (row echelon form) to get rank.
// Returns a 1×1 matrix: [[rank]]

function toFractionString(value) {
  if (typeof math === 'undefined') return '0';
  try {
    const f = math.isFraction(value) ? math.fraction(value) : math.fraction(String(value));
    if (math.compare(f.d, 1) === 0) return (f.s * f.n).toString();
    return `${f.s * f.n}/${f.d}`;
  } catch {
    return String(value);
  }
}

function toFrac(value) {
  try {
    return math.isFraction(value) ? math.fraction(value) : math.fraction(String(value));
  } catch {
    return math.fraction(0);
  }
}

function isZeroFrac(f) {
  try {
    const ff = math.isFraction(f) ? f : math.fraction(f);
    return math.compare(ff, 0) === 0;
  } catch {
    return false;
  }
}

function cloneMatrixAsFractions(A) {
  return A.map(row => row.map(v => toFrac(v)));
}

// Row echelon form (not full RREF) + rank
function echelonAndRank(A) {
  const M = cloneMatrixAsFractions(A);
  const rows = M.length;
  const cols = (M[0] || []).length;

  let r = 0; // current pivot row
  let rank = 0;

  for (let c = 0; c < cols && r < rows; c++) {
    // find pivot row at or below r with non-zero in column c
    let pivot = -1;
    for (let i = r; i < rows; i++) {
      if (!isZeroFrac(M[i][c])) {
        pivot = i;
        break;
      }
    }
    if (pivot === -1) continue;

    // swap pivot row into place
    if (pivot !== r) {
      const tmp = M[r];
      M[r] = M[pivot];
      M[pivot] = tmp;
    }

    // eliminate below
    const pivotVal = M[r][c];
    for (let i = r + 1; i < rows; i++) {
      if (isZeroFrac(M[i][c])) continue;

      // factor = M[i][c] / pivotVal
      const factor = math.divide(M[i][c], pivotVal);

      // row_i = row_i - factor * row_r
      for (let j = c; j < cols; j++) {
        const sub = math.multiply(factor, M[r][j]);
        M[i][j] = math.subtract(M[i][j], sub);
      }
    }

    rank++;
    r++;
  }

  return { echelon: M, rank };
}

export const config = {
  name: 'Rank',
  matrices: 1,
  allowNonSquare: true,
  validate(matrices) {
    const A = (matrices || [])[0];
    if (!A || !A.length || !A[0] || !A[0].length) {
      throw userError('ERR_MATRIX_A_REQUIRED');
    }
  }
};

// Result is 1×1 matrix: [[rank]]
export function calculate(matrices) {
  const A = matrices[0];
  const { rank } = echelonAndRank(A);
  // rank is integer; wrap as number (output module will format)
  return [[rank]];
}

// Process matrix: show echelon form as fractions (same size as A)
// This keeps “process is fractions” consistent.
export function generateProcessMatrix(A, aRows, aCols) {
  const { echelon, rank } = echelonAndRank(A);

  const process = [];
  for (let i = 0; i < aRows; i++) {
    const row = [];
    for (let j = 0; j < aCols; j++) {
      row.push(toFractionString(echelon[i][j]));
    }
    process.push(row);
  }

  // Optional: append a small note row (doesn't break UI; it will render as extra row)
  // If you prefer pure matrix-only steps, delete the next two lines.
  process.push([`rank(A) = ${rank}`]);

  return process;
}
