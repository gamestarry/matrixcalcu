(function (root) {
    'use strict';

    const TYPE = 'rref';
    const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
    const ALLOWED_DIMENSIONS = new Set(['2x3', '3x3', '3x4']);
    const MAX_RETRIES = 20;

    const PRESETS = {
        easy: {
            rows: 2,
            cols: 3,
            minValue: 0,
            maxValue: 5,
            includeNegatives: false,
            targetRank: 2
        },
        medium: {
            rows: 3,
            cols: 3,
            minValue: -5,
            maxValue: 5,
            includeNegatives: true,
            targetRanks: [2, 3]
        },
        hard: {
            rows: 3,
            cols: 4,
            minValue: -7,
            maxValue: 7,
            includeNegatives: true,
            targetRanks: [2, 3]
        }
    };

    let corePromise = null;
    let coreLanguageQueue = Promise.resolve();

    function getDependencies() {
        const practice = root.MatrixPractice || {};
        let random = practice.random;
        let model = practice.problemModel;

        if ((!random || !model) && typeof require === 'function') {
            random = random || require('../random.js');
            model = model || require('../problem-model.js');
        }

        if (!random || !model) {
            throw new Error('RREF generator requires MatrixPractice random and problem model modules.');
        }

        return { random, model };
    }

    function ensureMath() {
        if (root.math && typeof root.math.fraction === 'function') return root.math;
        if (typeof require === 'function') {
            root.math = require('../../../math.min.js');
            return root.math;
        }
        throw new Error('RREF generator requires math.js.');
    }

    async function getRrefCore() {
        ensureMath();
        if (!corePromise) {
            corePromise = import('../../core/rref.js');
        }
        return corePromise;
    }

    function withCoreLanguageContext(callback) {
        const run = async () => {
            const docKey = 'doc' + 'ument';
            const hadDoc = !!root[docKey];
            const previousDoc = root[docKey];
            if (!hadDoc) {
                root[docKey] = { documentElement: { lang: 'en' } };
            }

            try {
                return await callback();
            } finally {
                if (!hadDoc) {
                    try {
                        delete root[docKey];
                    } catch {
                        root[docKey] = previousDoc;
                    }
                }
            }
        };

        const next = coreLanguageQueue.then(run, run);
        coreLanguageQueue = next.catch(() => {});
        return next;
    }

    function hasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function assertInteger(value, name) {
        if (!Number.isInteger(value)) {
            throw new Error(`${name} must be an integer.`);
        }
    }

    function dimensionKey(rows, cols) {
        return `${rows}x${cols}`;
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

    function normalizeRrefSettings(options) {
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

        const preset = PRESETS[difficulty];
        const hasRows = hasOwn(options, 'rows');
        const hasCols = hasOwn(options, 'cols');
        if (hasRows !== hasCols) {
            throw new Error('rows and cols must be provided together.');
        }

        let rows = hasRows ? options.rows : preset.rows;
        let cols = hasCols ? options.cols : preset.cols;
        assertInteger(rows, 'rows');
        assertInteger(cols, 'cols');
        if (!ALLOWED_DIMENSIONS.has(dimensionKey(rows, cols))) {
            throw new Error('rows and cols must be one of 2x3, 3x3, or 3x4.');
        }

        const hasMin = hasOwn(options, 'minValue');
        const hasMax = hasOwn(options, 'maxValue');
        if (hasMin !== hasMax) {
            throw new Error('minValue and maxValue must be provided together.');
        }

        const minValue = hasMin ? options.minValue : preset.minValue;
        const maxValue = hasMax ? options.maxValue : preset.maxValue;
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

        let targetRank = hasOwn(options, 'targetRank') ? options.targetRank : null;
        if (targetRank != null) {
            assertInteger(targetRank, 'targetRank');
            if (targetRank <= 0 || targetRank > Math.min(rows, cols)) {
                throw new Error('targetRank must be a positive integer no greater than min(rows, cols).');
            }
        } else if (preset.targetRank != null) {
            targetRank = preset.targetRank;
        }

        return {
            seed,
            count,
            difficulty,
            rows,
            cols,
            targetRank,
            minValue,
            maxValue,
            includeNegatives
        };
    }

    function pickTargetRank(settings, index) {
        if (settings.targetRank != null) return settings.targetRank;
        const { random } = getDependencies();
        const preset = PRESETS[settings.difficulty];
        const seed = `${settings.seed}|${TYPE}|${settings.difficulty}|rank|${settings.rows}x${settings.cols}|${settings.minValue}:${settings.maxValue}|${settings.includeNegatives}|${index}`;
        return random.createSeededRandom(seed).pick(preset.targetRanks);
    }

    function chooseValues(settings, rng) {
        if (settings.minValue === 0 && settings.maxValue === 0) {
            throw new Error('Cannot generate a positive-rank RREF practice problem from the 0..0 range.');
        }

        const candidates = [];
        for (let value = settings.minValue; value <= settings.maxValue; value++) {
            if (value !== 0) candidates.push(value);
        }
        if (candidates.length === 0) {
            throw new Error('Cannot generate a positive-rank RREF practice problem without nonzero values.');
        }

        const base = rng.pick(candidates);
        const variants = [];
        for (let value = settings.minValue; value <= settings.maxValue; value++) {
            if (value !== base) variants.push(value);
        }

        if (variants.length === 0) {
            throw new Error('Cannot generate the requested rank from a single-value range.');
        }

        const variant = rng.pick(variants);
        return { base, variant };
    }

    function clampCombination(rowA, rowB, minValue, maxValue) {
        return rowA.map((value, index) => value + rowB[index]).every((value) => value >= minValue && value <= maxValue);
    }

    function randomNonZeroInRange(settings, rng) {
        const candidates = [];
        for (let value = settings.minValue; value <= settings.maxValue; value++) {
            if (value !== 0) candidates.push(value);
        }
        if (!candidates.length) {
            throw new Error('Cannot generate a positive-rank RREF practice problem without nonzero values.');
        }
        return rng.pick(candidates);
    }

    function randomValueInRange(settings, rng) {
        return rng.int(settings.minValue, settings.maxValue);
    }

    function rowInRange(row, settings) {
        return row.every((value) => value >= settings.minValue && value <= settings.maxValue);
    }

    function createIndependentRows(settings, targetRank, rng) {
        const rows = [];
        for (let r = 0; r < targetRank; r++) {
            const row = [];
            for (let c = 0; c < settings.cols; c++) {
                row.push(randomValueInRange(settings, rng));
            }
            row[r] = randomNonZeroInRange(settings, rng);

            if (r > 0 && rows.some((existing) => areRowsPositiveOrNegativeCopies(existing, row))) {
                row[(r + 1) % settings.cols] = randomNonZeroInRange(settings, rng);
            }
            rows.push(row);
        }

        if (targetRank >= 2 && settings.cols >= 2 && rng.bool(0.5)) {
            rows[0][0] = 0;
            rows[0][1] = rows[0][1] === 0 ? randomNonZeroInRange(settings, rng) : rows[0][1];
            rows[1][0] = rows[1][0] === 0 ? randomNonZeroInRange(settings, rng) : rows[1][0];
        }
        return rows;
    }

    function createDependentRow(baseRows, settings, rng) {
        if (baseRows.length < 2) return baseRows[0].slice();

        const multipliers = [[1, 1], [1, -1], [-1, 1], [2, 1], [1, 2], [-2, 1], [1, -2]];
        const start = rng.int(0, multipliers.length - 1);
        for (let offset = 0; offset < multipliers.length; offset++) {
            const pair = multipliers[(start + offset) % multipliers.length];
            const row = baseRows[0].map((value, c) => pair[0] * value + pair[1] * baseRows[1][c]);
            if (rowInRange(row, settings) && !baseRows.some((base) => areRowsPositiveOrNegativeCopies(base, row))) {
                return row;
            }
        }

        throw new Error('Unable to construct a dependent row within the requested value range.');
    }

    function createControlledMatrix(settings, targetRank, rng) {
        chooseValues(settings, rng);

        const baseRows = createIndependentRows(settings, targetRank, rng);
        const matrix = baseRows.map((row) => row.slice());

        while (matrix.length < settings.rows) {
            matrix.push(createDependentRow(baseRows, settings, rng));
        }

        return matrix;
    }

    function valuesEqual(a, b) {
        const mathRef = ensureMath();
        return mathRef.equal(mathRef.fraction(a), mathRef.fraction(b));
    }

    function matricesEqual(A, B) {
        if (!A || !B || A.length !== B.length || A[0].length !== B[0].length) return false;
        for (let r = 0; r < A.length; r++) {
            for (let c = 0; c < A[r].length; c++) {
                if (!valuesEqual(A[r][c], B[r][c])) return false;
            }
        }
        return true;
    }

    function rowKey(row) {
        return row.join('|');
    }

    function columnKey(matrix, column) {
        return matrix.map((row) => row[column]).join('|');
    }

    function hasDuplicateRows(matrix) {
        const seen = new Set();
        for (const row of matrix) {
            const key = rowKey(row);
            if (seen.has(key)) return true;
            seen.add(key);
        }
        return false;
    }

    function hasDuplicateColumns(matrix) {
        const seen = new Set();
        for (let c = 0; c < matrix[0].length; c++) {
            const key = columnKey(matrix, c);
            if (seen.has(key)) return true;
            seen.add(key);
        }
        return false;
    }

    function areRowsPositiveOrNegativeCopies(left, right) {
        if (left.length !== right.length) return false;
        let same = true;
        let negative = true;
        for (let c = 0; c < left.length; c++) {
            if (left[c] !== right[c]) same = false;
            if (left[c] !== -right[c]) negative = false;
        }
        return same || negative;
    }

    function hasCopyDependentRow(matrix, targetRank) {
        for (let r = targetRank; r < matrix.length; r++) {
            for (let b = 0; b < targetRank; b++) {
                if (areRowsPositiveOrNegativeCopies(matrix[b], matrix[r])) return true;
            }
        }
        return false;
    }

    function hasDominantRepeatedValue(matrix) {
        const counts = new Map();
        flatten(matrix).forEach((value) => {
            counts.set(value, (counts.get(value) || 0) + 1);
        });
        const cellCount = matrix.length * matrix[0].length;
        return Array.from(counts.values()).some((count) => count > Math.floor(cellCount * 0.6));
    }

    function normalizeScalar(value) {
        const mathRef = ensureMath();
        const fraction = mathRef.fraction(value);
        const numerator = fraction.s * fraction.n;
        const denominator = fraction.d;
        if (numerator === 0) return 0;
        if (denominator === 1) return numerator;
        return {
            kind: 'fraction',
            numerator,
            denominator
        };
    }

    function normalizeExactMatrix(matrix) {
        return matrix.map((row) => row.map(normalizeScalar));
    }

    function isZero(value) {
        const mathRef = ensureMath();
        return mathRef.equal(mathRef.fraction(value), 0);
    }

    function subtractValues(a, b) {
        const mathRef = ensureMath();
        return mathRef.subtract(mathRef.fraction(a), mathRef.fraction(b));
    }

    function divideValues(a, b) {
        const mathRef = ensureMath();
        return mathRef.divide(mathRef.fraction(a), mathRef.fraction(b));
    }

    function multiplyValues(a, b) {
        const mathRef = ensureMath();
        return mathRef.multiply(mathRef.fraction(a), mathRef.fraction(b));
    }

    function addValues(a, b) {
        const mathRef = ensureMath();
        return mathRef.add(mathRef.fraction(a), mathRef.fraction(b));
    }

    function exactToMath(value) {
        const mathRef = ensureMath();
        if (typeof value === 'number') return mathRef.fraction(value);
        return mathRef.fraction(value.numerator, value.denominator);
    }

    function changedRows(prev, next) {
        const rows = [];
        for (let r = 0; r < prev.length; r++) {
            if (!matricesEqual([prev[r]], [next[r]])) rows.push(r);
        }
        return rows;
    }

    function inferSwap(prev, next, rows) {
        if (rows.length !== 2) return null;
        const rowA = rows[0];
        const rowB = rows[1];
        if (matricesEqual([prev[rowA]], [next[rowB]]) && matricesEqual([prev[rowB]], [next[rowA]])) {
            return { kind: 'swap-rows', rowA, rowB };
        }
        return null;
    }

    function inferScale(prev, next, rows) {
        if (rows.length !== 1) return null;
        const row = rows[0];
        let factor = null;
        for (let c = 0; c < prev[row].length; c++) {
            if (!isZero(prev[row][c])) {
                factor = divideValues(next[row][c], prev[row][c]);
                break;
            }
        }
        if (factor == null) return null;
        if (isZero(factor)) return null;
        for (let c = 0; c < prev[row].length; c++) {
            if (!valuesEqual(next[row][c], multiplyValues(prev[row][c], factor))) return null;
        }
        return { kind: 'scale-row', row, factor: normalizeScalar(factor) };
    }

    function inferAddMultiple(prev, next, rows) {
        if (rows.length !== 1) return null;
        const targetRow = rows[0];
        for (let sourceRow = 0; sourceRow < prev.length; sourceRow++) {
            if (sourceRow === targetRow) continue;
            let multiple = null;
            for (let c = 0; c < prev[targetRow].length; c++) {
                if (!isZero(prev[sourceRow][c])) {
                    multiple = divideValues(subtractValues(next[targetRow][c], prev[targetRow][c]), prev[sourceRow][c]);
                    break;
                }
            }
            if (multiple == null) continue;

            let matches = true;
            for (let c = 0; c < prev[targetRow].length; c++) {
                const expected = addValues(prev[targetRow][c], multiplyValues(multiple, prev[sourceRow][c]));
                if (!valuesEqual(next[targetRow][c], expected)) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                return {
                    kind: 'add-row-multiple',
                    targetRow,
                    sourceRow,
                    multiple: normalizeScalar(multiple)
                };
            }
        }
        return null;
    }

    function applyOperationToCoreMatrix(prev, operation) {
        const result = cloneMatrix(prev);
        if (operation.kind === 'swap-rows') {
            const tmp = result[operation.rowA];
            result[operation.rowA] = result[operation.rowB];
            result[operation.rowB] = tmp;
            return result;
        }

        if (operation.kind === 'scale-row') {
            const factor = exactToMath(operation.factor);
            for (let c = 0; c < result[operation.row].length; c++) {
                result[operation.row][c] = multiplyValues(result[operation.row][c], factor);
            }
            return result;
        }

        const multiple = exactToMath(operation.multiple);
        for (let c = 0; c < result[operation.targetRow].length; c++) {
            result[operation.targetRow][c] = addValues(
                result[operation.targetRow][c],
                multiplyValues(multiple, result[operation.sourceRow][c])
            );
        }
        return result;
    }

    function assertOperationRebuildsSnapshot(prev, next, operation) {
        const rebuilt = applyOperationToCoreMatrix(prev, operation);
        if (!matricesEqual(rebuilt, next)) {
            throw new Error('Structured RREF row operation did not rebuild the next core snapshot.');
        }
    }

    function normalizeCoreSteps(coreSteps) {
        const result = [];
        for (let index = 1; index < coreSteps.length; index++) {
            const prev = coreSteps[index - 1].matrix;
            const next = coreSteps[index].matrix;
            const rows = changedRows(prev, next);
            const operation = inferSwap(prev, next, rows) ||
                inferScale(prev, next, rows) ||
                inferAddMultiple(prev, next, rows);

            if (!operation) {
                throw new Error('Unable to infer a structured RREF row operation from core matrix snapshots.');
            }

            assertOperationRebuildsSnapshot(prev, next, operation);
            operation.matrix = normalizeExactMatrix(next);
            result.push(operation);
        }
        return result;
    }

    function calculateRankFromRref(exactMatrix) {
        return exactMatrix.filter((row) => row.some((value) => {
            if (typeof value === 'number') return value !== 0;
            return value.numerator !== 0;
        })).length;
    }

    function hasInterestingInput(matrix, exactAnswer, actualRank, targetRank) {
        if (actualRank !== targetRank) return false;
        if (countNonZero(matrix) < 3) return false;
        if (matricesEqual(matrix, exactAnswer)) return false;
        if (hasDuplicateRows(matrix)) return false;
        if (hasDuplicateColumns(matrix)) return false;
        if (hasCopyDependentRow(matrix, targetRank)) return false;
        if (hasDominantRepeatedValue(matrix)) return false;
        return true;
    }

    async function calculateWithCore(matrix) {
        const core = await getRrefCore();
        const inputCopy = cloneMatrix(matrix);
        const result = await withCoreLanguageContext(() => core.calculateRREFWithSteps(inputCopy));
        return {
            rrefMatrix: normalizeExactMatrix(result.rrefMatrix),
            steps: normalizeCoreSteps(result.steps)
        };
    }

    async function reduceMatrixForPractice(inputMatrix) {
        if (!Array.isArray(inputMatrix) || !inputMatrix.length || !Array.isArray(inputMatrix[0])) {
            throw new Error('inputMatrix must be a non-empty two-dimensional array.');
        }

        const matrix = inputMatrix.map((row, rowIndex) => {
            if (!Array.isArray(row) || row.length !== inputMatrix[0].length) {
                throw new Error(`inputMatrix row ${rowIndex} has an inconsistent column count.`);
            }
            return row.slice();
        });
        const calculated = await calculateWithCore(matrix);
        return {
            rrefMatrix: calculated.rrefMatrix.map((row) => row.slice()),
            steps: calculated.steps.slice(),
            rank: calculateRankFromRref(calculated.rrefMatrix)
        };
    }

    async function buildProblem(settings, index) {
        const { random, model } = getDependencies();
        const targetRank = pickTargetRank(settings, index);
        const problemSeed = `${settings.seed}|${TYPE}|${settings.difficulty}|${settings.rows}x${settings.cols}|${targetRank}|${settings.minValue}:${settings.maxValue}|${settings.includeNegatives}|${index}`;
        const rng = random.createSeededRandom(problemSeed);
        let matrix = null;
        let calculated = null;
        let actualRank = 0;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                matrix = createControlledMatrix(settings, targetRank, rng);
            } catch {
                matrix = null;
                continue;
            }
            try {
                calculated = await calculateWithCore(matrix);
            } catch {
                matrix = null;
                continue;
            }
            actualRank = calculateRankFromRref(calculated.rrefMatrix);
            if (hasInterestingInput(matrix, calculated.rrefMatrix, actualRank, targetRank)) break;
            matrix = null;
        }

        if (!matrix) {
            throw new Error('Unable to generate an RREF practice problem for the requested settings.');
        }

        const idSeed = [
            settings.seed,
            settings.difficulty,
            dimensionKey(settings.rows, settings.cols),
            targetRank,
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
                matrix: cloneMatrix(matrix)
            },
            exactAnswer: {
                matrix: calculated.rrefMatrix.map((row) => row.slice())
            },
            steps: calculated.steps,
            solutionType: null,
            dimensions: {
                rows: settings.rows,
                cols: settings.cols
            },
            metadata: {
                rank: actualRank,
                targetRank,
                stepCount: calculated.steps.length
            }
        });
    }

    function createSetId(settings) {
        const { model } = getDependencies();
        return model.createProblemId(TYPE, [
            'set',
            settings.seed,
            settings.difficulty,
            dimensionKey(settings.rows, settings.cols),
            settings.targetRank == null ? 'per-problem-rank' : settings.targetRank,
            settings.minValue,
            settings.maxValue,
            settings.includeNegatives
        ].join('-'), 0);
    }

    async function generateRrefProblem(options) {
        const settings = normalizeRrefSettings(Object.assign({}, options, { count: 1 }));
        const index = hasOwn(options || {}, 'index') ? options.index : 0;
        if (!Number.isInteger(index) || index < 0) {
            throw new Error('index must be a non-negative integer.');
        }
        return buildProblem(settings, index);
    }

    async function generateRrefSet(options) {
        const { model } = getDependencies();
        const settings = normalizeRrefSettings(options);
        const problems = [];

        for (let index = 0; index < settings.count; index++) {
            problems.push(await buildProblem(settings, index));
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
        generateRrefProblem,
        generateRrefSet,
        normalizeRrefSettings,
        reduceMatrixForPractice
    };

    Object.defineProperty(api, '__test', {
        value: {
            normalizeCoreSteps,
            normalizeExactMatrix
        },
        enumerable: false
    });

    root.MatrixPractice = root.MatrixPractice || {};
    root.MatrixPractice.rref = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
