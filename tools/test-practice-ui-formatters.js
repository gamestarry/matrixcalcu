const assert = require('assert');
const fs = require('fs');

const ui = require('../js/practice/practice-ui.js');

assert.strictEqual(ui.formatScalarText(3), '3');
assert.strictEqual(ui.formatScalarText({ kind: 'fraction', numerator: -2, denominator: 5 }), '-2/5');

assert.strictEqual(ui.formatEquationText([1, -1, 0], 4), 'x - y = 4');
assert.strictEqual(ui.formatEquationText([-1, 2, -3], -7), '-x + 2y - 3z = -7');
assert.strictEqual(ui.formatEquationText([0, 0, 0], 5), '0 = 5');

assert.strictEqual(
    ui.formatRrefOperationText({ kind: 'swap-rows', rowA: 0, rowB: 2 }),
    'R1 <-> R3'
);
assert.strictEqual(
    ui.formatRrefOperationText({ kind: 'scale-row', row: 1, factor: { kind: 'fraction', numerator: -1, denominator: 3 } }),
    'R2 <- -1/3R2'
);
assert.strictEqual(
    ui.formatRrefOperationText({ kind: 'add-row-multiple', targetRow: 2, sourceRow: 0, multiple: 4 }),
    'R3 <- R3 + 4R1'
);

const initial = ui.createInitialState();
assert.strictEqual(initial.count, 6);
assert.deepStrictEqual(ui.COUNT_OPTIONS, [4, 6, 8, 10]);
assert.strictEqual(ui.formatInputValue(0), '0');
assert.strictEqual(ui.formatInputValue(null), '');
assert.strictEqual(ui.formatInputValue(undefined), '');

const easyOptions = ui.buildGeneratorOptions(initial, 'seed-a');
assert.deepStrictEqual(easyOptions, {
    seed: 'seed-a',
    count: 6,
    difficulty: 'easy',
    minValue: 0,
    maxValue: 5,
    includeNegatives: false,
    operation: 'mixed',
    rows: 2,
    cols: 2
});

const addSub = Object.assign(ui.createInitialState(), {
    count: 8,
    operation: 'subtract',
    rows: 3,
    cols: 2,
    minValue: -4,
    maxValue: 6
});
assert.deepStrictEqual(ui.buildGeneratorOptions(addSub, 'seed-b'), {
    seed: 'seed-b',
    count: 8,
    difficulty: 'easy',
    minValue: -4,
    maxValue: 6,
    includeNegatives: true,
    operation: 'subtract',
    rows: 3,
    cols: 2
});

const multiplication = Object.assign(ui.createInitialState(), {
    type: 'multiplication',
    difficulty: 'medium',
    rowsA: 2,
    colsA: 3,
    colsB: 2,
    minValue: -5,
    maxValue: 5
});
assert.deepStrictEqual(ui.buildGeneratorOptions(multiplication, 'seed-c'), {
    seed: 'seed-c',
    count: 6,
    difficulty: 'medium',
    minValue: -5,
    maxValue: 5,
    includeNegatives: true,
    rowsA: 2,
    colsA: 3,
    colsB: 2
});

const rref = Object.assign(ui.createInitialState(), {
    type: 'rref',
    difficulty: 'hard',
    rrefSize: '3x4',
    minValue: -7,
    maxValue: 7
});
assert.deepStrictEqual(ui.buildGeneratorOptions(rref, 'seed-d'), {
    seed: 'seed-d',
    count: 6,
    difficulty: 'hard',
    minValue: -7,
    maxValue: 7,
    includeNegatives: true,
    rows: 3,
    cols: 4
});

const systems = Object.assign(ui.createInitialState(), {
    type: 'linear-system',
    difficulty: 'hard',
    variables: 3,
    solutionType: 'infinite',
    minValue: -7,
    maxValue: 7
});
assert.deepStrictEqual(ui.buildGeneratorOptions(systems, 'seed-e'), {
    seed: 'seed-e',
    count: 6,
    difficulty: 'hard',
    minValue: -7,
    maxValue: 7,
    includeNegatives: true,
    variables: 3,
    solutionType: 'infinite'
});

const mediumDefaults = ui.createInitialState();
mediumDefaults.type = 'multiplication';
mediumDefaults.difficulty = 'medium';
ui.applyDifficultyDefaults(mediumDefaults);
assert.strictEqual(mediumDefaults.minValue, -5);
assert.strictEqual(mediumDefaults.maxValue, 5);
assert.strictEqual(mediumDefaults.rowsA, 2);
assert.strictEqual(mediumDefaults.colsA, 3);
assert.strictEqual(mediumDefaults.colsB, 2);

const easyDefaults = ui.createInitialState();
easyDefaults.difficulty = 'easy';
ui.applyDifficultyDefaults(easyDefaults);
assert.strictEqual(easyDefaults.minValue, 0);
assert.strictEqual(easyDefaults.maxValue, 5);

