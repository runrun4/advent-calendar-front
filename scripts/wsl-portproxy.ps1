# Windows -> WSL2 のポート転送とファイアウォール許可を設定する。
# WSL2 で Docker を使わず npm run dev するとき、スマホ（同一Wi-Fi / テザリング）から
# Windows ホストの IPv4 経由で Vite (5173) に届くようにする。
#
# 使い方（Windows 側の「管理者」PowerShell で、リポジトリ直下から）:
#   powershell.exe -ExecutionPolicy Bypass -File .\scripts\wsl-portproxy.ps1
# 解除:
#   powershell.exe -ExecutionPolicy Bypass -File .\scripts\wsl-portproxy.ps1 -Remove
#
# 注意: WSL の IP は WSL 再起動のたびに変わる。スマホから届かなくなったら再実行する。
# （Docker Desktop で起動する場合、このスクリプトは不要。Docker が転送を代行する）

[CmdletBinding()]
param(
  [string]$WslIp,
  [int[]]$Ports = @(5173),
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$firewallRuleName = 'advent-calendar-front dev (WSL2)'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw '管理者 PowerShell で実行してください（スタートメニューで PowerShell を右クリック → 管理者として実行）。'
}

function Test-IPv4Address {
  param([string]$Address)

  if ([string]::IsNullOrWhiteSpace($Address)) {
    return $false
  }

  $octets = $Address.Split('.')
  if ($octets.Count -ne 4) {
    return $false
  }

  foreach ($octet in $octets) {
    $value = 0
    if (-not [int]::TryParse($octet, [ref]$value) -or $value -lt 0 -or $value -gt 255) {
      return $false
    }
  }

  return $true
}

if ($Remove) {
  foreach ($port in $Ports) {
    $null = netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0
    Write-Host "portproxy を削除しました: 0.0.0.0:$port"
  }
  Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  Write-Host "ファイアウォール規則を削除しました: $firewallRuleName"
  exit 0
}

if ([string]::IsNullOrWhiteSpace($WslIp)) {
  $WslIp = (wsl.exe hostname -I).Trim().Split(' ')[0]
}

if (-not (Test-IPv4Address $WslIp)) {
  throw "WSL の IPv4 を取得できませんでした。-WslIp 172.x.x.x を指定してください（WSL 内で hostname -I で確認）。"
}

foreach ($port in $Ports) {
  # 既存設定（古い WSL IP 向けなど）を消してから現在の WSL IP で貼り直す
  $null = netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0
  netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$WslIp | Out-Null
  Write-Host "portproxy を設定しました: 0.0.0.0:$port -> ${WslIp}:$port"
}

# Profile Any: テザリング接続はパブリックネットワーク扱いになるため、Public も含めて許可する
Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule `
  -DisplayName $firewallRuleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort $Ports `
  -Profile Any | Out-Null
Write-Host "ファイアウォール規則を設定しました: $firewallRuleName (TCP $($Ports -join ', ') / 全プロファイル)"

Write-Host ''
Write-Host '完了。WSL 側で ./scripts/wsl-dev.sh を起動し、表示される「スマホ確認URL」を開いてください。'
Write-Host 'WSL を再起動すると WSL の IP が変わるため、届かなくなったらこのスクリプトを再実行してください。'
