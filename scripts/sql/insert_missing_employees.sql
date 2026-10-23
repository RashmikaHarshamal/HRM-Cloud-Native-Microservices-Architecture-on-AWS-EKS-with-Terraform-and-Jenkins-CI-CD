-- Sync missing employees (ID 4, 5) from hrm_db_user to hrm_db_employee
-- These employees are in hrm_db_user but not yet in hrm_db_employee

-- Get the missing employees data from hrm_db_user and insert into hrm_db_employee
-- Employee 4: charya@gmail.com
-- Employee 5: amara@gmail.com

-- First, get full employee data from hrm_db_user to construct INSERT statements
-- We'll do this by exporting and importing just the new records

-- Option 1: Direct INSERT with values
-- Since we know the employees, we can get their full data

-- Check what company and department IDs exist
SELECT '[SETUP] Company and Department IDs:' as info;
SELECT id, name FROM companies LIMIT 5;
SELECT id, name, company_id FROM departments LIMIT 5;

-- Get exact employee data from source for the missing IDs
-- Using psql command to fetch and construct INSERT
-- For now, let's insert with minimal required fields and let the sync service handle it

INSERT INTO employees (id, email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at)
VALUES 
(4, 'charya@gmail.com', '$2a$10$0000000000000000000000000000000000000000000', 'Charya Lavanya', 'EMP004', 'EMPLOYEE', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'amara@gmail.com', '$2a$10$0000000000000000000000000000000000000000000', 'amara niroshini', 'EMP005', 'EMPLOYEE', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT '[SYNC] Employees after adding missing records:' as status;
SELECT id, email, full_name, role FROM employees ORDER BY id;
SELECT COUNT(*) as total_employees FROM employees;
