import { userError } from '../i18n/user-error.js';

// js/core/trace.js
// 单矩阵：Trace(A) = a11 + a22 + ... + ann
// 接口与现有模块一致：config / calculate / generateProcessMatrix

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
  name: 'Trace',
  validate(matrices) {
    const [A] = matrices || [];
    if (!A) throw userError('ERR_MATRIX_A_REQUIRED');

    const rows = A.length;
    const cols = (A[0] || []).length;

    if (!rows || !cols) throw userError('ERR_MATRIX_A_REQUIRED');
    if (rows !== cols) {
      throw userError('ERR_TRACE_NOT_SQUARE', { rows, cols });
    }
  }
};

// ✅ 返回 1×1 矩阵：[[trace]]
// 这样不用改 output 层的“矩阵渲染”逻辑
export function calculate(matrices) {
  const [A] = matrices;

  const n = A.length;
  let sum = math.fraction(0);

  for (let i = 0; i < n; i++) {
    // A[i][i] 理论上是 Fraction（你的输入模块已处理）
    sum = math.add(sum, A[i][i]);
  }

  return [[sum]];
}

// ✅ 过程矩阵：同样返回 1×1，显示对角线求和表达式
export function generateProcessMatrix(A, aRows, aCols) {
  const n = Math.min(aRows, aCols);
  const parts = [];

  for (let i = 0; i < n; i++) {
    parts.push(toFractionString(A[i][i]));
  }

  const expr = parts.length ? parts.join(' + ') : '0';
  return [[expr]];
}
