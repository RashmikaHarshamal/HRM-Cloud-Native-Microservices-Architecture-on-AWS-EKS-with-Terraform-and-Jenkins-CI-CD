-- ====================================================================
-- Copy data from hrm_db_user to hrm_db_employee
-- Run this in pgAdmin with hrm_db_employee database selected
-- ====================================================================

-- Step 1: Copy companies
INSERT INTO company (id, company_name, registration_number, address, phone, email, status, subscription_start, subscription_end, created_at, updated_at)
SELECT id, company_name, registration_number, address, phone, email, status, subscription_start, subscription_end, created_at, updated_at
FROM dblink('dbname=hrm_db_user', 
  'SELECT id, company_name, registration_number, address, phone, email, status, subscription_start, subscription_end, created_at, updated_at FROM company')
  AS t(id bigint, company_name text, registration_number text, address text, phone text, email text, status text, subscription_start date, subscription_end date, created_at timestamp, updated_at timestamp)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Copy departments
INSERT INTO department (id, name, description, company_id, created_at, updated_at)
SELECT id, name, description, company_id, created_at, updated_at
FROM dblink('dbname=hrm_db_user',
  'SELECT id, name, description, company_id, created_at, updated_at FROM department')
  AS t(id bigint, name text, description text, company_id bigint, created_at timestamp, updated_at timestamp)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Copy employees (the most important table for login)
INSERT INTO employee (id, employee_id, full_name, email, password, nic, dob, address, phone, gender, company_id, department_id, role, designation, joining_date, termination_date, status, created_at, updated_at)
SELECT id, employee_id, full_name, email, password, nic, dob, address, phone, gender, company_id, department_id, role, designation, joining_date, termination_date, status, created_at, updated_at
FROM dblink('dbname=hrm_db_user',
  'SELECT id, employee_id, full_name, email, password, nic, dob, address, phone, gender, company_id, department_id, role, designation, joining_date, termination_date, status, created_at, updated_at FROM employee')
  AS t(id bigint, employee_id text, full_name text, email text, password text, nic text, dob date, address text, phone text, gender text, company_id bigint, department_id bigint, role text, designation text, joining_date date, termination_date date, status text, created_at timestamp, updated_at timestamp)
ON CONFLICT (id) DO NOTHING;

-- Verify the copy
SELECT 'Companies copied:' as info, COUNT(*) FROM company
UNION ALL
SELECT 'Departments copied:', COUNT(*) FROM department
UNION ALL
SELECT 'Employees copied:', COUNT(*) FROM employee;
