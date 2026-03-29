import { userError } from '../i18n/user-error.js';

// js/core/square-root.js
// Single-matrix: Matrix Square Root (principal real sqrt when it exists)
// Numeric output using Denman–Beavers iteration.
//
// Notes:
// - Input may include strings / Fractions / BigNumbers; we convert to Number via math.number.
// - Output is numeric (Number). Matrix square root is generally irrational.
// - Not every matrix has a real square root; if iteration fails to converge, we throw.

function looksLikeMatrix(M) {
  return Array.isArray(M) && M.length && Array.isArray(M[0]) && M[0].length;
}

function toNumber(x) {
  try {
    return math.number(x);
  } catch {
    const v = Number(x);
    return Number.isFinite(v) ? v : NaN;
  }
}

function toNumberMatrix(A) {
  const r = A.length;
  const c = A[0].length;
  const out = new Array(r);
  for (let i = 0; i < r; i++) {
    if (!Array.isArray(A[i]) || A[i].length !== c) throw userError('ERR_INVALID_MATRIX_ROW_LENGTH');
    const row = new Array(c);
    for (let j = 0; j < c; j++) row[j] = toNumber(A[i][j]);
    out[i] = row;
  }
  return out;
}

function zeros(n) {
  const M = new Array(n);
  for (let i = 0; i < n; i++) M[i] = new Array(n).fill(0);
  return M;
}

function identity(n) {
  const I = zeros(n);
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

function add(A, B) {
  const n = A.length, m = A[0].length;
  const C = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = new Array(m);
    for (let j = 0; j < m; j++) row[j] = A[i][j] + B[i][j];
    C[i] = row;
  }
  return C;
}

function sub(A, B) {
  const n = A.length, m = A[0].length;
  const C = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = new Array(m);
    for (let j = 0; j < m; j++) row[j] = A[i][j] - B[i][j];
    C[i] = row;
  }
  return C;
}

function scale(A, s) {
  const n = A.length, m = A[0].length;
  const C = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = new Array(m);
    for (let j = 0; j < m; j++) row[j] = A[i][j] * s;
    C[i] = row;
  }
  return C;
}

function mul(A, B) {
  const n = A.length;
  const m = B[0].length;
  const k = A[0].length;
  const C = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = new Array(m).fill(0);
    for (let t = 0; t < k; t++) {
      const a = A[i][t];
      if (a === 0) continue;
      for (let j = 0; j < m; j++) row[j] += a * B[t][j];
    }
    C[i] = row;
  }
  return C;
}

function normF(A) {
  // Frobenius norm
  let s = 0;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[0].length; j++) {
      const v = A[i][j];
      s += v * v;
    }
  }
  return Math.sqrt(s);
}

function invMatrix(A) {
  const Minv = math.inv(A);
  return (Minv && typeof Minv.toArray === "function") ? Minv.toArray() : Minv;
}

function cleanupNegZero(M) {
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M[0].length; j++) {
      if (Object.is(M[i][j], -0)) M[i][j] = 0;
    }
  }
  return M;
}

// Denman–Beavers iteration:
// Y0 = A, Z0 = I
// Y_{k+1} = 0.5 * (Y_k + Z_k^{-1})
// Z_{k+1} = 0.5 * (Z_k + Y_k^{-1})
// Then Y_k -> sqrt(A) (when it converges)
function sqrtmDenmanBeavers(A, opts = {}) {
  const n = A.length;
  const maxIter = Number.isFinite(opts.maxIter) ? opts.maxIter : 50;
  const tol = Number.isFinite(opts.tol) ? opts.tol : 1e-10;

  let Y = A;
  let Z = identity(n);

  // quick exit: A == 0
  if (normF(A) === 0) return zeros(n);

  for (let k = 0; k < maxIter; k++) {
    let invZ, invY;
    try {
      invZ = invMatrix(Z);
      invY = invMatrix(Y);
    } catch (e) {
      throw userError('ERR_SQRT_SINGULAR_DURING_ITERATION');
    }

    const Ynext = scale(add(Y, invZ), 0.5);
    const Znext = scale(add(Z, invY), 0.5);

    // Convergence check based on relative change of Y
    const diff = normF(sub(Ynext, Y));
    const base = Math.max(1, normF(Ynext));
    if (diff / base < tol) {
      return cleanupNegZero(Ynext);
    }

    Y = Ynext;
    Z = Znext;
  }

  throw userError('ERR_SQRT_NOT_CONVERGED');
}

/* ===============================
   Project-required exports
================================ */

export const config = {
  validate(matrices) {
    const A = matrices?.[0];
    if (!looksLikeMatrix(A)) throw userError('ERR_MATRIX_A_REQUIRED');

    const r = A.length;
    const c = A[0].length;

    if (r !== c) throw userError('ERR_SQRT_NOT_SQUARE');
    if (r < 1) throw userError('ERR_MATRIX_A_EMPTY');
    if (r > 20) throw userError('ERR_SQRT_MATRIX_TOO_LARGE');

    const numA = toNumberMatrix(A);
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        const v = numA[i][j];
        if (!Number.isFinite(v)) throw userError('ERR_INVALID_NUMBER');
      }
    }
  }
};

export function calculate(matrices, value = "") {
  const A = toNumberMatrix(matrices[0]);

  // Optional: allow overriding iterations/tolerance via value string like "iter=80,tol=1e-12"
  let maxIter = 50;
  let tol = 1e-10;
  if (typeof value === "string" && value.trim()) {
    const parts = value.split(",").map(s => s.trim());
    for (const p of parts) {
      const [k, v] = p.split("=").map(s => s.trim());
      if (!k || v == null) continue;
      if (k.toLowerCase() === "iter") {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 1 && n <= 500) maxIter = Math.floor(n);
      } else if (k.toLowerCase() === "tol") {
        const t = Number(v);
        if (Number.isFinite(t) && t > 0) tol = t;
      }
    }
  }

  return sqrtmDenmanBeavers(A, { maxIter, tol });
}

export function generateProcessMatrix() {
  return [];
}
