import { attachSymbolicStructure } from "./symbolic-structure.js";

// ========== 矩阵输出UI模块 ==========

// 全局输出格式状态（仅用于“默认行为”和小数位数）
let globalOutputFormat = {
    type: 'auto',   // 'auto' | 'fraction' | 'decimal'
    precision: 2
};

// 存储结果块原始数据的映射
const resultMatrixCache = new Map();

/**
 * ✅ 按你的规则做“默认输出跟输入走（分数优先）”
 * - 只要输入框原始字符串里出现过 "/" => fraction
 * - 否则 => decimal
 * 说明：不要用 math.isFraction 来判断输入类型，因为计算阶段所有值都会变成 Fraction。
 */
function detectInputFormatFromDOM() {
    const scanContainer = (id) => {
        const container = document.getElementById(id);
        if (!container) return false;
        const inputs = container.querySelectorAll('.matrix input');
        return Array.from(inputs).some(inp => (inp.value || '').trim().includes('/'));
    };

    const hasFractionA = scanContainer('matrix-container-a');
    const hasFractionB = scanContainer('matrix-container-b');

    return (hasFractionA || hasFractionB) ? 'fraction' : 'decimal';
}

// 本地格式化函数（支持 format 参数）
function localFormatMatrixValue(value, format = null) {
    if (typeof math === 'undefined') return '0';

    let currentFormat = format || globalOutputFormat.type;
    const currentPrecision = globalOutputFormat.precision;

    // auto：默认用“本次 detectedFormat”传进来（displayResult/renderResultMatrix 会传）
    // 如果调用方没传 format，又是 auto，那就保守用 fraction（避免显示奇怪）
    if (currentFormat === 'auto') currentFormat = 'fraction';

    // decimal 模式：统一转数值显示
    if (currentFormat === 'decimal') {
        try {
            const num = math.number(value);
            let formatted = num.toFixed(currentPrecision);
            formatted = parseFloat(formatted).toString();
            return formatted;
        } catch (e) {
            if (typeof value === 'number') {
                let formatted = value.toFixed(currentPrecision);
                formatted = parseFloat(formatted).toString();
                return formatted;
            }
            return value.toString();
        }
    }

    // fraction 模式：✅ 永远显示分数（可约分），不再自动转小数
    try {
        const f = math.isFraction(value) ? math.fraction(value) : math.fraction(String(value));

        if (math.compare(f.d, 1) === 0) {
            return (f.s * f.n).toString();
        }
        return `${f.s * f.n}/${f.d}`;
    } catch (e) {
        return value.toString();
    }
}

// 创建输出格式选择器（每个结果块一套）
function createFormatSelector(resultId, defaultFormat) {
    const container = document.createElement('div');
    container.className = 'matrix-output-ctrl';
    container.dataset.resultId = resultId;

    const formatType = (defaultFormat === 'decimal') ? 'decimal' : 'fraction';

    container.innerHTML = `
    <div class="seg-control">
      <input type="radio" id="f-frac-${resultId}" name="fmt-${resultId}" value="fraction" ${formatType === 'fraction' ? 'checked' : ''}>
      <label for="f-frac-${resultId}">Fraction</label>

      <input type="radio" id="f-dec-${resultId}" name="fmt-${resultId}" value="decimal" ${formatType === 'decimal' ? 'checked' : ''}>
      <label for="f-dec-${resultId}">Decimal</label>

      <span class="seg-glider" style="${formatType === 'decimal' ? 'transform: translateX(82px);' : ''}"></span>
    </div>

    <div class="precision-drawer" style="${formatType === 'decimal' ? 'opacity: 1; transform: translateY(0); pointer-events: auto;' : 'opacity: 0; transform: translateY(-10px); pointer-events: none;'}">
      <span>Digits</span>
      <input type="number" id="dec-prec-${resultId}" value="${globalOutputFormat.precision}" min="0" max="9">
    </div>
  `;

    return container;
}

