// ========== 矩阵输入UI模块 ==========

let matrices = {
    A: { rows: 3, cols: 3 },
    B: { rows: 3, cols: 3 }
};
const minSize = 1;
const maxSize = 9;

/**
 * 目标规则：
 * - 用户输入小数 => 显示小数（不把它变成分数）
 * - 用户输入分数 => 显示分数（可约分，但不转小数）
 * - 计算阶段再用 math.fraction(raw) 去解析
 */

// 判断是否“看起来像分数输入”
function looksLikeFraction(raw) {
    return raw.includes('/');
}

// 规范化小数字符串：去掉多余空格；去掉末尾0；避免 "1." 这种
function normalizeDecimalString(raw) {
    let s = raw.trim();

    if (s.startsWith('.')) s = '0' + s;
    if (s.startsWith('-.')) s = s.replace('-.', '-0.');

    const n = Number(s);
    if (!Number.isFinite(n)) return raw.trim();

    return n.toString();
}

// 把 Fraction 显示为“分数形式”（必要时约分；分母=1 显示整数）
function fractionToPrettyString(frac) {
    const f = math.fraction(frac);

    if (math.compare(f.d, 1) === 0) {
        return (f.s * f.n).toString();
    }
    return `${f.s * f.n}/${f.d}`;
}

// 输入显示格式化：严格“跟着输入类型走”
function formatInputDisplay(raw) {
    const s = raw.trim();
    if (!s) return '';

    // 检测是否为 pi/e 常量（保留原样）
    const lower = s.toLowerCase();
    if (lower === "π" || lower === "pi") return s;
    if (lower === "e") return s;

    const parsed = math.fraction(s);

    if (looksLikeFraction(s)) {
        return fractionToPrettyString(parsed);
    }

    return normalizeDecimalString(s);
}

export function initMatrixInput(config) {
    renderMatrix('A');
    renderMatrix('B');
    setupControls('A');
    setupControls('B');

    setupRandomControls('A');
    setupRandomControls('B');

    initFromLocalStorageState();
    initFromURLParameters();

    return matrices;
}

export function getMatrixValues(matrixId) {
    const container = matrixId === 'A' ?
        document.getElementById('matrix-container-a') :
        document.getElementById('matrix-container-b');
    const matrix = matrices[matrixId];
    const inputs = container.querySelectorAll('.matrix input');
    const matrixValues = [];

    for (let i = 0; i < matrix.rows; i++) {
        const row = [];
        for (let j = 0; j < matrix.cols; j++) {
            const index = i * matrix.cols + j;
            const raw = inputs[index] ? (inputs[index].value ?? "") : "";
            const value = parseMatrixInput(raw); // 空格子自动转 0
            row.push(value);
        }
        matrixValues.push(row);
    }
    return matrixValues;
}

export function getAllMatrices() {
    return [
        getMatrixValues('A'),
        getMatrixValues('B')
    ];
}

export function getMatrixDimensions() {
    return {
        A: { rows: matrices.A.rows, cols: matrices.A.cols },
        B: { rows: matrices.B.rows, cols: matrices.B.cols }
    };
}

// 渲染矩阵
function renderMatrix(matrixId) {
    const container = matrixId === 'A' ?
        document.getElementById('matrix-container-a') :
        document.getElementById('matrix-container-b');
    const matrix = matrices[matrixId];
    const { rows, cols } = matrix;

    const oldInputs = container.querySelectorAll('.matrix input');
    const oldValues = Array.from(oldInputs).map(input => input.value);
    const oldRows = matrices[matrixId].rows;
    const oldCols = matrices[matrixId].cols;

    container.innerHTML = '';
    const newMatrixDiv = document.createElement('div');
    newMatrixDiv.classList.add('matrix');
    newMatrixDiv.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '';

            // 恢复旧值：原样保留（包括空字符串和 "0"）
            if (r < oldRows && c < oldCols) {
                const oldIndex = r * oldCols + c;
                if (oldIndex < oldValues.length) {
                    input.value = oldValues[oldIndex] ?? "";
                }
            }

            input.addEventListener('blur', function () {
                const value = this.value.trim();
                if (!value) {
                    this.style.borderColor = '';
                    return;
                }

                try {
                    const formatted = formatInputDisplay(value);
                    this.style.borderColor = '';
                    this.value = formatted;
                } catch (e) {
                    this.style.borderColor = 'red';
                    console.warn('Invalid input:', value);
                }
            });

            newMatrixDiv.appendChild(input);
        }
    }

    container.appendChild(newMatrixDiv);
    updateDimensionDisplay(matrixId);
    updateControlState(matrixId);
}

