# ==========================================
# FIX CLOCK-IN "USER NOT FOUND" ERROR
# ==========================================
# This script syncs employee data from User_Backend (hrm_db_user) 
# to Employee_Backend (hrm_db_employee)
#
# The clock-in error occurs because:
# 1. User exists in hrm_db_user (login works)
# 2. User missing from hrm_db_employee (clock-in fails)
#
# This script copies the necessary tables between databases
# ==========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Clock-In Fix: Syncing Employee Data" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Configuration
$pgPassword = "Rush@2001780"
$pgUser = "postgres"
$pgHost = "localhost"
$sourceDb = "hrm_db_user"      # User_Backend
$targetDb = "hrm_db_employee"  # Employee_Backend

# Set environment variable for psql
$env:PGPASSWORD = $pgPassword

Write-Host "`n[1/3] Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    & psql -h $pgHost -U $pgUser -d $sourceDb -c "SELECT 1" 2>&1 | Out-Null
    Write-Host "[OK] PostgreSQL connection successful" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] PostgreSQL connection failed" -ForegroundColor Red
    Write-Host "Make sure PostgreSQL is running on localhost:5432" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Checking users in hrm_db_user..." -ForegroundColor Yellow
$sourceUsers = & psql -h $pgHost -U $pgUser -d $sourceDb -t -c "SELECT id, email, full_name, role FROM employee ORDER BY id;" 2>&1
if ($sourceUsers -and $sourceUsers.Count -gt 0 -and $sourceUsers[0] -ne "") {
    Write-Host "[OK] Found users in $sourceDb :" -ForegroundColor Green
    $sourceUsers | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "[ERROR] No users found in $sourceDb" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/3] Syncing employee data to hrm_db_employee..." -ForegroundColor Yellow

# Create SQL sync script
$tempSqlFile = "$env:TEMP\sync_employees_$((Get-Date).Ticks).sql"

$sqlContent = @"
-- Ensure company exists
INSERT INTO company (name, registration_number, address, phone, email, status, subscription_start, subscription_end, created_at, updated_at)
SELECT 'Test Company Ltd', 'REG12345', '123 Business Street', '+1234567890', 'company@test.com', 'APPROVED', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM company WHERE registration_number = 'REG12345');

-- Ensure department exists
INSERT INTO department (name, description, company_id, created_at, updated_at)
SELECT 'IT Department', 'Information Technology', (SELECT id FROM company WHERE registration_number = 'REG12345' LIMIT 1), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM department WHERE name = 'IT Department');
"@

# Save to temp file
Set-Content -Path $tempSqlFile -Value $sqlContent

# Import base structure
& psql -h $pgHost -U $pgUser -d $targetDb -f $tempSqlFile 2>&1 | Out-Null

# Export employees from source DB and import to target
Write-Host "  Exporting employees from $sourceDb..." -ForegroundColor Gray
$exportFile = "$env:TEMP\employees_export_$((Get-Date).Ticks).sql"

# Use pg_dump to export employee data only
& pg_dump -h $pgHost -U $pgUser -d $sourceDb -t employee --data-only --disable-triggers -f $exportFile 2>&1 | Out-Null

# Import to target
Write-Host "  Importing employees to $targetDb..." -ForegroundColor Gray
& psql -h $pgHost -U $pgUser -d $targetDb -f $exportFile 2>&1 | Out-Null

# Verify
Write-Host "`n[VERIFY] Checking employees in $targetDb after sync..." -ForegroundColor Yellow
$syncedUsers = & psql -h $pgHost -U $pgUser -d $targetDb -t -c "SELECT id, email, full_name, role FROM employee ORDER BY id;" 2>&1
if ($syncedUsers -and $syncedUsers.Count -gt 0 -and $syncedUsers[0] -ne "") {
    Write-Host "[OK] Employees synced successfully:" -ForegroundColor Green
    $syncedUsers | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "[WARNING] No employees found after sync. Manual verification needed." -ForegroundColor Yellow
}

# Cleanup
Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue
Remove-Item $exportFile -Force -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[OK] SYNC COMPLETE!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Restart Employee_Backend service (port 5003)" -ForegroundColor Yellow
Write-Host "2. Try clock-in again in the frontend" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
