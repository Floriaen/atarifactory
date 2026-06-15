import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // The web app is built/typechecked by Vite (DOM + JSX); lint covers core + admin/server.
  { ignores: ['dist', 'runs', 'node_modules', 'admin/web'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // The M3 runtime templates are browser scripts (window/document/canvas globals) run in the
  // headless sandbox and `make play`, not Node modules — and their globals (renderEntity,
  // drawBackground…) read as "unused" within their own file. They're verified by the sandbox tests.
  {
    files: ['src/coding/templates/**/*.js'],
    languageOptions: { sourceType: 'script' },
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },
  // ── Network boundary (docs/consumer-boundary.md) ────────────────────────────
  // The admin is a pure REST client of the pipeline. It may import ONLY the shared
  // contracts package — never the factory core (`src/`), the pipeline host (`server/`),
  // nor the Anthropic SDK (it never calls Claude; the pipeline does).
  {
    files: ['admin/server/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src/**', '**/server/**'],
              message:
                'admin must not link the factory in-process — import @game-factory/contracts and call the pipeline REST API.',
            },
            {
              group: ['@anthropic-ai/*', '@anthropic-ai/**'],
              message: 'admin never calls Claude directly — the pipeline service owns provider calls.',
            },
          ],
        },
      ],
    },
  },
  // The factory core and its service host must not depend on any consumer (the admin).
  {
    files: ['src/**/*.ts', 'server/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/admin/**'], message: 'the factory must depend on no consumer — see consumer-boundary.md.' },
          ],
        },
      ],
    },
  },
);
