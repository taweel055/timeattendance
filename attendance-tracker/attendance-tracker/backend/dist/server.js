"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = __importDefault(require("./utils/logger"));
const migrationRunner_1 = __importDefault(require("./utils/migrationRunner"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const employees_1 = __importDefault(require("./routes/employees"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const reports_1 = __importDefault(require("./routes/reports"));
const performance_1 = __importDefault(require("./routes/performance"));
const dashboardRoutes = require('./routes/dashboard');
const healthRoutes = require('./routes/health');
const performanceMonitor_1 = require("./utils/performanceMonitor");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        logger_1.default.warn('Rate limit exceeded', {
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
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
        logger_1.default.warn('Auth rate limit exceeded', {
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
const uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 uploads per hour
    message: {
        error: 'Too many file uploads, please try again later.',
        retryAfter: '1 hour'
    },
    handler: (req, res) => {
        logger_1.default.warn('Upload rate limit exceeded', {
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
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, 'uploads')));
// Performance monitoring middleware
app.use(performanceMonitor_1.performanceMonitor.middleware());
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/attendance/upload', uploadLimiter);
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', healthRoutes);
app.use('/api/performance', performance_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled error:', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Something went wrong!' });
});
app.listen(PORT, async () => {
    logger_1.default.info(`Server running on port ${PORT}`);
    try {
        const migrationRunner = new migrationRunner_1.default();
        await migrationRunner.runMigrations();
    }
    catch (error) {
        logger_1.default.error('Failed to run migrations on startup:', { error: error.message });
        process.exit(1);
    }
});
//# sourceMappingURL=server.js.map