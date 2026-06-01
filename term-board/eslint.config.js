import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // ビルド成果物・依存・E2E 成果物は対象外
  { ignores: ['dist', 'node_modules', 'coverage', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // React Hooks の定番2ルール（誤用は error、依存配列は warn）
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Fast Refresh を壊さないため、コンポーネント以外の同時 export を警告
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Vitest など Node/テスト環境のグローバルを許可
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
)
