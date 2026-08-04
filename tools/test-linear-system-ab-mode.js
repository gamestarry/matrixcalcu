'use strict';

const assert = require('assert');
const path = require('path');

globalThis.math = require(path.join('..', 'math.min.js'));

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.parentNode = null;
        this.attributes = {};
        this.dataset = {};
        this.textContent = '';
        this.id = '';
        this.title = '';
        this.type = '';
        this.className = '';
        this._listeners = {};
        this._classes = new Set();
        this.classList = {
            add: (...names) => {
                names.forEach(name => this._classes.add(name));
                this.className = Array.from(this._classes).join(' ');
            },
            contains: (name) => this._classes.has(name),
            toggle: (name, force) => {
                if (force) this._classes.add(name);
                else this._classes.delete(name);
                this.className = Array.from(this._classes).join(' ');
            }
        };
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    prepend(child) {
        child.parentNode = this;
        this.children.unshift(child);
        return child;
    }

    remove() {
        if (!this.parentNode) return;
        const index = this.parentNode.children.indexOf(this);
        if (index >= 0) this.parentNode.children.splice(index, 1);
        this.parentNode = null;
    }

    replaceChildren(...children) {
        this.children.forEach(child => { child.parentNode = null; });
        this.children = [];
        children.forEach(child => this.appendChild(child));
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }

    addEventListener(name, callback) {
        this._listeners[name] = callback;
    }

    click() {
        if (this._listeners.click) this._listeners.click();
    }

    scrollIntoView() {
        this.scrolled = true;
    }
}

const fakeHistory = new FakeElement('div');
fakeHistory.id = 'result-history';
globalThis.document = {
    documentElement: { lang: 'en' },
    createElement: (tagName) => new FakeElement(tagName),
    getElementById: (id) => id === 'result-history' ? fakeHistory : null
};

const abMode = require(path.join('..', 'js', 'ui', 'linear-system-ab-mode.js'));
const math = globalThis.math;

function findFirst(node, predicate) {
    if (predicate(node)) return node;
    for (const child of node.children || []) {
        const found = findFirst(child, predicate);
        if (found) return found;
    }
    return null;
}

function collectText(node) {
    const own = node.textContent || '';
    const childText = (node.children || []).map(collectText).join('\n');
    return [own, childText].filter(Boolean).join('\n');
}

function setLang(lang) {
    globalThis.document.documentElement.lang = lang;
}

