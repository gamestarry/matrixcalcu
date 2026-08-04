'use strict';

const assert = require('assert');
const path = require('path');

globalThis.math = require(path.join('..', 'math.min.js'));

const summary = require(path.join('..', 'js', 'ui', 'linear-system-summary.js'));
const math = globalThis.math;

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.parentNode = null;
        this.id = '';
        this._textContent = '';
        this._classes = new Set();
        this.classList = {
            add: (...names) => names.forEach(name => this._classes.add(name)),
            contains: (name) => this._classes.has(name)
        };
    }

    get textContent() {
        return this._textContent || this.children.map(child => child.textContent).join('');
    }

    set textContent(value) {
        this._textContent = String(value);
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    insertBefore(child, before) {
        child.parentNode = this;
        const index = this.children.indexOf(before);
        if (index < 0) this.children.push(child);
        else this.children.splice(index, 0, child);
        return child;
    }

    remove() {
        if (!this.parentNode) return;
        const index = this.parentNode.children.indexOf(this);
        if (index >= 0) this.parentNode.children.splice(index, 1);
        this.parentNode = null;
    }

    setAttribute() {}

    querySelector(selector) {
        if (selector.startsWith('#') && this.id === selector.slice(1)) return this;
        if (selector.startsWith('.') && this.classList.contains(selector.slice(1))) return this;
        for (const child of this.children) {
            const found = child.querySelector(selector);
            if (found) return found;
        }
        return null;
    }
}

function expression(constant, terms = []) {
    return {
        variableIndex: 0,
        isFree: false,
        parameterName: null,
        constant,
        terms
    };
}

function term(coefficient, parameterName = 't1') {
    return {
        parameterName,
        freeVariableIndex: 1,
        coefficient
    };
}

function setupDocument(lang) {
    globalThis.document = {
        documentElement: { lang },
        createElement: (tagName) => new FakeElement(tagName)
    };
}

function renderText(lang, analysis, variableNames = ['x', 'y', 'z']) {
    setupDocument(lang);
    const target = new FakeElement('div');
    summary.render({ analysis, variableNames, target });
    return target.textContent;
}

function runTests() {
    const rows = [];

    assert.strictEqual(summary.formatValue(2), '2');
    assert.strictEqual(summary.formatValue(0), '0');
    assert.strictEqual(summary.formatValue(math.fraction('1/2')), '1/2');
    assert.strictEqual(summary.formatValue(math.fraction('-2/3')), '-2/3');
    rows.push(['T01', 'format integers, zero, and fractions', 'pass']);

    assert.strictEqual(summary.formatExpression(expression(3, [term(-2), term(1, 't2')])), '3 - 2t1 + t2');
    assert.strictEqual(summary.formatExpression(expression(3, [term(1)])), '3 + t1');
    assert.strictEqual(summary.formatExpression(expression(0, [term(-1)])), '-t1');
    assert.strictEqual(summary.formatExpression(expression(0, [term(math.fraction('1/2'))])), '1/2 t1');
    assert.strictEqual(summary.formatExpression(expression(0, [term(math.fraction('-1/2'))])), '-1/2 t1');
    rows.push(['T02', 'format signed parameter expressions', 'pass']);

    assert.strictEqual(summary.formatExpression(expression(0, [term(1)])), 't1');
    assert.strictEqual(summary.formatExpression(expression(0, [term(0)])), '0');
    assert.strictEqual(summary.formatExpression(expression(0, [])), '0');
    rows.push(['T03', 'format free and zero expressions', 'pass']);

    assert.strictEqual(
        summary.formatExpression(expression(math.fraction('5/6'), [term(math.fraction('-7/8'), 't1'), term(math.fraction('1/3'), 't2')])),
        '5/6 - 7/8 t1 + 1/3 t2'
    );
    rows.push(['T04', 'format multiple fraction parameters', 'pass']);

    assert.throws(() => summary.formatExpression(null), /formatExpression requires/);
    assert.throws(() => summary.render({ analysis: null, target: {} }), /valid analysis object/);
    rows.push(['T05', 'developer errors for invalid inputs', 'pass']);

    const uniqueAnalysis = {
        solutionType: 'unique',
        variableCount: 2,
        uniqueValues: [
            { variableIndex: 0, value: 2 },
            { variableIndex: 1, value: 1 }
        ],
        pivotColumns: [0, 1],
        freeColumns: []
    };
    const enUnique = renderText('en', uniqueAnalysis, ['x', 'y']);
    assert.ok(enUnique.includes('Solution Summary'));
    assert.ok(enUnique.includes('Unique solution'));
    assert.ok(enUnique.includes('Pivot variables'));
    assert.ok(enUnique.includes('Free variables'));
    const esUnique = renderText('es', uniqueAnalysis, ['x', 'y']);
    assert.ok(esUnique.includes('Resumen de la solución'));
    assert.ok(esUnique.includes('Solución única'));
    assert.ok(esUnique.includes('Variables pivote'));
    assert.ok(esUnique.includes('Variables libres'));
    assert.ok(esUnique.includes('x'));
    assert.ok(esUnique.includes('2'));
    rows.push(['T06', 'render English and Spanish unique solution labels', 'pass']);

    const noneAnalysis = {
        solutionType: 'none',
        variableCount: 2,
        pivotColumns: [0],
        freeColumns: [],
        inconsistentRows: [1]
    };
    const esNone = renderText('es', noneAnalysis, ['x', 'y']);
    assert.ok(esNone.includes('Sin solución'));
    assert.ok(esNone.includes('El sistema es inconsistente.'));
    assert.ok(esNone.includes('Fila contradictoria'));
    assert.ok(esNone.includes('Fila 2'));
    rows.push(['T07', 'render Spanish no-solution summary labels', 'pass']);

    const infiniteAnalysis = {
        solutionType: 'infinite',
        variableCount: 2,
        pivotColumns: [0],
        freeColumns: [1],
        parameters: [{ variableIndex: 1, name: 't1' }],
        expressions: [
            expression(2, [term(-1)]),
            { variableIndex: 1, isFree: true, parameterName: 't1', constant: 0, terms: [] }
        ]
    };
    infiniteAnalysis.expressions[0].variableIndex = 0;
    const esInfinite = renderText('es', infiniteAnalysis, ['x', 'y']);
    assert.ok(esInfinite.includes('Infinitas soluciones'));
    assert.ok(esInfinite.includes('Variables pivote'));
    assert.ok(esInfinite.includes('Variables libres'));
    assert.ok(esInfinite.includes('Solución paramétrica'));
    assert.ok(esInfinite.includes('2 - t1'));
    assert.ok(esInfinite.includes('t1'));
    rows.push(['T08', 'render Spanish infinite-solution labels without changing expressions', 'pass']);

    const fallback = renderText('fr', uniqueAnalysis, ['x', 'y']);
    assert.ok(fallback.includes('Solution Summary'));
    assert.ok(fallback.includes('Unique solution'));
    rows.push(['T09', 'fallback to English for unsupported language', 'pass']);

    return rows;
}

const rows = runTests();
rows.forEach(([id, name, status]) => {
    console.log(`${id} ${status} - ${name}`);
});
console.log('All linear system summary tests passed.');
