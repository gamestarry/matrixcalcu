const errorsEs = {
  ERR_MATRIX_A_REQUIRED: () => 'Por favor, introduce la matriz A.',
  ERR_INVALID_MATRIX_ROW_LENGTH: () => 'La matriz no es válida: todas las filas deben tener la misma longitud.',
  ERR_INVALID_NUMBER: () => 'La matriz contiene números no válidos.',
  ERR_MULTIPLICATION_TWO_MATRICES_REQUIRED: () => 'Se requieren dos matrices para la multiplicación.',
  ERR_MULTIPLICATION_DIMENSION_MISMATCH: ({ rowsA, colsA, rowsB, colsB }) =>
    `La multiplicación de matrices no es posible. La matriz A es ${rowsA}×${colsA}, la matriz B es ${rowsB}×${colsB}. El número de columnas de la matriz A (${colsA}) debe ser igual al número de filas de la matriz B (${rowsB}).`,
  ERR_LU_NOT_SQUARE: ({ rows, cols }) =>
    `La descomposición LU requiere una matriz cuadrada. Se recibió ${rows}×${cols}.`,
  ERR_LU_ZERO_PIVOT: () => 'La descomposición LU falló: el pivote es 0 (la matriz puede ser singular).',
  ERR_POWER_INTEGER_EXPONENT_REQUIRED: () => 'La potencia requiere un exponente entero n (por ejemplo, 0, 2 o 3).',
  ERR_POWER_STEP_MULTIPLICATION_NOT_POSSIBLE: ({ rowsA, colsA, rowsB, colsB }) =>
    `La multiplicación de matrices no es posible en el paso de potencia: A es ${rowsA}×${colsA} y B es ${rowsB}×${colsB}.`,
  ERR_POWER_NOT_SQUARE: ({ r, c }) =>
    `La potencia requiere una matriz cuadrada. Se recibió A(${r}×${c}).`,
  ERR_POWER_NEGATIVE_NOT_SUPPORTED_WITH_HINT: () =>
    'La potencia solo admite n ≥ 0 en la versión actual. Las potencias negativas requieren la inversa de la matriz.',
  ERR_POWER_N_TOO_LARGE: () => 'El exponente n es demasiado grande. Usa n ≤ 50.',
  ERR_POWER_NEGATIVE_NOT_SUPPORTED: () => 'La potencia solo admite n ≥ 0 en la versión actual.',
  ERR_ARCSIN_NOT_SQUARE: () => 'El arcoseno matricial requiere una matriz cuadrada (n×n).',
  ERR_ARCSIN_MATRIX_TOO_LARGE: () => 'El tamaño de la matriz es demasiado grande para el arcoseno matricial.',
  ERR_ARCSIN_INPUT_TOO_LARGE: () =>
    'La entrada es demasiado grande para arcsin(A) con el método actual. Intenta escalar toda la matriz hacia abajo, por ejemplo multiplicando todas las entradas por 0.5, y vuelve a intentarlo.',
  ERR_ARCCOS_NOT_SQUARE: () => 'El arcocoseno matricial requiere una matriz cuadrada (n×n).',
  ERR_ARCCOS_MATRIX_TOO_LARGE: () => 'El tamaño de la matriz es demasiado grande para el arcocoseno matricial.',
  ERR_ARCCOS_INPUT_TOO_LARGE: ({ bound }) =>
    `La entrada es demasiado grande para arccos(A) con el método actual. Intenta usar valores más pequeños, por ejemplo multiplicando todas las entradas por 0.5, y vuelve a intentarlo. Consejo: este método funciona mejor cuando la matriz está escalada para que su tamaño global sea inferior a aproximadamente ${bound}.`,
  ERR_BOTH_MATRICES_REQUIRED: () => 'Por favor, introduce tanto la matriz A como la matriz B.',
  ERR_ADDITION_SIZE_MISMATCH: ({ aRows, aCols, bRows, bCols }) =>
    `La suma requiere matrices del mismo tamaño. Se recibió A(${aRows}×${aCols}) y B(${bRows}×${bCols}).`,
  ERR_SUBTRACTION_SIZE_MISMATCH: ({ aRows, aCols, bRows, bCols }) =>
    `La resta requiere matrices del mismo tamaño. Se recibió A(${aRows}×${aCols}) y B(${bRows}×${bCols}).`,
  ERR_MATRIX_INVALID: ({ matrixName }) => `${matrixName} no es válida.`,
  ERR_ADJOINT_NOT_SQUARE: () => 'La matriz adjunta solo está definida para matrices cuadradas.',
  ERR_ARCTAN_NOT_SQUARE: () => 'La arcotangente matricial requiere una matriz cuadrada (n×n).',
  ERR_ARCTAN_MATRIX_TOO_LARGE: () => 'El tamaño de la matriz es demasiado grande para la arcotangente matricial.',
  ERR_ARCTAN_SERIES_BOUND: ({ bound }) =>
    `La serie de arctan matricial requiere ||A|| < ${bound}. Intenta escalar A o usar valores más pequeños.`,
  ERR_AUGMENTED_ROW_MISMATCH: ({ rA, rB }) =>
    `Las filas no coinciden: A tiene ${rA} filas y B tiene ${rB} filas.`,
  ERR_INVALID_MATRIX_A_ROW_LENGTH: () => 'La longitud de una fila de la matriz A no es válida.',
  ERR_INVALID_MATRIX_B_ROW_LENGTH: () => 'La longitud de una fila de la matriz B no es válida.',
  ERR_MATRIX_B_REQUIRED: () => 'Por favor, introduce la matriz B.',
  ERR_MATRIX_A_EMPTY: () => 'La matriz A está vacía.',
  ERR_MATRIX_B_EMPTY: () => 'La matriz B está vacía.',
  ERR_AUGMENTED_ROW_COUNT_MISMATCH: () => 'La matriz aumentada requiere que A y B tengan el mismo número de filas.',
  ERR_CHOLESKY_NOT_POSITIVE_DEFINITE: () => 'La descomposición de Cholesky requiere una matriz definida positiva.',
  ERR_CHOLESKY_NOT_SQUARE: () => 'La descomposición de Cholesky requiere una matriz cuadrada.',
  ERR_CHOLESKY_NOT_SYMMETRIC: () => 'La descomposición de Cholesky requiere una matriz simétrica (A = Aᵀ).',
  ERR_COSINE_INTERNAL_SOLVE_FAILED: () => 'El coseno matricial falló: la resolución interna de la exponencial matricial falló (sistema singular).',
  ERR_COSINE_NOT_SQUARE: () => 'El coseno matricial requiere una matriz cuadrada (n×n).',
  ERR_COSINE_MATRIX_TOO_LARGE: () => 'El coseno matricial actualmente solo admite matrices de hasta 10×10 (por estabilidad y rendimiento).',
  ERR_DETERMINANT_INVALID_SHAPE: () => 'La matriz no es válida: todas las filas deben tener el mismo número de columnas.',
  ERR_DETERMINANT_NOT_SQUARE: ({ rows, cols }) =>
    `El determinante solo está definido para matrices cuadradas. Se recibió A(${rows}×${cols}).`,
  ERR_EIGENVALUES_NOT_SQUARE: () => 'Los autovalores requieren una matriz cuadrada.',
  ERR_EIGENVECTORS_NOT_SQUARE: () => 'Los autovectores requieren una matriz cuadrada.',
  ERR_EXPONENTIAL_NOT_SQUARE: () => 'La exponencial matricial requiere una matriz cuadrada (n×n).',
  ERR_EXPONENTIAL_MATRIX_TOO_LARGE: () => 'El tamaño de la matriz es demasiado grande para la exponencial matricial.',
  ERR_HERMITE_INTEGER_ONLY: () => 'La forma normal de Hermite aquí solo está definida para matrices enteras.',
  ERR_INVERSE_NOT_SQUARE: ({ r, c }) => `La inversa requiere una matriz cuadrada. Se recibió A(${r}×${c}).`,
  ERR_INVERSE_DETERMINANT_FAILED: () => 'No se pudo calcular el determinante. Por favor, revisa la matriz A.',
  ERR_INVERSE_SINGULAR: () => 'La matriz A es singular (det(A) = 0), por lo que la inversa no existe.',
  ERR_INVERSE_COMPUTE_FAILED: () => 'No se pudo calcular la inversa. Por favor, verifica si la matriz A es invertible.',
  ERR_JORDAN_MATH_EIGS_UNAVAILABLE: () => 'La forma de Jordan requiere math.eigs, pero no está disponible en este entorno.',
  ERR_JORDAN_COMPLEX_UNSUPPORTED: () => 'La forma de Jordan para matrices con autovalores complejos no está soportada en esta versión.',
  ERR_JORDAN_UNSUPPORTED: () =>
    'La forma de Jordan para esta matriz no está soportada en esta versión. Casos compatibles: 1×1, todos los casos reales 2×2 y matrices n×n con autovalores reales distintos.',
  ERR_JORDAN_NOT_SQUARE: () => 'La forma de Jordan solo está definida para matrices cuadradas.',
  ERR_MATRIX_A_INVALID: () => 'La matriz A no es válida.',
  ERR_MATRIX_B_INVALID: () => 'La matriz B no es válida.',
  ERR_LLL_INTEGER_ONLY: () => 'La reducción LLL aquí solo está definida para matrices enteras.',
  ERR_LOG_SINGULAR_DURING_SQRT_SCALING: () => 'El logaritmo matricial falló: la matriz se volvió singular durante el escalado por raíces cuadradas.',
  ERR_LOG_SQRT_SCALING_NOT_CONVERGED: () => 'El logaritmo matricial falló: el escalado por raíces cuadradas no convergió (matriz mal condicionada).',
  ERR_LOG_INVERTIBLE_REQUIRED: () => 'El logaritmo matricial requiere una matriz invertible (det(A) ≠ 0).',
  ERR_LOG_A_PLUS_I_SINGULAR: () => 'El logaritmo matricial falló: (A + I) es singular después del escalado.',
  ERR_LOG_NOT_SQUARE: () => 'El logaritmo matricial requiere una matriz cuadrada (n×n).',
  ERR_LOG_MATRIX_TOO_LARGE: () => 'El tamaño de la matriz es demasiado grande para el logaritmo matricial.',
  ERR_QR_INVALID_SHAPE: () => 'La forma de la matriz no es válida: cada fila debe tener el mismo número de columnas.',
  ERR_SINE_INTERNAL_SOLVE_FAILED: () => 'El seno matricial falló: la resolución interna de la exponencial matricial falló (sistema singular).',
  ERR_SINE_NOT_SQUARE: () => 'El seno matricial requiere una matriz cuadrada (n×n).',
  ERR_SINE_MATRIX_TOO_LARGE: () => 'El seno matricial actualmente solo admite matrices de hasta 10×10 (por estabilidad y rendimiento).',
  ERR_SQRT_SINGULAR_DURING_ITERATION: () => 'La raíz cuadrada matricial falló: la matriz se volvió singular durante la iteración.',
  ERR_SQRT_NOT_CONVERGED: () => 'La raíz cuadrada matricial no convergió (no existe una raíz cuadrada principal real o la matriz está mal condicionada).',
  ERR_SQRT_NOT_SQUARE: () => 'La raíz cuadrada matricial requiere una matriz cuadrada (n×n).',
  ERR_SQRT_MATRIX_TOO_LARGE: () => 'El tamaño de la matriz es demasiado grande para la raíz cuadrada matricial.',
  ERR_TANGENT_INTERNAL_SOLVE_FAILED: () => 'La tangente matricial falló: la resolución interna de la exponencial matricial falló (sistema singular).',
  ERR_TANGENT_COS_SINGULAR: () => 'La tangente matricial falló: cos(A) es singular (no invertible).',
  ERR_TANGENT_NOT_SQUARE: () => 'La tangente matricial requiere una matriz cuadrada (n×n).',
  ERR_TANGENT_MATRIX_TOO_LARGE: () => 'La tangente matricial actualmente solo admite matrices de hasta 10×10 (por estabilidad y rendimiento).',
  ERR_TRACE_NOT_SQUARE: ({ rows, cols }) =>
    `La traza solo está definida para matrices cuadradas. Se recibió A(${rows}×${cols}).`,
  ERR_REQUIRED_MATH_LIBRARY_LOAD_FAILED: () =>
    'Error: no se pudo cargar la biblioteca matemática requerida. Por favor, actualiza la página.',
  ERR_CALCULATOR_MODULES_LOAD_FAILED: () =>
    'No se pudieron cargar los módulos de la calculadora. Por favor, actualiza la página.',
  ERR_CALCULATOR_INIT_FAILED: () =>
    'No se pudo inicializar la calculadora. Por favor, actualiza la página.',
  ERR_OPERATION_NOT_FOUND: ({ opName }) => `Operación no encontrada: ${opName}`,
  ERR_SINGLE_OP_NOT_REGISTERED: ({ action }) =>
    `La operación de matriz única no está registrada: ${action}`,
  ERR_UNKNOWN_OPERATION: ({ action }) => `Operación desconocida: ${action}`,
  ERR_MATRIX_TARGET_REQUIRED: ({ useTarget }) =>
    `Por favor, introduce la matriz ${useTarget}.`,
  ERR_MATRIX_A_CONTAINER_NOT_FOUND: () => 'No se encontró el contenedor de la matriz A.',
  ERR_SWAP_MATRICES_FAILED: () => 'No se pudieron intercambiar las matrices'
};

export default errorsEs;
