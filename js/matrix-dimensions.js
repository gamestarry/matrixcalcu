(function (root) {
    'use strict';

    const MIN_SIZE = 1;
    const MAX_SIZE = 9;
    const DEFAULT_SIZE = 3;

    function clampDimension(value) {
        if (value < MIN_SIZE) return MIN_SIZE;
        if (value > MAX_SIZE) return MAX_SIZE;
        return value;
    }

    function normalizeDimension(value) {
        const numberValue = Number(value);
        if (!Number.isFinite(numberValue)) return DEFAULT_SIZE;

        return clampDimension(Math.trunc(numberValue));
    }

    function check(rowsA, colsA, rowsB, colsB) {
        const normalizedRowsA = normalizeDimension(rowsA);
        const normalizedColsA = normalizeDimension(colsA);
        const normalizedRowsB = normalizeDimension(rowsB);
        const normalizedColsB = normalizeDimension(colsB);

        const canMultiplyAB = normalizedColsA === normalizedRowsB;
        const canMultiplyBA = normalizedColsB === normalizedRowsA;

        return {
            rowsA: normalizedRowsA,
            colsA: normalizedColsA,
            rowsB: normalizedRowsB,
            colsB: normalizedColsB,

            canMultiplyAB,
            canMultiplyBA,

            innerAB: {
                left: normalizedColsA,
                right: normalizedRowsB,
                matches: canMultiplyAB
            },

            innerBA: {
                left: normalizedColsB,
                right: normalizedRowsA,
                matches: canMultiplyBA
            },

            resultAB: canMultiplyAB ? {
                rows: normalizedRowsA,
                cols: normalizedColsB
            } : null,

            resultBA: canMultiplyBA ? {
                rows: normalizedRowsB,
                cols: normalizedColsA
            } : null,

            suggestionsAB: {
                requiredRowsB: normalizedColsA,
                requiredColsA: normalizedRowsB
            }
        };
    }

    root.MatrixDimensions = {
        MIN_SIZE,
        MAX_SIZE,
        normalizeDimension,
        check
    };
})(typeof window !== 'undefined' ? window : globalThis);
