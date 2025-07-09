import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './server/tests/playwright', // Only run tests in this directory
  /* You can add more config options here as needed */
});
