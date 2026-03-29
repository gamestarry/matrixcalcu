import { userError } from '../i18n/user-error.js';

// js/core/augmented.js
// Two-matrix: Augmented Matrix [A | B]
// - A: r×cA
// - B: r×cB
// Returns: r×(cA+cB)
// Keeps original cell values (string/number/Fraction) to preserve exactness/formatting.

function looksLikeMatrix(M) {
  return Array.isArray(M) && M.length && Array.isArray(M[0]);
}

function dims(M) {
  return { r: M.length, c: M[0].length };
}

function cloneRowSlice(row) {
  // shallow clone is enough since cells are primitives/immutable-ish (string/number/Fraction)
  return row.slice();
}

function augment(A, B) {
  const { r: rA, c: cA } = dims(A);
  const { r: rB, c: cB } = dims(B);

  if (rA !== rB) {
    throw userError('ERR_AUGMENTED_ROW_MISMATCH', { rA, rB });
  }

  const out = new Array(rA);
  for (let i = 0; i < rA; i++) {
    const left = cloneRowSlice(A[i]);
    const right = cloneRowSlice(B[i]);
    // Ensure the row lengths are correct (in case of ragged inputs)
    if (left.length !== cA) throw userError('ERR_INVALID_MATRIX_A_ROW_LENGTH');
    if (right.length !== cB) throw userError('ERR_INVALID_MATRIX_B_ROW_LENGTH');
    out[i] = left.concat(right);
  }
  return out;
}

/* ===============================
   Project-required exports
================================ */

export function calculate(matrices) {
  const A = matrices[0];
  const B = matrices[1];
  return augment(A, B);
}

export const config = {
  validate(matrices) {
    const A = matrices[0];
    const B = matrices[1];

    if (!looksLikeMatrix(A)) throw userError('ERR_MATRIX_A_REQUIRED');
    if (!looksLikeMatrix(B)) throw userError('ERR_MATRIX_B_REQUIRED');

    const { r: rA, c: cA } = dims(A);
    const { r: rB, c: cB } = dims(B);

    if (rA <= 0 || cA <= 0) throw userError('ERR_MATRIX_A_EMPTY');
    if (rB <= 0 || cB <= 0) throw userError('ERR_MATRIX_B_EMPTY');
    if (rA !== rB) throw userError('ERR_AUGMENTED_ROW_COUNT_MISMATCH');
  }
};

export function generateProcessMatrix() {
  return [];
}
