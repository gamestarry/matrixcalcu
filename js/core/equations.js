// js/core/equations.js
// Equation-solution helper based on RREF augmented matrix
// This file does NOT compute RREF itself.
// It interprets the final RREF matrix as a linear system solution summary.

function isMatrix(M) {
    return Array.isArray(M) &&
        M.length > 0 &&
        Array.isArray(M[0]) &&
        M[0].length > 0;
}

function isZeroValue(v) {
    try {
        return math.equal(v, 0);
    } catch {
        return Number(v) === 0;
    }
}

function formatCell(v) {
    try {
        const f = math.fraction(v);

        if (f.n === 0) return '0';
        if (f.d === 1) return String(f.s * f.n);

        const sign = f.s < 0 ? '-' : '';
        return `${sign}${f.n}/${f.d}`;
    } catch {
        try {
            return math.format(v);
        } catch {
            return String(v);
        }
    }
}

export function analyzeSolutionFromRREF(rrefMatrix) {
    if (!isMatrix(rrefMatrix)) {
        return { type: 'unknown' };
    }

    const rows = rrefMatrix.length;
    const cols = rrefMatrix[0].length;

    // Need at least 1 variable + 1 RHS column
    if (cols < 2) {
        return { type: 'unknown' };
    }

    const varCount = cols - 1;

    // 1) Check inconsistent row: [0 0 ... 0 | nonzero]
    for (let i = 0; i < rows; i++) {
        let allZeroLeft = true;

        for (let j = 0; j < varCount; j++) {
            if (!isZeroValue(rrefMatrix[i][j])) {
                allZeroLeft = false;
                break;
            }
        }

        if (allZeroLeft && !isZeroValue(rrefMatrix[i][varCount])) {
            return { type: 'none' };
        }
    }

    // 2) Count pivots in coefficient part
    let pivotCount = 0;

    for (let i = 0; i < rows; i++) {
        let pivotCol = -1;

        for (let j = 0; j < varCount; j++) {
            if (!isZeroValue(rrefMatrix[i][j])) {
                pivotCol = j;
                break;
            }
        }

        if (pivotCol !== -1) {
            pivotCount++;
        }
    }

    // 3) Unique solution: one pivot per variable
    if (pivotCount === varCount) {
        const values = Array(varCount).fill(math.fraction ? math.fraction(0) : 0);

        for (let i = 0; i < rows; i++) {
            let pivotCol = -1;

            for (let j = 0; j < varCount; j++) {
                if (!isZeroValue(rrefMatrix[i][j])) {
                    pivotCol = j;
                    break;
                }
            }

            if (pivotCol !== -1) {
                values[pivotCol] = rrefMatrix[i][varCount];
            }
        }

        return { type: 'unique', values };
    }

    // 4) Otherwise treat as infinitely many solutions
    return { type: 'infinite' };
}

export function generateSolutionSummary(rrefMatrix) {
    const info = analyzeSolutionFromRREF(rrefMatrix);
    const varNames = ['x', 'y', 'z', 'w', 'v', 'u', 't', 's'];

    if (info.type === 'none') {
        return {
            title: 'Solution Summary',
            lines: ['No solution']
        };
    }

    if (info.type === 'infinite') {
        return {
            title: 'Solution Summary',
            lines: ['Infinitely many solutions']
        };
    }

    if (info.type === 'unique') {
        const lines = info.values.map((val, idx) => {
            const name = varNames[idx] || `x${idx + 1}`;
            return `${name} = ${formatCell(val)}`;
        });

        return {
            title: 'Solution Summary',
            lines
        };
    }

    return {
        title: 'Solution Summary',
        lines: ['Solution summary is unavailable.']
    };
}