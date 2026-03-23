// js/core/upper-triangular.js
// Single-matrix operation: Upper Triangular Form
// Uses fraction-friendly Gaussian elimination.

function isMatrix(M) {
    return Array.isArray(M) &&
        M.length > 0 &&
        Array.isArray(M[0]) &&
        M[0].length > 0;
}

function assertRectangular(M, name = 'Matrix') {
    if (!isMatrix(M)) {
        throw new Error(`${name} is invalid.`);
    }

    const cols = M[0].length;
    for (let i = 0; i < M.length; i++) {
        if (!Array.isArray(M[i]) || M[i].length !== cols) {
            throw new Error(`${name} is invalid.`);
        }
    }
}

function toMathValue(x) {
    try {
        return math.fraction(x);
    } catch {
        return x;
    }
}

function normalizeMatrix(M) {
    return M.map(row => row.map(toMathValue));
}

function cloneMatrix(M) {
    return M.map(row => row.slice());
}

function isZeroValue(x, eps = 1e-12) {
    try {
        return math.equal(x, 0);
    } catch {
        return Math.abs(Number(x)) < eps;
    }
}

function cleanValue(x) {
    try {
        const f = math.fraction(x);
        if (f.n === 0) return math.fraction(0);
        return f;
    } catch {
        return x;
    }
}

function swapRows(M, i, j) {
    const tmp = M[i];
    M[i] = M[j];
    M[j] = tmp;
}

function toFractionString(value) {
    try {
        const f = math.fraction(value);
        if (f.d === 1) return String(f.s * f.n);
        const sign = f.s < 0 ? '-' : '';
        return `${sign}${f.n}/${f.d}`;
    } catch {
        return String(value);
    }
}

export const config = {
    validate(matrices) {
        const A = matrices[0];

        if (!A || !A.length) {
            throw new Error('Please enter Matrix A.');
        }

        assertRectangular(A, 'Matrix A');
    }
};

export function calculate(matrices) {
    const A = normalizeMatrix(matrices[0]);
    const M = cloneMatrix(A);

    const rows = M.length;
    const cols = M[0].length;

    let pivotRow = 0;

    for (let col = 0; col < cols && pivotRow < rows; col++) {
        // 1) Find pivot row
        let pivot = -1;
        for (let r = pivotRow; r < rows; r++) {
            if (!isZeroValue(M[r][col])) {
                pivot = r;
                break;
            }
        }

        if (pivot === -1) continue;

        // 2) Swap pivot row into position
        if (pivot !== pivotRow) {
            swapRows(M, pivot, pivotRow);
        }

        const pivotVal = M[pivotRow][col];

        // 3) Eliminate below
        for (let r = pivotRow + 1; r < rows; r++) {
            if (isZeroValue(M[r][col])) continue;

            const factor = math.divide(M[r][col], pivotVal);

            for (let c = col; c < cols; c++) {
                M[r][c] = cleanValue(
                    math.subtract(M[r][c], math.multiply(factor, M[pivotRow][c]))
                );
            }

            // force exact zero in pivot column
            M[r][col] = math.fraction(0);
        }

        pivotRow++;
    }

    return M;
}

export function generateProcessMatrix(matrixA, rowsA, colsA) {
    const A = normalizeMatrix(matrixA);
    const M = cloneMatrix(A);
    const process = [];

    let pivotRow = 0;

    for (let col = 0; col < colsA && pivotRow < rowsA; col++) {
        let pivot = -1;
        for (let r = pivotRow; r < rowsA; r++) {
            if (!isZeroValue(M[r][col])) {
                pivot = r;
                break;
            }
        }

        if (pivot === -1) continue;

        if (pivot !== pivotRow) {
            swapRows(M, pivot, pivotRow);
            process.push(
                [`Swap R${pivot + 1} ↔ R${pivotRow + 1}`]
            );
        }

        const pivotVal = M[pivotRow][col];

        for (let r = pivotRow + 1; r < rowsA; r++) {
            if (isZeroValue(M[r][col])) continue;

            const factor = math.divide(M[r][col], pivotVal);

            for (let c = col; c < colsA; c++) {
                M[r][c] = cleanValue(
                    math.subtract(M[r][c], math.multiply(factor, M[pivotRow][c]))
                );
            }
            M[r][col] = math.fraction(0);

            process.push([
                `R${r + 1} ← R${r + 1} - (${toFractionString(factor)})R${pivotRow + 1}`
            ]);
        }

        pivotRow++;
    }

    return process;
}