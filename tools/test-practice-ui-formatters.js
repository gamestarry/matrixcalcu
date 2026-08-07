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

function makeProblem(type, dimensions, difficulty) {
    return {
        id: `${type}-problem`,
        type,
        difficulty: difficulty || 'easy',
        subtype: type === 'addition-subtraction' ? 'add' : null,
        dimensions: Object.assign({}, dimensions)
    };
}

function makeSet(type, count, dimensions, difficulty) {
    return {
        id: `${type}-set`,
        seed: `${type}-seed`,
        type,
        settings: { difficulty: difficulty || 'easy' },
        problems: Array.from({ length: count }, (_, index) => Object.assign(
            makeProblem(type, dimensions, difficulty),
            { id: `${type}-problem-${index}` }
        ))
    };
}

const addSubSix = makeSet('addition-subtraction', 6, { rows: 2, cols: 2 }, 'easy');
assert.strictEqual(ui.getWorksheetLayout(addSubSix), 'compact');
assert.strictEqual(ui.buildPageMetadata(addSubSix, 'worksheet').length, 1);
assert.deepStrictEqual(ui.buildPageMetadata(addSubSix, 'worksheet')[0].problems.map((item) => item.problemNumber), [1, 2, 3, 4, 5, 6]);

const addSubEight = makeSet('addition-subtraction', 8, { rows: 2, cols: 2 }, 'easy');
assert.strictEqual(ui.buildPageMetadata(addSubEight, 'worksheet').length, 2);
assert.deepStrictEqual(ui.buildPageMetadata(addSubEight, 'worksheet')[1].problems.map((item) => item.problemNumber), [7, 8]);

const multEasy = makeSet('multiplication', 6, { rowsA: 2, colsA: 2, colsB: 2 }, 'easy');
assert.strictEqual(ui.getWorksheetLayout(multEasy), 'compact');
assert.strictEqual(ui.buildPageMetadata(multEasy, 'worksheet').length, 1);

const multMedium = makeSet('multiplication', 6, { rowsA: 2, colsA: 3, colsB: 2 }, 'medium');
assert.strictEqual(ui.getWorksheetLayout(multMedium), 'regular');
assert.strictEqual(ui.buildPageMetadata(multMedium, 'worksheet').length, 2);

const multHard = makeSet('multiplication', 4, { rowsA: 3, colsA: 3, colsB: 3 }, 'hard');
assert.strictEqual(ui.getWorksheetLayout(multHard), 'wide');

const rrefTwoByThree = makeSet('rref', 6, { rows: 2, cols: 3 }, 'easy');
assert.strictEqual(ui.getWorksheetLayout(rrefTwoByThree), 'regular');
assert.strictEqual(ui.buildPageMetadata(rrefTwoByThree, 'worksheet').length, 2);
assert.deepStrictEqual(ui.buildPageMetadata(rrefTwoByThree, 'worksheet')[0].problems.map((item) => item.problemNumber), [1, 2, 3, 4]);
assert.deepStrictEqual(ui.buildPageMetadata(rrefTwoByThree, 'worksheet')[1].problems.map((item) => item.problemNumber), [5, 6]);
assert.strictEqual(ui.getWorksheetLayout(makeSet('rref', 6, { rows: 3, cols: 3 }, 'medium')), 'regular');
assert.strictEqual(ui.getWorksheetLayout(makeSet('linear-system', 6, { variables: 2 }, 'easy')), 'compact');
assert.strictEqual(ui.getWorksheetLayout(makeSet('linear-system', 6, { variables: 3 }, 'hard')), 'regular');

const originalProblems = addSubEight.problems.slice();
const chunks = ui.chunkProblems(addSubEight.problems, 6);
assert.deepStrictEqual(addSubEight.problems, originalProblems);
assert.strictEqual(chunks.length, 2);
assert.strictEqual(chunks[1].length, 2);

