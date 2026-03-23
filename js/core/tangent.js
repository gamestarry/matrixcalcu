// js/core/tangent.js
// Single-matrix: Matrix tangent tan(A) (numeric, stable)
// Uses the same block expm identity to get sin(A) and cos(A), then tan(A)=sin(A)*inv(cos(A)).
// expm via scaling-and-squaring + Pade(13).
//
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
    if (!Array.isArray(A[i]) || A[i].length !== c) throw new Error("Invalid matrix row length.");
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

  const theta13 = 5.371920351148152;

  const A1 = norm1(A);
  const s = Math.max(0, Math.ceil(Math.log2(A1 / theta13)));

  const As = (s > 0) ? scale(A, 1 / Math.pow(2, s)) : A;

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

  const t1 = add(scale(As6, b[13]), add(scale(As4, b[11]), scale(As2, b[9])));
  const t2 = mul(As6, t1);
  const t3 = add(t2, add(scale(As6, b[7]), add(scale(As4, b[5]), add(scale(As2, b[3]), scale(I, b[1])))));
  const U = mul(As, t3);

  const s1 = add(scale(As6, b[12]), add(scale(As4, b[10]), scale(As2, b[8])));
  const s2 = mul(As6, s1);
  const V = add(s2, add(scale(As6, b[6]), add(scale(As4, b[4]), add(scale(As2, b[2]), scale(I, b[0])))));

  const P = add(V, U);
  const Q = sub(V, U);

  let R;
  try {
    const invQ = invMatrix(Q);
    R = mul(invQ, P);
  } catch {
    throw new Error("Matrix tangent failed: internal expm solve failed (singular system).");
  }

  for (let k = 0; k < s; k++) R = mul(R, R);

  return cleanupNegZero(R);
}

// Block matrix M = [[0, A], [-A, 0]]
function buildBlock(A) {
  const n = A.length;
  const M = zeros(2 * n, 2 * n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      M[i][j] = 0;
      M[i][j + n] = A[i][j];
      M[i + n][j] = -A[i][j];
      M[i + n][j + n] = 0;
    }
  }
  return M;
}

function extractBlocks(E, n) {
  const C = zeros(n, n);
  const S = zeros(n, n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      C[i][j] = E[i][j];       // top-left = cos(A)
      S[i][j] = E[i][j + n];   // top-right = sin(A)
    }
  }
  return { C: cleanupNegZero(C), S: cleanupNegZero(S) };
}

function tanMatrix(A) {
  const n = A.length;
  const M = buildBlock(A);
  const E = expmPade13(M);
  const { C, S } = extractBlocks(E, n);

  let invC;
  try {
    invC = invMatrix(C);
  } catch {
    throw new Error("Matrix tangent failed: cos(A) is singular (not invertible).");
  }

  return cleanupNegZero(mul(S, invC));
}

/* exports */
export const config = {
  validate(matrices) {
    const A = matrices?.[0];
    if (!looksLikeMatrix(A)) throw new Error("Please enter Matrix A.");
    const r = A.length, c = A[0].length;
    if (r !== c) throw new Error("Matrix tangent requires a square matrix (n×n).");
    if (r > 10) throw new Error("Matrix tangent currently supports up to 10×10 (for stability/performance).");

    const numA = toNumberMatrix(A);
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
      if (!Number.isFinite(numA[i][j])) throw new Error("Matrix contains invalid number(s).");
    }
  }
};

export function calculate(matrices, value = "") {
  const A = toNumberMatrix(matrices[0]);
  return tanMatrix(A);
}

export function generateProcessMatrix() {
  return [];
}