'use strict';

const assert = require('assert');
const path = require('path');

const generator = require(path.join('..', 'js', 'practice', 'generators', 'addition-subtraction.js'));

function assertThrows(name, fn) {
    assert.throws(fn, Error, name);
}

function matrixShape(matrix) {
    return [matrix.length, matrix[0].length];
}

function flatten(matrix) {
    return matrix.reduce((items, row) => items.concat(row), []);
}

function matrixKey(matrix) {
    return JSON.stringify(matrix);
}

function assertMatrixInRange(matrix, minValue, maxValue) {
    flatten(matrix).forEach((value) => {
        assert(Number.isInteger(value));
        assert(value >= minValue, `${value} < ${minValue}`);
        assert(value <= maxValue, `${value} > ${maxValue}`);
    });
}

function assertAnswer(problem) {
    const A = problem.inputs.matrixA;
    const B = problem.inputs.matrixB;
    const C = problem.exactAnswer.matrix;
    for (let r = 0; r < A.length; r++) {
        for (let c = 0; c < A[r].length; c++) {
            const expected = problem.subtype === 'add'
                ? A[r][c] + B[r][c]
                : A[r][c] - B[r][c];
            assert.strictEqual(C[r][c], expected, `${problem.id} cell ${r},${c}`);
        }
    }
}

function assertSteps(problem) {
    const rows = problem.dimensions.rows;
    const cols = problem.dimensions.cols;
    assert.strictEqual(problem.steps.length, rows * cols);
    problem.steps.forEach((step, index) => {
        const row = Math.floor(index / cols);
        const column = index % cols;
        assert.strictEqual(step.kind, 'element-operation');
        assert.strictEqual(step.row, row);
        assert.strictEqual(step.column, column);
        assert.strictEqual(step.operator, problem.subtype);
        assert.strictEqual(step.leftValue, problem.inputs.matrixA[row][column]);
        assert.strictEqual(step.rightValue, problem.inputs.matrixB[row][column]);
        assert.strictEqual(step.result, problem.exactAnswer.matrix[row][column]);
    });
}

function assertNotAllZero(matrix, name) {
    assert(flatten(matrix).some((value) => value !== 0), `${name} should not be all zero`);
}

function countZeroRows(matrix) {
    return matrix.filter((row) => row.every((value) => value === 0)).length;
}

function countZeroColumns(matrix) {
    let count = 0;
    for (let c = 0; c < matrix[0].length; c++) {
        if (matrix.every((row) => row[c] === 0)) count++;
    }
    return count;
}

function assertNoZeroRowsOrColumns(matrix, name) {
    assert.strictEqual(countZeroRows(matrix), 0, `${name} has a zero row`);
    assert.strictEqual(countZeroColumns(matrix), 0, `${name} has a zero column`);
}

