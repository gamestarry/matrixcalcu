export const STEP_TEXT = {
  en: {
    eigenvectors: {
      showSteps: 'Show Steps',
      hideSteps: 'Hide Steps',
      stepsTitle: 'Eigenvector Steps',
      step1: 'Step 1: Characteristic Equation',
      step2: 'Step 2: Finding Eigenvalues',
      step3: 'Step 3: Finding Eigenvectors',
      formulaCharacteristic: 'det(A - λI) = 0',
      numericalNote: 'Eigenvalues are computed numerically (QR iteration).',
      forLambda: (valueText) => `For λ = ${valueText}`,
      labelMatrixMinusLambdaI: 'A - λI',
      labelRref: 'RREF',
      labelEigenvector: 'Eigenvector',
      eigenvalueList: (items) => items.join(', ')
    },

    rref: {
      showSteps: 'Show Steps',
      hideSteps: 'Hide Steps',
      stepsTitle: 'RREF Steps',
      step: (n) => `Step ${n}`,
      initialMatrix: 'Initial matrix',
      swapRows: (fromRow, toRow) => `Swap R${fromRow} ↔ R${toRow}`,
      scaleRow: (row, factorText) => `R${row} ← (${factorText})R${row}`,
      rowAdd: (targetRow, factorText, pivotRow) => `R${targetRow} ← R${targetRow} + ${factorText}R${pivotRow}`,
      rowSubtract: (targetRow, factorText, pivotRow) => `R${targetRow} ← R${targetRow} - ${factorText}R${pivotRow}`
    }
  },

  es: {
    eigenvectors: {
      showSteps: 'Mostrar pasos',
      hideSteps: 'Ocultar pasos',
      stepsTitle: 'Pasos de vectores propios',
      step1: 'Paso 1: Ecuación característica',
      step2: 'Paso 2: Encontrar los valores propios',
      step3: 'Paso 3: Encontrar los vectores propios',
      formulaCharacteristic: 'det(A - λI) = 0',
      numericalNote: 'Los valores propios se calculan numéricamente (iteración QR).',
      forLambda: (valueText) => `Para λ = ${valueText}`,
      labelMatrixMinusLambdaI: 'A - λI',
      labelRref: 'RREF',
      labelEigenvector: 'Vector propio',
      eigenvalueList: (items) => items.join(', ')
    },

    rref: {
      showSteps: 'Mostrar pasos',
      hideSteps: 'Ocultar pasos',
      stepsTitle: 'Pasos de RREF',
      step: (n) => `Paso ${n}`,
      initialMatrix: 'Matriz inicial',
      swapRows: (fromRow, toRow) => `Intercambiar R${fromRow} ↔ R${toRow}`,
      scaleRow: (row, factorText) => `R${row} ← (${factorText})R${row}`,
      rowAdd: (targetRow, factorText, pivotRow) => `R${targetRow} ← R${targetRow} + ${factorText}R${pivotRow}`,
      rowSubtract: (targetRow, factorText, pivotRow) => `R${targetRow} ← R${targetRow} - ${factorText}R${pivotRow}`
    }
  },
};

export function getCurrentLang() {
  const lang = (document.documentElement.lang || 'en').toLowerCase();
  const base = lang.split('-')[0];
  return base || 'en';
}

export function getStepText(section) {
  const lang = getCurrentLang();
  const langPack = STEP_TEXT[lang] || STEP_TEXT.en;
  return langPack[section] || STEP_TEXT.en[section] || {};
}