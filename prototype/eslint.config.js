import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      'node_modules',
      'coverage',
      'logs',
      'dist',
      '*.min.js',
      'server/games/',
      'eslint.config.js',
      'server/eslint.config.js',
      'server/**/*.json',
      'server/**/*.html',
      'server/**/*.css',
      'server/**/*.log',
      'server/**/*.txt',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        // require: 'readonly', // Not available in ESM
        // module: 'readonly', // Not available in ESM 
        // __dirname: 'readonly', // Not available in ESM
        process: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {},
  },
  {
    files: ['server/tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        // Using Vitest globals instead of Jest
      },
    },
    rules: {},
  },
  {
    files: ['server/games/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        CustomEvent: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      // import plugin rules
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/export': 'error',
    },
    plugins: {
      import: importPlugin,
    },
  },
  {
    files: ['server/tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        // Using Vitest globals instead of Jest
      },
    },
    rules: {},
  },
  {
    files: ['server/games/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        CustomEvent: 'readonly',
      },
    },
    rules: {},
  },
];