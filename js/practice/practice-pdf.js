(function (root) {
    'use strict';

    const ADD_SUB_TYPE = 'addition-subtraction';
    const MULTIPLICATION_TYPE = 'multiplication';
    const RREF_TYPE = 'rref';
    const PAGE_WIDTH = 612;
    const PAGE_HEIGHT = 792;
    const PROBLEMS_PER_PAGE = 6;
    const RREF_PROBLEMS_PER_PAGE = 4;
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

    function cloneExactValue(value) {
        if (value && typeof value === 'object') {
            return Object.assign({}, value);
        }
        return value;
    }

    function cloneExactMatrix(matrix) {
        return matrix.map((row) => row.map(cloneExactValue));
    }

    function assertAdditionSubtractionSet(problemSet, kind) {
        if (!problemSet || problemSet.type !== ADD_SUB_TYPE) {
            const actual = problemSet && problemSet.type ? problemSet.type : 'unknown';
            throw new Error(`Unsupported PDF ${kind || 'worksheet'} type: ${actual}`);
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

    function assertMultiplicationSet(problemSet, kind) {
        if (!problemSet || problemSet.type !== MULTIPLICATION_TYPE) {
            const actual = problemSet && problemSet.type ? problemSet.type : 'unknown';
            throw new Error(`Unsupported multiplication ${kind || 'worksheet'} type: ${actual}`);
        }
        if (!Array.isArray(problemSet.problems)) {
            throw new Error('Invalid multiplication problem set.');
        }
    }

    function assertRrefSet(problemSet, kind) {
        if (!problemSet || problemSet.type !== RREF_TYPE) {
            const actual = problemSet && problemSet.type ? problemSet.type : 'unknown';
            throw new Error(`Unsupported RREF ${kind || 'worksheet'} type: ${actual}`);
        }
        if (!Array.isArray(problemSet.problems)) {
            throw new Error('Invalid RREF problem set.');
        }
    }

    function getMultiplicationLayout(problemSet) {
        const first = problemSet && problemSet.problems && problemSet.problems[0];
        if (!first) return 'regular';
        const dims = first.dimensions || {};
        if (dims.rowsA === 3 && dims.colsA === 3 && dims.colsB === 3) return 'wide';
        if (first.difficulty === 'easy') return 'compact';
        return 'regular';
    }

    function getMultiplicationProblemsPerPage(kind, layout) {
        if (kind === 'answer-key') return layout === 'wide' ? 4 : 8;
        return layout === 'compact' ? 6 : 4;
    }

    function chunkProblemsBySize(problems, size) {
        const chunks = [];
        for (let index = 0; index < problems.length; index += size) {
            chunks.push(problems.slice(index, index + size));
        }
        return chunks;
    }

    function multiplicationResultDimensionsForProblem(problem) {
        const dims = problem.dimensions || {};
        if (Number.isInteger(dims.resultRows) && Number.isInteger(dims.resultCols)) {
            return { rows: dims.resultRows, cols: dims.resultCols };
        }
        const matrixA = problem.inputs && problem.inputs.matrixA;
        const matrixB = problem.inputs && problem.inputs.matrixB;
        return {
            rows: matrixA ? matrixA.length : 0,
            cols: matrixB && matrixB[0] ? matrixB[0].length : 0
        };
    }

    function rrefDimensionsForProblem(problem) {
        const dims = problem.dimensions || {};
        if (Number.isInteger(dims.rows) && Number.isInteger(dims.cols)) {
            return { rows: dims.rows, cols: dims.cols };
        }
        const matrix = problem.inputs && problem.inputs.matrix;
        return {
            rows: matrix ? matrix.length : 0,
            cols: matrix && matrix[0] ? matrix[0].length : 0
        };
    }

    function buildAdditionSubtractionWorksheetPlan(problemSet, options) {
        assertAdditionSubtractionSet(problemSet, 'worksheet');
        const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
        const chunks = chunkProblems(problemSet.problems);
        const totalPages = chunks.length;

        return {
            kind: 'worksheet',
            type: ADD_SUB_TYPE,
            title: 'Matrix Practice Worksheet',
            subtitle: 'Matrix Addition and Subtraction',
            instructions: 'Solve each problem. Show your work.',
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

    function buildAdditionSubtractionAnswerKeyPlan(problemSet, options) {
        assertAdditionSubtractionSet(problemSet, 'answer key');
        const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
        const chunks = chunkProblems(problemSet.problems);
        const totalPages = chunks.length;

        return {
            kind: 'answer-key',
            type: ADD_SUB_TYPE,
            title: 'Matrix Practice Answer Key',
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
                    operator: problem.subtype === 'subtract' ? '-' : '+',
                    matrixA: cloneMatrix(problem.inputs.matrixA),
                    matrixB: cloneMatrix(problem.inputs.matrixB),
                    exactAnswer: cloneMatrix(problem.exactAnswer.matrix)
                }))
            }))
        };
    }

    function buildMultiplicationWorksheetPlan(problemSet, options) {
        assertMultiplicationSet(problemSet, 'worksheet');
        const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
        const layoutName = getMultiplicationLayout(problemSet);
        const problemsPerPage = getMultiplicationProblemsPerPage('worksheet', layoutName);
        const chunks = chunkProblemsBySize(problemSet.problems, problemsPerPage);
        const totalPages = chunks.length;

        return {
            kind: 'worksheet',
            type: MULTIPLICATION_TYPE,
            title: 'Matrix Practice Worksheet',
            subtitle: 'Matrix Multiplication',
            instructions: 'Multiply each pair of matrices. Show your work.',
            seed: problemSet.seed,
            paper: {
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT
            },
            layout: {
                name: layoutName,
                problemsPerPage,
                columns: layoutName === 'wide' ? 1 : 2,
                rows: layoutName === 'compact' ? 3 : 2,
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
                    globalNumber: pageIndex * problemsPerPage + index + 1,
                    matrixA: cloneMatrix(problem.inputs.matrixA),
                    matrixB: cloneMatrix(problem.inputs.matrixB),
                    resultDimensions: multiplicationResultDimensionsForProblem(problem)
                }))
            }))
        };
    }

    function buildMultiplicationAnswerKeyPlan(problemSet, options) {
        assertMultiplicationSet(problemSet, 'answer key');
        const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
        const layoutName = getMultiplicationLayout(problemSet);
        const problemsPerPage = getMultiplicationProblemsPerPage('answer-key', layoutName);
        const chunks = chunkProblemsBySize(problemSet.problems, problemsPerPage);
        const totalPages = chunks.length;

        return {
            kind: 'answer-key',
            type: MULTIPLICATION_TYPE,
            title: 'Matrix Practice Answer Key',
            subtitle: 'Matrix Multiplication',
            seed: problemSet.seed,
            paper: {
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT
            },
            layout: {
                name: layoutName,
                problemsPerPage,
                columns: layoutName === 'wide' ? 1 : 2,
                rows: layoutName === 'wide' ? 4 : Math.ceil(problemsPerPage / 2),
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
                    globalNumber: pageIndex * problemsPerPage + index + 1,
                    matrixA: cloneMatrix(problem.inputs.matrixA),
                    matrixB: cloneMatrix(problem.inputs.matrixB),
                    exactAnswer: cloneMatrix(problem.exactAnswer.matrix)
                }))
            }))
        };
    }

    function buildRrefWorksheetPlan(problemSet, options) {
        assertRrefSet(problemSet, 'worksheet');
        const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
        const chunks = chunkProblemsBySize(problemSet.problems, RREF_PROBLEMS_PER_PAGE);
        const totalPages = chunks.length;

        return {
            kind: 'worksheet',
            type: RREF_TYPE,
            title: 'Matrix Practice Worksheet',
            subtitle: 'Reduced Row Echelon Form',
            instructions: 'Reduce each matrix to reduced row echelon form (RREF). Show your work.',
            seed: problemSet.seed,
            paper: {
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT
            },
            layout: {
                problemsPerPage: RREF_PROBLEMS_PER_PAGE,
                columns: 2,
                rows: 2,
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
                problems: problems.map((problem, index) => {
                    const dimensions = rrefDimensionsForProblem(problem);
                    return {
                        id: problem.id,
                        globalNumber: pageIndex * RREF_PROBLEMS_PER_PAGE + index + 1,
                        matrix: cloneExactMatrix(problem.inputs.matrix),
                        rows: dimensions.rows,
                        cols: dimensions.cols,
                        answerDimensions: dimensions
                    };
                })
            }))
        };
    }

    function buildRrefAnswerKeyPlan(problemSet, options) {
        assertRrefSet(problemSet, 'answer key');
        const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
        const chunks = chunkProblemsBySize(problemSet.problems, RREF_PROBLEMS_PER_PAGE);
        const totalPages = chunks.length;

        return {
            kind: 'answer-key',
            type: RREF_TYPE,
            title: 'Matrix Practice Answer Key',
            subtitle: 'Row Reduction (RREF)',
            seed: problemSet.seed,
            paper: {
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT
            },
            layout: {
                problemsPerPage: RREF_PROBLEMS_PER_PAGE,
                columns: 2,
                rows: 2,
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
                    globalNumber: pageIndex * RREF_PROBLEMS_PER_PAGE + index + 1,
                    matrix: cloneExactMatrix(problem.inputs.matrix),
                    exactAnswer: cloneExactMatrix(problem.exactAnswer.matrix),
                    dimensions: rrefDimensionsForProblem(problem)
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
        let type = 'addition-subtraction';
        if (problemSet && problemSet.type === MULTIPLICATION_TYPE) {
            type = 'multiplication';
        } else if (problemSet && problemSet.type === RREF_TYPE) {
            type = 'rref';
        }
        return `matrix-${type}-${safeKind}-${seed}.pdf`;
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

    function isFraction(value) {
        return value && typeof value === 'object' && value.kind === 'fraction';
    }

    function exactValueText(value) {
        if (!isFraction(value)) return String(value);
        if (value.denominator === 1) return String(value.numerator);
        return `${value.numerator}/${value.denominator}`;
    }

    function drawExactValue(page, value, centerX, centerY, fonts, options) {
        const opts = options || {};
        const color = opts.color;
        if (!isFraction(value) || value.denominator === 1) {
            const text = isFraction(value) ? String(value.numerator) : String(value);
            const width = fonts.regular.widthOfTextAtSize(text, opts.fontSize);
            page.drawText(text, {
                x: centerX - width / 2,
                y: centerY - opts.fontSize / 2 + 2,
                size: opts.fontSize,
                font: fonts.regular,
                color
            });
            return;
        }

        const numeratorText = String(value.numerator);
        const denominatorText = String(value.denominator);
        const size = opts.fractionFontSize || Math.max(7, opts.fontSize - 1);
        const numeratorWidth = fonts.regular.widthOfTextAtSize(numeratorText, size);
        const denominatorWidth = fonts.regular.widthOfTextAtSize(denominatorText, size);
        const barWidth = Math.max(numeratorWidth, denominatorWidth) + 6;
        page.drawText(numeratorText, {
            x: centerX - numeratorWidth / 2,
            y: centerY + 2,
            size,
            font: fonts.regular,
            color
        });
        page.drawLine({
            start: { x: centerX - barWidth / 2, y: centerY },
            end: { x: centerX + barWidth / 2, y: centerY },
            thickness: 0.7,
            color
        });
        page.drawText(denominatorText, {
            x: centerX - denominatorWidth / 2,
            y: centerY - size - 2,
            size,
            font: fonts.regular,
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
                const text = opts.empty ? '' : exactValueText(value);
                if (!text) return;
                const size = opts.fontSize;
                const textWidth = fonts.regular.widthOfTextAtSize(text, size);
                const tx = x + bracketArm + c * opts.cellWidth + (opts.cellWidth - textWidth) / 2;
                const ty = y - (r + 1) * opts.cellHeight + 5;
                if (isFraction(value) && value.denominator !== 1) {
                    drawExactValue(
                        page,
                        value,
                        x + bracketArm + c * opts.cellWidth + opts.cellWidth / 2,
                        y - r * opts.cellHeight - opts.cellHeight / 2,
                        fonts,
                        opts
                    );
                } else {
                    page.drawText(text, { x: tx, y: ty, size, font: fonts.regular, color });
                }
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

    function drawMultiplicationSign(page, centerX, centerY, size, color) {
        const half = size / 2;
        page.drawLine({
            start: { x: centerX - half, y: centerY + half },
            end: { x: centerX + half, y: centerY - half },
            thickness: 1.2,
            color
        });
        page.drawLine({
            start: { x: centerX + half, y: centerY + half },
            end: { x: centerX - half, y: centerY - half },
            thickness: 1.2,
            color
        });
    }

    function drawHeader(page, plan, pageInfo, fonts, colors) {
        if (pageInfo.pageNumber === 1) {
            drawTextCentered(page, plan.title, 746, fonts.bold, 16, colors.text);
            drawTextCentered(page, plan.subtitle, 727, fonts.regular, 11, colors.muted);

            page.drawText('Name:', { x: 44, y: 702, size: 10, font: fonts.regular, color: colors.text });
            page.drawLine({ start: { x: 78, y: 701 }, end: { x: 300, y: 701 }, thickness: 0.8, color: colors.text });
            page.drawText('Date:', { x: 328, y: 702, size: 10, font: fonts.regular, color: colors.text });
            page.drawLine({ start: { x: 360, y: 701 }, end: { x: 568, y: 701 }, thickness: 0.8, color: colors.text });

            drawTextCentered(page, plan.instructions || 'Solve each problem. Show your work.', 680, fonts.regular, 10, colors.muted);
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

    function drawAnswerKeyHeader(page, plan, pageInfo, fonts, colors) {
        drawTextCentered(page, plan.title, 746, fonts.bold, 16, colors.text);
        drawTextCentered(page, plan.subtitle, 727, fonts.regular, 11, colors.muted);
        const seedText = `Set seed: ${plan.seed || ''}`;
        page.drawText(seedText, {
            x: 44,
            y: 704,
            size: 9,
            font: fonts.regular,
            color: colors.muted
        });
        const pageText = `Page ${pageInfo.pageNumber} of ${pageInfo.totalPages}`;
        page.drawText(pageText, {
            x: PAGE_WIDTH - 44 - fonts.regular.widthOfTextAtSize(pageText, 9),
            y: 704,
            size: 9,
            font: fonts.regular,
            color: colors.muted
        });
        page.drawLine({
            start: { x: 44, y: 688 },
            end: { x: PAGE_WIDTH - 44, y: 688 },
            thickness: 0.6,
            color: colors.line
        });
        return 664;
    }

    function drawAnswerKeyProblem(page, item, box, fonts, colors) {
        const numberText = `${item.globalNumber}.`;
        page.drawText(numberText, { x: box.x, y: box.y - 14, size: 11, font: fonts.bold, color: colors.text });

        const matrixTop = box.y - 30;
        const matrixA = drawMatrix(page, item.matrixA, box.x + 12, matrixTop, fonts, { color: colors.text });
        page.drawText(item.operator, {
            x: box.x + 12 + matrixA.width + 11,
            y: matrixTop - matrixA.height / 2 - 2,
            size: 13,
            font: fonts.bold,
            color: colors.text
        });
        drawMatrix(page, item.matrixB, box.x + 12 + matrixA.width + 30, matrixTop, fonts, { color: colors.text });

        const answerY = box.y - 98;
        page.drawText('Answer:', { x: box.x + 4, y: answerY, size: 9, font: fonts.bold, color: colors.text });
        drawMatrix(page, item.exactAnswer, box.x + 58, answerY + 12, fonts, {
            color: colors.text,
            cellWidth: 24,
            cellHeight: 18
        });
    }

    function matrixOptionsForMultiplication(item) {
        const maxCols = Math.max(
            item.matrixA[0] ? item.matrixA[0].length : 0,
            item.matrixB[0] ? item.matrixB[0].length : 0,
            item.exactAnswer && item.exactAnswer[0] ? item.exactAnswer[0].length : 0,
            item.resultDimensions ? item.resultDimensions.cols : 0
        );
        if (maxCols >= 3) {
            return { cellWidth: 22, cellHeight: 18, fontSize: 9 };
        }
        return { cellWidth: 24, cellHeight: 18, fontSize: 9 };
    }

    function drawMultiplicationOperands(page, item, x, y, fonts, colors) {
        const opts = matrixOptionsForMultiplication(item);
        const matrixA = drawMatrix(page, item.matrixA, x, y, fonts, Object.assign({}, opts, { color: colors.text }));
        const signCenterX = x + matrixA.width + 16;
        const signCenterY = y - matrixA.height / 2;
        drawMultiplicationSign(page, signCenterX, signCenterY, 8, colors.text);
        const matrixB = drawMatrix(page, item.matrixB, x + matrixA.width + 30, y, fonts, Object.assign({}, opts, { color: colors.text }));
        return {
            width: matrixA.width + 30 + matrixB.width,
            height: Math.max(matrixA.height, matrixB.height),
            options: opts
        };
    }

    function drawMultiplicationWorksheetProblem(page, item, box, fonts, colors) {
        const numberText = `${item.globalNumber}.`;
        page.drawText(numberText, { x: box.x, y: box.y - 14, size: 11, font: fonts.bold, color: colors.text });

        const matrixTop = box.y - 30;
        drawMultiplicationOperands(page, item, box.x + 12, matrixTop, fonts, colors);

        const answerY = box.y - 102;
        page.drawText('Answer:', { x: box.x + 4, y: answerY, size: 9, font: fonts.bold, color: colors.text });
        drawEmptyMatrix(page, item.resultDimensions.rows, item.resultDimensions.cols, box.x + 58, answerY + 12, fonts, {
            color: colors.text,
            cellWidth: 24,
            cellHeight: 18
        });

        const lineCount = box.height > 170 ? 4 : 2;
        for (let index = 0; index < lineCount; index++) {
            const y = box.y - 143 - index * 18;
            if (y <= box.y - box.height + 10) break;
            page.drawLine({
                start: { x: box.x + 4, y },
                end: { x: box.x + box.width - 4, y },
                thickness: 0.5,
                color: colors.line
            });
        }
    }

    function drawMultiplicationAnswerKeyProblem(page, item, box, fonts, colors) {
        const numberText = `${item.globalNumber}.`;
        page.drawText(numberText, { x: box.x, y: box.y - 14, size: 11, font: fonts.bold, color: colors.text });

        const matrixTop = box.y - 30;
        drawMultiplicationOperands(page, item, box.x + 12, matrixTop, fonts, colors);

        const answerY = box.y - 104;
        page.drawText('Answer:', { x: box.x + 4, y: answerY, size: 9, font: fonts.bold, color: colors.text });
        drawMatrix(page, item.exactAnswer, box.x + 58, answerY + 12, fonts, {
            color: colors.text,
            cellWidth: 24,
            cellHeight: 18,
            fontSize: 9
        });
    }

    function drawRrefWorksheetProblem(page, item, box, fonts, colors) {
        const numberText = `${item.globalNumber}.`;
        page.drawText(numberText, { x: box.x, y: box.y - 14, size: 11, font: fonts.bold, color: colors.text });

        page.drawText('Find the RREF of', {
            x: box.x + 14,
            y: box.y - 32,
            size: 9,
            font: fonts.bold,
            color: colors.text
        });
        page.drawText('Input Matrix', {
            x: box.x + 14,
            y: box.y - 49,
            size: 8,
            font: fonts.bold,
            color: colors.muted
        });

        const matrixTop = box.y - 62;
        drawMatrix(page, item.matrix, box.x + 14, matrixTop, fonts, {
            color: colors.text,
            cellWidth: item.cols >= 4 ? 24 : 26,
            cellHeight: 20,
            fontSize: 10
        });

        const answerLabelY = box.y - 126;
        page.drawText('RREF:', { x: box.x + 4, y: answerLabelY, size: 9, font: fonts.bold, color: colors.text });
        drawEmptyMatrix(page, item.answerDimensions.rows, item.answerDimensions.cols, box.x + 14, answerLabelY - 6, fonts, {
            color: colors.text,
            cellWidth: item.answerDimensions.cols >= 4 ? 30 : 32,
            cellHeight: 21,
            fontSize: 10
        });

        for (let index = 0; index < 4; index++) {
            const y = box.y - 186 - index * 20;
            if (y <= box.y - box.height + 12) break;
            page.drawLine({
                start: { x: box.x + 4, y },
                end: { x: box.x + box.width - 4, y },
                thickness: 0.5,
                color: colors.line
            });
        }
    }

    function drawRrefAnswerKeyProblem(page, item, box, fonts, colors) {
        const numberText = `${item.globalNumber}.`;
        page.drawText(numberText, { x: box.x, y: box.y - 14, size: 11, font: fonts.bold, color: colors.text });

        const matrixOptions = {
            color: colors.text,
            cellWidth: item.dimensions.cols >= 4 ? 30 : 32,
            cellHeight: 25,
            fontSize: 10,
            fractionFontSize: 8
        };
        page.drawText('Original:', { x: box.x + 4, y: box.y - 32, size: 9, font: fonts.bold, color: colors.text });
        drawMatrix(page, item.matrix, box.x + 58, box.y - 20, fonts, matrixOptions);

        page.drawText('RREF:', { x: box.x + 4, y: box.y - 118, size: 9, font: fonts.bold, color: colors.text });
        drawMatrix(page, item.exactAnswer, box.x + 58, box.y - 106, fonts, matrixOptions);
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

    async function createAdditionSubtractionAnswerKeyPdf(problemSet, options) {
        const opts = options || {};
        const plan = buildAdditionSubtractionAnswerKeyPlan(problemSet, opts);
        const pdfLib = getPdfLib(opts);
        const { PDFDocument, StandardFonts, rgb } = pdfLib;
        const pdfDoc = await PDFDocument.create();
        pdfDoc.setTitle('Matrix Addition and Subtraction Practice Answer Key');
        pdfDoc.setAuthor('MatrixCalcu');
        pdfDoc.setCreator('MatrixCalcu');
        pdfDoc.setSubject('Matrix addition and subtraction practice answer key');
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
            const contentTop = drawAnswerKeyHeader(page, plan, pageInfo, fonts, colors);
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
                drawAnswerKeyProblem(page, item, { x, y, width: cellWidth, height: cellHeight }, fonts, colors);
            });
            drawFooter(page, fonts, colors);
        });

        return pdfDoc.save();
    }

    async function createMultiplicationWorksheetPdf(problemSet, options) {
        const opts = options || {};
        const plan = buildMultiplicationWorksheetPlan(problemSet, opts);
        const pdfLib = getPdfLib(opts);
        const { PDFDocument, StandardFonts, rgb } = pdfLib;
        const pdfDoc = await PDFDocument.create();
        pdfDoc.setTitle('Matrix Multiplication Practice Worksheet');
        pdfDoc.setAuthor('MatrixCalcu');
        pdfDoc.setCreator('MatrixCalcu');
        pdfDoc.setSubject('Matrix multiplication practice worksheet');
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
            const columns = plan.layout.columns;
            const rows = Math.ceil(plan.layout.problemsPerPage / columns);
            const cellWidth = (availableWidth - plan.layout.columnGap * (columns - 1)) / columns;
            const cellHeight = (availableHeight - plan.layout.rowGap * (rows - 1)) / rows;

            pageInfo.problems.forEach((item, index) => {
                const column = index % columns;
                const row = Math.floor(index / columns);
                const x = left + column * (cellWidth + plan.layout.columnGap);
                const y = contentTop - row * (cellHeight + plan.layout.rowGap);
                drawMultiplicationWorksheetProblem(page, item, { x, y, width: cellWidth, height: cellHeight }, fonts, colors);
            });
            drawFooter(page, fonts, colors);
        });

        return pdfDoc.save();
    }

    async function createMultiplicationAnswerKeyPdf(problemSet, options) {
        const opts = options || {};
        const plan = buildMultiplicationAnswerKeyPlan(problemSet, opts);
        const pdfLib = getPdfLib(opts);
        const { PDFDocument, StandardFonts, rgb } = pdfLib;
        const pdfDoc = await PDFDocument.create();
        pdfDoc.setTitle('Matrix Multiplication Practice Answer Key');
        pdfDoc.setAuthor('MatrixCalcu');
        pdfDoc.setCreator('MatrixCalcu');
        pdfDoc.setSubject('Matrix multiplication practice answer key');
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
            const contentTop = drawAnswerKeyHeader(page, plan, pageInfo, fonts, colors);
            const left = plan.layout.marginLeft;
            const right = PAGE_WIDTH - plan.layout.marginRight;
            const footerTop = plan.layout.marginBottom + 18;
            const gridBottom = footerTop + 8;
            const availableWidth = right - left;
            const availableHeight = contentTop - gridBottom;
            const columns = plan.layout.columns;
            const rows = Math.ceil(plan.layout.problemsPerPage / columns);
            const cellWidth = (availableWidth - plan.layout.columnGap * (columns - 1)) / columns;
            const cellHeight = (availableHeight - plan.layout.rowGap * (rows - 1)) / rows;

            pageInfo.problems.forEach((item, index) => {
                const column = index % columns;
                const row = Math.floor(index / columns);
                const x = left + column * (cellWidth + plan.layout.columnGap);
                const y = contentTop - row * (cellHeight + plan.layout.rowGap);
                drawMultiplicationAnswerKeyProblem(page, item, { x, y, width: cellWidth, height: cellHeight }, fonts, colors);
            });
            drawFooter(page, fonts, colors);
        });

        return pdfDoc.save();
    }

    async function createRrefWorksheetPdf(problemSet, options) {
        const opts = options || {};
        const plan = buildRrefWorksheetPlan(problemSet, opts);
        const pdfLib = getPdfLib(opts);
        const { PDFDocument, StandardFonts, rgb } = pdfLib;
        const pdfDoc = await PDFDocument.create();
        pdfDoc.setTitle('Matrix RREF Practice Worksheet');
        pdfDoc.setAuthor('MatrixCalcu');
        pdfDoc.setCreator('MatrixCalcu');
        pdfDoc.setSubject('Matrix row reduction and RREF practice worksheet');
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
            const columns = plan.layout.columns;
            const rows = plan.layout.rows;
            const cellWidth = (availableWidth - plan.layout.columnGap * (columns - 1)) / columns;
            const cellHeight = (availableHeight - plan.layout.rowGap * (rows - 1)) / rows;

            pageInfo.problems.forEach((item, index) => {
                const column = index % columns;
                const row = Math.floor(index / columns);
                const x = left + column * (cellWidth + plan.layout.columnGap);
                const y = contentTop - row * (cellHeight + plan.layout.rowGap);
                drawRrefWorksheetProblem(page, item, { x, y, width: cellWidth, height: cellHeight }, fonts, colors);
            });
            drawFooter(page, fonts, colors);
        });

        return pdfDoc.save();
    }

    async function createRrefAnswerKeyPdf(problemSet, options) {
        const opts = options || {};
        const plan = buildRrefAnswerKeyPlan(problemSet, opts);
        const pdfLib = getPdfLib(opts);
        const { PDFDocument, StandardFonts, rgb } = pdfLib;
        const pdfDoc = await PDFDocument.create();
        pdfDoc.setTitle('Matrix RREF Practice Answer Key');
        pdfDoc.setAuthor('MatrixCalcu');
        pdfDoc.setCreator('MatrixCalcu');
        pdfDoc.setSubject('Matrix row reduction and RREF practice answer key');
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
            const contentTop = drawAnswerKeyHeader(page, plan, pageInfo, fonts, colors);
            const left = plan.layout.marginLeft;
            const right = PAGE_WIDTH - plan.layout.marginRight;
            const footerTop = plan.layout.marginBottom + 18;
            const gridBottom = footerTop + 8;
            const availableWidth = right - left;
            const availableHeight = contentTop - gridBottom;
            const columns = plan.layout.columns;
            const rows = plan.layout.rows;
            const cellWidth = (availableWidth - plan.layout.columnGap * (columns - 1)) / columns;
            const cellHeight = (availableHeight - plan.layout.rowGap * (rows - 1)) / rows;

            pageInfo.problems.forEach((item, index) => {
                const column = index % columns;
                const row = Math.floor(index / columns);
                const x = left + column * (cellWidth + plan.layout.columnGap);
                const y = contentTop - row * (cellHeight + plan.layout.rowGap);
                drawRrefAnswerKeyProblem(page, item, { x, y, width: cellWidth, height: cellHeight }, fonts, colors);
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

    async function downloadAdditionSubtractionAnswerKeyPdf(problemSet, options) {
        if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
            throw new Error('PDF download requires a browser environment.');
        }
        const bytes = await createAdditionSubtractionAnswerKeyPdf(problemSet, options);
        const filename = createPdfFilename(problemSet, 'answer-key');
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

    async function downloadMultiplicationWorksheetPdf(problemSet, options) {
        if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
            throw new Error('PDF download requires a browser environment.');
        }
        const bytes = await createMultiplicationWorksheetPdf(problemSet, options);
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

    async function downloadMultiplicationAnswerKeyPdf(problemSet, options) {
        if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
            throw new Error('PDF download requires a browser environment.');
        }
        const bytes = await createMultiplicationAnswerKeyPdf(problemSet, options);
        const filename = createPdfFilename(problemSet, 'answer-key');
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

    async function downloadRrefWorksheetPdf(problemSet, options) {
        if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
            throw new Error('PDF download requires a browser environment.');
        }
        const bytes = await createRrefWorksheetPdf(problemSet, options);
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

    async function downloadRrefAnswerKeyPdf(problemSet, options) {
        if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
            throw new Error('PDF download requires a browser environment.');
        }
        const bytes = await createRrefAnswerKeyPdf(problemSet, options);
        const filename = createPdfFilename(problemSet, 'answer-key');
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

    function createWorksheetPdf(problemSet, options) {
        if (problemSet && problemSet.type === ADD_SUB_TYPE) {
            return createAdditionSubtractionWorksheetPdf(problemSet, options);
        }
        if (problemSet && problemSet.type === MULTIPLICATION_TYPE) {
            return createMultiplicationWorksheetPdf(problemSet, options);
        }
        if (problemSet && problemSet.type === RREF_TYPE) {
            return createRrefWorksheetPdf(problemSet, options);
        }
        const actual = problemSet && problemSet.type ? problemSet.type : 'unknown';
        throw new Error(`Unsupported PDF worksheet type: ${actual}`);
    }

    function createAnswerKeyPdf(problemSet, options) {
        if (problemSet && problemSet.type === ADD_SUB_TYPE) {
            return createAdditionSubtractionAnswerKeyPdf(problemSet, options);
        }
        if (problemSet && problemSet.type === MULTIPLICATION_TYPE) {
            return createMultiplicationAnswerKeyPdf(problemSet, options);
        }
        if (problemSet && problemSet.type === RREF_TYPE) {
            return createRrefAnswerKeyPdf(problemSet, options);
        }
        const actual = problemSet && problemSet.type ? problemSet.type : 'unknown';
        throw new Error(`Unsupported PDF answer key type: ${actual}`);
    }

    function downloadWorksheetPdf(problemSet, options) {
        if (problemSet && problemSet.type === ADD_SUB_TYPE) {
            return downloadAdditionSubtractionWorksheetPdf(problemSet, options);
        }
        if (problemSet && problemSet.type === MULTIPLICATION_TYPE) {
            return downloadMultiplicationWorksheetPdf(problemSet, options);
        }
        if (problemSet && problemSet.type === RREF_TYPE) {
            return downloadRrefWorksheetPdf(problemSet, options);
        }
        const actual = problemSet && problemSet.type ? problemSet.type : 'unknown';
        throw new Error(`Unsupported PDF worksheet type: ${actual}`);
    }

    function downloadAnswerKeyPdf(problemSet, options) {
        if (problemSet && problemSet.type === ADD_SUB_TYPE) {
            return downloadAdditionSubtractionAnswerKeyPdf(problemSet, options);
        }
        if (problemSet && problemSet.type === MULTIPLICATION_TYPE) {
            return downloadMultiplicationAnswerKeyPdf(problemSet, options);
        }
        if (problemSet && problemSet.type === RREF_TYPE) {
            return downloadRrefAnswerKeyPdf(problemSet, options);
        }
        const actual = problemSet && problemSet.type ? problemSet.type : 'unknown';
        throw new Error(`Unsupported PDF answer key type: ${actual}`);
    }

    const api = {
        PAGE_WIDTH,
        PAGE_HEIGHT,
        PROBLEMS_PER_PAGE,
        RREF_PROBLEMS_PER_PAGE,
        buildAdditionSubtractionWorksheetPlan,
        buildAdditionSubtractionAnswerKeyPlan,
        buildMultiplicationWorksheetPlan,
        buildMultiplicationAnswerKeyPlan,
        buildRrefWorksheetPlan,
        buildRrefAnswerKeyPlan,
        createAdditionSubtractionWorksheetPdf,
        createAdditionSubtractionAnswerKeyPdf,
        createMultiplicationWorksheetPdf,
        createMultiplicationAnswerKeyPdf,
        createRrefWorksheetPdf,
        createRrefAnswerKeyPdf,
        downloadAdditionSubtractionWorksheetPdf,
        downloadAdditionSubtractionAnswerKeyPdf,
        downloadMultiplicationWorksheetPdf,
        downloadMultiplicationAnswerKeyPdf,
        downloadRrefWorksheetPdf,
        downloadRrefAnswerKeyPdf,
        createWorksheetPdf,
        createAnswerKeyPdf,
        downloadWorksheetPdf,
        downloadAnswerKeyPdf,
        createPdfFilename
    };

    Object.defineProperty(api, '__test', {
        value: {
            drawMatrix,
            drawRrefWorksheetProblem,
            drawRrefAnswerKeyProblem
        },
        enumerable: false
    });

    root.MatrixPractice = root.MatrixPractice || {};
    root.MatrixPractice.pdf = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
