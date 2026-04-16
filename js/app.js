// ========== 调度核心模块 ==========
import { resolveErrorMessage } from './i18n/error-resolver.js';
import { userError } from './i18n/user-error.js';
import { getStepText } from './i18n/step-text.js';
// This app.js adds:
// - Binary ops: Multiplication/Add/Subtract/Augmented/Kronecker Product
// - Unary ops (single-matrix): generic loader/executor (Transpose/Trace/...)
// - RREF (single-matrix) + Equation Input Mode
// It DOES NOT require editing matrix-output.js.

// 确保 math.js 已加载
if (typeof math === 'undefined') {
    console.log('math.js is not defined, loading now...');
    const script = document.createElement('script');
    script.src = '/math.min.js';
    script.onload = () => {
        console.log('math.js loaded successfully');
        window.location.reload();
    };
    script.onerror = () => {
        console.error('Failed to load math.js');
        alert(resolveErrorMessage(userError('ERR_REQUIRED_MATH_LIBRARY_LOAD_FAILED')));
    };
    document.head.appendChild(script);
}

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof math === 'undefined') {
        console.error('math.js is still not available');
        return;
    }

    let showErrorFn = null;

    try {
        // 双矩阵核心
        const mult = await import('./core/multiplication.js');
        const add = await import('./core/addition.js');
        const sub = await import('./core/subtraction.js');
        const augmented = await import('./core/augmented.js');
        const kronecker = await import('./core/kronecker-product.js');

        // 单矩阵：RREF
        const rref = await import('./core/rref.js');

        // UI
        const { initMatrixInput, getAllMatrices, getMatrixDimensions } = await import('./ui/matrix-input.js');
        const { displayResult, showError, setupFormatSelector } = await import('./ui/matrix-output.js');

        // Equation Input UI module (creates panel if missing)
        const eqUI = await import('./ui/equation-input.js');
        const equations = await import('./core/equations.js');

        showErrorFn = showError;

        // 运算注册表（双矩阵）
        const ops = {
            Multiplication: { ...mult, symbol: '×' },
            Addition: { ...add, symbol: '+' },
            Subtraction: { ...sub, symbol: '−' },
            Augmented: { ...augmented, symbol: '|' },
            'Kronecker Product': { ...kronecker, symbol: '⊗' }
        };

        new MatrixApp(
            ops,
            rref,
            eqUI,
            equations,
            initMatrixInput, getAllMatrices, getMatrixDimensions,
            displayResult, showError, setupFormatSelector
        );
    } catch (error) {
        console.error('Failed to load modules:', error);
        if (typeof showErrorFn === 'function') {
            showErrorFn(resolveErrorMessage(userError('ERR_CALCULATOR_MODULES_LOAD_FAILED')));
        } else {
            alert(resolveErrorMessage(userError('ERR_CALCULATOR_MODULES_LOAD_FAILED')));
        }
    }
});

class MatrixApp {
    constructor(ops, rref, eqUI, equations,
        initMatrixInput, getAllMatrices, getMatrixDimensions,
        displayResult, showError, setupFormatSelector) {

        this.ops = ops;
        this.rref = rref;
        this.eqUI = eqUI;
        this.equations = equations;

        this.initMatrixInput = initMatrixInput;
        this.getAllMatrices = getAllMatrices;
        this.getMatrixDimensions = getMatrixDimensions;

        // Wrap displayResult for RREF steps injection (no changes to matrix-output.js)
        this.displayResult = this._wrapDisplayResult(displayResult);

        this.showError = showError;
        this.setupFormatSelector = setupFormatSelector;

        this.currentOperation = 'Multiplication';
        this.rrefMode = 'matrix'; // 'matrix' | 'equation'

        // ✅ cache: single-op action -> imported module
        this._singleOpModules = {};

        this.initializeApp();
    }

