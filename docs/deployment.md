# デプロイと繋ぎ込みガイド

フロントエンドのデプロイ先と、バックエンド（Go API / Supabase）との繋ぎ込みに必要な情報をまとめる。

## 本番URL

| 項目 | 値 |
|------|-----|
| 本番URL | **https://advent-calendar-front.pages.dev/** |
| ホスティング | Cloudflare Pages（プロジェクト名 `advent-calendar-front`） |
| production branch | `main` |
| 決定の経緯 | 正本 docs の DEC-051（decisions-and-open-questions.md） |

HTTPS 標準対応のため PWA 要件（TR-804）を満たす。SPA フォールバック・`manifest.webmanifest`・`sw.js` の配信は確認済み。

## 自動デプロイ（develop マージで本番反映）

`develop` へ push（PRマージ含む）されると、GitHub Actions（[.github/workflows/deploy.yml](../.github/workflows/deploy.yml)）がビルドして本番URLへ自動デプロイする。手動実行も Actions タブの `deploy` > Run workflow から可能。

**初回セットアップ（1回だけ・要人間操作）:**

1. Cloudflare ダッシュボード > My Profile > API Tokens で、権限 `Cloudflare Pages: Edit`（対象アカウント限定）のトークンを作成する
2. リポジトリの Settings > Secrets and variables > Actions に `CLOUDFLARE_API_TOKEN` として登録する（CLI なら `gh secret set CLOUDFLARE_API_TOKEN`）

Secret 未設定の間はワークフローのデプロイステップが失敗するだけで、マージ自体には影響しない。

## 手動デプロイ手順

Cloudflare アカウントに `wrangler login` 済みの環境で:

```bash
npm run build
npx wrangler pages deploy ./dist --project-name advent-calendar-front --branch main
```

- `--branch main` を付けると本番URL（`advent-calendar-front.pages.dev`）が更新される。付けない・別ブランチ名の場合はプレビューURL（`<hash>.advent-calendar-front.pages.dev`）になる。
- Service Worker は `autoUpdate` 設定のため、再デプロイすれば利用者側も自動で新バージョンに切り替わる。
- 設定は [wrangler.jsonc](../wrangler.jsonc)（`pages_build_output_dir: ./dist`）。

## フロント⇔バック繋ぎ込みに必要なもの

構成: フロント（Cloudflare Pages） ⇔ Go API（自宅PC + トンネル公開、DEC-049） ⇔ Supabase（DB/Auth/Realtime/Storage、DEC-034）

### フロント側で必要な環境変数（ビルド時に埋め込み）

サービス層（`src/services/`）実装時に以下を `import.meta.env` で参照する想定。`.env.production` / `.env.development` に置く（anon key は公開前提の値なのでコミット可）。

| 変数 | 内容 | 入手先 |
|------|------|--------|
| `VITE_API_BASE_URL` | Go API の公開URL（トンネルURL）。パスは `/v1/...`（正本: docs/api/openapi.yaml） | バックエンド担当がPC側トンネル設定後に共有（**現時点で未発行**） |
| `VITE_SUPABASE_URL` | Supabase プロジェクトURL | Supabase ダッシュボード > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key（Auth・Realtime購読・Storageアップロードに使用） | 同上 |

- 認証: Supabase Auth（メール+パスワード / Google、DEC-035）。Go API へは Supabase 発行 JWT を `Authorization: Bearer` で送る。
- チャット新着: Supabase Realtime で `chat_messages` を購読（DEC-036）。送信・履歴は Go API が正本。
- ページが HTTPS なので、API・WebSocket とも `https://` / `wss://` であること（トンネル・Supabase とも標準で満たす）。

### バックエンド側で必要な設定（runrun-backend の環境変数）

| 変数 | 設定値 |
|------|--------|
| `CORS_ALLOWED_ORIGINS` | `https://advent-calendar-front.pages.dev` を含める（別オリジンのため必須。TR-804） |
| `INVITE_URL_BASE` | `https://advent-calendar-front.pages.dev`（招待リンクの基点） |

その他のバックエンド環境変数は runrun-backend/README.md を参照。

## 未決・TODO

- [ ] Go API のトンネルURL発行（バックエンド担当のPCセットアップ時に確定）→ 確定後に `VITE_API_BASE_URL` と本表を更新する
- [ ] `src/services/` の実装時に上記環境変数を導入する（現状はスタブでAPI未接続）
