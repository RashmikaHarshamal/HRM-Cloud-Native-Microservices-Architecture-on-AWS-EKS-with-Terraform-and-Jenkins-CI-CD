-- Sync all employees from hrm_db_user to hrm_db_employee
-- This ensures complete connection and all employees can clock in

-- First, reset the sequence to match the source
SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees) + 1);

-- Insert any missing employees
INSERT INTO employees (id, email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at, address, phone, designation, dob, gender, nic, termination_date)
SELECT 
    e.id,
    e.email,
    e.password,
    e.full_name,
    e.employee_id,
    e.role,
    e.status,
    e.company_id,
    e.department_id,
    e.joining_date,
    e.created_at,
    e.updated_at,
    e.address,
    e.phone,
    e.designation,
    e.dob,
    e.gender,
    e.nic,
    e.termination_date
FROM dblink('dbname=hrm_db_user user=postgres password=Rush@2001780', 
    'SELECT id, email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at, address, phone, designation, dob, gender, nic, termination_date FROM employees ORDER BY id')
AS e(id bigint, email varchar, password varchar, full_name varchar, employee_id varchar, role varchar, status varchar, company_id bigint, department_id bigint, joining_date date, created_at timestamp, updated_at timestamp, address varchar, phone varchar, designation varchar, dob date, gender varchar, nic varchar, termination_date date)
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = e.email)
ON CONFLICT (id) DO NOTHING;

-- Verify sync
SELECT '[VERIFICATION] All employees in hrm_db_employee:' as status;
SELECT id, email, full_name, role FROM employees ORDER BY id;

SELECT COUNT(*) as total_synced_employees FROM employees;
