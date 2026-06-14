import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // The web app is built/typechecked by Vite (DOM + JSX); lint covers core + admin/server.
  { ignores: ['dist', 'runs', 'node_modules', 'admin/web'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
