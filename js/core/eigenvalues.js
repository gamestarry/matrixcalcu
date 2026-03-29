import { userError } from '../i18n/user-error.js';

// js/core/eigenvalues.js
// Single-matrix: Eigenvalues via (shifted) QR iteration (numeric)
// Returns a 1×n "row matrix" of eigenvalues.
// - Real eigenvalues: Number
// - Complex pair (from 2×2 block): "a + bi" / "a - bi"
//
// Notes:
// - Numeric method, suitable for small matrices (<= 10×10).
// - Works for general square matrices; complex eigenvalues are represented as strings.

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

function addShift(A, mu) {
  const n = A.length;
  const B = cloneMatrix(A);
  for (let i = 0; i < n; i++) B[i][i] += mu;
  return B;
}

function subShift(A, mu) {
  const n = A.length;
  const B = cloneMatrix(A);
  for (let i = 0; i < n; i++) B[i][i] -= mu;
  return B;
}

// Modified Gram-Schmidt QR for square matrix
function qrDecompose(A) {
  const n = A.length;
  const Q = zeros(n, n);
  const R = zeros(n, n);

  // Work with columns
  const V = zeros(n, n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) V[i][j] = A[i][j];
  }

  for (let j = 0; j < n; j++) {
    // R[j][j] = ||v_j||
    let norm = 0;
    for (let i = 0; i < n; i++) norm += V[i][j] * V[i][j];
    norm = Math.sqrt(norm);
    R[j][j] = norm;

    if (norm === 0) {
      // Degenerate column: keep Q col as zeros
      continue;
    }

    // q_j = v_j / norm
    for (let i = 0; i < n; i++) Q[i][j] = V[i][j] / norm;

    // Orthogonalize remaining columns
    for (let k = j + 1; k < n; k++) {
      let dot = 0;
      for (let i = 0; i < n; i++) dot += Q[i][j] * V[i][k];
      R[j][k] = dot;
      for (let i = 0; i < n; i++) V[i][k] -= dot * Q[i][j];
    }
  }

  // Clean -0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (Object.is(Q[i][j], -0)) Q[i][j] = 0;
      if (Object.is(R[i][j], -0)) R[i][j] = 0;
    }
  }

  return { Q, R };
}

function formatComplex(re, im) {
  // keep readable; avoid "-0"
  if (Object.is(re, -0)) re = 0;
  if (Object.is(im, -0)) im = 0;

  const absIm = Math.abs(im);
  const sign = im >= 0 ? '+' : '-';

  // trim tiny noise
  const re2 = Math.abs(re) < 1e-12 ? 0 : re;
  const im2 = absIm < 1e-12 ? 0 : absIm;

  return `${re2} ${sign} ${im2}i`;
}

function eigenvalues2x2(a, b, c, d) {
  // eigenvalues of [[a,b],[c,d]]: λ = (tr ± sqrt(tr^2 - 4det))/2
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;

  if (disc >= 0) {
    const s = Math.sqrt(disc);
    return [ (tr + s) / 2, (tr - s) / 2 ];
    } else {
    const im = Math.sqrt(-disc) / 2;
    const re = tr / 2;
    return [ formatComplex(re, im), formatComplex(re, -im) ];
  }
}

function computeEigenvaluesQR(Ain, options = {}) {
  const n = Ain.length;
  let A = cloneMatrix(Ain);

  const tol = typeof options.tol === 'number' ? options.tol : 1e-10;
  const maxIter = Number.isFinite(options.maxIter) ? options.maxIter : 300;

  // We do QR iterations with simple shifts and deflation.
  // Work on top-left k×k block, deflate when subdiagonal small.
  let k = n;
  let iter = 0;

  while (k > 1 && iter < maxIter) {
    // Deflation check on last subdiagonal
    const sub = Math.abs(A[k - 1][k - 2]);
    const scale = Math.abs(A[k - 2][k - 2]) + Math.abs(A[k - 1][k - 1]) + 1;
    if (sub < tol * scale) {
      A[k - 1][k - 2] = 0;
      k -= 1;
      continue;
    }

    // Shift: use bottom-right element of current block
    const mu = A[k - 1][k - 1];

    // Build shifted block B = A_k - mu I
    const B = cloneMatrix(A);
    for (let i = 0; i < k; i++) B[i][i] -= mu;

    // QR on k×k (we'll embed in full matrix)
    const Bk = zeros(k, k);
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) Bk[i][j] = B[i][j];

    const { Q, R } = qrDecompose(Bk);

    // A_k = RQ + mu I
    const RQ = matMul(R, Q);
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) A[i][j] = RQ[i][j];
      A[i][i] += mu;
    }

    iter += 1;
  }

  // Extract eigenvalues from (quasi-)upper-triangular A
  const evals = [];
  let i = 0;
  while (i < n) {
    if (i < n - 1 && Math.abs(A[i + 1][i]) > tol) {
      // 2×2 block
      const a = A[i][i];
      const b = A[i][i + 1];
      const c = A[i + 1][i];
      const d = A[i + 1][i + 1];
      const pair = eigenvalues2x2(a, b, c, d);
      evals.push(pair[0], pair[1]);
      i += 2;
    } else {
      evals.push(A[i][i]);
      i += 1;
    }
  }

  // Clean tiny -0
  for (let t = 0; t < evals.length; t++) {
    const v = evals[t];
    if (typeof v === 'number' && Object.is(v, -0)) evals[t] = 0;
  }

  return evals;
}

/* ===============================
   Project-required exports
================================ */

export function calculate(matrices, value = '') {
  const A = matrices[0];

  // Optional: allow user to pass tolerance / iterations via value, e.g. "tol=1e-9,iter=500"
  // Keep it simple: if value is a number, treat as tol.
  let tol = 1e-10;
  let maxIter = 300;

  if (typeof value === 'string' && value.trim()) {
    const s = value.trim();
    const asNum = Number(s);
    if (Number.isFinite(asNum)) {
      tol = Math.max(1e-15, Math.abs(asNum));
    } else {
      // parse "tol=...,iter=..."
      const parts = s.split(',').map(x => x.trim());
      for (const p of parts) {
        const [k, v] = p.split('=').map(x => x.trim());
        if (!k || v == null) continue;
        if (k === 'tol') {
          const tv = Number(v);
          if (Number.isFinite(tv)) tol = Math.max(1e-15, Math.abs(tv));
        }
        if (k === 'iter' || k === 'maxIter') {
          const iv = Number(v);
          if (Number.isFinite(iv)) maxIter = Math.max(50, Math.floor(iv));
        }
      }
    }
  }

  if (!isSquareMatrix(A)) throw userError('ERR_EIGENVALUES_NOT_SQUARE');

  const An = toNumberMatrix(A);
  const evals = computeEigenvaluesQR(An, { tol, maxIter });

  // Return as 1×n "matrix" for consistent rendering in your UI
  return [evals];
}

export const config = {
  validate(matrices) {
    const A = matrices[0];
    if (!A || !A.length || !A[0] || !A[0].length) {
      throw userError('ERR_MATRIX_A_REQUIRED');
    }
    if (!isSquareMatrix(A)) {
      throw userError('ERR_EIGENVALUES_NOT_SQUARE');
    }
  }
};

export function generateProcessMatrix() {
  return [];
}
