export default [
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
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
    // Only critical rules that affect functionality
    'no-undef': 'error',
    'no-empty': 'off',
    'no-unreachable': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-unused-expressions': 'error',
    'valid-typeof': 'error',
    // Disable style and best practice rules
    'no-unused-vars': 'off',
    'no-console': 'off',
    'semi': 'off',
    'quotes': 'off',
    'indent': 'off',
    'comma-dangle': 'off',
    'arrow-parens': 'off',
    'object-curly-spacing': 'off',
    'array-bracket-spacing': 'off',
    'space-before-function-paren': 'off',
    'space-before-blocks': 'off',
    'keyword-spacing': 'off',
    'space-infix-ops': 'off',
    'comma-spacing': 'off',
    'key-spacing': 'off',
    'no-multiple-empty-lines': 'off',
    'no-trailing-spaces': 'off',
    'no-whitespace-before-property': 'off',
    'no-multi-spaces': 'off',
    'no-mixed-spaces-and-tabs': 'off',
    'no-tabs': 'off',
    'no-spaced-func': 'off',
    'no-sparse-arrays': 'off',
    'no-extra-semi': 'off',
    'no-extra-parens': 'off',
    'no-extra-boolean-cast': 'off',
    'no-extra-label': 'off',
    'no-extra-bind': 'off',
    'no-extra-new': 'off',
    'no-extra-comma': 'off'
  }
  }
];