const answerPages = ui.buildPageMetadata(addSubEight, 'answer-key');
assert.deepStrictEqual(answerPages.flatMap((page) => page.problems.map((item) => item.problem.id)), addSubEight.problems.map((problem) => problem.id));

const worksheetItems = ui.buildWorksheetProblemItems(addSubEight);
assert.strictEqual(worksheetItems.length, 8);
assert.ok(worksheetItems.every((item) => item.includesAnswer === false && item.includesSteps === false));

assert.deepStrictEqual(ui.getWorksheetBlankMatrixDimensions({
    type: 'addition-subtraction',
    dimensions: { rows: 2, cols: 3 },
    exactAnswer: { matrix: [[1, 2, 3], [4, 5, 6]] }
}), { rows: 2, cols: 3 });
assert.deepStrictEqual(ui.getWorksheetBlankMatrixDimensions({
    type: 'multiplication',
    dimensions: { resultRows: 3, resultCols: 2 },
    exactAnswer: { matrix: [[1, 2], [3, 4], [5, 6]] }
}), { rows: 3, cols: 2 });
assert.deepStrictEqual(ui.getWorksheetBlankMatrixDimensions({
    type: 'rref',
    dimensions: { rows: 3, cols: 4 },
    exactAnswer: { matrix: [[1, 0, 0, 2]] }
}), { rows: 3, cols: 4 });
assert.strictEqual(ui.getWorksheetBlankMatrixDimensions({
    type: 'linear-system',
    dimensions: { variables: 2 },
    solutionType: 'unique'
}), null);

const poisonedAnswerProblem = {};
Object.defineProperty(poisonedAnswerProblem, 'type', { value: 'multiplication' });
Object.defineProperty(poisonedAnswerProblem, 'dimensions', { value: { resultRows: 2, resultCols: 2 } });
Object.defineProperty(poisonedAnswerProblem, 'exactAnswer', {
    get() {
        throw new Error('Worksheet blank matrix must not read exactAnswer.');
    }
});
assert.deepStrictEqual(ui.getWorksheetBlankMatrixDimensions(poisonedAnswerProblem), { rows: 2, cols: 2 });

const viewState = Object.assign(ui.createInitialState(), {
    currentSet: addSubSix,
    currentView: 'worksheet',
    generationToken: 11
});
assert.strictEqual(ui.applyViewModeChange(viewState, 'detailed-solutions'), true);
assert.strictEqual(viewState.currentView, 'detailed-solutions');
assert.strictEqual(viewState.currentSet, addSubSix);
assert.strictEqual(viewState.currentSet.seed, 'addition-subtraction-seed');
assert.strictEqual(viewState.generationToken, 11);

const emptyViewState = ui.createInitialState();
assert.strictEqual(ui.applyViewModeChange(emptyViewState, 'answer-key'), false);
assert.strictEqual(emptyViewState.currentView, 'worksheet');

assert.strictEqual(ui.validateSettings(initial).ok, true);
assert.strictEqual(ui.validateSettings(Object.assign(ui.createInitialState(), { minValue: 4, maxValue: 3 })).ok, false);
assert.strictEqual(ui.validateSettings(Object.assign(ui.createInitialState(), { minValue: 1.5, maxValue: 3 })).ok, false);