    initializeApp() {
        try {
            this.initializeMatrixInput();
            this.bindEvents();
            this.initializeUIComponents();
            this.setupGlobalFunctions();
            this.initializeFormatSelector();

            // ✅ Create/initialize RREF panel UI (hidden by default)
            this._initRrefPanel();

            // ✅ equations 页面默认打开 equation mode
            const pageMode = window.PAGE_MODE || '';
            if (pageMode === 'equation') {
                this._showRrefPanel(true);
                this.rrefMode = 'equation';
                if (this.eqUI && typeof this.eqUI.setMode === 'function') {
                    this.eqUI.setMode('equation');
                }
            }

            const isLanding = window.PAGE_MODE === 'landing';
            const cfg = window.PAGE_CONFIG || {};

            if (isLanding) {
                this.showArticle('intro');
            } else {
                this.showArticle(cfg.opName || cfg.articleKey || 'intro');
                this._autoRunFromLocalStorage();
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError(resolveErrorMessage(userError('ERR_CALCULATOR_INIT_FAILED')));
        }
    }

    initializeMatrixInput() {
        this.initMatrixInput(this.ops.Multiplication?.config || {});
    }

    // =====================================================
    // ✅ 双矩阵：乘/加/减/增广/Kronecker Product
    // =====================================================
    performBinaryCalculation(opName) {
        try {
            const op = this.ops[opName];
            if (!op) throw userError('ERR_OPERATION_NOT_FOUND', { opName });

            const { config, calculate, generateProcessMatrix, symbol } = op;
            const matrices = this.getAllMatrices();

            if (config && typeof config.validate === 'function') {
                config.validate(matrices);
            }

            const result = calculate(matrices);
            const dims = this.getMatrixDimensions();

            const processMatrix = (typeof generateProcessMatrix === 'function')
                ? generateProcessMatrix(
                    matrices[0], dims.A.rows, dims.A.cols,
                    matrices[1], dims.B.rows, dims.B.cols
                )
                : [];

            const safeProcessMatrix = (processMatrix == null) ? [] : processMatrix;

            this.displayResult(
                opName,
                matrices[0],
                matrices[1],
                symbol || '?',
                safeProcessMatrix,
                result
            );
            this.scrollToResults();

        } catch (error) {
            this.showError(resolveErrorMessage(error));
        }
    }

    // =====================================================
    // ✅ 单矩阵：RREF（Matrix A / Equation Input）
    // =====================================================
    performRrefFromMatrixA() {
        try {
            const matrices = this.getAllMatrices();
            const A = matrices[0];
            if (!A || !A.length || !A[0] || !A[0].length) {
                throw userError('ERR_MATRIX_A_REQUIRED');
            }

            const { rrefMatrix, steps } = this.rref.calculateRREFWithSteps(A);

            this.displayResult(
                'RREF',
                A,
                null,
                '→',
                steps,
                rrefMatrix
            );
            this.scrollToResults();
            this.showArticle('RREF');
        } catch (error) {
            this.showError(resolveErrorMessage(error));
        }
    }

    performRrefFromEquations() {
        try {
            const aug = this.eqUI.getAugmentedMatrixFromEquations();
            const { rrefMatrix, steps } = this.rref.calculateRREFWithSteps(aug);

            this.displayResult(
                'RREF',
                aug,
                null,
                '→',
                steps,
                rrefMatrix
            );
            this.scrollToResults();
            this.showArticle('RREF');
        } catch (error) {
            this.showError(resolveErrorMessage(error));
        }
    }

    // =====================================================
    // ✅ 事件绑定
    // =====================================================
    bindEvents() {
        const calculateBtn = document.getElementById('calculate-multiplication-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                this.currentOperation = 'Multiplication';
                this.performBinaryCalculation('Multiplication');
                this.showArticle('Multiplication');
            });
        }

        const additionBtn = document.getElementById('addition-btn');
        const subtractionBtn = document.getElementById('subtraction-btn');

        if (additionBtn) {
            additionBtn.addEventListener('click', () => {
                this.currentOperation = 'Addition';
                this.performBinaryCalculation('Addition');
                this.showArticle('Addition');
            });
        }

        if (subtractionBtn) {
            subtractionBtn.addEventListener('click', () => {
                this.currentOperation = 'Subtraction';
                this.performBinaryCalculation('Subtraction');
                this.showArticle('Subtraction');
            });
        }

        const swapBtn = document.getElementById('swap-ab-btn');
        if (swapBtn) {
            swapBtn.addEventListener('click', () => this.swapMatrices());
        }

