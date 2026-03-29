import { userError } from '../i18n/user-error.js';

// js/core/cholesky.js
// Single-matrix: Cholesky Decomposition
// Returns { L, Lt } such that A = L * Lt

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

function isSymmetricMatrix(A, tol = 0) {
  if (!isSquareMatrix(A)) return false;
  const eps = Math.max(0, Number(tol) || 0);

  for (let i = 0; i < A.length; i++) {
    for (let j = i + 1; j < A.length; j++) {
      const a = toNumber(A[i][j]);
      const b = toNumber(A[j][i]);
      if (Math.abs(a - b) > eps) return false;
    }
  }
  return true;
}

function zeros(n) {
  const M = [];
  for (let i = 0; i < n; i++) {
    M.push(new Array(n).fill(0));
  }
  return M;
}

function transpose(M) {
  const T = [];
  for (let j = 0; j < M[0].length; j++) {
    const row = [];
    for (let i = 0; i < M.length; i++) {
      row.push(M[i][j]);
    }
    T.push(row);
  }
  return T;
}

function cholesky(A) {
  const n = A.length;
  const L = zeros(n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;

      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }

      const val = toNumber(A[i][j]) - sum;

      if (i === j) {
        if (val <= 0) {
          throw userError('ERR_CHOLESKY_NOT_POSITIVE_DEFINITE');
        }
        L[i][j] = Math.sqrt(val);
      } else {
        L[i][j] = val / L[j][j];
      }
    }
  }

  // clean -0
  for (let i = 0; i < L.length; i++) {
    for (let j = 0; j < L[0].length; j++) {
      if (Object.is(L[i][j], -0)) L[i][j] = 0;
    }
  }

  return {
    L,
    Lt: transpose(L)
  };
}

/* ===============================
   Project-required exports
================================ */

export function calculate(matrices) {
  const A = matrices[0];
  return cholesky(A);
}

export const config = {
  validate(matrices) {
    const A = matrices[0];

    if (!isSquareMatrix(A)) {
      throw userError('ERR_CHOLESKY_NOT_SQUARE');
    }

    if (!isSymmetricMatrix(A)) {
      throw userError('ERR_CHOLESKY_NOT_SYMMETRIC');
    }
  }
};

export function generateProcessMatrix() {
  return [];
}
