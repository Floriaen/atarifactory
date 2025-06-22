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
    server: {
      deps: {
        interopDefault: true,
        inline: ['@langchain/core']
      }
    }
  }
});
