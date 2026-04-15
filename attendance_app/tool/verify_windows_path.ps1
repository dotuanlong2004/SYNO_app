# Verifies the project path is safe for Flutter Windows + MSBuild (ASCII-only).
# Run from repo root or attendance_app: powershell -File tool/verify_windows_path.ps1
# region agent log
$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$logPath = Join-Path $workspaceRoot.Path "debug-dbfe9f.log"
$fullPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$nonAscii = @()
for ($i = 0; $i -lt $fullPath.Length; $i++) {
  if ([int][char]$fullPath[$i] -gt 127) { $nonAscii += $fullPath[$i] }
}
$ok = $nonAscii.Count -eq 0
$payload = @{
  sessionId = "dbfe9f"
  hypothesisId = "H1-verify"
  location = "tool/verify_windows_path.ps1"
  message  = "Windows path ASCII check"
  data     = @{ path = $fullPath; nonAsciiCount = $nonAscii.Count; ok = $ok }
  timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
} | ConvertTo-Json -Compress -Depth 4
Add-Content -Path $logPath -Value $payload -Encoding UTF8
# endregion agent log
if (-not $ok) {
  Write-Host "FAIL: Project path contains non-ASCII characters. MSBuild/Flutter Windows builds break (paths become di?m danh)." -ForegroundColor Red
  Write-Host "Fix: Move/copy the project to a path like D:\dev\attendance_app (letters, numbers, underscore only)." -ForegroundColor Yellow
  exit 1
}
Write-Host "OK: Project path is ASCII-only; safe for flutter run -d windows." -ForegroundColor Green
exit 0