// 绑定格式选择器事件（仅作用于当前结果块，不改变“默认跟输入走”的规则）
function bindFormatSelectorEvents(selector, resultId) {
    const fractionRadio = selector.querySelector(`#f-frac-${resultId}`);
    const decimalRadio = selector.querySelector(`#f-dec-${resultId}`);
    const precisionInput = selector.querySelector(`#dec-prec-${resultId}`);
    const segGlider = selector.querySelector('.seg-glider');
    const precisionDrawer = selector.querySelector('.precision-drawer');

    const getSelectedFormat = () => (decimalRadio.checked ? 'decimal' : 'fraction');

    const updateUI = () => {
        if (fractionRadio.checked) {
            segGlider.style.transform = 'translateX(0)';
            precisionDrawer.style.opacity = '0';
            precisionDrawer.style.transform = 'translateY(-10px)';
            precisionDrawer.style.pointerEvents = 'none';
        } else {
            segGlider.style.transform = 'translateX(82px)';
            precisionDrawer.style.opacity = '1';
            precisionDrawer.style.transform = 'translateY(0)';
            precisionDrawer.style.pointerEvents = 'auto';
        }
    };

    const reformatResult = () => {
        const resultBlock = document.getElementById(resultId);
        if (!resultBlock) return;

        const cachedMatrix = resultMatrixCache.get(resultId);
        if (!cachedMatrix) return;

        const finalResultGrid = resultBlock.querySelector('.final-result-container .result-matrix-grid');
        if (finalResultGrid) finalResultGrid.remove();

        const newContainer = resultBlock.querySelector('.final-result-container');
        if (!newContainer) return;

        renderResultMatrix(cachedMatrix, newContainer, false, getSelectedFormat());
    };

    // 小数位数：全局共享（只影响 decimal 显示）
    const updatePrecision = () => {
        globalOutputFormat.precision = parseInt(precisionInput.value, 10);
        if (!Number.isFinite(globalOutputFormat.precision)) globalOutputFormat.precision = 2;
    };

    fractionRadio.addEventListener('change', () => {
        updateUI();
        updatePrecision();
        reformatResult();
    });

    decimalRadio.addEventListener('change', () => {
        updateUI();
        updatePrecision();
        reformatResult();
    });

    precisionInput.addEventListener('input', () => {
        updatePrecision();
        if (decimalRadio.checked) reformatResult();
    });

    updateUI();
    updatePrecision();
}

// 重新格式化所有结果（用于全局 selector 存在时）
function refreshAllResults() {
    const resultBlocks = document.querySelectorAll('.result-block');
    resultBlocks.forEach(block => {
        const resultId = block.id;
        const cachedMatrix = resultMatrixCache.get(resultId);
        if (!cachedMatrix) return;

        const formatSelector = block.querySelector('.matrix-output-ctrl');
        if (!formatSelector) return;

        const fractionRadio = formatSelector.querySelector(`#f-frac-${resultId}`);
        const format = fractionRadio?.checked ? 'fraction' : 'decimal';

        const finalResultGrid = block.querySelector('.final-result-container .result-matrix-grid');
        if (finalResultGrid) finalResultGrid.remove();

        const newContainer = block.querySelector('.final-result-container');
        if (!newContainer) return;

        renderResultMatrix(cachedMatrix, newContainer, false, format);
    });
}

export function displayResult(operation, matrixA, matrixB, operator, processMatrix, resultMatrix, errorMessage = null) {
    const resultHistory = document.getElementById('result-history');

    const resultBlock = document.createElement('div');
    const resultId = 'result-' + Date.now();
    resultBlock.id = resultId;
    resultBlock.classList.add('result-block');

    // 缓存结果矩阵
    resultMatrixCache.set(resultId, resultMatrix);

    // ✅ 用 DOM 原始输入判定默认格式（分数优先）
    const detectedFormat = detectInputFormatFromDOM();

    if (errorMessage) {
        resultBlock.innerHTML = `<div class="error-message">${errorMessage}</div>`;
    } else {
        const formatSelector = createFormatSelector(resultId, detectedFormat);

        const topControls = document.createElement('div');
        topControls.classList.add('result-top-controls');

        const actionButtons = document.createElement('div');
        actionButtons.classList.add('action-buttons');
        actionButtons.innerHTML = `
      <button class="toggle-process-btn" title="Show Calculation Process"><i class="fas fa-eye"></i></button>
      <div class="share-dropdown">
        <button class="share-btn" title="Share this calculation"><i class="fas fa-share-alt"></i></button>
        <div class="share-menu">
          <button class="share-option copy-link">Copy Link</button>
          <button class="share-option share-x">Share to X</button>
          <button class="share-option share-reddit">Share to Reddit</button>
          <button class="share-option share-email">Email Result</button>
        </div>
      </div>
      <button class="delete-btn" title="Delete this record"><i class="fas fa-times"></i></button>
    `;

        topControls.appendChild(formatSelector);
        topControls.appendChild(actionButtons);
        resultBlock.appendChild(topControls);

        const desktopView = document.createElement('div');
        desktopView.className = 'desktop-result-view';

        const row = document.createElement('div');
        row.classList.add('result-expression-row');

        // ✅ A/B 的显示也跟随 detectedFormat（这就是“默认跟输入走”）
        renderResultMatrix(matrixA, row, false, detectedFormat);

        row.innerHTML += `<span class="result-op">${operator}</span>`;

        renderResultMatrix(matrixB, row, false, detectedFormat);

        row.innerHTML += `<span class="result-eq">=</span>`;

        const processOnlyContainer = document.createElement('div');
        processOnlyContainer.classList.add('process-only-container');
        processOnlyContainer.style.display = 'none';
        processOnlyContainer.style.gap = '15px';
        processOnlyContainer.style.alignItems = 'center';

        renderResultMatrix(processMatrix, processOnlyContainer, true);
        processOnlyContainer.innerHTML += `<span class="result-eq">=</span>`;

        const finalResultContainer = document.createElement('div');
        finalResultContainer.classList.add('final-result-container');
        finalResultContainer.style.display = 'flex';
        finalResultContainer.style.alignItems = 'center';

        // ✅ 结果默认用 detectedFormat，用户可切换
        renderResultMatrix(resultMatrix, finalResultContainer, false, detectedFormat);

        // 数值结果渲染完毕后调用 attachSymbolicStructure
        attachSymbolicStructure(finalResultContainer, operation);

        row.appendChild(processOnlyContainer);
        row.appendChild(finalResultContainer);
        desktopView.appendChild(row);
        resultBlock.appendChild(desktopView);
    }

    resultHistory.prepend(resultBlock);

    setupResultBlockFunctionality(resultBlock, matrixA, matrixB, resultMatrix, operation);

    if (!errorMessage) {
        bindFormatSelectorEvents(
            resultBlock.querySelector('.matrix-output-ctrl'),
            resultId
        );
    }
}

