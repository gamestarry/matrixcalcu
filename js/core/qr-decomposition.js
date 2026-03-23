// js/core/qr-decomposition.js
// Single-matrix: QR Decomposition (economy QR) using Modified Gram-Schmidt
// Returns { Q, R } such that A ≈ Q * R
// - Works for any m×n matrix (m rows, n cols)
// - Output is numeric (Number / math.js number). QR commonly produces irrational values,
//   so exact Fraction output is generally not possible.
// - Your UI formatter can still format these as decimals.

function toNumber(x) {
  try {
    // math.number handles Fraction/BigNumber/etc.
    return math.number(x);
  } catch {
    const v = Number(x);
    return Number.isFinite(v) ? v : 0;
  }
}

function zeros(r, c) {
  const M = [];
  for (let i = 0; i < r; i++) {
    const row = new Array(c).fill(0);
    M.push(row);
  }
  return M;
}

function getCol(A, j) {
  const m = A.length;
  const v = new Array(m);
  for (let i = 0; i < m; i++) v[i] = A[i][j];
  return v;
}

function setCol(M, j, v) {
  for (let i = 0; i < M.length; i++) M[i][j] = v[i];
}

function dot(u, v) {
  let s = 0;
  for (let i = 0; i < u.length; i++) s += u[i] * v[i];
  return s;
}

function norm2(v) {
  return Math.sqrt(dot(v, v));
}

function subScaled(v, q, scale) {
  // v = v - scale*q
  for (let i = 0; i < v.length; i++) v[i] -= scale * q[i];
}

export const config = {
  name: 'QR Decomposition',
  validate(matrices) {
    const [A] = matrices || [];
    if (!A || !A.length || !A[0] || !A[0].length) {
      throw new Error('Please enter Matrix A.');
    }
    const rows = A.length;
    const cols = A[0].length;
    // Basic shape sanity
    for (let i = 0; i < rows; i++) {
      if (!A[i] || A[i].length !== cols) {
        throw new Error('Invalid matrix shape: each row must have the same number of columns.');
      }
    }
  }
};

export function calculate(matrices) {
  const [Ain] = matrices;

  const m = Ain.length;
  const n = Ain[0].length;

  // Convert to numeric matrix A (m×n)
  const A = zeros(m, n);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      A[i][j] = toNumber(Ain[i][j]);
    }
  }

  const k = Math.min(m, n); // economy rank (number of Q columns)

  // Economy QR: Q is m×k, R is k×n
  const Q = zeros(m, k);
  const R = zeros(k, n);

  // Modified Gram-Schmidt
  for (let j = 0; j < n; j++) {
    // v = A[:, j]
    const v = getCol(A, j);

    // Project onto previous q_i
    const imax = Math.min(j, k);
    for (let i = 0; i < imax; i++) {
      const qi = getCol(Q, i);
      const rij = dot(qi, v);
      R[i][j] = rij;
      subScaled(v, qi, rij);
    }

    // If within Q columns, normalize to form q_j
    if (j < k) {
      const rjj = norm2(v);
      R[j][j] = rjj;

      // Handle (near) dependent column
      if (!Number.isFinite(rjj) || rjj === 0) {
        // Column is dependent; set q_j to zeros
        const zeroCol = new Array(m).fill(0);
        setCol(Q, j, zeroCol);
      } else {
        const qj = v.map(x => x / rjj);
        setCol(Q, j, qj);
      }
    } else {
      // j >= k (when m < n), we can't add more Q columns in economy form.
      // v is effectively the remaining residual; R has already been filled for i<k.
      // Nothing else needed here.
    }
  }

  // Optional: small cleanup for -0
  for (let i = 0; i < Q.length; i++) {
    for (let j = 0; j < Q[0].length; j++) {
      if (Object.is(Q[i][j], -0)) Q[i][j] = 0;
    }
  }
  for (let i = 0; i < R.length; i++) {
    for (let j = 0; j < R[0].length; j++) {
      if (Object.is(R[i][j], -0)) R[i][j] = 0;
    }
  }

  return { Q, R };
}

export function generateProcessMatrix() {
  return [];
}