const hardDefaults = ui.createInitialState();
hardDefaults.type = 'linear-system';
hardDefaults.difficulty = 'hard';
ui.applyDifficultyDefaults(hardDefaults);
assert.strictEqual(hardDefaults.minValue, -7);
assert.strictEqual(hardDefaults.maxValue, 7);
assert.strictEqual(hardDefaults.variables, 3);
assert.strictEqual(hardDefaults.solutionType, 'mixed');

const manualZero = Object.assign(ui.createInitialState(), {
    minValue: 0,
    maxValue: 0
});
assert.strictEqual(ui.buildGeneratorOptions(manualZero, 'seed-zero').minValue, 0);
assert.strictEqual(ui.buildGeneratorOptions(manualZero, 'seed-zero').maxValue, 0);
assert.strictEqual(ui.buildGeneratorOptions(manualZero, 'seed-zero').includeNegatives, false);

const generatedRrefState = Object.assign(ui.createInitialState(), {
    type: 'rref',
    currentSet: { id: 'set-rref', seed: 'seed-rref', problems: [{ id: 'problem-rref' }] },
    hasGenerated: true,
    dirty: true,
    generationToken: 7
});
assert.strictEqual(ui.applyProblemTypeChange(generatedRrefState, 'addition-subtraction'), true);
assert.strictEqual(generatedRrefState.type, 'addition-subtraction');
assert.strictEqual(generatedRrefState.currentSet, null);
assert.strictEqual(generatedRrefState.hasGenerated, false);
assert.strictEqual(generatedRrefState.dirty, false);
assert.strictEqual(generatedRrefState.generationToken, 8);

const sameTypeState = Object.assign(ui.createInitialState(), {
    currentSet: { id: 'set-add', seed: 'seed-add' },
    hasGenerated: true,
    generationToken: 3
});
assert.strictEqual(ui.applyProblemTypeChange(sameTypeState, 'addition-subtraction'), false);
assert.deepStrictEqual(sameTypeState.currentSet, { id: 'set-add', seed: 'seed-add' });
assert.strictEqual(sameTypeState.hasGenerated, true);
assert.strictEqual(sameTypeState.generationToken, 3);

const settingsChangedState = Object.assign(ui.createInitialState(), {
    currentSet: { id: 'set-old', seed: 'seed-old' },
    hasGenerated: true,
    dirty: false
});
ui.markSettingsChangedState(settingsChangedState);
assert.deepStrictEqual(settingsChangedState.currentSet, { id: 'set-old', seed: 'seed-old' });
assert.strictEqual(settingsChangedState.hasGenerated, true);
assert.strictEqual(settingsChangedState.dirty, true);

assert.strictEqual(ui.validateSettings(initial).ok, true);
assert.strictEqual(ui.validateSettings(Object.assign(ui.createInitialState(), { minValue: 4, maxValue: 3 })).ok, false);
assert.strictEqual(ui.validateSettings(Object.assign(ui.createInitialState(), { minValue: 1.5, maxValue: 3 })).ok, false);

const source = fs.readFileSync('js/practice/practice-ui.js', 'utf8');
const html = fs.readFileSync('en/matrix-practice-generator.html', 'utf8');
assert.ok(!source.includes('Math.random'));
assert.ok(!source.includes('.click('));
assert.ok(!source.includes('void ui.generateSet()'));
assert.ok(source.includes('createPracticeUi(rootElement);'));
assert.ok(source.includes('renderEmptyState();'));
assert.ok(source.includes("value == null ? '' : String(value)"));
assert.ok(html.includes('Choose your settings and generate a matrix practice worksheet.'));
assert.ok(html.includes('.mp-toggle-panel[hidden]'));
assert.ok(source.includes('btn main core-main'));
assert.ok(html.includes('<button class="mobile-nav-toggle">Navigation</button>'));
assert.ok(html.includes('.mp-generate-row'));
assert.ok(html.includes('grid-template-columns: 1fr;'));
assert.ok(html.includes('grid-column: 1 / -1;'));
assert.ok(html.includes('width: 100%;'));
assert.ok(html.includes('justify-items: center;'));
assert.ok(html.includes('max-width: 320px;'));
assert.ok(html.includes('max-width: none;'));
assert.ok(!html.includes('<span class="globe-icon">Language</span> English'));
assert.ok(html.includes('<span class="globe-icon">🌐</span> English'));
assert.ok(html.includes('lang="es">Español</a>'));
assert.ok(html.includes('background: #8ecfe0;'));
assert.ok(html.includes('background: #79c3d6;'));
assert.ok(html.includes('background: #b7cbd3;'));
assert.ok(source.includes('resetToEmptyAfterTypeChange();'));
assert.ok(source.includes('state.generationToken += 1;'));
assert.ok(source.includes('renderEmptyState();'));
assert.ok(source.includes('els.list.innerHTML = \'\';'));
assert.ok(source.includes('if (token !== state.generationToken) return;'));

console.log('practice-ui formatter tests passed');
