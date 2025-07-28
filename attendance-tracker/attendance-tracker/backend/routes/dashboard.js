const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { startOfMonth, endOfMonth, format, subMonths } = require('date-fns');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const today = new Date();
    const startOfCurrentMonth = format(startOfMonth(today), 'yyyy-MM-dd');
    const endOfCurrentMonth = format(endOfMonth(today), 'yyyy-MM-dd');

    // Total employees
    const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get();

    // Present today
    const presentToday = db.prepare(`
      SELECT COUNT(DISTINCT employee_id) as count 
      FROM attendance 
      WHERE date = ? AND status = 'present'
    `).get(format(today, 'yyyy-MM-dd'));

    // Total hours this month
    const monthlyHours = db.prepare(`
      SELECT 
        SUM(total_hours) as total,
        SUM(regular_hours) as regular,
        SUM(overtime_hours) as overtime
      FROM attendance 
      WHERE date BETWEEN ? AND ?
    `).get(startOfCurrentMonth, endOfCurrentMonth);

    // Average hours per employee this month
    const avgHours = db.prepare(`
      SELECT AVG(total) as average FROM (
        SELECT employee_id, SUM(total_hours) as total 
        FROM attendance 
        WHERE date BETWEEN ? AND ?
        GROUP BY employee_id
      )
    `).get(startOfCurrentMonth, endOfCurrentMonth);

    // Attendance rate this month
    const attendanceRate = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / COUNT(*) as rate
      FROM attendance 
      WHERE date BETWEEN ? AND ?
    `).get(startOfCurrentMonth, endOfCurrentMonth);

    res.json({
      totalEmployees: totalEmployees.count,
      presentToday: presentToday.count,
      monthlyHours: {
        total: monthlyHours.total || 0,
        regular: monthlyHours.regular || 0,
        overtime: monthlyHours.overtime || 0
      },
      averageHoursPerEmployee: avgHours.average || 0,
      attendanceRate: attendanceRate.rate || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get attendance trends
router.get('/trends', authenticateToken, (req, res) => {
  try {
    const { months = 6 } = req.query;
    const trends = [];

    for (let i = 0; i < months; i++) {
      const date = subMonths(new Date(), i);
      const monthStart = format(startOfMonth(date), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(date), 'yyyy-MM-dd');
      const monthName = format(date, 'MMM yyyy');

      const monthData = db.prepare(`
        SELECT 
          COUNT(DISTINCT employee_id) as employees,
          SUM(total_hours) as totalHours,
          SUM(overtime_hours) as overtimeHours,
          AVG(total_hours) as avgHours
        FROM attendance 
        WHERE date BETWEEN ? AND ?
      `).get(monthStart, monthEnd);

      trends.unshift({
        month: monthName,
        ...monthData
      });
    }

    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance trends' });
  }
});

// Get department statistics
router.get('/departments', authenticateToken, (req, res) => {
  try {
    const startOfCurrentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endOfCurrentMonth = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const departmentStats = db.prepare(`
      SELECT 
        e.department,
        COUNT(DISTINCT e.employee_id) as employees,
        COALESCE(SUM(a.total_hours), 0) as totalHours,
        COALESCE(SUM(a.overtime_hours), 0) as overtimeHours,
        COALESCE(AVG(a.total_hours), 0) as avgHours
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND a.date BETWEEN ? AND ?
      WHERE e.department IS NOT NULL
      GROUP BY e.department
    `).all(startOfCurrentMonth, endOfCurrentMonth);

    res.json(departmentStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department statistics' });
  }
});

// Get top performers (most hours worked)
router.get('/top-performers', authenticateToken, (req, res) => {
  try {
    const startOfCurrentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endOfCurrentMonth = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const topPerformers = db.prepare(`
      SELECT 
        e.employee_id,
        e.name,
        e.department,
        SUM(a.total_hours) as totalHours,
        SUM(a.regular_hours) as regularHours,
        SUM(a.overtime_hours) as overtimeHours,
        COUNT(a.id) as daysWorked
      FROM employees e
      JOIN attendance a ON e.employee_id = a.employee_id
      WHERE a.date BETWEEN ? AND ?
      GROUP BY e.employee_id
      ORDER BY totalHours DESC
      LIMIT 10
    `).all(startOfCurrentMonth, endOfCurrentMonth);

    res.json(topPerformers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

module.exports = router;