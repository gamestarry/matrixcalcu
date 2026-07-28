(function () {
    'use strict';

    const STATE_KEY = 'matrixcalcu_state_v1';
    const CALCULATOR_URL = '/en/matrix-multiplication-calculator.html';

    const state = {
        rowsA: 2,
        colsA: 3,
        rowsB: 3,
        colsB: 2
    };

    function get(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const el = get(id);
        if (el) el.textContent = value;
    }

    function setStatus(card, isPossible) {
        if (!card) return;
        card.classList.toggle('dimension-result--possible', isPossible);
        card.classList.toggle('dimension-result--blocked', !isPossible);
    }

    function formatSize(rows, cols) {
        return `${rows} \u00d7 ${cols}`;
    }

    function formatComparison(left, right, matches) {
        return `${left} ${matches ? '=' : '\u2260'} ${right}`;
    }

    function makeEmptyMatrix(rows, cols) {
        return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
    }

    function renderAB(result) {
        const possible = result.canMultiplyAB;
        setStatus(get('dimension-result-ab'), possible);

        setText('dimension-status-ab', possible ? 'A x B is possible' : 'A x B is not possible');
        setText('dimension-matrix-a-ab', `Matrix A: ${formatSize(result.rowsA, result.colsA)}`);
        setText('dimension-matrix-b-ab', `Matrix B: ${formatSize(result.rowsB, result.colsB)}`);
        setText('dimension-inner-ab', formatComparison(result.innerAB.left, result.innerAB.right, result.innerAB.matches));

        const resultText = possible
            ? formatSize(result.resultAB.rows, result.resultAB.cols)
            : 'Not defined';
        setText('dimension-output-ab', resultText);

        setText(
            'dimension-explanation-ab',
            possible
                ? 'The inner dimensions match, so A x B is defined. The result keeps the rows of A and the columns of B.'
                : 'For A x B to be defined, the number of columns in Matrix A must equal the number of rows in Matrix B.'
        );

        const suggestion = get('dimension-suggestion-ab');
        if (suggestion) suggestion.hidden = possible;
        setText('dimension-suggestion-b-rows', `Change Matrix B to have ${result.suggestionsAB.requiredRowsB} rows.`);
        setText('dimension-suggestion-a-cols', `Change Matrix A to have ${result.suggestionsAB.requiredColsA} columns.`);
    }

    function renderBA(result) {
        const possible = result.canMultiplyBA;
        setStatus(get('dimension-result-ba'), possible);

        setText('dimension-status-ba', possible ? 'B x A is also possible' : 'B x A is not possible');
        setText('dimension-inner-ba', formatComparison(result.innerBA.left, result.innerBA.right, result.innerBA.matches));

        const resultText = possible
            ? formatSize(result.resultBA.rows, result.resultBA.cols)
            : 'Not defined';
        setText('dimension-output-ba', resultText);

        setText(
            'dimension-explanation-ba',
            possible
                ? 'The reverse order is defined for these dimensions, but it may produce a different result size.'
                : 'The reverse order is not defined because the columns of Matrix B do not equal the rows of Matrix A.'
        );
    }

    function render() {
        const checker = window.MatrixDimensions;
        if (!checker || typeof checker.check !== 'function') {
            console.error('MatrixDimensions module is not available.');
            return;
        }

        const result = checker.check(state.rowsA, state.colsA, state.rowsB, state.colsB);
        state.rowsA = result.rowsA;
        state.colsA = result.colsA;
        state.rowsB = result.rowsB;
        state.colsB = result.colsB;

        setText('dimension-rows-a', result.rowsA);
        setText('dimension-cols-a', result.colsA);
        setText('dimension-rows-b', result.rowsB);
        setText('dimension-cols-b', result.colsB);
        setText('dimension-a-size', formatSize(result.rowsA, result.colsA));
        setText('dimension-b-size', formatSize(result.rowsB, result.colsB));

        renderAB(result);
        renderBA(result);
        updateButtons(result);
    }

    function updateButtons(result) {
        const checker = window.MatrixDimensions;
        if (!checker) return;

        const values = {
            rowsA: result.rowsA,
            colsA: result.colsA,
            rowsB: result.rowsB,
            colsB: result.colsB
        };

        Object.keys(values).forEach((key) => {
            const dec = get(`dimension-decrease-${key}`);
            const inc = get(`dimension-increase-${key}`);
            if (dec) dec.disabled = values[key] <= checker.MIN_SIZE;
            if (inc) inc.disabled = values[key] >= checker.MAX_SIZE;
        });
    }

    function adjustDimension(key, delta) {
        const checker = window.MatrixDimensions;
        if (!checker || !Object.prototype.hasOwnProperty.call(state, key)) return;
        state[key] = checker.normalizeDimension(state[key] + delta);
        render();
    }

    function bindControls() {
        document.querySelectorAll('[data-dimension-control]').forEach((button) => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-dimension-control');
                const delta = Number(button.getAttribute('data-dimension-delta'));
                adjustDimension(key, Number.isFinite(delta) ? delta : 0);
            });
        });

        const cta = get('open-multiplication-calculator');
        if (cta) {
            cta.addEventListener('click', () => {
                const checker = window.MatrixDimensions;
                const result = checker ? checker.check(state.rowsA, state.colsA, state.rowsB, state.colsB) : state;
                const nextState = {
                    rowsA: result.rowsA,
                    colsA: result.colsA,
                    rowsB: result.rowsB,
                    colsB: result.colsB,
                    matrixA: makeEmptyMatrix(result.rowsA, result.colsA),
                    matrixB: makeEmptyMatrix(result.rowsB, result.colsB),
                    from: 'matrix-multiplication-dimensions.html',
                    autorun: false,
                    op: '',
                    target: 'A'
                };

                try {
                    localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
                } catch (error) {
                    console.warn('Unable to save matrix dimensions before navigation.');
                }

                window.location.href = CALCULATOR_URL;
            });
        }
    }

    function init() {
        if (!window.MatrixDimensions) {
            console.error('MatrixDimensions module is not available.');
            return;
        }
        bindControls();
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
