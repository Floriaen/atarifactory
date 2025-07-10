import { defineConfig } from 'vitest/config';

export default defineConfig({
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
      'server/**/*.test.js',
      'server/**/*.spec.js'
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
