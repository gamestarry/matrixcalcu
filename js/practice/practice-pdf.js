(function (root) {
    'use strict';

    const TYPE = 'addition-subtraction';
    const PAGE_WIDTH = 612;
    const PAGE_HEIGHT = 792;
    const PROBLEMS_PER_PAGE = 6;
    const DEFAULT_OPTIONS = {
        marginLeft: 36,
        marginRight: 36,
        marginTop: 32,
        marginBottom: 28,
        columnGap: 18,
        rowGap: 12
    };

    function cloneMatrix(matrix) {
        return matrix.map((row) => row.slice());
    }

    function assertAdditionSubtractionSet(problemSet) {
        if (!problemSet || problemSet.type !== TYPE) {
            const actual = problemSet && problemSet.type ? problemSet.type : 'unknown';
            throw new Error(`Unsupported PDF worksheet type: ${actual}`);
        }
        if (!Array.isArray(problemSet.problems)) {
            throw new Error('Invalid addition/subtraction problem set.');
        }
    }

    function chunkProblems(problems) {
        const chunks = [];
        for (let index = 0; index < problems.length; index += PROBLEMS_PER_PAGE) {
            chunks.push(problems.slice(index, index + PROBLEMS_PER_PAGE));
        }
        return chunks;
    }

    function answerDimensionsForProblem(problem) {
        const dims = problem.dimensions || {};
        if (Number.isInteger(dims.rows) && Number.isInteger(dims.cols)) {
            return { rows: dims.rows, cols: dims.cols };
        }
        const matrixA = problem.inputs && problem.inputs.matrixA;
        return {
            rows: matrixA ? matrixA.length : 0,
            cols: matrixA && matrixA[0] ? matrixA[0].length : 0
        };
    }

    function buildAdditionSubtractionWorksheetPlan(problemSet, options) {
        assertAdditionSubtractionSet(problemSet);
        const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
        const chunks = chunkProblems(problemSet.problems);
        const totalPages = chunks.length;

        return {
            kind: 'worksheet',
            type: TYPE,
            title: 'Matrix Practice Worksheet',
            subtitle: 'Matrix Addition and Subtraction',
            seed: problemSet.seed,
            paper: {
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT
            },
            layout: {
                problemsPerPage: PROBLEMS_PER_PAGE,
                columns: 2,
                rows: 3,
                marginLeft: opts.marginLeft,
                marginRight: opts.marginRight,
                marginTop: opts.marginTop,
                marginBottom: opts.marginBottom,
                columnGap: opts.columnGap,
                rowGap: opts.rowGap,
                footer: 'matrixcalcu.com'
            },
            pages: chunks.map((problems, pageIndex) => ({
                pageNumber: pageIndex + 1,
                totalPages,
                problems: problems.map((problem, index) => ({
                    id: problem.id,
                    globalNumber: pageIndex * PROBLEMS_PER_PAGE + index + 1,
                    subtype: problem.subtype,
                    matrixA: cloneMatrix(problem.inputs.matrixA),
                    matrixB: cloneMatrix(problem.inputs.matrixB),
                    answerDimensions: answerDimensionsForProblem(problem)
                }))
            }))
        };
    }

    function sanitizeFilenamePart(value) {
        return String(value || 'worksheet')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80) || 'worksheet';
    }

    function createPdfFilename(problemSet, kind) {
        const safeKind = sanitizeFilenamePart(kind || 'worksheet');
        const seed = sanitizeFilenamePart(problemSet && problemSet.seed ? problemSet.seed : 'set');
        return `matrix-addition-subtraction-${safeKind}-${seed}.pdf`;
    }

    function getPdfLib(options) {
        if (options && options.pdfLib) return options.pdfLib;
        if (root.PDFLib) return root.PDFLib;
        if (typeof require === 'function') {
            return require('../vendor/pdf-lib-1.17.1.min.js');
        }
        throw new Error('PDFLib is not loaded.');
    }

    function drawTextCentered(page, text, y, font, size, color) {
        const width = font.widthOfTextAtSize(text, size);
        page.drawText(text, {
            x: (PAGE_WIDTH - width) / 2,
            y,
            size,
            font,
            color
        });
    }

    function drawMatrix(page, matrix, x, y, fonts, options) {
        const opts = Object.assign({
            cellWidth: 26,
            cellHeight: 20,
            fontSize: 10,
            empty: false
        }, options || {});
        const rows = matrix.length;
        const cols = matrix[0] ? matrix[0].length : 0;
        const width = cols * opts.cellWidth;
        const height = rows * opts.cellHeight;
        const bracketArm = 6;
        const lineWidth = 1.1;
        const color = opts.color;

        page.drawLine({ start: { x, y }, end: { x: x + bracketArm, y }, thickness: lineWidth, color });
        page.drawLine({ start: { x, y }, end: { x, y: y - height }, thickness: lineWidth, color });
        page.drawLine({ start: { x, y: y - height }, end: { x: x + bracketArm, y: y - height }, thickness: lineWidth, color });

        const right = x + width + bracketArm * 2;
        page.drawLine({ start: { x: right - bracketArm, y }, end: { x: right, y }, thickness: lineWidth, color });
        page.drawLine({ start: { x: right, y }, end: { x: right, y: y - height }, thickness: lineWidth, color });
        page.drawLine({ start: { x: right - bracketArm, y: y - height }, end: { x: right, y: y - height }, thickness: lineWidth, color });

        matrix.forEach((row, r) => {
            row.forEach((value, c) => {
                const text = opts.empty ? '' : String(value);
                if (!text) return;
                const size = opts.fontSize;
                const textWidth = fonts.regular.widthOfTextAtSize(text, size);
                const tx = x + bracketArm + c * opts.cellWidth + (opts.cellWidth - textWidth) / 2;
                const ty = y - (r + 1) * opts.cellHeight + 5;
                page.drawText(text, { x: tx, y: ty, size, font: fonts.regular, color });
            });
        });

        return {
            width: width + bracketArm * 2,
            height
        };
    }

    function drawEmptyMatrix(page, rows, cols, x, y, fonts, options) {
        const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
        return drawMatrix(page, matrix, x, y, fonts, Object.assign({}, options, { empty: true }));
    }

    function drawHeader(page, plan, pageInfo, fonts, colors) {
        if (pageInfo.pageNumber === 1) {
            drawTextCentered(page, plan.title, 746, fonts.bold, 16, colors.text);
            drawTextCentered(page, plan.subtitle, 727, fonts.regular, 11, colors.muted);

            page.drawText('Name:', { x: 44, y: 702, size: 10, font: fonts.regular, color: colors.text });
            page.drawLine({ start: { x: 78, y: 701 }, end: { x: 300, y: 701 }, thickness: 0.8, color: colors.text });
            page.drawText('Date:', { x: 328, y: 702, size: 10, font: fonts.regular, color: colors.text });
            page.drawLine({ start: { x: 360, y: 701 }, end: { x: 568, y: 701 }, thickness: 0.8, color: colors.text });

            drawTextCentered(page, 'Solve each problem. Show your work.', 680, fonts.regular, 10, colors.muted);
            const pageText = `Page ${pageInfo.pageNumber} of ${pageInfo.totalPages}`;
            page.drawText(pageText, {
                x: PAGE_WIDTH - 44 - fonts.regular.widthOfTextAtSize(pageText, 9),
                y: 662,
                size: 9,
                font: fonts.regular,
                color: colors.muted
            });
            return 646;
        }

        const header = `${plan.title} - ${plan.subtitle}`;
        drawTextCentered(page, header, 750, fonts.bold, 12, colors.text);
        const pageText = `Page ${pageInfo.pageNumber} of ${pageInfo.totalPages}`;
        page.drawText(pageText, {
            x: PAGE_WIDTH - 44 - fonts.regular.widthOfTextAtSize(pageText, 9),
            y: 730,
            size: 9,
            font: fonts.regular,
            color: colors.muted
        });
        return 710;
    }

    function drawProblem(page, item, box, fonts, colors) {
        const numberText = `${item.globalNumber}.`;
        page.drawText(numberText, { x: box.x, y: box.y - 14, size: 11, font: fonts.bold, color: colors.text });

        const matrixTop = box.y - 30;
        const matrixA = drawMatrix(page, item.matrixA, box.x + 12, matrixTop, fonts, { color: colors.text });
        const operator = item.subtype === 'subtract' ? '-' : '+';
        page.drawText(operator, {
            x: box.x + 12 + matrixA.width + 11,
            y: matrixTop - matrixA.height / 2 - 2,
            size: 13,
            font: fonts.bold,
            color: colors.text
        });
        drawMatrix(page, item.matrixB, box.x + 12 + matrixA.width + 30, matrixTop, fonts, { color: colors.text });

        const answerY = box.y - 96;
        page.drawText('Answer:', { x: box.x + 4, y: answerY, size: 9, font: fonts.bold, color: colors.text });
        drawEmptyMatrix(page, item.answerDimensions.rows, item.answerDimensions.cols, box.x + 58, answerY + 12, fonts, {
            color: colors.text,
            cellWidth: 24,
            cellHeight: 18
        });

        for (let index = 0; index < 2; index++) {
            const y = box.y - 137 - index * 19;
            page.drawLine({
                start: { x: box.x + 4, y },
                end: { x: box.x + box.width - 4, y },
                thickness: 0.5,
                color: colors.line
            });
        }
    }

    function drawFooter(page, fonts, colors) {
        drawTextCentered(page, 'matrixcalcu.com', 18, fonts.regular, 8, colors.footer);
    }

    async function createAdditionSubtractionWorksheetPdf(problemSet, options) {
        const opts = options || {};
        const plan = buildAdditionSubtractionWorksheetPlan(problemSet, opts);
        const pdfLib = getPdfLib(opts);
        const { PDFDocument, StandardFonts, rgb } = pdfLib;
        const pdfDoc = await PDFDocument.create();
        pdfDoc.setTitle('Matrix Addition and Subtraction Practice Worksheet');
        pdfDoc.setAuthor('MatrixCalcu');
        pdfDoc.setCreator('MatrixCalcu');
        pdfDoc.setSubject('Matrix addition and subtraction practice worksheet');
        const date = opts.creationDate instanceof Date ? opts.creationDate : new Date();
        pdfDoc.setCreationDate(date);
        pdfDoc.setModificationDate(date);

        const fonts = {
            regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
            bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold)
        };
        const colors = {
            text: rgb(0.10, 0.12, 0.16),
            muted: rgb(0.36, 0.41, 0.45),
            line: rgb(0.78, 0.80, 0.84),
            footer: rgb(0.54, 0.58, 0.61)
        };

        plan.pages.forEach((pageInfo) => {
            const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            const contentTop = drawHeader(page, plan, pageInfo, fonts, colors);
            const left = plan.layout.marginLeft;
            const right = PAGE_WIDTH - plan.layout.marginRight;
            const footerTop = plan.layout.marginBottom + 18;
            const gridBottom = footerTop + 8;
            const availableWidth = right - left;
            const availableHeight = contentTop - gridBottom;
            const cellWidth = (availableWidth - plan.layout.columnGap) / 2;
            const cellHeight = (availableHeight - plan.layout.rowGap * 2) / 3;

            pageInfo.problems.forEach((item, index) => {
                const column = index % 2;
                const row = Math.floor(index / 2);
                const x = left + column * (cellWidth + plan.layout.columnGap);
                const y = contentTop - row * (cellHeight + plan.layout.rowGap);
                drawProblem(page, item, { x, y, width: cellWidth, height: cellHeight }, fonts, colors);
            });
            drawFooter(page, fonts, colors);
        });

        return pdfDoc.save();
    }

    async function downloadAdditionSubtractionWorksheetPdf(problemSet, options) {
        if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
            throw new Error('PDF download requires a browser environment.');
        }
        const bytes = await createAdditionSubtractionWorksheetPdf(problemSet, options);
        const filename = createPdfFilename(problemSet, 'worksheet');
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        try {
            link.click();
        } finally {
            link.remove();
            URL.revokeObjectURL(url);
        }
        return filename;
    }

    const api = {
        PAGE_WIDTH,
        PAGE_HEIGHT,
        PROBLEMS_PER_PAGE,
        buildAdditionSubtractionWorksheetPlan,
        createAdditionSubtractionWorksheetPdf,
        downloadAdditionSubtractionWorksheetPdf,
        createPdfFilename
    };

    root.MatrixPractice = root.MatrixPractice || {};
    root.MatrixPractice.pdf = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
