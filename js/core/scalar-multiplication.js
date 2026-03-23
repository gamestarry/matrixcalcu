// js/core/scalar-multiplication.js
// 单矩阵：kA（Scalar Multiplication）
// 与你现有 core 模块保持一致接口：config / calculate / generateProcessMatrix

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

// ✅ 解析 k：支持 "2" / "-3" / "1/5" / "0.25" 等
// 失败 -> 0（与你站内容错一致）
function parseScalarK(raw) {
  if (typeof math === 'undefined') return math.fraction(0);

  const str = (raw ?? '').toString().trim();

  // 如果未传值（自动执行时），尝试从 DOM 输入框读取
  if (str === '') {
    const el = document.getElementById('mBy-a-val');
    if (el && el.value.trim() !== '') {
      try {
        return math.fraction(el.value.trim());
      } catch {
        // 解析失败时回退到 2
        return math.fraction(2);
      }
    }
    return math.fraction(2); // 最终兜底值
  }

  try {
    return math.fraction(str);
  } catch {
    return math.fraction(0);
  }
}

export const config = {
  name: 'Scalar Multiplication',
  // 单矩阵操作：只要求 A 存在
  validate(matrices, value) {
    const [A] = matrices || [];
    if (!A || !A.length || !A[0] || !A[0].length) {
      throw new Error('Please enter Matrix A.');
    }

    // k 允许为空（当 0 处理），但如果你想强制要求输入，这里可以改为 throw
    // const k = (value ?? '').toString().trim();
    // if (!k) throw new Error('Please enter a scalar k.');
  }
};

// ✅ 纯计算：result = k * A
// 说明：为了兼容你 app 的调用方式，签名用 (matrices, value)
export function calculate(matrices, value = '') {
  const [A] = matrices;
  const k = parseScalarK(value);

  const rows = A.length;
  const cols = (A[0] || []).length;

  const result = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(math.multiply(k, A[i][j]));
    }
    result.push(row);
  }
  return result;
}

// ✅ 过程矩阵：每个元素显示 “k × a_ij”
export function generateProcessMatrix(A, aRows, aCols, _B, _bRows, _bCols, value = '') {
  const k = parseScalarK(value);
  const kStr = toFractionString(k);

  const process = [];
  for (let i = 0; i < aRows; i++) {
    const row = [];
    for (let j = 0; j < aCols; j++) {
      row.push(`${kStr} × ${toFractionString(A[i][j])}`);
    }
    process.push(row);
  }
  return process;
}