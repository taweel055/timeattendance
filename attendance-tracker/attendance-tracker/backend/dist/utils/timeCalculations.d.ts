import { TimeCalculation, PayCalculation } from '../types';
declare const parseTime: (timeStr: string, dateStr?: string) => Date | null;
declare const calculateHours: ({ clock_in, clock_out, break_start, break_end }: {
    clock_in: string;
    clock_out: string;
    break_start?: string;
    break_end?: string;
}) => TimeCalculation;
declare const calculateWeeklyTotals: (attendanceRecords: Array<{
    total_hours: number;
}>) => TimeCalculation;
declare const calculatePay: (hours: {
    regularHours: number;
    overtimeHours: number;
}, rates: {
    hourlyRate: number;
    overtimeRate: number;
}) => PayCalculation;
export { parseTime, calculateHours, calculateWeeklyTotals, calculatePay };
//# sourceMappingURL=timeCalculations.d.ts.map