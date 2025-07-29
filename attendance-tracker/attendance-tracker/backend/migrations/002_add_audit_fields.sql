
ALTER TABLE employees ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE employees ADD COLUMN updated_by INTEGER REFERENCES users(id);

ALTER TABLE attendance ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE attendance ADD COLUMN updated_by INTEGER REFERENCES users(id);

ALTER TABLE payroll ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE payroll ADD COLUMN updated_by INTEGER REFERENCES users(id);

CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
  AFTER UPDATE ON users
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_employees_timestamp 
  AFTER UPDATE ON employees
  BEGIN
    UPDATE employees SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_attendance_timestamp 
  AFTER UPDATE ON attendance
  BEGIN
    UPDATE attendance SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_payroll_timestamp 
  AFTER UPDATE ON payroll
  BEGIN
    UPDATE payroll SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
