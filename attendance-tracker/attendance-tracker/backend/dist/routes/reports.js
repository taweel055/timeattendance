"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const date_fns_1 = require("date-fns");
const timeCalculations_1 = require("../utils/timeCalculations");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
// Get daily report
router.get('/daily', auth_1.authenticateToken, validation_1.validateReports.daily, (req, res) => {
    try {
        const { date = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd') } = req.query;
        const dailyReport = database_1.default.prepare(`
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
        const reportWithPay = dailyReport.map((record) => {
            const pay = (0, timeCalculations_1.calculatePay)({
                regularHours: record.regular_hours,
                overtimeHours: record.overtime_hours
            }, {
                hourlyRate: record.hourly_rate,
                overtimeRate: record.overtime_rate
            });
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
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate daily report' });
        return;
    }
});
// Get weekly report
router.get('/weekly', auth_1.authenticateToken, validation_1.validateReports.weekly, (req, res) => {
    try {
        const { week_start, week_end } = req.query;
        let startDate, endDate;
        if (week_start && week_end) {
            startDate = week_start;
            endDate = week_end;
        }
        else {
            const today = new Date();
            startDate = (0, date_fns_1.format)((0, date_fns_1.startOfWeek)(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            endDate = (0, date_fns_1.format)((0, date_fns_1.endOfWeek)(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        }
        // Get all attendance records for the week grouped by employee
        const weeklyData = database_1.default.prepare(`
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
        const reportData = weeklyData.map((employee) => {
            // Recalculate weekly overtime
            const weeklyTotals = (0, timeCalculations_1.calculateWeeklyTotals)([
                { total_hours: employee.total_hours || 0 }
            ]);
            const pay = (0, timeCalculations_1.calculatePay)({
                regularHours: weeklyTotals.regularHours,
                overtimeHours: weeklyTotals.overtimeHours
            }, {
                hourlyRate: employee.hourly_rate || 0,
                overtimeRate: employee.overtime_rate || 0
            });
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
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate weekly report' });
        return;
    }
});
// Get monthly report
router.get('/monthly', auth_1.authenticateToken, validation_1.validateReports.monthly, (req, res) => {
    try {
        const { year, month } = req.query;
        let startDate, endDate;
        if (year && month) {
            const date = new Date(Number(year), Number(month) - 1);
            startDate = (0, date_fns_1.format)((0, date_fns_1.startOfMonth)(date), 'yyyy-MM-dd');
            endDate = (0, date_fns_1.format)((0, date_fns_1.endOfMonth)(date), 'yyyy-MM-dd');
        }
        else {
            const today = new Date();
            startDate = (0, date_fns_1.format)((0, date_fns_1.startOfMonth)(today), 'yyyy-MM-dd');
            endDate = (0, date_fns_1.format)((0, date_fns_1.endOfMonth)(today), 'yyyy-MM-dd');
        }
        // Get monthly data grouped by employee
        const monthlyData = database_1.default.prepare(`
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
        const reportData = monthlyData.map((employee) => {
            const pay = (0, timeCalculations_1.calculatePay)({
                regularHours: employee.regular_hours || 0,
                overtimeHours: employee.overtime_hours || 0
            }, {
                hourlyRate: employee.hourly_rate || 0,
                overtimeRate: employee.overtime_rate || 0
            });
            return {
                ...employee,
                ...pay
            };
        });
        // Department summary
        const departmentSummary = database_1.default.prepare(`
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
            if (record.days_worked > 0)
                acc.activeEmployees += 1;
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
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate monthly report' });
        return;
    }
});
// Export report as CSV
router.get('/export/:type', auth_1.authenticateToken, auth_1.authorizeAdmin, validation_1.validateReports.export, (req, res) => {
    try {
        const { type } = req.params;
        const { date, week_start, week_end, year, month } = req.query;
        let data;
        let filename;
        switch (type) {
            case 'daily':
                const reportDate = date || (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd');
                data = database_1.default.prepare(`
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
                }
                else {
                    const today = new Date();
                    startDate = (0, date_fns_1.format)((0, date_fns_1.startOfWeek)(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                    endDate = (0, date_fns_1.format)((0, date_fns_1.endOfWeek)(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                }
                data = database_1.default.prepare(`
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
        const rows = data.map((row) => Object.values(row).join(','));
        const csv = [headers, ...rows].join('\\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to export report' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map