// js/core/adjoint.js
// Single-matrix operation: Adjoint / Adjugate matrix
// Export shape matches app.js unary operation contract.

function isMatrix(M) {
    return Array.isArray(M) &&
        M.length > 0 &&
        Array.isArray(M[0]) &&
        M[0].length > 0;
}

function cloneMatrix(M) {
    return M.map(row => row.slice());
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

function getShape(M) {
    return {
        rows: M.length,
        cols: M[0].length
    };
}

function assertRectangular(M, matrixName = 'Matrix') {
    if (!isMatrix(M)) {
        throw new Error(`${matrixName} is invalid.`);
    }

    const cols = M[0].length;
    for (let i = 0; i < M.length; i++) {
        if (!Array.isArray(M[i]) || M[i].length !== cols) {
            throw new Error(`${matrixName} is invalid.`);
        }
    }
}

function getMinorMatrix(M, skipRow, skipCol) {
    const out = [];

    for (let i = 0; i < M.length; i++) {
        if (i === skipRow) continue;

        const row = [];
        for (let j = 0; j < M[i].length; j++) {
            if (j === skipCol) continue;
            row.push(M[i][j]);
        }
        out.push(row);
    }

    return out;
}

// Fraction-friendly Bareiss determinant.
// Works much better than recursive Laplace expansion for minors.
function determinantBareiss(input) {
    const M = cloneMatrix(input);
    const n = M.length;

    if (n === 0) return math.fraction(1);
    if (n === 1) return toMathValue(M[0][0]);

    let sign = math.fraction(1);
    let prevPivot = math.fraction(1);

    for (let k = 0; k < n - 1; k++) {
        let pivotRow = k;

        while (pivotRow < n && math.equal(M[pivotRow][k], 0)) {
            pivotRow++;
        }

        if (pivotRow === n) {
            return math.fraction(0);
        }

        if (pivotRow !== k) {
            const temp = M[k];
            M[k] = M[pivotRow];
            M[pivotRow] = temp;
            sign = math.multiply(sign, -1);
        }

        const pivot = toMathValue(M[k][k]);

        for (let i = k + 1; i < n; i++) {
            for (let j = k + 1; j < n; j++) {
                const a = toMathValue(M[i][j]);
                const b = toMathValue(M[i][k]);
                const c = toMathValue(M[k][j]);

                // Bareiss formula:
                // M[i][j] = (pivot * a - b * c) / prevPivot
                const numerator = math.subtract(
                    math.multiply(pivot, a),
                    math.multiply(b, c)
                );

                M[i][j] = math.divide(numerator, prevPivot);
            }
        }

        for (let i = k + 1; i < n; i++) {
            M[i][k] = math.fraction(0);
        }

        prevPivot = pivot;
    }

    return math.multiply(sign, toMathValue(M[n - 1][n - 1]));
}

function transpose(M) {
    const rows = M.length;
    const cols = M[0].length;
    const out = Array.from({ length: cols }, () => Array(rows));

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            out[j][i] = M[i][j];
        }
    }

    return out;
}

function buildCofactorMatrix(M) {
    const n = M.length;

    // Special case: adj([a]) = [1]
    if (n === 1) {
        return [[math.fraction(1)]];
    }

    const cof = Array.from({ length: n }, () => Array(n));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const minor = getMinorMatrix(M, i, j);
            const detMinor = determinantBareiss(minor);
            const sign = ((i + j) % 2 === 0) ? 1 : -1;
            cof[i][j] = math.multiply(sign, detMinor);
        }
    }

    return cof;
}

function buildAdjoint(M) {
    const cofactorMatrix = buildCofactorMatrix(M);
    return transpose(cofactorMatrix);
}

export const config = {
    validate(matrices) {
        const A = matrices[0];

        if (!A || !A.length) {
            throw new Error('Please enter Matrix A.');
        }

        assertRectangular(A, 'Matrix A');

        const { rows, cols } = getShape(A);
        if (rows !== cols) {
            throw new Error('Adjoint is only defined for square matrices.');
        }
    }
};

export function calculate(matrices) {
    const A = normalizeMatrix(matrices[0]);
    return buildAdjoint(A);
}

export function generateProcessMatrix() {
    // Keep this simple for now.
    // The result itself is the main output; no extra process matrix needed.
    return [];
}