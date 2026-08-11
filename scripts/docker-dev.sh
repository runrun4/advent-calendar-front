#!/bin/sh

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

detect_macos_ip() {
  default_interface=$(/sbin/route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}' || true)
  if [ -n "$default_interface" ]; then
    default_ip=$(/usr/sbin/ipconfig getifaddr "$default_interface" 2>/dev/null || true)
    if [ -n "$default_ip" ]; then
      printf '%s\n' "$default_ip"
      return
    fi
  fi

  for interface in $(/sbin/ifconfig -l); do
    case "$interface" in
      lo*|bridge*|utun*|awdl*|llw*) continue ;;
    esac

    if /sbin/ifconfig "$interface" | grep -q 'status: active'; then
      /sbin/ifconfig "$interface" | awk '$1 == "inet" { print $2; exit }'
      return
    fi
  done
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

detect_linux_ip() {
  ip route get 1.1.1.1 2>/dev/null | awk '
    {
      for (i = 1; i <= NF; i++) {
        if ($i == "src") {
          print $(i + 1)
          exit
        }
      }
    }
  '
}

host_lan_ip=${HOST_LAN_IP:-}

if [ -z "$host_lan_ip" ]; then
  case "$(uname -s)" in
    Darwin)
      host_lan_ip=$(detect_macos_ip)
      ;;
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        if command -v powershell.exe >/dev/null 2>&1; then
          host_lan_ip=$(detect_windows_ip_from_wsl)
        else
          echo 'WSL interoperability is required to detect the Windows host IPv4.' >&2
          echo 'Enable powershell.exe access or set HOST_LAN_IP manually.' >&2
          exit 1
        fi
      else
        host_lan_ip=$(detect_linux_ip)
      fi
      ;;
  esac
fi

if [ -z "$host_lan_ip" ] || ! is_ipv4 "$host_lan_ip"; then
  echo 'ホストPCのLAN IPv4を自動取得できませんでした。' >&2
  echo 'HOST_LAN_IP=192.168.1.10 ./scripts/docker-dev.sh のように指定してください。' >&2
  exit 1
fi

echo "スマホ確認URL: https://${host_lan_ip}:5173/"
cd "$repo_root"
HOST_LAN_IP="$host_lan_ip" docker compose up --build "$@"
