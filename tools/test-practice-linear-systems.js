'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

globalThis.math = require(path.join('..', 'math.min.js'));

const generator = require(path.join('..', 'js', 'practice', 'generators', 'linear-systems.js'));

function flatten(matrix) {
    return matrix.reduce((items, row) => items.concat(row), []);
}

function shape(matrix) {
    return [matrix.length, matrix[0].length];
}

function matrixKey(matrix) {
    return matrix.map((row) => row.join('|')).join('/');
}

function augmentedKey(problem) {
    return matrixKey(problem.inputs.augmentedMatrix);
}

function equationKey(problem, rowIndex) {
    return problem.inputs.augmentedMatrix[rowIndex].join('|');
}

function countNonZero(row) {
    return row.filter((value) => value !== 0).length;
}

function assertThrowsAsync(name, fn) {
    return assert.rejects(fn, Error, name);
}

function assertMatrixInRange(matrix, minValue, maxValue) {
    flatten(matrix).forEach((value) => {
        assert(Number.isInteger(value));
        assert(value >= minValue, `${value} < ${minValue}`);
        assert(value <= maxValue, `${value} > ${maxValue}`);
    });
}

function assertConstantsInRange(constants, minValue, maxValue) {
    constants.forEach((value) => {
        assert(Number.isInteger(value));
        assert(value >= minValue, `${value} < ${minValue}`);
        assert(value <= maxValue, `${value} > ${maxValue}`);
    });
}

function valueKey(value) {
    return typeof value === 'number' ? String(value) : `${value.numerator}/${value.denominator}`;
}

function matrixKeys(matrix) {
    return matrix.map((row) => row.map(valueKey));
}

function toFraction(value) {
    if (typeof value === 'number') return globalThis.math.fraction(value);
    if (value && typeof value === 'object' && Number.isInteger(value.n) && Number.isInteger(value.d)) {
        return globalThis.math.fraction(value);
    }
    return globalThis.math.fraction(value.numerator, value.denominator);
}

function addValues(a, b) {
    return globalThis.math.add(toFraction(a), toFraction(b));
}

function multiplyValues(a, b) {
    return globalThis.math.multiply(toFraction(a), toFraction(b));
}

function normalizeScalar(value) {
    const fraction = globalThis.math.fraction(value);
    const numerator = fraction.s * fraction.n;
    const denominator = fraction.d;
    if (numerator === 0) return 0;
    if (denominator === 1) return numerator;
    return { kind: 'fraction', numerator, denominator };
}

function assertExactValue(value) {
    if (typeof value === 'number') {
        assert(Number.isInteger(value));
        return;
    }
    assert.strictEqual(value.kind, 'fraction');
    assert(Number.isInteger(value.numerator));
    assert(Number.isInteger(value.denominator));
    assert(value.denominator > 0);
    assert.notStrictEqual(value.denominator, 1);
}

function assertExactDeep(value) {
    if (Array.isArray(value)) {
        value.forEach(assertExactDeep);
        return;
    }
    if (value && typeof value === 'object') {
        if (value.kind === 'fraction') {
            assertExactValue(value);
            return;
        }
        Object.keys(value).forEach((key) => assertExactDeep(value[key]));
        return;
    }
    if (typeof value === 'number') {
        assert(Number.isInteger(value));
    }
}

function applyStep(matrix, step) {
    const result = matrix.map((row) => row.slice());
    if (step.kind === 'swap-rows') {
        const tmp = result[step.rowA];
        result[step.rowA] = result[step.rowB];
        result[step.rowB] = tmp;
        return result;
    }
    if (step.kind === 'scale-row') {
        for (let c = 0; c < result[step.row].length; c++) {
            result[step.row][c] = normalizeScalar(multiplyValues(result[step.row][c], step.factor));
        }
        return result;
    }
    for (let c = 0; c < result[step.targetRow].length; c++) {
        result[step.targetRow][c] = normalizeScalar(addValues(
            result[step.targetRow][c],
            multiplyValues(step.multiple, result[step.sourceRow][c])
        ));
    }
    return result;
}

function assertStepsReplay(problem) {
    assert.strictEqual(problem.steps[0].kind, 'form-augmented-matrix');
    assert.deepStrictEqual(problem.steps[0].matrix, problem.inputs.augmentedMatrix);
    let matrix = problem.steps[0].matrix.map((row) => row.slice());
    problem.steps.slice(1).forEach((step) => {
        assert(['swap-rows', 'scale-row', 'add-row-multiple'].includes(step.kind));
        assert(!Object.prototype.hasOwnProperty.call(step, 'label'));
        assert(!Object.prototype.hasOwnProperty.call(step, 'text'));
        matrix = applyStep(matrix, step);
        assert.deepStrictEqual(matrixKeys(matrix), matrixKeys(step.matrix));
    });
    assert.deepStrictEqual(matrixKeys(matrix), matrixKeys(problem.exactAnswer.rrefMatrix));
}

