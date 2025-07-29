import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger';
import MigrationRunner from './utils/migrationRunner';

dotenv.config();

import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import attendanceRoutes from './routes/attendance';
import reportRoutes from './routes/reports';
import performanceRoutes from './routes/performance';
const dashboardRoutes = require('./routes/dashboard');
const healthRoutes = require('./routes/health');
import { performanceMonitor } from './utils/performanceMonitor';

const app = express();
const PORT = process.env.PORT || 5000;

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      endpoint: req.path 
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      endpoint: req.path 
    });
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      endpoint: req.path 
    });
    res.status(429).json({
      error: 'Too many file uploads, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Performance monitoring middleware
app.use(performanceMonitor.middleware());

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/attendance/upload', uploadLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', healthRoutes);
app.use('/api/performance', performanceRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  
  try {
    const migrationRunner = new MigrationRunner();
    await migrationRunner.runMigrations();
  } catch (error: any) {
    logger.error('Failed to run migrations on startup:', { error: error.message });
    process.exit(1);
  }
});
