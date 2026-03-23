// js/core/inverse.js
// 单矩阵：Inverse(A)
// 接口：config / calculate / generateProcessMatrix

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

function isSquareMatrix(A) {
  const rows = A.length;
  const cols = (A[0] || []).length;
  return rows > 0 && cols > 0 && rows === cols;
}

export const config = {
  name: 'Inverse',
  matrices: 1,
  allowNonSquare: false,

  validate(matrices) {
    const [A] = matrices || [];
    if (!A) throw new Error('Please enter Matrix A.');
    if (!A.length || !(A[0] || []).length) throw new Error('Please enter Matrix A.');

    if (!isSquareMatrix(A)) {
      const r = A.length;
      const c = (A[0] || []).length;
      throw new Error(`Inverse requires a square matrix. Got A(${r}×${c}).`);
    }

    // ✅ det(A) ≠ 0 才可逆
    let det;
    try {
      det = math.det(A);
    } catch (e) {
      // 有些情况下 det 可能因类型/尺寸问题报错
      throw new Error('Failed to compute determinant. Please check Matrix A.');
    }

    try {
      // det 可能是 Fraction/number/BigNumber
      if (math.compare(det, 0) === 0) {
        throw new Error('Matrix A is singular (det(A) = 0), so the inverse does not exist.');
      }
    } catch {
      // compare 失败就用 number 尝试兜底
      const dNum = Number(math.number(det));
      if (!Number.isFinite(dNum) || dNum === 0) {
        throw new Error('Matrix A is singular (det(A) = 0), so the inverse does not exist.');
      }
    }
  }
};

export function calculate(matrices) {
  const [A] = matrices;

  try {
    // math.inv 会返回一个矩阵（元素类型由 math.js 决定）
    return math.inv(A);
  } catch (e) {
    // 常见原因：奇异矩阵、数值类型混乱
    throw new Error('Failed to compute inverse. Please check whether Matrix A is invertible.');
  }
}

// ✅ 生成过程矩阵：给一个“分数表达式”的简洁提示（不做长推导）
export function generateProcessMatrix(A, aRows, aCols) {
  // 这里不展示每个元素的推导（太长），只给一个清晰过程提示
  // 你 UI 的“过程矩阵”是 grid 显示，所以用 1×1 就行
  // 同时把 det(A) 显示出来，方便用户理解“为何不可逆”
  let detStr = '';
  try {
    const det = math.det(A);
    detStr = toFractionString(det);
  } catch {
    detStr = '?';
  }

  return [[`A⁻¹  (det(A) = ${detStr})`]];
}