-- Sync employees from hrm_db_user to hrm_db_employee
-- This copies real employee records to enable clock-in

INSERT INTO employees (email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at)
SELECT 
    email, 
    password, 
    full_name, 
    COALESCE(employee_id, 'EMP_' || id::text) as employee_id,
    COALESCE(role, 'EMPLOYEE') as role,
    COALESCE(status, 'ACTIVE') as status,
    (SELECT id FROM companies LIMIT 1) as company_id,
    (SELECT id FROM departments LIMIT 1) as department_id,
    CURRENT_DATE as joining_date,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM dblink('dbname=hrm_db_user user=postgres password=Rush@2001780', 'SELECT id, email, password, full_name, employee_id, role, status FROM employees') 
AS source(id int, email text, password text, full_name text, employee_id text, role text, status text)
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.email = source.email);

-- Verify sync
SELECT '[SYNC COMPLETE] Employees in hrm_db_employee:' as status;
SELECT id, email, full_name, role FROM employees ORDER BY id;
