import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.js', 'tests/unit/**/*.test.js'],
    environment: 'jsdom',
  },
});