function assertNoUiText(value) {
    if (!value || typeof value !== 'object') return;
    assert(!Object.prototype.hasOwnProperty.call(value, 'label'));
    assert(!Object.prototype.hasOwnProperty.call(value, 'text'));
    const serialized = JSON.stringify(value);
    ['Unique Solution', 'No Solution', 'Infinitely Many Solutions', 'Solve the system', 'Show answer', 'x ='].forEach((phrase) => {
        assert.strictEqual(serialized.includes(phrase), false, phrase);
    });
    Object.keys(value).forEach((key) => assertNoUiText(value[key]));
}

function assertProblemBasics(problem, minValue, maxValue) {
    const n = problem.dimensions.variables;
    assert.strictEqual(problem.type, 'linear-system');
    assert.strictEqual(problem.subtype, problem.solutionType);
    assert(['unique', 'none', 'infinite'].includes(problem.solutionType));
    assert.deepStrictEqual(shape(problem.inputs.coefficientMatrix), [n, n]);
    assert.strictEqual(problem.inputs.constants.length, n);
    assert.deepStrictEqual(shape(problem.inputs.augmentedMatrix), [n, n + 1]);
    problem.inputs.augmentedMatrix.forEach((row, index) => {
        assert.deepStrictEqual(row, problem.inputs.coefficientMatrix[index].concat([problem.inputs.constants[index]]));
    });
    assertMatrixInRange(problem.inputs.coefficientMatrix, minValue, maxValue);
    assertConstantsInRange(problem.inputs.constants, minValue, maxValue);
    assert(problem.inputs.coefficientMatrix.every((row) => row.some((value) => value !== 0)));
    for (let c = 0; c < n; c++) {
        assert(problem.inputs.coefficientMatrix.some((row) => row[c] !== 0));
    }
    assertExactDeep(problem.exactAnswer);
    assertStepsReplay(problem);
    assertNoUiText(problem);
    assert.notStrictEqual(problem.exactAnswer.rrefMatrix, problem.inputs.augmentedMatrix);
}

function assertDenseTwoVariableSystem(problem) {
    assert.strictEqual(problem.dimensions.variables, 2);
    assert.deepStrictEqual(shape(problem.inputs.coefficientMatrix), [2, 2]);
    problem.inputs.coefficientMatrix.forEach((row) => {
        assert.strictEqual(countNonZero(row), 2, `${problem.id} has a single-variable equation`);
    });
    flatten(problem.inputs.coefficientMatrix).forEach((value) => {
        assert.notStrictEqual(value, 0, `${problem.id} has a zero coefficient`);
    });
    const matrix = problem.inputs.coefficientMatrix;
    assert(
        matrix[0][1] !== 0 || matrix[1][0] !== 0,
        `${problem.id} should not be diagonal`
    );
    assert(
        matrix[0][0] !== 0 || matrix[1][1] !== 0,
        `${problem.id} should not be anti-diagonal`
    );
}

function assertThreeVariableQuality(problem) {
    assert.strictEqual(problem.dimensions.variables, 3);
    problem.inputs.coefficientMatrix.forEach((row) => {
        assert(countNonZero(row) >= 2, `${problem.id} has a sparse 3-variable equation`);
    });
    for (let c = 0; c < 3; c++) {
        assert(
            problem.inputs.coefficientMatrix.filter((row) => row[c] !== 0).length >= 2,
            `${problem.id} variable ${c} has weak coverage`
        );
    }
}

function assertSetDiversity(set) {
    const coefficientMatrices = new Set();
    const augmentedMatrices = new Set();
    const equations = new Set();
    const coefficientRows = new Set();
    let previous = null;

    set.problems.forEach((problem) => {
        assert(!coefficientMatrices.has(matrixKey(problem.inputs.coefficientMatrix)), `repeated coefficient matrix: ${problem.id}`);
        assert(!augmentedMatrices.has(augmentedKey(problem)), `repeated augmented matrix: ${problem.id}`);
        problem.inputs.coefficientMatrix.forEach((row, index) => {
            const fullEquation = equationKey(problem, index);
            const coefficientRow = row.join('|');
            assert(!equations.has(fullEquation), `repeated equation: ${problem.id}`);
            assert(!coefficientRows.has(coefficientRow), `repeated coefficient row: ${problem.id}`);
            equations.add(fullEquation);
            coefficientRows.add(coefficientRow);
        });
        if (previous) {
            const current = flatten(problem.inputs.augmentedMatrix);
            assert(
                current.filter((value, index) => value !== previous[index]).length >= 2,
                `adjacent systems are too similar: ${problem.id}`
            );
        }
        coefficientMatrices.add(matrixKey(problem.inputs.coefficientMatrix));
        augmentedMatrices.add(augmentedKey(problem));
        previous = flatten(problem.inputs.augmentedMatrix);
    });
}