function updateDimensionDisplay(matrixId) {
    const dimElement = document.getElementById(`dim-${matrixId.toLowerCase()}`);
    if (dimElement) {
        const m = matrices[matrixId];
        dimElement.textContent = `(${m.rows}×${m.cols})`;

        const rowsElement = document.getElementById(`rows-${matrixId.toLowerCase()}`);
        const colsElement = document.getElementById(`cols-${matrixId.toLowerCase()}`);
        if (rowsElement) rowsElement.textContent = m.rows;
        if (colsElement) colsElement.textContent = m.cols;
    }
}

function updateControlState(matrixId) {
    const matrix = matrices[matrixId];

    const decreaseRowsBtn = document.getElementById(`decrease-rows-${matrixId.toLowerCase()}`);
    const increaseRowsBtn = document.getElementById(`increase-rows-${matrixId.toLowerCase()}`);
    const decreaseColsBtn = document.getElementById(`decrease-cols-${matrixId.toLowerCase()}`);
    const increaseColsBtn = document.getElementById(`increase-cols-${matrixId.toLowerCase()}`);

    if (decreaseRowsBtn) decreaseRowsBtn.disabled = (matrix.rows === minSize);
    if (increaseRowsBtn) increaseRowsBtn.disabled = (matrix.rows === maxSize);
    if (decreaseColsBtn) decreaseColsBtn.disabled = (matrix.cols === minSize);
    if (increaseColsBtn) increaseColsBtn.disabled = (matrix.cols === maxSize);
}

function setupControls(matrixId) {
    function syncEquationsModeAfterAChange() {
        if (window.PAGE_CONFIG?.mode !== 'equations') return;
        if (matrixId !== 'A') return;

        matrices.A.cols = matrices.A.rows;

        if (matrices.B) {
            matrices.B.rows = matrices.A.rows;
            matrices.B.cols = 1;
        }
    }

    const decreaseRows = document.getElementById(`decrease-rows-${matrixId.toLowerCase()}`);
    const increaseRows = document.getElementById(`increase-rows-${matrixId.toLowerCase()}`);
    const decreaseCols = document.getElementById(`decrease-cols-${matrixId.toLowerCase()}`);
    const increaseCols = document.getElementById(`increase-cols-${matrixId.toLowerCase()}`);
    const clearBtn = document.getElementById(`clear-btn-${matrixId.toLowerCase()}`);

    if (decreaseRows) {
        decreaseRows.addEventListener('click', () => {
            if (matrices[matrixId].rows > minSize) {
                matrices[matrixId].rows--;
                syncEquationsModeAfterAChange();
                renderMatrix(matrixId);
                if (window.PAGE_CONFIG?.mode === 'equations' && matrixId === 'A') renderMatrix('B');
            }
        });
    }

    if (increaseRows) {
        increaseRows.addEventListener('click', () => {
            if (matrices[matrixId].rows < maxSize) {
                matrices[matrixId].rows++;
                syncEquationsModeAfterAChange();
                renderMatrix(matrixId);
                if (window.PAGE_CONFIG?.mode === 'equations' && matrixId === 'A') renderMatrix('B');
            }
        });
    }

    if (decreaseCols) {
        decreaseCols.addEventListener('click', () => {
            if (matrices[matrixId].cols > minSize) {
                matrices[matrixId].cols--;
                syncEquationsModeAfterAChange();
                renderMatrix(matrixId);
                if (window.PAGE_CONFIG?.mode === 'equations' && matrixId === 'A') renderMatrix('B');
            }
        });
    }

    if (increaseCols) {
        increaseCols.addEventListener('click', () => {
            if (matrices[matrixId].cols < maxSize) {
                matrices[matrixId].cols++;
                syncEquationsModeAfterAChange();
                renderMatrix(matrixId);
                if (window.PAGE_CONFIG?.mode === 'equations' && matrixId === 'A') renderMatrix('B');
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const container = matrixId === 'A' ?
                document.getElementById('matrix-container-a') :
                document.getElementById('matrix-container-b');
            container.querySelectorAll('.matrix input').forEach(input => {
                input.value = '';
                input.style.borderColor = '';
            });
        });
    }
}

function setupRandomControls(target) {
    const toggleBtn = document.getElementById(`toggle-random-btn-${target.toLowerCase()}`);
    const optionsDiv = document.getElementById(`random-options-${target.toLowerCase()}`);
    const buttons = optionsDiv.querySelectorAll('.random-option-btn');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            document.getElementById('random-options-a').style.display = 'none';
            document.getElementById('random-options-b').style.display = 'none';
            optionsDiv.style.display = 'flex';
        });
    }

    if (buttons.length > 0) {
        buttons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const type = button.getAttribute('data-type');
                fillMatrix(target, type);
            });
        });
    }
}

