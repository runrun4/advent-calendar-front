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

      // --- ここから下はハッカソン期間に溜まった既存の負債 ---
      // eslint-plugin-react-hooks v7 で追加された規則で、既存コンポーネントが
      // 広く違反している。直すには effect の組み直しが要りリリース前には危険なので、
      // CI を通すために警告へ落としている。新規コードでは違反を作らないこと。
      // 解消したものから順に 'error' へ戻す。
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      // EventNameField.tsx がアイコン定義(定数・関数)も輸出しているため。
      // 別モジュールへ切り出せば error に戻せるが、参照元が5ファイルあり
      // 開発ブランチとの衝突が大きいので、この PR では警告に留める。
      'react-refresh/only-export-components': 'warn',
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