function countNonZero(matrix) {
    return flatten(matrix).filter((value) => value !== 0).length;
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

function assertSetDiversity(set) {
    const seenA = new Set();
    const seenB = new Set();
    const seenCombo = new Set();
    let previousInput = null;

    set.problems.forEach((problem) => {
        const A = problem.inputs.matrixA;
        const B = problem.inputs.matrixB;
        const keyA = matrixKey(A);
        const keyB = matrixKey(B);
        const comboKey = `${keyA}|${keyB}`;

        assert(!seenA.has(keyA), `repeated A: ${problem.id}`);
        assert(!seenB.has(keyB), `repeated B: ${problem.id}`);
        assert(!seenCombo.has(comboKey), `repeated A/B combo: ${problem.id}`);

        const input = flatten(A).concat(flatten(B));
        if (previousInput) {
            assert(
                input.some((value, index) => value !== previousInput[index]) &&
                input.filter((value, index) => value !== previousInput[index]).length >= 2,
                `adjacent problem too similar: ${problem.id}`
            );
        }

        seenA.add(keyA);
        seenB.add(keyB);
        seenCombo.add(comboKey);
        previousInput = input;
    });
}

function assertUiEasyQuality(problem) {
    assertMatrixInRange(problem.inputs.matrixA, 0, 5);
    assertMatrixInRange(problem.inputs.matrixB, 0, 5);
    assertNoZeroRowsOrColumns(problem.inputs.matrixA, 'matrixA');
    assertNoZeroRowsOrColumns(problem.inputs.matrixB, 'matrixB');
    assertNoZeroRowsOrColumns(problem.exactAnswer.matrix, 'answer');
    assertNotAllZero(problem.inputs.matrixA, 'matrixA');
    assertNotAllZero(problem.inputs.matrixB, 'matrixB');
    assertNotAllZero(problem.exactAnswer.matrix, 'answer');
    if (problem.subtype === 'subtract') {
        flatten(problem.exactAnswer.matrix).forEach((value) => assert(value >= 0));
    }
    assertAnswer(problem);
    assertSteps(problem);
}

function problemSummary(problem) {
    return {
        id: problem.id,
        subtype: problem.subtype,
        matrixA: problem.inputs.matrixA,
        matrixB: problem.inputs.matrixB,
        exactAnswer: problem.exactAnswer.matrix
    };
}

function runTests() {
    const rows = [];

    const baseOptions = {
        seed: 'matrixcalcu-addsub-v1',
        count: 3,
        operation: 'mixed',
        difficulty: 'easy'
    };

    const setA = generator.generateAdditionSubtractionSet(baseOptions);
    const setB = generator.generateAdditionSubtractionSet(baseOptions);
    assert.deepStrictEqual(setA, setB);
    rows.push(['T01', 'same seed and settings produce identical sets', 'pass']);

    const differentSeed = generator.generateAdditionSubtractionSet(Object.assign({}, baseOptions, { seed: 'matrixcalcu-addsub-v1b' }));
    assert.notDeepStrictEqual(setA, differentSeed);
    rows.push(['T02', 'different seeds usually generate different sets', 'pass']);

    const expectedGolden = [
        {
            id: 'practice-addition-subtraction-3831773707-mixed-easy-2x2-0-9-false-1',
            subtype: 'add',
            matrixA: [[5, 1], [3, 9]],
            matrixB: [[6, 2], [2, 3]],
            exactAnswer: [[11, 3], [5, 12]]
        },
        {
            id: 'practice-addition-subtraction-3831773707-mixed-easy-2x2-0-9-false-2',
            subtype: 'subtract',
            matrixA: [[3, 9], [5, 8]],
            matrixB: [[0, 9], [4, 6]],
            exactAnswer: [[3, 0], [1, 2]]
        },
        {
            id: 'practice-addition-subtraction-3831773707-mixed-easy-2x2-0-9-false-3',
            subtype: 'subtract',
            matrixA: [[6, 2], [9, 8]],
            matrixB: [[5, 0], [6, 2]],
            exactAnswer: [[1, 2], [3, 6]]
        }
    ];
    assert.deepStrictEqual(setA.problems.slice(0, 3).map(problemSummary), expectedGolden);
    rows.push(['T03', 'golden fixture for fixed easy mixed seed', 'pass']);

    assert.strictEqual(setA.problems.length, 3);
    assert.strictEqual(generator.generateAdditionSubtractionSet(Object.assign({}, baseOptions, { count: 1 })).problems.length, 1);
    rows.push(['T04', 'count controls problem count', 'pass']);

    const ids = setA.problems.map((problem) => problem.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    assert.deepStrictEqual(ids, generator.generateAdditionSubtractionSet(baseOptions).problems.map((problem) => problem.id));
    rows.push(['T05', 'problem IDs are unique and repeatable', 'pass']);

    setA.problems.forEach((problem) => {
        assert.strictEqual(problem.type, 'addition-subtraction');
        assert(['add', 'subtract'].includes(problem.subtype));
    });
    rows.push(['T06', 'type and subtype are valid', 'pass']);

    const mixedSubtypes = generator.generateAdditionSubtractionSet({
        seed: 'mixed-subtypes',
        count: 10,
        operation: 'mixed',
        difficulty: 'medium'
    }).problems.map((problem) => problem.subtype);
    assert(mixedSubtypes.every((subtype) => ['add', 'subtract'].includes(subtype)));
    rows.push(['T07', 'mixed operation deterministically generates legal subtypes', 'pass']);

    setA.problems.forEach((problem) => {
        assert.deepStrictEqual(matrixShape(problem.inputs.matrixA), [problem.dimensions.rows, problem.dimensions.cols]);
        assert.deepStrictEqual(matrixShape(problem.inputs.matrixB), [problem.dimensions.rows, problem.dimensions.cols]);
        assert.deepStrictEqual(matrixShape(problem.exactAnswer.matrix), [problem.dimensions.rows, problem.dimensions.cols]);
        assertAnswer(problem);
        assertSteps(problem);
        assertNotAllZero(problem.inputs.matrixA, 'matrixA');
        assertNotAllZero(problem.inputs.matrixB, 'matrixB');
        assertNotAllZero(problem.exactAnswer.matrix, 'answer');
        assertNoZeroRowsOrColumns(problem.inputs.matrixA, 'matrixA');
        assertNoZeroRowsOrColumns(problem.inputs.matrixB, 'matrixB');
        assertNoZeroRowsOrColumns(problem.exactAnswer.matrix, 'answer');
    });
    rows.push(['T08', 'matrix dimensions, exact answers, steps, and nonzero guards are valid', 'pass']);

    const addSet = generator.generateAdditionSubtractionSet({
        seed: 'add-only',
        count: 4,
        operation: 'add',
        difficulty: 'medium'
    });
    addSet.problems.forEach((problem) => {
        assert.strictEqual(problem.subtype, 'add');
        assertAnswer(problem);
    });
    rows.push(['T09', 'addition answers are cell-wise correct', 'pass']);

    const subtractSet = generator.generateAdditionSubtractionSet({
        seed: 'subtract-only',
        count: 4,
        operation: 'subtract',
        difficulty: 'medium'
    });
    subtractSet.problems.forEach((problem) => {
        assert.strictEqual(problem.subtype, 'subtract');
        assertAnswer(problem);
    });
    rows.push(['T10', 'subtraction answers are cell-wise correct', 'pass']);

    const easySubtract = generator.generateAdditionSubtractionSet({
        seed: 'easy-subtract',
        count: 5,
        operation: 'subtract',
        difficulty: 'easy'
    });
    easySubtract.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, 0, 9);
        assertMatrixInRange(problem.inputs.matrixB, 0, 9);
        flatten(problem.exactAnswer.matrix).forEach((value) => assert(value >= 0));
        assert(countNonZero(problem.inputs.matrixA) >= 2);
        assert(countNonZero(problem.inputs.matrixB) >= 2);
        assert(countNonZero(problem.exactAnswer.matrix) >= 2);
        assert(countDifferences(problem.inputs.matrixA, problem.inputs.matrixB) >= 2);
    });
    rows.push(['T11', 'easy default subtract inputs, differences, and answers meet quality rules', 'pass']);

    const easyMixed = generator.generateAdditionSubtractionSet({
        seed: 'easy-quality',
        count: 10,
        operation: 'mixed',
        difficulty: 'easy'
    });
    easyMixed.problems.forEach((problem) => {
        assert(countNonZero(problem.inputs.matrixA) >= 2);
        assert(countNonZero(problem.inputs.matrixB) >= 2);
        assert(countNonZero(problem.exactAnswer.matrix) >= 2);
        assertNoZeroRowsOrColumns(problem.inputs.matrixA, 'matrixA');
        assertNoZeroRowsOrColumns(problem.inputs.matrixB, 'matrixB');
        assertNoZeroRowsOrColumns(problem.exactAnswer.matrix, 'answer');
        if (problem.subtype === 'subtract') {
            assert(countDifferences(problem.inputs.matrixA, problem.inputs.matrixB) >= 2);
        }
    });
    assertSetDiversity(easyMixed);
    rows.push(['T12', 'default easy generated problems have at least two nonzero answer cells', 'pass']);

    const uiOptions = {
        seed: 'ui-addsub-quality-v2',
        count: 6,
        difficulty: 'easy',
        operation: 'mixed',
        rows: 2,
        cols: 2,
        minValue: 0,
        maxValue: 5,
        includeNegatives: false
    };
    const uiSet = generator.generateAdditionSubtractionSet(uiOptions);
    const expectedUiFixture = [
        {
            id: 'practice-addition-subtraction-1500445191-mixed-easy-2x2-0-5-false-1',
            subtype: 'add',
            matrixA: [[4, 3], [2, 5]],
            matrixB: [[3, 4], [1, 2]],
            exactAnswer: [[7, 7], [3, 7]],
            zeroRowsA: 0,
            zeroColsA: 0,
            zeroRowsB: 0,
            zeroColsB: 0,
            zeroRowsAnswer: 0,
            zeroColsAnswer: 0
        },
        {
            id: 'practice-addition-subtraction-1500445191-mixed-easy-2x2-0-5-false-2',
            subtype: 'subtract',
            matrixA: [[2, 2], [0, 5]],
            matrixB: [[1, 2], [0, 4]],
            exactAnswer: [[1, 0], [0, 1]],
            zeroRowsA: 0,
            zeroColsA: 0,
            zeroRowsB: 0,
            zeroColsB: 0,
            zeroRowsAnswer: 0,
            zeroColsAnswer: 0
        },
        {
            id: 'practice-addition-subtraction-1500445191-mixed-easy-2x2-0-5-false-3',
            subtype: 'add',
            matrixA: [[0, 5], [4, 1]],
            matrixB: [[5, 5], [2, 2]],
            exactAnswer: [[5, 10], [6, 3]],
            zeroRowsA: 0,
            zeroColsA: 0,
            zeroRowsB: 0,
            zeroColsB: 0,
            zeroRowsAnswer: 0,
            zeroColsAnswer: 0
        },
        {
            id: 'practice-addition-subtraction-1500445191-mixed-easy-2x2-0-5-false-4',
            subtype: 'subtract',
            matrixA: [[3, 2], [3, 5]],
            matrixB: [[1, 2], [0, 2]],
            exactAnswer: [[2, 0], [3, 3]],
            zeroRowsA: 0,
            zeroColsA: 0,
            zeroRowsB: 0,
            zeroColsB: 0,
            zeroRowsAnswer: 0,
            zeroColsAnswer: 0
        },
        {
            id: 'practice-addition-subtraction-1500445191-mixed-easy-2x2-0-5-false-5',
            subtype: 'add',
            matrixA: [[4, 0], [3, 3]],
            matrixB: [[0, 2], [1, 4]],
            exactAnswer: [[4, 2], [4, 7]],
            zeroRowsA: 0,
            zeroColsA: 0,
            zeroRowsB: 0,
            zeroColsB: 0,
            zeroRowsAnswer: 0,
            zeroColsAnswer: 0
        },
        {
            id: 'practice-addition-subtraction-1500445191-mixed-easy-2x2-0-5-false-6',
            subtype: 'add',
            matrixA: [[3, 0], [3, 5]],
            matrixB: [[5, 0], [0, 4]],
            exactAnswer: [[8, 0], [3, 9]],
            zeroRowsA: 0,
            zeroColsA: 0,
            zeroRowsB: 0,
            zeroColsB: 0,
            zeroRowsAnswer: 0,
            zeroColsAnswer: 0
        }
    ];
    assert.deepStrictEqual(
        uiSet.problems.map((problem) => ({
            id: problem.id,
            subtype: problem.subtype,
            matrixA: problem.inputs.matrixA,
            matrixB: problem.inputs.matrixB,
            exactAnswer: problem.exactAnswer.matrix,
            zeroRowsA: countZeroRows(problem.inputs.matrixA),
            zeroColsA: countZeroColumns(problem.inputs.matrixA),
            zeroRowsB: countZeroRows(problem.inputs.matrixB),
            zeroColsB: countZeroColumns(problem.inputs.matrixB),
            zeroRowsAnswer: countZeroRows(problem.exactAnswer.matrix),
            zeroColsAnswer: countZeroColumns(problem.exactAnswer.matrix)
        })),
        expectedUiFixture
    );
    uiSet.problems.forEach(assertUiEasyQuality);
    assertSetDiversity(uiSet);
    assert.deepStrictEqual(generator.generateAdditionSubtractionSet(uiOptions), uiSet);
    const uiSetTen = generator.generateAdditionSubtractionSet(Object.assign({}, uiOptions, { count: 10 }));
    assert.deepStrictEqual(uiSetTen.problems.slice(0, 6), uiSet.problems);
    rows.push(['T12a', 'full UI easy options avoid zero rows and columns while preserving deterministic sets', 'pass']);

    const medium = generator.generateAdditionSubtractionSet({
        seed: 'medium-range',
        count: 4,
        operation: 'mixed',
        difficulty: 'medium'
    });
    assert(['2x2', '2x3', '3x2'].includes(`${medium.settings.rows}x${medium.settings.cols}`));
    medium.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, -9, 9);
        assertMatrixInRange(problem.inputs.matrixB, -9, 9);
        assert(countNonZero(problem.exactAnswer.matrix) >= 2);
    });
    rows.push(['T13', 'medium preset dimensions, value range, and quality are valid', 'pass']);

    const hard = generator.generateAdditionSubtractionSet({
        seed: 'hard-range',
        count: 2,
        operation: 'mixed',
        difficulty: 'hard'
    });
    assert.strictEqual(hard.settings.rows, 3);
    assert.strictEqual(hard.settings.cols, 3);
    hard.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, -12, 12);
        assertMatrixInRange(problem.inputs.matrixB, -12, 12);
    });
    rows.push(['T14', 'hard preset is 3x3 with hard value range', 'pass']);

    const explicitSize = generator.generateAdditionSubtractionSet({
        seed: 'explicit-size',
        count: 2,
        operation: 'add',
        difficulty: 'easy',
        rows: 3,
        cols: 3
    });
    assert.strictEqual(explicitSize.settings.rows, 3);
    assert.strictEqual(explicitSize.settings.cols, 3);
    rows.push(['T15', 'explicit dimensions override difficulty preset', 'pass']);

    const explicitRange = generator.generateAdditionSubtractionSet({
        seed: 'explicit-range',
        count: 2,
        operation: 'add',
        difficulty: 'easy',
        minValue: 2,
        maxValue: 4,
        includeNegatives: false
    });
    explicitRange.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, 2, 4);
        assertMatrixInRange(problem.inputs.matrixB, 2, 4);
    });
    rows.push(['T16', 'explicit value range override is honored', 'pass']);

    const five = generator.generateAdditionSubtractionSet(Object.assign({}, baseOptions, { count: 5 }));
    const ten = generator.generateAdditionSubtractionSet(Object.assign({}, baseOptions, { count: 10 }));
    assert.deepStrictEqual(ten.problems.slice(0, 5), five.problems);
    rows.push(['T17', 'increasing count preserves existing prefix problems', 'pass']);

    const settingsInput = {
        seed: 'settings-stable',
        count: 2,
        operation: 'add',
        difficulty: 'easy',
        rows: 2,
        cols: 3,
        minValue: 1,
        maxValue: 3,
        includeNegatives: false
    };
    const settingsBefore = Object.assign({}, settingsInput);
    const settingsSet = generator.generateAdditionSubtractionSet(settingsInput);
    assert.deepStrictEqual(settingsInput, settingsBefore);
    assert.deepStrictEqual(settingsSet.settings, {
        seed: settingsSet.seed,
        count: 2,
        operation: 'add',
        difficulty: 'easy',
        rows: 2,
        cols: 3,
        minValue: 1,
        maxValue: 3,
        includeNegatives: false
    });
    assert.notStrictEqual(settingsSet.settings, settingsInput);
    rows.push(['T18', 'settings input is not mutated and set stores flat resolved snapshot', 'pass']);

    const narrow = generator.generateAdditionSubtractionSet({
        seed: 'narrow-but-legal',
        count: 2,
        operation: 'mixed',
        difficulty: 'easy',
        minValue: 0,
        maxValue: 0,
        includeNegatives: false
    });
    assert.strictEqual(narrow.problems.length, 2);
    narrow.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrixA, 0, 0);
        assertMatrixInRange(problem.inputs.matrixB, 0, 0);
        assertAnswer(problem);
        assertSteps(problem);
    });
    rows.push(['T19', 'extremely narrow legal range completes without infinite loop', 'pass']);

    assertThrows('missing seed', () => generator.generateAdditionSubtractionSet({ count: 1 }));
    assertThrows('invalid count type', () => generator.generateAdditionSubtractionSet({ seed: 'x', count: 1.5 }));
    assertThrows('invalid count range', () => generator.generateAdditionSubtractionSet({ seed: 'x', count: 11 }));
    assertThrows('invalid operation', () => generator.generateAdditionSubtractionSet({ seed: 'x', operation: 'multiply' }));
    assertThrows('invalid difficulty', () => generator.generateAdditionSubtractionSet({ seed: 'x', difficulty: 'beginner' }));
    assertThrows('incomplete dimensions', () => generator.generateAdditionSubtractionSet({ seed: 'x', rows: 2 }));
    assertThrows('unsupported dimensions', () => generator.generateAdditionSubtractionSet({ seed: 'x', rows: 4, cols: 4 }));
    assertThrows('incomplete range', () => generator.generateAdditionSubtractionSet({ seed: 'x', minValue: 0 }));
    assertThrows('non-integer range', () => generator.generateAdditionSubtractionSet({ seed: 'x', minValue: 0, maxValue: 1.5 }));
    assertThrows('min greater than max', () => generator.generateAdditionSubtractionSet({ seed: 'x', minValue: 5, maxValue: 4 }));
    assertThrows('includeNegatives type', () => generator.generateAdditionSubtractionSet({ seed: 'x', includeNegatives: 'false' }));
    assertThrows('includeNegatives range conflict', () => generator.generateAdditionSubtractionSet({
        seed: 'x',
        minValue: -1,
        maxValue: 3,
        includeNegatives: false
    }));
    rows.push(['T20', 'invalid input validation rejects unsupported options', 'pass']);

    const single = generator.generateAdditionSubtractionProblem({
        seed: 'single-problem',
        operation: 'subtract',
        difficulty: 'easy',
        index: 2
    });
    assert.strictEqual(single.subtype, 'subtract');
    assert.strictEqual(single.id, generator.generateAdditionSubtractionProblem({
        seed: 'single-problem',
        operation: 'subtract',
        difficulty: 'easy',
        index: 2
    }).id);
    assertAnswer(single);
    rows.push(['T21', 'single problem API supports deterministic indexed generation', 'pass']);

    const indexSet = generator.generateAdditionSubtractionSet(Object.assign({}, baseOptions, { count: 3 }));
    const index0 = generator.generateAdditionSubtractionProblem(Object.assign({}, baseOptions, { index: 0 }));
    const index1 = generator.generateAdditionSubtractionProblem(Object.assign({}, baseOptions, { index: 1 }));
    assert.deepStrictEqual(problemSummary(index0), problemSummary(indexSet.problems[0]));
    assert.deepStrictEqual(problemSummary(index1), problemSummary(indexSet.problems[1]));
    assert.strictEqual(indexSet.problems[0].id.endsWith('-1'), true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(indexSet.problems[0], 'printNumber'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(indexSet.problems[0].metadata, 'printNumber'), false);
    assert.deepStrictEqual(
        indexSet.problems.map((problem) => problem.id),
        Array.from(new Set(indexSet.problems.map((problem) => problem.id)))
    );
    rows.push(['T22', 'problem index is zero-based internally and IDs are separate from print numbering', 'pass']);

    const originalRandom = Math.random;
    Math.random = function () {
        throw new Error('Math.random should not be called by generation.');
    };
    try {
        generator.generateAdditionSubtractionSet({
            seed: 'no-runtime-random',
            count: 2,
            operation: 'mixed',
            difficulty: 'easy'
        });
    } finally {
        Math.random = originalRandom;
    }
    rows.push(['T23', 'generation path does not call Math.random', 'pass']);

    return { rows, sample: setA };
}

const { rows, sample } = runTests();
rows.forEach(([id, name, status]) => {
    console.log(`${id} ${status} - ${name}`);
});

console.log('Fixed seed sample:');
sample.problems.slice(0, 3).forEach((problem, index) => {
    console.log(`Problem ${index + 1}`);
    console.log(`Type: ${problem.subtype}`);
    console.log(`A: ${JSON.stringify(problem.inputs.matrixA)}`);
    console.log(`B: ${JSON.stringify(problem.inputs.matrixB)}`);
    console.log(`Answer: ${JSON.stringify(problem.exactAnswer.matrix)}`);
});

console.log('All practice addition/subtraction tests passed.');
