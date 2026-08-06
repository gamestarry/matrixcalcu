'use strict';

const assert = require('assert');
const path = require('path');

const model = require(path.join('..', 'js', 'practice', 'problem-model.js'));

function assertThrows(name, fn) {
    assert.throws(fn, Error, name);
}

function fixtureProblemData(overrides = {}) {
    return Object.assign({
        id: 'problem-1',
        type: 'multiplication',
        subtype: 'matrix-product',
        difficulty: 'easy',
        inputs: {
            matrixA: [[1, 2]],
            matrixB: [[3], [4]]
        },
        exactAnswer: [[11]],
        dimensions: { rowsA: 1, colsA: 2, rowsB: 2, colsB: 1 }
    }, overrides);
}

function runTests() {
    const rows = [];

    const data = fixtureProblemData();
    const problem = model.createProblem(data);
    assert.strictEqual(problem.id, 'problem-1');
    assert.strictEqual(problem.type, 'multiplication');
    assert.strictEqual(problem.difficulty, 'easy');
    assert.strictEqual(problem.inputs, data.inputs);
    assert.strictEqual(problem.exactAnswer, data.exactAnswer);
    rows.push(['T01', 'create a valid fixture problem', 'pass']);

    const defaults = model.createProblem(fixtureProblemData({ id: 'problem-defaults', subtype: undefined }));
    assert.deepStrictEqual(defaults.steps, []);
    assert.strictEqual(defaults.solutionType, null);
    assert.deepStrictEqual(defaults.metadata, {});
    assert.strictEqual(defaults.subtype, null);
    rows.push(['T02', 'default steps, solutionType, metadata, and nullable subtype', 'pass']);

    const source = fixtureProblemData({ id: 'problem-source' });
    const sourceKeys = Object.keys(source).sort();
    const sourceSteps = [{ kind: 'given' }];
    source.steps = sourceSteps;
    const created = model.createProblem(source);
    assert.deepStrictEqual(Object.keys(source).sort(), sourceKeys.concat('steps').sort());
    assert.strictEqual(source.steps, sourceSteps);
    assert.notStrictEqual(created.steps, sourceSteps);
    assert.deepStrictEqual(created.steps, sourceSteps);
    rows.push(['T03', 'createProblem does not mutate input and copies steps array', 'pass']);

    const p1 = model.createProblem(fixtureProblemData({ id: 'problem-a' }));
    const p2 = model.createProblem(fixtureProblemData({ id: 'problem-b' }));
    p1.steps.push({ kind: 'local-change' });
    p1.metadata.note = 'local';
    assert.deepStrictEqual(p2.steps, []);
    assert.deepStrictEqual(p2.metadata, {});
    rows.push(['T04', 'default arrays and objects are not shared', 'pass']);

    assertThrows('missing id', () => model.createProblem(fixtureProblemData({ id: '' })));
    assertThrows('missing type', () => model.createProblem(fixtureProblemData({ type: '' })));
    assertThrows('unsupported type', () => model.createProblem(fixtureProblemData({ type: 'determinant' })));
    assertThrows('unsupported difficulty', () => model.createProblem(fixtureProblemData({ difficulty: 'beginner' })));
    assertThrows('steps not array', () => model.createProblem(fixtureProblemData({ steps: { bad: true } })));
    assertThrows('missing inputs', () => {
        const bad = fixtureProblemData();
        delete bad.inputs;
        model.createProblem(bad);
    });
    assertThrows('missing exactAnswer', () => {
        const bad = fixtureProblemData();
        delete bad.exactAnswer;
        model.createProblem(bad);
    });
    rows.push(['T05', 'invalid problem inputs throw clear errors', 'pass']);

    const exactAnswer = { matrix: [[{ n: 1, d: 2 }]] };
    const answerProblem = model.createProblem(fixtureProblemData({
        id: 'problem-exact',
        exactAnswer
    }));
    assert.strictEqual(answerProblem.exactAnswer, exactAnswer);
    rows.push(['T06', 'exactAnswer preserves original exact structure', 'pass']);

    const domLikeInput = {
        nodeId: 'not-a-dom-node',
        value: [[1]]
    };
    const domNeutral = model.createProblem(fixtureProblemData({
        id: 'problem-dom-neutral',
        inputs: domLikeInput
    }));
    assert.strictEqual(domNeutral.inputs, domLikeInput);
    rows.push(['T07', 'inputs do not require DOM, window, or document', 'pass']);

    const setProblems = [
        model.createProblem(fixtureProblemData({ id: 'p-1' })),
        model.createProblem(fixtureProblemData({ id: 'p-2', difficulty: 'medium' }))
    ];
    const settings = { count: 2, difficulty: 'mixed' };
    const set = model.createProblemSet({
        id: 'set-1',
        seed: 'seed-alpha',
        type: 'mixed',
        settings,
        problems: setProblems
    });
    assert.deepStrictEqual(set.problems.map((item) => item.id), ['p-1', 'p-2']);
    assert.notStrictEqual(set.problems, setProblems);
    assert.strictEqual(set.problems[0], setProblems[0]);
    assert.strictEqual(set.seed, 'seed-alpha');
    assert.deepStrictEqual(set.settings, settings);
    assert.notStrictEqual(set.settings, settings);
    rows.push(['T08', 'createProblemSet preserves order, seed, settings snapshot, and problem objects', 'pass']);

    assertThrows('duplicate problem id', () => model.createProblemSet({
        id: 'set-duplicate',
        seed: 'seed-alpha',
        type: 'mixed',
        problems: [setProblems[0], setProblems[0]]
    }));
    rows.push(['T09', 'duplicate problem id throws', 'pass']);

    let answerAccessCount = 0;
    const exact = {};
    Object.defineProperty(exact, 'value', {
        enumerable: true,
        get() {
            answerAccessCount++;
            return 42;
        }
    });
    const exactProblem = model.createProblem(fixtureProblemData({
        id: 'problem-no-recalc',
        exactAnswer: exact
    }));
    model.createProblemSet({
        id: 'set-no-recalc',
        seed: 'seed-alpha',
        type: 'mixed',
        problems: [exactProblem]
    });
    assert.strictEqual(answerAccessCount, 0);
    rows.push(['T10', 'createProblemSet does not recalculate or inspect answers', 'pass']);

    const idA = model.createProblemId('linear-system', 'Seed Alpha', 0);
    const idB = model.createProblemId('linear-system', 'Seed Alpha', 0);
    const idC = model.createProblemId('linear-system', 'Seed Alpha', 1);
    assert.strictEqual(idA, idB);
    assert.notStrictEqual(idA, idC);
    assert(/^[a-z0-9-]+$/.test(idA));
    assert.strictEqual(model.createProblemId('RREF!', 'Seed/Alpha 01', 4), 'practice-rref-seed-alpha-01-5');
    rows.push(['T11', 'deterministic IDs are stable, distinct by index, and safe', 'pass']);

    assertThrows('invalid id index', () => model.createProblemId('rref', 'seed', -1));
    rows.push(['T12', 'invalid ID index throws', 'pass']);

    return rows;
}

const rows = runTests();
rows.forEach(([id, name, status]) => {
    console.log(`${id} ${status} - ${name}`);
});
console.log('All practice problem model tests passed.');
