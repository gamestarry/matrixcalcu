// js/core/jordan.js
// Single-matrix operation: Jordan Form
// Practical website version:
// - 1x1: supported
// - 2x2: supported (distinct eigenvalues / repeated eigenvalue with diagonalizable or 1 Jordan block)
// - nxn (n>=3): supported when eigenvalues are all distinct -> diagonal Jordan form
// - otherwise throws a clear message instead of returning a potentially wrong result

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

function toNumberValue(x) {
    if (typeof x === 'number') return x;
    try {
        return Number(math.number(x));
    } catch {
        return Number(x);
    }
}

function normalizeNumericMatrix(M) {
    return M.map(row => row.map(toNumberValue));
}

function cloneMatrix(M) {
    return M.map(row => row.slice());
}

function identityMatrix(n) {
    const I = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) I[i][i] = 1;
    return I;
}

function zeroMatrix(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function diagMatrix(values) {
    const n = values.length;
    const D = zeroMatrix(n, n);
    for (let i = 0; i < n; i++) D[i][i] = values[i];
    return D;
}

function approxEqual(a, b, eps = 1e-9) {
    return Math.abs(a - b) <= eps;
}

function cleanNumber(x, eps = 1e-10) {
    if (Math.abs(x) < eps) return 0;
    const rounded = Math.round(x);
    if (Math.abs(x - rounded) < eps) return rounded;
    return Number(x.toFixed(12));
}

function cleanMatrix(M, eps = 1e-10) {
    return M.map(row => row.map(v => cleanNumber(v, eps)));
}

function matrixSubtractLambdaI(A, lambda) {
    const n = A.length;
    const out = cloneMatrix(A);
    for (let i = 0; i < n; i++) {
        out[i][i] -= lambda;
    }
    return out;
}

function rankNumeric(M, eps = 1e-9) {
    const A = cloneMatrix(M).map(row => row.map(Number));
    const rows = A.length;
    const cols = A[0].length;
    let r = 0;
    let rank = 0;

    for (let c = 0; c < cols && r < rows; c++) {
        let pivot = r;
        for (let i = r + 1; i < rows; i++) {
            if (Math.abs(A[i][c]) > Math.abs(A[pivot][c])) pivot = i;
        }

        if (Math.abs(A[pivot][c]) < eps) continue;

        [A[r], A[pivot]] = [A[pivot], A[r]];

        const pv = A[r][c];
        for (let j = c; j < cols; j++) A[r][j] /= pv;

        for (let i = 0; i < rows; i++) {
            if (i === r) continue;
            const factor = A[i][c];
            if (Math.abs(factor) < eps) continue;
            for (let j = c; j < cols; j++) {
                A[i][j] -= factor * A[r][j];
            }
        }

        rank++;
        r++;
    }

    return rank;
}

function nullityNumeric(M, eps = 1e-9) {
    return M[0].length - rankNumeric(M, eps);
}

function getEigenvaluesViaMath(A) {
    if (typeof math.eigs !== 'function') {
        throw new Error('Jordan form requires math.eigs, but it is not available in this environment.');
    }

    const result = math.eigs(A);

    // math.eigs may return:
    // { values: [...] } or just an array-like in some environments
    const valuesRaw = Array.isArray(result) ? result : (result.values || []);

    return valuesRaw.map(v => {
        // Only real Jordan form in this version
        if (typeof v === 'object' && v !== null && 're' in v) {
            if (Math.abs(v.im || 0) > 1e-9) {
                throw new Error('Jordan form for matrices with complex eigenvalues is not supported in this version.');
            }
            return Number(v.re);
        }
        return toNumberValue(v);
    });
}

function sortNumeric(arr) {
    return arr.slice().sort((a, b) => a - b);
}

function compressEigenvalues(values, eps = 1e-8) {
    const sorted = sortNumeric(values);
    const groups = [];

    for (const v of sorted) {
        if (!groups.length || !approxEqual(groups[groups.length - 1].value, v, eps)) {
            groups.push({ value: v, mult: 1 });
        } else {
            groups[groups.length - 1].mult++;
        }
    }

    return groups;
}

function jordan2x2(A) {
    // Characteristic polynomial: λ² - tr(A) λ + det(A)
    const a = A[0][0], b = A[0][1], c = A[1][0], d = A[1][1];
    const tr = a + d;
    const det = a * d - b * c;
    const disc = tr * tr - 4 * det;

    if (disc < -1e-9) {
        throw new Error('Jordan form for matrices with complex eigenvalues is not supported in this version.');
    }

    if (Math.abs(disc) <= 1e-9) {
        const lambda = tr / 2;
        const B = matrixSubtractLambdaI(A, lambda);
        const r = rankNumeric(B);

        // If A = λI => diagonal Jordan form
        if (r === 0) {
            return cleanMatrix([
                [lambda, 0],
                [0, lambda]
            ]);
        }

        // Repeated eigenvalue, non-diagonalizable => one Jordan block
        return cleanMatrix([
            [lambda, 1],
            [0, lambda]
        ]);
    }

    const sqrtDisc = Math.sqrt(Math.max(0, disc));
    const l1 = (tr + sqrtDisc) / 2;
    const l2 = (tr - sqrtDisc) / 2;

    return cleanMatrix([
        [l1, 0],
        [0, l2]
    ]);
}

function jordanDistinctEigenvalues(A) {
    const vals = getEigenvaluesViaMath(A);
    const groups = compressEigenvalues(vals);

    // all distinct
    if (groups.length === A.length && groups.every(g => g.mult === 1)) {
        return cleanMatrix(diagMatrix(sortNumeric(vals)));
    }

    return null;
}

function jordanGeneral(A) {
    const n = A.length;

    if (n === 1) {
        return [[cleanNumber(A[0][0])]];
    }

    if (n === 2) {
        return jordan2x2(A);
    }

    // For 3x3+:
    // support only the safe case where eigenvalues are all distinct.
    const Jdistinct = jordanDistinctEigenvalues(A);
    if (Jdistinct) return Jdistinct;

    // Try a slightly smarter repeated-eigenvalue check for 3x3 only:
    // if one eigenvalue has algebraic multiplicity 2 and nullity(A-λI)=2,
    // then it contributes two 1x1 Jordan blocks; if nullity=1, then one 2x2 block.
    // We still avoid constructing all possible higher-order cases here.
    if (n === 3) {
        const vals = getEigenvaluesViaMath(A);
        const groups = compressEigenvalues(vals);

        if (groups.length === 2) {
            // one repeated, one simple
            let repeated = groups.find(g => g.mult === 2);
            let simple = groups.find(g => g.mult === 1);

            if (repeated && simple) {
                const B = matrixSubtractLambdaI(A, repeated.value);
                const nullity = nullityNumeric(B);

                if (nullity === 2) {
                    // diagonalizable on repeated eigenspace
                    return cleanMatrix(diagMatrix([
                        repeated.value,
                        repeated.value,
                        simple.value
                    ].sort((x, y) => x - y)));
                }

                if (nullity === 1) {
                    // one 2x2 Jordan block + one 1x1 block
                    const valsSorted = [repeated.value, repeated.value, simple.value].sort((x, y) => x - y);

                    // Build block with repeated eigenvalue adjacent
                    if (approxEqual(valsSorted[0], valsSorted[1])) {
                        return cleanMatrix([
                            [valsSorted[0], 1, 0],
                            [0, valsSorted[1], 0],
                            [0, 0, valsSorted[2]]
                        ]);
                    } else {
                        return cleanMatrix([
                            [valsSorted[0], 0, 0],
                            [0, valsSorted[1], 1],
                            [0, 0, valsSorted[2]]
                        ]);
                    }
                }
            }
        }
    }

    throw new Error(
        'Jordan form for this matrix is not supported in this version. ' +
        'Supported cases: 1×1, all 2×2 real cases, and n×n matrices with distinct real eigenvalues.'
    );
}

export const config = {
    validate(matrices) {
        const A = matrices[0];
        if (!A || !A.length) {
            throw new Error('Please enter Matrix A.');
        }

        assertRectangular(A, 'Matrix A');

        const rows = A.length;
        const cols = A[0].length;
        if (rows !== cols) {
            throw new Error('Jordan form is only defined for square matrices.');
        }
    }
};

export function calculate(matrices) {
    const A = normalizeNumericMatrix(matrices[0]);
    const J = jordanGeneral(A);
    return cleanMatrix(J);
}

export function generateProcessMatrix() {
    return [];
}