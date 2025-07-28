const { parse, differenceInMinutes } = require('date-fns');

const STANDARD_HOURS_PER_DAY = 8;
const OVERTIME_THRESHOLD_DAILY = 8;

// Parse time string to Date object
const parseTime = (timeStr, dateStr = new Date().toISOString().split('T')[0]) => {
  if (!timeStr) return null;
  return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
};

// Calculate hours between two times
const calculateHours = ({ clock_in, clock_out, break_start, break_end }) => {
  if (!clock_in || !clock_out) {
    return { totalHours: 0, regularHours: 0, overtimeHours: 0 };
  }

  const clockInTime = parseTime(clock_in);
  const clockOutTime = parseTime(clock_out);
  
  // Calculate total minutes worked
  let totalMinutes = differenceInMinutes(clockOutTime, clockInTime);

  // Subtract break time if provided
  if (break_start && break_end) {
    const breakStartTime = parseTime(break_start);
    const breakEndTime = parseTime(break_end);
    const breakMinutes = differenceInMinutes(breakEndTime, breakStartTime);
    totalMinutes -= breakMinutes;
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

module.exports = {
  parseTime,
  calculateHours,
  calculateWeeklyTotals,
  calculatePay
};