(function (root) {
    'use strict';

    const TYPE = 'addition-subtraction';
    const OPERATIONS = new Set(['add', 'subtract', 'mixed']);
    const SUBTYPES = new Set(['add', 'subtract']);
    const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
    const SUPPORTED_DIMENSIONS = new Set(['2x2', '2x3', '3x2', '3x3']);
    const MAX_RETRIES = 200;

    const PRESETS = {
        easy: {
            rows: 2,
            cols: 2,
            minValue: 0,
            maxValue: 9,
            includeNegatives: false
        },
        medium: {
            dimensions: [[2, 2], [2, 3], [3, 2]],
            minValue: -9,
            maxValue: 9,
            includeNegatives: true
        },
        hard: {
            rows: 3,
            cols: 3,
            minValue: -12,
            maxValue: 12,
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
            throw new Error('Addition/subtraction generator requires MatrixPractice random and problem model modules.');
        }

        return { random, model };
    }

    function hasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function dimensionKey(rows, cols) {
        return `${rows}x${cols}`;
    }

    function assertInteger(value, name) {
        if (!Number.isInteger(value)) {
            throw new Error(`${name} must be an integer.`);
        }
    }

    function cloneMatrix(matrix) {
        return matrix.map((row) => row.slice());
    }

    function normalizeOptions(options) {
        if (!options || typeof options !== 'object' || Array.isArray(options)) {
            throw new Error('options must be an object.');
        }

        if (!hasOwn(options, 'seed')) {
            throw new Error('seed is required.');
        }

        const { random } = getDependencies();
        const seed = random.normalizeSeed(options.seed);
        const count = hasOwn(options, 'count') ? options.count : 5;
        const operation = hasOwn(options, 'operation') ? options.operation : 'mixed';
        const difficulty = hasOwn(options, 'difficulty') ? options.difficulty : 'easy';

        assertInteger(count, 'count');
        if (count < 1 || count > 10) {
            throw new Error('count must be between 1 and 10.');
        }

        if (!OPERATIONS.has(operation)) {
            throw new Error('operation must be add, subtract, or mixed.');
        }

        if (!DIFFICULTIES.has(difficulty)) {
            throw new Error('difficulty must be easy, medium, or hard.');
        }

        const preset = PRESETS[difficulty];
        const hasRows = hasOwn(options, 'rows');
        const hasCols = hasOwn(options, 'cols');
        if (hasRows !== hasCols) {
            throw new Error('rows and cols must be provided together.');
        }

        let rows;
        let cols;
        if (hasRows) {
            assertInteger(options.rows, 'rows');
            assertInteger(options.cols, 'cols');
            rows = options.rows;
            cols = options.cols;
        } else if (preset.dimensions) {
            const dimensionRng = random.createSeededRandom(`${seed}|${TYPE}|${difficulty}|dimensions`);
            const picked = dimensionRng.pick(preset.dimensions);
            rows = picked[0];
            cols = picked[1];
        } else {
            rows = preset.rows;
            cols = preset.cols;
        }

        if (!SUPPORTED_DIMENSIONS.has(dimensionKey(rows, cols))) {
            throw new Error('rows and cols must be one of 2x2, 2x3, 3x2, or 3x3.');
        }

        const hasMin = hasOwn(options, 'minValue');
        const hasMax = hasOwn(options, 'maxValue');
        if (hasMin !== hasMax) {
            throw new Error('minValue and maxValue must be provided together.');
        }

        let minValue = hasMin ? options.minValue : preset.minValue;
        let maxValue = hasMax ? options.maxValue : preset.maxValue;
        assertInteger(minValue, 'minValue');
        assertInteger(maxValue, 'maxValue');

        if (minValue > maxValue) {
            throw new Error('minValue must be less than or equal to maxValue.');
        }

        const includeNegatives = hasOwn(options, 'includeNegatives')
            ? options.includeNegatives
            : preset.includeNegatives;

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
            operation,
            difficulty,
            rows,
            cols,
            minValue,
            maxValue,
            includeNegatives
        };
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

    function allCells(matrix, predicate) {
        return matrix.every((row) => row.every(predicate));
    }

    function countNonZero(matrix) {
        let count = 0;
        matrix.forEach((row) => {
            row.forEach((value) => {
                if (value !== 0) count++;
            });
        });
        return count;
    }

    function matrixKey(matrix) {
        return JSON.stringify(matrix);
    }

    function flatten(matrix) {
        return matrix.reduce((items, row) => items.concat(row), []);
    }

    function hasZeroRow(matrix) {
        return matrix.some((row) => row.every((value) => value === 0));
    }

    function getColumn(matrix, column) {
        return matrix.map((row) => row[column]);
    }

    function hasZeroColumn(matrix) {
        for (let c = 0; c < matrix[0].length; c++) {
            if (getColumn(matrix, c).every((value) => value === 0)) return true;
        }
        return false;
    }

    function allCellsSame(matrix) {
        const first = matrix[0][0];
        return allCells(matrix, (value) => value === first);
    }

    function matricesEqual(A, B) {
        for (let r = 0; r < A.length; r++) {
            for (let c = 0; c < A[r].length; c++) {
                if (A[r][c] !== B[r][c]) return false;
            }
        }
        return true;
    }

    function countDifferences(A, B) {
        let count = 0;
        for (let r = 0; r < A.length; r++) {
            for (let c = 0; c < A[r].length; c++) {
                if (A[r][c] !== B[r][c]) count++;
            }
        }
        return count;
    }

    function countFlatDifferences(left, right) {
        let count = 0;
        for (let index = 0; index < left.length; index++) {
            if (left[index] !== right[index]) count++;
        }
        return count;
    }

    function calculateAnswer(A, B, subtype) {
        return A.map((row, r) => row.map((left, c) => {
            const right = B[r][c];
            return subtype === 'add' ? left + right : left - right;
        }));
    }

    function createSteps(A, B, answer, subtype) {
        const steps = [];
        for (let r = 0; r < A.length; r++) {
            for (let c = 0; c < A[r].length; c++) {
                steps.push({
                    kind: 'element-operation',
                    row: r,
                    column: c,
                    operator: subtype,
                    leftValue: A[r][c],
                    rightValue: B[r][c],
                    result: answer[r][c]
                });
            }
        }
        return steps;
    }

    function hasCompleteRowsAndColumns(matrix) {
        return !hasZeroRow(matrix) && !hasZeroColumn(matrix);
    }

    function hasInterestingShape(A, B, answer, subtype, minValue, maxValue) {
        const rangeSize = maxValue - minValue + 1;
        const normalRange = rangeSize > 1;
        const minActiveCells = normalRange ? 2 : 1;

        if (countNonZero(A) < minActiveCells) return false;
        if (countNonZero(B) < minActiveCells) return false;
        if (countNonZero(answer) < minActiveCells) return false;
        if (normalRange && !hasCompleteRowsAndColumns(A)) return false;
        if (normalRange && !hasCompleteRowsAndColumns(B)) return false;
        if (normalRange && !hasCompleteRowsAndColumns(answer)) return false;
        if (subtype === 'subtract' && matricesEqual(A, B)) return false;
        if (subtype === 'subtract' && countDifferences(A, B) < minActiveCells) return false;

        if (normalRange) {
            if (allCellsSame(A) && allCellsSame(B)) return false;
        }

        return true;
    }

    function createDiversityContext() {
        return {
            seenA: new Set(),
            seenB: new Set(),
            seenCombo: new Set(),
            previousInput: null
        };
    }

    function meetsSetDiversity(A, B, context) {
        if (!context) return true;

        const keyA = matrixKey(A);
        const keyB = matrixKey(B);
        if (context.seenA.has(keyA)) return false;
        if (context.seenB.has(keyB)) return false;
        if (context.seenCombo.has(`${keyA}|${keyB}`)) return false;

        if (context.previousInput) {
            const input = flatten(A).concat(flatten(B));
            if (countFlatDifferences(input, context.previousInput) < 2) return false;
        }

        return true;
    }

    function collectDiversity(context, A, B) {
        if (!context) return;
        const keyA = matrixKey(A);
        const keyB = matrixKey(B);
        context.seenA.add(keyA);
        context.seenB.add(keyB);
        context.seenCombo.add(`${keyA}|${keyB}`);
        context.previousInput = flatten(A).concat(flatten(B));
    }

    function adjustMatrixIfZero(matrix, minValue, maxValue) {
        if (countNonZero(matrix) > 0) return;
        if (maxValue !== 0) matrix[0][0] = maxValue;
        else if (minValue !== 0) matrix[0][0] = minValue;
    }

    function adjustAnswerIfZero(A, B, subtype, minValue, maxValue) {
        const answer = calculateAnswer(A, B, subtype);
        if (countNonZero(answer) > 0) return answer;

        if (subtype === 'add') {
            if (maxValue !== 0) A[0][0] = maxValue;
            else if (minValue !== 0) A[0][0] = minValue;
        } else if (A[0][0] < maxValue) {
            A[0][0] += 1;
        } else if (A[0][0] > minValue) {
            A[0][0] -= 1;
        }

        return calculateAnswer(A, B, subtype);
    }

    function enforceMinimumQuality(A, B, subtype, settings) {
        const rangeSize = settings.maxValue - settings.minValue + 1;
        const cellCount = settings.rows * settings.cols;
        if (rangeSize <= 1 || cellCount < 2) return;

        const positions = [[0, 0], [0, 1]];
        if (subtype === 'subtract') {
            positions.forEach(([r, c]) => {
                A[r][c] = settings.maxValue;
                B[r][c] = settings.minValue;
            });
            return;
        }

        let left = settings.maxValue;
        let right = settings.maxValue;
        if (left + right === 0) {
            left = settings.minValue;
            right = settings.minValue;
        }

        positions.forEach(([r, c]) => {
            A[r][c] = left;
            B[r][c] = right;
        });
    }

    function generateCandidate(rng, settings, subtype) {
        const A = generateMatrix(rng, settings.rows, settings.cols, settings.minValue, settings.maxValue);
        let B;

        if (
            subtype === 'subtract' &&
            settings.difficulty === 'easy' &&
            settings.includeNegatives === false &&
            settings.minValue >= 0
        ) {
            B = A.map((row) => row.map((value) => rng.int(settings.minValue, value)));
        } else {
            B = generateMatrix(rng, settings.rows, settings.cols, settings.minValue, settings.maxValue);
        }

        return { A, B, answer: calculateAnswer(A, B, subtype) };
    }

    function buildProblem(settings, index, diversityContext) {
        const { random, model } = getDependencies();
        const subtypeSeed = `${settings.seed}|${TYPE}|${settings.operation}|${settings.difficulty}|${settings.rows}x${settings.cols}|${settings.minValue}:${settings.maxValue}|${settings.includeNegatives}|${index}`;
        const rng = random.createSeededRandom(subtypeSeed);
        const subtype = settings.operation === 'mixed' ? rng.pick(['add', 'subtract']) : settings.operation;

        if (!SUBTYPES.has(subtype)) {
            throw new Error('subtype must be add or subtract.');
        }

        let candidate = null;
        let passedQuality = false;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            candidate = generateCandidate(rng, settings, subtype);
            if (
                hasInterestingShape(candidate.A, candidate.B, candidate.answer, subtype, settings.minValue, settings.maxValue) &&
                meetsSetDiversity(candidate.A, candidate.B, diversityContext)
            ) {
                passedQuality = true;
                break;
            }
        }

        const matrixA = cloneMatrix(candidate.A);
        const matrixB = cloneMatrix(candidate.B);
        if (!passedQuality) {
            enforceMinimumQuality(matrixA, matrixB, subtype, settings);
        }
        adjustMatrixIfZero(matrixA, settings.minValue, settings.maxValue);
        adjustMatrixIfZero(matrixB, settings.minValue, settings.maxValue);
        let answer = adjustAnswerIfZero(matrixA, matrixB, subtype, settings.minValue, settings.maxValue);

        if (
            subtype === 'subtract' &&
            settings.difficulty === 'easy' &&
            settings.includeNegatives === false &&
            settings.minValue >= 0
        ) {
            for (let r = 0; r < settings.rows; r++) {
                for (let c = 0; c < settings.cols; c++) {
                    if (matrixB[r][c] > matrixA[r][c]) matrixB[r][c] = matrixA[r][c];
                }
            }
            answer = calculateAnswer(matrixA, matrixB, subtype);
        }

        collectDiversity(diversityContext, matrixA, matrixB);

        const idSeed = [
            settings.seed,
            settings.operation,
            settings.difficulty,
            dimensionKey(settings.rows, settings.cols),
            settings.minValue,
            settings.maxValue,
            settings.includeNegatives
        ].join('-');

        return model.createProblem({
            id: model.createProblemId(TYPE, idSeed, index),
            type: TYPE,
            subtype,
            difficulty: settings.difficulty,
            inputs: {
                matrixA,
                matrixB
            },
            exactAnswer: {
                matrix: answer.map((row) => row.slice())
            },
            steps: createSteps(matrixA, matrixB, answer, subtype),
            solutionType: null,
            dimensions: {
                rows: settings.rows,
                cols: settings.cols
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
        return model.createProblemId(TYPE, [
            'set',
            settings.seed,
            settings.operation,
            settings.difficulty,
            dimensionKey(settings.rows, settings.cols),
            settings.minValue,
            settings.maxValue,
            settings.includeNegatives
        ].join('-'), 0);
    }

    function generateAdditionSubtractionProblem(options) {
        const settings = normalizeOptions(Object.assign({}, options, { count: 1 }));
        const index = hasOwn(options || {}, 'index') ? options.index : 0;
        if (!Number.isInteger(index) || index < 0) {
            throw new Error('index must be a non-negative integer.');
        }
        return buildProblem(settings, index);
    }

    function generateAdditionSubtractionSet(options) {
        const { model } = getDependencies();
        const settings = normalizeOptions(options);
        const problems = [];
        const diversityContext = createDiversityContext();

        for (let index = 0; index < settings.count; index++) {
            problems.push(buildProblem(settings, index, diversityContext));
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
        generateAdditionSubtractionProblem,
        generateAdditionSubtractionSet,
        normalizeAdditionSubtractionSettings: normalizeOptions
    };

    root.MatrixPractice = root.MatrixPractice || {};
    root.MatrixPractice.additionSubtraction = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
