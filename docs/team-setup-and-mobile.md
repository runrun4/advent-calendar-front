# チーム向け: PC起動からスマホ確認まで

このドキュメントは **Windows PowerShell／CMD、Windows WSL2、Mac、Linux** で開発サーバーを起動し、**スマホで画面確認**するまでの手順です。Cursor Agent もこのファイルを正として案内します。

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

### 3.2 Windows

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) をインストールする
2. Settings → GeneralでWSL2バックエンドを有効化する
3. WSL2ターミナルを使う場合は、Settings → Resources → WSL Integrationで使用するディストリを有効化する
4. 使用するターミナルで確認:

```bash
docker compose version
```

## 4. 開発サーバーを起動する

プロジェクト直下で:

**Windows PowerShell／CMD:**

```powershell
.\scripts\docker-dev.cmd
```

**Windows WSL2／Mac／Linux:**

```bash
./scripts/docker-dev.sh
```

成功したら PC のブラウザで開く:

- 開発: [https://localhost:5173](https://localhost:5173)
- スマホ: 起動ログの `Network` に表示される `https://<PCのIPv4>:5173/`

Windows用スクリプトは、起動中の物理NIC（Wi-Fi／Ethernet）からデフォルトゲートウェイを持つIPv4を選ぶ。自動取得できない場合は、`ipconfig` などで確認したIPv4を指定する:

```powershell
.\scripts\docker-dev.cmd -HostLanIp 192.168.1.10
```

```bash
HOST_LAN_IP=192.168.1.10 ./scripts/docker-dev.sh
```

通常の `docker compose up --build` はホストIPv4を判定できないため、誤ったeth0 URLを表示せず停止する。必ずOS別の専用起動コマンドを使う。

停止:

```bash
docker compose down
```

### ブランチ切り替え・依存変更後の注意

コンテナの起動時に `npm ci` が実行されるため、名前付きボリュームの `node_modules` は `package-lock.json` の内容に自動で同期される。通常は依存変更後もそのまま起動できる。

起動時に `failed to load config from /app/vite.config.ts` や `Cannot find module '...'` が出るなど、ボリュームの破損が疑われる場合はボリュームごと作り直す:

```bash
docker compose down -v
```

**Windows PowerShell／CMD:**

```powershell
.\scripts\docker-dev.cmd
```

**Windows WSL2／Mac／Linux:**

```bash
./scripts/docker-dev.sh
```

### 本番ビルド相当の確認

```bash
docker compose -f docker-compose.prod.yml up --build
```

- PC: [http://localhost:8080](http://localhost:8080)

## 5. スマホで確認する（同じ Wi-Fi）

ローカル開発サーバーを、**PC と同じ Wi-Fi に繋がったスマホ**から見る手順です。

### 5.1 PC の LAN IP を調べる

> **Windowsの注意:** PowerShell／CMDでは `.\scripts\docker-dev.cmd`、WSL2では `./scripts/docker-dev.sh` で起動する。
>
> Windows用スクリプトが物理NICのLAN IPv4をコンテナへ渡すため、Viteの `Network` にはスマホから開けるURLが表示される。通常の `docker compose up` は正しいホストIPv4を渡せないため使用しない。

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

**WSL2ターミナルからWindows側を調べる場合:**

```bash
powershell.exe -NoProfile -Command "ipconfig"
```

`hostname -I` で表示されるWSL2のeth0アドレスは使用しない。Docker Desktop経由でポート公開しているため、**WindowsホストのIPv4**をスマホに入力する。

### 5.2 スマホのブラウザで開く

| 用途 | URL 例 |
|------|--------|
| 開発（Vite） | `https://192.168.x.x:5173` |
| 本番相当（nginx） | `http://192.168.x.x:8080` |

`192.168.x.x` は手順 5.1 で調べた IP に置き換える。

開発サーバーは `@vitejs/plugin-basic-ssl` の自己署名証明書で **HTTPS 専用**配信している。注意点:

- アドレスバーに `192.168.x.x:5173` と素で入力すると **http:// 扱いになり、「サーバーが応答を停止しました」「接続がリセットされました」系のエラーになる**。必ず `https://` を先頭に付けて入力する
- 初回アクセス時は自己署名証明書の警告が出るが、「詳細設定」→「続行」で開ける
- iOS で Service Worker / PWA まで確認する場合はセクション7を参照

### 5.3 つながらないとき

まず、どこまで届いているかを順番に切り分ける:

1. **PC で `https://localhost:5173`** が開く → コンテナとポート公開は正常
2. **PC 自身で `https://<LAN IP>:5173`**（localhost ではなく手順 5.1 の IP）が開く → ホスト側の待ち受けは正常。ここで失敗する場合は Windows ファイアウォールが原因のことが多い
3. **スマホで `https://<LAN IP>:5173`** が開く → 完了。2 が通って 3 だけ失敗する場合は、Wi-Fi の分離設定（AP アイソレーション）か、スマホが別ネットワークにいる

チェック項目:

- スマホに入力した URL が **WSL の eth0 の IP になっていないか**（5.1 の警告を参照。最頻出の原因）。ただし **iPhone テザリング利用時は `172.20.10.x` が正しい IP**（5.4 参照）なので、「172 で始まる＝間違い」ではない。起動スクリプトが表示する「スマホ確認URL」を正とする
- PC とスマホが **同じネットワーク** か確認（PC が会場 Wi-Fi・スマホがモバイル回線、のようなずれが起きやすい。テザリングでまとめる場合は 5.4 参照）
- `docker compose up` が落ちていないか確認
- PC のファイアウォールで 5173 / 8080 が遮断されていないか確認（Windows は「Windows セキュリティ → ファイアウォール → 詳細設定」で受信規則に TCP 5173 / 8080 の許可を追加する）
- Windows + WSL2 では、スマホに入力するのは WSL 内の `eth0` の IP（172.x など）ではなく **Windows ホストの LAN IP**。Docker Desktop がポートを Windows 側へ転送するため、WSL の IP には LAN から届かない
- Vite は `server.host: true` 済み。Docker でもポートがホストに publish されていること（`5173:5173` / `8080:80`）

### 5.4 Wi-Fi がない会場: スマホのテザリングで確認する

会場に使える Wi-Fi がない場合でも、**PC をスマホのテザリング（インターネット共有）に接続すれば同一ネットワークになる**ので、手順 5 はそのまま成立する。

1. スマホでテザリングを ON にし、**PC をそのテザリングに接続する**
2. いつも通り起動スクリプトを実行する（テザリング接続中の NIC がデフォルトゲートウェイを持つため、IPv4 は自動取得される）
3. 表示された「スマホ確認URL」を、**テザリングの親機にしているスマホ自身**のブラウザで開く（親機→子機PCへのアクセスは可能）

テザリング特有の注意:

- **IP の見た目が変わる**: iPhone テザリングでは PC の IP は `172.20.10.x`、Android では `192.168.x.x` が多い。172 で始まっていても、起動スクリプトが表示した URL ならそれが正しい
- **Windows はテザリングを「パブリックネットワーク」として扱う**ため、ファイアウォールが 5173 への受信をブロックしやすい。`scripts/wsl-portproxy.ps1` が作る許可規則は全プロファイル対象なので WSL メンバーはそれで足りる。PowerShell／CMD＋Docker の場合に繋がらないときは、受信規則に TCP 5173 の許可（プロファイル: パブリック含む）を追加する
- **バックエンドが Tailscale 経由の場合も問題ない**: テザリングでインターネットに出られれば Tailscale は繋がる
- 検証したい端末とは**別のスマホを親機にする**構成でもよい（親機のギガを消費する点だけ注意）

## 6. 別の Wi-Fi / チーム全体で確認する

| やり方 | できること | できないこと |
|--------|------------|--------------|
| 各自OS別ランチャーで起動 | 自分のPC・同じWi-Fiの自分のスマホ | 別ネットワークの相手の画面を直接見る |
| Vercel / Netlify 等へデプロイ | 発行された `https://...` を共有すれば誰でも・どの回線でも確認 | （無料枠の制限に注意） |

**おすすめ:** `main`（または検証用ブランチ）を GitHub に push → Vercel/Netlify 連携で HTTPS URL を自動発行 → チームは URL をスマホで開くだけ。

## 7. iOS（Safari）と PWA の注意

- **Android (Chrome):** `http://` のローカルIPでも「ホーム画面に追加」や Service Worker が動きやすいことがある
- **iOS (Safari):** **HTTPS でないと** Service Worker / PWA インストールが正しく動かないことが多い
- そのため **iPhone で PWA まで確認したい**場合は、同一LANの `http://192.168.x.x` ではなく **デプロイ先の https URL** を使う

ローカル HTTPS（`@vitejs/plugin-basic-ssl`）は同一LAN向けの補助手段。チーム横断の本確認には使わない。

## 8. Docker なしで起動する場合

### 8.1 Mac / Linux

```bash
npm ci
npm run dev
```

スマホから見る場合も、PC の LAN IP + `:5173` でアクセスする（`vite.config.ts` の `server.host: true` が有効なこと）。

### 8.2 Windows WSL2（Docker なし）

WSL2 は Windows の中の NAT ネットワークにいるため、**WSL 内で `npm run dev` しただけではスマホから届かない**（Docker Desktop 利用時はDockerがポート転送を代行するので、この節の作業は不要）。以下の 2 段構えで通す。

**初回のみ: Windows 側でポート転送を設定する（管理者 PowerShell）**

スタートメニューで PowerShell を右クリック →「管理者として実行」し、リポジトリ直下で:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\wsl-portproxy.ps1
```

これで「Windows の 5173 → WSL の 5173」の転送（portproxy）と、ファイアウォールの受信許可（TCP 5173、テザリング用にパブリック含む全プロファイル）が入る。

**毎回: WSL 側で起動する**

```bash
./scripts/wsl-dev.sh
```

Windows ホストの IPv4 を自動取得して「スマホ確認URL」を表示し、portproxy が現在の WSL IP を向いているかもチェックしてから `npm run dev` する。Node が無い／古い場合はエラーで案内が出る（WSL 内に `nvm install 22` で Node 22 を入れる）。

**WSL 再起動後に繋がらなくなったら**: WSL の IP は再起動で変わるため、portproxy が古い IP を向いて届かなくなる。`wsl-dev.sh` 起動時に警告が出るので、管理者 PowerShell で `wsl-portproxy.ps1` を再実行する。

設定を消したいとき:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\wsl-portproxy.ps1 -Remove
```

> 参考: Windows 11 + WSL 2.0 以降なら `.wslconfig` の `networkingMode=mirrored` で portproxy 自体を不要にできるが、Hyper-V ファイアウォールの追加設定が要るなど個人差が出やすいため、チーム標準は上記 portproxy 方式とする。

## 9. チェックリスト

- [ ] Docker Desktop が起動している（または Node 22 が入っている）
- [ ] Windowsでは使用するターミナルと同じ側にリポジトリがある（PowerShell/CMDはWindows側、WSL2はLinux側）
- [ ] OS別の専用起動コマンドが成功し、PCで `localhost:5173` が開く
- [ ] 同じ Wi-Fi のスマホで `https://<LAN-IP>:5173` が開く
- [ ] （任意）チーム共有・iOS PWA 確認用に HTTPS デプロイ URL がある

## 10. 関連ファイル

| ファイル | 役割 |
|----------|------|
| `docker-compose.yml` | 開発用 |
| `docker-compose.prod.yml` | 本番相当 |
| `Dockerfile.dev` / `Dockerfile` | 各イメージ定義 |
| `scripts/docker-dev.cmd` / `docker-dev.ps1` | Windows PowerShell／CMD用ランチャー |
| `scripts/docker-dev.sh` | Windows WSL2／Mac／Linux用ランチャー |
| `scripts/wsl-dev.sh` | WSL2でDockerなしに `npm run dev` するランチャー（スマホ確認URL表示・portproxy検査つき） |
| `scripts/wsl-portproxy.ps1` | Windows→WSL2のポート転送とファイアウォール許可の設定／解除（管理者PowerShell） |
| `vite.config.ts` | `host` / `usePolling`（WSL・コンテナ向け） |
| `.cursor/rules/local-dev-and-mobile.mdc` | Cursor Agent 向け要約ルール |
