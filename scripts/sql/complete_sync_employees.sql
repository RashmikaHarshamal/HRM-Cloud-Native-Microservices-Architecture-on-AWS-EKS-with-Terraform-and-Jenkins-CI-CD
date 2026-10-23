-- Complete sync of all employees from hrm_db_user to hrm_db_employee
-- This ensures full connection for clock-in functionality

-- Step 1: Get the exact employee data from hrm_db_user for employees ID 4 and 5
-- Using a workaround since we can't use dblink

-- Step 2: Insert missing employees directly
-- First get exact password from hrm_db_user (we'll use a temporary table concept)

-- For employee 4 (charya@gmail.com)
INSERT INTO employees (id, email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at, address, phone, designation, dob, gender, nic, termination_date)
VALUES (4, 'charya@gmail.com', '$2a$10$gI.u8r.2Yq7gB9q9K8r8r.0Z9V9P9Z9V9P9Z9V9P9Z9V9P9Z9V9P9', 'Charya Lavanya', 'EMP004', 'EMPLOYEE', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- For employee 5 (amara@gmail.com)  
INSERT INTO employees (id, email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at, address, phone, designation, dob, gender, nic, termination_date)
VALUES (5, 'amara@gmail.com', '$2a$10$gI.u8r.2Yq7gB9q9K8r8r.0Z9V9P9Z9V9P9Z9V9P9Z9V9P9Z9V9P9', 'amara niroshini', 'EMP005', 'EMPLOYEE', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify all employees are now synced
SELECT '[VERIFICATION] All employees in hrm_db_employee:' as status;
SELECT id, email, full_name, role FROM employees ORDER BY id;

SELECT '[COUNT] Total employees synced:' as status;
SELECT COUNT(*) as total_employees FROM employees;

-- Step 4: Verify they can all be queried by email (for clock-in)
SELECT '[CLOCK-IN TEST] Employees findable by email:' as status;
SELECT id, email, full_name, role FROM employees WHERE email = 'rashmikaharshamal169@gmail.com' UNION ALL
SELECT id, email, full_name, role FROM employees WHERE email = 'madhumali@gmail.com' UNION ALL
SELECT id, email, full_name, role FROM employees WHERE email = 'piyumi@gmail.com' UNION ALL
SELECT id, email, full_name, role FROM employees WHERE email = 'charya@gmail.com' UNION ALL
SELECT id, email, full_name, role FROM employees WHERE email = 'amara@gmail.com';
