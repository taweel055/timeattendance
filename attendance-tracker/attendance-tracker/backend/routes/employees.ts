import express, { Response } from 'express';
import db from '../database';
import { authenticateToken, authorizeAdmin } from '../middleware/auth';
import { validateEmployee } from '../middleware/validation';
import { AuthRequest, Employee } from '../types';
import cache from '../utils/cache';

const router = express.Router();

// Get all employees
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = 'employees:all';
    
    const cachedEmployees = await cache.get<Employee[]>(cacheKey);
    if (cachedEmployees) {
      res.json(cachedEmployees);
      return;
    }
    
    const employees = db.prepare(`
      SELECT e.*, u.username, u.role 
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.name
    `).all();
    
    await cache.set(cacheKey, employees, 300);
    
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get single employee
router.get('/:id', authenticateToken, validateEmployee.getById, async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `employee:${req.params.id}`;
    
    const cachedEmployee = await cache.get<Employee>(cacheKey);
    if (cachedEmployee) {
      res.json(cachedEmployee);
      return;
    }
    
    const employee = db.prepare(`
      SELECT e.*, u.username, u.role 
      FROM employees e 
      LEFT JOIN users u ON e.user_id = u.id 
      WHERE e.employee_id = ?
    `).get(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    await cache.set(cacheKey, employee, 600);
    
    res.json(employee);
    return;
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' });
    return;
  }
});

// Create employee
router.post('/', authenticateToken, authorizeAdmin, validateEmployee.create, async (req: AuthRequest, res: Response) => {
  try {
    const {
      employee_id,
      name,
      email,
      department,
      position,
      hourly_rate,
      overtime_rate,
      hire_date,
      user_id
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO employees (
        employee_id, name, email, department, position, 
        hourly_rate, overtime_rate, hire_date, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      employee_id,
      name,
      email,
      department,
      position,
      hourly_rate || 0,
      overtime_rate || (hourly_rate * 1.5) || 0,
      hire_date,
      user_id
    );

    await cache.delPattern('employees:*');
    await cache.del(`employee:${employee_id}`);

    res.status(201).json({
      id: result.lastInsertRowid,
      employee_id,
      message: 'Employee created successfully'
    });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Employee ID or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create employee' });
    }
  }
});

// Update employee
router.put('/:id', authenticateToken, authorizeAdmin, validateEmployee.update, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      email,
      department,
      position,
      hourly_rate,
      overtime_rate,
      hire_date
    } = req.body;

    const stmt = db.prepare(`
      UPDATE employees 
      SET name = ?, email = ?, department = ?, position = ?, 
          hourly_rate = ?, overtime_rate = ?, hire_date = ?
      WHERE employee_id = ?
    `);
    
    const result = stmt.run(
      name,
      email,
      department,
      position,
      hourly_rate,
      overtime_rate,
      hire_date,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await cache.delPattern('employees:*');
    await cache.del(`employee:${req.params.id}`);

    res.json({ message: 'Employee updated successfully' });
    return;
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
    return;
  }
});

// Delete employee
router.delete('/:id', authenticateToken, authorizeAdmin, validateEmployee.delete, async (req: AuthRequest, res: Response) => {
  try {
    const stmt = db.prepare('DELETE FROM employees WHERE employee_id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await cache.delPattern('employees:*');
    await cache.del(`employee:${req.params.id}`);

    res.json({ message: 'Employee deleted successfully' });
    return;
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
    return;
  }
});

export default router;
