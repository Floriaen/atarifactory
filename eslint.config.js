module.exports = [
  {
    ignores: [
      'node_modules',
      'coverage',
      'logs',
      'dist',
      '*.min.js',
      'server/games/',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
    },
  },
  {
    files: ['frontend/src/main.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2021,
      globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' },
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
        jest: 'readonly',
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