import { userError } from '../i18n/user-error.js';

// ========== Matrix Multiplication Algorithm Module ==========

// ✅ 仅用于“过程矩阵”显示：永远输出整数或分数，不转小数
function toFractionString(value) {
    if (typeof math === 'undefined') return '0';

    try {
        const f = math.isFraction(value) ? math.fraction(value) : math.fraction(String(value));

        // 分母为 1 => 整数
        if (math.compare(f.d, 1) === 0) {
            return (f.s * f.n).toString();
        }
        return `${f.s * f.n}/${f.d}`;
    } catch {
        // 兜底
        return String(value);
    }
}

// 矩阵乘法配置对象
export const config = {
    matrices: 2,
    allowNonSquare: true,

    validate(matrices) {
        if (!matrices || matrices.length < 2) {
            throw userError('ERR_MULTIPLICATION_TWO_MATRICES_REQUIRED');
        }

        const matrixA = matrices[0];
        const matrixB = matrices[1];

        const rowsA = matrixA.length;
        const colsA = matrixA[0]?.length || 0;
        const rowsB = matrixB.length;
        const colsB = matrixB[0]?.length || 0;

        if (colsA !== rowsB) {
            // 保持你现有的提示风格（含 <br>），不在这里强行拆 UI
            throw userError('ERR_MULTIPLICATION_DIMENSION_MISMATCH', {
                rowsA,
                colsA,
                rowsB,
                colsB
            });
        }
    }
};

// 纯计算函数 - 矩阵乘法算法
export function calculate(matrices) {
    const matrixA = matrices[0];
    const matrixB = matrices[1];

    const rowsA = matrixA.length;
    const colsA = matrixA[0]?.length || 0;
    const colsB = matrixB[0]?.length || 0;

    const result = [];

    for (let i = 0; i < rowsA; i++) {
        const row = [];
        for (let j = 0; j < colsB; j++) {
            let sum = math.fraction(0);
            for (let k = 0; k < colsA; k++) {
                sum = math.add(sum, math.multiply(matrixA[i][k], matrixB[k][j]));
            }
            row.push(sum);
        }
        result.push(row);
    }

    return result;
}

// 生成过程矩阵（显示计算过程）
// 说明：processMatrix 走 output 的 isProcess=true 分支（innerHTML），这里返回纯字符串即可
export function generateProcessMatrix(matrixA, rowsA, colsA, matrixB, rowsB, colsB) {
    const processMatrix = [];

    for (let i = 0; i < rowsA; i++) {
        const row = [];
        for (let j = 0; j < colsB; j++) {
            const parts = [];
            for (let k = 0; k < colsA; k++) {
                const aStr = toFractionString(matrixA[i][k]);
                const bStr = toFractionString(matrixB[k][j]);
                parts.push(`${aStr}×${bStr}`);
            }
            row.push(parts.join(' + '));
        }
        processMatrix.push(row);
    }

    return processMatrix;
}
