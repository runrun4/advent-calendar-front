# チーム向け: PC起動からスマホ確認まで

このドキュメントは **Mac / Windows(WSL2)** で開発サーバーを起動し、**スマホで画面確認**するまでの手順です。Cursor Agent もこのファイルを正として案内します。

## 1. 前提

| 項目 | 内容 |
|------|------|
| 対象 | `advent-calendar-front`（このリポジトリ） |
| 推奨 | Docker Desktop（環境差を吸収） |
| 代替 | Node.js 22 + `npm ci` / `npm run dev` |
| 開発URL | `https://localhost:5173` |
| 本番相当 | `http://localhost:8080`（`docker-compose.prod.yml`） |

## 2. 共通: リポジトリを用意する

```bash
git clone <リポジトリURL>
cd advent-calendar-front
```

既に clone 済みなら最新を取得する:

```bash
git pull
```

## 3. OS別の準備

### 3.1 Mac

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) をインストールして起動する
2. ターミナルで確認:

```bash
docker compose version
```

### 3.2 Windows（WSL2）

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) をインストールする
2. Settings → Resources → WSL Integration で使用するディストリを有効化する
3. **リポジトリは WSL 内の Linux ファイルシステムに置く**（例: `~/projects/advent-calendar-front`）
   - NG: `/mnt/c/Users/...`（遅い・HMRが不安定）
4. **WSL ターミナル**で確認:

```bash
docker compose version
```

## 4. 開発サーバーを起動する（Mac / Windows 共通）

プロジェクト直下で:

```bash
docker compose up --build
```

成功したら PC のブラウザで開く:

- 開発: [https://localhost:5173](https://localhost:5173)

停止:

```bash
docker compose down
```

### 本番ビルド相当の確認

```bash
docker compose -f docker-compose.prod.yml up --build
```

- PC: [http://localhost:8080](http://localhost:8080)

## 5. スマホで確認する（同じ Wi-Fi）

ローカル開発サーバーを、**PC と同じ Wi-Fi に繋がったスマホ**から見る手順です。

### 5.1 PC の LAN IP を調べる

> **⚠️ Windows(WSL2)の注意: ターミナルに表示される「Network:」の URL は使わない**
>
> Vite は起動時に `Network: https://172.x.x.x:5173` のような URL を表示するが、これは WSL / Docker コンテナ内部の仮想ネットワークの IP であり、**スマホから開くと必ずタイムアウトする**。スマホに入力するのは、必ず下記の手順で調べた **Windows ホストの LAN IP**（`192.168.x.x` など）。`hostname -I` や `ip addr` で見える eth0 の IP も同様に使えない。

**Mac:**

```bash
ipconfig getifaddr en0
```

取れない場合は `en1` なども試す。または「システム設定 → ネットワーク」で確認。

**Windows（PowerShell / CMD）:**

```bat
ipconfig
```

`IPv4 アドレス`（例: `192.168.1.10`）を使う。Docker Desktop 利用時も、基本はこの Windows 側の LAN IP でアクセスする。

**WSL 内のみで調べる場合:**

```bash
hostname -I | awk '{print $1}'
```

Docker Desktop 経由でポート公開しているときは、多くの場合 **Windows ホストの IPv4** をスマホに入力する。

### 5.2 スマホのブラウザで開く

| 用途 | URL 例 |
|------|--------|
| 開発（Vite） | `https://192.168.x.x:5173` |
| 本番相当（nginx） | `http://192.168.x.x:8080` |

`192.168.x.x` は手順 5.1 で調べた IP に置き換える。

開発サーバーは `@vitejs/plugin-basic-ssl` の自己署名証明書で HTTPS 配信している。初回アクセス時に証明書の警告が出るが、「詳細設定」→「続行」で開ける。iOS で Service Worker / PWA まで確認する場合はセクション7を参照。

### 5.3 つながらないとき

まず、どこまで届いているかを順番に切り分ける:

1. **PC で `https://localhost:5173`** が開く → コンテナとポート公開は正常
2. **PC 自身で `https://<LAN IP>:5173`**（localhost ではなく手順 5.1 の IP）が開く → ホスト側の待ち受けは正常。ここで失敗する場合は Windows ファイアウォールが原因のことが多い
3. **スマホで `https://<LAN IP>:5173`** が開く → 完了。2 が通って 3 だけ失敗する場合は、Wi-Fi の分離設定（AP アイソレーション）か、スマホが別ネットワークにいる

チェック項目:

- スマホに入力した URL が **eth0 / 172.x の IP になっていないか**（5.1 の警告を参照。最頻出の原因）
- PC とスマホが **同じ Wi-Fi** か確認（テザリングやゲストWi-Fiは別ネットワークになりやすい）
- `docker compose up` が落ちていないか確認
- PC のファイアウォールで 5173 / 8080 が遮断されていないか確認（Windows は「Windows セキュリティ → ファイアウォール → 詳細設定」で受信規則に TCP 5173 / 8080 の許可を追加する）
- Windows + WSL2 では、スマホに入力するのは WSL 内の `eth0` の IP（172.x など）ではなく **Windows ホストの LAN IP**。Docker Desktop がポートを Windows 側へ転送するため、WSL の IP には LAN から届かない
- Vite は `server.host: true` 済み。Docker でもポートがホストに publish されていること（`5173:5173` / `8080:80`）

## 6. 別の Wi-Fi / チーム全体で確認する

| やり方 | できること | できないこと |
|--------|------------|--------------|
| 各自 `docker compose up` | 自分のPC・同じWi-Fiの自分のスマホ | 別ネットワークの相手の画面を直接見る |
| Vercel / Netlify 等へデプロイ | 発行された `https://...` を共有すれば誰でも・どの回線でも確認 | （無料枠の制限に注意） |

**おすすめ:** `main`（または検証用ブランチ）を GitHub に push → Vercel/Netlify 連携で HTTPS URL を自動発行 → チームは URL をスマホで開くだけ。

## 7. iOS（Safari）と PWA の注意

- **Android (Chrome):** `http://` のローカルIPでも「ホーム画面に追加」や Service Worker が動きやすいことがある
- **iOS (Safari):** **HTTPS でないと** Service Worker / PWA インストールが正しく動かないことが多い
- そのため **iPhone で PWA まで確認したい**場合は、同一LANの `http://192.168.x.x` ではなく **デプロイ先の https URL** を使う

ローカル HTTPS（`@vitejs/plugin-basic-ssl`）は同一LAN向けの補助手段。チーム横断の本確認には使わない。

## 8. Docker なしで起動する場合

```bash
npm ci
npm run dev
```

スマホから見る場合も、PC の LAN IP + `:5173` でアクセスする（`vite.config.ts` の `server.host: true` が有効なこと）。

## 9. チェックリスト

- [ ] Docker Desktop が起動している（または Node 22 が入っている）
- [ ] Windows ならリポジトリが WSL の `~/...` 配下
- [ ] `docker compose up --build` が成功し、PC で `localhost:5173` が開く
- [ ] 同じ Wi-Fi のスマホで `https://<LAN-IP>:5173` が開く
- [ ] （任意）チーム共有・iOS PWA 確認用に HTTPS デプロイ URL がある

## 10. 関連ファイル

| ファイル | 役割 |
|----------|------|
| `docker-compose.yml` | 開発用 |
| `docker-compose.prod.yml` | 本番相当 |
| `Dockerfile.dev` / `Dockerfile` | 各イメージ定義 |
| `vite.config.ts` | `host` / `usePolling`（WSL・コンテナ向け） |
| `.cursor/rules/local-dev-and-mobile.mdc` | Cursor Agent 向け要約ルール |
