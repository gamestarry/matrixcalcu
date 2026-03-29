import { userError } from '../i18n/user-error.js';

// js/core/diagonal.js
// 单矩阵：Diagonal Matrix（提取对角元素，生成同尺寸对角矩阵）
// 接口：config / calculate / generateProcessMatrix
// 约定：输入矩阵元素可能是 math.js Fraction/BigNumber/number

function toFractionString(value) {
  if (typeof math === 'undefined') return '0';
  try {
    const f = math.isFraction(value) ? math.fraction(value) : math.fraction(String(value));
    if (math.compare(f.d, 1) === 0) return (f.s * f.n).toString();
    return `${f.s * f.n}/${f.d}`;
  } catch {
    try { return math.format(value); } catch { return String(value); }
  }
}

export const config = {
  name: 'Diagonal',
  // 允许非方阵：对角线取 min(rows, cols)
  validate(matrices) {
    const [A] = matrices || [];
    if (!A || !A.length || !A[0] || !A[0].length) {
      throw userError('ERR_MATRIX_A_REQUIRED');
    }
  }
};

export function calculate(matrices) {
  const [A] = matrices;

  const rows = A.length;
  const cols = (A[0] || []).length;

  const zero = math.fraction(0);

  // 生成同尺寸矩阵，非对角线为0，对角线为 A[i][i]
  const result = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(i === j ? A[i][j] : zero);
    }
    result.push(row);
  }

  return result;
}

// 过程矩阵：展示每个格子怎么来的（对角线显示 Aii，其余显示 0）
export function generateProcessMatrix(A, rows, cols) {
  const process = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(i === j ? toFractionString(A[i][j]) : '0');
    }
    process.push(row);
  }
  return process;
}
