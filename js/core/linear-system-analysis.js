(function (root) {
    'use strict';

    const ZERO_TOLERANCE = 1e-12;

    function getMath() {
        const mathRef = root && root.math;
        if (!mathRef) {
            throw new Error('LinearSystemAnalysis requires math.js to analyze matrix values.');
        }
        return mathRef;
    }

    function isSupportedPrimitive(value) {
        if (typeof value === 'number') return Number.isFinite(value);
        if (typeof value === 'string') return value.trim().length > 0;
        return value != null;
    }

    function toMathValue(value) {
        if (!isSupportedPrimitive(value)) {
            throw new Error(`Unsupported matrix value: ${String(value)}`);
        }

        const mathRef = getMath();
        try {
            const converted = mathRef.fraction(value);
            if (typeof converted === 'number' && !Number.isFinite(converted)) {
                throw new Error('Non-finite number');
            }
            return converted;
        } catch (error) {
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            throw new Error(`Unsupported matrix value: ${String(value)}`);
        }
    }

    function isZero(value) {
        const mathRef = getMath();
        try {
            return mathRef.equal(toMathValue(value), 0);
        } catch (error) {
            if (typeof value === 'number' && Number.isFinite(value)) {
                return Math.abs(value) < ZERO_TOLERANCE;
            }
            throw error;
        }
    }

    function add(a, b) {
        return toMathValue(getMath().add(toMathValue(a), toMathValue(b)));
    }

    function subtract(a, b) {
        return toMathValue(getMath().subtract(toMathValue(a), toMathValue(b)));
    }

    function multiply(a, b) {
        return toMathValue(getMath().multiply(toMathValue(a), toMathValue(b)));
    }

    function divide(a, b) {
        if (isZero(b)) {
            throw new Error('Cannot divide by zero while analyzing an RREF matrix.');
        }
        return toMathValue(getMath().divide(toMathValue(a), toMathValue(b)));
    }

    function negate(value) {
        return toMathValue(getMath().unaryMinus(toMathValue(value)));
    }

    function zero() {
        return toMathValue(0);
    }

    function one() {
        return toMathValue(1);
    }

    function validateVariableCount(variableCount) {
        if (!Number.isInteger(variableCount) || variableCount <= 0) {
            throw new Error('variableCount must be a positive integer.');
        }
    }

    function validateRrefMatrix(rrefMatrix, variableCount) {
        validateVariableCount(variableCount);

        if (!Array.isArray(rrefMatrix) || rrefMatrix.length === 0) {
            throw new Error('rrefMatrix must be a non-empty two-dimensional array.');
        }

        if (!Array.isArray(rrefMatrix[0]) || rrefMatrix[0].length === 0) {
            throw new Error('rrefMatrix rows must be non-empty arrays.');
        }

        const expectedColumns = variableCount + 1;
        const columnCount = rrefMatrix[0].length;
        if (columnCount !== expectedColumns) {
            throw new Error(`rrefMatrix column count must equal variableCount + 1 (${expectedColumns}).`);
        }

        return rrefMatrix.map((row, rowIndex) => {
            if (!Array.isArray(row)) {
                throw new Error(`rrefMatrix row ${rowIndex} must be an array.`);
            }

            if (row.length !== columnCount) {
                throw new Error(`rrefMatrix row ${rowIndex} has an inconsistent column count.`);
            }

            return row.map((cell) => toMathValue(cell));
        });
    }

    function findPivotData(matrix, variableCount) {
        const pivotColumns = [];
        const pivotRows = [];
        const pivotRowByColumn = {};
        const seen = new Set();

        matrix.forEach((row, rowIndex) => {
            let pivotColumn = -1;
            for (let col = 0; col < variableCount; col++) {
                if (!isZero(row[col])) {
                    pivotColumn = col;
                    break;
                }
            }

            if (pivotColumn === -1 || seen.has(pivotColumn)) {
                return;
            }

            seen.add(pivotColumn);
            pivotColumns.push(pivotColumn);
            pivotRows.push(rowIndex);
            pivotRowByColumn[pivotColumn] = rowIndex;
        });

        return {
            pivotColumns,
            pivotRows,
            pivotRowByColumn
        };
    }

    function findInconsistentRows(matrix, variableCount) {
        const rhsColumn = variableCount;
        const rows = [];

        matrix.forEach((row, rowIndex) => {
            const zeroCoefficients = row.slice(0, variableCount).every((value) => isZero(value));
            if (zeroCoefficients && !isZero(row[rhsColumn])) {
                rows.push(rowIndex);
            }
        });

        return rows;
    }

    function buildFreeColumns(variableCount, pivotColumns) {
        const pivots = new Set(pivotColumns);
        const freeColumns = [];

        for (let col = 0; col < variableCount; col++) {
            if (!pivots.has(col)) {
                freeColumns.push(col);
            }
        }

        return freeColumns;
    }

    function buildParameters(freeColumns) {
        return freeColumns.map((variableIndex, index) => ({
            name: `t${index + 1}`,
            variableIndex
        }));
    }

    function buildParameterByColumn(parameters) {
        const byColumn = {};
        parameters.forEach((parameter) => {
            byColumn[parameter.variableIndex] = parameter.name;
        });
        return byColumn;
    }

    function buildUniqueValues(matrix, variableCount, pivotData) {
        const rhsColumn = variableCount;

        return pivotData.pivotColumns
            .slice()
            .sort((a, b) => a - b)
            .map((pivotColumn) => {
                const row = matrix[pivotData.pivotRowByColumn[pivotColumn]];
                return {
                    variableIndex: pivotColumn,
                    value: divide(row[rhsColumn], row[pivotColumn])
                };
            });
    }

    function buildExpressions(matrix, variableCount, pivotData, freeColumns, parameters) {
        const rhsColumn = variableCount;
        const pivotSet = new Set(pivotData.pivotColumns);
        const parameterByColumn = buildParameterByColumn(parameters);
        const expressions = [];

        for (let variableIndex = 0; variableIndex < variableCount; variableIndex++) {
            if (!pivotSet.has(variableIndex)) {
                const parameterName = parameterByColumn[variableIndex];
                expressions.push({
                    variableIndex,
                    isFree: true,
                    parameterName,
                    constant: zero(),
                    terms: [{
                        parameterName,
                        freeVariableIndex: variableIndex,
                        coefficient: one()
                    }]
                });
                continue;
            }

            const row = matrix[pivotData.pivotRowByColumn[variableIndex]];
            const pivot = row[variableIndex];
            const terms = [];

            freeColumns.forEach((freeVariableIndex) => {
                const coefficient = row[freeVariableIndex];
                if (isZero(coefficient)) {
                    return;
                }

                terms.push({
                    parameterName: parameterByColumn[freeVariableIndex],
                    freeVariableIndex,
                    coefficient: negate(divide(coefficient, pivot))
                });
            });

            expressions.push({
                variableIndex,
                isFree: false,
                parameterName: null,
                constant: divide(row[rhsColumn], pivot),
                terms
            });
        }

        return expressions;
    }

    /**
     * Analyze an augmented matrix that has already been reduced to RREF.
     *
     * All variable indexes and row/column indexes are 0-based. This module does
     * not verify the full RREF definition; callers should first use the existing
     * RREF algorithm. Non-RREF input may produce an interpretation that is not
     * mathematically expected.
     *
     * @param {Array<Array<*>>} rrefMatrix Augmented RREF matrix [A | b].
     * @param {number} variableCount Number of coefficient columns.
     * @returns {Object} Structured solution analysis without display strings.
     */
    function analyzeRref(rrefMatrix, variableCount) {
        const matrix = validateRrefMatrix(rrefMatrix, variableCount);
        const equationCount = matrix.length;
        const pivotData = findPivotData(matrix, variableCount);
        const pivotColumns = pivotData.pivotColumns.slice().sort((a, b) => a - b);
        const freeColumns = buildFreeColumns(variableCount, pivotColumns);
        const inconsistentRows = findInconsistentRows(matrix, variableCount);
        const rankCoefficient = pivotColumns.length;
        const rankAugmented = rankCoefficient + (inconsistentRows.length > 0 ? 1 : 0);

        if (inconsistentRows.length > 0) {
            return {
                solutionType: 'none',
                equationCount,
                variableCount,
                rankCoefficient,
                rankAugmented,
                pivotColumns,
                freeColumns,
                inconsistentRows,
                uniqueValues: [],
                parameters: [],
                expressions: []
            };
        }

        const parameters = buildParameters(freeColumns);
        const expressions = buildExpressions(matrix, variableCount, pivotData, freeColumns, parameters);
        const isUnique = pivotColumns.length === variableCount;

        return {
            solutionType: isUnique ? 'unique' : 'infinite',
            equationCount,
            variableCount,
            rankCoefficient,
            rankAugmented,
            pivotColumns,
            freeColumns,
            inconsistentRows,
            uniqueValues: isUnique ? buildUniqueValues(matrix, variableCount, pivotData) : [],
            parameters,
            expressions
        };
    }

    const api = {
        analyzeRref,
        isZero
    };

    if (root.LinearSystemAnalysis && root.LinearSystemAnalysis !== api) {
        if (root.console && typeof root.console.warn === 'function') {
            root.console.warn('LinearSystemAnalysis is already defined; keeping the existing implementation.');
        }
    } else {
        root.LinearSystemAnalysis = api;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
