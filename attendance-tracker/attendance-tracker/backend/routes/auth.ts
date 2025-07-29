import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database';
import { validateAuth } from '../middleware/validation';
import { AuthRequest, User } from '../types';

const router = express.Router();

// Register
router.post('/register', validateAuth.register, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role = 'employee' } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const result = stmt.run(username, hashedPassword, role);

    res.status(201).json({ 
      id: result.lastInsertRowid, 
      username, 
      role,
      message: 'User registered successfully' 
    });
    return;
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username already exists' });
      return;
    } else {
      res.status(500).json({ error: 'Registration failed' });
      return;
    }
  }
});

// Login
router.post('/login', validateAuth.login, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get employee info if exists
    const employee = db.prepare('SELECT * FROM employees WHERE user_id = ?').get(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employee: employee
      }
    });
    return;
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
    return;
  }
});

export default router;
