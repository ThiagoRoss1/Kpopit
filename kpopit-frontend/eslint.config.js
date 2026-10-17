import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  // build/ and .react-router/ are React Router's build output and generated route types.
  globalIgnores(['dist', 'build', '.react-router']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // React Compiler rules (new in react-hooks 7): existing code predates them, so warn
      // until the refactor fixes the spots listed in docs/react-compiler-warnings.md.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    // Route modules also export React Router's data/meta functions; its Vite plugin handles their HMR.
    files: ['app/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': ['error', {
        allowExportNames: ['loader', 'clientLoader', 'meta', 'links', 'Layout', 'HydrateFallback', 'ErrorBoundary'],
      }],
    },
  },
  {
    // Playwright reads a fixture's dependencies from its first parameter, so `({}, use)` is required.
    files: ['e2e/**/*.ts'],
    rules: { 'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }] },
  },
])
