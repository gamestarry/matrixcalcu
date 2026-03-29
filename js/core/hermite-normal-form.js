import { userError } from '../i18n/user-error.js';

// js/core/hermite-normal-form.js
// Single-matrix operation: Hermite Normal Form (row-style HNF)
// Integer matrices only.

function isMatrix(M) {
    return Array.isArray(M) &&
        M.length > 0 &&
        Array.isArray(M[0]) &&
        M[0].length > 0;
}

function cloneMatrix(M) {
    return M.map(row => row.slice());
}

function assertRectangular(M, matrixName = 'Matrix') {
    if (!isMatrix(M)) {
        throw userError('ERR_MATRIX_INVALID', { matrixName });
    }

    const cols = M[0].length;
    for (let i = 0; i < M.length; i++) {
        if (!Array.isArray(M[i]) || M[i].length !== cols) {
            throw userError('ERR_MATRIX_INVALID', { matrixName });
        }
    }
}

function toIntegerValue(x) {
    // Accept integer-looking values only.
    // Supports plain numbers/strings and integer fractions like 6/3.
    try {
        const v = math.fraction(x);
        if (v.d !== 1) return null;
        return Number(v.s * v.n);
    } catch {
        const n = Number(x);
        if (Number.isInteger(n)) return n;
        return null;
    }
}

function normalizeIntegerMatrix(M) {
    const out = [];
    for (let i = 0; i < M.length; i++) {
        const row = [];
        for (let j = 0; j < M[i].length; j++) {
            const v = toIntegerValue(M[i][j]);
            if (v === null) {
                throw userError('ERR_HERMITE_INTEGER_ONLY');
            }
            row.push(v);
        }
        out.push(row);
    }
    return out;
}

function abs(n) {
    return Math.abs(n);
}

function swapRows(M, i, j) {
    const tmp = M[i];
    M[i] = M[j];
    M[j] = tmp;
}

function addRowMultiple(M, targetRow, sourceRow, k) {
    if (k === 0) return;
    for (let c = 0; c < M[targetRow].length; c++) {
        M[targetRow][c] += k * M[sourceRow][c];
    }
}

function multiplyRow(M, row, k) {
    for (let c = 0; c < M[row].length; c++) {
        M[row][c] *= k;
    }
}

function floorDiv(a, b) {
    return Math.floor(a / b);
}

function mod(a, b) {
    const r = a % b;
    return r < 0 ? r + Math.abs(b) : r;
}

function isZeroRow(row) {
    return row.every(v => v === 0);
}

/*
Row-style HNF algorithm:
- Process columns left to right
- Build pivots top to bottom
- For each pivot column:
  1) Find a nonzero row at or below current pivot row
  2) Use integer row combinations (Euclidean algorithm style) to get the smallest positive pivot
  3) Clear entries below pivot
  4) Make pivot positive
  5) Reduce entries above pivot into [0, pivot)
This produces a standard row-HNF-like form.
*/
function hermiteNormalForm(input) {
    const M = cloneMatrix(input);
    const rows = M.length;
    const cols = M[0].length;

    let pivotRow = 0;

    for (let col = 0; col < cols && pivotRow < rows; col++) {
        // 1) Find first nonzero entry in this column at or below pivotRow
        let r = -1;
        for (let i = pivotRow; i < rows; i++) {
            if (M[i][col] !== 0) {
                r = i;
                break;
            }
        }
        if (r === -1) continue;

        if (r !== pivotRow) {
            swapRows(M, pivotRow, r);
        }

        // 2) Euclidean reduction on rows below to get a minimal pivot in this column
        let changed = true;
        while (changed) {
            changed = false;

            for (let i = pivotRow + 1; i < rows; i++) {
                if (M[i][col] === 0) continue;

                // Ensure |pivot| <= |candidate| by swapping if needed
                if (abs(M[i][col]) < abs(M[pivotRow][col])) {
                    swapRows(M, pivotRow, i);
                    changed = true;
                }

                // Eliminate using quotient
                const a = M[pivotRow][col];
                const b = M[i][col];
                if (b !== 0) {
                    const q = (a !== 0) ? Math.trunc(b / a) : 0;
                    addRowMultiple(M, i, pivotRow, -q);

                    // If remainder still nonzero and smaller, keep iterating
                    if (abs(M[i][col]) > 0 && abs(M[i][col]) < abs(M[pivotRow][col])) {
                        swapRows(M, pivotRow, i);
                        changed = true;
                    }
                }
            }
        }

        // 3) Clear entries below pivot exactly
        for (let i = pivotRow + 1; i < rows; i++) {
            if (M[i][col] === 0) continue;

            while (M[i][col] !== 0) {
                if (abs(M[i][col]) < abs(M[pivotRow][col])) {
                    swapRows(M, pivotRow, i);
                }
                const q = Math.trunc(M[i][col] / M[pivotRow][col]);
                addRowMultiple(M, i, pivotRow, -q);

                // If trunc quotient failed to kill because signs are awkward,
                // do one corrective step.
                if (M[i][col] !== 0 && abs(M[i][col]) >= abs(M[pivotRow][col])) {
                    const sign = M[i][col] * M[pivotRow][col] > 0 ? 1 : -1;
                    addRowMultiple(M, i, pivotRow, -sign);
                }
            }
        }

        // 4) Make pivot positive
        if (M[pivotRow][col] < 0) {
            multiplyRow(M, pivotRow, -1);
        }

        const pivot = M[pivotRow][col];
        if (pivot === 0) continue;

        // 5) Reduce entries above pivot into [0, pivot)
        for (let i = 0; i < pivotRow; i++) {
            const val = M[i][col];
            if (val === 0) continue;

            const q = floorDiv(val, pivot);
            addRowMultiple(M, i, pivotRow, -q);

            // Ensure 0 <= M[i][col] < pivot
            const rem = mod(M[i][col], pivot);
            if (rem !== M[i][col]) {
                const diff = M[i][col] - rem;
                const q2 = diff / pivot;
                addRowMultiple(M, i, pivotRow, -q2);
            }
        }

        pivotRow++;
    }

    // Move zero rows to bottom (stable)
    const nonZeroRows = M.filter(row => !isZeroRow(row));
    const zeroRows = M.filter(row => isZeroRow(row));
    return [...nonZeroRows, ...zeroRows];
}

export const config = {
    validate(matrices) {
        const A = matrices[0];

        if (!A || !A.length) {
            throw userError('ERR_MATRIX_A_REQUIRED');
        }

        assertRectangular(A, 'Matrix A');

        // Integer-only validation
        normalizeIntegerMatrix(A);
    }
};

export function calculate(matrices) {
    const A = normalizeIntegerMatrix(matrices[0]);
    return hermiteNormalForm(A);
}

export function generateProcessMatrix() {
    // Keep stable and simple for now.
    return [];
}
