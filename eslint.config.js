import unusedImports from 'eslint-plugin-unused-imports';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import svelteParser from 'svelte-eslint-parser';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', '.svelte-kit/**'],
  },
  {
    files: ['**/*.ts', '**/*.js'],
    plugins: {
      'unused-imports': unusedImports,
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: { parser: tsParser },
    rules: {
      'unused-imports/no-unused-imports': 'error',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    plugins: {
      'unused-imports': unusedImports,
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
      },
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
    },
  },
];
