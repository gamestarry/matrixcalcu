(function (root) {
    "use strict";

    const MODE_EQUATION = "equation";
    const MODE_AB = "ab";
    const MODE_AUGMENTED = "augmented";
    const DEFAULT_VARIABLES = ["x", "y", "z", "w", "u", "v", "t", "s", "r", "q", "p", "k", "m", "n"];

    const MESSAGES = {
        panelTitle: "Solve a System of Linear Equations",
        abTitle: "Solve A x = b",
        coefficientHint: "Matrix A contains the coefficients.",
        constantsHint: "Matrix b contains the constants and must be a single-column vector.",
        abSolve: "Solve A x = b",
        abResultTitle: "Cannot solve A x = b",
        resultStatus: "Input error",
        notCalculated: "This attempt was not calculated.",
        ready: "Ready to solve A x = b.",
        useControls: "Use the existing Matrix B column controls to set b to one column.",
        setBColumn: "Set Matrix B to one column, then try again.",
        matchRows: "Make the number of rows in A and b match, then try again.",
        missingDimensions: "Matrix dimensions are not available yet.",
        emptyMatrix: "Matrix A and vector b must contain at least one row.",
        rowMismatch: "Matrix A and vector b must have the same number of rows.",
        bSingleColumn: "Vector b must have exactly one column.",
        invalidMatrix: "Matrix A and vector b must contain valid finite values.",
        underdetermined: "This system has fewer equations than variables, so the summary may show free variables.",
        overdetermined: "This system has more equations than variables, so RREF will check whether the equations are consistent.",
        augmentedTab: "Augmented Matrix",
        augmentedTitle: "Solve from an Augmented Matrix",
        augmentedHint1: "Enter the full augmented matrix [A|b].",
        augmentedHint2: "The last column is the constants column b.",
        augmentedHint3: "All preceding columns contain the coefficients.",
        augmentedHint4: "The number of variables equals the number of columns minus one.",
        augmentedSolve: "Solve Augmented Matrix",
        augmentedResultTitle: "Cannot solve the augmented matrix",
        augmentedReady: "Ready to solve.",
        augmentedFinalColumn: "The final column is b.",
        augmentedMinColumns: "At least two columns are required: one variable column and one constants column.",
        augmentedUnreadable: "The augmented matrix could not be read.",
        augmentedInvalidEntries: "One or more entries in the augmented matrix are invalid.",
        augmentedAddColumn: "Add at least one more column, then try again.",
        augmentedCheckDimensions: "Check the matrix dimensions and try again.",
        augmentedCheckEntries: "Check the entries and try again."
    };

    let currentMode = MODE_EQUATION;
    let optionsRef = {};
    let panelRef = null;
    let matrixTabRef = null;
    let equationTabRef = null;
    let augmentedTabRef = null;
    let statusRef = null;
    let augmentedStatusRef = null;
    let labelState = null;
    let observerRef = null;
    let matrixObserverRef = null;
    let initialized = false;
    let autoInitStarted = false;
    let autoObserverRef = null;

    function isEquationPage() {
        if (!root || root.PAGE_MODE !== "equation" || !root.document) return false;
        const lang = (root.document.documentElement && root.document.documentElement.lang || "").toLowerCase();
        const path = root.location && root.location.pathname || "";
        return lang.startsWith("en") || path.indexOf("/en/matrix-equations-calculator") !== -1;
    }

    function dimensionsFromShape(A, b) {
        return {
            A: { rows: Array.isArray(A) ? A.length : 0, cols: Array.isArray(A) && Array.isArray(A[0]) ? A[0].length : 0 },
            B: { rows: Array.isArray(b) ? b.length : 0, cols: Array.isArray(b) && Array.isArray(b[0]) ? b[0].length : 0 }
        };
    }

    function normalizeDimensions(dimensions) {
        const dims = dimensions || {};
        return {
            rowsA: Number(dims.A && dims.A.rows) || 0,
            colsA: Number(dims.A && dims.A.cols) || 0,
            rowsB: Number(dims.B && dims.B.rows) || 0,
            colsB: Number(dims.B && dims.B.cols) || 0
        };
    }

    function normalizeAugmentedDimensions(dimensions) {
        const meta = normalizeDimensions(dimensions);
        const variableCount = Math.max(0, meta.colsA - 1);
        const equationCount = meta.rowsA;
        return Object.assign({}, meta, {
            variableCount,
            equationCount,
            isUnderdetermined: equationCount > 0 && variableCount > 0 && equationCount < variableCount,
            isOverdetermined: equationCount > 0 && variableCount > 0 && equationCount > variableCount
        });
    }

    function makeResult(ok, code, message, meta) {
        const base = meta || {};
        return Object.assign({
            ok,
            code,
            message,
            messages: message ? [message] : []
        }, base);
    }

    function validateDimensions(dimensions) {
        const meta = normalizeDimensions(dimensions);
        const variableCount = meta.colsA;
        const equationCount = meta.rowsA;
        const next = Object.assign({}, meta, {
            variableCount,
            equationCount,
            isUnderdetermined: equationCount > 0 && variableCount > 0 && equationCount < variableCount,
            isOverdetermined: equationCount > 0 && variableCount > 0 && equationCount > variableCount
        });

        if (!meta.rowsA || !meta.colsA || !meta.rowsB || !meta.colsB) {
            return makeResult(false, "missing-dimensions", MESSAGES.missingDimensions, next);
        }
        if (meta.rowsA < 1 || meta.colsA < 1 || meta.rowsB < 1) {
            return makeResult(false, "empty-matrix", MESSAGES.emptyMatrix, next);
        }
        const issues = [];
        if (meta.rowsA !== meta.rowsB) {
            issues.push(MESSAGES.rowMismatch);
        }
        if (meta.colsB !== 1) {
            issues.push(MESSAGES.bSingleColumn);
        }
        if (issues.length) {
            const code = issues.length > 1 ? "multiple-dimension-errors" : (meta.rowsA !== meta.rowsB ? "row-mismatch" : "b-column-count");
            return Object.assign(makeResult(false, code, issues[0], next), { messages: issues });
        }

        const messages = [MESSAGES.ready];
        if (next.isUnderdetermined) messages.push(MESSAGES.underdetermined);
        if (next.isOverdetermined) messages.push(MESSAGES.overdetermined);
        return Object.assign(makeResult(true, "ok", MESSAGES.ready, next), { messages });
    }

    function validateAugmentedDimensions(dimensions) {
        const next = normalizeAugmentedDimensions(dimensions);

        if (!next.rowsA || !next.colsA) {
            return makeResult(false, "missing-augmented-dimensions", MESSAGES.augmentedUnreadable, next);
        }
        if (next.rowsA < 1 || next.colsA < 2) {
            return makeResult(false, "augmented-column-count", MESSAGES.augmentedMinColumns, next);
        }

        const messages = [
            `Augmented matrix: ${next.rowsA} x ${next.colsA}`,
            `${next.equationCount} ${next.equationCount === 1 ? "equation" : "equations"} in ${next.variableCount} ${next.variableCount === 1 ? "variable" : "variables"}.`,
            MESSAGES.augmentedFinalColumn
        ];

        if (next.isUnderdetermined) {
            messages.push("This is an underdetermined system.");
            messages.push("It may have no solution or infinitely many solutions.");
        } else if (next.isOverdetermined) {
            messages.push("This is an overdetermined system.");
        } else {
            messages.push(MESSAGES.augmentedReady);
        }

        return Object.assign(makeResult(true, "ok", MESSAGES.augmentedReady, next), { messages });
    }

    function isFiniteMatrixValue(value) {
        if (value == null) return false;
        if (typeof value === "number") return Number.isFinite(value);
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return true;
            if (/infinity|nan/i.test(trimmed)) return false;
            return true;
        }
        if (typeof value === "object") {
            if (typeof value.s === "number" && typeof value.n === "number" && typeof value.d === "number") {
                return Number.isFinite(value.s) && Number.isFinite(value.n) && Number.isFinite(value.d) && value.d !== 0;
            }
            if (typeof value.valueOf === "function") {
                const primitive = value.valueOf();
                if (typeof primitive === "number") return Number.isFinite(primitive);
            }
        }
        return true;
    }

    function validateMatrixValues(A, b) {
        const allRows = []
            .concat(Array.isArray(A) ? A : [])
            .concat(Array.isArray(b) ? b : []);
        return allRows.every(row => Array.isArray(row) && row.every(isFiniteMatrixValue));
    }

    function isRectangularMatrix(matrix, columns) {
        return Array.isArray(matrix) && matrix.every(row => Array.isArray(row) && row.length === columns);
    }

    function hasInvalidRawEntries(matrixId) {
        const container = root.document && root.document.getElementById(`matrix-container-${matrixId.toLowerCase()}`);
        if (!container || typeof math === "undefined" || !math.fraction) return false;
        return Array.from(container.querySelectorAll(".matrix input")).some(input => {
            const raw = (input.value == null ? "" : String(input.value)).trim();
            if (!raw) return false;
            const lower = raw.toLowerCase();
            if (lower === "pi" || lower === "e") return false;
            if (/infinity|nan/i.test(raw)) return true;
            try {
                math.fraction(raw);
                return false;
            } catch (error) {
                return true;
            }
        });
    }

    function buildAugmentedMatrix(A, b) {
        const validation = validateDimensions(dimensionsFromShape(A, b));
        if (!validation.ok) throw new Error(validation.message);
        if (!isRectangularMatrix(A, validation.colsA) || !isRectangularMatrix(b, 1)) {
            throw new Error(MESSAGES.invalidMatrix);
        }
        if (!validateMatrixValues(A, b)) throw new Error(MESSAGES.invalidMatrix);

        return A.map((row, index) => row.slice().concat([b[index][0]]));
    }

    function readAugmentedMatrix(A, dimensions) {
        const validation = validateAugmentedDimensions(dimensions || dimensionsFromShape(A, []));
        if (!validation.ok) throw new Error(validation.message);
        if (!isRectangularMatrix(A, validation.colsA)) throw new Error(MESSAGES.augmentedUnreadable);
        if (!validateMatrixValues(A, [])) throw new Error(MESSAGES.augmentedInvalidEntries);
        if (hasInvalidRawEntries("A")) throw new Error(MESSAGES.augmentedInvalidEntries);
        return A.map(row => row.slice());
    }

    function getVariableNames(count) {
        const size = Math.max(0, Number(count) || 0);
        return Array.from({ length: size }, (_, index) => DEFAULT_VARIABLES[index] || `x${index + 1}`);
    }

    function createText(tagName, className, text) {
        const node = root.document.createElement(tagName);
        if (className) node.className = className;
        node.textContent = text;
        return node;
    }

    function buildAbPanel() {
        const section = root.document.getElementById("rref-matrix-mode");
        if (!section || section.dataset.abModeMounted === "1") return;

        section.dataset.abModeMounted = "1";
        section.classList.add("linear-system-input-mode", "linear-system-ab");
        section.replaceChildren();

        const abPanel = root.document.createElement("div");
        abPanel.id = "linear-system-ab-panel";
        abPanel.appendChild(createText("div", "linear-system-ab-title", MESSAGES.abTitle));
        abPanel.appendChild(createText("p", "linear-system-ab-text", MESSAGES.coefficientHint));
        abPanel.appendChild(createText("p", "linear-system-ab-text", MESSAGES.constantsHint));

        statusRef = createText("div", "linear-system-ab-status", "");
        statusRef.id = "linear-system-ab-status";
        statusRef.setAttribute("role", "status");
        statusRef.setAttribute("aria-live", "polite");
        abPanel.appendChild(statusRef);

        const actions = root.document.createElement("div");
        actions.className = "linear-system-ab-actions";

        const solve = root.document.createElement("button");
        solve.type = "button";
        solve.id = "linear-system-ab-solve-btn";
        solve.className = "linear-system-ab-solve";
        solve.textContent = MESSAGES.abSolve;
        solve.addEventListener("click", () => {
            if (typeof optionsRef.solve === "function") optionsRef.solve();
        });
        actions.appendChild(solve);
        abPanel.appendChild(actions);
        section.appendChild(abPanel);

        const augmentedPanel = root.document.createElement("div");
        augmentedPanel.id = "linear-system-augmented-panel";
        augmentedPanel.className = "linear-system-augmented";
        augmentedPanel.hidden = true;
        augmentedPanel.appendChild(createText("div", "linear-system-ab-title", MESSAGES.augmentedTitle));
        [MESSAGES.augmentedHint1, MESSAGES.augmentedHint2, MESSAGES.augmentedHint3, MESSAGES.augmentedHint4].forEach(text => {
            augmentedPanel.appendChild(createText("p", "linear-system-ab-text", text));
        });

        augmentedStatusRef = createText("div", "linear-system-ab-status linear-system-augmented-status", "");
        augmentedStatusRef.id = "linear-system-augmented-status";
        augmentedStatusRef.setAttribute("role", "status");
        augmentedStatusRef.setAttribute("aria-live", "polite");
        augmentedPanel.appendChild(augmentedStatusRef);

        const augmentedActions = root.document.createElement("div");
        augmentedActions.className = "linear-system-ab-actions";

        const augmentedSolve = root.document.createElement("button");
        augmentedSolve.type = "button";
        augmentedSolve.id = "linear-system-augmented-solve-btn";
        augmentedSolve.className = "linear-system-ab-solve";
        augmentedSolve.textContent = MESSAGES.augmentedSolve;
        augmentedSolve.addEventListener("click", () => {
            if (typeof optionsRef.solveAugmented === "function") optionsRef.solveAugmented();
        });
        augmentedActions.appendChild(augmentedSolve);
        augmentedPanel.appendChild(augmentedActions);
        section.appendChild(augmentedPanel);
    }

    function updatePanelTitle() {
        if (!panelRef || panelRef.dataset.abTitleUpdated === "1") return;
        const title = panelRef.firstElementChild && panelRef.firstElementChild.firstElementChild;
        if (title) {
            title.textContent = MESSAGES.panelTitle;
            panelRef.dataset.abTitleUpdated = "1";
        }
    }

    function setTabState() {
        if (matrixTabRef) {
            matrixTabRef.textContent = "A and b";
            matrixTabRef.setAttribute("role", "tab");
            matrixTabRef.setAttribute("aria-selected", currentMode === MODE_AB ? "true" : "false");
            setInlineTabStyle(matrixTabRef, currentMode === MODE_AB);
        }
        if (equationTabRef) {
            equationTabRef.textContent = "Equations";
            equationTabRef.setAttribute("role", "tab");
            equationTabRef.setAttribute("aria-selected", currentMode === MODE_EQUATION ? "true" : "false");
            setInlineTabStyle(equationTabRef, currentMode === MODE_EQUATION);
        }
        if (augmentedTabRef) {
            augmentedTabRef.setAttribute("role", "tab");
            augmentedTabRef.setAttribute("aria-selected", currentMode === MODE_AUGMENTED ? "true" : "false");
            setInlineTabStyle(augmentedTabRef, currentMode === MODE_AUGMENTED);
        }
        const group = matrixTabRef && matrixTabRef.parentElement;
        if (group) {
            group.setAttribute("role", "tablist");
            group.classList.add("linear-system-mode-tabs");
        }
    }

    function setInlineTabStyle(button, selected) {
        if (!button) return;
        button.style.background = selected ? "#0b69ff" : "#fff";
        button.style.color = selected ? "#fff" : "#111827";
        button.style.borderColor = selected ? "#0b69ff" : "rgba(0,0,0,0.12)";
    }

    function ensureAugmentedTab() {
        const group = matrixTabRef && matrixTabRef.parentElement;
        if (!group) return;
        augmentedTabRef = group.querySelector('[data-rref-mode="augmented"]');
        if (augmentedTabRef) return;
        augmentedTabRef = root.document.createElement("button");
        augmentedTabRef.type = "button";
        augmentedTabRef.dataset.rrefMode = "augmented";
        augmentedTabRef.textContent = MESSAGES.augmentedTab;
        const source = matrixTabRef || equationTabRef;
        if (source) {
            augmentedTabRef.style.cssText = source.style.cssText;
        }
        group.appendChild(augmentedTabRef);
    }

    function replaceLabelText(label, text) {
        if (!label) return;
        const dimension = label.querySelector(".matrix-dimension");
        label.textContent = text + " ";
        if (dimension) label.appendChild(dimension);
    }

    function updateMatrixLabels() {
        const labelA = root.document.querySelector("#controls-a .matrix-label");
        const labelB = root.document.querySelector("#controls-b .matrix-label");

        if (!labelState) {
            labelState = {
                a: labelA ? (labelA.childNodes[0] && labelA.childNodes[0].textContent ? labelA.childNodes[0].textContent : "A ") : "A ",
                b: labelB ? (labelB.childNodes[0] && labelB.childNodes[0].textContent ? labelB.childNodes[0].textContent : "B ") : "B "
            };
        }

        if (currentMode === MODE_AB) {
            replaceLabelText(labelA, "Coefficient Matrix A");
            replaceLabelText(labelB, "Vector b");
        } else if (currentMode === MODE_AUGMENTED) {
            replaceLabelText(labelA, "Augmented Matrix [A|b]");
            replaceLabelText(labelB, "Vector b");
        } else {
            replaceLabelText(labelA, (labelState.a || "A").trim());
            replaceLabelText(labelB, (labelState.b || "B").trim());
        }
    }

    function setPanelVisibility() {
        const abPanel = root.document.getElementById("linear-system-ab-panel");
        const augmentedPanel = root.document.getElementById("linear-system-augmented-panel");
        if (abPanel) abPanel.hidden = currentMode !== MODE_AB;
        if (augmentedPanel) augmentedPanel.hidden = currentMode !== MODE_AUGMENTED;
    }

    function setMatrixAreaVisibility() {
        const matrixB = root.document.getElementById("matrix-area-b");
        const swap = root.document.querySelector(".swap-mid-col");
        const hidden = currentMode === MODE_AUGMENTED;
        if (matrixB) matrixB.hidden = hidden;
        if (swap) swap.hidden = hidden;
    }

    function updateAugmentedColumnMarkers() {
        const container = root.document.getElementById("matrix-container-a");
        if (!container) return;
        const inputs = Array.from(container.querySelectorAll(".matrix input"));
        inputs.forEach(input => input.classList.remove("linear-system-augmented-divider"));
        if (currentMode !== MODE_AUGMENTED) return;
        const dims = normalizeAugmentedDimensions(getCurrentDimensions());
        if (dims.colsA < 2) return;
        inputs.forEach((input, index) => {
            if (index % dims.colsA === dims.colsA - 1) {
                input.classList.add("linear-system-augmented-divider");
            }
        });
    }

    function getCurrentDimensions() {
        if (typeof optionsRef.getDimensions === "function") return optionsRef.getDimensions();
        return null;
    }

    function renderDimensionStatus(validation) {
        if (!statusRef) statusRef = root.document.getElementById("linear-system-ab-status");
        if (!statusRef) return null;

        const result = validation || validateDimensions(getCurrentDimensions());
        statusRef.classList.toggle("is-error", !result.ok);
        statusRef.classList.toggle("is-ready", !!result.ok);
        statusRef.replaceChildren();

        const dims = createText("div", "linear-system-ab-dims", `A: ${result.rowsA || 0} x ${result.colsA || 0}; b: ${result.rowsB || 0} x ${result.colsB || 0}`);
        statusRef.appendChild(dims);

        result.messages.forEach(message => {
            statusRef.appendChild(createText("div", "linear-system-ab-message", message));
        });

        if (!result.ok && result.messages.includes(MESSAGES.bSingleColumn)) {
            statusRef.appendChild(createText("div", "linear-system-ab-help", MESSAGES.useControls));
        }

        return result;
    }

    function renderAugmentedDimensionStatus(validation) {
        if (!augmentedStatusRef) augmentedStatusRef = root.document.getElementById("linear-system-augmented-status");
        if (!augmentedStatusRef) return null;

        const result = validation || validateAugmentedDimensions(getCurrentDimensions());
        augmentedStatusRef.classList.toggle("is-error", !result.ok);
        augmentedStatusRef.classList.toggle("is-ready", !!result.ok);
        augmentedStatusRef.replaceChildren();

        if (!result.ok) {
            augmentedStatusRef.appendChild(createText("div", "linear-system-ab-dims", `Augmented matrix: ${result.rowsA || 0} x ${result.colsA || 0}`));
            result.messages.forEach(message => {
                augmentedStatusRef.appendChild(createText("div", "linear-system-ab-message", message));
            });
            return result;
        }

        result.messages.forEach((message, index) => {
            augmentedStatusRef.appendChild(createText("div", index === 0 ? "linear-system-ab-dims" : "linear-system-ab-message", message));
        });
        return result;
    }

    function renderError(message, dimensions) {
        const meta = normalizeDimensions(dimensions || getCurrentDimensions());
        return renderDimensionStatus(Object.assign(
            makeResult(false, "input-error", message || MESSAGES.invalidMatrix, meta),
            {
                variableCount: meta.colsA,
                equationCount: meta.rowsA,
                isUnderdetermined: false,
                isOverdetermined: false
            }
        ));
    }

    function appendValidationResult(errorData) {
        if (!root.document) return null;

        const resultHistory = root.document.getElementById("result-history");
        if (!resultHistory) return null;

        const data = errorData || {};
        const dimensions = normalizeDimensions(data.dimensions);
        const sourceMode = data.sourceMode || MODE_AB;
        const messages = Array.isArray(data.messages) && data.messages.length
            ? data.messages
            : [data.message || MESSAGES.invalidMatrix];

        const resultBlock = root.document.createElement("div");
        resultBlock.id = `linear-system-ab-error-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        resultBlock.classList.add("result-block", "linear-system-ab-result-error");

        const topControls = root.document.createElement("div");
        topControls.classList.add("result-top-controls");

        const marker = createText("div", "linear-system-ab-result-marker", MESSAGES.resultStatus);
        topControls.appendChild(marker);

        const actionButtons = root.document.createElement("div");
        actionButtons.classList.add("action-buttons");

        const deleteButton = root.document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.title = "Delete this record";
        deleteButton.setAttribute("aria-label", "Delete this input error record");
        deleteButton.textContent = "x";
        deleteButton.addEventListener("click", () => {
            resultBlock.remove();
        });

        actionButtons.appendChild(deleteButton);
        topControls.appendChild(actionButtons);
        resultBlock.appendChild(topControls);

        const body = root.document.createElement("div");
        body.className = "linear-system-ab-result-body";
        body.appendChild(createText("h3", "linear-system-ab-result-title", data.title || (sourceMode === MODE_AUGMENTED ? MESSAGES.augmentedResultTitle : MESSAGES.abResultTitle)));
        body.appendChild(createText("div", "linear-system-ab-result-status", data.status || MESSAGES.resultStatus));
        body.appendChild(createText("p", "linear-system-ab-not-calculated", MESSAGES.notCalculated));

        const list = root.document.createElement(messages.length > 1 ? "ul" : "div");
        list.className = "linear-system-ab-result-reasons";
        messages.forEach(message => {
            const item = root.document.createElement(messages.length > 1 ? "li" : "div");
            item.textContent = message;
            list.appendChild(item);
        });
        body.appendChild(list);

        const dims = root.document.createElement("div");
        dims.className = "linear-system-ab-result-dimensions";
        dims.appendChild(createText("div", "linear-system-ab-result-dimensions-title", "Current dimensions:"));
        if (sourceMode === MODE_AUGMENTED) {
            dims.appendChild(createText("div", "", `${dimensions.rowsA || 0} x ${dimensions.colsA || 0}`));
        } else {
            dims.appendChild(createText("div", "", `A: ${dimensions.rowsA || 0} x ${dimensions.colsA || 0}`));
            dims.appendChild(createText("div", "", `b: ${dimensions.rowsB || 0} x ${dimensions.colsB || 0}`));
        }
        body.appendChild(dims);

        const suggestion = data.suggestion || "";
        if (suggestion) {
            body.appendChild(createText("p", "linear-system-ab-result-next", suggestion));
        } else if (messages.includes(MESSAGES.bSingleColumn)) {
            body.appendChild(createText("p", "linear-system-ab-result-next", MESSAGES.setBColumn));
        } else if (messages.includes(MESSAGES.rowMismatch)) {
            body.appendChild(createText("p", "linear-system-ab-result-next", MESSAGES.matchRows));
        }

        resultBlock.appendChild(body);
        resultHistory.prepend(resultBlock);

        if (typeof resultBlock.scrollIntoView === "function") {
            resultBlock.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        return resultBlock;
    }

    function setMode(mode) {
        currentMode = mode === MODE_AUGMENTED ? MODE_AUGMENTED : (mode === MODE_AB || mode === "matrix" ? MODE_AB : MODE_EQUATION);
        if (typeof optionsRef.setRrefMode === "function") {
            optionsRef.setRrefMode("matrix");
        }
        setTabState();
        setPanelVisibility();
        setMatrixAreaVisibility();
        updateMatrixLabels();
        updateAugmentedColumnMarkers();
        if (currentMode === MODE_AB) renderDimensionStatus();
        if (currentMode === MODE_AUGMENTED) renderAugmentedDimensionStatus();
    }

    function bindModeButtons() {
        if (matrixTabRef && !matrixTabRef.dataset.abModeBound) {
            matrixTabRef.dataset.abModeBound = "1";
            matrixTabRef.addEventListener("click", () => setMode(MODE_AB));
        }
        if (equationTabRef && !equationTabRef.dataset.abModeBound) {
            equationTabRef.dataset.abModeBound = "1";
            equationTabRef.addEventListener("click", () => setMode(MODE_EQUATION));
        }
        if (augmentedTabRef && !augmentedTabRef.dataset.abModeBound) {
            augmentedTabRef.dataset.abModeBound = "1";
            augmentedTabRef.addEventListener("click", () => setMode(MODE_AUGMENTED));
        }
    }

    function observeDimensionChanges() {
        const targets = ["rows-a", "cols-a", "rows-b", "cols-b", "dim-a", "dim-b"]
            .map(id => root.document.getElementById(id))
            .filter(Boolean);
        if (!targets.length || observerRef) return;
        observerRef = new MutationObserver(() => {
            if (currentMode === MODE_AB) renderDimensionStatus();
            if (currentMode === MODE_AUGMENTED) renderAugmentedDimensionStatus();
            updateAugmentedColumnMarkers();
        });
        targets.forEach(target => {
            observerRef.observe(target, {
                childList: true,
                characterData: true,
                subtree: true
            });
        });
    }

    function observeMatrixGridChanges() {
        const container = root.document.getElementById("matrix-container-a");
        if (!container || matrixObserverRef) return;
        matrixObserverRef = new MutationObserver(() => {
            if (currentMode === MODE_AUGMENTED) updateAugmentedColumnMarkers();
        });
        matrixObserverRef.observe(container, { childList: true, subtree: true });
    }

    function init(options) {
        if (options && typeof options === "object") {
            optionsRef = Object.assign({}, optionsRef, options);
        }
        if (!isEquationPage()) return false;
        panelRef = root.document.getElementById("rref-panel");
        if (!panelRef) return false;

        matrixTabRef = panelRef.querySelector('[data-rref-mode="matrix"]');
        equationTabRef = panelRef.querySelector('[data-rref-mode="equation"]');
        ensureAugmentedTab();

        updatePanelTitle();
        buildAbPanel();
        bindModeButtons();
        setMode(MODE_EQUATION);
        observeDimensionChanges();
        observeMatrixGridChanges();
        initialized = true;
        if (autoObserverRef) {
            autoObserverRef.disconnect();
            autoObserverRef = null;
        }
        return true;
    }

    function tryAutoInit() {
        if (initialized || !isEquationPage()) return;
        if (init()) return;
        if (autoObserverRef || !root.MutationObserver || !root.document || !root.document.body) return;

        autoObserverRef = new MutationObserver(() => {
            if (initialized) {
                autoObserverRef.disconnect();
                autoObserverRef = null;
                return;
            }
            init();
        });
        autoObserverRef.observe(root.document.body, {
            childList: true,
            subtree: true
        });
    }

    function startAutoInit() {
        if (autoInitStarted) return;
        autoInitStarted = true;
        if (!root.document || typeof root.document.addEventListener !== "function") return;

        if (root.document.readyState === "loading") {
            root.document.addEventListener("DOMContentLoaded", tryAutoInit, { once: true });
        } else if (typeof root.queueMicrotask === "function") {
            root.queueMicrotask(tryAutoInit);
        } else {
            setTimeout(tryAutoInit, 0);
        }
    }

    const api = {
        init,
        getMode: () => currentMode,
        setMode,
        tryAutoInit,
        renderDimensionStatus,
        renderAugmentedDimensionStatus,
        renderError,
        appendValidationResult,
        validateDimensions,
        validateAugmentedDimensions,
        buildAugmentedMatrix,
        readAugmentedMatrix,
        getVariableNames,
        isFiniteMatrixValue,
        messages: MESSAGES
    };

    root.LinearSystemABMode = api;
    startAutoInit();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
