// js/core/power.js
// 单矩阵：A^n（矩阵幂）
// 接口与 multiply.js/add.js/subtract.js 保持一致：config / calculate / generateProcessMatrix

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

function parseIntegerExponent(nLike) {
  // 允许传入 number / string（来自 pow-a-val）
  const s = (nLike == null) ? '' : String(nLike).trim();
  if (s === '') return 2; // 默认 2
  // 只允许整数（支持 "3" "-2"）
  if (!/^-?\d+$/.test(s)) throw new Error('Power requires an integer exponent n (e.g., 0, 2, 3).');
  const n = parseInt(s, 10);
  return n;
}

function isSquareMatrix(A) {
  const rows = A.length;
  const cols = (A[0] || []).length;
  return rows > 0 && cols > 0 && rows === cols;
}

function identityMatrix(n) {
  const I = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      row.push(i === j ? math.fraction(1) : math.fraction(0));
    }
    I.push(row);
  }
  return I;
}

function matrixMultiply(A, B) {
  const rowsA = A.length;
  const colsA = (A[0] || []).length;
  const rowsB = B.length;
  const colsB = (B[0] || []).length;

  if (colsA !== rowsB) {
    throw new Error(`Matrix multiplication not possible for power step: A is ${rowsA}×${colsA}, B is ${rowsB}×${colsB}.`);
  }

  const out = [];
  for (let i = 0; i < rowsA; i++) {
    const row = [];
    for (let j = 0; j < colsB; j++) {
      let sum = math.fraction(0);
      for (let k = 0; k < colsA; k++) {
        sum = math.add(sum, math.multiply(A[i][k], B[k][j]));
      }
      row.push(sum);
    }
    out.push(row);
  }
  return out;
}

function matrixPower(A, n) {
  // n >= 0
  const size = A.length;

  if (n === 0) return identityMatrix(size);
  if (n === 1) return A;

  // fast exponentiation
  let result = identityMatrix(size);
  let base = A;
  let exp = n;

  while (exp > 0) {
    if (exp % 2 === 1) result = matrixMultiply(result, base);
    exp = Math.floor(exp / 2);
    if (exp > 0) base = matrixMultiply(base, base);
  }
  return result;
}

export const config = {
  name: 'Power',
  // 这里不强制依赖 value，但 validate/calculate 会用到 n
  validate(matrices, value) {
    const A = Array.isArray(matrices) ? matrices[0] : matrices;
    if (!A || !A.length || !(A[0] || []).length) {
      throw new Error('Please enter Matrix A.');
    }

    if (!isSquareMatrix(A)) {
      const r = A.length;
      const c = (A[0] || []).length;
      throw new Error(`Power requires a square matrix. Got A(${r}×${c}).`);
    }

    const n = parseIntegerExponent(value);

    // 先做你现在最稳的版本：n 必须 >= 0
    if (n < 0) {
      throw new Error('Power currently supports n ≥ 0. (Negative powers require matrix inverse.)');
    }

    // 可选：给个上限防止用户输入太大卡死页面
    if (n > 50) {
      throw new Error('Power n is too large. Please use n ≤ 50.');
    }
  }
};

export function calculate(matrices, value) {
  const A = Array.isArray(matrices) ? matrices[0] : matrices;

  const n = parseIntegerExponent(value);

  // validate 会在 app 里调用；这里再做一次防御
  if (!isSquareMatrix(A)) {
    const r = A.length;
    const c = (A[0] || []).length;
    throw new Error(`Power requires a square matrix. Got A(${r}×${c}).`);
  }
  if (n < 0) throw new Error('Power currently supports n ≥ 0.');

  return matrixPower(A, n);
}

// ✅ 过程矩阵（用于 Show Calculation Process）：统一用分数/整数展示
// 这里不做逐元素展开（会非常长），只显示“Power 形式”的过程提示。
export function generateProcessMatrix(A, aRows, aCols, _B, _bRows, _bCols, value) {
  const n = parseIntegerExponent(value);

  const rows = aRows;
  const cols = aCols;

  let label = `A^${n}`;
  if (n === 0) label = 'I (identity)';
  if (n === 1) label = 'A';

  const process = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      // 额外给一点“分数味”：在 process 里让用户看到 A 的元素仍是分数体系
      // 但不展开乘法，只显示 A^n（更清爽）
      row.push(label);
    }
    process.push(row);
  }
  return process;
}