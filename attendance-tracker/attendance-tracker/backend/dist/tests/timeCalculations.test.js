"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timeCalculations_1 = require("../utils/timeCalculations");
describe('Time Calculations', () => {
    describe('parseTime', () => {
        it('should parse valid time strings correctly', () => {
            const result1 = (0, timeCalculations_1.parseTime)('09:00');
            const result2 = (0, timeCalculations_1.parseTime)('17:30');
            const result3 = (0, timeCalculations_1.parseTime)('00:00');
            expect(result1).toBeInstanceOf(Date);
            expect(result2).toBeInstanceOf(Date);
            expect(result3).toBeInstanceOf(Date);
            if (result1)
                expect(result1.getHours()).toBe(9);
            if (result2)
                expect(result2.getHours()).toBe(17);
            if (result2)
                expect(result2.getMinutes()).toBe(30);
            if (result3)
                expect(result3.getHours()).toBe(0);
        });
        it('should handle invalid time strings', () => {
            expect((0, timeCalculations_1.parseTime)('')).toBeNull();
            const invalidResult = (0, timeCalculations_1.parseTime)('invalid');
            if (invalidResult) {
                expect(invalidResult).toBeInstanceOf(Date);
                expect(isNaN(invalidResult.getTime())).toBe(true);
            }
        });
    });
    describe('calculateHours', () => {
        it('should calculate regular work hours correctly', () => {
            const result = (0, timeCalculations_1.calculateHours)({
                clock_in: '09:00',
                clock_out: '17:00',
                break_start: '12:00',
                break_end: '13:00'
            });
            expect(result.totalHours).toBe(7); // 8 hours work - 1 hour break
            expect(result.regularHours).toBe(7);
            expect(result.overtimeHours).toBe(0);
        });
        it('should calculate overtime hours correctly', () => {
            const result = (0, timeCalculations_1.calculateHours)({
                clock_in: '08:00',
                clock_out: '19:00',
                break_start: '12:00',
                break_end: '13:00'
            });
            expect(result.totalHours).toBe(10); // 11 hours work - 1 hour break
            expect(result.regularHours).toBe(8);
            expect(result.overtimeHours).toBe(2); // 2 hours overtime
        });
        it('should handle no break time', () => {
            const result = (0, timeCalculations_1.calculateHours)({
                clock_in: '09:00',
                clock_out: '17:00'
            });
            expect(result.totalHours).toBe(8);
            expect(result.regularHours).toBe(8);
            expect(result.overtimeHours).toBe(0);
        });
        it('should return NaN for invalid times', () => {
            const result = (0, timeCalculations_1.calculateHours)({
                clock_in: 'invalid',
                clock_out: '17:00',
                break_start: '12:00',
                break_end: '13:00'
            });
            expect(isNaN(result.totalHours)).toBe(true);
            expect(isNaN(result.regularHours)).toBe(true);
            expect(isNaN(result.overtimeHours)).toBe(true);
        });
    });
    describe('calculateWeeklyTotals', () => {
        it('should calculate weekly totals correctly', () => {
            const dailyRecords = [
                { total_hours: 8 },
                { total_hours: 8 },
                { total_hours: 8 },
                { total_hours: 8 },
                { total_hours: 9 } // 1 hour overtime on Friday
            ];
            const result = (0, timeCalculations_1.calculateWeeklyTotals)(dailyRecords);
            expect(result.totalHours).toBe(41);
            expect(result.regularHours).toBe(40);
            expect(result.overtimeHours).toBe(1);
        });
        it('should handle empty records', () => {
            const result = (0, timeCalculations_1.calculateWeeklyTotals)([]);
            expect(result.totalHours).toBe(0);
            expect(result.regularHours).toBe(0);
            expect(result.overtimeHours).toBe(0);
        });
        it('should handle records with no overtime', () => {
            const dailyRecords = [
                { total_hours: 6 },
                { total_hours: 7 },
                { total_hours: 5 }
            ];
            const result = (0, timeCalculations_1.calculateWeeklyTotals)(dailyRecords);
            expect(result.totalHours).toBe(18);
            expect(result.regularHours).toBe(18);
            expect(result.overtimeHours).toBe(0);
        });
    });
    describe('calculatePay', () => {
        it('should calculate pay with regular hours only', () => {
            const timeData = {
                regularHours: 40,
                overtimeHours: 0
            };
            const rates = {
                hourlyRate: 20,
                overtimeRate: 30
            };
            const result = (0, timeCalculations_1.calculatePay)(timeData, rates);
            expect(result.regularPay).toBe(800); // 40 * 20
            expect(result.overtimePay).toBe(0);
            expect(result.grossPay).toBe(800);
        });
        it('should calculate pay with overtime', () => {
            const timeData = {
                regularHours: 40,
                overtimeHours: 5
            };
            const rates = {
                hourlyRate: 20,
                overtimeRate: 30
            };
            const result = (0, timeCalculations_1.calculatePay)(timeData, rates);
            expect(result.regularPay).toBe(800); // 40 * 20
            expect(result.overtimePay).toBe(150); // 5 * 30
            expect(result.grossPay).toBe(950);
        });
        it('should calculate pay with different rates', () => {
            const timeData = {
                regularHours: 35,
                overtimeHours: 8
            };
            const rates = {
                hourlyRate: 15,
                overtimeRate: 22.5
            };
            const result = (0, timeCalculations_1.calculatePay)(timeData, rates);
            expect(result.regularPay).toBe(525); // 35 * 15
            expect(result.overtimePay).toBe(180); // 8 * 22.5
            expect(result.grossPay).toBe(705);
        });
        it('should handle zero rates', () => {
            const timeData = {
                regularHours: 40,
                overtimeHours: 5
            };
            const rates = {
                hourlyRate: 0,
                overtimeRate: 0
            };
            const result = (0, timeCalculations_1.calculatePay)(timeData, rates);
            expect(result.regularPay).toBe(0);
            expect(result.overtimePay).toBe(0);
            expect(result.grossPay).toBe(0);
        });
    });
});
//# sourceMappingURL=timeCalculations.test.js.map