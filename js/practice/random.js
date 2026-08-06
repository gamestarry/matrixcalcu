(function (root) {
    'use strict';

    const UINT32_MAX_PLUS_ONE = 4294967296;
    const FNV_OFFSET = 2166136261;
    const FNV_PRIME = 16777619;

    function assertFiniteNumber(value, name) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Error(`${name} must be a finite number.`);
        }
    }

    function hashString(value) {
        let hash = FNV_OFFSET;
        for (let i = 0; i < value.length; i++) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, FNV_PRIME) >>> 0;
        }
        return hash >>> 0;
    }

    function normalizeSeed(seed) {
        if (typeof seed === 'number') {
            assertFiniteNumber(seed, 'seed');
            return Math.trunc(seed) >>> 0;
        }

        if (typeof seed === 'string') {
            const value = seed.trim();
            if (!value) {
                throw new Error('seed string must not be empty.');
            }
            return hashString(`string:${value}`);
        }

        throw new Error('seed must be a finite number or a non-empty string.');
    }

    function createSeededRandom(seed) {
        let state = normalizeSeed(seed);

        // Deterministic practice-problem PRNG. This is not for security,
        // cryptography, passwords, tokens, or any other secret generation.
        function next() {
            state = (state + 0x6D2B79F5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / UINT32_MAX_PLUS_ONE;
        }

        function int(min, max) {
            if (!Number.isInteger(min) || !Number.isInteger(max)) {
                throw new Error('int(min, max) requires integer boundaries.');
            }
            if (min > max) {
                throw new Error('int(min, max) requires min to be less than or equal to max.');
            }

            const span = max - min + 1;
            if (!Number.isSafeInteger(span) || span <= 0) {
                throw new Error('int(min, max) range is too large.');
            }
            return min + Math.floor(next() * span);
        }

        function bool(probability) {
            const p = probability == null ? 0.5 : probability;
            assertFiniteNumber(p, 'probability');
            if (p < 0 || p > 1) {
                throw new Error('probability must be between 0 and 1.');
            }
            return next() < p;
        }

        function pick(items) {
            if (!Array.isArray(items) || items.length === 0) {
                throw new Error('pick(items) requires a non-empty array.');
            }
            return items[int(0, items.length - 1)];
        }

        function shuffle(items) {
            if (!Array.isArray(items)) {
                throw new Error('shuffle(items) requires an array.');
            }

            const result = items.slice();
            for (let i = result.length - 1; i > 0; i--) {
                const j = int(0, i);
                const tmp = result[i];
                result[i] = result[j];
                result[j] = tmp;
            }
            return result;
        }

        return {
            next,
            int,
            bool,
            pick,
            shuffle
        };
    }

    function createRuntimeSeed() {
        const cryptoRef = root && root.crypto;
        if (cryptoRef && typeof cryptoRef.getRandomValues === 'function') {
            const values = new Uint32Array(1);
            cryptoRef.getRandomValues(values);
            return values[0] >>> 0;
        }

        const timePart = Date.now() >>> 0;
        const randomPart = Math.floor(Math.random() * UINT32_MAX_PLUS_ONE) >>> 0;
        return (timePart ^ randomPart) >>> 0;
    }

    const api = {
        normalizeSeed,
        createSeededRandom,
        createRuntimeSeed
    };

    root.MatrixPractice = root.MatrixPractice || {};
    root.MatrixPractice.random = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
