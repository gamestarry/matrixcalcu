// js/core/lu-decomposition.js
// Single-matrix: LU Decomposition with partial pivoting
// Returns { P, L, U } where P*A = L*U
// Uses math.js operations (supports Fraction)

function f0() { return math.fraction(0); }
function f1() { return math.fraction(1); }

function cloneMatrix(A) {
  return A.map(row => row.map(v => v));
}

function identity(n) {
  const I = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) row.push(i === j ? f1() : f0());
    I.push(row);
  }
  return I;
}

function swapRows(M, i, k) {
  const tmp = M[i];
  M[i] = M[k];
  M[k] = tmp;
}

function absAsNumber(x) {
  // Compare pivot sizes: convert to number for pivot selection.
  // If Fraction -> number; if BigNumber -> number; else fallback.
  try {
    return Math.abs(math.number(x));
  } catch {
    try {
      return Math.abs(Number(x));
    } catch {
      return 0;
    }
  }
}

function toFrac(x) {
  // 保证最终矩阵每个元素都是 Fraction（便于全站统一格式化）
  if (math.isFraction(x)) return x;
  try { return math.fraction(x); } catch { return math.fraction(0); }
}

function normalizeMatrix(M) {
  return M.map(row => row.map(toFrac));
}

export const config = {
  name: 'LU Decomposition',
  validate(matrices) {
    const [A] = matrices || [];
    if (!A || !A.length || !A[0] || !A[0].length) {
      throw new Error('Please enter Matrix A.');
    }
    const rows = A.length;
    const cols = A[0].length;
    if (rows !== cols) {
      throw new Error(`LU decomposition requires a square matrix. Got ${rows}×${cols}.`);
    }
  }
};

export function calculate(matrices) {
  const [Ain] = matrices;
  const n = Ain.length;

  // Work on a copy
  const A = cloneMatrix(Ain);

  // Initialize
  const P = identity(n);
  const L = identity(n);
  const U = cloneMatrix(A);

  for (let k = 0; k < n; k++) {
    // ---- Partial pivoting: find max |U[i][k]| for i>=k
    let pivotRow = k;
    let pivotVal = absAsNumber(U[k][k]);

    for (let i = k + 1; i < n; i++) {
      const v = absAsNumber(U[i][k]);
      if (v > pivotVal) {
        pivotVal = v;
        pivotRow = i;
      }
    }

    // If pivot is 0, matrix is singular (still can proceed but may divide by 0)
    // We'll throw a clear error.
    if (absAsNumber(U[pivotRow][k]) === 0) {
      throw new Error('LU decomposition failed: pivot is 0 (matrix may be singular).');
    }

    // ---- Apply row swaps to U and P; also to L (only columns < k)
    if (pivotRow !== k) {
      swapRows(U, k, pivotRow);
      swapRows(P, k, pivotRow);

      // swap L rows for the part already built (0..k-1)
      for (let j = 0; j < k; j++) {
        const tmp = L[k][j];
        L[k][j] = L[pivotRow][j];
        L[pivotRow][j] = tmp;
      }
    }

    // ---- Eliminate below pivot
    for (let i = k + 1; i < n; i++) {
      // factor = U[i][k] / U[k][k]
      const factor = math.divide(U[i][k], U[k][k]);
      L[i][k] = factor;

      // Row operation: U[i][j] -= factor * U[k][j]
      for (let j = k; j < n; j++) {
        U[i][j] = math.subtract(U[i][j], math.multiply(factor, U[k][j]));
      }
    }
  }

  return {
    P: normalizeMatrix(P),
    L: normalizeMatrix(L),
    U: normalizeMatrix(U)
  };
}

// Optional: steps (not required now)
export function generateProcessMatrix() {
  return [];
}