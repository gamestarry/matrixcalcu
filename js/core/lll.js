import { userError } from '../i18n/user-error.js';

// js/core/lll.js
// Single-matrix operation: LLL reduction
// Integer matrices only
// Returns an LLL-reduced basis (row basis)

function isMatrix(M) {
    return Array.isArray(M) &&
        M.length > 0 &&
        Array.isArray(M[0]) &&
        M[0].length > 0;
}

function assertRectangular(M, name = 'Matrix') {
    if (!isMatrix(M)) {
        throw userError('ERR_MATRIX_INVALID', { matrixName: name });
    }

    const cols = M[0].length;
    for (let i = 0; i < M.length; i++) {
        if (!Array.isArray(M[i]) || M[i].length !== cols) {
            throw userError('ERR_MATRIX_INVALID', { matrixName: name });
        }
    }
}

function toIntegerValue(x) {
    try {
        const v = math.fraction(x);
        if (v.d !== 1) return null;
        return Number(v.s * v.n);
    } catch {
        const n = Number(x);
        return Number.isInteger(n) ? n : null;
    }
}

function normalizeIntegerMatrix(M) {
    return M.map(row =>
        row.map(cell => {
            const v = toIntegerValue(cell);
            if (v === null) {
                throw userError('ERR_LLL_INTEGER_ONLY');
            }
            return v;
        })
    );
}

function cloneMatrix(M) {
    return M.map(row => row.slice());
}

function dot(u, v) {
    let s = 0;
    for (let i = 0; i < u.length; i++) s += u[i] * v[i];
    return s;
}

function scalarMul(v, a) {
    return v.map(x => x * a);
}

function subVec(u, v) {
    return u.map((x, i) => x - v[i]);
}

function addVec(u, v) {
    return u.map((x, i) => x + v[i]);
}

function gramSchmidt(B) {
    // B = row basis
    const n = B.length;
    const m = B[0].length;

    const Bstar = Array.from({ length: n }, () => Array(m).fill(0));
    const mu = Array.from({ length: n }, () => Array(n).fill(0));
    const normSq = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
        let v = B[i].slice();

        for (let j = 0; j < i; j++) {
            if (Math.abs(normSq[j]) < 1e-12) {
                mu[i][j] = 0;
                continue;
            }

            mu[i][j] = dot(B[i], Bstar[j]) / normSq[j];
            v = subVec(v, scalarMul(Bstar[j], mu[i][j]));
        }

        Bstar[i] = v;
        normSq[i] = dot(v, v);
    }

    return { Bstar, mu, normSq };
}

function swapRows(M, i, j) {
    const tmp = M[i];
    M[i] = M[j];
    M[j] = tmp;
}

function isZeroRow(row) {
    return row.every(v => v === 0);
}

function moveZeroRowsToBottom(M) {
    const nonZero = M.filter(r => !isZeroRow(r));
    const zero = M.filter(r => isZeroRow(r));
    return [...nonZero, ...zero];
}

/*
Classic LLL reduction on row basis.
delta default = 0.75
*/
function lllReduce(inputBasis, delta = 0.75) {
    let B = cloneMatrix(inputBasis);
    B = moveZeroRowsToBottom(B);

    const n = B.length;
    if (n === 0) return B;

    let k = 1;

    while (k < n) {
        // Recompute GS every loop for robustness/simplicity
        let { mu, normSq } = gramSchmidt(B);

        // Size reduction
        for (let j = k - 1; j >= 0; j--) {
            const q = Math.round(mu[k][j]);
            if (q !== 0) {
                B[k] = subVec(B[k], scalarMul(B[j], q));
            }
        }

        ({ mu, normSq } = gramSchmidt(B));

        // Lovász condition
        const left = normSq[k];
        const right = (delta - mu[k][k - 1] * mu[k][k - 1]) * normSq[k - 1];

        if (left >= right - 1e-12) {
            k++;
        } else {
            swapRows(B, k, k - 1);
            k = Math.max(k - 1, 1);
        }
    }

    return moveZeroRowsToBottom(B).map(row =>
        row.map(x => {
            const r = Math.round(x);
            return Math.abs(x - r) < 1e-9 ? r : Number(x.toFixed(12));
        })
    );
}

export const config = {
    validate(matrices) {
        const A = matrices[0];

        if (!A || !A.length) {
            throw userError('ERR_MATRIX_A_REQUIRED');
        }

        assertRectangular(A, 'Matrix A');
        normalizeIntegerMatrix(A);
    }
};

export function calculate(matrices) {
    const A = normalizeIntegerMatrix(matrices[0]);
    return lllReduce(A, 0.75);
}

export function generateProcessMatrix() {
    // Keep simple/stable for now.
    return [];
}
