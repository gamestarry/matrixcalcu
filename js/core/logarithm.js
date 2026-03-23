// js/core/logarithm.js
// Single-matrix: Matrix Logarithm logm(A) (principal real log when it exists)
// Numeric output using inverse scaling-and-squaring:
//   1) Repeated sqrt to bring A close to I: A0 = A^(1/2^s)
//   2) Use atanh series: log(A0) = 2 * [X + X^3/3 + X^5/5 + ...], where X = (A0 - I)(A0 + I)^{-1}
//   3) log(A) = 2^s * log(A0)
//
// Notes:
// - Input may include strings / Fractions / BigNumbers; we convert to Number.
// - Output is numeric (Number).
// - Requires A to be square and invertible. May fail to converge for some matrices.

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
    if (!Array.isArray(A[i]) || A[i].length !== c) throw new Error("Invalid matrix row length.");
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

// ---- Denman–Beavers sqrtm (numeric) ----
function sqrtmDenmanBeavers(A, opts = {}) {
  const n = A.length;
  const maxIter = Number.isFinite(opts.maxIter) ? opts.maxIter : 50;
  const tol = Number.isFinite(opts.tol) ? opts.tol : 1e-10;

  let Y = A;
  let Z = identity(n);

  if (normF(A) === 0) return zeros(n);

  for (let k = 0; k < maxIter; k++) {
    let invZ, invY;
    try {
      invZ = invMatrix(Z);
      invY = invMatrix(Y);
    } catch {
      throw new Error("Matrix log failed: matrix became singular during sqrt scaling.");
    }

    const Ynext = scale(add(Y, invZ), 0.5);
    const Znext = scale(add(Z, invY), 0.5);

    const diff = normF(sub(Ynext, Y));
    const base = Math.max(1, normF(Ynext));
    if (diff / base < tol) return cleanupNegZero(Ynext);

    Y = Ynext;
    Z = Znext;
  }

  throw new Error("Matrix log failed: sqrt scaling did not converge (ill-conditioned matrix).");
}

// ---- logm via atanh series after sqrt scaling ----
function logmAtanhSeries(A, opts = {}) {
  const n = A.length;
  const seriesTerms = Number.isFinite(opts.seriesTerms) ? opts.seriesTerms : 12; // odd terms count
  const sqrtSteps = Number.isFinite(opts.sqrtSteps) ? opts.sqrtSteps : 4;       // scaling steps
  const sqrtTol = Number.isFinite(opts.sqrtTol) ? opts.sqrtTol : 1e-10;
  const sqrtIter = Number.isFinite(opts.sqrtIter) ? opts.sqrtIter : 50;

  // 0) Ensure invertible (principal log needs invertible)
  try {
    invMatrix(A);
  } catch {
    throw new Error("Matrix logarithm requires an invertible matrix (det(A) ≠ 0).");
  }

  // 1) Inverse scaling by repeated sqrt: A0 = A^(1/2^s)
  let A0 = A;
  for (let i = 0; i < sqrtSteps; i++) {
    A0 = sqrtmDenmanBeavers(A0, { maxIter: sqrtIter, tol: sqrtTol });
  }

  const I = identity(n);

  // 2) X = (A0 - I) * inv(A0 + I)
  const ApI = add(A0, I);
  const AmI = sub(A0, I);

  let invApI;
  try {
    invApI = invMatrix(ApI);
  } catch {
    throw new Error("Matrix log failed: (A + I) is singular after scaling.");
  }

  const X = mul(AmI, invApI);

  // 3) atanh series: atanh(X) = X + X^3/3 + X^5/5 + ...
  // log(A0) = 2 * atanh(X)
  let Xpow = X;                    // current odd power: X^(2k+1)
  let sum = X;                     // start with X
  let X2 = mul(X, X);              // X^2

  for (let k = 1; k < seriesTerms; k++) {
    // next odd power: X^(2k+1) = X^(2k-1) * X^2
    Xpow = mul(Xpow, X2);
    const denom = 2 * k + 1;
    sum = add(sum, scale(Xpow, 1 / denom));
  }

  let logA0 = scale(sum, 2);

  // 4) log(A) = 2^s * log(A0)
  const factor = Math.pow(2, sqrtSteps);
  const logA = scale(logA0, factor);

  return cleanupNegZero(logA);
}

/* ===============================
   Project-required exports
================================ */

export const config = {
  validate(matrices) {
    const A = matrices?.[0];
    if (!looksLikeMatrix(A)) throw new Error("Please enter Matrix A.");

    const r = A.length;
    const c = A[0].length;

    if (r !== c) throw new Error("Matrix logarithm requires a square matrix (n×n).");
    if (r < 1) throw new Error("Matrix A is empty.");
    if (r > 20) throw new Error("Matrix size too large for matrix logarithm.");

    const numA = toNumberMatrix(A);
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        const v = numA[i][j];
        if (!Number.isFinite(v)) throw new Error("Matrix contains invalid number(s).");
      }
    }

    // Invertibility check (principal log needs invertible)
    try {
      invMatrix(numA);
    } catch {
      throw new Error("Matrix logarithm requires an invertible matrix (det(A) ≠ 0).");
    }
  }
};

export function calculate(matrices, value = "") {
  const A = toNumberMatrix(matrices[0]);

  // Optional tuning via value string: "sqrt=4,terms=12"
  let sqrtSteps = 4;
  let seriesTerms = 12;

  if (typeof value === "string" && value.trim()) {
    const parts = value.split(",").map(s => s.trim());
    for (const p of parts) {
      const [k, v] = p.split("=").map(s => s.trim());
      if (!k || v == null) continue;
      if (k.toLowerCase() === "sqrt") {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0 && n <= 10) sqrtSteps = Math.floor(n);
      } else if (k.toLowerCase() === "terms") {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 3 && n <= 40) seriesTerms = Math.floor(n);
      }
    }
  }

  return logmAtanhSeries(A, { sqrtSteps, seriesTerms });
}

export function generateProcessMatrix() {
  return [];
}