(function (root) {
    'use strict';

    const DEFAULT_MESSAGES = {
        problemType: 'Problem Type',
        difficulty: 'Difficulty',
        numberOfProblems: 'Number of Problems',
        operation: 'Operation',
        solutionType: 'Solution Type',
        generateNewSet: 'Generate Worksheet',
        generating: 'Generating...',
        showAnswer: 'Show Answer',
        hideAnswer: 'Hide Answer',
        showSteps: 'Show Steps',
        hideSteps: 'Hide Steps',
        answer: 'Answer',
        steps: 'Steps',
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',
        mixed: 'Mixed',
        addition: 'Addition',
        subtraction: 'Subtraction',
        multiplication: 'Multiplication',
        rref: 'RREF',
        systemsOfEquations: 'Systems of Equations',
        uniqueSolution: 'Unique Solution',
        noSolution: 'No Solution',
        infinitelyManySolutions: 'Infinitely Many Solutions',
        freeVariable: 'Free Variable',
        practiceSet: 'Practice Set',
        error: 'Error',
        seed: 'Seed',
        problem: 'Problem',
        matrixA: 'Matrix A',
        matrixB: 'Matrix B',
        answerMatrix: 'Answer Matrix',
        inputMatrix: 'Input Matrix',
        augmentedMatrix: 'Augmented Matrix',
        findRref: 'Find the RREF of',
        noSteps: 'No steps available.',
        generateError: 'Unable to generate this practice set. Try another option.',
        noSolutionSummary: 'No solution',
        infiniteSolutionSummary: 'Infinitely many solutions',
        formAugmentedMatrix: 'Form the augmented matrix.',
        solutionSummary: 'Solution summary',
        row: 'Row',
        worksheet: 'Worksheet',
        answerKey: 'Answer Key',
        detailedSolutions: 'Detailed Solutions',
        downloadWorksheetPdf: 'Download Worksheet PDF',
        creatingPdf: 'Creating PDF...',
        pdfError: 'Unable to create this worksheet PDF. Try generating the worksheet again.',
        name: 'Name',
        date: 'Date',
        page: 'Page',
        of: 'of',
        worksheetTitle: 'Matrix Practice Worksheet',
        answerKeyTitle: 'Matrix Practice Answer Key',
        solveInstructions: 'Solve each problem. Show your work.',
        exactAnswers: 'Exact Answers',
        stepByStepSolutions: 'Step-by-Step Solutions',
        set: 'Set',
        emptyTitle: 'Choose your settings and generate a matrix practice worksheet.',
        emptyBody: 'Your problems, exact answers, and steps will appear here.',
        rows: 'Rows',
        columns: 'Columns',
        rowsA: 'Rows of A',
        colsA: 'Columns of A',
        colsB: 'Columns of B',
        matrixSize: 'Matrix Size',
        variables: 'Number of Variables',
        minValue: 'Minimum Value',
        maxValue: 'Maximum Value',
        invalidRange: 'Minimum Value must be less than or equal to Maximum Value.',
        integerRequired: 'Minimum Value and Maximum Value must be integers.',
        multiplicationSizeHelp: 'Matrix B rows automatically match Matrix A columns.',
        settingsChanged: 'Settings changed. Click Generate Worksheet to create a new set.'
    };

    const COUNT_OPTIONS = [4, 6, 8, 10];

    const DIFFICULTY_DEFAULTS = {
        easy: { minValue: 0, maxValue: 5 },
        medium: { minValue: -5, maxValue: 5 },
        hard: { minValue: -7, maxValue: 7 }
    };

    const TYPE_DIMENSION_DEFAULTS = {
        'addition-subtraction': {
            easy: { rows: 2, cols: 2 },
            medium: { rows: 3, cols: 3 },
            hard: { rows: 3, cols: 3 }
        },
        multiplication: {
            easy: { rowsA: 2, colsA: 2, colsB: 2 },
            medium: { rowsA: 2, colsA: 3, colsB: 2 },
            hard: { rowsA: 3, colsA: 3, colsB: 3 }
        },
        rref: {
            easy: { rrefSize: '2x3' },
            medium: { rrefSize: '3x3' },
            hard: { rrefSize: '3x4' }
        },
        'linear-system': {
            easy: { variables: 2, solutionType: 'unique' },
            medium: { variables: 2, solutionType: 'mixed' },
            hard: { variables: 3, solutionType: 'mixed' }
        }
    };

    const TYPE_LABEL_KEYS = {
        'addition-subtraction': 'additionSubtraction',
        multiplication: 'multiplication',
        rref: 'rref',
        'linear-system': 'systemsOfEquations'
    };

    const WORKSHEET_TYPE_LABELS = {
        'addition-subtraction': 'Matrix Addition and Subtraction',
        multiplication: 'Matrix Multiplication',
        rref: 'Reduced Row Echelon Form',
        'linear-system': 'Systems of Equations'
    };

    const VIEW_MODES = ['worksheet', 'answer-key', 'detailed-solutions'];

    const config = root.MATRIX_PRACTICE_PAGE_CONFIG || {};
    const messages = Object.assign({}, DEFAULT_MESSAGES, config.messages || {});

    function t(key) {
        return messages[key] || DEFAULT_MESSAGES[key] || key;
    }

    function createInitialState() {
        return {
            type: 'addition-subtraction',
            difficulty: 'easy',
            count: 6,
            operation: 'mixed',
            rows: 2,
            cols: 2,
            rowsA: 2,
            colsA: 2,
            colsB: 2,
            rrefSize: '2x3',
            variables: 2,
            solutionType: 'unique',
            solutionTypeTouched: false,
            minValue: 0,
            maxValue: 5,
            generationToken: 0,
            currentSet: null,
            currentView: 'worksheet',
            hasGenerated: false,
            dirty: false
        };
    }

    function applyDifficultyDefaults(state) {
        const valueDefaults = DIFFICULTY_DEFAULTS[state.difficulty];
        Object.assign(state, valueDefaults);

        const dimensionDefaults = TYPE_DIMENSION_DEFAULTS[state.type][state.difficulty];
        Object.keys(dimensionDefaults).forEach((key) => {
            if (key === 'solutionType' && state.solutionTypeTouched) return;
            state[key] = dimensionDefaults[key];
        });
    }

    function parseRrefSize(size) {
        const parts = String(size).split('x').map((part) => Number(part));
        return { rows: parts[0], cols: parts[1] };
    }

    function validateSettings(state) {
        if (!COUNT_OPTIONS.includes(Number(state.count))) {
            return { ok: false, message: t('error') };
        }
        if (!Number.isInteger(Number(state.minValue)) || !Number.isInteger(Number(state.maxValue))) {
            return { ok: false, message: t('integerRequired') };
        }
        if (Number(state.minValue) > Number(state.maxValue)) {
            return { ok: false, message: t('invalidRange') };
        }
        return { ok: true, message: '' };
    }

    function applyProblemTypeChange(state, nextType) {
        if (state.type === nextType) return false;
        state.type = nextType;
        state.generationToken += 1;
        state.currentSet = null;
        state.currentView = 'worksheet';
        state.hasGenerated = false;
        state.dirty = false;
        applyDifficultyDefaults(state);
        return true;
    }

    function markSettingsChangedState(state) {
        state.dirty = true;
        return state;
    }

    function applyViewModeChange(state, viewMode) {
        if (!VIEW_MODES.includes(viewMode) || !state.currentSet) return false;
        state.currentView = viewMode;
        return true;
    }

    function buildGeneratorOptions(state, seed) {
        const base = {
            seed,
            count: Number(state.count),
            difficulty: state.difficulty,
            minValue: Number(state.minValue),
            maxValue: Number(state.maxValue),
            includeNegatives: Number(state.minValue) < 0
        };

        if (state.type === 'addition-subtraction') {
            return Object.assign(base, {
                operation: state.operation,
                rows: Number(state.rows),
                cols: Number(state.cols)
            });
        }

        if (state.type === 'multiplication') {
            return Object.assign(base, {
                rowsA: Number(state.rowsA),
                colsA: Number(state.colsA),
                colsB: Number(state.colsB)
            });
        }

        if (state.type === 'rref') {
            return Object.assign(base, parseRrefSize(state.rrefSize));
        }

        return Object.assign(base, {
            variables: Number(state.variables),
            solutionType: state.solutionType
        });
    }

    function getWorksheetTypeLabel(problemSet) {
        return WORKSHEET_TYPE_LABELS[problemSet.type] || getTypeLabel(problemSet.type);
    }

    function getWorksheetLayout(problemSet) {
        const first = problemSet && problemSet.problems && problemSet.problems[0];
        if (!first) return 'regular';

        if (problemSet.type === 'addition-subtraction') {
            const rows = first.dimensions && first.dimensions.rows;
            const cols = first.dimensions && first.dimensions.cols;
            return rows === 3 && cols === 3 ? 'regular' : 'compact';
        }

        if (problemSet.type === 'multiplication') {
            const dims = first.dimensions || {};
            if (dims.rowsA === 3 && dims.colsA === 3 && dims.colsB === 3) return 'wide';
            if (first.difficulty === 'easy') return 'compact';
            return 'regular';
        }

        if (problemSet.type === 'rref') {
            return 'regular';
        }

        if (problemSet.type === 'linear-system') {
            const dims = first.dimensions || {};
            return dims.variables === 3 ? 'regular' : 'compact';
        }

        return 'regular';
    }

    function getProblemsPerPage(viewMode, layout) {
        if (viewMode === 'detailed-solutions') return Infinity;
        if (viewMode === 'answer-key') return layout === 'wide' ? 4 : 8;
        return layout === 'compact' ? 6 : 4;
    }

    function chunkProblems(problems, size) {
        const source = problems.slice();
        if (!Number.isFinite(size) || size <= 0 || size >= source.length) {
            return source.length ? [source] : [];
        }

        const chunks = [];
        for (let index = 0; index < source.length; index += size) {
            chunks.push(source.slice(index, index + size));
        }
        return chunks;
    }

    function buildPageMetadata(problemSet, viewMode) {
        const layout = getWorksheetLayout(problemSet);
        const perPage = getProblemsPerPage(viewMode, layout);
        const chunks = chunkProblems(problemSet.problems, perPage);
        const totalPages = chunks.length;
        return chunks.map((problems, pageIndex) => ({
            viewMode,
            layout,
            pageIndex,
            pageNumber: pageIndex + 1,
            totalPages,
            problems: problems.map((problem, index) => ({
                problem,
                problemNumber: pageIndex * perPage + index + 1
            }))
        }));
    }

    function buildWorksheetProblemItems(problemSet) {
        return problemSet.problems.map((problem, index) => ({
            problem,
            problemNumber: index + 1,
            includesAnswer: false,
            includesSteps: false
        }));
    }

    function getWorksheetBlankMatrixDimensions(problem) {
        const dims = problem.dimensions || {};
        if (problem.type === 'addition-subtraction') {
            return { rows: dims.rows, cols: dims.cols };
        }
        if (problem.type === 'multiplication') {
            return { rows: dims.resultRows, cols: dims.resultCols };
        }
        if (problem.type === 'rref') {
            return { rows: dims.rows, cols: dims.cols };
        }
        return null;
    }

    function isFraction(value) {
        return value && typeof value === 'object' && value.kind === 'fraction';
    }

    function formatScalarText(value) {
        if (isFraction(value)) {
            return `${value.numerator}/${value.denominator}`;
        }
        return String(value);
    }

    function appendScalar(parent, value) {
        if (!isFraction(value)) {
            parent.appendChild(document.createTextNode(String(value)));
            return;
        }

        if (value.numerator < 0) {
            parent.appendChild(document.createTextNode('-'));
        }
        const fraction = document.createElement('span');
        fraction.className = 'mp-fraction';
        const numerator = document.createElement('span');
        numerator.className = 'mp-fraction-num';
        numerator.textContent = String(Math.abs(value.numerator));
        const denominator = document.createElement('span');
        denominator.className = 'mp-fraction-den';
        denominator.textContent = String(value.denominator);
        fraction.append(numerator, denominator);
        parent.appendChild(fraction);
    }

    function matrixToText(matrix) {
        return matrix.map((row) => row.map(formatScalarText).join(',')).join(';');
    }

    function renderMatrix(matrix, options) {
        const opts = options || {};
        const wrapper = document.createElement('div');
        wrapper.className = 'mp-matrix-wrap';
        if (opts.label) {
            const label = document.createElement('div');
            label.className = 'mp-matrix-label';
            label.textContent = opts.label;
            wrapper.appendChild(label);
        }

        const matrixBox = document.createElement('div');
        matrixBox.className = 'mp-matrix';
        matrixBox.style.setProperty('--mp-cols', String(matrix[0] ? matrix[0].length : 1));
        matrixBox.setAttribute('aria-label', opts.label || matrixToText(matrix));

        matrix.forEach((row) => {
            row.forEach((value, columnIndex) => {
                const cell = document.createElement('span');
                cell.className = 'mp-cell';
                if (opts.augmented && columnIndex === row.length - 1) {
                    cell.classList.add('mp-augmented-cell');
                }
                appendScalar(cell, value);
                matrixBox.appendChild(cell);
            });
        });

        wrapper.appendChild(matrixBox);
        return wrapper;
    }

    function renderEmptyMatrix(rows, cols, options) {
        const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
        const wrapper = renderMatrix(matrix, options);
        wrapper.classList.add('mp-empty-matrix-wrap');
        return wrapper;
    }

    function tag(text) {
        const span = document.createElement('span');
        span.className = 'mp-tag';
        span.textContent = text;
        return span;
    }

    function rowName(index) {
        return `R${index + 1}`;
    }

    function variableName(index) {
        return ['x', 'y', 'z'][index] || `x${index + 1}`;
    }

    function parameterName(index) {
        return ['t', 's', 'u'][index] || `t${index + 1}`;
    }

    function signAndAbs(value) {
        if (typeof value === 'number') {
            return { negative: value < 0, abs: Math.abs(value) };
        }
        return {
            negative: value.numerator < 0,
            abs: Object.assign({}, value, { numerator: Math.abs(value.numerator) })
        };
    }

    function scalarEquals(value, number) {
        if (typeof value === 'number') return value === number;
        if (number === 0) return value.numerator === 0;
        if (number === 1) return value.numerator === value.denominator;
        if (number === -1) return value.numerator === -value.denominator;
        return false;
    }

    function scalarTermText(value, variable) {
        if (scalarEquals(value, 1)) return variable;
        if (scalarEquals(value, -1)) return `-${variable}`;
        return `${formatScalarText(value)}${variable}`;
    }

    function formatEquationText(coefficients, constant) {
        const terms = [];
        coefficients.forEach((coefficient, index) => {
            if (coefficient === 0) return;
            terms.push(scalarTermText(coefficient, variableName(index)));
        });

        const left = terms.length
            ? terms.map((term, index) => {
                if (index === 0) return term;
                return term.charAt(0) === '-' ? `- ${term.slice(1)}` : `+ ${term}`;
            }).join(' ')
            : '0';
        return `${left} = ${formatScalarText(constant)}`;
    }

    function formatRrefOperationText(step) {
        if (step.kind === 'swap-rows') {
            return `${rowName(step.rowA)} <-> ${rowName(step.rowB)}`;
        }
        if (step.kind === 'scale-row') {
            return `${rowName(step.row)} <- ${formatScalarText(step.factor)}${rowName(step.row)}`;
        }
        if (step.kind === 'add-row-multiple') {
            const multiple = formatScalarText(step.multiple);
            return `${rowName(step.targetRow)} <- ${rowName(step.targetRow)} + ${multiple}${rowName(step.sourceRow)}`;
        }
        return step.kind || t('steps');
    }

    function createButton(text, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className || 'mp-button';
        button.textContent = text;
        return button;
    }

    function createField(labelText, control) {
        const label = document.createElement('label');
        label.className = 'mp-field';
        const span = document.createElement('span');
        span.textContent = labelText;
        label.append(span, control);
        return label;
    }

    function makeSelect(name, options, value) {
        const select = document.createElement('select');
        select.name = name;
        options.forEach((option) => {
            const item = document.createElement('option');
            item.value = option.value;
            item.textContent = option.label;
            select.appendChild(item);
        });
        select.value = value;
        return select;
    }

    function makeNumberInput(name, value) {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '1';
        input.name = name;
        input.value = formatInputValue(value);
        input.inputMode = 'numeric';
        return input;
    }

    function formatInputValue(value) {
        return value == null ? '' : String(value);
    }

    function getTypeLabel(type) {
        if (type === 'addition-subtraction') return `${t('addition')} / ${t('subtraction')}`;
        return t(TYPE_LABEL_KEYS[type] || type);
    }

    function renderEquationList(problem) {
        const list = document.createElement('div');
        list.className = 'mp-equations';
        problem.inputs.coefficientMatrix.forEach((row, index) => {
            const equation = document.createElement('div');
            equation.className = 'mp-equation';
            equation.textContent = formatEquationText(row, problem.inputs.constants[index]);
            list.appendChild(equation);
        });
        return list;
    }

    function renderProblemBody(problem) {
        const body = document.createElement('div');
        body.className = 'mp-problem-body';

        if (problem.type === 'addition-subtraction') {
            const operator = problem.subtype === 'add' ? '+' : '-';
            body.append(
                renderMatrix(problem.inputs.matrixA, { label: t('matrixA') }),
                tag(operator),
                renderMatrix(problem.inputs.matrixB, { label: t('matrixB') })
            );
        } else if (problem.type === 'multiplication') {
            body.append(
                renderMatrix(problem.inputs.matrixA, { label: t('matrixA') }),
                tag('x'),
                renderMatrix(problem.inputs.matrixB, { label: t('matrixB') })
            );
        } else if (problem.type === 'rref') {
            const prompt = document.createElement('div');
            prompt.className = 'mp-inline-prompt';
            prompt.textContent = t('findRref');
            body.append(prompt, renderMatrix(problem.inputs.matrix, { label: t('inputMatrix') }));
        } else if (problem.type === 'linear-system') {
            body.appendChild(renderEquationList(problem));
        }

        return body;
    }

    function renderAnswer(problem) {
        const answer = document.createElement('div');
        answer.className = 'mp-answer-content';

        if (problem.exactAnswer && problem.exactAnswer.matrix) {
            answer.appendChild(renderMatrix(problem.exactAnswer.matrix, {
                label: problem.type === 'rref' ? t('rref') : t('answerMatrix')
            }));
            return answer;
        }

        if (problem.type === 'linear-system') {
            answer.appendChild(renderMatrix(problem.exactAnswer.rrefMatrix, {
                label: t('rref'),
                augmented: true
            }));
            const summary = document.createElement('div');
            summary.className = 'mp-solution-summary';
            if (problem.exactAnswer.solutionType === 'unique') {
                summary.textContent = problem.exactAnswer.solution
                    .map((value, index) => `${variableName(index)} = ${formatScalarText(value)}`)
                    .join(', ');
            } else if (problem.exactAnswer.solutionType === 'none') {
                summary.textContent = t('noSolutionSummary');
            } else {
                summary.textContent = renderInfiniteSolutionText(problem.exactAnswer);
            }
            answer.appendChild(summary);
        }

        return answer;
    }

    function renderInfiniteSolutionText(answer) {
        const freeMap = new Map();
        answer.freeVariables.forEach((variable, index) => {
            freeMap.set(variable, parameterName(index));
        });
        return answer.expressions.map((expression) => {
            const name = variableName(expression.variable);
            if (expression.isFree) return `${name} = ${freeMap.get(expression.variable)}`;
            const terms = [];
            if (!scalarEquals(expression.constant, 0)) {
                terms.push(formatScalarText(expression.constant));
            }
            expression.terms.forEach((term) => {
                const param = freeMap.get(term.freeVariable);
                terms.push(scalarTermText(term.coefficient, param));
            });
            return `${name} = ${terms.length ? terms.join(' + ').replace(/\+ -/g, '- ') : '0'}`;
        }).join('; ');
    }

    function renderStep(step, problem) {
        const item = document.createElement('li');
        item.className = 'mp-step-item';

        if (step.kind === 'element-operation') {
            const symbol = step.operator === 'add' ? '+' : '-';
            item.textContent = `c${step.row + 1},${step.column + 1}: ${step.leftValue} ${symbol} ${step.rightValue} = ${step.result}`;
            return item;
        }

        if (step.kind === 'dot-product') {
            const expression = step.terms.map((term) => `${term.leftValue}*${term.rightValue}`).join(' + ');
            item.textContent = `c${step.row + 1},${step.column + 1}: ${expression} = ${step.result}`;
            return item;
        }

        if (step.kind === 'form-augmented-matrix') {
            const text = document.createElement('div');
            text.textContent = t('formAugmentedMatrix');
            item.append(text, renderMatrix(step.matrix || problem.inputs.augmentedMatrix, {
                label: t('augmentedMatrix'),
                augmented: true
            }));
            return item;
        }

        if (step.kind === 'swap-rows' || step.kind === 'scale-row' || step.kind === 'add-row-multiple') {
            const text = document.createElement('div');
            text.textContent = formatRrefOperationText(step);
            item.appendChild(text);
            if (step.matrix) {
                item.appendChild(renderMatrix(step.matrix, {
                    label: t('rref'),
                    augmented: problem.type === 'linear-system'
                }));
            }
            return item;
        }

        item.textContent = step.kind || t('steps');
        return item;
    }

    function renderSteps(problem) {
        const list = document.createElement('ol');
        list.className = 'mp-steps-list';
        if (!problem.steps || !problem.steps.length) {
            const item = document.createElement('li');
            item.textContent = t('noSteps');
            list.appendChild(item);
            return list;
        }

        problem.steps.forEach((step) => {
            list.appendChild(renderStep(step, problem));
        });

        if (problem.type === 'linear-system') {
            const item = document.createElement('li');
            item.textContent = `${t('solutionSummary')}: ${renderInfiniteAwareSummary(problem.exactAnswer)}`;
            list.appendChild(item);
        }

        return list;
    }

    function renderInfiniteAwareSummary(answer) {
        if (answer.solutionType === 'unique') {
            return answer.solution.map((value, index) => `${variableName(index)} = ${formatScalarText(value)}`).join(', ');
        }
        if (answer.solutionType === 'none') return t('noSolutionSummary');
        return renderInfiniteSolutionText(answer);
    }

    function renderWorksheetProblem(problem, number) {
        const item = document.createElement('section');
        item.className = 'mp-print-problem';
        const title = document.createElement('h3');
        title.textContent = `${number}.`;
        item.append(title, renderProblemBody(problem), renderWorksheetAnswerSpace(problem));
        return item;
    }

    function renderWorksheetAnswerSpace(problem) {
        const space = document.createElement('div');
        space.className = 'mp-work-space';
        const blankMatrix = getWorksheetBlankMatrixDimensions(problem);

        if (blankMatrix) {
            const label = document.createElement('div');
            label.className = 'mp-work-label';
            label.textContent = problem.type === 'rref' ? 'RREF:' : 'Answer:';
            space.append(label, renderEmptyMatrix(blankMatrix.rows, blankMatrix.cols, {
                label: '',
                augmented: false
            }), createWorkLines(problem.type === 'rref' ? 2 : 1));
        } else if (problem.type === 'linear-system') {
            space.textContent = 'Solution: __________________';
            space.appendChild(createWorkLines(2));
        } else {
            space.textContent = 'Answer: __________________';
        }
        return space;
    }

    function createWorkLines(count) {
        const lines = document.createElement('div');
        lines.className = 'mp-work-lines';
        for (let index = 0; index < count; index++) {
            const line = document.createElement('span');
            lines.appendChild(line);
        }
        return lines;
    }

    function renderAnswerKeyProblem(problem, number) {
        const item = document.createElement('section');
        item.className = 'mp-answer-key-item';
        const title = document.createElement('h3');
        title.textContent = `${number}.`;
        item.appendChild(title);

        if (problem.type === 'linear-system') {
            const summary = document.createElement('div');
            summary.className = 'mp-answer-summary';
            summary.textContent = solutionLabel(problem.exactAnswer.solutionType || problem.solutionType);
            item.appendChild(summary);
            if (problem.exactAnswer.solutionType === 'none') {
                item.appendChild(renderMatrix(problem.exactAnswer.rrefMatrix, { label: t('rref'), augmented: true }));
            } else {
                const detail = document.createElement('div');
                detail.className = 'mp-answer-summary';
                detail.textContent = renderInfiniteAwareSummary(problem.exactAnswer);
                item.appendChild(detail);
            }
            return item;
        }

        item.appendChild(renderAnswer(problem));
        return item;
    }

    function renderPaperPage(problemSet, page, viewMode) {
        const paper = document.createElement('article');
        paper.className = `mp-paper mp-paper-${page.layout}`;
        paper.setAttribute('aria-label', `${viewMode === 'answer-key' ? t('answerKey') : t('worksheet')} ${t('page')} ${page.pageNumber} ${t('of')} ${page.totalPages}`);

        const header = document.createElement('header');
        header.className = 'mp-paper-header';
        const title = document.createElement('h2');
        title.textContent = viewMode === 'answer-key' ? t('answerKeyTitle') : t('worksheetTitle');
        const subtitle = document.createElement('p');
        subtitle.textContent = getWorksheetTypeLabel(problemSet);
        header.append(title, subtitle);

        if (page.pageIndex === 0 && viewMode === 'worksheet') {
            const meta = document.createElement('div');
            meta.className = 'mp-student-meta';
            meta.append(createLabeledLine(t('name')), createLabeledLine(t('date')));
            const instructions = document.createElement('p');
            instructions.className = 'mp-paper-instructions';
            instructions.textContent = t('solveInstructions');
            header.append(meta, instructions);
        }

        if (viewMode === 'answer-key' && page.pageIndex === 0) {
            const label = document.createElement('p');
            label.className = 'mp-paper-instructions';
            label.textContent = t('exactAnswers');
            const seed = document.createElement('p');
            seed.className = 'mp-paper-instructions';
            seed.textContent = `${t('set')} ${problemSet.seed}`;
            header.append(label, seed);
        }

        const pageText = document.createElement('p');
        pageText.className = 'mp-paper-page-number';
        pageText.textContent = `${t('page')} ${page.pageNumber} ${t('of')} ${page.totalPages}`;
        header.appendChild(pageText);

        const grid = document.createElement('div');
        grid.className = `mp-paper-problems mp-paper-problems-${page.layout}`;
        page.problems.forEach((item) => {
            grid.appendChild(viewMode === 'answer-key'
                ? renderAnswerKeyProblem(item.problem, item.problemNumber)
                : renderWorksheetProblem(item.problem, item.problemNumber));
        });

        const footer = document.createElement('footer');
        footer.className = 'mp-paper-footer';
        footer.textContent = 'matrixcalcu.com';

        paper.append(header, grid, footer);
        return paper;
    }

    function createLabeledLine(labelText) {
        const item = document.createElement('div');
        item.className = 'mp-labeled-line';
        const label = document.createElement('span');
        label.textContent = `${labelText}:`;
        const line = document.createElement('span');
        line.className = 'mp-write-line';
        item.append(label, line);
        return item;
    }

    function createPracticeUi(rootElement) {
        const state = createInitialState();

        const els = {};

        function build() {
            rootElement.classList.add('mp-app');
            rootElement.innerHTML = '';

            const typeGroup = document.createElement('div');
            typeGroup.className = 'mp-type-tabs';
            [
                ['addition-subtraction', `${t('addition')} / ${t('subtraction')}`],
                ['multiplication', t('multiplication')],
                ['rref', t('rref')],
                ['linear-system', t('systemsOfEquations')]
            ].forEach(([type, label]) => {
                const button = createButton(label, 'mp-type-tab');
                button.dataset.type = type;
                button.setAttribute('aria-pressed', type === state.type ? 'true' : 'false');
                button.addEventListener('click', () => {
                    if (!applyProblemTypeChange(state, type)) return;
                    rebuildSettings();
                    updateTypeTabs();
                    resetToEmptyAfterTypeChange();
                });
                typeGroup.appendChild(button);
            });

            els.settings = document.createElement('div');
            els.settings.className = 'mp-settings-grid';

            els.error = document.createElement('div');
            els.error.className = 'mp-error';
            els.error.setAttribute('role', 'alert');
            els.error.hidden = true;

            els.generate = createButton(t('generateNewSet'), 'btn main core-main mp-generate-button');
            els.generate.addEventListener('click', () => {
                void generateSet();
            });

            els.info = document.createElement('div');
            els.info.className = 'mp-set-info';

            els.viewTabs = document.createElement('div');
            els.viewTabs.className = 'mp-view-tabs';
            els.viewTabs.hidden = true;
            [
                ['worksheet', t('worksheet')],
                ['answer-key', t('answerKey')],
                ['detailed-solutions', t('detailedSolutions')]
            ].forEach(([viewMode, label]) => {
                const button = createButton(label, 'mp-view-tab');
                button.dataset.viewMode = viewMode;
                button.setAttribute('aria-pressed', viewMode === state.currentView ? 'true' : 'false');
                button.addEventListener('click', () => {
                    if (state.currentView === viewMode || !applyViewModeChange(state, viewMode)) return;
                    updateViewTabs();
                    renderCurrentView();
                });
                els.viewTabs.appendChild(button);
            });

            els.pdfActions = document.createElement('div');
            els.pdfActions.className = 'mp-pdf-actions';
            els.pdfActions.hidden = true;
            els.downloadPdf = createButton(t('downloadWorksheetPdf'), 'mp-button mp-pdf-button');
            els.downloadPdf.addEventListener('click', () => {
                void downloadWorksheetPdf();
            });
            els.pdfActions.appendChild(els.downloadPdf);

            els.list = document.createElement('div');
            els.list.className = 'mp-problem-list';

            const controls = document.createElement('div');
            controls.className = 'mp-controls';
            const generateRow = document.createElement('div');
            generateRow.className = 'ops-v2 ops-flat mp-generate-row';
            const generateCore = document.createElement('div');
            generateCore.className = 'ops-core';
            generateCore.appendChild(els.generate);
            generateRow.appendChild(generateCore);
            controls.append(typeGroup, els.settings, generateRow, els.error);

            rootElement.append(controls, els.info, els.viewTabs, els.pdfActions, els.list);
            rebuildSettings();
            renderEmptyState();
        }

        function updateTypeTabs() {
            rootElement.querySelectorAll('.mp-type-tab').forEach((button) => {
                button.setAttribute('aria-pressed', button.dataset.type === state.type ? 'true' : 'false');
            });
        }

        function updateViewTabs() {
            els.viewTabs.querySelectorAll('.mp-view-tab').forEach((button) => {
                button.setAttribute('aria-pressed', button.dataset.viewMode === state.currentView ? 'true' : 'false');
            });
        }

        function rebuildSettings() {
            els.settings.innerHTML = '';

            const difficulty = makeSelect('difficulty', [
                { value: 'easy', label: t('easy') },
                { value: 'medium', label: t('medium') },
                { value: 'hard', label: t('hard') }
            ], state.difficulty);
            difficulty.addEventListener('change', () => {
                state.difficulty = difficulty.value;
                applyDifficultyDefaults(state);
                rebuildSettings();
                markDirty();
            });
            els.settings.appendChild(createField(t('difficulty'), difficulty));

            const count = makeSelect('count', [
                { value: '4', label: '4' },
                { value: '6', label: '6' },
                { value: '8', label: '8' },
                { value: '10', label: '10' }
            ], String(state.count));
            count.addEventListener('change', () => {
                state.count = Number(count.value);
                markDirty();
            });
            els.settings.appendChild(createField(t('numberOfProblems'), count));

            if (state.type === 'addition-subtraction') {
                const operation = makeSelect('operation', [
                    { value: 'mixed', label: t('mixed') },
                    { value: 'add', label: t('addition') },
                    { value: 'subtract', label: t('subtraction') }
                ], state.operation);
                operation.addEventListener('change', () => {
                    state.operation = operation.value;
                    markDirty();
                });
                els.settings.appendChild(createField(t('operation'), operation));
                addSelectSetting('rows', t('rows'), [{ value: '2', label: '2' }, { value: '3', label: '3' }]);
                addSelectSetting('cols', t('columns'), [{ value: '2', label: '2' }, { value: '3', label: '3' }]);
            }

            if (state.type === 'multiplication') {
                addSelectSetting('rowsA', t('rowsA'), [{ value: '2', label: '2' }, { value: '3', label: '3' }]);
                addSelectSetting('colsA', t('colsA'), [{ value: '2', label: '2' }, { value: '3', label: '3' }]);
                addSelectSetting('colsB', t('colsB'), [{ value: '2', label: '2' }, { value: '3', label: '3' }]);
                const help = document.createElement('p');
                help.className = 'mp-field-help';
                help.textContent = t('multiplicationSizeHelp');
                els.settings.appendChild(help);
            }

            if (state.type === 'rref') {
                const size = makeSelect('rrefSize', [
                    { value: '2x3', label: '2 x 3' },
                    { value: '3x3', label: '3 x 3' },
                    { value: '3x4', label: '3 x 4' }
                ], state.rrefSize);
                size.addEventListener('change', () => {
                    state.rrefSize = size.value;
                    markDirty();
                });
                els.settings.appendChild(createField(t('matrixSize'), size));
            }

            if (state.type === 'linear-system') {
                addSelectSetting('variables', t('variables'), [{ value: '2', label: '2' }, { value: '3', label: '3' }]);
                const solutionType = makeSelect('solutionType', [
                    { value: 'mixed', label: t('mixed') },
                    { value: 'unique', label: t('uniqueSolution') },
                    { value: 'none', label: t('noSolution') },
                    { value: 'infinite', label: t('infinitelyManySolutions') }
                ], state.solutionType);
                solutionType.addEventListener('change', () => {
                    state.solutionType = solutionType.value;
                    state.solutionTypeTouched = true;
                    markDirty();
                });
                els.settings.appendChild(createField(t('solutionType'), solutionType));
            }

            addNumberSetting('minValue', t('minValue'));
            addNumberSetting('maxValue', t('maxValue'));
        }

        function addSelectSetting(key, labelText, options) {
            const select = makeSelect(key, options, String(state[key]));
            select.addEventListener('change', () => {
                state[key] = Number.isNaN(Number(select.value)) ? select.value : Number(select.value);
                markDirty();
            });
            els.settings.appendChild(createField(labelText, select));
        }

        function addNumberSetting(key, labelText) {
            const input = makeNumberInput(key, state[key]);
            input.addEventListener('input', () => {
                state[key] = input.value === '' ? input.value : Number(input.value);
                markDirty();
            });
            els.settings.appendChild(createField(labelText, input));
        }

        function markDirty() {
            markSettingsChangedState(state);
            els.error.hidden = true;
            if (state.hasGenerated) {
                els.info.textContent = `${els.info.dataset.lastSetInfo || ''} | ${t('settingsChanged')}`;
            }
        }

        function resetToEmptyAfterTypeChange() {
            els.error.hidden = true;
            els.generate.disabled = false;
            els.generate.textContent = t('generateNewSet');
            els.info.dataset.lastSetInfo = '';
            els.viewTabs.hidden = true;
            els.pdfActions.hidden = true;
            renderEmptyState();
        }

        function clearRenderedSet() {
            els.info.textContent = '';
            els.list.innerHTML = '';
            els.error.hidden = true;
            els.viewTabs.hidden = true;
            els.pdfActions.hidden = true;
        }

        function renderEmptyState() {
            els.info.textContent = '';
            els.viewTabs.hidden = true;
            els.pdfActions.hidden = true;
            els.list.innerHTML = '';
            const empty = document.createElement('div');
            empty.className = 'mp-empty-state';
            const title = document.createElement('h2');
            title.textContent = t('emptyTitle');
            const body = document.createElement('p');
            body.textContent = t('emptyBody');
            empty.append(title, body);
            els.list.appendChild(empty);
        }

        function generatorForType() {
            const practice = root.MatrixPractice || {};
            if (state.type === 'addition-subtraction') return practice.additionSubtraction.generateAdditionSubtractionSet;
            if (state.type === 'multiplication') return practice.multiplication.generateMultiplicationSet;
            if (state.type === 'rref') return practice.rref.generateRrefSet;
            return practice.linearSystems.generateLinearSystemSet;
        }

        async function generateSet() {
            const token = ++state.generationToken;
            const validation = validateSettings(state);
            if (!validation.ok) {
                els.error.textContent = `${t('error')}: ${validation.message}`;
                els.error.hidden = false;
                return;
            }

            const seed = root.MatrixPractice.random.createRuntimeSeed();
            const generator = generatorForType();
            els.generate.disabled = true;
            setPdfButtonDisabled(true);
            els.generate.textContent = t('generating');
            els.error.hidden = true;

            try {
                const set = await Promise.resolve(generator(buildGeneratorOptions(state, seed)));
                if (token !== state.generationToken) return;
                state.currentSet = set;
                state.currentView = 'worksheet';
                state.hasGenerated = true;
                state.dirty = false;
                renderSet(set);
            } catch (error) {
                if (token !== state.generationToken) return;
                console.error(error);
                els.error.textContent = `${t('error')}: ${t('generateError')}`;
                els.error.hidden = false;
            } finally {
                if (token === state.generationToken) {
                    els.generate.disabled = false;
                    setPdfButtonDisabled(false);
                    els.generate.textContent = t('generateNewSet');
                }
            }
        }

        function renderSet(set) {
            const setInfo = `${t('practiceSet')}: ${getTypeLabel(set.type)} | ${t('difficulty')}: ${t(set.settings.difficulty)} | ${t('seed')}: ${set.seed}`;
            els.info.dataset.lastSetInfo = setInfo;
            els.info.textContent = setInfo;
            els.viewTabs.hidden = false;
            updatePdfActions();
            updateViewTabs();
            renderCurrentView();
        }

        function updatePdfActions() {
            const canDownloadPdf = state.currentSet && state.currentSet.type === 'addition-subtraction';
            els.pdfActions.hidden = !canDownloadPdf;
            setPdfButtonDisabled(false);
        }

        function setPdfButtonDisabled(disabled) {
            if (!els.downloadPdf) return;
            els.downloadPdf.disabled = Boolean(disabled);
        }

        async function downloadWorksheetPdf() {
            if (!state.currentSet || state.currentSet.type !== 'addition-subtraction') return;
            const pdf = root.MatrixPractice && root.MatrixPractice.pdf;
            if (!pdf || typeof pdf.downloadAdditionSubtractionWorksheetPdf !== 'function') {
                els.error.textContent = `${t('error')}: ${t('pdfError')}`;
                els.error.hidden = false;
                console.error(new Error('MatrixPractice.pdf is not loaded.'));
                return;
            }

            setPdfButtonDisabled(true);
            els.downloadPdf.textContent = t('creatingPdf');
            els.error.hidden = true;
            try {
                await pdf.downloadAdditionSubtractionWorksheetPdf(state.currentSet);
            } catch (error) {
                console.error(error);
                els.error.textContent = `${t('error')}: ${t('pdfError')}`;
                els.error.hidden = false;
            } finally {
                els.downloadPdf.textContent = t('downloadWorksheetPdf');
                setPdfButtonDisabled(false);
            }
        }

        function renderCurrentView() {
            els.list.innerHTML = '';
            els.list.className = state.currentView === 'detailed-solutions'
                ? 'mp-problem-list mp-detailed-list'
                : 'mp-problem-list mp-paper-preview';

            if (!state.currentSet) {
                renderEmptyState();
                return;
            }

            if (state.currentView === 'detailed-solutions') {
                const heading = document.createElement('div');
                heading.className = 'mp-solutions-heading';
                heading.textContent = t('stepByStepSolutions');
                els.list.appendChild(heading);
                state.currentSet.problems.forEach((problem, index) => {
                    els.list.appendChild(renderProblemCard(problem, index));
                });
                return;
            }

            const pages = buildPageMetadata(state.currentSet, state.currentView);
            pages.forEach((page) => {
                els.list.appendChild(renderPaperPage(state.currentSet, page, state.currentView));
            });
        }

        function renderProblemCard(problem, index) {
            const card = document.createElement('article');
            card.className = 'mp-problem-card';

            const header = document.createElement('div');
            header.className = 'mp-card-header';
            const title = document.createElement('h2');
            title.textContent = `${t('problem')} ${index + 1}`;
            const meta = document.createElement('div');
            meta.className = 'mp-card-meta';
            meta.appendChild(tag(problem.subtype === 'add' ? t('addition') :
                problem.subtype === 'subtract' ? t('subtraction') :
                problem.solutionType ? solutionLabel(problem.solutionType) : getTypeLabel(problem.type)));
            header.append(title, meta);

            const answerId = `${problem.id}-answer`;
            const stepsId = `${problem.id}-steps`;
            const answerPanel = createTogglePanel(answerId, t('answer'), renderAnswer(problem));
            const stepsPanel = createTogglePanel(stepsId, t('steps'), renderSteps(problem));

            const actions = document.createElement('div');
            actions.className = 'mp-card-actions';
            actions.append(
                createToggleButton(t('showAnswer'), t('hideAnswer'), answerPanel, answerId),
                createToggleButton(t('showSteps'), t('hideSteps'), stepsPanel, stepsId)
            );

            card.append(header, renderProblemBody(problem), actions, answerPanel, stepsPanel);
            return card;
        }

        function solutionLabel(solutionType) {
            if (solutionType === 'unique') return t('uniqueSolution');
            if (solutionType === 'none') return t('noSolution');
            return t('infinitelyManySolutions');
        }

        function createTogglePanel(id, titleText, content) {
            const panel = document.createElement('section');
            panel.id = id;
            panel.className = 'mp-toggle-panel';
            panel.hidden = true;
            const title = document.createElement('h3');
            title.textContent = titleText;
            panel.append(title, content);
            return panel;
        }

        function createToggleButton(showText, hideText, panel, controls) {
            const button = createButton(showText, 'mp-button');
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-controls', controls);
            button.addEventListener('click', () => {
                const expanded = button.getAttribute('aria-expanded') === 'true';
                button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                button.textContent = expanded ? showText : hideText;
                panel.hidden = expanded;
            });
            return button;
        }

        build();

        return {
            generateSet,
            state,
            buildGeneratorOptions: (seed) => buildGeneratorOptions(state, seed)
        };
    }

    function init() {
        const navToggle = document.querySelector('.mobile-nav-toggle');
        const navButtons = document.querySelector('.nav-buttons');
        if (navToggle && navButtons) {
            navToggle.addEventListener('click', () => {
                const active = navButtons.classList.toggle('active');
                navToggle.classList.toggle('active', active);
            });
        }

        const rootElement = document.getElementById('matrix-practice-root');
        if (!rootElement) return;
        createPracticeUi(rootElement);
    }

    const api = {
        COUNT_OPTIONS,
        DIFFICULTY_DEFAULTS,
        TYPE_DIMENSION_DEFAULTS,
        VIEW_MODES,
        createInitialState,
        applyDifficultyDefaults,
        buildGeneratorOptions,
        validateSettings,
        applyProblemTypeChange,
        markSettingsChangedState,
        applyViewModeChange,
        getWorksheetLayout,
        getProblemsPerPage,
        chunkProblems,
        buildPageMetadata,
        buildWorksheetProblemItems,
        getWorksheetBlankMatrixDimensions,
        formatInputValue,
        formatScalarText,
        formatEquationText,
        formatRrefOperationText,
        createPracticeUi
    };

    root.MatrixPractice = root.MatrixPractice || {};
    root.MatrixPractice.practiceUi = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
