param(
    [string]$BackendEnvPath = "$PSScriptRoot\..\..\backend\.env",
    [string]$ExePath = "$PSScriptRoot\bin\Release\net472\TestCOMReflect.exe",
    [string]$ConfigPath = "$PSScriptRoot\collector-config.json"
)

$ErrorActionPreference = 'Stop'

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Không tìm thấy file cấu hình: $Path"
    }

    $pattern = "^\s*$([regex]::Escape($Name))\s*=\s*(.+?)\s*$"
    foreach ($line in Get-Content -LiteralPath $Path) {
        $match = [regex]::Match($line, $pattern)
        if ($match.Success) {
            return $match.Groups[1].Value.Trim().Trim('"').Trim("'")
        }
    }

    return $null
}

$hardwareApiKey = Get-DotEnvValue -Path $BackendEnvPath -Name 'HARDWARE_API_KEY'
if ([string]::IsNullOrWhiteSpace($hardwareApiKey)) {
    throw "backend\.env chưa có HARDWARE_API_KEY. Không chạy collector để tránh bị backend trả 401."
}

if (-not (Test-Path -LiteralPath $ExePath)) {
    throw "Chưa thấy file collector đã build: $ExePath"
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Không tìm thấy file cấu hình collector: $ConfigPath"
}

$env:HARDWARE_API_KEY = $hardwareApiKey
$env:COLLECTOR_CONFIG_PATH = $ConfigPath

Write-Host 'Đã nạp HARDWARE_API_KEY từ backend\.env: set'
Write-Host "Config: $env:COLLECTOR_CONFIG_PATH"
& $ExePath
