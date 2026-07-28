'use strict';

const assert = require('assert');
const path = require('path');

globalThis.math = require(path.join('..', 'math.min.js'));

const summary = require(path.join('..', 'js', 'ui', 'linear-system-summary.js'));
const math = globalThis.math;

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

    return rows;
}

const rows = runTests();
rows.forEach(([id, name, status]) => {
    console.log(`${id} ${status} - ${name}`);
});
console.log('All linear system summary tests passed.');
