// js/core/transpose.js
// 单矩阵：Transpose
// 接口与 multiply.js/add.js/subtract.js 兼容：config / calculate / generateProcessMatrix

export const config = {
  name: 'Transpose',
  matrices: 1,
  validate(matrices) {
    const [A] = matrices || [];
    if (!A || !A.length || !A[0] || !A[0].length) {
      throw new Error('Please enter Matrix A.');
    }
  }
};

export function calculate(matrices) {
  const [A] = matrices;

  const rows = A.length;
  const cols = (A[0] || []).length;

  const T = [];
  for (let j = 0; j < cols; j++) {
    const row = [];
    for (let i = 0; i < rows; i++) {
      row.push(A[i][j]);
    }
    T.push(row);
  }
  return T;
}

// 可选：如果你想 Show steps 里也显示点东西，以后再加也行
export function generateProcessMatrix(A, rows, cols) {
  // 先返回空矩阵：不展示过程
  return [];
}