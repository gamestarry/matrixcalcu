(function (root) {
    'use strict';

    const TYPE = 'linear-system';
    const SOLUTION_TYPES = new Set(['unique', 'none', 'infinite', 'mixed']);
    const FINAL_TYPES = ['unique', 'none', 'infinite'];
    const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
    const MAX_RETRIES = 120;

    const PRESETS = {
        easy: {
            variables: 2,
            solutionType: 'unique',
            minValue: 0,
            maxValue: 5,
            includeNegatives: false
        },
        medium: {
            variables: 2,
            solutionType: 'mixed',
            minValue: -5,
            maxValue: 5,
            includeNegatives: true
        },
        hard: {
            variables: 3,
            solutionType: 'mixed',
            minValue: -7,
            maxValue: 7,
            includeNegatives: true
        }
    };

    function getDependencies() {
        const practice = root.MatrixPractice || {};
        let random = practice.random;
        let model = practice.problemModel;
        let rref = practice.rref;
        let analysis = root.LinearSystemAnalysis;

        if ((!random || !model || !rref || !analysis) && typeof require === 'function') {
            random = random || require('../random.js');
            model = model || require('../problem-model.js');
            rref = rref || require('./rref.js');
            analysis = analysis || require('../../core/linear-system-analysis.js');
        }

        if (!random || !model || !rref || !analysis) {
            throw new Error('Linear systems generator requires random, problem model, RREF, and LinearSystemAnalysis modules.');
        }

        return { random, model, rref, analysis };
    }

    function ensureMath() {
        if (root.math && typeof root.math.fraction === 'function') return root.math;
        if (typeof require === 'function') {
            root.math = require('../../../math.min.js');
            return root.math;
        }
        throw new Error('Linear systems generator requires math.js.');
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

    function normalizeLinearSystemSettings(options) {
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
        const solutionType = hasOwn(options, 'solutionType') ? options.solutionType : preset.solutionType;
        if (!SOLUTION_TYPES.has(solutionType)) {
            throw new Error('solutionType must be unique, none, infinite, or mixed.');
        }

        const variables = hasOwn(options, 'variables') ? options.variables : preset.variables;
        assertInteger(variables, 'variables');
        if (variables !== 2 && variables !== 3) {
            throw new Error('variables must be 2 or 3.');
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

        return {
            seed,
            count,
            difficulty,
            solutionType,
            variables,
            minValue,
            maxValue,
            includeNegatives
        };
    }

    function randomInt(rng, settings) {
        return rng.int(settings.minValue, settings.maxValue);
    }

    function randomNonZero(rng, settings) {
        const values = [];
        for (let value = settings.minValue; value <= settings.maxValue; value++) {
            if (value !== 0) values.push(value);
        }
        if (!values.length) {
            throw new Error('Cannot generate a nonzero coefficient from the requested value range.');
        }
        return rng.pick(values);
    }

    function randomCoefficient(rng, settings) {
        return randomNonZero(rng, settings);
    }

    function randomConstant(rng, settings) {
        return randomInt(rng, settings);
    }

    function inRange(value, settings) {
        return value >= settings.minValue && value <= settings.maxValue;
    }

    function rowInRange(row, settings) {
        return row.every((value) => inRange(value, settings));
    }

    function vectorInRange(values, settings) {
        return values.every((value) => inRange(value, settings));
    }

    function isZeroRow(row) {
        return row.every((value) => value === 0);
    }

    function countNonZero(row) {
        return row.filter((value) => value !== 0).length;
    }

    function hasVariableCoverage(matrix) {
        for (let c = 0; c < matrix[0].length; c++) {
            if (!matrix.some((row) => row[c] !== 0)) return false;
        }
        return true;
    }

    function isIdentity(matrix) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                const expected = r === c ? 1 : 0;
                if (matrix[r][c] !== expected) return false;
            }
        }
        return true;
    }

    function isDiagonalOrAntiDiagonal(matrix) {
        if (matrix.length !== matrix[0].length) return false;
        let diagonal = true;
        let antiDiagonal = true;
        const n = matrix.length;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (r !== c && matrix[r][c] !== 0) diagonal = false;
                if (r + c !== n - 1 && matrix[r][c] !== 0) antiDiagonal = false;
            }
        }
        return diagonal || antiDiagonal;
    }

    function determinant2(matrix) {
        return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    }

    function hasDenseTwoVariableCoefficients(matrix) {
        return matrix.length === 2 && matrix.every((row) => row.length === 2 && row.every((value) => value !== 0));
    }

    function hasThreeVariableCoverage(matrix) {
        if (matrix.length !== 3 || matrix[0].length !== 3) return true;
        if (!matrix.every((row) => countNonZero(row) >= 2)) return false;
        for (let c = 0; c < 3; c++) {
            if (matrix.filter((row) => row[c] !== 0).length < 2) return false;
        }
        return !isDiagonalOrAntiDiagonal(matrix);
    }

    function countZeroConstants(constants) {
        return constants.filter((value) => value === 0).length;
    }

    function constantsHaveAcceptableZeros(constants) {
        return countZeroConstants(constants) <= 1;
    }

    function makeAugmented(coefficientMatrix, constants) {
        return coefficientMatrix.map((row, index) => row.concat([constants[index]]));
    }

    function splitAugmented(augmentedMatrix, variables) {
        return {
            coefficientMatrix: augmentedMatrix.map((row) => row.slice(0, variables)),
            constants: augmentedMatrix.map((row) => row[variables])
        };
    }

    function normalizeScalar(value) {
        const mathRef = ensureMath();
        const fraction = mathRef.fraction(value);
        const numerator = fraction.s * fraction.n;
        const denominator = fraction.d;
        if (numerator === 0) return 0;
        if (denominator === 1) return numerator;
        return { kind: 'fraction', numerator, denominator };
    }

    function normalizeExactMatrix(matrix) {
        return matrix.map((row) => row.map(normalizeScalar));
    }

    function exactToAnalysisValue(value) {
        if (typeof value === 'number') return value;
        return `${value.numerator}/${value.denominator}`;
    }

    function toAnalysisMatrix(matrix) {
        return matrix.map((row) => row.map(exactToAnalysisValue));
    }

    function normalizeAnalysisScalar(value) {
        return normalizeScalar(value);
    }

    function normalizeAnalysis(analysisResult, rrefMatrix) {
        const solutionType = analysisResult.solutionType;
        const base = {
            rrefMatrix,
            solutionType
        };

        if (solutionType === 'unique') {
            const solution = Array(analysisResult.variableCount).fill(0);
            analysisResult.uniqueValues.forEach((item) => {
                solution[item.variableIndex] = normalizeAnalysisScalar(item.value);
            });
            return Object.assign(base, { solution });
        }

        if (solutionType === 'none') {
            const rhs = analysisResult.variableCount;
            return Object.assign(base, {
                contradictionRows: analysisResult.inconsistentRows.map((row) => ({
                    row,
                    constant: rrefMatrix[row][rhs]
                }))
            });
        }

        return Object.assign(base, {
            pivotVariables: analysisResult.pivotColumns.slice(),
            freeVariables: analysisResult.freeColumns.slice(),
            expressions: analysisResult.expressions.map((expression) => ({
                variable: expression.variableIndex,
                isFree: expression.isFree,
                constant: normalizeAnalysisScalar(expression.constant),
                terms: expression.terms.map((term) => ({
                    freeVariable: term.freeVariableIndex,
                    coefficient: normalizeAnalysisScalar(term.coefficient)
                }))
            }))
        });
    }

    function pickSolutionType(settings, index) {
        if (settings.solutionType !== 'mixed') return settings.solutionType;
        const { random } = getDependencies();
        const seed = `${settings.seed}|${TYPE}|solution-type|${settings.difficulty}|${settings.variables}|${settings.minValue}:${settings.maxValue}|${settings.includeNegatives}|${index}`;
        return random.createSeededRandom(seed).pick(FINAL_TYPES);
    }

    function constructUnique(settings, rng) {
        const n = settings.variables;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const coefficientMatrix = [];
            for (let r = 0; r < n; r++) {
                const row = [];
                for (let c = 0; c < n; c++) {
                    row.push(randomCoefficient(rng, settings));
                }
                coefficientMatrix.push(row);
            }
            const constants = Array.from({ length: n }, () => randomConstant(rng, settings));
            if (isIdentity(coefficientMatrix) || isDiagonalOrAntiDiagonal(coefficientMatrix)) continue;
            if (!hasVariableCoverage(coefficientMatrix)) continue;
            if (n === 2 && (!hasDenseTwoVariableCoefficients(coefficientMatrix) || determinant2(coefficientMatrix) === 0)) continue;
            if (n === 3 && !hasThreeVariableCoverage(coefficientMatrix)) continue;
            return { coefficientMatrix, constants };
        }
        throw new Error('Unable to construct a candidate unique system.');
    }

    function constructDependentSystem(settings, rng, finalType) {
        const n = settings.variables;
        if (n === 2) {
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                const row = [randomCoefficient(rng, settings), randomCoefficient(rng, settings)];
                const kValues = [2, -2, 3, -3, 4, -4, 5, -5];
                const k = rng.pick(kValues);
                const row2 = row.map((value) => value * k);
                const c1 = randomConstant(rng, settings);
                let c2 = c1 * k;
                if (finalType === 'none') c2 += k > 0 ? 1 : -1;
                if (!rowInRange(row2, settings) || !inRange(c1, settings) || !inRange(c2, settings)) continue;
                return {
                    coefficientMatrix: [row, row2],
                    constants: [c1, c2]
                };
            }
            throw new Error(`Unable to construct a candidate ${finalType} system.`);
        }

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const row1 = Array.from({ length: n }, () => rng.bool(0.75) ? randomCoefficient(rng, settings) : randomInt(rng, settings));
            const row2 = Array.from({ length: n }, () => rng.bool(0.75) ? randomCoefficient(rng, settings) : randomInt(rng, settings));
            if (countNonZero(row1) < 2 || countNonZero(row2) < 2) continue;
            if (row1.join('|') === row2.join('|')) continue;
            const combo = rng.pick([[1, 1], [1, -1], [-1, 1], [2, 1], [1, 2]]);
            const row3 = row1.map((value, c) => combo[0] * value + combo[1] * row2[c]);
            if (countNonZero(row3) < 2 || !rowInRange(row3, settings)) continue;
            if (!hasThreeVariableCoverage([row1, row2, row3])) continue;

            const c1 = randomConstant(rng, settings);
            const c2 = randomConstant(rng, settings);
            let c3 = combo[0] * c1 + combo[1] * c2;
            if (finalType === 'none') c3 += combo[0] > 0 ? 1 : -1;
            if (!vectorInRange([c1, c2, c3], settings)) continue;

            return {
                coefficientMatrix: [row1, row2, row3],
                constants: [c1, c2, c3]
            };
        }
        throw new Error(`Unable to construct a candidate ${finalType} system.`);
    }

    function constructCandidate(settings, rng, finalType) {
        if (settings.minValue === 0 && settings.maxValue === 0) {
            throw new Error('Cannot generate a meaningful linear system from the 0..0 range.');
        }
        return finalType === 'unique'
            ? constructUnique(settings, rng)
            : constructDependentSystem(settings, rng, finalType);
    }

    function hasQuality(system, finalType) {
        if (system.coefficientMatrix.some(isZeroRow)) return false;
        if (!hasVariableCoverage(system.coefficientMatrix)) return false;
        if (!constantsHaveAcceptableZeros(system.constants)) return false;
        if (finalType === 'unique' && isIdentity(system.coefficientMatrix)) return false;
        if (isDiagonalOrAntiDiagonal(system.coefficientMatrix)) return false;
        if (system.coefficientMatrix.length === 2 && !hasDenseTwoVariableCoefficients(system.coefficientMatrix)) return false;
        if (system.coefficientMatrix.length === 3 && !hasThreeVariableCoverage(system.coefficientMatrix)) return false;
        return true;
    }

    function matrixKey(matrix) {
        return matrix.map((row) => row.join('|')).join('/');
    }

    function augmentedKey(system) {
        return makeAugmented(system.coefficientMatrix, system.constants).map((row) => row.join('|')).join('/');
    }

    function equationKeys(system) {
        return makeAugmented(system.coefficientMatrix, system.constants).map((row) => row.join('|'));
    }

    function countFlatDifferences(left, right) {
        let count = 0;
        for (let index = 0; index < left.length; index++) {
            if (left[index] !== right[index]) count++;
        }
        return count;
    }

    function maxZeroConstantsForSet(settings) {
        const totalConstants = settings.count * settings.variables;
        const countBasedLimit = Math.max(1, Math.floor(settings.count / 3));
        const ratioLimit = Math.floor(totalConstants * 0.2);
        return Math.min(countBasedLimit, ratioLimit);
    }

    function createDiversityContext(settings) {
        return {
            coefficientMatrices: new Set(),
            augmentedMatrices: new Set(),
            equations: new Set(),
            coefficientRows: new Set(),
            previousAugmented: null,
            previousHadZeroConstant: false,
            zeroConstantCount: 0,
            maxZeroConstants: maxZeroConstantsForSet(settings)
        };
    }

    function hasSetDiversity(system, context) {
        if (!context) return true;
        if (context.coefficientMatrices.has(matrixKey(system.coefficientMatrix))) return false;
        if (context.augmentedMatrices.has(augmentedKey(system))) return false;
        if (equationKeys(system).some((key) => context.equations.has(key))) return false;
        if (system.coefficientMatrix.some((row) => context.coefficientRows.has(row.join('|')))) return false;
        if (context.previousAugmented) {
            const current = flatten(makeAugmented(system.coefficientMatrix, system.constants));
            if (countFlatDifferences(current, context.previousAugmented) < 2) return false;
        }
        const zeroConstants = countZeroConstants(system.constants);
        if (zeroConstants > 0 && context.previousHadZeroConstant) return false;
        if (context.zeroConstantCount + zeroConstants > context.maxZeroConstants) return false;
        return true;
    }

    function collectDiversity(context, system) {
        if (!context) return;
        context.coefficientMatrices.add(matrixKey(system.coefficientMatrix));
        context.augmentedMatrices.add(augmentedKey(system));
        equationKeys(system).forEach((key) => context.equations.add(key));
        system.coefficientMatrix.forEach((row) => context.coefficientRows.add(row.join('|')));
        context.previousAugmented = flatten(makeAugmented(system.coefficientMatrix, system.constants));
        const zeroConstants = countZeroConstants(system.constants);
        context.zeroConstantCount += zeroConstants;
        context.previousHadZeroConstant = zeroConstants > 0;
    }

    async function analyzeSystem(system, variables) {
        const { rref, analysis } = getDependencies();
        const augmentedMatrix = makeAugmented(system.coefficientMatrix, system.constants);
        const reduced = await rref.reduceMatrixForPractice(augmentedMatrix);
        const analysisResult = analysis.analyzeRref(toAnalysisMatrix(reduced.rrefMatrix), variables);
        const exactAnswer = normalizeAnalysis(analysisResult, reduced.rrefMatrix);
        const rankA = analysisResult.rankCoefficient;
        const rankAugmented = analysisResult.rankAugmented;

        return {
            augmentedMatrix,
            reduced,
            analysisResult,
            exactAnswer,
            rankA,
            rankAugmented
        };
    }

    async function buildProblem(settings, index, diversityContext) {
        const { random, model } = getDependencies();
        const finalType = pickSolutionType(settings, index);
        const seed = `${settings.seed}|${TYPE}|${settings.difficulty}|${settings.variables}|${settings.minValue}:${settings.maxValue}|${settings.includeNegatives}|${finalType}|${index}`;
        let system = null;
        let analyzed = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const rng = random.createSeededRandom(`${seed}|attempt|${attempt}`);
            try {
                system = constructCandidate(settings, rng, finalType);
                if (!hasQuality(system, finalType)) continue;
                if (!hasSetDiversity(system, diversityContext)) continue;
                analyzed = await analyzeSystem(system, settings.variables);
                if (analyzed.analysisResult.solutionType === finalType) break;
                system = null;
            } catch {
                system = null;
            }
        }

        if (!system || !analyzed) {
            throw new Error(`Unable to generate a ${finalType} linear system for the requested settings.`);
        }

        collectDiversity(diversityContext, system);

        const idSeed = [
            settings.seed,
            settings.difficulty,
            finalType,
            settings.variables,
            settings.minValue,
            settings.maxValue,
            settings.includeNegatives
        ].join('-');

        return model.createProblem({
            id: model.createProblemId(TYPE, idSeed, index),
            type: TYPE,
            subtype: finalType,
            difficulty: settings.difficulty,
            inputs: {
                coefficientMatrix: cloneMatrix(system.coefficientMatrix),
                constants: system.constants.slice(),
                augmentedMatrix: cloneMatrix(analyzed.augmentedMatrix)
            },
            exactAnswer: analyzed.exactAnswer,
            steps: [{
                kind: 'form-augmented-matrix',
                matrix: cloneMatrix(analyzed.augmentedMatrix)
            }].concat(analyzed.reduced.steps),
            solutionType: finalType,
            dimensions: {
                equations: settings.variables,
                variables: settings.variables,
                augmentedCols: settings.variables + 1
            },
            metadata: {
                rankA: analyzed.rankA,
                rankAugmented: analyzed.rankAugmented,
                freeVariableCount: analyzed.analysisResult.freeColumns.length,
                rowOperationCount: analyzed.reduced.steps.length
            }
        });
    }

    function createSetId(settings) {
        const { model } = getDependencies();
        return model.createProblemId(TYPE, [
            'set',
            settings.seed,
            settings.difficulty,
            settings.solutionType,
            settings.variables,
            settings.minValue,
            settings.maxValue,
            settings.includeNegatives
        ].join('-'), 0);
    }

    async function generateLinearSystemProblem(options) {
        const settings = normalizeLinearSystemSettings(Object.assign({}, options, { count: 1 }));
        const index = hasOwn(options || {}, 'index') ? options.index : 0;
        if (!Number.isInteger(index) || index < 0) {
            throw new Error('index must be a non-negative integer.');
        }
        return buildProblem(settings, index);
    }

    async function generateLinearSystemSet(options) {
        const { model } = getDependencies();
        const settings = normalizeLinearSystemSettings(options);
        const problems = [];
        const diversityContext = createDiversityContext(settings);

        for (let index = 0; index < settings.count; index++) {
            problems.push(await buildProblem(settings, index, diversityContext));
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
        generateLinearSystemProblem,
        generateLinearSystemSet,
        normalizeLinearSystemSettings
    };

    root.MatrixPractice = root.MatrixPractice || {};
    root.MatrixPractice.linearSystems = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
