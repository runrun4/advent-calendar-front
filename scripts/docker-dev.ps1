[CmdletBinding()]
param(
  [string]$HostLanIp = $env:HOST_LAN_IP,
  [switch]$Detached,
  [switch]$PrintOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

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

function Get-WindowsLanIPv4 {
  $physicalIndexes = @(
    Get-NetAdapter -Physical |
      Where-Object Status -eq 'Up' |
      Select-Object -ExpandProperty ifIndex
  )

  $candidates = foreach ($config in Get-NetIPConfiguration) {
    if ($physicalIndexes -contains $config.InterfaceIndex -and $null -ne $config.IPv4DefaultGateway) {
      foreach ($address in @($config.IPv4Address)) {
        if (
          $null -ne $address.IPAddress -and
          $address.IPAddress -notlike '169.254.*' -and
          $address.IPAddress -ne '127.0.0.1'
        ) {
          [PSCustomObject]@{
            IPAddress = $address.IPAddress
            Metric = $config.NetIPv4Interface.InterfaceMetric
          }
        }
      }
    }
  }

  return (
    $candidates |
      Sort-Object Metric |
      Select-Object -ExpandProperty IPAddress -First 1
  )
}

if ([string]::IsNullOrWhiteSpace($HostLanIp)) {
  $HostLanIp = Get-WindowsLanIPv4
}

if (-not (Test-IPv4Address $HostLanIp)) {
  throw 'Could not detect the Windows LAN IPv4. Run with -HostLanIp 192.168.1.10.'
}

Write-Host "Mobile URL: https://${HostLanIp}:5173/"

if ($PrintOnly) {
  exit 0
}

if ($null -eq (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker CLI was not found. Start Docker Desktop and check the PATH.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$previousHostLanIp = $env:HOST_LAN_IP
$locationPushed = $false

try {
  $env:HOST_LAN_IP = $HostLanIp
  Push-Location $repoRoot
  $locationPushed = $true

  $dockerArguments = @('compose', 'up', '--build')
  if ($Detached) {
    $dockerArguments += '-d'
  }

  & docker @dockerArguments
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
finally {
  if ($locationPushed) {
    Pop-Location
  }
  $env:HOST_LAN_IP = $previousHostLanIp
}
