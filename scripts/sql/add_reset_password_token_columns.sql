-- ============================================================
-- Add reset_password_token and expiry columns to User / Employee DBs
-- ============================================================

-- For hrm_db_user
\c hrm_db_user;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_password_token_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token_expiry TIMESTAMP;

-- For hrm_db_employee
\c hrm_db_employee;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_password_token_expiry TIMESTAMP;
