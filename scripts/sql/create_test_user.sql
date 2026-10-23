-- Create Test Users for HRM System
-- Password for all users: test123
-- BCrypt hash: $2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W

-- First, create a test company
INSERT INTO company (name, registration_number, address, phone, email, status, subscription_start, subscription_end, created_at, updated_at)
VALUES 
('Test Company Ltd', 'REG12345', '123 Business Street, City', '+1234567890', 'company@test.com', 'APPROVED', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Get the company ID (PostgreSQL specific)
DO $$
DECLARE
    company_id_var BIGINT;
BEGIN
    SELECT id INTO company_id_var FROM company WHERE registration_number = 'REG12345' LIMIT 1;

    -- Create a test department
    INSERT INTO department (name, description, company_id, created_at, updated_at)
    VALUES ('IT Department', 'Information Technology', company_id_var, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING;

    -- Get department ID
    DECLARE dept_id_var BIGINT;
    SELECT id INTO dept_id_var FROM department WHERE name = 'IT Department' AND company_id = company_id_var LIMIT 1;

    -- Create Admin User
    INSERT INTO employee (email, password, full_name, employee_number, role, status, company_id, department_id, hire_date, created_at, updated_at)
    VALUES 
    ('admin@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'Admin User', 'EMP001', 'ADMIN', 'ACTIVE', company_id_var, dept_id_var, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO NOTHING;

    -- Create HR Manager User
    INSERT INTO employee (email, password, full_name, employee_number, role, status, company_id, department_id, hire_date, created_at, updated_at)
    VALUES 
    ('hr@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'HR Manager', 'EMP002', 'HR_MANAGER', 'ACTIVE', company_id_var, dept_id_var, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO NOTHING;

    -- Create Employee User
    INSERT INTO employee (email, password, full_name, employee_number, role, status, company_id, department_id, hire_date, created_at, updated_at)
    VALUES 
    ('employee@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'Test Employee', 'EMP003', 'EMPLOYEE', 'ACTIVE', company_id_var, dept_id_var, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO NOTHING;

END $$;

-- Verify users created
SELECT id, email, full_name, role, status FROM employee;
