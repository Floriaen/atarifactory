const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  resolve: {

  },
  ssr: {
    noExternal: ['@langchain/core'],
  },
  optimizeDeps: {
    include: ['@langchain/core'],
  },
  test: {
    globals: true,
    include: [
      'server/**/*.test.mjs',
      'server/**/*.spec.mjs'
    ],
    server: {
      deps: {
        interopDefault: true,
        inline: ['@langchain/core']
      }
    },
    setupFiles: ['./vitest.setup.js']
  }
});
