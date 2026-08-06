(function (root) {
    'use strict';

    const ALLOWED_TYPES = new Set([
        'addition-subtraction',
        'multiplication',
        'rref',
        'linear-system'
    ]);

    const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
    const ALLOWED_SOLUTION_TYPES = new Set(['unique', 'none', 'infinite']);

    function assertPlainObject(value, name) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`${name} must be an object.`);
        }
    }

    function assertNonEmptyString(value, name) {
        if (typeof value !== 'string' || value.trim() === '') {
            throw new Error(`${name} must be a non-empty string.`);
        }
    }

    function hasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function clonePlainObject(value, name) {
        if (value == null) return {};
        assertPlainObject(value, name);
        return Object.assign({}, value);
    }

    function normalizeOptionalString(value, name) {
        if (value == null) return null;
        if (typeof value !== 'string') {
            throw new Error(`${name} must be a string when provided.`);
        }
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }

    function sanitizeIdPart(value) {
        return String(value)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'item';
    }

    function createProblemId(type, seed, index) {
        if (!Number.isInteger(index) || index < 0) {
            throw new Error('index must be a non-negative integer.');
        }

        return [
            'practice',
            sanitizeIdPart(type),
            sanitizeIdPart(seed),
            String(index + 1)
        ].join('-');
    }

    function createProblem(data) {
        assertPlainObject(data, 'problem data');
        assertNonEmptyString(data.id, 'id');
        assertNonEmptyString(data.type, 'type');

        if (!ALLOWED_TYPES.has(data.type)) {
            throw new Error(`Unsupported problem type: ${data.type}`);
        }

        if (!ALLOWED_DIFFICULTIES.has(data.difficulty)) {
            throw new Error(`Unsupported difficulty: ${String(data.difficulty)}`);
        }

        if (!hasOwn(data, 'inputs')) {
            throw new Error('inputs is required.');
        }

        if (!hasOwn(data, 'exactAnswer')) {
            throw new Error('exactAnswer is required.');
        }

        if (data.steps != null && !Array.isArray(data.steps)) {
            throw new Error('steps must be an array.');
        }
        const steps = data.steps == null ? [] : data.steps.slice();

        const solutionType = data.solutionType == null ? null : data.solutionType;
        if (solutionType !== null && !ALLOWED_SOLUTION_TYPES.has(solutionType)) {
            throw new Error(`Unsupported solutionType: ${String(solutionType)}`);
        }

        return {
            id: data.id,
            type: data.type,
            subtype: normalizeOptionalString(data.subtype, 'subtype'),
            difficulty: data.difficulty,
            inputs: data.inputs,
            exactAnswer: data.exactAnswer,
            steps,
            solutionType,
            dimensions: clonePlainObject(data.dimensions, 'dimensions'),
            metadata: clonePlainObject(data.metadata, 'metadata')
        };
    }

    function createProblemSet(data) {
        assertPlainObject(data, 'problem set data');
        assertNonEmptyString(data.id, 'id');
        assertNonEmptyString(data.type, 'type');

        if (!hasOwn(data, 'seed')) {
            throw new Error('seed is required.');
        }

        if (!Array.isArray(data.problems)) {
            throw new Error('problems must be an array.');
        }

        const ids = new Set();
        data.problems.forEach((problem, index) => {
            if (!problem || typeof problem !== 'object') {
                throw new Error(`problem at index ${index} must be an object.`);
            }
            assertNonEmptyString(problem.id, `problem id at index ${index}`);
            if (ids.has(problem.id)) {
                throw new Error(`Duplicate problem id: ${problem.id}`);
            }
            ids.add(problem.id);
        });

        return {
            id: data.id,
            seed: data.seed,
            type: data.type,
            settings: clonePlainObject(data.settings, 'settings'),
            problems: data.problems.slice(),
            metadata: clonePlainObject(data.metadata, 'metadata')
        };
    }

    const api = {
        createProblem,
        createProblemSet,
        createProblemId,
        sanitizeIdPart,
        ALLOWED_TYPES: Array.from(ALLOWED_TYPES),
        ALLOWED_DIFFICULTIES: Array.from(ALLOWED_DIFFICULTIES),
        ALLOWED_SOLUTION_TYPES: Array.from(ALLOWED_SOLUTION_TYPES)
    };

    root.MatrixPractice = root.MatrixPractice || {};
    root.MatrixPractice.problemModel = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