function maxZeroConstantsForSet(set) {
    const totalConstants = set.settings.count * set.settings.variables;
    const countBasedLimit = Math.max(1, Math.floor(set.settings.count / 3));
    const ratioLimit = Math.floor(totalConstants * 0.2);
    return Math.min(countBasedLimit, ratioLimit);
}

function assertBalancedZeroConstants(set) {
    let zeroTotal = 0;
    let previousHasZero = false;

    set.problems.forEach((problem) => {
        const zeroCount = problem.inputs.constants.filter((value) => value === 0).length;
        assert(zeroCount <= 1, `${problem.id} has too many zero constants`);
        assert(!(previousHasZero && zeroCount > 0), `${problem.id} is adjacent to another zero-constant problem`);
        zeroTotal += zeroCount;
        previousHasZero = zeroCount > 0;
    });

    assert(zeroTotal <= maxZeroConstantsForSet(set), `too many zero constants: ${zeroTotal}`);
}

function formatEquation(row, constant) {
    const names = ['x', 'y', 'z'];
    const terms = row.map((coefficient, index) => `${coefficient}${names[index]}`);
    return `${terms.join(' + ')} = ${constant}`;
}

function assertUniqueSatisfies(problem) {
    const solution = problem.exactAnswer.solution.map(toFraction);
    problem.inputs.coefficientMatrix.forEach((row, r) => {
        let sum = globalThis.math.fraction(0);
        row.forEach((value, c) => {
            sum = globalThis.math.add(sum, globalThis.math.multiply(value, solution[c]));
        });
        assert(globalThis.math.equal(sum, problem.inputs.constants[r]), problem.id);
    });
}

function hasFraction(value) {
    if (Array.isArray(value)) return value.some(hasFraction);
    if (value && typeof value === 'object') {
        if (value.kind === 'fraction') return true;
        return Object.keys(value).some((key) => hasFraction(value[key]));
    }
    return false;
}

function problemFixture(problem) {
    return {
        id: problem.id,
        coefficientMatrix: problem.inputs.coefficientMatrix,
        constants: problem.inputs.constants,
        augmentedMatrix: problem.inputs.augmentedMatrix,
        solutionType: problem.solutionType,
        exactAnswer: problem.exactAnswer,
        rowOperationCount: problem.metadata.rowOperationCount,
        firstRrefOperation: problem.steps[1],
        lastRrefOperation: problem.steps[problem.steps.length - 1]
    };
}

