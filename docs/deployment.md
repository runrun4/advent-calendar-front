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

## PRプレビュー（マージ前の実装確認）

`develop` 宛ての PR を作成・更新すると、[.github/workflows/deploy-preview.yml](../.github/workflows/deploy-preview.yml) がプレビューURLへデプロイし、**PRコメントでURLを知らせる**。マージ前の実装をスマホ含む誰でも確認できる。本番URLには影響しない。

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

本番ビルド用の値はコミット済みの [.env.production](../.env.production) にある（CI もこれを使う）。ローカル開発用は `.env` に置く。**いずれも公開可能な値のみ**（anon key は publishable。service key 等の秘密は絶対に置かない）。

| 変数 | 本番値 |
|------|--------|
| `VITE_API_BASE_URL` | `https://desktop-9gkkfh7.tail2963e9.ts.net`（Go API のTailscale Funnel公開URL。パスは `/v1/...`、正本: docs/api/openapi.yaml） |
| `VITE_SUPABASE_URL` | `https://rpodwxfqagpwnuspfyxw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `.env.production` 参照（Supabase ダッシュボード > Settings > API の publishable key） |

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

- [x] Go API のトンネルURL発行 → `https://desktop-9gkkfh7.tail2963e9.ts.net`（Tailscale Funnel）で確定
- [x] `src/services/` への環境変数導入 → 実装済み。本番値は `.env.production` をコミット
