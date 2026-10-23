# ============================================
# Fix Login Issue - Register Test Users via API
# ============================================
# This script registers test users using the backend API
# Run this if you can't access the database directly
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HRM Test User Registration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendUrl = "http://localhost:5002"

# Test if backend is running
Write-Host "Testing backend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$backendUrl/api/auth/login" -Method POST -Body '{"email":"test@test.com","password":"test"}' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✓ Backend is running on $backendUrl" -ForegroundColor Green
    } else {
        Write-Host "✗ Cannot connect to backend at $backendUrl" -ForegroundColor Red
        Write-Host "  Please make sure the backend server is running" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ""

# Function to register a user
function Register-TestUser {
    param(
        [string]$FullName,
        [string]$Email,
        [string]$Password,
        [string]$Role,
        [string]$EmployeeId,
        [string]$Phone,
        [string]$Designation
    )
    
    $body = @{
        fullName = $FullName
        email = $Email
        password = $Password
        role = $Role
        employeeId = $EmployeeId
        phone = $Phone
        designation = $Designation
        department = "IT Department"
        address = "Test Address"
    } | ConvertTo-Json
    
    Write-Host "Registering: $Email ($Role)..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$backendUrl/api/auth/register" -Method POST -Body $body -ContentType "application/json"
        if ($response.success) {
            Write-Host "  ✓ Successfully registered: $Email" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ Failed: $($response.message)" -ForegroundColor Red
            return $false
        }
    } catch {
        $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorMessage.message -like "*already exists*") {
            Write-Host "  ⚠ User already exists: $Email" -ForegroundColor Yellow
            return $true
        } else {
            Write-Host "  ✗ Error: $($errorMessage.message)" -ForegroundColor Red
            return $false
        }
    }
}

# Register test users
Write-Host "Registering test users..." -ForegroundColor Cyan
Write-Host ""

$users = @(
    @{
        FullName = "Admin User"
        Email = "admin@test.com"
        Password = "test123"
        Role = "ADMIN"
        EmployeeId = "EMP001"
        Phone = "+1234567890"
        Designation = "System Administrator"
    },
    @{
        FullName = "HR Manager"
        Email = "hr@test.com"
        Password = "test123"
        Role = "HR_MANAGER"
        EmployeeId = "EMP002"
        Phone = "+1234567891"
        Designation = "Human Resources Manager"
    },
    @{
        FullName = "Test Employee"
        Email = "employee@test.com"
        Password = "test123"
        Role = "EMPLOYEE"
        EmployeeId = "EMP003"
        Phone = "+1234567892"
        Designation = "Software Engineer"
    }
)

$successCount = 0
foreach ($user in $users) {
    if (Register-TestUser @user) {
        $successCount++
    }
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Registration Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "$successCount of $($users.Count) users registered successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Admin:    admin@test.com / test123" -ForegroundColor White
Write-Host "  HR:       hr@test.com / test123" -ForegroundColor White
Write-Host "  Employee: employee@test.com / test123" -ForegroundColor White
Write-Host ""

# Test login with HR credentials
Write-Host "Testing HR login..." -ForegroundColor Yellow
$testBody = @{
    email = "hr@test.com"
    password = "test123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$backendUrl/api/auth/login" -Method POST -Body $testBody -ContentType "application/json"
    if ($loginResponse.success) {
        Write-Host "✓ HR Login successful!" -ForegroundColor Green
        Write-Host "  Welcome: $($loginResponse.data.fullName)" -ForegroundColor Cyan
        Write-Host "  Role: $($loginResponse.data.role)" -ForegroundColor Cyan
    } else {
        Write-Host "✗ Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Login test failed" -ForegroundColor Red
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  Error: $($errorDetails.message)" -ForegroundColor Red
}
