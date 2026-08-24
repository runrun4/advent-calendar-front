# 開発の進め方

advent-calendar-front を複数人で継続開発するための取り決め。
環境構築そのものは [README.md](README.md)、デプロイの詳細は [docs/deployment.md](docs/deployment.md) を参照。

## ブランチ戦略

`develop` が統合ブランチ。ここに入ったものが本番へ出る。

```
feature/xxx ──┐
              ├─ PR ─→ レビュー ─→ マージ ─→ develop ─→ 本番へ自動デプロイ
fix/xxx ──────┘
```

1. `develop` から作業ブランチを切る
2. 作業してコミットする（pre-commit フックが lint と型チェックを走らせる）
3. `develop` 宛てに PR を出す（テンプレートが自動で入る）
4. CI が緑になり、レビューが承認されたらマージする
5. マージされると本番URLへ自動デプロイされる

**`develop` へ直接 push しない。** 必ず PR を経由する。

### ブランチ名

| 接頭辞 | 用途 |
|--------|------|
| `feature/` | 機能追加 |
| `fix/` | バグ修正 |
| `chore/` | 開発環境・設定・依存の整備 |
| `docs/` | ドキュメントのみ |
| `style/` | 見た目の調整 |

### コミットメッセージ

日本語で、何をしたかが1行目で分かるように書く。`種別: 要約` の形を推奨。

```
fix: 協力デイの鎖の本数を必要人数(requiredCount)に合わせる
```

## 開発コマンド

| コマンド | 内容 |
|---------|------|
| `npm run dev` | 開発サーバー（https://localhost:5173） |
| `npm run lint` | ESLint |
| `npm run test` | ユニットテストを1回実行（CI と同じ） |
| `npm run test:watch` | ファイル変更を監視してテストを再実行 |
| `npm run typecheck` | 型チェックのみ（`tsc -b`） |
| `npm run build` | 本番ビルド（型チェック込み） |
| `npm run preview` | ビルド結果のプレビュー |

Docker で開発する場合の起動方法は [README.md](README.md) を参照。

## テスト

- フレームワークは **Vitest**、コンポーネントは **React Testing Library**。
- 設定は `vite.config.ts` の `test` セクション、共通の前処理は `src/test/setup.ts`。
- テストファイルは対象と同じ場所に `対象名.test.ts(x)` で置く。
  例: `src/components/board/boardGeometry.ts` → `src/components/board/boardGeometry.test.ts`
- `describe` / `it` / `expect` は `vitest` から import する（グローバルは有効にしていない）。

```ts
import { describe, expect, it } from 'vitest'
```

### 何にテストを書くか

優先度が高い順に:

1. **純粋関数**（座標計算、日付・レイアウトの組み立て、payload の正規化など）
   壊れると気付きにくく、テストが最も安く書ける。
2. **画面の分岐**（表示/非表示、無効化、エラー表示）
   React Testing Library で「利用者から見える形」を検証する。実装の内部状態は見ない。
3. API 通信そのものは対象外。呼び出し側のロジックを切り出してテストする。

ロジックを足す PR では、テストも一緒に足すこと。

## pre-commit フック

husky + lint-staged を使っている。`npm ci` / `npm install` 時に `prepare` スクリプトが自動でセットアップするので、個別の作業は不要。

コミット時に走るもの（`.husky/pre-commit`）:

1. `lint-staged` — ステージした `.ts` / `.tsx` に ESLint
2. `tsc -b` — プロジェクト全体の型チェック（約2秒）

型エラーはステージしたファイルだけでは判定できないため、全体を検査している。
テストとビルドは時間がかかるのでフックには入れず、CI に任せている。

どうしても止められない事情があるときだけ `git commit --no-verify` で回避できるが、CI で同じ検査に引っかかる。

## CI

`develop` 宛ての PR と `develop` への push で [.github/workflows/ci.yml](.github/workflows/ci.yml) が動く。

| ステップ | 内容 |
|---------|------|
| `npm ci` | 依存インストール（Node 22） |
| `npm run lint` | ESLint |
| `npm run test` | ユニットテスト |
| `npm run build` | ビルド（`tsc -b` による型チェックを兼ねる） |

**警告（warning）について:** ハッカソン期間に溜まった既存の規則違反を `eslint.config.js` で一時的に `warn` へ落としている（`react-hooks/set-state-in-effect` など）。CI は警告では落ちないが、**新しく警告を増やさないこと**。既存分は別 PR で順次 `error` に戻していく。

## デプロイの流れ

詳細は [docs/deployment.md](docs/deployment.md)。

| きっかけ | 動くもの | 結果 |
|---------|---------|------|
| `develop` 宛ての PR 作成・更新 | [deploy-preview.yml](.github/workflows/deploy-preview.yml) | プレビューURLへデプロイし、PR にコメントで URL を通知 |
| `develop` へ push（PR マージ含む） | [deploy.yml](.github/workflows/deploy.yml) | 本番 https://advent-calendar-front.pages.dev/ へ反映 |

プレビューURLは本番に影響しない。スマホでの確認はプレビューURLを使うのが早い。

## 環境変数

- 本番ビルド用の値はコミット済みの `.env.production` にある。
- ローカル用は `.env`（gitignore 済み）に置く。
- **公開可能な値のみを置く。** service key などの秘密情報は絶対にコミットしない。
- 変数一覧は [docs/deployment.md](docs/deployment.md) を参照。
