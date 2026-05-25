param(
    [string]$BackendEnvPath = "$PSScriptRoot\..\..\backend\.env",
    [string]$ExePath = "$PSScriptRoot\bin\Release\net472\TestCOMReflect.exe"
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

$env:HARDWARE_API_KEY = $hardwareApiKey
$env:COLLECTOR_REQUIRE_HARDWARE_API_KEY = 'true'
$env:BACKEND_HARDWARE_SCAN_URL = 'http://localhost:3000/api/v1/hardware/scan'
$env:SCHOOL_ID = '1'
$env:AI_X1_DEVICE_IP = '192.168.0.225'
$env:AI_X1_DEVICE_PORT = '4370'
$env:AI_X1_MACHINE_NUMBER = '1'
$env:AI_X1_POLL_MS = '3000'

Write-Host 'Đã nạp HARDWARE_API_KEY từ backend\.env: set'
Write-Host "Backend: $env:BACKEND_HARDWARE_SCAN_URL"
Write-Host "Thiết bị: $env:AI_X1_DEVICE_IP`:$env:AI_X1_DEVICE_PORT | School: $env:SCHOOL_ID"
& $ExePath
