const errorsEn = {
  ERR_MATRIX_A_REQUIRED: () => 'Please enter Matrix A.',
  ERR_INVALID_MATRIX_ROW_LENGTH: () => 'Invalid matrix row length.',
  ERR_INVALID_NUMBER: () => 'Matrix contains invalid number(s).',
  ERR_MULTIPLICATION_TWO_MATRICES_REQUIRED: () => 'Two matrices are required for multiplication.',
  ERR_MULTIPLICATION_DIMENSION_MISMATCH: ({ rowsA, colsA, rowsB, colsB }) =>
    `Matrix multiplication is not possible. Matrix A is ${rowsA}×${colsA}, Matrix B is ${rowsB}×${colsB}. The number of columns in Matrix A (${colsA}) must equal the number of rows in Matrix B (${rowsB}).`,
  ERR_LU_NOT_SQUARE: ({ rows, cols }) =>
    `LU decomposition requires a square matrix. Got ${rows}×${cols}.`,
  ERR_LU_ZERO_PIVOT: () => 'LU decomposition failed: pivot is 0 (matrix may be singular).',
  ERR_POWER_INTEGER_EXPONENT_REQUIRED: () => 'Power requires an integer exponent n (e.g., 0, 2, 3).',
  ERR_POWER_STEP_MULTIPLICATION_NOT_POSSIBLE: ({ rowsA, colsA, rowsB, colsB }) =>
    `Matrix multiplication not possible for power step: A is ${rowsA}×${colsA}, B is ${rowsB}×${colsB}.`,
  ERR_POWER_NOT_SQUARE: ({ r, c }) =>
    `Power requires a square matrix. Got A(${r}×${c}).`,
  ERR_POWER_NEGATIVE_NOT_SUPPORTED_WITH_HINT: () =>
    'Power currently supports n ≥ 0. (Negative powers require matrix inverse.)',
  ERR_POWER_N_TOO_LARGE: () => 'Power n is too large. Please use n ≤ 50.',
  ERR_POWER_NEGATIVE_NOT_SUPPORTED: () => 'Power currently supports n ≥ 0.',
  ERR_ARCSIN_NOT_SQUARE: () => 'Matrix arcsin requires a square matrix (n×n).',
  ERR_ARCSIN_MATRIX_TOO_LARGE: () => 'Matrix size too large for matrix arcsin.',
  ERR_ARCSIN_INPUT_TOO_LARGE: () =>
    'Input too large for arcsin(A) with the current method. Try scaling the whole matrix down (e.g., multiply all entries by 0.5) and try again.',
  ERR_ARCCOS_NOT_SQUARE: () => 'Matrix arccos requires a square matrix (n×n).',
  ERR_ARCCOS_MATRIX_TOO_LARGE: () => 'Matrix size too large for matrix arccos.',
  ERR_ARCCOS_INPUT_TOO_LARGE: ({ bound }) =>
    `Input too large for arccos(A) with the current method. Try smaller values (e.g., multiply all entries by 0.5) and try again. (Tip: this method works best when the matrix is scaled so its overall size is below about ${bound}.)`,
  ERR_BOTH_MATRICES_REQUIRED: () => 'Please enter both Matrix A and Matrix B.',
  ERR_ADDITION_SIZE_MISMATCH: ({ aRows, aCols, bRows, bCols }) =>
    `Addition requires matrices of the same size. Got A(${aRows}×${aCols}) and B(${bRows}×${bCols}).`,
  ERR_SUBTRACTION_SIZE_MISMATCH: ({ aRows, aCols, bRows, bCols }) =>
    `Subtraction requires matrices of the same size. Got A(${aRows}×${aCols}) and B(${bRows}×${bCols}).`,
  ERR_MATRIX_INVALID: ({ matrixName }) => `${matrixName} is invalid.`,
  ERR_ADJOINT_NOT_SQUARE: () => 'Adjoint is only defined for square matrices.',
  ERR_ARCTAN_NOT_SQUARE: () => 'Matrix arctan requires a square matrix (n×n).',
  ERR_ARCTAN_MATRIX_TOO_LARGE: () => 'Matrix size too large for matrix arctan.',
  ERR_ARCTAN_SERIES_BOUND: ({ bound }) =>
    `Matrix arctan series requires ||A|| < ${bound}. Try scaling A or use smaller values.`,
  ERR_AUGMENTED_ROW_MISMATCH: ({ rA, rB }) =>
    `Row mismatch: A has ${rA} rows, B has ${rB} rows.`,
  ERR_INVALID_MATRIX_A_ROW_LENGTH: () => 'Invalid Matrix A row length.',
  ERR_INVALID_MATRIX_B_ROW_LENGTH: () => 'Invalid Matrix B row length.',
  ERR_MATRIX_B_REQUIRED: () => 'Please enter Matrix B.',
  ERR_MATRIX_A_EMPTY: () => 'Matrix A is empty.',
  ERR_MATRIX_B_EMPTY: () => 'Matrix B is empty.',
  ERR_AUGMENTED_ROW_COUNT_MISMATCH: () => 'Augmented matrix requires A and B to have the same number of rows.',
  ERR_CHOLESKY_NOT_POSITIVE_DEFINITE: () => 'Cholesky requires a positive definite matrix.',
  ERR_CHOLESKY_NOT_SQUARE: () => 'Cholesky requires a square matrix.',
  ERR_CHOLESKY_NOT_SYMMETRIC: () => 'Cholesky requires a symmetric matrix (A = Aᵀ).',
  ERR_COSINE_INTERNAL_SOLVE_FAILED: () => 'Matrix cosine failed: internal expm solve failed (singular system).',
  ERR_COSINE_NOT_SQUARE: () => 'Matrix cosine requires a square matrix (n×n).',
  ERR_COSINE_MATRIX_TOO_LARGE: () => 'Matrix cosine currently supports up to 10×10 (for stability/performance).',
  ERR_DETERMINANT_INVALID_SHAPE: () => 'Invalid matrix: each row must have the same number of columns.',
  ERR_DETERMINANT_NOT_SQUARE: ({ rows, cols }) =>
    `Determinant is only defined for square matrices. Got A(${rows}×${cols}).`,
  ERR_EIGENVALUES_NOT_SQUARE: () => 'Eigenvalues require a square matrix.',
  ERR_EIGENVECTORS_NOT_SQUARE: () => 'Eigenvectors require a square matrix.',
  ERR_EXPONENTIAL_NOT_SQUARE: () => 'Matrix exponential requires a square matrix (n×n).',
  ERR_EXPONENTIAL_MATRIX_TOO_LARGE: () => 'Matrix size too large for matrix exponential.',
  ERR_HERMITE_INTEGER_ONLY: () => 'Hermite Normal Form is defined here for integer matrices only.',
  ERR_INVERSE_NOT_SQUARE: ({ r, c }) => `Inverse requires a square matrix. Got A(${r}×${c}).`,
  ERR_INVERSE_DETERMINANT_FAILED: () => 'Failed to compute determinant. Please check Matrix A.',
  ERR_INVERSE_SINGULAR: () => 'Matrix A is singular (det(A) = 0), so the inverse does not exist.',
  ERR_INVERSE_COMPUTE_FAILED: () => 'Failed to compute inverse. Please check whether Matrix A is invertible.',
  ERR_JORDAN_MATH_EIGS_UNAVAILABLE: () => 'Jordan form requires math.eigs, but it is not available in this environment.',
  ERR_JORDAN_COMPLEX_UNSUPPORTED: () => 'Jordan form for matrices with complex eigenvalues is not supported in this version.',
  ERR_JORDAN_UNSUPPORTED: () =>
    'Jordan form for this matrix is not supported in this version. Supported cases: 1×1, all 2×2 real cases, and n×n matrices with distinct real eigenvalues.',
  ERR_JORDAN_NOT_SQUARE: () => 'Jordan form is only defined for square matrices.',
  ERR_MATRIX_A_INVALID: () => 'Matrix A is invalid.',
  ERR_MATRIX_B_INVALID: () => 'Matrix B is invalid.',
  ERR_LLL_INTEGER_ONLY: () => 'LLL is defined here for integer matrices only.',
  ERR_LOG_SINGULAR_DURING_SQRT_SCALING: () => 'Matrix log failed: matrix became singular during sqrt scaling.',
  ERR_LOG_SQRT_SCALING_NOT_CONVERGED: () => 'Matrix log failed: sqrt scaling did not converge (ill-conditioned matrix).',
  ERR_LOG_INVERTIBLE_REQUIRED: () => 'Matrix logarithm requires an invertible matrix (det(A) ≠ 0).',
  ERR_LOG_A_PLUS_I_SINGULAR: () => 'Matrix log failed: (A + I) is singular after scaling.',
  ERR_LOG_NOT_SQUARE: () => 'Matrix logarithm requires a square matrix (n×n).',
  ERR_LOG_MATRIX_TOO_LARGE: () => 'Matrix size too large for matrix logarithm.',
  ERR_QR_INVALID_SHAPE: () => 'Invalid matrix shape: each row must have the same number of columns.',
  ERR_SINE_INTERNAL_SOLVE_FAILED: () => 'Matrix sine failed: internal expm solve failed (singular system).',
  ERR_SINE_NOT_SQUARE: () => 'Matrix sine requires a square matrix (n×n).',
  ERR_SINE_MATRIX_TOO_LARGE: () => 'Matrix sine currently supports up to 10×10 (for stability/performance).',
  ERR_SQRT_SINGULAR_DURING_ITERATION: () => 'Matrix square root failed: matrix became singular during iteration.',
  ERR_SQRT_NOT_CONVERGED: () => 'Matrix square root did not converge (no real principal square root or matrix is ill-conditioned).',
  ERR_SQRT_NOT_SQUARE: () => 'Matrix square root requires a square matrix (n×n).',
  ERR_SQRT_MATRIX_TOO_LARGE: () => 'Matrix size too large for matrix square root.',
  ERR_TANGENT_INTERNAL_SOLVE_FAILED: () => 'Matrix tangent failed: internal expm solve failed (singular system).',
  ERR_TANGENT_COS_SINGULAR: () => 'Matrix tangent failed: cos(A) is singular (not invertible).',
  ERR_TANGENT_NOT_SQUARE: () => 'Matrix tangent requires a square matrix (n×n).',
  ERR_TANGENT_MATRIX_TOO_LARGE: () => 'Matrix tangent currently supports up to 10×10 (for stability/performance).',
  ERR_TRACE_NOT_SQUARE: ({ rows, cols }) =>
    `Trace is only defined for square matrices. Got A(${rows}×${cols}).`,
  ERR_REQUIRED_MATH_LIBRARY_LOAD_FAILED: () =>
    'Error: Required math library failed to load. Please refresh the page.',
  ERR_CALCULATOR_MODULES_LOAD_FAILED: () =>
    'Failed to load calculator modules. Please refresh the page.',
  ERR_CALCULATOR_INIT_FAILED: () =>
    'Failed to initialize calculator. Please refresh the page.',
  ERR_OPERATION_NOT_FOUND: ({ opName }) => `Operation not found: ${opName}`,
  ERR_SINGLE_OP_NOT_REGISTERED: ({ action }) =>
    `Single-matrix op not registered: ${action}`,
  ERR_UNKNOWN_OPERATION: ({ action }) => `Unknown operation: ${action}`,
  ERR_MATRIX_TARGET_REQUIRED: ({ useTarget }) =>
    `Please enter Matrix ${useTarget}.`,
  ERR_MATRIX_A_CONTAINER_NOT_FOUND: () => 'Matrix A container not found.',
  ERR_SWAP_MATRICES_FAILED: () => 'Failed to swap matrices'
};

export default errorsEn;
