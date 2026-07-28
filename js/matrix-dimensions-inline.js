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
            checkerUrl: ''
        };
    }

    function setLabeledValue(id, label, value) {
        const el = elements[id] || get(id);
        if (el) el.textContent = `${label} ${value}`;
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
        setText('dimension-inline-status', result.canMultiplyAB ? t('inlineStatusValid') : t('inlineStatusInvalid'));
        setText('dimension-inline-inner', t('inlineInner', {
            comparison: formatComparison(result.innerAB.left, result.innerAB.right, result.innerAB.matches)
        }));

        const resultText = result.resultAB
            ? t('inlineResult', {
                size: formatSize(result.resultAB.rows, result.resultAB.cols)
            })
            : t('inlineInvalidSuggestion', {
                rows: result.suggestionsAB.requiredRowsB,
                columns: result.suggestionsAB.requiredColsA
            });
        setText('dimension-inline-result', resultText);

        const reverseText = result.canMultiplyBA
            ? t('inlineReverseValid', {
                size: formatSize(result.resultBA.rows, result.resultBA.cols)
            })
            : t('inlineReverseInvalid');
        setText('dimension-inline-reverse', reverseText);
    }

    function renderDetail(result) {
        setText('dimension-detail-title', t('detailTitle'));
        setText('dimension-detail-why-title', t('detailWhyTitle'));
        setText('dimension-detail-why-text', t('detailWhyText'));
        setLabeledValue('dimension-detail-a-size', t('matrixA') + ':', formatSize(result.rowsA, result.colsA));
        setLabeledValue('dimension-detail-b-size', t('matrixB') + ':', formatSize(result.rowsB, result.colsB));
        setText('dimension-detail-a-cols-label', t('detailMatrixAColumns'));
        setText('dimension-detail-b-rows-label', t('detailMatrixBRows'));
        setText('dimension-detail-a-cols', String(result.colsA));
        setText('dimension-detail-b-rows', String(result.rowsB));
        setText('dimension-detail-ab-comparison', formatComparison(result.innerAB.left, result.innerAB.right, result.innerAB.matches));
        setText('dimension-detail-how-title', t('detailHowTitle'));
        setText('dimension-detail-suggestion-b', t('detailSuggestionB', {
            rows: result.suggestionsAB.requiredRowsB
        }));
        setText('dimension-detail-or', t('detailOr'));
        setText('dimension-detail-suggestion-a', t('detailSuggestionA', {
            columns: result.suggestionsAB.requiredColsA
        }));
        setText('dimension-detail-ba-title', t('detailBaTitle'));
        setText('dimension-detail-ba-status', result.canMultiplyBA ? t('detailBaPossible') : t('detailBaNotPossible'));
        setText('dimension-detail-ba-inner-label', t('detailInnerLabel'));
        setText('dimension-detail-ba-inner', formatComparison(result.innerBA.left, result.innerBA.right, result.innerBA.matches));
        setText('dimension-detail-ba-result-label', t('detailResultLabel'));
        setText('dimension-detail-ba-result', result.resultBA ? formatSize(result.resultBA.rows, result.resultBA.cols) : t('notDefined'));
        setText('dimension-detail-full-title', t('detailFullTitle'));
        setText('dimension-detail-full-text', t('detailFullText'));
    }

    function updateStaticLabels() {
        const urls = getUrls();

        setText('dimension-inline-link', t('inlineCheckerLink'));
        setText('dimension-detail-link', t('detailCheckerLink'));

        if (elements.inlineLink) elements.inlineLink.href = urls.checkerUrl;
        if (elements.detailLink) elements.detailLink.href = urls.checkerUrl;
        if (elements.inlineLink && !elements['dimension-inline-link']) {
            elements.inlineLink.textContent = t('inlineCheckerLink');
        }
        if (elements.detailLink && !elements['dimension-detail-link']) {
            elements.detailLink.textContent = t('detailCheckerLink');
        }
        if (elements.closeButton) elements.closeButton.setAttribute('aria-label', t('detailCloseLabel'));
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
        elements.inlineLink = document.querySelector('.dimension-inline__link');
        elements.detailLink = document.querySelector('.dimension-detail__link');

        [
            'dimension-inline-status',
            'dimension-inline-inner',
            'dimension-inline-result',
            'dimension-inline-reverse',
            'dimension-inline-link',
            'dimension-detail-title',
            'dimension-detail-why-title',
            'dimension-detail-why-text',
            'dimension-detail-a-size',
            'dimension-detail-b-size',
            'dimension-detail-a-cols-label',
            'dimension-detail-b-rows-label',
            'dimension-detail-a-cols',
            'dimension-detail-b-rows',
            'dimension-detail-ab-comparison',
            'dimension-detail-how-title',
            'dimension-detail-suggestion-b',
            'dimension-detail-or',
            'dimension-detail-suggestion-a',
            'dimension-detail-ba-title',
            'dimension-detail-ba-status',
            'dimension-detail-ba-inner-label',
            'dimension-detail-ba-inner',
            'dimension-detail-ba-result-label',
            'dimension-detail-ba-result',
            'dimension-detail-full-title',
            'dimension-detail-full-text',
            'dimension-detail-link'
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
        updateStaticLabels();
        updateAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
