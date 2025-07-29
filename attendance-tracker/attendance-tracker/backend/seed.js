const bcrypt = require('bcryptjs');
const db = require('./database');
const logger = require('./utils/logger').default;

async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminStmt = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)');
    const adminResult = adminStmt.run('admin', adminPassword, 'admin');
    logger.info('Admin user created');

    // Create employee user
    const empPassword = await bcrypt.hash('emp123', 10);
    const empStmt = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)');
    const empResult = empStmt.run('employee', empPassword, 'employee');
    logger.info('Employee user created');

    // Create sample employees
    const employees = [
      {
        employee_id: 'EMP001',
        name: 'John Doe',
        email: 'john.doe@company.com',
        department: 'Engineering',
        position: 'Software Developer',
        hourly_rate: 50,
        overtime_rate: 75,
        hire_date: '2022-01-15',
        user_id: empResult.lastInsertRowid
      },
      {
        employee_id: 'EMP002',
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        department: 'Marketing',
        position: 'Marketing Manager',
        hourly_rate: 45,
        overtime_rate: 67.5,
        hire_date: '2021-06-01',
        user_id: null
      },
      {
        employee_id: 'EMP003',
        name: 'Bob Johnson',
        email: 'bob.johnson@company.com',
        department: 'Engineering',
        position: 'Senior Developer',
        hourly_rate: 60,
        overtime_rate: 90,
        hire_date: '2020-03-10',
        user_id: null
      },
      {
        employee_id: 'EMP004',
        name: 'Alice Williams',
        email: 'alice.williams@company.com',
        department: 'HR',
        position: 'HR Manager',
        hourly_rate: 40,
        overtime_rate: 60,
        hire_date: '2021-09-20',
        user_id: null
      },
      {
        employee_id: 'EMP005',
        name: 'Charlie Brown',
        email: 'charlie.brown@company.com',
        department: 'Sales',
        position: 'Sales Representative',
        hourly_rate: 35,
        overtime_rate: 52.5,
        hire_date: '2023-01-10',
        user_id: null
      }
    ];

    const employeeStmt = db.prepare(`
      INSERT OR IGNORE INTO employees (
        employee_id, name, email, department, position, 
        hourly_rate, overtime_rate, hire_date, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const emp of employees) {
      employeeStmt.run(
        emp.employee_id,
        emp.name,
        emp.email,
        emp.department,
        emp.position,
        emp.hourly_rate,
        emp.overtime_rate,
        emp.hire_date,
        emp.user_id
      );
    }
    logger.info(`${employees.length} sample employees created`);

    // Create sample attendance records for the current week
    const today = new Date();
    const attendanceStmt = db.prepare(`
      INSERT OR IGNORE INTO attendance (
        employee_id, date, clock_in, clock_out, break_start, break_end,
        total_hours, regular_hours, overtime_hours, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Generate attendance for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Create attendance for each employee
      for (const emp of employees) {
        // Random variations in clock times
        const clockIn = `0${8 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
        const breakStart = '12:00';
        const breakEnd = '13:00';
        const clockOut = `${17 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
        
        // Calculate hours (simplified)
        const totalHours = 8 + Math.random() * 2;
        const regularHours = Math.min(8, totalHours);
        const overtimeHours = Math.max(0, totalHours - 8);

        attendanceStmt.run(
          emp.employee_id,
          dateStr,
          clockIn,
          clockOut,
          breakStart,
          breakEnd,
          totalHours,
          regularHours,
          overtimeHours,
          'present'
        );
      }
    }
    logger.info('Sample attendance records created');

    logger.info('Database seeding completed successfully!');
    logger.info('You can now login with:');
    logger.info('Admin - Username: admin, Password: admin123');
    logger.info('Employee - Username: employee, Password: emp123');
    
  } catch (error) {
    logger.error('Error seeding database:', { error: error.message, stack: error.stack });
  } finally {
    db.close();
  }
}

seed();
