'use strict';

const assert = require('assert');
const path = require('path');

globalThis.math = require(path.join('..', 'math.min.js'));

const analysis = require(path.join('..', 'js', 'core', 'linear-system-analysis.js'));
const math = globalThis.math;

function assertMathEqual(actual, expected, message) {
    assert(
        math.equal(actual, math.fraction(expected)),
        `${message}: expected ${expected}, got ${math.format(actual)}`
    );
}

function expressionFor(result, variableIndex) {
    return result.expressions.find((expression) => expression.variableIndex === variableIndex);
}

function termFor(expression, parameterName) {
    return expression.terms.find((term) => term.parameterName === parameterName);
}

function assertUniqueValue(result, variableIndex, expected) {
    const item = result.uniqueValues.find((value) => value.variableIndex === variableIndex);
    assert(item, `Expected unique value for variable ${variableIndex}`);
    assertMathEqual(item.value, expected, `x${variableIndex + 1}`);
}

function assertExpressionConstant(result, variableIndex, expected) {
    const expression = expressionFor(result, variableIndex);
    assert(expression, `Expected expression for variable ${variableIndex}`);
    assertMathEqual(expression.constant, expected, `constant for x${variableIndex + 1}`);
    return expression;
}

function assertTerm(result, variableIndex, parameterName, freeVariableIndex, expectedCoefficient) {
    const expression = expressionFor(result, variableIndex);
    assert(expression, `Expected expression for variable ${variableIndex}`);
    const term = termFor(expression, parameterName);
    assert(term, `Expected ${parameterName} term for variable ${variableIndex}`);
    assert.strictEqual(term.freeVariableIndex, freeVariableIndex);
    assertMathEqual(term.coefficient, expectedCoefficient, `${parameterName} coefficient`);
}

function assertFreeExpression(result, variableIndex, parameterName) {
    const expression = expressionFor(result, variableIndex);
    assert(expression, `Expected free expression for variable ${variableIndex}`);
    assert.strictEqual(expression.isFree, true);
    assert.strictEqual(expression.parameterName, parameterName);
    assertMathEqual(expression.constant, 0, `constant for ${parameterName}`);
    assert.strictEqual(expression.terms.length, 1);
    assert.strictEqual(expression.terms[0].parameterName, parameterName);
    assert.strictEqual(expression.terms[0].freeVariableIndex, variableIndex);
    assertMathEqual(expression.terms[0].coefficient, 1, `${parameterName} coefficient`);
}

function expectThrows(name, fn) {
    assert.throws(fn, Error, name);
}

