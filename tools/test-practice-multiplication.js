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

function matrixKey(matrix) {
    return JSON.stringify(matrix);
}

function countCellDifferences(left, right) {
    let differences = 0;
    for (let index = 0; index < left.length; index++) {
        if (left[index] !== right[index]) differences++;
    }
    return differences;
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

function getColumn(matrix, column) {
    return matrix.map((row) => row[column]);
}

function hasRepeatedRows(matrix) {
    const seen = new Set();
    for (let r = 0; r < matrix.length; r++) {
        const key = JSON.stringify(matrix[r]);
        if (seen.has(key)) return true;
        seen.add(key);
    }
    return false;
}

function hasRepeatedColumns(matrix) {
    const seen = new Set();
    for (let c = 0; c < matrix[0].length; c++) {
        const key = JSON.stringify(getColumn(matrix, c));
        if (seen.has(key)) return true;
        seen.add(key);
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

function countNonZeroProductsForCell(A, B, row, column) {
    let count = 0;
    for (let k = 0; k < A[0].length; k++) {
        if (A[row][k] * B[k][column] !== 0) count++;
    }
    return count;
}

function assertDotProductWork(problem) {
    const A = problem.inputs.matrixA;
    const B = problem.inputs.matrixB;
    for (let r = 0; r < A.length; r++) {
        for (let c = 0; c < B[0].length; c++) {
            assert(
                countNonZeroProductsForCell(A, B, r, c) >= 2,
                `${problem.id} cell ${r},${c} has too few nonzero products`
            );
        }
    }
}

function assertExactDotProductWork(problem, expectedCount) {
    const A = problem.inputs.matrixA;
    const B = problem.inputs.matrixB;
    for (let r = 0; r < A.length; r++) {
        for (let c = 0; c < B[0].length; c++) {
            assert.strictEqual(
                countNonZeroProductsForCell(A, B, r, c),
                expectedCount,
                `${problem.id} cell ${r},${c} has unexpected nonzero product count`
            );
        }
    }
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
    assert(!hasZeroColumn(problem.inputs.matrixA));
    assert(!hasZeroRow(problem.inputs.matrixB));
    assert(!hasRepeatedRows(problem.inputs.matrixA));
    assert(!hasRepeatedColumns(problem.inputs.matrixA));
    assert(!hasRepeatedRows(problem.inputs.matrixB));
    assert(!hasRepeatedColumns(problem.inputs.matrixB));
    assertDotProductWork(problem);
}

function assertUiEasyQuality(problem) {
    assertMatrixInRange(problem.inputs.matrixA, 0, 5);
    assertMatrixInRange(problem.inputs.matrixB, 0, 5);
    assertExactDotProductWork(problem, 2);
    assert(!hasRepeatedRows(problem.inputs.matrixA), `${problem.id} has repeated A rows`);
    assert(!hasRepeatedColumns(problem.inputs.matrixA), `${problem.id} has repeated A columns`);
    assert(!hasRepeatedRows(problem.inputs.matrixB), `${problem.id} has repeated B rows`);
    assert(!hasRepeatedColumns(problem.inputs.matrixB), `${problem.id} has repeated B columns`);
    assert(countNonZero(problem.exactAnswer.matrix) >= 2);
    assertAnswer(problem);
    assertSteps(problem);
}

function assertSetDiversity(set) {
    const seenA = new Set();
    const seenB = new Set();
    const seenCombos = new Set();
    let previousInput = null;

    set.problems.forEach((problem) => {
        const A = problem.inputs.matrixA;
        const B = problem.inputs.matrixB;
        const keyA = matrixKey(A);
        const keyB = matrixKey(B);
        const comboKey = `${keyA}|${keyB}`;

        assert(!seenA.has(keyA), `repeated matrixA: ${problem.id}`);
        assert(!seenB.has(keyB), `repeated matrixB: ${problem.id}`);
        assert(!seenCombos.has(comboKey), `repeated matrixA/matrixB combo: ${problem.id}`);

        const input = flatten(A).concat(flatten(B));
        if (previousInput && input.length === previousInput.length) {
            const requiredDifferences = Math.max(2, Math.ceil(input.length * 0.25));
            assert(
                countCellDifferences(input, previousInput) >= requiredDifferences,
                `adjacent problem is too similar: ${problem.id}`
            );
        }

        seenA.add(keyA);
        seenB.add(keyB);
        seenCombos.add(comboKey);
        previousInput = input;
    });
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
            matrixA: [[0, -2, -2], [-5, 5, 1]],
            matrixB: [[5, 2], [2, -5], [1, 4]],
            exactAnswer: [[-6, 2], [-14, -31]],
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
                    { index: 0, leftValue: 0, rightValue: 5, product: 0 },
                    { index: 1, leftValue: -2, rightValue: 2, product: -4 },
                    { index: 2, leftValue: -2, rightValue: 1, product: -2 }
                ],
                result: -6
            },
            lastStep: {
                kind: 'dot-product',
                row: 1,
                column: 1,
                terms: [
                    { index: 0, leftValue: -5, rightValue: 2, product: -10 },
                    { index: 1, leftValue: 5, rightValue: -5, product: -25 },
                    { index: 2, leftValue: 1, rightValue: 4, product: 4 }
                ],
                result: -31
            }
        },
        {
            id: 'practice-multiplication-3535903094-medium-2x3x2-5-5-true-2',
            matrixA: [[3, 1, 1], [-3, 5, -2]],
            matrixB: [[-5, 5], [-2, -1], [0, 4]],
            exactAnswer: [[-17, 18], [5, -28]],
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
                    { index: 0, leftValue: 3, rightValue: -5, product: -15 },
                    { index: 1, leftValue: 1, rightValue: -2, product: -2 },
                    { index: 2, leftValue: 1, rightValue: 0, product: 0 }
                ],
                result: -17
            },
            lastStep: {
                kind: 'dot-product',
                row: 1,
                column: 1,
                terms: [
                    { index: 0, leftValue: -3, rightValue: 5, product: -15 },
                    { index: 1, leftValue: 5, rightValue: -1, product: -5 },
                    { index: 2, leftValue: -2, rightValue: 4, product: -8 }
                ],
                result: -28
            }
        },
        {
            id: 'practice-multiplication-3535903094-medium-2x3x2-5-5-true-3',
            matrixA: [[-4, 1, -1], [5, 5, 3]],
            matrixB: [[-3, 5], [5, -1], [-3, -4]],
            exactAnswer: [[20, -17], [1, 8]],
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
                    { index: 0, leftValue: -4, rightValue: -3, product: 12 },
                    { index: 1, leftValue: 1, rightValue: 5, product: 5 },
                    { index: 2, leftValue: -1, rightValue: -3, product: 3 }
                ],
                result: 20
            },
            lastStep: {
                kind: 'dot-product',
                row: 1,
                column: 1,
                terms: [
                    { index: 0, leftValue: 5, rightValue: 5, product: 25 },
                    { index: 1, leftValue: 5, rightValue: -1, product: -5 },
                    { index: 2, leftValue: 3, rightValue: -4, product: -12 }
                ],
                result: 8
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
    assertSetDiversity(easy);
    ['easy-default', 'easy-range-a', 'easy-range-b', 'easy-range-c'].forEach((seed) => {
        const set = generator.generateMultiplicationSet({ seed, count: 3, difficulty: 'easy' });
        set.problems.forEach((problem) => {
            assertMatrixInRange(problem.inputs.matrixA, 0, 5);
            assertMatrixInRange(problem.inputs.matrixB, 0, 5);
            assertDotProductWork(problem);
        });
    });
    rows.push(['T08', 'easy defaults are 2x2 by 2x2, 0..5, nonnegative, and quality guarded', 'pass']);

    const worksheetFixture = generator.generateMultiplicationSet({
        seed: 'worksheet-multiplication-quality-v1',
        count: 6,
        difficulty: 'easy',
        rowsA: 2,
        colsA: 2,
        colsB: 2,
        minValue: 0,
        maxValue: 5,
        includeNegatives: false
    });
    const expectedWorksheetFixture = [
        {
            id: 'practice-multiplication-2808065287-easy-2x2x2-0-5-false-1',
            matrixA: [[3, 3], [5, 2]],
            matrixB: [[2, 3], [4, 5]],
            exactAnswer: [[18, 24], [18, 25]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-2808065287-easy-2x2x2-0-5-false-2',
            matrixA: [[4, 2], [5, 3]],
            matrixB: [[5, 1], [3, 1]],
            exactAnswer: [[26, 6], [34, 8]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-2808065287-easy-2x2x2-0-5-false-3',
            matrixA: [[3, 2], [2, 2]],
            matrixB: [[2, 1], [3, 2]],
            exactAnswer: [[12, 7], [10, 6]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-2808065287-easy-2x2x2-0-5-false-4',
            matrixA: [[2, 5], [1, 4]],
            matrixB: [[1, 4], [5, 2]],
            exactAnswer: [[27, 18], [21, 12]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-2808065287-easy-2x2x2-0-5-false-5',
            matrixA: [[1, 1], [3, 4]],
            matrixB: [[3, 4], [2, 1]],
            exactAnswer: [[5, 5], [17, 16]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-2808065287-easy-2x2x2-0-5-false-6',
            matrixA: [[3, 5], [2, 4]],
            matrixB: [[1, 4], [4, 5]],
            exactAnswer: [[23, 37], [18, 28]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        }
    ];
    assert.deepStrictEqual(
        worksheetFixture.problems.map((problem) => ({
            id: problem.id,
            matrixA: problem.inputs.matrixA,
            matrixB: problem.inputs.matrixB,
            exactAnswer: problem.exactAnswer.matrix,
            nonzeroProductCounts: problem.inputs.matrixA.map((row, r) => problem.inputs.matrixB[0].map((_, c) => {
                return countNonZeroProductsForCell(problem.inputs.matrixA, problem.inputs.matrixB, r, c);
            }))
        })),
        expectedWorksheetFixture
    );
    worksheetFixture.problems.forEach((problem) => {
        assertDefaultQuality(problem);
        assertAnswer(problem);
        assertSteps(problem);
    });
    assertSetDiversity(worksheetFixture);
    rows.push(['T08a', 'fixed easy worksheet fixture keeps full dot-product work and set diversity', 'pass']);

    const uiOptions = {
        seed: 'ui-multiplication-quality-v2',
        count: 6,
        difficulty: 'easy',
        rowsA: 2,
        colsA: 2,
        colsB: 2,
        minValue: 0,
        maxValue: 5,
        includeNegatives: false
    };
    const uiSet = generator.generateMultiplicationSet(uiOptions);
    const expectedUiFixture = [
        {
            id: 'practice-multiplication-1560209232-easy-2x2x2-0-5-false-1',
            matrixA: [[3, 1], [5, 2]],
            matrixB: [[3, 2], [3, 1]],
            exactAnswer: [[12, 7], [21, 12]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-1560209232-easy-2x2x2-0-5-false-2',
            matrixA: [[1, 5], [4, 3]],
            matrixB: [[1, 1], [2, 5]],
            exactAnswer: [[11, 26], [10, 19]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-1560209232-easy-2x2x2-0-5-false-3',
            matrixA: [[2, 4], [5, 5]],
            matrixB: [[4, 4], [1, 4]],
            exactAnswer: [[12, 24], [25, 40]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-1560209232-easy-2x2x2-0-5-false-4',
            matrixA: [[4, 2], [2, 1]],
            matrixB: [[3, 5], [4, 3]],
            exactAnswer: [[20, 26], [10, 13]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-1560209232-easy-2x2x2-0-5-false-5',
            matrixA: [[1, 2], [2, 3]],
            matrixB: [[5, 3], [1, 5]],
            exactAnswer: [[7, 13], [13, 21]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        },
        {
            id: 'practice-multiplication-1560209232-easy-2x2x2-0-5-false-6',
            matrixA: [[1, 3], [1, 1]],
            matrixB: [[5, 2], [5, 3]],
            exactAnswer: [[20, 11], [10, 5]],
            nonzeroProductCounts: [[2, 2], [2, 2]]
        }
    ];
    assert.deepStrictEqual(
        uiSet.problems.map((problem) => ({
            id: problem.id,
            matrixA: problem.inputs.matrixA,
            matrixB: problem.inputs.matrixB,
            exactAnswer: problem.exactAnswer.matrix,
            nonzeroProductCounts: problem.inputs.matrixA.map((row, r) => problem.inputs.matrixB[0].map((_, c) => {
                return countNonZeroProductsForCell(problem.inputs.matrixA, problem.inputs.matrixB, r, c);
            }))
        })),
        expectedUiFixture
    );
    uiSet.problems.forEach(assertUiEasyQuality);
    assertSetDiversity(uiSet);
    const uiSetAgain = generator.generateMultiplicationSet(uiOptions);
    assert.deepStrictEqual(uiSet, uiSetAgain);
    const uiSetTen = generator.generateMultiplicationSet(Object.assign({}, uiOptions, { count: 10 }));
    assert.deepStrictEqual(uiSetTen.problems.slice(0, 6), uiSet.problems);
    [
        'ui-multiplication-quality-v2',
        'ui-multiplication-quality-v2-a',
        'ui-multiplication-quality-v2-b',
        'ui-multiplication-quality-v2-c',
        'ui-multiplication-quality-v2-d'
    ].forEach((seed) => {
        const fixedSeedSet = generator.generateMultiplicationSet(Object.assign({}, uiOptions, { seed }));
        fixedSeedSet.problems.forEach(assertUiEasyQuality);
        assertSetDiversity(fixedSeedSet);
        assert.deepStrictEqual(
            generator.generateMultiplicationSet(Object.assign({}, uiOptions, { seed })),
            fixedSeedSet
        );
    });
    rows.push(['T08b', 'full UI multiplication options enforce strict easy quality across fixed seeds', 'pass']);

    const medium = generator.generateMultiplicationSet({ seed: 'medium-default', count: 10, difficulty: 'medium' });
    medium.problems.forEach((problem) => {
        assert(['2x3x2', '3x2x3'].includes(`${problem.dimensions.rowsA}x${problem.dimensions.colsA}x${problem.dimensions.colsB}`));
        assertMatrixInRange(problem.inputs.matrixA, -5, 5);
        assertMatrixInRange(problem.inputs.matrixB, -5, 5);
        assertDefaultQuality(problem);
    });
    assertSetDiversity(medium);
    rows.push(['T09', 'medium defaults use approved shapes and -5..5 range', 'pass']);

    const innerThree = generator.generateMultiplicationSet({
        seed: 'inner-three-quality',
        count: 4,
        difficulty: 'easy',
        rowsA: 2,
        colsA: 3,
        colsB: 2
    });
    innerThree.problems.forEach((problem) => {
        assert.strictEqual(problem.dimensions.colsA, 3);
        assertDotProductWork(problem);
        assertAnswer(problem);
        assertSteps(problem);
    });
    assertSetDiversity(innerThree);
    rows.push(['T09a', 'inner dimension 3 problems have at least two nonzero products per dot product', 'pass']);

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
        assertDefaultQuality(problem);
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
        assertDotProductWork(problem);
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
    const narrowZeroOneA = generator.generateMultiplicationSet({
        seed: 'narrow-zero-one',
        count: 6,
        difficulty: 'easy',
        minValue: 0,
        maxValue: 1,
        includeNegatives: false
    });
    const narrowZeroOneB = generator.generateMultiplicationSet({
        seed: 'narrow-zero-one',
        count: 6,
        difficulty: 'easy',
        minValue: 0,
        maxValue: 1,
        includeNegatives: false
    });
    assert.deepStrictEqual(narrowZeroOneA, narrowZeroOneB);
    narrowZeroOneA.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, 0, 1);
        assertMatrixInRange(problem.inputs.matrixB, 0, 1);
        assertAnswer(problem);
        assertSteps(problem);
    });
    rows.push(['T16', 'extremely narrow legal ranges complete deterministically without infinite loops', 'pass']);

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
