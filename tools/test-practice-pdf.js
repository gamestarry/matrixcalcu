'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const pdfLib = require('../js/vendor/pdf-lib-1.17.1.min.js');
const pdf = require('../js/practice/practice-pdf.js');
const additionGenerator = require('../js/practice/generators/addition-subtraction.js');
const multiplicationGenerator = require('../js/practice/generators/multiplication.js');

function assertHeader(bytes) {
    const header = Buffer.from(bytes.slice(0, 4)).toString('ascii');
    assert.strictEqual(header, '%PDF');
}

function assertNoAnswerOrSteps(plan) {
    const text = JSON.stringify(plan);
    assert.strictEqual(text.includes('exactAnswer'), false);
    assert.strictEqual(text.includes('steps'), false);
    assert.strictEqual(text.includes('Answer Key'), false);
    assert.strictEqual(text.includes('Detailed Solutions'), false);
}

function assertNoSteps(plan) {
    const text = JSON.stringify(plan);
    assert.strictEqual(text.includes('steps'), false);
    assert.strictEqual(text.includes('Detailed Solutions'), false);
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

    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'practice', 'practice-pdf.js'), 'utf8');
    assert(!/\bdocument\b/.test(source.replace(/downloadAdditionSubtractionWorksheetPdf[\s\S]*?const api =/, 'const api =')));
    assert(!/\bwindow\.print\b/.test(source));
    assert(!/\bMath\.random\b/.test(source));
    assert(!/html2canvas|canvas|fetch\(|XMLHttpRequest|import\(/.test(source));
    assert(!/fontkit/.test(source));
    assert(source.includes('drawMultiplicationSign'));
    assert(source.includes('drawLine'));
    assert(!source.includes("'x'"));
    rows.push(['T17', 'PDF generation path avoids DOM measurement, window.print, network, screenshots, and extra fonts', 'pass']);

    const samplePath = path.join(os.tmpdir(), 'matrix-addition-subtraction-worksheet-sample.pdf');
    fs.writeFileSync(samplePath, Buffer.from(bytesSix));
    assert(fs.existsSync(samplePath));
    fs.unlinkSync(samplePath);
    rows.push(['T18', 'temporary manual sample PDF can be produced and cleaned up', 'pass']);

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
