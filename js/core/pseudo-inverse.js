import { userError } from '../i18n/user-error.js';

// js/core/pseudo-inverse.js
// Single-matrix: Moore-Penrose Pseudoinverse A^+ via SVD
// A ≈ U S V^T  =>  A^+ ≈ V S^+ U^T
//
// Notes:
// - Numeric (Number) output.
// - Uses internal SVD (Jacobi on A^T A) similar to your svd.js (no math.svd dependency).
// - Tolerance: singular values <= tol treated as 0 (not inverted).

function toNumber(x) {
  try {
    return math.number(x);
  } catch {
    const v = Number(x);
    return Number.isFinite(v) ? v : 0;
  }
}

function looksLikeMatrix(M) {
  return Array.isArray(M) && M.length && Array.isArray(M[0]);
}

function toNumberMatrix(A) {
  const m = A.length;
  const n = A[0].length;
  const out = new Array(m);
  for (let i = 0; i < m; i++) {
    out[i] = new Array(n);
    for (let j = 0; j < n; j++) out[i][j] = toNumber(A[i][j]);
  }
  return out;
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

function transpose(A) {
  const r = A.length;
  const c = A[0].length;
  const T = zeros(c, r);
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j];
  return T;
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

function matVecMul(A, v) {
  const m = A.length;
  const n = A[0].length;
  const out = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * v[j];
    out[i] = s;
  }
  return out;
}

function vecNorm(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}

function cleanNegZero(M) {
  if (!looksLikeMatrix(M)) return M;
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M[0].length; j++) {
      if (Object.is(M[i][j], -0)) M[i][j] = 0;
    }
  }
  return M;
}

// Jacobi eigen-decomposition for symmetric matrix
function jacobiEigenSymmetric(A, maxIter = 200, eps = 1e-12) {
  const n = A.length;
  const D = zeros(n, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) D[i][j] = A[i][j];

  let V = identity(n);

  function maxOffDiag() {
    let p = 0, q = 1;
    let max = Math.abs(D[p][q]);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const v = Math.abs(D[i][j]);
        if (v > max) { max = v; p = i; q = j; }
      }
    }
    return { p, q, max };
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const { p, q, max } = maxOffDiag();
    if (max < eps) break;

    const app = D[p][p];
    const aqq = D[q][q];
    const apq = D[p][q];

    const tau = (aqq - app) / (2 * apq);
    const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;

    D[p][p] = app - t * apq;
    D[q][q] = aqq + t * apq;
    D[p][q] = 0;
    D[q][p] = 0;

    for (let k = 0; k < n; k++) {
      if (k !== p && k !== q) {
        const dkp = D[k][p];
        const dkq = D[k][q];
        D[k][p] = dkp * c - dkq * s;
        D[p][k] = D[k][p];
        D[k][q] = dkp * s + dkq * c;
        D[q][k] = D[k][q];
      }
    }

    for (let k = 0; k < n; k++) {
      const vkp = V[k][p];
      const vkq = V[k][q];
      V[k][p] = vkp * c - vkq * s;
      V[k][q] = vkp * s + vkq * c;
    }
  }

  const values = new Array(n);
  for (let i = 0; i < n; i++) values[i] = D[i][i];
  return { values, vectors: V };
}

function sortEigenPairsDesc(values, V) {
  const n = values.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((a, b) => values[b] - values[a]);

  const sortedVals = idx.map(i => values[i]);
  const sortedV = zeros(n, n);
  for (let col = 0; col < n; col++) {
    const src = idx[col];
    for (let row = 0; row < n; row++) sortedV[row][col] = V[row][src];
  }
  return { values: sortedVals, vectors: sortedV };
}

function svdInternal(Araw) {
  const A = toNumberMatrix(Araw);
  const m = A.length;
  const n = A[0].length;

  const At = transpose(A);
  const AtA = matMul(At, A); // n×n symmetric

  let { values, vectors: V } = jacobiEigenSymmetric(AtA, 300, 1e-12);
  ({ values, vectors: V } = sortEigenPairsDesc(values, V));

  const s = values.map(lam => Math.sqrt(Math.max(0, lam)));

  // U (m×n)
  const U = zeros(m, n);
  for (let i = 0; i < n; i++) {
    const sigma = s[i];
    const v = new Array(n);
    for (let r = 0; r < n; r++) v[r] = V[r][i];

    const Av = matVecMul(A, v);
    if (sigma > 1e-12) {
      for (let r = 0; r < m; r++) U[r][i] = Av[r] / sigma;
    } else {
      for (let r = 0; r < m; r++) U[r][i] = 0;
    }
  }

  cleanNegZero(U);
  cleanNegZero(V);

  return { U, s, V };
}

function pseudoInverse(Araw, tol = 1e-12) {
  const A = toNumberMatrix(Araw);
  const m = A.length;
  const n = A[0].length;

  const { U, s, V } = svdInternal(A);

  // Build S^+ (n×m) diagonal of 1/s
  const Sp = zeros(n, m);
  const k = Math.min(s.length, m, n);
  for (let i = 0; i < k; i++) {
    if (s[i] > tol) Sp[i][i] = 1 / s[i];
  }

  // A^+ = V * S^+ * U^T
  const Ut = transpose(U);
  const VSp = matMul(V, Sp);
  const Aplus = matMul(VSp, Ut);

  cleanNegZero(Aplus);
  return Aplus;
}

/* ===============================
   Project-required exports
================================ */

export function calculate(matrices, value = '') {
  const A = matrices[0];
  const tol = (value && Number(value)) ? Number(value) : 1e-12; // optional input as tolerance
  return pseudoInverse(A, tol);
}

export const config = {
  validate(matrices) {
    const A = matrices[0];
    if (!looksLikeMatrix(A)) throw userError('ERR_MATRIX_A_REQUIRED');
    if (!A.length || !A[0].length) throw userError('ERR_MATRIX_A_REQUIRED');
  }
};

export function generateProcessMatrix() {
  return [];
}