function runTests() {
    const rows = [];

    let result = abMode.validateDimensions({
        A: { rows: 2, cols: 2 },
        B: { rows: 2, cols: 1 }
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.variableCount, 2);
    assert.strictEqual(result.equationCount, 2);
    rows.push(['T01', 'accept square A with one-column b', 'pass']);

    result = abMode.validateDimensions({
        A: { rows: 2, cols: 3 },
        B: { rows: 2, cols: 1 }
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.isUnderdetermined, true);
    rows.push(['T02', 'accept underdetermined systems', 'pass']);

    result = abMode.validateDimensions({
        A: { rows: 3, cols: 2 },
        B: { rows: 3, cols: 1 }
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.isOverdetermined, true);
    rows.push(['T03', 'accept overdetermined systems', 'pass']);

    result = abMode.validateDimensions({
        A: { rows: 2, cols: 2 },
        B: { rows: 3, cols: 1 }
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'row-mismatch');
    rows.push(['T04', 'reject row mismatch', 'pass']);

    result = abMode.validateDimensions({
        A: { rows: 2, cols: 2 },
        B: { rows: 2, cols: 2 }
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'b-column-count');
    rows.push(['T05', 'reject b with more than one column', 'pass']);

    const half = math.fraction('1/2');
    const third = math.fraction('1/3');
    const augmented = abMode.buildAugmentedMatrix(
        [[half, 2], [3, 4]],
        [[third], [5]]
    );
    assert.strictEqual(augmented.length, 2);
    assert.strictEqual(augmented[0].length, 3);
    assert.strictEqual(math.equal(augmented[0][0], half), true);
    assert.strictEqual(math.equal(augmented[0][2], third), true);
    rows.push(['T06', 'build augmented matrix and preserve fractions', 'pass']);

    assert.throws(() => abMode.buildAugmentedMatrix([], []), /dimensions|contain at least|not available/i);
    assert.throws(() => abMode.buildAugmentedMatrix([[1, 2]], [[3, 4]]), /one column/i);
    assert.throws(() => abMode.buildAugmentedMatrix([[Number.NaN]], [[1]]), /finite values/i);
    assert.throws(() => abMode.buildAugmentedMatrix([[1, 2], [3]], [[4], [5]]), /finite values/i);
    rows.push(['T07', 'reject empty, non-column b, invalid values, and ragged rows', 'pass']);

    result = abMode.validateDimensions({
        A: { rows: 3, cols: 2 },
        B: { rows: 2, cols: 2 }
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'multiple-dimension-errors');
    assert.deepStrictEqual(result.messages, [
        'Matrix A and vector b must have the same number of rows.',
        'Vector b must have exactly one column.'
    ]);
    rows.push(['T08', 'report row mismatch and b column mismatch together', 'pass']);

    const before = fakeHistory.children.length;
    const recordA = abMode.appendValidationResult({
        messages: result.messages,
        dimensions: { A: { rows: 3, cols: 2 }, B: { rows: 2, cols: 2 } }
    });
    const recordB = abMode.appendValidationResult({
        messages: ['Vector b must have exactly one column.'],
        dimensions: { A: { rows: 3, cols: 3 }, B: { rows: 3, cols: 3 } }
    });
    assert.strictEqual(fakeHistory.children.length, before + 2);
    assert.strictEqual(fakeHistory.children[0], recordB);
    assert.strictEqual(fakeHistory.children[1], recordA);
    assert.notStrictEqual(recordA.id, recordB.id);
    assert.strictEqual(recordB.scrolled, true);
    const deleteButton = findFirst(recordB, node => node.className === 'delete-btn');
    assert.ok(deleteButton);
    deleteButton.click();
    assert.strictEqual(fakeHistory.children.includes(recordB), false);
    assert.strictEqual(fakeHistory.children.includes(recordA), true);
    rows.push(['T09', 'append independent input error records with single-record delete', 'pass']);

    assert.deepStrictEqual(abMode.getVariableNames(5), ['x', 'y', 'z', 'w', 'u']);
    assert.strictEqual(abMode.getVariableNames(16)[15], 'x16');
    rows.push(['T10', 'generate variable names for A columns', 'pass']);

    setLang('en');
    const enRecord = abMode.appendValidationResult({
        messages: [abMode.messages.bSingleColumn],
        dimensions: { A: { rows: 2, cols: 2 }, B: { rows: 2, cols: 2 } }
    });
    let text = collectText(enRecord);
    assert.ok(text.includes('Cannot solve A x = b'));
    assert.ok(text.includes('Input error'));
    assert.ok(text.includes('This attempt was not calculated.'));
    assert.ok(text.includes('Vector b must have exactly one column.'));
    assert.ok(text.includes('Set Matrix B to one column, then try again.'));
    assert.ok(text.includes('Current dimensions:'));
    rows.push(['T11', 'render English A and b input error record', 'pass']);

    setLang('es');
    const esBRecord = abMode.appendValidationResult({
        messages: [abMode.messages.bSingleColumn],
        dimensions: { A: { rows: 2, cols: 2 }, B: { rows: 2, cols: 2 } }
    });
    text = collectText(esBRecord);
    assert.ok(text.includes('No se puede resolver A x = b'));
    assert.ok(text.includes('Error de entrada'));
    assert.ok(text.includes('Este intento no se calculó.'));
    assert.ok(text.includes('La matriz B debe tener una sola columna para utilizarse como vector b.'));
    assert.ok(text.includes('Ajusta la matriz B a una sola columna e inténtalo de nuevo.'));
    assert.ok(text.includes('Dimensiones actuales:'));
    assert.ok(text.includes('A: 2 x 2'));
    assert.ok(text.includes('b: 2 x 2'));
    rows.push(['T12', 'render Spanish A y b non-column b error record with dimensions', 'pass']);

    const esRowRecord = abMode.appendValidationResult({
        messages: [abMode.messages.rowMismatch],
        dimensions: { A: { rows: 2, cols: 2 }, B: { rows: 3, cols: 1 } }
    });
    text = collectText(esRowRecord);
    assert.ok(text.includes('El número de filas de A y b debe coincidir.'));
    assert.ok(text.includes('Haz que A y b tengan el mismo número de filas e inténtalo de nuevo.'));
    rows.push(['T13', 'render Spanish A y b row mismatch error record', 'pass']);

    setLang('fr');
    const fallbackRecord = abMode.appendValidationResult({
        messages: [abMode.messages.bSingleColumn],
        dimensions: { A: { rows: 2, cols: 2 }, B: { rows: 2, cols: 2 } }
    });
    text = collectText(fallbackRecord);
    assert.ok(text.includes('Cannot solve A x = b'));
    assert.ok(text.includes('Input error'));
    assert.ok(text.includes('This attempt was not calculated.'));
    rows.push(['T14', 'fallback to English for unsupported language in error records', 'pass']);

    setLang('es');
    const augmentedColumnRecord = abMode.appendValidationResult({
        title: abMode.messages.augmentedResultTitle,
        messages: [abMode.messages.augmentedMinColumns],
        dimensions: { A: { rows: 3, cols: 1 } },
        suggestion: abMode.messages.augmentedAddColumn,
        sourceMode: 'augmented'
    });
    text = collectText(augmentedColumnRecord);
    assert.ok(text.includes('No se puede resolver la matriz aumentada'));
    assert.ok(text.includes('Una matriz aumentada debe tener al menos dos columnas: una o más columnas de variables y una columna de constantes.'));
    assert.ok(text.includes('Añade al menos una columna más e inténtalo de nuevo.'));
    assert.ok(text.includes('Dimensiones actuales:'));
    assert.ok(text.includes('3 x 1'));
    rows.push(['T15', 'render Spanish augmented minimum-column error record', 'pass']);

    const augmentedUnreadableRecord = abMode.appendValidationResult({
        title: abMode.messages.augmentedResultTitle,
        messages: [abMode.messages.augmentedUnreadable],
        dimensions: { A: { rows: 2, cols: 3 } },
        suggestion: abMode.messages.augmentedCheckDimensions,
        sourceMode: 'augmented'
    });
    text = collectText(augmentedUnreadableRecord);
    assert.ok(text.includes('No se pudo leer la matriz aumentada.'));
    assert.ok(text.includes('Comprueba las dimensiones de la matriz e inténtalo de nuevo.'));
    rows.push(['T16', 'render Spanish augmented unreadable error record', 'pass']);

    const augmentedInvalidRecord = abMode.appendValidationResult({
        title: abMode.messages.augmentedResultTitle,
        messages: [abMode.messages.augmentedInvalidEntries],
        dimensions: { A: { rows: 2, cols: 3 } },
        suggestion: abMode.messages.augmentedCheckEntries,
        sourceMode: 'augmented'
    });
    text = collectText(augmentedInvalidRecord);
    assert.ok(text.includes('Una o más entradas de la matriz aumentada no son válidas.'));
    assert.ok(text.includes('Comprueba las entradas e inténtalo de nuevo.'));
    rows.push(['T17', 'render Spanish augmented invalid-entry error record', 'pass']);

    return rows;
}

const rows = runTests();
rows.forEach(([id, name, status]) => {
    console.log(`${id} ${status} - ${name}`);
});
console.log('All linear system A and b mode tests passed.');