async function runTests() {
    const rows = [];

    const uniqueOptions = {
        seed: 'matrixcalcu-system-unique-v1',
        count: 1,
        difficulty: 'medium',
        solutionType: 'unique'
    };
    const noneOptions = {
        seed: 'matrixcalcu-system-none-v1',
        count: 1,
        difficulty: 'medium',
        solutionType: 'none'
    };
    const infiniteOptions = {
        seed: 'matrixcalcu-system-infinite-v1',
        count: 1,
        difficulty: 'medium',
        solutionType: 'infinite'
    };
    const hardOptions = {
        seed: 'matrixcalcu-system-hard-v1',
        count: 1,
        difficulty: 'hard',
        solutionType: 'mixed'
    };

    const sameA = await generator.generateLinearSystemSet(uniqueOptions);
    const sameB = await generator.generateLinearSystemSet(uniqueOptions);
    assert.deepStrictEqual(sameA, sameB);
    const different = await generator.generateLinearSystemSet(Object.assign({}, uniqueOptions, { seed: 'matrixcalcu-system-unique-v2' }));
    assert.notDeepStrictEqual(sameA, different);
    rows.push(['T01', 'same settings are deterministic and different seeds differ', 'pass']);

    const expectedUnique = {
        id: 'practice-linear-system-993165639-medium-unique-2-5-5-true-1',
        coefficientMatrix: [[-3, 1], [3, -4]],
        constants: [-4, 5],
        augmentedMatrix: [[-3, 1, -4], [3, -4, 5]],
        solutionType: 'unique',
        exactAnswer: {
            rrefMatrix: [[1, 0, { kind: 'fraction', numerator: 11, denominator: 9 }], [0, 1, { kind: 'fraction', numerator: -1, denominator: 3 }]],
            solutionType: 'unique',
            solution: [{ kind: 'fraction', numerator: 11, denominator: 9 }, { kind: 'fraction', numerator: -1, denominator: 3 }]
        },
        rowOperationCount: 4,
        firstRrefOperation: {
            kind: 'scale-row',
            row: 0,
            factor: { kind: 'fraction', numerator: -1, denominator: 3 },
            matrix: [[1, { kind: 'fraction', numerator: -1, denominator: 3 }, { kind: 'fraction', numerator: 4, denominator: 3 }], [3, -4, 5]]
        },
        lastRrefOperation: {
            kind: 'add-row-multiple',
            targetRow: 0,
            sourceRow: 1,
            multiple: { kind: 'fraction', numerator: 1, denominator: 3 },
            matrix: [[1, 0, { kind: 'fraction', numerator: 11, denominator: 9 }], [0, 1, { kind: 'fraction', numerator: -1, denominator: 3 }]]
        }
    };
    assert.deepStrictEqual(problemFixture(sameA.problems[0]), expectedUnique);
    rows.push(['T02', 'unique golden fixture is stable', 'pass']);

    const noneSet = await generator.generateLinearSystemSet(noneOptions);
    const expectedNone = {
        id: 'practice-linear-system-3948981324-medium-none-2-5-5-true-1',
        coefficientMatrix: [[1, 1], [2, 2]],
        constants: [-2, -3],
        augmentedMatrix: [[1, 1, -2], [2, 2, -3]],
        solutionType: 'none',
        exactAnswer: {
            rrefMatrix: [[1, 1, 0], [0, 0, 1]],
            solutionType: 'none',
            contradictionRows: [{ row: 1, constant: 1 }]
        },
        rowOperationCount: 2,
        firstRrefOperation: {
            kind: 'add-row-multiple',
            targetRow: 1,
            sourceRow: 0,
            multiple: -2,
            matrix: [[1, 1, -2], [0, 0, 1]]
        },
        lastRrefOperation: {
            kind: 'add-row-multiple',
            targetRow: 0,
            sourceRow: 1,
            multiple: 2,
            matrix: [[1, 1, 0], [0, 0, 1]]
        }
    };
    assert.deepStrictEqual(problemFixture(noneSet.problems[0]), expectedNone);
    rows.push(['T03', 'none golden fixture is stable', 'pass']);

    const infiniteSet = await generator.generateLinearSystemSet(infiniteOptions);
    const expectedInfinite = {
        id: 'practice-linear-system-2380558394-medium-infinite-2-5-5-true-1',
        coefficientMatrix: [[1, 2], [2, 4]],
        constants: [-1, -2],
        augmentedMatrix: [[1, 2, -1], [2, 4, -2]],
        solutionType: 'infinite',
        exactAnswer: {
            rrefMatrix: [[1, 2, -1], [0, 0, 0]],
            solutionType: 'infinite',
            pivotVariables: [0],
            freeVariables: [1],
            expressions: [
                { variable: 0, isFree: false, constant: -1, terms: [{ freeVariable: 1, coefficient: -2 }] },
                { variable: 1, isFree: true, constant: 0, terms: [{ freeVariable: 1, coefficient: 1 }] }
            ]
        },
        rowOperationCount: 1,
        lastRrefOperation: {
            kind: 'add-row-multiple',
            targetRow: 1,
            sourceRow: 0,
            multiple: -2,
            matrix: [[1, 2, -1], [0, 0, 0]]
        }
    };
    expectedInfinite.firstRrefOperation = expectedInfinite.lastRrefOperation;
    assert.deepStrictEqual(problemFixture(infiniteSet.problems[0]), expectedInfinite);
    rows.push(['T04', 'infinite golden fixture is stable', 'pass']);

    const hardSet = await generator.generateLinearSystemSet(hardOptions);
    const expectedHard = {
        id: 'practice-linear-system-4243632173-hard-infinite-3-7-7-true-1',
        coefficientMatrix: [[-6, -4, 3], [-4, -2, 4], [2, 2, 1]],
        constants: [-4, 3, 7],
        augmentedMatrix: [[-6, -4, 3, -4], [-4, -2, 4, 3], [2, 2, 1, 7]],
        solutionType: 'infinite',
        exactAnswer: {
            rrefMatrix: [
                [1, 0, { kind: 'fraction', numerator: -5, denominator: 2 }, -5],
                [0, 1, 3, { kind: 'fraction', numerator: 17, denominator: 2 }],
                [0, 0, 0, 0]
            ],
            solutionType: 'infinite',
            pivotVariables: [0, 1],
            freeVariables: [2],
            expressions: [
                { variable: 0, isFree: false, constant: -5, terms: [{ freeVariable: 2, coefficient: { kind: 'fraction', numerator: 5, denominator: 2 } }] },
                { variable: 1, isFree: false, constant: { kind: 'fraction', numerator: 17, denominator: 2 }, terms: [{ freeVariable: 2, coefficient: -3 }] },
                { variable: 2, isFree: true, constant: 0, terms: [{ freeVariable: 2, coefficient: 1 }] }
            ]
        },
        rowOperationCount: 6,
        firstRrefOperation: {
            kind: 'scale-row',
            row: 0,
            factor: { kind: 'fraction', numerator: -1, denominator: 6 },
            matrix: [[1, { kind: 'fraction', numerator: 2, denominator: 3 }, { kind: 'fraction', numerator: -1, denominator: 2 }, { kind: 'fraction', numerator: 2, denominator: 3 }], [-4, -2, 4, 3], [2, 2, 1, 7]]
        },
        lastRrefOperation: {
            kind: 'add-row-multiple',
            targetRow: 2,
            sourceRow: 1,
            multiple: { kind: 'fraction', numerator: -2, denominator: 3 },
            matrix: [[1, 0, { kind: 'fraction', numerator: -5, denominator: 2 }, -5], [0, 1, 3, { kind: 'fraction', numerator: 17, denominator: 2 }], [0, 0, 0, 0]]
        }
    };
    assert.deepStrictEqual(problemFixture(hardSet.problems[0]), expectedHard);
    rows.push(['T05', 'hard 3x3 golden fixture is stable', 'pass']);

    [sameA.problems[0], noneSet.problems[0], infiniteSet.problems[0]].forEach((problem) => assertProblemBasics(problem, -5, 5));
    hardSet.problems.forEach((problem) => assertProblemBasics(problem, -7, 7));
    assertUniqueSatisfies(sameA.problems[0]);
    assertDenseTwoVariableSystem(sameA.problems[0]);
    assertDenseTwoVariableSystem(noneSet.problems[0]);
    assertDenseTwoVariableSystem(infiniteSet.problems[0]);
    assertThreeVariableQuality(hardSet.problems[0]);
    assert.strictEqual(noneSet.problems[0].metadata.rankA < noneSet.problems[0].metadata.rankAugmented, true);
    assert(noneSet.problems[0].exactAnswer.contradictionRows.length > 0);
    assert.strictEqual(infiniteSet.problems[0].metadata.freeVariableCount > 0, true);
    assert(infiniteSet.problems[0].exactAnswer.freeVariables.length > 0);
    rows.push(['T06', 'classification-specific math invariants are valid', 'pass']);

    const easy = await generator.generateLinearSystemSet({ seed: 'easy-system', count: 2, difficulty: 'easy' });
    assert.strictEqual(easy.settings.variables, 2);
    assert.strictEqual(easy.settings.solutionType, 'unique');
    assert.strictEqual(easy.settings.minValue, 0);
    assert.strictEqual(easy.settings.maxValue, 5);
    easy.problems.forEach((problem) => {
        assert.strictEqual(problem.solutionType, 'unique');
        assertProblemBasics(problem, 0, 5);
    });
    const medium = await generator.generateLinearSystemSet({ seed: 'medium-system', count: 3, difficulty: 'medium' });
    assert.strictEqual(medium.settings.variables, 2);
    assert.strictEqual(medium.settings.solutionType, 'mixed');
    const hard = await generator.generateLinearSystemSet({ seed: 'hard-system', count: 2, difficulty: 'hard' });
    assert.strictEqual(hard.settings.variables, 3);
    assert.strictEqual(hard.settings.solutionType, 'mixed');
    rows.push(['T07', 'difficulty defaults are valid', 'pass']);

    const uiUniqueOptions = {
        seed: 'ui-linear-system-quality-unique-v2',
        count: 6,
        difficulty: 'easy',
        solutionType: 'unique',
        variables: 2,
        minValue: 0,
        maxValue: 5,
        includeNegatives: false
    };
    const uiUnique = await generator.generateLinearSystemSet(uiUniqueOptions);
    const expectedUiUnique = [
        {
            coefficientMatrix: [[1, 3], [1, 4]],
            constants: [1, 3],
            equations: ['1x + 3y = 1', '1x + 4y = 3'],
            solution: [-5, 2],
            nonzeroCounts: [2, 2]
        },
        {
            coefficientMatrix: [[3, 5], [4, 2]],
            constants: [5, 5],
            equations: ['3x + 5y = 5', '4x + 2y = 5'],
            solution: [
                { kind: 'fraction', numerator: 15, denominator: 14 },
                { kind: 'fraction', numerator: 5, denominator: 14 }
            ],
            nonzeroCounts: [2, 2]
        },
        {
            coefficientMatrix: [[4, 3], [2, 2]],
            constants: [1, 3],
            equations: ['4x + 3y = 1', '2x + 2y = 3'],
            solution: [{ kind: 'fraction', numerator: -7, denominator: 2 }, 5],
            nonzeroCounts: [2, 2]
        },
        {
            coefficientMatrix: [[4, 5], [1, 1]],
            constants: [4, 2],
            equations: ['4x + 5y = 4', '1x + 1y = 2'],
            solution: [6, -4],
            nonzeroCounts: [2, 2]
        },
        {
            coefficientMatrix: [[2, 4], [3, 4]],
            constants: [3, 0],
            equations: ['2x + 4y = 3', '3x + 4y = 0'],
            solution: [-3, { kind: 'fraction', numerator: 9, denominator: 4 }],
            nonzeroCounts: [2, 2]
        },
        {
            coefficientMatrix: [[5, 5], [5, 1]],
            constants: [1, 5],
            equations: ['5x + 5y = 1', '5x + 1y = 5'],
            solution: [
                { kind: 'fraction', numerator: 6, denominator: 5 },
                -1
            ],
            nonzeroCounts: [2, 2]
        }
    ];
    assert.deepStrictEqual(
        uiUnique.problems.map((problem) => ({
            coefficientMatrix: problem.inputs.coefficientMatrix,
            constants: problem.inputs.constants,
            equations: problem.inputs.coefficientMatrix.map((row, index) => formatEquation(row, problem.inputs.constants[index])),
            solution: problem.exactAnswer.solution,
            nonzeroCounts: problem.inputs.coefficientMatrix.map(countNonZero)
        })),
        expectedUiUnique
    );
    uiUnique.problems.forEach((problem) => {
        assertProblemBasics(problem, 0, 5);
        assertDenseTwoVariableSystem(problem);
        assert.strictEqual(problem.solutionType, 'unique');
        assertUniqueSatisfies(problem);
    });
    assertSetDiversity(uiUnique);
    assertBalancedZeroConstants(uiUnique);
    assert.deepStrictEqual(await generator.generateLinearSystemSet(uiUniqueOptions), uiUnique);
    const uiUniqueTen = await generator.generateLinearSystemSet(Object.assign({}, uiUniqueOptions, { count: 10 }));
    assert.deepStrictEqual(uiUniqueTen.problems.slice(0, 6), uiUnique.problems);
    rows.push(['T07a', 'full UI easy unique systems use dense 2-variable equations and remain deterministic', 'pass']);

    const balancedZeroOptions = {
        seed: 'ui-linear-system-balanced-zero-v4',
        count: 6,
        difficulty: 'easy',
        solutionType: 'unique',
        variables: 2,
        minValue: 0,
        maxValue: 5,
        includeNegatives: false
    };
    const balancedZeroSet = await generator.generateLinearSystemSet(balancedZeroOptions);
    const expectedBalancedZeroFixture = [
        {
            coefficientMatrix: [[2, 3], [1, 2]],
            constants: [1, 2],
            equations: ['2x + 3y = 1', '1x + 2y = 2'],
            solution: [-4, 3],
            zeroConstants: 0
        },
        {
            coefficientMatrix: [[2, 5], [5, 4]],
            constants: [0, 1],
            equations: ['2x + 5y = 0', '5x + 4y = 1'],
            solution: [
                { kind: 'fraction', numerator: 5, denominator: 17 },
                { kind: 'fraction', numerator: -2, denominator: 17 }
            ],
            zeroConstants: 1
        },
        {
            coefficientMatrix: [[4, 1], [2, 1]],
            constants: [5, 5],
            equations: ['4x + 1y = 5', '2x + 1y = 5'],
            solution: [0, 5],
            zeroConstants: 0
        },
        {
            coefficientMatrix: [[5, 2], [4, 4]],
            constants: [3, 0],
            equations: ['5x + 2y = 3', '4x + 4y = 0'],
            solution: [1, -1],
            zeroConstants: 1
        },
        {
            coefficientMatrix: [[4, 5], [5, 1]],
            constants: [4, 1],
            equations: ['4x + 5y = 4', '5x + 1y = 1'],
            solution: [
                { kind: 'fraction', numerator: 1, denominator: 21 },
                { kind: 'fraction', numerator: 16, denominator: 21 }
            ],
            zeroConstants: 0
        },
        {
            coefficientMatrix: [[2, 2], [1, 4]],
            constants: [4, 4],
            equations: ['2x + 2y = 4', '1x + 4y = 4'],
            solution: [
                { kind: 'fraction', numerator: 4, denominator: 3 },
                { kind: 'fraction', numerator: 2, denominator: 3 }
            ],
            zeroConstants: 0
        }
    ];
    assert.deepStrictEqual(
        balancedZeroSet.problems.map((problem) => ({
            coefficientMatrix: problem.inputs.coefficientMatrix,
            constants: problem.inputs.constants,
            equations: problem.inputs.coefficientMatrix.map((row, index) => formatEquation(row, problem.inputs.constants[index])),
            solution: problem.exactAnswer.solution,
            zeroConstants: problem.inputs.constants.filter((value) => value === 0).length
        })),
        expectedBalancedZeroFixture
    );
    balancedZeroSet.problems.forEach((problem) => {
        assertProblemBasics(problem, 0, 5);
        assertDenseTwoVariableSystem(problem);
        assert.strictEqual(problem.solutionType, 'unique');
        assertUniqueSatisfies(problem);
    });
    assertBalancedZeroConstants(balancedZeroSet);
    assert.deepStrictEqual(await generator.generateLinearSystemSet(balancedZeroOptions), balancedZeroSet);
    const balancedZeroTen = await generator.generateLinearSystemSet(Object.assign({}, balancedZeroOptions, { count: 10 }));
    assert.deepStrictEqual(balancedZeroTen.problems.slice(0, 6), balancedZeroSet.problems);
    const balancedZeroBefore = Object.assign({}, balancedZeroOptions);
    await generator.generateLinearSystemSet(balancedZeroOptions);
    assert.deepStrictEqual(balancedZeroOptions, balancedZeroBefore);
    rows.push(['T07d', 'full UI easy unique systems keep balanced zero constants', 'pass']);

    const uiMixed = await generator.generateLinearSystemSet({
        seed: 'ui-linear-system-quality-mixed-v2',
        count: 6,
        difficulty: 'medium',
        solutionType: 'mixed',
        variables: 2,
        minValue: -5,
        maxValue: 5,
        includeNegatives: true
    });
    assert.deepStrictEqual(
        uiMixed.problems.map((problem) => problem.solutionType),
        ['infinite', 'infinite', 'unique', 'none', 'none', 'infinite']
    );
    uiMixed.problems.forEach((problem) => {
        assertProblemBasics(problem, -5, 5);
        assertDenseTwoVariableSystem(problem);
        if (problem.solutionType === 'unique') assertUniqueSatisfies(problem);
        if (problem.solutionType === 'none') assert(problem.exactAnswer.contradictionRows.length > 0);
        if (problem.solutionType === 'infinite') assert(problem.exactAnswer.freeVariables.length > 0);
    });
    assert(new Set(uiMixed.problems.map((problem) => problem.solutionType)).has('unique'));
    assert(new Set(uiMixed.problems.map((problem) => problem.solutionType)).has('none'));
    assert(new Set(uiMixed.problems.map((problem) => problem.solutionType)).has('infinite'));
    assertSetDiversity(uiMixed);
    rows.push(['T07b', 'full UI medium mixed systems keep dense coefficients across all solution paths', 'pass']);

    const hardThree = await generator.generateLinearSystemSet({
        seed: 'ui-linear-system-quality-hard3-v2',
        count: 1,
        difficulty: 'hard',
        solutionType: 'mixed',
        variables: 3,
        minValue: -7,
        maxValue: 7,
        includeNegatives: true
    });
    const hardThreeProblem = hardThree.problems[0];
    assert.deepStrictEqual(hardThreeProblem.inputs.coefficientMatrix, [[-6, 5, -4], [6, -4, 7], [0, 1, 3]]);
    assert.deepStrictEqual(hardThreeProblem.inputs.constants, [-2, 4, 3]);
    assert.strictEqual(hardThreeProblem.solutionType, 'none');
    assertProblemBasics(hardThreeProblem, -7, 7);
    assertThreeVariableQuality(hardThreeProblem);
    assert(hardThreeProblem.exactAnswer.contradictionRows.length > 0);
    rows.push(['T07c', 'hard 3-variable fixture keeps at least two variables per equation and valid analysis', 'pass']);

    const explicit = await generator.generateLinearSystemSet({
        seed: 'explicit-system',
        count: 1,
        difficulty: 'medium',
        variables: 3,
        solutionType: 'none',
        minValue: -7,
        maxValue: 7,
        includeNegatives: true
    });
    assert.strictEqual(explicit.problems[0].dimensions.variables, 3);
    assert.strictEqual(explicit.problems[0].solutionType, 'none');
    rows.push(['T08', 'explicit variables, solutionType, and range override defaults', 'pass']);

    const mixedSeeds = [
        ['mixed-path-unique-4', 'unique'],
        ['mixed-path-none-0', 'none'],
        ['mixed-path-infinite-0', 'infinite']
    ];
    for (const [seed, expected] of mixedSeeds) {
        const problem = (await generator.generateLinearSystemSet({ seed, count: 1, difficulty: 'medium' })).problems[0];
        assert.strictEqual(problem.solutionType, expected);
    }
    rows.push(['T09', 'all mixed solution paths are reachable with fixed seed lists', 'pass']);

    const idsSet = await generator.generateLinearSystemSet({ seed: 'ids-system', count: 5, difficulty: 'medium' });
    const ids = idsSet.problems.map((problem) => problem.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    assert.deepStrictEqual(ids, (await generator.generateLinearSystemSet({ seed: 'ids-system', count: 5, difficulty: 'medium' })).problems.map((problem) => problem.id));
    rows.push(['T10', 'problem IDs are unique and stable', 'pass']);

    const five = await generator.generateLinearSystemSet({ seed: 'count-system', count: 5, difficulty: 'medium' });
    const ten = await generator.generateLinearSystemSet({ seed: 'count-system', count: 10, difficulty: 'medium' });
    assert.deepStrictEqual(ten.problems.slice(0, 5), five.problems);
    rows.push(['T11', 'increasing count preserves prefix problems', 'pass']);

    const options = {
        seed: 'settings-system',
        count: 2,
        difficulty: 'hard',
        solutionType: 'unique',
        variables: 3,
        minValue: -7,
        maxValue: 7,
        includeNegatives: true
    };
    const before = Object.assign({}, options);
    const settingsSet = await generator.generateLinearSystemSet(options);
    assert.deepStrictEqual(options, before);
    assert.deepStrictEqual(settingsSet.settings, Object.assign({}, before, { seed: settingsSet.seed }));
    assert.notStrictEqual(settingsSet.settings, options);
    rows.push(['T12', 'options are not mutated and settings snapshot is flat', 'pass']);

    await assertThrowsAsync('0..0 impossible range', () => generator.generateLinearSystemSet({
        seed: 'zero-system',
        count: 1,
        difficulty: 'easy',
        minValue: 0,
        maxValue: 0,
        includeNegatives: false
    }));
    await assertThrowsAsync('missing seed', () => generator.generateLinearSystemSet({ count: 1 }));
    await assertThrowsAsync('invalid count type', () => generator.generateLinearSystemSet({ seed: 'x', count: 1.5 }));
    await assertThrowsAsync('invalid count range', () => generator.generateLinearSystemSet({ seed: 'x', count: 11 }));
    await assertThrowsAsync('invalid difficulty', () => generator.generateLinearSystemSet({ seed: 'x', difficulty: 'beginner' }));
    await assertThrowsAsync('invalid solutionType', () => generator.generateLinearSystemSet({ seed: 'x', solutionType: 'ranked' }));
    await assertThrowsAsync('invalid variables', () => generator.generateLinearSystemSet({ seed: 'x', variables: 4 }));
    await assertThrowsAsync('incomplete range', () => generator.generateLinearSystemSet({ seed: 'x', minValue: 0 }));
    await assertThrowsAsync('non-integer range', () => generator.generateLinearSystemSet({ seed: 'x', minValue: 0, maxValue: 1.5 }));
    await assertThrowsAsync('min greater than max', () => generator.generateLinearSystemSet({ seed: 'x', minValue: 5, maxValue: 4 }));
    await assertThrowsAsync('includeNegatives type', () => generator.generateLinearSystemSet({ seed: 'x', includeNegatives: 'false' }));
    await assertThrowsAsync('includeNegatives conflict', () => generator.generateLinearSystemSet({
        seed: 'x',
        minValue: -1,
        maxValue: 3,
        includeNegatives: false
    }));
    rows.push(['T13', 'invalid input validation rejects unsupported options', 'pass']);

    const originalRandom = Math.random;
    Math.random = function () {
        throw new Error('Math.random should not be called by generation.');
    };
    try {
        await generator.generateLinearSystemSet({ seed: 'no-runtime-random-system', count: 1, difficulty: 'medium' });
    } finally {
        Math.random = originalRandom;
    }
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'practice', 'generators', 'linear-systems.js'), 'utf8');
    assert(!/\bdocument\b/.test(source));
    assert(!/\bMath\.random\b/.test(source));
    rows.push(['T14', 'module does not depend on DOM or Math.random', 'pass']);

    const parallelA = await Promise.all([
        generator.generateLinearSystemSet({ seed: 'parallel-system-a', count: 2, difficulty: 'medium' }),
        generator.generateLinearSystemSet({ seed: 'parallel-system-b', count: 2, difficulty: 'hard' })
    ]);
    const parallelB = await Promise.all([
        generator.generateLinearSystemSet({ seed: 'parallel-system-a', count: 2, difficulty: 'medium' }),
        generator.generateLinearSystemSet({ seed: 'parallel-system-b', count: 2, difficulty: 'hard' })
    ]);
    assert.deepStrictEqual(parallelA, parallelB);
    rows.push(['T15', 'Promise.all parallel generation is deterministic', 'pass']);

    return {
        rows,
        sample: {
            unique: sameA.problems[0],
            none: noneSet.problems[0],
            infinite: infiniteSet.problems[0]
        }
    };
}

runTests().then(({ rows, sample }) => {
    rows.forEach(([id, name, status]) => {
        console.log(`${id} ${status} - ${name}`);
    });

    console.log('Fixed seed samples:');
    console.log(`Unique Problem System: ${JSON.stringify(sample.unique.inputs.augmentedMatrix)}`);
    console.log(`Unique Problem RREF: ${JSON.stringify(sample.unique.exactAnswer.rrefMatrix)}`);
    console.log(`Unique Problem Solution: ${JSON.stringify(sample.unique.exactAnswer.solution)}`);
    console.log(`No Solution Problem System: ${JSON.stringify(sample.none.inputs.augmentedMatrix)}`);
    console.log(`No Solution Problem RREF: ${JSON.stringify(sample.none.exactAnswer.rrefMatrix)}`);
    console.log(`Infinite Solutions Problem System: ${JSON.stringify(sample.infinite.inputs.augmentedMatrix)}`);
    console.log(`Infinite Solutions Problem RREF: ${JSON.stringify(sample.infinite.exactAnswer.rrefMatrix)}`);
    console.log('All practice linear system tests passed.');
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
