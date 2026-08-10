'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const pdfLib = require('../js/vendor/pdf-lib-1.17.1.min.js');
const pdf = require('../js/practice/practice-pdf.js');
const additionGenerator = require('../js/practice/generators/addition-subtraction.js');
const multiplicationGenerator = require('../js/practice/generators/multiplication.js');
const rrefGenerator = require('../js/practice/generators/rref.js');

function assertHeader(bytes) {
    const header = Buffer.from(bytes.slice(0, 4)).toString('ascii');
    assert.strictEqual(header, '%PDF');
}

function assertNoAnswerOrSteps(plan) {
    const text = JSON.stringify(Object.assign({}, plan, { labels: undefined }));
    assert.strictEqual(text.includes('exactAnswer'), false);
    assert.strictEqual(text.includes('steps'), false);
    assert.strictEqual(text.includes('Answer Key'), false);
    assert.strictEqual(text.includes('Detailed Solutions'), false);
}

function assertNoSteps(plan) {
    const text = JSON.stringify(Object.assign({}, plan, { labels: undefined }));
    assert.strictEqual(text.includes('steps'), false);
    assert.strictEqual(text.includes('Detailed Solutions'), false);
}

function collectStrings(value, out) {
    if (typeof value === 'string') {
        out.push(value);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => collectStrings(item, out));
        return;
    }
    if (value && typeof value === 'object') {
        Object.keys(value).forEach((key) => collectStrings(value[key], out));
    }
}

function assertNoSpanishPdfEnglish(value) {
    const strings = [];
    collectStrings(value, strings);
    const text = strings.join('\n');
    [
        'Matrix Practice Worksheet',
        'Matrix Practice Answer Key',
        'Matrix Addition and Subtraction',
        'Matrix Multiplication',
        'Systems of Linear Equations',
        'Row Reduction',
        'Solve each',
        'Show your work',
        'Multiply each',
        'Solve each system',
        'Find the RREF of',
        'Input Matrix',
        'Set seed',
        'Exact Answers',
        'Answer:',
        'Solution:',
        'Final RREF:',
        'Unique Solution',
        'No Solution',
        'Infinitely Many Solutions',
        'Page',
        'Name',
        'Date'
    ].forEach((phrase) => {
        assert.strictEqual(text.includes(phrase), false, `Unexpected English phrase in Spanish PDF plan: ${phrase}`);
    });
}

function ids(problemSet) {
    return problemSet.problems.map((problem) => problem.id);
}

async function pageCount(bytes) {
    const doc = await pdfLib.PDFDocument.load(bytes);
    return doc.getPageCount();
}

async function pageSizes(bytes) {
    const doc = await pdfLib.PDFDocument.load(bytes);
    return doc.getPages().map((page) => page.getSize());
}

async function pdfMetadata(bytes) {
    const doc = await pdfLib.PDFDocument.load(bytes);
    return {
        title: doc.getTitle(),
        author: doc.getAuthor(),
        creator: doc.getCreator(),
        subject: doc.getSubject()
    };
}

function makePoisonedSet() {
    const problem = {
        id: 'poisoned-1',
        type: 'addition-subtraction',
        subtype: 'add',
        difficulty: 'easy',
        inputs: {
            matrixA: [[1, 2], [3, 4]],
            matrixB: [[5, 6], [7, 8]]
        },
        dimensions: { rows: 2, cols: 2 }
    };
    Object.defineProperty(problem, 'exactAnswer', {
        get() {
            throw new Error('PDF worksheet plan must not read exactAnswer.');
        }
    });
    Object.defineProperty(problem, 'steps', {
        get() {
            throw new Error('PDF worksheet plan must not read steps.');
        }
    });
    return {
        id: 'poisoned-set',
        seed: 'poisoned-seed',
        type: 'addition-subtraction',
        settings: { difficulty: 'easy' },
        problems: [problem]
    };
}

function makeAnswerKeyPoisonedStepsSet() {
    const problem = {
        id: 'answer-poisoned-1',
        type: 'addition-subtraction',
        subtype: 'subtract',
        difficulty: 'easy',
        inputs: {
            matrixA: [[5, 4], [3, 2]],
            matrixB: [[1, 2], [3, 0]]
        },
        exactAnswer: {
            matrix: [[4, 2], [0, 2]]
        },
        dimensions: { rows: 2, cols: 2 }
    };
    Object.defineProperty(problem, 'steps', {
        get() {
            throw new Error('PDF answer key plan must not read steps.');
        }
    });
    return {
        id: 'answer-poisoned-set',
        seed: 'answer-poisoned-seed',
        type: 'addition-subtraction',
        settings: { difficulty: 'easy' },
        problems: [problem]
    };
}

function makeMultiplicationPoisonedWorksheetSet() {
    const problem = {
        id: 'multiplication-poisoned-1',
        type: 'multiplication',
        subtype: null,
        difficulty: 'medium',
        inputs: {
            matrixA: [[1, 2, 3], [4, 5, 6]],
            matrixB: [[1, 0], [0, 1], [1, 1]]
        },
        dimensions: {
            rowsA: 2,
            colsA: 3,
            rowsB: 3,
            colsB: 2,
            resultRows: 2,
            resultCols: 2
        }
    };
    Object.defineProperty(problem, 'exactAnswer', {
        get() {
            throw new Error('PDF multiplication worksheet plan must not read exactAnswer.');
        }
    });
    Object.defineProperty(problem, 'steps', {
        get() {
            throw new Error('PDF multiplication worksheet plan must not read steps.');
        }
    });
    return {
        id: 'multiplication-poisoned-set',
        seed: 'multiplication-poisoned-seed',
        type: 'multiplication',
        settings: { difficulty: 'medium' },
        problems: [problem]
    };
}

function makeMultiplicationPoisonedAnswerKeySet() {
    const problem = {
        id: 'multiplication-answer-poisoned-1',
        type: 'multiplication',
        subtype: null,
        difficulty: 'easy',
        inputs: {
            matrixA: [[1, 0], [2, 3]],
            matrixB: [[4, 5], [6, 7]]
        },
        exactAnswer: {
            matrix: [[4, 5], [26, 31]]
        },
        dimensions: {
            rowsA: 2,
            colsA: 2,
            rowsB: 2,
            colsB: 2,
            resultRows: 2,
            resultCols: 2
        }
    };
    Object.defineProperty(problem, 'steps', {
        get() {
            throw new Error('PDF multiplication answer key plan must not read steps.');
        }
    });
    return {
        id: 'multiplication-answer-poisoned-set',
        seed: 'multiplication-answer-poisoned-seed',
        type: 'multiplication',
        settings: { difficulty: 'easy' },
        problems: [problem]
    };
}

function makeRrefPoisonedWorksheetSet() {
    const problem = {
        id: 'rref-poisoned-1',
        type: 'rref',
        subtype: null,
        difficulty: 'easy',
        inputs: {
            matrix: [[1, 2, 3], [4, 5, 6]]
        },
        dimensions: { rows: 2, cols: 3 }
    };
    Object.defineProperty(problem, 'exactAnswer', {
        get() {
            throw new Error('PDF RREF worksheet plan must not read exactAnswer.');
        }
    });
    Object.defineProperty(problem, 'steps', {
        get() {
            throw new Error('PDF RREF worksheet plan must not read steps.');
        }
    });
    return {
        id: 'rref-poisoned-worksheet-set',
        seed: 'rref-poisoned-seed',
        type: 'rref',
        settings: { difficulty: 'easy' },
        problems: [problem]
    };
}

function makeRrefPoisonedAnswerKeySet() {
    const problem = {
        id: 'rref-answer-poisoned-1',
        type: 'rref',
        subtype: null,
        difficulty: 'easy',
        inputs: {
            matrix: [[2, 4, 6], [1, 3, 5]]
        },
        exactAnswer: {
            matrix: [
                [1, 0, { kind: 'fraction', numerator: -1, denominator: 2 }],
                [0, 1, { kind: 'fraction', numerator: 7, denominator: 4 }]
            ]
        },
        dimensions: { rows: 2, cols: 3 }
    };
    Object.defineProperty(problem, 'steps', {
        get() {
            throw new Error('PDF RREF answer key plan must not read steps.');
        }
    });
    return {
        id: 'rref-answer-poisoned-set',
        seed: 'rref-answer-poisoned-seed',
        type: 'rref',
        settings: { difficulty: 'easy' },
        problems: [problem]
    };
}

