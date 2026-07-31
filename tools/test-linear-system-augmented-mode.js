'use strict';

const assert = require('assert');
const path = require('path');

globalThis.math = require(path.join('..', 'math.min.js'));
globalThis.document = { getElementById: () => null };

const mode = require(path.join('..', 'js', 'ui', 'linear-system-ab-mode.js'));
const math = globalThis.math;

function runTests() {
    const rows = [];

    let result = mode.validateAugmentedDimensions({
        A: { rows: 2, cols: 3 },
        B: { rows: 9, cols: 9 }
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.equationCount, 2);
    assert.strictEqual(result.variableCount, 2);
    assert.strictEqual(result.isUnderdetermined, false);
    assert.strictEqual(result.isOverdetermined, false);
    rows.push(['T01', 'map 2x3 augmented dimensions to 2 equations and 2 variables', 'pass']);

    result = mode.validateAugmentedDimensions({ A: { rows: 2, cols: 4 } });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.variableCount, 3);
    assert.strictEqual(result.isUnderdetermined, true);
    rows.push(['T02', 'map columns minus one to variables for underdetermined systems', 'pass']);

    result = mode.validateAugmentedDimensions({ A: { rows: 3, cols: 3 } });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.variableCount, 2);
    assert.strictEqual(result.isOverdetermined, true);
    rows.push(['T03', 'map rows to equations for overdetermined systems', 'pass']);

    result = mode.validateAugmentedDimensions({ A: { rows: 1, cols: 2 } });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.equationCount, 1);
    assert.strictEqual(result.variableCount, 1);
    rows.push(['T04', 'accept 1x2 as the smallest valid augmented system', 'pass']);

    result = mode.validateAugmentedDimensions({ A: { rows: 3, cols: 1 } });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'augmented-column-count');
    assert.ok(result.messages[0].includes('At least two columns'));
    rows.push(['T05', 'reject one-column augmented matrices', 'pass']);

    result = mode.validateAugmentedDimensions({ A: { rows: 0, cols: 0 } });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'missing-augmented-dimensions');
    rows.push(['T06', 'reject missing dimensions', 'pass']);

    const half = math.fraction('1/2');
    const augmented = mode.readAugmentedMatrix(
        [[half, math.fraction(1), math.fraction(2)], [math.fraction(1), math.fraction('-1/3'), math.fraction(1)]],
        { A: { rows: 2, cols: 3 } }
    );
    assert.strictEqual(augmented.length, 2);
    assert.strictEqual(augmented[0].length, 3);
    assert.strictEqual(math.equal(augmented[0][0], half), true);
    rows.push(['T07', 'read augmented Matrix A directly and preserve fractions', 'pass']);

    assert.throws(
        () => mode.readAugmentedMatrix([[1, 2], [3]], { A: { rows: 2, cols: 2 } }),
        /could not be read/i
    );
    rows.push(['T08', 'reject ragged augmented matrices', 'pass']);

    assert.throws(
        () => mode.readAugmentedMatrix([[Number.NaN, 1]], { A: { rows: 1, cols: 2 } }),
        /invalid/i
    );
    rows.push(['T09', 'reject invalid numeric entries', 'pass']);

    assert.deepStrictEqual(mode.getVariableNames(4), ['x', 'y', 'z', 'w']);
    assert.strictEqual(mode.getVariableNames(15)[14], 'x15');
    rows.push(['T10', 'reuse the shared variable-name sequence', 'pass']);

    return rows;
}

const rows = runTests();
rows.forEach(([id, name, status]) => {
    console.log(`${id} ${status} - ${name}`);
});
console.log('All linear system augmented matrix mode tests passed.');
