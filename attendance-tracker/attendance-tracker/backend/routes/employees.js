const express = require('express');
const db = require('../database');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all employees
router.get('/', authenticateToken, (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT e.*, u.username, u.role 
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.name
    `).all();
    
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get single employee
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const employee = db.prepare(`
      SELECT e.*, u.username, u.role 
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.employee_id = ?
    `).get(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Create employee
router.post('/', authenticateToken, authorizeAdmin, (req, res) => {
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

    res.status(201).json({
      id: result.lastInsertRowid,
      employee_id,
      message: 'Employee created successfully'
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Employee ID or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create employee' });
    }
  }
});

// Update employee
router.put('/:id', authenticateToken, authorizeAdmin, (req, res) => {
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

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete employee
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM employees WHERE employee_id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

module.exports = router;