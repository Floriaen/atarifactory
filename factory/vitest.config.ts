import { defineConfig } from 'vitest/config';

// e2e tests gate themselves with `describe.runIf(process.env.RUN_REAL_LLM)`,
// so the default run includes them but they no-op without the flag.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/**'],
    setupFiles: ['test/setup.ts'],
  },
});
