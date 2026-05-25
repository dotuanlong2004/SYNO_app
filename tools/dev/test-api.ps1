# Test script for Supabase Auth API
Write-Host "🧪 Testing Supabase Auth API..." -ForegroundColor Green

$baseUrl = "http://localhost:3000/api/v1"

# Test 1: Health check
Write-Host "`n1. Health Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "   ✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Server not responding. Start with: npm start" -ForegroundColor Red
    exit 1
}

# Test 2: Register parent
Write-Host "`n2. Register Parent..." -ForegroundColor Cyan
$registerBody = @{
    full_name = "Test Parent"
    email = "testparent@example.com"
    password = "123456"
    link_code = "LINK123"
    school_id = "1"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register-parent" -Method POST -ContentType "application/json" -Body $registerBody
    Write-Host "   ✅ Registered: $($response.user.email)" -ForegroundColor Green
    $global:accessToken = $response.session.access_token
} catch {
    Write-Host "   ❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Login
Write-Host "`n3. Login..." -ForegroundColor Cyan
$loginBody = @{
    email = "testparent@example.com"
    password = "123456"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    Write-Host "   ✅ Logged in: $($response.user.email)" -ForegroundColor Green
    Write-Host "   Role: $($response.user.role)" -ForegroundColor Gray
    $global:accessToken = $response.access_token
} catch {
    Write-Host "   ❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get students (requires auth)
if ($global:accessToken) {
    Write-Host "`n4. Get Students (Authenticated)..." -ForegroundColor Cyan
    try {
        $headers = @{ "Authorization" = "Bearer $global:accessToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/students" -Method GET -Headers $headers
        Write-Host "   ✅ Found $($response.data.Count) students" -ForegroundColor Green
        if ($response.data.Count -gt 0) {
            Write-Host "   First student: $($response.data[0].full_name)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n✨ Test completed!" -ForegroundColor Green
