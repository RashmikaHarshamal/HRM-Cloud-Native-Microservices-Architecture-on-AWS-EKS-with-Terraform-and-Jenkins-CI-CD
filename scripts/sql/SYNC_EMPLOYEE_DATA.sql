-- =====================================================
-- DIRECT FIX: Sync Employee Data Between Databases
-- =====================================================
-- Error: "Failed to clock in: User not found"
-- Cause: Employee missing from hrm_db_employee
-- Solution: Copy employee records from hrm_db_user
--
-- HOW TO USE:
-- 1. Open pgAdmin 4
-- 2. Connect to "hrm_db_employee" database
-- 3. Open Query Tool
-- 4. Copy and run THIS ENTIRE SCRIPT
-- 5. Restart Employee_Backend (port 5003)
-- 6. Try clock-in again
-- =====================================================

-- STEP 1: Check current state
SELECT '[BEFORE] Employees in hrm_db_employee:' as check_status;
SELECT COUNT(*) as employee_count FROM employee;
SELECT id, email, full_name FROM employee LIMIT 5;

-- STEP 2: Ensure required tables exist (Company, Department)
INSERT INTO company (name, registration_number, address, phone, email, status, subscription_start, subscription_end, created_at, updated_at)
SELECT 'Default Company', 'REG00001', 'Address', 'Phone', 'email@company.com', 'ACTIVE', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM company WHERE registration_number = 'REG00001');

INSERT INTO department (name, description, company_id, created_at, updated_at)
SELECT 'General Department', 'Default Department', company.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM company
WHERE company.registration_number = 'REG00001'
AND NOT EXISTS (
    SELECT 1 FROM department 
    WHERE name = 'General Department' 
    AND company_id = company.id
);

-- STEP 3: Copy employees from SOURCE (hrm_db_user)
-- THIS STEP REQUIRES MANUAL DATA ENTRY BELOW
-- 
-- If pg_dump/pg_restore is available, use this command in PowerShell:
-- $env:PGPASSWORD = "Rush@2001780"
-- pg_dump -h localhost -U postgres -d hrm_db_user -t employee --data-only | psql -h localhost -U postgres -d hrm_db_employee
--
-- Otherwise, manually insert your employees below:
-- =====================================================

-- OPTION A: Manual Insert (RECOMMENDED IF YOU KNOW YOUR CREDENTIALS)
-- Uncomment and modify the following INSERT statements with YOUR user data:

-- Get default company and department IDs
WITH defaults AS (
    SELECT 
        (SELECT id FROM company WHERE registration_number = 'REG00001' LIMIT 1) as company_id,
        (SELECT id FROM department WHERE name = 'General Department' LIMIT 1) as department_id
)

-- Example: If your email is 'john@company.com', modify and uncomment:
-- INSERT INTO employee (email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at)
-- SELECT 'john@company.com', 'your_password_hash', 'John Doe', 'EMP001', 'EMPLOYEE', 'ACTIVE', defaults.company_id, defaults.department_id, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
-- FROM defaults
-- WHERE NOT EXISTS (SELECT 1 FROM employee WHERE email = 'john@company.com');

-- OPTION B: If you have access to run SQL on hrm_db_user, get the INSERT statements:
-- =====================================================
-- Run this in hrm_db_user database to see the data to copy:
-- SELECT 'INSERT INTO employee (email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at) VALUES (''' 
--     || email || ''', ''' || password || ''', ''' || full_name || ''', ''' || COALESCE(employee_id, 'EMP_' || id) || ''', ''' || role || ''', ''' || COALESCE(status, 'ACTIVE') || ''', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);'
-- FROM employee;

-- STEP 4: Verify sync was successful
SELECT '[AFTER] Employees in hrm_db_employee:' as check_status;
SELECT COUNT(*) as employee_count FROM employee;
SELECT id, email, full_name, role FROM employee ORDER BY id;

-- =====================================================
-- STEP 5: Test with a known user
-- =====================================================
-- If you know the exact email you logged in with, verify it exists:
-- Modify 'your-email@company.com' with YOUR actual email:

-- SELECT '[TEST] Looking for your email:' as test_status;
-- SELECT id, email, full_name, role FROM employee WHERE email = 'your-email@company.com';

-- =====================================================
-- ALTERNATIVE: If above doesn't work, try this simpler approach
-- =====================================================
-- This copies ALL data including company and department relationships
-- UNCOMMENT AND RUN ONLY IF NEEDED:

-- TRUNCATE TABLE employee CASCADE;
-- INSERT INTO employee (id, email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at)
-- WITH src AS (
--     SELECT 1 as company_id, 1 as department_id, id, email, password, full_name, employee_id, role, status
--     FROM dblink('dbname=hrm_db_user', 'SELECT id, email, password, full_name, employee_id, role, status FROM employee')
--     AS t(id int, email text, password text, full_name text, employee_id text, role text, status text)
-- )
-- SELECT src.id, src.email, src.password, src.full_name, COALESCE(src.employee_id, 'EMP_' || src.id), src.role, src.status, src.company_id, src.department_id, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
-- FROM src;

-- =====================================================
SELECT '[FINAL] Sync Complete! Clock-in should now work.' as status;
-- =====================================================
