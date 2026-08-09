# advent-calendar-front

アドベントカレンダーアプリのフロントエンド（React + TypeScript + Vite + PWA）です。

## 必要環境

- Node.js 22（ローカルで `npm` を使う場合）
- Docker Desktop（推奨。Windows は **WSL2 バックエンド** を有効化）

Mac / Linux / Windows(WSL2) では、Docker を使うと同じコマンドで起動できます。

**スマホ確認・チーム向けの詳細手順:** [docs/team-setup-and-mobile.md](docs/team-setup-and-mobile.md)

## Docker で開発する（推奨）

### 準備（Windows / WSL）

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) をインストールし、WSL2 統合を有効にする
2. リポジトリは **WSL の Linux ファイルシステム上**に置く（例: `~/projects/advent-calendar-front`）
   - `/mnt/c/...` 配下だと遅延や HMR 不安定の原因になる
3. WSL ターミナルで確認する:

```bash
docker compose version
```

### 開発サーバー起動

```bash
docker compose up --build
```

ブラウザで [http://localhost:5173](http://localhost:5173) を開く。

停止は `Ctrl+C`、または別ターミナルで `docker compose down`。

### 本番相当の確認

```bash
docker compose -f docker-compose.prod.yml up --build
```

ブラウザで [http://localhost:8080](http://localhost:8080) を開く。

## ローカル（Docker なし）で開発する

```bash
npm ci
npm run dev
```

## よく使うスクリプト

| コマンド | 内容 |
|---------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLint |

## Docker 関連ファイル

| ファイル | 役割 |
|---------|------|
| `Dockerfile.dev` | 開発用イメージ |
| `docker-compose.yml` | 開発用 Compose（Vite / 5173） |
| `Dockerfile` | 本番用マルチステージビルド |
| `nginx.conf` | SPA 向け nginx 設定 |
| `docker-compose.prod.yml` | 本番相当の確認用（8080） |
| `.dockerignore` | ビルドコンテキストから除外するファイル |
