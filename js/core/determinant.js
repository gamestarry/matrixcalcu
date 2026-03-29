import { userError } from '../i18n/user-error.js';

// js/core/determinant.js
// 单矩阵：det(A)
// 与现有 app.js 单矩阵分发保持一致：export const config / export function calculate / export function generateProcessMatrix

// ✅ 仅用于“过程矩阵”显示：永远输出整数或分数，不转小数
function toFractionString(value) {
  if (typeof math === 'undefined') return '0';

  try {
    const f = math.isFraction(value) ? math.fraction(value) : math.fraction(String(value));
    if (math.compare(f.d, 1) === 0) return (f.s * f.n).toString();
    return `${f.s * f.n}/${f.d}`;
  } catch {
    return String(value);
  }
}

export const config = {
  name: 'Determinant',
  matrices: 1,
  allowNonSquare: false,

  validate(matrices) {
    const A = matrices?.[0];
    if (!A || !A.length || !A[0] || !A[0].length) {
      throw userError('ERR_MATRIX_A_REQUIRED');
    }

    const rows = A.length;
    const cols = (A[0] || []).length;

    // 矩阵必须是规则矩阵（每行列数一致）
    for (let i = 0; i < rows; i++) {
      if (!A[i] || A[i].length !== cols) {
        throw userError('ERR_DETERMINANT_INVALID_SHAPE');
      }
    }

    if (rows !== cols) {
      throw userError('ERR_DETERMINANT_NOT_SQUARE', { rows, cols });
    }
  }
};

export function calculate(matrices) {
  const A = matrices[0];

  // math.js 的 det 支持 Array of Array（元素可为 Fraction）
  const detVal = math.det(A);

  // ✅ 结果包装成 1×1 矩阵，兼容你现有 renderResultMatrix / displayResult
  return [[detVal]];
}

// 过程矩阵：给一个很“稳”的展示（不做复杂展开，后面可升级）
export function generateProcessMatrix(A, aRows, aCols) {
  // 这里用 1×1 过程矩阵，显示 det([a_ij]) 的形式（全分数）
  // 你点 Show steps 时看到的是“det(A) where A = [...]”
  const lines = [];

  // 构造一个紧凑矩阵字符串（分数/整数）
  const matStr = A
    .map(row => '[' + row.map(cell => toFractionString(cell)).join(', ') + ']')
    .join(', ');

  lines.push(`det(A)`);
  lines.push(`A = [ ${matStr} ]`);
  lines.push(`computed by math.det`);

  // 仍然返回“矩阵形态”，方便你现有 process 渲染逻辑
  return [[lines.join('\n')]];
}
