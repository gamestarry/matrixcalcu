(function () {
    'use strict';

    const STATE_KEY = 'matrixcalcu_state_v1';

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

    function t(key, params) {
        const i18n = window.MatrixDimensionsI18n;
        if (i18n && typeof i18n.t === 'function') {
            return i18n.t(key, params);
        }
        return '';
    }

    function getUrls() {
        const i18n = window.MatrixDimensionsI18n;
        if (i18n && typeof i18n.getUrls === 'function') {
            return i18n.getUrls();
        }
        return {
            calculatorUrl: ''
        };
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

        setText('dimension-status-ab', possible ? t('pageAbPossible') : t('pageAbNotPossible'));
        setText('dimension-matrix-a-ab', t('pageMatrixSize', {
            matrix: t('matrixA'),
            size: formatSize(result.rowsA, result.colsA)
        }));
        setText('dimension-matrix-b-ab', t('pageMatrixSize', {
            matrix: t('matrixB'),
            size: formatSize(result.rowsB, result.colsB)
        }));
        setText('dimension-inner-ab', formatComparison(result.innerAB.left, result.innerAB.right, result.innerAB.matches));

        const resultText = possible
            ? formatSize(result.resultAB.rows, result.resultAB.cols)
            : t('notDefined');
        setText('dimension-output-ab', resultText);

        setText(
            'dimension-explanation-ab',
            possible
                ? t('pageAbPossibleExplanation')
                : t('pageAbNotPossibleExplanation', {
                    colsA: result.colsA,
                    rowsB: result.rowsB
                })
        );

        const suggestion = get('dimension-suggestion-ab');
        if (suggestion) suggestion.hidden = possible;
        setText('dimension-suggestion-b-rows', t('pageSuggestionBRows', {
            rows: result.suggestionsAB.requiredRowsB
        }));
        setText('dimension-suggestion-a-cols', t('pageSuggestionAColumns', {
            columns: result.suggestionsAB.requiredColsA
        }));
    }

    function renderBA(result) {
        const possible = result.canMultiplyBA;
        setStatus(get('dimension-result-ba'), possible);

        setText('dimension-status-ba', possible ? t('pageBaPossible') : t('pageBaNotPossible'));
        setText('dimension-inner-ba', formatComparison(result.innerBA.left, result.innerBA.right, result.innerBA.matches));

        const resultText = possible
            ? formatSize(result.resultBA.rows, result.resultBA.cols)
            : t('notDefined');
        setText('dimension-output-ba', resultText);

        setText(
            'dimension-explanation-ba',
            possible
                ? t('pageBaPossibleExplanation')
                : t('pageBaNotPossibleExplanation', {
                    colsB: result.colsB,
                    rowsA: result.rowsA
                })
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

                window.location.href = getUrls().calculatorUrl;
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
