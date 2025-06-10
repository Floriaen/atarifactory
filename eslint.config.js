module.exports = [
  {
    ignores: [
      'eslint.config.js',
      'server/eslint.config.js',
      'server/**/*.json',
      'server/**/*.html',
      'server/**/*.css',
      'server/**/*.log',
      'server/**/*.txt',
    ],
  },
  // Node.js backend files
  {
    files: ['server/**/*.js', '!server/**/assets/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
    },
  },
  // Browser game asset and control bar files
  {
    files: ['server/**/assets/*.js', 'server/controlBar/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        CustomEvent: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        alert: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
    },
  },
]; 