function makeLinearSystemProblem(id, variables, solutionType) {
    const coefficientMatrix = variables === 3
        ? [[1, -1, 2], [0, 3, -1], [2, 0, 1]]
        : [[1, -1], [2, 1]];
    const constants = variables === 3 ? [4, -2, 5] : [3, 7];
    const answer = {
        solutionType,
        rrefMatrix: variables === 3
            ? [[1, 0, 0, 2], [0, 1, 0, -1], [0, 0, 1, { kind: 'fraction', numerator: 3, denominator: 2 }]]
            : [[1, 0, { kind: 'fraction', numerator: 1, denominator: 2 }], [0, 1, -3]]
    };
    if (solutionType === 'unique') {
        answer.solution = variables === 3
            ? [2, -1, { kind: 'fraction', numerator: 3, denominator: 2 }]
            : [{ kind: 'fraction', numerator: 1, denominator: 2 }, -3];
    } else if (solutionType === 'none') {
        answer.rrefMatrix = variables === 3
            ? [[1, 0, 2, 0], [0, 1, -1, 0], [0, 0, 0, 1]]
            : [[1, 0, 2], [0, 0, 1]];
        answer.contradictionRows = [{ row: variables - 1, constant: 1 }];
    } else {
        answer.rrefMatrix = variables === 3
            ? [[1, 0, -2, 1], [0, 1, 3, -4], [0, 0, 0, 0]]
            : [[1, -2, 5], [0, 0, 0]];
        answer.pivotVariables = variables === 3 ? ['x', 'y'] : ['x'];
        answer.freeVariables = variables === 3 ? ['z'] : ['y'];
        answer.expressions = variables === 3 ? [
            { variable: 'x', isFree: false, constant: 1, terms: [{ freeVariable: 'z', coefficient: 2 }] },
            { variable: 'y', isFree: false, constant: -4, terms: [{ freeVariable: 'z', coefficient: -3 }] },
            { variable: 'z', isFree: true, constant: 0, terms: [] }
        ] : [
            { variable: 'x', isFree: false, constant: 5, terms: [{ freeVariable: 'y', coefficient: 2 }] },
            { variable: 'y', isFree: true, constant: 0, terms: [] }
        ];
    }
    return {
        id,
        type: 'linear-system',
        subtype: solutionType,
        solutionType,
        difficulty: variables === 3 ? 'hard' : 'easy',
        inputs: { coefficientMatrix, constants },
        exactAnswer: answer,
        steps: [{ kind: 'form-augmented-matrix' }],
        dimensions: { equations: variables, variables, augmentedCols: variables + 1 }
    };
}

function makeLinearSystemSet(seed, count, variables, solutionType) {
    const types = solutionType === 'mixed' ? ['unique', 'none', 'infinite'] : [solutionType];
    return {
        id: `${seed}-set`,
        seed,
        type: 'linear-system',
        settings: { count, variables, solutionType },
        problems: Array.from({ length: count }, (_, index) => (
            makeLinearSystemProblem(`${seed}-${index + 1}`, variables, types[index % types.length])
        ))
    };
}

function makeLinearSystemPoisonedWorksheetSet() {
    const problem = makeLinearSystemProblem('linear-poisoned-1', 2, 'unique');
    Object.defineProperty(problem, 'exactAnswer', {
        get() {
            throw new Error('Linear Systems worksheet plan must not read exactAnswer.');
        }
    });
    Object.defineProperty(problem, 'solutionType', {
        get() {
            throw new Error('Linear Systems worksheet plan must not read solutionType.');
        }
    });
    Object.defineProperty(problem, 'steps', {
        get() {
            throw new Error('Linear Systems worksheet plan must not read steps.');
        }
    });
    return {
        id: 'linear-poisoned-worksheet-set',
        seed: 'linear-poisoned-seed',
        type: 'linear-system',
        settings: { variables: 2 },
        problems: [problem]
    };
}

function makeLinearSystemPoisonedAnswerKeySet() {
    const problem = makeLinearSystemProblem('linear-answer-poisoned-1', 2, 'infinite');
    Object.defineProperty(problem, 'steps', {
        get() {
            throw new Error('Linear Systems answer key plan must not read steps.');
        }
    });
    return {
        id: 'linear-answer-poisoned-set',
        seed: 'linear-answer-poisoned-seed',
        type: 'linear-system',
        settings: { variables: 2 },
        problems: [problem]
    };
}

function assertFractionDrawsAsStackedFraction() {
    const calls = [];
    const page = {
        drawLine(args) {
            calls.push({ kind: 'line', args });
        },
        drawText(text, args) {
            calls.push({ kind: 'text', text, args });
        }
    };
    const font = {
        widthOfTextAtSize(text, size) {
            return String(text).length * size * 0.55;
        }
    };
    const fonts = { regular: font };
    pdf.__test.drawMatrix(page, [[
        0,
        { kind: 'fraction', numerator: 1, denominator: 2 },
        { kind: 'fraction', numerator: -1, denominator: 3 },
        { kind: 'fraction', numerator: 4, denominator: 1 }
    ]], 10, 80, fonts, {
        color: 'black',
        cellWidth: 34,
        cellHeight: 26,
        fontSize: 10
    });
    assert(calls.some((call) => call.kind === 'text' && call.text === '0'));
    assert(calls.some((call) => call.kind === 'text' && call.text === '1'));
    assert(calls.some((call) => call.kind === 'text' && call.text === '2'));
    assert(calls.some((call) => call.kind === 'text' && call.text === '-1'));
    assert(calls.some((call) => call.kind === 'text' && call.text === '3'));
    assert(calls.some((call) => call.kind === 'text' && call.text === '4'));
    assert(calls.some((call) => call.kind === 'line' && call.args.thickness === 0.7));
    assert(!calls.some((call) => call.kind === 'text' && call.text === '4/1'));
    assert(!calls.some((call) => call.kind === 'text' && /0\.5|0\.333333|-0\.333333/.test(call.text)));
}

function captureRrefWorksheetProblemDraws() {
    const calls = [];
    const page = {
        drawLine(args) {
            calls.push({ kind: 'line', args });
        },
        drawText(text, args) {
            calls.push({ kind: 'text', text, args });
        }
    };
    const font = {
        widthOfTextAtSize(text, size) {
            return String(text).length * size * 0.55;
        }
    };
    const fonts = { regular: font, bold: font };
    const colors = { text: 'text', muted: 'muted', line: 'line' };
    pdf.__test.drawRrefWorksheetProblem(page, {
        globalNumber: 1,
        matrix: [[1, 2, 3], [4, 5, 6]],
        rows: 2,
        cols: 3,
        answerDimensions: { rows: 2, cols: 3 }
    }, {
        x: 36,
        y: 646,
        width: 260,
        height: 285
    }, fonts, colors);
    return calls;
}

function assertContinuousNumbers(plan) {
    const numbers = plan.pages.flatMap((page) => page.problems.map((problem) => problem.globalNumber));
    assert.deepStrictEqual(numbers, Array.from({ length: numbers.length }, (_, index) => index + 1));
}

