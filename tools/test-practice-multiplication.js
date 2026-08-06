'use strict';

const assert = require('assert');
const path = require('path');

const generatorPath = path.join('..', 'js', 'practice', 'generators', 'multiplication.js');
const generator = require(generatorPath);

function assertThrows(name, fn) {
    assert.throws(fn, Error, name);
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

function shape(matrix) {
    return [matrix.length, matrix[0].length];
}

function assertMatrixInRange(matrix, minValue, maxValue) {
    flatten(matrix).forEach((value) => {
        assert(Number.isInteger(value));
        assert(value >= minValue, `${value} < ${minValue}`);
        assert(value <= maxValue, `${value} > ${maxValue}`);
    });
}

function multiply(A, B) {
    const result = [];
    for (let r = 0; r < A.length; r++) {
        const row = [];
        for (let c = 0; c < B[0].length; c++) {
            let sum = 0;
            for (let k = 0; k < A[0].length; k++) {
                sum += A[r][k] * B[k][c];
            }
            row.push(sum);
        }
        result.push(row);
    }
    return result;
}

function assertAnswer(problem) {
    assert.deepStrictEqual(
        problem.exactAnswer.matrix,
        multiply(problem.inputs.matrixA, problem.inputs.matrixB),
        problem.id
    );
}

function assertDimensions(problem) {
    const d = problem.dimensions;
    assert.deepStrictEqual(shape(problem.inputs.matrixA), [d.rowsA, d.colsA]);
    assert.deepStrictEqual(shape(problem.inputs.matrixB), [d.rowsB, d.colsB]);
    assert.strictEqual(d.rowsB, d.colsA);
    assert.deepStrictEqual(shape(problem.exactAnswer.matrix), [d.resultRows, d.resultCols]);
    assert.strictEqual(d.resultRows, d.rowsA);
    assert.strictEqual(d.resultCols, d.colsB);
}

function assertSteps(problem) {
    const A = problem.inputs.matrixA;
    const B = problem.inputs.matrixB;
    const C = problem.exactAnswer.matrix;
    const d = problem.dimensions;

    assert.strictEqual(problem.steps.length, d.rowsA * d.colsB);
    problem.steps.forEach((step, stepIndex) => {
        const row = Math.floor(stepIndex / d.colsB);
        const column = stepIndex % d.colsB;
        assert.strictEqual(step.kind, 'dot-product');
        assert.strictEqual(step.row, row);
        assert.strictEqual(step.column, column);
        assert.strictEqual(step.terms.length, d.colsA);

        let sum = 0;
        step.terms.forEach((term, termIndex) => {
            assert.strictEqual(term.index, termIndex);
            assert.strictEqual(term.leftValue, A[row][termIndex]);
            assert.strictEqual(term.rightValue, B[termIndex][column]);
            assert.strictEqual(term.product, term.leftValue * term.rightValue);
            sum += term.product;
        });

        assert.strictEqual(step.result, sum);
        assert.strictEqual(step.result, C[row][column]);
    });
}

function problemSummary(problem) {
    return {
        id: problem.id,
        matrixA: problem.inputs.matrixA,
        matrixB: problem.inputs.matrixB,
        exactAnswer: problem.exactAnswer.matrix,
        dimensions: problem.dimensions,
        firstStep: problem.steps[0],
        lastStep: problem.steps[problem.steps.length - 1]
    };
}

function assertDefaultQuality(problem) {
    assert(countNonZero(problem.inputs.matrixA) >= 2);
    assert(countNonZero(problem.inputs.matrixB) >= 2);
    assert(countNonZero(problem.exactAnswer.matrix) >= 2);
    assert(!hasZeroRow(problem.inputs.matrixA));
    assert(!hasZeroColumn(problem.inputs.matrixB));
    assert(!allCellsSame(problem.inputs.matrixA));
    assert(!allCellsSame(problem.inputs.matrixB));
    assert(!allCellsSame(problem.exactAnswer.matrix));
}

function runTests() {
    const rows = [];
    const baseOptions = {
        seed: 'matrixcalcu-multiply-v1',
        count: 3,
        difficulty: 'medium'
    };

    const setA = generator.generateMultiplicationSet(baseOptions);
    const setB = generator.generateMultiplicationSet(baseOptions);
    assert.deepStrictEqual(setA, setB);
    rows.push(['T01', 'same seed and settings produce identical sets', 'pass']);

    const differentSeed = generator.generateMultiplicationSet(Object.assign({}, baseOptions, { seed: 'matrixcalcu-multiply-v1b' }));
    assert.notDeepStrictEqual(setA, differentSeed);
    rows.push(['T02', 'different seeds usually generate different sets', 'pass']);

    const expectedGolden = [
        {
            id: 'practice-multiplication-3535903094-medium-2x3x2-5-5-true-1',
            matrixA: [[1, 2, 2], [3, 3, 3]],
            matrixB: [[-4, 0], [-4, 1], [-1, -3]],
            exactAnswer: [[-14, -4], [-27, -6]],
            dimensions: {
                rowsA: 2,
                colsA: 3,
                rowsB: 3,
                colsB: 2,
                resultRows: 2,
                resultCols: 2
            },
            firstStep: {
                kind: 'dot-product',
                row: 0,
                column: 0,
                terms: [
                    { index: 0, leftValue: 1, rightValue: -4, product: -4 },
                    { index: 1, leftValue: 2, rightValue: -4, product: -8 },
                    { index: 2, leftValue: 2, rightValue: -1, product: -2 }
                ],
                result: -14
            },
            lastStep: {
                kind: 'dot-product',
                row: 1,
                column: 1,
                terms: [
                    { index: 0, leftValue: 3, rightValue: 0, product: 0 },
                    { index: 1, leftValue: 3, rightValue: 1, product: 3 },
                    { index: 2, leftValue: 3, rightValue: -3, product: -9 }
                ],
                result: -6
            }
        },
        {
            id: 'practice-multiplication-3535903094-medium-2x3x2-5-5-true-2',
            matrixA: [[3, 4, -4], [4, 4, 2]],
            matrixB: [[0, -3], [-2, -3], [-1, -3]],
            exactAnswer: [[-4, -9], [-10, -30]],
            dimensions: {
                rowsA: 2,
                colsA: 3,
                rowsB: 3,
                colsB: 2,
                resultRows: 2,
                resultCols: 2
            },
            firstStep: {
                kind: 'dot-product',
                row: 0,
                column: 0,
                terms: [
                    { index: 0, leftValue: 3, rightValue: 0, product: 0 },
                    { index: 1, leftValue: 4, rightValue: -2, product: -8 },
                    { index: 2, leftValue: -4, rightValue: -1, product: 4 }
                ],
                result: -4
            },
            lastStep: {
                kind: 'dot-product',
                row: 1,
                column: 1,
                terms: [
                    { index: 0, leftValue: 4, rightValue: -3, product: -12 },
                    { index: 1, leftValue: 4, rightValue: -3, product: -12 },
                    { index: 2, leftValue: 2, rightValue: -3, product: -6 }
                ],
                result: -30
            }
        },
        {
            id: 'practice-multiplication-3535903094-medium-2x3x2-5-5-true-3',
            matrixA: [[5, 5, 2], [-2, 3, -4]],
            matrixB: [[-5, 1], [5, -4], [3, -3]],
            exactAnswer: [[6, -21], [13, -2]],
            dimensions: {
                rowsA: 2,
                colsA: 3,
                rowsB: 3,
                colsB: 2,
                resultRows: 2,
                resultCols: 2
            },
            firstStep: {
                kind: 'dot-product',
                row: 0,
                column: 0,
                terms: [
                    { index: 0, leftValue: 5, rightValue: -5, product: -25 },
                    { index: 1, leftValue: 5, rightValue: 5, product: 25 },
                    { index: 2, leftValue: 2, rightValue: 3, product: 6 }
                ],
                result: 6
            },
            lastStep: {
                kind: 'dot-product',
                row: 1,
                column: 1,
                terms: [
                    { index: 0, leftValue: -2, rightValue: 1, product: -2 },
                    { index: 1, leftValue: 3, rightValue: -4, product: -12 },
                    { index: 2, leftValue: -4, rightValue: -3, product: 12 }
                ],
                result: -2
            }
        }
    ];
    assert.deepStrictEqual(setA.problems.slice(0, 3).map(problemSummary), expectedGolden);
    rows.push(['T03', 'golden fixture for fixed medium seed', 'pass']);

    assert.strictEqual(setA.problems.length, 3);
    assert.strictEqual(generator.generateMultiplicationSet(Object.assign({}, baseOptions, { count: 1 })).problems.length, 1);
    rows.push(['T04', 'count controls problem count', 'pass']);

    const ids = setA.problems.map((problem) => problem.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    assert.deepStrictEqual(ids, generator.generateMultiplicationSet(baseOptions).problems.map((problem) => problem.id));
    rows.push(['T05', 'problem IDs are unique, stable, and repeatable', 'pass']);

    const indexSet = generator.generateMultiplicationSet(Object.assign({}, baseOptions, { count: 3 }));
    const index0 = generator.generateMultiplicationProblem(Object.assign({}, baseOptions, { index: 0 }));
    const index1 = generator.generateMultiplicationProblem(Object.assign({}, baseOptions, { index: 1 }));
    assert.deepStrictEqual(problemSummary(index0), problemSummary(indexSet.problems[0]));
    assert.deepStrictEqual(problemSummary(index1), problemSummary(indexSet.problems[1]));
    assert.strictEqual(indexSet.problems[0].id.endsWith('-1'), true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(indexSet.problems[0], 'printNumber'), false);
    rows.push(['T06', 'generator passes zero-based problem index and keeps print numbering separate', 'pass']);

    setA.problems.forEach((problem) => {
        assert.strictEqual(problem.type, 'multiplication');
        assert.strictEqual(problem.subtype, null);
        assert.strictEqual(problem.solutionType, null);
        assertDimensions(problem);
        assertAnswer(problem);
        assertSteps(problem);
        assert.notStrictEqual(problem.exactAnswer.matrix, problem.inputs.matrixA);
        assert.notStrictEqual(problem.exactAnswer.matrix, problem.inputs.matrixB);
    });
    rows.push(['T07', 'problem type, subtype, compatibility, answers, and steps are valid', 'pass']);

    const easy = generator.generateMultiplicationSet({ seed: 'easy-default', count: 5, difficulty: 'easy' });
    assert.strictEqual(easy.settings.minValue, 0);
    assert.strictEqual(easy.settings.maxValue, 5);
    assert.strictEqual(easy.settings.includeNegatives, false);
    easy.problems.forEach((problem) => {
        assert.deepStrictEqual(problem.dimensions, {
            rowsA: 2,
            colsA: 2,
            rowsB: 2,
            colsB: 2,
            resultRows: 2,
            resultCols: 2
        });
        assertMatrixInRange(problem.inputs.matrixA, 0, 5);
        assertMatrixInRange(problem.inputs.matrixB, 0, 5);
        assertDefaultQuality(problem);
    });
    ['easy-default', 'easy-range-a', 'easy-range-b', 'easy-range-c'].forEach((seed) => {
        const set = generator.generateMultiplicationSet({ seed, count: 3, difficulty: 'easy' });
        set.problems.forEach((problem) => {
            assertMatrixInRange(problem.inputs.matrixA, 0, 5);
            assertMatrixInRange(problem.inputs.matrixB, 0, 5);
        });
    });
    rows.push(['T08', 'easy defaults are 2x2 by 2x2, 0..5, nonnegative, and quality guarded', 'pass']);

    const medium = generator.generateMultiplicationSet({ seed: 'medium-default', count: 10, difficulty: 'medium' });
    medium.problems.forEach((problem) => {
        assert(['2x3x2', '3x2x3'].includes(`${problem.dimensions.rowsA}x${problem.dimensions.colsA}x${problem.dimensions.colsB}`));
        assertMatrixInRange(problem.inputs.matrixA, -5, 5);
        assertMatrixInRange(problem.inputs.matrixB, -5, 5);
        assertDefaultQuality(problem);
    });
    rows.push(['T09', 'medium defaults use approved shapes and -5..5 range', 'pass']);

    const mediumShapeSeeds = ['matrixcalcu-multiply-v1', 'medium-default'];
    const mediumShapes = mediumShapeSeeds.map((seed) => {
        const problem = generator.generateMultiplicationSet({ seed, count: 1, difficulty: 'medium' }).problems[0];
        return `${problem.dimensions.rowsA}x${problem.dimensions.colsA}x${problem.dimensions.colsB}`;
    });
    assert(mediumShapes.includes('2x3x2'));
    assert(mediumShapes.includes('3x2x3'));
    rows.push(['T09b', 'fixed medium seed sample reaches both approved shapes', 'pass']);

    const hard = generator.generateMultiplicationSet({ seed: 'hard-default', count: 3, difficulty: 'hard' });
    hard.problems.forEach((problem) => {
        assert.deepStrictEqual(problem.dimensions, {
            rowsA: 3,
            colsA: 3,
            rowsB: 3,
            colsB: 3,
            resultRows: 3,
            resultCols: 3
        });
        assertMatrixInRange(problem.inputs.matrixA, -7, 7);
        assertMatrixInRange(problem.inputs.matrixB, -7, 7);
    });
    rows.push(['T10', 'hard defaults are 3x3 by 3x3 with -7..7 range', 'pass']);

    const explicitSize = generator.generateMultiplicationSet({
        seed: 'explicit-size',
        count: 2,
        difficulty: 'easy',
        rowsA: 2,
        colsA: 3,
        colsB: 3
    });
    explicitSize.problems.forEach((problem) => {
        assert.deepStrictEqual(problem.dimensions, {
            rowsA: 2,
            colsA: 3,
            rowsB: 3,
            colsB: 3,
            resultRows: 2,
            resultCols: 3
        });
    });
    rows.push(['T11', 'explicit dimensions override difficulty preset and remain compatible', 'pass']);

    [[2, 2, 2], [2, 2, 3], [2, 3, 2], [2, 3, 3], [3, 2, 2], [3, 2, 3], [3, 3, 2], [3, 3, 3]].forEach(([rowsA, colsA, colsB], index) => {
        const set = generator.generateMultiplicationSet({
            seed: `size-combo-${index}`,
            count: 1,
            difficulty: 'easy',
            rowsA,
            colsA,
            colsB
        });
        assert.strictEqual(set.problems[0].dimensions.rowsA, rowsA);
        assert.strictEqual(set.problems[0].dimensions.colsA, colsA);
        assert.strictEqual(set.problems[0].dimensions.rowsB, colsA);
        assert.strictEqual(set.problems[0].dimensions.colsB, colsB);
        assertAnswer(set.problems[0]);
    });
    rows.push(['T12', 'all allowed dimension combinations can be generated', 'pass']);

    const explicitRange = generator.generateMultiplicationSet({
        seed: 'explicit-range',
        count: 2,
        difficulty: 'easy',
        minValue: 2,
        maxValue: 4,
        includeNegatives: false
    });
    explicitRange.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, 2, 4);
        assertMatrixInRange(problem.inputs.matrixB, 2, 4);
    });
    rows.push(['T13', 'explicit value range is honored', 'pass']);

    const easyWideRange = generator.generateMultiplicationSet({
        seed: 'easy-wide-range',
        count: 3,
        difficulty: 'easy',
        minValue: 0,
        maxValue: 9,
        includeNegatives: false
    });
    assert.strictEqual(easyWideRange.settings.minValue, 0);
    assert.strictEqual(easyWideRange.settings.maxValue, 9);
    easyWideRange.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, 0, 9);
        assertMatrixInRange(problem.inputs.matrixB, 0, 9);
    });
    rows.push(['T13b', 'easy explicit 0..9 value range override remains allowed', 'pass']);

    const five = generator.generateMultiplicationSet(Object.assign({}, baseOptions, { count: 5 }));
    const ten = generator.generateMultiplicationSet(Object.assign({}, baseOptions, { count: 10 }));
    assert.deepStrictEqual(ten.problems.slice(0, 5), five.problems);
    rows.push(['T14', 'increasing count preserves existing prefix problems', 'pass']);

    const settingsInput = {
        seed: 'settings-stable',
        count: 2,
        difficulty: 'easy',
        rowsA: 2,
        colsA: 3,
        colsB: 2,
        minValue: 1,
        maxValue: 3,
        includeNegatives: false
    };
    const settingsBefore = Object.assign({}, settingsInput);
    const settingsSet = generator.generateMultiplicationSet(settingsInput);
    assert.deepStrictEqual(settingsInput, settingsBefore);
    assert.deepStrictEqual(settingsSet.settings, {
        seed: settingsSet.seed,
        count: 2,
        difficulty: 'easy',
        rowsA: 2,
        colsA: 3,
        colsB: 2,
        minValue: 1,
        maxValue: 3,
        includeNegatives: false
    });
    assert.notStrictEqual(settingsSet.settings, settingsInput);
    rows.push(['T15', 'settings input is not mutated and set stores flat resolved snapshot', 'pass']);

    const narrowZero = generator.generateMultiplicationSet({
        seed: 'narrow-zero',
        count: 2,
        difficulty: 'easy',
        minValue: 0,
        maxValue: 0,
        includeNegatives: false
    });
    narrowZero.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, 0, 0);
        assertMatrixInRange(problem.inputs.matrixB, 0, 0);
        assertAnswer(problem);
        assertSteps(problem);
    });
    const narrowOne = generator.generateMultiplicationSet({
        seed: 'narrow-one',
        count: 2,
        difficulty: 'easy',
        minValue: 1,
        maxValue: 1,
        includeNegatives: false
    });
    narrowOne.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, 1, 1);
        assertMatrixInRange(problem.inputs.matrixB, 1, 1);
        assertAnswer(problem);
    });
    rows.push(['T16', 'extremely narrow legal ranges complete without infinite loops', 'pass']);

    assertThrows('missing seed', () => generator.generateMultiplicationSet({ count: 1 }));
    assertThrows('invalid count type', () => generator.generateMultiplicationSet({ seed: 'x', count: 1.5 }));
    assertThrows('invalid count range', () => generator.generateMultiplicationSet({ seed: 'x', count: 11 }));
    assertThrows('invalid difficulty', () => generator.generateMultiplicationSet({ seed: 'x', difficulty: 'beginner' }));
    assertThrows('incomplete dimensions', () => generator.generateMultiplicationSet({ seed: 'x', rowsA: 2 }));
    assertThrows('invalid dimension type', () => generator.generateMultiplicationSet({ seed: 'x', rowsA: 2, colsA: 2, colsB: 2.5 }));
    assertThrows('unsupported dimension', () => generator.generateMultiplicationSet({ seed: 'x', rowsA: 4, colsA: 2, colsB: 2 }));
    assertThrows('incomplete range', () => generator.generateMultiplicationSet({ seed: 'x', minValue: 0 }));
    assertThrows('non-integer range', () => generator.generateMultiplicationSet({ seed: 'x', minValue: 0, maxValue: 1.5 }));
    assertThrows('min greater than max', () => generator.generateMultiplicationSet({ seed: 'x', minValue: 5, maxValue: 4 }));
    assertThrows('includeNegatives type', () => generator.generateMultiplicationSet({ seed: 'x', includeNegatives: 'false' }));
    assertThrows('includeNegatives range conflict', () => generator.generateMultiplicationSet({
        seed: 'x',
        minValue: -1,
        maxValue: 3,
        includeNegatives: false
    }));
    rows.push(['T17', 'invalid input validation rejects unsupported options', 'pass']);

    const originalRandom = Math.random;
    Math.random = function () {
        throw new Error('Math.random should not be called by generation.');
    };
    try {
        generator.generateMultiplicationSet({
            seed: 'no-runtime-random',
            count: 2,
            difficulty: 'easy'
        });
    } finally {
        Math.random = originalRandom;
    }
    rows.push(['T18', 'generation path does not call Math.random', 'pass']);

    const source = require('fs').readFileSync(path.join(__dirname, '..', 'js', 'practice', 'generators', 'multiplication.js'), 'utf8');
    assert(!/\bdocument\b/.test(source));
    assert(!/\bMath\.random\b/.test(source));
    rows.push(['T19', 'module source does not depend on DOM or Math.random', 'pass']);

    return { rows, sample: setA };
}

const { rows, sample } = runTests();
rows.forEach(([id, name, status]) => {
    console.log(`${id} ${status} - ${name}`);
});

console.log('Fixed seed sample:');
sample.problems.slice(0, 3).forEach((problem, index) => {
    const first = problem.steps[0];
    console.log(`Problem ${index + 1}`);
    console.log(`A (${problem.dimensions.rowsA}x${problem.dimensions.colsA}): ${JSON.stringify(problem.inputs.matrixA)}`);
    console.log(`B (${problem.dimensions.rowsB}x${problem.dimensions.colsB}): ${JSON.stringify(problem.inputs.matrixB)}`);
    console.log(`Answer (${problem.dimensions.resultRows}x${problem.dimensions.resultCols}): ${JSON.stringify(problem.exactAnswer.matrix)}`);
    console.log(`First cell: ${JSON.stringify(first)}`);
});

console.log('All practice multiplication tests passed.');
