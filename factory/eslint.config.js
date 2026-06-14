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
);