export function renderResultMatrix(matrix, container, isProcess = false, format = null) {
    // ✅ Guard: allow single-matrix ops (matrix can be null)
    if (!matrix || !Array.isArray(matrix) || matrix.length === 0) return;

    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;

    const gridDiv = document.createElement('div');
    gridDiv.classList.add('result-matrix-grid');
    if (isProcess) gridDiv.classList.add('process-matrix');

    gridDiv.style.gridTemplateColumns = `repeat(${cols}, auto)`;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('div');
            cell.classList.add('result-cell');

            if (isProcess) {
                cell.innerHTML = matrix[i][j];
            } else {
                cell.textContent = localFormatMatrixValue(matrix[i][j], format);
            }
            gridDiv.appendChild(cell);
        }
    }
    container.appendChild(gridDiv);
}

export function showError(message) {
    const resultHistory = document.getElementById('result-history');

    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();

    // ✅ 某些页面（如 index）没有结果区时，降级处理，避免报错
    if (!resultHistory) {
        console.error('showError:', message);
        return;
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;

    resultHistory.insertBefore(errorDiv, resultHistory.firstChild);

    setTimeout(() => {
        if (errorDiv.parentNode) errorDiv.remove();
    }, 5000);
}

// 页面级全局 selector（如果你页面上有一个全局的控制条，就刷新所有结果）
export function setupFormatSelector() {
    const globalSelector = document.querySelector('.matrix-output-ctrl:not([data-result-id])');
    if (!globalSelector) return;

    const fractionRadio = globalSelector.querySelector('#f-frac');
    const decimalRadio = globalSelector.querySelector('#f-dec');
    const precisionInput = globalSelector.querySelector('#dec-prec');
    const segGlider = globalSelector.querySelector('.seg-glider');
    const precisionDrawer = globalSelector.querySelector('.precision-drawer');

    if (!fractionRadio || !decimalRadio || !precisionInput) return;

    const updateUI = () => {
        if (fractionRadio.checked) {
            segGlider.style.transform = 'translateX(0)';
            precisionDrawer.style.opacity = '0';
            precisionDrawer.style.transform = 'translateY(-10px)';
            precisionDrawer.style.pointerEvents = 'none';
        } else {
            segGlider.style.transform = 'translateX(82px)';
            precisionDrawer.style.opacity = '1';
            precisionDrawer.style.transform = 'translateY(0)';
            precisionDrawer.style.pointerEvents = 'auto';
        }
    };

    const updatePrecision = () => {
        globalOutputFormat.precision = parseInt(precisionInput.value, 10);
        if (!Number.isFinite(globalOutputFormat.precision)) globalOutputFormat.precision = 2;
    };

    fractionRadio.addEventListener('change', () => {
        updateUI();
        updatePrecision();
        refreshAllResults();
    });

    decimalRadio.addEventListener('change', () => {
        updateUI();
        updatePrecision();
        refreshAllResults();
    });

    precisionInput.addEventListener('input', () => {
        updatePrecision();
        if (decimalRadio.checked) refreshAllResults();
    });

    updateUI();
    updatePrecision();
}

function setupResultBlockFunctionality(resultBlock, matrixA, matrixB, result, operation) {
    const deleteBtn = resultBlock.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const resultId = resultBlock.id;
            resultMatrixCache.delete(resultId);
            resultBlock.remove();
        });
    }

    const toggleProcessBtn = resultBlock.querySelector('.toggle-process-btn');
    if (toggleProcessBtn) {
        const processOnlyContainer = resultBlock.querySelector('.process-only-container');
        toggleProcessBtn.addEventListener('click', () => {
            if (processOnlyContainer.style.display === 'none') {
                processOnlyContainer.style.display = 'flex';
                toggleProcessBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                toggleProcessBtn.title = 'Hide Calculation Process';
            } else {
                processOnlyContainer.style.display = 'none';
                toggleProcessBtn.innerHTML = '<i class="fas fa-eye"></i>';
                toggleProcessBtn.title = 'Show Calculation Process';
            }
        });
    }

    const shareBtn = resultBlock.querySelector('.share-btn');
    const shareMenu = resultBlock.querySelector('.share-menu');

    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shareMenu.classList.toggle('active');
        });

        const copyLinkBtn = resultBlock.querySelector('.copy-link');
        copyLinkBtn.addEventListener('click', () => {
            const shareURL = generateShareURL(matrixA, matrixB, operation);
            navigator.clipboard.writeText(shareURL).then(() => {
                alert('Link copied to clipboard!');
                shareMenu.classList.remove('active');
            });
        });

        const shareXBtn = resultBlock.querySelector('.share-x');
        shareXBtn.addEventListener('click', () => {
            const text = `Check out this matrix ${operation.toLowerCase()} calculation!`;
            const url = generateShareURL(matrixA, matrixB, operation);
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
            shareMenu.classList.remove('active');
        });

        const shareRedditBtn = resultBlock.querySelector('.share-reddit');
        shareRedditBtn.addEventListener('click', () => {
            const title = `Matrix ${operation} Calculation`;
            const url = generateShareURL(matrixA, matrixB, operation);
            window.open(`https://www.reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
            shareMenu.classList.remove('active');
        });

        const shareEmailBtn = resultBlock.querySelector('.share-email');
        shareEmailBtn.addEventListener('click', () => {
            const subject = `Matrix Calculation - ${operation}`;
            const body = generateEmailBody(matrixA, matrixB, result, operation);
            window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
            shareMenu.classList.remove('active');
        });

        document.addEventListener('click', () => {
            shareMenu.classList.remove('active');
        });
    }
}

function generateShareURL(matrixA, matrixB, operation) {
    const baseURL = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    const rowsA = parseInt(document.getElementById('rows-a')?.textContent) || 3;
    const colsA = parseInt(document.getElementById('cols-a')?.textContent) || 3;
    const rowsB = parseInt(document.getElementById('rows-b')?.textContent) || 3;
    const colsB = parseInt(document.getElementById('cols-b')?.textContent) || 3;

    params.append('rowsA', rowsA);
    params.append('colsA', colsA);
    params.append('rowsB', rowsB);
    params.append('colsB', colsB);
    params.append('matrixA', JSON.stringify(matrixA));
    params.append('matrixB', JSON.stringify(matrixB));
    params.append('operation', operation);

    return `${baseURL}?${params.toString()}`;
}

function generateEmailBody(matrixA, matrixB, result, operation) {
    const rowsA = parseInt(document.getElementById('rows-a')?.textContent) || 3;
    const colsA = parseInt(document.getElementById('cols-a')?.textContent) || 3;
    const rowsB = parseInt(document.getElementById('rows-b')?.textContent) || 3;
    const colsB = parseInt(document.getElementById('cols-b')?.textContent) || 3;

    let body = `Matrix A (${rowsA}×${colsA}):\n${matrixToString(matrixA)}\n\n`;
    body += `Matrix B (${rowsB}×${colsB}):\n${matrixToString(matrixB)}\n\n`;
    body += `Operation: ${operation}\n\n`;
    body += `Result (${rowsA}×${colsB}):\n${matrixToString(result)}\n\n`;
    body += `View full calculation: ${generateShareURL(matrixA, matrixB, operation)}`;

    return body;
}

function matrixToString(matrix) {
    return matrix
        .map(row => '[' + row.map(cell => localFormatMatrixValue(cell, 'fraction')).join(', ') + ']')
        .join('\n');
}