const source = fs.readFileSync('js/practice/practice-ui.js', 'utf8');
const html = fs.readFileSync('en/matrix-practice-generator.html', 'utf8');
assert.ok(!source.includes('Math.random'));
assert.ok(!source.includes('.click('));
assert.ok(!source.includes('window.print'));
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
assert.ok(html.includes('background: #93cfde;'));
assert.ok(html.includes('color: #12334a;'));
assert.ok(html.includes('background: #7fc3d5;'));
assert.ok(html.includes('background: #70b7cb;'));
assert.ok(html.includes('background: #c6d7dc;'));
assert.ok(html.includes('color: #60717a;'));
assert.ok(source.includes('resetToEmptyAfterTypeChange();'));
assert.ok(source.includes('state.generationToken += 1;'));
assert.ok(source.includes('renderEmptyState();'));
assert.ok(source.includes('els.list.innerHTML = \'\';'));
assert.ok(source.includes('if (token !== state.generationToken) return;'));
assert.ok(source.includes('buildPageMetadata'));
assert.ok(source.includes('renderPaperPage'));
assert.ok(source.includes('renderCurrentView'));
assert.ok(source.includes('downloadWorksheetPdf'));
assert.ok(source.includes('downloadAnswerKeyPdf'));
assert.ok(source.includes("downloadPdf('worksheet')"));
assert.ok(source.includes("downloadPdf('answer-key')"));
assert.ok(source.includes("downloadAdditionSubtractionWorksheetPdf"));
assert.ok(source.includes("downloadAdditionSubtractionAnswerKeyPdf"));
assert.ok(source.includes("state.currentSet.type === 'addition-subtraction'"));
assert.ok(source.includes("setPdfButtonsDisabled(true);"));
assert.ok(source.includes("els.downloadWorksheetPdf.textContent = t('downloadWorksheetPdf');"));
assert.ok(source.includes("els.downloadAnswerKeyPdf.textContent = t('downloadAnswerKeyPdf');"));
assert.ok(source.includes("activeButton.textContent = isAnswerKey ? t('creatingAnswerKeyPdf') : t('creatingWorksheetPdf');"));
assert.ok(source.includes("footer.textContent = 'matrixcalcu.com';"));
assert.ok(!source.includes('Generated by MatrixCalcu -'));
assert.ok(!source.includes('Print Worksheet'));
assert.ok(!source.includes('Print Answer Key'));
assert.ok(!source.includes('Headers and footers'));
assert.ok(html.includes('.mp-paper-header'));
assert.ok(html.includes('background: #ffffff;'));
assert.ok(html.includes('color: #1f2933;'));
assert.ok(html.includes('color: #5f6b73;'));
assert.ok(html.includes('border-bottom: 1px solid #d9dee3;'));
assert.ok(html.includes('box-shadow: none;'));
assert.ok(html.includes('border-radius: 0;'));
assert.ok(html.includes('content: none;'));
assert.ok(html.includes('@media print'));
assert.ok(html.includes('.mp-empty-matrix-wrap'));
assert.ok(html.includes('.mp-work-lines'));
assert.ok(html.includes('font-size: 10px;'));
assert.ok(html.includes('color: #8a939b;'));
assert.ok(html.includes('grid-template-rows: repeat(3, minmax(0, 1fr));'));
assert.ok(html.includes('grid-template-rows: repeat(2, minmax(0, 1fr));'));
assert.ok(html.includes('grid-template-rows: repeat(4, minmax(0, 1fr));'));
assert.ok(html.includes('Download Worksheet PDF'));
assert.ok(html.includes('Download Answer Key PDF'));
assert.ok(html.includes('Creating Worksheet PDF...'));
assert.ok(html.includes('Creating Answer Key PDF...'));
assert.ok(html.includes('.mp-pdf-actions'));
assert.ok(html.includes('.mp-pdf-button'));
assert.ok(html.includes('flex-wrap: wrap;'));
assert.ok(html.includes('gap: 8px;'));
assert.ok(html.includes('<script src="/js/vendor/pdf-lib-1.17.1.min.js"></script>'));
assert.ok(html.includes('<script src="/js/practice/practice-pdf.js"></script>'));
assert.ok(html.indexOf('/js/vendor/pdf-lib-1.17.1.min.js') < html.indexOf('/js/practice/practice-pdf.js'));
assert.ok(html.indexOf('/js/practice/practice-pdf.js') < html.indexOf('/js/practice/practice-ui.js'));
assert.ok(!html.includes('https://unpkg.com'));
assert.ok(!html.includes('https://cdn.jsdelivr.net'));
assert.ok(!html.includes('Headers and footers'));
assert.ok(!html.includes('More settings'));

console.log('practice-ui formatter tests passed');
