"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const databaseProfiler_1 = require("./utils/databaseProfiler");
const db = new better_sqlite3_1.default(path_1.default.join(__dirname, 'attendance.db'));
// Enable foreign keys
db.pragma('foreign_keys = ON');
// Create tables
const createTables = () => {
    // Users table
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'employee',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Employees table
    db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      department TEXT,
      position TEXT,
      hourly_rate REAL DEFAULT 0,
      overtime_rate REAL DEFAULT 0,
      hire_date DATE,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
    // Attendance records table
    db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      date DATE NOT NULL,
      clock_in TIME,
      clock_out TIME,
      break_start TIME,
      break_end TIME,
      total_hours REAL,
      regular_hours REAL,
      overtime_hours REAL,
      status TEXT DEFAULT 'present',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
      UNIQUE(employee_id, date)
    )
  `);
    // Payroll table
    db.exec(`
    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      total_hours REAL,
      regular_hours REAL,
      overtime_hours REAL,
      regular_pay REAL,
      overtime_pay REAL,
      gross_pay REAL,
      deductions REAL DEFAULT 0,
      net_pay REAL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
    )
  `);
    // Settings table
    db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT
    )
  `);
    // Insert default settings
    const settings = db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`);
    settings.run('standard_hours_per_day', '8', 'Standard working hours per day');
    settings.run('overtime_threshold_weekly', '40', 'Weekly hours before overtime kicks in');
    settings.run('overtime_multiplier', '1.5', 'Overtime pay multiplier');
    settings.run('break_duration_minutes', '60', 'Standard break duration in minutes');
    settings.run('currency', 'USD', 'Currency for salary calculations');
    // Create performance indexes
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_date_range ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_employees_lookup ON employees(employee_id, name);
    CREATE INDEX IF NOT EXISTS idx_employees_name_search ON employees(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
    CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_start, period_end);
  `);
};
createTables();
const profiler = new databaseProfiler_1.DatabaseProfiler(db);
exports.default = db;
//# sourceMappingURL=database.js.map