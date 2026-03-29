import { userError } from '../i18n/user-error.js';

// js/core/eigenvectors.js
// Single-matrix: Eigenvectors (numeric, real eigenvalues only)
//
// Strategy:
// 1. Compute eigenvalues via QR iteration
// 2. For each real eigenvalue λ, solve (A - λI)x = 0 using RREF
// 3. Return one eigenvector per eigenvalue
//
// Output: n×n matrix whose columns are eigenvectors (if found)
// If complex eigenvalue encountered, column will be null.

function toNumber(x) {
  try {
    return math.number(x);
  } catch {
    const v = Number(x);
    return Number.isFinite(v) ? v : 0;
  }
}

function isSquareMatrix(A) {
  if (!Array.isArray(A) || A.length === 0) return false;
  const n = A.length;
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(A[i]) || A[i].length !== n) return false;
  }
  return true;
}

function cloneMatrix(A) {
  return A.map(row => row.slice());
}

function toNumberMatrix(A) {
  const n = A.length;
  const M = new Array(n);
  for (let i = 0; i < n; i++) {
    M[i] = new Array(n);
    for (let j = 0; j < n; j++) M[i][j] = toNumber(A[i][j]);
  }
  return M;
}

function zeros(r, c) {
  const M = [];
  for (let i = 0; i < r; i++) M.push(new Array(c).fill(0));
  return M;
}

function identity(n) {
  const I = zeros(n, n);
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

function matMul(A, B) {
  const m = A.length;
  const k = A[0].length;
  const n = B[0].length;
  const C = zeros(m, n);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let t = 0; t < k; t++) s += A[i][t] * B[t][j];
      C[i][j] = s;
    }
  }
  return C;
}

/* ===============================
   QR Eigenvalues (same core logic)
================================ */

function qrDecompose(A) {
  const n = A.length;
  const Q = zeros(n, n);
  const R = zeros(n, n);

  const V = zeros(n, n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++)
      V[i][j] = A[i][j];

  for (let j = 0; j < n; j++) {
    let norm = 0;
    for (let i = 0; i < n; i++) norm += V[i][j] * V[i][j];
    norm = Math.sqrt(norm);
    R[j][j] = norm;
    if (norm === 0) continue;

    for (let i = 0; i < n; i++) Q[i][j] = V[i][j] / norm;

    for (let k = j + 1; k < n; k++) {
      let dot = 0;
      for (let i = 0; i < n; i++) dot += Q[i][j] * V[i][k];
      R[j][k] = dot;
      for (let i = 0; i < n; i++) V[i][k] -= dot * Q[i][j];
    }
  }

  return { Q, R };
}

function computeEigenvaluesQR(Ain, tol = 1e-10, maxIter = 300) {
  const n = Ain.length;
  let A = cloneMatrix(Ain);
  let k = n;
  let iter = 0;

  while (k > 1 && iter < maxIter) {
    if (Math.abs(A[k - 1][k - 2]) < tol) {
      A[k - 1][k - 2] = 0;
      k -= 1;
      continue;
    }

    const mu = A[k - 1][k - 1];

    const B = cloneMatrix(A);
    for (let i = 0; i < k; i++) B[i][i] -= mu;

    const Bk = zeros(k, k);
    for (let i = 0; i < k; i++)
      for (let j = 0; j < k; j++)
        Bk[i][j] = B[i][j];

    const { Q, R } = qrDecompose(Bk);
    const RQ = matMul(R, Q);

    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) A[i][j] = RQ[i][j];
      A[i][i] += mu;
    }

    iter++;
  }

  const evals = [];
  for (let i = 0; i < n; i++) evals.push(A[i][i]);
  return evals;
}

/* ===============================
   RREF solver for (A - λI)x = 0
================================ */

function rref(M, tol = 1e-10) {
  const A = cloneMatrix(M);
  const rows = A.length;
  const cols = A[0].length;
  let r = 0;

  for (let c = 0; c < cols && r < rows; c++) {
    // find pivot
    let pivot = r;
    for (let i = r + 1; i < rows; i++)
      if (Math.abs(A[i][c]) > Math.abs(A[pivot][c])) pivot = i;

    if (Math.abs(A[pivot][c]) < tol) continue;

    [A[r], A[pivot]] = [A[pivot], A[r]];

    const div = A[r][c];
    for (let j = 0; j < cols; j++) A[r][j] /= div;

    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const factor = A[i][c];
      for (let j = 0; j < cols; j++)
        A[i][j] -= factor * A[r][j];
    }

    r++;
  }

  return A;
}

function eigenvectorForLambda(A, lambda) {
  const n = A.length;
  const M = zeros(n, n);

  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      M[i][j] = A[i][j] - (i === j ? lambda : 0);

  const R = rref(M);

  const v = new Array(n).fill(0);
  let freeIndex = -1;

  for (let j = 0; j < n; j++) {
    let pivotRow = -1;
    for (let i = 0; i < n; i++)
      if (Math.abs(R[i][j] - 1) < 1e-8) pivotRow = i;

    if (pivotRow === -1) {
      freeIndex = j;
      break;
    }
  }

  if (freeIndex === -1) return null;

  v[freeIndex] = 1;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (Math.abs(R[i][j] - 1) < 1e-8) {
        let sum = 0;
        for (let k = 0; k < n; k++)
          if (k !== j) sum += R[i][k] * v[k];
        v[j] = -sum;
      }
    }
  }

  return v;
}

/* ===============================
   Exports
================================ */

export function calculate(matrices) {
  const A = matrices[0];
  if (!isSquareMatrix(A))
    throw userError('ERR_EIGENVECTORS_NOT_SQUARE');

  const An = toNumberMatrix(A);
  const eigenvalues = computeEigenvaluesQR(An);

  const n = An.length;
  const result = zeros(n, n);

  for (let i = 0; i < eigenvalues.length; i++) {
    const lambda = eigenvalues[i];

    // skip complex (very rough check)
    if (typeof lambda !== "number") continue;

    const v = eigenvectorForLambda(An, lambda);
    if (!v) continue;

    for (let r = 0; r < n; r++)
      result[r][i] = v[r];
  }

  return result;
}

export const config = {
  validate(matrices) {
    const A = matrices[0];
    if (!A || !A.length || !A[0] || !A[0].length)
      throw userError('ERR_MATRIX_A_REQUIRED');
    if (!isSquareMatrix(A))
      throw userError('ERR_EIGENVECTORS_NOT_SQUARE');
  }
};

export function generateProcessMatrix() {
  return [];
}
