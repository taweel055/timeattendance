const express = require('express');
const db = require('../database');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');
const { calculateWeeklyTotals, calculatePay } = require('../utils/timeCalculations');

const router = express.Router();

// Get daily report
router.get('/daily', authenticateToken, (req, res) => {
  try {
    const { date = format(new Date(), 'yyyy-MM-dd') } = req.query;

    const dailyReport = db.prepare(`
      SELECT 
        a.*,
        e.name,
        e.department,
        e.hourly_rate,
        e.overtime_rate
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.date = ?
      ORDER BY e.department, e.name
    `).all(date);

    // Calculate pay for each record
    const reportWithPay = dailyReport.map(record => {
      const pay = calculatePay(
        {
          regularHours: record.regular_hours,
          overtimeHours: record.overtime_hours
        },
        {
          hourlyRate: record.hourly_rate,
          overtimeRate: record.overtime_rate
        }
      );

      return {
        ...record,
        ...pay
      };
    });

    // Summary statistics
    const summary = reportWithPay.reduce((acc, record) => {
      acc.totalEmployees += 1;
      acc.totalHours += record.total_hours || 0;
      acc.totalRegularHours += record.regular_hours || 0;
      acc.totalOvertimeHours += record.overtime_hours || 0;
      acc.totalPay += record.grossPay || 0;
      return acc;
    }, {
      date,
      totalEmployees: 0,
      totalHours: 0,
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalPay: 0
    });

    res.json({
      summary,
      details: reportWithPay
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

// Get weekly report
router.get('/weekly', authenticateToken, (req, res) => {
  try {
    const { week_start, week_end } = req.query;
    
    let startDate, endDate;
    if (week_start && week_end) {
      startDate = week_start;
      endDate = week_end;
    } else {
      const today = new Date();
      startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      endDate = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    }

    // Get all attendance records for the week grouped by employee
    const weeklyData = db.prepare(`
      SELECT 
        e.employee_id,
        e.name,
        e.department,
        e.hourly_rate,
        e.overtime_rate,
        GROUP_CONCAT(a.date) as dates,
        GROUP_CONCAT(a.total_hours) as daily_hours,
        SUM(a.total_hours) as total_hours,
        SUM(a.regular_hours) as regular_hours,
        SUM(a.overtime_hours) as overtime_hours,
        COUNT(a.id) as days_worked
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND a.date BETWEEN ? AND ?
      GROUP BY e.employee_id
      ORDER BY e.department, e.name
    `).all(startDate, endDate);

    // Calculate weekly totals and pay
    const reportData = weeklyData.map(employee => {
      // Recalculate weekly overtime
      const weeklyTotals = calculateWeeklyTotals([
        { total_hours: employee.total_hours || 0 }
      ]);

      const pay = calculatePay(
        {
          regularHours: weeklyTotals.regularHours,
          overtimeHours: weeklyTotals.overtimeHours
        },
        {
          hourlyRate: employee.hourly_rate || 0,
          overtimeRate: employee.overtime_rate || 0
        }
      );

      return {
        ...employee,
        weekly_regular_hours: weeklyTotals.regularHours,
        weekly_overtime_hours: weeklyTotals.overtimeHours,
        ...pay
      };
    });

    // Calculate summary
    const summary = reportData.reduce((acc, record) => {
      acc.totalEmployees += 1;
      acc.totalHours += record.total_hours || 0;
      acc.totalRegularHours += record.weekly_regular_hours || 0;
      acc.totalOvertimeHours += record.weekly_overtime_hours || 0;
      acc.totalPay += record.grossPay || 0;
      return acc;
    }, {
      weekStart: startDate,
      weekEnd: endDate,
      totalEmployees: 0,
      totalHours: 0,
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalPay: 0
    });

    res.json({
      summary,
      details: reportData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

// Get monthly report
router.get('/monthly', authenticateToken, (req, res) => {
  try {
    const { year, month } = req.query;
    
    let startDate, endDate;
    if (year && month) {
      const date = new Date(year, month - 1);
      startDate = format(startOfMonth(date), 'yyyy-MM-dd');
      endDate = format(endOfMonth(date), 'yyyy-MM-dd');
    } else {
      const today = new Date();
      startDate = format(startOfMonth(today), 'yyyy-MM-dd');
      endDate = format(endOfMonth(today), 'yyyy-MM-dd');
    }

    // Get monthly data grouped by employee
    const monthlyData = db.prepare(`
      SELECT 
        e.employee_id,
        e.name,
        e.department,
        e.position,
        e.hourly_rate,
        e.overtime_rate,
        COUNT(DISTINCT a.date) as days_worked,
        SUM(a.total_hours) as total_hours,
        SUM(a.regular_hours) as regular_hours,
        SUM(a.overtime_hours) as overtime_hours,
        AVG(a.total_hours) as avg_daily_hours
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND a.date BETWEEN ? AND ?
      GROUP BY e.employee_id
      ORDER BY e.department, e.name
    `).all(startDate, endDate);

    // Calculate pay and prepare report data
    const reportData = monthlyData.map(employee => {
      const pay = calculatePay(
        {
          regularHours: employee.regular_hours || 0,
          overtimeHours: employee.overtime_hours || 0
        },
        {
          hourlyRate: employee.hourly_rate || 0,
          overtimeRate: employee.overtime_rate || 0
        }
      );

      return {
        ...employee,
        ...pay
      };
    });

    // Department summary
    const departmentSummary = db.prepare(`
      SELECT 
        e.department,
        COUNT(DISTINCT e.employee_id) as employee_count,
        SUM(a.total_hours) as total_hours,
        SUM(a.regular_hours) as regular_hours,
        SUM(a.overtime_hours) as overtime_hours,
        AVG(a.total_hours) as avg_hours
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND a.date BETWEEN ? AND ?
      WHERE e.department IS NOT NULL
      GROUP BY e.department
    `).all(startDate, endDate);

    // Overall summary
    const summary = reportData.reduce((acc, record) => {
      acc.totalEmployees += 1;
      acc.totalHours += record.total_hours || 0;
      acc.totalRegularHours += record.regular_hours || 0;
      acc.totalOvertimeHours += record.overtime_hours || 0;
      acc.totalPay += record.grossPay || 0;
      if (record.days_worked > 0) acc.activeEmployees += 1;
      return acc;
    }, {
      month: startDate.substring(0, 7),
      totalEmployees: 0,
      activeEmployees: 0,
      totalHours: 0,
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalPay: 0
    });

    res.json({
      summary,
      departmentSummary,
      details: reportData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// Export report as CSV
router.get('/export/:type', authenticateToken, authorizeAdmin, (req, res) => {
  try {
    const { type } = req.params;
    const { date, week_start, week_end, year, month } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'daily':
        const reportDate = date || format(new Date(), 'yyyy-MM-dd');
        data = db.prepare(`
          SELECT 
            e.employee_id,
            e.name,
            e.department,
            a.clock_in,
            a.clock_out,
            a.break_start,
            a.break_end,
            a.total_hours,
            a.regular_hours,
            a.overtime_hours,
            e.hourly_rate,
            e.overtime_rate
          FROM attendance a
          JOIN employees e ON a.employee_id = e.employee_id
          WHERE a.date = ?
        `).all(reportDate);
        filename = `attendance_daily_${reportDate}.csv`;
        break;

      case 'weekly':
        let startDate, endDate;
        if (week_start && week_end) {
          startDate = week_start;
          endDate = week_end;
        } else {
          const today = new Date();
          startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          endDate = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        }
        data = db.prepare(`
          SELECT 
            e.employee_id,
            e.name,
            e.department,
            COUNT(a.id) as days_worked,
            SUM(a.total_hours) as total_hours,
            SUM(a.regular_hours) as regular_hours,
            SUM(a.overtime_hours) as overtime_hours,
            e.hourly_rate,
            e.overtime_rate
          FROM employees e
          LEFT JOIN attendance a ON e.employee_id = a.employee_id 
            AND a.date BETWEEN ? AND ?
          GROUP BY e.employee_id
        `).all(startDate, endDate);
        filename = `attendance_weekly_${startDate}_to_${endDate}.csv`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Convert to CSV format
    if (data.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified period' });
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export report' });
  }
});

module.exports = router;