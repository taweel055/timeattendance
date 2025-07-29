"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const performanceMonitor_1 = require("../utils/performanceMonitor");
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
router.get('/metrics', auth_1.authenticateToken, auth_1.authorizeAdmin, (req, res) => {
    try {
        const timeRange = parseInt(req.query.timeRange) || 300000;
        const metrics = performanceMonitor_1.performanceMonitor.getMetrics(timeRange);
        res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching performance metrics', { error: error.message });
        res.status(500).json({
            error: 'Failed to fetch performance metrics'
        });
    }
});
router.get('/report', auth_1.authenticateToken, auth_1.authorizeAdmin, (req, res) => {
    try {
        const report = performanceMonitor_1.performanceMonitor.generateReport();
        res.json({
            success: true,
            data: report
        });
    }
    catch (error) {
        logger_1.default.error('Error generating performance report', { error: error.message });
        res.status(500).json({
            error: 'Failed to generate performance report'
        });
    }
});
router.get('/health', (req, res) => {
    try {
        const metrics = performanceMonitor_1.performanceMonitor.getMetrics(60000);
        const isHealthy = metrics.api.errorRate < 10 &&
            metrics.api.averageResponseTime < 2000 &&
            metrics.system.memory.heapUsed < 500;
        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            metrics: {
                errorRate: metrics.api.errorRate,
                averageResponseTime: metrics.api.averageResponseTime,
                memoryUsage: metrics.system.memory.heapUsed,
                uptime: metrics.system.system.uptime
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error checking system health', { error: error.message });
        res.status(500).json({
            status: 'error',
            error: 'Failed to check system health'
        });
    }
});
exports.default = router;
//# sourceMappingURL=performance.js.map