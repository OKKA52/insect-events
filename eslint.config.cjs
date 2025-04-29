// eslint.config.js
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unusedImports = require('eslint-plugin-unused-imports');
const reactPlugin = require('eslint-plugin-react');

const compat = new FlatCompat();

module.exports = [
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  ...compat.extends('next/core-web-vitals'),
  ...compat.extends('prettier'),

  // TypeScript用の設定本体（plugins, parser等）
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['node_modules/', '.next/'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: '.',
      },
      globals: {
        jest: true,
        describe: true,
        it: true,
        expect: true,
        React: true,
        JSX: true,
        window: true,
        sessionStorage: true,
        console: true,
        process: true,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      react: reactPlugin,
    },
    rules: {
      // 他のルール（ここでは警告される）
    },
  },

  // ⚠️ 最後にルール上書き専用オブジェクトを追加！
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
];
