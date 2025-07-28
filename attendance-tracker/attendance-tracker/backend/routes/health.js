const express = require('express');
const db = require('../database');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    try {
        // Check database connection
        const result = db.prepare('SELECT 1').get();
        
        // Check if critical tables exist
        const tables = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('users', 'employees', 'attendance')
        `).all();
        
        const requiredTables = ['users', 'employees', 'attendance'];
        const existingTables = tables.map(t => t.name);
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: !!result,
                tables: existingTables,
                missing_tables: missingTables
            },
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                node_version: process.version,
                platform: process.platform,
                pid: process.pid
            },
            environment: {
                node_env: process.env.NODE_ENV || 'development',
                port: process.env.PORT || 5000
            }
        };
        
        // Determine overall health status
        if (missingTables.length > 0 || !result) {
            health.status = 'unhealthy';
            return res.status(503).json(health);
        }
        
        res.json(health);
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Readiness check (for Kubernetes/Docker)
router.get('/ready', (req, res) => {
    try {
        const result = db.prepare('SELECT COUNT(*) as count FROM employees').get();
        res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            employees_count: result.count
        });
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message
        });
    }
});

// Liveness check (for Kubernetes/Docker)
router.get('/live', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;