        const clearAllBtn = document.getElementById('clear-all-results');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllResults());
        }

        this.bindSingleOperationButtons();
        this.bindAccordionFunctionality();
        this.bindMobileNavigation();
    }

    bindSingleOperationButtons() {
        const v2Buttons = document.querySelectorAll('button.btn[data-action]:not([data-goto])');
        v2Buttons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const target = button.dataset.target || 'A';

                // ✅ 双矩阵操作统一在这里分流
                const binaryActionMap = {
                    addition: 'Addition',
                    subtraction: 'Subtraction',
                    multiplication: 'Multiplication',
                    augmented: 'Augmented',
                    kronecker: 'Kronecker Product',
                    'kronecker-product': 'Kronecker Product'
                };

                if (binaryActionMap[action]) {
                    const opName = binaryActionMap[action];
                    this.currentOperation = opName;
                    this.performBinaryCalculation(opName);
                    this.showArticle(opName);
                    return;
                }

                if (action === 'scalar-multiplication') {
                    const el = document.getElementById('mBy-a-val');
                    this.handleSingleOperation(action, target, el ? el.value : '');
                    return;
                }

                if (action === 'power') {
                    const el = document.getElementById('pow-a-val');
                    this.handleSingleOperation(action, target, el ? el.value : '');
                    return;
                }

                this.handleSingleOperation(action, target);
            });
        });
    }

    bindAccordionFunctionality() {
        const categoryHeaders = document.querySelectorAll('.category-header');
        categoryHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.accordion-btn')) return;
                const accordionItem = header.closest('.accordion-item');
                const isActive = accordionItem.classList.contains('active');
                document.querySelectorAll('.accordion-item').forEach(item => item.classList.remove('active'));
                if (!isActive) accordionItem.classList.add('active');
            });
        });

        const accordionButtons = document.querySelectorAll('.accordion-btn');
        accordionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                const target = button.getAttribute('data-target');

                if (action === 'close') {
                    const accordionItem = button.closest('.accordion-item');
                    if (accordionItem) accordionItem.classList.remove('active');
                    return;
                }

                // ✅ 双矩阵操作统一在这里分流
                const binaryActionMap = {
                    addition: 'Addition',
                    subtraction: 'Subtraction',
                    multiplication: 'Multiplication',
                    augmented: 'Augmented',
                    kronecker: 'Kronecker Product',
                    'kronecker-product': 'Kronecker Product'
                };

                if (binaryActionMap[action]) {
                    const opName = binaryActionMap[action];
                    this.currentOperation = opName;
                    this.performBinaryCalculation(opName);
                    this.showArticle(opName);
                    return;
                }

                if (action === 'scalar-multiplication' || action === 'power') {
                    const operationName = action === 'scalar-multiplication' ? 'Multiply by' : 'Power';
                    const defaultValue = '2';
                    const value = prompt(`Enter value for ${operationName}:`, defaultValue);
                    if (value !== null) {
                        this.handleSingleOperation(action, target, value);
                    }
                } else {
                    this.handleSingleOperation(action, target);
                }
            });
        });
    }

    bindMobileNavigation() {
        const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
        const navButtons = document.querySelector('.nav-buttons');

        if (mobileNavToggle && navButtons) {
            mobileNavToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                navButtons.classList.toggle('active');
                mobileNavToggle.classList.toggle('active');
            });

            document.addEventListener('click', (event) => {
                if (!mobileNavToggle.contains(event.target) && !navButtons.contains(event.target)) {
                    navButtons.classList.remove('active');
                    mobileNavToggle.classList.remove('active');
                }
            });

            const navLinks = document.querySelectorAll('.nav-button');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navButtons.classList.remove('active');
                    mobileNavToggle.classList.remove('active');
                });
            });
        }
    }

    // =====================================================
    // ✅ 单矩阵运算：注册表 + 通用执行器
    // =====================================================
    _getSingleOpRegistry() {
        // ✅ 注意：所有带 - 的 key 必须加引号！
        return {
            transpose: { file: './core/transpose.js', opName: 'Transpose', symbol: 'T', articleKey: 'Transpose', targetDefault: 'A' },
            trace: { file: './core/trace.js', opName: 'Trace', symbol: 'tr', articleKey: 'Trace', targetDefault: 'A' },

            determinant: { file: './core/determinant.js', opName: 'Determinant', symbol: 'det', articleKey: 'Determinant', targetDefault: 'A' },
            inverse: { file: './core/inverse.js', opName: 'Inverse', symbol: 'inv', articleKey: 'Inverse', targetDefault: 'A' },

            "upper-triangular": { file: './core/upper-triangular.js', opName: 'Upper Triangular', symbol: 'UT', articleKey: 'Upper Triangular', targetDefault: 'A' },
            eigenvectors: { file: './core/eigenvectors.js', opName: 'Eigenvectors', symbol: 'eigV', articleKey: 'Eigenvectors', targetDefault: 'A' },
            eigenvalues: { file: './core/eigenvalues.js', opName: 'Eigenvalues', symbol: 'eigλ', articleKey: 'Eigenvalues', targetDefault: 'A' },
            rank: { file: './core/rank.js', opName: 'Rank', symbol: 'rank', articleKey: 'Rank', targetDefault: 'A' },

            "scalar-multiplication": { file: './core/scalar-multiplication.js', opName: 'Scalar Multiplication', symbol: 'k·A', articleKey: 'Scalar Multiplication', targetDefault: 'A' },
            power: { file: './core/power.js', opName: 'Power', symbol: 'A^n', articleKey: 'Power', targetDefault: 'A' },
            diagonal: { file: './core/diagonal.js', opName: 'Diagonal', symbol: 'diag', articleKey: 'Diagonal', targetDefault: 'A' },

            "lu-decomposition": { file: './core/lu-decomposition.js', opName: 'LU Decomposition', symbol: 'LU', articleKey: 'LU Decomposition', targetDefault: 'A' },
            cholesky: { file: './core/cholesky.js', opName: 'Cholesky', symbol: 'LLᵀ', articleKey: 'Cholesky', targetDefault: 'A' },
            "pseudo-inverse": { file: './core/pseudo-inverse.js', opName: 'Pseudo Inverse', symbol: 'A⁺', articleKey: 'Pseudo Inverse', targetDefault: 'A' },
            "qr-decomposition": { file: './core/qr-decomposition.js', opName: 'QR Decomposition', symbol: 'QR', articleKey: 'QR Decomposition', targetDefault: 'A' },
            svd: { file: './core/svd.js', opName: 'SVD', symbol: 'SVD', articleKey: 'SVD', targetDefault: 'A' },

            exponential: { file: './core/exponential.js', opName: 'Exponential', symbol: 'exp', articleKey: 'Exponential', targetDefault: 'A' },
            "square-root": { file: './core/square-root.js', opName: 'Square Root', symbol: '√', articleKey: 'Square Root', targetDefault: 'A' },
            logarithm: { file: './core/logarithm.js', opName: 'Logarithm', symbol: 'log', articleKey: 'Logarithm', targetDefault: 'A' },

            cosine: { file: './core/cosine.js', opName: 'Cosine', symbol: 'cos', articleKey: 'Cosine', targetDefault: 'A' },
            sine: { file: './core/sine.js', opName: 'Sine', symbol: 'sin', articleKey: 'Sine', targetDefault: 'A' },
            tangent: { file: './core/tangent.js', opName: 'Tangent', symbol: 'tan', articleKey: 'Tangent', targetDefault: 'A' },

            arcsine: { file: './core/arcsine.js', opName: 'Arcsine', symbol: 'arcsin', articleKey: 'Arcsine', targetDefault: 'A' },
            arccosine: { file: './core/arccosine.js', opName: 'Arccosine', symbol: 'arccos', articleKey: 'Arccosine', targetDefault: 'A' },
            arctangent: { file: './core/arctangent.js', opName: 'Arctangent', symbol: 'arctan', articleKey: 'Arctangent', targetDefault: 'A' },

            adjoint: { file: './core/adjoint.js', opName: 'Adjoint', symbol: 'adj', articleKey: 'Adjoint', targetDefault: 'A' },
            jordan: { file: './core/jordan.js', opName: 'Jordan', symbol: 'J', articleKey: 'Jordan', targetDefault: 'A' },

            "hermite-normal-form": { file: './core/hermite-normal-form.js', opName: 'Hermite Normal Form', symbol: 'HNF', articleKey: 'Hermite Normal Form', targetDefault: 'A' },
            lll: { file: './core/lll.js', opName: 'LLL', symbol: 'LLL', articleKey: 'LLL', targetDefault: 'A' },
        };
    }

    async _loadSingleOpModule(action) {
        if (this._singleOpModules[action]) return this._singleOpModules[action];

        const reg = this._getSingleOpRegistry();
        const meta = reg[action];
        if (!meta?.file) throw userError('ERR_SINGLE_OP_NOT_REGISTERED', { action });

        const mod = await import(meta.file);
        this._singleOpModules[action] = mod;
        return mod;
    }

    async performUnaryCalculation(action, target, value = '') {
        const reg = this._getSingleOpRegistry();
        const meta = reg[action];
        if (!meta) throw userError('ERR_UNKNOWN_OPERATION', { action });

        const useTarget = target || meta.targetDefault || 'A';

        const matrices = this.getAllMatrices();
        const AorB = (useTarget === 'B') ? matrices[1] : matrices[0];

        if (!AorB || !AorB.length || !AorB[0] || !AorB[0].length) {
            throw userError('ERR_MATRIX_TARGET_REQUIRED', { useTarget });
        }

        const mod = await this._loadSingleOpModule(action);

        if (mod?.config?.validate) {
            mod.config.validate([AorB], value);
        }

        const result = mod.calculate([AorB], value);

        // ✅ QR Decomposition: allow multi-matrix output { Q, R }
        if (action === 'qr-decomposition' && result && typeof result === 'object' && !Array.isArray(result)) {
            const Q = result.Q;
            const R = result.R;

            const looksLikeMatrix = (M) => Array.isArray(M) && M.length && Array.isArray(M[0]);

            if (looksLikeMatrix(Q)) {
                this.displayResult(
                    'QR Decomposition (Q)',
                    AorB,
                    null,
                    'Q',
                    [],
                    Q
                );
            }

            if (looksLikeMatrix(R)) {
                this.displayResult(
                    'QR Decomposition (R)',
                    AorB,
                    null,
                    'R',
                    [],
                    R
                );
            }

            this.showArticle(meta.articleKey || meta.opName);
            return;
        }

        // ✅ SVD: allow multi-matrix output { U, S, V }
        if (action === 'svd' && result && typeof result === 'object' && !Array.isArray(result)) {
            const U = result.U;
            const S = result.S;
            const V = result.V;

            const looksLikeMatrix = (M) => Array.isArray(M) && M.length && Array.isArray(M[0]);

            // 按 V -> S -> U 的顺序调用 displayResult
            if (looksLikeMatrix(V)) {
                this.displayResult('SVD (V)', AorB, null, 'V', [], V);
            }
            if (looksLikeMatrix(S)) {
                this.displayResult('SVD (S)', AorB, null, 'S', [], S);
            }
            if (looksLikeMatrix(U)) {
                this.displayResult('SVD (U)', AorB, null, 'U', [], U);
            }

            this.showArticle(meta.articleKey || meta.opName);
            return;
        }

        // ✅ Cholesky: allow multi-matrix output { L, Lt }
        if (action === 'cholesky' && result && typeof result === 'object' && !Array.isArray(result)) {
            const L = result.L;
            const Lt = result.Lt;

            const looksLikeMatrix = (M) => Array.isArray(M) && M.length && Array.isArray(M[0]);

            if (looksLikeMatrix(Lt)) {
                this.displayResult(
                    'Cholesky (Lᵀ)',
                    AorB,
                    null,
                    'Lᵀ',
                    [],
                    Lt
                );
            }
            if (looksLikeMatrix(L)) {
                this.displayResult(
                    'Cholesky (L)',
                    AorB,
                    null,
                    'L',
                    [],
                    L
                );
            }

            this.showArticle(meta.articleKey || meta.opName);
            return;
        }

        // ✅ Special case: LU Decomposition returns {P, L, U}
        if (action === 'lu-decomposition' && result && typeof result === 'object' && result.P && result.L && result.U) {
            this.displayResult(
                'LU Decomposition (U)',
                AorB,
                null,
                'U',
                [],
                result.U
            );

            this.displayResult(
                'LU Decomposition (L)',
                AorB,
                null,
                'L',
                [],
                result.L
            );

            this.displayResult(
                'LU Decomposition (P)',
                AorB,
                null,
                'P',
                [],
                result.P
            );

            this.showArticle(meta.articleKey || meta.opName || 'LU Decomposition');
            return;
        }

        const dims = this.getMatrixDimensions();
        const d = (useTarget === 'B') ? dims.B : dims.A;

        const processMatrix = (typeof mod.generateProcessMatrix === 'function')
            ? mod.generateProcessMatrix(AorB, d.rows, d.cols, value)
            : [];

        // ✅ 动态符号：让结果栏显示具体的 k / n
        let symbol = meta.symbol || '→';

        if (action === 'scalar-multiplication') {
            const k = (value ?? '').toString().trim() || '2';
            symbol = `× ${k}`;
        }

        if (action === 'power') {
            const n = (value ?? '').toString().trim() || '2';
            symbol = `^ ${n}`;
        }

        this.displayResult(
            meta.opName,
            AorB,
            null,
            symbol,
            processMatrix,
            result
        );
        this.scrollToResults();
        this.showArticle(meta.articleKey || meta.opName);
    }

    // =====================================================
    // ✅ 单矩阵操作分发
    // =====================================================
    handleSingleOperation(action, target, value = '') {
        // ✅ RREF：真正实现
        if (action === 'rref' && target === 'A') {
            this._showRrefPanel(true);

            if (this.rrefMode === 'equation') this.performRrefFromEquations();
            else this.performRrefFromMatrixA();
            return;
        }

        this.performUnaryCalculation(action, target, value)
            .catch(err => this.showError(resolveErrorMessage(err)));
    }

    // =====================================================
    // ✅ RREF Panel + Equation UI
    // =====================================================
    _initRrefPanel() {
        this.eqUI.ensureRrefPanelExists();

        const panel = document.getElementById('rref-panel');
        if (!panel) return;

        const matrixTab = panel.querySelector('[data-rref-mode="matrix"]');
        const eqTab = panel.querySelector('[data-rref-mode="equation"]');

        const calcBtn = panel.querySelector('#rref-calc-btn');
        const updateBtn = panel.querySelector('#rref-update-matrix-btn');
        const loadBtn = panel.querySelector('#rref-load-from-matrix-btn');

        if (matrixTab) {
            matrixTab.addEventListener('click', () => {
                this.rrefMode = 'matrix';
                this.eqUI.setMode('matrix');
            });
        }
        if (eqTab) {
            eqTab.addEventListener('click', () => {
                this.rrefMode = 'equation';
                this.eqUI.setMode('equation');
            });
        }

        if (!panel.dataset.rrefCalcBound) {
            panel.dataset.rrefCalcBound = '1';
            panel.addEventListener('click', (e) => {
                const calcBtn = e.target.closest('#rref-calc-btn');
                if (!calcBtn) return;
                if (this.rrefMode === 'equation') {
                    this.performRrefFromEquations();
                }
            });
        }

        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                const aug = this.eqUI.getAugmentedMatrixFromEquations();
                this._setMatrixAFromMatrix(aug);
                this.showArticle('RREF');
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const A = this.getAllMatrices()[0];
                this.eqUI.setEquationsFromAugmentedMatrix(A);
            });
        }

        this.eqUI.initEquationUI();
        this.eqUI.setMode('matrix');
        this._showRrefPanel(false);
    }

    _showRrefPanel(show) {
        const panel = document.getElementById('rref-panel');
        if (!panel) return;
        panel.style.display = show ? 'block' : 'none';
    }

    _setMatrixAFromMatrix(M) {
        const rows = M.length;
        const cols = (M[0] || []).length;

        this._adjustMatrixSize('a', rows, cols);

        const containerA = document.getElementById('matrix-container-a');
        if (!containerA) throw userError('ERR_MATRIX_A_CONTAINER_NOT_FOUND');

        const inputsA = containerA.querySelectorAll('.matrix input');
        const currentDims = this.getMatrixDimensions()?.A || { rows, cols };

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const idx = i * currentDims.cols + j;
                if (inputsA[idx]) inputsA[idx].value = M[i][j];
            }
        }

        this.updateMatrixDimensions('A', rows, cols);
    }

    _adjustMatrixSize(which, targetRows, targetCols) {
        const rowsSpan = document.getElementById(`rows-${which}`);
        const colsSpan = document.getElementById(`cols-${which}`);
        const incRows = document.getElementById(`increase-rows-${which}`);
        const decRows = document.getElementById(`decrease-rows-${which}`);
        const incCols = document.getElementById(`increase-cols-${which}`);
        const decCols = document.getElementById(`decrease-cols-${which}`);

        if (!rowsSpan || !colsSpan) return;

        let curRows = parseInt(rowsSpan.textContent, 10);
        let curCols = parseInt(colsSpan.textContent, 10);

        while (curRows < targetRows && incRows) { incRows.click(); curRows++; }
        while (curRows > targetRows && decRows) { decRows.click(); curRows--; }

        while (curCols < targetCols && incCols) { incCols.click(); curCols++; }
        while (curCols > targetCols && decCols) { decCols.click(); curCols--; }
    }

    swapMatrices() {
        try {
            const dims = this.getMatrixDimensions();

            const containerA = document.getElementById('matrix-container-a');
            const containerB = document.getElementById('matrix-container-b');
            const inputsA = containerA.querySelectorAll('.matrix input');
            const inputsB = containerB.querySelectorAll('.matrix input');

            const minRows = Math.min(dims.A.rows, dims.B.rows);
            const minCols = Math.min(dims.A.cols, dims.B.cols);

            for (let i = 0; i < minRows; i++) {
                for (let j = 0; j < minCols; j++) {
                    const indexA = i * dims.A.cols + j;
                    const indexB = i * dims.B.cols + j;
                    if (inputsA[indexA] && inputsB[indexB]) {
                        const temp = inputsA[indexA].value;
                        inputsA[indexA].value = inputsB[indexB].value;
                        inputsB[indexB].value = temp;
                    }
                }
            }

            this.updateMatrixDimensions('A', dims.B.rows, dims.B.cols);
            this.updateMatrixDimensions('B', dims.A.rows, dims.A.cols);

        } catch (error) {
            console.error('Error swapping matrices:', error);
            this.showError(resolveErrorMessage(userError('ERR_SWAP_MATRICES_FAILED')));
        }
    }

    updateMatrixDimensions(matrixId, rows, cols) {
        const rowsElement = document.getElementById(`rows-${matrixId.toLowerCase()}`);
        const colsElement = document.getElementById(`cols-${matrixId.toLowerCase()}`);
        const dimElement = document.getElementById(`dim-${matrixId.toLowerCase()}`);

        if (rowsElement) rowsElement.textContent = rows;
        if (colsElement) colsElement.textContent = cols;
        if (dimElement) dimElement.textContent = `(${rows}×${cols})`;
    }

    clearAllResults() {
        const resultHistory = document.getElementById('result-history');
        if (resultHistory) resultHistory.innerHTML = '';
    }

    // ✅ 新增滚动函数：将结果容器平滑滚动到可视区域
    scrollToResults() {
        const el = document.getElementById('result-container');
        if (!el) return;

        setTimeout(() => {
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 80);
    }

    initializeUIComponents() {
        this.initLanguageSelector();
        this.initPoll();
    }

    initializeFormatSelector() {
        if (this.setupFormatSelector) this.setupFormatSelector();
    }

    setupGlobalFunctions() {
        window.calculateMultiplication = () => {
            this.currentOperation = 'Multiplication';
            this.performBinaryCalculation('Multiplication');
        };
    }

    initLanguageSelector() {
        const languageToggle = document.querySelector('.language-toggle');
        const languageDropdown = document.querySelector('.language-dropdown');
        const languageOptions = document.querySelectorAll('.language-option');

        if (languageToggle && languageDropdown) {
            languageToggle.addEventListener('click', function (e) {
                e.stopPropagation();
                languageDropdown.classList.toggle('active');
            });

            languageOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    const lang = option.getAttribute('data-lang');
                    this.switchLanguage(lang);
                    languageDropdown.classList.remove('active');
                });
            });

            document.addEventListener('click', () => {
                languageDropdown.classList.remove('active');
            });
        }
    }

    switchLanguage(lang) {
        let path = window.location.pathname;
        let parts = path.split("/").filter(part => part !== "");

        if (parts.length === 0) {
            window.location.href = `/${lang}/index.html`;
            return;
        }

        parts[0] = lang;
        let newPath = "/" + parts.join("/");
        window.location.href = newPath;
    }

    initPoll() {
        const yesBtn = document.querySelector('.question-box .yes');
        const noBtn = document.querySelector('.question-box .no');
        const response = document.getElementById('response');

        if (yesBtn && noBtn && response) {
            yesBtn.addEventListener('click', () => {
                response.innerHTML = '';

                const text = document.createElement('span');
                text.textContent = "Nice! Let's make it happen ";

                const gameButton = document.createElement('a');
                gameButton.href = 'https://www.nd-ed.org/matrix-multiplication-by-2-game.html';
                gameButton.target = '_blank';
                gameButton.rel = 'noopener noreferrer';
                gameButton.textContent = '🎮 Play Now';
                gameButton.classList.add('game-link-button');

                response.appendChild(text);
                response.appendChild(gameButton);
                response.classList.add('show');
            });

            noBtn.addEventListener('click', () => {
                response.textContent = "Run while you can! Matrix's on its way 🏃‍♂️💨";
                response.classList.add('show');
            });
        }
    }

    showArticle(articleKey) {
        const container = document.getElementById('article-container');
        if (!container) return;

        const articles = container.querySelectorAll('[data-article]');
        if (!articles.length) return;

        let hasTarget = false;
        articles.forEach(el => {
            if (el.getAttribute('data-article') === articleKey) hasTarget = true;
        });

        const target = hasTarget ? articleKey : 'intro';
        articles.forEach(el => {
            el.style.display = (el.getAttribute('data-article') === target) ? 'block' : 'none';
        });
    }

    _autoRunFromLocalStorage() {
        try {
            const raw = localStorage.getItem('matrixcalcu_state_v1');
            if (!raw) return;

            const state = JSON.parse(raw);
            const op = state?.op;
            if (!op) return;

            const mapBinary = {
                multiply: 'Multiplication',
                add: 'Addition',
                subtract: 'Subtraction',
                augmented: 'Augmented',
                kronecker: 'Kronecker Product',
                'kronecker-product': 'Kronecker Product'
            };

            if (mapBinary[op]) {
                const opName = mapBinary[op];
                this.currentOperation = opName;
                this.performBinaryCalculation(opName);
                this.showArticle(opName);
                this.scrollToResults(); // ✅ 添加滚动
                return;
            }

            if (op === 'rref') {
                this._showRrefPanel(true);
                if (this.rrefMode === 'equation') this.performRrefFromEquations();
                else this.performRrefFromMatrixA();
                this.showArticle('RREF');
                this.scrollToResults(); // ✅ 添加滚动
                return;
            }

            if (op === 'scalar-multiplication') {
                const k = (state.k ?? '2').toString();
                const el = document.getElementById('mBy-a-val');
                if (el) el.value = k;

                this.handleSingleOperation('scalar-multiplication', state.target || 'A', k);
                this.showArticle('Scalar Multiplication');
                this.scrollToResults(); // ✅ 添加滚动
                return;
            }

            if (op === 'power') {
                const n = (state.n ?? '2').toString();
                const el = document.getElementById('pow-a-val');
                if (el) el.value = n;

                this.handleSingleOperation('power', state.target || 'A', n);
                this.showArticle('Power');
                this.scrollToResults(); // ✅ 添加滚动
                return;
            }

            const reg = this._getSingleOpRegistry();
            if (reg[op]) {
                // ✅ Root fix: auto-run should not trust stale state.target
                const target = reg[op]?.targetDefault || 'A';
                const value = state?.value || '';
                this.performUnaryCalculation(op, target, value)
                    .then(() => this.scrollToResults()) // ✅ 添加滚动
                    .catch(err => this.showError(resolveErrorMessage(err)));
                return;
            }
        } catch (e) {
            console.warn('AutoRun: invalid matrixcalcu_state_v1');
        }
    }

    _wrapDisplayResult(originalDisplayResult) {
        return (operationName, A, B, symbol, processOrSteps, result) => {
            const safeProcess = (processOrSteps == null) ? [] : processOrSteps;
            originalDisplayResult(operationName, A, B, symbol, Array.isArray(safeProcess) ? safeProcess : [], result);

            // =========================
            // RREF steps
            // =========================
            if (operationName === 'RREF') {
                const t = getStepText('rref');
                if (!Array.isArray(processOrSteps) || !processOrSteps.length) return;

                const first = processOrSteps[0];
                const isSteps = first && typeof first === 'object' && (first.matrix || first.label);
                if (!isSteps) return;

                const history = document.getElementById('result-history');
                if (!history || !history.firstElementChild) return;

                const card = history.firstElementChild;
                const finalResultContainer = card.querySelector('.final-result-container');
                if (finalResultContainer && !card.querySelector('.eigen-steps-toggle-btn')) {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'eigen-steps-toggle-btn';
                    btn.textContent = t.showSteps || 'Show Steps';

                    btn.style.marginLeft = '10px';
                    btn.style.padding = '6px 12px';
                    btn.style.border = '1px solid rgba(0,0,0,0.12)';
                    btn.style.borderRadius = '8px';
                    btn.style.background = '#f5f8fc';
                    btn.style.color = '#24476b';
                    btn.style.cursor = 'pointer';
                    btn.style.fontWeight = '600';
                    btn.style.fontSize = '14px';
                    btn.style.whiteSpace = 'nowrap';

                    finalResultContainer.appendChild(btn);
                }

                if (this._isEquationPage()) {
                    this._appendEquationSummary(card, result);
                }
                if (card.querySelector('.rref-steps-container')) return;

                const wrap = document.createElement('div');
                wrap.className = 'rref-steps-container';
                wrap.style.display = 'none';
                wrap.style.marginTop = '12px';
                wrap.style.padding = '12px';
                wrap.style.border = '1px solid rgba(0,0,0,0.08)';
                wrap.style.borderRadius = '10px';
                wrap.style.background = '#fffdf4';

                const title = document.createElement('div');
                title.textContent = t.stepsTitle;
                title.style.fontWeight = '700';
                title.style.marginBottom = '8px';
                wrap.appendChild(title);

                processOrSteps.forEach((step, idx) => {
                    const item = document.createElement('details');
                    item.style.margin = '8px 0';
                    if (idx === 0) item.open = true;

                    const summary = document.createElement('summary');
                    summary.style.cursor = 'pointer';
                    summary.style.fontWeight = '600';
                    summary.textContent = step.label
                        ? `${t.step(idx + 1)}: ${step.label}`
                        : t.step(idx + 1);
                    item.appendChild(summary);

                    const table = document.createElement('table');
                    table.style.borderCollapse = 'collapse';
                    table.style.marginTop = '8px';

                    const mat = step.matrix || [];
                    mat.forEach(row => {
                        const tr = document.createElement('tr');
                        row.forEach(cell => {
                            const td = document.createElement('td');
                            td.style.border = '1px solid rgba(0,0,0,0.08)';
                            td.style.padding = '6px 10px';
                            td.style.minWidth = '44px';
                            td.style.textAlign = 'center';
                            td.textContent = this._formatCell(cell);
                            tr.appendChild(td);
                        });
                        table.appendChild(tr);
                    });

                    item.appendChild(table);
                    wrap.appendChild(item);
                });

                card.appendChild(wrap);

                const toggleBtn = card.querySelector('.eigen-steps-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.onclick = () => {
                        const isHidden = wrap.style.display === 'none';
                        wrap.style.display = isHidden ? 'block' : 'none';
                        toggleBtn.textContent = isHidden
                            ? (t.hideSteps || 'Hide Steps')
                            : (t.showSteps || 'Show Steps');
                    };
                }

                return;
            }

            // =========================
            // Eigenvectors steps
            // =========================
            if (operationName === 'Eigenvectors') {
                const t = getStepText('eigenvectors');
                if (!Array.isArray(processOrSteps) || !processOrSteps.length) return;

                const history = document.getElementById('result-history');
                if (!history || !history.firstElementChild) return;

                const card = history.firstElementChild;
                if (card.querySelector('.eigen-steps-container')) return;

                // ===== 单独按钮条：放在卡片底部步骤区前面，最稳 =====
                const btnBar = document.createElement('div');
                btnBar.className = 'eigen-steps-btnbar';
                btnBar.style.marginTop = '12px';
                btnBar.style.marginBottom = '8px';

                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'eigen-steps-toggle-btn';
                toggleBtn.textContent = t.showSteps;

                toggleBtn.style.padding = '6px 12px';
                toggleBtn.style.border = '1px solid rgba(0,0,0,0.12)';
                toggleBtn.style.borderRadius = '8px';
                toggleBtn.style.background = '#f5f8fc';
                toggleBtn.style.color = '#24476b';
                toggleBtn.style.cursor = 'pointer';
                toggleBtn.style.fontWeight = '600';
                toggleBtn.style.fontSize = '14px';
                toggleBtn.style.whiteSpace = 'nowrap';

                btnBar.appendChild(toggleBtn);

                const wrap = document.createElement('div');
                wrap.className = 'eigen-steps-container';
                wrap.style.display = 'none';
                wrap.style.marginTop = '12px';
                wrap.style.padding = '12px';
                wrap.style.border = '1px solid rgba(0,0,0,0.08)';
                wrap.style.borderRadius = '10px';
                wrap.style.background = '#f8fbff';

                const title = document.createElement('div');
                title.textContent = t.stepsTitle;
                title.style.fontWeight = '700';
                title.style.marginBottom = '8px';
                wrap.appendChild(title);

                processOrSteps.forEach((step) => {
                    if (step.type === 'section') {
                        const h = document.createElement('div');
                        h.textContent = step.title;
                        h.style.fontWeight = '700';
                        h.style.marginTop = '10px';
                        wrap.appendChild(h);
                        return;
                    }

                    if (step.type === 'subsection') {
                        const h = document.createElement('div');
                        h.textContent = step.title;
                        h.style.fontWeight = '600';
                        h.style.marginTop = '6px';
                        wrap.appendChild(h);
                        return;
                    }

                    if (step.type === 'text' || step.type === 'formula') {
                        const p = document.createElement('div');
                        p.textContent = step.text;
                        p.style.margin = '4px 0';
                        wrap.appendChild(p);
                        return;
                    }

                    if (step.type === 'matrix') {
                        const label = document.createElement('div');
                        label.textContent = step.label;
                        label.style.marginTop = '6px';
                        wrap.appendChild(label);

                        const table = document.createElement('table');
                        table.style.borderCollapse = 'collapse';
                        table.style.marginTop = '6px';

                        step.matrix.forEach(row => {
                            const tr = document.createElement('tr');
                            row.forEach(cell => {
                                const td = document.createElement('td');
                                td.style.border = '1px solid rgba(0,0,0,0.08)';
                                td.style.padding = '6px 10px';
                                td.style.minWidth = '44px';
                                td.style.textAlign = 'center';
                                td.textContent = this._formatCell(cell);
                                tr.appendChild(td);
                            });
                            table.appendChild(tr);
                        });

                        wrap.appendChild(table);
                        return;
                    }

                    if (step.type === 'vector') {
                        const v = document.createElement('div');
                        v.style.marginTop = '6px';
                        v.textContent = `${step.label}: [${step.vector.map(x => this._formatCell(x)).join(', ')}]`;
                        wrap.appendChild(v);
                    }
                });

                toggleBtn.onclick = () => {
                    const isHidden = wrap.style.display === 'none';
                    wrap.style.display = isHidden ? 'block' : 'none';
                    toggleBtn.textContent = isHidden ? t.hideSteps : t.showSteps;
                };

                card.appendChild(btnBar);
                card.appendChild(wrap);
                return;
            }
        };
    }
    _isEquationPage() {
        return window.PAGE_MODE === 'equation' ||
            window.location.pathname.includes('matrix-equations-calculator.html');
    }

    _appendEquationSummary(card, rrefMatrix) {
        if (!card || card.querySelector('.equation-solution-summary')) return;
        if (!this.equations || typeof this.equations.generateSolutionSummary !== 'function') return;

        const summary = this.equations.generateSolutionSummary(rrefMatrix);

        const wrap = document.createElement('div');
        wrap.className = 'eigen-steps-container';
        wrap.style.display = 'none';
        wrap.style.marginTop = '12px';
        wrap.style.padding = '12px';
        wrap.style.border = '1px solid rgba(0,0,0,0.08)';
        wrap.style.borderRadius = '10px';
        wrap.style.background = '#f7fbff';

        const title = document.createElement('div');
        title.textContent = summary.title || 'Solution Summary';
        title.style.fontWeight = '700';
        title.style.marginBottom = '8px';
        wrap.appendChild(title);

        (summary.lines || []).forEach(text => {
            const line = document.createElement('div');
            line.textContent = text;
            line.style.margin = '4px 0';
            wrap.appendChild(line);
        });

        const steps = card.querySelector('.rref-steps-container');
        if (steps) {
            card.insertBefore(wrap, steps);
        } else {
            card.appendChild(wrap);
        }
    }
    _formatCell(v) {
        try { return math.format(v); } catch { return String(v); }
    }
}
