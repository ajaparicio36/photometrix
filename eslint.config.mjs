import eslint from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['app/**', 'server/**', 'node_modules/**', '.local/**'] },
  eslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs', '*.mjs'],
    languageOptions: { globals: globals.node },
  },
];
