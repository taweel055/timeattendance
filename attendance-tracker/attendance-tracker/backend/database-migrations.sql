-- Enhanced Attendance Tracker Database Schema
-- Migration script for new features

-- 1. Upload History Table
CREATE TABLE IF NOT EXISTS upload_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed', 'rolled_back'
    error_summary TEXT,
    file_size INTEGER,
    processing_time REAL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Employee Name Mappings Table
CREATE TABLE IF NOT EXISTS employee_name_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    csv_name TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    confidence_score REAL DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 1,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(csv_name, employee_id)
);

-- 3. Calculation Cache Table
CREATE TABLE IF NOT EXISTS calculation_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL, -- hash of parameters
    employee_ids TEXT, -- JSON array
    date_range_start DATE,
    date_range_end DATE,
    calculation_type TEXT, -- 'individual', 'bulk', 'department'
    results TEXT, -- JSON results
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    hit_count INTEGER DEFAULT 0
);

-- 4. Enhanced Attendance Table (add new columns)
ALTER TABLE attendance ADD COLUMN upload_batch_id INTEGER;
ALTER TABLE attendance ADD COLUMN last_calculated DATETIME;
ALTER TABLE attendance ADD COLUMN calculation_version INTEGER DEFAULT 1;
ALTER TABLE attendance ADD COLUMN regular_pay REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN overtime_pay REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN gross_pay REAL DEFAULT 0;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date_range ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_batch ON attendance(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_employees_lookup ON employees(employee_id, name);
CREATE INDEX IF NOT EXISTS idx_employees_name_search ON employees(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_upload_history_user_date ON upload_history(user_id, upload_date);
CREATE INDEX IF NOT EXISTS idx_name_mappings_lookup ON employee_name_mappings(csv_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_calculation_cache_key ON calculation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_calculation_cache_date ON calculation_cache(date_range_start, date_range_end);

-- 6. Views for Common Queries
CREATE VIEW IF NOT EXISTS employee_attendance_summary AS
SELECT 
    e.employee_id,
    e.name,
    e.department,
    e.hourly_rate,
    e.overtime_rate,
    COUNT(a.id) as total_records,
    SUM(a.total_hours) as total_hours,
    SUM(a.regular_hours) as total_regular_hours,
    SUM(a.overtime_hours) as total_overtime_hours,
    SUM(a.gross_pay) as total_pay,
    MAX(a.date) as last_attendance_date
FROM employees e
LEFT JOIN attendance a ON e.employee_id = a.employee_id
GROUP BY e.employee_id, e.name, e.department, e.hourly_rate, e.overtime_rate;

-- 7. Upload Statistics View
CREATE VIEW IF NOT EXISTS upload_statistics AS
SELECT 
    DATE(upload_date) as upload_day,
    COUNT(*) as uploads_count,
    SUM(total_records) as total_records_processed,
    SUM(successful_records) as successful_records,
    SUM(failed_records) as failed_records,
    ROUND(AVG(processing_time), 2) as avg_processing_time,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_uploads,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_uploads
FROM upload_history
GROUP BY DATE(upload_date)
ORDER BY upload_day DESC;

-- 8. Payroll Calculation View
CREATE VIEW IF NOT EXISTS payroll_summary AS
SELECT 
    a.employee_id,
    e.name,
    e.department,
    DATE(a.date, 'weekday 0', '-6 days') as week_start,
    COUNT(*) as days_worked,
    SUM(a.total_hours) as total_hours,
    SUM(a.regular_hours) as regular_hours,
    SUM(a.overtime_hours) as overtime_hours,
    SUM(a.regular_pay) as regular_pay,
    SUM(a.overtime_pay) as overtime_pay,
    SUM(a.gross_pay) as gross_pay
FROM attendance a
JOIN employees e ON a.employee_id = e.employee_id
GROUP BY a.employee_id, e.name, e.department, week_start
ORDER BY week_start DESC, e.name;