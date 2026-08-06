'use strict';

const assert = require('assert');
const path = require('path');

const random = require(path.join('..', 'js', 'practice', 'random.js'));

function sequence(seed, count) {
    const rng = random.createSeededRandom(seed);
    const values = [];
    for (let i = 0; i < count; i++) values.push(rng.next());
    return values;
}

function assertThrows(name, fn) {
    assert.throws(fn, Error, name);
}

function sortedCopy(items) {
    return items.slice().sort();
}

function runTests() {
    const rows = [];

    assert.deepStrictEqual(sequence(12345, 6), sequence(12345, 6));
    rows.push(['T01', 'same number seed produces the same next sequence', 'pass']);

    assert.deepStrictEqual(sequence('worksheet-alpha', 6), sequence('worksheet-alpha', 6));
    rows.push(['T02', 'same string seed produces the same next sequence', 'pass']);

    assert.notDeepStrictEqual(sequence('worksheet-alpha', 6), sequence('worksheet-beta', 6));
    rows.push(['T03', 'different seeds usually produce different sequences', 'pass']);

    const rngA = random.createSeededRandom('independent');
    const rngB = random.createSeededRandom('independent');
    const firstA = rngA.next();
    rngA.next();
    assert.strictEqual(firstA, rngB.next());
    assert.notStrictEqual(rngA.next(), rngB.next());
    rows.push(['T04', 'instances keep independent state', 'pass']);

    const rangeRng = random.createSeededRandom('range');
    for (let i = 0; i < 100; i++) {
        const value = rangeRng.next();
        assert(value >= 0 && value < 1, `next() out of range: ${value}`);
    }
    rows.push(['T05', 'next values satisfy 0 <= value < 1', 'pass']);

    const boundaryRng = random.createSeededRandom('int-boundary');
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(boundaryRng.int(1, 3));
    assert(seen.has(1));
    assert(seen.has(3));
    rows.push(['T06', 'int includes min and max boundaries', 'pass']);

    assert.strictEqual(random.createSeededRandom('single').int(3, 3), 3);
    rows.push(['T07', 'int(3, 3) returns 3', 'pass']);

    assertThrows('min greater than max', () => random.createSeededRandom(1).int(4, 3));
    assertThrows('non-integer min', () => random.createSeededRandom(1).int(1.2, 3));
    assertThrows('non-integer max', () => random.createSeededRandom(1).int(1, 3.2));
    rows.push(['T08', 'invalid int ranges throw', 'pass']);

    const boolRng = random.createSeededRandom('bool');
    for (let i = 0; i < 20; i++) assert.strictEqual(boolRng.bool(0), false);
    for (let i = 0; i < 20; i++) assert.strictEqual(boolRng.bool(1), true);
    rows.push(['T09', 'bool(0) and bool(1) are deterministic extremes', 'pass']);

    assertThrows('negative probability', () => random.createSeededRandom(1).bool(-0.01));
    assertThrows('probability greater than one', () => random.createSeededRandom(1).bool(1.01));
    assertThrows('NaN probability', () => random.createSeededRandom(1).bool(Number.NaN));
    rows.push(['T10', 'invalid probabilities throw', 'pass']);

    const items = ['a', 'b', 'c'];
    const picked = random.createSeededRandom('pick').pick(items);
    assert(items.includes(picked));
    rows.push(['T11', 'pick result comes from original array', 'pass']);

    assertThrows('empty pick', () => random.createSeededRandom(1).pick([]));
    rows.push(['T12', 'pick empty array throws', 'pass']);

    const source = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = random.createSeededRandom('shuffle').shuffle(source);
    assert.deepStrictEqual(sortedCopy(shuffled), sortedCopy(source));
    assert.deepStrictEqual(source, ['a', 'b', 'c', 'd', 'e']);
    rows.push(['T13', 'shuffle contains same elements and does not mutate input', 'pass']);

    assert.deepStrictEqual(
        random.createSeededRandom('fixed-shuffle').shuffle(source),
        random.createSeededRandom('fixed-shuffle').shuffle(source)
    );
    rows.push(['T14', 'fixed seed shuffle is stable', 'pass']);

    assert.strictEqual(random.normalizeSeed('stable'), random.normalizeSeed('stable'));
    assertThrows('empty string seed', () => random.normalizeSeed(''));
    assertThrows('NaN seed', () => random.normalizeSeed(Number.NaN));
    assertThrows('Infinity seed', () => random.normalizeSeed(Infinity));
    rows.push(['T15', 'normalizeSeed is stable and rejects unsafe seed values', 'pass']);

    const runtimeSeed = random.createRuntimeSeed();
    assert.strictEqual(Number.isInteger(runtimeSeed), true);
    assert(runtimeSeed >= 0);
    assert(runtimeSeed <= 0xFFFFFFFF);
    const runtimeRng = random.createSeededRandom(runtimeSeed);
    const runtimeValue = runtimeRng.next();
    assert(runtimeValue >= 0 && runtimeValue < 1);
    rows.push(['T16', 'createRuntimeSeed returns a usable seed', 'pass']);

    return rows;
}

const rows = runTests();
rows.forEach(([id, name, status]) => {
    console.log(`${id} ${status} - ${name}`);
});
console.log('All practice random tests passed.');
