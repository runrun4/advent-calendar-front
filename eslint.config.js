import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
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
    rules: {
      // 未使用でも意図的に受けている引数は `_` 始まりで表す(未実装のスタブなど)。
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // eslint-plugin-react-hooks v7 の規則。ハッカソン期間は警告へ落としていたが、
      // 既存の違反を解消したので error に戻した。どうしても避けられない箇所だけ
      // 理由コメント付きの eslint-disable-next-line を置いている。
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/static-components': 'error',
      'react-refresh/only-export-components': 'error',
    },
  },
  {
    // テストは Vite の HMR 対象ではないので、react-refresh の制約は不要。
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
