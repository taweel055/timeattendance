export interface User {
    id: number;
    username: string;
    password: string;
    role: 'admin' | 'manager' | 'employee';
    created_at: string;
}
export interface Employee {
    id: number;
    employee_id: string;
    name: string;
    email?: string;
    department?: string;
    position?: string;
    hourly_rate: number;
    overtime_rate: number;
    hire_date?: string;
    user_id?: number;
    created_at: string;
}
export interface AttendanceRecord {
    id: number;
    employee_id: string;
    date: string;
    clock_in?: string;
    clock_out?: string;
    break_start?: string;
    break_end?: string;
    total_hours?: number;
    regular_hours?: number;
    overtime_hours?: number;
    status: 'present' | 'absent' | 'late' | 'sick' | 'vacation';
    notes?: string;
    created_at: string;
}
export interface PayrollRecord {
    id: number;
    employee_id: string;
    period_start: string;
    period_end: string;
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    regular_pay: number;
    overtime_pay: number;
    gross_pay: number;
    deductions: number;
    net_pay: number;
    status: 'pending' | 'approved' | 'paid';
    created_at: string;
}
export interface TimeCalculation {
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
}
export interface PayCalculation {
    regularPay: number;
    overtimePay: number;
    grossPay: number;
}
import { Request } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        role: string;
    };
}
export interface ValidationError {
    field: string;
    message: string;
    value: any;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    details?: ValidationError[];
}
export interface ReportSummary {
    totalEmployees: number;
    totalHours: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalPay: number;
}
export interface DailyReportSummary extends ReportSummary {
    date: string;
}
export interface WeeklyReportSummary extends ReportSummary {
    weekStart: string;
    weekEnd: string;
}
export interface MonthlyReportSummary extends ReportSummary {
    month: string;
    activeEmployees: number;
}
//# sourceMappingURL=index.d.ts.map