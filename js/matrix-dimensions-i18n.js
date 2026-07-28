(function (root) {
    'use strict';

    const warnedKeys = new Set();

    const dictionaries = {
        en: {
            urls: {
                checkerUrl: '/en/matrix-multiplication-dimensions.html',
                calculatorUrl: '/en/matrix-multiplication-calculator.html'
            },
            matrixA: 'Matrix A',
            matrixB: 'Matrix B',
            notDefined: 'Not defined',
            pageAbPossible: 'A \u00d7 B is possible',
            pageAbNotPossible: 'A \u00d7 B is not possible',
            pageBaPossible: 'B \u00d7 A is also possible',
            pageBaNotPossible: 'B \u00d7 A is not possible',
            pageMatrixSize: ({ matrix, size }) => `${matrix}: ${size}`,
            pageAbPossibleExplanation: 'The inner dimensions match, so A \u00d7 B is defined. The result keeps the rows of A and the columns of B.',
            pageAbNotPossibleExplanation: ({ colsA, rowsB }) => `For A \u00d7 B to be defined, the columns of Matrix A must equal the rows of Matrix B. Here, ${colsA} does not equal ${rowsB}.`,
            pageSuggestionBRows: ({ rows }) => `Change Matrix B to have ${rows} rows.`,
            pageSuggestionAColumns: ({ columns }) => `Change Matrix A to have ${columns} columns.`,
            pageBaPossibleExplanation: 'The reverse order is defined for these dimensions, but it may produce a different result size.',
            pageBaNotPossibleExplanation: ({ colsB, rowsA }) => `The reverse order is not defined because the columns of Matrix B (${colsB}) do not equal the rows of Matrix A (${rowsA}).`,
            inlineStatusValid: 'A \u00d7 B is valid',
            inlineStatusInvalid: 'A \u00d7 B is not defined',
            inlineInner: ({ comparison }) => `Inner dimensions: ${comparison}`,
            inlineResult: ({ size }) => `Result size: ${size}`,
            inlineReverseValid: ({ size }) => `B \u00d7 A: valid, result ${size}`,
            inlineReverseInvalid: 'B \u00d7 A: not defined',
            inlineInvalidSuggestion: ({ rows, columns }) => `Use ${rows} rows for Matrix B or ${columns} columns for Matrix A.`,
            detailTitle: 'Matrix multiplication is not possible',
            detailWhyTitle: 'Why A \u00d7 B is not defined',
            detailWhyText: 'A \u00d7 B requires the number of columns in Matrix A to equal the number of rows in Matrix B.',
            detailMatrixAColumns: 'Matrix A columns:',
            detailMatrixBRows: 'Matrix B rows:',
            detailHowTitle: 'How to make A \u00d7 B possible',
            detailOr: 'or',
            detailBaTitle: 'What about B \u00d7 A?',
            detailBaPossible: 'B \u00d7 A is possible.',
            detailBaNotPossible: 'B \u00d7 A is not possible.',
            detailInnerLabel: 'Inner dimensions:',
            detailResultLabel: 'Result dimensions:',
            detailFullTitle: 'Full checker',
            detailFullText: 'Use the full dimensions checker to test other row and column combinations before entering matrix values.',
            detailSuggestionB: ({ rows }) => `Change Matrix B to have ${rows} rows`,
            detailSuggestionA: ({ columns }) => `Change Matrix A to have ${columns} columns`,
            inlineCheckerLink: 'Check other matrix dimensions',
            detailCheckerLink: 'Open the full Dimensions Checker',
            detailCloseLabel: 'Close dimension explanation',
            pageOpenCalculator: 'Open the Matrix Multiplication Calculator'
        },
        es: {
            urls: {
                checkerUrl: '/es/matrix-multiplication-dimensions.html',
                calculatorUrl: '/es/matrix-multiplication-calculator.html'
            },
            matrixA: 'Matriz A',
            matrixB: 'Matriz B',
            notDefined: 'No definida',
            pageAbPossible: 'A \u00d7 B est\u00e1 definida',
            pageAbNotPossible: 'A \u00d7 B no est\u00e1 definida',
            pageBaPossible: 'B \u00d7 A tambi\u00e9n est\u00e1 definida',
            pageBaNotPossible: 'B \u00d7 A no est\u00e1 definida',
            pageMatrixSize: ({ matrix, size }) => `${matrix}: ${size}`,
            pageAbPossibleExplanation: 'Las dimensiones internas coinciden, por lo que A \u00d7 B est\u00e1 definida. El resultado conserva las filas de A y las columnas de B.',
            pageAbNotPossibleExplanation: ({ colsA, rowsB }) => `Para que A \u00d7 B est\u00e9 definida, las columnas de la matriz A deben ser iguales a las filas de la matriz B. Aqu\u00ed, ${colsA} no es igual a ${rowsB}.`,
            pageSuggestionBRows: ({ rows }) => `Cambia la matriz B para que tenga ${rows} filas.`,
            pageSuggestionAColumns: ({ columns }) => `Cambia la matriz A para que tenga ${columns} columnas.`,
            pageBaPossibleExplanation: 'El orden inverso est\u00e1 definido para estas dimensiones, aunque puede producir un tama\u00f1o de resultado diferente.',
            pageBaNotPossibleExplanation: ({ colsB, rowsA }) => `El orden inverso no est\u00e1 definido porque las columnas de la matriz B (${colsB}) no son iguales a las filas de la matriz A (${rowsA}).`,
            inlineStatusValid: 'A \u00d7 B est\u00e1 definida',
            inlineStatusInvalid: 'A \u00d7 B no est\u00e1 definida',
            inlineInner: ({ comparison }) => `Dimensiones internas: ${comparison}`,
            inlineResult: ({ size }) => `Tama\u00f1o del resultado: ${size}`,
            inlineReverseValid: ({ size }) => `B \u00d7 A: definida, resultado ${size}`,
            inlineReverseInvalid: 'B \u00d7 A: no definida',
            inlineInvalidSuggestion: ({ rows, columns }) => `Usa ${rows} filas para la matriz B o ${columns} columnas para la matriz A.`,
            detailTitle: 'La multiplicaci\u00f3n de matrices no est\u00e1 definida',
            detailWhyTitle: 'Por qu\u00e9 A \u00d7 B no est\u00e1 definida',
            detailWhyText: 'A \u00d7 B requiere que el n\u00famero de columnas de la matriz A sea igual al n\u00famero de filas de la matriz B.',
            detailMatrixAColumns: 'Columnas de la matriz A:',
            detailMatrixBRows: 'Filas de la matriz B:',
            detailHowTitle: 'C\u00f3mo hacer que A \u00d7 B est\u00e9 definida',
            detailOr: 'o',
            detailBaTitle: '\u00bfQu\u00e9 ocurre con B \u00d7 A?',
            detailBaPossible: 'B \u00d7 A tambi\u00e9n est\u00e1 definida.',
            detailBaNotPossible: 'B \u00d7 A no est\u00e1 definida.',
            detailInnerLabel: 'Dimensiones internas:',
            detailResultLabel: 'Dimensiones del resultado:',
            detailFullTitle: 'Comprobador completo',
            detailFullText: 'Usa el comprobador completo de dimensiones para probar otras combinaciones de filas y columnas antes de introducir valores.',
            detailSuggestionB: ({ rows }) => `Cambia la matriz B para que tenga ${rows} filas`,
            detailSuggestionA: ({ columns }) => `Cambia la matriz A para que tenga ${columns} columnas`,
            inlineCheckerLink: 'Comprobar otras dimensiones de matrices',
            detailCheckerLink: 'Abrir el comprobador completo de dimensiones',
            detailCloseLabel: 'Cerrar la explicaci\u00f3n de dimensiones',
            pageOpenCalculator: 'Abrir la calculadora de multiplicaci\u00f3n de matrices'
        }
    };

    function detectLanguage() {
        const pathname = root.location && root.location.pathname ? root.location.pathname : '';
        const htmlLang = root.document && root.document.documentElement ? root.document.documentElement.lang : '';

        if (pathname.indexOf('/es/') === 0) {
            return 'es';
        }

        if (pathname.indexOf('/en/') === 0) {
            return 'en';
        }

        if (String(htmlLang).toLowerCase().indexOf('es') === 0) {
            return 'es';
        }

        return 'en';
    }

    function getLanguage() {
        const language = detectLanguage();
        return dictionaries[language] ? language : 'en';
    }

    function warnMissing(language, key) {
        const warningKey = `${language}:${key}`;
        if (warnedKeys.has(warningKey)) {
            return;
        }

        warnedKeys.add(warningKey);
        if (root.console && typeof root.console.warn === 'function') {
            root.console.warn(`Missing MatrixDimensionsI18n key: ${warningKey}`);
        }
    }

    function getText(key) {
        const language = getLanguage();
        const dictionary = dictionaries[language] || dictionaries.en;

        if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
            return dictionary[key];
        }

        warnMissing(language, key);
        return dictionaries.en[key] || '';
    }

    function safeParams(params) {
        const source = params && typeof params === 'object' ? params : {};
        const output = {};

        Object.keys(source).forEach((key) => {
            output[key] = String(source[key]);
        });

        return output;
    }

    function t(key, params) {
        const value = getText(key);

        if (typeof value === 'function') {
            return value(safeParams(params));
        }

        return String(value);
    }

    function getUrls() {
        const language = getLanguage();
        const dictionary = dictionaries[language] || dictionaries.en;
        return dictionary.urls || dictionaries.en.urls;
    }

    root.MatrixDimensionsI18n = {
        detectLanguage,
        getLanguage,
        getText,
        t,
        getUrls
    };
})(typeof window !== 'undefined' ? window : globalThis);
