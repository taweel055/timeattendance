"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReports = exports.validateAttendance = exports.validateEmployee = exports.validateAuth = exports.handleValidationErrors = void 0;
const { body, param, query, validationResult } = require('express-validator');
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map((err) => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
const validateAuth = {
    register: [
        body('username')
            .isLength({ min: 3, max: 50 })
            .withMessage('Username must be between 3 and 50 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers, and underscores'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
        body('role')
            .optional()
            .isIn(['admin', 'manager', 'employee'])
            .withMessage('Role must be admin, manager, or employee'),
        handleValidationErrors
    ],
    login: [
        body('username')
            .notEmpty()
            .withMessage('Username is required')
            .isLength({ max: 50 })
            .withMessage('Username too long'),
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
        handleValidationErrors
    ]
};
exports.validateAuth = validateAuth;
const validateEmployee = {
    create: [
        body('employee_id')
            .notEmpty()
            .withMessage('Employee ID is required')
            .isLength({ min: 1, max: 20 })
            .withMessage('Employee ID must be between 1 and 20 characters')
            .matches(/^[a-zA-Z0-9-_]+$/)
            .withMessage('Employee ID can only contain letters, numbers, hyphens, and underscores'),
        body('name')
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s'-]+$/)
            .withMessage('Name can only contain letters, spaces, apostrophes, and hyphens'),
        body('email')
            .optional({ nullable: true })
            .isEmail()
            .withMessage('Must be a valid email address')
            .normalizeEmail(),
        body('department')
            .optional({ nullable: true })
            .isLength({ max: 50 })
            .withMessage('Department name too long'),
        body('position')
            .optional({ nullable: true })
            .isLength({ max: 50 })
            .withMessage('Position name too long'),
        body('hourly_rate')
            .optional({ nullable: true })
            .isFloat({ min: 0, max: 1000 })
            .withMessage('Hourly rate must be between 0 and 1000'),
        body('overtime_rate')
            .optional({ nullable: true })
            .isFloat({ min: 0, max: 1500 })
            .withMessage('Overtime rate must be between 0 and 1500'),
        body('hire_date')
            .optional({ nullable: true })
            .isISO8601()
            .withMessage('Hire date must be a valid date (YYYY-MM-DD)'),
        body('user_id')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('User ID must be a positive integer'),
        handleValidationErrors
    ],
    update: [
        param('id')
            .notEmpty()
            .withMessage('Employee ID is required'),
        body('name')
            .optional()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s'-]+$/)
            .withMessage('Name can only contain letters, spaces, apostrophes, and hyphens'),
        body('email')
            .optional({ nullable: true })
            .isEmail()
            .withMessage('Must be a valid email address')
            .normalizeEmail(),
        body('department')
            .optional({ nullable: true })
            .isLength({ max: 50 })
            .withMessage('Department name too long'),
        body('position')
            .optional({ nullable: true })
            .isLength({ max: 50 })
            .withMessage('Position name too long'),
        body('hourly_rate')
            .optional({ nullable: true })
            .isFloat({ min: 0, max: 1000 })
            .withMessage('Hourly rate must be between 0 and 1000'),
        body('overtime_rate')
            .optional({ nullable: true })
            .isFloat({ min: 0, max: 1500 })
            .withMessage('Overtime rate must be between 0 and 1500'),
        body('hire_date')
            .optional({ nullable: true })
            .isISO8601()
            .withMessage('Hire date must be a valid date (YYYY-MM-DD)'),
        handleValidationErrors
    ],
    getById: [
        param('id')
            .notEmpty()
            .withMessage('Employee ID is required')
            .isLength({ max: 20 })
            .withMessage('Employee ID too long'),
        handleValidationErrors
    ],
    delete: [
        param('id')
            .notEmpty()
            .withMessage('Employee ID is required')
            .isLength({ max: 20 })
            .withMessage('Employee ID too long'),
        handleValidationErrors
    ]
};
exports.validateEmployee = validateEmployee;
const validateAttendance = {
    create: [
        body('employee_id')
            .notEmpty()
            .withMessage('Employee ID is required')
            .isLength({ max: 20 })
            .withMessage('Employee ID too long'),
        body('date')
            .notEmpty()
            .withMessage('Date is required')
            .isISO8601()
            .withMessage('Date must be in YYYY-MM-DD format'),
        body('clock_in')
            .optional({ nullable: true })
            .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .withMessage('Clock in time must be in HH:MM format'),
        body('clock_out')
            .optional({ nullable: true })
            .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .withMessage('Clock out time must be in HH:MM format'),
        body('break_start')
            .optional({ nullable: true })
            .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .withMessage('Break start time must be in HH:MM format'),
        body('break_end')
            .optional({ nullable: true })
            .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .withMessage('Break end time must be in HH:MM format'),
        body('status')
            .optional()
            .isIn(['present', 'absent', 'late', 'sick', 'vacation'])
            .withMessage('Status must be one of: present, absent, late, sick, vacation'),
        body('notes')
            .optional({ nullable: true })
            .isLength({ max: 500 })
            .withMessage('Notes cannot exceed 500 characters'),
        handleValidationErrors
    ],
    query: [
        query('employee_id')
            .optional()
            .isLength({ max: 20 })
            .withMessage('Employee ID too long'),
        query('date')
            .optional()
            .isISO8601()
            .withMessage('Date must be in YYYY-MM-DD format'),
        query('start_date')
            .optional()
            .isISO8601()
            .withMessage('Start date must be in YYYY-MM-DD format'),
        query('end_date')
            .optional()
            .isISO8601()
            .withMessage('End date must be in YYYY-MM-DD format'),
        handleValidationErrors
    ],
    bulkCalculate: [
        body('date_range')
            .optional()
            .isObject()
            .withMessage('Date range must be an object'),
        body('date_range.start_date')
            .optional()
            .isISO8601()
            .withMessage('Start date must be in YYYY-MM-DD format'),
        body('date_range.end_date')
            .optional()
            .isISO8601()
            .withMessage('End date must be in YYYY-MM-DD format'),
        body('employee_ids')
            .optional()
            .isArray()
            .withMessage('Employee IDs must be an array'),
        body('employee_ids.*')
            .optional()
            .isLength({ max: 20 })
            .withMessage('Each employee ID must be valid'),
        body('group_by')
            .optional()
            .isIn(['employee', 'department', 'week', 'month'])
            .withMessage('Group by must be one of: employee, department, week, month'),
        body('recalculate')
            .optional()
            .isBoolean()
            .withMessage('Recalculate must be a boolean'),
        handleValidationErrors
    ]
};
exports.validateAttendance = validateAttendance;
const validateReports = {
    daily: [
        query('date')
            .optional()
            .isISO8601()
            .withMessage('Date must be in YYYY-MM-DD format'),
        handleValidationErrors
    ],
    weekly: [
        query('week_start')
            .optional()
            .isISO8601()
            .withMessage('Week start must be in YYYY-MM-DD format'),
        query('week_end')
            .optional()
            .isISO8601()
            .withMessage('Week end must be in YYYY-MM-DD format'),
        handleValidationErrors
    ],
    monthly: [
        query('year')
            .optional()
            .isInt({ min: 2000, max: 2100 })
            .withMessage('Year must be between 2000 and 2100'),
        query('month')
            .optional()
            .isInt({ min: 1, max: 12 })
            .withMessage('Month must be between 1 and 12'),
        handleValidationErrors
    ],
    export: [
        param('type')
            .isIn(['daily', 'weekly', 'monthly'])
            .withMessage('Export type must be daily, weekly, or monthly'),
        query('date')
            .optional()
            .isISO8601()
            .withMessage('Date must be in YYYY-MM-DD format'),
        query('week_start')
            .optional()
            .isISO8601()
            .withMessage('Week start must be in YYYY-MM-DD format'),
        query('week_end')
            .optional()
            .isISO8601()
            .withMessage('Week end must be in YYYY-MM-DD format'),
        query('year')
            .optional()
            .isInt({ min: 2000, max: 2100 })
            .withMessage('Year must be between 2000 and 2100'),
        query('month')
            .optional()
            .isInt({ min: 1, max: 12 })
            .withMessage('Month must be between 1 and 12'),
        handleValidationErrors
    ]
};
exports.validateReports = validateReports;
//# sourceMappingURL=validation.js.map