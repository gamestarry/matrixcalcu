(function () {
    'use strict';

    const DIMENSION_IDS = ['rows-a', 'cols-a', 'rows-b', 'cols-b'];

    const elements = {};

    function get(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const el = elements[id] || get(id);
        if (el) el.textContent = value;
    }

    function formatSize(rows, cols) {
        return `${rows} \u00d7 ${cols}`;
    }

    function formatComparison(left, right, matches) {
        return `${left} ${matches ? '=' : '\u2260'} ${right}`;
    }

    function readRawDimensions() {
        return {
            rowsA: get('rows-a')?.textContent,
            colsA: get('cols-a')?.textContent,
            rowsB: get('rows-b')?.textContent,
            colsB: get('cols-b')?.textContent
        };
    }

    function checkCurrentDimensions() {
        if (!window.MatrixDimensions || typeof window.MatrixDimensions.check !== 'function') return null;
        const dims = readRawDimensions();
        return window.MatrixDimensions.check(dims.rowsA, dims.colsA, dims.rowsB, dims.colsB);
    }

    function setCardState(result) {
        const summary = elements.summary;
        if (!summary) return;
        summary.classList.toggle('dimension-inline--valid', result.canMultiplyAB);
        summary.classList.toggle('dimension-inline--invalid', !result.canMultiplyAB);
    }

    function renderSummary(result) {
        setCardState(result);
        setText('dimension-inline-status', result.canMultiplyAB ? 'A \u00d7 B is valid' : 'A \u00d7 B is not defined');
        setText('dimension-inline-inner', `Inner dimensions: ${formatComparison(result.innerAB.left, result.innerAB.right, result.innerAB.matches)}`);

        const resultText = result.resultAB
            ? `Result size: ${formatSize(result.resultAB.rows, result.resultAB.cols)}`
            : `Use ${result.suggestionsAB.requiredRowsB} rows for Matrix B or ${result.suggestionsAB.requiredColsA} columns for Matrix A.`;
        setText('dimension-inline-result', resultText);

        const reverseText = result.canMultiplyBA
            ? `B \u00d7 A: valid, result ${formatSize(result.resultBA.rows, result.resultBA.cols)}`
            : 'B \u00d7 A: not defined';
        setText('dimension-inline-reverse', reverseText);
    }

    function renderDetail(result) {
        setText('dimension-detail-a-size', `Matrix A: ${formatSize(result.rowsA, result.colsA)}`);
        setText('dimension-detail-b-size', `Matrix B: ${formatSize(result.rowsB, result.colsB)}`);
        setText('dimension-detail-a-cols', String(result.colsA));
        setText('dimension-detail-b-rows', String(result.rowsB));
        setText('dimension-detail-ab-comparison', formatComparison(result.innerAB.left, result.innerAB.right, result.innerAB.matches));
        setText('dimension-detail-suggestion-b', `Change Matrix B to have ${result.suggestionsAB.requiredRowsB} rows`);
        setText('dimension-detail-suggestion-a', `Change Matrix A to have ${result.suggestionsAB.requiredColsA} columns`);
        setText('dimension-detail-ba-status', result.canMultiplyBA ? 'B \u00d7 A is possible.' : 'B \u00d7 A is also not possible.');
        setText('dimension-detail-ba-inner', formatComparison(result.innerBA.left, result.innerBA.right, result.innerBA.matches));
        setText('dimension-detail-ba-result', result.resultBA ? formatSize(result.resultBA.rows, result.resultBA.cols) : 'Not defined');
    }

    function hideDetail() {
        if (elements.detail) elements.detail.hidden = true;
    }

    function showDetail(result) {
        renderDetail(result);
        if (elements.detail) elements.detail.hidden = false;
    }

    function updateAll() {
        const result = checkCurrentDimensions();
        if (!result) return;
        renderSummary(result);

        if (elements.detail && !elements.detail.hidden) {
            if (result.canMultiplyAB) hideDetail();
            else renderDetail(result);
        }
    }

    function bindObservers() {
        if (typeof MutationObserver !== 'function') {
            console.warn('Matrix dimension helper: MutationObserver is not available.');
            return;
        }

        DIMENSION_IDS.forEach((id) => {
            const target = get(id);
            if (!target) return;
            const observer = new MutationObserver(updateAll);
            observer.observe(target, { childList: true, characterData: true, subtree: true });
        });
    }

    function bindCalculateAssist() {
        const button = get('calculate-multiplication-btn');
        if (!button) return;

        button.addEventListener('click', () => {
            const result = checkCurrentDimensions();
            if (!result) return;
            renderSummary(result);
            if (result.canMultiplyAB) hideDetail();
            else showDetail(result);
        });
    }

    function bindCloseButton() {
        if (elements.closeButton) elements.closeButton.addEventListener('click', hideDetail);
    }

    function cacheElements() {
        elements.summary = get('dimension-inline-summary');
        elements.detail = get('dimension-detail-explanation');
        elements.closeButton = get('dimension-detail-close');

        [
            'dimension-inline-status',
            'dimension-inline-inner',
            'dimension-inline-result',
            'dimension-inline-reverse',
            'dimension-detail-a-size',
            'dimension-detail-b-size',
            'dimension-detail-a-cols',
            'dimension-detail-b-rows',
            'dimension-detail-ab-comparison',
            'dimension-detail-suggestion-b',
            'dimension-detail-suggestion-a',
            'dimension-detail-ba-status',
            'dimension-detail-ba-inner',
            'dimension-detail-ba-result'
        ].forEach((id) => {
            elements[id] = get(id);
        });
    }

    function hasRequiredElements() {
        return DIMENSION_IDS.every((id) => get(id)) && elements.summary && elements.detail;
    }

    function init() {
        if (!window.MatrixDimensions || typeof window.MatrixDimensions.check !== 'function') {
            console.warn('Matrix dimension helper: shared MatrixDimensions module is not available.');
            return;
        }

        cacheElements();
        if (!hasRequiredElements()) {
            console.warn('Matrix dimension helper: required page elements are missing.');
            return;
        }

        bindObservers();
        bindCalculateAssist();
        bindCloseButton();
        updateAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
