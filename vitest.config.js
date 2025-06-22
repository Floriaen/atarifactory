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
      'server/**/*.test.mjs',
      'server/**/*.spec.mjs'
    ],
    server: {
      deps: {
        interopDefault: true,
        inline: ['@langchain/core']
      }
    }
  }
});
