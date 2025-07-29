"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePay = exports.calculateWeeklyTotals = exports.calculateHours = exports.parseTime = void 0;
const date_fns_1 = require("date-fns");
const STANDARD_HOURS_PER_DAY = 8;
const OVERTIME_THRESHOLD_DAILY = 8;
// Parse time string to Date object
const parseTime = (timeStr, dateStr) => {
    if (!timeStr)
        return null;
    const actualDateStr = dateStr || new Date().toISOString().split('T')[0];
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0] || '0', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    const date = new Date(actualDateStr + 'T00:00:00.000Z');
    if (isNaN(date.getTime())) {
        return null;
    }
    date.setHours(hours, minutes, 0, 0);
    return date;
};
exports.parseTime = parseTime;
// Calculate hours between two times
const calculateHours = ({ clock_in, clock_out, break_start, break_end }) => {
    if (!clock_in || !clock_out) {
        return { totalHours: 0, regularHours: 0, overtimeHours: 0 };
    }
    const clockInTime = parseTime(clock_in);
    const clockOutTime = parseTime(clock_out);
    if (!clockInTime || !clockOutTime) {
        return { totalHours: 0, regularHours: 0, overtimeHours: 0 };
    }
    // Calculate total minutes worked
    let totalMinutes = (0, date_fns_1.differenceInMinutes)(clockOutTime, clockInTime);
    // Subtract break time if provided
    if (break_start && break_end) {
        const breakStartTime = parseTime(break_start);
        const breakEndTime = parseTime(break_end);
        if (breakStartTime && breakEndTime) {
            const breakMinutes = (0, date_fns_1.differenceInMinutes)(breakEndTime, breakStartTime);
            totalMinutes -= breakMinutes;
        }
    }
    // Convert to hours
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const regularHours = Math.min(totalHours, OVERTIME_THRESHOLD_DAILY);
    const overtimeHours = Math.max(0, totalHours - OVERTIME_THRESHOLD_DAILY);
    return {
        totalHours,
        regularHours,
        overtimeHours
    };
};
exports.calculateHours = calculateHours;
// Calculate weekly totals
const calculateWeeklyTotals = (attendanceRecords) => {
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    attendanceRecords.forEach(record => {
        totalHours += record.total_hours || 0;
    });
    // Weekly overtime threshold is typically 40 hours
    const WEEKLY_OVERTIME_THRESHOLD = 40;
    regularHours = Math.min(totalHours, WEEKLY_OVERTIME_THRESHOLD);
    overtimeHours = Math.max(0, totalHours - WEEKLY_OVERTIME_THRESHOLD);
    return {
        totalHours,
        regularHours,
        overtimeHours
    };
};
exports.calculateWeeklyTotals = calculateWeeklyTotals;
// Calculate pay based on hours and rates
const calculatePay = (hours, rates) => {
    const { regularHours, overtimeHours } = hours;
    const { hourlyRate, overtimeRate } = rates;
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * overtimeRate;
    const grossPay = regularPay + overtimePay;
    return {
        regularPay,
        overtimePay,
        grossPay
    };
};
exports.calculatePay = calculatePay;
//# sourceMappingURL=timeCalculations.js.map