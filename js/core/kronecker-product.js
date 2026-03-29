import { userError } from '../i18n/user-error.js';

// js/core/kronecker-product.js
// Binary operation: Kronecker Product  A ⊗ B

function isMatrix(M) {
    return Array.isArray(M) &&
        M.length > 0 &&
        Array.isArray(M[0]) &&
        M[0].length > 0;
}

function getShape(M) {
    return {
        rows: M.length,
        cols: M[0].length
    };
}

function toMathValue(x) {
    try {
        return math.fraction(x);
    } catch {
        return x;
    }
}

function multiplyScalarByMatrix(scalar, B) {
    return B.map(row =>
        row.map(cell => math.multiply(scalar, toMathValue(cell)))
    );
}

function buildKroneckerProduct(A, B) {
    const { rows: rowsA, cols: colsA } = getShape(A);
    const { rows: rowsB, cols: colsB } = getShape(B);

    const result = Array.from({ length: rowsA * rowsB }, () =>
        Array.from({ length: colsA * colsB }, () => 0)
    );

    for (let i = 0; i < rowsA; i++) {
        for (let j = 0; j < colsA; j++) {
            const aij = toMathValue(A[i][j]);

            for (let r = 0; r < rowsB; r++) {
                for (let c = 0; c < colsB; c++) {
                    result[i * rowsB + r][j * colsB + c] = math.multiply(
                        aij,
                        toMathValue(B[r][c])
                    );
                }
            }
        }
    }

    return result;
}

export const config = {
    validate(matrices) {
        const A = matrices[0];
        const B = matrices[1];

        if (!isMatrix(A)) {
            throw userError('ERR_MATRIX_A_REQUIRED');
        }

        if (!isMatrix(B)) {
            throw userError('ERR_MATRIX_B_REQUIRED');
        }

        const colsA = A[0].length;
        const colsB = B[0].length;

        for (let i = 0; i < A.length; i++) {
            if (!Array.isArray(A[i]) || A[i].length !== colsA) {
                throw userError('ERR_MATRIX_A_INVALID');
            }
        }

        for (let i = 0; i < B.length; i++) {
            if (!Array.isArray(B[i]) || B[i].length !== colsB) {
                throw userError('ERR_MATRIX_B_INVALID');
            }
        }
    }
};

export function calculate(matrices) {
    const A = matrices[0];
    const B = matrices[1];
    return buildKroneckerProduct(A, B);
}

export function generateProcessMatrix(A, rowsA, colsA, B, rowsB, colsB) {
    // 这里给一个简洁过程说明矩阵：
    // 用字符串形式显示每个块是 a_ij · B
    // 如果您的 matrix-output.js 对字符串矩阵支持一般，也可以直接 return []
    const process = [];

    for (let i = 0; i < rowsA; i++) {
        const blockRows = Array.from({ length: rowsB }, () => []);

        for (let j = 0; j < colsA; j++) {
            const label = `${A[i][j]}·B`;

            for (let r = 0; r < rowsB; r++) {
                for (let c = 0; c < colsB; c++) {
                    blockRows[r].push(label);
                }
            }
        }

        process.push(...blockRows);
    }

    return process;
}
