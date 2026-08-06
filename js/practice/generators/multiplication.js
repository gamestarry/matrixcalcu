(function (root) {
    'use strict';

    const TYPE = 'multiplication';
    const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
    const SUPPORTED_SIZE = new Set([2, 3]);
    const MAX_RETRIES = 30;

    const PRESETS = {
        easy: {
            rowsA: 2,
            colsA: 2,
            colsB: 2,
            minValue: 0,
            maxValue: 5,
            includeNegatives: false
        },
        medium: {
            dimensions: [
                { rowsA: 2, colsA: 3, colsB: 2 },
                { rowsA: 3, colsA: 2, colsB: 3 }
            ],
            minValue: -5,
            maxValue: 5,
            includeNegatives: true
        },
        hard: {
            rowsA: 3,
            colsA: 3,
            colsB: 3,
            minValue: -7,
            maxValue: 7,
            includeNegatives: true
        }
    };

    function getDependencies() {
        const practice = root.MatrixPractice || {};
        let random = practice.random;
        let model = practice.problemModel;

        if ((!random || !model) && typeof require === 'function') {
            random = random || require('../random.js');
            model = model || require('../problem-model.js');
        }

        if (!random || !model) {
            throw new Error('Multiplication generator requires MatrixPractice random and problem model modules.');
        }

        return { random, model };
    }

    function hasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function assertInteger(value, name) {
        if (!Number.isInteger(value)) {
            throw new Error(`${name} must be an integer.`);
        }
    }

    function cloneMatrix(matrix) {
        return matrix.map((row) => row.slice());
    }

    function flatten(matrix) {
        return matrix.reduce((items, row) => items.concat(row), []);
    }

    function countNonZero(matrix) {
        return flatten(matrix).filter((value) => value !== 0).length;
    }

    function allCellsSame(matrix) {
        const first = matrix[0][0];
        return matrix.every((row) => row.every((value) => value === first));
    }

    function hasZeroRow(matrix) {
        return matrix.some((row) => row.every((value) => value === 0));
    }

    function hasZeroColumn(matrix) {
        const cols = matrix[0].length;
        for (let c = 0; c < cols; c++) {
            let allZero = true;
            for (let r = 0; r < matrix.length; r++) {
                if (matrix[r][c] !== 0) {
                    allZero = false;
                    break;
                }
            }
            if (allZero) return true;
        }
        return false;
    }

    function normalizeMultiplicationSettings(options) {
        if (!options || typeof options !== 'object' || Array.isArray(options)) {
            throw new Error('options must be an object.');
        }

        if (!hasOwn(options, 'seed')) {
            throw new Error('seed is required.');
        }

        const { random } = getDependencies();
        const seed = random.normalizeSeed(options.seed);
        const count = hasOwn(options, 'count') ? options.count : 5;
        const difficulty = hasOwn(options, 'difficulty') ? options.difficulty : 'easy';

        assertInteger(count, 'count');
        if (count < 1 || count > 10) {
            throw new Error('count must be between 1 and 10.');
        }

        if (!DIFFICULTIES.has(difficulty)) {
            throw new Error('difficulty must be easy, medium, or hard.');
        }

        const hasRowsA = hasOwn(options, 'rowsA');
        const hasColsA = hasOwn(options, 'colsA');
        const hasColsB = hasOwn(options, 'colsB');
        const hasAnyDimension = hasRowsA || hasColsA || hasColsB;
        if (hasAnyDimension && !(hasRowsA && hasColsA && hasColsB)) {
            throw new Error('rowsA, colsA, and colsB must be provided together.');
        }

        let rowsA = null;
        let colsA = null;
        let colsB = null;
        if (hasAnyDimension) {
            assertInteger(options.rowsA, 'rowsA');
            assertInteger(options.colsA, 'colsA');
            assertInteger(options.colsB, 'colsB');
            if (!SUPPORTED_SIZE.has(options.rowsA) || !SUPPORTED_SIZE.has(options.colsA) || !SUPPORTED_SIZE.has(options.colsB)) {
                throw new Error('rowsA, colsA, and colsB must each be 2 or 3.');
            }
            rowsA = options.rowsA;
            colsA = options.colsA;
            colsB = options.colsB;
        } else if (!PRESETS[difficulty].dimensions) {
            rowsA = PRESETS[difficulty].rowsA;
            colsA = PRESETS[difficulty].colsA;
            colsB = PRESETS[difficulty].colsB;
        }

        const hasMin = hasOwn(options, 'minValue');
        const hasMax = hasOwn(options, 'maxValue');
        if (hasMin !== hasMax) {
            throw new Error('minValue and maxValue must be provided together.');
        }

        let minValue = hasMin ? options.minValue : PRESETS[difficulty].minValue;
        let maxValue = hasMax ? options.maxValue : PRESETS[difficulty].maxValue;
        assertInteger(minValue, 'minValue');
        assertInteger(maxValue, 'maxValue');

        if (minValue > maxValue) {
            throw new Error('minValue must be less than or equal to maxValue.');
        }

        const includeNegatives = hasOwn(options, 'includeNegatives')
            ? options.includeNegatives
            : PRESETS[difficulty].includeNegatives;

        if (typeof includeNegatives !== 'boolean') {
            throw new Error('includeNegatives must be a boolean.');
        }

        if (!includeNegatives && hasMin && minValue < 0) {
            throw new Error('includeNegatives=false cannot be used with a negative value range.');
        }

        if (!includeNegatives && !hasMin && minValue < 0) {
            minValue = 0;
        }

        return {
            seed,
            count,
            difficulty,
            rowsA,
            colsA,
            colsB,
            minValue,
            maxValue,
            includeNegatives
        };
    }

    function resolveDimensions(settings, index) {
        if (settings.rowsA != null) {
            return {
                rowsA: settings.rowsA,
                colsA: settings.colsA,
                colsB: settings.colsB
            };
        }

        const preset = PRESETS[settings.difficulty];
        if (!preset.dimensions) {
            return {
                rowsA: preset.rowsA,
                colsA: preset.colsA,
                colsB: preset.colsB
            };
        }

        const { random } = getDependencies();
        const seed = `${settings.seed}|${TYPE}|${settings.difficulty}|dimensions|${settings.minValue}:${settings.maxValue}|${settings.includeNegatives}|${index}`;
        return random.createSeededRandom(seed).pick(preset.dimensions);
    }

    function dimensionKey(dimensions) {
        return `${dimensions.rowsA}x${dimensions.colsA}x${dimensions.colsB}`;
    }

    function generateMatrix(rng, rows, cols, minValue, maxValue) {
        const matrix = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push(rng.int(minValue, maxValue));
            }
            matrix.push(row);
        }
        return matrix;
    }

    function multiplyMatrices(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const colsB = B[0].length;
        const result = [];

        for (let r = 0; r < rowsA; r++) {
            const row = [];
            for (let c = 0; c < colsB; c++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) {
                    sum += A[r][k] * B[k][c];
                }
                row.push(sum);
            }
            result.push(row);
        }

        return result;
    }

    function createSteps(A, B, answer) {
        const steps = [];
        const rowsA = A.length;
        const colsA = A[0].length;
        const colsB = B[0].length;

        for (let r = 0; r < rowsA; r++) {
            for (let c = 0; c < colsB; c++) {
                const terms = [];
                let result = 0;
                for (let k = 0; k < colsA; k++) {
                    const product = A[r][k] * B[k][c];
                    terms.push({
                        index: k,
                        leftValue: A[r][k],
                        rightValue: B[k][c],
                        product
                    });
                    result += product;
                }

                steps.push({
                    kind: 'dot-product',
                    row: r,
                    column: c,
                    terms,
                    result: answer[r][c]
                });
            }
        }

        return steps;
    }

    function hasInterestingShape(A, B, answer, settings) {
        const rangeSize = settings.maxValue - settings.minValue + 1;
        if (rangeSize <= 1) return true;

        if (countNonZero(A) < 2) return false;
        if (countNonZero(B) < 2) return false;
        if (countNonZero(answer) < 2) return false;
        if (hasZeroRow(A)) return false;
        if (hasZeroColumn(B)) return false;
        if (allCellsSame(A)) return false;
        if (allCellsSame(B)) return false;
        if (allCellsSame(answer)) return false;

        return true;
    }

    function enforceMinimumQuality(A, B, settings) {
        const rangeSize = settings.maxValue - settings.minValue + 1;
        if (rangeSize <= 1) return;

        const one = settings.maxValue !== 0 ? settings.maxValue : settings.minValue;
        const other = settings.minValue !== one ? settings.minValue : settings.maxValue;
        if (one === 0 && other === 0) return;

        for (let r = 0; r < A.length; r++) {
            A[r][0] = one;
        }
        for (let c = 0; c < B[0].length; c++) {
            B[0][c] = one;
        }

        if (A[0].length > 1) A[0][1] = other;
        if (B.length > 1) B[1][0] = other;
    }

    function generateCandidate(rng, dimensions, settings) {
        const A = generateMatrix(rng, dimensions.rowsA, dimensions.colsA, settings.minValue, settings.maxValue);
        const B = generateMatrix(rng, dimensions.colsA, dimensions.colsB, settings.minValue, settings.maxValue);
        return { A, B, answer: multiplyMatrices(A, B) };
    }

    function buildProblem(settings, index) {
        const { random, model } = getDependencies();
        const dimensions = resolveDimensions(settings, index);
        const problemSeed = `${settings.seed}|${TYPE}|${settings.difficulty}|${dimensionKey(dimensions)}|${settings.minValue}:${settings.maxValue}|${settings.includeNegatives}|${index}`;
        const rng = random.createSeededRandom(problemSeed);

        let candidate = null;
        let passedQuality = false;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            candidate = generateCandidate(rng, dimensions, settings);
            if (hasInterestingShape(candidate.A, candidate.B, candidate.answer, settings)) {
                passedQuality = true;
                break;
            }
        }

        const matrixA = cloneMatrix(candidate.A);
        const matrixB = cloneMatrix(candidate.B);
        if (!passedQuality) {
            enforceMinimumQuality(matrixA, matrixB, settings);
        }

        const answer = multiplyMatrices(matrixA, matrixB);
        const idSeed = [
            settings.seed,
            settings.difficulty,
            dimensionKey(dimensions),
            settings.minValue,
            settings.maxValue,
            settings.includeNegatives
        ].join('-');

        return model.createProblem({
            id: model.createProblemId(TYPE, idSeed, index),
            type: TYPE,
            subtype: null,
            difficulty: settings.difficulty,
            inputs: {
                matrixA,
                matrixB
            },
            exactAnswer: {
                matrix: answer.map((row) => row.slice())
            },
            steps: createSteps(matrixA, matrixB, answer),
            solutionType: null,
            dimensions: {
                rowsA: dimensions.rowsA,
                colsA: dimensions.colsA,
                rowsB: dimensions.colsA,
                colsB: dimensions.colsB,
                resultRows: dimensions.rowsA,
                resultCols: dimensions.colsB
            },
            metadata: {
                valueRange: {
                    minValue: settings.minValue,
                    maxValue: settings.maxValue
                }
            }
        });
    }

    function createSetId(settings) {
        const { model } = getDependencies();
        const dimensionPart = settings.rowsA == null
            ? 'per-problem'
            : `${settings.rowsA}x${settings.colsA}x${settings.colsB}`;
        return model.createProblemId(TYPE, [
            'set',
            settings.seed,
            settings.difficulty,
            dimensionPart,
            settings.minValue,
            settings.maxValue,
            settings.includeNegatives
        ].join('-'), 0);
    }

    function generateMultiplicationProblem(options) {
        const settings = normalizeMultiplicationSettings(Object.assign({}, options, { count: 1 }));
        const index = hasOwn(options || {}, 'index') ? options.index : 0;
        if (!Number.isInteger(index) || index < 0) {
            throw new Error('index must be a non-negative integer.');
        }
        return buildProblem(settings, index);
    }

    function generateMultiplicationSet(options) {
        const { model } = getDependencies();
        const settings = normalizeMultiplicationSettings(options);
        const problems = [];

        for (let index = 0; index < settings.count; index++) {
            problems.push(buildProblem(settings, index));
        }

        return model.createProblemSet({
            id: createSetId(settings),
            seed: settings.seed,
            type: TYPE,
            settings,
            problems,
            metadata: {}
        });
    }

    const api = {
        generateMultiplicationProblem,
        generateMultiplicationSet,
        normalizeMultiplicationSettings
    };

    root.MatrixPractice = root.MatrixPractice || {};
    root.MatrixPractice.multiplication = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
