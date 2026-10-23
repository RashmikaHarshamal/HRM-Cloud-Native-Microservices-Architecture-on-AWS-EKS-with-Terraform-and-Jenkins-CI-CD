-- Verify and Fix Test Users
-- Run this in your PostgreSQL database

-- First, check if users exist
SELECT id, email, full_name, role, status FROM employee WHERE email IN ('admin@test.com', 'hr@test.com', 'employee@test.com');

-- If no users found, run the following:

-- Step 1: Ensure Company exists
INSERT INTO company (name, registration_number, address, phone, email, status, subscription_start, subscription_end, created_at, updated_at)
VALUES ('Test Company Ltd', 'REG12345', '123 Business Street', '+1234567890', 'company@test.com', 'APPROVED', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (registration_number) DO NOTHING;

-- Step 2: Ensure Department exists (assuming company_id = 1)
INSERT INTO department (name, description, company_id, created_at, updated_at)
VALUES ('IT Department', 'Information Technology', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Step 3: Delete existing test users if they exist (to recreate with correct password)
DELETE FROM employee WHERE email IN ('admin@test.com', 'hr@test.com', 'employee@test.com');

-- Step 4: Insert Users with BCrypt password (password is 'test123')
-- Admin User
INSERT INTO employee (email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at)
VALUES ('admin@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'Admin User', 'EMP001', 'ADMIN', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- HR Manager
INSERT INTO employee (email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at)
VALUES ('hr@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'HR Manager', 'EMP002', 'HR_MANAGER', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Employee
INSERT INTO employee (email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at)
VALUES ('employee@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'Test Employee', 'EMP003', 'EMPLOYEE', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Verify users created
SELECT id, email, full_name, role, status, password FROM employee WHERE email IN ('admin@test.com', 'hr@test.com', 'employee@test.com');
