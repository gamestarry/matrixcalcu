(function (root) {
    "use strict";

    const SUMMARY_ID = "linear-system-solution-summary";
    const DEFAULT_VARIABLES = ["x", "y", "z", "w", "u", "v", "t", "s", "r", "q", "p", "k", "m", "n"];

    function getMath() {
        if (!root || !root.math) {
            throw new Error("LinearSystemSummary requires math.js.");
        }
        return root.math;
    }

    function toFraction(value) {
        return getMath().fraction(value);
    }

    function isZero(value) {
        try {
            return getMath().equal(toFraction(value), 0);
        } catch (error) {
            return Number(value) === 0;
        }
    }

    function formatValue(value) {
        const mathRef = getMath();
        try {
            const fraction = mathRef.fraction(value);
            if (fraction.n === 0) return "0";
            if (fraction.d === 1) return String(fraction.s * fraction.n);
            const sign = fraction.s < 0 ? "-" : "";
            return `${sign}${fraction.n}/${fraction.d}`;
        } catch (error) {
            return String(value);
        }
    }

    function absFormatted(value) {
        const mathRef = getMath();
        return formatValue(mathRef.abs(toFraction(value)));
    }

    function formatParameterTerm(coefficient, parameterName, isFirst) {
        if (isZero(coefficient)) return "";

        const negative = getMath().smaller(toFraction(coefficient), 0);
        const absText = absFormatted(coefficient);
        const spacer = absText.includes("/") ? " " : "";
        const coefficientText = absText === "1" ? "" : `${absText}${spacer}`;
        const termText = `${coefficientText}${parameterName}`;

        if (isFirst) return negative ? `-${termText}` : termText;
        return negative ? ` - ${termText}` : ` + ${termText}`;
    }

    function formatExpression(expression) {
        if (!expression || typeof expression !== "object") {
            throw new Error("formatExpression requires an expression object.");
        }

        const parts = [];
        const constant = expression.constant == null ? 0 : expression.constant;
        if (!isZero(constant) || !Array.isArray(expression.terms) || expression.terms.length === 0) {
            parts.push(formatValue(constant));
        }

        (expression.terms || []).forEach((term) => {
            const text = formatParameterTerm(term.coefficient, term.parameterName, parts.length === 0);
            if (text) parts.push(text);
        });

        return parts.length ? parts.join("") : "0";
    }

    function variableName(variableNames, index) {
        return variableNames[index] || DEFAULT_VARIABLES[index] || `x${index + 1}`;
    }

    function namesForColumns(columns, variableNames) {
        if (!columns || !columns.length) return "None";
        return columns.map((index) => variableName(variableNames, index)).join(", ");
    }

    function clear(target) {
        const scope = target || (root && root.document);
        if (!scope || typeof scope.querySelector !== "function") return;
        const existing = scope.querySelector(`#${SUMMARY_ID}`);
        if (existing) existing.remove();
    }

    function appendLabelValue(parent, label, value) {
        const row = document.createElement("div");
        row.classList.add("linear-system-summary__row");

        const key = document.createElement("span");
        key.classList.add("linear-system-summary__label");
        key.textContent = label;

        const val = document.createElement("span");
        val.classList.add("linear-system-summary__value");
        val.textContent = value;

        row.appendChild(key);
        row.appendChild(val);
        parent.appendChild(row);
    }

    function appendVariableGrid(parent, titleText, entries) {
        const block = document.createElement("div");
        block.classList.add("linear-system-summary__block");

        if (titleText) {
            const title = document.createElement("div");
            title.classList.add("linear-system-summary__block-title");
            title.textContent = titleText;
            block.appendChild(title);
        }

        const grid = document.createElement("div");
        grid.classList.add("linear-system-summary__grid");
        entries.forEach((entry) => {
            appendLabelValue(grid, entry.label, entry.value);
        });

        block.appendChild(grid);
        parent.appendChild(block);
    }

    function appendParagraph(parent, text) {
        const p = document.createElement("p");
        p.classList.add("linear-system-summary__text");
        p.textContent = text;
        parent.appendChild(p);
    }

    function renderUnique(section, analysis, variableNames) {
        const valuesByIndex = new Map();
        analysis.uniqueValues.forEach((item) => {
            valuesByIndex.set(item.variableIndex, item.value);
        });

        const entries = [];
        for (let index = 0; index < analysis.variableCount; index++) {
            entries.push({
                label: variableName(variableNames, index),
                value: formatValue(valuesByIndex.get(index) || 0)
            });
        }

        appendVariableGrid(section, null, entries);
        appendParagraph(section, `Pivot variables: ${namesForColumns(analysis.pivotColumns, variableNames)}`);
        appendParagraph(section, `Free variables: ${namesForColumns(analysis.freeColumns, variableNames)}`);
    }

    function renderNone(section, analysis) {
        appendParagraph(section, "The system is inconsistent.");
        appendParagraph(section, "A row in the reduced matrix represents: 0 = 1");

        if (analysis.inconsistentRows && analysis.inconsistentRows.length) {
            const rows = analysis.inconsistentRows.map((rowIndex) => rowIndex + 1);
            const label = rows.length === 1 ? "Contradictory row" : "Contradictory rows";
            const value = rows.length === 1
                ? `Row ${rows[0]}`
                : `Rows ${rows.join(", ")}`;
            appendParagraph(section, `${label}: ${value}`);
        }
    }

    function renderInfinite(section, analysis, variableNames) {
        appendParagraph(section, `Pivot variables: ${namesForColumns(analysis.pivotColumns, variableNames)}`);
        appendParagraph(section, `Free variables: ${namesForColumns(analysis.freeColumns, variableNames)}`);

        const parameterRows = analysis.parameters.map((parameter) => ({
            label: variableName(variableNames, parameter.variableIndex),
            value: parameter.name
        }));
        appendVariableGrid(section, "Let:", parameterRows);

        const expressionRows = analysis.expressions
            .slice()
            .sort((a, b) => a.variableIndex - b.variableIndex)
            .map((expression) => ({
                label: variableName(variableNames, expression.variableIndex),
                value: expression.isFree ? expression.parameterName : formatExpression(expression)
            }));
        appendVariableGrid(section, "Parametric solution:", expressionRows);
    }

    function render(options) {
        if (!options || typeof options !== "object") {
            throw new Error("LinearSystemSummary.render requires an options object.");
        }

        const analysis = options.analysis;
        const target = options.target;
        const variableNames = Array.isArray(options.variableNames) ? options.variableNames : [];

        if (!analysis || typeof analysis !== "object") {
            throw new Error("LinearSystemSummary.render requires a valid analysis object.");
        }
        if (!target || typeof target.appendChild !== "function") {
            throw new Error("LinearSystemSummary.render requires a DOM target.");
        }

        clear(target);

        const section = document.createElement("section");
        section.id = SUMMARY_ID;
        section.classList.add("linear-system-summary");
        section.setAttribute("aria-live", "polite");

        const header = document.createElement("div");
        header.classList.add("linear-system-summary__header");

        const title = document.createElement("h3");
        title.classList.add("linear-system-summary__title");
        title.textContent = "Solution Summary";

        const status = document.createElement("div");
        status.classList.add("linear-system-summary__status");

        if (analysis.solutionType === "unique") {
            section.classList.add("linear-system-summary--unique");
            status.textContent = "Unique solution";
        } else if (analysis.solutionType === "none") {
            section.classList.add("linear-system-summary--none");
            status.textContent = "No solution";
        } else if (analysis.solutionType === "infinite") {
            section.classList.add("linear-system-summary--infinite");
            status.textContent = "Infinitely many solutions";
        } else {
            throw new Error(`Unsupported solution type: ${String(analysis.solutionType)}`);
        }

        header.appendChild(title);
        header.appendChild(status);
        section.appendChild(header);

        if (analysis.solutionType === "unique") {
            renderUnique(section, analysis, variableNames);
        } else if (analysis.solutionType === "none") {
            renderNone(section, analysis);
        } else {
            renderInfinite(section, analysis, variableNames);
        }

        const steps = target.querySelector(".rref-steps-container");
        if (steps) {
            target.insertBefore(section, steps);
        } else {
            target.appendChild(section);
        }

        return section;
    }

    const api = {
        render,
        clear,
        formatValue,
        formatExpression
    };

    root.LinearSystemSummary = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : this);
