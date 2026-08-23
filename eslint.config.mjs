/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — ESLint flat config
   ═══════════════════════════════════════════════════════════════════════════ */

import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default defineConfig(
  // ─── Ignored output directories ───────────────────────────────────────────
  {
    ignores: ['build/**', 'dist/**', 'coverage/**', 'test-results/**'],
  },

  // ─── Base: JS + TypeScript recommended ────────────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },

  // ─── Main process + preload (Node) ────────────────────────────────────────
  {
    files: ['main.ts', 'preload.ts', 'main/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser, // preload + main touch window/BrowserWindow APIs
      },
    },
    rules: {
      // Electron main/preload intentionally use CJS require()
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ─── Renderer + shared DOM typings (browser) ──────────────────────────────
  {
    files: ['renderer/**/*.ts', 'types/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, // preload bridge types referenced in globals.d.ts
      },
    },
  },

  // ─── Vitest tests (jsdom environment, globals: true) ─────────────────────
  {
    files: ['tests/unit/**/*.ts', 'tests/integration/**/*.ts', 'tests/setup.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.vitest,
      },
    },
  },

  // ─── Playwright e2e tests ─────────────────────────────────────────────────
  {
    files: ['tests/e2e/**/*.ts', 'playwright.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      // require('electron') resolves the binary path at runtime
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ─── Build scripts & JS configs (Node) ────────────────────────────────────
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.cjs', 'vitest.config.js', 'eslint.config.mjs', '.dependency-cruiser.cjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // CJS build hooks (e.g. scripts/after-pack.cjs) use require()/module
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ─── Project-wide rule adjustments ────────────────────────────────────────
  {
    rules: {
      // Migration-era code intentionally uses any in several places
      '@typescript-eslint/no-explicit-any': 'warn',
      // Empty functions are used for event-handler stubs
      '@typescript-eslint/no-empty-function': 'off',
      // Defensive try/catch blocks may swallow errors silently
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Catch clauses may omit the binding
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  }
);
