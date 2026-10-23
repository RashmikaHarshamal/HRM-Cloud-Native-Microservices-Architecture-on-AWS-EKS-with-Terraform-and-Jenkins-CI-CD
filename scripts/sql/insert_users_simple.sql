-- Simple SQL to insert test users
-- Run this in pgAdmin Query Tool for hrm_db database

-- Step 1: Insert Company
INSERT INTO company (name, registration_number, address, phone, email, status, subscription_start, subscription_end, created_at, updated_at)
VALUES ('Test Company Ltd', 'REG12345', '123 Business Street', '+1234567890', 'company@test.com', 'APPROVED', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Step 2: Insert Department (using company_id = 1, adjust if needed)
INSERT INTO department (name, description, company_id, created_at, updated_at)
VALUES ('IT Department', 'Information Technology', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Step 3: Insert Users (Password for all: test123)
-- Admin User
INSERT INTO employee (email, password, full_name, employee_number, role, status, company_id, department_id, hire_date, created_at, updated_at)
VALUES ('admin@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'Admin User', 'EMP001', 'ADMIN', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- HR Manager
INSERT INTO employee (email, password, full_name, employee_number, role, status, company_id, department_id, hire_date, created_at, updated_at)
VALUES ('hr@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'HR Manager', 'EMP002', 'HR_MANAGER', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Employee
INSERT INTO employee (email, password, full_name, employee_number, role, status, company_id, department_id, hire_date, created_at, updated_at)
VALUES ('employee@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'Test Employee', 'EMP003', 'EMPLOYEE', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Verify users created
SELECT id, email, full_name, role, status FROM employee;
