#!/bin/sh

# Windows WSL2 で Docker を使わずに npm run dev し、スマホ確認まで通すランチャー。
# WSL2 は NAT 内にいるため、スマホからは Windows ホストの IPv4 で届く必要がある。
# 事前に Windows 側の管理者 PowerShell で scripts/wsl-portproxy.ps1 を一度実行しておく。

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(dirname "$script_dir")

is_ipv4() {
  printf '%s\n' "$1" | awk -F. '
    NF == 4 {
      for (i = 1; i <= 4; i++) {
        if ($i !~ /^[0-9]+$/ || $i < 0 || $i > 255) exit 1
      }
      exit 0
    }
    { exit 1 }
  '
}

detect_windows_ip_from_wsl() {
  powershell.exe -NoProfile -NonInteractive -Command '
    $physicalIndexes = @(
      Get-NetAdapter -Physical |
        Where-Object Status -eq "Up" |
        Select-Object -ExpandProperty ifIndex
    )
    $candidates = foreach ($config in Get-NetIPConfiguration) {
      if ($physicalIndexes -contains $config.InterfaceIndex -and $config.IPv4DefaultGateway) {
        foreach ($address in @($config.IPv4Address)) {
          if ($address.IPAddress -and $address.IPAddress -notlike "169.254.*") {
            [PSCustomObject]@{
              IPAddress = $address.IPAddress
              Metric = $config.NetIPv4Interface.InterfaceMetric
            }
          }
        }
      }
    }
    $candidates |
      Sort-Object Metric |
      Select-Object -ExpandProperty IPAddress -First 1
  ' 2>/dev/null | tr -d '\r' || true
}

if ! grep -qi microsoft /proc/version 2>/dev/null; then
  echo 'このスクリプトは Windows WSL2 専用です。' >&2
  echo 'Mac / Linux はそのまま npm run dev を使ってください。' >&2
  exit 1
fi

case "$repo_root" in
  /mnt/*)
    echo '警告: リポジトリが /mnt/ 配下（Windowsファイルシステム）にあります。' >&2
    echo 'ファイル監視とインストールが極端に遅くなるため、WSL側（~/ 配下）へ clone し直すことを推奨します。' >&2
    ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js が見つかりません。WSL 内に Node.js 22 をインストールしてください。' >&2
  echo '例: https://github.com/nvm-sh/nvm を入れて nvm install 22' >&2
  exit 1
fi

node_major=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "$node_major" -lt 20 ]; then
  echo "Node.js $(node -v) では Vite 8 が動きません。Node 22 に上げてください（nvm install 22）。" >&2
  exit 1
fi

host_lan_ip=${HOST_LAN_IP:-}

if [ -z "$host_lan_ip" ]; then
  if command -v powershell.exe >/dev/null 2>&1; then
    host_lan_ip=$(detect_windows_ip_from_wsl)
  else
    echo 'WSL interop が無効のため Windows ホストの IPv4 を自動取得できません。' >&2
    echo 'HOST_LAN_IP=192.168.1.10 ./scripts/wsl-dev.sh のように指定してください。' >&2
    exit 1
  fi
fi

if [ -z "$host_lan_ip" ] || ! is_ipv4 "$host_lan_ip"; then
  echo 'Windows ホストの LAN IPv4 を自動取得できませんでした。' >&2
  echo 'HOST_LAN_IP=192.168.1.10 ./scripts/wsl-dev.sh のように指定してください。' >&2
  exit 1
fi

wsl_ip=$(hostname -I 2>/dev/null | awk '{print $1}')

# portproxy が現在の WSL IP を向いているか確認する（表示は管理者権限不要）。
# WSL の IP は再起動で変わるため、古い設定が残っているだけでもスマホから届かなくなる。
portproxy_ok=0
if command -v netsh.exe >/dev/null 2>&1 && [ -n "$wsl_ip" ]; then
  proxy_state=$(netsh.exe interface portproxy show v4tov4 2>/dev/null | tr -d '\r' || true)
  if printf '%s\n' "$proxy_state" | grep -E "^[[:space:]]*[^[:space:]]+[[:space:]]+5173[[:space:]]+${wsl_ip}[[:space:]]+5173" >/dev/null 2>&1; then
    portproxy_ok=1
  fi
fi

echo "PC ブラウザ:  https://localhost:5173/"
echo "スマホ確認URL: https://${host_lan_ip}:5173/"

if [ "$portproxy_ok" -eq 1 ]; then
  echo "portproxy: OK (Windows:5173 -> WSL ${wsl_ip}:5173)"
else
  echo ''
  echo '注意: Windows -> WSL のポート転送（portproxy）が未設定か、古い WSL IP を向いています。'
  echo 'PC の localhost では見えますが、スマホからは届きません。'
  echo 'スマホ確認する場合は、Windows 側の「管理者」PowerShell でリポジトリ直下から実行:'
  echo ''
  echo '  powershell.exe -ExecutionPolicy Bypass -File .\scripts\wsl-portproxy.ps1'
  echo ''
  echo '（WSL を再起動するたびに WSL の IP が変わるので、届かなくなったら再実行）'
  echo ''
fi

cd "$repo_root"

if [ ! -d node_modules ]; then
  echo 'node_modules がないため npm ci を実行します...'
  npm ci
fi

HOST_LAN_IP="$host_lan_ip" npm run dev
