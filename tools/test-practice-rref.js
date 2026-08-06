'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

globalThis.math = require(path.join('..', 'math.min.js'));

const generator = require(path.join('..', 'js', 'practice', 'generators', 'rref.js'));

function flatten(matrix) {
    return matrix.reduce((items, row) => items.concat(row), []);
}

function countNonZero(matrix) {
    return flatten(matrix).filter((value) => value !== 0).length;
}

function shape(matrix) {
    return [matrix.length, matrix[0].length];
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

function valueKey(value) {
    return typeof value === 'number'
        ? String(value)
        : `${value.numerator}/${value.denominator}`;
}

function valuesEqual(a, b) {
    return globalThis.math.equal(toFraction(a), toFraction(b));
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

function assertExactMatrix(matrix) {
    matrix.forEach((row) => row.forEach(assertExactValue));
}

function assertDimensions(problem) {
    assert.deepStrictEqual(shape(problem.inputs.matrix), [problem.dimensions.rows, problem.dimensions.cols]);
    assert.deepStrictEqual(shape(problem.exactAnswer.matrix), [problem.dimensions.rows, problem.dimensions.cols]);
}

function assertInputNotRref(problem) {
    assert.notDeepStrictEqual(
        problem.inputs.matrix.map((row) => row.map((value) => valueKey(value))),
        problem.exactAnswer.matrix.map((row) => row.map((value) => valueKey(value)))
    );
}

function matrixKeys(matrix) {
    return matrix.map((row) => row.map(valueKey));
}

function hasDuplicateRows(matrix) {
    return new Set(matrix.map((row) => row.join('|'))).size !== matrix.length;
}

function hasDuplicateColumns(matrix) {
    const columns = [];
    for (let c = 0; c < matrix[0].length; c++) {
        columns.push(matrix.map((row) => row[c]).join('|'));
    }
    return new Set(columns).size !== columns.length;
}

function areRowsPositiveOrNegativeCopies(left, right) {
    let same = true;
    let negative = true;
    for (let c = 0; c < left.length; c++) {
        if (left[c] !== right[c]) same = false;
        if (left[c] !== -right[c]) negative = false;
    }
    return same || negative;
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

function assertStepReplay(problem) {
    let matrix = problem.inputs.matrix.map((row) => row.slice());
    problem.steps.forEach((step) => {
        matrix = applyStep(matrix, step);
        assert.deepStrictEqual(matrixKeys(matrix), matrixKeys(step.matrix));
    });
    assert.deepStrictEqual(matrixKeys(matrix), matrixKeys(problem.exactAnswer.matrix));
}

function assertNoLabels(value) {
    if (!value || typeof value !== 'object') return;
    assert(!Object.prototype.hasOwnProperty.call(value, 'label'));
    assert(!Object.prototype.hasOwnProperty.call(value, 'text'));
    Object.keys(value).forEach((key) => assertNoLabels(value[key]));
}

function assertSteps(problem) {
    const allowed = new Set(['swap-rows', 'scale-row', 'add-row-multiple']);
    problem.steps.forEach((step) => {
        assert(allowed.has(step.kind), step.kind);
        assert(!Object.prototype.hasOwnProperty.call(step, 'label'));
        assert(!Object.prototype.hasOwnProperty.call(step, 'text'));
        assert.deepStrictEqual(shape(step.matrix), [problem.dimensions.rows, problem.dimensions.cols]);
        assertExactMatrix(step.matrix);
        if (step.kind === 'swap-rows') {
            assert(Number.isInteger(step.rowA));
            assert(Number.isInteger(step.rowB));
            assert(step.rowA >= 0);
            assert(step.rowB >= 0);
        } else if (step.kind === 'scale-row') {
            assert(Number.isInteger(step.row));
            assert(step.row >= 0);
            assertExactValue(step.factor);
        } else {
            assert(Number.isInteger(step.targetRow));
            assert(Number.isInteger(step.sourceRow));
            assert(step.targetRow >= 0);
            assert(step.sourceRow >= 0);
            assertExactValue(step.multiple);
        }
    });
    assert.deepStrictEqual(problem.steps[problem.steps.length - 1].matrix, problem.exactAnswer.matrix);
    assertStepReplay(problem);
}

function problemSummary(problem) {
    return {
        id: problem.id,
        input: problem.inputs.matrix,
        targetRank: problem.metadata.targetRank,
        rank: problem.metadata.rank,
        exactAnswer: problem.exactAnswer.matrix,
        stepCount: problem.metadata.stepCount,
        firstStep: problem.steps[0],
        lastStep: problem.steps[problem.steps.length - 1]
    };
}

async function runTests() {
    const rows = [];
    const baseOptions = {
        seed: 'matrixcalcu-rref-v1',
        count: 3,
        difficulty: 'medium'
    };

    const setA = await generator.generateRrefSet(baseOptions);
    const setB = await generator.generateRrefSet(baseOptions);
    assert.deepStrictEqual(setA, setB);
    rows.push(['T01', 'same seed and settings produce identical sets', 'pass']);

    const differentSeed = await generator.generateRrefSet(Object.assign({}, baseOptions, { seed: 'matrixcalcu-rref-v1b' }));
    assert.notDeepStrictEqual(setA, differentSeed);
    rows.push(['T02', 'different seeds produce different sets', 'pass']);

    const expectedGolden = [
        {
            id: 'practice-rref-193613467-medium-3x3-2-5-5-true-1',
            input: [[0, -2, 2], [-1, -2, -1], [2, 2, 4]],
            targetRank: 2,
            rank: 2,
            exactAnswer: [[1, 0, 3], [0, 1, -1], [0, 0, 0]],
            stepCount: 6,
            firstStep: {
                kind: 'swap-rows',
                rowA: 0,
                rowB: 1,
                matrix: [[-1, -2, -1], [0, -2, 2], [2, 2, 4]]
            },
            lastStep: {
                kind: 'add-row-multiple',
                targetRow: 2,
                sourceRow: 1,
                multiple: 2,
                matrix: [[1, 0, 3], [0, 1, -1], [0, 0, 0]]
            }
        },
        {
            id: 'practice-rref-193613467-medium-3x3-2-5-5-true-2',
            input: [[1, 1, 3], [0, -4, -1], [1, -3, 2]],
            targetRank: 2,
            rank: 2,
            exactAnswer: [
                [1, 0, { kind: 'fraction', numerator: 11, denominator: 4 }],
                [0, 1, { kind: 'fraction', numerator: 1, denominator: 4 }],
                [0, 0, 0]
            ],
            stepCount: 4,
            firstStep: {
                kind: 'add-row-multiple',
                targetRow: 2,
                sourceRow: 0,
                multiple: -1,
                matrix: [[1, 1, 3], [0, -4, -1], [0, -4, -1]]
            },
            lastStep: {
                kind: 'add-row-multiple',
                targetRow: 2,
                sourceRow: 1,
                multiple: 4,
                matrix: [
                    [1, 0, { kind: 'fraction', numerator: 11, denominator: 4 }],
                    [0, 1, { kind: 'fraction', numerator: 1, denominator: 4 }],
                    [0, 0, 0]
                ]
            }
        },
        {
            id: 'practice-rref-193613467-medium-3x3-3-5-5-true-3',
            input: [[0, -3, -1], [3, 4, -2], [-4, 0, 2]],
            targetRank: 3,
            rank: 3,
            exactAnswer: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
            stepCount: 9,
            firstStep: {
                kind: 'swap-rows',
                rowA: 0,
                rowB: 1,
                matrix: [[3, 4, -2], [0, -3, -1], [-4, 0, 2]]
            },
            lastStep: {
                kind: 'add-row-multiple',
                targetRow: 1,
                sourceRow: 2,
                multiple: { kind: 'fraction', numerator: -1, denominator: 3 },
                matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
            }
        }
    ];
    assert.deepStrictEqual(setA.problems.slice(0, 3).map(problemSummary), expectedGolden);
    rows.push(['T03', 'golden fixture for fixed medium seed', 'pass']);

    const ambiguousSteps = generator.__test.normalizeCoreSteps([
        { matrix: [[4, 4, 4], [4, 4, 4]] },
        { matrix: [[1, 1, 1], [4, 4, 4]] }
    ]);
    assert.strictEqual(ambiguousSteps[0].kind, 'scale-row');
    assert.deepStrictEqual(ambiguousSteps[0].factor, { kind: 'fraction', numerator: 1, denominator: 4 });
    const swapSteps = generator.__test.normalizeCoreSteps([
        { matrix: [[0, 1], [2, 3]] },
        { matrix: [[2, 3], [0, 1]] }
    ]);
    assert.strictEqual(swapSteps[0].kind, 'swap-rows');
    const addSteps = generator.__test.normalizeCoreSteps([
        { matrix: [[1, 2], [3, 4]] },
        { matrix: [[1, 2], [2, 2]] }
    ]);
    assert.strictEqual(addSteps[0].kind, 'add-row-multiple');
    assert.strictEqual(addSteps[0].multiple, -1);
    assert.throws(() => generator.__test.normalizeCoreSteps([
        { matrix: [[1, 2], [3, 4]] },
        { matrix: [[2, 2], [3, 5]] }
    ]));
    rows.push(['T03b', 'snapshot inference prefers scale, recognizes swap/add, and rejects ambiguous failures', 'pass']);

    assert.strictEqual(setA.problems.length, 3);
    assert.strictEqual((await generator.generateRrefSet(Object.assign({}, baseOptions, { count: 1 }))).problems.length, 1);
    rows.push(['T04', 'count controls problem count', 'pass']);

    const ids = setA.problems.map((problem) => problem.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    assert.deepStrictEqual(ids, (await generator.generateRrefSet(baseOptions)).problems.map((problem) => problem.id));
    rows.push(['T05', 'problem IDs are unique, stable, and repeatable', 'pass']);

    const easy = await generator.generateRrefSet({ seed: 'easy-rref', count: 2, difficulty: 'easy' });
    assert.strictEqual(easy.settings.rows, 2);
    assert.strictEqual(easy.settings.cols, 3);
    assert.strictEqual(easy.settings.minValue, 0);
    assert.strictEqual(easy.settings.maxValue, 5);
    assert.strictEqual(easy.settings.includeNegatives, false);
    assert.strictEqual(easy.settings.targetRank, 2);
    easy.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrix, 0, 5);
    });
    rows.push(['T06', 'easy defaults are 2x3, 0..5, nonnegative, rank 2', 'pass']);

    const medium = await generator.generateRrefSet({ seed: 'medium-rref', count: 5, difficulty: 'medium' });
    assert.strictEqual(medium.settings.rows, 3);
    assert.strictEqual(medium.settings.cols, 3);
    assert.strictEqual(medium.settings.minValue, -5);
    assert.strictEqual(medium.settings.maxValue, 5);
    medium.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrix, -5, 5);
    });
    rows.push(['T07', 'medium defaults are 3x3 with -5..5 range', 'pass']);

    const hard = await generator.generateRrefSet({ seed: 'hard-rref', count: 2, difficulty: 'hard' });
    assert.strictEqual(hard.settings.rows, 3);
    assert.strictEqual(hard.settings.cols, 4);
    assert.strictEqual(hard.settings.minValue, -7);
    assert.strictEqual(hard.settings.maxValue, 7);
    hard.problems.forEach((problem) => {
        assertMatrixInRange(problem.inputs.matrix, -7, 7);
    });
    rows.push(['T08', 'hard defaults are 3x4 with -7..7 range', 'pass']);

    setA.problems.concat(easy.problems, medium.problems, hard.problems).forEach((problem) => {
        assert.strictEqual(problem.type, 'rref');
        assert.strictEqual(problem.subtype, null);
        assert.strictEqual(problem.solutionType, null);
        assertDimensions(problem);
        assert(countNonZero(problem.inputs.matrix) >= 3);
        assertInputNotRref(problem);
        assert.strictEqual(problem.metadata.rank, problem.metadata.targetRank);
        assert.strictEqual(problem.metadata.stepCount, problem.steps.length);
        assertExactMatrix(problem.exactAnswer.matrix);
        assert.notStrictEqual(problem.exactAnswer.matrix, problem.inputs.matrix);
        assertSteps(problem);
        assertNoLabels(problem);
    });
    rows.push(['T09', 'problem structure, rank, exact matrices, and structured steps are valid', 'pass']);

    setA.problems.filter((problem) => problem.metadata.targetRank === 2).forEach((problem) => {
        assert.strictEqual(hasDuplicateRows(problem.inputs.matrix), false);
        assert.strictEqual(hasDuplicateColumns(problem.inputs.matrix), false);
        for (let r = problem.metadata.targetRank; r < problem.inputs.matrix.length; r++) {
            for (let b = 0; b < problem.metadata.targetRank; b++) {
                assert.strictEqual(areRowsPositiveOrNegativeCopies(problem.inputs.matrix[b], problem.inputs.matrix[r]), false);
            }
        }
    });
    rows.push(['T09b', 'default medium rank 2 problems avoid duplicate rows, columns, and copy dependent rows', 'pass']);

    const explicitSize = await generator.generateRrefSet({
        seed: 'explicit-rref-size',
        count: 1,
        difficulty: 'easy',
        rows: 3,
        cols: 4,
        targetRank: 3
    });
    assert.deepStrictEqual(explicitSize.problems[0].dimensions, { rows: 3, cols: 4 });
    assert.strictEqual(explicitSize.problems[0].metadata.rank, 3);
    rows.push(['T10', 'explicit dimensions and targetRank override defaults', 'pass']);

    const explicitRange = await generator.generateRrefSet({
        seed: 'explicit-rref-range',
        count: 1,
        difficulty: 'easy',
        minValue: 1,
        maxValue: 5,
        includeNegatives: false
    });
    assertMatrixInRange(explicitRange.problems[0].inputs.matrix, 1, 5);
    rows.push(['T11', 'explicit value range is honored', 'pass']);

    const rank2 = await generator.generateRrefSet({ seed: 'rank-two-path', count: 1, difficulty: 'medium', targetRank: 2 });
    const rank3 = await generator.generateRrefSet({ seed: 'rank-three-path', count: 1, difficulty: 'medium', targetRank: 3 });
    assert.strictEqual(rank2.problems[0].metadata.rank, 2);
    assert.strictEqual(rank3.problems[0].metadata.rank, 3);
    rows.push(['T12', 'rank 2 and rank 3 paths are reachable with fixed settings', 'pass']);

    const five = await generator.generateRrefSet(Object.assign({}, baseOptions, { count: 5 }));
    const ten = await generator.generateRrefSet(Object.assign({}, baseOptions, { count: 10 }));
    assert.deepStrictEqual(ten.problems.slice(0, 5), five.problems);
    rows.push(['T13', 'increasing count preserves existing prefix problems', 'pass']);

    const settingsInput = {
        seed: 'settings-rref',
        count: 2,
        difficulty: 'easy',
        rows: 2,
        cols: 3,
        targetRank: 2,
        minValue: 0,
        maxValue: 5,
        includeNegatives: false
    };
    const settingsBefore = Object.assign({}, settingsInput);
    const settingsSet = await generator.generateRrefSet(settingsInput);
    assert.deepStrictEqual(settingsInput, settingsBefore);
    assert.deepStrictEqual(settingsSet.settings, Object.assign({}, settingsBefore, { seed: settingsSet.seed }));
    assert.notStrictEqual(settingsSet.settings, settingsInput);
    rows.push(['T14', 'options are not mutated and settings are flat snapshots', 'pass']);

    await assertThrowsAsync('0..0 range fails clearly', () => generator.generateRrefSet({
        seed: 'zero-range',
        count: 1,
        difficulty: 'easy',
        minValue: 0,
        maxValue: 0,
        includeNegatives: false
    }));
    rows.push(['T15', '0..0 range fails with a finite error', 'pass']);

    await assertThrowsAsync('1..1 narrow range fails clearly', () => generator.generateRrefSet({
        seed: 'one-range',
        count: 1,
        difficulty: 'easy',
        minValue: 1,
        maxValue: 1,
        includeNegatives: false
    }));
    rows.push(['T15b', 'extremely narrow feasible-looking range completes or fails clearly without looping', 'pass']);

    await assertThrowsAsync('missing seed', () => generator.generateRrefSet({ count: 1 }));
    await assertThrowsAsync('invalid count type', () => generator.generateRrefSet({ seed: 'x', count: 1.5 }));
    await assertThrowsAsync('invalid count range', () => generator.generateRrefSet({ seed: 'x', count: 11 }));
    await assertThrowsAsync('invalid difficulty', () => generator.generateRrefSet({ seed: 'x', difficulty: 'beginner' }));
    await assertThrowsAsync('incomplete dimensions', () => generator.generateRrefSet({ seed: 'x', rows: 2 }));
    await assertThrowsAsync('unsupported dimensions', () => generator.generateRrefSet({ seed: 'x', rows: 2, cols: 2 }));
    await assertThrowsAsync('invalid targetRank', () => generator.generateRrefSet({ seed: 'x', rows: 2, cols: 3, targetRank: 3 }));
    await assertThrowsAsync('incomplete range', () => generator.generateRrefSet({ seed: 'x', minValue: 0 }));
    await assertThrowsAsync('non-integer range', () => generator.generateRrefSet({ seed: 'x', minValue: 0, maxValue: 1.5 }));
    await assertThrowsAsync('min greater than max', () => generator.generateRrefSet({ seed: 'x', minValue: 5, maxValue: 4 }));
    await assertThrowsAsync('includeNegatives type', () => generator.generateRrefSet({ seed: 'x', includeNegatives: 'false' }));
    await assertThrowsAsync('includeNegatives conflict', () => generator.generateRrefSet({
        seed: 'x',
        minValue: -1,
        maxValue: 3,
        includeNegatives: false
    }));
    rows.push(['T16', 'invalid input validation rejects unsupported options', 'pass']);

    const originalRandom = Math.random;
    Math.random = function () {
        throw new Error('Math.random should not be called by generation.');
    };
    try {
        await generator.generateRrefSet({ seed: 'no-runtime-random', count: 1, difficulty: 'easy' });
    } finally {
        Math.random = originalRandom;
    }
    rows.push(['T17', 'generation path does not call Math.random', 'pass']);

    const previousDocument = globalThis.document;
    const hadDocument = Object.prototype.hasOwnProperty.call(globalThis, 'document');
    const markerDocument = { documentElement: { lang: 'es' } };
    globalThis.document = markerDocument;
    await generator.generateRrefSet({ seed: 'language-state', count: 1, difficulty: 'easy' });
    assert.strictEqual(globalThis.document, markerDocument);
    const throwingDocument = {};
    Object.defineProperty(throwingDocument, 'documentElement', {
        get() {
            throw new Error('simulated language lookup failure');
        }
    });
    globalThis.document = throwingDocument;
    await assertThrowsAsync('core language lookup failure restores document', () => generator.generateRrefSet({
        seed: 'language-throws',
        count: 1,
        difficulty: 'easy'
    }));
    assert.strictEqual(globalThis.document, throwingDocument);
    if (hadDocument) {
        globalThis.document = previousDocument;
    } else {
        delete globalThis.document;
    }
    const parallelA = await Promise.all([
        generator.generateRrefSet({ seed: 'parallel-a', count: 2, difficulty: 'medium' }),
        generator.generateRrefSet({ seed: 'parallel-b', count: 2, difficulty: 'medium' })
    ]);
    const parallelB = await Promise.all([
        generator.generateRrefSet({ seed: 'parallel-a', count: 2, difficulty: 'medium' }),
        generator.generateRrefSet({ seed: 'parallel-b', count: 2, difficulty: 'medium' })
    ]);
    assert.deepStrictEqual(parallelA, parallelB);
    rows.push(['T17b', 'temporary language context restores state and parallel generation remains stable', 'pass']);

    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'practice', 'generators', 'rref.js'), 'utf8');
    assert(!/\bdocument\b/.test(source));
    assert(!/\bMath\.random\b/.test(source));
    rows.push(['T18', 'module source does not depend on DOM or Math.random', 'pass']);

    return { rows, sample: setA };
}

runTests().then(({ rows, sample }) => {
    rows.forEach(([id, name, status]) => {
        console.log(`${id} ${status} - ${name}`);
    });

    console.log('Fixed seed sample:');
    sample.problems.slice(0, 3).forEach((problem, index) => {
        console.log(`Problem ${index + 1}`);
        console.log(`Input: ${JSON.stringify(problem.inputs.matrix)}`);
        console.log(`Rank: ${problem.metadata.rank}`);
        console.log(`RREF: ${JSON.stringify(problem.exactAnswer.matrix)}`);
        console.log(`Row operations: ${problem.steps.length}`);
    });
    console.log('All practice RREF tests passed.');
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
