// ========== Matrix Addition Algorithm Module ==========

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
  validate(matrices) {
    const [A, B] = matrices || [];
    if (!A || !B) throw new Error('Please enter both Matrix A and Matrix B.');

    const aRows = A.length;
    const aCols = (A[0] || []).length;
    const bRows = B.length;
    const bCols = (B[0] || []).length;

    if (aRows !== bRows || aCols !== bCols) {
      throw new Error(
        `Addition requires matrices of the same size. Got A(${aRows}×${aCols}) and B(${bRows}×${bCols}).`
      );
    }
  }
};

export function calculate(matrices) {
  const [A, B] = matrices;

  const rows = A.length;
  const cols = (A[0] || []).length;

  const result = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(math.add(A[i][j], B[i][j]));
    }
    result.push(row);
  }
  return result;
}

// 生成过程矩阵：每个元素显示 a_ij + b_ij
export function generateProcessMatrix(A, aRows, aCols, B, bRows, bCols) {
  const process = [];

  for (let i = 0; i < aRows; i++) {
    const row = [];
    for (let j = 0; j < aCols; j++) {
      row.push(`${toFractionString(A[i][j])} + ${toFractionString(B[i][j])}`);
    }
    process.push(row);
  }

  return process;
}