function runTests() {
    const rows = [];

    let result = analysis.analyzeRref([
        [1, 0, 2],
        [0, 1, 1]
    ], 2);
    assert.strictEqual(result.solutionType, 'unique');
    assert.deepStrictEqual(result.pivotColumns, [0, 1]);
    assert.deepStrictEqual(result.freeColumns, []);
    assertUniqueValue(result, 0, 2);
    assertUniqueValue(result, 1, 1);
    rows.push(['T01', 'unique two-variable solution', 'pass']);

    result = analysis.analyzeRref([
        [1, 1, 2],
        [0, 0, 1]
    ], 2);
    assert.strictEqual(result.solutionType, 'none');
    assert.deepStrictEqual(result.inconsistentRows, [1]);
    assert(result.rankCoefficient < result.rankAugmented);
    assert.deepStrictEqual(result.uniqueValues, []);
    assert.deepStrictEqual(result.parameters, []);
    assert.deepStrictEqual(result.expressions, []);
    rows.push(['T02', 'inconsistent row', 'pass']);

    result = analysis.analyzeRref([
        [1, 2, 0, 3],
        [0, 0, 1, 4]
    ], 3);
    assert.strictEqual(result.solutionType, 'infinite');
    assert.deepStrictEqual(result.pivotColumns, [0, 2]);
    assert.deepStrictEqual(result.freeColumns, [1]);
    assertFreeExpression(result, 1, 't1');
    assertExpressionConstant(result, 0, 3);
    assertTerm(result, 0, 't1', 1, -2);
    assertExpressionConstant(result, 2, 4);
    rows.push(['T03', 'one free variable', 'pass']);

    result = analysis.analyzeRref([
        [1, 2, -1, 3],
        [0, 0, 0, 0]
    ], 3);
    assert.strictEqual(result.solutionType, 'infinite');
    assert.deepStrictEqual(result.freeColumns, [1, 2]);
    assertExpressionConstant(result, 0, 3);
    assertTerm(result, 0, 't1', 1, -2);
    assertTerm(result, 0, 't2', 2, 1);
    assertFreeExpression(result, 1, 't1');
    assertFreeExpression(result, 2, 't2');
    rows.push(['T04', 'two free variables', 'pass']);

    result = analysis.analyzeRref([
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ], 3);
    assert.strictEqual(result.solutionType, 'infinite');
    assert.deepStrictEqual(result.pivotColumns, []);
    assert.deepStrictEqual(result.freeColumns, [0, 1, 2]);
    assertFreeExpression(result, 0, 't1');
    assertFreeExpression(result, 1, 't2');
    assertFreeExpression(result, 2, 't3');
    rows.push(['T05', 'all-zero system', 'pass']);

    result = analysis.analyzeRref([
        [1, 0, 2],
        [0, 1, 1],
        [0, 0, 0]
    ], 2);
    assert.strictEqual(result.solutionType, 'unique');
    assertUniqueValue(result, 0, 2);
    assertUniqueValue(result, 1, 1);
    rows.push(['T06', 'overdetermined consistent unique', 'pass']);

    result = analysis.analyzeRref([
        [1, 0, 2, 5],
        [0, 1, -1, 3]
    ], 3);
    assert.strictEqual(result.solutionType, 'infinite');
    assert.deepStrictEqual(result.freeColumns, [2]);
    assertExpressionConstant(result, 0, 5);
    assertTerm(result, 0, 't1', 2, -2);
    assertExpressionConstant(result, 1, 3);
    assertTerm(result, 1, 't1', 2, 1);
    assertFreeExpression(result, 2, 't1');
    rows.push(['T07', 'underdetermined consistent', 'pass']);

    result = analysis.analyzeRref([
        [math.fraction(1), math.fraction(0), math.fraction('1/2')],
        [math.fraction(0), math.fraction(1), math.fraction('-2/3')]
    ], 2);
    assert.strictEqual(result.solutionType, 'unique');
    assertUniqueValue(result, 0, '1/2');
    assertUniqueValue(result, 1, '-2/3');
    rows.push(['T08', 'fraction unique solution', 'pass']);

    result = analysis.analyzeRref([
        [1, '1/2', '3/4']
    ], 2);
    assert.strictEqual(result.solutionType, 'infinite');
    assertFreeExpression(result, 1, 't1');
    assertExpressionConstant(result, 0, '3/4');
    assertTerm(result, 0, 't1', 1, '-1/2');
    rows.push(['T09', 'fraction parameter solution', 'pass']);

    result = analysis.analyzeRref([
        [2, 0, 6],
        [0, -3, 9]
    ], 2);
    assert.strictEqual(result.solutionType, 'unique');
    assertUniqueValue(result, 0, 3);
    assertUniqueValue(result, 1, -3);
    rows.push(['T10', 'non-unit pivots', 'pass']);

    result = analysis.analyzeRref([
        [0, 0, math.fraction('1/3')]
    ], 2);
    assert.strictEqual(result.solutionType, 'none');
    assert.deepStrictEqual(result.inconsistentRows, [0]);
    rows.push(['T11', 'fraction inconsistent row', 'pass']);

    expectThrows('empty matrix', () => analysis.analyzeRref([], 2));
    expectThrows('ragged matrix', () => analysis.analyzeRref([[1, 0, 2], [0, 1]], 2));
    expectThrows('variableCount zero', () => analysis.analyzeRref([[1, 2]], 0));
    expectThrows('wrong column count', () => analysis.analyzeRref([[1, 0, 2]], 3));
    expectThrows('NaN value', () => analysis.analyzeRref([[NaN, 0, 1]], 2));
    expectThrows('Infinity value', () => analysis.analyzeRref([[Infinity, 0, 1]], 2));
    expectThrows('unparseable string', () => analysis.analyzeRref([['abc', 0, 1]], 2));
    rows.push(['T12', 'invalid matrix validation', 'pass']);

    return rows;
}

const rows = runTests();
rows.forEach(([id, name, status]) => {
    console.log(`${id} ${status} - ${name}`);
});
console.log('All linear system analysis tests passed.');
