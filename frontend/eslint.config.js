import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'public',
    // Phaser scene code is imported from legacy game templates and is not yet
    // typed/lint-clean. Keep app-facing React code linted while avoiding noisy
    // failures from runtime game internals and shader assets.
    'src/features/games/**/scenes',
    'src/features/games/**/game',
    'src/features/games/components/GameConsoleWrapper.tsx',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