async function runTests() {
    const rows = [];

    assert.strictEqual(typeof pdfLib.PDFDocument.create, 'function');
    const vendorSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'vendor', 'pdf-lib-1.17.1.min.js'), 'utf8');
    assert(vendorSource.includes('.PDFLib={}'));
    rows.push(['T01', 'local pdf-lib UMD can load in Node and exposes browser namespace strategy', 'pass']);

    const six = additionGenerator.generateAdditionSubtractionSet({
        seed: 'pdf-add-sub-six',
        count: 6,
        difficulty: 'easy',
        operation: 'mixed',
        rows: 2,
        cols: 2,
        minValue: 0,
        maxValue: 5,
        includeNegatives: false
    });
    const eight = additionGenerator.generateAdditionSubtractionSet(Object.assign({}, six.settings, { seed: 'pdf-add-sub-eight', count: 8 }));
    const ten = additionGenerator.generateAdditionSubtractionSet(Object.assign({}, six.settings, { seed: 'pdf-add-sub-ten', count: 10 }));

    assert.throws(() => pdf.buildAdditionSubtractionWorksheetPlan({ type: 'multiplication', problems: [] }), /Unsupported PDF worksheet type: multiplication/);
    assert.throws(() => pdf.buildAdditionSubtractionAnswerKeyPlan({ type: 'multiplication', problems: [] }), /Unsupported PDF answer key type: multiplication/);
    assert.throws(() => pdf.buildMultiplicationWorksheetPlan({ type: 'rref', problems: [] }), /Unsupported multiplication worksheet type: rref/);
    assert.throws(() => pdf.buildMultiplicationAnswerKeyPlan({ type: 'linear-system', problems: [] }), /Unsupported multiplication answer key type: linear-system/);
    rows.push(['T02', 'build plan accepts only addition/subtraction sets', 'pass']);

    const planSix = pdf.buildAdditionSubtractionWorksheetPlan(six);
    assert.deepStrictEqual(planSix.paper, { width: 612, height: 792 });
    assert.strictEqual(planSix.layout.problemsPerPage, 6);
    assert.strictEqual(planSix.layout.columns, 2);
    assert.strictEqual(planSix.layout.rows, 3);
    assert.strictEqual(planSix.layout.footer, 'matrixcalcu.com');
    assert.strictEqual(planSix.pages.length, 1);
    assert.deepStrictEqual(planSix.pages[0].problems.map((item) => item.globalNumber), [1, 2, 3, 4, 5, 6]);
    assert.deepStrictEqual(planSix.pages[0].problems.map((item) => item.id), ids(six));
    assertNoAnswerOrSteps(planSix);
    rows.push(['T03', 'six-problem plan is one Letter page with continuous numbering and no answers', 'pass']);

    const planEight = pdf.buildAdditionSubtractionWorksheetPlan(eight);
    assert.strictEqual(planEight.pages.length, 2);
    assert.deepStrictEqual(planEight.pages[1].problems.map((item) => item.globalNumber), [7, 8]);
    assert.strictEqual(planEight.pages[1].problems.length, 2);
    const planTen = pdf.buildAdditionSubtractionWorksheetPlan(ten);
    assert.strictEqual(planTen.pages.length, 2);
    assert.deepStrictEqual(planTen.pages[1].problems.map((item) => item.globalNumber), [7, 8, 9, 10]);
    assert.strictEqual(planTen.pages[1].problems.length, 4);
    rows.push(['T04', 'eight and ten problems paginate without fake problems', 'pass']);

    assert.deepStrictEqual(planSix.pages[0].problems[0].matrixA, six.problems[0].inputs.matrixA);
    assert.deepStrictEqual(planSix.pages[0].problems[0].matrixB, six.problems[0].inputs.matrixB);
    assert.deepStrictEqual(planSix.pages[0].problems[0].answerDimensions, {
        rows: six.problems[0].dimensions.rows,
        cols: six.problems[0].dimensions.cols
    });
    pdf.buildAdditionSubtractionWorksheetPlan(makePoisonedSet());
    rows.push(['T05', 'plan stores matrices and blank answer dimensions without reading exact answers or steps', 'pass']);

    const answerPlanSix = pdf.buildAdditionSubtractionAnswerKeyPlan(six);
    assert.deepStrictEqual(answerPlanSix.paper, { width: 612, height: 792 });
    assert.strictEqual(answerPlanSix.kind, 'answer-key');
    assert.strictEqual(answerPlanSix.title, 'Matrix Practice Answer Key');
    assert.strictEqual(answerPlanSix.subtitle, 'Matrix Addition and Subtraction');
    assert.strictEqual(answerPlanSix.layout.problemsPerPage, 6);
    assert.strictEqual(answerPlanSix.layout.columns, 2);
    assert.strictEqual(answerPlanSix.layout.rows, 3);
    assert.strictEqual(answerPlanSix.layout.footer, 'matrixcalcu.com');
    assert.deepStrictEqual(answerPlanSix.pages[0].problems.map((item) => item.globalNumber), [1, 2, 3, 4, 5, 6]);
    assert.deepStrictEqual(answerPlanSix.pages[0].problems.map((item) => item.id), ids(six));
    assert.deepStrictEqual(answerPlanSix.pages[0].problems[0].matrixA, six.problems[0].inputs.matrixA);
    assert.deepStrictEqual(answerPlanSix.pages[0].problems[0].matrixB, six.problems[0].inputs.matrixB);
    assert.deepStrictEqual(answerPlanSix.pages[0].problems[0].exactAnswer, six.problems[0].exactAnswer.matrix);
    assert.strictEqual(answerPlanSix.pages[0].problems[0].operator, six.problems[0].subtype === 'subtract' ? '-' : '+');
    assertNoSteps(answerPlanSix);
    const originalAnswer = six.problems[0].exactAnswer.matrix[0][0];
    answerPlanSix.pages[0].problems[0].exactAnswer[0][0] = 999;
    assert.strictEqual(six.problems[0].exactAnswer.matrix[0][0], originalAnswer);
    pdf.buildAdditionSubtractionAnswerKeyPlan(makeAnswerKeyPoisonedStepsSet());
    rows.push(['T06', 'answer key plan stores original matrices and exact answers without reading steps', 'pass']);

    const before = JSON.stringify(six);
    const bytesSix = await pdf.createAdditionSubtractionWorksheetPdf(six, {
        pdfLib,
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    assert(bytesSix instanceof Uint8Array);
    assertHeader(bytesSix);
    assert.strictEqual(await pageCount(bytesSix), 1);
    assert.deepStrictEqual(await pageSizes(bytesSix), [{ width: 612, height: 792 }]);
    assert.strictEqual(JSON.stringify(six), before);
    rows.push(['T07', 'six-problem worksheet PDF is a valid one-page Letter PDF and does not mutate the set', 'pass']);

    const bytesEight = await pdf.createAdditionSubtractionWorksheetPdf(eight, {
        pdfLib,
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    assert.strictEqual(await pageCount(bytesEight), 2);
    (await pageSizes(bytesEight)).forEach((size) => assert.deepStrictEqual(size, { width: 612, height: 792 }));
    rows.push(['T08', 'eight-problem worksheet PDF is two Letter pages', 'pass']);

    const answerPlanEight = pdf.buildAdditionSubtractionAnswerKeyPlan(eight);
    assert.strictEqual(answerPlanEight.pages.length, 2);
    assert.deepStrictEqual(answerPlanEight.pages[1].problems.map((item) => item.globalNumber), [7, 8]);
    assert.strictEqual(answerPlanEight.pages[1].problems.length, 2);
    const answerPlanTen = pdf.buildAdditionSubtractionAnswerKeyPlan(ten);
    assert.strictEqual(answerPlanTen.pages.length, 2);
    assert.deepStrictEqual(answerPlanTen.pages[1].problems.map((item) => item.globalNumber), [7, 8, 9, 10]);
    assert.strictEqual(answerPlanTen.pages[1].problems.length, 4);
    const answerBytes = await pdf.createAdditionSubtractionAnswerKeyPdf(eight, {
        pdfLib,
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    assert(answerBytes instanceof Uint8Array);
    assertHeader(answerBytes);
    assert.strictEqual(await pageCount(answerBytes), 2);
    (await pageSizes(answerBytes)).forEach((size) => assert.deepStrictEqual(size, { width: 612, height: 792 }));
    assert.deepStrictEqual(await pdfMetadata(answerBytes), {
        title: 'Matrix Addition and Subtraction Practice Answer Key',
        author: 'MatrixCalcu',
        creator: 'MatrixCalcu',
        subject: 'Matrix addition and subtraction practice answer key'
    });
    rows.push(['T09', 'answer key PDF paginates six per page and has answer-key metadata', 'pass']);

    const filename = pdf.createPdfFilename({ seed: 'My Seed: 01/Unsafe?' }, 'worksheet');
    assert.strictEqual(filename, 'matrix-addition-subtraction-worksheet-my-seed-01-unsafe.pdf');
    assert(!/\s|[:/?#\\]/.test(filename));
    assert.strictEqual(
        pdf.createPdfFilename({ seed: 'My Seed: 01/Unsafe?' }, 'answer-key'),
        'matrix-addition-subtraction-answer-key-my-seed-01-unsafe.pdf'
    );
    rows.push(['T10', 'filenames use safe normalized kind and seed with no runtime timestamp', 'pass']);

    const multEasySix = multiplicationGenerator.generateMultiplicationSet({
        seed: 'pdf-multiplication-easy-six',
        count: 6,
        difficulty: 'easy',
        rowsA: 2,
        colsA: 2,
        colsB: 2,
        minValue: 0,
        maxValue: 5,
        includeNegatives: false
    });
    const multEasyEight = multiplicationGenerator.generateMultiplicationSet(Object.assign({}, multEasySix.settings, {
        seed: 'pdf-multiplication-easy-eight',
        count: 8
    }));
    const multEasyTen = multiplicationGenerator.generateMultiplicationSet(Object.assign({}, multEasySix.settings, {
        seed: 'pdf-multiplication-easy-ten',
        count: 10
    }));
    const multMediumSix = multiplicationGenerator.generateMultiplicationSet({
        seed: 'pdf-multiplication-medium-six',
        count: 6,
        difficulty: 'medium',
        minValue: -5,
        maxValue: 5,
        includeNegatives: true
    });
    const multHardSix = multiplicationGenerator.generateMultiplicationSet({
        seed: 'pdf-multiplication-hard-six',
        count: 6,
        difficulty: 'hard',
        minValue: -7,
        maxValue: 7,
        includeNegatives: true
    });

    const multWorksheetSix = pdf.buildMultiplicationWorksheetPlan(multEasySix);
    assert.strictEqual(multWorksheetSix.kind, 'worksheet');
    assert.strictEqual(multWorksheetSix.type, 'multiplication');
    assert.deepStrictEqual(multWorksheetSix.paper, { width: 612, height: 792 });
    assert.strictEqual(multWorksheetSix.title, 'Matrix Practice Worksheet');
    assert.strictEqual(multWorksheetSix.subtitle, 'Matrix Multiplication');
    assert.strictEqual(multWorksheetSix.instructions, 'Multiply each pair of matrices. Show your work.');
    assert.strictEqual(multWorksheetSix.layout.name, 'compact');
    assert.strictEqual(multWorksheetSix.layout.problemsPerPage, 6);
    assert.strictEqual(multWorksheetSix.layout.columns, 2);
    assert.strictEqual(multWorksheetSix.layout.rows, 3);
    assert.strictEqual(multWorksheetSix.pages.length, 1);
    assert.deepStrictEqual(multWorksheetSix.pages[0].problems.map((item) => item.id), ids(multEasySix));
    assert.deepStrictEqual(multWorksheetSix.pages[0].problems.map((item) => item.globalNumber), [1, 2, 3, 4, 5, 6]);
    assert.deepStrictEqual(multWorksheetSix.pages[0].problems[0].matrixA, multEasySix.problems[0].inputs.matrixA);
    assert.deepStrictEqual(multWorksheetSix.pages[0].problems[0].matrixB, multEasySix.problems[0].inputs.matrixB);
    assert.deepStrictEqual(multWorksheetSix.pages[0].problems[0].resultDimensions, { rows: 2, cols: 2 });
    assertNoAnswerOrSteps(multWorksheetSix);
    pdf.buildMultiplicationWorksheetPlan(makeMultiplicationPoisonedWorksheetSet());
    rows.push(['T11', 'multiplication worksheet plan uses compact Letter layout and does not read answers or steps', 'pass']);

    const multWorksheetEight = pdf.buildMultiplicationWorksheetPlan(multEasyEight);
    assert.strictEqual(multWorksheetEight.pages.length, 2);
    assert.deepStrictEqual(multWorksheetEight.pages[1].problems.map((item) => item.globalNumber), [7, 8]);
    assert.strictEqual(multWorksheetEight.pages[1].problems.length, 2);
    const multWorksheetTen = pdf.buildMultiplicationWorksheetPlan(multEasyTen);
    assert.strictEqual(multWorksheetTen.pages.length, 2);
    assert.deepStrictEqual(multWorksheetTen.pages[1].problems.map((item) => item.globalNumber), [7, 8, 9, 10]);
    assert.strictEqual(multWorksheetTen.pages[1].problems.length, 4);
    assertContinuousNumbers(multWorksheetTen);
    assert.strictEqual(pdf.buildMultiplicationWorksheetPlan(multMediumSix).layout.name, 'regular');
    assert.strictEqual(pdf.buildMultiplicationWorksheetPlan(multMediumSix).layout.problemsPerPage, 4);
    assert.strictEqual(pdf.buildMultiplicationWorksheetPlan(multMediumSix).pages.length, 2);
    assert.strictEqual(pdf.buildMultiplicationWorksheetPlan(multHardSix).layout.name, 'wide');
    assert.strictEqual(pdf.buildMultiplicationWorksheetPlan(multHardSix).layout.problemsPerPage, 4);
    assert.strictEqual(pdf.buildMultiplicationWorksheetPlan(multHardSix).pages.length, 2);
    rows.push(['T12', 'multiplication worksheet pagination matches fixed screen compact, regular, and wide rules', 'pass']);

    const manualTwoByThreeTimesThreeByTwo = {
        seed: 'manual-2x3x2',
        type: 'multiplication',
        settings: { difficulty: 'medium' },
        problems: [{
            id: 'manual-1',
            type: 'multiplication',
            difficulty: 'medium',
            inputs: {
                matrixA: [[1, 2, 3], [4, 5, 6]],
                matrixB: [[7, 8], [9, 10], [11, 12]]
            },
            exactAnswer: { matrix: [[58, 64], [139, 154]] },
            steps: [],
            dimensions: { rowsA: 2, colsA: 3, rowsB: 3, colsB: 2, resultRows: 2, resultCols: 2 }
        }]
    };
    const manualThreeByTwoTimesTwoByThree = {
        seed: 'manual-3x2x3',
        type: 'multiplication',
        settings: { difficulty: 'medium' },
        problems: [{
            id: 'manual-2',
            type: 'multiplication',
            difficulty: 'medium',
            inputs: {
                matrixA: [[1, 2], [3, 4], [5, 6]],
                matrixB: [[7, 8, 9], [10, 11, 12]]
            },
            exactAnswer: { matrix: [[27, 30, 33], [61, 68, 75], [95, 106, 117]] },
            steps: [],
            dimensions: { rowsA: 3, colsA: 2, rowsB: 2, colsB: 3, resultRows: 3, resultCols: 3 }
        }]
    };
    assert.deepStrictEqual(pdf.buildMultiplicationWorksheetPlan(manualTwoByThreeTimesThreeByTwo).pages[0].problems[0].resultDimensions, { rows: 2, cols: 2 });
    assert.deepStrictEqual(pdf.buildMultiplicationWorksheetPlan(manualThreeByTwoTimesTwoByThree).pages[0].problems[0].resultDimensions, { rows: 3, cols: 3 });
    rows.push(['T13', 'multiplication worksheet blank answer dimensions come from true result dimensions', 'pass']);

    const multAnswerKeyEight = pdf.buildMultiplicationAnswerKeyPlan(multEasyEight);
    assert.strictEqual(multAnswerKeyEight.kind, 'answer-key');
    assert.strictEqual(multAnswerKeyEight.type, 'multiplication');
    assert.strictEqual(multAnswerKeyEight.title, 'Matrix Practice Answer Key');
    assert.strictEqual(multAnswerKeyEight.subtitle, 'Matrix Multiplication');
    assert.strictEqual(multAnswerKeyEight.layout.name, 'compact');
    assert.strictEqual(multAnswerKeyEight.layout.problemsPerPage, 8);
    assert.strictEqual(multAnswerKeyEight.pages.length, 1);
    assert.deepStrictEqual(multAnswerKeyEight.pages[0].problems.map((item) => item.globalNumber), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepStrictEqual(multAnswerKeyEight.pages[0].problems[0].exactAnswer, multEasyEight.problems[0].exactAnswer.matrix);
    assertNoSteps(multAnswerKeyEight);
    const multOriginalAnswer = multEasyEight.problems[0].exactAnswer.matrix[0][0];
    multAnswerKeyEight.pages[0].problems[0].exactAnswer[0][0] = -999;
    assert.strictEqual(multEasyEight.problems[0].exactAnswer.matrix[0][0], multOriginalAnswer);
    pdf.buildMultiplicationAnswerKeyPlan(makeMultiplicationPoisonedAnswerKeySet());
    assert.strictEqual(pdf.buildMultiplicationAnswerKeyPlan(multEasyTen).pages.length, 2);
    assert.strictEqual(pdf.buildMultiplicationAnswerKeyPlan(multHardSix).layout.problemsPerPage, 4);
    rows.push(['T14', 'multiplication answer key plan uses exactAnswer, omits steps, and follows screen answer-key pagination', 'pass']);

    const multBefore = JSON.stringify(multEasySix);
    const multWorksheetBytes = await pdf.createMultiplicationWorksheetPdf(multEasySix, {
        pdfLib,
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    const multAnswerBytes = await pdf.createMultiplicationAnswerKeyPdf(multEasyEight, {
        pdfLib,
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    assert(multWorksheetBytes instanceof Uint8Array);
    assert(multAnswerBytes instanceof Uint8Array);
    assertHeader(multWorksheetBytes);
    assertHeader(multAnswerBytes);
    assert.strictEqual(await pageCount(multWorksheetBytes), 1);
    assert.strictEqual(await pageCount(multAnswerBytes), 1);
    (await pageSizes(multWorksheetBytes)).forEach((size) => assert.deepStrictEqual(size, { width: 612, height: 792 }));
    (await pageSizes(multAnswerBytes)).forEach((size) => assert.deepStrictEqual(size, { width: 612, height: 792 }));
    assert.strictEqual(JSON.stringify(multEasySix), multBefore);
    assert.deepStrictEqual(await pdfMetadata(multWorksheetBytes), {
        title: 'Matrix Multiplication Practice Worksheet',
        author: 'MatrixCalcu',
        creator: 'MatrixCalcu',
        subject: 'Matrix multiplication practice worksheet'
    });
    assert.deepStrictEqual(await pdfMetadata(multAnswerBytes), {
        title: 'Matrix Multiplication Practice Answer Key',
        author: 'MatrixCalcu',
        creator: 'MatrixCalcu',
        subject: 'Matrix multiplication practice answer key'
    });
    rows.push(['T15', 'multiplication PDFs are valid Letter Uint8Arrays with metadata and do not mutate sets', 'pass']);

    assert.strictEqual(
        pdf.createPdfFilename({ type: 'multiplication', seed: 'My Seed: 01/Unsafe?' }, 'worksheet'),
        'matrix-multiplication-worksheet-my-seed-01-unsafe.pdf'
    );
    assert.strictEqual(
        pdf.createPdfFilename({ type: 'multiplication', seed: 'My Seed: 01/Unsafe?' }, 'answer-key'),
        'matrix-multiplication-answer-key-my-seed-01-unsafe.pdf'
    );
    assert(!/\s|[:/?#\\]/.test(pdf.createPdfFilename({ type: 'multiplication', seed: 'My Seed: 01/Unsafe?' }, 'answer-key')));
    rows.push(['T16', 'multiplication filenames use type-specific safe worksheet and answer-key names', 'pass']);

    assert.throws(() => pdf.buildRrefWorksheetPlan({ type: 'multiplication', problems: [] }), /Unsupported RREF worksheet type: multiplication/);
    assert.throws(() => pdf.buildRrefAnswerKeyPlan({ type: 'addition-subtraction', problems: [] }), /Unsupported RREF answer key type: addition-subtraction/);
    rows.push(['T17', 'RREF-specific builders accept only RREF problem sets', 'pass']);

    const rrefFour = await rrefGenerator.generateRrefSet({
        seed: 'pdf-rref-four',
        count: 4,
        difficulty: 'easy',
        rows: 2,
        cols: 3,
        minValue: 0,
        maxValue: 5,
        includeNegatives: false
    });
    const rrefSix = await rrefGenerator.generateRrefSet(Object.assign({}, rrefFour.settings, { seed: 'pdf-rref-six', count: 6 }));
    const rrefEight = await rrefGenerator.generateRrefSet(Object.assign({}, rrefFour.settings, { seed: 'pdf-rref-eight', count: 8 }));
    const rrefTen = await rrefGenerator.generateRrefSet(Object.assign({}, rrefFour.settings, { seed: 'pdf-rref-ten', count: 10 }));
    const rrefMedium = await rrefGenerator.generateRrefSet({
        seed: 'pdf-rref-medium',
        count: 6,
        difficulty: 'medium',
        rows: 3,
        cols: 3,
        minValue: -5,
        maxValue: 5,
        includeNegatives: true
    });
    const rrefHard = await rrefGenerator.generateRrefSet({
        seed: 'pdf-rref-hard',
        count: 6,
        difficulty: 'hard',
        rows: 3,
        cols: 4,
        minValue: -7,
        maxValue: 7,
        includeNegatives: true
    });

    const rrefWorksheetFour = pdf.buildRrefWorksheetPlan(rrefFour);
    assert.strictEqual(rrefWorksheetFour.kind, 'worksheet');
    assert.strictEqual(rrefWorksheetFour.type, 'rref');
    assert.deepStrictEqual(rrefWorksheetFour.paper, { width: 612, height: 792 });
    assert.strictEqual(rrefWorksheetFour.subtitle, 'Reduced Row Echelon Form');
    assert.strictEqual(rrefWorksheetFour.instructions, 'Reduce each matrix to reduced row echelon form (RREF). Show your work.');
    assert.strictEqual(rrefWorksheetFour.layout.problemsPerPage, 4);
    assert.strictEqual(rrefWorksheetFour.layout.columns, 2);
    assert.strictEqual(rrefWorksheetFour.layout.rows, 2);
    assert.strictEqual(rrefWorksheetFour.pages.length, 1);
    assert.deepStrictEqual(rrefWorksheetFour.pages[0].problems.map((item) => item.globalNumber), [1, 2, 3, 4]);
    assert.deepStrictEqual(rrefWorksheetFour.pages[0].problems.map((item) => item.id), ids(rrefFour));
    assert.deepStrictEqual(rrefWorksheetFour.pages[0].problems[0].matrix, rrefFour.problems[0].inputs.matrix);
    assert.deepStrictEqual(rrefWorksheetFour.pages[0].problems[0].answerDimensions, { rows: 2, cols: 3 });
    assertNoAnswerOrSteps(rrefWorksheetFour);
    pdf.buildRrefWorksheetPlan(makeRrefPoisonedWorksheetSet());
    rows.push(['T18', 'RREF worksheet plan is 4 per Letter page and omits exact answers and steps', 'pass']);

    const rrefWorksheetSix = pdf.buildRrefWorksheetPlan(rrefSix);
    assert.strictEqual(rrefWorksheetSix.pages.length, 2);
    assert.deepStrictEqual(rrefWorksheetSix.pages[1].problems.map((item) => item.globalNumber), [5, 6]);
    assert.strictEqual(rrefWorksheetSix.pages[1].problems.length, 2);
    assert.strictEqual(pdf.buildRrefWorksheetPlan(rrefEight).pages.length, 2);
    assert.strictEqual(pdf.buildRrefWorksheetPlan(rrefTen).pages.length, 3);
    assert.strictEqual(pdf.buildRrefWorksheetPlan(rrefMedium).layout.problemsPerPage, 4);
    assert.strictEqual(pdf.buildRrefWorksheetPlan(rrefHard).layout.problemsPerPage, 4);
    assertContinuousNumbers(pdf.buildRrefWorksheetPlan(rrefTen));
    rows.push(['T19', 'RREF worksheet pagination is fixed at 4 problems for all difficulties', 'pass']);

    const rrefAnswerPlan = pdf.buildRrefAnswerKeyPlan(rrefSix);
    assert.strictEqual(rrefAnswerPlan.kind, 'answer-key');
    assert.strictEqual(rrefAnswerPlan.type, 'rref');
    assert.strictEqual(rrefAnswerPlan.subtitle, 'Row Reduction (RREF)');
    assert.strictEqual(rrefAnswerPlan.layout.problemsPerPage, 4);
    assert.strictEqual(rrefAnswerPlan.pages.length, 2);
    assert.deepStrictEqual(rrefAnswerPlan.pages[1].problems.map((item) => item.globalNumber), [5, 6]);
    assert.deepStrictEqual(rrefAnswerPlan.pages[0].problems[0].matrix, rrefSix.problems[0].inputs.matrix);
    assert.deepStrictEqual(rrefAnswerPlan.pages[0].problems[0].exactAnswer, rrefSix.problems[0].exactAnswer.matrix);
    assertNoSteps(rrefAnswerPlan);
    const rrefOriginalNumerator = rrefAnswerPlan.pages[0].problems
        .flatMap((item) => item.exactAnswer)
        .flat()
        .find((value) => value && typeof value === 'object');
    if (rrefOriginalNumerator) {
        const problemValue = rrefSix.problems.flatMap((problem) => problem.exactAnswer.matrix).flat()
            .find((value) => value && typeof value === 'object');
        rrefOriginalNumerator.numerator = 999;
        assert.notStrictEqual(problemValue.numerator, 999);
    }
    pdf.buildRrefAnswerKeyPlan(makeRrefPoisonedAnswerKeySet());
    rows.push(['T20', 'RREF answer key plan uses exactAnswer directly, deep-clones fractions, and omits steps', 'pass']);

    assertFractionDrawsAsStackedFraction();
    rows.push(['T21', 'RREF exact fractions draw with numerator, denominator, and vector fraction bar', 'pass']);

    const rrefWorksheetDraws = captureRrefWorksheetProblemDraws();
    assert(rrefWorksheetDraws.some((call) => call.kind === 'text' && call.text === '1.'));
    assert(rrefWorksheetDraws.some((call) => call.kind === 'text' && call.text === 'Find the RREF of'));
    assert(rrefWorksheetDraws.some((call) => call.kind === 'text' && call.text === 'Input Matrix'));
    assert(rrefWorksheetDraws.some((call) => call.kind === 'text' && call.text === 'RREF:'));
    const rrefLabelIndex = rrefWorksheetDraws.findIndex((call) => call.kind === 'text' && call.text === 'RREF:');
    const blankMatrixFirstLine = rrefWorksheetDraws.slice(rrefLabelIndex + 1).find((call) => call.kind === 'line');
    assert.deepStrictEqual(blankMatrixFirstLine.args.start, { x: 50, y: 514 });
    const blankMatrixTop = blankMatrixFirstLine.args.start.y;
    const blankMatrixBottom = blankMatrixTop - 2 * 21;
    const workingLines = rrefWorksheetDraws.filter((call) => call.kind === 'line' && call.args.color === 'line');
    assert.strictEqual(workingLines.length, 4);
    const firstWorkingLineY = workingLines[0].args.start.y;
    assert.strictEqual(firstWorkingLineY, 460);
    assert(firstWorkingLineY < blankMatrixBottom);
    assert.strictEqual(blankMatrixBottom - firstWorkingLineY, 12);
    workingLines.forEach((line) => {
        assert(line.args.start.y < blankMatrixBottom);
        assert(line.args.end.y < blankMatrixBottom);
    });
    [1, 2, 3, 4, 5, 6].forEach((value) => {
        assert(rrefWorksheetDraws.some((call) => call.kind === 'text' && call.text === String(value)));
    });
    assert(!rrefWorksheetDraws.some((call) => call.kind === 'text' && call.text === '17/25'));
    rows.push(['T21a', 'RREF worksheet problem draw includes prompt labels, original matrix, blank RREF matrix, and work lines', 'pass']);

    const rrefBefore = JSON.stringify(rrefSix);
    const rrefWorksheetBytes = await pdf.createRrefWorksheetPdf(rrefSix, {
        pdfLib,
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    const rrefAnswerBytes = await pdf.createRrefAnswerKeyPdf(rrefSix, {
        pdfLib,
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    assert(rrefWorksheetBytes instanceof Uint8Array);
    assert(rrefAnswerBytes instanceof Uint8Array);
    assertHeader(rrefWorksheetBytes);
    assertHeader(rrefAnswerBytes);
    assert.strictEqual(await pageCount(rrefWorksheetBytes), 2);
    assert.strictEqual(await pageCount(rrefAnswerBytes), 2);
    (await pageSizes(rrefWorksheetBytes)).forEach((size) => assert.deepStrictEqual(size, { width: 612, height: 792 }));
    (await pageSizes(rrefAnswerBytes)).forEach((size) => assert.deepStrictEqual(size, { width: 612, height: 792 }));
    assert.deepStrictEqual(await pdfMetadata(rrefWorksheetBytes), {
        title: 'Matrix RREF Practice Worksheet',
        author: 'MatrixCalcu',
        creator: 'MatrixCalcu',
        subject: 'Matrix row reduction and RREF practice worksheet'
    });
    assert.deepStrictEqual(await pdfMetadata(rrefAnswerBytes), {
        title: 'Matrix RREF Practice Answer Key',
        author: 'MatrixCalcu',
        creator: 'MatrixCalcu',
        subject: 'Matrix row reduction and RREF practice answer key'
    });
    assert.strictEqual(JSON.stringify(rrefSix), rrefBefore);
    rows.push(['T22', 'RREF PDFs are valid Letter Uint8Arrays with metadata and do not mutate problem sets', 'pass']);

    assert.strictEqual(
        pdf.createPdfFilename({ type: 'rref', seed: 'My Seed: 01/Unsafe?' }, 'worksheet'),
        'matrix-rref-worksheet-my-seed-01-unsafe.pdf'
    );
    assert.strictEqual(
        pdf.createPdfFilename({ type: 'rref', seed: 'My Seed: 01/Unsafe?' }, 'answer-key'),
        'matrix-rref-answer-key-my-seed-01-unsafe.pdf'
    );
    assert.strictEqual(await pageCount(await pdf.createWorksheetPdf(rrefFour, { pdfLib })), 1);
    assert.strictEqual(await pageCount(await pdf.createAnswerKeyPdf(rrefFour, { pdfLib })), 1);
    rows.push(['T23', 'RREF filenames and generic PDF dispatchers use the current set seed and type', 'pass']);

    assert.throws(() => pdf.buildLinearSystemWorksheetPlan({ type: 'rref', problems: [] }), /Unsupported linear systems worksheet type: rref/);
    assert.throws(() => pdf.buildLinearSystemAnswerKeyPlan({ type: 'multiplication', problems: [] }), /Unsupported linear systems answer key type: multiplication/);
    const linearSix = makeLinearSystemSet('pdf-linear-six', 6, 2, 'mixed');
    const linearEight = makeLinearSystemSet('pdf-linear-eight', 8, 2, 'mixed');
    const linearTen = makeLinearSystemSet('pdf-linear-ten', 10, 2, 'mixed');
    const linearThreeFour = makeLinearSystemSet('pdf-linear-three-four', 4, 3, 'mixed');
    const linearThreeSix = makeLinearSystemSet('pdf-linear-three-six', 6, 3, 'mixed');

    const linearWorksheetSix = pdf.buildLinearSystemWorksheetPlan(linearSix);
    assert.strictEqual(linearWorksheetSix.kind, 'worksheet');
    assert.strictEqual(linearWorksheetSix.type, 'linear-system');
    assert.strictEqual(linearWorksheetSix.subtitle, 'Systems of Linear Equations');
    assert.strictEqual(linearWorksheetSix.instructions, 'Solve each system. Show your work.');
    assert.strictEqual(linearWorksheetSix.layout.problemsPerPage, 6);
    assert.strictEqual(linearWorksheetSix.layout.columns, 2);
    assert.strictEqual(linearWorksheetSix.layout.rows, 3);
    assert.deepStrictEqual(linearWorksheetSix.pages[0].problems.map((item) => item.globalNumber), [1, 2, 3, 4, 5, 6]);
    assert.deepStrictEqual(linearWorksheetSix.pages[0].problems[0].coefficientMatrix, linearSix.problems[0].inputs.coefficientMatrix);
    assert.deepStrictEqual(linearWorksheetSix.pages[0].problems[0].constants, linearSix.problems[0].inputs.constants);
    assert.strictEqual(linearWorksheetSix.pages[0].problems[0].variables, 2);
    assertNoAnswerOrSteps(linearWorksheetSix);
    pdf.buildLinearSystemWorksheetPlan(makeLinearSystemPoisonedWorksheetSet());
    rows.push(['T24', 'Linear Systems worksheet plan uses 2-variable six-up layout and omits answers, solution types, and steps', 'pass']);

    assert.strictEqual(pdf.buildLinearSystemWorksheetPlan(linearEight).pages.length, 2);
    assert.deepStrictEqual(pdf.buildLinearSystemWorksheetPlan(linearEight).pages[1].problems.map((item) => item.globalNumber), [7, 8]);
    assert.strictEqual(pdf.buildLinearSystemWorksheetPlan(linearTen).pages.length, 2);
    assert.strictEqual(pdf.buildLinearSystemWorksheetPlan(linearThreeFour).layout.problemsPerPage, 4);
    assert.strictEqual(pdf.buildLinearSystemWorksheetPlan(linearThreeFour).layout.rows, 2);
    assert.strictEqual(pdf.buildLinearSystemWorksheetPlan(linearThreeSix).pages.length, 2);
    assert.deepStrictEqual(pdf.buildLinearSystemWorksheetPlan(linearThreeSix).pages[1].problems.map((item) => item.globalNumber), [5, 6]);
    assertContinuousNumbers(pdf.buildLinearSystemWorksheetPlan(linearTen));
    rows.push(['T25', 'Linear Systems worksheet pagination is 6 per page for 2 variables and 4 per page for 3 variables', 'pass']);

    const linearAnswerSix = pdf.buildLinearSystemAnswerKeyPlan(linearSix);
    assert.strictEqual(linearAnswerSix.kind, 'answer-key');
    assert.strictEqual(linearAnswerSix.title, 'Matrix Practice Answer Key');
    assert.strictEqual(linearAnswerSix.subtitle, 'Systems of Linear Equations');
    assert.strictEqual(linearAnswerSix.layout.problemsPerPage, 6);
    assert.strictEqual(linearAnswerSix.pages[0].problems[0].solutionType, 'unique');
    assert.deepStrictEqual(linearAnswerSix.pages[0].problems[0].exactAnswer.solution, linearSix.problems[0].exactAnswer.solution);
    assert.strictEqual(JSON.stringify(linearAnswerSix).includes('steps'), false);
    const linearOriginalNumerator = linearAnswerSix.pages[0].problems[0].exactAnswer.solution[0].numerator;
    linearAnswerSix.pages[0].problems[0].exactAnswer.solution[0].numerator = 999;
    assert.strictEqual(linearSix.problems[0].exactAnswer.solution[0].numerator, linearOriginalNumerator);
    pdf.buildLinearSystemAnswerKeyPlan(makeLinearSystemPoisonedAnswerKeySet());
    rows.push(['T26', 'Linear Systems answer key plan includes exact generated answers, deep-clones fractions, and omits steps', 'pass']);

    assert.strictEqual(pdf.__test.formatLinearEquationText([1, -1, 0], 4), 'x - y = 4');
    assert.strictEqual(pdf.__test.formatLinearEquationText([-1, 2, -3], -7), '-x + 2y - 3z = -7');
    assert.strictEqual(pdf.__test.formatLinearEquationText([0, 0, 0], 5), '0 = 5');
    assert.strictEqual(
        pdf.__test.formatLinearSystemExpressionText({
            variable: 'x',
            isFree: false,
            constant: 1,
            terms: [{ freeVariable: 'y', coefficient: { kind: 'fraction', numerator: -1, denominator: 2 } }]
        }, { y: 't' }),
        'x = 1 - 1/2t'
    );
    rows.push(['T27', 'Linear Systems PDF equation and parametric answer formatters preserve exact fractions without decimals', 'pass']);

    const linearDrawCalls = [];
    const fakePage = {
        drawLine(args) {
            linearDrawCalls.push({ kind: 'line', args });
        },
        drawText(text, args) {
            linearDrawCalls.push({ kind: 'text', text, args });
        }
    };
    const fakeFont = {
        widthOfTextAtSize(text, size) {
            return String(text).length * size * 0.55;
        }
    };
    const fakeFonts = { regular: fakeFont, bold: fakeFont };
    const fakeColors = { text: 'text', muted: 'muted', line: 'line' };
    pdf.__test.drawLinearSystemWorksheetProblem(fakePage, linearWorksheetSix.pages[0].problems[0], {
        x: 36,
        y: 646,
        width: 260,
        height: 180
    }, fakeFonts, fakeColors);
    assert(linearDrawCalls.some((call) => call.kind === 'text' && call.text === 'Solve the system:'));
    assert(linearDrawCalls.some((call) => call.kind === 'text' && call.text === 'Solution:'));
    assert(linearDrawCalls.some((call) => call.kind === 'text' && call.text === 'x ='));
    assert(linearDrawCalls.some((call) => call.kind === 'text' && call.text === 'y ='));
    assert(!linearDrawCalls.some((call) => call.kind === 'text' && call.text === 'Unique Solution'));
    assert(!linearDrawCalls.some((call) => call.kind === 'text' && call.text === '1/2'));
    const linearAnswerDrawCalls = [];
    const fakeAnswerPage = {
        drawLine(args) {
            linearAnswerDrawCalls.push({ kind: 'line', args });
        },
        drawText(text, args) {
            linearAnswerDrawCalls.push({ kind: 'text', text, args });
        }
    };
    pdf.__test.drawLinearSystemAnswerKeyProblem(fakeAnswerPage, pdf.buildLinearSystemAnswerKeyPlan(makeLinearSystemSet('pdf-linear-unique', 1, 2, 'unique')).pages[0].problems[0], {
        x: 36,
        y: 646,
        width: 260,
        height: 180
    }, fakeFonts, fakeColors);
    assert(linearAnswerDrawCalls.some((call) => call.kind === 'text' && call.text === 'Unique Solution'));
    assert(linearAnswerDrawCalls.some((call) => call.kind === 'text' && call.text === '1'));
    assert(linearAnswerDrawCalls.some((call) => call.kind === 'text' && call.text === '2'));
    assert(linearAnswerDrawCalls.some((call) => call.kind === 'line' && call.args.thickness === 0.7));
    rows.push(['T28', 'Linear Systems PDF drawing keeps worksheet blank and renders unique fractions with vector fraction bars', 'pass']);

    const linearBefore = JSON.stringify(linearSix);
    const linearWorksheetBytes = await pdf.createLinearSystemWorksheetPdf(linearSix, {
        pdfLib,
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    const linearAnswerBytes = await pdf.createLinearSystemAnswerKeyPdf(linearSix, {
        pdfLib,
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    assert(linearWorksheetBytes instanceof Uint8Array);
    assert(linearAnswerBytes instanceof Uint8Array);
    assertHeader(linearWorksheetBytes);
    assertHeader(linearAnswerBytes);
    assert.strictEqual(await pageCount(linearWorksheetBytes), 1);
    assert.strictEqual(await pageCount(linearAnswerBytes), 1);
    assert.strictEqual(await pageCount(await pdf.createLinearSystemWorksheetPdf(linearThreeSix, { pdfLib })), 2);
    assert.strictEqual(await pageCount(await pdf.createLinearSystemAnswerKeyPdf(linearThreeSix, { pdfLib })), 2);
    (await pageSizes(linearWorksheetBytes)).forEach((size) => assert.deepStrictEqual(size, { width: 612, height: 792 }));
    (await pageSizes(linearAnswerBytes)).forEach((size) => assert.deepStrictEqual(size, { width: 612, height: 792 }));
    assert.deepStrictEqual(await pdfMetadata(linearWorksheetBytes), {
        title: 'Matrix Linear Systems Practice Worksheet',
        author: 'MatrixCalcu',
        creator: 'MatrixCalcu',
        subject: 'Systems of linear equations practice worksheet'
    });
    assert.deepStrictEqual(await pdfMetadata(linearAnswerBytes), {
        title: 'Matrix Linear Systems Practice Answer Key',
        author: 'MatrixCalcu',
        creator: 'MatrixCalcu',
        subject: 'Systems of linear equations practice answer key'
    });
    assert.strictEqual(JSON.stringify(linearSix), linearBefore);
    rows.push(['T29', 'Linear Systems PDFs are valid Letter Uint8Arrays with metadata and do not mutate problem sets', 'pass']);

    assert.strictEqual(
        pdf.createPdfFilename({ type: 'linear-system', seed: 'My Seed: 01/Unsafe?' }, 'worksheet'),
        'matrix-linear-systems-worksheet-my-seed-01-unsafe.pdf'
    );
    assert.strictEqual(
        pdf.createPdfFilename({ type: 'linear-system', seed: 'My Seed: 01/Unsafe?' }, 'answer-key'),
        'matrix-linear-systems-answer-key-my-seed-01-unsafe.pdf'
    );
    assert.strictEqual(await pageCount(await pdf.createWorksheetPdf(linearSix, { pdfLib })), 1);
    assert.strictEqual(await pageCount(await pdf.createAnswerKeyPdf(linearSix, { pdfLib })), 1);
    rows.push(['T30', 'Linear Systems filenames and generic PDF dispatchers use the current set seed and type', 'pass']);

    const esAddWorksheet = pdf.buildAdditionSubtractionWorksheetPlan(six, { locale: 'es' });
    assert.strictEqual(esAddWorksheet.title, 'Hoja de ejercicios de matrices');
    assert.strictEqual(esAddWorksheet.subtitle, 'Suma y resta de matrices');
    assert.strictEqual(esAddWorksheet.instructions, 'Resuelve cada ejercicio. Muestra tu trabajo.');
    assertNoSpanishPdfEnglish(esAddWorksheet.labels);
    assertNoAnswerOrSteps(esAddWorksheet);
    const esMultiplicationWorksheet = pdf.buildMultiplicationWorksheetPlan(multEasySix, { locale: 'es' });
    assert.strictEqual(esMultiplicationWorksheet.subtitle, 'Multiplicación de matrices');
    assert.strictEqual(esMultiplicationWorksheet.instructions, 'Multiplica cada par de matrices. Muestra tu trabajo.');
    assertNoSpanishPdfEnglish(esMultiplicationWorksheet.labels);
    assertNoAnswerOrSteps(esMultiplicationWorksheet);
    const esRrefWorksheet = pdf.buildRrefWorksheetPlan(rrefFour, { locale: 'es' });
    assert.strictEqual(esRrefWorksheet.subtitle, 'Forma escalonada reducida por filas');
    assert.strictEqual(esRrefWorksheet.labels.findRref, 'Halla la RREF de');
    assert.strictEqual(esRrefWorksheet.layout.problemsPerPage, 4);
    assert.strictEqual(esRrefWorksheet.layout.columns, 2);
    assert.strictEqual(esRrefWorksheet.layout.rows, 2);
    assertNoSpanishPdfEnglish(esRrefWorksheet.labels);
    assertNoAnswerOrSteps(esRrefWorksheet);
    const esLinearWorksheet = pdf.buildLinearSystemWorksheetPlan(linearSix, { locale: 'es' });
    assert.strictEqual(esLinearWorksheet.subtitle, 'Sistemas de ecuaciones lineales');
    assert.strictEqual(esLinearWorksheet.instructions, 'Resuelve cada sistema. Muestra tu trabajo.');
    assertNoSpanishPdfEnglish(esLinearWorksheet.labels);
    assertNoAnswerOrSteps(esLinearWorksheet);

    const esRrefAnswerKey = pdf.buildRrefAnswerKeyPlan(rrefFour, { locale: 'es' });
    assert.strictEqual(esRrefAnswerKey.title, 'Respuestas de ejercicios de matrices');
    assert.strictEqual(esRrefAnswerKey.subtitle, 'Forma escalonada reducida por filas');
    assert.strictEqual(pdf.buildRrefAnswerKeyPlan(rrefFour).subtitle, 'Row Reduction (RREF)');
    assertNoSteps(esRrefAnswerKey);
    assert.strictEqual(
        pdf.createPdfFilename({ type: 'rref', seed: 'Mi Semilla: 01/Lista?' }, 'worksheet', { locale: 'es' }),
        'practica-rref-matrices-hoja-mi-semilla-01-lista.pdf'
    );
    assert.strictEqual(
        pdf.createPdfFilename({ type: 'linear-system', seed: 'Mi Semilla: 01/Lista?' }, 'answer-key', { locale: 'es' }),
        'practica-sistemas-ecuaciones-respuestas-mi-semilla-01-lista.pdf'
    );
    const esPdfCases = [
        ['addition worksheet', () => pdf.createAdditionSubtractionWorksheetPdf(six, { pdfLib, locale: 'es', creationDate: new Date('2024-01-01T00:00:00Z') }), await pageCount(bytesSix)],
        ['addition answer key', () => pdf.createAdditionSubtractionAnswerKeyPdf(eight, { pdfLib, locale: 'es', creationDate: new Date('2024-01-01T00:00:00Z') }), await pageCount(answerBytes)],
        ['multiplication worksheet', () => pdf.createMultiplicationWorksheetPdf(multEasySix, { pdfLib, locale: 'es', creationDate: new Date('2024-01-01T00:00:00Z') }), await pageCount(multWorksheetBytes)],
        ['multiplication answer key', () => pdf.createMultiplicationAnswerKeyPdf(multEasyEight, { pdfLib, locale: 'es', creationDate: new Date('2024-01-01T00:00:00Z') }), await pageCount(multAnswerBytes)],
        ['rref worksheet', () => pdf.createRrefWorksheetPdf(rrefFour, { pdfLib, locale: 'es', creationDate: new Date('2024-01-01T00:00:00Z') }), 1],
        ['rref answer key', () => pdf.createRrefAnswerKeyPdf(rrefFour, { pdfLib, locale: 'es', creationDate: new Date('2024-01-01T00:00:00Z') }), 1],
        ['linear worksheet', () => pdf.createLinearSystemWorksheetPdf(linearSix, { pdfLib, locale: 'es', creationDate: new Date('2024-01-01T00:00:00Z') }), await pageCount(linearWorksheetBytes)],
        ['linear answer key', () => pdf.createLinearSystemAnswerKeyPdf(linearSix, { pdfLib, locale: 'es', creationDate: new Date('2024-01-01T00:00:00Z') }), await pageCount(linearAnswerBytes)]
    ];
    for (const [name, createBytes, expectedPages] of esPdfCases) {
        const bytes = await createBytes();
        assertHeader(bytes);
        const doc = await pdfLib.PDFDocument.load(bytes);
        assert.strictEqual(doc.getPageCount(), expectedPages, name);
        doc.getPages().forEach((page) => assert.deepStrictEqual(page.getSize(), { width: 612, height: 792 }));
    }
    const esRrefWorksheetBytes = await pdf.createRrefWorksheetPdf(rrefFour, {
        pdfLib,
        locale: 'es',
        creationDate: new Date('2024-01-01T00:00:00Z')
    });
    assert.deepStrictEqual(await pdfMetadata(esRrefWorksheetBytes), {
        title: 'Hoja de ejercicios de RREF de matrices',
        author: 'MatrixCalcu',
        creator: 'MatrixCalcu',
        subject: 'Hoja de ejercicios de forma escalonada reducida por filas'
    });
    rows.push(['T30a', 'Spanish PDF locale localizes worksheet and answer-key plans, metadata, and filenames without changing pagination', 'pass']);

    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'practice', 'practice-pdf.js'), 'utf8');
    assert(!/\bdocument\b/.test(source.replace(/downloadAdditionSubtractionWorksheetPdf[\s\S]*?const api =/, 'const api =')));
    assert(!/\bwindow\.print\b/.test(source));
    assert(!/\bMath\.random\b/.test(source));
    assert(!/html2canvas|canvas|fetch\(|XMLHttpRequest|import\(/.test(source));
    assert(!/fontkit/.test(source));
    assert(!/reduceMatrixForPractice|calculateRREFWithSteps|analyzeRref/.test(source));
    assert(source.includes('drawMultiplicationSign'));
    assert(source.includes('drawLinearSystemAnswerKeyProblem'));
    assert(source.includes('drawLine'));
    assert(!source.includes("'x'"));
    rows.push(['T31', 'PDF generation path avoids DOM measurement, window.print, network, screenshots, extra fonts, and RREF recomputation', 'pass']);

    const samplePath = path.join(os.tmpdir(), 'matrix-addition-subtraction-worksheet-sample.pdf');
    fs.writeFileSync(samplePath, Buffer.from(bytesSix));
    assert(fs.existsSync(samplePath));
    fs.unlinkSync(samplePath);
    rows.push(['T32', 'temporary manual sample PDF can be produced and cleaned up', 'pass']);

    return rows;
}

runTests().then((rows) => {
    rows.forEach(([id, name, status]) => {
        console.log(`${id} ${status} - ${name}`);
    });
    console.log('All practice PDF tests passed.');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
