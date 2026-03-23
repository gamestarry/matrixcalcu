// js/core/exponential.js
// Single-matrix: Matrix Exponential expm(A) = e^A
// Uses Scaling-and-Squaring with Pade(13) (Higham-style), numeric output.
//
// Notes:
// - Input may include strings / Fractions / BigNumbers; we convert to Number via math.number.
// - Output is numeric (Number). Matrix exponential generally produces irrational values,
//   so exact Fraction output is not feasible.

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
      for (let j = 0; j < m; j++) {
        row[j] += a * B[t][j];
      }
    }
    C[i] = row;
  }
  return C;
}

function norm1(A) {
  // 1-norm (max column sum)
  const n = A.length;
  const m = A[0].length;
  let max = 0;
  for (let j = 0; j < m; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.abs(A[i][j]);
    if (s > max) max = s;
  }
  return max;
}

function invMatrix(A) {
  // Use math.inv for numeric matrix inversion (small n in your UI)
  // Convert to mathjs matrix to be safe; then back to array.
  const Minv = math.inv(A);
  // math.inv may return Matrix object; ensure plain array
  const arr = Minv && typeof Minv.toArray === "function" ? Minv.toArray() : Minv;
  return arr;
}

function cleanupNegZero(M) {
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M[0].length; j++) {
      if (Object.is(M[i][j], -0)) M[i][j] = 0;
    }
  }
  return M;
}

function expmPade13(A) {
  const n = A.length;

  // Pade(13) coefficients
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

  // Scaling
  const theta13 = 5.371920351148152; // standard bound for Pade(13)
  const A1 = norm1(A);
  const s = Math.max(0, Math.ceil(Math.log2(A1 / theta13)));
  const As = s > 0 ? scale(A, 1 / Math.pow(2, s)) : A;

  // Powers
  const I = identity(n);
  const A2 = mul(As, As);
  const A4 = mul(A2, A2);
  const A6 = mul(A4, A2);

  // U = As * (A6*(b13*A6 + b11*A4 + b9*A2) + b7*A6 + b5*A4 + b3*A2 + b1*I)
  let tmp1 = add(
    add(scale(A6, b[13]), scale(A4, b[11])),
    scale(A2, b[9])
  );
  tmp1 = mul(A6, tmp1);
  tmp1 = add(
    add(add(tmp1, scale(A6, b[7])), scale(A4, b[5])),
    add(scale(A2, b[3]), scale(I, b[1]))
  );
  const U = mul(As, tmp1);

  // V = A6*(b12*A6 + b10*A4 + b8*A2) + b6*A6 + b4*A4 + b2*A2 + b0*I
  let tmp2 = add(
    add(scale(A6, b[12]), scale(A4, b[10])),
    scale(A2, b[8])
  );
  tmp2 = mul(A6, tmp2);
  const V = add(
    add(add(tmp2, scale(A6, b[6])), scale(A4, b[4])),
    add(scale(A2, b[2]), scale(I, b[0]))
  );

  // R = (V - U)^{-1} * (V + U)
  const P = add(V, U);
  const Q = sub(V, U);
  const Qinv = invMatrix(Q);
  let R = mul(Qinv, P);

  // Squaring
  for (let i = 0; i < s; i++) {
    R = mul(R, R);
  }

  return cleanupNegZero(R);
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

    if (r !== c) throw new Error("Matrix exponential requires a square matrix (n×n).");
    if (r < 1) throw new Error("Matrix A is empty.");

    // Optional guard: keep within reasonable compute size (your UI is usually <= 10)
    if (r > 20) throw new Error("Matrix size too large for matrix exponential.");

    // Validate finite numeric conversion
    const numA = toNumberMatrix(A);
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        const v = numA[i][j];
        if (!Number.isFinite(v)) throw new Error("Matrix contains invalid number(s).");
      }
    }
  }
};

export function calculate(matrices) {
  const A = matrices[0];
  const numA = toNumberMatrix(A);
  return expmPade13(numA);
}

export function generateProcessMatrix() {
  return [];
}