# PowerShell script to copy employee data from hrm_db_user to hrm_db_employee
# Run this script in PowerShell with PostgreSQL bin in PATH or full path

$pgDump = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"  # Adjust version if needed
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"       # Adjust version if needed

$dbHost = "localhost"
$user = "postgres"
$password = "Rush@2001780"
$dbUser = "hrm_db_user"
$dbEmployee = "hrm_db_employee"

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $password

# Tables to copy
$tables = @("company", "department", "employee")

foreach ($table in $tables) {
    Write-Host "Copying table: $table"
    
    # Dump data from source
    & $pgDump -h $dbHost -U $user -d $dbUser -t $table --data-only -f "${table}.sql"
    
    # Restore to target
    & $psql -h $dbHost -U $user -d $dbEmployee -f "${table}.sql"
    
    # Clean up
    Remove-Item "${table}.sql"
}

Write-Host "Data copy completed."