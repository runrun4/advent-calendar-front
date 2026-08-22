# advent-calendar-front

アドベントカレンダーアプリのフロントエンド（React + TypeScript + Vite + PWA）です。

## 必要環境

- Node.js 22（ローカルで `npm` を使う場合）
- Docker Desktop（推奨。Windows は **WSL2 バックエンド** を有効化）

Windows PowerShell／CMD、Windows WSL2、Mac、LinuxからDocker開発環境を起動できます。

**スマホ確認・チーム向けの詳細手順:** [docs/team-setup-and-mobile.md](docs/team-setup-and-mobile.md)

**本番URL・デプロイ手順・バックエンド繋ぎ込み:** [docs/deployment.md](docs/deployment.md)（本番: https://advent-calendar-front.pages.dev/ ）

## Docker で開発する（推奨）

### 準備（Windows）

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) をインストールし、WSL2 統合を有効にする
2. PowerShell／CMDを使う場合はWindows側、WSL2を使う場合はWSLのLinuxファイルシステムにリポジトリを置く
3. 使用するターミナルで確認する:

```bash
docker compose version
```

### 開発サーバー起動

**Windows PowerShell／CMD:**

```powershell
.\scripts\docker-dev.cmd
```

**Windows WSL2／Mac／Linux:**

```bash
./scripts/docker-dev.sh
```

Windowsでは物理NIC（Wi-Fi／Ethernet）のIPv4をPowerShellで取得します。取得したIPをコンテナへ渡すため、Viteの `Network` にはスマホから開ける `https://<PCのIPv4>:5173/` が表示されます。また、起動時に `npm ci` が実行され、`node_modules` は `package-lock.json` の内容に同期されます。

IPv4を自動取得できない場合は明示して起動できます。

```powershell
.\scripts\docker-dev.cmd -HostLanIp 192.168.1.10
```

```bash
HOST_LAN_IP=192.168.1.10 ./scripts/docker-dev.sh
```

`docker compose up --build` を直接実行すると、ホストIPv4を取得できないため起動を停止して専用コマンドを案内します。

ブラウザで [https://localhost:5173](https://localhost:5173) を開く。

停止は `Ctrl+C`、または別ターミナルで `docker compose down`。

### 本番相当の確認

```bash
docker compose -f docker-compose.prod.yml up --build
```

ブラウザで [http://localhost:8080](http://localhost:8080) を開く。

## ローカル（Docker なし）で開発する

**Mac / Linux:**

```bash
npm ci
npm run dev
```

**Windows WSL2:** WSL2はNAT内にいるため、スマホ確認には Windows→WSL のポート転送が必要。初回に管理者PowerShellで `scripts\wsl-portproxy.ps1` を実行してから、WSL側で起動する:

```bash
./scripts/wsl-dev.sh
```

詳細: [docs/team-setup-and-mobile.md](docs/team-setup-and-mobile.md) のセクション8.2

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