// 填充随机值
function fillMatrix(target, type) {
    const container = target === 'A' ?
        document.getElementById('matrix-container-a') :
        document.getElementById('matrix-container-b');
    const optionsDiv = target === 'A' ?
        document.getElementById('random-options-a') :
        document.getElementById('random-options-b');
    const inputs = container.querySelectorAll('.matrix input');

    inputs.forEach(input => {
        let value;
        switch (type) {
            case 'pos_int':
                value = Math.floor(Math.random() * 10);
                break;
            case 'signed_int':
                value = Math.floor(Math.random() * 21) - 10;
                break;
            case 'float':
                value = ((Math.random() * 2) - 1).toFixed(2);
                value = normalizeDecimalString(value);
                break;
            default:
                value = 0;
        }
        // 直接显示 value 的字符串形式（0 显示为 "0"）
        input.value = value.toString();
        input.style.borderColor = '';
    });

    if (optionsDiv) optionsDiv.style.display = 'none';
}

function initFromLocalStorageState() {
    try {
        const raw = localStorage.getItem('matrixcalcu_state_v1');
        if (!raw) return;

        const state = JSON.parse(raw);
        if (!state) return;

        if (state.rowsA && state.colsA) {
            matrices.A.rows = parseInt(state.rowsA, 10);
            matrices.A.cols = parseInt(state.colsA, 10);
        }
        if (state.rowsB && state.colsB) {
            matrices.B.rows = parseInt(state.rowsB, 10);
            matrices.B.cols = parseInt(state.colsB, 10);
        }

        renderMatrix('A');
        renderMatrix('B');

        if (Array.isArray(state.matrixA) && state.matrixA.length) {
            fillMatrixFromData('A', state.matrixA);
        }
        if (Array.isArray(state.matrixB) && state.matrixB.length) {
            fillMatrixFromData('B', state.matrixB);
        }

    } catch (e) {
        console.warn('Invalid localStorage matrixcalcu_state_v1');
    }
}

function initFromURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    const urlRowsA = parseInt(urlParams.get('rowsA'));
    const urlColsA = parseInt(urlParams.get('colsA'));
    const urlRowsB = parseInt(urlParams.get('rowsB'));
    const urlColsB = parseInt(urlParams.get('colsB'));

    if (urlRowsA && urlColsA) {
        matrices.A.rows = urlRowsA;
        matrices.A.cols = urlColsA;
    }

    if (urlRowsB && urlColsB) {
        matrices.B.rows = urlRowsB;
        matrices.B.cols = urlColsB;
    }

    try {
        const matrixAData = JSON.parse(urlParams.get('matrixA') || '[]');
        const matrixBData = JSON.parse(urlParams.get('matrixB') || '[]');

        if (matrixAData.length > 0) fillMatrixFromData('A', matrixAData);
        if (matrixBData.length > 0) fillMatrixFromData('B', matrixBData);
    } catch (e) {
        console.warn('Invalid matrix data in URL parameters');
    }
}

function fillMatrixFromData(target, data) {
    const container = target === 'A' ?
        document.getElementById('matrix-container-a') :
        document.getElementById('matrix-container-b');
    const matrix = matrices[target];
    const inputs = container.querySelectorAll('.matrix input');

    for (let i = 0; i < matrix.rows; i++) {
        for (let j = 0; j < matrix.cols; j++) {
            const index = i * matrix.cols + j;
            if (data[i] && data[i][j] !== undefined && inputs[index]) {
                const val = data[i][j];
                // 直接使用原始值，0 显示为 "0"
                inputs[index].value = String(val);
            }
        }
    }
}

// 解析输入值：计算阶段统一用 fraction，支持空值和 pi/e 常量
function parseMatrixInput(inputStr) {
    const s0 = (inputStr ?? "").toString().trim();

    if (s0 === "") return math.fraction(0);

    const lower = s0.toLowerCase();
    if (lower === "π" || lower === "pi") return math.pi;
    if (lower === "e") return math.e;

    try {
        return math.fraction(s0);
    } catch (error) {
        console.warn('Failed to parse input value:', s0, ', using 0 instead');
        return math.fraction(0);
    }
}

// 全局事件监听器
document.addEventListener('click', (event) => {
    const isInsideA = document.getElementById('random-controls-main-a')?.contains(event.target);
    const isInsideB = document.getElementById('random-controls-main-b')?.contains(event.target);
    if (!isInsideA) document.getElementById('random-options-a').style.display = 'none';
    if (!isInsideB) document.getElementById('random-options-b').style.display = 'none';
}, true);