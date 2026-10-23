-- ============================================
-- FIX LOGIN ISSUE - Add Test Users to hrm_db1
-- ============================================
-- Database: hrm_db1
-- Run this script in pgAdmin or psql
--
-- Test Credentials (password for all: test123):
-- Admin:    admin@test.com / test123
-- HR:       hr@test.com / test123  
-- Employee: employee@test.com / test123
-- ============================================

-- Step 1: Check current users
SELECT 'Current users in database:' as info;
SELECT id, email, full_name, role, status FROM employee;

-- Step 2: Check if company exists
SELECT 'Current companies:' as info;
SELECT id, name, registration_number FROM company;

-- Step 3: Check if department exists
SELECT 'Current departments:' as info;
SELECT id, name, company_id FROM department;

-- ============================================
-- Step 4: Create Company (if not exists)
-- ============================================
INSERT INTO company (id, name, registration_number, address, phone, email, status, subscription_start, subscription_end, created_at, updated_at)
VALUES (1, 'Test Company Ltd', 'REG12345', '123 Business Street', '+1234567890', 'company@test.com', 'APPROVED', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Step 5: Create Department (if not exists)
-- ============================================
INSERT INTO department (id, name, description, company_id, created_at, updated_at)
VALUES (1, 'IT Department', 'Information Technology', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    company_id = EXCLUDED.company_id,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Step 6: DELETE existing test users
-- ============================================
DELETE FROM employee WHERE email IN ('admin@test.com', 'hr@test.com', 'employee@test.com');

-- ============================================
-- Step 7: INSERT Test Users
-- Password: test123 (BCrypt encoded)
-- ============================================

-- Admin User
INSERT INTO employee (
    email, password, full_name, employee_id, role, status, 
    company_id, department_id, joining_date, created_at, updated_at
)
VALUES (
    'admin@test.com',
    '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W',
    'Admin User',
    'EMP001',
    'ADMIN',
    'ACTIVE',
    1,
    1,
    CURRENT_DATE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- HR Manager User
INSERT INTO employee (
    email, password, full_name, employee_id, role, status, 
    company_id, department_id, joining_date, created_at, updated_at
)
VALUES (
    'hr@test.com',
    '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W',
    'HR Manager',
    'EMP002',
    'HR_MANAGER',
    'ACTIVE',
    1,
    1,
    CURRENT_DATE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Employee User
INSERT INTO employee (
    email, password, full_name, employee_id, role, status, 
    company_id, department_id, joining_date, created_at, updated_at
)
VALUES (
    'employee@test.com',
    '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W',
    'Test Employee',
    'EMP003',
    'EMPLOYEE',
    'ACTIVE',
    1,
    1,
    CURRENT_DATE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- ============================================
-- Step 8: Verify users were created
-- ============================================
SELECT 
    id, 
    email, 
    full_name, 
    employee_id, 
    role, 
    status,
    company_id,
    department_id
FROM employee 
WHERE email IN ('admin@test.com', 'hr@test.com', 'employee@test.com')
ORDER BY id;

SELECT '✓ Users created successfully! You can now login with:' as result;
SELECT '  Admin:    admin@test.com / test123' as credentials
UNION ALL
SELECT '  HR:       hr@test.com / test123'
UNION ALL  
SELECT '  Employee: employee@test.com / test123';
