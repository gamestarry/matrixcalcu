import { userError } from '../i18n/user-error.js';

// js/core/cosine.js
// Single-matrix: Matrix cosine cos(A) (numeric, stable)
// Method: cos(A) extracted from expm of block matrix:
//   expm([ [0, A], [-A, 0] ]) = [ [cos(A), sin(A)], [-sin(A), cos(A)] ]
//
// expm implemented via scaling-and-squaring + Pade approximant (m=13) (Higham).
// Output: Number matrix.

function looksLikeMatrix(M) {
  return Array.isArray(M) && M.length && Array.isArray(M[0]) && M[0].length;
}

function toNumber(x) {
  try { return math.number(x); } catch { const v = Number(x); return Number.isFinite(v) ? v : NaN; }
}

function toNumberMatrix(A) {
  const r = A.length, c = A[0].length;
  const out = new Array(r);
  for (let i = 0; i < r; i++) {
    if (!Array.isArray(A[i]) || A[i].length !== c) throw userError('ERR_INVALID_MATRIX_ROW_LENGTH');
    const row = new Array(c);
    for (let j = 0; j < c; j++) row[j] = toNumber(A[i][j]);
    out[i] = row;
  }
  return out;
}

function zeros(r, c) {
  const M = new Array(r);
  for (let i = 0; i < r; i++) M[i] = new Array(c).fill(0);
  return M;
}

function identity(n) {
  const I = zeros(n, n);
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

function add(A, B) {
  const r = A.length, c = A[0].length;
  const C = new Array(r);
  for (let i = 0; i < r; i++) {
    const row = new Array(c);
    for (let j = 0; j < c; j++) row[j] = A[i][j] + B[i][j];
    C[i] = row;
  }
  return C;
}

function sub(A, B) {
  const r = A.length, c = A[0].length;
  const C = new Array(r);
  for (let i = 0; i < r; i++) {
    const row = new Array(c);
    for (let j = 0; j < c; j++) row[j] = A[i][j] - B[i][j];
    C[i] = row;
  }
  return C;
}

function scale(A, s) {
  const r = A.length, c = A[0].length;
  const C = new Array(r);
  for (let i = 0; i < r; i++) {
    const row = new Array(c);
    for (let j = 0; j < c; j++) row[j] = A[i][j] * s;
    C[i] = row;
  }
  return C;
}

function mul(A, B) {
  const r = A.length;
  const k = A[0].length;
  const c = B[0].length;
  const C = new Array(r);
  for (let i = 0; i < r; i++) {
    const row = new Array(c).fill(0);
    for (let t = 0; t < k; t++) {
      const a = A[i][t];
      if (a === 0) continue;
      for (let j = 0; j < c; j++) row[j] += a * B[t][j];
    }
    C[i] = row;
  }
  return C;
}

function norm1(A) {
  // 1-norm: max column sum
  const r = A.length, c = A[0].length;
  let max = 0;
  for (let j = 0; j < c; j++) {
    let s = 0;
    for (let i = 0; i < r; i++) s += Math.abs(A[i][j]);
    if (s > max) max = s;
  }
  return max;
}

function invMatrix(A) {
  const inv = math.inv(A);
  return (inv && typeof inv.toArray === "function") ? inv.toArray() : inv;
}

function cleanupNegZero(M) {
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M[0].length; j++) {
      if (Object.is(M[i][j], -0)) M[i][j] = 0;
    }
  }
  return M;
}

// ---- Pade(13) expm (Higham) ----
function expmPade13(A) {
  const n = A.length;
  const I = identity(n);

  // theta_13 from Higham 2005
  const theta13 = 5.371920351148152;

  const A1 = norm1(A);
  const s = Math.max(0, Math.ceil(Math.log2(A1 / theta13)));

  const As = (s > 0) ? scale(A, 1 / Math.pow(2, s)) : A;

  // Pade coefficients for m=13
  const b = [
    64764752532480000,
    32382376266240000,
    7771770303897600,
    1187353796428800,
    129060195264000,
    10559470521600,
    670442572800,
    33522128640,
    1323241920,
    40840800,
    960960,
    16380,
    182,
    1
  ];

  const As2 = mul(As, As);
  const As4 = mul(As2, As2);
  const As6 = mul(As4, As2);

  // U = As * (As6*(b13*As6 + b11*As4 + b9*As2) + b7*As6 + b5*As4 + b3*As2 + b1*I)
  const t1 = add(scale(As6, b[13]), add(scale(As4, b[11]), scale(As2, b[9])));
  const t2 = mul(As6, t1);
  const t3 = add(t2, add(scale(As6, b[7]), add(scale(As4, b[5]), add(scale(As2, b[3]), scale(I, b[1])))));
  const U = mul(As, t3);

  // V = As6*(b12*As6 + b10*As4 + b8*As2) + b6*As6 + b4*As4 + b2*As2 + b0*I
  const s1 = add(scale(As6, b[12]), add(scale(As4, b[10]), scale(As2, b[8])));
  const s2 = mul(As6, s1);
  const V = add(s2, add(scale(As6, b[6]), add(scale(As4, b[4]), add(scale(As2, b[2]), scale(I, b[0])))));

  // exp(As) = (V - U)^{-1} (V + U)
  const P = add(V, U);
  const Q = sub(V, U);

  let R;
  try {
    const invQ = invMatrix(Q);
    R = mul(invQ, P);
  } catch {
    throw userError('ERR_COSINE_INTERNAL_SOLVE_FAILED');
  }

  // Squaring
  for (let k = 0; k < s; k++) R = mul(R, R);

  return cleanupNegZero(R);
}

// Build block matrix M = [[0, A], [-A, 0]]
function buildCosBlock(A) {
  const n = A.length;
  const Z = zeros(n, n);
  const M = zeros(2 * n, 2 * n);

  // Top-left: 0, Top-right: A
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      M[i][j] = Z[i][j];
      M[i][j + n] = A[i][j];
    }
  }
  // Bottom-left: -A, Bottom-right: 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      M[i + n][j] = -A[i][j];
      M[i + n][j + n] = Z[i][j];
    }
  }
  return M;
}

// Extract cos(A) from expm(block) = top-left block
function extractTopLeftBlock(E, n) {
  const C = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) C[i][j] = E[i][j];
  }
  return cleanupNegZero(C);
}

function cosMatrix(A) {
  const n = A.length;
  const M = buildCosBlock(A);
  const E = expmPade13(M);
  return extractTopLeftBlock(E, n);
}

/* exports */
export const config = {
  validate(matrices) {
    const A = matrices?.[0];
    if (!looksLikeMatrix(A)) throw userError('ERR_MATRIX_A_REQUIRED');
    const r = A.length, c = A[0].length;
    if (r !== c) throw userError('ERR_COSINE_NOT_SQUARE');

    // Because we compute expm on 2n×2n, keep size reasonable
    if (r > 10) throw userError('ERR_COSINE_MATRIX_TOO_LARGE');

    const numA = toNumberMatrix(A);
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
      if (!Number.isFinite(numA[i][j])) throw userError('ERR_INVALID_NUMBER');
    }
  }
};

export function calculate(matrices, value = "") {
  const A = toNumberMatrix(matrices[0]);
  return cosMatrix(A);
}

export function generateProcessMatrix() {
  return [];
}
