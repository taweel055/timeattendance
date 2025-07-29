"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const cache_1 = __importDefault(require("../utils/cache"));
const router = express_1.default.Router();
// Get all employees
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const cacheKey = 'employees:all';
        const cachedEmployees = await cache_1.default.get(cacheKey);
        if (cachedEmployees) {
            res.json(cachedEmployees);
            return;
        }
        const employees = database_1.default.prepare(`
      SELECT e.*, u.username, u.role 
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.name
    `).all();
        await cache_1.default.set(cacheKey, employees, 300);
        res.json(employees);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});
// Get single employee
router.get('/:id', auth_1.authenticateToken, validation_1.validateEmployee.getById, async (req, res) => {
    try {
        const cacheKey = `employee:${req.params.id}`;
        const cachedEmployee = await cache_1.default.get(cacheKey);
        if (cachedEmployee) {
            res.json(cachedEmployee);
            return;
        }
        const employee = database_1.default.prepare(`
      SELECT e.*, u.username, u.role 
      FROM employees e 
      LEFT JOIN users u ON e.user_id = u.id 
      WHERE e.employee_id = ?
    `).get(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        await cache_1.default.set(cacheKey, employee, 600);
        res.json(employee);
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch employee' });
        return;
    }
});
// Create employee
router.post('/', auth_1.authenticateToken, auth_1.authorizeAdmin, validation_1.validateEmployee.create, async (req, res) => {
    try {
        const { employee_id, name, email, department, position, hourly_rate, overtime_rate, hire_date, user_id } = req.body;
        const stmt = database_1.default.prepare(`
      INSERT INTO employees (
        employee_id, name, email, department, position, 
        hourly_rate, overtime_rate, hire_date, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(employee_id, name, email, department, position, hourly_rate || 0, overtime_rate || (hourly_rate * 1.5) || 0, hire_date, user_id);
        await cache_1.default.delPattern('employees:*');
        await cache_1.default.del(`employee:${employee_id}`);
        res.status(201).json({
            id: result.lastInsertRowid,
            employee_id,
            message: 'Employee created successfully'
        });
    }
    catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Employee ID or email already exists' });
        }
        else {
            res.status(500).json({ error: 'Failed to create employee' });
        }
    }
});
// Update employee
router.put('/:id', auth_1.authenticateToken, auth_1.authorizeAdmin, validation_1.validateEmployee.update, async (req, res) => {
    try {
        const { name, email, department, position, hourly_rate, overtime_rate, hire_date } = req.body;
        const stmt = database_1.default.prepare(`
      UPDATE employees 
      SET name = ?, email = ?, department = ?, position = ?, 
          hourly_rate = ?, overtime_rate = ?, hire_date = ?
      WHERE employee_id = ?
    `);
        const result = stmt.run(name, email, department, position, hourly_rate, overtime_rate, hire_date, req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        await cache_1.default.delPattern('employees:*');
        await cache_1.default.del(`employee:${req.params.id}`);
        res.json({ message: 'Employee updated successfully' });
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update employee' });
        return;
    }
});
// Delete employee
router.delete('/:id', auth_1.authenticateToken, auth_1.authorizeAdmin, validation_1.validateEmployee.delete, async (req, res) => {
    try {
        const stmt = database_1.default.prepare('DELETE FROM employees WHERE employee_id = ?');
        const result = stmt.run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        await cache_1.default.delPattern('employees:*');
        await cache_1.default.del(`employee:${req.params.id}`);
        res.json({ message: 'Employee deleted successfully' });
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete employee' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=employees.js.map